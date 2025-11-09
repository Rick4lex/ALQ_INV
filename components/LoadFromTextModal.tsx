import React, { useState } from 'react';
import Modal from './Modal';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { placeholderJson } from '../constants';

interface LoadFromTextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoadFromTextModal: React.FC<LoadFromTextModalProps> = ({ isOpen, onClose }) => {
  const { handleTextLoad } = useAppContext();
  const [jsonInput, setJsonInput] = useState(placeholderJson);

  const handleConfirmLoad = () => {
    // A simple confirmation before potentially overwriting data
    if (window.confirm("¿Estás seguro? Esto reemplazará los productos existentes que coincidan por ID y añadirá los nuevos. Se crearán registros de stock 'Inicial' para todos.")) {
        handleTextLoad(jsonInput);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cargar Productos desde Texto JSON">
      <div className="p-6 space-y-4">
        <p className="text-gray-300">
          Pega el contenido de tu archivo JSON aquí. Los productos con IDs existentes serán actualizados, y los nuevos serán añadidos.
        </p>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="w-full h-80 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
        ></textarea>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirmLoad}
            className="bg-brand-purple hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            Cargar y Reemplazar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoadFromTextModal;