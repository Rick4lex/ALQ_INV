import React, { useState, useMemo, useCallback } from 'react';
import { Product, UserPreferences, ModalState, Movement, ManualMovement } from './types';
import { LOCAL_STORAGE_KEYS, INITIAL_CATEGORIES } from './constants';
import { useAppStore } from './hooks/useLocalStorage';
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
import ManualMovementModal from './components/ManualMovementModal';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { productSortComparator } from './utils';
import FinancialPanel from './components/FinancialPanel';

const App: React.FC = () => {
  const {
    products, setProducts,
    preferences, setPreferences,
    ignoredProductIds, setIgnoredProductIds,
    allCategories, setAllCategories,
    movements, setMovements,
    manualMovements, setManualMovements,
    addMovement, handleProductSave, handleMultipleMovementsDelete
  } = useAppStore();
  
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [currentView, setCurrentView] = useState<'catalog' | 'financials'>('catalog');


  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const showIgnored = !!preferences.showIgnoredOnly;
    
    return products.filter(product => {
      const matchesIgnoredStatus = showIgnored
        ? ignoredProductIds.includes(product.id)
        : !ignoredProductIds.includes(product.id);
      
      if (!matchesIgnoredStatus) return false;

      const matchesSearch = (product.title || '').toLowerCase().includes(preferences.searchTerm.toLowerCase());
      const matchesCategory = preferences.selectedCategory === 'Todas' || product.category === preferences.selectedCategory;
      const matchesAvailability = !preferences.showAvailableOnly || product.variants.some(v => v.stock > 0);
      return matchesSearch && matchesCategory && matchesAvailability;
    }).sort(productSortComparator);
  }, [products, preferences, ignoredProductIds]);

  const handleJsonLoad = useCallback((data: Product[]) => {
    setProducts(data);
    const loadedCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
    setAllCategories(prev => {
        const newCategories = loadedCategories.filter(c => !new Set(prev).has(c));
        return newCategories.length > 0 ? [...prev, ...newCategories] : prev;
    });
  }, [setProducts, setAllCategories]);

  const handleReset = useCallback(() => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible.')) {
      setProducts(null);
      setPreferences({ viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false });
      setIgnoredProductIds(['banner']);
      setAllCategories(INITIAL_CATEGORIES);
      setMovements({});
      setManualMovements([]);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.DATA_VERSION);
    }
  }, [setProducts, setPreferences, setIgnoredProductIds, setAllCategories, setMovements, setManualMovements]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, [setPreferences]);

  const handleIgnoredChange = useCallback((show: boolean) => {
    if (show) {
      if (window.confirm('¿Estás seguro de que quieres mostrar los productos ocultos? Esta vista es para gestión y puede incluir items que no están a la venta.')) {
        updatePreference('showIgnoredOnly', show);
      }
    } else {
      updatePreference('showIgnoredOnly', show);
    }
  }, [updatePreference]);

  const handleProductDelete = useCallback((productId: string) => {
    setProducts(prev => prev?.filter(p => p.id !== productId) || []);
    setModal(null);
  }, [setProducts]);

  const handleSaveMovement = useCallback((productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => {
    let newStockValue = 0;
    setProducts(prev => prev?.map(p => {
        if (p.id !== productId) return p;
        const updatedVariants = p.variants.map(v => {
            if (v.id === variantId) {
              newStockValue = Math.max(0, v.stock + movementData.change);
              return { ...v, stock: newStockValue };
            }
            return v;
        });
        return { ...p, variants: updatedVariants };
    }) || null);
    addMovement(variantId, { ...movementData, newStock: newStockValue });
  }, [setProducts, addMovement]);

  const handleManualMovementSave = useCallback((movement: Omit<ManualMovement, 'id'>) => {
    setManualMovements(prev => [...prev, { ...movement, id: `manual-${Date.now()}-${Math.random()}` }]);
    setModal(null);
  }, [setManualMovements]);

  const handleIgnoreProduct = useCallback((productId: string) => {
    setIgnoredProductIds(prev => prev.includes(productId) ? prev : [...prev, productId]);
    setModal(null);
  }, [setIgnoredProductIds]);
  
  const handleRestoreProduct = useCallback((productToRestore: Product) => {
    if (window.confirm(`¿Seguro que quieres restaurar "${productToRestore.title}"? Volverá a ser visible en el catálogo principal.`)) {
        setIgnoredProductIds(prev => prev.filter(id => id !== productToRestore.id));
    }
  }, [setIgnoredProductIds]);

  const handleCategorySave = useCallback((newCategory: string) => {
    const formatted = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
    if (formatted && !allCategories.includes(formatted)) {
      setAllCategories(prev => [...prev, formatted]);
    }
    setModal(null);
  }, [allCategories, setAllCategories]);

  const handleBackupDownload = useCallback(() => {
    if (!window.confirm('¿Descargar una copia de seguridad completa?')) return;
    const backupData = { products, preferences, ignoredProductIds, categories: allCategories, movements, manualMovements };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alkima-mizu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }, [products, preferences, ignoredProductIds, allCategories, movements, manualMovements]);

  const handleImageClick = (images: string[]) => {
    const validImages = images.filter(Boolean);
    if (validImages.length > 0) setFullscreenData({ images: validImages, index: 0 });
  };

  const changeFullscreenImage = (direction: 'next' | 'prev') => {
    setFullscreenData(prev => {
        if (!prev) return null;
        const newIndex = direction === 'next'
            ? (prev.index + 1) % prev.images.length
            : (prev.index - 1 + prev.images.length) % prev.images.length;
        return { ...prev, index: newIndex };
    });
  };

  if (products === null) return <JsonLoader onJsonLoad={handleJsonLoad} />;

  const renderModal = () => {
    if (!modal) return null;
    const commonProps = { isOpen: true, onClose: () => setModal(null) };
    switch (modal.type) {
      case 'add': return <ProductFormModal {...commonProps} onSave={p => { handleProductSave(p); setModal(null); }} categories={allCategories} />;
      case 'edit': return <ProductFormModal {...commonProps} onSave={p => { handleProductSave(p); setModal(null); }} productToEdit={modal.product} categories={allCategories} />;
      case 'delete': return <ConfirmDeleteModal {...commonProps} onConfirm={() => handleProductDelete(modal.product.id)} productName={modal.product.title} />;
      case 'ignore': return <ConfirmIgnoreModal {...commonProps} onConfirm={() => handleIgnoreProduct(modal.product.id)} productName={modal.product.title} />;
      case 'export': return <ExportModal {...commonProps} format={modal.format} products={products} ignoredProductIds={ignoredProductIds} />;
      case 'add-category': return <AddCategoryModal {...commonProps} onSave={handleCategorySave} existingCategories={allCategories} />;
      case 'movements': return <MovementHistoryModal {...commonProps} product={modal.product} movements={movements} onSaveMovement={handleSaveMovement} onDeleteMovements={handleMultipleMovementsDelete} />;
      case 'manual-movement': return <ManualMovementModal {...commonProps} onSave={handleManualMovementSave} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 font-sans">
      <div className={currentView === 'catalog' ? "pb-28 md:pb-24" : ""}>
        {currentView === 'catalog' && (
          <Header 
            viewMode={preferences.viewMode}
            onViewModeChange={(mode) => updatePreference('viewMode', mode)}
            onAddProduct={() => setModal({ type: 'add' })}
            onAddCategory={() => setModal({ type: 'add-category' })}
            onReset={handleReset}
            onNavigateToFinancials={() => setCurrentView('financials')}
          />
        )}
        <main>
           {currentView === 'catalog' ? (
            <div className="container mx-auto px-4 py-6">
              <FilterBar 
                {...preferences} 
                showIgnoredOnly={!!preferences.showIgnoredOnly}
                onSearchChange={term => updatePreference('searchTerm', term)} 
                onAvailabilityChange={show => updatePreference('showAvailableOnly', show)}
                onIgnoredChange={handleIgnoredChange}
                onCategoryChange={cat => updatePreference('selectedCategory', cat)} 
                productCount={filteredProducts.length} 
                categories={allCategories} />
              <ProductDisplay 
                products={filteredProducts} 
                viewMode={preferences.viewMode} 
                onEdit={product => setModal({ type: 'edit', product })} 
                onDelete={product => setModal({ type: 'delete', product })} 
                onImageClick={handleImageClick} 
                onIgnore={product => setModal({ type: 'ignore', product })} 
                onRestore={handleRestoreProduct}
                onMovement={product => setModal({ type: 'movements', product })}
                isIgnoredView={!!preferences.showIgnoredOnly}
              />
            </div>
           ) : (
             <FinancialPanel onBack={() => setCurrentView('catalog')} products={products} movements={movements} manualMovements={manualMovements} onAddManualMovement={() => setModal({ type: 'manual-movement' })} />
           )}
        </main>
      </div>
      {currentView === 'catalog' && <Footer onExport={format => setModal({ type: 'export', format })} onBackup={handleBackupDownload}/>}
      {renderModal()}
      {fullscreenData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setFullscreenData(null)}>
            <button onClick={() => setFullscreenData(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20"><X size={28} /></button>
            {fullscreenData.images.length > 1 && (
                <>
                    <button onClick={e => { e.stopPropagation(); changeFullscreenImage('prev'); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20"><ChevronLeft size={32} /></button>
                    <button onClick={e => { e.stopPropagation(); changeFullscreenImage('next'); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20"><ChevronRight size={32} /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">{fullscreenData.index + 1} / {fullscreenData.images.length}</div>
                </>
            )}
          {/* FIX: Corrected a typo from `fullscreen_data.index` to `fullscreenData.index`. */}
          <img src={fullscreenData.images[fullscreenData.index]} alt="Fullscreen view" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default App;