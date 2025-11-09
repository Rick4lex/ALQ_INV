import React from 'react';
import Modal from './Modal';
import { Wrench, Combine, History, FileText, Upload } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose }) => {
  const { handleRepairDuplicateVariantIds, setFusionMode, setModal } = useAppContext();

  const handleFusionStart = () => {
    setFusionMode(true);
    setModal(null);
  };

  const handleShowAuditLog = () => {
    setModal({ type: 'audit-log' });
  };
  
  const handleLoadFromText = () => {
    setModal({ type: 'load-from-text' });
  };
  
  const handleRestoreBackup = () => {
    setModal({ type: 'restore-backup' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Herramientas de Gestión">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleLoadFromText}
          className="text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <FileText className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Cargar desde Texto</h3>
            <p className="text-sm text-gray-400">
              Pega un JSON para añadir o reemplazar productos, ideal para cargas rápidas desde tu web.
            </p>
          </div>
        </button>
        <button
          onClick={handleRestoreBackup}
          className="text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <Upload className="h-6 w-6 text-indigo-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Restaurar Backup</h3>
            <p className="text-sm text-gray-400">
              Carga un archivo de respaldo .json para restaurar completamente el estado de la aplicación.
            </p>
          </div>
        </button>
        <button
          onClick={handleFusionStart}
          className="text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <Combine className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Fusionar Productos</h3>
            <p className="text-sm text-gray-400">
              Combina dos productos en uno, unificando su stock y su historial de movimientos.
            </p>
          </div>
        </button>
        <button
          onClick={handleRepairDuplicateVariantIds}
          className="text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <Wrench className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Reparar IDs Duplicados</h3>
            <p className="text-sm text-gray-400">
              Soluciona problemas de historiales de movimiento mezclados por variantes con el mismo ID.
            </p>
          </div>
        </button>
        <button
          onClick={handleShowAuditLog}
          className="md:col-span-2 text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-start gap-4"
        >
          <History className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white">Ver Registro de Auditoría</h3>
            <p className="text-sm text-gray-400">
              Muestra un historial de todos los cambios importantes realizados en el catálogo (añadir, editar, eliminar, etc.).
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
};

export default ToolsModal;