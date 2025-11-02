export interface Movement {
  id: string;
  variantId: string;
  timestamp: number;
  type: 'Venta' | 'Stock' | 'Ajuste' | 'Inicial';
  change: number;
  newStock: number;
  notes?: string;
}

export interface Variant {
  id: string;
  name: string;
  sku?: string;
  price?: string;
  stock: number;
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
}

export type ModalState =
  | { type: 'add' }
  | { type: 'edit'; product: Product }
  | { type: 'delete'; product: Product }
  | { type: 'ignore'; product: Product }
  | { type: 'export'; format: 'json' | 'markdown' | 'catalog' }
  | { type: 'add-category' }
  | { type: 'movements'; product: Product };
