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
- condicion_venta: la condición de venta si figura (ej: "Contado", "Cuenta
  corriente", "30 días"). Si no figura, null.
- punto_venta: el punto de venta solo, sin el número de comprobante (ej: de
  "0001-00012345" es "0001"). Si no figura por separado, null.

Totales del comprobante (null en los remitos, que no llevan importes):
- importe_neto: subtotal sin IVA, como número
- importe_iva: total de IVA, como número
- importe_total: total final del comprobante, como número

Campos de cada ítem del detalle (array "items"), una entrada por cada línea:
- descripcion: nombre del producto SIN la marca y SIN el tamaño del envase
  (ej: de "HARINA 000 CAÑUELAS X 25KG" devolvé "Harina 000")
- codigo_articulo: el código del artículo del proveedor si la línea lo trae
  (ej: "ART-1042", "70351"). Si no figura, null.
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
- precio_unitario: precio por unidad de la línea, como número. Si no figura, null.
- precio_total: importe total de la línea, como número. Si no figura, null.
- alicuota_iva: alícuota de IVA de la línea en porcentaje, como número (21, 10.5,
  0). Si no figura, null.
- tipo_sugerido: clasificá el renglón según si el producto FORMA PARTE DEL
  PRODUCTO FINAL que fabrica la empresa (cucuruchos, golosinas y pastas):
  · "materia_prima": ingredientes que entran en la receta — harina, azúcar,
    grasa, colorante, esencia, lecitina, fécula, cacao, bicarbonato, gelatina,
    conservantes, aditivos alimentarios.
  · "insumo": todo lo demás — envases y empaque (cajas, bolsas, film, etiquetas,
    bobinas), limpieza y desinfección, repuestos, herramientas, indumentaria,
    papelería.
  · null: si no podés determinarlo con razonable seguridad.
  CUIDADO con los renglones que NO son un producto físico: fletes, servicios,
  bonificaciones, descuentos, intereses y cargos administrativos NO son ni
  materia prima ni insumo. Devolvé null para ellos aunque el texto mencione un
  producto: un renglón que dice "Fletes Harinas" es un servicio de transporte,
  no harina, y va null.
  ANTE LA DUDA, null. Una clasificación equivocada es peor que ninguna: la
  persona la va a tener que elegir igual, y si viene sugerida mal puede pasar
  desapercibida.

Incluí TODAS las líneas del detalle, también las de BONIFICACIÓN, DESCUENTO,
FLETE o similares, aunque tengan cantidad cero o negativa: forman parte del
comprobante y cambian el costo real.

Reglas importantes:
- NO extraigas números de lote. Aunque veas algo que parezca un lote, NO lo
  incluyas: el lote se carga siempre a mano y no debe salir de esta lectura.
  ESTA REGLA NO SE TOCA: el lote no está en el remito sino en la etiqueta del
  envase, y un lote inventado por el modelo es peor que un campo vacío. (Los
  precios SÍ se extraen — no confundir una regla con la otra.)
- Los importes van como NÚMERO, sin símbolo de moneda ni separador de miles:
  1234.56 y no "$ 1.234,56".
- Si un campo no está visible o no podés determinarlo con certeza, usá null.
  Nunca inventes ni estimes un valor.
- Si no podés leer ningún ítem, devolvé "items": [].
- No incluyas explicaciones ni texto adicional, solo el JSON.

Formato de respuesta (únicamente esto):
{
  "fecha": "YYYY-MM-DD" | null,
  "tipo_doc": "Remito" | "Factura A" | "Factura X" | null,
  "numero_doc": "..." | null,
  "punto_venta": "..." | null,
  "razon_social": "..." | null,
  "nombre_fantasia": "..." | null,
  "cuit": "..." | null,
  "receptor": "..." | null,
  "condicion_venta": "..." | null,
  "importe_neto": número | null,
  "importe_iva": número | null,
  "importe_total": número | null,
  "items": [
    {
      "descripcion": "...",
      "codigo_articulo": "..." | null,
      "marca": "..." | null,
      "unidad_medida": "kg" | "l" | "un",
      "cantidad_bultos": número | null,
      "contenido_por_bulto": número | null,
      "cantidad_total": número,
      "precio_unitario": número | null,
      "precio_total": número | null,
      "alicuota_iva": número | null,
      "tipo_sugerido": "materia_prima" | "insumo" | null
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

const TIPOS_INSUMO_VALIDOS = ['materia_prima', 'insumo']

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
        // 4096 y no 2048: con código de artículo, precios y alícuota por
        // renglón, cada línea ronda los 90 tokens. Da para unas 40 líneas, muy
        // por encima de los comprobantes reales. Si igual se corta, lo detecta
        // la guarda de stop_reason de más abajo.
        max_tokens: 4096,
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

  // Se quedó sin espacio: el JSON viene cortado a la mitad y JSON.parse va a
  // fallar. Sin esta guarda el mensaje sería "No se pudo leer el comprobante",
  // que es engañoso — el modelo leyó bien, lo que faltó fue lugar. Distinguirlo
  // le dice a la persona qué hacer.
  if (cuerpoAnthropic.stop_reason === 'max_tokens') {
    console.error('Respuesta truncada por max_tokens. Renglones del comprobante:', textoModelo.length)
    return json({
      ok: false,
      datos: {},
      mensaje: 'El comprobante tiene demasiados renglones para leer de una vez. Cargá los ítems a mano.',
    }, 200)
  }

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

  // ── DOS objetos, y no hay que unificarlos "para simplificar" ──────────────
  //
  // `crudo`  = lo que devolvió el modelo, ANTES de validar. Es lo que se
  //            archiva en materia_prima_ingresos.ocr_crudo: el registro del
  //            papel, que después no está más.
  // `datos`  = lo mismo pero validado y filtrado. Es lo ÚNICO que consume el
  //            wizard para prellenar el paso 3.
  //
  // Se separan porque la validación descarta cosas que al ítem de stock no le
  // sirven pero al archivo SÍ:
  //   · Los renglones con cantidad <= 0 se filtran, y ahí caen las líneas de
  //     BONIFICACIÓN, DESCUENTO y FLETE de las facturas argentinas — que son
  //     justamente las que cambian el costo real del insumo el día que se
  //     reconstruyan precios.
  //   · cantidad_bultos/contenido_por_bulto se anulan cuando no cierran contra
  //     el total. Para el ítem está bien (lo exige chk_presentacion_coherente),
  //     pero el papel decía "100 bolsas de 25 kg" y esa lectura se perdería.
  //
  // Unificarlos dejaría el archivo sin lo único para lo que existe.
  const crudo = structuredClone(datos)

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

  // Los campos nuevos son OPCIONALES y no invalidan un renglón: un remito no
  // trae precios y son la mitad de los casos. Lo único que se hace es
  // normalizar el tipo — si el modelo devolvió "$ 1.234,56" en vez de un
  // número, va a null antes que ensuciar el prellenado con tipos mezclados.
  // El archivo `crudo` conserva lo que vino, sea lo que sea.
  const NUMERICOS_ITEM = ['precio_unitario', 'precio_total', 'alicuota_iva']
  for (const item of datos.items as Record<string, unknown>[]) {
    for (const campo of NUMERICOS_ITEM) {
      if (typeof item[campo] !== 'number' || !Number.isFinite(item[campo] as number)) {
        item[campo] = null
      }
    }
    // tipo_sugerido es una SUGERENCIA, nunca una decisión: cualquier cosa que
    // no sea exactamente uno de los dos valores va a null, y el wizard obliga a
    // elegir. Mismo criterio que tipo_doc. Un valor raro no invalida el
    // renglón: el resto de la línea sigue sirviendo para prellenar.
    if (typeof item.tipo_sugerido !== 'string' || !TIPOS_INSUMO_VALIDOS.includes(item.tipo_sugerido)) {
      item.tipo_sugerido = null
    }
  }
  for (const campo of ['importe_neto', 'importe_iva', 'importe_total']) {
    if (typeof datos[campo] !== 'number' || !Number.isFinite(datos[campo] as number)) {
      datos[campo] = null
    }
  }

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

  // `crudo` viaja aparte de `datos`: el wizard prellena con el segundo y
  // archiva el primero en ocr_crudo. Ver el comentario de la separación.
  return json({ ok: true, datos, crudo }, 200)
})

// ── Helper ─────────────────────────────────────────────────────────────────────
function json(cuerpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...HEADERS_CORS, 'Content-Type': 'application/json' },
  })
}
