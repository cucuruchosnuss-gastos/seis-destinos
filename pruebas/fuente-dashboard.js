// La fuente del dashboard para las suites (27/09/2026): el catálogo de módulos
// se mudó a js/modulos.js, que comparten el dashboard y la barra lateral. Las
// suites leen los DOS archivos pegados, así extraerConst / extraerFn encuentran
// cada cosa donde esté.
//
//   ARCHIVO_TEST     otra copia de dashboard.html
//   ARCHIVO_MODULOS  otra copia de js/modulos.js (la usan los runners de
//                    mutaciones para mutar el catálogo)
'use strict'

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const RUTA_DASHBOARD = process.env.ARCHIVO_TEST || path.join(RAIZ, 'dashboard.html')
const RUTA_MODULOS = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js', 'modulos.js')

function leer(ruta) {
  const t = fs.readFileSync(ruta, 'utf8')
  // El runner de mutaciones compara el largo que leyó el sub-proceso con el
  // que escribió: se imprime para los dos archivos.
  console.log(`ARCHIVO ${ruta} (${t.length} bytes)`)
  return t
}

// dashboard.html entero + js/modulos.js.
function fuenteDashboard() {
  return leer(RUTA_DASHBOARD) + '\n' + leer(RUTA_MODULOS)
}

// Solo el <script type="module"> del dashboard + js/modulos.js.
function scriptDashboard() {
  const html = leer(RUTA_DASHBOARD)
  const ini = html.indexOf('<script type="module">')
  return html.slice(ini, html.indexOf('</script>', ini)) + '\n' + leer(RUTA_MODULOS)
}

module.exports = { fuenteDashboard, scriptDashboard, RUTA_DASHBOARD, RUTA_MODULOS }
