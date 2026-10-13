# Corrección de Superposición y Orden de Apilamiento (Z-Index) de Filtros y Tarjetas

## Diagnóstico del Problema
Al agregar soporte para la ventana emergente flotante en las tarjetas, se asignó `z-10` a las tarjetas base (`ProductCard`). Dado que la barra de filtros (`FilterBar`) tenía configurado `sticky top-[89px] z-10`, las tarjetas del catálogo (que están después en el árbol HTML) compartían el mismo índice y se pintaban por encima de la barra de filtros al hacer scroll, ocultando el buscador, las categorías y los desplegables de series y fotos.

## Solución Planificada

### 1. Jerarquía de Apilamiento (Z-Index)
Se establecerá una jerarquía estricta y predecible de capas:
- **Cabecera Principal (`Header.tsx`)**: `z-40` (`sticky top-0`) — se mantiene en la cima absoluta de la página.
- **Barra de Filtros (`FilterBar.tsx`)**: `z-30` (`sticky top-[80px] md:top-[88px]`) con fondo sólido/óptico (`bg-gray-800/95` o `backdrop-blur-md`) — garantiza que el buscador, etiquetas de categorías y botones permanezcan siempre por encima de las tarjetas al scrollear.
- **Desplegables de Filtros (`Series / Hints` y `Selector de Fotos`)**: `z-40` — se abren por encima de la barra de filtros y nunca son tapados por ningún elemento inferior.
- **Tarjetas de Productos (`ProductCard.tsx`)**:
  - Estado normal: `z-0` (apilamiento base).
  - Estado con ventana emergente de variantes abierta: `z-20` (superior a las tarjetas hermanas en la cuadrícula, pero inferior a la barra de filtros `z-30`).
- **Modales del Sistema (`Modal.tsx`)**: `z-50` — permanecen en primer plano sobre todo lo demás.

### 2. Archivos a Modificar
1. **`components/FilterBar.tsx`**:
   - Actualizar los contenedores principales (estado normal, modo fusión y selección múltiple) de `z-10` a `z-30`.
   - Asegurar que los desplegables internos de `Series / Hints` y `Filtro de Fotos` tengan `z-40`.
2. **`components/Header.tsx`**:
   - Actualizar la cabecera de `z-20` a `z-40`.
3. **`components/ProductCard.tsx`**:
   - Ajustar el z-index de la tarjeta: `${showVariantsDropdown ? 'z-20' : 'z-0'}` en lugar de `z-10` por defecto.

## Verificación
- Desplazarse por el catálogo hacia abajo y verificar que las tarjetas pasen limpiamente por debajo de la barra de filtros.
- Abrir el desplegable de Series/Hints y el de Fotos mientras se hace scroll; verificar que se vean 100% nítidos sobre las tarjetas.
- Abrir la ventana emergente de variantes en una tarjeta y verificar que flote sobre su tarjeta vecina sin interferir con la barra de filtros.
- Ejecutar `compile_applet` y `lint_applet` para confirmar la integridad del código.
