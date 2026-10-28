// ADMINISTRACIÓN — DEVOLUCIONES Y REPOSICIONES EN UNA ORDEN (22/10/2026).
//
// orden_retiro_items.tipo: 'retiro' | 'devolucion' | 'reposicion' (con
// motivo_devolucion, lote_devuelto y destino_devuelto). En Administración:
//  - la lista y el detalle dicen el tipo de cada renglón (las devoluciones en
//    su sección) y las cajas de la orden no cuentan las devueltas;
//  - valorizar: la devolución al precio de lista, editable, con subtotal
//    NEGATIVO; la reposición en $ 0, sin campo de precio; un total negativo
//    es "a favor del cliente";
//  - la hoja (con precios) y la hoja "Dividir para facturar": la división ya
//    no filtra cant > 0 sino cant ≠ 0 (las devoluciones salen en negativo; la
//    reposición, en $ 0).
// Las reglas viven en la base (valorizar_orden_retiro y datos_division_orden,
// leídas con pg_get_functiondef el 23/10/2026): la pantalla muestra lo mismo.
//
//   node pruebas/test-administracion-devoluciones.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const CLIENTES = [{ id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', limite_credito: null, activo: true }]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }],
  marcas: [],
  insumos: [],
}
const ORDEN = { id: 'o1', numero: 31, codigo: 'N-0031', unidad_negocio_id: 'u-n', fecha: '2026-10-22', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-22T15:00:00Z', transporte: null, observaciones: null }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 1, unidades: 100, precio_caja: null, subtotal: null, tipo: 'retiro' },
  { id: 'i2', orden: 2, presentacion_id: 'pr1', marca_id: null, cajas: 2, unidades: 200, precio_caja: null, subtotal: null, tipo: 'devolucion',
    motivo_devolucion: 'Rotura', lote_devuelto: '6249', destino_devuelto: 'descarte' },
  { id: 'i3', orden: 3, presentacion_id: 'pr1', marca_id: null, cajas: 3, unidades: 300, precio_caja: null, subtotal: null, tipo: 'reposicion',
    motivo_devolucion: 'Humedad', lote_devuelto: null, destino_devuelto: 'stock' },
]
const VALORIZADOS = [
  { ...ITEMS[0], precio_caja: 1500, subtotal: 1500 },
  { ...ITEMS[1], precio_caja: 1500, subtotal: -3000 },
  { ...ITEMS[2], precio_caja: 0, subtotal: 0 },
]
const LOTES = [
  { presentacion_id: 'pr1', marca_id: null, lote: '7021-1', cajas: -1, orden_retiro_item_id: 'i1' },
  { presentacion_id: 'pr1', marca_id: null, lote: '7030-2', cajas: -3, orden_retiro_item_id: 'i3' },
]

function preparar(S, { orden = ORDEN, items = ITEMS, lotes = LOTES, precios = [] } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.cliente_movimientos = []
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
  S.__tablas.stock_terminado_movimientos = lotes
  S.estado.misTareas.set('stock:ver', { todas: true })
  S.__setRpc(async (n, p) => {
    if (n === 'precio_venta') { precios.push(p); return { data: { precio_unitario: 15, precio_caja: 1500, unidades_por_caja: 100, producto_unitario: 15, conito_unitario: 0, lista: 'Heladerías', sin_precio: false }, error: null } }
    return { data: null, error: null }
  })
}

// ── Los ayudantes ───────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('el tipo: retiro por defecto (un renglón viejo no trae tipo)', S.tipoItem({}) === 'retiro' && S.tipoItem({ tipo: 'devolucion' }) === 'devolucion' && S.tipoItem({ tipo: 'raro' }) === 'retiro')
  chk('las cajas que salen: la devolución no', S.cajasQueSalen({ cajas: 4, tipo: 'devolucion' }) === 0 && S.cajasQueSalen({ cajas: 4, tipo: 'reposicion' }) === 4 && S.cajasQueSalen({ cajas: 4 }) === 4)
  chk('lo que se valoriza: la devolución en NEGATIVO (como la base)', S.cantidadValorizable({ cajas: 2, tipo: 'devolucion' }) === -2 && S.cantidadValorizable({ cajas: 2 }) === 2)
  chk('el texto de la devolución', S.textoDevolucionItem(ITEMS[1]) === 'Devolución · Rotura · lote 6249 · se descartan' &&
    S.textoDevolucionItem(ITEMS[2]) === 'Se repone · Humedad · vuelven al stock')
  chk('"a favor del cliente" solo con total negativo', S.textoAFavor(-1) === ' · a favor del cliente' && S.textoAFavor(0) === '' && S.textoAFavor(10) === '' && S.textoAFavor(null) === '')
  chk('los lotes van por renglón cuando el movimiento lo anota', JSON.stringify(S.lotesDeRenglon(LOTES, ITEMS[0])) === JSON.stringify([{ lote: '7021-1', cajas: 1 }]) &&
    JSON.stringify(S.lotesDeRenglon(LOTES, ITEMS[2])) === JSON.stringify([{ lote: '7030-2', cajas: 3 }]))
  chk('un movimiento viejo (sin renglón) sigue yendo por presentación y cono',
    JSON.stringify(S.lotesDeRenglon([{ presentacion_id: 'pr1', marca_id: null, lote: 'V-1', cajas: -2 }], ITEMS[0])) === JSON.stringify([{ lote: 'V-1', cajas: 2 }]))
}

// ── La lista de órdenes ─────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S, { items: ITEMS.map(it => ({ ...it, orden_id: 'o1' })) })
  esperas.push(S.leerOrdenes('u-n', {}).then(lista => {
    const sel = S.__llamadas.consultas.find(c => c[0] === 'orden_retiro_items')?.[1]?.find(f => f[0] === 'select')?.[1] ?? ''
    chk('lee el tipo de cada renglón', /\btipo\b/.test(sel), sel)
    chk('las cajas de la orden no cuentan la devolución; las devueltas aparte', lista[0].cajas === 4 && lista[0].devueltas === 5, JSON.stringify(lista[0]))
    chk('la fila lo dice', /4 cajas · devolvió 5/.test(S.htmlFilaOrden(lista[0])))
    chk('una valorizada con total negativo: "a favor del cliente"', /a favor del cliente/.test(S.htmlFilaOrden({ ...lista[0], estado_valorizacion: 'valorizada', total: -1500 })))
  }))
}

// ── El detalle ──────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o1').then(() => {
    const sel = S.__llamadas.consultas.filter(c => c[0] === 'orden_retiro_items').map(c => c[1].find(f => f[0] === 'select')?.[1]).join(' ')
    chk('lee tipo, motivo, lote devuelto y destino', /tipo/.test(sel) && /motivo_devolucion/.test(sel) && /lote_devuelto/.test(sel) && /destino_devuelto/.test(sel))
    const selL = S.__llamadas.consultas.find(c => c[0] === 'stock_terminado_movimientos')?.[1]?.find(f => f[0] === 'select')?.[1] ?? ''
    chk('y el renglón de cada lote', /orden_retiro_item_id/.test(selL))
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    const iDev = h.indexOf('Devoluciones · 2')
    chk('las devoluciones en su sección, después del retiro', iDev > 0 && h.indexOf('1 cajas · Cucurucho grande') < iDev && h.indexOf('−2 cajas') > iDev)
    chk('el sello de cada tipo', /ad-sello--dev">Devolución</.test(h) && /ad-sello--dev">Reposición</.test(h))
    chk('la devolución: "−2 cajas", el motivo, el lote y qué se hizo (sin lotes de stock)', /−2 cajas · Cucurucho grande · Caja x 100/.test(h) && /Devolución · Rotura · lote 6249 · se descartan</.test(h))
    chk('la reposición: de qué lotes salió, por renglón', /Se repone · Humedad · vuelven al stock · sale de lotes 7030-2 \(3\)</.test(h))
    chk('el retiro: SOLO su lote (no se mezcla con la reposición del mismo producto)', /100 unidades · lotes 7021-1 \(1\)</.test(h))
  }))
}

// ── Valorizar ──────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const precios = []
  preparar(S, { precios })
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(async () => {
    const d = S.estado.orden
    chk('la devolución se propone al precio de la lista (positivo)', d.valorizar.precios.i2 === 1500)
    chk('la reposición va en 0 y no se le pide precio a la lista', d.valorizar.precios.i3 === 0 && precios.length === 1)
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('la devolución tiene su campo de precio (editable)', /data-precio="i2"/.test(h))
    chk('la reposición NO tiene campo de precio: "Se repone · $ 0"', !/data-precio="i3"/.test(h) && /<div>Se repone<\/div><div class="ad-fila__importe">\$\s0,00</.test(h))
    chk('el subtotal de la devolución es negativo', S.subtotalValorizar(d, ITEMS[1]) === -3000 && /data-subtotal="i2">\$\s-3\.000,00/.test(h))
    chk('el total: 1.500 − 3.000 = −1.500, "a favor del cliente"', S.totalValorizar(d) === -1500 && /Total \$\s-1\.500,00 · a favor del cliente/.test(h))
    chk('no avisa "faltan precios" por la reposición', S.faltanPrecios(d) === 0 && !/no están en la lista/.test(h))
    S.cambiarPrecio('i2', 1000)
    chk('corregir el precio de la devolución recalcula (−2.000)', S.subtotalValorizar(d, ITEMS[1]) === -2000 && S.totalValorizar(d) === -500)
    let params = null
    S.__setRpc(async (n, p) => { if (n === 'valorizar_orden_retiro') { params = p; return { data: { total: -500, moneda: 'ARS', saldo_cliente: -500, limite_credito: null, supera_limite: false }, error: null } } return { data: null, error: null } })
    await S.guardarValorizacion()
    chk('se mandan los precios POSITIVOS (la base resta la devolución) y la reposición en 0', params && params.p_precios.i1 === 1500 && params.p_precios.i2 === 1000 && params.p_precios.i3 === 0, JSON.stringify(params))
    chk('valorizar con total negativo no se frena en la pantalla', S.__llamadas.exitos.some(x => /N-0031 valorizada: \$\s-500,00/.test(x)))
  }))
}
{
  // Ya valorizada: el precio y el subtotal de la base; la reposición en $ 0.
  const S = nuevo()
  // La devolución cargada primero: la hoja la lleva a su sección.
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: -1500 }, items: [VALORIZADOS[1], VALORIZADOS[0], VALORIZADOS[2]] })
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['stock:ver', { todas: true }]])
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = S.__els.get('ad-orden-cuerpo').innerHTML
    chk('valorizada: la devolución con su subtotal negativo', /\$\s1\.500,00 x caja<\/div><div class="ad-fila__importe">\$\s-3\.000,00/.test(h))
    chk('valorizada: la reposición "Se repone · $ 0"', /<div>Se repone<\/div><div class="ad-fila__importe">\$\s0,00</.test(h))
    chk('valorizada con total negativo: "a favor del cliente"', /Total \$\s-1\.500,00 · a favor del cliente/.test(h))
    // La hoja con precios.
    const o = S.ordenParaHoja(S.estado.orden)
    chk('la hoja: los retiros primero y las devoluciones después', o.renglones.map(r => r.movimiento).join() === 'retiro,devolucion,reposicion')
    chk('la hoja lleva el motivo, el lote y el destino', o.renglones[1].motivo === 'Rotura' && o.renglones[1].loteDevuelto === '6249' && o.renglones[2].destino === 'stock')
    const hoja = S.htmlHoja(o, { conPrecios: true })
    chk('la hoja impresa: DEVOLUCIONES, "−2", el subtotal negativo, la reposición en $ 0 y "a favor"',
      /DEVOLUCIONES/.test(hoja) && /rh-cajas">−2</.test(hoja) && /\$\s-3\.000,00/.test(hoja) && /Se repone<\/td><td class="rh-num rh-plata">\$\s0,00/.test(hoja) && /a favor del cliente/.test(hoja))
  }))
}

// ── "Dividir para facturar": cant ≠ 0 ───────────────────────────────────────
// Como lo devuelve datos_division_orden (23/10/2026): la devolución con
// cantidad, cant_a, cant_b y subtotales NEGATIVOS; la reposición en precio 0.
const DATOS = {
  orden_id: 'o1', codigo: 'N-0031', fecha: '2026-10-22', cliente: 'Distribuidora Anatolia', cliente_cuit: '30712345678', pct_a: 50, pct_b: 50,
  items: [
    { orden: 1, tipo: 'retiro', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 1500, cantidad: 10, cant_a: 5, cant_b: 5, subtotal_a: 7500, subtotal_b: 7500 },
    { orden: 2, tipo: 'devolucion', descripcion: 'Devolución: Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 1500, cantidad: -3, cant_a: -1, cant_b: -2, subtotal_a: -1500, subtotal_b: -3000 },
    { orden: 3, tipo: 'reposicion', descripcion: 'Reposición: Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 0, cantidad: 1, cant_a: 0, cant_b: 1, subtotal_a: 0, subtotal_b: 0 },
  ],
  subtotal_a: 6000, comisiones: [], comision_pct_total: 0, comision_total: 0, total_a: 6000, subtotal_b: 4500, total_b: 4500, total_orden: -100, guardada: false, facturas: [],
}
{
  const S = nuevo()
  const ra = S.renglonesParte(DATOS, 'A')
  const rb = S.renglonesParte(DATOS, 'B')
  chk('la A: el retiro y la devolución en negativo (la reposición tiene 0 en la A)', ra.length === 2 && ra[1].cantidad === -1 && ra[1].subtotal === -1500)
  chk('la B: los tres, la reposición en $ 0', rb.length === 3 && rb[1].cantidad === -2 && rb[2].subtotal === 0)
  chk('un renglón sin cantidad no sale', S.renglonesParte({ items: [{ cant_a: null }, { cant_a: 'x' }, { cant_a: 0 }] }, 'A').length === 0)
  // Cada punto es su propia orden de pedido (28/10/2026): la del N2.
  const b = S.htmlHojaPunto(DATOS, 'B')
  chk('la hoja del N2: la devolución en negativo', /Devolución: Cucurucho grande · Caja x 100<\/td><td[^>]*>-2 cajas<\/td><td[^>]*>\$\s1\.500,00<\/td><td[^>]*>\$\s-3\.000,00/.test(b))
  chk('y la reposición en $ 0', /Reposición: Cucurucho grande · Caja x 100<\/td><td[^>]*>1 caja<\/td><td[^>]*>\$\s0,00<\/td><td[^>]*>\$\s0,00/.test(b))
  chk('un TOTAL negativo: "a favor del cliente"', /TOTAL: \$\s-100,00 · a favor del cliente/.test(S.htmlHojaPunto({ ...DATOS, total_b: -100 }, 'B')))
  chk('la descripción de la base se escapa', !/<b>/.test(S.htmlHojaPunto({ ...DATOS, items: [{ ...DATOS.items[1], descripcion: 'Devolución: <b>x</b>' }] }, 'B')))
}

fin()
