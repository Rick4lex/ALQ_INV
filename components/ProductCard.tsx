import React, { useState, useMemo } from 'react';
import { Product, ViewMode } from '../types';
import { Pencil, Trash2, ImageOff, ZoomIn, EyeOff, Eye, History, CheckCircle, Square, CheckSquare, ChevronDown } from 'lucide-react';
import { formatPrice, formatCurrency, getPricedVariants, getProductPriceInfo } from '../utils';
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
  const [showVariantsDropdown, setShowVariantsDropdown] = useState(false);
  const [activeVariantImage, setActiveVariantImage] = useState<string | null>(null);

  const totalStock = useMemo(() => product.variants.reduce((sum, v) => sum + v.stock, 0), [product.variants]);
  const pricedVariants = useMemo(() => getPricedVariants(product), [product]);
  const priceInfo = useMemo(() => getProductPriceInfo(product), [product]);
  const displayedImage = activeVariantImage || (product.imageUrls && product.imageUrls[0]);
  const hasImage = !imgError && Boolean(displayedImage);
  const stockStatusColor = totalStock > 10 ? 'bg-brand-green' : totalStock > 3 ? 'bg-yellow-500' : 'bg-brand-red';

  const cardClasses = `
    bg-gray-800/50 backdrop-blur-sm border rounded-xl shadow-lg transition-all duration-300 relative
    ${showVariantsDropdown ? 'z-20' : 'z-0'}
    ${isFusionMode || isSelectionMode ? 'cursor-pointer' : ''}
    ${isSelected ? 'border-blue-500/80 ring-2 ring-blue-500/50 shadow-blue-500/30' : 
      isSelectedForFusion ? 'border-green-500/80 ring-2 ring-green-500/50 shadow-green-500/30' : 
      isIgnoredView ? 'border-yellow-500/40 hover:shadow-yellow-500/20 hover:border-yellow-500/60' : 
      'border-purple-500/20 hover:shadow-purple-500/20 hover:border-purple-500/40'
    }
    ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-row items-center'}
  `;

  const imageContainerClasses = viewMode === 'grid' 
    ? 'w-full h-56 rounded-t-xl overflow-hidden' 
    : 'w-28 h-28 rounded-l-xl overflow-hidden flex-shrink-0';
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
          if (hasImage && !isFusionMode && !isSelectionMode) {
            e.stopPropagation();
            const urls = activeVariantImage 
              ? [activeVariantImage, ...product.imageUrls.filter(u => u !== activeVariantImage)]
              : product.imageUrls;
            onImageClick(urls);
          }
        }}
      >
        {hasImage ? (
          <img src={displayedImage} alt={product.title} className="w-full h-full object-cover transition-opacity duration-200" onError={() => setImgError(true)} />
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
            {priceInfo.hasPricedVariants && <span className={`w-2.5 h-2.5 rounded-full ${stockStatusColor}`} title={`Stock Total: ${totalStock}`}></span>}
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{product.title}</h3>
          
          <div className="mt-2 flex flex-wrap gap-1">
            {(product.imageHint || []).slice(0, 3).map(hint => (
              <span key={hint} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{hint}</span>
            ))}
          </div>

          {priceInfo.hasPricedVariants && (
            <div className="relative mt-2">
              <div className="flex flex-wrap items-center gap-2">
                {priceInfo.isOutOfStock ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-light text-gray-400 line-through tabular-nums" title="Precio referencial (Agotado)">
                      {priceInfo.formatted}
                    </span>
                    <span className="text-[11px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 font-semibold tracking-wide">
                      Agotado
                    </span>
                  </div>
                ) : (
                  <p className="text-xl font-light text-green-400">{priceInfo.formatted}</p>
                )}

                {pricedVariants.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVariantsDropdown(prev => !prev);
                    }}
                    className="text-[11px] bg-gray-700/80 hover:bg-gray-700 text-purple-300 hover:text-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors border border-purple-500/30 font-medium cursor-pointer"
                    title="Ver todas las variantes y sus precios"
                  >
                    <span>{pricedVariants.length} vars</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showVariantsDropdown ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Lista desplegable flotante por encima de la tarjeta para evitar recortes */}
              {showVariantsDropdown && pricedVariants.length > 1 && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVariantsDropdown(false);
                    }} 
                  />
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: '#111827' }}
                    className="absolute left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-2.5rem)] bg-gray-950 border border-purple-500/70 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                      <span className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        Variantes Disponibles
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVariantsDropdown(false)}
                        className="text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {pricedVariants.map(v => {
                        const isOutOfStock = v.stock <= 0;
                        const isThisVariantImageActive = Boolean(v.imageUrl && activeVariantImage === v.imageUrl);
                        return (
                          <div 
                            key={v.id} 
                            onClick={(e) => {
                              if (v.imageUrl) {
                                e.stopPropagation();
                                setImgError(false);
                                setActiveVariantImage(prev => prev === v.imageUrl ? null : v.imageUrl!);
                              }
                            }}
                            style={{ backgroundColor: isOutOfStock ? '#181f2c' : '#1f2937' }}
                            className={`flex items-center justify-between text-xs py-2 px-2.5 rounded-lg border transition-all ${
                              v.imageUrl ? 'cursor-pointer hover:border-purple-400' : ''
                            } ${
                              isThisVariantImageActive ? 'ring-1 ring-purple-400 border-purple-500 bg-purple-950/40' : ''
                            } ${
                              isOutOfStock 
                                ? 'border-gray-800' 
                                : 'border-gray-700 hover:border-purple-500/40'
                            }`}
                            title={v.imageUrl ? 'Tocar para ver su foto asignada en la tarjeta' : undefined}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              {v.imageUrl && (
                                <img
                                  src={v.imageUrl}
                                  alt={v.name}
                                  className="w-5 h-5 rounded object-cover border border-purple-400/50 flex-shrink-0"
                                />
                              )}
                              <div className="truncate">
                                <span className={`font-semibold block truncate ${isOutOfStock ? 'text-gray-400' : 'text-white'}`} title={v.name}>
                                  {v.name}
                                </span>
                                <span className={`text-[10px] font-medium ${isOutOfStock ? 'text-red-400' : 'text-gray-400'}`}>
                                  {isOutOfStock ? 'Sin stock (0)' : `Stock: ${v.stock}`}
                                </span>
                              </div>
                            </div>
                            <span className={`tabular-nums whitespace-nowrap ${
                              isOutOfStock 
                                ? 'text-gray-500 line-through font-semibold text-xs' 
                                : 'text-green-400 font-bold text-xs'
                            }`}>
                              {formatCurrency(v.price!)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
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