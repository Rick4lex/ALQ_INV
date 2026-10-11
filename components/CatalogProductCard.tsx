import React, { useState } from 'react';
import { Product } from '../types';
import { formatPrice } from '../utils';
import { Package, Sparkles } from 'lucide-react';

interface CatalogProductCardProps {
  product: Product;
  compact?: boolean; // compact === true cuando pageSize === 9
  showPrice?: boolean;
}

export const CatalogProductCard: React.FC<CatalogProductCardProps> = ({ 
  product, 
  compact = false,
  showPrice = true
}) => {
  const [imageError, setImageError] = useState(false);

  const rawImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0].trim() : '';
  const hasValidImage = rawImage !== '' && !imageError;
  const primaryHint = product.imageHint && product.imageHint.length > 0 ? product.imageHint[0] : null;
  const totalStock = product.variants ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0) : 0;
  const variantCount = product.variants ? product.variants.length : 1;

  // Para 6 productos (compact = false):
  // Si tiene foto válida: aspecto vertical marcado 3:4 con altura generosa (h-64 sm:h-72 o aspect-[3/4] max-h-72) destacando el producto
  // Si no tiene foto: aspecto compacto similar al diseño de 9 productos (h-28 o h-32) para que ocupe menos espacio
  const imageContainerClass = compact
    ? 'h-32'
    : hasValidImage
      ? 'aspect-[3/4] max-h-72 min-h-[220px]'
      : 'h-28 sm:h-32';

  return (
    <article className="border border-gray-200/90 rounded-lg overflow-hidden flex flex-col justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-shadow h-full">
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
          <div className="flex flex-col items-center justify-center p-3 text-center select-none">
            <div className="w-10 h-10 rounded-full bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-600 mb-1.5 shadow-xs">
              <Package size={20} className="text-purple-600 stroke-[1.75]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-600 truncate max-w-[130px]">
              {primaryHint || product.category}
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5">Figura Coleccionable</span>
          </div>
        )}

        {/* Badge de Serie/Franquicia */}
        {primaryHint && (
          <span className="absolute top-1.5 right-1.5 bg-gray-900/75 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded shadow-xs max-w-[120px] truncate">
            {primaryHint}
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
      <div className={`${compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} flex flex-col flex-grow justify-between`}>
        <div>
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
              {product.category}
            </span>
            {variantCount > 1 && (
              <span className="text-[9px] text-gray-400 font-medium">
                {variantCount} vars
              </span>
            )}
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 leading-snug" title={product.title}>
            {product.title}
          </h3>

          {/* Solo incluir la descripción en el diseño compacto (9 productos), omitir en el de 6 productos */}
          {compact && (
            <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {product.details || product.description || 'Bloque de construcción de 4,5 cm. Plástico ABS de alta calidad.'}
            </p>
          )}
        </div>

        {/* Sección de Precio */}
        {showPrice && (
          <div className={`${compact ? 'mt-1.5 pt-1.5' : 'mt-2 pt-2'} border-t border-gray-100 flex items-center justify-between`}>
            <span className="text-[11px] text-gray-400 font-medium">Precio:</span>
            <span className="text-sm font-bold text-green-700">
              {formatPrice(product, { onlyAvailable: true })}
            </span>
          </div>
        )}
      </div>
    </article>
  );
};

export default React.memo(CatalogProductCard);
