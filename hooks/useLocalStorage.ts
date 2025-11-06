// FIX: Import React to resolve namespace errors for React types.
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useRepo, useDocument, DocHandle } from '@automerge/automerge-repo-react';
// FIX: Import DocumentId type for casting, as repo.delete() requires a branded string type, not a plain string.
import type { DocumentId } from '@automerge/automerge-repo';
import { LOCAL_STORAGE_KEYS, INITIAL_CATEGORIES } from '../constants';
import { Product, UserPreferences, Movements, ManualMovement, Movement, AuditEntry, AppDoc, CsvUpdatePayload, Variant } from '../types';
import { resetRepository } from '../lib/automerge-repo';
import { repo } from '../lib/automerge-repo';

const DOC_URL_KEY = 'alkima-mizu-doc-url';

const initialPreferences: UserPreferences = {
  viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false,
};

// This function attempts to read and parse data from localStorage.
const getStoredData = <T,>(key: string, fallback: T): T => {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
};

// FIX: Re-add the generic useLocalStorage hook for persisting non-synced UI state.
export function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}”:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

// NEW: Hook to manage the document URL for P2P sharing.
export const useDocUrl = () => {
    const [docUrl, setDocUrl] = useState<string | undefined>(() => localStorage.getItem(DOC_URL_KEY) || undefined);

    const setAndStoreDocUrl = useCallback((url: string) => {
        localStorage.setItem(DOC_URL_KEY, url);
        setDocUrl(url);
    }, []);

    const createNewDoc = useCallback(() => {
        const handle: DocHandle<AppDoc> = repo.create<AppDoc>();
        setAndStoreDocUrl(handle.url);
        return handle.url;
    }, [repo, setAndStoreDocUrl]);

    const clearDocUrl = useCallback(() => {
        localStorage.removeItem(DOC_URL_KEY);
        setDocUrl(undefined);
    }, []);

    return { docUrl, setDocUrl: setAndStoreDocUrl, createNewDoc, clearDocUrl };
};

// --- Centralized Application Logic Hook ---
export const useAppStore = (docUrl: string | undefined) => {
    const [doc, changeDoc] = useDocument<AppDoc>(docUrl);
    const [isReady, setIsReady] = useState(false); // NEW: Local state to signal readiness

    // This effect handles the one-time initialization of the Automerge document.
    // It now uses a local `isReady` state to signal when the app can safely render.
    useEffect(() => {
        if (!doc) {
            // Still waiting for the document to be loaded from the repo.
            return;
        }

        if (doc.initialized) {
            // Document is already initialized and ready.
            setIsReady(true);
            return;
        }
        
        // Document exists but is not initialized, so we perform the setup.
        // This block will only run once per document lifetime, protected by the `initialized` flag.
        changeDoc(d => {
            // Double-check inside the change function to prevent race conditions
            // from other tabs or rapid re-renders.
            if (d.initialized) return; 

            console.log("Uninitialized document detected, performing first-time setup...");
            const oldProducts = getStoredData<Product[] | null>(LOCAL_STORAGE_KEYS.PRODUCTS, null);
            if (oldProducts) {
                console.log("Migrating data from localStorage to Automerge...");
                d.products = oldProducts;
                d.preferences = getStoredData<UserPreferences>(LOCAL_STORAGE_KEYS.PREFERENCES, initialPreferences);
                d.ignoredProductIds = getStoredData<string[]>(LOCAL_STORAGE_KEYS.IGNORED_PRODUCTS, ['banner']);
                d.allCategories = getStoredData<string[]>(LOCAL_STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
                d.movements = getStoredData<Movements>(LOCAL_STORAGE_KEYS.MOVEMENTS, {});
                d.manualMovements = getStoredData<ManualMovement[]>(LOCAL_STORAGE_KEYS.MANUAL_MOVEMENTS, []);
                d.auditLog = getStoredData<AuditEntry[]>(LOCAL_STORAGE_KEYS.AUDIT_LOG, []);
            } else {
                console.log("No localStorage data found, creating a fresh document.");
                d.products = null; // Set to null to trigger the initial JsonLoader screen.
                d.preferences = initialPreferences;
                d.ignoredProductIds = ['banner'];
                d.allCategories = INITIAL_CATEGORIES;
                d.movements = {};
                d.manualMovements = [];
                d.auditLog = [];
            }
            // Set the flag to indicate initialization is complete.
            d.initialized = true;
        });
        
        // Note: After this change is applied, the `doc` will update, this effect will re-run,
        // and the `doc.initialized` check at the top will pass, setting `isReady = true`.
    }, [doc, changeDoc]);
    
    // --- State Derivation (Defensive Programming) ---
    const products = useMemo(() => {
        if (!isReady) return undefined; // Still loading, App will show a loader
        if (doc?.products === null) return null; // This is a valid state for showing the JsonLoader

        // If doc.products is not an array, it's corrupt. Trigger JsonLoader.
        if (!Array.isArray(doc?.products)) {
            console.warn("Data corruption: doc.products is not an array. Resetting to null.");
            return null;
        }
        
        // Exhaustive Sanitization: "Trust Nothing" approach.
        // This ensures the app never crashes due to malformed data from Automerge.
        return doc.products
          .map((p, index) => {
            // 1. Ensure product is a valid object
            if (typeof p !== 'object' || p === null) {
                console.warn(`Data corruption: Product at index ${index} is not an object. Skipping.`);
                return null;
            }

            // 2. Sanitize every property of the product
            const sanitizedProduct: Product = {
                id: typeof p.id === 'string' && p.id ? p.id : `corrupt-id-${Date.now()}-${index}`,
                title: typeof p.title === 'string' ? p.title : 'Producto Sin Título',
                category: typeof p.category === 'string' ? p.category : 'sin-categoria',
                description: typeof p.description === 'string' ? p.description : '',
                details: typeof p.details === 'string' ? p.details : '',
                imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls.filter(u => typeof u === 'string') : [],
                imageHint: Array.isArray(p.imageHint) ? p.imageHint.filter(h => typeof h === 'string') : [],
                variants: [], // Will be populated next
            };
            
            if (typeof p.id !== 'string' || !p.id) {
                console.warn(`Data corruption: Product at index ${index} has an invalid ID. Assigned a temporary one.`, p);
            }

            // 3. Sanitize every variant within the product
            if (Array.isArray(p.variants)) {
                sanitizedProduct.variants = p.variants
                  .map((v, vIndex) => {
                    if (typeof v !== 'object' || v === null) {
                        console.warn(`Data corruption: Variant at index ${vIndex} for product "${sanitizedProduct.title}" is not an object. Skipping.`);
                        return null;
                    }
                    
                    const numStock = Number(v.stock);
                    const numPrice = Number(v.price);
                    const numCost = Number(v.cost);
                    const numItemCount = Number(v.itemCount);

                    const sanitizedVariant: Variant = {
                        id: typeof v.id === 'string' && v.id ? v.id : `corrupt-variant-${Date.now()}-${vIndex}`,
                        name: typeof v.name === 'string' ? v.name : 'Variante Sin Nombre',
                        sku: typeof v.sku === 'string' ? v.sku : undefined,
                        price: !isNaN(numPrice) ? numPrice : 0,
                        cost: !isNaN(numCost) ? numCost : 0,
                        stock: !isNaN(numStock) ? numStock : 0,
                        itemCount: !isNaN(numItemCount) && numItemCount > 0 ? numItemCount : 1,
                    };

                    if (typeof v.id !== 'string' || !v.id) {
                        console.warn(`Data corruption: Variant for product "${sanitizedProduct.title}" has an invalid ID. Assigned a temporary one.`, v);
                    }
                    
                    return sanitizedVariant;
                  })
                  .filter((v): v is Variant => v !== null); // Filter out any null (malformed) variants.
            } else {
                // If variants is not an array at all, default to an empty one.
                console.warn(`Data corruption: variants for product "${sanitizedProduct.title}" is not an array. Defaulting to empty.`);
                sanitizedProduct.variants = [];
            }

            return sanitizedProduct;
          })
          .filter((p): p is Product => p !== null); // Filter out any null (malformed) products.

    }, [isReady, doc?.products]);

    const preferences = useMemo(() => (doc?.preferences && typeof doc.preferences === 'object' && !Array.isArray(doc.preferences)) ? doc.preferences : initialPreferences, [doc?.preferences]);
    
    const ignoredProductIds = useMemo(() => Array.isArray(doc?.ignoredProductIds) ? doc.ignoredProductIds : ['banner'], [doc?.ignoredProductIds]);
    
    const allCategories = useMemo(() => Array.isArray(doc?.allCategories) ? doc.allCategories : INITIAL_CATEGORIES, [doc?.allCategories]);
    
    const movements = useMemo(() => (doc?.movements && typeof doc.movements === 'object' && !Array.isArray(doc.movements)) ? doc.movements : {}, [doc?.movements]);
    
    const manualMovements = useMemo(() => Array.isArray(doc?.manualMovements) ? doc.manualMovements : [], [doc?.manualMovements]);
    
    const auditLog = useMemo(() => Array.isArray(doc?.auditLog) ? doc.auditLog : [], [doc?.auditLog]);
    

    // --- Actions ---

    const logAction = useCallback((type: AuditEntry['type'], message: string) => {
      changeDoc(d => {
        if (!Array.isArray(d.auditLog)) d.auditLog = [];
        const newEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type, message };
        d.auditLog.unshift(newEntry);
      });
    }, [changeDoc]);

    const addMovement = useCallback((variantId: string, movementData: Omit<Movement, 'id' | 'variantId'>) => {
        changeDoc(d => {
            if (!d.movements || typeof d.movements !== 'object' || Array.isArray(d.movements)) d.movements = {};
            const newMovement: Movement = { ...movementData, id: `mov-${Date.now()}-${Math.random()}`, variantId };
            if (!Array.isArray(d.movements[variantId])) d.movements[variantId] = [];
            d.movements[variantId].push(newMovement);
        });
    }, [changeDoc]);
    
    const handleProductSave = useCallback((productToSave: Product) => {
        changeDoc(d => {
            if (!Array.isArray(d.products)) d.products = [];
            const existingProduct = d.products.find(p => p.id === productToSave.id);
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
                const productIndex = d.products.findIndex(p => p.id === productToSave.id);
                if (productIndex > -1) d.products[productIndex] = productToSave;
            } else { // New product
                logAction('product_add', `Producto añadido: "${productToSave.title}"`);
                productToSave.variants.forEach(variant => {
                    const stock = variant.stock || 0;
                    addMovement(variant.id, { timestamp: Date.now(), type: 'Inicial', change: stock, newStock: stock, notes: 'Stock inicial' });
                });
                d.products.push(productToSave);
            }
        });
    }, [changeDoc, logAction, addMovement]);
    
    const handleReset = useCallback(async () => {
        if (window.confirm('ADVERTENCIA: ¿Estás seguro de que quieres borrar PERMANENTEMENTE todos los datos de este catálogo en este dispositivo? Esta acción es irreversible y no se puede deshacer.')) {
            try {
                // Remove the doc from the current repo instance in memory
                if (docUrl) {
                    // FIX: The correct method to delete a document from the repo is `delete`, not `remove`.
                    // FIX: Cast docUrl to DocumentId as required by the repo.delete method to fix type error.
                    repo.delete(docUrl as DocumentId);
                }
                // Wipe all persisted Automerge data from IndexedDB
                await resetRepository();

                // Clear any other related localStorage items
                localStorage.removeItem(DOC_URL_KEY);
                Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

                // Reload the page to start with a fresh state
                alert("Los datos han sido borrados. La aplicación se reiniciará.");
                window.location.reload();
            } catch (error: any) {
                alert(`Error al borrar los datos: ${error.message}. Por favor, cierra otras pestañas de esta aplicación y vuelve a intentarlo.`);
            }
        }
    }, [docUrl]);
    
    const handleJsonLoad = useCallback((loadedProducts: Product[]) => {
        changeDoc(d => {
            d.products = loadedProducts;
            const loadedCategories = [...new Set(loadedProducts.map(p => p.category).filter(Boolean))];
            if (!Array.isArray(d.allCategories)) d.allCategories = INITIAL_CATEGORIES;
            const currentCategories = new Set(d.allCategories);
            const newCategories = loadedCategories.filter(c => !currentCategories.has(c));
            if (newCategories.length > 0) {
                d.allCategories.push(...newCategories);
            }
        });
    }, [changeDoc]);

    const handleRestore = useCallback((backupData: any) => {
        const requiredKeys = ['products', 'preferences', 'ignoredProductIds', 'categories', 'movements'];
        const missingKeys = requiredKeys.filter(key => !(key in backupData));

        if (missingKeys.length > 0) {
          alert(`El archivo de respaldo es inválido. Faltan las claves: ${missingKeys.join(', ')}`);
          return;
        }

        changeDoc(d => {
            d.products = backupData.products || [];
            d.preferences = backupData.preferences || initialPreferences;
            d.ignoredProductIds = backupData.ignoredProductIds || ['banner'];
            d.allCategories = backupData.categories || INITIAL_CATEGORIES;
            d.movements = backupData.movements || {};
            d.manualMovements = backupData.manualMovements || [];
            d.auditLog = backupData.auditLog || [];
            d.initialized = true; // Ensure restored data is marked as initialized
        });
        alert('¡Restauración completada con éxito!');
    }, [changeDoc]);
    
    const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      changeDoc(d => {
        if (!d.preferences || typeof d.preferences !== 'object' || Array.isArray(d.preferences)) d.preferences = initialPreferences;
        d.preferences[key] = value;
      });
    }, [changeDoc]);
    
    const handleProductDelete = useCallback((productId: string) => {
        changeDoc(d => {
            if (!Array.isArray(d.products)) return;
            const productToDelete = d.products.find(p => p.id === productId);
            if (productToDelete) logAction('product_delete', `Producto eliminado: "${productToDelete.title}"`);
            d.products = d.products.filter(p => p.id !== productId);
        });
    }, [changeDoc, logAction]);
    
    const handleSaveMovement = useCallback((productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => {
        changeDoc(d => {
            if (!Array.isArray(d.products)) return;
            const productIndex = d.products.findIndex(p => p.id === productId);
            if (productIndex === -1) return;
            const variantIndex = d.products[productIndex].variants.findIndex(v => v.id === variantId);
            if (variantIndex === -1) return;

            const variant = d.products[productIndex].variants[variantIndex];
            const newStockValue = Math.max(0, variant.stock + movementData.change);
            
            d.products[productIndex].variants[variantIndex].stock = newStockValue;

            addMovement(variantId, { ...movementData, newStock: newStockValue });
        });
    }, [changeDoc, addMovement]);
    
     const handleManualMovementSave = useCallback((movement: Omit<ManualMovement, 'id'>) => {
        changeDoc(d => {
            if (!Array.isArray(d.manualMovements)) d.manualMovements = [];
            d.manualMovements.push({ ...movement, id: `manual-${Date.now()}-${Math.random()}` });
        });
    }, [changeDoc]);

    const handleIgnoreProduct = useCallback((productId: string) => {
        changeDoc(d => {
            if (!Array.isArray(d.products) || !Array.isArray(d.ignoredProductIds)) return;
            const productToIgnore = d.products.find(p => p.id === productId);
            if (productToIgnore) logAction('product_ignore', `Producto ocultado: "${productToIgnore.title}"`);
            if (!d.ignoredProductIds.includes(productId)) {
                d.ignoredProductIds.push(productId);
            }
        });
    }, [changeDoc, logAction]);
    
    const handleRestoreProduct = useCallback((productId: string, productTitle: string) => {
        changeDoc(d => {
            if (!Array.isArray(d.ignoredProductIds)) return;
            logAction('product_restore', `Producto restaurado: "${productTitle}"`);
            d.ignoredProductIds = d.ignoredProductIds.filter(id => id !== productId);
        });
    }, [changeDoc, logAction]);

    const handleCategorySave = useCallback((newCategory: string) => {
        changeDoc(d => {
            const formatted = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
            if (!Array.isArray(d.allCategories)) d.allCategories = INITIAL_CATEGORIES;
            if (formatted && !d.allCategories.includes(formatted)) {
                logAction('category_add', `Categoría añadida: "${formatted}"`);
                d.allCategories.push(formatted);
            }
        });
    }, [changeDoc, logAction]);
    
    const handleCsvImport = useCallback((updates: CsvUpdatePayload[]) => {
      changeDoc(d => {
        if (!Array.isArray(d.products)) return;
        const updatesMap = new Map<string, CsvUpdatePayload>(updates.map(u => [u.variantId, u]));
        
        d.products.forEach(p => {
          p.variants.forEach(v => {
            if (updatesMap.has(v.id)) {
              const update = updatesMap.get(v.id)!;
              const originalStock = v.stock;
              
              if (update.newStock !== undefined && update.newStock !== originalStock) {
                const change = update.newStock - originalStock;
                addMovement(v.id, { timestamp: Date.now(), type: 'Ajuste', change, newStock: update.newStock, notes: 'Actualización masiva desde CSV' });
                v.stock = update.newStock;
              }
              if (update.newPrice !== undefined) v.price = update.newPrice;
              if (update.newCost !== undefined) v.cost = update.newCost;
            }
          });
        });
      });
      logAction('csv_update', `Actualizadas ${updates.length} variantes mediante CSV.`);
      alert(`Actualización por CSV completada. Se modificaron ${updates.length} variantes.`);
    }, [changeDoc, addMovement, logAction]);

    
    return {
        // Status
        isReady,
        // State
        products,
        preferences,
        ignoredProductIds,
        allCategories,
        movements,
        manualMovements,
        auditLog,
        // Actions
        handleReset,
        handleJsonLoad,
        handleRestore,
        updatePreference,
        handleProductSave,
        handleProductDelete,
        handleSaveMovement,
        handleManualMovementSave,
        handleIgnoreProduct,
        handleRestoreProduct,
        handleCategorySave,
        handleCsvImport,
        logAction,
        changeDoc, // Exposing this for complex direct mutations if needed
    };
};

// This hook remains for now but is unused by the main app. It could be removed.
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