// Mutaciones de las suites del dashboard, que desde el 27/09/2026 prueban DOS
// archivos: dashboard.html (por ARCHIVO_TEST) y el catálogo de módulos,
// js/modulos.js (por ARCHIVO_MODULOS), que comparte con la barra lateral.
// Ver mutar.js (mismos guards) y mutar-produccion.js (la misma idea).
//
// Cada mutación a mano va al archivo donde está su texto. Las anclas se
// escribieron con la sangría del <script> del dashboard (4 espacios de más):
// si el texto no está en el dashboard, se le saca esa sangría y se busca en
// js/modulos.js. Un texto que no está en ninguno aborta.

const fs = require('fs')
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const DASHBOARD = process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'dashboard.html')
const MODULOS = process.env.ARCHIVO_BASE_MODULOS || path.join(__dirname, '..', 'js', 'modulos.js')
// El tablero de resúmenes (29/09/2026): las tarjetas del dashboard se arman ahí.
const TABLERO = path.join(__dirname, '..', 'js', 'tablero.js')

// Saca 4 espacios del principio de cada línea (la sangría del <script>).
function sinSangria(t) {
  return t.split('\n').map(l => l.startsWith('    ') ? l.slice(4) : l).join('\n')
}

function repartir(lista, D, M, faltan, T = '') {
  const enD = [], enM = [], enT = []
  for (const m of lista) {
    if (D.includes(m.de)) { enD.push(m); continue }
    const de = sinSangria(m.de)
    if (M.includes(de)) { enM.push({ ...m, de, a: sinSangria(m.a) }); continue }
    if (T.includes(m.de)) { enT.push(m); continue }
    if (T.includes(de)) { enT.push({ ...m, de, a: sinSangria(m.a) }); continue }
    // Lo más parecido, en el archivo donde se parece más (parecido.js).
    const { parteQueFalta, lineaMasParecida, pistaDeAncla } = require('./parecido')
    const falta = parteQueFalta(D, m.de)
    const [nombre, texto] = [['dashboard.html', D], ['js/modulos.js', M], ['js/tablero.js', T]]
      .filter(([, t]) => t)
      .map(([n, t]) => [n, t, lineaMasParecida(t, falta)?.parecido ?? 0])
      .sort((a, b) => b[2] - a[2])[0]
    faltan.push(`«${m.nombre}» (${nombre})\n${pistaDeAncla(texto, m.de)}`)
  }
  return [enD, enM, enT]
}

function correrMutacionesDashboard({ suite, funciones = [], manuales = [], equivalentes = [], escape = 'escDash' }) {
  const D = fs.readFileSync(DASHBOARD, 'utf8')
  const M = fs.readFileSync(MODULOS, 'utf8')
  const Tt = fs.readFileSync(TABLERO, 'utf8')
  const faltan = []
  const [mD, mM, mT] = repartir(manuales, D, M, faltan, Tt)
  const [eD, eM, eT] = repartir(equivalentes, D, M, faltan, Tt)
  if (faltan.length) {
    console.log('ABORTADO: esto no está ni en dashboard.html ni en js/modulos.js:')
    for (const f of faltan) console.log('  ' + f)
    process.exit(2)
  }
  const tandas = []
  if (funciones.length || mD.length || eD.length) tandas.push({ suite, original: DASHBOARD, funciones, manuales: mD, equivalentes: eD, escape, variable: 'ARCHIVO_TEST' })
  if (mM.length || eM.length) tandas.push({ suite, original: MODULOS, funciones: [], manuales: mM, equivalentes: eM, escape, variable: 'ARCHIVO_MODULOS' })
  if (mT.length || eT.length) tandas.push({ suite, original: TABLERO, funciones: [], manuales: mT, equivalentes: eT, escape, variable: 'ARCHIVO_JS_TABLERO' })
  correrMutacionesEnVarios(tandas)
}

module.exports = { correrMutacionesDashboard, sinSangria }
