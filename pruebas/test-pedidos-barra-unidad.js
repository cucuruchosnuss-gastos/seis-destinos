// Pedidos y la BARRA DE UNIDAD de arriba (js/barra-unidad.js, 28/09/2026).
//
// La barra elige la fábrica UNA vez para toda la app; Pedidos filtra por esa
// elección y su segmento propio de unidades se retiró. pedidos_de() pide UNA
// unidad, así que con "Todas" la lista junta una llamada por unidad (en
// paralelo, con turno) y cada fila dice de qué unidad es. Cargar un pedido y
// dar de alta un cliente necesitan UNA unidad: con "Todas" la piden en su
// pantalla, sin tocar la barra. Una unidad elegida donde la persona no tiene
// tareas de Pedidos se dice, no se muestra vacía.
//
// Se EJECUTAN los renders reales (pruebas/sandbox-pedidos.js); la barra es un
// doble (unidadesDeLaBarra / alCambiarUnidad) y pasaFiltroUnidad es la REAL.
//
//   node pruebas/test-pedidos-barra-unidad.js

const path = require('path')
const fs = require('fs')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRELUDIO_INIT = `
  async function verificarSesion() { return { user: { id: 'uid-1' } } }
  var __conectado = 0
  function conectarTodo() { __conectado++ }
  supabase.auth = { async getSession() { return { data: { session: { user: { id: 'uid-1' } } } } } }
`
const nuevo = (conInit = false) => construirPedidos(ARCHIVO, conInit
  ? { funciones: ['init', 'cargarPermisos', 'sinAcceso'], preludioExtra: PRELUDIO_INIT } : {})

const DOS = { todas: true }
// Dos unidades con las tres tareas: "Todas" junta las dos.
function conDos(S, { ver = DOS, cargar = DOS, configurar = DOS } = {}) {
  S.estado.misTareas = new Map([['ver', ver], ['cargar', cargar], ['configurar', configurar]].filter(([, a]) => a))
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta']])
  S.estado.unidadBarra = null
  S.estado.unidadId = S.unidadUnica()
  return S
}

const DE_NUSS = [
  { id: 'n1', numero: 7, fecha: '2026-09-20', fecha_entrega: null, cliente: 'Anatolia', estado: 'pendiente', cajas_pedidas: 10, cajas_cumplidas: 0, renglones: 1, sin_interpretar: 0 },
  { id: 'n2', numero: 5, fecha: '2026-09-18', fecha_entrega: null, cliente: 'Ñandú', estado: 'listo', cajas_pedidas: 4, cajas_cumplidas: 4, renglones: 1, sin_interpretar: 0 },
]
const DE_DOLCE = [
  { id: 'd1', numero: 9, fecha: '2026-09-21', fecha_entrega: null, cliente: 'Fideos Sur', estado: 'pendiente', cajas_pedidas: 3, cajas_cumplidas: 0, renglones: 1, sin_interpretar: 1 },
]
const porUnidad = (mapa) => (nombre, p) => nombre === 'pedidos_de'
  ? (typeof mapa[p.p_unidad_negocio_id] === 'function' ? mapa[p.p_unidad_negocio_id]() : { data: mapa[p.p_unidad_negocio_id] ?? [], error: null })
  : { data: null, error: null }
const filas = (S) => (S.__els.get('pe-lista').innerHTML.match(/data-pedido="([^"]+)"/g) || []).map(x => x.slice(13, -1))
const pedidasA = (S) => S.__llamadas.rpc.filter(r => r[0] === 'pedidos_de').map(r => r[1].p_unidad_negocio_id)

// ── "Todas": una llamada por unidad, todo junto y con el nombre de la unidad ──
esperas.push((async () => {
  const S = conDos(nuevo())
  S.__setRpc(porUnidad({ 'u-cn': DE_NUSS, 'u-dp': DE_DOLCE }))
  await S.cargarPedidos()
  chk('Todas: una llamada a pedidos_de por unidad', JSON.stringify(pedidasA(S).slice().sort()) === '["u-cn","u-dp"]', JSON.stringify(pedidasA(S)))
  chk('Todas: muestra los pedidos de las dos', JSON.stringify(filas(S).slice().sort()) === '["d1","n1","n2"]', JSON.stringify(filas(S)))
  chk('Todas: del más nuevo al más viejo', filas(S).join() === 'd1,n1,n2', filas(S).join())
  const h = S.__els.get('pe-lista').innerHTML
  chk('Todas: cada fila dice de qué unidad es', /Nº 9<\/span> · Dolce Pasta · /.test(h) && /Nº 7<\/span> · Cucuruchos Nuss · /.test(h))
  chk('Todas: cada fila lleva su unidad', S.estado.pedidos.every(p => p.unidad_negocio_id === (p.id[0] === 'n' ? 'u-cn' : 'u-dp')))
  chk('Todas: la cuenta dice la suma y el detalle por unidad', S.__els.get('pe-cuenta').textContent === '3 pedidos · Cucuruchos Nuss: 2 · Dolce Pasta: 1', S.__els.get('pe-cuenta').textContent)
  S.cambiarSinIdentificar(true)
  chk('Todas: el filtro de sin identificar sigue andando', filas(S).join() === 'd1' && S.__els.get('pe-cuenta').textContent === '1 pedido · Cucuruchos Nuss: 0 · Dolce Pasta: 1', S.__els.get('pe-cuenta').textContent)
})())

// ── una unidad elegida: solo lo suyo ─────────────────────────────────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  S.estado.unidadBarra = 'u-dp'
  S.estado.unidadId = S.unidadUnica()
  S.__setRpc(porUnidad({ 'u-cn': DE_NUSS, 'u-dp': DE_DOLCE }))
  await S.cargarPedidos()
  chk('una unidad: se pide SOLO la elegida', JSON.stringify(pedidasA(S)) === '["u-dp"]', JSON.stringify(pedidasA(S)))
  chk('una unidad: muestra solo lo suyo', filas(S).join() === 'd1')
  chk('una unidad: la fila no repite la unidad', !/Dolce Pasta/.test(S.__els.get('pe-lista').innerHTML))
  chk('una unidad: la cuenta sin detalle', S.__els.get('pe-cuenta').textContent === '1 pedido')
  // Una fila de otra unidad que llegara igual no se muestra.
  S.estado.pedidos = [...S.estado.pedidos, { ...DE_NUSS[0], unidad_negocio_id: 'u-cn' }]
  S.pintarListaPedidos()
  chk('una unidad: una fila de otra unidad no se muestra', filas(S).join() === 'd1', filas(S).join())
})())

// ── con "Todas", si una unidad falla las otras se ven igual ───────────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  S.__setRpc(porUnidad({ 'u-cn': DE_NUSS, 'u-dp': () => ({ data: null, error: { message: 'caída' } }) }))
  const err = console.error; console.error = () => {}
  await S.cargarPedidos()
  console.error = err
  const h = S.__els.get('pe-lista').innerHTML
  chk('una que falla: las otras se muestran', filas(S).join() === 'n1,n2', filas(S).join())
  chk('una que falla: se dice cuál no se pudo leer', /No se pudieron leer los pedidos de Dolce Pasta/.test(h) && /pe-aviso--grave/.test(h))
  const S2 = conDos(nuevo())
  S2.__setRpc(() => ({ data: null, error: { message: 'caída' } }))
  console.error = () => {}
  await S2.cargarPedidos()
  console.error = err
  chk('las dos fallan: el error de siempre', /No se pudieron leer los pedidos\. Revisá/.test(S2.__els.get('pe-lista').innerHTML) && filas(S2).length === 0)
})())

// ── con "Todas", la respuesta vieja no pisa la nueva ─────────────────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  const pendientes = []
  S.__setRpc(() => new Promise(r => pendientes.push(r)))
  const vieja = S.cargarPedidos()
  S.__setRpc(porUnidad({ 'u-cn': [DE_NUSS[0]], 'u-dp': [] }))
  await S.cargarPedidos()
  for (const r of pendientes) r({ data: DE_DOLCE, error: null })
  await vieja
  chk('Todas: una respuesta vieja no pisa la nueva', S.estado.pedidos.map(p => p.id).join() === 'n1', S.estado.pedidos.map(p => p.id).join())
})())

// ── una unidad de la barra sin tareas de Pedidos: se dice ─────────────────────
esperas.push((async () => {
  const S = conDos(nuevo(), { ver: { unidades: ['u-cn'] }, cargar: { unidades: ['u-cn'] }, configurar: { unidades: ['u-cn'] } })
  S.estado.unidadBarra = 'u-dp'
  S.estado.unidadId = S.unidadUnica()
  S.mostrarInicio()
  await Promise.resolve()
  const h = S.__els.get('pe-lista').innerHTML
  chk('sin tareas: lo dice con el nombre de la unidad', /En Dolce Pasta no tenés ninguna tarea de Pedidos/.test(h), h)
  chk('sin tareas: no pide la lista', pedidasA(S).length === 0)
  chk('sin tareas: ni "Pedido nuevo" ni "Clientes"', S.__els.get('pe-btn-nuevo').hidden === true && S.__els.get('pe-btn-clientes').hidden === true)
  chk('sin tareas: sin filtros', S.__els.get('pe-filtros').hidden === true)
  chk('sin tareas: sin cuenta', S.__els.get('pe-cuenta').textContent === '')
})())

// ── con "Todas", una unidad donde no puede ver pedidos se dice en chico ───────
esperas.push((async () => {
  const S = conDos(nuevo(), { ver: { unidades: ['u-cn'] }, cargar: DOS, configurar: null })
  S.__setRpc(porUnidad({ 'u-cn': DE_NUSS, 'u-dp': DE_DOLCE }))
  await S.cargarPedidos()
  const h = S.__els.get('pe-lista').innerHTML
  chk('sin ver en una: no se le pide la lista', JSON.stringify(pedidasA(S)) === '["u-cn"]')
  chk('sin ver en una: se dice en chico', /En Dolce Pasta no tenés permiso para ver los pedidos/.test(h) && /pe-texto-suave/.test(h))
  chk('sin ver en una: lo de la otra se ve', filas(S).join() === 'n1,n2')
})())

// ── cambiar la barra con la pantalla abierta repinta sin recargar ────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  S.__setRpc(porUnidad({ 'u-cn': DE_NUSS, 'u-dp': DE_DOLCE }))
  S.mostrarInicio()
  await new Promise(r => setImmediate(r))
  const antes = S.__llamadas.rpc.length
  S.aplicarUnidadDeLaBarra('u-cn')
  await new Promise(r => setImmediate(r))
  chk('cambiar a una unidad: vuelve a pedir solo esa', JSON.stringify(pedidasA(S).slice(antes)) === '["u-cn"]', JSON.stringify(pedidasA(S)))
  chk('cambiar a una unidad: la lista se repinta', filas(S).join() === 'n1,n2' && S.estado.unidadId === 'u-cn')
  const n = S.__llamadas.rpc.length
  S.aplicarUnidadDeLaBarra('u-cn')
  chk('la misma unidad no vuelve a pedir', S.__llamadas.rpc.length === n)
  S.aplicarUnidadDeLaBarra(null)
  await new Promise(r => setImmediate(r))
  chk('volver a "Todas": pide las dos', filas(S).length === 3 && S.estado.unidadId === null)
  // En el detalle de un pedido de otra unidad: vuelve a la lista.
  S.estado.vista = 'pe-vista-detalle'
  S.estado.detalle = { id: 'd1', pedido: { id: 'd1', unidad_negocio_id: 'u-dp' }, items: [] }
  S.aplicarUnidadDeLaBarra('u-cn')
  chk('en el detalle de otra unidad: vuelve a la lista', S.estado.vista === 'pe-vista-inicio')
  S.estado.vista = 'pe-vista-detalle'
  S.estado.detalle = { id: 'n1', pedido: { id: 'n1', unidad_negocio_id: 'u-cn' }, items: [] }
  S.aplicarUnidadDeLaBarra(null)
  chk('en el detalle de una unidad que sigue a la vista: se queda', S.estado.vista === 'pe-vista-detalle')
  // El formulario de un pedido tiene SU unidad: la barra no lo toca.
  S.estado.vista = 'pe-vista-form'
  const f = S.formPedidoVacio('u-dp')
  S.estado.form = f
  S.aplicarUnidadDeLaBarra('u-cn')
  chk('con un pedido a medio cargar: la barra no lo toca', S.estado.vista === 'pe-vista-form' && S.estado.form === f && f.unidadId === 'u-dp')
})())

// ── init: lee la barra y se suscribe ──────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo(true)
  const t = S.__tablas
  t.unidades_negocio = [{ id: 'u-cn', nombre: 'Cucuruchos Nuss' }, { id: 'u-dp', nombre: 'Dolce Pasta' }]
  t.empleados = [{ id: 'emp-1', rol_app: 'usuario', unidad_negocio_id: 'u-cn', es_prueba: false }]
  t.empleado_tareas = ['ver', 'cargar', 'configurar'].map(tarea => ({ tarea, alcance: DOS }))
  S.estado.unidades = new Map(); S.estado.misTareas = new Map(); S.estado.unidadId = null
  S.__setBarra({ elegida: 'u-dp' })
  S.__setRpc(porUnidad({ 'u-cn': DE_NUSS, 'u-dp': DE_DOLCE }))
  const w = console.warn; console.warn = () => {}
  await S.init()
  console.warn = w
  await new Promise(r => setImmediate(r))
  chk('init: toma la unidad de la barra', S.estado.unidadBarra === 'u-dp' && S.estado.unidadId === 'u-dp')
  chk('init: la lista arranca con esa unidad', JSON.stringify(pedidasA(S)) === '["u-dp"]' && filas(S).join() === 'd1')
  chk('init: se suscribe a los cambios de la barra', S.__suscriptos() === 1)
  S.__cambiarBarra(null)
  await new Promise(r => setImmediate(r))
  chk('init: un cambio de la barra repinta', S.estado.unidadBarra === null && filas(S).length === 3)
})())

// ── cargar un pedido con "Todas": pide la unidad en su pantalla ──────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  S.__tablas.productos_terminados = (f) => ({ data: f.some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-dp') ? [{ id: 'p-dp', nombre: 'Tallarín', tipo_masa: 'Común' }] : [{ id: 'p-cn', nombre: 'Cucurucho', tipo_masa: 'Común' }], error: null })
  S.__tablas.producto_presentaciones = [{ id: 'pr-dp', producto_id: 'p-dp', nombre: 'Caja', con_cono: false }]
  S.__tablas.clientes = (f) => ({ data: f.some(x => x[0] === 'eq' && x[2] === 'u-dp') ? [{ id: 'c-dp', nombre: 'Fideos Sur', apodos: [], activo: true }] : [{ id: 'c-cn', nombre: 'Anatolia', apodos: [], activo: true }], error: null })
  await S.abrirPedidoNuevo()
  const f = S.estado.form
  chk('Todas: abre el formulario sin unidad', S.estado.vista === 'pe-vista-form' && f.unidadId === null)
  const hu = S.__els.get('pe-form-unidad').innerHTML
  chk('Todas: pregunta de qué unidad es el pedido', /¿De qué unidad es el pedido\?/.test(hu) && (hu.match(/data-form-unidad=/g) || []).length === 2)
  chk('Todas: no lee productos ni clientes antes de elegir', !S.__llamadas.consultas.some(c => c[0] === 'productos_terminados' || c[0] === 'clientes'))
  chk('Todas: los clientes piden elegir la unidad primero', /Elegí primero de qué unidad/.test(S.__els.get('pe-form-clientes-resultados').innerHTML))
  chk('Todas: guardar sin unidad dice que falta', S.faltanPedido(f)[0] === 'Elegí de qué unidad es el pedido.')
  // Un renglón de texto y uno de producto antes de elegir.
  f.renglones[0].cajas = 3
  f.renglones[0].observacion = 'ojo'
  S.agregarRenglon('texto')
  f.renglones[1].texto = 'los rosas'
  await S.elegirUnidadForm('u-dp')
  chk('elegir la unidad: queda puesta', f.unidadId === 'u-dp' && /data-form-unidad="u-dp" aria-pressed="true"/.test(S.__els.get('pe-form-unidad').innerHTML))
  const qp = S.__llamadas.consultas.find(c => c[0] === 'productos_terminados')
  chk('elegir la unidad: lee los productos de ESA unidad', !!qp && qp[1].some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-dp'))
  chk('elegir la unidad: lee los clientes de ESA unidad', S.estado.clientes.map(c => c.id).join() === 'c-dp' && S.estado.clientesDe === 'u-dp')
  chk('elegir la unidad: no cambia la barra', S.estado.unidadBarra === null)
  S.elegirClienteForm('c-dp')
  S.elegirProductoRenglon(0, 'p-dp')
  // Cambiar de unidad: el cliente se suelta y el producto vuelve a empezar.
  await S.elegirUnidadForm('u-cn')
  chk('cambiar de unidad: suelta el cliente', f.clienteId === null)
  chk('cambiar de unidad: el renglón de producto vuelve a empezar con sus cajas y su nota', f.renglones[0].tipo === 'producto' && f.renglones[0].productoId === null && f.renglones[0].cajas === 3 && f.renglones[0].observacion === 'ojo')
  chk('cambiar de unidad: el texto libre queda entero', f.renglones[1].tipo === 'texto' && f.renglones[1].texto === 'los rosas')
  await S.elegirUnidadForm('u-rara')
  chk('una unidad donde no puede cargar no se elige', f.unidadId === 'u-cn')
  // Guardar: viaja la unidad del formulario.
  await S.elegirUnidadForm('u-dp')
  S.elegirClienteForm('c-dp')
  S.elegirProductoRenglon(0, 'p-dp')
  f.renglones[0].cajas = 3
  S.__doc.getElementById('pe-form-fecha').value = '2026-09-22'
  S.__setRpc(() => ({ data: { pedido_id: 'nuevo', numero: 1 }, error: null }))
  await S.guardarPedido()
  const g = S.__llamadas.rpc.find(r => r[0] === 'guardar_pedido')
  chk('guardar: viaja la unidad elegida en el formulario', !!g && g[1].p_unidad_negocio_id === 'u-dp', JSON.stringify(g && g[1].p_unidad_negocio_id))
})())

// ── cargar un pedido con una unidad elegida: viene puesta ────────────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  S.estado.unidadBarra = 'u-dp'
  S.estado.unidadId = S.unidadUnica()
  await S.abrirPedidoNuevo()
  chk('con la barra en una unidad: el pedido viene con esa', S.estado.form.unidadId === 'u-dp')
  chk('y no se pregunta', !/data-form-unidad=/.test(S.__els.get('pe-form-unidad').innerHTML))
  chk('pero se dice cuál es', /Unidad: Dolce Pasta/.test(S.__els.get('pe-form-unidad').innerHTML))
  // Con "Todas" pero cargar en UNA sola: viene esa, sin preguntar.
  const S2 = conDos(nuevo(), { cargar: { unidades: ['u-cn'] } })
  await S2.abrirPedidoNuevo()
  chk('Todas con cargar en una sola: viene esa', S2.estado.form.unidadId === 'u-cn' && !/data-form-unidad=/.test(S2.__els.get('pe-form-unidad').innerHTML))
  // Al corregir, la del pedido, sin elegir.
  chk('al corregir: la del pedido y no se elige', S.formPedidoDesde({ id: 'x', unidad_negocio_id: 'u-cn', cliente_id: 'c', fecha: '2026-09-20' }, [], null).unidadId === 'u-cn' &&
    !/data-form-unidad=/.test(S.htmlUnidadForm({ id: 'x', unidadId: 'u-cn' })))
})())

// ── clientes con "Todas": los de todas las unidades, y el nuevo pide unidad ──
esperas.push((async () => {
  const S = conDos(nuevo())
  S.__tablas.clientes = (f) => ({ data: f.some(x => x[0] === 'eq' && x[2] === 'u-dp') ? [{ id: 'c-dp', nombre: 'Fideos Sur', apodos: [], activo: true }] : [{ id: 'c-cn', nombre: 'Anatolia', apodos: [], activo: true }], error: null })
  await S.mostrarClientes()
  const q = S.__llamadas.consultas.filter(c => c[0] === 'clientes')
  chk('Todas: una lectura de clientes por unidad', q.length === 2 && q.every(c => c[1].some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id')))
  chk('Todas: la lectura trae la unidad del cliente', /unidad_negocio_id/.test(q[0][1].find(x => x[0] === 'select')[1]))
  const h = S.__els.get('pe-clientes-lista').innerHTML
  chk('Todas: muestra los de las dos, por nombre', S.estado.clientes.map(c => c.id).join() === 'c-cn,c-dp')
  chk('Todas: cada cliente dice su unidad', /Anatolia<\/span><span class="pe-fila__meta">Cucuruchos Nuss/.test(h) && /Fideos Sur<\/span><span class="pe-fila__meta">Dolce Pasta/.test(h), h)
  S.abrirCliente(null)
  chk('Todas: el cliente nuevo pide la unidad', S.estado.clienteForm.unidadId === null && (S.__els.get('pe-cliente-unidad').innerHTML.match(/data-cliente-unidad=/g) || []).length === 2)
  S.elegirUnidadCliente('u-dp')
  chk('elegir la unidad del cliente', S.estado.clienteForm.unidadId === 'u-dp' && S.estado.unidadBarra === null)
  S.elegirUnidadCliente('u-rara')
  chk('una unidad sin configurar no se elige', S.estado.clienteForm.unidadId === 'u-dp')
  S.__doc.getElementById('pe-cliente-nombre').value = 'Nuevo Distri'
  S.__setRpc(() => ({ data: 'c-n', error: null }))
  await S.guardarCliente()
  const g = S.__llamadas.rpc.find(r => r[0] === 'guardar_cliente')
  chk('guardar: viaja la unidad elegida', !!g && g[1].p_unidad_negocio_id === 'u-dp')
  // Editar uno de la lista: su unidad, sin elegir.
  S.abrirCliente('c-cn')
  chk('editar: la unidad del cliente', S.estado.clienteForm.unidadId === 'u-cn' && !/data-cliente-unidad=/.test(S.__els.get('pe-cliente-unidad').innerHTML))
})())

esperas.push((async () => {
  const S = conDos(nuevo())
  S.__tablas.clientes = (f) => f.some(x => x[0] === 'eq' && x[2] === 'u-dp') ? { data: null, error: { message: 'caída' } } : { data: [{ id: 'c-cn', nombre: 'Anatolia', apodos: [], activo: true }], error: null }
  const err = console.error; console.error = () => {}
  await S.mostrarClientes()
  console.error = err
  const h = S.__els.get('pe-clientes-lista').innerHTML
  chk('clientes, una que falla: las otras se muestran', /data-cliente="c-cn"/.test(h))
  chk('clientes, una que falla: se dice cuál', /No se pudieron leer los clientes de Dolce Pasta/.test(h))
})())

// ── el detalle con "Todas": el catálogo de la unidad DEL PEDIDO ──────────────
esperas.push((async () => {
  const S = conDos(nuevo())
  S.__tablas.pedidos = [{ id: 'd1', numero: 9, fecha: '2026-09-21', estado: 'pendiente', cliente_id: 'c', unidad_negocio_id: 'u-dp', clientes: { nombre: 'Fideos Sur' } }]
  S.__tablas.pedido_items = []
  await S.abrirDetalle('d1')
  const qp = S.__llamadas.consultas.find(c => c[0] === 'productos_terminados')
  chk('detalle: lee el catálogo de la unidad del pedido', !!qp && qp[1].some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-dp'))
  chk('detalle: dice de qué unidad es', /Unidad<\/span><span class="pe-dato__valor">Dolce Pasta/.test(S.__els.get('pe-detalle-cuerpo').innerHTML))
})())

// ── HTML malicioso en lo nuevo ────────────────────────────────────────────────
{
  const S = conDos(nuevo())
  const U1 = marca('uid1'), U2 = marca('uid2')
  S.estado.unidades = new Map([[U1, marca('unombre1')], [U2, marca('unombre2')]])
  chequearMarcas(chk, 'unidad del pedido (a elegir)', S.htmlUnidadForm({ id: null, unidadId: null }), ['uid1', 'unombre1', 'uid2', 'unombre2'])
  chequearMarcas(chk, 'unidad del cliente (a elegir)', S.htmlUnidadCliente({ id: null, unidadId: null }), ['uid1', 'unombre1', 'uid2', 'unombre2'])
  chequearMarcas(chk, 'unidad del pedido (puesta)', S.htmlUnidadForm({ id: 'x', unidadId: U1 }), ['unombre1'])
  chequearMarcas(chk, 'unidad del cliente (puesta)', S.htmlUnidadCliente({ id: 'x', unidadId: U2 }), ['unombre2'])
  const f = S.htmlFilaPedido({ id: 'x', numero: 1, fecha: '2026-09-22', cliente: 'A', estado: 'pendiente', cajas_pedidas: 1, cajas_cumplidas: 0, sin_interpretar: 0, unidad_negocio_id: U1 }, true)
  chequearMarcas(chk, 'fila de pedido con su unidad', f, ['unombre1'])
  chequearMarcas(chk, 'fila de cliente con su unidad', S.htmlFilaCliente({ id: 'c', nombre: 'A', apodos: [], unidad_negocio_id: U2 }, true), ['unombre2'])
  S.estado.pedidos = []
  S.estado.avisoPedidos = marca('avisolectura')
  S.estado.misTareas = new Map([['ver', { unidades: [U1] }], ['cargar', DOS]])
  chequearMarcas(chk, 'avisos de la lista', S.htmlListaPedidos(), ['avisolectura', 'unombre2'])
  S.estado.misTareas = new Map([['configurar', DOS]])
  S.estado.clientes = []
  S.estado.avisoClientes = marca('avisoclientes')
  chequearMarcas(chk, 'aviso de los clientes', S.htmlListaClientes(), ['avisoclientes'])
  S.estado.unidadBarra = U1
  S.estado.misTareas = new Map()
  chequearMarcas(chk, 'unidad sin tareas', S.htmlListaPedidos(), ['unombre1'])
}

// ── con "Todas" se ven los botones de lo que se puede en alguna unidad ───────
{
  const S = conDos(nuevo(), { ver: DOS, cargar: { unidades: ['u-dp'] }, configurar: { unidades: ['u-cn'] } })
  S.pintarAccionesInicio()
  chk('Todas: "Pedido nuevo" con cargar en alguna', S.__els.get('pe-btn-nuevo').hidden === false)
  chk('Todas: "Clientes" con configurar en alguna', S.__els.get('pe-btn-clientes').hidden === false)
  S.estado.unidadBarra = 'u-cn'
  S.estado.unidadId = S.unidadUnica()
  S.pintarAccionesInicio()
  chk('con Nuss elegida: sin cargar en Nuss no hay "Pedido nuevo"', S.__els.get('pe-btn-nuevo').hidden === true && S.__els.get('pe-btn-clientes').hidden === false)
}

// ── el selector viejo ya no está ──────────────────────────────────────────────
chk('el segmento de unidades de arriba ya no está', !/id="pe-unidades"/.test(src) && !/htmlUnidades|elegirUnidad\(/.test(src))
chk('ya no lee ni escribe la unidad recordada de Pedidos', !/pedidos\.unidad/.test(src) && !/CLAVE_UNIDAD/.test(src))
chk('importa la barra de unidad', /import \{ unidadesDeLaBarra, alCambiarUnidad, pasaFiltroUnidad \} from '\.\.\/js\/barra-unidad\.js'/.test(src))
chk('y la carga en el head', /<script type="module" src="\.\.\/js\/barra-unidad\.js"><\/script>/.test(src))
chk('pide la barra en paralelo con los permisos (no frena el arranque)', src.indexOf('const barra = unidadesDeLaBarra()') > 0 && src.indexOf('const barra = unidadesDeLaBarra()') < src.indexOf('Promise.all([cargarPermisos(), fabrica])'))

fin()
