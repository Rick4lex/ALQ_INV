import React from 'react';
import { CatalogPage as CatalogPageData } from '../catalogPagination';
import CatalogProductCard from './CatalogProductCard';
import { Sparkles, Calendar, Layers } from 'lucide-react';

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
          <header className="text-center mb-6 border-b-2 border-purple-600 pb-5">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Alquima Mizu
              </h1>
            </div>
            <p className="text-sm md:text-base text-purple-700 font-semibold mt-0.5">
              Catálogo Oficial de Productos
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full font-medium text-gray-700">
                <Calendar size={13} className="text-purple-600" />
                {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>

              {totalCatalogProducts !== undefined && (
                <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full font-medium text-gray-700">
                  <Layers size={13} className="text-purple-600" />
                  {totalCatalogProducts} {totalCatalogProducts === 1 ? 'producto' : 'productos'} en catálogo
                </span>
              )}

              {page.sectionTitle && (
                <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-900 font-bold uppercase tracking-wide px-3 py-1 rounded-full border border-purple-200">
                  Sección: {page.sectionTitle}
                </span>
              )}
            </div>
          </header>
        ) : (
          <header className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="font-extrabold text-xs sm:text-sm text-gray-900 tracking-wide uppercase">
                Alquima Mizu
              </span>
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">• Catálogo Oficial</span>
            </div>

            {page.sectionTitle && (
              <div className="flex items-center gap-1.5 bg-purple-50 text-purple-800 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded border border-purple-200/80">
                <span>{page.sectionTitle}</span>
                {!page.isFirstPageOfSection && (
                  <span className="text-[10px] text-purple-500 font-normal lowercase">(cont.)</span>
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
