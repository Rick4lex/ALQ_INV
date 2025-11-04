import { Product, Variant } from './types';

export const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-CO')}`;

export const getSortPrice = (product: Product): number => {
  const prices = product.variants
    .map(v => v.price)
    .filter((p): p is number => typeof p === 'number' && p > 0);
    
  if (prices.length === 0) {
    return -1; // Productos sin precio o con precio 0 van primero
  }
  
  return Math.min(...prices);
};

export const productSortComparator = (a: Product, b: Product): number => {
    const priceA = getSortPrice(a);
    const priceB = getSortPrice(b);

    if (priceA === -1 && priceB !== -1) return -1;
    if (priceA !== -1 && priceB === -1) return 1;
    if (priceA === -1 && priceB === -1) return a.title.localeCompare(b.title);

    return priceA - priceB;
};

export const formatVariantPrice = (variant: Variant, options: { markdown?: boolean } = {}): string => {
  const { markdown = false } = options;
  if (typeof variant.price !== 'number' || variant.price <= 0) return '';

  let priceDisplay = formatCurrency(variant.price);
  
  if (variant.itemCount && variant.itemCount > 1) {
    const perItemPrice = Math.round(variant.price / variant.itemCount);
    priceDisplay += ` (${formatCurrency(perItemPrice)} c/u)`;
  }
  
  return markdown ? `*${priceDisplay}*` : priceDisplay;
};

export const formatPrice = (product: Product, options: { markdown?: boolean; onlyAvailable?: boolean } = {}): string => {
  const { markdown = false, onlyAvailable = false } = options;

  let variantsToConsider = product.variants.filter(v => typeof v.price === 'number' && v.price > 0);
  if (onlyAvailable) {
    variantsToConsider = variantsToConsider.filter(v => v.stock > 0);
  }

  if (variantsToConsider.length === 0) {
    return onlyAvailable ? "Consultar" : "N/A";
  }

  if (variantsToConsider.length === 1) {
    return formatVariantPrice(variantsToConsider[0], { markdown });
  }

  const prices = variantsToConsider.map(v => v.price!);
  const minPrice = Math.min(...prices);
  
  const priceDisplay = `Desde ${formatCurrency(minPrice)}`;
  return markdown ? `*${priceDisplay}*` : priceDisplay;
};


export const transformProductForExport = (product: Product): any => {
    if (product.id === 'banner') {
        const { variants, ...bannerData } = product;
        return bannerData;
    }
    const { variants, ...restOfProduct } = product;
    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
    
    const pricedVariants = variants.filter(v => typeof v.price === 'number' && v.price > 0);
    const lowestPriceVariant = pricedVariants.length > 0
        ? pricedVariants.reduce((min, v) => v.price! < min.price! ? v : min, pricedVariants[0])
        : null;

    const finalProduct: any = { ...restOfProduct, available: totalStock > 0 };
    
    if (lowestPriceVariant) {
        finalProduct.price = `${lowestPriceVariant.price!.toLocaleString('es-CO')} und`;
    } else {
        finalProduct.price = "";
    }
    
    return finalProduct;
};