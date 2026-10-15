import React, { useState, useMemo } from 'react';
import { Product, Variant } from '../types';
import { CatalogItem } from '../catalogPagination';
import { formatPrice, formatCurrency, getPricedVariants } from '../utils';
import { Package } from 'lucide-react';

interface CatalogProductCardProps {
  item?: CatalogItem;
  product?: Product;
  isCompact?: boolean;
  compact?: boolean;
  showSeriesBadge?: boolean;
  showPrice?: boolean;
}

export const CatalogProductCard: React.FC<CatalogProductCardProps> = ({ 
  item,
  product: productProp, 
  isCompact = false,
  compact = false,
  showSeriesBadge = false,
  showPrice = true
}) => {
  const [imageError, setImageError] = useState(false);
  const isCompactMode = Boolean(isCompact || compact);

  // Determinar si viene de un item paginado con variantes asignadas o de un producto directo
  const product = item ? item.product : productProp!;
  const assignedVariants: Variant[] = useMemo(() => {
    if (item) return item.assignedVariants;
    if (!product) return [];
    return getPricedVariants(product, { onlyAvailable: true });
  }, [item, product]);

  const chunkIndex = item ? item.chunkIndex : 0;
  const totalChunks = item ? item.totalChunks : 1;
  const totalVariantsCount = item ? item.totalVariantsCount : (product?.variants?.length || 1);
  const variantStartIndex = item ? item.variantStartIndex : 1;
  const variantEndIndex = item ? item.variantEndIndex : assignedVariants.length;

  const hasUniformPrice = item 
    ? item.hasUniformPrice 
    : (assignedVariants.length > 1 && new Set(assignedVariants.map(v => v.price)).size === 1);
  const uniformPriceValue = item 
    ? item.uniformPriceValue 
    : (assignedVariants[0]?.price || 0);

  const seriesLabel = item?.seriesLabel || (product?.imageHint?.[0]?.split('|')[0]?.trim() || '');

  // Si alguna variante asignada a esta tarjeta tiene foto de referencia vinculada, usarla
  const variantPhoto = assignedVariants.find(v => v.imageUrl && v.imageUrl.trim() !== '')?.imageUrl;
  const rawImage = variantPhoto || (product?.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0].trim() : '');
  const hasValidImage = rawImage !== '' && !imageError;
  const totalStock = product?.variants ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0) : 0;

  // Calibración de proporción y altura:
  // - 6 productos (isCompactMode = false):
  //   * Con foto: proporción vertical 3:4 destacada (aspect-[3/4] min-h-[250px] sm:min-h-[260px] max-h-[290px] print:max-h-[84mm])
  //   * Sin foto: altura compacta h-32 (128px) para optimizar el espacio vertical y evitar vacíos
  // - 9 productos (isCompactMode = true):
  //   * Visualización horizontal y compacta con misma altura uniforme h-32 (128px) con y sin foto
  const imageContainerClass = isCompactMode
    ? 'h-32'
    : hasValidImage
      ? 'aspect-[3/4] min-h-[250px] sm:min-h-[260px] max-h-[290px] print:max-h-[84mm]'
      : 'h-32';

  return (
    <article className="border border-gray-200/90 rounded-lg overflow-hidden flex flex-col justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full">
      {/* Contenedor de Imagen o Fallback */}
      <div className={`w-full ${imageContainerClass} relative bg-gradient-to-br from-gray-50 via-purple-50/20 to-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-100 shrink-0`}>
        {hasValidImage ? (
          <img 
            src={rawImage} 
            alt={product.title} 
            className="w-full h-full object-cover" 
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center select-none">
            <div className="w-8 h-8 rounded-full bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-600 mb-1 shadow-xs">
              <Package size={16} className="text-purple-600 stroke-[1.75]" />
            </div>
            <span className="text-[10px] font-semibold text-gray-600 truncate max-w-[120px]">
              {seriesLabel || product.category}
            </span>
          </div>
        )}

        {/* Badge de Serie/Franquicia: visible solo en hojas mixtas para despejar la foto en series únicas */}
        {showSeriesBadge && seriesLabel && (
          <span className="absolute top-1.5 right-1.5 bg-gray-900/80 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded shadow-xs max-w-[110px] truncate">
            {seriesLabel}
          </span>
        )}

        {/* Badge de Stock en impresión */}
        {totalStock <= 0 && (
          <span className="absolute bottom-1.5 left-1.5 bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
            Agotado
          </span>
        )}
      </div>

      {/* Contenido descriptivo */}
      <div className={`${isCompactMode ? 'p-2' : 'p-2.5 sm:p-3'} flex flex-col flex-grow justify-between`}>
        <div>
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider truncate max-w-[120px]">
              {product.category}
            </span>
            {totalVariantsCount > 1 && (
              <span className="text-[9px] text-gray-400 font-medium">
                {totalVariantsCount} vars
              </span>
            )}
          </div>

          {/* Título en 2 líneas sin desbordar los 278mm */}
          <h3 
            className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 min-h-[2rem] leading-tight" 
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Solo incluir la descripción en el diseño compacto (9 productos) de forma concisa */}
          {isCompactMode && (
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 leading-normal">
              {product.details || product.description || 'Bloque coleccionable 4,5 cm. Plástico ABS.'}
            </p>
          )}
        </div>

        {/* Sección de Precio y Variantes con renderizado diferenciado */}
        {showPrice && (
          <div className={`${isCompactMode ? 'mt-1 pt-1' : 'mt-2 pt-2'} border-t border-gray-100`}>
            {hasUniformPrice && assignedVariants.length > 1 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                    Precio c/u ({totalVariantsCount} modelos):
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-green-700 tabular-nums">
                    {formatCurrency(uniformPriceValue || assignedVariants[0]?.price || 0)} c/u
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden pt-0.5">
                  {assignedVariants.map(v => (
                    <span 
                      key={v.id} 
                      className="text-[8px] sm:text-[9px] bg-purple-50 text-purple-700 border border-purple-200/80 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]"
                      title={v.name}
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : assignedVariants.length <= 1 && totalChunks <= 1 ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">Precio:</span>
                <span className="text-sm font-bold text-green-700">
                  {assignedVariants[0]?.price 
                    ? formatCurrency(assignedVariants[0].price)
                    : (product ? formatPrice(product, { onlyAvailable: true }) : '$0')}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-purple-700 font-semibold border-b border-purple-100/70 pb-0.5">
                  <span className="truncate">
                    {totalChunks > 1 
                      ? `Variantes (${variantStartIndex}–${variantEndIndex} de ${totalVariantsCount}):` 
                      : `Variantes (${totalVariantsCount} opciones):`}
                  </span>
                  {totalChunks > 1 && (
                    <span className="bg-purple-100 text-purple-800 text-[8px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ml-1">
                      Parte {chunkIndex + 1}/{totalChunks}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  {assignedVariants.map(v => (
                    <div key={v.id} className="flex items-center justify-between text-[11px] leading-tight">
                      <span className="text-gray-600 truncate max-w-[110px]" title={v.name}>
                        {v.name}:
                      </span>
                      <span className="font-bold text-green-700 tabular-nums">
                        {formatCurrency(v.price || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default React.memo(CatalogProductCard);

