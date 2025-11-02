import React, { useState } from 'react';
import { Product } from '../types';
import { Sparkles } from 'lucide-react';

interface JsonLoaderProps {
  onJsonLoad: (data: Product[]) => void;
}

const exampleJson = `{
  "placeholderImages": [
    {
      "id": "minifiguras-1",
      "category": "minifiguras",
      "title": "Kikoru Shinomiya / Kaiju No. 8",
      "description": "Preview for Minifiguras 1",
      "details": "Bloque De Construcción de 4,5 cm. Plastico ABS",
      "imageUrls": ["https://res.cloudinary.com/dyeppbrfl/image/upload/v1761018574/1333694e-f106-41ed-8eb2-8c551af1fd40.png"],
      "imageHint": "custom miniatures",
      "price": "12.000 und",
      "stock": 5,
      "variants": [
        { "id": "minifiguras-1-default", "name": "Único", "price": "12.000 und", "stock": 5, "sku": "KAIJU-KIKORU" }
      ]
    }
  ]
}`;

const JsonLoader: React.FC<JsonLoaderProps> = ({ onJsonLoad }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');

  const handleLoad = () => {
    if (!jsonInput.trim()) {
      setError('El campo JSON no puede estar vacío.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed && Array.isArray(parsed.placeholderImages)) {
        const products: Product[] = parsed.placeholderImages
          .filter((p: any) => p && p.id)
          .map((p: any) => {
            // Handle backwards compatibility for old formats
            if (!p.variants) {
              const stock = p.hasOwnProperty('stock') ? p.stock : (p.available ? 1 : 0);
              return {
                ...p,
                variants: [{
                  id: `${p.id}-default`,
                  name: 'Único',
                  stock: stock ?? 0,
                  price: p.price ?? '',
                  sku: p.sku ?? '',
                }],
              };
            }
            return p;
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
      <div className="w-full max-w-4xl bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 text-white">
        <div className="text-center mb-6">
          <Sparkles className="mx-auto h-12 w-12 text-purple-400" />
          <h1 className="text-3xl font-bold mt-2">Alquima Mizu</h1>
          <p className="text-purple-300">Gestor de Catálogo</p>
        </div>
        <p className="mb-4 text-gray-300">
          Para comenzar, pega el contenido de tu archivo JSON de productos en el siguiente campo.
        </p>
        <textarea
          className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors font-mono text-sm"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={exampleJson}
        />
        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
        <button
          onClick={handleLoad}
          className="w-full mt-4 bg-brand-purple hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
        >
          Cargar Productos
        </button>
      </div>
    </div>
  );
};

export default JsonLoader;
