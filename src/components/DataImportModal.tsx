
import React, { useState, DragEvent, useMemo } from 'react';
import { Product, Variant, CsvUpdatePayload } from '../types';
import Modal from './Modal';
import { UploadCloud, CheckCircle, XCircle, AlertTriangle, ArrowRight, History } from 'lucide-react';
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
    <>
      <div className="p-3 text-sm bg-gray-900/50 rounded-lg border border-gray-700">
        <p className="font-semibold mb-2">Instrucciones:</p>
        <ul className="list-disc list-inside text-gray-300 space-y-1 text-xs">
            <li>Exporta el CSV completo desde el panel financiero (Botón "Exportar CSV").</li>
            <li>Abre el archivo y modifica **únicamente** los valores en las columnas `variant_price`, `variant_cost` y `variant_stock`.</li>
            <li>No modifiques ninguna otra columna, especialmente `variant_sku`.</li>
            <li>Guarda los cambios y sube el archivo modificado aquí.</li>
        </ul>
      </div>
      <div
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
        className={`mt-4 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-purple-400 bg-purple-900/30' : 'border-gray-600 hover:border-gray-500'}`}
        onClick={() => document.getElementById('csvFileInput')?.click()}
      >
        <UploadCloud size={40} className="text-gray-400 mb-2" />
        <span className="text-gray-300">Arrastra y suelta el archivo .csv aquí</span>
        <span className="text-sm text-gray-500">o haz clic para seleccionar</span>
        <input id="csvFileInput" type="file" accept=".csv" className="hidden" onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} />
      </div>
      {status === 'error' && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{errorMsg}</p>}
    </>
  );

  const renderPreview = () => (
    <div className="space-y-4">
        <div className="flex flex-wrap justify-around p-3 bg-gray-900/50 rounded-lg text-center text-sm">
            <div className="flex items-center gap-2"><CheckCircle className="text-green-500" /> <span className="font-bold">{changePreviews.length}</span> variantes para actualizar</div>
            <div className="flex items-center gap-2"><XCircle className="text-red-500" /> <span className="font-bold">{invalidRows.length}</span> filas con errores</div>
            <div className="flex items-center gap-2"><CheckCircle className="text-gray-500" /> <span className="font-bold">{noChangesCount}</span> filas sin cambios</div>
        </div>
        {changePreviews.length > 0 && (
            <div>
                <h4 className="font-semibold mb-2 text-gray-300">Previsualización de Cambios:</h4>
                <div className="max-h-60 overflow-y-auto bg-gray-900/80 p-2 rounded-lg border border-gray-700 space-y-2">
                    {changePreviews.map(c => (
                        <div key={c.variantId} className="p-2 bg-gray-800/70 rounded">
                            <p className="font-bold text-sm">{c.productTitle} <span className="text-purple-400">({c.variantName})</span></p>
                            <div className="text-xs text-gray-400 grid grid-cols-3 gap-x-2">
                               {c.priceChange && <span>Precio: {c.priceChange.from} <ArrowRight size={12} className="inline"/> {c.priceChange.to}</span>}
                               {c.costChange && <span>Costo: {c.costChange.from} <ArrowRight size={12} className="inline"/> {c.costChange.to}</span>}
                               {c.stockChange && <span className="flex items-center gap-1">Stock: {c.stockChange.from} <ArrowRight size={12} className="inline"/> {c.stockChange.to} <span title="Se creará un ajuste de historial"><History size={12} className="text-yellow-400"/></span></span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        {invalidRows.length > 0 && (
            <div>
                <h4 className="font-semibold mb-2 text-yellow-400 flex items-center gap-2"><AlertTriangle size={18} /> Errores (filas ignoradas):</h4>
                <div className="max-h-32 overflow-y-auto bg-gray-900/80 p-2 rounded-lg border border-gray-700">
                    <ul className="text-xs space-y-1">
                    {invalidRows.map(row => (
                        <li key={row.rowIndex}>Fila {row.rowIndex}: <span className="text-red-400">{row.errors.join(', ')}</span></li>
                    ))}
                    </ul>
                </div>
            </div>
        )}
        {changePreviews.length === 0 && (
            <p className="text-center text-yellow-400 bg-yellow-900/50 p-4 rounded-lg">No se encontraron cambios válidos para aplicar. Revisa tu archivo CSV.</p>
        )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar y Actualizar desde CSV" size="lg">
      <div className="p-6 space-y-4">
        {status === 'preview' ? renderPreview() : renderUploader()}
      </div>
      <footer className="flex justify-end gap-4 p-4 border-t border-gray-700">
        <button type="button" onClick={handleClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancelar</button>
        {status === 'preview' && (
          <button
            type="button"
            onClick={() => handleCsvImport(validUpdates)}
            disabled={validUpdates.length === 0}
            className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar y Aplicar {validUpdates.length} Cambio(s)
          </button>
        )}
      </footer>
    </Modal>
  );
};

export default DataImportModal;
