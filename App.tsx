import React, { useState, useMemo, useCallback, Suspense, lazy, useEffect } from 'react';
import { Product, UserPreferences, ModalState, Movement, ManualMovement } from './types';
import { useAppStore } from './hooks/useLocalStorage';
import { initializeRootDocHandle } from './lib/automerge-repo';
import JsonLoader from './components/JsonLoader';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProductDisplay from './components/ProductDisplay';
import Footer from './components/Footer';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { productSortComparator } from './utils';
import FinancialPanel from './components/FinancialPanel';
import BulkActionBar from './components/BulkActionBar';

// Lazy load modals to improve initial load time
const ProductFormModal = lazy(() => import('./components/ProductFormModal'));
const ConfirmDeleteModal = lazy(() => import('./components/ConfirmDeleteModal'));
const ConfirmIgnoreModal = lazy(() => import('./components/ConfirmIgnoreModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const AddCategoryModal = lazy(() => import('./components/AddCategoryModal'));
const MovementHistoryModal = lazy(() => import('./components/MovementHistoryModal'));
const ManualMovementModal = lazy(() => import('./components/ManualMovementModal'));
const ToolsModal = lazy(() => import('./components/ToolsModal'));
const FusionModal = lazy(() => import('./components/FusionModal'));
const AuditLogModal = lazy(() => import('./components/AuditLogModal'));
const BulkEditModal = lazy(() => import('./components/BulkEditModal'));
const DataImportModal = lazy(() => import('./components/DataImportModal'));

export type CsvUpdatePayload = {
  variantId: string;
  newPrice?: number;
  newCost?: number;
  newStock?: number;
};

const AppContent: React.FC = () => {
  const {
    products, preferences, ignoredProductIds, allCategories, movements, manualMovements, auditLog,
    loadJsonData, resetAllData, updatePreference, deleteProduct, saveMovement, saveManualMovement,
    ignoreProduct, restoreProduct, saveCategory, importCsvUpdates, repairDuplicateVariantIds,
    mergeProducts, bulkEditProducts, bulkIgnoreProducts, bulkDeleteProducts,
    handleProductSave, handleMultipleMovementsDelete,
  } = useAppStore();
  
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [currentView, setCurrentView] = useState<'catalog' | 'financials'>('catalog');
  
  const [fusionMode, setFusionMode] = useState(false);
  const [selectedForFusion, setSelectedForFusion] = useState<string[]>([]);
  
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const handleReset = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible.')) {
      resetAllData();
    }
  };

  const handleIgnoredChange = (show: boolean) => {
    if (show) {
      if (window.confirm('¿Estás seguro de que quieres mostrar los productos ocultos? Esta vista es para gestión y puede incluir items que no están a la venta.')) {
        updatePreference('showIgnoredOnly', show);
      }
    } else {
      updatePreference('showIgnoredOnly', show);
    }
  };

  const handleProductDelete = (productId: string) => {
    deleteProduct(productId);
    setModal(null);
  };
  
  const handleSaveMovementAndClose = (productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => {
    saveMovement(productId, variantId, movementData);

    const product = products?.find(p => p.id === productId);
    if(product) {
      const newTotalStock = product.variants.reduce((sum, v) => sum + (v.id === variantId ? v.stock + movementData.change : v.stock), 0);
      if (newTotalStock === 0 && preferences.showAvailableOnly) {
          updatePreference('showAvailableOnly', false);
      }
    }
  };

  const handleManualMovementSave = (movement: Omit<ManualMovement, 'id'>) => {
    saveManualMovement(movement);
    setModal(null);
  };

  const handleIgnoreProduct = (product: Product) => {
    ignoreProduct(product.id, product.title);
    setModal(null);
  };
  
  const handleRestoreProduct = (productToRestore: Product) => {
    if (window.confirm(`¿Seguro que quieres restaurar "${productToRestore.title}"? Volverá a ser visible en el catálogo principal.`)) {
        restoreProduct(productToRestore.id, productToRestore.title);
    }
  };

  const handleCategorySave = (newCategory: string) => {
    saveCategory(newCategory);
    setModal(null);
  };

  const handleBackupDownload = useCallback(() => {
    if (!window.confirm('¿Descargar una copia de seguridad completa?')) return;
    const backupData = { products, preferences, ignoredProductIds, categories: allCategories, movements, manualMovements, auditLog };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alkima-mizu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }, [products, preferences, ignoredProductIds, allCategories, movements, manualMovements, auditLog]);

  const handleCsvImport = (updates: CsvUpdatePayload[]) => {
    if (updates.length === 0) {
      setModal(null);
      return;
    }
    importCsvUpdates(updates);
    setModal(null);
    alert(`Actualización por CSV completada. Se modificaron ${updates.length} variantes.`);
  };

  const handleRepairDuplicateVariantIds = () => {
    const { repairedCount, duplicateIds } = repairDuplicateVariantIds();
    
    if (duplicateIds.length === 0) {
      alert("No se encontraron IDs de variantes duplicados. ¡Tus datos están en buen estado!");
      return;
    }

    if (!window.confirm(`Se encontraron ${duplicateIds.length} ID(s) de variante compartidos. ¿Deseas repararlos automáticamente?\n\nADVERTENCIA: El primer producto encontrado con un ID duplicado conservará el historial compartido. Los demás obtendrán un nuevo ID y su historial se reiniciará basado en su stock actual. Esta acción no se puede deshacer.`)) {
      return;
    }
    
    alert(`Reparación completada. Se corrigieron ${repairedCount} variantes.`);
  };

  const handleProductMerge = (primaryProductId: string, secondaryProductId: string) => {
    mergeProducts(primaryProductId, secondaryProductId);
    setModal(null);
    setFusionMode(false);
    setSelectedForFusion([]);
  };

  const handleImageClick = (images: string[]) => {
    const validImages = images.filter(Boolean);
    if (validImages.length > 0) setFullscreenData({ images: validImages, index: 0 });
  };
  
  const toggleFusionSelection = (productId: string) => {
    setSelectedForFusion(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(productId)) newSelection.delete(productId);
        else if (newSelection.size < 2) newSelection.add(productId);
        return Array.from(newSelection);
    });
  };

  const startFusion = () => {
    const productsToFuse = products?.filter(p => selectedForFusion.includes(p.id));
    if (productsToFuse && productsToFuse.length === 2) {
        setModal({ type: 'fusion', products: [productsToFuse[0], productsToFuse[1]] });
    }
  };
  
  const handleToggleSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };
  
  const handleBulkEditSave = (changes: { category?: string; hintsToAdd?: string[] }) => {
    bulkEditProducts(selectedProductIds, changes);
    setModal(null);
    setSelectedProductIds(new Set());
  };

  const handleBulkIgnore = () => {
    if (window.confirm(`¿Estás seguro de que quieres ocultar los ${selectedProductIds.size} productos seleccionados?`)) {
        bulkIgnoreProducts(selectedProductIds);
        setSelectedProductIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar permanentemente los ${selectedProductIds.size} productos seleccionados?`)) {
        bulkDeleteProducts(selectedProductIds);
        setSelectedProductIds(new Set());
    }
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

  if (products === null || (products.length === 0 && Object.keys(movements).length === 0)) {
    return <JsonLoader onJsonLoad={loadJsonData} />;
  }
  
  const isSelectionMode = selectedProductIds.size > 0;

  const renderModal = () => {
    if (!modal) return null;
    const commonProps = { isOpen: true, onClose: () => setModal(null) };
    switch (modal.type) {
      case 'add': return <ProductFormModal {...commonProps} onSave={p => { handleProductSave(p); setModal(null); }} categories={allCategories} />;
      case 'edit': return <ProductFormModal {...commonProps} onSave={p => { handleProductSave(p); setModal(null); }} productToEdit={modal.product} categories={allCategories} />;
      case 'delete': return <ConfirmDeleteModal {...commonProps} onConfirm={() => handleProductDelete(modal.product.id)} productName={modal.product.title} />;
      case 'ignore': return <ConfirmIgnoreModal {...commonProps} onConfirm={() => handleIgnoreProduct(modal.product)} productName={modal.product.title} />;
      case 'export': return <ExportModal {...commonProps} format={modal.format} products={products} ignoredProductIds={ignoredProductIds} />;
      case 'add-category': return <AddCategoryModal {...commonProps} onSave={handleCategorySave} existingCategories={allCategories} />;
      case 'movements': return <MovementHistoryModal key={modal.product.id} {...commonProps} product={modal.product} movements={movements} onSaveMovement={handleSaveMovementAndClose} onDeleteMovements={handleMultipleMovementsDelete} />;
      case 'manual-movement': return <ManualMovementModal {...commonProps} onSave={handleManualMovementSave} />;
      case 'tools': return <ToolsModal {...commonProps} onRepair={handleRepairDuplicateVariantIds} onFusionStart={() => { setFusionMode(true); setModal(null); }} onShowAuditLog={() => setModal({ type: 'audit-log' })} />;
      case 'fusion': return <FusionModal {...commonProps} productsToFuse={modal.products} onMerge={handleProductMerge} />;
      case 'audit-log': return <AuditLogModal {...commonProps} auditLog={auditLog} />;
      case 'bulk-edit': return <BulkEditModal {...commonProps} productsCount={modal.productsCount} categories={allCategories} onSave={handleBulkEditSave} />;
      case 'import-csv': return <DataImportModal {...commonProps} products={products} onImport={handleCsvImport} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 font-sans">
      <div className={currentView === 'catalog' ? "pb-40 md:pb-24" : ""}>
        {currentView === 'catalog' && (
          <Header 
            onViewModeChange={(mode: 'grid' | 'list') => updatePreference('viewMode', mode)}
            onAddProduct={() => setModal({ type: 'add' })}
            onAddCategory={() => setModal({ type: 'add-category' })}
            onReset={handleReset}
            onNavigateToFinancials={() => setCurrentView('financials')}
            onOpenTools={() => setModal({ type: 'tools' })}
            isSpecialMode={fusionMode || isSelectionMode}
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
                categories={allCategories}
                isFusionMode={fusionMode}
                selectedForFusionCount={selectedForFusion.length}
                onCancelFusion={() => { setFusionMode(false); setSelectedForFusion([]); }}
                onStartFusion={startFusion}
                isSelectionMode={isSelectionMode}
                allTags={allTags}
                selectedTags={selectedTags}
                onSelectedTagsChange={setSelectedTags}
              />
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
                isFusionMode={fusionMode}
                selectedForFusion={selectedForFusion}
                onSelectForFusion={toggleFusionSelection}
                selectedProductIds={selectedProductIds}
                onToggleSelection={handleToggleSelection}
              />
            </div>
           ) : (
             <FinancialPanel 
                onBack={() => setCurrentView('catalog')} 
                products={products} 
                movements={movements} 
                manualMovements={manualMovements} 
                onAddManualMovement={() => setModal({ type: 'manual-movement' })}
                onOpenImportModal={() => setModal({ type: 'import-csv' })}
                onExportCsv={() => setModal({ type: 'export', format: 'csv' })}
             />
           )}
        </main>
      </div>
      {currentView === 'catalog' && !fusionMode && !isSelectionMode && <Footer onExport={format => setModal({ type: 'export', format })} onBackup={handleBackupDownload}/>}
      {currentView === 'catalog' && isSelectionMode && (
          <BulkActionBar 
            count={selectedProductIds.size}
            onClear={() => setSelectedProductIds(new Set())}
            onBulkEdit={() => setModal({ type: 'bulk-edit', productsCount: selectedProductIds.size })}
            onBulkIgnore={handleBulkIgnore}
            onBulkDelete={handleBulkDelete}
          />
      )}
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

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initializeRootDocHandle()
      .then(() => setIsInitialized(true))
      .catch(e => {
        console.error("Failed to initialize Automerge repo:", e);
        setError(e);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="text-center bg-red-900/50 p-8 rounded-lg border border-red-500/30">
          <h1 className="text-2xl font-bold text-red-400">Error de Inicialización</h1>
          <p className="mt-2 text-gray-300">No se pudo cargar la base de datos de la aplicación.</p>
          <p className="mt-1 text-gray-400">Por favor, intenta refrescar la página. Si el problema persiste, contacta a soporte.</p>
          <pre className="mt-4 text-left text-xs bg-black/30 p-4 rounded overflow-auto max-h-40">{error.message}</pre>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="text-white text-xl font-semibold animate-pulse">
          Inicializando Alquima Mizu...
        </div>
      </div>
    );
  }

  return <AppContent />;
};

export default App;
