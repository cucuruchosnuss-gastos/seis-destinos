// ocr-cheques — lectura de cheques en papel para el módulo Cobranzas.
//
// SEPARADA de ocr-comprobante (Gastos) y de ocr-materia-prima (Ingreso): son
// documentos distintos y mezclarlos rompería las tres.
//
// Recibe la RUTA de una foto ya subida al bucket "cobranzas" (no la imagen en
// base64): la foto se sube una sola vez desde el celular y esta función la baja
// con el token de quien llama, así que respeta las políticas de Storage.
//
// El modelo se elige con el secret OCR_CHEQUES_MODELO (sin tocar código).
//
// Devuelve DOS cosas, igual que ocr-materia-prima, y no hay que unificarlas:
//   · `crudo`   = lo que respondió el modelo, sin tocar. Se archiva en
//                 cobranza_fotos.ocr_crudo.
//   · `cheques` = lo mismo normalizado + los CONTROLES que calcula esta función
//                 (no el modelo): dígitos verificadores, CMC-7 contra el
//                 recuadro, letras contra números, fechas, moneda.
// El OCR PROPONE; la persona confirma o corrige cada cheque en pantalla.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODELO_POR_DEFECTO = 'claude-opus-5'
const BUCKET = 'cobranzas'
const MIME_VALIDOS = ['image/jpeg', 'image/webp']

const PROMPT_OCR = `En la imagen hay uno o más CHEQUES ARGENTINOS en papel (comunes o de pago
diferido), fotografiados por un repartidor. Extraé los datos de CADA cheque.

CÓMO ESTÁ ARMADO UN CHEQUE ARGENTINO (norma del BCRA):
- Arriba a la derecha hay un RECUADRO con el "código de ruta", en 3 renglones
  impresos, cada uno seguido de un espacio y un DÍGITO VERIFICADOR:
    renglón 1: entidad(3 dígitos)-sucursal(3)-código postal(4)  DV   ej: "285-386-3218 6"
    renglón 2: número de cheque (8 dígitos)                      DV   ej: "66259862 8"
    renglón 3: número de cuenta (11 dígitos)                     DV   ej: "09420314667 0"
- Abajo de todo hay una línea de caracteres magnéticos (CMC-7). Sus dígitos son
  entidad(3) + sucursal(3) + código postal(4) + número de cheque(8) +
  cuenta(11) = 29 dígitos. Transcribí SOLO los dígitos, sin símbolos.
- Los datos del titular de la cuenta (nombre y CUIT) están IMPRESOS.
- Lo MANUSCRITO suele ser: fechas, importe en números, importe en letras,
  "Páguese a" y la firma. Algunos cheques vienen completados a máquina.
- Cheque de PAGO DIFERIDO: dice "CHEQUE DE PAGO DIFERIDO" o "CPD" y tiene DOS
  fechas: la de emisión ("<lugar>, <día> de <mes> de <año>") y la de pago
  ("El <día> de <mes> de <año>").
- Cheque COMÚN: dice solo "CHEQUE" y tiene UNA sola fecha (la de emisión).
- Moneda: pesos ("$", "la cantidad de pesos"). Si dice "U$S" o "dólares", es
  en dólares.

REGLAS:
- Leé por SIGNIFICADO, no por posición: hay cheques impresos desalineados donde
  el importe cae fuera de su casillero o la fecha cae en otro renglón.
- IGNORÁ todo lo escrito a mano FUERA del cuerpo del cheque (anotaciones en los
  márgenes, en el papel de abajo o sobre la mesa: nombres, zonas, números).
  No son datos del cheque.
- Ignorá la firma.
- "junio" y "julio" manuscritos se confunden: mirá bien la letra "n" o "l".
- El año es 20XX: un "2" manuscrito puede parecer un "9".
- Si un dato no se ve o no estás seguro, usá null. NUNCA inventes ni completes
  un dígito que no ves. Un null se corrige en segundos; un dato inventado
  puede pasar desapercibido.
- Si un cheque está cortado por el borde de la foto, igual incluilo con lo que
  se vea y null en el resto.
- Ordená los cheques de arriba hacia abajo y de izquierda a derecha.
- Importes como NÚMERO JSON con punto decimal, sin separador de miles ni
  símbolo: "$ 427.256,86" → 427256.86.
- Fechas en formato YYYY-MM-DD.

Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{
  "cantidad_cheques": número,
  "cheques": [
    {
      "ruta_renglon_1": "texto tal cual, ej 285-386-3218 6" | null,
      "ruta_renglon_2": "ej 66259862 8" | null,
      "ruta_renglon_3": "ej 09420314667 0" | null,
      "cmc7_digitos": "solo dígitos" | null,
      "banco_nombre": "nombre del banco si se ve el logo" | null,
      "tipo": "comun" | "diferido" | null,
      "moneda": "ARS" | "USD" | null,
      "fecha_emision": "YYYY-MM-DD" | null,
      "fecha_pago": "YYYY-MM-DD" | null,
      "importe": número | null,
      "importe_letras": "transcripción literal del importe en letras" | null,
      "importe_letras_valor": número que expresan esas letras | null,
      "titulares": [ { "nombre": "...", "cuit": "11 dígitos sin guiones" | null } ],
      "beneficiario": "texto del renglón Páguese a, si está completo" | null,
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
  let body: { storage_path?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, mensaje: 'El cuerpo del request no es JSON válido' }, 400)
  }
  const ruta = typeof body.storage_path === 'string' ? body.storage_path.trim() : ''
  // Solo fotos de la carpeta propia (la política de Storage ya lo exige para
  // subir; acá se corta antes de gastar una llamada al modelo).
  if (!ruta || !ruta.startsWith(`${user.id}/`)) {
    return json({ ok: false, mensaje: 'Ruta de foto inválida' }, 400)
  }

  // ── Bajar la foto con el token del usuario ────────────────────────────────
  const { data: blob, error: errorDescarga } = await supabase.storage.from(BUCKET).download(ruta)
  if (errorDescarga || !blob) {
    console.error('No se pudo bajar la foto:', errorDescarga)
    return json({ ok: false, mensaje: 'No se encontró la foto. Volvé a subirla.' }, 404)
  }
  const mime = MIME_VALIDOS.includes(blob.type) ? blob.type
    : ruta.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  const imagenBase64 = base64DeBytes(new Uint8Array(await blob.arrayBuffer()))

  // ── Modelo ────────────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY no está configurada como secret de Supabase.')
    return json({ ok: false, mensaje: 'Error de configuración del servidor' }, 500)
  }
  const modelo = Deno.env.get('OCR_CHEQUES_MODELO')?.trim() || MODELO_POR_DEFECTO

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
        // ~350 tokens por cheque con titulares: 8000 da para una foto con
        // muchos cheques. Si igual se corta, lo ataja la guarda de abajo.
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            // Imagen ANTES del texto: es la estructura recomendada.
            { type: 'image', source: { type: 'base64', media_type: mime, data: imagenBase64 } },
            { type: 'text', text: PROMPT_OCR },
          ],
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
    return json({ ok: false, modelo, mensaje: 'La foto tiene demasiados cheques para leer de una vez. Sacá fotos con menos cheques.' }, 200)
  }

  let crudo: Record<string, unknown>
  try {
    const m = texto.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('sin JSON')
    crudo = JSON.parse(m[0])
  } catch {
    console.error('No se pudo parsear la respuesta:', texto)
    return json({ ok: false, modelo, mensaje: 'No se pudo leer la foto. Cargá los cheques a mano.' }, 200)
  }

  const lista = Array.isArray(crudo.cheques) ? crudo.cheques : []
  const cheques = lista
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map(normalizarCheque)

  if (cheques.length === 0) {
    return json({ ok: false, modelo, crudo, mensaje: 'No se detectó ningún cheque en la foto. Cargalos a mano o sacá otra foto.' }, 200)
  }

  return json({
    ok: true,
    modelo,
    cantidad_detectada: cheques.length,
    cantidad_declarada: numeroFinito(crudo.cantidad_cheques),
    cheques,
    crudo,
  }, 200)
})

// ── Normalización y controles ───────────────────────────────────────────────

function normalizarCheque(c: Record<string, unknown>) {
  const r1 = soloDigitos(c.ruta_renglon_1)   // entidad+sucursal+cp+dv = 11
  const r2 = soloDigitos(c.ruta_renglon_2)   // numero+dv = 9
  const r3 = soloDigitos(c.ruta_renglon_3)   // cuenta+dv = 12
  const cmc7 = soloDigitos(c.cmc7_digitos)

  let banco_codigo: string | null = null
  let sucursal_codigo: string | null = null
  let codigo_postal: string | null = null
  let dv_ruta: number | null = null
  let numero: string | null = null
  let dv_numero: number | null = null
  let cuenta: string | null = null
  let dv_cuenta: number | null = null

  if (r1 && r1.length === 11) {
    banco_codigo = r1.slice(0, 3); sucursal_codigo = r1.slice(3, 6)
    codigo_postal = r1.slice(6, 10); dv_ruta = Number(r1[10])
  }
  if (r2 && r2.length === 9) { numero = r2.slice(0, 8); dv_numero = Number(r2[8]) }
  if (r3 && r3.length === 12) { cuenta = r3.slice(0, 11); dv_cuenta = Number(r3[11]) }

  // CMC-7: 29 dígitos = entidad(3) sucursal(3) cp(4) numero(8) cuenta(11)
  const cmc7Valida = cmc7 !== null && cmc7.length === 29
  const deCmc7 = cmc7Valida ? {
    ruta: cmc7!.slice(0, 10), numero: cmc7!.slice(10, 18), cuenta: cmc7!.slice(18, 29),
  } : null

  // Si el recuadro no se leyó (cortado, borroso) pero la CMC-7 sí, se completa
  // desde ahí. OJO: la CMC-7 no trae dígitos verificadores, así que en ese caso
  // el DV se CALCULA y deja de ser un control: se marca para que la persona
  // verifique esos datos contra el papel.
  let completado_desde_cmc7 = false
  if (deCmc7) {
    if (banco_codigo === null) {
      banco_codigo = deCmc7.ruta.slice(0, 3); sucursal_codigo = deCmc7.ruta.slice(3, 6)
      codigo_postal = deCmc7.ruta.slice(6, 10); dv_ruta = dvBcra(deCmc7.ruta)
      completado_desde_cmc7 = true
    }
    if (numero === null) { numero = deCmc7.numero; dv_numero = dvBcra(numero); completado_desde_cmc7 = true }
    if (cuenta === null) { cuenta = deCmc7.cuenta; dv_cuenta = dvBcra(cuenta); completado_desde_cmc7 = true }
  }

  const rutaTexto = banco_codigo && sucursal_codigo && codigo_postal ? banco_codigo + sucursal_codigo + codigo_postal : null

  const tipo = c.tipo === 'comun' || c.tipo === 'diferido' ? c.tipo : null
  const fecha_emision = fechaValida(c.fecha_emision)
  let fecha_pago = fechaValida(c.fecha_pago)
  if (tipo === 'comun') fecha_pago = null

  const importe = numeroPositivo(c.importe)
  const importe_letras_valor = numeroPositivo(c.importe_letras_valor)
  const moneda = c.moneda === 'ARS' || c.moneda === 'USD' ? c.moneda : null

  const titulares = Array.isArray(c.titulares)
    ? c.titulares
        .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
        .map((t) => ({
          nombre: textoONull(t.nombre),
          cuit: (() => { const d = soloDigitos(t.cuit); return d && d.length === 11 ? d : null })(),
        }))
        .filter((t) => t.nombre !== null || t.cuit !== null)
    : []

  const controles = {
    dv_ruta_ok: rutaTexto !== null && dv_ruta !== null ? dvBcra(rutaTexto) === dv_ruta : null,
    dv_numero_ok: numero !== null && dv_numero !== null ? dvBcra(numero) === dv_numero : null,
    dv_cuenta_ok: cuenta !== null && dv_cuenta !== null ? dvBcra(cuenta) === dv_cuenta : null,
    completado_desde_cmc7,
    cmc7_coincide: deCmc7 && rutaTexto && numero && cuenta && !completado_desde_cmc7
      ? deCmc7.ruta === rutaTexto && deCmc7.numero === numero && deCmc7.cuenta === cuenta
      : null,
    letras_coinciden: importe !== null && importe_letras_valor !== null
      ? Math.abs(importe - importe_letras_valor) < 0.005
      : null,
    fechas_ok: controlFechas(tipo, fecha_emision, fecha_pago),
    moneda_ok: moneda === 'USD' || (banco_codigo !== null && banco_codigo.startsWith('5')) ? false
      : moneda === 'ARS' ? true : null,
    cuits_ok: titulares.every((t) => t.cuit === null || cuitValido(t.cuit)),
  }

  return {
    banco_codigo, sucursal_codigo, codigo_postal, dv_ruta,
    numero, dv_numero, cuenta, dv_cuenta,
    banco_nombre_leido: textoONull(c.banco_nombre),
    tipo, fecha_emision, fecha_pago,
    importe,
    importe_letras: textoONull(c.importe_letras),
    importe_letras_valor,
    titulares,
    beneficiario: textoONull(c.beneficiario),
    moneda,
    notas: textoONull(c.notas),
    controles,
  }
}

// Dígito verificador del código de ruta — BCRA, "Características de los
// instrumentos de pago", punto 1.3.1 (ponderador 9713). MISMA fórmula que
// public.dv_bcra() en la base y que dvBcra() en cobranzas.html: si se cambia
// una, se cambian las tres. Casos de la norma: "0110381425" → 7, "0111381425" → 0.
function dvBcra(digitos: string): number | null {
  if (!/^[0-9]+$/.test(digitos)) return null
  const pesos = [3, 1, 7, 9]
  let suma = 0
  const inv = digitos.split('').reverse()
  for (let i = 0; i < inv.length; i++) suma += Number(inv[i]) * pesos[i % 4]
  return (10 - (suma % 10)) % 10
}

// CUIT: módulo 11 con pesos 5,4,3,2,7,6,5,4,3,2. Solo informativo.
function cuitValido(cuit: string): boolean {
  if (!/^[0-9]{11}$/.test(cuit)) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(cuit[i]), 0)
  let dv = 11 - (suma % 11)
  if (dv === 11) dv = 0
  if (dv === 10) dv = 9
  return dv === Number(cuit[10])
}

function controlFechas(tipo: string | null, emision: string | null, pago: string | null): boolean | null {
  if (!tipo || !emision) return null
  if (tipo === 'comun') return true
  if (!pago) return null
  const dias = (Date.parse(pago) - Date.parse(emision)) / 86_400_000
  return dias >= 0 && dias <= 360
}

function fechaValida(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null
  const anio = d.getUTCFullYear()
  const actual = new Date().getUTCFullYear()
  return anio >= actual - 2 && anio <= actual + 2 ? v : null
}

function soloDigitos(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const d = v.replace(/\D/g, '')
  return d.length > 0 ? d : null
}

function textoONull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function numeroFinito(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function numeroPositivo(v: unknown): number | null {
  const n = numeroFinito(v)
  return n !== null && n > 0 ? Math.round(n * 100) / 100 : null
}

// btoa sobre el arreglo entero revienta la pila con fotos de varios MB.
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
