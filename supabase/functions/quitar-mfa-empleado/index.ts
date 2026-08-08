import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rescate de alguien que perdió su dispositivo de verificación en dos pasos.
// Supabase NO tiene códigos de recuperación (ver la referencia de Auth MFA:
// "Recovery codes are not supported"), así que esta función es la única salida
// desde la app: un super_admin le da de baja los factores TOTP a otra persona.
Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS_CORS })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, mensaje: 'Método no permitido' }, 405)
  }

  // ── (a) Verificar sesión de Supabase Auth ──────────────────────────────────
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

  // ── (b) Solo super_admin ───────────────────────────────────────────────────
  const { data: miEmpleado, error: errorEmpleado } = await supabaseComoLlamante
    .from('empleados')
    .select('rol_app')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (errorEmpleado || !miEmpleado || miEmpleado.rol_app !== 'super_admin') {
    return json({ ok: false, mensaje: 'No tenés permiso para hacer esta operación.' }, 403)
  }

  // ── (c) Quien llama tiene que haber pasado SU PROPIO segundo factor ────────
  // Esta operación desarma la verificación en dos pasos de otra persona: pedir
  // aal2 evita que una sesión robada (celular desbloqueado, notebook abierta)
  // pueda desactivarle el MFA a todo el equipo.
  const aal = leerClaimAal(authHeader.slice('Bearer '.length))
  if (aal !== 'aal2') {
    return json({ ok: false, mensaje: 'Necesitás verificar tu segundo factor antes de hacer esta operación.' }, 403)
  }

  // ── (d) Validar cuerpo del request ─────────────────────────────────────────
  let body: { empleado_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }

  const empleadoId = body.empleado_id
  if (!empleadoId) {
    return json({ ok: false, mensaje: 'Falta empleado_id.' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── (e) Resolver a quién se rescata ────────────────────────────────────────
  // Entra el empleado_id, NO el auth_user_id: la pantalla de Accesos trabaja
  // con empleados y no tiene por qué conocer los ids de Auth.
  const { data: empleadoDestino, error: errorBuscar } = await supabaseAdmin
    .from('empleados')
    .select('id, auth_user_id')
    .eq('id', empleadoId)
    .maybeSingle()

  if (errorBuscar || !empleadoDestino) {
    return json({ ok: false, mensaje: 'No se encontró esa persona.' }, 404)
  }

  if (!empleadoDestino.auth_user_id) {
    return json({ ok: false, mensaje: 'Esa persona todavía no tiene una cuenta de acceso vinculada.' }, 400)
  }

  // ── (f) Nunca sobre uno mismo ──────────────────────────────────────────────
  // No es una restricción de seguridad (podría hacerlo desde su perfil igual):
  // evita que alguien se saque el MFA propio sin querer, creyendo que se lo
  // está sacando a otro.
  if (empleadoDestino.auth_user_id === user.id) {
    return json({ ok: false, mensaje: 'Para dar de baja tu propio factor, usá el menú de perfil.' }, 400)
  }

  // Rescatar a otro super_admin SÍ está permitido, y es el caso de uso
  // principal: los super_admin se rescatan entre ellos. No se filtra por rol.

  // ── Listar sus factores ────────────────────────────────────────────────────
  // Vía RPC y no con .from('mfa_factors'): auth.mfa_factors no le otorga
  // ningún privilegio a service_role y PostgREST no expone el esquema auth, así
  // que un select directo no funciona. La RPC es SECURITY DEFINER y su EXECUTE
  // está otorgado solo a service_role.
  const { data: factores, error: errorFactores } = await supabaseAdmin
    .rpc('listar_factores_mfa', { p_auth_user_id: empleadoDestino.auth_user_id })

  if (errorFactores) {
    console.error('No se pudieron listar los factores — empleado_id:', empleadoId, '—', errorFactores.message)
    return json({ ok: false, mensaje: 'No se pudo consultar la verificación en dos pasos de esa persona.' }, 500)
  }

  const listaFactores = factores ?? []

  // ── Borrar TODOS los factores ──────────────────────────────────────────────
  // Todos, no solo los verificados: esto es un rescate, y cualquier factor que
  // quede vivo la sigue dejando trabada. Borrar uno verificado además le cierra
  // todas las sesiones activas, que es lo esperado.
  let borrados = 0
  const errores: string[] = []

  for (const factor of listaFactores) {
    const { error: errorBorrado } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: empleadoDestino.auth_user_id,
    })

    if (errorBorrado) {
      // Sin datos personales en el log: solo el empleado_id y el motivo.
      console.error('No se pudo borrar un factor MFA — empleado_id:', empleadoId, '—', errorBorrado.message)
      errores.push(errorBorrado.message)
    } else {
      borrados++
    }
  }

  // Un borrado parcial NO es un éxito: si sobrevivió un factor, la persona
  // sigue sin poder entrar. Se devuelve el error real, no se traga.
  if (errores.length) {
    return json({
      ok: false,
      mensaje: `Se borraron ${borrados} de ${listaFactores.length} factores; el resto falló, así que esa persona sigue trabada. Detalle: ${errores[0]}`,
      factoresBorrados: borrados,
    }, 500)
  }

  // factoresBorrados: 0 es un resultado válido — esa persona no tenía la
  // verificación en dos pasos activa. Lo distingue el frontend.
  return json({ ok: true, factoresBorrados: borrados }, 200)
})

// ── Helpers ────────────────────────────────────────────────────────────────────

// POR QUÉ ES SEGURO DECODIFICAR ACÁ SIN VERIFICAR LA FIRMA — leer antes de
// "arreglar" esto:
//
// Esta función NO confía en un token sin verificar. Cuando se la llama, más
// arriba ya corrió supabase.auth.getUser(), que manda el token al servidor de
// Auth y lo valida (firma y vencimiento) contra él. Si getUser() devolvió un
// usuario, ESE MISMO token quedó probado como auténtico y vigente. Recién
// después se lo decodifica acá, y solo para leer un claim que el servidor de
// Auth ya avaló.
//
// Cambiar esto por una verificación de firma local no agrega seguridad: la
// verificación fuerte ya ocurrió. Quitar el getUser() de arriba y dejar solo
// esta función, en cambio, SÍ sería un agujero grave — cualquiera podría
// fabricarse un token con "aal":"aal2".
//
// El claim está documentado en https://supabase.com/docs/guides/auth/jwt-fields
// ("aal", string, "aal1" | "aal2").
function leerClaimAal(token: string): string {
  try {
    const payload = token.split('.')[1]
    if (!payload) return 'aal1'

    // base64url -> base64, con el relleno que atob() exige.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const conRelleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    const bytes = Uint8Array.from(atob(conRelleno), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))

    // Falla CERRADA: si el claim no viene o no es string, se asume aal1 y la
    // operación se rechaza. La documentación de MFA dice exactamente esto:
    // "JWTs without an `aal` claim are at the `aal1` level".
    return typeof claims?.aal === 'string' ? claims.aal : 'aal1'
  } catch {
    // Token con forma rara: mismo criterio, se asume el nivel más bajo.
    return 'aal1'
  }
}

function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
