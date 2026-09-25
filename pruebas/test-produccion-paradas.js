// "Terminar la tablet", parte 4 (25/09/2026): las paradas.
//
// En la fábrica primero se arregla la máquina y se anota después, así que el
// cronómetro en vivo ("Paró ahora", que sigue con iniciar_parada) no puede ser
// la única forma. Ahora:
//  - "Anotar una parada" con las dos horas, o sin la de vuelta si sigue parada
//    → registrar_parada(p_turno_id, p_motivo, p_inicio, p_fin).
//  - Corregir → editar_parada(p_parada_id, p_motivo, p_inicio, p_fin), que NO
//    valida que queden dos abiertas: lo ataja la pantalla.
//  - Borrar → borrar_parada(p_parada_id, p_motivo); en una planilla cerrada
//    pide motivo de 3 letras o más y produccion:configurar.
//  - En la planilla (abierta o pendiente de completar: las RPCs solo tratan
//    'cerrado' como cerrado) y en el detalle del historial de una planilla
//    CERRADA con los permisos que piden las RPCs (cuerpos leídos con
//    pg_get_functiondef el 25/09/2026).
//  - La fecha es la del turno: la hora de parada va a la PRIMERA vez que cae
//    desde la apertura menos 1 hora; la de vuelta, si es menor, cruza
//    medianoche, pero solo si la parada queda en 12 horas o menos.
//  - Las horas con − / + de a 5 minutos y el teclado propio; nunca un input
//    del sistema. En zona Argentina (−03:00), y la suite corre con TZ=UTC
//    para que una hora sin zona dé rojo.
//
//   node pruebas/test-produccion-paradas.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Un turno de día: abrió a las 06:00 de Argentina (09:00 UTC).
const DIA = { id: 't1', lote: 7023, fecha: '2026-09-25', estado: 'abierto', abierto_en: '2026-09-25T09:00:00Z', unidad_negocio_id: 'u-cn' }
const A_LAS_12 = new Date('2026-09-25T15:00:00Z')        // 12:00 en Argentina
// Uno de noche: abrió el 24 a las 22:00 de Argentina (25 01:00 UTC).
const NOCHE = { id: 't2', lote: 7024, fecha: '2026-09-24', estado: 'abierto', abierto_en: '2026-09-25T01:00:00Z', unidad_negocio_id: 'u-cn' }
const A_LAS_5 = new Date('2026-09-25T08:00:00Z')         // 05:00 del 25 en Argentina
// Uno cerrado: abrió a las 06:00 y se cerró a las 14:00 de Argentina.
const CERRADO = { id: 't3', lote: 7021, fecha: '2026-09-23', estado: 'cerrado', abierto_en: '2026-09-23T09:00:00Z', cerrado_en: '2026-09-23T17:00:00Z', unidad_negocio_id: 'u-cn' }

function armar({ tareas = [['cargar', { todas: true }]] } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.misTareas = new Map(tareas)
  S.__setRpc(async () => ({ data: { parada_id: 'p-nueva' }, error: null }))
  return S
}
const f = (turno, extra) => ({ modo: 'anotar', turno, paradas: [], motivo: 'Se cortó la luz', inicio: '', fin: '', sigue: false, ...extra })
const llamadas = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n).map(([, p]) => p)
const ms = (iso) => new Date(iso).getTime()

// ── Las horas: zona, día y medianoche ────────────────────────────────────
{
  const S = armar()
  const h = S.resolverHorasParada(f(DIA, { inicio: '10:05', fin: '10:40' }), DIA, A_LAS_12)
  chk('con las dos horas: ISO con la zona de Argentina', h.inicio === '2026-09-25T10:05:00-03:00' && h.fin === '2026-09-25T10:40:00-03:00', JSON.stringify(h))
  chk('… que es el instante correcto aunque el proceso esté en UTC', ms(h.inicio) === ms('2026-09-25T13:05:00Z'))
  const s = S.resolverHorasParada(f(DIA, { inicio: '11:30', sigue: true }), DIA, A_LAS_12)
  chk('sin hora de vuelta: fin null', s.inicio === '2026-09-25T11:30:00-03:00' && s.fin === null, JSON.stringify(s))

  // Noche: cruza medianoche.
  const n1 = S.resolverHorasParada(f(NOCHE, { inicio: '23:50', fin: '00:20' }), NOCHE, A_LAS_5)
  chk('de noche: la vuelta menor que la parada es del día siguiente', n1.inicio === '2026-09-24T23:50:00-03:00' && n1.fin === '2026-09-25T00:20:00-03:00', JSON.stringify(n1))
  const n2 = S.resolverHorasParada(f(NOCHE, { inicio: '02:10', fin: '02:45' }), NOCHE, A_LAS_5)
  chk('de noche: una parada después de medianoche va al día siguiente', n2.inicio === '2026-09-25T02:10:00-03:00' && n2.fin === '2026-09-25T02:45:00-03:00', JSON.stringify(n2))
  chk('… y se dice en qué día cayó cuando no es el del turno', S.textoDiaParada(f(NOCHE, { inicio: '02:10', fin: '02:45' })) === 'Paró el 25/09/2026 y volvió el 25/09/2026.',
    S.textoDiaParada(f(NOCHE, { inicio: '02:10', fin: '02:45' })))
  chk('… y nada si es el mismo día del turno', S.textoDiaParada(f(DIA, { inicio: '10:05', fin: '10:40' })) === '')

  // Vuelta ≤ parada, en un turno de día: se dice ANTES de mandar.
  chk('vuelta igual a la parada: error', S.resolverHorasParada(f(DIA, { inicio: '10:40', fin: '10:40' }), DIA, A_LAS_12).error === 'La hora de vuelta tiene que ser después de la de parada.')
  chk('vuelta menor a la parada, de día: error (cruzaría medianoche con más de 12 horas)', S.resolverHorasParada(f(DIA, { inicio: '10:40', fin: '10:05' }), DIA, A_LAS_12).error === 'La hora de vuelta tiene que ser después de la de parada.')
  chk('vuelta futura: error', S.resolverHorasParada(f(DIA, { inicio: '11:00', fin: '12:30' }), DIA, A_LAS_12).error === 'La hora de vuelta no puede ser futura.')
  chk('… con la tolerancia de 5 minutos de la base', !S.resolverHorasParada(f(DIA, { inicio: '11:00', fin: '12:05' }), DIA, A_LAS_12).error)
  chk('una parada futura no entra en el turno', S.resolverHorasParada(f(DIA, { inicio: '13:00', fin: '13:30' }), DIA, A_LAS_12).error === 'La hora en que paró no entra en el turno.')
  chk('una parada más de una hora antes de abrir no entra', S.resolverHorasParada(f(DIA, { inicio: '04:30', fin: '04:50' }), DIA, A_LAS_12).error === 'La hora en que paró no entra en el turno.')
  chk('… una hora antes de abrir sí (el piso de la base)', !S.resolverHorasParada(f(DIA, { inicio: '05:00', fin: '05:20' }), DIA, A_LAS_12).error)
  // Una planilla que quedó abierta (o pendiente de completar) de días atrás:
  // la fecha es la del TURNO, no la de hoy.
  const VIEJO = { ...DIA, fecha: '2026-09-23', abierto_en: '2026-09-23T09:00:00Z', estado: 'pendiente_completar' }
  chk('planilla de días atrás: la parada va al día del turno, no a hoy',
    S.resolverHorasParada(f(VIEJO, { inicio: '10:05', fin: '10:40' }), VIEJO, A_LAS_12).inicio === '2026-09-23T10:05:00-03:00',
    JSON.stringify(S.resolverHorasParada(f(VIEJO, { inicio: '10:05', fin: '10:40' }), VIEJO, A_LAS_12)))
  // El cruce de medianoche: de noche vale; 23:55 horas no.
  const n3 = S.resolverHorasParada(f(NOCHE, { inicio: '22:30', fin: '04:00' }), NOCHE, A_LAS_5)
  chk('cruce de medianoche de 5 h 30: vale', n3.fin === '2026-09-25T04:00:00-03:00', JSON.stringify(n3))
  const V2 = { ...NOCHE, abierto_en: '2026-09-24T12:00:00Z' }   // abrió a las 09:00 del 24
  chk('cruce de medianoche de más de 12 horas: es un error de tipeo y se dice',
    S.resolverHorasParada(f(V2, { inicio: '10:00', fin: '09:55' }), V2, A_LAS_12).error === 'La hora de vuelta tiene que ser después de la de parada.',
    JSON.stringify(S.resolverHorasParada(f(V2, { inicio: '10:00', fin: '09:55' }), V2, A_LAS_12)))
  chk('… también en una cerrada de días atrás (donde no sería "futura")',
    S.resolverHorasParada(f(CERRADO, { inicio: '13:00', fin: '12:55' }), CERRADO, A_LAS_12).error === 'La hora de vuelta tiene que ser después de la de parada.')
  chk('sin hora de vuelta y sin marcar que sigue: lo pide', /Poné la hora en que volvió/.test(S.resolverHorasParada(f(DIA, { inicio: '10:00' }), DIA, A_LAS_12).error))

  // Cerrada: el tope es el cierre, no "ahora".
  const c = S.resolverHorasParada(f(CERRADO, { inicio: '12:00', fin: '13:30' }), CERRADO, A_LAS_12)
  chk('planilla cerrada: vale dentro del turno', c.inicio === '2026-09-23T12:00:00-03:00' && c.fin === '2026-09-23T13:30:00-03:00', JSON.stringify(c))
  chk('… y la vuelta después del cierre se dice', S.resolverHorasParada(f(CERRADO, { inicio: '13:30', fin: '15:00' }), CERRADO, A_LAS_12).error === 'La hora de vuelta es posterior al cierre de la planilla.')
}

// ── El teclado de las horas ──────────────────────────────────────────────
{
  const S = armar()
  S.estado.planilla = { turno: DIA, paradas: [] }
  S.abrirEditorDesdePlanilla('anotar')
  const F = S.estado.paradaForm
  F.inicio = '10:00'
  S.cambiarHoraParada('inicio', 5)
  chk('+ suma 5 minutos', F.inicio === '10:05')
  S.cambiarHoraParada('inicio', -5); S.cambiarHoraParada('inicio', -5)
  chk('− resta 5 minutos', F.inicio === '09:55')
  S.tocarHoraParada('inicio')
  chk('tocar el número abre el teclado propio', F.teclado === 'inicio' && /data-hora-tecla="listo"/.test(S.__doc.getElementById('pr-parada-editor-horas').innerHTML))
  for (const t of ['0', '9', '3', '0']) S.teclaHoraParada(t)
  S.teclaHoraParada('listo')
  chk('escribir 0930 y Listo: 09:30', F.inicio === '09:30' && F.teclado === null)
  S.tocarHoraParada('fin')
  for (const t of ['9', '4', '5']) S.teclaHoraParada(t)
  S.teclaHoraParada('listo')
  chk('tres números: 945 es 09:45', F.fin === '09:45')
  S.tocarHoraParada('fin')
  for (const t of ['2', '5', '7', '5']) S.teclaHoraParada(t)
  S.teclaHoraParada('listo')
  chk('una hora que no existe no se escribe y se dice', F.fin === '09:45' && /Esa hora no existe/.test(F.errorBase))
  S.tocarHoraParada('fin')
  S.teclaHoraParada('1'); S.teclaHoraParada('borrar')
  chk('Borrar saca el último número', F.buffer === '')
  const horas = S.__doc.getElementById('pr-parada-editor-horas').innerHTML
  chk('en las horas no hay ningún input', !/<input/.test(horas))
  chk('en todo el archivo no hay input de hora del sistema', !/type="time"/.test(FUENTE) && !/type='time'/.test(FUENTE))
  chk('− y + de a 5 minutos en los dos campos', /data-hora-paso="inicio" data-minutos="-5"/.test(horas) && /data-hora-paso="fin" data-minutos="5"/.test(horas))
  S.alternarSigueParada()
  chk('"Todavía no volvió" saca la hora de vuelta', F.sigue === true && !/data-hora-paso="fin"/.test(S.__doc.getElementById('pr-parada-editor-horas').innerHTML))
}

esperas.push((async () => {
  // ── Anotar: el payload de registrar_parada ──────────────────────────
  // En una planilla cerrada (el historial) las horas no dependen del reloj.
  const H = armar({ tareas: [['cargar', { todas: true }], ['configurar', { todas: true }]] })
  H.estado.detalleHistorial = { turno: CERRADO, paradas: [] }
  H.abrirEditorDesdeHistorial('anotar')
  Object.assign(H.estado.paradaForm, { inicio: '10:05', fin: '10:40' })
  H.__doc.getElementById('pr-parada-editor-motivo').value = '  Se trabó la cinta  '
  await H.guardarParada()
  const r1 = llamadas(H, 'registrar_parada')[0]
  chk('registrar_parada con las dos horas en ISO de Argentina', r1 && r1.p_turno_id === 't3' && r1.p_motivo === 'Se trabó la cinta' &&
    r1.p_inicio === '2026-09-23T10:05:00-03:00' && r1.p_fin === '2026-09-23T10:40:00-03:00', JSON.stringify(r1))
  chk('… y cierra el editor', H.estado.paradaForm === null && H.__doc.getElementById('pr-parada-editor').hidden === true)

  // En la planilla abierta, sin hora de vuelta (sigue parada).
  const P = armar()
  const ahora = new Date()
  // Abrió hace 23 horas: así la hora de hace un rato resuelve a hoy, y la
  // prueba no depende de a qué hora se corre.
  const turnoHoy = { ...DIA, fecha: P.hoyArgentina(ahora), abierto_en: new Date(ahora.getTime() - 23 * 3600000).toISOString() }
  P.estado.planilla = { turno: turnoHoy, paradas: [] }
  P.abrirEditorDesdePlanilla('anotar')
  const ini = P.horaConPaso(P.horaRedondeada(ahora), -60)
  Object.assign(P.estado.paradaForm, { inicio: ini })
  P.alternarSigueParada()
  P.__doc.getElementById('pr-parada-editor-motivo').value = 'Falta de harina'
  await P.guardarParada()
  const r2 = llamadas(P, 'registrar_parada')[0]
  chk('sin hora de vuelta: p_fin null', r2 && r2.p_fin === null && r2.p_inicio.endsWith(`T${ini}:00-03:00`), JSON.stringify(r2))
  chk('… y es el instante de hace una hora, no otro día', r2 && Math.abs(ms(r2.p_inicio) - (ahora.getTime() - 3600000)) < 6 * 60000, JSON.stringify(r2))

  // ── Pendiente de completar: entra por la rama de abierta ────────────
  const PC = { ...DIA, estado: 'pendiente_completar', forzado_en: '2026-09-25T18:40:00Z' }   // forzada a las 15:40
  const Q = armar()
  const abiertaPc = { id: 'p-pc', inicio: '2026-09-25T16:00:00Z', fin: null, motivo: 'Se rompió el quemador' }
  // SIN parada en curso: si no, "Paró ahora" se escondería por la en curso y
  // no por el estado de la planilla.
  Q.estado.planilla = { turno: PC, paradas: [] }
  Q.pintarBotonesPlanilla()
  chk('pendiente de completar: "Paró ahora" no aparece (iniciar_parada solo vale abierta)', Q.__doc.getElementById('pr-btn-parada').hidden === true)
  Q.estado.planilla = { turno: PC, paradas: [abiertaPc] }
  chk('… "Anotar una parada" sí', Q.__doc.getElementById('pr-btn-anotar-parada').hidden === false)
  Q.abrirEditorDesdePlanilla('anotar')
  chk('… el formulario arranca con la hora en que se la cerró a la fuerza', Q.estado.paradaForm.fin === '15:40' && Q.estado.paradaForm.inicio === '15:25', JSON.stringify(Q.estado.paradaForm))
  chk('… y no ofrece "Todavía no volvió"', !/data-hora-sigue/.test(Q.__doc.getElementById('pr-parada-editor-horas').innerHTML))
  Q.cerrarEditorParada()
  Q.abrirEditorDesdePlanilla('editar', 'p-pc')
  chk('una parada abierta en una pendiente arranca CON la hora de vuelta a la vista', Q.estado.paradaForm.sigue === false &&
    /data-hora-paso="fin"/.test(Q.__doc.getElementById('pr-parada-editor-horas').innerHTML))
  Q.cerrarEditorParada()
  Q.abrirEditorDesdePlanilla('borrar', 'p-pc')
  chk('borrar en una pendiente no pide motivo (la base la trata como abierta)', Q.__doc.getElementById('pr-parada-editor-campo-motivo').hidden === true)
  await Q.guardarParada()
  chk('… y manda p_motivo null', JSON.stringify(llamadas(Q, 'borrar_parada')[0]) === '{"p_parada_id":"p-pc","p_motivo":null}')
  const QA = armar()
  QA.estado.planilla = { turno: DIA, paradas: [] }
  QA.pintarBotonesPlanilla()
  chk('abierta y sin parada en curso: "Paró ahora" a la vista', QA.__doc.getElementById('pr-btn-parada').hidden === false)

  // Sin motivo no se manda.
  const SM = armar({ tareas: [['cargar', { todas: true }], ['configurar', { todas: true }]] })
  SM.estado.detalleHistorial = { turno: CERRADO, paradas: [] }
  SM.abrirEditorDesdeHistorial('anotar')
  Object.assign(SM.estado.paradaForm, { inicio: '10:05', fin: '10:40' })
  SM.__doc.getElementById('pr-parada-editor-motivo').value = ' '
  await SM.guardarParada()
  chk('sin motivo no se manda y se dice', llamadas(SM, 'registrar_parada').length === 0 &&
    SM.__doc.getElementById('pr-parada-editor-error').textContent === 'Escribí el motivo de la parada.')

  // ── Corregir: el payload de editar_parada, sin dos abiertas ─────────
  const E = armar()
  const abierta = { id: 'p-abierta', inicio: '2026-09-25T13:30:00Z', fin: null, motivo: 'Se cortó la luz' }
  const cerrada = { id: 'p-vieja', inicio: '2026-09-25T12:00:00Z', fin: '2026-09-25T12:20:00Z', motivo: 'Cambio de rollo' }
  E.estado.planilla = { turno: turnoHoy, paradas: [abierta, cerrada] }
  E.abrirEditorDesdePlanilla('editar', 'p-vieja')
  chk('corregir arranca con el motivo y las horas de la parada', E.estado.paradaForm.motivo === 'Cambio de rollo' &&
    E.estado.paradaForm.inicio === '09:00' && E.estado.paradaForm.fin === '09:20' && E.__doc.getElementById('pr-parada-editor-motivo').value === 'Cambio de rollo')
  E.alternarSigueParada()
  await E.guardarParada()
  chk('corregir para dejarla abierta con OTRA abierta: no se manda', llamadas(E, 'editar_parada').length === 0)
  chk('… y se dice, pegado al botón', /Ya hay una parada sin terminar/.test(E.__doc.getElementById('pr-parada-editor-error').textContent) &&
    E.__doc.getElementById('pr-parada-editor-error').hidden === false)
  chk('… el botón NO queda deshabilitado por lo que falta', E.__doc.getElementById('pr-parada-editor-guardar').disabled === false)
  // La MISMA parada abierta sí puede seguir abierta.
  E.cerrarEditorParada()
  E.abrirEditorDesdePlanilla('editar', 'p-abierta')
  chk('la abierta arranca con "Todavía no volvió"', E.estado.paradaForm.sigue === true)
  E.__doc.getElementById('pr-parada-editor-motivo').value = 'Se cortó la luz general'
  await E.guardarParada()
  const e1 = llamadas(E, 'editar_parada')[0]
  chk('editar_parada con su id, el motivo y las horas', e1 && e1.p_parada_id === 'p-abierta' && e1.p_motivo === 'Se cortó la luz general' &&
    e1.p_inicio.endsWith('T10:30:00-03:00') && e1.p_fin === null, JSON.stringify(e1))
  // Editar una cerrada con sus horas.
  const E2 = armar({ tareas: [['cargar', { todas: true }], ['configurar', { todas: true }]] })
  E2.estado.detalleHistorial = { turno: CERRADO, paradas: [{ id: 'p-h', inicio: '2026-09-23T15:00:00Z', fin: '2026-09-23T15:30:00Z', motivo: 'Rotura' }] }
  E2.abrirEditorDesdeHistorial('editar', 'p-h')
  E2.cambiarHoraParada('fin', 5)
  await E2.guardarParada()
  const e2 = llamadas(E2, 'editar_parada')[0]
  chk('editar_parada en el historial: horas de ese día', e2 && e2.p_inicio === '2026-09-23T12:00:00-03:00' && e2.p_fin === '2026-09-23T12:35:00-03:00', JSON.stringify(e2))

  // ── Borrar ─────────────────────────────────────────────────────────
  const B = armar({ tareas: [['configurar', { todas: true }]] })
  B.estado.detalleHistorial = { turno: CERRADO, paradas: [{ id: 'p-h', inicio: '2026-09-23T15:00:00Z', fin: '2026-09-23T15:30:00Z', motivo: 'Rotura' }] }
  B.abrirEditorDesdeHistorial('borrar', 'p-h')
  chk('borrar en una cerrada pide el motivo', B.__doc.getElementById('pr-parada-editor-campo-motivo').hidden === false)
  chk('… y muestra qué parada es', /12:00–12:30 · Rotura/.test(B.__doc.getElementById('pr-parada-editor-resumen').innerHTML))
  B.__doc.getElementById('pr-parada-editor-motivo').value = 'no'
  await B.guardarParada()
  chk('con menos de 3 letras no se manda', llamadas(B, 'borrar_parada').length === 0 && /tres letras/.test(B.__doc.getElementById('pr-parada-editor-error').textContent))
  B.__doc.getElementById('pr-parada-editor-motivo').value = 'Se cargó dos veces'
  await B.guardarParada()
  const b1 = llamadas(B, 'borrar_parada')[0]
  chk('borrar_parada con motivo en una cerrada', b1 && b1.p_parada_id === 'p-h' && b1.p_motivo === 'Se cargó dos veces', JSON.stringify(b1))
  // Abierta: se llega por "Corregir" → "Borrar esta parada"; el motivo no
  // se pide y va null.
  const B2 = armar()
  B2.estado.planilla = { turno: turnoHoy, paradas: [cerrada] }
  const filasB2 = B2.htmlParadas(B2.estado.planilla.paradas, { editar: true, borrar: true })
  chk('en la planilla cada parada lleva UN botón, "Corregir" (borrar va adentro)', /data-parada-editar="p-vieja">Corregir</.test(filasB2) && !/data-parada-borrar/.test(filasB2))
  B2.abrirEditorDesdePlanilla('editar', 'p-vieja')
  chk('el editor ofrece "Borrar esta parada"', B2.__doc.getElementById('pr-parada-editor-a-borrar').hidden === false)
  B2.pasarABorrarParada()
  chk('… y lo pasa a la confirmación, sin borrar nada todavía', B2.estado.paradaForm.modo === 'borrar' && llamadas(B2, 'borrar_parada').length === 0 &&
    B2.__doc.getElementById('pr-parada-editor-guardar').textContent === 'Borrar la parada' && B2.__doc.getElementById('pr-parada-editor-a-borrar').hidden === true)
  chk('… que dice qué parada es', /09:00–09:20 · Cambio de rollo/.test(B2.__doc.getElementById('pr-parada-editor-resumen').innerHTML))
  chk('borrar en la planilla abierta no pide motivo', B2.__doc.getElementById('pr-parada-editor-campo-motivo').hidden === true)
  await B2.guardarParada()
  chk('… y manda p_motivo null', JSON.stringify(llamadas(B2, 'borrar_parada')[0]) === '{"p_parada_id":"p-vieja","p_motivo":null}')
  // Cerrada, desde "Corregir" del historial: la confirmación pide el motivo.
  const B3 = armar({ tareas: [['cargar', { todas: true }], ['configurar', { todas: true }]] })
  B3.estado.detalleHistorial = { turno: CERRADO, paradas: [{ id: 'p-h', inicio: '2026-09-23T15:00:00Z', fin: '2026-09-23T15:30:00Z', motivo: 'Rotura' }] }
  B3.abrirEditorDesdeHistorial('editar', 'p-h')
  B3.pasarABorrarParada()
  chk('desde corregir en una cerrada: la confirmación pide el motivo, vacío', B3.__doc.getElementById('pr-parada-editor-campo-motivo').hidden === false &&
    B3.__doc.getElementById('pr-parada-editor-motivo').value === '' && B3.estado.paradaForm.motivo === '')
  await B3.guardarParada()
  chk('… y sin motivo no se manda', llamadas(B3, 'borrar_parada').length === 0)

  // ── Permisos en el historial ────────────────────────────────────────
  const sinConf = armar()
  chk('sin configurar, una cerrada no ofrece corregir ni borrar', JSON.stringify(sinConf.accionesParadaHistorial(CERRADO)) === '{"editar":false,"borrar":false}')
  sinConf.estado.detalleHistorial = { turno: CERRADO, paradas: [{ id: 'p-h', inicio: CERRADO.abierto_en, fin: CERRADO.cerrado_en, motivo: 'x' }] }
  sinConf.abrirEditorDesdeHistorial('borrar', 'p-h')
  chk('… ni se abre aunque se llame', sinConf.estado.paradaForm == null)
  chk('… y el renglón no lleva los botones', !/data-parada-(editar|borrar)/.test(sinConf.htmlParadas(sinConf.estado.detalleHistorial.paradas, sinConf.accionesParadaHistorial(CERRADO))))
  const soloConf = armar({ tareas: [['configurar', { todas: true }]] })
  chk('con configurar sin cargar: solo borrar (editar_parada pide cargar)', JSON.stringify(soloConf.accionesParadaHistorial(CERRADO)) === '{"editar":false,"borrar":true}')
  const conDos = armar({ tareas: [['cargar', { todas: true }], ['configurar', { unidades: ['u-cn'] }]] })
  chk('con las dos en la unidad: corregir y borrar', JSON.stringify(conDos.accionesParadaHistorial(CERRADO)) === '{"editar":true,"borrar":true}')
  chk('configurar en OTRA unidad no alcanza', JSON.stringify(armar({ tareas: [['cargar', { todas: true }], ['configurar', { unidades: ['u-dp'] }]] }).accionesParadaHistorial(CERRADO)) === '{"editar":false,"borrar":false}')
  chk('en el historial, una planilla abierta no se toca (se maneja desde la planilla)', JSON.stringify(conDos.accionesParadaHistorial(DIA)) === '{"editar":false,"borrar":false}')
  chk('el detalle usa esos permisos', /htmlParadas\(d\.paradas, accionesParadaHistorial\(t\)\)/.test(FUENTE) &&
    /accionesParadaHistorial\(t\)\.editar \? '<button type="button" class="pr-btn pr-btn--secundario" id="pr-historial-anotar-parada">Anotar una parada<\/button>'/.test(FUENTE))
  chk('una cerrada no ofrece "Todavía no volvió"', !/data-hora-sigue/.test((() => { conDos.estado.detalleHistorial = { turno: CERRADO, paradas: [] }; conDos.abrirEditorDesdeHistorial('anotar'); return conDos.__doc.getElementById('pr-parada-editor-horas').innerHTML })()))

  // ── El mensaje de la base, tal cual y pegado al botón ───────────────
  const M = armar({ tareas: [['cargar', { todas: true }], ['configurar', { todas: true }]] })
  M.__setRpc(async () => ({ data: null, error: { message: 'La parada no puede ser anterior a la apertura del turno.', code: 'P0001' } }))
  M.estado.detalleHistorial = { turno: CERRADO, paradas: [] }
  M.abrirEditorDesdeHistorial('anotar')
  Object.assign(M.estado.paradaForm, { inicio: '10:05', fin: '10:40' })
  M.__doc.getElementById('pr-parada-editor-motivo').value = 'Algo'
  await M.guardarParada()
  chk('el error de la base, tal cual', M.__doc.getElementById('pr-parada-editor-error').textContent === 'La parada no puede ser anterior a la apertura del turno.' &&
    M.__doc.getElementById('pr-parada-editor-error').hidden === false)
  M.pintarEditorParada()
  chk('… vive en el estado: un repintado no lo tapa', M.__doc.getElementById('pr-parada-editor-error').hidden === false)
  chk('… el editor sigue abierto y el botón se destraba', M.estado.paradaForm !== null && M.__doc.getElementById('pr-parada-editor-guardar').disabled === false)

  // ── HTML malicioso en el motivo ─────────────────────────────────────
  const X = armar()
  const mala = [{ id: marca('id'), inicio: '2026-09-25T12:00:00Z', fin: '2026-09-25T12:20:00Z', motivo: marca('motivo') },
    { id: 'p2', inicio: '2026-09-25T13:00:00Z', fin: null, motivo: marca('motivoCurso') }]
  chequearMarcas(chk, 'paradas de la planilla', X.htmlParadas(mala, { editar: true, borrar: true }), ['id', 'motivo', 'motivoCurso'])
  chequearMarcas(chk, 'paradas del historial', X.htmlParadas(mala, { editar: false, borrar: true }), ['id', 'motivo'])
  // El detalle del historial ENTERO, de una cerrada y con configurar: los
  // botones de corregir y borrar llevan el id escapado.
  const XH = armar({ tareas: [['cargar', { todas: true }], ['configurar', { todas: true }]] })
  const dm = {
    turno: { ...CERRADO, turno: 'Mañana', encargado_id: 'e', hora_inicio: '06:00', hora_apagado: '14:00', scrap_kg: 1, observaciones: null },
    operarios: [], nombres: new Map([['e', 'Fede']]), masas: [], items: [], recItems: [], ingredientes: [], insumos: [],
    paradas: mala, producido: [], correcciones: [], presentaciones: [], productos: [], marcas: [],
  }
  const hd = XH.htmlDetalleTurno(dm)
  chequearMarcas(chk, 'detalle del historial con corregir y borrar', hd, ['id', 'motivo', 'motivoCurso'])
  chk('… y los botones están (con configurar, en una cerrada)', /data-parada-editar=/.test(hd) && /id="pr-historial-anotar-parada"/.test(hd))
  const hdSolo = armar({ tareas: [['configurar', { todas: true }]] }).htmlDetalleTurno(dm)
  chequearMarcas(chk, 'detalle del historial con solo borrar', hdSolo, ['id', 'motivo', 'motivoCurso'])
  chk('… configurar sin cargar: "Borrar" en el renglón, ni corregir ni anotar', /data-parada-borrar=[^>]*>Borrar</.test(hdSolo) && !/data-parada-editar/.test(hdSolo) && !/pr-historial-anotar-parada/.test(hdSolo))
  const hdSin = armar().htmlDetalleTurno(dm)
  chk('sin configurar, el detalle de una cerrada no tiene ni corregir, ni borrar, ni anotar', !/data-parada-(editar|borrar)=/.test(hdSin) && !/pr-historial-anotar-parada/.test(hdSin))
  X.estado.planilla = { turno: turnoHoy, paradas: mala }
  X.abrirEditorDesdePlanilla('borrar', mala[0].id)
  chequearMarcas(chk, 'el resumen de la parada a borrar', X.__doc.getElementById('pr-parada-editor-resumen').innerHTML, ['motivo'])
})())

// ── Lo que queda escrito ──────────────────────────────────────────────────
{
  chk('"Paró ahora" sigue con iniciar_parada', /id="pr-btn-parada">Paró ahora</.test(FUENTE) && /supabase\.rpc\('iniciar_parada'/.test(FUENTE))
  chk('"Anotar una parada" en la planilla', /id="pr-btn-anotar-parada">Anotar una parada</.test(FUENTE))
  chk('el editor es un diálogo modal', /id="pr-parada-editor" hidden role="dialog" aria-modal="true"/.test(FUENTE))
  {
    const { extraerFn } = require('./extraer')
    const abrir = extraerFn(FUENTE, 'abrirEditorParada')
    chk('al abrir, el foco va al título (tabindex -1) y no al motivo: no se abre el teclado del sistema',
      /getElementById\('pr-parada-editor-titulo'\)\.focus\(\)/.test(abrir) && !/pr-parada-editor-motivo'\)\.focus\(\)/.test(abrir) &&
      /id="pr-parada-editor-titulo" tabindex="-1"/.test(FUENTE))
  }
  chk('Escape cierra el editor', /if \(ev\.key === 'Escape'\) \{ ev\.preventDefault\(\); cerrarEditorParada\(\); return \}/.test(FUENTE))
  chk('se escucha el teclado del editor', /editor\.addEventListener\('keydown', teclaEditorParada\)/.test(FUENTE))
  chk('los botones de la planilla abren el editor', /closest\('\[data-parada-editar\]'\); if \(e\) return abrirEditorDesdePlanilla\('editar'/.test(FUENTE) &&
    /closest\('\[data-parada-borrar\]'\); if \(b\) abrirEditorDesdePlanilla\('borrar'/.test(FUENTE))
  chk('y los del historial', /abrirEditorDesdeHistorial\('editar', e\.dataset\.paradaEditar\)/.test(FUENTE) && /abrirEditorDesdeHistorial\('borrar', b\.dataset\.paradaBorrar\)/.test(FUENTE))
  chk('la planilla ofrece corregir y borrar', /htmlParadas\(p\.paradas, \{ editar: true, borrar: true \}\)/.test(FUENTE))
}

fin()
