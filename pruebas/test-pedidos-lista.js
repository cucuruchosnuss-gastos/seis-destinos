// Parte 4 de Pedidos: la lista (pedidos_de) con la barra de avance y los
// filtros, y el detalle de un pedido con el avance por renglón
// (marcar_avance_pedido), "Cumplido", el tachado, y los dos únicos estados que
// se eligen a mano: entregado y anulado (cambiar_estado_pedido).
//
//   node pruebas/test-pedidos-lista.js

const path = require('path')
const fs = require('fs')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirPedidos(ARCHIVO)

const CAT = {
  productos: [{ id: 'p-cuc', nombre: 'Cucurucho grande', tipo_masa: 'Común' }],
  presentaciones: [{ id: 'pr-1', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false }],
  marcas: [],
}
const PEDIDOS = [
  { id: 'a', numero: 3, fecha: '2026-09-22', fecha_entrega: '2026-09-25', cliente: 'Anatolia', estado: 'en_produccion', cajas_pedidas: 40, cajas_cumplidas: 22, renglones: 3, sin_interpretar: 1, observaciones: null },
  { id: 'b', numero: 2, fecha: '2026-09-21', fecha_entrega: null, cliente: 'Ñandú', estado: 'listo', cajas_pedidas: 10, cajas_cumplidas: 10, renglones: 1, sin_interpretar: 0, observaciones: null },
  { id: 'c', numero: 1, fecha: '2026-09-20', fecha_entrega: null, cliente: 'Viejo', estado: 'pendiente', cajas_pedidas: 5, cajas_cumplidas: 0, renglones: 2, sin_interpretar: 2, observaciones: null },
]
const PEDIDO = { id: 'a', numero: 3, fecha: '2026-09-22', fecha_entrega: '2026-09-25', estado: 'en_produccion', observaciones: 'urgente',
  texto_original: null, anulado_motivo: null, cliente_id: 'c1', unidad_negocio_id: 'u-cn', clientes: { nombre: 'Anatolia' } }
const ITEMS = [
  { id: 'i1', orden: 1, presentacion_id: 'pr-1', marca_id: null, cajas: 30, cajas_cumplidas: 12, texto_libre: null, observacion: null },
  { id: 'i2', orden: 2, presentacion_id: 'pr-1', marca_id: null, cajas: 5, cajas_cumplidas: 5, texto_libre: null, observacion: 'sin sellar' },
  { id: 'i3', orden: 3, presentacion_id: null, marca_id: null, cajas: 5, cajas_cumplidas: 5, texto_libre: 'las rosas', observacion: null },
]

function conDetalle(S, pedido = PEDIDO, items = ITEMS) {
  S.estado.catalogo = CAT
  S.estado.detalle = { id: pedido.id, pedido: { ...pedido }, items: items.map(i => ({ ...i })), error: null, aviso: null, errores: {}, accion: null }
  return S.estado.detalle
}

// ── la barra de avance ───────────────────────────────────────────────────
{
  const S = nuevo()
  chk('22 de 40 es 55 %', S.porcentajeAvance(22, 40) === 55)
  chk('nada cumplido es 0 %', S.porcentajeAvance(0, 40) === 0)
  chk('todo es 100 %', S.porcentajeAvance(40, 40) === 100)
  chk('nunca pasa de 100', S.porcentajeAvance(50, 40) === 100)
  chk('sin cajas pedidas es 0, no NaN', S.porcentajeAvance(0, 0) === 0 && S.porcentajeAvance(null, null) === 0)
  chk('el texto: "22 de 40 cajas"', S.textoAvance(22, 40) === '22 de 40 cajas')
  chk('con decimales y miles', S.textoAvance(10.5, 1500) === '10,5 de 1.500 cajas')
  const h = S.htmlAvance(22, 40)
  chk('la barra lleva el ancho del porcentaje', /style="width: 55%"/.test(h))
  chk('es una barra de progreso accesible', /role="progressbar"/.test(h) && /aria-valuenow="55"/.test(h))
  chk('y dice "22 de 40 cajas"', h.includes('22 de 40 cajas'))
  chk('a medias no está completa', !/pe-avance--completo/.test(h))
  chk('completa se marca', /pe-avance--completo/.test(S.htmlAvance(40, 40)))
}

// ── la fila de la lista ──────────────────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlFilaPedido(PEDIDOS[0])
  chk('muestra el número', /Nº 3/.test(h))
  chk('muestra la fecha y la entrega', h.includes('Pedido 22/09/2026') && h.includes('Entrega 25/09/2026'))
  chk('sin entrega no inventa una', !S.htmlFilaPedido(PEDIDOS[1]).includes('Entrega'))
  chk('muestra el cliente', h.includes('Anatolia'))
  chk('muestra el estado', /pe-estado--en_produccion/.test(h) && h.includes('En producción'))
  chk('muestra la barra "22 de 40 cajas"', h.includes('22 de 40 cajas') && /width: 55%/.test(h))
  chk('los renglones sin identificar se dicen', h.includes('1 sin identificar'))
  chk('sin renglones sin identificar no hay sello', !/sin identificar/.test(S.htmlFilaPedido(PEDIDOS[1])))
  const listo = S.htmlFilaPedido(PEDIDOS[1])
  chk('un pedido LISTO lleva su chip verde', /pe-estado--listo/.test(listo) && /\.pe-estado--listo \{ background: var\(--verde\)/.test(src))
  chk('un anulado se ve anulado', /pe-fila--anulada/.test(S.htmlFilaPedido({ ...PEDIDOS[0], estado: 'anulado' })))
  chk('un estado desconocido no inventa una clase', !/pe-estado--raro/.test(S.htmlEstado('raro')))
}

// ── los filtros ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('sin filtro vienen todos', S.pedidosVisibles(PEDIDOS, { sinIdentificar: false }).length === 3)
  const sinId = S.pedidosVisibles(PEDIDOS, { sinIdentificar: true })
  chk('"solo con renglones sin identificar" deja los que tienen', sinId.map(p => p.id).join() === 'a,c')
  const p = S.parametrosPedidosDe('u-cn', { estado: 'listo', desde: '2026-09-01', hasta: '2026-09-30', sinIdentificar: true })
  chk('los cuatro parámetros de pedidos_de', JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_desde', 'p_estado', 'p_hasta', 'p_unidad_negocio_id']))
  chk('el estado y las fechas viajan', p.p_estado === 'listo' && p.p_desde === '2026-09-01' && p.p_hasta === '2026-09-30')
  const vacio = S.parametrosPedidosDe('u-cn', { estado: '', desde: '', hasta: 'x', sinIdentificar: false })
  chk('sin filtro viajan null ("sin filtro")', vacio.p_estado === null && vacio.p_desde === null && vacio.p_hasta === null)
  const h = S.htmlFiltroEstado()
  chk('el filtro de estado tiene los seis botones', (h.match(/data-filtro-estado=/g) || []).length === 6)
  chk('"Todos" viene elegido', /data-filtro-estado="" aria-pressed="true"/.test(h))
}

esperas.push((async () => {
  const S = nuevo()
  S.__setRpc(() => ({ data: PEDIDOS, error: null }))
  await S.cargarPedidos()
  chk('carga con pedidos_de', S.__llamadas.rpc[0][0] === 'pedidos_de' && S.__llamadas.rpc[0][1].p_unidad_negocio_id === 'u-cn')
  chk('dibuja los tres', (S.__els.get('pe-lista').innerHTML.match(/data-pedido=/g) || []).length === 3)
  chk('cuenta los pedidos', S.__els.get('pe-cuenta').textContent === '3 pedidos')
  S.cambiarSinIdentificar(true)
  chk('el filtro de sin identificar redibuja sin volver a la base', S.__llamadas.rpc.length === 1 && (S.__els.get('pe-lista').innerHTML.match(/data-pedido=/g) || []).length === 2)
  chk('y la cuenta lo sigue', S.__els.get('pe-cuenta').textContent === '2 pedidos')
  S.elegirFiltroEstado('listo')
  await Promise.resolve(); await Promise.resolve()
  chk('el filtro de estado vuelve a pedir a la base con el estado', S.__llamadas.rpc.length === 2 && S.__llamadas.rpc[1][1].p_estado === 'listo')
  S.elegirFiltroEstado('inventado')
  chk('un estado que no es de la lista no se pide', S.__llamadas.rpc.length === 2)
  S.__doc.getElementById('pe-filtro-desde').value = '2026-09-10'
  S.__doc.getElementById('pe-filtro-hasta').value = '2026-09-20'
  S.cambiarFechasFiltro()
  chk('las fechas viajan', S.__llamadas.rpc[2][1].p_desde === '2026-09-10' && S.__llamadas.rpc[2][1].p_hasta === '2026-09-20')
  // Una respuesta vieja no pisa a la nueva.
  const S2 = nuevo()
  let resolverVieja
  S2.__setRpc(() => new Promise(r => { resolverVieja = r }))
  const vieja = S2.cargarPedidos()
  S2.__setRpc(() => ({ data: [PEDIDOS[1]], error: null }))
  await S2.cargarPedidos()
  resolverVieja({ data: PEDIDOS, error: null })
  await vieja
  chk('una respuesta vieja no pisa la nueva', S2.estado.pedidos.length === 1)
  const S3 = nuevo()
  S3.__setRpc(() => ({ data: null, error: { message: 'x' } }))
  await S3.cargarPedidos()
  chk('si falla se dice', /No se pudieron leer los pedidos/.test(S3.__els.get('pe-lista').innerHTML))
  const S4 = nuevo()
  S4.estado.misTareas = new Map([['cargar', { unidades: ['u-cn'] }]])
  await S4.cargarPedidos()
  chk('sin "ver" no pide la lista y lo dice', S4.__llamadas.rpc.length === 0 && /No tenés permiso para ver/.test(S4.__els.get('pe-lista').innerHTML))
  chk('y no muestra los filtros', S4.__els.get('pe-filtros').hidden === true)
})())

// ── el detalle: renglones, tachado, avance ────────────────────────────────
{
  const S = nuevo()
  const d = conDetalle(S)
  const h = S.htmlDetalle(d, CAT)
  chk('el avance total del pedido: 22 de 40 cajas', h.includes('22 de 40 cajas'))
  chk('los tres renglones', (h.match(/data-item=/g) || []).length === 3)
  const i1 = S.htmlItem(d.items[0], d.pedido, CAT, null)
  const i2 = S.htmlItem(d.items[1], d.pedido, CAT, null)
  chk('un renglón a medias NO se tacha', !/pe-item--cumplido/.test(i1))
  chk('un renglón cumplido se ve TACHADO', /pe-item--cumplido/.test(i2) && /\.pe-item--cumplido \.pe-item__desc \{ text-decoration: line-through/.test(src))
  chk('el renglón muestra lo pedido y lo cumplido', i1.includes('12 de 30 cajas'))
  chk('con cargar hay control de avance y "Cumplido"', /data-avance="i1"/.test(i1) && /data-avance-cumplido="i1"/.test(i1))
  chk('"Cumplido" se apaga en un renglón ya cumplido', /data-avance-cumplido="i2" disabled/.test(i2))
  const i3 = S.htmlItem(d.items[2], d.pedido, CAT, null)
  chk('el renglón de texto libre va en bordó con su sello', /pe-item--texto/.test(i3) && />Falta identificar</.test(i3))
  chk('el detalle avisa cuántos faltan identificar', /1 renglón falta identificar/.test(h))
  chk('la descripción de un producto', i1.includes('Cucurucho grande · Caja x 100 · sin cono'))
  // Sin cargar, o con el pedido cerrado, no hay control.
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn'] }]])
  chk('sin cargar NO hay control de avance', !/data-avance=/.test(S.htmlItem(d.items[0], d.pedido, CAT, null)))
  S.estado.misTareas = new Map([['cargar', { unidades: ['u-cn'] }]])
  chk('un entregado NO tiene control de avance', !/data-avance=/.test(S.htmlItem(d.items[0], { ...d.pedido, estado: 'entregado' }, CAT, null)))
  chk('un anulado tampoco', !/data-avance=/.test(S.htmlItem(d.items[0], { ...d.pedido, estado: 'anulado' }, CAT, null)))
}

// ── no se cumplen más cajas que las pedidas ───────────────────────────────
{
  const S = nuevo()
  chk('validar: más que las pedidas', /No se pueden cumplir más de 30 cajas/.test(S.validarAvance(31, 30)))
  chk('validar: igual a las pedidas vale', S.validarAvance(30, 30) === null)
  chk('validar: vacío', !!S.validarAvance(null, 30))
  chk('validar: negativo', !!S.validarAvance(-1, 30))
  chk('validar: cero vale', S.validarAvance(0, 30) === null)
}
esperas.push((async () => {
  const S = nuevo()
  const d = conDetalle(S)
  await S.marcarAvance('i1', 31)
  chk('con más cajas que las pedidas NO se llama a la base', S.__llamadas.rpc.length === 0)
  chk('y se dice pegado al renglón', /No se pueden cumplir más de 30 cajas/.test(S.htmlItem(d.items[0], d.pedido, CAT, d.errores.i1)))
  S.__setRpc(() => ({ data: { estado: 'en_produccion' }, error: null }))
  S.__tablas.pedidos = [PEDIDO]
  S.__tablas.pedido_items = ITEMS.map(i => (i.id === 'i1' ? { ...i, cajas_cumplidas: 20 } : i))
  await S.marcarAvance('i1', 20)
  chk('con marcar_avance_pedido y los dos parámetros', S.__llamadas.rpc[0][0] === 'marcar_avance_pedido' &&
    S.__llamadas.rpc[0][1].p_item_id === 'i1' && S.__llamadas.rpc[0][1].p_cajas_cumplidas === 20)
  chk('el renglón queda con el avance', d.items.find(i => i.id === 'i1').cajas_cumplidas === 20)
  chk('el error del renglón se limpia', !d.errores.i1)
})())

esperas.push((async () => {
  const S = nuevo()
  const d = conDetalle(S)
  S.__setRpc(() => ({ data: { estado: 'listo' }, error: null }))
  S.__tablas.pedidos = []
  await S.marcarCumplido('i1')
  chk('"Cumplido" manda el total pedido', S.__llamadas.rpc[0][1].p_cajas_cumplidas === 30)
  chk('el estado lo decide la base (el que devolvió)', d.pedido.estado === 'listo')
  chk('el renglón queda tachado', /pe-item--cumplido/.test(S.htmlItem(d.items[0], d.pedido, CAT, null)))
  const S2 = nuevo()
  const d2 = conDetalle(S2)
  S2.__setRpc(() => ({ data: null, error: { message: 'No podés cumplir más cajas que las pedidas (30).' } }))
  await S2.marcarAvance('i1', 15)
  chk('el error de la base se muestra TAL CUAL en el renglón', d2.errores.i1 === 'No podés cumplir más cajas que las pedidas (30).')
  chk('y el avance NO se cambia', d2.items[0].cajas_cumplidas === 12)
  chk('el botón no queda trabado', S2.estado.enviandoAvance === false)
  const S3 = nuevo()
  conDetalle(S3, { ...PEDIDO, estado: 'entregado' })
  await S3.marcarAvance('i1', 15)
  chk('un pedido entregado no manda avance', S3.__llamadas.rpc.length === 0)
})())

// ── el estado NO se elige a mano fuera de entregado / anulado ─────────────
{
  const S = nuevo()
  chk('los únicos estados a mano son entregado y anulado', JSON.stringify(S.ESTADOS_A_MANO) === '["entregado","anulado"]')
  const d = conDetalle(S)
  S.pedirCambioEstado('listo')
  chk('pedir "listo" a mano no abre nada', d.accion === null)
  S.pedirCambioEstado('pendiente')
  chk('pedir "pendiente" a mano tampoco', d.accion === null)
  S.pedirCambioEstado('en_produccion')
  chk('ni "en producción"', d.accion === null)
  chk('no hay ningún select ni botón para elegir el estado', !/<select/.test(src) && !/data-estado-manual/.test(src))
  S.pintarAccionesDetalle()
  chk('con cargar, se ve "Marcar entregado"', S.__els.get('pe-btn-entregado').hidden === false)
  chk('y "Anular"', S.__els.get('pe-btn-anular').hidden === false)
  d.pedido.estado = 'entregado'
  S.pintarAccionesDetalle()
  chk('un entregado no se vuelve a entregar', S.__els.get('pe-btn-entregado').hidden === true)
  chk('ni se corrige', S.__els.get('pe-btn-corregir').hidden === true)
  d.pedido.estado = 'anulado'
  S.pintarAccionesDetalle()
  chk('un anulado no se anula de nuevo', S.__els.get('pe-btn-anular').hidden === true)
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn'] }]])
  d.pedido.estado = 'pendiente'
  S.pintarAccionesDetalle()
  chk('sin cargar no hay ninguno de los tres', S.__els.get('pe-btn-entregado').hidden && S.__els.get('pe-btn-anular').hidden && S.__els.get('pe-btn-corregir').hidden)
}

esperas.push((async () => {
  const S = nuevo()
  const d = conDetalle(S)
  S.__tablas.pedidos = [{ ...PEDIDO, estado: 'entregado' }]
  S.__tablas.pedido_items = ITEMS
  S.pedirCambioEstado('entregado')
  chk('"Marcar entregado" pide confirmar', S.__els.get('pe-panel-entregado').hidden === false && S.__llamadas.rpc.length === 0)
  await S.confirmarCambioEstado()
  chk('confirma con cambiar_estado_pedido', S.__llamadas.rpc[0][0] === 'cambiar_estado_pedido')
  const p = S.__llamadas.rpc[0][1]
  chk('con el estado entregado y SIN motivo', p.p_pedido_id === 'a' && p.p_estado === 'entregado' && p.p_motivo === null)
  chk('queda entregado (relee el pedido)', d.pedido.estado === 'entregado')
  chk('y cierra el panel', d.accion === null)
})())

esperas.push((async () => {
  const S = nuevo()
  const d = conDetalle(S)
  S.pedirCambioEstado('anulado')
  chk('"Anular" pide el motivo', S.__els.get('pe-panel-anular').hidden === false)
  S.__doc.getElementById('pe-anular-motivo').value = ' x '
  await S.confirmarCambioEstado()
  chk('sin motivo NO se anula', S.__llamadas.rpc.length === 0)
  chk('y lo dice pegado', S.__els.get('pe-panel-anular-error').hidden === false && /por qué/.test(S.__els.get('pe-panel-anular-error').textContent))
  S.__els.get('pe-anular-motivo').value = '  el cliente   cerró  '
  S.__setRpc(() => ({ data: null, error: { message: 'El pedido ya está anulado.' } }))
  await S.confirmarCambioEstado()
  chk('anula con el motivo limpio', S.__llamadas.rpc[0][1].p_estado === 'anulado' && S.__llamadas.rpc[0][1].p_motivo === 'el cliente cerró')
  chk('el error de la base se muestra TAL CUAL', S.__els.get('pe-panel-anular-error').textContent === 'El pedido ya está anulado.')
  chk('y el botón no queda trabado', S.estado.cambiandoEstado === false && S.__els.get('pe-anular-si').disabled === false)
  S.cancelarCambioEstado()
  chk('Cancelar cierra el panel', d.accion === null && S.__els.get('pe-panel-anular').hidden === true)
})())

// ── corregir un pedido con renglones cumplidos: se corrige de a uno ────────
{
  const S = nuevo()
  const d = conDetalle(S)
  S.abrirCorregirPedido()
  chk('con cumplidos NO abre el formulario', S.estado.vista !== 'pe-vista-form' && S.estado.form === null)
  chk('y avisa que hay que corregir de a uno', /de a uno/.test(d.aviso) && /de a uno/.test(S.__els.get('pe-detalle-aviso').innerHTML))
  const S2 = nuevo()
  conDetalle(S2, PEDIDO, ITEMS.map(i => ({ ...i, cajas_cumplidas: 0 })))
  S2.abrirCorregirPedido()
  chk('sin nada cumplido abre el formulario con el pedido', S2.estado.vista === 'pe-vista-form' && S2.estado.form?.id === 'a')
  chk('con sus renglones', S2.estado.form.renglones.length === 3 && S2.estado.form.renglones[2].tipo === 'texto')
}

// ── abrir el detalle ─────────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.catalogoUnidad = 'u-cn'
  S.estado.clientes = []
  S.__tablas.pedidos = [PEDIDO]
  S.__tablas.pedido_items = ITEMS
  await S.abrirDetalle('a')
  chk('abre la vista del pedido', S.estado.vista === 'pe-vista-detalle')
  chk('el título lleva el número', S.__els.get('pe-detalle-titulo').textContent === 'Pedido Nº 3')
  const qp = S.__llamadas.consultas.find(x => x[0] === 'pedidos')[1]
  chk('trae el texto original y el motivo de anulación', /texto_original/.test(qp[0][1]) && /anulado_motivo/.test(qp[0][1]))
  const qi = S.__llamadas.consultas.find(x => x[0] === 'pedido_items')[1]
  chk('los renglones en orden y con lo cumplido', /cajas_cumplidas/.test(qi[0][1]) && /texto_libre/.test(qi[0][1]) && qi.some(f => f[0] === 'order' && f[1] === 'orden'))
  chk('dibuja los renglones', (S.__els.get('pe-detalle-cuerpo').innerHTML.match(/data-item=/g) || []).length === 3)
  const S2 = nuevo()
  S2.estado.catalogo = CAT; S2.estado.catalogoUnidad = 'u-cn'; S2.estado.clientes = []
  S2.__tablas.pedidos = []
  await S2.abrirDetalle('zz')
  chk('un pedido que no aparece lo dice', /No se encontró el pedido/.test(S2.__els.get('pe-detalle-cuerpo').innerHTML))
})())

// ── HTML malicioso en la lista y el detalle ───────────────────────────────
{
  const S = nuevo()
  const f = S.htmlFilaPedido({ id: marca('pid'), numero: marca('numero'), fecha: '2026-09-22', fecha_entrega: null,
    cliente: marca('cliente'), estado: marca('estado'), cajas_pedidas: 1, cajas_cumplidas: 0, sin_interpretar: 0 })
  chequearMarcas(chk, 'fila de pedido', f, ['pid', 'numero', 'cliente', 'estado'])
  S.estado.catalogo = CAT
  const d = {
    pedido: { ...PEDIDO, estado: 'anulado', observaciones: marca('observaciones'), texto_original: marca('textooriginal'),
      anulado_motivo: marca('motivo'), clientes: { nombre: marca('clientenombre') } },
    items: [
      { id: marca('itemid'), presentacion_id: null, texto_libre: marca('textolibre'), cajas: 1, cajas_cumplidas: 0, observacion: marca('nota') },
    ],
    errores: {},
  }
  const h = S.htmlDetalle(d, CAT)
  chequearMarcas(chk, 'detalle', h, ['observaciones', 'textooriginal', 'motivo', 'clientenombre', 'textolibre', 'nota'])
  S.estado.misTareas = new Map([['cargar', { unidades: ['u-cn'] }]])
  const it = S.htmlItem(d.items[0], { ...PEDIDO }, CAT, marca('error'))
  chequearMarcas(chk, 'renglón con control y error', it, ['itemid', 'textolibre', 'nota', 'error'])
  chk('el motivo de la anulación se muestra', h.includes('Anulado. Motivo:'))
  chk('el mensaje original se muestra en un desplegable', /<details>/.test(h) && /El mensaje original/.test(h))
}

// ── el avance se escribe con ponerNumero ──────────────────────────────────
chk('los campos de avance se enlazan con máximo en las cajas pedidas', /enlazarCampoNumero\(input, \{ decimales: DECIMALES_CAJAS, max: it \? Number\(it\.cajas\) : null \}\)/.test(src))
chk('y se escriben con ponerNumero', /if \(it\) ponerNumero\(input, Number\(it\.cajas_cumplidas\)\)/.test(src))
chk('y se leen con leerCampoNumero', /marcarAvance\(itemId, input \? leerCampoNumero\(input\) : null\)/.test(src))

fin()
