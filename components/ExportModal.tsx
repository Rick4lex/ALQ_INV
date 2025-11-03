
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Variant } from '../types';
import Modal from './Modal';
import { Copy, Check, Printer, Filter, ChevronDown } from 'lucide-react';
import CatalogPreview from './CatalogPreview';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from '../constants';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'json' | 'markdown' | 'catalog';
  products: Product[];
  ignoredProductIds: string[];
}

const titles = {
  json: 'Exportar a JSON',
  markdown: 'Exportar a Markdown',
  catalog: 'Vista Previa del Catálogo',
};

// Helper function to calculate a display price string for a product
const getPriceDisplay = (product: Product): string => {
    const availablePricedVariants = product.variants.filter(v => v.stock > 0 && v.price);

    if (availablePricedVariants.length === 0) {
        return "Consultar precio";
    }

    const prices = availablePricedVariants.map(v => parseFloat(v.price!.replace(/[^0-9.-]+/g, "")));

    if (prices.some(isNaN)) {
        return availablePricedVariants[0]?.price || "Consultar precio";
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const firstPriceString = availablePricedVariants[0].price!;

    if (minPrice === maxPrice) {
        return firstPriceString;
    } else {
        const currency = firstPriceString.replace(/[0-9.,\s]/g, '');
        return `${minPrice.toLocaleString('es-CO')} - ${maxPrice.toLocaleString('es-CO')} ${currency}`;
    }
};


const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, format, products, ignoredProductIds }) => {
  const [selectedHint, setSelectedHint] = useState<string>('Todas');
  const [omittedHints, setOmittedHints] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.OMITTED_HINTS, []);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const uniqueHints = useMemo(() => {
    const hints = new Set(products.flatMap(p => p.imageHint || []).filter(Boolean));
    return ['Todas', ...Array.from(hints)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isAvailable = p.variants.some(v => v.stock > 0) && !ignoredProductIds.includes(p.id);
      if (!isAvailable) return false;
      const matchesHint = selectedHint === 'Todas' || (p.imageHint && p.imageHint.includes(selectedHint));
      return matchesHint;
    });
  }, [products, ignoredProductIds, selectedHint]);

  useEffect(() => {
    if (isOpen) {
      setSelectedHint('Todas');
      // Omitted hints are now persistent and should not be reset.
    }
  }, [isOpen, format]);

  useEffect(() => {
    if (!isOpen) return;

    if (format === 'json') {
      const productsToExport = products.map(p => {
        // Handle special cases like 'banner' that don't have variants/price/availability
        if (p.id === 'banner') {
            const { variants, ...bannerData } = p;
            return bannerData;
        }

        const { variants, ...restOfProduct } = p;
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        
        // Find the first variant that has a price to use as the representative price
        const representativeVariant = variants.find(v => v.price) || (variants.length > 0 ? variants[0] : null);

        const finalProduct: any = {
            ...restOfProduct,
            available: totalStock > 0,
        };

        // Only add the price property if a representative variant with a price was found
        if (representativeVariant && representativeVariant.price) {
            finalProduct.price = representativeVariant.price;
        }
        
        return finalProduct;
      });

      const dataToExport = { 
        placeholderImages: productsToExport
      };
      setContent(JSON.stringify(dataToExport, null, 2));

    } else if (format === 'markdown') {
        let markdown = '';
        const groupedByHint = filteredProducts.reduce((acc, product) => {
            const hints = product.imageHint && product.imageHint.length > 0 ? product.imageHint : ['Otros'];
            hints.forEach(hint => {
                if (!acc[hint]) {
                    acc[hint] = [];
                }
                acc[hint].push(product);
            });
            return acc;
        }, {} as Record<string, Product[]>);

        if (selectedHint !== 'Todas') {
            const header = `*${selectedHint}*\n`;
            const productLines = (groupedByHint[selectedHint] || [])
                .sort((a, b) => a.title.localeCompare(b.title))
                .map(p => {
                    const priceDisplay = getPriceDisplay(p);
                    return `- ${p.title}: ${priceDisplay}`;
                }).join('\n');
            markdown = header + productLines;
        } else {
            markdown = Object.entries(groupedByHint)
                .sort(([hintA], [hintB]) => hintA.localeCompare(hintB))
                .filter(([hint]) => !omittedHints.includes(hint))
                .map(([hint, productsInGroup]) => {
                    const header = `\n*${hint}*\n`;
                    const productLines = productsInGroup
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map(p => {
                            const priceDisplay = getPriceDisplay(p);
                            return `- ${p.title}: ${priceDisplay}`;
                        }).join('\n');
                    return header + productLines;
                }).join('\n');
        }
        setContent(markdown.trim());
    }
  }, [isOpen, format, products, filteredProducts, ignoredProductIds, selectedHint, omittedHints]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handlePrint = () => {
    window.print();
  };

  const handleOmitHintToggle = (hint: string) => {
    setOmittedHints(prev => 
      prev.includes(hint) ? prev.filter(h => h !== hint) : [...prev, hint]
    );
  };
  
  const showHintFilter = (format === 'markdown' || format === 'catalog') && uniqueHints.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[format]} size={format === 'catalog' ? 'full' : 'lg'}>
      {format === 'catalog' ? (
        <div className="bg-gray-700 w-full h-full overflow-auto p-4 md:p-8">
          <div className="no-print mx-auto max-w-4xl mb-4 space-y-4">
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                <Printer size={18} />
                <span>Imprimir / Guardar como PDF</span>
              </button>
            {showHintFilter && (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                <label htmlFor="hint-filter" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Filter size={16} />
                  Filtrar por Serie (imageHint)
                </label>
                <select
                  id="hint-filter"
                  value={selectedHint}
                  onChange={(e) => setSelectedHint(e.target.value)}
                  className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                >
                  {uniqueHints.map(hint => (
                    <option key={hint} value={hint}>{hint}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div id="catalog-to-print" className="bg-white text-black p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto my-8">
            <CatalogPreview products={filteredProducts} />
          </div>
        </div>
      ) : (
        <div className="p-6">
          {showHintFilter && (
            <div className="no-print mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
              <label htmlFor="hint-filter" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Filter size={16} />
                Filtrar por Serie (imageHint)
              </label>
              <select
                id="hint-filter"
                value={selectedHint}
                onChange={(e) => setSelectedHint(e.target.value)}
                className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                {uniqueHints.map(hint => (
                  <option key={hint} value={hint}>{hint}</option>
                ))}
              </select>
            </div>
          )}
          {format === 'markdown' && selectedHint === 'Todas' && uniqueHints.length > 2 && (
            <details className="no-print mb-4 text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-white flex items-center gap-1">
                    <ChevronDown size={16} className="transition-transform transform details-open:rotate-180" />
                    Omitir Series del Markdown
                </summary>
                <div className="mt-2 p-3 bg-gray-700/50 rounded-lg border border-gray-600 max-h-32 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {uniqueHints.filter(h => h !== 'Todas').map(hint => (
                    <label key={hint} className="flex items-center gap-2 text-xs">
                        <input
                        type="checkbox"
                        checked={omittedHints.includes(hint)}
                        onChange={() => handleOmitHintToggle(hint)}
                        className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-600"
                        />
                        {hint}
                    </label>
                    ))}
                </div>
                </div>
            </details>
          )}
          <div>
            <div className="relative">
              <pre className="bg-gray-900 text-sm p-4 rounded-lg overflow-auto max-h-96 border border-gray-700">
                <code>{content}</code>
              </pre>
              <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {format === 'json' ? 'Listo para pegar en placeholder-images.json' : 'Formato optimizado para WhatsApp/Instagram.'}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ExportModal;