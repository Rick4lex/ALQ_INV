import React from 'react';
import { useSyncStatus } from '../lib/automerge-repo';
import { Wifi, WifiOff, Users, Clock, AlertTriangle } from 'lucide-react';

const SyncStatusIndicator: React.FC = () => {
  const status = useSyncStatus();

  const getStatusColor = () => {
    if (!status.isOnline) return 'bg-red-500';
    if (status.connectedPeers > 0) return 'bg-green-500';
    return 'bg-yellow-500'; // Online but no peers
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Sin Conexión';
    if (status.connectedPeers > 0) return 'Sincronizado';
    return 'En Línea';
  };
  
  const lastSyncTime = status.lastSync ? new Date(status.lastSync).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Nunca';

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 bg-gray-800/80 backdrop-blur-md text-white text-xs rounded-lg shadow-2xl border border-purple-500/20 w-48 overflow-hidden">
        <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} relative flex-shrink-0`}>
                  {status.isOnline && <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-ping absolute`}></div>}
                </div>
                <span className="font-semibold">{getStatusText()}</span>
            </div>
            
            <div className="space-y-1 text-gray-400">
                <div className="flex items-center gap-2">
                    {status.isOnline ? <Wifi size={12} className="flex-shrink-0" /> : <WifiOff size={12} className="flex-shrink-0" />}
                    <span>{status.isOnline ? 'Internet: OK' : 'Internet: Desconectado'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users size={12} className="flex-shrink-0" />
                    <span>Peers: {status.connectedPeers}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={12} className="flex-shrink-0" />
                    <span className="truncate" title={`Última Sincronización: ${lastSyncTime}`}>Últ. Sinc: {lastSyncTime}</span>
                </div>
            </div>
        </div>
        {status.syncErrors.length > 0 && (
          <div className="bg-red-900/50 px-3 py-2 border-t border-red-500/30">
            <p className="font-semibold text-red-300 flex items-center gap-1"><AlertTriangle size={12} /> Último Error:</p>
            <p className="text-red-400 truncate" title={status.syncErrors[status.syncErrors.length - 1]}>
              {status.syncErrors[status.syncErrors.length - 1]}
            </p>
          </div>
        )}
    </div>
  );
};

export default SyncStatusIndicator;
