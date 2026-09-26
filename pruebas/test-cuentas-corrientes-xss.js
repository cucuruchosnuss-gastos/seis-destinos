// Barrido de escapado de modulos/cuentas-corrientes.html — el archivo ENTERO.
//
// El barrido se cerró en 1664384 y 6f09e8e (16/09/2026) y la prueba que lo
// demostraba se perdió con la sesión. Esta suite lo BLOQUEA sobre el estado
// actual (después de a4c17a2 y eacf0ef, 21/09/2026), con el mismo método que
// test-caja-xss.js, test-stock-xss.js y test-materia-prima-xss.js:
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO
//     (`"><b data-xss="campo">`), con datos que imitan lo que devuelve la base:
//     la lista de saldos (y el resumen de arriba), las facturas sin proveedor,
//     las sugerencias del modal "Asignar proveedor", el detalle de un pago,
//     los proveedores pendientes de aceptación, el padrón, el historial, la
//     ficha (selector de unidad, banner en "todas" y en una unidad, los
//     movimientos, la descarga sin importe con sus cantidades y el formulario
//     "Cargar importe", los remitos sin facturar y su error), el selector de
//     orden, los créditos para elegir, el select de facturas del crédito, el
//     selector de cuenta del pago (Mis cuentas / Cuenta de Empresa), las filas
//     FIFO y el resumen de aplicación, y los select de unidad que arma init()
//     con poblarSelect(). La vista previa y los errores de la importación por
//     Excel van por DOM y textContent, y se verifica que sigan así.
//  2. CHEQUEO ESTÁTICO sobre TODO el <script>: cada ${...} de una plantilla que
//     arma HTML, cada asignación a innerHTML (la expresión ENTERA, no la
//     primera línea; y el único `innerHTML +=`) y cada plantilla sin HTML
//     propio que termina en un innerHTML tiene que estar escapada o figurar en
//     la lista de seguras CON SU MOTIVO, por función. Una entrada que no se usa
//     es rojo. Más el contexto: atributo sin comillas, on*=, href/src, style.
//  3. SINKS DE NAVEGACIÓN: los cuatro href a gastos.html (prefijo fijo +
//     encodeURIComponent, entre comillas DOBLES); el deep link ?proveedor= /
//     &unidad= (el proveedor solo abre la ficha si es un id del padrón; la
//     unidad NO se valida, y se verifica que no llega a ningún HTML ni a una
//     navegación: solo va a history.pushState/replaceState con una URL que
//     empieza en "?", o sea del mismo documento); y que la única navegación
//     sea la literal al dashboard.
//
// Las funciones del sandbox se juntan por CLAUSURA desde los renders: se
// ejecuta el código real de cada helper, no una copia.
//
//   node pruebas/test-cuentas-corrientes-xss.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-cuentas-corrientes-xss.js
//   SOLO=render | SOLO=estatico      INFORME=1 (imprime los conteos)

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { interpolaciones, analizar } = require('./escaner-interpolaciones')
const { clasificar, partirTopLevel } = require('./clasificar')
const { extraerFn, cuerpoDesde } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const SOLO = process.env.SOLO || ''
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// HALLAZGOS ABIERTOS: sinks encontrados por esta suite y todavía sin arreglar.
// Al 21/09/2026 NO hay ninguno.
const HALLAZGOS_ABIERTOS = new Set([])

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

// Lo que viene de otros archivos (se define en el preludio) y las acciones que
// abren otras pantallas o escriben: no se extraen.
const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha', 'init',
  'formatearNumeroAr', 'leerNumeroAr', 'enlazarCampoNumero', 'ponerNumero', 'leerCampoNumero',
  'abrirFicha', 'abrirFichaDesdePadron', 'abrirModalEditarProveedor', 'aprobarProveedor', 'rechazarProveedor',
  'eliminarFactura', 'abrirModalAsignarProveedor', 'cargarSinProveedor', 'cargarSaldos',
  'cargarFichaSaldos', 'cargarFichaMovimientos', 'cargarFichaCreditos', 'abrirModalPago',
  'confirmarImporteSinImporte', 'recargarTrasImporte',
])

const RENDERS = [
  'esc', 'importeHtml', 'formatearImporte', 'formatearImporteCentavosSuaves', 'inicialesEmpresa', 'poblarSelect',
  'badgeEstadoFactura', 'renderizarListaSaldos', 'renderizarResumenCC', 'renderizarListaSinProveedor',
  'renderizarSugerenciasAsignar', 'abrirModalDetallePago', 'cargarPendientesAceptacion', 'renderizarPadron',
  'renderizarListaHistorial', 'renderizarSelectorUnidadFicha', 'sincronizarUrlFicha', 'renderizarFichaBanner',
  'renderizarFichaMovimientos', 'htmlFilaSinImporte', 'htmlRemitosSinFacturar', 'renderizarFichaRemitos',
  'crearSelectorOrdenFicha', 'abrirModalAplicarCreditoDesdeFicha', 'seleccionarCreditoParaAplicar',
  'actualizarSelectorCuentaPago', 'renderizarFilasFifo', 'actualizarResumenAplicacion',
  'renderizarPreviewImportacion', 'mostrarErroresImportacion',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...RENDERS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const fin = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, fin === -1 ? 400 : fin + 1))
      }
    }
  }
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

// La URL de la página lleva el &unidad= con una marca: es lo que pondría un
// link armado a mano, y location.href viaja codificado a los `volver=`.
const URL_PAGINA = 'https://x.test/modulos/cuentas-corrientes.html?proveedor=p1&unidad="><b data-xss="url">\''

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      title: '', type: '', dataset: {}, style: {}, hijos: [], atributos: {},
      querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, removeEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(k, v){ el.atributos[k] = v }, closest: () => null, remove(){},
      appendChild(h){ el.hijos.push(h) }, append(...hs){ el.hijos.push(...hs) }, replaceChildren(...hs){ el.hijos = hs },
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'),
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => document.getElementById('qs:' + s), addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
    createTextNode: (t) => ({ textContent: t, nodo: 'texto' }),
  }
  var location = { href: ${JSON.stringify(URL_PAGINA)}, pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var __navegacion = [], __historial = []
  var window = { location: { set href(v) { __navegacion.push(v) }, replace(v) { __navegacion.push(v) } } }
  var history = { pushState(a, b, u) { __historial.push(u) }, replaceState(a, b, u) { __historial.push(u) } }
  var XLSX = { utils: { json_to_sheet(){}, book_new(){}, book_append_sheet(){} }, writeFile(){} }
  var __datos = {}
  function __consulta(tabla) {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not', 'maybeSingle']) q[k] = () => q
    q.then = (res, rej) => Promise.resolve({ data: __datos[tabla] ?? [], error: null, count: 0 }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  var __llamadas = { errores: [], exitos: [] }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  // formatearFecha de js/utils.js, con su cuerpo real.
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  async function abrirFicha() {} async function abrirFichaDesdePadron() {} function abrirModalEditarProveedor() {}
  async function aprobarProveedor() {} async function rechazarProveedor() {} async function eliminarFactura() { return false }
  function abrirModalAsignarProveedor() {} async function cargarSinProveedor() {} async function cargarSaldos() {}
  async function cargarFichaSaldos() {} async function cargarFichaMovimientos() {} async function cargarFichaCreditos() {}
  async function abrirModalPago() {} async function confirmarImporteSinImporte() {} async function recargarTrasImporte() {}
  // Los let top-level del módulo: acá var.
  var facturaPendienteAAsignar = null, proveedorAsignarSeleccionado = null, creditoAAplicar = null
  var facturasParaCredito = [], medioPagoSeleccionado = null, facturasParaPago = [], proveedorAEditar = null
  var fichaOrigen = 'lista', importacionPendiente = null, debounceFifo = null
`

const RETORNO = 'estado, __els, __el(id){ return document.getElementById(id) }, __llamadas, __navegacion, __historial, ' +
  '__setDatos(t, d){ __datos[t] = d }, __setVar(k, v){ eval(k + " = v") }'

if (SOLO !== 'estatico') {
  let S
  try {
    const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
    S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
  } catch (e) {
    chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  }
  if (S) esperas.push(correrRenders(S).catch(e => chk('los renders corren sin excepción', false, String(e && e.stack || e))))
}

async function correrRenders(S) {
  const el = (id) => S.__el(id)
  const html = (id) => el(id).innerHTML
  const E = S.estado

  // ── esc, importes e iniciales ───────────────────────────────────────────
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, S.esc(crudo) === esperado, S.esc(crudo))
  }
  chk('esc no convierte null en la palabra null', S.esc(null) === '' && S.esc(undefined) === '')
  chequearMarcas(chk, 'importeHtml (moneda)', S.importeHtml(10, marca('ih_moneda')), ['ih_moneda'])
  chequearMarcas(chk, 'formatearImporteCentavosSuaves (moneda)', S.formatearImporteCentavosSuaves(10, marca('fcs_moneda')), ['fcs_moneda'])
  chk('formatearImporte sigue en TEXTO PLANO (va a textContent y a labels de poblarSelect)', S.formatearImporte(10, '<X>') === '<X> 10,00', S.formatearImporte(10, '<X>'))
  chk('inicialesEmpresa devuelve texto crudo (se escapa su RESULTADO)', S.inicialesEmpresa('<x y') === '<Y')
  S.poblarSelect('sel-prueba', [{ v: marca('ps_value'), l: marca('ps_label') }], i => ({ value: i.v, label: i.l }), marca('ps_placeholder'))
  chequearMarcas(chk, 'poblarSelect escapa por dentro', html('sel-prueba'), ['ps_value', 'ps_label', 'ps_placeholder'])
  chk('badgeEstadoFactura con un estado desconocido no dibuja nada', S.badgeEstadoFactura(marca('badge')) === '')

  // ── Estado base ──────────────────────────────────────────────────────────
  E.miRolApp = 'super_admin'
  E.miEmpleadoId = 'yo'
  E.maestros.unidades = [{ id: 'u1', nombre: marca('u1_nombre') }, { id: 'u2', nombre: marca('u2_nombre') }]
  const P1 = { id: 'p1', razon_social: marca('p1_razon'), nombre_fantasia: marca('p1_fantasia'), cuit: marca('p1_cuit'), direccion: marca('p1_direccion') }
  const P2 = { id: marca('p2_id'), razon_social: marca('p2_razon'), cuit: null, direccion: null }
  E.maestros.proveedores = [P1, P2]
  E.sinImporte = [{ id: 'fs', proveedor_id: 'p1', unidad_negocio_id: 'u1', moneda: 'ARS' }]

  // init() arma los dos filtros de unidad con poblarSelect(), igual que acá.
  S.poblarSelect('filtro-unidad-proveedores', E.maestros.unidades, u => ({ value: u.id, label: u.nombre }), 'Todas las unidades')
  chequearMarcas(chk, 'filtro de unidad (init)', html('filtro-unidad-proveedores'), ['u1_nombre', 'u2_nombre'])
  chk('estático: init() arma los dos filtros de unidad con poblarSelect()',
    // (desde el 26/09/2026 vía poblarFiltrosUnidad(), con la lista ya sin la
    // unidad de la fábrica de pruebas: ver test-cuentas-corrientes-fabrica-pruebas.js)
    FUENTE.includes("poblarSelect('filtro-unidad-proveedores', unidades, u => ({ value: u.id, label: u.nombre }), 'Todas las unidades')") &&
    FUENTE.includes("poblarSelect('filtro-unidad-historial', unidades, u => ({ value: u.id, label: u.nombre }), 'Todas las unidades')"))

  // ── Lista de saldos + resumen ────────────────────────────────────────────
  E.listaSaldos = [
    { proveedor_id: marca('g_prov_id'), unidad_negocio_id: marca('g_uni_id'), proveedor: P2, saldos: [{ moneda: marca('g_moneda'), deuda: 5, credito: 0 }, { moneda: marca('g_moneda2'), deuda: 0, credito: 3 }] },
    { proveedor_id: 'p1', unidad_negocio_id: 'u1', proveedor: P1, saldos: [{ moneda: 'ARS', deuda: 0, credito: 0 }] },
  ]
  S.renderizarListaSaldos()
  const lista = html('lista-proveedores')
  chequearMarcas(chk, 'lista de saldos', lista, ['g_prov_id', 'g_uni_id', 'p2_razon', 'g_moneda', 'g_moneda2', 'p1_razon'])
  chk('lista de saldos: las iniciales del avatar se escapan', lista.includes('>' + S.esc(S.inicialesEmpresa(P2.razon_social)) + '</div>'))
  chk('lista de saldos: el avatar lleva un color de la paleta', /style="background:#[0-9A-F]{6};"/.test(lista))
  chk('lista de saldos: "+ 1 descarga sin importe" al lado del proveedor que la tiene', /\+ 1 descarga sin importe/.test(lista))
  S.renderizarResumenCC()
  chequearMarcas(chk, 'resumen de arriba (deuda)', html('resumen-cc-deuda'), ['g_moneda'])
  chequearMarcas(chk, 'resumen de arriba (crédito)', html('resumen-cc-credito'), ['g_moneda2'])
  chk('resumen: el innerHTML += suma solo el aviso numérico', /\+ 1 descarga sin importe<\/div>$/.test(html('resumen-cc-deuda')))

  // ── Facturas sin proveedor ───────────────────────────────────────────────
  const FID = 'id"x\'<y>&z'
  E.listaSinProveedor = [
    { id: FID, razon_social: marca('sp_razon'), fecha_factura: '2026-09-10', importe: 10, moneda: marca('sp_moneda') },
    { id: 'f2', razon_social: null, fecha_factura: '2026-09-11', importe: null, moneda: 'ARS' },
  ]
  S.renderizarListaSinProveedor()
  const sp = html('lista-sin-proveedor')
  chequearMarcas(chk, 'facturas sin proveedor', sp, ['sp_razon', 'sp_moneda'])
  const hrefs = [...sp.matchAll(/<a href="([^"]*)"/g)].map(m => m[1])
  chk('facturas sin proveedor: los href (Ver y Editar) arrancan con el prefijo fijo',
    hrefs.length === 4 && hrefs.every(h => h.startsWith('gastos.html?factura=')), hrefs.join(' | '))
  chk('facturas sin proveedor: el id va con encodeURIComponent y el volver es literal',
    hrefs.includes('gastos.html?factura=' + encodeURIComponent(FID) + '&volver=cuentas-corrientes.html'), hrefs.join(' | '))
  chk('facturas sin proveedor: el data-id se escapa', sp.includes('data-id="' + S.esc(FID) + '"'))
  chk('facturas sin proveedor: un importe ausente dice —, no $ 0,00', /gasto__importe">—</.test(sp))

  // ── Sugerencias del modal "Asignar proveedor" ────────────────────────────
  S.renderizarSugerenciasAsignar([P1, P2])
  chequearMarcas(chk, 'sugerencias de Asignar proveedor', html('sugerencias-asignar-proveedor'), ['p1_razon', 'p1_fantasia', 'p2_id', 'p2_razon'])

  // ── Detalle de un pago ───────────────────────────────────────────────────
  S.__setDatos('gastos', { fecha_pago: '2026-09-12', medio_pago: marca('dp_medio'), importe: 100, moneda: marca('dp_moneda') })
  S.__setDatos('aplicaciones_pago', [{ monto_aplicado: 60, facturas_pendientes: { numero_comprobante: marca('dp_num'), razon_social: marca('dp_razon'), fecha_factura: '2026-09-01', categorias: { nombre: marca('dp_cat') } } }])
  S.__setDatos('creditos_proveedor', [
    { id: 'c1', monto_original: 40, monto_disponible: 10, moneda: marca('dp_cmoneda'), aplicaciones_credito: [{ monto_aplicado: 30, facturas_pendientes: { numero_comprobante: marca('dp_cnum') } }] },
    { id: 'c2', monto_original: 5, monto_disponible: 5, moneda: marca('dp_cmoneda2'), aplicaciones_credito: [] },
  ])
  await S.abrirModalDetallePago('g1')
  chequearMarcas(chk, 'detalle del pago', html('detalle-pago-contenido'),
    ['dp_medio', 'dp_moneda', 'dp_num', 'dp_razon', 'dp_cat', 'dp_cmoneda', 'dp_cnum', 'dp_cmoneda2'])

  // ── Proveedores pendientes de aceptación ─────────────────────────────────
  S.__setDatos('proveedores', [{ id: marca('pa_id'), razon_social: marca('pa_razon'), nombre_fantasia: marca('pa_fantasia'), cuit: marca('pa_cuit') }])
  await S.cargarPendientesAceptacion()
  chequearMarcas(chk, 'pendientes de aceptación', html('lista-pendientes-aceptacion'), ['pa_id', 'pa_razon', 'pa_fantasia', 'pa_cuit'])

  // ── Padrón ───────────────────────────────────────────────────────────────
  E.padronSaldos = new Map([
    ['p1', new Map([[marca('pd_moneda'), { deuda: 10, credito: 0 }], [marca('pd_moneda2'), { deuda: 0, credito: 4 }]])],
  ])
  E.filtros.padron.busqueda = ''
  E.misTareas = new Set()
  S.renderizarPadron()
  chequearMarcas(chk, 'padrón', html('lista-padron'), ['p1_razon', 'p1_cuit', 'p1_direccion', 'pd_moneda', 'pd_moneda2', 'p2_id', 'p2_razon'])

  // ── Historial ────────────────────────────────────────────────────────────
  E.listaHistorial = [
    { proveedorNombre: marca('h_prov'), unidad_negocio_id: 'u2', moneda: marca('h_moneda'), fecha: '2026-09-10', tipo: 'factura', monto: 50, factura_pendiente_id: 'fh', referencia: marca('h_ref') },
    { proveedorNombre: 'x', unidad_negocio_id: 'u1', moneda: 'ARS', fecha: '2026-09-10', tipo: marca('h_tipo'), monto: null, referencia: null },
  ]
  E.estadoPorFacturaHistorial = { fh: 'parcial' }
  S.renderizarListaHistorial()
  const hist = html('lista-historial')
  chequearMarcas(chk, 'historial', hist, ['h_prov', 'h_moneda', 'h_ref', 'h_tipo', 'u2_nombre'])
  chk('historial: el badge de estado se dibuja', /badge-estado-factura--parcial">Parcial</.test(hist))

  // ── Ficha, con el &unidad= de la URL marcado (NO se valida al abrir) ─────
  const UNIDAD_URL = marca('unidad_url')
  E.ficha = {
    proveedorId: 'p1', unidadId: UNIDAD_URL, nombre: P1.razon_social, unidades: E.maestros.unidades,
    filtros: { tipo: 'todos', orden: 'fecha_desc' }, movimientosRaw: [], estadoPorFactura: {},
    remitos: [], errorRemitos: null,
  }
  S.renderizarSelectorUnidadFicha()
  chequearMarcas(chk, 'selector de unidad de la ficha', html('filtro-unidad-ficha'), ['u1_nombre', 'u2_nombre'])
  S.sincronizarUrlFicha(true)
  S.sincronizarUrlFicha(false)
  chk('&unidad= de la URL: solo va a history, con una URL relativa que empieza en "?" (mismo documento)',
    S.__historial.length === 2 && S.__historial.every(u => u.startsWith('?proveedor=p1')), S.__historial.join(' | '))
  E.fichaSaldos = [{ unidad_negocio_id: 'u1', moneda: marca('fb_moneda'), deuda_pendiente: 5, credito_disponible: 0 }]
  E.fichaCreditos = []
  S.renderizarFichaBanner()
  chequearMarcas(chk, 'banner de la ficha (una unidad)', html('ficha-banner'), ['fb_moneda'])
  chk('banner de la ficha: el &unidad= de la URL no llega al HTML', !html('ficha-banner').includes('unidad_url'))

  // Banner en "todas las unidades": nombre de cada unidad + moneda.
  E.ficha.unidadId = null
  E.fichaSaldos = [
    { unidad_negocio_id: 'u1', moneda: marca('fb_moneda'), deuda_pendiente: 5, credito_disponible: 0 },
    { unidad_negocio_id: 'u2', moneda: marca('fb_moneda2'), deuda_pendiente: 0, credito_disponible: 7 },
  ]
  S.renderizarFichaBanner()
  chequearMarcas(chk, 'banner de la ficha (todas las unidades)', html('ficha-banner'), ['fb_moneda', 'fb_moneda2', 'u1_nombre', 'u2_nombre'])
  E.fichaSaldos = []
  S.renderizarFichaBanner()
  chk('banner sin saldo y con descargas sin importe: dice —, no $ 0,00', /banner-ficha-cc__monto">—</.test(html('ficha-banner')))

  // ── Movimientos de la ficha ──────────────────────────────────────────────
  const MID = 'fm"x\'<y>'
  const GID = 'g"x\'<y>'
  E.ficha.estadoPorFactura = { [MID]: 'pendiente', fs: 'sin_importe' }
  E.ficha.cantidadesSinImporte = new Map([['fs', [{ nombre: marca('si_nombre'), marca: marca('si_marca'), unidad: marca('si_unidad'), cantidad: 12, bultos: 2, contenido: 6 }]]])
  E.ficha.formImporte = { facturaId: 'fs', modo: 'unidad', importe: 3, error: marca('si_error'), enCurso: false }
  E.ficha.movimientosRaw = [
    { tipo: 'factura', factura_pendiente_id: MID, monto: 100, moneda: marca('fm_moneda'), fecha: '2026-09-10', referencia: marca('fm_ref'), unidad_negocio_id: 'u2', saldo_acumulado: 100 },
    { tipo: 'pago', gasto_id: GID, monto: -40, moneda: marca('fm_moneda2'), fecha: '2026-09-11', referencia: marca('fm_ref2'), unidad_negocio_id: 'u1', saldo_acumulado: 60 },
    { tipo: marca('fm_tipo'), monto: 1, moneda: 'ARS', fecha: '2026-09-12', referencia: null, unidad_negocio_id: 'u1', saldo_acumulado: 1 },
    { tipo: 'factura', factura_pendiente_id: 'fs', monto: null, moneda: marca('si_moneda'), fecha: '2026-09-13', referencia: marca('si_ref'), unidad_negocio_id: 'u1' },
  ]
  S.renderizarFichaMovimientos()
  let movs = html('lista-movimientos-ficha')
  chequearMarcas(chk, 'movimientos de la ficha (todas)', movs,
    ['fm_ref', 'fm_ref2', 'fm_tipo', 'fm_moneda', 'fm_moneda2', 'u1_nombre', 'u2_nombre', 'si_ref', 'si_nombre', 'si_marca', 'si_unidad', 'si_error', 'si_moneda'])
  chk('movimientos: el data-id del ✕ y el data-gasto-id se escapan',
    movs.includes('data-id="' + S.esc(MID) + '"') && movs.includes('data-gasto-id="' + S.esc(GID) + '"'))
  const hrefsF = [...movs.matchAll(/<a href="([^"]*)"/g)].map(m => m[1])
  chk('movimientos: los href (Ver y Editar) son prefijo fijo + id codificado + location.href codificado',
    hrefsF.length === 2 && hrefsF.every(h => h === 'gastos.html?factura=' + encodeURIComponent(MID) + '&volver=' + encodeURIComponent(URL_PAGINA)), hrefsF.join(' | '))
  chk('movimientos: la descarga sin importe ofrece precio por unidad', /Precio por /.test(movs))
  // Con una unidad elegida (la marcada del &unidad=): saldo corrido visible.
  E.ficha.unidadId = UNIDAD_URL
  S.renderizarFichaMovimientos()
  movs = html('lista-movimientos-ficha')
  chequearMarcas(chk, 'movimientos de la ficha (una unidad, con saldo corrido)', movs, ['fm_ref', 'fm_moneda', 'fm_moneda2', 'si_ref'])
  chk('movimientos: con una unidad se dibuja el saldo corrido', /fila-movimiento__saldo/.test(movs))
  chk('movimientos: el &unidad= de la URL no llega al HTML', !movs.includes('unidad_url'))
  // La fila sin importe sola, con varios productos (una cantidad null) y un id marcado.
  chequearMarcas(chk, 'descarga sin importe (varios productos)', S.htmlFilaSinImporte(
    { factura_pendiente_id: marca('si_id'), referencia: marca('si_ref'), fecha: '2026-09-13', moneda: 'ARS', unidad_negocio_id: 'u2' },
    { cantidades: [{ nombre: marca('si_n1'), unidad: 'kg', cantidad: 1 }, { nombre: marca('si_n2'), unidad: 'kg', cantidad: null }], puedeCargar: true, form: { modo: 'total', importe: null }, todas: true }),
    ['si_id', 'si_ref', 'si_n1', 'si_n2', 'u2_nombre'])

  // ── Remitos sin facturar ─────────────────────────────────────────────────
  E.ficha.unidadId = null
  E.ficha.remitos = [{ numero_doc: marca('r_num'), fecha: '2026-09-01', unidad_negocio_id: 'u2', items: 3 }]
  S.renderizarFichaRemitos()
  chequearMarcas(chk, 'remitos sin facturar', html('ficha-remitos-sin-facturar'), ['r_num', 'u2_nombre'])
  E.ficha.errorRemitos = marca('r_error')
  S.renderizarFichaRemitos()
  chequearMarcas(chk, 'remitos sin facturar (error de la RPC, tal cual)', html('ficha-remitos-sin-facturar'), ['r_error'])

  // ── Selector de orden, créditos, facturas del crédito ────────────────────
  S.crearSelectorOrdenFicha()
  const orden = html('ms-orden-ficha-panel')
  chk('selector de orden: solo las opciones literales', /Monto \(mayor primero\)/.test(orden) && !/data-xss/.test(orden))
  E.ficha.unidadId = 'u1'
  E.fichaCreditos = [{ id: marca('cr_id'), monto_disponible: 5, monto_original: 9, moneda: marca('cr_moneda') }, { id: 'cr2', monto_disponible: 1, monto_original: 2, moneda: 'ARS' }]
  S.abrirModalAplicarCreditoDesdeFicha()
  chequearMarcas(chk, 'créditos para elegir', html('lista-creditos-para-elegir'), ['cr_id', 'cr_moneda'])
  S.__setDatos('facturas_pendientes', [{ id: marca('fc_id'), numero_comprobante: marca('fc_num'), fecha_factura: '2026-09-01', saldo_pendiente: 7 }])
  await S.seleccionarCreditoParaAplicar({ id: 'cr2', monto_disponible: 1, moneda: marca('fc_moneda') })
  chequearMarcas(chk, 'select de facturas del crédito (label con formatearImporte crudo, escapado por poblarSelect)',
    html('campo-factura-credito'), ['fc_id', 'fc_num', 'fc_moneda'])
  chk('texto del crédito disponible va por textContent', el('aplicar-credito-texto').textContent.includes(marca('fc_moneda')))

  // ── Modal de pago: cuenta, FIFO, resumen ─────────────────────────────────
  E.cuentasPago = {
    propias: [{ id: marca('cp_id'), nombre: marca('cp_nombre'), medio: 'efectivo', moneda: 'ARS' }],
    empresa: [{ id: 'ce', nombre: marca('ce_nombre'), medio: 'efectivo', moneda: 'ARS' }],
  }
  el('campo-moneda-pago').value = 'ARS'
  S.__setVar('medioPagoSeleccionado', 'efectivo')
  S.actualizarSelectorCuentaPago()
  const ctas = html('campo-cuenta-pago-cc')
  chequearMarcas(chk, 'selector de cuenta del pago (Mis cuentas y Empresa)', ctas, ['cp_id', 'cp_nombre', 'ce_nombre'])
  chk('selector de cuenta del pago: se dibujaron los dos grupos', /label="Mis cuentas"/.test(ctas) && /label="Cuenta de Empresa"/.test(ctas))
  S.__setVar('facturasParaPago', [{ id: 'fp', numero: marca('fifo_num'), fecha: '2026-09-01', saldo: 10, checked: true, monto: 5 }])
  S.renderizarFilasFifo()
  chequearMarcas(chk, 'filas FIFO', html('lista-fifo'), ['fifo_num'])
  chk('resumen de aplicación: sin marcas (solo importes en ARS)', !/data-xss/.test(html('resumen-aplicacion')))

  // La moneda del pago (abrirModalPago está stubeada para que ningún render
  // lo abra): se afirman sus dos ramas sobre el cuerpo real.
  const cuerpoPago = extraerFn(scriptModulo(ARCHIVO), 'abrirModalPago')
  chk('estático: la moneda del pago con una sola moneda se escapa en value y en texto',
    cuerpoPago.includes("`<option value=\"${esc(monedasConDeuda[0]?.moneda || 'ARS')}\">${esc(monedasConDeuda[0]?.moneda || 'ARS')}</option>`"))
  chk('estático: la moneda del pago con varias monedas va por poblarSelect()',
    cuerpoPago.includes("poblarSelect('campo-moneda-pago', monedasConDeuda, s => ({ value: s.moneda, label: s.moneda }), '')"))

  // ── Importación por Excel: DOM y textContent ─────────────────────────────
  S.__setVar('importacionPendiente', { filas: [{ numeroFilaExcel: 2, razon_social: marca('xl_razon'), cuit: marca('xl_cuit'), direccion: null }], ignoradas: 1 })
  S.renderizarPreviewImportacion()
  const cuerpoTabla = el('qs:#tabla-preview-excel tbody')
  const celdas = cuerpoTabla.hijos.flatMap(tr => tr.hijos)
  chk('vista previa del Excel: se dibujaron celdas', celdas.length === 4)
  chk('vista previa del Excel: nada va por innerHTML', cuerpoTabla.innerHTML === '' && celdas.every(td => td.innerHTML === ''))
  chk('vista previa del Excel: los valores van por textContent', celdas.some(td => td.textContent === marca('xl_razon')) && celdas.some(td => td.textContent === marca('xl_cuit')))
  S.mostrarErroresImportacion([{ razon_social: marca('xe_razon'), motivo: marca('xe_motivo') }], [], 0)
  const lis = el('preview-errores-lista').hijos
  chk('errores del Excel: van por createTextNode', lis.length === 1 && lis[0].innerHTML === '' &&
    lis[0].hijos.some(h => h.nodo === 'texto' && h.textContent.includes(marca('xe_razon')) && h.textContent.includes(marca('xe_motivo'))))

  chk('ningún render navegó', S.__navegacion.length === 0, S.__navegacion.join(' | '))
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO — TODO el <script>
// ══════════════════════════════════════════════════════════════════════════

const HTML_PROPIO = 'HTML armado más arriba en la misma función, con esc()/importeHtml() de cada dato (sus interpolaciones las revisa el escáner)'
const NUM = 'número: conteo o índice calculado en el código (.length, índice de un map, Number())'
const IMPORTE = 'importeHtml() = esc(formatearImporte()): escapa por dentro (ejecutado con la moneda marcada)'
const SUAVES = 'formatearImporteCentavosSuaves(): escapa la moneda por dentro (ejecutada con marca) y el resto sale de formatearNumeroAr()'
const SIN_IMPORTE = 'htmlSinImporte(n): n es un conteo (contarSinImporte() = .length) y la función devuelve "" si no es > 0; su plantilla la revisa el escáner'
const BADGE = "badgeEstadoFactura(): devuelve '' si el estado no está en ESTADO_FACTURA_LABEL (constante del código); si está, es uno de los 5 valores del CHECK facturas_pendientes_estado_check (verificado el 22/09/2026)"
const CLASE = 'clase CSS: ternario de literales del código'
const fecha = (col) => `formatearFecha() de una columna DATE (${col}, verificado contra information_schema el 22/09/2026): solo dígitos y /`
const SEGURAS = {
  formatearImporteCentavosSuaves: {
    simbolo: "'$' o esc(moneda), armado en la línea de arriba",
    entero: 'formatearNumeroAr(): dígitos, puntos y signo',
    centavos: 'formatearNumeroAr(): dígitos',
  },
  badgeEstadoFactura: {
    estadoFactura: "llega acá solo si ESTADO_FACTURA_LABEL[estadoFactura] existe (return '' si no): con una clave del CHECK es una palabra en minúsculas; ejecutado con un estado marcado → ''",
    label: 'ESTADO_FACTURA_LABEL[x]: valor de una constante del código',
  },
  renderizarListaSaldos: {
    sufijoMoneda: "' · ' + esc(s.moneda), armado arriba", 'importeHtml(s.deuda, s.moneda)': IMPORTE, 'importeHtml(s.credito, s.moneda)': IMPORTE,
    'colorAvatar(g.proveedor.razon_social)': 'colorAvatar(): un elemento de PALETA_AVATAR (hex literales del código), nunca el nombre',
    saldosHtml: HTML_PROPIO, sinImporteHtml: SIN_IMPORTE,
  },
  renderizarResumenCC: {
    'formatearImporteCentavosSuaves(0)': SUAVES, 'formatearImporteCentavosSuaves(porMoneda[m].deuda, m)': SUAVES,
    'formatearImporteCentavosSuaves(porMoneda[m].credito, m)': SUAVES,
  },
  renderizarListaSinProveedor: {
    'colorAvatar(razon)': 'colorAvatar(): un elemento de PALETA_AVATAR (hex literales del código), nunca el nombre',
    'formatearFecha(f.fecha_factura)': fecha('facturas_pendientes.fecha_factura'), 'importeHtml(f.importe, f.moneda)': IMPORTE,
  },
  abrirModalDetallePago: {
    categoria: "' · ' + esc(fp.categorias.nombre), armado arriba",
    'importeHtml(a.monto_aplicado, gasto?.moneda)': IMPORTE, 'importeHtml(c.monto_original, c.moneda)': IMPORTE,
    'importeHtml(ac.monto_aplicado, c.moneda)': IMPORTE, 'importeHtml(c.monto_disponible, c.moneda)': IMPORTE,
    'importeHtml(gasto?.importe, gasto?.moneda)': IMPORTE, 'formatearFecha(gasto?.fecha_pago)': fecha('gastos.fecha_pago'),
    filasFacturas: HTML_PROPIO, bloquesCredito: HTML_PROPIO,
  },
  cargarPendientesAceptacion: {
    'colorAvatar(p.razon_social)': 'colorAvatar(): un elemento de PALETA_AVATAR (hex literales del código), nunca el nombre',
  },
  renderizarPadron: {
    sufijo: "' · ' + esc(l.moneda), armado arriba", 'importeHtml(l.neto, l.moneda)': IMPORTE, 'importeHtml(-l.neto, l.moneda)': IMPORTE,
    'colorAvatar(p.razon_social)': 'colorAvatar(): un elemento de PALETA_AVATAR (hex literales del código), nunca el nombre',
    saldoHtml: HTML_PROPIO, 'htmlSinImporte(sinImporte)': SIN_IMPORTE,
  },
  renderizarListaHistorial: {
    claseMonto: CLASE, 'importeHtml(Math.abs(monto), m.moneda)': IMPORTE, badgeEstado: BADGE,
    'formatearFecha(m.fecha)': fecha('v_cuenta_corriente_movimientos.fecha'), montoHtml: HTML_PROPIO,
  },
  renderizarFichaBanner: {
    dis: "literal 'disabled' o ''", 'htmlSinImporte(sinImporte)': SIN_IMPORTE, avisoSinImporte: HTML_PROPIO,
    acciones: HTML_PROPIO, etiqueta: "literal + esc(s.moneda), armado arriba", 'importeHtml(monto, s.moneda)': IMPORTE,
  },
  renderizarFichaMovimientos: {
    volverFicha: 'encodeURIComponent(location.href), armado arriba (ejecutado con una URL marcada)',
    'importeHtml(Math.abs(saldoAcum), m.moneda)': IMPORTE, badgeEstado: BADGE,
    'formatearFecha(m.fecha)': fecha('v_cuenta_corriente_movimientos.fecha'), claseMonto: CLASE,
    'importeHtml(Math.abs(monto), m.moneda)': IMPORTE, lineaSaldo: HTML_PROPIO, iconos: HTML_PROPIO,
  },
  htmlSinImporte: { n: 'número: la función devuelve "" si n no es > 0; los call sites pasan contarSinImporte() (.length)' },
  htmlFilaSinImporte: {
    "cantidades.map(c => esc(textoCantidadInsumo(c))).join('<br>')": 'cada elemento pasa por esc(); el separador es un literal',
    'importeHtml(total, m.moneda)': IMPORTE, "badgeEstadoFactura('sin_importe')": 'badgeEstadoFactura() con un literal del código',
    'formatearFecha(m.fecha)': fecha('v_cuenta_corriente_movimientos.fecha'), cantidadesHtml: HTML_PROPIO, formHtml: HTML_PROPIO,
  },
  htmlRemitosSinFacturar: {
    'filas.length': NUM, 'formatearFecha(r.fecha)': fecha('remitos_sin_facturar() devuelve fecha date'), items: 'Number(r.items) || 0',
  },
  renderizarFichaRemitos: {
    'htmlRemitosSinFacturar(estado.ficha.remitos, { unidadId: estado.ficha.unidadId, error: estado.ficha.errorRemitos })':
      'htmlRemitosSinFacturar() escapa adentro (ejecutada con marcas, también el error)',
  },
  abrirModalAplicarCreditoDesdeFicha: {
    'importeHtml(c.monto_disponible, c.moneda)': IMPORTE, 'importeHtml(c.monto_original, c.moneda)': IMPORTE,
  },
  actualizarSelectorCuentaPago: {
    "propias.map(opciones).join('')": 'opciones() es la flecha de plantilla de la línea de arriba, con esc() en cada dato (sus interpolaciones las revisa el escáner; ejecutada con marcas)',
    "empresa.map(opciones).join('')": 'opciones() es la flecha de plantilla de la línea de arriba, con esc() en cada dato (sus interpolaciones las revisa el escáner; ejecutada con marcas)',
  },
  renderizarFilasFifo: {
    i: 'índice del map', 'formatearFecha(f.fecha)': fecha('sugerir_facturas_fifo() devuelve fecha_factura date'), 'importeHtml(f.saldo)': IMPORTE,
  },
  actualizarResumenAplicacion: {
    'importeHtml(sumaAplicada)': IMPORTE, 'importeHtml(monto)': IMPORTE, 'importeHtml(excedente)': IMPORTE,
    html: HTML_PROPIO,
  },
  '(top-level)': {
    'importeHtml(total, moneda)': IMPORTE + ' — la línea de "Total a cargar" del listener de input de "Cargar importe"',
  },
}
const SEGURAS_REGEX = {}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

function esMapDePlantilla(expr) {
  const e = norm(expr)
  if (!/\.join\((''|"")\)$/.test(e)) return false
  return /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*`/.test(e) ||
         /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*\{.*return\s*`/.test(e)
}

// posicionesDeValor() de clasificar.js, pero desenvolviendo SOLO paréntesis
// que envuelven la expresión ENTERA.
function hojas(expr) {
  const e = norm(expr.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n'))
  if (!e) return []
  if (e.startsWith('(')) {
    let cierre = null
    try { cierre = cuerpoDesde(e, 0) } catch { cierre = null }
    if (cierre && cierre.length === e.length) return hojas(e.slice(1, -1))
  }
  for (const op of ['?', '||', '??', '&&', '+']) {
    const partes = partirTopLevel(e, op)
    if (partes.length > 1) {
      if (op === '?') return partirTopLevel(partes.slice(1).join('?'), ':').flatMap(hojas)
      if (op === '&&') return hojas(partes[partes.length - 1])
      return partes.flatMap(hojas)
    }
  }
  return [e]
}

const USADAS = new Set()
function motivoHoja(hoja, fn) {
  const c = clasificar(hoja, { escape: 'esc', seguras: [], segurasRegex: [] })
  if (c.ok) return c.motivos[0]
  if (esMapDePlantilla(hoja)) return 'plantilla anidada devuelta por un map: sus interpolaciones se verifican aparte'
  const tabla = SEGURAS[fn] || {}
  for (const [k, v] of Object.entries(tabla)) if (norm(k) === norm(hoja)) { USADAS.add(fn + '::' + norm(k)); return v }
  for (const [re, v] of (SEGURAS_REGEX[fn] || [])) if (re.test(norm(hoja))) { USADAS.add(fn + '::' + re); return v }
  return null
}

function expresionCompleta(linea) {
  const lineas = FUENTE.split('\n')
  const off = lineas.slice(0, linea - 1).join('\n').length + (linea > 1 ? 1 : 0)
  const m = /\.(innerHTML|outerHTML)\s*=(?!=)/.exec(FUENTE.slice(off))
  if (!m) return null
  const desde = off + m.index + m[0].length
  for (let k = desde; k < Math.min(FUENTE.length, desde + 20000); k++) {
    const c = FUENTE[k]
    if (c !== ';' && c !== '}' && c !== '\n') continue
    const txt = FUENTE.slice(desde, k)
    if (!txt.trim()) continue
    try { new Function(`return (${txt})`) } catch { continue }
    if (c === '\n') {
      const resto = FUENTE.slice(k + 1).replace(/^\s*(\/\/[^\n]*\n\s*)*/, '')
      if (/^[.?:+|&)\]]/.test(resto)) continue
    }
    return txt
  }
  return null
}

// Las plantillas SIN HTML propio cuyo valor TERMINA en un innerHTML: las que
// devuelve una flecha o un return, y las que son una hoja de la asignación.
const esHtmlT = (x) => { for (let c = x; c; c = c.padre) if (c.esHtmlPropio) return true; return false }
function plantillasSinHtml(expr) {
  const out = []
  let t
  try { t = analizar(expr, 0, expr).templates } catch { t = [] }
  for (const x of t) {
    if (esHtmlT(x)) continue
    if (/(=>|return)\s*$/.test(expr.slice(0, x.inicio))) out.push(x)
  }
  for (const h of hojas(expr)) {
    if (!/^`/.test(h)) continue
    let th
    try { th = analizar(h, 0, h).templates } catch { continue }
    const raiz = th.find(x => x.inicio === 0)
    if (raiz && !esHtmlT(raiz)) out.push(raiz)
  }
  return out
}

if (SOLO !== 'render') {
  const r = interpolaciones(ARCHIVO)
  const rangos = []
  for (const m of FUENTE.matchAll(/(?:^|\n)(\s*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nombre = m[2]
    const ini = m.index + m[0].indexOf('function')
    const abre = FUENTE.indexOf('(', ini)
    const params = cuerpoDesde(FUENTE, abre)
    const llave = FUENTE.indexOf('{', abre + params.length)
    const cuerpo = cuerpoDesde(FUENTE, llave)
    const desde = FUENTE.slice(0, ini).split('\n').length
    rangos.push({ nombre, desde, hasta: desde + FUENTE.slice(ini, llave + cuerpo.length).split('\n').length - 1 })
  }
  const funcionDe = (linea) => {
    let mejor = null
    for (const g of rangos) if (linea >= g.desde && linea <= g.hasta && (!mejor || g.hasta - g.desde < mejor.hasta - mejor.desde)) mejor = g
    return mejor ? mejor.nombre : '(top-level)'
  }

  const enHtml = r.interpolaciones.filter(i => i.html)
  const malas = []
  for (const x of enHtml) {
    const fn = funcionDe(x.linea)
    for (const h of hojas(x.expr)) if (!motivoHoja(h, fn)) malas.push(`línea ${x.linea} (${fn}): ${norm(h).slice(0, 120)}`)
  }
  chk('estático: ninguna interpolación de HTML queda sin escapar ni justificar', malas.length === 0, '\n      ' + malas.join('\n      '))

  const malasAsig = []
  const asignaciones = r.asignaciones.map(a => ({ ...a, expr: expresionCompleta(a.linea) ?? a.expr }))
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const h of hojas(a.expr)) if (!motivoHoja(h, fn)) malasAsig.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
  }
  chk('estático: ninguna asignación a innerHTML queda sin escapar ni justificar', malasAsig.length === 0, '\n      ' + malasAsig.join('\n      '))

  const malasSinHtml = []
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const x of plantillasSinHtml(a.expr)) {
      for (const it of x.interpolaciones) {
        for (const h of hojas(it.expr)) if (!motivoHoja(h, fn)) malasSinHtml.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
      }
    }
  }
  chk('estático: las plantillas SIN HTML propio que terminan en un innerHTML están escapadas o justificadas',
    malasSinHtml.length === 0, '\n      ' + malasSinHtml.join('\n      '))
  const prueba1 = plantillasSinHtml("items.map(i => `${i.crudo}`).join('')")
  const prueba2 = plantillasSinHtml("cond ? `Hola ${x.crudo}` : ''")
  chk('estático: el chequeo de plantillas sin HTML propio encuentra la hoja cruda de un map de prueba',
    prueba1.length === 1 && prueba1[0].interpolaciones.some(it => it.expr.trim() === 'i.crudo'))
  chk('estático: el chequeo de plantillas sin HTML propio encuentra la hoja cruda de una asignación directa de prueba',
    prueba2.length === 1 && prueba2[0].interpolaciones.some(it => it.expr.trim() === 'x.crudo'))

  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length > 110, `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 35, `solo ${r.asignaciones.length}`)
  const conEsc = enHtml.filter(i => /^esc\(/.test(i.expr.trim())).length
  chk('estático: hay escapes de verdad, no todo justificado por lista', conEsc > 45, `${conEsc}`)
  const huerfanas = [
    ...Object.entries(SEGURAS).flatMap(([fn, t]) => Object.keys(t).map(k => fn + '::' + norm(k))),
    ...Object.entries(SEGURAS_REGEX).flatMap(([fn, t]) => t.map(([re]) => fn + '::' + re)),
  ].filter(k => !USADAS.has(k))
  chk('estático: ninguna hoja de la lista de seguras quedó huérfana', huerfanas.length === 0, huerfanas.join(' | '))

  // Los helpers que escapan POR DENTRO, en su cuerpo: sacarles el esc() rompe
  // todo call site a la vez (los renders lo ven; esto lo nombra).
  const cuerpoDe = (n) => { try { return extraerFn(FUENTE, n) } catch (e) { chk(`estático: existe la función ${n}`, false, e.message); return '' } }
  chk('estático: importeHtml() es esc(formatearImporte(...))', /return esc\(formatearImporte\(importe, moneda\)\)/.test(cuerpoDe('importeHtml')))
  chk('estático: formatearImporte() queda en TEXTO PLANO (no llama a esc)', !/esc\(/.test(cuerpoDe('formatearImporte')))
  chk('estático: textoCantidadInsumo() queda en TEXTO PLANO (se escapa su resultado)', !/esc\(/.test(cuerpoDe('textoCantidadInsumo')))
  chk("estático: formatearImporteCentavosSuaves() escapa la moneda por dentro", cuerpoDe('formatearImporteCentavosSuaves').includes("const simbolo = moneda === 'ARS' ? '$' : esc(moneda)"))
  // colorAvatar() va dentro de un style: tiene que devolver SIEMPRE un color de
  // la paleta del código, nunca algo derivado del texto.
  chk('estático: colorAvatar() devuelve un elemento de PALETA_AVATAR', /return PALETA_AVATAR\[Math\.abs\(hash\) % PALETA_AVATAR\.length\]\s*\}$/.test(cuerpoDe('colorAvatar')))
  chk('estático: PALETA_AVATAR son hex literales', /const PALETA_AVATAR = \[('#[0-9A-F]{6}'(, )?)+\]\n/.test(FUENTE))

  // El único `innerHTML +=` del archivo: el aviso numérico del resumen.
  const masIgual = [...scriptModulo(ARCHIVO).matchAll(/innerHTML\s*\+=\s*([^\n]*)/g)].map(m => m[1].trim())
  chk('estático: el único innerHTML += es htmlSinImporte(sinImporte) de un conteo',
    masIgual.length === 1 && masIgual[0] === 'htmlSinImporte(sinImporte)' &&
    cuerpoDe('renderizarResumenCC').includes('const sinImporte = estado.listaSaldos.reduce((n, g) => n + contarSinImporte(g.proveedor_id, g.unidad_negocio_id), 0)'),
    masIgual.join(' | '))
  chk('estático: htmlSinImporte() corta si n no es > 0', cuerpoDe('htmlSinImporte').includes("if (!(n > 0)) return ''"))

  // ── Contexto ─────────────────────────────────────────────────────────────
  const URL_SEGURAS = { volverFicha: 'const volverFicha = encodeURIComponent(location.href), en la misma función (verificado abajo)' }
  const STYLE_SEGUROS = /^colorAvatar\([\w.]+\)$/
  const sinComillas = [], enEvento = [], enUrl = [], enStyle = []
  const usadasCtx = new Set()
  let styleAvatar = 0
  for (const x of enHtml) {
    const ultimaEtiqueta = x.antes.lastIndexOf('<')
    if (ultimaEtiqueta < x.antes.lastIndexOf('>')) continue
    const tramo = x.antes.slice(ultimaEtiqueta)
    const dentroDeAtributo = (tramo.match(/"/g) || []).length % 2 === 1
    if (!dentroDeAtributo && /[\w-]+\s*=\s*$/.test(tramo)) sinComillas.push(x.linea)
    if (!dentroDeAtributo) continue
    const attr = (tramo.match(/([\w-]+)\s*=\s*"[^"]*$/) || [])[1] || ''
    const e = norm(x.expr)
    if (/^on/i.test(attr)) enEvento.push(`${x.linea} (${attr})`)
    if (/^(href|src|action|formaction|xlink:href)$/i.test(attr) && !/^encodeURIComponent\(/.test(e)) {
      if (URL_SEGURAS[e]) usadasCtx.add('url::' + e); else enUrl.push(`${x.linea} (${attr}: ${e})`)
    }
    if (/^style$/i.test(attr)) {
      // Solo el color del avatar, y solo como valor de background.
      if (STYLE_SEGUROS.test(e) && /style="background:$/.test(tramo.slice(tramo.lastIndexOf('style=')))) styleAvatar++
      else enStyle.push(`${x.linea}: ${e}`)
    }
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae en un href/src sin encodeURIComponent (salvo las justificadas)', enUrl.length === 0, enUrl.join(', '))
  chk('estático: en un style solo entra colorAvatar() como background', enStyle.length === 0, enStyle.join(', '))
  chk('estático: los cuatro avatares con color se reconocieron (si no, el chequeo de style no mira nada)', styleAvatar === 4, String(styleAvatar))
  const huerfanasCtx = Object.keys(URL_SEGURAS).map(k => 'url::' + k).filter(k => !usadasCtx.has(k))
  chk('estático: ninguna excepción de contexto quedó huérfana', huerfanasCtx.length === 0, huerfanasCtx.join(' | '))
  // Los href a gastos.html: prefijo literal, valores codificados y el atributo
  // entre comillas DOBLES (encodeURIComponent no escapa la simple).
  const hrefsGastos = FUENTE.split('href="gastos.html?factura=${encodeURIComponent(').length - 1
  const hrefsTotales = [...FUENTE.matchAll(/href\s*=\s*["'`]?\s*gastos\.html/g)].length
  chk('estático: los cuatro href a gastos.html van entre comillas dobles con prefijo fijo + encodeURIComponent',
    hrefsGastos === 4 && hrefsTotales === 4, `${hrefsGastos} con el patrón, ${hrefsTotales} en total`)
  chk('estático: facturas sin proveedor: volver literal codificado',
    FUENTE.split('<a href="gastos.html?factura=${encodeURIComponent(f.id)}&volver=${encodeURIComponent(\'cuentas-corrientes.html\')}"').length === 3)
  chk('estático: ficha: volver = encodeURIComponent(location.href)',
    FUENTE.split('<a href="gastos.html?factura=${encodeURIComponent(m.factura_pendiente_id)}&volver=${volverFicha}"').length === 3 &&
    cuerpoDe('renderizarFichaMovimientos').includes('const volverFicha = encodeURIComponent(location.href)'))

  // Otros sinks que el escáner no mira.
  const script = scriptModulo(ARCHIVO)
  chk('estático: no hay insertAdjacentHTML, outerHTML, document.write ni createContextualFragment',
    !/insertAdjacentHTML|\.outerHTML\s*=|document\.write|createContextualFragment/.test(script))

  // Navegación y parámetros de la URL.
  const lecturasUrl = [...script.matchAll(/URLSearchParams|location\.search|location\.hash/g)].length
  chk('estático: la URL se lee UNA sola vez (el deep link de init)', lecturasUrl === 2 && script.includes('const params = new URLSearchParams(location.search)'))
  const cuerpoInit = cuerpoDe('init')
  chk('estático: ?proveedor= solo abre la ficha si es un id del padrón',
    cuerpoInit.includes('const prov = estado.maestros.proveedores.find(p => p.id === proveedorURL)') &&
    cuerpoInit.includes('if (prov) await abrirFicha(proveedorURL, unidadURL, prov.razon_social)'))
  chk('estático: los parámetros de la URL no se usan en ningún otro lado',
    [...script.matchAll(/\bproveedorURL\b/g)].length === 4 && [...script.matchAll(/\bunidadURL\b/g)].length === 2)
  const navs = [...script.matchAll(/(?:location\.href\s*=|location\.replace\(|location\.assign\(|window\.open\()\s*([^\n;)]*)/g)].map(m => norm(m[1]))
  chk('estático: la única navegación es la literal al dashboard', navs.length === 1 && navs[0] === "'../dashboard.html'", navs.join(' | '))
  const historia = [...script.matchAll(/history\.(pushState|replaceState)\(([^)]*)\)/g)].map(m => norm(m[2]))
  chk('estático: history solo recibe la query de la ficha o location.pathname',
    historia.length === 3 && historia.filter(h => h === "null, '', qs").length === 2 && historia.includes("null, '', location.pathname") &&
    cuerpoDe('sincronizarUrlFicha').includes('const qs = `?proveedor=${proveedorId}`'), historia.join(' | '))
  chk('estático: ningún .src ni .href se asigna en runtime', !/\.(src|href)\s*=(?!=)/.test(script))

  const utils = require('fs').readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
  chk('control: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(utils) && !/toast\.innerHTML\s*=/.test(utils))

  if (process.env.INFORME) {
    console.log(`INFORME: ${r.interpolaciones.length} interpolaciones, ${enHtml.length} en HTML (${conEsc} empiezan con esc), ${r.asignaciones.length} asignaciones a innerHTML (+1 innerHTML +=)`)
  }
}

for (const h of HALLAZGOS_ABIERTOS) console.log(`  (hallazgo abierto declarado: ${h})`)
fin()
