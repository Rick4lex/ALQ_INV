
import React from 'react';
import { LayoutGrid, List, Plus, ShoppingCart, Sparkles, Tag, BarChartHorizontal, Wrench, Lock, LogOut } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { 
    updatePreference, 
    setModal, 
    setCurrentView,
    fusionMode,
    selectedProductIds
  } = useAppContext();

  const { user, lock, logout } = useAuth();

  const isSpecialMode = fusionMode || selectedProductIds.size > 0;

  return (
    <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-lg border-b border-purple-500/20 px-3 py-2 sm:p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <a href="https://rick4lex.github.io/ALQUIMA/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-shrink-0">
           <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
           <h1 className="text-base sm:text-xl md:text-2xl font-bold text-white whitespace-nowrap">
             <span className="sm:hidden">Alquima</span>
             <span className="hidden sm:inline">Alquima Mizu</span>
           </h1>
        </a>
        
        {/* Controles de vista (Grid / List) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => updatePreference('viewMode', 'grid')}
            className="p-1.5 sm:p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Vista de cuadrícula"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => updatePreference('viewMode', 'list')}
            className="p-1.5 sm:p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Vista de lista"
          >
            <List size={18} />
          </button>
        </div>

        {/* Acceso Rápido Móvil (Solo Rol y Bloqueo) */}
        <div className="flex md:hidden items-center gap-1.5">
          {user && (
            <>
              <div 
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  user.role === 'admin'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                    : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                }`}
              >
                <span>{user.role}</span>
              </div>
              <button
                onClick={lock}
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 transition-colors"
                title="Bloquear pantalla"
              >
                <Lock size={15} />
              </button>
            </>
          )}
        </div>

        {/* Acciones de Escritorio (Ocultas en Móvil) */}
        <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
           {user?.role === 'admin' && (
             <button onClick={() => setModal({ type: 'tools' })} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-medium py-2 px-3.5 rounded-xl border border-gray-700 transition-all active:scale-95 text-xs">
              <Wrench size={16} className="text-purple-400" />
              <span>Herramientas</span>
            </button>
           )}
           {!isSpecialMode && (
            <>
              {/* Vista Finanzas: Solo accesible para rol Administrador */}
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setCurrentView('financials')} 
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-medium py-2 px-3.5 rounded-xl border border-gray-700 transition-all active:scale-95 text-xs"
                >
                  <BarChartHorizontal size={16} className="text-emerald-400" />
                  <span>Finanzas</span>
                </button>
              )}

               <button onClick={() => setModal({ type: 'add-category' })} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-medium py-2 px-3.5 rounded-xl border border-gray-700 transition-all active:scale-95 text-xs" title="Gestión de Categorías">
                <Tag size={16} className="text-blue-400" />
                <span>Categorías</span>
              </button>
               <button onClick={() => setModal({ type: 'add' })} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-medium py-2 px-3.5 rounded-xl border border-gray-700 transition-all active:scale-95 text-xs">
                <Plus size={16} className="text-purple-400" />
                <span>Añadir</span>
              </button>
              <button 
                onClick={() => setModal({ type: 'quick-sale' })} 
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-500/40 transition-all active:scale-95 text-xs"
                title="Venta Rápida / Carrito Multiproducto"
              >
                <ShoppingCart size={16} />
                <span>Venta Rápida</span>
              </button>
            </>
           )}

           {/* Badge de Rol y Acciones de Seguridad en Escritorio */}
           {user && (
             <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-gray-700/80">
               <div 
                 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                   user.role === 'admin'
                     ? 'bg-purple-950/80 text-purple-300 border-purple-500/40 shadow-xs'
                     : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 shadow-xs'
                 }`}
                 title={`Sesión activa: ${user.role} (${user.email || 'local'})`}
               >
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                 <span>{user.role}</span>
               </div>

               <button
                 onClick={lock}
                 className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-amber-300 border border-gray-700 transition-colors"
                 title="Bloquear pantalla"
                 aria-label="Bloquear pantalla"
               >
                 <Lock size={15} />
               </button>

               <button
                 onClick={logout}
                 className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-red-400 border border-gray-700 transition-colors"
                 title="Cerrar sesión"
                 aria-label="Cerrar sesión"
               >
                 <LogOut size={15} />
               </button>
             </div>
           )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);