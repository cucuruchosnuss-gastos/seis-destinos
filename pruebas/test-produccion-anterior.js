// SALA DE MASA — el botón "Anterior (última)" (30/09/2026, pedido de Facu).
// Decía "igual a la 2" y confundía: la masa anterior puede ser de otro turno o
// de ayer. Ahora dice "Anterior (última)" y, debajo y en chico, CUÁNDO fue:
//   "Masa 2 · hoy 10:40"          (hoy, con la hora de Argentina)
//   "Masa 5 · ayer, turno Tarde"  (ayer, con el turno de ese lote)
//   "Masa 3 · 28/09"              (antes)
// y el title dice "La última masa de esta máquina, del turno que sea".
//
// Y tres ajustes más de la sala, probados por Facu en la tablet real:
//  1. Registrar NO mueve la receta: la confirmación va EN el botón (naranja
//     pálido "Registrando masa…", verde "Masa 8 registrada ✓" 2,5 s, y de
//     nuevo "Registrar masa"); sin señal, "Masa N guardada en la tablet". Ya
//     no hay banda verde arriba de la receta.
//  2. Los segmentos (Simple/Doble, Original/Anterior/Modificar) en UNA fila de
//     alto fijo; el detalle de "Anterior" en una línea con "…", y el
//     "· chocolate" nunca se corta.
//  3. Pasar a chocolate ya es el motivo: con Modificar, si la masa de partida
//     no era de chocolate y la que se registra sí, no se pide motivo y viaja
//     "Pasada a chocolate" (registrar_masa lo guarda por p_motivo).
//
// Contrato con la base (pg_get_functiondef, 30/09/2026): datos_para_masa trae
// en 'anterior' {masa_id, lote, nro, hora, doble, fecha_turno, es_de_hoy,
// es_chocolate, items} —la hora sí, el turno (Mañana/Tarde/Noche) NO—. El
// turno se lee de turnos_produccion por el lote (UNIQUE turnos_produccion_
// lote_key), solo cuando fue ayer. Si esa lectura falla: "ayer" a secas. Sin
// hora: "Masa N" sin cuándo. Nunca se inventa.
//
//   node pruebas/test-produccion-anterior.js

process.env.TZ = 'UTC'

const path = require('path')
const { execSync } = require('child_process')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')
const { extraerFn } = require('./extraer')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Baseline FIJO: el commit anterior al cambio, donde el botón decía "igual a la N".
const BASE = 'f140a30'
const RAIZ = path.join(__dirname, '..')

const copia = (x) => JSON.parse(JSON.stringify(x))

// ── Fechas: "hoy" de la prueba es el de Argentina en el momento de correrla ──
function isoArDia(desplazamientoDias) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = p.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + desplazamientoDias)).toISOString().slice(0, 10)
}
// 12:00 de Argentina (15:00 UTC) de ese día.
const mediodiaAr = (dias) => `${isoArDia(dias)}T15:00:00Z`
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

const RECETA = { receta_id: 'r1', version: 1, items: [
  { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
] }
const anterior = (extra) => ({
  masa_id: 'mA', lote: 7022, nro: 2, hora: mediodiaAr(0), doble: false,
  fecha_turno: isoArDia(0), es_de_hoy: true, es_chocolate: false,
  items: [{ ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10 }],
  ...extra,
})
const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }]
const TURNOS = [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: isoArDia(0), turno: 'Mañana', encargado_id: 'e1', abierto_en: null }]
const tiene = (f, tipo, col, val) => f.some(x => x[0] === tipo && x[1] === col && (val === undefined || x[2] === val))

function armar({ ant, turnoLote = 'Tarde', turnoError = null, registrar = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Agustín Barrera', puesto: 'masero' }
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS,
    turnos_produccion: (f) => {
      if (tiene(f, 'eq', 'lote')) return turnoError ? { data: null, error: turnoError } : { data: [{ turno: turnoLote }], error: null }
      return { data: TURNOS, error: null }
    },
    paradas_produccion: [],
    produccion_items: [],
    masas: (f) => tiene(f, 'eq', 'id')
      ? { data: [{ id: 'mA', receta_id: 'r1' }], error: null }
      : { data: [{ turno_id: 't1', hora: mediodiaAr(0), anulada: false }], error: null },
    recetas: [{ tipo_masa: 'Común' }],
    receta_items: [],
    ingredientes: [{ id: 'i-agua', define_chocolate: false }],
  })
  S.__setRpc(async (n) => {
    if (n === 'stock_para_masa') return { data: [], error: null }
    if (n === 'datos_para_masa') return { data: copia({ original: RECETA, anterior: ant ?? null, insumos: [] }), error: null }
    if (n === 'registrar_masa') return registrar ? registrar() : { data: { masa_id: 'm8', nro: 8, origen: 'anterior', lote: 7023, hora: mediodiaAr(0) }, error: null }
    return { data: null, error: null }
  })
  return S
}
async function receta(S) { await S.mostrarSala(); await S.elegirMaquinaSala('t1'); return S }
const botonAnterior = (S) => {
  const h = S.__doc.getElementById('pr-receta-opciones').innerHTML
  const i = h.indexOf('data-base="anterior"')
  const ini = h.lastIndexOf('<button', i)
  return h.slice(ini, h.indexOf('</button>', i) + 9)
}
const consultasLote = (S) => S.__llamadas.consultas.filter(([t, f]) => t === 'turnos_produccion' && tiene(f, 'eq', 'lote'))

esperas.push((async () => {
  // ── La función pura, en hora de Argentina (la suite corre en UTC) ──
  const X = construirProduccion(ARCHIVO)
  const AHORA = new Date('2026-09-30T15:00:00Z') // 30/09 12:00 en Argentina
  chk('hoy: "hoy HH:MM" en hora de Argentina', X.cuandoFueLaAnterior({ hora: '2026-09-30T13:40:00Z' }, AHORA) === 'hoy 10:40', X.cuandoFueLaAnterior({ hora: '2026-09-30T13:40:00Z' }, AHORA))
  chk('hoy a las 00:30 de Argentina (03:30 UTC) sigue siendo hoy', X.cuandoFueLaAnterior({ hora: '2026-09-30T03:30:00Z' }, AHORA) === 'hoy 00:30')
  chk('las 23:30 del 29 en Argentina (02:30 UTC del 30) es AYER, no hoy', X.cuandoFueLaAnterior({ hora: '2026-09-30T02:30:00Z', turno_nombre: 'Noche' }, AHORA) === 'ayer, turno Noche',
    X.cuandoFueLaAnterior({ hora: '2026-09-30T02:30:00Z', turno_nombre: 'Noche' }, AHORA))
  chk('ayer con turno: "ayer, turno Tarde"', X.cuandoFueLaAnterior({ hora: '2026-09-29T18:00:00Z', turno_nombre: 'Tarde' }, AHORA) === 'ayer, turno Tarde')
  chk('ayer sin turno leído: "ayer" a secas (no se inventa)', X.cuandoFueLaAnterior({ hora: '2026-09-29T18:00:00Z', turno_nombre: null }, AHORA) === 'ayer')
  chk('antes: "dd/mm" del día de Argentina', X.cuandoFueLaAnterior({ hora: '2026-09-28T12:00:00Z' }, AHORA) === '28/09')
  chk('antes, a las 22 de Argentina del 27 (01 UTC del 28): 27/09', X.cuandoFueLaAnterior({ hora: '2026-09-28T01:00:00Z' }, AHORA) === '27/09')
  chk('cambio de mes: el 1/10 a la mañana, el 30/09 es ayer', X.cuandoFueLaAnterior({ hora: '2026-09-30T20:00:00Z', turno_nombre: 'Tarde' }, new Date('2026-10-01T12:00:00Z')) === 'ayer, turno Tarde')
  chk('sin hora: no dice cuándo', X.cuandoFueLaAnterior({ hora: null }, AHORA) === '' && X.cuandoFueLaAnterior({ hora: '' }, AHORA) === '' && X.cuandoFueLaAnterior({}, AHORA) === '')
  chk('hora ilegible: no dice cuándo (nunca "NaN")', X.cuandoFueLaAnterior({ hora: 'no-es-fecha' }, AHORA) === '')
  chk('diaDeLaMasa: hoy / ayer / antes / null', X.diaDeLaMasa('2026-09-30T13:00:00Z', AHORA) === 'hoy' && X.diaDeLaMasa('2026-09-29T13:00:00Z', AHORA) === 'ayer' &&
    X.diaDeLaMasa('2026-09-20T13:00:00Z', AHORA) === 'antes' && X.diaDeLaMasa(null, AHORA) === null)

  // ── El detalle corto y el title ──
  const dHoy = { anterior: { nro: 2, hora: '2026-09-30T13:40:00Z', es_de_hoy: true }, original: RECETA }
  chk('corto hoy: "Masa 2 · hoy 10:40"', X.detalleAnteriorCorto(dHoy, AHORA) === '<span class="pr-como__cuando">Masa 2 · hoy 10:40</span>', X.detalleAnteriorCorto(dHoy, AHORA))
  const dAyer = { anterior: { nro: 5, hora: '2026-09-29T18:00:00Z', turno_nombre: 'Tarde', es_de_hoy: false }, original: RECETA }
  chk('corto ayer: "Masa 5 · ayer, turno Tarde"', X.textoDeHtml(X.detalleAnteriorCorto(dAyer, AHORA)) === 'Masa 5 · ayer, turno Tarde', X.detalleAnteriorCorto(dAyer, AHORA))
  const dAntes = { anterior: { nro: 3, hora: '2026-09-28T12:00:00Z', es_de_hoy: false }, original: RECETA }
  chk('corto antes: "Masa 3 · 28/09"', X.textoDeHtml(X.detalleAnteriorCorto(dAntes, AHORA)) === 'Masa 3 · 28/09')
  const dSin = { anterior: { nro: 3, hora: null, es_de_hoy: false }, original: RECETA }
  chk('corto sin hora: "Masa 3" solo', X.textoDeHtml(X.detalleAnteriorCorto(dSin, AHORA)) === 'Masa 3', X.detalleAnteriorCorto(dSin, AHORA))
  chk('corto: ya no dice "igual a la"', !/igual a la/i.test(X.detalleAnteriorCorto(dHoy, AHORA) + X.detalleAnteriorCorto(dAyer, AHORA)))
  chk('corto: chocolate sigue diciéndose antes de copiarla, corto ("· chocolate")', /<span class="pr-como__cuando">Masa 2 · hoy 10:40<\/span> <span class="pr-como__choco">· chocolate</.test(X.detalleAnteriorCorto({ anterior: { ...dHoy.anterior, es_chocolate: true }, original: RECETA }, AHORA)))
  chk('sin anterior: "no hay"', X.detalleAnteriorCorto({ anterior: null }, AHORA) === 'no hay')
  const largo = X.textoDeHtml(X.detalleAnterior({ anterior: { ...dAyer.anterior, items: [] }, original: { ...RECETA, items: [] } }, AHORA))
  chk('title: "La última masa de esta máquina, del turno que sea: masa 5, ayer, turno Tarde"',
    largo.startsWith('La última masa de esta máquina, del turno que sea: masa 5, ayer, turno Tarde'), largo)
  const largoSin = X.textoDeHtml(X.detalleAnterior({ anterior: { ...dSin.anterior, items: [] }, original: { ...RECETA, items: [] } }, AHORA))
  chk('title sin hora: no inventa cuándo', largoSin.startsWith('La última masa de esta máquina, del turno que sea: masa 3 ·') || largoSin.startsWith('La última masa de esta máquina, del turno que sea: masa 3'), largoSin)
  chk('title sin hora: sin "hoy" ni "ayer" ni fecha', !/hoy|ayer|\d\d\/\d\d/.test(largoSin.split(' · ')[0]), largoSin)

  // ── El escape ──
  const malos = { anterior: { nro: marca('nro'), hora: '2026-09-29T18:00:00Z', turno_nombre: marca('turno'), lote: marca('lote'), es_de_hoy: false, items: [] }, original: { ...RECETA, items: [] } }
  chequearMarcas(chk, 'detalle corto con datos malos', X.detalleAnteriorCorto(malos, AHORA), ['nro', 'turno'])
  chequearMarcas(chk, 'detalle largo con datos malos', X.detalleAnterior(malos, AHORA), ['nro', 'turno', 'lote'])

  // ── En la pantalla: hoy ──
  const H = await receta(armar({ ant: anterior({ hora: mediodiaAr(0) }) }))
  const bh = botonAnterior(H)
  chk('el rótulo grande dice "Anterior (última)"', /<span class="pr-como__titulo">Anterior \(última\)<\/span>/.test(bh), bh)
  chk('debajo, en chico: "Masa 2 · hoy 12:00"', /<span class="pr-como__detalle"><span class="pr-como__cuando">Masa 2 · hoy 12:00<\/span><\/span>/.test(bh), bh)
  chk('el detalle va DEBAJO (botón apilado)', /class="pr-como pr-como--apilado"/.test(bh))
  chk('title: "La última masa de esta máquina, del turno que sea"', /title="La última masa de esta máquina, del turno que sea: masa 2, hoy 12:00/.test(bh), bh)
  chk('hoy: NO se lee el turno (no hace falta)', consultasLote(H).length === 0)

  // ── Ayer, con el turno de ese lote ──
  const A = await receta(armar({ ant: anterior({ nro: 5, hora: mediodiaAr(-1), es_de_hoy: false, lote: 7011 }), turnoLote: 'Tarde' }))
  const ba = botonAnterior(A)
  chk('ayer: "Masa 5 · ayer, turno Tarde"', /pr-como__cuando">Masa 5 · ayer, turno Tarde</.test(ba), ba)
  chk('el turno se lee por el LOTE de la anterior', consultasLote(A).length >= 1 && consultasLote(A).every(([, f]) => tiene(f, 'eq', 'lote', 7011)), JSON.stringify(consultasLote(A)))
  chk('… pidiendo solo la columna turno', consultasLote(A).every(([, f]) => (f.find(x => x[0] === 'select') ?? [])[1] === 'turno'))
  chk('… y queda en la anterior', A.estado.datosMasa.anterior.turno_nombre === 'Tarde')

  // ── Ayer, sin poder leer el turno ──
  const E = await receta(armar({ ant: anterior({ nro: 5, hora: mediodiaAr(-1), es_de_hoy: false }), turnoError: { message: 'sin red' } }))
  const be = botonAnterior(E)
  chk('si el turno no se puede leer: "Masa 5 · ayer" (sin inventar el turno)', /pr-como__cuando">Masa 5 · ayer</.test(be), be)
  chk('… y la receta abre igual', !!E.estado.masa && E.estado.vista === 'pr-receta', E.estado.vista)

  // ── Antes ──
  const V = await receta(armar({ ant: anterior({ nro: 3, hora: mediodiaAr(-5), es_de_hoy: false }) }))
  chk('antes: "Masa 3 · dd/mm"', new RegExp(`pr-como__cuando">Masa 3 · ${ddmm(isoArDia(-5)).replace('/', '\\/')}<`).test(botonAnterior(V)), botonAnterior(V))
  chk('antes: NO se lee el turno', consultasLote(V).length === 0)

  // ── Sin hora ──
  const N = await receta(armar({ ant: anterior({ nro: 3, hora: null, es_de_hoy: false }) }))
  chk('sin hora: "Masa 3" y nada más', /pr-como__cuando">Masa 3</.test(botonAnterior(N)), botonAnterior(N))

  // ── Sin masa anterior: como antes ──
  const S0 = await receta(armar({ ant: null }))
  const b0 = botonAnterior(S0)
  chk('sin anterior: "Anterior" deshabilitado con "no hay", sin apilar', /disabled/.test(b0) && />Anterior<\/span>/.test(b0) && /pr-como__detalle">no hay</.test(b0) && !/pr-como--apilado/.test(b0), b0)

  // ── El turno escapado en la pantalla ──
  const M = await receta(armar({ ant: anterior({ nro: 5, hora: mediodiaAr(-1), es_de_hoy: false }), turnoLote: '<b data-xss="turno">' }))
  const bm = botonAnterior(M)
  chk('el turno de la base va escapado en el botón', !/<b data-xss="turno">/.test(bm) && /&lt;b data-xss=&quot;turno&quot;&gt;/.test(bm), bm)

  // ── El CSS: apilado, en una fila y de alto fijo (punto 2) ──
  const regla = (sel) => { const m = FUENTE.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : '' }
  chk('CSS: .pr-como--apilado en columna', /flex-direction: column/.test(regla('.pr-como--apilado')))
  chk('CSS: los segmentos en UNA fila (nowrap)', /flex-wrap: nowrap/.test(regla('.pr-receta__opciones')), regla('.pr-receta__opciones'))
  chk('CSS: "Anterior" de alto fijo (40px) y que se achica', /height: 40px/.test(regla('.pr-como--apilado')) && /min-width: 0/.test(regla('.pr-como--apilado')) && /flex-shrink: 1/.test(regla('.pr-como--apilado')))
  const det = regla('.pr-como--apilado .pr-como__detalle')
  const cua = regla('.pr-como--apilado .pr-como__cuando')
  chk('CSS: el detalle en una línea', /white-space: nowrap/.test(det) && /overflow: hidden/.test(det), det)
  chk('CSS: qué masa y cuándo, cortado con "…"', /text-overflow: ellipsis/.test(cua) && /min-width: 0/.test(cua), cua)
  chk('CSS: el "· chocolate" nunca se corta', /flex-shrink: 0/.test(regla('.pr-como--apilado .pr-como__choco')))
  chk('CSS: el grupo Original/Anterior/Modificar se puede achicar', /flex-shrink: 1/.test(regla('.pr-receta__comos')))

  // ── El botón Registrar dice el estado sin mover nada (punto 1) ──
  chk('ya no existe la banda verde que empujaba la receta', !/id="pr-sala-exito"/.test(FUENTE) && !/BandaExito/.test(FUENTE))
  const reg = regla('.pr-receta__registrar')
  chk('CSS: el botón de alto fijo y en una línea', /height: var\(--p-prim\)/.test(reg) && /white-space: nowrap/.test(reg) && /text-overflow: ellipsis/.test(reg), reg)
  chk('CSS: guardando en naranja pálido', /background: var\(--p-acento-suave\)/.test(FUENTE.match(/\.pr-receta__registrar--guardando[^{]*\{([^}]*)\}/)?.[1] ?? ''))
  chk('CSS: registrada en verde', /background: var\(--p-bien\)/.test(FUENTE.match(/\.pr-receta__registrar--ok[^{]*\{([^}]*)\}/)?.[1] ?? ''))
  let soltar
  const G = await receta(armar({ ant: anterior(), registrar: () => new Promise(r => { soltar = r }) }))
  const btn = G.__doc.getElementById('pr-receta-registrar')
  chk('antes: "Registrar masa 2"', btn.textContent === 'Registrar masa 2' && btn.disabled === false, btn.textContent)
  const envio = G.registrarMasa()
  await new Promise(r => setTimeout(r, 0))
  chk('mientras guarda: "Registrando masa…" y trabado', btn.textContent === 'Registrando masa…' && btn.disabled === true, btn.textContent)
  soltar({ data: { masa_id: 'm8', nro: 8, origen: 'anterior', lote: 7023, hora: mediodiaAr(0) }, error: null })
  await envio
  chk('guardada: "Masa 8 registrada ✓" (el número que devolvió la base)', btn.textContent === 'Masa 8 registrada ✓', btn.textContent)
  chk('… trabado mientras lo dice', btn.disabled === true)
  chk('… el detalle va en el title, no en una leyenda', /lote 7023/.test(btn.title), btn.title)
  chk('… dura 2,5 segundos', G.MS_BOTON_REGISTRADA === 2500)
  G.ocultarRegistrada()
  chk('y vuelve a "Registrar masa 9" para la siguiente', btn.textContent === 'Registrar masa 9' && btn.disabled === false && btn.title === '', btn.textContent)
  // Sin señal: queda guardada en la tablet, dicho en el mismo botón.
  const R = await receta(armar({ ant: anterior(), registrar: () => ({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' } }) }))
  await R.registrarMasa()
  const btnR = R.__doc.getElementById('pr-receta-registrar')
  chk('sin señal: el botón dice "Masa 2 guardada en la tablet"', btnR.textContent === 'Masa 2 guardada en la tablet', btnR.textContent)
  chk('… y en el title que no la cargue de nuevo', /No la cargues de nuevo/.test(btnR.title), btnR.title)
  const relojes = R.__timeouts.filter(([, ms]) => ms === 2500)
  chk('… con un reloj de 2,5 segundos puesto', relojes.length >= 1, R.__timeouts.map(([, ms]) => ms))
  if (relojes.length) relojes[relojes.length - 1][0]()
  chk('… que al vencer lo vuelve SOLO a "Registrar masa 3"', btnR.textContent === 'Registrar masa 3' && btnR.disabled === false, btnR.textContent)
  // Un rechazo de la base no se tapa con el verde.
  const X2 = await receta(armar({ ant: anterior(), registrar: () => ({ data: null, error: { message: 'La receta cambió.', code: 'P0001' } }) }))
  await X2.registrarMasa()
  chk('un rechazo: el botón vuelve a "Registrar masa" y el error va pegado', X2.__doc.getElementById('pr-receta-registrar').textContent === 'Registrar masa 2' &&
    X2.__doc.getElementById('pr-receta-error').textContent === 'La receta cambió.', X2.__doc.getElementById('pr-receta-registrar').textContent)

  // ── Pasar a chocolate no pide motivo (punto 3) ──
  const C = construirProduccion(ARCHIVO)
  const DEF = new Set(['i-cacao'])
  C.estado.defineChocolate = DEF
  const RECETA_C = { receta_id: 'r1', version: 1, items: [
    { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
    { ingrediente_id: 'i-color', ingrediente: 'Colorante', orden: 2, descuenta_stock: false, cantidad_kg: 0.05, insumo_preferido_id: null },
    { ingrediente_id: 'i-cacao', ingrediente: 'Cacao', orden: 3, descuenta_stock: false, cantidad_kg: 0, insumo_preferido_id: null },
  ] }
  const DATOS_C = { original: RECETA_C, anterior: null, insumos: [] }
  const masaC = (extra) => ({ client_uuid: 'u1', turnoId: 't1', tipo: 'Común', doble: false, como: 'modificar', partida: 'original', motivo: '', otros: [], lotes: {}, agregados: ['i-cacao'],
    base: { 'i-agua': 10, 'i-color': 0.05, 'i-cacao': 0 }, cantidades: { 'i-agua': 10, 'i-color': 0.05, 'i-cacao': 0.6 }, ...extra })
  const pideMotivo = (b) => C.faltanParaRegistrar(b, DATOS_C).some(t => /por qué la modificás/.test(t))
  chk('común → chocolate: NO pide motivo', !pideMotivo(masaC()), C.faltanParaRegistrar(masaC(), DATOS_C))
  chk('… aunque además se hayan tocado otros ingredientes', !pideMotivo(masaC({ cantidades: { 'i-agua': 9, 'i-color': 0.08, 'i-cacao': 0.6 } })))
  chk('… y viaja "Pasada a chocolate"', C.parametrosRegistrarMasa(masaC(), DATOS_C, 'e').p_motivo === 'Pasada a chocolate', C.parametrosRegistrarMasa(masaC(), DATOS_C, 'e').p_motivo)
  chk('… si igual escribió un motivo, viaja el suyo', C.parametrosRegistrarMasa(masaC({ motivo: '  más oscura ' }), DATOS_C, 'e').p_motivo === 'más oscura')
  chk('… pasaAChocolate lo dice', C.pasaAChocolate(masaC(), DEF) === true)
  const deChoco = masaC({ partida: 'anterior', base: { 'i-agua': 10, 'i-color': 0.05, 'i-cacao': 0.6 }, cantidades: { 'i-agua': 10, 'i-color': 0.05, 'i-cacao': 0.7 } })
  chk('partida YA de chocolate y se modifica: SÍ pide motivo', pideMotivo(deChoco) && C.pasaAChocolate(deChoco, DEF) === false)
  chk('… y sin motivo no viaja "Pasada a chocolate"', C.parametrosRegistrarMasa(deChoco, DATOS_C, 'e').p_motivo === null)
  const comun = masaC({ cantidades: { 'i-agua': 10, 'i-color': 0.08, 'i-cacao': 0 } })
  chk('común modificada sin cacao: SÍ pide motivo', pideMotivo(comun) && C.parametrosRegistrarMasa(comun, DATOS_C, 'e').p_motivo === null)
  C.estado.defineChocolate = null
  chk('sin saber qué define el chocolate: se pide (lado seguro)', pideMotivo(masaC()) && C.pasaAChocolate(masaC(), null) === false)
  C.estado.defineChocolate = DEF
  chk('con Anterior u Original no aplica (no se modifica)', C.pasaAChocolate(masaC({ como: 'anterior' }), DEF) === false &&
    C.parametrosRegistrarMasa(masaC({ como: 'anterior' }), DATOS_C, 'e').p_motivo === null)

  // ── Contra el baseline fijo ──
  let viejo = ''
  try { viejo = execSync(`git show ${BASE}:modulos/produccion.html`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) } catch (e) { viejo = '' }
  chk(`baseline ${BASE} se pudo leer`, viejo.length > 100000, viejo.length)
  chk(`en ${BASE} el botón decía "igual a la N"`, /return `igual a la \$\{esc\(a\.nro\)\}/.test(extraerFn(viejo, 'detalleAnteriorCorto') || ''))
  const nuevoCorto = extraerFn(FUENTE, 'detalleAnteriorCorto') || ''
  chk('ahora ya no (y la función existe)', nuevoCorto.length > 50 && !/igual a la/.test(nuevoCorto))
})())

fin()
