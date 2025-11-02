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
};

export const EMPTY_VARIANT: Omit<Variant, 'id'> = {
  name: 'Único',
  sku: '',
  price: '',
  stock: 1,
};

export const EMPTY_PRODUCT: Omit<Product, 'id'> = {
  title: '',
  category: 'minifiguras',
  description: '',
  details: '',
  imageUrls: [''],
  imageHint: '',
  variants: [{ ...EMPTY_VARIANT, id: `new-variant-${Date.now()}` }],
};
