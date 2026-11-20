/**
 * ============================================================================
 * ARCHIVO 4: DbHelper.gs - UTILIDADES DE HOJAS Y GUARDADO FULL_SYNC
 * Proyecto: Alquima Mizu
 * ============================================================================
 */

const SALES_HEADERS = [
  'ticket_id',
  'fecha',
  'estado_pago',
  'cliente_nombre',
  'metodo_pago',
  'subtotal',
  'descuento',
  'total',
  'monto_pagado',
  'items_json',
  'stock_descontado',
  'costo_envio',
  'cliente_contacto',
  'estado_entrega',
  'vendedor',
  'notas'
];

const MOVEMENTS_HEADERS = [
  'id',
  'variantId',
  'timestamp',
  'type',
  'change',
  'newStock',
  'notes',
  'price',
  'cost',
  'ticketId',
  'originalPrice',
  'discount'
];

function sheetToObjects(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[String(header).trim()] = row[i];
    });
    return obj;
  });
}

function getOrCreateSalesSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME_SALES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_SALES);
    sheet.appendRow(SALES_HEADERS);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(SALES_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Convierte cualquier objeto de venta (camelCase o snake_case) a la fila exacta de 16 columnas.
 * Preserva explícitamente estado_pago ('anulado', 'pagado', 'parcial', 'pendiente'),
 * monto_pagado, stock_descontado, estado_entrega, fecha original y vendedor.
 */
function serializeSaleToRow(s) {
  const subtotal = Number(s.subtotal) || 0;
  const descuento = Number(s.descuento !== undefined ? s.descuento : (s.discountAmount || 0)) || 0;
  const costoEnvio = Number(s.costo_envio !== undefined ? s.costo_envio : (s.shippingCost || 0)) || 0;
  const total = Number(
    s.total !== undefined && s.total !== ''
      ? s.total
      : Math.max(0, subtotal - descuento + costoEnvio)
  ) || 0;

  const rawAmountPaid =
    s.monto_pagado !== undefined
      ? s.monto_pagado
      : (s.amountPaid !== undefined ? s.amountPaid : (s.paidAmount !== undefined ? s.paidAmount : 0));
  let montoPagado = Number(rawAmountPaid) || 0;

  // Leer estado_pago o paymentStatus ANTES de inferir por montos (crítico para no perder 'anulado')
  const rawEstado = s.estado_pago || s.paymentStatus || '';
  let estadoPago = String(rawEstado).trim().toLowerCase();
  if (!estadoPago) {
    if (montoPagado >= total && total > 0) estadoPago = 'pagado';
    else if (montoPagado > 0) estadoPago = 'parcial';
    else estadoPago = 'pendiente';
  }

  if (estadoPago === 'anulado') {
    montoPagado = 0;
  }

  const rawStockDeducted =
    s.stock_descontado !== undefined ? s.stock_descontado : s.stockDeducted;
  const stockDescontado =
    estadoPago === 'anulado'
      ? false
      : (rawStockDeducted === true || String(rawStockDeducted).trim().toLowerCase() === 'true');

  let fechaIso = '';
  if (s.fecha) {
    fechaIso = s.fecha instanceof Date ? s.fecha.toISOString() : String(s.fecha);
  } else if (s.createdAt) {
    fechaIso = new Date(Number(s.createdAt)).toISOString();
  } else if (s.date) {
    fechaIso = String(s.date);
  } else {
    fechaIso = new Date().toISOString();
  }

  let itemsJson = '[]';
  if (typeof s.items_json === 'string' && s.items_json.trim() !== '') {
    itemsJson = s.items_json.trim();
  } else if (Array.isArray(s.items)) {
    itemsJson = JSON.stringify(s.items);
  }

  const estadoEntrega = String(
    s.estado_entrega || s.deliveryStatus || 'por_entregar'
  ).trim().toLowerCase();

  const vendedor = String(
    s.vendedor || s.soldBy || s.seller || ''
  ).trim();

  return [
    String(s.ticket_id || s.ticketId || ('TICK-' + new Date().getTime())).trim(),
    fechaIso,
    estadoPago,
    String(s.cliente_nombre || s.customerName || 'Cliente General').trim(),
    String(s.metodo_pago || s.paymentMethod || 'Efectivo').trim(),
    subtotal,
    descuento,
    total,
    montoPagado,
    itemsJson,
    stockDescontado,
    costoEnvio,
    String(s.cliente_contacto || s.customerContact || '').trim(),
    estadoEntrega,
    vendedor,
    String(s.notas || s.notes || '').trim()
  ];
}

function overwriteDatabase(fullState) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let productsCount = 0;
    let salesCount = 0;
    let movementsCount = 0;

    // 1. Productos
    const sheetProd = ss.getSheetByName(SHEET_NAME_PRODUCTS);
    if (sheetProd && Array.isArray(fullState.products)) {
      if (sheetProd.getLastRow() > 1) {
        sheetProd.getRange(2, 1, sheetProd.getLastRow() - 1, sheetProd.getLastColumn()).clearContent();
      }
      const prodRows = fullState.products.map(p => [
        p.id,
        p.title,
        p.category,
        p.description || '',
        p.details || '',
        Array.isArray(p.imageUrls) ? p.imageUrls.join(' | ') : (p.imageUrls || ''),
        Array.isArray(p.imageHint) ? p.imageHint.join(' | ') : (p.imageHint || ''),
        p.available !== undefined ? Boolean(p.available) : (Array.isArray(p.variants) && p.variants.some(v => Number(v.stock) > 0))
      ]);
      if (prodRows.length > 0) {
        sheetProd.getRange(2, 1, prodRows.length, prodRows[0].length).setValues(prodRows);
      }
      productsCount = prodRows.length;
    }

    // 2. Variantes
    const sheetVar = ss.getSheetByName('Variantes');
    if (sheetVar && Array.isArray(fullState.products)) {
      if (sheetVar.getLastRow() > 1) {
        sheetVar.getRange(2, 1, sheetVar.getLastRow() - 1, sheetVar.getLastColumn()).clearContent();
      }
      const varRows = [];
      fullState.products.forEach(p => {
        if (p.variants && Array.isArray(p.variants)) {
          p.variants.forEach(v => {
            varRows.push([
              v.id,
              p.id,
              v.name,
              v.sku || '',
              v.price || 0,
              v.stock || 0,
              v.cost || 0,
              v.itemCount || 1,
              v.imageUrl || ''
            ]);
          });
        }
      });
      if (varRows.length > 0) {
        sheetVar.getRange(2, 1, varRows.length, varRows[0].length).setValues(varRows);
      }
    }

    // 3. Movimientos (preserva ticketId, originalPrice y discount para anulaciones entre dispositivos)
    const sheetMov = ss.getSheetByName('Movimientos');
    if (sheetMov && fullState.movements && typeof fullState.movements === 'object') {
      // Asegurar encabezados extendidos en fila 1 si aún tenía solo 9 columnas
      if (sheetMov.getLastColumn() < MOVEMENTS_HEADERS.length) {
        sheetMov.getRange(1, 1, 1, MOVEMENTS_HEADERS.length).setValues([MOVEMENTS_HEADERS]);
      }
      if (sheetMov.getLastRow() > 1) {
        sheetMov.getRange(2, 1, sheetMov.getLastRow() - 1, Math.max(sheetMov.getLastColumn(), MOVEMENTS_HEADERS.length)).clearContent();
      }
      const movRows = [];
      for (const variantId in fullState.movements) {
        if (Array.isArray(fullState.movements[variantId])) {
          fullState.movements[variantId].forEach(m => {
            movRows.push([
              m.id,
              variantId,
              m.timestamp,
              m.type,
              m.change,
              m.newStock,
              m.notes || '',
              m.price || 0,
              m.cost || 0,
              m.ticketId || '',
              m.originalPrice || 0,
              m.discount || 0
            ]);
          });
        }
      }
      if (movRows.length > 0) {
        sheetMov.getRange(2, 1, movRows.length, MOVEMENTS_HEADERS.length).setValues(movRows);
      }
      movementsCount = movRows.length;
    }

    // 4. Logs
    const sheetLog = ss.getSheetByName('Logs');
    if (sheetLog && Array.isArray(fullState.auditLog)) {
      if (sheetLog.getLastRow() > 1) {
        sheetLog.getRange(2, 1, sheetLog.getLastRow() - 1, sheetLog.getLastColumn()).clearContent();
      }
      const logRows = fullState.auditLog.map(l => [l.id, l.timestamp, l.type, l.message]);
      if (logRows.length > 0) {
        sheetLog.getRange(2, 1, logRows.length, logRows[0].length).setValues(logRows);
      }
    }

    // 5. Configuración (preserva claves existentes si no vienen en un payload parcial)
    const sheetConf = ss.getSheetByName('Configuracion');
    if (sheetConf && (fullState.categories || fullState.ignoredProductIds || fullState.preferences)) {
      const existingConf = {};
      sheetToObjects(ss, 'Configuracion').forEach(r => {
        if (r.Clave) existingConf[String(r.Clave)] = r.Valor;
      });

      if (fullState.categories !== undefined) {
        existingConf['categories'] = Array.isArray(fullState.categories)
          ? fullState.categories.join(', ')
          : String(fullState.categories || '');
      }
      if (fullState.ignoredProductIds !== undefined) {
        existingConf['ignoredProductIds'] = Array.isArray(fullState.ignoredProductIds)
          ? fullState.ignoredProductIds.join(', ')
          : String(fullState.ignoredProductIds || '');
      }
      if (fullState.preferences && typeof fullState.preferences === 'object') {
        for (const [key, value] of Object.entries(fullState.preferences)) {
          if (key === 'key') continue;
          existingConf[`preferences.${key}`] = value !== undefined && value !== null ? String(value) : '';
        }
      }

      if (sheetConf.getLastRow() > 1) {
        sheetConf.getRange(2, 1, sheetConf.getLastRow() - 1, Math.max(sheetConf.getLastColumn(), 2)).clearContent();
      }
      const confRows = Object.entries(existingConf).map(([k, v]) => [k, v]);
      if (confRows.length > 0) {
        sheetConf.getRange(2, 1, confRows.length, 2).setValues(confRows);
      }
    }

    // 6. Ventas (16 encabezados exactos; solo sobrescribe si el payload incluye el arreglo 'sales')
    if (Array.isArray(fullState.sales)) {
      const sheetSales = getOrCreateSalesSheet(ss);
      if (sheetSales.getLastRow() > 1) {
        sheetSales.getRange(2, 1, sheetSales.getLastRow() - 1, Math.max(sheetSales.getLastColumn(), SALES_HEADERS.length)).clearContent();
      }
      const salesRows = fullState.sales
        .filter(s => s && (s.ticket_id || s.ticketId))
        .map(s => serializeSaleToRow(s));
      if (salesRows.length > 0) {
        sheetSales.getRange(2, 1, salesRows.length, SALES_HEADERS.length).setValues(salesRows);
      }
      salesCount = salesRows.length;
    }

    SpreadsheetApp.flush();
    return { products: productsCount, sales: salesCount, movements: movementsCount };
  } finally {
    lock.releaseLock();
  }
}
