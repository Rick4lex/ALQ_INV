import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Menu, 
  X, 
  BarChartHorizontal, 
  Wrench, 
  Tag, 
  RefreshCw, 
  Download, 
  FileJson, 
  FileText, 
  Printer, 
  Lock, 
  LogOut, 
  Store,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const MobileBottomNav: React.FC = () => {
  const { 
    setModal, 
    setCurrentView, 
    currentView, 
    handleManualSync, 
    isSyncing, 
    handleBackupDownload,
    fusionMode,
    selectedProductIds
  } = useAppContext();

  const { user, lock, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isSpecialMode = fusionMode || selectedProductIds.size > 0;

  // Si estamos en selección masiva o fusión, la barra especializada toma el control
  if (isSpecialMode) return null;

  const handleOpenAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <>
      {/* 1. Barra Inferior Fija para Móviles (Visible solo en pantallas < md) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-xl border-t border-purple-500/25 px-2 py-1.5 shadow-2xl safe-area-pb"
        aria-label="Navegación principal móvil"
      >
        <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
          {/* Botón 1: Catálogo */}
          <button
            onClick={() => {
              if (currentView !== 'catalog') setCurrentView('catalog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors ${
              currentView === 'catalog' 
                ? 'text-purple-400 font-semibold' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Store size={20} className={currentView === 'catalog' ? 'stroke-[2.5]' : ''} />
            <span className="text-[10px] mt-0.5">Catálogo</span>
          </button>

          {/* Botón 2: Venta Rápida (Destacado Central) */}
          <button
            onClick={() => setModal({ type: 'quick-sale' })}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 group"
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:from-emerald-400 group-hover:to-teal-400 active:scale-95 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center -mt-3 border border-emerald-400/40">
              <ShoppingCart size={20} className="stroke-[2.5]" />
            </div>
            <span className="text-[10px] text-emerald-400 font-bold mt-0.5">Venta</span>
          </button>

          {/* Botón 3: Añadir Producto */}
          <button
            onClick={() => setModal({ type: 'add' })}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <Plus size={20} />
            <span className="text-[10px] mt-0.5">Añadir</span>
          </button>

          {/* Botón 4: Menú "Más" */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors ${
              isMenuOpen 
                ? 'text-purple-400 font-semibold' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Menu size={20} />
            <span className="text-[10px] mt-0.5">Más</span>
          </button>
        </div>
      </nav>

      {/* 2. Drawer / Bottom Sheet para el Menú "Más" */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="bg-gray-900 border-t border-purple-500/30 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  Menú de Opciones
                </span>
                <span className="text-[10px] bg-purple-950/80 border border-purple-500/40 text-purple-300 font-semibold px-2 py-0.5 rounded-full uppercase">
                  {user?.role}
                </span>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sección: Administración y Gestión */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Gestión
              </h4>

              {isAdmin && (
                <>
                  <button
                    onClick={() => handleOpenAction(() => setModal({ type: 'tools' }))}
                    className="w-full flex items-center justify-between p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-700/60 text-purple-400 rounded-lg">
                        <Wrench size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">Herramientas y Diagnóstico</span>
                        <span className="text-[11px] text-gray-400 block">CSV, Auditoría, Respaldo y Ping</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>

                  <button
                    onClick={() => handleOpenAction(() => setCurrentView('financials'))}
                    className="w-full flex items-center justify-between p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-green/20 text-brand-green rounded-lg">
                        <BarChartHorizontal size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">Panel Financiero</span>
                        <span className="text-[11px] text-gray-400 block">Costos, utilidades y balance</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>
                </>
              )}

              <button
                onClick={() => handleOpenAction(() => setModal({ type: 'add-category' }))}
                className="w-full flex items-center justify-between p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/20 text-brand-blue rounded-lg">
                    <Tag size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">Gestionar Categorías</span>
                    <span className="text-[11px] text-gray-400 block">Organizar catálogo</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Sección: Nube y Sincronización */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Sincronización
              </h4>
              <button
                onClick={() => handleOpenAction(() => handleManualSync(false))}
                disabled={isSyncing}
                className="w-full flex items-center justify-between p-3 bg-cyan-950/30 hover:bg-cyan-950/50 rounded-xl border border-cyan-500/40 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                    <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-cyan-200 block">
                      {isSyncing ? "Sincronizando con Sheets..." : "Sincronizar Catálogo"}
                    </span>
                    <span className="text-[11px] text-cyan-400/80 block">Actualizar cambios con Google Sheets</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-cyan-500/60" />
              </button>
            </div>

            {/* Sección: Exportaciones */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Exportar y Respaldar
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleOpenAction(handleBackupDownload)}
                    className="p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors flex items-center gap-2.5"
                  >
                    <Download size={16} className="text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-200">Backup .json</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleOpenAction(() => setModal({ type: 'export', format: 'json' }))}
                    className="p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors flex items-center gap-2.5"
                  >
                    <FileJson size={16} className="text-indigo-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-200">Ver JSON</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenAction(() => setModal({ type: 'export', format: 'catalog' }))}
                  className="p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors flex items-center gap-2.5"
                >
                  <Printer size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-200">Imprimir Catálogo</span>
                </button>
                <button
                  onClick={() => handleOpenAction(() => setModal({ type: 'export', format: 'markdown' }))}
                  className="p-3 bg-gray-800/80 hover:bg-gray-800 rounded-xl border border-gray-700/80 text-left transition-colors flex items-center gap-2.5"
                >
                  <FileText size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-200">Markdown</span>
                </button>
              </div>
            </div>

            {/* Sección: Seguridad y Sesión */}
            <div className="pt-2 border-t border-gray-800 flex items-center gap-2">
              <button
                onClick={() => handleOpenAction(lock)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded-xl text-xs font-semibold border border-gray-700 transition-colors"
              >
                <Lock size={15} />
                <span>Bloquear</span>
              </button>
              <button
                onClick={() => handleOpenAction(logout)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-rose-400 rounded-xl text-xs font-semibold border border-gray-700 transition-colors"
              >
                <LogOut size={15} />
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(MobileBottomNav);
