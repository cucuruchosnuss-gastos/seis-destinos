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

// Saca 4 espacios del principio de cada línea (la sangría del <script>).
function sinSangria(t) {
  return t.split('\n').map(l => l.startsWith('    ') ? l.slice(4) : l).join('\n')
}

function repartir(lista, D, M, faltan) {
  const enD = [], enM = []
  for (const m of lista) {
    if (D.includes(m.de)) { enD.push(m); continue }
    const de = sinSangria(m.de)
    if (M.includes(de)) { enM.push({ ...m, de, a: sinSangria(m.a) }); continue }
    faltan.push(`«${m.nombre}»`)
  }
  return [enD, enM]
}

function correrMutacionesDashboard({ suite, funciones = [], manuales = [], equivalentes = [], escape = 'escDash' }) {
  const D = fs.readFileSync(DASHBOARD, 'utf8')
  const M = fs.readFileSync(MODULOS, 'utf8')
  const faltan = []
  const [mD, mM] = repartir(manuales, D, M, faltan)
  const [eD, eM] = repartir(equivalentes, D, M, faltan)
  if (faltan.length) {
    console.log('ABORTADO: esto no está ni en dashboard.html ni en js/modulos.js:')
    for (const f of faltan) console.log('  ' + f)
    process.exit(2)
  }
  const tandas = []
  if (funciones.length || mD.length || eD.length) tandas.push({ suite, original: DASHBOARD, funciones, manuales: mD, equivalentes: eD, escape, variable: 'ARCHIVO_TEST' })
  if (mM.length || eM.length) tandas.push({ suite, original: MODULOS, funciones: [], manuales: mM, equivalentes: eM, escape, variable: 'ARCHIVO_MODULOS' })
  correrMutacionesEnVarios(tandas)
}

module.exports = { correrMutacionesDashboard, sinSangria }
