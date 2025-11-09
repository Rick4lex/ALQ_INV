
import { useMemo } from 'react';
import { Movements, ManualMovement, Product, Movement } from '../types';

export const useFinancialSummary = (
    movements: Movements,
    manualMovements: ManualMovement[],
    products: Product[],
    dateRange: string,
    customStart: string,
    customEnd: string
) => {
    const variantMap = useMemo(() => {
        const map = new Map<string, { product: Product, variant: Product['variants'][0] }>();
        products.forEach(p => p.variants.forEach(v => map.set(v.id, { product: p, variant: v })));
        return map;
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
        const productProfit: Record<string, { profit: number; items: number; title: string }> = {};

        filteredMovements.forEach((m: Movement | ManualMovement) => {
            if ('variantId' in m && m.type === 'Venta') { // Sale
                const revenue = (m.price || 0) * Math.abs(m.change);
                const cost = (m.cost || 0) * Math.abs(m.change);
                totalRevenue += revenue;
                totalCost += cost;
                itemsSold += Math.abs(m.change);
                const variantInfo = variantMap.get(m.variantId);
                if (variantInfo) {
                    const { category, id, title } = variantInfo.product;
                    categorySales[category] = (categorySales[category] || 0) + revenue;
                    productProfit[id] = productProfit[id] || { profit: 0, items: 0, title };
                    productProfit[id].profit += revenue - cost;
                    productProfit[id].items += Math.abs(m.change);
                }
            } else if (!('variantId' in m)) { // Manual
                m.amount > 0 ? (totalRevenue += m.amount) : (totalExpenses += Math.abs(m.amount));
            }
        });
        
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalExpenses;
        const topProducts = Object.values(productProfit).sort((a,b) => b.profit - a.profit).slice(0, 5);
        const sortedCategorySales = Object.entries(categorySales).sort((a,b) => b[1] - a[1]);
        
        const enrichedDetailedMovements = filteredMovements.map((m: Movement | ManualMovement) => {
            if ('variantId' in m) { // It's a Movement
                const variantInfo = variantMap.get(m.variantId);
                return {
                    ...m,
                    productTitle: variantInfo?.product.title || 'Producto Desconocido',
                    variantName: variantInfo?.variant.name || 'Variante Desconocida',
                };
            }
            return m; // It's a ManualMovement
        });

        return {
            totalRevenue, totalCost, grossProfit, netProfit, itemsSold, topProducts, sortedCategorySales, 
            maxCategorySale: sortedCategorySales[0]?.[1] || 0,
            detailedMovements: enrichedDetailedMovements,
        };
    }, [dateRange, customStart, customEnd, movements, manualMovements, variantMap]);
};