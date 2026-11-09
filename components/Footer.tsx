import React from 'react';
import { FileJson, FileText, Printer, Download, RefreshCw } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const Footer: React.FC = () => {
  const { setModal, handleBackupDownload, handleManualSync, isSyncing } = useAppContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <footer className="hidden md:block fixed bottom-0 left-0 right-0 z-30 pointer-events-none pb-4">
      <div className="container mx-auto px-4 flex items-center justify-center">
        <div className="pointer-events-auto bg-gray-950/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => setModal({ type: 'export', format: 'json' })} 
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-indigo-300 hover:text-white font-semibold py-2 px-3 rounded-xl border border-gray-800 transition-all active:scale-95 text-xs shadow-xs"
              title="Exportar archivo .json"
            >
              <FileJson size={16} className="text-indigo-400" />
              <span>JSON</span>
            </button>
          )}
          <button 
            onClick={() => setModal({ type: 'export', format: 'markdown' })} 
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-emerald-300 hover:text-white font-semibold py-2 px-3 rounded-xl border border-gray-800 transition-all active:scale-95 text-xs shadow-xs"
            title="Exportar en formato Markdown"
          >
            <FileText size={16} className="text-emerald-400" />
            <span>Markdown</span>
          </button>
          <button 
            onClick={() => setModal({ type: 'export', format: 'catalog' })} 
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold py-2 px-3 rounded-xl border border-gray-800 transition-all active:scale-95 text-xs shadow-xs"
            title="Imprimir o exportar catálogo"
          >
            <Printer size={16} className="text-gray-400" />
            <span>Catálogo</span>
          </button>
          {isAdmin && (
            <button 
              onClick={handleBackupDownload} 
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-blue-300 hover:text-white font-semibold py-2 px-3 rounded-xl border border-gray-800 transition-all active:scale-95 text-xs shadow-xs"
              title="Descargar respaldo completo"
            >
              <Download size={16} className="text-blue-400" />
              <span>Backup</span>
            </button>
          )}
          <div className="w-px h-5 bg-gray-800 mx-1" />
          <button 
            onClick={() => handleManualSync(false)} 
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 hover:text-white font-bold py-2 px-3.5 rounded-xl border border-cyan-500/40 transition-all active:scale-95 text-xs shadow-md shadow-cyan-950/40 disabled:opacity-50"
            title="Sincronizar con Google Sheets"
          >
            <RefreshCw size={16} className={`text-cyan-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar con Sheets"}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(Footer);