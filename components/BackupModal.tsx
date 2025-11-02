import React, { useState, useMemo, useCallback } from 'react';
import Modal from './Modal';
import { Product, UserPreferences, Movements } from '../types';
import { Copy, Check } from 'lucide-react';

interface BackupData {
    products: Product[] | null;
    preferences: UserPreferences;
    ignoredProductIds: string[];
    categories: string[];
    movements: Movements;
}

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BackupData;
}

const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose, data }) => {
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Copia de Seguridad">
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-300">
          Copia el siguiente texto y guárdalo en un archivo seguro (ej. en tu Google Drive).
          Este es un backup completo de todos tus productos, categorías, movimientos y preferencias.
        </p>
        <div className="relative">
          <pre className="bg-gray-900 text-sm p-4 rounded-lg overflow-auto max-h-96 border border-gray-700">
            <code>{content}</code>
          </pre>
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            aria-label="Copiar al portapapeles"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
        <div className="flex justify-end">
             <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
                Cerrar
             </button>
        </div>
      </div>
    </Modal>
  );
};

export default BackupModal;
