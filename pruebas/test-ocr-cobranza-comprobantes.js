// El lector nuevo de Cobranzas (02/10/2026): la normalización y los CONTROLES
// de supabase/functions/ocr-cobranza-comprobantes, que viven en normalizar.js
// (JS plano) para poder EJECUTARLOS acá sin Deno. Y, sobre el index.ts, lo
// que se puede mirar sin correrlo: el modelo por el secret, el bucket, los
// tipos y el PDF como documento.
//
//   node pruebas/test-ocr-cobranza-comprobantes.js
// Archivo bajo prueba: ARCHIVO_TEST (normalizar.js) e INDEX_TEST (index.ts).
// El módulo se carga desde su TEXTO (import de un data: URL): el runner de
// mutaciones escribe la copia mutada con otra extensión.

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const CARPETA = path.join(RAIZ, 'supabase/functions/ocr-cobranza-comprobantes')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(CARPETA, 'normalizar.js')
const INDEX = process.env.INDEX_TEST || path.join(CARPETA, 'index.ts')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
const FUENTE_INDEX = fs.readFileSync(INDEX, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
console.log(`ARCHIVO ${INDEX} (${FUENTE_INDEX.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 300)}` : ''))
}

const HOY = new Date('2026-10-02T12:00:00Z')

;(async () => {
  const N = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(FUENTE))

  // ── CUIT ────────────────────────────────────────────────────────────────
  chk('CUIT válido (30-71943477-7)', N.cuitValido('30719434777') === true)
  chk('CUIT válido (33-70933541-9)', N.cuitValido('33709335419') === true)
  chk('CUIT cuyo resto da 10: el dígito es 9', N.cuitValido('20000000019') === true && N.cuitValido('20000000010') === false)
  chk('CUIT con el dígito cambiado no cierra', N.cuitValido('30719434778') === false)
  chk('CUIT de 10 dígitos no', N.cuitValido('3071943477') === false)
  chk('CUIT con letras no', N.cuitValido('3071943477a') === false)
  chk('cuitDe saca los guiones', N.cuitDe('30-71943477-7') === '30719434777')
  chk('cuitDe: lo que no tiene 11 dígitos va a null', N.cuitDe('123') === null && N.cuitDe(null) === null)

  // ── CMC-7 ───────────────────────────────────────────────────────────────
  const cmc7 = '28538632186625986209420314667'
  const p = N.partesCmc7(cmc7)
  chk('CMC-7 de 29: 3+3+4+8+11', p && p.banco_codigo === '285' && p.sucursal_codigo === '386' && p.codigo_postal === '3218' &&
    p.numero === '66259862' && p.cuenta === '09420314667', JSON.stringify(p))
  chk('CMC-7 con espacios y símbolos: solo los dígitos', N.partesCmc7('<285 386 3218> 66259862 :09420314667')?.numero === '66259862')
  chk('CMC-7 de 28 no', N.partesCmc7(cmc7.slice(1)) === null)
  chk('CMC-7 de 30 no', N.partesCmc7(cmc7 + '1') === null)

  // ── Fechas ──────────────────────────────────────────────────────────────
  chk('fecha válida', N.fechaValida('2026-10-01', HOY) === '2026-10-01')
  chk('31 de febrero no existe', N.fechaValida('2026-02-31', HOY) === null)
  chk('formato dd/mm/aaaa no se acepta crudo', N.fechaValida('01/10/2026', HOY) === null)
  chk('una fecha de hace 5 años no', N.fechaValida('2021-10-01', HOY) === null)
  chk('una fecha de dos años atrás sí', N.fechaValida('2024-01-01', HOY) === '2024-01-01')

  // ── Importes ────────────────────────────────────────────────────────────
  chk('importe número → redondeado a centavos', N.importePositivo(1234.567) === 1234.57)
  chk('importe texto NO se adivina', N.importePositivo('1.500') === null)
  chk('importe cero o negativo no', N.importePositivo(0) === null && N.importePositivo(-5) === null)
  chk('importe NaN/Infinity no', N.importePositivo(NaN) === null && N.importePositivo(Infinity) === null)

  // ── Transferencia ───────────────────────────────────────────────────────
  const t = N.normalizarTransferencia({
    importe: 150000.5, fecha: '2026-10-01', banco_origen: '  Mercado   Pago ', ordenante: 'J&M SRL',
    cuit_ordenante: '30-71943477-7', referencia: ' 000123456789 ', notas: null,
  }, HOY)
  chk('transferencia: los seis campos normalizados', t.importe === 150000.5 && t.fecha === '2026-10-01' && t.banco_origen === 'Mercado Pago' &&
    t.ordenante === 'J&M SRL' && t.cuit_ordenante === '30719434777' && t.referencia === '000123456789', JSON.stringify(t))
  chk('transferencia: la referencia conserva los ceros (es un identificador)', t.referencia.startsWith('000'))
  chk('transferencia: CUIT que cierra → cuit_ok true', t.controles.cuit_ok === true)
  const t2 = N.normalizarTransferencia({ importe: 10, cuit_ordenante: '30719434778', fecha: '2026-02-31' }, HOY)
  chk('transferencia: CUIT que no cierra se conserva y cuit_ok false', t2.cuit_ordenante === '30719434778' && t2.controles.cuit_ok === false)
  chk('transferencia: fecha que no existe → null y fecha_ok false', t2.fecha === null && t2.controles.fecha_ok === false)
  const t3 = N.normalizarTransferencia({ importe: 10 }, HOY)
  chk('transferencia: sin CUIT ni fecha → controles null (no se pudo saber)', t3.controles.cuit_ok === null && t3.controles.fecha_ok === null)
  chk('transferencia: lo que no viene va a null (nunca se inventa)', t3.banco_origen === null && t3.ordenante === null && t3.referencia === null && t3.fecha === null)
  const largo = N.normalizarTransferencia({ referencia: 'x'.repeat(150) }, HOY)
  chk('transferencia: referencia hasta 100 (CHECK de la tabla)', largo.referencia.length === 100)

  // ── E-cheque ────────────────────────────────────────────────────────────
  const e = N.normalizarEcheque({
    banco_codigo: '999', cmc7, numero: '11111111', emisor: 'ANATOLIA SA', cuit_emisor: '33709335419',
    fecha_emision: '2026-09-30', fecha_pago: '2026-11-30', importe: 250000, id_echeq: 'ABC123',
  }, HOY)
  chk('e-cheque: el CMC-7 manda sobre los sueltos', e.banco_codigo === '285' && e.numero === '66259862' && e.cuenta === '09420314667' &&
    e.sucursal_codigo === '386' && e.codigo_postal === '3218', JSON.stringify(e))
  chk('e-cheque: emisor, CUIT, fechas, importe e id', e.emisor === 'ANATOLIA SA' && e.cuit_emisor === '33709335419' &&
    e.fecha_emision === '2026-09-30' && e.fecha_pago === '2026-11-30' && e.importe === 250000 && e.id_echeq === 'ABC123')
  chk('e-cheque: controles en verde', e.controles.cuit_ok === true && e.controles.cmc7_ok === true && e.controles.fechas_ok === true, JSON.stringify(e.controles))
  const e2 = N.normalizarEcheque({ banco_codigo: '07', numero: '1234', cmc7: '123', fecha_emision: '2026-10-01', fecha_pago: '2027-12-01' }, HOY)
  chk('e-cheque: sin CMC-7 válido, los sueltos solo con su largo', e2.banco_codigo === null && e2.numero === null)
  chk('e-cheque: CMC-7 que no tiene 29 → cmc7_ok false', e2.controles.cmc7_ok === false)
  chk('e-cheque: pago a más de 360 días → fechas_ok false', e2.controles.fechas_ok === false)
  const e3 = N.normalizarEcheque({ banco_codigo: '007', numero: '00012345' }, HOY)
  chk('e-cheque: sin CMC-7, los sueltos con ceros', e3.banco_codigo === '007' && e3.numero === '00012345' && e3.controles.cmc7_ok === null)
  const e4 = N.normalizarEcheque({ fecha_emision: '2026-11-01', fecha_pago: '2026-10-01' }, HOY)
  chk('e-cheque: pago antes de la emisión → fechas_ok false', e4.controles.fechas_ok === false)
  const e5 = N.normalizarEcheque({ fecha_emision: '2026-13-01' }, HOY)
  chk('e-cheque: una fecha que no existe → fechas_ok false', e5.fecha_emision === null && e5.controles.fechas_ok === false)

  // ── La respuesta entera ─────────────────────────────────────────────────
  const r = N.normalizarRespuesta('transferencia', { comprobantes: [{ importe: 10 }, {}, null, 'x', { referencia: '9' }] }, HOY)
  chk('respuesta: saca los vacíos y lo que no es un objeto', r.length === 2 && r[0].importe === 10 && r[1].referencia === '9', JSON.stringify(r))
  chk('respuesta sin "comprobantes": lista vacía', N.normalizarRespuesta('echeque', {}, HOY).length === 0)
  chk('respuesta de e-cheque usa la normalización de e-cheque', N.normalizarRespuesta('echeque', { comprobantes: [{ cmc7 }] }, HOY)[0].numero === '66259862')

  // ── Archivo y ruta ──────────────────────────────────────────────────────
  chk('mime: los cuatro del bucket', ['image/jpeg', 'image/webp', 'image/png', 'application/pdf'].every(m => N.mimeDe(m, 'x') === m))
  chk('mime por extensión si el blob no dice', N.mimeDe('', 'u/c/a.pdf') === 'application/pdf' && N.mimeDe('', 'u/c/a.PNG') === 'image/png' && N.mimeDe(undefined, 'u/c/a.jpg') === 'image/jpeg')
  chk('mime: un gif no se acepta', N.mimeDe('image/gif', 'u/c/a.gif') === null)
  chk('ruta: de la carpeta propia sí', N.rutaValida('uid/cob/a.jpg', 'uid') === true)
  chk('ruta: de otra carpeta no', N.rutaValida('otro/cob/a.jpg', 'uid') === false)
  chk('ruta: con ".." no', N.rutaValida('uid/../otro/a.jpg', 'uid') === false)
  chk('ruta: con un segmento vacío no', N.rutaValida('uid//a.jpg', 'uid') === false)
  chk('ruta: sin uid no', N.rutaValida('uid/a.jpg', '') === false)

  // ── index.ts (sin correrlo) ─────────────────────────────────────────────
  chk('index: modelo por OCR_COMPROBANTES_MODELO', /Deno\.env\.get\('OCR_COMPROBANTES_MODELO'\)/.test(FUENTE_INDEX))
  const porDefectoCheques = (fs.readFileSync(path.join(RAIZ, 'supabase/functions/ocr-cheques/index.ts'), 'utf8').match(/MODELO_POR_DEFECTO = '([^']+)'/) || [])[1]
  chk('index: el mismo modelo por defecto que ocr-cheques', porDefectoCheques && FUENTE_INDEX.includes(`MODELO_POR_DEFECTO = '${porDefectoCheques}'`), porDefectoCheques)
  chk('index: baja del bucket "cobranzas" con el token de quien llama',
    /const BUCKET = 'cobranzas'/.test(FUENTE_INDEX) && /global: \{ headers: \{ Authorization: authHeader \} \}/.test(FUENTE_INDEX) && /storage\.from\(BUCKET\)\.download\(ruta\)/.test(FUENTE_INDEX))
  chk('index: valida el tipo y la ruta antes de bajar', FUENTE_INDEX.indexOf('TIPOS.includes(tipo)') > 0 && FUENTE_INDEX.indexOf('rutaValida(ruta, user.id)') > 0 &&
    FUENTE_INDEX.indexOf('rutaValida(ruta, user.id)') < FUENTE_INDEX.indexOf('.download(ruta)'))
  chk('index: el PDF va como documento', /mime === 'application\/pdf'\s*\?\s*\{ type: 'document'/.test(FUENTE_INDEX))
  chk('index: los prompts en español piden null y nunca inventar', /NUNCA inventes/.test(FUENTE_INDEX) && /usá null/.test(FUENTE_INDEX))
  chk('index: los prompts nombran bancos y billeteras argentinas', ['Macro', 'Nación', 'Santander', 'Galicia', 'Mercado Pago'].every(b => FUENTE_INDEX.includes(b)))
  chk('index: devuelve crudo y propuestos', /crudo, propuestos \}/.test(FUENTE_INDEX))
  chk('index: importa la normalización de normalizar.js', /from '\.\/normalizar\.js'/.test(FUENTE_INDEX))

  console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
  if (fallas.length) {
    console.log('\nFALLAS:')
    for (const f of fallas) console.log('  ✗ ' + f)
    process.exit(1)
  }
})().catch(err => { console.log('ERROR:', err?.message ?? err); process.exit(1) })
