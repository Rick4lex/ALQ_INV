
import React from 'react';
import Modal from './Modal';
import { Product } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, product }) => {
  const { handleProductDelete } = useAppContext();

  const onConfirm = () => {
    handleProductDelete(product.id);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación">
      <div className="p-6">
        <p className="text-gray-300">
          ¿Estás seguro de que quieres eliminar el producto "<strong>{product.title}</strong>"?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="py-2 px-4 bg-brand-red hover:bg-red-600 rounded-md transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
