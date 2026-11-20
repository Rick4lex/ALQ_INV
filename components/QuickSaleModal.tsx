import React, { useState, useMemo, useEffect, useRef } from 'react';
import Modal from './Modal';
import SaleReceiptModal, { ReceiptMode } from './SaleReceiptModal';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Product,
  Variant,
  SaleRecord,
  SalePaymentStatus,
  SaleDeliveryStatus,
  SalePaymentMethod,
  SaleTicketItem
} from '../types';
import { formatCurrency } from '../utils';
import { getPrimarySeriesName } from '../catalogPagination';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Tag,
  Check,
  AlertCircle,
  Loader2,
  PackageCheck,
  Receipt,
  ClipboardList,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  ImageDown,
  Truck,
  User,
  Phone,
  Eye,
  Ban,
  CreditCard,
  Mail,
  X,
  Layers
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
  sku?: string;
  series: string;
  category: string;
  originalPrice: number;
  stockAvailable: number;
  quantity: number;
  imageUrl?: string;
}

type PanelTab = 'new' | 'tickets' | 'today';
type SaleActionMode = 'pagado' | 'pendiente' | 'parcial';

const PAYMENT_METHODS: SalePaymentMethod[] = [
  'Nequi',
  'Efectivo',
  'Transferencia',
  'Daviplata',
  'Tarjeta',
  'Otro'
];

const DELIVERY_OPTIONS: { value: SaleDeliveryStatus; label: string }[] = [
  { value: 'por_entregar', label: 'Por entregar' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' }
];

const STATUS_BADGE: Record<SalePaymentStatus, { label: string; className: string }> = {
  pagado: {
    label: 'Pagado',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
  },
  pendiente: {
    label: 'Pendiente',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40'
  },
  parcial: {
    label: 'Abonado',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/40'
  },
  anulado: {
    label: 'Anulado',
    className: 'bg-red-500/15 text-red-300 border-red-500/40'
  }
};

const generateTicketId = () => `TICK-${Date.now().toString().slice(-6)}`;

const QuickSaleModal: React.FC<QuickSaleModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    allCategories,
    sales,
    handleCreateSale,
    handleConfirmSalePayment,
    handleUpdateSaleDelivery,
    handleCancelSale
  } = useAppContext();
  const { user } = useAuth();

  // Navegación del Panel de Control de Ventas
  const [activeTab, setActiveTab] = useState<PanelTab>('new');

  // --- TAB 1: NUEVA VENTA / COBRO ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedPickerCategory, setSelectedPickerCategory] = useState<string | null>(null);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const pickerContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [ticketId, setTicketId] = useState(generateTicketId);

  // Regla de descuento (6 a 10 productos = 6% a 10%)
  const [discountMode, setDiscountMode] = useState<'auto' | 'manual'>('auto');
  const [selectedPercent, setSelectedPercent] = useState<number>(0);
  const [isFixedDiscount, setIsFixedDiscount] = useState<boolean>(false);
  const [fixedDiscountAmount, setFixedDiscountAmount] = useState<number | ''>('');

  // Datos del cliente, cobro y entrega
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingCost, setShippingCost] = useState<number | ''>('');
  const [deliveryStatus, setDeliveryStatus] = useState<SaleDeliveryStatus>('por_entregar');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('Nequi');
  const [saleMode, setSaleMode] = useState<SaleActionMode>('pagado');
  const [reserveStock, setReserveStock] = useState<boolean>(true);
  const [partialAmount, setPartialAmount] = useState<number | ''>('');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Estados de proceso y avisos inline
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Modal de comprobante PNG (cobro / pago)
  const [receiptModal, setReceiptModal] = useState<{ sale: SaleRecord; mode: ReceiptMode } | null>(null);

  // --- TAB 2: CONTROL DE TICKETS ---
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SalePaymentStatus>('all');
  const [confirmingPayTicketId, setConfirmingPayTicketId] = useState<string | null>(null);
  const [confirmPayMethod, setConfirmPayMethod] = useState<SalePaymentMethod>('Nequi');
  const [confirmPayAmount, setConfirmPayAmount] = useState<number | ''>('');
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(null);

  const showNotice = (type: 'error' | 'success', text: string) => {
    setInlineNotice({ type, text });
    setTimeout(() => {
      setInlineNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const resetNewSaleForm = () => {
    setTicketId(generateTicketId());
    setCart([]);
    setSearchQuery('');
    setIsPickerOpen(false);
    setSelectedPickerCategory(null);
    setOnlyInStock(true);
    setHighlightedIndex(0);
    setDiscountMode('auto');
    setSelectedPercent(0);
    setIsFixedDiscount(false);
    setFixedDiscountAmount('');
    setCustomerName('');
    setCustomerContact('');
    setCustomerEmail('');
    setShippingCost('');
    setDeliveryStatus('por_entregar');
    setPaymentMethod('Nequi');
    setSaleMode('pagado');
    setReserveStock(true);
    setPartialAmount('');
    setCashReceived('');
    setNotes('');
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('new');
      resetNewSaleForm();
      setInlineNotice(null);
      setReceiptModal(null);
      setConfirmingPayTicketId(null);
      setCancellingTicketId(null);
    }
  }, [isOpen]);

  // Cerrar el selector solo al hacer clic fuera de su contenedor
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerContainerRef.current &&
        !pickerContainerRef.current.contains(e.target as Node)
      ) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  // --- CÁLCULOS DEL CARRITO ---
  const totalUnits = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const autoPercent = useMemo(() => {
    if (totalUnits >= 10) return 10;
    if (totalUnits >= 6) return totalUnits;
    return 0;
  }, [totalUnits]);

  const activePercent = useMemo(() => {
    if (isFixedDiscount) return 0;
    if (discountMode === 'auto') return autoPercent;
    return selectedPercent;
  }, [discountMode, autoPercent, selectedPercent, isFixedDiscount]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.originalPrice, 0),
    [cart]
  );

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

  const discountLabel = useMemo(() => {
    if (totalDiscountAmount <= 0) return undefined;
    return isFixedDiscount ? 'Monto fijo' : `-${activePercent}%`;
  }, [totalDiscountAmount, isFixedDiscount, activePercent]);

  const numericShipping = Math.max(0, Number(shippingCost) || 0);

  const finalTotal = useMemo(
    () => Math.max(0, subtotal - totalDiscountAmount) + numericShipping,
    [subtotal, totalDiscountAmount, numericShipping]
  );

  const numericPartial = Math.min(finalTotal, Math.max(0, Number(partialAmount) || 0));
  const pendingBalance = Math.max(0, finalTotal - (saleMode === 'pagado' ? finalTotal : saleMode === 'parcial' ? numericPartial : 0));
  const cashChange = useMemo(() => {
    const received = Number(cashReceived) || 0;
    return received > finalTotal ? received - finalTotal : 0;
  }, [cashReceived, finalTotal]);

  // Mapa rápido de cantidades en carrito por variantId
  const cartQtyByVariant = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((item) => map.set(item.variantId, item.quantity));
    return map;
  }, [cart]);

  // Categorías disponibles para chips de exploración rápida
  const pickerCategories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    (allCategories || []).forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [products, allCategories]);

  // Buscador agrupado por producto con puntuación de relevancia, filtro de categoría y stock
  const groupedSearchResults = useMemo(() => {
    if (!products) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query && !selectedPickerCategory) return [];

    const wordStartsWith = (text: string, q: string) =>
      text
        .toLowerCase()
        .split(/[\s\-_/·(),.]+/)
        .some((w) => w.startsWith(q));

    const groups: {
      product: Product;
      series: string;
      score: number;
      variants: Variant[];
    }[] = [];

    for (const p of products) {
      if (!p.title || !p.title.trim()) continue;
      if (selectedPickerCategory && p.category !== selectedPickerCategory) continue;

      const titleLower = p.title.toLowerCase();
      const categoryLower = (p.category || '').toLowerCase();
      const series = getPrimarySeriesName(p);
      const seriesLower = series.toLowerCase();

      let productScore = 0;
      if (query) {
        if (titleLower.startsWith(query)) productScore = Math.max(productScore, 100);
        else if (seriesLower.startsWith(query)) productScore = Math.max(productScore, 92);
        else if (wordStartsWith(titleLower, query)) productScore = Math.max(productScore, 84);
        else if (wordStartsWith(seriesLower, query)) productScore = Math.max(productScore, 78);
        else if (titleLower.includes(query)) productScore = Math.max(productScore, 55);
        else if (seriesLower.includes(query)) productScore = Math.max(productScore, 50);
        else if (categoryLower.startsWith(query) || categoryLower.includes(query)) {
          productScore = Math.max(productScore, 40);
        }
      } else {
        productScore = 50; // Modo exploración por categoría
      }

      const matchingVariants: { variant: Variant; vScore: number }[] = [];
      for (const v of p.variants || []) {
        const stock = v.stock || 0;
        if (onlyInStock && stock <= 0) continue;

        if (!query) {
          matchingVariants.push({ variant: v, vScore: 50 });
          continue;
        }

        const vNameLower = (v.name || '').toLowerCase();
        const vSkuLower = (v.sku || '').toLowerCase();

        let vScore = 0;
        if (vSkuLower && vSkuLower.includes(query)) vScore = Math.max(vScore, 60);
        if (vNameLower.startsWith(query)) vScore = Math.max(vScore, 45);
        else if (wordStartsWith(vNameLower, query)) vScore = Math.max(vScore, 35);
        else if (vNameLower.includes(query)) vScore = Math.max(vScore, 12);

        if (productScore > 0 || vScore > 0) {
          matchingVariants.push({ variant: v, vScore: Math.max(productScore, vScore) });
        }
      }

      if (matchingVariants.length > 0) {
        matchingVariants.sort((a, b) => b.vScore - a.vScore);
        const bestScore = Math.max(productScore, matchingVariants[0].vScore);
        groups.push({
          product: p,
          series,
          score: bestScore,
          variants: matchingVariants.map((mv) => mv.variant)
        });
      }
    }

    groups.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.product.title.localeCompare(b.product.title, 'es');
    });

    // Tope amplio de 60 variantes visibles para que colecciones completas no se corten
    const cappedGroups: typeof groups = [];
    let variantCount = 0;
    for (const g of groups) {
      if (variantCount >= 60) break;
      const remaining = 60 - variantCount;
      const sliced = g.variants.slice(0, remaining);
      cappedGroups.push({ ...g, variants: sliced });
      variantCount += sliced.length;
    }

    return cappedGroups;
  }, [products, searchQuery, selectedPickerCategory, onlyInStock]);

  // Lista plana de variantes visibles para navegación con teclado (↑ / ↓ / Enter)
  const flatVisibleVariants = useMemo(() => {
    const flat: { product: Product; variant: Variant; series: string }[] = [];
    groupedSearchResults.forEach((g) => {
      g.variants.forEach((v) => {
        flat.push({ product: g.product, variant: v, series: g.series });
      });
    });
    return flat;
  }, [groupedSearchResults]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, selectedPickerCategory, onlyInStock]);

  const addToCart = (product: Product, variant: Variant, series: string) => {
    const existingIndex = cart.findIndex((i) => i.variantId === variant.id);
    const availableStock = variant.stock || 0;

    if (availableStock <= 0) {
      showNotice('error', `"${variant.name}" de "${product.title}" no tiene stock disponible.`);
      return;
    }

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= availableStock) {
        showNotice('error', `Solo hay ${availableStock} unidad(es) disponibles de "${variant.name}".`);
        return;
      }
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productTitle: product.title,
          variantId: variant.id,
          variantName: variant.name,
          sku: variant.sku,
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

  // Agregar todas las variantes disponibles de una colección/producto en 1 clic
  const addAllVariantsToCart = (product: Product, variants: Variant[], series: string) => {
    const toAdd = variants.filter((v) => {
      const stock = v.stock || 0;
      const inCart = cartQtyByVariant.get(v.id) || 0;
      return stock > 0 && inCart === 0;
    });

    if (toAdd.length === 0) {
      showNotice('success', `Todas las variantes disponibles de "${product.title}" ya están en el ticket.`);
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      for (const v of toAdd) {
        const exists = next.some((item) => item.variantId === v.id);
        if (!exists && (v.stock || 0) > 0) {
          next.push({
            productId: product.id,
            productTitle: product.title,
            variantId: v.id,
            variantName: v.name,
            sku: v.sku,
            series,
            category: product.category,
            originalPrice: v.price || 0,
            stockAvailable: v.stock || 0,
            quantity: 1,
            imageUrl: v.imageUrl || product.imageUrls?.[0]
          });
        }
      }
      return next;
    });

    showNotice('success', `Se agregaron ${toAdd.length} variantes de "${product.title}" al ticket.`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsPickerOpen(false);
      return;
    }
    if (!isPickerOpen || flatVisibleVariants.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % flatVisibleVariants.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + flatVisibleVariants.length) % flatVisibleVariants.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatVisibleVariants[highlightedIndex];
      if (target && (target.variant.stock || 0) > 0) {
        addToCart(target.product, target.variant, target.series);
      }
    }
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId !== variantId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.stockAvailable) {
            showNotice('error', `Stock máximo alcanzado (${item.stockAvailable} unid.).`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const handleSelectChip = (percent: number) => {
    setIsFixedDiscount(false);
    if (percent === autoPercent && discountMode === 'auto') return;
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

  // Construir objeto SaleRecord a partir del formulario actual
  const buildDraftSaleRecord = (): SaleRecord => {
    const effectiveDiscountFactor = subtotal > 0 ? totalDiscountAmount / subtotal : 0;
    const now = Date.now();

    const items: SaleTicketItem[] = cart.map((item) => {
      const discountPerUnit = Math.round(item.originalPrice * effectiveDiscountFactor);
      const unitPriceEffective = Math.max(0, item.originalPrice - discountPerUnit);
      return {
        productId: item.productId,
        variantId: item.variantId,
        productTitle: item.productTitle,
        variantName: item.variantName,
        sku: item.sku,
        series: item.series,
        quantity: item.quantity,
        originalPrice: item.originalPrice,
        unitPrice: unitPriceEffective,
        discount: discountPerUnit,
        subtotal: item.quantity * unitPriceEffective
      };
    });

    const amountPaidValue =
      saleMode === 'pagado'
        ? finalTotal
        : saleMode === 'parcial'
          ? numericPartial
          : 0;

    return {
      ticketId,
      createdAt: now,
      paidAt: saleMode === 'pagado' ? now : undefined,
      paymentStatus: saleMode,
      deliveryStatus,
      customerName: customerName.trim() || 'Cliente General',
      customerContact: customerContact.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      paymentMethod,
      subtotal,
      discountAmount: totalDiscountAmount,
      discountLabel,
      shippingCost: numericShipping,
      total: finalTotal,
      amountPaid: amountPaidValue,
      cashReceived:
        saleMode === 'pagado' && paymentMethod === 'Efectivo' && Number(cashReceived) > 0
          ? Number(cashReceived)
          : undefined,
      stockDeducted: saleMode === 'pagado' ? true : reserveStock,
      items,
      soldBy: user?.role || 'admin',
      notes: notes.trim() || undefined
    };
  };

  const handlePreviewDraft = () => {
    if (cart.length === 0) {
      showNotice('error', 'Agrega al menos un producto para previsualizar el comprobante.');
      return;
    }
    const draft = buildDraftSaleRecord();
    setReceiptModal({
      sale: draft,
      mode: saleMode === 'pagado' ? 'pago' : 'cobro'
    });
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      showNotice('error', 'El carrito está vacío. Agrega al menos un producto.');
      return;
    }

    if (saleMode === 'parcial' && (numericPartial <= 0 || numericPartial >= finalTotal)) {
      showNotice(
        'error',
        `Para un abono parcial ingresa un valor mayor a $0 y menor a ${formatCurrency(finalTotal)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const record = buildDraftSaleRecord();
      const saved = await handleCreateSale(record);
      if (saved) {
        const modeToOpen: ReceiptMode = saved.paymentStatus === 'pagado' ? 'pago' : 'cobro';
        resetNewSaleForm();
        showNotice(
          'success',
          saved.paymentStatus === 'pagado'
            ? `Pago #${saved.ticketId} registrado y sincronizado.`
            : `Ticket #${saved.ticketId} guardado como ${STATUS_BADGE[saved.paymentStatus].label}.`
        );
        setReceiptModal({ sale: saved, mode: modeToOpen });
      }
    } catch (err) {
      console.error('Error al registrar ticket de venta:', err);
      showNotice('error', 'No se pudo registrar el ticket. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- TAB 2: DATOS Y ACCIONES DE TICKETS ---
  const ticketCounts = useMemo(() => {
    const counts = { all: sales.length, pendiente: 0, parcial: 0, pagado: 0, anulado: 0 };
    sales.forEach((s) => {
      if (counts[s.paymentStatus] !== undefined) counts[s.paymentStatus] += 1;
    });
    return counts;
  }, [sales]);

  const activePendingCount = ticketCounts.pendiente + ticketCounts.parcial;

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (statusFilter !== 'all' && s.paymentStatus !== statusFilter) return false;
      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase();
        const matchTicket = s.ticketId.toLowerCase().includes(q);
        const matchCust = (s.customerName || '').toLowerCase().includes(q);
        const matchContact = (s.customerContact || '').toLowerCase().includes(q);
        const matchItems = (s.items || []).some(
          (i) => i.productTitle.toLowerCase().includes(q) || i.variantName.toLowerCase().includes(q)
        );
        return matchTicket || matchCust || matchContact || matchItems;
      }
      return true;
    });
  }, [sales, statusFilter, ticketSearch]);

  const openConfirmPaymentInline = (sale: SaleRecord) => {
    setCancellingTicketId(null);
    setConfirmingPayTicketId(sale.ticketId);
    setConfirmPayMethod(sale.paymentMethod || 'Nequi');
    setConfirmPayAmount(sale.total);
  };

  const submitConfirmPayment = async (sale: SaleRecord) => {
    const finalAmt = confirmPayAmount === '' ? sale.total : Number(confirmPayAmount);
    if (finalAmt <= 0) {
      showNotice('error', 'Ingresa un monto válido para confirmar el pago.');
      return;
    }
    setProcessingTicketId(sale.ticketId);
    try {
      const updated = await handleConfirmSalePayment(sale.ticketId, confirmPayMethod, finalAmt);
      if (updated) {
        setConfirmingPayTicketId(null);
        showNotice(
          'success',
          updated.paymentStatus === 'pagado'
            ? `Ticket #${updated.ticketId} marcado como PAGADO.`
            : `Abono actualizado en Ticket #${updated.ticketId}.`
        );
        setReceiptModal({
          sale: updated,
          mode: updated.paymentStatus === 'pagado' ? 'pago' : 'cobro'
        });
      }
    } finally {
      setProcessingTicketId(null);
    }
  };

  const submitCancelTicket = async (ticketIdToCancel: string) => {
    setProcessingTicketId(ticketIdToCancel);
    try {
      await handleCancelSale(ticketIdToCancel);
      setCancellingTicketId(null);
      showNotice('success', `Ticket #${ticketIdToCancel} anulado y stock restaurado si aplicaba.`);
    } finally {
      setProcessingTicketId(null);
    }
  };

  // --- TAB 3: CAJA DE HOY ---
  const todayStats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();

    let collectedToday = 0;
    let paidTicketsToday = 0;
    let pendingTicketsToday = 0;
    let unitsSoldToday = 0;
    let globalPendingBalance = 0;
    const byMethod: Record<SalePaymentMethod, number> = {
      Nequi: 0,
      Efectivo: 0,
      Transferencia: 0,
      Daviplata: 0,
      Tarjeta: 0,
      Otro: 0
    };
    const pendingList: SaleRecord[] = [];

    sales.forEach((s) => {
      if (s.paymentStatus === 'anulado') return;

      const balance = Math.max(0, s.total - (s.amountPaid || 0));
      if (s.paymentStatus === 'pendiente' || s.paymentStatus === 'parcial') {
        globalPendingBalance += balance;
        pendingList.push(s);
      }

      const relevantTime = s.paidAt || s.createdAt;
      const isToday = relevantTime >= startMs || s.createdAt >= startMs;
      if (!isToday) return;

      if (s.paymentStatus === 'pagado') {
        collectedToday += s.total;
        paidTicketsToday += 1;
        unitsSoldToday += (s.items || []).reduce((acc, i) => acc + i.quantity, 0);
        byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total;
      } else {
        pendingTicketsToday += 1;
        if (s.amountPaid > 0) {
          collectedToday += s.amountPaid;
          byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.amountPaid;
        }
      }
    });

    const methodBreakdown = (Object.entries(byMethod) as [SalePaymentMethod, number][])
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1]);

    return {
      collectedToday,
      paidTicketsToday,
      pendingTicketsToday,
      unitsSoldToday,
      globalPendingBalance,
      methodBreakdown,
      pendingList
    };
  }, [sales]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Panel de Control de Ventas" size="2xl">
        <div className="flex flex-col max-h-[82vh] text-gray-100">
          {/* BARRA SUPERIOR DE PESTAÑAS */}
          <div className="px-4 sm:px-6 pt-3.5 pb-3 border-b border-gray-700/70 bg-gray-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="inline-flex bg-gray-950 p-1 rounded-xl border border-gray-800 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'new'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShoppingCart size={14} />
                <span>Nueva Venta / Cobro</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'tickets'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ClipboardList size={14} />
                <span>Tickets</span>
                {activePendingCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                    {activePendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'today'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Wallet size={14} />
                <span>Caja de Hoy</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs text-gray-400 tabular-nums">
              <span>
                Cobrado hoy:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrency(todayStats.collectedToday)}
                </strong>
              </span>
              {todayStats.globalPendingBalance > 0 && (
                <span>
                  Por cobrar:{' '}
                  <strong className="text-amber-300 font-mono">
                    {formatCurrency(todayStats.globalPendingBalance)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* AVISO INLINE (SIN window.alert) */}
          {inlineNotice && (
            <div className="px-4 sm:px-6 pt-3 shrink-0">
              <div
                className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  inlineNotice.type === 'error'
                    ? 'bg-red-950/70 border-red-500/50 text-red-200'
                    : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  {inlineNotice.type === 'error' ? (
                    <AlertCircle size={15} className="text-red-400 shrink-0" />
                  ) : (
                    <Check size={15} className="text-emerald-400 shrink-0" />
                  )}
                  <span>{inlineNotice.text}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setInlineNotice(null)}
                  className="text-xs opacity-70 hover:opacity-100 px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* CONTENIDO PRINCIPAL SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* ==================== TAB 1: NUEVA VENTA / COBRO ==================== */}
            {activeTab === 'new' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* COLUMNA IZQUIERDA (7 cols): Buscador, Carrito y Descuentos */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Cabecera del Ticket */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/70 px-4 py-3 rounded-xl border border-purple-500/25">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-gray-400 block">
                          Ticket en curso
                        </span>
                        <span className="text-sm sm:text-base font-mono font-bold text-white">
                          {ticketId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">Unidades:</span>
                      <span className="font-bold font-mono bg-purple-950/70 text-purple-200 border border-purple-500/30 px-2.5 py-0.5 rounded-lg">
                        {totalUnits}
                      </span>
                    </div>
                  </div>

                  {/* Buscador y Selector Continuo de Productos */}
                  <div ref={pickerContainerRef} className="relative space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Agregar Productos al Ticket
                      </label>

                      <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={onlyInStock}
                          onChange={(e) => setOnlyInStock(e.target.checked)}
                          className="h-3.5 w-3.5 rounded bg-gray-800 border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Solo con stock</span>
                      </label>
                    </div>

                    {/* Input de búsqueda con botón limpiar (✕) y atajos de teclado */}
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar por nombre, serie (Gravity Falls, Naruto...), categoría o SKU..."
                        value={searchQuery}
                        onFocus={() => {
                          if (searchQuery.trim() || selectedPickerCategory) {
                            setIsPickerOpen(true);
                          }
                        }}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsPickerOpen(true);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full bg-gray-900 text-white text-sm pl-10 pr-20 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 placeholder-gray-500"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {(searchQuery || selectedPickerCategory) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedPickerCategory(null);
                              setIsPickerOpen(false);
                              searchInputRef.current?.focus();
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Limpiar búsqueda"
                            aria-label="Limpiar búsqueda"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {isPickerOpen && (
                          <button
                            type="button"
                            onClick={() => setIsPickerOpen(false)}
                            className="px-2 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-[11px] font-bold transition-colors"
                          >
                            Listo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chips rápidos de exploración por categoría (sin escribir) */}
                    {pickerCategories.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {pickerCategories.map((cat) => {
                          const isSelected = selectedPickerCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPickerCategory(null);
                                  if (!searchQuery.trim()) setIsPickerOpen(false);
                                } else {
                                  setSelectedPickerCategory(cat);
                                  setIsPickerOpen(true);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap border transition-colors ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-400'
                                  : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                              }`}
                            >
                              {cat.replace(/-/g, ' ')}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Panel desplegable de selección continua agrupado por producto */}
                    {isPickerOpen && (searchQuery.trim() || selectedPickerCategory) && (
                      <div className="bg-gray-950 border border-purple-500/50 rounded-xl shadow-2xl overflow-hidden">
                        {/* Cabecera del panel con conteo + atajos + botón Listo */}
                        <div className="px-3 py-2 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-gray-400">
                            <strong className="text-white font-mono">
                              {flatVisibleVariants.length}
                            </strong>{' '}
                            variante(s) en{' '}
                            <strong className="text-white font-mono">
                              {groupedSearchResults.length}
                            </strong>{' '}
                            producto(s)
                            <span className="hidden sm:inline text-gray-500">
                              {' '}
                              · ↑↓ Enter para agregar · Esc para cerrar
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPickerOpen(false)}
                            className="text-purple-300 hover:text-white font-bold px-2 py-0.5 rounded hover:bg-gray-800 shrink-0"
                          >
                            Cerrar
                          </button>
                        </div>

                        {groupedSearchResults.length > 0 ? (
                          <div className="max-h-72 overflow-y-auto divide-y divide-gray-800">
                            {groupedSearchResults.map(({ product, series, variants }) => {
                              const addableCount = variants.filter((v) => {
                                const inCart = cartQtyByVariant.get(v.id) || 0;
                                return (v.stock || 0) > 0 && inCart === 0;
                              }).length;
                              const thumb = variants[0]?.imageUrl || product.imageUrls?.[0];

                              return (
                                <div key={product.id} className="bg-gray-950">
                                  {/* Encabezado padre del producto / colección */}
                                  <div className="px-3 py-2 bg-gray-900/70 flex items-center justify-between gap-2 border-b border-gray-800/70">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {thumb ? (
                                        <img
                                          src={thumb}
                                          alt={product.title}
                                          className="w-7 h-7 rounded-md object-cover border border-gray-700 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-purple-300 text-xs font-bold">
                                          {product.title.charAt(0)}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-xs text-white truncate max-w-[230px] sm:max-w-[300px]">
                                            {product.title}
                                          </span>
                                          {series && series !== 'Sin Serie' && (
                                            <span className="text-[9px] bg-purple-950/80 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase">
                                              {series}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {variants.length >= 2 && addableCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          addAllVariantsToCart(product, variants, series)
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-[11px] font-bold transition-colors shrink-0"
                                        title={`Agregar las ${addableCount} variantes disponibles de esta colección`}
                                      >
                                        <Layers size={12} />
                                        <span>+ Todos ({addableCount})</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Sub-filas de variantes con controles inline (− cant +) */}
                                  <div className="divide-y divide-gray-800/50">
                                    {variants.map((variant) => {
                                      const stock = variant.stock || 0;
                                      const qtyInCart = cartQtyByVariant.get(variant.id) || 0;
                                      const remainingStock = Math.max(0, stock - qtyInCart);
                                      const isOutOfStock = stock <= 0;
                                      const isMaxed = !isOutOfStock && remainingStock === 0;
                                      const flatIdx = flatVisibleVariants.findIndex(
                                        (f) => f.variant.id === variant.id
                                      );
                                      const isHighlighted = flatIdx === highlightedIndex;

                                      return (
                                        <div
                                          key={variant.id}
                                          onMouseEnter={() => {
                                            if (flatIdx >= 0) setHighlightedIndex(flatIdx);
                                          }}
                                          onClick={() => {
                                            if (qtyInCart === 0 && !isOutOfStock) {
                                              addToCart(product, variant, series);
                                            }
                                          }}
                                          className={`px-3 py-2 flex items-center justify-between gap-2.5 transition-colors ${
                                            isOutOfStock
                                              ? 'opacity-45 cursor-not-allowed'
                                              : qtyInCart > 0
                                                ? 'bg-emerald-950/25 border-l-2 border-l-emerald-400'
                                                : isHighlighted
                                                  ? 'bg-purple-950/45 cursor-pointer'
                                                  : 'hover:bg-gray-900/70 cursor-pointer'
                                          }`}
                                        >
                                          <div className="min-w-0 flex-1 pl-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs font-medium text-gray-100 truncate">
                                                · {variant.name}
                                              </span>
                                              {variant.sku && (
                                                <span className="text-[10px] font-mono text-gray-500">
                                                  ({variant.sku})
                                                </span>
                                              )}
                                              {qtyInCart > 0 && (
                                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                                                  En ticket
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[11px] text-gray-400 block">
                                              {isOutOfStock ? (
                                                <span className="text-red-400">Agotado</span>
                                              ) : isMaxed ? (
                                                <span className="text-amber-300">
                                                  Stock: {stock} · Máx. en ticket
                                                </span>
                                              ) : qtyInCart > 0 ? (
                                                <span>
                                                  Stock: {stock} · Quedan{' '}
                                                  <strong className="text-gray-200">
                                                    {remainingStock}
                                                  </strong>
                                                </span>
                                              ) : (
                                                <span>Stock: {stock}</span>
                                              )}
                                            </span>
                                          </div>

                                          <div
                                            className="flex items-center gap-2.5 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                                              {formatCurrency(variant.price || 0)}
                                            </span>

                                            {qtyInCart > 0 ? (
                                              <div className="flex items-center bg-gray-900 rounded-lg border border-emerald-500/40 p-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => updateQuantity(variant.id, -1)}
                                                  className="p-1.5 hover:bg-gray-800 text-gray-200 rounded transition-colors"
                                                  aria-label="Restar unidad"
                                                >
                                                  <Minus size={12} />
                                                </button>
                                                <span className="w-7 text-center text-xs font-bold font-mono text-emerald-300 tabular-nums">
                                                  {qtyInCart}
                                                </span>
                                                <button
                                                  type="button"
                                                  disabled={isMaxed}
                                                  onClick={() =>
                                                    addToCart(product, variant, series)
                                                  }
                                                  className="p-1.5 hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed text-emerald-300 rounded transition-colors"
                                                  aria-label="Sumar unidad"
                                                >
                                                  <Plus size={12} />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                disabled={isOutOfStock}
                                                onClick={() =>
                                                  addToCart(product, variant, series)
                                                }
                                                className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white transition-transform active:scale-95"
                                                aria-label={`Agregar ${variant.name}`}
                                              >
                                                <Plus size={14} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 px-4 text-center text-xs text-gray-400">
                            No se encontraron variantes{' '}
                            {onlyInStock ? 'con stock disponible ' : ''}para esta búsqueda.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista del Carrito */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Productos en el Ticket ({cart.length})
                      </span>
                      {cart.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCart([])}
                          className="text-[11px] text-red-400 hover:underline font-medium"
                        >
                          Vaciar lista
                        </button>
                      )}
                    </div>

                    <div className="bg-gray-900/70 rounded-xl border border-gray-800 max-h-60 overflow-y-auto divide-y divide-gray-800/80">
                      {cart.length > 0 ? (
                        cart.map((item) => (
                          <div
                            key={item.variantId}
                            className="p-3 flex items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-bold text-gray-100 truncate"
                                  title={item.productTitle}
                                >
                                  {item.productTitle}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400 block truncate">
                                {item.variantName} · {formatCurrency(item.originalPrice)} c/u
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.variantId, -1)}
                                  className="p-1.5 hover:bg-gray-700 text-gray-300 rounded"
                                  aria-label="Restar unidad"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-7 text-center font-bold text-xs font-mono tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.variantId, 1)}
                                  className="p-1.5 hover:bg-gray-700 text-gray-300 rounded"
                                  aria-label="Sumar unidad"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <span className="w-20 text-right font-bold text-emerald-400 font-mono tabular-nums">
                                {formatCurrency(item.quantity * item.originalPrice)}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeFromCart(item.variantId)}
                                className="p-1.5 text-red-400 hover:bg-red-950/40 rounded transition-colors"
                                title="Quitar del ticket"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <ShoppingCart size={28} className="mx-auto mb-2 text-gray-600" />
                          <p className="text-xs font-medium text-gray-400">
                            Aún no hay productos en el ticket.
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Usa el buscador arriba para añadir variantes con stock disponible.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Regla de Descuento por Volumen */}
                  {cart.length > 0 && (
                    <div className="bg-gray-900/70 p-3.5 rounded-xl border border-purple-500/20 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Tag size={14} className="text-purple-400" />
                          <span className="text-xs font-bold text-gray-200">
                            Descuento (6–10 unid. = 6%–10%)
                          </span>
                        </div>

                        {discountMode === 'auto' ? (
                          <span className="text-[11px] text-emerald-300 font-semibold">
                            Automático ({autoPercent}%)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResetToAuto}
                            className="text-[11px] text-purple-400 hover:underline font-semibold"
                          >
                            Volver a sugerido ({autoPercent}%)
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSelectChip(0)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            !isFixedDiscount && activePercent === 0
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          Sin desc.
                        </button>

                        {[6, 7, 8, 9, 10].map((pct) => {
                          const isAutoSelected = discountMode === 'auto' && autoPercent === pct;
                          const isManualSelected =
                            !isFixedDiscount && discountMode === 'manual' && selectedPercent === pct;
                          const isActive = isAutoSelected || isManualSelected;

                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleSelectChip(pct)}
                              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                                  : 'bg-gray-800 text-gray-300 hover:text-white'
                              }`}
                            >
                              -{pct}%
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleSelectFixed}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            isFixedDiscount
                              ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                              : 'bg-gray-800 text-gray-300 hover:text-white'
                          }`}
                        >
                          Monto fijo $
                        </button>
                      </div>

                      {isFixedDiscount && (
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Rebaja total ($):</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="Ej. 10000"
                            value={fixedDiscountAmount}
                            onChange={(e) =>
                              setFixedDiscountAmount(
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className="w-32 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-purple-500/40 focus:outline-none focus:border-purple-400 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* COLUMNA DERECHA (5 cols): Cliente, Cobro/Pago, Totales y Botón */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Datos del Cliente & Envío */}
                  <div className="bg-gray-900/70 p-4 rounded-xl border border-gray-800 space-y-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Cliente y Entrega
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Nombre del cliente
                        </label>
                        <div className="relative">
                          <User
                            size={13}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ej. Laura Gómez"
                            className="w-full bg-gray-800 text-xs pl-8 pr-2.5 py-2 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Celular / WhatsApp
                        </label>
                        <div className="relative">
                          <Phone
                            size={13}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                          <input
                            type="text"
                            value={customerContact}
                            onChange={(e) => setCustomerContact(e.target.value)}
                            placeholder="315 000 0000"
                            className="w-full bg-gray-800 text-xs pl-8 pr-2.5 py-2 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Correo electrónico (opcional)
                      </label>
                      <div className="relative">
                        <Mail
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="cliente@email.com"
                          className="w-full bg-gray-800 text-xs pl-8 pr-2.5 py-2 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Costo de envío ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={shippingCost}
                          onChange={(e) =>
                            setShippingCost(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder="0"
                          className="w-full bg-gray-800 text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Estado entrega
                        </label>
                        <select
                          value={deliveryStatus}
                          onChange={(e) =>
                            setDeliveryStatus(e.target.value as SaleDeliveryStatus)
                          }
                          className="w-full bg-gray-800 text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
                        >
                          {DELIVERY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Observaciones (aparecen en el comprobante)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej. Entrega en estación, empaque de regalo..."
                        className="w-full bg-gray-800 text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Modalidad de Cobro / Pago */}
                  <div className="bg-gray-900/70 p-4 rounded-xl border border-gray-800 space-y-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Tipo de Operación y Pago
                    </span>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSaleMode('pagado')}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                          saleMode === 'pagado'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                            : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 size={15} />
                        <span>Pago Total</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSaleMode('pendiente')}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                          saleMode === 'pendiente'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                            : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
                        }`}
                      >
                        <Clock size={15} />
                        <span>Cobro Pend.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSaleMode('parcial')}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                          saleMode === 'parcial'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-400/60'
                            : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
                        }`}
                      >
                        <CreditCard size={15} />
                        <span>Abono</span>
                      </button>
                    </div>

                    {/* Método de Pago */}
                    <div>
                      <span className="block text-[11px] text-gray-400 mb-1.5">
                        Método de pago
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                              paymentMethod === method
                                ? 'bg-purple-600 text-white border-purple-400'
                                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campos condicionales por modalidad */}
                    {saleMode === 'parcial' && (
                      <div className="pt-1 space-y-1.5">
                        <label className="block text-[11px] text-sky-300 font-semibold">
                          Monto abonado ahora ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={finalTotal}
                          value={partialAmount}
                          onChange={(e) =>
                            setPartialAmount(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder={`Ej. ${Math.round(finalTotal / 2)}`}
                          className="w-full bg-gray-800 text-xs px-3 py-2 rounded-lg border border-sky-500/40 text-white font-mono focus:outline-none focus:border-sky-400"
                        />
                        {finalTotal > 0 && (
                          <p className="text-[11px] text-amber-300 font-mono">
                            Saldo pendiente: {formatCurrency(pendingBalance)}
                          </p>
                        )}
                      </div>
                    )}

                    {(saleMode === 'pendiente' || saleMode === 'parcial') && (
                      <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={reserveStock}
                          onChange={(e) => setReserveStock(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded bg-gray-800 border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-[11px] text-gray-300 leading-snug">
                          <strong className="text-white">Apartar stock en inventario</strong>
                          <span className="block text-gray-400">
                            Descuenta las unidades para no venderlas por error (el ingreso solo cuenta en Finanzas al confirmar pago total).
                          </span>
                        </span>
                      </label>
                    )}

                    {saleMode === 'pagado' && paymentMethod === 'Efectivo' && (
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] text-gray-400 mb-1">
                            Efectivo recibido (opcional)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={cashReceived}
                            onChange={(e) =>
                              setCashReceived(e.target.value === '' ? '' : Number(e.target.value))
                            }
                            placeholder={`Ej. ${finalTotal}`}
                            className="w-full bg-gray-800 text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        {cashChange > 0 && (
                          <div className="text-right pt-4">
                            <span className="text-[10px] text-gray-400 block uppercase">Cambio</span>
                            <span className="text-sm font-bold text-emerald-400 font-mono">
                              {formatCurrency(cashChange)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resumen Total & Acciones */}
                  <div className="bg-gradient-to-br from-gray-900 via-purple-950/30 to-gray-900 p-4 rounded-xl border border-purple-500/40 space-y-2 tabular-nums">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Subtotal</span>
                      <span className="font-mono text-gray-200">{formatCurrency(subtotal)}</span>
                    </div>

                    {totalDiscountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-400">
                        <span>Descuento ({discountLabel})</span>
                        <span className="font-mono font-bold">
                          -{formatCurrency(totalDiscountAmount)}
                        </span>
                      </div>
                    )}

                    {numericShipping > 0 && (
                      <div className="flex justify-between text-xs text-gray-300">
                        <span>Envío</span>
                        <span className="font-mono">+{formatCurrency(numericShipping)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-2 border-t border-gray-800">
                      <span className="text-sm font-bold text-gray-200">
                        {saleMode === 'pagado' ? 'Total a Cobrar' : 'Total del Pedido'}
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
                        {formatCurrency(finalTotal)}
                      </span>
                    </div>

                    <div className="pt-2.5 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handlePreviewDraft}
                        disabled={cart.length === 0 || isSubmitting}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 text-xs font-bold border border-gray-700 transition-colors"
                        title="Previsualizar imagen del comprobante antes de guardar"
                      >
                        <Eye size={15} />
                        <span>Vista previa</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmitSale}
                        disabled={cart.length === 0 || isSubmitting}
                        className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                          saleMode === 'pagado'
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                            : saleMode === 'parcial'
                              ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-950/50'
                              : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <PackageCheck size={17} />
                            <span>
                              {saleMode === 'pagado'
                                ? 'Confirmar Pago y PNG'
                                : saleMode === 'parcial'
                                  ? 'Registrar Abono y PNG'
                                  : 'Crear Cobro y PNG'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: CONTROL DE TICKETS ==================== */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                {/* Filtros y Buscador */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                      placeholder="Buscar ticket, cliente, contacto o producto..."
                      className="w-full bg-gray-900 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {(
                      [
                        { id: 'all', label: 'Todos', count: ticketCounts.all },
                        { id: 'pendiente', label: 'Pendientes', count: ticketCounts.pendiente },
                        { id: 'parcial', label: 'Abonados', count: ticketCounts.parcial },
                        { id: 'pagado', label: 'Pagados', count: ticketCounts.pagado },
                        { id: 'anulado', label: 'Anulados', count: ticketCounts.anulado }
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          statusFilter === f.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                        }`}
                      >
                        {f.label} <span className="opacity-70 font-mono">({f.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Tickets */}
                {filteredSales.length > 0 ? (
                  <div className="space-y-3">
                    {filteredSales.map((sale) => {
                      const badge = STATUS_BADGE[sale.paymentStatus];
                      const balance = Math.max(0, sale.total - (sale.amountPaid || 0));
                      const isConfirmingPay = confirmingPayTicketId === sale.ticketId;
                      const isCancelling = cancellingTicketId === sale.ticketId;
                      const isBusy = processingTicketId === sale.ticketId;

                      return (
                        <div
                          key={sale.ticketId}
                          className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3"
                        >
                          {/* Fila Superior */}
                          <div className="flex flex-wrap items-start justify-between gap-2.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm text-white">
                                  {sale.ticketId}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {new Date(sale.createdAt).toLocaleDateString('es-CO', {
                                    month: 'short',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {sale.paymentStatus !== 'pagado' &&
                                  sale.paymentStatus !== 'anulado' &&
                                  sale.stockDeducted && (
                                    <span className="text-[10px] text-purple-300 bg-purple-950/70 border border-purple-500/30 px-1.5 py-0.5 rounded">
                                      Stock apartado
                                    </span>
                                  )}
                              </div>

                              <div className="text-xs text-gray-300 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="font-semibold text-white">
                                  {sale.customerName || 'Cliente General'}
                                </span>
                                {sale.customerContact && (
                                  <span className="text-gray-400">{sale.customerContact}</span>
                                )}
                                <span className="text-gray-400">· {sale.paymentMethod}</span>
                              </div>
                            </div>

                            <div className="text-right tabular-nums">
                              <span className="text-base font-extrabold font-mono text-emerald-400 block">
                                {formatCurrency(sale.total)}
                              </span>
                              {balance > 0 && sale.paymentStatus !== 'anulado' && (
                                <span className="text-[11px] font-mono text-amber-300 block">
                                  Saldo: {formatCurrency(balance)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Items resumidos */}
                          <div className="bg-gray-950/60 border border-gray-800/80 rounded-lg px-3 py-2 text-xs text-gray-300 space-y-1">
                            {(sale.items || []).map((item, i) => (
                              <div
                                key={`${sale.ticketId}-${item.variantId}-${i}`}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate">
                                  <strong className="text-purple-300 font-mono">
                                    {item.quantity}×
                                  </strong>{' '}
                                  {item.productTitle}{' '}
                                  <span className="text-gray-400">({item.variantName})</span>
                                </span>
                                <span className="font-mono text-gray-200 shrink-0 tabular-nums">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            ))}
                            {sale.shippingCost > 0 && (
                              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
                                <span>Envío</span>
                                <span className="font-mono">
                                  +{formatCurrency(sale.shippingCost)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Barra de Acciones + Selector de Entrega */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <Truck size={14} className="text-gray-400 shrink-0" />
                              <select
                                value={sale.deliveryStatus}
                                disabled={sale.paymentStatus === 'anulado' || isBusy}
                                onChange={(e) =>
                                  handleUpdateSaleDelivery(
                                    sale.ticketId,
                                    e.target.value as SaleDeliveryStatus
                                  )
                                }
                                className="bg-gray-800 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 text-gray-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                              >
                                {DELIVERY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() =>
                                  setReceiptModal({
                                    sale,
                                    mode: sale.paymentStatus === 'pagado' ? 'pago' : 'cobro'
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 text-xs font-bold transition-colors"
                              >
                                <ImageDown size={14} />
                                <span>Comprobante PNG</span>
                              </button>

                              {(sale.paymentStatus === 'pendiente' ||
                                sale.paymentStatus === 'parcial') && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    isConfirmingPay
                                      ? setConfirmingPayTicketId(null)
                                      : openConfirmPaymentInline(sale)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Confirmar Pago</span>
                                </button>
                              )}

                              {sale.paymentStatus !== 'anulado' && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setConfirmingPayTicketId(null);
                                    setCancellingTicketId(isCancelling ? null : sale.ticketId);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-red-950/60 text-gray-400 hover:text-red-300 border border-gray-700 hover:border-red-500/40 text-xs font-semibold transition-colors"
                                  title="Anular ticket"
                                >
                                  <Ban size={13} />
                                  <span>Anular</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Panel Inline para Confirmar Pago / Abono */}
                          {isConfirmingPay && (
                            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-end gap-2.5">
                              <div className="flex-1 min-w-[130px]">
                                <label className="block text-[11px] text-emerald-300 mb-1 font-semibold">
                                  Método de pago
                                </label>
                                <select
                                  value={confirmPayMethod}
                                  onChange={(e) =>
                                    setConfirmPayMethod(e.target.value as SalePaymentMethod)
                                  }
                                  className="w-full bg-gray-900 text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-white"
                                >
                                  {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="w-36">
                                <label className="block text-[11px] text-emerald-300 mb-1 font-semibold">
                                  Total pagado ($)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={sale.total}
                                  value={confirmPayAmount}
                                  onChange={(e) =>
                                    setConfirmPayAmount(
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )
                                  }
                                  className="w-full bg-gray-900 text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-white font-mono"
                                />
                              </div>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => submitConfirmPayment(sale)}
                                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                              >
                                {isBusy ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                <span>Guardar Pago</span>
                              </button>
                            </div>
                          )}

                          {/* Panel Inline para Confirmar Anulación */}
                          {isCancelling && (
                            <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                              <span className="text-red-200">
                                ¿Anular <strong>{sale.ticketId}</strong>?{' '}
                                {sale.stockDeducted
                                  ? 'El stock descontado volverá al inventario.'
                                  : 'El ticket quedará marcado como anulado.'}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCancellingTicketId(null)}
                                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 font-semibold"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => submitCancelTicket(sale.ticketId)}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold inline-flex items-center gap-1"
                                >
                                  <XCircle size={13} />
                                  <span>Sí, anular</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-14 text-center bg-gray-900/50 rounded-xl border border-gray-800 text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-300">
                      No hay tickets en esta vista.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Crea una nueva venta o cuenta de cobro desde la pestaña "Nueva Venta / Cobro".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 3: CAJA DE HOY ==================== */}
            {activeTab === 'today' && (
              <div className="space-y-5 tabular-nums">
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-gray-900/80 border border-emerald-500/30 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase block">
                      Cobrado Hoy
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1 block">
                      {formatCurrency(todayStats.collectedToday)}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Pagos y abonos del día
                    </span>
                  </div>

                  <div className="bg-gray-900/80 border border-purple-500/30 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase block">
                      Tickets Hoy
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1 block">
                      {todayStats.paidTicketsToday + todayStats.pendingTicketsToday}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      {todayStats.paidTicketsToday} pagados · {todayStats.pendingTicketsToday}{' '}
                      pendientes
                    </span>
                  </div>

                  <div className="bg-gray-900/80 border border-amber-500/30 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase block">
                      Por Cobrar (Total)
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-amber-300 mt-1 block">
                      {formatCurrency(todayStats.globalPendingBalance)}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      En {todayStats.pendingList.length} ticket(s) activos
                    </span>
                  </div>

                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase block">
                      Unidades Vendidas Hoy
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-purple-300 mt-1 block">
                      {todayStats.unitsSoldToday}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      En tickets pagados hoy
                    </span>
                  </div>
                </div>

                {/* Desglose por Método de Pago */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Ingresos de Hoy por Método de Pago
                    </h4>

                    {todayStats.methodBreakdown.length > 0 ? (
                      <div className="space-y-2.5">
                        {todayStats.methodBreakdown.map(([method, amount]) => {
                          const pct =
                            todayStats.collectedToday > 0
                              ? Math.round((amount / todayStats.collectedToday) * 100)
                              : 0;
                          return (
                            <div key={method} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-gray-200">{method}</span>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {formatCurrency(amount)}{' '}
                                  <span className="text-gray-500 font-normal">({pct}%)</span>
                                </span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 py-6 text-center">
                        Aún no se registran cobros hoy.
                      </p>
                    )}
                  </div>

                  {/* Pendientes por Cobrar */}
                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Cuentas Pendientes por Cobrar
                      </h4>
                      {todayStats.pendingList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('pendiente');
                            setActiveTab('tickets');
                          }}
                          className="text-[11px] text-purple-400 hover:underline font-semibold"
                        >
                          Gestionar todas
                        </button>
                      )}
                    </div>

                    {todayStats.pendingList.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {todayStats.pendingList.map((s) => {
                          const balance = Math.max(0, s.total - (s.amountPaid || 0));
                          return (
                            <div
                              key={s.ticketId}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">
                                  {s.customerName || 'Cliente General'}{' '}
                                  <span className="font-mono text-gray-400 font-normal">
                                    · {s.ticketId}
                                  </span>
                                </span>
                                <span className="text-[11px] text-amber-300 font-mono">
                                  Saldo: {formatCurrency(balance)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setReceiptModal({ sale: s, mode: 'cobro' })}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold shrink-0"
                              >
                                Cobro PNG
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 py-6 text-center">
                        ¡Todo al día! No tienes saldos pendientes por cobrar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Descarga / Vista Previa de Comprobante PNG */}
      {receiptModal && (
        <SaleReceiptModal
          isOpen={true}
          onClose={() => setReceiptModal(null)}
          sale={receiptModal.sale}
          defaultMode={receiptModal.mode}
        />
      )}
    </>
  );
};

export default QuickSaleModal;
