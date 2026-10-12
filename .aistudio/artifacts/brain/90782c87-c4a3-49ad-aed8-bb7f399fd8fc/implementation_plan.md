# Eliminación del Indicador de Precio Unitario (c/u) en Paquetes

Eliminación de la leyenda informativa de precio por unidad (`$XX.XXX c/u`) en paquetes con múltiples items (`itemCount > 1`) en las vistas públicas y de exportación (Tarjetas principales de producto, Catálogo PDF imprimible y Exportación Markdown/WhatsApp), manteniéndola de forma exclusiva dentro del formulario de edición de producto (**Editar Producto**) en la variante de venta.

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> Confirmaciones acordadas con el usuario en la fase de aclaración:
> 1. **Vistas a modificar**: Se retira el indicador de precio por unidad (`c/u`) en las **Tarjetas Principales** del catálogo, en el **Catálogo PDF** y en la **Exportación Markdown**.
> 2. **Conservación de Datos**: Se preserva íntegramente el campo `itemCount` en la base de datos (tipos `Variant`), en el formulario de edición y en las columnas de exportación **CSV** (`variant_item_count`).
> 3. **Modal de Edición**: El cálculo y visualización `($XX.XXX c/u)` se mantiene intacto en `ProductFormModal.tsx` como herramienta de apoyo interno al configurar precios y paquetes.

---

### 1. Resumen y Concepto General

- **Comportamiento previo**:
  Cuando una variante de producto tenía un paquete de varios items (ej. 6 minifiguras por $50.000, `itemCount: 6`), la función central `formatVariantPrice` calculaba `Math.round(variant.price / variant.itemCount)` y añadía automáticamente ` ($8.333 c/u)` al texto del precio. Esto se reflejaba en las tarjetas de la tienda, en los precios unitarios del catálogo PDF y en las listas compartidas por Markdown / WhatsApp.
- **Nuevo comportamiento**:
  - En las **tarjetas de la cuadrícula principal**, el precio se muestra limpio (ej. `$50.000` o `Desde $50.000`), sin la coletilla de precio individual.
  - En el **generador y vista previa del catálogo PDF**, el precio se muestra directo sin desglose por unidad.
  - En la **exportación Markdown / WhatsApp**, el texto listará el precio del producto o variante (ej. `- Batman Set: $50.000` o `* Set x6: $50.000`), limpio y sin `c/u`.
  - En el formulario **Editar Producto / Crear Producto**, al ingresar `Items: 6` y `Precio: $50.000`, el administrador seguirá viendo en verde `($8.333 c/u)` en tiempo real para verificar sus márgenes y precios.

---

### 2. Arquitectura de Cambios y Flujo de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                               utils.ts                                 │
│                                                                        │
│  formatVariantPrice(variant, { markdown, includePerItem = false })    │
│  └─► Por defecto includePerItem = false                                │
│  └─► Devuelve solo formatCurrency(variant.price)                       │
└──────────────────┬─────────────────────────────┬───────────────────────┘
                   │                             │
                   ▼                             ▼
  ┌─────────────────────────────────┐   ┌──────────────────────────────┐
  │         Vistas Públicas         │   │      Exportación Texto       │
  ├─────────────────────────────────┤   ├──────────────────────────────┤
  │ • ProductCard.tsx (Home Grid)   │   │ • ExportModal.tsx (Markdown) │
  │ • CatalogProductCard.tsx (PDF)  │   │   Precios limpios sin c/u    │
  │ • formatPrice(product)          │   └──────────────────────────────┘
  └─────────────────────────────────┘
                   │
                   ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │               ProductFormModal.tsx (Editar Producto)               │
  ├────────────────────────────────────────────────────────────────────┤
  │ • Mantiene su cálculo local perItemPrice = price / itemCount       │
  │ • Mantiene la etiqueta visual: (${perItemPrice} c/u)               │
  │ • Mantiene el input numérico "Items" intacto                       │
  └────────────────────────────────────────────────────────────────────┘
```

---

### 3. Puntos Específicos de Implementación

1. **`utils.ts`**:
   - Ajustar `formatVariantPrice`:
     - Retirar el sufijo ` (${formatCurrency(perItemPrice)} c/u)` del flujo general o soportar `includePerItem?: boolean` con valor por defecto `false`.
     - Al ajustarlo en `formatVariantPrice`, automáticamente se limpian:
       - `formatPrice` (usado por `ProductCard` y `CatalogProductCard`).
       - `ExportModal` en la sección Markdown donde invoca `formatVariantPrice`.
   - Garantizar que `generateCsvContent` mantenga su cabecera `variant_item_count` y la lectura de `v.itemCount` sin alteraciones.

2. **`components/ProductFormModal.tsx`**:
   - Verificar y asegurar que la línea:
     ```tsx
     {perItemPrice > 0 && <span className="text-xs text-green-400/80">(${perItemPrice.toLocaleString('es-CO')} c/u)</span>}
     ```
     permanezca intacta y visible para el usuario al editar variantes de venta.

3. **Verificación y Pruebas**:
   - Compilación con `compile_applet` y revisión con `lint_applet`.
   - Verificar que en la vista principal ninguna tarjeta con `itemCount > 1` muestre `c/u`.
   - Verificar que en el catálogo PDF ninguna tarjeta muestre `c/u`.
   - Verificar que al generar Markdown para WhatsApp el texto contenga el precio total sin `c/u`.
   - Verificar que al abrir el modal "Editar Producto" y cambiar ítems/precio de una variante, el indicador `($... c/u)` continúe apareciendo al lado del precio.
