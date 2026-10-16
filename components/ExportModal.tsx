import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product } from '../types';
import Modal from './Modal';
import { 
  Copy, Check, Printer, Filter, Download, 
  Layers, LayoutGrid, Search, Image as ImageIcon, PackageCheck, X, RotateCcw,
  ChevronDown, AlertTriangle
} from 'lucide-react';
import CatalogPreview from './CatalogPreview';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { formatVariantPrice, getSortPrice, generateCsvContent, transformProductForExport } from '../utils';
import { useAppContext } from '../contexts/AppContext';
import { CatalogGroupMode, paginateCatalog } from '../catalogPagination';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'json' | 'markdown' | 'catalog' | 'csv';
}

const titles = {
  json: 'Exportar a JSON',
  markdown: 'Exportar a Markdown',
  catalog: 'Vista Previa y Generador de Catálogo PDF',
  csv: 'Exportar a CSV / Excel',
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, format }) => {
  const { products, ignoredProductIds, allCategories } = useAppContext();
  
  // Estado para Catálogo
  const [catalogSelectedHints, setCatalogSelectedHints] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.CATALOG_SELECTED_HINTS, []);
  const [catalogGroupMode, setCatalogGroupMode] = useState<CatalogGroupMode>('series');
  const [catalogPageSize, setCatalogPageSize] = useState<number>(6);
  const [catalogShowPrices, setCatalogShowPrices] = useState<boolean>(true);
  const [catalogOnlyWithPhotos, setCatalogOnlyWithPhotos] = useState<boolean>(false);
  const [catalogOnlyInStock, setCatalogOnlyInStock] = useState<boolean>(true);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState<string>('');
  const [catalogSelectedCategory, setCatalogSelectedCategory] = useState<string>('Todas');

  // Estado para Markdown (Filtros Avanzados y Selección Múltiple)
  const [markdownSelectedHints, setMarkdownSelectedHints] = useState<string[]>([]);
  const hasInitializedMarkdownHintsRef = useRef<boolean>(false);
  const [markdownSelectedCategory, setMarkdownSelectedCategory] = useState<string>('Todas');
  const [markdownOnlyInStock, setMarkdownOnlyInStock] = useState<boolean>(true);
  const [markdownOnlyWithPhotos, setMarkdownOnlyWithPhotos] = useState<boolean>(false);
  const [markdownSearchTerm, setMarkdownSearchTerm] = useState<string>('');
  const [markdownGroupMode, setMarkdownGroupMode] = useState<'series' | 'category' | 'none'>('series');
  const [markdownBoldStyle, setMarkdownBoldStyle] = useState<'whatsapp' | 'standard'>('whatsapp');
  const [markdownShowPrices, setMarkdownShowPrices] = useState<boolean>(true);
  const [markdownHintSearchTerm, setMarkdownHintSearchTerm] = useState<string>('');
  const [isMarkdownSeriesExpanded, setIsMarkdownSeriesExpanded] = useState<boolean>(true);

  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  // Lista de hints únicos
  const allHints = useMemo(() => Array.from(new Set((products || []).flatMap(p => p.imageHint || []).filter(Boolean))), [products]);

  // Hints con conteo de productos disponibles para Markdown
  const hintsWithCounts = useMemo(() => {
    if (!products) return [];
    const counts: Record<string, number> = {};
    let withoutHintCount = 0;

    products.forEach(p => {
      if (ignoredProductIds.includes(p.id)) return;
      if (!p.imageHint || p.imageHint.length === 0) {
        withoutHintCount++;
      } else {
        p.imageHint.forEach(h => {
          if (h) counts[h] = (counts[h] || 0) + 1;
        });
      }
    });

    const list = Object.entries(counts)
      .map(([hint, count]) => ({ hint, count }))
      .sort((a, b) => a.hint.localeCompare(b.hint));

    if (withoutHintCount > 0) {
      list.push({ hint: 'Sin Serie / Otros', count: withoutHintCount });
    }

    return list;
  }, [products, ignoredProductIds]);

  const allAvailableMarkdownHints = useMemo(() => hintsWithCounts.map(h => h.hint), [hintsWithCounts]);

  // Inicialización de hints para Catálogo
  useEffect(() => {
    if (isOpen && format === 'catalog') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CATALOG_SELECTED_HINTS);
      if (stored === null) {
        setCatalogSelectedHints(allHints);
      }
    }
  }, [isOpen, format, allHints, setCatalogSelectedHints]);

  // Inicialización de hints para Markdown al abrir el modal
  useEffect(() => {
    if (isOpen && format === 'markdown') {
      if (!hasInitializedMarkdownHintsRef.current && allAvailableMarkdownHints.length > 0) {
        setMarkdownSelectedHints(allAvailableMarkdownHints);
        hasInitializedMarkdownHintsRef.current = true;
      }
    } else if (!isOpen) {
      hasInitializedMarkdownHintsRef.current = false;
    }
  }, [isOpen, format, allAvailableMarkdownHints]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    if (format === 'catalog') {
      return products.filter(p => {
        if (ignoredProductIds.includes(p.id)) return false;

        // 1. Filtro Solo en Stock
        if (catalogOnlyInStock && !p.variants.some(v => v.stock > 0)) {
          return false;
        }

        // 2. Filtro Solo con Fotos Disponibles
        if (catalogOnlyWithPhotos) {
          const hasImage = p.imageUrls && p.imageUrls.length > 0 && p.imageUrls[0].trim() !== '';
          if (!hasImage) return false;
        }

        // 3. Filtro por Categoría
        if (catalogSelectedCategory !== 'Todas' && p.category !== catalogSelectedCategory) {
          return false;
        }

        // 4. Filtro por Serie / imageHint
        if (catalogSelectedHints.length > 0) {
          const matchesHint = (p.imageHint || []).some(hint => catalogSelectedHints.includes(hint));
          if (!matchesHint) return false;
        } else {
          return false;
        }

        // 5. Filtro de Búsqueda por texto
        if (catalogSearchTerm.trim()) {
          const query = catalogSearchTerm.toLowerCase();
          const matchesText = 
            (p.title || '').toLowerCase().includes(query) ||
            (p.details || '').toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query) ||
            (p.imageHint || []).some(h => h.toLowerCase().includes(query));
          if (!matchesText) return false;
        }

        return true;
      });
    }

    if (format === 'markdown') {
      return products.filter(p => {
        if (ignoredProductIds.includes(p.id)) return false;

        // 1. Filtro Solo en Stock
        if (markdownOnlyInStock && !p.variants.some(v => v.stock > 0)) {
          return false;
        }

        // 2. Filtro Solo con Fotos Disponibles
        if (markdownOnlyWithPhotos) {
          const hasImage = p.imageUrls && p.imageUrls.length > 0 && p.imageUrls[0].trim() !== '';
          if (!hasImage) return false;
        }

        // 3. Filtro por Categoría
        if (markdownSelectedCategory !== 'Todas' && p.category !== markdownSelectedCategory) {
          return false;
        }

        // 4. Filtro por Selección Múltiple de Serie (imageHint)
        if (allAvailableMarkdownHints.length > 0) {
          if (markdownSelectedHints.length === 0) return false;

          const productHints = (p.imageHint && p.imageHint.length > 0)
            ? p.imageHint
            : ['Sin Serie / Otros'];

          const matchesHint = productHints.some(hint => markdownSelectedHints.includes(hint));
          if (!matchesHint) return false;
        }

        // 5. Filtro de Búsqueda por texto
        if (markdownSearchTerm.trim()) {
          const query = markdownSearchTerm.toLowerCase();
          const matchesText = 
            (p.title || '').toLowerCase().includes(query) ||
            (p.details || '').toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query) ||
            (p.imageHint || []).some(h => h.toLowerCase().includes(query));
          if (!matchesText) return false;
        }

        return true;
      });
    }

    return products.filter(p => p.variants.some(v => v.stock > 0) && !ignoredProductIds.includes(p.id));
  }, [
    products, 
    ignoredProductIds, 
    format, 
    catalogOnlyInStock, 
    catalogOnlyWithPhotos, 
    catalogSelectedCategory, 
    catalogSelectedHints, 
    catalogSearchTerm,
    markdownOnlyInStock,
    markdownOnlyWithPhotos,
    markdownSelectedCategory,
    markdownSelectedHints,
    markdownSearchTerm,
    allAvailableMarkdownHints
  ]);

  const estimatedCatalogPages = useMemo(() => {
    if (format !== 'catalog') return 0;
    return paginateCatalog(filteredProducts, { 
      pageSize: catalogPageSize, 
      groupMode: catalogGroupMode,
      onlyAvailable: catalogOnlyInStock,
      packSmallSeries: true,
    }).length;
  }, [filteredProducts, catalogPageSize, catalogGroupMode, catalogOnlyInStock, format]);

  const nonIgnoredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => !ignoredProductIds.includes(p.id));
  }, [products, ignoredProductIds]);

  // Generación de Contenido (JSON, Markdown, CSV)
  useEffect(() => {
    if (!isOpen || !products) return;

    if (format === 'json') {
      const sortedProducts = [...products].sort((a, b) => {
        const priceA = getSortPrice(a);
        const priceB = getSortPrice(b);
        if (priceA === -1 && priceB !== -1) return -1;
        if (priceA !== -1 && priceB === -1) return 1;
        if (priceA === -1 && priceB === -1) return a.title.localeCompare(b.title);
        return priceA - priceB;
      });

      const productsToExport = sortedProducts
        .filter(p => {
          if (p.id === 'banner') return true;
          return p.imageUrls && p.imageUrls.length > 0 && p.imageUrls[0].trim() !== '';
        })
        .map(transformProductForExport);

      const dataToExport = { placeholderImages: productsToExport };
      setContent(JSON.stringify(dataToExport, null, 2));

    } else if (format === 'markdown') {
      const bold = markdownBoldStyle === 'whatsapp' ? '*' : '**';

      const generateProductMarkdown = (productsInGroup: Product[]) => {
        return productsInGroup
          .sort((a, b) => {
            const priceA = getSortPrice(a);
            const priceB = getSortPrice(b);
            if (priceA === -1 && priceB !== -1) return -1;
            if (priceA !== -1 && priceB === -1) return 1;
            if (priceA === -1 && priceB === -1) return a.title.localeCompare(b.title);
            return priceA - priceB;
          })
          .map(p => {
            const availableVariants = p.variants.filter(v => 
              markdownOnlyInStock ? (v.stock > 0 && typeof v.price === 'number' && v.price > 0) : (typeof v.price === 'number' && v.price > 0)
            );

            if (!markdownShowPrices) {
              return `- ${p.title}`;
            }

            if (availableVariants.length === 0) {
              return `- ${p.title}: Agotado`;
            }

            let productLine = `- ${p.title}:`;
            if (availableVariants.length === 1) {
              const formattedPrice = formatVariantPrice(availableVariants[0], { markdown: false });
              productLine += ` ${bold}${formattedPrice}${bold}`;
            } else {
              const variantLines = availableVariants
                .sort((a, b) => (a.price || 0) - (b.price || 0))
                .map(v => {
                  const formattedPrice = formatVariantPrice(v, { markdown: false });
                  return `  * ${v.name}: ${bold}${formattedPrice}${bold}`;
                })
                .join('\n');
              productLine += `\n${variantLines}`;
            }
            return productLine;
          })
          .join('\n');
      };

      let markdown = '';

      if (markdownGroupMode === 'none') {
        markdown = generateProductMarkdown(filteredProducts);
      } else if (markdownGroupMode === 'category') {
        const groupedByCategory = filteredProducts.reduce((acc: Record<string, Product[]>, product) => {
          const cat = product.category || 'Sin Categoría';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(product);
          return acc;
        }, {} as Record<string, Product[]>);

        markdown = Object.entries(groupedByCategory)
          .sort(([catA], [catB]) => catA.localeCompare(catB))
          .map(([cat, prods]) => `${bold}${cat.toUpperCase()}${bold}\n${generateProductMarkdown(prods)}`)
          .join('\n\n');
      } else {
        // Agrupar por Serie (imageHint)
        const groupedByHint: Record<string, Product[]> = {};
        filteredProducts.forEach(product => {
          const matchedHints = (product.imageHint && product.imageHint.length > 0)
            ? product.imageHint.filter(h => markdownSelectedHints.includes(h))
            : (markdownSelectedHints.includes('Sin Serie / Otros') ? ['Sin Serie / Otros'] : []);

          const hintsToUse = matchedHints.length > 0 
            ? matchedHints 
            : (markdownSelectedHints.includes('Sin Serie / Otros') ? ['Sin Serie / Otros'] : ['Otros']);

          hintsToUse.forEach(hint => {
            if (!groupedByHint[hint]) groupedByHint[hint] = [];
            if (!groupedByHint[hint].includes(product)) {
              groupedByHint[hint].push(product);
            }
          });
        });

        markdown = Object.entries(groupedByHint)
          .sort(([hintA], [hintB]) => hintA.localeCompare(hintB))
          .map(([hint, prods]) => `${bold}${hint}${bold}\n${generateProductMarkdown(prods)}`)
          .join('\n\n');
      }

      setContent(markdown.trim());

    } else if (format === 'csv') {
      setContent(generateCsvContent(nonIgnoredProducts));
    }
  }, [
    isOpen, 
    format, 
    products, 
    filteredProducts, 
    markdownGroupMode, 
    markdownBoldStyle, 
    markdownShowPrices, 
    markdownOnlyInStock, 
    markdownSelectedHints, 
    nonIgnoredProducts
  ]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handlePrint = () => window.print();
  
  const handleDownloadCsv = () => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alquima-mizu-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alquima-mizu-catalogo-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const handleCatalogHintToggle = (hint: string) => {
    setCatalogSelectedHints(prev => prev.includes(hint) ? prev.filter(h => h !== hint) : [...prev, hint]);
  };

  // Filtrado de series dentro del modal de Markdown
  const filteredHintsForSelection = useMemo(() => {
    if (!markdownHintSearchTerm.trim()) return hintsWithCounts;
    const term = markdownHintSearchTerm.toLowerCase();
    return hintsWithCounts.filter(h => h.hint.toLowerCase().includes(term));
  }, [hintsWithCounts, markdownHintSearchTerm]);

  // Manejadores para selección múltiple de hints
  const handleSelectAllHints = useCallback(() => {
    if (markdownHintSearchTerm.trim()) {
      const visibleHints = filteredHintsForSelection.map(h => h.hint);
      setMarkdownSelectedHints(prev => Array.from(new Set([...prev, ...visibleHints])));
    } else {
      setMarkdownSelectedHints(allAvailableMarkdownHints);
    }
  }, [markdownHintSearchTerm, filteredHintsForSelection, allAvailableMarkdownHints]);

  const handleDeselectAllHints = useCallback(() => {
    if (markdownHintSearchTerm.trim()) {
      const visibleHints = filteredHintsForSelection.map(h => h.hint);
      setMarkdownSelectedHints(prev => prev.filter(h => !visibleHints.includes(h)));
    } else {
      setMarkdownSelectedHints([]);
    }
  }, [markdownHintSearchTerm, filteredHintsForSelection]);

  const handleInvertHints = useCallback(() => {
    if (markdownHintSearchTerm.trim()) {
      const visibleHints = filteredHintsForSelection.map(h => h.hint);
      setMarkdownSelectedHints(prev => {
        const next = [...prev];
        visibleHints.forEach(h => {
          const idx = next.indexOf(h);
          if (idx >= 0) {
            next.splice(idx, 1);
          } else {
            next.push(h);
          }
        });
        return next;
      });
    } else {
      setMarkdownSelectedHints(prev => allAvailableMarkdownHints.filter(h => !prev.includes(h)));
    }
  }, [markdownHintSearchTerm, filteredHintsForSelection, allAvailableMarkdownHints]);

  // ¿Hay filtros de Markdown modificados?
  const isAnyMarkdownFilterActive = useMemo(() => {
    return (
      markdownSearchTerm !== '' ||
      markdownSelectedCategory !== 'Todas' ||
      markdownOnlyWithPhotos ||
      !markdownOnlyInStock ||
      !markdownShowPrices ||
      markdownGroupMode !== 'series' ||
      markdownBoldStyle !== 'whatsapp' ||
      markdownSelectedHints.length !== allAvailableMarkdownHints.length
    );
  }, [
    markdownSearchTerm,
    markdownSelectedCategory,
    markdownOnlyWithPhotos,
    markdownOnlyInStock,
    markdownShowPrices,
    markdownGroupMode,
    markdownBoldStyle,
    markdownSelectedHints,
    allAvailableMarkdownHints
  ]);

  const handleResetMarkdownFilters = () => {
    setMarkdownSearchTerm('');
    setMarkdownSelectedCategory('Todas');
    setMarkdownOnlyWithPhotos(false);
    setMarkdownOnlyInStock(true);
    setMarkdownShowPrices(true);
    setMarkdownGroupMode('series');
    setMarkdownBoldStyle('whatsapp');
    setMarkdownHintSearchTerm('');
    setMarkdownSelectedHints(allAvailableMarkdownHints);
  };

  const showCatalogHintFilter = format === 'catalog' && allHints.length > 0;
  
  const renderContent = () => {
    switch (format) {
      case 'catalog':
        return (
          <div className="catalog-container-wrapper bg-gray-900/95 w-full h-full overflow-auto p-4 md:p-8">
            <div className="no-print mx-auto max-w-4xl mb-6 space-y-4">
              {/* Botón Principal y Resumen de Páginas */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-800/90 p-3 rounded-xl border border-gray-600 shadow-md">
                <button 
                  onClick={handlePrint} 
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg transition-transform transform hover:scale-[1.02] shadow-sm"
                >
                  <Printer size={18} />
                  <span>Imprimir / Guardar como PDF</span>
                </button>

                <div className="flex items-center justify-center gap-2 bg-gray-900/80 px-4 py-2 rounded-lg border border-gray-700 text-xs">
                  <span className="font-semibold text-purple-300">{filteredProducts.length} productos</span>
                  <span className="text-gray-500">•</span>
                  <span className="font-semibold text-cyan-300">
                    {estimatedCatalogPages} {estimatedCatalogPages === 1 ? 'hoja A4' : 'hojas A4'}
                  </span>
                </div>
              </div>

              {/* Filtros de Contenido del Catálogo */}
              <div className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-600 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Búsqueda por texto */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por título, serie o detalle..."
                      value={catalogSearchTerm}
                      onChange={(e) => setCatalogSearchTerm(e.target.value)}
                      className="w-full bg-gray-900 text-white text-xs pl-9 pr-8 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-400"
                    />
                    {catalogSearchTerm && (
                      <button 
                        onClick={() => setCatalogSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Selector de Categoría */}
                  <div className="flex items-center gap-1.5 min-w-[170px]">
                    <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Cat:</span>
                    <select
                      value={catalogSelectedCategory}
                      onChange={(e) => setCatalogSelectedCategory(e.target.value)}
                      className="w-full bg-gray-900 text-white text-xs py-2 px-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 capitalize"
                    >
                      <option value="Todas">Todas las Categorías</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interruptores de Filtro Específicos */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-700/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filtro: Solo con Foto Disponible */}
                    <button
                      type="button"
                      onClick={() => setCatalogOnlyWithPhotos(!catalogOnlyWithPhotos)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        catalogOnlyWithPhotos 
                          ? 'bg-purple-600/90 border-purple-400 text-white shadow-xs' 
                          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <ImageIcon size={14} className={catalogOnlyWithPhotos ? "text-purple-200" : "text-gray-400"} />
                      <span>Solo Foto Disponibles</span>
                    </button>

                    {/* Filtro: Solo en Stock */}
                    <button
                      type="button"
                      onClick={() => setCatalogOnlyInStock(!catalogOnlyInStock)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        catalogOnlyInStock 
                          ? 'bg-green-600/80 border-green-400 text-white shadow-xs' 
                          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <PackageCheck size={14} className={catalogOnlyInStock ? "text-green-200" : "text-gray-400"} />
                      <span>Solo con Stock</span>
                    </button>

                    {/* Filtro: Mostrar Precios */}
                    <button
                      type="button"
                      onClick={() => setCatalogShowPrices(!catalogShowPrices)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        catalogShowPrices 
                          ? 'bg-blue-600/80 border-blue-400 text-white shadow-xs' 
                          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span>Mostrar Precios</span>
                    </button>
                  </div>

                  {/* Reseteo rápido si hay filtros activos */}
                  {(catalogSearchTerm || catalogSelectedCategory !== 'Todas' || catalogOnlyWithPhotos || !catalogOnlyInStock) && (
                    <button
                      onClick={() => {
                        setCatalogSearchTerm('');
                        setCatalogSelectedCategory('Todas');
                        setCatalogOnlyWithPhotos(false);
                        setCatalogOnlyInStock(true);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Configuración de Maquetación y Distribución A4 */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-800/80 rounded-xl border border-gray-600 text-sm">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-purple-400" />
                  <span className="font-medium text-gray-300 text-xs">Organizar por:</span>
                  <select
                    value={catalogGroupMode}
                    onChange={(e) => setCatalogGroupMode(e.target.value as CatalogGroupMode)}
                    className="bg-gray-700 text-white text-xs rounded px-2.5 py-1.5 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="series">Serie / Franquicia (Recomendado)</option>
                    <option value="category">Categoría</option>
                    <option value="none">Continuo (Sin dividir por sección)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <LayoutGrid size={16} className="text-cyan-400" />
                  <span className="font-medium text-gray-300 text-xs">Diseño A4:</span>
                  <select
                    value={catalogPageSize}
                    onChange={(e) => setCatalogPageSize(Number(e.target.value))}
                    className="bg-gray-700 text-white text-xs rounded px-2.5 py-1.5 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value={6}>6 productos / hoja (Estándar 3x2)</option>
                    <option value={9}>9 productos / hoja (Compacto 3x3)</option>
                  </select>
                </div>
              </div>

              <div className="md:hidden p-3 text-center text-xs bg-yellow-900/50 text-yellow-300 rounded-lg border border-yellow-700">
                Para una mejor experiencia de impresión, por favor usa una computadora. En móvil, puedes intentar usar la función de 'captura de pantalla con desplazamiento' de tu dispositivo.
              </div>

              {showCatalogHintFilter && (
                <details className="p-3 bg-gray-800/50 rounded-lg border border-gray-600" open>
                  <summary className="cursor-pointer font-medium text-gray-300 flex items-center gap-2">
                    <Filter size={16} />
                    Filtrar por Serie (selección múltiple)
                  </summary>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <button onClick={() => setCatalogSelectedHints(allHints)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded">Todos</button>
                    <button onClick={() => setCatalogSelectedHints([])} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded">Ninguno</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {allHints.map(hint => (
                      <label key={hint} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-gray-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={catalogSelectedHints.includes(hint)}
                          onChange={() => handleCatalogHintToggle(hint)}
                          className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-600"
                        />
                        {hint}
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <div id="catalog-to-print" className="w-full max-w-4xl mx-auto my-4">
              <CatalogPreview 
                products={filteredProducts} 
                groupMode={catalogGroupMode} 
                pageSize={catalogPageSize} 
                showPrices={catalogShowPrices}
                showAvailableOnly={catalogOnlyInStock}
                onlyAvailable={catalogOnlyInStock}
              />
            </div>
          </div>
        );

      case 'markdown':
        return (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 items-start">
              
              {/* COLUMNA 1 (IZQUIERDA EN DESKTOP): Filtros y Acordeón de Series */}
              <div className="w-full lg:col-span-6 space-y-4">
                {/* Panel de Filtros Generales */}
                <div className="bg-gray-800/80 p-3.5 rounded-xl border border-gray-700 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Búsqueda por texto */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar producto, serie o detalle..."
                        value={markdownSearchTerm}
                        onChange={(e) => setMarkdownSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 text-white text-xs pl-8 pr-7 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 placeholder-gray-500"
                      />
                      {markdownSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setMarkdownSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Filtro por Categoría */}
                    <div className="flex items-center gap-1.5 min-w-[150px]">
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Cat:</span>
                      <select
                        value={markdownSelectedCategory}
                        onChange={(e) => setMarkdownSelectedCategory(e.target.value)}
                        className="w-full bg-gray-900 text-white text-xs py-2 px-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 capitalize"
                      >
                        <option value="Todas">Todas las Categorías</option>
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Agrupar por */}
                    <div className="flex items-center gap-1.5 min-w-[140px]">
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Agrupar:</span>
                      <select
                        value={markdownGroupMode}
                        onChange={(e) => setMarkdownGroupMode(e.target.value as 'series' | 'category' | 'none')}
                        className="w-full bg-gray-900 text-white text-xs py-2 px-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                      >
                        <option value="series">Por Serie</option>
                        <option value="category">Por Categoría</option>
                        <option value="none">Sin Grupos</option>
                      </select>
                    </div>

                    {/* Estilo de formato */}
                    <div className="flex items-center gap-1.5 min-w-[140px]">
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Estilo:</span>
                      <select
                        value={markdownBoldStyle}
                        onChange={(e) => setMarkdownBoldStyle(e.target.value as 'whatsapp' | 'standard')}
                        className="w-full bg-gray-900 text-white text-xs py-2 px-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                      >
                        <option value="whatsapp">WhatsApp (*texto*)</option>
                        <option value="standard">Markdown (**texto**)</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles interactivos */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-700/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Toggle Solo Fotos */}
                      <button
                        type="button"
                        onClick={() => setMarkdownOnlyWithPhotos(!markdownOnlyWithPhotos)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          markdownOnlyWithPhotos 
                            ? 'bg-purple-600/90 border-purple-400 text-white shadow-xs' 
                            : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <ImageIcon size={13} className={markdownOnlyWithPhotos ? "text-purple-200" : "text-gray-400"} />
                        <span>Solo Fotos</span>
                      </button>

                      {/* Toggle Solo Stock */}
                      <button
                        type="button"
                        onClick={() => setMarkdownOnlyInStock(!markdownOnlyInStock)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          markdownOnlyInStock 
                            ? 'bg-green-600/80 border-green-400 text-white shadow-xs' 
                            : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <PackageCheck size={13} className={markdownOnlyInStock ? "text-green-200" : "text-gray-400"} />
                        <span>Solo con Stock</span>
                      </button>

                      {/* Toggle Precios */}
                      <button
                        type="button"
                        onClick={() => setMarkdownShowPrices(!markdownShowPrices)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          markdownShowPrices 
                            ? 'bg-blue-600/80 border-blue-400 text-white shadow-xs' 
                            : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span>{markdownShowPrices ? 'Mostrar Precios' : 'Ocultar Precios'}</span>
                      </button>
                    </div>

                    {/* Reseteo rápido */}
                    {isAnyMarkdownFilterActive && (
                      <button
                        type="button"
                        onClick={handleResetMarkdownFilters}
                        className="text-xs text-purple-400 hover:text-purple-300 underline font-medium flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* Acordeón Plegable de Selección Múltiple de Series (imageHint) */}
                {allAvailableMarkdownHints.length > 0 && (
                  <div className={`bg-gray-800/80 rounded-xl border transition-all duration-200 shadow-xs ${
                    markdownSelectedHints.length === 0 ? 'border-amber-500/60' : 'border-gray-700'
                  }`}>
                    {/* Cabecera del Acordeón interactiva */}
                    <div 
                      onClick={() => setIsMarkdownSeriesExpanded(!isMarkdownSeriesExpanded)}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-gray-750/50 rounded-xl transition-colors"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsMarkdownSeriesExpanded(!isMarkdownSeriesExpanded);
                        }
                      }}
                      title={isMarkdownSeriesExpanded ? "Hacer clic para contraer series" : "Hacer clic para desplegar series"}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <ChevronDown 
                            size={16} 
                            className={`text-purple-400 transform transition-transform duration-200 ${
                              isMarkdownSeriesExpanded ? 'rotate-180' : ''
                            }`} 
                          />
                          <Layers size={16} className="text-purple-400" />
                          <span className="text-xs font-bold text-gray-200">
                            Filtrar por Serie (Selección Múltiple)
                          </span>
                        </div>

                        {/* Alerta de Estado Vacío en la Cabecera */}
                        {markdownSelectedHints.length === 0 ? (
                          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shadow-xs">
                            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                            <span>⚠️ 0 series seleccionadas (0 productos)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full font-semibold">
                            {markdownSelectedHints.length} de {allAvailableMarkdownHints.length} activas
                          </span>
                        )}
                      </div>

                      {/* Botones de acción rápida: stopPropagation evita alternar el acordeón */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={handleSelectAllHints}
                          className="text-xs bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 px-2.5 py-1 rounded transition-colors font-medium hover:text-white"
                          title="Seleccionar todas las series"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllHints}
                          className="text-xs bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 px-2.5 py-1 rounded transition-colors font-medium hover:text-white"
                          title="Deseleccionar todas las series"
                        >
                          Ninguna
                        </button>
                        <button
                          type="button"
                          onClick={handleInvertHints}
                          className="text-xs bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 px-2.5 py-1 rounded transition-colors font-medium hover:text-white"
                          title="Invertir selección actual"
                        >
                          Invertir
                        </button>
                      </div>
                    </div>

                    {/* Resumen sutil cuando el acordeón está contraído */}
                    {!isMarkdownSeriesExpanded && (
                      <div className="px-3.5 pb-3 pt-0 border-t border-gray-700/40 text-xs">
                        {markdownSelectedHints.length === 0 ? (
                          <div className="flex items-center justify-between gap-2 text-amber-300/90 font-medium bg-amber-950/30 p-2 rounded-lg border border-amber-900/50 mt-1">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                              <span>Atención: Al no haber series marcadas, el archivo Markdown estará vacío.</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleSelectAllHints}
                              className="text-[11px] underline font-bold text-amber-200 hover:text-white whitespace-nowrap"
                            >
                              Activar todas
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-gray-400 pt-1">
                            <span>
                              {markdownSelectedHints.length === allAvailableMarkdownHints.length 
                                ? 'Incluyendo todas las series disponibles.' 
                                : `Incluyendo ${markdownSelectedHints.length} series personalizadas.`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsMarkdownSeriesExpanded(true)}
                              className="text-purple-400 hover:text-purple-300 underline font-medium text-[11px]"
                            >
                              Desplegar para editar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cuerpo desplegado del acordeón */}
                    {isMarkdownSeriesExpanded && (
                      <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-gray-700/50">
                        {/* Buscador dentro de las series */}
                        {allAvailableMarkdownHints.length > 6 && (
                          <div className="relative pt-2">
                            <Search size={13} className="absolute left-2.5 top-[calc(50%+4px)] -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Buscar serie para filtrar..."
                              value={markdownHintSearchTerm}
                              onChange={(e) => setMarkdownHintSearchTerm(e.target.value)}
                              className="w-full bg-gray-900 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 placeholder-gray-500"
                            />
                            {markdownHintSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setMarkdownHintSearchTerm('')}
                                className="absolute right-2 top-[calc(50%+4px)] -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Cuadrícula de Series con Selección Múltiple */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {filteredHintsForSelection.map(({ hint, count }) => {
                            const isSelected = markdownSelectedHints.includes(hint);
                            return (
                              <button
                                type="button"
                                key={hint}
                                onClick={() => {
                                  setMarkdownSelectedHints(prev =>
                                    isSelected ? prev.filter(h => h !== hint) : [...prev, hint]
                                  );
                                }}
                                className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all border ${
                                  isSelected
                                    ? 'bg-purple-900/40 border-purple-500/70 text-purple-200 shadow-2xs'
                                    : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 text-[10px] ${
                                    isSelected ? 'bg-purple-600 text-white font-bold' : 'border border-gray-600'
                                  }`}>
                                    {isSelected ? '✓' : ''}
                                  </span>
                                  <span className="truncate">{hint}</span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
                                  isSelected ? 'bg-purple-800/80 text-purple-200' : 'bg-gray-800 text-gray-500'
                                }`}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 hidden lg:block">
                  {markdownBoldStyle === 'whatsapp' 
                    ? 'Formato optimizado para WhatsApp (*negrita* en series y precios).' 
                    : 'Formato estándar Markdown (**negrita** en series y precios).'}
                </p>
              </div>

              {/* COLUMNA 2 (DERECHA EN DESKTOP): Estadísticas y Previsualización en Vivo */}
              <div className="w-full lg:col-span-6 flex flex-col space-y-3 mt-4 lg:mt-0">
                {/* Barra de Estadísticas y Acciones */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-800/90 p-3 rounded-xl border border-gray-700 shadow-xs">
                  <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-700 text-xs">
                    <span className="font-semibold text-purple-300">{filteredProducts.length} productos</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-cyan-300 font-medium">{content.length} caracteres</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      disabled={filteredProducts.length === 0}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 font-semibold py-2 px-3 rounded-lg text-xs transition-colors border border-gray-600"
                    >
                      <Download size={14} />
                      <span>Descargar .md</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={filteredProducts.length === 0}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 font-bold py-2 px-3.5 rounded-lg text-xs transition-all shadow-md ${
                        copied 
                          ? 'bg-green-600 text-white' 
                          : 'bg-brand-blue hover:bg-blue-600 disabled:opacity-40 text-white hover:scale-[1.02]'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? '¡Copiado!' : 'Copiar Markdown'}</span>
                    </button>
                  </div>
                </div>

                {/* Previsualización del Contenido */}
                <div className="relative flex-1">
                  {filteredProducts.length === 0 ? (
                    <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-8 text-center space-y-2.5">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                        <AlertTriangle size={20} />
                      </div>
                      <p className="text-gray-200 font-semibold text-sm">No hay productos que coincidan con los filtros seleccionados.</p>
                      <p className="text-gray-400 text-xs max-w-md mx-auto">
                        {markdownSelectedHints.length === 0 
                          ? 'La lista de series está vacía. Activa al menos una serie o presiona "Todas".'
                          : 'Prueba seleccionando más series o ajustando los filtros de fotos, stock o categoría.'}
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        {markdownSelectedHints.length === 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAllHints}
                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                          >
                            Seleccionar Todas las Series
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetMarkdownFilters}
                          className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline py-1.5"
                        >
                          Restablecer todos los filtros
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <pre className="bg-gray-950 text-gray-200 text-xs p-4 rounded-xl overflow-auto max-h-72 lg:max-h-[460px] border border-gray-700/80 font-mono leading-relaxed select-all">
                        <code>{content}</code>
                      </pre>
                      <button 
                        onClick={handleCopy}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md border border-gray-600 shadow-sm transition-all"
                        title="Copiar contenido"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400 lg:hidden">
                  {markdownBoldStyle === 'whatsapp' 
                    ? 'Formato optimizado para WhatsApp (*negrita* en series y precios).' 
                    : 'Formato estándar Markdown (**negrita** en series y precios).'}
                </p>
              </div>

            </div>
          </div>
        );

      case 'csv':
        return (
          <div className="p-6 text-center">
            <p className="mb-6 text-gray-300">
              Se generará un archivo CSV con todos los productos y sus variantes. Este archivo es compatible con Excel, Google Sheets y otras hojas de cálculo.
            </p>
            <button onClick={handleDownloadCsv} className="flex items-center justify-center gap-3 w-full max-w-xs mx-auto bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
              <Download size={20} />
              Descargar Archivo .csv
            </button>
          </div>
        );

      case 'json':
      default:
        return (
          <div className="p-6">
            <div className="relative">
              <pre className="bg-gray-900 text-sm p-4 rounded-lg overflow-auto max-h-96 border border-gray-700">
                <code>{content}</code>
              </pre>
              <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                title="Copiar JSON"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Listo para pegar en placeholder-images.json
            </p>
          </div>
        );
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={titles[format]} 
      size={format === 'catalog' ? 'full' : format === 'markdown' ? '2xl' : 'lg'}
    >
      {renderContent()}
    </Modal>
  );
};

export default ExportModal;
