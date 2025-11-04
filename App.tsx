import React, { useState, useMemo, useCallback } from 'react';
import { Product, UserPreferences, ModalState, Movements, Movement, Variant } from './types';
import { LOCAL_STORAGE_KEYS, INITIAL_CATEGORIES } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import JsonLoader from './components/JsonLoader';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProductDisplay from './components/ProductDisplay';
import Footer from './components/Footer';
import ProductFormModal from './components/ProductFormModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ConfirmIgnoreModal from './components/ConfirmIgnoreModal';
import ExportModal from './components/ExportModal';
import AddCategoryModal from './components/AddCategoryModal';
import MovementHistoryModal from './components/MovementHistoryModal';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSortPrice } from './utils';

const App: React.FC = () => {
  const [products, setProducts] = useLocalStorage<Product[] | null>(LOCAL_STORAGE_KEYS.PRODUCTS, null);
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(LOCAL_STORAGE_KEYS.PREFERENCES, {
    viewMode: 'grid',
    searchTerm: '',
    selectedCategory: 'Todas',
    showAvailableOnly: false,
  });
  const [ignoredProductIds, setIgnoredProductIds] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.IGNORED_PRODUCTS, ['banner']);
  const [allCategories, setAllCategories] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  const [movements, setMovements] = useLocalStorage<Movements>(LOCAL_STORAGE_KEYS.MOVEMENTS, {});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      if (ignoredProductIds.includes(product.id)) {
        return false;
      }
      const matchesSearch = (product.title || '').toLowerCase().includes(preferences.searchTerm.toLowerCase());
      const matchesCategory = preferences.selectedCategory === 'Todas' || product.category === preferences.selectedCategory;
      const matchesAvailability = !preferences.showAvailableOnly || product.variants.some(v => v.stock > 0);
      return matchesSearch && matchesCategory && matchesAvailability;
    }).sort((a, b) => {
        const priceA = getSortPrice(a);
        const priceB = getSortPrice(b);

        if (priceA === -1 && priceB !== -1) return -1; // a (sin precio) va primero
        if (priceA !== -1 && priceB === -1) return 1;  // b (sin precio) va primero
        if (priceA === -1 && priceB === -1) return a.title.localeCompare(b.title); // Ambos sin precio, ordenar por título

        return priceA - priceB; // Ordenar por precio ascendente
    });
  }, [products, preferences, ignoredProductIds]);

  const handleJsonLoad = useCallback((data: Product[]) => {
    setProducts(data);
    const loadedCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
    setAllCategories(prev => {
        const currentCategories = new Set(prev);
        const newCategories = loadedCategories.filter(c => !currentCategories.has(c));
        if (newCategories.length > 0) {
            return [...prev, ...newCategories];
        }
        return prev;
    });
  }, [setProducts, setAllCategories]);

  const handleReset = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible.')) {
      setProducts(null);
      setPreferences({
        viewMode: 'grid',
        searchTerm: '',
        selectedCategory: 'Todas',
        showAvailableOnly: false,
      });
      setIgnoredProductIds(['banner']);
      setAllCategories(INITIAL_CATEGORIES);
      setMovements({});
    }
  }, [setProducts, setPreferences, setIgnoredProductIds, setAllCategories, setMovements]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, [setPreferences]);

  const addMovement = useCallback((variantId: string, movementData: Omit<Movement, 'id' | 'variantId'>) => {
    setMovements(prev => {
      const newMovement: Movement = {
        ...movementData,
        id: `mov-${Date.now()}`,
        variantId,
      };
      const variantMovements = prev[variantId] || [];
      return {
        ...prev,
        [variantId]: [...variantMovements, newMovement],
      };
    });
  }, [setMovements]);

  const handleProductSave = useCallback((productToSave: Product) => {
    setProducts(prevProducts => {
      const existingProduct = prevProducts?.find(p => p.id === productToSave.id);
      if (existingProduct) {
        // Editing product
        productToSave.variants.forEach(variant => {
          const existingVariant = existingProduct.variants.find(v => v.id === variant.id);
          if (!existingVariant) { // New variant added
            addMovement(variant.id, {
              timestamp: Date.now(),
              type: 'Inicial',
              change: variant.stock,
              newStock: variant.stock,
              notes: 'Variante nueva añadida'
            });
          } else if (existingVariant.stock !== variant.stock) { // Stock adjusted in form
            addMovement(variant.id, {
              timestamp: Date.now(),
              type: 'Ajuste',
              change: variant.stock - existingVariant.stock,
              newStock: variant.stock,
              notes: 'Ajuste desde formulario de producto'
            });
          }
        });
        return prevProducts?.map(p => p.id === productToSave.id ? productToSave : p) || [];
      } else {
        // New product
        productToSave.variants.forEach(variant => {
          addMovement(variant.id, {
            timestamp: Date.now(),
            type: 'Inicial',
            change: variant.stock,
            newStock: variant.stock,
            notes: 'Stock inicial del producto'
          });
        });
        return [...(prevProducts || []), productToSave];
      }
    });
    setModal(null);
  }, [setProducts, addMovement]);
  
  const handleProductDelete = useCallback((productId: string) => {
    setProducts(prev => prev?.filter(p => p.id !== productId) || []);
    setModal(null);
  }, [setProducts]);

  const handleSaveMovement = useCallback((productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => {
    let newStockValue = 0;
    setProducts(prev => {
      if (!prev) return null;
      return prev.map(p => {
        if (p.id === productId) {
          const updatedVariants = p.variants.map(v => {
            if (v.id === variantId) {
              newStockValue = Math.max(0, v.stock + movementData.change);
              return { ...v, stock: newStockValue };
            }
            return v;
          });
          return { ...p, variants: updatedVariants };
        }
        return p;
      });
    });
    addMovement(variantId, { ...movementData, newStock: newStockValue });
  }, [setProducts, addMovement]);

  const handleIgnoreProduct = useCallback((productId: string) => {
    setIgnoredProductIds(prev => {
      if (prev.includes(productId)) return prev;
      return [...prev, productId];
    });
    setModal(null);
  }, [setIgnoredProductIds]);
  
  const handleCategorySave = useCallback((newCategory: string) => {
    const formattedCategory = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
    if (formattedCategory && !allCategories.includes(formattedCategory)) {
      setAllCategories(prev => [...prev, formattedCategory]);
    }
    setModal(null);
  }, [allCategories, setAllCategories]);

  const handleBackupDownload = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres descargar una copia de seguridad completa?')) {
      const backupData = {
        products,
        preferences,
        ignoredProductIds,
        categories: allCategories,
        movements,
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `alkima-mizu-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [products, preferences, ignoredProductIds, allCategories, movements]);

  const handleImageClick = (images: string[]) => {
    const validImages = images.filter(Boolean);
    if (validImages.length > 0) {
      setFullscreenData({ images: validImages, index: 0 });
    }
  };

  const changeFullscreenImage = (direction: 'next' | 'prev') => {
    if (!fullscreenData) return;
    setFullscreenData(prev => {
        if (!prev) return null;
        const newIndex = direction === 'next'
            ? (prev.index + 1) % prev.images.length
            : (prev.index - 1 + prev.images.length) % prev.images.length;
        return { ...prev, index: newIndex };
    });
  };

  if (products === null) {
    return <JsonLoader onJsonLoad={handleJsonLoad} />;
  }

  const renderModal = () => {
    if (!modal) return null;

    const commonProps = {
      isOpen: true,
      onClose: () => setModal(null),
    };

    switch (modal.type) {
      case 'add':
        return <ProductFormModal {...commonProps} onSave={handleProductSave} categories={allCategories} />;
      
      case 'edit':
        return <ProductFormModal {...commonProps} onSave={handleProductSave} productToEdit={modal.product} categories={allCategories} />;
      
      case 'delete':
        return <ConfirmDeleteModal {...commonProps} onConfirm={() => handleProductDelete(modal.product.id)} productName={modal.product.title} />;
      
      case 'ignore':
        return <ConfirmIgnoreModal {...commonProps} onConfirm={() => handleIgnoreProduct(modal.product.id)} productName={modal.product.title} />;

      case 'export':
        return <ExportModal {...commonProps} format={modal.format} products={products} ignoredProductIds={ignoredProductIds} />;

      case 'add-category':
        return <AddCategoryModal {...commonProps} onSave={handleCategorySave} existingCategories={allCategories} />;
      
      case 'movements':
        return <MovementHistoryModal {...commonProps} product={modal.product} movements={movements} onSaveMovement={handleSaveMovement} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 font-sans">
      <div className="pb-28 md:pb-24">
        <Header 
          viewMode={preferences.viewMode}
          onViewModeChange={(mode) => updatePreference('viewMode', mode)}
          onAddProduct={() => setModal({ type: 'add' })}
          onAddCategory={() => setModal({ type: 'add-category' })}
          onReset={handleReset}
        />
        <main className="container mx-auto px-4 py-6">
          <FilterBar
            searchTerm={preferences.searchTerm}
            onSearchChange={(term) => updatePreference('searchTerm', term)}
            showAvailableOnly={preferences.showAvailableOnly}
            onAvailabilityChange={(show) => updatePreference('showAvailableOnly', show)}
            selectedCategory={preferences.selectedCategory}
            onCategoryChange={(cat) => updatePreference('selectedCategory', cat)}
            productCount={filteredProducts.length}
            categories={allCategories}
          />
          <ProductDisplay
            products={filteredProducts}
            viewMode={preferences.viewMode}
            onEdit={(product) => setModal({ type: 'edit', product })}
            onDelete={(product) => setModal({ type: 'delete', product })}
            onImageClick={handleImageClick}
            onIgnore={(product) => setModal({ type: 'ignore', product })}
            onMovement={(product) => setModal({ type: 'movements', product })}
          />
        </main>
      </div>
      <Footer onExport={(format) => setModal({ type: 'export', format })} onBackup={handleBackupDownload}/>

      {renderModal()}

      {fullscreenData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setFullscreenData(null)}>
            <button onClick={() => setFullscreenData(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20">
              <X size={28} />
            </button>

            {fullscreenData.images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); changeFullscreenImage('prev'); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20">
                        <ChevronLeft size={32} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); changeFullscreenImage('next'); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20">
                        <ChevronRight size={32} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                        {fullscreenData.index + 1} / {fullscreenData.images.length}
                    </div>
                </>
            )}

          <img 
            src={fullscreenData.images[fullscreenData.index]} 
            alt="Fullscreen view" 
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default App;