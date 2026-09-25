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
//  - La fecha de cada lote no viene en datos_para_masa: sale de
//    v_stock_por_lote.desde, solo si la cuenta tiene stock:ver en la unidad.
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

function armar({ anterior = ANTERIOR, insumos = INSUMOS, stockVer = false, fechas = [], original = ORIGINAL } = {}) {
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
  S.__setRpc(async (n) => n === 'datos_para_masa' ? { data: copia(datos), error: null } : { data: { masa_id: 'm-nueva', nro: 10 }, error: null })
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
  chk('… en un solo texto visible, no en dos', (bP.match(/<span>Elegí el lote<\/span>/g) || []).length === 1 && !/<option/.test(bP))
  chk('ya no hay ningún <select> de lote', !/<select[^>]*data-lote/.test(filas(P)) && !/<option/.test(filas(P)))

  const T = await hastaLaReceta(armar())
  T.marcarLoteTerminado('i-harina')
  const bT = botonLote(T, 'i-harina')
  chk('dijo que se terminó: "Se terminó · elegí otro"', /Se terminó · elegí otro/.test(bT), bT)
  chk('… y NO "Elegí el lote"', !/Elegí el lote/.test(bT))
  chk('… en bordó', /pr-rec__lote--terminado/.test(bT))
  chk('… el pie dice cuál', T.__doc.getElementById('pr-receta-error').textContent === 'Falta elegir otro lote de harina: el que estaba se terminó.',
    T.__doc.getElementById('pr-receta-error').textContent)
  chk('… Registrar bloqueado', T.__doc.getElementById('pr-receta-registrar').disabled === true)
  chk('el texto sale de UN lugar', T.textoVacioLote({ terminado: true }) === 'Se terminó · elegí otro' && T.textoVacioLote({ terminado: false }) === 'Elegí el lote')

  // ── c) El lote sin ingreso cargado pasa a la masa siguiente ───────────
  const C = await hastaLaReceta(armar())
  const bC = botonLote(C, 'i-azucar')
  chk('el lote a mano de la anterior queda elegido', /<span>Lote A-MANO-1<\/span>/.test(bC), bC)
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
  const iMan = M.opcionesLote(M.estado.datosMasa, 'i-azucar').findIndex(o => o.manual)
  M.elegirTarjetaLote(String(iMan))
  M.escribirLoteManual('i-azucar', 'B-22')
  M.pintarReceta()
  chk('el lote escrito a mano dice "sin ingreso cargado"', /sin ingreso cargado/.test(botonLote(M, 'i-azucar')) && /Lote B-22/.test(botonLote(M, 'i-azucar')))

  // "Se terminó" lo suelta y pide otro.
  const S = await hastaLaReceta(armar())
  S.abrirPanelLote('i-azucar')
  chk('con un lote elegido, el panel ofrece "Se terminó"', /id="pr-lote-panel-se-termino">Se terminó</.test(S.__doc.getElementById('pr-lote-panel-terminado').innerHTML))
  S.marcarLoteTerminado('i-azucar')
  S.pintarPanelLote()
  chk('"Se terminó" suelta el lote', S.estado.masa.lotes['i-azucar'].lote === null && S.estado.masa.lotes['i-azucar'].terminado === true)
  chk('… y pide otro', /Se terminó · elegí otro/.test(botonLote(S, 'i-azucar')))
  chk('… sin volver a ofrecer "Se terminó"', S.__doc.getElementById('pr-lote-panel-terminado').innerHTML === '')
  await S.registrarMasa()
  chk('… y así no se manda nada', llamadasMasa(S).length === 0)
  chk('queda guardado en el borrador', JSON.parse(S.localStorage.getItem('produccion.masa.' + S.estado.masa.client_uuid)).lotes['i-azucar'].terminado === true)

  // ── a) El panel ───────────────────────────────────────────────────────
  const A = await hastaLaReceta(armar())
  A.abrirPanelLote('i-harina')
  chk('tocar el renglón abre el panel', A.__doc.getElementById('pr-lote-panel').hidden === false && A.estado.panelLote?.ingredienteId === 'i-harina')
  chk('… con el ingrediente en el título', A.__doc.getElementById('pr-lote-panel-titulo').textContent === 'Lote de Harina')
  const tar = A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('una tarjeta por lote', (tar.match(/class="pr-lp__tarjeta"/g) || []).length === 3, tar)
  chk('… con la marca grande', /pr-lp__marca">Júpiter</.test(tar) && /pr-lp__marca">Wali</.test(tar))
  chk('… el lote', /pr-lp__lote">Lote 24518</.test(tar) && /pr-lp__lote">Lote W-9</.test(tar))
  chk('… y cuánto queda', /pr-lp__queda-num">200 kg</.test(tar) && /pr-lp__queda-num">250,5 kg</.test(tar), tar)
  chk('… el elegido marcado', /data-lote-op="3" aria-pressed="true"/.test(tar) && (tar.match(/aria-pressed="true"/g) || []).length === 1)
  chk('sin stock:ver no hay fecha y no se consulta', !/pr-lp__fecha/.test(tar) && A.__consultasFecha() === 0)
  const otros = A.__doc.getElementById('pr-lote-panel-otros').innerHTML
  chk('"Otro lote" va APARTE de las tarjetas', !/Otro lote/.test(tar) && /Otro lote de Harina 000 · Júpiter/.test(otros) && /Otro lote de Harina 000 · Wali/.test(otros))
  chk('… en su propio bloque, abajo', FUENTE.indexOf('id="pr-lote-panel-tarjetas"') < FUENTE.indexOf('id="pr-lote-panel-otros"') &&
    FUENTE.indexOf('id="pr-lote-panel-tarjetas"') > 0)
  // Elegir una tarjeta pone ese lote en el renglón y cierra.
  A.elegirTarjetaLote('0')
  chk('elegir una tarjeta pone ESE lote', A.estado.masa.lotes['i-harina'].insumo_id === 'ins-h1' && A.estado.masa.lotes['i-harina'].lote === '24518')
  chk('… en el renglón', /Lote 24518/.test(botonLote(A, 'i-harina')))
  chk('… y cierra el panel', A.__doc.getElementById('pr-lote-panel').hidden === true && A.estado.panelLote === null)
  // Un solo insumo: "Otro lote de este insumo".
  A.abrirPanelLote('i-azucar')
  chk('con un solo insumo: "Otro lote de este insumo"', /Otro lote de este insumo/.test(A.__doc.getElementById('pr-lote-panel-otros').innerHTML))
  chk('sin lotes con stock lo dice', /No hay lotes con stock cargado/.test(A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML))
  // Escape cierra.
  let prevenido = false
  A.teclaPanelLote({ key: 'Escape', preventDefault() { prevenido = true } })
  chk('Escape cierra el panel', A.__doc.getElementById('pr-lote-panel').hidden === true && prevenido)
  // No-materia prima: "Sin lote" es una tarjeta más.
  A.abrirPanelLote('i-lecitina')
  const tLec = A.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('lo que no es materia prima ofrece "Sin lote" como tarjeta', /pr-lp__lote">Sin lote</.test(tLec) && /pr-lp__queda-num">240 g</.test(tLec))
  A.cerrarPanelLote()

  // Con stock:ver: la fecha de cada lote (la más vieja si hay varias filas).
  const F = await hastaLaReceta(armar({ stockVer: true, fechas: [
    // La vieja PRIMERO: "la última gana" daría 10/09 y la prueba lo vería.
    { insumo_id: 'ins-h1', lote: '24518', desde: '2026-09-02' },
    { insumo_id: 'ins-h1', lote: '24518', desde: '2026-09-10' },
    { insumo_id: 'ins-h2', lote: 'W-9', desde: '2026-08-30' },
  ] }))
  F.abrirPanelLote('i-harina')
  const tF = F.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML
  chk('con stock:ver: la fecha del lote', /pr-lp__fecha">desde 02\/09\/2026</.test(tF) && /pr-lp__fecha">desde 30\/08\/2026</.test(tF), tF)
  chk('… y el que no tiene fecha no inventa una', (tF.match(/pr-lp__fecha/g) || []).length === 2)
  chk('… se consultó v_stock_por_lote UNA vez', F.__consultasFecha() === 1)
  chk('una fecha ilegible no dibuja nada', F.textoFechaLote('ayer') === '' && F.textoFechaLote(null) === '')

  // Si la lectura de fechas falla, la masa se carga igual, sin fechas.
  const E = armar({ stockVer: true })
  E.__tablas.v_stock_por_lote = () => ({ data: null, error: { message: 'sin red' } })
  await hastaLaReceta(E)
  E.abrirPanelLote('i-harina')
  chk('si las fechas no llegan, la masa sigue y no hay fechas', !!E.estado.masa && !!E.estado.datosMasa && !E.estado.errorSala &&
    !/pr-lp__fecha/.test(E.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML), E.estado.errorSala)

  // ── HTML malicioso en marca, lote e insumo ────────────────────────────
  const ING = marca('ingId')
  const X = await hastaLaReceta(armar({ anterior: null,
    original: { receta_id: 'r1', version: 1, items: [{ ingrediente_id: ING, ingrediente: marca('ingrediente'), orden: 1, descuenta_stock: true, cantidad_kg: 25, insumo_preferido_id: null }] },
    insumos: [
      { ingrediente_id: ING, insumo_id: 'ins-x', nombre: marca('insumo'), marca: marca('marca'), tipo: 'materia_prima', lotes: [{ lote: marca('lote'), stock: 10 }] },
      { ingrediente_id: ING, insumo_id: 'ins-y', nombre: marca('insumo2'), marca: '', tipo: 'insumo', lotes: [] },
    ] }), 'original')
  chequearMarcas(chk, 'el botón del lote vacío', filas(X), ['ingId', 'ingrediente'])
  X.abrirPanelLote(ING)
  chequearMarcas(chk, 'tarjetas de lote', X.__doc.getElementById('pr-lote-panel-tarjetas').innerHTML, ['marca', 'insumo', 'lote'])
  chequearMarcas(chk, '"Otro lote" del panel', X.__doc.getElementById('pr-lote-panel-otros').innerHTML, ['marca', 'insumo'])
  X.elegirTarjetaLote('0')
  chequearMarcas(chk, 'el renglón con el lote elegido', filas(X), ['lote', 'ingId', 'ingrediente'])
  // Y el campo del lote escrito a mano, que lleva el id y el nombre del ingrediente.
  X.abrirPanelLote(ING)
  X.elegirTarjetaLote(String(X.opcionesLote(X.estado.datosMasa, ING).findIndex(o => o.manual)))
  const conManual = filas(X)
  chk('el campo a mano está en el renglón', /data-lote-manual=/.test(conManual))
  chequearMarcas(chk, 'el campo del lote a mano', conManual.slice(conManual.indexOf('pr-rec__manual')), ['ingId', 'ingrediente'])
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
  chk('tarjetas de 88 px de alto', /min-height: 88px/.test(reg('.pr-lp__tarjeta')))
  chk('separadas 10 px (8 como mínimo)', /gap: 0\.625rem/.test(reg('.pr-lp__tarjetas')))
  chk('scroll interno del panel, no de la página', /overflow-y: auto/.test(reg('.pr-lp__tarjetas')) && /max-height: calc\(100vh - 2rem\)/.test(reg('.pr-lp__caja')))
  chk('"Otro lote" apartado con una línea', /border-top: 2px dashed/.test(reg('.pr-lp__otros')))
  chk('el botón del renglón mide lo de la tablet', /min-height: var\(--pr-alto-boton\)/.test(reg('.pr-rec__lote')))
  chk('la fecha solo con stock:ver', /if \(puedeVerStockEn\(estado\.unidadId\) !== true\) return/.test(FUENTE))
}

fin()
