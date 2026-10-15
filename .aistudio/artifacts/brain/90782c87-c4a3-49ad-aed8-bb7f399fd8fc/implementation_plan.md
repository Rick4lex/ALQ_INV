# Corrección: Visibilidad del Encabezado en el PDF del Catálogo

## Causa Raíz Identificada
En la hoja de estilos de impresión `@media print` de `index.html`, la lista de elementos no imprimibles incluía la etiqueta genérica `header` (`header { display: none !important; }`), destinada originalmente a ocultar la barra superior de navegación de la aplicación web. Al ser un selector global de etiqueta, causaba que el navegador ocultara también los encabezados `<header>` de cada hoja del catálogo (`CatalogPage.tsx`), por lo que el encabezado se veía en pantalla pero desaparecía por completo al generar e imprimir el PDF.

---

## Solución Aplicada

1. **Aislamiento y Reglas de Impresión Específicas (`index.html`)**:
   - Se removió el selector global de etiqueta `header` de la regla de ocultamiento y se reemplazó por selectores acotados a la interfaz de la web (`body > #root > div > header`, `body > #root > header`, `header:not(.catalog-header)`).
   - Se crearon reglas explícitas con prioridad para garantizar que los encabezados del catálogo siempre se rendericen en el PDF:
     - `.catalog-page header, .catalog-page .catalog-header { display: flex !important; visibility: visible !important; opacity: 1 !important; }`
     - `.catalog-page header.text-center, .catalog-page .catalog-header-first { display: block !important; visibility: visible !important; opacity: 1 !important; }`
   - Se configuró `object-fit: contain !important` para los logos de cabecera y pie de página, aislando `object-fit: cover` exclusivamente a las imágenes de productos dentro de los artículos (`.catalog-page article img`).

2. **Identificación Semántica en Plantilla (`components/CatalogPage.tsx`)**:
   - Se asignaron las clases `catalog-header catalog-header-first` a la portada (Página 1) y `catalog-header catalog-header-page` a las páginas subsiguientes (Páginas 2 a N).

---

## Verificación
- Cero advertencias ni errores en `tsc --noEmit` y `compile_applet`.
- Se conservan al 100% las proporciones verticales 3:4 de 6 productos y compactas h-32 de 9 productos.
