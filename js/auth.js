import { supabase } from './supabase.js'

const RAIZ_SITIO = new URL('..', import.meta.url).href
const RUTA_LOGIN = new URL('login.html', RAIZ_SITIO).href
const RUTA_DASHBOARD = new URL('dashboard.html', RAIZ_SITIO).href

// Verifica sesión activa.
// redirigirSiNoHay: redirige a login si no hay sesión (default: true)
// redirigirSiHay: redirige al dashboard si ya hay sesión (default: false)
export async function verificarSesion({ redirigirSiNoHay = true, redirigirSiHay = false } = {}) {
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
    'Unable to validate email address: invalid format': 'El formato del email no es válido.'
  }
  return errores[mensaje] ?? 'Ocurrió un error. Intentá de nuevo.'
}
