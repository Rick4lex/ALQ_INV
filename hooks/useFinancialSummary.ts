
import { useMemo } from 'react';
import { Movements, ManualMovement, Product, Movement, Variant } from '../types';
import { getPrimarySeriesName } from '../catalogPagination';

export interface EnrichedMovement {
  id: string;
  timestamp: number;
  type: string;
  change?: number;
  newStock?: number;
  notes?: string;
  price?: number;
  cost?: number;
  amount: number;
  productTitle: string;
  variantName: string;
  series: string;
  category: string;
  isManual: boolean;
  ticketId?: string;
  originalPrice?: number;
  discount?: number;
}

export interface SeriesSaleStat {
  series: string;
  revenue: number;
  cost: number;
  profit: number;
  items: number;
  marginPercent: number;
}

export const useFinancialSummary = (
    movements: Movements,
    manualMovements: ManualMovement[],
    products: Product[],
    dateRange: string,
    customStart: string,
    customEnd: string
) => {
    const variantMap = useMemo(() => {
        const map = new Map<string, { product: Product, variant: Variant }>();
        products.forEach(p => {
            (p.variants || []).forEach(v => map.set(v.id, { product: p, variant: v }));
        });
        return map;
    }, [products]);

    // 1. Valorización estática del inventario actual en bodega
    const inventoryValuation = useMemo(() => {
        let inventoryCost = 0;
        let inventoryValue = 0;
        let totalStockUnits = 0;
        let inventoryProductsCount = 0;
        let variantsWithoutCostCount = 0;

        (products || []).forEach(p => {
            let productHasStock = false;
            (p.variants || []).forEach(v => {
                const stock = Number(v.stock) || 0;
                if (stock > 0) {
                    productHasStock = true;
                    totalStockUnits += stock;
                    const unitCost = typeof v.cost === 'number' ? v.cost : 0;
                    const unitPrice = typeof v.price === 'number' ? v.price : 0;

                    inventoryCost += stock * unitCost;
                    inventoryValue += stock * unitPrice;

                    if (!unitCost || unitCost <= 0) {
                        variantsWithoutCostCount++;
                    }
                }
            });
            if (productHasStock) inventoryProductsCount++;
        });

        const inventoryPotentialProfit = inventoryValue - inventoryCost;
        const inventoryPotentialMargin = inventoryValue > 0 ? ((inventoryPotentialProfit / inventoryValue) * 100) : 0;

        return {
            inventoryCost,
            inventoryValue,
            inventoryPotentialProfit,
            inventoryPotentialMargin,
            totalStockUnits,
            inventoryProductsCount,
            variantsWithoutCostCount
        };
    }, [products]);

    return useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        let startDate = new Date();
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        switch(dateRange) {
            case 'thisMonth': 
                startDate = new Date(year, month, 1, 0, 0, 0, 0); 
                break;
            case 'lastMonth':
                startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
                endDate = new Date(year, month, 0, 23, 59, 59, 999);
                break;
            case 'last30Days': 
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); 
                break;
            case 'thisQuarter':
                const quarter = Math.floor(month / 3);
                startDate = new Date(year, quarter * 3, 1, 0, 0, 0, 0);
                break;
            case 'lastQuarter':
                const currentQuarter = Math.floor(month / 3);
                const lastQuarterYear = currentQuarter === 0 ? year - 1 : year;
                const lastQuarterStartMonth = currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3;
                startDate = new Date(lastQuarterYear, lastQuarterStartMonth, 1, 0, 0, 0, 0);
                endDate = new Date(lastQuarterYear, lastQuarterStartMonth + 3, 0, 23, 59, 59, 999);
                break;
            case 'thisYear':
                startDate = new Date(year, 0, 1, 0, 0, 0, 0);
                break;
            case 'custom':
                 startDate = customStart ? new Date(customStart) : new Date(0);
                 endDate = customEnd ? new Date(customEnd) : new Date();
                 if(customEnd) endDate.setHours(23, 59, 59, 999);
                break;
        }

        const allMovements = [...Object.values(movements).flat(), ...manualMovements];
        const filteredMovements = allMovements
            .filter(m => new Date(m.timestamp) >= startDate && new Date(m.timestamp) <= endDate)
            .sort((a, b) => b.timestamp - a.timestamp);

        let totalRevenue = 0, totalCost = 0, totalExpenses = 0, itemsSold = 0;
        const categorySales: Record<string, number> = {};
        const seriesSalesMap: Record<string, { revenue: number; cost: number; profit: number; items: number }> = {};
        const productProfit: Record<string, { profit: number; items: number; title: string }> = {};

        filteredMovements.forEach((m: Movement | ManualMovement) => {
            if ('variantId' in m && m.type === 'Venta') { // Venta de producto
                const changeAbs = Math.abs(m.change);
                const revenue = (m.price || 0) * changeAbs;
                const cost = (m.cost || 0) * changeAbs;
                totalRevenue += revenue;
                totalCost += cost;
                itemsSold += changeAbs;

                const variantInfo = variantMap.get(m.variantId);
                if (variantInfo) {
                    const { category, id, title } = variantInfo.product;
                    categorySales[category] = (categorySales[category] || 0) + revenue;

                    // Franquicia / Serie
                    const seriesName = getPrimarySeriesName(variantInfo.product);
                    if (!seriesSalesMap[seriesName]) {
                        seriesSalesMap[seriesName] = { revenue: 0, cost: 0, profit: 0, items: 0 };
                    }
                    seriesSalesMap[seriesName].revenue += revenue;
                    seriesSalesMap[seriesName].cost += cost;
                    seriesSalesMap[seriesName].profit += (revenue - cost);
                    seriesSalesMap[seriesName].items += changeAbs;

                    // Rentabilidad de producto
                    productProfit[id] = productProfit[id] || { profit: 0, items: 0, title };
                    productProfit[id].profit += revenue - cost;
                    productProfit[id].items += changeAbs;
                }
            } else if (!('variantId' in m)) { // Movimiento manual
                m.amount > 0 ? (totalRevenue += m.amount) : (totalExpenses += Math.abs(m.amount));
            }
        });
        
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalExpenses;
        const topProducts = Object.values(productProfit).sort((a,b) => b.profit - a.profit).slice(0, 5);
        const sortedCategorySales = Object.entries(categorySales).sort((a,b) => b[1] - a[1]);

        // Series ordenadas por ventas
        const sortedSeriesSales: SeriesSaleStat[] = Object.entries(seriesSalesMap)
            .map(([series, stats]) => ({
                series,
                ...stats,
                marginPercent: stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100) : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);

        // Márgenes y tickets
        const grossMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
        const netMarginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
        const averageTicket = itemsSold > 0 ? (totalRevenue / itemsSold) : 0;
        const averageProfitPerItem = itemsSold > 0 ? (grossProfit / itemsSold) : 0;
        
        const enrichedDetailedMovements: EnrichedMovement[] = filteredMovements.map((m: Movement | ManualMovement) => {
            if ('variantId' in m) {
                const variantInfo = variantMap.get(m.variantId);
                const isSale = m.type === 'Venta';
                const calculatedAmount = isSale 
                    ? ((m.price || 0) * Math.abs(m.change))
                    : ((m.cost || m.price || 0) * m.change);

                return {
                    id: m.id,
                    timestamp: m.timestamp,
                    type: m.type,
                    change: m.change,
                    newStock: m.newStock,
                    notes: m.notes,
                    price: m.price,
                    cost: m.cost,
                    amount: calculatedAmount,
                    productTitle: variantInfo?.product.title || 'Producto Desconocido',
                    variantName: variantInfo?.variant.name || 'Variante Desconocida',
                    series: variantInfo ? getPrimarySeriesName(variantInfo.product) : 'General',
                    category: variantInfo?.product.category || 'General',
                    isManual: false,
                    ticketId: m.ticketId,
                    originalPrice: m.originalPrice,
                    discount: m.discount
                };
            }
            return {
                id: m.id,
                timestamp: m.timestamp,
                type: m.type,
                amount: m.amount,
                productTitle: m.description,
                variantName: '-',
                series: '-',
                category: 'Manual / Finanzas',
                isManual: true
            };
        });

        return {
            totalRevenue, 
            totalCost, 
            grossProfit, 
            netProfit, 
            totalExpenses,
            itemsSold, 
            grossMarginPercent,
            netMarginPercent,
            averageTicket,
            averageProfitPerItem,
            topProducts, 
            sortedCategorySales, 
            maxCategorySale: sortedCategorySales[0]?.[1] || 0,
            sortedSeriesSales,
            maxSeriesSale: sortedSeriesSales[0]?.revenue || 0,
            detailedMovements: enrichedDetailedMovements,
            ...inventoryValuation
        };
    }, [dateRange, customStart, customEnd, movements, manualMovements, variantMap, inventoryValuation]);
};