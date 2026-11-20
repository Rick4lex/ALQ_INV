/**
 * ============================================================================
 * ARCHIVO 3: API_Get.gs - LECTURA Y SERIALIZACIÓN DE LA BASE DE DATOS
 * Proyecto: Alquima Mizu
 * ============================================================================
 */

function getCompleteDatabase() {
  const db = {
    products: [],
    preferences: {},
    ignoredProductIds: [],
    categories: [],
    movements: {},
    auditLog: [],
    sales: []
  };
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Configuración
  const configData = sheetToObjects(ss, 'Configuracion');
  configData.forEach(row => {
    if (row.Clave === 'categories') {
      db.categories = row.Valor ? String(row.Valor).split(',').map(s => s.trim()).filter(Boolean) : [];
    } else if (row.Clave === 'ignoredProductIds') {
      db.ignoredProductIds = row.Valor ? String(row.Valor).split(',').map(s => s.trim()).filter(Boolean) : [];
    } else if (row.Clave && String(row.Clave).startsWith('preferences.')) {
      const key = String(row.Clave).replace('preferences.', '');
      db.preferences[key] = row.Valor === 'true' ? true : (row.Valor === 'false' ? false : row.Valor);
    }
  });

  // 2. Variantes
  const variantesData = sheetToObjects(ss, 'Variantes');

  // 3. Productos (separador '|' en imageUrls e imageHint)
  const productosData = sheetToObjects(ss, SHEET_NAME_PRODUCTS);
  db.products = productosData.map(p => {
    if (!p.id && !p.title) return null;

    return {
      id: p.id,
      title: p.title,
      category: p.category || 'general',
      description: p.description || '',
      details: p.details || '',
      imageUrls: p.imageUrls ? String(p.imageUrls).split('|').map(s => s.trim()).filter(Boolean) : [],
      imageHint: p.imageHint ? String(p.imageHint).split('|').map(s => s.trim()).filter(Boolean) : [],
      available: String(p.available).toLowerCase() === 'true',
      variants: variantesData.filter(v => String(v.productId) === String(p.id)).map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
        cost: Number(v.cost) || 0,
        itemCount: Number(v.itemCount) || 1,
        imageUrl: v.imageUrl ? String(v.imageUrl).trim() : ''
      }))
    };
  }).filter(Boolean);

  // 4. Movimientos (Kardex de stock + soporte de ticketId, originalPrice y discount)
  const movsData = sheetToObjects(ss, 'Movimientos');
  movsData.forEach(m => {
    if (!m.id && !m.variantId) return;
    if (!db.movements[m.variantId]) db.movements[m.variantId] = [];
    const movObj = {
      id: m.id,
      timestamp: Number(m.timestamp),
      type: m.type,
      change: Number(m.change),
      newStock: Number(m.newStock),
      notes: m.notes || '',
      price: Number(m.price) || 0,
      cost: Number(m.cost) || 0,
      variantId: m.variantId
    };
    if (m.ticketId) movObj.ticketId = String(m.ticketId).trim();
    if (m.originalPrice !== undefined && m.originalPrice !== '') movObj.originalPrice = Number(m.originalPrice) || 0;
    if (m.discount !== undefined && m.discount !== '') movObj.discount = Number(m.discount) || 0;
    db.movements[m.variantId].push(movObj);
  });

  // 5. Logs
  db.auditLog = sheetToObjects(ss, 'Logs')
    .filter(l => l.id || l.message)
    .map(l => ({
      id: l.id,
      timestamp: Number(l.timestamp),
      type: l.type,
      message: l.message
    }));

  // 6. Ventas (16 encabezados exactos + alias camelCase para sincronización perfecta en todos los dispositivos)
  const salesData = sheetToObjects(ss, SHEET_NAME_SALES);
  db.sales = salesData.map(s => {
    const ticketId = String(s.ticket_id || '').trim();
    if (!ticketId && !s.cliente_nombre) return null;

    const subtotal = Number(s.subtotal) || 0;
    const descuento = Number(s.descuento) || 0;
    const costoEnvio = Number(s.costo_envio) || 0;
    const total = s.total !== '' && s.total !== undefined
      ? Number(s.total) || 0
      : Math.max(0, subtotal - descuento + costoEnvio);
    const estadoPago = String(s.estado_pago || 'pendiente').trim().toLowerCase();
    const montoPagado = estadoPago === 'anulado' ? 0 : (Number(s.monto_pagado) || 0);
    const stockDescontado = estadoPago === 'anulado'
      ? false
      : (s.stock_descontado === true || String(s.stock_descontado).trim().toLowerCase() === 'true');

    let parsedItems = [];
    const itemsJsonRaw = s.items_json ? String(s.items_json).trim() : '';
    if (itemsJsonRaw) {
      try {
        const parsed = JSON.parse(itemsJsonRaw);
        if (Array.isArray(parsed)) parsedItems = parsed;
      } catch (err) {
        parsedItems = [];
      }
    }

    let fechaVal = '';
    let createdAtMs = new Date().getTime();
    if (s.fecha instanceof Date && !isNaN(s.fecha.getTime())) {
      fechaVal = s.fecha.toISOString();
      createdAtMs = s.fecha.getTime();
    } else if (typeof s.fecha === 'number' && !isNaN(s.fecha)) {
      createdAtMs = s.fecha;
      fechaVal = new Date(s.fecha).toISOString();
    } else if (s.fecha) {
      fechaVal = String(s.fecha).trim();
      const parsedDate = Date.parse(fechaVal);
      if (!isNaN(parsedDate)) createdAtMs = parsedDate;
    }

    const clienteNombre = String(s.cliente_nombre || 'Cliente General').trim();
    const metodoPago = String(s.metodo_pago || 'Efectivo').trim();
    const clienteContacto = String(s.cliente_contacto || '').trim();
    const estadoEntrega = String(s.estado_entrega || 'por_entregar').trim().toLowerCase();
    const vendedor = String(s.vendedor || '').trim();
    const notas = String(s.notas || '').trim();

    return {
      // 16 encabezados exactos (snake_case)
      ticket_id: ticketId,
      fecha: fechaVal,
      estado_pago: estadoPago,
      cliente_nombre: clienteNombre,
      metodo_pago: metodoPago,
      subtotal: subtotal,
      descuento: descuento,
      total: total,
      monto_pagado: montoPagado,
      saldo_pendiente: estadoPago === 'anulado' ? 0 : Math.max(0, total - montoPagado),
      items: parsedItems,
      items_json: itemsJsonRaw,
      stock_descontado: stockDescontado,
      costo_envio: costoEnvio,
      cliente_contacto: clienteContacto,
      estado_entrega: estadoEntrega,
      vendedor: vendedor,
      notas: notas,

      // Alias camelCase directos para la App React
      ticketId: ticketId,
      createdAt: createdAtMs,
      paymentStatus: estadoPago,
      customerName: clienteNombre,
      paymentMethod: metodoPago,
      discountAmount: descuento,
      amountPaid: montoPagado,
      stockDeducted: stockDescontado,
      shippingCost: costoEnvio,
      customerContact: clienteContacto,
      deliveryStatus: estadoEntrega,
      soldBy: vendedor,
      notes: notas
    };
  }).filter(Boolean);

  return db;
}
