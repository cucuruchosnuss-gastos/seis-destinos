// "Terminar la tablet", parte 3 (25/09/2026): los lotes de la masa.
//
// Lo que se probó en la fábrica el 24/09 y se corrigió:
//  - El <select> del sistema para el lote se reemplazó por un PANEL propio
//    con una tarjeta por lote (marca grande, lote, fecha si se sabe, cuánto
//    queda) y, abajo, apartado, "Otro lote de este insumo".
//  - Había DOS opciones vacías ("Elegí el lote" y "Se terminó · elegí otro").
//    Ahora el renglón dice UNA sola: "Se terminó · elegí otro" cuando la
//    persona dijo que se terminó, "Elegí el lote" en cualquier otro caso.
//  - BUG: el lote escrito a mano (de un insumo sin ingreso cargado) no pasaba
//    a la masa siguiente: no está en la lista de stock y se lo daba por
//    terminado. Leído el cuerpo de _lotes_con_stock (pg_get_functiondef,
//    25/09/2026): devuelve solo {lote, stock} con saldo > 0, así que la base
//    NO distingue "se agotó" de "nunca tuvo ingreso". Ahora queda elegido,
//    con "sin ingreso cargado", viaja en el payload y registrar_masa lo marca
//    con lote_fuera_de_stock. Se pide otro solo cuando la persona toca "Se
//    terminó".
//  - La fecha de cada lote no viene en datos_para_masa. Desde la planta con
//    dos modos (28/09/2026) sale de stock_para_masa(p_turno_id) —lotes con
//    saldo, cuánto queda y desde cuándo—, que la tablet lee con
//    produccion:cargar: ya no hace falta stock:ver ni v_stock_por_lote.
//
//  - Planta v2 (28/09/2026): tocar un renglón de la ventana lo MARCA y "Usar …"
//    lo pone; el recuadro dice el lote solo (la palabra "Lote" va en el
//    aria-label); "Se terminó el lote puesto" va al pie; la fecha dice
//    "Ingresó el …" y el más viejo "EL MÁS VIEJO · USALO PRIMERO".
//
//   node pruebas/test-produccion-lotes.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const ORIGINAL = { receta_id: 'r1', version: 7, items: [
  { ingrediente_id: 'i-harina', ingrediente: 'Harina', orden: 1, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: null },
  { ingrediente_id: 'i-azucar', ingrediente: 'Azúcar', orden: 2, descuenta_stock: true, cantidad_kg: 2.5, insumo_preferido_id: null },
  { ingrediente_id: 'i-lecitina', ingrediente: 'Lecitina', orden: 3, descuenta_stock: true, cantidad_kg: 0.15, insumo_preferido_id: null },
] }
const INSUMOS = [
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h1', nombre: 'Harina 000', marca: 'Júpiter', tipo: 'materia_prima', lotes: [{ lote: '24518', stock: 200 }, { lote: 'L-101', stock: 250.5 }] },
  { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', nombre: 'Harina 000', marca: 'Wali', tipo: 'materia_prima', lotes: [{ lote: 'W-9', stock: 100 }] },
  // El azúcar NO tiene ingreso cargado: ningún lote con stock.
  { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', nombre: 'Azúcar', marca: 'Ledesma', tipo: 'materia_prima', lotes: [] },
  { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', nombre: 'Lecitina', marca: 'Solae', tipo: 'insumo', lotes: [{ lote: '3310', stock: 0.24 }] },
]
// La anterior (de HOY): harina W-9 (en stock), azúcar con un lote ESCRITO A
// MANO que no está en stock, lecitina 3310.
const ANTERIOR = {
  masa_id: 'mA', lote: 7022, nro: 9, hora: '2026-09-25T13:05:00Z', doble: false,
  fecha_turno: '2026-09-25', es_de_hoy: true, es_chocolate: false,
  items: [
    { ingrediente_id: 'i-harina', insumo_id: 'ins-h2', lote: 'W-9', cantidad_simple_kg: 25 },
    { ingrediente_id: 'i-azucar', insumo_id: 'ins-az', lote: 'A-MANO-1', cantidad_simple_kg: 2.5 },
    { ingrediente_id: 'i-lecitina', insumo_id: 'ins-lec', lote: '3310', cantidad_simple_kg: 0.15 },
  ],
}
const copia = (x) => JSON.parse(JSON.stringify(x))
const MAQUINAS = [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }]
const TURNOS = [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-25', turno: 'Tarde', encargado_id: 'e1', abierto_en: null }]

function armar({ anterior = ANTERIOR, insumos = INSUMOS, stockVer = false, fechas = [], original = ORIGINAL, stock = [], stockError = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = 'masa'
  S.estado.persona = { id: 'e-mas', nombre: 'Juan Masero', puesto: 'masero' }
  if (stockVer) S.estado.miRolApp = 'super_admin'
  else S.estado.stockVer = null
  let consultasFecha = 0
  Object.assign(S.__tablas, {
    maquinas: MAQUINAS, turnos_produccion: TURNOS, masas: [], paradas_produccion: [], produccion_items: [],
    recetas: [{ tipo_masa: 'Común' }], ingredientes: [],
    v_stock_por_lote: () => { consultasFecha++; return { data: fechas, error: null } },
  })
  S.__consultasFecha = () => consultasFecha
  const datos = { original, anterior, insumos }
  S.__setRpc(async (n) => {
    if (n === 'datos_para_masa') return { data: copia(datos), error: null }
    if (n === 'stock_para_masa') return stockError ? { data: null, error: stockError } : { data: copia(stock), error: null }
    return { data: { masa_id: 'm-nueva', nro: 10 }, error: null }
  })
  return S
}
async function hastaLaReceta(S, como = 'anterior') {
  await S.mostrarSala()
  if (!S.estado.salaTurno) await S.elegirMaquinaSala('t1')
  S.elegirTamano(false)
  S.elegirComo(como)
  return S
}
const filas = (S) => S.__doc.getElementById('pr-receta-filas').innerHTML
// El botón del lote de un ingrediente, entero.
function botonLote(S, ing) {
  const h = filas(S)
  const i = h.indexOf(`data-lote="${ing}"`)
  if (i === -1) return ''
  const desde = h.lastIndexOf('<button', i)
  return h.slice(desde, h.indexOf('</button>', i) + 9)
}
const llamadasMasa = (S) => S.__llamadas.rpc.filter(([n]) => n === 'registrar_masa').map(([, p]) => p)

esperas.push((async () => {
  // ── b) Una sola opción vacía ──────────────────────────────────────────
  const P = await hastaLaReceta(armar({ anterior: null }), 'original')
  const bP = botonLote(P, 'i-harina')
  chk('primera masa del día: "Elegí el lote"', /Elegí el lote/.test(bP), bP)
  chk('… y NUNCA "Se terminó"', !/Se terminó/.test(filas(P)))
  chk('… en un solo texto visible, no en dos', (bP.match(/<span class="pr-rec__lote-texto">Elegí el lote<\/span>/g) || []).length === 1 && !/<option/.test(bP))
  chk('ya no hay ningún <select> de lote', !/<select[^>]*data-lote/.test(filas(P)) && !/<option/.test(filas(P)))

  const T = await hastaLaReceta(armar())
  T.marcarLoteTerminado('i-harina')
  const bT = botonLote(T, 'i-harina')
  chk('dijo que se terminó: "Se terminó · elegí otro"', /Se terminó · elegí otro/.test(bT), bT)
  chk('… y NO "Elegí el lote"', !/Elegí el lote/.test(bT))
  chk('… en bordó', /pr-rec__lote--terminado/.test(bT))
  chk('… el pie dice cuál', T.__doc.getElementById('pr-receta-error').textContent === 'Falta elegir otro lote de harina: el que estaba se terminó.',
    T.__doc.getElementById('pr-receta-error').textContent)
  chk('… y Registrar sigue tocable: el error se ve pegado', T.__doc.getElementById('pr-receta-registrar').disabled === false)
  chk('el texto sale de UN lugar', T.textoVacioLote({ terminado: true }) === 'Se terminó · elegí otro' && T.textoVacioLote({ terminado: false }) === 'Elegí el lote')

  // ── c) El lote sin ingreso cargado pasa a la masa siguiente ───────────
  const C = await hastaLaReceta(armar())
  const bC = botonLote(C, 'i-azucar')
  // Planta v2 (28/09/2026): el recuadro dice el lote solo, sin "Lote"; la
  // palabra va en el aria-label ("Lote de Azúcar: A-MANO-1").
  chk('el lote a mano de la anterior queda elegido', /<span class="pr-rec__lote-texto">A-MANO-1<\/span>/.test(bC) &&
    /aria-label="Lote de Azúcar: A-MANO-1, sin ingreso cargado"/.test(bC), bC)
  chk('… con "sin ingreso cargado"', /pr-rec__lote-nota">sin ingreso cargado</.test(bC))
  chk('… no como terminado ni vacío', !/pr-rec__lote--terminado|pr-rec__lote--vacio/.test(bC))
  chk('… y no bloquea Registrar', C.__doc.getElementById('pr-receta-registrar').disabled === false, C.__doc.getElementById('pr-receta-error').textContent)
  chk('el que SÍ está en stock no lleva la nota', !/sin ingreso cargado/.test(botonLote(C, 'i-harina')))
  await C.registrarMasa()
  const pm = llamadasMasa(C)[0]
  const az = pm?.p_items.find(x => x.ingrediente_id === 'i-azucar')
  chk('… y viaja igual en registrar_masa', az && az.lote === 'A-MANO-1' && az.insumo_id === 'ins-az', JSON.stringify(az))

  // Escrito a mano en ESTA masa: también "sin ingreso cargado".
  const M = await hastaLaReceta(armar())
  M.abrirPanelLote('i-azucar')
  // Parte 0 (28/09/2026): el azúcar no tiene lotes con stock, así que la
  // ventana abre DIRECTO con el campo para escribir el lote.
  chk('sin lotes con stock, la ventana abre directo con el campo', M.estado.panelLote?.escribir === true &&
    /id="pr-lote-panel-escribir"/.test(M.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  chk('… con "Usar este lote" y la nota de que se registra igual', /id="pr-lote-panel-usar">Usar este lote</.test(M.__doc.getElementById('pr-lote-panel-otros').innerHTML) &&
    /Podés registrar la masa igual/.test(M.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  chk('… y sin la lista vacía que no dice nada', M.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML === '')
  M.usarLoteEscrito()
  chk('"Usar este lote" vacío no pone nada y pide escribirlo', M.estado.panelLote && /Escribí el lote\./.test(M.__doc.getElementById('pr-lote-panel-otros').innerHTML) &&
    M.estado.masa.lotes['i-azucar'].lote === 'A-MANO-1')
  M.estado.panelLote.texto = '  B-22 '
  M.usarLoteEscrito()
  chk('"Usar este lote" pone el lote escrito, sin espacios en los bordes', M.estado.masa.lotes['i-azucar'].lote === 'B-22' &&
    M.estado.masa.lotes['i-azucar'].manual === true && M.estado.masa.lotes['i-azucar'].insumo_id === 'ins-az')
  chk('… y cierra la ventana', M.estado.panelLote === null && M.__doc.getElementById('pr-lote-panel').hidden === true)
  chk('el lote escrito a mano dice "sin ingreso cargado"', /sin ingreso cargado/.test(botonLote(M, 'i-azucar')) && /pr-rec__lote-texto">B-22</.test(botonLote(M, 'i-azucar')))
  chk('… y el lote va UNA sola vez: sin un campo abajo del botón', (filas(M).match(/>B-22</g) || []).length === 1 && !/data-lote-manual/.test(filas(M)), filas(M))

  // "Se terminó" lo suelta y pide otro.
  const S = await hastaLaReceta(armar())
  S.abrirPanelLote('i-azucar')
  chk('con un lote elegido, el panel ofrece "Se terminó el lote puesto" al pie', /id="pr-lote-panel-se-termino">Se terminó el lote puesto</.test(S.__doc.getElementById('pr-lote-panel-terminado').innerHTML))
  S.marcarLoteTerminado('i-azucar')
  S.pintarPanelLote()
  chk('"Se terminó" suelta el lote', S.estado.masa.lotes['i-azucar'].lote === null && S.estado.masa.lotes['i-azucar'].terminado === true)
  chk('… y pide otro', /Se terminó · elegí otro/.test(botonLote(S, 'i-azucar')))
  chk('… sin volver a ofrecer "Se terminó"', S.__doc.getElementById('pr-lote-panel-terminado').innerHTML === '')
  // EL BUG DE LA FÁBRICA (28/09/2026): después de "Se terminó" la ventana
  // abría VACÍA y SIN el link para escribir un lote, y la masa quedaba trabada.
  chk('después de "Se terminó" la ventana sigue ofreciendo escribir el lote', /id="pr-lote-panel-escribir"/.test(S.__doc.getElementById('pr-lote-panel-otros').innerHTML) ||
    /data-lote-escribir/.test(S.__doc.getElementById('pr-lote-panel-otros').innerHTML), S.__doc.getElementById('pr-lote-panel-otros').innerHTML)
  chk('"Se terminó" conserva de qué insumo era', S.estado.masa.lotes['i-azucar'].insumo_id === 'ins-az')
  await S.registrarMasa()
  chk('… y así no se manda nada', llamadasMasa(S).length === 0)
  chk('queda guardado en el borrador', JSON.parse(S.localStorage.getItem('produccion.masa.' + S.estado.masa.client_uuid)).lotes['i-azucar'].terminado === true)
  S.cerrarPanelLote()
  S.elegirComo('original')
  S.abrirPanelLote('i-azucar')
  chk('… ni cambiando a Original: la ventana abre con el campo', /id="pr-lote-panel-escribir"/.test(S.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  S.estado.panelLote.texto = 'AZ-7'
  S.usarLoteEscrito()
  chk('escribir un lote después de "Se terminó" lo destraba', S.estado.masa.lotes['i-azucar'].lote === 'AZ-7' && !S.estado.masa.lotes['i-azucar'].terminado &&
    !/elegir otro lote de azúcar/.test(S.__doc.getElementById('pr-receta-error').textContent))
  await S.registrarMasa()
  const pmS = llamadasMasa(S)[0]
  chk('… y la masa se registra con ese lote', !!pmS && pmS.p_items.find(x => x.ingrediente_id === 'i-azucar')?.lote === 'AZ-7', JSON.stringify(pmS?.p_items))

  // Un borrador viejo de "Se terminó" (de antes de la Parte 0) no guardaba
  // de qué insumo era: igual se puede escribir el lote, del único insumo.
  const V = await hastaLaReceta(armar())
  V.estado.masa.lotes['i-azucar'] = { insumo_id: '', lote: null, manual: false, sinLote: false, terminado: true }
  V.abrirPanelLote('i-azucar')
  V.estado.panelLote.texto = 'AZ-9'
  V.usarLoteEscrito()
  chk('un "Se terminó" viejo sin insumo igual deja escribir el lote', V.estado.masa.lotes['i-azucar'].insumo_id === 'ins-az' && V.estado.masa.lotes['i-azucar'].lote === 'AZ-9',
    JSON.stringify(V.estado.masa.lotes['i-azucar']))

  // Con lotes con stock (harina): "Se terminó" deja la lista y el link ARRIBA.
  const H = await hastaLaReceta(armar())
  H.abrirPanelLote('i-harina')
  chk('con lotes, la ventana NO abre con el campo', H.estado.panelLote.escribir === false && !/id="pr-lote-panel-escribir"/.test(H.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  H.marcarLoteTerminado('i-harina')
  H.pintarPanelLote()
  chk('"Se terminó" con lotes: la lista sigue y el link también', /data-lote-op=/.test(H.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML) &&
    /data-lote-escribir>(?:<svg[^]*?<\/svg>)?El lote no está en la lista: escribirlo</.test(H.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  H.abrirEscribirLote()
  chk('tocar el link abre el campo en la ventana', H.estado.panelLote.escribir === true && /id="pr-lote-panel-escribir"/.test(H.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  chk('… con los dos insumos para elegir de qué marca es', /data-lote-escribir-insumo="ins-h1"/.test(H.__doc.getElementById('pr-lote-panel-otros').innerHTML) &&
    /data-lote-escribir-insumo="ins-h2" aria-pressed="true"/.test(H.__doc.getElementById('pr-lote-panel-otros').innerHTML), H.__doc.getElementById('pr-lote-panel-otros').innerHTML)
  H.estado.panelLote.insumoEscribir = 'ins-h1'
  H.estado.panelLote.texto = 'J-1'
  H.usarLoteEscrito()
  chk('… y el lote escrito queda del insumo elegido', H.estado.masa.lotes['i-harina'].insumo_id === 'ins-h1' && H.estado.masa.lotes['i-harina'].lote === 'J-1')

  // "Otro": un insumo sin lotes con saldo ya no está deshabilitado; elegirlo
  // abre el campo para escribir su lote.
  const O = await hastaLaReceta(armar({ insumos: [...INSUMOS, { ingrediente_id: 'i-harina', insumo_id: 'ins-h3', nombre: 'Harina 000', marca: 'Chacabuco', tipo: 'materia_prima', lotes: [] }] }))
  O.abrirPanelLote('i-harina', 'otro')
  const tO = O.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('"Otro": el insumo sin lotes no está deshabilitado', !/disabled/.test(tO) && /Chacabuco/.test(tO), tO)
  O.elegirInsumoOtro(String(O.opcionesOtroInsumo('i-harina').findIndex(x => x.insumo_id === 'ins-h3')))
  chk('… elegirlo abre el campo para escribir su lote', O.estado.panelLote?.escribir === true && O.estado.panelLote.insumoEscribir === 'ins-h3' &&
    /id="pr-lote-panel-escribir"/.test(O.__doc.getElementById('pr-lote-panel-otros').innerHTML))

  // ── a) El panel ───────────────────────────────────────────────────────
  const A = await hastaLaReceta(armar())
  A.abrirPanelLote('i-harina')
  chk('tocar el renglón abre el panel', A.__doc.getElementById('pr-lote-panel').hidden === false && A.estado.panelLote?.ingredienteId === 'i-harina')
  chk('… con el ingrediente en el título', A.__doc.getElementById('pr-lote-panel-titulo').textContent === 'Lote de Harina')
  // (28/09/2026, la tablet real) UNA sola lista con todos los lotes de todas
  // las marcas, un renglón chico cada uno: "Júpiter · lote 24518 · quedan
  // 200 kg"; arriba, filtros chiquitos por marca.
  const tar = A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  const lista = tar.slice(tar.indexOf('pr-lp__filas'))
  chk('un renglón por lote, en UNA lista', (lista.match(/data-lote-op=/g) || []).length === 3 && /class="pr-lp__filas" data-scroll-propio/.test(tar), tar)
  chk('… con la marca', /<strong>Júpiter<\/strong>/.test(lista) && /<strong>Wali<\/strong>/.test(lista))
  chk('… el lote', /<strong>Júpiter<\/strong> lote 24518/.test(lista) && /<strong>Wali<\/strong> lote W-9/.test(lista))
  // Planta v2: lo que queda a la derecha, grande, con "quedan" abajo.
  chk('… y cuánto queda', /pr-lp__fila-queda"><strong>200 kg<\/strong><span>quedan<\/span>/.test(lista) &&
    /pr-lp__fila-queda"><strong>250,5 kg<\/strong><span>quedan<\/span>/.test(lista), lista)
  chk('… el de la masa anterior viene marcado', /data-lote-op="3" aria-pressed="true"/.test(lista) && (lista.match(/aria-pressed="true"/g) || []).length === 1)
  chk('filtros por marca: Todas, Júpiter y Wali', /data-lote-marca="" aria-pressed="true">Todas/.test(tar) &&
    /data-lote-marca="Júpiter"/.test(tar) && /data-lote-marca="Wali"/.test(tar))
  A.estado.panelLote.marca = 'Wali'
  A.pintarPanelLote()
  const soloWali = A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('filtrar por una marca deja solo sus lotes', !/Júpiter<\/strong>/.test(soloWali) && /<strong>Wali<\/strong>/.test(soloWali) &&
    /data-lote-marca="Wali" aria-pressed="true"/.test(soloWali), soloWali)
  chk('… y el filtro se toca en el panel', /const mf = ev\.target\.closest\('\[data-lote-marca\]'\)/.test(FUENTE))
  chk('el link de escribir se toca en el panel', /if \(ev\.target\.closest\('\[data-lote-escribir\]'\)\) \{ abrirEscribirLote\(\); return \}/.test(FUENTE))
  chk('"Usar este lote" se toca en el panel', /if \(ev\.target\.closest\('#pr-lote-panel-usar'\)\) \{ usarLoteEscrito\(\); return \}/.test(FUENTE))
  chk('Enter en el campo usa el lote', /ev\.key === 'Enter' && ev\.target\.closest\('\[data-lote-manual\]'\)\) \{ ev\.preventDefault\(\); usarLoteEscrito\(\) \}/.test(FUENTE))
  A.estado.panelLote.marca = ''
  A.pintarPanelLote()
  // (La línea chica del lote puesto dice "El de la masa anterior (9)": no es
  // una fecha.)
  chk('sin fechas en stock_para_masa no hay fecha, y v_stock_por_lote no se consulta', !/Ingresó el/.test(tar) && A.__consultasFecha() === 0)
  chk('el lote puesto dice que es el de la masa anterior', /data-lote-op="3" aria-pressed="true">[^]*?pr-lp__fila-fecha">El de la masa anterior \(9\)</.test(tar) &&
    (tar.match(/El de la masa anterior/g) || []).length === 1, tar)
  const otros = A.__doc.getElementById('pr-lote-panel-otros').innerHTML
  chk('ya no hay botones de "Otro lote" por insumo: UN link para escribir uno que no está', !/Otro lote/.test(tar + otros) &&
    /El lote no está en la lista: escribirlo/.test(otros) && (otros.match(/data-lote-escribir>/g) || []).length === 1, otros)
  chk('… en su propio bloque, ARRIBA de la lista (Parte 0)', FUENTE.indexOf('id="pr-lote-panel-otros"') < FUENTE.indexOf('id="pr-lote-panel-tarjetas"') &&
    FUENTE.indexOf('id="pr-lote-panel-otros"') > 0)
  // Planta v2 (28/09/2026): tocar un renglón lo MARCA (no lo pone todavía) y
  // "Usar …" lo pone en la masa y cierra la ventana.
  A.elegirTarjetaLote('0')
  chk('tocar un renglón lo marca, sin ponerlo todavía', A.estado.panelLote?.sel === 0 && A.estado.masa.lotes['i-harina'].lote === 'W-9' &&
    /data-lote-op="0" aria-pressed="true"/.test(A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML) &&
    (A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML.match(/aria-pressed="true"/g) || []).length === 2)
  chk('… y el botón dice cuál va a usar', /id="pr-lote-panel-usar-lista">Usar Júpiter · lote 24518</.test(A.__doc.getElementById('pr-lote-panel-terminado').innerHTML),
    A.__doc.getElementById('pr-lote-panel-terminado').innerHTML)
  chk('"Usar …" se toca en el panel', /if \(ev\.target\.closest\('#pr-lote-panel-usar-lista'\)\) \{ usarLoteDeLista\(\); return \}/.test(FUENTE))
  A.usarLoteDeLista()
  chk('"Usar …" pone ESE lote', A.estado.masa.lotes['i-harina'].insumo_id === 'ins-h1' && A.estado.masa.lotes['i-harina'].lote === '24518')
  chk('… en el renglón', /pr-rec__lote-texto">24518</.test(botonLote(A, 'i-harina')))
  chk('… y cierra el panel', A.__doc.getElementById('pr-lote-panel').hidden === true && A.estado.panelLote === null)
  // Un solo insumo: "Otro lote de este insumo".
  A.abrirPanelLote('i-azucar')
  chk('con un solo insumo y sin lotes con stock, directo el campo', /id="pr-lote-panel-escribir"/.test(A.__doc.getElementById('pr-lote-panel-otros').innerHTML) &&
    !/data-lote-escribir-insumo/.test(A.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  // Escape cierra.
  let prevenido = false
  A.teclaPanelLote({ key: 'Escape', preventDefault() { prevenido = true } })
  chk('Escape cierra el panel', A.__doc.getElementById('pr-lote-panel').hidden === true && prevenido)
  // No-materia prima: "Sin lote" es una tarjeta más.
  A.abrirPanelLote('i-lecitina')
  const tLec = A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('lo que no es materia prima ofrece "sin lote" en la lista', /<strong>Solae<\/strong> sin lote/.test(tLec) && /<strong>240 g<\/strong><span>quedan/.test(tLec), tLec)
  A.cerrarPanelLote()

  // La fecha de cada lote sale de stock_para_masa (desde), sin stock:ver.
  const F = await hastaLaReceta(armar({ stock: [
    { insumo_id: 'ins-h1', lotes: [{ lote: '24518', queda: 200, desde: '2026-09-02' }] },
    { insumo_id: 'ins-h2', lotes: [{ lote: 'W-9', queda: 90, desde: '2026-08-30' }] },
  ] }))
  F.abrirPanelLote('i-harina')
  const tF = F.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('"quedan" sale de stock_para_masa (90) y no de datos_para_masa (100)', /lote W-9[^]*?<strong>90 kg<\/strong><span>quedan/.test(tF) && !/100 kg/.test(tF), tF)
  // Planta v2: "Ingresó el …". El lote puesto (W-9, de la masa anterior)
  // muestra esa nota en lugar de la fecha.
  chk('la fecha del lote sale de stock_para_masa', /pr-lp__fila-fecha">Ingresó el 02\/09\/2026</.test(tF), tF)
  chk('… y el que no tiene fecha no inventa una', (tF.match(/Ingresó el/g) || []).length === 1 && !/lote L-101<\/span><span class="pr-lp__fila-fecha">Ingresó/.test(tF))
  chk('el más viejo va arriba y destacado ("EL MÁS VIEJO · USALO PRIMERO")', tF.indexOf('lote W-9') < tF.indexOf('lote 24518') &&
    /pr-lp__fila--viejo" data-lote-op="\d+" aria-pressed="(true|false)"><span class="pr-lp__radio" aria-hidden="true"><\/span><span class="pr-lp__fila-col"><span class="pr-lp__fila-texto"><strong>Wali<\/strong> lote W-9<span class="pr-lp__fila-primero">EL MÁS VIEJO · USALO PRIMERO<\/span>/.test(tF) &&
    (tF.match(/USALO PRIMERO/g) || []).length === 1, tF)
  chk('… sin stock:ver ni v_stock_por_lote', F.__consultasFecha() === 0 && !F.estado.stockVer)
  chk('una fecha ilegible no dibuja nada', F.textoFechaLote('ayer') === '' && F.textoFechaLote(null) === '')

  // Si stock_para_masa falla, la masa se carga igual: sin fechas, sin
  // "quedan" y con el aviso.
  const E = await hastaLaReceta(armar({ stockError: { message: 'sin red' } }))
  E.abrirPanelLote('i-harina')
  chk('si stock_para_masa no llega, la masa sigue y no hay fechas', !!E.estado.masa && !!E.estado.datosMasa && !E.estado.errorSala &&
    !/Ingresó el/.test(E.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML), E.estado.errorSala)
  chk('… ni "quedan" en la receta', !/pr-rec__queda/.test(filas(E)))
  chk('… y el aviso dice que se registra igual', E.__doc.getElementById('pr-receta-aviso-stock').hidden === false)
  E.cerrarPanelLote()
  await E.registrarMasa()
  chk('… y la masa se registra igual', llamadasMasa(E).length === 1)

  // ── HTML malicioso en marca, lote e insumo ────────────────────────────
  const ING = marca('ingId')
  const X = await hastaLaReceta(armar({ anterior: null,
    original: { receta_id: 'r1', version: 1, items: [{ ingrediente_id: ING, ingrediente: marca('ingrediente'), orden: 1, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: null }] },
    insumos: [
      { ingrediente_id: ING, insumo_id: 'ins-x', nombre: marca('insumo'), marca: marca('marca'), tipo: 'materia_prima', lotes: [{ lote: marca('lote'), stock: 10 }] },
      { ingrediente_id: ING, insumo_id: marca('insId'), nombre: marca('insumo2'), marca: '', tipo: 'insumo', lotes: [] },
    ] }), 'original')
  chequearMarcas(chk, 'el botón del lote vacío', filas(X), ['ingId', 'ingrediente'])
  X.abrirPanelLote(ING)
  // La lista nombra la MARCA (o el insumo cuando no tiene marca) y el lote.
  chequearMarcas(chk, 'la lista de lotes', X.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML, ['marca', 'lote'])
  chequearMarcas(chk, 'el link del lote a mano', X.__doc.getElementById('pr-lote-panel-otros').innerHTML, [])
  X.elegirTarjetaLote('0')
  chequearMarcas(chk, 'el botón "Usar …" del lote marcado', X.__doc.getElementById('pr-lote-panel-terminado').innerHTML, ['marca', 'lote'])
  X.usarLoteDeLista()
  chequearMarcas(chk, 'el renglón con el lote elegido', filas(X), ['lote', 'ingId', 'ingrediente'])
  // Y el campo del lote escrito a mano, que lleva el id y el nombre del ingrediente.
  X.abrirPanelLote(ING)
  X.elegirTarjetaLote(String(X.opcionesLote(X.estado.datosMasa, ING).findIndex(o => o.manual)))
  const conManual = X.__doc.getElementById('pr-lote-panel-otros').innerHTML
  chk('el campo a mano está en la ventana, no en el renglón', /data-lote-manual=/.test(conManual) && !/data-lote-manual=/.test(filas(X)))
  chequearMarcas(chk, 'el campo del lote a mano', conManual, ['ingId', 'marca', 'insumo2', 'insId'])
  X.estado.panelLote.texto = marca('loteEscrito')
  X.usarLoteEscrito()
  chequearMarcas(chk, 'el renglón con el lote escrito', filas(X), ['loteEscrito', 'ingId', 'ingrediente'])
})())

// ── Lo que queda escrito ──────────────────────────────────────────────────
{
  chk('el panel es un diálogo modal con título', /id="pr-lote-panel" hidden role="dialog" aria-modal="true" aria-labelledby="pr-lote-panel-titulo"/.test(FUENTE))
  chk('foco atrapado: Tab y Shift+Tab dan la vuelta', /if \(ev\.shiftKey && i <= 0\) \{ ev\.preventDefault\(\); focos\[focos\.length - 1\]\.focus\(\) \}/.test(FUENTE) &&
    /else if \(!ev\.shiftKey && i === focos\.length - 1\) \{ ev\.preventDefault\(\); focos\[0\]\.focus\(\) \}/.test(FUENTE))
  chk('el foco vuelve al renglón al cerrar', /`\[data-lote="\$\{pl\.ingredienteId\}"\]`/.test(FUENTE))
  chk('se escucha el teclado del panel', /panelLote\.addEventListener\('keydown', teclaPanelLote\)/.test(FUENTE))
  chk('el renglón abre el panel', /closest\('\[data-lote\]'\); if \(b\) abrirPanelLote\(b\.dataset\.lote\)/.test(FUENTE))
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  const reg = (sel) => { const i = css.indexOf('\n    ' + sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
  // Planta v2 (28/09/2026): los valores del diseño. Se eliminaron por diseño
  // las tarjetas de 88 px separadas 10 px y el borde de la tablet
  // (--pr-alto-boton): la ventana es una lista de renglones.
  const alto = (sel) => Number((/min-height: (\d+)px/.exec(reg(sel)) || [])[1])
  chk('cada renglón de la lista se toca con el dedo (44 px o más)', alto('.pr-lp__tarjeta') >= 44, alto('.pr-lp__tarjeta'))
  chk('scroll interno de la lista, no de la página', /class="pr-lp__filas" data-scroll-propio/.test(FUENTE) && /\n    \[data-scroll-propio\] \{ overflow-y: auto;/.test(css) &&
    /max-height: min\(500px, calc\(100dvh - 24px\)\)/.test(reg('.pr-lp__caja')) && /overflow: hidden/.test(reg('.pr-lp__caja')))
  chk('escribir un lote que no está: apartado, con borde punteado', /border: 2px dashed var\(--p-acento\)/.test(reg('.pr-lp__manual')))
  chk('el lote puesto se lee en el recuadro del renglón, que ocupa su celda', /width: 100%/.test(reg('.pr-rec__lote')) && alto('.pr-rec__lote') >= 36)
  chk('la fecha y lo que queda salen de stock_para_masa', /rpc\('stock_para_masa', \{ p_turno_id: estado\.salaTurno\.id \}\)/.test(FUENTE) && !/from\('v_stock_por_lote'\)/.test(FUENTE))
}

fin()
