import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, UserPreferences, Movements, ManualMovement, Movement, AuditEntry } from '../types';
import { useDocument } from './useDocument';
import { getRootDocHandleSync, AppDoc } from '../lib/automerge-repo';
import { INITIAL_CATEGORIES, LOCAL_STORAGE_KEYS } from '../constants';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
}

// Helper para añadir un movimiento dentro de un bloque de cambio de Automerge.
// Esto evita la repetición de código y asegura consistencia.
const addMovementInChangeBlock = (doc: AppDoc, variantId: string, movementData: Omit<Movement, 'id' | 'variantId'>) => {
    const newMovement: Movement = { ...movementData, id: `mov-${Date.now()}-${Math.random()}`, variantId };
    if (!doc.movements[variantId]) {
        doc.movements[variantId] = [];
    }
    doc.movements[variantId].push(newMovement);
};

// --- Hook Central de Lógica de la Aplicación ---
export const useAppStore = () => {
    const doc = useDocument<AppDoc>();
    const handle = getRootDocHandleSync(); // Retrieve handle safely inside the hook

    // --- Capa de Adaptación: Materialización del Estado ---
    // Convierte los proxies de Automerge en objetos y arrays de JavaScript puros
    // para que React pueda trabajar con ellos de forma segura y eficiente.
    const products = useMemo(() => (doc && doc.products ? [...doc.products] : null), [doc]);
    const preferences = useMemo(() => (doc ? { ...doc.preferences } : { viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false }), [doc]);
    const ignoredProductIds = useMemo(() => (doc ? [...doc.ignoredProductIds] : []), [doc]);
    const allCategories = useMemo(() => (doc ? [...doc.allCategories] : []), [doc]);
    const movements = useMemo(() => (doc ? JSON.parse(JSON.stringify(doc.movements)) : {}), [doc]);
    const manualMovements = useMemo(() => (doc ? [...doc.manualMovements] : []), [doc]);
    const auditLog = useMemo(() => (doc ? [...doc.auditLog] : []), [doc]);
    
    // --- Acciones de Modificación de Estado ---
    // Cada función envuelve las modificaciones en `handle.change` para asegurar
    // que se apliquen de forma transaccional a Automerge.

    const logAction = useCallback((type: AuditEntry['type'], message: string) => {
        handle.change(d => {
            const newEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type, message };
            d.auditLog.unshift(newEntry);
        });
    }, [handle]);

    const handleProductSave = useCallback((productToSave: Product) => {
        handle.change(d => {
            const existingProductIndex = d.products.findIndex(p => p.id === productToSave.id);
            if (existingProductIndex > -1) { // Edición
                const existingProduct = d.products[existingProductIndex];
                const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'product_edit', message: `Producto editado: "${productToSave.title}" (ID: ${productToSave.id})` };
                d.auditLog.unshift(logEntry);

                productToSave.variants.forEach(variant => {
                    const existingVariant = existingProduct.variants.find(v => v.id === variant.id);
                    const currentStock = variant.stock || 0;
                    const oldStock = existingVariant?.stock || 0;

                    if (!existingVariant) {
                        addMovementInChangeBlock(d, variant.id, { timestamp: Date.now(), type: 'Inicial', change: currentStock, newStock: currentStock, notes: 'Variante nueva añadida' });
                    } else if (oldStock !== currentStock) {
                        const change = currentStock - oldStock;
                        if (change !== 0) {
                            addMovementInChangeBlock(d, variant.id, { timestamp: Date.now(), type: 'Ajuste', change, newStock: currentStock, notes: 'Ajuste desde formulario' });
                        }
                    }
                });
                d.products[existingProductIndex] = productToSave;
            } else { // Nuevo producto
                const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'product_add', message: `Producto añadido: "${productToSave.title}"` };
                d.auditLog.unshift(logEntry);
                
                productToSave.variants.forEach(variant => {
                    const stock = variant.stock || 0;
                    addMovementInChangeBlock(d, variant.id, { timestamp: Date.now(), type: 'Inicial', change: stock, newStock: stock, notes: 'Stock inicial' });
                });
                d.products.push(productToSave);
            }
        });
    }, [handle]);

    const handleMultipleMovementsDelete = useCallback((variantId: string, movementIdsToDelete: string[]) => {
        handle.change(d => {
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
                const variantIndex = p.variants.findIndex(v => v.id === variantId);
                if (variantIndex > -1) p.variants[variantIndex].stock = finalStock;
            });
            d.movements[variantId] = recalculatedMovements;
        });
    }, [handle]);
    
    const loadJsonData = useCallback((data: Product[]) => {
        handle.change(d => {
            d.products = data;
            const loadedCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
            const currentCategories = new Set(d.allCategories);
            const newCategories = loadedCategories.filter(c => !currentCategories.has(c));
            if(newCategories.length > 0) d.allCategories.push(...newCategories);
        });
    }, [handle]);
    
    const resetAllData = useCallback(() => {
        handle.change(d => {
            d.products = [];
            d.preferences = { viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false };
            d.ignoredProductIds = ['banner'];
            d.allCategories = INITIAL_CATEGORIES;
            d.movements = {};
            d.manualMovements = [];
            d.auditLog = [];
        });
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DATA_VERSION); // Clave no gestionada por el repo
    }, [handle]);

    const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
        handle.change(d => {
            d.preferences[key] = value;
        });
    }, [handle]);
    
    const deleteProduct = useCallback((productId: string) => {
        handle.change(d => {
            const productToDelete = d.products.find(p => p.id === productId);
            if (productToDelete) {
                 const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'product_delete', message: `Producto eliminado: "${productToDelete.title}"` };
                 d.auditLog.unshift(logEntry);
            }
            d.products = d.products.filter(p => p.id !== productId);
        });
    }, [handle]);

    const saveMovement = useCallback((productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => {
        handle.change(d => {
            const product = d.products.find(p => p.id === productId);
            if (!product) return;
            const variant = product.variants.find(v => v.id === variantId);
            if (!variant) return;
            
            const newStockValue = Math.max(0, variant.stock + movementData.change);
            variant.stock = newStockValue;
            addMovementInChangeBlock(d, variantId, { ...movementData, newStock: newStockValue });
        });
    }, [handle]);

    const saveManualMovement = useCallback((movement: Omit<ManualMovement, 'id'>) => {
        handle.change(d => {
            d.manualMovements.push({ ...movement, id: `manual-${Date.now()}-${Math.random()}` });
        });
    }, [handle]);
    
    const ignoreProduct = useCallback((productId: string, productTitle: string) => {
        handle.change(d => {
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'product_ignore', message: `Producto ocultado: "${productTitle}"` };
            d.auditLog.unshift(logEntry);
            if (!d.ignoredProductIds.includes(productId)) d.ignoredProductIds.push(productId);
        });
    }, [handle]);
    
    const restoreProduct = useCallback((productId: string, productTitle: string) => {
        handle.change(d => {
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'product_restore', message: `Producto restaurado: "${productTitle}"` };
            d.auditLog.unshift(logEntry);
            d.ignoredProductIds = d.ignoredProductIds.filter(id => id !== productId);
        });
    }, [handle]);
    
    const saveCategory = useCallback((newCategory: string) => {
        const formatted = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
        handle.change(d => {
            if (formatted && !d.allCategories.includes(formatted)) {
                const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'category_add', message: `Categoría añadida: "${formatted}"` };
                d.auditLog.unshift(logEntry);
                d.allCategories.push(formatted);
            }
        });
    }, [handle]);
    
    const importCsvUpdates = useCallback((updates: { variantId: string; newPrice?: number; newCost?: number; newStock?: number; }[]) => {
        handle.change(d => {
            const updatesMap = new Map(updates.map(u => [u.variantId, u]));
            d.products.forEach(p => {
                p.variants.forEach(v => {
                    if (updatesMap.has(v.id)) {
                        const update = updatesMap.get(v.id)!;
                        const originalStock = v.stock;
                        if (update.newStock !== undefined && update.newStock !== originalStock) {
                            const change = update.newStock - originalStock;
                            addMovementInChangeBlock(d, v.id, { timestamp: Date.now(), type: 'Ajuste', change, newStock: update.newStock, notes: 'Actualización masiva desde CSV' });
                        }
                        if (update.newPrice !== undefined) v.price = update.newPrice;
                        if (update.newCost !== undefined) v.cost = update.newCost;
                        if (update.newStock !== undefined) v.stock = update.newStock;
                    }
                });
            });
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'csv_update', message: `Actualizadas ${updates.length} variantes mediante CSV.` };
            d.auditLog.unshift(logEntry);
        });
    }, [handle]);
    
    const repairDuplicateVariantIds = useCallback(() => {
        if (!doc) return { repairedCount: 0, duplicateIds: []};
        
        const variantIdCounts = new Map<string, number>();
        doc.products.forEach(p => p.variants.forEach(v => variantIdCounts.set(v.id, (variantIdCounts.get(v.id) || 0) + 1)));
        const duplicateIds = [...variantIdCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);

        if (duplicateIds.length === 0) return { repairedCount: 0, duplicateIds: []};

        let variantsRepairedCount = 0;
        handle.change(d => {
            duplicateIds.forEach(dupId => {
                const productsWithDupIndices = d.products.map((p, index) => p.variants.some(v => v.id === dupId) ? index : -1).filter(index => index !== -1);
                
                productsWithDupIndices.slice(1).forEach(productIndex => {
                    const productToFix = d.products[productIndex];
                    const variantToFixIndex = productToFix.variants.findIndex(v => v.id === dupId);
                    if (variantToFixIndex > -1) {
                        const variantToFix = productToFix.variants[variantToFixIndex];
                        const newId = `repaired-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        
                        addMovementInChangeBlock(d, newId, { timestamp: Date.now(), type: 'Inicial', change: variantToFix.stock, newStock: variantToFix.stock, notes: 'ID de variante reparado. Historial reiniciado.' });

                        variantToFix.id = newId;
                        variantsRepairedCount++;
                    }
                });
            });
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'data_repair', message: `Reparación automática ejecutada. Se corrigieron ${variantsRepairedCount} variantes.` };
            d.auditLog.unshift(logEntry);
        });
        return { repairedCount: variantsRepairedCount, duplicateIds };
    }, [doc, handle]);

    const mergeProducts = useCallback((primaryProductId: string, secondaryProductId: string) => {
        handle.change(d => {
            const primaryProduct = d.products.find(p => p.id === primaryProductId);
            const secondaryProduct = d.products.find(p => p.id === secondaryProductId);
            if (!primaryProduct || !secondaryProduct) return;

            const mergedVariants = [...primaryProduct.variants, ...secondaryProduct.variants];
            const variantNameCounts = new Map<string, number>();
            mergedVariants.forEach(v => variantNameCounts.set(v.name, (variantNameCounts.get(v.name) || 0) + 1));
            
            primaryProduct.variants = mergedVariants.map(v => {
              if ((variantNameCounts.get(v.name) || 0) > 1) {
                const sourceProductTitle = secondaryProduct.variants.some(sv => sv.id === v.id) ? secondaryProduct.title.split(' ')[0] : primaryProduct.title.split(' ')[0];
                return { ...v, name: `${v.name} (${sourceProductTitle})` };
              }
              return v;
            });
            
            d.products = d.products.filter(p => p.id !== secondaryProductId);
            
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'product_merge', message: `Productos fusionados: "${secondaryProduct.title}" en "${primaryProduct.title}".` };
            d.auditLog.unshift(logEntry);
        });
    }, [handle]);

    const bulkEditProducts = useCallback((selectedIds: Set<string>, changes: { category?: string; hintsToAdd?: string[] }) => {
        handle.change(d => {
            d.products.forEach(p => {
                if (selectedIds.has(p.id)) {
                    if (changes.category) p.category = changes.category;
                    if (changes.hintsToAdd?.length) {
                        const currentHints = new Set(p.imageHint || []);
                        changes.hintsToAdd.forEach(h => currentHints.add(h));
                        p.imageHint = Array.from(currentHints);
                    }
                }
            });
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'bulk_edit', message: `Edición masiva aplicada a ${selectedIds.size} productos.` };
            d.auditLog.unshift(logEntry);
        });
    }, [handle]);
    
    const bulkIgnoreProducts = useCallback((selectedIds: Set<string>) => {
        handle.change(d => {
            selectedIds.forEach(id => { if (!d.ignoredProductIds.includes(id)) d.ignoredProductIds.push(id); });
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'bulk_ignore', message: `Ocultados ${selectedIds.size} productos en lote.` };
            d.auditLog.unshift(logEntry);
        });
    }, [handle]);
    
    const bulkDeleteProducts = useCallback((selectedIds: Set<string>) => {
        handle.change(d => {
            d.products = d.products.filter(p => !selectedIds.has(p.id));
            const logEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type: 'bulk_delete', message: `Eliminados ${selectedIds.size} productos en lote.` };
            d.auditLog.unshift(logEntry);
        });
    }, [handle]);

    return {
        products, preferences, ignoredProductIds, allCategories, movements, manualMovements, auditLog,
        logAction, handleProductSave, handleMultipleMovementsDelete, loadJsonData, resetAllData,
        updatePreference, deleteProduct, saveMovement, saveManualMovement, ignoreProduct, restoreProduct,
        saveCategory, importCsvUpdates, repairDuplicateVariantIds, mergeProducts, bulkEditProducts,
        bulkIgnoreProducts, bulkDeleteProducts,
    };
};


// --- Hook de Cálculo Financiero ---
export const useFinancialSummary = (
    movements: Movements,
    manualMovements: ManualMovement[],
    products: Product[] | null,
    dateRange: string,
    customStart: string,
    customEnd: string
) => {
    const variantMap = useMemo(() => {
        const map = new Map<string, { product: Product, variant: Product['variants'][0] }>();
        if (!products) return map;
        products.forEach(p => p.variants.forEach(v => map.set(v.id, { product: p, variant: v })));
        return map;
    }, [products]);

    return useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        switch(dateRange) {
            case 'thisMonth': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'last30Days': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case 'custom':
                 startDate = customStart ? new Date(customStart) : new Date(0);
                 endDate = customEnd ? new Date(customEnd) : new Date();
                 if(customEnd) endDate.setHours(23, 59, 59, 999);
                break;
        }

        const allMovements = [...Object.values(movements).flat(), ...manualMovements];
        const filteredMovements = allMovements
            .filter(m => new Date(m.timestamp) >= startDate && new Date(m.timestamp) <= endDate)
            .sort((a, b) => b.timestamp - a.timestamp);

        let totalRevenue = 0, totalCost = 0, totalExpenses = 0, itemsSold = 0;
        const categorySales: Record<string, number> = {};
        const productProfit: Record<string, { profit: number; items: number; title: string }> = {};

        filteredMovements.forEach((m: Movement | ManualMovement) => {
            if ('variantId' in m && m.type === 'Venta') { // Sale
                const revenue = (m.price || 0) * Math.abs(m.change);
                const cost = (m.cost || 0) * Math.abs(m.change);
                totalRevenue += revenue;
                totalCost += cost;
                itemsSold += Math.abs(m.change);
                const variantInfo = variantMap.get(m.variantId);
                if (variantInfo) {
                    const { category, id, title } = variantInfo.product;
                    categorySales[category] = (categorySales[category] || 0) + revenue;
                    productProfit[id] = productProfit[id] || { profit: 0, items: 0, title };
                    productProfit[id].profit += revenue - cost;
                    productProfit[id].items += Math.abs(m.change);
                }
            } else if (!('variantId' in m)) { // Manual
                m.type === 'Otro Ingreso' ? (totalRevenue += m.amount) : (totalExpenses += m.amount);
            }
        });
        
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalExpenses;
        const topProducts = Object.values(productProfit).sort((a,b) => b.profit - a.profit).slice(0, 5);
        const sortedCategorySales = Object.entries(categorySales).sort((a,b) => b[1] - a[1]);
        
        const enrichedDetailedMovements = filteredMovements.map((m: Movement | ManualMovement) => {
            if ('variantId' in m) { // It's a Movement
                const variantInfo = variantMap.get(m.variantId);
                return {
                    ...m,
                    productTitle: variantInfo?.product.title || 'Producto Desconocido',
                    variantName: variantInfo?.variant.name || 'Variante Desconocida',
                };
            }
            return m; // It's a ManualMovement
        });

        return {
            totalRevenue, totalCost, grossProfit, netProfit, itemsSold, topProducts, sortedCategorySales, 
            maxCategorySale: sortedCategorySales[0]?.[1] || 0,
            detailedMovements: enrichedDetailedMovements,
        };
    }, [dateRange, customStart, customEnd, movements, manualMovements, variantMap]);
};