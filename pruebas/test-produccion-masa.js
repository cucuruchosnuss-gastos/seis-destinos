// B5 del módulo Producción · rediseño parte 4 (23/09/2026): la sala de masa.
//
// El circuito nuevo: máquina abierta → simple o doble → Usar la original /
// Usar la anterior / Modificar → LA RECETA ENTERA → Registrar. Sin pantalla de
// resumen y sin preguntar "¿mismos lotes?".
//
// Contrato con la base (pg_get_functiondef, 22/09/2026):
//  - datos_para_masa(p_turno_id, p_tipo_masa) → { original: {receta_id,
//    version, items:[{ingrediente_id, ingrediente, orden, descuenta_stock,
//    cantidad_kg, insumo_preferido_id}]}, anterior: {masa_id, lote, nro, hora,
//    doble, fecha_turno, es_de_hoy, es_chocolate, items:[{ingrediente_id,
//    insumo_id, lote, cantidad_simple_kg, ingrediente_libre}]} | null,
//    insumos: [{ingrediente_id, insumo_id, nombre, marca, tipo,
//    unidad_medida, lotes:[{lote, stock}]}] }.
//    NO devuelve define_chocolate: eso se lee de la tabla `ingredientes`.
//  - registrar_masa(p_turno_id, p_tipo_masa, p_doble, p_masero_id, p_items,
//    p_client_uuid): se manda UNA masa simple (la doble es ×2 en la base), con
//    TODOS los ingredientes de la receta vigente exactamente una vez cada uno
//    (0 permitido), más los "otro" como {ingrediente_id: null,
//    ingrediente_libre, cantidad_simple_kg}. Si el client_uuid ya existe, la
//    base devuelve esa masa sin tocar nada (reintento: true).
//  - anular_masa(p_masa_id, p_motivo): motivo de 3 letras o más.
//
// LA REGLA DEL UUID, que es lo que más importa de esta suite: un uuid NUEVO
// por masa, el MISMO en cada reintento (también después de recargar la
// tablet), y uno nuevo recién en la masa siguiente.
//
//   node pruebas/test-produccion-masa.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// La receta: agua sin insumo en el catálogo, harina con DOS insumos, azúcar
// con uno, grasa sin insumo (no descuenta), lecitina con poco stock, sal con
// un lote que se terminó, y cacao en CERO (el que define chocolate).
const ORIGINAL = { receta_id: 'r1', version: 7, items: [
  { ingrediente_id: 'i-agua', ingrediente: 'Agua', orden: 1, descuenta_stock: false, cantidad_kg: 10, insumo_preferido_id: null },
  { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 2, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: 'ins-h1' },
  { ingrediente_id: 'i-azucar', ingrediente: 'Azúcar', orden: 3, descuenta_stock: true, cantidad_kg: 2.5, insumo_preferido_id: null },
  { ingrediente_id: 'i-grasa', ingrediente: 'Grasa', orden: 4, descuenta_stock: true, cantidad_kg: 1.2, insumo_preferido_id: null },
  { ingrediente_id: 'i-lecitina', ingrediente: 'Lecitina', orden: 5, descuenta_stock: true, cantidad_kg: 0.15, insumo_preferido_id: null },
  { ingrediente_id: 'i-sal', ingrediente: 'Sal', orden: 6, descuenta_stock: true, cantidad_kg: 0.1, insumo_preferido_id: null },
  { ingrediente_id: 'i-cacao', ingrediente: 'Cacao', orden: 7, descuenta_stock: true, cantidad_kg: 0, insumo_preferido_id: null },
] }
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', tipo: 'materia_prima', lotes: [{ lote: '24518', stock: 200 }, { lote: 'L-101', stock: 250.5 }] },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', nombre: 'Harina 000', marca: 'Wali', tipo: 'materia_prima', lotes: [{ lote: 'W-9', stock: 100 }] },
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', nombre: 'Azúcar', marca: 'Ledesma', tipo: 'materia_prima', lotes: [{ lote: '3391', stock: 44 }] },
  { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', nombre: 'Lecitina', marca: 'Solae', tipo: 'insumo', lotes: [{ lote: '3310', stock: 0.24 }] },
  { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', nombre: 'Sal fina', marca: 'Celusal', tipo: 'materia_prima', lotes: [{ lote: 'S-2', stock: 30 }] },
  { ingrediente_id: 'i-cacao', insumo_id: 'ins-cac', nombre: 'Cacao', marca: 'Fénix', tipo: 'materia_prima', lotes: [{ lote: 'C-1', stock: 50 }] },
]
// La anterior: misma harina Wali, la sal con un lote que YA NO figura con
// stock (se terminó), y 200 g de más de azúcar.
const ANTERIOR = {
  masa_id: 'mA', lote: 7022, nro: 9, hora: '2026-09-23T13:05:00Z', doble: false,
  fecha_turno: '2026-09-23', es_de_hoy: true, es_chocolate: false,
  items: [
    { ingrediente_id: 'i-agua', insumo_id: null, lote: null, cantidad_simple_kg: 10 },
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', lote: 'W-9', cantidad_simple_kg: 25 },
    { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: '3391', cantidad_simple_kg: 2.7 },
    { ingrediente_id: 'i-grasa', insumo_id: null, lote: null, cantidad_simple_kg: 1.2 },
    { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', lote: '3310', cantidad_simple_kg: 0.15 },
    { ingrediente_id: 'i-sal', insumo_id: 'ins-sal', lote: 'S-VIEJO', cantidad_simple_kg: 0.1 },
    { ingrediente_id: 'i-cacao', insumo_id: null, lote: null, cantidad_simple_kg: 0 },
  ],
}
const DATOS = { original: ORIGINAL, anterior: ANTERIOR, insumos: INSUMOS }
const INGREDIENTES = [
  { id: 'i-agua', define_chocolate: false }, { id: 'i-harina', define_chocolate: false },
  { id: 'i-azucar', define_chocolate: false }, { id: 'i-grasa', define_chocolate: false },
  { id: 'i-lecitina', define_chocolate: false }, { id: 'i-sal', define_chocolate: false },
  { id: 'i-cacao', define_chocolate: true },
]
const copia = (x) => JSON.parse(JSON.stringify(x))
const ERROR_RED = { message: 'TypeError: Failed to fetch', code: '' }

const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm3', nombre: 'Máquina 3', orden: 2 }, { id: 'm4', nombre: 'Máquina 4', orden: 3 }]
const TURNOS = [
  { id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-23', turno: 'Tarde', encargado_id: 'e1', abierto_en: null },
  { id: 't3', lote: 7024, maquina_id: 'm3', fecha: '2026-09-23', turno: 'Tarde', encargado_id: 'e1', abierto_en: null },
]
const MASAS_TABLERO = [
  { turno_id: 't1', hora: '2026-09-23T13:05:00Z', anulada: false },
  { turno_id: 't1', hora: '2026-09-23T12:10:00Z', anulada: false },
]

function armar({ datos = DATOS, rpc, tipos = [{ tipo_masa: 'Común' }], turnos = TURNOS, masas = MASAS_TABLERO, ingredientes = INGREDIENTES } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Agustín Barrera', puesto: 'masero' }
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS,
    turnos_produccion: turnos,
    // El tablero pide las NO anuladas; leerMasasSala las pide todas.
    masas: (f) => ({ data: filtrarMasas(masas, f), error: null }),
    paradas_produccion: [],
    produccion_items: [],
    recetas: tipos,
    ingredientes,
  })
  S.__setRpc(rpc ?? (async (n) => n === 'datos_para_masa' ? { data: copia(datos), error: null } : { data: null, error: null }))
  return S
}
// El doble de `masas` respeta los DOS filtros que el módulo usa: el tablero
// pide las no anuladas y leerMasasSala() las de los turnos abiertos. Sin
// respetarlos, una consulta que lea de menos se vería igual que una correcta.
function filtrarMasas(filas, f) {
  let out = filas
  if (f.some(x => x[0] === 'eq' && x[1] === 'anulada')) out = out.filter(m => !m.anulada)
  const dentro = f.find(x => x[0] === 'in' && x[1] === 'turno_id')
  if (dentro) out = out.filter(m => dentro[2].includes(m.turno_id))
  return out
}
const llamadasMasa = (S) => S.__llamadas.rpc.filter(([n]) => n === 'registrar_masa').map(([, p]) => p)
const itemDe = (p, id) => p.p_items.find(x => x.ingrediente_id === id)

// Deja una masa lista para registrar: máquina elegida, tamaño y "cómo la hacés".
async function hastaLaReceta(S, { turno = 't1', doble = false, como = 'anterior' } = {}) {
  await S.mostrarSala()
  await S.elegirMaquinaSala(turno)
  S.elegirTamano(doble)
  S.elegirComo(como)
  return S
}

// ── El umbral del 10% y las diferencias ──────────────────────────────────
{
  const S = armar()
  chk('cualquier diferencia se muestra', S.textoGramos(50) === '+50 g' && S.textoGramos(-200) === '−200 g')
  chk('justo el 10% todavía NO se aleja', !S.seAleja(2.75, 2.5) && !S.seAleja(2.25, 2.5))
  chk('pasado el 10% sí, para arriba y para abajo', S.seAleja(2.76, 2.5) && S.seAleja(2.24, 2.5))
  chk('el 10% es de ESE ingrediente, no un número fijo', S.seAleja(0.17, 0.15) && !S.seAleja(0.16, 0.15))
  chk('con la receta en 0 la diferencia se muestra pero NUNCA en bordó', !S.seAleja(2, 0) && !S.seAleja(0.001, 0))
  chk('sin ruido de coma flotante', S.redondearKg(0.1 + 0.2) === 0.3)
  chk('paso de 100 g en agua, harina, azúcar (con tilde) y grasa', ['Agua', 'Harina', 'Azúcar', 'Grasa'].every(n => S.pasoDe(n) === 0.1))
  chk('paso de 10 g en los demás y en un "otro"', S.pasoDe('Lecitina') === 0.01 && S.pasoDe('Gluten') === 0.01)
}

esperas.push((async () => {
  // ── 6a: las máquinas abiertas ─────────────────────────────────────────
  const S = armar()
  await S.mostrarSala()
  const sala = S.__doc.getElementById('pr-sala-maquinas').innerHTML
  chk('solo las máquinas ABIERTAS (la libre no aparece)', (sala.match(/data-sala-turno=/g) || []).length === 2 && !/Máquina 4/.test(sala))
  chk('cada fila: nombre y lote', /Máquina 1<\/span><span class="pr-sala-maq__sub">Lote 7023/.test(sala), sala.slice(0, 400))
  chk('… cuántas masas lleva y la hora de la última', /2 masas/.test(sala) && /última 10:05/.test(sala), sala)
  chk('sin masas todavía: "Primera masa · cargá los lotes" en bordó', /pr-sala-maq__primera">Primera masa/.test(sala) && /pr-sala-maq__primera">cargá los lotes/.test(sala))
  chk('el panel de la derecha arranca apagado', /Elegí una máquina a la izquierda/.test(S.__doc.getElementById('pr-sala-panel').innerHTML))
  chk('… con todo deshabilitado, no solo atenuado', (S.__doc.getElementById('pr-sala-panel').innerHTML.match(/ disabled/g) || []).length >= 5)

  const P = armar({ turnos: [{ ...TURNOS[0] }], masas: [] })
  Object.assign(P.__tablas, { paradas_produccion: [{ id: 'p1', turno_id: 't1', motivo: 'Se cortó la luz', inicio: '2026-09-23T12:00:00Z' }] })
  await P.mostrarSala()
  chk('una máquina parada lo dice al lado del lote', /pr-sala-maq__parada">parada/.test(P.__doc.getElementById('pr-sala-maquinas').innerHTML))

  const V = armar({ turnos: [] })
  await V.mostrarSala()
  chk('sin máquinas abiertas: lo dice', /el encargado tiene que abrir el turno/.test(V.__doc.getElementById('pr-sala-aviso').innerHTML) && V.__doc.getElementById('pr-sala-maquinas').innerHTML === '')

  // ── 6b: la máquina elegida ────────────────────────────────────────────
  await S.elegirMaquinaSala('t1')
  chk('la fila elegida queda marcada', /data-sala-turno="t1" aria-pressed="true"/.test(S.__doc.getElementById('pr-sala-maquinas').innerHTML))
  const panel = S.__doc.getElementById('pr-sala-panel').innerHTML
  chk('la derecha dice máquina, lote y qué masa va a ser', /Máquina 1<\/span><span class="pr-sala__sub">Lote 7023 · masa 3 del turno/.test(panel), panel.slice(0, 300))
  chk('con UNA sola receta no se pregunta el tipo de masa', !/data-tipo-masa/.test(panel))
  chk('tamaño: Simple marcado por defecto', /data-doble="no" aria-pressed="true"/.test(panel) && /data-doble="si" aria-pressed="false"/.test(panel))
  chk('las tres opciones de "¿Cómo la hacés?"', ['original', 'anterior', 'modificar'].every(x => panel.includes(`data-base="${x}"`)))
  chk('"Usar la original" dice la versión vigente', /versión 7/.test(panel))
  chk('"Usar la anterior" dice cuál fue y a qué hora', /Igual a la masa 9 de las 10:05/.test(panel), panel)
  chk('… y que venía modificada, con la diferencia', /modificada: \+200 g Azúcar/.test(panel))
  chk('"Modificar" dice de dónde parte', /Parte de la masa 9\./.test(panel))
  chk('el tipo de masa se eligió solo (hay uno)', S.estado.tipoMasa === 'Común')
  chk('datos_para_masa con el turno y el tipo', JSON.stringify(S.__llamadas.rpc.find(([n]) => n === 'datos_para_masa')?.[1]) === '{"p_turno_id":"t1","p_tipo_masa":"Común"}')
  chk('define_chocolate se lee de la TABLA ingredientes', S.__llamadas.consultas.some(([t, f]) => t === 'ingredientes' && JSON.stringify(f).includes('define_chocolate')))
  S.elegirTamano(true)
  chk('elegir Doble queda marcado', /data-doble="si" aria-pressed="true"/.test(S.__doc.getElementById('pr-sala-panel').innerHTML))
  S.elegirTamano(false)

  // Con DOS recetas sí se pregunta el tipo.
  const D2 = armar({ tipos: [{ tipo_masa: 'Común' }, { tipo_masa: 'Conito' }, { tipo_masa: 'Común' }] })
  await D2.mostrarSala()
  await D2.elegirMaquinaSala('t1')
  const p2 = D2.__doc.getElementById('pr-sala-panel').innerHTML
  chk('con más de una receta aparece el selector de tipo, sin repetir', (p2.match(/data-tipo-masa=/g) || []).length === 2 && /data-tipo-masa="Común" aria-pressed="true"/.test(p2))
  await D2.elegirTipoMasa('Conito')
  chk('cambiar de tipo vuelve a pedir la receta', D2.__llamadas.rpc.filter(([n]) => n === 'datos_para_masa').length === 2 && D2.estado.tipoMasa === 'Conito')

  // Sin anterior y con una anterior de CHOCOLATE.
  const SA = armar({ datos: { ...DATOS, anterior: null } })
  await SA.mostrarSala(); await SA.elegirMaquinaSala('t1')
  const pa = SA.__doc.getElementById('pr-sala-panel').innerHTML
  chk('sin anterior: "Usar la anterior" deshabilitado y lo dice', /data-base="anterior" disabled/.test(pa) && /No hay una masa anterior/.test(pa))
  chk('… y "Modificar" parte de la receta vigente', /Parte de la receta vigente\./.test(pa))
  SA.elegirComo('anterior')
  chk('… y no hace nada', SA.estado.masa === null && SA.estado.vista === 'pr-sala')
  const CH = armar({ datos: { ...DATOS, anterior: { ...ANTERIOR, es_chocolate: true } } })
  await CH.mostrarSala(); await CH.elegirMaquinaSala('t1')
  chk('si la anterior fue de CHOCOLATE, el botón lo dice ANTES de copiarla', /Era de CHOCOLATE/.test(CH.__doc.getElementById('pr-sala-panel').innerHTML))

  // ── LOS LOTES VIENEN PUESTOS, en las TRES opciones ────────────────────
  for (const como of ['original', 'anterior', 'modificar']) {
    const L = await hastaLaReceta(armar(), { como })
    const b = L.estado.masa
    chk(`"${como}": los lotes vienen de la masa anterior`, b.lotes['i-harina']?.insumo_id === 'ins-h2' && b.lotes['i-harina']?.lote === 'W-9' && b.lotes['i-azucar']?.lote === '3391')
    chk(`"${como}": no se pregunta "¿mismos lotes?"`, !/mismos lotes/i.test(L.__doc.getElementById('pr-receta-filas').innerHTML))
  }
  const HOY = await hastaLaReceta(armar(), { como: 'original' })
  chk('"Usar la original" trae las cantidades de la receta', HOY.estado.masa.cantidades['i-azucar'] === 2.5)
  const ANT = await hastaLaReceta(armar(), { como: 'anterior' })
  chk('"Usar la anterior" trae las de la anterior', ANT.estado.masa.cantidades['i-azucar'] === 2.7)
  const MOD = await hastaLaReceta(armar(), { como: 'modificar' })
  chk('"Modificar" parte de la anterior de hoy', MOD.estado.masa.cantidades['i-azucar'] === 2.7 && MOD.estado.masa.partida === 'anterior')
  const MODSIN = await hastaLaReceta(armar({ datos: { ...DATOS, anterior: null } }), { como: 'modificar' })
  chk('… y de la receta vigente si no hay anterior', MODSIN.estado.masa.cantidades['i-azucar'] === 2.5 && MODSIN.estado.masa.partida === 'original')

  // PRIMERA MASA DEL DÍA: los lotes llegan VACÍOS.
  for (const anterior of [null, { ...ANTERIOR, es_de_hoy: false }]) {
    const F = await hastaLaReceta(armar({ datos: { ...DATOS, anterior } }), { como: 'original' })
    chk(`primera masa del día (${anterior ? 'la anterior es de otro día' : 'no hay anterior'}): los lotes llegan vacíos`, Object.keys(F.estado.masa.lotes).length === 0)
    chk('… Registrar queda bloqueado y el pie dice qué falta', F.__doc.getElementById('pr-receta-registrar').disabled === true &&
      /Falta elegir el lote de harina\./.test(F.__doc.getElementById('pr-receta-error').textContent), F.__doc.getElementById('pr-receta-error').textContent)
    await F.registrarMasa()
    chk('… y no se manda nada', llamadasMasa(F).length === 0)
  }

  // ── 6c: la receta ─────────────────────────────────────────────────────
  const R = await hastaLaReceta(armar(), { como: 'anterior' })
  const filas = R.__doc.getElementById('pr-receta-filas').innerHTML
  chk('un renglón por ingrediente, TODOS, incluso el que está en cero', (filas.match(/data-cant="/g) || []).length === 7 && /data-cant="i-cacao"/.test(filas))
  chk('el que está en cero aparece apagado', /pr-rec pr-rec--cero/.test(filas))
  chk('… con el + ACTIVO: es la única forma de cargarle cacao', /data-mas="i-cacao"(?![^>]*disabled)[^>]*>\+/.test(filas))
  chk('… y el − deshabilitado', /data-menos="i-cacao"[^>]*disabled/.test(filas))
  chk('la columna Marca muestra el insumo del lote elegido', /pr-rec__marca">Wali</.test(filas) && /pr-rec__marca">Ledesma</.test(filas), filas.slice(0, 200))
  chk('el que no tiene insumo en el catálogo: "no lleva lote"', /no lleva lote/.test(filas))
  chk('el cacao en cero dice "solo en chocolate"', /solo en chocolate/.test(filas))
  chk('igual a la receta: un "=" gris', /pr-rec__igual">=/.test(filas))
  chk('la diferencia del azúcar se MUESTRA (+200 g sobre 2,5 kg)', /pr-rec__dif">\+200 g/.test(filas), filas.slice(0, 200))
  chk('… pero NO en bordó: 8% no pasa el 10%', !/pr-rec__dif--aleja/.test(filas) && !/pr-rec__num--aleja/.test(filas))
  chk('los números se escriben con ponerNumero, nunca con value=', !/<input[^>]*value=/.test(filas))

  // "Queda": lo que queda DESPUÉS de esta masa.
  chk('queda = stock − lo que consume esta masa', /pr-rec__queda">75 kg/.test(filas), filas.slice(0, 200))
  chk('cuando no alcanza para otra, en bordó y con el aviso', /pr-rec__queda pr-rec__queda--poco">90 g/.test(filas) && /no alcanza para otra/.test(filas), filas.slice(0, 200))
  // Terminar la tablet, parte 3: lo que queda de cada lote ya no va en una
  // opción del <select> sino en la tarjeta del panel.
  R.abrirPanelLote('i-lecitina')
  const tarjetasLec = R.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  R.cerrarPanelLote()
  R.abrirPanelLote('i-harina')
  const tarjetasHar = R.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  R.cerrarPanelLote()
  chk('menos de un kilo se lee en gramos, como se habla en la sala', /pr-lp__queda-num">240 g</.test(tarjetasLec) && /pr-lp__queda-num">200 kg</.test(tarjetasHar), tarjetasLec)
  chk('… y el renglón entero se tinta', /pr-rec pr-rec--floja/.test(filas))
  const DOB = await hastaLaReceta(armar(), { como: 'anterior', doble: true })
  chk('en una doble, "Queda" descuenta el doble', /pr-rec__queda">50 kg/.test(DOB.__doc.getElementById('pr-receta-filas').innerHTML),
    DOB.__doc.getElementById('pr-receta-filas').innerHTML.slice(0, 200))
  // Terminar la tablet, parte 3: el lote de la anterior que NO figura con
  // stock (S-VIEJO) ya no se da por terminado solo: la base no distingue "se
  // agotó" de "nunca tuvo ingreso". Queda elegido, con "sin ingreso cargado".
  chk('el lote de la anterior que no está en stock queda elegido', /data-lote="i-sal"[^>]*><span>Lote S-VIEJO<\/span><span class="pr-rec__lote-nota">sin ingreso cargado<\/span>/.test(filas), filas.slice(filas.indexOf('data-lote="i-sal"') - 60, filas.indexOf('data-lote="i-sal"') + 300))
  chk('… y NO bloquea Registrar', R.__doc.getElementById('pr-receta-registrar').disabled === false)
  // Recién cuando la persona dice que se terminó se pide otro.
  R.marcarLoteTerminado('i-sal')
  const filasTerm = R.__doc.getElementById('pr-receta-filas').innerHTML
  chk('el lote que se terminó: el botón en bordó lo dice', /pr-rec__lote pr-rec__lote--terminado" data-lote="i-sal"/.test(filasTerm) && /Se terminó · elegí otro/.test(filasTerm))
  chk('… Registrar bloqueado y el pie dice cuál', R.__doc.getElementById('pr-receta-registrar').disabled === true &&
    R.__doc.getElementById('pr-receta-error').textContent === 'Falta elegir otro lote de sal: el que estaba se terminó.', R.__doc.getElementById('pr-receta-error').textContent)
  chk('la cabecera: máquina, lote, número de masa y los chips', /Máquina 1<\/span><span class="pr-receta__sub">Lote 7023 · masa 3<\/span>/.test(R.__doc.getElementById('pr-receta-cab').innerHTML) &&
    /pr-chip-rec">Simple/.test(R.__doc.getElementById('pr-receta-cab').innerHTML) && /pr-chip-origen--anterior">Anterior/.test(R.__doc.getElementById('pr-receta-cab').innerHTML),
    R.__doc.getElementById('pr-receta-cab').innerHTML)
  chk('sin cacao NO hay chip de chocolate', !/Chocolate/.test(R.__doc.getElementById('pr-receta-cab').innerHTML))

  // El lote se elige con UN solo desplegable que lleva insumo Y lote.
  const ops = R.opcionesLote(R.estado.datosMasa, 'i-harina')
  chk('las opciones de lote son pares (insumo, lote) con stock', ops.length === 5 && ops[0].insumo_id === 'ins-h1' && ops[0].lote === '24518')
  chk('… con el insumo nombrado cuando hay más de uno', /Lote 24518 · Harina 000 · Júpiter · 200 kg/.test(ops[0].etiqueta), ops[0].etiqueta)
  chk('… y una para escribir el lote que no figura', ops.some(o => o.manual))
  chk('un insumo que NO es materia prima ofrece "Sin lote"', R.opcionesLote(R.estado.datosMasa, 'i-lecitina').some(o => o.sinLote))
  chk('uno que SÍ es materia prima, no', !R.opcionesLote(R.estado.datosMasa, 'i-azucar').some(o => o.sinLote))
  R.elegirOpcionLote('i-sal', 0)
  chk('elegir un lote de la lista: insumo Y lote juntos', R.estado.masa.lotes['i-sal'].insumo_id === 'ins-sal' && R.estado.masa.lotes['i-sal'].lote === 'S-2')
  chk('… y el pie se destraba', R.__doc.getElementById('pr-receta-registrar').disabled === false && R.__doc.getElementById('pr-receta-error').hidden === true)
  // Un índice vacío no elige nada. Number('') es 0, así que sin el guard un
  // índice vacío elegiría el PRIMER lote sin que nadie lo tocara.
  R.elegirOpcionLote('i-sal', '')
  chk('volver a la opción vacía NO elige el primer lote de la lista', R.estado.masa.lotes['i-sal'].insumo_id === '' && R.estado.masa.lotes['i-sal'].lote === null)
  chk('… y Registrar vuelve a bloquearse, diciendo cuál falta', R.__doc.getElementById('pr-receta-registrar').disabled === true &&
    /Falta elegir el lote de sal\./.test(R.__doc.getElementById('pr-receta-error').textContent))
  R.elegirOpcionLote('i-sal', 0)
  const iHarina = R.opcionesLote(R.estado.datosMasa, 'i-harina').findIndex(o => o.manual && o.insumo_id === 'ins-h1')
  R.elegirOpcionLote('i-harina', iHarina)
  chk('"el lote no está en la lista" abre el campo a mano', R.estado.masa.lotes['i-harina'].manual === true &&
    /data-lote-manual="i-harina"/.test(R.__doc.getElementById('pr-receta-filas').innerHTML))
  chk('… y hasta que no se escriba, falta', /Falta elegir el lote de harina\./.test(R.__doc.getElementById('pr-receta-error').textContent))
  R.escribirLoteManual('i-harina', '  X-77 ')
  chk('… escrito, se destraba', R.__doc.getElementById('pr-receta-registrar').disabled === false)

  // − / + escriben con ponerNumero.
  R.sumarPaso('i-harina', +1); R.sumarPaso('i-harina', +1)
  chk('+ en harina suma 100 g cada vez', R.estado.masa.cantidades['i-harina'] === 25.2)
  R.sumarPaso('i-lecitina', -1)
  chk('− en lecitina resta 10 g', R.estado.masa.cantidades['i-lecitina'] === 0.14)
  for (let i = 0; i < 30; i++) R.sumarPaso('i-lecitina', -1)
  chk('nunca negativo', R.estado.masa.cantidades['i-lecitina'] === 0)
  R.cambiarCantidad('i-lecitina', 0.15)
  R.cambiarCantidad('i-azucar', -3)
  chk('un número negativo tipeado queda en 0', R.estado.masa.cantidades['i-azucar'] === 0)
  R.cambiarCantidad('i-azucar', 2.5)
  R.cambiarCantidad('i-azucar', null)
  chk('un número ilegible no cambia nada', R.estado.masa.cantidades['i-azucar'] === 2.5)
  chk('tocar una cantidad marca la masa como cambiada', R.estado.masa.cambiada === true)
  R.pintarReceta()
  chk('la cabecera pasa a decir Modificada', /pr-chip-origen--modificada">Modificada/.test(R.__doc.getElementById('pr-receta-cab').innerHTML))
  chk('el borrador guarda lo tipeado', JSON.parse(R.localStorage.getItem('produccion.masa.' + R.estado.masa.client_uuid)).cantidades['i-azucar'] === 2.5)

  // ── El chocolate sale de define_chocolate, no de un botón ni del nombre ─
  R.cambiarCantidad('i-cacao', 2)
  R.pintarReceta()
  chk('cargarle cacao suma el chip "Chocolate"', /pr-chip-choco">Chocolate/.test(R.__doc.getElementById('pr-receta-cab').innerHTML))
  chk('no hay ningún botón de chocolate', !/data-chocolate/.test(R.__doc.getElementById('pr-sala-panel').innerHTML + R.__doc.getElementById('pr-receta-filas').innerHTML))
  chk('el chip sale de define_chocolate y NO del nombre del ingrediente',
    R.esChocolate({ cantidades: { 'i-cacao': 1 } }, new Set(['i-cacao'])) && !R.esChocolate({ cantidades: { 'i-cacao': 1 } }, new Set(['i-otro'])))
  chk('… y con el ingrediente en 0 no es de chocolate', !R.esChocolate({ cantidades: { 'i-cacao': 0 } }, new Set(['i-cacao'])))
  chk('el cacao con cantidad pasa a pedir lote', /data-lote="i-cacao"/.test(R.__doc.getElementById('pr-receta-filas').innerHTML))
  R.elegirOpcionLote('i-cacao', 0)

  // ── "+ Otro" ──────────────────────────────────────────────────────────
  chk('nombre de menos de 2 letras: la base lanzaría, así que acá no pasa', !!R.faltaParaOtro('g', 0.05))
  chk('cantidad en 0 o negativa tampoco', !!R.faltaParaOtro('Gluten', 0) && !!R.faltaParaOtro('Gluten', -1) && !!R.faltaParaOtro('Gluten', null))
  chk('nombre y cantidad válidos: pasa', R.faltaParaOtro('Gluten', 0.05) === null)
  R.abrirOtro()
  chk('"+ Otro" abre el formulario', R.__doc.getElementById('pr-otro').hidden === false)
  R.__doc.getElementById('pr-otro-nombre').value = 'G'
  R.ponerNumero(R.__doc.getElementById('pr-otro-kg'), 0.05)
  R.agregarOtro()
  chk('con un nombre de una letra no se agrega y lo dice', (R.estado.masa.otros ?? []).length === 0 && R.__doc.getElementById('pr-otro-error').hidden === false)
  R.__doc.getElementById('pr-otro-nombre').value = '  Gluten  '
  R.agregarOtro()
  chk('agregado: nombre recortado y cantidad', R.estado.masa.otros.length === 1 && R.estado.masa.otros[0].nombre === 'Gluten' && R.estado.masa.otros[0].kg === 0.05)
  R.abrirOtro()
  R.__doc.getElementById('pr-otro-nombre').value = 'Miel'
  R.ponerNumero(R.__doc.getElementById('pr-otro-kg'), 1)
  R.agregarOtro()
  chk('puede haber VARIOS otros, con ids distintos', R.estado.masa.otros.length === 2 && R.estado.masa.otros[0].id !== R.estado.masa.otros[1].id)
  const conOtro = R.__doc.getElementById('pr-receta-filas').innerHTML
  chk('el renglón del otro lleva el sello OTRO y Quitar', /pr-rec__sello">OTRO<\/span> Gluten/.test(conOtro) && /data-quitar-otro=/.test(conOtro))
  chk('… no pide lote: está fuera del catálogo', /fuera del catálogo/.test(conOtro))
  R.sumarPasoOtro(R.estado.masa.otros[0].id, +1)
  chk('un otro se ajusta con − / +, con el paso chico', R.estado.masa.otros[0].kg === 0.06)
  R.quitarOtro(R.estado.masa.otros[1].id)
  chk('"Quitar" saca ese renglón y deja los demás', R.estado.masa.otros.length === 1 && R.estado.masa.otros[0].nombre === 'Gluten')
  // Un "otro" se agrega con cantidad, pero se puede bajar a 0 con el −. La base
  // lanza ahí, así que Registrar tiene que frenarlo ANTES de mandarlo.
  R.cambiarCantidadOtro(R.estado.masa.otros[0].id, 0)
  R.pintarReceta()
  chk('un "otro" en 0 bloquea Registrar, como haría la base', R.__doc.getElementById('pr-receta-registrar').disabled === true &&
    /Falta poner cuánto Gluten lleva la masa\./.test(R.__doc.getElementById('pr-receta-error').textContent),
    R.__doc.getElementById('pr-receta-error').textContent)
  R.cambiarCantidadOtro(R.estado.masa.otros[0].id, 0.06)
  R.pintarReceta()
  chk('… y con cantidad se destraba', R.__doc.getElementById('pr-receta-registrar').disabled === false)

  // ── El payload ────────────────────────────────────────────────────────
  R.estado.masa.doble = true
  const p = R.parametrosRegistrarMasa(R.estado.masa, R.estado.datosMasa, 'e-mas')
  chk('p_doble va aparte y las cantidades son de UNA masa simple (no ×2)', p.p_doble === true && itemDe(p, 'i-harina').cantidad_simple_kg === 25.2)
  chk('TODOS los ingredientes de la receta, exactamente una vez cada uno', p.p_items.filter(x => x.ingrediente_id).length === 7 &&
    new Set(p.p_items.filter(x => x.ingrediente_id).map(x => x.ingrediente_id)).size === 7)
  const enCero = R.parametrosRegistrarMasa({ ...R.estado.masa, cantidades: { ...R.estado.masa.cantidades, 'i-lecitina': 0 } }, R.estado.datosMasa, 'e-mas')
  chk('… incluso el que quedó en CERO: si falta uno, la base lanza',
    enCero.p_items.filter(x => x.ingrediente_id).length === 7 && itemDe(enCero, 'i-lecitina').cantidad_simple_kg === 0)
  chk('el masero es la persona de "¿Quién sos?"', p.p_masero_id === 'e-mas')
  chk('el que no pide lote viaja sin insumo ni lote', ['i-agua', 'i-grasa'].every(id => itemDe(p, id).insumo_id === null && itemDe(p, id).lote === null))
  chk('el lote escrito a mano viaja recortado', itemDe(p, 'i-harina').lote === 'X-77')
  chk('no se manda el origen: lo calcula la base', !('p_origen' in p) && Object.keys(p).join() === 'p_turno_id,p_tipo_masa,p_doble,p_masero_id,p_items,p_client_uuid')
  const otro = p.p_items.find(x => x.ingrediente_libre)
  chk('el "otro" viaja como ingrediente_libre, con ingrediente_id null', otro && otro.ingrediente_id === null && otro.ingrediente_libre === 'Gluten' && otro.cantidad_simple_kg === 0.06)
  chk('… y sin insumo ni lote: no descuenta stock', !('insumo_id' in otro) && !('lote' in otro))
  chk('el uuid es el del borrador', p.p_client_uuid === R.estado.masa.client_uuid)
  const L = R.parametrosRegistrarMasa({ ...R.estado.masa, lotes: { ...R.estado.masa.lotes, 'i-lecitina': { insumo_id: 'ins-lec', lote: null, manual: false, sinLote: true } }, cantidades: { ...R.estado.masa.cantidades, 'i-lecitina': 0.15 } }, R.estado.datosMasa, 'e-mas')
  chk('"Sin lote" viaja como null, nunca como texto', itemDe(L, 'i-lecitina').lote === null && itemDe(L, 'i-lecitina').insumo_id === 'ins-lec')

  // ── Registrar: vuelve a 6a con la banda verde ─────────────────────────
  const OK = await hastaLaReceta(armar({ rpc: async (n) => n === 'registrar_masa'
    ? { data: { masa_id: 'm9', nro: 3, origen: 'modificada', lote: 7023, es_chocolate: false, hora: '2026-09-23T13:41:00Z' }, error: null }
    : { data: copia(DATOS), error: null } }), { como: 'original' })
  OK.elegirOpcionLote('i-sal', 0)
  await OK.registrarMasa()
  chk('registrada: vuelve a las máquinas', OK.estado.vista === 'pr-sala')
  chk('… con la banda verde', OK.__doc.getElementById('pr-sala-exito').hidden === false &&
    OK.__doc.getElementById('pr-sala-exito-titulo').textContent === 'Masa 3 registrada')
  chk('… que dice máquina, lote, tamaño, ORIGEN DE LA BASE y hora', OK.__doc.getElementById('pr-sala-exito-detalle').textContent === 'Máquina 1 · lote 7023 · simple · modificada · 10:41',
    OK.__doc.getElementById('pr-sala-exito-detalle').textContent)
  chk('el origen de la banda es el que calculó la base, no el del borrador', OK.etiquetaBorrador({ cambiada: false, partida: 'original' }) === 'original')
  chk('… y no queda ninguna masa a medias', OK.estado.masa === null && OK.localStorage.getItem('produccion.masa-en-curso.t1') === null)
  // La derecha vuelve a quedar apagada: con la masa registrada, la "anterior"
  // y el stock de los lotes son otros, y el número de masa también.
  chk('… y la derecha queda apagada hasta elegir máquina de nuevo', OK.estado.salaTurno === null && OK.estado.datosMasa === null &&
    /Elegí una máquina a la izquierda/.test(OK.__doc.getElementById('pr-sala-panel').innerHTML))
  chk('… y ninguna fila queda marcada', !/aria-pressed="true"/.test(OK.__doc.getElementById('pr-sala-maquinas').innerHTML))
  chk('la banda se va sola: hay un reloj y una forma de apagarla', OK.MS_BANDA_EXITO === 6000)
  OK.ocultarBandaExito()
  chk('… y apagada no se ve', OK.__doc.getElementById('pr-sala-exito').hidden === true)
  const choco = OK.detalleBandaExito({ maquinaNombre: 'M', lote: 1, doble: true }, { lote: 2, origen: 'original', es_chocolate: true, hora: '2026-09-23T13:41:00Z' })
  chk('una doble de chocolate lo dice en la banda', choco === 'M · lote 2 · doble · original · chocolate · 10:41', choco)

  // ── Sin conexión: se guarda y se reintenta con el MISMO uuid ──────────
  let intentos = 0
  const N = await hastaLaReceta(armar({ rpc: async (n, p2) => {
    if (n !== 'registrar_masa') return { data: copia(DATOS), error: null }
    intentos++
    return intentos < 3 ? { data: null, error: ERROR_RED } : { data: { masa_id: 'm9', nro: 3, origen: 'anterior', lote: 7023 }, error: null }
  } }), { como: 'anterior' })
  N.elegirOpcionLote('i-sal', 0)
  const uuidN = N.estado.masa.client_uuid
  await N.registrarMasa()
  chk('sin conexión la masa queda guardada en la tablet', N.borradoresPendientes().length === 1 && N.borradoresPendientes()[0].client_uuid === uuidN)
  chk('… la banda bordó lo dice con el número de la masa', N.__doc.getElementById('pr-sala-pendiente').hidden === false &&
    N.__doc.getElementById('pr-sala-pendiente-texto').textContent === 'La masa 3 quedó guardada en esta tablet. Se manda sola cuando vuelva la señal. No la cargues de nuevo.',
    N.__doc.getElementById('pr-sala-pendiente-texto').textContent)
  chk('… y la pantalla vuelve a las máquinas, con la derecha apagada', N.estado.vista === 'pr-sala' && N.estado.masa === null && N.estado.salaTurno === null)
  // La masa SIGUIENTE no pisa la pendiente: el borrador va por uuid, no por turno.
  await N.elegirMaquinaSala('t1')
  N.elegirComo('original')
  chk('empezar la masa siguiente NO pisa la pendiente', N.borradoresPendientes().length === 1 && N.borradoresPendientes()[0].client_uuid === uuidN)
  chk('… y esa siguiente lleva un uuid NUEVO', N.estado.masa.client_uuid !== uuidN && N.__uuids() === 2)
  await N.reintentarPendientes()
  const envios = llamadasMasa(N)
  chk('los envíos van todos con el MISMO uuid', envios.length >= 2 && envios.every(x => x.p_client_uuid === uuidN), JSON.stringify(envios.map(x => x.p_client_uuid)))
  chk('… y con el mismo contenido: el payload no se rehace', envios.every(x => JSON.stringify(x) === JSON.stringify(envios[0])))
  chk('… y lo que viaja es la masa entera, no un payload recortado', envios[0].p_items.filter(x => x.ingrediente_id).length === 7)
  chk('ningún uuid nuevo al reintentar', N.__uuids() === 2)
  chk('cuando llegó, el pendiente se borra', N.borradoresPendientes().length === 0)

  // ── Recargar la tablet en el medio: sigue el mismo uuid ───────────────
  const A = await hastaLaReceta(armar({ rpc: async (n) => n === 'registrar_masa' ? { data: null, error: ERROR_RED } : { data: copia(DATOS), error: null } }), { como: 'anterior' })
  A.elegirOpcionLote('i-sal', 0)
  await A.registrarMasa()
  const uuidA = A.borradoresPendientes()[0].client_uuid
  const RE = armar({ rpc: async (n) => n === 'registrar_masa' ? { data: { masa_id: 'm', nro: 1, origen: 'anterior', lote: 7023, reintento: true }, error: null } : { data: copia(DATOS), error: null } })
  for (const [k, v] of A.__ls) RE.__ls.set(k, v)
  chk('después de recargar, la pendiente está', RE.borradoresPendientes().length === 1)
  await RE.reintentarPendientes()
  chk('recargada, reintenta con el uuid que ya tenía', llamadasMasa(RE).length === 1 && llamadasMasa(RE)[0].p_client_uuid === uuidA)
  chk('… sin generar ninguno', RE.__uuids() === 0)
  chk('la respuesta "reintento" de la base cuenta como enviada', RE.borradoresPendientes().length === 0)

  // ── La base dice que no: se muestra tal cual y se puede corregir ──────
  const C = await hastaLaReceta(armar({ rpc: async (n) => n === 'registrar_masa'
    ? { data: null, error: { message: 'Esa persona no figura como masero de esta unidad.', code: 'P0001' } }
    : { data: copia(DATOS), error: null } }), { como: 'anterior' })
  C.elegirOpcionLote('i-sal', 0)
  const uuidC = C.estado.masa.client_uuid
  await C.registrarMasa()
  chk('rechazo de la base: el mensaje TAL CUAL, pegado al botón', C.__doc.getElementById('pr-receta-error').textContent === 'Esa persona no figura como masero de esta unidad.')
  chk('… se queda en la receta para corregir', C.estado.vista === 'pr-receta' && C.estado.masa !== null)
  chk('… no queda pendiente (no se guardó nada) y el payload se rehace', C.borradoresPendientes().length === 0 && C.estado.masa.payload === null)
  // El error es de ESA masa: entrar a la receta de la siguiente lo borra. Si
  // no, el bordó queda escrito sobre una masa nueva que no tiene nada malo.
  C.mostrarReceta()
  chk('el rechazo no se arrastra a la masa siguiente', C.estado.errorReceta === null &&
    C.__doc.getElementById('pr-receta-error').hidden === true)
  C.__setRpc(async (n) => n === 'registrar_masa' ? { data: { nro: 3, origen: 'anterior', lote: 7023 }, error: null } : { data: copia(DATOS), error: null })
  await C.registrarMasa()
  chk('al reintentar después de corregir, sigue el MISMO uuid', llamadasMasa(C).every(x => x.p_client_uuid === uuidC) && C.__uuids() === 1)
  chk('un error sin código es de red', C.esErrorDeRed({ message: 'Failed to fetch' }) && C.esErrorDeRed(null))
  chk('un error con código es de la base', !C.esErrorDeRed({ message: 'x', code: 'P0001' }))
  chk('… aunque el mensaje hable de conexión', !C.esErrorDeRed({ message: 'Sin conexión con la balanza', code: 'P0001' }))
  C.__ls.set('produccion.masa.otro-uuid', JSON.stringify({ client_uuid: 'no-es-ese', turnoId: 't1' }))
  chk('un borrador guardado bajo otro uuid no se toma', C.leerBorradorMasa('otro-uuid') === null)

  // ── Retomar una masa a medias ─────────────────────────────────────────
  const M = await hastaLaReceta(armar(), { como: 'anterior' })
  const uuidM = M.estado.masa.client_uuid
  M.cambiarCantidad('i-harina', 30)
  await M.mostrarSala()
  await M.elegirMaquinaSala('t1')
  chk('volver a la máquina retoma la masa a medias, con SU uuid', M.estado.masa?.client_uuid === uuidM && M.__uuids() === 1)
  chk('… y el tamaño elegido', M.estado.salaDoble === false)
  M.elegirComo('original')
  chk('volver a elegir cómo la hacés rehace las cantidades, sin cambiar el uuid', M.estado.masa.client_uuid === uuidM && M.estado.masa.cantidades['i-harina'] === 25 && M.__uuids() === 1)
  // Si la tablet se recarga justo entre "se mandó" y "se soltó el puntero", el
  // puntero queda apuntando a una masa PENDIENTE. Esa no se retoma: ya se
  // mandó y se reintenta sola.
  const PEN = armar()
  PEN.__ls.set('produccion.masa.u-pend', JSON.stringify({ client_uuid: 'u-pend', turnoId: 't1', pendiente: true, payload: {} }))
  PEN.__ls.set('produccion.masa-en-curso.t1', 'u-pend')
  chk('una masa pendiente NO se retoma como si estuviera a medias', PEN.borradorEnCurso('t1') === null)
  chk('… pero sigue guardada y esperando el reintento', PEN.borradoresPendientes().length === 1)
  PEN.__ls.set('produccion.masa.u-medias', JSON.stringify({ client_uuid: 'u-medias', turnoId: 't1', pendiente: false }))
  PEN.__ls.set('produccion.masa-en-curso.t1', 'u-medias')
  chk('una a medias sí se retoma', PEN.borradorEnCurso('t1')?.client_uuid === 'u-medias')

  // ── 6d: las masas del turno ───────────────────────────────────────────
  const T = armar({ rpc: async (n) => n === 'registrar_masa' ? { data: null, error: ERROR_RED } : { data: copia(DATOS), error: null } })
  T.__tablas.masas = (f) => {
    const todas = [
      { id: 'ma1', turno_id: 't1', nro: 1, hora: '2026-09-23T12:10:00Z', tipo_masa: 'Común', doble: true, origen: 'modificada', es_chocolate: false, anulada: false },
      { id: 'ma2', turno_id: 't3', nro: 2, hora: '2026-09-23T13:05:00Z', tipo_masa: 'Común', doble: false, origen: 'original', es_chocolate: true, anulada: false },
      { id: 'ma3', turno_id: 't1', nro: 3, hora: '2026-09-23T11:00:00Z', tipo_masa: 'Común', doble: false, origen: 'anterior', es_chocolate: false, anulada: true, anulada_motivo: 'Se quemó' },
    ]
    return { data: filtrarMasas(todas, f), error: null }
  }
  await hastaLaReceta(T, { como: 'anterior' })
  T.elegirOpcionLote('i-sal', 0)
  await T.registrarMasa()
  await T.mostrarMasasTurno()
  const lista = T.__doc.getElementById('pr-masas-lista').innerHTML
  chk('las masas de TODAS las máquinas abiertas, no solo la elegida', /Máquina 1 · 7023/.test(lista) && /Máquina 3 · 7024/.test(lista))
  chk('la que espera se ve tintada', lista.includes('pr-masa-fila--espera'))
  chk('… y va PRIMERO', lista.includes('ma1') && lista.indexOf('pr-masa-fila--espera') < lista.indexOf('ma1'))
  chk('… y dice "Esperando conexión" en bordó', /pr-masa-fila__espera">Esperando conexión/.test(lista))
  chk('las enviadas dicen "✓ Enviada" en verde', (lista.match(/pr-masa-fila__ok">✓ Enviada/g) || []).length === 2)
  // Terminar la tablet, parte 5: chip SOLO "Modificada" (bordó); Original y Anterior son lo normal y no llevan.
  chk('"Modificada" con su chip bordó; Original y Anterior sin chip', /pr-chip-modificada">Modificada/.test(lista) && !/pr-chip-origen|>Original<|>Anterior</.test(lista), lista)
  chk('SIMPLE / DOBLE en grande', /pr-masa-fila__tam pr-masa-tam">(SIMPLE|DOBLE)</.test(lista) && !/>Simple<|>Doble</.test(lista))
  chk('las enviadas van de la más nueva a la más vieja', lista.indexOf('>2<') < lista.indexOf('>1<'))
  chk('una de chocolate lo dice con su chip', (lista.match(/pr-chip-choco">Chocolate</g) || []).length === 1 && !/choc\./.test(lista), lista)
  chk('la anulada se ve anulada, con su motivo y sin "Anular"', /pr-masa-fila--anulada/.test(lista) && /Anulada: Se quemó/.test(lista) && !/data-anular-masa="ma3"/.test(lista))
  chk('sin produccion:cargar no hay botón de anular', !/data-anular-masa/.test(T.htmlFilaMasaTurno({ id: 'ma1', nro: 1, turno_id: 't1', hora: null, doble: false, origen: 'original', anulada: false }, false)))
  // Una máquina LIBRE tiene turno null: una masa sin turno_id no puede
  // matchear con ella ni romper al leer su lote.
  chk('una masa sin turno conocido no se cuelga de una máquina libre', T.nombreDeTurno(undefined) === '—' && T.nombreDeTurno('t-que-no-existe') === '—')
  chk('la banda de sin conexión también se ve acá', T.__doc.getElementById('pr-masas-sin').hidden === false && /No la cargues de nuevo/.test(T.__doc.getElementById('pr-masas-sin-texto').textContent))
  chk('dos pendientes lo dicen en plural', /2 masas quedaron guardadas/.test(T.textoPendientes([{}, {}])))
  T.pedirAnularMasa('ma1')
  chk('anular pide motivo', T.__doc.getElementById('pr-anular-masa').hidden === false && /masa 1/.test(T.__doc.getElementById('pr-anular-masa-titulo').textContent))
  T.__doc.getElementById('pr-anular-masa-motivo').value = 'no'
  await T.confirmarAnularMasa()
  chk('motivo de menos de 3 letras: no se manda', !T.__llamadas.rpc.some(([n]) => n === 'anular_masa'))
  T.__doc.getElementById('pr-anular-masa-motivo').value = '  Se volcó  '
  await T.confirmarAnularMasa()
  chk('anular_masa con la masa y el motivo', JSON.stringify(T.__llamadas.rpc.find(([n]) => n === 'anular_masa')?.[1]) === '{"p_masa_id":"ma1","p_motivo":"Se volcó"}')
  chk('… y avisa que se devolvió lo descontado', T.__llamadas.exitos.some(m => /devolvió al stock/.test(m)))

  // ── HTML malicioso en cada render nuevo ───────────────────────────────
  const X = armar()
  const malos = {
    original: { version: marca('version'), items: [{ ingrediente_id: marca('ingId'), ingrediente: marca('ingrediente'), descuenta_stock: true, cantidad_kg: 1 }] },
    anterior: { lote: marca('loteAnt'), nro: marca('nroAnt'), hora: null, es_de_hoy: false, es_chocolate: true, items: [] },
    insumos: [{ ingrediente_id: marca('ingId'), insumo_id: marca('insId'), nombre: marca('insNombre'), marca: marca('insMarca'), tipo: 'insumo', lotes: [{ lote: marca('lote'), stock: 1 }] }],
  }
  X.estado.datosMasa = malos
  X.estado.defineChocolate = new Set()
  const bm = {
    maquinaNombre: marca('maqBorr'), lote: marca('loteBorr'), nro: marca('nroBorr'), tipo: marca('tipo'),
    doble: false, partida: 'anterior', cambiada: false,
    cantidades: { [marca('ingId')]: 1 }, otros: [{ id: marca('otroId'), nombre: marca('otroNombre'), kg: 1 }],
    lotes: { [marca('ingId')]: { insumo_id: marca('insId'), lote: marca('lote'), manual: false, sinLote: false } },
  }
  chequearMarcas(chk, 'fila de la sala', X.htmlFilaSala({ maquina: { nombre: marca('maqSala') }, turno: { id: marca('turnoSala'), lote: marca('loteSala') }, masas: 2, ultimaMasa: null, parada: null }, true), ['maqSala', 'turnoSala', 'loteSala'])
  chequearMarcas(chk, 'detalle de la anterior', X.detalleAnterior(malos), ['loteAnt', 'nroAnt'])
  chequearMarcas(chk, 'opción de "¿Cómo la hacés?"', X.htmlComo(marca('comoClave'), marca('comoTit'), 'x', true), ['comoClave', 'comoTit'])
  chequearMarcas(chk, 'cabecera de la receta', X.htmlCabeceraReceta(bm, malos), ['maqBorr', 'loteBorr', 'nroBorr'])
  chequearMarcas(chk, 'fila de la receta', X.htmlFilaReceta(malos.original.items[0], bm, malos), ['ingId', 'ingrediente', 'insMarca', 'lote'])
  const bManual = { ...bm, lotes: { [marca('ingId')]: { insumo_id: marca('insId'), lote: null, manual: true, sinLote: false } } }
  chequearMarcas(chk, 'fila con lote a mano', X.htmlFilaReceta(malos.original.items[0], bManual, malos), ['ingId', 'ingrediente'])
  chequearMarcas(chk, 'fila de un "otro"', X.htmlFilaOtro(bm.otros[0]), ['otroId', 'otroNombre'])
  chequearMarcas(chk, 'masa pendiente en 6d', X.htmlFilaMasaPendiente({ nro: marca('pendNro'), maquinaNombre: marca('pendMaq'), lote: marca('pendLote'), doble: false }), ['pendNro', 'pendMaq', 'pendLote'])
  X.estado.tablero = [{ maquina: { nombre: marca('maqTablero') }, turno: { id: 't9', lote: marca('loteTablero') }, masas: 0, ultimaMasa: null, parada: null }]
  chequearMarcas(chk, 'la máquina y el lote en 6d', X.htmlFilaMasaTurno({ id: 'x', nro: 1, turno_id: 't9', hora: null, doble: false, origen: 'original', anulada: false }, true), ['maqTablero', 'loteTablero'])
  chequearMarcas(chk, 'masa enviada en 6d', X.htmlFilaMasaTurno({ id: marca('masaId'), nro: marca('nro'), hora: null, doble: false, origen: 'modificada', es_chocolate: true, anulada: false }, true) +
    X.htmlFilaMasaTurno({ id: 'x', nro: 1, hora: null, doble: false, origen: 'original', anulada: true, anulada_motivo: marca('motivoAnul') }, true), ['masaId', 'nro', 'motivoAnul'])
  const Y = armar({ turnos: [{ id: marca('turnoY'), lote: marca('loteY'), maquina_id: 'm1', fecha: '2026-09-23', abierto_en: null }], masas: [] })
  Y.__tablas.maquinas = [{ id: 'm1', nombre: marca('maqY'), orden: 1 }]
  await Y.mostrarSala()
  chequearMarcas(chk, 'la sala entera', Y.__doc.getElementById('pr-sala-maquinas').innerHTML, ['maqY', 'turnoY', 'loteY'])
})())

fin()
