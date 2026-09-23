// B6 del módulo Producción (22/09/2026), rehecha con el rediseño parte 5
// (23/09/2026): la configuración, por unidad. Es la ÚNICA pantalla del módulo
// que se usa en la compu.
//
// Contrato con la base (pg_get_functiondef, 23/09/2026):
//  - guardar_maquina(p_id, p_unidad_negocio_id, p_nombre, p_activa, p_orden):
//    una máquina con turno abierto no se desactiva (lo dice la base).
//  - guardar_receta_original(p_maquina_id, p_tipo_masa, p_items
//    [{ingrediente_id, cantidad_kg, insumo_preferido_id}], p_nota) → crea una
//    versión NUEVA; la vigente es la de número más alto. La nota la acepta en
//    null: obligatoria es regla de la pantalla.
//  - guardar_ingrediente(p_id, p_nombre, p_descuenta_stock, p_orden, p_activo),
//    guardar_ingrediente_insumos(p_ingrediente_id, p_insumo_ids).
//  - guardar_producto(p_id, p_unidad_negocio_id, p_nombre, p_tipo_masa,
//    p_activo, p_orden), guardar_presentacion(p_id, p_producto_id, p_nombre,
//    p_con_cono, p_media_caja, p_empaque, p_unidades_por_caja, p_activa,
//    p_orden), guardar_marca(p_id, p_nombre, p_activa),
//    guardar_puestos(p_empleado_id, p_unidad_negocio_id, p_puestos).
//  - personal_produccion(p_unidad) → (id, nombre, misma_unidad, puestos,
//    puestos_temporales, tiene_pin, pin_temporal, debe_cambiar_pin,
//    es_maestro). NO devuelve "bloqueado".
//  - generar_pines_iniciales(p_unidad) → TABLE(empleado_id, nombre, pin), solo
//    de los que NO tienen PIN vigente; lista vacía si ya todos tienen.
//  - asignar_pin_produccion(p_empleado_id, p_pin) (4 números, deja
//    debe_cambiar), asignar_mi_pin_maestro(p_pin) (8 números).
//  - otorgar_puesto_temporal(p_empleado_id, p_unidad, p_puesto, p_hasta,
//    p_maestro_id, p_maestro_pin) → {ok, hasta, pin_temporal}; pin_temporal
//    viene NULL si esa persona ya tenía PIN. revocar_puesto_temporal(p_id).
//  - revisar_marca(p_marca_id, p_aprobar, p_nombre): el nombre se puede
//    corregir al aceptar; null o vacío deja el que estaba.
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
const cuerpo = (S) => S.__doc.getElementById('pr-config-cuerpo').innerHTML
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

// El personal de las pruebas de la pestaña Personal.
const PERSONAL = [
  { id: 'e1', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: true },
  { id: 'e2', nombre: 'Otra Unidad', misma_unidad: false, puestos: [], puestos_temporales: [], tiene_pin: false, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
  { id: 'e3', nombre: 'Prestado', misma_unidad: false, puestos: ['operario'], puestos_temporales: ['masero'], tiene_pin: true, pin_temporal: true, debe_cambiar_pin: true, es_maestro: false },
  { id: 'e4', nombre: 'Mariela Soto', misma_unidad: true, puestos: ['masero'], puestos_temporales: [], tiene_pin: false, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
]
const EN_UN_ANIO = new Date(Date.now() + 360 * 24 * 3600 * 1000).toISOString()
const AYER = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

async function personal(S) {
  S.__setRpc(async (n) => n === 'personal_produccion' ? { data: PERSONAL.map(p => ({ ...p })), error: null } : { data: null, error: null })
  S.__tablas.puestos_temporales = [
    { id: 't1', empleado_id: 'e3', puesto: 'masero', desde: AYER, hasta: EN_UN_ANIO, otorgado_por: 'e1' },
    { id: 't2', empleado_id: 'e4', puesto: 'encargado', desde: AYER, hasta: AYER, otorgado_por: 'e1' },
  ]
  S.__tablas.v_empleados_publico = [{ id: 'e1', nombre: 'Federico Silva' }]
  // La tablet puede estar en otra unidad: todo lo de esta pestaña tiene que ir
  // a la unidad que se está CONFIGURANDO, no a la de la tablet.
  S.estado.unidadId = 'u-dp'
  await S.mostrarConfig()
  S.estado.config.tab = 'personal'
  await S.cargarPestanaConfig()
  return S
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
  const hm = cuerpo(M)
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
  chk('agregar sin nombre: no se manda', rpcs(M, 'guardar_maquina').length === antes && /nombre/.test(M.estado.config.error.texto))
  chk('… y el error va PEGADO al botón de agregar, no arriba de todo',
    M.estado.config.error.donde === 'pr-cfg-maq-agregar' && /pr-cfg-error[^>]*>[^<]*nombre[\s\S]*?id="pr-cfg-maq-agregar"/.test(cuerpo(M)) &&
    M.__doc.getElementById('pr-config-error').hidden === true)
  M.__setRpc(async () => ({ data: null, error: { message: 'La máquina tiene un turno abierto: cerralo antes de desactivarla.', code: 'P0001' } }))
  await M.accionMaquina({ maqActiva: 'm1' })
  chk('desactivar: activa=false, conservando nombre y orden', JSON.stringify(rpcs(M, 'guardar_maquina').at(-1)) === JSON.stringify({ p_id: 'm1', p_unidad_negocio_id: 'u-cn', p_nombre: 'Máquina 1', p_activa: false, p_orden: 1 }))
  chk('… y el rechazo de la base, tal cual', M.estado.config.error.texto === 'La máquina tiene un turno abierto: cerralo antes de desactivarla.' && cuerpo(M).includes('La máquina tiene un turno abierto'))
  M.__setRpc(async () => ({ data: 'm1', error: null }))
  conInputs(M, [input({ 'data-maq-nombre': 'm1' }, { value: ' Horno A ' })])
  await M.accionMaquina({ maqGuardar: 'm1' })
  chk('renombrar: el nombre nuevo recortado', rpcs(M, 'guardar_maquina').at(-1).p_nombre === 'Horno A' && rpcs(M, 'guardar_maquina').at(-1).p_activa === true)

  // ── Pestañas ──────────────────────────────────────────────────────────
  const T = armar()
  // Como función, para que el doble APLIQUE el .eq() y el contador tenga que
  // pedir de verdad solo los pendientes.
  T.__tablas.marcas_personalizadas = (filtros) => {
    const todas = [{ id: 'k1', nombre: 'A', activa: true, estado_alta: 'pendiente_revision' }, { id: 'k2', nombre: 'B', activa: true, estado_alta: 'aprobada' }]
    const eq = filtros.filter(f => f[0] === 'eq')
    return { data: todas.filter(m => eq.every(([, col, val]) => m[col] === val)), error: null }
  }
  await T.mostrarConfig()
  const ht = T.__doc.getElementById('pr-config-tabs').innerHTML
  chk('las seis pestañas del diseño', ['Máquinas', 'Recetas', 'Ingredientes', 'Productos', 'Marcas / Conos', 'Personal'].every(x => ht.includes(x)))
  chk('la de Marcas / Conos lleva el contador de pendientes', /Marcas \/ Conos <span class="pr-cfg-tab__pend">1<\/span>/.test(ht), ht)
  chk('la pestaña abierta se marca', /pr-cfg-tab--activa[^>]*data-config-tab="maquinas"/.test(ht))
  T.estado.config.pendientes = null
  T.pintarPestanaConfig()
  chk('sin poder contar, no se dibuja ningún contador (nunca un número inventado)', !/pr-cfg-tab__pend/.test(T.__doc.getElementById('pr-config-tabs').innerHTML))
  T.estado.config.pendientes = 0
  T.pintarPestanaConfig()
  chk('con cero pendientes tampoco', !/pr-cfg-tab__pend/.test(T.__doc.getElementById('pr-config-tabs').innerHTML))

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
  let hr = cuerpo(R)
  chk('la receta del prototipo muestra el aviso "revisar"', /Revisar: esta receta vino del prototipo/.test(hr))
  R.estado.config.recetaTipo = 'Común'
  R.pintarPestanaConfig()
  hr = cuerpo(R)
  chk('una versión revisada ya no muestra el aviso', !/Revisar: esta receta vino del prototipo/.test(hr))
  chk('las tres columnas del diseño: recetas, editor e historial', /class="pr-cfg-recetas"/.test(hr))
  chk('muestra las versiones con autor, fecha y nota', /Versión 2 · vigente<\/strong> · 20\/09\/2026 · Federico Silva/.test(hr) && /Versión 1<\/strong> · 01\/09\/2026 · —/.test(hr), hr.slice(hr.indexOf('Versiones'), hr.indexOf('Versiones') + 320))
  chk('la vigente se marca en el historial', /pr-cfg-version pr-cfg-version--vigente/.test(hr))
  chk('el botón dice qué versión va a crear', /id="pr-cfg-receta-guardar"[^>]*>Guardar versión 3</.test(hr), hr.slice(hr.indexOf('pr-cfg-receta-guardar') - 40, hr.indexOf('pr-cfg-receta-guardar') + 90))
  chk('próximaVersion: la vigente + 1, y 1 si no hay ninguna', R.proximaVersion(d.recetas, 'Común') === 3 && R.proximaVersion(d.recetas, 'Frutilla') === 1)
  chk('la nota dice que es obligatoria', /pr-obligatorio">· obligatoria/.test(hr))
  chk('las cantidades van por data-numero (se ponen con ponerNumero, no con value=)', /data-receta-kg="i-harina" data-numero="25"/.test(hr) && !/data-receta-kg="i-harina"[^>]*value=/.test(hr))
  chk('el editor tiene solo los ingredientes activos', !/data-receta-kg="i-baja"/.test(hr))
  chk('el insumo preferido, con los insumos del ingrediente', /data-receta-pref="i-harina"/.test(hr) && /value="ins-h1" selected/.test(hr) && !/data-receta-pref="i-cacao"/.test(hr))
  chk('se ofrece un tipo nuevo', /Tipo nuevo…/.test(hr))
  chk('cada fila tiene dónde decir "antes X", oculto hasta que se toque', /data-receta-antes="i-harina" hidden/.test(hr))
  chk('textoAntes: solo si cambió, en formato argentino', R.textoAntes(2.5, 2.6) === 'antes 2,5' && R.textoAntes(2.5, 2.5) === null && R.textoAntes(null, 3) === null && R.textoAntes(3, null) === null)
  // marcarCambioReceta escribe DIRECTO en el DOM: re-renderizar sacaría el foco.
  const campoKg = R.enlazarCampoNumero({ ...input({ 'data-receta-kg': 'i-harina', 'data-numero': '2.5' }), setAttribute() {}, addEventListener() {} }, { decimales: 3 })
  const celdaAntes = { ...input({ 'data-receta-antes': 'i-harina' }), textContent: '', hidden: true }
  conInputs(R, [campoKg, celdaAntes])
  R.ponerNumero(campoKg, 2.6)
  R.marcarCambioReceta(campoKg)
  chk('tocar una cantidad la marca con lo que decía antes', celdaAntes.textContent === 'antes 2,5' && celdaAntes.hidden === false)
  R.ponerNumero(campoKg, 2.5)
  R.marcarCambioReceta(campoKg)
  chk('… y volver al valor original la desmarca', celdaAntes.textContent === '' && celdaAntes.hidden === true)
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
  chk('sin nota no se guarda', rpcs(R, 'guardar_receta_original').length === 0 && /nota/.test(R.estado.config.error.texto))
  chk('… y ese error va pegado al botón de guardar la versión', R.estado.config.error.donde === 'pr-cfg-receta-guardar' && /pr-cfg-error[\s\S]{0,300}id="pr-cfg-receta-guardar"/.test(cuerpo(R)))
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
  const hn = cuerpo(R)
  chk('tipo nuevo: pide el nombre y de cuál parte', /id="pr-config-tipo-nuevo"/.test(hn) && /data-receta-partida="1"/.test(hn))
  chk('… con las cantidades del tipo de partida', /data-receta-kg="i-cacao" data-numero="1.5"/.test(hn))
  chk('… y el botón dice versión 1', /id="pr-cfg-receta-guardar"[^>]*>Guardar versión 1</.test(hn))
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
  const hi = cuerpo(I)
  chk('aviso bordó con los que no tienen insumo (grasa y fécula; el agua no descuenta)', /pr-aviso--grave">No descuentan stock porque no tienen ningún insumo del catálogo: Grasa, Fécula\./.test(hi))
  chk('cada ingrediente dice sus insumos', /Insumos: Harina 000 · Jupiter/.test(hi) && /Insumos: ninguno/.test(hi))
  await I.accionIngrediente({ ingInsumos: 'i-grasa' })
  chk('elegir insumos: abre la lista del catálogo', /data-ing-insumo="ins-g"/.test(cuerpo(I)))
  I.estado.config.insumosElegidos.add('ins-g')
  await I.accionIngrediente({ ingGuardarInsumos: 'i-grasa' })
  chk('guardar_ingrediente_insumos con los elegidos', JSON.stringify(rpcs(I, 'guardar_ingrediente_insumos')[0]) === '{"p_ingrediente_id":"i-grasa","p_insumo_ids":["ins-g"]}')
  conInputs(I, [input({ 'data-ing-nombre': 'i-grasa' }, { value: 'Grasa vacuna' }), input({ 'data-ing-descuenta': 'i-grasa' }, { checked: false }), input({ 'data-ing-activo': 'i-grasa' }, { checked: false })])
  await I.accionIngrediente({ ingGuardar: 'i-grasa' })
  chk('guardar un ingrediente: nombre, descuenta, orden y activo del formulario', JSON.stringify(rpcs(I, 'guardar_ingrediente')[0]) === JSON.stringify({ p_id: 'i-grasa', p_nombre: 'Grasa vacuna', p_descuenta_stock: false, p_orden: 2, p_activo: false }), JSON.stringify(rpcs(I, 'guardar_ingrediente')[0]))
  I.__doc.getElementById('pr-config-ing-nuevo').value = 'Colorante'
  await I.accionIngrediente({ ingAgregar: '1' })
  chk('agregar un ingrediente: descuenta por defecto, al final', JSON.stringify(rpcs(I, 'guardar_ingrediente').at(-1)) === JSON.stringify({ p_id: null, p_nombre: 'Colorante', p_descuenta_stock: true, p_orden: 4, p_activo: true }))
  I.__doc.getElementById('pr-config-ing-nuevo').value = '  '
  await I.accionIngrediente({ ingAgregar: '1' })
  chk('el error de ingredientes va pegado a su botón', I.estado.config.error.donde === 'pr-cfg-ing-agregar' && /pr-cfg-error[\s\S]{0,200}id="pr-cfg-ing-agregar"/.test(cuerpo(I)))

  // ── Productos y presentaciones ───────────────────────────────────────
  const P = armar()
  Object.assign(P.__tablas, {
    productos_terminados: [{ id: 'p1', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', activo: true, orden: 1 },
      { id: 'p2', nombre: 'Mini chocolate', tipo_masa: 'Chocolate', activo: true, orden: 2 }],
    producto_presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x600', con_cono: true, media_caja: false, empaque: 'bolsa granel', unidades_por_caja: 600, activa: true, orden: 1 }],
  })
  await P.mostrarConfig()
  P.estado.config.tab = 'productos'
  await P.cargarPestanaConfig()
  let hp = cuerpo(P)
  chk('aviso: los productos vinieron del prototipo', /vinieron del prototipo/.test(hp))
  chk('dice que cambiar las unidades por caja no toca lo producido', /no toca lo ya producido/.test(hp))
  chk('unidades por caja por data-numero, entera', /data-pres-unidades="pr1" data-numero="600" data-decimales="0"/.test(hp))
  chk('los de chocolate van ABAJO y separados, como en la carga',
    hp.indexOf('data-prod-nombre="p1"') < hp.indexOf('pr-ag__corte-texto">Chocolate') && hp.indexOf('pr-ag__corte-texto">Chocolate') < hp.indexOf('data-prod-nombre="p2"'))
  chk('… y lo decide el tipo de masa, no el nombre', P.esProductoChocolate({ tipo_masa: 'Chocolate' }) === true && P.esProductoChocolate({ nombre: 'Mini chocolate', tipo_masa: 'Común' }) === false)
  P.__tablas.productos_terminados = [{ id: 'p1', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', activo: true, orden: 1 }]
  await P.cargarPestanaConfig()
  chk('sin productos de chocolate no se dibuja la línea', !/pr-ag__corte-texto/.test(cuerpo(P)))
  await P.accionProducto({ productosRevisados: '1' })
  chk('"Ya los revisé" lo guarda en la tablet y lo saca', P.localStorage.getItem('produccion.aviso-productos-revisado') === '1' && !/vinieron del prototipo/.test(cuerpo(P)))
  conInputs(P, [input({ 'data-pres-unidades': 'pr1' }, { value: '0' })])
  await P.accionProducto({ presGuardar: 'pr1' })
  chk('unidades por caja en 0: no se guarda', rpcs(P, 'guardar_presentacion').length === 0 && /entero mayor a cero/.test(P.estado.config.error.texto))
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

  // ── Marcas / Conos ────────────────────────────────────────────────────
  const K = armar()
  K.__tablas.marcas_personalizadas = [
    { id: 'mk1', nombre: 'FRIGOR', activa: true, estado_alta: 'aprobada', creada_por: null, creada_en: null },
    { id: 'mk2', nombre: 'GRIDO', activa: false, estado_alta: 'aprobada', creada_por: null, creada_en: null },
    { id: 'mk3', nombre: 'CASERATO 2', activa: false, estado_alta: 'pendiente_revision', creada_por: 'e-lau', creada_en: '2026-09-22T19:40:00Z' },
    { id: 'mk4', nombre: 'NO VA', activa: false, estado_alta: 'rechazada', creada_por: 'e-lau', creada_en: '2026-09-22T19:40:00Z' },
  ]
  K.__tablas.v_empleados_publico = [{ id: 'e-lau', nombre: 'Laura Méndez' }]
  await K.mostrarConfig()
  K.estado.config.tab = 'marcas'
  await K.cargarPestanaConfig()
  let hk = cuerpo(K)
  chk('los pendientes de revisar van ARRIBA del catálogo', hk.indexOf('Pendientes de revisar · 1') >= 0 && hk.indexOf('Pendientes de revisar') < hk.indexOf('Catálogo'))
  chk('cada pendiente dice quién lo cargó y cuándo', /Lo cargó Laura Méndez · 22\/09\/2026 16:40/.test(hk), hk.slice(hk.indexOf('Lo cargó') - 20, hk.indexOf('Lo cargó') + 80))
  chk('el nombre del pendiente se puede corregir antes de aceptar', /data-pend-nombre="mk3" value="CASERATO 2"/.test(hk))
  chk('con Aceptar y Rechazar', /data-pend-no="mk3">Rechazar/.test(hk) && /data-pend-si="mk3">Aceptar/.test(hk))
  chk('dice que se pueden usar igual mientras tanto', /Se pueden usar igual mientras tanto/.test(hk))
  chk('el catálogo no lista ni los pendientes ni los rechazados', !/>CASERATO 2</.test(hk.slice(hk.indexOf('Catálogo'))) && !/NO VA/.test(hk))
  chk('marcasPendientes y marcasDelCatalogo separan por estado_alta',
    K.marcasPendientes(K.estado.config.datos).length === 1 && K.marcasDelCatalogo(K.estado.config.datos).length === 2)
  conInputs(K, [input({ 'data-pend-nombre': 'mk3' }, { value: ' Caserato 2 ' })])
  await K.accionMarca({ pendSi: 'mk3' })
  chk('aceptar manda el nombre corregido', JSON.stringify(rpcs(K, 'revisar_marca')[0]) === '{"p_marca_id":"mk3","p_aprobar":true,"p_nombre":"Caserato 2"}', JSON.stringify(rpcs(K, 'revisar_marca')[0]))
  conInputs(K, [input({ 'data-pend-nombre': 'mk3' }, { value: '   ' })])
  await K.accionMarca({ pendSi: 'mk3' })
  chk('… y con el campo vacío manda null, para que quede el que tenía', rpcs(K, 'revisar_marca').at(-1).p_nombre === null)
  await K.accionMarca({ pendNo: 'mk3' })
  chk('rechazar: aprobar=false y sin tocar el nombre', JSON.stringify(rpcs(K, 'revisar_marca').at(-1)) === '{"p_marca_id":"mk3","p_aprobar":false,"p_nombre":null}')
  K.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso para revisar conos.' } }))
  await K.accionMarca({ pendSi: 'mk3' })
  chk('el rechazo de la base va pegado al bloque de pendientes', K.estado.config.error.donde === 'pr-cfg-pendientes' && cuerpo(K).includes('No tenés permiso para revisar conos.'))
  K.__setRpc(async () => ({ data: 'x', error: null }))
  K.estado.config.busqueda = 'frí'
  K.pintarPestanaConfig()
  hk = cuerpo(K)
  chk('el buscador filtra el catálogo (sin acentos ni mayúsculas)', /FRIGOR/.test(hk) && !/GRIDO/.test(hk))
  await K.accionMarca({ marcaActiva: 'mk1' })
  chk('dar de baja una marca: activa=false con su nombre', JSON.stringify(rpcs(K, 'guardar_marca')[0]) === '{"p_id":"mk1","p_nombre":"FRIGOR","p_activa":false}')
  K.__doc.getElementById('pr-config-marca-nueva').value = 'Heladería Sol'
  await K.accionMarca({ marcaAgregar: '1' })
  chk('alta de marca', JSON.stringify(rpcs(K, 'guardar_marca').at(-1)) === '{"p_id":null,"p_nombre":"Heladería Sol","p_activa":true}')

  // ── Personal: los puestos, de a muchos ────────────────────────────────
  const E = await personal(armar())
  let he = cuerpo(E)
  chk('personal: los de la unidad y los que ya tienen puesto acá', /Federico Silva/.test(he) && /Prestado/.test(he) && !/Otra Unidad/.test(he))
  chk('los tres puestos por persona, con los que tiene marcados', /data-puesto="encargado" data-persona-puesto="e1" checked/.test(he) && /data-puesto="masero" data-persona-puesto="e1"[^>]*aria-label/.test(he) && !/data-puesto="masero" data-persona-puesto="e1" checked/.test(he))
  chk('un solo botón de guardar al pie', (he.match(/id="pr-cfg-personal-guardar"/g) || []).length === 1 && !/data-puestos-guardar/.test(he))
  chk('… que arranca sin contar filas', /id="pr-cfg-personal-guardar"[^>]*>Guardar los cambios</.test(he))
  chk('el estado del PIN de cada persona', /pr-cfg-chip--ok">PIN propio/.test(he) && /pr-cfg-chip--gris">Sin PIN/.test(he) && /pr-cfg-chip--alerta">PIN pendiente de cambiar/.test(he))
  chk('… y el PIN que vence se dice aparte', /pr-cfg-chip--gris">temporal/.test(he))
  chk('estadoDelPin sale de personal_produccion, sin inventar "bloqueado"',
    E.estadoDelPin({ tiene_pin: false }).texto === 'Sin PIN' && E.estadoDelPin({ tiene_pin: true, debe_cambiar_pin: true }).texto === 'PIN pendiente de cambiar' &&
    E.estadoDelPin({ tiene_pin: true }).texto === 'PIN propio' && !he.includes('Bloqueado'))
  E.estado.config.todoElPersonal = true
  E.pintarPestanaConfig()
  chk('"mostrar también otras unidades" los muestra', /Otra Unidad/.test(cuerpo(E)))
  E.estado.config.todoElPersonal = false
  // Tocar una casilla NO guarda: marca la fila.
  E.tocarPuestoPersonal('e1', 'masero', true)
  he = cuerpo(E)
  chk('tocar una casilla no manda nada todavía', rpcs(E, 'guardar_puestos').length === 0)
  chk('… la fila queda marcada (franja, fondo y la palabra)', /pr-cfg-fila--tocada[\s\S]{0,700}Cambiada/.test(he) && E.estado.config.cambios.get('e1').join(',') === 'encargado,masero')
  chk('… y el botón dice cuántas filas se tocaron', /id="pr-cfg-personal-guardar"[^>]*>Guardar los cambios · 1 fila</.test(he))
  E.tocarPuestoPersonal('e1', 'masero', false)
  chk('destildar y volver al estado de la base deja de contar como cambio', E.estado.config.cambios.size === 0 && /Guardar los cambios<\/button>/.test(cuerpo(E)))
  E.tocarPuestoPersonal('e1', 'masero', true)
  E.tocarPuestoPersonal('e1', 'operario', true)
  chk('tocar una segunda casilla parte de lo ya tocado, no de la base', E.estado.config.cambios.get('e1').join(',') === 'encargado,masero,operario')
  E.tocarPuestoPersonal('e1', 'operario', false)
  E.tocarPuestoPersonal('e4', 'operario', true)
  chk('dos filas tocadas: el botón dice 2', /Guardar los cambios · 2 filas</.test(cuerpo(E)))
  await E.guardarCambiosPersonal()
  const gp = rpcs(E, 'guardar_puestos')
  chk('se mandan SOLO las filas tocadas, cada una con sus puestos y la unidad que se configura', gp.length === 2 &&
    JSON.stringify(gp[0]) === '{"p_empleado_id":"e1","p_unidad_negocio_id":"u-cn","p_puestos":["encargado","masero"]}' &&
    JSON.stringify(gp[1]) === '{"p_empleado_id":"e4","p_unidad_negocio_id":"u-cn","p_puestos":["masero","operario"]}', JSON.stringify(gp))
  chk('… y no se manda ninguna de las que nadie tocó', !gp.some(x => x.p_empleado_id === 'e2' || x.p_empleado_id === 'e3'))
  chk('después de guardar no queda nada pendiente', E.estado.config.cambios.size === 0 && E.__llamadas.exitos.some(m => m === '2 filas guardadas.'))
  // Sin cambios, el botón se puede tocar igual y dice qué falta.
  await E.guardarCambiosPersonal()
  chk('tocar Guardar sin cambios: no manda nada y lo dice', rpcs(E, 'guardar_puestos').length === 2 && E.estado.config.error.texto === 'No cambiaste nada todavía.')
  chk('… pegado al botón, y el botón se puede tocar', E.estado.config.error.donde === 'pr-cfg-personal-guardar' &&
    /pr-cfg-error[\s\S]{0,300}id="pr-cfg-personal-guardar"(?![^>]*disabled)/.test(cuerpo(E)))
  chk('… y pegado a ESE botón nada más, no a todos los de la pantalla',
    (cuerpo(E).match(/No cambiaste nada todavía\./g) || []).length === 1, cuerpo(E).match(/No cambiaste nada todavía\./g))
  // Un rechazo de la base: para ahí y conserva lo que no entró.
  const E2 = await personal(armar())
  E2.tocarPuestoPersonal('e1', 'masero', true)
  E2.tocarPuestoPersonal('e4', 'operario', true)
  E2.__setRpc(async (n) => n === 'guardar_puestos' ? { data: null, error: { message: 'Puesto inválido.' } } : { data: PERSONAL.map(p => ({ ...p })), error: null })
  await E2.guardarCambiosPersonal()
  chk('si la base rechaza una fila, para ahí y no manda las demás', rpcs(E2, 'guardar_puestos').length === 1 && E2.estado.config.cambios.size === 2)
  chk('… y el mensaje de la base se muestra tal cual, pegado al botón',
    E2.estado.config.error.texto === 'Puesto inválido.' && cuerpo(E2).includes('Puesto inválido.') && E2.estado.config.error.donde === 'pr-cfg-personal-guardar')
  chk('… sin dejar el botón trabado', !/id="pr-cfg-personal-guardar"[^>]*disabled/.test(cuerpo(E2)) && E2.estado.config.guardando === false)

  // ── Salir sin guardar ─────────────────────────────────────────────────
  const V = await personal(armar())
  V.tocarPuestoPersonal('e1', 'masero', true)
  chk('con cambios sin guardar, cambiar de pestaña NO se hace de una', V.pedirSalida(V.estado.config, { tab: 'marcas' }) === false && V.estado.config.tab === 'personal')
  chk('… y la pantalla avisa qué se pierde', /1 fila cambiada sin guardar/.test(cuerpo(V)) && /id="pr-cfg-salir-si"/.test(cuerpo(V)) && /id="pr-cfg-salir-no"/.test(cuerpo(V)))
  V.cancelarSalida()
  chk('"Seguir acá" vuelve a la pestaña con los cambios puestos', V.estado.config.salida === null && V.estado.config.cambios.size === 1 && /pr-cfg-fila--tocada/.test(cuerpo(V)))
  V.pedirSalida(V.estado.config, { tab: 'marcas' })
  V.__tablas.marcas_personalizadas = []
  await V.confirmarSalida()
  chk('"Salir sin guardar" tira los cambios y cambia de pestaña', V.estado.config.tab === 'marcas' && V.estado.config.cambios.size === 0 && rpcs(V, 'guardar_puestos').length === 0)
  chk('sin cambios no se pregunta nada', V.pedirSalida(V.estado.config, { tab: 'personal' }) === true)

  // ── PINes ─────────────────────────────────────────────────────────────
  const G = await personal(armar())
  chk('hay botón de generar los PINes que faltan', /id="pr-cfg-generar-pines"/.test(cuerpo(G)))
  G.__setRpc(async (n) => n === 'generar_pines_iniciales'
    ? { data: [{ empleado_id: 'e2', nombre: 'Otra Unidad', pin: '4821' }, { empleado_id: 'e4', nombre: 'Mariela Soto', pin: '7390' }], error: null }
    : { data: PERSONAL.map(p => ({ ...p })), error: null })
  await G.generarPines()
  chk('generar PINes llama a generar_pines_iniciales con la unidad', JSON.stringify(rpcs(G, 'generar_pines_iniciales')[0]) === '{"p_unidad_negocio_id":"u-cn"}')
  const hoja = G.__doc.getElementById('pr-cfg-hoja')
  chk('se abre la hoja para imprimir, con una tira por persona', hoja.hidden === false &&
    (G.__doc.getElementById('pr-cfg-hoja-tiras').innerHTML.match(/class="pr-tira"/g) || []).length === 2)
  chk('cada tira: nombre, PIN y para qué sirve', /Mariela Soto/.test(G.__doc.getElementById('pr-cfg-hoja-tiras').innerHTML) &&
    /pr-tira__pin">7390/.test(G.__doc.getElementById('pr-cfg-hoja-tiras').innerHTML) &&
    /PIN de un solo uso: la primera vez vas a elegir uno tuyo/.test(G.__doc.getElementById('pr-cfg-hoja-tiras').innerHTML))
  chk('… y dice que se ven una sola vez', /UNA sola vez/.test(G.__doc.getElementById('pr-cfg-hoja-aviso').textContent))
  // Los PINes no quedan en ningún storage, ni en el resto del DOM.
  const enStorage = [...G.__ls.values(), ...G.__ss.values()].join('|')
  chk('los PINes NO quedan en localStorage ni en sessionStorage', !/4821|7390/.test(enStorage), enStorage)
  const restoDelDom = [...G.__els.entries()].filter(([id]) => !id.startsWith('pr-cfg-hoja')).map(([, e]) => `${e.innerHTML}|${e.textContent}|${e.value}`).join('')
  chk('… ni en ninguna otra parte del DOM', !/4821|7390/.test(restoDelDom))
  G.cerrarHojaPines()
  const todoElDom = [...G.__els.values()].map(e => `${e.innerHTML}|${e.textContent}|${e.value}`).join('')
  chk('al cerrar, los PINes se borran de la memoria y del DOM',
    G.estado.config.hoja === null && hoja.hidden === true && !/4821|7390/.test(todoElDom))
  // Nadie sin PIN: se dice, no se abre una hoja vacía.
  G.__setRpc(async (n) => n === 'generar_pines_iniciales' ? { data: [], error: null } : { data: PERSONAL.map(p => ({ ...p })), error: null })
  await G.generarPines()
  chk('si no había nadie sin PIN, se dice y no se abre la hoja',
    G.__doc.getElementById('pr-cfg-hoja').hidden === true && G.estado.config.error.texto === 'Ya todos tienen PIN: no hizo falta generar ninguno.' &&
    G.estado.config.error.donde === 'pr-cfg-generar-pines' && cuerpo(G).includes('Ya todos tienen PIN'))

  // Asignar / resetear el PIN de una persona.
  const A = await personal(armar())
  let ha = cuerpo(A)
  chk('sin PIN dice "Asignar PIN" y con PIN dice "Resetear PIN"', /data-pin-asignar="e4">Asignar PIN/.test(ha) && /data-pin-asignar="e1">Resetear PIN/.test(ha))
  A.abrirPanelPin(PERSONAL[1])
  ha = cuerpo(A)
  chk('el panel del PIN nombra a la persona y pide 4 números', /PIN para Otra Unidad/.test(ha) && /id="pr-cfg-pin-valor"[^>]*maxlength="4"/.test(ha))
  chk('el PIN va como texto: es un identificador, no una cantidad', /id="pr-cfg-pin-valor"[^>]*inputmode="numeric"/.test(ha) && !/id="pr-cfg-pin-valor"[^>]*data-numero/.test(ha) && /id="pr-cfg-pin-valor" inputmode/.test(ha.replace(/ class="pr-input"/, '')))
  A.__doc.getElementById('pr-cfg-pin-valor').value = '12'
  await A.confirmarPinConfig()
  chk('un PIN corto no se manda', rpcs(A, 'asignar_pin_produccion').length === 0 && A.estado.config.error.texto === 'El PIN tiene que ser de 4 números.')
  chk('… y ese error va pegado al botón de guardar el PIN', A.estado.config.error.donde === 'pr-cfg-pin-guardar' && /pr-cfg-error[\s\S]{0,300}id="pr-cfg-pin-guardar"/.test(cuerpo(A)))
  A.__doc.getElementById('pr-cfg-pin-valor').value = '4821'
  await A.confirmarPinConfig()
  chk('asignar el PIN: la persona y el PIN', JSON.stringify(rpcs(A, 'asignar_pin_produccion')[0]) === '{"p_empleado_id":"e2","p_pin":"4821"}')
  chk('… y el panel se cierra', A.estado.config.pinPara === null && !/id="pr-cfg-pin-valor"/.test(cuerpo(A)))
  const enStorageA = [...A.__ls.values(), ...A.__ss.values(), ...A.__els.values()].map(e => typeof e === 'string' ? e : `${e.innerHTML}|${e.textContent}|${e.value}`).join('')
  chk('el PIN asignado tampoco queda guardado en ningún lado', !/4821/.test(enStorageA))
  // El PIN maestro.
  chk('hay "Mi PIN maestro" para quien configura', /id="pr-cfg-abrir-maestro"/.test(cuerpo(A)))
  A.abrirPanelPin(null, true)
  chk('el panel maestro pide 8 números', /Mi PIN maestro/.test(cuerpo(A)) && /id="pr-cfg-pin-valor"[^>]*maxlength="8"/.test(cuerpo(A)))
  A.__doc.getElementById('pr-cfg-pin-valor').value = '48213906'
  await A.confirmarPinConfig()
  chk('asignar_mi_pin_maestro con el PIN, sin empleado', JSON.stringify(rpcs(A, 'asignar_mi_pin_maestro')[0]) === '{"p_pin":"48213906"}')
  A.abrirPanelPin(PERSONAL[1])
  A.cerrarPanelPin()
  chk('Cancelar cierra el panel sin mandar nada', A.estado.config.pinPara === null && rpcs(A, 'asignar_pin_produccion').length === 1)

  // ── Accesos temporales ────────────────────────────────────────────────
  const X2 = await personal(armar())
  let hx = cuerpo(X2)
  chk('los temporales VIGENTES, con quién los dio y hasta cuándo', /Prestado<\/strong> · masero/.test(hx) && /Lo dio Federico Silva · hasta/.test(hx))
  chk('… y uno vencido no aparece', !/Mariela Soto<\/strong> · encargado/.test(hx))
  chk('temporalVigente mira la fecha, no la sola falta de revocación',
    X2.temporalVigente({ hasta: EN_UN_ANIO }) === true && X2.temporalVigente({ hasta: AYER }) === false && X2.temporalVigente({ hasta: null }) === false)
  chk('cada uno se puede revocar', /data-temporal-revocar="t1">Revocar/.test(hx))
  await X2.revocarTemporal('t1')
  chk('revocar_puesto_temporal con su id', JSON.stringify(rpcs(X2, 'revocar_puesto_temporal')[0]) === '{"p_id":"t1"}')
  X2.abrirPanelTemporal()
  hx = cuerpo(X2)
  chk('"Dar acceso temporal" pide quién, qué puesto y hasta cuándo', /id="pr-cfg-temporal-persona"/.test(hx) && /id="pr-cfg-temporal-puesto"/.test(hx) && /id="pr-cfg-temporal-hasta"/.test(hx))
  await X2.confirmarTemporal()
  chk('sin elegir nada no se manda', rpcs(X2, 'otorgar_puesto_temporal').length === 0 && /elegí a quién/.test(X2.estado.config.error.texto) && X2.estado.config.error.donde === 'pr-cfg-temporal-dar')
  X2.estado.config.temporal.personaId = 'e2'
  X2.estado.config.temporal.puesto = 'operario'
  X2.__setRpc(async (n) => n === 'otorgar_puesto_temporal' ? { data: { ok: true, hasta: EN_UN_ANIO, pin_temporal: '5566' }, error: null } : { data: PERSONAL.map(p => ({ ...p })), error: null })
  await X2.confirmarTemporal()
  const ot = rpcs(X2, 'otorgar_puesto_temporal')[0]
  chk('otorgar_puesto_temporal con la unidad que se configura, y p_hasta null para hoy',
    JSON.stringify(ot) === '{"p_empleado_id":"e2","p_unidad_negocio_id":"u-cn","p_puesto":"operario","p_hasta":null}', JSON.stringify(ot))
  chk('el PIN temporal se muestra UNA vez, en la hoja', X2.__doc.getElementById('pr-cfg-hoja').hidden === false &&
    /pr-tira__pin">5566/.test(X2.__doc.getElementById('pr-cfg-hoja-tiras').innerHTML))
  X2.cerrarHojaPines()
  X2.abrirPanelTemporal()
  X2.estado.config.temporal.personaId = 'e1'
  X2.estado.config.temporal.puesto = 'masero'
  X2.__setRpc(async (n) => n === 'otorgar_puesto_temporal' ? { data: { ok: true, hasta: EN_UN_ANIO, pin_temporal: null }, error: null } : { data: PERSONAL.map(p => ({ ...p })), error: null })
  await X2.confirmarTemporal()
  chk('con pin_temporal en null (ya tenía el suyo) no se muestra ningún número', X2.__doc.getElementById('pr-cfg-hoja').hidden === true)

  // ── HTML malicioso ────────────────────────────────────────────────────
  const X = armar()
  X.estado.config = { unidadId: 'u-cn', tab: 'maquinas', busqueda: marca('busqueda'), recetaMaquina: marca('maqId'), recetaTipo: marca('tipo'), cambios: new Map(), error: null }
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
  X.estado.config.datos = { marcas: [{ id: marca('marcaId'), nombre: marca('marcaNombre'), activa: true, estado_alta: 'aprobada' },
    { id: marca('pendId'), nombre: marca('pendNombre'), activa: false, estado_alta: 'pendiente_revision', creada_por: 'e', creada_en: null }],
    nombres: new Map([['e', marca('quien')]]) }
  X.estado.config.busqueda = ''
  chequearMarcas(chk, 'marcas', X.htmlConfigMarcas(X.estado.config), ['marcaId', 'marcaNombre', 'pendId', 'pendNombre', 'quien'])
  X.estado.config.busqueda = marca('busqueda')
  chequearMarcas(chk, 'buscador de marcas', X.htmlConfigMarcas(X.estado.config), ['busqueda'])
  X.estado.config.datos = { personal: [{ id: marca('persId'), nombre: marca('persNombre'), misma_unidad: true, puestos: [], tiene_pin: true }],
    temporales: [{ id: marca('tempId'), empleado_id: marca('persId'), puesto: marca('tempPuesto'), hasta: null, otorgado_por: 'e' }],
    nombres: new Map([['e', marca('dio')]]) }
  X.estado.config.busqueda = ''
  chequearMarcas(chk, 'personal', X.htmlConfigPersonal(X.estado.config), ['persId', 'persNombre', 'tempId', 'tempPuesto', 'dio'])
  X.estado.config.busqueda = marca('buscaPersona')
  chequearMarcas(chk, 'buscador de personal', X.htmlConfigPersonal(X.estado.config), ['buscaPersona'])
  X.estado.config.busqueda = ''
  X.estado.config.pinPara = { id: marca('persId'), nombre: marca('persNombre'), maestro: false }
  chequearMarcas(chk, 'panel del PIN', X.htmlConfigPersonal(X.estado.config), ['persNombre'])
  X.estado.config.pinPara = null
  X.estado.config.temporal = { personaId: marca('persId'), puesto: null, hasta: marca('hasta') }
  chequearMarcas(chk, 'panel del acceso temporal', X.htmlConfigPersonal(X.estado.config), ['persId', 'persNombre', 'hasta'])
  X.estado.config.temporal = null
  X.estado.config.error = { texto: marca('error'), donde: 'pr-cfg-personal-guardar' }
  chequearMarcas(chk, 'error pegado', X.htmlConfigPersonal(X.estado.config), ['error'])
  chequearMarcas(chk, 'tira de PIN', X.htmlTiraPin({ nombre: marca('tiraNombre'), pin: marca('tiraPin') }), ['tiraNombre', 'tiraPin'])
  X.estado.unidades = new Map([[marca('unidadId'), marca('unidadNombre')]])
  X.pintarSelectorUnidad('pr-config-unidad', [marca('unidadId')], null)
  chequearMarcas(chk, 'selector de unidad', X.__doc.getElementById('pr-config-unidad').innerHTML, ['unidadId', 'unidadNombre'])
})())

fin()
