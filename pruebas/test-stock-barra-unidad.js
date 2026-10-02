// LA BARRA DE UNIDAD DE ARRIBA en modulos/stock.html (28/09/2026).
//
// La barra (js/barra-unidad.js) elige la fábrica UNA vez para toda la app, y
// Stock filtra lo que MUESTRA por esa unidad. Esta suite EJECUTA los renders
// reales del módulo (juntados por clausura, como test-stock-xss.js) con un
// document falso y afirma:
//  - "Todas" muestra todo, con el detalle por unidad: un insumo en varias
//    unidades es UNA tarjeta con la suma y un renglón por unidad; uno en una
//    sola lleva el nombre de su unidad;
//  - una unidad elegida muestra solo lo suyo (stock, historial de recuentos,
//    mermas, tránsito e historial de transferencias por origen O destino);
//  - con una unidad elegida donde la pantalla no tiene permiso (cada vista
//    tiene su propio alcance: ver, ajustar, dar de baja, enviar) la pantalla
//    LO DICE en vez de quedar vacía;
//  - cambiar la elección repinta sin recargar (alCambiarBarra), y el recuento
//    guarda lo contado y relee la unidad nueva;
//  - lo que necesita UNA unidad (el recuento, un movimiento, una transferencia)
//    la pide con "Todas" y la trae puesta con una elegida (y con permiso);
//  - el catálogo y los alias dicen en chico que la barra no los filtra;
//  - los chips viejos de unidad (stock, historial, mermas) ya no están.
//
// pasaFiltroUnidad es la REAL de js/barra-unidad.js: extraerFn la encuentra por
// el import del módulo (pruebas/imports.js).
//
//   node pruebas/test-stock-barra-unidad.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { execFileSync } = require('child_process')
const { construirCon, scriptModulo } = require('./sandbox')
const { FUNCIONES_CANTIDADES, CONSTANTES_CANTIDADES } = require('./cantidades-comun')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
const FUENTE = leer(ARCHIVO)
// El estado de modulos/stock.html justo ANTES de este cambio (la barra ya se
// cargaba, los chips viejos todavía estaban). Commit FIJO, nunca HEAD.
const BASE_COMMIT = '5592f5a'
const { chk, esperas, fin } = arnes()

// Lo que define el preludio y NO se extrae: red, historial del navegador,
// cableados que acá no aportan nada, y lo que la suite quiere OBSERVAR
// (guardarConteoAhora, cargarRecuento, cargarLotesMov).
const STUBS = new Set([
  'formatearFecha', 'mostrarError', 'mostrarExito', 'abrirConHistorial', 'asegurarCatalogo',
  'guardarConteoAhora', 'cargarRecuento', 'cargarLotesMov', 'prepararCantidadMov',
  'poblarSelectorMotivoTipo', 'actualizarContadorRec', 'renderizarClaseRecuento', 'mostrarVista',
  'verificarSesion', 'mostrarBannerVersion', 'renderizarItemsTransf', 'limpiarErroresTransf',
  'limpiarErroresMov', 'quitarInsumoMov', 'elegirInsumoMov',
  'puedeDarBaja',
])

const RENDERS = [
  'esc', 'pasaFiltroUnidad', 'aplicarEstadoBarra', 'alCambiarBarra',
  'cargarStock', 'renderizarStock', 'renderizarHistorial', 'renderizarMermas',
  'renderizarTransito', 'renderizarTransfHistorial',
  'cargarUnidadesRecuento', 'unidadRecuentoPorBarra', 'renderizarChipsUnidadRecuento',
  'aplicarModoMov', 'renderizarUnidadMov', 'abrirModalTransferencia', 'renderizarOrigenTransf',
  // Las de js/cantidades.js (02/10/2026): importadas, se suman a mano.
  ...FUNCIONES_CANTIDADES,
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...RENDERS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const finC = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, finC === -1 ? 400 : finC + 1))
      }
    }
  }
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      dataset: {}, style: {}, querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, focus(){},
      removeAttribute(){}, setAttribute(){}, closest: () => nuevoEl('closest'), setSelectionRange(){},
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
  }
  var __els = new Map()
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null, addEventListener(){},
  }
  var window = { scrollTo(){}, addEventListener(){}, removeEventListener(){} }
  var history = { pushState(){}, back(){} }
  var console = { log(){}, warn(){}, error(){} }
  var __datos = {}
  var __llamadas = { guardar: 0, recuentos: [], lotesMov: 0 }
  function __consulta(tabla) {
    const q = {}
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'range', 'not', 'or']) q[k] = () => q
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: __datos[tabla] ?? [], error: null }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t), rpc: async () => ({ data: null, error: null }) }
  function mostrarError() {}
  function mostrarExito() {}
  function formatearFecha(f) { const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function abrirConHistorial() {}
  async function asegurarCatalogo() {}
  async function guardarConteoAhora() { __llamadas.guardar++ }
  async function cargarRecuento() { __llamadas.recuentos.push(estado.unidadRecuento) }
  function cargarLotesMov() { __llamadas.lotesMov++ }
  function prepararCantidadMov() {}
  function poblarSelectorMotivoTipo() {}
  function actualizarContadorRec() {}
  function renderizarClaseRecuento() {}
  function mostrarVista() {}
  function renderizarItemsTransf() {}
  function limpiarErroresTransf() {}
  function limpiarErroresMov() {}
  function quitarInsumoMov() {}
  async function elegirInsumoMov() {}
  function puedeDarBaja() { return tieneTarea('stock', 'dar_baja') }
`

const RETORNO = 'estado, __el(id){ return document.getElementById(id) }, __llamadas, __setDatos(t, d){ __datos[t] = d }'

const NUSS = 'u-nuss', DOLCE = 'u-dolce', MENGUI = 'u-mengui'
const BARRA = [
  { id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' },
  { id: DOLCE, nombre: 'Dolce Pasta', prefijo: 'D' },
  { id: MENGUI, nombre: 'Mengui', prefijo: 'O' },
]

function fila(unidad, insumo, nombre, cantidad, extra = {}) {
  return {
    unidad_negocio_id: unidad, insumo_id: insumo, insumo_nombre: nombre, marca: null, unidad_medida: 'kg',
    tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null, cantidad_total: cantidad,
    lotes_distintos: 1, presentaciones: 0, contenido_unico: null, kilos_sueltos: 0, vista_preferida: 'base', ...extra,
  }
}

const SRC = scriptModulo(ARCHIVO)
let MOLDE = null
try { MOLDE = clausura(SRC) } catch (e) { chk('la clausura de funciones se arma', false, String(e && e.stack || e)) }

function nuevo() {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: MOLDE.funciones, constantes: [...CONSTANTES_CANTIDADES, ...MOLDE.constantes], retorno: RETORNO })
  const E = S.estado
  E.miRolApp = 'usuario'
  E.misTareas = new Set(['stock:ver', 'stock:ajustar_inventario', 'stock:dar_baja', 'stock:enviar_transferencia'])
  // Nuss y Dolce se ven; Mengui es de la PERSONA (otra tarea) pero no de Stock.
  E.unidadesStock = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  E.unidadesAjuste = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  E.unidadesBaja = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }]
  E.unidadesEnvio = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  E.destinos = BARRA.map(({ id, nombre }) => ({ id, nombre }))
  E.stock = [
    fila(NUSS, 'harina', 'Harina 000', 200),
    fila(DOLCE, 'harina', 'Harina 000', 50),
    fila(NUSS, 'caja', 'Caja N°1', 30, { tipo: 'insumo', categoria: 'Cajas', unidad_medida: 'un' }),
    fila(DOLCE, 'lecitina', 'Lecitina', -5, { categoria: 'Aditivos' }),
  ]
  E.recuentos = [
    { id: 'r-nuss', estado: 'cerrado', unidad_negocio_id: NUSS, unidad_nombre: 'Cucuruchos Nuss', abierto_en: '2026-09-10T12:00:00Z', cerrado_en: '2026-09-10T13:00:00Z', items: 3, con_diferencia: 1 },
    { id: 'r-dolce', estado: 'abierto', unidad_negocio_id: DOLCE, unidad_nombre: 'Dolce Pasta', abierto_en: '2026-09-11T12:00:00Z', items: 2, con_diferencia: 0 },
  ]
  const merma = (u, n, mes) => ({ unidad_negocio_id: u, unidad_nombre: n, fecha: mes.slice(0, 8) + '10', mes, insumo_nombre: 'Harina 000', marca: null,
    unidad_medida: 'kg', lote: null, cantidad: 5, origen: 'baja', motivo_tipo: 'rotura', motivo_texto: null })
  E.mermas = [merma(NUSS, 'Cucuruchos Nuss', '2026-09-01'), merma(NUSS, 'Cucuruchos Nuss', '2026-09-01'), merma(DOLCE, 'Dolce Pasta', '2026-09-01')]
  E.transito = [
    { id: 't-nd', unidad_origen_id: NUSS, origen_nombre: 'Cucuruchos Nuss', unidad_destino_id: DOLCE, destino_nombre: 'Dolce Pasta', fecha: '2026-09-10', items: 1, dias_en_transito: 1 },
    { id: 't-dm', unidad_origen_id: DOLCE, origen_nombre: 'Dolce Pasta', unidad_destino_id: MENGUI, destino_nombre: 'Mengui', fecha: '2026-09-10', items: 1, dias_en_transito: 1 },
  ]
  E.transferencias = [
    { id: 'h-nm', estado: 'aceptada', unidad_origen_id: NUSS, origen_nombre: 'Cucuruchos Nuss', unidad_destino_id: MENGUI, destino_nombre: 'Mengui', fecha: '2026-09-01', items: 1, items_con_diferencia: 0 },
    { id: 'h-dm', estado: 'aceptada', unidad_origen_id: DOLCE, origen_nombre: 'Dolce Pasta', unidad_destino_id: MENGUI, destino_nombre: 'Mengui', fecha: '2026-09-02', items: 1, items_con_diferencia: 0 },
  ]
  E.cargados = new Set(['stock', 'historial', 'mermas', 'transito'])
  return S
}

const barra = (elegida, mostrar = true) => ({ elegida, unidades: BARRA, mostrar })

async function correr() {
  if (!MOLDE) return

  // ── STOCK: "Todas" ───────────────────────────────────────────────────────
  {
    const S = nuevo(); const E = S.estado
    await S.alCambiarBarra(barra(null))
    const h = S.__el('lista-stock').innerHTML
    chk('Todas: la harina de las dos unidades es UNA tarjeta sumada', (h.match(/fila-stock--grupo/g) || []).length === 1, h)
    chk('Todas: la suma de la harina es 250 kg', />\s*250 kg\s*</.test(h), h)
    chk('Todas: la tarjeta dice en cuántas unidades está', /en 2 unidades/.test(h))
    chk('Todas: un renglón por unidad, cada uno abre SU detalle', /data-stock="harina" data-unidad="u-nuss"/.test(h) && /data-stock="harina" data-unidad="u-dolce"/.test(h), h)
    chk('Todas: cada renglón dice su unidad y su cantidad', /Cucuruchos Nuss<\/span>\s*<span[^>]*>200 kg/.test(h) && /Dolce Pasta<\/span>\s*<span[^>]*>50 kg/.test(h), h)
    chk('Todas: un insumo en UNA sola unidad lleva el nombre de su unidad', /Caja N°1[\s\S]*?Cucuruchos Nuss/.test(h) && /Lecitina[\s\S]*?Dolce Pasta/.test(h), h)
    chk('Todas: el saldo negativo se sigue marcando', /Saldo negativo/.test(h))
    chk('Todas: sin aviso de permiso', S.__el('stock-aviso-unidad').hidden === true)
    // Con una sola unidad de stock no hay nada que agrupar ni nombrar.
    E.unidadesStock = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }]
    E.stock = E.stock.filter(f => f.unidad_negocio_id === NUSS)
    S.renderizarStock()
    const h1 = S.__el('lista-stock').innerHTML
    chk('una sola unidad de stock: sin tarjetas sumadas ni nombre de unidad', !/fila-stock--grupo/.test(h1) && !/Cucuruchos Nuss/.test(h1), h1)
  }

  // ── STOCK: una unidad elegida, y cambiar la elección repinta ─────────────
  {
    const S = nuevo()
    await S.alCambiarBarra(barra(DOLCE))
    const h = S.__el('lista-stock').innerHTML
    chk('Dolce: solo lo de Dolce (harina 50 y lecitina)', /50 kg/.test(h) && /Lecitina/.test(h) && !/Caja N°1/.test(h) && !/200 kg/.test(h), h)
    chk('Dolce: sin tarjeta sumada ni nombre de unidad (es obvio)', !/fila-stock--grupo/.test(h) && !/Dolce Pasta/.test(h), h)
    chk('Dolce: cada fila abre el detalle de Dolce', /data-unidad="u-dolce"/.test(h) && !/data-unidad="u-nuss"/.test(h))
    await S.alCambiarBarra(barra(NUSS))
    const h2 = S.__el('lista-stock').innerHTML
    chk('cambiar a Nuss repinta sin recargar: ahora la harina es 200 y está la caja', /200 kg/.test(h2) && /Caja N°1/.test(h2) && !/Lecitina/.test(h2), h2)
    await S.alCambiarBarra(barra(null))
    chk('volver a Todas repinta con la tarjeta sumada', /fila-stock--grupo/.test(S.__el('lista-stock').innerHTML))
  }

  // ── STOCK: unidad elegida SIN permiso de ver ─────────────────────────────
  {
    const S = nuevo()
    await S.alCambiarBarra(barra(MENGUI))
    const aviso = S.__el('stock-aviso-unidad')
    chk('Mengui (sin stock:ver): el aviso lo dice con el nombre', aviso.hidden === false && /No tenés permiso para ver el stock en Mengui/.test(aviso.textContent), aviso.textContent)
    chk('Mengui: la lista queda vacía y el "no hay nada" NO se muestra', S.__el('lista-stock').innerHTML === '' && S.__el('stock-vacio').hidden === true)
  }

  // ── STOCK: una unidad con permiso pero sin stock ─────────────────────────
  {
    const S = nuevo(); const E = S.estado
    E.stock = E.stock.filter(f => f.unidad_negocio_id === NUSS)
    await S.alCambiarBarra(barra(DOLCE))
    const v = S.__el('stock-vacio')
    chk('Dolce sin filas: el vacío dice que no hay stock EN Dolce (no "el libro está en cero")', v.hidden === false && /Todavía no hay stock en Dolce Pasta/.test(v.textContent), v.textContent)
  }

  // ── cargarStock espera a la barra antes de dibujar ───────────────────────
  {
    const S = nuevo(); const E = S.estado
    E.cargados = new Set()
    let soltar
    E.barraLista = new Promise(r => { soltar = r })
    S.__setDatos('v_mis_unidades_stock', E.unidadesStock)
    S.__setDatos('v_stock_insumos', E.stock)
    const p = S.cargarStock()
    await new Promise(r => setTimeout(r, 10))
    chk('cargarStock NO dibuja antes de que la barra sepa las unidades', S.__el('lista-stock').innerHTML === '' && !E.cargados.has('stock'))
    E.unidadBarra = DOLCE
    soltar()
    await p
    const h = S.__el('lista-stock').innerHTML
    chk('cargarStock dibuja con la unidad de la barra cuando llega', /Lecitina/.test(h) && !/Caja N°1/.test(h) && E.cargados.has('stock'), h)
  }

  // ── HISTORIAL DE RECUENTOS ───────────────────────────────────────────────
  {
    const S = nuevo(); const E = S.estado
    await S.alCambiarBarra(barra(null))
    const h = S.__el('lista-historial').innerHTML
    chk('historial Todas: los dos recuentos, cada uno con su unidad', /r-nuss/.test(h) && /r-dolce/.test(h) && /Cucuruchos Nuss/.test(h) && /Dolce Pasta/.test(h))
    await S.alCambiarBarra(barra(NUSS))
    const h2 = S.__el('lista-historial').innerHTML
    chk('historial Nuss: solo el de Nuss', /r-nuss/.test(h2) && !/r-dolce/.test(h2), h2)
    await S.alCambiarBarra(barra(MENGUI))
    chk('historial Mengui (ni ver ni ajustar): lo dice', /No tenés permiso para ver los recuentos en Mengui/.test(S.__el('hist-aviso-unidad').textContent) && S.__el('lista-historial').innerHTML === '')
    // Solo AJUSTAR (sin ver) también deja ver los recuentos (v_recuentos: ver O ajustar).
    E.unidadesStock = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }]
    E.unidadesAjuste = [{ id: DOLCE, nombre: 'Dolce Pasta' }]
    await S.alCambiarBarra(barra(DOLCE))
    chk('historial Dolce con solo ajustar: se ve (no hay aviso de permiso)', S.__el('hist-aviso-unidad').hidden === true && /r-dolce/.test(S.__el('lista-historial').innerHTML))
    E.recuentos = E.recuentos.filter(r => r.unidad_negocio_id === NUSS)
    S.renderizarHistorial()
    chk('historial Dolce sin recuentos: el vacío nombra la unidad', /No hay recuentos en Dolce Pasta/.test(S.__el('hist-vacio').textContent), S.__el('hist-vacio').textContent)
  }

  // ── MERMAS ───────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.alCambiarBarra(barra(null))
    const h = S.__el('lista-mermas').innerHTML
    chk('mermas Todas: las tres pérdidas', (h.match(/merma-fila"/g) || []).length === 3, h)
    chk('mermas Todas: el detalle por unidad del mes', /merma-mes__unidades[^>]*>Cucuruchos Nuss: 2 · Dolce Pasta: 1</.test(h), h)
    await S.alCambiarBarra(barra(NUSS))
    const h2 = S.__el('lista-mermas').innerHTML
    chk('mermas Nuss: solo las dos de Nuss, sin el detalle por unidad', (h2.match(/merma-fila"/g) || []).length === 2 && !/merma-mes__unidades/.test(h2), h2)
    await S.alCambiarBarra(barra(MENGUI))
    chk('mermas Mengui (sin ver): lo dice', /No tenés permiso para ver las mermas en Mengui/.test(S.__el('mermas-aviso-unidad').textContent) && S.__el('lista-mermas').innerHTML === '')
  }

  // ── TRÁNSITO E HISTORIAL DE TRANSFERENCIAS ───────────────────────────────
  {
    const S = nuevo(); const E = S.estado
    await S.alCambiarBarra(barra(null))
    chk('tránsito Todas: los dos', /t-nd/.test(S.__el('lista-transito').innerHTML) && /t-dm/.test(S.__el('lista-transito').innerHTML))
    await S.alCambiarBarra(barra(DOLCE))
    const t = S.__el('lista-transito').innerHTML, hh = S.__el('lista-transf-historial').innerHTML
    chk('tránsito Dolce: la que LLEGA a Dolce y la que SALE de Dolce', /t-nd/.test(t) && /t-dm/.test(t), t)
    chk('historial de transferencias Dolce: solo la que salió de Dolce', /h-dm/.test(hh) && !/h-nm/.test(hh), hh)
    await S.alCambiarBarra(barra(NUSS))
    const t2 = S.__el('lista-transito').innerHTML
    chk('tránsito Nuss: solo la que sale de Nuss', /t-nd/.test(t2) && !/t-dm/.test(t2), t2)
    E.transito = []
    S.renderizarTransito()
    chk('tránsito vacío con unidad: nombra la unidad', /No hay nada en tránsito desde o hacia Cucuruchos Nuss/.test(S.__el('transito-vacio').textContent))
    await S.alCambiarBarra(barra(MENGUI))
    chk('tránsito Mengui (sin ver): lo dice y no lista nada', /No tenés permiso para ver las transferencias en Mengui/.test(S.__el('transito-aviso-unidad').textContent)
      && S.__el('lista-transito').innerHTML === '' && S.__el('lista-transf-historial').innerHTML === '')
  }

  // ── RECUENTO: una unidad para operar ─────────────────────────────────────
  {
    const S = nuevo(); const E = S.estado
    S.__setDatos('v_mis_unidades_ajuste', E.unidadesAjuste)
    E.unidadRecuento = ''
    await S.cargarUnidadesRecuento()
    chk('recuento con Todas y dos unidades: NO elige una por las dudas', E.unidadRecuento === '', E.unidadRecuento)
    chk('recuento con Todas: los chips para elegir están', S.__el('chips-unidad-recuento').hidden === false && /Dolce Pasta/.test(S.__el('chips-unidad-recuento').innerHTML))
    chk('recuento con Todas: pide elegir la unidad', /Elegí en qué unidad vas a contar/.test(S.__el('rec-aviso-unidad').textContent))
    // La barra elige Dolce: se cuenta en Dolce, sin chips, guardando antes.
    await S.alCambiarBarra(barra(DOLCE))
    chk('barra Dolce: el recuento pasa a Dolce', E.unidadRecuento === DOLCE)
    chk('barra Dolce: relee el recuento de Dolce', S.__llamadas.recuentos.at(-1) === DOLCE, S.__llamadas.recuentos)
    chk('barra Dolce: guarda lo contado ANTES de cambiar', S.__llamadas.guardar === 1, S.__llamadas.guardar)
    chk('barra Dolce: sin chips (la unidad viene de la barra)', S.__el('chips-unidad-recuento').hidden === true && S.__el('chips-unidad-recuento').innerHTML === '')
    chk('barra Dolce: sin aviso', S.__el('rec-aviso-unidad').hidden === true)
    // La misma unidad otra vez: no relee ni guarda de más.
    await S.alCambiarBarra(barra(DOLCE))
    chk('la misma unidad otra vez: no vuelve a leer ni a guardar', S.__llamadas.recuentos.length === 1 && S.__llamadas.guardar === 1)
    // Mengui, sin ajustar_inventario ahí.
    await S.alCambiarBarra(barra(MENGUI))
    chk('barra Mengui: no cuenta en ninguna', E.unidadRecuento === '')
    chk('barra Mengui: dice que no hay permiso', /No tenés permiso para hacer recuentos \(ajustar el inventario\) en Mengui/.test(S.__el('rec-aviso-unidad').textContent), S.__el('rec-aviso-unidad').textContent)
    // Una sola unidad de ajuste y Todas: esa, sin preguntar.
    E.unidadesAjuste = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }]
    await S.alCambiarBarra(barra(null))
    chk('Todas con UNA sola unidad de ajuste: se cuenta en esa', E.unidadRecuento === NUSS)
    chk('Todas con una sola: sin chips ni aviso', S.__el('chips-unidad-recuento').hidden === true && S.__el('rec-aviso-unidad').hidden === true)
  }

  // ── MOVIMIENTO PUNTUAL: la unidad viene puesta, no fija ──────────────────
  {
    const S = nuevo(); const E = S.estado
    await S.alCambiarBarra(barra(NUSS))
    E.mov = { modo: 'ajuste', unidadId: '', unidadFija: false, insumo: null, signo: 0, recuento: null, presentacion: undefined }
    S.aplicarModoMov('ajuste')
    chk('movimiento con la barra en Nuss: viene puesta Nuss', E.mov.unidadId === NUSS, E.mov.unidadId)
    chk('movimiento: la unidad NO es fija (se puede cambiar)', E.mov.unidadFija === false && S.__el('mov-chips-unidad').hidden === false && /Dolce Pasta/.test(S.__el('mov-chips-unidad').innerHTML))
    chk('movimiento: sin aviso', S.__el('mov-aviso-unidad-barra').hidden === true)
    // Baja en Dolce: dar_baja solo en Nuss.
    await S.alCambiarBarra(barra(DOLCE))
    E.mov = { modo: 'baja', unidadId: '', unidadFija: false, insumo: null, signo: 0, recuento: null, presentacion: undefined }
    S.aplicarModoMov('baja')
    chk('baja con la barra en Dolce (sin dar_baja ahí): queda en la única posible', E.mov.unidadId === NUSS, E.mov.unidadId)
    const aviso = S.__el('mov-aviso-unidad-barra')
    chk('baja: dice que no hay permiso en Dolce y en cuál queda', aviso.hidden === false && /No tenés permiso para dar de baja mercadería en Dolce Pasta/.test(aviso.textContent) && /única/.test(aviso.textContent), aviso.textContent)
    chk('baja: el campo de unidad se muestra (para ver en cuál queda)', S.__el('mov-campo-unidad').hidden === false)
    // Con Todas: con varias, se elige acá.
    await S.alCambiarBarra(barra(null))
    E.mov = { modo: 'ajuste', unidadId: '', unidadFija: false, insumo: null, signo: 0, recuento: null, presentacion: undefined }
    S.aplicarModoMov('ajuste')
    chk('movimiento con Todas y dos unidades: pide elegir (ninguna puesta)', E.mov.unidadId === '' && S.__el('mov-chips-unidad').hidden === false)
  }

  // ── TRANSFERENCIA: el origen viene puesto ────────────────────────────────
  {
    const S = nuevo(); const E = S.estado
    await S.alCambiarBarra(barra(DOLCE))
    S.abrirModalTransferencia()
    chk('transferencia con la barra en Dolce: sale de Dolce', E.transf.origenId === DOLCE, E.transf.origenId)
    chk('transferencia: el origen se puede cambiar (chips)', /Cucuruchos Nuss/.test(S.__el('transf-chips-origen').innerHTML))
    chk('transferencia: sin aviso', S.__el('transf-aviso-unidad-barra').hidden === true)
    await S.alCambiarBarra(barra(MENGUI))
    S.abrirModalTransferencia()
    chk('transferencia con la barra en Mengui (sin enviar ahí): pide elegir', E.transf.origenId === '', E.transf.origenId)
    chk('transferencia Mengui: dice que no hay permiso', /No tenés permiso para enviar mercadería en Mengui/.test(S.__el('transf-aviso-unidad-barra').textContent), S.__el('transf-aviso-unidad-barra').textContent)
    await S.alCambiarBarra(barra(null))
    S.abrirModalTransferencia()
    chk('transferencia con Todas y dos orígenes: se elige acá', E.transf.origenId === '')
  }

  // ── CATÁLOGO Y ALIAS: la barra no los filtra, y se dice ─────────────────
  {
    const S = nuevo()
    S.aplicarEstadoBarra(barra(NUSS, true))
    chk('con la barra a la vista: el catálogo dice que no se filtra', S.__el('catalogo-nota-unidad').hidden === false)
    chk('con la barra a la vista: los alias dicen que no se filtran', S.__el('alias-nota-unidad').hidden === false)
    S.aplicarEstadoBarra({ elegida: null, unidades: [BARRA[0]], mostrar: false })
    chk('sin barra (una sola unidad): no hay nota', S.__el('catalogo-nota-unidad').hidden === true && S.__el('alias-nota-unidad').hidden === true)
    chk('sin barra: no se filtra nada', S.estado.unidadBarra === null)
  }
}

// ── LO ESTÁTICO: los chips viejos se fueron y el cableado está ────────────
{
  const base = execFileSync('git', ['show', `${BASE_COMMIT}:modulos/stock.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  for (const id of ['chips-unidad-stock', 'chips-unidad-historial', 'chips-unidad-mermas']) {
    chk(`el baseline ${BASE_COMMIT} tenía #${id} (si no, este chequeo no mide nada)`, base.includes(`id="${id}"`))
    chk(`#${id} ya no está (lo decide la barra de arriba)`, !FUENTE.includes(id))
  }
  for (const fn of ['renderizarChipsUnidadStock', 'renderizarChipsUnidadHistorial', 'renderizarChipsUnidadMerma']) {
    chk(`${fn} ya no existe`, !new RegExp(`function ${fn}\\b`).test(FUENTE))
  }
  chk('el filtro viejo por estado.unidadStock / unidadHist / unidadMerma ya no está',
    !/estado\.unidad(Stock|Hist|Merma)\b/.test(FUENTE))
  chk('importa lo que usa de js/barra-unidad.js',
    /import \{[^}]*\bunidadesDeLaBarra\b[^}]*\balCambiarUnidad\b[^}]*\bpasaFiltroUnidad\b[^}]*\} from '\.\.\/js\/barra-unidad\.js'/.test(FUENTE))
  chk('el <head> sigue cargando la barra', /<script type="module" src="\.\.\/js\/barra-unidad\.js"><\/script>/.test(FUENTE))
  const init = extraerFn(SRC, 'init')
  const iBarra = init.indexOf('estado.barraLista = unidadesDeLaBarra()')
  const iSub = init.indexOf('alCambiarUnidad(alCambiarBarra)')
  const iEmp = init.indexOf(".from('empleados')")
  chk('init pide la barra en paralelo (antes de consultar empleados)', iBarra !== -1 && iEmp !== -1 && iBarra < iEmp)
  chk('init se suscribe a los cambios de la barra', iSub !== -1)
  for (const fn of ['cargarStock', 'cargarHistorial', 'cargarMermas', 'cargarTransito', 'cargarUnidadesRecuento']) {
    const cuerpo = extraerFn(SRC, fn)
    chk(`${fn} espera a la barra antes de dibujar`, /await estado\.barraLista/.test(cuerpo))
  }
  // El recuento es lo único que consulta por unidad: con turno.
  const rec = extraerFn(SRC, 'cargarRecuento')
  chk('cargarRecuento lleva turno', /const turno = \+\+turnoRecuento/.test(rec) && (rec.match(/turno !== turnoRecuento/g) || []).length >= 2)
  const items = extraerFn(SRC, 'cargarItemsRecuento')
  chk('cargarItemsRecuento no escribe si cambió el recuento en el medio', /const rec = estado\.recuento/.test(items) && /if \(estado\.recuento !== rec\) return/.test(items))
}

if (MOLDE) esperas.push(correr())
fin()
