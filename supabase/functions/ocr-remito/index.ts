// ocr-remito — lectura de los REMITOS A MANO de Rosario (Dolce Pasta) para la
// precarga de órdenes de retiro (27/10/2026).
//
// SEPARADA de ocr-materia-prima (compras), de ocr-comprobante (Gastos) y de las
// de Cobranzas: es otro papel. Copia la estructura de ocr-materia-prima (CORS,
// login, Messages API, guarda de max_tokens, JSON envuelto en ```json) y baja
// la foto del bucket como ocr-cobranza-comprobantes.
//
// Recibe { remito_id }: una fila de remitos_precarga ya creada por
// crear_remito_precarga (estado 'leyendo'). Con el TOKEN DE QUIEN LLAMA
// (cliente con la SUPABASE_ANON_KEY + el Authorization que llegó, así que el
// RLS de la tabla y del bucket siguen aplicando):
//   1. lee la fila (si no la ve: 404);
//   2. baja la foto (foto_path) del bucket "comprobantes";
//   3. arma el catálogo de ESA fábrica (la unidad_negocio_id de la fila):
//      presentaciones de sus productos activos, conos de papel, insumos
//      activos (mismo criterio que la Carga de retiros.html: el catálogo de
//      insumos activos, que lee cualquier usuario) y sus clientes activos;
//   4. le pide al modelo SOLO un JSON con el encabezado y los renglones;
//   5. graba con guardar_lectura_remito(p_id, p_datos, p_crudo, p_modelo):
//      p_crudo = el JSON que respondió el modelo SIN TOCAR; p_datos = lo mismo
//      con los ids que no están en el catálogo enviado pasados a null y el
//      renglón marcado para revisar (la base vuelve a limpiar todo igual).
//      Lleva talonario ('oficial' | 'acopio', el celeste de acopio) y, por
//      renglón, omitir (mercadería de terceros que no va en la orden).
// Si algo falla después de leer la fila (foto, modelo, lectura, RPC), deja el
// remito en 'error' con marcar_error_lectura_remito y un mensaje en castellano
// simple, y devuelve { ok: false, mensaje }. Si sale bien: { ok: true, remito }
// con la fila que devolvió guardar_lectura_remito (sin ocr_crudo).
//
// Una respuesta que NO es JSON NO se graba como lectura: se marca error. Grabar
// un {texto} dejaría el remito 'precargada' y vacío, como si la IA hubiera
// leído un remito sin nada; el error dice la verdad y se puede volver a leer.
//
// El modelo se elige con el secret OCR_REMITO_MODELO (sin tocar código), con
// el mismo por defecto que ocr-materia-prima.
//
// NO DESPLEGADA: la despliega el chat de la base después de auditarla, con
// verify_jwt: true como las demás.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
// El MISMO por defecto que ocr-materia-prima (su constante MODELO).
const MODELO_POR_DEFECTO = 'claude-sonnet-4-6'
const BUCKET = 'comprobantes'
const BYTES_MAXIMO = 10 * 1024 * 1024
// Hasta 60 renglones (el tope de _remito_items_normalizar), cada uno con tres
// ids completos y sus lotes: unos 120 tokens por renglón. Si igual se corta, lo
// detecta la guarda de stop_reason.
const MAX_TOKENS = 8192
const RENGLONES_MAXIMO = 60
const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESTADOS_QUE_SE_LEEN = ['leyendo', 'error', 'precargada']

const REGLAS = `En la imagen hay un REMITO ESCRITO A MANO de Dolce Pasta (Rosario, Argentina): la
salida de mercadería de la fábrica (cajas de cucuruchos y barquillos, con o sin cono
de papel, y a veces insumos). Puede ser de DOS talonarios:
- "oficial": el talonario Dolce Pasta, con el número IMPRESO arriba a la derecha
  (tipo 0001-00003100), la fecha en casillas dd/mm/aa, "Señor/es" (el cliente) y
  renglones CANT. / DESCRIPCIÓN.
- "acopio": un talonario CELESTE genérico que dice "Documento no válido como
  factura", con un número ROJO (tipo 977492…). Es para retirar mercadería ya
  facturada como acopio.
Reconocé cuál es por el formato del papel.

QUÉ DEVOLVER:
- talonario: "oficial" o "acopio", según lo de arriba.
- numero_remito: en el oficial, el número IMPRESO arriba a la derecha, tal cual
  (ej. "0001-00003100"); en el de acopio, el número rojo. No uses otros números
  escritos a mano.
- fecha: la de las casillas dd/mm/aa, en formato AAAA-MM-DD ("27/10/26" → "2026-10-27").
  Día primero, como en la Argentina.
- cliente_leido: lo que dice "Señor/es", literal.
- cliente_id: el del catálogo de CLIENTES que corresponde a lo leído: reconocelo por
  nombre, razón social, apodos o N° de cliente. Si no estás seguro, null.
- transporte: el transporte o quién lo lleva, si figura. Si no, null.
- observaciones: cualquier otra anotación del remito, breve ("N pallets", "a
  granel", la marca del acopio…). Si no hay, null.
- items: UN renglón por cada renglón escrito, de arriba hacia abajo, con:
  · texto_leido: lo que dice el papel en ese renglón, LITERAL, sin corregir.
  · cantidad: la cantidad de la columna CANT. (cajas), como número.
  · presentacion_id: la presentación del catálogo de PRESENTACIONES.
  · marca_id: el cono de papel del catálogo de CONOS, si el renglón lleva cono.
  · insumo_id: el insumo del catálogo de INSUMOS, si el renglón es un insumo y no
    un producto (si hay presentación, va null).
  · lotes: [{ "lote": "...", "cajas": número }] si el renglón anota lotes; si no, [].
  · omitir: true si el renglón es mercadería de TERCEROS que está en el papel pero no
    va en la orden: lo que claramente no es del catálogo de Dolce ni de reventa
    (envases térmicos, salsas que manda un cliente). Si no, false.
  · revisar: true si hay CUALQUIER duda; false si está todo claro (o si omitir es true).
  · nota: si revisar es true, una nota MUY corta que diga la duda
    (ej. "leí Lelona, ¿LEROMA?", "número remarcado", "no hay un 48 en el catálogo").
    Si no, null.

REGLAS:
- Usá SOLO ids que estén en el catálogo de abajo, copiados completos. NUNCA inventes
  un id ni elijas uno "parecido" de otro producto: si no está, null y revisar true.
- La presentación se elige por las UNIDADES de la caja (×252, ×180, ×168…) y por si
  dice "con cono X" (presentación con cono) o no. "Común" (o "com") = sin cono.
- El cono va en marca_id. Si el cono o el producto no está en el catálogo, o hay
  duda (un número remarcado, un 48 que no existe), revisar true con la nota.
- "ILUST." = el cono es de papel ilustración (columna papel ilustración de CONOS):
  el nombre que sigue es el cono (QUINTANA, MARBET, RIO…).
- "C. Gde" / "C. Mini" / "C. ST" / "C. Chico" = Cucuruchón Grande / Mini / Standard /
  Chico. "NUSS" al lado es la caja, NO un cono.
- "Cap. x80" = Capelina Grande.
- "Cono 40x180 RIO" = Barquillo 40 x4, presentación "Caja N°2" ×180, cono RIO.
- El "40" o el "45" sin "x3" es el x4. El x3 solo si dice x3.
- Chocolate SOLO si el renglón lo dice. Si no lo dice, el producto común.
- Los productos pueden estar escritos con su ALIAS (columna alias del catálogo).
- "Reposición" escrito arriba de unos renglones = esos renglones son de reposición:
  la precarga no lo admite, así que van con revisar true y nota "reposición".
- "N pallets" y "a granel" van a observaciones, no son renglones.
- En el talonario de acopio, "Acopio MAS" / "Acopio Kiwi" (o la marca que diga) va a
  observaciones con la marca del acopio.
- Si un dato no se ve o no estás seguro, null. Un null se corrige en segundos; un
  dato inventado puede pasar desapercibido.
- Si no podés leer ningún renglón, "items": [].

Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{
  "talonario": "oficial" | "acopio",
  "numero_remito": "texto" | null,
  "fecha": "AAAA-MM-DD" | null,
  "cliente_id": "id del catálogo" | null,
  "cliente_leido": "texto" | null,
  "transporte": "texto" | null,
  "observaciones": "texto" | null,
  "items": [
    {
      "texto_leido": "texto",
      "cantidad": número | null,
      "presentacion_id": "id del catálogo" | null,
      "marca_id": "id del catálogo" | null,
      "insumo_id": "id del catálogo" | null,
      "lotes": [{ "lote": "texto", "cajas": número }],
      "omitir": true | false,
      "revisar": true | false,
      "nota": "texto" | null
    }
  ]
}`

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Fila = Record<string, unknown>
type Catalogo = {
  presentaciones: Fila[]
  marcas: Fila[]
  insumos: Fila[]
  clientes: Fila[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS_CORS })
  if (req.method !== 'POST') return json({ ok: false, mensaje: 'Método no permitido' }, 405)

  // ── Sesión ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, mensaje: 'No autorizado' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: errorAuth } = await supabase.auth.getUser()
  if (errorAuth || !user) return json({ ok: false, mensaje: 'Sesión inválida o expirada' }, 401)

  // ── Cuerpo ────────────────────────────────────────────────────────────────
  let body: { remito_id?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }
  const remitoId = typeof body?.remito_id === 'string' ? body.remito_id.trim() : ''
  if (!UUID.test(remitoId)) return json({ ok: false, mensaje: 'Falta el remito a leer (remito_id).' }, 400)

  // ── La fila, con el RLS de quien llama ────────────────────────────────────
  const { data: remito, error: errorRemito } = await supabase.from('remitos_precarga')
    .select('id, unidad_negocio_id, foto_path, estado').eq('id', remitoId).maybeSingle()
  if (errorRemito) {
    console.error('No se pudo leer el remito:', errorRemito)
    return json({ ok: false, mensaje: 'No se pudo leer el remito. Probá de nuevo.' }, 500)
  }
  if (!remito) {
    return json({ ok: false, mensaje: 'No se encontró el remito, o no tenés permiso para verlo.' }, 404)
  }
  if (!ESTADOS_QUE_SE_LEEN.includes(remito.estado)) {
    return json({ ok: false, mensaje: 'Ese remito ya se confirmó o se descartó: no se vuelve a leer.' }, 409)
  }

  // Desde acá, todo lo que falla deja el remito en 'error' con el motivo.
  const fallar = async (mensaje: string, status: number) => {
    const { error } = await supabase.rpc('marcar_error_lectura_remito', { p_id: remitoId, p_error: mensaje })
    if (error) console.error('No se pudo marcar el error del remito:', error)
    return json({ ok: false, mensaje }, status)
  }

  // ── La foto, con el token de quien llama ──────────────────────────────────
  const ruta = typeof remito.foto_path === 'string' ? remito.foto_path.trim() : ''
  if (!rutaValida(ruta)) return await fallar('La foto del remito no está donde tiene que estar. Volvé a subirla.', 400)
  const { data: blob, error: errorDescarga } = await supabase.storage.from(BUCKET).download(ruta)
  if (errorDescarga || !blob) {
    console.error('No se pudo bajar la foto del remito:', errorDescarga)
    return await fallar('No se pudo bajar la foto del remito. Volvé a subirla.', 404)
  }
  const mime = mimeDe(blob.type, ruta)
  if (!mime) return await fallar('La foto tiene que ser una imagen (JPEG, PNG o WEBP) o un PDF.', 400)
  if (blob.size > BYTES_MAXIMO) return await fallar('La foto pesa más de 10 MB. Sacala de nuevo con menos calidad.', 400)
  const base64 = base64DeBytes(new Uint8Array(await blob.arrayBuffer()))

  // ── El catálogo de ESA fábrica ────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY no está configurada como secret de Supabase.')
    return await fallar('Error de configuración del servidor: falta la clave de la IA.', 500)
  }
  let catalogo: Catalogo
  try {
    catalogo = await leerCatalogo(supabase, remito.unidad_negocio_id)
  } catch (err) {
    console.error('No se pudo leer el catálogo:', err)
    return await fallar('No se pudo leer el catálogo de la fábrica. Probá Volver a leer.', 500)
  }

  // ── Modelo ────────────────────────────────────────────────────────────────
  const modelo = Deno.env.get('OCR_REMITO_MODELO')?.trim() || MODELO_POR_DEFECTO
  const archivo = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mime, data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } }

  let respuesta: Response
  try {
    respuesta = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [archivo, { type: 'text', text: REGLAS + '\n\n' + textoCatalogo(catalogo) }],
        }],
      }),
    })
  } catch (err) {
    console.error('Error de red al llamar al modelo:', err)
    return await fallar('No se pudo conectar con la IA. Probá Volver a leer.', 502)
  }

  if (!respuesta.ok) {
    console.error(`Error del modelo (${respuesta.status}):`, await respuesta.text())
    return await fallar('La IA devolvió un error. Probá Volver a leer en un rato.', 502)
  }

  let cuerpo: Fila
  try {
    cuerpo = await respuesta.json()
  } catch {
    return await fallar('La IA devolvió algo que no se entiende. Probá Volver a leer.', 502)
  }
  const texto: string = Array.isArray(cuerpo?.content)
    ? (cuerpo.content as Fila[]).filter((b) => b?.type === 'text').map((b) => String(b.text ?? '')).join('\n')
    : ''

  // Se quedó sin espacio: el JSON viene cortado. El mensaje dice qué pasó.
  if (cuerpo?.stop_reason === 'max_tokens') {
    console.error('Respuesta truncada por max_tokens. Largo:', texto.length)
    return await fallar('El remito tiene demasiados renglones para leer de una vez. Cargá los renglones a mano.', 200)
  }

  const crudo = extraerJson(texto)
  if (!crudo) {
    console.error('No se pudo parsear la respuesta:', texto)
    return await fallar('La IA no devolvió una lectura que se pueda usar. Probá Volver a leer.', 200)
  }

  // ── Grabar ────────────────────────────────────────────────────────────────
  // p_crudo va SIN TOCAR (el registro del papel); p_datos, depurado.
  const datos = depurar(crudo, catalogo)
  const { data: fila, error: errorGuardar } = await supabase.rpc('guardar_lectura_remito', {
    p_id: remitoId, p_datos: datos, p_crudo: crudo, p_modelo: modelo,
  })
  if (errorGuardar || !fila) {
    console.error('No se pudo guardar la lectura:', errorGuardar)
    return await fallar('No se pudo guardar lo leído. Probá Volver a leer.', 500)
  }
  return json({ ok: true, remito: fila }, 200)
})

// ── El catálogo ───────────────────────────────────────────────────────────────
// Productos y clientes de la fábrica de la fila; conos e insumos como los
// ofrece la Carga (retiros.html, leerCatalogo): conos activos y no rechazados,
// insumos activos.
async function leerCatalogo(supabase: ReturnType<typeof createClient>, unidadId: string): Promise<Catalogo> {
  const [p, m, i, c] = await Promise.all([
    supabase.from('productos_terminados').select('id, nombre, alias')
      .eq('unidad_negocio_id', unidadId).eq('activo', true).order('orden'),
    supabase.from('marcas_personalizadas').select('id, nombre, papel_ilustracion')
      .eq('activa', true).neq('estado_alta', 'rechazada').order('nombre'),
    supabase.from('insumos').select('id, nombre, marca, nombre_bulto, contenido_bulto, unidad_medida')
      .eq('activo', true).order('nombre'),
    supabase.from('clientes').select('id, nombre, razon_social, apodos, codigo_anterior')
      .eq('unidad_negocio_id', unidadId).eq('activo', true).order('nombre'),
  ])
  for (const r of [p, m, i, c]) if (r.error) throw r.error
  const productos = (p.data ?? []) as Fila[]
  const porId = new Map(productos.map((x) => [x.id, x]))
  let presentaciones: Fila[] = []
  if (productos.length) {
    const pr = await supabase.from('producto_presentaciones')
      .select('id, producto_id, nombre, con_cono, media_caja, empaque, unidades_por_caja')
      .in('producto_id', productos.map((x) => x.id)).eq('activa', true).order('orden')
    if (pr.error) throw pr.error
    presentaciones = ((pr.data ?? []) as Fila[])
      .filter((x) => porId.has(x.producto_id))
      .map((x) => ({ ...x, producto: porId.get(x.producto_id)!.nombre, alias: porId.get(x.producto_id)!.alias }))
  }
  return { presentaciones, marcas: (m.data ?? []) as Fila[], insumos: (i.data ?? []) as Fila[], clientes: (c.data ?? []) as Fila[] }
}

// Una celda del catálogo: sin separadores ni saltos, corta.
function celda(v: unknown): string {
  if (Array.isArray(v)) return v.map(celda).filter(Boolean).join('; ')
  if (v === null || v === undefined) return ''
  return String(v).replace(/[|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

function siNo(v: unknown): string {
  return v === true ? 'sí' : 'no'
}

// Tabular y breve: los ids completos, sin nombres de columna repetidos.
function textoCatalogo(c: Catalogo): string {
  const bloque = (titulo: string, filas: string[]) => `${titulo}\n${filas.length ? filas.join('\n') : '(ninguno)'}`
  return [
    'CATÁLOGO DE ESTA FÁBRICA (una fila por línea, columnas separadas por |):',
    bloque('PRESENTACIONES: presentacion_id | producto | alias | presentación | unidades por caja | con cono | media caja | empaque',
      c.presentaciones.map((x) => [x.id, x.producto, x.alias, x.nombre, x.unidades_por_caja, siNo(x.con_cono), siNo(x.media_caja), x.empaque].map(celda).join(' | '))),
    bloque('CONOS: marca_id | cono de papel | papel ilustración',
      c.marcas.map((x) => [x.id, x.nombre, siNo(x.papel_ilustracion)].map(celda).join(' | '))),
    bloque('INSUMOS: insumo_id | insumo | marca | bulto | contenido del bulto | unidad',
      c.insumos.map((x) => [x.id, x.nombre, x.marca, x.nombre_bulto, x.contenido_bulto, x.unidad_medida].map(celda).join(' | '))),
    bloque('CLIENTES: cliente_id | N° de cliente | nombre | razón social | apodos',
      c.clientes.map((x) => [x.id, x.codigo_anterior, x.nombre, x.razon_social, x.apodos].map(celda).join(' | '))),
  ].join('\n\n')
}

// ── La respuesta del modelo ───────────────────────────────────────────────────
// Puede venir envuelta en ```json ... ```: primero se prueba el texto sin el
// envoltorio y, si no es JSON (texto antes o después), del primer { al último }.
// Solo sirve un OBJETO: una lista no es una lectura.
function extraerJson(texto: string): Fila | null {
  const t = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  for (const candidato of [t, (t.match(/\{[\s\S]*\}/) ?? [])[0]]) {
    if (!candidato) continue
    let v: unknown
    try {
      v = JSON.parse(candidato)
    } catch {
      continue
    }
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Fila : null
  }
  return null
}

function textoONull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

// "AAAA-MM-DD" tal cual; "dd/mm/aa" o "dd/mm/aaaa" (lo que dicen las casillas)
// se pasa a AAAA-MM-DD. Lo demás, null. Que exista y no sea futura lo mira la base.
function fechaIso(v: unknown): string | null {
  const t = textoONull(v)
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (!m) return null
  const anio = m[3].length === 2 ? '20' + m[3] : m[3]
  return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// p_datos: el crudo con los ids que NO están en el catálogo enviado pasados a
// null (y el renglón para revisar, con la nota), y los tipos normalizados.
// La base vuelve a limpiar todo (_remito_items_normalizar); esto es para que
// un id que la IA sacó de otro lado nunca llegue como si fuera una lectura.
function depurar(crudo: Fila, c: Catalogo): Fila {
  const ids = (filas: Fila[]) => new Set(filas.map((x) => x.id))
  const presentaciones = new Map(c.presentaciones.map((x) => [x.id, x]))
  const marcas = ids(c.marcas)
  const insumos = ids(c.insumos)
  const clientes = ids(c.clientes)
  const items = (Array.isArray(crudo.items) ? crudo.items : [])
    .filter((it: unknown) => it && typeof it === 'object' && !Array.isArray(it))
    .slice(0, RENGLONES_MAXIMO)
    .map((it: Fila) => {
      const notas: string[] = []
      let revisar = it.revisar === true
      const id = (v: unknown, valido: (x: unknown) => boolean) => {
        const t = textoONull(v)
        if (!t) return null
        if (valido(t)) return t
        revisar = true
        if (!notas.includes('La IA eligió algo que no está en el catálogo.')) notas.push('La IA eligió algo que no está en el catálogo.')
        return null
      }
      const presentacion_id = id(it.presentacion_id, (x) => presentaciones.has(x))
      const marca_id = id(it.marca_id, (x) => marcas.has(x))
      const insumo_id = presentacion_id ? null : id(it.insumo_id, (x) => insumos.has(x))
      const pres = presentacion_id ? presentaciones.get(presentacion_id) : null
      if (pres && marca_id && pres.con_cono !== true) { revisar = true; notas.push('Tiene cono pero la presentación es sin cono.') }
      if (pres && !marca_id && pres.con_cono === true) { revisar = true; notas.push('Falta el cono.') }
      const cantidad = typeof it.cantidad === 'number' && Number.isFinite(it.cantidad) && it.cantidad > 0 ? it.cantidad : null
      const lotes = (Array.isArray(it.lotes) ? it.lotes : [])
        .filter((l: unknown) => l && typeof l === 'object')
        .map((l: Fila) => ({ lote: textoONull(l.lote), cajas: typeof l.cajas === 'number' && Number.isInteger(l.cajas) && l.cajas > 0 ? l.cajas : null }))
        .filter((l: Fila) => l.lote !== null)
      const nota = [textoONull(it.nota), ...notas].filter(Boolean).join(' ') || null
      // Mercadería de terceros: está en el papel pero no va en la orden. Como
      // en la base, un renglón omitido no queda para revisar.
      const omitir = it.omitir === true
      return {
        texto_leido: textoONull(it.texto_leido),
        cantidad, presentacion_id, marca_id, insumo_id, lotes, omitir,
        revisar: !omitir && (revisar || (!presentacion_id && !insumo_id) || cantidad === null),
        nota,
      }
    })
  const cliente = textoONull(crudo.cliente_id)
  return {
    // La base pone 'acopio' solo si dice exactamente eso; lo demás es 'oficial'.
    talonario: crudo.talonario === 'acopio' ? 'acopio' : 'oficial',
    numero_remito: textoONull(crudo.numero_remito),
    fecha: fechaIso(crudo.fecha),
    cliente_id: cliente && clientes.has(cliente) ? cliente : null,
    cliente_leido: textoONull(crudo.cliente_leido),
    transporte: textoONull(crudo.transporte),
    observaciones: textoONull(crudo.observaciones),
    items,
  }
}

// ── Archivo y ruta ────────────────────────────────────────────────────────────
// La foto vive en <uid de quien la subió>/remitos/<archivo>. No se exige el uid
// de quien llama: Yanina vuelve a leer remitos que subió Manuel (la policy
// "comprobantes: ver fotos de remitos precargados" la deja).
function rutaValida(ruta: string): boolean {
  const s = ruta.split('/')
  return s.length === 3 && s[1] === 'remitos' && s.every((x) => x !== '' && x !== '.' && x !== '..')
}

function mimeDe(tipo: unknown, ruta: string): string | null {
  const t = typeof tipo === 'string' ? tipo.toLowerCase().split(';')[0].trim() : ''
  if (MIME_VALIDOS.includes(t)) return t
  if (t && t !== 'application/octet-stream') return null
  const r = ruta.toLowerCase()
  if (r.endsWith('.jpg') || r.endsWith('.jpeg')) return 'image/jpeg'
  if (r.endsWith('.png')) return 'image/png'
  if (r.endsWith('.webp')) return 'image/webp'
  if (r.endsWith('.pdf')) return 'application/pdf'
  return null
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
