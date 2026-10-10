// Mutaciones de test-produccion-operarios-fin.js (los operarios cuando termina
// una planilla, 08/10/2026). Ver mutar.js. De a una.
//
//   node pruebas/mut-produccion-operarios-fin.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-operarios-fin.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // ── Ocupados en Abrir turno ─────────────────────────────────────────
    { nombre: 'lee los turnos de cualquier estado', de: ".select('id, maquina_id, estado, unidad_negocio_id').eq('unidad_negocio_id', unidadId).eq('estado', 'abierto')", a: ".select('id, maquina_id, estado, unidad_negocio_id').eq('unidad_negocio_id', unidadId)" },
    { nombre: 'lee los turnos de todas las fábricas', de: ".select('id, maquina_id, estado, unidad_negocio_id').eq('unidad_negocio_id', unidadId).eq('estado', 'abierto')", a: ".select('id, maquina_id, estado, unidad_negocio_id').eq('estado', 'abierto')" },
    { nombre: 'no vuelve a mirar el estado de la planilla', de: ".filter(t => t?.estado === 'abierto' && t.unidad_negocio_id === unidadId)", a: ".filter(t => t.unidad_negocio_id === unidadId)" },
    { nombre: 'no vuelve a mirar la fábrica', de: ".filter(t => t?.estado === 'abierto' && t.unidad_negocio_id === unidadId)", a: ".filter(t => t?.estado === 'abierto')" },
    { nombre: 'la consulta no pide hasta IS NULL', de: "            .in('turno_id', ids).is('hasta', null)", a: "            .in('turno_id', ids)" },
    { nombre: 'pide los operarios de todos los turnos leídos (sin turnos)', de: "            .in('turno_id', ids).is('hasta', null)", a: "            .is('hasta', null)" },
    { nombre: 'no vuelve a mirar hasta', de: "          for (const o of data ?? []) {\n            if (o.hasta) continue\n            const t = porTurno.get(o.turno_id)", a: "          for (const o of data ?? []) {\n            const t = porTurno.get(o.turno_id)" },
    { nombre: 'un operario de un turno que no está abierto cuenta igual', de: "            if (!t) continue\n            ocupados.set(", a: "            ocupados.set(" },
    { nombre: 'no dice en qué máquina', de: "ocupados.set(o.empleado_id, `en ${nombresMaquina.get(t.maquina_id) ?? 'otra máquina'}`)", a: "ocupados.set(o.empleado_id, 'en otra máquina')" },
    { nombre: 'una máquina sin nombre dice undefined', de: "ocupados.set(o.empleado_id, `en ${nombresMaquina.get(t.maquina_id) ?? 'otra máquina'}`)", a: "ocupados.set(o.empleado_id, `en ${nombresMaquina.get(t.maquina_id)}`)" },
    { nombre: 'Abrir turno no le pasa los nombres de las máquinas', de: "      const r = await leerOcupadosYRecientes(estado.unidadId, form.filas.map(f => f.maquinaId), nombresMaquina)", a: "      const r = await leerOcupadosYRecientes(estado.unidadId, form.filas.map(f => f.maquinaId))" },
    { nombre: 'Abrir turno no pone los ocupados en el formulario', de: '      form.ocupados = r.ocupados\n', a: '' },
    { nombre: 'un error de lectura ocupa a todos', de: "        if (e0) throw e0\n        const porTurno", a: "        if (e0) { for (const p of estado.personal ?? []) ocupados.set(p.id, 'en otra máquina'); throw e0 }\n        const porTurno" },
    { nombre: 'vuelve el rótulo de "hoy"', de: "grupo(q ? 'OPERARIOS' : 'OPERARIOS · EN GRIS, LOS QUE ESTÁN AHORA EN OTRA MÁQUINA', resto)", a: "grupo(q ? 'OPERARIOS' : 'OPERARIOS · EN GRIS, LOS QUE YA ESTÁN EN OTRA MÁQUINA HOY', resto)" },
    // ── Adentro de una planilla ─────────────────────────────────────────
    { nombre: 'operarioAdentro no mira hasta', de: '      if (!o || o.hasta) return false\n', a: '      if (!o) return false\n' },
    { nombre: 'operarioAdentro no mira el estado de la planilla', de: "      return (turno?.estado ?? 'abierto') === 'abierto'\n    }", a: '      return true\n    }' },
    { nombre: 'operarioAdentro: sin estado leído se toma como cerrada', de: "      return (turno?.estado ?? 'abierto') === 'abierto'\n    }", a: "      return turno?.estado === 'abierto'\n    }" },
    { nombre: 'el resumen cuenta a los sin hasta de una planilla no abierta', de: '.filter(o => operarioAdentro(o, p?.turno)).map(o => o.empleado_id).filter(id => id !== encargado)', a: '.filter(o => !o.hasta).map(o => o.empleado_id).filter(id => id !== encargado)' },
    { nombre: 'la planilla deja adentro a los sin hasta de una planilla no abierta', de: '      const adentro = filas.filter(o => operarioAdentro(o, p?.turno))', a: '      const adentro = filas.filter(o => !o.hasta)' },
    { nombre: 'un sin hasta de una planilla no abierta desaparece de la lista', de: '        filas.filter(o => !operarioAdentro(o, p?.turno)).map(o =>', a: '        filas.filter(o => o.hasta).map(o =>' },
    { nombre: 'un sin hasta afuera dice "salió —"', de: ": 'sin hora de salida'}</span>`", a: ": 'salió —'}</span>`" },
  ],
})
