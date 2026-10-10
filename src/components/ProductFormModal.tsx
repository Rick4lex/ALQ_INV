
import React, { useState, useEffect, useRef } from 'react';
import { Product, Variant } from '../types';
import Modal from './Modal';
import { createEmptyProduct, EMPTY_VARIANT } from '../constants';
import { ImageOff, Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Link as LinkIcon, Check } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const { allCategories, handleProductSave } = useAppContext();
  const [product, setProduct] = useState<Omit<Product, 'id'> & { id?: string }>(createEmptyProduct());
  const [imgError, setImgError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUrlDropdownOpen, setIsUrlDropdownOpen] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (productToEdit) {
      setProduct({
        ...productToEdit,
        imageUrls: (productToEdit.imageUrls && productToEdit.imageUrls.length > 0) ? productToEdit.imageUrls : [''],
        variants: productToEdit.variants.length > 0 ? productToEdit.variants : [{ ...EMPTY_VARIANT, id: `new-variant-${Date.now()}` }],
        imageHint: productToEdit.imageHint || [],
      });
    } else {
      const newEmptyProduct = createEmptyProduct();
      setProduct({ ...newEmptyProduct, category: allCategories[0] || '' });
    }
    setImgError(false);
    setCurrentImageIndex(0);
    setIsUrlDropdownOpen(false);
  }, [productToEdit, isOpen, allCategories]);

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

    if (field === 'stock' || field === 'price' || field === 'cost') {
      const numValue = Number(value);
      // @ts-ignore
      variantToUpdate[field] = isNaN(numValue) ? 0 : numValue < 0 ? 0 : numValue;
    } else if (field === 'itemCount') {
        const numValue = Number(value);
        const newItemCount = isNaN(numValue) ? 1 : Math.max(1, numValue);
        variantToUpdate.itemCount = newItemCount;
        
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
      variants: product.variants.map(v => ({...v, cost: v.cost || 0, stock: v.stock >= 0 ? v.stock : 0, itemCount: v.itemCount || 1})),
      imageHint: product.imageHint.filter(hint => hint && hint.trim() !== ''),
    };
    handleProductSave(productToSave);
    onClose();
  };
  
  const cleanImageUrls = product.imageUrls.filter(u => u);
  
  const handlePrevImage = () => {
    setImgError(false);
    setCurrentImageIndex(prev => (prev === 0 ? cleanImageUrls.length - 1 : prev - 1));
  };
  const handleNextImage = () => {
    setImgError(false);
    setCurrentImageIndex(prev => (prev === cleanImageUrls.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStartX.current === 0) return;
      const touchEndX = e.touches[0].clientX;
      const diff = touchStartX.current - touchEndX;
      
      if (diff > 50) { handleNextImage(); touchStartX.current = 0; }
      if (diff < -50) { handlePrevImage(); touchStartX.current = 0; }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Editar Producto' : 'Añadir Producto'} size="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
             <div 
                className="w-full h-48 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative group"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
             >
                {cleanImageUrls.length > 0 ? (
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
                        {cleanImageUrls.length > 1 && (
                            <>
                                <button type="button" onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                                    <ChevronLeft size={24} />
                                </button>
                                <button type="button" onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                                    <ChevronRight size={24} />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {cleanImageUrls.map((_, index) => (
                                        <div key={index} className={`w-2 h-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}></div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="text-gray-500 flex flex-col items-center"><ImageOff size={40} /><span>Vista Previa</span></div>
                )}
            </div>
            {/* Gestión desplegable de URLs de Imagen */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsUrlDropdownOpen(prev => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  isUrlDropdownOpen
                    ? 'bg-purple-900/40 border-purple-500/70 text-purple-200 shadow-md shadow-purple-500/10'
                    : 'bg-gray-800/90 hover:bg-gray-750 border-gray-700 text-gray-200 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <LinkIcon size={16} className={isUrlDropdownOpen ? 'text-purple-400 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                  <span className="truncate">URLs de Imagen</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30 flex-shrink-0">
                    {cleanImageUrls.length} {cleanImageUrls.length === 1 ? 'enlace' : 'enlaces'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0 text-xs">
                  <span>{isUrlDropdownOpen ? 'Cerrar' : 'Editar'}</span>
                  {isUrlDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Tira rápida de miniaturas cuando está contraído */}
              {!isUrlDropdownOpen && cleanImageUrls.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5">
                  {cleanImageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImgError(false);
                        setCurrentImageIndex(idx);
                      }}
                      className={`relative w-8 h-8 rounded border overflow-hidden flex-shrink-0 transition-transform ${
                        idx === currentImageIndex
                          ? 'border-purple-400 ring-2 ring-purple-500/40 scale-105'
                          : 'border-gray-700 opacity-60 hover:opacity-100'
                      }`}
                      title={`Ver foto ${idx + 1}`}
                    >
                      <img src={url} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Panel Desplegable de URLs */}
              {isUrlDropdownOpen && (
                <div className="p-3 bg-gray-800/95 border border-gray-700 rounded-lg shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-700/60">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Gestionar Enlaces ({product.imageUrls.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsUrlDropdownOpen(false)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-purple-500/10"
                    >
                      <Check size={13} />
                      Listo
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {product.imageUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-gray-600 bg-gray-900 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {url.trim() ? (
                            <img
                              src={url}
                              alt={`Miniatura ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                setImgError(false);
                                setCurrentImageIndex(index);
                              }}
                              title="Clic para previsualizar arriba"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-gray-500 font-bold">{index + 1}</span>
                          )}
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => handleImageUrlChange(index, e.target.value)}
                          placeholder={`https://... URL ${index + 1}`}
                          className="block flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-100 placeholder-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageUrlInput(index)}
                          disabled={product.imageUrls.length <= 1}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
                          title="Eliminar enlace"
                          aria-label="Eliminar URL"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-gray-700/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={addImageUrlInput}
                      className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium py-1 px-2 rounded hover:bg-purple-500/10 transition-colors"
                    >
                      <Plus size={14} />
                      Añadir otra URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUrlDropdownOpen(false)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1 rounded transition-colors"
                    >
                      Ocultar
                    </button>
                  </div>
                </div>
              )}
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
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div>
              <label htmlFor="imageHint" className="block text-sm font-medium text-gray-300">Series / Hints (separados por coma)</label>
              <input
                type="text"
                id="imageHint"
                value={(product.imageHint || []).join(', ')}
                onChange={(e) => setProduct(prev => ({ ...prev, imageHint: e.target.value.split(',').map(h => h.trim()) }))}
                placeholder="Ej: Kaiju No. 8, custom minifigure"
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-300">Detalles</label>
              <textarea name="details" id="details" value={product.details} onChange={handleChange} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"></textarea>
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
                  <div className="col-span-12 sm:col-span-3">
                    <label className="text-xs text-gray-400">Nombre Variante</label>
                    <input type="text" value={variant.name} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-gray-400">SKU</label>
                    <input type="text" value={variant.sku || ''} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <label className="text-xs text-gray-400">Items</label>
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
                   <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-gray-400">Costo</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400 text-sm">$</span>
                        <input type="number" value={variant.cost || ''} onChange={(e) => handleVariantChange(index, 'cost', e.target.value)} placeholder="0" className="w-full bg-gray-700 border-gray-600 rounded py-1 pl-6 pr-2 text-sm" />
                    </div>
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
