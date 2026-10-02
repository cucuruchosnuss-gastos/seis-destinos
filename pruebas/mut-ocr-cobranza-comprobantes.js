// Mutaciones de test-ocr-cobranza-comprobantes.js (el lector nuevo de
// Cobranzas, 02/10/2026): normalizar.js y el index.ts. Ver mutar.js.
//
//   node pruebas/mut-ocr-cobranza-comprobantes.js
const path = require('path')
const { correrMutacionesEn } = require('./mutar')

const CARPETA = path.join(__dirname, '..', 'supabase/functions/ocr-cobranza-comprobantes')
const suite = path.join(__dirname, 'test-ocr-cobranza-comprobantes.js')

const r1 = correrMutacionesEn({
  suite, salir: false,
  original: path.join(CARPETA, 'normalizar.js'),
  funciones: [],
  manuales: [
    { nombre: 'el CUIT no mira el dígito verificador', de: '  return dv === Number(cuit[10])\n}', a: '  return true\n}' },
    { nombre: 'el CUIT con 10 en vez de 9', de: '  if (dv === 10) dv = 9\n', a: '' },
    { nombre: 'cuitDe acepta cualquier largo', de: "  return d && d.length === 11 ? d : null\n}\n\n// El CMC-7", a: '  return d\n}\n\n// El CMC-7' },
    { nombre: 'el CMC-7 acepta 28', de: "  if (!d || d.length !== 29) return null", a: "  if (!d || d.length < 28) return null" },
    { nombre: 'el CMC-7 corta mal el número', de: 'numero: d.slice(10, 18), cuenta: d.slice(18, 29)', a: 'numero: d.slice(10, 19), cuenta: d.slice(19, 29)' },
    { nombre: 'una fecha que no existe pasa', de: "  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null\n", a: '' },
    { nombre: 'cualquier año sirve', de: '  return anio >= actual - 2 && anio <= actual + 2 ? v : null', a: '  return v' },
    { nombre: 'un importe texto se adivina', de: "  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null", a: "  v = Number(v); if (!Number.isFinite(v) || v <= 0) return null" },
    { nombre: 'el importe sin redondear', de: '  return Math.round(v * 100) / 100', a: '  return v' },
    { nombre: 'la referencia sin tope de 100', de: 'referencia: textoONull(c?.referencia, 100),', a: 'referencia: textoONull(c?.referencia, 1000),' },
    { nombre: 'el banco de origen sin limpiar espacios', de: "  const t = v.trim().replace(/\\s+/g, ' ')", a: '  const t = v.trim()' },
    { nombre: 'el control del CUIT de la transferencia lo inventa', de: '      cuit_ok: controlCuit(cuit_ordenante),', a: '      cuit_ok: true,' },
    { nombre: 'un CUIT ausente da false (no "no se sabe")', de: '  return cuit === null ? null : cuitValido(cuit)', a: '  return cuitValido(cuit)' },
    { nombre: 'fecha_ok de la transferencia no mira la fecha', de: '      fecha_ok: crudaFecha === null || crudaFecha === undefined ? null : fecha !== null,', a: '      fecha_ok: null,' },
    { nombre: 'el CMC-7 no manda sobre los sueltos', de: "  const banco_codigo = cmc7?.banco_codigo ?? tres(c?.banco_codigo, 3)", a: "  const banco_codigo = tres(c?.banco_codigo, 3) ?? cmc7?.banco_codigo" },
    { nombre: 'los sueltos sin mirar el largo', de: '  const tres = (v, n) => { const d = soloDigitos(v); return d && d.length === n ? d : null }', a: '  const tres = (v, n) => soloDigitos(v)' },
    { nombre: 'cmc7_ok siempre true', de: '      cmc7_ok: cmc7Crudo === null ? null : cmc7 !== null,', a: '      cmc7_ok: true,' },
    { nombre: 'fechas_ok sin el tope de 360', de: '    fechas_ok = dias >= 0 && dias <= 360', a: '    fechas_ok = dias >= 0' },
    { nombre: 'fechas_ok acepta el pago antes de la emisión', de: '    fechas_ok = dias >= 0 && dias <= 360', a: '    fechas_ok = dias <= 360' },
    { nombre: 'una fecha ilegible no marca fechas_ok', de: "  } else if ((c?.fecha_emision && !fecha_emision) || (c?.fecha_pago && !fecha_pago)) {\n    fechas_ok = false\n  }", a: '  }' },
    { nombre: 'los comprobantes vacíos no se sacan', de: "    .filter(p => Object.entries(p).some(([k, v]) => k !== 'controles' && k !== 'notas' && v !== null))", a: '' },
    { nombre: 'el e-cheque se normaliza como transferencia', de: "  const norm = tipo === 'echeque' ? normalizarEcheque : normalizarTransferencia", a: '  const norm = normalizarTransferencia' },
    { nombre: 'se acepta un gif', de: "export const MIME_VALIDOS = ['image/jpeg', 'image/webp', 'image/png', 'application/pdf']", a: "export const MIME_VALIDOS = ['image/jpeg', 'image/webp', 'image/png', 'application/pdf', 'image/gif']" },
    { nombre: 'el pdf no se reconoce por la extensión', de: "  if (r.endsWith('.pdf')) return 'application/pdf'\n", a: '' },
    { nombre: 'la ruta de otra carpeta pasa', de: '  if (!r.startsWith(`${uid}/`)) return false\n', a: '' },
    { nombre: 'la ruta con ".." pasa', de: "  return r.split('/').every(s => s !== '' && s !== '.' && s !== '..')", a: '  return true' },
  ],
})

const r2 = correrMutacionesEn({
  suite, salir: false, variable: 'INDEX_TEST',
  original: path.join(CARPETA, 'index.ts'),
  funciones: [],
  manuales: [
    { nombre: 'el modelo por el secret de cheques', de: "Deno.env.get('OCR_COMPROBANTES_MODELO')", a: "Deno.env.get('OCR_CHEQUES_MODELO')" },
    { nombre: 'otro modelo por defecto', de: "const MODELO_POR_DEFECTO = 'claude-opus-5'", a: "const MODELO_POR_DEFECTO = 'claude-sonnet-4-6'" },
    { nombre: 'otro bucket', de: "const BUCKET = 'cobranzas'", a: "const BUCKET = 'comprobantes'" },
    { nombre: 'baja sin el token de quien llama', de: '{ global: { headers: { Authorization: authHeader } } },', a: '{},' },
    { nombre: 'no valida la ruta', de: "  if (!rutaValida(ruta, user.id)) return json({ ok: false, mensaje: 'Ruta del comprobante inválida' }, 400)\n", a: '' },
    { nombre: 'el pdf va como imagen', de: "  const archivo = mime === 'application/pdf'\n    ? { type: 'document',", a: "  const archivo = false\n    ? { type: 'document'," },
    { nombre: 'devuelve sin los propuestos', de: "return json({ ok: true, modelo, tipo, crudo, propuestos }, 200)", a: "return json({ ok: true, modelo, tipo, crudo }, 200)" },
  ],
})

const det = r1.detectadas + r2.detectadas
const tot = r1.total + r2.total
console.log(`\nTOTAL: ${det}/${tot} detectadas`)
process.exit(det === tot && !r1.fallas && !r2.fallas ? 0 : 1)
