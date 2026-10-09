import React, { useMemo } from 'react';
import { Product } from '../types';
import { Sparkles } from 'lucide-react';
import { paginateCatalog, CatalogGroupMode } from '../catalogPagination';
import CatalogPage from './CatalogPage';

interface CatalogPreviewProps {
  products: Product[];
  pageSize?: number;
  groupMode?: CatalogGroupMode;
  showPrices?: boolean;
}

const CatalogPreview: React.FC<CatalogPreviewProps> = ({ 
  products, 
  pageSize = 6, 
  groupMode = 'series',
  showPrices = true
}) => {
  const pages = useMemo(() => {
    return paginateCatalog(products, { pageSize, groupMode });
  }, [products, pageSize, groupMode]);

  if (pages.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Sparkles className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="text-lg font-medium">No hay productos para mostrar en este catálogo.</p>
        <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de series o disponibilidad.</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-gray-800">
      {pages.map((page) => (
        <CatalogPage 
          key={page.pageNumber}
          page={page}
          pageSize={pageSize}
          showPrices={showPrices}
          totalCatalogProducts={products.length}
        />
      ))}
    </div>
  );
};

export default React.memo(CatalogPreview);
