// La fábrica de pruebas en modulos/cuentas-corrientes.html (26/09/2026): la
// unidad "Pruebas (robot)" no aparece en ningún selector o filtro de unidad
// para una cuenta real, sí para una cuenta de prueba, y con FABRICA_SIN_DATOS
// (la lectura falló) no se saca nada.
//
// Se EJECUTA el código real: las funciones del módulo se extraen del <script>
// y los helpers de la fábrica salen del js/utils.js real (sin los `export`).
//
// Listas de unidades del módulo (las tres que hay):
//  - filtro-unidad-proveedores y filtro-unidad-historial (poblarFiltrosUnidad)
//  - filtro-unidad-ficha (unidadesDeFicha + renderizarSelectorUnidadFicha)
// El módulo no tiene listas de PERSONAS: la Cuenta de Empresa se busca por
// tipo='empresa' (no es de prueba) y el selector de cuentas es de cuentas.
// Las búsquedas de un nombre por id (nombreUnidad) NO se filtran.
//
//   node pruebas/test-cuentas-corrientes-fabrica-pruebas.js
//   ARCHIVO_TEST=otro.html node pruebas/test-cuentas-corrientes-fabrica-pruebas.js

const fs = require('fs')
const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const RUTA_UTILS = process.env.UTILS_TEST || path.join(RAIZ, 'js', 'utils.js')

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

// Los helpers de la fábrica, tal cual están en utils.js.
function fuenteFabrica() {
  const src = fs.readFileSync(RUTA_UTILS, 'utf8')
  const ini = src.indexOf('export const FABRICA_SIN_DATOS')
  if (ini === -1) throw new Error('utils.js: no está FABRICA_SIN_DATOS')
  const fin = src.indexOf('\n// ═══', ini)
  return src.slice(ini, fin === -1 ? undefined : fin).replace(/^export /gm, '')
}

const PREL = `
  ${fuenteFabrica()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) { return { id, innerHTML: '', value: '', hidden: false } }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var estado = { maestros: { unidades: [], proveedores: [] }, fabrica: FABRICA_SIN_DATOS, ficha: { unidades: [], unidadId: null } }
`

const FUNCIONES = ['esc', 'poblarSelect', 'unidadesParaElegir', 'poblarFiltrosUnidad', 'unidadesDeFicha', 'renderizarSelectorUnidadFicha', 'nombreUnidad']

function sandbox() {
  return construirCon(ARCHIVO, { preludio: PREL, funciones: FUNCIONES, retorno: 'estado, __els, FABRICA_SIN_DATOS' })
}

const PRUEBA = '62920a05-f450-468a-9ba9-96cddb6fd907'
const CN = 'u-cucuruchos', DP = 'u-dolce'
const UNIDADES = [
  { id: CN, nombre: 'Cucuruchos Nuss' },
  { id: PRUEBA, nombre: 'Pruebas (robot)' },
  { id: DP, nombre: 'Dolce Pasta' },
]
const REAL = { ok: true, unidades: new Set([PRUEBA]), personas: new Set(['p-robot']), soyDePrueba: false }
const DE_PRUEBA = { ok: true, unidades: new Set([PRUEBA]), personas: new Set(['p-robot']), soyDePrueba: true }

const tieneRobot = (html) => html.includes(PRUEBA) || html.includes('Pruebas (robot)')
const tieneReales = (html) => html.includes(CN) && html.includes('Cucuruchos Nuss') && html.includes(DP)

function caso(nombre, fabrica, esperaRobot) {
  const S = sandbox()
  S.estado.maestros.unidades = UNIDADES.map(u => ({ ...u }))
  S.estado.fabrica = fabrica === 'SIN' ? S.FABRICA_SIN_DATOS : fabrica

  // 1 y 2. Los dos filtros de la pantalla principal.
  S.poblarFiltrosUnidad()
  for (const id of ['filtro-unidad-proveedores', 'filtro-unidad-historial']) {
    const html = S.__els.get(id)?.innerHTML ?? ''
    chk(`${nombre}: ${id} ${esperaRobot ? 'MUESTRA' : 'NO muestra'} la unidad de prueba`, tieneRobot(html) === esperaRobot, html)
    chk(`${nombre}: ${id} sigue mostrando las reales`, tieneReales(html), html)
  }

  // 3. El selector de la ficha de un proveedor con movimientos en las tres.
  S.estado.ficha.unidades = S.unidadesDeFicha([CN, PRUEBA, DP])
  chk(`${nombre}: la ficha ${esperaRobot ? 'incluye' : 'excluye'} la unidad de prueba`,
    S.estado.ficha.unidades.some(u => u.id === PRUEBA) === esperaRobot, S.estado.ficha.unidades)
  chk(`${nombre}: la ficha conserva el orden de los ids`,
    S.estado.ficha.unidades.filter(u => u.id !== PRUEBA).map(u => u.id).join() === [CN, DP].join())
  S.renderizarSelectorUnidadFicha()
  const htmlFicha = S.__els.get('filtro-unidad-ficha').innerHTML
  chk(`${nombre}: filtro-unidad-ficha ${esperaRobot ? 'MUESTRA' : 'NO muestra'} la unidad de prueba`, tieneRobot(htmlFicha) === esperaRobot, htmlFicha)
  chk(`${nombre}: filtro-unidad-ficha sigue con "Todas las unidades"`, htmlFicha.includes('Todas las unidades'))

  // Un proveedor con movimientos SOLO en la unidad de prueba: para una cuenta
  // real el selector queda solo con "Todas", como cualquier ficha sin unidades.
  const soloRobot = S.unidadesDeFicha([PRUEBA])
  chk(`${nombre}: ficha con solo la unidad de prueba → ${esperaRobot ? '1' : '0'} unidades`, soloRobot.length === (esperaRobot ? 1 : 0), soloRobot)

  // La búsqueda de un nombre por id NO se filtra, y la lista maestra tampoco.
  chk(`${nombre}: nombreUnidad resuelve la unidad de prueba`, S.nombreUnidad(PRUEBA) === 'Pruebas (robot)')
  chk(`${nombre}: estado.maestros.unidades queda completa`, S.estado.maestros.unidades.length === 3)
}

caso('cuenta real', REAL, false)
caso('cuenta de prueba', DE_PRUEBA, true)
caso('sin datos de la fábrica', 'SIN', true)

// El estado arranca sin datos: antes de que la fábrica llegue no se saca nada.
{
  const iEstado = SCRIPT.indexOf('const estado = {')
  const bloque = SCRIPT.slice(iEstado, SCRIPT.indexOf('\n    }\n', iEstado))
  chk('estado.fabrica arranca en FABRICA_SIN_DATOS', /\bfabrica: FABRICA_SIN_DATOS,/.test(bloque))
}

// El init: la carga va UNA vez, EN PARALELO con lo que ya se cargaba, y los
// filtros se pueblan después de guardarla. maestros.unidades no se filtra.
{
  const init = extraerFn(SCRIPT, 'init')
  const iAll = init.indexOf('await Promise.all([')
  const finAll = init.indexOf('])', iAll)
  const dentro = iAll === -1 ? '' : init.slice(iAll, finAll)
  chk('init carga la fábrica dentro del Promise.all', /cargarFabricaDePruebas\(supabase\)/.test(dentro), dentro)
  chk('init carga la fábrica una sola vez', (init.match(/cargarFabricaDePruebas\(/g) || []).length === 1)
  const iGuarda = init.indexOf('estado.fabrica = fabrica')
  const iPobla = init.indexOf('poblarFiltrosUnidad()')
  chk('init guarda la fábrica en el estado', iGuarda !== -1)
  chk('init puebla los filtros DESPUÉS de guardar la fábrica', iGuarda !== -1 && iPobla !== -1 && iGuarda < iPobla, [iGuarda, iPobla])
  chk('init ya no puebla los filtros con la lista maestra directa',
    !/poblarSelect\('filtro-unidad-(proveedores|historial)', estado\.maestros\.unidades/.test(init))
  chk('estado.maestros.unidades se guarda sin filtrar', /estado\.maestros\.unidades = unids\.data \?\? \[\]/.test(init))
}

// La ficha arma su lista con unidadesDeFicha (que filtra).
{
  const abrir = extraerFn(SCRIPT, 'abrirFicha')
  chk('abrirFicha usa unidadesDeFicha', /estado\.ficha\.unidades = unidadesDeFicha\(ids\)/.test(abrir))
}

const total = ok + fallas.length
for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
process.exit(fallas.length ? 1 : 0)
