/**
 * ============================================================================
 * ARCHIVO 6: EmailServices.gs - SERVICIOS DE CORREO Y COMPROBANTES
 * Proyecto: Alquima Mizu
 * ============================================================================
 */

function handleSendSaleReceipt(payload) {
  try {
    const saleData = payload.saleData || payload.sale || payload.data || payload;
    const recipientEmail = (
      payload.recipientEmail ||
      saleData.recipientEmail ||
      saleData.customerEmail ||
      saleData.email ||
      saleData.clientEmail ||
      'cfb.dig@gmail.com'
    ).trim();

    const ticketId = saleData.ticket_id || saleData.ticketId || saleData.saleId || ('TICK-' + new Date().getTime());
    const customerName = saleData.cliente_nombre || saleData.customerName || 'Cliente';
    const paymentMethod = saleData.metodo_pago || saleData.paymentMethod || 'Efectivo';
    const estadoPago = String(saleData.estado_pago || saleData.paymentStatus || 'pagado').toLowerCase();
    const saleDate = saleData.fecha || saleData.date || Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm');
    const notes = saleData.notas || saleData.notes || '';

    // Soportar items como arreglo, como items_json serializado o como movimiento plano
    let items = saleData.items;
    if ((!items || !items.length) && saleData.items_json) {
      try {
        const parsed = typeof saleData.items_json === 'string' ? JSON.parse(saleData.items_json) : saleData.items_json;
        if (Array.isArray(parsed)) items = parsed;
      } catch (e) {
        items = [];
      }
    }
    if (!items || !items.length) {
      items = [{
        title: saleData.title || saleData.productTitle || 'Producto / Transacción',
        variant: saleData.variant || saleData.variantName || 'Estándar',
        quantity: Math.abs(saleData.quantity || saleData.change || 1),
        subtotal: Math.abs(saleData.amount || saleData.total || 0)
      }];
    }

    const descuento = Number(saleData.descuento !== undefined ? saleData.descuento : (saleData.discountAmount || 0)) || 0;
    const costoEnvio = Number(saleData.costo_envio !== undefined ? saleData.costo_envio : (saleData.shippingCost || 0)) || 0;
    const total = Number(saleData.total !== undefined ? saleData.total : (saleData.amount || 0)) || 0;
    const rawMontoPagado =
      saleData.monto_pagado !== undefined
        ? saleData.monto_pagado
        : (saleData.amountPaid !== undefined ? saleData.amountPaid : total);
    const montoPagado = estadoPago === 'anulado' ? 0 : (Number(rawMontoPagado) || 0);
    const saldoPendiente = estadoPago === 'anulado' ? 0 : Math.max(0, total - montoPagado);

    const formatCOP = function(val) {
      return '$' + Number(val || 0).toLocaleString('es-CO');
    };

    let itemsHtml = '';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.title || item.name || item.productTitle || 'Artículo';
      const variant = item.variant || item.variantName || '';
      const qty = Number(item.quantity || item.qty || 1);
      const subtotalItem = Number(item.subtotal !== undefined ? item.subtotal : (qty * Number(item.price || item.unitPrice || 0) || total));

      itemsHtml += '<tr>' +
        '<td style="padding: 8px; border-bottom: 1px solid #374151;">' + title + (variant ? ' (' + variant + ')' : '') + '</td>' +
        '<td style="padding: 8px; border-bottom: 1px solid #374151; text-align: center;">' + qty + '</td>' +
        '<td style="padding: 8px; border-bottom: 1px solid #374151; text-align: right;">' + formatCOP(subtotalItem) + '</td>' +
      '</tr>';
    }

    const htmlBody = '<div style="font-family: sans-serif; background-color: #111827; color: #f3f4f6; padding: 24px; border-radius: 12px; max-width: 600px;">' +
      '<h2 style="color: #c084fc; margin-bottom: 4px;">Comprobante de Venta - Alquima 水</h2>' +
      '<p style="color: #9ca3af; font-size: 13px; margin-top: 0;">Ticket #' + ticketId + ' • Fecha: ' + saleDate + '</p>' +
      '<p style="color: #d1d5db; font-size: 13px; margin: 8px 0;">Cliente: <strong>' + customerName + '</strong> • Pago: <strong>' + paymentMethod + '</strong> • Estado: <strong style="text-transform: uppercase;">' + estadoPago + '</strong></p>' +
      '<hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />' +
      '<table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e5e7eb;">' +
        '<thead><tr style="color: #9ca3af; text-align: left;"><th style="padding: 8px;">Producto</th><th style="padding: 8px; text-align: center;">Cant.</th><th style="padding: 8px; text-align: right;">Subtotal</th></tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
      '</table>' +
      '<hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;" />' +
      '<div style="text-align: right; font-size: 14px;">' +
        (descuento > 0 ? '<p style="color: #fbbf24; margin: 4px 0;">Descuento: -' + formatCOP(descuento) + '</p>' : '') +
        (costoEnvio > 0 ? '<p style="color: #93c5fd; margin: 4px 0;">Envío: ' + formatCOP(costoEnvio) + '</p>' : '') +
        '<p style="font-size: 18px; font-weight: bold; color: #34d399; margin: 6px 0;">TOTAL: ' + formatCOP(total) + '</p>' +
        (saldoPendiente > 0 ? '<p style="color: #f87171; margin: 4px 0;">Abonado: ' + formatCOP(montoPagado) + ' • Saldo pendiente: ' + formatCOP(saldoPendiente) + '</p>' : '') +
      '</div>' +
      (notes ? '<p style="color: #9ca3af; font-size: 12px; margin-top: 14px; font-style: italic;">Notas: ' + notes + '</p>' : '') +
    '</div>';

    MailApp.sendEmail({
      to: recipientEmail,
      subject: 'Comprobante de Venta #' + ticketId + ' - Alquima 水',
      htmlBody: htmlBody,
      name: 'Alquima 水'
    });

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logsSheet = ss.getSheetByName('Logs');
      if (logsSheet) {
        logsSheet.appendRow([
          'LOG-' + new Date().getTime(),
          new Date().getTime(),
          'EMAIL_RECEIPT',
          `Comprobante #${ticketId} enviado a ${recipientEmail}`
        ]);
      }
    } catch (logErr) {}

    return respondJson({
      status: 'success',
      message: 'Comprobante enviado exitosamente a ' + recipientEmail
    });

  } catch (error) {
    return respondJson({
      status: 'error',
      message: 'Error al enviar comprobante: ' + error.toString()
    });
  }
}
