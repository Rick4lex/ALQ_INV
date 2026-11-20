/**
 * ============================================================================
 * ALQUIMA MIZU - BACKEND DE GOOGLE APPS SCRIPT CON AUTENTICACIÓN Y ROLES
 * ============================================================================
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN DE SEGURIDAD (Hacer esto una sola vez):
 * 1. En el editor de Apps Script, abre el menú lateral izquierdo y haz clic en 
 *    el engranaje "Configuración del proyecto" ⚙️.
 * 2. Baja hasta "Propiedades de la secuencia de comandos" y haz clic en "Añadir propiedad":
 *      - ADMIN_PIN    -> Tu PIN o contraseña de Administrador
 *      - SELLER_PIN   -> Tu PIN para Vendedores
 *      - TOKEN_SECRET -> Tu cadena secreta para firmar tokens
 * 3. Haz clic en "Guardar propiedades de la secuencia de comandos".
 * 4. Despliega como aplicación web: "Implementar" > "Nueva implementación" > 
 *    Tipo: Aplicación web > Quién tiene acceso: "Cualquier persona" (Anyone).
 */

/**
 * Endpoint POST principal
 */
function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action;

    // 1. AUTENTICACIÓN Y EMISIÓN DE TOKEN
    if (action === 'LOGIN') {
      return handleLogin(data);
    }

    // 2. ENVÍO DE COMPROBANTE DE VENTA POR CORREO
    if (action === 'SEND_SALE_RECEIPT') {
      return handleSendSaleReceipt(data);
    }

    // 3. GUARDADO / SINCRONIZACIÓN COMPLETA (Protegido por token si se desea)
    if (action === 'FULL_SYNC' || action === 'SAVE_DATA') {
      // Opcional: verificar token de administrador si se incluye
      if (data.token) {
        var authCheck = validateSessionToken(data.token, 'admin');
        if (!authCheck.valid) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: authCheck.message
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return handleFullSync(data);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Acción desconocida: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint GET principal (lectura de datos + hoja Ventas)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var values = sheet.getDataRange().getValues();
    var sales = readSalesSheet(ss);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: values,
      sales: sales
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Procesa la acción LOGIN y emite un token de sesión temporal firmado
 */
function handleLogin(payload) {
  var props = PropertiesService.getScriptProperties();
  var adminPin = props.getProperty('ADMIN_PIN');
  var sellerPin = props.getProperty('SELLER_PIN');
  var secret = props.getProperty('TOKEN_SECRET');

  if (!adminPin || !sellerPin || !secret) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Faltan propiedades de seguridad en el servidor de Apps Script.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var pin = String(payload.pin || '').trim();
  var authenticatedRole = null;

  if (pin === adminPin) {
    authenticatedRole = 'admin';
  } else if (pin === sellerPin) {
    authenticatedRole = 'vendedor';
  }

  if (!authenticatedRole) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'PIN o contraseña incorrecta.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Vigencia de 12 horas
  var expiresAt = new Date().getTime() + (12 * 60 * 60 * 1000);
  var rawData = authenticatedRole + '|' + expiresAt;
  var signature = Utilities.computeHmacSha256Signature(rawData, secret);
  var token = Utilities.base64Encode(rawData) + '.' + Utilities.base64Encode(signature);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    token: token,
    role: authenticatedRole,
    expiresAt: expiresAt,
    userEmail: authenticatedRole === 'admin' ? 'cfb.dig@gmail.com' : 'vendedor@alquima.local'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Valida un token de sesión
 */
function validateSessionToken(token, requiredRole) {
  if (!token) return { valid: false, message: 'Falta token de sesión.' };

  var parts = token.split('.');
  if (parts.length !== 2) return { valid: false, message: 'Token con formato inválido.' };

  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('TOKEN_SECRET');
  if (!secret) return { valid: false, message: 'Secreto de token no configurado.' };

  var rawData = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
  var dataParts = rawData.split('|');
  var role = dataParts[0];
  var expiresAt = parseInt(dataParts[1], 10);

  if (new Date().getTime() > expiresAt) {
    return { valid: false, message: 'La sesión ha expirado. Por favor ingresa tu PIN nuevamente.' };
  }

  var expectedSignature = Utilities.computeHmacSha256Signature(rawData, secret);
  if (Utilities.base64Encode(expectedSignature) !== parts[1]) {
    return { valid: false, message: 'Firma de seguridad no válida.' };
  }

  if (requiredRole && requiredRole === 'admin' && role !== 'admin') {
    return { valid: false, message: 'Permisos insuficientes. Se requiere rol de Administrador.' };
  }

  return { valid: true, role: role };
}

/**
 * Envío de comprobante de venta por correo (Legado)
 */
function handleSendSaleReceipt(payload) {
  var recipientEmail = payload.recipientEmail || 'cfb.dig@gmail.com';
  var saleData = payload.saleData || {};
  var ticketId = saleData.ticketId || ('TICK-' + new Date().getTime());

  var items = saleData.items;
  if (!items || !items.length) {
    items = [{
      title: saleData.title || saleData.productTitle || 'Producto / Transacción',
      variant: saleData.variant || saleData.variantName || 'Estándar',
      quantity: Math.abs(saleData.quantity || saleData.change || 1),
      subtotal: Math.abs(saleData.amount || saleData.total || 0)
    }];
  }

  var total = saleData.total || saleData.amount || 0;
  var itemsHtml = '';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    itemsHtml += '<tr>' +
      '<td style="padding: 8px; border-bottom: 1px solid #374151;">' + (item.title || '') + ' (' + (item.variant || '') + ')</td>' +
      '<td style="padding: 8px; border-bottom: 1px solid #374151; text-align: center;">' + (item.quantity || 1) + '</td>' +
      '<td style="padding: 8px; border-bottom: 1px solid #374151; text-align: right;">$' + Number(item.subtotal || total).toLocaleString('es-CO') + '</td>' +
    '</tr>';
  }

  var htmlBody = '<div style="font-family: sans-serif; background-color: #111827; color: #f3f4f6; padding: 24px; border-radius: 12px; max-width: 600px;">' +
    '<h2 style="color: #c084fc; margin-bottom: 4px;">Comprobante de Venta - Alquima Mizu</h2>' +
    '<p style="color: #9ca3af; font-size: 13px;">Ticket #' + ticketId + ' • Fecha: ' + new Date().toLocaleString('es-CO') + '</p>' +
    '<hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />' +
    '<table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e5e7eb;">' +
      '<thead><tr style="color: #9ca3af; text-align: left;"><th style="padding: 8px;">Producto</th><th style="padding: 8px; text-align: center;">Cant.</th><th style="padding: 8px; text-align: right;">Subtotal</th></tr></thead>' +
      '<tbody>' + itemsHtml + '</tbody>' +
    '</table>' +
    '<hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />' +
    '<div style="text-align: right; font-size: 15px;">' +
      (saleData.discountAmount ? '<p style="color: #fbbf24; margin: 4px 0;">Descuento: -$' + Number(saleData.discountAmount).toLocaleString('es-CO') + '</p>' : '') +
      '<p style="font-size: 18px; font-weight: bold; color: #34d399; margin: 6px 0;">TOTAL: $' + Number(total).toLocaleString('es-CO') + '</p>' +
    '</div>' +
  '</div>';

  MailApp.sendEmail({
    to: recipientEmail,
    subject: 'Comprobante de Venta #' + ticketId + ' - Alquima Mizu',
    htmlBody: htmlBody
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Comprobante enviado a ' + recipientEmail
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Columnas oficiales de la hoja "Ventas"
 */
var SALES_HEADERS = [
  'ticket_id',
  'fecha',
  'fecha_pago',
  'estado_pago',
  'estado_entrega',
  'cliente_nombre',
  'cliente_contacto',
  'metodo_pago',
  'subtotal',
  'descuento',
  'etiqueta_descuento',
  'costo_envio',
  'total',
  'monto_pagado',
  'stock_descontado',
  'vendedor',
  'notas',
  'items_json'
];

/**
 * Lee todos los tickets de la pestaña "Ventas" en Google Sheets
 */
function readSalesSheet(ss) {
  var sheet = ss.getSheetByName('Ventas');
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var headers = rows[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var sales = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }

    var ticketId = String(obj['ticket_id'] || '').trim();
    if (!ticketId) continue;

    var parsedItems = [];
    try {
      if (obj['items_json']) parsedItems = JSON.parse(String(obj['items_json']));
    } catch (e) {
      parsedItems = [];
    }

    var createdAtRaw = obj['fecha'];
    var createdAt = typeof createdAtRaw === 'number'
      ? createdAtRaw
      : (createdAtRaw instanceof Date ? createdAtRaw.getTime() : Date.parse(String(createdAtRaw)) || Date.now());

    var paidAtRaw = obj['fecha_pago'];
    var paidAt = paidAtRaw
      ? (typeof paidAtRaw === 'number' ? paidAtRaw : (paidAtRaw instanceof Date ? paidAtRaw.getTime() : Date.parse(String(paidAtRaw)) || undefined))
      : undefined;

    sales.push({
      ticketId: ticketId,
      createdAt: createdAt,
      paidAt: paidAt,
      paymentStatus: String(obj['estado_pago'] || 'pagado'),
      deliveryStatus: String(obj['estado_entrega'] || 'por_entregar'),
      customerName: String(obj['cliente_nombre'] || 'Cliente General'),
      customerContact: String(obj['cliente_contacto'] || ''),
      paymentMethod: String(obj['metodo_pago'] || 'Efectivo'),
      subtotal: Number(obj['subtotal']) || 0,
      discountAmount: Number(obj['descuento']) || 0,
      discountLabel: String(obj['etiqueta_descuento'] || ''),
      shippingCost: Number(obj['costo_envio']) || 0,
      total: Number(obj['total']) || 0,
      amountPaid: Number(obj['monto_pagado']) || 0,
      stockDeducted: String(obj['stock_descontado']).toLowerCase() === 'true' || obj['stock_descontado'] === true,
      soldBy: String(obj['vendedor'] || 'admin'),
      notes: String(obj['notas'] || ''),
      items: parsedItems
    });
  }

  return sales;
}

/**
 * Escribe la lista de tickets en la pestaña "Ventas" (la crea si no existe)
 */
function writeSalesSheet(ss, salesArray) {
  if (!Array.isArray(salesArray)) return;

  var sheet = ss.getSheetByName('Ventas');
  if (!sheet) {
    sheet = ss.insertSheet('Ventas');
  }

  var rows = [SALES_HEADERS];
  for (var i = 0; i < salesArray.length; i++) {
    var s = salesArray[i];
    if (!s || !s.ticketId) continue;
    rows.push([
      s.ticketId,
      s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      s.paidAt ? new Date(s.paidAt).toISOString() : '',
      s.paymentStatus || 'pendiente',
      s.deliveryStatus || 'por_entregar',
      s.customerName || 'Cliente General',
      s.customerContact || '',
      s.paymentMethod || 'Efectivo',
      Number(s.subtotal) || 0,
      Number(s.discountAmount) || 0,
      s.discountLabel || '',
      Number(s.shippingCost) || 0,
      Number(s.total) || 0,
      Number(s.amountPaid) || 0,
      Boolean(s.stockDeducted),
      s.soldBy || 'admin',
      s.notes || '',
      JSON.stringify(s.items || [])
    ]);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, SALES_HEADERS.length).setValues(rows);
  sheet.setFrozenRows(1);
}

/**
 * Procesamiento de sincronización completa (incluye pestaña Ventas)
 */
function handleFullSync(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var incomingSales = (payload.data && payload.data.sales) || payload.sales;
  if (Array.isArray(incomingSales)) {
    writeSalesSheet(ss, incomingSales);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Datos y hoja Ventas sincronizados exitosamente.'
  })).setMimeType(ContentService.MimeType.JSON);
}
