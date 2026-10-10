// CORREGIR TODO UN SUBLOTE (08/10/2026): producto y presentación, cono, caja,
// embolsado y cajas, con corregir_produccion_item_completo(p_item_id, p_datos,
// p_motivo) — en la planta (los pasos de la carga) y en la gestión (el
// formulario de la oficina en el renglón del historial).
//
// Lo que la base exige (pg_get_functiondef, 08/10/2026): motivo de 3 letras o
// más; deja como estaba toda clave que NO viene en p_datos; marca_id null =
// sin marca (Común) y caja_insumo_id null = sin caja; NO fuerza la doble
// bolsa del cono (lo hace la pantalla). Por eso se manda SOLO lo que cambió.
//
// Se EJECUTA el código real de los dos archivos (sandbox-produccion.js) con un
// Supabase falso. Nada de regex sobre el call site salvo donde se dice.
//
//   node pruebas/test-produccion-corregir-completo.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const PLANTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const ARCH_GESTION = process.env.ARCHIVO_GESTION || GESTION
const { chk, esperas, fin } = arnes()
// Informa qué leyó (el runner de mutaciones lo compara con lo que escribió).
leer(PLANTA)
const FUENTE_G = leer(ARCH_GESTION)

const llamadas = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n).map(([, p]) => p)
const RPC = 'corregir_produccion_item_completo'

// ── El catálogo de la fábrica: activos, un rechazado, uno inactivo, uno
// pendiente de revisar y uno de doble bolsa ─────────────────────────────
const MARCAS = [
  { id: 'mk-fabri', nombre: 'FABRI', estado_alta: 'aprobada', activa: true, doble_bolsa: false },
  { id: 'mk-cas', nombre: 'CASERATO', estado_alta: 'aprobada', activa: true, doble_bolsa: false },
  { id: 'mk-norte', nombre: 'NORTEÑO', estado_alta: 'aprobada', activa: true, doble_bolsa: true },
  { id: 'mk-nuevo', nombre: 'NUEVITO', estado_alta: 'pendiente_revision', activa: true, doble_bolsa: false },
  { id: 'mk-rech', nombre: 'RECHAZADO', estado_alta: 'rechazada', activa: false, doble_bolsa: false },
  { id: 'mk-baja', nombre: 'DADODEBAJA', estado_alta: 'aprobada', activa: false, doble_bolsa: false },
]
const CAT = {
  productos: [
    { id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 },
    { id: 'p-choco', nombre: 'Cucuruchón Mini Chocolate', tipo_masa: 'Chocolate', orden: 2 },
  ],
  presentaciones: [
    { id: 'pr-con', producto_id: 'p-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 320, orden: 1 },
    { id: 'pr-sin', producto_id: 'p-mini', nombre: 'Caja sin cono', con_cono: false, media_caja: false, unidades_por_caja: 320, orden: 2 },
    { id: 'pr-choco', producto_id: 'p-choco', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 320, orden: 1 },
  ],
  marcas: MARCAS,
  cajas: [
    { presentacion_id: 'pr-con', insumo_id: 'c-nuss', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-con', insumo_id: 'c-dp', embolsado_sugerido: 'individual' },
    { presentacion_id: 'pr-sin', insumo_id: 'c-sinimp', embolsado_sugerido: 'grande' },
  ],
  empaque: [],
  insumos: [{ id: 'c-nuss', nombre: 'Caja N°1', marca: 'Nuss' }, { id: 'c-dp', nombre: 'Caja N°1', marca: 'Dolce Pasta' },
    { id: 'c-sinimp', nombre: 'Caja N°1', marca: 'Sin impresión' }, { id: 'c-otra', nombre: 'Caja capelina', marca: null }],
  cajaPredeterminadaId: 'c-nuss', empaqueError: false,
}
const ITEM = { id: 'it-1', orden: 1, sublote: '7037-1', presentacion_id: 'pr-con', marca_id: 'mk-fabri', cajas: 25, unidades_por_caja: 320,
  unidades: 8000, anulado: false, caja_insumo_id: 'c-nuss', embolsado: 'grande' }

// ═════════════════════════════════════════════════════════════════════
// LA PLANTA
// ═════════════════════════════════════════════════════════════════════
function planta(item = ITEM) {
  const S = construirProduccion(PLANTA)
  S.estado.unidadId = 'u-cn'
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.catalogo = JSON.parse(JSON.stringify(CAT))
  S.estado.planilla = { turno: { id: 't37', lote: 7037, estado: 'abierto', turno: 'Mañana' }, operarios: [], masas: [], paradas: [],
    items: [{ ...item }], insumosCaja: CAT.insumos, marcasItems: [], maquinaNombre: 'Máquina 1' }
  S.__tablas.produccion_items = [{ ...item }]
  S.__tablas.turnos_produccion = () => ({ data: [S.estado.planilla.turno], error: null })
  S.__setRpc(async () => ({ data: null, error: null }))
  return S
}
const motivoPlanta = (S, t) => { S.__doc.getElementById('pr-agregar-motivo').value = t }
const errPlanta = S => S.__doc.getElementById('pr-agregar-error')

esperas.push((async () => {
  // Solo las cajas → {cajas}.
  const A = planta()
  A.abrirCorregir('it-1', 'corregir')
  chk('planta: corregir abre los pasos con lo que ya tenía', A.estado.agregar?.corrige?.id === 'it-1' && A.estado.agregar.marcaId === 'mk-fabri')
  A.estado.agregar.cajas = 30
  motivoPlanta(A, 'Se contaron mal')
  await A.confirmarAgregar()
  chk('planta: cambiar solo las cajas manda {cajas}', JSON.stringify(llamadas(A, RPC)[0]) === '{"p_item_id":"it-1","p_datos":{"cajas":30},"p_motivo":"Se contaron mal"}', JSON.stringify(llamadas(A, RPC)))

  // Solo el cono → {marca_id}.
  const B = planta()
  B.abrirCorregir('it-1', 'corregir')
  B.elegirCono('mk-cas')
  motivoPlanta(B, 'Era Caserato')
  await B.confirmarAgregar()
  chk('planta: cambiar el cono manda {marca_id}', JSON.stringify(llamadas(B, RPC)[0]?.p_datos) === '{"marca_id":"mk-cas"}', JSON.stringify(llamadas(B, RPC)))

  // Un cono de doble bolsa lo fuerza a 'doble' (la RPC de corregir no lo hace).
  const D = planta()
  D.abrirCorregir('it-1', 'corregir')
  D.elegirCono('mk-norte')
  motivoPlanta(D, 'Va al norte')
  await D.confirmarAgregar()
  chk('planta: un cono de doble bolsa manda también el embolsado doble', JSON.stringify(llamadas(D, RPC)[0]?.p_datos) === '{"marca_id":"mk-norte","embolsado":"doble"}', JSON.stringify(llamadas(D, RPC)))

  // Otra presentación (sin cono): la presentación, el cono en null, y la caja
  // y el embolsado que trae la presentación nueva.
  const P = planta()
  P.abrirCorregir('it-1', 'corregir')
  P.elegirConoSiNo(false)
  P.elegirPresentacionAgregar('pr-sin')
  motivoPlanta(P, 'Era sin cono')
  await P.confirmarAgregar()
  chk('planta: cambiar la presentación manda presentación, cono en null y la caja nueva', JSON.stringify(llamadas(P, RPC)[0]?.p_datos) ===
    '{"presentacion_id":"pr-sin","marca_id":null,"caja_insumo_id":"c-sinimp"}', JSON.stringify(llamadas(P, RPC)))

  // Sin cambios no llama, y lo dice.
  const N = planta()
  N.abrirCorregir('it-1', 'corregir')
  motivoPlanta(N, 'Nada')
  await N.confirmarAgregar()
  chk('planta: sin cambios no llama a la base y lo dice', llamadas(N, RPC).length === 0 && /No cambiaste nada/.test(errPlanta(N).textContent) && errPlanta(N).hidden === false)

  // Sin motivo no llama, y lo dice.
  const M = planta()
  M.abrirCorregir('it-1', 'corregir')
  M.estado.agregar.cajas = 31
  motivoPlanta(M, ' ab ')
  await M.confirmarAgregar()
  chk('planta: sin motivo (menos de 3 letras) no llama y lo dice', llamadas(M, RPC).length === 0 && /tres letras/.test(errPlanta(M).textContent))

  // El error de la base, tal cual.
  const E = planta()
  E.__setRpc(async (n) => n === RPC ? { data: null, error: { message: 'Esa presentación lleva cono: elegí cuál.' } } : { data: null, error: null })
  E.abrirCorregir('it-1', 'corregir')
  E.estado.agregar.cajas = 26
  motivoPlanta(E, 'motivo')
  await E.confirmarAgregar()
  chk('planta: el error de la base va tal cual', errPlanta(E).textContent === 'Esa presentación lleva cono: elegí cuál.' && errPlanta(E).hidden === false)

  // Un doble toque manda una sola vez.
  const T = planta()
  const esperando = []
  T.__setRpc(async (n) => n === RPC ? new Promise(r => { esperando.push(() => r({ data: null, error: null })) }) : { data: null, error: null })
  T.abrirCorregir('it-1', 'corregir')
  // Por el campo, como la persona: el repintado del primer toque relee el campo.
  T.ponerNumero(T.__doc.getElementById('pr-agregar-cajas'), 40)
  T.estado.agregar.cajas = 40
  motivoPlanta(T, 'Doble toque')
  const t1 = T.confirmarAgregar(); const t2 = T.confirmarAgregar()
  await new Promise(r => setTimeout(r, 0))
  chk('planta: un doble toque manda una sola vez', llamadas(T, RPC).length === 1)
  for (const s of esperando) s()
  await Promise.all([t1, t2])

  // Un renglón viejo sin embolsado (null): cambiar las cajas NO le inventa 'ninguno'.
  const V = planta({ ...ITEM, caja_insumo_id: null, embolsado: null, presentacion_id: 'pr-con' })
  V.abrirCorregir('it-1', 'corregir')
  V.estado.agregar.cajas = 27
  motivoPlanta(V, 'Viejo')
  await V.confirmarAgregar()
  chk('planta: un renglón sin embolsado guardado no gana uno de regalo', JSON.stringify(llamadas(V, RPC)[0]?.p_datos) === '{"cajas":27}', JSON.stringify(llamadas(V, RPC)))

  // Una presentación sin cono nunca lleva cono, aunque haya quedado uno elegido.
  const X = planta()
  X.abrirCorregir('it-1', 'corregir')
  const dx = X.datosCorregirCompleto({ ...X.estado.agregar, presentacionId: 'pr-sin', marcaId: 'mk-cas', cajaId: 'c-nuss' })
  chk('planta: sin cono el cono va en null aunque haya quedado elegido', dx.marca_id === null && dx.presentacion_id === 'pr-sin', JSON.stringify(dx))

  // Los conos rechazados e inactivos no se ofrecen.
  const C = planta()
  C.abrirCorregir('it-1', 'corregir')
  const lista = C.htmlMarcas(C.estado.catalogo.marcas, '', C.estado.agregar, null)
  chk('planta: los conos rechazados e inactivos no se ofrecen', !/RECHAZADO|DADODEBAJA/.test(lista) && /CASERATO/.test(lista) && /NUEVITO/.test(lista), lista.slice(0, 300))

  // Sin catálogo: solo las cajas, por la MISMA RPC.
  const S = planta()
  S.estado.catalogo = null
  S.abrirCorregir('it-1', 'corregir')
  S.__doc.getElementById('pr-corregir-motivo').value = 'Sin catálogo'
  S.ponerNumero(S.__doc.getElementById('pr-corregir-cajas'), 22)
  await S.confirmarCorregir()
  chk('planta sin catálogo: solo las cajas, con la RPC completa', JSON.stringify(llamadas(S, RPC)[0]) === '{"p_item_id":"it-1","p_datos":{"cajas":22},"p_motivo":"Sin catálogo"}' &&
    llamadas(S, 'corregir_produccion_item').length === 0)
})())

// ═════════════════════════════════════════════════════════════════════
// LA GESTIÓN — el formulario de la oficina en el historial de un turno
// ═════════════════════════════════════════════════════════════════════
const DETALLE = {
  turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', unidad_negocio_id: 'u-cn', fecha: '2026-09-24', turno: 'Mañana', encargado_id: 'e1', estado: 'cerrado',
    abierto_en: '2026-09-24T09:02:00Z', cerrado_en: '2026-09-24T17:10:00Z', hora_inicio: '06:02:00', hora_apagado: '13:55:00', scrap_kg: 6, observaciones: null }],
  maquinas: [{ id: 'm1', nombre: 'Máquina 1' }],
  turno_operarios: [], masas: [], masa_items: [], receta_items: [], ingredientes: [], stock_movimientos: [], paradas_produccion: [],
  produccion_items: [
    { id: 'i1', orden: 1, sublote: '7023-1', presentacion_id: 'pr-con', marca_id: 'mk-fabri', cajas: 35, unidades_por_caja: 320, unidades: 11200, anulado: false, caja_insumo_id: 'c-nuss', embolsado: 'grande' },
    { id: 'i2', orden: 2, sublote: '7023-2', presentacion_id: 'pr-con', marca_id: 'mk-baja', cajas: 10, unidades_por_caja: 320, unidades: 3200, anulado: false, caja_insumo_id: 'c-nuss', embolsado: 'grande' },
  ],
  produccion_correcciones: [],
  // El doble de supabase NO filtra: devuelve la tabla entera. Los filtros de
  // la pantalla (la reventa, los conos ofrecibles) son los que se prueban.
  productos_terminados: [...CAT.productos, { id: 'p-reventa', nombre: 'Soft de Rosario', tipo_masa: 'Común', orden: 9, origen_producto_id: 'p-x' }],
  producto_presentaciones: CAT.presentaciones,
  marcas_personalizadas: MARCAS,
  presentacion_cajas: CAT.cajas,
  unidades_negocio: [{ id: 'u-cn', caja_predeterminada_id: 'c-nuss' }],
  insumos: CAT.insumos,
  v_empleados_publico: [{ id: 'e1', nombre: 'Agustín Barrera' }],
}

async function gestion(tareas = [['ver', { todas: true }], ['configurar', { todas: true }]], extra = {}) {
  const S = construirProduccion(ARCH_GESTION)
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.__setRpc(async () => ({ data: null, error: null }))
  Object.assign(S.__tablas, JSON.parse(JSON.stringify(DETALLE)), extra)
  await S.abrirDetalleHistorial('t1')
  return S
}
const cuerpo = S => S.__doc.getElementById('pr-historial-detalle-cuerpo').innerHTML
async function abrir(S, id = 'i1') {
  chk(`gestión: se abre la corrección de ${id}`, S.abrirCorreccionSublote(id, 'corregir') === true)
  await S.estado.corrigeHist.carga
  return S.estado.corrigeHist
}
const opcionesDe = (html, id) => (html.match(new RegExp(`<select class="pr-select" id="${id}"[^>]*>([\\s\\S]*?)</select>`)) || ['', ''])[1]

esperas.push((async () => {
  // Planilla CERRADA con configurar: se corrige igual (lo decide la base).
  const S = await gestion()
  chk('gestión: un turno cerrado con configurar ofrece Corregir', /data-sublote-corregir="i1"/.test(cuerpo(S)))
  const e = await abrir(S)
  let h = cuerpo(S)
  chk('gestión: el formulario de la oficina tiene producto, presentación, cono, caja, embolsado, cajas y motivo',
    ['pr-hist-corr-producto', 'pr-hist-corr-presentacion', 'pr-hist-corr-cono', 'pr-hist-corr-caja', 'pr-hist-corr-embolsado', 'pr-hist-corr-cajas', 'pr-hist-corr-motivo']
      .every(id => h.includes(`id="${id}"`)), h.slice(0, 400))
  chk('gestión: viene con lo que tenía elegido', e.productoId === 'p-mini' && e.presentacionId === 'pr-con' && e.marcaId === 'mk-fabri' && e.cajaId === 'c-nuss' && e.embolsado === 'grande')
  const productos = opcionesDe(h, 'pr-hist-corr-producto')
  chk('gestión: la reventa no se ofrece y el chocolate va aparte', !/Soft de Rosario/.test(productos) && /<optgroup label="Chocolate">.*Cucuruchón Mini Chocolate/.test(productos), productos)
  const conos = opcionesDe(h, 'pr-hist-corr-cono')
  chk('gestión: los conos rechazados e inactivos no se ofrecen', !/RECHAZADO|DADODEBAJA/.test(conos) && /CASERATO/.test(conos) && /NUEVITO · nuevo, a revisar/.test(conos), conos)
  chk('gestión: solo las cajas habilitadas para la presentación', /Caja N°1 Nuss/.test(opcionesDe(h, 'pr-hist-corr-caja')) && /Caja N°1 Dolce Pasta/.test(opcionesDe(h, 'pr-hist-corr-caja')) &&
    !/Sin impresión|capelina/.test(opcionesDe(h, 'pr-hist-corr-caja')))

  // Sin motivo no llama, y lo dice pegado al botón.
  S.estado.corrigeHist.cajas = 36
  await S.guardarCorreccionSublote()
  chk('gestión: sin motivo no llama y lo dice pegado al botón', llamadas(S, RPC).length === 0 &&
    /role="alert">Escribí el motivo para guardar\.<\/div><button type="button" class="pr-btn" id="pr-hist-corr-guardar">/.test(cuerpo(S)))
  // Sin cambios no llama.
  S.estado.corrigeHist.cajas = 35
  S.estado.corrigeHist.motivo = 'Revisando'
  await S.guardarCorreccionSublote()
  chk('gestión: sin cambios no llama y lo dice', llamadas(S, RPC).length === 0 && /No cambiaste nada/.test(cuerpo(S)))
  // Solo el cono → {marca_id}.
  S.cambiarCampoCorreccion('pr-hist-corr-cono', 'mk-cas')
  chk('gestión: cambiar el cono manda {marca_id}', JSON.stringify(S.datosCorreccionSublote(S.estado.corrigeHist, S.estado.detalleHistorial.producido[0])) === '{"marca_id":"mk-cas"}')
  S.estado.corrigeHist.cajas = 33
  await S.guardarCorreccionSublote()
  chk('gestión: cono y cajas, con la RPC completa y el motivo', JSON.stringify(llamadas(S, RPC)[0]) === '{"p_item_id":"i1","p_datos":{"cajas":33,"marca_id":"mk-cas"},"p_motivo":"Revisando"}' &&
    llamadas(S, 'corregir_produccion_item').length === 0, JSON.stringify(llamadas(S, RPC)))
  chk('gestión: guardado, se cierra y se vuelve a leer el turno', S.estado.corrigeHist === null && S.__llamadas.exitos.some(m => m === 'Sublote 7023-1 corregido.'))

  // Un cono de doble bolsa fuerza el embolsado, y el select queda trabado.
  const B = await gestion()
  await abrir(B)
  B.cambiarCampoCorreccion('pr-hist-corr-cono', 'mk-norte')
  h = cuerpo(B)
  chk('gestión: un cono de doble bolsa fuerza "Las dos" y lo dice', /id="pr-hist-corr-embolsado" disabled><option value="doble" selected>Las dos/.test(h) && /Este cono va con doble bolsa/.test(h))
  chk('gestión: … y manda el embolsado doble', JSON.stringify(B.datosCorreccionSublote(B.estado.corrigeHist, B.estado.detalleHistorial.producido[0])) === '{"marca_id":"mk-norte","embolsado":"doble"}')

  // Otra presentación (sin cono): el cono en null, la caja inicial y su embolsado.
  const P = await gestion()
  await abrir(P)
  P.cambiarCampoCorreccion('pr-hist-corr-presentacion', 'pr-sin')
  const ep = P.estado.corrigeHist
  chk('gestión: otra presentación trae su caja (la única habilitada) y su embolsado', ep.cajaId === 'c-sinimp' && ep.embolsado === 'grande' && ep.marcaId === null)
  chk('gestión: sin cono no se pregunta el cono', !/id="pr-hist-corr-cono"/.test(cuerpo(P)))
  chk('gestión: cambiar la presentación manda presentación, cono en null y la caja', JSON.stringify(P.datosCorreccionSublote(ep, P.estado.detalleHistorial.producido[0])) ===
    '{"presentacion_id":"pr-sin","marca_id":null,"caja_insumo_id":"c-sinimp"}')
  // Otro producto con una sola presentación la elige sola (y su caja predeterminada).
  P.cambiarCampoCorreccion('pr-hist-corr-producto', 'p-choco')
  chk('gestión: otro producto con una presentación la elige sola', ep.presentacionId === 'pr-choco' && ep.cajaId === null && ep.cajaElegida === true)
  // Cambiar la caja trae el embolsado que sugiere.
  P.cambiarCampoCorreccion('pr-hist-corr-producto', 'p-mini')
  chk('gestión: un producto con varias presentaciones pide elegir', ep.presentacionId === '' && /Elegí la presentación/.test(cuerpo(P)))
  ep.motivo = 'Otra cosa'
  await P.guardarCorreccionSublote()
  chk('gestión: sin presentación no llama', llamadas(P, RPC).length === 0 && /Elegí la presentación\.<\/div>/.test(cuerpo(P)))
  P.cambiarCampoCorreccion('pr-hist-corr-presentacion', 'pr-con')
  chk('gestión: la caja predeterminada de la unidad, si está habilitada', ep.cajaId === 'c-nuss' && ep.embolsado === 'grande')
  P.cambiarCampoCorreccion('pr-hist-corr-caja', 'c-dp')
  chk('gestión: otra caja trae su embolsado sugerido', ep.cajaId === 'c-dp' && ep.embolsado === 'individual')

  // El cono del renglón que ya no se ofrece: se ve como "el que tiene" y no viaja si no se toca.
  const I = await gestion()
  const ei = await abrir(I, 'i2')
  h = cuerpo(I)
  chk('gestión: el cono dado de baja que ya tenía se ve, marcado, y no se ofrece a otros', /DADODEBAJA \(el que tiene; ya no se ofrece\)/.test(opcionesDe(h, 'pr-hist-corr-cono')))
  ei.cajas = 11
  chk('gestión: con ese cono, cambiar solo las cajas manda {cajas}', JSON.stringify(I.datosCorreccionSublote(ei, I.estado.detalleHistorial.producido[1])) === '{"cajas":11}')

  // El error de la base va tal cual, pegado al botón, y un doble toque manda una vez.
  const E = await gestion()
  const esperandoE = []
  E.__setRpc(async (n) => n === RPC ? new Promise(r => { esperandoE.push(() => r({ data: null, error: { message: 'Esa caja no corresponde a la presentación elegida.' } })) }) : { data: null, error: null })
  const ee = await abrir(E)
  ee.cajas = 30
  ee.motivo = 'Doble toque'
  const g1 = E.guardarCorreccionSublote(); const g2 = E.guardarCorreccionSublote()
  await new Promise(r => setTimeout(r, 0))
  chk('gestión: un doble toque manda una sola vez', llamadas(E, RPC).length === 1)
  chk('gestión: mientras manda, el botón queda trabado', /id="pr-hist-corr-guardar" disabled/.test(cuerpo(E)))
  for (const s of esperandoE) s()
  await Promise.all([g1, g2])
  chk('gestión: el error de la base va tal cual, pegado al botón', /role="alert">Esa caja no corresponde a la presentación elegida\.<\/div><button type="button" class="pr-btn" id="pr-hist-corr-guardar">/.test(cuerpo(E)))

  // Si el catálogo no se puede leer: solo las cajas, por la RPC completa.
  // Falla SOLO la lectura del catálogo (la que pide los activos de la unidad),
  // no la del detalle del turno.
  const F = await gestion(undefined, { productos_terminados: (f) => f.some(x => x[0] === 'eq' && x[1] === 'activo')
    ? { data: null, error: { message: 'red' } } : { data: DETALLE.productos_terminados, error: null } })
  const ef = await abrir(F)
  chk('gestión: sin catálogo se dice y quedan las cajas', /solo se pueden corregir las cajas/.test(cuerpo(F)) && !/id="pr-hist-corr-producto"/.test(cuerpo(F)))
  ef.cajas = 20
  ef.motivo = 'Sin catálogo'
  await F.guardarCorreccionSublote()
  chk('gestión sin catálogo: manda solo {cajas}', JSON.stringify(llamadas(F, RPC)[0]?.p_datos) === '{"cajas":20}')

  // Sin el empaque: la caja y el embolsado no se tocan.
  const G = await gestion(undefined, { presentacion_cajas: () => ({ data: null, error: { message: 'red' } }) })
  const eg = await abrir(G)
  chk('gestión sin empaque: lo dice y no hay caja ni embolsado', /No se pudo leer el empaque/.test(cuerpo(G)) && !/id="pr-hist-corr-caja"/.test(cuerpo(G)))
  G.cambiarCampoCorreccion('pr-hist-corr-presentacion', 'pr-sin')
  chk('gestión sin empaque: no manda caja ni embolsado', JSON.stringify(G.datosCorreccionSublote(eg, G.estado.detalleHistorial.producido[0])) === '{"presentacion_id":"pr-sin","marca_id":null}')

  // Los selects llaman a cambiarCampoCorreccion (el doble del DOM no dispara
  // eventos: esto es lo único que se mira sobre el fuente).
  chk('gestión: el cambio de un select va a cambiarCampoCorreccion', /addEventListener\('change', ev => \{\n\s*if \(String\(ev\.target\?\.id \?\? ''\)\.startsWith\('pr-hist-corr-'\) && ev\.target\.tagName === 'SELECT'\) cambiarCampoCorreccion\(ev\.target\.id, ev\.target\.value\)/.test(FUENTE_G))

  // La corrección completa (tipo 'datos') se dice en el historial del renglón.
  const H = await gestion(undefined, { produccion_correcciones: [
    { produccion_item_id: 'i1', tipo: 'datos', cajas_antes: 35, cajas_despues: 30, motivo: 'Otro cono', hecha_por: 'e1', hecha_en: '2026-09-24T18:00:00Z' },
    { produccion_item_id: 'i2', tipo: 'datos', cajas_antes: 10, cajas_despues: 10, motivo: 'Otra caja', hecha_por: 'e1', hecha_en: '2026-09-24T18:05:00Z' }] })
  chk('gestión: una corrección completa dice "Corregido" y las cajas si cambiaron', /Corregido · cajas 35 → 30 · Otro cono/.test(cuerpo(H)) && /Corregido · Otra caja/.test(cuerpo(H)) && !/>datos ·/.test(cuerpo(H)), cuerpo(H).match(/pr-of-correccion">[^<]*/g)?.join(' | '))

  // Solo con ver: no hay botón.
  const V = await gestion([['ver', { todas: true }]])
  chk('gestión: solo con ver, ni Corregir', !/data-sublote-corregir/.test(cuerpo(V)) && V.abrirCorreccionSublote('i1', 'corregir') === false)
})())

// ── Escape de los textos que vienen de la base ───────────────────────────
esperas.push((async () => {
  const X = await gestion(undefined, {
    productos_terminados: [{ id: 'p-mini', nombre: marca('producto'), tipo_masa: 'Común', orden: 1 }],
    producto_presentaciones: [{ id: 'pr-con', producto_id: 'p-mini', nombre: marca('presentacion'), con_cono: true, unidades_por_caja: 320, orden: 1 }],
    marcas_personalizadas: [{ id: 'mk-fabri', nombre: marca('cono'), estado_alta: 'aprobada', activa: true }],
    presentacion_cajas: [{ presentacion_id: 'pr-con', insumo_id: 'c-nuss', embolsado_sugerido: 'grande' }],
    insumos: [{ id: 'c-nuss', nombre: marca('caja'), marca: null }],
  })
  await abrir(X)
  X.estado.corrigeHist.error = marca('error')
  X.estado.corrigeHist.motivo = marca('motivo')
  const p = X.estado.detalleHistorial.producido[0]
  chequearMarcas(chk, 'gestión: el formulario de corregir', X.htmlEditorSublote({ ...p, sublote: marca('sublote') }),
    ['producto', 'presentacion', 'cono', 'caja', 'error', 'motivo', 'sublote'])
})())

fin()
