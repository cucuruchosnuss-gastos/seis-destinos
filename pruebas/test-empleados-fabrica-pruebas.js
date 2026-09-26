// La FÁBRICA DE PRUEBAS en modulos/empleados.html: la unidad "Pruebas (robot)"
// y sus personas (las que usa Playwright) NO se muestran a una cuenta real.
//
// Se EJECUTAN las funciones reales del archivo con los helpers REALES de
// js/utils.js (sinUnidadesDePrueba, sinPersonasDePrueba, FABRICA_SIN_DATOS):
//  - el listado agrupado: sin el grupo de la unidad de prueba, sin sus
//    personas en ningún grupo (tampoco en "Sin empresa" ni en el de tablets);
//  - las cifras: no cuentan a las personas de prueba ni su empresa;
//  - el selector de unidad de la edición y el de la importación de Naaloo:
//    sin la unidad de prueba;
//  - una persona marcada es_prueba en otra unidad tampoco se muestra;
//  - con una cuenta de prueba (soyDePrueba) SÍ aparece todo;
//  - con FABRICA_SIN_DATOS (no se pudo leer) no se saca nada;
//  - la ficha (búsqueda por id) sigue resolviendo el nombre de la unidad.
// Y sobre el fuente: la fábrica se carga en init, antes de cargarTodo, y la
// consulta trae es_prueba.
//
//   node pruebas/test-empleados-fabrica-pruebas.js

const fs = require('fs')
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/empleados.html')
const FUENTE = leer(ARCHIVO)
// extraerFn no reconoce `export function`: se saca el `export` (el código es el real).
const UTILS = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8').replace(/^export /gm, '')
const { chk, fin } = arnes()
function bloque(nombre, fn) { try { fn() } catch (e) { chk(`${nombre}: sin excepción`, false, String(e && e.message || e)) } }

let utils = ''
for (const n of ['sinUnidadesDePrueba', 'sinPersonasDePrueba']) {
  try { utils += extraerFn(UTILS, n) + '\n' } catch (e) { chk(`utils.js tiene ${n}`, false, e.message) }
}
const mSin = UTILS.match(/^const FABRICA_SIN_DATOS = (.+)$/m)
chk('utils.js tiene FABRICA_SIN_DATOS', !!mSin)
utils += `var FABRICA_SIN_DATOS = ${mSin ? mSin[1] : 'null'}\n`

const FNS = ['esc', 'iniciales', 'colorAvatar', 'formatearCuil', 'esDispositivo', 'unidadesVisibles', 'personasVisibles',
  'ordenarGrupo', 'agruparEmpleados', 'renderizarFilaEmpleado', 'renderizarStats', 'renderizarFormularioEdicion', 'htmlOpcionesEmpresaImport']
let codigo = ''
for (const n of FNS) {
  try { codigo += extraerFn(FUENTE, n) + '\n' } catch (e) { chk(`existe la función ${n}`, false, e.message) }
}

function armar(estado) {
  const dom = {}
  const el = (id) => (dom[id] ||= { id, innerHTML: '', textContent: '', hidden: true, style: {}, addEventListener() {} })
  const document = { getElementById: el }
  const f = new Function('estado', 'document', `
    ${utils}
    const PALETA_AVATAR = ['#111']
    function tieneTarea() { return true }
    function renderizarFicha() {}
    ${codigo}
    return { FABRICA_SIN_DATOS, agruparEmpleados, renderizarStats, renderizarFormularioEdicion, htmlOpcionesEmpresaImport }
  `)
  return { api: f(estado, document), dom }
}

const UR = 'u-robot', U1 = 'u-cn', U2 = 'u-dp'
const baseEstado = (fabrica) => ({
  fabrica,
  maestros: { unidadesNegocio: [{ id: U1, nombre: 'Cucuruchos Nuss' }, { id: U2, nombre: 'Dolce Pasta' }, { id: UR, nombre: 'Pruebas (robot)' }] },
  empleados: [
    { id: 'p1', nombre: 'Ana Pérez', unidad_negocio_id: U1, auth_user_id: 'a1', rol_app: 'usuario', rol: 'Operaria', es_prueba: false },
    { id: 'p2', nombre: 'Beto Díaz', unidad_negocio_id: U2, auth_user_id: null, rol_app: 'usuario', rol: 'Masero' },
    { id: 't1', nombre: 'Tablet Producción · Cucuruchos Nuss', unidad_negocio_id: U1, auth_user_id: 'at1', rol_app: 'usuario', tipo: 'sistema', es_dispositivo: true },
    // La fábrica de pruebas: dos personas y una tablet, todas en la unidad robot.
    { id: 'r1', nombre: 'Robot Encargado', unidad_negocio_id: UR, auth_user_id: 'ar1', rol_app: 'usuario', tipo: 'sistema', es_prueba: true },
    { id: 'r2', nombre: 'Robot Masero', unidad_negocio_id: UR, auth_user_id: 'ar2', rol_app: 'usuario', tipo: 'sistema', es_prueba: true },
    { id: 'rt', nombre: 'Robot · tablet de planta', unidad_negocio_id: UR, auth_user_id: 'art', rol_app: 'usuario', tipo: 'sistema', es_dispositivo: true, es_prueba: true },
    // Una persona de prueba FUERA de la unidad robot: la saca es_prueba.
    { id: 'rx', nombre: 'Robot Suelto', unidad_negocio_id: U2, auth_user_id: 'arx', rol_app: 'usuario', tipo: 'sistema', es_prueba: true },
    // Una persona de prueba SIN es_prueba en la fila: la saca el Set de personas.
    { id: 'ry', nombre: 'Robot Sin Marca', unidad_negocio_id: null, auth_user_id: null, rol_app: 'usuario', tipo: 'sistema' },
  ],
  pin: {},
})
const REAL = { ok: true, unidades: new Set([UR]), personas: new Set(['r1', 'r2', 'rt', 'ry']), soyDePrueba: false }
const DE_PRUEBA = { ...REAL, soyDePrueba: true }
const ROBOTS = ['r1', 'r2', 'rt', 'rx', 'ry']

const idsDe = (grupos) => grupos.flatMap(g => g.lista.map(e => e.id))
function cifras(dom) {
  const h = dom['empleados-stats'].innerHTML
  return {
    total: (h.match(/Total empleados<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1],
    acceso: (h.match(/Con acceso a la app<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1],
    empresas: (h.match(/Empresas<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1],
  }
}

// ── Cuenta real ─────────────────────────────────────────────────────────
bloque('cuenta real', () => {
  const e = baseEstado(REAL)
  const { api, dom } = armar(e)
  const grupos = api.agruparEmpleados()
  const ids = idsDe(grupos)
  chk('real: no hay grupo "Pruebas (robot)"', !grupos.some(g => g.nombre === 'Pruebas (robot)'), grupos.map(g => g.nombre).join())
  for (const r of ROBOTS) chk(`real: la persona de prueba ${r} no aparece en ningún grupo`, !ids.includes(r))
  const tab = grupos.find(g => g.nombre === 'Tablets de la fábrica')
  chk('real: el grupo de tablets tiene solo la tablet real', tab && tab.lista.map(x => x.id).join() === 't1', tab && tab.lista.map(x => x.id).join())
  chk('real: las personas reales siguen', ['p1', 'p2', 't1'].every(x => ids.includes(x)))
  chk('real: no aparece un grupo "Sin empresa asignada" solo por los robots', !grupos.some(g => /Sin empresa|sin empresa/.test(g.nombre)))
  chk('real: el filtro no toca estado.empleados (la búsqueda por id sigue)', e.empleados.length === 8)

  api.renderizarStats()
  const c = cifras(dom)
  chk('real: el total no cuenta a los robots (2 personas)', c.total === '2', c.total)
  chk('real: "Con acceso" no cuenta a los robots (1)', c.acceso === '1', c.acceso)
  chk('real: "Empresas" no cuenta la unidad robot (2)', c.empresas === '2', c.empresas)

  api.renderizarFormularioEdicion(e.empleados[0])
  const sel = dom['ficha-datos-laborales'].innerHTML
  chk('real: el selector de unidad de la edición no ofrece la unidad robot', !sel.includes(UR) && !sel.includes('Pruebas (robot)'))
  chk('real: el selector de unidad de la edición ofrece las reales', sel.includes(`value="${U1}"`) && sel.includes(`value="${U2}"`))
  chk('real: la unidad de la persona sigue elegida', new RegExp(`value="${U1}" selected`).test(sel))

  const imp = api.htmlOpcionesEmpresaImport()
  chk('real: la importación no ofrece la unidad robot', !imp.includes(UR) && !imp.includes('Pruebas (robot)'))
  chk('real: la importación ofrece las reales y el placeholder', imp.includes(`value="${U1}"`) && imp.includes(`value="${U2}"`) && imp.includes('Elegí una empresa'))
})

// ── Cuenta de la fábrica de pruebas ─────────────────────────────────────
bloque('cuenta de prueba', () => {
  const e = baseEstado(DE_PRUEBA)
  const { api, dom } = armar(e)
  const grupos = api.agruparEmpleados()
  const ids = idsDe(grupos)
  chk('prueba: aparece el grupo "Pruebas (robot)"', grupos.some(g => g.nombre === 'Pruebas (robot)'))
  for (const r of ROBOTS) chk(`prueba: la persona de prueba ${r} aparece`, ids.includes(r))
  chk('prueba: la tablet robot está en el grupo de tablets', grupos.find(g => g.nombre === 'Tablets de la fábrica')?.lista.some(x => x.id === 'rt'))
  api.renderizarStats()
  chk('prueba: el total cuenta a todos (6 personas)', cifras(dom).total === '6', cifras(dom).total)
  api.renderizarFormularioEdicion(e.empleados[0])
  chk('prueba: la edición ofrece la unidad robot', dom['ficha-datos-laborales'].innerHTML.includes(`value="${UR}"`))
  chk('prueba: la importación ofrece la unidad robot', api.htmlOpcionesEmpresaImport().includes(`value="${UR}"`))
})

// ── Sin datos de la fábrica ─────────────────────────────────────────────
bloque('sin datos', () => {
  const { api: a0 } = armar(baseEstado(null))
  const e = baseEstado(a0.FABRICA_SIN_DATOS)
  const { api, dom } = armar(e)
  const grupos = api.agruparEmpleados()
  const ids = idsDe(grupos)
  chk('sin datos: no se saca a nadie', ROBOTS.every(r => ids.includes(r)), ids.join())
  chk('sin datos: el grupo "Pruebas (robot)" se ve', grupos.some(g => g.nombre === 'Pruebas (robot)'))
  api.renderizarStats()
  chk('sin datos: el total cuenta a todos (6)', cifras(dom).total === '6', cifras(dom).total)
  chk('sin datos: la importación ofrece las tres unidades', api.htmlOpcionesEmpresaImport().includes(`value="${UR}"`))
})

// ── Sobre el fuente: el cableado ────────────────────────────────────────
chk('importa los helpers de utils.js',
  /import \{[^}]*\bcargarFabricaDePruebas\b[^}]*\bsinUnidadesDePrueba\b[^}]*\bsinPersonasDePrueba\b[^}]*\bFABRICA_SIN_DATOS\b[^}]*\} from '\.\.\/js\/utils\.js'/.test(FUENTE))
chk('el estado arranca con FABRICA_SIN_DATOS', /fabrica:\s+FABRICA_SIN_DATOS,/.test(FUENTE))
chk('la consulta de empleados trae es_prueba', /from\('empleados'\)\s*\n?\s*\.select\('[^']*\bes_prueba\b[^']*'\)/.test(FUENTE))
bloque('init', () => {
  const init = extraerFn(FUENTE, 'init')
  const iCarga = init.indexOf('cargarFabricaDePruebas(supabase)')
  const iTareas = init.indexOf("from('empleado_tareas')")
  const iAsigna = init.indexOf('estado.fabrica = await fabricaP')
  const iTodo = init.indexOf('await cargarTodo()')
  chk('init: carga la fábrica', iCarga >= 0)
  chk('init: la carga arranca antes de las otras consultas (en paralelo)', iCarga >= 0 && iTareas >= 0 && iCarga < iTareas)
  chk('init: la fábrica se guarda en el estado ANTES de cargarTodo', iAsigna >= 0 && iTodo >= 0 && iAsigna < iTodo)
  chk('init: el selector de la importación usa htmlOpcionesEmpresaImport', /innerHTML = htmlOpcionesEmpresaImport\(\)/.test(init))
})

fin()
