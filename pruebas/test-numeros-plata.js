// La plata siempre con sus dos decimales y ningún número formateado a mano
// (11/10/2026, pedido del 11/10, paso 3).
//
// El caso: "Pagado sin ingresar" (Ingreso) mostraba "$387.300,5", y el
// kilometraje de un gasto salía "85000 km". Esta suite:
//  1. EJECUTA los formateadores reales de Ingreso y de Gastos (extraídos del
//     <script>, con el formatearNumeroAr real de js/utils.js) y el render de
//     "Pagado sin ingresar": 387300.5 → "$387.300,50", 85000 → "85.000 km".
//  2. Recorre TODO el código de la app (modulos/*.html, dashboard.html,
//     js/*.js) y da rojo si:
//     - aparece un `maximumFractionDigits` (recorta los ceros de la plata);
//     - un `toLocaleString(` o un `.toFixed(` que no está en la lista de
//       permitidos, cada uno con su motivo (fechas, colores, redondeos que no
//       se muestran);
//     - una función de PLATA (su nombre empieza con importe / plata /
//       formatearImporte) recorta los decimales con `minimos: 0`;
//     - un kilometraje se muestra crudo (`${…kilometraje} km`).
//
// Archivos bajo prueba: ARCHIVO_TEST_MP (Ingreso) y ARCHIVO_TEST_GASTOS
// (Gastos); el barrido estático mira el repo (o RAIZ_TEST).
// Con el código de antes (e4293f5) da rojo.

const fs = require('fs')
const path = require('path')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = process.env.RAIZ_TEST || path.join(__dirname, '..')
const MP = process.env.ARCHIVO_TEST_MP || path.join(RAIZ, 'modulos/materia-prima.html')
const GASTOS = process.env.ARCHIVO_TEST_GASTOS || path.join(RAIZ, 'modulos/gastos.html')

// Lee un archivo una vez; los dos que se mutan se anuncian (ARCHIVO …) para que
// el runner confirme que la suite leyó el mutado.
const cache = new Map()
function leer(ruta) {
  if (!cache.has(ruta)) {
    const t = fs.readFileSync(ruta, 'utf8')
    if (ruta === MP || ruta === GASTOS) console.log(`ARCHIVO ${ruta} (${t.length} bytes)`)
    cache.set(ruta, t)
  }
  return cache.get(ruta)
}

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

function armar(archivo, funciones, extra = '') {
  const src = leer(archivo)
  const cuerpo = funciones.map(f => extraerFn(src, f)).join('\n')
  return new Function(`${fuenteNumeros()}
    function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
    function formatearFecha(f) { return f }
    function nombreUnidad(id) { return id ? 'Nuss' : null }
    ${extra}
    ${cuerpo}
    return { ${funciones.join(', ')} }`)()
}

// ══ 1. Ingreso ═══════════════════════════════════════════════════════════
{
  let M = null
  try { M = armar(MP, ['formatearImporteDuplicado', 'importeConMoneda', 'htmlPagadoSinIngresar']) }
  catch (e) { chk('Ingreso: se pudieron armar los formateadores', false, e.message) }
  if (M) {
    const casos = [[387300.5, '$387.300,50'], [2000000, '$2.000.000,00'], ['1500', '$1.500,00'], [0.1, '$0,10'], [1234.567, '$1.234,57'], [0, '$0,00']]
    for (const [v, esperado] of casos) {
      chk(`Ingreso: formatearImporteDuplicado(${JSON.stringify(v)}) = ${esperado}`, M.formatearImporteDuplicado(v) === esperado, M.formatearImporteDuplicado(v))
    }
    for (const v of [null, undefined, '', 'abc']) {
      chk(`Ingreso: formatearImporteDuplicado(${String(v)}) = null (nunca "$0")`, M.formatearImporteDuplicado(v) === null, M.formatearImporteDuplicado(v))
    }
    chk('Ingreso: importeConMoneda(387300.5, ARS) = "$387.300,50"', M.importeConMoneda(387300.5, 'ARS') === '$387.300,50', M.importeConMoneda(387300.5, 'ARS'))
    chk('Ingreso: importeConMoneda(1234.5, USD) = "USD 1.234,50"', M.importeConMoneda(1234.5, 'USD') === 'USD 1.234,50', M.importeConMoneda(1234.5, 'USD'))
    const html = M.htmlPagadoSinIngresar([{ gasto_id: 'g1', fecha: '2026-10-05', numero_doc: '0001-00000123', importe: 387300.5, moneda: 'ARS', razon_social: 'MOLINO', unidad_negocio_id: 'u1' }])
    chk('Pagado sin ingresar: la fila dice "$387.300,50"', html.includes('$387.300,50'), html)
    chk('Pagado sin ingresar: la fila NO dice "$387.300,5 "', !/\$387\.300,5(?!0)/.test(html), html)
  }
}

// ══ 2. Gastos ════════════════════════════════════════════════════════════
{
  let G = null
  try { G = armar(GASTOS, ['formatearImporteDuplicado', 'textoKilometraje']) }
  catch (e) { chk('Gastos: se pudieron armar formatearImporteDuplicado y textoKilometraje', false, e.message) }
  if (G) {
    chk('Gastos: formatearImporteDuplicado(387300.5) = "$387.300,50"', G.formatearImporteDuplicado(387300.5) === '$387.300,50', G.formatearImporteDuplicado(387300.5))
    chk('Gastos: formatearImporteDuplicado(2000000) = "$2.000.000,00"', G.formatearImporteDuplicado(2000000) === '$2.000.000,00', G.formatearImporteDuplicado(2000000))
    chk('Gastos: formatearImporteDuplicado(null) = null', G.formatearImporteDuplicado(null) === null)
    for (const [v, esperado] of [[85000, '85.000 km'], ['120000', '120.000 km'], [999, '999 km'], [1234567, '1.234.567 km']]) {
      chk(`Gastos: textoKilometraje(${JSON.stringify(v)}) = ${esperado}`, G.textoKilometraje(v) === esperado, G.textoKilometraje(v))
    }
    for (const v of [null, undefined, '', 0, 'abc']) {
      chk(`Gastos: textoKilometraje(${JSON.stringify(v)}) = null (la fila no se dibuja)`, G.textoKilometraje(v) === null, G.textoKilometraje(v))
    }
  }
  const src = leer(GASTOS)
  const usos = (src.match(/fila\('Kilometraje',\s*textoKilometraje\(g\.kilometraje\)\)/g) || []).length
  chk('Gastos: las tres filas de Kilometraje (resumen, resumen pendiente, detalle) usan textoKilometraje', usos === 3, usos)
}

// ══ 3. Barrido estático de toda la app ═══════════════════════════════════
// Cada toLocaleString / toFixed permitido, con el texto que lo identifica y su
// motivo. Uno nuevo que no está acá es un número formateado a mano: que use
// formatearNumeroAr() de js/utils.js (o se agrega acá con su motivo).
const PERMITIDOS = [
  ['modulos/administracion.html', 'Math.round(Number((v * 100).toFixed(6)))', 'redondeo a centavos de la comisión: no se muestra'],
  ['modulos/administracion.html', 'Math.round(Number((t * v).toFixed(6)))', 'redondeo a centavos de la comisión: no se muestra'],
  ['modulos/administracion.html', 'Math.round(Number(((t + i) * 100).toFixed(6)))', 'redondeo a centavos del total con comisión: no se muestra'],
  ['modulos/administracion.html', "toLocaleString('fullwide', { useGrouping: false })", 'un entero a texto plano para el importador (sin separadores): no se muestra'],
  ['modulos/cobranzas.html', "(Number(bytes) / (1024 * 1024)).toLocaleString('es-AR', { maximumFractionDigits: 1 })", 'el peso de un PDF en MB ("10,5 MB"), no es plata'],
  ['modulos/gastos.html', "new Date(g.anulado_en).toLocaleString('es-AR'", 'una fecha y hora'],
  ['modulos/materia-prima.html', "d.toLocaleString('es-AR', {", 'una fecha y hora'],
  ['modulos/materia-prima.html', "Number(item.cantidad_bultos).toLocaleString('es-AR')", 'bultos enteros (la base no guarda bultos fraccionarios), no es plata'],
  ['modulos/materia-prima.html', "enteros.toLocaleString('es-AR')", 'bultos enteros (Math.floor), no es plata'],
  ['modulos/stock.html', "d.toLocaleString('es-AR', {", 'una fecha y hora'],
  ['modulos/produccion-gestion.html', '(C * 0.3).toFixed(3)', 'un color oklch'],
  ['modulos/produccion.html', '(C * 0.3).toFixed(3)', 'un color oklch'],
  ['js/modulos.js', 'Math.max(C * 0.28, 0.008).toFixed(3)', 'un color oklch'],
  ['js/utils.js', 'Math.abs(v).toFixed(decimales)', 'formatearNumeroAr() mismo'],
  ['js/version-banner.js', "new Date(lastMod).toLocaleString('es-AR'", 'una fecha y hora'],
]
const MAX_FRAC_PERMITIDOS = new Set(['modulos/cobranzas.html'])  // el peso del PDF, ver arriba

function archivosApp() {
  const lista = ['dashboard.html']
  for (const d of ['modulos', 'js']) {
    for (const f of fs.readdirSync(path.join(RAIZ, d))) {
      if (/\.(html|js)$/.test(f)) lista.push(`${d}/${f}`)
    }
  }
  return lista
}
// Saca los comentarios de línea (// …) que no están dentro de un string; alcanza
// para no confundir un comentario que cita lo viejo con código.
function sinComentarios(linea) {
  const i = linea.search(/(^|[^:'"`\\])\/\/(?!\/)/)
  return i === -1 ? linea : linea.slice(0, i + 1)
}

const archivos = archivosApp()
chk('barrido: encontró los archivos de la app', archivos.length > 20, archivos.length)
const vistos = new Set()
for (const rel of archivos) {
  const ruta = rel === 'modulos/materia-prima.html' ? MP : rel === 'modulos/gastos.html' ? GASTOS : path.join(RAIZ, rel)
  const lineas = leer(ruta).split('\n')
  lineas.forEach((cruda, i) => {
    const l = sinComentarios(cruda)
    if (/\.toLocaleString\(|\.toFixed\(/.test(l)) {
      const ok2 = PERMITIDOS.find(([f, texto]) => f === rel && l.includes(texto))
      if (ok2) vistos.add(ok2)
      chk(`${rel}:${i + 1}: toLocaleString/toFixed permitido`, !!ok2, l.trim().slice(0, 140))
    }
    if (/maximumFractionDigits/.test(l)) {
      chk(`${rel}:${i + 1}: sin maximumFractionDigits (recorta los ceros de la plata)`, MAX_FRAC_PERMITIDOS.has(rel) && /bytes/.test(l), l.trim().slice(0, 140))
    }
    if (/kilometraje\}\s*km/.test(l)) {
      chk(`${rel}:${i + 1}: el kilometraje no se muestra crudo`, false, l.trim().slice(0, 140))
    }
  })
  // Las funciones de plata no recortan decimales.
  const texto = lineas.join('\n')
  const re = /function\s+((?:formatear)?(?:importe|plata)[A-Za-z0-9_]*)\s*\(/gi
  let m
  while ((m = re.exec(texto))) {
    let cuerpo = ''
    try { cuerpo = extraerFn(texto, m[1]) } catch { continue }
    chk(`${rel}: ${m[1]}() no recorta los decimales de la plata (minimos: 0)`, !/minimos:\s*0\b/.test(cuerpo), m[1])
  }
}
for (const p of PERMITIDOS) {
  chk(`permitido sin uso (sacalo de la lista): ${p[0]} · ${p[1]}`, vistos.has(p))
}

for (const f of fallas) console.log('  ✗ ' + f)
const total = ok + fallas.length
console.log(`${ok}/${total}  ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
