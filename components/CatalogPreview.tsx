
import React from 'react';
import { Product } from '../types';
import { Sparkles } from 'lucide-react';

interface CatalogPreviewProps {
  products: Product[];
}

const CatalogPreview: React.FC<CatalogPreviewProps> = ({ products }) => {
  return (
    <div className="font-sans text-gray-800">
      <header className="text-center mb-8 border-b-2 border-purple-600 pb-4">
        <Sparkles className="mx-auto h-12 w-12 text-purple-600" />
        <h1 className="text-4xl font-bold text-gray-900 mt-2">Alquima Mizu</h1>
        <p className="text-lg text-purple-700">Catálogo de Productos</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-md">
            <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                {product.imageUrls[0] && <img src={product.imageUrls[0]} alt={product.title} className="w-full h-full object-cover" />}
            </div>
            <div className="p-3 flex flex-col flex-grow">
              <div>
                <p className="text-xs text-purple-600 font-semibold uppercase">{product.category}</p>
                <h3 className="text-base font-bold text-gray-900 mt-1">{product.title}</h3>
                <p className="text-xs text-gray-600 mt-2 flex-grow">{product.details}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                {(() => {
                  const availablePricedVariants = product.variants.filter(v => v.stock > 0 && v.price);

                  if (availablePricedVariants.length === 0) {
                      return <div className="text-right font-semibold text-gray-700 text-sm">Consultar precio</div>;
                  }

                  const prices = availablePricedVariants
                      .map(v => parseFloat(v.price!.replace(/[^0-9.-]+/g,"")));

                  let priceDisplay;
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  const firstPriceString = availablePricedVariants[0].price!;
                  
                  if (minPrice === maxPrice) {
                      priceDisplay = firstPriceString;
                  } else {
                      const currency = firstPriceString.replace(/[0-9.,\s]/g, '');
                      priceDisplay = `${minPrice.toLocaleString('es-CO')} - ${maxPrice.toLocaleString('es-CO')} ${currency}`;
                  }

                  return (
                      <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium text-sm">Precio:</span>
                          <span className="font-semibold text-green-700 text-base">{priceDisplay}</span>
                      </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="text-center mt-12 pt-4 border-t border-gray-300">
        <p className="text-sm text-gray-500">Catálogo generado el {new Date().toLocaleDateString('es-ES')}</p>
        <p className="text-sm text-gray-500">Alquima Mizu - Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default CatalogPreview;