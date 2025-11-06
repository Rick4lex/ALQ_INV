import React, { useState } from 'react';
import { Key, Link, PlusCircle, LogIn } from 'lucide-react';
import { isValidDocumentUrl } from '../lib/automerge-repo';

interface DocUrlManagerProps {
  onSetUrl: (url: string) => void;
  onCreateNew: () => string;
}

const DocUrlManager: React.FC<DocUrlManagerProps> = ({ onSetUrl, onCreateNew }) => {
  const [joinUrl, setJoinUrl] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    onCreateNew();
    // The parent component will re-render because useDocUrl's state changes.
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDocumentUrl(joinUrl)) {
      setError('La URL del catálogo no es válida. Debe ser una URL de Automerge completa.');
      return;
    }
    setError('');
    onSetUrl(joinUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
      <div className="w-full max-w-lg bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 text-white">
        <div className="text-center mb-6">
          <Key className="mx-auto h-12 w-12 text-purple-400" />
          <h1 className="text-3xl font-bold mt-2">Acceso al Catálogo</h1>
          <p className="text-purple-300">Seguridad P2P mediante URL</p>
        </div>
        
        <div className="space-y-6">
          {/* Create New */}
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Crear un Nuevo Catálogo</h2>
            <p className="text-sm text-gray-400 mb-4">Genera una URL segura y única para un nuevo catálogo. Guárdala para compartirla y acceder desde otros dispositivos.</p>
            <button
              onClick={handleCreate}
              className="w-full max-w-xs mx-auto bg-brand-purple hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <PlusCircle size={20} />
              Crear Catálogo
            </button>
          </div>

          <div className="relative flex items-center" aria-hidden="true">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-400">O</span>
              <div className="flex-grow border-t border-gray-600"></div>
          </div>

          {/* Join Existing */}
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">Unirse a un Catálogo Existente</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="docUrl" className="sr-only">URL del Catálogo</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="docUrl"
                    value={joinUrl}
                    onChange={(e) => setJoinUrl(e.target.value)}
                    placeholder="Pega la URL del catálogo aquí..."
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                type="submit"
                className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <LogIn size={20} />
                Acceder al Catálogo
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocUrlManager;
