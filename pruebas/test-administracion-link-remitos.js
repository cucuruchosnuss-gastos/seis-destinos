// LO QUE QUEDÓ EN ADMINISTRACIÓN DE LOS REMITOS DE ROSARIO (28/10/2026, rama
// ci-prueba/modulo-remitos-dolce). La revisión se mudó a Remitos Dolce
// (test-remitos-dolce-revisar.js); en Administración quedan:
//  - Órdenes de Dolce (sin control de stock) con la lista DE SIEMPRE y un link
//    chico "Remitos Dolce →" arriba; sin precargados, sin solapas de
//    talonario, sin la vista del remito;
//  - Nuss (con control): Órdenes sin cambios y sin el link;
//  - la ficha y la hoja de una orden con "Remito N° X" (js/remitos-comun.js).
// Se EJECUTAN las funciones reales.
//
//   node pruebas/test-administracion-link-remitos.js
'use strict'

const path = require('path')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const nuevo = () => construirAdministracion(ARCHIVO, { funciones: ['pintarLinkRemitos'] })

const CAT = {
  productos: [
    { id: 'p-cono', nombre: 'Cono dulce 48', categoria: null, activo: true },
    { id: 'p-cap', nombre: 'Capelina Grande', categoria: 'pasta', activo: true },
    { id: 'p-viejo', nombre: 'Producto apagado', categoria: null, activo: false },
  ],
  presentaciones: [
    { id: 'pr-cono', producto_id: 'p-cono', nombre: 'Caja x 48 con cono', con_cono: true, unidades_por_caja: 48, activa: true },
    { id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12, activa: true },
    { id: 'pr-cap-vieja', producto_id: 'p-cap', nombre: 'Caja vieja', con_cono: false, activa: false },
    { id: 'pr-apagado', producto_id: 'p-viejo', nombre: 'Caja', con_cono: false, activa: true },
  ],
  marcas: [{ id: 'm-lel', nombre: 'LELONA' }, { id: 'm-ler', nombre: 'LEROMA' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [
  { id: 'c-alm', nombre: 'Almacén Rosario', razon_social: 'ROSARIO SA', apodos: ['La Rosa'], localidad: 'Rosario', activo: true },
  { id: 'c-off', nombre: 'Almacén Cerrado', activo: false },
]
const ITEMS_R1 = [
  { texto_leido: 'Cono dulce 48 con cono Lelona', cantidad: 10, presentacion_id: 'pr-cono', marca_id: 'm-lel', insumo_id: null, lotes: [], revisar: true, omitir: false, nota: 'leí Lelona, ¿LEROMA?' },
  { texto_leido: 'Capelinas grandes', cantidad: 84, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: true, omitir: false, nota: 'no encontré el producto' },
  { texto_leido: 'Harina 000 x 25', cantidad: 25, presentacion_id: null, marca_id: null, insumo_id: 'ins-h', lotes: [], revisar: false, omitir: false, nota: '' },
  { texto_leido: 'Envases térmicos', cantidad: 5, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: true, omitir: false, nota: '¿de terceros?' },
]
const R1 = { id: 'r1', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r1.jpg', subido_en: '2026-10-27T12:00:00+00:00', estado: 'precargada', talonario: 'oficial',
  numero_remito: '0001-00003100', numero_remito_n: 100003100, fecha: '2026-10-26', cliente_id: null, cliente_leido: 'Almacen Rosar', transporte: null, observaciones: null, items: ITEMS_R1 }
const R2 = { id: 'r2', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r2.jpg', subido_en: '2026-10-27T13:00:00+00:00', estado: 'error', talonario: 'oficial', numero_remito: null, items: [], error: 'La foto está borrosa' }
const R3 = { id: 'r3', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r3.jpg', subido_en: '2026-10-27T09:00:00+00:00', estado: 'leyendo', talonario: 'oficial', items: [] }
const R4 = { id: 'r4', unidad_negocio_id: 'u-d', foto_path: 'x', subido_en: '2026-10-27T14:00:00+00:00', estado: 'confirmada', items: [] }
const R5 = { id: 'r5', unidad_negocio_id: 'u-d', foto_path: 'x', subido_en: '2026-10-27T15:00:00+00:00', estado: 'descartada', items: [] }
const R6 = { id: 'r6', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r6.jpg', subido_en: '2026-10-27T11:00:00+00:00', estado: 'precargada', talonario: 'acopio',
  numero_remito: '977492', numero_remito_n: 977492, fecha: '2026-10-25', cliente_id: 'c-alm', items: [] }
const ORDENES = [
  { id: 'o1', codigo: 'D-0001', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'valorizada', total: 50000, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: '0001-00003050', numero_remito_n: 100003050, talonario: null },
  { id: 'o2', codigo: 'D-0002', fecha: '2026-10-21', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: null, numero_remito_n: null, talonario: null },
  { id: 'o3', codigo: 'D-0003', fecha: '2026-10-22', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: '0001-00003099', numero_remito_n: 100003099, talonario: 'oficial' },
  { id: 'o4', codigo: 'D-0004', fecha: '2026-10-23', estado: 'confirmada', estado_valorizacion: 'valorizada', total: 12000, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: '977490', numero_remito_n: 977490, talonario: 'acopio' },
  { id: 'o5', codigo: 'D-0005', fecha: '2026-10-24', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', numero_remito: null, numero_remito_n: null, talonario: null },
]

function enDolce(S, { cargar = true } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.empresas = [...S.estado.empresas]
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:cargar', { unidades: ['u-d'] }], ...(cargar ? [] : [])])
  if (!cargar) S.estado.misTareas.delete('retiros:cargar')
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.remitosResueltos = new Set()
  S.estado.talonarioOrdenes = 'oficial'
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
  S.__tablas.remitos_precarga = (filtros) => {
    const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')
    const todas = JSON.parse(JSON.stringify([R1, R2, R3, R4, R5, R6]))
    return { data: id ? todas.filter(r => r.id === id[2]) : todas, error: null }
  }
  S.__tablas.ordenes_retiro = JSON.parse(JSON.stringify(ORDENES))
  S.__tablas.orden_retiro_items = []
}
// ═══ Dolce (sin control): la lista de siempre y el link ═════════════════
{
  const S = nuevo()
  enDolce(S)
  S.estado.sinControl = new Map()
  S.__tablas.unidades_negocio = [{ id: 'u-d', controla_stock_terminado: false }]
  S.__tablas.remitos_precarga = [R1]
  esperas.push(S.mostrarOrdenes().then(() => {
    chk('Dolce: se lee si controla el stock', S.sinControlStockEmpresa('u-d') === true)
    chk('Dolce: NO se consultan los remitos precargados', !S.__llamadas.consultas.some(c => c[0] === 'remitos_precarga'))
    const link = S.__els.get('ad-remitos').innerHTML
    chk('Dolce: el link chico "Remitos Dolce →" a la pestaña Revisar', link === '<p class="ad-link-remitos"><a href="remitos-dolce.html?pestana=revisar">Remitos Dolce →</a></p>', link)
    const esperado = S.estado.ordenes.map(S.htmlFilaOrden).join('')
    chk('Dolce: la lista es la de siempre (htmlFilaOrden, en el orden de la base)', S.__els.get('ad-ordenes-lista').innerHTML === esperado && !/ad-rm-numero/.test(esperado))
    chk('Dolce: la cuenta, todas', S.__els.get('ad-ordenes-cuenta').textContent === '5 órdenes')
  }))
}
// ═══ Nuss (con control): Órdenes SIN CAMBIOS ═════════════════════════════
{
  const S = nuevo()
  S.estado.empresaId = 'u-n'
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.unidades_negocio = [{ id: 'u-n', controla_stock_terminado: true }]
  S.__tablas.ordenes_retiro = JSON.parse(JSON.stringify(ORDENES))
  S.__tablas.orden_retiro_items = []
  S.__tablas.remitos_precarga = [R1]
  esperas.push(S.mostrarOrdenes().then(() => {
    chk('Nuss: se lee si controla el stock', S.__llamadas.consultas.some(c => c[0] === 'unidades_negocio' && c[1].some(f => f[0] === 'select' && f[1] === 'controla_stock_terminado')))
    chk('Nuss: NO se consultan los remitos precargados', !S.__llamadas.consultas.some(c => c[0] === 'remitos_precarga'))
    chk('Nuss: sin el link a Remitos Dolce', S.__els.get('ad-remitos').innerHTML === '')
    const esperado = S.estado.ordenes.map(S.htmlFilaOrden).join('')
    chk('Nuss: la lista es la de siempre (htmlFilaOrden, en el orden de la base)', S.__els.get('ad-ordenes-lista').innerHTML === esperado && !/ad-rm-numero/.test(esperado))
    chk('Nuss: la cuenta, todas', S.__els.get('ad-ordenes-cuenta').textContent === '5 órdenes')
  }))
}
{
  // Sin poder leer el dato: como una fábrica con control.
  const S = nuevo()
  S.estado.empresaId = 'u-d'
  S.__tablas.unidades_negocio = () => ({ data: null, error: { message: 'sin red' } })
  esperas.push(S.leerSinControl('u-d').then(() => {
    S.pintarLinkRemitos()
    chk('si no se pudo leer si controla el stock, es una fábrica de siempre (sin link)', S.sinControlStockEmpresa('u-d') === false && S.__els.get('ad-remitos').innerHTML === '')
  }))
  const T = nuevo()
  T.__tablas.unidades_negocio = [{ id: 'u-d', controla_stock_terminado: false }]
  esperas.push(T.leerSinControl('u-d').then(() => chk('controla_stock_terminado = false → sin control', T.sinControlStockEmpresa('u-d') === true)))
  const U = nuevo()
  U.__tablas.unidades_negocio = [{ id: 'u-m', controla_stock_terminado: null }]
  esperas.push(U.leerSinControl('u-m').then(() => chk('null no es "sin control"', U.sinControlStockEmpresa('u-m') === false)))
}


// ═══ La ficha y la hoja de una orden con N° de remito ═══════════════════
{
  const S = nuevo()
  enDolce(S)
  const base = { id: 'o1', numero: 1, codigo: 'D-0001', unidad_negocio_id: 'u-d', fecha: '2026-10-20', estado: 'confirmada', estado_valorizacion: 'pendiente', total: 0, moneda: 'ARS', cliente_id: 'c-alm', cargada_por: 'emp-9', cargada_en: '2026-10-20T15:00:00Z', transporte: null, observaciones: 'Remito 0001-00003050' }
  const d = (o) => ({ orden: o, items: [], lotes: [], lotesInsumos: null, planillas: [], facturas: [], valorizar: null })
  const conRemito = S.htmlDetalleOrden(d({ ...base, numero_remito: '0001-00003050', talonario: null }), CAT)
  chk('la ficha: "Remito N° X"', /<p class="ad-orden-remito" data-orden-remito>Remito N° 0001-00003050<\/p>/.test(conRemito))
  const acopio = S.htmlDetalleOrden(d({ ...base, numero_remito: '977490', talonario: 'acopio' }), CAT)
  chk('la ficha de acopio: "Acopio N° X" y el sello', /Acopio N° 977490/.test(acopio) && /ad-sello--acopio">Acopio/.test(acopio))
  const sin = S.htmlDetalleOrden(d({ ...base }), CAT)
  chk('sin N° de remito la ficha no cambia', !/ad-orden-remito/.test(sin) && !/ad-sello--acopio/.test(sin))
  S.estado.nombres = new Map()
  const hoja = S.ordenParaHoja(d({ ...base, numero_remito: '0001-00003050', talonario: null }))
  chk('la hoja recibe el N° de remito', hoja.numeroRemito === '0001-00003050' && hoja.talonario === null)
  chk('…y la hoja impresa dice "Remito N° X"', /<span class="rh-orden__remito">Remito N° 0001-00003050<\/span>/.test(S.htmlHoja(hoja, { copias: ['ORIGINAL'] })))
  const hojaA = S.ordenParaHoja(d({ ...base, numero_remito: '977490', talonario: 'acopio' }))
  chk('la de acopio: "Acopio N°"', hojaA.talonario === 'acopio' && /Acopio N° 977490/.test(S.htmlHoja(hojaA, { copias: ['ORIGINAL'] })))
  chk('sin N°, la hoja no lo nombra', S.ordenParaHoja(d(base)).numeroRemito === null && !/rh-orden__remito/.test(S.htmlHoja(S.ordenParaHoja(d(base)), { copias: ['ORIGINAL'] })))
  esperas.push((async () => {
    S.__tablas.ordenes_retiro = [base]
    await S.leerOrden('o1')
    const c = S.__llamadas.consultas.find(x => x[0] === 'ordenes_retiro')
    chk('la orden se lee con numero_remito y talonario', c[1].some(f => f[0] === 'select' && /numero_remito/.test(f[1]) && /talonario/.test(f[1])))
    S.__llamadas.consultas.length = 0
    await S.leerOrdenes('u-d', { desde: '', hasta: '', clienteId: '', estado: '', sinValorizar: false, sinComision: false })
    const l = S.__llamadas.consultas.find(x => x[0] === 'ordenes_retiro')
    chk('la lista se lee con numero_remito, numero_remito_n y talonario', l[1].some(f => f[0] === 'select' && /numero_remito, numero_remito_n, talonario/.test(f[1])))
  })())
}


// ═══ En la página: la revisión se fue ═══════════════════════════════════
{
  chk('sin la vista del remito ni las solapas de talonario', !/id="ad-vista-remito"/.test(FUENTE) && !/id="ad-ordenes-talonario"/.test(FUENTE) && !/id="ad-remito-cuerpo"/.test(FUENTE))
  chk('sin las funciones de la revisión', !/function (abrirRemito|confirmarRemito|htmlRemitosPrecarga|cargarAcopiosRemito|ordenesVisibles)\(/.test(FUENTE))
  chk('el catálogo de un renglón y el "Remito N° X" vienen de js/remitos-comun.js', /import \{ textoNumeroRemito, htmlSelloAcopio, presentacionRemito, nombreRenglonRemito, gruposRemito, textoUnidadesRemito, nombreConoPorIdRemito \} from '\.\.\/js\/remitos-comun\.js'/.test(FUENTE))
  chk('Nuevo acopio ordena el catálogo con las categorías de la pantalla', /gruposRemito\(cat, busqueda, CATEGORIAS_PRODUCTO\)/.test(FUENTE))
}

fin()
