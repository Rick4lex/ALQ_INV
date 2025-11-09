
import React, { useState } from 'react';
import { Movement, ManualMovement } from '../types';
// Fix: Corrected the import path for the useFinancialSummary hook.
import { useFinancialSummary } from '../hooks/useFinancialSummary';
import { ArrowLeft, BarChart2, DollarSign, Package, TrendingUp, PieChart, Info, Minus, Plus, ArrowRight, FilePlus, Upload, Sheet } from 'lucide-react';
import { formatCurrency } from '../utils';
import { useAppContext } from '../contexts/AppContext';

const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode; tooltip: string; }> = React.memo(({ title, value, icon, tooltip }) => (
  <div className="bg-gray-800/60 p-4 rounded-xl shadow-lg border border-purple-500/20 relative group flex-1 min-w-[180px] snap-start">
    <div className="flex items-center gap-4">
      <div className="bg-purple-500/20 p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
     <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
      <Info size={16} className="text-gray-400" data-tooltip-id="kpi-tooltip" data-tooltip-content={tooltip} />
    </div>
  </div>
));

const FinancialPanel: React.FC = () => {
    const { 
        products, 
        movements, 
        manualMovements,
        setCurrentView,
        setModal
    } = useAppContext();

    const [dateRange, setDateRange] = useState('thisMonth');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const financialData = useFinancialSummary(movements, manualMovements, products || [], dateRange, customStart, customEnd);

    const movementTypeConfig = {
        'Venta': { icon: <Minus size={16}/>, color: 'bg-red-500/80' },
        'Stock': { icon: <Plus size={16}/>, color: 'bg-green-500/80' },
        'Ajuste': { icon: <ArrowRight size={16}/>, color: 'bg-yellow-500/80' },
        'Inicial': { icon: <ArrowRight size={16}/>, color: 'bg-blue-500/80' },
        'Gasto': { icon: <Minus size={16}/>, color: 'bg-red-700/80' },
        'Inversión': { icon: <Minus size={16}/>, color: 'bg-yellow-700/80' },
        'Otro Ingreso': { icon: <Plus size={16}/>, color: 'bg-green-700/80' },
    };

    return (
        <div>
            <header className="sticky top-0 z-20 bg-gray-900/70 backdrop-blur-lg border-b border-purple-500/20 p-4 shadow-md">
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentView('catalog')} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"><ArrowLeft size={18} /><span>Volver</span></button>
                        <h1 className="text-xl md:text-2xl font-bold">Panel Financiero</h1>
                    </div>
                </div>
            </header>
            
            <div className="container mx-auto px-4 py-6 text-white">
                <div className="bg-gray-800/50 p-4 rounded-xl mb-6 shadow-lg border border-purple-500/20 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:ring-purple-500">
                            <option value="thisMonth">Este Mes</option>
                            <option value="last30Days">Últimos 30 días</option>
                            <option value="custom">Personalizado</option>
                        </select>
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3"/>
                                <span>-</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3"/>
                            </div>
                        )}
                    </div>
                     <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button onClick={() => setModal({ type: 'export', format: 'csv' })} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"><Sheet size={18} /><span>Exportar CSV</span></button>
                        <button onClick={() => setModal({ type: 'import-csv' })} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"><Upload size={18} /><span>Importar CSV</span></button>
                        <button onClick={() => setModal({ type: 'manual-movement' })} className="flex items-center gap-2 bg-brand-green hover:bg-green-600 font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"><FilePlus size={18} /><span>Registrar Gasto/Ingreso</span></button>
                    </div>
                </div>

                <div className="lg:grid lg:grid-cols-5 lg:gap-4 mb-6">
                    <div className="flex gap-4 overflow-x-auto pb-4 lg:pb-0 lg:contents kpi-carousel" style={{ scrollSnapType: 'x mandatory' }}>
                        <KPICard title="Ingresos Totales" value={formatCurrency(financialData.totalRevenue)} icon={<DollarSign className="text-green-400" />} tooltip="Suma de todas las ventas de productos y otros ingresos manuales registrados en el período." />
                        <KPICard title="Costos Variables" value={formatCurrency(financialData.totalCost)} icon={<DollarSign className="text-red-400" />} tooltip="Suma del costo de toda la mercancía vendida (COGS) en el período. No incluye otros gastos." />
                        <KPICard title="Beneficio Bruto" value={formatCurrency(financialData.grossProfit)} icon={<TrendingUp className="text-blue-400" />} tooltip="Ingresos Totales menos Costos Variables. Muestra la rentabilidad de los productos vendidos." />
                        <KPICard title="Beneficio Neto" value={formatCurrency(financialData.netProfit)} icon={<BarChart2 className="text-purple-400" />} tooltip="Beneficio Bruto menos todos los Gastos e Inversiones registrados. Es la ganancia final del período." />
                        <KPICard title="Items Vendidos" value={String(financialData.itemsSold)} icon={<Package className="text-yellow-400" />} tooltip="Cantidad total de unidades de producto vendidas en el período, basado en los registros de 'Venta'." />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg border border-purple-500/20">
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><PieChart size={20} /> Ventas por Categoría</h3>
                        <div className="space-y-3">
                            {financialData.sortedCategorySales.length > 0 ? financialData.sortedCategorySales.map(([category, sales]) => (
                                <div key={category} className="text-sm">
                                    <div className="flex justify-between items-center mb-1"><span className="capitalize">{category}</span><span className="font-semibold">{formatCurrency(sales)}</span></div>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${(sales / financialData.maxCategorySale) * 100}%` }}></div></div>
                                </div>
                            )) : <p className="text-sm text-gray-400 text-center py-4">No hay ventas de productos en este período.</p>}
                        </div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg border border-purple-500/20">
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={20} /> Top 5 Productos más Rentables</h3>
                        <div className="space-y-2">
                            {financialData.topProducts.length > 0 ? financialData.topProducts.map(p => (
                                <div key={p.title} className="flex justify-between items-center text-sm p-2 bg-gray-900/40 rounded"><span className="truncate pr-4">{p.title}</span><span className="font-bold text-green-400 whitespace-nowrap">{formatCurrency(p.profit)}</span></div>
                            )) : <p className="text-sm text-gray-400 text-center py-4">No hay datos de rentabilidad en este período.</p>}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-xl shadow-lg border border-purple-500/20">
                    <h3 className="font-semibold mb-4">Registro de Movimientos Detallado</h3>
                    <div className="max-h-[500px] overflow-y-auto pr-2">
                        {financialData.detailedMovements.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Fecha</th>
                                    <th scope="col" className="px-4 py-3">Producto</th>
                                    <th scope="col" className="px-4 py-3">Variante</th>
                                    <th scope="col" className="px-4 py-3">Tipo</th>
                                    <th scope="col" className="px-4 py-3 text-center">Cambio Stock</th>
                                    <th scope="col" className="px-4 py-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialData.detailedMovements.map((m: Movement | ManualMovement) => {
                                    const isManual = !('variantId' in m);
                                    const amount = isManual ? (m as ManualMovement).amount : (m.type === 'Venta' ? ((m as Movement).price || 0) * Math.abs((m as Movement).change) : 0);
                                    const stockChange = isManual ? '-' : ((m as Movement).change > 0 ? `+${(m as Movement).change}`: (m as Movement).change);
                                    
                                    return (
                                    <tr key={m.id} className="border-b border-gray-700 hover:bg-gray-900/30">
                                        <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{new Date(m.timestamp).toLocaleDateString('es-CO')}</td>
                                        <td className="px-4 py-2 font-medium">{isManual ? (m as ManualMovement).description : (m as any).productTitle}</td>
                                        <td className="px-4 py-2 text-gray-300">{isManual ? '-' : (m as any).variantName}</td>
                                        <td className="px-4 py-2"><span className={`px-2 py-1 text-xs rounded-full text-white ${movementTypeConfig[m.type as keyof typeof movementTypeConfig]?.color || 'bg-gray-500'}`}>{m.type}</span></td>
                                        <td className={`px-4 py-2 font-bold text-center ${isManual ? '' : ((m as Movement).change > 0 ? 'text-green-400' : 'text-red-400')}`}>{stockChange}</td>
                                        <td className={`px-4 py-2 text-right font-semibold ${amount > 0 ? 'text-green-400' : (amount < 0 ? 'text-red-400' : 'text-gray-500')}`}>{amount !== 0 ? formatCurrency(amount) : '-'}</td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        ) : <p className="text-sm text-gray-400 text-center py-8">No hay movimientos en este período.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialPanel;
