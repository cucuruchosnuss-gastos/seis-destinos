// CUENTAS CORRIENTES — LA CUENTA DEL PROVEEDOR EN UNA SOLA LISTA Y LA ORDEN DE
// PAGO EN UNA HOJA CON EL SALDO (30/10/2026, rama ci-prueba/cc-proveedor-una-lista).
//
// La base (v_cuenta_corriente_movimientos, leída con pg_get_viewdef el
// 30/10/2026) ahora trae TODOS los pagos (uno por gasto, con su importe
// entero, también los que no se aplicaron a ninguna factura) y los saldos a
// favor del corte inicial (credito_aplicado sin factura, "Saldo a favor
// (corte inicial)"), con el saldo_acumulado bien. En la ficha:
//  - una sola lista mezclada por fecha: lo que suma (facturas, ND) en tinta,
//    lo que resta (pagos, créditos) en verde, con el saldo corrido en CADA
//    renglón (también en cero);
//  - el filtro "Pagos" muestra también los pagos sin aplicar;
//  - se fue el recuadro "Órdenes de pago (N)": la orden va en el renglón de
//    su pago (gastos.orden_pago_id → ordenes_pago.numero) con "Reimprimir";
//  - el saldo a favor del corte inicial dice "Saldo a favor".
// La orden de pago: UNA sola hoja (sin ORIGINAL/DUPLICADO) y abajo de todo
// UNA línea con el saldo de la cuenta (deuda_pendiente − credito_disponible
// de v_saldo_proveedor, en esa empresa y en pesos).
// Se EJECUTA el código real con un document y una base falsos.
//
//   node pruebas/test-cuentas-corrientes-proveedor-una-lista.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  var CSS = { escape: (s) => String(s) }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: true, disabled: false, dataset: {}, style: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, focus(){}, removeAttribute(k){ if (k === 'hidden') el.hidden = false } }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null, body: nuevoEl('body'), documentElement: nuevoEl('html'),
  }
  var location = { href: 'https://x.test/modulos/cuentas-corrientes.html', pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var history = { pushState() {}, replaceState() {} }
  var window = { print() {}, addEventListener() {}, removeEventListener() {} }
  var __datos = {}, __consultas = [], __falla = {}, __rpc = [], __respuestas = {}
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, eq: [], in: [] }
    __consultas.push(registro)
    let uno = false
    const q = {
      select: (c) => { registro.select = c; return q }, order: () => q, limit: () => q, gte: () => q, lte: () => q,
      maybeSingle() { uno = true; return q },
      eq(c, v) { registro.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
      in(c, vs) { registro.in.push([c, vs]); filtros.push(r => vs.includes(r[c])); return q },
      then(res, rej) {
        if (__falla[tabla]) return Promise.resolve({ data: null, error: { message: 'falla ' + tabla } }).then(res, rej)
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc: async (nombre, params) => { __rpc.push({ nombre, params }); return __respuestas[nombre] ?? { data: null, error: null } },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function eliminarFactura() { return false }
  function abrirModalPago() {} function abrirModalAplicarCreditoDesdeFicha() {} function abrirModalSaldoInicial() {} function abrirModalNotaCredito() {}
  function abrirModalDetallePago() {} function abrirAnularNd() {} function verPdfNd() {}
  async function cargarFichaSaldos() {} async function cargarFichaCreditos() {} function cargarSaldos() {}
  var turnoOrdenPago = 0
  var estado = {
    sesion: { user: { id: 'uid-1' } },
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago']),
    unidadElegida: null,
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' }], proveedores: [{ id: 'p1', razon_social: 'DIMAFLO S.A.' }] },
    fabrica: FABRICA_SIN_DATOS,
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [],
  }
`

const FUNCIONES = [
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'esc', 'importeHtml', 'formatearImporte', 'badgeEstadoFactura', 'tieneTarea', 'nombreUnidad',
  'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte', 'esSinImporte', 'htmlFilaSinImporte', 'decimalesImporteSin', 'enlazarCampoImporteSin',
  'cargarCantidadesSinImporte', 'productoUnicoConCantidad', 'textoCantidadInsumo', 'totalImporteFormulario', 'resumenCantidades',
  'cargarFichaMovimientos', 'renderizarFichaMovimientos',
  'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento', 'describirParaResumen',
  'esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'etiquetaTipoMovimiento', 'cargarObservacionesSaldoInicial',
  'htmlFilaComision', 'cargarCodigosComision', 'fechaISO', 'cargarNotasDebitoFicha', 'cargarOrdenesDePagos', 'numeroTextoOrden',
  'logoSeguroCC', 'cuitConGuiones', 'fechaOrden', 'letrasMenorDeMil', 'letrasMenorDeMillon', 'enteroEnLetras', 'importeEnLetras',
  'lineaSaldoOrdenPago', 'leerSaldoOrdenPago', 'htmlOrdenPago', 'abrirOrdenPago',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'MEDIOS_PAGO_LABEL', 'TANDA_GASTOS_PAGO', 'NUMERO_SALDO_INICIAL',
  'LETRAS_UNIDAD', 'LETRAS_DECENA', 'LETRAS_CENTENA', 'NOMBRE_MEDIO_ORDEN']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __consultas, __rpc, __datos, __fallar(t){ __falla[t] = true }, __responder(n, r){ __respuestas[n] = r }`,
  })
}
function abrirFicha(S, unidadId = 'u-n', tipo = 'todos') {
  S.estado.ficha = { proveedorId: 'p1', unidadId, nombre: 'DIMAFLO S.A.', unidades: [], movimientosRaw: [], estadoPorFactura: {},
    filtros: { rangoRapido: null, fechaDesde: '', fechaHasta: '', tipo, orden: 'fecha_desc' } }
}
// La cuenta como la devuelve la vista nueva (más nueva arriba): una factura,
// una nota de débito, el pago aplicado (con orden de pago), un pago SIN
// aplicar (sin orden) y el saldo a favor del corte inicial.
function conCuenta(S) {
  const fila = (o) => ({ proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', factura_pendiente_id: null, gasto_id: null, credito_id: null, ...o })
  S.__datos.v_cuenta_corriente_movimientos = [
    fila({ fecha: '2026-10-25', tipo: 'pago', monto: -50000, gasto_id: 'g-suelto', referencia: 'Pago a proveedor', saldo_acumulado: 0, orden_desempate: '2026-10-25T10:00:00Z' }),
    fila({ fecha: '2026-10-20', tipo: 'pago', monto: -100000, gasto_id: 'g-op', referencia: 'Pago a proveedor', saldo_acumulado: 50000, orden_desempate: '2026-10-20T10:00:00Z' }),
    fila({ fecha: '2026-10-10', tipo: 'factura', monto: 30000, factura_pendiente_id: 'fp-nd', referencia: 'Nota de débito 0001-4567', saldo_acumulado: 150000, orden_desempate: '2026-10-10T10:00:00Z' }),
    fila({ fecha: '2026-09-05', tipo: 'factura', monto: 140000, factura_pendiente_id: 'fp-1', referencia: '0003-00001245', saldo_acumulado: 120000, orden_desempate: '2026-09-05T10:00:00Z' }),
    fila({ fecha: '2026-09-01', tipo: 'credito_aplicado', monto: -20000, credito_id: 'cr-corte', referencia: 'Saldo a favor (corte inicial)', saldo_acumulado: -20000, orden_desempate: '2026-09-01T10:00:00Z' }),
  ]
  S.__datos.facturas_pendientes = [
    { id: 'fp-1', estado: 'pagada', saldo_pendiente: 0, modulo_origen: 'gastos', observaciones: null },
    { id: 'fp-nd', estado: 'parcial', saldo_pendiente: 10000, modulo_origen: 'nota_debito', observaciones: null },
  ]
  S.__datos.notas_debito = [{ id: 'nd-1', factura_pendiente_id: 'fp-nd', comprobante: '0001-4567', estado: 'vigente', archivo_url: null }]
  S.__datos.gastos = [
    { id: 'g-op', medio_pago: 'transferencia', descripcion: 'Pago a proveedor', orden_pago_id: 'op-7' },
    { id: 'g-suelto', medio_pago: 'efectivo', descripcion: 'Pago a proveedor', orden_pago_id: null },
  ]
  S.__datos.ordenes_pago = [{ id: 'op-7', numero: 7, unidad_negocio_id: 'u-n', proveedor_id: 'p1' }]
}
const lista = (S) => S.__els.get('lista-movimientos-ficha').innerHTML
const filas = (S) => lista(S).split('tarjeta-lista fila-movimiento').slice(1)
const filaDe = (S, gastoOTexto) => filas(S).find(f => f.includes(gastoOTexto)) ?? ''
const texto = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

const ORDEN = {
  numero_texto: 'N-OP-00007', fecha: '2026-10-20', total: 100000, creada_por: 'Facu',
  emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843' },
  proveedor: { razon_social: 'DIMAFLO S.A.', cuit: '30712345678' },
  facturas: [{ tipo: 'Factura A', numero: '0003-00001245', fecha: '2026-09-05', importe: 140000, aplicado: 100000, saldo_actual: 40000 }],
  cheques: [], otros_medios: [{ medio: 'transferencia', importe: 100000 }], a_favor: 0,
}

esperas.push((async () => {
  // ── Una sola lista, mezclada por fecha ───────────────────────────────────
  {
    const S = sandbox()
    abrirFicha(S)
    conCuenta(S)
    await S.cargarFichaMovimientos()
    const fs_ = filas(S)
    chk('los cinco movimientos en una sola lista, el más nuevo arriba', fs_.length === 5 && fs_[0].includes('g-suelto') && fs_[1].includes('g-op') && fs_[4].includes('Saldo a favor (corte inicial)'), String(fs_.length))
    const suelto = filaDe(S, 'g-suelto')
    chk('el pago SIN aplicar aparece y resta (−$ 50.000,00, en verde)', /fila-movimiento__monto fila-movimiento__monto--reduce">−\$ 50\.000,00</.test(suelto), suelto)
    chk('… con su 📋 para ver el detalle', /data-gasto-id="g-suelto"/.test(suelto))
    chk('… y sin orden de pago (no tiene)', !/Orden de pago|data-reimprimir-orden/.test(suelto))
    const nd = filaDe(S, 'Nota de débito 0001-4567')
    chk('la nota de débito suma (+, en tinta) y la factura también', /fila-movimiento__monto--deuda">\+\$ 30\.000,00</.test(nd) && /fila-movimiento__monto--deuda">\+\$ 140\.000,00</.test(filaDe(S, '0003-00001245')))
    chk('el saldo corrido en cada renglón, también cuando da cero', /fila-movimiento__saldo">Saldo \$ 0,00</.test(suelto) && /fila-movimiento__saldo">Saldo debe \$ 50\.000,00</.test(filaDe(S, 'g-op')) && /Saldo a favor \$ 20\.000,00/.test(filaDe(S, 'corte inicial')))
    chk('todos los renglones llevan su saldo', fs_.every(f => /fila-movimiento__saldo">/.test(f)))
    const corte = filaDe(S, 'corte inicial')
    chk('el saldo a favor del corte inicial dice "Saldo a favor" y resta', /fila-movimiento__tipo">Saldo a favor</.test(corte) && /fila-movimiento__monto--reduce">−\$ 20\.000,00</.test(corte), texto(corte))
    // La orden de pago en el renglón de su pago.
    const conOp = filaDe(S, 'g-op')
    chk('el pago con orden dice "Orden de pago N-OP-00007"', /<div class="fila-movimiento__orden">Orden de pago N-OP-00007<\/div>/.test(conOp), conOp)
    chk('… y lleva "Reimprimir" con el id de la orden', /<button type="button" class="btn-pago-ayuda" data-reimprimir-orden="op-7">Reimprimir<\/button>/.test(conOp))
    chk('las órdenes se leen por los gastos de los pagos (orden_pago_id)', S.__consultas.some(q => q.tabla === 'gastos' && /orden_pago_id/.test(q.select ?? '') && q.in.some(([c, v]) => c === 'id' && v.includes('g-op') && v.includes('g-suelto'))))
    chk('y la orden por su id (sin leer todas las del proveedor)', S.__consultas.some(q => q.tabla === 'ordenes_pago' && q.in.some(([c, v]) => c === 'id' && v.length === 1 && v[0] === 'op-7')))
  }
  // El filtro "Pagos": también los sin aplicar; "Facturas": no.
  {
    const S = sandbox()
    abrirFicha(S, 'u-n', 'pago')
    conCuenta(S)
    await S.cargarFichaMovimientos()
    chk('filtro "Pagos": los dos pagos (el aplicado y el sin aplicar) y el saldo a favor', filas(S).length === 3 && !!filaDe(S, 'g-suelto') && !!filaDe(S, 'g-op') && !!filaDe(S, 'corte inicial') && !filaDe(S, '0003-00001245'), String(filas(S).length))
    S.estado.ficha.filtros.tipo = 'factura'
    S.renderizarFichaMovimientos()
    chk('filtro "Facturas": la factura y la nota de débito, sin pagos', filas(S).length === 2 && !filaDe(S, 'g-suelto'))
  }
  // En "todas las unidades" el corrido no se muestra (cada unidad tiene el suyo).
  {
    const S = sandbox()
    abrirFicha(S, null)
    conCuenta(S)
    await S.cargarFichaMovimientos()
    chk('en todas las unidades no se mezcla el saldo corrido de cada empresa', !/fila-movimiento__saldo/.test(lista(S)) && filas(S).length === 5)
  }
  // Sin permiso para leer las órdenes: los pagos quedan como vienen.
  {
    const S = sandbox()
    S.estado.misTareas = new Set(['cuentas_corrientes:anular_factura'])
    abrirFicha(S)
    conCuenta(S)
    await S.cargarFichaMovimientos()
    chk('sin registrar_pago ni ver_todo: sin "Orden de pago" ni "Reimprimir", y no se consultan', !/Orden de pago|data-reimprimir-orden/.test(lista(S)) && !S.__consultas.some(q => q.tabla === 'ordenes_pago'))
  }
  {
    const S = sandbox()
    abrirFicha(S)
    conCuenta(S)
    S.__fallar('ordenes_pago')
    await S.cargarFichaMovimientos()
    chk('si la orden no se puede leer, el pago queda como viene (sin inventar nada)', !/Orden de pago|data-reimprimir-orden/.test(lista(S)) && !!filaDe(S, 'g-op'))
  }
  // Escape: el número de la orden y su id.
  {
    const S = sandbox()
    abrirFicha(S)
    conCuenta(S)
    S.__datos.ordenes_pago = [{ id: marca('op-id'), numero: 7, unidad_negocio_id: 'u-x', proveedor_id: 'p1' }]
    S.__datos.gastos[0].orden_pago_id = marca('op-id')
    S.estado.maestros.unidades.push({ id: 'u-x', nombre: 'X', prefijo: marca('prefijo') })
    await S.cargarFichaMovimientos()
    chequearMarcas(chk, 'la orden en el renglón del pago', filaDe(S, 'g-op'), ['op-id', 'prefijo'])
  }

  // ── El resumen descargable nombra el saldo a favor del corte ─────────────
  {
    const S = sandbox()
    const r = S.describirParaResumen({ tipo: 'credito_aplicado', factura_pendiente_id: null, gasto_id: null, credito_id: 'cr-corte', referencia: 'Saldo a favor (corte inicial)' }, new Map(), new Map())
    chk('resumen: "Saldo a favor · Saldo a favor (corte inicial)" (no "Crédito aplicado · A …")', r.comprobante === 'Saldo a favor' && r.detalle === 'Saldo a favor (corte inicial)', JSON.stringify(r))
    const r2 = S.describirParaResumen({ tipo: 'credito_aplicado', factura_pendiente_id: 'f', credito_id: 'cr-1', referencia: '0003-1' }, new Map(), new Map())
    chk('resumen: un crédito aplicado a una factura sigue igual', r2.comprobante === 'Crédito aplicado' && r2.detalle === 'A 0003-1')
    chk('un crédito aplicado a una factura sigue diciendo "Crédito aplicado"', S.etiquetaTipoMovimiento({ tipo: 'credito_aplicado', factura_pendiente_id: 'f', credito_id: 'cr-1' }) === 'Crédito aplicado')
    chk('uno sin factura ni crédito (no es del corte) tampoco cambia', S.etiquetaTipoMovimiento({ tipo: 'credito_aplicado' }) === 'Crédito aplicado')
  }

  // ── La orden de pago: UNA hoja y la línea del saldo ───────────────────────
  {
    const S = sandbox()
    const h = S.htmlOrdenPago(ORDEN, { saldo: { deuda: 40000, credito: 15000.5 } })
    chk('una sola hoja: una cabecera, sin ORIGINAL ni DUPLICADO', (h.match(/class="op-cab"/g) || []).length === 1 && !/ORIGINAL|DUPLICADO|op-copia|data-copia/.test(h))
    chk('a pagar: "Saldo de la cuenta con DIMAFLO S.A. (a pagar) $ 24.999,50" (deuda − crédito)', /<div class="op-saldo-cuenta"><span>Saldo de la cuenta con DIMAFLO S\.A\. \(a pagar\)<\/span><span class="op-saldo-cuenta__numero">\$ 24\.999,50<\/span><\/div>/.test(h), texto(h).slice(-200))
    chk('la línea del saldo va abajo de todo (después de las firmas, antes del pie)', h.indexOf('op-saldo-cuenta') > h.indexOf('op-firmas') && h.indexOf('op-saldo-cuenta') < h.indexOf('op-pie'))
    chk('UNA sola línea, sin "aplicado / no aplicado" ni "Resumen de cuenta"', (h.match(/op-saldo-cuenta"/g) || []).length === 1 && !/no aplicado|Resumen de cuenta/i.test(texto(h)))
    const f = S.htmlOrdenPago(ORDEN, { saldo: { deuda: 10000, credito: 35000 } })
    chk('a favor: "Saldo de la cuenta a favor de PAZ MIRTA $ 25.000,00"', /<span>Saldo de la cuenta a favor de PAZ MIRTA<\/span><span class="op-saldo-cuenta__numero">\$ 25\.000,00<\/span>/.test(f), texto(f).slice(-120))
    const c0 = S.htmlOrdenPago(ORDEN, { saldo: { deuda: 0.1, credito: 0.1 } })
    chk('en cero: "Saldo de la cuenta con DIMAFLO S.A. $ 0,00" (sin "a pagar")', /<span>Saldo de la cuenta con DIMAFLO S\.A\.<\/span><span class="op-saldo-cuenta__numero">\$ 0,00<\/span>/.test(c0))
    chk('sin saldo leído: la línea no va (nunca un $ 0,00 inventado)', !/op-saldo-cuenta/.test(S.htmlOrdenPago(ORDEN)))
    chk('sin la razón social de la empresa, el nombre de la empresa', S.lineaSaldoOrdenPago({ deuda: 0, credito: 5 }, { proveedor: 'X', empresa: '' }).texto === 'Saldo de la cuenta a favor de la empresa' &&
      /a favor de Cucuruchos Nuss/.test(S.htmlOrdenPago({ ...ORDEN, emisor: { empresa: 'Cucuruchos Nuss' } }, { saldo: { deuda: 0, credito: 5 } })))
    chequearMarcas(chk, 'la línea del saldo', S.htmlOrdenPago({ ...ORDEN, proveedor: { razon_social: marca('prov') } }, { saldo: { deuda: 5, credito: 0 } }), ['prov'])
  }
  // leerSaldoOrdenPago: el proveedor y la empresa de la orden, en pesos.
  {
    const S = sandbox()
    S.__datos.ordenes_pago = [{ id: 'op-7', proveedor_id: 'p1', unidad_negocio_id: 'u-n' }]
    S.__datos.v_saldo_proveedor = [
      { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 40000, credito_disponible: 15000.5 },
      { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'USD', deuda_pendiente: 999, credito_disponible: 0 },
      { proveedor_id: 'p1', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: 777, credito_disponible: 0 },
    ]
    const s = await S.leerSaldoOrdenPago('op-7')
    chk('lee el saldo de ESA empresa y en pesos', s && s.deuda === 40000 && s.credito === 15000.5, JSON.stringify(s))
    const q = S.__consultas.find(c => c.tabla === 'v_saldo_proveedor')
    chk('… filtrando proveedor, empresa y moneda ARS', JSON.stringify(q?.eq) === JSON.stringify([['proveedor_id', 'p1'], ['unidad_negocio_id', 'u-n'], ['moneda', 'ARS']]), JSON.stringify(q?.eq))
    chk('una orden que no está: null', (await S.leerSaldoOrdenPago('no-existe')) === null)
    const T = sandbox()
    T.__datos.ordenes_pago = S.__datos.ordenes_pago
    T.__fallar('v_saldo_proveedor')
    chk('si el saldo no se puede leer: null', (await T.leerSaldoOrdenPago('op-7')) === null)
    // Abrir la orden: la hoja con la línea.
    S.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await S.abrirOrdenPago('op-7')
    const hoja = S.__els.get('orden-pago-hoja').innerHTML
    chk('al abrir (o reimprimir) la orden, la hoja trae la línea del saldo de hoy', /Saldo de la cuenta con DIMAFLO S\.A\. \(a pagar\)[\s\S]*\$ 24\.999,50/.test(hoja) && (hoja.match(/class="op-cab"/g) || []).length === 1)
    T.__responder('datos_orden_pago', { data: ORDEN, error: null })
    await T.abrirOrdenPago('op-7')
    chk('sin saldo, la orden se abre igual, sin la línea', /ORDEN DE PAGO/.test(T.__els.get('orden-pago-hoja').innerHTML) && !/op-saldo-cuenta/.test(T.__els.get('orden-pago-hoja').innerHTML))
  }
})())

// ── Lo que se fue y el enlace ──────────────────────────────────────────────
chk('se fue el recuadro "Órdenes de pago (N)" de la ficha', !/id="ficha-ordenes-pago"|cargarFichaOrdenesPago|htmlOrdenesPagoFicha|renderizarFichaOrdenesPago|titulo-seccion-cc">Órdenes de pago/.test(FUENTE))
chk('"Reimprimir" del renglón abre la orden', /listaEl\.querySelectorAll\('\[data-reimprimir-orden\]'\)\.forEach\(btn => \{\s*btn\.addEventListener\('click', \(\) => abrirOrdenPago\(btn\.dataset\.reimprimirOrden\)\)/.test(FUENTE))
chk('la ficha lee la orden de cada pago con los movimientos', /cargarOrdenesDePagos\(data \?\? \[\]\),/.test(FUENTE))
chk('la orden de pago ya no tiene copias ni el aviso de dos hojas', !/COPIAS_ORDEN_PAGO|op-copia|nota-copias-orden|Se imprimen dos hojas/.test(FUENTE))

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
    // Retirados a propósito: el recuadro de la ficha y las copias de la orden.
    const RETIRADOS = new Set(['id="ficha-ordenes-pago"', 'id="nota-copias-orden"', 'data-copia'])
    for (const r of RETIRADOS) chk(`en ${BASE_COMMIT} estaba ${r} (el retiro es real)`, marcas(antes).has(r))
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m) && !RETIRADOS.has(m))
    chk(`ningún otro id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
    chk(`en ${BASE_COMMIT} la orden de pago salía en dos copias (lo que este cambio saca)`, /COPIAS_ORDEN_PAGO = \['ORIGINAL', 'DUPLICADO'\]/.test(antes))
  }
}

fin()
