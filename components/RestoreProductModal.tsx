import React, { useState } from 'react';
import { Product } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { Tag, AlertCircle, Sparkles, Check, X } from 'lucide-react';

interface RestoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const RestoreProductModal: React.FC<RestoreProductModalProps> = ({ isOpen, onClose, product }) => {
  const { allCategories, confirmRestoreProduct } = useAppContext();
  
  // Filtrar categorías disponibles (excluyendo 'Todas')
  const availableCategories = (allCategories || []).filter(c => c && c !== 'Todas');
  
  const [selectedCategory, setSelectedCategory] = useState<string>(
    availableCategories.length > 0 ? availableCategories[0] : ''
  );
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(availableCategories.length === 0);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const categoryToAssign = isCreatingNew 
      ? newCategoryName.trim().toLowerCase().replace(/\s+/g, '-')
      : selectedCategory.trim();

    if (!categoryToAssign) {
      setErrorMsg('Debes seleccionar o escribir una categoría para restaurar el producto.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (confirmRestoreProduct) {
        await confirmRestoreProduct(product.id, categoryToAssign);
      }
      onClose();
    } catch (err) {
      console.error('Error al restaurar producto:', err);
      setErrorMsg('Ocurrió un error al guardar la categoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productImg = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-gray-900 border border-purple-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Restaurar Producto</h3>
              <p className="text-xs text-purple-300 font-medium">Asignación obligatoria de categoría</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen del Producto a Restaurar */}
        <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700/60 p-3 rounded-xl">
          {productImg ? (
            <img 
              src={productImg} 
              alt={product.title} 
              className="w-12 h-12 rounded-lg object-cover bg-gray-900 border border-gray-700 shrink-0" 
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 shrink-0">
              <Sparkles size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-white text-sm truncate">{product.title || '(Sin título)'}</h4>
            <p className="text-xs text-amber-300/90 font-medium flex items-center gap-1 mt-0.5">
              <AlertCircle size={12} className="shrink-0" />
              <span>Estado: Oculto (sin categoría asignada)</span>
            </p>
          </div>
        </div>

        {/* Explicación amigable */}
        <p className="text-xs text-gray-300 leading-relaxed">
          Al ocultarse, el producto liberó su categoría en Google Sheets. Para que vuelva a ser visible en el catálogo principal, asigna la categoría correspondiente:
        </p>

        {/* Formulario de Selección / Creación de Categoría */}
        <form onSubmit={handleConfirm} className="space-y-4">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">Categoría a Asignar</label>
              {availableCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(!isCreatingNew);
                    setErrorMsg(null);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium hover:underline"
                >
                  {isCreatingNew ? 'Elegir existente' : '+ Crear nueva'}
                </button>
              )}
            </div>

            {!isCreatingNew && availableCategories.length > 0 ? (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-purple-500 capitalize"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                autoFocus
                required
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Nombre de la nueva categoría (ej. figuras, tazas)..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-purple-500 placeholder-gray-500"
              />
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Check size={15} />
              <span>Confirmar y Restaurar</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RestoreProductModal;
