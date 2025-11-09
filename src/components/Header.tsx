
import React from 'react';
import { LayoutGrid, List, Plus, Undo2, Sparkles, Tag, BarChartHorizontal, Wrench } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Header: React.FC = () => {
  const { 
    updatePreference, 
    setModal, 
    handleReset, 
    setCurrentView,
    fusionMode,
    selectedProductIds
  } = useAppContext();

  const isSpecialMode = fusionMode || selectedProductIds.size > 0;

  return (
    <header className="sticky top-0 z-20 bg-gray-900/70 backdrop-blur-lg border-b border-purple-500/20 p-4 shadow-md">
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
           <button onClick={() => setModal({ type: 'tools' })} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
            <Wrench size={18} />
            <span className="hidden sm:inline">Herramientas</span>
          </button>
           {!isSpecialMode && (
            <>
              <button onClick={() => setCurrentView('financials')} className="flex items-center gap-2 bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <BarChartHorizontal size={18} />
                <span className="hidden sm:inline">Finanzas</span>
              </button>
               <button onClick={() => setModal({ type: 'add-category' })} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <Tag size={18} />
                <span className="hidden sm:inline">Nueva Cat.</span>
              </button>
               <button onClick={() => setModal({ type: 'add' })} className="flex items-center gap-2 bg-brand-purple hover:bg-purple-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <Plus size={18} />
                <span className="hidden sm:inline">Añadir</span>
              </button>
              <button onClick={handleReset} className="flex items-center gap-2 bg-brand-red hover:bg-red-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <Undo2 size={18} />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            </>
           )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
