# Actualización del Logo en el Encabezado del Catálogo PDF

Reemplazo del texto e icono "Alquima Mizu" en el encabezado del catálogo PDF generado (`CatalogPage.tsx`) por el logo oficial provisto (`https://res.cloudinary.com/dyeppbrfl/image/upload/v1791854716/Gemini_Generated_Image_ggtjwoggtjwoggtj_zzrvqe.png`).

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> Decisiones confirmadas en la fase de interacción:
> 1. **Ubicación del Logo**:
>    - **Página 1 (Portada Principal)**: Logo oficial a tamaño destacado y centrado, sustituyendo el título tipográfico e icono de destello (`Sparkles`).
>    - **Páginas siguientes (Página 2 en adelante)**: Logo oficial en versión miniatura compacta en la esquina superior izquierda del encabezado, reemplazando el texto pequeño "Alquima Mizu".
> 2. **Subtítulo Institucional**:
>    - Se conserva el texto "*Catálogo Oficial de Productos*" debajo del logo en la portada principal para preservar la identidad editorial del documento.
> 3. **Pie de Página**:
>    - Se mantiene limpio y coherente con el nombre de marca o versión discreta en los metadatos de impresión.

---

### 1. Resumen y Concepto General

- **Estado actual**:
  - En la página 1 del catálogo PDF, el encabezado muestra un icono `Sparkles` morado y un `<h1>` con el texto "Alquima Mizu", seguido del subtítulo "Catálogo Oficial de Productos".
  - En las páginas 2+, muestra un icono `Sparkles` pequeño de 16px junto a "Alquima Mizu • Catálogo Oficial".
- **Nuevo diseño**:
  - En la portada (página 1), el encabezado lucirá el nuevo logo estilizado horizontal (color turquesa menta característico) con altura proporcional (`h-12 md:h-14`, `object-contain`), centrado, con `referrerPolicy="no-referrer"`, acompañado de su texto de respaldo `alt="Alquima Mizu"`.
  - Justo debajo se mantendrá el subtítulo "*Catálogo Oficial de Productos*" y la tira de fecha / conteo de productos.
  - En las páginas subsecuentes (página 2+), la esquina izquierda exhibirá el logo en formato miniatura (`h-5 w-auto object-contain`) garantizando continuidad de marca sin saturar el espacio útil reservado para los productos.

---

### 2. Flujo y Arquitectura del Componente

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CatalogPage.tsx                                 │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  Página 1 (Portada Principal)        │  │  Páginas 2+ (Páginas Siguientes)     │
├──────────────────────────────────────┤  ├──────────────────────────────────────┤
│  [ LOGO OFICIAL ALQUIMA MIZU ]       │  │  [ Logo Miniatura ] • Catálogo...    │
│  h-12 a h-14, object-contain         │  │  h-5 w-auto, object-contain          │
│                                      │  │  Sección activa (badge / título)     │
│  Catálogo Oficial de Productos       │  └──────────────────────────────────────┘
│  Fecha · N° Productos · Sección      │
└──────────────────────────────────────┘
```

---

### 3. Puntos Específicos de Implementación

1. **Definición de Constante del Logo en `CatalogPage.tsx`**:
   - Definir URL constante:
     ```ts
     const ALQUIMA_LOGO_URL = 'https://res.cloudinary.com/dyeppbrfl/image/upload/v1791854716/Gemini_Generated_Image_ggtjwoggtjwoggtj_zzrvqe.png';
     ```

2. **Portada (Página 1)**:
   - Reemplazar el bloque:
     ```tsx
     <div className="flex items-center justify-center gap-2">
       <Sparkles className="h-8 w-8 text-purple-600" />
       <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
         Alquima Mizu
       </h1>
     </div>
     ```
     por:
     ```tsx
     <div className="flex items-center justify-center mb-1">
       <img 
         src={ALQUIMA_LOGO_URL} 
         alt="Alquima Mizu" 
         className="h-12 md:h-14 max-w-[280px] object-contain drop-shadow-sm" 
         referrerPolicy="no-referrer"
       />
     </div>
     ```
   - Conservar el subtítulo "Catálogo Oficial de Productos" y las etiquetas de fecha y cantidad de productos.

3. **Páginas Siguientes (Páginas 2+)**:
   - Reemplazar en el encabezado secundario:
     ```tsx
     <div className="flex items-center gap-2">
       <img 
         src={ALQUIMA_LOGO_URL} 
         alt="Alquima Mizu" 
         className="h-5 w-auto max-w-[120px] object-contain" 
         referrerPolicy="no-referrer"
       />
       <span className="text-xs text-gray-400 font-medium hidden sm:inline">• Catálogo Oficial</span>
     </div>
     ```

4. **Verificación y Pruebas**:
   - Compilación con `compile_applet`.
   - Verificación de tipos y lint con `lint_applet`.
   - Comprobación visual en la vista previa del catálogo dentro del modal de exportación (ambos diseños: 6 productos y 9 productos).
