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

const placeholderData = {
  placeholderImages: [
    {
      id: "minifigura-1",
      category: "minifiguras",
      title: "Ejemplo: Guerrero Espacial",
      description: "Figura de construcción tipo bloque.",
      details: "Incluye base y accesorios. Plástico ABS de alta calidad.",
      imageUrls: ["https://via.placeholder.com/400x400.png?text=Producto"],
      imageHint: ["Serie Original"],
      variants: [
        {
          id: "minifigura-1-default",
          name: "Único",
          sku: "ALG-MF-001",
          price: "15.000 und",
          stock: 10,
        },
      ],
    },
  ],
};

export const placeholderJson = JSON.stringify(placeholderData, null, 2);