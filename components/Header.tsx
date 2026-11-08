
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
    <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-lg border-b border-purple-500/20 p-4 shadow-md">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
        <a href="https://rick4lex.github.io/ALQUIMA/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
           <Sparkles className="h-8 w-8 text-purple-400" />
           <h1 className="text-xl md:text-2xl font-bold text-white whitespace-nowrap">Alquima Mizu</h1>
        </a>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => updatePreference('viewMode', 'grid')}
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Vista de cuadrícula"
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => updatePreference('viewMode', 'list')}
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Vista de lista"
          >
            <List size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
           {user?.role === 'admin' && (
             <button onClick={() => setModal({ type: 'tools' })} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
              <Wrench size={18} />
              <span className="hidden sm:inline">Herramientas</span>
            </button>
           )}
           {!isSpecialMode && (
            <>
              {/* Vista Finanzas: Solo accesible para rol Administrador */}
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setCurrentView('financials')} 
                  className="flex items-center gap-2 bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105 shadow-xs"
                >
                  <BarChartHorizontal size={18} />
                  <span className="hidden sm:inline">Finanzas</span>
                </button>
              )}

               <button onClick={() => setModal({ type: 'add-category' })} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105" title="Gestión de Categorías">
                <Tag size={18} />
                <span className="hidden sm:inline">Categorías</span>
              </button>
               <button onClick={() => setModal({ type: 'add' })} className="flex items-center gap-2 bg-brand-purple hover:bg-purple-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <Plus size={18} />
                <span className="hidden sm:inline">Añadir</span>
              </button>
              <button 
                onClick={() => setModal({ type: 'quick-sale' })} 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105 shadow-md shadow-emerald-950/30 border border-emerald-500/30"
                title="Venta Rápida / Carrito Multiproducto"
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline">Venta Rápida</span>
              </button>
            </>
           )}

           {/* Badge de Rol y Acciones de Seguridad */}
           {user && (
             <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-gray-700/80">
               <div 
                 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
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
                 className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-amber-300 border border-gray-700 transition-colors"
                 title="Bloquear pantalla (o inactividad de 15 min)"
                 aria-label="Bloquear pantalla"
               >
                 <Lock size={16} />
               </button>

               <button
                 onClick={logout}
                 className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-red-400 border border-gray-700 transition-colors"
                 title="Cerrar sesión"
                 aria-label="Cerrar sesión"
               >
                 <LogOut size={16} />
               </button>
             </div>
           )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);