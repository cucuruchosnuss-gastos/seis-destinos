// Cheques: LOS EMITIDOS Y EL PAGO CON CHEQUES DE LA CARTERA (05/10/2026).
//
// Tarea A de la rama ci-prueba/cc-proveedores-clientes-cheques:
//  - En la cartera, un cheque usado en un pago desde Cuentas corrientes
//    (pagar_proveedor_con_cheques_cartera: estado 'endosado' y pago_gasto_id)
//    dice a qué proveedor fue, tiene "Ver el pago" y NO ofrece volver a
//    cartera (igual que un endoso a proveedor).
//  - Pestaña "Emitidos": los cheques y e-cheques PROPIOS (cheques_emitidos),
//    pendientes y debitados, filtrables por cuenta y fecha de pago, con lo
//    pendiente por cuenta. Un cheque propio NO se debita antes de su fecha de
//    pago: la pantalla dice cuándo se debita y lo pendiente se suma aparte.
//
//   node pruebas/test-cheques-emitidos.js
'use strict'

const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(tareas = ['cobranzas:ver_todo', 'cobranzas:procesar']) {
  const S = construirCheques(ARCHIVO)
  S.estado.misTareas = new Set(tareas)
  S.estado.vista = 'cartera'
  S.estado.emitidos = []
  S.estado.cuentasEmitidos = new Map()
  S.estado.filtrosEmitidos = { estado: 'pendiente', cuenta: '', desde: '', hasta: '' }
  return S
}
const el = (S, id) => S.__els.get(id) ?? { innerHTML: '', hidden: undefined, textContent: '' }

const EMITIDOS = [
  { id: 'e1', unidad_negocio_id: 'u-n', cuenta_id: 'macro', tipo: 'cheque', numero: '00012', fecha_emision: '2026-10-01', fecha_pago: '2026-11-15', importe: 100.1, estado: 'pendiente', beneficiario: 'DIMAFLO', gasto_id: 'g1' },
  { id: 'e2', unidad_negocio_id: 'u-n', cuenta_id: 'macro', tipo: 'echeque', numero: '9', fecha_emision: '2026-10-01', fecha_pago: '2026-10-20', importe: 0.2, estado: 'pendiente', beneficiario: 'ANATOLIA', gasto_id: 'g2' },
  { id: 'e3', unidad_negocio_id: 'u-n', cuenta_id: 'nacion', tipo: 'cheque', numero: '5', fecha_emision: '2026-09-01', fecha_pago: '2026-09-20', importe: 50, estado: 'debitado', debitado_en: '2026-09-20T09:00:00Z', beneficiario: 'X', gasto_id: null },
  { id: 'e4', unidad_negocio_id: 'u-dolce', cuenta_id: 'dolce', tipo: 'cheque', numero: '7', fecha_emision: '2026-10-01', fecha_pago: '2026-10-25', importe: 999, estado: 'pendiente', beneficiario: 'Y', gasto_id: 'g4' },
  { id: 'e5', unidad_negocio_id: 'u-n', cuenta_id: 'macro', tipo: 'cheque', numero: '8', fecha_emision: '2026-09-01', fecha_pago: '2026-09-25', importe: 1, estado: 'anulado', beneficiario: 'Z', gasto_id: null },
  // Anulado con fecha de pago lejana: igual va DESPUÉS de los pendientes.
  { id: 'e6', unidad_negocio_id: 'u-n', cuenta_id: 'macro', tipo: 'cheque', numero: '6', fecha_emision: '2026-10-01', fecha_pago: '2026-12-31', importe: 3, estado: 'anulado', beneficiario: 'W', gasto_id: null },
]
const CUENTAS = new Map([['macro', 'Macro Seis Destinos'], ['nacion', 'Nación Paz Mirta'], ['dolce', 'Macro Dolce']])

async function main() {
  // ══ 1. El cheque que pagó a un proveedor desde Cuentas corrientes ══════════
  {
    const S = armar()
    const pagado = { id: 'c1', cobranza_id: 'cob', estado: 'endosado', banco_codigo: '072', numero: '00000111', salida_fecha: '2026-10-05', salida_destino: 'DIMAFLO S.A.', salida_proveedor_id: null, pago_gasto_id: 'g-77' }
    const cob = { id: 'cob', estado: 'procesada' }
    chk('pago con cheques de la cartera = pagó a un proveedor', S.pagoAProveedor(pagado) === true)
    chk('el endoso a proveedor de antes también', S.pagoAProveedor({ estado: 'endosado', salida_proveedor_id: 'p', salida_gasto_id: 'g' }) === true)
    chk('un endosado con texto (sin proveedor ni pago), no', S.pagoAProveedor({ estado: 'endosado' }) === false)
    chk('un depositado, no', S.pagoAProveedor({ estado: 'depositado', pago_gasto_id: 'g' }) === false)
    chk('el gasto del pago: pago_gasto_id, o salida_gasto_id', S.gastoDelPago(pagado) === 'g-77' && S.gastoDelPago({ salida_gasto_id: 'g-e' }) === 'g-e' && S.gastoDelPago({}) === null)
    chk('NO se ofrece volver a cartera: "pagado"', S.accionSalida(pagado, cob) === 'pagado')
    chk('sin procesar, nada', armar(['cobranzas:ver_todo']).accionSalida(pagado, cob) === null)
    const h = S.htmlAccionSalida(pagado, 'pagado')
    chk('"Pagó su cuenta corriente" con el link al pago en Cuentas corrientes',
      h.includes('Pagó su cuenta corriente') && h.includes('<a class="chq-link-pago" href="cuentas-corrientes.html?pago=g-77">Ver el pago</a>'), h)
    chk('sin volver a cartera ni vincular', !/data-volver-cartera|data-vincular-proveedor/.test(h))
    chk('la salida dice a qué proveedor fue', S.textoSalidaCorto(pagado) === '05/10/2026 · Cheque endosado 072-00000111 · DIMAFLO S.A.', S.textoSalidaCorto(pagado))
    const raro = S.htmlLinkPago({ pago_gasto_id: 'g"><b data-xss="x">' })
    chk('el id del pago va por encodeURIComponent (comillas dobles)', !raro.includes('"><b') && raro.includes('g%22%3E%3Cb'), raro)
    chk('sin pago, no hay link', S.htmlLinkPago({ estado: 'endosado' }) === '')
    S.estado.filas = [pagado]
    S.abrirVolverACartera('c1')
    chk('abrirVolverACartera no abre el motivo para un pago', S.__accionMotivo() === null)
  }
  chk('la lista de cheques trae las dos marcas del pago', /salida_proveedor_id, salida_gasto_id, pago_gasto_id'\)/.test(FUENTE))
  chk('"Ver el pago" no abre además la cobranza (stopPropagation)', /cont\.querySelectorAll\('\.chq-link-pago'\)\.forEach\(a => a\.addEventListener\('click', \(ev\) => ev\.stopPropagation\(\)\)\)/.test(FUENTE))

  // ══ 2. Las dos pestañas ════════════════════════════════════════════════════
  chk('el marcado tiene Cartera | Emitidos', /data-chq-vista="cartera"/.test(FUENTE) && /data-chq-vista="emitidos"/.test(FUENTE))
  chk('lo de la cartera está envuelto y los emitidos nacen escondidos', FUENTE.includes('<div id="chq-panel-cartera">') && FUENTE.includes('<div id="chq-panel-emitidos" hidden>'))

  // ══ 3. Los emitidos ════════════════════════════════════════════════════════
  {
    const S = armar()
    const nombre = c => CUENTAS.get(c.cuenta_id) ?? 'Cuenta sin nombre'
    const pend = S.pendientePorCuenta(EMITIDOS, null, nombre)
    chk('pendiente por cuenta: solo lo PENDIENTE (lo debitado y lo anulado no suman)',
      JSON.stringify(pend.map(g => [g.nombre, g.cantidad, g.total])) === JSON.stringify([['Macro Dolce', 1, 999], ['Macro Seis Destinos', 2, 100.3]]), JSON.stringify(pend))
    chk('pendiente por cuenta: el próximo débito es la fecha de pago más cercana', pend[1].proximo === '2026-10-20')
    const soloNuss = S.pendientePorCuenta(EMITIDOS, 'u-n', nombre)
    chk('pendiente por cuenta: sigue a la barra de fábricas', soloNuss.length === 1 && soloNuss[0].nombre === 'Macro Seis Destinos')

    const f = (o) => S.emitidosFiltrados(EMITIDOS, { unidad: null, estadoFiltro: 'pendiente', cuenta: '', desde: '', hasta: '', ...o }).map(c => c.id).join(',')
    chk('pendientes: el que se debita antes, arriba', f({}) === 'e2,e4,e1', f({}))
    chk('debitados', f({ estadoFiltro: 'debitado' }) === 'e3')
    chk('todos: primero los pendientes, después el más nuevo', f({ estadoFiltro: 'todos' }) === 'e2,e4,e1,e6,e5,e3', f({ estadoFiltro: 'todos' }))
    chk('por cuenta', f({ cuenta: 'macro' }) === 'e2,e1')
    chk('por fecha de pago desde / hasta', f({ desde: '2026-10-21', hasta: '2026-11-30' }) === 'e4,e1' && f({ hasta: '2026-10-20' }) === 'e2')
    chk('con la barra en una fábrica', f({ unidad: 'u-dolce' }) === 'e4')

    chk('estado: un pendiente con fecha futura se debita ESE día', S.textoEstadoEmitido(EMITIDOS[0], '2026-10-05') === 'Se debita el 15/11/2026')
    chk('estado: un pendiente con la fecha ya llegada, hoy', S.textoEstadoEmitido(EMITIDOS[0], '2026-11-15') === 'Se debita hoy')
    chk('estado: debitado, con su día', S.textoEstadoEmitido(EMITIDOS[2], '2026-10-05') === 'Debitado el 20/09/2026')
    chk('estado: anulado', S.textoEstadoEmitido(EMITIDOS[4], '2026-10-05') === 'Anulado')

    S.estado.emitidos = EMITIDOS
    S.estado.cuentasEmitidos = CUENTAS
    S.pintarEmitidos()
    // formatearImporte usa Intl: entre "$" y el número va un espacio duro.
    const N = (s) => String(s ?? '').replace(/ /g, ' ')
    const lista = N(el(S, 'chq-emi-lista').innerHTML)
    chk('la lista: tipo, número, beneficiario, cuenta, fechas e importe',
      lista.includes('E-cheque N° 9 · ANATOLIA') && lista.includes('Macro Seis Destinos · emitido 01/10/2026 · paga 20/10/2026') && lista.includes('$ 0,20'), lista)
    chk('la lista: "Ver el pago" a Cuentas corrientes', lista.includes('href="cuentas-corrientes.html?pago=g2"'))
    chk('la lista: solo los pendientes por defecto', (lista.match(/class="chq-emi /g) || []).length === 3)
    const tot = N(el(S, 'chq-emi-totales').innerHTML)
    chk('los totales por cuenta', tot.includes('Macro Seis Destinos') && tot.includes('$ 100,30') && tot.includes('2 cheques pendientes') && tot.includes('el próximo se debita el 20/10/2026'), tot)
    S.estado.emitidos = []
    S.pintarEmitidos()
    chk('sin ninguno, se dice dónde se cargan', /Se cargan desde Cuentas corrientes/.test(el(S, 'chq-emi-vacio').textContent) && el(S, 'chq-emi-vacio').hidden === false)
    S.estado.emitidos = null
    S.pintarEmitidos()
    chk('si no se pudo leer, no se dibuja una lista vacía', el(S, 'chq-emi-lista').innerHTML === '' && el(S, 'chq-emi-vacio').hidden === true)

    S.estado.emitidos = [{ ...EMITIDOS[0], cuenta_id: marca('cid'), numero: marca('num'), beneficiario: marca('benef') }]
    S.estado.cuentasEmitidos = new Map([[marca('cid'), marca('cuenta')]])
    S.pintarEmitidos()
    chequearMarcas(chk, 'lista de emitidos', el(S, 'chq-emi-lista').innerHTML, ['num', 'benef', 'cuenta'])
    chequearMarcas(chk, 'totales de emitidos', el(S, 'chq-emi-totales').innerHTML, ['cuenta'])
    S.pintarFiltroCuentasEmitidos()
    chequearMarcas(chk, 'filtro de cuentas', el(S, 'chq-emi-cuenta').innerHTML, ['cid', 'cuenta'])
  }

  // ══ 4. El permiso ══════════════════════════════════════════════════════════
  {
    const S = armar(['cobranzas:ver_todo'])
    chk('con solo ver_todo NO se leen los emitidos (la policy no lo deja)', S.puedeVerEmitidos() === false)
    await S.cargarEmitidos()
    chk('sin permiso: se dice, sin consultar', el(S, 'chq-emi-sin-permiso').hidden === false && /hace falta el permiso/.test(el(S, 'chq-emi-sin-permiso').textContent) &&
      !S.__consultas.some(c => c.tabla === 'cheques_emitidos'))
    chk('con procesar, sí', armar(['cobranzas:procesar']).puedeVerEmitidos() === true)
    chk('con registrar pagos, sí', armar(['cuentas_corrientes:registrar_pago']).puedeVerEmitidos() === true)
    const T = armar(['cobranzas:procesar'])
    T.__set((tabla) => tabla === 'cheques_emitidos' ? EMITIDOS : [{ id: 'macro', nombre: 'Macro Seis Destinos' }])
    await T.cargarEmitidos()
    chk('con permiso: lee cheques_emitidos y los nombres de las cuentas', T.__consultas.some(c => c.tabla === 'cheques_emitidos') && T.estado.cuentasEmitidos.get('macro') === 'Macro Seis Destinos')
    chk('el filtro de cuentas se arma con las cuentas de los emitidos', /value="macro"/.test(el(T, 'chq-emi-cuenta').innerHTML))
  }
}

esperas.push(main())
fin()
