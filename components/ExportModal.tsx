import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '../types';
import Modal from './Modal';
import { Copy, Check, Printer, Filter } from 'lucide-react';
import CatalogPreview from './CatalogPreview';

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
  const [selectedHint, setSelectedHint] = useState<string>('Todas');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isAvailable = p.available && !ignoredProductIds.includes(p.id);
      if (!isAvailable) return false;
      const matchesHint = selectedHint === 'Todas' || p.imageHint === selectedHint;
      return matchesHint;
    });
  }, [products, ignoredProductIds, selectedHint]);

  const uniqueHints = useMemo(() => {
    const hints = new Set(products.map(p => p.imageHint).filter(Boolean));
    return ['Todas', ...Array.from(hints)];
  }, [products]);

  useEffect(() => {
    if (isOpen) {
      setSelectedHint('Todas');
    }
  }, [isOpen, format]);

  useEffect(() => {
    if (!isOpen) return;

    if (format === 'json') {
      const dataToExport = { placeholderImages: products };
      setContent(JSON.stringify(dataToExport, null, 2));
    } else if (format === 'markdown') {
      const markdown = filteredProducts
        .map(p => `- ${p.title}${p.price ? ` - ${p.price}` : ''}`)
        .join('\n');
      setContent(markdown);
    }
  }, [isOpen, format, products, filteredProducts]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handlePrint = () => {
    window.print();
  };
  
  const showHintFilter = (format === 'markdown' || format === 'catalog') && uniqueHints.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[format]} size={format === 'catalog' ? 'xl' : 'lg'}>
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

      {format === 'catalog' ? (
        <div>
          <button onClick={handlePrint} className="no-print mb-4 flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
            <Printer size={18} />
            <span>Imprimir / Guardar como PDF</span>
          </button>
          <div className="bg-white text-black p-4 rounded-md">
            <CatalogPreview products={filteredProducts} />
          </div>
        </div>
      ) : (
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
      )}
    </Modal>
  );
};

export default ExportModal;