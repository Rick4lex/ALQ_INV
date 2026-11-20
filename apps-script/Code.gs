/**
 * ============================================================================
 * ARCHIVO 1: Code.gs - ROUTER PRINCIPAL
 * Proyecto: Alquima Mizu (Base de Datos, POS & Panel de Ventas)
 * ============================================================================
 */

const SHEET_NAME_PRODUCTS = 'Productos';
const SHEET_NAME_SALES = 'Ventas';

/**
 * Endpoint HTTP GET: Entrega la base de datos completa serializada en JSON (incluye sales).
 */
function doGet(e) {
  try {
    const data = getCompleteDatabase();
    return respondJson({ status: 'success', ...data });
  } catch (error) {
    return respondJson({ status: 'error', message: error.toString() });
  }
}

/**
 * Endpoint HTTP POST: Router central para acciones del cliente / POS.
 * Recibe Content-Type: text/plain para evitar preflight CORS.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No se recibieron datos en el cuerpo del POST.');
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // 1. LOGIN (Público / Validación por PIN)
    if (action === 'LOGIN') {
      return handleLogin(payload);
    }

    // 2. CREAR O ACTUALIZAR TICKET DE VENTA (Permite admin y vendedor)
    if (action === 'UPSERT_SALE' || action === 'CREATE_SALE' || action === 'UPDATE_SALE') {
      var saleAuth = validateSessionToken(payload.token);
      if (!saleAuth.valid) {
        return respondJson({ status: 'error', message: saleAuth.message });
      }
      return handleUpsertSale(payload.sale || payload.saleData || payload.data, saleAuth.role);
    }

    // 3. ENVIAR COMPROBANTE DE VENTA (Permite admin y vendedor)
    if (action === 'SEND_SALE_RECEIPT') {
      var emailAuth = validateSessionToken(payload.token);
      if (!emailAuth.valid) {
        return respondJson({ status: 'error', message: emailAuth.message });
      }
      return handleSendSaleReceipt(payload);
    }

    // 4. GUARDADO Y SINCRONIZACIÓN COMPLETA (Permite sesiones válidas de admin y vendedor
    //    para que ventas, pagos, entregas y anulaciones actualicen stock y movimientos en todos los dispositivos)
    if (action === 'FULL_SYNC' || action === 'SAVE_DATA') {
      var syncAuth = validateSessionToken(payload.token);
      if (!syncAuth.valid) {
        return respondJson({ status: 'error', message: syncAuth.message });
      }

      const rawData = payload.data || payload;
      const summary = overwriteDatabase(rawData);

      return respondJson({
        status: 'success',
        updated: summary.products,
        salesUpdated: summary.sales,
        movementsUpdated: summary.movements
      });
    }

    return respondJson({ status: 'error', message: 'Acción no reconocida: ' + action });

  } catch (error) {
    return respondJson({ status: 'error', message: error.toString() });
  }
}

/**
 * Helper estándar para generar respuestas HTTP en formato JSON.
 */
function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
