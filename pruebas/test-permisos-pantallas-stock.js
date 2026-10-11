// Permisos en pantalla de Stock (11/10/2026, informe .claude/traspasos/2026-10-10-permisos.md):
//   M8  quien tiene stock:ver_costos sin stock:ver entra y ve SOLO Costos (sin
//       la lista de stock, que no podría leer); con otra vista, Costos es una
//       pestaña. init() se EJECUTA con todo lo de alrededor de mentira.
//   B8  el traspaso a otra fábrica pide precio_venta() solo con retiros:precios
//       en la fábrica de origen; sin ese permiso no lo llama y lo dice.
//
//   node pruebas/test-permisos-pantallas-stock.js
//   ARCHIVO_TEST=<copia de modulos/stock.html> node pruebas/test-permisos-pantallas-stock.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'stock.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, fin } = arnes()

// ── Lo de alrededor de init(), de mentira ─────────────────────────────────
const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  var __llamadas = []
  var __els = new Map()
  function __el(id) {
    if (!__els.has(id)) __els.set(id, { id, hidden: true, textContent: '', dataset: {}, classList: { toggle(){}, add(){}, remove(){} } })
    return __els.get(id)
  }
  var __pestanas = ['stock', 'catalogo', 'recuento', 'costos'].map(v => ({ dataset: { vista: v }, hidden: true, classList: { toggle(){}, add(){}, remove(){} } }))
  var document = {
    getElementById: __el,
    querySelector: (s) => __el(s),
    querySelectorAll: (s) => s === '.pestana-stock' ? __pestanas : [],
  }
  var __busqueda = ''
  var window = { scrollTo(){}, location: { get search() { return __busqueda }, pathname: '/modulos/stock.html', hash: '' } }
  var history = { state: null, replaceState() {} }
  function setTimeout() {}
  var __tareas = []
  var __rol = 'usuario'
  async function verificarSesion() { return { user: { id: 'auth-1' } } }
  async function cargarFabricaDePruebas() { return { ok: true, unidades: new Set(), personas: new Set(), soyDePrueba: false } }
  var FABRICA_SIN_DATOS = { ok: false, unidades: new Set(), personas: new Set(), soyDePrueba: false }
  async function unidadesDeLaBarra() { return null }
  function aplicarEstadoBarra() {}
  function alCambiarUnidad() {}
  function alCambiarBarra() {}
  function mostrarError(m) { __llamadas.push(['error', m]) }
  var supabase = {
    from(t) {
      const q = {
        select() { return q }, eq() { return q }, in() { return q }, order() { return q },
        maybeSingle() { return Promise.resolve({ data: { id: 'emp-1', rol_app: __rol }, error: null }) },
        then(res) { return Promise.resolve({ data: t === 'empleado_tareas' ? __tareas : [], error: null }).then(res) },
      }
      return q
    },
  }
  const anotar = (n) => async () => { __llamadas.push([n]) }
  var cargarStock = anotar('cargarStock'), cargarInsumos = anotar('cargarInsumos'), cargarRecuento = anotar('cargarRecuento')
  var cargarUnidadesRecuento = async () => { __llamadas.push(['cargarUnidadesRecuento']) }
  var cargarUnidadesBaja = anotar('cargarUnidadesBaja'), cargarUnidadesEnvio = anotar('cargarUnidadesEnvio'), cargarDestinos = anotar('cargarDestinos')
  var cargarCostos = anotar('cargarCostos'), cargarPendientesStock = () => {}, iniciarActualizacionSola = () => {}
  function aplicarFiltroDesdeUrl() {}
  function puedeTraspasar() { return false }
  function puedeVerCostosAlgo() { return true }
  function puedeDarBaja() { return tieneTarea('stock', 'dar_baja') }
  var estado = {
    sesion: null, miRolApp: 'usuario', misTareas: new Set(), alcancesTareas: new Map(), vista: 'stock',
    barraLista: Promise.resolve(), fabrica: null, cargados: new Set(),
  }
`
const FUNCIONES = ['tieneTarea', 'vistaDesdeUrl', 'mostrarVista', 'init']
const CONSTANTES = ['puedeVerStock', 'puedeAjustar', 'puedeEnviar', 'puedeGestionar', 'VISTAS_DESDE_URL', 'PESTANA_DE_VISTA', 'SUBTITULO_VISTA']

function sandboxInit() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __pestanas, __llamadas, __setTareas(t){ __tareas = t }, __setRol(r){ __rol = r }, __setBusqueda(s){ __busqueda = s }`,
  })
}

// ── B8: el precio del traspaso ────────────────────────────────────────────
const PRELUDIO_B8 = `
  var console = { log(){}, warn(){}, error(){} }
  var __rpc = []
  var __consultas = []
  var supabase = {
    rpc(n, p) { __rpc.push([n, p]); return Promise.resolve({ data: { precio_caja: 1500, sin_precio: false }, error: null }) },
    from(t) {
      __consultas.push(t)
      const q = { select() { return q }, eq() { return q }, order() { return q },
        then(res) { return Promise.resolve({ data: [{ id: 'l1', nombre: 'Interna Nuss', activa: true, es_interna: true }], error: null }).then(res) } }
      return q
    },
  }
  var __pintados = []
  function pintarPrecioTrp(r) { __pintados.push(r.precioEstado) }
  var estado = { miRolApp: 'usuario', misTareas: new Set(), alcancesTareas: new Map(), trp: null }
`
// Una copia de antes del 11/10/2026 no tiene puedeTareaEn ni el texto: se
// reemplazan por algo que nunca da permiso / un texto que no coincide, así esa
// copia corre y la suite da ROJO por lo que afirma, no por una excepción.
const NUEVOS = { puedeTareaEn: /function puedeTareaEn\(/.test(HTML), texto: /const TEXTO_SIN_PERMISO_PRECIO_TRP =/.test(HTML) }
function sandboxB8() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO_B8 + (NUEVOS.puedeTareaEn ? '' : 'function puedeTareaEn() { return false }\n') +
      (NUEVOS.texto ? '' : 'var TEXTO_SIN_PERMISO_PRECIO_TRP = "(no existe)"\n'),
    funciones: [...(NUEVOS.puedeTareaEn ? ['puedeTareaEn'] : []), 'listaInternaDe', 'cargarListaInternaTrp', 'proponerPrecioTrp', 'textoPrecioTrp'],
    constantes: ['TEXTO_SIN_LISTA_TRP', ...(NUEVOS.texto ? ['TEXTO_SIN_PERMISO_PRECIO_TRP'] : [])],
    retorno: 'estado, __rpc, __consultas, __pintados, TEXTO_SIN_PERMISO_PRECIO_TRP',
  })
}

const esperar = () => new Promise(r => setTimeout(r, 0))

;(async () => {
  // ── M8 ────────────────────────────────────────────────────────────────
  chk('M8: hay una pestaña Costos en el HTML', /<button type="button" class="pestana-stock" data-vista="costos"/.test(HTML))
  {
    const S = sandboxInit()
    S.__setTareas([{ modulo: 'stock', tarea: 'ver_costos', alcance: { todas: true } }, { modulo: 'stock', tarea: 'cargar_costos', alcance: { todas: true } }])
    await S.init()
    chk('M8: con solo ver_costos NO dice "sin acceso"', S.__els.get('sin-acceso')?.hidden !== false)
    chk('M8: abre derecho en Costos', S.estado.vista === 'costos', S.estado.vista)
    chk('M8: carga los costos', S.__llamadas.some(l => l[0] === 'cargarCostos'))
    chk('M8: NO intenta leer la lista de stock (no podría)', !S.__llamadas.some(l => l[0] === 'cargarStock'))
    chk('M8: la vista de stock queda escondida', S.__els.get('vista-stock')?.hidden === true)
    chk('M8: sin "‹ Volver al stock" (no hay stock a dónde volver)', S.__els.get('btn-volver-de-costos')?.hidden === true)
    chk('M8: sin pestañas (una sola vista)', S.__els.get('pestanas-stock')?.hidden === true)
  }
  {
    const S = sandboxInit()
    S.__setTareas([{ modulo: 'stock', tarea: 'gestionar_catalogo', alcance: null }, { modulo: 'stock', tarea: 'ver_costos', alcance: { unidades: ['u-n'] } }])
    await S.init()
    const costos = S.__pestanas.find(p => p.dataset.vista === 'costos')
    chk('M8: con el catálogo y ver_costos (sin stock:ver), abre en el catálogo', S.estado.vista === 'catalogo', S.estado.vista)
    chk('M8: y Costos es una pestaña a la vista', costos.hidden === false && S.__els.get('pestanas-stock')?.hidden === false)
  }
  {
    const S = sandboxInit()
    S.__setTareas([{ modulo: 'stock', tarea: 'ver', alcance: { todas: true } }, { modulo: 'stock', tarea: 'ver_costos', alcance: { todas: true } }])
    await S.init()
    chk('M8: con stock:ver abre en Stock, como siempre', S.estado.vista === 'stock')
    chk('M8: con stock:ver, Costos sigue siendo el botón de adentro (no pestaña)', S.__pestanas.find(p => p.dataset.vista === 'costos').hidden === true)
    chk('M8: con stock:ver hay "‹ Volver al stock"', S.__els.get('btn-volver-de-costos')?.hidden === false)
  }
  {
    const S = sandboxInit()
    S.__setTareas([{ modulo: 'stock', tarea: 'cargar_costos', alcance: { todas: true } }])
    await S.init()
    chk('M8: sin ver_costos ni otra tarea, "sin acceso"', S.__els.get('sin-acceso')?.hidden === false)
  }
  {
    const S = sandboxInit()
    S.__setBusqueda('?vista=costos')
    S.__setTareas([{ modulo: 'stock', tarea: 'ver', alcance: { todas: true } }, { modulo: 'stock', tarea: 'ver_costos', alcance: { todas: true } }])
    await S.init()
    chk('M8: stock.html?vista=costos (el link de la tarjeta) abre en Costos', S.estado.vista === 'costos', S.estado.vista)
  }

  // ── B8 ────────────────────────────────────────────────────────────────
  {
    const S = sandboxB8()
    S.estado.misTareas = new Set(['stock:ver'])
    const t = { origenId: 'u-n', fecha: '2026-10-11', renglones: [{ id: 'r1', presentacionId: 'p1', marcaId: null, precio: null, precioTocado: false }] }
    S.estado.trp = t
    await S.cargarListaInternaTrp(t)
    await esperar()
    chk('B8: sin retiros:precios NO llama a precio_venta', !S.__rpc.some(x => x[0] === 'precio_venta'), JSON.stringify(S.__rpc))
    chk('B8: ni lee las listas', !S.__consultas.includes('listas_precios'))
    chk('B8: el precio queda vacío (nunca 0)', t.renglones[0].precio === null)
    const n = S.textoPrecioTrp(t, t.renglones[0])
    chk('B8: y lo dice en chico: el precio se escribe a mano', n === S.TEXTO_SIN_PERMISO_PRECIO_TRP && /escribí el precio por caja/.test(n), n)
  }
  {
    // Aunque la lista ya esté (otro camino la dejó puesta), sin permiso en el
    // origen proponerPrecioTrp no llama a la base.
    const S = sandboxB8()
    S.estado.misTareas = new Set(['stock:ver'])
    const r = { id: 'r1', presentacionId: 'p1', marcaId: null, precio: null, precioTocado: false }
    const t = { origenId: 'u-n', fecha: '2026-10-11', lista: { id: 'l1', nombre: 'Interna Nuss' }, renglones: [r] }
    S.estado.trp = t
    await S.proponerPrecioTrp(t, r)
    chk('B8: proponerPrecioTrp sin permiso en el origen no llama a precio_venta', !S.__rpc.some(x => x[0] === 'precio_venta') && r.precioEstado === 'sin_permiso', r.precioEstado)
  }
  {
    const S = sandboxB8()
    S.estado.misTareas = new Set(['stock:ver', 'retiros:precios'])
    S.estado.alcancesTareas = new Map([['retiros:precios', { unidades: ['u-d'] }]])
    const t = { origenId: 'u-n', fecha: '2026-10-11', renglones: [{ id: 'r1', presentacionId: 'p1', marcaId: null, precio: null, precioTocado: false }] }
    S.estado.trp = t
    await S.cargarListaInternaTrp(t)
    await esperar()
    chk('B8: con retiros:precios en OTRA fábrica tampoco lo llama (es por fábrica)', !S.__rpc.some(x => x[0] === 'precio_venta'))
  }
  {
    const S = sandboxB8()
    S.estado.misTareas = new Set(['stock:ver', 'retiros:precios'])
    S.estado.alcancesTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
    const t = { origenId: 'u-n', fecha: '2026-10-11', renglones: [{ id: 'r1', presentacionId: 'p1', marcaId: null, precio: null, precioTocado: false }] }
    S.estado.trp = t
    await S.cargarListaInternaTrp(t)
    await esperar()
    chk('B8: con retiros:precios en la fábrica de origen sí lo pide', S.__rpc.some(x => x[0] === 'precio_venta' && x[1].p_lista_id === 'l1'))
    chk('B8: y propone el precio', t.renglones[0].precio === 1500)
  }
  {
    const S = sandboxB8()
    S.estado.miRolApp = 'super_admin'
    const t = { origenId: 'u-n', fecha: '2026-10-11', renglones: [{ id: 'r1', presentacionId: 'p1', marcaId: null, precio: null, precioTocado: false }] }
    S.estado.trp = t
    await S.cargarListaInternaTrp(t)
    await esperar()
    chk('B8: un super_admin sí lo pide', S.__rpc.some(x => x[0] === 'precio_venta'))
  }
})().then(() => fin(), e => { chk('sin excepción', false, e.stack); fin() })
