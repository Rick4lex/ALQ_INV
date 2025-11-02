import React, { useState } from 'react';
import { Product } from '../types';
import { Sparkles, Upload } from 'lucide-react';
import RestoreModal from './RestoreModal';

interface JsonLoaderProps {
  onJsonLoad: (data: Product[]) => void;
}

const placeholderData = {
  placeholderImages: [
    {
      id: "minifigura-1",
      category: "minifiguras",
      title: "Ejemplo: Guerrero Espacial",
      description: "Figura de construcción tipo bloque.",
      details: "Incluye base y accesorios. Plástico ABS de alta calidad.",
      imageUrls: ["https://via.placeholder.com/400x400.png?text=Producto"],
      imageHint: ["Serie Original"],
      variants: [
        {
          id: "minifigura-1-default",
          name: "Único",
          sku: "ALG-MF-001",
          price: "15.000 und",
          stock: 10,
        },
      ],
    },
  ],
};

const placeholderJson = JSON.stringify(placeholderData, null, 2);


const JsonLoader: React.FC<JsonLoaderProps> = ({ onJsonLoad }) => {
  const [jsonInput, setJsonInput] = useState(placeholderJson);
  const [error, setError] = useState('');
  const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);

  const handleLoad = (jsonContent: string) => {
    if (!jsonContent.trim()) {
      setError('El área de texto JSON está vacía.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed && Array.isArray(parsed.placeholderImages)) {
        const products: Product[] = parsed.placeholderImages
          .filter((p: any) => p && p.id)
          .map((p: any) => {
            let productData = { ...p };

            // Migration for imageHint: ensure it's always an array
            if (productData.imageHint && typeof productData.imageHint === 'string') {
              productData.imageHint = [productData.imageHint];
            } else if (!Array.isArray(productData.imageHint)) {
              productData.imageHint = [];
            }
            
            // Handle backwards compatibility for old variant formats
            if (!productData.variants) {
              const stock = productData.hasOwnProperty('stock') ? productData.stock : (productData.available ? 1 : 0);
              productData.variants = [{
                id: `${productData.id}-default`,
                name: 'Único',
                stock: stock ?? 0,
                price: productData.price ?? '',
                sku: productData.sku ?? '',
              }];
            }
            return productData;
          });

        onJsonLoad(products);
        setError('');
      } else {
        setError('El formato del JSON es inválido. Asegúrate de que tenga una clave "placeholderImages" con un array de productos.');
      }
    } catch (e) {
      setError('Error al parsear el JSON. Por favor, revisa la sintaxis.');
    }
  };

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
        
        {error && <p className="text-red-400 my-4 text-center text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}
        
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleLoad(jsonInput)}
            className="w-full bg-brand-purple hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            Cargar Productos desde Texto
          </button>
          <button
            onClick={() => setRestoreModalOpen(true)}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Restaurar Backup (archivo)
          </button>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400 space-y-1">
            <p><span className="font-semibold text-purple-300">Cargar Productos:</span> El JSON de productos debe seguir la estructura: `{"placeholderImages": [...]}`.</p>
            <p><span className="font-semibold text-gray-300">Restaurar Backup:</span> Carga un archivo de backup completo generado por esta aplicación.</p>
        </div>
      </div>
      <RestoreModal isOpen={isRestoreModalOpen} onClose={() => setRestoreModalOpen(false)} />
    </div>
  );
};

export default JsonLoader;