import React, { useState } from 'react';
import Modal from './Modal';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (changes: { category?: string; hintsToAdd?: string[] }) => void;
  productsCount: number;
  categories: string[];
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, onSave, productsCount, categories }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [hintsToAdd, setHintsToAdd] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hintsArray = hintsToAdd.split(',').map(t => t.trim()).filter(Boolean);
    
    if (!selectedCategory && hintsArray.length === 0) {
      alert("Debes seleccionar una categoría o añadir hints para guardar.");
      return;
    }

    onSave({
      category: selectedCategory || undefined,
      hintsToAdd: hintsArray.length > 0 ? hintsArray : undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar ${productsCount} Productos`}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <p className="text-gray-300">
          Los cambios que apliques aquí se guardarán en todos los productos seleccionados. Deja un campo en blanco para no modificarlo.
        </p>
        
        <div>
          <label htmlFor="bulk-category" className="block text-sm font-medium text-gray-300">Cambiar Categoría a</label>
          <select
            id="bulk-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="">-- No cambiar --</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="bulk-hints" className="block text-sm font-medium text-gray-300">Añadir Series / Hints (separados por coma)</label>
          <input
            type="text"
            id="bulk-hints"
            value={hintsToAdd}
            onChange={(e) => setHintsToAdd(e.target.value)}
            placeholder="Ej: Oferta, Nuevo Stock"
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          />
           <p className="text-xs text-gray-400 mt-1">Estos hints se añadirán a los existentes, no los reemplazarán.</p>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancelar</button>
          <button type="submit" className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors">Guardar Cambios</button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkEditModal;