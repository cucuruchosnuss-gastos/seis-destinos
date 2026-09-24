// Barrido de escapado de modulos/caja.html — el archivo ENTERO.
//
// El barrido se cerró en a3fd993 (17/09/2026) y la prueba que lo demostraba se
// perdió con la sesión. Esta suite lo BLOQUEA sobre el estado actual, con el
// mismo método que test-gastos-xss.js, test-stock-xss.js y
// test-materia-prima-xss.js, en tres partes:
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO
//     (`"><b data-xss="campo">`), con datos que imitan lo que devuelve la base:
//     el total de la empresa (con su desglose por cuenta y "dueño — cuenta"),
//     el listado agrupado por unidad, el Directorio (personas y cuentas), la
//     ficha (saldos, desglose gestionable con logo de unidad, desglose ajeno),
//     los movimientos (con persona, contraparte, gasto, descripción y cuenta),
//     las solicitudes pendientes (las tres ramas de botones), los selects
//     (contraparte, las cuatro de opcionesCuenta(), unidad de la cuenta nueva,
//     persona de Retiros), los multiselect de las fichas de Empresa y de
//     "Todos los movimientos", los totales de Retiros y de Movimientos, y el
//     modal de datos bancarios (que va por DOM y textContent).
//  2. CHEQUEO ESTÁTICO sobre TODO el <script>: cada ${...} de una plantilla que
//     arma HTML, cada asignación a innerHTML (la expresión ENTERA, no la
//     primera línea) y cada plantilla sin HTML propio que termina en un
//     innerHTML tiene que estar escapada o figurar en la lista de seguras CON
//     SU MOTIVO, por función. Una entrada que no se usa es rojo. Más el
//     contexto: atributo sin comillas, on*=, href/src, style.
//  3. SINKS DE NAVEGACIÓN: el href "Ver gasto →" (prefijo fijo +
//     encodeURIComponent del id y de location.href, entre comillas DOBLES) y
//     que las únicas navegaciones del archivo sean las dos literales al
//     dashboard. Caja no lee NINGÚN parámetro de la URL (verificado: cero
//     URLSearchParams/location.search), así que no tiene un ?volver= propio.
//
// Las funciones del sandbox se juntan por CLAUSURA desde los renders: se
// ejecuta el código real de cada helper, no una copia.
//
//   node pruebas/test-caja-xss.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-xss.js
//   SOLO=render | SOLO=estatico      INFORME=1 (imprime los conteos)

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, chequearMarcas, leer } = require('./circuito-comun')
const { interpolaciones, analizar } = require('./escaner-interpolaciones')
const { clasificar, partirTopLevel } = require('./clasificar')
const { extraerFn, cuerpoDesde } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const SOLO = process.env.SOLO || ''
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// HALLAZGOS ABIERTOS: sinks encontrados por esta suite y todavía sin arreglar.
// Al 21/09/2026 NO hay ninguno. Si aparece uno, se declara acá con su chequeo
// invertido (como en test-gastos-xss.js) y el cierre lo imprime.
const HALLAZGOS_ABIERTOS = new Set([])

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

// Lo que define el preludio y NO se extrae: red, navegación y acciones que
// abren otras pantallas (se stubean para que un render no dispare una carga).
const STUBS = new Set([
  'verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha',
  'abrirDetallePersona', 'abrirDirectorio', 'abrirModalMovimiento', 'abrirModalTraspaso',
  'marcarCuentaFavorita', 'abrirModalDesactivarCuenta', 'abrirModalRenombrarCuenta', 'abrirModalEditarBancarios',
  'responderSolicitud', 'abrirModalRechazo', 'cancelarSolicitud', 'exportarMovimientosExcel',
  'cargarMovimientosFichaEmpresa', 'init',
])

const RENDERS = [
  'esc', 'importeHtml', 'formatearImporte', 'formatearImporteCentavosSuaves', 'iniciales', 'etiquetaMovimiento',
  'crearMultiselect', 'renderizarDesglosePorCuenta', 'renderizarFilaCuenta',
  'renderizarStatTotal', 'renderizarTarjetaPersona', 'renderizarListado',
  'renderizarListaDirectorio', 'renderizarCuentasDirectorio', 'abrirModalDatosBancarios',
  'renderizarSaldosDetalle', 'renderizarAccionesDetalle',
  'renderizarFiltrosMovimientosFicha', 'renderizarFiltrosFichaEmpresa', 'renderizarFiltrosTodosMovimientos',
  'renderizarFilaMovimiento', 'renderizarMovimientos',
  'renderizarFilaSolicitud', 'renderizarSolicitudesPendientes',
  'abrirModalCuentaNueva', 'poblarSelectorRetirosPersona', 'renderizarTotalRetiros', 'cargarRetiros',
  'renderizarTotalMovimientos', 'cargarTodosMovimientos',
  'poblarSelectorContraparte', 'opcionesCuenta', 'poblarSelectorCuentaUnica', 'poblarSelectorCuentaPropia',
  'actualizarSelectorCuentaContraparte', 'poblarSelectoresTraspaso',
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

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      title: '', type: '', dataset: {}, style: {}, hijos: [],
      querySelector: () => nuevoEl('hijo'), querySelectorAll: () => [], addEventListener(){}, removeEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, closest: () => nuevoEl('cercano'), remove(){},
      appendChild(h){ el.hijos.push(h) }, append(...hs){ el.hijos.push(...hs) },
      getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, height: 0 }),
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'),
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => nuevoEl(s), addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
  }
  var location = { href: 'https://x.test/modulos/caja.html?a="b\\'c<d>' }
  var __navegacion = []
  var window = { location: { set href(v) { __navegacion.push(v) }, replace(v) { __navegacion.push(v) } } }
  var navigator = { clipboard: { writeText: async () => {} } }
  var XLSX = { utils: { json_to_sheet(){}, book_new(){}, book_append_sheet(){} }, writeFile(){} }
  var __datos = {}
  function __consulta(tabla) {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not']) q[k] = () => q
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: __datos[tabla] ?? [], error: null, count: 0 }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  var __llamadas = { errores: [], exitos: [] }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  // formatearFecha de js/utils.js, con su cuerpo real.
  function formatearFecha(fecha) { const [anio, mes, dia] = fecha.split('-'); return dia + '/' + mes + '/' + anio }
  function abrirDetallePersona() {} function abrirDirectorio() {} function abrirModalMovimiento() {} function abrirModalTraspaso() {}
  function marcarCuentaFavorita() {} function abrirModalDesactivarCuenta() {} function abrirModalRenombrarCuenta() {}
  function abrirModalEditarBancarios() {} function responderSolicitud() {} function abrirModalRechazo() {} function cancelarSolicitud() {}
  function exportarMovimientosExcel() {} async function cargarMovimientosFichaEmpresa() {}
  // Los let top-level del módulo: acá var.
  var cuentaBancariaAbierta = null, cuentaAEditarBancariosId = null, solicitudARechazarId = null
  var cuentaADesactivarId = null, cuentaARenombrarId = null, medioCuentaNuevaSeleccionado = null
  var traspasoEmpleadoId = null, debounceBusquedaCaja = null
`

const RETORNO = 'estado, LOGOS_EMPRESA, __els, __el(id){ return document.getElementById(id) }, __llamadas, __navegacion, ' +
  '__setDatos(t, d){ __datos[t] = d }, __setVar(k, v){ eval(k + " = v") }'

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

  // ── esc e importes ───────────────────────────────────────────────────────
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, S.esc(crudo) === esperado, S.esc(crudo))
  }
  chk('esc no convierte null en la palabra null', S.esc(null) === '' && S.esc(undefined) === '')
  chequearMarcas(chk, 'importeHtml (moneda)', S.importeHtml(10, marca('ih_moneda')), ['ih_moneda'])
  chequearMarcas(chk, 'formatearImporteCentavosSuaves (moneda)', S.formatearImporteCentavosSuaves(10, marca('fcs_moneda')), ['fcs_moneda'])
  chk('formatearImporte sigue en TEXTO PLANO (sirve para el Excel y textContent)', S.formatearImporte(10, '<X>') === '<X> 10,00', S.formatearImporte(10, '<X>'))
  chk('iniciales devuelve texto crudo (se escapa su RESULTADO)', S.iniciales('<x y') === '<Y')

  // ── Estado base: yo, Empresa, personas, unidades y cuentas ───────────────
  E.miEmpleado = { id: 'yo', nombre: marca('yo_nombre'), rol_app: 'super_admin' }
  E.idEmpresa = 'emp'
  E.misTareasCaja = new Set(['ver_empresa', 'ingreso_externo_propio', 'egreso_empresa', 'traspaso_empresa', 'transferir_entre_personas'])
  E.tieneModuloCaja = true
  E.nombresEmpleados = { yo: marca('yo_nombre'), p1: marca('p1_nombre'), p2: marca('p2_nombre'), emp: marca('emp_nombre') }
  E.maestros.unidadesNegocio = [
    { id: 'u-cn', nombre: 'Cucuruchos Nuss' },
    { id: 'u-x', nombre: marca('uni_nombre') },
  ]
  E.empleados = [
    { id: 'p1', nombre: marca('p1_nombre'), unidad_negocio_id: 'u-x' },
    { id: 'p2', nombre: marca('p2_nombre'), unidad_negocio_id: null },
    { id: 'emp', nombre: marca('emp_nombre') },
  ]
  E.superAdmins = [{ id: 'p2', nombre: marca('p2_nombre') }]
  // Toda moneda de estas filas sale de la base: con CHECK (12 códigos), pero el
  // render la escapa igual y se prueba con una marca.
  E.saldos = [
    { empleado_id: 'p1', moneda: 'ARS', saldo: 100 },
    { empleado_id: 'p1', moneda: marca('saldo_moneda'), saldo: -5 },
    { empleado_id: 'p2', moneda: marca('saldo2_moneda'), saldo: 7 },
  ]
  const C1 = marca('c1_id')
  E.cuentasPorId = {
    [C1]: { id: C1, empleado_id: 'p1', nombre: marca('c1_nombre'), medio: 'efectivo', moneda: 'ARS', favorita: false, activa: true },
    c2: { id: 'c2', empleado_id: 'p1', nombre: marca('c2_nombre'), medio: 'banco', moneda: 'ARS', favorita: true, activa: true },
    c3: { id: 'c3', empleado_id: 'emp', nombre: marca('c3_nombre'), medio: 'banco', moneda: marca('c3_moneda'), favorita: false, activa: true, unidad_negocio_id: 'u-x' },
    c4: { id: 'c4', empleado_id: 'emp', nombre: marca('c4_nombre'), medio: 'efectivo', moneda: 'ARS', favorita: false, activa: true, unidad_negocio_id: 'u-cn' },
  }
  // La clave del mapa ES el id (el desglose busca estado.cuentasPorId[id]); la
  // de c1 lleva marca porque va a data-id y a value.
  E.saldosPorCuenta = [{ cuenta_id: 'c2', saldo: 50 }]
  E.movimientosDelMes = 3
  E.misSolicitudesPendientes = 1

  // ── Total de la empresa (con desglose "dueño — cuenta") ──────────────────
  S.renderizarStatTotal()
  chequearMarcas(chk, 'total de la empresa', html('stat-total-empresa'),
    ['saldo_moneda', 'saldo2_moneda', 'p1_nombre', 'c1_nombre', 'c2_nombre'])

  // ── Listado agrupado por unidad ──────────────────────────────────────────
  E.filtros.busqueda = ''
  S.renderizarListado()
  chequearMarcas(chk, 'listado por unidad', html('lista-personas'),
    ['uni_nombre', 'p1_nombre', 'p2_nombre', 'saldo_moneda', 'saldo2_moneda'])
  chk('listado: las iniciales del avatar se escapan', S.renderizarTarjetaPersona({ id: 'z', nombre: '<x y' }).includes('&lt;Y</div>'))

  // ── Directorio ───────────────────────────────────────────────────────────
  await S.renderizarListaDirectorio()
  chequearMarcas(chk, 'Directorio: personas', html('directorio-contenido'), ['p1_nombre', 'p2_nombre', 'emp_nombre'])
  await S.renderizarCuentasDirectorio('p1')
  chequearMarcas(chk, 'Directorio: cuentas', html('directorio-contenido'), ['c1_id', 'c1_nombre', 'c2_nombre'])
  await S.renderizarCuentasDirectorio('emp')
  chequearMarcas(chk, 'Directorio: cuentas (moneda)', html('directorio-contenido'), ['c3_nombre', 'c3_moneda'])

  // Modal de datos bancarios: va por DOM y textContent, nunca por innerHTML.
  E.cuentasPorId.cb = { id: 'cb', empleado_id: 'p1', nombre: marca('cb_nombre'), cbu: marca('cb_cbu'), alias: marca('cb_alias'), numero_cuenta: marca('cb_numero'), activa: false }
  S.abrirModalDatosBancarios('cb')
  const camposB = el('datos-bancarios-campos')
  const textos = JSON.stringify(camposB.hijos.map(f => f.hijos.map(h => [h.textContent, h.innerHTML, (h.hijos || []).map(x => [x.textContent, x.innerHTML, x.title])])))
  chk('datos bancarios: el contenedor no recibe HTML', camposB.innerHTML === '')
  chk('datos bancarios: los valores van por textContent (crudos, que es lo seguro ahí)',
    ['cb_cbu', 'cb_alias', 'cb_numero'].every(c => textos.includes(JSON.stringify(marca(c)).slice(1, -1))))
  chk('datos bancarios: el título va por textContent', el('datos-bancarios-titulo').textContent === marca('cb_nombre'))
  delete E.cuentasPorId.cb

  // ── Ficha: saldos + desglose gestionable (Empresa, con logo de unidad) ───
  E.saldos.push({ empleado_id: 'emp', moneda: marca('emp_moneda'), saldo: 3 })
  S.renderizarSaldosDetalle('emp')
  const fichaEmp = html('detalle-persona-saldos')
  chequearMarcas(chk, 'ficha de Empresa: saldos y desglose gestionable', fichaEmp,
    ['emp_moneda', 'c3_nombre', 'c3_moneda', 'c4_nombre', 'uni_nombre'])
  chk('ficha gestionable: el data-id de las acciones se escapa', !/data-id="[^"]*data-xss/.test(fichaEmp))
  chk('ficha gestionable: con logo, el src es la ruta del código', /<img src="\.\.\/logo-cucuruchos-nuss\.png" alt="Cucuruchos Nuss"/.test(fichaEmp))
  chk('ficha gestionable: un nombre de unidad SIN logo no dibuja <img>', !/<img[^>]*data-xss/.test(fichaEmp))
  // Desglose ajeno (gestionable=false) y propio.
  E.miEmpleado.rol_app = 'usuario'
  S.renderizarSaldosDetalle('p1')
  chequearMarcas(chk, 'ficha ajena: desglose sin acciones', html('detalle-persona-saldos'), ['saldo_moneda', 'c1_nombre', 'c2_nombre'])
  E.miEmpleado.rol_app = 'super_admin'
  chequearMarcas(chk, 'fila de cuenta con dueño', S.renderizarFilaCuenta(E.cuentasPorId.c3, { mostrarDueño: true }), ['emp_nombre', 'c3_nombre', 'c3_moneda'])
  S.renderizarAccionesDetalle('yo')
  chk('acciones de la ficha: solo botones literales', /btn-detalle-ingreso/.test(html('detalle-persona-acciones')) && !/data-xss/.test(html('detalle-persona-acciones')))

  // ── Multiselects: ficha de Empresa y "Todos los movimientos" ─────────────
  const opcionesMs = []
  document_capturar(S, opcionesMs)
  S.renderizarFiltrosFichaEmpresa()
  S.renderizarFiltrosTodosMovimientos()
  const htmlMs = opcionesMs.map(h => h.innerHTML).join('\n')
  chequearMarcas(chk, 'opciones de los multiselect (cuentas y personas)', htmlMs,
    ['c3_nombre', 'c4_nombre', 'p1_nombre', 'p2_nombre', 'emp_nombre', 'c1_nombre'])
  chk('multiselect: se dibujaron opciones (si no, el chequeo no mira nada)', /multiselect__opcion/.test(htmlMs))
  S.renderizarFiltrosMovimientosFicha('p1')
  chk('filtros de la ficha: solo el botón literal', /Descargar Excel/.test(html('filtros-detalle-movimientos')))

  // ── Movimientos ──────────────────────────────────────────────────────────
  const mov = {
    id: 'm1', tipo: 'ingreso', monto: 10, moneda: marca('m_moneda'), medio_pago: marca('m_medio'), cuenta_id: null,
    descripcion: marca('m_desc'), fecha: '2026-09-10', empleado_id: 'p1', contraparte_empleado_id: 'p2',
    gasto_id: 'javascript:alert(1)"x', gastos: { razon_social: marca('m_razon'), categorias: { nombre: marca('m_cat') } },
  }
  const fila = S.renderizarFilaMovimiento(mov, { mostrarPersona: true })
  chequearMarcas(chk, 'fila de movimiento', fila, ['m_moneda', 'm_medio', 'm_desc', 'p1_nombre', 'p2_nombre', 'm_razon', 'm_cat'])
  const transf = S.renderizarFilaMovimiento({ ...mov, tipo: 'egreso_transferencia', cuenta_id: 'c2', gasto_id: null })
  chequearMarcas(chk, 'fila de movimiento (Entregado a…, nombre de cuenta)', transf, ['p2_nombre', 'c2_nombre'])
  const tipoRaro = S.renderizarFilaMovimiento({ ...mov, tipo: marca('m_tipo'), gasto_id: null })
  chequearMarcas(chk, 'fila de movimiento (tipo desconocido, en la clase y la etiqueta)', tipoRaro, ['m_tipo'])
  // Sink de navegación: el href "Ver gasto →".
  const href = (fila.match(/<a href="([^"]*)"/) || [])[1] || ''
  chk('Ver gasto: el href arranca con el prefijo fijo del código', href.startsWith('gastos.html?gasto='), href)
  chk('Ver gasto: el id va con encodeURIComponent', href.includes('gasto=' + encodeURIComponent(mov.gasto_id) + '&'), href)
  chk('Ver gasto: el volver va con encodeURIComponent de location.href', href.endsWith('&volver=' + encodeURIComponent('https://x.test/modulos/caja.html?a="b\'c<d>')), href)
  chk('Ver gasto: un " del id no cierra el atributo', !/<a href="[^"]*"x/.test(fila))
  E.movimientos = [mov, { ...mov, id: 'm2', descripcion: marca('m2_desc'), gasto_id: null }]
  S.renderizarMovimientos()
  chequearMarcas(chk, 'lista de movimientos de la ficha', html('detalle-persona-movimientos'), ['m_desc', 'm2_desc', 'm_razon'])

  // ── Solicitudes pendientes: las tres ramas de botones ────────────────────
  E.cuentasPorId.co = { id: 'co', empleado_id: 'p2', nombre: marca('sol_cta_origen'), medio: 'efectivo', moneda: 'ARS', activa: true }
  const solicitudes = [
    // Responder (con Empresa, creada por mí): Cancelar + Aceptar + nota.
    { id: marca('s1_id'), origen_empleado_id: 'emp', destino_empleado_id: 'p1', monto: 5, moneda: marca('s_moneda'), medio_pago: marca('s_medio'),
      cuenta_origen_id: 'co', cuenta_destino_id: null, fecha: '2026-09-10', descripcion: marca('s_desc'), creado_por: 'yo' },
    // Responder sin Empresa, no creada por mí: Rechazar + Aceptar.
    { id: marca('s2_id'), origen_empleado_id: 'p2', destino_empleado_id: 'yo', monto: 5, moneda: 'ARS', medio_pago: 'efectivo',
      cuenta_origen_id: null, cuenta_destino_id: null, fecha: '2026-09-10', descripcion: null, creado_por: 'p2' },
    // Creada por mí, esperando a la otra parte: "Esperando que X…" + Cancelar.
    { id: marca('s3_id'), origen_empleado_id: 'yo', destino_empleado_id: 'p1', monto: 5, moneda: 'ARS', medio_pago: 'efectivo',
      cuenta_origen_id: null, cuenta_destino_id: null, fecha: '2026-09-10', descripcion: null, creado_por: 'yo' },
  ]
  E.solicitudesPendientes = solicitudes
  S.renderizarSolicitudesPendientes()
  const sols = html('detalle-persona-solicitudes')
  chequearMarcas(chk, 'solicitudes pendientes', sols,
    ['s1_id', 's2_id', 's3_id', 's_moneda', 's_medio', 's_desc', 'emp_nombre', 'p1_nombre', 'p2_nombre', 'yo_nombre', 'sol_cta_origen'])
  chk('solicitudes: se dibujaron las tres ramas', /data-accion="rechazar"/.test(sols) && /La creaste vos/.test(sols) && /Esperando que/.test(sols))

  // ── Selects ──────────────────────────────────────────────────────────────
  E.personaAbierta = 'emp'
  S.abrirModalCuentaNueva()
  chequearMarcas(chk, 'select de unidad de la cuenta nueva', html('cuenta-unidad-negocio'), ['uni_nombre'])
  S.poblarSelectorRetirosPersona()
  chequearMarcas(chk, 'select de persona de Retiros', html('filtro-retiros-persona'), ['p1_nombre', 'p2_nombre', 'emp_nombre'])
  await S.poblarSelectorContraparte('yo')
  chequearMarcas(chk, 'select de contraparte', html('contraparte-select'), ['p1_nombre', 'p2_nombre', 'emp_nombre'])
  E.miEmpleado.rol_app = 'usuario'
  E.misTareasCaja = new Set()
  await S.poblarSelectorContraparte('yo')
  chequearMarcas(chk, 'select de contraparte (usuario común: super_admins + Empresa)', html('contraparte-select'), ['p2_nombre', 'emp_nombre'])
  E.miEmpleado.rol_app = 'super_admin'
  chequearMarcas(chk, 'opcionesCuenta() escapa por dentro', S.opcionesCuenta([E.cuentasPorId[C1], E.cuentasPorId.c3]), ['c1_id', 'c1_nombre', 'c3_nombre', 'c3_moneda'])
  S.poblarSelectorCuentaUnica('emp')
  chequearMarcas(chk, 'select de cuenta única', html('cuenta-select'), ['c3_nombre', 'c3_moneda', 'c4_nombre'])
  await S.poblarSelectorCuentaPropia('p1')
  chequearMarcas(chk, 'select de cuenta propia', html('cuenta-propia-select'), ['c1_nombre', 'c2_nombre'])
  el('contraparte-select').value = 'p1'
  el('cuenta-propia-select').value = 'c4'
  await S.actualizarSelectorCuentaContraparte()
  chequearMarcas(chk, 'select de cuenta de la contraparte', html('cuenta-contraparte-select'), ['c1_nombre'])
  S.__setVar('traspasoEmpleadoId', 'emp')
  S.poblarSelectoresTraspaso()
  chequearMarcas(chk, 'selects del traspaso (desde)', html('traspaso-cuenta-origen'), ['c3_nombre', 'c3_moneda', 'c4_nombre'])
  chequearMarcas(chk, 'selects del traspaso (hacia)', html('traspaso-cuenta-destino'), ['c3_nombre', 'c4_nombre'])

  // ── Retiros y Todos los movimientos (carga + totales + filas) ────────────
  const retiro = { id: 'r1', tipo: 'egreso_retiro', monto: 5, moneda: marca('r_moneda'), medio_pago: 'efectivo', cuenta_id: 'c2',
    descripcion: marca('r_desc'), fecha: '2026-09-10', empleado_id: 'p1' }
  S.__setDatos('caja_movimientos', [retiro])
  await S.cargarRetiros()
  chequearMarcas(chk, 'total de Retiros', html('stat-total-retiros'), ['r_moneda'])
  chequearMarcas(chk, 'lista de Retiros', html('lista-retiros-personales'), ['r_moneda', 'r_desc', 'p1_nombre', 'c2_nombre'])
  await S.cargarTodosMovimientos()
  chequearMarcas(chk, 'total de Todos los movimientos', html('stat-total-todos-movimientos'), ['r_moneda'])
  chequearMarcas(chk, 'lista de Todos los movimientos', html('lista-todos-movimientos'), ['r_moneda', 'r_desc', 'p1_nombre'])

  chk('ningún render navegó', S.__navegacion.length === 0, S.__navegacion.join(' | '))
}

// crearMultiselect escribe en panel.querySelector('.multiselect__opciones'):
// se capturan todos los hijos que devuelve cada panel.
function document_capturar(S, opcionesMs) {
  for (const base of ['ms-fe-periodo', 'ms-fe-tipo', 'ms-fe-cuenta', 'ms-tm-periodo', 'ms-tm-tipo', 'ms-tm-cuenta', 'ms-tm-persona']) {
    const p = S.__el(base + '-panel')
    p.querySelector = () => { const h = { innerHTML: '', addEventListener(){} }; opcionesMs.push(h); return h }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO — TODO el <script>
// ══════════════════════════════════════════════════════════════════════════

const HTML_PROPIO = 'HTML armado más arriba en la misma función, con esc()/importeHtml() de cada dato (sus interpolaciones las revisa el escáner)'
const NUM = 'número: conteo o largo calculado en el código (count de PostgREST, .length, Set.size)'
const IMPORTE = 'importeHtml() = esc(formatearImporte()): escapa por dentro (ejecutado con la moneda marcada)'
const LABEL_MEDIO = "MEDIO_CUENTA_LABEL[x]: lookup en una constante del código (valores 'Efectivo'/'Banco'); con una clave ajena da undefined o el texto de una función nativa, sin < > \" '. Además cuentas_caja.medio tiene CHECK ('efectivo','banco'), verificado el 21/09/2026"
const FECHA = 'formatearFecha() de una columna DATE (caja_movimientos.fecha / caja_solicitudes_movimiento.fecha, verificado el 21/09/2026): solo dígitos y /'
const CLASE = 'clase CSS: ternario de literales del código'
const SEGURAS = {
  formatearImporteCentavosSuaves: {
    simbolo: "'$' o esc(moneda), armado en la línea de arriba",
    entero: 'formatearNumeroAr(): dígitos, puntos y signo',
    centavos: 'formatearNumeroAr(): dígitos',
  },
  renderizarDesglosePorCuenta: {
    "importeHtml(saldoDeCuenta(favoritaARS.id), 'ARS')": IMPORTE,
    'MEDIO_CUENTA_LABEL[medio]': "medio recorre MEDIOS_DESGLOSE (constante ['efectivo','banco'])",
    medio: "medio recorre MEDIOS_DESGLOSE (constante ['efectivo','banco'])",
    claseSigno: CLASE,
    "importeHtml(sumaARS, 'ARS')": IMPORTE,
    resumenHtml: HTML_PROPIO, filas: 'HTML de renderizarFilaCuenta() (escapa adentro, ejecutada con marcas) o de la plantilla del map de esta función',
    lineaFavoritaHtml: HTML_PROPIO,
    'importeHtml(saldoDeCuenta(c.id), c.moneda)': IMPORTE,
    chips: HTML_PROPIO,
  },
  renderizarStatTotal: {
    "formatearImporteCentavosSuaves(principal ? totalesPorMoneda[principal] : 0, principal || 'ARS')": 'formatearImporteCentavosSuaves(): escapa la moneda por dentro (ejecutada con marca)',
    'importeHtml(totalesPorMoneda[m], m)': IMPORTE,
    montoPrincipalHtml: HTML_PROPIO, chipsExtra: HTML_PROPIO, desgloseHtml: 'HTML de renderizarDesglosePorCuenta(), ejecutada con marcas',
    empleadosConSaldo: NUM, 'estado.movimientosDelMes': NUM, 'estado.misSolicitudesPendientes': NUM,
  },
  renderizarTarjetaPersona: {
    'importeHtml(s.saldo, s.moneda)': IMPORTE, 'importeHtml(principal.saldo, principal.moneda)': IMPORTE,
    otrasMonedas: HTML_PROPIO,
  },
  renderizarListado: {
    'importeHtml(total, moneda)': IMPORTE, 'g.lista.length': NUM, subtotalHtml: HTML_PROPIO,
    "g.lista.map(renderizarTarjetaPersona).join('')": 'HTML de renderizarTarjetaPersona(), que escapa adentro (ejecutada con marcas)',
  },
  renderizarCuentasDirectorio: { 'MEDIO_CUENTA_LABEL[c.medio]': LABEL_MEDIO },
  renderizarSaldosDetalle: {
    clase: CLASE, 'importeHtml(s.saldo, s.moneda)': IMPORTE,
    botonNuevaCuenta: 'botón literal del código o ""', montosHtml: HTML_PROPIO,
    desgloseHtml: 'HTML de renderizarDesglosePorCuenta(), ejecutada con marcas',
  },
  renderizarAccionesDetalle: { "botones.join('')": 'botones literales del código' },
  renderizarFilaMovimiento: {
    personaHtml: HTML_PROPIO, sublineaContraparte: HTML_PROPIO, refGasto: HTML_PROPIO,
    'formatearFecha(m.fecha)': FECHA, signo: "literal '+' o '−'", 'importeHtml(m.monto, m.moneda)': IMPORTE,
  },
  renderizarMovimientos: { 'estado.movimientos.map(m => renderizarFilaMovimiento(m)).join(\'\')': 'HTML de renderizarFilaMovimiento(), ejecutada con marcas' },
  cargarRetiros: { 'retiros.map(m => renderizarFilaMovimiento(m, { mostrarPersona: true })).join(\'\')': 'HTML de renderizarFilaMovimiento(), ejecutada con marcas' },
  cargarTodosMovimientos: { 'estado.todosMovimientos.map(m => renderizarFilaMovimiento(m, { mostrarPersona: true })).join(\'\')': 'HTML de renderizarFilaMovimiento(), ejecutada con marcas' },
  renderizarFilaSolicitud: {
    nota: HTML_PROPIO, botonNegativo: HTML_PROPIO, acciones: HTML_PROPIO,
    importe: 'importeHtml(s.monto, s.moneda) armado arriba', 'formatearFecha(s.fecha)': FECHA,
  },
  renderizarSolicitudesPendientes: { n: NUM, listaHtml: 'HTML de renderizarFilaSolicitud() (ejecutada con marcas) o un literal' },
  renderizarFilaCuenta: {
    logo: 'LOGOS_EMPRESA[nombreUnidad]: ruta literal del código (4 valores); nunca el nombre',
    'MEDIO_CUENTA_LABEL[c.medio]': LABEL_MEDIO,
    iconoMedio: "literal '💳' o '💵'",
    unidadHtml: HTML_PROPIO, saldo: 'importeHtml(saldoDeCuenta(c.id), c.moneda) armado arriba', accionesHtml: HTML_PROPIO,
  },
  renderizarTotalRetiros: { 'importeHtml(total, moneda)': IMPORTE, montosHtml: HTML_PROPIO },
  renderizarTotalMovimientos: { 'importeHtml(total, moneda)': IMPORTE, montosHtml: HTML_PROPIO },
  poblarSelectorCuentaUnica: { 'opcionesCuenta(cuentasDe(empleadoId), favoritaEfectivoARS(empleadoId))': 'opcionesCuenta() escapa por dentro (ejecutada con marcas)' },
  poblarSelectorCuentaPropia: { 'opcionesCuenta(cuentasDe(empleadoPropioId), favoritaEfectivoARS(empleadoPropioId))': 'opcionesCuenta() escapa por dentro (ejecutada con marcas)' },
  actualizarSelectorCuentaContraparte: { 'opcionesCuenta(candidatas)': 'opcionesCuenta() escapa por dentro (ejecutada con marcas)' },
  poblarSelectoresTraspaso: { 'opcionesCuenta(cuentasDe(traspasoEmpleadoId), favoritaEfectivoARS(traspasoEmpleadoId))': 'opcionesCuenta() escapa por dentro (ejecutada con marcas)' },
  actualizarSelectorDestinoTraspaso: { 'opcionesCuenta(candidatas)': 'opcionesCuenta() escapa por dentro (ejecutada con marcas)' },
}
const BURBUJA = 'HTML de htmlBurbujaCaja(), que escapa el texto de la RPC por dentro (ejecutada con marcas en test-caja-pendientes.js)'
Object.assign(SEGURAS, {
  htmlBurbujaCaja: {
    detalle: 'esc(p.detalle) armado en la línea de arriba',
    numero: "'99+' o String() de un entero positivo validado en agruparPendientesCaja()",
  },
  pintarBurbujasCaja: { 'htmlBurbujaCaja(tipo)': BURBUJA },
  renderizarTarjetaPersona: { ...SEGURAS.renderizarTarjetaPersona, "htmlBurbujaCaja('mi')": BURBUJA },
  renderizarAccionesDetalle: { ...SEGURAS.renderizarAccionesDetalle, "htmlBurbujaCaja('empresa')": BURBUJA },
  renderizarSolicitudesPendientes: { ...SEGURAS.renderizarSolicitudesPendientes, 'htmlBurbujaCaja(tipoBurbujaDeFicha(estado.personaAbierta))': BURBUJA },
})
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
  chk('estático: etiquetaMovimiento() queda en TEXTO PLANO (alimenta el Excel)', !/esc\(/.test(cuerpoDe('etiquetaMovimiento')))

  // ── Contexto ─────────────────────────────────────────────────────────────
  const SRC_SEGUROS = { logo: 'LOGOS_EMPRESA[nombreUnidad]: ruta literal del código' }
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
    if (/^style$/i.test(attr)) enStyle.push(`${x.linea}: ${e}`)
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae en un href/src sin encodeURIComponent (salvo las justificadas)', enUrl.length === 0, enUrl.join(', '))
  chk('estático: ninguna interpolación cae en un style', enStyle.length === 0, enStyle.join(', '))
  const huerfanasCtx = Object.keys(SRC_SEGUROS).map(k => 'src::' + k).filter(k => !usadasCtx.has(k))
  chk('estático: ninguna excepción de contexto quedó huérfana', huerfanasCtx.length === 0, huerfanasCtx.join(' | '))
  // El href "Ver gasto →": prefijo literal, los dos valores codificados y el
  // atributo entre comillas DOBLES (encodeURIComponent no escapa la simple).
  chk('estático: el href de "Ver gasto" es prefijo fijo + encodeURIComponent, entre comillas dobles',
    FUENTE.includes('<a href="gastos.html?gasto=${encodeURIComponent(m.gasto_id)}&volver=${encodeURIComponent(location.href)}">'))

  // Otros sinks que el escáner no mira.
  const script = scriptModulo(ARCHIVO)
  chk('estático: no hay insertAdjacentHTML, outerHTML, document.write ni innerHTML +=',
    !/insertAdjacentHTML|\.outerHTML\s*=|document\.write|innerHTML\s*\+=|createContextualFragment/.test(script))
  // Navegación: Caja no lee parámetros de la URL, y sus ÚNICAS navegaciones
  // van a una ruta literal.
  chk('estático: Caja no lee parámetros de la URL (sin ?volver= propio)', !/URLSearchParams|location\.search|location\.hash/.test(script))
  const navs = [...script.matchAll(/(?:location\.href\s*=|location\.replace\(|location\.assign\(|window\.open\()\s*([^\n;)]*)/g)].map(m => norm(m[1]))
  chk('estático: las únicas navegaciones son las dos literales al dashboard',
    navs.length === 2 && navs.every(n => n === "'../dashboard.html'"), navs.join(' | '))
  chk('estático: ningún .src ni .href se asigna en runtime', !/\.(src|href)\s*=(?!=)/.test(script.replace(/location\.href\s*=\s*'\.\.\/dashboard\.html'/, '')))

  const utils = require('fs').readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
  chk('control: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(utils) && !/toast\.innerHTML\s*=/.test(utils))

  if (process.env.INFORME) {
    console.log(`INFORME: ${r.interpolaciones.length} interpolaciones, ${enHtml.length} en HTML (${conEsc} empiezan con esc), ${r.asignaciones.length} asignaciones a innerHTML`)
  }
}

for (const h of HALLAZGOS_ABIERTOS) console.log(`  (hallazgo abierto declarado: ${h})`)
fin()
