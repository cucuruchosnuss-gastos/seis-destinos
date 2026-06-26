import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODELO = 'claude-sonnet-4-6'

const PROMPT_OCR = `Analizá esta imagen de un comprobante fiscal o ticket argentino y extraé los siguientes campos en formato JSON.

Campos a extraer:
- fecha: fecha de emisión del comprobante en formato YYYY-MM-DD
- tipo_doc: tipo de comprobante. Debe ser exactamente uno de: "Factura A", "Factura B", "Factura C", "Ticket", "Remito", "Nota de crédito", "Otro"
- numero_doc: número del comprobante incluyendo el punto de venta (ej: "0001-00012345")
- razon_social: nombre o razón social de quien EMITE el comprobante (el vendedor/proveedor, no el comprador)
- importe: importe TOTAL a pagar como número. Sin símbolos de moneda, sin puntos de miles, con punto decimal (ej: 15400.50)
- moneda: "ARS" si es en pesos argentinos, "USD" si es en dólares. Por defecto "ARS".

Reglas:
- Si un campo no está visible o no podés determinarlo con certeza, usá null.
- El importe es el TOTAL final, no subtotales ni impuestos por separado.
- No incluyas explicaciones ni texto adicional, solo el JSON.

Formato de respuesta (únicamente esto):
{
  "fecha": "YYYY-MM-DD" | null,
  "tipo_doc": "..." | null,
  "numero_doc": "..." | null,
  "razon_social": "..." | null,
  "importe": número | null,
  "moneda": "ARS" | "USD"
}`

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: errorAuth } = await supabase.auth.getUser()
  if (errorAuth || !user) {
    return json({ ok: false, mensaje: 'Sesión inválida o expirada' }, 401)
  }

  // ── Validar cuerpo del request ─────────────────────────────────────────────
  let body: { imagen_base64?: string; mime_type?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }

  const { imagen_base64, mime_type } = body

  if (!imagen_base64 || !mime_type) {
    return json({ ok: false, mensaje: 'Faltan campos requeridos: imagen_base64, mime_type' }, 400)
  }

  if (!MIME_VALIDOS.includes(mime_type)) {
    return json({ ok: false, mensaje: `Formato de imagen no soportado: ${mime_type}. Usá JPEG, PNG o WebP.` }, 400)
  }

  // ── Llamar a la API de Anthropic ───────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY no está configurada como secret de Supabase.')
    return json({ ok: false, mensaje: 'Error de configuración del servidor' }, 500)
  }

  let respuestaAnthropic: Response
  try {
    respuestaAnthropic = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime_type,
                  data: imagen_base64,
                },
              },
              {
                type: 'text',
                text: PROMPT_OCR,
              },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    console.error('Error de red al llamar a Anthropic:', err)
    return json({ ok: false, mensaje: 'No se pudo conectar con el servicio OCR' }, 502)
  }

  if (!respuestaAnthropic.ok) {
    const errorTexto = await respuestaAnthropic.text()
    console.error(`Error de Anthropic (${respuestaAnthropic.status}):`, errorTexto)
    return json({ ok: false, mensaje: 'El servicio OCR devolvió un error' }, 502)
  }

  // ── Parsear la respuesta del modelo ───────────────────────────────────────
  const cuerpoAnthropic = await respuestaAnthropic.json()
  const textoModelo: string = cuerpoAnthropic.content?.[0]?.text ?? ''

  let datos: Record<string, unknown> = {}
  try {
    // El modelo puede envolver el JSON en bloques ```json ... ```
    const match = textoModelo.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No se encontró JSON en la respuesta')
    datos = JSON.parse(match[0])
  } catch {
    console.error('No se pudo parsear la respuesta del modelo:', textoModelo)
    return json({ ok: false, datos: {}, mensaje: 'No se pudo leer el comprobante' }, 200)
  }

  // Considerar fallido si todos los campos son null
  const tieneAlgunDato = Object.values(datos).some((v) => v !== null && v !== undefined)
  if (!tieneAlgunDato) {
    return json({ ok: false, datos: {}, mensaje: 'El comprobante no es legible' }, 200)
  }

  return json({ ok: true, datos }, 200)
})

// ── Helper ─────────────────────────────────────────────────────────────────────
function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
