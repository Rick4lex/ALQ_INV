import React, { useState, DragEvent, useMemo, useCallback } from 'react';
import { Product, Movement } from '../types';
import Modal from './Modal';
import { UploadCloud, FileText, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onImport: (movements: { variantId: string, movement: Omit<Movement, 'id'|'variantId'|'newStock'> }[]) => void;
}

type ParsedRow = {
  data: any;
  rowIndex: number;
  errors: string[];
};

type ValidatedMovement = { 
  variantId: string, 
  movement: Omit<Movement, 'id'|'variantId'|'newStock'> 
};

const CSV_TEMPLATE = `variant_sku,timestamp,type,change,notes,price,cost\nSKU-001,${new Date().toISOString()},Venta,-1,Venta de prueba,15000,7000\n`;
const REQUIRED_HEADERS = ['variant_sku', 'timestamp', 'type', 'change'];

const ImportHistoryModal: React.FC<ImportHistoryModalProps> = ({ isOpen, onClose, products, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<{ valid: ValidatedMovement[], invalid: ParsedRow[] }>({ valid: [], invalid: [] });
  const [status, setStatus] = useState<'idle' | 'parsing' | 'preview' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const variantSkuMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      p.variants.forEach(v => {
        if (v.sku) map.set(v.sku, v.id);
      });
    });
    return map;
  }, [products]);

  const resetState = () => {
    setIsDragging(false);
    setParsedData({ valid: [], invalid: [] });
    setStatus('idle');
    setErrorMsg('');
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_importacion_historial.csv';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const parseAndValidateFile = (file: File) => {
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
        const validRows: ValidatedMovement[] = [];
        const invalidRows: ParsedRow[] = [];

        rows.forEach((line, index) => {
          const values = line.split(',');
          const rowData: any = {};
          header.forEach((h, i) => rowData[h] = values[i]?.trim());
          
          const errors: string[] = [];
          
          const { variant_sku, timestamp, type, change, notes, price, cost } = rowData;
          
          // Validations
          if (!variant_sku || !variantSkuMap.has(variant_sku)) errors.push("SKU no encontrado o vacío.");
          const timestampMs = new Date(timestamp).getTime();
          if (isNaN(timestampMs)) errors.push("Timestamp inválido.");
          if (!['Venta', 'Stock', 'Ajuste'].includes(type)) errors.push("Tipo debe ser 'Venta', 'Stock', o 'Ajuste'.");
          const changeNum = parseFloat(change);
          if (isNaN(changeNum)) errors.push("La columna 'change' debe ser un número.");

          if (errors.length > 0) {
            invalidRows.push({ data: rowData, rowIndex: index + 2, errors });
          } else {
            const movementData: Omit<Movement, 'id'|'variantId'|'newStock'> = {
              timestamp: timestampMs,
              type: type as any,
              change: changeNum,
              notes: notes || undefined,
              price: type === 'Venta' && !isNaN(parseFloat(price)) ? parseFloat(price) : undefined,
              cost: type === 'Venta' && !isNaN(parseFloat(cost)) ? parseFloat(cost) : undefined,
            };
             validRows.push({ variantId: variantSkuMap.get(variant_sku)!, movement: movementData });
          }
        });
        
        setParsedData({ valid: validRows, invalid: invalidRows });
        setStatus('preview');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || "Error desconocido al procesar el archivo.");
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setErrorMsg('No se pudo leer el archivo.');
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        parseAndValidateFile(selectedFile);
      } else {
        setStatus('error');
        setErrorMsg('Por favor, selecciona un archivo .csv válido.');
      }
    }
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileSelect(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const renderContent = () => {
    switch(status) {
      case 'idle':
      case 'error':
        return (
          <>
            <div
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-purple-400 bg-purple-900/30' : 'border-gray-600 hover:border-gray-500'}`}
              onClick={() => document.getElementById('historyFileInput')?.click()}
            >
              <UploadCloud size={40} className="text-gray-400 mb-2" />
              <span className="text-gray-300">Arrastra y suelta el archivo .csv aquí</span>
              <span className="text-sm text-gray-500">o haz clic para seleccionar</span>
              <input id="historyFileInput" type="file" accept=".csv" className="hidden" onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} />
            </div>
            {status === 'error' && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{errorMsg}</p>}
          </>
        );
      case 'parsing': return <div className="text-center p-8">Procesando archivo...</div>;
      case 'preview':
        const { valid, invalid } = parsedData;
        return (
            <div className="space-y-4">
                <div className="flex justify-around p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-center"><CheckCircle className="mx-auto text-green-500" /> <span className="font-bold">{valid.length}</span> Registros Válidos</div>
                    <div className="text-center"><XCircle className="mx-auto text-red-500" /> <span className="font-bold">{invalid.length}</span> Registros con Errores</div>
                </div>
                {invalid.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2 text-yellow-400 flex items-center gap-2"><AlertTriangle size={18} /> Errores Encontrados (no se importarán)</h4>
                        <div className="max-h-32 overflow-y-auto bg-gray-900/80 p-2 rounded-lg border border-gray-700">
                            <ul className="text-xs space-y-1">
                            {invalid.map(row => (
                                <li key={row.rowIndex}>Fila {row.rowIndex}: <span className="text-red-400">{row.errors.join(', ')}</span></li>
                            ))}
                            </ul>
                        </div>
                    </div>
                )}
                {valid.length === 0 && (
                    <p className="text-center text-yellow-400 p-4">No se encontraron registros válidos para importar. Por favor, revisa tu archivo y vuelve a intentarlo.</p>
                )}
            </div>
        )
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Importar Historial de Movimientos" size="lg">
      <div className="p-6 space-y-4">
        <div className="p-3 text-sm bg-gray-900/50 rounded-lg border border-gray-700">
          <p className="font-semibold mb-2">Instrucciones:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 text-xs">
            <li>Sube un archivo CSV con las columnas: {REQUIRED_HEADERS.join(', ')}.</li>
            <li>Columnas opcionales: `notes`, `price`, `cost`.</li>
            <li>El `variant_sku` debe coincidir exactamente con un SKU existente en tus productos.</li>
            <li>El `timestamp` debe ser un formato de fecha válido (ej: 2024-05-21T10:00:00Z).</li>
            <li>`type` debe ser `Venta`, `Stock` o `Ajuste`.</li>
          </ul>
           <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-semibold">
              <Download size={16} /> Descargar Plantilla .csv
           </button>
        </div>
        
        {renderContent()}

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
          <button type="button" onClick={handleModalClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancelar</button>
          <button 
            type="button" 
            onClick={() => onImport(parsedData.valid)}
            disabled={status !== 'preview' || parsedData.valid.length === 0}
            className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Importar {parsedData.valid.length > 0 ? parsedData.valid.length : ''} Registros
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportHistoryModal;