import { Product } from './types';
import { productSortComparator } from './utils';

export type CatalogGroupMode = 'none' | 'series' | 'category';

export interface CatalogPage {
  pageNumber: number;
  totalPages: number;
  sectionTitle?: string;
  isFirstPageOfSection: boolean;
  products: Product[];
}

export interface CatalogPaginationOptions {
  pageSize?: number;
  groupMode?: CatalogGroupMode;
}

/**
 * Divide y organiza una lista de productos en páginas estructuradas para impresión y PDF.
 * Soporta paginación continua o segmentada por Series/Colecciones (imageHint) o Categorías.
 */
export const paginateCatalog = (
  products: Product[],
  options: CatalogPaginationOptions = {}
): CatalogPage[] => {
  const { pageSize = 6, groupMode = 'series' } = options;

  if (!products || products.length === 0) {
    return [];
  }

  const sorted = [...products].sort(productSortComparator);

  // Modo Continuo (sin saltos por sección)
  if (groupMode === 'none') {
    const totalPages = Math.ceil(sorted.length / pageSize) || 1;
    const pages: CatalogPage[] = [];

    for (let i = 0; i < sorted.length; i += pageSize) {
      const pageIndex = Math.floor(i / pageSize) + 1;
      pages.push({
        pageNumber: pageIndex,
        totalPages,
        isFirstPageOfSection: pageIndex === 1,
        products: sorted.slice(i, i + pageSize),
      });
    }

    return pages;
  }

  // Modo Agrupado por Serie / Franquicia (imageHint)
  if (groupMode === 'series') {
    const groups: Record<string, Product[]> = {};

    sorted.forEach(product => {
      const series = (product.imageHint && product.imageHint.length > 0 && product.imageHint[0].trim())
        ? product.imageHint[0].trim()
        : 'Colección General';

      if (!groups[series]) {
        groups[series] = [];
      }
      groups[series].push(product);
    });

    const preliminaryPages: Array<{
      sectionTitle: string;
      isFirstPageOfSection: boolean;
      products: Product[];
    }> = [];

    const sortedSeriesKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    sortedSeriesKeys.forEach(seriesName => {
      const seriesProducts = groups[seriesName];
      for (let i = 0; i < seriesProducts.length; i += pageSize) {
        preliminaryPages.push({
          sectionTitle: seriesName,
          isFirstPageOfSection: i === 0,
          products: seriesProducts.slice(i, i + pageSize),
        });
      }
    });

    const totalPages = preliminaryPages.length || 1;

    return preliminaryPages.map((page, index) => ({
      pageNumber: index + 1,
      totalPages,
      sectionTitle: page.sectionTitle,
      isFirstPageOfSection: page.isFirstPageOfSection,
      products: page.products,
    }));
  }

  // Modo Agrupado por Categoría
  if (groupMode === 'category') {
    const groups: Record<string, Product[]> = {};

    sorted.forEach(product => {
      const cat = product.category ? product.category.trim() : 'General';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(product);
    });

    const preliminaryPages: Array<{
      sectionTitle: string;
      isFirstPageOfSection: boolean;
      products: Product[];
    }> = [];

    const sortedCats = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    sortedCats.forEach(catName => {
      const catProducts = groups[catName];
      for (let i = 0; i < catProducts.length; i += pageSize) {
        preliminaryPages.push({
          sectionTitle: catName.toUpperCase(),
          isFirstPageOfSection: i === 0,
          products: catProducts.slice(i, i + pageSize),
        });
      }
    });

    const totalPages = preliminaryPages.length || 1;

    return preliminaryPages.map((page, index) => ({
      pageNumber: index + 1,
      totalPages,
      sectionTitle: page.sectionTitle,
      isFirstPageOfSection: page.isFirstPageOfSection,
      products: page.products,
    }));
  }

  return [];
};
