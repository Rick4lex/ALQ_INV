
import React from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { useAppContext } from '../contexts/AppContext';

interface ProductDisplayProps {
  products: Product[];
  onImageClick: (imageUrls: string[]) => void;
}

const ProductDisplay: React.FC<ProductDisplayProps> = ({ products, onImageClick }) => {
  const { 
    preferences,
    fusionMode, 
    selectedForFusion, 
    toggleFusionSelection,
    selectedProductIds, 
    setSelectedProductIds,
  } = useAppContext();

  if (products.length === 0) {
    const message = fusionMode 
      ? "No hay productos para fusionar."
      : "No se encontraron productos que coincidan con los filtros.";
    return <div className="text-center py-10 text-gray-400">{message}</div>;
  }
  
  const containerClasses = preferences.viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'flex flex-col gap-6';
    
  const handleToggleSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };

  return (
    <div className={containerClasses}>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          viewMode={preferences.viewMode}
          onImageClick={onImageClick}
          isIgnoredView={!!preferences.showIgnoredOnly}
          isFusionMode={fusionMode}
          isSelectedForFusion={selectedForFusion.includes(product.id)}
          onSelectForFusion={toggleFusionSelection}
          isSelected={selectedProductIds.has(product.id)}
          onToggleSelection={handleToggleSelection}
          isSelectionMode={selectedProductIds.size > 0}
        />
      ))}
    </div>
  );
};

export default React.memo(ProductDisplay);
