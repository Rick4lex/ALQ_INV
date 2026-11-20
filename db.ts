import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Product, UserPreferences, Movement, ManualMovement, AuditEntry, StringId, SaleRecord } from './types';

export class AlquimaMizuDB extends Dexie {
  products!: Table<Product, string>;
  preferences!: Table<UserPreferences, string>;
  ignoredProductIds!: Table<StringId, string>;
  allCategories!: Table<StringId, string>;
  movements!: Table<Movement, string>;
  manualMovements!: Table<ManualMovement, string>;
  auditLog!: Table<AuditEntry, string>;
  sales!: Table<SaleRecord, string>;

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
    (this as Dexie).version(2).stores({
      products: 'id, category, title, *imageHint, *variants.id',
      preferences: 'key',
      ignoredProductIds: 'id',
      allCategories: 'id',
      movements: 'id, variantId, timestamp, type, ticketId',
      manualMovements: 'id, timestamp, type',
      auditLog: 'id, timestamp, type',
      sales: 'ticketId, createdAt, paymentStatus, deliveryStatus, customerName',
    });
  }
}

export const db = new AlquimaMizuDB();