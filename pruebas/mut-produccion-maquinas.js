// Mutaciones de los indicadores de las máquinas (ver test-produccion-maquinas.js).
// La primera es la que importa: el promedio ponderado cambiado por un promedio
// de promedios tiene que poner la suite en rojo.
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-maquinas.js'),
  original: path.join(__dirname, '..', 'modulos', 'produccion-gestion.html'),
  funciones: [],
  manuales: [
    // LA REGLA DE CÁLCULO.
    { nombre: 'u/h productiva: promedio de promedios', de: '      s.uhProd = uhPonderada(s.uProd, s.minProd)\n',
      a: '      { const v = (filas ?? []).map(f => numeroInd(f?.u_h_productiva) ?? uhPonderada(f?.unidades, f?.minutos_productivos)).filter(x => x !== null); s.uhProd = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }\n' },
    { nombre: 'u/h del turno: promedio de promedios', de: '      s.uhTurno = uhPonderada(s.uTurno, s.minTurno)\n',
      a: '      { const v = (filas ?? []).map(f => numeroInd(f?.u_h_turno) ?? uhPonderada(f?.unidades, f?.minutos_turno)).filter(x => x !== null); s.uhTurno = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }\n' },
    { nombre: 'u/h productiva: suma las unidades sin horas', de: '        if (mp > 0) { s.uProd += u; s.minProd += mp }', a: '        s.uProd += u; s.minProd += mp' },
    { nombre: '% productivo sobre las horas reales', de: '      s.pctProductivo = s.minTurno > 0 ? (s.minProdTodos / s.minTurno) * 100 : null', a: '      s.pctProductivo = s.minReal > 0 ? (s.minProdTodos / s.minReal) * 100 : null' },
    { nombre: 'sin minutos la u/h es 0', de: '      if (u === null || m === null || m <= 0) return null\n      return u / (m / 60)', a: '      if (u === null || m === null || m <= 0) return 0\n      return u / (m / 60)' },
    // Variación y períodos.
    { nombre: 'variación contra 0 inventa', de: '      if (a === null || b === null || b === 0) return null\n      return ((a - b) / b) * 100', a: '      if (a === null || b === null) return null\n      return ((a - b) / (b || 1)) * 100' },
    { nombre: 'la flecha al revés', de: "return { texto: `${r > 0 ? '▲ +' : '▼ −'}", a: "return { texto: `${r < 0 ? '▲ +' : '▼ −'}" },
    { nombre: 'el período anterior no es del mismo largo', de: '      const n = diasEntreInd(desde, hasta) + 1\n', a: '      const n = diasEntreInd(desde, hasta)\n' },
    { nombre: 'la tendencia por día es de 7 días', de: '      for (let i = 29; i >= 0; i--) { const d = sumarDias(hasta, -i)', a: '      for (let i = 6; i >= 0; i--) { const d = sumarDias(hasta, -i)' },
    { nombre: 'la semana empieza el domingo', de: "      return sumarDias(iso, -((d.getUTCDay() + 6) % 7))", a: '      return sumarDias(iso, -d.getUTCDay())' },
    { nombre: 'el mes no cruza el año', de: "          const clave = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`", a: "          const clave = `${a}-${String((t % 12) + 1).padStart(2, '0')}`" },
    { nombre: 'un casillero sin planillas vale 0', de: "          if (!g) continue\n          const s = sumarTurnos(g)", a: "          if (!g) { valores[x.clave] = { valor: 0 }; continue }\n          const s = sumarTurnos(g)" },
    // ¿A dónde se va el turno?
    { nombre: 'la parada no se recorta al apagado', de: '      const fin = Math.min(msDe(p?.fin) ?? rFin, rFin)', a: '      const fin = msDe(p?.fin) ?? rFin' },
    { nombre: 'una parada sin fin no llega al fin del horario', de: '      const fin = msDe(p?.fin) ?? msDe(fila?.fin_turno)', a: '      const fin = msDe(p?.fin) ?? msDe(fila?.fin_real)' },
    { nombre: 'arranque y cierre negativo', de: "        p.arranque += Math.max(0, (numeroInd(f.minutos_turno) ?? 0) - (numeroInd(f.minutos_real) ?? 0))", a: "        p.arranque += (numeroInd(f.minutos_turno) ?? 0) - (numeroInd(f.minutos_real) ?? 0)" },
    { nombre: 'sin paradas leídas no hay "sin detalle"', de: "        for (const f of filasMaquina ?? []) p.sin_detalle += numeroInd(f.minutos_parada_en_marcha) ?? 0\n", a: '' },
    { nombre: 'suma paradas de otros turnos', de: "        for (const x of paradas) { const f = porTurno.get(x?.turno_id); if (f) p[categoriaDe(x)] += minutosEnMarcha(x, f) }",
      a: "        for (const x of paradas) { const f = porTurno.get(x?.turno_id) ?? filasMaquina[0]; if (f) p[categoriaDe(x)] += minutosEnMarcha(x, f) }" },
    // Dona y motivos.
    { nombre: 'la dona pierde las categorías desconocidas', de: "          if (n !== null && n > 0) t[['programada', 'falla'].includes(k) ? k : 'otro'] += n", a: "          if (n !== null && n > 0 && t[k] !== undefined) t[k] += n" },
    { nombre: 'los motivos sin ordenar', de: '      return [...m.values()].sort((a, b) => b.minutos - a.minutos || a.motivo.localeCompare(b.motivo, \'es\')).slice(0, n)', a: '      return [...m.values()].slice(0, n)' },
    { nombre: 'el mismo motivo escrito distinto no se junta', de: "        const k = `${categoriaDe(p)}|${texto.toLowerCase()}`", a: "        const k = `${categoriaDe(p)}|${p.motivo}`" },
    { nombre: 'motivos sin tope', de: ".slice(0, n)\n    }\n\n    function horasMin", a: "\n    }\n\n    function horasMin" },
    // La pantalla.
    { nombre: 'sin planillas dibuja igual', de: '      if (!maquinas.length) {\n        return parcial +', a: '      if (false) {\n        return parcial +' },
    { nombre: 'sin paradas dibuja una dona vacía', de: "      if (totalParadas <= 0) dona = '<div class=\"mq-graf mq-graf--sin\">", a: "      if (false) dona = '<div class=\"mq-graf mq-graf--sin\">" },
    { nombre: 'el nombre de la máquina sin escapar', de: '<span class="mq-tarjeta__punto" aria-hidden="true"></span>${esc(m.nombre)}</h3>', a: '<span class="mq-tarjeta__punto" aria-hidden="true"></span>${m.nombre}</h3>' },
    { nombre: 'el motivo sin escapar', de: '<span class="mq-motivos__que">${esc(x.motivo)}</span>', a: '<span class="mq-motivos__que">${x.motivo}</span>' },
    { nombre: 'el error sin escapar', de: '<div class="pr-ind__error" role="alert">${esc(e.error)}</div><button type="button" class="pr-btn pr-btn--secundario" data-mq-reintentar="1">', a: '<div class="pr-ind__error" role="alert">${e.error}</div><button type="button" class="pr-btn pr-btn--secundario" data-mq-reintentar="1">' },
    { nombre: 'sin la variación en la tarjeta', de: '<dd class="mq-var ${esc(vp.clase)}">${esc(vp.texto)}</dd>', a: '' },
    { nombre: 'no avisa que es parcial', de: "      const parcial = e.parcial ? '<p class=\"mq-aviso\">", a: "      const parcial = false ? '<p class=\"mq-aviso\">" },
    // La lectura.
    { nombre: 'lee una sola página', de: '        if (!data || data.length < 1000) return { filas, parcial: false }', a: '        return { filas, parcial: false }' },
    { nombre: 'no filtra por la unidad', de: ".eq('unidad_negocio_id', unidadId).gte('fecha', desde).lte('fecha', hasta)\n          .order('fecha').order('turno_id')", a: ".gte('fecha', desde).lte('fecha', hasta)\n          .order('fecha').order('turno_id')" },
    { nombre: 'las paradas de todas las planillas leídas', de: "      const par = filas.length ? await leerParadasDeTurnos(filas.map(f => f.turno_id).filter(Boolean))", a: "      const par = filas.length ? await leerParadasDeTurnos(leido.filas.map(f => f.turno_id).filter(Boolean))" },
    { nombre: 'sin turno: la respuesta vieja pisa', de: "      if (turno !== turnoMaquinas) return\n      if (error)", a: "      if (error)" },
    { nombre: 'no lee lo que necesita la tendencia', de: '      const leerDesde = ant.desde < tend.desde ? ant.desde : tend.desde', a: '      const leerDesde = ant.desde' },
    { nombre: 'un período al revés consulta igual', de: " || desde > hasta) return\n      const gran", a: ") return\n      const gran" },
    { nombre: 'acepta cualquier granularidad', de: '      if (!GRANULARIDADES.some(g => g.clave === gran) || estado.mqGran === gran) return', a: '      if (estado.mqGran === gran) return' },
  ],
})
