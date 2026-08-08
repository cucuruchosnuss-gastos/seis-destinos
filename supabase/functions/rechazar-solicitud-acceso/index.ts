import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS_CORS })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, mensaje: 'Método no permitido' }, 405)
  }

  // ── Verificar sesión de Supabase Auth ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ ok: false, mensaje: 'No autorizado' }, 401)
  }

  const supabaseComoLlamante = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: errorAuth } = await supabaseComoLlamante.auth.getUser()
  if (errorAuth || !user) {
    return json({ ok: false, mensaje: 'Sesión inválida o expirada' }, 401)
  }

  // Mismo chequeo de permiso que ya hacen accesos.html / las RPCs existentes:
  // solo super_admin puede rechazar solicitudes (admin ya no gestiona accesos).
  const { data: miEmpleado, error: errorEmpleado } = await supabaseComoLlamante
    .from('empleados')
    .select('rol_app')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (errorEmpleado || !miEmpleado || miEmpleado.rol_app !== 'super_admin') {
    return json({ ok: false, mensaje: 'No tenés permiso para rechazar solicitudes.' }, 403)
  }

  // ── Validar cuerpo del request ─────────────────────────────────────────────
  let body: { solicitud_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }

  const solicitudId = body.solicitud_id
  if (!solicitudId) {
    return json({ ok: false, mensaje: 'Falta solicitud_id.' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Buscar la solicitud ─────────────────────────────────────────────────────
  const { data: solicitud, error: errorBuscar } = await supabaseAdmin
    .from('solicitudes_acceso')
    .select('id, usuario_id, estado')
    .eq('id', solicitudId)
    .maybeSingle()

  if (errorBuscar || !solicitud) {
    return json({ ok: false, mensaje: 'No se encontró la solicitud.' }, 404)
  }

  // Misma validación que ya existe en aprobar_solicitud_acceso: si alguien ya
  // resolvió esta solicitud (aprobada, o ya rechazada antes), cortar acá sin
  // tocar nada. Sin esto, un doble click o una carrera entre dos admins podría
  // rechazar (y borrarle la cuenta de Auth) a alguien que ya fue aprobado y
  // tiene acceso real vigente.
  if (solicitud.estado !== 'pendiente') {
    return json({ ok: false, mensaje: `Esta solicitud ya fue resuelta (estado: ${solicitud.estado}).` }, 409)
  }

  // El id se guarda ANTES del update porque el propio update lo borra de la
  // fila, y abajo hace falta para el deleteUser.
  const usuarioIdABorrar = solicitud.usuario_id

  // ── Marcar como rechazada y soltar la referencia al usuario ─────────────────
  // usuario_id se pone en null en la MISMA operación, y no es cosmético: la FK
  // solicitudes_acceso_usuario_id_fkey apunta a auth.users, y mientras esta
  // fila siguiera referenciando la cuenta, el deleteUser de más abajo fallaba
  // siempre con "violates foreign key constraint (SQLSTATE 23503)". La cuenta
  // quedaba viva y la persona no podía volver a registrarse con el mismo mail
  // — justo lo que esta función existe para evitar.
  //
  // La FK ya tiene ON DELETE SET NULL, así que hoy el borrado funcionaría
  // igual. Esto se mantiene como defensa en profundidad: no depender de que
  // nadie recree la constraint sin esa cláusula.
  const { error: errorUpdate } = await supabaseAdmin
    .from('solicitudes_acceso')
    .update({ estado: 'rechazada', usuario_id: null })
    .eq('id', solicitudId)

  if (errorUpdate) {
    console.error('No se pudo actualizar el estado de la solicitud:', errorUpdate.message)
    return json({ ok: false, mensaje: 'No se pudo rechazar la solicitud.' }, 500)
  }

  // ── Borrar la cuenta de Auth asociada, para que la persona pueda volver a
  //    registrarse desde cero con el mismo email ────────────────────────────
  let cuentaAuthNoEliminada = false
  if (usuarioIdABorrar) {
    const { error: errorDelete } = await supabaseAdmin.auth.admin.deleteUser(usuarioIdABorrar)
    if (errorDelete) {
      console.error('La solicitud se rechazó pero no se pudo borrar la cuenta de Auth', usuarioIdABorrar, '—', errorDelete.message)
      cuentaAuthNoEliminada = true
    }
  }

  return json({ ok: true, cuentaAuthNoEliminada }, 200)
})

// ── Helper ─────────────────────────────────────────────────────────────────────
function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
