// Los indicadores de las máquinas (modulos/produccion-gestion.html, sección
// "Máquinas", 04/10/2026). Se EJECUTAN las funciones reales del archivo:
//  - LA REGLA: varios turnos juntos se PONDERAN (suma de unidades / suma de
//    horas). Un promedio de las u/h de cada turno tiene que poner esto en rojo;
//  - la variación contra el período anterior del mismo largo (flecha y %);
//  - la tendencia por día, semana y mes;
//  - "¿A dónde se va el turno?": produciendo + paradas por tipo mientras la
//    máquina andaba + arranque y cierre suman el horario del turno;
//  - la dona y los motivos que más tiempo se llevaron;
//  - sin datos, un mensaje (nunca un gráfico vacío), y todo escapado;
//  - la lectura de v_turno_metricas de a 1000 y con turno.
//
//   ARCHIVO_TEST=<copia de modulos/produccion-gestion.html>
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')
const { extraerFn, extraerConst } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'produccion-gestion.html')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const graficos = fs.readFileSync(path.join(RAIZ, 'js', 'graficos.js'), 'utf8').replace(/^export /gm, '')
const CONSTANTES = ['ZONA_AR', 'COLORES_MAQUINA', 'COLOR_UH_TURNO', 'CATEGORIAS_PARADA', 'PARTES_TURNO', 'GRANULARIDADES', 'MESES_CORTOS', 'TOPE_PAGINAS_METRICAS']
const FUNCIONES = ['esc', 'numeroInd', 'horasMinutosInd', 'sumarDias', 'fechaCorta', 'fechaDelDia',
  'uhPonderada', 'sumarTurnos', 'maquinasDe', 'coloresDeMaquinas', 'variacionPct', 'textoVariacion', 'diasEntreInd', 'periodoAnterior',
  'lunesDe', 'rangoTendencia', 'serieTendencia', 'msDe', 'minutosEnMarcha', 'minutosParadaEntera', 'categoriaDe', 'partesDelTurno',
  'paradasPorCategoria', 'motivosTop', 'horasMin', 'uhTexto', 'htmlTarjetaMaquina', 'htmlFigura', 'htmlMotivo', 'htmlMaquinas',
  'pintarMaquinas', 'pintarGraficosMaquinas', 'leerMetricas', 'leerParadasDeTurnos', 'periodoMaquinas', 'cargarMaquinas', 'cambiarGranularidad']

function construir() {
  const partes = []
  for (const c of CONSTANTES) { const t = extraerConst(src, c); if (!t) throw new Error('falta la constante ' + c); partes.push(t.replace(/^const /, 'var ')) }
  for (const f of FUNCIONES) { const t = extraerFn(src, f); if (!t) throw new Error('falta la función ' + f); partes.push(t) }
  const codigo = `
    ${fuenteNumeros()}
    ${graficos}
    var console = { error() {}, log() {}, warn() {} }
    var estado = { unidadId: 'u-1', mqGran: 'dia' }
    var __elementos = {}
    function el(id) { return __elementos[id] || (__elementos[id] = { id, value: '', hidden: false, innerHTML: '', querySelectorAll: () => [] }) }
    var document = { getElementById: el, querySelector: () => null }
    var __consultas = []
    var __respuestas = {}
    var supabase = { from(tabla) {
      const q = { tabla, filtros: [] }
      const b = {
        select(c) { q.select = c; return b }, eq(a, v) { q.filtros.push(['eq', a, v]); return b }, gte(a, v) { q.filtros.push(['gte', a, v]); return b },
        lte(a, v) { q.filtros.push(['lte', a, v]); return b }, in(a, v) { q.filtros.push(['in', a, v]); return b }, order() { return b },
        range(i, j) { q.range = [i, j]; return b },
        then(res, rej) { __consultas.push(q); const r = __respuestas[tabla]; return Promise.resolve(typeof r === 'function' ? r(q) : r).then(res, rej) },
      }
      return b
    } }
    ${partes.join('\n')}
    let turnoMaquinas = 0
    return { ${[...CONSTANTES, ...FUNCIONES].join(', ')}, estado, __elementos, __consultas, __respuestas, supabase,
      graficos: { barrasAgrupadas, lineas } }
  `
  return new Function(codigo)()
}
const S = construir()

// Una planilla de v_turno_metricas.
let nTurno = 0
function fila(o = {}) {
  nTurno++
  const fecha = o.fecha ?? '2026-10-01'
  return {
    turno_id: o.turno_id ?? `t${nTurno}`, unidad_negocio_id: 'u-1', maquina_id: o.maquina_id ?? 'm1', maquina: o.maquina ?? 'Máquina 1', maquina_orden: o.maquina_orden ?? 1,
    fecha, turno: 'Mañana', lote: 7000 + nTurno, unidades: o.unidades ?? 1000, cajas: 3,
    inicio_turno: `${fecha}T09:00:00+00:00`, fin_turno: `${fecha}T18:00:00+00:00`, inicio_real: `${fecha}T09:00:00+00:00`, fin_real: o.fin_real ?? `${fecha}T17:00:00+00:00`,
    minutos_turno: o.minutos_turno ?? 540, minutos_real: o.minutos_real ?? 480, minutos_parada_en_marcha: o.en_marcha ?? 0, minutos_parada_total: o.en_marcha ?? 0,
    minutos_productivos: o.minutos_productivos ?? 480, parada_por_categoria: o.cats ?? {},
    u_h_productiva: o.u_h_productiva ?? null, u_h_turno: o.u_h_turno ?? null,
    minutos_arranque: o.minutos_arranque ?? null, tiene_largada: o.tiene_largada ?? false,
  }
}

// ── LA REGLA: ponderado, nunca promedio de promedios ─────────────────────
{
  // Un turno de 1 hora productiva con 1.000 unidades (1.000 u/h) y uno de 9
  // horas con 1.000 (111 u/h): ponderado da 200 u/h; el promedio daría 555.
  const t = [fila({ unidades: 1000, minutos_productivos: 60, minutos_turno: 120, u_h_productiva: 1000, u_h_turno: 500 }),
    fila({ unidades: 1000, minutos_productivos: 540, minutos_turno: 600, u_h_productiva: 111, u_h_turno: 100 })]
  const s = S.sumarTurnos(t)
  chk('u/h productiva PONDERADA: 2.000 u / 10 h = 200 (no 555)', Math.abs(s.uhProd - 200) < 1e-9, s.uhProd)
  chk('u/h del turno ponderada: 2.000 u / 12 h = 166,7 (no 300)', Math.abs(s.uhTurno - 2000 / 12) < 1e-9, s.uhTurno)
  chk('horas productivas sobre las del turno: 600 / 720', Math.abs(s.pctProductivo - (600 / 720) * 100) < 1e-9, s.pctProductivo)
  chk('cuenta planillas y unidades', s.turnos === 2 && s.unidades === 2000)
  const t2 = [...t, fila({ unidades: 500, minutos_productivos: 0, minutos_turno: 540 })]
  const s2 = S.sumarTurnos(t2)
  chk('una planilla sin horas productivas no suma a la u/h productiva', Math.abs(s2.uhProd - 200) < 1e-9, s2.uhProd)
  chk('… pero sí a las unidades y a la u/h del turno', s2.unidades === 2500 && Math.abs(s2.uhTurno - 2500 / 21) < 1e-9, s2.uhTurno)
  chk('sin planillas: u/h null (nunca 0)', S.sumarTurnos([]).uhProd === null && S.sumarTurnos([]).uhTurno === null && S.sumarTurnos([]).pctProductivo === null)
  chk('uhPonderada sin minutos es null', S.uhPonderada(100, 0) === null && S.uhPonderada(100, null) === null && S.uhPonderada(null, 60) === null)
  chk('uhPonderada', S.uhPonderada(300, 90) === 200)
  const h = S.htmlTarjetaMaquina({ id: 'm1', nombre: 'Máquina 1', filas: t }, null, '#C2410C')
  chk('la tarjeta muestra la u/h ponderada (200)', /<dd class="mq-dato__n">200<\/dd>/.test(h), h.match(/mq-dato__n">[^<]+/g))
  chk('… y nunca el promedio (555)', !h.includes('555'))
  // La tendencia también pondera, por día.
  const ten = S.serieTendencia(t.map(x => ({ ...x, fecha: '2026-10-01' })), 'dia', '2026-10-01', new Map([['m1', '#C2410C']]))
  chk('la tendencia también pondera (200 ese día)', Math.abs(ten.series[0].valores['2026-10-01'].valor - 200) < 1e-9, ten.series[0].valores['2026-10-01'])
}

// ── Máquinas, colores, variación, períodos ───────────────────────────────
{
  const m = S.maquinasDe([fila({ maquina_id: 'm2', maquina: 'Máquina 2', maquina_orden: 2 }), fila({ maquina_id: 'm1' }), fila({ maquina_id: 'm2', maquina: 'Máquina 2', maquina_orden: 2 })])
  chk('agrupa por máquina en el orden de la fábrica', m.map(x => x.id).join() === 'm1,m2' && m[1].filas.length === 2)
  chk('una fila sin máquina no se cuenta', S.maquinasDe([{ maquina_id: null }]).length === 0)
  const c = S.coloresDeMaquinas(m)
  chk('cada máquina con su color, distinto', c.get('m1') !== c.get('m2') && c.get('m1') === S.COLORES_MAQUINA[0])
  chk('ningún color azul', S.COLORES_MAQUINA.every(h => { const r = parseInt(h.slice(1, 3), 16), b = parseInt(h.slice(5, 7), 16); return !(b > r + 40) }))
  chk('variación %', Math.abs(S.variacionPct(110, 100) - 10) < 1e-9 && Math.abs(S.variacionPct(90, 100) + 10) < 1e-9)
  chk('variación sin dato o contra 0: null', S.variacionPct(null, 100) === null && S.variacionPct(100, null) === null && S.variacionPct(100, 0) === null)
  chk('flecha para arriba', S.textoVariacion(12.4).texto === '▲ +12 %' && S.textoVariacion(12.4).clase === 'pr-ind-mas')
  chk('flecha para abajo', S.textoVariacion(-3.6).texto === '▼ −4 %' && S.textoVariacion(-3.6).clase === 'pr-ind-menos')
  chk('igual', S.textoVariacion(0.2).texto === '= 0 %')
  chk('sin dato: "—"', S.textoVariacion(null).texto === '—')
  const a = S.periodoAnterior('2026-10-01', '2026-10-04')
  chk('período anterior del mismo largo, pegado antes', a.desde === '2026-09-27' && a.hasta === '2026-09-30', JSON.stringify(a))
  const b = S.periodoAnterior('2026-10-02', '2026-10-02')
  chk('el anterior de un día es el día anterior', b.desde === '2026-10-01' && b.hasta === '2026-10-01')
  const mes = S.periodoAnterior('2026-09-01', '2026-09-30')
  chk('el anterior de un mes de 30 días son los 30 días de antes', mes.desde === '2026-08-02' && mes.hasta === '2026-08-31', JSON.stringify(mes))
}

// ── Tendencia: día, semana, mes ──────────────────────────────────────────
{
  const d = S.rangoTendencia('dia', '2026-10-04')
  chk('día: 30 casilleros hasta el fin del período', d.ejeX.length === 30 && d.ejeX[29].clave === '2026-10-04' && d.ejeX[0].clave === '2026-09-05' && d.desde === '2026-09-05')
  chk('día: la etiqueta dd/mm', d.ejeX[29].etiqueta === '04/10')
  const s = S.rangoTendencia('semana', '2026-10-04')
  chk('semana: 12 semanas, del lunes', s.ejeX.length === 12 && s.ejeX[11].clave === '2026-09-28' && s.ejeX[0].clave === '2026-07-13', s.ejeX.map(x => x.clave).join())
  chk('semana: una fecha va a su lunes', s.claveDe('2026-10-04') === '2026-09-28' && s.claveDe('2026-09-28') === '2026-09-28')
  const m = S.rangoTendencia('mes', '2026-02-10')
  chk('mes: 12 meses, cruzando el año', m.ejeX.length === 12 && m.ejeX[0].clave === '2025-03' && m.ejeX[11].clave === '2026-02' && m.desde === '2025-03-01', m.ejeX.map(x => x.clave).join())
  chk('mes: etiqueta corta', m.ejeX[11].etiqueta === 'feb' && m.ejeX[9].etiqueta === 'dic')
  const filas = [fila({ fecha: '2026-09-29', unidades: 900, minutos_productivos: 60 }), fila({ fecha: '2026-10-02', unidades: 300, minutos_productivos: 60 }), fila({ fecha: '2026-05-01' })]
  const t = S.serieTendencia(filas, 'semana', '2026-10-04', new Map([['m1', '#C2410C']]))
  chk('semana: los dos turnos de la misma semana, ponderados (600 u/h)', Math.abs(t.series[0].valores['2026-09-28'].valor - 600) < 1e-9)
  chk('un casillero sin planillas no tiene valor (no es 0)', !('2026-09-21' in t.series[0].valores))
  chk('la cifra exacta de cada punto', /Máquina 1 · 28\/09: 600 u\/h productiva \(2 planillas\)/.test(t.series[0].valores['2026-09-28'].detalle), t.series[0].valores['2026-09-28'].detalle)
  chk('lo de afuera del rango no entra', Object.keys(t.series[0].valores).length === 1)
}

// ── ¿A dónde se va el turno?, la dona y los motivos ─────────────────────
{
  // Turno de 9 h (540 min), prendida 8 h (480): 60 min de arranque y cierre.
  // Paradas: una falla de 30 min adentro, una programada que empieza 20 min
  // antes del apagado y sigue (solo 20 cuentan mientras andaba).
  const f = fila({ turno_id: 'tx', minutos_turno: 540, minutos_real: 480, en_marcha: 50, minutos_productivos: 430, cats: { falla: 30, programada: 80 } })
  const paradas = [
    { turno_id: 'tx', inicio: '2026-10-01T11:00:00+00:00', fin: '2026-10-01T11:30:00+00:00', motivo: 'Se cortó la masa', categoria: 'falla' },
    { turno_id: 'tx', inicio: '2026-10-01T16:40:00+00:00', fin: null, motivo: 'Limpieza', categoria: 'programada' },
    { turno_id: 'otro', inicio: '2026-10-01T11:00:00+00:00', fin: '2026-10-01T15:00:00+00:00', motivo: 'De otro período', categoria: 'falla' },
  ]
  chk('minutos mientras andaba: recortada al apagado', S.minutosEnMarcha(paradas[1], f) === 20)
  chk('minutos mientras andaba: entera adentro', S.minutosEnMarcha(paradas[0], f) === 30)
  chk('una parada que sigue después del apagado se corta en el apagado', S.minutosEnMarcha({ inicio: '2026-10-01T16:40:00+00:00', fin: '2026-10-01T17:30:00+00:00' }, f) === 20)
  chk('una parada que empezó antes de abrir cuenta desde la apertura', S.minutosEnMarcha({ inicio: '2026-10-01T08:30:00+00:00', fin: '2026-10-01T09:10:00+00:00' }, f) === 10)
  chk('parada entera sin fin: hasta el fin del horario', S.minutosParadaEntera(paradas[1], f) === 80)
  chk('una parada con fechas rotas cuenta 0', S.minutosEnMarcha({ inicio: 'x' }, f) === 0 && S.minutosParadaEntera({ inicio: null }, f) === 0)
  const p = S.partesDelTurno([f], paradas)
  chk('produciendo = los minutos productivos', p.productiva === 430)
  chk('las paradas por tipo, mientras andaba', p.falla === 30 && p.programada === 20 && p.otro === 0 && p.organizativa === 0)
  chk('sin la hora de largada: todo el horario fuera va a "cierre y resto"', p.arranque === 0 && p.cierre === 60)
  chk('las partes suman el horario del turno', p.productiva + p.falla + p.programada + p.organizativa + p.otro + p.sin_detalle + p.arranque + p.cierre === 540)
  chk('las paradas de otro turno no se suman', p.falla === 30)
  const sin = S.partesDelTurno([f], null)
  chk('sin las paradas leídas: todo junto "sin detalle"', sin.sin_detalle === 50 && sin.falla === 0 && sin.productiva + sin.sin_detalle + sin.arranque + sin.cierre === 540)
  const largo = S.partesDelTurno([fila({ minutos_turno: 500, minutos_real: 520, tiene_largada: true, minutos_arranque: 15 })], [])
  chk('si se trabajó más que el horario, ni el arranque ni el cierre son negativos', largo.arranque === 0 && largo.cierre === 0, JSON.stringify(largo))
  // Con la hora de "empezó a producir" (05/10/2026): el arranque sale de
  // minutos_arranque y el resto del horario fuera es el cierre.
  const conL = S.partesDelTurno([fila({ turno_id: 'tl', minutos_turno: 540, minutos_real: 480, en_marcha: 0, minutos_productivos: 480, tiene_largada: true, minutos_arranque: 40 })], [])
  chk('con largada: el arranque son los minutos_arranque', conL.arranque === 40 && conL.cierre === 20, JSON.stringify(conL))
  chk('con largada: las partes siguen sumando el horario', conL.productiva + conL.arranque + conL.cierre === 540)
  const sinFlag = S.partesDelTurno([fila({ minutos_turno: 540, minutos_real: 480, minutos_arranque: 40 })], [])
  chk('minutos_arranque sin tiene_largada no cuenta como arranque', sinFlag.arranque === 0 && sinFlag.cierre === 60)
  const tope = S.partesDelTurno([fila({ minutos_turno: 540, minutos_real: 500, tiene_largada: true, minutos_arranque: 90 })], [])
  chk('el arranque no pasa del horario fuera', tope.arranque === 40 && tope.cierre === 0, JSON.stringify(tope))
  const neg = S.partesDelTurno([fila({ minutos_turno: 540, minutos_real: 500, tiene_largada: true, minutos_arranque: -10 })], [])
  chk('un arranque negativo cuenta 0', neg.arranque === 0 && neg.cierre === 40)
  const org = S.partesDelTurno([f], [{ turno_id: 'tx', inicio: '2026-10-01T12:00:00+00:00', fin: '2026-10-01T12:15:00+00:00', motivo: 'Se retiró personal', categoria: 'organizativa' }])
  chk('una parada organizativa va en su parte', org.organizativa === 15 && org.otro === 0)
  chk('la categoría organizativa se reconoce', S.categoriaDe({ categoria: 'organizativa' }) === 'organizativa')
  chk('una categoría desconocida es "otro"', S.categoriaDe({ categoria: 'rara' }) === 'otro' && S.categoriaDe({}) === 'otro')
  const cats = S.paradasPorCategoria([f, fila({ cats: { otro: 10, nueva: 5, falla: null } })])
  chk('la dona suma las paradas enteras por tipo', cats.falla === 30 && cats.programada === 80 && cats.otro === 15 && cats.organizativa === 0, JSON.stringify(cats))
  const cats2 = S.paradasPorCategoria([fila({ cats: { organizativa: 25, otro: 5 } })])
  chk('la dona tiene la categoría organizativa aparte', cats2.organizativa === 25 && cats2.otro === 5, JSON.stringify(cats2))
  const top = S.motivosTop([...paradas, { turno_id: 'tx', inicio: '2026-10-01T12:00:00+00:00', fin: '2026-10-01T12:10:00+00:00', motivo: '  se cortó la MASA ', categoria: 'falla' }], [f])
  chk('los motivos, de más a menos tiempo', top.map(x => x.motivo).join('|') === 'Limpieza|Se cortó la masa', top.map(x => x.motivo).join('|'))
  chk('el mismo motivo escrito distinto se junta', top[1].veces === 2 && top[1].minutos === 40)
  chk('las paradas de planillas de otro período no entran', !top.some(x => x.motivo === 'De otro período'))
  const muchos = S.motivosTop(Array.from({ length: 8 }, (_, i) => ({ turno_id: 'tx', inicio: '2026-10-01T11:00:00+00:00', fin: `2026-10-01T11:0${i + 1}:00+00:00`, motivo: `M${i}`, categoria: 'otro' })), [f])
  chk('a lo sumo 5 motivos', muchos.length === 5 && muchos[0].motivo === 'M7')
}

// ── La pantalla ──────────────────────────────────────────────────────────
{
  chk('cargando', S.htmlMaquinas({ cargando: true }).includes('Cargando…'))
  const err = S.htmlMaquinas({ error: '<img src=x onerror=1>' })
  chk('un error se dice, con Reintentar', err.includes('No se pudieron leer las planillas de las máquinas.') && err.includes('data-mq-reintentar'))
  chk('… escapado', !err.includes('<img') && err.includes('&lt;img'))
  const vacio = S.htmlMaquinas({ desde: '2026-10-01', hasta: '2026-10-04', gran: 'dia', filas: [], filasAntes: [], filasTendencia: [], paradas: [], colores: new Map() })
  chk('sin planillas: un mensaje con las fechas', vacio.includes('No hay planillas cerradas entre el 01/10/2026 y el 04/10/2026.'), vacio.slice(0, 300))
  chk('… y ninguna tarjeta ni gráfico del período', !vacio.includes('mq-tarjeta') && !vacio.includes('data-mq-graf="barras"') && !vacio.includes('data-mq-graf="dona"'))
  const filas = [fila({ maquina: 'Máq <b>1</b>', unidades: 2000, minutos_productivos: 600, minutos_turno: 600, en_marcha: 30, cats: { falla: 30 } }),
    fila({ maquina_id: 'm2', maquina: 'Máquina 2', maquina_orden: 2, unidades: 1000, minutos_productivos: 600 })]
  // Antes: 100 u/h productiva y 50 u/h del turno (para que las dos flechas digan cosas distintas).
  const antes = [fila({ unidades: 1000, minutos_productivos: 600, minutos_turno: 1200 })]
  const e = { desde: '2026-10-01', hasta: '2026-10-04', gran: 'semana', filas, filasAntes: antes, filasTendencia: filas, colores: S.coloresDeMaquinas(S.maquinasDe(filas)),
    paradas: [{ turno_id: filas[0].turno_id, inicio: '2026-10-01T10:00:00+00:00', fin: '2026-10-01T10:30:00+00:00', motivo: '<script>x</script>', categoria: 'falla' }] }
  const h = S.htmlMaquinas(e)
  chk('una tarjeta por máquina', (h.match(/<article class="mq-tarjeta"/g) || []).length === 2)
  chk('la variación de la u/h productiva (200 contra 100: ▲ +100 %)', /<dd class="mq-var pr-ind-mas">▲ \+100 %<\/dd>/.test(h), h.match(/mq-var[^>]*>[^<]+/g))
  chk('la variación de la u/h del turno (200 contra 50: ▲ +300 %)', /<dd class="mq-var pr-ind-mas">▲ \+300 %<\/dd>/.test(h), h.match(/mq-var[^>]*>[^<]+/g))
  chk('una máquina sin planillas antes lo dice', h.includes('sin planillas en el período anterior'))
  chk('los cuatro gráficos', ['barras', 'turno', 'dona', 'tendencia'].every(g => h.includes(`data-mq-graf="${g}"`)))
  chk('Día / Semana / Mes, con el elegido marcado', (h.match(/data-mq-gran=/g) || []).length === 3 && h.includes('data-mq-gran="semana" aria-pressed="true"'))
  chk('la tendencia dice qué abarca', h.includes('últimas 12 semanas'))
  chk('los motivos', h.includes('Los motivos que más tiempo se llevaron') && h.includes('30 min · 1 vez'))
  chk('el nombre de la máquina escapado', !h.includes('<b>1</b>') && h.includes('Máq &lt;b&gt;1&lt;/b&gt;'))
  chk('el motivo escapado', !h.includes('<script>') && h.includes('&lt;script&gt;'))
  chk('cada gráfico tiene dónde mostrar la cifra exacta', (h.match(/class="mq-graf__detalle"/g) || []).length >= 4)
  const sinPar = S.htmlMaquinas({ ...e, filas: [filas[1]], paradas: [] })
  chk('sin paradas en el período: lo dice, sin dona', sinPar.includes('Sin paradas en el período.') && !sinPar.includes('data-mq-graf="dona"'))
  const sinLeer = S.htmlMaquinas({ ...e, paradas: null, paradasError: 'sin red' })
  chk('sin poder leer las paradas: lo dice', sinLeer.includes('No se pudieron leer los motivos de las paradas: sin red.'))
  chk('… y la leyenda del turno dice "sin detalle"', sinLeer.includes('Paradas (sin detalle)'))
  chk('con las paradas leídas no hay "sin detalle"', !h.includes('Paradas (sin detalle)'))
  chk('la leyenda nombra solo lo que aparece (sin "Otra parada")', !h.includes('Otra parada') && h.includes('Parada por falla'))
  chk('parcial: avisa', S.htmlMaquinas({ ...e, parcial: true }).includes('Puede estar incompleto'))
}

// ── Leer v_turno_metricas y cargar ───────────────────────────────────────
esperas.push((async () => {
  // De a 1000, hasta que una página venga corta.
  let paginas = 0
  S.__respuestas.v_turno_metricas = (q) => { paginas++; const n = q.range[0] < 2000 ? 1000 : 5; return { data: Array.from({ length: n }, () => fila()), error: null } }
  const r = await S.leerMetricas('u-1', '2026-09-01', '2026-10-04')
  chk('lee de a 1000 hasta la página corta', r.filas.length === 2005 && paginas === 3 && !r.parcial, `${r.filas.length} ${paginas}`)
  const q = S.__consultas.find(c => c.tabla === 'v_turno_metricas')
  chk('filtra por la unidad y las fechas', JSON.stringify(q.filtros) === JSON.stringify([['eq', 'unidad_negocio_id', 'u-1'], ['gte', 'fecha', '2026-09-01'], ['lte', 'fecha', '2026-10-04']]), JSON.stringify(q.filtros))
  chk('pide las columnas que usa', ['unidades', 'minutos_productivos', 'minutos_turno', 'minutos_real', 'minutos_parada_en_marcha', 'parada_por_categoria', 'inicio_real', 'fin_real', 'fin_turno', 'turno_id', 'maquina_orden'].every(c => q.select.includes(c)))
  S.__respuestas.v_turno_metricas = () => ({ data: Array.from({ length: 1000 }, () => fila()), error: null })
  const tope = await S.leerMetricas('u-1', '2026-01-01', '2026-10-04')
  chk('más de 10 páginas: parcial', tope.parcial === true && tope.filas.length === 10000)
  S.__respuestas.v_turno_metricas = () => ({ data: null, error: { message: 'caída' } })
  let tiro = false
  try { await S.leerMetricas('u-1', '2026-01-01', '2026-10-04') } catch { tiro = true }
  chk('un error de la base se avisa (tira)', tiro)

  // Las paradas: de a 200 ids; si falla, no tira.
  S.__consultas.length = 0
  S.__respuestas.paradas_produccion = (q) => ({ data: q.filtros[0][2].map(id => ({ turno_id: id })), error: null })
  const ids = Array.from({ length: 450 }, (_, i) => 'x' + i)
  const par = await S.leerParadasDeTurnos(ids)
  chk('paradas de a 200 ids', par.paradas.length === 450 && S.__consultas.filter(c => c.tabla === 'paradas_produccion').length === 3)
  S.__respuestas.paradas_produccion = () => ({ data: null, error: { message: 'no' } })
  const mal = await S.leerParadasDeTurnos(['a'])
  chk('si las paradas fallan, no tira y lo dice', mal.paradas === null && mal.error === 'no')

  // cargarMaquinas: reparte período, anterior y tendencia.
  S.__elementos['pr-mq-desde'] = { value: '2026-10-01' }
  S.__elementos['pr-mq-hasta'] = { value: '2026-10-04' }
  S.estado.unidadId = 'u-1'
  S.estado.mqGran = 'dia'
  const todas = [fila({ fecha: '2026-10-02', turno_id: 'cur' }), fila({ fecha: '2026-09-28', turno_id: 'ant' }), fila({ fecha: '2026-09-10', turno_id: 'ten' })]
  S.__consultas.length = 0
  S.__respuestas.v_turno_metricas = () => ({ data: todas, error: null })
  S.__respuestas.paradas_produccion = () => ({ data: [], error: null })
  await S.cargarMaquinas()
  const m = S.estado.maquinas
  const deTurnos = (l) => l.map(f => f.turno_id).sort().join()
  chk('el período, el anterior y la tendencia', deTurnos(m.filas) === 'cur' && deTurnos(m.filasAntes) === 'ant' && deTurnos(m.filasTendencia) === 'ant,cur,ten',
    JSON.stringify([deTurnos(m.filas), deTurnos(m.filasAntes), deTurnos(m.filasTendencia)]))
  const qv = S.__consultas.find(c => c.tabla === 'v_turno_metricas')
  chk('lee desde lo más viejo que necesita (la tendencia: 05/09)', JSON.stringify(qv.filtros[1]) === JSON.stringify(['gte', 'fecha', '2026-09-05']), JSON.stringify(qv.filtros))
  const qp = S.__consultas.find(c => c.tabla === 'paradas_produccion')
  chk('las paradas solo de las planillas del período', JSON.stringify(qp.filtros[0][2]) === JSON.stringify(['cur']))
  chk('la sección se ve con una unidad', S.__elementos['pr-maquinas'].hidden === false)
  chk('y se pinta', S.__elementos['pr-mq-cuerpo'].innerHTML.includes('mq-tarjeta'))

  // Con turno: la respuesta vieja no pisa la nueva.
  // La primera lectura queda esperando; la segunda contesta enseguida.
  let soltar
  const espera = new Promise(r => { soltar = r })
  let llamada = 0
  S.__respuestas.v_turno_metricas = () => (++llamada === 1 ? espera : { data: [fila({ fecha: '2026-10-03', turno_id: 'nueva' })], error: null })
  const vieja = S.cargarMaquinas()
  await S.cargarMaquinas()
  soltar({ data: [fila({ fecha: '2026-10-03', turno_id: 'vieja' })], error: null })
  await vieja
  chk('una respuesta vieja no pisa la nueva', S.estado.maquinas.filas.map(f => f.turno_id).join() === 'nueva', S.estado.maquinas.filas.map(f => f.turno_id).join())
  // … tampoco un error viejo que llega tarde.
  let soltarError
  const esperaError = new Promise(r => { soltarError = r })
  let llamada2 = 0
  S.__respuestas.v_turno_metricas = () => (++llamada2 === 1 ? esperaError : { data: [fila({ fecha: '2026-10-03', turno_id: 'nueva2' })], error: null })
  const viejaError = S.cargarMaquinas()
  await S.cargarMaquinas()
  soltarError({ data: null, error: { message: 'error viejo' } })
  await viejaError
  chk('un error viejo no pisa la respuesta nueva', !S.estado.maquinas.error && S.estado.maquinas.filas.map(f => f.turno_id).join() === 'nueva2')

  // Un error se dice.
  S.__respuestas.v_turno_metricas = () => ({ data: null, error: { message: 'caída' } })
  await S.cargarMaquinas()
  chk('un error queda en el estado y se pinta', S.estado.maquinas.error === 'caída' && S.__elementos['pr-mq-cuerpo'].innerHTML.includes('data-mq-reintentar'))

  // Sin unidad: la sección se esconde.
  S.estado.unidadId = null
  await S.cargarMaquinas()
  chk('sin unidad la sección no se ve', S.__elementos['pr-maquinas'].hidden === true)
  S.estado.unidadId = 'u-1'

  // Un período al revés no consulta.
  S.__consultas.length = 0
  S.__elementos['pr-mq-desde'].value = '2026-10-05'
  await S.cargarMaquinas()
  chk('un período al revés no consulta', S.__consultas.length === 0)
  S.__elementos['pr-mq-desde'].value = '2026-10-01'

  // Día / Semana / Mes.
  S.__respuestas.v_turno_metricas = () => ({ data: [], error: null })
  S.cambiarGranularidad('mes')
  chk('cambiar a Mes', S.estado.mqGran === 'mes')
  S.cambiarGranularidad('año')
  chk('una granularidad desconocida no cambia nada', S.estado.mqGran === 'mes')
})())

// ── El HTML de la pantalla ───────────────────────────────────────────────
chk('la sección Máquinas está arriba de los indicadores del día', src.indexOf('id="pr-maquinas"') > 0 && src.indexOf('id="pr-maquinas"') < src.indexOf('id="pr-ind-dia"'))
chk('"¿Cómo se calcula?" plegable', /<details class="mq-como">\s*<summary>¿Cómo se calcula\?<\/summary>/.test(src))
chk('… dice que sin la hora de largada el calentamiento cuenta como productivo', /con el calentamiento incluido/.test(src) && /empezó a producir/.test(src))
chk('la vista se lee con minutos_arranque y tiene_largada', /from\('v_turno_metricas'\)\s*\.select\('[^']*minutos_arranque, tiene_largada'/.test(src))
chk('… dice que se pondera', /se suman las unidades y se suman las horas, y recién ahí se divide/.test(src))
chk('el período de las máquinas con el control (dos fechas obligatorias)', /crearPeriodo\(\{ desde: d, hasta: h, obligatorias: true \}\)/.test(src))
chk('arranca en "Este mes"', /const r = rangoDePeriodo\('mes', hoyArgentina\(\)\)/.test(src))
chk('los gráficos son del repo (js/graficos.js), sin CDN', /from '\.\.\/js\/graficos\.js'/.test(src) && !/<script[^>]+src="https?:[^"]*(chart|d3|apex|plotly)/i.test(src))
chk('las máquinas se leen al cambiar la unidad', /if \(estado\.maquinasUnidad !== estado\.unidadId\) \{ estado\.maquinasUnidad = estado\.unidadId; cargarMaquinas\(\) \}/.test(src))
chk('el rendimiento por kilo: barras contra el promedio, en su tarjeta', /data-rend-grupo=/.test(src) && /barrasConReferencia\(\{/.test(src) && /pintarGraficosRendimiento\(\)\n/.test(src))
chk('indicadores_produccion se sigue llamando igual', /supabase\.rpc\('indicadores_produccion', params\)/.test(src))

fin()
