import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LOCAL_STORAGE_KEYS, DATA_VERSION, INITIAL_CATEGORIES } from '../constants';
import { Product, UserPreferences, Movements, ManualMovement, Movement, AuditEntry } from '../types';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      let value = item ? JSON.parse(item) : initialValue;

      // One-time data migrations, only for PRODUCTS key
      if (key === LOCAL_STORAGE_KEYS.PRODUCTS && Array.isArray(value) && value.length > 0) {
          const currentVersion = parseInt(window.localStorage.getItem(LOCAL_STORAGE_KEYS.DATA_VERSION) || '0', 10);
          let dataUpdated = false;

          if (currentVersion < 1 && value[0].hasOwnProperty('available')) {
              dataUpdated = true;
              value = value.map((p: any) => {
                  const { available, ...rest } = p;
                  return { ...rest, stock: available ? 1 : 0 };
              });
          }
          
          if (currentVersion < 2 && value[0].hasOwnProperty('stock') && !value[0].hasOwnProperty('variants')) {
              dataUpdated = true;
              value = value.map((p: any) => {
                  const { stock, price, sku, ...rest } = p;
                  return {
                      ...rest,
                      variants: [{ id: `${p.id}-default`, name: 'Único', stock: stock ?? 0, price: price ?? '', sku: sku ?? '' }],
                  };
              });
          }
          
          if (currentVersion < 3 && value.some((p: Product) => p.variants.some(v => typeof v.price === 'string'))) {
              dataUpdated = true;
              value = value.map((p: any) => ({
                  ...p,
                  variants: p.variants.map((v: any) => {
                      if (typeof v.price === 'string') {
                          const numericString = v.price.replace(/[^\d]/g, '');
                          return { ...v, price: numericString ? parseInt(numericString, 10) : 0 };
                      }
                      return { ...v, price: typeof v.price === 'number' ? v.price : 0 };
                  }),
              }));
          }
          
          if (currentVersion < 4 && value.some((p: any) => p.hasOwnProperty('priceUnit') || p.variants.some((v: any) => !v.hasOwnProperty('itemCount')))) {
              dataUpdated = true;
              value = value.map((p: any) => {
                  const { priceUnit, ...rest } = p;
                  return {
                      ...rest,
                      variants: rest.variants.map((v: any) => ({
                          ...v,
                          itemCount: v.itemCount || 1,
                          name: v.name === 'Único' ? 'Unidad' : v.name,
                      })),
                  };
              });
          }

          // Migration for imageHint (version 5). It also acts as a data repair step if it detects bad data.
          const needsImageHintRepair = currentVersion < 5 || value.some((p: any) => p?.imageHint != null && !Array.isArray(p.imageHint));

          if (needsImageHintRepair) {
              let migrationPerformed = false;
              const migratedValue = value.map((p: any) => {
                  if (!p || typeof p !== 'object' || (p.imageHint == null || Array.isArray(p.imageHint))) {
                    return p; // Already valid (null, undefined, or array) or cannot be processed.
                  }

                  // If we are here, a migration is needed for this product because imageHint is not an array.
                  migrationPerformed = true;
                  const newProduct = { ...p };
                  const imageHint = p.imageHint;

                  if (typeof imageHint === 'string') {
                      newProduct.imageHint = imageHint.split(',').map((h: string) => h.trim()).filter(Boolean);
                  } else if (imageHint) { // Handles any other truthy, non-array value (number, object, boolean)
                      newProduct.imageHint = [String(imageHint)];
                  } else { // Handles falsy values that are not null/undefined (e.g., 0, "", false)
                      newProduct.imageHint = [];
                  }
                  return newProduct;
              });

              if (migrationPerformed) {
                  dataUpdated = true;
                  value = migratedValue;
              }
          }

          if (dataUpdated) {
              window.localStorage.setItem(LOCAL_STORAGE_KEYS.DATA_VERSION, String(DATA_VERSION));
          }
      }
      
      return value;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore =
        typeof storedValue === 'function'
          ? (storedValue as (prevState: T) => T)(storedValue)
          : storedValue;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- Centralized Application Logic Hook ---
export const useAppStore = () => {
    const [products, setProducts] = useLocalStorage<Product[] | null>(LOCAL_STORAGE_KEYS.PRODUCTS, null);
    const [preferences, setPreferences] = useLocalStorage<UserPreferences>(LOCAL_STORAGE_KEYS.PREFERENCES, {
        viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false,
    });
    const [ignoredProductIds, setIgnoredProductIds] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.IGNORED_PRODUCTS, ['banner']);
    const [allCategories, setAllCategories] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const [movements, setMovements] = useLocalStorage<Movements>(LOCAL_STORAGE_KEYS.MOVEMENTS, {});
    const [manualMovements, setManualMovements] = useLocalStorage<ManualMovement[]>(LOCAL_STORAGE_KEYS.MANUAL_MOVEMENTS, []);
    const [auditLog, setAuditLog] = useLocalStorage<AuditEntry[]>(LOCAL_STORAGE_KEYS.AUDIT_LOG, []);

    const logAction = useCallback((type: AuditEntry['type'], message: string) => {
      const newEntry: AuditEntry = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        type,
        message,
      };
      setAuditLog(prev => [newEntry, ...prev]);
    }, [setAuditLog]);

    const addMovement = useCallback((variantId: string, movementData: Omit<Movement, 'id' | 'variantId'>) => {
        setMovements(prev => {
            const newMovement: Movement = { ...movementData, id: `mov-${Date.now()}-${Math.random()}`, variantId };
            return { ...prev, [variantId]: [...(prev[variantId] || []), newMovement] };
        });
    }, [setMovements]);

    const handleProductSave = useCallback((productToSave: Product) => {
        setProducts(prevProducts => {
            const existingProduct = prevProducts?.find(p => p.id === productToSave.id);
            if (existingProduct) { // Editing
                logAction('product_edit', `Producto editado: "${productToSave.title}" (ID: ${productToSave.id})`);
                productToSave.variants.forEach(variant => {
                    const existingVariant = existingProduct.variants.find(v => v.id === variant.id);
                    const currentStock = variant.stock || 0;
                    const oldStock = existingVariant?.stock || 0;

                    if (!existingVariant) {
                        addMovement(variant.id, { timestamp: Date.now(), type: 'Inicial', change: currentStock, newStock: currentStock, notes: 'Variante nueva añadida' });
                    } else if (oldStock !== currentStock) {
                        const change = currentStock - oldStock;
                        if (change !== 0) {
                            addMovement(variant.id, { timestamp: Date.now(), type: 'Ajuste', change, newStock: currentStock, notes: 'Ajuste desde formulario' });
                        }
                    }
                });
                return prevProducts?.map(p => p.id === productToSave.id ? productToSave : p) || [];
            } else { // New product
                logAction('product_add', `Producto añadido: "${productToSave.title}"`);
                productToSave.variants.forEach(variant => {
                    const stock = variant.stock || 0;
                    addMovement(variant.id, { timestamp: Date.now(), type: 'Inicial', change: stock, newStock: stock, notes: 'Stock inicial' });
                });
                return [...(prevProducts || []), productToSave];
            }
        });
    }, [setProducts, addMovement, logAction]);

    const handleMultipleMovementsDelete = useCallback((variantId: string, movementIdsToDelete: string[]) => {
        const originalMovements = movements[variantId] || [];
        const remainingMovements = originalMovements.filter(m => !movementIdsToDelete.includes(m.id));
        
        let currentStock = 0;
        const recalculatedMovements = remainingMovements.sort((a, b) => a.timestamp - b.timestamp).map(m => {
            currentStock = m.type === 'Inicial' ? m.change : currentStock + m.change;
            currentStock = Math.max(0, currentStock); // Ensure stock doesn't go negative
            return { ...m, newStock: currentStock };
        });

        const finalStock = recalculatedMovements.length > 0 
            ? recalculatedMovements[recalculatedMovements.length - 1].newStock 
            : 0;

        setProducts(prev => prev?.map(p => ({
            ...p,
            variants: p.variants.map(v => v.id === variantId ? { ...v, stock: finalStock } : v)
        })) || null);

        setMovements(prev => ({
            ...prev,
            [variantId]: recalculatedMovements
        }));
    }, [movements, setMovements, setProducts]);
    
    return {
        products, setProducts,
        preferences, setPreferences,
        ignoredProductIds, setIgnoredProductIds,
        allCategories, setAllCategories,
        movements, setMovements,
        manualMovements, setManualMovements,
        auditLog, setAuditLog,
        logAction, addMovement, handleProductSave, handleMultipleMovementsDelete,
    };
};


// --- Financial Calculation Hook ---
export const useFinancialSummary = (
    movements: Movements,
    manualMovements: ManualMovement[],
    products: Product[],
    dateRange: string,
    customStart: string,
    customEnd: string
) => {
    const variantMap = useMemo(() => {
        const map = new Map<string, { product: Product, variant: Product['variants'][0] }>();
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