
import React from 'react';
import { Edit, EyeOff, Trash2, XCircle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const BulkActionBar: React.FC = () => {
  const { 
    selectedProductIds,
    setSelectedProductIds,
    setModal,
    handleBulkIgnore,
    handleBulkDelete,
  } = useAppContext();

  const count = selectedProductIds.size;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-blue-500/30 p-4 z-30 transform animate-slide-up">
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg text-white">{count} producto(s) seleccionado(s)</span>
          <button onClick={() => setSelectedProductIds(new Set())} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
            <XCircle size={16} /> Deseleccionar todo
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setModal({ type: 'bulk-edit', productsCount: count })} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
            <Edit size={18} /> Editar Lote
          </button>
          <button onClick={handleBulkIgnore} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
            <EyeOff size={18} /> Ocultar
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-brand-red hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
            <Trash2 size={18} /> Eliminar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BulkActionBar;
