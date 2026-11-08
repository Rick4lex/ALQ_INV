import React, { useState, useMemo } from 'react';
import { Movement, ManualMovement } from '../types';
import { useFinancialSummary, EnrichedMovement } from '../hooks/useFinancialSummary';
import { 
  ArrowLeft, 
  BarChart2, 
  DollarSign, 
  Package, 
  TrendingUp, 
  PieChart, 
  Info, 
  Minus, 
  Plus, 
  ArrowRight, 
  FilePlus, 
  Upload, 
  Sheet,
  Warehouse,
  Tag,
  Search,
  X,
  Filter,
  Mail,
  Check,
  Loader2,
  Send,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { useAppContext } from '../contexts/AppContext';
import { syncService } from '../services/syncService';
import { useAuth } from '../contexts/AuthContext';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  tooltip: string;
  badge?: { text: string; colorClass?: string };
  subtext?: string;
}

const KPICard: React.FC<KPICardProps> = React.memo(({ title, value, icon, tooltip, badge, subtext }) => (
  <div className="bg-gray-800/60 p-3 sm:p-4 rounded-xl shadow-lg border border-purple-500/20 relative group w-full flex flex-col justify-between">
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="bg-purple-500/20 p-2 sm:p-2.5 rounded-lg text-purple-300 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-gray-400 font-medium truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">{value}</p>
        </div>
      </div>
      <div className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0" title={tooltip}>
        <Info size={14} className="text-gray-400 cursor-help" />
      </div>
    </div>
    {(badge || subtext) && (
      <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-gray-700/50 text-[10px] sm:text-[11px]">
        {badge ? (
          <span className={`px-1.5 py-0.5 rounded font-semibold truncate ${badge.colorClass || 'bg-purple-900/60 text-purple-300 border border-purple-500/30'}`}>
            {badge.text}
          </span>
        ) : <span />}
        {subtext && <span className="text-gray-400 truncate">{subtext}</span>}
      </div>
    )}
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

    // Navegación por pastillas / pestañas para centrar la vista
    type FinancialTab = 'warehouse' | 'performance' | 'breakdown' | 'movements' | 'all';
    const [activeTab, setActiveTab] = useState<FinancialTab>('warehouse');
    const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false);

    const [dateRange, setDateRange] = useState('thisMonth');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Conmutador entre Franquicias/Series y Categorías (Prioridad Alta)
    const [breakdownView, setBreakdownView] = useState<'series' | 'categories'>('series');

    // Buscador y Filtro por Tipo en Movimientos (Prioridad Media)
    const [movementSearch, setMovementSearch] = useState('');
    const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');

    // Envío y reenvío de comprobantes por correo (Paso 3)
    const [emailModalData, setEmailModalData] = useState<{ movement: EnrichedMovement; email: string } | null>(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailNotice, setEmailNotice] = useState<string | null>(null);

    const handleResendReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailModalData) return;
        setIsSendingEmail(true);
        try {
            const m = emailModalData.movement;
            const ticket = m.ticketId || `TICK-${m.id.slice(-6)}`;
            const receiptPayload = {
                ticketId: ticket,
                timestamp: m.timestamp,
                items: [{
                    title: m.productTitle,
                    variant: m.variantName,
                    quantity: Math.abs(m.change || 1),
                    originalPrice: m.originalPrice || m.price || 0,
                    unitPrice: m.price || 0,
                    subtotal: m.amount
                }],
                subtotal: (m.originalPrice || m.price || 0) * Math.abs(m.change || 1),
                discountAmount: (m.discount || 0) * Math.abs(m.change || 1),
                total: m.amount,
                notes: m.notes
            };

            await syncService.sendSaleReceipt(receiptPayload, emailModalData.email);
            setEmailNotice(`Comprobante del ticket #${ticket} enviado exitosamente a ${emailModalData.email}`);
            setEmailModalData(null);
            setTimeout(() => setEmailNotice(null), 4000);
        } catch (err) {
            console.error("Error al enviar comprobante:", err);
            alert("No se pudo enviar el comprobante por correo vía Apps Script. Revisa la consola o conexión.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const financialData = useFinancialSummary(movements, manualMovements, products || [], dateRange, customStart, customEnd);

    const movementTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
        'Venta': { icon: <Minus size={14}/>, color: 'bg-emerald-600/90 text-white', label: 'Ventas' },
        'Stock': { icon: <Plus size={14}/>, color: 'bg-blue-600/90 text-white', label: 'Entradas Stock' },
        'Ajuste': { icon: <ArrowRight size={14}/>, color: 'bg-amber-600/90 text-white', label: 'Ajustes' },
        'Inicial': { icon: <ArrowRight size={14}/>, color: 'bg-cyan-600/90 text-white', label: 'Iniciales' },
        'Gasto': { icon: <Minus size={14}/>, color: 'bg-red-700/90 text-white', label: 'Gastos' },
        'Inversión': { icon: <Minus size={14}/>, color: 'bg-yellow-700/90 text-white', label: 'Inversiones' },
        'Otro Ingreso': { icon: <Plus size={14}/>, color: 'bg-green-700/90 text-white', label: 'Otros Ingresos' },
    };

    // Filtrado interactivo de movimientos
    const filteredMovements = useMemo(() => {
        return financialData.detailedMovements.filter((m: EnrichedMovement) => {
            if (movementTypeFilter !== 'ALL' && m.type !== movementTypeFilter) {
                return false;
            }
            if (movementSearch.trim()) {
                const query = movementSearch.toLowerCase();
                const matchTitle = (m.productTitle || '').toLowerCase().includes(query);
                const matchVariant = (m.variantName || '').toLowerCase().includes(query);
                const matchSeries = (m.series || '').toLowerCase().includes(query);
                const matchCategory = (m.category || '').toLowerCase().includes(query);
                const matchNotes = (m.notes || '').toLowerCase().includes(query);
                const matchTicket = (m.ticketId || '').toLowerCase().includes(query);
                return matchTitle || matchVariant || matchSeries || matchCategory || matchNotes || matchTicket;
            }
            return true;
        });
    }, [financialData.detailedMovements, movementTypeFilter, movementSearch]);

    // Subtotal de movimientos filtrados
    const filteredSummaryStats = useMemo(() => {
        let totalRevenueSum = 0;
        let totalExpenseSum = 0;
        let totalQuantity = 0;

        filteredMovements.forEach((m: EnrichedMovement) => {
            if (m.type === 'Venta') {
                totalRevenueSum += m.amount;
                totalQuantity += Math.abs(m.change || 0);
            } else if (m.type === 'Gasto' || m.type === 'Inversión') {
                totalExpenseSum += Math.abs(m.amount);
            } else if (m.type === 'Otro Ingreso') {
                totalRevenueSum += m.amount;
            } else if (m.type === 'Stock') {
                totalQuantity += (m.change || 0);
            }
        });

        return { totalRevenueSum, totalExpenseSum, totalQuantity };
    }, [filteredMovements]);

    const { user } = useAuth();

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
                <div className="bg-gray-800/80 border border-red-500/40 p-6 rounded-2xl max-w-md text-center space-y-4 shadow-xl">
                    <h2 className="text-xl font-bold text-red-300">Acceso Reservado a Administrador</h2>
                    <p className="text-sm text-gray-400">
                        El Panel Financiero, los costos de inventario y márgenes están restringidos para el rol de vendedor.
                    </p>
                    <button 
                        onClick={() => setCurrentView('catalog')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-sm"
                    >
                        Volver al Catálogo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-20">
            {/* Header del Panel: Compacto en Móvil (48-52px) y Completo en Escritorio */}
            <header className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-md border-b border-purple-500/20 px-3 py-2.5 sm:p-4 shadow-md">
                <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4">
                    {/* Botón Volver + Título */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button 
                            onClick={() => setCurrentView('catalog')} 
                            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold p-2 sm:py-2 sm:px-3.5 rounded-xl border border-gray-700 transition-all active:scale-95 shrink-0"
                            aria-label="Volver al Catálogo"
                            title="Volver al Catálogo"
                        >
                            <ArrowLeft size={18} />
                            <span className="hidden sm:inline text-xs sm:text-sm">Volver</span>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-white truncate">
                                <span className="sm:hidden">Finanzas & Bodega</span>
                                <span className="hidden sm:inline">Panel Financiero y Bodega</span>
                            </h1>
                        </div>
                    </div>

                    {/* Acciones de Escritorio (hidden sm:flex) */}
                    <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
                        <button 
                            onClick={() => setModal({ type: 'export', format: 'csv' })} 
                            className="flex items-center gap-1.5 bg-teal-600/90 hover:bg-teal-600 text-white font-semibold py-1.5 px-3 rounded-lg text-xs sm:text-sm transition-all active:scale-95 shadow-xs"
                        >
                            <Sheet size={16} />
                            <span>Exportar CSV</span>
                        </button>
                        <button 
                            onClick={() => setModal({ type: 'import-csv' })} 
                            className="flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-lg text-xs sm:text-sm transition-all active:scale-95 shadow-xs"
                        >
                            <Upload size={16} />
                            <span>Importar CSV</span>
                        </button>
                        <button 
                            onClick={() => setModal({ type: 'manual-movement' })} 
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs sm:text-sm transition-all active:scale-95 shadow-xs shadow-emerald-950/40"
                        >
                            <FilePlus size={16} />
                            <span>Registrar Gasto/Ingreso</span>
                        </button>
                    </div>

                    {/* Acciones Móviles Rápidas (sm:hidden) */}
                    <div className="flex sm:hidden items-center gap-1.5 relative shrink-0">
                        <button 
                            type="button"
                            onClick={() => setModal({ type: 'manual-movement' })} 
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-1.5 px-2.5 rounded-xl text-xs shadow-md shadow-emerald-950/40"
                            title="Registrar Gasto o Ingreso Manual"
                        >
                            <FilePlus size={15} />
                            <span>Gasto</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowMobileActionsMenu(prev => !prev)} 
                            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
                            aria-label="Más opciones"
                        >
                            <MoreVertical size={18} />
                        </button>

                        {/* Menú flotante móvil de exportar / importar */}
                        {showMobileActionsMenu && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowMobileActionsMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-950 border border-purple-500/40 rounded-xl p-1.5 shadow-2xl z-40 space-y-1 animate-fade-in">
                                    <button
                                        type="button"
                                        onClick={() => { setShowMobileActionsMenu(false); setModal({ type: 'export', format: 'csv' }); }}
                                        className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-gray-200 hover:bg-gray-800 text-left transition-colors"
                                    >
                                        <Sheet size={15} className="text-teal-400" />
                                        <span>Exportar CSV</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowMobileActionsMenu(false); setModal({ type: 'import-csv' }); }}
                                        className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-gray-200 hover:bg-gray-800 text-left transition-colors"
                                    >
                                        <Upload size={15} className="text-blue-400" />
                                        <span>Importar CSV</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* BARRA DE PASTILLAS STICKY / Segmented Navigation */}
            <div className="sticky top-[50px] sm:top-[65px] z-10 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/90 py-2 shadow-md">
                <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                            { id: 'warehouse' as const, label: 'Bodega', icon: <Warehouse size={15} />, badge: `${financialData.inventoryProductsCount} prods` },
                            { id: 'performance' as const, label: 'Rendimiento', icon: <BarChart2 size={15} />, badge: formatCurrency(financialData.totalRevenue) },
                            { id: 'breakdown' as const, label: 'Análisis', icon: <Tag size={15} />, badge: `${financialData.sortedSeriesSales.length} series` },
                            { id: 'movements' as const, label: 'Movimientos', icon: <DollarSign size={15} />, badge: `${filteredMovements.length}` },
                            { id: 'all' as const, label: 'Ver Todo', icon: <TrendingUp size={15} />, desktopOnly: true },
                        ].map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                        tab.desktopOnly ? 'hidden md:inline-flex' : 'inline-flex'
                                    } ${
                                        isActive
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                                            : 'bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-700/60'
                                    }`}
                                >
                                    <span className={isActive ? 'text-white' : 'text-purple-400'}>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                            isActive ? 'bg-purple-800/90 text-purple-200' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 text-white max-w-7xl space-y-6">
                
                {/* 1. SECCIÓN: Valorización de Stock en Bodega (Inventario Actual) */}
                {(activeTab === 'warehouse' || activeTab === 'all') && (
                    <div className="bg-gradient-to-br from-gray-800/90 via-purple-950/20 to-gray-800/90 p-4 sm:p-5 rounded-2xl shadow-xl border border-purple-500/30 animate-fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0">
                                    <Warehouse size={22} className="stroke-[2.2]" />
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-lg font-bold flex items-center gap-2">
                                        <span>Valorización de Stock en Bodega</span>
                                        <span className="text-[10px] sm:text-[11px] font-semibold text-purple-300 bg-purple-900/60 border border-purple-500/40 px-2 py-0.5 rounded-full">
                                            Inventario Físico
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-400">
                                        Capital inmovilizado y rentabilidad proyectada sobre el stock físico actual.
                                    </p>
                                </div>
                            </div>

                            {financialData.variantsWithoutCostCount > 0 && (
                                <span 
                                    className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs"
                                    title="Variantes con stock mayor a 0 que no tienen costo unitario registrado"
                                >
                                    <Info size={14} className="shrink-0 text-amber-400" />
                                    <span>{financialData.variantsWithoutCostCount} variantes en stock sin costo registrado</span>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                            {/* Capital Invertido */}
                            <div className="bg-gray-900/70 p-3.5 sm:p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between">
                                <div>
                                    <span className="text-[11px] sm:text-xs text-gray-400 block mb-1 font-medium truncate">Capital Invertido (Costo Total)</span>
                                    <span className="text-lg sm:text-2xl font-bold text-amber-400 tracking-tight block">
                                        {formatCurrency(financialData.inventoryCost)}
                                    </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-2 block truncate">
                                    Costo de reposición / compra
                                </span>
                            </div>

                            {/* Valor Comercial de Venta (PVP) */}
                            <div className="bg-gray-900/70 p-3.5 sm:p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between">
                                <div>
                                    <span className="text-[11px] sm:text-xs text-gray-400 block mb-1 font-medium truncate">Valor Venta Proyectado (PVP)</span>
                                    <span className="text-lg sm:text-2xl font-bold text-emerald-400 tracking-tight block">
                                        {formatCurrency(financialData.inventoryValue)}
                                    </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-2 block truncate">
                                    Ingresos brutos si se liquida todo
                                </span>
                            </div>

                            {/* Ganancia Potencial */}
                            <div className="bg-gray-900/70 p-3.5 sm:p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[11px] sm:text-xs text-gray-400 font-medium truncate">Ganancia Potencial</span>
                                        <span className="text-[9px] sm:text-[10px] font-bold text-blue-300 bg-blue-900/60 border border-blue-500/40 px-1.5 py-0.2 rounded shrink-0">
                                            {financialData.inventoryPotentialMargin.toFixed(1)}%
                                        </span>
                                    </div>
                                    <span className="text-lg sm:text-2xl font-bold text-blue-400 tracking-tight block">
                                        {formatCurrency(financialData.inventoryPotentialProfit)}
                                    </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-2 block truncate">
                                    Retorno estimado sobre PVP
                                </span>
                            </div>

                            {/* Unidades Físicas */}
                            <div className="bg-gray-900/70 p-3.5 sm:p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between">
                                <div>
                                    <span className="text-[11px] sm:text-xs text-gray-400 block mb-1 font-medium truncate">Unidades en Existencia</span>
                                    <span className="text-lg sm:text-2xl font-bold text-purple-300 tracking-tight block">
                                        {financialData.totalStockUnits.toLocaleString()} unid.
                                    </span>
                                </div>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 mt-2 block truncate">
                                    En {financialData.inventoryProductsCount} productos activos
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* SELECTOR DE PERÍODO EN PASTILLAS (Para Rendimiento, Análisis, Movimientos o Todo) */}
                {(activeTab === 'performance' || activeTab === 'breakdown' || activeTab === 'movements' || activeTab === 'all') && (
                    <div className="bg-gray-800/60 p-3 sm:p-4 rounded-xl shadow-lg border border-purple-500/20 space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                <Calendar size={14} className="text-purple-400" />
                                <span>Período de Análisis:</span>
                            </div>
                            {dateRange === 'custom' && (
                                <span className="text-[11px] text-purple-300 font-mono">
                                    {customStart || 'Inicio'} → {customEnd || 'Fin'}
                                </span>
                            )}
                        </div>

                        {/* Chips de selección rápida de período */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {[
                                { id: 'thisMonth', label: 'Este Mes' },
                                { id: 'lastMonth', label: 'Mes Pasado' },
                                { id: 'last30Days', label: 'Últimos 30d' },
                                { id: 'thisQuarter', label: 'Trimestre' },
                                { id: 'thisYear', label: 'Este Año' },
                                { id: 'custom', label: 'Personalizado 📅' },
                            ].map(r => {
                                const isSelected = dateRange === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setDateRange(r.id)}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                                            isSelected
                                                ? 'bg-purple-600 text-white font-semibold shadow-xs ring-1 ring-purple-400/50'
                                                : 'bg-gray-700/80 text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-600/60'
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Inputs de fecha personalizada */}
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 bg-gray-900/80 p-2.5 rounded-xl border border-purple-500/30 flex-wrap animate-fade-in text-xs">
                                <span className="text-gray-400 text-[11px]">Desde:</span>
                                <input 
                                    type="date" 
                                    value={customStart} 
                                    onChange={e => setCustomStart(e.target.value)} 
                                    className="bg-gray-800 border border-gray-700 rounded-lg py-1 px-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                                />
                                <span className="text-gray-400 text-[11px]">Hasta:</span>
                                <input 
                                    type="date" 
                                    value={customEnd} 
                                    onChange={e => setCustomEnd(e.target.value)} 
                                    className="bg-gray-800 border border-gray-700 rounded-lg py-1 px-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 2. SECCIÓN: Métricas Financieras del Período (KPIS) */}
                {(activeTab === 'performance' || activeTab === 'all') && (
                    <div className="animate-fade-in space-y-2.5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                            <BarChart2 size={15} className="text-purple-400" />
                            <span>Métricas Financieras del Período</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                            {/* Ingresos Totales */}
                            <KPICard 
                                title="Ingresos Totales" 
                                value={formatCurrency(financialData.totalRevenue)} 
                                icon={<DollarSign className="text-green-400" size={20} />} 
                                tooltip="Suma total de ventas de productos y otros ingresos manuales registrados en el período." 
                                subtext={`${financialData.itemsSold} unidades vendidas`}
                            />

                            {/* Costos Variables (COGS) */}
                            <KPICard 
                                title="Costos (COGS)" 
                                value={formatCurrency(financialData.totalCost)} 
                                icon={<DollarSign className="text-red-400" size={20} />} 
                                tooltip="Costo acumulado de adquisición o fabricación de las unidades vendidas en este período." 
                                subtext="Mercancía vendida"
                            />

                            {/* Beneficio Bruto con Margen % */}
                            <KPICard 
                                title="Beneficio Bruto" 
                                value={formatCurrency(financialData.grossProfit)} 
                                icon={<TrendingUp className="text-blue-400" size={20} />} 
                                tooltip="Ingresos Totales menos Costos Variables. Refleja la rentabilidad directa de las ventas." 
                                badge={{ 
                                    text: `Margen: ${financialData.grossMarginPercent.toFixed(1)}%`,
                                    colorClass: financialData.grossMarginPercent >= 30 
                                        ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40' 
                                        : 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/40'
                                }}
                                subtext="Rentabilidad de venta"
                            />

                            {/* Beneficio Neto con Margen % */}
                            <KPICard 
                                title="Beneficio Neto" 
                                value={formatCurrency(financialData.netProfit)} 
                                icon={<BarChart2 className="text-purple-400" size={20} />} 
                                tooltip="Beneficio Bruto menos todos los Gastos e Inversiones manuales del período." 
                                badge={{ 
                                    text: `Margen: ${financialData.netMarginPercent.toFixed(1)}%`,
                                    colorClass: financialData.netMarginPercent >= 20 
                                        ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40' 
                                        : 'bg-red-900/60 text-red-300 border border-red-500/40'
                                }}
                                subtext={`Gastos: ${formatCurrency(financialData.totalExpenses)}`}
                            />

                            {/* Ticket Promedio por Unidad */}
                            <div className="col-span-2 sm:col-span-1">
                                <KPICard 
                                    title="Ticket Promedio" 
                                    value={formatCurrency(financialData.averageTicket)} 
                                    icon={<Package className="text-yellow-400" size={20} />} 
                                    tooltip="Precio promedio por unidad vendida (Ingresos ÷ Unidades vendidas)." 
                                    badge={{
                                        text: `Ganancia: ${formatCurrency(financialData.averageProfitPerItem)} /u`,
                                        colorClass: 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/40'
                                    }}
                                    subtext="Promedio por unidad"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. SECCIÓN: Desglose por Franquicia / Serie vs Categoría & Top Rentables */}
                {(activeTab === 'breakdown' || activeTab === 'all') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
                        {/* Tarjeta con Selector de Pestañas: Franquicias vs Categorías */}
                        <div className="bg-gray-800/50 p-4 sm:p-5 rounded-xl shadow-lg border border-purple-500/20 flex flex-col justify-between">
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-700/60">
                                    <div className="flex items-center gap-2">
                                        {breakdownView === 'series' ? (
                                            <Tag size={19} className="text-purple-400" />
                                        ) : (
                                            <PieChart size={19} className="text-purple-400" />
                                        )}
                                        <h3 className="font-bold text-sm sm:text-base">
                                            {breakdownView === 'series' ? 'Ventas por Franquicia' : 'Ventas por Categoría'}
                                        </h3>
                                    </div>

                                    {/* Conmutador de Pestañas */}
                                    <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-900/80 border border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => setBreakdownView('series')}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                                breakdownView === 'series' 
                                                    ? 'bg-purple-600 text-white shadow-xs' 
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <Tag size={12} />
                                            <span>Series ({financialData.sortedSeriesSales.length})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBreakdownView('categories')}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                                breakdownView === 'categories' 
                                                    ? 'bg-purple-600 text-white shadow-xs' 
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <PieChart size={12} />
                                            <span>Cats ({financialData.sortedCategorySales.length})</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Contenido según la pestaña activa */}
                                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                    {breakdownView === 'series' ? (
                                        financialData.sortedSeriesSales.length > 0 ? (
                                            financialData.sortedSeriesSales.map((stat) => {
                                                const percentOfMax = financialData.maxSeriesSale > 0 
                                                    ? (stat.revenue / financialData.maxSeriesSale) * 100 
                                                    : 0;
                                                return (
                                                    <div key={stat.series} className="text-xs bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/80">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="font-bold text-gray-200 uppercase tracking-wide truncate max-w-[180px]" title={stat.series}>
                                                                {stat.series}
                                                            </span>
                                                            <div className="text-right">
                                                                <span className="font-bold text-white text-sm">
                                                                    {formatCurrency(stat.revenue)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-gray-700/60 rounded-full h-2 mb-1.5 overflow-hidden">
                                                            <div 
                                                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500" 
                                                                style={{ width: `${percentOfMax}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                            <span>{stat.items} {stat.items === 1 ? 'unidad' : 'unidades'}</span>
                                                            <span className="text-emerald-400 font-medium">
                                                                Ganancia: {formatCurrency(stat.profit)} ({stat.marginPercent.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-8">
                                                No hay ventas de franquicias en este período.
                                            </p>
                                        )
                                    ) : (
                                        financialData.sortedCategorySales.length > 0 ? (
                                            financialData.sortedCategorySales.map(([category, sales]) => {
                                                const percentOfMax = financialData.maxCategorySale > 0 
                                                    ? (sales / financialData.maxCategorySale) * 100 
                                                    : 0;
                                                return (
                                                    <div key={category} className="text-xs bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/80">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="font-bold text-gray-200 capitalize truncate max-w-[180px]">
                                                                {category}
                                                            </span>
                                                            <span className="font-bold text-white text-sm">
                                                                {formatCurrency(sales)}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-700/60 rounded-full h-2 overflow-hidden">
                                                            <div 
                                                                className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                                                                style={{ width: `${percentOfMax}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-8">
                                                No hay ventas de productos en este período.
                                            </p>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top 5 Productos más Rentables */}
                        <div className="bg-gray-800/50 p-4 sm:p-5 rounded-xl shadow-lg border border-purple-500/20 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-700/60">
                                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                        <TrendingUp size={19} className="text-emerald-400" /> 
                                        <span>Top Productos más Rentables</span>
                                    </h3>
                                    <span className="text-xs text-gray-400">Por ganancia neta</span>
                                </div>

                                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                    {financialData.topProducts.length > 0 ? (
                                        financialData.topProducts.map((p, idx) => (
                                            <div 
                                                key={p.title} 
                                                className="flex items-center justify-between text-xs p-3 bg-gray-900/40 rounded-lg border border-gray-800/80 hover:border-purple-500/30 transition-all"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                                    <span className="w-5 h-5 rounded-full bg-purple-900/70 border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-100 truncate text-sm" title={p.title}>
                                                            {p.title}
                                                        </p>
                                                        <span className="text-[11px] text-gray-400">
                                                            {p.items} {p.items === 1 ? 'unidad vendida' : 'unidades vendidas'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="font-bold text-emerald-400 text-sm whitespace-nowrap block">
                                                        +{formatCurrency(p.profit)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">Beneficio</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center py-8">
                                            No hay datos de rentabilidad en este período.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SECCIÓN: Registro de Movimientos Detallado (Tarjetas en Móvil y Tabla en Escritorio) */}
                {(activeTab === 'movements' || activeTab === 'all') && (
                    <div className="bg-gray-800/50 p-4 sm:p-5 rounded-xl shadow-lg border border-purple-500/20 animate-fade-in space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-700/60">
                            <div>
                                <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                    <span>Registro de Movimientos Detallado</span>
                                    <span className="text-xs font-semibold text-purple-300 bg-purple-900/60 border border-purple-500/40 px-2 py-0.5 rounded-full">
                                        {filteredMovements.length} de {financialData.detailedMovements.length}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Consulta, busca y audita cada venta, entrada de stock, gasto o ajuste registrado.
                                </p>
                            </div>

                            {/* Buscador en Tiempo Real */}
                            <div className="relative w-full md:w-80">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por producto, variante o descripción..."
                                    value={movementSearch}
                                    onChange={e => setMovementSearch(e.target.value)}
                                    className="w-full bg-gray-900/90 text-white text-xs pl-9 pr-8 py-2 rounded-lg border border-gray-700 focus:outline-hidden focus:border-purple-500 placeholder-gray-500"
                                />
                                {movementSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setMovementSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Barra de Filtros por Tipo de Movimiento (Chips Horizontales) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar text-xs select-none">
                            <span className="text-gray-400 font-semibold shrink-0 mr-1 flex items-center gap-1">
                                <Filter size={13} /> Tipo:
                            </span>
                            <button
                                type="button"
                                onClick={() => setMovementTypeFilter('ALL')}
                                className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                                    movementTypeFilter === 'ALL'
                                        ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/50'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Todos ({financialData.detailedMovements.length})
                            </button>
                            {Object.entries(movementTypeConfig).map(([typeKey, cfg]) => {
                                const count = financialData.detailedMovements.filter(m => m.type === typeKey).length;
                                if (count === 0 && movementTypeFilter !== typeKey) return null;
                                const isActive = movementTypeFilter === typeKey;
                                return (
                                    <button
                                        key={typeKey}
                                        type="button"
                                        onClick={() => setMovementTypeFilter(typeKey)}
                                        className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                                            isActive
                                                ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/50'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                    >
                                        <span>{cfg.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-purple-800' : 'bg-gray-700 text-gray-300'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Resumen de Resultados Filtrados */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 px-1 gap-2">
                            <div>
                                {movementTypeFilter !== 'ALL' || movementSearch ? (
                                    <span className="flex items-center gap-2">
                                        <span>Mostrando <strong>{filteredMovements.length}</strong> movimientos</span>
                                        <button
                                            type="button"
                                            onClick={() => { setMovementSearch(''); setMovementTypeFilter('ALL'); }}
                                            className="text-purple-400 hover:underline font-semibold"
                                        >
                                            Limpiar
                                        </button>
                                    </span>
                                ) : (
                                    <span>Total de movimientos: {financialData.detailedMovements.length}</span>
                                )}
                            </div>

                            {/* Subtotales según el filtro activo */}
                            <div className="flex items-center gap-3 font-medium flex-wrap">
                                {filteredSummaryStats.totalRevenueSum > 0 && (
                                    <span className="text-emerald-400">
                                        Ingresos: +{formatCurrency(filteredSummaryStats.totalRevenueSum)}
                                    </span>
                                )}
                                {filteredSummaryStats.totalExpenseSum > 0 && (
                                    <span className="text-red-400">
                                        Gastos: -{formatCurrency(filteredSummaryStats.totalExpenseSum)}
                                    </span>
                                )}
                                {filteredSummaryStats.totalQuantity > 0 && (
                                    <span className="text-purple-300">
                                        Unidades: {filteredSummaryStats.totalQuantity}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Notificación de envío de comprobante */}
                        {emailNotice && (
                            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center justify-between shadow-lg">
                                <span className="flex items-center gap-2">
                                    <Check size={16} className="text-emerald-400 shrink-0" />
                                    <span>{emailNotice}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setEmailNotice(null)}
                                    className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-emerald-900/50"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* 1. VISTA MÓVIL (md:hidden): Tarjetas Táctiles Ergonómicas */}
                        <div className="md:hidden space-y-2.5">
                            {filteredMovements.length > 0 ? (
                                filteredMovements.map((m: EnrichedMovement) => {
                                    const config = movementTypeConfig[m.type] || { icon: null, color: 'bg-gray-600', label: m.type };
                                    const isManual = m.isManual;
                                    const stockChange = isManual 
                                        ? null 
                                        : ((m.change || 0) > 0 ? `+${m.change}` : m.change);

                                    return (
                                        <div 
                                            key={m.id} 
                                            className="bg-gray-900/80 border border-gray-700/80 rounded-xl p-3.5 space-y-2.5 transition-all shadow-xs"
                                        >
                                            {/* Cabecera: Badge de tipo + Fecha */}
                                            <div className="flex items-center justify-between text-xs">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${config.color}`}>
                                                    {config.icon}
                                                    <span>{m.type}</span>
                                                </span>
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    {new Date(m.timestamp).toLocaleDateString('es-CO', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            {/* Cuerpo: Franquicia + Producto + Variante */}
                                            <div>
                                                {m.series && m.series !== '-' && (
                                                    <span className="text-[10px] bg-purple-950/70 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block mb-1">
                                                        {m.series}
                                                    </span>
                                                )}
                                                <h4 className="text-sm font-semibold text-white leading-snug">
                                                    {m.productTitle}
                                                </h4>
                                                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                                                    <span className="truncate pr-2">Var: <strong className="text-gray-200">{m.variantName}</strong></span>
                                                    {stockChange !== null && (
                                                        <span className={`font-mono font-bold shrink-0 ${
                                                            (m.change || 0) > 0 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            Stock: {stockChange}
                                                        </span>
                                                    )}
                                                </div>
                                                {m.notes && (
                                                    <p className="text-[11px] text-gray-400 bg-gray-800/60 px-2 py-1 rounded mt-1.5 border border-gray-700/50">
                                                        Nota: {m.notes}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Pie: Monto + Acción de comprobante */}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                                                <div>
                                                    <span className="text-[10px] text-gray-500 block uppercase font-medium">Monto</span>
                                                    <span className={`text-base font-bold font-mono ${
                                                        m.amount > 0 ? 'text-emerald-400' : m.amount < 0 ? 'text-red-400' : 'text-gray-400'
                                                    }`}>
                                                        {m.amount > 0 ? `+${formatCurrency(m.amount)}` : m.amount < 0 ? formatCurrency(m.amount) : '$0'}
                                                    </span>
                                                </div>

                                                {m.type === 'Venta' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEmailModalData({ movement: m, email: 'cfb.dig@gmail.com' })}
                                                        className="inline-flex items-center gap-1.5 bg-purple-900/60 hover:bg-purple-800 active:scale-95 text-purple-200 border border-purple-500/40 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                                                        title="Reenviar comprobante por correo"
                                                    >
                                                        <Mail size={13} className="text-purple-300 shrink-0" />
                                                        <span className="font-mono">{m.ticketId || 'Comprobante'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-gray-400 bg-gray-900/40 rounded-xl border border-gray-800">
                                    <Search className="mx-auto h-8 w-8 text-gray-500 mb-2" />
                                    <p className="font-semibold text-sm">No se encontraron movimientos.</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Intenta ajustar los términos de búsqueda o cambiar el filtro por tipo.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 2. VISTA ESCRITORIO (hidden md:block): Tabla completa de 8 Columnas */}
                        <div className="hidden md:block max-h-[520px] overflow-y-auto pr-1 border border-gray-700/60 rounded-xl">
                            {filteredMovements.length > 0 ? (
                                <table className="w-full text-xs text-left">
                                    <thead className="text-[11px] text-gray-400 uppercase bg-gray-900/80 sticky top-0 backdrop-blur-xs border-b border-gray-700">
                                        <tr>
                                            <th scope="col" className="px-3.5 py-3">Fecha</th>
                                            <th scope="col" className="px-3.5 py-3">Franquicia</th>
                                            <th scope="col" className="px-3.5 py-3">Producto / Concepto</th>
                                            <th scope="col" className="px-3.5 py-3">Variante</th>
                                            <th scope="col" className="px-3.5 py-3 text-center">Tipo</th>
                                            <th scope="col" className="px-3.5 py-3 text-center">Cambio Stock</th>
                                            <th scope="col" className="px-3.5 py-3 text-right">Monto</th>
                                            <th scope="col" className="px-3.5 py-3 text-center">Ticket / Comprobante</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {filteredMovements.map((m: EnrichedMovement) => {
                                            const config = movementTypeConfig[m.type] || { icon: null, color: 'bg-gray-600', label: m.type };
                                            const isManual = m.isManual;
                                            const stockChange = isManual 
                                                ? '-' 
                                                : ((m.change || 0) > 0 ? `+${m.change}` : m.change);

                                            return (
                                                <tr key={m.id} className="hover:bg-gray-800/40 transition-colors">
                                                    {/* Fecha */}
                                                    <td className="px-3.5 py-2.5 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                                        {new Date(m.timestamp).toLocaleDateString('es-CO', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </td>

                                                    {/* Franquicia / Serie */}
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                        {m.series && m.series !== '-' ? (
                                                            <span className="inline-flex items-center gap-1 bg-purple-950/60 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider max-w-[120px] truncate" title={m.series}>
                                                                {m.series}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500">-</span>
                                                        )}
                                                    </td>

                                                    {/* Producto / Descripción */}
                                                    <td className="px-3.5 py-2.5 font-medium text-gray-200 max-w-[240px]">
                                                        <span className="truncate block" title={m.productTitle}>
                                                            {m.productTitle}
                                                        </span>
                                                        {m.notes && (
                                                            <span className="text-[10px] text-gray-400 block truncate" title={m.notes}>
                                                                Nota: {m.notes}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Variante */}
                                                    <td className="px-3.5 py-2.5 text-gray-300 max-w-[140px] truncate">
                                                        {m.variantName}
                                                    </td>

                                                    {/* Badge Tipo */}
                                                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${config.color}`}>
                                                            {config.icon}
                                                            <span>{m.type}</span>
                                                        </span>
                                                    </td>

                                                    {/* Cambio Stock */}
                                                    <td className={`px-3.5 py-2.5 text-center font-bold font-mono ${
                                                        isManual ? 'text-gray-500' : ((m.change || 0) > 0 ? 'text-green-400' : 'text-red-400')
                                                    }`}>
                                                        {stockChange}
                                                    </td>

                                                    {/* Monto */}
                                                    <td className="px-3.5 py-2.5 text-right font-semibold font-mono whitespace-nowrap">
                                                        {m.amount > 0 ? (
                                                            <span className="text-emerald-400">+{formatCurrency(m.amount)}</span>
                                                        ) : m.amount < 0 ? (
                                                            <span className="text-red-400">{formatCurrency(m.amount)}</span>
                                                        ) : (
                                                            <span className="text-gray-500">-</span>
                                                        )}
                                                    </td>

                                                    {/* Ticket / Comprobante */}
                                                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                                        {m.type === 'Venta' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEmailModalData({ movement: m, email: 'cfb.dig@gmail.com' })}
                                                                className="inline-flex items-center gap-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95 shadow-xs"
                                                                title="Reenviar comprobante por correo vía Google Apps Script"
                                                            >
                                                                <Mail size={12} className="text-purple-300 shrink-0" />
                                                                <span className="font-mono">{m.ticketId || 'Reenviar'}</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-600 text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <Search className="mx-auto h-8 w-8 text-gray-500 mb-2" />
                                    <p className="font-semibold text-sm">No se encontraron movimientos.</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Intenta ajustar los términos de búsqueda o cambiar el filtro por tipo.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* BOTÓN FLOTANTE MÓVIL (FAB) para Registrar Gasto/Ingreso */}
            <button 
                type="button"
                onClick={() => setModal({ type: 'manual-movement' })}
                className="sm:hidden fixed bottom-5 right-4 z-30 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold py-3 px-4 rounded-2xl shadow-2xl shadow-emerald-950/80 flex items-center gap-2 border border-emerald-400/40 transition-all cursor-pointer"
                title="Registrar Gasto o Ingreso Manual"
            >
                <FilePlus size={18} />
                <span className="text-xs tracking-wide">Gasto / Ingreso</span>
            </button>

            {/* Modal de Reenvío de Comprobante por Correo */}
            {emailModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-gray-900 border border-purple-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Reenviar Comprobante</h3>
                                    <p className="text-xs text-gray-400">
                                        Ticket: <span className="font-mono text-purple-300 font-semibold">{emailModalData.movement.ticketId || `TICK-${emailModalData.movement.id.slice(-6)}`}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailModalData(null)}
                                disabled={isSendingEmail}
                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleResendReceipt} className="space-y-3.5">
                            <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 text-xs space-y-1">
                                <p className="text-gray-200 font-semibold truncate">{emailModalData.movement.productTitle}</p>
                                <p className="text-gray-400">{emailModalData.movement.variantName} • Cantidad: {Math.abs(emailModalData.movement.change || 1)}</p>
                                <p className="text-emerald-400 font-bold font-mono">Monto Venta: {formatCurrency(emailModalData.movement.amount)}</p>
                                {emailModalData.movement.discount && emailModalData.movement.discount > 0 ? (
                                    <p className="text-amber-400 text-[11px]">Descuento aplicado: {formatCurrency(emailModalData.movement.discount)} / unidad</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Correo de destino (Google Apps Script)
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={emailModalData.email}
                                    onChange={(e) => setEmailModalData({ ...emailModalData, email: e.target.value })}
                                    placeholder="cfb.dig@gmail.com"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-purple-500"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Se despachará la acción <span className="font-mono text-purple-300">SEND_SALE_RECEIPT</span> con el detalle formateado para el cliente.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEmailModalData(null)}
                                    disabled={isSendingEmail}
                                    className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingEmail}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all hover:scale-105 active:scale-95"
                                >
                                    {isSendingEmail ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Enviando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} />
                                            <span>Enviar Comprobante</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialPanel;