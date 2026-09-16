import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Endpoint público — lo llama registro.html ANTES de que exista ninguna sesión
// (el paso 1 del auto-registro). No requiere Authorization: Bearer.
//
// Existe para cerrar la enumeración de CUILs: la RPC buscar_empleado_por_cuil
// era ejecutable por anon con la key pública, y un CUIL se deriva del DNI, así
// que cualquiera podía recorrerlos y sacar nombre y puesto de cada empleado.
// Acá cada consulta exige un token de Turnstile, y la RPC queda solo para
// service_role.
//
// Los logs NO llevan datos personales: ni el CUIL ni el nombre.
Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS_CORS })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, mensaje: 'Método no permitido' }, 405)
  }

  // ── Validar cuerpo del request ─────────────────────────────────────────────
  let body: { cuil?: string; captchaToken?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }

  const cuil = String(body?.cuil ?? '').replace(/\D/g, '')
  const captchaToken = body?.captchaToken

  if (cuil.length !== 11) {
    return json({ ok: false, mensaje: 'Ingresá un CUIL válido de 11 números.' }, 400)
  }

  // ── Verificación del CAPTCHA (Cloudflare Turnstile) ────────────────────────
  // Mismo patrón que crear-solicitud-acceso. Falla CERRADA en todos los casos:
  // sin secret, sin token o con token inválido, no se consulta nada.
  // esErrorCaptcha: el cliente lo usa para mostrar un mensaje propio sin
  // tener que comparar textos.
  const secretTurnstile = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secretTurnstile) {
    console.error('CRÍTICO: TURNSTILE_SECRET_KEY no está configurada — se rechaza la búsqueda en vez de consultar sin verificar.')
    return json({ ok: false, mensaje: 'Error de configuración del servidor.' }, 500)
  }

  if (!captchaToken) {
    return json({ ok: false, mensaje: 'Falta la verificación de seguridad.', esErrorCaptcha: true }, 400)
  }

  let verificacion: { success?: boolean; 'error-codes'?: string[] }
  try {
    const respuestaTurnstile = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretTurnstile, response: captchaToken }),
    })
    verificacion = await respuestaTurnstile.json()
  } catch (err) {
    console.error('Error de red al verificar el CAPTCHA con Cloudflare:', err)
    return json({ ok: false, mensaje: 'No se pudo verificar la seguridad. Probá de nuevo.' }, 502)
  }

  if (!verificacion?.success) {
    console.error('CAPTCHA rechazado por Cloudflare:', JSON.stringify(verificacion?.['error-codes'] ?? null))
    return json({ ok: false, mensaje: 'La verificación de seguridad falló. Recargá la página e intentá de nuevo.', esErrorCaptcha: true }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin.rpc('buscar_empleado_por_cuil', { p_cuil: cuil })

  if (error) {
    console.error('Error en buscar_empleado_por_cuil:', error.code, error.message)
    return json({ ok: false, mensaje: 'No se pudo verificar el CUIL. Probá de nuevo.' }, 500)
  }

  const fila = Array.isArray(data) && data.length ? data[0] : null
  const empleado = fila ? { nombre: fila.nombre, rol: fila.rol } : null

  return json({ ok: true, empleado }, 200)
})

// ── Helper ─────────────────────────────────────────────────────────────────────
function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
