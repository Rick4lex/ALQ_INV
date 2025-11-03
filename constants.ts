import { Product, Variant } from './types';

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
  OMITTED_HINTS: 'alkima-mizu-omitted-hints',
  CATALOG_SELECTED_HINTS: 'alkima-mizu-catalog-hints',
};

export const EMPTY_VARIANT: Omit<Variant, 'id'> = {
  name: 'Unidad',
  sku: '',
  price: 0,
  stock: 1,
  itemCount: 1,
};

export const EMPTY_PRODUCT: Omit<Product, 'id'> = {
  title: '',
  category: 'minifiguras',
  description: '',
  details: '',
  imageUrls: [''],
  imageHint: [],
  variants: [{ ...EMPTY_VARIANT, id: `new-variant-${Date.now()}` }],
};