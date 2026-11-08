

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { ModalState, Product, Variant, UserPreferences, Movement, ManualMovement, CsvUpdatePayload, AuditEntry, Movements, BatchSaleItem, SaleReceiptPayload } from '../types';
import { db } from '../db';
import Dexie from 'dexie';
import { syncService } from '../services/syncService';

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
  isSyncing: boolean;
  handleManualSync: (isSilent?: boolean) => Promise<void>;
  triggerRemoteSave: (newStateToSave?: any) => Promise<void>;
  isAnyModalOpen: () => boolean;
  handleTextLoad: (jsonString: string) => void;
  handleRestoreBackup: (backupData: any) => Promise<void>;
  handleReset: () => void;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  handleIgnoredChange: (show: boolean) => void;
  handleProductDelete: (productId: string) => Promise<void>;
  handleSaveMovement: (productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => void;
  handleBatchSale: (items: BatchSaleItem[], ticketId: string, notes?: string, recipientEmail?: string) => Promise<boolean>;
  handleManualMovementSave: (movement: Omit<ManualMovement, 'id'>) => void;
  handleIgnoreProduct: (productId: string) => Promise<void>;
  handleRestoreProduct: (productToRestore: Product) => void;
  confirmRestoreProduct: (productId: string, assignedCategory: string) => Promise<void>;
  handleCategorySave: (newCategory: string) => Promise<void> | void;
  handleCategoryUpdate: (oldCategory: string, newCategoryRaw: string) => Promise<void>;
  handleCategoryDelete: (categoryToDelete: string, reassignToCategory?: string) => Promise<void>;
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
  const { products, setProducts, preferences, setPreferences, ignoredProductIds, setIgnoredProductIds, allCategories, setAllCategories, movements, setMovements, manualMovements, setManualMovements, auditLog, logAction, addMovement, handleProductSave: storeHandleProductSave, handleMultipleMovementsDelete: rawHandleMultipleMovementsDelete } = store;

  const [modal, setModal] = useState<ModalState | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [currentView, setCurrentView] = useState<'catalog' | 'financials'>('catalog');
  const [fusionMode, setFusionMode] = useState(false);
  const [selectedForFusion, setSelectedForFusion] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const isAnyModalOpen = useCallback(() => modal !== null || fullscreenData !== null, [modal, fullscreenData]);

  const triggerRemoteSave = useCallback(async (explicitProducts?: Product[]) => {
    try {
      // Siempre obtener la copia más fresca y real desde Dexie/IndexedDB si no se pasa explícitamente
      const currentProducts = explicitProducts || await db.products.toArray();
      const dbCategories = await db.allCategories.toArray();
      const currentCategories = dbCategories.map(c => c.id);
      const allMovements = await db.movements.toArray();
      const groupedMovements = allMovements.reduce((acc: Movements, mov) => {
        if (!acc[mov.variantId]) acc[mov.variantId] = [];
        acc[mov.variantId].push(mov);
        return acc;
      }, {});

      const payload = {
        products: currentProducts,
        categories: currentCategories,
        movements: groupedMovements,
        timestamp: Date.now()
      };

      let token: string | undefined;
      try {
        const stored = sessionStorage.getItem('alquima_mizu_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.token;
        }
      } catch {}

      await syncService.pushRemoteData(payload, token);
    } catch (error) {
      console.warn("Fallo al guardar en Sheets en segundo plano:", error);
    }
  }, []);

  const handleManualSync = useCallback(async (isSilent = false) => {
    if (isSyncing) return;
    if (!isSilent) setIsSyncing(true);

    try {
      const remoteData = await syncService.fetchRemoteData();
      if (!remoteData) return;

      let incomingProducts: any[] | null = null;
      let incomingCategories: string[] | null = null;
      let incomingMovements: Movements | null = null;

      if (Array.isArray(remoteData)) {
        incomingProducts = remoteData;
      } else if (remoteData && typeof remoteData === 'object') {
        if (Array.isArray(remoteData.products)) {
          incomingProducts = remoteData.products;
        } else if (remoteData.data && Array.isArray(remoteData.data)) {
          incomingProducts = remoteData.data;
        } else if (remoteData.data && typeof remoteData.data === 'object' && Array.isArray(remoteData.data.products)) {
          incomingProducts = remoteData.data.products;
          if (Array.isArray(remoteData.data.categories)) {
            incomingCategories = remoteData.data.categories;
          }
          if (remoteData.data.movements) {
            incomingMovements = remoteData.data.movements;
          }
        } else if (Array.isArray(remoteData.placeholderImages)) {
          incomingProducts = remoteData.placeholderImages;
        }

        if (Array.isArray(remoteData.categories)) {
          incomingCategories = remoteData.categories;
        }
        if (remoteData.movements) {
          incomingMovements = remoteData.movements;
        }
      }

      if (incomingProducts !== null) {
        // Mapeo preventivo de imageUrls locales existentes para no perder referencias asignadas
        const currentDbProducts = await db.products.toArray();
        const localVariantImageMap = new Map<string, string>();
        currentDbProducts.forEach(p => {
          (p.variants || []).forEach(v => {
            if (v.imageUrl && typeof v.imageUrl === 'string' && v.imageUrl.trim()) {
              localVariantImageMap.set(String(v.id), v.imageUrl.trim());
            }
          });
        });

        const normalizedProducts: Product[] = incomingProducts
          .filter((p: any) => p && (p.id || p.title))
          .map((p: any) => {
            const prod: any = { ...p };
            if (!prod.id) prod.id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            if (prod.imageHint && typeof prod.imageHint === 'string') {
              prod.imageHint = [prod.imageHint];
            } else if (!Array.isArray(prod.imageHint)) {
              prod.imageHint = [];
            }
            if (typeof prod.imageUrls === 'string') {
              prod.imageUrls = prod.imageUrls.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (!Array.isArray(prod.imageUrls)) {
              prod.imageUrls = [];
            }
            if (!prod.variants || !Array.isArray(prod.variants) || prod.variants.length === 0) {
              const stock = prod.hasOwnProperty('stock') ? prod.stock : (prod.available ? 1 : 0);
              prod.variants = [{
                id: `${prod.id}-default`,
                name: 'Único',
                stock: Number(stock) || 0,
                price: prod.price ?? '',
                sku: prod.sku ?? '',
              }];
            } else {
              // Normalizar cada variante asegurando la persistencia de imageUrl
              prod.variants = prod.variants.map((v: any) => {
                const remoteImageUrl = String(v.imageUrl || v.imagenUrl || v.fotoRef || v.image_url || '').trim();
                const localImageUrl = localVariantImageMap.get(String(v.id)) || '';
                const finalImageUrl = remoteImageUrl || localImageUrl;
                const cleanVariant: Variant = {
                  id: String(v.id || `${prod.id}-v-${Math.random().toString(36).substring(2, 7)}`),
                  name: String(v.name || 'Variante'),
                  stock: Number(v.stock) >= 0 ? Number(v.stock) : 0,
                  price: typeof v.price === 'number' ? v.price : Number(v.price) || 0,
                  cost: typeof v.cost === 'number' ? v.cost : Number(v.cost) || 0,
                  itemCount: Number(v.itemCount) >= 1 ? Number(v.itemCount) : 1,
                  sku: v.sku ? String(v.sku) : undefined,
                };
                if (finalImageUrl) {
                  cleanVariant.imageUrl = finalImageUrl;
                }
                return cleanVariant;
              });
            }
            return prod as Product;
          });

        // CONCILIACIÓN BIDIRECCIONAL:
        // Detectar productos que existían en IndexedDB pero ya no están en Google Sheets (fueron borrados)
        const incomingIds = new Set(normalizedProducts.map(p => String(p.id)));
        const deletedProducts = currentDbProducts.filter(p => !incomingIds.has(String(p.id)));
        const deletedIds = deletedProducts.map(p => p.id);
        const deletedVariantIds = deletedProducts.flatMap(p => (p.variants || []).map(v => v.id));

        // Transacción atómica en Dexie para reflejar exactamente el catálogo remoto
        await (db as Dexie).transaction('rw', db.products, db.movements, async () => {
          if (deletedIds.length > 0) {
            await db.products.bulkDelete(deletedIds);
          }
          if (deletedVariantIds.length > 0) {
            await db.movements.where('variantId').anyOf(deletedVariantIds).delete();
          }
          if (normalizedProducts.length > 0) {
            await db.products.bulkPut(normalizedProducts);
          }
        });

        // Actualizar el estado de React con la lista limpia
        setProducts(normalizedProducts);

        if (deletedVariantIds.length > 0) {
          setMovements(prev => {
            const next = { ...prev };
            deletedVariantIds.forEach(vid => delete next[vid]);
            return next;
          });
        }

        const loadedCategories = [...new Set(normalizedProducts.map(p => p.category).filter(Boolean))];
        let newCats: string[];
        if (incomingCategories && incomingCategories.length > 0) {
          // Si Sheets envía la lista autoritativa de categorías, se respetan junto a las de productos reales existentes
          newCats = [...new Set([...incomingCategories, ...loadedCategories])];
          // Limpiar de la base de datos local categorías huérfanas eliminadas en Sheet
          await db.allCategories.clear();
          await db.allCategories.bulkPut(newCats.map(c => ({ id: c })));
        } else {
          newCats = [...new Set([...loadedCategories])];
          await db.allCategories.clear();
          await db.allCategories.bulkPut(newCats.map(c => ({ id: c })));
        }
        setAllCategories(newCats);

        // Integración con Sheets: detectar productos sin título o sin categoría y considerarlos ocultos
        const hiddenFromSheets = normalizedProducts
          .filter(p => !p.title || !p.title.trim() || !p.category || !p.category.trim())
          .map(p => p.id);
        if (hiddenFromSheets.length > 0) {
          const mergedIgnored = [...new Set([...ignoredProductIds, ...hiddenFromSheets])];
          await db.ignoredProductIds.bulkPut(hiddenFromSheets.map(id => ({ id })));
          setIgnoredProductIds(mergedIgnored);
        }

        if (incomingMovements) {
          const flatMovements = Object.values(incomingMovements).flat();
          await db.movements.bulkPut(flatMovements as Movement[]);
          setMovements(incomingMovements);
        }

        await logAction(
          'cloud_sync', 
          `Sincronización remota exitosa: ${normalizedProducts.length} productos actualizados${deletedIds.length > 0 ? `, ${deletedIds.length} eliminados conciliados` : ''}.`
        );
      }
    } catch (error) {
      console.error("Error sincronizando:", error);
      if (!isSilent) {
        alert("Error al sincronizar con Google Sheets. Revisa la consola o conexión.");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, allCategories, setProducts, setAllCategories, setMovements, logAction]);

  const handleProductSave = useCallback(async (productToSave: Product) => {
    await storeHandleProductSave(productToSave);
    triggerRemoteSave();
  }, [storeHandleProductSave, triggerRemoteSave]);
  
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
    triggerRemoteSave();
  }, [products, setProducts, setMovements, logAction, triggerRemoteSave]);
  
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
      triggerRemoteSave();
  }, [products, setProducts, addMovement, triggerRemoteSave]);

  const handleBatchSale = useCallback(async (
    saleItems: BatchSaleItem[],
    ticketId: string,
    notes?: string,
    recipientEmail?: string
  ): Promise<boolean> => {
    if (!products || saleItems.length === 0) return false;

    const productUpdatesMap = new Map<string, Product>();
    const createdMovements: Movement[] = [];
    const timestamp = Date.now();

    for (const item of saleItems) {
      const currentProduct = productUpdatesMap.get(item.productId) || products.find(p => p.id === item.productId);
      if (!currentProduct) continue;

      const variant = currentProduct.variants.find(v => v.id === item.variantId);
      if (!variant) continue;

      const newStock = Math.max(0, variant.stock - item.quantity);
      const updatedProduct: Product = {
        ...currentProduct,
        variants: currentProduct.variants.map(v => v.id === item.variantId ? { ...v, stock: newStock } : v)
      };
      productUpdatesMap.set(item.productId, updatedProduct);

      const mov: Movement = {
        id: `mov-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
        variantId: item.variantId,
        timestamp,
        type: 'Venta',
        change: -item.quantity,
        newStock,
        price: item.unitPrice,
        cost: typeof variant.cost === 'number' ? variant.cost : 0,
        ticketId,
        originalPrice: item.originalPrice,
        discount: item.discount,
        notes: notes || `Venta Ticket #${ticketId}`
      };
      createdMovements.push(mov);
    }

    const updatedProductsArray = Array.from(productUpdatesMap.values());
    if (updatedProductsArray.length === 0) return false;

    // Transacción atómica en Dexie
    await (db as Dexie).transaction('rw', db.products, db.movements, async () => {
      await db.products.bulkPut(updatedProductsArray);
      await db.movements.bulkPut(createdMovements);
    });

    // Actualizar estado de React
    setProducts(prev => {
      if (!prev) return null;
      const updatedMap = new Map(updatedProductsArray.map(p => [p.id, p]));
      return prev.map(p => updatedMap.get(p.id) || p);
    });

    setMovements(prev => {
      const next = { ...prev };
      createdMovements.forEach(m => {
        if (!next[m.variantId]) next[m.variantId] = [];
        next[m.variantId] = [...next[m.variantId], m];
      });
      return next;
    });

    const totalSoldUnits = saleItems.reduce((acc, i) => acc + i.quantity, 0);
    const totalAmount = saleItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    await logAction('cloud_sync', `Venta Rápida: Ticket #${ticketId} (${totalSoldUnits} unid., total: $${totalAmount.toLocaleString('es-CO')})`);

    // Sincronizar hacia Google Sheets
    triggerRemoteSave();

    // Enviar comprobante por correo si se especificó
    if (recipientEmail && recipientEmail.trim()) {
      try {
        const subtotalSum = saleItems.reduce((acc, i) => acc + (i.quantity * i.originalPrice), 0);
        const discountSum = saleItems.reduce((acc, i) => acc + (i.quantity * i.discount), 0);
        const receipt: SaleReceiptPayload = {
          ticketId,
          timestamp,
          items: saleItems.map(i => ({
            title: i.productTitle,
            variant: i.variantName,
            quantity: i.quantity,
            originalPrice: i.originalPrice,
            unitPrice: i.unitPrice,
            subtotal: i.quantity * i.unitPrice
          })),
          subtotal: subtotalSum,
          discountAmount: discountSum,
          total: totalAmount,
          notes
        };
        await syncService.sendSaleReceipt(receipt, recipientEmail.trim());
      } catch (err) {
        console.warn("Fallo el envío de comprobante por correo:", err);
      }
    }

    return true;
  }, [products, setProducts, setMovements, logAction, triggerRemoteSave]);
  
  const handleManualMovementSave = useCallback(async (movement: Omit<ManualMovement, 'id'>) => {
      const newMovement: ManualMovement = { ...movement, id: `manual-${Date.now()}` };
      await db.manualMovements.add(newMovement);
      setManualMovements(prev => [...prev, newMovement]);
      setModal(null);
  }, [setManualMovements, setModal]);

  const handleIgnoreProduct = useCallback(async (productId: string) => {
      const productToIgnore = products?.find(p => p.id === productId);
      if (!productToIgnore) return;

      const oldCategory = productToIgnore.category;
      const updatedProduct: Product = { ...productToIgnore, category: '' };

      // 1. Guardar producto con categoría vacía en Dexie y en memoria
      await db.products.put(updatedProduct);
      setProducts(prev => prev ? prev.map(p => p.id === productId ? updatedProduct : p) : null);

      // 2. Registrar en ignoredProductIds
      if (!ignoredProductIds.includes(productId)) {
        const newIgnored = [...ignoredProductIds, productId];
        await db.ignoredProductIds.add({ id: productId });
        setIgnoredProductIds(newIgnored);
      }

      // 3. Si la categoría anterior ya no tiene otros productos activos, retirarla de allCategories
      if (oldCategory && products) {
        const otherActiveProductsWithCategory = products.filter(
          p => p.id !== productId && p.category === oldCategory && !ignoredProductIds.includes(p.id)
        );
        if (otherActiveProductsWithCategory.length === 0) {
          const updatedCategories = allCategories.filter(c => c !== oldCategory);
          await db.allCategories.delete(oldCategory);
          setAllCategories(updatedCategories);
        }
      }

      await logAction('product_ignore', `Producto ocultado (categoría liberada): "${productToIgnore.title}" (ID: ${productId})`);
      
      // 4. Sincronizar inmediatamente a Google Sheets para vaciar la celda Categoría
      triggerRemoteSave();
  }, [ignoredProductIds, products, allCategories, setProducts, setIgnoredProductIds, setAllCategories, logAction, triggerRemoteSave]);

  const handleRestoreProduct = useCallback((productToRestore: Product) => {
    // Abrir modal con asignación obligatoria de categoría
    setModal({
      type: 'restore-product',
      product: productToRestore
    });
  }, [setModal]);

  const confirmRestoreProduct = useCallback(async (productId: string, assignedCategory: string) => {
    const cleanCategory = assignedCategory.toLowerCase().replace(/\s+/g, '-').trim();
    if (!cleanCategory) return;

    const productToRestore = products?.find(p => p.id === productId);
    if (!productToRestore) return;

    const updatedProduct: Product = { ...productToRestore, category: cleanCategory };

    // 1. Guardar producto con la nueva categoría asignada
    await db.products.put(updatedProduct);
    setProducts(prev => prev ? prev.map(p => p.id === productId ? updatedProduct : p) : null);

    // 2. Remover de ignoredProductIds
    const newIgnored = ignoredProductIds.filter(id => id !== productId);
    await db.ignoredProductIds.delete(productId);
    setIgnoredProductIds(newIgnored);

    // 3. Asegurar que la categoría exista en allCategories
    if (!allCategories.includes(cleanCategory)) {
      const newCats = [...allCategories, cleanCategory];
      await db.allCategories.put({ id: cleanCategory });
      setAllCategories(newCats);
    }

    await logAction('product_restore', `Producto restaurado con categoría "${cleanCategory}": "${productToRestore.title}" (ID: ${productId})`);
    
    // 4. Sincronizar a Google Sheets para escribir la nueva categoría en la fila
    triggerRemoteSave();
    setModal(null);
  }, [products, ignoredProductIds, allCategories, setProducts, setIgnoredProductIds, setAllCategories, logAction, triggerRemoteSave, setModal]);
  
  const handleCategorySave = useCallback(async (newCategoryRaw: string) => {
    const newCategory = newCategoryRaw.toLowerCase().replace(/\s+/g, '-').trim();
    if (!newCategory) return;
    if (!allCategories.includes(newCategory)) {
        const newCategories = [...allCategories, newCategory];
        await db.allCategories.put({ id: newCategory });
        setAllCategories(newCategories);
        await logAction('category_add', `Categoría añadida: "${newCategory}"`);
        triggerRemoteSave();
    }
  }, [allCategories, setAllCategories, logAction, triggerRemoteSave]);

  const handleCategoryUpdate = useCallback(async (oldCategory: string, newCategoryRaw: string) => {
    const newCategory = newCategoryRaw.toLowerCase().replace(/\s+/g, '-').trim();
    if (!newCategory || oldCategory === newCategory) return;

    // 1. Actualizar lista de categorías en Dexie y Estado
    const updatedCategories = allCategories.map(c => c === oldCategory ? newCategory : c);
    const uniqueCategories = [...new Set(updatedCategories)];
    await db.allCategories.delete(oldCategory);
    await db.allCategories.put({ id: newCategory });
    setAllCategories(uniqueCategories);

    // 2. Cascada: Actualizar todos los productos que usaban la categoría anterior
    const currentProducts = products || [];
    const affectedProducts = currentProducts.filter(p => p.category === oldCategory);
    let updatedProductsList = currentProducts;

    if (affectedProducts.length > 0) {
      const updatedProducts = affectedProducts.map(p => ({ ...p, category: newCategory }));
      await db.products.bulkPut(updatedProducts);
      updatedProductsList = currentProducts.map(p => p.category === oldCategory ? { ...p, category: newCategory } : p);
      setProducts(updatedProductsList);
    }

    // 3. Actualizar filtro si estaba seleccionada la categoría antigua
    if (preferences.selectedCategory === oldCategory) {
      updatePreference('selectedCategory', newCategory);
    }

    await logAction('category_edit', `Categoría renombrada: "${oldCategory}" → "${newCategory}" (${affectedProducts.length} producto(s) actualizados).`);
    triggerRemoteSave(updatedProductsList);
  }, [allCategories, setAllCategories, products, setProducts, preferences, updatePreference, logAction, triggerRemoteSave]);

  const handleCategoryDelete = useCallback(async (categoryToDelete: string, reassignToCategory?: string) => {
    // 1. Eliminar de la lista de categorías en Dexie y Estado
    const newCategories = allCategories.filter(c => c !== categoryToDelete);
    await db.allCategories.delete(categoryToDelete);
    setAllCategories(newCategories);

    // 2. Reasignar productos si aplica
    const currentProducts = products || [];
    const affectedProducts = currentProducts.filter(p => p.category === categoryToDelete);
    let updatedProductsList = currentProducts;

    if (affectedProducts.length > 0 && reassignToCategory) {
      const updatedProducts = affectedProducts.map(p => ({ ...p, category: reassignToCategory }));
      await db.products.bulkPut(updatedProducts);
      updatedProductsList = currentProducts.map(p => p.category === categoryToDelete ? { ...p, category: reassignToCategory } : p);
      setProducts(updatedProductsList);
    }

    // 3. Si la preferencia de filtro tenía esta categoría, restablecer a 'Todas'
    if (preferences.selectedCategory === categoryToDelete) {
      updatePreference('selectedCategory', 'Todas');
    }

    await logAction('category_delete', `Categoría eliminada: "${categoryToDelete}"${reassignToCategory ? ` (${affectedProducts.length} producto(s) reasignados a "${reassignToCategory}")` : ''}.`);
    triggerRemoteSave(updatedProductsList);
  }, [allCategories, setAllCategories, products, setProducts, preferences, updatePreference, logAction, triggerRemoteSave]);

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
    triggerRemoteSave();
  }, [products, setProducts, setMovements, logAction, setModal, triggerRemoteSave]);

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
    triggerRemoteSave();
    alert(`Reparación completada. Se corrigieron ${repairedCount} IDs de variantes duplicados.`);
  }, [products, movements, setProducts, setMovements, logAction, triggerRemoteSave]);

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
            triggerRemoteSave();
        },
        confirmText: 'Sí, Fusionar',
        confirmClass: 'bg-brand-green hover:bg-green-600',
    });
  }, [products, setProducts, logAction, setModal, setFusionMode, setSelectedForFusion, triggerRemoteSave]);
  
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
    triggerRemoteSave();
  }, [products, selectedProductIds, setProducts, logAction, setModal, setSelectedProductIds, triggerRemoteSave]);

  const handleBulkIgnore = useCallback(() => {
    setModal({
        type: 'confirm',
        title: 'Ocultar Productos',
        message: `¿Estás seguro de que quieres ocultar ${selectedProductIds.size} productos seleccionados? Sus categorías serán liberadas en Google Sheets.`,
        onConfirm: async () => {
            const idsArray = Array.from(selectedProductIds);
            const newIgnoredIds = [...new Set([...ignoredProductIds, ...idsArray])];
            await db.ignoredProductIds.bulkPut(idsArray.map(id => ({ id })));
            setIgnoredProductIds(newIgnoredIds);

            if (products) {
              const updatedProducts = products.map(p => {
                if (selectedProductIds.has(p.id)) {
                  return { ...p, category: '' };
                }
                return p;
              });
              const modifiedProducts = updatedProducts.filter(p => selectedProductIds.has(p.id));
              await db.products.bulkPut(modifiedProducts);
              setProducts(updatedProducts);
            }

            await logAction('bulk_ignore', `Se ocultaron ${selectedProductIds.size} productos en lote.`);
            setModal(null);
            setSelectedProductIds(new Set());
            triggerRemoteSave();
        },
        confirmText: 'Sí, Ocultar',
        confirmClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    });
  }, [selectedProductIds, ignoredProductIds, products, setIgnoredProductIds, setProducts, logAction, setModal, setSelectedProductIds, triggerRemoteSave]);

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
            triggerRemoteSave();
        },
        confirmText: 'Sí, Eliminar',
        confirmClass: 'bg-brand-red hover:bg-red-600',
    });
  }, [selectedProductIds, products, setProducts, setMovements, logAction, setModal, setSelectedProductIds, triggerRemoteSave]);
  
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
    handleManualMovementSave, handleIgnoreProduct, handleRestoreProduct, confirmRestoreProduct, handleCategorySave,
    handleCategoryUpdate, handleCategoryDelete,
    handleBackupDownload, handleCsvImport, handleRepairDuplicateVariantIds, handleProductMerge,
    handleImageClick, toggleFusionSelection, startFusion, handleBulkEditSave,
    handleBulkIgnore, handleBulkDelete, changeFullscreenImage,
    handleMultipleMovementsDelete, handleBatchSale,
    isSyncing, handleManualSync, triggerRemoteSave, isAnyModalOpen, handleProductSave,
  }), [
    store, modal, fullscreenData, currentView, fusionMode, selectedForFusion, 
    selectedProductIds, selectedTags, handleTextLoad, handleRestoreBackup, handleReset, updatePreference, 
    handleIgnoredChange, handleProductDelete, handleSaveMovement, handleManualMovementSave, 
    handleIgnoreProduct, handleRestoreProduct, confirmRestoreProduct, handleCategorySave, handleCategoryUpdate, handleCategoryDelete, handleBackupDownload, 
    handleCsvImport, handleRepairDuplicateVariantIds, handleProductMerge, handleImageClick, 
    toggleFusionSelection, startFusion, handleBulkEditSave, handleBulkIgnore, 
    handleBulkDelete, changeFullscreenImage, handleMultipleMovementsDelete, handleBatchSale,
    isSyncing, handleManualSync, triggerRemoteSave, isAnyModalOpen, handleProductSave
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};