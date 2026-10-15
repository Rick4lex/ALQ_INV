# Restauración y Calibración: Diseño A4 de 6 Productos (Fotos Verticales 3:4) vs. 9 Productos

## Estado: IMPLEMENTADO Y VERIFICADO AL 100%

### 1. Desacoplamiento de Proporciones en `components/CatalogProductCard.tsx`
- **Diseño A4 de 6 Productos (`isCompactMode === false`)**:
  - **Con Foto**: Relación de aspecto vertical esbelta `aspect-[3/4]` con altura adaptativa calculada (`aspect-[3/4] min-h-[250px] sm:min-h-[260px] max-h-[290px] print:max-h-[84mm]`).
  - **Sin Foto**: Altura compacta `h-32` (128px) con contenedor centrado, evitando huecos vacíos y manteniendo la armonía de la cuadrícula.
- **Diseño A4 de 9 Productos (`isCompactMode === true`)**:
  - Totalmente independiente: `h-26` (104px) para fotos y `h-24` (96px) para productos sin foto, garantizando que 3 filas convivan limpiamente en su hoja física.

### 2. Estabilidad de Impresión y PDF (`index.html`)
- Reglas `@media print` actualizadas con `display: flex !important; flex-direction: column !important; justify-content: space-between !important;` y `height: 100% !important;` en cada tarjeta de producto para preservar la alineación uniforme en todos los motores de impresión.
