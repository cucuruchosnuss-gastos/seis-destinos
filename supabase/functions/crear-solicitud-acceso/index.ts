import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Endpoint público — se llama ANTES de que exista ninguna sesión (es el
// paso que crea la cuenta). No requiere Authorization: Bearer.
Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS_CORS })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, mensaje: 'Método no permitido' }, 405)
  }

  // ── Validar cuerpo del request ─────────────────────────────────────────────
  let body: {
    nombreCompleto?: string
    nombre?: string
    apellido?: string | null
    email?: string
    contrasena?: string
    cuil?: string
    tuvoMatch?: boolean
    fechaNacimiento?: string | null
    telefono?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }

  const { nombreCompleto, nombre, apellido, email, contrasena, cuil, tuvoMatch, fechaNacimiento, telefono } = body

  if (!nombreCompleto || !nombre || !email || !contrasena || !cuil) {
    return json({ ok: false, mensaje: 'Faltan campos requeridos.' }, 400)
  }
  if (contrasena.length < 6) {
    return json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Paso 1: crear la cuenta en Supabase Auth ───────────────────────────────
  const { data: datosUsuario, error: errorAuth } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: contrasena,
    email_confirm: true, // el gate real de acceso es el vínculo a empleados, no la confirmación de mail
    user_metadata: { nombre_completo: nombreCompleto },
  })

  if (errorAuth || !datosUsuario?.user) {
    console.error('Error al crear usuario de Auth:', errorAuth?.message)
    // esErrorAuth: true — el cliente sabe que este mensaje es el texto crudo
    // (en inglés) de Supabase Auth y lo pasa por su propio traductor.
    return json({ ok: false, mensaje: errorAuth?.message ?? 'No se pudo crear la cuenta.', esErrorAuth: true }, 400)
  }

  const usuarioId = datosUsuario.user.id

  // ── Paso 2: insertar la solicitud de acceso ────────────────────────────────
  const { error: errorSolicitud } = await supabaseAdmin
    .from('solicitudes_acceso')
    .insert([{
      nombre,
      apellido: apellido ?? null,
      email,
      cuil,
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      usuario_id: usuarioId,
      tuvo_match: !!tuvoMatch,
      fecha_nacimiento: fechaNacimiento ?? null,
      telefono: telefono ?? null,
    }])

  // ── Paso 3: si el insert falló, revertir la cuenta recién creada ──────────
  if (errorSolicitud) {
    console.error('No se pudo insertar la solicitud, revirtiendo cuenta de Auth:', errorSolicitud.message, '| usuario_id:', usuarioId)
    const { error: errorRollback } = await supabaseAdmin.auth.admin.deleteUser(usuarioId)
    if (errorRollback) {
      console.error('CRÍTICO: no se pudo revertir la cuenta huérfana', usuarioId, '—', errorRollback.message)
    }
    return json({ ok: false, mensaje: 'No se pudo registrar la solicitud. Probá de nuevo en unos minutos.' }, 500)
  }

  return json({ ok: true }, 200)
})

// ── Helper ─────────────────────────────────────────────────────────────────────
function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
