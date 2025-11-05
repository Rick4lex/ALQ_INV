import { Product, Variant } from './types';

export const DATA_VERSION = 5;

export const INITIAL_CATEGORIES = [
  'minifiguras',
  'dibujos',
  'stickers',
  'tatuajes-temporales',
  'accesorios',
];

export const LOCAL_STORAGE_KEYS = {
  PRODUCTS: 'alkima-mizu-products',
  PREFERENCES: 'alkima-mizu-preferences',
  IGNORED_PRODUCTS: 'alkima-mizu-ignored-products',
  CATEGORIES: 'alkima-mizu-categories',
  MOVEMENTS: 'alkima-mizu-movements',
  MANUAL_MOVEMENTS: 'alkima-mizu-manual-movements',
  OMITTED_HINTS: 'alkima-mizu-omitted-hints',
  CATALOG_SELECTED_HINTS: 'alkima-mizu-catalog-hints',
  DATA_VERSION: 'alkima-mizu-data-version',
  AUDIT_LOG: 'alkima-mizu-audit-log',
};

export const EMPTY_VARIANT: Omit<Variant, 'id'> = {
  name: 'Unidad',
  sku: '',
  price: 0,
  cost: 0,
  stock: 1,
  itemCount: 1,
};

export const createEmptyProduct = (): Omit<Product, 'id'> => ({
  title: '',
  category: 'minifiguras',
  description: '',
  details: '',
  imageUrls: [''],
  imageHint: [],
  variants: [{ ...EMPTY_VARIANT, id: `new-variant-${Date.now()}` }],
});