
import React from 'react';
import { FileJson, FileText, Printer, Download } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Footer: React.FC = () => {
  const { setModal, handleBackupDownload } = useAppContext();

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-purple-500/30 p-4 z-20">
      <div className="container mx-auto flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <button onClick={() => setModal({ type: 'export', format: 'json' })} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-brand-indigo hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
          <FileJson size={18} />
          <span className="hidden sm:inline">JSON</span>
        </button>
        <button onClick={() => setModal({ type: 'export', format: 'markdown' })} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
          <FileText size={18} />
          <span className="hidden sm:inline">Markdown</span>
        </button>
        <button onClick={() => setModal({ type: 'export', format: 'catalog' })} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
          <Printer size={18} />
          <span className="hidden sm:inline">Catálogo</span>
        </button>
        <button onClick={handleBackupDownload} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
          <Download size={18} />
          <span className="hidden sm:inline">Backup</span>
        </button>
      </div>
    </footer>
  );
};

export default React.memo(Footer);
