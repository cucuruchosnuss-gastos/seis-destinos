// Producción · que nada de la configuración frene la carga (24/09/2026), y la
// burbuja de conos por revisar en los accesos a Configuración.
//
// Contrato con la base (pg_get_functiondef, 24/09/2026, solo lectura):
//  - registrar_produccion_item con p_caja_insumo_id y p_embolsado en null:
//    guarda caja null y embolsado 'ninguno' (o 'doble' si el cono va con doble
//    bolsa), suma el stock terminado igual y llama a _descontar_empaque, que
//    sin caja no descuenta la caja y con 'ninguno' no descuenta las bolsas
//    (los renglones 'siempre' de presentacion_empaque, sí).
//  - Desde el empaque, registrar_produccion_item y cerrar_turno guardan
//    SIEMPRE el embolsado; los 4 renglones anteriores tienen los dos en null.
//  - corregir_produccion_item cambia solo las cajas, no la caja.
//  - mis_pendientes() → (modulo, clave, cantidad, texto); con
//    tiene_tarea('produccion','configurar') trae ('produccion',
//    'conos_por_revisar', N, 'Conos nuevos por revisar').
//
//   node pruebas/test-produccion-sin-empaque.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const CATALOGO = {
  productos_terminados: [{ id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 }],
  producto_presentaciones: [
    { id: 'pr-caja', producto_id: 'p-mini', nombre: 'Caja', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 600, orden: 1 },
  ],
  marcas_personalizadas: [{ id: 'mk-grido', nombre: 'GRIDO', estado_alta: 'aprobada', doble_bolsa: false }],
  presentacion_cajas: [{ presentacion_id: 'pr-caja', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' }],
  presentacion_empaque: [{ presentacion_id: 'pr-caja', insumo_id: 'i-tiras', cantidad: 1, condicion: 'siempre' }],
  insumos: [{ id: 'i-nuss', nombre: 'Caja N°1', marca: 'Nuss' }, { id: 'i-tiras', nombre: 'Tiras x4', marca: null }],
  unidades_negocio: [{ id: 'u-cn', caja_predeterminada_id: 'i-nuss' }],
}
const TURNO = { id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-24', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-24T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null }
const falla = () => ({ data: null, error: { message: 'sin red' } })

function armar({ tablas = {} } = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    ...CATALOGO,
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')
      ? { data: [], error: null } : { data: [TURNO], error: null },
    turno_operarios: [], masas: [], paradas_produccion: [], produccion_items: [],
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
    ...tablas,
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  S.estado.stockVer = { unidades: ['u-cn'] }
  return S
}
const html = (S, id) => S.__doc.getElementById(id).innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const AVISO = 'No se pudo leer la configuración del empaque: este renglón se carga sin caja'

async function hastaCajas(S) {
  await S.abrirPlanilla('t1')
  await S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  S.elegirConoSiNo(true)
  S.elegirPresentacionAgregar('pr-caja')
  S.elegirCono('mk-grido')
}

// ── Cada lectura del empaque que falla deja cargar igual ────────────────
for (const tabla of ['presentacion_cajas', 'presentacion_empaque', 'unidades_negocio', 'insumos']) {
  esperas.push((async () => {
    const S = armar({ tablas: { [tabla]: falla } })
    await S.abrirPlanilla('t1')
    chk(`si falla ${tabla}: el catálogo NO se cae`, S.estado.catalogo !== null && S.estado.catalogo.productos.length === 1)
    chk(`… queda marcado como ilegible, sin cajas a medias`,
      S.estado.catalogo.empaqueError === true && S.estado.catalogo.cajas.length === 0 && S.estado.catalogo.empaque.length === 0)
    chk(`… y "Agregar producto" se puede tocar`, S.__doc.getElementById('pr-btn-agregar-producto').disabled === false)
  })())
}

esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  chk('con el empaque legible, no hay marca de error', S.estado.catalogo.empaqueError === false)
  // Los productos siguen siendo imprescindibles: sin ellos no hay qué cargar.
  const P = armar({ tablas: { productos_terminados: falla } })
  await P.abrirPlanilla('t1')
  chk('si fallan los productos, el catálogo sí se cae (no hay qué elegir)', P.estado.catalogo === null)
})())

// ── El flujo: el paso de la caja se saltea con el aviso ─────────────────
esperas.push((async () => {
  const S = armar({ tablas: { presentacion_cajas: falla } })
  await hastaCajas(S)
  const a = S.estado.agregar
  chk('la caja no traba: queda "elegida" sin caja', a.cajaElegida === true && a.cajaId === null)
  chk('… y va derecho a las cajas', a.paso === 'cajas')
  const paso = S.pasosAgregar(a, S.estado.catalogo).find(x => x.clave === 'caja')
  chk('el paso de la caja figura hecho y dice por qué', paso.estado === 'hecho' && paso.valor === 'Sin caja · no se pudo leer el empaque', JSON.stringify(paso))
  const emp = html(S, 'pr-agregar-empaque')
  chk('al lado de las cajas, el aviso en bordó', emp.includes(`pr-aviso--grave">${AVISO}`), emp)
  chk('… que dice que no se descuenta la caja ni las bolsas y cómo se corrige',
    emp.includes('no se va a descontar la caja ni las bolsas') && emp.includes('Corregilo después'))
  chk('… y la chapa de la caja dice por qué no hay caja', emp.includes('<span>Sin caja · no se pudo leer el empaque</span>'), emp)
  chk('… sin consumo inventado', !/Por caja:|No descuenta empaque|cajas? =/.test(emp), emp)
  chk('… ni aviso de stock (no hay nada que medir)', !/Faltan?|No se pudo leer el stock|No se puede ver el stock/.test(emp))
  S.irAPasoAgregar('caja')
  const panel = html(S, 'pr-agregar-panel')
  chk('en el paso de la caja: el mismo aviso', panel.includes(`pr-aviso--grave">${AVISO}`), panel)
  chk('… sin cajas para elegir ni embolsado', !/data-ag-caja=|data-ag-embolsado=/.test(panel))
  chk('… con salida a las cajas', /data-ag-seguir="1"/.test(panel))
  chk('… y no pide "Elegí una caja"', !/Elegí una caja/.test(panel))
  S.seguirConCajas()
  chk('"Seguir con las cajas" avanza', S.estado.agregar.paso === 'cajas')
})())

// ── Lo que viaja: sin caja ni embolsado, y el producto entra igual ──────
esperas.push((async () => {
  const S = armar({ tablas: { presentacion_empaque: falla } })
  await hastaCajas(S)
  S.estado.agregar.cajas = 5
  S.__setRpc(async () => ({ data: { sublote: '7023-1', embolsado: 'ninguno' }, error: null }))
  await S.confirmarAgregar()
  const ll = rpcs(S, 'registrar_produccion_item')
  const p = ll[0]?.[1]
  chk('registrar_produccion_item se llama (lo producido entra al stock terminado)', ll.length === 1, JSON.stringify(S.__llamadas.errores))
  chk('… sin caja', p && p.p_caja_insumo_id === null, JSON.stringify(p))
  chk('… y con el embolsado en null (lo decide la base)', p && p.p_embolsado === null, JSON.stringify(p))
  chk('… con el turno, la presentación, el cono y las cajas',
    p && p.p_turno_id === 't1' && p.p_presentacion_id === 'pr-caja' && p.p_marca_id === 'mk-grido' && p.p_cajas === 5)
  chk('… y se cargó sin error', S.__doc.getElementById('pr-agregar-error').hidden === true && S.__llamadas.exitos.some(m => /7023-1/.test(m)))

  // Con el empaque legible, la caja sigue viajando (no se rompió lo de antes).
  const B = armar()
  await hastaCajas(B)
  B.estado.agregar.cajas = 2
  await B.confirmarAgregar()
  const q = rpcs(B, 'registrar_produccion_item')[0]?.[1]
  chk('con el empaque legible, viajan la caja y el embolsado', q && q.p_caja_insumo_id === 'i-nuss' && q.p_embolsado === 'grande', JSON.stringify(q))
})())

// ── El aviso de stock sigue sin bloquear ────────────────────────────────
esperas.push((async () => {
  const S = armar({ tablas: { v_stock_insumos: [] } })
  await hastaCajas(S)
  S.estado.agregar.cajas = 3
  S.estado.agregar.stock = { estado: 'ok', saldos: new Map() }
  S.pintarAgregar()
  chk('con faltantes se avisa', /Faltan 3 Caja N°1 Nuss/.test(html(S, 'pr-agregar-empaque')))
  await S.confirmarAgregar()
  chk('… y se carga igual', rpcs(S, 'registrar_produccion_item').length === 1)
})())

// ── La marca del renglón, en la planilla ────────────────────────────────
const base = { id: 'it-1', orden: 1, sublote: '7023-1', presentacion_id: 'pr-caja', marca_id: null, cajas: 5, unidades_por_caja: 600, unidades: 3000, anulado: false }
esperas.push((async () => {
  const S = armar()
  const casos = [
    ['sin caja, sin bolsa', { ...base, caja_insumo_id: null, embolsado: 'ninguno' }, true],
    ['sin caja, doble bolsa', { ...base, caja_insumo_id: null, embolsado: 'doble' }, true],
    ['anterior al empaque (los dos en null)', { ...base, caja_insumo_id: null, embolsado: null }, false],
    ['con caja', { ...base, caja_insumo_id: 'i-nuss', embolsado: 'grande' }, false],
    ['anulado sin caja', { ...base, caja_insumo_id: null, embolsado: 'ninguno', anulado: true }, false],
  ]
  for (const [n, it, esperado] of casos) chk(`criterio: ${n} → ${esperado ? 'se marca' : 'no se marca'}`, S.sinCajaDescontada(it) === esperado)
  chk('sin bolsa: dice que no se descontaron la caja ni las bolsas',
    S.textoSinCaja(casos[0][1]) === 'Sin empaque descontado: no se descontó la caja ni las bolsas')
  chk('doble bolsa: dice solo la caja (las bolsas sí se descontaron)',
    S.textoSinCaja(casos[1][1]) === 'Sin empaque descontado: no se descontó la caja')

  const P = armar({ tablas: { produccion_items: [
    { ...base, caja_insumo_id: null, embolsado: 'ninguno' },
    { ...base, id: 'it-2', orden: 2, sublote: '7023-2', caja_insumo_id: null, embolsado: null },
    { ...base, id: 'it-3', orden: 3, sublote: '7023-3', caja_insumo_id: 'i-nuss', embolsado: 'grande' },
  ] } })
  await P.abrirPlanilla('t1')
  const h = html(P, 'pr-planilla-producido')
  const fila = sub => { const i = h.indexOf(`>${sub}</span>`); const d = h.lastIndexOf('<div class="pr-producido', i); return h.slice(d, h.indexOf('<div class="pr-producido__botones', i)) }
  chk('en la planilla: el renglón sin caja va en bordó', /pr-producido pr-producido--sin-caja/.test(fila('7023-1')), fila('7023-1'))
  chk('… y lo dice', fila('7023-1').includes('pr-sin-caja">Sin empaque descontado: no se descontó la caja ni las bolsas'))
  chk('… el anterior al empaque, no', !/sin-caja/.test(fila('7023-2')), fila('7023-2'))
  chk('… el que tiene caja, no', !/sin-caja/.test(fila('7023-3')))
  chk('… y los tres siguen sumando al total', /15 cajas/.test(html(P, 'pr-planilla-total')))
  // Un renglón de un producto que ya no está en el catálogo también se marca.
  const sinCat = P.htmlProducido({ ...base, presentacion_id: 'pr-vieja', caja_insumo_id: null, embolsado: 'ninguno' }, P.estado.catalogo)
  chk('… también si el producto ya no está en el catálogo', /pr-producido--sin-caja/.test(sinCat) && /Sin empaque descontado/.test(sinCat))
  const sinCatalogo = P.htmlProducido({ ...base, caja_insumo_id: null, embolsado: 'ninguno' }, null)
  chk('… y si el catálogo no se pudo leer', /Sin empaque descontado/.test(sinCatalogo))
})())

// ── La planilla no se cae si no se leen los nombres de las cajas ────────
esperas.push((async () => {
  const S = armar({ tablas: { insumos: falla, produccion_items: [{ ...base, caja_insumo_id: 'i-nuss', embolsado: 'grande' }] } })
  await S.abrirPlanilla('t1')
  chk('sin los nombres de las cajas, la planilla abre igual', S.estado.planilla !== null && S.estado.planilla.insumosCaja.length === 0)
  chk('… y el renglón dice "caja sin nombre"', /caja sin nombre · bolsa grande/.test(html(S, 'pr-planilla-producido')), html(S, 'pr-planilla-producido'))
  chk('… sin decir que no se pudo leer la planilla', !/No se pudo leer la planilla/.test(html(S, 'pr-planilla-estado')))
})())

// ── La marca en el historial ────────────────────────────────────────────
esperas.push((async () => {
  const S = armar({ tablas: {
    turnos_produccion: [{ ...TURNO, unidad_negocio_id: 'u-cn', cerrado_en: null, hora_inicio: null, hora_apagado: null, scrap_kg: null, observaciones: null, completado_por: null, completado_en: null }],
    produccion_items: [
      { ...base, caja_insumo_id: null, embolsado: 'ninguno' },
      { ...base, id: 'it-2', orden: 2, sublote: '7023-2', caja_insumo_id: null, embolsado: null },
      { ...base, id: 'it-3', orden: 3, sublote: '7023-3', caja_insumo_id: 'i-nuss', embolsado: 'grande' },
    ],
    stock_movimientos: [], produccion_correcciones: [], receta_items: [], ingredientes: [], masa_items: [], v_empleados_publico: [],
  } })
  const d = await S.leerDetalleTurno('t1')
  const h = S.htmlDetalleTurno(d)
  const li = sub => { const i = h.indexOf(`>${sub}</span>`); return h.slice(h.lastIndexOf('<li', i), h.indexOf('</li>', i)) }
  chk('en el historial: el renglón sin caja va en bordó', /pr-lista__item pr-of-sin-caja/.test(li('7023-1')), li('7023-1'))
  chk('… y lo dice', li('7023-1').includes('pr-sin-caja">· Sin empaque descontado: no se descontó la caja ni las bolsas'))
  chk('… el anterior al empaque, no', !/sin-caja|Sin empaque/.test(li('7023-2')), li('7023-2'))
  chk('… el que tiene caja, no', !/sin-caja|Sin empaque/.test(li('7023-3')))
})())

// ── La sala de masa no se frena si no se leen los ingredientes chocolate ─
esperas.push((async () => {
  const S = armar({ tablas: { ingredientes: falla } })
  S.estado.salaTurno = { id: 't1' }
  S.estado.tipoMasa = 'Común'
  S.__setRpc(async n => n === 'datos_para_masa' ? { data: { original: { receta_id: 'r1', items: [] }, anterior: null, insumos: [] }, error: null } : { data: null, error: null })
  let tiro = null
  try { await S.cargarDatosMasa() } catch (e) { tiro = e }
  chk('sin los ingredientes que definen el chocolate, los datos de la masa se cargan igual', tiro === null && S.estado.datosMasa?.original?.receta_id === 'r1', String(tiro))
  chk('… y el chip de chocolate simplemente no se sabe', S.estado.defineChocolate === null)
  const B = armar({ tablas: { ingredientes: [{ id: 'ing-cacao', define_chocolate: true }] } })
  B.estado.salaTurno = { id: 't1' }
  B.__setRpc(async () => ({ data: { original: {}, insumos: [] }, error: null }))
  await B.cargarDatosMasa()
  chk('con la lectura bien, se sabe cuáles definen el chocolate', B.estado.defineChocolate?.has('ing-cacao') === true)
})())

// ── La burbuja de conos por revisar ─────────────────────────────────────
function armarBurbuja({ tareas = [['configurar', { unidades: ['u-cn'] }]], rpc } = {}) {
  const S = armar({ tablas: { marcas_personalizadas: [] } })
  S.estado.misTareas = new Map(tareas)
  if (rpc) S.__setRpc(rpc)
  return S
}
const pendientes = n => async nombre => nombre === 'mis_pendientes'
  ? { data: [{ modulo: 'cobranzas', clave: 'por_controlar', cantidad: 9, texto: 'Otra cosa' },
      { modulo: 'produccion', clave: 'conos_por_revisar', cantidad: n, texto: 'Conos nuevos por revisar' }], error: null }
  : { data: null, error: null }
const BOTONES = ['pr-btn-ir-config', 'pr-menu-config']

esperas.push((async () => {
  const S = armarBurbuja({ rpc: pendientes(3) })
  await S.cargarBurbujaConos()
  chk('se pide a mis_pendientes, sin parámetros', rpcs(S, 'mis_pendientes').length === 1 && rpcs(S, 'mis_pendientes')[0][1] === undefined)
  for (const id of BOTONES) {
    const b = S.__doc.getElementById(id)
    chk(`${id}: la burbuja con el número de la base`, /^Configuración<span class="pr-burbuja"[^>]*>3<\/span>$/.test(b.innerHTML), b.innerHTML)
    chk(`${id}: dice qué es en title y aria-label`,
      b.innerHTML.includes('title="3 conos nuevos por revisar"') && b.innerHTML.includes('aria-label="3 conos nuevos por revisar"'))
    chk(`${id}: el botón entero también lo dice`, b.getAttribute('aria-label') === 'Configuración: 3 conos nuevos por revisar')
  }
  chk('toma la fila de producción, no la de otro módulo', !/>9</.test(S.__doc.getElementById('pr-btn-ir-config').innerHTML))

  // Con pendientes, tocar el acceso abre derecho en Marcas / Conos.
  await S.abrirConfigDesdeAcceso()
  chk('con pendientes, Configuración abre en "Marcas / Conos"', S.estado.config?.tab === 'marcas', S.estado.config?.tab)
  const M = armarBurbuja({ rpc: pendientes(2) })
  await M.cargarBurbujaConos()
  await M.accionDelMenu('config')
  chk('… también desde el Menú', M.estado.config?.tab === 'marcas')
  chk('el acceso de la pantalla de inicio usa ese camino', /getElementById\('pr-btn-ir-config'\)\.addEventListener\('click', abrirConfigDesdeAcceso\)/.test(FUENTE))

  const U = armarBurbuja({ rpc: pendientes(1) })
  await U.cargarBurbujaConos()
  chk('uno solo, en singular', U.__doc.getElementById('pr-btn-ir-config').innerHTML.includes('title="1 cono nuevo por revisar"'))
  const G = armarBurbuja({ rpc: pendientes(150) })
  await G.cargarBurbujaConos()
  chk('más de 99: "99+"', />99\+<\/span>/.test(G.__doc.getElementById('pr-menu-config').innerHTML))
  chk('… y el title dice el número de verdad', G.__doc.getElementById('pr-menu-config').innerHTML.includes('title="150 conos nuevos por revisar"'))
})())

esperas.push((async () => {
  for (const [n, rpc] of [
    ['cero', pendientes(0)], ['null', pendientes(null)], ['vacío', pendientes('')],
    ['sin la fila', async () => ({ data: [], error: null })],
    ['error de la base', async () => ({ data: null, error: { message: 'x' } })],
    ['error de la base aunque vengan filas', async () => ({ data: (await pendientes(3)('mis_pendientes')).data, error: { message: 'x' } })],
    ['la llamada tira', async () => { throw new Error('sin red') }],
  ]) {
    const S = armarBurbuja({ rpc })
    await S.cargarBurbujaConos()
    chk(`${n}: sin burbuja`, BOTONES.every(id => S.__doc.getElementById(id).innerHTML === 'Configuración'),
      S.__doc.getElementById('pr-btn-ir-config').innerHTML)
    chk(`${n}: sin aria-label de pendientes`, S.__doc.getElementById('pr-btn-ir-config').getAttribute('aria-label') === null)
    chk(`${n}: la cifra queda en null, no en un cero`, S.estado.conosPendientes === null, String(S.estado.conosPendientes))
    await S.abrirConfigDesdeAcceso()
    chk(`${n}: Configuración abre donde estaba (Máquinas)`, S.estado.config?.tab === 'maquinas')
  }
  // Había 3 y la segunda llamada falla: no queda un número viejo.
  let r = pendientes(3)
  const V = armarBurbuja({ rpc: (...x) => r(...x) })
  await V.cargarBurbujaConos()
  r = async () => ({ data: null, error: { message: 'x' } })
  await V.cargarBurbujaConos()
  chk('si falla después de haber mostrado 3, se borra (nunca un número viejo)', V.__doc.getElementById('pr-btn-ir-config').innerHTML === 'Configuración')
  chk('… y el botón deja de decir que hay pendientes', BOTONES.every(id => V.__doc.getElementById(id).getAttribute('aria-label') === null))
  chk('… y ya no abre en Marcas', (await V.abrirConfigDesdeAcceso(), V.estado.config.tab === 'maquinas'))
})())

esperas.push((async () => {
  // Sin produccion:configurar no se pregunta ni se dibuja.
  const S = armarBurbuja({ tareas: [['cargar', { unidades: ['u-cn'] }]], rpc: pendientes(3) })
  await S.cargarBurbujaConos()
  chk('sin configurar: no se llama a mis_pendientes', rpcs(S, 'mis_pendientes').length === 0)
  chk('… ni hay burbuja', BOTONES.every(id => !/pr-burbuja/.test(S.__doc.getElementById(id).innerHTML)))

  // Una respuesta vieja no pisa la nueva.
  let soltar
  const vieja = new Promise(res => { soltar = res })
  let llamada = 0
  const T = armarBurbuja({ rpc: async () => (++llamada === 1 ? vieja : pendientes(5)('mis_pendientes')) })
  const p1 = T.cargarBurbujaConos()
  await T.cargarBurbujaConos()
  soltar({ data: [{ modulo: 'produccion', clave: 'conos_por_revisar', cantidad: 8 }], error: null })
  await p1
  chk('la respuesta que llega tarde no pisa la nueva', />5<\/span>/.test(T.__doc.getElementById('pr-btn-ir-config').innerHTML), T.__doc.getElementById('pr-btn-ir-config').innerHTML)

  // Cuándo se pide.
  chk('se pide al entrar', /pintarAccesosOficina\(\)\n\s+cargarBurbujaConos\(\)/.test(FUENTE))
  chk('… y al volver a la pestaña', /visibilityState === 'visible'\) \{[\s\S]{0,120}cargarBurbujaConos\(\)/.test(FUENTE))
  chk('… y después de aceptar o rechazar un cono', /if \(r\.ok\) \{ cargarBurbujaConos\(\); await cargarPestanaConfig\(\) \}/.test(FUENTE))
})())

// ── Texto de la base en los renders nuevos ──────────────────────────────
esperas.push((async () => {
  const S = armar()
  const it = { ...base, sublote: marca('sublote'), caja_insumo_id: null, embolsado: 'ninguno' }
  chequearMarcas(chk, 'renglón sin caja en la planilla', S.htmlProducido(it, null), ['sublote'])
  const d = { presentaciones: [{ id: 'pr-caja', producto_id: 'p-mini', nombre: marca('pres') }], productos: [{ id: 'p-mini', nombre: marca('prod') }],
    marcas: [], insumosEmpaque: [], correcciones: [], nombres: new Map() }
  chequearMarcas(chk, 'renglón sin caja en el historial', S.htmlSubloteHistorial(it, d), ['sublote', 'pres', 'prod'])
  const cat = { empaqueError: true, cajas: [], empaque: [], insumos: [], marcas: [], presentaciones: [], productos: [] }
  const a = { presentacionId: marca('pres'), cajaId: null, cajaElegida: true, embolsado: 'ninguno', marcaId: null }
  chequearMarcas(chk, 'paso de la caja sin empaque', S.htmlPasoCaja(a, cat), [])
  chequearMarcas(chk, 'al lado de las cajas sin empaque', S.htmlEmpaqueAgregar(a, cat), [])
})())

fin()
