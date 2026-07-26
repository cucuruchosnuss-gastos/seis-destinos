import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODELO = 'claude-sonnet-4-6'

const PROMPT_OCR = `Analizá esta imagen de un remito o factura de compra de materia prima / insumos de
una fábrica de alimentos argentina, y extraé los siguientes campos en formato JSON.

Campos del encabezado:
- fecha: fecha de emisión en formato YYYY-MM-DD
- tipo_doc: debe ser exactamente uno de: "Remito", "Factura A", "Factura X". Si es
  otro tipo de comprobante o no podés determinarlo, usá null.
- numero_doc: número del comprobante incluyendo punto de venta (ej: "0001-00012345")
- razon_social: nombre o razón social de quien EMITE el comprobante (el proveedor)
- nombre_fantasia: nombre comercial o de fantasía del proveedor, si figura además
  de la razón social (ej: razón social "DISTRIBUIDORA SUR SRL", fantasía "DIMAFLO").
  Si no figura o es el mismo que la razón social, usá null.
- cuit: CUIT del emisor, solo dígitos sin guiones. Si no está visible, null.
- receptor: nombre o razón social de quien RECIBE (el comprador). Buscalo en
  "SEÑOR:", "Razón Social Receptor", "Cliente:", "A nombre de:" o similares. El
  campo puede empezar con un número de cliente seguido del nombre (ej: "1979 PAZ
  MIRTA"): devolvé SOLO el nombre, sin el número. Si no figura, null.

Campos de cada ítem del detalle (array "items"), una entrada por cada línea:
- descripcion: nombre del producto SIN la marca y SIN el tamaño del envase
  (ej: de "HARINA 000 CAÑUELAS X 25KG" devolvé "Harina 000")
- marca: la marca comercial del producto si figura (ej: "Cañuelas", "Pureza",
  "Júpiter"). Si no figura, null.
- unidad_medida: la unidad base del contenido: "kg", "l" o "un"
- cantidad_bultos: cuántos bultos/bolsas/cajas/unidades se compraron, como número.
  Si la línea no distingue bultos de contenido, usá null.
- contenido_por_bulto: cuánto contiene cada bulto en la unidad base (ej: para
  "bolsas de 25 kg" es 25). Si no figura, usá null.
- cantidad_total: el total en la unidad base. Si la línea informa bultos y
  contenido, es el producto de ambos (200 bolsas × 25 kg = 5000). Si la línea
  informa directamente un total, usá ese.

Reglas importantes:
- NO extraigas números de lote. Aunque veas algo que parezca un lote, NO lo
  incluyas: el lote se carga siempre a mano y no debe salir de esta lectura.
- NO extraigas precios, importes, IVA ni totales en dinero. No son necesarios.
- Si un campo no está visible o no podés determinarlo con certeza, usá null.
  Nunca inventes ni estimes un valor.
- Si no podés leer ningún ítem, devolvé "items": [].
- No incluyas explicaciones ni texto adicional, solo el JSON.

Formato de respuesta (únicamente esto):
{
  "fecha": "YYYY-MM-DD" | null,
  "tipo_doc": "Remito" | "Factura A" | "Factura X" | null,
  "numero_doc": "..." | null,
  "razon_social": "..." | null,
  "nombre_fantasia": "..." | null,
  "cuit": "..." | null,
  "receptor": "..." | null,
  "items": [
    {
      "descripcion": "...",
      "marca": "..." | null,
      "unidad_medida": "kg" | "l" | "un",
      "cantidad_bultos": número | null,
      "contenido_por_bulto": número | null,
      "cantidad_total": número
    }
  ]
}`

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

const TIPOS_DOC_VALIDOS = ['Remito', 'Factura A', 'Factura X']

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
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              mime_type === 'application/pdf'
                ? { type: 'document', source: { type: 'base64', media_type: mime_type, data: imagen_base64 } }
                : { type: 'image', source: { type: 'base64', media_type: mime_type, data: imagen_base64 } },
              { type: 'text', text: PROMPT_OCR },
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

  // ── Validación de los datos extraídos ─────────────────────────────────────
  if (!Array.isArray(datos.items)) {
    datos.items = []
  }

  datos.items = (datos.items as Record<string, unknown>[]).filter((item) => {
    if (typeof item !== 'object' || item === null) return false
    const descripcionValida = typeof item.descripcion === 'string' && item.descripcion.trim() !== ''
    const cantidadValida = typeof item.cantidad_total === 'number' && item.cantidad_total > 0
    return descripcionValida && cantidadValida
  })

  for (const item of datos.items as Record<string, unknown>[]) {
    if (item.cantidad_bultos != null && item.contenido_por_bulto != null) {
      const bultos = item.cantidad_bultos as number
      const contenido = item.contenido_por_bulto as number
      const total = item.cantidad_total as number
      // El CHECK constraint de la base rechaza la fila si cantidad != bultos * contenido:
      // ante una inconsistencia se pierde el desglose, nunca el total.
      if (typeof bultos !== 'number' || typeof contenido !== 'number' || Math.abs(bultos * contenido - total) > 0.01) {
        item.cantidad_bultos = null
        item.contenido_por_bulto = null
      }
    }
  }

  if (typeof datos.tipo_doc !== 'string' || !TIPOS_DOC_VALIDOS.includes(datos.tipo_doc)) {
    datos.tipo_doc = null
  }

  // Considerar fallido si no se pudo leer nada útil
  const sinDatos = (datos.items as unknown[]).length === 0 && datos.razon_social == null && datos.numero_doc == null
  if (sinDatos) {
    return json({ ok: false, datos: {}, mensaje: 'No se pudo leer el comprobante' }, 200)
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
