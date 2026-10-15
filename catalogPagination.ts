import { Product, Variant } from './types';

export interface CatalogItem {
  key: string;
  product: Product;
  assignedVariants: Variant[];
  chunkIndex: number;
  totalChunks: number;
  totalVariantsCount: number;
  variantStartIndex: number;
  variantEndIndex: number;
  hasUniformPrice: boolean;
  uniformPriceValue: number;
  seriesLabel: string;
}

export interface CatalogPageData {
  pageNumber: number;
  totalPages: number;
  sectionTitle: string;
  isFirstPageOfSection: boolean;
  isMixedSection: boolean; // Indica si la hoja agrupa múltiples series pequeñas
  items: CatalogItem[];
  products?: Product[];
}

// Aliases para compatibilidad con el resto del proyecto
export type CatalogPage = CatalogPageData;
export type CatalogGroupMode = 'none' | 'series' | 'category';

export interface CatalogPaginationOptions {
  pageSize?: number | 6 | 9;
  groupMode?: CatalogGroupMode;
  onlyAvailable?: boolean; // Sincronizado con el filtro "Solo disponibles" del modal
  packSmallSeries?: boolean; // Activa la compactación de series de 1 a 3 tarjetas
}

/**
 * Extrae el nombre principal de la serie ignorando sub-etiquetas después de '|'
 */
export function getPrimarySeriesName(product: Product): string {
  const rawHint = product.imageHint?.[0] || 'General';
  return rawHint.split('|')[0].trim() || 'General';
}

/**
 * Expande o consolida las variantes de cada producto según igualdad de precios y stock
 */
export function expandProductsForCatalog(
  products: Product[],
  pageSize: number = 6,
  onlyAvailable: boolean = true
): CatalogItem[] {
  const isCompact = pageSize === 9;
  const items: CatalogItem[] = [];

  for (const product of products) {
    const rawVariants = Array.isArray(product.variants) ? product.variants : [];
    const seriesLabel = getPrimarySeriesName(product);

    // 1. Filtrar variantes: si "onlyAvailable" está activo, exigir stock > 0 y precio > 0
    let validVariants = rawVariants.filter((v) => {
      const hasPrice = Number(v.price) > 0;
      const hasStock = Number(v.stock) > 0;
      return onlyAvailable ? hasPrice && hasStock : hasPrice;
    });

    // Fallback seguro si un producto no tiene variantes con precio > 0
    if (validVariants.length === 0) {
      validVariants = onlyAvailable
        ? rawVariants.filter((v) => Number(v.stock) > 0)
        : rawVariants;
      if (validVariants.length === 0) validVariants = rawVariants;
    }

    const totalVariantsCount = validVariants.length;

    // 2. Verificar si todas las variantes activas tienen exactamente el mismo precio
    const uniquePrices = Array.from(
      new Set(validVariants.map((v) => Number(v.price) || 0).filter((p) => p > 0))
    );
    const hasUniformPrice = uniquePrices.length === 1;
    const uniformPriceValue = hasUniformPrice ? uniquePrices[0] : 0;

    // 3. Definir límite de variantes por tarjeta:
    // - Precios iguales: hasta 8 variantes en modo 6 prods (chips) o 6 en modo 9 prods.
    // - Precios distintos: máximo 3 variantes en modo 6 prods o 2 en modo 9 prods.
    const maxVariantsPerCard = hasUniformPrice
      ? (isCompact ? 6 : 8)
      : (isCompact ? 2 : 3);

    if (totalVariantsCount <= maxVariantsPerCard) {
      items.push({
        key: `${product.id}-chunk-0`,
        product,
        assignedVariants: validVariants,
        chunkIndex: 0,
        totalChunks: 1,
        totalVariantsCount,
        variantStartIndex: 1,
        variantEndIndex: Math.max(1, totalVariantsCount),
        hasUniformPrice,
        uniformPriceValue,
        seriesLabel,
      });
    } else {
      const totalChunks = Math.ceil(totalVariantsCount / maxVariantsPerCard);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * maxVariantsPerCard;
        const chunkAssignedVariants = validVariants.slice(start, start + maxVariantsPerCard);
        items.push({
          key: `${product.id}-chunk-${i}`,
          product,
          assignedVariants: chunkAssignedVariants,
          chunkIndex: i,
          totalChunks,
          totalVariantsCount,
          variantStartIndex: start + 1,
          variantEndIndex: start + chunkAssignedVariants.length,
          hasUniformPrice,
          uniformPriceValue,
          seriesLabel,
        });
      }
    }
  }

  return items;
}

/**
 * Pagina el catálogo ordenando primero las series de mayor volumen y
 * compactando al final las series pequeñas (1 a 3 tarjetas) en hojas compartidas.
 */
export function paginateCatalog(
  products: Product[],
  options: CatalogPaginationOptions = {}
): CatalogPageData[] {
  const {
    pageSize = 6,
    groupMode = 'series',
    onlyAvailable = true,
    packSmallSeries = true,
  } = options;

  const preliminaryPages: Omit<CatalogPageData, 'pageNumber' | 'totalPages'>[] = [];

  if (groupMode === 'series') {
    const groups: Record<string, { displayTitle: string; items: CatalogItem[] }> = {};

    // Agrupar productos normalizando mayúsculas/minúsculas (ej. DanDaDan == Dandadan)
    for (const product of products) {
      const primarySeries = getPrimarySeriesName(product);
      const normKey = primarySeries.toLowerCase();

      if (!groups[normKey]) {
        groups[normKey] = {
          displayTitle: primarySeries,
          items: [],
        };
      }
      const expanded = expandProductsForCatalog([product], pageSize, onlyAvailable);
      groups[normKey].items.push(...expanded);
    }

    const allSeriesGroups = Object.values(groups).filter((g) => g.items.length > 0);

    // Separar series principales (>3 tarjetas) y series pequeñas (1 a 3 tarjetas)
    const SMALL_SERIES_THRESHOLD = 3;
    const mainSeries = packSmallSeries
      ? allSeriesGroups.filter((g) => g.items.length > SMALL_SERIES_THRESHOLD)
      : allSeriesGroups;
    const smallSeries = packSmallSeries
      ? allSeriesGroups.filter((g) => g.items.length <= SMALL_SERIES_THRESHOLD)
      : [];

    // Ordenar por volumen de tarjetas (mayor a menor) y desempate alfabético
    const sortByVolumeDesc = (
      a: { displayTitle: string; items: CatalogItem[] },
      b: { displayTitle: string; items: CatalogItem[] }
    ) => {
      if (b.items.length !== a.items.length) {
        return b.items.length - a.items.length;
      }
      return a.displayTitle.localeCompare(b.displayTitle, 'es', { sensitivity: 'base' });
    };

    mainSeries.sort(sortByVolumeDesc);
    smallSeries.sort(sortByVolumeDesc);

    // 1. Generar páginas dedicadas para las series principales
    for (const group of mainSeries) {
      for (let i = 0; i < group.items.length; i += pageSize) {
        const pageItems = group.items.slice(i, i + pageSize);
        preliminaryPages.push({
          sectionTitle: group.displayTitle,
          isFirstPageOfSection: i === 0,
          isMixedSection: false,
          items: pageItems,
          products: pageItems.map((item) => item.product),
        });
      }
    }

    // 2. Empaquetar de forma continua las series pequeñas (hasta llenar las 6 o 9 casillas por hoja)
    if (smallSeries.length > 0) {
      const packedSmallItems: CatalogItem[] = [];
      for (const group of smallSeries) {
        packedSmallItems.push(...group.items);
      }

      for (let i = 0; i < packedSmallItems.length; i += pageSize) {
        const pageItems = packedSmallItems.slice(i, i + pageSize);
        const uniqueSeriesInPage = Array.from(
          new Set(pageItems.map((item) => item.seriesLabel.toUpperCase()))
        );

        preliminaryPages.push({
          sectionTitle: uniqueSeriesInPage.join(' • '),
          isFirstPageOfSection: true,
          isMixedSection: uniqueSeriesInPage.length > 1,
          items: pageItems,
          products: pageItems.map((item) => item.product),
        });
      }
    }
  } else if (groupMode === 'category') {
    const groups: Record<string, { displayTitle: string; items: CatalogItem[] }> = {};
    for (const product of products) {
      const cat = (product.category || 'General').trim();
      const normKey = cat.toLowerCase();
      if (!groups[normKey]) {
        groups[normKey] = { displayTitle: cat, items: [] };
      }
      groups[normKey].items.push(...expandProductsForCatalog([product], pageSize, onlyAvailable));
    }

    const sortedCategories = Object.values(groups).sort((a, b) =>
      b.items.length - a.items.length
    );

    for (const group of sortedCategories) {
      for (let i = 0; i < group.items.length; i += pageSize) {
        const pageItems = group.items.slice(i, i + pageSize);
        preliminaryPages.push({
          sectionTitle: group.displayTitle,
          isFirstPageOfSection: i === 0,
          isMixedSection: true, // Mostrar badge de serie en cada foto cuando se agrupa por categoría
          items: pageItems,
          products: pageItems.map((item) => item.product),
        });
      }
    }
  } else {
    // Flujo continuo sin agrupación
    const allItems = expandProductsForCatalog(products, pageSize, onlyAvailable);
    for (let i = 0; i < allItems.length; i += pageSize) {
      const pageItems = allItems.slice(i, i + pageSize);
      preliminaryPages.push({
        sectionTitle: 'Catálogo General',
        isFirstPageOfSection: i === 0,
        isMixedSection: true,
        items: pageItems,
        products: pageItems.map((item) => item.product),
      });
    }
  }

  const totalPages = preliminaryPages.length;
  return preliminaryPages.map((page, idx) => ({
    ...page,
    pageNumber: idx + 1,
    totalPages,
  }));
}
