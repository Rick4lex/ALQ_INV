import React, { useState, useMemo } from 'react';
import { Product, Movement, Movements } from '../types';
import Modal from './Modal';
import { Plus, Minus, ArrowRight, Trash2 } from 'lucide-react';

interface MovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  movements: Movements;
  onSaveMovement: (productId: string, variantId: string, movementData: Omit<Movement, 'id' | 'variantId' | 'newStock'>) => void;
  onDeleteMovement: (variantId: string, movementId: string) => void;
}

const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({ isOpen, onClose, product, movements, onSaveMovement, onDeleteMovement }) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants[0]?.id || '');

  const [type, setType] = useState<'Venta' | 'Stock' | 'Ajuste'>('Venta');
  const [change, setChange] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const selectedVariant = useMemo(() => {
    return product.variants.find(v => v.id === selectedVariantId);
  }, [product.variants, selectedVariantId]);

  const history = useMemo(() => {
    return (movements[selectedVariantId] || []).slice().reverse();
  }, [movements, selectedVariantId]);

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
    
    onSaveMovement(product.id, selectedVariantId, movementData);

    setChange(1);
    setNotes('');
  };
  
  const movementTypeConfig = {
    'Venta': { icon: <Minus size={16}/>, color: 'bg-red-500/80' },
    'Stock': { icon: <Plus size={16}/>, color: 'bg-green-500/80' },
    'Ajuste': { icon: <ArrowRight size={16}/>, color: 'bg-yellow-500/80' },
    'Inicial': { icon: <ArrowRight size={16}/>, color: 'bg-blue-500/80' },
  }

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
        <div className="md:col-span-2">
          <h3 className="font-semibold mb-2">Historial de: <span className="text-purple-400">{selectedVariant?.name}</span></h3>
          <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-700 max-h-96 overflow-y-auto">
            {history.length > 0 ? (
              <ul className="space-y-2">
                {history.map(mov => (
                  <li key={mov.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded">
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
                     <div className="flex-shrink-0">
                      <button 
                        onClick={() => onDeleteMovement(mov.variantId, mov.id)}
                        className="p-2 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400 py-8">No hay movimientos para esta variante.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MovementHistoryModal;