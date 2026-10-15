import React from 'react';
import { CatalogPage as CatalogPageData } from '../catalogPagination';
import CatalogProductCard from './CatalogProductCard';
import { Sparkles, Calendar, Layers } from 'lucide-react';

const ALQUIMA_LOGO_URL = 'https://res.cloudinary.com/dyeppbrfl/image/upload/v1791854716/Gemini_Generated_Image_ggtjwoggtjwoggtj_zzrvqe.png';

interface CatalogPageProps {
  page: CatalogPageData;
  pageSize?: number;
  showPrices?: boolean;
  totalCatalogProducts?: number;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ 
  page, 
  pageSize = 6, 
  showPrices = true,
  totalCatalogProducts
}) => {
  const isCompact = pageSize === 9;
  const isFirstPage = page.pageNumber === 1;

  return (
    <section 
      className="catalog-page bg-white text-gray-900 flex flex-col justify-between mb-8 p-6 sm:p-8 rounded-sm shadow-xl border border-gray-200/80 transition-shadow"
    >
      {/* Encabezado de Página */}
      <div className="w-full">
        {isFirstPage ? (
          <header className="text-center mb-4 sm:mb-5 border-b-2 border-emerald-500 pb-3 sm:pb-4">
            <div className="flex items-center justify-center mb-1.5">
              <img 
                src={ALQUIMA_LOGO_URL} 
                alt="Alquima Mizu" 
                className="h-10 sm:h-12 max-w-[260px] object-contain drop-shadow-xs" 
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 font-semibold tracking-wide">
              Catálogo Oficial de Productos
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-700">
                <Calendar size={12} className="text-emerald-600" />
                {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>

              {totalCatalogProducts !== undefined && (
                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-700">
                  <Layers size={12} className="text-emerald-600" />
                  {totalCatalogProducts} {totalCatalogProducts === 1 ? 'producto' : 'productos'} en catálogo
                </span>
              )}

              {page.sectionTitle && (
                <div className="inline-flex items-center gap-1.5 bg-teal-50/90 border border-teal-200/80 text-teal-800 px-3 py-1 rounded-md max-w-[72%]">
                  <span className="text-[9.5px] font-bold uppercase tracking-wide truncate">
                    {page.sectionTitle}
                  </span>
                  {!page.isFirstPageOfSection && !page.isMixedSection && (
                    <span className="text-[8.5px] font-medium lowercase shrink-0">(cont.)</span>
                  )}
                </div>
              )}
            </div>
          </header>
        ) : (
          <header className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <img 
                src={ALQUIMA_LOGO_URL} 
                alt="Alquima Mizu" 
                className="h-5 w-auto max-w-[110px] object-contain" 
                referrerPolicy="no-referrer"
              />
              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">• Catálogo Oficial</span>
            </div>

            {page.sectionTitle && (
              <div className="inline-flex items-center gap-1.5 bg-teal-50/90 border border-teal-200/80 text-teal-800 px-3 py-1 rounded-md max-w-[72%]" title={page.sectionTitle}>
                <span className="text-[9.5px] font-bold uppercase tracking-wide truncate">
                  {page.sectionTitle}
                </span>
                {!page.isFirstPageOfSection && !page.isMixedSection && (
                  <span className="text-[8.5px] font-medium lowercase shrink-0">(cont.)</span>
                )}
              </div>
            )}
          </header>
        )}

        {/* Cuadrícula de Productos Fija (3 columnas) */}
        <div className={`catalog-grid grid grid-cols-3 ${isCompact ? 'gap-2' : 'gap-3'}`}>
          {page.items && page.items.length > 0 ? (
            page.items.map((item) => (
              <CatalogProductCard 
                key={item.key} 
                item={item} 
                isCompact={isCompact}
                compact={isCompact}
                showSeriesBadge={page.isMixedSection}
                showPrice={showPrices}
              />
            ))
          ) : (
            (page.products || []).map((product) => (
              <CatalogProductCard 
                key={product.id} 
                product={product} 
                isCompact={isCompact}
                compact={isCompact}
                showSeriesBadge={page.isMixedSection}
                showPrice={showPrices}
              />
            ))
          )}
        </div>
      </div>

      {/* Pie de Página Institucional */}
      <footer className="w-full flex items-center justify-between text-xs text-gray-400 border-t border-gray-200 pt-2.5 mt-3 sm:mt-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 text-[11px]">Alquima Mizu</span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-gray-400 text-[10px] hidden sm:inline">Disponibilidad sujeta a existencias</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full text-[10px] border border-gray-200">
            Página {page.pageNumber} de {page.totalPages}
          </span>
        </div>
      </footer>
    </section>
  );
};

export default React.memo(CatalogPage);
