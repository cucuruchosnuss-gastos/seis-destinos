# La planta se colgaba al bloquear y desbloquear la tablet (27/09/2026)

## Qué pasó (lo que contó Facu)

Samsung Galaxy Tab A11, la planta instalada desde Chrome y anclada. Andaba bien; al bloquear y desbloquear la pantalla quedó en blanco, con la barra oscura de Chrome de "página fuera de la app" (una X, tres puntitos, el título "Planta — Seis Destinos" y el dominio). Ni la X ni los puntitos respondían. La tablet estaba en VERTICAL. Siguió igual al desanclar y recargar.

## La causa: lo que se verificó y lo que no

No se pudo reproducir en la tablet (no hay un Android en la máquina). Lo que se afirma, con su nivel de evidencia:

### 1. VERIFICADO en Playwright: la planta se quedaba muda en "Cargando…"

Con la planta REAL y el supabase-js real contra un Supabase simulado en la red (`e2e/backend-simulado.js`), se congeló la página como la congela Android (CDP `Page.setWebLifecycleState 'frozen'`), se adelantó el reloj 90 minutos (el token vence) y se volvió **sin red** y **recargando la página** (lo que hace Android cuando descarta una página congelada para liberar memoria):

- **Antes del arreglo**: la planta quedaba en "Cargando…" sobre fondo claro —una pantalla "en blanco"— sin decir nada, mientras el SDK reintentaba renovar el token. Si la red tarda en volver después de desbloquear (el wifi reconectando), eso es exactamente lo que se ve.
- La prueba definitiva (`e2e/6-planta-reanudar.spec.js`) **corrida contra el código de antes da 6 de 8 en rojo** (congelar y volver sin aviso de reanudación, sin red al volver, la recarga sin red, la sesión cortada que se iba a `login.html`, y sin sesión que se iba a `login.html`); las otras 2 (renovar el token vencido con red, girar la tablet) ya andaban y quedan como guarda.

### 2. EVIDENCIA PÚBLICA + UN INDICIO FUERTE: las dos apps reclamaban el mismo alcance (sospecha a)

- `manifest.json` (la app general, `scope "."`) y `manifest.webmanifest` (la planta, `scope "./"`) reclamaban **los dos** `/seis-destinos/`. Hay reportes públicos de que en Android, con dos WebAPKs que reclaman la raíz del sitio, Chrome confunde de qué app es cada URL: "This app is already installed" para todas, páginas que se abren en la app equivocada, la barra de "fuera de la app" ([jormania/app-playground#95](https://github.com/jormania/app-playground/pull/95), [Chrome: scope extensions](https://developer.chrome.com/docs/capabilities/scope-extensions)).
- **El indicio**: la planta forzaba HORIZONTAL (`orientation: landscape`) y Facu la vio en VERTICAL. Si la estuviera mostrando la app de la planta, no podía estar vertical. La app general sí es vertical (`orientation: portrait`) y reclama el mismo alcance: es consistente con que Chrome la estuviera tratando como de la OTRA app, y por eso con la barra de "fuera de la app".
- **No se puede verificar en Playwright** (el escritorio no instala WebAPKs): queda para la prueba en la tablet.

### 3. DESCARTADA para la versión actual: el bloqueo de la sesión entre pestañas (sospecha b)

El SDK que carga la app (`@supabase/supabase-js@2`, que hoy resuelve a la **2.117.2**) **ya no usa el bloqueo entre pestañas por defecto** ("lockless": `GoTrueClient.js` deja `this.lock = null` sin un lock propio; el `navigatorLock` quedó deprecado y, si se usa, roba el bloqueo huérfano a los 5 s). O sea: un bloqueo trabado para siempre no aplica a la versión actual. **Pero** la app pedía "la última 2.x" sin fijarla, así que el comportamiento de la sesión podía cambiar solo; se fijó en 2.117.2.

## Qué se cambió

- **`js/salud.js` (nuevo), instalado por `js/supabase.js` en TODAS las pantallas:**
  - **Registro de errores** con `registrar_error_app(...)` (verificado el 27/09/2026: SECURITY DEFINER, `authenticated` sí, `anon` no, tope de 200 por persona por día; `errores_app` la lee solo un super_admin). Eventos: `error` (window.onerror), `promesa` (unhandledrejection), `rpc` (una RPC que falla; NO los mensajes de negocio `P0001`), `sesion` (la sesión se cortó) y `reanudar` (volver costó o falló). **Nunca** los parámetros de una RPC (PINes, importes), se tapan los números de 4 cifras o más, y la URL va sin `?` ni `#` (el `#` de una recuperación trae un token). Si falla no rompe nada; sin red queda en una cola de 20 en el navegador y se manda después. El mismo error no se repite en un minuto.
  - **Al volver** (`visibilitychange`, `resume`, `pageshow`, `online`): revisa la sesión con tiempo máximo, la renueva si vence en menos de un minuto, y avisa `app:reanudada` para que la pantalla se redibuje EN EL MISMO LUGAR. **Sin red: "Sin conexión, reintentando…"** (arriba, fijo) y reintenta solo (3, 6, 12… hasta 30 s). **Un corte de red nunca manda al login**: solo cuando Auth dice que la sesión ya no existe (refresh inválido, o la página tenía sesión y ya no está), o la base no identifica al usuario y la sesión no se puede renovar (dado de baja / sesiones cortadas) → al login con "Tu sesión fue cerrada. Volvé a iniciar sesión." (esto adelanta el 5c de la tanda).
- **`js/auth.js`**: `verificarSesion()` dice "Sin conexión, reintentando…" si la sesión tarda más de 4 s (antes: "Cargando…" mudo), y manda al login de la pantalla (`<meta name="sd-login">`) o a `login.html`.
- **`js/supabase.js`**: el SDK fijo en `@supabase/supabase-js@2.117.2`.
- **La planta (`modulos/produccion.html`)**:
  - **Su alcance es SOLO su página**: `manifest.webmanifest` pasa a `scope: "modulos/produccion.html"` (más específico que el de la app general, que sigue en `"."`), y `orientation: "any"` (se usa en vertical; las pantallas ya estaban medidas en los dos sentidos). **Cambiar el alcance y la orientación NO se probó en la tablet**; si Facu quiere volver a forzar horizontal, es una línea.
  - **El login de la tablet es la propia página** (la vista `pr-entrar`, con el mismo Turnstile e `iniciarSesion()` de `login.html`): sin sesión, o con la sesión cortada, pide entrar AHÍ, sin ir a `login.html`, que quedaría fuera de su alcance. Ninguna navegación de la planta sale de su alcance, salvo "Soy de la oficina: ir a la gestión", que es para una cuenta personal.
  - **Al arrancar sin red**, los permisos y `mi_sesion_produccion` se reintentan solos con el aviso de conexión (antes: "No pudimos identificar esta cuenta", que se leía como un problema de la cuenta).
  - **Al volver** (`app:reanudada`): se vuelven a leer SOLO las vistas con datos vivos (el tablero, la planilla, la lista de máquinas de Sala de masa) y se reintentan las masas pendientes; el PIN a medio tipear o una masa a medio armar quedan como estaban.
- **`login.html`** muestra "Tu sesión fue cerrada. Volvé a iniciar sesión." cuando viene de un corte.
- **Administración → "Errores de la app"** (solo super_admin): los últimos 300, filtrables por pantalla, dispositivo (en corto: "SM-X135 · Android 14 · app instalada") y tipo, con el detalle plegado.

## Pruebas

- `e2e/6-planta-reanudar.spec.js` — **en cada push** (workflow Navegador), sin credenciales: instalable (`Page.getInstallabilityErrors` vacío, alcance = su página), congelada 5 min, token vencido durante el congelamiento, sin red al volver, la recarga sin red (lo reproducido), girar entre horizontal y vertical, sesión cortada de verdad (el login ADENTRO de la planta), sin sesión. **8/8**; contra el código de antes, 6 en rojo.
- `pruebas/test-salud.js` 52/52 (mut **37/37**); `pruebas/test-administracion-errores.js` 32/32 (mut 18/18 +3 eq.).
- `e2e/0-humo.spec.js`: "la planta sin sesión manda al login" pasó a "pide entrar ahí mismo, sin salir de su página" — **a propósito**.
- La maqueta mira "Errores de la app" con un juego de datos de super_admin (`pruebas/datos-maqueta/administracion-super.js`).

## Lo que NO se probó

- **Nada en la tablet real**: ni la barra de "fuera de la app", ni que el alcance nuevo la saque, ni la instalación con el alcance nuevo, ni el login de la tablet con Turnstile de verdad.
- El registro de errores contra la base real (el conector estaba en solo lectura): las pruebas corren contra un doble.

## Guion para Facu (en la tablet)

1. **Desinstalar la app "Planta" y también la app general "Seis Destinos" si está instalada en esa tablet** (con el alcance nuevo, Chrome tiene que volver a crear la app).
2. Abrir `https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/produccion.html` en Chrome → menú → "Instalar app" (debe decir "Planta"). Entrar con la cuenta de la tablet (si pide mail y contraseña, lo hace en la misma pantalla de la planta, sin barra de Chrome).
3. Con la planta abierta: bloquear la pantalla 5 minutos, desbloquear. Tiene que volver a la misma pantalla. Probar en vertical y en horizontal.
4. Bloquear, cortar el wifi, desbloquear: tiene que decir arriba "Sin conexión, reintentando…"; volver a prender el wifi: el aviso se va solo.
5. Si vuelve a pasar, entrar a **Administración → Errores de la app** (con un usuario super_admin) y filtrar por la pantalla `produccion` y el dispositivo `SM-X135…`: ahí va a estar qué pasó.

## Qué automatizaría ahora

- **El backend simulado en la red (`e2e/backend-simulado.js`) sirve para cualquier pantalla**, no solo la planta: probar el manejo de la sesión (token vencido, sin red, sesión cortada) en Administración, Cobranzas y la gestión es sumar un juego de datos y un spec. Es lo que falta para que el 5c ("sesión cortada → login con aviso") tenga una prueba en navegador en cada pantalla.
