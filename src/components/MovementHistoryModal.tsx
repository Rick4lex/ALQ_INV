
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Movement } from '../types';
import Modal from './Modal';
import { Plus, Minus, ArrowRight, Trash2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface MovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({ isOpen, onClose, product }) => {
  const { movements, handleSaveMovement, handleMultipleMovementsDelete } = useAppContext();
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants[0]?.id || '');
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set());
  const [type, setType] = useState<'Venta' | 'Stock' | 'Ajuste'>('Venta');
  const [change, setChange] = useState<number>(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setSelectedMovementIds(new Set());
    setType('Venta');
    setChange(1);
    setNotes('');
  }, [selectedVariantId]);


  const selectedVariant = useMemo(() => {
    return product.variants.find(v => v.id === selectedVariantId);
  }, [product.variants, selectedVariantId]);

  const history = useMemo(() => {
    return (movements[selectedVariantId] || []).slice().reverse();
  }, [movements, selectedVariantId]);

  const handleSelect = (movementId: string) => {
    setSelectedMovementIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movementId)) {
        newSet.delete(movementId);
      } else {
        newSet.add(movementId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMovementIds(new Set(history.map(m => m.id)));
    } else {
      setSelectedMovementIds(new Set());
    }
  };

  const handleDeleteSelected = () => {
    // Fix: Remove window.confirm and delegate confirmation to the context handler.
    if (selectedMovementIds.size > 0) {
        handleMultipleMovementsDelete(selectedVariantId, Array.from(selectedMovementIds));
        setSelectedMovementIds(new Set());
    }
  };

  const isAllSelected = history.length > 0 && selectedMovementIds.size === history.length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (change === 0 || !selectedVariantId) return;

    const changeAmount = type === 'Venta' ? -Math.abs(change) : (type === 'Stock' ? Math.abs(change) : change);
    
    const movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'> = {
      timestamp: Date.now(),
      type,
      change: changeAmount,
      notes,
    };

    if (type === 'Venta' && selectedVariant) {
        movementData.price = selectedVariant.price;
        movementData.cost = selectedVariant.cost;
    }
    
    handleSaveMovement(product.id, selectedVariantId, movementData);

    setChange(1);
    setNotes('');
  };
  
  const movementTypeConfig = {
    'Venta': { icon: <Minus size={16}/>, color: 'bg-red-500/80' },
    'Stock': { icon: <Plus size={16}/>, color: 'bg-green-500/80' },
    'Ajuste': { icon: <ArrowRight size={16}/>, color: 'bg-yellow-500/80' },
    'Inicial': { icon: <ArrowRight size={16}/>, color: 'bg-blue-500/80' },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Movimientos de: ${product.title}`} size="xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Columna de Variantes y Formulario */}
        <div className="md:col-span-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Seleccionar Variante</label>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            >
              {product.variants.map(v => (
                <option key={v.id} value={v.id}>{v.name} (Stock: {v.stock})</option>
              ))}
            </select>
          </div>
          <form onSubmit={handleSave} className="p-4 bg-gray-900/50 rounded-lg space-y-4 border border-gray-700">
            <h3 className="font-semibold">Registrar Movimiento</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm">
                <option value="Venta">Venta (-)</option>
                <option value="Stock">Añadir Stock (+)</option>
                <option value="Ajuste">Ajuste (+/-)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">{type === 'Ajuste' ? 'Cantidad (+/-)' : 'Cantidad'}</label>
              <input type="number" value={change} onChange={(e) => setChange(parseInt(e.target.value, 10) || 0)} className="mt-1 w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Notas (opcional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full bg-gray-700 border-gray-600 rounded py-1 px-2 text-sm" />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors">Guardar Movimiento</button>
          </form>
        </div>

        {/* Columna de Historial */}
        <div className="md:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Historial de: <span className="text-purple-400">{selectedVariant?.name}</span></h3>
            {history.length > 0 && (
              <div className="flex items-center gap-2 pr-4">
                <label htmlFor="select-all" className="text-sm text-gray-400 cursor-pointer">Seleccionar todo</label>
                <input 
                  type="checkbox" 
                  id="select-all"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-600 cursor-pointer"
                />
              </div>
            )}
          </div>
          <div className="flex-grow bg-gray-900/50 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
            {history.length > 0 ? (
              <ul className="space-y-2 p-2">
                {history.map(mov => (
                  <li key={mov.id} className={`flex items-center gap-2 p-2 rounded transition-colors ${selectedMovementIds.has(mov.id) ? 'bg-purple-900/50' : 'bg-gray-800'}`}>
                    <input
                      type="checkbox"
                      checked={selectedMovementIds.has(mov.id)}
                      onChange={() => handleSelect(mov.id)}
                      className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-600 cursor-pointer flex-shrink-0"
                      aria-label={`Seleccionar movimiento ${mov.id}`}
                    />
                    <div className="flex-shrink-0">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${movementTypeConfig[mov.type]?.color || 'bg-gray-500'}`}>
                            {movementTypeConfig[mov.type]?.icon}
                        </span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <p className="font-semibold">{mov.type} <span className={mov.change > 0 ? 'text-green-400' : 'text-red-400'}>({mov.change > 0 ? `+${mov.change}` : mov.change})</span></p>
                        <p className="font-bold text-lg">Stock Final: {mov.newStock}</p>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{new Date(mov.timestamp).toLocaleString('es-CO')}</span>
                        {mov.notes && <span className="italic truncate" title={mov.notes}>"{mov.notes}"</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400 py-8">No hay movimientos para esta variante.</p>
            )}
          </div>
          {selectedMovementIds.size > 0 && (
            <div className="mt-4">
              <button 
                onClick={handleDeleteSelected}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-brand-red hover:bg-red-600 rounded-md transition-colors font-semibold"
              >
                <Trash2 size={16} />
                Eliminar {selectedMovementIds.size} Seleccionado(s)
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MovementHistoryModal;
