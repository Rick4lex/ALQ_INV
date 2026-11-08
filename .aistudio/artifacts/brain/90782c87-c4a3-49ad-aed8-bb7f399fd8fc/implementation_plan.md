# Plan de Implementación: Autenticación, Roles y Bloqueo por Inactividad (Alquima Mizu)

Plan de arquitectura y despliegue para integrar autenticación segura mediante tokens generados por Google Apps Script, gestión de roles (*Administrador* y *Vendedor*), temporizador de inactividad y pantalla de acceso con el logo oficial, 100% compatible con sitios estáticos en GitHub Pages.

---

## Decisiones Críticas y Confirmación

> [!IMPORTANT]
> **Hosting Estático en GitHub Pages**: Al no contar con un servidor Node.js privado, la seguridad reside en que Google Apps Script valide las credenciales y firme los tokens de sesión. Ninguna clave o secreto reside en el código público de GitHub.

- **Servidor de Autenticación**: Google Apps Script existente (`syncService.ts`).
- **Gestión de Secretos**: *Propiedades de la secuencia de comandos* (`ScriptProperties`) en Apps Script.
- **Roles del Sistema**:
  - `admin`: Acceso irrestricto (Catálogo, Venta Rápida, Panel Financiero, Costos, Edición y Sincronización Remota).
  - `vendedor`: Acceso operativo (Catálogo de productos y módulo de Venta Rápida; costos de compra y márgenes de ganancia ocultos; panel financiero bloqueado).
- **Control de Inactividad**: Temporizador en memoria (15 minutos) que escucha actividad en el navegador (`mousemove`, `keydown`, `touchstart`). Al expirar, bloquea la vista y requiere reingresar credencial.

---

## 1. Paso a Paso en Google Apps Script

### Paso 1.1: Configurar las Contraseñas en Apps Script
En el editor de Google Apps Script de tu hoja:
1. Haz clic en el ícono de engranaje **Configuración del proyecto** (barra lateral izquierda).
2. Baja hasta **Propiedades de la secuencia de comandos**.
3. Añade las siguientes propiedades clave-valor:
   - `ADMIN_PIN`: (Tu PIN privado de Administrador)
   - `SELLER_PIN`: (Tu PIN privado de Vendedor)
   - `TOKEN_SECRET`: (Tu frase secreta privada para firma criptográfica)

### Paso 1.2: Lógica de Validación y Emisión de Token en `Código.gs`
Agrega las funciones de autenticación en tu script de Google Apps Script:

```javascript
/**
 * Procesa la acción LOGIN y emite un token de sesión temporal.
 */
function handleLogin(payload) {
  var props = PropertiesService.getScriptProperties();
  var adminPin = props.getProperty('ADMIN_PIN');
  var sellerPin = props.getProperty('SELLER_PIN');
  var secret = props.getProperty('TOKEN_SECRET');

  var pin = String(payload.pin || '').trim();
  var requestedRole = payload.role; // Opcional, o inferido del PIN

  var authenticatedRole = null;
  if (pin === adminPin) {
    authenticatedRole = 'admin';
  } else if (pin === sellerPin) {
    authenticatedRole = 'vendedor';
  }

  if (!authenticatedRole) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'PIN o contraseña incorrecta.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Vigencia de 12 horas
  var expiresAt = new Date().getTime() + (12 * 60 * 60 * 1000);
  var rawData = authenticatedRole + '|' + expiresAt;
  var signature = Utilities.computeHmacSha256Signature(rawData, secret);
  var token = Utilities.base64Encode(rawData) + '.' + Utilities.base64Encode(signature);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    token: token,
    role: authenticatedRole,
    expiresAt: expiresAt,
    userEmail: authenticatedRole === 'admin' ? 'cfb.dig@gmail.com' : 'vendedor@alquima.local'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Valida si un token recibido en el payload es legítimo y no ha expirado.
 */
function validateSessionToken(token, requiredRole) {
  if (!token) return { valid: false, message: 'Token no suministrado.' };
  
  var parts = token.split('.');
  if (parts.length !== 2) return { valid: false, message: 'Formato de token inválido.' };

  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('TOKEN_SECRET') || 'default_secret_key_mizu';

  var rawData = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
  var dataParts = rawData.split('|');
  var role = dataParts[0];
  var expiresAt = parseInt(dataParts[1], 10);

  if (new Date().getTime() > expiresAt) {
    return { valid: false, message: 'El token ha expirado. Inicia sesión nuevamente.' };
  }

  var expectedSignature = Utilities.computeHmacSha256Signature(rawData, secret);
  var expectedSigBase64 = Utilities.base64Encode(expectedSignature);

  if (expectedSigBase64 !== parts[1]) {
    return { valid: false, message: 'Firma de token alterada o inválida.' };
  }

  if (requiredRole && requiredRole === 'admin' && role !== 'admin') {
    return { valid: false, message: 'Acceso denegado: se requieren permisos de Administrador.' };
  }

  return { valid: true, role: role };
}
```

### Paso 1.3: Integración en `doPost(e)`
En el enrutador de tu `doPost(e)`:
```javascript
function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action;

    if (action === 'LOGIN') {
      return handleLogin(data);
    }

    // Para acciones sensibles como guardar base de datos completa:
    if (action === 'SAVE_DATA') {
      var authCheck = validateSessionToken(data.token, 'admin');
      if (!authCheck.valid) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: authCheck.message
        })).setMimeType(ContentService.MimeType.JSON);
      }
      // Proceder con el guardado...
    }

    // Otras acciones (LOAD_DATA, SEND_SALE_RECEIPT)...
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 2. Experiencia de Usuario y Diseño de la Pantalla de Login

### Composición Visual
- **Fondo**: `bg-gray-950` con un degradado sutil en tonos púrpura (`radial-gradient` en tonos `#7C3AED/10`).
- **Logo Oficial**: `https://res.cloudinary.com/dyeppbrfl/image/upload/v1787511255/copy_of_826fb604-b81c-438a-ab3e-e2cc5f95f40a.png` renderizado a 80x80px con halo luminoso púrpura (`ring-2 ring-purple-500/40 shadow-xl shadow-purple-900/40 rounded-2xl`).
- **Selector de Rol**:
  - Botones tipo pastilla o pestañas: `[ Administrador ]` y `[ Vendedor ]`.
- **Formulario**:
  - Campo PIN / Contraseña con visibilidad alternable (icono de ojo).
  - Teclado numérico rápido opcional para tablets / puntos de venta físicos.
  - Botón de ingreso con estado animado de carga (`Loader2`).

### Wireframe de la Pantalla

```text
┌────────────────────────────────────────────────────────┐
│                                                        │
│                    ┌──────────────┐                    │
│                    │  [  LOGO  ]  │  (Alquima Mizu)    │
│                    └──────────────┘                    │
│                     ALQUIMA  MIZU                      │
│             Gestor de Catálogo e Inventario            │
│                                                        │
│       ┌────────────────────────────────────────┐       │
│       │       [ Vendedor ]   [ Admin ]         │       │
│       ├────────────────────────────────────────┤       │
│       │                                        │       │
│       │  PIN o Contraseña                      │       │
│       │  ┌──────────────────────────────────┐  │       │
│       │  │  ••••                            │  │       │
│       │  └──────────────────────────────────┘  │       │
│       │                                        │       │
│       │  ┌──────────────────────────────────┐  │       │
│       │  │       INGRESAR AL SISTEMA        │  │       │
│       │  └──────────────────────────────────┘  │       │
│       │                                        │       │
│       │  🔒 Conexión segura vía Google Cloud   │       │
│       └────────────────────────────────────────┘       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Arquitectura en el Frontend

```text
┌──────────────────────────────────────────────────────────────┐
│                    App.tsx (Root Wrapper)                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
     ¿Sesión activa y válida?        Sesión no iniciada o caducada
                │                             │
                ▼                             ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │ Interfaz Principal   │       │ LoginView.tsx        │
    │ (Header, Catálogo,   │       │ (Logo, Rol, PIN,     │
    │  QuickSale, etc.)    │       │  Auth con AppsScript)│
    └──────────┬───────────┘       └──────────────────────┘
               │
               ├─► Hook useInactivityTimer (15 min) ──► Bloquea si inactivo
               │
               └─► Control de Roles:
                   ├─► Vendedor: Oculta Panel Financiero y Costos
                   └─► Admin: Acceso integral a todas las herramientas
```

---

## 4. Fases de Ejecución Recomendadas (para cuando autorices implementar)

1. **Fase 1**: Configurar el endpoint en Google Apps Script (`handleLogin` y `validateSessionToken`) y registrar los PINs en `ScriptProperties`.
2. **Fase 2**: Crear `contexts/AuthContext.tsx` y el hook `hooks/useInactivityTimer.ts` para persistir el token en `sessionStorage` y controlar la inactividad de 15 minutos.
3. **Fase 3**: Diseñar el componente `components/LoginView.tsx` con el logo oficial de Alquima Mizu, selector de rol y validación reactiva.
4. **Fase 4**: Condicionar vistas sensibles (ocultar botón y vista de *Panel Financiero* cuando el rol sea `vendedor` y proteger la sincronización con el token).
