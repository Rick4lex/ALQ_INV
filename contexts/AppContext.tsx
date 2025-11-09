

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { ModalState, Product, UserPreferences, Movement, ManualMovement, CsvUpdatePayload, AuditEntry, Movements } from '../types';
import { db } from '../db';
import Dexie from 'dexie';

type AppStoreType = {
    products: Product[] | null;
    setProducts: React.Dispatch<React.SetStateAction<Product[] | null>>;
    preferences: UserPreferences;
    setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
    ignoredProductIds: string[];
    setIgnoredProductIds: React.Dispatch<React.SetStateAction<string[]>>;
    allCategories: string[];
    setAllCategories: React.Dispatch<React.SetStateAction<string[]>>;
    movements: Movements;
    setMovements: React.Dispatch<React.SetStateAction<Movements>>;
    manualMovements: ManualMovement[];
    setManualMovements: React.Dispatch<React.SetStateAction<ManualMovement[]>>;
    auditLog: AuditEntry[];
    setAuditLog: React.Dispatch<React.SetStateAction<AuditEntry[]>>;
    isMigrating: boolean;
    logAction: (type: AuditEntry['type'], message: string) => Promise<void>;
    addMovement: (variantId: string, movementData: Omit<Movement, 'id' | 'variantId'>) => Promise<void>;
    handleProductSave: (productToSave: Product) => Promise<void>;
    handleMultipleMovementsDelete: (variantId: string, movementIdsToDelete: string[]) => Promise<void>;
};

interface AppContextType extends AppStoreType {
  modal: ModalState | null;
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>;
  fullscreenData: { images: string[]; index: number } | null;
  setFullscreenData: React.Dispatch<React.SetStateAction<{ images: string[]; index: number; } | null>>;
  currentView: 'catalog' | 'financials';
  setCurrentView: React.Dispatch<React.SetStateAction<'catalog' | 'financials'>>;
  fusionMode: boolean;
  setFusionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedForFusion: string[];
  setSelectedForFusion: React.Dispatch<React.SetStateAction<string[]>>;
  selectedProductIds: Set<string>;
  setSelectedProductIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  handleTextLoad: (jsonString: string) => void;
  handleRestoreBackup: (backupData: any) => Promise<void>;
  handleReset: () => void;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  handleIgnoredChange: (show: boolean) => void;
  handleProductDelete: (productId: string) => Promise<void>;
  handleSaveMovement: (productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => void;
  handleManualMovementSave: (movement: Omit<ManualMovement, 'id'>) => void;
  handleIgnoreProduct: (productId: string) => Promise<void>;
  handleRestoreProduct: (productToRestore: Product) => void;
  handleCategorySave: (newCategory: string) => void;
  handleBackupDownload: () => void;
  handleCsvImport: (updates: CsvUpdatePayload[]) => void;
  handleRepairDuplicateVariantIds: () => void;
  handleProductMerge: (primaryProductId: string, secondaryProductId: string) => void;
  handleImageClick: (images: string[]) => void;
  toggleFusionSelection: (productId: string) => void;
  startFusion: () => void;
  handleBulkEditSave: (changes: { category?: string; hintsToAdd?: string[] }) => void;
  handleBulkIgnore: () => void;
  handleBulkDelete: () => void;
  changeFullscreenImage: (direction: 'next' | 'prev') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const store = useAppStore();
  const { products, setProducts, preferences, setPreferences, ignoredProductIds, setIgnoredProductIds, allCategories, setAllCategories, movements, setMovements, manualMovements, setManualMovements, auditLog, logAction, addMovement, handleProductSave, handleMultipleMovementsDelete: rawHandleMultipleMovementsDelete } = store;

  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [currentView, setCurrentView] = useState<'catalog' | 'financials'>('catalog');
  const [fusionMode, setFusionMode] = useState(false);
  const [selectedForFusion, setSelectedForFusion] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences(prev => {
        const newPrefs = { ...prev, [key]: value };
        db.preferences.put({ ...newPrefs, key: 'user' });
        return newPrefs;
      });
  }, [setPreferences]);

  const handleJsonLoad = useCallback(async (data: Product[]) => {
    // This function now just handles the DB/state update part
    await db.products.bulkPut(data);
    
    // Clear old movements for products being replaced
    const productIds = new Set(data.map(p => p.id));
    const variantsToClear = (products || []).filter(p => productIds.has(p.id)).flatMap(p => p.variants.map(v => v.id));
    if (variantsToClear.length > 0) {
      await db.movements.where('variantId').anyOf(variantsToClear).delete();
    }
    
    // Create 'Inicial' movements for all new variants
    const initialMovements = data.flatMap(p => p.variants.map(v => ({
      id: `mov-${v.id}-${Date.now()}`, variantId: v.id, timestamp: Date.now(),
      type: 'Inicial' as const, change: v.stock, newStock: v.stock, notes: 'Carga desde JSON'
    })));
    await db.movements.bulkAdd(initialMovements);

    setProducts(data);
    const loadedCategories = [...new Set(data.map(p => p.category))];
    const newCategories = [...new Set([...allCategories, ...loadedCategories])];
    await db.allCategories.bulkPut(newCategories.map(c => ({ id: c })));
    setAllCategories(newCategories);
    
    // Refresh movements in state
    const allDbMovements = await db.movements.toArray();
    const groupedMovements = allDbMovements.reduce((acc: Movements, mov) => {
        if (!acc[mov.variantId]) acc[mov.variantId] = [];
        acc[mov.variantId].push(mov);
        return acc;
    }, {});
    setMovements(groupedMovements);

    logAction('text_load', `Cargados ${data.length} productos desde texto JSON.`);
    setModal(null);
  }, [allCategories, products, setProducts, setAllCategories, setMovements, logAction, setModal]);

  const handleTextLoad = useCallback((jsonContent: string) => {
      if (!jsonContent.trim()) {
        alert('El área de texto JSON está vacía.');
        return;
      }
      try {
        const parsed = JSON.parse(jsonContent);
        if (parsed && Array.isArray(parsed.placeholderImages)) {
          const loadedProducts: Product[] = parsed.placeholderImages
            .filter((p: any) => p && p.id)
            .map((p: any) => {
              let productData = { ...p };
              if (productData.imageHint && typeof productData.imageHint === 'string') {
                productData.imageHint = [productData.imageHint];
              } else if (!Array.isArray(productData.imageHint)) {
                productData.imageHint = [];
              }
              if (!productData.variants) {
                const stock = productData.hasOwnProperty('stock') ? productData.stock : (productData.available ? 1 : 0);
                productData.variants = [{
                  id: `${productData.id}-default`, name: 'Único', stock: stock ?? 0,
                  price: productData.price ?? '', sku: productData.sku ?? '',
                }];
              }
              return productData;
            });
          handleJsonLoad(loadedProducts);
        } else {
          alert('El formato del JSON es inválido. Asegúrate de que tenga una clave "placeholderImages" con un array de productos.');
        }
      } catch (e) {
        alert('Error al parsear el JSON. Por favor, revisa la sintaxis.');
      }
  }, [handleJsonLoad]);


  const handleRestoreBackup = useCallback(async (backupData: any) => {
    await (db as Dexie).transaction('rw', [
        db.products,
        db.preferences,
        db.ignoredProductIds,
        db.allCategories,
        db.movements,
        db.manualMovements,
        db.auditLog,
    ], async () => {
        await Promise.all([
            db.products.clear(),
            db.preferences.clear(),
            db.ignoredProductIds.clear(),
            db.allCategories.clear(),
            db.movements.clear(),
            db.manualMovements.clear(),
            db.auditLog.clear(),
        ]);

        await db.products.bulkPut(backupData.products);
        await db.preferences.put({ ...backupData.preferences, key: 'user' });
        await db.ignoredProductIds.bulkPut(backupData.ignoredProductIds.map((id: string) => ({ id })));
        await db.allCategories.bulkPut(backupData.categories.map((id: string) => ({ id })));
        const flatMovements = Object.values(backupData.movements || {}).flat();
        await db.movements.bulkPut(flatMovements as Movement[]);
        await db.manualMovements.bulkPut(backupData.manualMovements || []);
        await db.auditLog.bulkPut(backupData.auditLog || []);
    });
    await logAction('backup_restore', 'La aplicación se restauró desde un archivo de backup.');
    alert('¡Restauración completada con éxito! La aplicación se recargará.');
    window.location.reload();
  }, [logAction]);

  const handleReset = useCallback(() => {
    setModal({
      type: 'confirm',
      title: 'Reiniciar Aplicación',
      message: '¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible y eliminará todos los productos, movimientos y configuraciones.',
      onConfirm: async () => {
        await (db as Dexie).delete();
        window.location.reload();
      },
      confirmText: 'Sí, borrar todo',
      confirmClass: 'bg-brand-red hover:bg-red-600',
    });
  }, [setModal]);

  const handleIgnoredChange = useCallback((show: boolean) => {
    updatePreference('showIgnoredOnly', show);
  }, [updatePreference]);

  const handleProductDelete = useCallback(async (productId: string) => {
    const productToDelete = products?.find(p => p.id === productId);
    if (!productToDelete) return;

    const allVariantIds = productToDelete.variants.map(v => v.id);
    
    await (db as Dexie).transaction('rw', db.products, db.movements, db.auditLog, async () => {
        await db.products.delete(productId);
        await db.movements.where('variantId').anyOf(allVariantIds).delete();
    });

    setProducts(prev => prev?.filter(p => p.id !== productId) || null);
    setMovements(prev => {
        const newMovements = { ...prev };
        allVariantIds.forEach(vid => delete newMovements[vid]);
        return newMovements;
    });
    await logAction('product_delete', `Producto eliminado: "${productToDelete.title}" (ID: ${productId})`);
  }, [products, setProducts, setMovements, logAction]);
  
  const handleSaveMovement = useCallback(async (productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => {
      const product = products?.find(p => p.id === productId);
      const variant = product?.variants.find(v => v.id === variantId);
      if (!product || !variant) return;
      
      const newStock = Math.max(0, variant.stock + movementData.change);
      const newMovement: Omit<Movement, 'id' | 'variantId'> = { ...movementData, newStock };
      await addMovement(variantId, newMovement);
      
      const updatedProduct = {
          ...product,
          variants: product.variants.map(v => v.id === variantId ? { ...v, stock: newStock } : v)
      };
      
      await db.products.put(updatedProduct);
      setProducts(prev => prev?.map(p => p.id === productId ? updatedProduct : p) || null);
  }, [products, setProducts, addMovement]);
  
  const handleManualMovementSave = useCallback(async (movement: Omit<ManualMovement, 'id'>) => {
      const newMovement: ManualMovement = { ...movement, id: `manual-${Date.now()}` };
      await db.manualMovements.add(newMovement);
      setManualMovements(prev => [...prev, newMovement]);
      setModal(null);
  }, [setManualMovements, setModal]);

  const handleIgnoreProduct = useCallback(async (productId: string) => {
      if (ignoredProductIds.includes(productId)) return;
      const productToIgnore = products?.find(p => p.id === productId);
      if (!productToIgnore) return;

      const newIgnored = [...ignoredProductIds, productId];
      await db.ignoredProductIds.add({ id: productId });
      setIgnoredProductIds(newIgnored);
      await logAction('product_ignore', `Producto ocultado: "${productToIgnore.title}" (ID: ${productId})`);
  }, [ignoredProductIds, products, setIgnoredProductIds, logAction]);

  const handleRestoreProduct = useCallback(async (productToRestore: Product) => {
    setModal({
        type: 'confirm',
        title: 'Restaurar Producto',
        message: `¿Estás seguro de que quieres restaurar el producto "${productToRestore.title}"?`,
        onConfirm: async () => {
            const newIgnored = ignoredProductIds.filter(id => id !== productToRestore.id);
            await db.ignoredProductIds.delete(productToRestore.id);
            setIgnoredProductIds(newIgnored);
            await logAction('product_restore', `Producto restaurado: "${productToRestore.title}" (ID: ${productToRestore.id})`);
            setModal(null);
        },
        confirmText: 'Restaurar',
        confirmClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    });
  }, [ignoredProductIds, setIgnoredProductIds, logAction, setModal]);
  
  const handleCategorySave = useCallback(async (newCategoryRaw: string) => {
    const newCategory = newCategoryRaw.toLowerCase().replace(/\s+/g, '-');
    if (!allCategories.includes(newCategory)) {
        const newCategories = [...allCategories, newCategory];
        await db.allCategories.add({ id: newCategory });
        setAllCategories(newCategories);
        await logAction('category_add', `Categoría añadida: "${newCategory}"`);
    }
    setModal(null);
  }, [allCategories, setAllCategories, logAction, setModal]);

  const handleBackupDownload = useCallback(async () => {
    setModal({
        type: 'confirm',
        title: 'Descargar Backup',
        message: 'Se generará un archivo JSON con todos tus datos (productos, movimientos, configuraciones). Guárdalo en un lugar seguro. ¿Continuar?',
        onConfirm: async () => {
            const backupData = {
                products: await db.products.toArray(),
                preferences: await db.preferences.get('user'),
                ignoredProductIds: (await db.ignoredProductIds.toArray()).map(item => item.id),
                categories: (await db.allCategories.toArray()).map(item => item.id),
                movements: movements,
                manualMovements: await db.manualMovements.toArray(),
                auditLog: await db.auditLog.toArray(),
            };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `alquima-mizu-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            setModal(null);
        },
        confirmText: 'Continuar',
        confirmClass: 'bg-brand-blue hover:bg-blue-600',
    });
  }, [movements, setModal]);

  const handleCsvImport = useCallback(async (updates: CsvUpdatePayload[]) => {
    if (!products) return;
    const updatedProducts: Product[] = [];
    const newMovements: Movement[] = [];

    await (db as Dexie).transaction('rw', db.products, db.movements, async () => {
        for (const update of updates) {
            const product = products.find(p => p.variants.some(v => v.id === update.variantId));
            if (!product) continue;

            let updatedProduct = { ...product };
            let hasChanged = false;

            updatedProduct.variants = updatedProduct.variants.map(v => {
                if (v.id === update.variantId) {
                    let newVariant = { ...v };
                    if (update.newPrice !== undefined) newVariant.price = update.newPrice;
                    if (update.newCost !== undefined) newVariant.cost = update.newCost;
                    if (update.newStock !== undefined && update.newStock !== v.stock) {
                        const change = update.newStock - v.stock;
                        newMovements.push({
                            id: `mov-${Date.now()}-${Math.random()}`,
                            variantId: v.id,
                            timestamp: Date.now(),
                            type: 'Ajuste',
                            change: change,
                            newStock: update.newStock,
                            notes: 'Actualización masiva desde CSV',
                        });
                        newVariant.stock = update.newStock;
                    }
                    hasChanged = true;
                    return newVariant;
                }
                return v;
            });

            if(hasChanged) updatedProducts.push(updatedProduct);
        }
        if (updatedProducts.length > 0) await db.products.bulkPut(updatedProducts);
        if (newMovements.length > 0) await db.movements.bulkAdd(newMovements);
    });

    setProducts(prev => {
        if (!prev) return null;
        const updatedProductsMap = new Map(updatedProducts.map(p => [p.id, p]));
        return prev.map(p => updatedProductsMap.get(p.id) || p);
    });
    setMovements(prev => {
        const newMovementsByVariant = newMovements.reduce((acc, mov) => {
            if (!acc[mov.variantId]) acc[mov.variantId] = [];
            acc[mov.variantId].push(mov);
            return acc;
        }, {} as Record<string, Movement[]>);

        const mergedMovements = { ...prev };
        for (const variantId in newMovementsByVariant) {
            mergedMovements[variantId] = [...(mergedMovements[variantId] || []), ...newMovementsByVariant[variantId]];
        }
        return mergedMovements;
    });
    await logAction('csv_update', `Se actualizaron ${updates.length} variantes desde un archivo CSV.`);
    setModal(null);
  }, [products, setProducts, setMovements, logAction, setModal]);

  const handleRepairDuplicateVariantIds = useCallback(async () => {
    if (!products) return;
    const variantIdCounts = new Map<string, number>();
    products.forEach(p => p.variants.forEach(v => variantIdCounts.set(v.id, (variantIdCounts.get(v.id) || 0) + 1)));
    
    const duplicateIds = Array.from(variantIdCounts.entries()).filter(([, count]) => count > 1).map(([id]) => id);
    if (duplicateIds.length === 0) {
        alert("No se encontraron IDs de variantes duplicados.");
        return;
    }

    let repairedCount = 0;
    const newProducts = products.map(p => {
        let hasChanged = false;
        const newVariants = p.variants.map(v => {
            if (duplicateIds.includes(v.id)) {
                const newId = `${v.id}-repaired-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                hasChanged = true;
                repairedCount++;
                
                const oldMovements = movements[v.id] || [];
                const newMovements = oldMovements.map(m => ({ ...m, variantId: newId }));
                db.movements.where('variantId').equals(v.id).delete();
                db.movements.bulkAdd(newMovements);
                setMovements(prev => {
                    const next = { ...prev };
                    delete next[v.id];
                    next[newId] = newMovements;
                    return next;
                });

                return { ...v, id: newId };
            }
            return v;
        });
        return hasChanged ? { ...p, variants: newVariants } : p;
    });

    await db.products.bulkPut(newProducts);
    setProducts(newProducts);
    await logAction('data_repair', `Se repararon ${repairedCount} IDs de variantes duplicados.`);
    alert(`Reparación completada. Se corrigieron ${repairedCount} IDs de variantes duplicados.`);
  }, [products, movements, setProducts, setMovements, logAction]);

  const handleProductMerge = useCallback(async (primaryProductId: string, secondaryProductId: string) => {
    setModal({
        type: 'confirm',
        title: 'Fusionar Productos',
        message: '¿Estás seguro? El producto secundario será ELIMINADO. Sus variantes, stock e historial se moverán al producto principal. Esta acción es irreversible.',
        onConfirm: async () => {
            const primaryProduct = products?.find(p => p.id === primaryProductId);
            const secondaryProduct = products?.find(p => p.id === secondaryProductId);
            if (!primaryProduct || !secondaryProduct) return;

            const mergedVariants = [...primaryProduct.variants, ...secondaryProduct.variants];
            const updatedPrimaryProduct = { ...primaryProduct, variants: mergedVariants };

            await (db as Dexie).transaction('rw', db.products, db.auditLog, async () => {
                await db.products.put(updatedPrimaryProduct);
                await db.products.delete(secondaryProductId);
            });
            
            setProducts(prev => prev?.filter(p => p.id !== secondaryProductId).map(p => p.id === primaryProductId ? updatedPrimaryProduct : p) || null);
            await logAction('product_merge', `Se fusionó "${secondaryProduct.title}" en "${primaryProduct.title}".`);
            setFusionMode(false);
            setSelectedForFusion([]);
            setModal(null);
        },
        confirmText: 'Sí, Fusionar',
        confirmClass: 'bg-brand-green hover:bg-green-600',
    });
  }, [products, setProducts, logAction, setModal, setFusionMode, setSelectedForFusion]);
  
  const handleImageClick = useCallback((images: string[]) => setFullscreenData({ images, index: 0 }), []);
  
  const changeFullscreenImage = useCallback((direction: 'next' | 'prev') => {
      setFullscreenData(prev => {
          if (!prev) return null;
          const { images, index } = prev;
          const newIndex = direction === 'next'
              ? (index + 1) % images.length
              : (index - 1 + images.length) % images.length;
          return { ...prev, index: newIndex };
      });
  }, []);
  
  const toggleFusionSelection = useCallback((productId: string) => {
    setSelectedForFusion(prev => {
        if (prev.includes(productId)) return prev.filter(id => id !== productId);
        if (prev.length < 2) return [...prev, productId];
        return prev;
    });
  }, []);
  
  const startFusion = useCallback(() => {
    if (selectedForFusion.length === 2 && products) {
        const productsToFuse = products.filter(p => selectedForFusion.includes(p.id));
        if (productsToFuse.length === 2) {
            setModal({ type: 'fusion', products: productsToFuse as [Product, Product] });
        }
    }
  }, [selectedForFusion, products, setModal]);
  
  const handleBulkEditSave = useCallback(async (changes: { category?: string; hintsToAdd?: string[] }) => {
    if (!products || selectedProductIds.size === 0) return;
    
    const productsToUpdate = products.filter(p => selectedProductIds.has(p.id)).map(p => {
        let newProduct = { ...p };
        if (changes.category) newProduct.category = changes.category;
        if (changes.hintsToAdd) {
            const newHints = new Set([...(newProduct.imageHint || []), ...changes.hintsToAdd]);
            newProduct.imageHint = Array.from(newHints);
        }
        return newProduct;
    });

    await db.products.bulkPut(productsToUpdate);
    setProducts(prev => {
        const updatedMap = new Map(productsToUpdate.map(p => [p.id, p]));
        return prev?.map(p => updatedMap.get(p.id) || p) || null;
    });
    await logAction('bulk_edit', `Se editaron ${selectedProductIds.size} productos en lote.`);
    setModal(null);
    setSelectedProductIds(new Set());
  }, [products, selectedProductIds, setProducts, logAction, setModal, setSelectedProductIds]);

  const handleBulkIgnore = useCallback(() => {
    setModal({
        type: 'confirm',
        title: 'Ocultar Productos',
        message: `¿Estás seguro de que quieres ocultar ${selectedProductIds.size} productos seleccionados?`,
        onConfirm: async () => {
            const newIgnoredIds = [...ignoredProductIds, ...Array.from(selectedProductIds)];
            await db.ignoredProductIds.bulkPut(Array.from(selectedProductIds).map(id => ({ id })));
            setIgnoredProductIds(newIgnoredIds);
            await logAction('bulk_ignore', `Se ocultaron ${selectedProductIds.size} productos en lote.`);
            setModal(null);
            setSelectedProductIds(new Set());
        },
        confirmText: 'Sí, Ocultar',
        confirmClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    });
  }, [selectedProductIds, ignoredProductIds, setIgnoredProductIds, logAction, setModal, setSelectedProductIds]);

  const handleBulkDelete = useCallback(() => {
    setModal({
        type: 'confirm',
        title: 'Eliminar Productos',
        message: `¿Estás seguro de que quieres eliminar ${selectedProductIds.size} productos? Esta acción es irreversible.`,
        onConfirm: async () => {
            const idsToDelete = Array.from(selectedProductIds);
            if (!products) return;

            const variantsToDelete = products.filter(p => idsToDelete.includes(p.id)).flatMap(p => p.variants.map(v => v.id));

            await (db as Dexie).transaction('rw', db.products, db.movements, async () => {
                await db.products.bulkDelete(idsToDelete);
                await db.movements.where('variantId').anyOf(variantsToDelete).delete();
            });

            setProducts(prev => prev?.filter(p => !idsToDelete.includes(p.id)) || null);
            setMovements(prev => {
                const newMovements = { ...prev };
                variantsToDelete.forEach(vid => delete newMovements[vid]);
                return newMovements;
            });

            await logAction('bulk_delete', `Se eliminaron ${selectedProductIds.size} productos en lote.`);
            setModal(null);
            setSelectedProductIds(new Set());
        },
        confirmText: 'Sí, Eliminar',
        confirmClass: 'bg-brand-red hover:bg-red-600',
    });
  }, [selectedProductIds, products, setProducts, setMovements, logAction, setModal, setSelectedProductIds]);
  
  const handleMultipleMovementsDelete = useCallback(async (variantId: string, movementIds: string[]) => {
      setModal({
        type: 'confirm',
        title: 'Eliminar Movimientos',
        message: `¿Estás seguro de que quieres eliminar ${movementIds.length} registro(s)? Esta acción recalculará el stock y es irreversible.`,
        onConfirm: async () => {
            await rawHandleMultipleMovementsDelete(variantId, movementIds);
            setModal(null);
        },
        confirmText: `Eliminar ${movementIds.length} registro(s)`,
      });
  }, [rawHandleMultipleMovementsDelete, setModal]);

  const value = useMemo(() => ({
    ...store, modal, setModal, fullscreenData, setFullscreenData, currentView, setCurrentView,
    fusionMode, setFusionMode, selectedForFusion, setSelectedForFusion, selectedProductIds,
    setSelectedProductIds, selectedTags, setSelectedTags, handleTextLoad, handleRestoreBackup, handleReset,
    updatePreference, handleIgnoredChange, handleProductDelete, handleSaveMovement,
    handleManualMovementSave, handleIgnoreProduct, handleRestoreProduct, handleCategorySave,
    handleBackupDownload, handleCsvImport, handleRepairDuplicateVariantIds, handleProductMerge,
    handleImageClick, toggleFusionSelection, startFusion, handleBulkEditSave,
    handleBulkIgnore, handleBulkDelete, changeFullscreenImage,
    handleMultipleMovementsDelete,
  }), [
    store, modal, fullscreenData, currentView, fusionMode, selectedForFusion, 
    selectedProductIds, selectedTags, handleTextLoad, handleRestoreBackup, handleReset, updatePreference, 
    handleIgnoredChange, handleProductDelete, handleSaveMovement, handleManualMovementSave, 
    handleIgnoreProduct, handleRestoreProduct, handleCategorySave, handleBackupDownload, 
    handleCsvImport, handleRepairDuplicateVariantIds, handleProductMerge, handleImageClick, 
    toggleFusionSelection, startFusion, handleBulkEditSave, handleBulkIgnore, 
    handleBulkDelete, changeFullscreenImage, handleMultipleMovementsDelete
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};