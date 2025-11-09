import React, { useState } from 'react';
import { Product } from '../types';
import { Sparkles, Upload } from 'lucide-react';
import { placeholderJson } from '../constants';
import { useAppContext } from '../contexts/AppContext';

interface JsonLoaderProps {
  onTextLoad: (jsonString: string) => void;
}

const JsonLoader: React.FC<JsonLoaderProps> = ({ onTextLoad }) => {
  const { setModal } = useAppContext();
  const [jsonInput, setJsonInput] = useState(placeholderJson);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
      <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 text-white">
        <div className="text-center mb-6">
          <Sparkles className="mx-auto h-12 w-12 text-purple-400" />
          <h1 className="text-3xl font-bold mt-2">Alquima Mizu</h1>
          <p className="text-purple-300">Gestor de Catálogo</p>
        </div>
        
        <p className="mb-4 text-center text-gray-300">
          Para comenzar, edita el JSON de productos de ejemplo o restaura una copia de seguridad.
        </p>
        
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="w-full h-80 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
        ></textarea>
        
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => onTextLoad(jsonInput)}
            className="w-full bg-brand-purple hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            Cargar Productos desde Texto
          </button>
          <button
            onClick={() => setModal({ type: 'restore-backup' })}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Restaurar Backup (archivo)
          </button>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400 space-y-1">
            <p><span className="font-semibold text-purple-300">Cargar Productos:</span> El JSON de productos debe seguir la estructura: <code>{`{"placeholderImages": [...]}`}</code>.</p>
            <p><span className="font-semibold text-gray-300">Restaurar Backup:</span> Carga un archivo de backup completo generado por esta aplicación.</p>
        </div>
      </div>
    </div>
  );
};

export default JsonLoader;