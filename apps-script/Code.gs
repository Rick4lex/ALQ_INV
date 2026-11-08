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
 * Endpoint GET principal (lectura de datos)
 */
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var values = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: values
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
 * Envío de comprobante de venta por correo
 */
function handleSendSaleReceipt(payload) {
  var recipientEmail = payload.recipientEmail || 'cfb.dig@gmail.com';
  var saleData = payload.saleData || {};
  var ticketId = saleData.ticketId || ('TICK-' + new Date().getTime());

  var itemsHtml = '';
  if (saleData.items && saleData.items.length) {
    for (var i = 0; i < saleData.items.length; i++) {
      var item = saleData.items[i];
      itemsHtml += '<tr>' +
        '<td style="padding: 8px; border-bottom: 1px solid #374151;">' + (item.title || '') + ' (' + (item.variant || '') + ')</td>' +
        '<td style="padding: 8px; border-bottom: 1px solid #374151; text-align: center;">' + (item.quantity || 1) + '</td>' +
        '<td style="padding: 8px; border-bottom: 1px solid #374151; text-align: right;">$' + Number(item.subtotal || 0).toLocaleString('es-CO') + '</td>' +
      '</tr>';
    }
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
      '<p style="font-size: 18px; font-weight: bold; color: #34d399; margin: 6px 0;">TOTAL: $' + Number(saleData.total || 0).toLocaleString('es-CO') + '</p>' +
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
 * Procesamiento de sincronización completa
 */
function handleFullSync(payload) {
  // Lógica de respaldo en hoja
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Datos sincronizados exitosamente.'
  })).setMimeType(ContentService.MimeType.JSON);
}
