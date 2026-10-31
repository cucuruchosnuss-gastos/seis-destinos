// DESDE LA CUENTA DEL CLIENTE, ABRIR LA ORDEN DE RETIRO (14/10/2026, rama
// ci-prueba/cuenta-a-orden).
//
// Pedido de Facu (14/10):
//  1. En Administración → Clientes → la cuenta del cliente, todo renglón con
//     orden_retiro_id se ve como link (cursor + "Ver la orden ›") y al tocarlo
//     abre la orden ahí mismo (abrirOrden), sin recargar. Vale para la cuenta
//     de cliente de siempre (cuenta_cliente) y para la de cliente y proveedor
//     (cuenta_unificada, js/cuenta-unica.js). js/cuenta-unica.js es
//     compartido: el renglón lleva SIEMPRE data-orden-retiro, pero el look de
//     link (y el toque) solo si la pantalla lo pide (ctx.abrirOrden).
//  2. "← Volver" arriba a la izquierda vuelve EXACTAMENTE a donde se estaba:
//     la cuenta del mismo cliente, con el mismo filtro y el mismo scroll. Una
//     pila de navegación (PILA_NAV) + history.pushState / popstate, así el
//     atrás del navegador hace lo mismo. Desde la lista de órdenes vuelve a la
//     lista. Sin nada en la pila, la flecha no se ve.
//  3. Lo mismo con cobranza_id: la vista de detalle de una cobranza YA existía
//     en Administración (la de "Cobranzas por asentar", con "Reabrir").
// Se EJECUTA el código real con una base falsa.
//
//   node pruebas/test-administracion-cuenta-a-orden.js
// ARCHIVO_TEST: administracion.html; ARCHIVO_JS_CUENTA_UNICA: js/cuenta-unica.js;
// ARCHIVO_CSS: css/main.css.
'use strict'

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/administracion.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
const RUTA_CSS = process.env.ARCHIVO_CSS || path.join(RAIZ, 'css/main.css')
const CSS = fs.readFileSync(RUTA_CSS, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
console.log(`ARCHIVO ${RUTA_CSS} (${CSS.length} bytes)`)
const { chk, esperas, fin } = arnes()

// El historial y el scroll del navegador, de mentira: pushState anota,
// back() saca la entrada de arriba y avisa popstate (como el navegador), y
// los setTimeout quedan guardados para correrlos a mano.
const PRELUDIO_NAV = `
  var __timers = []
  function setTimeout(f) { __timers.push(f); return __timers.length }
  var __entradas = [null]
  var __popstateApagado = false
  var __pushTira = false
  var history = {
    get state() { return __entradas[__entradas.length - 1] },
    pushState(s) { if (__pushTira) throw new Error('SecurityError'); __entradas.push(s) },
    replaceState(s) { __entradas[__entradas.length - 1] = s },
    back() { if (__entradas.length > 1) __entradas.pop(); if (!__popstateApagado) alVolverNavegador({ state: history.state }) },
  }
  window.scrollY = 0
  window.__scrolls = []
  window.scrollTo = function (x, y) { const top = typeof x === 'object' ? x.top : y; window.__scrolls.push(top); window.scrollY = top }
  window.__nav = { entradas: () => __entradas, timers: () => __timers, apagarPopstate(v) { __popstateApagado = v }, pushTira(v) { __pushTira = v } }
`
const nuevo = () => construirAdministracion(ARCHIVO, { preludioExtra: PRELUDIO_NAV })
const S0 = nuevo()
const tanda = () => new Promise(r => setImmediate(r))
const asentar = async () => { for (let i = 0; i < 8; i++) await tanda() }

const COB = 'a1111111-1111-4111-8111-111111111111'
const FILA = (o) => ({
  fecha: '2026-09-20', orden: '2026-09-20T12:00:00Z', lado: 'cliente', etiqueta: 'Venta', detalle: 'Orden de retiro N-0012',
  moneda: 'ARS', te_debe: 76000, le_debes: 0, te_debe_acum: 76000, le_debes_acum: 0, neto_acum: 76000,
  cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n',
  orden_retiro_id: null, cobranza_id: null, gasto_id: null, factura_pendiente_id: null, ...o,
})
const UNICA = [
  FILA({ fecha: '2026-08-20', lado: 'proveedor', etiqueta: 'Compra', detalle: 'Factura A 0003-00001201', te_debe: 0, le_debes: 250000, te_debe_acum: 0, le_debes_acum: 250000, neto_acum: -250000 }),
  FILA({ orden_retiro_id: 'o1', te_debe_acum: 76000, le_debes_acum: 250000, neto_acum: -174000 }),
  FILA({ fecha: '2026-09-22', etiqueta: 'Cobranza', detalle: 'Cobranza de la ruta', te_debe: -30000, te_debe_acum: 46000, le_debes_acum: 250000, neto_acum: -204000, cobranza_id: COB }),
]
const CUENTA = [
  { fecha: '2026-09-01', tipo: 'saldo_inicial', detalle: 'Deuda de agosto', importe: 80000, saldo: 80000, orden_retiro_id: null },
  { fecha: '2026-09-20', tipo: 'retiro', detalle: 'Orden de retiro N-0012', importe: 46000, saldo: 126000, orden_retiro_id: 'o1' },
  { fecha: '2026-09-22', tipo: 'cobranza', detalle: 'Cobranza del 22/09/2026', importe: -30000, saldo: 96000, orden_retiro_id: null },
]
const ORDENES = [
  { id: 'o1', numero: 12, codigo: 'N-0012', unidad_negocio_id: 'u-n', fecha: '2026-09-20', estado: 'confirmada', estado_valorizacion: 'valorizada', total: 46000, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9' },
  { id: 'o2', numero: 13, codigo: 'N-0013', unidad_negocio_id: 'u-n', fecha: '2026-09-26', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9' },
]
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', limite_credito: null, activo: true, proveedor_id: 'pv1' },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, limite_credito: null, activo: true, proveedor_id: null },
]
const TODAS = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }], ['cobranzas:procesar', null], ['cuentas_corrientes:registrar_pago', null]])

function preparar(S, { tareas = TODAS, cuenta = CUENTA, unica = UNICA } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.misTareas = tareas
  S.__tablas.ordenes_retiro = (f) => {
    const id = f.find(x => x[0] === 'eq' && x[1] === 'id')
    return { data: id ? ORDENES.filter(o => o.id === id[2]) : ORDENES, error: null }
  }
  S.__tablas.orden_retiro_items = []
  S.__tablas.v_cobranzas = [{ id: COB, cliente: 'Anatolia', fecha: '2026-09-22', efectivo: 30000, cantidad_cheques: 0, total: 30000, moneda: 'ARS', estado: 'procesada', unidad_negocio_id: 'u-n' }]
  S.__tablas.cobranzas = [{ id: COB, cliente_id: 'c1' }]
  const datos = { cuenta, unica }
  S.__setRpc(async (n) => {
    if (n === 'cuenta_cliente') return { data: datos.cuenta, error: null }
    if (n === 'cuenta_unificada') return { data: datos.unica, error: null }
    return { data: [], error: null }
  })
  return datos
}
const el = (S, id) => S.__els.get(id) ?? S.__doc.getElementById(id)
const nav = (S) => S.__win.__nav
// Un toque: e.target.closest(sel) devuelve el elemento con su dataset si sel
// es el pedido (la lista de selectores de alTocarCuentaUnica, de a uno).
const toque = (sel, dataset) => ({ target: { closest: (s) => s === sel ? { dataset } : null } })

// ═══ 1. js/cuenta-unica.js: el renglón y su link (contrato compartido) ═════
{
  const S = S0
  const f = FILA({ orden_retiro_id: 'o1' })
  const sin = S.htmlFilaCu(f)
  chk('cu: el renglón con orden lleva data-orden-retiro SIEMPRE', /<div class="cu-fila" data-orden-retiro="o1">/.test(sin), sin.slice(0, 80))
  chk('cu: sin que la pantalla lo pida NO se ve como link (ni botón, ni "Ver la orden")', !/cu-fila--link|<button|Ver la orden/.test(sin))
  chk('cu: sin pedirlo cierra con </div>', sin.endsWith('</div></div>') && !sin.includes('</button>'))
  const con = S.htmlFilaCu(f, { abreOrden: true })
  chk('cu: con abreOrden es un botón link con data-orden-retiro', /^<button type="button" class="cu-fila cu-fila--link" data-orden-retiro="o1">/.test(con), con.slice(0, 90))
  chk('cu: con abreOrden dice "Ver la orden ›"', /<span class="cu-fila__ver">Ver la orden <span aria-hidden="true">›<\/span><\/span>/.test(con))
  chk('cu: con abreOrden cierra con </button>', con.endsWith('</div></button>'))
  chk('cu: el link conserva las columnas y el detalle', /data-col="Te debe"/.test(con) && /Orden de retiro N-0012/.test(con))
  const otra = S.htmlFilaCu(FILA({}), { abreOrden: true, abreCobranza: true })
  chk('cu: un renglón SIN orden ni cobranza nunca es link', /^<div class="cu-fila">/.test(otra) && !/data-orden-retiro|data-cobranza-id|Ver la/.test(otra))
  const cob = FILA({ cobranza_id: COB })
  chk('cu: el renglón con cobranza lleva data-cobranza-id siempre', S.htmlFilaCu(cob).includes(`data-cobranza-id="${COB}"`) && !/cu-fila--link/.test(S.htmlFilaCu(cob)))
  chk('cu: abreOrden no hace link a una cobranza', !/cu-fila--link/.test(S.htmlFilaCu(cob, { abreOrden: true })))
  chk('cu: con abreCobranza, "Ver la cobranza ›"', /^<button type="button" class="cu-fila cu-fila--link" data-cobranza-id=/.test(S.htmlFilaCu(cob, { abreCobranza: true })) && /Ver la cobranza/.test(S.htmlFilaCu(cob, { abreCobranza: true })))
  chk('cu: abreCobranza no hace link a una orden', !/cu-fila--link/.test(S.htmlFilaCu(f, { abreCobranza: true })))
  const las2 = FILA({ orden_retiro_id: 'o1', cobranza_id: COB })
  chk('cu: con las dos, manda la orden', S.linkFilaCu(las2, { abreOrden: true, abreCobranza: true }) === 'orden' && /Ver la orden/.test(S.htmlFilaCu(las2, { abreOrden: true, abreCobranza: true })))
  chk('cu: con las dos y solo abreCobranza, la cobranza', S.linkFilaCu(las2, { abreCobranza: true }) === 'cobranza')
  chk('cu: linkFilaCu sin pedir nada es null', S.linkFilaCu(las2) === null && S.linkFilaCu(null, { abreOrden: true }) === null)

  // El escape del id (viene de la base).
  const x = S.htmlFilaCu(FILA({ orden_retiro_id: marca('orden_retiro_id'), cobranza_id: marca('cobranza_id') }), { abreOrden: true })
  chequearMarcas(chk, 'cu: htmlFilaCu con link', x, ['orden_retiro_id', 'cobranza_id'])
  const x2 = S.htmlFilaCu(FILA({ orden_retiro_id: marca('orden_retiro_id'), cobranza_id: marca('cobranza_id') }))
  chequearMarcas(chk, 'cu: htmlFilaCu sin link', x2, ['orden_retiro_id', 'cobranza_id'])

  // htmlCuentaUnica pasa las opciones a cada renglón (y el filtro sigue).
  const cu = { ...S.estadoCuentaUnica({ clienteId: 'c1' }), filas: UNICA }
  chk('cu: htmlCuentaUnica sin opciones no tiene links', !/cu-fila--link/.test(S.htmlCuentaUnica(cu)) && /data-orden-retiro="o1"/.test(S.htmlCuentaUnica(cu)))
  const h = S.htmlCuentaUnica(cu, { abreOrden: true, abreCobranza: true })
  chk('cu: htmlCuentaUnica con abreOrden y abreCobranza: dos links', (h.match(/cu-fila--link/g) || []).length === 2, (h.match(/cu-fila--link/g) || []).length)
  chk('cu: htmlCuentaUnica con solo abreOrden: un link (la orden)', (S.htmlCuentaUnica(cu, { abreOrden: true }).match(/cu-fila--link/g) || []).length === 1)
  chk('cu: htmlCuentaUnica con solo abreCobranza: un link (la cobranza)', (S.htmlCuentaUnica(cu, { abreCobranza: true }).match(/cu-fila--link" data-cobranza-id/g) || []).length === 1)
  cu.filtro = 'Venta'
  const hf = S.htmlCuentaUnica(cu, { abreOrden: true })
  chk('cu: con el filtro, solo la venta, y sigue siendo link', (hf.match(/class="cu-fila[ "]/g) || []).length === 1 && /cu-fila--link" data-orden-retiro="o1"/.test(hf))

  // pintarCuentaUnica: el link depende de ctx.abrirOrden / ctx.abrirCobranza.
  const cont = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] }
  const base = { sb: null, cu: { ...cu, filtro: '' }, contenedor: cont, hoy: '2026-10-14', puedeCompensar: false }
  S.pintarCuentaUnica(base)
  chk('cu: una pantalla sin abrirOrden (Cuentas corrientes) no muestra links', !/cu-fila--link/.test(cont.innerHTML) && /data-orden-retiro="o1"/.test(cont.innerHTML))
  S.pintarCuentaUnica({ ...base, abrirOrden: null, abrirCobranza: undefined })
  chk('cu: abrirOrden null tampoco', !/cu-fila--link/.test(cont.innerHTML))
  S.pintarCuentaUnica({ ...base, abrirOrden: () => {} })
  chk('cu: con ctx.abrirOrden, la orden es link (y la cobranza no)', /cu-fila--link" data-orden-retiro="o1"/.test(cont.innerHTML) && !/cu-fila--link" data-cobranza-id/.test(cont.innerHTML))
  S.pintarCuentaUnica({ ...base, abrirCobranza: () => {} })
  chk('cu: con ctx.abrirCobranza, la cobranza es link (y la orden no)', /cu-fila--link" data-cobranza-id/.test(cont.innerHTML) && !/cu-fila--link" data-orden-retiro/.test(cont.innerHTML))

  // alTocarCuentaUnica: el toque lo decide la pantalla.
  const abiertas = []
  const ctx = { ...base, abrirOrden: (id) => abiertas.push(['orden', id]), abrirCobranza: (id) => abiertas.push(['cobranza', id]) }
  S.alTocarCuentaUnica(toque('[data-orden-retiro]', { ordenRetiro: 'o1' }), ctx)
  chk('cu: tocar un renglón con orden llama a ctx.abrirOrden con su id', abiertas.length === 1 && abiertas[0][0] === 'orden' && abiertas[0][1] === 'o1', JSON.stringify(abiertas))
  S.alTocarCuentaUnica(toque('[data-cobranza-id]', { cobranzaId: COB }), ctx)
  chk('cu: tocar un renglón con cobranza llama a ctx.abrirCobranza con su id', abiertas.length === 2 && abiertas[1][0] === 'cobranza' && abiertas[1][1] === COB, JSON.stringify(abiertas))
  let tiro = null
  try {
    S.alTocarCuentaUnica(toque('[data-orden-retiro]', { ordenRetiro: 'o1' }), base)
    S.alTocarCuentaUnica(toque('[data-cobranza-id]', { cobranzaId: COB }), base)
  } catch (e) { tiro = e }
  chk('cu: sin ctx.abrirOrden / abrirCobranza, tocar no hace nada ni tira', tiro === null && abiertas.length === 2, String(tiro))
  S.alTocarCuentaUnica(toque('[data-cu-no-existe]', {}), ctx)
  chk('cu: tocar fuera de un renglón no abre nada', abiertas.length === 2)
  // Un renglón con las dos: abre SOLO la orden.
  const ambos = { dataset: { ordenRetiro: 'o1', cobranzaId: COB } }
  S.alTocarCuentaUnica({ target: { closest: (s) => (s === '[data-orden-retiro]' || s === '[data-cobranza-id]') ? ambos : null } }, ctx)
  chk('cu: un renglón con orden y cobranza abre solo la orden', abiertas.length === 3 && abiertas[2][0] === 'orden', JSON.stringify(abiertas))
}

// ═══ 2. Administración: la cuenta de cliente (cuenta_cliente) ═══════════════
{
  const S = nuevo()
  preparar(S)
  S.estado.cliente = { id: 'c1', cuenta: CUENTA, codigos: new Map([['o1', 'N-0012']]), error: null }
  const h = S.htmlCuenta(S.estado.cliente)
  chk('cuenta: el movimiento de una orden es un botón con data-orden-retiro', /<button type="button" class="ad-renglon ad-renglon--boton" data-orden-retiro="o1">/.test(h))
  chk('cuenta: dice "Ver la orden ›"', /<span class="ad-renglon__ver">Ver la orden ›<\/span>/.test(h))
  chk('cuenta: los demás movimientos no son link', (h.match(/ad-renglon--boton/g) || []).length === 1)
  chk('cuenta: el link cierra con </button>', /Ver la orden ›<\/span><\/div><\/div><div class="ad-renglon__plata">.*?<\/div><\/div><\/button>/.test(h))
  S.estado.misTareas = new Map([['retiros:precios', { todas: true }]])
  const sin = S.htmlCuenta(S.estado.cliente)
  chk('cuenta: sin retiros:ver no es link (no la podría leer)', !/data-orden-retiro|Ver la orden/.test(sin))
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-d'] }]])
  chk('cuenta: con retiros:ver en OTRA empresa tampoco', !/data-orden-retiro/.test(S.htmlCuenta(S.estado.cliente)))
  S.estado.misTareas = TODAS
  const conCob = { ...S.estado.cliente, cuenta: CUENTA.map(m => m.tipo === 'cobranza' ? { ...m, cobranza_id: COB } : m) }
  const hc = S.htmlCuenta(conCob)
  chk('cuenta: la cobranza sigue abriéndose ("Ver la cobranza ›")', hc.includes(`data-cuenta-cobranza="${COB}"`) && /Ver la cobranza ›/.test(hc) && /Ver la orden ›/.test(hc))
  const x = S.htmlCuenta({ ...S.estado.cliente, cuenta: [{ ...CUENTA[1], orden_retiro_id: marca('orden_retiro_id') }] })
  chequearMarcas(chk, 'cuenta: htmlCuenta', x, ['orden_retiro_id'])
  chk('puedeVerLaOrden: con retiros:ver en la empresa', S.puedeVerLaOrden() === true)
  S.estado.miRolApp = 'super_admin'; S.estado.misTareas = new Map()
  chk('puedeVerLaOrden: un super_admin sí', S.puedeVerLaOrden() === true)
}

// ═══ 3. La pila: cuenta → orden → volver = la cuenta con filtro y scroll ═══
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  chk('pila: en la cuenta, la flecha no se ve (pila vacía)', el(S, 'ad-volver').hidden === true && S.PILA_NAV.length === 0)
  const ctx = S.ctxCuentaUnica()
  chk('pila: la cuenta de cliente y proveedor recibe abrirOrden y abrirCobranza', typeof ctx.abrirOrden === 'function' && typeof ctx.abrirCobranza === 'function')
  chk('pila: y los renglones se ven como link', /cu-fila--link" data-orden-retiro="o1"/.test(el(S, 'ad-cuenta-unica').innerHTML) && /cu-fila--link" data-cobranza-id/.test(el(S, 'ad-cuenta-unica').innerHTML))
  // El filtro "Venta" y el scroll a 640.
  S.alCambiarCuentaUnica({ target: { matches: (s) => s === '[data-cu-filtro]', value: 'Venta' } }, ctx)
  const cuentaAntes = el(S, 'ad-cuenta-unica').innerHTML
  const cuerpoAntes = el(S, 'ad-cliente-cuerpo').innerHTML
  const cliente = S.estado.cliente
  S.__win.scrollY = 640
  const rpcAntes = S.__llamadas.rpc.length
  await ctx.abrirOrden('o1')
  chk('pila: abre la orden', S.estado.vista === 'ad-vista-orden' && S.estado.orden?.id === 'o1' && S.estado.orden?.orden?.codigo === 'N-0012')
  // datos_division_orden es de la orden (sus puntos N1 / N2, 28/10/2026), no de la cuenta.
  chk('pila: sin recargar la cuenta (ninguna rpc nueva al abrir la orden)', S.__llamadas.rpc.slice(rpcAntes).filter(([n]) => n !== 'datos_division_orden').length === 0)
  chk('pila: apiló de dónde se vino (la cuenta, su scroll y el cliente)', S.PILA_NAV.length === 1 && S.PILA_NAV[0].vista === 'ad-vista-cliente' && S.PILA_NAV[0].scroll === 640 && S.PILA_NAV[0].clienteId === 'c1' && S.PILA_NAV[0].destino === 'ad-vista-orden', JSON.stringify(S.PILA_NAV))
  chk('pila: empujó una entrada al historial', JSON.stringify(nav(S).entradas()) === JSON.stringify([null, { adPila: 1 }]), JSON.stringify(nav(S).entradas()))
  chk('pila: la flecha se ve', el(S, 'ad-volver').hidden === false)
  chk('pila: "‹ Órdenes" se esconde (manda la flecha)', el(S, 'ad-orden-volver').hidden === true)
  chk('pila: el "‹ Volver" al dashboard se esconde (ad-app--pila)', el(S, 'ad-app').classList.contains('ad-app--pila'))
  chk('pila: la cuenta quedó escondida pero intacta', el(S, 'ad-vista-cliente').hidden === true && el(S, 'ad-cuenta-unica').innerHTML === cuentaAntes)

  // ← Volver
  S.volverPila()
  chk('volver: la vista es la cuenta del mismo cliente', S.estado.vista === 'ad-vista-cliente' && el(S, 'ad-vista-cliente').hidden === false && S.estado.cliente === cliente)
  chk('volver: el scroll vuelve a 640', S.__win.scrollY === 640, String(S.__win.__scrolls))
  chk('volver: el filtro sigue en "Venta"', S.estado.cliente.unica.filtro === 'Venta' && el(S, 'ad-cuenta-unica').innerHTML === cuentaAntes)
  chk('volver: la pila quedó vacía y la flecha no se ve', S.PILA_NAV.length === 0 && el(S, 'ad-volver').hidden === true)
  chk('volver: "‹ Órdenes" y el "‹ Volver" al dashboard vuelven', el(S, 'ad-orden-volver').hidden === false && !el(S, 'ad-app').classList.contains('ad-app--pila'))
  chk('volver: la flecha usó el historial (salió la entrada)', JSON.stringify(nav(S).entradas()) === '[null]', JSON.stringify(nav(S).entradas()))
  el(S, 'ad-cliente-cuerpo').innerHTML = cuerpoAntes + '<!--sin-redibujar-->'
  el(S, 'ad-cuenta-unica').innerHTML = cuentaAntes + '<!--sin-redibujar-->'
  await asentar()
  chk('volver: relee la cuenta en silencio', S.__llamadas.rpc.filter(x => x[0] === 'cuenta_cliente').length === 2 && S.__llamadas.rpc.filter(x => x[0] === 'cuenta_unificada').length === 2)
  chk('volver: si llegó igual, NO redibuja (el filtro y el scroll quedan)', el(S, 'ad-cliente-cuerpo').innerHTML.endsWith('<!--sin-redibujar-->') && el(S, 'ad-cuenta-unica').innerHTML.endsWith('<!--sin-redibujar-->'))
  chk('volver: no pasó por "Cargando…"', !/Cargando/.test(el(S, 'ad-cliente-cuerpo').innerHTML))
  chk('volver: el fallback de la flecha no vuelve dos veces', (() => { for (const f of nav(S).timers()) f(); return S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0 })())

  // Adelante del navegador: no hace nada.
  S.alVolverNavegador({ state: { adPila: 1 } })
  chk('adelante: con la pila vacía no hace nada', S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0)
})())

// La orden cambió (se valorizó): al volver, la cuenta se redibuja con lo
// nuevo, con el MISMO filtro.
esperas.push((async () => {
  const S = nuevo()
  const datos = preparar(S)
  await S.abrirCliente('c1')
  const ctx = S.ctxCuentaUnica()
  S.alCambiarCuentaUnica({ target: { matches: (s) => s === '[data-cu-filtro]', value: 'Venta' } }, ctx)
  await ctx.abrirOrden('o1')
  datos.cuenta = [...CUENTA, { fecha: '2026-10-14', tipo: 'ajuste', detalle: 'Orden de retiro N-0012 · corrección', importe: 1000, saldo: 97000, orden_retiro_id: 'o1' }]
  datos.unica = [...UNICA, FILA({ fecha: '2026-10-14', detalle: 'Corrección de la orden', te_debe: 1000, orden_retiro_id: 'o1' })]
  S.alVolverNavegador({ state: null })
  await asentar()
  chk('cambió: la cuenta de cliente se redibuja con el movimiento nuevo', /corrección/.test(el(S, 'ad-cliente-cuerpo').innerHTML) && (el(S, 'ad-cliente-cuerpo').innerHTML.match(/data-orden-retiro="o1"/g) || []).length === 2)
  chk('cambió: la de cliente y proveedor también, con el mismo filtro', /Corrección de la orden/.test(el(S, 'ad-cuenta-unica').innerHTML) && S.estado.cliente.unica.filtro === 'Venta' && !/Factura A/.test(el(S, 'ad-cuenta-unica').innerHTML))
})())

// Si al volver la relectura falla, queda lo que se veía.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  const ctx = S.ctxCuentaUnica()
  await ctx.abrirOrden('o1')
  const antes = el(S, 'ad-cuenta-unica').innerHTML
  S.__setRpc(async (n) => n === 'cuenta_unificada' ? { data: null, error: { message: 'x' } } : { data: CUENTA, error: null })
  S.alVolverNavegador({ state: null })
  await asentar()
  chk('falla: si cuenta_unificada falla al volver, queda la cuenta que se veía', el(S, 'ad-cuenta-unica').innerHTML === antes && Array.isArray(S.estado.cliente.unica.filas) && !S.estado.cliente.unica.error)
  S.__setRpc(async () => ({ data: null, error: { message: 'sin red' } }))
  await ctx.abrirOrden('o1')
  S.alVolverNavegador({ state: null })
  await asentar()
  chk('falla: sin red al volver, la cuenta queda y no hay error', el(S, 'ad-cuenta-unica').innerHTML === antes && !S.estado.cliente.error && S.estado.vista === 'ad-vista-cliente')
})())

// El atrás del navegador hace lo mismo que la flecha.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  S.__win.scrollY = 333
  await S.ctxCuentaUnica().abrirOrden('o1')
  S.__win.scrollY = 0
  nav(S).entradas().pop()
  S.alVolverNavegador({ state: null })
  chk('atrás: vuelve a la cuenta, con su scroll, y la pila queda vacía', S.estado.vista === 'ad-vista-cliente' && S.__win.scrollY === 333 && S.PILA_NAV.length === 0 && el(S, 'ad-volver').hidden === true)
})())

// El renglón de la cuenta de cliente (cuenta_cliente) también abre la orden.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c2')
  S.__win.scrollY = 120
  await S.abrirOrdenDesde('o1')
  chk('cuenta_cliente: abre la orden y apila la cuenta de Kiosco Pepe', S.estado.vista === 'ad-vista-orden' && S.PILA_NAV[0]?.clienteId === 'c2')
  S.volverPila()
  chk('cuenta_cliente: vuelve a la cuenta de Kiosco Pepe', S.estado.vista === 'ad-vista-cliente' && S.estado.cliente.id === 'c2' && S.__win.scrollY === 120)
})())

// ═══ 4. La pila: lista → orden → volver = la lista ═════════════════════════
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  S.estado.filtros.estado = 'confirmada'
  await S.mostrarOrdenes()
  chk('lista: en la lista, sin flecha', S.estado.vista === 'ad-vista-ordenes' && el(S, 'ad-volver').hidden === true)
  const consultasAntes = S.__llamadas.consultas.filter(c => c[0] === 'ordenes_retiro').length
  S.__win.scrollY = 300
  await S.abrirOrdenDesde('o2')
  chk('lista: abre la orden y apila la lista', S.estado.vista === 'ad-vista-orden' && S.PILA_NAV.length === 1 && S.PILA_NAV[0].vista === 'ad-vista-ordenes' && S.PILA_NAV[0].scroll === 300)
  // En la compu, con la lista al costado: tocar otra orden NO apila de nuevo.
  await S.abrirOrdenDesde('o1')
  chk('lista: otra orden desde la orden abierta no apila de nuevo', S.PILA_NAV.length === 1 && S.estado.orden.id === 'o1' && nav(S).entradas().length === 2)
  // Desde la lista queda el "‹ Órdenes" de siempre (la flecha no: sería un
  // segundo botón para lo mismo; e2e/detalles-dispositivos lo toca).
  chk('lista: "‹ Órdenes" sigue visible', el(S, 'ad-orden-volver').hidden === false)
  chk('lista: la flecha no se muestra (desde la lista vuelve "‹ Órdenes")', el(S, 'ad-volver').hidden === true && !el(S, 'ad-app').classList.contains('ad-app--pila') && S.flechaVisible() === false)
  const listaAntes = el(S, 'ad-ordenes-lista').innerHTML
  S.volverAOrdenes()
  chk('lista: "‹ Órdenes" vuelve por la pila (y el historial queda en orden)', S.PILA_NAV.length === 0 && JSON.stringify(nav(S).entradas()) === '[null]', JSON.stringify(nav(S).entradas()))
  chk('lista: vuelve a la lista (no a la cuenta ni a la portada)', S.estado.vista === 'ad-vista-ordenes' && el(S, 'ad-vista-ordenes').hidden === false)
  chk('lista: con su scroll', S.__win.scrollY === 300)
  chk('lista: con sus filtros', S.estado.filtros.estado === 'confirmada')
  chk('lista: sin "Cargando…" (la lista sigue a la vista)', el(S, 'ad-ordenes-lista').innerHTML === listaAntes && Array.isArray(S.estado.ordenes))
  el(S, 'ad-ordenes-lista').innerHTML = listaAntes + '<!--sin-redibujar-->'
  await asentar()
  chk('lista: la relee en silencio', S.__llamadas.consultas.filter(c => c[0] === 'ordenes_retiro').length > consultasAntes)
  chk('lista: igual, no la redibuja', el(S, 'ad-ordenes-lista').innerHTML.endsWith('<!--sin-redibujar-->'))
  chk('lista: la flecha se fue', el(S, 'ad-volver').hidden === true && S.PILA_NAV.length === 0)
  // El atrás del navegador también vuelve a la lista.
  await S.abrirOrdenDesde('o2')
  S.__win.scrollY = 0
  S.volverPila()
  chk('lista: la pila también vuelve (el atrás del navegador)', S.estado.vista === 'ad-vista-ordenes' && S.__win.scrollY === 300 && S.PILA_NAV.length === 0)
  // Si cambió (la orden se valorizó), se redibuja.
  await S.abrirOrdenDesde('o2')
  ORDENES[1].estado_valorizacion = 'valorizada'; ORDENES[1].total = 5000
  S.volverPila()
  await asentar()
  ORDENES[1].estado_valorizacion = 'pendiente'; ORDENES[1].total = 0
  chk('lista: si cambió, la redibuja', !el(S, 'ad-ordenes-lista').innerHTML.endsWith('<!--sin-redibujar-->'))
})())

// ═══ 5. Ir a otro lado vacía la pila; sin pila no hay flecha ═══════════════
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  await S.abrirOrdenDesde('o1')
  S.mostrarVista('ad-vista-clientes')
  chk('otro lado: una pestaña (otra vista) vacía la pila y esconde la flecha', S.PILA_NAV.length === 0 && el(S, 'ad-volver').hidden === true && el(S, 'ad-orden-volver').hidden === false)
  S.alVolverNavegador({ state: null })
  chk('otro lado: después, el atrás del navegador no cambia de vista', S.estado.vista === 'ad-vista-clientes')
  S.volverPila()
  chk('otro lado: la flecha (escondida) tampoco', S.estado.vista === 'ad-vista-clientes')
  // Una orden abierta de otro lado (un link): sin flecha.
  await S.abrirOrden('o1')
  chk('sin pila: una orden abierta sin pasar por la cuenta ni la lista no tiene flecha', el(S, 'ad-volver').hidden === true && el(S, 'ad-orden-volver').hidden === false && S.PILA_NAV.length === 0)
  // Valorizar / anular vuelven a abrir la MISMA vista: la pila sigue.
  await S.abrirCliente('c1')
  await S.abrirOrdenDesde('o1')
  await S.abrirOrden('o1')
  chk('misma vista: abrir de nuevo la orden (después de valorizar) no vacía la pila', S.PILA_NAV.length === 1 && el(S, 'ad-volver').hidden === false)
  chk('abrirOrdenDesde sin id no hace nada', S.abrirOrdenDesde('') === undefined && S.PILA_NAV.length === 1)
  chk('desde la cuenta: la flecha sí, "‹ Órdenes" no', S.flechaVisible() === true && el(S, 'ad-orden-volver').hidden === true)
  // "‹ Órdenes" (escondido) con la pila de la cuenta: va a la lista de siempre y la vacía.
  await S.volverAOrdenes()
  chk('"‹ Órdenes" con la pila de la cuenta va a la lista (no a la cuenta)', S.estado.vista === 'ad-vista-ordenes' && S.PILA_NAV.length === 0)
  await S.abrirOrden('o1')
  await S.volverAOrdenes()
  chk('"‹ Órdenes" sin pila: la lista como siempre', S.estado.vista === 'ad-vista-ordenes' && S.PILA_NAV.length === 0)
})())

// La flecha sin la entrada del historial (otra pieza la pisó) o sin popstate.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  await S.abrirOrdenDesde('o1')
  nav(S).entradas()[1] = null // replaceState(null) de otra parte de la pantalla
  S.volverPila()
  chk('sin entrada: la flecha vuelve igual (sin tocar el historial)', S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0 && nav(S).entradas().length === 2)
  await S.abrirOrdenDesde('o1')
  nav(S).apagarPopstate(true)
  S.volverPila()
  chk('sin popstate: la flecha espera al navegador…', S.estado.vista === 'ad-vista-orden' && S.PILA_NAV.length === 1)
  for (const f of nav(S).timers()) f()
  chk('…y si no avisa, vuelve sola', S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0)
  // Con popstate: vuelve, se abre OTRA vez la orden, y el aviso viejo de la
  // flecha no tiene que sacar la entrada nueva.
  nav(S).apagarPopstate(false)
  nav(S).timers().length = 0
  await S.abrirOrdenDesde('o1')
  S.volverPila()
  await S.abrirOrdenDesde('o1')
  for (const f of nav(S).timers()) f()
  chk('fallback viejo: no saca la entrada nueva', S.estado.vista === 'ad-vista-orden' && S.PILA_NAV.length === 1)
  S.volverPila()
  // Saltar varias entradas de golpe (mantener apretado el atrás).
  S.PILA_NAV.push({ vista: 'ad-vista-ordenes', destino: 'ad-vista-cliente', scroll: 10, clienteId: null })
  S.PILA_NAV.push({ vista: 'ad-vista-cliente', destino: 'ad-vista-orden', scroll: 20, clienteId: 'c1' })
  S.alVolverNavegador({ state: { adPila: 0 } })
  chk('varias: el atrás que salta dos vuelve a la primera', S.estado.vista === 'ad-vista-ordenes' && S.PILA_NAV.length === 0 && S.__win.scrollY === 10)
  S.PILA_NAV.push({ vista: 'ad-vista-ordenes', destino: 'ad-vista-cliente', scroll: 10, clienteId: null })
  S.PILA_NAV.push({ vista: 'ad-vista-cliente', destino: 'ad-vista-orden', scroll: 20, clienteId: 'c1' })
  S.alVolverNavegador({ state: { adPila: 1 } })
  chk('varias: el atrás de a uno saca solo la de arriba', S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 1)
  S.PILA_NAV.length = 0
  chk('desapilar con la pila vacía no hace nada', S.desapilarNav() === false)
})())

// pushState que falla (un navegador raro, un iframe sin permiso): abre igual.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  const errores = []
  const ce = console.error
  console.error = (...a) => errores.push(a.join(' '))
  nav(S).pushTira(true)
  let r
  try { r = await (async () => { try { return await S.abrirOrdenDesde('o1') } catch (e) { return e } })() } finally { console.error = ce }
  chk('pushState: si el historial falla, la orden se abre igual', !(r instanceof Error) && S.estado.vista === 'ad-vista-orden' && S.PILA_NAV.length === 1)
  chk('pushState: y lo anota en la consola', errores.some(e => /No se pudo anotar en el historial/.test(e)))
  S.volverPila()
  chk('pushState: la flecha vuelve igual (sin la entrada del historial)', S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0)
})())

// La cuenta de OTRO cliente en la pila (no debería pasar): la vuelve a abrir.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c2')
  await S.abrirOrdenDesde('o1')
  S.PILA_NAV[0].clienteId = 'c1'
  const n = S.__llamadas.rpc.filter(x => x[0] === 'cuenta_cliente').length
  S.volverPila()
  await asentar()
  chk('otro cliente: vuelve a abrir la cuenta del cliente apilado', S.estado.cliente.id === 'c1' && S.estado.vista === 'ad-vista-cliente' && S.__llamadas.rpc.filter(x => x[0] === 'cuenta_cliente').length === n + 1)
})())

// ═══ 6. La cobranza: la vista de detalle ya existía → mismo patrón ════════
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c1')
  const ctx = S.ctxCuentaUnica()
  S.alCambiarCuentaUnica({ target: { matches: (s) => s === '[data-cu-filtro]', value: 'Cobranza' } }, ctx)
  const cliente = S.estado.cliente
  S.__win.scrollY = 222
  await ctx.abrirCobranza(COB)
  chk('cobranza: desde la cuenta de cliente y proveedor abre el detalle de la cobranza', S.estado.vista === 'ad-vista-cobranza' && S.estado.cobranza?.id === COB && S.estado.cobranza.origen === 'cuenta')
  chk('cobranza: apiló la cuenta', S.PILA_NAV.length === 1 && S.PILA_NAV[0].vista === 'ad-vista-cliente' && S.PILA_NAV[0].destino === 'ad-vista-cobranza')
  // "‹ Cuenta del cliente" ya va a la cuenta: queda el de siempre, sin flecha
  // (e2e/5-maqueta.spec.js lo toca; esconderlo dio rojo en GitHub el 14/10).
  chk('cobranza: queda "‹ Cuenta del cliente" (visible, con su texto)', el(S, 'ad-cobranza-volver').hidden === false && el(S, 'ad-cobranza-volver').textContent === '‹ Cuenta del cliente')
  chk('cobranza: y la flecha no (sería otro botón para lo mismo)', el(S, 'ad-volver').hidden === true && S.flechaVisible() === false && !el(S, 'ad-app').classList.contains('ad-app--pila'))
  S.volverDeCobranza()
  chk('cobranza: "‹ Cuenta del cliente" vuelve por la pila: la MISMA cuenta, sin releerla de cero', S.estado.vista === 'ad-vista-cliente' && S.estado.cliente === cliente && S.PILA_NAV.length === 0)
  chk('cobranza: con su scroll y su filtro', S.__win.scrollY === 222 && S.estado.cliente.unica.filtro === 'Cobranza')
  chk('cobranza: el historial queda en orden', JSON.stringify(nav(S).entradas()) === '[null]', JSON.stringify(nav(S).entradas()))
  chk('cobranza: y suelta la cobranza', S.estado.cobranza === null && S.estado.cobranzas.asentando === null)
  await ctx.abrirCobranza(COB)
  S.volverPila()
  chk('cobranza: volverPila (la pila) hace lo mismo', S.estado.vista === 'ad-vista-cliente' && S.__win.scrollY === 222 && S.estado.cobranza === null)
  // El botón de la cuenta de cliente (data-cuenta-cobranza) usa lo mismo.
  await S.abrirCobranzaDesdeCuenta(COB)
  chk('cobranza: abrirCobranzaDesdeCuenta apila', S.PILA_NAV.length === 1 && S.estado.vista === 'ad-vista-cobranza')
  S.alVolverNavegador({ state: null })
  chk('cobranza: el atrás del navegador vuelve a la cuenta', S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0)
  chk('cobranza: un id que no es uuid no abre nada', S.abrirCobranzaDesdeCuenta('o1') === undefined && S.estado.vista === 'ad-vista-cliente' && S.PILA_NAV.length === 0)
  S.estado.cliente.unica.filtro = ''
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }]])
  chk('cobranza: sin cobranzas:procesar / ver_todo, la cuenta no la ofrece', S.ctxCuentaUnica().abrirCobranza === null && S.abrirCobranzaDesdeCuenta(COB) === undefined && S.PILA_NAV.length === 0)
  S.pintarCliente()
  chk('cobranza: y el renglón no es link', !/cu-fila--link" data-cobranza-id/.test(el(S, 'ad-cuenta-unica').innerHTML) && /cu-fila--link" data-orden-retiro/.test(el(S, 'ad-cuenta-unica').innerHTML))
  S.estado.misTareas = new Map([['cobranzas:procesar', null]])
  S.pintarCliente()
  chk('orden: sin retiros:ver, ctx.abrirOrden es null y no hay link a la orden', S.ctxCuentaUnica().abrirOrden === null && !/cu-fila--link" data-orden-retiro/.test(el(S, 'ad-cuenta-unica').innerHTML))
})())

// "‹ Cuenta del cliente" sin la pila (la cobranza vino de otro lado): lo de siempre.
esperas.push((async () => {
  const S = nuevo()
  preparar(S)
  await S.abrirCliente('c2')
  await S.abrirCobranza(COB, { origen: 'cuenta', clienteOrigen: 'c1' })
  chk('sin pila: la cobranza no muestra la flecha y sí "‹ Cuenta del cliente"', S.PILA_NAV.length === 0 && el(S, 'ad-volver').hidden === true && el(S, 'ad-cobranza-volver').hidden === false)
  S.volverDeCobranza()
  await asentar()
  chk('sin pila: "‹ Cuenta del cliente" abre la cuenta de su cliente, como siempre', S.estado.vista === 'ad-vista-cliente' && S.estado.cliente.id === 'c1' && S.estado.cobranza === null)
  // Con la pila de una ORDEN arriba (no de la cobranza): tampoco usa la pila.
  await S.abrirOrdenDesde('o1')
  S.estado.cobranza = { id: COB, origen: 'lista' }
  S.volverDeCobranza()
  chk('pila de una orden: "‹ Cuenta del cliente" no vuelve por ella (va a donde iba siempre)', S.estado.vista === 'ad-vista-cobranzas', S.estado.vista)
  chk('la regla: la orden desde la cuenta sí muestra la flecha', S.propioVuelveAlMismoLugar({ vista: 'ad-vista-cliente', destino: 'ad-vista-orden' }) === false)
  chk('la regla: la orden desde la lista no', S.propioVuelveAlMismoLugar({ vista: 'ad-vista-ordenes', destino: 'ad-vista-orden' }) === true)
  chk('la regla: la cobranza desde la cuenta no', S.propioVuelveAlMismoLugar({ vista: 'ad-vista-cliente', destino: 'ad-vista-cobranza' }) === true)
  chk('la regla: la cobranza desde otro lado sí', S.propioVuelveAlMismoLugar({ vista: 'ad-vista-ordenes', destino: 'ad-vista-cobranza' }) === false)
})())

// ═══ 7. El cableado (estático) ═════════════════════════════════════════════
{
  const sinEspacios = (s) => s.replace(/\s+/g, ' ')
  const F = sinEspacios(FUENTE)
  chk('html: el botón "← Volver" existe, nace escondido, arriba del contenido', /<\/header> <!--[^]*?--> <button type="button" class="ad-volver-pila" id="ad-volver" hidden><span aria-hidden="true">←<\/span> Volver<\/button>/.test(F))
  chk('html: la flecha llama a volverPila', /getElementById\('ad-volver'\)\.addEventListener\('click', \(\) => volverPila\(\)\)/.test(F))
  chk('html: "‹ Órdenes" llama a volverAOrdenes', /getElementById\('ad-orden-volver'\)\.addEventListener\('click', \(\) => volverAOrdenes\(\)\)/.test(F))
  chk('html: el atrás del navegador llama a alVolverNavegador', /window\.addEventListener\('popstate', \(e\) => alVolverNavegador\(e\)\)/.test(F))
  chk('html: la lista de órdenes abre con abrirOrdenDesde', /const b = e\.target\.closest\('\[data-orden\]'\) if \(b\) abrirOrdenDesde\(b\.dataset\.orden\)/.test(F))
  chk('html: la cuenta de cliente abre la orden con abrirOrdenDesde', /closest\('\[data-orden-retiro\]'\) if \(r && puedeVerLaOrden\(\)\) abrirOrdenDesde\(r\.dataset\.ordenRetiro\)/.test(F))
  chk('html: la cobranza de la cuenta de cliente apila', /if \(b && estado\.cliente\) abrirCobranzaDesdeCuenta\(b\.dataset\.cuentaCobranza\)/.test(F))
  // Arreglos 30/10 (punto 6): antes, solo la retención en la ficha con la condición sin guardar.
  chk('html: mostrarVista vacía la pila al ir a otra vista', /function mostrarVista\(id\) \{ (\/\/[^\n]*? )*(if \(estado\.vista === 'ad-vista-ficha' && id !== 'ad-vista-ficha' && retenerEnFicha\(\(\) => mostrarVista\(id\)\)\) return )?if \(PILA_NAV\.length && PILA_NAV\[PILA_NAV\.length - 1\]\.destino !== id\) PILA_NAV\.length = 0/.test(sinEspacios(FUENTE.replace(/\/\/[^\n]*\n/g, ''))))
  chk('css: con la pila, se esconde el "‹ Volver" al dashboard', /\.ad-app--pila \.ad-header__volver \{ display: none; \}/.test(F))
  chk('css: la flecha tiene 44 px de alto (dedo)', /\.ad-volver-pila \{[^}]*min-height: 44px/.test(F))
  const C = sinEspacios(CSS)
  chk('css: el renglón link tiene cursor de link', /\.cu-fila--link \{[^}]*cursor: pointer/.test(C))
  chk('css: el renglón link ocupa todo el ancho y sin borde de botón', /\.cu-fila--link \{[^}]*width: 100%[^}]*border: 0; border-bottom: 1px solid var\(--color-divisor\)/.test(C))
  chk('css: "Ver la orden ›" con el color de link', /\.cu-fila__ver \{[^}]*color: var\(--naranja-oscuro\)/.test(C))
}

fin()
