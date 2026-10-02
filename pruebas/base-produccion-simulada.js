// Una base de Producción SIMULADA, con estado, para los horarios de turno
// (01/10/2026). Imita lo que hacen las RPCs de la base de verdad según su
// descripción (Supabase no se puede leer desde una sesión en la nube):
//
//  - horarios_turno (unidad_negocio_id, turno, hora_inicio, hora_fin, activo)
//    y guardar_horario_turno(p_unidad_negocio_id, p_turno, p_hora_inicio,
//    p_hora_fin, p_activo default true), con produccion:configurar.
//  - abrir_turno: hora_inicio = la del horario del turno (null sin horario);
//    hora_fin null.
//  - corregir_horario_turno(p_turno_id, p_hora_inicio default null,
//    p_hora_fin default null): un null deja ese campo como está. Pide
//    produccion:cargar, o configurar si la planilla está cerrada.
//  - cerrar_turno(p_turno_id, p_hora_apagado, p_scrap_kg, p_observaciones,
//    p_productos, p_hora_fin default null): sin p_hora_fin usa la de la
//    planilla o la del horario; la parada abierta termina a ESA hora (no a la
//    del cierre) con hasta_fin_de_turno = true; devuelve también hora_fin.
//  - registrar_limpieza_planchas(p_turno_id, p_momento, p_minutos default
//    null): en 'medio' / 'final' sin minutos empieza AHORA y queda abierta.
//  - relanzar_con_lote_nuevo(p_parada_id, p_hora default null): termina la
//    parada a p_hora (o ahora), deja el lote viejo 'pendiente_completar' con
//    hora_fin y forzado_por null, y abre el lote nuevo en la misma máquina,
//    con el mismo encargado y operarios, hora_inicio = p_hora.
//  - editar_parada: la marca "no volvió" se mantiene si la nueva vuelta es el
//    fin del turno; si es otra, se apaga.
//  - terminar_parada.
//
// Las horas guardadas son de Argentina (UTC−3 fijo); los instantes, ISO UTC.
//
//   const base = crearBaseProduccion({ ahora, horarios, turnos, paradas, ... })
//   S.__setRpc(base.rpc); Object.assign(S.__tablas, base.tablas)

const MS_HORA = 3600000
const MS_DIA = 24 * MS_HORA
const OFFSET_AR = 3 * MS_HORA

const TURNOS_VALIDOS = ['Mañana', 'Tarde', 'Noche']
const MOMENTOS = { arranque: 'al arrancar', medio: 'en el medio del turno', final: 'al terminar' }

// 'HH:MM' o 'HH:MM:SS' → 'HH:MM:SS'; null si no es una hora.
function horaTime(v) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(v ?? '').trim())
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2])
  if (h > 23 || mi > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}:${m[3] ?? '00'}`
}

// El instante (ms) de una fecha 'AAAA-MM-DD' y una hora de Argentina.
function instante(fecha, hora) {
  const t = horaTime(hora)
  return Date.parse(`${fecha}T${t}Z`) + OFFSET_AR
}

// La hora de Argentina 'HH:MM:SS' de un instante.
function horaAr(ms) {
  return new Date(ms - OFFSET_AR).toISOString().slice(11, 19)
}

function fechaAr(ms) {
  return new Date(ms - OFFSET_AR).toISOString().slice(0, 10)
}

const iso = ms => new Date(ms).toISOString()

// El fin del turno como instante: la hora de fin en su fecha, o al día
// siguiente si no es posterior al inicio (la regla de _ts_turno).
function instanteFin(turno, horaFin) {
  const inicio = turno.hora_inicio ? instante(turno.fecha, turno.hora_inicio) : Date.parse(turno.abierto_en)
  let fin = instante(turno.fecha, horaFin)
  if (fin <= inicio) fin += MS_DIA
  return fin
}

function crearBaseProduccion({
  ahora = new Date(),
  unidad = 'u-nuss',
  horarios = [],
  turnos = [],
  paradas = [],
  operarios = [],
  maquinas = [{ id: 'm1', nombre: 'Máquina 1', orden: 1, unidad_negocio_id: 'u-nuss' }],
  tareas = ['produccion:cargar', 'produccion:configurar'],
  persona = 'e-fede',
} = {}) {
  const datos = {
    horarios_turno: horarios.map(h => ({ unidad_negocio_id: unidad, activo: true, ...h,
      hora_inicio: horaTime(h.hora_inicio), hora_fin: horaTime(h.hora_fin) })),
    turnos_produccion: turnos.map(t => ({ hora_fin: null, forzado_por: null, forzado_en: null, forzado_motivo: null,
      cerrado_en: null, scrap_kg: null, hora_apagado: null, unidad_negocio_id: unidad, ...t })),
    paradas_produccion: paradas.map(p => ({ hasta_fin_de_turno: false, categoria: null, detalle: null, ...p })),
    turno_operarios: operarios.map(o => ({ hasta: null, ...o })),
    maquinas,
    masas: [], produccion_items: [],
  }
  let reloj = ahora instanceof Date ? ahora.getTime() : Date.parse(ahora)
  let secuencia = 0
  let lote = Math.max(0, ...datos.turnos_produccion.map(t => Number(t.lote) || 0))
  const llamadas = []

  const error = message => ({ data: null, error: { message, code: 'P0001' } })
  const tiene = tarea => tareas.includes(tarea)
  const turnoDe = id => datos.turnos_produccion.find(t => t.id === id)
  const horarioDe = t => datos.horarios_turno.find(h => h.unidad_negocio_id === t.unidad_negocio_id && h.turno === t.turno && h.activo)
  const abiertaDe = turnoId => datos.paradas_produccion.find(p => p.turno_id === turnoId && !p.fin)
  // El fin del turno que vale: el de la planilla, o el del horario.
  const finQueVale = t => t.hora_fin ?? horarioDe(t)?.hora_fin ?? null

  const rpcs = {
    guardar_horario_turno({ p_unidad_negocio_id, p_turno, p_hora_inicio, p_hora_fin, p_activo = true }) {
      if (!tiene('produccion:configurar')) return error('No tenés permiso para configurar la producción de esta unidad.')
      if (!TURNOS_VALIDOS.includes(p_turno)) return error('El turno tiene que ser Mañana, Tarde o Noche.')
      const ini = horaTime(p_hora_inicio), fin = horaTime(p_hora_fin)
      if (!ini || !fin) return error('Falta la hora de inicio o la de fin.')
      if (ini === fin) return error('El turno no puede empezar y terminar a la misma hora.')
      const fila = { unidad_negocio_id: p_unidad_negocio_id, turno: p_turno, hora_inicio: ini, hora_fin: fin,
        activo: p_activo !== false, actualizado_por: persona, actualizado_en: iso(reloj) }
      const i = datos.horarios_turno.findIndex(h => h.unidad_negocio_id === p_unidad_negocio_id && h.turno === p_turno)
      if (i >= 0) datos.horarios_turno[i] = fila; else datos.horarios_turno.push(fila)
      return { data: null, error: null }
    },

    abrir_turno({ p_maquina_id, p_fecha, p_turno, p_encargado_id, p_operarios = [] }) {
      if (!tiene('produccion:cargar')) return error('No tenés permiso para cargar producción en esta unidad.')
      if (datos.turnos_produccion.some(t => t.maquina_id === p_maquina_id && t.estado === 'abierto')) return error('Esa máquina ya tiene un turno abierto.')
      const t = { id: `t-${++secuencia}`, lote: ++lote, unidad_negocio_id: unidad, maquina_id: p_maquina_id, fecha: p_fecha,
        turno: p_turno, encargado_id: p_encargado_id, estado: 'abierto', abierto_en: iso(reloj), cerrado_en: null,
        hora_inicio: null, hora_fin: null, forzado_por: null, forzado_en: null, forzado_motivo: null }
      t.hora_inicio = horarioDe(t)?.hora_inicio ?? null
      datos.turnos_produccion.push(t)
      for (const e of p_operarios) datos.turno_operarios.push({ turno_id: t.id, empleado_id: e, desde: iso(reloj), hasta: null })
      return { data: { turno_id: t.id, lote: t.lote }, error: null }
    },

    corregir_horario_turno({ p_turno_id, p_hora_inicio = null, p_hora_fin = null }) {
      const t = turnoDe(p_turno_id)
      if (!t) return error('No existe ese turno.')
      if (t.estado === 'cerrado' ? !tiene('produccion:configurar') : !tiene('produccion:cargar')) return error('No tenés permiso para corregir el horario de esta planilla.')
      if (p_hora_inicio !== null && !horaTime(p_hora_inicio)) return error('La hora de inicio no es válida.')
      if (p_hora_fin !== null && !horaTime(p_hora_fin)) return error('La hora de fin no es válida.')
      const ini = p_hora_inicio === null ? t.hora_inicio : horaTime(p_hora_inicio)
      const fin = p_hora_fin === null ? t.hora_fin : horaTime(p_hora_fin)
      if (ini && fin && ini === fin) return error('El turno no puede empezar y terminar a la misma hora.')
      t.hora_inicio = ini
      t.hora_fin = fin
      return { data: null, error: null }
    },

    cerrar_turno({ p_turno_id, p_hora_apagado, p_scrap_kg, p_observaciones, p_productos, p_hora_fin = null }) {
      const t = turnoDe(p_turno_id)
      if (!t) return error('No existe ese turno.')
      if (t.estado === 'cerrado') return error('Esta planilla ya está cerrada.')
      const fin = p_hora_fin === null ? finQueVale(t) : horaTime(p_hora_fin)
      if (p_hora_fin !== null && !fin) return error('La hora de fin no es válida.')
      const p = abiertaDe(t.id)
      if (p) {
        // Termina a la hora de FIN DEL TURNO, no a la del cierre.
        p.fin = fin ? iso(instanteFin(t, fin)) : iso(reloj)
        p.hasta_fin_de_turno = true
      }
      t.estado = 'cerrado'
      t.cerrado_en = iso(reloj)
      t.hora_apagado = horaTime(p_hora_apagado)
      t.scrap_kg = p_scrap_kg
      t.observaciones = p_observaciones
      t.hora_fin = fin
      return { data: { lote: t.lote, sublotes: [], hora_fin: fin }, error: null }
    },

    registrar_limpieza_planchas({ p_turno_id, p_momento, p_minutos = null }) {
      const t = turnoDe(p_turno_id)
      if (!t) return error('No existe ese turno.')
      if (!MOMENTOS[p_momento]) return error('El momento tiene que ser arranque, medio o final.')
      if (p_minutos === null && p_momento === 'arranque') return error('Decí cuántos minutos duró la limpieza al arrancar.')
      if (p_minutos !== null && !(Number.isInteger(p_minutos) && p_minutos > 0)) return error('Los minutos tienen que ser un número entero.')
      let inicio, fin
      if (p_minutos === null) {
        if (t.estado !== 'abierto') return error('La planilla no está abierta.')
        if (abiertaDe(t.id)) return error('Ya hay una parada sin terminar en esta planilla.')
        inicio = reloj; fin = null
      } else if (p_momento === 'arranque') {
        inicio = t.hora_inicio ? instante(t.fecha, t.hora_inicio) : Date.parse(t.abierto_en)
        fin = inicio + p_minutos * 60000
        if (fin > reloj) fin = null
      } else {
        fin = reloj; inicio = reloj - p_minutos * 60000
      }
      const p = { id: `pa-${++secuencia}`, turno_id: t.id, motivo: 'Limpieza de planchas', categoria: 'programada',
        detalle: MOMENTOS[p_momento], inicio: iso(inicio), fin: fin === null ? null : iso(fin), hasta_fin_de_turno: false }
      datos.paradas_produccion.push(p)
      return { data: { parada_id: p.id }, error: null }
    },

    terminar_parada({ p_parada_id }) {
      const p = datos.paradas_produccion.find(x => x.id === p_parada_id)
      if (!p) return error('No existe esa parada.')
      if (p.fin) return error('Esa parada ya terminó.')
      p.fin = iso(reloj)
      return { data: null, error: null }
    },

    editar_parada({ p_parada_id, p_motivo, p_inicio, p_fin }) {
      const p = datos.paradas_produccion.find(x => x.id === p_parada_id)
      if (!p) return error('No existe esa parada.')
      const t = turnoDe(p.turno_id)
      if (p_fin !== null && Date.parse(p_fin) <= Date.parse(p_inicio)) return error('La hora de vuelta tiene que ser después de la de parada.')
      p.motivo = p_motivo
      p.inicio = iso(Date.parse(p_inicio))
      p.fin = p_fin === null ? null : iso(Date.parse(p_fin))
      // La marca "no volvió" queda SOLO si la vuelta sigue siendo el fin del turno.
      if (p.hasta_fin_de_turno) {
        const fin = t && finQueVale(t)
        p.hasta_fin_de_turno = !!(p.fin && fin && Date.parse(p.fin) === instanteFin(t, fin))
      }
      return { data: null, error: null }
    },

    relanzar_con_lote_nuevo({ p_parada_id, p_hora = null }) {
      const p = datos.paradas_produccion.find(x => x.id === p_parada_id)
      if (!p) return error('No existe esa parada.')
      if (p.fin) return error('Esa parada ya terminó.')
      const viejo = turnoDe(p.turno_id)
      if (!viejo || viejo.estado !== 'abierto') return error('El turno no está abierto.')
      const hora = p_hora === null ? reloj : Date.parse(p_hora)
      if (!Number.isFinite(hora)) return error('La hora no es válida.')
      if (hora > reloj) return error('La hora de vuelta no puede ser futura.')
      if (hora <= Date.parse(p.inicio)) return error('La hora de vuelta tiene que ser después de la parada.')
      p.fin = iso(hora)
      viejo.estado = 'pendiente_completar'
      viejo.hora_fin = horaAr(hora)
      viejo.forzado_por = null
      viejo.forzado_en = null
      viejo.forzado_motivo = null
      for (const o of datos.turno_operarios) if (o.turno_id === viejo.id && !o.hasta) o.hasta = iso(hora)
      const nuevo = { ...viejo, id: `t-${++secuencia}`, lote: ++lote, estado: 'abierto', fecha: fechaAr(hora),
        abierto_en: iso(hora), hora_inicio: horaAr(hora), hora_fin: null, cerrado_en: null,
        forzado_por: null, forzado_en: null, forzado_motivo: null, scrap_kg: null, hora_apagado: null }
      datos.turnos_produccion.push(nuevo)
      for (const o of datos.turno_operarios.filter(o => o.turno_id === viejo.id)) {
        datos.turno_operarios.push({ turno_id: nuevo.id, empleado_id: o.empleado_id, desde: iso(hora), hasta: null })
      }
      return { data: { lote_viejo: viejo.lote, turno_id: nuevo.id, lote: nuevo.lote }, error: null }
    },
  }

  async function rpc(nombre, params = {}) {
    llamadas.push([nombre, params])
    const f = rpcs[nombre]
    if (!f) return { data: null, error: null }
    return f(params)
  }

  // Una tabla para el doble de supabase del sandbox: aplica eq / is / in /
  // neq / gte / lte sobre las filas de la base (copias, así la pantalla no
  // toca el estado de la base por accidente).
  function tabla(nombre) {
    return filtros => {
      let filas = datos[nombre] ?? []
      for (const [op, col, val] of filtros) {
        if (op === 'eq') filas = filas.filter(r => r[col] === val)
        else if (op === 'neq') filas = filas.filter(r => r[col] !== val)
        else if (op === 'is') filas = filas.filter(r => (val === null ? r[col] === null || r[col] === undefined : r[col] === val))
        else if (op === 'in') filas = filas.filter(r => (val ?? []).includes(r[col]))
        else if (op === 'gte') filas = filas.filter(r => r[col] >= val)
        else if (op === 'lte') filas = filas.filter(r => r[col] <= val)
      }
      return { data: filas.map(r => ({ ...r })), error: null }
    }
  }
  const tablas = {}
  for (const n of Object.keys(datos)) tablas[n] = tabla(n)

  return {
    datos, rpc, tablas, llamadas,
    pasar(minutos) { reloj += minutos * 60000 },
    ahora: () => new Date(reloj),
  }
}

module.exports = { crearBaseProduccion, instante, horaAr, instanteFin }
