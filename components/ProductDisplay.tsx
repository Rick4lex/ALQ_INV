
import React from 'react';
import { Product, ViewMode } from '../types';
import ProductCard from './ProductCard';

interface ProductDisplayProps {
  products: Product[];
  viewMode: ViewMode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (productId: string, available: boolean) => void;
  onImageClick: (imageUrl: string) => void;
  onIgnore: (product: Product) => void;
}

const ProductDisplay: React.FC<ProductDisplayProps> = ({ products, viewMode, onEdit, onDelete, onToggleAvailability, onImageClick, onIgnore }) => {
  if (products.length === 0) {
    return <div className="text-center py-10 text-gray-400">No se encontraron productos que coincidan con los filtros.</div>;
  }
  
  const containerClasses = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'flex flex-col gap-6';

  return (
    <div className={containerClasses}>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          viewMode={viewMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleAvailability={onToggleAvailability}
          onImageClick={onImageClick}
          onIgnore={onIgnore}
        />
      ))}
    </div>
  );
};

export default ProductDisplay;