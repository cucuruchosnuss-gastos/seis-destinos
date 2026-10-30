// VALORIZAR MÁS LEGIBLE (30/10/2026, rama ci-prueba/valorizar-legible, pedido
// de Facu). Se EJECUTAN las funciones reales:
//  - El nombre del renglón al valorizar, en el detalle de la orden y en las
//    hojas N1 / N2: "Barquillo 40 x4 · Caja con cono × 252 u. · VENEZIA" y
//    "Soft · Caja sin cono × 224 u." (las unidades en negrita, con
//    textoUnidadesRemito de js/remitos-comun.js; sin el "· Sin cono" final).
//  - El descuento del cono: al valorizar, si precio_venta trae descuento_pct,
//    su precio_caja va tal cual y al lado "(−5 % CASERATO · antes $ 35.830,80)"
//    (letra chica, color normal); la orden valorizada, "(−5 %)" con
//    orden_retiro_items.descuento_pct.
//  - La caja con cono en Listas: la misma cuenta que precio_venta, sin
//    redondear el precio por unidad en el medio (23.990,80 y no 23.990,82).
//
//   node pruebas/test-administracion-valorizar-legible.js
'use strict'

const path = require('path')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)
const nb = (t) => String(t ?? '').replace(/\u00a0/g, ' ')
const json = (x) => JSON.stringify(x)

const CAT = {
  productos: [{ id: 'p-bar', nombre: 'Barquillo 40 x4' }, { id: 'p-soft', nombre: 'Soft' }, { id: 'p-cuc', nombre: 'Cucurucho grande' }, { id: 'p-cono', nombre: 'Cono de papel' }],
  presentaciones: [
    { id: 'pr-bar-con', producto_id: 'p-bar', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 252 },
    { id: 'pr-soft-sin', producto_id: 'p-soft', nombre: 'Caja sin cono', con_cono: false, unidades_por_caja: 224 },
    { id: 'pr-cuc-100', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr-soft-grande', producto_id: 'p-soft', nombre: 'Caja grande', con_cono: false, unidades_por_caja: 1600 },
    { id: 'pr-cono-1', producto_id: 'p-cono', nombre: 'Por cono', con_cono: true, unidades_por_caja: 1, sin_stock: true },
  ],
  marcas: [{ id: 'm-ven', nombre: 'VENEZIA' }, { id: 'm-cas', nombre: 'CASERATO' }],
  insumos: [],
}
const CLIENTES = [{ id: 'c1', nombre: 'Heladería Sur', lista_precio_id: 'l1', limite_credito: null, activo: true }]
const ORDEN = { id: 'o9', numero: 9, codigo: 'N-0009', unidad_negocio_id: 'u-n', fecha: '2026-10-30', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', transporte: null, observaciones: null }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 3, unidades: 756, precio_caja: null, subtotal: null, lote: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr-soft-sin', marca_id: null, cajas: 2, unidades: 448, precio_caja: null, subtotal: null, lote: null },
]
const PV = {
  // Con descuento del cono: precio_caja YA viene con el descuento.
  'pr-bar-con': { precio_unitario: 135.0748, precio_caja: 34039.26, precio_caja_sin_descuento: 35830.8, descuento_pct: 5, unidades_por_caja: 252,
    producto_unitario: 130.1, conito_unitario: 4.97, papel_conito: 'comun', lista: 'Mayoristas', recargo_pct: 0, sin_precio: false },
  'pr-soft-sin': { precio_unitario: 100, precio_caja: 22400, unidades_por_caja: 224, producto_unitario: 100, conito_unitario: 0, papel_conito: null,
    lista: 'Mayoristas', recargo_pct: 0, sin_precio: false },
}

function preparar(S, { orden = ORDEN, items = ITEMS } = {}) {
  S.estado.empresaId = 'u-n'
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = items
  S.__tablas.cliente_movimientos = []
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Manuel' }]
  S.__tablas.listas_precios = [{ id: 'l1', unidad_negocio_id: 'u-n' }]
  S.__setRpc(async (n, p) => {
    if (n === 'precio_venta') return { data: PV[p.p_presentacion_id] ?? { sin_precio: true, motivo: 'El producto no tiene precio en la lista.' }, error: null }
    return { data: null, error: null }
  })
}
const cuerpo = (S) => nb(S.__els.get('ad-orden-cuerpo').innerHTML)

// ── El nombre del renglón ─────────────────────────────────────────────────
{
  const S = nuevo()
  const U = (n) => ` <strong class="ad-renglon__u">× ${n} u.</strong>`
  chk('con cono: "Barquillo 40 x4 · Caja con cono × 252 u. · VENEZIA"',
    S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-bar-con', marca_id: 'm-ven' }) === 'Barquillo 40 x4 · Caja con cono' + U(252) + ' · VENEZIA',
    S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-bar-con', marca_id: 'm-ven' }))
  chk('sin cono: "Soft · Caja sin cono × 224 u." (sin el "· Sin cono" final)',
    S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-soft-sin', marca_id: null }) === 'Soft · Caja sin cono' + U(224))
  chk('las unidades en negrita', /<strong class="ad-renglon__u">× 224 u\.<\/strong>/.test(S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-soft-sin' })))
  chk('con el punto de los miles: × 1.600 u.', S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-soft-grande' }) === 'Soft · Caja grande' + U('1.600'))
  chk('"Caja x 100" ya dice sus unidades: no se repiten', S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-cuc-100' }) === 'Cucurucho grande · Caja x 100')
  chk('de a 1 ("Por cono"): sin unidades', S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-cono-1', marca_id: 'm-ven' }) === 'Cono de papel · Por cono · VENEZIA')
  chk('con cono y sin marca (una orden vieja): "Falta el cono"', S.htmlNombreRenglon(CAT, { presentacion_id: 'pr-bar-con', marca_id: null }) === 'Barquillo 40 x4 · Caja con cono' + U(252) + ' · Falta el cono')
  chk('escapa el nombre del producto y del cono', S.htmlNombreRenglon({ ...CAT, productos: [{ id: 'p-bar', nombre: '<b>x</b>' }], marcas: [{ id: 'm-ven', nombre: 'A&B' }] },
    { presentacion_id: 'pr-bar-con', marca_id: 'm-ven' }) === '&lt;b&gt;x&lt;/b&gt; · Caja con cono' + U(252) + ' · A&amp;B')
  chk('reusa la función de Remitos Dolce (no la duplica)', /textoUnidadesRemito \} from '\.\.\/js\/remitos-comun\.js'/.test(src) && !/function textoUnidadesRemito/.test(src))
}

// ── Al valorizar: el nombre y el descuento del cono ───────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(() => {
    const h = cuerpo(S)
    chk('al valorizar: "3 cajas · Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO"', h.includes('3 cajas · Barquillo 40 x4 · Caja con cono <strong class="ad-renglon__u">× 252 u.</strong> · CASERATO'))
    chk('…y "2 cajas · Soft · Caja sin cono × 224 u." sin "Sin cono"', h.includes('2 cajas · Soft · Caja sin cono <strong class="ad-renglon__u">× 224 u.</strong></div>') && !/Sin cono/.test(h))
    const v = S.estado.orden.valorizar
    chk('el precio con descuento se usa tal cual', v.precios.i1 === 34039.26 && v.desdeLista.has('i1'), json(v.precios))
    chk('al lado: "(−5 % CASERATO · antes $ 35.830,80)"', nb(v.origen.i1?.descuento) === '(−5 % CASERATO · antes $ 35.830,80)', v.origen.i1?.descuento)
    chk('…en letra chica y color normal (no el de error)', /<div class="ad-renglon__origen ad-renglon__descuento" data-descuento>\(−5 % CASERATO · antes \$ 35\.830,80\)<\/div>/.test(h) &&
      v.origen.i1.grave === false)
    chk('sin descuento no dice nada', !v.origen.i2?.descuento && (h.match(/data-descuento>/g) || []).length === 1)
  }))
}
{
  const S = nuevo()
  chk('el descuento sin el precio de antes: "(−5 % CASERATO)"', S.textoDescuentoPrecio({ descuento_pct: 5 }, 'CASERATO') === '(−5 % CASERATO)')
  chk('con decimales y sin cono: "(−2,5 % · antes $ 100,00)"', nb(S.textoDescuentoPrecio({ descuento_pct: '2.50', precio_caja_sin_descuento: 100 }, null)) === '(−2,5 % · antes $ 100,00)',
    S.textoDescuentoPrecio({ descuento_pct: '2.50', precio_caja_sin_descuento: 100 }, null))
  chk('0 o null: nada', S.textoDescuentoPrecio({ descuento_pct: 0 }, 'X') === '' && S.textoDescuentoPrecio({ descuento_pct: null }, 'X') === '' && S.textoDescuentoPrecio(null, 'X') === '')
  // Lo que viene de la base (el nombre de la lista y el del cono) se escapa.
  chk('el origen y el descuento se escapan', S.htmlOrigenPrecio({ texto: 'lista <b>L</b>', descuento: S.textoDescuentoPrecio({ descuento_pct: 5 }, '<i>C</i>') }) ===
    '<div class="ad-renglon__origen">lista &lt;b&gt;L&lt;/b&gt;</div><div class="ad-renglon__origen ad-renglon__descuento" data-descuento>(−5 % &lt;i&gt;C&lt;/i&gt;)</div>',
    S.htmlOrigenPrecio({ texto: 'lista <b>L</b>', descuento: S.textoDescuentoPrecio({ descuento_pct: 5 }, '<i>C</i>') }))
  chk('el estilo: chico y color normal', /\.ad-renglon__descuento \{ font-size: 0\.8125rem; font-weight: 400; color: var\(--ad-texto-secundario\);/.test(src))
}

// ── La orden valorizada: "(−5 %)" al lado del precio por caja ─────────────
{
  const S = nuevo()
  preparar(S, {
    orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 112878.52 },
    items: [{ ...ITEMS[0], precio_caja: 34039.26, subtotal: 102117.78, descuento_pct: 5 }, { ...ITEMS[1], precio_caja: 5380.37, subtotal: 10760.74, descuento_pct: null }],
  })
  esperas.push(S.abrirOrden('o9').then(() => {
    const h = cuerpo(S)
    chk('pide descuento_pct de cada renglón', S.__llamadas.consultas.some(c => c[0] === 'orden_retiro_items' && /descuento_pct/.test(json(c))) || /subtotal, descuento_pct, lote/.test(src))
    chk('"$ 34.039,26 x caja (−5 %)"', h.includes('$ 34.039,26 x caja <span class="ad-renglon__descuento" data-descuento-guardado>(−5 %)</span>'), h.slice(0, 3000))
    chk('el renglón sin descuento, sin nada', (h.match(/data-descuento-guardado/g) || []).length === 1)
    chk('el detalle con el nombre nuevo', h.includes('Barquillo 40 x4 · Caja con cono <strong class="ad-renglon__u">× 252 u.</strong> · CASERATO') && !/Sin cono/.test(h))
  }))
}

// ── Las hojas N1 / N2 con el mismo nombre ─────────────────────────────────
{
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.orden = { id: 'o9', orden: { ...ORDEN }, items: ITEMS.concat([{ id: 'i3', orden: 3, insumo_id: 'ins1', cantidad: 2 }]) }
  const datos = { orden_id: 'o9', codigo: 'N-0009', cliente: 'Heladería Sur', items: [
    { orden: 1, tipo: 'retiro', descripcion: 'Barquillo 40 x4 · Caja con cono · CASERATO', unidad: 'cajas', precio: 100, cantidad: 3, cant_a: 1, cant_b: 2, subtotal_a: 100, subtotal_b: 200 },
    { orden: 2, tipo: 'devolucion', descripcion: 'Devolución: Soft · Caja sin cono', unidad: 'cajas', precio: 50, cantidad: -2, cant_a: -1, cant_b: -1, subtotal_a: -50, subtotal_b: -50 },
    { orden: 3, tipo: 'retiro', descripcion: 'Harina 000 Molino', unidad: 'kg', precio: 10, cantidad: 2, cant_a: 1, cant_b: 1, subtotal_a: 10, subtotal_b: 10 },
  ], total_a: 60, total_b: 160 }
  const h = nb(S.htmlHojaPunto(datos, 'B'))
  chk('la hoja: "Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO"', h.includes('<td>Barquillo 40 x4 · Caja con cono <strong class="ad-renglon__u">× 252 u.</strong> · CASERATO</td>'))
  chk('…la devolución con su palabra', h.includes('<td>Devolución: Soft · Caja sin cono <strong class="ad-renglon__u">× 224 u.</strong></td>'))
  chk('…un insumo, como lo manda la base', h.includes('<td>Harina 000 Molino</td>'))
  const otra = nb(S.htmlHojaPunto({ ...datos, orden_id: 'otra' }, 'B'))
  chk('de otra orden (no la abierta): el nombre de la base', otra.includes('<td>Barquillo 40 x4 · Caja con cono · CASERATO</td>'))
  chk('el nombre de la base se escapa', nb(S.htmlHojaPunto({ ...datos, orden_id: 'otra', items: [{ ...datos.items[0], descripcion: '<i>x</i>' }] }, 'A')).includes('<td>&lt;i&gt;x&lt;/i&gt;</td>'))
}

// ── La caja con cono en Listas: la misma cuenta que precio_venta ──────────
{
  const S = nuevo()
  // El caso de Facu: la base daba 23.990,80 y la pantalla 23.990,82 (redondeaba el precio por unidad a 4 en el medio).
  const caja = S.conConoConPrecioNuevo({ upcSin: 100 }, { es_base: false, recargo_pct: 10 }, { unidades_por_caja: 432, conito_unitario: 0 }, 5048.57)
  chk('la caja de 23.990,80 se muestra 23.990,80 (no 23.990,82)', caja === 23990.8, caja)
  chk('con conito: la misma cuenta', S.conConoConPrecioNuevo({ upcSin: 100 }, { es_base: false, recargo_pct: 10 }, { unidades_por_caja: 432, conito_unitario: 4.2 }, 4666.75) === 23990.8)
  chk('una lista base no suma recargo', S.conConoConPrecioNuevo({ upcSin: 100 }, { es_base: true, recargo_pct: 10 }, { unidades_por_caja: 100, conito_unitario: 5 }, 10000) === 10500)
  chk('sin datos: null', S.conConoConPrecioNuevo({ upcSin: 0 }, {}, { unidades_por_caja: 100, conito_unitario: 0 }, 100) === null &&
    S.conConoConPrecioNuevo({ upcSin: 100 }, {}, { unidades_por_caja: 100, conito_unitario: 0, sin_precio: true }, 100) === null)
  chk('ya no redondea a 4 en el medio', !/Math\.round\(nuevo \/ upcSin \* \(1 \+ pct \/ 100\) \* 10000\) \/ 10000/.test(src))
  // Lo que dio la base el 30/10/2026 (SELECT round(((caja / upc_sin) * (1 + pct / 100.0) + conito) * upc_con, 2)):
  // los "en la mitad justa", donde los decimales de la compu se equivocaban por un centavo.
  const BASE = [
    [6788.49, 144, 25, 4.97, 480, 30670.98, '47.1422916666666667'],
    [3336.51, 144, 25, 4.97, 480, 16287.72, '23.1702083333333333'],
    [13588.05, 252, 10, 3, 300, 18693.87, '53.9208333333333333'],
    [27466.46, 144, 0, 0, 252, 48066.31, '190.7393055555555556'],
    [27609.55, 120, 0, 0, 252, 57980.05, '230.0795833333333333'],
    [20356.46, 144, 0, 0, 252, 35623.81, '141.3643055555555556'],
    [5048.57, 100, 10, 0, 432, 23990.8, '50.4857'],
    [4666.75, 100, 10, 4.2, 432, 23990.8, '46.6675'],
    [1000, 3, 12.5, 0, 7, 2625, '333.3333333333333333'],
    [1000, 6, 0, 0, 3, 500, '166.6666666666666667'],
  ]
  const txtNum = (d) => { const t = d.v.toString().padStart(d.s + 1, '0'); return d.s ? (t.slice(0, -d.s) + '.' + t.slice(-d.s)).replace(/0+$/, '').replace(/\.$/, '') : t }
  for (const [caja, us, pct, conito, uc, esperado, unidad] of BASE) {
    const app = S.conConoConPrecioNuevo({ upcSin: us }, { es_base: false, recargo_pct: pct }, { unidades_por_caja: uc, conito_unitario: conito }, caja)
    chk(`como la base: ${caja} / ${us} (+${pct} %, conito ${conito}) × ${uc} = ${esperado}`, app === esperado, app)
    chk(`…y el precio por unidad con los decimales de la base (${unidad})`, txtNum(S.dividirNumeric(S.decimalNumeric(caja), S.decimalNumeric(us))) === unidad.replace(/0+$/, '').replace(/\.$/, ''),
      txtNum(S.dividirNumeric(S.decimalNumeric(caja), S.decimalNumeric(us))))
  }
  chk('decimalNumeric: "5048.57" → 504857 con 2 decimales; basura → null', JSON.stringify(S.decimalNumeric(5048.57), (k, v) => typeof v === 'bigint' ? v.toString() : v) === '{"v":"504857","s":2}' &&
    S.decimalNumeric('abc') === null && S.decimalNumeric('1e5') === null)
  chk('round(x, 2) lejos del 0: 0,125 → 0,13 y −1,005 → −1,01', S.plataNumeric(S.decimalNumeric('0.125')) === 0.13 && S.plataNumeric(S.decimalNumeric('-1.005')) === -1.01 &&
    S.plataNumeric(S.decimalNumeric('7')) === 7)
  chk('el weight de numeric: 27466.46 → peso 1, primer grupo 2; 0.05 → peso -1', json(S.pesoNumeric(S.decimalNumeric('27466.46'))) === '{"peso":1,"primero":2}' &&
    json(S.pesoNumeric(S.decimalNumeric('0.05'))) === '{"peso":-1,"primero":500}')
}

fin(esperas)
