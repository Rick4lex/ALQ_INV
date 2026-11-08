import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useAppContext } from '../contexts/AppContext';
import { Product, Variant, BatchSaleItem } from '../types';
import { formatCurrency } from '../utils';
import { getPrimarySeriesName } from '../catalogPagination';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Tag, 
  Mail, 
  Check, 
  AlertCircle, 
  Loader2,
  PackageCheck,
  Receipt
} from 'lucide-react';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CartItem {
  productId: string;
  productTitle: string;
  variantId: string;
  variantName: string;
  series: string;
  category: string;
  originalPrice: number;
  stockAvailable: number;
  quantity: number;
  imageUrl?: string;
}

const QuickSaleModal: React.FC<QuickSaleModalProps> = ({ isOpen, onClose }) => {
  const { products, handleBatchSale } = useAppContext();

  // Estado del Carrito y Buscador
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketId, setTicketId] = useState('');

  // Modo de Descuento: 'auto' (sigue la regla 6-10 items = 6-10%) o 'manual'
  const [discountMode, setDiscountMode] = useState<'auto' | 'manual'>('auto');
  const [selectedPercent, setSelectedPercent] = useState<number>(0);
  const [isFixedDiscount, setIsFixedDiscount] = useState<boolean>(false);
  const [fixedDiscountAmount, setFixedDiscountAmount] = useState<number | ''>('');

  // Envío por correo
  const [sendEmail, setSendEmail] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('cfb.dig@gmail.com');
  const [notes, setNotes] = useState('');

  // Estados de proceso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inicializar Ticket ID al abrir
  useEffect(() => {
    if (isOpen) {
      setTicketId(`TICK-${Date.now().toString().slice(-6)}`);
      setCart([]);
      setSearchQuery('');
      setDiscountMode('auto');
      setIsFixedDiscount(false);
      setFixedDiscountAmount('');
      setSuccessMessage(null);
      setNotes('');
    }
  }, [isOpen]);

  // Total de unidades físicas en el carrito
  const totalUnits = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cálculo de la regla automática escalonada (6 a 10 productos = 6% a 10%)
  const autoPercent = useMemo(() => {
    if (totalUnits >= 10) return 10;
    if (totalUnits >= 6) return totalUnits; // 6 -> 6%, 7 -> 7%, 8 -> 8%, 9 -> 9%
    return 0; // Menos de 6 items no tiene descuento automático sugerido
  }, [totalUnits]);

  // Porcentaje activo según modo
  const activePercent = useMemo(() => {
    if (isFixedDiscount) return 0;
    if (discountMode === 'auto') return autoPercent;
    return selectedPercent;
  }, [discountMode, autoPercent, selectedPercent, isFixedDiscount]);

  // Subtotal original de lista
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.originalPrice), 0);
  }, [cart]);

  // Monto de descuento total en pesos
  const totalDiscountAmount = useMemo(() => {
    if (isFixedDiscount) {
      const fixedVal = Number(fixedDiscountAmount) || 0;
      return Math.min(subtotal, Math.max(0, fixedVal));
    }
    if (activePercent > 0) {
      return Math.round(subtotal * (activePercent / 100));
    }
    return 0;
  }, [isFixedDiscount, fixedDiscountAmount, activePercent, subtotal]);

  // Total final a cobrar
  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - totalDiscountAmount);
  }, [subtotal, totalDiscountAmount]);

  // Resultados del buscador
  const searchResults = useMemo(() => {
    if (!products || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();

    const matches: { product: Product; variant: Variant; series: string }[] = [];

    for (const p of products) {
      const series = getPrimarySeriesName(p);
      const matchProduct = p.title.toLowerCase().includes(query) ||
                           p.category.toLowerCase().includes(query) ||
                           series.toLowerCase().includes(query);

      for (const v of p.variants || []) {
        const matchVariant = v.name.toLowerCase().includes(query) || 
                             (v.sku && v.sku.toLowerCase().includes(query));

        if (matchProduct || matchVariant) {
          matches.push({ product: p, variant: v, series });
          if (matches.length >= 8) break; // Limitar a 8 sugerencias rápidas
        }
      }
      if (matches.length >= 8) break;
    }

    return matches;
  }, [products, searchQuery]);

  // Agregar producto al carrito
  const addToCart = (product: Product, variant: Variant, series: string) => {
    const existingIndex = cart.findIndex(i => i.variantId === variant.id);
    const availableStock = variant.stock || 0;

    if (availableStock <= 0) {
      alert(`La variante "${variant.name}" de "${product.title}" no tiene stock disponible.`);
      return;
    }

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= availableStock) {
        alert(`No puedes agregar más de ${availableStock} unidades disponibles en inventario.`);
        return;
      }
      setCart(prev => prev.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart(prev => [
        ...prev,
        {
          productId: product.id,
          productTitle: product.title,
          variantId: variant.id,
          variantName: variant.name,
          series,
          category: product.category,
          originalPrice: variant.price || 0,
          stockAvailable: availableStock,
          quantity: 1,
          imageUrl: variant.imageUrl || product.imageUrls?.[0]
        }
      ]);
    }
  };

  // Modificar cantidad en carrito
  const updateQuantity = (variantId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.variantId !== variantId) return item;
      const nextQty = item.quantity + delta;
      if (nextQty <= 0) return null; // Será filtrado
      if (nextQty > item.stockAvailable) {
        alert(`Solo hay ${item.stockAvailable} unidades disponibles en inventario.`);
        return item;
      }
      return { ...item, quantity: nextQty };
    }).filter(Boolean) as CartItem[]);
  };

  // Remover ítem del carrito
  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  // Selección de chip de descuento
  const handleSelectChip = (percent: number) => {
    setIsFixedDiscount(false);
    if (percent === autoPercent && discountMode === 'auto') {
      // Ya está en auto
      return;
    }
    setDiscountMode('manual');
    setSelectedPercent(percent);
  };

  const handleSelectFixed = () => {
    setIsFixedDiscount(true);
    setDiscountMode('manual');
    if (fixedDiscountAmount === '') {
      setFixedDiscountAmount(totalDiscountAmount || 0);
    }
  };

  const handleResetToAuto = () => {
    setIsFixedDiscount(false);
    setDiscountMode('auto');
  };

  // Confirmar la venta
  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      alert("El carrito está vacío. Agrega al menos un producto.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prorrateo del descuento en cada variante
      const effectiveDiscountFactor = subtotal > 0 ? (totalDiscountAmount / subtotal) : 0;

      const salePayload: BatchSaleItem[] = cart.map(item => {
        const itemDiscountTotal = Math.round((item.originalPrice * item.quantity) * effectiveDiscountFactor);
        const discountPerUnit = Math.round(item.originalPrice * effectiveDiscountFactor);
        const unitPriceEffective = Math.max(0, item.originalPrice - discountPerUnit);

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          originalPrice: item.originalPrice,
          unitPrice: unitPriceEffective,
          discount: discountPerUnit,
          productTitle: item.productTitle,
          variantName: item.variantName,
          series: item.series
        };
      });

      const success = await handleBatchSale(
        salePayload, 
        ticketId, 
        notes, 
        sendEmail ? recipientEmail : undefined
      );

      if (success) {
        setSuccessMessage(`¡Venta #${ticketId} confirmada exitosamente!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Error al procesar la venta:", err);
      alert("Hubo un error al registrar la venta. Revisa la consola o conexión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Terminal de Venta Rápida / Carrito" size="xl">
      <div className="p-4 sm:p-6 space-y-5 text-gray-100 max-h-[82vh] overflow-y-auto">
        
        {/* Cabecera del Ticket */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/70 p-3.5 rounded-xl border border-purple-500/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Receipt size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 block">Identificador de Ticket</span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-400">{ticketId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Items en carrito:</span>
            <span className="font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
              {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'}
            </span>
          </div>
        </div>

        {/* Mensaje de Éxito al finalizar */}
        {successMessage && (
          <div className="bg-emerald-950/70 border border-emerald-500/60 p-4 rounded-xl flex items-center gap-3 text-emerald-300 animate-in fade-in">
            <Check size={24} className="shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-sm">{successMessage}</p>
              <p className="text-xs text-emerald-400/80">Stock descontado y datos sincronizados.</p>
            </div>
          </div>
        )}

        {/* 1. BUSCADOR RÁPIDO DE PRODUCTOS */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wide">
            Buscar y Agregar Productos al Carrito
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Escribe el nombre del producto, serie (Bleach, Naruto...), categoría o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/90 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 placeholder-gray-500 shadow-inner"
            />
          </div>

          {/* Menú Flotante de Resultados de Búsqueda */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-gray-950 border border-purple-500/50 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-gray-800">
              {searchResults.map(({ product, variant, series }) => {
                const isOutOfStock = (variant.stock || 0) <= 0;
                return (
                  <div 
                    key={`${product.id}-${variant.id}`}
                    onClick={() => {
                      if (!isOutOfStock) {
                        addToCart(product, variant, series);
                        setSearchQuery('');
                      }
                    }}
                    className={`p-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-900/40' : 'hover:bg-purple-950/40 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {variant.imageUrl ? (
                        <img 
                          src={variant.imageUrl} 
                          alt={variant.name} 
                          className="w-9 h-9 rounded-md object-cover border border-gray-700 shrink-0" 
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-purple-400 text-xs font-bold">
                          {product.title.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-gray-100 truncate max-w-[220px]">
                            {product.title}
                          </span>
                          <span className="text-[10px] bg-purple-950/70 border border-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-bold uppercase">
                            {series}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 block">
                          Var: <strong className="text-gray-300">{variant.name}</strong> • Stock: {variant.stock}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-green-400 font-mono">
                        {formatCurrency(variant.price || 0)}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:bg-gray-700 transition-transform transform active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. LISTA DE PRODUCTOS EN EL CARRITO */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              Ítems en esta Venta ({cart.length})
            </span>
            {cart.length > 0 && (
              <button 
                type="button" 
                onClick={() => setCart([])} 
                className="text-[11px] text-red-400 hover:underline"
              >
                Vaciar carrito
              </button>
            )}
          </div>

          <div className="bg-gray-900/60 rounded-xl border border-gray-800 max-h-56 overflow-y-auto divide-y divide-gray-800/80">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div key={item.variantId} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-100 truncate max-w-[200px]" title={item.productTitle}>
                          {item.productTitle}
                        </span>
                        <span className="text-[9px] bg-purple-950/80 border border-purple-500/30 text-purple-300 px-1 py-0.2 rounded font-bold uppercase">
                          {item.series}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {item.variantName} • {formatCurrency(item.originalPrice)} c/u
                      </span>
                    </div>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-0.5">
                      <button 
                        type="button" 
                        onClick={() => updateQuantity(item.variantId, -1)}
                        className="p-1 hover:bg-gray-700 text-gray-300 rounded"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center font-bold text-xs font-mono">{item.quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => updateQuantity(item.variantId, 1)}
                        className="p-1 hover:bg-gray-700 text-gray-300 rounded"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="w-20 text-right font-bold text-green-400 font-mono">
                      {formatCurrency(item.quantity * item.originalPrice)}
                    </span>

                    <button 
                      type="button" 
                      onClick={() => removeFromCart(item.variantId)}
                      className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors"
                      title="Eliminar del carrito"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <ShoppingCart size={28} className="mx-auto mb-2 text-gray-600" />
                <p className="text-xs">El carrito está vacío.</p>
                <p className="text-[11px] text-gray-600">Busca productos arriba para agregarlos a la venta.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. REGLA DE DESCUENTO ESCALONADO (6% a 10%) */}
        {cart.length > 0 && (
          <div className="bg-gray-900/60 p-4 rounded-xl border border-purple-500/25 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Tag size={15} className="text-purple-400" />
                <span className="text-xs font-bold text-gray-200">
                  Descuento por Volumen (Regla 6 a 10 productos = 6% a 10%)
                </span>
              </div>

              {discountMode === 'auto' ? (
                <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                  Sugerencia Automática Activa
                </span>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResetToAuto}
                  className="text-[11px] text-purple-400 hover:underline"
                >
                  Restablecer a sugerido ({autoPercent}%)
                </button>
              )}
            </div>

            {/* Barra de Chips Interactivos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Sin Descuento */}
              <button
                type="button"
                onClick={() => handleSelectChip(0)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  !isFixedDiscount && activePercent === 0 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Sin desc.
              </button>

              {/* Rango 6% al 10% */}
              {[6, 7, 8, 9, 10].map((pct) => {
                const isAutoSelected = discountMode === 'auto' && autoPercent === pct;
                const isManualSelected = !isFixedDiscount && discountMode === 'manual' && selectedPercent === pct;
                const isActive = isAutoSelected || isManualSelected;

                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSelectChip(pct)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                      isActive 
                        ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400' 
                        : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <span>-{pct}%</span>
                    {isAutoSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    )}
                  </button>
                );
              })}

              {/* Monto Fijo */}
              <button
                type="button"
                onClick={handleSelectFixed}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isFixedDiscount 
                    ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400' 
                    : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Monto Fijo $
              </button>
            </div>

            {/* Input para Monto Fijo */}
            {isFixedDiscount && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Rebaja total en pesos ($):</span>
                <input 
                  type="number"
                  placeholder="Ej. 15000"
                  value={fixedDiscountAmount}
                  onChange={(e) => setFixedDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-32 bg-gray-800 text-white text-xs px-2.5 py-1 rounded-lg border border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Explicación de la regla activa */}
            <p className="text-[11px] text-gray-400">
              {totalUnits < 6 ? (
                <span>Al alcanzar 6 unidades se sugiere automáticamente el 6% de descuento (hasta 10% en 10+ unid.).</span>
              ) : (
                <span>
                  {totalUnits >= 10 
                    ? `Detectados ${totalUnits} productos: aplica tope sugerido del 10%.` 
                    : `Detectados ${totalUnits} productos: aplica ${totalUnits}% sugerido.`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* 4. TOTALES Y DESGLOSE FINANCIERO */}
        {cart.length > 0 && (
          <div className="bg-gradient-to-br from-gray-900 via-purple-950/20 to-gray-900 p-4 rounded-xl border border-purple-500/40 space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Subtotal Precio de Lista:</span>
              <span className="font-mono text-gray-200">{formatCurrency(subtotal)}</span>
            </div>

            {totalDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Descuento Aplicado ({isFixedDiscount ? 'Monto Fijo' : `-${activePercent}%`}):</span>
                <span className="font-mono font-bold">-{formatCurrency(totalDiscountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-gray-800 text-base font-bold">
              <span className="text-gray-200">Total a Cobrar:</span>
              <span className="text-2xl text-emerald-400 font-mono tracking-tight">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        )}

        {/* 5. ENVÍO DE COMPROBANTE POR CORREO */}
        <div className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-800 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-300 select-none">
            <input 
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <span className="flex items-center gap-1.5">
              <Mail size={15} className="text-purple-400" />
              Enviar comprobante de venta por correo vía Apps Script
            </span>
          </label>

          {sendEmail && (
            <div className="pt-1">
              <label className="block text-[11px] text-gray-400 mb-1">Destinatario:</label>
              <input 
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-gray-800 text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Notas de la venta (opcional):</label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Pago en efectivo, cliente frecuente, entrega acordada..."
              className="w-full bg-gray-800 text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmSale}
            disabled={isSubmitting || cart.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/40 transform active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Registrando Venta...</span>
              </>
            ) : (
              <>
                <PackageCheck size={18} />
                <span>Confirmar Venta ({formatCurrency(finalTotal)})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default QuickSaleModal;
