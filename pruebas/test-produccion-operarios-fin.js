// Producción · los operarios cuando termina una planilla (08/10/2026).
//
// La BASE le pone `hasta` a todos los operarios de una planilla cuando sale de
// 'abierto' (trigger trg_turno_cierra_operarios sobre turnos_produccion; cerrar,
// forzar el cierre y relanzar con lote nuevo), y relanzar_con_lote_nuevo pasa a
// la planilla nueva solo a los que seguían (hasta IS NULL). Verificado con
// pg_get_functiondef el 08/10/2026.
//
// La pantalla tiene que decir lo mismo:
// - OCUPADO (Abrir turno, en gris "los que están ahora en otra máquina") =
//   `hasta` vacío Y su planilla 'abierto'. El operario de la planilla de la
//   MAÑANA, ya cerrada, se elige en el turno siguiente.
// - Un `hasta` vacío en una planilla que ya no está abierta (dato viejo) no
//   ocupa a nadie.
// - Las consultas piden las dos cosas (.eq('estado','abierto') y
//   .is('hasta', null)), y la pantalla las vuelve a mirar.
// - Adentro de UNA planilla: "adentro" = sin `hasta` y la planilla abierta; el
//   que salió sigue en la lista con su hora.
//
// Ejecuta el código REAL (sandbox-produccion.js con un Supabase falso).
//
//   node pruebas/test-produccion-operarios-fin.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// La planilla de la mañana CERRADA en la Máquina 1 (Ramón, con su salida); la
// de la tarde ABIERTA en la Máquina 2 (Marcos sigue, Lucía ya salió); una
// pendiente de completar en la Máquina 3 con un dato viejo (Mariela sin salida);
// y una abierta de OTRA fábrica (Pedro sin salida).
const TURNOS = [
  { id: 't-man', maquina_id: 'm1', unidad_negocio_id: 'u-cn', estado: 'cerrado', fecha: 'HOY', turno: 'Mañana', lote: 7001, encargado_id: 'e-fede', abierto_en: '2026-10-08T09:00:00Z' },
  { id: 't-tar', maquina_id: 'm2', unidad_negocio_id: 'u-cn', estado: 'abierto', fecha: 'HOY', turno: 'Tarde', lote: 7002, encargado_id: 'e-fede', abierto_en: '2026-10-08T21:00:00Z' },
  { id: 't-vie', maquina_id: 'm3', unidad_negocio_id: 'u-cn', estado: 'pendiente_completar', fecha: 'HOY', turno: 'Mañana', lote: 7003, encargado_id: 'e-fede', abierto_en: '2026-10-08T09:00:00Z' },
  { id: 't-dp', maquina_id: 'm9', unidad_negocio_id: 'u-dp', estado: 'abierto', fecha: 'HOY', turno: 'Tarde', lote: 9001, encargado_id: 'e-x', abierto_en: '2026-10-08T21:00:00Z' },
]
const OPS = [
  { turno_id: 't-man', empleado_id: 'e-ramon', desde: '2026-10-08T09:00:00Z', hasta: '2026-10-08T21:00:00Z' },
  { turno_id: 't-tar', empleado_id: 'e-marcos', desde: '2026-10-08T21:00:00Z', hasta: null },
  { turno_id: 't-tar', empleado_id: 'e-lucia', desde: '2026-10-08T21:00:00Z', hasta: '2026-10-08T22:00:00Z' },
  { turno_id: 't-vie', empleado_id: 'e-mariela', desde: '2026-10-08T09:00:00Z', hasta: null },
  { turno_id: 't-dp', empleado_id: 'e-pedro', desde: '2026-10-08T21:00:00Z', hasta: null },
]

// Un Supabase que APLICA los filtros (como la base) o que los IGNORA (para
// ver que la pantalla los vuelve a mirar).
function filtrar(filas, filtros, honrar) {
  if (!honrar) return filas
  return filas.filter(f => filtros.every(([op, a, b]) => {
    if (op === 'eq') return f[a] === b
    if (op === 'in') return b.includes(f[a])
    if (op === 'is') return b === null ? f[a] == null : f[a] === b
    return true
  }))
}

function armar({ honrar = true } = {}) {
  const S = construirProduccion(ARCHIVO)
  const hoy = S.hoyArgentina()
  const turnos = TURNOS.map(t => ({ ...t, fecha: hoy }))
  S.__tablas.maquinas = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }, { id: 'm3', nombre: 'Máquina 3', orden: 3 }]
  S.__tablas.turnos_produccion = (f) => ({ data: filtrar(turnos, f, honrar), error: null })
  S.__tablas.turno_operarios = (f) => ({ data: filtrar(OPS, f, honrar), error: null })
  S.__tablas.masas = []
  S.__tablas.paradas_produccion = []
  S.__tablas.produccion_items = []
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [
    { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'] },
    { id: 'e-ramon', nombre: 'Ramón Díaz', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-marcos', nombre: 'Marcos Vera', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-lucia', nombre: 'Lucía Paz', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-mariela', nombre: 'Mariela Soto', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-pedro', nombre: 'Pedro Gil', misma_unidad: true, puestos: ['operario'] },
  ]
  return S
}

const nombres = new Map([['m1', 'Máquina 1'], ['m2', 'Máquina 2'], ['m3', 'Máquina 3']])

// ── leerOcupadosYRecientes, directo ──────────────────────────────────────
for (const honrar of [true, false]) {
  esperas.push((async () => {
    const S = armar({ honrar })
    const como = honrar ? 'base que filtra' : 'base que no filtra'
    const r = await S.leerOcupadosYRecientes('u-cn', ['m1', 'm3'], nombres)
    chk(`[${como}] el de la planilla de la mañana CERRADA no está ocupado`, !r.ocupados.has('e-ramon'), [...r.ocupados.keys()].join())
    chk(`[${como}] el que sigue (sin hasta) en la planilla ABIERTA está ocupado y dice dónde`, r.ocupados.get('e-marcos') === 'en Máquina 2', r.ocupados.get('e-marcos'))
    chk(`[${como}] el que ya salió de la planilla abierta no está ocupado`, !r.ocupados.has('e-lucia'))
    chk(`[${como}] un dato viejo (sin hasta en una planilla que no está abierta) no ocupa a nadie`, !r.ocupados.has('e-mariela'))
    chk(`[${como}] la gente de otra fábrica no cuenta`, !r.ocupados.has('e-pedro'))
    chk(`[${como}] el de la mañana cuenta como "trabajó hace poco" en su máquina`, r.recientes.get('m1')?.has('e-ramon') === true)

    if (honrar) {
      const cons = S.__llamadas.consultas
      const tp = cons.find(([t, f]) => t === 'turnos_produccion' && f.some(x => x[0] === 'eq' && x[1] === 'estado' && x[2] === 'abierto'))
      chk('lee los turnos ABIERTOS de esa fábrica en la base', !!tp &&
        tp[1].some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === 'u-cn') &&
        tp[1].some(x => x[0] === 'select' && /\bestado\b/.test(x[1])), JSON.stringify(tp))
      const to = cons.find(([t, f]) => t === 'turno_operarios' && f.some(x => x[0] === 'is'))
      chk('pide los operarios SIN hora de salida (.is(hasta, null))', !!to && to[1].some(x => x[0] === 'is' && x[1] === 'hasta' && x[2] === null), JSON.stringify(to))
      chk('… solo de los turnos abiertos', !!to && JSON.stringify(to[1].find(x => x[0] === 'in')) === JSON.stringify(['in', 'turno_id', ['t-tar']]), JSON.stringify(to))
    }
  })())
}

// Una máquina sin nombre conocido igual dice algo.
esperas.push((async () => {
  const S = armar()
  const r = await S.leerOcupadosYRecientes('u-cn', [])
  chk('sin el nombre de la máquina, dice "en otra máquina"', r.ocupados.get('e-marcos') === 'en otra máquina', r.ocupados.get('e-marcos'))
})())

// Si la lectura falla, nadie queda ocupado (no se inventa).
esperas.push((async () => {
  const S = armar()
  S.__tablas.turnos_produccion = () => ({ data: null, error: { message: 'sin red' } })
  const r = await S.leerOcupadosYRecientes('u-cn', ['m1'], nombres)
  chk('si la base no contesta, nadie aparece ocupado', r.ocupados.size === 0)
})())

// ── Abrir turno, de punta a punta ────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.mostrarTablero()
  await S.mostrarAbrir('m1')
  const form = S.estado.abrir
  const i = form.filas.findIndex(f => f.maquinaId === 'm1')
  chk('Abrir turno ofrece la Máquina 1 (su planilla de la mañana está cerrada)', i >= 0 && form.filas[i].elegida === true, JSON.stringify(form.filas.map(f => f.maquinaId)))
  const html = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('el operario de la mañana se puede elegir (no está apagado)',
    new RegExp(`data-toggle-op="${i}" data-op-id="e-ramon" aria-pressed="false">`).test(html), html.slice(0, 400))
  chk('… y no dice que está en otra máquina', !/Ramón Díaz<\/span><span class="pr-op-tag__nota">/.test(html))
  chk('el que sigue en la Máquina 2 aparece apagado y dice dónde',
    new RegExp(`data-op-id="e-marcos" aria-pressed="false" disabled>[\\s\\S]*?Marcos Vera</span><span class="pr-op-tag__nota">en Máquina 2</span>`).test(html))
  chk('el del dato viejo se puede elegir', new RegExp(`data-op-id="e-mariela" aria-pressed="false">`).test(html))
  chk('el rótulo dice AHORA y no "hoy"', /LOS QUE ESTÁN AHORA EN OTRA MÁQUINA/.test(html) && !/OTRA MÁQUINA HOY/.test(html))
  // Sin "trabajaron hace poco" el rótulo es otro: también dice AHORA.
  const sinRecientes = S.htmlTagsOperarios(form.filas[i], i, S.estado.operarios, { ...form, recientes: new Map() })
  chk('… también sin "trabajaron hace poco"', /OPERARIOS · EN GRIS, LOS QUE ESTÁN AHORA EN OTRA MÁQUINA/.test(sinRecientes) && !/OTRA MÁQUINA HOY/.test(sinRecientes), sinRecientes.slice(0, 200))
  S.agregarOperarioFila(i, 'e-ramon')
  const p = S.parametrosAbrirTurnos(S.estado.abrir, S.estado.abrir.fecha, 'e-fede')
  chk('elegido, viaja a abrir_turnos con su máquina', JSON.stringify(p.p_maquinas.find(m => m.maquina_id === 'm1')?.operarios) === '["e-ramon"]', JSON.stringify(p))
})())

// ── Adentro de una planilla ──────────────────────────────────────────────
{
  const S = armar()
  const ops = [
    { empleado_id: 'e-marcos', desde: '2026-10-08T21:00:00Z', hasta: null },
    { empleado_id: 'e-lucia', desde: '2026-10-08T21:00:00Z', hasta: '2026-10-08T22:00:00Z' },
  ]
  chk('operarioAdentro: sin hasta y planilla abierta → adentro', S.operarioAdentro(ops[0], { estado: 'abierto' }) === true)
  chk('operarioAdentro: con hasta → afuera', S.operarioAdentro(ops[1], { estado: 'abierto' }) === false)
  chk('operarioAdentro: sin hasta pero la planilla no está abierta → afuera',
    S.operarioAdentro(ops[0], { estado: 'pendiente_completar' }) === false && S.operarioAdentro(ops[0], { estado: 'cerrado' }) === false)
  chk('operarioAdentro: la planilla en pantalla sin estado leído se toma como abierta', S.operarioAdentro(ops[0], {}) === true)

  const abierta = S.htmlOperariosPlanilla({ turno: { id: 't-tar', estado: 'abierto' }, operarios: ops }, { buscando: false, busqueda: '' }, S.estado.personal)
  chk('planilla abierta: el que sigue tiene su chip para sacarlo', /data-op-id="e-marcos"|Marcos Vera/.test(abierta) && !/Marcos Vera · /.test(abierta), abierta)
  chk('planilla abierta: el que salió dice a qué hora', /Lucía Paz · salió 19:00/.test(abierta), abierta)

  const pendiente = S.htmlOperariosPlanilla({ turno: { id: 't-vie', estado: 'pendiente_completar' }, operarios: ops }, { buscando: false, busqueda: '' }, S.estado.personal)
  chk('planilla que no está abierta: nadie queda adentro (sin hasta → "sin hora de salida")',
    /pr-chip-op--fuera">Marcos Vera · sin hora de salida</.test(pendiente) && /Lucía Paz · salió 19:00/.test(pendiente), pendiente)
  chk('… y a nadie se le ofrece la × para sacarlo', !/data-quitar-op/.test(pendiente), pendiente)
  chk('en la abierta, al que sigue sí', /data-quitar-op="[^"]*" data-op-id="e-marcos"/.test(abierta), abierta)

  const resumen = S.htmlOpsResumen({ turno: { encargado_id: 'e-fede', estado: 'pendiente_completar' }, operarios: ops })
  chk('el resumen de una planilla no abierta solo cuenta al encargado', /pr-res__cuenta">1</.test(resumen) && !/Marcos Vera/.test(resumen), resumen)
  const resumenAb = S.htmlOpsResumen({ turno: { encargado_id: 'e-fede', estado: 'abierto' }, operarios: ops })
  chk('el resumen de una planilla abierta cuenta al que sigue', /pr-res__cuenta">2</.test(resumenAb) && /Marcos Vera/.test(resumenAb), resumenAb)
}

fin()
