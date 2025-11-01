
import React, { useState, useMemo, useCallback } from 'react';
import { Product, UserPreferences, ModalState } from './types';
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
import { X } from 'lucide-react';

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
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      if (ignoredProductIds.includes(product.id)) {
        return false;
      }
      const matchesSearch = (product.title || '').toLowerCase().includes(preferences.searchTerm.toLowerCase());
      const matchesCategory = preferences.selectedCategory === 'Todas' || product.category === preferences.selectedCategory;
      const matchesAvailability = !preferences.showAvailableOnly || product.available;
      return matchesSearch && matchesCategory && matchesAvailability;
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
    }
  }, [setProducts, setPreferences, setIgnoredProductIds, setAllCategories]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, [setPreferences]);

  const handleProductSave = useCallback((productToSave: Product) => {
    setProducts(prevProducts => {
      const existing = prevProducts?.find(p => p.id === productToSave.id);
      if (existing) {
        return prevProducts?.map(p => p.id === productToSave.id ? productToSave : p) || [];
      }
      return [...(prevProducts || []), productToSave];
    });
    setModal(null);
  }, [setProducts]);
  
  const handleProductDelete = useCallback((productId: string) => {
    setProducts(prev => prev?.filter(p => p.id !== productId) || []);
    setModal(null);
  }, [setProducts]);

  const handleToggleAvailability = useCallback((productId: string, available: boolean) => {
    setProducts(prev => prev?.map(p => p.id === productId ? { ...p, available } : p) || []);
  }, [setProducts]);

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

  if (products === null) {
    return <JsonLoader onJsonLoad={handleJsonLoad} />;
  }

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
            onToggleAvailability={handleToggleAvailability}
            onImageClick={setFullscreenImage}
            onIgnore={(product) => setModal({ type: 'ignore', product })}
          />
        </main>
      </div>
      <Footer onExport={(format) => setModal({ type: 'export', format })}/>

      {modal?.type === 'add' && (
        <ProductFormModal
          isOpen={true}
          onClose={() => setModal(null)}
          onSave={handleProductSave}
          categories={allCategories}
        />
      )}
      {modal?.type === 'edit' && (
        <ProductFormModal
          isOpen={true}
          onClose={() => setModal(null)}
          onSave={handleProductSave}
          productToEdit={modal.product}
          categories={allCategories}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setModal(null)}
          onConfirm={() => handleProductDelete(modal.product.id)}
          productName={modal.product.title}
        />
      )}
       {modal?.type === 'ignore' && (
        <ConfirmIgnoreModal
          isOpen={true}
          onClose={() => setModal(null)}
          onConfirm={() => handleIgnoreProduct(modal.product.id)}
          productName={modal.product.title}
        />
      )}
      {modal?.type === 'export' && (
        <ExportModal
          isOpen={true}
          onClose={() => setModal(null)}
          format={modal.format}
          products={products}
          ignoredProductIds={ignoredProductIds}
        />
      )}
      {modal?.type === 'add-category' && (
        <AddCategoryModal
          isOpen={true}
          onClose={() => setModal(null)}
          onSave={handleCategorySave}
          existingCategories={allCategories}
        />
      )}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="Fullscreen view" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" />
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <X size={28} />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
