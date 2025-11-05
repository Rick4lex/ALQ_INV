import React from 'react';
import { AuditEntry } from '../types';
import Modal from './Modal';
import { PlusCircle, Edit, Trash2, Combine, Tag, Eye, EyeOff, Wrench } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLog: AuditEntry[];
}

const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, auditLog }) => {
  
  const iconMap: Record<AuditEntry['type'], React.ReactNode> = {
    product_add: <PlusCircle className="text-green-400" />,
    product_edit: <Edit className="text-blue-400" />,
    product_delete: <Trash2 className="text-red-400" />,
    product_merge: <Combine className="text-green-400" />,
    category_add: <Tag className="text-blue-400" />,
    product_ignore: <EyeOff className="text-yellow-400" />,
    product_restore: <Eye className="text-yellow-400" />,
    data_repair: <Wrench className="text-blue-400" />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registro de Auditoría" size="lg">
      <div className="p-6">
        {auditLog.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {auditLog.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">{iconMap[entry.type]}</div>
                <div className="flex-grow">
                  <p className="text-sm text-white">{entry.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(entry.timestamp).toLocaleString('es-CO')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">No hay registros de auditoría todavía.</p>
        )}
      </div>
    </Modal>
  );
};

export default AuditLogModal;