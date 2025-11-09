
import React from 'react';
import Modal from './Modal';
import { Product } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface ConfirmIgnoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const ConfirmIgnoreModal: React.FC<ConfirmIgnoreModalProps> = ({ isOpen, onClose, product }) => {
  const { handleIgnoreProduct } = useAppContext();

  const onConfirm = () => {
    handleIgnoreProduct(product.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Ocultar Producto">
      <div className="p-6">
        <p className="text-gray-300">
          ¿Estás seguro de que quieres ocultar el producto "<strong>{product.title}</strong>"?
        </p>
        <p className="text-sm text-gray-400 mt-2">
          El producto no aparecerá en la vista principal. Podrás verlo y restaurarlo desde la vista de 'Ocultos'.
        </p>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors">
            Confirmar y Ocultar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmIgnoreModal;
