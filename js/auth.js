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

// Crea la cuenta en Supabase Auth y, con el usuario_id devuelto, la fila en
// solicitudes_acceso. apellido/fechaNacimiento/telefono solo aplican cuando
// tuvoMatch es false.
export async function crearSolicitudAcceso({ nombreCompleto, nombre, apellido, email, contrasena, cuil, tuvoMatch, fechaNacimiento, telefono }) {
  const { data, error: errorAuth } = await supabase.auth.signUp({
    email,
    password: contrasena,
    options: { data: { nombre_completo: nombreCompleto } }
  })

  if (errorAuth) throw new Error(_traducirError(errorAuth.message))

  const { error: errorSolicitud } = await supabase
    .from('solicitudes_acceso')
    .insert([{
      nombre,
      apellido: apellido ?? null,
      email,
      cuil,
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      usuario_id: data.user?.id ?? null,
      tuvo_match: tuvoMatch,
      fecha_nacimiento: fechaNacimiento ?? null,
      telefono: telefono ?? null
    }])

  if (errorSolicitud) console.error('No se pudo registrar la solicitud de acceso:', errorSolicitud.message)

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
