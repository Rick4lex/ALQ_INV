/**
 * ============================================================================
 * ARCHIVO 2: Auth.gs - AUTENTICACIÓN Y SEGURIDAD DE TOKENS (HMAC SHA-256)
 * Proyecto: Alquima Mizu
 *
 * IMPORTANTE: Configurar en Apps Script -> Configuración del proyecto ->
 * Propiedades de la secuencia de comandos:
 *   - ADMIN_PIN
 *   - SELLER_PIN
 *   - TOKEN_SECRET
 * ============================================================================
 */

function handleLogin(payload) {
  var props = PropertiesService.getScriptProperties();
  var adminPin = props.getProperty('ADMIN_PIN');
  var sellerPin = props.getProperty('SELLER_PIN');
  var secret = props.getProperty('TOKEN_SECRET');

  if (!adminPin || !sellerPin || !secret) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Faltan propiedades de seguridad (ADMIN_PIN, SELLER_PIN, TOKEN_SECRET) en Apps Script.'
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

  // Token válido por 12 horas
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

function validateSessionToken(token, requiredRole) {
  if (!token) return { valid: false, message: 'Falta token de sesión.' };
  var parts = token.split('.');
  if (parts.length !== 2) return { valid: false, message: 'Token con formato inválido.' };

  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('TOKEN_SECRET');
  if (!secret) {
    return { valid: false, message: 'Falta TOKEN_SECRET en las propiedades del proyecto.' };
  }

  var rawData = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
  var dataParts = rawData.split('|');
  var role = dataParts[0];
  var expiresAt = parseInt(dataParts[1], 10);

  if (new Date().getTime() > expiresAt) {
    return { valid: false, message: 'Sesión expirada. Vuelve a iniciar sesión.' };
  }

  var expectedSignature = Utilities.computeHmacSha256Signature(rawData, secret);
  if (Utilities.base64Encode(expectedSignature) !== parts[1]) {
    return { valid: false, message: 'Firma de seguridad no válida.' };
  }

  if (requiredRole && requiredRole === 'admin' && role !== 'admin') {
    return { valid: false, message: 'Permisos insuficientes. Requiere Administrador.' };
  }

  return { valid: true, role: role };
}
