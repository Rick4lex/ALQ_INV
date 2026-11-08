import React, { useState, DragEvent, useMemo } from 'react';
import { Product, Variant, CsvUpdatePayload } from '../types';
import Modal from './Modal';
import { UploadCloud, CheckCircle, XCircle, AlertTriangle, ArrowRight, History, Download, FileSpreadsheet } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ParsedRow = {
  data: Record<string, string>;
  rowIndex: number;
  errors: string[];
};

type ChangePreview = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantName: string;
  sku: string;
  priceChange?: { from: number; to: number };
  costChange?: { from: number; to: number };
  stockChange?: { from: number; to: number };
};

const REQUIRED_HEADERS = ['variant_sku', 'variant_price', 'variant_cost', 'variant_stock'];

const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose }) => {
  const { products, handleCsvImport } = useAppContext();
  const [status, setStatus] = useState<'idle' | 'parsing' | 'preview' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [changePreviews, setChangePreviews] = useState<ChangePreview[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedRow[]>([]);
  const [noChangesCount, setNoChangesCount] = useState(0);
  const [validUpdates, setValidUpdates] = useState<CsvUpdatePayload[]>([]);

  const variantSkuMap = useMemo(() => {
    const map = new Map<string, { product: Product, variant: Variant }>();
    products?.forEach(p => {
      p.variants.forEach(v => {
        if (v.sku) map.set(v.sku, { product: p, variant: v });
      });
    });
    return map;
  }, [products]);

  const totalVariantsCount = useMemo(() => {
    return products?.reduce((sum, p) => sum + p.variants.length, 0) || 0;
  }, [products]);

  const handleDownloadTemplate = () => {
    if (!products || products.length === 0) return;

    const escape = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows: string[] = [
      'variant_sku,product_title,variant_name,variant_stock,variant_price,variant_cost'
    ];

    products.forEach(p => {
      p.variants.forEach(v => {
        const sku = v.sku || `${p.id}-${v.id}`;
        rows.push([
          escape(sku),
          escape(p.title),
          escape(v.name),
          escape(v.stock),
          escape(v.price !== undefined && v.price !== null ? v.price : ''),
          escape(v.cost !== undefined && v.cost !== null ? v.cost : '')
        ].join(','));
      });
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `alquima_inventario_actualizar_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setStatus('idle');
    setErrorMsg('');
    setIsDragging(false);
    setChangePreviews([]);
    setInvalidRows([]);
    setNoChangesCount(0);
    setValidUpdates([]);
  };
  
  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = (file: File) => {
    setStatus('parsing');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("El archivo CSV está vacío o solo contiene la cabecera.");

        const header = lines[0].split(',').map(h => h.trim());
        const missingHeaders = REQUIRED_HEADERS.filter(h => !header.includes(h));
        if (missingHeaders.length > 0) throw new Error(`Faltan las siguientes cabeceras requeridas: ${missingHeaders.join(', ')}`);

        const rows = lines.slice(1);
        const previews: ChangePreview[] = [];
        const invalids: ParsedRow[] = [];
        const updates: CsvUpdatePayload[] = [];
        let noChangeCounter = 0;

        rows.forEach((line, index) => {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
          const rowData: Record<string, string> = {};
          header.forEach((h, i) => rowData[h] = values[i]?.trim());
          const { variant_sku, variant_price, variant_cost, variant_stock } = rowData;
          const errors: string[] = [];

          const variantInfo = variant_sku ? variantSkuMap.get(variant_sku) : undefined;
          if (!variantInfo) {
            errors.push("SKU no encontrado en el catálogo.");
          }

          const priceNum = variant_price !== '' ? parseFloat(variant_price) : undefined;
          if (variant_price !== '' && (priceNum === undefined || isNaN(priceNum) || priceNum < 0)) errors.push("Precio inválido.");

          const costNum = variant_cost !== '' ? parseFloat(variant_cost) : undefined;
          if (variant_cost !== '' && (costNum === undefined || isNaN(costNum) || costNum < 0)) errors.push("Costo inválido.");
          
          const stockNum = variant_stock !== '' ? parseInt(variant_stock, 10) : undefined;
          if (variant_stock !== '' && (stockNum === undefined || isNaN(stockNum) || stockNum < 0)) errors.push("Stock inválido.");

          if (errors.length > 0) {
            invalids.push({ data: rowData, rowIndex: index + 2, errors });
            return;
          }

          if (variantInfo) {
            const { product, variant } = variantInfo;
            const preview: ChangePreview = { productId: product.id, productTitle: product.title, variantId: variant.id, variantName: variant.name, sku: variant.sku! };
            const update: CsvUpdatePayload = { variantId: variant.id };
            let hasChanged = false;

            if (priceNum !== undefined && priceNum !== variant.price) {
              preview.priceChange = { from: variant.price || 0, to: priceNum };
              update.newPrice = priceNum;
              hasChanged = true;
            }
            if (costNum !== undefined && costNum !== variant.cost) {
              preview.costChange = { from: variant.cost || 0, to: costNum };
              update.newCost = costNum;
              hasChanged = true;
            }
            if (stockNum !== undefined && stockNum !== variant.stock) {
              preview.stockChange = { from: variant.stock, to: stockNum };
              update.newStock = stockNum;
              hasChanged = true;
            }
            
            if (hasChanged) {
              previews.push(preview);
              updates.push(update);
            } else {
              noChangeCounter++;
            }
          }
        });
        
        setChangePreviews(previews);
        setInvalidRows(invalids);
        setNoChangesCount(noChangeCounter);
        setValidUpdates(updates);
        setStatus('preview');

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || "Error desconocido al procesar el archivo.");
      }
    };
    reader.onerror = () => { setStatus('error'); setErrorMsg('No se pudo leer el archivo.'); };
    reader.readAsText(file);
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      handleFile(selectedFile);
    } else {
      setStatus('error');
      setErrorMsg('Por favor, selecciona un archivo .csv válido.');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileSelect(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const renderUploader = () => (
    <div className="space-y-4 sm:space-y-5">
      {/* Paso 1: Descargar Plantilla */}
      <div className="p-4 sm:p-5 bg-gradient-to-br sm:bg-gradient-to-r from-gray-900/95 via-purple-950/40 to-gray-900/95 rounded-xl sm:rounded-2xl border border-purple-500/30 hover:border-purple-500/50 transition-all shadow-lg shadow-purple-950/20">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 sm:p-3 bg-purple-500/20 text-purple-400 rounded-xl flex-shrink-0 mt-0.5">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-purple-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Paso 1
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Descargar Plantilla del Inventario
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                Genera un archivo CSV con tus <strong className="text-purple-300 font-semibold">{totalVariantsCount} variantes</strong> registradas.
                Ábrelo en Excel o Google Sheets y modifica las columnas <code className="text-purple-300 font-mono text-[11px]">variant_stock</code>, <code className="text-purple-300 font-mono text-[11px]">variant_price</code> o <code className="text-purple-300 font-mono text-[11px]">variant_cost</code>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={totalVariantsCount === 0}
            className="flex-shrink-0 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 hover:shadow-purple-600/30 active:scale-[0.98]"
          >
            <Download size={18} />
            <span>Descargar Plantilla CSV</span>
          </button>
        </div>
      </div>

      {/* Paso 2: Subir Archivo Modificado */}
      <div className="p-4 sm:p-5 bg-gray-900/60 rounded-xl sm:rounded-2xl border border-gray-700/80">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Paso 2
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud size={20} className="text-blue-400" />
            Subir Archivo Modificado
          </h3>
        </div>
        <div
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-6 sm:p-10 border-2 border-dashed rounded-xl sm:rounded-2xl cursor-pointer transition-all ${
            isDragging 
              ? 'border-purple-400 bg-purple-900/30 scale-[1.01]' 
              : 'border-gray-600 hover:border-blue-400 bg-gray-800/40 hover:bg-gray-800/60'
          }`}
          onClick={() => document.getElementById('csvFileInput')?.click()}
        >
          <div className="p-3 bg-gray-700/50 rounded-2xl mb-3 text-gray-300">
            <UploadCloud size={36} className="text-blue-400" />
          </div>
          <span className="text-gray-100 font-semibold text-sm sm:text-base text-center">
            Arrastra y suelta tu archivo .csv aquí
          </span>
          <span className="text-xs text-gray-400 mt-1 text-center">
            o haz clic para examinar desde tu dispositivo
          </span>
          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-1 rounded-md border border-gray-700 font-mono">
              variant_sku
            </span>
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-1 rounded-md border border-gray-700 font-mono">
              variant_stock
            </span>
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-1 rounded-md border border-gray-700 font-mono">
              variant_price
            </span>
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-1 rounded-md border border-gray-700 font-mono">
              variant_cost
            </span>
          </div>
          <input
            id="csvFileInput"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-2.5 text-center leading-normal">
          El sistema comparará cada variante con la base de datos y te mostrará un resumen previo antes de aplicar los cambios.
        </p>
      </div>

      {status === 'error' && (
        <p className="text-center text-red-400 bg-red-900/50 p-3 rounded-xl border border-red-500/40 text-sm">
          {errorMsg}
        </p>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300">
          <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
          <div className="text-xs">
            <span className="font-bold text-sm text-white block">{changePreviews.length}</span>
            <span>variantes a actualizar</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300">
          <XCircle className="text-rose-400 flex-shrink-0" size={20} />
          <div className="text-xs">
            <span className="font-bold text-sm text-white block">{invalidRows.length}</span>
            <span>filas con errores</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-800/80 border border-gray-700 rounded-xl text-gray-300">
          <CheckCircle className="text-gray-400 flex-shrink-0" size={20} />
          <div className="text-xs">
            <span className="font-bold text-sm text-white block">{noChangesCount}</span>
            <span>filas sin modificaciones</span>
          </div>
        </div>
      </div>

      {changePreviews.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-gray-200 text-sm flex items-center gap-2">
            <span>Previsualización de Cambios a Aplicar:</span>
          </h4>
          <div className="max-h-64 overflow-y-auto bg-gray-900/80 p-2.5 rounded-xl border border-gray-700 space-y-2">
            {changePreviews.map(c => (
              <div key={c.variantId} className="p-2.5 bg-gray-800/80 rounded-lg border border-gray-700/60">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-bold text-sm text-white">{c.productTitle} <span className="text-purple-400 font-normal">({c.variantName})</span></p>
                  <span className="text-[11px] text-gray-400 font-mono bg-gray-900 px-1.5 py-0.5 rounded">SKU: {c.sku}</span>
                </div>
                <div className="text-xs text-gray-300 grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-700/40">
                  {c.priceChange ? (
                    <span className="bg-gray-900/70 p-1.5 rounded flex items-center gap-1.5">
                      <span className="text-gray-400">Precio:</span>
                      <span className="text-gray-400 line-through">${c.priceChange.from}</span>
                      <ArrowRight size={12} className="text-purple-400 inline"/>
                      <strong className="text-emerald-400">${c.priceChange.to}</strong>
                    </span>
                  ) : <span className="text-gray-500 text-[11px] italic">Precio sin cambios</span>}

                  {c.costChange ? (
                    <span className="bg-gray-900/70 p-1.5 rounded flex items-center gap-1.5">
                      <span className="text-gray-400">Costo:</span>
                      <span className="text-gray-400 line-through">${c.costChange.from}</span>
                      <ArrowRight size={12} className="text-purple-400 inline"/>
                      <strong className="text-emerald-400">${c.costChange.to}</strong>
                    </span>
                  ) : <span className="text-gray-500 text-[11px] italic">Costo sin cambios</span>}

                  {c.stockChange ? (
                    <span className="bg-gray-900/70 p-1.5 rounded flex items-center gap-1.5">
                      <span className="text-gray-400">Stock:</span>
                      <span className="text-gray-400 line-through">{c.stockChange.from}</span>
                      <ArrowRight size={12} className="text-purple-400 inline"/>
                      <strong className="text-emerald-400">{c.stockChange.to}</strong>
                      <span className="ml-auto" title="Se registrará un movimiento de ajuste">
                        <History size={12} className="text-yellow-400" />
                      </span>
                    </span>
                  ) : <span className="text-gray-500 text-[11px] italic">Stock sin cambios</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invalidRows.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-yellow-400 flex items-center gap-2 text-sm">
            <AlertTriangle size={18} />
            <span>Errores detectados (estas filas se ignorarán):</span>
          </h4>
          <div className="max-h-32 overflow-y-auto bg-gray-900/80 p-2.5 rounded-xl border border-gray-700">
            <ul className="text-xs space-y-1">
              {invalidRows.map(row => (
                <li key={row.rowIndex} className="text-gray-300">
                  <span className="font-mono text-yellow-400">Fila {row.rowIndex}:</span>{' '}
                  <span className="text-rose-400">{row.errors.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {changePreviews.length === 0 && (
        <p className="text-center text-yellow-400 bg-yellow-950/40 border border-yellow-500/30 p-4 rounded-xl text-sm">
          No se encontraron cambios válidos para aplicar. Revisa los valores en tu archivo CSV.
        </p>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Actualizar Stock y Precios (CSV)" size="3xl">
      <div className="p-4 sm:p-6 space-y-4">
        {status === 'preview' ? renderPreview() : renderUploader()}
      </div>
      <footer className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-4 sm:p-5 border-t border-gray-700/80 bg-gray-800/50">
        <button 
          type="button" 
          onClick={handleClose} 
          className="w-full sm:w-auto py-2.5 px-5 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 rounded-xl font-medium transition-colors text-center text-sm"
        >
          Cancelar
        </button>
        {status === 'preview' && (
          <button
            type="button"
            onClick={() => handleCsvImport(validUpdates)}
            disabled={validUpdates.length === 0}
            className="w-full sm:w-auto py-2.5 px-6 bg-brand-purple hover:bg-purple-600 active:bg-purple-700 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm"
          >
            Confirmar y Aplicar {validUpdates.length} Cambio(s)
          </button>
        )}
      </footer>
    </Modal>
  );
};

export default DataImportModal;
