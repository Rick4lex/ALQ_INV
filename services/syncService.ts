import {
  SaleRecord,
  SalePaymentStatus,
  SaleDeliveryStatus,
  SalePaymentMethod,
  SaleTicketItem,
  UserRole
} from '../types';

// REEMPLAZA ESTO CON LA URL QUE TE DIO GOOGLE APPS SCRIPT AL IMPLEMENTAR:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzlF0Zecyxbh3iK01gW00-NGOYCfXhBAjaxz39wg8lIfg8SEETOLz0JNO9k2ThJrOFvRQ/exec';

const VALID_PAYMENT_STATUSES: SalePaymentStatus[] = ['pendiente', 'parcial', 'pagado', 'anulado'];
const VALID_DELIVERY_STATUSES: SaleDeliveryStatus[] = ['por_entregar', 'enviado', 'entregado'];
const VALID_PAYMENT_METHODS: SalePaymentMethod[] = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta', 'Otro'];

const parseTimestamp = (value: unknown, fallback?: number): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const asNum = Number(trimmed);
      if (Number.isFinite(asNum) && asNum > 0) return asNum;
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'sí' || normalized === 'si';
  }
  return false;
};

const normalizePaymentStatus = (rawStatus: unknown, amountPaid: number, total: number): SalePaymentStatus => {
  const s = String(rawStatus ?? '').trim().toLowerCase();
  if (VALID_PAYMENT_STATUSES.includes(s as SalePaymentStatus)) {
    return s as SalePaymentStatus;
  }
  if (s === 'cancelado' || s === 'anulada' || s === 'cancelada') return 'anulado';
  if (s === 'abonado') return 'parcial';
  if (total > 0 && amountPaid >= total) return 'pagado';
  if (amountPaid > 0) return 'parcial';
  return 'pendiente';
};

const normalizeDeliveryStatus = (rawDelivery: unknown): SaleDeliveryStatus => {
  const s = String(rawDelivery ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (VALID_DELIVERY_STATUSES.includes(s as SaleDeliveryStatus)) {
    return s as SaleDeliveryStatus;
  }
  if (s.includes('entregado')) return 'entregado';
  if (s.includes('enviado')) return 'enviado';
  return 'por_entregar';
};

const normalizePaymentMethod = (rawMethod: unknown): SalePaymentMethod => {
  const s = String(rawMethod ?? '').trim();
  const exact = VALID_PAYMENT_METHODS.find(m => m.toLowerCase() === s.toLowerCase());
  return exact || 'Efectivo';
};

const normalizeSaleItems = (rawItems: unknown, rawItemsJson: unknown): SaleTicketItem[] => {
  let parsed: any[] = [];
  if (Array.isArray(rawItems)) {
    parsed = rawItems;
  } else if (typeof rawItemsJson === 'string' && rawItemsJson.trim()) {
    try {
      const jsonParsed = JSON.parse(rawItemsJson.trim());
      if (Array.isArray(jsonParsed)) parsed = jsonParsed;
    } catch {
      parsed = [];
    }
  } else if (typeof rawItems === 'string' && rawItems.trim()) {
    try {
      const jsonParsed = JSON.parse(rawItems.trim());
      if (Array.isArray(jsonParsed)) parsed = jsonParsed;
    } catch {
      parsed = [];
    }
  }

  return parsed
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const quantity = Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);
      const originalPrice = Number(item.originalPrice ?? item.unitPrice ?? item.price ?? 0) || 0;
      const unitPrice = Number(item.unitPrice ?? item.price ?? originalPrice) || 0;
      const discount = Number(item.discount ?? Math.max(0, originalPrice - unitPrice)) || 0;
      const subtotal = Number(item.subtotal ?? (quantity * unitPrice)) || 0;
      return {
        productId: String(item.productId ?? ''),
        variantId: String(item.variantId ?? ''),
        productTitle: String(item.productTitle ?? item.title ?? 'Producto'),
        variantName: String(item.variantName ?? item.variant ?? 'Estándar'),
        sku: item.sku ? String(item.sku) : undefined,
        series: item.series ? String(item.series) : undefined,
        quantity,
        originalPrice,
        unitPrice,
        discount,
        subtotal
      };
    });
};

/**
 * Normaliza un ticket recibido desde Google Sheets (acepta tanto snake_case de los 16
 * encabezados oficiales como camelCase) al tipo interno SaleRecord.
 */
export const normalizeRemoteSale = (raw: any, localFallback?: SaleRecord): SaleRecord | null => {
  if (!raw || typeof raw !== 'object') return null;

  const ticketId = String(raw.ticketId ?? raw.ticket_id ?? '').trim();
  if (!ticketId) return null;

  const subtotal = Number(raw.subtotal ?? 0) || 0;
  const discountAmount = Number(raw.discountAmount ?? raw.descuento ?? 0) || 0;
  const shippingCost = Number(raw.shippingCost ?? raw.costo_envio ?? 0) || 0;
  const total = Number(
    raw.total !== undefined && raw.total !== ''
      ? raw.total
      : Math.max(0, subtotal - discountAmount + shippingCost)
  ) || 0;
  const amountPaid = Number(raw.amountPaid ?? raw.monto_pagado ?? raw.paidAmount ?? 0) || 0;

  const paymentStatus = normalizePaymentStatus(
    raw.paymentStatus ?? raw.estado_pago,
    amountPaid,
    total
  );
  const deliveryStatus = normalizeDeliveryStatus(raw.deliveryStatus ?? raw.estado_entrega);
  const paymentMethod = normalizePaymentMethod(raw.paymentMethod ?? raw.metodo_pago);

  const createdAt = parseTimestamp(raw.createdAt ?? raw.fecha ?? raw.date, localFallback?.createdAt ?? Date.now())!;
  const paidAt = parseTimestamp(raw.paidAt ?? raw.fecha_pago, localFallback?.paidAt);

  const rawStockDeducted =
    raw.stockDeducted !== undefined ? raw.stockDeducted : raw.stock_descontado;
  const stockDeducted =
    paymentStatus === 'anulado'
      ? false
      : parseBoolean(rawStockDeducted);

  const items = normalizeSaleItems(raw.items, raw.items_json);
  const rawRole = String(raw.soldBy ?? raw.vendedor ?? raw.seller ?? '').trim().toLowerCase();
  const soldBy: UserRole | undefined =
    rawRole === 'admin' || rawRole === 'vendedor'
      ? (rawRole as UserRole)
      : localFallback?.soldBy;

  const customerName = String(raw.customerName ?? raw.cliente_nombre ?? '').trim() || 'Cliente General';
  const customerContact = String(raw.customerContact ?? raw.cliente_contacto ?? '').trim();
  const customerEmail = String(raw.customerEmail ?? raw.cliente_correo ?? localFallback?.customerEmail ?? '').trim();
  const discountLabel = String(raw.discountLabel ?? raw.etiqueta_descuento ?? localFallback?.discountLabel ?? '').trim();
  const notes = String(raw.notes ?? raw.notas ?? '').trim();

  const rawCashReceived = raw.cashReceived ?? raw.efectivo_recibido ?? localFallback?.cashReceived;
  const cashReceived =
    rawCashReceived !== undefined && rawCashReceived !== '' && Number.isFinite(Number(rawCashReceived))
      ? Number(rawCashReceived)
      : undefined;

  return {
    ticketId,
    createdAt,
    paidAt: paymentStatus === 'pagado' ? (paidAt ?? localFallback?.paidAt) : undefined,
    paymentStatus,
    deliveryStatus,
    customerName,
    customerContact: customerContact || undefined,
    customerEmail: customerEmail || undefined,
    paymentMethod,
    subtotal,
    discountAmount,
    discountLabel: discountLabel || undefined,
    shippingCost,
    total,
    amountPaid: paymentStatus === 'anulado' ? 0 : amountPaid,
    cashReceived,
    stockDeducted,
    items,
    soldBy,
    notes: notes || undefined
  };
};

/**
 * Serializa un SaleRecord con las 16 columnas exactas en snake_case de la pestaña 'Ventas'
 * junto con sus equivalentes camelCase para garantizar 100% compatibilidad con Apps Script.
 */
export const serializeSaleForSheets = (sale: SaleRecord) => {
  const fechaIso = sale.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString();
  const itemsJson = JSON.stringify(sale.items || []);
  const amountPaid = sale.paymentStatus === 'anulado' ? 0 : (Number(sale.amountPaid) || 0);
  const stockDeducted = sale.paymentStatus === 'anulado' ? false : Boolean(sale.stockDeducted);

  return {
    // 16 encabezados exactos de la hoja "Ventas"
    ticket_id: sale.ticketId,
    fecha: fechaIso,
    estado_pago: sale.paymentStatus,
    cliente_nombre: sale.customerName || 'Cliente General',
    metodo_pago: sale.paymentMethod || 'Efectivo',
    subtotal: Number(sale.subtotal) || 0,
    descuento: Number(sale.discountAmount) || 0,
    total: Number(sale.total) || 0,
    monto_pagado: amountPaid,
    items_json: itemsJson,
    stock_descontado: stockDeducted,
    costo_envio: Number(sale.shippingCost) || 0,
    cliente_contacto: sale.customerContact || '',
    estado_entrega: sale.deliveryStatus || 'por_entregar',
    vendedor: sale.soldBy || '',
    notas: sale.notes || '',

    // Alias camelCase para compatibilidad completa
    ticketId: sale.ticketId,
    createdAt: sale.createdAt,
    paidAt: sale.paidAt,
    paymentStatus: sale.paymentStatus,
    deliveryStatus: sale.deliveryStatus || 'por_entregar',
    customerName: sale.customerName || 'Cliente General',
    customerContact: sale.customerContact || '',
    customerEmail: sale.customerEmail || '',
    paymentMethod: sale.paymentMethod || 'Efectivo',
    discountAmount: Number(sale.discountAmount) || 0,
    discountLabel: sale.discountLabel || '',
    shippingCost: Number(sale.shippingCost) || 0,
    amountPaid,
    paidAmount: amountPaid,
    cashReceived: sale.cashReceived,
    stockDeducted,
    soldBy: sale.soldBy || '',
    notes: sale.notes || '',
    items: sale.items || []
  };
};

export const syncService = {
  normalizeRemoteSale,
  serializeSaleForSheets,

  // PULL: Traer datos de Sheets a la Web (sin caché del navegador)
  async fetchRemoteData() {
    try {
      const cacheBuster = `${SCRIPT_URL.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      const response = await fetch(`${SCRIPT_URL}${cacheBuster}`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Error HTTP: ' + response.status);
      const data = await response.json();
      if (data && data.status === 'error') {
        throw new Error(data.message || data.error || 'Error leyendo base de datos remota');
      }
      return data;
    } catch (error) {
      console.error('Error obteniendo datos remotos:', error);
      throw error;
    }
  },

  // UPSERT_SALE: Guardar o actualizar un ticket individual de forma atómica (Admin y Vendedor)
  async upsertSale(sale: SaleRecord, token?: string) {
    try {
      const serialized = serializeSaleForSheets(sale);
      const payload = {
        action: 'UPSERT_SALE',
        token,
        sale: serialized,
        timestamp: Date.now()
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = { status: 'success' };
      }

      if (result && result.status && result.status !== 'success' && result.status !== 'ok') {
        throw new Error(result.error || result.message || 'Error guardando ticket en Sheets');
      }
      return result;
    } catch (error) {
      console.error('Error en UPSERT_SALE:', error);
      throw error;
    }
  },

  // PUSH: Enviar datos locales hacia Sheets
  async pushRemoteData(fullState: any, token?: string) {
    try {
      const preparedState =
        typeof fullState === 'object' && fullState !== null
          ? {
              ...fullState,
              sales: Array.isArray(fullState.sales)
                ? fullState.sales.map((s: SaleRecord) => serializeSaleForSheets(s))
                : fullState.sales
            }
          : fullState;

      // Usamos text/plain para evadir el OPTIONS preflight error (CORS en Apps Script)
      const payload = {
        action: 'FULL_SYNC',
        token,
        data: preparedState,
        // Compatibilidad: también incluir propiedades de nivel superior
        ...(typeof preparedState === 'object' && preparedState !== null ? preparedState : {})
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = { status: 'success' };
      }

      if (result && result.status && result.status !== 'success' && result.status !== 'ok') {
        throw new Error(result.error || result.message || 'Error desconocido de sincronización');
      }
      return true;
    } catch (error) {
      console.error('Error enviando datos remotos a Google Sheets:', error);
      throw error;
    }
  },

  // AUTH: Validar credenciales y obtener token de sesión firmado desde Apps Script
  async login(pin: string, requestedRole?: 'admin' | 'vendedor') {
    const cleanPin = pin.trim();
    try {
      const payload = {
        action: 'LOGIN',
        pin: cleanPin,
        role: requestedRole,
        timestamp: Date.now()
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result && typeof result === 'object' && typeof result.success === 'boolean') {
        return result;
      }
      return {
        success: false,
        message: 'Respuesta inesperada del servidor de autenticación.'
      };
    } catch (error) {
      console.warn('Conexión con Apps Script no disponible:', error);
      return {
        success: false,
        message: 'No fue posible conectar con el servidor de autenticación. Verifica tu conexión a internet.'
      };
    }
  },

  // EMAIL: Enviar comprobante de venta por correo vía Google Apps Script
  async sendSaleReceipt(saleData: any, recipientEmail?: string, token?: string) {
    try {
      const payload = {
        action: 'SEND_SALE_RECEIPT',
        token,
        recipientEmail: recipientEmail || 'cfb.dig@gmail.com',
        saleData,
        timestamp: Date.now()
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = { status: 'success' };
      }
      return result;
    } catch (error) {
      console.warn('Fallo enviando comprobante por correo vía Apps Script:', error);
      throw error;
    }
  }
};
