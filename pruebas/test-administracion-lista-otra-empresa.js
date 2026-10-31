// VALORIZAR CON LA LISTA DE OTRA EMPRESA DEL GRUPO (27/10/2026, rama
// ci-prueba/acopios). FERNANDEZ RICARDO de Dolce tiene la "Lista 1 (Turi ·
// Tissot · Richard)" de Cucuruchos Nuss: al valorizar una orden de Dolce, el
// precio se propone con la presentación EQUIVALENTE de Nuss
// (_presentacion_en_unidad(p_presentacion_id, p_unidad = la de la lista)),
// leyendo precio_venta() de esa. Sin equivalente (vuelve la misma) o sin
// precio, el renglón queda vacío para escribirlo, como siempre. Una lista de
// la misma empresa no cambia nada. Se EJECUTAN las funciones reales.
//
//   node pruebas/test-administracion-lista-otra-empresa.js
'use strict'

const path = require('path')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)
const nb = (t) => String(t ?? '').replace(/ /g, ' ')

const CLIENTES = [
  { id: 'c-fer', nombre: 'FERNANDEZ RICARDO', lista_precio_id: 'l-turi', limite_credito: null, activo: true, cliente_principal_id: 'c-n-fer' },
  { id: 'c-ros', nombre: 'Almacén Rosario', lista_precio_id: 'l-d', limite_credito: null, activo: true },
]
const CAT = {
  productos: [{ id: 'p-cap', nombre: 'Capelina Grande' }, { id: 'p-tall', nombre: 'Tallarín al huevo' }],
  presentaciones: [
    { id: 'pr-d-cap', producto_id: 'p-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12 },
    { id: 'pr-d-tall', producto_id: 'p-tall', nombre: 'Caja x 10', con_cono: false, unidades_por_caja: 10 },
  ],
  marcas: [], insumos: [],
}
const ORDEN = { id: 'od7', numero: 7, codigo: 'D-0007', unidad_negocio_id: 'u-d', fecha: '2026-10-26', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c-fer', cargada_por: 'emp-9', cargada_en: '2026-10-26T15:00:00Z', transporte: null, observaciones: null }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr-d-cap', marca_id: null, cajas: 10, unidades: 120, precio_caja: null, subtotal: null, lote: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr-d-tall', marca_id: null, cajas: 5, unidades: 50, precio_caja: null, subtotal: null, lote: null },
]
const LISTAS = [{ id: 'l-turi', unidad_negocio_id: 'u-n' }, { id: 'l-d', unidad_negocio_id: 'u-d' }]
const PV = {
  'pr-n-cap': { precio_unitario: 800, precio_caja: 9600, unidades_por_caja: 12, producto_unitario: 800, conito_unitario: 0, papel_conito: null, lista: 'Lista 1 (Turi · Tissot · Richard)', recargo_pct: 0, sin_precio: false },
  'pr-d-cap': { precio_unitario: 700, precio_caja: 8400, unidades_por_caja: 12, producto_unitario: 700, conito_unitario: 0, papel_conito: null, lista: 'Dolce mayoristas', recargo_pct: 0, sin_precio: false },
}

function preparar(S, { orden = ORDEN, equivalente = { 'pr-d-cap': 'pr-n-cap', 'pr-d-tall': 'pr-d-tall' }, errorEquivalente = false, listas = LISTAS } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
  S.__tablas.ordenes_retiro = [orden]
  S.__tablas.orden_retiro_items = ITEMS
  S.__tablas.cliente_movimientos = [{ importe: 1000 }]
  S.__tablas.v_empleados_publico = [{ id: 'emp-9', nombre: 'Manuel' }]
  S.__tablas.listas_precios = typeof listas === 'function' ? listas : (filtros) => {
    const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')
    return { data: id ? listas.filter(l => l.id === id[2]) : listas, error: null }
  }
  S.__setRpc(async (n, p) => {
    if (n === '_presentacion_en_unidad') return errorEquivalente ? { data: null, error: { message: 'sin red' } } : { data: equivalente[p.p_presentacion_id] ?? p.p_presentacion_id, error: null }
    if (n === 'precio_venta') {
      const r = PV[p.p_presentacion_id]
      return { data: r && (p.p_lista_id === 'l-turi' ? p.p_presentacion_id === 'pr-n-cap' : p.p_presentacion_id !== 'pr-n-cap') ? r : { sin_precio: true, motivo: 'El producto no tiene precio en la lista.' }, error: null }
    }
    return { data: null, error: null }
  })
}
const rpcDe = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)

{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(async () => {
    const v = S.estado.orden.valorizar
    const q = S.__llamadas.consultas.find(c => c[0] === 'listas_precios')
    chk('lee de qué empresa es la lista del cliente', q && q[1].some(f => f[0] === 'eq' && f[1] === 'id' && f[2] === 'l-turi'))
    const eq = rpcDe(S, '_presentacion_en_unidad')
    chk('busca la presentación equivalente en la empresa de la lista', eq.some(r => r[1].p_presentacion_id === 'pr-d-cap' && r[1].p_unidad === 'u-n'))
    chk('una vez por renglón distinto', eq.length === 2)
    const pv = rpcDe(S, 'precio_venta')
    chk('precio_venta con la equivalente y la lista del cliente', pv.some(r => r[1].p_lista_id === 'l-turi' && r[1].p_presentacion_id === 'pr-n-cap' && r[1].p_fecha === '2026-10-26'))
    chk('la Capelina toma el precio de la de Nuss', v.precios.i1 === 9600 && v.desdeLista.has('i1'))
    chk('y dice de dónde salió', /lista Lista 1 \(Turi · Tissot · Richard\)/.test(nb(v.origen.i1?.texto)) && / · de Nuss$/.test(nb(v.origen.i1?.texto)), v.origen.i1?.texto)
    chk('el Tallarín (sin equivalente ni precio) queda vacío para escribirlo', v.precios.i2 === null && v.origen.i2?.grave === true)
    chk('sin equivalente no se pide dos veces el mismo precio', pv.filter(r => r[1].p_presentacion_id === 'pr-d-tall').length === 1)
    chk('el panel lo muestra', /\$ 96\.000,00/.test(nb(S.__els.get('ad-orden-cuerpo').innerHTML)))
    // Lo que va a la base: el precio por renglón de la orden (su id).
    S.cambiarPrecio('i2', 500)
    let params = null
    S.__setRpc(async (n, p) => { if (n === 'valorizar_con_condiciones') { params = p; return { data: { total: 98500, moneda: 'ARS' }, error: null } } return { data: null, error: null } })
    await S.guardarValorizacion()
    chk('valorizar manda el precio de cada renglón de la orden', params && params.p_orden_id === 'od7' && params.p_precios.i1 === 9600 && params.p_precios.i2 === 500, JSON.stringify(params))
  }))
}
{
  // Una lista de la MISMA empresa: como siempre, sin buscar equivalentes.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-ros' } })
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    chk('lista de la misma empresa: no busca equivalentes', !rpcDe(S, '_presentacion_en_unidad').length)
    chk('y propone el precio de su presentación', v.precios.i1 === 8400 && !/ · de /.test(v.origen.i1?.texto ?? ''))
  }))
}
{
  // Las listas de la empresa ya leídas: ni siquiera consulta listas_precios.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, cliente_id: 'c-ros' } })
  S.estado.listas = { unidad: 'u-d', filas: [{ id: 'l-d' }] }
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(() => {
    chk('si la lista es de las ya leídas de la empresa, no consulta de quién es', !S.__llamadas.consultas.some(c => c[0] === 'listas_precios'))
  }))
}
{
  // No se pudo leer de qué empresa es la lista: como siempre.
  const S = nuevo()
  preparar(S, { listas: () => ({ data: null, error: { message: 'sin red' } }) })
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    chk('sin saber de qué empresa es la lista: no busca equivalentes', !rpcDe(S, '_presentacion_en_unidad').length)
    chk('y el renglón sin precio queda vacío (no inventa)', v.precios.i1 === null)
  }))
}
{
  // Falla la equivalencia: se pide con la misma presentación (sin precio → vacío).
  const S = nuevo()
  preparar(S, { errorEquivalente: true })
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(() => {
    const v = S.estado.orden.valorizar
    chk('si falla la equivalencia, se pide con la misma (y queda vacío)', v.precios.i1 === null && !v.cargando)
    chk('no se queda cargando', S.estado.orden.valorizar.cargando === false)
  }))
}
{
  // La base no devuelve una presentación (null): se queda con la misma, sin pedir de más.
  const S = nuevo()
  preparar(S, { equivalente: { 'pr-d-cap': null, 'pr-d-tall': null } })
  S.__setRpc((orig => async (n, p) => n === '_presentacion_en_unidad' ? { data: null, error: null } : orig(n, p))(S.__rpcActual ?? (async (n, p) => {
    if (n === 'precio_venta') return { data: { sin_precio: true, motivo: 'El producto no tiene precio en la lista.' }, error: null }
    return { data: null, error: null }
  })))
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(() => {
    const pv = rpcDe(S, 'precio_venta')
    chk('sin equivalente (null): no vuelve a pedir el precio', pv.length === 2 && pv.every(r => typeof r[1].p_presentacion_id === 'string'), JSON.stringify(pv))
  }))
}
{
  // Ya valorizada: corregir no vuelve a buscar precios.
  const S = nuevo()
  preparar(S, { orden: { ...ORDEN, estado_valorizacion: 'valorizada' } })
  S.__tablas.orden_retiro_items = ITEMS.map(i => ({ ...i, precio_caja: 1000, subtotal: 1000 * i.cajas }))
  esperas.push(S.abrirOrden('od7').then(() => S.abrirValorizar()).then(() => {
    chk('corregir una valorizada: deja sus precios y no busca equivalentes', S.estado.orden.valorizar.precios.i1 === 1000 && !rpcDe(S, '_presentacion_en_unidad').length)
  }))
}

fin()
