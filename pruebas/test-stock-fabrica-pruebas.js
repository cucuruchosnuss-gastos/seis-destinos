// La FÁBRICA DE PRUEBAS en modulos/stock.html: la unidad "Pruebas (robot)"
// (unidades_negocio.es_prueba) no puede aparecer para una cuenta real en
// ninguna lista de UNIDADES del módulo (chips de stock, recuento, historial y
// mermas; unidades de baja, de envío y destinos de una transferencia) ni en
// ningún LISTADO de filas de esa unidad (stock, historial de recuentos,
// mermas, tránsito e historial de transferencias). Una cuenta de prueba SÍ la
// ve, y sin datos de la fábrica (FABRICA_SIN_DATOS) no se saca nada.
//
// El servidor no filtra nada: las v_mis_unidades_* le devuelven la unidad del
// robot a un super_admin por el bypass de tiene_tarea_alcance. Por eso se
// EJECUTAN las cargas reales (extraídas del <script>) contra un supabase falso
// que devuelve la unidad de prueba, con los helpers REALES de js/utils.js.
//
// Stock no tiene listas de PERSONAS elegibles: los nombres ("abierto por",
// "creado por") se resuelven por id y esos no se filtran.
//
//   node pruebas/test-stock-fabrica-pruebas.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { leer } = require('./circuito-comun')
const { extraerFn, extraerConst } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const FUENTE = leer(ARCHIVO)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

// Los helpers REALES de js/utils.js (sin el `export`, para poder evaluarlos).
const UTILS = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8').replace(/^export /gm, '')
const HELPERS = [
  extraerConst(UTILS, 'FABRICA_SIN_DATOS'),
  extraerFn(UTILS, 'sinUnidadesDePrueba'),
].join('\n')

const REAL1 = 'u-cucuruchos', REAL2 = 'u-dolce', ROBOT = 'u-robot'
const UNIDADES = [
  { id: REAL1, nombre: 'Cucuruchos Nuss' },
  { id: ROBOT, nombre: 'Pruebas (robot)' },
  { id: REAL2, nombre: 'Dolce Pasta' },
]

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  function mostrarError() {}
  function elemento(id) {
    return { id, hidden: false, innerHTML: '', textContent: '', dataset: {}, querySelectorAll: () => [] }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, elemento(id)); return __els.get(id) },
    querySelectorAll: () => [],
  }
  var __datos = {}
  var supabase = {
    from(tabla) {
      const q = {
        select() { return q }, order() { return q }, eq() { return q }, in() { return q },
        maybeSingle() { return q },
        then(res, rej) { return Promise.resolve({ data: __datos[tabla] ?? [], error: null }).then(res, rej) },
      }
      return q
    },
  }
  function renderizarStock() {}
  function renderizarHistorial() {}
  function renderizarChipsOrigenMerma() {}
  function renderizarMermas() {}
  function renderizarTransito() {}
  function renderizarTransfHistorial() {}
  ${HELPERS}
  var estado = {
    fabrica: FABRICA_SIN_DATOS,
    unidadesStock: [], unidadStock: '', stock: [],
    unidadesAjuste: [], unidadRecuento: '',
    unidadHist: '', recuentos: [],
    unidadMerma: '', mermas: [],
    unidadesBaja: [], unidadesEnvio: [], destinos: [],
    transito: [], transferencias: [],
  }
`

const FUNCIONES = [
  'esc',
  'cargarStock', 'renderizarChipsUnidadStock',
  'cargarUnidadesRecuento', 'renderizarChipsUnidadRecuento',
  'cargarHistorial', 'renderizarChipsUnidadHistorial',
  'cargarMermas', 'renderizarChipsUnidadMerma',
  'cargarUnidadesBaja', 'cargarUnidadesEnvio', 'cargarDestinos', 'cargarTransito',
]

function nuevo(fabrica) {
  const sb = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES,
    retorno: `estado, document, __setDatos(d){ __datos = d }, __sinDatos: FABRICA_SIN_DATOS`,
  })
  sb.estado.fabrica = fabrica === 'sin' ? sb.__sinDatos : fabrica
  sb.__setDatos({
    v_mis_unidades_stock: UNIDADES,
    v_mis_unidades_ajuste: UNIDADES,
    v_mis_unidades_baja: UNIDADES,
    v_mis_unidades_envio: UNIDADES,
    unidades_negocio: UNIDADES,
    v_stock_insumos: [
      { unidad_negocio_id: REAL1, insumo_id: 'i1' },
      { unidad_negocio_id: ROBOT, insumo_id: 'i2' },
    ],
    v_recuentos: [
      { id: 'r1', unidad_negocio_id: REAL1, unidad_nombre: 'Cucuruchos Nuss' },
      { id: 'r2', unidad_negocio_id: ROBOT, unidad_nombre: 'Pruebas (robot)' },
    ],
    v_mermas: [
      { unidad_negocio_id: REAL2, insumo_id: 'i1' },
      { unidad_negocio_id: ROBOT, insumo_id: 'i2' },
    ],
    v_stock_en_transito: [
      { id: 't1', unidad_origen_id: REAL1, unidad_destino_id: REAL2 },
      { id: 't2', unidad_origen_id: ROBOT, unidad_destino_id: REAL2 },
      { id: 't3', unidad_origen_id: REAL1, unidad_destino_id: ROBOT },
    ],
    v_transferencias: [
      { id: 'h1', unidad_origen_id: REAL2, unidad_destino_id: REAL1 },
      { id: 'h2', unidad_origen_id: ROBOT, unidad_destino_id: REAL1 },
      { id: 'h3', unidad_origen_id: REAL2, unidad_destino_id: ROBOT },
    ],
  })
  return sb
}

const FAB_REAL = { ok: true, unidades: new Set([ROBOT]), personas: new Set(['p-robot']), soyDePrueba: false }
const FAB_PRUEBA = { ok: true, unidades: new Set([ROBOT]), personas: new Set(['p-robot']), soyDePrueba: true }

const ids = xs => (xs || []).map(x => x.id)
const tieneRobot = xs => (xs || []).some(x => x.id === ROBOT || x.unidad_negocio_id === ROBOT
  || x.unidad_origen_id === ROBOT || x.unidad_destino_id === ROBOT)

async function cargarTodo(sb) {
  await sb.cargarStock()
  await sb.cargarUnidadesRecuento()
  await sb.cargarHistorial()
  await sb.cargarMermas()
  await sb.cargarUnidadesBaja()
  await sb.cargarUnidadesEnvio()
  await sb.cargarDestinos()
  await sb.cargarTransito()
}

;(async () => {
  // ── Cuenta REAL: la unidad del robot no aparece en ningún lado ─────────
  {
    const sb = await (async () => { const s = nuevo(FAB_REAL); await cargarTodo(s); return s })()
    const e = sb.estado
    chk('real: unidades de stock sin el robot', !tieneRobot(e.unidadesStock) && e.unidadesStock.length === 2, ids(e.unidadesStock))
    chk('real: filas de stock sin el robot', !tieneRobot(e.stock) && e.stock.length === 1, e.stock)
    chk('real: unidades de ajuste (recuento) sin el robot', !tieneRobot(e.unidadesAjuste) && e.unidadesAjuste.length === 2, ids(e.unidadesAjuste))
    chk('real: historial de recuentos sin el robot', !tieneRobot(e.recuentos) && e.recuentos.length === 1, ids(e.recuentos))
    chk('real: mermas sin el robot', !tieneRobot(e.mermas) && e.mermas.length === 1, e.mermas)
    chk('real: unidades de baja sin el robot', !tieneRobot(e.unidadesBaja) && e.unidadesBaja.length === 2, ids(e.unidadesBaja))
    chk('real: unidades de envío sin el robot', !tieneRobot(e.unidadesEnvio) && e.unidadesEnvio.length === 2, ids(e.unidadesEnvio))
    chk('real: destinos sin el robot', !tieneRobot(e.destinos) && e.destinos.length === 2, ids(e.destinos))
    chk('real: tránsito sin transferencias del robot (origen)', !ids(e.transito).includes('t2'), ids(e.transito))
    chk('real: tránsito sin transferencias del robot (destino)', !ids(e.transito).includes('t3'), ids(e.transito))
    chk('real: tránsito conserva la real', ids(e.transito).includes('t1'), ids(e.transito))
    chk('real: historial de transferencias sin el robot en el origen', !ids(e.transferencias).includes('h2'), ids(e.transferencias))
    chk('real: historial de transferencias sin el robot en el destino', !ids(e.transferencias).includes('h3'), ids(e.transferencias))
    chk('real: historial de transferencias conserva la real', ids(e.transferencias).includes('h1'), ids(e.transferencias))

    // Los CHIPS dibujados, que es lo que se ve.
    const html = id => sb.document.getElementById(id).innerHTML
    chk('real: chips de stock no dicen "Pruebas (robot)"', html('chips-unidad-stock').includes('Dolce Pasta') && !html('chips-unidad-stock').includes('robot'), html('chips-unidad-stock'))
    chk('real: chips de recuento no dicen "Pruebas (robot)"', html('chips-unidad-recuento').includes('Dolce Pasta') && !html('chips-unidad-recuento').includes('robot'), html('chips-unidad-recuento'))
    chk('real: chips de historial no dicen "Pruebas (robot)"', html('chips-unidad-historial').includes('Dolce Pasta') && !html('chips-unidad-historial').includes('robot'), html('chips-unidad-historial'))
    chk('real: chips de mermas no dicen "Pruebas (robot)"', html('chips-unidad-mermas').includes('Dolce Pasta') && !html('chips-unidad-mermas').includes('robot'), html('chips-unidad-mermas'))
  }

  // ── Si el filtro deja UNA sola unidad: el mismo comportamiento de siempre ─
  {
    const sb = nuevo(FAB_REAL)
    sb.__setDatos({
      v_mis_unidades_stock: [UNIDADES[0], UNIDADES[1]],
      v_mis_unidades_ajuste: [UNIDADES[1], UNIDADES[0]],
      v_stock_insumos: [],
    })
    await sb.cargarStock()
    await sb.cargarUnidadesRecuento()
    const e = sb.estado
    chk('una sola unidad real: se elige sola en stock', e.unidadStock === REAL1, e.unidadStock)
    chk('una sola unidad real: los chips de stock no se dibujan', sb.document.getElementById('chips-unidad-stock').hidden === true)
    chk('una sola unidad real: el recuento arranca en la real y no en el robot', e.unidadRecuento === REAL1, e.unidadRecuento)
    chk('una sola unidad real: los chips de recuento no se dibujan', sb.document.getElementById('chips-unidad-recuento').hidden === true)
  }

  // ── Cuenta DE PRUEBA: sí ve su unidad ──────────────────────────────────
  {
    const sb = nuevo(FAB_PRUEBA)
    await cargarTodo(sb)
    const e = sb.estado
    chk('prueba: ve su unidad en stock', ids(e.unidadesStock).includes(ROBOT))
    chk('prueba: ve sus filas de stock', e.stock.length === 2)
    chk('prueba: ve su unidad en recuento', ids(e.unidadesAjuste).includes(ROBOT))
    chk('prueba: ve su historial de recuentos', e.recuentos.length === 2)
    chk('prueba: ve sus mermas', e.mermas.length === 2)
    chk('prueba: ve su unidad en baja', ids(e.unidadesBaja).includes(ROBOT))
    chk('prueba: ve su unidad en envío', ids(e.unidadesEnvio).includes(ROBOT))
    chk('prueba: ve su unidad en destinos', ids(e.destinos).includes(ROBOT))
    chk('prueba: ve el tránsito del robot', ids(e.transito).includes('t2') && ids(e.transito).includes('t3'), ids(e.transito))
    chk('prueba: ve el historial del robot', e.transferencias.length === 3, ids(e.transferencias))
    chk('prueba: los chips dicen "Pruebas (robot)"', sb.document.getElementById('chips-unidad-stock').innerHTML.includes('Pruebas (robot)'))
  }

  // ── Sin datos de la fábrica: no se saca nada ───────────────────────────
  {
    const sb = nuevo('sin')
    await cargarTodo(sb)
    const e = sb.estado
    chk('sin datos: no saca nada de stock', e.unidadesStock.length === 3 && e.stock.length === 2)
    chk('sin datos: no saca nada de recuento/historial/mermas', e.unidadesAjuste.length === 3 && e.recuentos.length === 2 && e.mermas.length === 2)
    chk('sin datos: no saca nada de baja/envío/destinos', e.unidadesBaja.length === 3 && e.unidadesEnvio.length === 3 && e.destinos.length === 3)
    chk('sin datos: no saca nada del tránsito', e.transito.length === 3 && e.transferencias.length === 3)
  }

  // ── El cableado de init(), que no se puede ejecutar entero ─────────────
  const init = extraerFn(FUENTE.slice(FUENTE.indexOf('<script type="module">')), 'init')
  const iFab = init.indexOf('const fabricaP = cargarFabricaDePruebas(supabase)')
  const iAsig = init.indexOf('estado.fabrica = await fabricaP')
  const iEmp = init.indexOf(".from('empleados')")
  const iVista = init.indexOf('mostrarVista(desdeUrl ?? vistas[0])')
  const iCargas = init.indexOf('await Promise.all([')
  chk('init carga la fábrica', iFab !== -1)
  chk('init la carga ANTES de consultar empleados (en paralelo)', iFab !== -1 && iEmp !== -1 && iFab < iEmp)
  chk('init la guarda en el estado', iAsig !== -1)
  chk('init la guarda ANTES de mostrar la vista y de las cargas',
    iAsig !== -1 && iVista !== -1 && iCargas !== -1 && iAsig < iVista && iAsig < iCargas)
  // El doble de supabase ignora el .select(), así que que la columna llegue
  // solo se puede afirmar sobre el texto de la consulta.
  const transito = extraerFn(FUENTE.slice(FUENTE.indexOf('<script type="module">')), 'cargarTransito')
  const selHist = transito.slice(transito.indexOf("from('v_transferencias')"))
  chk('v_transferencias trae unidad_origen_id y unidad_destino_id (el filtro las necesita)',
    /\.select\('[^']*\bunidad_origen_id\b[^']*\bunidad_destino_id\b/.test(selHist))
  chk('el estado arranca en FABRICA_SIN_DATOS', /fabrica: FABRICA_SIN_DATOS,/.test(FUENTE))
  chk('se importan los helpers de utils.js',
    /import \{[^}]*cargarFabricaDePruebas, sinUnidadesDePrueba, FABRICA_SIN_DATOS[^}]*\} from '\.\.\/js\/utils\.js'/.test(FUENTE))

  if (fallas.length) {
    console.log(`FALLAS (${fallas.length}):`)
    for (const f of fallas) console.log('  ✗ ' + f)
    console.log(`${ok}/${ok + fallas.length}`)
    process.exit(1)
  }
  console.log(`${ok}/${ok} verde`)
})().catch(e => { console.log('EXCEPCIÓN:', e && e.stack || e); process.exit(1) })
