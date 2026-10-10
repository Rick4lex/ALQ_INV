import React, { useState } from 'react';
import Modal from './Modal';
import { Copy, Check, Plus, Edit2, Trash2, ArrowLeft, Tag, AlertTriangle, Layers, X } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose }) => {
  const { allCategories, products, handleCategorySave, handleCategoryUpdate, handleCategoryDelete } = useAppContext();
  
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    category: string;
    count: number;
    reassignTo: string;
  } | null>(null);

  const formatTitle = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getProductCountForCategory = (catId: string) => {
    return (products || []).filter(p => p.category === catId).length;
  };

  // Código dinámico para pagedata.tsx
  const categoryId = categoryName.trim().toLowerCase().replace(/\s+/g, '-') || (editingCategory || 'nueva-categoria');
  const categoryTitle = categoryName.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || (editingCategory ? formatTitle(editingCategory) : 'Nueva Categoria');
  
  const codeSnippet = `{ id: "${categoryId}", title: "${categoryTitle}" }`;

  const previewCategories = editingCategory
    ? allCategories.map(c => c === editingCategory ? categoryId : c)
    : [...allCategories.filter(c => c !== categoryId), categoryId];

  const allItems = previewCategories.map(catId => {
    if (catId === categoryId) {
      return `  ${codeSnippet} // <-- ${editingCategory ? 'Categoría editada' : 'Tu nueva categoría'}`;
    }
    return `  { id: "${catId}", title: "${formatTitle(catId)}" }`;
  });

  const fullCodeExample = `export const grimoireCategories = [\n${allItems.join(',\n')}\n];`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartCreate = () => {
    setEditingCategory(null);
    setCategoryName('');
    setDeleteConfirm(null);
    setViewMode('form');
  };

  const handleStartEdit = (catId: string) => {
    setEditingCategory(catId);
    setCategoryName(formatTitle(catId));
    setDeleteConfirm(null);
    setViewMode('form');
  };

  const handleStartDelete = (catId: string) => {
    const count = getProductCountForCategory(catId);
    const otherCats = allCategories.filter(c => c !== catId);
    const fallback = otherCats.length > 0 ? otherCats[0] : '';
    setDeleteConfirm({
      category: catId,
      count,
      reassignTo: fallback,
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    if (editingCategory) {
      await handleCategoryUpdate(editingCategory, categoryName.trim());
    } else {
      await handleCategorySave(categoryName.trim());
    }

    setCategoryName('');
    setEditingCategory(null);
    setViewMode('list');
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    await handleCategoryDelete(
      deleteConfirm.category,
      deleteConfirm.count > 0 ? deleteConfirm.reassignTo : undefined
    );
    setDeleteConfirm(null);
  };

  const handleCloseModal = () => {
    setViewMode('list');
    setEditingCategory(null);
    setDeleteConfirm(null);
    setCategoryName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={
        viewMode === 'form'
          ? (editingCategory ? `Editar Categoría: "${formatTitle(editingCategory)}"` : 'Añadir Nueva Categoría')
          : 'Gestión de Categorías'
      }
      size="lg"
    >
      <div className="p-6 flex flex-col h-full space-y-4">
        {/* VISTA 1: LISTADO DE CATEGORÍAS */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-700/80">
              <div>
                <p className="text-sm text-gray-300">
                  Categorías activas en el inventario y Google Sheets
                </p>
                <p className="text-xs text-gray-500">
                  Total: {allCategories.length} {allCategories.length === 1 ? 'categoría' : 'categorías'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-purple hover:bg-purple-600 text-white rounded-lg transition-transform transform active:scale-95 shadow-md shadow-purple-900/30"
              >
                <Plus size={15} />
                Nueva Categoría
              </button>
            </div>

            {/* ALERTA / CONFIRMACIÓN DE ELIMINACIÓN */}
            {deleteConfirm && (
              <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2.5 text-red-300">
                  <AlertTriangle size={20} className="flex-shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      ¿Eliminar la categoría "{formatTitle(deleteConfirm.category)}"?
                    </h4>
                    {deleteConfirm.count > 0 ? (
                      <p className="text-xs text-red-200 mt-1">
                        Esta categoría tiene <strong>{deleteConfirm.count} producto(s)</strong> asociados. Para evitar que la categoría resucite o que los productos queden huérfanos, selecciona a qué categoría reasignarlos:
                      </p>
                    ) : (
                      <p className="text-xs text-gray-300 mt-1">
                        No hay productos con esta categoría. Se eliminará de la base de datos local y de Google Sheets de inmediato.
                      </p>
                    )}
                  </div>
                </div>

                {deleteConfirm.count > 0 && (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Reasignar productos a:
                    </label>
                    <select
                      value={deleteConfirm.reassignTo}
                      onChange={(e) => setDeleteConfirm(prev => prev ? ({ ...prev, reassignTo: e.target.value }) : null)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md py-1.5 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {allCategories
                        .filter(c => c !== deleteConfirm.category)
                        .map(cat => (
                          <option key={cat} value={cat}>
                            {formatTitle(cat)}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    Confirmar Eliminación
                  </button>
                </div>
              </div>
            )}

            {/* LISTA CON SCROLL */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {allCategories.map(catId => {
                const count = getProductCountForCategory(catId);
                const isDeleting = deleteConfirm?.category === catId;

                return (
                  <div
                    key={catId}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isDeleting
                        ? 'bg-red-950/20 border-red-500/40'
                        : 'bg-gray-800/80 hover:bg-gray-750 border-gray-700/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
                        <Tag size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-100 truncate">
                            {formatTitle(catId)}
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
                            ({catId})
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                          <Layers size={12} className="text-gray-500" />
                          <span>{count} {count === 1 ? 'producto' : 'productos'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(catId)}
                        className="p-1.5 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                        title="Editar nombre de categoría"
                        aria-label={`Editar ${catId}`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartDelete(catId)}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title="Eliminar categoría"
                        aria-label={`Eliminar ${catId}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-700/80">
              <button
                type="button"
                onClick={handleCloseModal}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* VISTA 2: FORMULARIO (CREAR O EDITAR) */}
        {viewMode === 'form' && (
          <form onSubmit={handleFormSubmit} className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                <ArrowLeft size={14} />
                Volver a la lista de categorías
              </button>
              {editingCategory && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                  Modo Edición
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-300 text-sm mb-1">
                  {editingCategory
                    ? 'Modifica el nombre de la categoría. Se actualizará en todos sus productos y en Google Sheets.'
                    : 'Ingresa el nombre para la nueva categoría. Aparecerá en los filtros y formularios de productos.'}
                </p>
                {editingCategory && (
                  <p className="text-xs text-blue-400 mb-3">
                    ℹ️ Esta modificación actualizará automáticamente los <strong>{getProductCountForCategory(editingCategory)} productos</strong> vinculados actualmente.
                  </p>
                )}
                <label htmlFor="categoryName" className="block text-sm font-medium text-gray-300 mt-2">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  name="categoryName"
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-white"
                  autoFocus
                  placeholder="Ej: Esculturas"
                />
              </div>

              {/* BLOQUE DE CÓDIGO PARA PAGEDATA.TSX */}
              <div className="pt-3 border-t border-gray-700">
                <p className="text-gray-300 text-sm mb-1">
                  Código para tu página web (<code className="text-purple-300 text-xs">pagedata.tsx</code>)
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Copia este objeto y pégalo en el array <code className="text-gray-300">grimoireCategories</code> de tu archivo web.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-sm p-3.5 rounded-lg overflow-auto border border-gray-700 font-mono">
                    <code className="text-cyan-300">{codeSnippet}</code>
                  </pre>
                  <button
                    type="button" 
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md transition-colors border border-gray-600"
                    aria-label="Copiar código"
                    title="Copiar código"
                  >
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
                <details className="mt-2.5">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-200">
                    Ver array completo de categorías
                  </summary>
                  <div className="relative mt-2">
                    <pre className="bg-gray-900 text-xs p-3 rounded-lg overflow-auto border border-gray-700 max-h-40 font-mono text-gray-300">
                      <code>{fullCodeExample}</code>
                    </pre>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2 px-4 bg-brand-purple hover:bg-purple-600 text-white rounded-md text-sm font-semibold transition-colors shadow-md"
              >
                {editingCategory ? 'Guardar Cambios' : 'Guardar Categoría'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default AddCategoryModal;
