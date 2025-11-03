import React, { useState, useMemo } from 'react';
import { Product, ViewMode } from '../types';
import { Pencil, Trash2, ImageOff, ZoomIn, EyeOff, History } from 'lucide-react';
import { formatPrice } from '../utils';

interface ProductCardProps {
  product: Product;
  viewMode: ViewMode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onImageClick: (imageUrls: string[]) => void;
  onIgnore: (product: Product) => void;
  onMovement: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode, onEdit, onDelete, onImageClick, onIgnore, onMovement }) => {
  const [imgError, setImgError] = useState(false);

  const totalStock = useMemo(() => {
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  }, [product.variants]);

  const priceDisplay = useMemo(() => {
    return formatPrice(product);
  }, [product]);

  const cardClasses = `
    bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-500/40
    ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-row'}
  `;
  const imageContainerClasses = viewMode === 'grid' ? 'w-full h-56' : 'w-1/3 flex-shrink-0 aspect-square';
  const contentClasses = `flex flex-col flex-grow ${viewMode === 'grid' ? 'p-4' : 'p-3 sm:p-4'}`;

  const handleImageError = () => setImgError(true);
  
  const hasImage = !imgError && product.imageUrls && product.imageUrls[0];

  const stockStatusColor = () => {
    if (totalStock > 10) return 'bg-brand-green';
    if (totalStock > 3) return 'bg-yellow-500';
    return 'bg-brand-red';
  };

  return (
    <div className={cardClasses}>
      <div 
        className={`${imageContainerClasses} relative bg-gray-700 ${hasImage ? 'cursor-pointer group' : ''}`}
        onClick={() => hasImage && onImageClick(product.imageUrls)}
      >
        {hasImage ? (
          <img src={product.imageUrls[0]} alt={product.title} className="w-full h-full object-cover" onError={handleImageError} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageOff size={48} /></div>
        )}
        {hasImage && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="text-white" size={48} />
          </div>
        )}
      </div>

      <div className={contentClasses}>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <p className="text-xs text-purple-400 font-semibold uppercase">{product.category}</p>
            {priceDisplay !== 'N/A' && (
              <span className={`w-2.5 h-2.5 rounded-full ${stockStatusColor()}`} title={`Stock Total: ${totalStock}`}></span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{product.title}</h3>
          {priceDisplay !== 'N/A' && <p className="text-xl font-light text-green-400 mt-1">{priceDisplay}</p>}
          {viewMode === 'grid' && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{product.details || product.description}</p>}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 mr-auto">
             <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Stock Total:</span>
             <span className="font-bold text-lg w-8 text-center">{totalStock}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMovement(product)}
              className="p-2 rounded-full text-green-400 hover:bg-green-500/20 transition-colors"
              aria-label="Historial de movimientos"
              title="Historial de movimientos"
            >
              <History size={18} />
            </button>
            <button
              onClick={() => onIgnore(product)}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-500/20 transition-colors"
              aria-label="Ocultar producto"
              title="Ocultar producto"
            >
              <EyeOff size={18} />
            </button>
            <button onClick={() => onEdit(product)} className="p-2 rounded-full text-blue-400 hover:bg-blue-500/20 transition-colors" title="Editar producto">
              <Pencil size={18} />
            </button>
            <button onClick={() => onDelete(product)} className="p-2 rounded-full text-red-400 hover:bg-red-500/20 transition-colors" title="Eliminar producto">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);