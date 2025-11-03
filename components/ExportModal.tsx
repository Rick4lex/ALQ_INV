import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '../types';
import Modal from './Modal';
import { Copy, Check, Printer, Filter, ChevronDown } from 'lucide-react';
import CatalogPreview from './CatalogPreview';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { formatPrice, transformProductForExport, formatVariantPrice } from '../utils';

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

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, format, products, ignoredProductIds }) => {
  const [markdownSelectedHint, setMarkdownSelectedHint] = useState<string>('Todas');
  const [omittedHints, setOmittedHints] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.OMITTED_HINTS, []);
  const [catalogSelectedHints, setCatalogSelectedHints] = useLocalStorage<string[]>(LOCAL_STORAGE_KEYS.CATALOG_SELECTED_HINTS, []);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const allHints = useMemo(() => Array.from(new Set(products.flatMap(p => p.imageHint || []).filter(Boolean))), [products]);

  useEffect(() => {
    if (isOpen && format === 'catalog') {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CATALOG_SELECTED_HINTS);
        if (stored === null) {
            setCatalogSelectedHints(allHints);
        }
    }
  }, [isOpen, format, allHints, setCatalogSelectedHints]);
  
  const filteredProducts = useMemo(() => {
    const baseProducts = products.filter(p => p.variants.some(v => v.stock > 0) && !ignoredProductIds.includes(p.id));

    if (format === 'markdown') {
        if (markdownSelectedHint === 'Todas') return baseProducts;
        return baseProducts.filter(p => p.imageHint && p.imageHint.includes(markdownSelectedHint));
    }
    if (format === 'catalog') {
        if (catalogSelectedHints.length === 0) return [];
        return baseProducts.filter(p => (p.imageHint || []).some(hint => catalogSelectedHints.includes(hint)));
    }
    return baseProducts;
  }, [products, ignoredProductIds, format, markdownSelectedHint, catalogSelectedHints]);

  useEffect(() => {
    if (!isOpen) return;

    if (format === 'json') {
      const productsToExport = products
        .filter(p => {
            if (p.id === 'banner') return true;
            return p.imageUrls && p.imageUrls.length > 0 && p.imageUrls[0].trim() !== '';
        })
        .map(transformProductForExport);

      const dataToExport = { placeholderImages: productsToExport };
      setContent(JSON.stringify(dataToExport, null, 2));

    } else if (format === 'markdown') {
        let markdown = '';
        const groupedByHint = filteredProducts.reduce((acc, product) => {
            const hints = product.imageHint && product.imageHint.length > 0 ? product.imageHint : ['Otros'];
            hints.forEach(hint => {
                if (!acc[hint]) acc[hint] = [];
                acc[hint].push(product);
            });
            return acc;
        }, {} as Record<string, Product[]>);

        const generateProductMarkdown = (productsInGroup: Product[]) => {
            return productsInGroup
                .sort((a, b) => a.title.localeCompare(b.title))
                .map(p => {
                    const availableVariants = p.variants.filter(v => v.stock > 0 && v.price && v.price > 0);
                    if (availableVariants.length === 0) return `- ${p.title}: Agotado`;

                    let productLine = `- ${p.title}:`;
                    if (availableVariants.length === 1) {
                        productLine += ` ${formatVariantPrice(availableVariants[0], { markdown: true })}`;
                    } else {
                        const variantLines = availableVariants
                            .sort((a,b) => a.price! - b.price!)
                            .map(v => `  * ${v.name}: ${formatVariantPrice(v, { markdown: true })}`)
                            .join('\n');
                        productLine += `\n${variantLines}`;
                    }
                    return productLine;
                })
                .join('\n');
        };

        if (markdownSelectedHint !== 'Todas') {
            const header = `*${markdownSelectedHint}*\n`;
            markdown = header + generateProductMarkdown(groupedByHint[markdownSelectedHint] || []);
        } else {
            markdown = Object.entries(groupedByHint)
                .sort(([hintA], [hintB]) => hintA.localeCompare(hintB))
                .filter(([hint]) => !omittedHints.includes(hint))
                .map(([hint, productsInGroup]) => `\n*${hint}*\n${generateProductMarkdown(productsInGroup)}`)
                .join('\n');
        }
        setContent(markdown.trim());
    }
  }, [isOpen, format, products, filteredProducts, ignoredProductIds, markdownSelectedHint, omittedHints]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handlePrint = () => window.print();

  const handleOmitHintToggle = (hint: string) => setOmittedHints(prev => prev.includes(hint) ? prev.filter(h => h !== hint) : [...prev, hint]);
  
  const handleCatalogHintToggle = (hint: string) => setCatalogSelectedHints(prev => prev.includes(hint) ? prev.filter(h => h !== hint) : [...prev, hint]);

  const showMarkdownHintFilter = format === 'markdown' && allHints.length > 0;
  const showCatalogHintFilter = format === 'catalog' && allHints.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[format]} size={format === 'catalog' ? 'full' : 'lg'}>
      {format === 'catalog' ? (
        <div className="bg-gray-700 w-full h-full overflow-auto p-4 md:p-8">
          <div className="no-print mx-auto max-w-4xl mb-4 space-y-4">
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                <Printer size={18} />
                <span>Imprimir / Guardar como PDF</span>
              </button>
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
          <div id="catalog-to-print" className="bg-white text-black p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl mx-auto my-8">
            <CatalogPreview products={filteredProducts} />
          </div>
        </div>
      ) : (
        <div className="p-6">
          {showMarkdownHintFilter && (
            <div className="no-print mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
              <label htmlFor="hint-filter" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Filter size={16} />
                Filtrar por Serie (imageHint)
              </label>
              <select
                id="hint-filter"
                value={markdownSelectedHint}
                onChange={(e) => setMarkdownSelectedHint(e.target.value)}
                className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                {['Todas', ...allHints].map(hint => (
                  <option key={hint} value={hint}>{hint}</option>
                ))}
              </select>
            </div>
          )}
          {format === 'markdown' && markdownSelectedHint === 'Todas' && allHints.length > 1 && (
            <details className="no-print mb-4 text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-white flex items-center gap-1">
                    <ChevronDown size={16} className="transition-transform transform details-open:rotate-180" />
                    Omitir Series del Markdown
                </summary>
                <div className="mt-2 p-3 bg-gray-700/50 rounded-lg border border-gray-600 max-h-32 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allHints.map(hint => (
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
          <div className="p-6">
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