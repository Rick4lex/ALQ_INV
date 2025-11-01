import React from 'react';
import ToggleSwitch from './ToggleSwitch';
import { Search } from 'lucide-react';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showAvailableOnly: boolean;
  onAvailabilityChange: (show: boolean) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  productCount: number;
  categories: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  showAvailableOnly,
  onAvailabilityChange,
  selectedCategory,
  onCategoryChange,
  productCount,
  categories
}) => {
  const allFilterCategories = ['Todas', ...categories];

  return (
    <div className="sticky top-[73px] z-10 bg-gray-800/60 backdrop-blur-lg p-4 rounded-xl mb-6 shadow-lg border border-purple-500/20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <ToggleSwitch
            checked={showAvailableOnly}
            onChange={onAvailabilityChange}
            label="Solo Disponibles"
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

export default FilterBar;
