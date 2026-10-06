// LA PLANTA SIN INTERNET (06/10/2026): la cola de cargas adentro de la planta,
// lo "pendiente de enviar", lo que no anda sin red, y la calculadora de cajas.
//
// Contrato con la base (pg_get_functiondef, 06/10/2026):
//  - ejecutar_tablet(p_client_uuid, p_operacion, p_params) → jsonb: la puerta
//    única de la cola. Si la clave ya llegó, devuelve el mismo resultado con
//    reintento: true y no carga dos veces. Operaciones: registrar_produccion_item,
//    registrar_parada, editar_parada, registrar_hora_largada,
//    relanzar_con_lote_nuevo, cerrar_turno (los 7 parámetros), abrir_turnos
//    (devuelve { turnos: [...] }).
//  - registrar_masa sigue igual (a prueba de duplicados con su p_client_uuid).
// El doble de supabase (sandbox-produccion.js) trata ejecutar_tablet como una
// puerta transparente: anota la operación de adentro en __llamadas.rpc y la
// clave en __llamadas.tablet.
//
//   node pruebas/test-produccion-sin-internet.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const RED = { message: 'TypeError: Failed to fetch', code: '' }
const TURNO = {
  id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-10-06', turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-10-06T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '06:00:00', hora_fin: null, hora_largada: null,
}
const CATALOGO = {
  productos_terminados: [{ id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 }],
  producto_presentaciones: [{ id: 'pr-caja', producto_id: 'p-mini', nombre: 'Caja', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 600, orden: 1 }],
  marcas_personalizadas: [],
  presentacion_cajas: [], presentacion_empaque: [], insumos: [],
  unidades_negocio: [{ id: 'u-cn', caja_predeterminada_id: null }],
}

// La red: con internet, la base contesta (y recuerda cada clave); sin
// internet, todo pedido falla como un fetch que no salió.
function armar({ conRed = true } = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    ...CATALOGO,
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar') ? { data: [], error: null } : { data: [TURNO], error: null },
    turno_operarios: [], masas: [], paradas_produccion: [], produccion_items: [],
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
  })
  const red = { on: conRed, claves: new Map(), cargas: [], rechazos: new Map() }
  const CARGAS = ['registrar_parada', 'registrar_produccion_item', 'abrir_turnos', 'cerrar_turno', 'registrar_masa', 'editar_parada', 'registrar_hora_largada', 'relanzar_con_lote_nuevo']
  S.__setRpc(async (op, params, uuid) => {
    if (!red.on) return { data: null, error: RED }
    if (!CARGAS.includes(op)) return { data: op === 'personal_produccion' ? [] : null, error: null }
    if (uuid && red.claves.has(uuid)) return { data: { ...red.claves.get(uuid), reintento: true }, error: null }
    if (red.rechazos.has(op)) return { data: null, error: { message: red.rechazos.get(op), code: 'P0001' } }
    const n = red.cargas.length + 1
    red.cargas.push({ op, params, uuid })
    const res = op === 'registrar_parada' ? { parada_id: 'par-' + n }
      : op === 'registrar_produccion_item' ? { produccion_item_id: 'pi-' + n, sublote: '7023-' + n, unidades: params.p_cajas * 600, embolsado: 'ninguno' }
        : op === 'abrir_turnos' ? { turnos: [{ maquina_id: 'm1', maquina: 'Máquina 1', turno_id: 't-nuevo', lote: 7099 }] }
          : op === 'cerrar_turno' ? { lote: 7023, sublotes: [] }
            : op === 'registrar_masa' ? { masa_id: 'ma-' + n, nro: 1 }
              : {}
    if (uuid) red.claves.set(uuid, res)
    return { data: { ...res, reintento: false }, error: null }
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  S.estado.sesionPlanta = { unidad_negocio_id: 'u-cn' }
  return { S, red, sinRed(v = true) { red.on = !v; S.__nav.onLine = !v } }
}

const html = (S, id) => S.__doc.getElementById(id).innerHTML
const tablet = (S) => S.__llamadas.tablet

async function agregarCajas(S, cajas) {
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  if (S.estado.agregar.paso === 'cono') S.elegirConoSiNo(false)
  if (S.estado.agregar.paso === 'presentacion') S.elegirPresentacionAgregar('pr-caja')
  if (S.estado.agregar.paso === 'caja') S.seguirConCajas()
  S.estado.agregar.cajas = cajas
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), cajas)
  await S.confirmarAgregar()
}

// ── Con red: va por ejecutar_tablet, con su clave, y sale en el acto ─────
esperas.push((async () => {
  const { S, red } = armar()
  await S.abrirPlanilla('t1')
  await agregarCajas(S, 3)
  chk('lo producido va por ejecutar_tablet con su clave', tablet(S).length === 1 && tablet(S)[0][1] === 'registrar_produccion_item' && /^uuid-/.test(tablet(S)[0][0]), JSON.stringify(tablet(S)))
  chk('… con los parámetros de siempre', tablet(S)[0][2].p_cajas === 3 && tablet(S)[0][2].p_turno_id === 't1')
  chk('… y dice el sublote', S.__llamadas.exitos.includes('Sublote 7023-1 cargado.'), S.__llamadas.exitos.join(' | '))
  chk('… una sola carga en la base', red.cargas.length === 1)
  // Rechazo de la base en el momento: el mensaje tal cual, y NO queda en la cola.
  red.rechazos.set('registrar_produccion_item', 'Esa caja no está habilitada para esta presentación.')
  await agregarCajas(S, 2)
  chk('si la base dice que no, el mensaje va TAL CUAL, pegado al botón', S.__doc.getElementById('pr-agregar-error').textContent === 'Esa caja no está habilitada para esta presentación.' && S.__doc.getElementById('pr-agregar-error').hidden === false)
  chk('… y no queda esperando en la cola', !(await S.colaPlanta().todos()).some(x => x.estado !== 'enviado'))
})())

// ── Sin red: queda "pendiente de enviar", se ve, y se manda sola ─────────
esperas.push((async () => {
  const A = armar()
  const { S, red } = A
  await S.abrirPlanilla('t1')
  A.sinRed()
  await agregarCajas(S, 3)
  chk('sin red se dice que quedó en la tablet', S.__llamadas.exitos.some(m => /^Sin internet: quedó guardado en la tablet\. Se manda cuando vuelva la señal\.$/.test(m)), S.__llamadas.exitos.join(' | '))
  chk('… vuelve a la planilla', S.estado.vista === 'pr-planilla')
  const fila = html(S, 'pr-planilla-producido')
  chk('… y la carga se ve "pendiente de enviar"', /pr-fila-prod--cola/.test(fila) && /pendiente de enviar/.test(fila), fila)
  chk('… sin sublote todavía, y sin Corregir ni Anular', !/data-corregir="cola:/.test(fila) && !/data-borrar="cola:/.test(fila))
  chk('… con sus unidades (del catálogo)', /1\.800/.test(fila), fila)
  chk('… cuenta en el total del turno', /3 cajas/.test(html(S, 'pr-planilla-total')), html(S, 'pr-planilla-total'))
  const c = S.pintarCartelCola()
  chk('el cartel fijo dice "Sin internet · 1 carga esperando · se mandan solas"', c?.texto === 'Sin internet · 1 carga esperando · se mandan solas' && S.__doc.getElementById('pr-cola-cartel').hidden === false, c?.texto)
  chk('… y le pone la clase al cuerpo (esconde el aviso viejo)', S.__body.classList.contains('pr-con-cartel'))
  const clave = tablet(S)[0][0]
  // Una parada sin red, que sigue: después "Volvió a las…".
  await S.asegurarMotivosParada()
  // La parada se anota directo (los parámetros se arman al tocar).
  const r1 = await S.mandarCarga({ operacion: 'registrar_parada', params: { p_turno_id: 't1', p_motivo: 'Corte de luz', p_inicio: '2026-10-06T13:00:00Z', p_fin: null }, grupo: 't1', etiqueta: 'Parada' })
  chk('una parada sin red queda en la tablet', r1.resultado === 'red')
  await S.recargarOConCola()
  chk('… la planilla la muestra en curso, pendiente de enviar', S.paradaEnCurso(S.estado.planilla.paradas)?.id.startsWith('cola:') && /pendiente de enviar/.test(html(S, 'pr-planilla-paradas')))
  // "Volvió a las…" sobre la parada que todavía no llegó.
  S.abrirHoraVentana('volvio', new Date('2026-10-06T13:30:00Z'))
  S.estado.horaForm.hora = '10:20'
  await S.confirmarHoraVentana(new Date('2026-10-06T13:30:00Z'))
  const lista = await S.colaPlanta().todos()
  const vuelta = lista.find(x => x.operacion === 'editar_parada')
  chk('la vuelta va con una referencia a la parada que espera', vuelta?.params.p_parada_id?.$ref === r1.item.id, JSON.stringify(vuelta?.params))
  chk('… y con la hora que se puso (no la del envío)', vuelta?.params.p_fin === '2026-10-06T10:20:00-03:00', vuelta?.params.p_fin)
  chk('… la planilla ya la muestra terminada', !S.paradaEnCurso(S.estado.planilla.paradas))
  // La largada sin red.
  S.abrirHoraVentana('largada', new Date('2026-10-06T13:30:00Z'))
  S.estado.horaForm.hora = '06:40'
  await S.confirmarHoraVentana(new Date('2026-10-06T13:30:00Z'))
  chk('"empezó a producir" sin red se ve en la planilla', S.estado.planilla.turno.hora_largada === '06:40' && /06:40/.test(S.__doc.getElementById('pr-btn-largada').innerHTML))
  chk('… y el cartel cuenta las cuatro', S.pintarCartelCola()?.texto === 'Sin internet · 4 cargas esperando · se mandan solas', S.pintarCartelCola()?.texto)
  // Vuelve la red.
  A.sinRed(false)
  S.colaPlanta()
  await S.procesarColaPlanta()
  chk('al volver la red se mandan solas, en orden', red.cargas.map(x => x.op).join() === 'registrar_produccion_item,registrar_parada,editar_parada,registrar_hora_largada', red.cargas.map(x => x.op).join())
  chk('… una vez cada una', red.cargas.length === 4)
  chk('… la de las cajas con LA MISMA clave que se generó al tocar', red.cargas[0].uuid === clave)
  chk('… la vuelta, con el id que la base le dio a la parada', red.cargas[2].params.p_parada_id === 'par-2', JSON.stringify(red.cargas[2].params))
  chk('el cartel dice "Todo enviado ✓"', S.pintarCartelCola()?.texto === 'Todo enviado ✓', S.pintarCartelCola()?.texto)
  // Reenviar la misma clave: reintento, no duplica.
  const re = await S.supabase?.rpc?.('ejecutar_tablet', { p_client_uuid: clave, p_operacion: 'registrar_produccion_item', p_params: {} })
  void re
  const otra = await S.mandarCarga({ id: clave, operacion: 'registrar_produccion_item', params: { p_turno_id: 't1', p_cajas: 3 }, grupo: 't1' })
  chk('mandar otra vez la misma clave no carga dos veces', red.cargas.length === 4 && otra.resultado === 'ok')
})())

// ── Un error de la base, mandado solo: queda para revisar, frena SU planilla
esperas.push((async () => {
  const A = armar()
  const { S, red } = A
  await S.abrirPlanilla('t1')
  A.sinRed()
  await S.mandarCarga({ operacion: 'registrar_parada', params: { p_turno_id: 't1', p_motivo: 'x', p_inicio: '2026-10-06T13:00:00Z', p_fin: '2026-10-06T13:10:00Z' }, grupo: 't1', etiqueta: `Parada ${marca('etiqueta')}` })
  await S.mandarCarga({ operacion: 'registrar_produccion_item', params: { p_turno_id: 't1', p_cajas: 2 }, grupo: 't1', etiqueta: '2 cajas' })
  await S.mandarCarga({ operacion: 'registrar_produccion_item', params: { p_turno_id: 't2', p_cajas: 1 }, grupo: 't2', etiqueta: '1 caja' })
  A.sinRed(false)
  red.rechazos.set('registrar_parada', marca('mensaje'))
  await S.procesarColaPlanta()
  const l = S.estado.colaLista
  chk('la rechazada queda "con error para revisar"', l.find(x => x.operacion === 'registrar_parada').estado === 'error')
  chk('… frena la siguiente de ESA planilla', l.find(x => x.grupo === 't1' && x.operacion === 'registrar_produccion_item').estado === 'pendiente')
  chk('… y la otra planilla sale', l.find(x => x.grupo === 't2').estado === 'enviado')
  const c = S.pintarCartelCola()
  chk('el cartel lo dice primero', /^1 carga con error para revisar/.test(c?.texto ?? '') && c.tono === 'error', c?.texto)
  const errs = html(S, 'pr-cola-errores')
  chk('… con Reintentar y Descartar', /data-cola-reintentar=/.test(errs) && /data-cola-descartar=/.test(errs))
  chequearMarcas(chk, 'los errores de la cola', errs, ['etiqueta', 'mensaje'])
  red.rechazos.delete('registrar_parada')
  await S.reintentarCarga(l.find(x => x.operacion === 'registrar_parada').id)
  chk('"Reintentar" la manda y destraba su planilla', S.estado.colaLista.every(x => x.estado === 'enviado'))
})())

// ── Lo que no anda sin internet, con un mensaje claro ───────────────────
esperas.push((async () => {
  const A = armar()
  const { S } = A
  A.sinRed()
  await S.mostrarAbrir()
  chk('abrir una planilla nueva sin red: el mensaje', S.__llamadas.errores.includes('Sin internet no se puede abrir una planilla nueva: seguí cargando en la que está abierta.'))
  S.estado.abrir = { fecha: '2026-10-06', turno: 'Mañana', filas: [{ maquinaId: 'm1', elegida: true, operarios: ['e-op'] }] }
  await S.confirmarAbrir()
  chk('… y si igual se llega a confirmar, no se manda nada', !S.__llamadas.rpc.some(([n]) => n === 'abrir_turnos') && /Sin internet no se puede abrir una planilla nueva/.test(S.__doc.getElementById('pr-abrir-error').textContent))
  // El PIN sin red.
  S.estado.pin = { personaId: 'e-fede', personaNombre: 'Federico', puesto: 'encargado', digitos: '1234', largo: 4, fase: 'pin', modo: 'produccion' }
  S.__setRpc(async () => ({ data: null, error: RED }))
  await S.enviarPin()
  chk('cambiar de usuario con PIN sin red: el mensaje', /^Sin internet no se puede cambiar de usuario con el PIN/.test(S.estado.pin.mensaje?.texto ?? ''), S.estado.pin.mensaje?.texto)
  // La persona NO sale por inactividad sin red.
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.ultimoToque = Date.now() - 60 * 60000
  chk('sin internet, nadie sale por inactividad', S.revisarInactividad() === false && S.estado.persona?.id === 'e-fede')
  A.sinRed(false)
  chk('… con internet, sí', S.revisarInactividad() === true && S.estado.persona === null)
  // El lote nuevo sin red.
  const B = armar()
  await B.S.abrirPlanilla('t1')
  B.sinRed()
  B.S.estado.paradas = null
  B.S.estado.paradaNueva = { turnoId: 't1', motivoId: null, textoLibre: 'Corte', detalle: '', inicio: '09:00', fin: '09:30', sigue: false, loteNuevo: true, intentado: false, enviando: false, errorBase: '' }
  B.S.estado.motivosParada = null
  B.S.__doc.getElementById('pr-parada-motivo').value = 'Corte'
  await B.S.guardarParadaNueva(new Date('2026-10-06T13:00:00Z'))
  chk('pasar a un lote nuevo sin red: el mensaje, y no se manda nada', /^Sin internet no se puede pasar a un lote nuevo/.test(B.S.estado.paradaNueva.errorBase) && !B.S.__llamadas.rpc.some(([n]) => n === 'registrar_parada'), B.S.estado.paradaNueva.errorBase)
})())

// ── Abrir con red: por ejecutar_tablet, y el reintento usa la MISMA clave ─
esperas.push((async () => {
  const { S, red } = armar()
  S.estado.abrir = { fecha: '2026-10-06', turno: 'Mañana', filas: [{ maquinaId: 'm1', elegida: true, operarios: ['e-op'] }] }
  let primera = true
  const original = S.__llamadas
  void original
  S.__setRpc(async (op, params, uuid) => {
    if (primera) { primera = false; return { data: null, error: RED } }
    red.cargas.push({ op, uuid })
    return { data: { turnos: [{ maquina_id: 'm1', maquina: 'Máquina 1', turno_id: 't-n', lote: 7099 }], reintento: false }, error: null }
  })
  await S.confirmarAbrir()
  const uuid1 = tablet(S)[0]?.[0]
  await S.confirmarAbrir()
  chk('abrir va por ejecutar_tablet', tablet(S).every(x => x[1] === 'abrir_turnos'))
  chk('… y el reintento del MISMO formulario usa la MISMA clave', tablet(S).length === 2 && tablet(S)[1][0] === uuid1)
  chk('… los lotes se ven (de { turnos: [...] })', /7099/.test(html(S, 'pr-abiertos-lista')), html(S, 'pr-abiertos-lista'))
})())

// ── El cierre sin red: queda en la tablet y la máquina se suelta ─────────
esperas.push((async () => {
  const A = armar()
  const { S } = A
  await S.abrirPlanilla('t1')
  await S.mostrarCierre()
  S.estado.cierre.hora = '13:00'
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), 2)
  S.estado.cierre.scrap = 2
  A.sinRed()
  await S.enviarCierre()
  chk('el cierre sin red queda en la tablet', S.estado.vista === 'pr-cerrado' && /quedó guardado en la tablet/.test(html(S, 'pr-cerrado-lista')), html(S, 'pr-cerrado-lista') + ' / ' + S.estado.vista + ' / ' + S.estado.cierre?.errorBase)
  const c = S.estado.colaLista.find(x => x.operacion === 'cerrar_turno')
  chk('… con los siete parámetros', c && ['p_turno_id', 'p_hora_apagado', 'p_scrap_kg', 'p_observaciones', 'p_productos', 'p_hora_fin', 'p_motivo_cierre'].every(k => k in c.params), JSON.stringify(c?.params))
  await S.abrirPlanilla('t1')
  chk('… y la planilla dice que el cierre espera', /El cierre de esta planilla está guardado en la tablet/.test(html(S, 'pr-planilla-estado')))
})())

// ── Las masas van por la misma cola ──────────────────────────────────────
esperas.push((async () => {
  const A = armar()
  const { S, red } = A
  A.sinRed()
  const b = { client_uuid: 'masa-1', turnoId: 't1', lote: 7023, nro: 4, maquinaNombre: 'Máquina 1', payload: { p_turno_id: 't1', p_client_uuid: 'masa-1' }, pendiente: false }
  const r = await S.enviarMasa(b)
  chk('una masa sin red queda en la tablet', r.resultado === 'red' && S.borradoresPendientes().length === 1)
  chk('… y en la cola, con su client_uuid', (await S.colaPlanta().todos()).some(x => x.id === 'masa-1' && x.operacion === 'registrar_masa' && x.grupo === 't1'))
  A.sinRed(false)
  await S.procesarColaPlanta()
  chk('al volver la red sale por registrar_masa (no por ejecutar_tablet)', red.cargas.some(x => x.op === 'registrar_masa') && !tablet(S).some(x => x[1] === 'registrar_masa'))
  chk('… y el borrador se borra', S.borradoresPendientes().length === 0)
})())

// ── planillaConCola no duplica ───────────────────────────────────────────
esperas.push((async () => {
  const { S } = armar()
  const l = { turno: { ...TURNO }, items: [], paradas: [] }
  const lista = [{ id: 'k1', grupo: 't1', orden: 1, estado: 'pendiente', operacion: 'registrar_produccion_item', params: { p_presentacion_id: 'pr-caja', p_cajas: 2 } }]
  const una = S.planillaConCola(l, lista, { presentaciones: CATALOGO.producto_presentaciones })
  const dos = S.planillaConCola(una, lista, { presentaciones: CATALOGO.producto_presentaciones })
  chk('aplicar la cola dos veces no duplica', dos.items.length === 1 && dos.items[0].unidades === 1200)
  const enviada = [{ ...lista[0], estado: 'enviado', resultado: { produccion_item_id: 'pi-9', sublote: '7023-9' } }]
  chk('una enviada que la planilla todavía no trae se ve con su sublote', S.planillaConCola(l, enviada, {}).items[0].sublote === '7023-9')
  chk('… y una que la planilla YA trae no se repite', S.planillaConCola({ ...l, items: [{ id: 'pi-9', sublote: '7023-9' }] }, enviada, {}).items.length === 1)
  chk('otra planilla no se mezcla', S.planillaConCola({ ...l, turno: { ...TURNO, id: 't2' } }, lista, {}).items.length === 0)
})())

// ── La versión nueva ─────────────────────────────────────────────────────
esperas.push((async () => {
  const { S } = armar()
  S.__doc.getElementById('pr-version').hidden = true
  S.alMensajeSW({ tipo: 'huella', huella: 'aaa', cambio: true })
  chk('la primera huella (página de la red) no avisa', S.__doc.getElementById('pr-version').hidden !== false)
  S.alMensajeSW({ tipo: 'huella', huella: 'aaa', cambio: false })
  chk('la misma huella no avisa', S.__doc.getElementById('pr-version').hidden !== false)
  S.alMensajeSW({ tipo: 'huella', huella: 'bbb', cambio: true })
  chk('una huella nueva avisa "Hay una versión nueva"', S.__doc.getElementById('pr-version').hidden === false)
  const { S: C } = armar()
  C.alMensajeSW({ tipo: 'origen', origen: 'copia' })
  C.alMensajeSW({ tipo: 'huella', huella: 'ccc', cambio: true })
  chk('si la página salió de la copia, la primera huella cambiada ya avisa', C.__doc.getElementById('pr-version').hidden === false)
  // Actualizar nunca recarga en medio de una carga.
  let recargas = 0
  C.__win.location.reload = () => { recargas++ }
  C.estado.vista = 'pr-agregar-prod'
  C.estado.agregar = { productoId: 'p-mini' }
  chk('"Actualizar" con algo a medio cargar pregunta', C.actualizarVersion() === 'pregunta' && recargas === 0 && C.estado.confirma?.si === 'Sí, actualizar')
  C.estado.vista = 'pr-planilla'
  chk('… sin nada a medio cargar, recarga', C.actualizarVersion() === 'recarga' && recargas === 1)
})())

// ── La calculadora de cajas ──────────────────────────────────────────────
esperas.push((async () => {
  const { S } = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  if (S.estado.agregar.paso === 'presentacion') S.elegirPresentacionAgregar('pr-caja')
  S.sumarCajasAgregar(20); S.sumarCajasAgregar(20); S.sumarCajasAgregar(20)
  chk('tres veces +20 = 60', S.estado.agregar.cajas === 60, S.estado.agregar.cajas)
  S.sumarCajasAgregar(5)
  chk('+5 suma', S.estado.agregar.cajas === 65)
  S.deshacerCajasAgregar()
  chk('"Deshacer último" vuelve al número de antes', S.estado.agregar.cajas === 60)
  S.borrarCajasAgregar()
  chk('"Borrar" lo deja vacío', S.estado.agregar.cajas == null && S.__doc.getElementById('pr-agregar-cajas').value === '')
  S.deshacerCajasAgregar()
  chk('… y "Deshacer" lo trae de vuelta', S.estado.agregar.cajas === 60)
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 7)
  S.estado.agregar.cajas = 7
  S.sumarCajasAgregar(10)
  chk('lo tipeado también suma (7 + 10)', S.estado.agregar.cajas === 17)
  chk('sumarCajas: un vacío cuenta como 0 y nunca negativo', S.sumarCajas(null, 5) === 5 && S.sumarCajas(2, -5) === 0)
  chk('los rápidos dicen "+N" y SUMAN (data-cajas-sumar)', /data-cajas-sumar="20">\+20</.test(FUENTE) && !/data-cajas-poner/.test(FUENTE))
  chk('"Deshacer último" y "Borrar" están', /id="pr-agregar-deshacer">Deshacer último</.test(FUENTE) && /id="pr-agregar-borrar">Borrar</.test(FUENTE))
})())

// ── El fuente ────────────────────────────────────────────────────────────
chk('la planta pide la copia (meta sd-sin-internet)', /<meta name="sd-sin-internet" content="planta">/.test(FUENTE))
chk('registra SU service worker, con alcance solo la planta', /register\('\.\.\/sw-planta\.js', \{ scope: '\.\/produccion\.html', updateViaCache: 'none' \}\)/.test(FUENTE))
chk('la cola se procesa al volver la red y cada 30 s', /window\.addEventListener\('online'/.test(FUENTE) && /CADA_REINTENTO_MS\)/.test(FUENTE))
chk('ninguna carga de la cola llama directo a registrar_produccion_item', !/supabase\.rpc\('registrar_produccion_item'/.test(FUENTE))
chk('ni a cerrar_turno', !/supabase\.rpc\('cerrar_turno'/.test(FUENTE))
chk('ni a abrir_turnos', !/supabase\.rpc\('abrir_turnos'/.test(FUENTE))
chk('la sesión guardada se usa sin red', /const guardada = sesionGuardada\(CLAVE_SESION_SB\)/.test(FUENTE))

fin()
