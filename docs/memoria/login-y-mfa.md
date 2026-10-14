# Login, roles y verificación en dos pasos

> Movido tal cual desde CLAUDE.md el 14/10/2026 (CLAUDE.md quedó como índice). Los "ver más abajo / arriba" se refieren al CLAUDE.md original: buscá con grep en docs/memoria/.

## Login y roles
- Supabase Auth (email + contraseña)
- Auto-registro (`registro.html`): busca el CUIL; si matchea, pre-completa datos; si no, completa a mano. Crea la cuenta de Auth y una fila en `solicitudes_acceso` pendiente — todo vía Edge Function `crear-solicitud-acceso` (service role, atómico con rollback), nunca insert directo desde el cliente.
  - **El paso del CUIL YA NO llama a la RPC directa** (`f49bdd9`, 16/09/2026). `buscarEmpleadoPorCuil(cuil, captchaToken)` de `js/auth.js` invoca la **Edge Function `buscar-empleado-cuil`** (v1, `verify_jwt: true`, igual que `crear-solicitud-acceso`: el cliente le manda la key pública como Bearer, sin sesión). La función exige un token de Turnstile **antes** de consultar, y recién ahí llama a `buscar_empleado_por_cuil` con `service_role`. Devuelve `{ ok, empleado: { nombre, rol } | null }`; los rechazos del CAPTCHA traen `esErrorCaptcha: true` y el cliente les pone un mensaje propio, distinto del genérico. Por qué existe: ver el pendiente cerrado en Seguridad.
  - **`registro.html` tiene TRES widgets de Turnstile, no dos**, con render explícito y un `widgetId` cada uno: el del CUIL (`#turnstile-cuil`) y uno por formulario de solicitud. **El del CUIL se renderiza AL CARGAR la página y los otros dos al mostrarse su paso**, y no es una inconsistencia: `#paso-cuil` está visible desde el arranque, mientras que un widget dentro de un contenedor `[hidden]` puede no ejecutar el desafío. "Unificarlo" renderizándolo al mostrar su paso lo dejaría sin dibujar nunca, porque ese paso nunca se "muestra". Se lanza sin `await` —con su `.catch`— para no frenar el resto de la página mientras carga Cloudflare; hasta entonces `tokenDe()` devuelve `''` y "Buscar en la base" pide *"Esperá a que termine la verificación de seguridad."*. El botón valida primero el CUIL y después exige el token, y en el `catch` hace `reset()` **de ese widget**: el token es de un solo uso.
  - **`crear-solicitud-acceso` (v5, `f49bdd9`) valida `<` y `>` en `nombre`, `apellido` y `email` ANTES de Turnstile y de crear la cuenta**, con un 400 cuyo mensaje nombra el campo. Antes se creaba la cuenta, fallaba el insert por `chk_solicitud_texto_sin_html`, se borraba la cuenta y la persona leía *"Probá de nuevo en unos minutos"* — falso: reintentar fallaba siempre.
    - **Red de último recurso:** si el insert igual falla, se devuelve el mensaje específico **solo si el error es `23514` Y nombra `chk_solicitud_texto_sin_html`** (en `message` o `details`); la cuenta se revierte igual. **Exige las dos cosas a propósito:** con solo el código, cualquier otro CHECK que se agregue mañana y falle con `23514` daría un mensaje sobre `<` y `>` que no tiene nada que ver. Cualquier otro error sigue con el genérico, que ahí sí es honesto.
    - **Mínimo de contraseña: 10** (era 6). La función lo tiene en una constante local, `LARGO_MINIMO_CONTRASENA`, **copia de la de `js/utils.js`** —una Edge Function no puede importarla—: si se cambia una, se cambia la otra, y las dos siguen al mínimo configurado en el panel de Auth, que es el que manda.
    - **En el camino con match el nombre sale de `empleados` y la persona no lo puede editar**, así que un empleado con `<` o `>` en el nombre no podría registrarse. Verificado el 16/09/2026: ninguno los tiene (está anotado en el código con la consulta).
- Rechazo de una solicitud: Edge Function `rechazar-solicitud-acceso` (no es una RPC de Postgres) — además de marcar la solicitud como rechazada, borra la cuenta de Auth huérfana asociada para que la persona pueda volver a registrarse con el mismo email. Reemplazó a una RPC vieja del mismo nombre (con guión bajo) que no hacía ese borrado — esa RPC ya no existe, fue eliminada con `DROP FUNCTION`.
- Aprobación de solicitudes y edición de permisos/roles de otros usuarios: **exclusivo de `super_admin`**. `modulos/accesos.html` es soloSuperAdmin.
- Roles (`empleados.rol_app`): solo DOS valores — `super_admin` (control total, bypass automático de todos los chequeos; se asigna solo por SQL directo, nunca desde ninguna UI) y `usuario` (lo que puede hacer lo definen sus tareas en `empleado_tareas`). El rol `admin` YA NO EXISTE — ver sección Sistema de permisos. **Desde el 31/08/2026 lo garantiza la BASE y no solo el código**: el CHECK `empleados_rol_app_check` es `rol_app = any(array['super_admin','usuario'])`, verificado con `pg_get_constraintdef`. Era el último pendiente estructural de la migración de permisos.
- Rescate de MFA: Edge Function `quitar-mfa-empleado`. Un super_admin le da de baja TODOS los factores TOTP a otra persona que perdió su dispositivo. Sin esto la única salida sería tocar la base a mano, porque Supabase no tiene códigos de recuperación. Recibe `empleado_id` (NO el auth_user_id). Valida, en orden: sesión válida → `rol_app = 'super_admin'` → **sesión en aal2** → body con `empleado_id` → esa persona tiene `auth_user_id` → no es uno mismo. Borra todos los factores (un factor vivo la sigue trabando); un borrado parcial devuelve error, no éxito.
  - Rescatar a OTRO super_admin está permitido a propósito: es el caso de uso principal, los super_admin se rescatan entre ellos.
  - **PRECONDICIÓN OPERATIVA, no es un bug**: exigir aal2 significa que un super_admin SIN MFA propio no puede rescatar a nadie (su sesión es aal1 y la función lo rechaza). Sumado a que no se permite el auto-rescate, hacen falta **DOS super_admin con MFA activo** para que este circuito sirva. Si solo una persona tiene MFA y pierde el dispositivo, no hay rescate posible desde la app. Es la decisión de seguridad correcta: sin el requisito de aal2, una sesión robada podría desactivarle el MFA a todo el equipo.
  - El claim `aal` se lee decodificando el payload del token DESPUÉS de que `getUser()` lo validó contra el servidor de Auth. Eso es seguro y el archivo lleva un comentario largo explicando por qué, para que nadie lo "arregle" mal: la verificación fuerte ya ocurrió en `getUser()`; decodificar después un token ya probado no es confiar en un token sin verificar. Quitar el `getUser()` y dejar solo el decode SÍ sería un agujero grave. Si el claim no viene, se asume aal1 y se rechaza — la doc dice "JWTs without an `aal` claim are at the `aal1` level".
  - El botón está en `modulos/accesos.html`, en la tarjeta de cada persona de "Usuarios y roles". Su condición es INDEPENDIENTE de `puedeEditar` (que sigue gateando solo a "Editar", porque un super_admin no edita permisos de otro). Si colgara de `puedeEditar` sería imposible rescatar a un super_admin, que es justamente el caso principal. Lo único que se excluye es la tarjeta propia.
- Tablets de fábrica: **una cuenta por fábrica** (`empleados.es_dispositivo`, hoy tres) que entra derecho a la planta de Producción, y adentro cada persona se identifica con su PIN (ver el módulo Producción).
- **CORTAR LAS SESIONES DE ALGUIEN (27/09/2026; la base la armó el chat de arquitectura, verificado contra `pg_get_functiondef` ese día):**
  - **`empleados.sesiones_revocadas_en`** (timestamptz) y **`mi_empleado_id()` devuelve NULL** si la persona está inactiva **o** si el token se emitió antes de ese corte (`auth.jwt()->>'iat'`). Como casi todas las policies y RPCs pasan por `mi_empleado_id()` o `tiene_tarea*`, un token viejo que siga vivo deja de servir para todo.
  - **`cerrar_sesiones(p_empleado_id, p_motivo)`** → `{sesiones_cerradas}`: un super_admin con cualquiera, o cada uno consigo mismo; motivo de 3 letras o más; marca el corte, **borra las sesiones de `auth.sessions`** (el refresh deja de andar) y escribe `registro_seguridad`. **`sesiones_de(p_empleado_id)`** → `(creada, ultima_actividad, dispositivo, ip)`: la propia persona o un super_admin. `dispositivo` es el user agent: **lo manda quien se conecta, así que se escapa siempre.**
  - **`registro_seguridad`** (id, empleado_id, accion, motivo, hecho_por, hecho_en): SOLO policy de SELECT para super_admin; lo escribe la base.
  - **La pantalla** (`js/sesiones.js`, `f0bcbf9`): la lista con el dispositivo legible ("Chrome en Android", "Safari en iPhone", "Edge en Windows"; lo que no es un navegador, "Otro programa"), la última actividad y la IP; "Cerrar todas sus sesiones" / "Cerrar todas mis sesiones" **en rojo, con motivo y una confirmación**; los errores de la base TAL CUAL. **Cerrar las propias avisa que también cierra la actual** y después va al login con **"Tu sesión fue cerrada. Volvé a iniciar sesión."** (`sesionCortada()` de `js/salud.js`, que deja el aviso para `login.html`).
  - **Dónde:** Accesos ("Sesiones" en la tarjeta de CADA usuario, solo super_admin), el menú de perfil del dashboard y la barra lateral ("Mis sesiones").
  - **Cuando el corte llega solo** (a otra persona le cerraron las sesiones, o se la dio de baja): `js/salud.js` ve que la base no identifica al usuario (una RPC que falla con "No se pudo identificar tu usuario") o que Auth ya no tiene la sesión, intenta renovar, y si no puede **va al login con el mismo aviso**. Un corte de RED nunca manda al login: dice "Sin conexión, reintentando…".
- **TOTP OBLIGATORIO PARA SUPER_ADMIN: NO está implementado**, a propósito; los pasos para Facu están en `.claude/traspasos/2026-09-27-cobranzas-admin.md`.

## Verificación en dos pasos (MFA / TOTP) — agosto 2026

MFA es OPCIONAL por usuario: quien no lo activa entra como siempre. TOTP es gratis y viene habilitado por defecto en todos los proyectos de Supabase.

**NO EXISTEN CÓDIGOS DE RECUPERACIÓN.** La referencia de Auth MFA lo dice textual: "Recovery codes are not supported". El único respaldo posible es dar de alta un segundo dispositivo (máximo 10 factores por usuario). Todo el diseño de la UI y la existencia de la Edge Function de rescate salen de acá — no buscar una API de recovery codes, no la hay.

Otras dos consecuencias del diseño de Supabase, ambas visibles para el usuario:
- Verificar un factor CIERRA todas las demás sesiones de esa persona.
- Dar de baja un factor NO degrada el JWT de aal2 a aal1 hasta el próximo refresco automático; hace falta `refreshSession()` explícito.

### Chequeo de nivel (AAL) — `js/auth.js`, dentro de `verificarSesion()`

Va después del `getSession()` y ANTES de los dos returns de redirección. Vive ahí, y no en cada pantalla, para que proteja automáticamente a **las 16 páginas** que llaman a `verificarSesion()` — **incluidos los 10 módulos**, Cheques y Producción entre ellos — sin que ninguna tenga que acordarse. (Re-contado el 22/09/2026 con grep; eran 11 y 6 cuando se escribió esto, y 14 y 8 el 16/09. Que un módulo nuevo quede protegido **sin escribir una línea** es exactamente para lo que el chequeo vive en `verificarSesion()` y no en cada pantalla.)

- Condición para exigir el segundo factor: `nextLevel === 'aal2' && nextLevel !== currentLevel`
- **Falla CERRADA**: si `getAuthenticatorAssuranceLevel()` devuelve error, se exige el factor igual. No saber el nivel no es "seguí de largo".
- Corre SOLO si hay sesión. index.html, login.html, registro.html y recuperar-contrasena.html llaman con `redirigirSiNoHay:false`; sin este guard un visitante anónimo entrando a la home terminaría rebotando contra mfa.html.
- No redirige si ya estamos en mfa.html (se compara por `pathname`, no por string suelto, para que funcione igual en GitHub Pages que en local).
- Va ANTES de los returns a propósito: si fuera después, una sesión con el factor pendiente que abre login.html saltaría primero al dashboard por `redirigirSiHay` y recién de ahí a mfa.html.

`restablecer-contrasena.html` NO llama a `verificarSesion()` (maneja su propia sesión de recuperación), así que el reseteo de contraseña no queda bloqueado. Termina redirigiendo a dashboard.html, donde el chequeo sí corre.

### Funciones de MFA en `js/auth.js`

- `listarFactoresMfa()` → solo los factores TOTP con `status === 'verified'`.
- `iniciarAltaMfa(nombreAmigable)` → `{ factorId, qrCode, secret }`. El `qrCode` viene en SVG, va directo al `src` de un `<img>`. Antes de crear el factor nuevo da de baja los `unverified` colgados: `enroll()` crea la fila apenas se lo llama, y si la persona abandona el modal esa fila queda para siempre haciendo chocar el reintento con `mfa_factor_name_conflict`. NUNCA toca un factor `verified`.
- `verificarCodigoMfa(factorId, codigo)` → `challenge()` + `verify()`. Sirve tanto para completar el alta como para el desafío al entrar. El challenge se crea al verificar y no al abrir la pantalla: tiene expiración propia.
- `darDeBajaMfa(factorId)` → `unenroll()` + `refreshSession()`.

**Los errores de MFA se traducen por `error.code`, no por el texto del mensaje** (`_traducirErrorMfa`). Los códigos son contrato público documentado de Supabase; el texto no. Si el código no viene, cae al genérico y loguea a consola. Dos códigos que importan por UX y no solo por traducción:
- `mfa_ip_address_mismatch`: el alta tiene que empezar y terminar en la misma IP. En celular, pasar de WiFi a datos móviles en el medio la rompe. El mensaje traducido lo explica con esas palabras.
- `mfa_factor_name_conflict`: dos factores del mismo usuario no pueden tener el mismo nombre. Por eso el alta pide un nombre de dispositivo editable.

### `mfa.html` — pantalla del desafío al entrar

Misma estructura visual que login (`.pagina-auth` + `.tarjeta-auth`). Sin CAPTCHA: el usuario ya pasó el login. Tres salidas posibles:
- Sesión ya en `aal2` → al dashboard (alguien entró a la URL a mano).
- Hay factores verificados → pide el código de 6 dígitos.
- NO hay factores verificados → mensaje sin salida + botón de cerrar sesión. **NO redirige.** Ver el aprendizaje sobre bucles de redirección.

Un código mal tipeado NO cierra la sesión: se limpia el campo y se reintenta.

### Alta desde `dashboard.html` (menú de perfil → "Verificación en dos pasos")

Modal con dos estados: sin factor (aviso + nombre de dispositivo + Activar → QR + secreto + código) y con factor (lista + "Agregar otro dispositivo"). NO hay botón de desactivar.

El aviso previo al alta es obligatorio y explícito porque no hay recovery codes: "Guardá el código de texto en un lugar seguro y escaneá el QR en un segundo dispositivo. Si perdés el único dispositivo, no vas a poder entrar."

PENDIENTE DE CONFIRMAR: no está documentado si `listFactors()` devuelve `created_at`. La columna existe en `auth.mfa_factors`, pero la API puede no devolverla. El código muestra la fecha si viene y solo el nombre si no.

### Pendiente operativo

- **Configurarle MFA al segundo super_admin. SIGUE ABIERTO, y ahora está medido:** al **17/09/2026** hay **UN SOLO factor TOTP verificado en todo el sistema** y **DOS super_admin**. Como el circuito exige aal2 y no permite el auto-rescate, `quitar-mfa-empleado` está desplegada e **inutilizable**: si esa única persona pierde el dispositivo, no hay rescate posible desde la app (ver la precondición en Login y roles).
