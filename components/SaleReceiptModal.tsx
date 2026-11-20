import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SaleRecord, SaleTicketItem } from '../types';
import { formatCurrency } from '../utils';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Receipt,
  CheckCircle2,
  Clock,
  Sun,
  Moon,
  Loader2,
  Sparkles
} from 'lucide-react';

export type ReceiptMode = 'cobro' | 'pago';
type ReceiptTheme = 'light' | 'dark';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord;
  defaultMode?: ReceiptMode;
}

const BRAND_LOGO_URL =
  'https://res.cloudinary.com/dyeppbrfl/image/upload/v1787511255/copy_of_826fb604-b81c-438a-ab3e-e2cc5f95f40a.png';
const BRAND_CITY = 'Cali, Colombia';
const BRAND_INSTAGRAM_HANDLE = '@alquima.mizu';
const BRAND_NEQUI_KEY = '@3146758904';
const BRAND_WHATSAPP = '+57 3157513325';

const DELIVERY_LABELS: Record<SaleRecord['deliveryStatus'], string> = {
  por_entregar: 'Por entregar',
  enviado: 'Enviado',
  entregado: 'Entregado'
};

const FONT_SANS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

function loadBrandLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => resolve(null), 3500);
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    img.src = BRAND_LOGO_URL;
  });
}

/**
 * Recolorea el logo claro de Alquima Mizu para que tenga contraste nítido en modo claro.
 * Detecta si la imagen tiene transparencia (PNG) o fondo claro opaco.
 */
function createLightModeTintedLogo(img: HTMLImageElement, targetSize: number): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = targetSize;
  off.height = targetSize;
  const octx = off.getContext('2d')!;
  octx.drawImage(img, 0, 0, targetSize, targetSize);

  try {
    const imgData = octx.getImageData(0, 0, targetSize, targetSize);
    const data = imgData.data;

    // Verificar si las esquinas son transparentes (PNG transparente)
    const cornerAlpha =
      (data[3] +
        data[(targetSize - 1) * 4 + 3] +
        data[(targetSize * (targetSize - 1)) * 4 + 3] +
        data[(targetSize * targetSize - 1) * 4 + 3]) /
      4;

    if (cornerAlpha < 180) {
      // PNG transparente con trazos claros: teñir preservando el canal alfa exacto
      octx.globalCompositeOperation = 'source-in';
      const grad = octx.createLinearGradient(0, 0, targetSize, targetSize);
      grad.addColorStop(0, '#3b0764');
      grad.addColorStop(1, '#6d28d9');
      octx.fillStyle = grad;
      octx.fillRect(0, 0, targetSize, targetSize);
      octx.globalCompositeOperation = 'source-over';
    } else {
      // Imagen opaca: mapear píxeles claros de trazos o contraste hacia morado oscuro
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const darkness = Math.min(1, Math.max(0, (245 - lum) / 180));
        if (darkness < 0.08) {
          data[i + 3] = 0;
        } else {
          data[i] = 76;
          data[i + 1] = 29;
          data[i + 2] = 149;
          data[i + 3] = Math.round(Math.min(255, darkness * 255 * 1.4));
        }
      }
      octx.putImageData(imgData, 0, 0);
    }
  } catch {
    // Si hay alguna restricción de lectura de píxeles, devolver tal cual
  }

  return off;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  if (!words.length || !words[0]) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function drawFallbackEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, '#581c87');
  grad.addColorStop(1, '#7e22ce');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const outer = radius * 0.54;
  const inner = radius * 0.16;
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInstagramIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;

  drawRoundedRect(ctx, x, y, size, size, size * 0.28);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.23, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + size * 0.76, y + size * 0.24, size * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function formatDateTimePOS(timestamp: number): string {
  const d = new Date(timestamp);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} - ${hh}:${minutes} ${ampm}`;
}

interface GroupedItemEntry {
  productTitle: string;
  sku?: string;
  isSingleDefault: boolean;
  rows: {
    quantity: number;
    label: string;
    grossUnitPrice: number;
    grossLineTotal: number;
  }[];
}

function groupSaleItems(items: SaleTicketItem[]): GroupedItemEntry[] {
  const map = new Map<string, SaleTicketItem[]>();
  for (const item of items) {
    const key = (item.productTitle || 'Producto').trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const groups: GroupedItemEntry[] = [];
  map.forEach((groupItems, productTitle) => {
    const firstSku = groupItems.find((i) => i.sku && i.sku.trim())?.sku?.trim();
    const isSingle = groupItems.length === 1;
    const onlyVariant = (groupItems[0]?.variantName || '').trim();
    const isDefaultVariant =
      !onlyVariant ||
      onlyVariant.toLowerCase() === 'único' ||
      onlyVariant.toLowerCase() === 'unico' ||
      onlyVariant.toLowerCase() === productTitle.toLowerCase();

    const rows = groupItems.map((it) => {
      const grossUnit = it.originalPrice > 0 ? it.originalPrice : it.unitPrice;
      const grossTotal = it.quantity * grossUnit;
      const cleanVariant = (it.variantName || 'Estándar').trim();
      return {
        quantity: it.quantity,
        label: isSingle && isDefaultVariant ? productTitle : cleanVariant,
        grossUnitPrice: grossUnit,
        grossLineTotal: grossTotal
      };
    });

    groups.push({
      productTitle,
      sku: firstSku,
      isSingleDefault: isSingle && isDefaultVariant,
      rows
    });
  });

  return groups;
}

function renderReceiptToCanvas(
  sale: SaleRecord,
  mode: ReceiptMode,
  theme: ReceiptTheme,
  logoImg: HTMLImageElement | null
): HTMLCanvasElement {
  const W = 760;
  const PAD = 38;
  const INNER_W = W - PAD * 2;
  const DPR = 2;
  const isLight = theme === 'light';
  const isCobro = mode === 'cobro';

  // Paleta Light-First (WCAG AA+ nítido) y opción Oscuro
  const c = isLight
    ? {
        bg: '#ffffff',
        surface: '#f8f9fb',
        surfaceHeader: '#f3f1f9',
        groupBg: '#f6f4fc',
        border: '#e5e7eb',
        borderStrong: '#d8cfe8',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#6b7280',
        brandDark: '#4c1d95',
        brandAccent: '#6d28d9',
        logoBg: '#f5f3ff',
        logoBorder: '#ddd6fe',
        statusBg: isCobro ? '#fffbeb' : '#ecfdf5',
        statusBorder: isCobro ? '#f59e0b' : '#10b981',
        statusDot: isCobro ? '#d97706' : '#059669',
        statusText: isCobro ? '#92400e' : '#065f46',
        deliveryBg: '#f5f3ff',
        deliveryBorder: '#ddd6fe',
        deliveryText: '#5b21b6',
        payBoxBg: isCobro ? '#f6f3ff' : '#ecfdf5',
        payBoxBorder: isCobro ? '#c4b5fd' : '#6ee7b7',
        moneyPositive: '#059669',
        moneyWarn: '#b45309',
        totalColor: isCobro ? '#4c1d95' : '#047857'
      }
    : {
        bg: '#0f0c1d',
        surface: '#17122b',
        surfaceHeader: '#1e1738',
        groupBg: '#1b1533',
        border: '#2d254c',
        borderStrong: '#41346e',
        textPrimary: '#f8fafc',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        brandDark: '#c084fc',
        brandAccent: '#a855f7',
        logoBg: '#1a1333',
        logoBorder: 'rgba(168,85,247,0.45)',
        statusBg: isCobro ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)',
        statusBorder: isCobro ? 'rgba(251,191,36,0.45)' : 'rgba(52,211,153,0.45)',
        statusDot: isCobro ? '#fbbf24' : '#34d399',
        statusText: isCobro ? '#fde68a' : '#6ee7b7',
        deliveryBg: 'rgba(168,85,247,0.16)',
        deliveryBorder: 'rgba(192,132,252,0.4)',
        deliveryText: '#e9d5ff',
        payBoxBg: isCobro ? 'rgba(126,34,206,0.16)' : 'rgba(16,185,129,0.12)',
        payBoxBorder: isCobro ? 'rgba(192,132,252,0.4)' : 'rgba(52,211,153,0.4)',
        moneyPositive: '#34d399',
        moneyWarn: '#fbbf24',
        totalColor: isCobro ? '#c084fc' : '#34d399'
      };

  // Columnas de la tabla estándar: CANT | DESCRIPCIÓN / VARIANTE | V. UNIT | TOTAL
  const COL_CANT_X = PAD;
  const COL_CANT_W = 58;
  const COL_DESC_X = COL_CANT_X + COL_CANT_W + 10;
  const COL_UNIT_RIGHT = W - PAD - 122;
  const COL_TOTAL_RIGHT = W - PAD - 14;
  const COL_DESC_W = COL_UNIT_RIGHT - 96 - COL_DESC_X;

  // Agrupación de ítems y cálculo matemático 100% consistente
  const grouped = groupSaleItems(sale.items || []);
  const computedGrossSubtotal = grouped.reduce(
    (sum, g) => sum + g.rows.reduce((s, r) => s + r.grossLineTotal, 0),
    0
  );
  const subtotalBruto = computedGrossSubtotal > 0 ? computedGrossSubtotal : sale.subtotal;
  const shippingCost = Math.max(0, sale.shippingCost || 0);
  const discountAmount = Math.max(
    0,
    sale.discountAmount > 0
      ? sale.discountAmount
      : Math.max(0, subtotalBruto + shippingCost - sale.total)
  );
  const grandTotal = Math.max(0, subtotalBruto - discountAmount + shippingCost);
  const amountPaid = Math.max(0, sale.amountPaid || 0);
  const pendingBalance = Math.max(0, grandTotal - amountPaid);
  const hasPartialPayment = isCobro && amountPaid > 0 && pendingBalance > 0;
  const hasCashChange = !isCobro && Boolean(sale.cashReceived && sale.cashReceived > grandTotal);

  const paymentMethodLabel =
    sale.paymentMethod === 'Nequi' ? 'Nequi / Llave' : sale.paymentMethod || 'Nequi / Llave';
  const formaPagoLabel = sale.paymentStatus === 'parcial' ? 'Abono / Parcial' : 'Contado';

  // Medición previa de alturas dinámicas
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;

  const groupLayouts = grouped.map((g) => {
    const headerTitle = g.sku ? `${g.productTitle} (SKU: ${g.sku})` : g.productTitle;
    mctx.font = `700 14.5px ${FONT_SANS}`;
    const headerLines = g.isSingleDefault ? [] : wrapText(mctx, headerTitle, INNER_W - COL_CANT_W - 36);
    const headerH = g.isSingleDefault ? 0 : Math.max(32, headerLines.length * 19 + 14);

    mctx.font = `500 14px ${FONT_SANS}`;
    const rowLayouts = g.rows.map((r) => {
      const displayLabel = g.isSingleDefault
        ? (g.sku ? `${r.label} (SKU: ${g.sku})` : r.label)
        : `· ${r.label}`;
      const lines = wrapText(mctx, displayLabel, COL_DESC_W);
      const rowH = Math.max(32, lines.length * 19 + 12);
      return { ...r, lines, rowH };
    });

    return { ...g, headerLines, headerH, rowLayouts };
  });

  const customerRowsLeft: { label: string; value: string }[] = [
    { label: 'CLIENTE:', value: sale.customerName?.trim() || 'Cliente General' }
  ];
  if (sale.customerContact?.trim()) {
    customerRowsLeft.push({ label: 'CELULAR:', value: sale.customerContact.trim() });
  }
  if (sale.customerEmail?.trim()) {
    customerRowsLeft.push({ label: 'CORREO:', value: sale.customerEmail.trim() });
  }

  const customerRowsRight: { label: string; value: string }[] = [
    { label: 'FORMA DE PAGO:', value: formaPagoLabel },
    { label: 'MEDIO DE PAGO:', value: paymentMethodLabel }
  ];

  mctx.font = `400 13.5px ${FONT_SANS}`;
  const noteLines = sale.notes?.trim() ? wrapText(mctx, sale.notes.trim(), INNER_W - 32) : [];

  // Alturas por sección
  const topBarH = 7;
  const headerH = 98;
  const statusBarH = 52;
  const customerGridRows = Math.max(customerRowsLeft.length, customerRowsRight.length);
  const customerBoxH = 22 + customerGridRows * 25 + 6;
  const tableHeaderH = 38;
  const tableBodyH = Math.max(
    44,
    groupLayouts.reduce(
      (sum, g) => sum + g.headerH + g.rowLayouts.reduce((rs, r) => rs + r.rowH, 0),
      0
    )
  );

  let totalsLineCount = 2; // Subtotal bruto + IVA (0%)
  if (discountAmount > 0) totalsLineCount += 1;
  if (shippingCost > 0) totalsLineCount += 1;
  const totalsBoxH = 18 + totalsLineCount * 24 + 14 + 34 + (hasPartialPayment ? 50 : 0) + 10;

  const payBoxH = isCobro ? 96 : hasCashChange ? 114 : 92;
  const notesBoxH = noteLines.length > 0 ? 34 + noteLines.length * 19 + 8 : 0;
  const footerH = 52;

  const totalH =
    topBarH +
    24 +
    headerH +
    14 +
    statusBarH +
    14 +
    customerBoxH +
    16 +
    tableHeaderH +
    tableBodyH +
    1 +
    totalsBoxH +
    18 +
    payBoxH +
    (notesBoxH > 0 ? 14 + notesBoxH : 0) +
    18 +
    footerH +
    18;

  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = totalH * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = 'top';

  // Fondo limpio
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, totalH);

  // Barra superior de marca Alquima Mizu
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#3b0764');
  topGrad.addColorStop(0.6, '#6d28d9');
  topGrad.addColorStop(1, isCobro ? '#d97706' : '#059669');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, topBarH);

  let y = topBarH + 24;

  // === 1. ENCABEZADO: [LOGO] ALQUIMA MIZU | DOC POS + N° + FECHA ===
  const logoSize = 66;
  drawRoundedRect(ctx, PAD, y + 4, logoSize, logoSize, 14);
  ctx.fillStyle = c.logoBg;
  ctx.fill();
  ctx.strokeStyle = c.logoBorder;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  if (logoImg) {
    const innerPad = 5;
    const drawSize = logoSize - innerPad * 2;
    if (isLight) {
      const tinted = createLightModeTintedLogo(logoImg, drawSize * DPR);
      ctx.drawImage(tinted, PAD + innerPad, y + 4 + innerPad, drawSize, drawSize);
    } else {
      ctx.save();
      drawRoundedRect(ctx, PAD + innerPad, y + 4 + innerPad, drawSize, drawSize, 10);
      ctx.clip();
      ctx.drawImage(logoImg, PAD + innerPad, y + 4 + innerPad, drawSize, drawSize);
      ctx.restore();
    }
  } else {
    drawFallbackEmblem(ctx, PAD + logoSize / 2, y + 4 + logoSize / 2, 24);
  }

  const brandX = PAD + logoSize + 16;
  ctx.fillStyle = c.textPrimary;
  ctx.font = `800 25px ${FONT_SANS}`;
  ctx.fillText('ALQUIMA MIZU', brandX, y + 12);

  ctx.fillStyle = c.textMuted;
  ctx.font = `500 14px ${FONT_SANS}`;
  ctx.fillText(BRAND_CITY, brandX, y + 45);

  // Bloque derecho del encabezado
  ctx.textAlign = 'right';
  ctx.fillStyle = c.brandDark;
  ctx.font = `800 14px ${FONT_SANS}`;
  const docTitle = isCobro ? 'RESUMEN DE PEDIDO / POS' : 'COMPROBANTE DE PAGO / POS';
  ctx.fillText(docTitle, W - PAD, y + 8);

  ctx.fillStyle = c.textPrimary;
  ctx.font = `800 18px ${FONT_MONO}`;
  ctx.fillText(`N° ${sale.ticketId}`, W - PAD, y + 31);

  ctx.fillStyle = c.textMuted;
  ctx.font = `500 13px ${FONT_MONO}`;
  ctx.fillText(
    formatDateTimePOS(isCobro ? sale.createdAt : (sale.paidAt || sale.createdAt)),
    W - PAD,
    y + 57
  );
  ctx.textAlign = 'left';

  y += headerH;

  // Separador
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  y += 14;

  // === 2. FILA DE ESTADO Y ENTREGA ===
  drawRoundedRect(ctx, PAD, y, INNER_W, statusBarH, 10);
  ctx.fillStyle = c.surface;
  ctx.fill();
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Izquierda: ESTADO: [ ● PENDIENTE DE PAGO ]
  ctx.fillStyle = c.textMuted;
  ctx.font = `700 11.5px ${FONT_SANS}`;
  ctx.fillText('ESTADO:', PAD + 16, y + 19);

  const statusLabel = isCobro
    ? hasPartialPayment
      ? 'SALDO PENDIENTE'
      : 'PENDIENTE DE PAGO'
    : 'PAGADO';
  ctx.font = `800 12px ${FONT_SANS}`;
  const statusPillW = ctx.measureText(statusLabel).width + 36;
  const statusPillX = PAD + 78;
  drawRoundedRect(ctx, statusPillX, y + 11, statusPillW, 30, 8);
  ctx.fillStyle = c.statusBg;
  ctx.fill();
  ctx.strokeStyle = c.statusBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Punto de estado
  ctx.beginPath();
  ctx.arc(statusPillX + 14, y + 26, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = c.statusDot;
  ctx.fill();

  ctx.fillStyle = c.statusText;
  ctx.font = `800 12px ${FONT_SANS}`;
  ctx.fillText(statusLabel, statusPillX + 25, y + 19);

  // Derecha: ENTREGA: [ Por entregar ]
  const deliveryText = DELIVERY_LABELS[sale.deliveryStatus] || 'Por entregar';
  ctx.font = `700 12px ${FONT_SANS}`;
  const deliveryPillW = ctx.measureText(deliveryText).width + 26;
  const deliveryPillX = W - PAD - 16 - deliveryPillW;

  drawRoundedRect(ctx, deliveryPillX, y + 11, deliveryPillW, 30, 8);
  ctx.fillStyle = c.deliveryBg;
  ctx.fill();
  ctx.strokeStyle = c.deliveryBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = c.deliveryText;
  ctx.textAlign = 'center';
  ctx.fillText(deliveryText, deliveryPillX + deliveryPillW / 2, y + 19);

  ctx.textAlign = 'right';
  ctx.fillStyle = c.textMuted;
  ctx.font = `700 11.5px ${FONT_SANS}`;
  ctx.fillText('ENTREGA:', deliveryPillX - 10, y + 19);
  ctx.textAlign = 'left';

  y += statusBarH + 14;

  // === 3. DATOS DEL CLIENTE Y CONDICIONES DE PAGO (2 COLUMNAS) ===
  drawRoundedRect(ctx, PAD, y, INNER_W, customerBoxH, 10);
  ctx.fillStyle = c.bg;
  ctx.fill();
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const leftLabelX = PAD + 16;
  const leftValX = PAD + 92;
  const rightLabelX = PAD + INNER_W * 0.54;
  const rightValX = PAD + INNER_W * 0.54 + 122;

  customerRowsLeft.forEach((row, idx) => {
    const ry = y + 14 + idx * 25;
    ctx.fillStyle = c.textMuted;
    ctx.font = `700 11.5px ${FONT_SANS}`;
    ctx.fillText(row.label, leftLabelX, ry + 1);

    ctx.fillStyle = idx === 0 ? c.textPrimary : c.textSecondary;
    ctx.font = `${idx === 0 ? '700' : '500'} 13.5px ${FONT_SANS}`;
    ctx.fillText(row.value, leftValX, ry);
  });

  customerRowsRight.forEach((row, idx) => {
    const ry = y + 14 + idx * 25;
    ctx.fillStyle = c.textMuted;
    ctx.font = `700 11.5px ${FONT_SANS}`;
    ctx.fillText(row.label, rightLabelX, ry + 1);

    ctx.fillStyle = c.textPrimary;
    ctx.font = `600 13.5px ${FONT_SANS}`;
    ctx.fillText(row.value, rightValX, ry);
  });

  y += customerBoxH + 16;

  // === 4. TABLA DE ÍTEMS + BLOQUE DE TOTALES EN UN CONTENEDOR LIMPIO ===
  const tableTotalCardH = tableHeaderH + tableBodyH + 1 + totalsBoxH;
  drawRoundedRect(ctx, PAD, y, INNER_W, tableTotalCardH, 10);
  ctx.fillStyle = c.bg;
  ctx.fill();
  ctx.strokeStyle = c.borderStrong;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Encabezado de la tabla
  ctx.save();
  drawRoundedRect(ctx, PAD + 1, y + 1, INNER_W - 2, tableHeaderH - 1, 9);
  ctx.fillStyle = c.surfaceHeader;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = c.brandDark;
  ctx.font = `800 11.5px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('CANT', COL_CANT_X + COL_CANT_W / 2, y + 13);

  ctx.textAlign = 'left';
  ctx.fillText('DESCRIPCIÓN / VARIANTE', COL_DESC_X, y + 13);

  ctx.textAlign = 'right';
  ctx.fillText('V. UNIT', COL_UNIT_RIGHT, y + 13);
  ctx.fillText('TOTAL', COL_TOTAL_RIGHT, y + 13);
  ctx.textAlign = 'left';

  // Línea bajo header de tabla
  ctx.beginPath();
  ctx.moveTo(PAD, y + tableHeaderH);
  ctx.lineTo(W - PAD, y + tableHeaderH);
  ctx.strokeStyle = c.borderStrong;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Filas agrupadas
  let rowY = y + tableHeaderH;
  groupLayouts.forEach((group, gIdx) => {
    if (gIdx > 0) {
      ctx.beginPath();
      ctx.moveTo(PAD + 1, rowY);
      ctx.lineTo(W - PAD - 1, rowY);
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Encabezado padre del producto (cuando tiene variantes)
    if (!group.isSingleDefault && group.headerLines.length > 0) {
      ctx.fillStyle = c.groupBg;
      ctx.fillRect(PAD + 1, rowY, INNER_W - 2, group.headerH);

      ctx.fillStyle = c.textPrimary;
      ctx.font = `700 14px ${FONT_SANS}`;
      group.headerLines.forEach((line, li) => {
        ctx.fillText(line, COL_DESC_X, rowY + 8 + li * 19);
      });
      rowY += group.headerH;
    }

    // Sub-filas de variantes (o fila única si es producto sin variantes)
    group.rowLayouts.forEach((r, rIdx) => {
      if (rIdx > 0 || !group.isSingleDefault) {
        ctx.beginPath();
        ctx.moveTo(PAD + 12, rowY);
        ctx.lineTo(W - PAD - 12, rowY);
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Cantidad (centrada, tabular)
      ctx.fillStyle = c.textPrimary;
      ctx.font = `700 13.5px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(r.quantity), COL_CANT_X + COL_CANT_W / 2, rowY + 9);

      // Descripción / Variante
      ctx.textAlign = 'left';
      ctx.fillStyle = group.isSingleDefault ? c.textPrimary : c.textSecondary;
      ctx.font = `${group.isSingleDefault ? '600' : '500'} 13.5px ${FONT_SANS}`;
      r.lines.forEach((line, li) => {
        ctx.fillText(line, COL_DESC_X + (group.isSingleDefault ? 0 : 6), rowY + 8 + li * 19);
      });

      // V. Unitario bruto (antes de descuento global)
      ctx.textAlign = 'right';
      ctx.fillStyle = c.textSecondary;
      ctx.font = `500 13.5px ${FONT_MONO}`;
      ctx.fillText(formatCurrency(r.grossUnitPrice), COL_UNIT_RIGHT, rowY + 9);

      // Total de línea bruto
      ctx.fillStyle = c.textPrimary;
      ctx.font = `700 13.5px ${FONT_MONO}`;
      ctx.fillText(formatCurrency(r.grossLineTotal), COL_TOTAL_RIGHT, rowY + 9);
      ctx.textAlign = 'left';

      rowY += r.rowH;
    });
  });

  // Separador entre tabla y totales
  ctx.beginPath();
  ctx.moveTo(PAD, rowY);
  ctx.lineTo(W - PAD, rowY);
  ctx.strokeStyle = c.borderStrong;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  // === 5. BLOQUE DE TOTALES ALINEADO A LA DERECHA ===
  const totalsTop = rowY + 1;
  ctx.save();
  drawRoundedRect(ctx, PAD + 1, totalsTop, INNER_W - 2, totalsBoxH - 1, 9);
  ctx.fillStyle = c.surface;
  ctx.fill();
  ctx.restore();

  let ty = totalsTop + 16;
  const labelRightX = COL_UNIT_RIGHT + 14;

  const drawSummaryLine = (
    label: string,
    val: string,
    valColor: string,
    bold = false,
    size = 13.5
  ) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = bold ? c.textPrimary : c.textSecondary;
    ctx.font = `${bold ? '700' : '500'} ${size}px ${FONT_SANS}`;
    ctx.fillText(label, labelRightX, ty);

    ctx.fillStyle = valColor;
    ctx.font = `${bold ? '800' : '600'} ${size}px ${FONT_MONO}`;
    ctx.fillText(val, COL_TOTAL_RIGHT, ty);
    ctx.textAlign = 'left';
    ty += 24;
  };

  drawSummaryLine('Subtotal bruto:', formatCurrency(subtotalBruto), c.textPrimary);

  if (discountAmount > 0) {
    const discTag = sale.discountLabel ? ` (${sale.discountLabel})` : '';
    drawSummaryLine(`Descuento${discTag}:`, `-${formatCurrency(discountAmount)}`, c.moneyPositive);
  }

  if (shippingCost > 0) {
    drawSummaryLine('Envío:', `+${formatCurrency(shippingCost)}`, c.textPrimary);
  }

  drawSummaryLine('IVA (0%):', '$0', c.textMuted);

  // Separador antes del total final
  ty += 3;
  ctx.beginPath();
  ctx.moveTo(PAD + INNER_W * 0.48, ty);
  ctx.lineTo(W - PAD - 14, ty);
  ctx.strokeStyle = c.borderStrong;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ty += 11;

  // TOTAL A PAGAR / TOTAL PAGADO
  ctx.textAlign = 'right';
  ctx.fillStyle = c.textPrimary;
  ctx.font = `800 15px ${FONT_SANS}`;
  ctx.fillText(isCobro ? 'TOTAL A PAGAR:' : 'TOTAL PAGADO:', labelRightX, ty + 3);

  ctx.fillStyle = c.totalColor;
  ctx.font = `800 22px ${FONT_MONO}`;
  ctx.fillText(formatCurrency(grandTotal), COL_TOTAL_RIGHT, ty - 1);
  ctx.textAlign = 'left';
  ty += 34;

  if (hasPartialPayment) {
    drawSummaryLine('Abono registrado:', formatCurrency(amountPaid), c.moneyPositive, false, 13);
    drawSummaryLine('SALDO PENDIENTE:', formatCurrency(pendingBalance), c.moneyWarn, true, 14.5);
  }

  y = totalsTop + totalsBoxH + 18;

  // === 6. INSTRUCCIONES / CONFIRMACIÓN DE PAGO (SIN REPETICIONES EN FOOTER) ===
  drawRoundedRect(ctx, PAD, y, INNER_W, payBoxH, 10);
  ctx.fillStyle = c.payBoxBg;
  ctx.fill();
  ctx.strokeStyle = c.payBoxBorder;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  if (isCobro) {
    ctx.fillStyle = c.brandDark;
    ctx.font = `800 11.5px ${FONT_SANS}`;
    ctx.fillText('INSTRUCCIONES DE PAGO', PAD + 18, y + 14);

    ctx.fillStyle = c.textPrimary;
    ctx.font = `700 16px ${FONT_MONO}`;
    ctx.fillText(`Nequi / Llave: ${BRAND_NEQUI_KEY}   |   Ref: ${sale.ticketId}`, PAD + 18, y + 36);

    ctx.fillStyle = c.textSecondary;
    ctx.font = `500 13px ${FONT_SANS}`;
    ctx.fillText(
      `Envía tu comprobante por WhatsApp (${BRAND_WHATSAPP}) para confirmar.`,
      PAD + 18,
      y + 64
    );
  } else {
    ctx.fillStyle = c.moneyPositive;
    ctx.font = `800 11.5px ${FONT_SANS}`;
    ctx.fillText('CONFIRMACIÓN DE PAGO', PAD + 18, y + 14);

    ctx.fillStyle = c.textPrimary;
    ctx.font = `700 15px ${FONT_MONO}`;
    ctx.fillText(`Medio: ${paymentMethodLabel}   |   Ref: ${sale.ticketId}`, PAD + 18, y + 36);

    if (hasCashChange && sale.cashReceived) {
      const change = sale.cashReceived - grandTotal;
      ctx.fillStyle = c.textSecondary;
      ctx.font = `600 13.5px ${FONT_MONO}`;
      ctx.fillText(
        `Recibido: ${formatCurrency(sale.cashReceived)}   |   Cambio: ${formatCurrency(change)}`,
        PAD + 18,
        y + 62
      );
      ctx.fillStyle = c.textMuted;
      ctx.font = `500 12.5px ${FONT_SANS}`;
      ctx.fillText(
        `¡Gracias por tu compra! Atención por WhatsApp: ${BRAND_WHATSAPP}.`,
        PAD + 18,
        y + 86
      );
    } else {
      ctx.fillStyle = c.textSecondary;
      ctx.font = `500 13px ${FONT_SANS}`;
      ctx.fillText(
        `¡Gracias por tu compra! Atención por WhatsApp: ${BRAND_WHATSAPP}.`,
        PAD + 18,
        y + 62
      );
    }
  }

  y += payBoxH;

  // === 7. OBSERVACIONES OPCIONALES ===
  if (noteLines.length > 0) {
    y += 14;
    drawRoundedRect(ctx, PAD, y, INNER_W, notesBoxH, 10);
    ctx.fillStyle = c.surface;
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = c.textMuted;
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.fillText('OBSERVACIONES', PAD + 16, y + 12);

    ctx.fillStyle = c.textSecondary;
    ctx.font = `400 13.5px ${FONT_SANS}`;
    noteLines.forEach((line, idx) => {
      ctx.fillText(line, PAD + 16, y + 29 + idx * 19);
    });
    y += notesBoxH;
  }

  // === 8. PIE DE PÁGINA MINIMALISTA: [Icono Instagram] · @alquima.mizu ===
  y += 18;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const footerCenterY = y + 20;
  const handleText = `·  ${BRAND_INSTAGRAM_HANDLE}`;
  ctx.font = `700 14px ${FONT_SANS}`;
  const textW = ctx.measureText(handleText).width;
  const iconSize = 18;
  const gap = 8;
  const totalFooterW = iconSize + gap + textW;
  const startX = (W - totalFooterW) / 2;

  drawInstagramIcon(ctx, startX, footerCenterY - 1, iconSize, c.brandAccent);
  ctx.fillStyle = c.textSecondary;
  ctx.fillText(handleText, startX + iconSize + gap, footerCenterY + 1);

  return canvas;
}

const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  defaultMode
}) => {
  const resolvedDefault: ReceiptMode =
    defaultMode || (sale.paymentStatus === 'pagado' ? 'pago' : 'cobro');

  const [mode, setMode] = useState<ReceiptMode>(resolvedDefault);
  // Light-First por defecto para máxima legibilidad e impresión
  const [theme, setTheme] = useState<ReceiptTheme>('light');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode || (sale.paymentStatus === 'pagado' ? 'pago' : 'cobro'));
      setCopied(false);
      setFeedback(null);
    }
  }, [isOpen, sale.ticketId, sale.paymentStatus, defaultMode]);

  const generateReceipt = useCallback(async () => {
    setIsRendering(true);
    try {
      const logo = await loadBrandLogo();
      const canvas = renderReceiptToCanvas(sale, mode, theme, logo);
      const url = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error al renderizar comprobante:', err);
      try {
        const canvas = renderReceiptToCanvas(sale, mode, theme, null);
        setPreviewUrl(canvas.toDataURL('image/png', 1.0));
      } catch (fallbackErr) {
        console.error('Error crítico al renderizar comprobante:', fallbackErr);
      }
    } finally {
      setIsRendering(false);
    }
  }, [sale, mode, theme]);

  useEffect(() => {
    if (isOpen) {
      generateReceipt();
    }
  }, [isOpen, generateReceipt]);

  if (!isOpen) return null;

  const fileName = `AlquimaMizu_${mode === 'cobro' ? 'Pedido' : 'Pago'}_${sale.ticketId}.png`;

  const getPngBlob = async (): Promise<Blob | null> => {
    if (!previewUrl) return null;
    const res = await fetch(previewUrl);
    return await res.blob();
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setFeedback(`Imagen descargada: ${fileName}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCopyImage = async () => {
    try {
      const blob = await getPngBlob();
      if (!blob) return;
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setFeedback('Imagen copiada al portapapeles. Pégala directo en WhatsApp o Instagram.');
        setTimeout(() => {
          setCopied(false);
          setFeedback(null);
        }, 3000);
      } else {
        handleDownload();
      }
    } catch {
      setFeedback('Tu navegador bloqueó copiar imagen. Usa el botón Descargar PNG.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleShare = async () => {
    try {
      const blob = await getPngBlob();
      if (!blob) return;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title:
            mode === 'cobro'
              ? `Resumen de Pedido ${sale.ticketId}`
              : `Comprobante de Pago ${sale.ticketId}`,
          text:
            mode === 'cobro'
              ? `Resumen de pedido Alquima Mizu #${sale.ticketId} — Nequi/Llave: ${BRAND_NEQUI_KEY}`
              : `Comprobante de pago Alquima Mizu #${sale.ticketId} — ¡Gracias por tu compra!`,
          files: [file]
        });
      } else {
        handleDownload();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        handleDownload();
      }
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const modalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comprobante de Venta"
        className="relative w-full max-w-2xl bg-gray-900 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-800 bg-gray-950/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 shrink-0">
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Comprobante Gráfico — Alquima Mizu
              </h3>
              <p className="text-[11px] text-gray-400 font-mono truncate">
                N° {sale.ticketId} · {sale.customerName || 'Cliente General'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode & Theme Controls */}
        <div className="px-4 sm:px-5 py-3 bg-gray-900/90 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Segmented Mode Toggle: Cobro al cliente vs Pago del cliente */}
          <div className="inline-flex bg-gray-950 p-1 rounded-xl border border-gray-800 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setMode('cobro')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'cobro'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-xs'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <Clock size={14} />
              <span>Cobro al cliente</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('pago')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'pago'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-xs'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Pago del cliente</span>
            </button>
          </div>

          {/* Theme Switcher (Claro primero por defecto) */}
          <div className="inline-flex bg-gray-950 p-1 rounded-xl border border-gray-800">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                theme === 'light' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Estilo claro (recomendado para WhatsApp e impresión)"
            >
              <Sun size={13} />
              <span>Claro</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                theme === 'dark' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Estilo oscuro Alquima Mizu"
            >
              <Moon size={13} />
              <span>Oscuro</span>
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-950/80 flex flex-col items-center">
          {feedback && (
            <div className="w-full max-w-lg mb-3 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {isRendering && !previewUrl ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-purple-400" />
              <span className="text-xs">Generando comprobante en alta resolución...</span>
            </div>
          ) : previewUrl ? (
            <div className="w-full max-w-[520px] rounded-xl overflow-hidden shadow-2xl border border-gray-700/80 bg-white">
              <img
                src={previewUrl}
                alt={`Comprobante ${mode} ${sale.ticketId}`}
                className="w-full h-auto block select-none"
              />
            </div>
          ) : null}
        </div>

        {/* Action Bar */}
        <div className="px-4 sm:px-5 py-3.5 bg-gray-950/90 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <p className="text-[11px] text-gray-400 hidden sm:block">
            PNG alta definición (2x) listo para WhatsApp o impresión.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={!previewUrl || isRendering}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 text-xs font-bold border border-gray-700 transition-all active:scale-95"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleShare}
                disabled={!previewUrl || isRendering}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all active:scale-95"
              >
                <Share2 size={15} />
                <span>Compartir</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={!previewUrl || isRendering}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-all active:scale-95"
            >
              <Download size={15} />
              <span>Descargar PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SaleReceiptModal;
