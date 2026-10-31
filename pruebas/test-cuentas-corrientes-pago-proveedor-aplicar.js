// CUENTAS CORRIENTES: LA FACTURA ELEGIDA VIAJA, "APLICAR A FACTURAS" Y ANULAR
// UN PAGO A PROVEEDOR (30/10/2026, rama ci-prueba/pago-proveedor-aplicar).
//
// Pedido de Facu (30/10/2026):
//  1. ERROR: Yanina eligió una factura al pagarle a BADIC con cheques de la
//     cartera (uno de Dolce Pasta) y el pago llegó SIN aplicaciones. La
//     factura elegida tiene que viajar en p_aplicaciones; y sin ninguna
//     elegida, no se confirma sin avisar "No elegiste ninguna factura: el pago
//     va a quedar a cuenta. ¿Seguro?".
//     LA CAUSA (reproducida en la maqueta): en la lista de facturas solo
//     tildaba el cuadradito; tocar el renglón (como en la lista de cheques,
//     justo abajo, donde el renglón entero tilda) no hacía nada, y el pago
//     salía con p_aplicaciones = [] sin preguntar.
//  2. "A cuenta $ X · Aplicar a facturas" en el renglón del pago y en su
//     detalle: propone de la más vieja a la más nueva, editable, y confirma con
//     aplicar_pago_a_facturas(p_gasto_id, p_aplicaciones) → {aplicado,
//     queda_a_cuenta}; el error de la base tal cual; con registrar_pago.
//  3. ANULAR un pago (cualquier medio) desde su detalle: motivo obligatorio,
//     la vista previa ("Vuelven a la cartera: N° … · La factura … vuelve a
//     deber $ …"), anular_gasto(p_gasto_id, p_motivo), después "Hacer el pago
//     de nuevo"; la orden de pago de un pago anulado, tachada con "ANULADA" y
//     sin reimprimir.
// Se EJECUTAN las funciones reales del módulo con un document y una base
// falsos. La base falsa repite la lógica de aplicar_pago_a_facturas y de
// anular_gasto (leídas con pg_get_functiondef el 30/10/2026), así lo que se ve
// DESPUÉS (la factura pagada, el crédito que baja, los cheques en la cartera,
// la factura que vuelve a deberse, la orden anulada) sale de releer.
//
//   node pruebas/test-cuentas-corrientes-pago-proveedor-aplicar.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_PAGO_APLICAR } = require('./pago-aplicar-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const HOY = '2026-10-30'

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const clases = new Set()
    return { id, value: '', innerHTML: '', textContent: '', hidden: true, disabled: false, style: {}, dataset: {}, options: [], __q: {},
      setAttribute() {}, getAttribute() { return null }, removeAttribute(k) { if (k === 'hidden') this.hidden = false },
      classList: { add(c) { clases.add(c) }, remove(c) { clases.delete(c) }, toggle(c, si) { if (si === undefined) si = !clases.has(c); if (si) clases.add(c); else clases.delete(c) }, contains(c) { return clases.has(c) } },
      addEventListener() {}, focus() { __focos.push(id) }, querySelectorAll: () => [], querySelector(sel) { return this.__q[sel] ?? null }, closest: () => null }
  }
  var __els = new Map(), __focos = []
  var __medios = ['efectivo', 'transferencia', 'qr'].map(v => { const b = nuevoEl('m-' + v); b.dataset.valor = v; return b })
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) { return sel === '#grilla-medio-pago-cc .btn-tipo-doc' ? __medios : [] },
    querySelector: () => null,
    documentElement: nuevoEl('html'),
  }
  var __impresiones = 0
  var window = { addEventListener() {}, removeEventListener() {}, print() { __impresiones++ } }

  // ── La base falsa ─────────────────────────────────────────────────────
  // __db: las tablas (se leen filtradas por eq / in, como PostgREST). Las
  // aplicaciones llevan su factura embebida, armada al leer (así se ve el
  // estado de AHORA). Cada rpc se anota; las que cambian datos repiten la
  // lógica del SQL.
  var __db = {}, __rpc = [], __consultas = [], __falla = {}, __fallaSel = {}, __rpcError = {}, __espera = null
  var __yo = 'emp-yanina'
  function __embeber(t, r) {
    if (t !== 'aplicaciones_pago') return r
    const f = (__db.facturas_pendientes ?? []).find(x => x.id === r.factura_pendiente_id)
    return { ...r, facturas_pendientes: f ? { numero_comprobante: f.numero_comprobante, origen_gasto_id: f.origen_gasto_id ?? null } : null }
  }
  var supabase = {
    from(t) {
      const filtros = [], reg = { t, sel: null, eq: [], in: [] }
      let uno = false
      const q = {
        select(c) { reg.sel = c; return q }, order() { return q },
        eq(c, v) { reg.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
        in(c, vs) { reg.in.push([c, vs]); filtros.push(r => vs.includes(r[c])); return q },
        maybeSingle() { uno = true; return q },
        then(res, rej) {
          __consultas.push(reg)
          if (__falla[t] || (__fallaSel[t] && __fallaSel[t].test(reg.sel ?? ''))) return Promise.resolve({ data: null, error: { message: 'sin permiso: ' + t } }).then(res, rej)
          const filas = (__db[t] ?? []).filter(r => filtros.every(f => f(r))).map(r => JSON.parse(JSON.stringify(__embeber(t, r))))
          return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
        },
      }
      return q
    },
    async rpc(nombre, params) {
      __rpc.push({ nombre, params: JSON.parse(JSON.stringify(params)) })
      if (__espera) await __espera
      if (__rpcError[nombre]) return { data: null, error: { message: __rpcError[nombre] } }
      try {
        if (nombre === 'aplicar_pago_a_facturas') return { data: __aplicar(params), error: null }
        if (nombre === 'anular_gasto') { __anular(params); return { data: null, error: null } }
        if (nombre === 'pagar_proveedor_mixto') return { data: { orden_pago_id: 'op-nueva', numero: 3, numero_texto: 'N-OP-00003', total: 4200000, aplicado: 3360000.01, a_favor: 839999.99 }, error: null }
      } catch (e) { return { data: null, error: { message: e.message } } }
      return { data: null, error: null }
    },
  }
  const __c = (v) => Math.round(Number(v) * 100)
  // aplicar_pago_a_facturas (pg_get_functiondef, 30/10/2026), en centavos.
  function __aplicar({ p_gasto_id, p_aplicaciones }) {
    if (!estado.misTareas.has('cuentas_corrientes:registrar_pago') && estado.miRolApp !== 'super_admin') throw new Error('No tenés permiso para aplicar pagos.')
    const copia = JSON.parse(JSON.stringify(__db))
    const g = copia.gastos.find(x => x.id === p_gasto_id)
    if (!g || !g.proveedor_id) throw new Error('Ese pago a proveedor no existe.')
    if (g.estado === 'anulado') throw new Error('Ese pago está anulado.')
    if (!Array.isArray(p_aplicaciones) || !p_aplicaciones.length) throw new Error('Elegí al menos una factura.')
    const libres = copia.creditos_proveedor.filter(c => c.origen_gasto_id === p_gasto_id && c.estado === 'disponible')
    const libre = libres.reduce((s, c) => s + __c(c.monto_disponible), 0)
    let total = 0
    for (const x of p_aplicaciones) {
      const m = __c(x.monto_aplicado)
      if (!(m > 0)) continue
      const f = copia.facturas_pendientes.find(y => y.id === x.factura_pendiente_id)
      if (!f || f.proveedor_id !== g.proveedor_id || f.unidad_negocio_id !== g.unidad_negocio_id) throw new Error('Una factura no es de este proveedor o de esta empresa.')
      if (!['pendiente', 'parcial'].includes(f.estado)) throw new Error('La factura ' + f.numero_comprobante + ' no está pendiente.')
      if (m > __c(f.saldo_pendiente)) throw new Error('A la factura ' + f.numero_comprobante + ' le quedan $ ' + f.saldo_pendiente + ' pendientes.')
      const ap = copia.aplicaciones_pago.find(a => a.gasto_id === p_gasto_id && a.factura_pendiente_id === f.id)
      if (ap) ap.monto_aplicado = (__c(ap.monto_aplicado) + m) / 100
      else copia.aplicaciones_pago.push({ gasto_id: p_gasto_id, factura_pendiente_id: f.id, monto_aplicado: m / 100 })
      f.saldo_pendiente = (__c(f.saldo_pendiente) - m) / 100
      f.estado = __c(f.saldo_pendiente) <= 0 ? 'pagada' : 'parcial'
      total += m
    }
    if (total > libre) throw new Error('Este pago tiene $ ' + libre / 100 + ' a cuenta y querés aplicar $ ' + total / 100 + '.')
    let resta = total
    for (const c of libres) {
      if (resta <= 0) break
      const toma = Math.min(resta, __c(c.monto_disponible))
      if (__c(c.monto_original) - toma > 0) {
        c.monto_original = (__c(c.monto_original) - toma) / 100
        c.monto_disponible = (__c(c.monto_disponible) - toma) / 100
        if (__c(c.monto_disponible) <= 0) c.estado = 'agotado'
      } else copia.creditos_proveedor = copia.creditos_proveedor.filter(y => y.id !== c.id)
      resta -= toma
    }
    Object.assign(__db, copia)
    return { aplicado: total / 100, queda_a_cuenta: (libre - total) / 100 }
  }
  // anular_gasto (pg_get_functiondef, 30/10/2026).
  function __anular({ p_gasto_id, p_motivo }) {
    const copia = JSON.parse(JSON.stringify(__db))
    const g = copia.gastos.find(x => x.id === p_gasto_id)
    if (!g) throw new Error('Gasto no encontrado')
    if (g.estado === 'anulado') throw new Error('Este gasto ya está anulado')
    if (g.empleado_id !== __yo && !estado.misTareas.has('gastos:editar_anular') && estado.miRolApp !== 'super_admin') throw new Error('Solo podés anular tus propios gastos')
    if (!p_motivo || !String(p_motivo).trim()) throw new Error('El motivo es obligatorio')
    if (copia.creditos_proveedor.some(c => c.origen_gasto_id === p_gasto_id && __c(c.monto_disponible) < __c(c.monto_original)))
      throw new Error('Este pago generó un crédito que ya fue usado en otra factura — no se puede anular automáticamente. Contactá a un super_admin para resolverlo a mano.')
    for (const a of copia.aplicaciones_pago.filter(x => x.gasto_id === p_gasto_id)) {
      const f = copia.facturas_pendientes.find(y => y.id === a.factura_pendiente_id)
      if (f.origen_gasto_id === p_gasto_id) { f.estado = 'anulada'; f.saldo_pendiente = 0; continue }
      f.saldo_pendiente = (__c(f.saldo_pendiente) + __c(a.monto_aplicado)) / 100
      f.estado = __c(f.saldo_pendiente) >= __c(f.importe) ? 'pendiente' : 'parcial'
    }
    copia.aplicaciones_pago = copia.aplicaciones_pago.filter(x => x.gasto_id !== p_gasto_id)
    for (const c of copia.creditos_proveedor) if (c.origen_gasto_id === p_gasto_id && c.estado === 'disponible' && __c(c.monto_original) === __c(c.monto_disponible)) { c.estado = 'anulado'; c.monto_disponible = 0 }
    g.estado = 'anulado'; g.motivo_anulacion = p_motivo
    if (g.medio_pago === 'cheque') {
      for (const q of copia.cobranza_cheques) {
        if ((q.pago_gasto_id ?? q.salida_gasto_id) !== p_gasto_id || q.estado !== 'endosado') continue
        Object.assign(q, { estado: 'en_cartera', pago_gasto_id: null, salida_gasto_id: null })
      }
    }
    Object.assign(__db, copia)
  }

  var turnoCartera = 0, bancosBcra = null, turnoFacturasPago = 0, errorFacturasPago = null
  var accionesPago = null, turnoAccionesPago = 0, aplicarPago = null, turnoAplicarPago = 0, turnoOrdenPago = 0
  var __errores = [], __exitos = [], __recargas = [], __ordenesAbiertas = [], __detallesAbiertos = [], __detallesCerrados = 0, __unidadesFicha = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).slice(0, 10).split('-'); return d + '/' + m + '/' + a }
  var __montos = {}
  function montoDeCampo(id) { return __montos[id] ?? null }
  function ponerNumero(el, n) { if (!el) return; __montos[el.id] = n; el.value = n == null ? '' : String(n) }
  function leerCampoNumero(el) { return __montos[el.id] ?? (el.value === '' ? null : Number(el.value)) }
  function enlazarCampoNumero() {}
  function hoyCC() { return '${HOY}' }
  function fechaISO() { return '${HOY}' }
  function sinUnidadesDePrueba(lista) { return lista }
  async function cargarFichaSaldos() { __recargas.push('saldos') } async function cargarFichaMovimientos() { __recargas.push('movimientos') }
  function renderizarFichaBanner() {} function cargarSaldos() {}
  async function cargarCuentasParaPago() {}
  function saldosFichaDeUnidad() { return [{ unidad_negocio_id: estado.ficha?.unidadId, moneda: 'ARS', deuda_pendiente: 1 }] }
  function poblarSelect() {}
  async function abrirOrdenPago(id) { __ordenesAbiertas.push(id) }
  async function abrirModalDetallePago(id) { __detallesAbiertos.push(id); document.getElementById('modal-detalle-pago').hidden = false; await cargarAccionesDetallePago(id) }
  function cerrarModalDetallePago() { __detallesCerrados++; document.getElementById('modal-detalle-pago').hidden = true }
  function cambiarUnidadFicha(u) { __unidadesFicha.push(u); estado.ficha.unidadId = u }
  var medioPagoSeleccionado = null, carteraPago = [], facturasParaPago = []
  var estado = { miRolApp: 'usuario', miEmpleadoId: __yo, misTareas: new Set(['cuentas_corrientes:registrar_pago', 'cuentas_corrientes:ver_todo', 'cobranzas:procesar', 'cobranzas:ver_todo']),
    ficha: { proveedorId: 'pv-badic', unidadId: 'u-n', nombre: 'BADIC S.A.S.' }, fichaCreditos: [],
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' }] },
    cuentasPago: { propias: [], empresa: [] }, fabrica: null, pagoCheques: false, pagoError: null, pagoEnviando: false }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'tieneTarea', 'nombreUnidad', 'etiquetaUnidad', 'numeroParaMostrar',
  // la cartera y el pago (los reales, así el pago es el de la pantalla)
  'puedeUsarCartera', 'fechaCobroCheque', 'libradorDe', 'sumaCheques', 'chequesParaPagar', 'agruparChequesPorEmpresa',
  'textoAvisoOtraEmpresa', 'avisosOtraEmpresa', 'htmlFilaCartera', 'htmlListaCartera', 'renderizarCarteraPago', 'pintarTotalCartera',
  'tildarChequeCartera', 'cargarCarteraParaPago', 'asegurarBancos', 'pintarCarteraPago',
  'monedaPago', 'esPagoEnPesos', 'seleccionarMedioPagoCC', 'pintarMedioPorMoneda', 'actualizarSelectorCuentaPago',
  'totalesPago', 'totalesPagoActuales', 'estadoDiferencia', 'htmlBarraPago', 'aplicarAFacturasViejas',
  'aplicacionesPago', 'validarPago', 'parametrosPagoMixto', 'textoResumenPago', 'pintarPiePago', 'refrescarPago',
  'abrirModalPago', 'cerrarModalPago', 'actualizarSugerenciasPago', 'renderizarFilasFifo', 'elegirSoloFactura',
  'textoExitoPago', 'recargarFichaDespuesDePago', 'confirmarPago',
  // la cuenta del proveedor y las órdenes de pago
  'cargarFichaCreditos', 'numeroTextoOrden', 'fechaOrden', 'cargarOrdenesDePagos', 'imprimirOrdenPago',
  ...FUNCIONES_PAGO_APLICAR,
]
const CONSTANTES = ['MEDIOS_CHEQUE', 'NOMBRE_MEDIO', 'MEDIO_CUENTA_LABEL', 'MEDIO_PAGO_A_MEDIO_CUENTA', 'NUMERO_SALDO_INICIAL', 'NOMBRE_MEDIO_ORDEN', 'TANDA_GASTOS_PAGO']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: [...new Set(FUNCIONES)], constantes: CONSTANTES,
    retorno: `estado, __els, __db, __rpc, __consultas, __falla, __fallaSel, __rpcError, __errores, __exitos, __recargas, __montos, __focos,
      __ordenesAbiertas, __detallesAbiertos, __unidadesFicha,
      __detallesCerrados(){ return __detallesCerrados }, __impresiones(){ return __impresiones },
      __setVar(k, v){ eval(k + ' = v') }, __getVar(k){ return eval(k) }, __esperar(p){ __espera = p }`,
  })
}
const el = (S, id) => S.__getVar('document').getElementById(id)
const rpcs = (S, n) => S.__rpc.filter(r => r.nombre === n)

// ── Los datos de BADIC (como en la base el 30/10/2026, con ids de prueba) ──
function badic({ conPagoHecho = false } = {}) {
  const db = {
    facturas_pendientes: [
      { id: 'fp-nd', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pendiente', numero_comprobante: 'Nota de débito 013', fecha_factura: '2026-10-06', importe: 349550, saldo_pendiente: 349550 },
      { id: 'fp-si', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pendiente', numero_comprobante: 'SALDO-INICIAL', fecha_factura: '2026-10-10', importe: 11871325.84, saldo_pendiente: 11871325.84 },
      { id: 'fp-4', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pendiente', numero_comprobante: '0004-00011115', fecha_factura: '2026-10-14', importe: 3360000.01, saldo_pendiente: 3360000.01 },
      // Las que NO tienen que aparecer: de otra empresa, en dólares, pagada.
      { id: 'fp-dolce', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-d', moneda: 'ARS', estado: 'pendiente', numero_comprobante: '0009-1', fecha_factura: '2026-10-01', importe: 10, saldo_pendiente: 10 },
      { id: 'fp-usd', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'USD', estado: 'pendiente', numero_comprobante: '0009-2', fecha_factura: '2026-10-01', importe: 10, saldo_pendiente: 10 },
      { id: 'fp-vieja', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'pagada', numero_comprobante: '0009-3', fecha_factura: '2026-09-01', importe: 10, saldo_pendiente: 0 },
    ],
    cobranza_cheques: [
      { id: 'chq-a', cobranza_id: 'cob-n', banco_codigo: '285', numero: '62921151', tipo: 'diferido', fecha_emision: '2026-10-01', fecha_pago: '2026-11-20', importe: 2000000, titulares: [], estado: 'en_cartera', pago_gasto_id: null, salida_gasto_id: null },
      { id: 'chq-b', cobranza_id: 'cob-d', banco_codigo: '191', numero: '62294736', tipo: 'diferido', fecha_emision: '2026-10-01', fecha_pago: '2026-11-25', importe: 2200000, titulares: [], estado: 'en_cartera', pago_gasto_id: null, salida_gasto_id: null },
    ],
    v_cobranzas: [
      { id: 'cob-n', estado: 'procesada', unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss', moneda: 'ARS', cliente: 'Cliente N' },
      { id: 'cob-d', estado: 'procesada', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta', moneda: 'ARS', cliente: 'Cliente D' },
    ],
    bancos_bcra: [],
    gastos: [], aplicaciones_pago: [], creditos_proveedor: [],
    ordenes_pago: [],
  }
  if (conPagoHecho) {
    // El pago ya hecho (lo que debió quedar si la factura viajaba), con la
    // orden de pago N-OP-00002 y 839.999,99 a cuenta.
    db.gastos.push({ id: 'g-badic', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', importe: 4200000, medio_pago: 'cheque', cuenta_id: null,
      estado: 'registrado', empleado_id: 'emp-yanina', orden_pago_id: 'op-2', motivo_anulacion: null, fecha_pago: '2026-10-30',
      descripcion: 'Pago con cheques de terceros (N° 62921151, N° 62294736) — BADIC S.A.S.' })
    db.ordenes_pago.push({ id: 'op-2', unidad_negocio_id: 'u-n', proveedor_id: 'pv-badic', numero: 2, fecha: '2026-10-30', total: 4200000, creada_en: '2026-10-30T15:47:26Z' })
    db.aplicaciones_pago.push({ gasto_id: 'g-badic', factura_pendiente_id: 'fp-4', monto_aplicado: 3360000.01 })
    const f4 = db.facturas_pendientes.find(f => f.id === 'fp-4'); f4.saldo_pendiente = 0; f4.estado = 'pagada'
    db.creditos_proveedor.push({ id: 'cr-badic', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', origen_gasto_id: 'g-badic', monto_original: 839999.99, monto_disponible: 839999.99, estado: 'disponible' })
    for (const q of db.cobranza_cheques) Object.assign(q, { estado: 'endosado', pago_gasto_id: 'g-badic' })
  }
  return db
}
// Un pago a cuenta: todo el crédito sin aplicar (el caso BADIC tal como llegó).
function badicACuenta() {
  const db = badic()
  db.gastos.push({ id: 'g-cuenta', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', importe: 4200000, medio_pago: 'cheque', cuenta_id: null,
    estado: 'registrado', empleado_id: 'emp-yanina', orden_pago_id: 'op-2', motivo_anulacion: null, fecha_pago: '2026-10-30', descripcion: 'Pago con cheques de terceros (N° 62921151, N° 62294736) — BADIC S.A.S.' })
  db.creditos_proveedor.push({ id: 'cr-cuenta', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', origen_gasto_id: 'g-cuenta', monto_original: 4200000, monto_disponible: 4200000, estado: 'disponible' })
  return db
}
function conDatos(S, db) { Object.keys(S.__db).forEach(k => delete S.__db[k]); Object.assign(S.__db, db) }

// El renglón de una factura de la lista del pago, como el navegador: la
// casilla, el monto y el texto (el número). closest() sube por el renglón.
function renglonFactura(S, i) {
  const chk = { checked: false, disabled: false, dataset: { index: String(i) }, closest: (sel) => sel.includes('input') ? chk : (sel === '.fila-fifo' ? fila : null) }
  const monto = { id: 'monto-fifo-' + i, value: '' }
  const clases = new Set()
  const fila = { querySelector: (sel) => (sel === '.check-fifo' ? chk : null), classList: { toggle(c, si) { if (si) clases.add(c); else clases.delete(c) }, contains: c => clases.has(c) } }
  const texto = { closest: (sel) => (sel === '.fila-fifo' ? fila : null) }
  el(S, 'lista-fifo').__q[`.monto-fifo[data-index="${i}"]`] = monto
  return { chk, monto, fila, texto, tildada: () => clases.has('fila-fifo--tildada') }
}

async function prepararPagoBadic(S) {
  conDatos(S, badic())
  el(S, 'campo-fecha-pago-cc').value = HOY
  await S.actualizarSugerenciasPago()
  S.estado.pagoCheques = true
  await S.cargarCarteraParaPago('u-n')
  const cp = S.__getVar('carteraPago')
  cp.forEach((c, i) => S.tildarChequeCartera(i, true))
}

async function main() {
  // ══ 1. LA FACTURA ELEGIDA VIAJA (caso BADIC) ════════════════════════════════
  {
    const S = sandbox()
    await prepararPagoBadic(S)
    const fx = S.__getVar('facturasParaPago')
    chk('BADIC: las facturas de la lista son las de esa empresa, en pesos, pendientes, la más vieja arriba',
      JSON.stringify(fx.map(f => f.id)) === '["fp-nd","fp-si","fp-4"]', JSON.stringify(fx.map(f => f.id)))
    chk('BADIC: los dos cheques tildados (uno de Dolce Pasta), $ 4.200.000', S.totalesPagoActuales().cValores === 420000000 && S.__getVar('carteraPago').some(c => c.otraEmpresa))
    // Yanina "elige" la factura tocando su renglón (en los cheques, tocar el
    // renglón tilda): ahora la tilda también.
    const r = renglonFactura(S, 2)
    S.alTocarRenglonFactura({ target: r.texto })
    chk('tocar el renglón de la factura la tilda', fx[2].checked === true && r.chk.checked === true && r.tildada())
    chk('tocar el renglón pone su saldo en el monto (con ponerNumero)', fx[2].monto === 3360000.01 && S.__montos['monto-fifo-2'] === 3360000.01, JSON.stringify(fx[2]))
    await S.confirmarPago()
    const p = rpcs(S, 'pagar_proveedor_mixto')
    chk('la factura elegida VIAJA en p_aplicaciones (con el cheque de otra empresa)', p.length === 1 &&
      JSON.stringify(p[0].params.p_aplicaciones) === JSON.stringify([{ factura_pendiente_id: 'fp-4', monto_aplicado: 3360000.01 }]), JSON.stringify(p[0]?.params))
    chk('viajan los dos cheques, sin resto', p[0] && JSON.stringify(p[0].params.p_cheque_ids) === '["chq-a","chq-b"]' && p[0].params.p_monto_resto === 0, JSON.stringify(p[0]?.params))
    chk('con una factura elegida no se pregunta nada', S.estado.pagoPreguntaACuenta !== true)
  }
  {
    // La casilla sola (el camino de siempre) también viaja.
    const S = sandbox()
    await prepararPagoBadic(S)
    const r = renglonFactura(S, 2)
    r.chk.checked = true
    S.tildarFacturaPago(2, true, r.fila)
    await S.confirmarPago()
    chk('tildar la casilla: la factura viaja', JSON.stringify(rpcs(S, 'pagar_proveedor_mixto')[0]?.params.p_aplicaciones) === JSON.stringify([{ factura_pendiente_id: 'fp-4', monto_aplicado: 3360000.01 }]))
  }
  {
    // Tocar la casilla o el monto NO pasa por el renglón (si no, se
    // destildaría sola: el navegador ya la dio vuelta).
    const S = sandbox()
    await prepararPagoBadic(S)
    const r = renglonFactura(S, 1)
    S.alTocarRenglonFactura({ target: r.chk })
    S.alTocarRenglonFactura({ target: { closest: (sel) => (sel.includes('input') ? {} : null) } })
    chk('tocar la casilla o el monto no da vuelta la casilla dos veces', S.__getVar('facturasParaPago')[1].checked === false && r.chk.checked === false)
    S.alTocarRenglonFactura({ target: r.texto })
    S.alTocarRenglonFactura({ target: r.texto })
    chk('tocar dos veces el renglón la destilda', S.__getVar('facturasParaPago')[1].checked === false && r.chk.checked === false && !r.tildada())
    r.chk.disabled = true
    S.alTocarRenglonFactura({ target: r.texto })
    chk('una casilla apagada no se tilda por el renglón', S.__getVar('facturasParaPago')[1].checked === false)
  }

  // ══ 2. SIN FACTURA ELEGIDA, SE PREGUNTA ══════════════════════════════════
  {
    const S = sandbox()
    await prepararPagoBadic(S)
    await S.confirmarPago()
    chk('sin ninguna factura elegida NO se manda', rpcs(S, 'pagar_proveedor_mixto').length === 0)
    chk('...y se pregunta (la caja visible)', S.estado.pagoPreguntaACuenta === true && el(S, 'confirmar-a-cuenta-pago').hidden === false)
    S.refrescarPago()
    chk('cualquier cambio esconde la pregunta', el(S, 'confirmar-a-cuenta-pago').hidden === true && S.estado.pagoACuentaConfirmado === false)
    await S.confirmarPago()
    chk('vuelve a preguntar después de un cambio', rpcs(S, 'pagar_proveedor_mixto').length === 0 && el(S, 'confirmar-a-cuenta-pago').hidden === false)
    S.elegirFacturaEnVezDeACuenta()
    chk('"Elegir una factura" esconde la pregunta sin mandar', el(S, 'confirmar-a-cuenta-pago').hidden === true && rpcs(S, 'pagar_proveedor_mixto').length === 0)
    await S.confirmarPago()
    await S.siDejarACuenta()
    const p = rpcs(S, 'pagar_proveedor_mixto')
    chk('"Sí, dejarlo a cuenta" manda el pago sin aplicaciones', p.length === 1 && JSON.stringify(p[0].params.p_aplicaciones) === '[]', JSON.stringify(p[0]?.params))
    chk('...y la pregunta se va', el(S, 'confirmar-a-cuenta-pago').hidden === true)
  }
  {
    // Sin facturas pendientes en la lista: el pago queda a cuenta sin preguntar
    // (la lista ya lo dice).
    const S = sandbox()
    const db = badic()
    db.facturas_pendientes = []
    conDatos(S, db)
    el(S, 'campo-fecha-pago-cc').value = HOY
    await S.actualizarSugerenciasPago()
    S.estado.pagoCheques = true
    await S.cargarCarteraParaPago('u-n')
    S.tildarChequeCartera(0, true)
    await S.confirmarPago()
    chk('sin facturas pendientes no se pregunta: se manda', rpcs(S, 'pagar_proveedor_mixto').length === 1 && S.estado.pagoPreguntaACuenta !== true)
  }
  {
    // Abrir el formulario de nuevo limpia la respuesta anterior.
    const S = sandbox()
    await prepararPagoBadic(S)
    S.estado.pagoACuentaConfirmado = true
    S.estado.pagoPreguntaACuenta = true
    await S.abrirModalPago()
    chk('abrir el formulario limpia la pregunta y la respuesta', S.estado.pagoACuentaConfirmado === false && S.estado.pagoPreguntaACuenta === false)
  }
  {
    // Un doble toque en "Sí, dejarlo a cuenta" manda una vez.
    const S = sandbox()
    await prepararPagoBadic(S)
    await S.confirmarPago()
    let soltar; S.__esperar(new Promise(r => { soltar = r }))
    const a = S.siDejarACuenta(); const b = S.siDejarACuenta()
    soltar(); await Promise.all([a, b])
    chk('doble toque en "Sí, dejarlo a cuenta": UNA llamada', rpcs(S, 'pagar_proveedor_mixto').length === 1)
  }

  // ══ 3. "A CUENTA $ X · APLICAR A FACTURAS" ════════════════════════════════
  {
    const S = sandbox()
    const m = S.aCuentaPorPago([
      { origen_gasto_id: 'g1', estado: 'disponible', monto_disponible: 100.1 },
      { origen_gasto_id: 'g1', estado: 'disponible', monto_disponible: 0.2 },
      { origen_gasto_id: 'g2', estado: 'agotado', monto_disponible: 5 },
      { origen_gasto_id: null, estado: 'disponible', monto_disponible: 7 },
      { origen_gasto_id: 'g3', estado: 'disponible', monto_disponible: 0 },
    ])
    chk('a cuenta por pago: suma en centavos los disponibles de cada pago', m.get('g1') === 100.3, String(m.get('g1')))
    chk('a cuenta por pago: ni agotados, ni sin pago de origen, ni en cero', !m.has('g2') && !m.has('g3') && m.size === 1)
    const h = S.htmlACuentaPago('g1', 839999.99, 'ARS', true)
    chk('el botón dice "A cuenta $ X · Aplicar a facturas" y lleva el pago', /<button type="button" class="btn-a-cuenta-pago" data-aplicar-pago="g1">A cuenta \$ 839\.999,99 · Aplicar a facturas<\/button>/.test(h), h)
    chk('sin permiso: solo "A cuenta $ X", sin botón', S.htmlACuentaPago('g1', 839999.99, 'ARS', false) === '<span class="a-cuenta-pago">A cuenta $ 839.999,99</span>')
    chk('sin nada a cuenta, nada', S.htmlACuentaPago('g1', 0, 'ARS', true) === '' && S.htmlACuentaPago('g1', 0.004, 'ARS', true) === '' && S.htmlACuentaPago(null, 5, 'ARS', true) === '')
    S.estado.fichaCreditos = [{ origen_gasto_id: 'g-cuenta', estado: 'disponible', monto_disponible: 4200000 }]
    chk('en el renglón del pago: con lo que dejó ese pago', /A cuenta \$ 4\.200\.000,00 · Aplicar a facturas/.test(S.htmlACuentaEnFila({ gasto_id: 'g-cuenta', moneda: 'ARS' })))
    chk('en el renglón de otro pago, nada', S.htmlACuentaEnFila({ gasto_id: 'g-otro', moneda: 'ARS' }) === '')
    S.estado.misTareas.delete('cuentas_corrientes:registrar_pago')
    chk('en el renglón, sin registrar_pago: solo lo que hay a cuenta', S.htmlACuentaEnFila({ gasto_id: 'g-cuenta', moneda: 'ARS' }) === '<span class="a-cuenta-pago">A cuenta $ 4.200.000,00</span>')
    S.estado.miRolApp = 'super_admin'
    chk('super_admin: el botón (bypass)', /data-aplicar-pago="g-cuenta"/.test(S.htmlACuentaEnFila({ gasto_id: 'g-cuenta', moneda: 'ARS' })))
  }
  {
    // Abrir: propone de la más vieja a la más nueva hasta lo que hay a cuenta.
    const S = sandbox()
    const dbA = badicACuenta()
    // Datos raros a propósito: una "parcial" sin saldo (no se ofrece) y un
    // crédito que no está disponible (no cuenta para lo que hay a cuenta).
    dbA.facturas_pendientes.push({ id: 'fp-cero', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', estado: 'parcial', numero_comprobante: '0009-4', fecha_factura: '2026-10-02', importe: 10, saldo_pendiente: 0 })
    dbA.creditos_proveedor.push({ id: 'cr-raro', proveedor_id: 'pv-badic', unidad_negocio_id: 'u-n', moneda: 'ARS', origen_gasto_id: 'g-cuenta', monto_original: 5, monto_disponible: 5, estado: 'agotado' })
    conDatos(S, dbA)
    await S.abrirAplicarPago('g-cuenta')
    const ap = S.__getVar('aplicarPago')
    chk('aplicar: el modal se abre', el(S, 'modal-aplicar-pago').hidden === false)
    chk('aplicar: lo que hay a cuenta son solo los créditos disponibles del pago', ap.aCuenta === 4200000, String(ap.aCuenta))
    chk('aplicar: solo las facturas pendientes de esa empresa y esa moneda, la más vieja arriba',
      JSON.stringify(ap.facturas.map(f => f.id)) === '["fp-nd","fp-si","fp-4"]', JSON.stringify(ap.facturas.map(f => f.id)))
    chk('aplicar: lee las facturas por proveedor, empresa y moneda del pago', S.__consultas.some(q => q.t === 'facturas_pendientes' &&
      JSON.stringify(q.eq) === JSON.stringify([['proveedor_id', 'pv-badic'], ['unidad_negocio_id', 'u-n'], ['moneda', 'ARS']])), JSON.stringify(S.__consultas.filter(q => q.t === 'facturas_pendientes')))
    chk('aplicar: propone la más vieja entera y la siguiente por lo que alcanza',
      ap.facturas[0].checked && ap.facturas[0].monto === 349550 && ap.facturas[1].checked && ap.facturas[1].monto === 3850450 && !ap.facturas[2].checked, JSON.stringify(ap.facturas))
    chk('aplicar: el resumen dice el pago y lo que tiene a cuenta', el(S, 'aplicar-pago-resumen').textContent === 'Pago del 30/10/2026 por $ 4.200.000,00 · A cuenta $ 4.200.000,00', el(S, 'aplicar-pago-resumen').textContent)
    chk('aplicar: los totales', /A cuenta <strong>\$ 4\.200\.000,00<\/strong> · Aplicás <strong>\$ 4\.200\.000,00<\/strong> · Queda a cuenta <strong>\$ 0,00<\/strong>/.test(el(S, 'aplicar-pago-totales').innerHTML), el(S, 'aplicar-pago-totales').innerHTML)
    chk('aplicar: la lista dibujada con su número y saldo', /Saldo inicial · 10\/10\/2026/.test(el(S, 'aplicar-pago-lista').innerHTML) && /data-aplicar-check="2"/.test(el(S, 'aplicar-pago-lista').innerHTML))
    // Editable: elige SOLO la factura que correspondía (la de BADIC).
    ap.facturas.forEach(f => { f.checked = false; f.monto = 0 })
    S.tildarFacturaAplicar(2, true, null)
    chk('tildar una factura propone hasta su saldo (lo que queda a cuenta alcanza)', ap.facturas[2].monto === 3360000.01, String(ap.facturas[2].monto))
    S.tildarFacturaAplicar(1, true, null)
    chk('tildar otra (más grande que lo que queda) propone solo lo que queda a cuenta', ap.facturas[1].monto === 839999.99 && S.totalesAplicarPago(ap.facturas, ap.aCuenta).cQueda === 0, String(ap.facturas[1].monto))
    S.tildarFacturaAplicar(1, false, null)
    ap.facturas[1].monto = 0
    await S.confirmarAplicarPago()
    const r = rpcs(S, 'aplicar_pago_a_facturas')
    chk('aplicar: UNA llamada con el pago y la factura elegida', r.length === 1 &&
      JSON.stringify(r[0].params) === JSON.stringify({ p_gasto_id: 'g-cuenta', p_aplicaciones: [{ factura_pendiente_id: 'fp-4', monto_aplicado: 3360000.01 }] }), JSON.stringify(r[0]?.params))
    chk('aplicar: lo que dijo la base', S.__exitos.includes('Aplicado $ 3.360.000,01 a facturas. Queda a cuenta $ 839.999,99.'), JSON.stringify(S.__exitos))
    chk('aplicar: el modal se cierra y la ficha se recarga', el(S, 'modal-aplicar-pago').hidden === true && S.__recargas.includes('movimientos'))
    // Lo que queda en la base (releída): la factura pagada, el crédito baja.
    const f4 = S.__db.facturas_pendientes.find(f => f.id === 'fp-4')
    chk('después: la factura queda PAGADA', f4.estado === 'pagada' && f4.saldo_pendiente === 0, JSON.stringify(f4))
    chk('después: la aplicación queda en ese pago', S.__db.aplicaciones_pago.some(a => a.gasto_id === 'g-cuenta' && a.factura_pendiente_id === 'fp-4' && a.monto_aplicado === 3360000.01))
    chk('después: la ficha relee el crédito y BAJA a $ 839.999,99', S.aCuentaPorPago(S.estado.fichaCreditos).get('g-cuenta') === 839999.99, JSON.stringify(S.estado.fichaCreditos))
    chk('después: el renglón del pago dice lo nuevo', /A cuenta \$ 839\.999,99 · Aplicar a facturas/.test(S.htmlACuentaEnFila({ gasto_id: 'g-cuenta', moneda: 'ARS' })))
    await S.abrirAplicarPago('g-cuenta')
    const ap2 = S.__getVar('aplicarPago')
    chk('después: abrirlo de nuevo ya no ofrece la factura pagada', !ap2.facturas.some(f => f.id === 'fp-4') && ap2.aCuenta === 839999.99, JSON.stringify(ap2.facturas.map(f => f.id)))
    // Todo lo que queda, a la más vieja.
    await S.confirmarAplicarPago()
    chk('aplicar todo lo que queda: el renglón del pago ya no dice "A cuenta"', S.htmlACuentaEnFila({ gasto_id: 'g-cuenta', moneda: 'ARS' }) === '' && S.__exitos.includes('Aplicado $ 839.999,99 a facturas. No queda nada a cuenta.'), JSON.stringify(S.__exitos))
  }
  {
    // Si el detalle de ese pago está abierto, se vuelve a leer.
    const S = sandbox()
    conDatos(S, badicACuenta())
    await S.cargarAccionesDetallePago('g-cuenta')
    el(S, 'modal-detalle-pago').hidden = false
    chk('detalle: "A cuenta $ X · Aplicar a facturas" en el detalle del pago', /data-aplicar-pago="g-cuenta">A cuenta \$ 4\.200\.000,00 · Aplicar a facturas/.test(el(S, 'detalle-pago-acciones').innerHTML), el(S, 'detalle-pago-acciones').innerHTML)
    S.alTocarAccionesPago({ target: { closest: (sel) => (sel === '[data-aplicar-pago]' ? { dataset: { aplicarPago: 'g-cuenta' } } : null) } })
    await new Promise(r => setTimeout(r, 0))
    chk('detalle: el botón abre "Aplicar a facturas" de ese pago', S.__getVar('aplicarPago')?.gastoId === 'g-cuenta' && el(S, 'modal-aplicar-pago').hidden === false)
    await new Promise(r => setTimeout(r, 0))
    await S.confirmarAplicarPago()
    chk('detalle: después de aplicar se vuelve a abrir el detalle de ese pago', S.__detallesAbiertos.includes('g-cuenta'))
  }
  {
    // Lo que frena antes de mandar, y el error de la base tal cual.
    const S = sandbox()
    conDatos(S, badicACuenta())
    await S.abrirAplicarPago('g-cuenta')
    const ap = S.__getVar('aplicarPago')
    ap.facturas.forEach(f => { f.checked = false; f.monto = 0 })
    await S.confirmarAplicarPago()
    chk('sin tildar: "Elegí al menos una factura." y no se manda', el(S, 'error-aplicar-pago').textContent === 'Elegí al menos una factura.' && el(S, 'error-aplicar-pago').hidden === false && rpcs(S, 'aplicar_pago_a_facturas').length === 0)
    ap.facturas[1].checked = true; ap.facturas[1].monto = 4200000.01
    await S.confirmarAplicarPago()
    chk('más de lo que hay a cuenta: lo dice y no se manda', el(S, 'error-aplicar-pago').textContent === 'Este pago tiene $ 4.200.000,00 a cuenta y querés aplicar $ 4.200.000,01.' && rpcs(S, 'aplicar_pago_a_facturas').length === 0, el(S, 'error-aplicar-pago').textContent)
    chk('el pie lo dice en bordó: "Te pasás por $ 0,01"', /Te pasás por <strong class="resumen-aplicacion__dif--falta">\$ 0,01<\/strong>/.test(el(S, 'aplicar-pago-totales').innerHTML), el(S, 'aplicar-pago-totales').innerHTML)
    ap.facturas[1].monto = 0
    await S.confirmarAplicarPago()
    chk('tildada sin monto: lo dice', el(S, 'error-aplicar-pago').textContent === 'Poné cuánto se aplica a la factura Saldo inicial (o destildala).', el(S, 'error-aplicar-pago').textContent)
    ap.facturas[1].checked = false
    ap.facturas[0].checked = true; ap.facturas[0].monto = 349550.01
    await S.confirmarAplicarPago()
    chk('más que el saldo de la factura: lo dice', el(S, 'error-aplicar-pago').textContent === 'Lo aplicado a la factura Nota de débito 013 supera su saldo pendiente.' && rpcs(S, 'aplicar_pago_a_facturas').length === 0)
    ap.facturas[0].monto = 100
    S.__rpcError.aplicar_pago_a_facturas = 'La factura Nota de débito 013 no está pendiente.'
    await S.confirmarAplicarPago()
    chk('el error de la base TAL CUAL, pegado al botón, y el modal sigue abierto', el(S, 'error-aplicar-pago').textContent === 'La factura Nota de débito 013 no está pendiente.' && el(S, 'modal-aplicar-pago').hidden === false && rpcs(S, 'aplicar_pago_a_facturas').length === 1)
    chk('con el error, el botón vuelve a andar', el(S, 'btn-confirmar-aplicar-pago').disabled === false && el(S, 'btn-confirmar-aplicar-pago').textContent === 'Aplicar')
    // Escribir un monto tilda y borra el error.
    const inp = { id: 'mx', value: '', dataset: { aplicarMonto: '2' }, closest: () => null }
    S.__montos.mx = 5
    S.alCambiarListaAplicarPago({ type: 'input', target: inp })
    chk('escribir un monto tilda la factura y borra el error', ap.facturas[2].checked === true && ap.facturas[2].monto === 5 && el(S, 'error-aplicar-pago').hidden === true)
    S.alCambiarListaAplicarPago({ type: 'change', target: { dataset: { aplicarCheck: '2' }, checked: false, closest: () => null } })
    chk('destildar con la casilla', ap.facturas[2].checked === false)
    S.proponerAplicarPagoViejas()
    chk('"Aplicar a las facturas más viejas" vuelve a proponer', S.__getVar('aplicarPago').facturas[0].checked && S.__getVar('aplicarPago').facturas[1].monto === 3850450)
  }
  {
    // Doble toque: una sola llamada. Sin permiso: no se abre.
    const S = sandbox()
    conDatos(S, badicACuenta())
    await S.abrirAplicarPago('g-cuenta')
    let soltar; S.__esperar(new Promise(r => { soltar = r }))
    const a = S.confirmarAplicarPago(); const b = S.confirmarAplicarPago()
    chk('mientras manda, el botón dice "Aplicando…" y se traba', el(S, 'btn-confirmar-aplicar-pago').textContent === 'Aplicando…' && el(S, 'btn-confirmar-aplicar-pago').disabled === true)
    soltar(); await Promise.all([a, b])
    chk('doble toque en "Aplicar": UNA llamada', rpcs(S, 'aplicar_pago_a_facturas').length === 1)
    const T = sandbox()
    conDatos(T, badicACuenta())
    T.estado.misTareas.delete('cuentas_corrientes:registrar_pago')
    await T.abrirAplicarPago('g-cuenta')
    chk('sin cuentas_corrientes:registrar_pago no se abre', T.__getVar('aplicarPago') === null && el(T, 'modal-aplicar-pago').hidden === true)
    // Un pago sin nada a cuenta, o anulado: lo dice y no deja aplicar.
    const U = sandbox()
    const db = badicACuenta(); db.creditos_proveedor = []
    conDatos(U, db)
    await U.abrirAplicarPago('g-cuenta')
    chk('sin nada a cuenta: lo dice y "Aplicar" queda apagado', /ya no tiene nada a cuenta/.test(el(U, 'aplicar-pago-lista').innerHTML) && el(U, 'btn-confirmar-aplicar-pago').disabled === true)
    const V = sandbox()
    const db2 = badicACuenta(); db2.gastos[0].estado = 'anulado'
    conDatos(V, db2)
    await V.abrirAplicarPago('g-cuenta')
    chk('un pago anulado: lo dice', /Ese pago está anulado/.test(el(V, 'aplicar-pago-lista').innerHTML))
    S.cerrarAplicarPago()
    chk('cerrar: el modal se esconde', el(S, 'modal-aplicar-pago').hidden === true && S.__getVar('aplicarPago') === null)
  }

  // ══ 4. ANULAR UN PAGO ════════════════════════════════════════════════════
  {
    const S = sandbox()
    conDatos(S, badic({ conPagoHecho: true }))
    await S.cargarAccionesDetallePago('g-badic')
    const a = S.__getVar('accionesPago')
    const lineas = S.lineasPreviaAnularPago(a)
    chk('vista previa: lo del pedido, tal cual (los cheques en el orden del pago y la factura)',
      lineas.slice(0, 2).join(' · ') === 'Vuelven a la cartera: N° 62921151 ($ 2.000.000,00), N° 62294736 ($ 2.200.000,00) · La factura 0004-00011115 vuelve a deber $ 3.360.000,01', lineas.join(' | '))
    chk('vista previa: lo que quedó a cuenta se anula', lineas.includes('Se anula lo que quedó a cuenta: $ 839.999,99'), lineas.join(' | '))
    chk('vista previa: se da vuelta la deuda con Dolce Pasta (solo el cheque de Dolce)', lineas.includes('Se da vuelta la deuda con Dolce Pasta por $ 2.200.000,00 (Entre empresas)'), lineas.join(' | '))
    chk('vista previa: la orden de pago queda anulada', lineas.includes('La orden de pago N-OP-00002 queda anulada (tachada y sin reimprimir)'), lineas.join(' | '))
    chk('vista previa: un pago con cheques no habla de cuentas de caja', !lineas.some(l => /a la cuenta de la que salieron/.test(l)))
    chk('vista previa: lee los cheques por pago_gasto_id Y por salida_gasto_id (como anular_gasto)',
      S.__consultas.some(q => q.t === 'cobranza_cheques' && JSON.stringify(q.eq) === '[["pago_gasto_id","g-badic"]]') &&
      S.__consultas.some(q => q.t === 'cobranza_cheques' && JSON.stringify(q.eq) === '[["salida_gasto_id","g-badic"]]'))
    let h = el(S, 'detalle-pago-acciones').innerHTML
    chk('el detalle de un pago con cheques tiene "Anular el pago" (el propio)', /<button type="button" class="btn-anular-pago" data-anular-pago>Anular el pago<\/button>/.test(h), h)
    chk('...y "A cuenta $ 839.999,99 · Aplicar a facturas"', /A cuenta \$ 839\.999,99 · Aplicar a facturas/.test(h))
    const toca = (sel) => S.alTocarAccionesPago({ target: { closest: (s) => (s === sel ? {} : null) } })
    toca('[data-anular-pago]')
    h = el(S, 'detalle-pago-acciones').innerHTML
    chk('"Anular el pago" abre el panel con la vista previa y el motivo', /class="panel-anular-pago"/.test(h) && /<li>Vuelven a la cartera: N° 62921151 \(\$ 2\.000\.000,00\), N° 62294736 \(\$ 2\.200\.000,00\)<\/li>/.test(h) &&
      /<li>La factura 0004-00011115 vuelve a deber \$ 3\.360\.000,01<\/li>/.test(h) && /<textarea id="motivo-anular-pago"/.test(h), h)
    chk('el foco va al motivo', S.__focos.includes('motivo-anular-pago'))
    toca('[data-confirmar-anular-pago]')
    await new Promise(r => setTimeout(r, 0))
    chk('motivo OBLIGATORIO: sin motivo lo dice y no llama a la base', rpcs(S, 'anular_gasto').length === 0 && /Poné el motivo de la anulación\./.test(el(S, 'detalle-pago-acciones').innerHTML))
    S.alEscribirAccionesPago({ target: { id: 'motivo-anular-pago', value: '   ' } })
    await S.confirmarAnularPago()
    chk('un motivo de espacios tampoco', rpcs(S, 'anular_gasto').length === 0)
    S.alEscribirAccionesPago({ target: { id: 'motivo-anular-pago', value: '  Faltó elegir la factura  ' } })
    el(S, 'modal-detalle-pago').hidden = false
    await S.confirmarAnularPago()
    const r = rpcs(S, 'anular_gasto')
    chk('anular: UNA llamada a anular_gasto con el pago y el motivo (sin espacios de más)', r.length === 1 && JSON.stringify(r[0].params) === JSON.stringify({ p_gasto_id: 'g-badic', p_motivo: 'Faltó elegir la factura' }), JSON.stringify(r[0]?.params))
    chk('anular: el aviso dice que los cheques volvieron a la cartera', S.__exitos.includes('Pago anulado: los cheques volvieron a la cartera y las facturas vuelven a deberse.'), JSON.stringify(S.__exitos))
    chk('anular: la ficha se recarga y el detalle se vuelve a leer', S.__recargas.includes('movimientos') && S.__detallesAbiertos.includes('g-badic'))
    h = el(S, 'detalle-pago-acciones').innerHTML
    chk('después: el detalle dice "Pago anulado" con el motivo y ofrece "Hacer el pago de nuevo"',
      /<strong>Pago anulado<\/strong> · Faltó elegir la factura/.test(h) && /data-pagar-de-nuevo>Hacer el pago de nuevo</.test(h) && !/data-anular-pago/.test(h), h)
    // Lo que queda en la base, releído por la pantalla.
    await S.cargarCarteraParaPago('u-n')
    chk('después: los dos cheques vuelven a estar EN CARTERA para pagar', JSON.stringify(S.__getVar('carteraPago').map(c => c.numero).sort()) === '["62294736","62921151"]', JSON.stringify(S.__getVar('carteraPago').map(c => c.numero)))
    await S.actualizarSugerenciasPago()
    const f4 = S.__getVar('facturasParaPago').find(f => f.id === 'fp-4')
    chk('después: la factura 0004-00011115 vuelve a estar PENDIENTE por $ 3.360.000,01', !!f4 && f4.saldo === 3360000.01 && S.__db.facturas_pendientes.find(f => f.id === 'fp-4').estado === 'pendiente', JSON.stringify(f4))
    chk('después: el crédito a cuenta quedó anulado (la ficha ya no lo ofrece)', S.aCuentaPorPago(S.estado.fichaCreditos).get('g-badic') === undefined && S.__db.creditos_proveedor[0].estado === 'anulado')
    chk('después: el detalle dice su orden de pago tachada con "ANULADA" (sin reimprimir)',
      /<div class="detalle-pago-orden"><s>Orden de pago N-OP-00002<\/s> <span class="orden-pago-cc__anulada">ANULADA<\/span><\/div>/.test(h) && !/data-reimprimir-orden/.test(h), h)
    // "Hacer el pago de nuevo": el formulario de pago a ese proveedor, en esa empresa.
    S.estado.ficha.unidadId = null
    S.alTocarAccionesPago({ target: { closest: (s) => (s === '[data-pagar-de-nuevo]' ? {} : null) } })
    await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0))
    chk('"Hacer el pago de nuevo": cierra el detalle, pone la ficha en la empresa del pago y abre el pago',
      S.__detallesCerrados() >= 1 && JSON.stringify(S.__unidadesFicha) === '["u-n"]' && el(S, 'modal-pago').hidden === false, JSON.stringify(S.__unidadesFicha))
  }
  {
    // El error de la base TAL CUAL; un doble toque manda una vez.
    const S = sandbox()
    const db = badic({ conPagoHecho: true })
    db.creditos_proveedor[0].monto_disponible = 100   // ya se usó en otra factura
    conDatos(S, db)
    await S.cargarAccionesDetallePago('g-badic')
    const a = S.__getVar('accionesPago')
    chk('aviso: el crédito ya se usó (la base no lo deja anular solo)', S.avisosAnularPago(a).includes('Parte de lo que este pago dejó a cuenta ya se aplicó a otra factura: la base no deja anularlo solo.'))
    a.anular = { motivo: 'x', error: null, enviando: false }
    let soltar; S.__esperar(new Promise(r => { soltar = r }))
    const p1 = S.confirmarAnularPago(); const p2 = S.confirmarAnularPago()
    chk('mientras anula: "Anulando…" y los botones trabados', /disabled>Anulando…<\/button>/.test(el(S, 'detalle-pago-acciones').innerHTML), el(S, 'detalle-pago-acciones').innerHTML)
    soltar(); await Promise.all([p1, p2])
    chk('doble toque en "Anular el pago": UNA llamada', rpcs(S, 'anular_gasto').length === 1)
    chk('el error de la base TAL CUAL en el panel', /Este pago generó un crédito que ya fue usado en otra factura — no se puede anular automáticamente\. Contactá a un super_admin para resolverlo a mano\./.test(el(S, 'detalle-pago-acciones').innerHTML) && S.__getVar('accionesPago').anular.enviando === false)
    chk('con el error no se anuló nada', S.__db.gastos[0].estado === 'registrado' && S.__db.cobranza_cheques.every(q => q.estado === 'endosado'))
    const toca = (sel) => S.alTocarAccionesPago({ target: { closest: (s) => (s === sel ? {} : null) } })
    toca('[data-cancelar-anular-pago]')
    chk('"Cancelar" cierra el panel', S.__getVar('accionesPago').anular === null && /data-anular-pago>Anular el pago/.test(el(S, 'detalle-pago-acciones').innerHTML))
  }
  {
    // Quién puede anular: lo mismo que anular_gasto.
    const S = sandbox()
    chk('anular: el pago propio sí', S.puedeAnularPago({ estado: 'registrado', empleado_id: 'emp-yanina' }) === true)
    chk('anular: el de otro, sin gastos:editar_anular, no', S.puedeAnularPago({ estado: 'registrado', empleado_id: 'emp-otro' }) === false)
    S.estado.misTareas.add('gastos:editar_anular')
    chk('anular: el de otro, con gastos:editar_anular, sí', S.puedeAnularPago({ estado: 'registrado', empleado_id: 'emp-otro' }) === true)
    S.estado.misTareas.delete('gastos:editar_anular'); S.estado.miRolApp = 'super_admin'
    chk('anular: super_admin sí (bypass de tiene_tarea)', S.puedeAnularPago({ estado: 'registrado', empleado_id: 'emp-otro' }) === true)
    chk('anular: uno ya anulado, no', S.puedeAnularPago({ estado: 'anulado', empleado_id: 'emp-yanina' }) === false)
    S.estado.miRolApp = 'usuario'; S.estado.miEmpleadoId = null
    chk('anular: sin saber quién soy, el "propio" no cuenta', S.puedeAnularPago({ estado: 'registrado', empleado_id: null }) === false)
    // Sin permiso, el detalle no ofrece anular.
    const T = sandbox()
    const db = badic({ conPagoHecho: true }); db.gastos[0].empleado_id = 'emp-otro'
    conDatos(T, db)
    await T.cargarAccionesDetallePago('g-badic')
    chk('el detalle del pago de otro, sin permiso: sin "Anular el pago"', !/data-anular-pago/.test(el(T, 'detalle-pago-acciones').innerHTML))
    // La factura que cargó el mismo pago (registrar_pago_directo_proveedor):
    // anular_gasto la anula en vez de devolverla.
    const V = sandbox()
    const dbV = badic({ conPagoHecho: true }); dbV.facturas_pendientes.find(f => f.id === 'fp-4').origen_gasto_id = 'g-badic'
    conDatos(V, dbV)
    await V.cargarAccionesDetallePago('g-badic')
    chk('la factura que cargó el mismo pago: "se anula" (leído de origen_gasto_id)', V.lineasPreviaAnularPago(V.__getVar('accionesPago')).includes('La factura 0004-00011115 se anula (la cargó este mismo pago)'))
    // Un pago que no se puede leer: el panel queda vacío.
    const U = sandbox()
    conDatos(U, badic())
    await U.cargarAccionesDetallePago('g-no-existe')
    chk('un pago que no se puede leer: sin acciones', el(U, 'detalle-pago-acciones').innerHTML === '')
  }
  {
    // Las otras vistas previas: pago mixto, efectivo, la factura que creó el
    // pago, el saldo inicial, sin poder ver los cheques ni las facturas.
    const S = sandbox()
    const base = { gasto: { id: 'g', medio_pago: 'efectivo', cuenta_id: 'cta', importe: 1500.5, moneda: 'ARS', unidad_negocio_id: 'u-n' }, cheques: [], aplicaciones: [], aCuenta: 0, otrosOrden: [], ordenTexto: null }
    chk('efectivo con cuenta: la plata vuelve a la cuenta', S.lineasPreviaAnularPago(base).includes('Vuelven $ 1.500,50 a la cuenta de la que salieron'))
    chk('efectivo sin cuenta: no promete nada', !S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, cuenta_id: null } }).some(l => /cuenta de la que/.test(l)))
    chk('QR: no promete devolver plata (la base no mueve caja con QR)', !S.lineasPreviaAnularPago({ ...base, gasto: { ...base.gasto, medio_pago: 'qr' } }).some(l => /cuenta de la que/.test(l)))
    chk('la factura que cargó el mismo pago se anula', S.lineasPreviaAnularPago({ ...base, aplicaciones: [{ numero: 'A-1', monto: 10, laCreoElPago: true }] }).includes('La factura A-1 se anula (la cargó este mismo pago)'))
    chk('el saldo inicial se nombra así', S.lineasPreviaAnularPago({ ...base, aplicaciones: [{ numero: 'SALDO-INICIAL', monto: 10, laCreoElPago: false }] }).includes('El saldo inicial vuelve a deber $ 10,00'))
    const ch = { ...base, gasto: { ...base.gasto, medio_pago: 'cheque', cuenta_id: null } }
    chk('cheques que no se pueden ver: lo dice', S.lineasPreviaAnularPago({ ...ch, cheques: null })[0] === 'Los cheques de este pago vuelven a la cartera (con tu usuario no se ve cuáles son)')
    chk('facturas que no se pueden ver: lo dice', S.lineasPreviaAnularPago({ ...base, aplicaciones: null }).includes('Las facturas que pagaba vuelven a deberse (con tu usuario no se ve cuáles son)'))
    const mixto = { ...ch, cheques: [{ numero: '1', importe: 5, unidadId: 'u-n' }], ordenTexto: 'N-OP-00007', otrosOrden: [{ id: 'g2', medio_pago: 'transferencia', importe: 300, moneda: 'ARS' }] }
    chk('pago mixto: avisa que el otro pago de la orden NO se anula', S.avisosAnularPago(mixto).includes('Este pago es parte de la orden de pago N-OP-00007 junto con otro pago (Transferencia $ 300,00) que NO se anula: si corresponde, anulalo aparte desde su detalle.'), JSON.stringify(S.avisosAnularPago(mixto)))
    chk('pago mixto: no dice que la orden queda anulada', !S.lineasPreviaAnularPago(mixto).some(l => /queda anulada/.test(l)))
    chk('cheque de la empresa que paga: no hay deuda entre empresas', !S.lineasPreviaAnularPago(mixto).some(l => /Entre empresas/.test(l)))
  }
  {
    // La orden de pago de un pago anulado.
    const S = sandbox()
    const m = S.anulacionDeOrdenes([
      { orden_pago_id: 'o1', estado: 'anulado' },
      { orden_pago_id: 'o2', estado: 'anulado' }, { orden_pago_id: 'o2', estado: 'registrado' },
      { orden_pago_id: 'o3', estado: 'registrado' }, { orden_pago_id: null, estado: 'anulado' },
    ])
    chk('orden: todos sus pagos anulados → anulada; algunos → en parte; ninguno → nada', m.get('o1') === 'anulada' && m.get('o2') === 'en_parte' && !m.has('o3') && m.size === 2)
    chk('orden anulada: tachada con "ANULADA"', S.htmlOrdenAnulada('N-OP-00001', 'anulada', 'fila-movimiento__orden') === '<div class="fila-movimiento__orden"><s>Orden de pago N-OP-00001</s> <span class="orden-pago-cc__anulada">ANULADA</span></div>')
    chk('orden anulada en parte: "ANULADA EN PARTE"', /<span class="orden-pago-cc__anulada">ANULADA EN PARTE<\/span>/.test(S.htmlOrdenAnulada('N-OP-00002', 'en_parte', 'x')))
    // En la lista única (cc-proveedor-una-lista): un pago mixto con su otro
    // pago anulado dice su orden "ANULADA EN PARTE" (el anulado ya no está).
    const T = sandbox()
    const dbT = badic({ conPagoHecho: true })
    dbT.gastos.push({ ...dbT.gastos[0], id: 'g-resto', medio_pago: 'transferencia', importe: 100, estado: 'anulado' })
    conDatos(T, dbT)
    const filas = [{ tipo: 'pago', gasto_id: 'g-badic' }]
    let mo = await T.cargarOrdenesDePagos(filas)
    chk('renglón: la orden del pago sabe que se anuló en parte', mo.get('g-badic')?.texto === 'N-OP-00002' && mo.get('g-badic')?.anulacion === 'en_parte', JSON.stringify([...mo]))
    chk('las órdenes leen los gastos por orden_pago_id (con el anulado, que no está en la lista)', T.__consultas.some(q => q.t === 'gastos' && q.sel === 'id, orden_pago_id, estado' && q.in.some(([c, v]) => c === 'orden_pago_id' && v.includes('op-2'))))
    T.__db.gastos[1].estado = 'registrado'
    mo = await T.cargarOrdenesDePagos(filas)
    chk('renglón: una orden sana no lleva anulación', mo.get('g-badic')?.anulacion === null)
    // Si el RLS de gastos no deja leer los de la orden, no se afirma nada.
    T.__db.gastos[1].estado = 'anulado'
    T.__fallaSel.gastos = /estado/
    mo = await T.cargarOrdenesDePagos(filas)
    chk('sin poder leer los gastos de la orden: queda como estaba (con su número, sin anular)', mo.get('g-badic')?.texto === 'N-OP-00002' && mo.get('g-badic')?.anulacion === null, JSON.stringify([...mo]))
    delete T.__fallaSel.gastos
    // La hoja: tachada, con el aviso y sin "Imprimir".
    const hoja = el(T, 'orden-pago-hoja'), btnImp = el(T, 'btn-imprimir-orden')
    hoja.innerHTML = '<div class="op-cab__titulo-texto">ORDEN DE PAGO</div>'
    await T.marcarHojaAnulada('op-2', 0)
    chk('hoja: el aviso arriba, la clase de anulada y sin "Imprimir"', /^<div class="op-anulada" role="alert">ANULADA EN PARTE: un pago de esta orden se anuló\. No se reimprime\.<\/div><div class="op-cab__titulo-texto">/.test(hoja.innerHTML) &&
      hoja.classList.contains('op-hoja--anulada') && btnImp.hidden === true, hoja.innerHTML)
    T.imprimirOrdenPago()
    chk('hoja anulada: "Imprimir" no imprime aunque se llame', T.__impresiones() === 0)
    T.__db.gastos[1].estado = 'registrado'
    hoja.innerHTML = '<p>sana</p>'
    await T.marcarHojaAnulada('op-2', 0)
    chk('hoja sana: sin aviso, con "Imprimir"', hoja.innerHTML === '<p>sana</p>' && !hoja.classList.contains('op-hoja--anulada') && btnImp.hidden === false)
    T.imprimirOrdenPago()
    chk('hoja sana: imprime', T.__impresiones() === 1)
    T.__db.gastos[1].estado = 'anulado'
    hoja.innerHTML = '<p>otra</p>'
    await T.marcarHojaAnulada('op-2', 5)
    chk('hoja: si mientras tanto se abrió otra orden, no la marca', hoja.innerHTML === '<p>otra</p>')
  }

  // ══ 5. TODO TEXTO SE ESCAPA ══════════════════════════════════════════════
  {
    const S = sandbox()
    S.estado.maestros.unidades[0].prefijo = marca('prefijo')
    const a = {
      gastoId: 'g', gasto: { id: marca('gasto'), estado: 'registrado', empleado_id: 'emp-yanina', medio_pago: 'cheque', moneda: 'ARS', unidad_negocio_id: 'u-n' },
      aCuenta: 5, creditoUsado: false,
      aplicaciones: [{ numero: marca('factura'), monto: 1, laCreoElPago: false }],
      cheques: [{ numero: marca('cheque'), importe: 1, unidadId: 'u-d', unidadNombre: marca('empresa') }],
      otrosOrden: [{ id: 'g2', medio_pago: marca('medio'), importe: 1, moneda: 'ARS' }], ordenTexto: marca('orden'),
      anular: { motivo: marca('motivo'), error: marca('error'), enviando: false },
    }
    const h = S.htmlAccionesDetallePago(a)
    chequearMarcas(chk, 'panel de anular', h, ['gasto', 'factura', 'cheque', 'empresa', 'medio', 'orden', 'motivo', 'error'])
    const anulado = S.htmlAccionesDetallePago({ ...a, gasto: { ...a.gasto, estado: 'anulado', motivo_anulacion: marca('motivoAnulado') } })
    chequearMarcas(chk, 'pago anulado', anulado, ['motivoAnulado'])
    chequearMarcas(chk, 'a cuenta', S.htmlACuentaPago(marca('gastoBoton'), 5, 'ARS', true), ['gastoBoton'])
    chequearMarcas(chk, 'facturas de aplicar', S.htmlFilasAplicarPago([{ numero: marca('numeroFactura'), fecha: '2026-10-01', saldo: 1, checked: true, monto: 1 }]), ['numeroFactura'])
    chequearMarcas(chk, 'orden anulada', S.htmlOrdenAnulada(marca('numeroOrden'), 'anulada', 'fila-movimiento__orden'), ['numeroOrden'])
  }

  // ══ 6. LO QUE SE MIRA EN EL TEXTO DEL MÓDULO ═════════════════════════════
  chk('el pie del pago tiene la pregunta con el texto del pedido', /<div class="pago-a-cuenta-pregunta" id="confirmar-a-cuenta-pago" role="alert" hidden>\s*<p id="texto-confirmar-a-cuenta">No elegiste ninguna factura: el pago va a quedar a cuenta\. ¿Seguro\?<\/p>/.test(FUENTE))
  chk('la pregunta tiene "Elegir una factura" y "Sí, dejarlo a cuenta"', /id="btn-elegir-factura-pago">Elegir una factura</.test(FUENTE) && /id="btn-si-a-cuenta-pago">Sí, dejarlo a cuenta</.test(FUENTE))
  chk('el renglón de la lista de facturas escucha el toque', /document\.getElementById\('lista-fifo'\)\.addEventListener\('click', alTocarRenglonFactura\)/.test(FUENTE))
  chk('los botones de la pregunta tienen su listener', /getElementById\('btn-si-a-cuenta-pago'\)\.addEventListener\('click', siDejarACuenta\)/.test(FUENTE) && /getElementById\('btn-elegir-factura-pago'\)\.addEventListener\('click', elegirFacturaEnVezDeACuenta\)/.test(FUENTE))
  chk('la casilla de una factura pasa por tildarFacturaPago', /tildarFacturaPago\(Number\(e\.target\.dataset\.index\), e\.target\.checked, e\.target\.closest\('\.fila-fifo'\)\)/.test(FUENTE))
  chk('el renglón de una factura tiene cursor de mano', /#lista-fifo \.fila-fifo, #aplicar-pago-lista \.fila-fifo \{ cursor: pointer; \}/.test(FUENTE))
  chk('el renglón del pago lleva "A cuenta" a la izquierda, bajo la fecha (en el celular no aprieta el texto)', /<div class="fila-movimiento__fecha">[^\n]*\n\s*\$\{errorPdfNd\}\n\s*\$\{esPago \? htmlACuentaEnFila\(m\) : ''\}\n\s*<\/div>/.test(FUENTE) &&
    (FUENTE.match(/\$\{[^}\n]*htmlACuentaEnFila\(m\)/g) || []).length === 1)
  chk('la ficha lee de qué pago salió cada crédito (origen_gasto_id)', /from\('creditos_proveedor'\)\s*\.select\('id, proveedor_id, unidad_negocio_id, moneda, monto_original, monto_disponible, estado, origen_gasto_id'\)/.test(FUENTE))
  chk('el renglón del pago abre "Aplicar a facturas" (delegado en la lista)', /getElementById\('lista-movimientos-ficha'\)\.addEventListener\('click', \(e\) => \{\s*const b = e\.target\.closest\?\.\('\[data-aplicar-pago\]'\)\s*if \(b\) abrirAplicarPago\(b\.dataset\.aplicarPago\)/.test(FUENTE))
  chk('abrir el detalle del pago carga sus acciones', /async function abrirModalDetallePago\(gastoId\) \{\s*cargarAccionesDetallePago\(gastoId\)/.test(FUENTE))
  chk('el detalle tiene su lugar para las acciones, aparte del contenido', /<div id="detalle-pago-contenido"><\/div>[\s\S]{0,400}<div id="detalle-pago-acciones" class="detalle-pago-acciones" aria-live="polite"><\/div>/.test(FUENTE))
  chk('las acciones del detalle escuchan toques y lo que se escribe', /accionesPagoCont\.addEventListener\('click', alTocarAccionesPago\)/.test(FUENTE) && /accionesPagoCont\.addEventListener\('input', alEscribirAccionesPago\)/.test(FUENTE))
  chk('el modal "Aplicar a facturas" es hijo de <body>, con sus botones', /<\/div><!-- \/modal-detalle-pago -->[\s\S]{0,600}<div class="modal-cc" id="modal-aplicar-pago" hidden>/.test(FUENTE) &&
    ['btn-cerrar-aplicar-pago', 'btn-cancelar-aplicar-pago', 'btn-confirmar-aplicar-pago', 'btn-aplicar-pago-viejas', 'aplicar-pago-lista', 'aplicar-pago-totales', 'error-aplicar-pago', 'aplicar-pago-resumen'].every(id => FUENTE.includes(`id="${id}"`)))
  chk('el modal de aplicar tiene sus listeners', ['proponerAplicarPagoViejas', 'confirmarAplicarPago'].every(f => FUENTE.includes(`addEventListener('click', ${f})`)) &&
    (FUENTE.match(/addEventListener\('click', cerrarAplicarPago\)/g) || []).length === 3 && /listaAplicarPago\.addEventListener\('click', alTocarListaAplicarPago\)/.test(FUENTE) &&
    /for \(const tipo of \['input', 'change'\]\) listaAplicarPago\.addEventListener\(tipo, alCambiarListaAplicarPago\)/.test(FUENTE))
  chk('cada monto de "Aplicar a facturas" se enlaza con su saldo como máximo', /enlazarCampoNumero\(inp, \{ decimales: 2, max: f\.saldo > 0 \? f\.saldo : undefined \}\)/.test(FUENTE))
  chk('aplicar_pago_a_facturas y anular_gasto: una llamada cada una en el módulo', (FUENTE.match(/supabase\.rpc\('aplicar_pago_a_facturas'/g) || []).length === 1 && (FUENTE.match(/supabase\.rpc\('anular_gasto'/g) || []).length === 1)
  chk('la orden de cada pago sabe si se anuló, leído de TODOS sus gastos', /const anulacion = await leerAnulacionOrdenes\(opIds\)/.test(FUENTE) && /anulacion: anulacion\.get\(o\.id\) \?\? null \}\)/.test(FUENTE))
  chk('el renglón: la orden anulada tachada y sin "Reimprimir"', /\$\{ordenPago && !ordenPago\.anulacion \? `<button type="button" class="btn-pago-ayuda" data-reimprimir-orden=/.test(FUENTE) &&
    /ordenPago\.anulacion \? htmlOrdenAnulada\(ordenPago\.texto, ordenPago\.anulacion, 'fila-movimiento__orden'\)/.test(FUENTE))
  chk('la hoja se marca anulada después de dibujarla', /hoja\.innerHTML = htmlOrdenPago\(res\.data, \{ saldo \}\)[\s\S]{0,200}marcarHojaAnulada\(ordenId, turno\)/.test(FUENTE))
  chk('no se inserta ni se borra nada a mano (todo por las funciones de la base)', !/from\('(aplicaciones_pago|creditos_proveedor|gastos|cobranza_cheques)'\)\s*\.(insert|update|delete|upsert)\(/.test(FUENTE))
  chk('nada de confirm() ni alert() nuevos para anular o aplicar', !/confirm\([^)]*(anul|aplic|cuenta)/i.test(FUENTE.slice(FUENTE.indexOf('APLICAR UN PAGO A FACTURAS Y ANULAR UN PAGO (30/10/2026) ═'))))

  // ── Nada de lo que había se perdió (baseline FIJO e6e0c74, nunca HEAD) ────
  {
    const BASE_COMMIT = 'e6e0c74'
    let antes = null
    if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
    else {
      try {
        antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cuentas-corrientes.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
      } catch { antes = null }
    }
    chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
    if (antes) {
      const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
      const ahora = marcas(FUENTE)
      // Retirados a propósito por ci-prueba/cc-proveedor-una-lista (el recuadro
      // "Órdenes de pago" y las dos copias de la orden), que esta rama trae unida.
      const RETIRADOS = new Set(['id="ficha-ordenes-pago"', 'id="nota-copias-orden"', 'data-copia'])
      const faltan = [...marcas(antes)].filter(m => !ahora.has(m) && !RETIRADOS.has(m))
      chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
      chk(`en ${BASE_COMMIT} el módulo no aplicaba un pago después ni anulaba pagos (lo que este cambio agrega)`, !/aplicar_pago_a_facturas|'anular_gasto'/.test(antes))
    }
  }
}

esperas.push(main())
fin()
