import React, { useState } from 'react';
import ToggleSwitch from './ToggleSwitch';
import { Search, X, Check, Tag, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showAvailableOnly: boolean;
  onAvailabilityChange: (show: boolean) => void;
  showIgnoredOnly: boolean;
  onIgnoredChange: (show: boolean) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  productCount: number;
  categories: string[];
  isFusionMode: boolean;
  selectedForFusionCount: number;
  onCancelFusion: () => void;
  onStartFusion: () => void;
  isSelectionMode: boolean;
  allTags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm, onSearchChange,
  showAvailableOnly, onAvailabilityChange,
  showIgnoredOnly, onIgnoredChange,
  selectedCategory, onCategoryChange,
  productCount, categories,
  isFusionMode, selectedForFusionCount, onCancelFusion, onStartFusion,
  isSelectionMode, allTags, selectedTags, onSelectedTagsChange,
}) => {
  const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false);
  const allFilterCategories = ['Todas', ...categories];

  const handleTagToggle = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag);
    onSelectedTagsChange(Array.from(newTags));
  };
  
  if (isFusionMode) {
    return (
      <div className="sticky top-[89px] z-10 bg-yellow-900/60 backdrop-blur-lg p-4 rounded-xl mb-6 shadow-lg border border-yellow-500/40 text-center">
          <h3 className="text-lg font-bold text-yellow-300">Modo Fusión Activo</h3>
          <p className="text-yellow-400 mb-4">Selecciona dos productos del catálogo para combinarlos.</p>
          <div className="flex justify-center items-center gap-4">
              <button onClick={onCancelFusion} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg">
                <X size={18} /> Cancelar
              </button>
              <button onClick={onStartFusion} disabled={selectedForFusionCount !== 2} className="flex items-center gap-2 bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <Check size={18} /> Fusionar {selectedForFusionCount > 0 ? `${selectedForFusionCount}` : ''}/2 Productos
              </button>
          </div>
      </div>
    );
  }

  if (isSelectionMode) {
     return (
      <div className="sticky top-[89px] z-10 bg-blue-900/60 backdrop-blur-lg p-4 rounded-xl mb-6 shadow-lg border border-blue-500/40 text-center">
          <h3 className="text-lg font-bold text-blue-300">Modo de Selección Múltiple</h3>
          <p className="text-blue-400">Selecciona los productos en los que deseas realizar acciones masivas.</p>
      </div>
    );
  }


  return (
    <div className="sticky top-[89px] z-10 bg-gray-800/60 backdrop-blur-lg p-4 rounded-xl mb-6 shadow-lg border border-purple-500/20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
        </div>
        
        <div className="relative lg:col-span-1">
          <button onClick={() => setTagsDropdownOpen(prev => !prev)} className="w-full flex justify-between items-center bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-left">
              <span className="flex items-center gap-2">
                <Tag size={18} className="text-gray-400" />
                <span>
                  {selectedTags.length > 0 ? `${selectedTags.length} serie(s)` : 'Filtrar por Series / Hints'}
                </span>
              </span>
              <ChevronDown size={20} className={`transition-transform ${tagsDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {tagsDropdownOpen && (
            <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 p-2">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {allTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => handleTagToggle(tag)} className="form-checkbox h-4 w-4 rounded bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-600" />
                    {tag}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center lg:justify-end gap-4 flex-wrap lg:col-span-1">
          <ToggleSwitch
            checked={showAvailableOnly}
            onChange={onAvailabilityChange}
            label="Disponibles"
          />
          <ToggleSwitch
            checked={showIgnoredOnly}
            onChange={onIgnoredChange}
            label="Ocultos"
          />
          <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">{productCount}</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex space-x-2">
          {allFilterCategories.map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-brand-purple text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterBar);