import React from 'react';
import Modal from './Modal';
import { Wrench, Combine, History } from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepair: () => void;
  onFusionStart: () => void;
  onShowAuditLog: () => void;
}

const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onRepair, onFusionStart, onShowAuditLog }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Herramientas de Gestión">
      <div className="p-6 space-y-4">
        <button
          onClick={onRepair}
          className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <Wrench className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Reparar IDs Duplicados</h3>
            <p className="text-sm text-gray-400">
              Busca y corrige automáticamente variantes de productos que comparten el mismo ID, solucionando historiales de movimiento mezclados.
            </p>
          </div>
        </button>

        <button
          onClick={onFusionStart}
          className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <Combine className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Fusionar Productos</h3>
            <p className="text-sm text-gray-400">
              Activa el modo fusión para seleccionar dos productos del catálogo y combinarlos en uno solo, unificando su stock y su historial.
            </p>
          </div>
        </button>

        <button
          onClick={onShowAuditLog}
          className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <History className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Ver Registro de Auditoría</h3>
            <p className="text-sm text-gray-400">
              Muestra un historial de todos los cambios importantes realizados en el catálogo, como la creación, edición o eliminación de productos.
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
};

export default ToolsModal;