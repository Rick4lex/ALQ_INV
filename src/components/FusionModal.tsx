
import React, { useState } from 'react';
import { Product } from '../types';
import Modal from './Modal';
import { Combine } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface FusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsToFuse: [Product, Product];
}

const FusionModal: React.FC<FusionModalProps> = ({ isOpen, onClose, productsToFuse }) => {
  const { handleProductMerge } = useAppContext();
  const [primaryProductId, setPrimaryProductId] = useState(productsToFuse[0].id);

  const handleMerge = () => {
    const secondaryProductId = productsToFuse.find(p => p.id !== primaryProductId)!.id;
    // Fix: Remove redundant window.confirm. The context handler already shows a confirmation modal.
    handleProductMerge(primaryProductId, secondaryProductId);
  };

  const renderProductOption = (product: Product) => (
    <label
      key={product.id}
      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
        primaryProductId === product.id ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center">
        <input
          type="radio"
          name="primaryProduct"
          value={product.id}
          checked={primaryProductId === product.id}
          onChange={() => setPrimaryProductId(product.id)}
          className="h-4 w-4 text-green-600 bg-gray-700 border-gray-500 focus:ring-green-500"
        />
        <div className="ml-3 text-sm">
          <span className="font-bold text-white">{product.title}</span>
          <p className="text-gray-400">
            {primaryProductId === product.id 
              ? "Se conservarán los datos de este producto (título, imágenes, etc.)."
              : "Este producto será eliminado. Sus variantes y su historial se moverán al producto principal."}
          </p>
        </div>
      </div>
    </label>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fusionar Productos">
      <div className="p-6">
        <p className="text-gray-300 mb-4">
          Selecciona el producto principal. Los datos de este producto (título, imágenes, categoría, etc.) se conservarán después de la fusión.
        </p>
        <div className="space-y-3">
          {renderProductOption(productsToFuse[0])}
          {renderProductOption(productsToFuse[1])}
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button onClick={handleMerge} className="py-2 px-4 bg-brand-green hover:bg-green-600 rounded-md transition-colors flex items-center gap-2">
            <Combine size={18} />
            Confirmar Fusión
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FusionModal;
