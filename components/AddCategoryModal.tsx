
import React, { useState } from 'react';
import Modal from './Modal';
import { Copy, Check } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryName: string) => void;
  existingCategories: string[];
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onSave, existingCategories }) => {
  const [categoryName, setCategoryName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryName.trim()) {
      onSave(categoryName.trim());
    }
  };

  const categoryId = categoryName.trim().toLowerCase().replace(/\s+/g, '-') || 'nueva-categoria';
  const categoryTitle = categoryName.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Nueva Categoria';
  
  const codeSnippet = `{ id: "${categoryId}", title: "${categoryTitle}" }`;

  const formatTitle = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  const existingItems = existingCategories
    .map(catId => `  { id: "${catId}", title: "${formatTitle(catId)}" }`);
    
  const allItems = [...existingItems, `  ${codeSnippet} // <-- Tu nueva categoría`];

  const fullCodeExample = `export const grimoireCategories = [\n${allItems.join(',\n')}\n];`;


  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir Nueva Categoría">
      <form onSubmit={handleSubmit} className="p-6 flex flex-col h-full">
        <div className="flex-grow space-y-4">
          <div>
            <p className="text-gray-300 mb-1">
              Ingresa el nombre para la nueva categoría.
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Aparecerá en los filtros y en el formulario de productos de este gestor.
            </p>
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-300">Nombre de la Categoría</label>
            <input
              type="text"
              name="categoryName"
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              autoFocus
              placeholder="Ej: Esculturas"
            />
          </div>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-gray-300 mb-1">
              Código para tu página web (`pagedata.tsx`)
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Copia este objeto y pégalo en el array `grimoireCategories` de tu archivo.
            </p>
            <div className="relative">
              <pre className="bg-gray-900 text-sm p-4 rounded-lg overflow-auto border border-gray-700">
                <code className="text-cyan-300">{codeSnippet}</code>
              </pre>
              <button
                type="button" 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                aria-label="Copiar código"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
             <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Ver código completo</summary>
              <div className="relative mt-2">
                <pre className="bg-gray-900 text-xs p-4 rounded-lg overflow-auto border border-gray-700 max-h-48">
                  <code>{fullCodeExample}</code>
                </pre>
              </div>
            </details>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 mt-auto">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button type="submit" className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors">
            Guardar Categoría
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddCategoryModal;