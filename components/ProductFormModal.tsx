import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import Modal from './Modal';
import ToggleSwitch from './ToggleSwitch';
import { EMPTY_PRODUCT } from '../constants';
import { ImageOff, Plus, Trash2 } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  productToEdit?: Product;
  categories: string[];
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, productToEdit, categories }) => {
  const [product, setProduct] = useState<Omit<Product, 'id'> & { id?: string }>(EMPTY_PRODUCT);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setProduct({
        ...productToEdit,
        imageUrls: (productToEdit.imageUrls && productToEdit.imageUrls.length > 0) ? productToEdit.imageUrls : [''],
      });
    } else {
      setProduct({ ...EMPTY_PRODUCT, category: categories[0] || '' });
    }
    setImgError(false);
  }, [productToEdit, isOpen, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageUrlChange = (index: number, value: string) => {
    setImgError(false);
    const newImageUrls = [...product.imageUrls];
    newImageUrls[index] = value;
    setProduct(prev => ({ ...prev, imageUrls: newImageUrls }));
  };

  const addImageUrlInput = () => {
    setProduct(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));
  };

  const removeImageUrlInput = (index: number) => {
    if (product.imageUrls.length <= 1) return;
    const newImageUrls = product.imageUrls.filter((_, i) => i !== index);
    setProduct(prev => ({ ...prev, imageUrls: newImageUrls }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.title) {
        alert("El título es obligatorio.");
        return;
    }
    const productToSave: Product = {
        ...product,
        imageUrls: product.imageUrls.filter(url => url && url.trim() !== ''),
        id: product.id || `${Date.now()}-${product.title.replace(/\s+/g, '-').toLowerCase()}`,
    };
    onSave(productToSave);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Editar Producto' : 'Añadir Producto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="w-full h-48 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center mb-4">
          {!imgError && product.imageUrls[0] ? (
            <img src={product.imageUrls[0]} alt="Vista previa" className="h-full w-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
                <ImageOff size={40} />
                <span>Vista Previa de Imagen</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">URLs de Imagen</label>
          <div className="space-y-2">
            {product.imageUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleImageUrlChange(index, e.target.value)}
                  placeholder={`URL de Imagen ${index + 1}`}
                  className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeImageUrlInput(index)}
                  disabled={product.imageUrls.length <= 1}
                  className="p-2 rounded-full text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Eliminar URL"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addImageUrlInput}
            className="mt-2 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
          >
            <Plus size={16} />
            Añadir otra URL
          </button>
        </div>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300">Título (obligatorio)</label>
          <input type="text" name="title" id="title" required value={product.title} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-300">Categoría</label>
          <select name="category" id="category" value={product.category} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm">
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-300">Precio</label>
          <input type="text" name="price" id="price" value={product.price || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
        </div>

        <div>
          <label htmlFor="details" className="block text-sm font-medium text-gray-300">Detalles</label>
          <textarea name="details" id="details" value={product.details} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"></textarea>
        </div>
        
        <ToggleSwitch checked={product.available} onChange={(checked) => setProduct(prev => ({...prev, available: checked}))} label="Disponible" />

        <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors">Guardar</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;