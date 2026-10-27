// ADMINISTRACIÓN — los insumos POR BULTO (23/10/2026, rama
// ci-prueba/unidades-por-bulto).
//
// El pedido de Facu: un insumo con insumos.vista_preferida = 'bulto' (harina,
// azúcar, óleo, sal) y un contenido conocido se valoriza, se lista y se
// imprime POR BULTO ("Harina 000 · Júpiter · bulto de 25 kg · $ 17.500") y a
// la base va el precio por unidad base (precio del bulto / contenido). Debajo,
// chico, el total en kilos. Un insumo 'base' (lecitina) o sin contenido
// conocido sigue en su unidad, sin romperse.
//
// Exige, ejecutando las funciones REALES de modulos/administracion.html (y de
// js/retiros-comun.js y js/cantidades.js por los imports):
//  - lo que trae un bulto sale PRIMERO de insumos.contenido_bulto (24/10/2026:
//    lo lee cualquier usuario logueado; quien valoriza sin stock:ver ve la
//    harina por bolsa: $ 17.500 → 700 el kg; el catálogo le gana a los lotes
//    y al stock); solo si es null, de v_stock_insumos.contenido_unico, y SOLO
//    con stock:ver en la empresa (sin él no se consulta: todo en su unidad);
//  - el catálogo de insumos se lee con vista_preferida; los movimientos de la
//    orden, con contenido_por_bulto (manda el de los lotes del renglón);
//  - una orden valorizada: "4 bultos de 25 kg · Harina 000 · Júpiter",
//    "= 100 kg", "$ 17.500,00 x bulto de 25 kg" y chico "$ 700,00 por kg";
//    la lecitina sigue "x kg"; una bolsa de 30 kg a $ 17.500 guardada como
//    583,33 se ve $ 17.500,00 (no 17.499,90);
//  - valorizar: el precio de la lista (por kg) aparece en el campo POR BULTO,
//    lo escrito por bulto viaja por kg (18.000 la bolsa de 25 → 720), y el
//    subtotal es el de la base;
//  - un renglón cuyos lotes tienen dos presentaciones va por kg;
//  - la hoja con precios (la nueva, 26/10/2026): "Júpiter · bulto de 25 kg", 100 kg y "$ 17.500,00 /
//    bulto";
//  - la lista de precios: la tarjeta dice "$ 17.500,00 el bulto de 25 kg
//    ($ 700,00 por kg)", el editor pide "Precio por bulto de 25 kg" y guarda
//    700; la grilla guarda 18.000 la bolsa como 720 y no vuelve a guardar lo
//    que no cambió; "Aumentar todo" sube el precio del bulto.
//
//   node pruebas/test-administracion-insumos-bulto.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nb = s => String(s ?? '').replace(/[  ]/g, ' ')

// Harina 25 kg, azúcar 50 kg, óleo 20 kg (vista 'bulto'), lecitina (vista
// 'base', por kg), una harina en bolsa de 30 kg y una sal 'bulto' sin
// contenido conocido.
const CAT = {
  productos: [], presentaciones: [], marcas: [],
  insumos: [
    { id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido: 25 },
    { id: 'azucar', nombre: 'Azúcar', marca: null, unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido: 50 },
    { id: 'oleo', nombre: 'Óleo margarina', marca: 'Ultra', unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido: 20 },
    { id: 'lecitina', nombre: 'Lecitina de soja', marca: null, unidad_medida: 'kg', activo: true, vista_preferida: 'base', contenido: 25 },
    { id: 'harina30', nombre: 'Harina 0000', marca: 'Wali', unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido: 30 },
    { id: 'sal', nombre: 'Sal', marca: null, unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido: null },
  ],
}
const CLIENTES = [{ id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', limite_credito: null, activo: true }]
const ORDEN = (extra = {}) => ({ id: 'o1', numero: 12, codigo: 'N-0012', unidad_negocio_id: 'u-n', fecha: '2026-10-20', estado: 'confirmada',
  estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-20T15:00:00Z',
  transporte: null, observaciones: null, ...extra })
const ITEM = (id, insumo, cantidad, extra = {}) => ({ id, orden: 1, presentacion_id: null, marca_id: null, cajas: null, unidades: null,
  insumo_id: insumo, cantidad, precio_caja: null, subtotal: null, lote: null, ...extra })
const INSUMOS_LISTA = [
  { insumo_id: 'harina', insumo: 'Harina 000', unidad_medida: 'kg', precio_unitario: '700', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'azucar', insumo: 'Azúcar', unidad_medida: 'kg', precio_unitario: '350', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'oleo', insumo: 'Óleo margarina', unidad_medida: 'kg', precio_unitario: '875', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'lecitina', insumo: 'Lecitina de soja', unidad_medida: 'kg', precio_unitario: '4200', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
  { insumo_id: 'harina30', insumo: 'Harina 0000', unidad_medida: 'kg', precio_unitario: '583.3333', tipo: 'fijo', recargo_costo_pct: null, vigente_desde: '2026-10-01', sin_costo: false },
]

function nuevo({ stockVer = true } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }], ...(stockVer ? [['stock:ver', { todas: true }]] : [])])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.cliente_movimientos = []
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Emanuel Romero' }]
  S.__setRpc((n) => {
    if (n === 'precios_insumos_lista') return { data: INSUMOS_LISTA, error: null }
    return { data: null, error: null }
  })
  return S
}
const cuerpo = S => nb(S.__els.get('ad-orden-cuerpo').innerHTML)
const selDe = (S, tabla) => ((S.__llamadas.consultas.find(c => c[0] === tabla) || [null, []])[1].find(f => f[0] === 'select') || [null, ''])[1]

// ── De dónde sale lo que trae un bulto ───────────────────────────────────
{
  const S = nuevo()
  S.__tablas.v_stock_insumos = [{ insumo_id: 'harina', contenido_unico: '25' }, { insumo_id: 'mezcla', contenido_unico: null }]
  esperas.push(S.leerContenidosInsumos('u-n').then(m => {
    chk('lo que trae un bulto sale de v_stock_insumos.contenido_unico', m.get('harina') === 25 && !m.has('mezcla'))
    chk('… pidiendo solo insumo_id y contenido_unico', /contenido_unico/.test(selDe(S, 'v_stock_insumos')))
  }))
  const T = nuevo({ stockVer: false })
  T.__tablas.v_stock_insumos = [{ insumo_id: 'harina', contenido_unico: 25 }]
  esperas.push(T.leerContenidosInsumos('u-n').then(m => {
    chk('sin stock:ver no se consulta: no hay contenido y todo sigue en su unidad', m.size === 0 && !T.__llamadas.consultas.some(c => c[0] === 'v_stock_insumos'))
  }))
  const U = nuevo()
  U.__tablas.v_stock_insumos = () => ({ data: null, error: { message: 'falló' } })
  esperas.push(U.leerContenidosInsumos('u-n').then(m => chk('si la lectura falla, no se rompe: sin contenido', m.size === 0)))
  // El catálogo trae la vista y le suma el contenido.
  const V = nuevo()
  V.__tablas.productos_terminados = []
  V.__tablas.marcas_personalizadas = []
  V.__tablas.insumos = [{ id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', unidad_medida: 'kg', activo: true, vista_preferida: 'bulto' }]
  V.__tablas.v_stock_insumos = [{ insumo_id: 'harina', contenido_unico: 25 }]
  esperas.push(V.leerCatalogo('u-n').then(cat => {
    chk('el catálogo de insumos se lee con vista_preferida', /vista_preferida/.test(selDe(V, 'insumos')))
    chk('y cada insumo lleva su contenido', cat.insumos[0].contenido === 25 && cat.insumos[0].vista_preferida === 'bulto')
  }))
}

// ── El catálogo manda: insumos.contenido_bulto (24/10/2026) ──────────────
// La columna la lee cualquier usuario logueado; v_stock_insumos pide
// stock:ver. Quien valoriza con retiros:precios y SIN stock:ver (Yanina)
// tiene que ver la harina por bolsa igual.
const INSUMOS_CATALOGO = [
  { id: 'harina', nombre: 'Harina 000', marca: 'Júpiter', unidad_medida: 'kg', categoria: 'Materia prima', activo: true, vista_preferida: 'bulto', contenido_bulto: '25' },
  { id: 'colorante', nombre: 'Colorante', marca: 'Nico', unidad_medida: 'kg', categoria: 'Materia prima', activo: true, vista_preferida: 'bulto', contenido_bulto: '25' },
  { id: 'lecitina', nombre: 'Lecitina de soja', marca: null, unidad_medida: 'kg', categoria: 'Materia prima', activo: true, vista_preferida: 'base', contenido_bulto: '215' },
  { id: 'sal', nombre: 'Sal', marca: null, unidad_medida: 'kg', categoria: 'Materia prima', activo: true, vista_preferida: 'bulto', contenido_bulto: null },
]
function conCatalogoReal(S) {
  S.__tablas.productos_terminados = []
  S.__tablas.marcas_personalizadas = []
  S.__tablas.insumos = INSUMOS_CATALOGO
}
{
  // Sin stock:ver: el catálogo solo ya alcanza.
  const S = nuevo({ stockVer: false })
  conCatalogoReal(S)
  S.__tablas.v_stock_insumos = [{ insumo_id: 'sal', contenido_unico: 25 }]
  esperas.push(S.leerCatalogo('u-n').then(cat => {
    chk('el catálogo de insumos se lee con contenido_bulto', /contenido_bulto/.test(selDe(S, 'insumos')))
    const de = id => cat.insumos.find(i => i.id === id)
    chk('sin stock:ver, la harina igual trae 25 kg (del catálogo)', de('harina').contenido === 25)
    chk('el colorante Nico (bidón de 25 kg, vista bulto) trae 25', de('colorante').contenido === 25 && de('colorante').vista_preferida === 'bulto')
    chk('sin stock:ver no se consulta v_stock_insumos', !S.__llamadas.consultas.some(c => c[0] === 'v_stock_insumos'))
    chk('la sal (contenido_bulto null) y sin stock:ver: sin contenido, por kg', de('sal').contenido === null)
    S.estado.catalogo = cat
    S.__tablas.ordenes_retiro = [ORDEN()]
    S.__tablas.orden_retiro_items = [ITEM('i1', 'harina', 100), ITEM('i2', 'colorante', 50), ITEM('i3', 'lecitina', 2), ITEM('i4', 'sal', 50)]
    S.__tablas.stock_movimientos = []
    return S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
      const d = S.estado.orden
      const v = d.valorizar
      chk('Yanina (retiros:precios, sin stock:ver): la harina se valoriza POR BOLSA (17.500)', v.escritos.i1 === 17500 && v.modos.i1?.porBulto === true, JSON.stringify(v.modos.i1))
      chk('… el campo dice "Precio x bulto de 25 kg"', cuerpo(S).includes('Precio x bulto de 25 kg'))
      S.cambiarPrecio('i1', 17500)
      chk('… y $ 17.500 la bolsa manda 700 el kg', S.parametrosValorizar(d).p_precios.i1 === 700)
      chk('el colorante Nico también va por bidón de 25 kg', v.modos.i2?.porBulto === true && v.modos.i2.contenido === 25)
      chk('la lecitina (vista base) sigue por kg aunque el catálogo diga 215', !v.modos.i3?.porBulto && v.precios.i3 === 4200)
      chk('la sal sin contenido en ningún lado sigue por kg', !v.modos.i4?.porBulto)
    })
  }))
}
{
  // Con stock:ver: el catálogo va primero; el stock solo cubre los null.
  const S = nuevo()
  conCatalogoReal(S)
  S.__tablas.v_stock_insumos = [{ insumo_id: 'harina', contenido_unico: 50 }, { insumo_id: 'sal', contenido_unico: 25 }]
  esperas.push(S.leerCatalogo('u-n').then(cat => {
    const de = id => cat.insumos.find(i => i.id === id)
    chk('con stock:ver, el catálogo (25) le gana al stock (50)', de('harina').contenido === 25)
    chk('con contenido_bulto null, sale del stock como antes (sal 25)', de('sal').contenido === 25)
    S.estado.catalogo = cat
    S.__tablas.ordenes_retiro = [ORDEN({ estado_valorizacion: 'valorizada', total: 70000 })]
    S.__tablas.orden_retiro_items = [ITEM('i1', 'harina', 100, { precio_caja: 700, subtotal: 70000 })]
    S.__tablas.stock_movimientos = [{ insumo_id: 'harina', lote: 'H-9', cantidad: -100, contenido_por_bulto: 50 }]
    return S.abrirOrden('o1').then(() => {
      const h = cuerpo(S)
      chk('lotes de 50 kg pero el catálogo dice 25: manda el catálogo', h.includes('4 bultos de 25 kg · Harina 000') && h.includes('$ 17.500,00 x bulto de 25 kg'), h.slice(0, 300))
    })
  }))
}

// ── Una orden ya valorizada ──────────────────────────────────────────────
{
  const S = nuevo()
  S.__tablas.ordenes_retiro = [ORDEN({ estado_valorizacion: 'valorizada', total: 143700 })]
  S.__tablas.orden_retiro_items = [
    ITEM('i1', 'harina', 100, { precio_caja: 700, subtotal: 70000 }),
    ITEM('i2', 'lecitina', 2, { precio_caja: 4200, subtotal: 8400 }),
    ITEM('i3', 'harina30', 90, { precio_caja: 583.33, subtotal: 52500 }),
    ITEM('i4', 'azucar', 50, { precio_caja: 350, subtotal: 17500 }),
  ]
  S.__tablas.stock_movimientos = [
    { insumo_id: 'harina', lote: 'H-1', cantidad: -100, contenido_por_bulto: 25 },
    { insumo_id: 'lecitina', lote: 'L-1', cantidad: -2, contenido_por_bulto: null },
    { insumo_id: 'harina30', lote: 'W-1', cantidad: -90, contenido_por_bulto: 30 },
  ]
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('los movimientos de la orden se leen con contenido_por_bulto', /contenido_por_bulto/.test(selDe(S, 'stock_movimientos')))
    chk('harina: "4 bultos de 25 kg · Harina 000 · Júpiter"', h.includes('4 bultos de 25 kg · Harina 000 · Júpiter'), h.slice(0, 400))
    chk('harina: debajo, chico, "= 100 kg"', h.includes('= 100 kg · Insumo'))
    chk('harina: "$ 17.500,00 x bulto de 25 kg"', h.includes('$ 17.500,00 x bulto de 25 kg'))
    chk('harina: chico, "$ 700,00 por kg"', h.includes('$ 700,00 por kg'))
    chk('lecitina (vista base): "2 kg" y "$ 4.200,00 x kg"', h.includes('2 kg · Lecitina de soja') && h.includes('$ 4.200,00 x kg'))
    chk('bolsa de 30 kg guardada 583,33: se ve $ 17.500,00, no 17.499,90', h.includes('$ 17.500,00 x bulto de 30 kg') && !h.includes('17.499,9'))
    chk('azúcar sin movimientos que se vean: usa el contenido de la empresa (50 kg)', h.includes('1 bulto de 50 kg · Azúcar') && h.includes('$ 17.500,00 x bulto de 50 kg'))
    const hoja = nb(S.htmlHoja(S.ordenParaHoja(S.estado.orden), { conPrecios: true }))
    chk('la hoja: CANT. 4, "Júpiter · bulto de 25 kg" y TOTAL 100 kg', hoja.includes('rh-cajas">4</td><td class="rh-producto">Harina 000</td><td class="rh-desc">Júpiter · bulto de 25 kg</td><td class="rh-num rh-tot">100 kg</td>'), hoja.slice(hoja.indexOf('Harina 000') - 80, hoja.indexOf('Harina 000') + 200))
    chk('la hoja: "$ 17.500,00 / bulto"', hoja.includes('$ 17.500,00 / bulto'))
    chk('la hoja: la lecitina sigue "/ kg"', hoja.includes('$ 4.200,00 / kg'))
    chk('la hoja: la bolsa de 30 kg tampoco dice 17.499,90', !hoja.includes('17.499,9'))
    const texto = S.textoOrden(S.ordenParaHoja(S.estado.orden))
    chk('el texto para compartir dice los bultos', nb(texto).includes('- 4 bultos de 25 kg (100 kg) · Harina 000 · Júpiter'))
  }))
}

// ── Valorizar ────────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.__tablas.ordenes_retiro = [ORDEN()]
  S.__tablas.orden_retiro_items = [
    ITEM('i1', 'harina', 100),
    ITEM('i2', 'lecitina', 2),
    ITEM('i3', 'harina30', 90),
    ITEM('i5', 'oleo', 40),
    ITEM('i6', 'sal', 50),
  ]
  S.__tablas.stock_movimientos = []
  esperas.push(S.abrirOrden('o1').then(() => S.abrirValorizar()).then(() => {
    const d = S.estado.orden
    const v = d.valorizar
    chk('harina: el precio de la lista (700 el kg) se ve por bulto: 17.500', v.escritos.i1 === 17500 && v.precios.i1 === 700)
    chk('óleo: 875 el kg → 17.500 el balde de 20 kg', v.escritos.i5 === 17500 && v.precios.i5 === 875)
    chk('bolsa de 30 kg: 583,3333 de la lista → 17.500 por bulto, y se manda 583,33333333', v.escritos.i3 === 17500 && v.precios.i3 === 583.33333333)
    chk('lecitina: por kg, tal cual', v.precios.i2 === 4200 && v.escritos.i2 === undefined)
    chk('sal (bulto sin contenido conocido): por kg, sin romperse', !v.modos.i6?.porBulto)
    const h = cuerpo(S)
    chk('el campo de la harina dice "Precio x bulto de 25 kg"', h.includes('Precio x bulto de 25 kg'))
    chk('el de la lecitina, "Precio x kg"', h.includes('Precio x kg'))
    const campo = S.__doc.getElementById('ad-precio-i1')
    chk('el subtotal de la bolsa de 30 kg es el de la base: $ 52.500,00 (3 bolsas)', S.subtotalValorizar(d, d.items[2]) === 52500)
    // Se escribe 18.000 la bolsa de harina.
    S.cambiarPrecio('i1', 18000)
    chk('18.000 la bolsa de 25 kg viaja como 720 el kg', S.parametrosValorizar(d).p_precios.i1 === 720)
    chk('el subtotal: 4 bolsas × 18.000 = 72.000', S.subtotalValorizar(d, d.items[0]) === 72000)
    chk('la lecitina viaja por kg, tal cual', S.parametrosValorizar(d).p_precios.i2 === 4200)
    S.cambiarPrecio('i2', 4300)
    chk('cambiar la lecitina no la convierte', S.parametrosValorizar(d).p_precios.i2 === 4300)
    void campo
  }))
}

// ── Lotes con dos presentaciones: no hay "un" bulto ───────────────────────
{
  const S = nuevo()
  S.__tablas.ordenes_retiro = [ORDEN({ estado_valorizacion: 'valorizada', total: 52500 })]
  S.__tablas.orden_retiro_items = [ITEM('i1', 'harina', 75, { precio_caja: 700, subtotal: 52500 })]
  S.__tablas.stock_movimientos = [
    { insumo_id: 'harina', lote: 'H-1', cantidad: -25, contenido_por_bulto: 25 },
    { insumo_id: 'harina', lote: 'H-2', cantidad: -50, contenido_por_bulto: 50 },
  ]
  esperas.push(S.abrirOrden('o1').then(() => {
    const h = cuerpo(S)
    chk('lotes de 25 y de 50 kg: el renglón va por kg', h.includes('75 kg · Harina 000') && h.includes('$ 700,00 x kg') && !h.includes('bulto'))
  }))
}

// ── La lista de precios: la tarjeta de insumos ───────────────────────────
{
  const S = nuevo()
  const f = INSUMOS_LISTA[0]
  chk('la tarjeta: "Precio fijo $ 17.500,00 el bulto de 25 kg ($ 700,00 por kg)"',
    nb(S.textoRenglonInsumo(f, 'ARS')) === 'Precio fijo $ 17.500,00 el bulto de 25 kg ($ 700,00 por kg)', S.textoRenglonInsumo(f, 'ARS'))
  chk('la lecitina sigue "Precio fijo $ 4.200,00 por kg"', nb(S.textoRenglonInsumo(INSUMOS_LISTA[3], 'ARS')) === 'Precio fijo $ 4.200,00 por kg')
  chk('la bolsa de 30 kg (583,3333 guardado) se ve $ 17.500,00', nb(S.textoRenglonInsumo(INSUMOS_LISTA[4], 'ARS')).startsWith('Precio fijo $ 17.500,00 el bulto de 30 kg'))
  const costo = { ...f, tipo: 'costo_mas_pct', recargo_costo_pct: '10', precio_unitario: '770' }
  chk('costo + %: "→ $ 19.250,00 el bulto de 25 kg"', nb(S.textoRenglonInsumo(costo, 'ARS')).includes('→ $ 19.250,00 el bulto de 25 kg ($ 770,00 por kg)'))
  // El editor de un precio fijo.
  S.estado.lista = { id: 'l1', insumos: { filas: INSUMOS_LISTA, costos: null, error: null }, insumosEd: null, pendientes: new Map(), filas: [], precios: [] }
  S.estado.listas = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true }]
  S.abrirEditorInsumoLista('harina')
  const ed = S.estado.lista.insumosEd
  chk('el editor abre con el precio del bulto (17.500)', ed.valor === 17500)
  const html = nb(S.__els.get('ad-lista-insumos').innerHTML)
  chk('el campo dice "Precio por bulto de 25 kg"', html.includes('Precio por bulto de 25 kg'))
  chk('se guarda por kg: 17.500 la bolsa → p_precio_unitario 700', S.parametrosPrecioInsumoLista('l1', ed, 17500).p_precio_unitario === 700)
  chk('… y 18.000 → 720', S.parametrosPrecioInsumoLista('l1', ed, 18000).p_precio_unitario === 720)
  chk('la vista previa lo dice por bulto', nb(S.textoPreviaInsumoLista(S.estado.lista, 18000)).includes('$ 18.000,00 el bulto de 25 kg ($ 720,00 por kg)'))
  S.abrirEditorInsumoLista('lecitina')
  const ed2 = S.estado.lista.insumosEd
  chk('la lecitina abre por kg y se guarda tal cual', ed2.valor === 4200 && S.parametrosPrecioInsumoLista('l1', ed2, 4300).p_precio_unitario === 4300)
}

// ── La lista de precios: la grilla ───────────────────────────────────────
{
  const S = nuevo()
  const filas = S.filasGrilla(CAT)
  const fh = filas.find(f => f.insumoId === 'harina')
  chk('la fila de la harina dice "Júpiter · por bulto de 25 kg"', nb(S.presentacionFilaInsumo(fh)) === 'Júpiter · por bulto de 25 kg')
  chk('el Excel sigue por kg (la presentación de la fila no cambia)', nb(fh.presentacion) === 'Júpiter · por kg')
  const hoy = '2026-10-23'
  const l = {
    id: 'l1', filas,
    precios: [{ insumo_id: 'harina', presentacion_id: null, precio_caja: 700, precio_unitario: null, recargo_costo_pct: null, vigente_desde: '2026-10-01', cargado_en: '2026-10-01T10:00:00Z' }],
    pendientes: new Map([['ins:harina', 18000], ['ins:lecitina', 4300]]),
  }
  S.estado.listas = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true, es_base: true }]
  const items = S.preciosAGuardar(l, hoy)
  const ih = items.find(x => x.insumo_id === 'harina')
  chk('la grilla guarda 18.000 la bolsa como 720 el kg', ih && ih.precio_caja === 720, JSON.stringify(items))
  chk('la lecitina se guarda tal cual', items.find(x => x.insumo_id === 'lecitina')?.precio_caja === 4300)
  l.pendientes = new Map([['ins:harina', 17500]])
  chk('17.500 la bolsa, igual al vigente (700 el kg), no se vuelve a guardar', S.preciosAGuardar(l, hoy).length === 0)
  const html = nb(S.htmlFilaPrecio(fh, l, hoy))
  chk('la fila dice el vigente por bulto: "$ 17.500,00 el bulto de 25 kg"', html.includes('$ 17.500,00 el bulto de 25 kg desde'))
  const subido = S.calcularAumento(l, 10, hoy)
  chk('"Aumentar todo un 10 %" sube la bolsa: 19.250', subido.get('ins:harina') === 19250)
}

fin()
