import React, { useState, useMemo } from 'react';
import { Product, ViewMode } from '../types';
import { Pencil, Trash2, ImageOff, ZoomIn, EyeOff, History } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  viewMode: ViewMode;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onImageClick: (imageUrl: string) => void;
  onIgnore: (product: Product) => void;
  onMovement: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode, onEdit, onDelete, onImageClick, onIgnore, onMovement }) => {
  const [imgError, setImgError] = useState(false);

  const { totalStock, priceDisplay } = useMemo(() => {
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    
    let priceDisplay = 'N/A';
    const prices = product.variants
      .map(v => v.price ? parseFloat(v.price.replace(/[^0-9.-]+/g,"")) : NaN)
      .filter(p => !isNaN(p));
      
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const firstPriceString = product.variants.find(v => v.price)?.price || '';
      const currency = firstPriceString.replace(/[0-9.,\s]/g, '');

      if (minPrice === maxPrice) {
        priceDisplay = firstPriceString;
      } else {
        priceDisplay = `${minPrice.toLocaleString('es-CO')} - ${maxPrice.toLocaleString('es-CO')} ${currency}`;
      }
    } else if (product.variants.length > 0 && product.variants[0].price) {
        priceDisplay = product.variants[0].price;
    }


    return { totalStock, priceDisplay };
  }, [product.variants]);

  const cardClasses = `
    bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-500/40
    ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-col md:flex-row'}
  `;
  const imageContainerClasses = viewMode === 'grid' ? 'w-full h-56' : 'w-full md:w-1/3 h-64';
  const contentClasses = `p-4 flex flex-col flex-grow ${viewMode === 'grid' ? '' : 'md:w-2/3'}`;

  const handleImageError = () => setImgError(true);
  
  const hasImage = !imgError && product.imageUrls[0];

  const stockStatusColor = () => {
    if (totalStock > 10) return 'bg-brand-green';
    if (totalStock > 3) return 'bg-yellow-500';
    return 'bg-brand-red';
  };

  return (
    <div className={cardClasses}>
      <div 
        className={`${imageContainerClasses} relative bg-gray-700 ${hasImage ? 'cursor-pointer group' : ''}`}
        onClick={() => hasImage && onImageClick(product.imageUrls[0])}
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
          <p className="text-sm text-gray-300 mt-2">{product.details || product.description}</p>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-gray-300">Stock Total:</span>
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

export default ProductCard;
