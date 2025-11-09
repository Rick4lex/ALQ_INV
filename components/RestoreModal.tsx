import React, { useState, DragEvent } from 'react';
import Modal from './Modal';
import { UploadCloud, FileJson, X, AlertTriangle, Loader2 } from 'lucide-react';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (backupData: any) => Promise<void>;
}

type BackupPreview = {
  products: number;
  movements: number;
  date: string;
};

const RestoreModal: React.FC<RestoreModalProps> = ({ isOpen, onClose, onRestore }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [backupData, setBackupData] = useState<any | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const resetState = () => {
    setFile(null);
    setError('');
    setIsDragging(false);
    setBackupData(null);
    setPreview(null);
    setIsRestoring(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
      setError('Por favor, selecciona un archivo .json válido.');
      setFile(null);
      setBackupData(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonInput = e.target?.result as string;
        const data = JSON.parse(jsonInput);
        
        // Basic validation
        if (!data.products || !data.preferences) {
            throw new Error("El archivo no parece ser un backup válido.");
        }

        const backupDate = data.preferences.key ? 'Fecha Desconocida' : new Date(data.auditLog?.[0]?.timestamp || Date.now()).toLocaleDateString('es-CO');

        setBackupData(data);
        setPreview({
          products: data.products.length,
          movements: Object.values(data.movements || {}).flat().length,
          date: backupDate,
        });
      } catch (err) {
        setError('Error al procesar el archivo. Asegúrate de que es un archivo de respaldo válido.');
        setBackupData(null);
        setPreview(null);
      }
    };
    reader.onerror = () => setError('Error al leer el archivo.');
    reader.readAsText(selectedFile);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileSelect(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const handleRestore = async () => {
    if (!backupData) return;
    setIsRestoring(true);
    try {
      await onRestore(backupData);
      // onRestore handles success message and reload
    } catch (e) {
      setError("Ocurrió un error inesperado durante la restauración.");
      setIsRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Restaurar desde Backup">
      <div className="p-6 space-y-4">
        {!preview ? (
            <>
            <p className="text-sm text-gray-300">
              Selecciona o arrastra tu archivo de respaldo (.json).
            </p>
            <div
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-purple-400 bg-purple-900/30' : 'border-gray-600 hover:border-gray-500'}`}
                onClick={() => document.getElementById('backupFileInput')?.click()}
            >
                <UploadCloud size={40} className="text-gray-400 mb-2" />
                <span className="text-gray-300">Arrastra y suelta el archivo aquí</span>
                <span className="text-sm text-gray-500">o haz clic para seleccionar</span>
                <input id="backupFileInput" type="file" accept=".json,application/json" className="hidden" onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} />
            </div>
            </>
        ) : (
            <>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                <FileJson size={24} className="text-purple-400 flex-shrink-0" />
                <span className="text-sm text-white truncate" title={file?.name}>{file?.name}</span>
                </div>
                <button onClick={resetState} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white">
                <X size={16} />
                </button>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-lg mb-2">Resumen del Backup</h3>
                <ul className="text-sm space-y-1 text-gray-300">
                    <li><span className="font-medium text-gray-400">Fecha del Backup:</span> {preview.date}</li>
                    <li><span className="font-medium text-gray-400">Productos a restaurar:</span> {preview.products}</li>
                    <li><span className="font-medium text-gray-400">Registros de movimiento:</span> {preview.movements}</li>
                </ul>
            </div>
             <div className="flex items-start gap-3 p-3 text-sm bg-yellow-900/30 text-yellow-300 rounded-lg border border-yellow-700/50">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p><span className="font-bold">Advertencia:</span> Esta acción sobreescribirá todos los datos actuales. Es irreversible.</p>
            </div>
            </>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <div className="flex justify-end gap-4 pt-2">
          <button onClick={handleClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors" disabled={isRestoring}>
            Cancelar
          </button>
          <button onClick={handleRestore} disabled={!backupData || isRestoring} className="py-2 px-4 bg-brand-green hover:bg-green-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {isRestoring ? (
                <>
                <Loader2 className="animate-spin h-5 w-5" /> Restaurando...
                </>
            ) : (
                'Confirmar y Restaurar'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RestoreModal;
