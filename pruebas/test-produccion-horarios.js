// Producción · los horarios de turno, la hora de fin del cierre, la limpieza
// en el medio y "Volvió con lote nuevo" (01/10/2026).
//
// Contrato con la base (pg_get_functiondef, 01/10/2026):
//  - horarios_turno (unidad_negocio_id, turno, hora_inicio, hora_fin, activo).
//    guardar_horario_turno(p_unidad_negocio_id, p_turno, p_hora_inicio,
//    p_hora_fin, p_activo default true): configurar en la unidad; misma hora
//    de inicio y de fin rechaza.
//  - corregir_horario_turno(p_turno_id, p_hora_inicio default null,
//    p_hora_fin default null): coalesce, así un null NO toca esa hora.
//  - cerrar_turno(…, p_hora_fin): la parada que quedó abierta termina a la
//    hora de fin del turno (la de mañana si cruza la medianoche).
//  - registrar_limpieza_planchas(p_turno_id, p_momento ∈ arranque | medio |
//    final, p_minutos default null): sin minutos en medio/final EMPIEZA AHORA
//    y queda abierta.
//  - relanzar_con_lote_nuevo(p_parada_id, p_hora default null) →
//    { lote_viejo, turno_id, lote }: termina la parada, deja el turno
//    'pendiente_completar' SIN forzado_por con hora_fin, y abre otro lote en
//    la misma máquina (mismo encargado y operarios).
//
//   node pruebas/test-produccion-horarios.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
const FUENTE = leer(ARCHIVO)
const FUENTE_G = leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()

const tic = () => new Promise(r => setImmediate(r))
const el = (S, id) => S.__doc.getElementById(id)
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)

// El 01/10/2026 a las 13:54 de Argentina (16:54 UTC).
const AHORA = new Date('2026-10-01T16:54:00Z')
const TURNO = { id: 't1', lote: 6210, maquina_id: 'm1', fecha: '2026-10-01', turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-10-01T09:02:00Z', estado: 'abierto', hora_inicio: '06:00:00', hora_fin: null,
  forzado_por: null, forzado_en: null, forzado_motivo: null }
const PARADA = { id: 'pa1', inicio: '2026-10-01T16:20:00Z', fin: null, motivo: 'Corte de cadena' } // 13:20
const HORARIO = [{ turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: '15:00:00', activo: true }]

function armar({ turno = TURNO, paradas = [], horarios = HORARIO, turnos = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    turnos_produccion: filtros => {
      if (filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')) return { data: [], error: null }
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const lista = turnos ?? [turno]
      return { data: id ? lista.filter(t => t.id === id) : lista, error: null }
    },
    turno_operarios: [], masas: [], produccion_items: [], paradas_produccion: paradas,
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
    horarios_turno: horarios,
  })
  S.estado.unidadId = 'u-nuss'
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] }]
  return S
}

// ── 1 · El horario arriba de la planilla y corregir el inicio ─────────────
esperas.push((async () => {
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    const h = el(S, 'pr-planilla-horario').innerHTML
    chk('la planilla dice el horario del turno: "Turno Mañana · 06:00 – 15:00"', /Turno Mañana · <strong>06:00 – 15:00<\/strong>/.test(h), h)
    chk('… con un toque para corregir el inicio', /data-turno-inicio="1"/.test(h))
    chk('el horario se lee de horarios_turno con la unidad y el turno',
      S.__llamadas.consultas.some(([t, f]) => t === 'horarios_turno' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-nuss"]') && JSON.stringify(f).includes('["eq","turno","Mañana"]')))
  }
  {
    // Sin horario ni hora de inicio en la planilla: la hora en que se abrió, y
    // nunca una hora de fin inventada.
    const S = armar({ turno: { ...TURNO, hora_inicio: null }, horarios: [] })
    await S.abrirPlanilla('t1')
    const h = el(S, 'pr-planilla-horario').innerHTML
    chk('sin horario: dice a qué hora se abrió, y el mismo toque', /abierta 06:02/.test(h) && /data-turno-inicio/.test(h) && !/termina/.test(h), h)
    chk('… y el cierre no tiene chips ni hora de fin inventada', S.chipsFinTurno(S.estado.planilla).length === 2 && S.horasDelTurno(S.estado.planilla).fin === null)
  }
  {
    // Si el horario no se puede leer, la planilla abre igual.
    const S = armar()
    S.__tablas.horarios_turno = () => ({ data: null, error: { message: 'sin red' } })
    await S.abrirPlanilla('t1')
    chk('si el horario no se lee, la planilla abre igual (sin hora de fin)', S.estado.vista === 'pr-planilla' && S.estado.planilla?.turno?.id === 't1' &&
      S.horasDelTurno(S.estado.planilla).fin === null && !/No se pudo leer la planilla/.test(el(S, 'pr-planilla-estado').innerHTML))
  }
  {
    // El turno viene de la base: se escapa.
    const S = armar()
    const h = S.htmlHorarioPlanilla({ turno: { ...TURNO, turno: '<b>x</b>' }, horario: null })
    chk('el nombre del turno se escapa en el horario', /&lt;b&gt;x&lt;\/b&gt;/.test(h) && !/<b>x/.test(h), h)
  }
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('inicio', AHORA)
    chk('corregir el inicio abre la ventana con el teclado propio', el(S, 'pr-hora-ventana').hidden === false && /data-hv-tecla="0"/.test(el(S, 'pr-hora-ventana-hora').innerHTML))
    chk('… y nunca un input type=time', !/type="time"/.test(FUENTE))
    chk('… arranca en la hora de inicio de la planilla', /06:00/.test(el(S, 'pr-hora-ventana-hora').innerHTML))
    for (const t of ['0', '6', '1', '5']) S.teclaHoraVentana(t)
    await S.confirmarHoraVentana(AHORA)
    chk('guardar → corregir_horario_turno con p_hora_fin en null (la de fin no se toca)',
      JSON.stringify(rpcs(S, 'corregir_horario_turno')[0]?.[1]) === '{"p_turno_id":"t1","p_hora_inicio":"06:15","p_hora_fin":null}', JSON.stringify(rpcs(S, 'corregir_horario_turno')))
  }
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    S.__setRpc(async () => ({ data: null, error: { message: 'El turno no puede empezar y terminar a la misma hora.' } }))
    S.abrirHoraVentana('inicio', AHORA)
    await S.confirmarHoraVentana(AHORA)
    chk('el error de la base va TAL CUAL, pegado, y la ventana sigue abierta',
      el(S, 'pr-hora-ventana-error').textContent === 'El turno no puede empezar y terminar a la misma hora.' && el(S, 'pr-hora-ventana-error').hidden === false && el(S, 'pr-hora-ventana').hidden === false)
    chk('… y el botón se destraba', el(S, 'pr-hora-ventana-guardar').disabled === false)
  }
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('inicio', AHORA)
    for (const t of ['9', '9', '9']) S.teclaHoraVentana(t)
    await S.confirmarHoraVentana(AHORA)
    chk('una hora que no existe no se manda', rpcs(S, 'corregir_horario_turno').length === 0 && /no existe/.test(el(S, 'pr-hora-ventana-error').textContent))
  }
})())

// ── 2 · El cierre: la hora de fin, sus chips, y la parada hasta el fin ────
esperas.push((async () => {
  {
    const S = armar()
    await S.abrirPlanilla('t1')
    await S.mostrarCierre()
    chk('la hora de fin viene marcada con la del horario (15:00)', el(S, 'pr-cierre-fin').value === '15:00', el(S, 'pr-cierre-fin').value)
    const chips = el(S, 'pr-cierre-fin-chips').innerHTML
    chk('los chips: inicio + 8 h y + 9 h ("14:00 · 8 h", "15:00 · 9 h")', /data-fin-chip="14:00"[^>]*>14:00 · 8 h</.test(chips) && /data-fin-chip="15:00"[^>]*>15:00 · 9 h</.test(chips), chips)
    chk('… el de 15:00 marcado', /data-fin-chip="15:00" aria-pressed="true"/.test(chips))
    S.elegirFinCierre('14:00')
    S.ponerNumero(el(S, 'pr-cierre-scrap'), 2)
    S.cambioEnCierre()
    el(S, 'pr-cierre-hora').value = '13:50'
    S.cambioEnCierre()
    S.estado.cierre.confirmado = true
    await S.enviarCierre()
    const p = rpcs(S, 'cerrar_turno')[0]?.[1]
    chk('el chip de 8 h manda p_hora_fin 14:00', p?.p_hora_fin === '14:00', JSON.stringify(p))
    chk('… con TODOS los parámetros explícitos', JSON.stringify(Object.keys(p ?? {}).sort()) === JSON.stringify(['p_hora_apagado', 'p_hora_fin', 'p_observaciones', 'p_productos', 'p_scrap_kg', 'p_turno_id']))
    chk('… y la hora de apagado aparte', p?.p_hora_apagado === '13:50')
  }
  {
    // Sin horario y sin hora de fin en la planilla: hay que elegirla.
    const S = armar({ horarios: [] })
    await S.abrirPlanilla('t1')
    await S.mostrarCierre()
    S.ponerNumero(el(S, 'pr-cierre-scrap'), 0)
    S.cambioEnCierre()
    S.intentarCerrar()
    await tic()
    chk('sin hora de fin no se cierra, y se dice', rpcs(S, 'cerrar_turno').length === 0 && /Falta a qué hora terminó el turno/.test(el(S, 'pr-cierre-error').textContent))
    chk('… con el campo marcado y la nota', /pr-campo--mal/.test(el(S, 'pr-cierre-campo-fin').className) && el(S, 'pr-cierre-fin-nota').hidden === false)
    chk('… pero el botón se puede tocar', el(S, 'pr-cierre-enviar').disabled === false)
    el(S, 'pr-cierre-fin').value = '1600'
    S.cambioEnCierre()
    chk('escribir otra hora (1600) vale', S.faltanParaCerrar(S.estado.cierre).length === 0)
  }
  {
    // EL CASO DE FACU: se cierra a las 13:54 con fin 15:00 y una parada que
    // arrancó a las 13:20 → la parada se cuenta de 13:20 a 15:00.
    const S = armar({ paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    const h = S.paradaHastaFin(PARADA, S.estado.planilla, '15:00', AHORA)
    chk('cierre 13:54, fin 15:00, parada desde 13:20 → se cuenta de 13:20 a 15:00',
      h && h.minutos === 100 && h.texto === 'La parada «Corte de cadena» se va a contar hasta las 15:00: de 13:20 a 15:00 (1 h 40 min).', JSON.stringify(h))
    await S.mostrarCierre()
    chk('… se ve en "lo que falta", antes de confirmar', /se va a contar hasta las 15:00/.test(el(S, 'pr-cierre-falta').innerHTML))
    const avisos = S.avisosDeCierre(S.estado.planilla, S.estado.cierre)
    chk('… y en la pregunta de confirmar', avisos.some(a => /La parada «Corte de cadena» se va a contar hasta las 15:00/.test(a)), avisos.join(' | '))
    chk('el motivo de la parada se escapa en "lo que falta"', !/<b>/.test(S.htmlFaltaCierre(S.estado.cierre, { ...S.estado.planilla, paradas: [{ ...PARADA, motivo: '<b>x</b>' }] })))
  }
  {
    // Un turno de noche (22:00–06:00): el fin es el día SIGUIENTE.
    const S = armar({ turno: { ...TURNO, turno: 'Noche', hora_inicio: '22:00:00', fecha: '2026-10-01' }, horarios: [{ turno: 'Noche', hora_inicio: '22:00:00', hora_fin: '06:00:00', activo: true }] })
    await S.abrirPlanilla('t1')
    const ms = S.instanteFinTurno(S.estado.planilla, '06:00')
    chk('turno de noche: las 06:00 de fin son del día siguiente', new Date(ms).toISOString() === '2026-10-02T09:00:00.000Z', new Date(ms).toISOString())
    chk('… y la hora de fin no posterior a la parada: hasta el momento de cerrar', /hasta el momento de cerrar/.test(S.paradaHastaFin(PARADA, { ...S.estado.planilla, turno: { ...TURNO } }, '13:00', AHORA)?.texto ?? ''))
  }
})())

// ── 3 · La parada en curso: "Volvió con el mismo lote" y "Volvió con lote nuevo"
esperas.push((async () => {
  {
    const S = armar({ paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    S.pintarParadas()
    chk('con una parada en curso: "Volvió con el mismo lote"', el(S, 'pr-btn-reanudar').hidden === false && /id="pr-btn-reanudar"[^>]*>Volvió con el mismo lote</.test(FUENTE))
    chk('… y "Volvió con lote nuevo"', el(S, 'pr-btn-relanzar').hidden === false && /id="pr-btn-relanzar"[^>]*>Volvió con lote nuevo</.test(FUENTE))
    chk('"el mismo lote" sigue siendo terminar_parada', /rpc\('terminar_parada', \{ p_parada_id: enCurso\.id \}\)/.test(FUENTE))
    S.abrirHoraVentana('relanzar', AHORA)
    chk('lote nuevo: pregunta la hora, por defecto AHORA', el(S, 'pr-hora-ventana').hidden === false && /data-hv-ahora="1" aria-pressed="true"/.test(el(S, 'pr-hora-ventana-hora').innerHTML))
    chk('… y explica qué pasa con el lote', /El lote 6210 queda para completar/.test(el(S, 'pr-hora-ventana-nota').textContent), el(S, 'pr-hora-ventana-nota').textContent)
    S.__setRpc(async (n) => n === 'relanzar_con_lote_nuevo' ? { data: { lote_viejo: 6210, turno_id: 't2', lote: 6212 }, error: null } : { data: null, error: null })
    S.__tablas.turnos_produccion = filtros => {
      if (filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')) return { data: [{ ...TURNO, estado: 'pendiente_completar', hora_fin: '13:54:00' }], error: null }
      const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const t2 = { ...TURNO, id: 't2', lote: 6212, hora_inicio: '13:54:00' }
      return { data: id === 't2' ? [t2] : (id ? [TURNO] : [t2]), error: null }
    }
    S.__tablas.paradas_produccion = []
    await S.confirmarHoraVentana(AHORA)
    chk('"Ahora" → relanzar_con_lote_nuevo con p_hora null (la hora del servidor)',
      JSON.stringify(rpcs(S, 'relanzar_con_lote_nuevo')[0]?.[1]) === '{"p_parada_id":"pa1","p_hora":null}', JSON.stringify(rpcs(S, 'relanzar_con_lote_nuevo')))
    chk('… abre la planilla NUEVA', S.estado.planilla?.turno?.id === 't2' && el(S, 'pr-hora-ventana').hidden === true)
    const aviso = el(S, 'pr-planilla-estado').innerHTML
    chk('… con el aviso "Lote 6210 queda para completar · Ahora la Máquina 1 sigue con el lote 6212"',
      /Lote 6210 queda para completar · Ahora la Máquina 1 sigue con el lote 6212/.test(aviso), aviso)
    // El nombre de la máquina viene de la base: el aviso lo escapa.
    S.estado.avisoRelanzado = { turnoId: 't2', texto: S.textoRelanzado({ lote_viejo: 1, lote: 2 }, '<i>M</i>') }
    const a2 = S.htmlAvisoRelanzado(S.estado.planilla)
    chk('… el aviso escapa el nombre de la máquina', /&lt;i&gt;M&lt;\/i&gt;/.test(a2) && !/<i>M/.test(a2), a2)
  }
  {
    const S = armar({ paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('relanzar', AHORA)
    for (const t of ['1', '3', '5', '0']) S.teclaHoraVentana(t)
    await S.confirmarHoraVentana(AHORA)
    chk('otra hora (13:50) viaja en hora de Argentina', rpcs(S, 'relanzar_con_lote_nuevo')[0]?.[1]?.p_hora === '2026-10-01T13:50:00-03:00', JSON.stringify(rpcs(S, 'relanzar_con_lote_nuevo')))
  }
  {
    const S = armar({ paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('relanzar', AHORA)
    for (const t of ['1', '5', '3', '0']) S.teclaHoraVentana(t)
    await S.confirmarHoraVentana(AHORA)
    chk('una hora que todavía no pasó (15:30) no se manda', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 && /todavía no pasaron/.test(el(S, 'pr-hora-ventana-error').textContent), el(S, 'pr-hora-ventana-error').textContent)
  }
  {
    const S = armar({ paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('relanzar', AHORA)
    for (const t of ['1', '3', '1', '0']) S.teclaHoraVentana(t)
    await S.confirmarHoraVentana(AHORA)
    chk('una hora anterior a la parada no se manda', rpcs(S, 'relanzar_con_lote_nuevo').length === 0 && /después de la parada \(paró a las 13:20\)/.test(el(S, 'pr-hora-ventana-error').textContent))
  }
  {
    const S = armar({ paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    S.abrirHoraVentana('relanzar', AHORA)
    S.__setRpc(async () => ({ data: null, error: { message: 'El turno no está abierto.' } }))
    await S.confirmarHoraVentana(AHORA)
    chk('lote nuevo: el error de la base TAL CUAL', el(S, 'pr-hora-ventana-error').textContent === 'El turno no está abierto.')
  }
  {
    // Sin parada en curso, o con la planilla pendiente: no hay "lote nuevo".
    const S = armar({ turno: { ...TURNO, estado: 'pendiente_completar' }, paradas: [PARADA] })
    await S.abrirPlanilla('t1')
    S.pintarParadas()
    chk('con la planilla pendiente no se ofrece "Volvió con lote nuevo"', el(S, 'pr-btn-relanzar').hidden === true)
    S.abrirHoraVentana('relanzar', AHORA)
    chk('… y aunque se llame, no abre', !S.estado.horaForm)
  }
})())

// ── 4 · Lo que dejó "lote nuevo": falta completar, no cerrada a la fuerza ─
esperas.push((async () => {
  const S = armar()
  const relanzada = { ...TURNO, estado: 'pendiente_completar', hora_fin: '13:54:00', forzado_por: null }
  const e = S.htmlEstadoPlanilla({ turno: relanzada, horario: null }, '2026-10-01')
  chk('la planilla relanzada dice "Falta completar (productos y scrap)"', /Falta completar \(productos y scrap\)/.test(e) && !/a la fuerza/.test(e), e)
  chk('… y desde qué hora siguió el lote nuevo', /desde las 13:54/.test(e))
  const f = S.htmlEstadoPlanilla({ turno: { ...relanzada, forzado_por: 'e-fede', forzado_motivo: 'Nadie anotó' }, horario: null }, '2026-10-01')
  chk('una forzada sigue diciendo "se cerró a la fuerza"', /se cerró a la fuerza/.test(f))
  chk('el tablero: "falta completar (productos y scrap)"', /1 planilla falta completar \(productos y scrap\)/.test(S.htmlPendientesCompletar([{ id: 'a', lote: 6210, maquina_id: 'm1', forzado_por: null }], [{ id: 'm1', nombre: 'Máquina 1' }])))
  chk('los pendientes traen forzado_por', /\.select\('id, lote, maquina_id, fecha, turno, forzado_por'\)/.test(FUENTE))
  // Completarla: el MISMO cerrar_turno, con la hora de fin ya puesta.
  const T = armar({ turno: relanzada })
  await T.abrirPlanilla('t1')
  await T.mostrarCierre()
  chk('completarla trae la hora de fin del relanzado (13:54)', el(T, 'pr-cierre-fin').value === '13:54', el(T, 'pr-cierre-fin').value)
  chk('… y el botón dice "Completar la planilla"', el(T, 'pr-cierre-enviar').textContent === 'Completar la planilla')
})())

// ── 5 · Las paradas: la que sigue y la que no volvió ──────────────────────
esperas.push((async () => {
  const S = armar()
  const abierta = S.htmlParadasTurno([PARADA], '15:00')
  chk('en curso: "se cuenta hasta las 15:00 si no vuelve"', /en curso · [^<]*· se cuenta hasta las 15:00 si no vuelve/.test(abierta), abierta)
  chk('sin hora de fin no se inventa', !/se cuenta hasta/.test(S.htmlParadasTurno([PARADA], null)))
  const novolvio = S.htmlParadasTurno([{ ...PARADA, fin: '2026-10-01T18:00:00Z', hasta_fin_de_turno: true }], null)
  chk('la que no volvió: su duración real y "no volvió en todo el turno"', /1 h 40 min/.test(novolvio) && /no volvió en todo el turno/.test(novolvio), novolvio)
  await S.abrirPlanilla('t1')
  S.estado.planilla.paradas = [PARADA]
  S.pintarParadas()
  chk('la planilla abierta pasa la hora de fin del horario a la lista', /se cuenta hasta las 15:00 si no vuelve/.test(el(S, 'pr-planilla-paradas').innerHTML))
  chk('… y en una pendiente no', (() => { S.estado.planilla.turno = { ...S.estado.planilla.turno, estado: 'pendiente_completar' }; S.pintarParadas(); return !/se cuenta hasta/.test(el(S, 'pr-planilla-paradas').innerHTML) })())
})())

// ── 6 · La limpieza al terminar que EMPIEZA AHORA ─────────────────────────
esperas.push((async () => {
  const S = armar()
  S.__tablas.motivos_parada = [{ id: 'mo-limp', nombre: 'Limpieza de planchas', categoria: 'programada', pide_detalle: false, orden: 1 },
    { id: 'mo-cad', nombre: 'Corte de cadena', categoria: 'falla', pide_detalle: false, orden: 2 }]
  await S.abrirPlanilla('t1')
  S.pintarParadas(); await tic(); await tic()
  S.elegirMotivoParada('mo-limp', 'final')
  S.elegirDuracionParada('sigue')
  await S.guardarParadaNueva(AHORA)
  chk('limpieza "Al terminar" que empezó ahora → p_minutos null',
    JSON.stringify(rpcs(S, 'registrar_limpieza_planchas')[0]?.[1]) === '{"p_turno_id":"t1","p_momento":"final","p_minutos":null}', JSON.stringify(rpcs(S, 'registrar_limpieza_planchas')))
  chk('la limpieza tiene "Al arrancar", "En el medio" y "Al terminar"', /data-limpieza="medio"[^>]*>En el medio</.test(el(S, 'pr-parada-sugerencias').innerHTML))
  {
    const M = armar()
    M.__tablas.motivos_parada = S.__tablas.motivos_parada
    await M.abrirPlanilla('t1')
    M.pintarParadas(); await tic(); await tic()
    M.elegirMotivoParada('mo-limp', 'medio')
    M.elegirDuracionParada('sigue')
    await M.guardarParadaNueva(AHORA)
    chk('limpieza "En el medio" que empezó ahora → p_momento medio, p_minutos null',
      JSON.stringify(rpcs(M, 'registrar_limpieza_planchas')[0]?.[1]) === '{"p_turno_id":"t1","p_momento":"medio","p_minutos":null}', JSON.stringify(rpcs(M, 'registrar_limpieza_planchas')))
  }
  {
    // Con otra parada en curso no puede quedar abierta otra: no se manda.
    const M = armar({ paradas: [PARADA] })
    M.__tablas.motivos_parada = S.__tablas.motivos_parada
    await M.abrirPlanilla('t1')
    M.pintarParadas(); await tic(); await tic()
    M.elegirMotivoParada('mo-limp', 'final')
    M.elegirDuracionParada('sigue')
    await M.guardarParadaNueva(AHORA)
    chk('empezó ahora con otra parada en curso: no se manda', rpcs(M, 'registrar_limpieza_planchas').length === 0 && /Volvió con el mismo lote/.test(el(M, 'pr-parada-error').textContent))
  }
  chk('ya no existe el error que obligaba a poner la duración al terminar', !/if \(f\.limpieza !== 'arranque'\) return \{ error: 'Elegí cuánto duró\.' \}/.test(FUENTE))
  chk('"Al arrancar" cuenta desde la hora de inicio de la planilla', S.inicioTurnoMs(TURNO) === new Date('2026-10-01T09:00:00Z').getTime())
  chk('… y sin hora de inicio, desde que se abrió', S.inicioTurnoMs({ ...TURNO, hora_inicio: null }) === new Date(TURNO.abierto_en).getTime())
})())

// ── 7 · La gestión: Horarios de turno ─────────────────────────────────────
function armarGestion({ horarios = [{ turno: 'Mañana', hora_inicio: '06:00:00', hora_fin: '15:00:00', activo: true }] } = {}) {
  const S = construirProduccion(ARCHIVO_G)
  S.estado.misTareas = new Map([['configurar', { unidades: ['u-cn'] }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos <Nuss>']])
  S.__tablas.horarios_turno = horarios
  return S
}
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
    chk('el error de la base TAL CUAL, pegado a su fila', /pr-cfg-error[^>]*>El turno no puede empezar y terminar a la misma hora\.</.test(h) && S.estado.config.error?.donde === 'pr-cfg-hor-guardar-manana')
    chk('… y lo escrito no se pierde al repintar', /id="pr-cfg-hor-manana-fin"[^>]*value="06:00"/.test(h))
    chk('… y el botón se destraba', /id="pr-cfg-hor-guardar-manana"(?![^>]*disabled)/.test(h))
  }
  {
    const S = armarGestion({ horarios: [] })
    await S.mostrarConfig('horarios')
    S.tocarHorario('Noche', 'inicio', '22:00')
    await S.guardarHorario('Noche')
    chk('sin la hora de fin no se manda, y se dice', rpcs(S, 'guardar_horario_turno').length === 0 && /Escribí a qué hora termina el turno Noche/.test(S.estado.config.error?.texto ?? ''))
    chk('cuánto dura un turno que cruza la medianoche (22:00–06:00 = 8 h)', S.duracionHorario('22:00', '06:00') === '8 h' && S.duracionHorario('15:00', '23:36') === '8 h 36' && S.duracionHorario('06:00', '') === '')
  }
  {
    const S = armarGestion({ horarios: () => ({ data: null, error: { message: 'sin red' } }) })
    await S.mostrarConfig('horarios')
    chk('si no se pueden leer, se dice (no se inventan horarios)', /No se pudo leer la configuración/.test(el(S, 'pr-config-cuerpo').innerHTML))
  }
})())

// ── 8 · La gestión: el historial de un turno relanzado ────────────────────
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
})())

fin()
