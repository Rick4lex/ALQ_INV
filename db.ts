import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Product, UserPreferences, Movement, ManualMovement, AuditEntry, StringId } from './types';

export class AlquimaMizuDB extends Dexie {
  products!: Table<Product, string>;
  preferences!: Table<UserPreferences, string>;
  ignoredProductIds!: Table<StringId, string>;
  allCategories!: Table<StringId, string>;
  movements!: Table<Movement, string>;
  manualMovements!: Table<ManualMovement, string>;
  auditLog!: Table<AuditEntry, string>;

  constructor() {
    super('AlquimaMizuDB');
    (this as Dexie).version(1).stores({
      products: 'id, category, title, *imageHint, *variants.id',
      preferences: 'key',
      ignoredProductIds: 'id',
      allCategories: 'id',
      movements: 'id, variantId, timestamp, type',
      manualMovements: 'id, timestamp, type',
      auditLog: 'id, timestamp, type',
    });
  }
}

export const db = new AlquimaMizuDB();