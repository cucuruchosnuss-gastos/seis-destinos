// La normalización y los CONTROLES de ocr-cobranza-comprobantes, aparte del
// index.ts para poder EJECUTARLOS en las suites con Node (sin Deno):
//   node pruebas/test-ocr-cobranza-comprobantes.js
//
// JS plano (ESM) a propósito: Deno lo importa tal cual desde el index.ts y
// Node lo importa con import() sin compilar nada.
//
// Los controles los calcula ESTA función y nunca el modelo: un CUIT válido
// (módulo 11), el CMC-7 de 29 dígitos (3+3+4+8+11) y fechas que existen. El
// modelo propone; la persona confirma o corrige en pantalla.

export const TIPOS = ['transferencia', 'echeque']

// Dígito verificador del CUIT: módulo 11 con pesos 5,4,3,2,7,6,5,4,3,2. La
// MISMA cuenta que cuitValido() de ocr-cheques y cuitValidoCob() de
// modulos/cobranzas.html.
export function cuitValido(cuit) {
  if (!/^[0-9]{11}$/.test(String(cuit ?? ''))) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(cuit[i]), 0)
  let dv = 11 - (suma % 11)
  if (dv === 11) dv = 0
  if (dv === 10) dv = 9
  return dv === Number(cuit[10])
}

export function soloDigitos(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const d = String(v).replace(/\D/g, '')
  return d.length > 0 ? d : null
}

export function textoONull(v, max = 150) {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/g, ' ')
  if (!t.length) return null
  return t.length > max ? t.slice(0, max) : t
}

// Un número JSON finito y positivo, redondeado a centavos. Un texto NO se
// convierte: el prompt pide número, y adivinar "1.500" es justo el error que
// el proyecto ya pagó (punto de miles o decimal).
export function importePositivo(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null
  return Math.round(v * 100) / 100
}

// Una fecha YYYY-MM-DD que EXISTE (sin 31 de febrero) y cae dentro de dos años
// para atrás o para adelante del año de `hoy` (el año en curso).
export function fechaValida(v, hoy = new Date()) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null
  const anio = d.getUTCFullYear()
  const actual = hoy.getUTCFullYear()
  return anio >= actual - 2 && anio <= actual + 2 ? v : null
}

// Un CUIT de 11 dígitos (con o sin guiones). Lo que no tiene 11 dígitos va a
// null; uno de 11 que no cierra SE CONSERVA y el control lo marca: la persona
// lo ve contra el comprobante.
export function cuitDe(v) {
  const d = soloDigitos(v)
  return d && d.length === 11 ? d : null
}

// El CMC-7 de un e-cheque: 29 dígitos = entidad(3) + sucursal(3) + código
// postal(4) + número(8) + cuenta(11). Devuelve las partes o null.
export function partesCmc7(v) {
  const d = soloDigitos(v)
  if (!d || d.length !== 29) return null
  return {
    banco_codigo: d.slice(0, 3), sucursal_codigo: d.slice(3, 6), codigo_postal: d.slice(6, 10),
    numero: d.slice(10, 18), cuenta: d.slice(18, 29),
  }
}

function controlCuit(cuit) {
  return cuit === null ? null : cuitValido(cuit)
}

// ── Transferencia ──────────────────────────────────────────────────────────
export function normalizarTransferencia(c, hoy = new Date()) {
  const cuit_ordenante = cuitDe(c?.cuit_ordenante)
  const crudaFecha = c?.fecha
  const fecha = fechaValida(crudaFecha, hoy)
  return {
    importe: importePositivo(c?.importe),
    fecha,
    banco_origen: textoONull(c?.banco_origen, 80),
    ordenante: textoONull(c?.ordenante, 150),
    cuit_ordenante,
    // El número de operación es un IDENTIFICADOR: va como texto, tal cual (sin
    // espacios en los bordes), hasta 100 letras (CHECK de la tabla).
    referencia: textoONull(c?.referencia, 100),
    notas: textoONull(c?.notas, 300),
    controles: {
      cuit_ok: controlCuit(cuit_ordenante),
      fecha_ok: crudaFecha === null || crudaFecha === undefined ? null : fecha !== null,
    },
  }
}

// ── E-cheque ───────────────────────────────────────────────────────────────
export function normalizarEcheque(c, hoy = new Date()) {
  const cmc7 = partesCmc7(c?.cmc7)
  const tres = (v, n) => { const d = soloDigitos(v); return d && d.length === n ? d : null }
  // El CMC-7 manda sobre los sueltos: son los mismos datos y el CMC-7 es la
  // transcripción completa. Sin CMC-7, los sueltos que tengan su largo.
  const banco_codigo = cmc7?.banco_codigo ?? tres(c?.banco_codigo, 3)
  const sucursal_codigo = cmc7?.sucursal_codigo ?? tres(c?.sucursal_codigo, 3)
  const codigo_postal = cmc7?.codigo_postal ?? tres(c?.codigo_postal, 4)
  const numero = cmc7?.numero ?? tres(c?.numero, 8)
  const cuenta = cmc7?.cuenta ?? tres(c?.cuenta, 11)
  const cuit_emisor = cuitDe(c?.cuit_emisor)
  const fecha_emision = fechaValida(c?.fecha_emision, hoy)
  const fecha_pago = fechaValida(c?.fecha_pago, hoy)
  const cmc7Crudo = soloDigitos(c?.cmc7)
  let fechas_ok = null
  if (fecha_emision && fecha_pago) {
    const dias = (Date.parse(fecha_pago) - Date.parse(fecha_emision)) / 86400000
    fechas_ok = dias >= 0 && dias <= 360
  } else if ((c?.fecha_emision && !fecha_emision) || (c?.fecha_pago && !fecha_pago)) {
    fechas_ok = false
  }
  return {
    banco_codigo, sucursal_codigo, codigo_postal, numero, cuenta,
    emisor: textoONull(c?.emisor, 150),
    cuit_emisor,
    fecha_emision,
    fecha_pago,
    importe: importePositivo(c?.importe),
    id_echeq: textoONull(c?.id_echeq, 60),
    banco_nombre_leido: textoONull(c?.banco_nombre, 80),
    notas: textoONull(c?.notas, 300),
    controles: {
      cuit_ok: controlCuit(cuit_emisor),
      cmc7_ok: cmc7Crudo === null ? null : cmc7 !== null,
      fechas_ok,
    },
  }
}

// La respuesta del modelo → { propuestos }. `crudo` no se toca: lo archiva la
// pantalla en cobranza_fotos.ocr_crudo.
export function normalizarRespuesta(tipo, crudo, hoy = new Date()) {
  const lista = Array.isArray(crudo?.comprobantes) ? crudo.comprobantes : []
  const norm = tipo === 'echeque' ? normalizarEcheque : normalizarTransferencia
  return lista
    .filter(c => typeof c === 'object' && c !== null)
    .map(c => norm(c, hoy))
    // Un comprobante sin NINGÚN dato no es una propuesta: es ruido.
    .filter(p => Object.entries(p).some(([k, v]) => k !== 'controles' && k !== 'notas' && v !== null))
}

// El tipo de archivo que se manda al modelo. El del blob, si es uno de los
// cuatro; si no, por la extensión de la ruta. null = no se acepta.
export const MIME_VALIDOS = ['image/jpeg', 'image/webp', 'image/png', 'application/pdf']
export function mimeDe(tipoBlob, ruta) {
  if (MIME_VALIDOS.includes(tipoBlob)) return tipoBlob
  const r = String(ruta ?? '').toLowerCase()
  if (r.endsWith('.pdf')) return 'application/pdf'
  if (r.endsWith('.png')) return 'image/png'
  if (r.endsWith('.webp')) return 'image/webp'
  if (r.endsWith('.jpg') || r.endsWith('.jpeg')) return 'image/jpeg'
  return null
}

// La ruta tiene que ser de la carpeta de quien llama, sin segmentos vacíos,
// "." ni "..": la política de Storage ya lo exige para subir, y acá se corta
// antes de gastar una llamada al modelo.
export function rutaValida(ruta, uid) {
  if (typeof ruta !== 'string' || !uid) return false
  const r = ruta.trim()
  if (!r.startsWith(`${uid}/`)) return false
  return r.split('/').every(s => s !== '' && s !== '.' && s !== '..')
}
