// Los import de una pantalla, para las suites (28/09/2026).
//
// El problema que resuelve: una suite pide `extraerFn(src, 'x')` sobre el
// <script> de un HTML. Si mañana `x` se muda a js/, la suite dice "NO EXISTE la
// función x" aunque el navegador la siga encontrando por el import. Antes cada
// mudanza obligaba a escribir un fuente-<modulo>.js a mano (fuente-cobranzas,
// fuente-dashboard, fuente-cheques…). Ahora extraer.js, cuando no encuentra
// algo en el texto, lee los `import … from '../js/x.js'` de ese mismo texto y
// lo busca ahí (y en lo que esos archivos importan, recursivo).
//
// Cada archivo de js/ se puede reemplazar por una copia con una variable de
// entorno, para mutarlo:
//   ARCHIVO_JS_<NOMBRE>  (js/cobranzas-comun.js → ARCHIVO_JS_COBRANZAS_COMUN)
// y los nombres viejos siguen valiendo: ARCHIVO_COMUN (cobranzas-comun.js),
// ARCHIVO_COMUN_RETIROS (retiros-comun.js) y ARCHIVO_MODULOS (modulos.js).
//
// Cada archivo que se lee se informa UNA vez por proceso con
// "ARCHIVO <ruta> (N bytes)": el runner de mutaciones lo usa para confirmar
// que el sub-proceso leyó la copia mutada y no la limpia.
'use strict'

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
// PRUEBAS_DIR_JS: solo para test-imports.js, que arma una pantalla de mentira.
const DIR_JS = process.env.PRUEBAS_DIR_JS || path.join(RAIZ, 'js')

const ALIAS = {
  'cobranzas-comun.js': 'ARCHIVO_COMUN',
  'retiros-comun.js': 'ARCHIVO_COMUN_RETIROS',
  'modulos.js': 'ARCHIVO_MODULOS',
}

function variableDe(nombre) {
  return 'ARCHIVO_JS_' + path.basename(nombre, '.js').toUpperCase().replace(/[^A-Z0-9]/g, '_')
}

// La variable que manda para ese archivo: la nueva, o el alias viejo.
function variableQueManda(nombre) {
  const nueva = variableDe(nombre)
  if (process.env[nueva]) return nueva
  const vieja = ALIAS[nombre]
  if (vieja && process.env[vieja]) return vieja
  return ALIAS[nombre] || nueva
}

function rutaDe(nombre) {
  const v = process.env[variableDe(nombre)] || (ALIAS[nombre] && process.env[ALIAS[nombre]])
  return v || path.join(DIR_JS, nombre)
}

const _leidos = new Map()
function leerJs(nombre) {
  const ruta = rutaDe(nombre)
  if (_leidos.has(ruta)) return _leidos.get(ruta)
  let t = null
  try { t = fs.readFileSync(ruta, 'utf8') } catch { t = null }
  if (t != null) console.log(`ARCHIVO ${ruta} (${t.length} bytes)`)
  _leidos.set(ruta, t)
  return t
}

// Los archivos de js/ que importa un texto (solo los locales: nada de CDN).
function importsDe(texto) {
  const out = []
  for (const m of texto.matchAll(/\bfrom\s+['"]((?:\.{1,2}\/)(?:[\w.-]+\/)*[\w.-]+\.js)['"]/g)) {
    const nombre = path.basename(m[1])
    if (!out.includes(nombre)) out.push(nombre)
  }
  for (const m of texto.matchAll(/\bimport\s+['"]((?:\.{1,2}\/)(?:[\w.-]+\/)*[\w.-]+\.js)['"]/g)) {
    const nombre = path.basename(m[1])
    if (!out.includes(nombre)) out.push(nombre)
  }
  return out
}

// Recorre los imports en anchura: cada archivo una sola vez.
function* archivosImportados(texto) {
  const vistos = new Set()
  const cola = importsDe(texto)
  while (cola.length) {
    const nombre = cola.shift()
    if (vistos.has(nombre)) continue
    vistos.add(nombre)
    const t = leerJs(nombre)
    if (t == null) continue
    yield { nombre, ruta: rutaDe(nombre), texto: t }
    for (const n of importsDe(t)) if (!vistos.has(n)) cola.push(n)
  }
}

// El primer archivo importado (recursivo) cuyo texto cumple `declara(texto)`.
function buscarEnImports(texto, declara) {
  for (const a of archivosImportados(texto)) if (declara(a.texto)) return a
  return null
}

// Todos los archivos (el HTML y lo que importa), para el runner de mutaciones.
function archivosDe(rutaHtml) {
  const texto = fs.readFileSync(rutaHtml, 'utf8')
  return [...archivosImportadosSinInformar(texto)]
}

// Igual que archivosImportados pero sin imprimir: lo usa el padre del runner.
function* archivosImportadosSinInformar(texto) {
  const vistos = new Set()
  const cola = importsDe(texto)
  while (cola.length) {
    const nombre = cola.shift()
    if (vistos.has(nombre)) continue
    vistos.add(nombre)
    let t = null
    try { t = fs.readFileSync(path.join(DIR_JS, nombre), 'utf8') } catch { t = null }
    if (t == null) continue
    yield { nombre, ruta: path.join(DIR_JS, nombre), texto: t, variable: variableQueManda(nombre) }
    for (const n of importsDe(t)) if (!vistos.has(n)) cola.push(n)
  }
}

module.exports = { importsDe, archivosImportados, buscarEnImports, archivosDe, leerJs, rutaDe, variableDe, variableQueManda, ALIAS, DIR_JS }
