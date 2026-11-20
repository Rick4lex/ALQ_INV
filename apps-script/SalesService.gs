/**
 * ============================================================================
 * ARCHIVO 5: SalesService.gs - PANEL DE CONTROL DE VENTAS (TICKETS)
 * Proyecto: Alquima Mizu
 * ============================================================================
 */

/**
 * Crea o actualiza un ticket en la pestaña 'Ventas' sin sobrescribir toda la base de datos.
 * Soporta registro de abonos, cambio de estado_pago (incluyendo 'anulado'),
 * estado_entrega y control de stock_descontado con LockService.
 *
 * @param {Object} salePayload Objeto con los campos del ticket.
 * @param {string} authRole Rol autenticado ('admin' o 'vendedor').
 */
function handleUpsertSale(salePayload, authRole) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!salePayload || typeof salePayload !== 'object') {
      throw new Error('Datos de venta inválidos.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSalesSheet(ss);

    // Completar metadatos por defecto respetando tanto snake_case como camelCase
    const sale = Object.assign({}, salePayload);
    if (!sale.ticket_id && !sale.ticketId) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      sale.ticket_id = 'TICK-' + randomSuffix;
    } else {
      sale.ticket_id = String(sale.ticket_id || sale.ticketId).trim();
    }
    if (!sale.vendedor && !sale.soldBy && authRole) {
      sale.vendedor = authRole;
    }

    const rowValues = serializeSaleToRow(sale);
    const ticketId = rowValues[0];

    // Buscar si el ticket_id ya existe en la columna A
    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;

    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === ticketId) {
          existingRowIndex = i + 2;
          break;
        }
      }
    }

    let operation = 'created';
    if (existingRowIndex !== -1) {
      // Actualizar ticket existente (ej. registrar abono, confirmar pago, marcar entregado o anular)
      sheet.getRange(existingRowIndex, 1, 1, SALES_HEADERS.length).setValues([rowValues]);
      operation = 'updated';
    } else {
      // Crear nuevo ticket
      sheet.appendRow(rowValues);
    }

    SpreadsheetApp.flush();

    // Registrar en Logs de auditoría
    try {
      const logsSheet = ss.getSheetByName('Logs');
      if (logsSheet) {
        const estadoPago = rowValues[2];
        const total = rowValues[7];
        const montoPagado = rowValues[8];
        logsSheet.appendRow([
          'LOG-' + new Date().getTime(),
          new Date().getTime(),
          operation === 'created' ? 'SALE_CREATE' : 'SALE_UPDATE',
          `Ticket ${ticketId} (${estadoPago}) - Total: $${total} / Pagado: $${montoPagado} [${rowValues[14] || 'sistema'}]`
        ]);
      }
    } catch (logErr) {
      // No interrumpir flujo principal por fallo de log
    }

    return respondJson({
      status: 'success',
      operation: operation,
      ticket_id: ticketId,
      ticketId: ticketId,
      estado_pago: rowValues[2],
      paymentStatus: rowValues[2],
      saldo_pendiente: rowValues[2] === 'anulado' ? 0 : Math.max(0, Number(rowValues[7]) - Number(rowValues[8]))
    });

  } catch (error) {
    return respondJson({
      status: 'error',
      message: 'Error al guardar el ticket de venta: ' + error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}
