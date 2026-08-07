import { supabase } from './supabase.js'

const RAIZ_SITIO = new URL('..', import.meta.url).href
const RUTA_LOGIN = new URL('login.html', RAIZ_SITIO).href
const RUTA_DASHBOARD = new URL('dashboard.html', RAIZ_SITIO).href
const RUTA_RESTABLECER_CONTRASENA = new URL('restablecer-contrasena.html', RAIZ_SITIO).href
const RUTA_MFA = new URL('mfa.html', RAIZ_SITIO).href

// El link de "olvidé mi contraseña" no es un ticket de un solo uso: al
// procesarlo, el SDK establece una sesión de Auth REAL y completa para esa
// cuenta (evento PASSWORD_RECOVERY) — indistinguible de un login normal a
// nivel de supabase.auth.getSession(). Si la persona no llega a completar
// el cambio de contraseña (error, cierra la pestaña, vuelve a tocar el
// link), esa sesión queda viva y cualquier página que solo chequee "hay
// sesión → dejar pasar" terminaría logueando a cualquiera que haya podido
// abrir el mail, sin conocer la contraseña real. Esta bandera en
// localStorage (no sessionStorage: tiene que verse desde cualquier pestaña
// o recarga) marca "esta sesión vino de una recuperación sin terminar" —
// restablecer-contrasena.html la limpia recién cuando el cambio de
// contraseña se confirma con éxito. verificarSesion() la revisa primero,
// siempre, así protege automáticamente cualquier página que la llame.
const BANDERA_RECUPERACION = 'sd_recuperacion_pendiente'

export function marcarSesionRecuperacion() {
  localStorage.setItem(BANDERA_RECUPERACION, '1')
}

export function limpiarSesionRecuperacion() {
  localStorage.removeItem(BANDERA_RECUPERACION)
}

// Verifica sesión activa.
// redirigirSiNoHay: redirige a login si no hay sesión (default: true)
// redirigirSiHay: redirige al dashboard si ya hay sesión (default: false)
export async function verificarSesion({ redirigirSiNoHay = true, redirigirSiHay = false } = {}) {
  if (localStorage.getItem(BANDERA_RECUPERACION)) {
    await supabase.auth.signOut()
    limpiarSesionRecuperacion()
  }

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) console.error('Error al verificar sesión:', error.message)

  // ── Segundo factor (MFA/TOTP) ────────────────────────────────────────────
  // Mismo criterio que BANDERA_RECUPERACION: el chequeo vive acá, y no en
  // cada pantalla, para que proteja automáticamente a las 11 páginas que
  // llaman a verificarSesion() —incluidos los 6 módulos— sin que ninguna
  // tenga que acordarse de hacerlo.
  //
  // Corre SOLO si hay sesión. index.html, login.html, registro.html y
  // recuperar-contrasena.html llaman con redirigirSiNoHay:false, y sin JWT no
  // hay nivel que consultar: sin este guard, un visitante anónimo entrando a
  // la home terminaría en mfa.html (que tampoco tiene sesión) y quedaría
  // rebotando.
  //
  // Va ANTES de los dos returns de abajo a propósito. Si fuera después, una
  // sesión con el factor pendiente que abre login.html saltaría primero al
  // dashboard por redirigirSiHay y recién de ahí a mfa.html — dos saltos y un
  // parpadeo del dashboard que no debería llegar a verse.
  if (session && !_estoyEnPantallaMfa()) {
    const { data: nivel, error: errorNivel } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    // Falla CERRADA. Un error acá no significa "seguí de largo": significa
    // "no sé si esta sesión completó su segundo factor", y ante esa duda no
    // se deja pasar. Es el mismo criterio que la Edge Function de registro
    // aplica cuando falta el secret del CAPTCHA.
    const faltaSegundoFactor = !!errorNivel ||
      (nivel?.nextLevel === 'aal2' && nivel.nextLevel !== nivel.currentLevel)

    if (faltaSegundoFactor) {
      if (errorNivel) {
        console.error('[auth] no se pudo determinar el AAL, se exige el segundo factor:', errorNivel.message)
      }
      window.location.replace(RUTA_MFA)
      return null
    }
  }

  if (!session && redirigirSiNoHay) {
    window.location.replace(RUTA_LOGIN)
    return null
  }

  if (session && redirigirSiHay) {
    window.location.replace(RUTA_DASHBOARD)
    return null
  }

  return session
}

// captchaToken: token de Cloudflare Turnstile (ver login.html). Supabase lo
// valida server-side contra Cloudflare cuando "Enable Captcha protection" está
// activo en Attack Protection; si está apagado, lo ignora sin error.
export async function iniciarSesion(email, contrasena, captchaToken) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: contrasena,
    options: { captchaToken },
  })

  if (error) throw new Error(_traducirError(error.message))

  return data.session
}

export async function cerrarSesion() {
  await supabase.auth.signOut()
  window.location.replace(RUTA_LOGIN)
}

// ── Verificación en dos pasos (MFA / TOTP) ───────────────────────────────────
// TOTP viene habilitado por defecto en todos los proyectos de Supabase y no
// tiene costo. NO existen códigos de recuperación: el único respaldo posible
// es dar de alta un segundo dispositivo (máximo 10 factores por usuario). Eso
// condiciona toda la UI de alta — ver el aviso de dashboard.html.

// Devuelve solo los factores TOTP ya verificados. Los 'unverified' son altas
// a medio hacer, no sirven para entrar y no se muestran como si sirvieran.
export async function listarFactoresMfa() {
  const { data, error } = await supabase.auth.mfa.listFactors()

  if (error) throw new Error(_traducirErrorMfa(error))

  return (data?.totp ?? []).filter(factor => factor.status === 'verified')
}

// Devuelve { factorId, qrCode, secret }. El qrCode ya viene como SVG listo
// para meter en el src de un <img>; el secret es para tipear a mano cuando no
// se puede escanear.
export async function iniciarAltaMfa(nombreAmigable) {
  await _darDeBajaFactoresSinVerificar()

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: nombreAmigable,
  })

  if (error) throw new Error(_traducirErrorMfa(error))

  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

// Sirve para las dos cosas: completar un alta recién empezada y responder el
// desafío al entrar. Es la misma operación para Supabase.
export async function verificarCodigoMfa(factorId, codigo) {
  // El desafío se crea acá, en el momento de verificar, y no al abrir la
  // pantalla: tiene su propia ventana de expiración, y armarlo antes
  // significaría que venza mientras la persona busca el celular — devolviendo
  // mfa_challenge_expired sobre un código recién tipeado y correcto.
  const { data: desafio, error: errorDesafio } = await supabase.auth.mfa.challenge({ factorId })

  if (errorDesafio) throw new Error(_traducirErrorMfa(errorDesafio))

  const { error: errorVerificacion } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: desafio.id,
    code: codigo,
  })

  if (errorVerificacion) throw new Error(_traducirErrorMfa(errorVerificacion))
}

export async function darDeBajaMfa(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })

  if (error) throw new Error(_traducirErrorMfa(error))

  // La baja NO degrada el JWT de aal2 a aal1 hasta el próximo refresco
  // automático. Sin este refresco explícito la sesión seguiría afirmando que
  // pasó un segundo factor que ya no existe.
  await supabase.auth.refreshSession()
}

// enroll() crea la fila del factor en estado 'unverified' apenas se la llama,
// antes de que la persona llegue a escanear nada. Si abandona ahí (cierra la
// pestaña, no encuentra el celular, se arrepiente), esa fila queda colgada
// para siempre — y al reintentar con el mismo nombre Supabase responde
// mfa_factor_name_conflict, un error que no le dice nada al usuario sobre un
// factor que él nunca supo que existía.
//
// Se dan de baja ÚNICAMENTE los 'unverified'. Un factor 'verified' no se toca
// jamás desde acá: es el que la persona tiene configurado y andando, y
// borrarlo la dejaría afuera de su propia cuenta sin forma de volver a entrar.
async function _darDeBajaFactoresSinVerificar() {
  const { data } = await supabase.auth.mfa.listFactors()
  const colgados = (data?.totp ?? []).filter(factor => factor.status === 'unverified')

  for (const factor of colgados) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    // No se corta el alta por esto: el enroll de abajo puede funcionar igual
    // (si el nombre nuevo es distinto) y, si no, el error real se ve solo.
    if (error) {
      console.error('[auth] no se pudo limpiar el factor sin verificar', factor.id, '—', error.message)
    }
  }
}

// Comparación por pathname y no por href: la URL real puede traer query o
// hash (el #access_token que agrega Supabase, por ejemplo), y comparar el
// string completo fallaría con cualquiera de los dos.
function _estoyEnPantallaMfa() {
  return window.location.pathname === new URL(RUTA_MFA).pathname
}

// Mecanismo estándar de Supabase: manda un link mágico al mail, sin
// aprobación manual de nadie — si alguien puede entrar a ese mail para
// clickear el link, ya demostró ser el dueño de la cuenta.
//
// Lanza SOLO si falló el CAPTCHA. Cualquier otro error se traga a propósito
// (incluido "ese mail no existe"): la pantalla muestra siempre el mismo
// mensaje de éxito, para no revelar qué mails están registrados. La decisión
// vive acá y no en la pantalla justamente para que no se pueda filtrar por
// descuido al tocar el HTML — si esta función no lanza, no hay nada que
// mostrar.
export async function pedirRestablecerContrasena(email, captchaToken) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: RUTA_RESTABLECER_CONTRASENA,
    captchaToken,
  })

  if (!error) return

  if (_esErrorDeCaptcha(error.message)) {
    throw new Error('La verificación de seguridad falló. Recargá la página e intentá de nuevo.')
  }

  // No se le muestra al usuario (ver arriba), pero queda rastro en la consola.
  // Importa sobre todo si Supabase cambia el texto de su error de CAPTCHA: en
  // ese caso _esErrorDeCaptcha() dejaría de matchear y el fallo volvería a ser
  // invisible — este log es la única pista de que eso pasó.
  console.error('[auth] resetPasswordForEmail falló y no se detectó como CAPTCHA (no se muestra al usuario):', error.message)
}

// Se usa desde restablecer-contrasena.html, una vez que la sesión temporal
// de recuperación ya quedó establecida (evento PASSWORD_RECOVERY), y también
// desde el menú de perfil del dashboard (usuario ya logueado cambiando su
// propia contraseña).
//
// contrasenaActual es OPCIONAL y activa la reautenticación server-side de
// Supabase (current_password): valida la contraseña vieja SIN crear una
// sesión nueva. Eso importa por dos motivos distintos. Uno, el modal del
// dashboard antes hacía signInWithPassword para reautenticar, y desde que hay
// CAPTCHA esa llamada exige un token que el modal no tiene. Dos, con MFA
// activo ese login extra devolvía una sesión en aal1, degradando la sesión
// que ya había pasado el segundo factor.
//
// restablecer-contrasena.html NO la pasa, y está bien: ahí la persona
// justamente no se acuerda de su contraseña, y la prueba de identidad es
// haber podido abrir el link del mail.
export async function actualizarContrasena(nuevaContrasena, contrasenaActual) {
  const cambios = { password: nuevaContrasena }
  if (contrasenaActual) cambios.current_password = contrasenaActual

  const { error } = await supabase.auth.updateUser(cambios)
  // TODO diagnóstico temporal (2026-07-15): sacar este console.error o
  // pasarlo a algo silencioso en cuanto confirmemos la causa real del
  // "Ocurrió un error" genérico que vio el usuario al restablecer — no
  // debe quedar logging de errores de contraseña permanente en producción.
  if (error) console.error('[auth] error crudo de updateUser (password):', error.message)
  if (error) throw new Error(_traducirError(error.message))
}

// Menú de perfil del dashboard — cambia auth.users.email (la credencial de
// login), nunca empleados.email (ese viene de Naaloo, se edita desde el
// módulo Empleados). "Confirm email" está desactivado en el proyecto, así
// que el cambio aplica al instante, sin mail de confirmación de por medio.
export async function actualizarEmail(nuevoEmail) {
  const { error } = await supabase.auth.updateUser({ email: nuevoEmail })
  if (error) throw new Error(_traducirError(error.message))
}

// Busca en empleados por CUIL normalizado, vía RPC (nunca SELECT directo:
// la tabla empleados no es legible sin sesión). Devuelve { nombre, rol } o null.
export async function buscarEmpleadoPorCuil(cuil) {
  const { data, error } = await supabase.rpc('buscar_empleado_por_cuil', { p_cuil: cuil })

  if (error) throw new Error('No se pudo verificar el CUIL. Probá de nuevo.')

  return data && data.length ? data[0] : null
}

// Crea la cuenta en Supabase Auth y la fila en solicitudes_acceso a través
// de la Edge Function crear-solicitud-acceso (corre con service_role del
// lado del servidor): si el insert de la solicitud falla, la función revierte
// la cuenta de Auth recién creada — evita cuentas huérfanas sin solicitud
// asociada (bug real detectado en producción: el insert fallaba en silencio
// y la persona quedaba con una cuenta creada pero sin ninguna fila en
// solicitudes_acceso, viendo "pendiente de aprobación" para siempre).
// apellido/fechaNacimiento/telefono solo aplican cuando tuvoMatch es false.
// captchaToken: lo valida la propia Edge Function contra Cloudflare — no pasa
// por el CAPTCHA de Supabase, porque adentro usa service_role (ver el
// comentario en index.ts).
export async function crearSolicitudAcceso({ nombreCompleto, nombre, apellido, email, contrasena, cuil, tuvoMatch, fechaNacimiento, telefono, captchaToken }) {
  const { data, error } = await supabase.functions.invoke('crear-solicitud-acceso', {
    body: { nombreCompleto, nombre, apellido, email, contrasena, cuil, tuvoMatch, fechaNacimiento, telefono, captchaToken },
  })

  if (error) throw new Error('No se pudo enviar la solicitud. Probá de nuevo.')
  if (!data?.ok) {
    // esErrorAuth: el mensaje es texto crudo de Supabase Auth (en inglés) y
    // hay que traducirlo. Si no, la Edge Function ya devuelve un mensaje en
    // español listo para mostrar — no pasarlo por el traductor, o se pierde
    // (el mapa de _traducirError solo conoce esas 5 frases en inglés y cae
    // al genérico "Ocurrió un error" para cualquier otra cosa).
    throw new Error(data?.esErrorAuth ? _traducirError(data.mensaje) : (data?.mensaje || 'No se pudo enviar la solicitud.'))
  }

  return data
}

// Supabase no expone un código de error para el rechazo de CAPTCHA, solo el
// texto (algo como "captcha protection: request disallowed (...)"). Matchear
// sobre el mensaje es frágil por definición — por eso el único lugar que lo
// usa loguea a consola cuando NO matchea (ver pedirRestablecerContrasena).
function _esErrorDeCaptcha(mensaje) {
  return /captcha/i.test(mensaje || '')
}

// A diferencia de _traducirError —que matchea el TEXTO del mensaje, en inglés
// y sin ninguna garantía de estabilidad— esto matchea el CÓDIGO de error, que
// Supabase documenta como parte de su contrato público.
//
// Si el código no viene (versiones viejas del SDK no lo poblaban) cae al
// genérico a propósito: es preferible un "Ocurrió un error" a un mensaje
// concreto pero equivocado.
const ERRORES_MFA = {
  mfa_verification_failed:
    'El código no es correcto. Fijate que sea el que muestra la app en este momento y probá de nuevo.',
  mfa_challenge_expired:
    'El código venció. Mirá el que muestra la app ahora y volvé a intentar.',
  mfa_factor_name_conflict:
    'Ya tenés un dispositivo con ese nombre. Poné otro para poder distinguirlos.',
  // Este va a pasar en celular y sin la explicación es incomprensible: el alta
  // tiene que empezar y terminar en la misma IP, y pasar de WiFi a datos
  // móviles en el medio la cambia.
  mfa_ip_address_mismatch:
    'La configuración tiene que empezar y terminar en la misma red. Si pasaste de WiFi a datos móviles (o al revés) mientras la hacías, volvé a la red original y empezá de nuevo.',
  mfa_factor_not_found:
    'Ese dispositivo ya no está dado de alta.',
  mfa_totp_enroll_not_enabled:
    'La verificación en dos pasos está desactivada en el sistema. Avisale a un administrador.',
  mfa_totp_verify_not_enabled:
    'La verificación en dos pasos está desactivada en el sistema. Avisale a un administrador.',
  insufficient_aal:
    'Necesitás verificar tu segundo factor antes de hacer esto.',
  over_request_rate_limit:
    'Demasiados intentos seguidos. Esperá unos minutos y volvé a probar.',
}

function _traducirErrorMfa(error) {
  const traduccion = ERRORES_MFA[error?.code]
  if (traduccion) return traduccion

  // Mismo razonamiento que el console.error de pedirRestablecerContrasena:
  // si Supabase agrega un código que no está en el mapa, este log es la única
  // pista de que el usuario está viendo el genérico en lugar de algo útil.
  console.error('[auth] error de MFA sin traducción — code:', error?.code, '| message:', error?.message)
  return 'Ocurrió un error. Intentá de nuevo.'
}

function _traducirError(mensaje) {
  const errores = {
    'Invalid login credentials': 'Email o contraseña incorrectos.',
    'Email not confirmed': 'Confirmá tu email antes de ingresar.',
    'User already registered': 'Ya existe una cuenta con ese email.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'El formato del email no es válido.',
    // Hipótesis fundamentada, no confirmada en vivo (ver console.error de
    // actualizarContrasena) — mensaje real y documentado de Supabase.
    'New password should be different from the old password.': 'La contraseña nueva tiene que ser distinta a la anterior.',
  }
  return errores[mensaje] ?? 'Ocurrió un error. Intentá de nuevo.'
}
