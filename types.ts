import React from 'react';

export interface Movement {
  id: string;
  variantId: string;
  timestamp: number;
  type: 'Venta' | 'Stock' | 'Ajuste' | 'Inicial';
  change: number;
  newStock: number;
  notes?: string;
  price?: number; // Price per item at the time of movement
  cost?: number;  // Cost per item at the time of movement
}

export interface ManualMovement {
  id: string;
  timestamp: number;
  type: 'Gasto' | 'Inversión' | 'Otro Ingreso';
  amount: number; // Positive for income, negative for expense/investment
  description: string;
}

export interface Variant {
  id:string;
  name: string;
  sku?: string;
  price?: number;
  cost?: number;
  stock: number;
  itemCount?: number;
}

export interface Product {
  id: string;
  category: string;
  title: string;
  description: string;
  details: string;
  imageUrls: string[];
  imageHint: string[];
  variants: Variant[];
}

export type Movements = Record<string, Movement[]>; // Keyed by variantId

export type ViewMode = 'grid' | 'list';

export interface UserPreferences {
  viewMode: ViewMode;
  searchTerm: string;
  selectedCategory: string;
  showAvailableOnly: boolean;
  showIgnoredOnly: boolean;
  key?: 'user'; // Key for Dexie single-object table
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  type: 'product_add' | 'product_edit' | 'product_delete' | 'product_ignore' | 'product_restore' | 'product_merge' | 'category_add' | 'data_repair' | 'bulk_edit' | 'bulk_ignore' | 'bulk_delete' | 'csv_update' | 'text_load' | 'backup_restore';
  message: string;
}

// Fix: Add CsvUpdatePayload type for CSV import functionality.
export interface CsvUpdatePayload {
  variantId: string;
  newPrice?: number;
  newCost?: number;
  newStock?: number;
}

// Type for storing string arrays in Dexie
export interface StringId {
  id: string;
}

export type ModalState =
  | { type: 'add' }
  | { type: 'edit'; product: Product }
  | { type: 'delete'; product: Product }
  | { type: 'ignore'; product: Product }
  | { type: 'export'; format: 'json' | 'markdown' | 'catalog' | 'csv' }
  | { type: 'add-category' }
  | { type: 'movements'; product: Product }
  | { type: 'manual-movement' }
  | { type: 'tools' }
  | { type: 'fusion'; products: [Product, Product] }
  | { type: 'audit-log' }
  | { type: 'bulk-edit'; productsCount: number }
  | { type: 'import-csv' }
  | { type: 'load-from-text' }
  | { type: 'restore-backup' }
  | { 
      type: 'confirm'; 
      title: string; 
      message: React.ReactNode; 
      onConfirm: () => void | Promise<void>;
      confirmText?: string;
      confirmClass?: string;
    };