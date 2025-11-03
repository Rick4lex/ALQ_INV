import React from 'react';
import { Product, ViewMode } from '../types';
import ProductCard from './ProductCard';

interface ProductDisplayProps {
  products: Product[];
  viewMode: ViewMode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onImageClick: (imageUrls: string[]) => void;
  onIgnore: (product: Product) => void;
  onMovement: (product: Product) => void;
}

const ProductDisplay: React.FC<ProductDisplayProps> = ({ products, viewMode, onEdit, onDelete, onImageClick, onIgnore, onMovement }) => {
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
          onImageClick={onImageClick}
          onIgnore={onIgnore}
          onMovement={onMovement}
        />
      ))}
    </div>
  );
};

export default React.memo(ProductDisplay);