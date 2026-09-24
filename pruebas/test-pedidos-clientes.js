// Parte 2 de Pedidos: los clientes (lista, buscador por nombre y por apodo,
// alta y edición con apodos como etiquetas). Se EJECUTAN las funciones reales
// de modulos/pedidos.html en pruebas/sandbox-pedidos.js.
//
//   node pruebas/test-pedidos-clientes.js

const path = require('path')
const fs = require('fs')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirPedidos(ARCHIVO)

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', apodos: ['el Turco', 'Anatolia'], localidad: 'Córdoba', telefono: '351 555-1234', observaciones: null, activo: true },
  { id: 'c2', nombre: 'Heladería Ñandú', apodos: [], localidad: null, telefono: null, observaciones: 'paga los viernes', activo: true },
  { id: 'c3', nombre: 'Viejo Distri', apodos: ['el de Alta Gracia'], localidad: 'Alta Gracia', telefono: null, observaciones: null, activo: false },
]

// ── buscador ───────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const n = (q) => S.clientesFiltrados(CLIENTES, q).map(c => c.id).join(',')
  chk('sin búsqueda vienen todos', n('') === 'c1,c2,c3')
  chk('por nombre', n('anatolia') === 'c1')
  chk('por APODO, sin acentos ni mayúsculas', n('EL TURCO') === 'c1')
  chk('un apodo encuentra al cliente aunque el nombre no lo diga', n('alta gracia') === 'c3')
  chk('sin acentos: "nandu" encuentra "Ñandú"', n('nandu') === 'c2')
  chk('espacios de más no rompen', n('  el   turco ') === 'c1')
  chk('nada coincide → vacío', n('zzz') === '')
  chk('apodos null no rompe', S.clientesFiltrados([{ id: 'x', nombre: 'A', apodos: null }], 'b').length === 0)
}

// ── apodos: agregar y quitar varios ──────────────────────────────────────────
{
  const S = nuevo()
  let r = S.agregarApodo([], 'el Turco')
  chk('agrega el primero', JSON.stringify(r.apodos) === '["el Turco"]' && r.error === null)
  r = S.agregarApodo(r.apodos, '  Anatolia  ')
  chk('agrega un segundo, sin los espacios de los bordes', JSON.stringify(r.apodos) === '["el Turco","Anatolia"]')
  r = S.agregarApodo(r.apodos, 'Distri   Norte')
  chk('y un tercero, con los espacios internos colapsados', r.apodos.length === 3 && r.apodos[2] === 'Distri Norte')
  const repe = S.agregarApodo(r.apodos, 'EL TÚRCO')
  chk('uno repetido (sin distinguir mayúsculas ni acentos) no se agrega y se dice', repe.apodos.length === 3 && /ya está/.test(repe.error))
  const vacio = S.agregarApodo(r.apodos, '   ')
  chk('uno vacío no se agrega y se dice', vacio.apodos.length === 3 && !!vacio.error)
  chk('uno de más de 60 letras no se agrega', S.agregarApodo([], 'x'.repeat(61)).apodos.length === 0)
  const otro = S.agregarApodo(r.apodos, 'otro')
  chk('agregar devuelve una lista NUEVA (no toca la de entrada)', otro.apodos !== r.apodos && r.apodos.length === 3 && otro.apodos.length === 4)
  const q = S.quitarApodo(r.apodos, 1)
  chk('quitar saca el del medio', JSON.stringify(q) === '["el Turco","Distri Norte"]')
  chk('quitar dos seguidos deja uno', S.quitarApodo(q, 0).length === 1)
}

// ── faltan / parámetros ───────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('sin nombre falta', !!S.faltanCliente({ nombre: ' ' }))
  chk('con una letra falta', !!S.faltanCliente({ nombre: 'A' }))
  chk('con nombre no falta', S.faltanCliente({ nombre: 'Ana' }) === null)
  const f = { ...S.formClienteVacio(), nombre: '  Distri  Norte ', apodos: ['a', 'b'], localidad: ' ', telefono: '0351 555-1234', observaciones: '', activo: false }
  const p = S.parametrosGuardarCliente(f, 'u-cn')
  chk('los apodos viajan como ARREGLO', Array.isArray(p.p_apodos) && JSON.stringify(p.p_apodos) === '["a","b"]')
  chk('los apodos van como copia', p.p_apodos !== f.apodos)
  chk('ocho parámetros, los de la firma', JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_activo', 'p_apodos', 'p_id', 'p_localidad', 'p_nombre', 'p_observaciones', 'p_telefono', 'p_unidad_negocio_id'].sort()))
  chk('p_id null en un alta', p.p_id === null)
  chk('nombre limpio', p.p_nombre === 'Distri Norte')
  chk('un vacío va null, no ""', p.p_localidad === null && p.p_observaciones === null)
  chk('el teléfono va TAL CUAL (es un identificador)', p.p_telefono === '0351 555-1234')
  chk('activo false viaja false', p.p_activo === false)
  chk('la unidad es la elegida', p.p_unidad_negocio_id === 'u-cn')
}

// ── la lista y el HTML malicioso ─────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.clientes = [{ id: marca('id'), nombre: marca('nombre'), apodos: [marca('apodo1'), marca('apodo2')],
    localidad: marca('localidad'), telefono: marca('telefono'), activo: false }]
  const html = S.htmlListaClientes()
  chequearMarcas(chk, 'fila de cliente', html, ['id', 'nombre', 'apodo1', 'apodo2', 'localidad', 'telefono'])
  chk('un inactivo se marca', /Inactivo/.test(html) && /pe-fila--inactiva/.test(html))
  S.estado.clientesBusqueda = marca('busqueda')
  const vacio = S.htmlListaClientes()
  chequearMarcas(chk, 'sin coincidencias', vacio, ['busqueda'])
  chk('sin coincidencias lo dice', /Ningún cliente coincide/.test(vacio))
  S.estado.clientes = []
  chk('sin clientes lo dice', /Todavía no hay clientes/.test(S.htmlListaClientes()))
  S.estado.clientes = null
  chk('mientras carga lo dice', /Cargando/.test(S.htmlListaClientes()))
  S.estado.errorClientes = 'No se pudieron leer'
  chk('si falla lo dice en bordó', /pe-aviso--grave/.test(S.htmlListaClientes()))
  const f = S.htmlApodosForm([marca('apf')])
  chequearMarcas(chk, 'apodos del formulario', f, ['apf'])
  chk('cada apodo del formulario tiene su botón de quitar', /data-quitar-apodo="0"/.test(f))
  chk('sin apodos lo dice', /Sin apodos/.test(S.htmlApodosForm([])))
}

// ── el formulario: agregar desde el campo, quitar, guardar ──────────────────
esperas.push((async () => {
  const S = nuevo()
  S.estado.clientes = CLIENTES
  S.abrirCliente('c1')
  chk('abrir un cliente abre la vista del cliente', S.estado.vista === 'pe-vista-cliente')
  chk('carga el nombre en el campo', S.__els.get('pe-cliente-nombre').value === 'Distribuidora Anatolia')
  chk('el título dice Editar', S.__els.get('pe-cliente-titulo').textContent === 'Editar cliente')
  S.__els.get('pe-cliente-apodo-nuevo').value = 'Distri Norte'
  S.agregarApodoAlForm()
  chk('"Agregar" suma el apodo del campo', S.estado.clienteForm.apodos.length === 3)
  chk('y vacía el campo', S.__els.get('pe-cliente-apodo-nuevo').value === '')
  S.__els.get('pe-cliente-apodo-nuevo').value = 'el turco'
  S.agregarApodoAlForm()
  chk('un repetido se avisa pegado al campo', S.__els.get('pe-cliente-apodo-error').hidden === false && /ya está/.test(S.__els.get('pe-cliente-apodo-error').textContent))
  S.quitarApodoDelForm(0)
  chk('quitar el primero', JSON.stringify(S.estado.clienteForm.apodos) === '["Anatolia","Distri Norte"]')
  // Un apodo escrito y no agregado se agrega al guardar.
  S.__els.get('pe-cliente-apodo-nuevo').value = 'Anato 2'
  let params = null
  S.__setRpc((n, p) => { params = p; return { data: 'c1', error: null } })
  S.__tablas.clientes = CLIENTES
  await S.guardarCliente()
  chk('guarda con guardar_cliente', S.__llamadas.rpc.length === 1 && S.__llamadas.rpc[0][0] === 'guardar_cliente')
  chk('el apodo que quedó escrito viaja también', JSON.stringify(params?.p_apodos) === '["Anatolia","Distri Norte","Anato 2"]')
  chk('manda el id del cliente editado', params?.p_id === 'c1')
  chk('al guardar vuelve a la lista', S.estado.vista === 'pe-vista-clientes')
  chk('y avisa', S.__llamadas.exitos.length === 1)
})())

esperas.push((async () => {
  const S = nuevo()
  S.estado.clientes = []
  S.abrirCliente(null)
  chk('cliente nuevo abre vacío', S.estado.clienteForm.id === null && S.__els.get('pe-cliente-titulo').textContent === 'Cliente nuevo')
  S.__els.get('pe-cliente-nombre').value = ' '
  await S.guardarCliente()
  chk('sin nombre NO llama a la base', S.__llamadas.rpc.length === 0)
  chk('y lo dice pegado al botón', S.__els.get('pe-cliente-error').hidden === false && /nombre/.test(S.__els.get('pe-cliente-error').textContent))
  S.__els.get('pe-cliente-nombre').value = 'Repetido'
  S.__setRpc(() => ({ data: null, error: { message: 'Ya hay un cliente con ese nombre en esta unidad.' } }))
  await S.guardarCliente()
  chk('el error de la base se muestra TAL CUAL', S.__els.get('pe-cliente-error').textContent === 'Ya hay un cliente con ese nombre en esta unidad.')
  chk('el error de la base se ve', S.__els.get('pe-cliente-error').hidden === false)
  chk('el botón vuelve a habilitarse', S.__els.get('pe-cliente-guardar').disabled === false)
  chk('se queda en el formulario', S.estado.vista === 'pe-vista-cliente')
})())

// ── solo con configurar ───────────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn'] }], ['cargar', { unidades: ['u-cn'] }]])
  S.pintarAccionesInicio()
  chk('sin configurar, el botón Clientes no se ve', S.__els.get('pe-btn-clientes').hidden === true)
  await S.mostrarClientes()
  chk('sin configurar, mostrarClientes no abre la vista', S.estado.vista !== 'pe-vista-clientes')
  S.abrirCliente(null)
  chk('sin configurar, no se abre el formulario', S.estado.vista !== 'pe-vista-cliente')
  S.estado.misTareas = new Map([['configurar', { unidades: ['u-dp'] }]])
  S.pintarAccionesInicio()
  chk('configurar en OTRA unidad no alcanza', S.__els.get('pe-btn-clientes').hidden === true)
  S.estado.misTareas = new Map([['configurar', { todas: true }]])
  S.pintarAccionesInicio()
  chk('con configurar {todas: true} se ve', S.__els.get('pe-btn-clientes').hidden === false)
  S.estado.misTareas = new Map()
  S.estado.miRolApp = 'super_admin'
  S.pintarAccionesInicio()
  chk('super_admin lo ve', S.__els.get('pe-btn-clientes').hidden === false)
})())

// ── leer clientes: la unidad y las columnas ──────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.__tablas.clientes = CLIENTES
  await S.mostrarClientes()
  const c = S.__llamadas.consultas.find(x => x[0] === 'clientes')
  const sel = c ? c[1].find(f => f[0] === 'select')[1] : ''
  chk('filtra por la unidad elegida', !!c && c[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-cn'))
  chk('trae los apodos y el activo', /apodos/.test(sel) && /activo/.test(sel))
  chk('muestra los tres', (S.__els.get('pe-clientes-lista').innerHTML.match(/data-cliente=/g) || []).length === 3)
  const S2 = nuevo()
  S2.__tablas.clientes = () => ({ data: null, error: { message: 'x' } })
  await S2.mostrarClientes()
  chk('si falla la lectura se dice', /No se pudieron leer los clientes/.test(S2.__els.get('pe-clientes-lista').innerHTML))
})())

// ── unidades ──────────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('con una sola unidad no se dibuja el selector', S.htmlUnidades() === '')
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  const h = S.htmlUnidades()
  chk('con dos unidades se dibuja', (h.match(/data-unidad=/g) || []).length === 2)
  chk('la elegida va marcada', /data-unidad="u-cn" aria-pressed="true"/.test(h))
  S.estado.clientes = [{ id: 'x' }]
  S.elegirUnidad('u-dp')
  chk('elegir otra unidad la guarda', S.estado.unidadId === 'u-dp' && S.__ls.get('pedidos.unidad') === 'u-dp')
  chk('y olvida los clientes de la otra', S.estado.clientes === null)
  S.elegirUnidad('u-nada')
  chk('una unidad fuera del alcance no se elige', S.estado.unidadId === 'u-dp')
  chk('unidadInicial: la guardada si se puede', S.unidadInicial(['a', 'b'], 'b') === 'b')
  chk('unidadInicial: la primera si la guardada ya no', S.unidadInicial(['a', 'b'], 'z') === 'a')
}

{
  const S = nuevo()
  S.estado.miRolApp = 'super_admin'
  S.estado.unidades = new Map([[marca('uid1'), marca('unombre1')], ['u2', 'Dos']])
  S.estado.unidadId = 'u2'
  chequearMarcas(chk, 'selector de unidades', S.htmlUnidades(), ['uid1', 'unombre1'])
}

// ── el HTML estático ──────────────────────────────────────────────────────
chk('la ayuda de los apodos dice para qué sirven', /Cómo lo nombran en los mensajes, para reconocerlo después/.test(src))
chk('el teléfono NO pasa por el formato de números', !/enlazarCampoNumero\(document\.getElementById\('pe-cliente-telefono'\)/.test(src))
chk('la tabla pide los permisos filtrando habilitado', /\.eq\('modulo', 'pedidos'\)\.eq\('habilitado', true\)/.test(src))

fin()
