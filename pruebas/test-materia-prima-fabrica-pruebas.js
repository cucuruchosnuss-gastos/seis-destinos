// La FÁBRICA DE PRUEBAS en modulos/materia-prima.html (26/09/2026): la unidad
// "Pruebas (robot)" no puede aparecer para una cuenta real en ninguna lista de
// UNIDADES del módulo. Las listas que se tocaron:
//   · los chips de unidad del listado       (renderizarChipsUnidadIngresos)
//   · el selector de unidad del wizard       (poblarSelectUnidades)
//   · la preselección con una sola unidad    (abrirWizard)
//   · v_mis_unidades_stock → transferencias recibidas y el aviso del pie
//   · v_mis_unidades_recepcion → botón, lista y agrupado de Ingresos internos
// PERSONAS: el módulo no tiene ninguna lista de personas elegibles; los nombres
// (cargado por / recibido por) se resuelven por id y NO se filtran.
//
// Se EJECUTA el código real del módulo con los helpers REALES de js/utils.js.
//
//   node pruebas/test-materia-prima-fabrica-pruebas.js

const fs = require('fs')
const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Los helpers REALES de utils.js (sin el `export`), no una copia.
const UTILS = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8').replace(/^export /gm, '')
const mFab = /const FABRICA_SIN_DATOS = [^\n]+/.exec(UTILS)
const HELPERS = mFab[0].replace(/^const/, 'var') + '\n' +
  extraerFn(UTILS, 'sinUnidadesDePrueba') + '\n' + extraerFn(UTILS, 'sinPersonasDePrueba') + '\n'

const PRUEBA = 'u-robot', CUCU = 'u-cucu', DOLCE = 'u-dolce'
const UNIDADES = [
  { id: CUCU, nombre: 'Cucuruchos Nuss' },
  { id: DOLCE, nombre: 'Dolce Pasta' },
  { id: PRUEBA, nombre: 'Pruebas (robot)' },
]
const REAL = { ok: true, unidades: new Set([PRUEBA]), personas: new Set(['p-robot']), soyDePrueba: false }
const DE_PRUEBA = { ok: true, unidades: new Set([PRUEBA]), personas: new Set(['p-robot']), soyDePrueba: true }

const PRELUDIO = HELPERS + `
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', hidden: true, value: '', dataset: {},
      removeAttribute(a) { if (a === 'hidden') el.hidden = false },
      querySelectorAll() { return [] }, classList: { toggle() {} } }
    return el
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var console = { error() {}, log() {}, warn() {} }
  var __tablas = {}
  var supabase = { from(t) { const r = { select() { return r }, order() { return r }, eq() { return r },
    then(res, rej) { return Promise.resolve({ data: __tablas[t] ?? [], error: null }).then(res, rej) } }; return r } }
  var estado = { unidades: [], fabrica: FABRICA_SIN_DATOS, filtros: { ingresos: { unidadId: '' } },
    unidadesStockVisibles: [], unidadesRecepcion: [], listaIngresos: [], transito: [], wizard: null }
  function renderizarListaIngresos() {}
  function wizardVacio() { return { encabezado: { unidadId: '' } } }
  function renderizarTogglesTipoDoc() {} function resetearPaso1() {} function renderizarAvisoDesdeGasto() {}
  function irAPasoWz() {} async function cargarCatalogoInsumos() {} async function cargarProveedores() {}
  function htmlFilaInterno(x) { return '<fila ' + x.id + '>' }
  function abrirDetalleInterno() {}
`

const FUNCIONES = ['esc', 'unidadesParaElegir', 'nombreUnidad', 'renderizarChipsUnidadIngresos', 'poblarSelectUnidades',
  'abrirWizard', 'cargarUnidadesStockVisibles', 'cargarUnidadesRecepcion', 'cargarTransferenciasRecibidas',
  'renderizarAvisoSinStock', 'renderizarInternos']

function nuevo(fabrica, unidades = UNIDADES) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES,
    retorno: 'estado, __el(id){ return document.getElementById(id) }, __tabla(t, d){ __tablas[t] = d }, FABRICA_SIN_DATOS',
  })
  S.estado.unidades = unidades
  S.estado.fabrica = fabrica === undefined ? S.FABRICA_SIN_DATOS : fabrica
  return S
}

let S0
try { S0 = nuevo() } catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  fin()
  return
}

const casos = [
  ['real', REAL, false],
  ['de prueba', DE_PRUEBA, true],
  ['sin datos', undefined, true],
]

// ── Chips de unidad del listado ───────────────────────────────────────────
for (const [nombre, fab, ve] of casos) {
  const S = nuevo(fab)
  S.renderizarChipsUnidadIngresos()
  const html = S.__el('chips-unidad-ingresos').innerHTML
  chk(`chips (${nombre}): Cucuruchos está`, html.includes('Cucuruchos Nuss'))
  chk(`chips (${nombre}): la unidad de prueba ${ve ? 'SÍ' : 'NO'} aparece`, html.includes('Pruebas (robot)') === ve)
}

// ── Selector de unidad del wizard ────────────────────────────────────────
for (const [nombre, fab, ve] of casos) {
  const S = nuevo(fab)
  S.estado.wizard = { encabezado: { unidadId: '' } }
  S.poblarSelectUnidades()
  const html = S.__el('campo-unidad-negocio').innerHTML
  chk(`selector (${nombre}): Dolce está`, html.includes('Dolce Pasta'))
  chk(`selector (${nombre}): la unidad de prueba ${ve ? 'SÍ' : 'NO'} aparece`, html.includes(PRUEBA) === ve)
}

// nombreUnidad resuelve por id aunque sea de prueba (no se filtra).
chk('nombreUnidad resuelve la unidad de prueba por id (cuenta real)', nuevo(REAL).nombreUnidad(PRUEBA) === 'Pruebas (robot)')
chk('estado.unidades no se filtra en el lugar', (() => { const S = nuevo(REAL); S.unidadesParaElegir(); return S.estado.unidades.length === 3 })())

esperas.push((async () => {
  // ── Una sola unidad real + la de prueba: se preselecciona igual ────────
  {
    const S = nuevo(REAL, [UNIDADES[0], UNIDADES[2]])
    await S.abrirWizard()
    chk('wizard (real, 1 unidad + robot): se preselecciona la real', S.estado.wizard.encabezado.unidadId === CUCU, S.estado.wizard.encabezado.unidadId)
    const S2 = nuevo(DE_PRUEBA, [UNIDADES[0], UNIDADES[2]])
    await S2.abrirWizard()
    chk('wizard (de prueba, 2 unidades): no preselecciona', S2.estado.wizard.encabezado.unidadId === '')
    const S3 = nuevo(undefined, [UNIDADES[0], UNIDADES[2]])
    await S3.abrirWizard()
    chk('wizard (sin datos, 2 unidades): no preselecciona', S3.estado.wizard.encabezado.unidadId === '')
  }

  // ── v_mis_unidades_stock → transferencias recibidas ────────────────────
  for (const [nombre, fab, ve] of casos) {
    const S = nuevo(fab)
    S.__tabla('v_mis_unidades_stock', UNIDADES.map(u => ({ ...u })))
    S.__tabla('stock_transferencias', [
      { id: 't-real', unidad_destino_id: CUCU }, { id: 't-robot', unidad_destino_id: PRUEBA }])
    await S.cargarUnidadesStockVisibles()
    chk(`stock visibles (${nombre}): la unidad de prueba ${ve ? 'SÍ' : 'NO'} está`, S.estado.unidadesStockVisibles.some(u => u.id === PRUEBA) === ve)
    await S.cargarTransferenciasRecibidas()
    const ids = S.estado.transferenciasRecibidas.map(t => t.id)
    chk(`transferencias (${nombre}): la real está`, ids.includes('t-real'))
    chk(`transferencias (${nombre}): la del robot ${ve ? 'SÍ' : 'NO'} está`, ids.includes('t-robot') === ve)
  }

  // ── Aviso del pie: un ingreso del robot no dispara un aviso falso ──────
  {
    const S = nuevo(REAL)
    S.__tabla('v_mis_unidades_stock', UNIDADES.map(u => ({ ...u })))
    await S.cargarUnidadesStockVisibles()
    S.estado.listaIngresos = [{ unidad_negocio_id: CUCU }, { unidad_negocio_id: PRUEBA }]
    S.renderizarAvisoSinStock()
    chk('aviso (real): sin aviso falso por la unidad de prueba', S.__el('aviso-sin-stock').hidden === true, S.__el('aviso-sin-stock').textContent)
    const S2 = nuevo(REAL)
    S2.__tabla('v_mis_unidades_stock', [{ id: CUCU, nombre: 'Cucuruchos Nuss' }])
    await S2.cargarUnidadesStockVisibles()
    S2.estado.listaIngresos = [{ unidad_negocio_id: DOLCE }]
    S2.renderizarAvisoSinStock()
    chk('aviso (real): una unidad real sin permiso sí avisa', S2.__el('aviso-sin-stock').hidden === false)
  }

  // ── v_mis_unidades_recepcion → Ingresos internos ───────────────────────
  for (const [nombre, fab, ve] of casos) {
    const S = nuevo(fab)
    S.__tabla('v_mis_unidades_recepcion', [{ id: CUCU, nombre: 'Cucuruchos Nuss' }, { id: PRUEBA, nombre: 'Pruebas (robot)' }])
    await S.cargarUnidadesRecepcion()
    chk(`recepción (${nombre}): la unidad de prueba ${ve ? 'SÍ' : 'NO'} está`, S.estado.unidadesRecepcion.some(u => u.id === PRUEBA) === ve)
    // Con una sola real por el filtro, NO se agrupa (igual que con una sola unidad).
    S.estado.transito = [{ id: 't1', destino_nombre: 'Cucuruchos Nuss' }]
    S.renderizarInternos()
    const html = S.__el('lista-internos').innerHTML
    chk(`internos (${nombre}): ${ve ? 'agrupa' : 'no agrupa'}`, html.includes('int-grupo') === ve)
  }
})())

// ── El init carga la fábrica y la espera antes de dibujar unidades ────────
{
  const init = extraerFn(SCRIPT, 'init')
  const iCarga = init.indexOf('cargarFabricaDePruebas(supabase)')
  const iEmp = init.indexOf(".from('empleados')")
  const iAsig = init.indexOf('estado.fabrica = await fabricaPrometida')
  const iChips = init.indexOf('renderizarChipsUnidadIngresos()')
  const iRec = init.indexOf('await cargarUnidadesRecepcion()')
  const iIng = init.indexOf('await cargarIngresos()')
  chk('init: existen la carga, la asignación y los renders', [iCarga, iEmp, iAsig, iChips, iRec, iIng].every(i => i >= 0))
  chk('init: la fábrica se pide antes que el empleado (en paralelo)', iCarga >= 0 && iEmp >= 0 && iCarga < iEmp)
  chk('init: se asigna antes de dibujar los chips', iAsig >= 0 && iChips >= 0 && iAsig < iChips)
  chk('init: se asigna antes de cargar recepción e ingresos', iAsig >= 0 && iAsig < iRec && iAsig < iIng)
  chk('import: cargarFabricaDePruebas y sinUnidadesDePrueba desde utils.js',
    /import \{[^}]*cargarFabricaDePruebas[^}]*\} from '\.\.\/js\/utils\.js'/.test(SCRIPT) &&
    /import \{[^}]*sinUnidadesDePrueba[^}]*\} from '\.\.\/js\/utils\.js'/.test(SCRIPT))
}

fin()
