import React, { useState } from 'react';
import { LayoutGrid, List, Plus, Sparkles, Tag, BarChartHorizontal, Wrench, Share2, LogOut } from 'lucide-react';

interface HeaderProps {
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddProduct: () => void;
  onLeave: () => void;
  onAddCategory: () => void;
  onNavigateToFinancials: () => void;
  onOpenTools: () => void;
  isSpecialMode: boolean;
  docUrl: string;
}

const Header: React.FC<HeaderProps> = ({ onViewModeChange, onAddProduct, onLeave, onAddCategory, onNavigateToFinancials, onOpenTools, isSpecialMode, docUrl }) => {
  const [copied, setCopied] = useState(false);
  
  const handleShare = () => {
    navigator.clipboard.writeText(docUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <header className="sticky top-0 z-20 bg-gray-900/70 backdrop-blur-lg border-b border-purple-500/20 p-4 shadow-md">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
        <a href="https://rick4lex.github.io/ALQUIMA/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
           <Sparkles className="h-8 w-8 text-purple-400" />
           <h1 className="text-xl md:text-2xl font-bold text-white whitespace-nowrap">Alquima Mizu</h1>
        </a>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Vista de cuadrícula"
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Vista de lista"
          >
            <List size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={handleShare} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105 relative">
            <Share2 size={18} />
            <span className="hidden sm:inline">Compartir URL</span>
            {copied && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">¡URL Copiada!</span>}
          </button>
           <button onClick={onOpenTools} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
            <Wrench size={18} />
            <span className="hidden sm:inline">Herramientas</span>
          </button>
           {!isSpecialMode && (
            <>
              <button onClick={onNavigateToFinancials} className="flex items-center gap-2 bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <BarChartHorizontal size={18} />
                <span className="hidden sm:inline">Finanzas</span>
              </button>
               <button onClick={onAddCategory} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <Tag size={18} />
                <span className="hidden sm:inline">Nueva Cat.</span>
              </button>
               <button onClick={onAddProduct} className="flex items-center gap-2 bg-brand-purple hover:bg-purple-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <Plus size={18} />
                <span className="hidden sm:inline">Añadir</span>
              </button>
              <button onClick={onLeave} className="flex items-center gap-2 bg-brand-red hover:bg-red-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-transform transform hover:scale-105">
                <LogOut size={18} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
           )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);