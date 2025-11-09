
import React, { useState, useMemo } from 'react';
import { Product, ViewMode } from '../types';
import { Pencil, Trash2, ImageOff, ZoomIn, EyeOff, Eye, History, CheckCircle, Square, CheckSquare } from 'lucide-react';
import { formatPrice } from '../utils';
import { useAppContext } from '../contexts/AppContext';

interface ProductCardProps {
  product: Product;
  viewMode: ViewMode;
  onImageClick: (imageUrls: string[]) => void;
  isIgnoredView?: boolean;
  isFusionMode?: boolean;
  isSelectedForFusion?: boolean;
  onSelectForFusion?: (productId: string) => void;
  isSelected?: boolean;
  onToggleSelection?: (productId: string) => void;
  isSelectionMode?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, viewMode, onImageClick,
  isIgnoredView = false, isFusionMode = false, isSelectedForFusion = false, onSelectForFusion,
  isSelected = false, onToggleSelection, isSelectionMode = false,
}) => {
  const { setModal, handleRestoreProduct } = useAppContext();
  const [imgError, setImgError] = useState(false);

  const totalStock = useMemo(() => product.variants.reduce((sum, v) => sum + v.stock, 0), [product.variants]);
  const priceDisplay = useMemo(() => formatPrice(product), [product]);
  const hasImage = !imgError && product.imageUrls && product.imageUrls[0];
  const stockStatusColor = totalStock > 10 ? 'bg-brand-green' : totalStock > 3 ? 'bg-yellow-500' : 'bg-brand-red';

  const cardClasses = `
    bg-gray-800/50 backdrop-blur-sm border rounded-xl shadow-lg overflow-hidden transition-all duration-300 relative
    ${isFusionMode || isSelectionMode ? 'cursor-pointer' : ''}
    ${isSelected ? 'border-blue-500/80 ring-2 ring-blue-500/50 shadow-blue-500/30' : 
      isSelectedForFusion ? 'border-green-500/80 ring-2 ring-green-500/50 shadow-green-500/30' : 
      isIgnoredView ? 'border-yellow-500/40 hover:shadow-yellow-500/20 hover:border-yellow-500/60' : 
      'border-purple-500/20 hover:shadow-purple-500/20 hover:border-purple-500/40'
    }
    ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-row items-center'}
  `;

  const imageContainerClasses = viewMode === 'grid' ? 'w-full h-56' : 'w-28 h-28 flex-shrink-0';
  const contentClasses = `flex flex-col flex-grow ${viewMode === 'grid' ? 'p-4' : 'p-3'}`;

  const handleCardClick = () => {
    if (isFusionMode && onSelectForFusion) onSelectForFusion(product.id);
    else if (isSelectionMode && onToggleSelection) onToggleSelection(product.id);
  };

  const SelectionIcon = isSelected ? CheckSquare : Square;

  return (
    <div className={cardClasses} onClick={handleCardClick}>
      {isSelectedForFusion && (
        <div className="absolute top-2 right-2 z-10 bg-green-600 text-white rounded-full p-1"><CheckCircle size={20} /></div>
      )}
      {isSelectionMode && (
          <div className="absolute top-2 left-2 z-10 text-white p-1" onClick={(e) => { e.stopPropagation(); onToggleSelection?.(product.id); }}>
            <SelectionIcon size={24} className={isSelected ? "text-blue-400" : "text-gray-400"} />
          </div>
      )}
      <div 
        className={`${imageContainerClasses} relative bg-gray-700 ${hasImage && !isFusionMode && !isSelectionMode ? 'cursor-pointer group' : ''}`}
        onClick={(e) => {
          if (hasImage && !isFusionMode && !isSelectionMode) { e.stopPropagation(); onImageClick(product.imageUrls); }
        }}
      >
        {hasImage ? (
          <img src={product.imageUrls[0]} alt={product.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageOff size={48} /></div>
        )}
        {hasImage && !isFusionMode && !isSelectionMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="text-white" size={48} />
          </div>
        )}
      </div>

      <div className={contentClasses}>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <p className="text-xs text-purple-400 font-semibold uppercase">{product.category}</p>
            {priceDisplay !== 'N/A' && <span className={`w-2.5 h-2.5 rounded-full ${stockStatusColor}`} title={`Stock Total: ${totalStock}`}></span>}
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{product.title}</h3>
          
          <div className="mt-2 flex flex-wrap gap-1">
            {(product.imageHint || []).slice(0, 3).map(hint => (
              <span key={hint} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{hint}</span>
            ))}
          </div>

          {priceDisplay !== 'N/A' && <p className="text-xl font-light text-green-400 mt-2">{priceDisplay}</p>}
          {viewMode === 'grid' && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{product.details || product.description}</p>}
        </div>
        
        {!isFusionMode && !isSelectionMode && (
          <div className={`${viewMode === 'grid' ? 'mt-4 pt-4 border-t' : 'mt-2 pt-2 border-t'} border-gray-700 flex flex-wrap items-center justify-end ${viewMode === 'grid' ? 'gap-x-4 gap-y-2' : 'gap-2'}`}>
            <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mr-auto' : ''}`}>
               <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Stock Total:</span>
               <span className="font-bold text-lg w-8 text-center">{totalStock}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'movements', product }); }} className="p-2 rounded-full text-green-400 hover:bg-green-500/20" title="Historial"><History size={18} /></button>
              {isIgnoredView ? (
                <button onClick={(e) => { e.stopPropagation(); handleRestoreProduct(product); }} className="p-2 rounded-full text-yellow-400 hover:bg-yellow-500/20" title="Restaurar"><Eye size={18} /></button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'ignore', product }); }} className="p-2 rounded-full text-gray-400 hover:bg-gray-500/20" title="Ocultar"><EyeOff size={18} /></button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', product }); }} className="p-2 rounded-full text-blue-400 hover:bg-blue-500/20" title="Editar"><Pencil size={18} /></button>
              <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete', product }); }} className="p-2 rounded-full text-red-400 hover:bg-red-500/20" title="Eliminar"><Trash2 size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProductCard);
