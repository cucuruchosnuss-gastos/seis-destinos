// Traspaso a otra fábrica (producto terminado) de modulos/stock.html, 30/09/2026.
//
// La base ya estaba: traspasar_producto_terminado(p_origen_id, p_destino_id,
// p_items, p_fecha, p_observaciones) → {traspaso_id, importe} (verificada con
// pg_get_functiondef el 30/09/2026). Esta suite EJECUTA el código real de la
// pantalla contra un DOM falso y un supabase falso:
//  - quién ve el botón (stock:ver en DOS unidades reales; la fábrica de
//    pruebas nunca aparece para una cuenta real),
//  - la lectura paginada del stock terminado del origen y sus lotes (los más
//    viejos primero),
//  - el paso de elegir producto y cono (chocolate abajo, conos con stock
//    primero),
//  - el reparto de lotes ("Completar con los más viejos", pedido / asignado /
//    falta asignar, el lote al que se le pide de más: aviso que NO bloquea),
//  - el producto que el destino no tiene (el mismo texto de la base, y ese
//    renglón no se confirma),
//  - el precio propuesto de la lista interna (con y sin lista, con error y
//    sin precio),
//  - la vista previa (un importe ausente es "—", nunca "$ 0"),
//  - el payload EXACTO de la RPC, una sola llamada, el error tal cual,
//  - y el escapado de todo texto de la base.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const HTML = require('fs').readFileSync(ARCHIVO, 'utf8')

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error(){} }

  function elemento(id) {
    const el = __inputFalso('')
    Object.assign(el, {
      id, dataset: {}, hidden: false, disabled: false, textContent: '', style: {}, placeholder: '', max: '',
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      querySelectorAll: () => [], querySelector: () => null,
      focus() { document.activeElement = el },
    })
    let html = ''
    Object.defineProperty(el, 'innerHTML', { get() { return html }, set(h) { html = String(h); __alDibujar(el, html) } })
    return el
  }
  var __els = new Map()
  // Lo que el navegador crearía al asignar el innerHTML de los renglones: los
  // campos de números (con su data-*) y los nodos que se buscan por selector.
  var __porSelector = new Map()
  function __alDibujar(el, html) {
    if (el.id !== 'trp-renglones') return
    const inputs = []
    for (const m of html.matchAll(/<input [^>]*>/g)) {
      const tag = m[0]
      const e = elemento('')
      let a
      if ((a = tag.match(/data-trp-pedido="([^"]*)"/))) e.dataset.trpPedido = a[1]
      if ((a = tag.match(/data-trp-lote="([^"]*)"/))) e.dataset.trpLote = a[1]
      if ((a = tag.match(/data-lote="([^"]*)"/))) e.dataset.lote = a[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      if ((a = tag.match(/data-trp-precio="([^"]*)"/))) e.dataset.trpPrecio = a[1]
      inputs.push(e)
    }
    el.__inputs = inputs
    el.querySelectorAll = (sel) => {
      const k = sel.match(/^\\[data-(trp-pedido|trp-lote|trp-precio)\\]$/)
      if (!k) return []
      const campo = { 'trp-pedido': 'trpPedido', 'trp-lote': 'trpLote', 'trp-precio': 'trpPrecio' }[k[1]]
      return inputs.filter(i => i.dataset[campo] !== undefined)
    }
    __porSelector.clear()
    for (const i of inputs) if (i.dataset.trpPrecio !== undefined) __porSelector.set('[data-trp-precio="' + i.dataset.trpPrecio + '"]', i)
    for (const m of html.matchAll(/data-trp-(precio-nota|resumen)="([^"]*)"/g)) {
      const e = elemento('')
      __porSelector.set('[data-trp-' + m[1] + '="' + m[2] + '"]', e)
    }
  }
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, elemento(id)); return __els.get(id) },
    querySelectorAll: () => [],
    querySelector(sel) { return __porSelector.get(sel) ?? null },
  }

  var __llamadas = { rpc: [], selects: [], rangos: [], errores: [], exitos: [] }
  var __datos = {}
  var __errorTabla = null
  var __rpc = {}
  function __consulta(tabla) {
    let cols = null
    const filtros = []
    let rango = null
    const q = {
      select: (c) => { cols = c; __llamadas.selects.push([tabla, c]); return q },
      eq: (k, v) => { filtros.push([k, v]); return q },
      order: () => q,
      range: (a, b) => { rango = [a, b]; __llamadas.rangos.push([tabla, a, b]); return q },
      then: (r, rej) => {
        if (__errorTabla === tabla) return Promise.resolve({ data: null, error: { message: 'sin señal' } }).then(r, rej)
        let lista = (__datos[tabla] ?? []).filter(f => filtros.every(([k, v]) => f[k] === v))
        if (rango) lista = lista.slice(rango[0], rango[1] + 1)
        return Promise.resolve({ data: lista, error: null }).then(r, rej)
      },
    }
    return q
  }
  var supabase = {
    rpc: (n, p) => {
      __llamadas.rpc.push([n, p])
      const f = __rpc[n]
      return Promise.resolve(f ? f(p) : { data: null, error: null })
    },
    from: (t) => __consulta(t),
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function formatearFecha(iso) { return iso ? iso.split('-').reverse().join('/') : '' }
  var __vista = null
  function mostrarVista(id) { __vista = id }
  function renderizarStock() {}
  var window = { scrollTo() {} }
  var __Date = globalThis.Date
  var Date = function (...a) {
    if (a.length) return new __Date(...a)
    return { getFullYear: () => 2026, getMonth: () => 8, getDate: () => 30, toISOString: () => '2026-10-01T01:00:00.000Z' }
  }

  var estado = {
    fabrica: FABRICA_SIN_DATOS, unidadBarra: null, unidadesBarra: [], unidadesStock: [],
    unidadesAjuste: [], unidadesBaja: [], unidadesEnvio: [], destinos: [],
    cargados: new Set(), barraLista: Promise.resolve(), stock: [],
    miRolApp: 'usuario', misTareas: new Set(['stock:ver']),
    trp: null, trpCatalogo: null,
  }
`

const FUNCIONES = [
  'esc', 'normalizar', 'hoyLocal', 'tieneTarea', 'nombreDeUnidadBarra', 'cargarStock', 'mapaCobertura',
  'unidadesTraspaso', 'puedeTraspasar', 'nuevoUuidTrp', 'nuevoTraspaso','destinoPorDefectoTrp',
  'cargarCatalogoTrp', 'cargarStockTrp', 'agruparStockTrp', 'listaInternaDe', 'cargarListaInternaTrp',
  'proponerPrecioTrp', 'presentacionTrp', 'presentacionesOrigenTrp', 'presentacionEnDestinoTrp',
  'textoFaltaEnDestinoTrp', 'lotesTrp', 'stockPresentacionTrp', 'conosTrp', 'nombreConoTrp',
  'textoCajasTrp', 'plataTrp', 'asignacionTrp', 'completarTrp', 'itemParaBaseTrp', 'parametrosTraspaso',
  'faltaRenglonTrp', 'faltanTraspaso', 'resumenTraspaso', 'fraseDeudaTrp', 'textoPrecioTrp',
  'renderizarTraspaso', 'pintarFabricasTrp', 'pintarAvisoStockTrp', 'pintarRenglonesTrp', 'htmlRenglonTrp',
  'htmlLotesTrp', 'htmlResumenLotesTrp', 'enlazarCamposTrp', 'pintarPrecioTrp', 'pintarElegirTrp',
  'pintarElegirListaTrp', 'htmlElegirTrp', 'pintarPreviaTrp', 'htmlPreviaTrp', 'pintarPieTrp',
  'refrescarRenglonTrp', 'abrirTraspaso', 'pedirCambioOrigenTrp', 'cerrarModalOrigenTrp',
  'confirmarCambioOrigenTrp', 'aplicarOrigenTrp', 'cambiarDestinoTrp', 'abrirElegirTrp', 'cerrarElegirTrp',
  'elegirPresentacionTrp', 'agregarRenglonTrp', 'quitarRenglonTrp', 'anotarPedidoTrp', 'anotarLoteTrp',
  'anotarPrecioTrp', 'completarRenglonTrp', 'alTipearTrp', 'textoExitoTrp', 'confirmarTraspaso',
]
const CONSTANTES = ['puedeVerStock', 'FILAS_POR_PAGINA_TRP', 'TOPE_PAGINAS_TRP', 'TEXTO_SIN_LISTA_TRP',
  'esChocolateTrp', 'nombreLoteTrp', 'renglonTrp']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: '__setDatos(d){ __datos = d }, __setErrorEn(t){ __errorTabla = t }, __setRpc(n, f){ __rpc[n] = f }, estado, __llamadas, document, __vista(){ return __vista }, TEXTO_SIN_LISTA_TRP, TOPE_PAGINAS_TRP',
  })
}
// setImmediate y no setTimeout: en Windows un setTimeout(0) tarda ~15 ms y la
// suite (y sus mutaciones, que la corren una vez cada una) se volvía lenta.
const tick = () => new Promise(r => setImmediate(r))
async function esperar() { for (let i = 0; i < 12; i++) await tick() }

// ── Datos ─────────────────────────────────────────────────────────────────
const NUSS = { id: 'u-nuss', nombre: 'Cucuruchos Nuss' }
const DOLCE = { id: 'u-dolce', nombre: 'Dolce Pasta' }
const PRUEBA = { id: 'u-prueba', nombre: 'Pruebas (robot)' }
const XSS = (c) => `"><b data-xss="${c}">`

function datosBase() {
  return {
    v_mis_unidades_stock: [NUSS, DOLCE],
    v_stock_insumos: [],
    productos_terminados: [
      { id: 'p1', unidad_negocio_id: 'u-nuss', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: null },
      { id: 'p2', unidad_negocio_id: 'u-nuss', nombre: 'Bombón ' + XSS('producto'), tipo_masa: 'Chocolate', categoria: 'especiales', activo: true, orden: 0, origen_producto_id: null },
      { id: 'p3', unidad_negocio_id: 'u-nuss', nombre: 'Solo en Nuss', tipo_masa: 'Común', categoria: null, activo: true, orden: 5, origen_producto_id: null },
      { id: 'p4', unidad_negocio_id: 'u-nuss', nombre: 'Apagado', tipo_masa: 'Común', categoria: null, activo: false, orden: 2, origen_producto_id: null },
      { id: 'd1', unidad_negocio_id: 'u-dolce', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', categoria: 'cucuruchones', activo: true, orden: 1, origen_producto_id: 'p1' },
      { id: 'd2', unidad_negocio_id: 'u-dolce', nombre: 'Bombón ' + XSS('producto'), tipo_masa: 'Chocolate', categoria: null, activo: true, orden: 2, origen_producto_id: 'p2' },
    ],
    producto_presentaciones: [
      { id: 'pp1', producto_id: 'p1', nombre: 'Caja x 600', con_cono: false, media_caja: false, unidades_por_caja: 600, activa: true, orden: 1 },
      { id: 'pp1c', producto_id: 'p1', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 600, activa: true, orden: 2 },
      { id: 'pp2', producto_id: 'p2', nombre: 'Caja ' + XSS('presentacion'), con_cono: false, media_caja: false, unidades_por_caja: 100, activa: true, orden: 1 },
      { id: 'pp3', producto_id: 'p3', nombre: 'Caja x 50', con_cono: false, media_caja: false, unidades_por_caja: 50, activa: true, orden: 1 },
      { id: 'pp4', producto_id: 'p4', nombre: 'Caja x 10', con_cono: false, media_caja: false, unidades_por_caja: 10, activa: true, orden: 1 },
      { id: 'pp1x', producto_id: 'p1', nombre: 'Vieja', con_cono: false, media_caja: true, unidades_por_caja: 300, activa: false, orden: 3 },
      // Dolce: el Mini con OTRO nombre de presentación pero mismos atributos
      // (la base no compara el nombre de la presentación), y el con cono
      // apagado (no cuenta).
      { id: 'dp1', producto_id: 'd1', nombre: 'Caja 600 unidades', con_cono: false, media_caja: false, unidades_por_caja: 600, activa: true, orden: 1 },
      { id: 'dp1c', producto_id: 'd1', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 600, activa: false, orden: 2 },
      { id: 'dp2', producto_id: 'd2', nombre: 'Caja 100', con_cono: false, media_caja: false, unidades_por_caja: 100, activa: true, orden: 1 },
      // La media caja: está en las dos fábricas y Nuss no tiene stock.
      { id: 'pp5', producto_id: 'p1', nombre: 'Media caja', con_cono: false, media_caja: true, unidades_por_caja: 300, activa: true, orden: 4 },
      { id: 'dp5', producto_id: 'd1', nombre: 'Media', con_cono: false, media_caja: true, unidades_por_caja: 300, activa: true, orden: 4 },
    ],
    marcas_personalizadas: [
      { id: 'm1', nombre: 'LOLO', activa: true, estado_alta: 'aprobada' },
      { id: 'm2', nombre: 'APAGADA', activa: false, estado_alta: 'aprobada' },
      { id: 'm3', nombre: XSS('marca'), activa: true, estado_alta: 'aprobada' },
      { id: 'm4', nombre: 'RECHAZADA', activa: true, estado_alta: 'rechazada' },
    ],
    stock_terminado_movimientos: [
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: '7023-1', cajas: 10, fecha: '2026-09-01' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: '7023-1', cajas: -3, fecha: '2026-09-05' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: '7030-1', cajas: 8, fecha: '2026-09-10' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: '7020-1', cajas: 5, fecha: '2026-08-20' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: 'agotado', cajas: 5, fecha: '2026-08-01' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: 'agotado', cajas: -5, fecha: '2026-08-02' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1c', marca_id: 'm1', lote: 'L-a', cajas: 4, fecha: '2026-09-02' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1c', marca_id: null, lote: 'L-c', cajas: 2, fecha: '2026-09-03' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1c', marca_id: 'm2', lote: 'L-x', cajas: 3, fecha: '2026-09-04' },
      { unidad_negocio_id: 'u-nuss', presentacion_id: 'pp2', marca_id: null, lote: XSS('lote'), cajas: 6, fecha: '2026-09-06' },
      { unidad_negocio_id: 'u-dolce', presentacion_id: 'dp1', marca_id: null, lote: 'D-1', cajas: 9, fecha: '2026-09-06' },
    ],
    listas_precios: [
      { id: 'lc', unidad_negocio_id: 'u-nuss', nombre: 'Distribuidores', activa: true, es_interna: false },
      // Un nombre que dice "interna" SIN la marca: ya no cuenta.
      { id: 'lx', unidad_negocio_id: 'u-nuss', nombre: 'Lista interna vieja', activa: true, es_interna: false },
      // La interna de OTRA fábrica: no es la del origen.
      { id: 'ld', unidad_negocio_id: 'u-dolce', nombre: 'Interna Dolce', activa: true, es_interna: true },
    ],
  }
}

async function abierto(opciones = {}) {
  const S = sandbox()
  const d = datosBase()
  if (opciones.datos) opciones.datos(d)
  S.__setDatos(d)
  S.estado.unidadesStock = opciones.unidades ?? [NUSS, DOLCE]
  S.estado.unidadBarra = opciones.barra ?? 'u-nuss'
  if (opciones.rpc) for (const [n, f] of Object.entries(opciones.rpc)) S.__setRpc(n, f)
  await S.abrirTraspaso()
  await esperar()
  return S
}
const el = (S, id) => S.document.getElementById(id)
// Crudo = la etiqueta <b> llegó como etiqueta (escapada dice &lt;b).
const conMarca = (html) => /<b data-xss=/.test(html)
const pendientes = []

// ══════════════════════════════════════════════════════════════════════════
// 0. EL HTML: la vista, el botón y el panel propio
// ══════════════════════════════════════════════════════════════════════════
{
  for (const id of ['vista-traspaso', 'btn-ver-traspaso', 'btn-volver-de-traspaso', 'trp-origen', 'trp-destino', 'trp-renglones',
    'trp-agregar', 'trp-elegir', 'trp-elegir-buscar', 'trp-elegir-lista', 'trp-fecha', 'trp-obs', 'trp-previa',
    'trp-confirmar', 'trp-error', 'trp-exito', 'modal-trp-origen', 'btn-trp-cambiar-origen', 'trp-origen-texto']) {
    chk(`html: existe #${id}`, HTML.includes(`id="${id}"`))
  }
  chk('html: el botón arranca escondido (lo muestra init con puedeTraspasar)',
    /id="btn-ver-traspaso" hidden>/.test(HTML))
  chk('init: el botón sale de puedeTraspasar()',
    SCRIPT.includes("document.getElementById('btn-ver-traspaso').hidden = !puedeTraspasar()"))
  chk('pestañas: el traspaso deja marcada la pestaña Stock', /PESTANA_DE_VISTA = \{[^}]*traspaso: 'stock'/.test(SCRIPT))
  chk('mostrarVista esconde y muestra la vista del traspaso',
    SCRIPT.includes("document.getElementById('vista-traspaso').hidden = id !== 'traspaso'"))
  chk('el cambio de origen no usa confirm()', !/confirm\(/.test(SCRIPT.slice(SCRIPT.indexOf('function pedirCambioOrigenTrp'), SCRIPT.indexOf('function aplicarOrigenTrp'))))
  chk('una sola llamada a la RPC en el archivo', (SCRIPT.match(/traspasar_producto_terminado'/g) || []).length === 1)
}

// ══════════════════════════════════════════════════════════════════════════
// 1. QUIÉN VE EL BOTÓN — y la fábrica de pruebas nunca
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const fabrica = { ok: true, unidades: new Set(['u-prueba']), personas: new Set(), soyDePrueba: false }
  let S = sandbox()
  S.estado.fabrica = fabrica
  S.__setDatos({ v_mis_unidades_stock: [NUSS, PRUEBA], v_stock_insumos: [] })
  await S.cargarStock()
  chk('fábrica de pruebas: sale de las unidades de stock de una cuenta real',
    S.estado.unidadesStock.map(u => u.id).join() === 'u-nuss', S.estado.unidadesStock)
  chk('botón: con una sola unidad real (más la de pruebas) NO se ofrece', S.puedeTraspasar() === false)

  S = sandbox()
  S.estado.fabrica = fabrica
  S.__setDatos({ v_mis_unidades_stock: [NUSS, DOLCE, PRUEBA], v_stock_insumos: [] })
  await S.cargarStock()
  chk('botón: con dos unidades reales se ofrece', S.puedeTraspasar() === true)
  S.estado.trp = S.nuevoTraspaso()
  S.estado.trpCatalogo = { ok: true, productos: [], presentaciones: [], marcas: [] }
  S.renderizarTraspaso()
  chk('fábrica de pruebas: no está entre los orígenes', !/Pruebas/.test(el(S, 'trp-origen').innerHTML) && /Dolce Pasta/.test(el(S, 'trp-origen').innerHTML))
  chk('fábrica de pruebas: no está entre los destinos', !/Pruebas/.test(el(S, 'trp-destino').innerHTML))

  // Una cuenta DE PRUEBA sí la ve.
  S = sandbox()
  S.estado.fabrica = { ...fabrica, soyDePrueba: true }
  S.__setDatos({ v_mis_unidades_stock: [NUSS, PRUEBA], v_stock_insumos: [] })
  await S.cargarStock()
  chk('fábrica de pruebas: una cuenta de prueba sí la tiene', S.puedeTraspasar() === true)

  // Sin stock:ver, nunca (aunque haya unidades).
  S = sandbox()
  S.estado.misTareas = new Set()
  S.estado.unidadesStock = [NUSS, DOLCE]
  chk('botón: sin stock:ver no se ofrece', S.puedeTraspasar() === false)
  S.estado.miRolApp = 'super_admin'
  chk('botón: un super_admin con dos unidades sí', S.puedeTraspasar() === true)
})

// ══════════════════════════════════════════════════════════════════════════
// 2. EL ORIGEN ARRANCA EN LA BARRA; EL DESTINO, EN LA OTRA
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = sandbox()
  S.estado.unidadesStock = [NUSS, DOLCE]
  S.estado.unidadBarra = 'u-dolce'
  let t = S.nuevoTraspaso()
  chk('origen: arranca en la unidad de la barra', t.origenId === 'u-dolce')
  chk('destino: con dos fábricas, arranca en la otra', t.destinoId === 'u-nuss')
  S.estado.unidadBarra = 'u-otra'
  t = S.nuevoTraspaso()
  chk('origen: una unidad de la barra que no está permitida no queda elegida', t.origenId === '' && t.destinoId === '')
  S.estado.unidadBarra = null
  S.estado.unidadesStock = [NUSS, DOLCE, { id: 'u-3', nombre: 'Mengui' }]
  S.estado.unidadBarra = 'u-nuss'
  t = S.nuevoTraspaso()
  chk('destino: con tres fábricas no se elige solo', t.origenId === 'u-nuss' && t.destinoId === '')
  chk('fecha: arranca en hoy de Argentina (hoyLocal)', t.fecha === '2026-09-30', t.fecha)
})

// ══════════════════════════════════════════════════════════════════════════
// 3. ABRIR: catálogo, stock paginado y lotes
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  chk('abrir: muestra la vista del traspaso', S.__vista() === 'traspaso')
  const sel = (t) => S.__llamadas.selects.find(s => s[0] === t)?.[1] || ''
  chk('catálogo: lee nombre, tipo_masa y activo de los productos', /nombre/.test(sel('productos_terminados')) && /tipo_masa/.test(sel('productos_terminados')) && /activo/.test(sel('productos_terminados')))
  chk('catálogo: lee con_cono, media_caja, unidades_por_caja y activa de las presentaciones',
    ['con_cono', 'media_caja', 'unidades_por_caja', 'activa'].every(c => sel('producto_presentaciones').includes(c)))
  chk('stock: lee cajas, lote, marca y fecha del stock terminado',
    ['presentacion_id', 'marca_id', 'lote', 'cajas', 'fecha'].every(c => sel('stock_terminado_movimientos').includes(c)))
  chk('stock: pagina con range', S.__llamadas.rangos.some(r => r[0] === 'stock_terminado_movimientos' && r[1] === 0 && r[2] === 999))

  const t = S.estado.trp
  const lotes = S.lotesTrp(t, 'pp1', null)
  chk('lotes: solo los que tienen stock (> 0), los más viejos primero',
    lotes.map(l => `${l.lote}:${l.saldo}`).join() === '7020-1:5,7023-1:7,7030-1:8', lotes)
  chk('lotes: el más viejo es por la fecha más vieja del lote', lotes[1].desde === '2026-09-01')
  chk('lotes: separa por cono', S.lotesTrp(t, 'pp1c', 'm1').map(l => l.lote).join() === 'L-a' && S.lotesTrp(t, 'pp1c', null).map(l => l.lote).join() === 'L-c')
  chk('lotes: el stock de otra fábrica no entra', !S.lotesTrp(t, 'dp1', null).length)
  chk('stock de la presentación: suma los lotes con stock', S.stockPresentacionTrp(t, 'pp1') === 20)
  chk('el botón de agregar aparece con origen y catálogo', el(S, 'trp-agregar').hidden === false)
})

pendientes.push(async () => {
  // 2.500 movimientos: tres páginas.
  const S = await abierto({ datos: (d) => {
    d.stock_terminado_movimientos = Array.from({ length: 2500 }, (_, i) => ({ unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: 'L' + (i % 7), cajas: 1, fecha: '2026-09-01' }))
  } })
  const rangos = S.__llamadas.rangos.filter(r => r[0] === 'stock_terminado_movimientos')
  chk('paginado: lee de a mil hasta la página incompleta', rangos.map(r => r[1]).join() === '0,1000,2000', rangos)
  chk('paginado: suma todas las páginas', S.stockPresentacionTrp(S.estado.trp, 'pp1') === 2500)
  chk('paginado: con la última página incompleta, no se marca incompleto', S.estado.trp.stock.incompleto === false)

  const S2 = await abierto({ datos: (d) => {
    d.stock_terminado_movimientos = Array.from({ length: S.TOPE_PAGINAS_TRP * 1000 }, () => ({ unidad_negocio_id: 'u-nuss', presentacion_id: 'pp1', marca_id: null, lote: 'L', cajas: 1, fecha: '2026-09-01' }))
  } })
  chk('paginado: pasado el tope se DICE que puede estar incompleto',
    S2.estado.trp.stock.incompleto === true && /incompletos/.test(el(S2, 'trp-aviso-stock').textContent) && el(S2, 'trp-aviso-stock').hidden === false)

  const S3 = sandbox()
  S3.__setDatos(datosBase())
  S3.__setErrorEn('stock_terminado_movimientos')
  S3.estado.unidadesStock = [NUSS, DOLCE]
  S3.estado.unidadBarra = 'u-nuss'
  await S3.abrirTraspaso(); await esperar()
  chk('stock: si no se pudo leer se dice (no "sin stock")',
    /No se pudo leer el stock terminado de Cucuruchos Nuss/.test(el(S3, 'trp-aviso-stock').textContent))
  chk('stock: sin poder leer, un renglón no se confirma', S3.faltanTraspaso(S3.estado.trp).some(f => /No se pudo leer/.test(f)))
})

// ══════════════════════════════════════════════════════════════════════════
// 4. ELEGIR PRODUCTO Y CONO
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  S.abrirElegirTrp()
  const html = el(S, 'trp-elegir-lista').innerHTML
  chk('elegir: la caja se muestra', el(S, 'trp-elegir').hidden === false)
  const orden = [...html.matchAll(/data-trp-pres="([^"]+)"/g)].map(m => m[1])
  chk('elegir: solo presentaciones activas de productos activos del origen, el chocolate al final',
    orden.join() === 'pp1,pp1c,pp5,pp3,pp2', orden)
  chk('elegir: el chocolate va separado por una línea', /trp-separador">Chocolate</.test(html) && html.indexOf('Chocolate</div>') < html.indexOf('data-trp-pres="pp2"'))
  chk('elegir: dice el stock en cajas', /Caja x 600<\/span>\s*<span class="trp-opcion__stock">20 cajas/.test(html), html.slice(0, 400))
  chk('elegir: lo que no tiene stock dice "sin stock"', /trp-opcion__stock--cero">sin stock/.test(html))
  chk('elegir: escapa nombres de producto y presentación', !conMarca(html) && /&quot;&gt;&lt;b data-xss=&quot;producto/.test(html))

  S.estado.trp.eligiendo.busqueda = 'mini'
  S.pintarElegirListaTrp(S.estado.trp)
  chk('elegir: el buscador filtra sin mayúsculas', [...el(S, 'trp-elegir-lista').innerHTML.matchAll(/data-trp-pres="([^"]+)"/g)].map(m => m[1]).join() === 'pp1,pp1c,pp5')

  // Con cono: pasa al paso del cono.
  S.elegirPresentacionTrp('pp1c')
  const conos = el(S, 'trp-elegir-lista').innerHTML
  const ids = [...conos.matchAll(/data-trp-cono="([^"]*)"/g)].map(m => m[1])
  chk('cono: los que tienen stock primero (LOLO 4, la apagada con stock 3, el común 2)', ids.slice(0, 3).join() === 'm1,m2,', ids)
  chk('cono: incluye el común y las marcas activas; no las rechazadas', ids.includes('') && ids.includes('m3') && !ids.includes('m4'))
  chk('cono: escapa el nombre de la marca', !conMarca(conos))
  chk('cono: no agrega un renglón todavía', S.estado.trp.renglones.length === 0)
  S.agregarRenglonTrp('pp1c', 'm1')
  chk('cono: al elegir, el renglón queda con esa marca', S.estado.trp.renglones[0].marcaId === 'm1' && S.estado.trp.eligiendo === null)

  // Sin cono: agrega derecho con marca null.
  S.abrirElegirTrp()
  S.elegirPresentacionTrp('pp1')
  chk('sin cono: agrega derecho con marca null', S.estado.trp.renglones[1].presentacionId === 'pp1' && S.estado.trp.renglones[1].marcaId === null)

  // Repetido: no se duplica y se dice.
  S.abrirElegirTrp()
  S.elegirPresentacionTrp('pp1')
  chk('repetido: no se duplica', S.estado.trp.renglones.length === 2)
  chk('repetido: se dice', /ya está en la lista/.test(el(S, 'trp-elegir-aviso').textContent) && el(S, 'trp-elegir-aviso').hidden === false)
})

// ══════════════════════════════════════════════════════════════════════════
// 5. EL REPARTO DE LOTES
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = sandbox()
  const lista = [{ lote: 'A', saldo: 5 }, { lote: 'B', saldo: 7 }, { lote: 'C', saldo: 8 }]
  chk('completar: reparte desde el más viejo, cada uno hasta su stock', JSON.stringify(S.completarTrp(lista, 12)) === '{"A":5,"B":7}')
  chk('completar: lo que no entra queda sin asignar', JSON.stringify(S.completarTrp(lista, 25)) === '{"A":5,"B":7,"C":8}')
  chk('completar: sin pedido no reparte nada', JSON.stringify(S.completarTrp(lista, null)) === '{}')
  let a = S.asignacionTrp({ pedido: 12, lotes: { A: 5, B: 3 } }, lista)
  chk('asignación: pedido / asignado / falta', a.pedido === 12 && a.asignado === 8 && a.falta === 4)
  a = S.asignacionTrp({ pedido: 3, lotes: { A: 8 } }, lista)
  chk('asignación: el lote al que se le pide de más queda como excedido', a.excedidos.length === 1 && a.excedidos[0].excede === 3 && a.falta === -5)
  a = S.asignacionTrp({ pedido: 3, lotes: { Z: 3 } }, lista)
  chk('asignación: un lote que ya no está en la lista no cuenta', a.asignado === 0)

  const T = await abierto()
  T.agregarRenglonTrp('pp1', null)
  const t = T.estado.trp
  const r = t.renglones[0]
  T.anotarPedidoTrp(r.id, 12)
  T.completarRenglonTrp(r.id)
  chk('completar en pantalla: 12 = 5 del más viejo + 7', JSON.stringify(r.lotes) === '{"7020-1":5,"7023-1":7}', r.lotes)
  const campos = el(T, 'trp-renglones').__inputs
  const lote1 = campos.find(i => i.dataset.lote === '7020-1')
  chk('completar en pantalla: el campo del lote muestra lo asignado (ponerNumero)', lote1?.value === '5', lote1?.value)
  chk('completar: no falta asignar', !T.faltanTraspaso(t).length, T.faltanTraspaso(t))
  chk('resumen: "✓ Falta asignar 0"', /✓ Falta asignar 0/.test(el(T, 'trp-renglones').innerHTML))

  // Pedir más de lo que tiene un lote: aviso bordó que NO bloquea.
  T.anotarLoteTrp(r.id, '7020-1', 9)
  T.anotarLoteTrp(r.id, '7023-1', 3)
  const resumen = T.document.querySelector(`[data-trp-resumen="${r.id}"]`).innerHTML
  chk('de más en un lote: se avisa en bordó con cuánto queda', /trp-aviso--grave">Lote 7020-1: tiene 5 cajas y pasás 9 cajas\. La base lo deja pasar, pero ese lote queda en -4 cajas en Cucuruchos Nuss/.test(resumen), resumen)
  chk('de más en un lote: NO bloquea', !T.faltanTraspaso(t).length, T.faltanTraspaso(t))

  T.anotarLoteTrp(r.id, '7023-1', 1)
  chk('falta asignar: bloquea y lo dice', T.faltanTraspaso(t).some(f => /faltan asignar 2 cajas/.test(f)), T.faltanTraspaso(t))
  T.anotarLoteTrp(r.id, '7023-1', 5)
  chk('asignado de más: bloquea y lo dice', T.faltanTraspaso(t).some(f => /asignaste 2 cajas de más/.test(f)))
  T.anotarPedidoTrp(r.id, null)
  chk('sin pedido: bloquea y lo dice', T.faltanTraspaso(t).some(f => /cuántas cajas/.test(f)))

  // Un producto sin stock: no hay lote de dónde sacarlo.
  T.agregarRenglonTrp('pp3', null)
  chk('sin stock: se dice en el renglón', /No hay stock de esto en Cucuruchos Nuss/.test(el(T, 'trp-renglones').innerHTML))
})

// ══════════════════════════════════════════════════════════════════════════
// 6. EL PRODUCTO QUE EL DESTINO NO TIENE
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  const t = S.estado.trp
  chk('destino: la base busca por nombre de producto + con_cono + media_caja + unidades (no por nombre de presentación)',
    S.presentacionEnDestinoTrp(S.presentacionTrp('pp1'), 'u-dolce')?.id === 'dp1')
  chk('destino: una presentación apagada en el destino no cuenta', S.presentacionEnDestinoTrp(S.presentacionTrp('pp1c'), 'u-dolce') === null)
  S.agregarRenglonTrp('pp3', null)
  const texto = 'La fábrica de destino no tiene "Solo en Nuss · Caja x 50": creala antes de pasarle stock.'
  chk('destino: el aviso es el MISMO texto de la base', el(S, 'trp-renglones').innerHTML.includes(texto.replace(/"/g, '&quot;')))
  chk('destino: ese renglón no se deja confirmar', S.faltanTraspaso(t).some(f => f.includes(texto)))
  await S.confirmarTraspaso()
  chk('destino: confirmar no llama a la RPC', !S.__llamadas.rpc.some(r => r[0] === 'traspasar_producto_terminado'))
  chk('destino: el error se ve pegado al botón', el(S, 'trp-error').hidden === false && el(S, 'trp-error').textContent.includes(texto))
  chk('el botón NO se deshabilita por lo que falta', el(S, 'trp-confirmar').disabled === false)
  S.cambiarDestinoTrp('')
  chk('sin destino elegido todavía no se avisa en el renglón', !el(S, 'trp-renglones').innerHTML.includes('creala antes'))
})

// ══════════════════════════════════════════════════════════════════════════
// 7. EL PRECIO PROPUESTO DE LA LISTA INTERNA
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = sandbox()
  chk('lista interna: la que tiene es_interna, NO por el nombre', S.listaInternaDe([{ id: 'a', nombre: 'Interna', activa: true, es_interna: false }, { id: 'b', nombre: 'Fábricas', activa: true, es_interna: true }])?.id === 'b')
  chk('lista interna: un nombre que dice "interna" sin la marca no cuenta', S.listaInternaDe([{ id: 'c', nombre: 'Lista Interna', activa: true, es_interna: false }]) === null)
  chk('lista interna: una desactivada con la marca SÍ (la marca es explícita)', S.listaInternaDe([{ id: 'b', nombre: 'Fábricas', activa: false, es_interna: true }])?.id === 'b')
  chk('lista interna: es_interna con un valor raro no cuenta', S.listaInternaDe([{ id: 'b', nombre: 'X', activa: true, es_interna: 'true' }]) === null)
  chk('lista interna: sin ninguna, null', S.listaInternaDe([{ id: 'x', nombre: 'Distribuidores', activa: true, es_interna: false }]) === null)
  chk('lista interna: se pide a la base por es_interna (el doble ignora el select: se afirma sobre su texto)',
    /\.select\('id, nombre, activa, es_interna'\)\s*\n\s*\.eq\('unidad_negocio_id', origen\)\s*\n\s*\.eq\('es_interna', true\)/.test(SCRIPT))
  chk('lista interna: ya no se busca "interna" en el nombre', !/includes\('interna'\)/.test(SCRIPT))

  // Sin lista interna (los datos de hoy).
  let T = await abierto()
  T.agregarRenglonTrp('pp1', null)
  await esperar()
  let r = T.estado.trp.renglones[0]
  chk('sin lista interna: el precio queda vacío', r.precio === null)
  chk('sin lista interna: la línea lo dice', T.document.querySelector(`[data-trp-precio-nota="${r.id}"]`).textContent === T.TEXTO_SIN_LISTA_TRP)
  chk('sin lista interna: no se pide precio_venta', !T.__llamadas.rpc.some(x => x[0] === 'precio_venta'))

  // Con lista interna.
  const conLista = (d) => { d.listas_precios.push({ id: 'li', unidad_negocio_id: 'u-nuss', nombre: 'Interna ' + XSS('lista'), activa: true, es_interna: true }) }
  T = await abierto({ datos: conLista, rpc: { precio_venta: (p) => ({ data: { precio_caja: p.p_marca_id ? 999 : 1500.5, sin_precio: false }, error: null }) } })
  T.agregarRenglonTrp('pp1', null)
  await esperar()
  r = T.estado.trp.renglones[0]
  const llamada = T.__llamadas.rpc.find(x => x[0] === 'precio_venta')?.[1]
  chk('con lista: pide precio_venta con la lista, la presentación, la marca y la fecha',
    JSON.stringify(llamada) === JSON.stringify({ p_lista_id: 'li', p_presentacion_id: 'pp1', p_marca_id: null, p_fecha: '2026-09-30' }), llamada)
  chk('con lista: propone el precio por caja', r.precio === 1500.5)
  chk('con lista: el campo muestra el precio con formato argentino', T.document.querySelector(`[data-trp-precio="${r.id}"]`)?.value === '1.500,50')
  const nota = T.document.querySelector(`[data-trp-precio-nota="${r.id}"]`).textContent
  chk('con lista: la línea dice de qué lista es', /^Propuesto de la lista «Interna /.test(nota), nota)
  T.agregarRenglonTrp('pp1c', 'm1')
  await esperar()
  chk('con lista: el cono viaja a precio_venta', T.__llamadas.rpc.filter(x => x[0] === 'precio_venta')[1]?.[1]?.p_marca_id === 'm1')

  // Un precio tocado no se pisa.
  T.anotarPrecioTrp(r.id, 1200)
  await T.proponerPrecioTrp(T.estado.trp, r)
  chk('precio tocado: la propuesta no lo pisa', r.precio === 1200)
  T.anotarPrecioTrp(r.id, null)
  chk('precio vaciado: queda sin precio', r.precio === null && /no deja deuda/.test(T.document.querySelector(`[data-trp-precio-nota="${r.id}"]`).textContent))

  // La lista no tiene precio / precio_venta falla.
  {
    const U = await abierto({ datos: conLista, rpc: { precio_venta: () => ({ data: null, error: { message: 'No tenés permiso para ver precios.' } }) } })
    U.agregarRenglonTrp('pp1', null)
    await esperar()
    const rr = U.estado.trp.renglones[0]
    const n = U.document.querySelector(`[data-trp-precio-nota="${rr.id}"]`).textContent
    chk('error de precio_venta: el precio queda vacío (nunca 0)', rr.precio === null, rr.precio)
    chk('error de precio_venta: dice el mensaje de la base TAL CUAL, no "no tiene precio"', /No tenés permiso para ver precios\./.test(n) && !/no tiene precio para esto/.test(n) && /vacío = sin deuda entre fábricas/.test(n), n)
  }
  for (const [nombre, f] of [
    ['sin_precio', () => ({ data: { sin_precio: true, motivo: 'x' }, error: null })],
    ['precio_caja null', () => ({ data: { precio_caja: null, sin_precio: false }, error: null })],
  ]) {
    const U = await abierto({ datos: conLista, rpc: { precio_venta: f } })
    U.agregarRenglonTrp('pp1', null)
    await esperar()
    const rr = U.estado.trp.renglones[0]
    const n = U.document.querySelector(`[data-trp-precio-nota="${rr.id}"]`).textContent
    chk(`${nombre}: el precio queda vacío (nunca 0)`, rr.precio === null, rr.precio)
    chk(`${nombre}: la línea dice que no hay precio y que vacío = sin deuda`, /no tiene precio para esto.*vacío = sin deuda entre fábricas/.test(n), n)
  }
})

// ══════════════════════════════════════════════════════════════════════════
// 8. LA VISTA PREVIA
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  const t = S.estado.trp
  S.agregarRenglonTrp('pp1', null)
  const r = t.renglones[0]
  S.anotarPedidoTrp(r.id, 12)
  S.completarRenglonTrp(r.id)
  let previa = el(S, 'trp-previa').innerHTML
  chk('previa: sin precio, el subtotal y el total son "—" (nunca "$ 0")', !/\$ 0/.test(previa) && /<strong>—<\/strong>/.test(previa), previa)
  chk('previa: sin precio no queda deuda', /Sin precio: no queda deuda entre fábricas\./.test(previa))
  chk('previa: dice los lotes con sus cajas', /Lote 7020-1: 5 cajas · Lote 7023-1: 7 cajas/.test(previa))
  S.anotarPrecioTrp(r.id, 1500.5)
  previa = el(S, 'trp-previa').innerHTML
  chk('previa: subtotal = precio × cajas', /\$ 18\.006,00/.test(previa), previa)
  chk('previa: la frase de la deuda con las dos fábricas', /Dolce Pasta le va a deber \$ 18\.006,00 a Cucuruchos Nuss\./.test(previa))
  chk('plata: null, undefined, "" y NaN son "—"', [null, undefined, '', NaN].every(v => S.plataTrp(v) === '—'))
  chk('plata: un cero de verdad es "$ 0,00"', S.plataTrp(0) === '$ 0,00')
})

// ══════════════════════════════════════════════════════════════════════════
// 9. EL PAYLOAD EXACTO Y LA CONFIRMACIÓN
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  // TODOS los que esperan, no solo el último: con uno solo, una segunda
  // llamada dejaba la primera colgada para siempre y la suite terminaba muda.
  const esperando = []
  const resolver = (v) => { for (const res of esperando.splice(0)) res(v) }
  const S = await abierto({ rpc: { traspasar_producto_terminado: () => new Promise(res => { esperando.push(res) }) } })
  const t = S.estado.trp
  S.agregarRenglonTrp('pp1', null)
  S.agregarRenglonTrp('pp1c', 'm1')
  const [a, b] = t.renglones
  S.anotarPedidoTrp(a.id, 12)
  S.completarRenglonTrp(a.id)
  S.anotarPrecioTrp(a.id, 1500.5)
  S.anotarPedidoTrp(b.id, 4)
  S.anotarLoteTrp(b.id, 'L-a', 4)
  t.obs = '  para el finde  '
  const p = S.parametrosTraspaso(t)
  const esperado = {
    p_origen_id: 'u-nuss', p_destino_id: 'u-dolce',
    p_items: [
      { presentacion_id: 'pp1', marca_id: null, lotes: [{ lote: '7020-1', cajas: 5 }, { lote: '7023-1', cajas: 7 }], precio_caja: 1500.5 },
      { presentacion_id: 'pp1c', marca_id: 'm1', lotes: [{ lote: 'L-a', cajas: 4 }], precio_caja: null },
    ],
    p_fecha: '2026-09-30', p_observaciones: 'para el finde',
    p_client_uuid: t.clientUuid,
  }
  chk('payload: la clave de idempotencia es un uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(String(t.clientUuid)), t.clientUuid)
  chk('payload: exacto (claves, marca null sin cono, lotes con cajas enteras, precio null si vacío)', JSON.stringify(p) === JSON.stringify(esperado), p)
  t.obs = '   '
  chk('payload: observaciones vacías viajan null', S.parametrosTraspaso(t).p_observaciones === null)
  t.obs = 'para el finde'

  // pp1c con marca m1 pero el destino tiene el con cono APAGADO: se saca ese renglón.
  chk('el renglón con cono falta en el destino (su presentación está apagada allá)', S.faltanTraspaso(t).some(f => /renglón 2: La fábrica de destino no tiene/.test(f)))
  S.quitarRenglonTrp(b.id)
  chk('quitar: saca el renglón', t.renglones.length === 1)

  const p1 = S.confirmarTraspaso()
  const p2 = S.confirmarTraspaso()
  chk('doble toque: una sola llamada', S.__llamadas.rpc.filter(x => x[0] === 'traspasar_producto_terminado').length === 1)
  chk('mientras manda: el botón se traba', el(S, 'trp-confirmar').disabled === true && el(S, 'trp-confirmar').textContent === 'Pasando…')
  resolver({ data: { traspaso_id: 'tr-1', importe: 18006 }, error: null })
  await p1; await p2; await esperar()
  chk('éxito: el aviso dice lo pasado y la deuda', S.__llamadas.exitos[0] === 'Listo: pasaron 12 cajas de Cucuruchos Nuss a Dolce Pasta. Dolce Pasta le debe $ 18.006,00 a Cucuruchos Nuss.', S.__llamadas.exitos)
  chk('éxito: queda el aviso en la pantalla', el(S, 'trp-exito').hidden === false && /Listo/.test(el(S, 'trp-exito').textContent))
  chk('éxito: la lista se vacía y el botón se destraba', t.renglones.length === 0 && el(S, 'trp-confirmar').disabled === false)
  chk('éxito: se vuelve a leer el stock del origen', S.__llamadas.rangos.filter(r => r[0] === 'stock_terminado_movimientos').length >= 2)

  // Sin precio: el importe 0 dice que no quedó deuda.
  chk('éxito sin precio: no quedó deuda', /Sin precio: no quedó deuda/.test(S.textoExitoTrp(t, { importe: 0 }, 3)))
  chk('éxito con importe null: no inventa deuda', /Sin precio: no quedó deuda/.test(S.textoExitoTrp(t, { importe: null }, 3)))
})

pendientes.push(async () => {
  // El error de la base TAL CUAL, pegado al botón.
  const S = await abierto({ rpc: { traspasar_producto_terminado: () => ({ data: null, error: { message: 'Necesitás permiso de Stock en las dos fábricas.' } }) } })
  const t = S.estado.trp
  S.agregarRenglonTrp('pp1', null)
  S.anotarPedidoTrp(t.renglones[0].id, 3)
  S.completarRenglonTrp(t.renglones[0].id)
  await S.confirmarTraspaso()
  chk('error de la base: tal cual y pegado al botón', el(S, 'trp-error').textContent === 'Necesitás permiso de Stock en las dos fábricas.' && el(S, 'trp-error').hidden === false)
  chk('error de la base: los renglones siguen', t.renglones.length === 1 && el(S, 'trp-confirmar').disabled === false)

  // Un corte de red: no se sabe si entró, y se dice.
  const U = await abierto({ rpc: { traspasar_producto_terminado: () => { throw new Error('red') } } })
  U.agregarRenglonTrp('pp1', null)
  U.anotarPedidoTrp(U.estado.trp.renglones[0].id, 3)
  U.completarRenglonTrp(U.estado.trp.renglones[0].id)
  await U.confirmarTraspaso()
  chk('corte de red: avisa que no se sabe si entró y que reintentar no lo duplica', /no se sabe si el traspaso entró/.test(el(U, 'trp-error').textContent) && /no se pasa dos veces/.test(el(U, 'trp-error').textContent), el(U, 'trp-error').textContent)
  chk('corte de red: ya NO manda a revisar el stock del destino antes de reintentar', !/fijate|Antes de volver a mandarlo|Stock terminado/.test(el(U, 'trp-error').textContent))
  chk('el archivo ya no dice "antes de volver a mandarlo"', !/Antes de volver a mandarlo/.test(SCRIPT))

  // Fecha de mañana: no se manda.
  const V = await abierto()
  V.agregarRenglonTrp('pp1', null)
  V.anotarPedidoTrp(V.estado.trp.renglones[0].id, 3)
  V.completarRenglonTrp(V.estado.trp.renglones[0].id)
  V.estado.trp.fecha = '2026-10-01'
  await V.confirmarTraspaso()
  chk('fecha futura: no se manda', !V.__llamadas.rpc.some(x => x[0] === 'traspasar_producto_terminado') && /de mañana/.test(el(V, 'trp-error').textContent))
  V.estado.trp.fecha = '2026-09-30'
  V.estado.trp.destinoId = 'u-nuss'
  chk('origen = destino: no se manda', V.faltanTraspaso(V.estado.trp).some(f => /dos fábricas distintas/.test(f)))
})

// ══════════════════════════════════════════════════════════════════════════
// 9b. IDEMPOTENCIA: la MISMA clave en cada reintento (p_client_uuid)
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  let intento = 0
  const S = await abierto({
    rpc: {
      traspasar_producto_terminado: () => {
        intento++
        if (intento === 1) throw new Error('red')
        return { data: { traspaso_id: 'tr-1', reintento: true }, error: null }
      },
    },
  })
  const t = S.estado.trp
  const clave = t.clientUuid
  S.agregarRenglonTrp('pp1', null)
  S.anotarPedidoTrp(t.renglones[0].id, 3)
  S.completarRenglonTrp(t.renglones[0].id)
  await S.confirmarTraspaso()
  chk('reintento: después del corte la lista sigue y la clave no cambió', t.renglones.length === 1 && t.clientUuid === clave)
  await S.confirmarTraspaso()
  await esperar()
  const llamadas = S.__llamadas.rpc.filter(x => x[0] === 'traspasar_producto_terminado').map(x => x[1].p_client_uuid)
  chk('reintento: las dos llamadas mandan la MISMA clave', llamadas.length === 2 && llamadas[0] === clave && llamadas[1] === clave, llamadas)
  chk('reintento: "ya había entrado" se dice como ÉXITO, sin error', /ya había entrado/.test(S.__llamadas.exitos[0] ?? '') && /No se pasó dos veces/.test(S.__llamadas.exitos[0] ?? '') && el(S, 'trp-error').hidden === true, S.__llamadas.exitos)
  chk('reintento: no inventa una deuda (la base no devuelve el importe)', !/le debe/.test(S.__llamadas.exitos[0] ?? ''))
  chk('después del éxito: el próximo traspaso tiene OTRA clave', !!t.clientUuid && t.clientUuid !== clave)

  // Un error de la base (rechazo, la transacción se revierte): la clave sigue.
  const U = await abierto({ rpc: { traspasar_producto_terminado: () => ({ data: null, error: { message: 'Poné las cajas de cada lote.' } }) } })
  const k = U.estado.trp.clientUuid
  U.agregarRenglonTrp('pp1', null)
  U.anotarPedidoTrp(U.estado.trp.renglones[0].id, 3)
  U.completarRenglonTrp(U.estado.trp.renglones[0].id)
  await U.confirmarTraspaso()
  chk('error de la base: la clave no cambia', U.estado.trp.clientUuid === k)

  // Cambiar el origen vacía la lista: otro traspaso, otra clave.
  const V = await abierto()
  const k1 = V.estado.trp.clientUuid
  V.pedirCambioOrigenTrp('u-dolce')
  await esperar()
  chk('cambiar el origen: otra clave', V.estado.trp.origenId === 'u-dolce' && V.estado.trp.clientUuid !== k1 && !!V.estado.trp.clientUuid)
  chk('dos traspasos nuevos no comparten clave', V.nuevoTraspaso().clientUuid !== V.nuevoTraspaso().clientUuid)
})

// ══════════════════════════════════════════════════════════════════════════
// 10. CAMBIAR EL ORIGEN CON RENGLONES: PANEL PROPIO
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  const t = S.estado.trp
  S.agregarRenglonTrp('pp1', null)
  el(S, 'trp-origen').value = 'u-dolce'
  S.pedirCambioOrigenTrp('u-dolce')
  chk('cambio de origen con renglones: abre el panel', el(S, 'modal-trp-origen').hidden === false)
  chk('cambio de origen: el select vuelve al origen hasta confirmar', el(S, 'trp-origen').value === 'u-nuss' && t.origenId === 'u-nuss')
  chk('cambio de origen: el panel dice qué se pierde', /El producto cargado es de Cucuruchos Nuss\. Si cambiás a Dolce Pasta, se sacan de la lista/.test(el(S, 'trp-origen-texto').textContent))
  S.cerrarModalOrigenTrp()
  chk('volver: no cambia nada', t.origenId === 'u-nuss' && t.renglones.length === 1 && el(S, 'modal-trp-origen').hidden === true)
  S.pedirCambioOrigenTrp('u-dolce')
  S.confirmarCambioOrigenTrp()
  await esperar()
  chk('confirmar: cambia el origen y vacía la lista', t.origenId === 'u-dolce' && t.renglones.length === 0)
  chk('confirmar: el destino deja de ser el nuevo origen', t.destinoId === 'u-nuss')
  chk('confirmar: lee el stock del nuevo origen', S.lotesTrp(t, 'dp1', null)?.map(l => l.lote).join() === 'D-1')

  // Sin renglones, cambia derecho.
  S.pedirCambioOrigenTrp('u-nuss')
  await esperar()
  chk('sin renglones: cambia derecho, sin panel', t.origenId === 'u-nuss' && el(S, 'modal-trp-origen').hidden === true)
})

// ══════════════════════════════════════════════════════════════════════════
// 11. ESCAPADO — texto malicioso en cada dato de la base
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto({ unidades: [{ id: 'u-nuss', nombre: XSS('origen') }, { id: 'u-dolce', nombre: XSS('destino') }] })
  S.estado.unidadesBarra = [{ id: 'u-nuss', nombre: XSS('origen') }, { id: 'u-dolce', nombre: XSS('destino') }]
  const t = S.estado.trp
  S.agregarRenglonTrp('pp2', null)
  const r = t.renglones[0]
  S.anotarPedidoTrp(r.id, 9)
  S.anotarLoteTrp(r.id, XSS('lote'), 9)
  S.anotarPrecioTrp(r.id, 10)
  S.renderizarTraspaso()
  const todo = ['trp-origen', 'trp-destino', 'trp-renglones', 'trp-previa'].map(id => el(S, id).innerHTML).join('\n')
    + S.document.querySelector(`[data-trp-resumen="${r.id}"]`)?.innerHTML
  chk('escapado: ningún dato de la base entra crudo', !conMarca(todo), (todo.match(/.{40}<b data-xss=.{20}/g) || []).slice(0, 3))
  for (const m of ['origen', 'destino', 'producto', 'presentacion', 'lote']) {
    chk(`escapado: «${m}» aparece escapado`, todo.includes(`&lt;b data-xss=&quot;${m}&quot;&gt;`))
  }
  chk('escapado: el data-lote vuelve al lote original al leerlo', el(S, 'trp-renglones').__inputs.some(i => i.dataset.lote === XSS('lote')))
  S.abrirElegirTrp()
  S.elegirPresentacionTrp('pp1c')
  chk('escapado: el paso del cono', !conMarca(el(S, 'trp-elegir-lista').innerHTML))
  S.agregarRenglonTrp('pp1c', 'm3')
  chk('escapado: el nombre del cono en el renglón', !conMarca(el(S, 'trp-renglones').innerHTML) && /cono &quot;&gt;&lt;b data-xss=&quot;marca/.test(el(S, 'trp-renglones').innerHTML))
})

// ══════════════════════════════════════════════════════════════════════════
// 12. LOS CAMPOS DE NÚMEROS (js/utils.js)
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  S.agregarRenglonTrp('pp1', null)
  const r = S.estado.trp.renglones[0]
  const pedido = el(S, 'trp-renglones').__inputs.find(i => i.dataset.trpPedido !== undefined)
  chk('números: el pedido queda enlazado como texto sin decimales', pedido.type === 'text' && pedido.inputMode === 'numeric')
  pedido.teclear('1500')
  S.alTipearTrp({ target: pedido })
  chk('números: "1500" se ve 1.500 y se lee 1500', pedido.value === '1.500' && r.pedido === 1500, [pedido.value, r.pedido])
  const precio = el(S, 'trp-renglones').__inputs.find(i => i.dataset.trpPrecio !== undefined)
  chk('números: el precio admite decimales', precio.inputMode === 'decimal')
  precio.teclear('1234,5')
  S.alTipearTrp({ target: precio })
  chk('números: "1234,5" se lee 1234,5', r.precio === 1234.5 && r.precioTocado === true, r.precio)
  const lote = el(S, 'trp-renglones').__inputs.find(i => i.dataset.lote === '7030-1')
  lote.teclear('8')
  S.alTipearTrp({ target: lote })
  chk('números: el campo del lote anota ESE lote', r.lotes['7030-1'] === 8, r.lotes)
})

// ══════════════════════════════════════════════════════════════════════════
// 13. CASOS SUELTOS: destino sin el origen, sin stock, sin_precio con precio,
//     pedido con decimales, e ids y nombres maliciosos en cada rincón
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  const S = await abierto()
  const destinos = [...el(S, 'trp-destino').innerHTML.matchAll(/<option value="([^"]*)"/g)].map(m => m[1])
  chk('destino: no ofrece la fábrica de origen', destinos.join() === ',u-dolce', destinos)

  // Sin stock y el destino lo tiene: lo ÚNICO que falta es el stock.
  S.agregarRenglonTrp('pp5', null)
  const r = S.estado.trp.renglones[0]
  S.anotarPedidoTrp(r.id, 3)
  const f = S.faltanTraspaso(S.estado.trp)
  chk('sin stock: bloquea aunque el destino lo tenga', f.length === 1 && /no hay stock de esto/.test(f[0]), f)

  S.anotarPedidoTrp(r.id, 2.5)
  chk('pedido: con decimales no vale (cajas enteras)', r.pedido === null)
  S.anotarLoteTrp(r.id, 'X', 1.5)
  chk('lote: con decimales no se anota', !('X' in r.lotes))

  const U = await abierto({
    datos: (d) => d.listas_precios.push({ id: 'li', unidad_negocio_id: 'u-nuss', nombre: 'Interna', activa: true, es_interna: true }),
    rpc: { precio_venta: () => ({ data: { sin_precio: true, precio_caja: 500 }, error: null }) },
  })
  U.agregarRenglonTrp('pp1', null)
  await esperar()
  chk('sin_precio con un precio_caja igual: no se propone', U.estado.trp.renglones[0].precio === null)
})

pendientes.push(async () => {
  // Ids, lotes, nombres de lista, de unidad y de cono maliciosos.
  const PRES = 'pp"><b data-xss="presid">'
  const MARCA = 'm"><b data-xss="marcaid">'
  const S = await abierto({
    datos: (d) => {
      d.producto_presentaciones.push({ id: PRES, producto_id: 'p1', nombre: 'Caja rara', con_cono: true, media_caja: false, unidades_por_caja: 77, activa: true, orden: 9 })
      d.producto_presentaciones.push({ id: 'dp-rara', producto_id: 'd1', nombre: 'Rara', con_cono: true, media_caja: false, unidades_por_caja: 77, activa: true, orden: 9 })
      d.marcas_personalizadas.push({ id: MARCA, nombre: XSS('cono'), activa: true, estado_alta: 'aprobada' })
      d.stock_terminado_movimientos.push({ unidad_negocio_id: 'u-nuss', presentacion_id: PRES, marca_id: MARCA, lote: 'R-1', cajas: 3, fecha: '2026-09-07' })
      d.listas_precios.push({ id: 'li', unidad_negocio_id: 'u-nuss', nombre: 'Interna ' + XSS('lista'), activa: true, es_interna: true })
    },
    rpc: { precio_venta: () => ({ data: { precio_caja: 10, sin_precio: false }, error: null }) },
  })
  S.abrirElegirTrp()
  chk('escapado: el id de la presentación en el botón de elegir', !conMarca(el(S, 'trp-elegir-lista').innerHTML) && el(S, 'trp-elegir-lista').innerHTML.includes('data-xss=&quot;presid'))
  S.elegirPresentacionTrp(PRES)
  chk('escapado: el id de la marca en el botón del cono', !conMarca(el(S, 'trp-elegir-lista').innerHTML) && el(S, 'trp-elegir-lista').innerHTML.includes('data-xss=&quot;marcaid'))
  S.agregarRenglonTrp(PRES, MARCA)
  await esperar()
  const r = S.estado.trp.renglones[0]
  S.anotarPedidoTrp(r.id, 3)
  S.completarRenglonTrp(r.id)
  S.renderizarTraspaso()
  const renglones = el(S, 'trp-renglones').innerHTML
  chk('escapado: la línea del precio propuesto (nombre de la lista)', !conMarca(renglones) && renglones.includes('data-xss=&quot;lista'), renglones.slice(0, 200))
  const previa = el(S, 'trp-previa').innerHTML
  chk('escapado: el cono en la vista previa', !conMarca(previa) && previa.includes('data-xss=&quot;cono'))

  // Los ids de las unidades en las opciones de los dos selects.
  const V = sandbox()
  V.estado.unidadesStock = [{ id: 'a"><b data-xss="uid1">', nombre: 'A' }, { id: 'b"><b data-xss="uid2">', nombre: 'B' }, { id: 'c', nombre: 'C' }]
  V.estado.unidadBarra = 'c'
  V.estado.trp = V.nuevoTraspaso()
  V.pintarFabricasTrp(V.estado.trp)
  const sels = el(V, 'trp-origen').innerHTML + el(V, 'trp-destino').innerHTML
  chk('escapado: los ids de las unidades en origen y destino', !conMarca(sels) && sels.includes('data-xss=&quot;uid1') && el(V, 'trp-destino').innerHTML.includes('data-xss=&quot;uid2'))

  // El error de la lectura del stock nombra la unidad: escapado en el renglón.
  const U = sandbox()
  U.__setDatos(datosBase())
  U.estado.unidadesStock = [{ id: 'u-nuss', nombre: XSS('unidad') }, DOLCE]
  U.estado.unidadBarra = 'u-nuss'
  await U.abrirTraspaso(); await esperar()
  U.agregarRenglonTrp('pp1', null)
  U.estado.trp.stock = { cargando: false, error: `No se pudo leer el stock terminado de ${XSS('unidad')}.`, incompleto: false, porLote: [] }
  U.renderizarTraspaso()
  const h = el(U, 'trp-renglones').innerHTML
  chk('escapado: el error de lectura en el renglón', !conMarca(h) && h.includes('data-xss=&quot;unidad'))
})

// Una suite que se CUELGA (un await que nunca vuelve) termina sin imprimir y
// con código 0, y el runner de mutaciones la contaría como verde: se corta.
let terminada = false
process.on('beforeExit', () => {
  if (terminada) return
  console.log('LA SUITE NO TERMINÓ: un await quedó colgado')
  process.exit(1)
})

;(async () => {
  for (const f of pendientes) {
    try { await f() } catch (e) { fallas.push('EXCEPCIÓN: ' + (e && e.stack || e)) }
  }
  terminada = true
  console.log(`${ok}/${ok + fallas.length}`)
  if (fallas.length) { console.log('FALLAS:\n  ' + fallas.join('\n  ')); process.exit(1) }
})()
