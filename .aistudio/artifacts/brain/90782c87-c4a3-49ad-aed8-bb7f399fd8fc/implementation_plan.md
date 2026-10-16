# Implementación: Fase 2 - Normalización y Persistencia de Variantes en la App Web

## Resumen de Cambios Aplicados

### 1. Preservación y Conciliación Bidireccional de `imageUrl` (`contexts/AppContext.tsx`)
- **Problema abordado**: Al sincronizar con Google Sheets, si la hoja no devolvía la URL de la variante o venía incompleta, la base de datos local sobrescribía la variante eliminando la referencia fotográfica vinculada.
- **Solución implementada**:
  - **Mapeo preventivo en memoria**: Antes de procesar los datos entrantes de Sheets, se lee la base de datos local (`db.products`) y se indexan todos los `imageUrl` existentes por ID de variante (`localVariantImageMap`).
  - **Normalización inteligente**:
    ```typescript
    const remoteImageUrl = String(v.imageUrl || v.imagenUrl || v.fotoRef || v.image_url || '').trim();
    const localImageUrl = localVariantImageMap.get(String(v.id)) || '';
    const finalImageUrl = remoteImageUrl || localImageUrl;
    ```
    Si la variante ya tenía una foto vinculada en la app, se preserva automáticamente incluso si Sheets todavía no envía esa columna.
    Si Sheets envía una nueva URL (mediante `imageUrl`, `imagenUrl`, `fotoRef` o `image_url`), se adopta y actualiza.
  - **Guardado atómico en IndexedDB**: `db.products.bulkPut(normalizedProducts)` escribe cada variante con su `imageUrl` definitivo.

### 2. Estado de Compilación y Verificación
- Cero advertencias ni errores en `tsc --noEmit` y `compile_applet`.
- Las fotos vinculadas a variantes se mantienen permanentes en recargas, filtros y sincronizaciones.
