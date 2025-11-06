import React, { useState, DragEvent } from 'react';
import Modal from './Modal';
import { UploadCloud, FileJson, X } from 'lucide-react';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (backupData: any) => void;
}

const RestoreModal: React.FC<RestoreModalProps> = ({ isOpen, onClose, onRestore }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Por favor, selecciona un archivo .json válido.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files ? e.target.files[0] : null);
  };
  
  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const handleRestore = () => {
    setError('');
    if (!file) {
      setError('Por favor, selecciona un archivo de respaldo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonInput = e.target?.result as string;
        const backupData = JSON.parse(jsonInput);
        onRestore(backupData);
        onClose();
      } catch (err) {
        setError('Error al procesar el archivo. Asegúrate de que es un archivo de respaldo válido.');
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo.');
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Restaurar desde Backup">
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-300">
          Selecciona o arrastra tu archivo de respaldo (.json) para restaurar los datos.
          Esta acción sobreescribirá todos los datos actuales.
        </p>

        {!file ? (
          <div
            onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-purple-400 bg-purple-900/30' : 'border-gray-600 hover:border-gray-500'}`}
            onClick={() => document.getElementById('backupFileInput')?.click()}
          >
            <UploadCloud size={40} className="text-gray-400 mb-2" />
            <span className="text-gray-300">Arrastra y suelta el archivo aquí</span>
            <span className="text-sm text-gray-500">o haz clic para seleccionar</span>
            <input
              id="backupFileInput"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileJson size={24} className="text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white truncate" title={file.name}>{file.name}</span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <div className="flex justify-end gap-4 pt-2">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button onClick={handleRestore} disabled={!file} className="py-2 px-4 bg-brand-green hover:bg-green-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Restaurar Datos
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RestoreModal;
