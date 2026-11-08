import React, { useState, useMemo } from 'react';
import ToggleSwitch from './ToggleSwitch';
import { 
  Search, 
  X, 
  Check, 
  Tag, 
  ChevronDown, 
  Image as ImageIcon, 
  ImageOff, 
  Sparkles,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { PhotoFilterMode } from '../types';

interface FilterBarProps {
  productCount: number;
  allTags: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({ productCount, allTags }) => {
  const {
    preferences,
    updatePreference,
    handleIgnoredChange,
    allCategories,
    fusionMode,
    selectedForFusion,
    setFusionMode,
    setSelectedForFusion,
    startFusion,
    selectedProductIds,
    selectedTags,
    setSelectedTags,
  } = useAppContext();

  const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false);
  const [photoDropdownOpen, setPhotoDropdownOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const allFilterCategories = ['Todas', ...allCategories];

  const handleTagToggle = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag);
    setSelectedTags(Array.from(newTags));
  };

  const photoFilterOptions: Array<{
    id: PhotoFilterMode;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    colorClass: string;
  }> = [
    {
      id: 'all',
      label: 'Todas las fotos',
      sublabel: 'Mostrar todo el inventario',
      icon: <ImageIcon size={16} className="text-gray-400" />,
      colorClass: 'text-gray-200',
    },
    {
      id: 'with_photo',
      label: 'Solo con foto',
      sublabel: 'Oculta productos sin imagen',
      icon: <ImageIcon size={16} className="text-green-400" />,
      colorClass: 'text-green-400',
    },
    {
      id: 'without_photo',
      label: 'Solo sin foto',
      sublabel: 'Modo auditoría para completar',
      icon: <ImageOff size={16} className="text-yellow-400" />,
      colorClass: 'text-yellow-400',
    },
    {
      id: 'photos_first',
      label: 'Con foto primero',
      sublabel: 'Ordenar priorizando imágenes',
      icon: <Sparkles size={16} className="text-purple-400" />,
      colorClass: 'text-purple-400',
    },
  ];

  const activePhotoOption = photoFilterOptions.find(opt => opt.id === (preferences.photoFilter || 'all')) || photoFilterOptions[0];

  const handleSelectPhotoFilter = (mode: PhotoFilterMode) => {
    updatePreference('photoFilter', mode);
    setPhotoDropdownOpen(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (preferences.showAvailableOnly) count++;
    if (preferences.showIgnoredOnly) count++;
    if (fusionMode) count++;
    if (preferences.photoFilter && preferences.photoFilter !== 'all') count++;
    if (selectedTags.length > 0) count += selectedTags.length;
    return count;
  }, [preferences, fusionMode, selectedTags]);

  const handleResetFilters = () => {
    updatePreference('showAvailableOnly', false);
    if (preferences.showIgnoredOnly) handleIgnoredChange(false);
    if (fusionMode) {
      setFusionMode(false);
      setSelectedForFusion([]);
    }
    updatePreference('photoFilter', 'all');
    setSelectedTags([]);
  };
  
  if (fusionMode) {
    return (
      <div className="sticky top-[52px] md:top-[89px] z-30 bg-yellow-900/95 backdrop-blur-lg p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 shadow-lg border border-yellow-500/40 text-center">
          <h3 className="text-base sm:text-lg font-bold text-yellow-300">Modo Fusión Activo</h3>
          <p className="text-xs sm:text-sm text-yellow-400 mb-3">Selecciona 2 productos del catálogo para combinarlos.</p>
          <div className="flex justify-center items-center gap-3">
              <button onClick={() => { setFusionMode(false); setSelectedForFusion([]); }} className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm">
                <X size={16} /> Cancelar
              </button>
              <button onClick={startFusion} disabled={selectedForFusion.length !== 2} className="flex items-center gap-1.5 bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm">
                <Check size={16} /> Fusionar {selectedForFusion.length > 0 ? `${selectedForFusion.length}` : ''}/2
              </button>
          </div>
      </div>
    );
  }

  if (selectedProductIds.size > 0) {
     return (
      <div className="sticky top-[52px] md:top-[89px] z-30 bg-blue-900/90 backdrop-blur-lg p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 shadow-lg border border-blue-500/40 text-center">
          <h3 className="text-base sm:text-lg font-bold text-blue-300">Modo de Selección Múltiple</h3>
          <p className="text-xs sm:text-sm text-blue-400">Selecciona los productos en los que deseas realizar acciones masivas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-[52px] md:top-[89px] z-30 bg-gray-900/95 md:bg-gray-800/95 backdrop-blur-lg p-2.5 sm:p-4 rounded-xl mb-4 sm:mb-6 shadow-xl border border-purple-500/30">
        
        {/* 1. Vista Móvil: Buscador compacto + Botón Drawer de Filtros */}
        <div className="flex md:hidden items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={preferences.searchTerm}
              onChange={(e) => updatePreference('searchTerm', e.target.value)}
              className="w-full bg-gray-800/90 border border-gray-700 rounded-xl py-2 pl-9 pr-8 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-gray-500 text-white"
            />
            {preferences.searchTerm && (
              <button
                onClick={() => updatePreference('searchTerm', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 ${
              activeFiltersCount > 0
                ? 'bg-purple-900/60 border-purple-500/60 text-purple-200 shadow-sm'
                : 'bg-gray-800/90 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal size={14} className={activeFiltersCount > 0 ? "text-purple-400" : "text-gray-400"} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* 2. Vista Desktop: 4 Columnas completas */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Buscador Desktop */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={preferences.searchTerm}
              onChange={(e) => updatePreference('searchTerm', e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            />
          </div>
          
          {/* Filtro de Series Desktop */}
          <div className="relative">
            <button 
              onClick={() => {
                setTagsDropdownOpen(prev => !prev);
                setPhotoDropdownOpen(false);
              }} 
              className="w-full flex justify-between items-center bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-left hover:bg-gray-700 transition-colors"
            >
                <span className="flex items-center gap-2 truncate">
                  <Tag size={17} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">
                    {selectedTags.length > 0 ? `${selectedTags.length} serie(s)` : 'Series / Hints'}
                  </span>
                </span>
                <ChevronDown size={18} className={`transition-transform text-gray-400 flex-shrink-0 ${tagsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {tagsDropdownOpen && (
              <div className="absolute top-full mt-2 w-full sm:w-64 left-0 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-40 p-2">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-700 text-xs">
                  <span className="text-gray-400 font-medium">Series / Hints</span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Limpiar ({selectedTags.length})
                    </button>
                  )}
                </div>
                {allTags.length === 0 ? (
                  <p className="text-xs text-gray-400 p-2 text-center">No hay series registradas</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {allTags.map(tag => (
                      <label key={tag} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => handleTagToggle(tag)} className="form-checkbox h-4 w-4 rounded bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-600" />
                        <span className="truncate">{tag}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selector de Fotos y Orden Desktop */}
          <div className="relative">
            <button 
              onClick={() => {
                setPhotoDropdownOpen(prev => !prev);
                setTagsDropdownOpen(false);
              }} 
              className={`w-full flex justify-between items-center border rounded-lg py-2 px-3 text-left transition-colors ${
                preferences.photoFilter === 'with_photo'
                  ? 'bg-green-950/40 border-green-500/60 text-green-300'
                  : preferences.photoFilter === 'without_photo'
                  ? 'bg-yellow-950/40 border-yellow-500/60 text-yellow-300'
                  : preferences.photoFilter === 'photos_first'
                  ? 'bg-purple-950/40 border-purple-500/60 text-purple-300'
                  : 'bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {activePhotoOption.icon}
                <span className="text-sm font-medium truncate">{activePhotoOption.label}</span>
              </span>
              <ChevronDown size={18} className={`transition-transform text-gray-400 flex-shrink-0 ${photoDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {photoDropdownOpen && (
              <div className="absolute top-full mt-2 w-full sm:w-64 left-0 sm:left-auto sm:right-0 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-40 p-1.5 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-700/80 mb-1">
                  Filtro y Orden de Fotos
                </div>
                {photoFilterOptions.map(option => {
                  const isSelected = (preferences.photoFilter || 'all') === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectPhotoFilter(option.id)}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors ${
                        isSelected ? 'bg-purple-900/40 border border-purple-500/50 text-white' : 'hover:bg-gray-700/60 text-gray-300'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{option.icon}</div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${option.colorClass}`}>{option.label}</span>
                          {isSelected && <Check size={14} className="text-purple-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{option.sublabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggles Desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            <ToggleSwitch
              checked={preferences.showAvailableOnly}
              onChange={(show) => updatePreference('showAvailableOnly', show)}
              label="Disponibles"
            />
            <ToggleSwitch
              checked={!!preferences.showIgnoredOnly}
              onChange={handleIgnoredChange}
              label="Ocultos"
            />
            <ToggleSwitch
              checked={fusionMode}
              onChange={(active) => {
                setFusionMode(active);
                if (!active) setSelectedForFusion([]);
              }}
              label="Fusionar"
            />
            <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">{productCount}</span>
          </div>
        </div>

        {/* 3. Categorías: scroll horizontal limpio */}
        <div className="mt-1.5 md:mt-4 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex space-x-1.5 sm:space-x-2">
            {allFilterCategories.map(category => (
              <button
                key={category}
                onClick={() => updatePreference('selectedCategory', category)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                  preferences.selectedCategory === category
                    ? 'bg-brand-purple text-white shadow-sm'
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bottom Sheet Drawer de Filtros para Móviles */}
      {isMobileFilterOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-fade-in"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div 
            className="bg-gray-900 border-t border-purple-500/30 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Drawer de Filtros */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-purple-400" />
                <h3 className="text-base font-bold text-white">Filtros y Visualización</h3>
                {activeFiltersCount > 0 && (
                  <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount} activo(s)
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sección: Modos e Interruptores */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Modo de Visualización
              </h4>
              <div className="p-3 bg-gray-800/70 rounded-2xl border border-gray-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-200">Solo Disponibles (Stock &gt; 0)</span>
                  <ToggleSwitch
                    checked={preferences.showAvailableOnly}
                    onChange={(show) => updatePreference('showAvailableOnly', show)}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <span className="text-xs font-semibold text-gray-200">Productos Ocultos / Archivados</span>
                  <ToggleSwitch
                    checked={!!preferences.showIgnoredOnly}
                    onChange={handleIgnoredChange}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <div>
                    <span className="text-xs font-semibold text-green-400 block">Modo Fusión</span>
                    <span className="text-[10px] text-gray-400 block">Muestra casillas para fusionar 2 productos</span>
                  </div>
                  <ToggleSwitch
                    checked={fusionMode}
                    onChange={(active) => {
                      setFusionMode(active);
                      if (!active) setSelectedForFusion([]);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Filtro de Fotos */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Filtro de Fotografías
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {photoFilterOptions.map(option => {
                  const isSelected = (preferences.photoFilter || 'all') === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectPhotoFilter(option.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-purple-900/40 border-purple-500/70 text-white shadow-xs' 
                          : 'bg-gray-800/70 border-gray-700/70 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-shrink-0">{option.icon}</div>
                        {isSelected && <Check size={14} className="text-purple-400" />}
                      </div>
                      <span className={`text-xs font-semibold ${option.colorClass}`}>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sección: Series / Hints */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Series / Hints ({allTags.length})
                  </h4>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Limpiar ({selectedTags.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {allTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pie del Drawer Móvil */}
            <div className="pt-2 border-t border-gray-800 flex items-center gap-3">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold border border-gray-700 transition-colors flex-shrink-0"
                >
                  <RotateCcw size={14} />
                  <span>Limpiar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 px-4 bg-brand-purple hover:bg-purple-600 active:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all text-center"
              >
                Ver {productCount} Productos
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(FilterBar);