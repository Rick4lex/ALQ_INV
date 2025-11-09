import React, { useState } from 'react';
import Modal from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  confirmClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  confirmText = 'Confirmar', 
  confirmClass = 'bg-brand-red hover:bg-red-600' 
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  
  const handleConfirm = async () => {
      if (isConfirming) return;
      setIsConfirming(true);
      try {
          await onConfirm();
      } catch (error) {
          console.error("Confirmation action failed:", error);
          // The caller's onConfirm function is responsible for closing the modal,
          // so if it fails, we should re-enable the button.
          setIsConfirming(false);
      }
      // Do not reset isConfirming here if the modal closes on success,
      // as the component will unmount.
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-900/50">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div className="flex-grow">
            <p className="text-gray-300">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors" disabled={isConfirming}>
            Cancelar
          </button>
          <button 
            onClick={handleConfirm} 
            className={`py-2 px-4 rounded-md transition-colors flex items-center justify-center min-w-[120px] ${confirmClass}`}
            disabled={isConfirming}
          >
            {isConfirming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;