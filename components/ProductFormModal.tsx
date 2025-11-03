import React, { useState, useEffect } from 'react';
import { Product, Variant } from '../types';
import Modal from './Modal';
import { EMPTY_PRODUCT, EMPTY_VARIANT } from '../constants';
import { ImageOff, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (productToEdit) {
      setProduct({
        ...productToEdit,
        imageUrls: (productToEdit.imageUrls && productToEdit.imageUrls.length > 0) ? productToEdit.imageUrls : [''],
        variants: productToEdit.variants.length > 0 ? productToEdit.variants : [{ ...EMPTY_VARIANT, id: `new-variant-${Date.now()}` }],
        imageHint: productToEdit.imageHint || [],
      });
    } else {
      setProduct({ ...EMPTY_PRODUCT, category: categories[0] || '' });
    }
    setImgError(false);
    setCurrentImageIndex(0);
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

  const addImageUrlInput = () => setProduct(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));

  const removeImageUrlInput = (index: number) => {
    if (product.imageUrls.length <= 1) return;
    const newImageUrls = product.imageUrls.filter((_, i) => i !== index);
    setProduct(prev => ({ ...prev, imageUrls: newImageUrls }));
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: string | number) => {
    const newVariants = [...product.variants];
    let variantToUpdate = { ...newVariants[index] };
    const oldName = variantToUpdate.name;

    if (field === 'stock' || field === 'price') {
      const numValue = Number(value);
      // @ts-ignore
      variantToUpdate[field] = isNaN(numValue) ? 0 : numValue < 0 ? 0 : numValue;
    } else if (field === 'itemCount') {
        const numValue = Number(value);
        const newItemCount = isNaN(numValue) ? 1 : Math.max(1, numValue);
        variantToUpdate.itemCount = newItemCount;
        
        // Auto-update name only if it was the default or a package name
        if (oldName === 'Único' || oldName === 'Unidad' || /^Paquete de \d+$/.test(oldName)) {
            variantToUpdate.name = newItemCount > 1 ? `Paquete de ${newItemCount}` : 'Unidad';
        }
    } else {
      // @ts-ignore
      variantToUpdate[field] = value;
    }

    newVariants[index] = variantToUpdate;
    setProduct(prev => ({ ...prev, variants: newVariants }));
  };

  const addVariant = () => {
    const newVariant: Variant = {
      ...EMPTY_VARIANT,
      id: `new-variant-${Date.now()}`,
      name: `Variante ${product.variants.length + 1}`,
    };
    setProduct(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
  };

  const removeVariant = (index: number) => {
    if (product.variants.length <= 1) return;
    const newVariants = product.variants.filter((_, i) => i !== index);
    setProduct(prev => ({ ...prev, variants: newVariants }));
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
      variants: product.variants.map(v => ({...v, stock: v.stock >= 0 ? v.stock : 0, itemCount: v.itemCount || 1})),
      imageHint: product.imageHint.filter(hint => hint && hint.trim() !== ''),
    };
    onSave(productToSave);
  };

  const isEditModeWithMultipleImages = productToEdit && product.imageUrls.filter(u => u).length > 1;
  const cleanImageUrls = product.imageUrls.filter(u => u);
  
  const handlePrevImage = () => {
    setImgError(false);
    setCurrentImageIndex(prev => (prev === 0 ? cleanImageUrls.length - 1 : prev - 1));
  };
  const handleNextImage = () => {
    setImgError(false);
    setCurrentImageIndex(prev => (prev === cleanImageUrls.length - 1 ? 0 : prev + 1));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Editar Producto' : 'Añadir Producto'} size="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
             <div className="w-full h-48 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative group">
                {isEditModeWithMultipleImages ? (
                    <>
                        {imgError ? (
                           <div className="text-gray-500 flex flex-col items-center"><ImageOff size={40} /><span>Error al Cargar</span></div>
                        ) : (
                           <img
                                key={currentImageIndex}
                                src={cleanImageUrls[currentImageIndex]}
                                alt={`Vista previa ${currentImageIndex + 1}`}
                                className="h-full w-full object-cover"
                                onError={() => setImgError(true)}
                           />
                        )}
                        <button type="button" onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronLeft size={24} />
                        </button>
                        <button type="button" onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={24} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {cleanImageUrls.map((_, index) => (
                                <div key={index} className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}></div>
                            ))}
                        </div>
                    </>
                ) : (
                    !imgError && product.imageUrls[0] ? (
                        <img src={product.imageUrls[0]} alt="Vista previa" className="h-full w-full object-cover" onError={() => setImgError(true)} />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center"><ImageOff size={40} /><span>Vista Previa</span></div>
                    )
                )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">URLs de Imagen</label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {product.imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input type="text" value={url} onChange={(e) => handleImageUrlChange(index, e.target.value)} placeholder={`URL de Imagen ${index + 1}`} className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
                    <button type="button" onClick={() => removeImageUrlInput(index)} disabled={product.imageUrls.length <= 1} className="p-2 rounded-full text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50" aria-label="Eliminar URL"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addImageUrlInput} className="mt-2 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"><Plus size={16} />Añadir otra URL</button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
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
              <label htmlFor="imageHint" className="block text-sm font-medium text-gray-300">Series / Hints (separados por coma)</label>
              <input
                type="text"
                id="imageHint"
                value={(product.imageHint || []).join(', ')}
                onChange={(e) => {
                  const hints = e.target.value.split(',').map(h => h.trim());
                  setProduct(prev => ({ ...prev, imageHint: hints }));
                }}
                placeholder="Ej: Kaiju No. 8, custom minifigure"
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-300">Detalles</label>
              <textarea name="details" id="details" value={product.details} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"></textarea>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Variantes de Venta</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {product.variants.map((variant, index) => {
              const perItemPrice = (variant.price && variant.itemCount && variant.itemCount > 1) ? Math.round(variant.price / variant.itemCount) : 0;
              return (
                <div key={variant.id} className="grid grid-cols-12 gap-x-3 gap-y-2 p-3 bg-gray-900/50 rounded-lg">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="text-xs text-gray-400">Nombre Variante</label>
                    <input type="text" value={variant.name} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-gray-400">SKU</label>
                    <input type="text" value={variant.sku || ''} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-gray-400">Cant. Items</label>
                    <input type="number" value={variant.itemCount || 1} min="1" onChange={(e) => handleVariantChange(index, 'itemCount', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
                  </div>
                   <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-gray-400">Precio</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400 text-sm">$</span>
                        <input type="number" value={variant.price || ''} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} placeholder="0" className="w-full bg-gray-700 border-gray-600 rounded py-1 pl-6 pr-2 text-sm" />
                    </div>
                     {perItemPrice > 0 && <span className="text-xs text-green-400/80">(${perItemPrice.toLocaleString('es-CO')} c/u)</span>}
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <label className="text-xs text-gray-400">Stock</label>
                    <input type="number" value={variant.stock} min="0" onChange={(e) => handleVariantChange(index, 'stock', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-end justify-end">
                    <button type="button" onClick={() => removeVariant(index)} disabled={product.variants.length <= 1} className="p-2 rounded-full text-red-400 hover:bg-red-500/20 disabled:opacity-50" aria-label="Eliminar Variante"><Trash2 size={18} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={addVariant} className="mt-2 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"><Plus size={16} />Añadir Variante</button>
        </div>

        <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors">Guardar</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;