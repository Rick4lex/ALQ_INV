import React from 'react';
import Modal from './Modal';

interface ConfirmIgnoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
}

const ConfirmIgnoreModal: React.FC<ConfirmIgnoreModalProps> = ({ isOpen, onClose, onConfirm, productName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Ocultar Producto">
      <p className="text-gray-300">
        ¿Estás seguro de que quieres ocultar el producto "<strong>{productName}</strong>"?
      </p>
      <p className="text-sm text-gray-400 mt-2">
        El producto no aparecerá en la vista de gestión, pero se mantendrá en las exportaciones para no perder datos. Esta acción solo se puede revertir reiniciando la aplicación.
      </p>
      <div className="flex justify-end gap-4 mt-6">
        <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
          Cancelar
        </button>
        <button onClick={onConfirm} className="py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors">
          Confirmar y Ocultar
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmIgnoreModal;
