// B6 del módulo Producción (22/09/2026): la configuración, por unidad.
//
// Contrato con la base (pg_get_functiondef, 22/09/2026):
//  - guardar_maquina(p_id, p_unidad_negocio_id, p_nombre, p_activa, p_orden):
//    una máquina con turno abierto no se desactiva (lo dice la base).
//  - guardar_receta_original(p_maquina_id, p_tipo_masa, p_items
//    [{ingrediente_id, cantidad_kg, insumo_preferido_id}], p_nota) → crea una
//    versión NUEVA; la vigente es la de número más alto.
//  - guardar_ingrediente(p_id, p_nombre, p_descuenta_stock, p_orden, p_activo),
//    guardar_ingrediente_insumos(p_ingrediente_id, p_insumo_ids).
//  - guardar_producto(p_id, p_unidad_negocio_id, p_nombre, p_tipo_masa,
//    p_activo, p_orden), guardar_presentacion(p_id, p_producto_id, p_nombre,
//    p_con_cono, p_media_caja, p_empaque, p_unidades_por_caja, p_activa,
//    p_orden), guardar_marca(p_id, p_nombre, p_activa),
//    guardar_puestos(p_empleado_id, p_unidad_negocio_id, p_puestos).
//
//   node pruebas/test-produccion-config.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(tareas = [['configurar', { unidades: ['u-cn'] }], ['cargar', { unidades: ['u-cn'] }]]) {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map(tareas)
  S.__setRpc(async () => ({ data: 'nuevo-id', error: null }))
  return S
}
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n).map(([, p]) => p)
// Inputs falsos para las funciones que leen el formulario con querySelectorAll.
function conInputs(S, inputs) {
  S.__doc.getElementById('pr-config-cuerpo').querySelectorAll = (sel) => {
    const attr = (sel.match(/\[([a-z-]+)/) || [])[1]
    return inputs.filter(i => attr in i.atributos)
  }
}
function input(atributos, props = {}) {
  const dataset = {}
  for (const [k, v] of Object.entries(atributos)) if (k.startsWith('data-')) dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v
  return { atributos, dataset, getAttribute: (k) => atributos[k] ?? null, value: '', checked: false, ...props }
}

esperas.push((async () => {
  // ── Acceso ────────────────────────────────────────────────────────────
  const Sin = armar([['cargar', { unidades: ['u-cn'] }]])
  Sin.pintarAccesosOficina()
  chk('sin configurar: no hay acceso a Configuración', Sin.__doc.getElementById('pr-btn-ir-config').hidden === true && Sin.__doc.getElementById('pr-menu-config').hidden === true)
  await Sin.mostrarConfig()
  chk('… y mostrarConfig no abre nada', Sin.estado.config === null)
  const Con = armar()
  Con.pintarAccesosOficina()
  chk('con configurar: hay acceso', Con.__doc.getElementById('pr-btn-ir-config').hidden === false && Con.__doc.getElementById('pr-menu-config').hidden === false)

  // ── Máquinas ──────────────────────────────────────────────────────────
  const M = armar()
  M.__tablas.maquinas = [{ id: 'm1', nombre: 'Máquina 1', activa: true, orden: 1 }, { id: 'm2', nombre: 'Máquina 2', activa: true, orden: 2 }, { id: 'm3', nombre: 'Vieja', activa: false, orden: 3 }]
  await M.mostrarConfig()
  chk('abre en Máquinas, de la unidad de configurar', M.estado.config.tab === 'maquinas' && M.estado.config.unidadId === 'u-cn')
  chk('lee todas las máquinas de la unidad (también las inactivas)', M.__llamadas.consultas.some(([t, f]) => t === 'maquinas' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]') && !JSON.stringify(f).includes('["eq","activa"')))
  const hm = M.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('cada máquina con renombrar, subir, bajar y activar/desactivar', (hm.match(/data-maq-guardar=/g) || []).length === 3 && /data-maq-activa="m3">Activar/.test(hm) && /data-maq-activa="m1">Desactivar/.test(hm))
  chk('la primera no sube y la última no baja', /data-maq-subir="0"[^>]*disabled/.test(hm) && /data-maq-bajar="2"[^>]*disabled/.test(hm))
  const lista = M.estado.config.datos.maquinas
  const cambios = M.ordenTrasMover(lista, 2, -1)
  chk('subir la tercera: cambian SOLO la 2 y la 3', cambios.length === 2 && cambios.find(x => x.id === 'm3').orden === 2 && cambios.find(x => x.id === 'm2').orden === 3)
  chk('mover fuera de rango: nada', M.ordenTrasMover(lista, 0, -1).length === 0)
  await M.accionMaquina({ maqSubir: '2' })
  const gm = rpcs(M, 'guardar_maquina')
  chk('reordenar llama a guardar_maquina por cada una que cambia, con su nombre y estado', gm.length === 2 &&
    JSON.stringify(gm.find(p => p.p_id === 'm3')) === JSON.stringify({ p_id: 'm3', p_unidad_negocio_id: 'u-cn', p_nombre: 'Vieja', p_activa: false, p_orden: 2 }))
  M.__doc.getElementById('pr-config-maq-nueva').value = '  Máquina 3 '
  await M.accionMaquina({ maqAgregar: '1' })
  chk('agregar: nueva, activa, al final', JSON.stringify(rpcs(M, 'guardar_maquina').at(-1)) === JSON.stringify({ p_id: null, p_unidad_negocio_id: 'u-cn', p_nombre: 'Máquina 3', p_activa: true, p_orden: 4 }))
  M.__doc.getElementById('pr-config-maq-nueva').value = '   '
  const antes = rpcs(M, 'guardar_maquina').length
  await M.accionMaquina({ maqAgregar: '1' })
  chk('agregar sin nombre: no se manda', rpcs(M, 'guardar_maquina').length === antes && /nombre/.test(M.__doc.getElementById('pr-config-error').textContent))
  M.__setRpc(async () => ({ data: null, error: { message: 'La máquina tiene un turno abierto: cerralo antes de desactivarla.', code: 'P0001' } }))
  await M.accionMaquina({ maqActiva: 'm1' })
  chk('desactivar: activa=false, conservando nombre y orden', JSON.stringify(rpcs(M, 'guardar_maquina').at(-1)) === JSON.stringify({ p_id: 'm1', p_unidad_negocio_id: 'u-cn', p_nombre: 'Máquina 1', p_activa: false, p_orden: 1 }))
  chk('… y el rechazo de la base, tal cual', M.__doc.getElementById('pr-config-error').textContent === 'La máquina tiene un turno abierto: cerralo antes de desactivarla.' && M.__doc.getElementById('pr-config-error').hidden === false)
  M.__setRpc(async () => ({ data: 'm1', error: null }))
  conInputs(M, [input({ 'data-maq-nombre': 'm1' }, { value: ' Horno A ' })])
  await M.accionMaquina({ maqGuardar: 'm1' })
  chk('renombrar: el nombre nuevo recortado', rpcs(M, 'guardar_maquina').at(-1).p_nombre === 'Horno A' && rpcs(M, 'guardar_maquina').at(-1).p_activa === true)

  // ── Recetas ───────────────────────────────────────────────────────────
  const R = armar()
  Object.assign(R.__tablas, {
    maquinas: [{ id: 'm1', nombre: 'Máquina 1' }],
    recetas: [{ id: 'r2', tipo_masa: 'Común', version: 2, nota: 'Menos azúcar', creada_por: 'e-fede', created_at: '2026-09-20T15:00:00Z' },
      { id: 'r1', tipo_masa: 'Común', version: 1, nota: 'Cargada desde la receta por defecto del prototipo v7: revisar', creada_por: null, created_at: '2026-09-01T15:00:00Z' },
      { id: 'rc', tipo_masa: 'Chocolate', version: 1, nota: 'Cargada desde la receta por defecto del prototipo v7: revisar', creada_por: null, created_at: '2026-09-01T15:00:00Z' }],
    receta_items: [{ receta_id: 'r2', ingrediente_id: 'i-harina', cantidad_kg: 25, insumo_preferido_id: 'ins-h1' }, { receta_id: 'r2', ingrediente_id: 'i-cacao', cantidad_kg: 0, insumo_preferido_id: null },
      { receta_id: 'rc', ingrediente_id: 'i-harina', cantidad_kg: 24, insumo_preferido_id: null }, { receta_id: 'rc', ingrediente_id: 'i-cacao', cantidad_kg: 1.5, insumo_preferido_id: null }],
    ingredientes: [{ id: 'i-harina', nombre: 'Harina', descuenta_stock: true, orden: 1, activo: true }, { id: 'i-cacao', nombre: 'Cacao', descuenta_stock: true, orden: 2, activo: true },
      { id: 'i-baja', nombre: 'Viejo', descuenta_stock: true, orden: 3, activo: false }],
    ingrediente_insumos: [{ ingrediente_id: 'i-harina', insumo_id: 'ins-h1' }],
    insumos: [{ id: 'ins-h1', nombre: 'Harina 000', marca: 'Jupiter', tipo: 'materia_prima' }],
    v_empleados_publico: [{ id: 'e-fede', nombre: 'Federico Silva' }],
  })
  await R.mostrarConfig()
  R.estado.config.tab = 'recetas'
  await R.cargarPestanaConfig()
  const d = R.estado.config.datos
  chk('la vigente es la de versión más alta', R.recetaVigente(d.recetas, 'Común').id === 'r2')
  chk('arranca en el primer tipo de la máquina', R.estado.config.recetaTipo === 'Chocolate')
  let hr = R.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('la receta del prototipo muestra el aviso "revisar"', /Revisar: esta receta vino del prototipo/.test(hr))
  R.estado.config.recetaTipo = 'Común'
  R.pintarPestanaConfig()
  hr = R.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('una versión revisada ya no muestra el aviso', !/Revisar: esta receta vino del prototipo/.test(hr))
  chk('muestra las versiones con autor, fecha y nota', /Versión 2<\/strong> · 20\/09\/2026 · Federico Silva<br>Menos azúcar/.test(hr) && /Versión 1<\/strong> · 01\/09\/2026 · —/.test(hr), hr.slice(hr.indexOf('Versiones'), hr.indexOf('Versiones') + 300))
  chk('las cantidades van por data-numero (se ponen con ponerNumero, no con value=)', /data-receta-kg="i-harina" data-numero="25"/.test(hr) && !/data-receta-kg="i-harina"[^>]*value=/.test(hr))
  chk('el editor tiene solo los ingredientes activos', !/data-receta-kg="i-baja"/.test(hr))
  chk('el insumo preferido, con los insumos del ingrediente', /data-receta-pref="i-harina"/.test(hr) && /value="ins-h1" selected/.test(hr) && !/data-receta-pref="i-cacao"/.test(hr))
  chk('se ofrece un tipo nuevo', /Tipo nuevo…/.test(hr))
  const filas = R.filasEditorReceta(d.ingredientes, d.items.filter(i => i.receta_id === 'r2'))
  chk('filas del editor: cantidad y preferido de la de partida; vacío si no lo lleva', filas.length === 2 && filas[0].kg === 25 && filas[0].preferido === 'ins-h1' && filas[1].kg === 0)
  const p = R.parametrosGuardarReceta('m1', ' Común ', [{ ingrediente_id: 'i-harina', kg: 25.5, preferido: 'ins-h1' }, { ingrediente_id: 'i-cacao', kg: 0, preferido: '' }, { ingrediente_id: 'i-x', kg: null, preferido: '' }], ' Más harina ')
  chk('payload de la receta: con número (0 incluido), sin los vacíos', JSON.stringify(p) === JSON.stringify({ p_maquina_id: 'm1', p_tipo_masa: 'Común',
    p_items: [{ ingrediente_id: 'i-harina', cantidad_kg: 25.5, insumo_preferido_id: 'ins-h1' }, { ingrediente_id: 'i-cacao', cantidad_kg: 0, insumo_preferido_id: null }], p_nota: 'Más harina' }), JSON.stringify(p))
  chk('sin nota: falta la nota', R.faltanEnReceta({ ...p, p_nota: null }).some(x => x.includes('nota')))
  chk('sin tipo: falta', R.faltanEnReceta({ ...p, p_tipo_masa: '' }).some(x => x.includes('tipo')))
  chk('tipo de más de 40: falta', R.faltanEnReceta({ ...p, p_tipo_masa: 'x'.repeat(41) }).length === 1)
  chk('sin ingredientes: falta', R.faltanEnReceta({ ...p, p_items: [] }).some(x => x.includes('ingrediente')))
  // Guardar: versión nueva.
  R.__setRpc(async (n) => n === 'guardar_receta_original' ? { data: { receta_id: 'r3', version: 3 }, error: null } : { data: null, error: null })
  conInputs(R, [input({ 'data-receta-kg': 'i-harina' }, { value: '25,5' }), input({ 'data-receta-kg': 'i-cacao' }, { value: '' }), input({ 'data-receta-pref': 'i-harina' }, { value: 'ins-h1' })])
  R.__doc.getElementById('pr-config-receta-nota').value = ''
  await R.guardarReceta()
  chk('sin nota no se guarda', rpcs(R, 'guardar_receta_original').length === 0 && /nota/.test(R.__doc.getElementById('pr-config-error').textContent))
  R.__doc.getElementById('pr-config-receta-nota').value = 'Probamos 500 g más'
  await R.guardarReceta()
  const gr = rpcs(R, 'guardar_receta_original')
  chk('guardar: la receta de la máquina y el tipo, leída del formulario', gr.length === 1 && gr[0].p_maquina_id === 'm1' && gr[0].p_tipo_masa === 'Común' &&
    JSON.stringify(gr[0].p_items) === '[{"ingrediente_id":"i-harina","cantidad_kg":25.5,"insumo_preferido_id":"ins-h1"}]', JSON.stringify(gr[0]))
  chk('… y dice la versión que creó la base', R.__llamadas.exitos.some(m => m === 'Receta guardada: Común, versión 3.'))
  // Tipo nuevo partiendo de otro.
  R.estado.config.recetaTipo = R.NUEVO_TIPO
  R.estado.config.recetaPartida = 'Chocolate'
  R.pintarPestanaConfig()
  const hn = R.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('tipo nuevo: pide el nombre y de cuál parte', /id="pr-config-tipo-nuevo"/.test(hn) && /data-receta-partida="1"/.test(hn))
  chk('… con las cantidades del tipo de partida', /data-receta-kg="i-cacao" data-numero="1.5"/.test(hn))
  R.__doc.getElementById('pr-config-tipo-nuevo').value = ' Frutilla '
  await R.guardarReceta()
  chk('guardar un tipo nuevo manda ese nombre', rpcs(R, 'guardar_receta_original').at(-1).p_tipo_masa === 'Frutilla')

  // ── Ingredientes ──────────────────────────────────────────────────────
  const I = armar()
  Object.assign(I.__tablas, {
    ingredientes: [{ id: 'i-harina', nombre: 'Harina', descuenta_stock: true, orden: 1, activo: true }, { id: 'i-grasa', nombre: 'Grasa', descuenta_stock: true, orden: 2, activo: true },
      { id: 'i-fecula', nombre: 'Fécula', descuenta_stock: true, orden: 3, activo: true }, { id: 'i-agua', nombre: 'Agua', descuenta_stock: false, orden: 0, activo: true }],
    ingrediente_insumos: [{ ingrediente_id: 'i-harina', insumo_id: 'ins-h1' }],
    insumos: [{ id: 'ins-h1', nombre: 'Harina 000', marca: 'Jupiter' }, { id: 'ins-g', nombre: 'Grasa vacuna', marca: null }],
  })
  await I.mostrarConfig()
  I.estado.config.tab = 'ingredientes'
  await I.cargarPestanaConfig()
  const hi = I.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('aviso bordó con los que no tienen insumo (grasa y fécula; el agua no descuenta)', /pr-aviso--grave">No descuentan stock porque no tienen ningún insumo del catálogo: Grasa, Fécula\./.test(hi))
  chk('cada ingrediente dice sus insumos', /Insumos: Harina 000 · Jupiter/.test(hi) && /Insumos: ninguno/.test(hi))
  await I.accionIngrediente({ ingInsumos: 'i-grasa' })
  chk('elegir insumos: abre la lista del catálogo', /data-ing-insumo="ins-g"/.test(I.__doc.getElementById('pr-config-cuerpo').innerHTML))
  I.estado.config.insumosElegidos.add('ins-g')
  await I.accionIngrediente({ ingGuardarInsumos: 'i-grasa' })
  chk('guardar_ingrediente_insumos con los elegidos', JSON.stringify(rpcs(I, 'guardar_ingrediente_insumos')[0]) === '{"p_ingrediente_id":"i-grasa","p_insumo_ids":["ins-g"]}')
  conInputs(I, [input({ 'data-ing-nombre': 'i-grasa' }, { value: 'Grasa vacuna' }), input({ 'data-ing-descuenta': 'i-grasa' }, { checked: false }), input({ 'data-ing-activo': 'i-grasa' }, { checked: false })])
  await I.accionIngrediente({ ingGuardar: 'i-grasa' })
  chk('guardar un ingrediente: nombre, descuenta, orden y activo del formulario', JSON.stringify(rpcs(I, 'guardar_ingrediente')[0]) === JSON.stringify({ p_id: 'i-grasa', p_nombre: 'Grasa vacuna', p_descuenta_stock: false, p_orden: 2, p_activo: false }), JSON.stringify(rpcs(I, 'guardar_ingrediente')[0]))
  I.__doc.getElementById('pr-config-ing-nuevo').value = 'Colorante'
  await I.accionIngrediente({ ingAgregar: '1' })
  chk('agregar un ingrediente: descuenta por defecto, al final', JSON.stringify(rpcs(I, 'guardar_ingrediente').at(-1)) === JSON.stringify({ p_id: null, p_nombre: 'Colorante', p_descuenta_stock: true, p_orden: 4, p_activo: true }))

  // ── Productos y presentaciones ───────────────────────────────────────
  const P = armar()
  Object.assign(P.__tablas, {
    productos_terminados: [{ id: 'p1', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', activo: true, orden: 1 }],
    producto_presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x600', con_cono: true, media_caja: false, empaque: 'bolsa granel', unidades_por_caja: 600, activa: true, orden: 1 }],
  })
  await P.mostrarConfig()
  P.estado.config.tab = 'productos'
  await P.cargarPestanaConfig()
  let hp = P.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('aviso: los productos vinieron del prototipo', /vinieron del prototipo/.test(hp))
  chk('dice que cambiar las unidades por caja no toca lo producido', /no toca lo ya producido/.test(hp))
  chk('unidades por caja por data-numero, entera', /data-pres-unidades="pr1" data-numero="600" data-decimales="0"/.test(hp))
  await P.accionProducto({ productosRevisados: '1' })
  chk('"Ya los revisé" lo guarda en la tablet y lo saca', P.localStorage.getItem('produccion.aviso-productos-revisado') === '1' && !/vinieron del prototipo/.test(P.__doc.getElementById('pr-config-cuerpo').innerHTML))
  conInputs(P, [input({ 'data-pres-unidades': 'pr1' }, { value: '0' })])
  await P.accionProducto({ presGuardar: 'pr1' })
  chk('unidades por caja en 0: no se guarda', rpcs(P, 'guardar_presentacion').length === 0 && /entero mayor a cero/.test(P.__doc.getElementById('pr-config-error').textContent))
  const u = P.enlazarCampoNumero({ ...input({ 'data-pres-unidades': 'pr1' }), setAttribute() {}, addEventListener() {} }, { decimales: 0 })
  P.ponerNumero(u, 480)
  conInputs(P, [u, input({ 'data-pres-nombre': 'pr1' }, { value: 'Caja x480' }), input({ 'data-pres-cono': 'pr1' }, { checked: true }),
    input({ 'data-pres-media': 'pr1' }, { checked: true }), input({ 'data-pres-empaque': 'pr1' }, { value: '  ' }), input({ 'data-pres-activa': 'pr1' }, { checked: true })])
  await P.accionProducto({ presGuardar: 'pr1' })
  chk('guardar una presentación: todo lo del formulario (empaque vacío → null)', JSON.stringify(rpcs(P, 'guardar_presentacion')[0]) === JSON.stringify({
    p_id: 'pr1', p_producto_id: 'p1', p_nombre: 'Caja x480', p_con_cono: true, p_media_caja: true, p_empaque: null, p_unidades_por_caja: 480, p_activa: true, p_orden: 1 }), JSON.stringify(rpcs(P, 'guardar_presentacion')[0]))
  chk('guardar_producto: tipo vacío → null', P.parametrosGuardarProducto({ id: 'p1', nombre: 'X', tipo_masa: 'Común', activo: true, orden: 1 }, 'u-cn', { tipo_masa: '  ' }).p_tipo_masa === null)
  P.__doc.getElementById('pr-config-prod-nuevo').value = 'Cucuruchón Grande'
  await P.accionProducto({ prodAgregar: '1' })
  chk('agregar un producto: en la unidad, activo, al final', JSON.stringify(rpcs(P, 'guardar_producto').at(-1)) === JSON.stringify({ p_id: null, p_unidad_negocio_id: 'u-cn', p_nombre: 'Cucuruchón Grande', p_tipo_masa: null, p_activo: true, p_orden: 2 }))

  // ── Marcas ────────────────────────────────────────────────────────────
  const K = armar()
  K.__tablas.marcas_personalizadas = [{ id: 'mk1', nombre: 'FRIGOR', activa: true }, { id: 'mk2', nombre: 'GRIDO', activa: false }]
  await K.mostrarConfig()
  K.estado.config.tab = 'marcas'
  await K.cargarPestanaConfig()
  K.estado.config.busqueda = 'frí'
  K.pintarPestanaConfig()
  const hk = K.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('el buscador filtra (sin acentos ni mayúsculas)', /FRIGOR/.test(hk) && !/GRIDO/.test(hk))
  await K.accionMarca({ marcaActiva: 'mk1' })
  chk('dar de baja una marca: activa=false con su nombre', JSON.stringify(rpcs(K, 'guardar_marca')[0]) === '{"p_id":"mk1","p_nombre":"FRIGOR","p_activa":false}')
  K.__doc.getElementById('pr-config-marca-nueva').value = 'Heladería Sol'
  await K.accionMarca({ marcaAgregar: '1' })
  chk('alta de marca', JSON.stringify(rpcs(K, 'guardar_marca').at(-1)) === '{"p_id":null,"p_nombre":"Heladería Sol","p_activa":true}')

  // ── Personal ──────────────────────────────────────────────────────────
  const E = armar()
  E.__setRpc(async (n) => n === 'personal_produccion'
    ? { data: [{ id: 'e1', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'] }, { id: 'e2', nombre: 'Otra Unidad', misma_unidad: false, puestos: [] },
      { id: 'e3', nombre: 'Prestado', misma_unidad: false, puestos: ['operario'] }], error: null }
    : { data: null, error: null })
  await E.mostrarConfig()
  // La tablet puede estar en otra unidad: los puestos van a la unidad que se
  // está configurando.
  E.estado.unidadId = 'u-dp'
  E.estado.config.tab = 'personal'
  await E.cargarPestanaConfig()
  let he = E.__doc.getElementById('pr-config-cuerpo').innerHTML
  chk('personal: los de la unidad y los que ya tienen puesto acá', /Federico Silva/.test(he) && /Prestado/.test(he) && !/Otra Unidad/.test(he))
  chk('los tres puestos por persona, con los que tiene marcados', /data-puesto="encargado" data-persona-puesto="e1" checked/.test(he) && /data-puesto="masero" data-persona-puesto="e1">/.test(he))
  E.estado.config.todoElPersonal = true
  E.pintarPestanaConfig()
  chk('"mostrar también otras unidades" los muestra', /Otra Unidad/.test(E.__doc.getElementById('pr-config-cuerpo').innerHTML))
  conInputs(E, [input({ 'data-persona-puesto': 'e1', 'data-puesto': 'encargado' }, { checked: true }), input({ 'data-persona-puesto': 'e1', 'data-puesto': 'masero' }, { checked: true }),
    input({ 'data-persona-puesto': 'e1', 'data-puesto': 'operario' }, { checked: false }), input({ 'data-persona-puesto': 'e2', 'data-puesto': 'masero' }, { checked: true })])
  await E.accionPersonal({ puestosGuardar: 'e1' })
  chk('guardar_puestos con los marcados de ESA persona, en la unidad', JSON.stringify(rpcs(E, 'guardar_puestos')[0]) === '{"p_empleado_id":"e1","p_unidad_negocio_id":"u-cn","p_puestos":["encargado","masero"]}')

  // ── HTML malicioso ────────────────────────────────────────────────────
  const X = armar()
  X.estado.config = { unidadId: 'u-cn', tab: 'maquinas', busqueda: marca('busqueda'), recetaMaquina: marca('maqId'), recetaTipo: marca('tipo') }
  X.estado.config.datos = { maquinas: [{ id: marca('maqId'), nombre: marca('maqNombre'), activa: true, orden: 1 }] }
  chequearMarcas(chk, 'máquinas', X.htmlConfigMaquinas(X.estado.config), ['maqId', 'maqNombre'])
  X.estado.config.datos = {
    maquinas: [{ id: marca('maqId'), nombre: marca('maqNombre') }], tipos: [marca('tipo')],
    recetas: [{ id: 'r', tipo_masa: marca('tipo'), version: marca('version'), nota: marca('nota'), creada_por: 'e', created_at: null }],
    items: [{ receta_id: 'r', ingrediente_id: marca('ingId'), cantidad_kg: marca('kg'), insumo_preferido_id: marca('insId') }],
    ingredientes: [{ id: marca('ingId'), nombre: marca('ingNombre'), activo: true }], nombres: new Map([['e', marca('autor')]]),
    relaciones: [{ ingrediente_id: marca('ingId'), insumo_id: marca('insId') }], insumos: [{ id: marca('insId'), nombre: marca('insNombre'), marca: marca('insMarca') }],
  }
  chequearMarcas(chk, 'recetas', X.htmlConfigRecetas(X.estado.config), ['maqId', 'maqNombre', 'tipo', 'version', 'nota', 'ingId', 'ingNombre', 'insId', 'insNombre', 'insMarca', 'autor'])
  chk('una cantidad que no es número no llega cruda (pasa por Number)', !/data-numero="[^"]*data-xss/.test(X.htmlConfigRecetas(X.estado.config)))
  X.estado.config.recetaTipo = X.NUEVO_TIPO
  chequearMarcas(chk, 'receta nueva', X.htmlConfigRecetas(X.estado.config), ['tipo'])
  X.estado.config.datos = { ingredientes: [{ id: marca('ingId'), nombre: marca('ingNombre'), descuenta_stock: true, activo: true }], relaciones: [], insumos: [{ id: marca('insId'), nombre: marca('insNombre'), marca: marca('insMarca') }] }
  X.estado.config.ingredienteAbierto = marca('ingId')
  X.estado.config.busqueda = ''
  X.estado.config.insumosElegidos = new Set()
  chequearMarcas(chk, 'ingredientes', X.htmlConfigIngredientes(X.estado.config), ['ingId', 'ingNombre', 'insId', 'insNombre', 'insMarca'])
  X.estado.config.busqueda = marca('busqueda')
  chequearMarcas(chk, 'buscador de insumos', X.htmlConfigIngredientes(X.estado.config), ['busqueda'])
  X.estado.config.datos = { productos: [{ id: marca('prodId'), nombre: marca('prodNombre'), tipo_masa: marca('prodTipo'), activo: true }],
    presentaciones: [{ id: marca('presId'), producto_id: marca('prodId'), nombre: marca('presNombre'), empaque: marca('empaque'), unidades_por_caja: marca('upc'), activa: true }] }
  chequearMarcas(chk, 'productos', X.htmlConfigProductos(X.estado.config), ['prodId', 'prodNombre', 'prodTipo', 'presId', 'presNombre', 'empaque', 'upc'])
  X.estado.config.datos = { marcas: [{ id: marca('marcaId'), nombre: marca('marcaNombre'), activa: true }] }
  X.estado.config.busqueda = ''
  chequearMarcas(chk, 'marcas', X.htmlConfigMarcas(X.estado.config), ['marcaId', 'marcaNombre'])
  X.estado.config.busqueda = marca('busqueda')
  chequearMarcas(chk, 'buscador de marcas', X.htmlConfigMarcas(X.estado.config), ['busqueda'])
  X.estado.config.datos = { personal: [{ id: marca('persId'), nombre: marca('persNombre'), misma_unidad: true, puestos: [] }] }
  X.estado.config.busqueda = ''
  chequearMarcas(chk, 'personal', X.htmlConfigPersonal(X.estado.config), ['persId', 'persNombre'])
  X.estado.config.busqueda = marca('buscaPersona')
  chequearMarcas(chk, 'buscador de personal', X.htmlConfigPersonal(X.estado.config), ['buscaPersona'])
  X.estado.unidades = new Map([[marca('unidadId'), marca('unidadNombre')]])
  X.pintarSelectorUnidad('pr-config-unidad', [marca('unidadId')], null)
  chequearMarcas(chk, 'selector de unidad', X.__doc.getElementById('pr-config-unidad').innerHTML, ['unidadId', 'unidadNombre'])
})())

fin()
