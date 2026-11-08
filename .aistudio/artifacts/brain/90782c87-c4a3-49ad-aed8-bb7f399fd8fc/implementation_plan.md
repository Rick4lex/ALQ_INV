# Plan y Registro de Implementación: Reestructuración de Herramientas, Fusión y Actualización de Inventario

Documento de seguimiento de las funcionalidades de Alquima Mizu: integración de seguridad con Google Apps Script, gestión de roles, persistencia reactiva, reestructuración de herramientas y sincronización en la nube.

---

## 1. Estado de Módulos Implementados

### A. Autenticación y Control de Acceso por Roles (100% Completado)
- **Roles**: `admin` y `vendedor`.
- **Credenciales Limpias**: Cero credenciales expuestas en el repositorio público. Autenticación delegada a Google Apps Script con `ScriptProperties` (`ADMIN_PIN`, `SELLER_PIN`, `TOKEN_SECRET`).
- **Seguridad en Vendedor**: Botones de Panel Financiero, JSON, Backup y Herramientas ocultos automáticamente para el rol vendedor.
- **Temporizador de Inactividad**: Bloqueo automático a los 15 minutos de inactividad con persistencia de sesión segura en `sessionStorage`.

### B. Gestión de Productos Ocultos / Activos por Categoría (100% Completado)
- **Regla de Ocultación**: Si un producto no tiene título o categoría asignada, queda oculto por defecto.
- **Productos Agotados**: Productos con stock 0 permanecen visibles si tienen título y categoría.
- **Restauración Obligatoria**: Al desocultar un producto, el modal `RestoreProductModal.tsx` exige seleccionar una categoría antes de guardarlo en Google Sheets.

### C. Fusión Directa en Catálogo (`FilterBar.tsx` + `ProductCard.tsx`) (100% Completado)
- **Interruptor en Filtros**: Se agregó el toggle switch **"Fusionar"** en la barra superior de filtros, ubicado junto a *Disponibles* y *Ocultos*.
- **Casillas de Selección Visibles**: Al activar "Fusionar", cada tarjeta de producto muestra una casilla interactiva en la esquina superior derecha (`Square` / `CheckCircle`).
- **Barra Flotante Activa**: Permite seleccionar exactamente 2 productos del catálogo y abrirlos en el comparador de fusión sin tener que ingresar a ningún menú auxiliar.

### D. Actualización Masiva de Stock y Precios en 2 Pasos (`DataImportModal.tsx`) (100% Completado)
- **Paso 1 (Descargar Plantilla)**: Genera y descarga instantáneamente el archivo `alquima_inventario_actualizar_YYYY-MM-DD.csv` con todas las variantes del catálogo prellenadas (`variant_sku`, `product_title`, `variant_name`, `variant_stock`, `variant_price`, `variant_cost`).
- **Paso 2 (Subir y Comparar)**: Zona de carga drag & drop para el archivo CSV modificado. Analiza cambios de precio, costo y existencias, muestra una previsualización detallada con flechas de comparación e historial de ajustes, y sincroniza los cambios en Dexie y Google Sheets.
- **Optimización UX/UI Móvil y Computador**:
  - Modal ampliado a `size="3xl"` (`max-w-3xl` / 768px), eliminando la compresión horizontal y la barra de desplazamiento forzada.
  - Corrección de corte de texto en el título del Paso 1 con ícono visual en badge y botón estilizado con interacción táctil.
  - Zona de arrastre (Dropzone) espaciosa con chips guía de columnas requeridas (`variant_sku`, `variant_stock`, `variant_price`, `variant_cost`).
  - Previsualización de cambios en tarjetas comparativas limpias con tachado de precio/costo anterior y resaltado verde de nuevos valores.
  - Botones de pie de página responsivos (`flex-col-reverse sm:flex-row`) con altura táctil adecuada.

### E. Centro de Herramientas y Diagnóstico (`ToolsModal.tsx`) (100% Completado)
- **Eliminación de módulos obsoletos y redundancias**:
  - Se removió "Cargar desde Texto" (inseguro/redundante) y "Reparar IDs Duplicados" (parche obsoleto).
  - Se retiró la tarjeta redundante de "Fusionar en Catálogo" del modal (ya que el usuario cuenta con el interruptor directo en la barra de filtros principal).
  - Se eliminó el botón duplicado de "Filtrar productos sin foto": ahora el recuadro "Sin Foto" actúa directamente como botón de filtro con enlace visual "Ver lista →".
- **Mejora de UX/UI Móvil y Computador**:
  - Soporte de tamaño `max-w-3xl` (768px) en `Modal.tsx` para evitar que el contenido se sienta apretado y eliminar el scroll vertical en pantallas de escritorio.
  - Distribución simétrica en 2 columnas amplias (`sm:grid-cols-2`) para los botones de administración (*Bitácora de Auditoría* y *Restaurar Respaldo*), con áreas de clic generosas (>44px) y efectos táctiles reactivos en móviles.
  - Tarjetas de diagnóstico equilibradas con alturas armónicas para escritorio y apilamiento natural en dispositivos móviles.

### F. Rediseño Minimalista de la Vista Móvil (`MobileBottomNav.tsx`, `Header.tsx`, `FilterBar.tsx`) (100% Completado)
- **Header Ultra-Compacto de 1 Fila (48px)**:
  - Isotipo `Sparkles` y marca mínima, selector de vista (Grid/List) y chip de rol con candado de bloqueo.
  - Libera más de 100px de espacio vertical en pantallas pequeñas.
- **Barra de Filtros y Drawer Móvil**:
  - Barra superior slim con buscador de texto y botón `[ Filtros (N) ]`.
  - Drawer deslizante inferior (Bottom Sheet) que contiene orden de fotos, interruptores (*Disponibles*, *Ocultos*, *Fusionar*) y selección de series/hints sin tapar el catálogo.
- **Barra de Navegación Inferior (Bottom Bar)**:
  - Accesos directos al alcance del pulgar: *Catálogo*, botón central destacado *Venta Rápida*, botón *Añadir* y menú *Más*.
  - Menú *Más* tipo Bottom Sheet que agrupa ordenadamente las herramientas de administración, sincronización con Google Sheets, respaldo JSON y exportaciones.
- **Área Visual de Catálogo**: Se redujo la ocupación de controles fijos de más del 55% a menos del 15% de la pantalla vertical en smartphones.

### G. Adaptación de Imagen al Alto Total en Vista de Lista (`ProductCard.tsx`) (100% Completado)
- **Alineación elástica (`items-stretch`)**: La tarjeta de producto en modo lista pasó de `items-center` a `items-stretch`, unificando la altura de la columna de imagen y la columna de datos.
- **Contenedor auto-extensible (`self-stretch h-full`)**: El contenedor de imagen eliminó la restricción de altura fija (`h-28`), estirándose de borde a borde vertical con esquinas redondeadas (`rounded-l-xl`).
- **Ajuste `object-cover` sin distorsión**: La fotografía llena el 100% del lateral izquierdo cubriendo el alto completo de la tarjeta tanto en móviles (`w-28`) como en computadoras (`sm:w-36`), recortando suavemente los bordes sobrantes sin deformarse.

### H. Cajón Deslizante Inferior (Bottom Sheet) para Variantes en Móviles (`ProductCard.tsx`) (100% Completado)
- **Diagnóstico del Menú Flotante**: En CSS, cualquier ancestro con `backdrop-filter` (como el `backdrop-blur-sm` de las tarjetas) genera un nuevo bloque de contención para elementos con `position: fixed`, provocando que el cajón quedara atrapado dentro de la tarjeta y flotara sobre ella.
- **Solución con React Portal (`createPortal`)**: El cajón móvil se renderiza directamente en `document.body` utilizando `createPortal`, desvinculándose de los límites y efectos visuales de la tarjeta de producto.
- **Sincronización de Breakpoint (`< md` / 768px)**: Se ajustó el selector a `md:hidden` para la vista móvil y `hidden md:block` para la vista de escritorio, alineándose perfectamente con el comportamiento del encabezado y la barra de navegación inferior (`MobileBottomNav.tsx`).
- **Experiencia de Cajón Nativo Móvil**:
  - Despliegue suave desde el fondo de la pantalla con animación elástica `@keyframes slideUp` y backdrop oscuro oscureciendo el 100% del viewport.
  - Barra de arrastre táctil superior y botón de cierre `X`.
  - Título del producto con badge de variantes disponibles.
  - Lista táctil ergonómica con miniaturas de fotos, nombres de variantes, estados de stock y precios legibles en verde.
  - Al pulsar una variante con foto asignada, actualiza la imagen de la tarjeta principal reactivamente y permite cerrar tocando fuera o en la `X`.
- **Modo Flotante en Computador (`hidden md:block`)**: Mantiene el popover clásico anclado con límite de ancho responsivo y sin desbordes.

### I. Reestructuración UX/UI Móvil del Panel Financiero (`FinancialPanel.tsx`) (100% Completado)
- **Navegación Focalizada por Pastillas (Sticky Segmented Tabs)**:
  - Se eliminó el scroll vertical de más de 3.000px dividiendo el panel en 4 vistas temáticas enfocadas:
    1. 📦 **Bodega**: Valorización del stock físico, capital invertido, PVP comercial, margen potencial proyectado y alerta de variantes sin costo.
    2. 📊 **Rendimiento**: Selector rápido de fechas con chips y las 5 métricas del período (Ingresos, COGS, Margen Bruto, Beneficio Neto, Ticket Promedio).
    3. 🏷️ **Análisis**: Ranking de ventas por Franquicia / Serie vs Categorías y Top 5 productos más rentables.
    4. 📝 **Movimientos**: Auditoría cronológica de transacciones con buscador en tiempo real, filtros y subtotales.
    5. 👁️ **Ver Todo**: Visible en escritorio (`hidden md:inline-flex`) para usuarios que deseen supervisión integral simultánea.
- **Header Móvil Minimalista (48px)**:
  - Botón táctil circular `[ ← ]`, título conciso "Finanzas & Bodega" en una sola línea, botón de acción rápida `[ + Gasto ]` y menú desplegable `[ ⋮ ]` para exportar o importar CSV sin abarrotar la pantalla.
- **Selector de Período en Chips Deslizables**:
  - Reemplazo del selector tosco por chips táctiles horizontales (*Este Mes*, *Mes Pasado*, *Últimos 30d*, *Trimestre*, *Este Año*, *Personalizado*) con selectores de fecha limpios.
- **Tarjetas Táctiles Móviles para Movimientos (`md:hidden`)**:
  - Reemplazo de la tabla de 8 columnas por tarjetas ergonómicas con tipo de transacción, timestamp, producto, variante, delta de stock, monto en verde/rojo y botón directo de comprobante/ticket por correo.
- **Botón Flotante de Acción Rápida (FAB)**:
  - Botón emergente `[ + Gasto / Ingreso ]` fijado en la esquina inferior derecha para registro manual instantáneo desde cualquier vista.
