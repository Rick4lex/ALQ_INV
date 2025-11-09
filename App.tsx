
import React, { useMemo, Suspense, lazy } from 'react';
import { useAppContext } from './contexts/AppContext';
import JsonLoader from './components/JsonLoader';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProductDisplay from './components/ProductDisplay';
import Footer from './components/Footer';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { productSortComparator } from './utils';
import FinancialPanel from './components/FinancialPanel';
import BulkActionBar from './components/BulkActionBar';

// Lazy load modals to improve initial load time
const ProductFormModal = lazy(() => import('./components/ProductFormModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const AddCategoryModal = lazy(() => import('./components/AddCategoryModal'));
const MovementHistoryModal = lazy(() => import('./components/MovementHistoryModal'));
const ManualMovementModal = lazy(() => import('./components/ManualMovementModal'));
const ToolsModal = lazy(() => import('./components/ToolsModal'));
const FusionModal = lazy(() => import('./components/FusionModal'));
const AuditLogModal = lazy(() => import('./components/AuditLogModal'));
const BulkEditModal = lazy(() => import('./components/BulkEditModal'));
const DataImportModal = lazy(() => import('./components/DataImportModal'));
const ConfirmModal = lazy(() => import('./components/ConfirmModal'));
const LoadFromTextModal = lazy(() => import('./components/LoadFromTextModal'));
const RestoreModal = lazy(() => import('./components/RestoreModal'));

const App: React.FC = () => {
  const {
    products,
    preferences,
    ignoredProductIds,
    modal,
    setModal,
    fullscreenData,
    setFullscreenData,
    currentView,
    fusionMode,
    selectedProductIds,
    selectedTags,
    isMigrating,
    handleTextLoad,
    handleRestoreBackup,
    handleImageClick,
    changeFullscreenImage,
    handleProductDelete,
    handleIgnoreProduct
  } = useAppContext();
  
  const allTags = useMemo(() => {
    if (!products) return [];
    const tagsSet = new Set<string>();
    products.forEach(p => {
        (p.imageHint || []).forEach(hint => tagsSet.add(hint));
    });
    return Array.from(tagsSet).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const showIgnored = !!preferences.showIgnoredOnly;
    
    return products.filter(product => {
      const matchesIgnoredStatus = showIgnored
        ? ignoredProductIds.includes(product.id)
        : !ignoredProductIds.includes(product.id);
      
      if (!matchesIgnoredStatus) return false;
      if (fusionMode || selectedProductIds.size > 0) return true;

      const matchesSearch = (product.title || '').toLowerCase().includes(preferences.searchTerm.toLowerCase());
      const matchesCategory = preferences.selectedCategory === 'Todas' || product.category === preferences.selectedCategory;
      const matchesAvailability = !preferences.showAvailableOnly || product.variants.some(v => v.stock > 0);
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => (product.imageHint || []).includes(tag));

      return matchesSearch && matchesCategory && matchesAvailability && matchesTags;
    }).sort(productSortComparator);
  }, [products, preferences, ignoredProductIds, fusionMode, selectedTags, selectedProductIds]);
  
  if (isMigrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
        <div className="text-center text-white">
          <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-purple-400" />
          <h2 className="text-2xl font-bold">Actualizando base de datos...</h2>
          <p className="text-gray-300 mt-2 max-w-md">
            Por favor, espera un momento. Estamos migrando tus datos a una versión más rápida y robusta. Este proceso solo ocurrirá una vez.
          </p>
        </div>
      </div>
    );
  }

  if (products === null) return <JsonLoader onTextLoad={handleTextLoad} />;

  const isSelectionMode = selectedProductIds.size > 0;

  const renderModal = () => {
    if (!modal) return null;
    const commonProps = { isOpen: true, onClose: () => setModal(null) };
    
    switch (modal.type) {
      case 'add': return <ProductFormModal {...commonProps} />;
      case 'edit': return <ProductFormModal {...commonProps} productToEdit={modal.product} />;
      case 'delete': return <ConfirmModal 
                                {...commonProps}
                                title="Confirmar Eliminación"
                                message={<>¿Estás seguro de que quieres eliminar el producto "<strong>{modal.product.title}</strong>"? Esta acción no se puede deshacer.</>}
                                onConfirm={() => {
                                    handleProductDelete(modal.product.id);
                                    setModal(null);
                                }}
                                confirmText="Eliminar"
                                confirmClass="bg-brand-red hover:bg-red-600"
                              />;
      case 'ignore': return <ConfirmModal 
                                {...commonProps}
                                title="Confirmar Ocultar Producto"
                                message={<>¿Estás seguro de que quieres ocultar el producto "<strong>{modal.product.title}</strong>"? El producto no aparecerá en la vista principal. Podrás verlo y restaurarlo desde la vista de 'Ocultos'.</>}
                                onConfirm={() => {
                                    handleIgnoreProduct(modal.product.id);
                                    setModal(null);
                                }}
                                confirmText="Confirmar y Ocultar"
                                confirmClass="bg-yellow-500 hover:bg-yellow-600 text-white"
                              />;
      case 'export': return <ExportModal {...commonProps} format={modal.format} />;
      case 'add-category': return <AddCategoryModal {...commonProps} />;
      case 'movements': return <MovementHistoryModal key={modal.product.id} {...commonProps} product={modal.product} />;
      case 'manual-movement': return <ManualMovementModal {...commonProps} />;
      case 'tools': return <ToolsModal {...commonProps} />;
      case 'fusion': return <FusionModal {...commonProps} productsToFuse={modal.products} />;
      case 'audit-log': return <AuditLogModal {...commonProps} />;
      case 'bulk-edit': return <BulkEditModal {...commonProps} productsCount={modal.productsCount} />;
      case 'import-csv': return <DataImportModal {...commonProps} />;
      case 'load-from-text': return <LoadFromTextModal {...commonProps} />;
      case 'restore-backup': return <RestoreModal {...commonProps} onRestore={handleRestoreBackup} />;
      case 'confirm': return <ConfirmModal 
                                {...commonProps} 
                                title={modal.title}
                                message={modal.message}
                                onConfirm={modal.onConfirm}
                                confirmText={modal.confirmText}
                                confirmClass={modal.confirmClass}
                              />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 font-sans">
      <div className={currentView === 'catalog' ? "pb-40 md:pb-24" : ""}>
        {currentView === 'catalog' && <Header />}
        <main>
           {currentView === 'catalog' ? (
            <div className="container mx-auto px-4 py-6">
              <FilterBar allTags={allTags} productCount={filteredProducts.length} />
              <ProductDisplay 
                products={filteredProducts} 
                onImageClick={handleImageClick}
              />
            </div>
           ) : (
             <FinancialPanel />
           )}
        </main>
      </div>
      {currentView === 'catalog' && !fusionMode && !isSelectionMode && <Footer />}
      {currentView === 'catalog' && isSelectionMode && <BulkActionBar />}
      <Suspense fallback={
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-white text-lg animate-pulse">Cargando Módulo...</div>
        </div>
      }>
        {renderModal()}
      </Suspense>
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
          <img src={fullscreenData.images[fullscreenData.index]} alt="Fullscreen view" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default App;