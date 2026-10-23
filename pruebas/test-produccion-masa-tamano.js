// EL TAMAÑO DE LA MASA SIN ELEGIR (16/10/2026). El recuento del 15/10 dio 8
// bolsas de harina de menos: en la sala de masa "Simple" venía marcado y los
// maseros registraban masas dobles como simples sin darse cuenta.
//
// Desde ahora el tamaño es tri-estado: null (sin elegir) | false (Simple) |
// true (Doble). Toda masa nueva —también la "masa siguiente"— arranca en
// null: ningún botón presionado, el grupo resaltado, el aviso "Elegí SIMPLE o
// DOBLE" arriba y Registrar no manda nada. Retomar un borrador (recarga de la
// tablet) conserva lo que el masero eligió en ESE borrador. p_doble viaja
// siempre true/false, nunca null, y las pendientes de antes salen tal cual.
//
//   node pruebas/test-produccion-masa-tamano.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const FUENTE = require('fs').readFileSync(ARCHIVO, 'utf8')
const { chk, esperas, fin } = arnes()

// Una receta chica: agua (no lleva lote) y harina (25 kg de UNA masa simple).
// La anterior de hoy ya trae el lote de harina, así que lo único que puede
// faltar para registrar es el tamaño.
const ORIGINAL = { receta_id: 'r1', version: 3, items: [
  { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
  { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 2, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: 'ins-h1' },
] }
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', tipo: 'materia_prima', lotes: [{ lote: 'L-1', stock: 30 }] },
]
const anterior = (doble) => ({
  masa_id: 'mA', lote: 7023, nro: 2, hora: '2026-09-23T13:05:00Z', doble,
  fecha_turno: '2026-09-23', es_de_hoy: true, es_chocolate: false,
  items: [
    { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10 },
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', lote: 'L-1', cantidad_simple_kg: 25 },
  ],
})
// 30 kg en el lote: alcanza para una simple (25) y NO para una doble (50).
const STOCK = [{ insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', lotes: [{ lote: 'L-1', queda: 30, desde: '2026-09-01' }] }]
const copia = (x) => JSON.parse(JSON.stringify(x))
const ERROR_RED = { message: 'TypeError: Failed to fetch', code: '' }

const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }]
const TURNOS = [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-23', turno: 'Tarde', encargado_id: 'e1', abierto_en: null }]

// rpc(nombre, params) → respuesta. Por defecto: la receta con la anterior
// SIMPLE de hoy y registrar_masa que contesta bien.
function armar({ ant = anterior(false), registrar } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Agustín Barrera', puesto: 'masero' }
  let nro = 2
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS,
    turnos_produccion: TURNOS,
    masas: [],
    paradas_produccion: [],
    produccion_items: [],
    recetas: [{ tipo_masa: 'Común' }],
    ingredientes: [{ id: 'i-agua', define_chocolate: false }, { id: 'i-harina', define_chocolate: false }],
  })
  S.__setRpc(async (n, p) => {
    if (n === 'stock_para_masa') return { data: copia(STOCK), error: null }
    if (n === 'datos_para_masa') return { data: copia({ original: ORIGINAL, anterior: ant, insumos: INSUMOS }), error: null }
    if (n === 'registrar_masa') return registrar ? registrar(p) : { data: { masa_id: `m${++nro}`, nro, origen: 'anterior', lote: 7023, hora: '2026-09-23T14:00:00Z' }, error: null }
    return { data: null, error: null }
  })
  return S
}
async function enLaReceta(S) { await S.mostrarSala(); await S.elegirMaquinaSala('t1'); return S }
const llamadasMasa = (S) => S.__llamadas.rpc.filter(([n]) => n === 'registrar_masa').map(([, p]) => p)
const opciones = (S) => S.__doc.getElementById('pr-receta-opciones').innerHTML
const aviso = (S) => S.__doc.getElementById('pr-receta-tamano-aviso')
const pie = (S) => S.__doc.getElementById('pr-receta-error')
// Cómo se ve el tamaño: 'nada' | 'simple' | 'doble' | 'los dos' (nunca debería).
function marcado(S) {
  const h = opciones(S)
  const s = /data-doble="no" aria-pressed="true"/.test(h), d = /data-doble="si" aria-pressed="true"/.test(h)
  return s && d ? 'los dos' : s ? 'simple' : d ? 'doble' : 'nada'
}
const resaltado = (S) => /pr-receta__tamano--falta/.test(opciones(S))
// Sin elegir, a la vista: nada marcado, el grupo resaltado y el aviso arriba.
const sinElegirALaVista = (S) => marcado(S) === 'nada' && resaltado(S) && aviso(S).hidden === false

// ── El HTML y el CSS ────────────────────────────────────────────────────────
{
  chk('el aviso está ARRIBA de los botones Simple / Doble', FUENTE.indexOf('id="pr-receta-tamano-aviso"') > 0 &&
    FUENTE.indexOf('id="pr-receta-tamano-aviso"') < FUENTE.indexOf('id="pr-receta-opciones"'))
  chk('… dice "Elegí SIMPLE o DOBLE" y arranca escondido', /id="pr-receta-tamano-aviso"[^>]*hidden>Elegí SIMPLE o DOBLE</.test(FUENTE))
  chk('… es un aviso grave (bordó)', /class="pr-aviso pr-aviso--grave pr-receta__tamano-aviso" id="pr-receta-tamano-aviso"/.test(FUENTE))
  const regla = FUENTE.match(/\.pr-receta__tamano--falta \{([^}]*)\}/)?.[1] ?? ''
  chk('CSS: el grupo sin elegir lleva borde de aviso (box-shadow: no cambia el alto)', /box-shadow: 0 0 0 3px var\(--p-mal-borde\)/.test(regla) && !/\bborder\b/.test(regla), regla)
  // Ningún !! sobre el tamaño: convertiría el "sin elegir" en Simple.
  const conDobleNegacion = FUENTE.split('\n').filter(l => /!!\s*[\w.?]*(salaDoble|\.doble)\b|!!\s*doble\b/.test(l))
  chk('ningún !! sobre salaDoble / .doble en el módulo', conDobleNegacion.length === 0, conDobleNegacion.join('\n'))
  chk('estado.salaDoble arranca en null', /salaDoble: null,/.test(FUENTE))
}

// ── Las funciones puras ─────────────────────────────────────────────────────
{
  const X = construirProduccion(ARCHIVO)
  chk('tamanoElegido: true / false quedan, todo lo demás es null',
    X.tamanoElegido(true) === true && X.tamanoElegido(false) === false &&
    [null, undefined, 0, 1, '', 'true', {}].every(v => X.tamanoElegido(v) === null))
  chk('factorTamano: ×2 solo con Doble; sin elegir se calcula como simple',
    X.factorTamano({ doble: true }) === 2 && X.factorTamano({ doble: false }) === 1 && X.factorTamano({ doble: null }) === 1 && X.factorTamano(null) === 1)
  const b = X.nuevoBorradorMasa({ id: 't1', lote: 1, maquinaId: 'm1', maquinaNombre: 'M', nro: 1 })
  chk('un borrador nuevo arranca con doble null', b.doble === null)
  const d = { original: ORIGINAL, insumos: INSUMOS }
  const cant = { 'i-agua': 10, 'i-harina': 25 }
  chk('faltanParaRegistrar: sin tamaño, lo PRIMERO que falta es elegirlo',
    X.faltanParaRegistrar({ ...b, como: 'original', cantidades: cant, lotes: { 'i-harina': { insumo_id: 'ins-h1', lote: 'L-1' } } }, d)[0] === 'elegir SIMPLE o DOBLE')
  chk('… y con Simple o Doble ya no lo pide',
    [true, false].every(v => !X.faltanParaRegistrar({ ...b, doble: v, como: 'original', cantidades: cant, lotes: { 'i-harina': { insumo_id: 'ins-h1', lote: 'L-1' } } }, d).includes('elegir SIMPLE o DOBLE')))
  // El payload: p_doble booleano de verdad, nunca null.
  const base = { ...b, tipo: 'Común', como: 'original', cantidades: cant, lotes: { 'i-harina': { insumo_id: 'ins-h1', lote: 'L-1' } } }
  const pDoble = (v) => X.parametrosRegistrarMasa({ ...base, doble: v }, d, 'e-mas').p_doble
  chk('p_doble: Doble → true, Simple → false', pDoble(true) === true && pDoble(false) === false)
  chk('p_doble nunca es null (aunque se llamara sin elegir)', [null, undefined].every(v => typeof pDoble(v) === 'boolean'))
}

esperas.push((async () => {
  // ── 1 · Masa nueva: nada marcado, no deja registrar; con Doble va true ──
  const N = await enLaReceta(armar())
  chk('masa nueva: entra a la receta', N.estado.vista === 'pr-receta' && !!N.estado.masa)
  chk('masa nueva: el tamaño en null (borrador y estado)', N.estado.masa.doble === null && N.estado.salaDoble === null)
  chk('masa nueva: ninguno de los dos botones presionado', marcado(N) === 'nada', opciones(N))
  chk('… el grupo Simple / Doble resaltado', resaltado(N))
  // (El texto es fijo en el HTML: lo mira el bloque de arriba sobre la fuente.)
  chk('… y arriba "Elegí SIMPLE o DOBLE"', aviso(N).hidden === false)
  chk('… pegado a Registrar dice que falta (ANTES de tocar)', pie(N).hidden === false && pie(N).textContent === 'Falta elegir SIMPLE o DOBLE.', pie(N).textContent)
  await N.registrarMasa()
  chk('tocar Registrar sin tamaño NO registra', llamadasMasa(N).length === 0)
  chk('… ni deja un payload armado', N.estado.masa.payload == null)
  chk('… y sigue sin elegir', N.estado.masa.doble === null && sinElegirALaVista(N))
  // El ×2 no engaña: sin elegir, el lote se mira como para una simple.
  const harina = ORIGINAL.items[1]
  chk('sin elegir: lo que lleva del lote es el de una simple (25 kg, no 50)', N.estadoLote(harina, N.estado.masa, N.estado.datosMasa).consumo === 25)
  N.elegirTamano(true)
  chk('elegir Doble: queda marcado SOLO Doble', marcado(N) === 'doble' && N.estado.masa.doble === true && N.estado.salaDoble === true)
  chk('… el aviso y el resaltado se van', aviso(N).hidden === true && !resaltado(N))
  chk('… lo que lleva del lote pasa a 50 kg (y 30 kg no alcanzan)', N.estadoLote(harina, N.estado.masa, N.estado.datosMasa).consumo === 50 &&
    N.estadoLote(harina, N.estado.masa, N.estado.datosMasa).noAlcanza === true)
  chk('… el borrador guardado en la tablet dice doble: true', JSON.parse(N.__ls.get(`produccion.masa.${N.estado.masa.client_uuid}`)).doble === true)
  const uuidN = N.estado.masa.client_uuid
  await N.registrarMasa()
  const pN = llamadasMasa(N)
  chk('con Doble registra UNA vez con p_doble = true', pN.length === 1 && pN[0].p_doble === true, JSON.stringify(pN.map(p => p.p_doble)))
  chk('… con el uuid de esa masa', pN[0]?.p_client_uuid === uuidN)

  // ── 2 · Masa siguiente después de una Doble: vuelve a quedar sin elegir ──
  chk('masa siguiente: es OTRA masa (otro uuid)', !!N.estado.masa && N.estado.masa.client_uuid !== uuidN)
  chk('masa siguiente: NO copia el Doble de la anterior', N.estado.masa.doble === null && N.estado.salaDoble === null)
  N.ocultarRegistrada?.()
  N.pintarReceta()
  chk('masa siguiente: nada marcado, resaltado y con el aviso', sinElegirALaVista(N), opciones(N))
  await N.registrarMasa()
  chk('masa siguiente: tampoco registra sin elegir', llamadasMasa(N).length === 1)
  N.elegirTamano(false)
  await N.registrarMasa()
  chk('… con Simple registra con p_doble = false', llamadasMasa(N).length === 2 && llamadasMasa(N)[1].p_doble === false)
  chk('… y la que sigue a una Simple también arranca sin elegir', N.estado.masa.doble === null && N.estado.salaDoble === null)

  // Sin señal: la masa queda en la tablet y la siguiente igual arranca sin elegir.
  const OFF = await enLaReceta(armar({ registrar: () => ({ data: null, error: ERROR_RED }) }))
  OFF.elegirTamano(true)
  await OFF.registrarMasa()
  const pend = OFF.borradoresPendientes()
  chk('sin señal: la Doble queda pendiente con p_doble = true', pend.length === 1 && pend[0].payload?.p_doble === true)
  chk('sin señal: la siguiente arranca sin elegir', !!OFF.estado.masa && OFF.estado.masa.doble === null && OFF.estado.salaDoble === null)
  chk('… y la "anterior" armada en la tablet dice que era doble', OFF.estado.datosMasa?.anterior?.doble === true)

  // Después de una anterior DOBLE en la base, la masa nueva tampoco la copia.
  const AD = await enLaReceta(armar({ ant: anterior(true) }))
  chk('con la anterior de hoy doble, la masa nueva arranca sin elegir', AD.estado.masa.doble === null && marcado(AD) === 'nada')

  // ── 3 · Recargar la tablet con un borrador a medias ──────────────────────
  for (const [elegido, nombre] of [[false, 'Simple'], [true, 'Doble']]) {
    const A = await enLaReceta(armar())
    A.elegirTamano(elegido)
    const uuidA = A.estado.masa.client_uuid
    const RE = armar()
    for (const [k, v] of A.__ls) RE.__ls.set(k, v)
    await enLaReceta(RE)
    chk(`recargar con ${nombre}: se retoma el MISMO borrador`, RE.estado.masa?.client_uuid === uuidA && RE.__uuids() === 0)
    chk(`… y conserva ${nombre}`, RE.estado.masa.doble === elegido && RE.estado.salaDoble === elegido)
    chk(`… marcado ${nombre}, sin aviso ni resaltado`, marcado(RE) === (elegido ? 'doble' : 'simple') && aviso(RE).hidden === true && !resaltado(RE))
    await RE.registrarMasa()
    chk(`… y registra con p_doble = ${elegido}`, llamadasMasa(RE).length === 1 && llamadasMasa(RE)[0].p_doble === elegido && llamadasMasa(RE)[0].p_client_uuid === uuidA)
  }
  {
    // Un borrador a medias SIN tamaño elegido sigue sin elegir.
    const A = await enLaReceta(armar())
    const RE = armar()
    for (const [k, v] of A.__ls) RE.__ls.set(k, v)
    await enLaReceta(RE)
    chk('recargar sin haber elegido: mismo borrador y sigue en null', RE.estado.masa?.client_uuid === A.estado.masa.client_uuid && RE.estado.masa.doble === null && sinElegirALaVista(RE))
  }
  {
    // Cambiar de Original a Modificar (o de tipo) no toca el tamaño elegido.
    const M = await enLaReceta(armar())
    M.elegirTamano(true)
    M.elegirComo('modificar')
    M.elegirComo('original')
    chk('Original / Anterior / Modificar no tocan el tamaño elegido', M.estado.masa.doble === true && marcado(M) === 'doble')
    const M2 = await enLaReceta(armar())
    M2.elegirComo('original')
    chk('… ni lo inventan si no se eligió', M2.estado.masa.doble === null && marcado(M2) === 'nada')
  }

  // ── 5 · Pendientes guardadas ANTES de este cambio: salen tal cual ────────
  for (const v of [false, true]) {
    const V = armar()
    const vieja = {
      client_uuid: `vieja-${v}`, turnoId: 't1', lote: 7023, maquinaId: 'm1', maquinaNombre: 'Máquina 1', nro: 3,
      tipo: 'Común', doble: v, como: 'anterior', partida: 'anterior', cambiada: false,
      base: {}, cantidades: { 'i-agua': 10, 'i-harina': 25 }, lotes: {}, agregados: [], otros: [], motivo: '',
      payload: { p_turno_id: 't1', p_tipo_masa: 'Común', p_doble: v, p_masero_id: 'e-mas', p_items: [], p_client_uuid: `vieja-${v}`, p_motivo: null },
      pendiente: true,
    }
    V.__ls.set(`produccion.masa.vieja-${v}`, JSON.stringify(vieja))
    await V.reintentarPendientes()
    const pV = llamadasMasa(V)
    chk(`una pendiente vieja con doble ${v} sube con p_doble = ${v}`, pV.length === 1 && pV[0].p_doble === v && pV[0].p_client_uuid === `vieja-${v}`, JSON.stringify(pV))
  }
  {
    // Un borrador a medias viejo (de antes del cambio) con doble: false: el
    // masero no lo puede haber dejado en null, así que se respeta como está.
    const V = armar()
    V.__ls.set('produccion.masa.medias', JSON.stringify({
      client_uuid: 'medias', turnoId: 't1', lote: 7023, maquinaId: 'm1', maquinaNombre: 'Máquina 1', nro: 3,
      tipo: 'Común', doble: false, como: 'anterior', partida: 'anterior', cambiada: false,
      base: { 'i-agua': 10, 'i-harina': 25 }, cantidades: { 'i-agua': 10, 'i-harina': 25 },
      lotes: { 'i-harina': { insumo_id: 'ins-h1', lote: 'L-1' } }, agregados: [], otros: [], motivo: '', payload: null, pendiente: false,
    }))
    V.__ls.set('produccion.masa-en-curso.t1', 'medias')
    await enLaReceta(V)
    chk('un borrador a medias de antes (doble: false) se retoma como Simple', V.estado.masa?.client_uuid === 'medias' && V.estado.masa.doble === false && marcado(V) === 'simple')
    // Y uno de antes SIN el campo doble queda sin elegir (no se inventa Simple).
    const U = armar()
    U.__ls.set('produccion.masa.sin-campo', JSON.stringify({
      client_uuid: 'sin-campo', turnoId: 't1', lote: 7023, maquinaId: 'm1', maquinaNombre: 'Máquina 1', nro: 3,
      tipo: 'Común', como: 'anterior', partida: 'anterior', cambiada: false,
      base: { 'i-agua': 10, 'i-harina': 25 }, cantidades: { 'i-agua': 10, 'i-harina': 25 },
      lotes: { 'i-harina': { insumo_id: 'ins-h1', lote: 'L-1' } }, agregados: [], otros: [], motivo: '', payload: null, pendiente: false,
    }))
    U.__ls.set('produccion.masa-en-curso.t1', 'sin-campo')
    await enLaReceta(U)
    chk('un borrador sin el campo doble se retoma SIN elegir', U.estado.masa?.client_uuid === 'sin-campo' && U.estado.masa.doble === null && sinElegirALaVista(U))
  }
})())

fin()
