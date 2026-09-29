// La barra de unidad de negocio en modulos/cuentas-corrientes.html (28/09/2026).
//
// Facu elige la fábrica UNA vez, arriba (js/barra-unidad.js), y Cuentas
// Corrientes muestra solo lo de esa unidad. Se EJECUTAN los renders reales del
// módulo (extraídos del <script>; pasaFiltroUnidad llega por el import, con su
// código real) con un document falso y una base falsa:
//  - "Todas" muestra todo, con el detalle por unidad (el nombre en cada fila,
//    el total de cada unidad en el resumen, el saldo de cada unidad en la
//    ficha);
//  - una unidad muestra solo lo suyo: la lista de trabajo, el resumen, las
//    facturas sin proveedor, el historial, el padrón (sus saldos) y la ficha;
//  - lo que no tiene unidad se ve siempre, marcado "Sin unidad";
//  - cambiar la elección repinta sin volver a consultar;
//  - los tres selectores de unidad viejos ya no están;
//  - registrar un pago o aplicar un crédito necesitan UNA unidad: con "Todas",
//    la ficha la pide ahí mismo y NO cambia la barra;
//  - el deep link ?proveedor=X&unidad=Y sigue andando;
//  - lo que no se puede filtrar (los proveedores pendientes) lo dice.
//
//   node pruebas/test-cuentas-corrientes-barra-unidad.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-cuentas-corrientes-barra-unidad.js
'use strict'

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {}, style: {},
      classList: { add(){}, remove(){}, toggle(){} },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, focus(){}, removeAttribute(k){ if (k === 'hidden') el.hidden = false } }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => document.getElementById('qs:' + s), body: nuevoEl('body'),
  }
  var location = { href: 'https://x.test/modulos/cuentas-corrientes.html', pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var __historial = []
  var history = { pushState(a, b, u) { __historial.push(['push', u]) }, replaceState(a, b, u) { __historial.push(['replace', u]) } }
  // La base falsa: filtra por eq/in/is como PostgREST y anota cada consulta.
  // __demora: una promesa que hace esperar a las consultas que arrancan
  // mientras está puesta (para probar el turno). Cada consulta responde con
  // los datos del momento en que ARRANCÓ.
  var __datos = {}, __rpc = {}, __consultas = [], __demora = null
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, eq: [], gte: [], lte: [] }
    const foto = __datos[tabla] ?? [], espera = __demora
    __consultas.push(registro)
    const q = {
      select: () => q, order: () => q, limit: () => q, maybeSingle: () => q,
      eq(c, v) { registro.eq.push(c); filtros.push(r => r[c] === v); return q },
      in(c, vs) { filtros.push(r => vs.includes(r[c])); return q },
      is(c, v) { filtros.push(r => (r[c] ?? null) === v); return q },
      gte(c) { registro.gte.push(c); return q }, lte(c) { registro.lte.push(c); return q },
      then(res, rej) { return (espera || Promise.resolve()).then(() => ({ data: foto.filter(r => filtros.every(f => f(r))), error: null })).then(res, rej) },
    }
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async (n) => ({ data: __rpc[n] ?? [], error: null }) }
  var __errores = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito() {}
  function formatearFecha(f) { const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function resetearFiltrosFicha() {}
  function eliminarFactura() { return false } function abrirModalDetallePago() {} function abrirModalAsignarProveedor() {}
  function abrirModalEditarProveedor() {} function abrirFichaDesdePadron() {}
  async function cargarCuentasParaPago() {} function seleccionarMedioPagoCC() {} function renderizarFilasFifo() {}
  function abrirModalAplicarCredito() {}
  var __creditoElegido = null
  async function seleccionarCreditoParaAplicar(c) { __creditoElegido = c }
  var facturasParaPago = [], fichaOrigen = 'lista'
  // Los let top-level del módulo (los turnos de las cargas): acá var.
  var turnoSaldos = 0, turnoHistorial = 0
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:aplicar_credito']),
    unidadElegida: null,
    maestros: { unidades: [], proveedores: [] }, fabrica: FABRICA_SIN_DATOS,
    filtros: { proveedores: { busqueda: '' }, historial: { busqueda: '', fechaDesde: '', fechaHasta: '', rangoRapido: null }, padron: { busqueda: '' } },
    padronSaldos: new Map(), padronSaldosCrudos: [], saldosCrudos: [], historialCrudo: [],
    listaSaldos: [], listaSinProveedor: [], listaHistorial: [], estadoPorFacturaHistorial: {},
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [],
  }
`

const FUNCIONES = [
  // lo de la barra (pasaFiltroUnidad sale de js/barra-unidad.js por el import)
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'cambiarUnidad', 'renderizarNotasUnidad',
  // helpers
  'esc', 'importeHtml', 'formatearImporte', 'formatearImporteCentavosSuaves', 'inicialesEmpresa', 'colorAvatar',
  'badgeEstadoFactura', 'tieneTarea', 'nombreUnidad', 'nombreProveedor', 'poblarSelect', 'fechaISO',
  'unidadesParaElegir', 'unidadesDeFicha', 'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte', 'esSinImporte',
  'productoUnicoConCantidad', 'textoCantidadInsumo', 'totalImporteFormulario', 'decimalesImporteSin', 'enlazarCampoImporteSin',
  'cargarEstadosDeFacturas', 'unidadesDelProveedor', 'cargarCantidadesSinImporte', 'resumenCantidades',
  // la lista de trabajo y el resumen
  'agruparSaldosPorProveedorUnidad', 'cargarSaldos', 'armarListaSaldos', 'renderizarListaSaldos', 'renderizarResumenCC', 'htmlDesgloseResumen',
  'renderizarListaSinProveedor',
  // el padrón y el historial
  'cargarPadronSaldos', 'armarPadronSaldos', 'filtrarPadron', 'renderizarPadron',
  'cargarHistorial', 'armarHistorial', 'renderizarListaHistorial',
  // el cheque endosado (29/09/2026): la referencia de un pago
  'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento',
  // la ficha
  'abrirFicha', 'sincronizarUrlFicha', 'renderizarFicha', 'cambiarUnidadFicha', 'htmlFichaUnidad', 'renderizarFichaUnidad',
  'saldosFichaVisibles', 'saldosFichaDeUnidad', 'creditosFichaDeUnidad',
  'cargarFichaSaldos', 'cargarFichaMovimientos', 'cargarFichaCreditos', 'cargarFichaRemitos',
  'renderizarFichaBanner', 'renderizarFichaMovimientos', 'htmlFilaSinImporte', 'htmlRemitosSinFacturar', 'renderizarFichaRemitos',
  'abrirModalPago', 'abrirModalAplicarCreditoDesdeFicha',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'PALETA_AVATAR', 'TANDA_GASTOS_PAGO']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __historial, __errores, __consultas, __setDatos(t, d){ __datos[t] = d }, __setRpc(n, d){ __rpc[n] = d },
      __credito(){ return __creditoElegido }, __demorar(p){ __demora = p }, __limpiar(){ __consultas.length = 0; __errores.length = 0 }`,
  })
}

// ── Datos: dos unidades reales y cosas SIN unidad ───────────────────────────
const N = 'u-n', D = 'u-d'
const UNIDADES = [{ id: N, nombre: 'Cucuruchos Nuss' }, { id: D, nombre: 'Dolce Pasta' }]
const PROVEEDORES = [
  { id: 'p1', razon_social: 'Harinera Uno', cuit: '30111111111' },
  { id: 'p2', razon_social: 'Cartonera Dos', cuit: '30222222222' },
  { id: 'p3', razon_social: 'Sin Unidad SRL', cuit: '30333333333' },
]
const SALDOS = [
  { proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', deuda_pendiente: 100, credito_disponible: 0 },
  { proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'USD', deuda_pendiente: 50, credito_disponible: 0 },
  { proveedor_id: 'p2', unidad_negocio_id: D, moneda: 'ARS', deuda_pendiente: 0, credito_disponible: 30 },
  { proveedor_id: 'p3', unidad_negocio_id: null, moneda: 'ARS', deuda_pendiente: 10, credito_disponible: 0 },
]
const SIN_PROVEEDOR = [
  { id: 'fsp-n', razon_social: 'Factura de Nuss', importe: 1, moneda: 'ARS', fecha_factura: '2026-10-01', unidad_negocio_id: N },
  { id: 'fsp-d', razon_social: 'Factura de Dolce', importe: 2, moneda: 'ARS', fecha_factura: '2026-10-01', unidad_negocio_id: D },
  { id: 'fsp-0', razon_social: 'Factura huérfana', importe: 3, moneda: 'ARS', fecha_factura: '2026-10-01', unidad_negocio_id: null },
]
const MOVS = [
  { proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-03', tipo: 'factura', monto: 100, factura_pendiente_id: 'f-n', referencia: 'REF-NUSS', saldo_acumulado: 100, orden_desempate: 1 },
  { proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'USD', fecha: '2026-10-02', tipo: 'factura', monto: 50, factura_pendiente_id: 'f-d', referencia: 'REF-DOLCE', saldo_acumulado: 50, orden_desempate: 1 },
  { proveedor_id: 'p1', unidad_negocio_id: null, moneda: 'ARS', fecha: '2026-10-01', tipo: 'factura', monto: 7, factura_pendiente_id: 'f-0', referencia: 'REF-HUERFANA', saldo_acumulado: 7, orden_desempate: 1 },
]
const SIN_IMPORTE = [
  { id: 'si-n', proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS' },
  { id: 'si-d', proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'ARS' },
]
const CREDITOS = [
  { id: 'cr-n', proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', monto_original: 9, monto_disponible: 5, estado: 'disponible' },
  { id: 'cr-d', proveedor_id: 'p1', unidad_negocio_id: D, moneda: 'USD', monto_original: 4, monto_disponible: 4, estado: 'disponible' },
]
const REMITOS = [
  { ingreso_id: 'r-n', fecha: '2026-10-01', numero_doc: 'REM-NUSS', unidad_negocio_id: N, items: 1 },
  { ingreso_id: 'r-d', fecha: '2026-10-01', numero_doc: 'REM-DOLCE', unidad_negocio_id: D, items: 1 },
  { ingreso_id: 'r-0', fecha: '2026-10-01', numero_doc: 'REM-HUERFANO', unidad_negocio_id: null, items: 1 },
]

function preparar(elegida = null) {
  const S = sandbox()
  const E = S.estado
  E.maestros.unidades = UNIDADES.map(u => ({ ...u }))
  E.maestros.proveedores = PROVEEDORES.map(p => ({ ...p }))
  E.unidadElegida = elegida
  E.sinImporte = SIN_IMPORTE.map(f => ({ ...f }))
  E.listaSinProveedor = SIN_PROVEEDOR.map(f => ({ ...f }))
  S.__setDatos('v_saldo_proveedor', SALDOS)
  S.__setDatos('v_cuenta_corriente_movimientos', MOVS)
  S.__setDatos('facturas_pendientes', [
    { id: 'f-n', proveedor_id: 'p1', unidad_negocio_id: N, estado: 'pendiente' },
    { id: 'f-d', proveedor_id: 'p1', unidad_negocio_id: D, estado: 'pendiente' },
    { id: 'f-0', proveedor_id: 'p1', unidad_negocio_id: null, estado: 'pendiente' },
  ])
  S.__setDatos('creditos_proveedor', CREDITOS)
  S.__setRpc('remitos_sin_facturar', REMITOS)
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function main() {
  // ══ 1. La lista de trabajo, el resumen y las facturas sin proveedor ════════
  {
    const S = preparar(null)
    await S.cargarSaldos()
    const E = S.estado
    const lista = html(S, 'lista-proveedores')
    chk('Todas: la lista trae los cuatro proveedor+unidad', E.listaSaldos.length === 4, E.listaSaldos.map(g => g.proveedor_id + '@' + g.unidad_negocio_id).join())
    chk('Todas: cada fila dice su unidad', lista.includes('Cucuruchos Nuss') && lista.includes('Dolce Pasta'))
    chk('Todas: lo que no tiene unidad se ve, marcado "Sin unidad"', lista.includes('Sin Unidad SRL') && lista.includes('Sin unidad'))
    const deuda = html(S, 'resumen-cc-deuda')
    chk('Todas: el resumen dice el total de cada unidad', /resumen-cc-card__desglose/.test(deuda) && deuda.includes('Cucuruchos Nuss') && deuda.includes('Dolce Pasta') && deuda.includes('Sin unidad'), deuda)
    const credito = html(S, 'resumen-cc-credito')
    chk('Todas: el crédito de una sola unidad no lleva desglose (no hay nada que repartir)', !/resumen-cc-card__desglose/.test(credito), credito)
    chk('la consulta de saldos NO filtra por unidad (un .eq descartaría lo sin unidad)',
      S.__consultas.filter(c => c.tabla === 'v_saldo_proveedor').every(c => !c.eq.includes('unidad_negocio_id')))

    S.renderizarListaSinProveedor()
    const sp = html(S, 'lista-sin-proveedor')
    chk('Todas: facturas sin proveedor, las tres con su unidad', sp.includes('Factura de Nuss') && sp.includes('Factura de Dolce') && sp.includes('Factura huérfana') && sp.includes('Sin unidad'))

    // Cambiar la barra con la pantalla abierta: se repinta SIN consultar.
    S.__limpiar()
    S.cambiarUnidad(N)
    chk('cambiar la barra no vuelve a consultar', S.__consultas.length === 0, JSON.stringify(S.__consultas))
    const listaN = html(S, 'lista-proveedores')
    chk('Nuss: la lista muestra lo de Nuss', listaN.includes('Harinera Uno') && listaN.includes('Cucuruchos Nuss'))
    chk('Nuss: la lista NO muestra lo de Dolce', !listaN.includes('Dolce Pasta') && !listaN.includes('Cartonera Dos'), listaN)
    chk('Nuss: lo sin unidad se sigue viendo, marcado', listaN.includes('Sin Unidad SRL') && listaN.includes('Sin unidad'))
    chk('Nuss: la lista son dos filas', E.listaSaldos.length === 2)
    const deudaN = html(S, 'resumen-cc-deuda')
    chk('Nuss: el resumen ya no lleva desglose', !/resumen-cc-card__desglose/.test(deudaN), deudaN)
    chk('Nuss: el total a pagar es 110 (100 de Nuss + 10 sin unidad)', deudaN.includes('110<span class="cc-centavos">,00</span>'), deudaN)
    chk('Nuss: el resumen cuenta solo la descarga sin importe de Nuss', deudaN.includes('+ 1 descarga sin importe'), deudaN)
    const spN = html(S, 'lista-sin-proveedor')
    chk('Nuss: facturas sin proveedor, la de Nuss y la huérfana', spN.includes('Factura de Nuss') && spN.includes('Factura huérfana') && !spN.includes('Factura de Dolce'), spN)
    chk('Nuss: la de Nuss no repite su unidad; la huérfana dice "Sin unidad"', !spN.includes('Cucuruchos Nuss') && spN.includes('Sin unidad'), spN)
    chk('Nuss: la lista de pendientes dice que no se puede filtrar', S.__els.get('nota-unidad-pendientes').hidden === false)

    S.cambiarUnidad(D)
    const listaD = html(S, 'lista-proveedores')
    chk('Dolce: la lista muestra lo de Dolce y lo sin unidad', listaD.includes('Cartonera Dos') && listaD.includes('Dolce Pasta') && listaD.includes('Sin Unidad SRL') && !listaD.includes('Cucuruchos Nuss'), listaD)
    S.cambiarUnidad(null)
    chk('volver a Todas: la lista vuelve a las cuatro', S.estado.listaSaldos.length === 4)
    chk('Todas: la nota de pendientes se esconde', S.__els.get('nota-unidad-pendientes').hidden === true)

    // La búsqueda se suma a la unidad, sin consultar.
    S.cambiarUnidad(N)
    S.__limpiar()
    S.estado.filtros.proveedores.busqueda = 'harinera'
    S.armarListaSaldos()
    chk('búsqueda + unidad: solo Harinera de Nuss', S.estado.listaSaldos.length === 1 && S.estado.listaSaldos[0].proveedor_id === 'p1' && S.__consultas.length === 0)
  }

  // Un proveedor con SOLO descargas sin importe entra a la lista de su unidad.
  {
    const S = preparar(D)
    S.estado.sinImporte = [{ id: 'si-x', proveedor_id: 'p2', unidad_negocio_id: N, moneda: 'ARS' }]
    S.__setDatos('v_saldo_proveedor', [])
    await S.cargarSaldos()
    chk('una descarga sin importe de Nuss no entra con Dolce elegida', S.estado.listaSaldos.length === 0)
    S.cambiarUnidad(N)
    chk('…y sí con Nuss', S.estado.listaSaldos.length === 1 && S.estado.listaSaldos[0].unidad_negocio_id === N)
  }

  // Turno: una respuesta vieja no pisa a la nueva.
  {
    const S = preparar(null)
    let soltar
    S.__demorar(new Promise(r => { soltar = r }))
    const primera = S.cargarSaldos()          // la vieja: 4 filas, tarda
    S.__demorar(null)
    S.__setDatos('v_saldo_proveedor', [SALDOS[0]])
    await S.cargarSaldos()                    // la nueva: 1 fila, llega primero
    soltar()
    await primera                             // la vieja llega tarde
    chk('cargarSaldos: una respuesta vieja que llega tarde no pisa a la nueva', S.estado.saldosCrudos.length === 1, S.estado.saldosCrudos.length)
  }

  // ══ 2. El historial ════════════════════════════════════════════════════════
  {
    const S = preparar(null)
    await S.cargarHistorial()
    const h = html(S, 'lista-historial')
    chk('Todas: el historial trae los tres movimientos, con su unidad', S.estado.listaHistorial.length === 3 && h.includes('Cucuruchos Nuss') && h.includes('Dolce Pasta') && h.includes('Sin unidad'), h)
    chk('la consulta del historial NO filtra por unidad', S.__consultas.filter(c => c.tabla === 'v_cuenta_corriente_movimientos').every(c => !c.eq.includes('unidad_negocio_id')))
    S.__limpiar()
    S.cambiarUnidad(D)
    const hD = html(S, 'lista-historial')
    chk('Dolce: el historial muestra lo de Dolce y lo sin unidad', hD.includes('REF-DOLCE') && hD.includes('REF-HUERFANA') && !hD.includes('REF-NUSS'), hD)
    chk('Dolce: cambiar la barra no consulta el historial de nuevo', S.__consultas.length === 0)
    S.estado.filtros.historial.busqueda = 'nada que ver'
    S.armarHistorial()
    chk('la búsqueda del historial se aplica sobre lo cargado', S.estado.listaHistorial.length === 0)
  }

  // ══ 3. El padrón ═══════════════════════════════════════════════════════════
  {
    const S = preparar(null)
    await S.cargarPadronSaldos()
    let p = html(S, 'lista-padron')
    chk('padrón: lista los tres proveedores', p.includes('Harinera Uno') && p.includes('Cartonera Dos') && p.includes('Sin Unidad SRL'))
    chk('padrón Todas: la nota dice que suma todas las unidades', S.__els.get('nota-unidad-padron').textContent === 'Saldos sumando todas las unidades.')
    chk('padrón Todas: Harinera debe en ARS y en USD', p.includes('USD 50,00') && p.includes('$ 100,00'), p)
    chk('padrón Todas: Harinera tiene 2 descargas sin importe', p.includes('+ 2 descargas sin importe'))
    S.cambiarUnidad(N)
    p = html(S, 'lista-padron')
    chk('padrón Nuss: los proveedores son los mismos', p.includes('Harinera Uno') && p.includes('Cartonera Dos') && p.includes('Sin Unidad SRL'))
    chk('padrón Nuss: el saldo de Harinera es solo el de Nuss', p.includes('$ 100,00') && !p.includes('USD 50,00'), p)
    chk('padrón Nuss: Cartonera (crédito en Dolce) queda en $ 0,00', !p.includes('$ 30,00'), p)
    chk('padrón Nuss: lo sin unidad se sigue contando (Sin Unidad SRL debe 10)', p.includes('$ 10,00'), p)
    chk('padrón Nuss: 1 descarga sin importe (la de Nuss)', p.includes('+ 1 descarga sin importe') && !p.includes('+ 2 descargas'))
    chk('padrón Nuss: la nota dice de qué unidad son los saldos', S.__els.get('nota-unidad-padron').textContent.startsWith('Saldos de Cucuruchos Nuss.'))
  }

  // ══ 4. La ficha ════════════════════════════════════════════════════════════
  // Con Todas en la barra: todas las unidades, sin operar; la unidad se elige
  // en la ficha y la barra no cambia.
  {
    const S = preparar(null)
    const E = S.estado
    await S.abrirFicha('p1', null, 'Harinera Uno')
    chk('ficha Todas: abre en todas las unidades', E.ficha.unidadId === null)
    chk('ficha: las consultas traen TODAS las unidades del proveedor',
      S.__consultas.filter(c => ['v_saldo_proveedor', 'v_cuenta_corriente_movimientos', 'creditos_proveedor'].includes(c.tabla)).every(c => !c.eq.includes('unidad_negocio_id')))
    let banner = html(S, 'ficha-banner')
    chk('ficha Todas: el banner dice el saldo de cada unidad', banner.includes('Cucuruchos Nuss') && banner.includes('Dolce Pasta'), banner)
    chk('ficha Todas: "Registrar pago" y "Aplicar crédito" deshabilitados', /id="btn-registrar-pago" disabled/.test(banner) && /id="btn-aplicar-credito-ficha"\s+disabled/.test(banner), banner)
    chk('ficha Todas: el banner dice por qué y dónde elegir', banner.includes('elegila abajo'))
    let operar = html(S, 'ficha-unidad-operar')
    chk('ficha Todas: pide elegir la unidad ahí mismo, sin cambiar la barra', operar.includes('la barra de arriba no cambia') &&
      operar.includes('data-ficha-unidad="u-n"') && operar.includes('data-ficha-unidad="u-d"'), operar)
    let movs = html(S, 'lista-movimientos-ficha')
    chk('ficha Todas: los movimientos de todas, con su unidad', movs.includes('REF-NUSS') && movs.includes('REF-DOLCE') && movs.includes('REF-HUERFANA') && movs.includes('Sin unidad'))
    chk('ficha Todas: sin saldo corrido', !/fila-movimiento__saldo/.test(movs))
    let rem = html(S, 'ficha-remitos-sin-facturar')
    chk('ficha Todas: los tres remitos, con su unidad', rem.includes('REM-NUSS') && rem.includes('REM-DOLCE') && rem.includes('REM-HUERFANO') && rem.includes('Sin unidad'), rem)

    S.__errores.length = 0
    await S.abrirModalPago()
    chk('ficha Todas: abrir el pago igual lo frena (guarda de fondo)', S.__errores.includes('Elegí una unidad de negocio para registrar un pago.') && S.__els.get('modal-pago')?.hidden !== false)
    S.abrirModalAplicarCreditoDesdeFicha()
    chk('ficha Todas: aplicar crédito igual lo frena', S.__errores.includes('Elegí una unidad de negocio para aplicar un crédito.') && S.__credito() === null)

    // Elegir Nuss EN la ficha.
    S.__limpiar()
    S.__historial.length = 0
    S.cambiarUnidadFicha(N)
    chk('elegir la unidad en la ficha NO cambia la barra', E.unidadElegida === null && E.ficha.unidadId === N)
    chk('elegir la unidad en la ficha no vuelve a consultar', S.__consultas.length === 0, JSON.stringify(S.__consultas))
    chk('la URL de la ficha pasa a &unidad=u-n', S.__historial.length === 1 && S.__historial[0][0] === 'replace' && S.__historial[0][1] === '?proveedor=p1&unidad=u-n', JSON.stringify(S.__historial))
    banner = html(S, 'ficha-banner')
    chk('ficha Nuss: "Registrar pago" habilitado', /id="btn-registrar-pago" >/.test(banner), banner)
    chk('ficha Nuss: el banner es el saldo de Nuss', banner.includes('$ 100,00') && !banner.includes('USD'), banner)
    chk('ficha Nuss: el banner cuenta solo la descarga sin importe de Nuss', banner.includes('+ 1 descarga sin importe'))
    movs = html(S, 'lista-movimientos-ficha')
    chk('ficha Nuss: los movimientos de Nuss y el sin unidad (marcado)', movs.includes('REF-NUSS') && movs.includes('REF-HUERFANA') && !movs.includes('REF-DOLCE') && movs.includes('Sin unidad'), movs)
    chk('ficha Nuss: saldo corrido en el de Nuss, no en el sin unidad', (movs.match(/fila-movimiento__saldo/g) || []).length === 1, movs)
    rem = html(S, 'ficha-remitos-sin-facturar')
    chk('ficha Nuss: el remito de Nuss y el huérfano', rem.includes('REM-NUSS') && rem.includes('REM-HUERFANO') && !rem.includes('REM-DOLCE'), rem)
    operar = html(S, 'ficha-unidad-operar')
    chk('ficha Nuss (barra Todas): dice qué muestra y ofrece volver a todas', operar.includes('Esta cuenta muestra Cucuruchos Nuss') &&
      operar.includes('arriba están todas las unidades') && operar.includes('data-ficha-unidad=""') && operar.includes('Ver todas las unidades'), operar)

    // Operar en Nuss usa SOLO lo de Nuss.
    await S.abrirModalPago()
    chk('pago en Nuss: la moneda es la de Nuss (ARS), una sola', S.__els.get('grupo-moneda-pago').style.display === 'none' &&
      html(S, 'campo-moneda-pago') === '<option value="ARS">ARS</option>', html(S, 'campo-moneda-pago'))
    S.abrirModalAplicarCreditoDesdeFicha()
    chk('crédito en Nuss: se aplica el crédito de Nuss', S.__credito()?.id === 'cr-n', JSON.stringify(S.__credito()))

    // Volver a todas desde la ficha.
    S.cambiarUnidadFicha('')
    chk('"Ver todas las unidades" deja la ficha en todas y la barra igual', E.ficha.unidadId === null && E.unidadElegida === null)

    // Cambiar la BARRA con la ficha abierta: la ficha la sigue.
    S.__historial.length = 0
    S.cambiarUnidad(D)
    chk('cambiar la barra con la ficha abierta la pasa a esa unidad', E.ficha.unidadId === D)
    chk('…y re-sincroniza la URL', S.__historial.some(([t, u]) => t === 'replace' && u === '?proveedor=p1&unidad=u-d'), JSON.stringify(S.__historial))
    chk('…sin nada que elegir en la ficha (la barra ya eligió)', html(S, 'ficha-unidad-operar') === '', html(S, 'ficha-unidad-operar'))
    banner = html(S, 'ficha-banner')
    chk('ficha Dolce: el saldo en USD de Dolce, con los botones habilitados', banner.includes('USD 50,00') && /id="btn-registrar-pago" >/.test(banner), banner)
    S.abrirModalAplicarCreditoDesdeFicha()
    chk('crédito en Dolce: el de Dolce', S.__credito()?.id === 'cr-d')
  }

  // Con una unidad en la barra: la ficha abre en ESA, sin elegir nada.
  {
    const S = preparar(N)
    await S.abrirFicha('p1', null, 'Harinera Uno', 'padron', [N, D])
    chk('barra Nuss: la ficha abre en Nuss', S.estado.ficha.unidadId === N)
    chk('barra Nuss: nada que elegir en la ficha', html(S, 'ficha-unidad-operar') === '')
    chk('barra Nuss: la URL lleva &unidad=u-n', S.__historial.some(([t, u]) => t === 'push' && u === '?proveedor=p1&unidad=u-n'), JSON.stringify(S.__historial))
  }

  // El deep link ?proveedor=X&unidad=Y sigue andando, aunque la barra diga otra.
  {
    const S = preparar(N)
    await S.abrirFicha('p1', D, 'Harinera Uno')
    chk('deep link &unidad=u-d con la barra en Nuss: la ficha abre en Dolce', S.estado.ficha.unidadId === D)
    const op = html(S, 'ficha-unidad-operar')
    chk('…y dice que arriba está elegida otra, con un botón para verla', op.includes('Esta cuenta muestra Dolce Pasta') && op.includes('arriba está elegida Cucuruchos Nuss') && op.includes('data-ficha-unidad="u-n"'), op)
    S.cambiarUnidadFicha(N)
    chk('…el botón la lleva a la de la barra', S.estado.ficha.unidadId === N && html(S, 'ficha-unidad-operar') === '')
  }
  {
    const S = preparar(null)
    await S.abrirFicha('p1', null, 'Harinera Uno')
    chk('deep link sin &unidad= con la barra en Todas: todas las unidades', S.estado.ficha.unidadId === null)
    chk('…y la URL no lleva &unidad=', S.__historial.some(([t, u]) => t === 'push' && u === '?proveedor=p1'))
  }

  // Sin permiso para operar, la elección dice que es para mirar.
  {
    const S = preparar(null)
    S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo'])
    await S.abrirFicha('p1', null, 'Harinera Uno')
    chk('sin registrar_pago ni aplicar_credito: la elección es para ver el saldo corrido', html(S, 'ficha-unidad-operar').includes('Para ver la cuenta de una sola unidad'))
  }
}

// ══ 5. El fuente: los selectores viejos se fueron y el init escucha la barra ═
{
  chk('los tres selectores de unidad viejos ya no están en la página', !/id="filtro-unidad-(proveedores|historial|ficha)"/.test(FUENTE))
  chk('…ni ninguna referencia a ellos en el código', !/filtro-unidad-|poblarFiltrosUnidad|renderizarSelectorUnidadFicha/.test(SCRIPT))
  chk('el módulo importa la barra de js/barra-unidad.js',
    /import \{ unidadesDeLaBarra, alCambiarUnidad, pasaFiltroUnidad, estadoUnidad \} from '\.\.\/js\/barra-unidad\.js'/.test(FUENTE))
  chk('la página sigue cargando la barra', FUENTE.includes('<script type="module" src="../js/barra-unidad.js"></script>'))
  const init = extraerFn(SCRIPT, 'init')
  const iOye = init.indexOf('alCambiarUnidad(({ elegida }) => cambiarUnidad(elegida))')
  const iAll = init.indexOf('await Promise.all([')
  chk('init escucha la barra ANTES de esperar las cargas', iOye !== -1 && iAll !== -1 && iOye < iAll, [iOye, iAll])
  const all = init.slice(iAll, init.indexOf('])', iAll))
  chk('init espera la barra en paralelo con lo demás', all.includes('unidadesDeLaBarra()'), all)
  chk('init toma lo que la barra tiene elegido', /estado\.unidadElegida = estadoUnidad\(\)\.elegida \|\| null/.test(init))
  chk('la ficha abre en la unidad pasada o en la de la barra', /unidadId: unidadId \|\| estado\.unidadElegida \|\| null/.test(extraerFn(SCRIPT, 'abrirFicha')))
  chk('los clics de "elegí la unidad" van a cambiarUnidadFicha', /getElementById\('ficha-unidad-operar'\)\.addEventListener\('click'[\s\S]{0,200}cambiarUnidadFicha\(b\.dataset\.fichaUnidad\)/.test(SCRIPT))
}

esperas.push(main())
fin()
