// VALORIZAR MÁS LEGIBLE (30/10/2026, rama ci-prueba/valorizar-legible, pedido
// de Facu). Se EJECUTAN las funciones reales:
//  - El nombre del renglón al valorizar, en el detalle de la orden y en las
//    hojas N1 / N2: "Barquillo 40 x4 · Caja con cono × 252 u. · VENEZIA" y
//    "Soft · Caja sin cono × 224 u." (las unidades en negrita, con
//    textoUnidadesRemito de js/remitos-comun.js; sin el "· Sin cono" final).
//  - Las CONDICIONES ESPECIALES del cliente (el punto 2, cambiado por Facu el
//    30/10/2026): la sección de la ficha (alta, edición, activa / inactiva,
//    conos con buscador y productos), los tildes al valorizar (en vivo, la
//    misma regla que la base, valorizar_con_condiciones con los precios de
//    LISTA), "(−5 % · nombre)" en la orden valorizada y en las hojas, y
//    Corregir orden con precio_lista.
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
const vaciar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

const CAT = {
  productos: [{ id: 'p-bar', nombre: 'Barquillo 40 x4', activo: true }, { id: 'p-soft', nombre: 'Soft', activo: true }, { id: 'p-cuc', nombre: 'Cucurucho grande', activo: true },
    { id: 'p-cono', nombre: 'Cono de papel', activo: true }, { id: 'p-viejo', nombre: 'Producto viejo', activo: false }],
  presentaciones: [
    { id: 'pr-bar-con', producto_id: 'p-bar', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 252 },
    { id: 'pr-soft-sin', producto_id: 'p-soft', nombre: 'Caja sin cono', con_cono: false, unidades_por_caja: 224 },
    { id: 'pr-cuc-100', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 },
    { id: 'pr-soft-grande', producto_id: 'p-soft', nombre: 'Caja grande', con_cono: false, unidades_por_caja: 1600 },
    { id: 'pr-cono-1', producto_id: 'p-cono', nombre: 'Por cono', con_cono: true, unidades_por_caja: 1, sin_stock: true },
  ],
  marcas: [{ id: 'm-ven', nombre: 'VENEZIA' }, { id: 'm-cas', nombre: 'CASERATO' }, { id: 'm-dip', nombre: 'DIPALE' }, { id: 'm-ver', nombre: 'VERASENS' }, { id: 'm-pca', nombre: 'LA PRIMERA CASA' }],
  insumos: [],
}
const CLIENTES = [{ id: 'c1', nombre: 'Heladería Sur', lista_precio_id: 'l1', limite_credito: null, activo: true, unidad_negocio_id: 'u-n' }]
const ORDEN = { id: 'o9', numero: 9, codigo: 'N-0009', unidad_negocio_id: 'u-n', fecha: '2026-10-30', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', transporte: null, observaciones: null, condiciones_especiales: null }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 3, unidades: 756, precio_caja: null, subtotal: null, lote: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr-soft-sin', marca_id: null, cajas: 2, unidades: 448, precio_caja: null, subtotal: null, lote: null },
  { id: 'i3', orden: 3, presentacion_id: 'pr-bar-con', marca_id: 'm-ven', cajas: 1, unidades: 252, precio_caja: null, subtotal: null, lote: null },
  { id: 'i4', orden: 4, presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 1, unidades: 252, precio_caja: null, subtotal: null, lote: null, tipo: 'reposicion', motivo_devolucion: 'rotas' },
]
const PV = {
  'pr-bar-con': { precio_unitario: 142.1857, precio_caja: 35830.8, unidades_por_caja: 252, producto_unitario: 137.2157, conito_unitario: 4.97, papel_conito: 'comun', lista: 'Mayoristas', recargo_pct: 0, sin_precio: false },
  'pr-soft-sin': { precio_unitario: 100, precio_caja: 22400, unidades_por_caja: 224, producto_unitario: 100, conito_unitario: 0, papel_conito: null, lista: 'Mayoristas', recargo_pct: 0, sin_precio: false },
}
// Lo que devuelve condiciones_especiales_cliente (con su alcance armado por la base).
const CONDS = [
  { id: 'k1', nombre: 'Caserato · Verasens · Dipale', descuento_pct: 5, activa: true, marcas: [{ id: 'm-cas', nombre: 'CASERATO' }, { id: 'm-dip', nombre: 'DIPALE' }, { id: 'm-ver', nombre: 'VERASENS' }],
    productos: [], alcance: 'conos: CASERATO, DIPALE, VERASENS' },
  { id: 'k2', nombre: 'Venta a Ostera', descuento_pct: 3, activa: true, marcas: [], productos: [], alcance: 'toda la orden' },
  { id: 'k3', nombre: 'Soft', descuento_pct: '10.00', activa: true, marcas: [], productos: [{ id: 'p-soft', nombre: 'Soft' }], alcance: 'productos: Soft' },
  { id: 'k4', nombre: 'Promo vieja', descuento_pct: 50, activa: false, marcas: [], productos: [], alcance: 'toda la orden' },
]

function preparar(S, { orden = ORDEN, items = ITEMS, conds = CONDS, rpc = null } = {}) {
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
    if (rpc) { const r = await rpc(n, p); if (r) return r }
    if (n === 'precio_venta') return { data: PV[p.p_presentacion_id] ?? { sin_precio: true, motivo: 'El producto no tiene precio en la lista.' }, error: null }
    if (n === 'condiciones_especiales_cliente') return { data: conds.filter(k => p.p_solo_activas === false || k.activa), error: null }
    if (n === 'valorizar_con_condiciones') return { data: { total: 1, moneda: 'ARS' }, error: null }
    return { data: null, error: null }
  })
}
const cuerpo = (S) => nb(S.__els.get('ad-orden-cuerpo').innerHTML)
const rpcDe = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
const el = (S, id) => S.__doc.getElementById(id)

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
  chk('reusa la función de Remitos Dolce (no la duplica)', /textoUnidadesRemito[^}]*\} from '\.\.\/js\/remitos-comun\.js'/.test(src) && !/function textoUnidadesRemito/.test(src))
}

// ── El cono de papel ilustración (30/10/2026) ──────────────────────────────
{
  const S = nuevo()
  const CATI = { ...CAT, marcas: [...CAT.marcas, { id: 'm-mar', nombre: 'MARBET', papel_ilustracion: true }] }
  const U = ' <strong class="ad-renglon__u">× 252 u.</strong>'
  chk('el renglón con MARBET: "Barquillo 40 x4 · Caja con cono × 252 u. · MARBET (ilustración)"',
    S.htmlNombreRenglon(CATI, { presentacion_id: 'pr-bar-con', marca_id: 'm-mar' }) === 'Barquillo 40 x4 · Caja con cono' + U + ' · MARBET (ilustración)')
  chk('…con un cono común, sin "(ilustración)"', S.htmlNombreRenglon(CATI, { presentacion_id: 'pr-bar-con', marca_id: 'm-cas' }) === 'Barquillo 40 x4 · Caja con cono' + U + ' · CASERATO')
  chk('…la hoja de la orden también ("conoNombre")', S.partesRenglon(CATI, { presentacion_id: 'pr-bar-con', marca_id: 'm-mar' }).conoNombre === 'MARBET (ilustración)' &&
    S.partesRenglon(CATI, { presentacion_id: 'pr-bar-con', marca_id: 'm-cas' }).conoNombre === 'CASERATO' && S.partesRenglon(CATI, { presentacion_id: 'pr-bar-con', marca_id: 'm-otro' }).conoNombre === null)
  S.estado.catalogo = CATI
  S.estado.orden = { id: 'o9', orden: { ...ORDEN }, items: [{ ...ITEMS[0], marca_id: 'm-mar' }] }
  const hoja = nb(S.htmlHojaPunto({ orden_id: 'o9', items: [{ orden: 1, tipo: 'retiro', descripcion: 'x', unidad: 'cajas', precio: 1, cantidad: 1, cant_a: 1, cant_b: 0, subtotal_a: 1, subtotal_b: 0 }] }, 'A'))
  chk('…las hojas N1 / N2', hoja.includes('· MARBET (ilustración)</td>'))
  chk('al valorizar: "conito ilustración $ 47,00 por unidad"', S.textoConitoIlustracion({ papel_conito: 'ilustracion', conito_unitario: 47 }) === 'conito ilustración $ 47,00 por unidad' &&
    S.textoConitoIlustracion({ papel_conito: 'comun', conito_unitario: 8.5 }) === '' && S.textoConitoIlustracion({ papel_conito: 'ilustracion', conito_unitario: null }) === '')
  chk('…en chico debajo del origen', S.htmlOrigenPrecio({ texto: 'lista X', ilustracion: 'conito ilustración $ 47,00 por unidad' }) ===
    '<div class="ad-renglon__origen">lista X</div><div class="ad-renglon__origen ad-renglon__descuento" data-conito-ilustracion>conito ilustración $ 47,00 por unidad</div>')
  chk('Administración lee papel_ilustracion con su catálogo de conos', /from\('marcas_personalizadas'\)\.select\('id, nombre, papel_ilustracion'\)/.test(src) &&
    !/MARBET|QUINTANA|RIO OLIMPICOS/.test(src.replace(/\/\/.*$/gm, '')))
}
{
  // Valorizar un renglón con MARBET: el nombre y la línea del conito.
  const S = nuevo()
  const CATI = { ...CAT, marcas: [...CAT.marcas, { id: 'm-mar', nombre: 'MARBET', papel_ilustracion: true }] }
  preparar(S, { items: [{ ...ITEMS[0], marca_id: 'm-mar' }], conds: [], rpc: async (n, p) => n === 'precio_venta' ? { data: { ...PV['pr-bar-con'], papel_conito: 'ilustracion', conito_unitario: 47 }, error: null } : null })
  S.estado.catalogo = CATI
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(() => {
    const h = cuerpo(S)
    chk('valorizar con MARBET: el renglón dice "MARBET (ilustración)"', h.includes('· MARBET (ilustración)</div>'))
    chk('…y en chico "conito ilustración $ 47,00 por unidad"', h.includes('data-conito-ilustracion>conito ilustración $ 47,00 por unidad</div>'))
  }))
}

// ── La regla de las condiciones (la misma que valorizar_orden_retiro) ──────
{
  const S = nuevo()
  const [k1, k2, k3, k4] = CONDS
  const de = (it, conds) => S.condicionDeRenglon(it, conds, CAT)?.id ?? null
  chk('con un cono de la condición: entra', de(ITEMS[0], [k1]) === 'k1')
  chk('con otro cono: no entra', de(ITEMS[2], [k1]) === null)
  chk('por producto: el Soft entra, el Barquillo no', de(ITEMS[1], [k3]) === 'k3' && de(ITEMS[0], [k3]) === null)
  chk('toda la orden: entran todos', de(ITEMS[0], [k2]) === 'k2' && de(ITEMS[1], [k2]) === 'k2' && de(ITEMS[2], [k2]) === 'k2')
  chk('en varias, la de mayor % (5 contra 3)', de(ITEMS[0], [k2, k1]) === 'k1' && de(ITEMS[1], [k2, k3]) === 'k3')
  chk('una reposición nunca', de(ITEMS[3], [k1, k2]) === null)
  chk('un insumo solo con las de toda la orden', de({ id: 'x', insumo_id: 'ins1', marca_id: null }, [k1, k3]) === null && de({ id: 'x', insumo_id: 'ins1' }, [k2]) === 'k2')
  chk('conos Y productos: tienen que estar los dos', de(ITEMS[0], [{ ...k1, productos: [{ id: 'p-soft' }] }]) === null &&
    de(ITEMS[0], [{ ...k1, productos: [{ id: 'p-bar' }] }]) === 'k1')
  chk('una devolución sí entra', de({ ...ITEMS[0], tipo: 'devolucion' }, [k1]) === 'k1')
  chk('una de 0 % no cuenta', de(ITEMS[0], [{ ...k2, descuento_pct: 0 }]) === null)
  chk('el descuento como la base: round(lista * (1 - 5/100), 2)', S.precioConDescuento(35830.8, 5) === 34039.26 && S.precioConDescuento(100, 12.5) === 87.5 &&
    S.precioConDescuento(0.03, 50) === 0.02 && S.precioConDescuento(22400, '10.00') === 20160)
  void k4
}

// ── Valorizar con los tildes ──────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    const pide = rpcDe(S, 'condiciones_especiales_cliente')
    chk('lee las condiciones ACTIVAS del cliente', pide.length === 1 && json(pide[0][1]) === json({ p_cliente_id: 'c1', p_solo_activas: true }))
    let h = cuerpo(S)
    chk('al valorizar: "3 cajas · Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO"', h.includes('3 cajas · Barquillo 40 x4 · Caja con cono <strong class="ad-renglon__u">× 252 u.</strong> · CASERATO'))
    chk('…y "2 cajas · Soft · Caja sin cono × 224 u." sin "Sin cono"', h.includes('2 cajas · Soft · Caja sin cono <strong class="ad-renglon__u">× 224 u.</strong></div>') && !/Sin cono/.test(h))
    chk('"Condiciones especiales de este cliente", debajo de los renglones', /<h3 class="ad-subtitulo">Condiciones especiales de este cliente<\/h3>/.test(h) &&
      h.indexOf('Condiciones especiales de este cliente') > h.indexOf('data-precio="i4"') || h.indexOf('Condiciones especiales de este cliente') > h.indexOf('data-precio="i3"'))
    chk('un tilde por cada activa (la inactiva no)', (h.match(/data-condicion-valorizar=/g) || []).length === 3 && !/Promo vieja/.test(h))
    chk('con su nombre, el % y el alcance en chico', h.includes('<span>Caserato · Verasens · Dipale (−5 %)<span class="ad-esp__alcance">conos: CASERATO, DIPALE, VERASENS</span></span>'))
    chk('ninguno tildado en una orden nueva', !/ checked>/.test(h))
    chk('sin tildes, el total de lista', /Total \$ 188\.123,20/.test(h), (h.match(/Total [^<]*/) || [])[0])
    S.elegirCondicionValorizar('k1', true)
    h = cuerpo(S)
    chk('tildar: el renglón con CASERATO baja: "$ 34.039,26 (−5 % · antes $ 35.830,80)"',
      h.includes('<div data-descuento-precio="i1"><span class="ad-renglon__con-descuento">$ 34.039,26</span> <span class="ad-renglon__descuento">(−5 % · antes $ 35.830,80)</span></div>'))
    chk('…el de VENEZIA y el Soft no', /<div data-descuento-precio="i3"><\/div>/.test(h) && /<div data-descuento-precio="i2"><\/div>/.test(h))
    chk('…su subtotal y el total, en vivo', h.includes('$ 102.117,78') && /Total \$ 182\.748,58/.test(h))
    chk('…el tilde queda marcado', /data-condicion-valorizar="k1" checked>/.test(h))
    // Lo que se manda: los precios de LISTA y la condición.
    await S.guardarValorizacion()
    const v = rpcDe(S, 'valorizar_con_condiciones')
    chk('guardar: valorizar_con_condiciones (no valorizar_orden_retiro)', v.length === 1 && !rpcDe(S, 'valorizar_orden_retiro').length)
    chk('…con los precios de LISTA (el navegador no descuenta lo que manda)', v[0][1].p_precios.i1 === 35830.8 && v[0][1].p_precios.i2 === 22400 && v[0][1].p_precios.i4 === 0, json(v[0][1].p_precios))
    chk('…y las condiciones tildadas', json(v[0][1].p_condiciones) === '["k1"]' && v[0][1].p_orden_id === 'o9')
  }))
}
{
  // "Toda la orden": bajan todos menos la reposición; destildar vuelve atrás.
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    S.elegirCondicionValorizar('k2', true)
    let h = cuerpo(S)
    chk('toda la orden: bajan los tres renglones (3 %)', (h.match(/\(−3 % · antes /g) || []).length === 3 && h.includes('$ 34.755,88') && h.includes('$ 21.728,00'))
    chk('…menos la reposición', /<div class="ad-renglon__plata"><div>Se repone<\/div>/.test(h) && !/data-descuento-precio="i4"/.test(h))
    S.elegirCondicionValorizar('k1', true)
    h = cuerpo(S)
    chk('con dos tildadas, cada renglón con la de mayor %', h.includes('$ 34.039,26') && (h.match(/\(−5 % · antes /g) || []).length === 1 && (h.match(/\(−3 % · antes /g) || []).length === 2)
    S.elegirCondicionValorizar('k2', false)
    S.elegirCondicionValorizar('k1', false)
    h = cuerpo(S)
    chk('destildar todo: vuelve al total de lista', /Total \$ 188\.123,20/.test(h) && !/antes \$/.test(h))
    S.elegirCondicionValorizar('k4', true)
    chk('una inactiva no se puede tildar', !S.estado.orden.valorizar.elegidas.has('k4'))
    await S.guardarValorizacion()
    chk('sin tildes: p_condiciones vacío', json(rpcDe(S, 'valorizar_con_condiciones')[0][1].p_condiciones) === '[]')
  }))
}
{
  // Cambiar a mano el precio de lista recalcula el precio con descuento.
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    S.elegirCondicionValorizar('k1', true)
    S.cambiarPrecio('i1', 10000)
    const d = S.estado.orden
    const desc = nb(S.htmlDescuentoValorizar(d, d.items[0]))
    chk('tipear el precio: el descuento se recalcula', desc.includes('$ 9.500,00') && desc.includes('antes $ 10.000,00') && S.subtotalValorizar(d, d.items[0]) === 28500, desc)
    chk('…sin redibujar (cambiarPrecio pone al día data-descuento-precio)', /const conDesc = cuerpo\.querySelector\(`\[data-descuento-precio="\$\{itemId\}"\]`\)\n\s+if \(conDesc && it\) conDesc\.innerHTML = htmlDescuentoValorizar\(d, it\)/.test(src))
  }))
}
{
  // Sin poder leer las condiciones: lo dice y se valoriza igual.
  const S = nuevo()
  preparar(S, { rpc: async (n) => n === 'condiciones_especiales_cliente' ? { data: null, error: { message: 'x' } } : null })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(async () => {
    chk('error al leer las condiciones: el aviso, sin tildes', cuerpo(S).includes('No se pudieron leer las condiciones especiales del cliente: se valoriza sin ellas.') && !/data-condicion-valorizar=/.test(cuerpo(S)))
  }))
}
{
  // Un cliente sin condiciones: ni la sección.
  const S = nuevo()
  preparar(S, { conds: [] })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(() => {
    chk('sin condiciones: no aparece la sección', !/Condiciones especiales de este cliente/.test(cuerpo(S)))
  }))
}

{
  // Aunque la base mande una inactiva, no se ofrece para tildar.
  const S = nuevo()
  preparar(S, { rpc: async (n) => n === 'condiciones_especiales_cliente' ? { data: CONDS, error: null } : null })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(() => {
    chk('una inactiva que llegue igual no se ofrece', !/Promo vieja/.test(cuerpo(S)) && (cuerpo(S).match(/data-condicion-valorizar=/g) || []).length === 3)
  }))
}
{
  // Lo que viene de la base se escapa: nombre, alcance, id, el error.
  const S = nuevo()
  const MAL = [{ id: 'k"x', nombre: '<b>N</b>', descuento_pct: 5, activa: true, marcas: [], productos: [], alcance: '<i>A</i>' }]
  preparar(S, { conds: MAL })
  esperas.push(S.abrirOrden('o9').then(() => S.abrirValorizar()).then(() => {
    const h = cuerpo(S)
    chk('los tildes escapan el nombre, el alcance y el id', h.includes('&lt;b&gt;N&lt;/b&gt; (−5 %)') && h.includes('&lt;i&gt;A&lt;/i&gt;') && h.includes('data-condicion-valorizar="k&quot;x"') && !/<b>N/.test(h))
    S.estado.orden.valorizar.errorCondiciones = '<e>'
    chk('el aviso se escapa', S.htmlCondicionesValorizar(S.estado.orden).includes('&lt;e&gt;'))
    chk('el origen del precio se escapa', S.htmlOrigenPrecio({ texto: 'lista <b>L</b>' }) === '<div class="ad-renglon__origen">lista &lt;b&gt;L&lt;/b&gt;</div>')
  }))
}
{
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.orden = { id: 'o9', orden: { ...ORDEN }, items: [{ ...ITEMS[0], descuento_pct: 5, condicion_id: 'k1' }], condiciones: new Map([['k1', { nombre: '<b>x</b>' }]]) }
  const h = S.htmlHojaPunto({ orden_id: 'o9', items: [{ orden: 1, tipo: 'retiro', descripcion: 'x', unidad: 'cajas', precio: 1, cantidad: 1, cant_a: 1, cant_b: 0, subtotal_a: 1, subtotal_b: 0 }] }, 'A')
  chk('la hoja escapa el nombre de la condición', h.includes('(−5 % · &lt;b&gt;x&lt;/b&gt;)') && !/<b>x/.test(h))
}
{
  // La ficha escapa todo lo que viene de la base y de lo que se escribe.
  const S = nuevo()
  const MAL = [{ id: 'k"x', nombre: '<b>N</b>', descuento_pct: 5, activa: true, marcas: [{ id: 'm"1', nombre: '<m>' }], productos: [], alcance: '<i>A</i>' }]
  const CATMAL = { ...CAT, marcas: [{ id: 'm"1', nombre: '<m>CONO' }], productos: [{ id: 'p"1', nombre: '<p>P', activo: true }] }
  prepararFicha(S, { conds: MAL })
  S.estado.catalogo = CATMAL
  esperas.push(S.cargarEspecialesFicha(S.estado.ficha).then(async () => {
    const h = el(S, 'ad-f-especiales').innerHTML
    chk('la fila escapa id, nombre y alcance (también en el interruptor)', h.includes('data-esp-fila="k&quot;x"') && h.includes('data-esp-activa="k&quot;x"') && h.includes('data-esp-editar="k&quot;x"') &&
      h.includes('&lt;b&gt;N&lt;/b&gt;') && h.includes('&lt;i&gt;A&lt;/i&gt;') && h.includes('aria-label="Desactivar &lt;b&gt;N&lt;/b&gt;"') && !/<b>N|<i>A/.test(h))
    S.abrirFormEspecial('k"x')
    chk('el cono elegido escapa nombre e id', el(S, 'ad-esp-conos-elegidos').innerHTML.includes('<span class="ad-apodo__texto">&lt;m&gt;CONO</span>') && el(S, 'ad-esp-conos-elegidos').innerHTML.includes('data-esp-sacar-cono="m&quot;1"') &&
      el(S, 'ad-esp-conos-elegidos').innerHTML.includes('aria-label="Sacar el cono &lt;m&gt;CONO"'))
    chk('los productos escapan nombre e id', el(S, 'ad-esp-productos').innerHTML.includes('&lt;p&gt;P') && el(S, 'ad-esp-productos').innerHTML.includes('data-esp-producto="p&quot;1"'))
    S.estado.ficha.especiales.form.marcas = []
    S.alEscribirEspeciales({ target: { id: 'ad-esp-cono-buscar', value: '<m' } })
    chk('las opciones de conos escapan', el(S, 'ad-esp-conos-opciones').innerHTML.includes('&lt;m&gt;CONO') && el(S, 'ad-esp-conos-opciones').innerHTML.includes('data-esp-cono="m&quot;1"'))
    S.alEscribirEspeciales({ target: { id: 'ad-esp-cono-buscar', value: '<zz>' } })
    chk('"Ningún cono coincide" escapa lo escrito', el(S, 'ad-esp-conos-opciones').innerHTML.includes('«&lt;zz&gt;»'))
    S.estado.ficha.especiales.form.error = '<f>'
    S.pintarEspecialesFicha()
    chk('el error del formulario se escapa', el(S, 'ad-esp-error').innerHTML.includes('&lt;f&gt;') || S.htmlFormEspecial(S.estado.ficha.especiales).includes('&lt;f&gt;'))
    S.estado.ficha.especiales.form = null
    S.estado.ficha.especiales.errorFila = '<g>'
    S.pintarEspecialesFicha()
    chk('el error de una fila se escapa', el(S, 'ad-f-especiales').innerHTML.includes('&lt;g&gt;'))
    S.estado.ficha.especiales.lista = null
    S.estado.ficha.especiales.error = '<h>'
    S.pintarEspecialesFicha()
    chk('el error al leer se escapa', el(S, 'ad-f-especiales').innerHTML.includes('&lt;h&gt;'))
  }))
}
{
  // Después de guardar, la lista se relee y muestra lo nuevo.
  const S = nuevo()
  let vuelta = 0
  prepararFicha(S, { rpc: async (n) => n === 'condiciones_especiales_cliente' ? { data: vuelta++ === 0 ? CONDS : [...CONDS, { id: 'k9', nombre: 'Nueva', descuento_pct: 2, activa: true, marcas: [], productos: [], alcance: 'toda la orden' }], error: null } : null })
  esperas.push(S.cargarEspecialesFicha(S.estado.ficha).then(async () => {
    S.abrirFormEspecial(null)
    el(S, 'ad-esp-nombre').value = 'Nueva'
    el(S, 'ad-esp-pct').value = '2'
    await S.guardarFormEspecial()
    chk('guardada: la lista releída muestra la nueva', /data-esp-fila="k9"/.test(el(S, 'ad-f-especiales').innerHTML))
  }))
}

// ── La orden ya valorizada: el descuento y revalorizar ────────────────────
{
  const S = nuevo()
  const valorizados = [
    { ...ITEMS[0], precio_caja: 34039.26, subtotal: 102117.78, precio_lista: 35830.8, descuento_pct: 5, condicion_id: 'k1' },
    { ...ITEMS[1], precio_caja: 22400, subtotal: 44800, precio_lista: null, descuento_pct: null, condicion_id: null },
    { ...ITEMS[2], precio_caja: 35830.8, subtotal: 35830.8, precio_lista: null, descuento_pct: null, condicion_id: null },
    { ...ITEMS[3], precio_caja: 0, subtotal: 0, precio_lista: null, descuento_pct: null, condicion_id: null },
  ]
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada', total: 182748.58, condiciones_especiales: ['k1'] }, items: valorizados })
  esperas.push(S.abrirOrden('o9').then(async () => {
    const h = cuerpo(S)
    chk('la orden valorizada: "$ 34.039,26 x caja (−5 % · Caserato · Verasens · Dipale)"',
      h.includes('$ 34.039,26 x caja <span class="ad-renglon__descuento" data-descuento-guardado>(−5 % · Caserato · Verasens · Dipale)</span>'))
    chk('…solo ese renglón', (h.match(/data-descuento-guardado/g) || []).length === 1)
    chk('lee precio_lista, descuento_pct y condicion_id, y las condiciones de la orden', /subtotal, precio_lista, descuento_pct, condicion_id, lote/.test(src) && /division_pct_a, numero_remito, talonario, condiciones_especiales'/.test(src) &&
      rpcDe(S, 'condiciones_especiales_cliente').some(r => r[1].p_solo_activas === false))
    await S.abrirValorizar()
    const v = S.estado.orden.valorizar
    chk('revalorizar: el precio que se propone es el de LISTA (no el ya descontado)', v.precios.i1 === 35830.8 && v.precios.i2 === 22400, json(v.precios))
    chk('…y vienen tildadas las de la orden', /data-condicion-valorizar="k1" checked>/.test(cuerpo(S)) && !/data-condicion-valorizar="k2" checked>/.test(cuerpo(S)))
    chk('…con el mismo total que tenía', /Total \$ 182\.748,58/.test(cuerpo(S)))
  }))
}
{
  // Sin permiso de precios no se leen los nombres: "(−5 %)".
  const S = nuevo()
  const it = { ...ITEMS[0], precio_caja: 34039.26, subtotal: 102117.78, precio_lista: 35830.8, descuento_pct: '5.00', condicion_id: 'k1' }
  chk('sin el nombre de la condición: "(−5 %)"', S.textoDescuentoGuardado(it, null) === '(−5 %)' && S.textoDescuentoGuardado({ ...it, descuento_pct: null }, null) === '')
  chk('con el nombre: "(−5 % · Venta a Ostera)"', S.textoDescuentoGuardado({ ...it, condicion_id: 'k2' }, new Map([['k2', CONDS[1]]])) === '(−5 % · Venta a Ostera)')
  chk('el nombre se escapa', S.htmlDescuentoGuardado(it, new Map([['k1', { nombre: '<b>x</b>' }]])) === ' <span class="ad-renglon__descuento" data-descuento-guardado>(−5 % · &lt;b&gt;x&lt;/b&gt;)</span>')
}

// ── La ficha: "Condiciones especiales" ────────────────────────────────────
function prepararFicha(S, opciones = {}) {
  preparar(S, opciones)
  S.estado.ficha = { id: 'c1', original: { id: 'c1', nombre: 'Heladería Sur', unidad_negocio_id: 'u-n' }, condicion: {} }
}
{
  const S = nuevo()
  prepararFicha(S)
  esperas.push(S.cargarEspecialesFicha(S.estado.ficha).then(async () => {
    const pide = rpcDe(S, 'condiciones_especiales_cliente')
    chk('la ficha lee TODAS las condiciones (también las inactivas)', pide.length === 1 && json(pide[0][1]) === json({ p_cliente_id: 'c1', p_solo_activas: false }))
    const h = nb(el(S, 'ad-f-especiales').innerHTML)
    chk('una fila por condición', (h.match(/data-esp-fila=/g) || []).length === 4)
    chk('"Caserato · Verasens · Dipale  −5 %  · conos: CASERATO, DIPALE, VERASENS"', S.textoFilaEspecial(CONDS[0]) === 'Caserato · Verasens · Dipale  −5 %  · conos: CASERATO, DIPALE, VERASENS' &&
      h.includes('<span class="ad-esp-fila__nombre">Caserato · Verasens · Dipale</span>  −5 %  · conos: CASERATO, DIPALE, VERASENS'))
    chk('el interruptor Activa y Editar', /role="switch" aria-checked="true" data-esp-activa="k1"/.test(h) && /data-esp-editar="k1"/.test(h))
    chk('la inactiva, apagada', /ad-esp-fila--apagada" data-esp-fila="k4"/.test(h) && /aria-checked="false" data-esp-activa="k4"[^>]*>.*?Inactiva/.test(h))
    chk('"Agregar condición"', /id="ad-esp-agregar">Agregar condición</.test(h))
    // Alta
    S.abrirFormEspecial(null)
    const f = nb(el(S, 'ad-f-especiales').innerHTML)
    chk('el formulario: nombre, descuento, conos, productos y la ayuda', /Nueva condición/.test(f) && /id="ad-esp-nombre"/.test(f) && /id="ad-esp-pct"/.test(f) && /id="ad-esp-cono-buscar"/.test(f) &&
      /Sin conos ni productos = se descuenta de toda la orden\./.test(f))
    chk('los conos: nada hasta 2 letras', /Escribí 2 o 3 letras del cono/.test(el(S, 'ad-esp-conos-opciones').innerHTML))
    chk('los productos activos de la fábrica del cliente', /data-esp-producto="p-soft"/.test(el(S, 'ad-esp-productos').innerHTML) && !/p-viejo/.test(el(S, 'ad-esp-productos').innerHTML))
    S.alEscribirEspeciales({ target: { id: 'ad-esp-cono-buscar', value: 'c' } })
    chk('con 1 letra, ninguno', !/data-esp-cono=/.test(el(S, 'ad-esp-conos-opciones').innerHTML))
    S.alEscribirEspeciales({ target: { id: 'ad-esp-cono-buscar', value: 'ca' } })
    chk('con "ca": primero los que empiezan así (CASERATO, LA PRIMERA CASA por su palabra)', /data-esp-cono="m-cas"[^>]*>CASERATO</.test(el(S, 'ad-esp-conos-opciones').innerHTML) &&
      /m-pca/.test(el(S, 'ad-esp-conos-opciones').innerHTML) && !/m-ven/.test(el(S, 'ad-esp-conos-opciones').innerHTML))
    chk('el buscador: empiezan antes que contienen', json(S.conosParaBuscarEsp([{ id: '1', nombre: 'ACASO' }, { id: '2', nombre: 'CASA' }], 'cas').map(m => m.nombre)) === '["CASA","ACASO"]' &&
      json(S.conosParaBuscarEsp(CAT.marcas, 'se').map(m => m.nombre)) === '["CASERATO","VERASENS"]' && json(S.conosParaBuscarEsp(CAT.marcas, 'ver').map(m => m.nombre)) === '["VERASENS"]')
    const fm = S.estado.ficha.especiales.form
    fm.marcas.push('m-cas')
    fm.productos.push('p-soft')
    S.pintarPartesFormEspecial()
    chk('el cono elegido, con su X para sacarlo', /CASERATO<\/span><button type="button" class="ad-apodo__quitar" data-esp-sacar-cono="m-cas"/.test(el(S, 'ad-esp-conos-elegidos').innerHTML))
    chk('el producto elegido, marcado', /data-esp-producto="p-soft" aria-pressed="true"/.test(el(S, 'ad-esp-productos').innerHTML))
    // Validaciones (los textos de la base)
    el(S, 'ad-esp-nombre').value = 'x'
    el(S, 'ad-esp-pct').value = '5'
    await S.guardarFormEspecial()
    chk('nombre corto: no llama y lo dice', !rpcDe(S, 'guardar_condicion_especial').length && /Poné un nombre a la condición/.test(el(S, 'ad-esp-error').textContent))
    el(S, 'ad-esp-nombre').value = 'Venta a Ostera'
    el(S, 'ad-esp-pct').value = '100'
    await S.guardarFormEspecial()
    chk('100 %: no llama y lo dice', !rpcDe(S, 'guardar_condicion_especial').length && el(S, 'ad-esp-error').textContent === 'El descuento va de 0 a 100 %.')
    el(S, 'ad-esp-pct').value = '5'
    await S.guardarFormEspecial()
    const g = rpcDe(S, 'guardar_condicion_especial')
    chk('alta: guardar_condicion_especial con p_id null, los conos y los productos', g.length === 1 &&
      json(g[0][1]) === json({ p_id: null, p_cliente_id: 'c1', p_nombre: 'Venta a Ostera', p_descuento_pct: 5, p_marcas: ['m-cas'], p_productos: ['p-soft'], p_activa: true }), json(g[0]?.[1]))
    chk('…relee la lista y cierra el formulario', rpcDe(S, 'condiciones_especiales_cliente').length === 2 && S.estado.ficha.especiales.form === null)
    chk('…y lo dice', S.__llamadas.exitos.includes('Condición «Venta a Ostera» guardada: −5 %.'), json(S.__llamadas.exitos))
    // Edición
    S.abrirFormEspecial('k1')
    const fe = S.estado.ficha.especiales.form
    chk('Editar: el formulario con lo que tenía', fe.id === 'k1' && fe.pct === 5 && json(fe.marcas) === '["m-cas","m-dip","m-ver"]' && el(S, 'ad-esp-nombre').value === 'Caserato · Verasens · Dipale')
    el(S, 'ad-esp-pct').value = '7,5'
    await S.guardarFormEspecial()
    const ge = rpcDe(S, 'guardar_condicion_especial')[1]
    chk('edición: con su p_id y el % nuevo', ge && ge[1].p_id === 'k1' && ge[1].p_descuento_pct === 7.5 && ge[1].p_activa === true, json(ge?.[1]))
    // Desactivar
    await S.cambiarActivaEspecial('k1')
    const gd = rpcDe(S, 'guardar_condicion_especial')[2]
    chk('el interruptor: la misma condición con p_activa false', gd && json(gd[1]) === json({ p_id: 'k1', p_cliente_id: 'c1', p_nombre: 'Caserato · Verasens · Dipale', p_descuento_pct: 5,
      p_marcas: ['m-cas', 'm-dip', 'm-ver'], p_productos: [], p_activa: false }), json(gd?.[1]))
    await S.cambiarActivaEspecial('k4')
    chk('y una inactiva se activa', rpcDe(S, 'guardar_condicion_especial')[3]?.[1].p_activa === true)
  }))
}
{
  // El error de la base, tal cual.
  const S = nuevo()
  prepararFicha(S, { rpc: async (n) => n === 'guardar_condicion_especial' ? { data: null, error: { message: 'Uno de los productos no es de esta fábrica.' } } : null })
  esperas.push(S.cargarEspecialesFicha(S.estado.ficha).then(async () => {
    S.abrirFormEspecial(null)
    el(S, 'ad-esp-nombre').value = 'Promo'
    el(S, 'ad-esp-pct').value = '5'
    await S.guardarFormEspecial()
    chk('el error de guardar_condicion_especial, tal cual, en el formulario', el(S, 'ad-esp-error').textContent === 'Uno de los productos no es de esta fábrica.' && S.estado.ficha.especiales.form !== null)
    await S.cambiarActivaEspecial('k2')
    chk('…y al cambiar Activa, debajo de la lista', /Uno de los productos no es de esta fábrica\./.test(el(S, 'ad-f-especiales').innerHTML))
  }))
}
{
  // Sin retiros:precios en la fábrica del cliente: ni se lee.
  const S = nuevo()
  prepararFicha(S)
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }]])
  esperas.push(S.cargarEspecialesFicha(S.estado.ficha).then(() => {
    chk('sin permiso de precios: no la lee y lo explica', !rpcDe(S, 'condiciones_especiales_cliente').length && /permiso de precios/.test(el(S, 'ad-f-especiales').innerHTML))
  }))
}
{
  // Escapa lo que viene de la base.
  const S = nuevo()
  chk('la fila escapa el nombre y el alcance', S.htmlFilaEspecial({ id: 'z', nombre: '<b>n</b>', descuento_pct: 5, activa: true, alcance: '<i>a</i>' }, false).includes('&lt;b&gt;n&lt;/b&gt;') &&
    S.htmlFilaEspecial({ id: 'z', nombre: 'n', descuento_pct: 5, activa: true, alcance: '<i>a</i>' }, false).includes('&lt;i&gt;a&lt;/i&gt;'))
}

// ── Corregir orden: el precio editable es el de lista ─────────────────────
{
  const S = nuevo()
  const r = S.renglonCorregirDeItem({ id: 'x', presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 3, precio: 34039.26, precio_lista: 35830.8, descuento_pct: 5, condicion_id: 'k1', tipo: 'retiro' })
  chk('Corregir orden: el precio del renglón es el de LISTA', r.precio === 35830.8)
  chk('…sin precio_lista (una orden vieja), el que tenía', S.renglonCorregirDeItem({ id: 'y', presentacion_id: 'pr-soft-sin', cajas: 1, precio: 22400 }).precio === 22400)
  const c = { cat: CAT, condiciones: [CONDS[0]], datos: { items: [] } }
  chk('…y el total estimado vuelve a aplicar las condiciones de la orden', S.precioEstimadoCorregir(c, r) === 34039.26 &&
    S.precioEstimadoCorregir(c, { ...r, marcaId: 'm-ven' }) === 35830.8 && S.precioEstimadoCorregir(c, { ...r, tipo: 'reposicion' }) === 0)
  chk('…un renglón nuevo sin precio toma el de lista de uno igual', S.precioListaCorregir({ datos: { items: [{ presentacion_id: 'pr-bar-con', marca_id: 'm-cas', precio: 34039.26, precio_lista: 35830.8, tipo: 'retiro' }] } },
    { tipo: 'retiro', presentacionId: 'pr-bar-con', marcaId: 'm-cas', insumoId: null, precio: null }) === 35830.8)
}

// ── Las hojas N1 / N2: el descuento al lado del precio ────────────────────
{
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.orden = { id: 'o9', orden: { ...ORDEN }, items: [{ ...ITEMS[0], descuento_pct: 5, condicion_id: 'k1' }, ITEMS[1]], condiciones: new Map([['k1', CONDS[0]]]) }
  const datos = { orden_id: 'o9', codigo: 'N-0009', items: [
    { orden: 1, tipo: 'retiro', descripcion: 'x', unidad: 'cajas', precio: 34039.26, cantidad: 3, cant_a: 1, cant_b: 2, subtotal_a: 34039.26, subtotal_b: 68078.52 },
    { orden: 2, tipo: 'retiro', descripcion: 'y', unidad: 'cajas', precio: 22400, cantidad: 2, cant_a: 1, cant_b: 1, subtotal_a: 22400, subtotal_b: 22400 },
  ] }
  const h = nb(S.htmlHojaPunto(datos, 'A'))
  chk('la hoja: "(−5 % · Caserato · Verasens · Dipale)" al lado del precio', h.includes('$ 34.039,26<br><small>(−5 % · Caserato · Verasens · Dipale)</small></td>'))
  chk('…solo en ese renglón', (h.match(/<small>/g) || []).length === 1)
}

// ── Las hojas N1 / N2 con el mismo nombre ─────────────────────────────────
{
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.orden = { id: 'o9', orden: { ...ORDEN }, items: ITEMS.slice(0, 2).concat([{ id: 'i9', orden: 3, insumo_id: 'ins1', cantidad: 2 }]) }
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
