// CUENTAS CORRIENTES — LAS COMISIONES del proveedor COMISIONES (06/10/2026).
//
// cargar_comision_orden (Administración) deja en la cuenta del proveedor
// COMISIONES una factura con modulo_origen 'comision'. En su ficha, cada
// comisión tiene:
//  - "Pagar": el "Registrar pago" de siempre, en la unidad de la comisión, con
//    el monto de su saldo y ESA factura sola tildada (no las más viejas).
//  - "Se la queda la empresa": quedarse_comision, con un panel propio de
//    confirmación (nunca confirm()), el error de la base TAL CUAL y un doble
//    toque que manda UNA vez.
// Las dos con cuentas_corrientes:registrar_pago. Sin editar ni eliminar (la
// maneja la orden). Se EJECUTAN las funciones reales con un document y una
// base falsos, y con HTML malicioso en lo que viene de la base.
//
//   node pruebas/test-cuentas-corrientes-comisiones.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {}, style: {}, options: [],
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
  var history = { pushState() {}, replaceState() {} }
  var __datos = {}, __consultas = [], __falla = {}, __rpcs = [], __rpcResp = {}
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, in: [], select: null }
    let uno = false
    __consultas.push(registro)
    const q = {
      select: (c) => { registro.select = c; return q }, order: () => q, limit: () => q, gte: () => q, lte: () => q,
      maybeSingle() { uno = true; return q },
      eq(c, v) { filtros.push(r => r[c] === v); return q },
      in(c, vs) { registro.in.push([c, vs]); filtros.push(r => vs.includes(r[c])); return q },
      then(res, rej) {
        if (__falla[tabla]) return Promise.resolve({ data: null, error: { message: 'falló ' + tabla } }).then(res, rej)
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc(n, p) { __rpcs.push([n, JSON.parse(JSON.stringify(p ?? null))]); const r = __rpcResp[n]; return Promise.resolve(typeof r === 'function' ? r(p) : (r ?? { data: [], error: null })) },
  }
  var __errores = [], __exitos = [], __cambiosUnidad = [], __recargas = 0, __fifo = 0
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function eliminarFactura() { return false }
  function abrirModalAplicarCreditoDesdeFicha() {}
  // El modal de pago real lo prueban otras suites: acá se mira que se abra y
  // que deje la factura elegida en cero, como el real.
  async function abrirModalPago() { estado.pagoFacturaElegida = null; document.getElementById('modal-pago').hidden = false }
  function cambiarUnidadFicha(u) { __cambiosUnidad.push(u); estado.ficha.unidadId = u }
  async function recargarTrasImporte() { __recargas++ }
  function renderizarFilasFifo() { __fifo++ }
  var facturasParaPago = []
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago']),
    unidadElegida: null,
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }], proveedores: [{ id: 'pc', razon_social: 'COMISIONES' }] },
    fabrica: FABRICA_SIN_DATOS,
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [], pagoFacturaElegida: null,
  }
`

const FUNCIONES = [
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'esc', 'importeHtml', 'formatearImporte', 'formatearImporteCentavosSuaves',
  'badgeEstadoFactura', 'tieneTarea', 'nombreUnidad', 'contarSinImporte', 'esSinImporte', 'htmlFilaSinImporte', 'decimalesImporteSin',
  'enlazarCampoImporteSin', 'cargarCantidadesSinImporte', 'productoUnicoConCantidad', 'textoCantidadInsumo', 'totalImporteFormulario', 'resumenCantidades',
  'cargarFichaMovimientos', 'renderizarFichaMovimientos', 'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento',
  'esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'etiquetaTipoMovimiento', 'cargarObservacionesSaldoInicial',
  'montoDeCampo', 'actualizarSugerenciasPago',
  // lo nuevo
  'cargarCodigosComision', 'referenciaComision', 'htmlFilaComision', 'elegirSoloFactura', 'pagarComision',
  'pedirQuedarseComision', 'cancelarQuedarseComision', 'confirmarQuedarseComision',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'MEDIOS_PAGO_LABEL', 'TANDA_GASTOS_PAGO', 'NUMERO_SALDO_INICIAL']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __doc: document, __errores, __exitos, __consultas, __rpcs, __cambiosUnidad,
      __recargas(){ return __recargas }, __facturas(){ return facturasParaPago }, __setFacturas(f){ facturasParaPago = f },
      __setDatos(t, d){ __datos[t] = d }, __fallar(t){ __falla[t] = true }, __resp(n, r){ __rpcResp[n] = r }, ponerNumero, leerCampoNumero`,
  })
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

const MOVS = [
  { proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-05', tipo: 'factura', monto: 32120.5, factura_pendiente_id: 'fc1', referencia: 'Orden 13', saldo_acumulado: 42120.5, orden_desempate: 2 },
  { proveedor_id: 'pc', unidad_negocio_id: 'u-d', moneda: 'ARS', fecha: '2026-10-04', tipo: 'factura', monto: 10000, factura_pendiente_id: 'fc2', referencia: 'Orden 7', saldo_acumulado: 10000, orden_desempate: 1 },
  { proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-03', tipo: 'factura', monto: 500, factura_pendiente_id: 'f-comun', referencia: '0001-1', saldo_acumulado: 500, orden_desempate: 0 },
]
const FACTURAS = [
  { id: 'fc1', estado: 'pendiente', saldo_pendiente: 32120.5, modulo_origen: 'comision', observaciones: 'Comisión de la orden N° 13 · Distribuidora Anatolia', proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', numero_comprobante: 'Orden 13', fecha_factura: '2026-10-05' },
  { id: 'fc2', estado: 'parcial', saldo_pendiente: 4000, modulo_origen: 'comision', observaciones: 'Comisión de la orden N° 7 · Kiosco Pepe', proveedor_id: 'pc', unidad_negocio_id: 'u-d', moneda: 'ARS', numero_comprobante: 'Orden 7', fecha_factura: '2026-10-04' },
  { id: 'f-comun', estado: 'pendiente', saldo_pendiente: 500, modulo_origen: 'gastos', observaciones: null, proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', numero_comprobante: '0001-1', fecha_factura: '2026-10-03' },
]
function preparar({ ordenes = [{ codigo: 'N-0013', comision_factura_id: 'fc1' }] } = {}) {
  const S = sandbox()
  S.__setDatos('v_cuenta_corriente_movimientos', MOVS)
  S.__setDatos('facturas_pendientes', FACTURAS)
  S.__setDatos('ordenes_retiro', ordenes)
  S.estado.ficha = { proveedorId: 'pc', unidadId: null, nombre: 'COMISIONES', unidades: ['u-n', 'u-d'],
    filtros: { fechaDesde: '', fechaHasta: '', tipo: 'todos', orden: 'fecha_desc' }, movimientosRaw: [], estadoPorFactura: {} }
  return S
}

// ── La referencia: el código de la orden, nunca el número si se sabe ──────
{
  const S = sandbox()
  chk('con el código: "Orden N-0013 · cliente"', S.referenciaComision('Comisión de la orden N° 13 · Distribuidora Anatolia', 'N-0013', 'Orden 13') === 'Orden N-0013 · Distribuidora Anatolia')
  chk('lo que la base agrega al cerrar no se toma como cliente', S.referenciaComision('Comisión de la orden N° 13 · Anatolia · Sin comisión', 'N-0013') === 'Orden N-0013 · Anatolia')
  chk('sin el código (sin permiso de ver órdenes): lo que escribió la base', S.referenciaComision('Comisión de la orden N° 13 · Anatolia', null, 'Orden 13') === 'Comisión de la orden N° 13 · Anatolia')
  chk('sin observaciones: el número del comprobante', S.referenciaComision(null, null, 'Orden 13') === 'Orden 13')
}

// ── Elegir SOLO esa factura ────────────────────────────────────────────────
{
  const S = sandbox()
  const lista = [{ id: 'f-vieja', saldo: 500, checked: true, monto: 500 }, { id: 'fc1', saldo: 32120.5, checked: false, monto: 0 }]
  const r = S.elegirSoloFactura(lista, 'fc1', 32120.5)
  chk('la comisión tildada con su saldo, la más vieja destildada', r[1].checked && r[1].monto === 32120.5 && !r[0].checked && r[0].monto === 0)
  chk('si se paga menos, va lo que se paga', S.elegirSoloFactura(lista, 'fc1', 1000)[1].monto === 1000)
  chk('si no está en la lista, queda como vino', S.elegirSoloFactura(lista, 'otra', 10) === lista)
}

// ── La ficha: las comisiones con su fila ───────────────────────────────────
{
  const S = preparar()
  esperas.push(S.cargarFichaMovimientos().then(() => {
    const qf = S.__consultas.find(c => c.tabla === 'facturas_pendientes')
    chk('la consulta de facturas trae saldo, modulo_origen y observaciones', /saldo_pendiente/.test(qf.select) && /modulo_origen/.test(qf.select) && /observaciones/.test(qf.select))
    const qo = S.__consultas.find(c => c.tabla === 'ordenes_retiro')
    chk('los códigos se buscan SOLO para las comisiones', qo && JSON.stringify(qo.in) === JSON.stringify([['comision_factura_id', ['fc1', 'fc2']]]), JSON.stringify(qo?.in))
    const h = html(S, 'lista-movimientos-ficha')
    chk('se ve como "Comisión", con el código de la orden', /fila-movimiento__tipo">Comisión</.test(h) && /Orden N-0013 · Distribuidora Anatolia/.test(h))
    chk('la que no tiene código conocido dice lo de la base', /Comisión de la orden N° 7 · Kiosco Pepe/.test(h))
    chk('una pendiente: "Pagar" y "Se la queda la empresa"', /btn-pagar-comision" data-id="fc1">Pagar</.test(h) && /btn-quedarse-comision" data-id="fc1">Se la queda la empresa</.test(h))
    chk('una parcial: "Pagar" pero no "Se la queda" (ya tiene pagos)', /btn-pagar-comision" data-id="fc2"/.test(h) && !/btn-quedarse-comision" data-id="fc2"/.test(h))
    chk('y dice lo que falta pagar', /Falta pagar \$\s4\.000,00/.test(h))
    chk('la comisión no se edita ni se elimina', !/gastos\.html\?factura=fc1/.test(h) && !/data-id="fc1" title="Eliminar"/.test(h))
    chk('una factura común sigue con su fila de siempre', /gastos\.html\?factura=f-comun/.test(h) && !/btn-pagar-comision" data-id="f-comun"/.test(h))
  }))
}
{
  const S = preparar()
  S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo'])
  esperas.push(S.cargarFichaMovimientos().then(() => {
    const h = html(S, 'lista-movimientos-ficha')
    chk('sin registrar_pago no hay botones', /fila-movimiento__tipo">Comisión</.test(h) && !/btn-pagar-comision/.test(h) && !/btn-quedarse-comision/.test(h))
  }))
}
{
  const S = preparar()
  S.__fallar('ordenes_retiro')
  esperas.push(S.cargarFichaMovimientos().then(() => {
    chk('si no se pueden leer las órdenes, la ficha se ve igual', /Comisión de la orden N° 13 · Distribuidora Anatolia/.test(html(S, 'lista-movimientos-ficha')))
  }))
}
{
  // Sin comisiones no se lee ordenes_retiro.
  const S = sandbox()
  S.__setDatos('v_cuenta_corriente_movimientos', [MOVS[2]])
  S.__setDatos('facturas_pendientes', FACTURAS)
  S.estado.ficha = { proveedorId: 'pc', unidadId: null, nombre: 'X', unidades: [], filtros: { tipo: 'todos', orden: 'fecha_desc' }, movimientosRaw: [], estadoPorFactura: {} }
  esperas.push(S.cargarFichaMovimientos().then(() => chk('sin comisiones no se consultan órdenes', !S.__consultas.some(c => c.tabla === 'ordenes_retiro'))))
}

// ── "Pagar" ────────────────────────────────────────────────────────────────
{
  const S = preparar()
  esperas.push(S.cargarFichaMovimientos().then(async () => {
    // El select con las monedas que dejaría abrirModalPago.
    S.__doc.getElementById('campo-moneda-pago').options = [{ value: 'ARS' }]
    // sugerir_facturas_fifo propone la más vieja (la factura común).
    S.__resp('sugerir_facturas_fifo', { data: [{ factura_pendiente_id: 'f-comun', monto_a_aplicar: 500 }], error: null })
    await S.pagarComision('fc1')
    chk('abre el "Registrar pago" de siempre', S.__els.get('modal-pago').hidden === false)
    chk('en la unidad de la comisión', JSON.stringify(S.__cambiosUnidad) === '["u-n"]')
    chk('con el monto de su saldo', S.leerCampoNumero(S.__els.get('campo-monto-pago')) === 32120.5)
    const f = S.__facturas()
    const c = f.find(x => x.id === 'fc1'), v = f.find(x => x.id === 'f-comun')
    chk('esa factura sola tildada, NO la más vieja que sugiere el FIFO', c?.checked === true && c?.monto === 32120.5 && v?.checked === false, JSON.stringify(f))
    chk('y la recuerda si se cambia el monto', S.estado.pagoFacturaElegida === 'fc1')
    chk('la moneda de la comisión', S.__doc.getElementById('campo-moneda-pago').value === 'ARS')
  }))
}
{
  const S = preparar()
  esperas.push(S.cargarFichaMovimientos().then(async () => {
    S.estado.ficha.unidadId = 'u-d'
    await S.pagarComision('fc2')
    chk('ya en su unidad: no la cambia', S.__cambiosUnidad.length === 0)
  }))
}
{
  const S = preparar()
  S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo'])
  esperas.push(S.cargarFichaMovimientos().then(async () => {
    await S.pagarComision('fc1')
    chk('sin registrar_pago no abre nada', S.__els.get('modal-pago')?.hidden !== false)
  }))
}
{
  const S = preparar()
  esperas.push(S.cargarFichaMovimientos().then(async () => {
    await S.pagarComision('f-comun')
    chk('una factura que no es comisión no pasa por acá', S.__els.get('modal-pago')?.hidden !== false)
  }))
}
chk('abrir y cerrar el modal de pago deja la factura elegida en cero',
  /async function abrirModalPago\(\) \{[\s\S]{0,400}estado\.pagoFacturaElegida = null/.test(FUENTE) &&
  /function cerrarModalPago\(\) \{\s*document\.getElementById\('modal-pago'\)\.hidden = true\s*estado\.pagoFacturaElegida = null/.test(FUENTE))

// ── "Se la queda la empresa" ───────────────────────────────────────────────
{
  const S = preparar()
  let soltar = []
  S.__resp('quedarse_comision', () => new Promise(r => soltar.push(() => r({ data: null, error: null }))))
  esperas.push(S.cargarFichaMovimientos().then(async () => {
    S.pedirQuedarseComision('fc1')
    let h = html(S, 'lista-movimientos-ficha')
    chk('abre un panel propio, en la fila', /quedarse-comision" data-id="fc1"/.test(h) && /Esta comisión de \$\s32\.120,50 se cierra/.test(h) && /btn-confirmar-quedarse" data-id="fc1">Sí, se la queda la empresa</.test(h))
    chk('mientras pregunta, la fila no ofrece los botones', !/btn-pagar-comision" data-id="fc1"/.test(h))
    chk('nada se manda hasta confirmar', !S.__rpcs.some(r => r[0] === 'quedarse_comision'))
    const p1 = S.confirmarQuedarseComision('fc1')
    const p2 = S.confirmarQuedarseComision('fc1')
    h = html(S, 'lista-movimientos-ficha')
    chk('mientras manda: "Guardando…" trabado', /btn-confirmar-quedarse" data-id="fc1" disabled>Guardando…/.test(h))
    for (const s of soltar) s()
    await Promise.race([Promise.all([p1, p2]), new Promise((_, no) => setTimeout(() => no(new Error('quedó colgada')), 3000))])
    const llamadas = S.__rpcs.filter(r => r[0] === 'quedarse_comision')
    chk('doble toque: UNA llamada, con la factura', llamadas.length === 1 && llamadas[0][1].p_factura_pendiente_id === 'fc1', JSON.stringify(llamadas))
    chk('lo dice y recarga la ficha', S.__exitos.includes('Listo: la comisión se cerró y se la queda la empresa.') && S.__recargas() === 1 && S.estado.ficha.quedarse === null)
  }))
}
{
  const S = preparar()
  S.__resp('quedarse_comision', { data: null, error: { message: 'Esa comisión ya tiene pagos.' } })
  esperas.push(S.cargarFichaMovimientos().then(async () => {
    S.pedirQuedarseComision('fc1')
    await S.confirmarQuedarseComision('fc1')
    const h = html(S, 'lista-movimientos-ficha')
    chk('el error de la base va TAL CUAL, pegado al botón', /cargar-importe-cc__error">Esa comisión ya tiene pagos\.</.test(h))
    chk('y se puede volver a intentar', S.estado.ficha.quedarse && S.estado.ficha.quedarse.enCurso === false && S.__recargas() === 0)
    S.cancelarQuedarseComision()
    chk('cancelar cierra el panel sin mandar nada más', S.estado.ficha.quedarse === null && S.__rpcs.filter(r => r[0] === 'quedarse_comision').length === 1)
  }))
}
{
  const S = preparar()
  S.estado.misTareas = new Set(['cuentas_corrientes:ver_todo'])
  esperas.push(S.cargarFichaMovimientos().then(() => {
    S.pedirQuedarseComision('fc1')
    chk('sin registrar_pago el panel no se abre', !S.estado.ficha.quedarse)
  }))
}
{
  const ini = FUENTE.indexOf('    // LAS COMISIONES (06/10/2026)\n')
  const bloque = ini < 0 ? '' : FUENTE.slice(ini, FUENTE.indexOf('DESCARGAS SIN IMPORTE Y REMITOS SIN FACTURAR (circuito', ini))
  chk('la confirmación es un panel propio: nada de confirm()', bloque.length > 2000 && !/confirm\(/.test(bloque), bloque.length)
}

// ── XSS de lo nuevo ────────────────────────────────────────────────────────
{
  const S = sandbox()
  S.estado.ficha = { unidadId: null }
  S.estado.maestros.unidades = [{ id: 'u-n', nombre: marca('unidad') }]
  const m = { ...MOVS[0], factura_pendiente_id: marca('id'), moneda: 'ARS', referencia: marca('referencia') }
  const h = S.htmlFilaComision(m, {
    info: { estado: 'pendiente', saldo_pendiente: 10, modulo_origen: 'comision', observaciones: 'Comisión de la orden N° 1 · ' + marca('cliente') },
    codigo: marca('codigo'), puedePagar: true, quedarse: { facturaId: 'x', error: marca('error-quedarse'), enCurso: false }, todas: true,
  })
  chequearMarcas(chk, 'fila de comisión', h, ['id', 'cliente', 'codigo', 'error-quedarse', 'unidad'])
  const h2 = S.htmlFilaComision(m, { info: { estado: 'pendiente', observaciones: marca('obs') }, codigo: null, puedePagar: true })
  chequearMarcas(chk, 'fila de comisión sin código', h2, ['obs', 'id'])
  const h3 = S.htmlFilaComision(m, { info: { estado: 'pendiente', observaciones: null }, codigo: null })
  chequearMarcas(chk, 'fila de comisión con la referencia de la vista', h3, ['referencia'])
}

fin()
