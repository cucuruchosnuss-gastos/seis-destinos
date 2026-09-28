// LA BARRA DE UNIDAD en modulos/materia-prima.html (Ingreso, 28/09/2026).
//
// Facu elige la fábrica UNA vez, arriba (js/barra-unidad.js), y el módulo
// muestra solo lo de esa fábrica:
//   · los chips de unidad del listado se RETIRARON (los reemplaza la barra);
//     el filtro de vínculo con remito queda;
//   · el listado, el banner de cifras, "Pagado sin ingresar", "Facturas por
//     ingresar", "Ingresos internos" y las transferencias recibidas se filtran
//     por la unidad elegida; con "Todas" se ve todo, con el detalle por unidad;
//   · lo que no tiene unidad (un gasto, una factura) se ve siempre, marcado
//     "Sin unidad";
//   · el wizard sigue pidiendo la unidad del ingreso nuevo, y viene con la de
//     la barra puesta si la persona puede cargar ahí; con "Todas", la pide;
//   · cambiar la barra repinta sin recargar;
//   · la burbuja de "Ingresos internos" (mis_pendientes, sin unidad) lo dice.
//
// Se EJECUTA el código real del módulo (y pasaFiltroUnidad / filtrarPorUnidad
// reales de js/barra-unidad.js, que llegan por el import) con un DOM falso.
//
//   node pruebas/test-materia-prima-barra-unidad.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-materia-prima-barra-unidad.js

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

// El commit de antes de la barra en este módulo: ahí estaban los chips.
const BASE = '5592f5a'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', MENGUI = 'u-mengui'
const UNIDADES = [
  { id: NUSS, nombre: 'Cucuruchos Nuss' },
  { id: DOLCE, nombre: 'Dolce Pasta' },
  { id: MENGUI, nombre: 'Mengui' },
]

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', hidden: true, disabled: false, dataset: {},
      querySelector: () => null, querySelectorAll: () => [],
      removeAttribute(k) { if (k === 'hidden') this.hidden = false },
      addEventListener() {}, classList: { add(){}, remove(){}, toggle(){} },
    }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var window = { scrollTo(){} }
  var console = { error() {}, log() {}, warn() {} }
  var __pintadas = 0
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  function wizardVacio() { return { encabezado: { unidadId: '' } } }
  function renderizarTogglesTipoDoc() {} function resetearPaso1() {} function renderizarAvisoDesdeGasto() {}
  function irAPasoWz() {} async function cargarCatalogoInsumos() {} async function cargarProveedores() {}
  function abrirDetalleInterno() {} function abrirDetalleIngreso() {} function abrirCompletarIngreso() {}
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(['materia_prima:cargar']), alcances: new Map(),
    unidades: [], fabrica: FABRICA_SIN_DATOS, entregas: [], listaIngresos: [], remitosFacturados: new Set(),
    facturasConRemito: new Set(), filtros: { ingresos: { busqueda: '', vinculo: '' } },
    barra: { elegida: null, mostrar: false, unidades: [] }, listadoCargado: false,
    unidadesStockVisibles: [], unidadesRecepcion: [], transito: [],
    pagadoSinIngresar: [], errorPagadoSinIngresar: null, descarte: { gastoId: null, texto: '', error: null },
    porIngresar: [], errorPorIngresar: null, cargandoPorIngresar: false, porIngresarError: null,
    pendientes: null, wizard: null,
  }
`

const FUNCIONES = [
  'esc', 'tieneTarea', 'puedeCargarEn', 'aplicarBarraUnidad', 'repintarPorUnidad', 'textoOtrasUnidades',
  'unidadesParaElegir', 'nombreUnidad', 'inicialesEmpresa',
  'renderizarBannerIngresos', 'renderizarAvisoSinStock', 'renderizarListaIngresos',
  'entregaPasaVinculo', 'entregaCoincide', 'ordenarEntregasParaFiltro', 'textoAntiguedad', 'diasDesde',
  'chipTipoDoc', 'faltanRenglones', 'htmlFaltanRenglones',
  'formatearImporteDuplicado', 'importeConMoneda', 'htmlPagadoSinIngresar', 'renderizarPagadoSinIngresar',
  'normalizarRazonSocial', 'claveNumeroDocMp', 'nombresPorIngresar', 'nombresIngreso', 'marcasPorIngresar',
  'filasPorIngresarVisibles', 'renderizarAccesoPorIngresar', 'htmlPorIngresar', 'renderizarPorIngresar',
  'renderizarInternos', 'htmlFilaInterno', 'formatearFechaTransito',
  'textoPendienteMp', 'htmlBurbujaMp', 'pintarPendientesMp',
  'abrirWizard', 'poblarSelectUnidades',
  // De js/barra-unidad.js, por el import (el código REAL).
  'pasaFiltroUnidad', 'filtrarPorUnidad',
]
const CONSTANTES = ['DIAS_REMITO_VIEJO', 'VACIO_POR_VINCULO', 'TIPOS_DOC', 'FILTROS_VINCULO', 'puedeCargarMp',
  'puedeDescartarIngreso', 'AVISO_POR_INGRESAR', 'ETIQUETA_ORIGEN_POR_INGRESAR', 'DIAS_TRANSITO_VIEJO_REC']

function nuevo() {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: 'estado, __el(id){ return document.getElementById(id) }',
  })
  S.estado.unidades = UNIDADES.map(u => ({ ...u }))
  return S
}

let S0
try { S0 = nuevo() } catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  fin()
  return
}

const hoy = new Date()
const MES = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
const entrega = (id, unidad, razon, extra = {}) => ({
  base: { id, fecha: `${MES}-05`, created_at: `${MES}-05T10:00:00Z`, razon_social: razon, unidad_negocio_id: unidad, itemsQueSuman: 1 },
  comprobantes: [{ id, tipo_doc: 'remito' }], remitosVinculados: [], cantidadItems: 2, ...extra,
})
const ENTREGAS = () => [
  entrega('i-nuss-1', NUSS, 'Molino Nuss'),
  entrega('i-nuss-2', NUSS, 'Cartonera Nuss'),
  entrega('i-dolce-1', DOLCE, 'Harinera Dolce'),
  // Una transferencia recibida: su unidad es el DESTINO.
  { ...entrega('t-mengui', MENGUI, 'Cucuruchos Nuss'), comprobantes: [], esTransferencia: true },
]

function conBarra(S, elegida, mostrar = true) {
  S.estado.barra = { elegida, mostrar, unidades: UNIDADES.map(u => ({ ...u })) }
}

// ══════════════════════════════════════════════════════════════════════════
// 1. El selector viejo ya no está (y sí estaba en el commit de antes)
// ══════════════════════════════════════════════════════════════════════════
{
  let antes = ''
  try { antes = execFileSync('git', ['show', `${BASE}:modulos/materia-prima.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) } catch { antes = '' }
  chk(`en ${BASE} estaban los chips de unidad (el baseline es el correcto)`, antes.includes('id="chips-unidad-ingresos"') && antes.includes('function renderizarChipsUnidadIngresos'))
  chk('ya no está el contenedor #chips-unidad-ingresos', !FUENTE.includes('id="chips-unidad-ingresos"'))
  chk('ya no está renderizarChipsUnidadIngresos', !/function renderizarChipsUnidadIngresos\b/.test(SCRIPT))
  chk('el filtro de vínculo con remito sigue', FUENTE.includes('id="chips-vinculo-ingresos"') && /function renderizarChipsVinculoIngresos\b/.test(SCRIPT))
  chk('el estado ya no guarda una unidad propia en los filtros', !/ingresos:\s*\{[^}]*unidadId/.test(extraerFn(SCRIPT, 'init') + SCRIPT.slice(SCRIPT.indexOf('const estado = {'), SCRIPT.indexOf('const estado = {') + 1500)))
  chk('el módulo importa la barra de unidad', /import \{[^}]*unidadesDeLaBarra[^}]*alCambiarUnidad[^}]*filtrarPorUnidad[^}]*\} from '\.\.\/js\/barra-unidad\.js'/.test(SCRIPT))
  chk('la página carga js/barra-unidad.js', /<script type="module" src="\.\.\/js\/barra-unidad\.js"><\/script>/.test(FUENTE))
}

// ══════════════════════════════════════════════════════════════════════════
// 2. El listado
// ══════════════════════════════════════════════════════════════════════════
{
  // Todas: todo, con el nombre de la unidad en cada fila.
  const S = nuevo()
  S.estado.entregas = ENTREGAS()
  conBarra(S, null)
  S.renderizarListaIngresos()
  const html = S.__el('lista-ingresos').innerHTML
  chk('Todas: están las cuatro filas', ['i-nuss-1', 'i-nuss-2', 'i-dolce-1', 't-mengui'].every(id => html.includes(`data-ingreso="${id}"`)))
  chk('Todas: cada fila dice su unidad', html.includes('Cucuruchos Nuss') && html.includes('Dolce Pasta') && html.includes('Mengui'))

  // Una unidad: solo lo suyo.
  conBarra(S, NUSS)
  S.renderizarListaIngresos()
  const h2 = S.__el('lista-ingresos').innerHTML
  chk('Nuss: están las dos de Nuss', h2.includes('data-ingreso="i-nuss-1"') && h2.includes('data-ingreso="i-nuss-2"'))
  chk('Nuss: no está la de Dolce', !h2.includes('data-ingreso="i-dolce-1"'))
  chk('Nuss: no está la transferencia recibida en Mengui', !h2.includes('data-ingreso="t-mengui"'))

  // Mengui: la transferencia (destino) sí.
  conBarra(S, MENGUI)
  S.renderizarListaIngresos()
  const h3 = S.__el('lista-ingresos').innerHTML
  chk('Mengui: la transferencia recibida se filtra por el DESTINO', h3.includes('data-ingreso="t-mengui"') && !h3.includes('data-ingreso="i-nuss-1"'))

  // Un filtro viejo de unidad en el estado ya no filtra nada.
  const S2 = nuevo()
  S2.estado.entregas = ENTREGAS()
  S2.estado.filtros.ingresos.unidadId = DOLCE
  conBarra(S2, null)
  S2.renderizarListaIngresos()
  chk('un unidadId viejo en los filtros NO filtra (lo decide la barra)', S2.__el('lista-ingresos').innerHTML.includes('data-ingreso="i-nuss-1"'))

  // El filtro de vínculo se encadena con la barra.
  const S3 = nuevo()
  S3.estado.entregas = ENTREGAS()
  conBarra(S3, NUSS)
  S3.estado.filtros.ingresos.busqueda = 'cartonera'
  S3.renderizarListaIngresos()
  const h4 = S3.__el('lista-ingresos').innerHTML
  chk('buscador + barra se encadenan', h4.includes('data-ingreso="i-nuss-2"') && !h4.includes('data-ingreso="i-nuss-1"'))

  // Vacío por la barra: dice cuántos hay en otras unidades.
  const S4 = nuevo()
  S4.estado.entregas = ENTREGAS().filter(e => e.base.unidad_negocio_id !== MENGUI)
  conBarra(S4, MENGUI)
  S4.renderizarListaIngresos()
  const desc = S4.__el('vacio-ingresos-desc').textContent
  chk('vacío por la barra: se muestra el vacío', S4.__el('estado-vacio-ingresos').hidden === false && S4.__el('lista-ingresos').innerHTML === '')
  chk('vacío por la barra: dice cuántos hay en otras unidades', /Hay 3 ingresos en otras unidades/.test(desc) && /«Todas»/.test(desc), desc)
  // Con Todas y nada: no dice "otras unidades".
  const S5 = nuevo()
  conBarra(S5, null)
  S5.renderizarListaIngresos()
  chk('vacío con Todas: no nombra otras unidades', !/otras unidades/.test(S5.__el('vacio-ingresos-desc').textContent))
  // Con una unidad y todo lo que hay es de ella pero no pasa el buscador: no inventa "otras".
  const S6 = nuevo()
  S6.estado.entregas = ENTREGAS()
  conBarra(S6, NUSS)
  S6.estado.filtros.ingresos.busqueda = 'zzz-nada'
  S6.renderizarListaIngresos()
  chk('vacío por el buscador: no culpa a la barra', !/otras unidades/.test(S6.__el('vacio-ingresos-desc').textContent))
}

// ══════════════════════════════════════════════════════════════════════════
// 3. El banner cuenta lo que se ve, y con Todas el detalle por unidad
// ══════════════════════════════════════════════════════════════════════════
{
  const S = nuevo()
  S.estado.entregas = ENTREGAS()
  conBarra(S, null)
  S.renderizarBannerIngresos()
  chk('Todas: el banner cuenta las 4', S.__el('banner-ingresos-mes').textContent === 4)
  chk('Todas: los ítems suman los de las 4', S.__el('banner-items-mes').textContent === 8)
  const det = S.__el('banner-por-unidad')
  chk('Todas: se muestra el detalle por unidad', det.hidden === false)
  chk('Todas: el detalle nombra cada unidad con su número', /Cucuruchos Nuss <strong>2<\/strong>/.test(det.innerHTML) && /Dolce Pasta <strong>1<\/strong>/.test(det.innerHTML) && /Mengui <strong>1<\/strong>/.test(det.innerHTML), det.innerHTML)
  chk('Todas: el de más ingresos va primero', det.innerHTML.indexOf('Cucuruchos Nuss') < det.innerHTML.indexOf('Dolce Pasta'))

  conBarra(S, NUSS)
  S.renderizarBannerIngresos()
  chk('Nuss: el banner cuenta solo las 2 de Nuss', S.__el('banner-ingresos-mes').textContent === 2)
  chk('Nuss: ítems solo de Nuss', S.__el('banner-items-mes').textContent === 4)
  chk('Nuss: sin detalle por unidad', det.hidden === true && det.innerHTML === '')

  // Sin barra (una sola unidad): no hay detalle aunque haya varias en los datos.
  const S2 = nuevo()
  S2.estado.entregas = ENTREGAS()
  conBarra(S2, null, false)
  S2.renderizarBannerIngresos()
  chk('sin barra: no hay detalle por unidad', S2.__el('banner-por-unidad').hidden === true)
  chk('sin barra: cuenta todo', S2.__el('banner-ingresos-mes').textContent === 4)

  // Todas con una sola unidad en el mes: tampoco (un detalle de uno no dice nada).
  const S3 = nuevo()
  S3.estado.entregas = ENTREGAS().filter(e => e.base.unidad_negocio_id === NUSS)
  conBarra(S3, null)
  S3.renderizarBannerIngresos()
  chk('Todas con una sola unidad en el mes: sin detalle', S3.__el('banner-por-unidad').hidden === true)
}

// ══════════════════════════════════════════════════════════════════════════
// 4. El aviso de stock (unidades sin stock:ver) sigue, por la unidad que se mira
// ══════════════════════════════════════════════════════════════════════════
{
  const S = nuevo()
  S.estado.unidadesStockVisibles = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }]
  S.estado.listaIngresos = [{ unidad_negocio_id: NUSS }, { unidad_negocio_id: DOLCE }]
  conBarra(S, null)
  S.renderizarAvisoSinStock()
  chk('Todas: avisa por Dolce (sin stock:ver)', S.__el('aviso-sin-stock').hidden === false && /Dolce Pasta/.test(S.__el('aviso-sin-stock').textContent))
  conBarra(S, NUSS)
  S.renderizarAvisoSinStock()
  chk('Nuss (con stock:ver): no avisa por Dolce, que no se está mirando', S.__el('aviso-sin-stock').hidden === true)
  conBarra(S, DOLCE)
  S.renderizarAvisoSinStock()
  chk('Dolce (sin stock:ver): avisa', S.__el('aviso-sin-stock').hidden === false)
}

// ══════════════════════════════════════════════════════════════════════════
// 5. "Pagado sin ingresar": filtra, y lo sin unidad se ve siempre y lo dice
// ══════════════════════════════════════════════════════════════════════════
const PAGADOS = [
  { gasto_id: 'g-nuss', fecha: `${MES}-02`, razon_social: 'Molino', numero_doc: '1-10', importe: 1000, moneda: 'ARS', unidad_negocio_id: NUSS },
  { gasto_id: 'g-dolce', fecha: `${MES}-02`, razon_social: 'Harinera', numero_doc: '1-11', importe: 2000, moneda: 'ARS', unidad_negocio_id: DOLCE },
  { gasto_id: 'g-sin', fecha: `${MES}-02`, razon_social: 'Sin empresa SA', numero_doc: '1-12', importe: 3000, moneda: 'ARS', unidad_negocio_id: null },
]
{
  const S = nuevo()
  S.estado.pagadoSinIngresar = PAGADOS.map(f => ({ ...f }))
  conBarra(S, null)
  S.renderizarPagadoSinIngresar()
  const h = S.__el('lista-pagado-sin-ingresar').innerHTML
  chk('Todas: las tres filas', ['g-nuss', 'g-dolce', 'g-sin'].every(id => h.includes(`data-gasto="${id}"`)))
  chk('Todas: el título cuenta 3', S.__el('pagado-sin-ingresar-titulo').textContent === 'Pagado sin ingresar (3)')
  chk('la fila sin unidad dice "Sin unidad"', /data-gasto="g-sin"[\s\S]*?Sin unidad/.test(h))
  chk('la fila con unidad dice su unidad', /data-gasto="g-dolce"[\s\S]*?Dolce Pasta/.test(h))

  conBarra(S, NUSS)
  S.renderizarPagadoSinIngresar()
  const h2 = S.__el('lista-pagado-sin-ingresar').innerHTML
  chk('Nuss: la de Nuss', h2.includes('data-gasto="g-nuss"'))
  chk('Nuss: no la de Dolce', !h2.includes('data-gasto="g-dolce"'))
  chk('Nuss: la sin unidad se ve igual', h2.includes('data-gasto="g-sin"'))
  chk('Nuss: el título cuenta lo que se ve (2)', S.__el('pagado-sin-ingresar-titulo').textContent === 'Pagado sin ingresar (2)')

  // Todo en otra unidad: la sección se esconde.
  const S2 = nuevo()
  S2.estado.pagadoSinIngresar = [PAGADOS[1]]
  conBarra(S2, NUSS)
  S2.renderizarPagadoSinIngresar()
  chk('solo pendientes de otra unidad: la sección se esconde', S2.__el('seccion-pagado-sin-ingresar').hidden === true)
}

// ══════════════════════════════════════════════════════════════════════════
// 6. "Facturas por ingresar"
// ══════════════════════════════════════════════════════════════════════════
const POR_INGRESAR = [
  { origen: 'factura', id: 'f-nuss', fecha: `${MES}-03`, proveedor: 'Molino SA', razon_social: 'Molino SA', tipo_doc: 'Factura A', numero_doc: '0001-00000010', importe: 1000, moneda: 'ARS', unidad_negocio_id: NUSS, unidad: 'Cucuruchos Nuss' },
  { origen: 'factura', id: 'f-dolce', fecha: `${MES}-03`, proveedor: 'Harinera SA', razon_social: 'Harinera SA', tipo_doc: 'Factura A', numero_doc: '0001-00000011', importe: 2000, moneda: 'ARS', unidad_negocio_id: DOLCE, unidad: 'Dolce Pasta' },
  { origen: 'factura', id: 'f-sin', fecha: `${MES}-03`, proveedor: 'Suelta SA', razon_social: 'Suelta SA', tipo_doc: 'Factura A', numero_doc: '0001-00000012', importe: 3000, moneda: 'ARS', unidad_negocio_id: null, unidad: null },
  // La gemela de f-nuss en OTRA unidad (no pasa, pero el aviso no se pierde).
  { origen: 'gasto', id: 'g-gemela', fecha: `${MES}-03`, proveedor: 'Molino SA', razon_social: 'Molino SA', tipo_doc: 'Factura A', numero_doc: '1-10', importe: 1000, moneda: 'ARS', unidad_negocio_id: DOLCE, unidad: 'Dolce Pasta' },
]
{
  const S = nuevo()
  S.estado.porIngresar = POR_INGRESAR.map(f => ({ ...f }))
  conBarra(S, null)
  chk('Todas: las 4 visibles', S.filasPorIngresarVisibles().length === 4)
  S.renderizarAccesoPorIngresar()
  chk('Todas: el botón cuenta 4', S.__el('btn-abrir-por-ingresar').textContent === 'Facturas por ingresar (4)')
  S.renderizarPorIngresar()
  const h = S.__el('lista-por-ingresar').innerHTML
  chk('la factura sin unidad dice "Sin unidad"', /data-comprobante="f-sin"[\s\S]*?Sin unidad/.test(h))

  conBarra(S, NUSS)
  const vis = S.filasPorIngresarVisibles().map(f => f.id)
  chk('Nuss: la de Nuss y la sin unidad', vis.includes('f-nuss') && vis.includes('f-sin'))
  chk('Nuss: no las de Dolce', !vis.includes('f-dolce') && !vis.includes('g-gemela'))
  chk('todasLasUnidades ignora la barra', S.filasPorIngresarVisibles({ todasLasUnidades: true }).length === 4)
  S.renderizarAccesoPorIngresar()
  chk('Nuss: el botón cuenta lo que se ve (2)', S.__el('btn-abrir-por-ingresar').textContent === 'Facturas por ingresar (2)')
  S.renderizarPorIngresar()
  const h2 = S.__el('lista-por-ingresar').innerHTML
  chk('Nuss: la lista no trae la de Dolce', !h2.includes('data-comprobante="f-dolce"') && h2.includes('data-comprobante="f-nuss"'))
  chk('Nuss: la gemela en Dolce igual avisa sobre f-nuss', /data-comprobante="f-nuss"[\s\S]*?aparece dos veces/.test(h2))
}

// ══════════════════════════════════════════════════════════════════════════
// 7. "Ingresos internos": por el destino
// ══════════════════════════════════════════════════════════════════════════
{
  const TRANSITO = [
    { id: 'tr-nuss', unidad_destino_id: NUSS, destino_nombre: 'Cucuruchos Nuss', origen_nombre: 'Dolce Pasta', fecha: `${MES}-01`, dias_en_transito: 1, items: 2 },
    { id: 'tr-dolce', unidad_destino_id: DOLCE, destino_nombre: 'Dolce Pasta', origen_nombre: 'Cucuruchos Nuss', fecha: `${MES}-01`, dias_en_transito: 1, items: 1 },
  ]
  const S = nuevo()
  S.estado.transito = TRANSITO.map(x => ({ ...x }))
  S.estado.unidadesRecepcion = [{ id: NUSS }, { id: DOLCE }]
  conBarra(S, null)
  S.renderizarInternos()
  const h = S.__el('lista-internos').innerHTML
  chk('Todas: los dos envíos', h.includes('data-transito="tr-nuss"') && h.includes('data-transito="tr-dolce"'))
  chk('Todas: agrupado por destino', h.includes('int-grupo'))
  conBarra(S, DOLCE)
  S.renderizarInternos()
  const h2 = S.__el('lista-internos').innerHTML
  chk('Dolce: solo lo que va a Dolce', h2.includes('data-transito="tr-dolce"') && !h2.includes('data-transito="tr-nuss"'))
  chk('Dolce: sin encabezado de grupo (hay un solo destino)', !h2.includes('int-grupo'))
  conBarra(S, MENGUI)
  S.renderizarInternos()
  chk('Mengui: vacío', S.__el('internos-vacio').hidden === false && S.__el('lista-internos').innerHTML === '')
  chk('Mengui: dice que hay envíos para otras unidades', /No hay mercadería en tránsito hacia Mengui/.test(S.__el('internos-vacio-desc').textContent) && /Hay 2 envíos en otras unidades/.test(S.__el('internos-vacio-desc').textContent), S.__el('internos-vacio-desc').textContent)
  const S2 = nuevo()
  conBarra(S2, null)
  S2.renderizarInternos()
  chk('Todas y nada: el texto de siempre', S2.__el('internos-vacio-desc').textContent === 'No hay mercadería en tránsito hacia tus unidades.')
}

// ══════════════════════════════════════════════════════════════════════════
// 8. La burbuja de "Ingresos internos" cuenta todas las unidades y lo dice
// ══════════════════════════════════════════════════════════════════════════
{
  const S = nuevo()
  S.estado.pendientes = new Map([['stock:transferencias_por_aceptar', { cantidad: 3, texto: 'Transferencias por aceptar' }]])
  conBarra(S, null)
  S.pintarPendientesMp()
  const h = S.__el('btn-abrir-internos').innerHTML
  chk('Todas: burbuja sin aclaración', /title="3 transferencias por aceptar"/.test(h), h)
  conBarra(S, NUSS)
  S.pintarPendientesMp()
  const h2 = S.__el('btn-abrir-internos').innerHTML
  chk('una unidad elegida: el título dice que cuenta todas', /title="3 transferencias por aceptar \(en todas tus unidades\)"/.test(h2), h2)
  chk('una unidad elegida: el número es el de mis_pendientes (3)', />3<\/span>/.test(h2))
}

// ══════════════════════════════════════════════════════════════════════════
// 9. Cambiar la barra repinta sin recargar
// ══════════════════════════════════════════════════════════════════════════
{
  const S = nuevo()
  S.estado.entregas = ENTREGAS()
  S.estado.pagadoSinIngresar = PAGADOS.map(f => ({ ...f }))
  // Antes de que el listado esté cargado: guarda la elección y no dibuja.
  S.aplicarBarraUnidad({ elegida: NUSS, mostrar: true, unidades: UNIDADES })
  chk('antes de cargar: guarda la elección', S.estado.barra.elegida === NUSS && S.estado.barra.mostrar === true)
  chk('antes de cargar: no dibuja nada', S.__el('lista-ingresos').innerHTML === '')

  S.estado.listadoCargado = true
  S.aplicarBarraUnidad({ elegida: DOLCE, mostrar: true, unidades: UNIDADES })
  const h = S.__el('lista-ingresos').innerHTML
  chk('al cambiar: repinta el listado con Dolce', h.includes('data-ingreso="i-dolce-1"') && !h.includes('data-ingreso="i-nuss-1"'))
  chk('al cambiar: repinta el banner', S.__el('banner-ingresos-mes').textContent === 1)
  chk('al cambiar: repinta "Pagado sin ingresar"', S.__el('lista-pagado-sin-ingresar').innerHTML.includes('data-gasto="g-dolce"') && !S.__el('lista-pagado-sin-ingresar').innerHTML.includes('data-gasto="g-nuss"'))

  S.aplicarBarraUnidad({ elegida: null, mostrar: true, unidades: UNIDADES })
  chk('volver a Todas: repinta todo', S.__el('lista-ingresos').innerHTML.includes('data-ingreso="i-nuss-1"') && S.__el('banner-ingresos-mes').textContent === 4)

  // La misma elección no vuelve a dibujar (no hay nada nuevo que mostrar).
  S.__el('lista-ingresos').innerHTML = 'SENTINELA'
  S.aplicarBarraUnidad({ elegida: null, mostrar: true, unidades: UNIDADES })
  chk('la misma elección no repinta', S.__el('lista-ingresos').innerHTML === 'SENTINELA')

  // Un estado raro no rompe: sin unidades ni elección.
  S.aplicarBarraUnidad(undefined)
  chk('un aviso vacío deja Todas', S.estado.barra.elegida === null && S.estado.barra.mostrar === false)
}

// ══════════════════════════════════════════════════════════════════════════
// 10. El wizard pide la unidad (registro NUEVO) y viene con la de la barra
// ══════════════════════════════════════════════════════════════════════════
esperas.push((async () => {
  const conAlcance = (S, alcance) => { S.estado.alcances = new Map([['materia_prima:cargar', alcance]]) }

  // Todas: se pide elegir, no viene nada.
  {
    const S = nuevo()
    conAlcance(S, { todas: true })
    conBarra(S, null)
    await S.abrirWizard()
    chk('wizard con Todas: no viene ninguna unidad puesta', S.estado.wizard.encabezado.unidadId === '')
    chk('wizard con Todas: el selector pide elegir', S.__el('campo-unidad-negocio').innerHTML.includes('<option value="">Elegí una unidad</option>') && S.__el('campo-unidad-negocio').value === '')
    chk('wizard con Todas: el selector ofrece las unidades', ['Cucuruchos Nuss', 'Dolce Pasta', 'Mengui'].every(n => S.__el('campo-unidad-negocio').innerHTML.includes(n)))
  }
  // Una unidad elegida y alcance "todas": viene puesta.
  {
    const S = nuevo()
    conAlcance(S, { todas: true })
    conBarra(S, DOLCE)
    await S.abrirWizard()
    chk('wizard con Dolce (puede cargar en todas): viene Dolce', S.estado.wizard.encabezado.unidadId === DOLCE)
    chk('wizard con Dolce: el selector la muestra elegida', S.__el('campo-unidad-negocio').value === DOLCE)
  }
  // Alcance por unidades, con la elegida adentro.
  {
    const S = nuevo()
    conAlcance(S, { unidades: [NUSS, DOLCE] })
    conBarra(S, NUSS)
    await S.abrirWizard()
    chk('alcance [Nuss, Dolce] y barra en Nuss: viene Nuss', S.estado.wizard.encabezado.unidadId === NUSS)
  }
  // Alcance que NO incluye la elegida: no viene puesta.
  {
    const S = nuevo()
    conAlcance(S, { unidades: [NUSS] })
    conBarra(S, MENGUI)
    await S.abrirWizard()
    chk('barra en Mengui sin poder cargar ahí: no viene puesta', S.estado.wizard.encabezado.unidadId === '')
  }
  // Sin la tarea de cargar (alcance null): no viene puesta.
  {
    const S = nuevo()
    conBarra(S, NUSS)
    await S.abrirWizard()
    chk('sin alcance de cargar: no viene puesta', S.estado.wizard.encabezado.unidadId === '')
    chk('puedeCargarEn con alcance null es false', S.puedeCargarEn(NUSS) === false)
  }
  // super_admin: viene puesta sin alcance.
  {
    const S = nuevo()
    S.estado.miRolApp = 'super_admin'
    conBarra(S, MENGUI)
    await S.abrirWizard()
    chk('super_admin: viene la de la barra', S.estado.wizard.encabezado.unidadId === MENGUI)
  }
  // Una elegida que no está entre las elegibles (fábrica de pruebas para una cuenta real).
  {
    const S = nuevo()
    S.estado.unidades.push({ id: 'u-robot', nombre: 'Pruebas (robot)' })
    S.estado.fabrica = { ok: true, unidades: new Set(['u-robot']), personas: new Set(), soyDePrueba: false }
    S.estado.miRolApp = 'super_admin'
    conBarra(S, 'u-robot')
    await S.abrirWizard()
    chk('una unidad elegida que no se ofrece (robot): no viene puesta', S.estado.wizard.encabezado.unidadId === '')
  }
  // Una sola unidad elegible: se preselecciona igual que antes, sin mirar la barra.
  {
    const S = nuevo()
    S.estado.unidades = [UNIDADES[0]]
    conBarra(S, null, false)
    await S.abrirWizard()
    chk('una sola unidad: se preselecciona', S.estado.wizard.encabezado.unidadId === NUSS)
  }
  // puedeCargarEn: casos de borde.
  {
    const S = nuevo()
    S.estado.alcances = new Map([['materia_prima:cargar', { todas: false, unidades: [NUSS] }]])
    chk('puedeCargarEn: unidad del alcance', S.puedeCargarEn(NUSS) === true)
    chk('puedeCargarEn: unidad fuera del alcance', S.puedeCargarEn(DOLCE) === false)
    chk('puedeCargarEn: sin unidad', S.puedeCargarEn(null) === false && S.puedeCargarEn('') === false)
    S.estado.alcances = new Map([['materia_prima:ver_todo', { todas: true }]])
    chk('puedeCargarEn: el alcance de OTRA tarea no cuenta', S.puedeCargarEn(NUSS) === false)
  }
})())

// ══════════════════════════════════════════════════════════════════════════
// 11. El cableado del init
// ══════════════════════════════════════════════════════════════════════════
{
  const init = extraerFn(SCRIPT, 'init')
  const iPide = init.indexOf('unidadesDeLaBarra()')
  const iOye = init.indexOf('alCambiarUnidad(aplicarBarraUnidad)')
  const iAplica = init.indexOf('barraPrometida.then(aplicarBarraUnidad)')
  const iEspera = init.indexOf('await Promise.race([barraPrometida')
  const iEmp = init.indexOf(".from('empleados')")
  const iIng = init.indexOf('await cargarIngresos()')
  chk('init: existen el pedido, la escucha, la aplicación y la espera', [iPide, iOye, iAplica, iEspera, iEmp, iIng].every(i => i >= 0))
  chk('init: la barra se pide antes que el empleado (en paralelo)', iPide >= 0 && iEmp >= 0 && iPide < iEmp)
  chk('init: se espera (con tope) antes del primer listado', iEspera >= 0 && iIng >= 0 && iEspera < iIng)
  chk('init: la espera tiene un tope', /await Promise\.race\(\[barraPrometida\.catch\(\(\) => null\), new Promise\(r => setTimeout\(r, \d+\)\)\]\)/.test(init))
  chk('init: las tareas traen el alcance', /\.select\('modulo, tarea, alcance'\)/.test(init) && /estado\.alcances = new Map\(/.test(init))
  const carga = extraerFn(SCRIPT, 'cargarIngresos')
  chk('cargarIngresos marca el listado como cargado antes de pintar', carga.indexOf('estado.listadoCargado = true') >= 0 && carga.indexOf('estado.listadoCargado = true') < carga.indexOf('renderizarListaIngresos()'))
  // La consulta NO filtra por unidad: la barra solo filtra lo que se muestra.
  chk('las consultas del listado no filtran por la unidad elegida', !/\.eq\('unidad_negocio_id',\s*estado\.barra/.test(SCRIPT) && !/elegida\)/.test(carga))
}

fin()
