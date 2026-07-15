import { supabase } from './supabase.js'

const RAIZ_SITIO = new URL('..', import.meta.url).href
const RUTA_LOGIN = new URL('login.html', RAIZ_SITIO).href
const RUTA_DASHBOARD = new URL('dashboard.html', RAIZ_SITIO).href
const RUTA_RESTABLECER_CONTRASENA = new URL('restablecer-contrasena.html', RAIZ_SITIO).href

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

export async function iniciarSesion(email, contrasena) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: contrasena })

  if (error) throw new Error(_traducirError(error.message))

  return data.session
}

export async function cerrarSesion() {
  await supabase.auth.signOut()
  window.location.replace(RUTA_LOGIN)
}

// Mecanismo estándar de Supabase: manda un link mágico al mail, sin
// aprobación manual de nadie — si alguien puede entrar a ese mail para
// clickear el link, ya demostró ser el dueño de la cuenta. No lanza error
// nunca (ni si el mail no existe) — la pantalla que llama a esto siempre
// muestra el mismo mensaje, para no revelar qué mails están registrados.
export async function pedirRestablecerContrasena(email) {
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: RUTA_RESTABLECER_CONTRASENA })
}

// Se usa desde restablecer-contrasena.html, una vez que la sesión temporal
// de recuperación ya quedó establecida (evento PASSWORD_RECOVERY), y también
// desde el menú de perfil del dashboard (usuario ya logueado cambiando su
// propia contraseña).
export async function actualizarContrasena(nuevaContrasena) {
  const { error } = await supabase.auth.updateUser({ password: nuevaContrasena })
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
export async function crearSolicitudAcceso({ nombreCompleto, nombre, apellido, email, contrasena, cuil, tuvoMatch, fechaNacimiento, telefono }) {
  const { data, error } = await supabase.functions.invoke('crear-solicitud-acceso', {
    body: { nombreCompleto, nombre, apellido, email, contrasena, cuil, tuvoMatch, fechaNacimiento, telefono },
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
