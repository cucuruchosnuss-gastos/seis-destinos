// ocr-comprobante — lectura de comprobantes del módulo Gastos.
//
// Recibe la RUTA de un archivo ya subido al bucket "comprobantes"
// (`storage_path`) y lo baja con el token de quien llama, así que respeta las
// políticas de Storage y no puede leer el archivo de otra persona. Antes
// recibía la imagen entera en base64: el mismo archivo viajaba dos veces desde
// el celular (al OCR y a Storage). Mismo patrón que ocr-cheques.
//
// TRANSICIÓN: todavía acepta `imagen_base64` + `mime_type`, porque una pestaña
// abierta con el gastos.html anterior (GitHub Pages sirve con caché) sigue
// mandando eso. Se saca en un commit posterior, cuando ya no quede ninguna.
//
// El modelo se elige con el secret OCR_COMPROBANTE_MODELO, sin tocar código.
// El default sigue siendo el de siempre a propósito: cambiarlo se decide
// evaluando con comprobantes reales. Ojo al evaluar: los modelos de nivel
// estándar miran la imagen a ~1568 px de lado largo, y gastos.html la
// comprime a 2576 px, así que con ellos la resolución extra no se aprovecha.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODELO_POR_DEFECTO = 'claude-sonnet-4-6'
const BUCKET = 'comprobantes'

const PROMPT_OCR = `Analizá esta imagen de un comprobante fiscal o ticket argentino y extraé los siguientes campos en formato JSON.

Campos a extraer:
- fecha: fecha de emisión del comprobante en formato YYYY-MM-DD
- tipo_doc: tipo de comprobante. Debe ser exactamente uno de: "Factura A", "Factura B", "Factura C", "Ticket", "Remito", "Nota de crédito", "Otro"
- numero_doc: número del comprobante incluyendo el punto de venta (ej: "0001-00012345")
- razon_social: nombre o razón social de quien EMITE el comprobante (el vendedor/proveedor, no el comprador)
- cuit: CUIT de quien EMITE el comprobante (el vendedor/proveedor), solo dígitos sin guiones (ej: "30123456789"). Si no está visible o no es legible, usá null.
- importe: importe TOTAL a pagar como número. Sin símbolos de moneda, sin puntos de miles, con punto decimal (ej: 15400.50)
- moneda: "ARS" si es en pesos argentinos, "USD" si es en dólares. Por defecto "ARS".
- receptor: nombre o razón social de quien RECIBE el comprobante (el comprador). Buscalo en los campos "SEÑOR:", "Razón Social Receptor", "Cliente:", "A nombre de:" o similares. IMPORTANTE: el campo puede empezar con un número de cliente seguido del nombre (ej: "1979 PAZ MIRTA"). Devolvé SOLO el nombre, sin el número ni espacios al inicio. Si no figura receptor, usá null.
- descripcion_item: lista de ítems del detalle del comprobante. Por cada línea de detalle extraé: cantidad, unidad de medida y descripción, y concatenalos en el formato "cantidad unidad_medida descripción" (ej: "50 CAJA Oleo Margarina Ultra Refinado Especial"). Si hay múltiples ítems, unilos con " | " (ej: "50 CAJA Oleo Margarina | 12 UN Manteca"). Si no hay detalle visible, usá null.

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
  "cuit": "..." | null,
  "importe": número | null,
  "moneda": "ARS" | "USD",
  "receptor": "..." | null,
  "descripcion_item": "..." | null
}`

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

// Storage no siempre devuelve el tipo en el blob; si falta, se deduce de la
// extensión de la ruta. Lo que no se reconoce devuelve null y se rechaza.
const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf',
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
  let body: { storage_path?: unknown; imagen_base64?: unknown; mime_type?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }

  let imagen_base64: string
  let mime_type: string

  if (body.storage_path !== undefined) {
    const ruta = rutaValida(body.storage_path, user.id)
    // Solo archivos de la carpeta propia: la política del bucket ya lo exige
    // para subir, y acá se corta antes de gastar una descarga y una llamada.
    if (!ruta) return json({ ok: false, mensaje: 'Ruta de archivo inválida' }, 400)

    const { data: blob, error: errorDescarga } = await supabase.storage.from(BUCKET).download(ruta)
    if (errorDescarga || !blob) {
      console.error('No se pudo bajar el comprobante:', ruta, errorDescarga)
      return json({ ok: false, mensaje: 'No se encontró el archivo. Volvé a cargarlo.' }, 404)
    }
    const mimeDetectado = mimeDeArchivo(blob.type, ruta)
    if (!mimeDetectado) {
      return json({ ok: false, mensaje: 'Formato no soportado. Usá JPG, PNG, WebP o PDF.' }, 400)
    }
    mime_type = mimeDetectado
    imagen_base64 = base64DeBytes(new Uint8Array(await blob.arrayBuffer()))
  } else {
    // Rama de transición (ver el encabezado).
    if (typeof body.imagen_base64 !== 'string' || !body.imagen_base64 || typeof body.mime_type !== 'string') {
      return json({ ok: false, mensaje: 'Falta el campo requerido: storage_path' }, 400)
    }
    if (!MIME_VALIDOS.includes(body.mime_type)) {
      return json({ ok: false, mensaje: `Formato de imagen no soportado: ${body.mime_type}. Usá JPEG, PNG o WebP.` }, 400)
    }
    imagen_base64 = body.imagen_base64
    mime_type = body.mime_type
  }

  // ── Llamar a la API de Anthropic ───────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY no está configurada como secret de Supabase.')
    return json({ ok: false, mensaje: 'Error de configuración del servidor' }, 500)
  }
  const modelo = Deno.env.get('OCR_COMPROBANTE_MODELO')?.trim() || MODELO_POR_DEFECTO

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
        model: modelo,
        max_tokens: 512,
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
    return json({ ok: false, datos: {}, modelo, mensaje: 'No se pudo leer el comprobante' }, 200)
  }

  // Considerar fallido si todos los campos son null
  const tieneAlgunDato = Object.values(datos).some((v) => v !== null && v !== undefined)
  if (!tieneAlgunDato) {
    return json({ ok: false, datos: {}, modelo, mensaje: 'El comprobante no es legible' }, 200)
  }

  // `modelo` viaja en la respuesta para poder saber, al evaluar, cuál leyó.
  return json({ ok: true, datos, modelo }, 200)
})

// ── Helpers ────────────────────────────────────────────────────────────────────

// La ruta tiene que ser texto, empezar con la carpeta de quien llama y no
// tener segmentos vacíos ni "." / "..". Devuelve la ruta recortada o null.
function rutaValida(valor: unknown, uid: string): string | null {
  if (typeof valor !== 'string' || !uid) return null
  const ruta = valor.trim()
  if (!ruta.startsWith(`${uid}/`)) return null
  const partes = ruta.split('/')
  if (partes.length < 2 || partes.some((p) => p === '' || p === '.' || p === '..')) return null
  return ruta
}

function mimeDeArchivo(tipoBlob: string | undefined, ruta: string): string | null {
  const tipo = String(tipoBlob ?? '').split(';')[0].trim().toLowerCase()
  if (MIME_VALIDOS.includes(tipo)) return tipo
  const ext = ruta.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
  return MIME_POR_EXTENSION[ext] ?? null
}

// btoa sobre el arreglo entero revienta la pila con archivos de varios MB.
function base64DeBytes(bytes: Uint8Array): string {
  let binario = ''
  const tramo = 0x8000
  for (let i = 0; i < bytes.length; i += tramo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + tramo))
  }
  return btoa(binario)
}

function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
