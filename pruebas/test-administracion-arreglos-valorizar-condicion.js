// ARREGLOS DE LA AUDITORÍA DEL 30/10/2026 — VALORIZAR Y LA CONDICIÓN DE VENTA
// (31/10/2026, puntos 1 y 6 del pedido de Facu). Se EJECUTAN las funciones
// reales de modulos/administracion.html:
//  1a) Revalorizar una orden que ya tenía condiciones especiales sin poder
//      leerlas (falla la lectura de las condiciones, o la de antes que impide
//      dibujar los tildes): NO va p_condiciones: [] (la base le borraría las
//      condiciones a la orden: valorizar_con_condiciones guarda
//      nullif(p_condiciones, '{}')). Guardar queda bloqueado con "No se
//      pudieron leer las condiciones especiales; reintentá" y "Volver a leer
//      las condiciones" las trae sin perder los precios. Sin condiciones
//      previas, [] = sin cambios: se puede guardar.
//  1b) El bulto de 30 kg a $ 17.500 con una condición (precio_lista 583,33 y
//      el subtotal descontado) se propone en 17.500,00, no en 17.499,90.
//  1c) Una condición que la orden tenía y hoy está desactivada se lee igual
//      (p_solo_activas false), se muestra tildada con "(desactivada)" y un
//      aviso, y viaja si sigue tildada.
//  6)  En la pantalla de facturar, "cliente sin condición" sale de
//      clientes.pct_parte_a leído de la base EN ESE MOMENTO (no de la lista
//      del celular); si no se pudo leer, ni el aviso ni el tilde. Y si falla
//      guardar la condición al salir de la ficha, la ficha no se cierra y
//      muestra el error.
//
//   node pruebas/test-administracion-arreglos-valorizar-condicion.js
'use strict'

const path = require('path')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = leer(ARCHIVO)
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)
const nb = (t) => String(t ?? '').replace(/ /g, ' ')
const json = (x) => JSON.stringify(x)
const vaciar = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)) }
const el = (S, id) => S.__doc.getElementById(id)
const rpcDe = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
const AVISO = 'No se pudieron leer las condiciones especiales; reintentá'

// ── Valorizar (puntos 1a, 1b y 1c) ─────────────────────────────────────────
const CAT = {
  productos: [{ id: 'p-bar', nombre: 'Barquillo 40 x4', activo: true }],
  presentaciones: [{ id: 'pr-bar-con', producto_id: 'p-bar', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 252 }],
  marcas: [{ id: 'm-cas', nombre: 'CASERATO' }],
  insumos: [{ id: 'harina30', nombre: 'Harina 0000', marca: 'Wali', unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido: 30 }],
}
const CLIENTES = [{ id: 'c1', nombre: 'Heladería Sur', lista_precio_id: 'l1', limite_credito: null, activo: true, unidad_negocio_id: 'u-n', pct_parte_a: null }]
const ORDEN = { id: 'o9', numero: 9, codigo: 'N-0009', unidad_negocio_id: 'u-n', fecha: '2026-10-30', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 152117.78, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', transporte: null, observaciones: null,
  condiciones_especiales: ['k1'], division_pct_a: null }
// Valorizada con k1 (5 % a CASERATO): precio_lista el de lista, precio_caja el descontado.
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 3, unidades: 756, precio_caja: 34039.26, subtotal: 102117.78,
    precio_lista: 35830.8, descuento_pct: 5, condicion_id: 'k1', lote: null },
]
const CONDS = [
  { id: 'k1', nombre: 'Caserato', descuento_pct: 5, activa: true, marcas: [{ id: 'm-cas', nombre: 'CASERATO' }], productos: [], alcance: 'conos: CASERATO' },
  { id: 'k2', nombre: 'Venta a Ostera', descuento_pct: 5, activa: true, marcas: [], productos: [], alcance: 'toda la orden' },
  { id: 'k4', nombre: 'Promo vieja', descuento_pct: 10, activa: false, marcas: [], productos: [], alcance: 'toda la orden' },
  { id: 'k5', nombre: 'Otra vieja', descuento_pct: 20, activa: false, marcas: [], productos: [], alcance: 'toda la orden' },
]

function preparar(S, { orden = ORDEN, items = ITEMS, rpc = null, movimientos = [] } = {}) {
  S.estado.empresaId = 'u-n'
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.cliente_movimientos = movimientos
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Manuel' }]
  S.__tablas.listas_precios = [{ id: 'l1', unidad_negocio_id: 'u-n' }]
  S.__setRpc(async (n, p) => {
    if (rpc) { const r = await rpc(n, p); if (r) return r }
    if (n === 'condiciones_especiales_cliente') return { data: CONDS.filter(k => p.p_solo_activas === false || k.activa), error: null }
    if (n === 'valorizar_con_condiciones') return { data: { total: 1, moneda: 'ARS' }, error: null }
    return { data: null, error: null }
  })
}
const cuerpo = (S) => nb(S.__els.get('ad-orden-cuerpo').innerHTML)
const condicionesMandadas = (S) => rpcDe(S, 'valorizar_con_condiciones').map(r => r[1].p_condiciones)

// 1a: falla la lectura de las condiciones al revalorizar una orden que las tenía.
{
  const S = nuevo()
  let falla = true
  preparar(S, { rpc: async (n) => n === 'condiciones_especiales_cliente' && falla ? { data: null, error: { message: 'sin red' } } : null })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    const v = S.estado.orden.valorizar
    chk('1a: sin leer las condiciones queda marcado', v.condicionesSinLeer === true)
    let h = cuerpo(S)
    chk('1a: el aviso "No se pudieron leer las condiciones especiales; reintentá"', h.includes(`data-condiciones-sin-leer>${AVISO}</div>`), h.slice(0, 400))
    chk('1a: Guardar apagado', /id="ad-valorizar-guardar" disabled>/.test(h))
    chk('1a: con el botón para volver a leerlas', h.includes('id="ad-valorizar-releer-condiciones">Volver a leer las condiciones</button>'))
    await S.guardarValorizacion()
    chk('1a: Guardar NO manda p_condiciones vacío (no llama a la base)', !rpcDe(S, 'valorizar_con_condiciones').length, json(condicionesMandadas(S)))
    chk('1a: …y lo dice al lado de Guardar', S.estado.orden.valorizar.errorGuardar === AVISO)
    // Reintentar: ahora la base contesta.
    falla = false
    S.cambiarPrecio('i1', 36000)
    await S.releerCondicionesValorizar()
    h = cuerpo(S)
    chk('1a: volver a leer trae los tildes (la de la orden tildada)', /data-condicion-valorizar="k1" checked>/.test(h) && !h.includes('data-condiciones-sin-leer'))
    chk('1a: …sin perder el precio escrito', S.estado.orden.valorizar.precios.i1 === 36000)
    chk('1a: …y Guardar se prende', /id="ad-valorizar-guardar">/.test(h))
    await S.guardarValorizacion()
    chk('1a: ahora sí manda las condiciones de la orden', json(condicionesMandadas(S)) === json([['k1']]), json(condicionesMandadas(S)))
  }))
}
{
  // Falla una lectura de ANTES (el saldo del cliente): tampoco hay tildes.
  const S = nuevo()
  preparar(S, { movimientos: () => ({ data: null, error: { message: 'sin red' } }) })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    chk('1a: falla el saldo → sin tildes y bloqueado', S.estado.orden.valorizar.condicionesSinLeer === true && S.bloqueoCondicionesValorizar(S.estado.orden) === AVISO)
    await S.guardarValorizacion()
    chk('1a: …no manda p_condiciones vacío', !rpcDe(S, 'valorizar_con_condiciones').length)
  }))
}
{
  // Una orden SIN condiciones previas: [] es "sin cambios", se puede guardar.
  const S = nuevo()
  const items = [{ ...ITEMS[0], precio_caja: 35830.8, subtotal: 107492.4, precio_lista: null, descuento_pct: null, condicion_id: null }]
  preparar(S, { orden: { ...ORDEN, condiciones_especiales: null }, items, rpc: async (n) => n === 'condiciones_especiales_cliente' ? { data: null, error: { message: 'sin red' } } : null })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    chk('1a: sin condiciones previas no bloquea', S.bloqueoCondicionesValorizar(S.estado.orden) === null && !cuerpo(S).includes('data-condiciones-sin-leer'))
    await S.guardarValorizacion()
    chk('1a: …y manda [] (lo mismo que tenía)', json(condicionesMandadas(S)) === json([[]]))
  }))
}
{
  chk('1a: el aviso es el texto de Facu', S0().AVISO_CONDICIONES_SIN_LEER === AVISO)
  function S0() { return nuevo() }
}

// 1b: el bulto de 17.500 con una condición queda en 17.500,00.
{
  const S = nuevo()
  const items = [{ id: 'i3', orden: 1, presentacion_id: null, marca_id: null, cajas: null, unidades: null, insumo_id: 'harina30', cantidad: 90, lote: null,
    precio_lista: 583.33, precio_caja: 554.16, subtotal: 49874.4, descuento_pct: 5, condicion_id: 'k2' }]
  preparar(S, { orden: { ...ORDEN, total: 49874.4, condiciones_especiales: ['k2'] }, items })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    const v = S.estado.orden.valorizar
    chk('1b: la bolsa de 30 kg con condición se propone en 17.500 (no 17.499,90)', v.escritos.i3 === 17500, json(v.escritos))
    chk('1b: …y a la base va 17.500 / 30 por kg', v.precios.i3 === S.precioABase(17500, v.modos.i3), json(v.precios))
    await S.guardarValorizacion()
    const p = rpcDe(S, 'valorizar_con_condiciones')[0]?.[1]
    chk('1b: se manda el de lista de 17.500 y la condición', p && p.p_precios.i3 === S.precioABase(17500, v.modos.i3) && json(p.p_condiciones) === json(['k2']), json(p))
  }))
  const modo = { porBulto: true, contenido: 30 }
  chk('1b: con precio_lista no se usa el subtotal descontado', json(S.opcionesBultoGuardado({ precio_lista: '583.33', subtotal: 49874.4, cantidad: 90 })) === json({ decimalesBase: 2 }))
  chk('1b: sin precio_lista, con su subtotal (como antes)', json(S.opcionesBultoGuardado({ precio_lista: null, subtotal: 52499.7, cantidad: 90 })) === json({ decimalesBase: 2, subtotal: 52499.7, cantidad: 90 }))
  chk('1b: 583,33 el kg en bolsa de 30 → 17.500,00 exacto', S.precioDesdeBase(583.33, modo, S.opcionesBultoGuardado({ precio_lista: 583.33, subtotal: 49874.4, cantidad: 90 })) === 17500)
}

// 1c: la condición desactivada que la orden tenía.
{
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, condiciones_especiales: ['k1', 'k4'] } })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    const pide = rpcDe(S, 'condiciones_especiales_cliente').filter(r => r[1].p_cliente_id === 'c1')
    chk('1c: con condiciones previas se leen también las inactivas', pide.some(r => r[1].p_solo_activas === false), json(pide))
    const h = cuerpo(S)
    chk('1c: la desactivada sale tildada con "(desactivada)"', /data-condicion-valorizar="k4" checked><span>Promo vieja \(−10 %\) \(desactivada\)<span/.test(h), h.slice(h.indexOf('ad-esp-valorizar'), h.indexOf('ad-esp-valorizar') + 900))
    chk('1c: …con el aviso', h.includes('data-condicion-desactivada>La orden tenía la condición «Promo vieja», que hoy está desactivada: sigue tildada y se descuenta. Destildala si ya no va.</div>'))
    chk('1c: la activa, sin "(desactivada)"', /data-condicion-valorizar="k1" checked><span>Caserato \(−5 %\)<span/.test(h))
    chk('1c: las otras inactivas que la orden no tenía no aparecen', !h.includes('data-condicion-valorizar="k5"') && !h.includes('Otra vieja'))
    chk('1c: el total la sigue descontando (10 % a toda la orden)', S.precioEfectivoValorizar(S.estado.orden, ITEMS[0]) === S.precioConDescuento(35830.8, 10))
    await S.guardarValorizacion()
    chk('1c: tildada, viaja (no se saca en silencio)', json(condicionesMandadas(S)) === json([['k1', 'k4']]), json(condicionesMandadas(S)))
  }))
}
{
  // Destildarla: no viaja, pero sigue a la vista para volver a tildarla.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, condiciones_especiales: ['k4'] } })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    S.elegirCondicionValorizar('k4', false)
    const h = cuerpo(S)
    chk('1c: destildada sigue en la lista, sin tilde', /data-condicion-valorizar="k4"><span>Promo vieja/.test(h))
    await S.guardarValorizacion()
    chk('1c: destildada no viaja', json(condicionesMandadas(S)) === json([[]]))
  }))
}
{
  // Sin condiciones previas se siguen leyendo solo las activas.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'pendiente', total: 0, condiciones_especiales: null },
    items: [{ ...ITEMS[0], precio_caja: null, subtotal: null, precio_lista: null, descuento_pct: null, condicion_id: null }] })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(() => {
    const pide = rpcDe(S, 'condiciones_especiales_cliente')
    chk('1c: una orden nueva lee solo las activas', pide.length === 1 && pide[0][1].p_solo_activas === true, json(pide))
    chk('1c: …y la inactiva no aparece', !cuerpo(S).includes('data-condicion-valorizar="k4"') && !cuerpo(S).includes('data-condicion-desactivada'))
  }))
}
{
  // Escapa el nombre de la desactivada en el aviso.
  const S = nuevo()
  const h = S.htmlDesactivadasValorizar([{ id: 'x', nombre: '<img src=x onerror=alert(1)>', activa: false, descuento_pct: 5 }])
  chk('1c: el aviso escapa el nombre', h.includes('«&lt;img src=x onerror=alert(1)&gt;»') && !h.includes('<img'))
  chk('1c: dos desactivadas: en plural', S.htmlDesactivadasValorizar([{ nombre: 'A', activa: false }, { nombre: 'B', activa: false }]).includes('las condiciones «A», «B», que hoy están desactivadas'))
  chk('1c: ninguna desactivada: nada', S.htmlDesactivadasValorizar([{ nombre: 'A', activa: true }]) === '')
}

// ── 6) La pantalla de facturar: "sin condición" sale de la base ─────────────
const ORDEN_F = { id: 'o36', numero: 36, codigo: 'N-0036', unidad_negocio_id: 'u-n', fecha: '2026-10-28', estado: 'confirmada', estado_valorizacion: 'valorizada',
  total: 13000, moneda: 'ARS', cliente_id: 'c-pepe', cargada_por: 'emp-9', cargada_en: '2026-10-28T12:00:00Z', transporte: null, observaciones: null,
  comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: null }
const CAT_F = { productos: [{ id: 'p1', nombre: 'Cucurucho grande' }], presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }], marcas: [], insumos: [] }
const ITEMS_F = [{ id: 'f1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 2, unidades: 200, precio_caja: 6500, subtotal: 13000, lote: null }]
const VENDEDORES = [{ id: 'v1', nombre: 'Vendedor 1', orden: 1, pct_defecto: 2 }, { id: 'v2', nombre: 'Vendedor 2', orden: 2, pct_defecto: 3 }, { id: 'v3', nombre: 'Vendedor 3', orden: 3, pct_defecto: 4 }]

function datosDivision(pct) {
  const ca = Math.floor(2 * pct / 100)
  return { orden_id: 'o36', codigo: 'N-0036', fecha: '2026-10-28', cliente: 'Kiosco Pepe', cliente_cuit: null, pct_a: pct, pct_b: 100 - pct,
    items: [{ orden: 1, tipo: 'retiro', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 6500, cantidad: 2, cant_a: ca, cant_b: 2 - ca, subtotal_a: ca * 6500, subtotal_b: (2 - ca) * 6500 }],
    subtotal_a: ca * 6500, comisiones: VENDEDORES.map(v => ({ vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: v.pct_defecto, monto: 0 })), comision_pct_total: 9, comision_total: 0,
    total_a: ca * 6500, subtotal_b: (2 - ca) * 6500, total_b: (2 - ca) * 6500, total_orden: 13000, guardada: false, facturas: [] }
}
// `listaPct`: lo que dice la lista de clientes del celular; `basePct`: lo que hay en la base.
function prepararF(S, { listaPct, basePct, falla = false } = {}) {
  S.estado.empresaId = 'u-n'
  S.estado.clientes = [{ id: 'c-pepe', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista_precio_id: 'l1', activo: true, pct_parte_a: listaPct }]
  S.estado.catalogo = CAT_F
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [{ ...ORDEN_F }]
  S.__tablas.orden_retiro_items = ITEMS_F.map(it => ({ ...it }))
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Yanina' }]
  S.__tablas.vendedores_comision = VENDEDORES
  S.__tablas.cliente_comisiones = []
  S.__tablas.orden_facturas = []
  S.__tablas.clientes = (f) => falla ? { data: null, error: { message: 'sin red' } }
    : { data: [{ id: 'c-pepe', pct_parte_a: basePct }].filter(c => f.some(x => x[0] === 'eq' && x[1] === 'id' && x[2] === c.id)), error: null }
  S.__setRpc(async (n, p) => {
    if (n === 'datos_division_orden' || n === 'guardar_division_orden') return { data: datosDivision(p.p_pct_a), error: null }
    return { data: null, error: null }
  })
}
const htmlEl = (S, id) => el(S, id).innerHTML
const leyoCliente = (S) => S.__llamadas.consultas.filter(c => c[0] === 'clientes' && c[1].some(f => f[0] === 'select' && /pct_parte_a/.test(f[1])) && c[1].some(f => f[0] === 'eq' && f[1] === 'id' && f[2] === 'c-pepe'))

{
  // La lista dice "sin condición", pero en la base ya tiene 40: no hay aviso ni tilde, abre en 40.
  const S = nuevo()
  prepararF(S, { listaPct: null, basePct: '40.00' })
  esperas.push(S.abrirOrden('o36').then(vaciar).then(() => {
    chk('6: lee clientes.pct_parte_a del cliente en la base', leyoCliente(S).length === 1, json(S.__llamadas.consultas.filter(c => c[0] === 'clientes')))
    chk('6: la lista vieja dice sin condición y la base 40: sin el aviso de "sin condición"', !htmlEl(S, 'ad-fc-sin-condicion').includes('data-fc-sin-condicion'), htmlEl(S, 'ad-fc-sin-condicion'))
    chk('6: …ni el tilde de guardarla', el(S, 'ad-fc-cliente').hidden === true && S.estado.facturar.clienteSinCondicion === false)
    chk('6: …abre con el 40 de la base', S.estado.facturar.pctA === 40 && el(S, 'ad-fc-otro').value === '40', String(S.estado.facturar.pctA))
    chk('6: …y la lista de clientes queda al día (copia)', S.clienteDe('c-pepe').pct_parte_a === 40)
  }))
}
{
  // La lista dice 40 (vieja), pero en la base ya no tiene condición: el aviso y el tilde.
  const S = nuevo()
  prepararF(S, { listaPct: 40, basePct: null })
  esperas.push(S.abrirOrden('o36').then(vaciar).then(() => {
    chk('6: la lista dice 40 y la base null: el aviso de "sin condición"', htmlEl(S, 'ad-fc-sin-condicion').includes('data-fc-sin-condicion'), htmlEl(S, 'ad-fc-sin-condicion'))
    chk('6: …el tilde para guardarla', el(S, 'ad-fc-cliente').hidden === false && S.estado.facturar.clienteSinCondicion === true)
    chk('6: …y N1 / N2 vacíos (no el 40 de la lista vieja)', S.estado.facturar.pctA === null && !rpcDe(S, 'datos_division_orden').length)
  }))
}
{
  // No se pudo leer el cliente: ni "sin condición" ni el tilde.
  const S = nuevo()
  prepararF(S, { listaPct: null, basePct: null, falla: true })
  esperas.push(S.abrirOrden('o36').then(vaciar).then(() => {
    const h = htmlEl(S, 'ad-fc-sin-condicion')
    chk('6: lectura fallida: sin el aviso de "sin condición"', !h.includes('data-fc-sin-condicion') && !h.includes('no tiene condición de venta'), h)
    chk('6: …dice que no se pudo leer', h.includes('data-fc-cliente-sin-leer>No se pudo leer la condición de venta del cliente'), h)
    chk('6: …sin el tilde', el(S, 'ad-fc-cliente').hidden === true && S.estado.facturar.clienteSinCondicion === null)
    S.marcarGuardarCliente(true)
    chk('6: …y tildarlo igual no hace nada', !S.estado.facturar.cliente.marcado)
    S.escribirPctFacturar(30)
    chk('6: escribir el % igual funciona', S.estado.facturar.pctA === 30)
  }))
}
{
  // La base no devuelve el cliente: tampoco se sabe; ni aviso ni tilde.
  const S = nuevo()
  prepararF(S, { listaPct: null, basePct: null })
  S.__tablas.clientes = []
  esperas.push(S.abrirOrden('o36').then(vaciar).then(() => {
    chk('6: sin la fila del cliente: ni "sin condición" ni tilde', !htmlEl(S, 'ad-fc-sin-condicion').includes('data-fc-sin-condicion') &&
      htmlEl(S, 'ad-fc-sin-condicion').includes('data-fc-cliente-sin-leer') && el(S, 'ad-fc-cliente').hidden === true)
  }))
}
{
  // Mientras se lee, tampoco: el aviso y el tilde esperan a la base.
  const S = nuevo()
  prepararF(S, { listaPct: null, basePct: null })
  let soltar
  S.__tablas.clientes = () => new Promise(r => { soltar = () => r({ data: [{ id: 'c-pepe', pct_parte_a: null }], error: null }) })
  esperas.push(S.abrirOrden('o36').then(async () => {
    await vaciar()
    chk('6: mientras se lee el cliente: ni aviso ni tilde', !htmlEl(S, 'ad-fc-sin-condicion').includes('data-fc-sin-condicion') && el(S, 'ad-fc-cliente').hidden === true)
    soltar()
    await vaciar()
    chk('6: leído (sin condición en la base): ahora sí', htmlEl(S, 'ad-fc-sin-condicion').includes('data-fc-sin-condicion') && el(S, 'ad-fc-cliente').hidden === false)
  }))
}

// ── 6) Si falla guardar la condición al salir, la ficha no se cierra ──────
function prepararFicha(S, cliente = { id: 'c1', nombre: 'Anatolia', pct_parte_a: 30 }) {
  S.estado.vista = 'ad-vista-ficha'
  S.estado.ficha = { id: cliente.id, original: cliente, condicion: { error: null, enviando: false, vendedores: S.filasVendedoresFicha(VENDEDORES, {}), errorVendedores: null } }
  S.llenarCondicionVenta(cliente)
}
{
  const S = nuevo()
  prepararFicha(S)
  S.__setRpc(async (n) => n === 'guardar_condicion_venta_cliente' ? { data: null, error: { message: 'No tenés permiso sobre este cliente.' } } : { data: null, error: null })
  el(S, 'ad-f-pct-a').value = '20'
  S.marcarCondicionTocada()
  el(S, 'ad-vista-clientes').hidden = true
  S.mostrarVista('ad-vista-clientes')
  chk('6: salir con la condición sin guardar: todavía en la ficha', S.estado.vista === 'ad-vista-ficha')
  esperas.push(vaciar().then(() => {
    chk('6: falla el guardado: la ficha NO se cierra', S.estado.vista === 'ad-vista-ficha' && el(S, 'ad-vista-ficha').hidden !== true && el(S, 'ad-vista-clientes').hidden !== false, S.estado.vista)
    chk('6: …muestra el error al lado del botón', el(S, 'ad-f-condicion-error').textContent === 'No tenés permiso sobre este cliente.' && el(S, 'ad-f-condicion-error').hidden === false)
    chk('6: …y el aviso de arriba', S.__llamadas.errores.includes('No se guardó la condición de venta de Anatolia: No tenés permiso sobre este cliente.'), json(S.__llamadas.errores))
    chk('6: …lo escrito sigue sin guardar (se puede reintentar)', S.condicionSinGuardar(S.estado.ficha) === true && el(S, 'ad-f-pct-a').value === '20')
  }))
}
{
  // Bien guardada: recién ahí se va a donde se iba.
  const S = nuevo()
  prepararFicha(S)
  S.__setRpc(async () => ({ data: null, error: null }))
  el(S, 'ad-f-pct-a').value = '45'
  S.marcarCondicionTocada()
  S.mostrarVista('ad-vista-clientes')
  esperas.push(vaciar().then(() => {
    chk('6: guardada bien: sale a donde iba', S.estado.vista === 'ad-vista-clientes' && rpcDe(S, 'guardar_condicion_venta_cliente').length === 1)
    chk('6: …y la ficha quedó escondida', el(S, 'ad-vista-ficha').hidden === true && el(S, 'ad-vista-clientes').hidden === false)
  }))
}
{
  // Un % que no sirve: no llama, no sale y lo muestra.
  const S = nuevo()
  prepararFicha(S)
  S.cambiarVendedorFicha('v2', 120)
  S.mostrarVista('ad-vista-inicio')
  esperas.push(vaciar().then(() => {
    chk('6: inválida al salir: no llama y no sale', !rpcDe(S, 'guardar_condicion_venta_cliente').length && S.estado.vista === 'ad-vista-ficha')
    chk('6: …con el error en la ficha', el(S, 'ad-f-condicion-error').textContent === 'Las comisiones van de 0 a 100.' && el(S, 'ad-f-condicion-error').hidden === false)
  }))
}
{
  // Abrir OTRA ficha con la condición que no se pudo guardar: se queda en esta.
  const S = nuevo()
  prepararFicha(S)
  S.__setRpc(async (n) => n === 'guardar_condicion_venta_cliente' ? { data: null, error: { message: 'Sin conexión.' } } : { data: null, error: null })
  el(S, 'ad-f-pct-a').value = '20'
  S.marcarCondicionTocada()
  esperas.push(S.abrirFicha('c2').then(vaciar).then(() => {
    chk('6: otra ficha con la condición sin guardar y falla: sigue la de Anatolia', S.estado.ficha.id === 'c1' && S.estado.vista === 'ad-vista-ficha')
    chk('6: …con el error', el(S, 'ad-f-condicion-error').textContent === 'Sin conexión.')
  }))
}
{
  // Un guardado ya en camino (el botón): al volver bien, sigue; sin un segundo envío.
  const S = nuevo()
  prepararFicha(S)
  let soltar
  S.__setRpc((n) => n === 'guardar_condicion_venta_cliente' ? new Promise(r => { soltar = () => r({ data: null, error: null }) }) : Promise.resolve({ data: null, error: null }))
  el(S, 'ad-f-pct-a').value = '45'
  S.marcarCondicionTocada()
  const enCamino = S.guardarCondicionVenta()
  S.mostrarVista('ad-vista-clientes')
  chk('6: con un guardado en camino no sale todavía', S.estado.vista === 'ad-vista-ficha')
  esperas.push(vaciar().then(async () => {
    soltar()
    await enCamino
    await vaciar()
    chk('6: …al volver bien, sale (una sola llamada)', S.estado.vista === 'ad-vista-clientes' && rpcDe(S, 'guardar_condicion_venta_cliente').length === 1, S.estado.vista)
  }))
}
{
  // Sin cambios en la condición, salir es inmediato.
  const S = nuevo()
  prepararFicha(S)
  S.mostrarVista('ad-vista-inicio')
  chk('6: sin cambios, salir es en el momento', S.estado.vista === 'ad-vista-inicio' && !rpcDe(S, 'guardar_condicion_venta_cliente').length)
}

fin(esperas)
