import React, { useState } from 'react';
import { ManualMovement } from '../types';
import Modal from './Modal';

interface ManualMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movement: Omit<ManualMovement, 'id'>) => void;
}

const ManualMovementModal: React.FC<ManualMovementModalProps> = ({ isOpen, onClose, onSave }) => {
  const [type, setType] = useState<'Gasto' | 'Inversión' | 'Otro Ingreso'>('Gasto');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount === '' || amount === 0) {
      alert('Por favor, completa la descripción y el monto.');
      return;
    }
    
    const finalAmount = type === 'Otro Ingreso' ? Math.abs(amount) : -Math.abs(amount);
    
    // Combine date string with current time to create a full timestamp
    const timestamp = new Date(date).getTime() + (new Date().getTime() % (24*60*60*1000));

    onSave({
      timestamp,
      type,
      amount: finalAmount,
      description,
    });

    // Reset form
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Movimiento Manual">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-300">Tipo de Movimiento</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="Gasto">Gasto (-)</option>
            <option value="Inversión">Inversión (-)</option>
            <option value="Otro Ingreso">Otro Ingreso (+)</option>
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">Descripción</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            placeholder="Ej: Compra de material de empaque"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Monto</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">$</span>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                required
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 pl-7 pr-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-300">Fecha</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancelar
          </button>
          <button type="submit" className="py-2 px-4 bg-brand-purple hover:bg-purple-600 rounded-md transition-colors">
            Guardar Movimiento
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManualMovementModal;