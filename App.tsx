import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { Product, UserPreferences, ModalState, Movement, ManualMovement, CsvUpdatePayload } from './types';
import { useAppStore, useDocUrl } from './hooks/useLocalStorage';
import JsonLoader from './components/JsonLoader';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProductDisplay from './components/ProductDisplay';
import Footer from './components/Footer';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { productSortComparator } from './utils';
import FinancialPanel from './components/FinancialPanel';
import BulkActionBar from './components/BulkActionBar';
import SyncStatusIndicator from './components/SyncStatusIndicator';

// Lazy load modals to improve initial load time
const DocUrlManager = lazy(() => import('./components/DocUrlManager'));
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

const App: React.FC = () => {
  const { docUrl, setDocUrl, createNewDoc, clearDocUrl } = useDocUrl();

  const {
    isReady, products, preferences, ignoredProductIds, allCategories, movements, manualMovements, auditLog,
    handleReset, handleJsonLoad, handleRestore, updatePreference, handleProductSave, handleProductDelete,
    handleSaveMovement, handleManualMovementSave, handleIgnoreProduct, handleRestoreProduct,
    handleCategorySave, handleCsvImport, logAction, changeDoc,
  } = useAppStore(docUrl);
  
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [currentView, setCurrentView] = useState<'catalog' | 'financials'>('catalog');
  
  const [fusionMode, setFusionMode] = useState(false);
  const [selectedForFusion, setSelectedForFusion] = useState<string[]>([]);
  
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleLeave = useCallback(() => {
    if (window.confirm("¿Seguro que quieres desconectarte de este catálogo? Podrás volver a unirte si guardas la URL.")) {
        clearDocUrl();
        window.location.reload();
    }
  }, [clearDocUrl]);

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

  const handleIgnoredChange = useCallback((show: boolean) => {
    if (show) {
      if (window.confirm('¿Estás seguro de que quieres mostrar los productos ocultos? Esta vista es para gestión y puede incluir items que no están a la venta.')) {
        updatePreference('showIgnoredOnly', show);
      }
    } else {
      updatePreference('showIgnoredOnly', show);
    }
  }, [updatePreference]);

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

    const handleRepairDuplicateVariantIds = useCallback(() => {
    changeDoc(d => {
        if (!d.products) return;
        const variantIdCounts = new Map<string, number>();
        d.products.forEach(p => p.variants.forEach(v => variantIdCounts.set(v.id, (variantIdCounts.get(v.id) || 0) + 1)));

        const duplicateIds = [...variantIdCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);

        if (duplicateIds.length === 0) {
          alert("No se encontraron IDs de variantes duplicados. ¡Tus datos están en buen estado!");
          return;
        }

        if (!window.confirm(`Se encontraron ${duplicateIds.length} ID(s) de variante compartidos... ¿Reparar automáticamente?`)) return;

        let variantsRepairedCount = 0;
        duplicateIds.forEach(dupId => {
          const productsWithDup = d.products!.filter((p: Product) => p.variants.some(v => v.id === dupId));
          productsWithDup.slice(1).forEach((productToFix: Product) => {
            const variantToFix = productToFix.variants.find(v => v.id === dupId);
            if (variantToFix) {
              const newId = `repaired-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const oldStock = variantToFix.stock;
              variantToFix.id = newId;
              
              if (!d.movements) d.movements = {};
              d.movements[newId] = [{
                id: `mov-repair-${Date.now()}`, variantId: newId, timestamp: Date.now(), type: 'Inicial',
                change: oldStock, newStock: oldStock, notes: 'ID de variante reparado. Historial reiniciado.'
              }];
              variantsRepairedCount++;
            }
          });
        });

        logAction('data_repair', `Reparación automática ejecutada. Se corrigieron ${variantsRepairedCount} variantes.`);
        alert(`Reparación completada. Se corrigieron ${variantsRepairedCount} variantes.`);
    });
  }, [changeDoc, logAction]);

  const handleProductMerge = useCallback((primaryProductId: string, secondaryProductId: string) => {
    changeDoc(d => {
        if (!d.products) return;
        const primaryProduct = d.products.find(p => p.id === primaryProductId);
        const secondaryProduct = d.products.find(p => p.id === secondaryProductId);
        if (!primaryProduct || !secondaryProduct) return;

        const mergedVariants = [...primaryProduct.variants, ...secondaryProduct.variants];
        const finalVariants = mergedVariants.map(v => ({ ...v })); // clone

        const variantNameCounts = new Map<string, number>();
        finalVariants.forEach(v => variantNameCounts.set(v.name, (variantNameCounts.get(v.name) || 0) + 1));
        
        finalVariants.forEach(v => {
          if ((variantNameCounts.get(v.name) || 0) > 1) {
            const sourceTitle = secondaryProduct.variants.some(sv => sv.id === v.id) ? secondaryProduct.title.split(' ')[0] : primaryProduct.title.split(' ')[0];
            v.name = `${v.name} (${sourceTitle})`;
          }
        });
        
        primaryProduct.variants = finalVariants;
        d.products = d.products.filter(p => p.id !== secondaryProductId);
        logAction('product_merge', `Productos fusionados: "${secondaryProduct.title}" en "${primaryProduct.title}".`);
    });
    setModal(null);
    setFusionMode(false);
    setSelectedForFusion([]);
  }, [changeDoc, logAction]);

  const handleImageClick = (images: string[]) => {
    const validImages = images.filter(Boolean);
    if (validImages.length > 0) setFullscreenData({ images: validImages, index: 0 });
  };
  
  // --- Fusion Mode Logic ---
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
  
  // --- Bulk Selection Logic ---
  const handleToggleSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };
  
  // --- Bulk Actions ---
  const handleBulkEditSave = (changes: { category?: string; hintsToAdd?: string[] }) => {
    changeDoc(d => {
      if (!d.products) return;
      d.products.forEach(p => {
        if (selectedProductIds.has(p.id)) {
          if (changes.category) p.category = changes.category;
          if (changes.hintsToAdd && changes.hintsToAdd.length > 0) {
            const currentHints = new Set(p.imageHint || []);
            changes.hintsToAdd.forEach(hint => currentHints.add(hint));
            p.imageHint = Array.from(currentHints);
          }
        }
      });
      logAction('bulk_edit', `Edición masiva aplicada a ${selectedProductIds.size} productos.`);
    });
    setModal(null);
    setSelectedProductIds(new Set());
  };

  const handleBulkIgnore = () => {
    if (window.confirm(`¿Estás seguro de que quieres ocultar los ${selectedProductIds.size} productos seleccionados?`)) {
        changeDoc(d => {
            if (!d.ignoredProductIds) d.ignoredProductIds = [];
            const newIgnored = new Set([...d.ignoredProductIds, ...selectedProductIds]);
            d.ignoredProductIds = Array.from(newIgnored);
        });
        logAction('bulk_ignore', `Ocultados ${selectedProductIds.size} productos en lote.`);
        setSelectedProductIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar permanentemente los ${selectedProductIds.size} productos seleccionados?`)) {
        changeDoc(d => {
            if (!d.products) return;
            d.products = d.products.filter(p => !selectedProductIds.has(p.id));
        });
        logAction('bulk_delete', `Eliminados ${selectedProductIds.size} productos en lote.`);
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

  const mainContent = () => {
    if (!docUrl) {
      return (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
            <p className="text-white text-lg animate-pulse">Cargando Módulo de Acceso...</p>
          </div>
        }>
          <DocUrlManager onSetUrl={setDocUrl} onCreateNew={createNewDoc} />
        </Suspense>
      );
    }
  
    if (!isReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
          <p className="text-white text-lg animate-pulse">Cargando y sincronizando datos...</p>
        </div>
      );
    }
  
    if (products === null) return <JsonLoader onJsonLoad={handleJsonLoad} onRestore={handleRestore} />;
  
    const isSelectionMode = selectedProductIds.size > 0;
    
    const handleMultipleMovementsDelete = useCallback((variantId: string, movementIdsToDelete: string[]) => {
          changeDoc(d => {
              if (!d.movements || !d.products) return;
              const originalMovements = d.movements[variantId] || [];
              const remainingMovements = originalMovements.filter(m => !movementIdsToDelete.includes(m.id));
              
              let currentStock = 0;
              const recalculatedMovements = remainingMovements.sort((a, b) => a.timestamp - b.timestamp).map(m => {
                  currentStock = m.type === 'Inicial' ? m.change : currentStock + m.change;
                  currentStock = Math.max(0, currentStock);
                  return { ...m, newStock: currentStock };
              });
  
              const finalStock = recalculatedMovements.length > 0 ? recalculatedMovements[recalculatedMovements.length - 1].newStock : 0;
  
              d.products.forEach(p => {
                  p.variants.forEach(v => {
                      if (v.id === variantId) v.stock = finalStock;
                  });
              });
              d.movements[variantId] = recalculatedMovements;
          });
      }, [changeDoc]);
  
    const renderModal = () => {
      if (!modal) return null;
      const commonProps = { isOpen: true, onClose: () => setModal(null) };
      switch (modal.type) {
        case 'add': return <ProductFormModal {...commonProps} onSave={p => { handleProductSave(p); setModal(null); }} categories={allCategories} />;
        case 'edit': return <ProductFormModal {...commonProps} onSave={p => { handleProductSave(p); setModal(null); }} productToEdit={modal.product} categories={allCategories} />;
        case 'delete': return <ConfirmDeleteModal {...commonProps} onConfirm={() => { handleProductDelete(modal.product.id); setModal(null); }} productName={modal.product.title} />;
        case 'ignore': return <ConfirmIgnoreModal {...commonProps} onConfirm={() => { handleIgnoreProduct(modal.product.id); setModal(null); }} productName={modal.product.title} />;
        case 'export': return <ExportModal {...commonProps} format={modal.format} products={products} ignoredProductIds={ignoredProductIds} />;
        case 'add-category': return <AddCategoryModal {...commonProps} onSave={cat => { handleCategorySave(cat); setModal(null); }} existingCategories={allCategories} />;
        case 'movements': return <MovementHistoryModal key={modal.product.id} {...commonProps} product={modal.product} movements={movements} onSaveMovement={handleSaveMovement} onDeleteMovements={handleMultipleMovementsDelete} />;
        case 'manual-movement': return <ManualMovementModal {...commonProps} onSave={mov => { handleManualMovementSave(mov); setModal(null); }} />;
        case 'tools': return <ToolsModal {...commonProps} onRepair={handleRepairDuplicateVariantIds} onFusionStart={() => { setFusionMode(true); setModal(null); }} onShowAuditLog={() => setModal({ type: 'audit-log' })} onReset={handleReset} />;
        case 'fusion': return <FusionModal {...commonProps} productsToFuse={modal.products} onMerge={handleProductMerge} />;
        case 'audit-log': return <AuditLogModal {...commonProps} auditLog={auditLog} />;
        case 'bulk-edit': return <BulkEditModal {...commonProps} productsCount={modal.productsCount} categories={allCategories} onSave={handleBulkEditSave} />;
        case 'import-csv': return <DataImportModal {...commonProps} products={products} onImport={updates => { handleCsvImport(updates); setModal(null); }} />;
        default: return null;
      }
    };
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 font-sans">
        <div className={currentView === 'catalog' ? "pb-40 md:pb-24" : ""}>
          {currentView === 'catalog' && (
            <Header 
              onViewModeChange={(mode) => updatePreference('viewMode', mode)}
              onAddProduct={() => setModal({ type: 'add' })}
              onAddCategory={() => setModal({ type: 'add-category' })}
              onLeave={handleLeave}
              docUrl={docUrl}
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
                  onRestore={product => handleRestoreProduct(product.id, product.title)}
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
        <SyncStatusIndicator />
      </div>
    );
  };

  return mainContent();
};

export default App;