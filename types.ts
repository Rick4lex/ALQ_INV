
export interface Product {
  id: string;
  category: string;
  title: string;
  description: string;
  details: string;
  imageUrls: string[];
  imageHint: string;
  price?: string;
  available: boolean;
}

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
  | { type: 'add-category' };
