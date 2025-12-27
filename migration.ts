
import { Dexie } from 'dexie';
import { db } from './db';
import { LOCAL_STORAGE_KEYS } from './constants';
import { Product, UserPreferences, Movements, ManualMovement, AuditEntry } from './types';

/**
 * Checks for data in localStorage and migrates it to IndexedDB if necessary.
 * This is a one-time operation for existing users.
 * @returns {Promise<boolean>} - True if migration was successful or not needed, false on failure.
 */
export const runMigration = async (): Promise<boolean> => {
    const lsProducts = localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS);
    
    // If no localStorage products, no migration is needed.
    if (!lsProducts) {
        console.log("No localStorage data found. Skipping migration.");
        return true; 
    }

    try {
        const dbProductCount = await db.products.count();
        // If DB already has products, migration has been done before.
        // Clean up LS just in case and skip.
        if (dbProductCount > 0) {
            console.log("IndexedDB already populated. Cleaning up old localStorage data.");
            Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            return true;
        }

        console.log("Starting migration from localStorage to IndexedDB...");

        // Parse all data from localStorage, with fallbacks for safety.
        const products: Product[] = JSON.parse(lsProducts);
        const preferences: UserPreferences = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES) || '{}');
        const ignoredProductIds: string[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.IGNORED_PRODUCTS) || '[]');
        const categories: string[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
        const movements: Movements = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.MOVEMENTS) || '{}');
        const manualMovements: ManualMovement[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.MANUAL_MOVEMENTS) || '[]');
        const auditLog: AuditEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_LOG) || '[]');

        // Use a transaction for atomic writes to ensure data integrity.
        // Fix: Cast `db` to `Dexie` to resolve transaction method typing issue.
            await (db as any).transaction('rw', db.products, db.preferences, db.ignoredProductIds, db.allCategories, db.movements, db.manualMovements, db.auditLog, async () => {
            if (products.length > 0) await db.products.bulkPut(products);
            await db.preferences.put({ ...preferences, key: 'user' });
            if (ignoredProductIds.length > 0) await db.ignoredProductIds.bulkPut(ignoredProductIds.map(id => ({ id })));
            if (categories.length > 0) await db.allCategories.bulkPut(categories.map(id => ({ id })));
            
            const flatMovements = Object.values(movements).flat();
            if (flatMovements.length > 0) await db.movements.bulkPut(flatMovements);
            if (manualMovements.length > 0) await db.manualMovements.bulkPut(manualMovements);
            if (auditLog.length > 0) await db.auditLog.bulkPut(auditLog);
        });

        // Cleanup localStorage after successful migration
        console.log("Migration successful. Cleaning up localStorage...");
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

        return true;
    } catch (error) {
        console.error("Data migration failed:", error);
        alert("¡Error crítico! No se pudieron migrar tus datos a la nueva base de datos. Por favor, exporta un backup de tus datos si es posible y contacta a soporte.");
        return false;
    }
};
