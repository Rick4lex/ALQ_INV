
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    full: 'w-screen h-screen',
  };
  
  const wrapperClasses = `fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm ${size !== 'full' ? 'items-center justify-center' : ''}`;
  
  const modalContainerClasses = `relative bg-gray-800 text-white flex flex-col ${
    size === 'full' 
    ? sizeClasses.full
    : `rounded-2xl shadow-2xl border border-purple-500/30 w-full m-4 ${sizeClasses[size]} max-h-[90vh]`
  }`;

  return (
    <div className={wrapperClasses} onClick={onClose}>
      <div
        className={modalContainerClasses}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </header>
        <div className="overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;