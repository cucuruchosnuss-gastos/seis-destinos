// ocr-cobranza-comprobantes — lectura de comprobantes de TRANSFERENCIAS y de
// E-CHEQUES para el módulo Cobranzas (02/10/2026).
//
// SEPARADA de ocr-cheques (cheques de papel), de ocr-comprobante (Gastos) y de
// ocr-materia-prima (Ingreso): son documentos distintos. Copia la estructura
// de ocr-cheques.
//
// Recibe { storage_path, tipo: 'transferencia' | 'echeque' }: la RUTA de un
// archivo ya subido al bucket "cobranzas" (no el archivo en base64). Lo baja
// con el token de quien llama, así que respeta las políticas de Storage.
// Acepta JPEG, WEBP, PNG y PDF (el PDF va al modelo como documento).
//
// El modelo se elige con el secret OCR_COMPROBANTES_MODELO (sin tocar código),
// con el mismo por defecto que ocr-cheques.
//
// Devuelve DOS cosas, y no hay que unificarlas:
//   · `crudo`      = lo que respondió el modelo, sin tocar. Se archiva en
//                    cobranza_fotos.ocr_crudo.
//   · `propuestos` = lo mismo normalizado + los CONTROLES que calcula esta
//                    función (no el modelo): CUIT válido, CMC-7 de 29 dígitos y
//                    fechas que existen. Ver normalizar.js.
// El OCR PROPONE; la persona confirma o corrige en pantalla.
//
// NO ESTÁ PUBLICADA todavía: la publica Claude después de auditarla, con sus
// DOS archivos (index.ts y normalizar.js).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TIPOS, mimeDe, normalizarRespuesta, rutaValida } from './normalizar.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
// El MISMO por defecto que ocr-cheques: cambiarlo se decide midiendo.
const MODELO_POR_DEFECTO = 'claude-opus-5'
const BUCKET = 'cobranzas'
// El bucket ya corta en 10 MB; acá se corta antes de mandarle algo enorme al
// modelo si alguna vez el bucket se agranda.
const BYTES_MAXIMO = 10 * 1024 * 1024

const REGLAS_COMUNES = `REGLAS:
- Es un comprobante ARGENTINO: captura de pantalla de un home banking o de una
  billetera (Macro, Nación, Santander, Galicia, BBVA, Provincia, Credicoop,
  ICBC, Brubank, Ualá, Mercado Pago, Naranja X, Personal Pay, Modo, etc.) o un
  PDF que bajó el banco.
- Leé por SIGNIFICADO, no por posición: cada banco ubica los datos distinto.
- Si un dato no se ve o no estás seguro, usá null. NUNCA inventes ni completes
  un dígito que no ves. Un null se corrige en segundos; un dato inventado puede
  pasar desapercibido.
- Importes como NÚMERO JSON con punto decimal, sin separador de miles ni
  símbolo: "$ 427.256,86" → 427256.86.
- Fechas en formato YYYY-MM-DD. "02/10/2026" es 2 de octubre de 2026 (día
  primero, como en la Argentina).
- CUIT: 11 dígitos sin guiones.
- Si el archivo trae VARIOS comprobantes, uno por cada uno, de arriba hacia
  abajo.`

const PROMPT_TRANSFERENCIA = `En el archivo hay uno o más COMPROBANTES DE TRANSFERENCIA BANCARIA que un
cliente le mandó a la empresa como pago. Extraé los datos de CADA comprobante.

QUÉ BUSCAR:
- importe: el monto transferido.
- fecha: la fecha de la transferencia (no la de impresión del comprobante).
- banco_origen: el banco o la billetera DESDE donde se hizo (el del logo o el
  "Cuenta origen"; si no se ve, null).
- ordenante: quién transfirió (nombre o razón social del "Titular", "Origen",
  "Ordenante" o "De").
- cuit_ordenante: el CUIT o CUIL de quien transfirió.
- referencia: el NÚMERO DE OPERACIÓN o de comprobante ("N° de operación",
  "Número de control", "ID de transacción", "Código de referencia"). Tal cual,
  como texto.

${REGLAS_COMUNES}

Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{
  "comprobantes": [
    {
      "importe": número | null,
      "fecha": "YYYY-MM-DD" | null,
      "banco_origen": "texto" | null,
      "ordenante": "texto" | null,
      "cuit_ordenante": "11 dígitos" | null,
      "referencia": "texto" | null,
      "notas": "cualquier duda de lectura, breve" | null
    }
  ]
}`

const PROMPT_ECHEQUE = `En el archivo hay uno o más comprobantes de E-CHEQUES (ECHEQ: cheques
electrónicos argentinos), por ejemplo la captura del home banking con el
detalle del e-cheque recibido o el PDF del banco. Extraé los datos de CADA uno.

QUÉ BUSCAR:
- banco_codigo: el código de la entidad emisora (3 dígitos; el Galicia es 007,
  el Nación 011, el Santander 072, el Macro 285).
- cmc7: el "CMC7" del ECHEQ, SOLO los dígitos. Son 29: entidad(3) +
  sucursal(3) + código postal(4) + número de cheque(8) + cuenta(11).
- numero: el número de cheque (8 dígitos).
- sucursal_codigo (3), codigo_postal (4) y cuenta (11), si se ven sueltos.
- emisor: el nombre o razón social del librador (quien emitió el e-cheque).
- cuit_emisor: el CUIT del librador.
- fecha_emision: la fecha de emisión.
- fecha_pago: la fecha de pago ("Fecha de pago" o de vencimiento).
- importe: el monto.
- id_echeq: el "ID del ECHEQ" o "Identificador", tal cual, como texto.
- banco_nombre: el nombre del banco emisor, si se ve.

${REGLAS_COMUNES}

Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{
  "comprobantes": [
    {
      "banco_codigo": "3 dígitos" | null,
      "cmc7": "29 dígitos" | null,
      "numero": "8 dígitos" | null,
      "sucursal_codigo": "3 dígitos" | null,
      "codigo_postal": "4 dígitos" | null,
      "cuenta": "11 dígitos" | null,
      "emisor": "texto" | null,
      "cuit_emisor": "11 dígitos" | null,
      "fecha_emision": "YYYY-MM-DD" | null,
      "fecha_pago": "YYYY-MM-DD" | null,
      "importe": número | null,
      "id_echeq": "texto" | null,
      "banco_nombre": "texto" | null,
      "notas": "cualquier duda de lectura, breve" | null
    }
  ]
}`

const HEADERS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  let body: { storage_path?: unknown, tipo?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }
  const tipo = typeof body.tipo === 'string' ? body.tipo : ''
  if (!TIPOS.includes(tipo)) {
    return json({ ok: false, mensaje: 'Tipo de comprobante inválido: tiene que ser transferencia o echeque.' }, 400)
  }
  const ruta = typeof body.storage_path === 'string' ? body.storage_path.trim() : ''
  if (!rutaValida(ruta, user.id)) return json({ ok: false, mensaje: 'Ruta del comprobante inválida' }, 400)

  // ── Bajar el archivo con el token del usuario ─────────────────────────────
  const { data: blob, error: errorDescarga } = await supabase.storage.from(BUCKET).download(ruta)
  if (errorDescarga || !blob) {
    console.error('No se pudo bajar el comprobante:', errorDescarga)
    return json({ ok: false, mensaje: 'No se encontró el comprobante. Volvé a subirlo.' }, 404)
  }
  const mime = mimeDe(blob.type, ruta)
  if (!mime) return json({ ok: false, mensaje: 'El comprobante tiene que ser una imagen (JPEG, PNG o WEBP) o un PDF.' }, 400)
  if (blob.size > BYTES_MAXIMO) return json({ ok: false, mensaje: 'El comprobante pesa más de 10 MB.' }, 400)
  const base64 = base64DeBytes(new Uint8Array(await blob.arrayBuffer()))

  // ── Modelo ────────────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY no está configurada como secret de Supabase.')
    return json({ ok: false, mensaje: 'Error de configuración del servidor' }, 500)
  }
  const modelo = Deno.env.get('OCR_COMPROBANTES_MODELO')?.trim() || MODELO_POR_DEFECTO

  // El PDF va como documento; las imágenes, como imagen. Siempre ANTES del
  // texto: es la estructura recomendada.
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
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [archivo, { type: 'text', text: tipo === 'echeque' ? PROMPT_ECHEQUE : PROMPT_TRANSFERENCIA }],
        }],
      }),
    })
  } catch (err) {
    console.error('Error de red al llamar al modelo:', err)
    return json({ ok: false, mensaje: 'No se pudo conectar con el servicio de lectura' }, 502)
  }

  if (!respuesta.ok) {
    console.error(`Error del modelo (${respuesta.status}):`, await respuesta.text())
    return json({ ok: false, mensaje: 'El servicio de lectura devolvió un error' }, 502)
  }

  const cuerpo = await respuesta.json()
  const texto: string = Array.isArray(cuerpo.content)
    ? cuerpo.content.filter((b: { type?: string }) => b?.type === 'text').map((b: { text?: string }) => b.text ?? '').join('\n')
    : ''

  if (cuerpo.stop_reason === 'max_tokens') {
    console.error('Respuesta truncada por max_tokens. Largo:', texto.length)
    return json({ ok: false, modelo, mensaje: 'El comprobante tiene demasiados datos para leer de una vez. Cargalo a mano.' }, 200)
  }

  let crudo: Record<string, unknown>
  try {
    const m = texto.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('sin JSON')
    crudo = JSON.parse(m[0])
  } catch {
    console.error('No se pudo parsear la respuesta:', texto)
    return json({ ok: false, modelo, mensaje: 'No se pudo leer el comprobante. Cargalo a mano.' }, 200)
  }

  const propuestos = normalizarRespuesta(tipo, crudo)
  if (propuestos.length === 0) {
    return json({ ok: false, modelo, crudo, propuestos, mensaje: 'No se encontraron datos en el comprobante. Cargalo a mano.' }, 200)
  }
  return json({ ok: true, modelo, tipo, crudo, propuestos }, 200)
})

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
