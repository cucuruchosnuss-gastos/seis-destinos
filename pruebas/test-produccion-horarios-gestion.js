// Producción · gestión: los Horarios de turno, la planilla que dejó "Volvió
// con lote nuevo" y la parada que no volvió (traído de la rama
// ci-prueba/planta-horarios el 05/10/2026; esa rama no se integra).
//
// Contrato con la base (pg_get_functiondef, 05/10/2026):
//  - horarios_turno (unidad_negocio_id, turno, hora_inicio, hora_fin, activo),
//    leída por cualquiera; guardar_horario_turno(p_unidad_negocio_id, p_turno,
//    p_hora_inicio, p_hora_fin, p_activo): configurar en la unidad.
//  - relanzar_con_lote_nuevo deja el turno 'pendiente_completar' SIN
//    forzado_por y con hora_fin = la hora en que volvió.
//  - editar_parada conserva "no volvió en todo el turno" (hasta_fin_de_turno)
//    solo si la vuelta queda en el fin del turno.
//
//   node pruebas/test-produccion-horarios-gestion.js
//   ARCHIVO_GESTION=<copia de modulos/produccion-gestion.html>

process.env.TZ = 'UTC'
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE_G = leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()
const el = (S, id) => S.__doc.getElementById(id)
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const PARADA = { id: 'pa1', inicio: '2026-10-01T16:20:00Z', fin: null, motivo: 'Corte de cadena' } // 13:20

function armarGestion({ horarios = [{ turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: '15:00:00', activo: true }] } = {}) {
  const S = construirProduccion(ARCHIVO_G)
  S.estado.misTareas = new Map([['configurar', { unidades: ['u-cn'] }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos <Nuss>']])
  S.__tablas.horarios_turno = horarios
  return S
}

// ── La sección "Horarios de turno" ────────────────────────────────────────
esperas.push((async () => {
  {
    const S = armarGestion()
    await S.mostrarConfig('horarios')
    const h = el(S, 'pr-config-cuerpo').innerHTML
    chk('gestión: la sección "Horarios de turno" con Mañana, Tarde y Noche', /Horarios de turno/.test(h) && /Mañana/.test(h) && /Tarde/.test(h) && /Noche/.test(h))
    chk('… lee horarios_turno de la unidad', S.__llamadas.consultas.some(([t, f]) => t === 'horarios_turno' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]')))
    chk('… Mañana con sus horas y cuánto dura (9 h)', /id="pr-cfg-hor-manana-inicio"[^>]*value="06:00"/.test(h) && /id="pr-cfg-hor-manana-fin"[^>]*value="15:00"/.test(h) && />9 h</.test(h), h.slice(0, 600))
    chk('… Tarde sin horario: vacía y lo dice', /id="pr-cfg-hor-tarde-inicio"[^>]*value=""/.test(h) && /sin horario/.test(h))
    chk('… el nombre de la unidad escapado', /Cucuruchos &lt;Nuss&gt;/.test(h) && !/Cucuruchos <Nuss>/.test(h))
    chk('… está en el segmentado y en el menú', S.SECCIONES_CONFIG.some(([k]) => k === 'horarios') && /data-ir-config="horarios"/.test(FUENTE_G))
    chk('… nada de input type=time', !/type="time"/.test(h))
    S.tocarHorario('Tarde', 'inicio', '15:00')
    S.tocarHorario('Tarde', 'fin', '2336')
    S.tocarHorario('Tarde', 'activo', false)
    await S.guardarHorario('Tarde')
    chk('guardar → guardar_horario_turno con TODOS los parámetros',
      JSON.stringify(rpcs(S, 'guardar_horario_turno')[0]?.[1]) === '{"p_unidad_negocio_id":"u-cn","p_turno":"Tarde","p_hora_inicio":"15:00","p_hora_fin":"23:36","p_activo":false}', JSON.stringify(rpcs(S, 'guardar_horario_turno')))
    chk('… después vuelve a leer', S.__llamadas.consultas.filter(([t]) => t === 'horarios_turno').length >= 2)
  }
  {
    const S = armarGestion()
    await S.mostrarConfig('horarios')
    S.__setRpc(async () => ({ data: null, error: { message: 'El turno no puede empezar y terminar a la misma hora.' } }))
    S.tocarHorario('Mañana', 'fin', '06:00')
    await S.guardarHorario('Mañana')
    const h = el(S, 'pr-config-cuerpo').innerHTML
    chk('el error de la base TAL CUAL, pegado a su fila', /pr-cfg-error[^>]*>El turno no puede empezar y terminar a la misma hora\.</.test(h) && S.estado.config.error?.donde === 'pr-cfg-hor-guardar-manana', h.slice(0, 400))
    chk('… y lo escrito no se pierde al repintar', /id="pr-cfg-hor-manana-fin"[^>]*value="06:00"/.test(h))
    chk('… y el botón se destraba', /id="pr-cfg-hor-guardar-manana"(?![^>]*disabled)/.test(h))
  }
  {
    const S = armarGestion({ horarios: [] })
    await S.mostrarConfig('horarios')
    S.tocarHorario('Noche', 'inicio', '22:00')
    await S.guardarHorario('Noche')
    chk('sin la hora de fin no se manda, y se dice', rpcs(S, 'guardar_horario_turno').length === 0 && /Escribí a qué hora termina el turno Noche/.test(S.estado.config.error?.texto ?? ''))
    S.tocarHorario('Noche', 'fin', '06:00')
    S.tocarHorario('Noche', 'inicio', '')
    await S.guardarHorario('Noche')
    chk('sin la hora de inicio tampoco', rpcs(S, 'guardar_horario_turno').length === 0 && /Escribí a qué hora empieza el turno Noche/.test(S.estado.config.error?.texto ?? ''))
    chk('cuánto dura un turno que cruza la medianoche (22:00–06:00 = 8 h)', S.duracionHorario('22:00', '06:00') === '8 h' && S.duracionHorario('15:00', '23:36') === '8 h 36' && S.duracionHorario('06:00', '') === '')
  }
  {
    const S = armarGestion({ horarios: () => ({ data: null, error: { message: 'sin red' } }) })
    await S.mostrarConfig('horarios')
    chk('si no se pueden leer, se dice (no se inventan horarios)', /No se pudo leer la configuración/.test(el(S, 'pr-config-cuerpo').innerHTML))
  }
})())

// ── El historial: la planilla relanzada y la parada que no volvió ─────────
esperas.push((async () => {
  const S = armarGestion()
  const rel = { estado: 'pendiente_completar', forzado_por: null, forzado_motivo: null }
  chk('historial: una relanzada dice "Falta completar (productos y scrap)"', /Falta completar \(productos y scrap\)/.test(S.htmlEstadoTurno('pendiente_completar', rel)))
  chk('… una forzada, "Pendiente de completar"', /Pendiente de completar/.test(S.htmlEstadoTurno('pendiente_completar', { ...rel, forzado_por: 'x' })))
  chk('… sin la fila (sin forzado_por en la consulta), no se adivina', /Pendiente de completar/.test(S.htmlEstadoTurno('pendiente_completar', { estado: 'pendiente_completar' })))
  chk('la lista del historial trae hora_fin y forzado_por', /select\('id, lote, maquina_id, fecha, turno, encargado_id, estado, abierto_en, cerrado_en, hora_inicio, hora_fin, forzado_por, forzado_motivo'\)/.test(FUENTE_G))
  chk('el horario del detalle usa la hora de fin del turno', /06:00 a 15:00/.test(S.horarioTurno({ fecha: '2026-10-01', hora_inicio: '06:00:00', hora_fin: '15:00:00', estado: 'cerrado', cerrado_en: '2026-10-01T18:30:00Z' })))
  const p = S.htmlParadas([PARADA], null, '15:00')
  chk('historial: la parada en curso dice hasta cuándo se cuenta', /se cuenta hasta las 15:00 si no vuelve/.test(p))
  chk('… sin hora de fin no', !/se cuenta/.test(S.htmlParadas([PARADA], null, null)))
  chk('finTurnoAbierto: la de la planilla, si no la del horario, si no null',
    S.finTurnoAbierto({ turno: { estado: 'abierto', hora_fin: '14:00:00' }, finHorario: '15:00' }) === '14:00' &&
    S.finTurnoAbierto({ turno: { estado: 'abierto', hora_fin: null }, finHorario: '15:00' }) === '15:00' &&
    S.finTurnoAbierto({ turno: { estado: 'cerrado', hora_fin: '15:00:00' }, finHorario: null }) === null)
  // La parada que no volvió: cerrar_turno la termina en el fin del turno,
  // aunque la planilla se haya cerrado antes. Corregirla sin tocar nada no
  // puede dar "posterior al cierre".
  const cerrada = { estado: 'cerrado', fecha: '2026-10-01', hora_inicio: '06:00:00', hora_fin: '15:00:00', abierto_en: '2026-10-01T09:02:00Z', cerrado_en: '2026-10-01T16:54:00Z' }
  chk('finDelTurnoMs: el fin del turno en su fecha', S.finDelTurnoMs(cerrada) === new Date('2026-10-01T18:00:00Z').getTime())
  chk('… al otro día si no es posterior al inicio (Noche)', S.finDelTurnoMs({ ...cerrada, hora_inicio: '22:00:00', hora_fin: '06:00:00' }) === new Date('2026-10-02T09:00:00Z').getTime())
  chk('… sin hora de fin, null', S.finDelTurnoMs({ ...cerrada, hora_fin: null }) === null)
  const lim = S.limitesParada(cerrada, new Date('2026-10-02T12:00:00Z'))
  chk('una planilla cerrada a las 13:54 con fin 15:00: la vuelta puede ser 15:00', lim.tope >= new Date('2026-10-01T18:00:00Z').getTime())
  const conFin = { id: 'x', modo: 'editar', turno: cerrada, inicio: '13:20', fin: '15:00', sigue: false,
    parada: { inicio: '2026-10-01T16:20:00Z', fin: '2026-10-01T18:00:00Z', hasta_fin_de_turno: true } }
  chk('al corregirla se dice que sigue marcada "no volvió"', /Sigue marcada «no volvió en todo el turno»/.test(S.htmlNotaNoVolvio(conFin)))
  chk('… y con otra hora, que deja de estarlo', /deja de estar marcada/.test(S.htmlNotaNoVolvio({ ...conFin, fin: '14:30' })))
  chk('… una parada común no dice nada', S.htmlNotaNoVolvio({ ...conFin, parada: { ...conFin.parada, hasta_fin_de_turno: false } }) === '')
})())

fin()
