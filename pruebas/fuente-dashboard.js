// La fuente del dashboard para las suites (27/09/2026): el catálogo de módulos
// se mudó a js/modulos.js, que comparten el dashboard y la barra lateral. Las
// suites leen los DOS archivos pegados, así extraerConst / extraerFn encuentran
// cada cosa donde esté.
//
//   ARCHIVO_TEST     otra copia de dashboard.html
//   ARCHIVO_MODULOS  otra copia de js/modulos.js (la usan los runners de
//                    mutaciones para mutar el catálogo)
//   ARCHIVO_JS_TABLERO otra copia de js/tablero.js (el tablero de resúmenes,
//                    29/09/2026: las tarjetas del dashboard se arman ahí)
'use strict'

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const RUTA_DASHBOARD = process.env.ARCHIVO_TEST || path.join(RAIZ, 'dashboard.html')
const RUTA_MODULOS = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js', 'modulos.js')
const RUTA_TABLERO = process.env.ARCHIVO_JS_TABLERO || path.join(RAIZ, 'js', 'tablero.js')

function leer(ruta) {
  const t = fs.readFileSync(ruta, 'utf8')
  // El runner de mutaciones compara el largo que leyó el sub-proceso con el
  // que escribió: se imprime para los dos archivos.
  console.log(`ARCHIVO ${ruta} (${t.length} bytes)`)
  return t
}

// dashboard.html entero + js/modulos.js + js/tablero.js.
function fuenteDashboard() {
  return leer(RUTA_DASHBOARD) + '\n' + leer(RUTA_MODULOS) + '\n' + leer(RUTA_TABLERO)
}

// Solo el <script type="module"> del dashboard + js/modulos.js.
function scriptDashboard() {
  const html = leer(RUTA_DASHBOARD)
  const ini = html.indexOf('<script type="module">')
  return html.slice(ini, html.indexOf('</script>', ini)) + '\n' + leer(RUTA_MODULOS)
}

module.exports = { fuenteDashboard, scriptDashboard, RUTA_DASHBOARD, RUTA_MODULOS, RUTA_TABLERO }
