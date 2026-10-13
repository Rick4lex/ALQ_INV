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
      className="catalog-page bg-white text-gray-900 flex flex-col justify-between mb-10 pb-6 border-b border-gray-300 last:border-b-0 last:mb-0 last:pb-0"
    >
      {/* Encabezado de Página */}
      <div className="w-full">
        {isFirstPage ? (
          <header className="text-center mb-6 border-b-2 border-emerald-500 pb-5">
            <div className="flex items-center justify-center mb-2">
              <img 
                src={ALQUIMA_LOGO_URL} 
                alt="Alquima Mizu" 
                className="h-12 md:h-14 max-w-[280px] object-contain drop-shadow-sm" 
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-sm md:text-base text-gray-600 font-semibold mt-0.5 tracking-wide">
              Catálogo Oficial de Productos
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full font-medium text-gray-700">
                <Calendar size={13} className="text-emerald-600" />
                {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>

              {totalCatalogProducts !== undefined && (
                <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full font-medium text-gray-700">
                  <Layers size={13} className="text-emerald-600" />
                  {totalCatalogProducts} {totalCatalogProducts === 1 ? 'producto' : 'productos'} en catálogo
                </span>
              )}

              {page.sectionTitle && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 font-bold uppercase tracking-wide px-3 py-1 rounded-full border border-emerald-200">
                  Sección: {page.sectionTitle}
                </span>
              )}
            </div>
          </header>
        ) : (
          <header className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-4">
            <div className="flex items-center gap-2">
              <img 
                src={ALQUIMA_LOGO_URL} 
                alt="Alquima Mizu" 
                className="h-5 w-auto max-w-[120px] object-contain" 
                referrerPolicy="no-referrer"
              />
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">• Catálogo Oficial</span>
            </div>

            {page.sectionTitle && (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded border border-emerald-200/80">
                <span>{page.sectionTitle}</span>
                {!page.isFirstPageOfSection && (
                  <span className="text-[10px] text-emerald-600 font-normal lowercase">(cont.)</span>
                )}
              </div>
            )}
          </header>
        )}

        {/* Cuadrícula de Productos Fija (3 columnas) */}
        <div className={`grid grid-cols-3 ${isCompact ? 'gap-2.5' : 'gap-3.5'}`}>
          {page.products.map((product) => (
            <CatalogProductCard 
              key={product.id} 
              product={product} 
              compact={isCompact}
              showPrice={showPrices}
            />
          ))}
        </div>
      </div>

      {/* Pie de Página Institucional */}
      <footer className="w-full flex items-center justify-between text-xs text-gray-400 border-t border-gray-200 pt-3 mt-6">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-600">Alquima Mizu</span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-gray-400 text-[11px] hidden sm:inline">Disponibilidad sujeta a existencias</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-[11px] border border-gray-200">
            Página {page.pageNumber} de {page.totalPages}
          </span>
        </div>
      </footer>
    </section>
  );
};

export default React.memo(CatalogPage);
