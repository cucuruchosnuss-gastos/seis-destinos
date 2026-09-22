// Barrido de escapado de modulos/gastos.html — el archivo ENTERO.
//
// El barrido se cerró en 9a0e9a8 (16/09/2026) y la prueba que lo demostraba
// se perdió con la sesión. Esta suite lo BLOQUEA, con el mismo método que
// test-stock-xss.js y test-materia-prima-xss.js, en DOS MITADES que no se
// reemplazan entre sí:
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO
//     (`"><b data-xss="campo">`), con datos que imitan lo que devuelve la base:
//     el listado, los filtros, el total, el detalle y los dos formularios de
//     edición (gasto y factura), el resumen del wizard (normal y pendiente),
//     las grillas, los selects, el aviso de duplicados, el aviso de después
//     de guardar, "Facturas ingresadas sin gasto", Proyectos del Taller, el
//     buscador de proveedor y la sección del comprobante (foto firmada).
//     Es lo único que prueba que esc() existe, que se llama y que escapa el
//     argumento correcto.
//  2. CHEQUEO ESTÁTICO sobre TODO el <script>: cada ${...} de una plantilla que
//     arma HTML, cada asignación a innerHTML (la expresión ENTERA, no la
//     primera línea) y cada plantilla sin HTML propio que termina adentro de un
//     innerHTML tiene que estar escapada o figurar en la lista de seguras CON SU
//     MOTIVO. La lista es POR FUNCIÓN y una entrada que no se usa es rojo.
//     Más el contexto: atributo sin comillas, on*=, href/src, style.
//  3. LOS SINKS DE NAVEGACIÓN: ?volver= (volverOrigenSiCorresponde) y el
//     data-url del aviso de duplicados. No son innerHTML, pero un
//     "javascript:" ahí corre código en la sesión de quien toca "Volver".
//
// Las funciones del sandbox se juntan por CLAUSURA desde los renders: se
// ejecuta el código real de cada helper, no una copia.
//
//   node pruebas/test-gastos-xss.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-xss.js
//   SOLO=render | SOLO=estatico

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { interpolaciones, analizar } = require('./escaner-interpolaciones')
const { clasificar, partirTopLevel } = require('./clasificar')
const { extraerFn, cuerpoDesde } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const SOLO = process.env.SOLO || ''
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// HALLAZGOS ABIERTOS: sinks encontrados por esta suite y todavía sin arreglar.
// Cada uno invierte SU chequeo (se afirma que el sink sigue ahí, así la suite
// queda verde sobre el estado actual y no se olvida) y se imprime. Arreglarlo
// sin sacarlo de acá da ROJO; sacarlo de acá sin arreglarlo, también.
const HALLAZGOS_ABIERTOS = new Set([])

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

// Lo que define el preludio y NO se extrae: red, historial del navegador y
// cableados que acá no aportan nada al escapado.
const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha',
  'cargarLista', 'aplicarBusquedaLocal', 'activarFiltroFecha', 'irASubpaso', 'seleccionarDestino',
  'seleccionarVehiculo', 'cargarCuentasDe', 'cargarCuentaPorId', 'resolverEmpresa',
  'detectarDuplicadoEdicion', 'mostrarFormularioEdicionGasto', 'mostrarFormularioEdicionFactura',
  'mostrarFormularioInteres', 'abrirModalAnularGasto', 'mostrarDetalleFactura', 'mostrarDetalleGasto',
  'ubicarPanelSugerencias', 'filtrarProveedores', 'seleccionarProveedorEdicion',
])
// Los renders que sí se ejecutan y además se stubean arriba (porque otros
// los llaman) se agregan a mano al sandbox.
const EJECUTAR_TAMBIEN = [
  'mostrarDetalleGasto', 'mostrarFormularioEdicionGasto', 'mostrarDetalleFactura',
  'mostrarFormularioEdicionFactura', 'mostrarFormularioInteres',
]

const RENDERS = [
  'esc', 'poblarSelect', 'poblarSelectMoneda', 'poblarSelectProyecto', 'crearMultiselect', 'crearSelectorOrden',
  'renderizarFiltros', 'renderizarTotalGastos', 'renderizarCardGasto',
  'htmlFilasProyectos', 'renderizarProyectos', 'htmlSeccionComprobante',
  'htmlAvisoDuplicado', 'pintarAvisoDuplicado', 'renderizarAvisoDuplicado', 'volverOrigenSiCorresponde',
  'actualizarBreadcrumb', 'renderizarGrillaDestino', 'renderizarGrillaVehiculos', 'renderizarGrillaCategorias',
  'poblarSelectEmpleados', 'actualizarSelectorCuentaGasto', 'actualizarSelectorCuentaEdicion',
  'mostrarEstadoOcr', 'htmlAvisoPostGasto', 'renderizarAvisoPostGasto',
  'htmlIngresosSinGasto', 'renderizarIngresosSinGasto', 'renderizarSugerenciasProveedorEn',
  'renderizarResumen', 'renderizarResumenPendiente', 'opcionesProyectoEdicion',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  // Constantes top-level que son CÓDIGO de inicialización (leen la URL o la
  // base al cargar), no datos: no entran al sandbox.
  for (const c of ['idGastoURL', 'idFacturaURL']) posConst.delete(c)
  const fns = new Set(), consts = []
  const cola = [...RENDERS, ...EJECUTAR_TAMBIEN]
  const forzadas = new Set(EJECUTAR_TAMBIEN)
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
    if (fns.has(n) || (STUBS.has(n) && !forzadas.has(n))) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      dataset: {}, style: {}, options: { length: 0 }, onclick: null,
      querySelector: () => nuevoEl('hijo'), querySelectorAll: () => [], addEventListener(){}, removeEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, closest: () => null, setSelectionRange(){}, remove(){}, appendChild(){},
      getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, height: 0 }), parentElement: null,
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    activeElement: null, body: nuevoEl('body'),
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => nuevoEl(s), addEventListener(){},
  }
  var __navegacion = []
  var location = { search: '', href: 'https://x.test/modulos/gastos.html', origin: 'https://x.test' }
  var window = {
    scrollTo(){}, addEventListener(){}, removeEventListener(){}, open(u){ __navegacion.push(['open', u]) },
    innerWidth: 400, innerHeight: 800, visualViewport: null, matchMedia: () => ({ matches: false }),
    location: { get href() { return location.href }, set href(v) { __navegacion.push(['href', v]) }, origin: 'https://x.test' },
  }
  var lucide = { createIcons(){} }
  var URL = globalThis.URL
  URL.createObjectURL = () => 'blob:https://x.test/0000'
  var __llamadas = { errores: [], exitos: [] }
  var __datos = {}
  var __rpc = {}
  function __consulta(tabla) {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'range', 'not', 'or', 'ilike']) q[k] = () => q
    q.maybeSingle = () => q
    q.single = () => q
    q.then = (res, rej) => Promise.resolve({ data: __datos[tabla] ?? [], error: null }).then(res, rej)
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc: async (n) => (__rpc[n] ?? { data: null, error: null }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  // formatearFecha de js/utils.js, con su cuerpo real.
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  function cargarLista() {} function aplicarBusquedaLocal() {} function activarFiltroFecha() {}
  function irASubpaso() {} function seleccionarDestino() {} function seleccionarVehiculo() {}
  async function cargarCuentasDe() {} async function cargarCuentaPorId() {}
  async function resolverEmpresa() { return estado.idEmpresa }
  function detectarDuplicadoEdicion() {} function abrirModalAnularGasto() {}
  function ubicarPanelSugerencias() {} function filtrarProveedores() { return [] } function seleccionarProveedorEdicion() {}
  // Las selecciones del wizard son let del módulo: acá var, con setter.
  var cargaListaId = 0
  var categoriaSeleccionada = null, tipDocSeleccionado = null, medioPagoSeleccionado = null
  var unidadSeleccionada = null, vehiculoSeleccionado = null, vehiculoFueElegido = false, viaVehiculos = false
  var proveedorSeleccionado = null, proveedorSeleccionadoEsAuto = false, contextoProveedorNuevo = 'wizard'
  var gastoAAnularId = null, turnoDuplicadoEdicion = 0, detectorEdicionFactura = null, turnoFoto = 0
`

const RETORNO = 'estado, proyectosAdmin, MEDIOS_PAGO_LABEL, __els, __el(id){ return document.getElementById(id) }, __llamadas, __navegacion, ' +
  '__setDatos(t, d){ __datos[t] = d }, __setRpc(n, r){ __rpc[n] = r }, __setVar(k, v){ eval(k + " = v") }, __setSearch(s){ location.search = s }'

if (SOLO !== 'estatico') {
  let S
  try {
    const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
    S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
  } catch (e) {
    chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  }
  if (S) esperas.push(correrRenders(S))
}

async function correrRenders(S) {
  const el = (id) => S.__el(id)
  const html = (id) => el(id).innerHTML
  const E = S.estado

  // ── esc ──────────────────────────────────────────────────────────────────
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, S.esc(crudo) === esperado, S.esc(crudo))
  }
  chk('esc no convierte null en la palabra null', S.esc(null) === '' && S.esc(undefined) === '')

  E.miRolApp = 'super_admin'
  E.miEmpleadoId = 'e-yo'
  E.sesion = { user: { id: 'uid-yo' } }

  // Maestros: TODO nombre es texto que alguien cargó.
  E.maestros.unidades = [{ id: marca('uni_id'), nombre: marca('uni_nombre') }]
  E.maestros.vehiculos = [{ id: marca('veh_id'), nombre: marca('veh_nombre'), patente: marca('veh_patente'), unidad_negocio_id: 'u1' }]
  E.maestros.categorias = [{ id: marca('cat_id'), nombre: marca('cat_nombre') }]
  E.maestros.empleados = [
    { id: marca('emp_id'), nombre: marca('emp_nombre'), tipo: 'naaloo' },
    { id: marca('adm_id'), nombre: marca('adm_nombre'), tipo: 'admin' },
  ]
  E.maestros.proyectos = [{ id: marca('proy_id'), nombre: marca('proy_nombre') }]
  E.maestros.proveedores = [{ id: marca('prov_id'), razon_social: marca('prov_razon'), nombre_fantasia: marca('prov_fantasia'), cuenta_corriente: true }]
  E.maestros.monedas = ['ARS', marca('moneda')]

  // ── Selects ──────────────────────────────────────────────────────────────
  S.poblarSelect('sel-prueba', [{ v: marca('ps_value'), l: marca('ps_label') }], x => ({ value: x.v, label: x.l }), marca('ps_placeholder'))
  chequearMarcas(chk, 'poblarSelect', html('sel-prueba'), ['ps_value', 'ps_label', 'ps_placeholder'])
  S.poblarSelectMoneda('campo-moneda', marca('moneda_actual'))
  chequearMarcas(chk, 'selector de moneda', html('campo-moneda'), ['moneda', 'moneda_actual'])
  S.poblarSelectProyecto()
  chequearMarcas(chk, 'selector de proyecto del wizard', html('campo-proyecto'), ['proy_id', 'proy_nombre'])
  S.poblarSelectEmpleados('u1')
  chequearMarcas(chk, 'selector de empleado del wizard', html('campo-empleado'), ['emp_id', 'emp_nombre', 'adm_id', 'adm_nombre'])

  // Cuentas del wizard y de la edición: propias + de Empresa.
  E.cuentasPorId = {
    c1: { id: marca('cta_id'), empleado_id: 'e-cta', nombre: marca('cta_nombre'), medio: 'efectivo', moneda: 'ARS', activa: true },
    c2: { id: 'c2', empleado_id: 'e-empresa', nombre: marca('cta_emp_nombre'), medio: 'efectivo', moneda: 'ARS', activa: true },
  }
  E.idEmpresa = 'e-empresa'; E.nombreEmpresa = marca('empresa_nombre')
  S.__setVar('medioPagoSeleccionado', 'efectivo')
  el('campo-empleado').value = 'e-cta'
  el('campo-moneda').value = 'ARS'
  await S.actualizarSelectorCuentaGasto()
  chequearMarcas(chk, 'selector de cuenta del wizard', html('campo-cuenta'), ['cta_id', 'cta_nombre', 'cta_emp_nombre', 'empresa_nombre'])
  el('edit-medio-pago').value = 'efectivo'
  el('edit-empleado').value = 'e-cta'
  el('edit-moneda').value = 'ARS'
  await S.actualizarSelectorCuentaEdicion()
  chequearMarcas(chk, 'selector de cuenta de la edición', html('edit-cuenta'), ['cta_id', 'cta_nombre', 'cta_emp_nombre', 'empresa_nombre'])

  // ── Filtros del listado (con multiselects de unidades y categorías) ───────
  E.filtros.busqueda = marca('filtro_busqueda')
  E.filtros.fecha_desde = marca('filtro_desde')
  E.filtros.fecha_hasta = marca('filtro_hasta')
  // crearMultiselect escribe en el panel.querySelector('.multiselect__opciones'):
  // se capturan todos los hijos que devuelve.
  const opcionesMs = []
  for (const id of ['ms-periodo-panel', 'ms-unidad-panel', 'ms-categoria-panel', 'ms-vehiculo-panel', 'ms-medio-pago-panel']) {
    const p = el(id)
    p.querySelector = () => { const h = { innerHTML: '' }; opcionesMs.push(h); return Object.assign(h, { addEventListener(){} }) }
    el(id.replace('-panel', '-boton')).closest = () => el('contenedor-ms')
  }
  S.renderizarFiltros([{ id: marca('fu_id'), nombre: marca('fu_nombre') }])
  chequearMarcas(chk, 'barra de filtros', html('contenedor-filtros'), ['filtro_busqueda', 'filtro_desde', 'filtro_hasta'])
  const htmlMs = opcionesMs.map(h => h.innerHTML).join('\n')
  chequearMarcas(chk, 'opciones de los multiselect de filtro', htmlMs, ['fu_id', 'fu_nombre', 'cat_id', 'cat_nombre', 'veh_id', 'veh_nombre'])
  chk('multiselect: se dibujaron opciones (si no, el chequeo no mira nada)', /multiselect__opcion/.test(htmlMs))

  // ── Total y listado ──────────────────────────────────────────────────────
  E.filtros.rangoRapido = 'mes'
  const gasto = {
    id: marca('g_id'), fecha: '2026-09-10', fecha_pago: '2026-09-11', tipo_doc: marca('g_tipo'), numero_doc: marca('g_numero'),
    razon_social: marca('g_razon'), importe: 1500.5, moneda: marca('g_moneda'), medio_pago: 'efectivo', estado: marca('g_estado'),
    lugar_servicio: marca('g_lugar'), descripcion: marca('g_descripcion'), observaciones: marca('g_obs'), kilometraje: 1200,
    foto_url: 'uid-yo/' + marca('g_foto'), cuenta_id: 'c1', empleado_id: 'e-otro', proveedor_id: 'p1',
    anulado_por: null, anulado_en: null, motivo_anulacion: null,
    categorias: { id: 'c', nombre: marca('g_cat') }, empleados: { id: 'e-otro', nombre: marca('g_emp') },
    unidades_negocio: { id: 'u', nombre: marca('g_unidad') }, vehiculos: { id: 'v', nombre: marca('g_veh'), patente: marca('g_patente') },
    proyectos: { id: 'pr', nombre: marca('g_proy') },
  }
  const anulado = { ...gasto, id: 'g2', estado: 'anulado', unidades_negocio: null, razon_social: marca('g2_razon'),
    anulado_por: marca('emp_id'), anulado_en: '2026-09-12T10:00:00Z', motivo_anulacion: marca('g2_motivo') }
  S.renderizarTotalGastos([gasto, anulado])
  chk('total del listado: se dibujó', /Gastos del mes/.test(html('total-gastos')))
  const card = S.renderizarCardGasto(gasto)
  chequearMarcas(chk, 'tarjeta del listado (unidad desconocida → iniciales)', card, ['g_id', 'g_razon', 'g_cat', 'g_emp', 'g_estado', 'g_moneda'])
  const card2 = S.renderizarCardGasto(anulado)
  chequearMarcas(chk, 'tarjeta del listado (vehículos, anulado)', card2, ['g2_razon', 'g_cat', 'g_emp', 'g_moneda'])
  chk('tarjeta: un nombre de unidad sin logo no entra al src', !/src="[^"]*data-xss/.test(card))
  // Las iniciales salen de los primeros caracteres de la razón social: con
  // '<x y' dan '<Y'. Se escapan como cualquier otro pedazo del dato.
  const card3 = S.renderizarCardGasto({ ...gasto, razon_social: '<x y', unidades_negocio: { nombre: 'Desconocida' } })
  chk('tarjeta: las iniciales del avatar se escapan', card3.includes('&lt;Y</span>') && !card3.includes('<Y'))
  // Con una unidad CON logo, el nombre va al alt (escapado): el nombre tiene
  // que ser una clave de LOGOS_EMPRESA, así que no lleva caracteres raros.
  const card4 = S.renderizarCardGasto({ ...gasto, unidades_negocio: { nombre: 'Cucuruchos Nuss' } })
  chk('tarjeta: con logo, el src es la ruta del código', /<img src="\.\.\/logo-[a-z-]+\.png" alt="Cucuruchos Nuss"/.test(card4))

  // ── Proyectos del Taller ─────────────────────────────────────────────────
  S.proyectosAdmin.lista = [
    { id: marca('pa_id'), nombre: marca('pa_nombre'), activo: true },
    { id: marca('pc_id'), nombre: marca('pc_nombre'), activo: true },
    { id: marca('pb_id'), nombre: marca('pb_nombre'), activo: false },
  ]
  S.proyectosAdmin.aConfirmar = marca('pc_id')
  S.proyectosAdmin.enCurso = false
  S.renderizarProyectos()
  chequearMarcas(chk, 'Proyectos del Taller', html('proyectos-lista'), ['pa_id', 'pa_nombre', 'pc_id', 'pc_nombre', 'pb_id', 'pb_nombre'])
  chk('Proyectos: se dibujó la confirmación de baja', /¿Dar de baja/.test(html('proyectos-lista')))

  // ── Sección del comprobante (foto firmada al mirar) ──────────────────────
  E.misTareas = new Set()
  E.miRolApp = 'usuario'
  chequearMarcas(chk, 'comprobante propio (botón con la ruta)', S.htmlSeccionComprobante('uid-yo/' + marca('ruta_propia')), ['ruta_propia'])
  chk('comprobante ajeno sin permiso: no dibuja la ruta', !/data-ruta/.test(S.htmlSeccionComprobante('otro/' + marca('ruta_ajena'))))
  chequearMarcas(chk, 'comprobante con URL firmada vieja', S.htmlSeccionComprobante('https://x.supabase.co/storage/v1/object/sign/comprobantes/uid-yo/' + encodeURIComponent(marca('ruta_url')) + '?token=t'), ['ruta_url'])
  E.miRolApp = 'super_admin'

  // ── Aviso de duplicados ──────────────────────────────────────────────────
  const dup = [
    { modulo: 'gastos', registro_id: marca('dup_id'), numero_doc: marca('dup_numero'), razon_social: marca('dup_razon'),
      fecha: '2026-09-10', unidad_negocio_id: marca('uni_id'), importe: 10 },
    { modulo: marca('dup_modulo'), registro_id: 'x', numero_doc: null, razon_social: null, fecha: '2026-09-10', unidad_negocio_id: null, importe: null },
    { modulo: 'materia_prima', registro_id: 'y', numero_doc: '1', razon_social: 'R', fecha: '2026-09-10', unidad_negocio_id: null, importe: null },
  ]
  const avisoDup = S.htmlAvisoDuplicado(dup)
  chequearMarcas(chk, 'aviso de duplicados', avisoDup, ['dup_numero', 'dup_razon', 'uni_nombre'])
  chk('aviso de duplicados: el id va al data-url con encodeURIComponent',
    avisoDup.includes('data-url="gastos.html?gasto=' + S.esc(encodeURIComponent(marca('dup_id'))) + '"'))
  chk('aviso de duplicados: un módulo desconocido no se imprime', !avisoDup.includes('dup_modulo'))
  E.wizard.duplicados = dup
  S.renderizarAvisoDuplicado()
  chequearMarcas(chk, 'caja de duplicados del wizard', html('aviso-duplicado'), ['dup_numero', 'dup_razon', 'uni_nombre'])

  // ── Wizard: breadcrumb y grillas ─────────────────────────────────────────
  S.__setVar('unidadSeleccionada', marca('uni_id'))
  S.__setVar('categoriaSeleccionada', marca('cat_id'))
  S.__setVar('viaVehiculos', false)
  S.actualizarBreadcrumb('resumen')
  chequearMarcas(chk, 'breadcrumb (empresa y categoría)', html('wizard-breadcrumb'), ['uni_nombre', 'cat_nombre'])
  S.__setVar('viaVehiculos', true)
  S.__setVar('vehiculoSeleccionado', marca('veh_id'))
  S.actualizarBreadcrumb('resumen')
  chequearMarcas(chk, 'breadcrumb (vehículo)', html('wizard-breadcrumb'), ['veh_nombre', 'cat_nombre'])
  S.__setVar('viaVehiculos', false)
  S.renderizarGrillaDestino()
  chequearMarcas(chk, 'grilla de destino', html('grilla-destino'), ['uni_id', 'uni_nombre'])
  chk('grilla de destino: el nombre de la unidad no entra al src ni al style', !/(src|style)="[^"]*data-xss/.test(html('grilla-destino')))
  S.renderizarGrillaVehiculos(E.maestros.vehiculos, true)
  chequearMarcas(chk, 'grilla de vehículos', html('grilla-vehiculos'), ['veh_id', 'veh_nombre', 'veh_patente'])
  S.renderizarGrillaCategorias()
  chequearMarcas(chk, 'grilla de categorías', html('grilla-categorias'), ['cat_id', 'cat_nombre'])

  // ── Estado del OCR ───────────────────────────────────────────────────────
  S.mostrarEstadoOcr('cargando', marca('ocr_cargando'))
  chequearMarcas(chk, 'estado del OCR (cargando)', html('ocr-estado'), ['ocr_cargando'])
  S.mostrarEstadoOcr('error', marca('ocr_error'))
  chequearMarcas(chk, 'estado del OCR (error)', html('ocr-estado'), ['ocr_error'])

  // ── Aviso de después de guardar y facturas ingresadas sin gasto ──────────
  E.postGasto = { gastoId: marca('pg_id'), errorCuentaCorriente: marca('pg_error_cc'), errorIngreso: marca('pg_error_ing'),
    vinculadoIngreso: false, faltaIngreso: true, puedeIngresar: true }
  S.renderizarAvisoPostGasto()
  chequearMarcas(chk, 'aviso de después de guardar', html('aviso-post-gasto'), ['pg_error_cc', 'pg_error_ing'])
  chk('aviso de después de guardar: el id va al href con encodeURIComponent',
    html('aviso-post-gasto').includes('desde_gasto=' + encodeURIComponent(marca('pg_id')) + '"'))
  E.errorIngresosSinGasto = null
  E.ingresosSinGasto = [{ ingreso_id: marca('isg_id'), razon_social: marca('isg_razon'), numero_doc: marca('isg_numero'),
    fecha: '2026-10-03', importe_ocr: '10', unidad_negocio_id: marca('uni_id') }]
  S.renderizarIngresosSinGasto()
  chequearMarcas(chk, 'facturas ingresadas sin gasto', html('lista-ingresos-sin-gasto'), ['isg_id', 'isg_razon', 'isg_numero', 'uni_nombre'])
  E.errorIngresosSinGasto = marca('isg_error')
  S.renderizarIngresosSinGasto()
  chequearMarcas(chk, 'facturas ingresadas sin gasto (error)', html('lista-ingresos-sin-gasto'), ['isg_error'])

  // ── Buscador de proveedor ────────────────────────────────────────────────
  S.renderizarSugerenciasProveedorEn('sugerencias-prueba', E.maestros.proveedores, () => {})
  chequearMarcas(chk, 'sugerencias de proveedor', html('sugerencias-prueba'), ['prov_id', 'prov_razon', 'prov_fantasia'])

  // ── Resumen del wizard (normal y pendiente) ──────────────────────────────
  const campos = {
    'campo-fecha': '2026-09-10', 'campo-fecha-pago': '2026-09-11', 'campo-numero-doc': marca('w_numero'),
    'campo-razon-social': marca('w_razon'), 'campo-lugar': marca('w_lugar'), 'campo-observaciones': marca('w_obs'),
    'campo-empleado': marca('emp_id'), 'campo-proyecto': marca('proy_id'), 'campo-moneda': marca('w_moneda'),
    'campo-descripcion-item': marca('w_item'), 'campo-receptor': marca('w_receptor'), 'campo-cuenta': '',
  }
  for (const [id, v] of Object.entries(campos)) el(id).value = v
  el('campo-importe').value = '1.500,50'
  el('campo-kilometraje').value = '1.200'
  S.__setVar('tipDocSeleccionado', marca('w_tipo'))
  S.__setVar('medioPagoSeleccionado', 'efectivo')
  S.__setVar('unidadSeleccionada', marca('uni_id'))
  S.__setVar('vehiculoSeleccionado', marca('veh_id'))
  S.__setVar('categoriaSeleccionada', marca('cat_id'))
  S.__setVar('proveedorSeleccionado', marca('prov_id'))
  E.wizard.fotoArchivo = { name: marca('w_foto'), type: 'image/jpeg' }
  S.renderizarResumen()
  const res = html('resumen-contenido')
  chequearMarcas(chk, 'resumen del wizard', res,
    ['w_numero', 'w_razon', 'w_lugar', 'w_obs', 'w_tipo', 'w_moneda', 'uni_nombre', 'veh_nombre', 'veh_patente', 'cat_nombre', 'emp_nombre', 'proy_nombre'])
  chk('resumen: la foto entra por un blob: y no por el nombre del archivo', res.includes('src="blob:') && !res.includes('w_foto'))
  S.renderizarResumenPendiente()
  chequearMarcas(chk, 'resumen del flujo pendiente', html('resumen-contenido'),
    ['w_numero', 'w_razon', 'w_lugar', 'w_obs', 'w_tipo', 'w_moneda', 'uni_nombre', 'veh_nombre', 'veh_patente', 'cat_nombre', 'emp_nombre', 'proy_nombre', 'prov_razon'])

  // ── Detalle del gasto (y el del anulado) ─────────────────────────────────
  E.listaGastos = [gasto, anulado]
  E.cuentasPorId = { c1: { id: 'c1', empleado_id: 'e-empresa', nombre: marca('det_cta'), medio: 'efectivo', moneda: 'ARS', activa: true } }
  await S.mostrarDetalleGasto(gasto.id)
  chequearMarcas(chk, 'detalle del gasto', html('detalle-gasto-contenido'),
    ['g_tipo', 'g_numero', 'g_razon', 'g_moneda', 'g_unidad', 'g_veh', 'g_patente', 'g_cat', 'g_emp', 'g_proy', 'g_lugar', 'g_descripcion', 'g_obs', 'g_foto', 'det_cta', 'empresa_nombre'])
  chk('detalle del gasto: el botón de la foto lleva la ruta', /data-ruta-comprobante="uid-yo\//.test(html('detalle-gasto-contenido')))
  await S.mostrarDetalleGasto(anulado.id)
  chequearMarcas(chk, 'detalle del gasto anulado', html('detalle-gasto-contenido'), ['g2_razon', 'g2_motivo', 'emp_nombre'])

  // ── Formulario de edición del gasto ──────────────────────────────────────
  E.maestros.proyectos = [{ id: 'otro', nombre: 'Otro' }]   // el del gasto está dado de baja
  // MEDIOS_PAGO_LABEL es una constante, pero el select la escapa igual: con
  // una entrada marcada, sacar ese esc() se ve (si no, sería equivalente).
  S.MEDIOS_PAGO_LABEL[marca('mp_valor')] = marca('mp_label')
  S.mostrarFormularioEdicionGasto(gasto.id)
  const fe = html('detalle-gasto-contenido')
  chequearMarcas(chk, 'formulario de edición del gasto', fe,
    ['g_tipo', 'g_numero', 'g_razon', 'g_lugar', 'g_obs', 'uni_id', 'uni_nombre', 'veh_id', 'veh_nombre', 'veh_patente', 'cat_id', 'cat_nombre', 'emp_id', 'emp_nombre', 'g_proy', 'mp_valor', 'mp_label'])
  delete S.MEDIOS_PAGO_LABEL[marca('mp_valor')]
  chk('edición del gasto: la Descripción ya no se edita (no se pisa lo histórico)', !fe.includes('g_descripcion'))

  // ── Detalle de la factura pendiente, su edición y el interés ─────────────
  const factura = {
    id: marca('f_id'), razon_social: marca('f_razon'), tipo_documento: marca('f_tipo'), numero_comprobante: marca('f_numero'),
    importe: 100, moneda: marca('f_moneda'), fecha_factura: '2026-09-01', lugar: marca('f_lugar'), observaciones: marca('f_obs'),
    comprobante_url: 'uid-yo/' + marca('f_foto'), estado: 'pendiente', saldo_pendiente: 50, proveedor_id: marca('f_prov_id'),
    proveedores: { id: 'p', razon_social: marca('f_prov') }, categorias: { id: 'c', nombre: marca('f_cat') }, unidades_negocio: { id: 'u', nombre: marca('f_unidad') },
  }
  S.__setDatos('facturas_pendientes', factura)
  await S.mostrarDetalleFactura(factura.id)
  chequearMarcas(chk, 'detalle de la factura', html('detalle-factura-contenido'),
    ['f_razon', 'f_tipo', 'f_numero', 'f_moneda', 'f_lugar', 'f_obs', 'f_foto', 'f_prov', 'f_cat', 'f_unidad'])
  await S.mostrarDetalleFactura(factura.id)
  S.mostrarFormularioEdicionFactura(factura.id)
  chequearMarcas(chk, 'formulario de edición de la factura', html('detalle-factura-contenido'),
    ['f_razon', 'f_numero', 'f_lugar', 'f_obs', 'f_prov', 'f_prov_id', 'uni_id', 'uni_nombre', 'cat_id', 'cat_nombre'])
  S.mostrarFormularioInteres(factura.id)
  chequearMarcas(chk, 'formulario de interés', html('detalle-factura-contenido'), ['f_moneda'])
  chk('formulario de interés: se dibujó', /Agregar interés/.test(html('detalle-factura-contenido')))

  // ── Sinks de navegación ──────────────────────────────────────────────────
  // ?volver= viene de la URL: un link armado con volver=javascript:… corre
  // código en la sesión de quien toca "Volver" o guarda la edición.
  const navegaA = (volver) => {
    S.__navegacion.length = 0
    S.__setSearch('?gasto=x&volver=' + encodeURIComponent(volver))
    const r = S.volverOrigenSiCorresponde()
    return { r, destino: (S.__navegacion.find(n => n[0] === 'href') || [])[1] }
  }
  const js = navegaA('javascript:alert(1)')
  const data = navegaA('data:text/html,<script>alert(1)</script>')
  const fuera = navegaA('https://otro.test/robar')
  const caja = navegaA('https://x.test/modulos/caja.html?cuenta=1')
  const cc = navegaA('cuentas-corrientes.html')
  const inseguro = [js, data, fuera].some(n => n.destino !== undefined && !/^https:\/\/x\.test\//.test(n.destino))
  if (HALLAZGOS_ABIERTOS.has('volver')) {
    console.log('  HALLAZGO ABIERTO: ?volver= navega a cualquier URL (javascript:, data:, otro origen) — volverOrigenSiCorresponde()')
    chk('HALLAZGO ABIERTO ?volver=: el sink sigue ahí (si se arregló, sacarlo de HALLAZGOS_ABIERTOS)', inseguro)
  } else {
    chk('?volver=javascript: no navega', js.destino === undefined || /^https:\/\/x\.test\//.test(js.destino), js.destino)
    chk('?volver=data: no navega', data.destino === undefined || /^https:\/\/x\.test\//.test(data.destino), data.destino)
    chk('?volver= a otro origen no navega', fuera.destino === undefined, fuera.destino)
    chk('?volver= inválido: no corta el cierre (devuelve false y se cierra el detalle normal)', js.r === false && fuera.r === false)
  }
  chk('?volver= a la misma app sigue funcionando (Caja, URL absoluta)', caja.r === true && caja.destino === 'https://x.test/modulos/caja.html?cuenta=1', caja.destino)
  chk('?volver= a la misma app sigue funcionando (Cuentas Corrientes, relativa)', cc.r === true && /cuentas-corrientes\.html$/.test(cc.destino || ''), cc.destino)
  S.__setSearch('')
  chk('sin ?volver= no navega', S.volverOrigenSiCorresponde() === false)
  // El data-url del aviso de duplicados: prefijo fijo + encodeURIComponent.
  for (const [mod, pref] of [['gastos', 'gastos.html?gasto='], ['cuentas_corrientes', 'gastos.html?factura='], ['materia_prima', 'materia-prima.html?ingreso=']]) {
    const h = S.htmlAvisoDuplicado([{ modulo: mod, registro_id: 'javascript:alert(1)', fecha: '2026-09-10' }])
    chk(`data-url de ${mod}: prefijo fijo y el id codificado`, h.includes(`data-url="${pref}javascript%3Aalert(1)"`))
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO — TODO el <script>
// ══════════════════════════════════════════════════════════════════════════

const HTML_PROPIO = 'HTML armado más arriba en la misma función, con esc() de cada dato'
const FILA = 'fila() de esta función: filaHtml(etiqueta, esc(valor)) — escapa SIEMPRE (ejecutado con una marca por campo)'
const EN_FILA = 'plantilla SIN HTML propio pasada como valor a fila(), que la escapa entera'
const FILA_HTML = 'la variable html de filaHtml(): la arma fila() con esc(valor), o el call site de filaHtml() con esc() de cada dato'
const ICONO = 'iconoCategoriaHtml(): el nombre de categoría solo elige una entrada de ICONOS_CATEGORIA (constante, con fallback "tag"); nunca se imprime'
const CAMPO = "campo() de esta función: label literal del código en cada call site y HTML armado en el mismo call site, cuyas interpolaciones revisa el escáner"
const NUM = 'número: largo de un array o conteo calculado en el código'
const BLOB = 'URL.createObjectURL(): la genera el navegador (blob:<origen>/<uuid>), no sale de ningún dato'
const SEGURAS = {
  iconoCategoriaHtml: {
    icono: 'ICONOS_CATEGORIA[nombre] ?? "tag": solo valores de la constante',
    clase: "clase CSS: ningún call site la pasa (queda ''); si alguno la pasara, sería un literal del código",
  },
  renderizarFiltros: {
    placeholderBusqueda: 'ternario de dos literales del código',
    html: HTML_PROPIO,
  },
  renderizarTotalGastos: {
    tituloTotal: 'ternario de dos literales del código',
    "formatearImporte(totalARS, 'ARS')": "número sumado en el código con moneda 'ARS' fija",
    'gastos.length': NUM,
    tarjetaTotal: HTML_PROPIO, tarjetaRegistros: HTML_PROPIO,
  },
  renderizarCardGasto: {
    'iconoCategoriaHtml(categoria)': ICONO,
    'colorAvatar(razonSocial)': 'colorAvatar(): el texto solo elige un color de PALETA_AVATAR (constante)',
    puntoOBadge: HTML_PROPIO, categoriaChip: HTML_PROPIO,
    metaSecundaria: 'esc([fecha, empleado].filter(Boolean).join(" · ")) armado arriba',
  },
  aplicarBusquedaLocal: { "filtrados.map(renderizarCardGasto).join('')": 'HTML de renderizarCardGasto(), que escapa adentro (ejecutada con marcas)' },
  cargarLista: { "gastos.map(renderizarCardGasto).join('')": 'HTML de renderizarCardGasto(), que escapa adentro (ejecutada con marcas)' },
  htmlFilasProyectos: {
    dis: "literal ' disabled' o ''",
    'activos.length': NUM, 'bajas.length': NUM,
    "activos.map(filaActiva).join('')": 'HTML de la flecha filaActiva de esta función, cuyas interpolaciones revisa el escáner',
    "bajas.map(filaBaja).join('')": 'HTML de la flecha filaBaja de esta función, cuyas interpolaciones revisa el escáner',
  },
  renderizarProyectos: {
    'htmlFilasProyectos(proyectosAdmin.lista, proyectosAdmin.aConfirmar, proyectosAdmin.enCurso)': 'HTML de htmlFilasProyectos(), que escapa adentro (ejecutada con marcas)',
  },
  htmlSeccionComprobante: { cuerpo: HTML_PROPIO },
  htmlAvisoDuplicado: {
    'o.chip': "clase CSS de la constante ORIGENES_DUPLICADO o del objeto 'desconocido' (literal)",
    datos: 'armado arriba con .filter(Boolean).map(esc).join(" · ")',
    cuerpo: HTML_PROPIO, html: HTML_PROPIO,
    'filas.length': NUM,
  },
  pintarAvisoDuplicado: { 'htmlAvisoDuplicado(filas)': 'HTML de htmlAvisoDuplicado(), que escapa adentro (ejecutada con marcas)' },
  actualizarBreadcrumb: { 'item.labelHtml': 'labelHtml se arma arriba siempre con esc() o con iconoCategoriaHtml() + esc()' },
  renderizarGrillaDestino: {
    'c.logo': 'configEmpresa(): ruta de logo literal del código (4 valores), nunca el nombre',
    'c.color': 'configEmpresa(): color literal del código',
    'c.inicial': 'configEmpresa(): inicial literal del código',
    empresasHtml: HTML_PROPIO, vehiculosHtml: 'HTML constante',
  },
  renderizarGrillaVehiculos: { html: HTML_PROPIO },
  renderizarGrillaCategorias: { 'iconoCategoriaHtml(cat.nombre)': ICONO },
  htmlAvisoPostGasto: {
    nivel: 'clase CSS: solo pasa si está en NIVELES_AVISO_GASTO',
    html: 'HTML armado arriba con esc(l.texto)',
    ingresar: 'HTML armado arriba con encodeURIComponent(p.gastoId) en un href entre comillas dobles',
  },
  renderizarAvisoPostGasto: { html: 'HTML de htmlAvisoPostGasto(), que escapa adentro (ejecutada con marcas)' },
  renderizarIngresosSinGasto: { 'htmlIngresosSinGasto(filas)': 'HTML de htmlIngresosSinGasto(), que escapa adentro (ejecutada con marcas)' },
  cargarGastoDesdeIngreso: { 'URL.createObjectURL(archivo)': BLOB },
  '(top-level)': { 'URL.createObjectURL(archivo)': BLOB },
  renderizarResumen: {
    html: FILA_HTML,
    'URL.createObjectURL(estado.wizard.fotoArchivo)': BLOB,
    'iconoCategoriaHtml(catObj.nombre)': ICONO,
    "filaHtml('Categoría', catObj ? `${iconoCategoriaHtml(catObj.nombre)} ${esc(catObj.nombre)}` : null)": 'filaHtml() con el ícono (constante) y esc() del nombre, armado en el call site',
    'vehObj.nombre': EN_FILA, 'vehObj.patente': EN_FILA, 'g.kilometraje': EN_FILA,
  },
  renderizarResumenPendiente: {
    html: FILA_HTML,
    'URL.createObjectURL(estado.wizard.fotoArchivo)': BLOB,
    'iconoCategoriaHtml(catObj.nombre)': ICONO,
    "filaHtml('Categoría', catObj ? `${iconoCategoriaHtml(catObj.nombre)} ${esc(catObj.nombre)}` : null)": 'filaHtml() con el ícono (constante) y esc() del nombre, armado en el call site',
    'vehObj.nombre': EN_FILA, 'vehObj.patente': EN_FILA, 'g.kilometraje': EN_FILA,
  },
  mostrarDetalleGasto: {
    html: FILA_HTML,
    'iconoCategoriaHtml(g.categorias.nombre)': ICONO,
    "filaHtml('Categoría', g.categorias ? `${iconoCategoriaHtml(g.categorias.nombre)} ${esc(g.categorias.nombre)}` : null)": 'filaHtml() con el ícono (constante) y esc() del nombre, armado en el call site',
    'g.vehiculos.nombre': EN_FILA, 'g.vehiculos.patente': EN_FILA, 'g.kilometraje': EN_FILA,
    'htmlSeccionComprobante(g.foto_url)': 'HTML de htmlSeccionComprobante(), que escapa la ruta (ejecutada con marcas)',
    "[ puedeEditar ? '<button type=\"button\" class=\"btn btn--icono\" id=\"btn-editar-gasto\" title=\"Editar\">✏️ Editar</button>' : '', puedeAnular ? '<button type=\"button\" class=\"btn btn--icono btn--icono--peligro\" id=\"btn-anular-gasto\" title=\"Anular\">🚫 Anular</button>' : '', ].join('')":
      'dos botones literales del código',
  },
  mostrarFormularioEdicionGasto: {
    label: CAMPO, html: CAMPO,
  },
  mostrarDetalleFactura: {
    html: FILA_HTML,
    'iconoCategoriaHtml(f.categorias.nombre)': ICONO,
    "filaHtml('Categoría', f.categorias ? `${iconoCategoriaHtml(f.categorias.nombre)} ${esc(f.categorias.nombre)}` : null)": 'filaHtml() con el ícono (constante) y esc() del nombre, armado en el call site',
    'htmlSeccionComprobante(f.comprobante_url)': 'HTML de htmlSeccionComprobante(), que escapa la ruta (ejecutada con marcas)',
  },
  mostrarFormularioEdicionFactura: {
    label: CAMPO, html: CAMPO,
  },
}
// Por función y con regex: los call sites de fila() y de campo(), que son
// muchos y todos de la misma forma. El regex exige el LITERAL como primer
// argumento: una etiqueta armada con un dato no pasa.
const RE_FILA = [/^fila\('[^'`$\\]*',/, FILA]
const RE_CAMPO = [/^campo\('[^'`$\\]*', /, CAMPO]
const SEGURAS_REGEX = {
  actualizarBreadcrumb: [[/^items\.map\(\(item, i\) => \(i > 0 \? '<span class="breadcrumb__sep">›<\/span>' : ''\) \+ `<button/,
    'separador literal + plantilla con esc(item.subpaso) e item.labelHtml (armado con esc), cuyas interpolaciones revisa el escáner']],
  renderizarResumen: [RE_FILA],
  renderizarResumenPendiente: [RE_FILA],
  mostrarDetalleGasto: [RE_FILA],
  mostrarDetalleFactura: [RE_FILA],
  mostrarFormularioEdicionGasto: [RE_CAMPO],
  mostrarFormularioEdicionFactura: [RE_CAMPO],
}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

function esMapDePlantilla(expr) {
  const e = norm(expr)
  if (!/\.join\((''|"")\)$/.test(e)) return false
  return /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*`/.test(e) ||
         /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*\{.*return\s*`/.test(e)
}

// posicionesDeValor() de clasificar.js, pero desenvolviendo SOLO paréntesis
// que envuelven la expresión ENTERA (ver el traspaso de Ingreso, punto 5).
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

// Las plantillas SIN HTML propio cuyo valor TERMINA en un innerHTML (ver
// test-stock-xss.js): las que devuelve una flecha o un return, y las que son
// una hoja de la asignación.
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
  // Control de los regex de fila()/campo(): una etiqueta armada con un dato
  // no pasa.
  chk('estático: el regex de fila() rechaza una etiqueta con un dato',
    !RE_FILA[0].test("fila(`${g.x}`, g.y)") && !RE_FILA[0].test("fila(g.etiqueta, g.y)") && RE_FILA[0].test("fila('Tipo', g.tipo_doc)"))
  chk('estático: el regex de campo() rechaza una etiqueta con un dato',
    !RE_CAMPO[0].test("campo(`${g.x}`, h)") && !RE_CAMPO[0].test("campo(g.label, h)") && RE_CAMPO[0].test("campo('Lugar', h)"))

  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length > 250, `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 45, `solo ${r.asignaciones.length}`)
  chk('estático: hay escapes de verdad, no todo justificado por lista', enHtml.filter(i => /^esc\(/.test(i.expr.trim())).length > 90,
    `${enHtml.filter(i => /^esc\(/.test(i.expr.trim())).length}`)
  const huerfanas = [
    ...Object.entries(SEGURAS).flatMap(([fn, t]) => Object.keys(t).map(k => fn + '::' + norm(k))),
    ...Object.entries(SEGURAS_REGEX).flatMap(([fn, t]) => t.map(([re]) => fn + '::' + re)),
  ].filter(k => !USADAS.has(k))
  chk('estático: ninguna hoja de la lista de seguras quedó huérfana', huerfanas.length === 0, huerfanas.join(' | '))

  // Los ÚNICOS lugares donde iconoCategoriaHtml() recibe una clase: ninguno.
  // Si alguien le pasa un dato como clase, deja de ser seguro.
  chk('estático: iconoCategoriaHtml() nunca recibe un segundo argumento',
    ![...FUENTE.matchAll(/iconoCategoriaHtml\(([^()]*(\([^()]*\))?[^()]*)\)/g)].some(m => !/^\s*nombreCategoria/.test(m[1]) && partirTopLevel(m[1], ',').length > 1))

  // ── Contexto ─────────────────────────────────────────────────────────────
  const SRC_SEGUROS = {
    'esc(logoEmpresa)': 'LOGOS_EMPRESA[nombre] ?? null, o LOGO_VEHICULOS: rutas literales del código',
    'c.logo': 'configEmpresa(): ruta literal del código',
    'URL.createObjectURL(archivo)': BLOB,
    'URL.createObjectURL(estado.wizard.fotoArchivo)': BLOB,
  }
  const STYLE_SEGUROS = {
    'colorAvatar(razonSocial)': 'PALETA_AVATAR (constante)',
    'c.color': 'configEmpresa(): color literal del código',
  }
  const sinComillas = [], enEvento = [], enUrl = [], enStyle = []
  const usadasCtx = new Set()
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
      if (SRC_SEGUROS[e]) usadasCtx.add('src::' + e); else enUrl.push(`${x.linea} (${attr}: ${e})`)
    }
    if (/^style$/i.test(attr)) {
      if (STYLE_SEGUROS[e]) usadasCtx.add('style::' + e); else enStyle.push(`${x.linea}: ${e}`)
    }
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae en un href/src sin encodeURIComponent (salvo las justificadas)', enUrl.length === 0, enUrl.join(', '))
  chk('estático: ninguna interpolación cae en un style (salvo las justificadas)', enStyle.length === 0, enStyle.join(', '))
  const huerfanasCtx = [...Object.keys(SRC_SEGUROS).map(k => 'src::' + k), ...Object.keys(STYLE_SEGUROS).map(k => 'style::' + k)].filter(k => !usadasCtx.has(k))
  chk('estático: ninguna excepción de contexto (src/style) quedó huérfana', huerfanasCtx.length === 0, huerfanasCtx.join(' | '))
  // Los on*= literales (onerror del logo) no llevan interpolación: ya lo
  // cubre enEvento. Se afirma que siguen siendo literales.
  chk('estático: los onerror del logo son literales', [...FUENTE.matchAll(/onerror="([^"]*)"/g)].every(m => !m[1].includes('${')))

  // Otros sinks que el escáner no mira.
  const script = scriptModulo(ARCHIVO)
  chk('estático: no hay insertAdjacentHTML, outerHTML, document.write ni innerHTML +=',
    !/insertAdjacentHTML|\.outerHTML\s*=|document\.write|innerHTML\s*\+=|createContextualFragment/.test(script))
  // Navegación: los ÚNICOS lugares que navegan a una URL armada en runtime.
  const navs = [...script.matchAll(/(?:location\.href\s*=|window\.open\()\s*([^\n;]*)/g)].map(m => norm(m[1]))
  const NAVS_ESPERADAS = [
    "'', '_blank')",                                   // abre la pestaña vacía de la foto
    'r.url',                                            // URL firmada que devuelve Storage
    "fila.dataset.url, '_blank', 'noopener')",          // prefijo fijo + encodeURIComponent (ver renders)
  ]
  const navsVolver = navs.filter(n => !NAVS_ESPERADAS.includes(n))
  chk('estático: las navegaciones fuera de ?volver= son las conocidas', navsVolver.length === 1 && /volver|destino/.test(navsVolver[0]), navs.join(' | '))

  const utils = require('fs').readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
  chk('control: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(utils) && !/toast\.innerHTML\s*=/.test(utils))

  if (process.env.INFORME) {
    console.log(`INFORME: ${r.interpolaciones.length} interpolaciones, ${enHtml.length} en HTML, ${r.asignaciones.length} asignaciones a innerHTML`)
  }
}

for (const h of HALLAZGOS_ABIERTOS) console.log(`  (hallazgo abierto declarado: ${h})`)
fin()
