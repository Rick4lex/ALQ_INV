// hooks/useAppStore.ts
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { Product, UserPreferences, Movements, ManualMovement, Movement, AuditEntry } from '../types';
import { INITIAL_CATEGORIES } from '../constants';
import { runMigration } from '../migration';

export const useAppStore = () => {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences>({
        viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false,
    });
    const [ignoredProductIds, setIgnoredProductIds] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>(INITIAL_CATEGORIES);
    const [movements, setMovements] = useState<Movements>({});
    const [manualMovements, setManualMovements] = useState<ManualMovement[]>([]);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [isMigrating, setIsMigrating] = useState(true); // Start in migrating state
    
    useEffect(() => {
        const loadData = async () => {
            console.log("Loading data from IndexedDB...");
            const [
                dbProducts, dbPreferences, dbIgnoredIds, 
                dbCategories, dbMovements, dbManualMovements, dbAuditLog
            ] = await Promise.all([
                db.products.toArray(),
                db.preferences.get('user'),
                db.ignoredProductIds.toArray(),
                db.allCategories.toArray(),
                db.movements.toArray(),
                db.manualMovements.toArray(),
                db.auditLog.orderBy('timestamp').reverse().toArray(),
            ]);

            setProducts(dbProducts || []);
            if (dbPreferences) setPreferences(dbPreferences);
            setIgnoredProductIds(dbIgnoredIds.map(item => item.id));

            if (dbCategories.length > 0) {
                setAllCategories(dbCategories.map(item => item.id));
            } else {
                await db.allCategories.bulkAdd(INITIAL_CATEGORIES.map(c => ({id: c})));
                setAllCategories(INITIAL_CATEGORIES);
            }
            
            const groupedMovements = dbMovements.reduce((acc: Movements, mov) => {
                if (!acc[mov.variantId]) acc[mov.variantId] = [];
                acc[mov.variantId].push(mov);
                return acc;
            }, {});
            setMovements(groupedMovements);

            setManualMovements(dbManualMovements);
            setAuditLog(dbAuditLog);
            console.log("Data loaded successfully.");
        };

        const initialize = async () => {
            setIsMigrating(true);
            const migrationSuccessful = await runMigration();
            if (!migrationSuccessful) {
                console.error("Migration failed. The app might not function correctly.");
            }
            await loadData();
            setIsMigrating(false);
        };

        initialize();
    }, []);

    const logAction = useCallback(async (type: AuditEntry['type'], message: string) => {
        const newEntry: AuditEntry = { id: `log-${Date.now()}`, timestamp: Date.now(), type, message };
        await db.auditLog.add(newEntry);
        setAuditLog(prev => [newEntry, ...prev]);
    }, []);

    const addMovement = useCallback(async (variantId: string, movementData: Omit<Movement, 'id' | 'variantId'>) => {
        const newMovement: Movement = { ...movementData, id: `mov-${Date.now()}-${Math.random()}`, variantId };
        await db.movements.add(newMovement);
        setMovements(prev => ({
            ...prev,
            [variantId]: [...(prev[variantId] || []), newMovement]
        }));
    }, []);

    const handleProductSave = useCallback(async (productToSave: Product) => {
        const isEditing = products ? products.some(p => p.id === productToSave.id) : false;
        
        if (isEditing) {
            logAction('product_edit', `Producto editado: "${productToSave.title}" (ID: ${productToSave.id})`);
            const existingProduct = products?.find(p => p.id === productToSave.id);
            if (existingProduct) {
                for (const variant of productToSave.variants) {
                    const existingVariant = existingProduct.variants.find(v => v.id === variant.id);
                    const currentStock = variant.stock || 0;
                    const oldStock = existingVariant?.stock || 0;
                    if (!existingVariant) {
                        await addMovement(variant.id, { timestamp: Date.now(), type: 'Inicial', change: currentStock, newStock: currentStock, notes: 'Variante nueva añadida' });
                    } else if (oldStock !== currentStock) {
                        const change = currentStock - oldStock;
                        if (change !== 0) await addMovement(variant.id, { timestamp: Date.now(), type: 'Ajuste', change, newStock: currentStock, notes: 'Ajuste desde formulario' });
                    }
                }
            }
        } else {
            logAction('product_add', `Producto añadido: "${productToSave.title}"`);
            for (const variant of productToSave.variants) {
                const stock = variant.stock || 0;
                await addMovement(variant.id, { timestamp: Date.now(), type: 'Inicial', change: stock, newStock: stock, notes: 'Stock inicial' });
            }
        }
        
        await db.products.put(productToSave);

        setProducts(prevProducts => {
            if (isEditing) {
                return prevProducts?.map(p => p.id === productToSave.id ? productToSave : p) || null;
            } else {
                return [...(prevProducts || []), productToSave];
            }
        });
    }, [products, addMovement, logAction]);
    
    const handleMultipleMovementsDelete = useCallback(async (variantId: string, movementIdsToDelete: string[]) => {
        await db.movements.bulkDelete(movementIdsToDelete);

        const remainingMovements = (await db.movements.where('variantId').equals(variantId).toArray()).sort((a, b) => a.timestamp - b.timestamp);
        
        let currentStock = 0;
        const recalculatedMovements = remainingMovements.map(m => {
            currentStock = m.type === 'Inicial' ? m.change : currentStock + m.change;
            currentStock = Math.max(0, currentStock);
            return { ...m, newStock: currentStock };
        });
        
        await db.movements.bulkPut(recalculatedMovements);
        
        const finalStock = recalculatedMovements.length > 0 ? recalculatedMovements[recalculatedMovements.length - 1].newStock : 0;
        
        const productToUpdate = await db.products.where('variants.id').equals(variantId).first();
        if (productToUpdate) {
            const newProduct = { ...productToUpdate, variants: productToUpdate.variants.map(v => v.id === variantId ? { ...v, stock: finalStock } : v) };
            await db.products.put(newProduct);
            
            setProducts(prev => prev?.map(p => p.id === newProduct.id ? newProduct : p) || null);
        }

        setMovements(prev => ({ ...prev, [variantId]: recalculatedMovements }));
    }, []);

    return {
        products, setProducts,
        preferences, setPreferences,
        ignoredProductIds, setIgnoredProductIds,
        allCategories, setAllCategories,
        movements, setMovements,
        manualMovements, setManualMovements,
        auditLog, setAuditLog,
        isMigrating,
        logAction, addMovement, handleProductSave, handleMultipleMovementsDelete,
    };
};
