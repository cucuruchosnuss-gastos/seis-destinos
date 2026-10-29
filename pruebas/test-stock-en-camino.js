// "EN CAMINO DESDE OTRA EMPRESA" EN STOCK (29/10/2026, rama
// ci-prueba/recibir-stock, pedido de Facu del 29/10). Toda orden de retiro a
// otra empresa del grupo queda EN TRÁNSITO hasta que la empresa que recibe la
// acepta. La base (leída con pg_get_functiondef el 29/10/2026):
//   recepciones_grupo(p_unidad_negocio_id, p_estado) → jsonb array (con
//     stock:ver o stock:recibir_transferencia CON ALCANCE en el destino);
//   recibir_orden_grupo(p_recepcion_id, p_items, p_observaciones), que pide
//     stock:recibir_transferencia en el destino y TODOS los renglones.
// Lo que se prueba, EJECUTANDO las funciones REALES de modulos/stock.html con
// un contenedor falso que arma sus campos desde el HTML que se le escribe:
//  - quién ve la sección (stock:ver o recibir en la fábrica de la barra) y
//    quién ve "Recibir" (recibir_transferencia en la fábrica que recibe);
//  - qué se lee (dos llamadas, con la fábrica de la barra), sin la fábrica de
//    pruebas y solo lo de la barra;
//  - la tarjeta (orden, remito, fecha, desde, transporte, renglones con lote
//    y cantidad en cajas o en la unidad del insumo, con formato argentino);
//  - Recibir: completo, con diferencia y motivo, diferencia sin motivo,
//    cantidad vacía, más de lo enviado y orden anulada (el error de la base
//    TAL CUAL, pegado al botón), doble toque, Cancelar;
//  - "Recibidos": los últimos 30 días, plegado, con quién, cuándo (hora de
//    Argentina) y las diferencias;
//  - el escape de TODO lo de la base, también en atributos;
//  - #st-en-camino / ?seccion=en-camino lleva a la sección.
//
//   node pruebas/test-stock-en-camino.js
//   ARCHIVO_TEST=<copia de modulos/stock.html> node pruebas/test-stock-en-camino.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'stock.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, esperas, fin } = arnes()

// ── El contenedor falso ─────────────────────────────────────────────────────
// Al escribirle innerHTML arma un elemento por etiqueta, con sus atributos
// (decodificados, como hace el navegador), dataset, hidden y clases. Los
// <input> y <textarea> son inputFalso(): se comportan como los del navegador
// al tipear, así enlazarCampoNumero (el REAL de js/utils.js) trabaja igual.
function decodificar(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}
const aDataset = (n) => n.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
function coincide(el, sel) {
  return sel.split(',').some(s => {
    const m = /^\[([a-z-]+)\]$/.exec(s.trim())
    if (!m) throw new Error('selector no soportado por el contenedor falso: ' + s)
    return Object.prototype.hasOwnProperty.call(el.attrs, m[1])
  })
}
function elementoFalso(tag, attrs) {
  const el = (tag === 'input' || tag === 'textarea') ? inputFalso(attrs.value ?? '') : { textContent: '' }
  const clases = new Set((attrs.class || '').split(/\s+/).filter(Boolean))
  el.tagName = tag.toUpperCase()
  el.attrs = attrs
  el.dataset = {}
  for (const [k, v] of Object.entries(attrs)) if (k.startsWith('data-')) el.dataset[aDataset(k)] = v
  el.hidden = Object.prototype.hasOwnProperty.call(attrs, 'hidden')
  el.disabled = Object.prototype.hasOwnProperty.call(attrs, 'disabled')
  el.classList = {
    toggle(c, si) { const on = si === undefined ? !clases.has(c) : !!si; if (on) clases.add(c); else clases.delete(c); return on },
    contains: (c) => clases.has(c), add: (c) => clases.add(c), remove: (c) => clases.delete(c),
  }
  el.closest = (sel) => (coincide(el, sel) ? el : null)
  if (!el.setAttribute) el.setAttribute = (k, v) => { attrs[k] = v }
  return el
}
function contenedorFalso() {
  let html = ''
  let els = []
  const c = {
    hidden: true, scrolls: 0,
    get innerHTML() { return html },
    set innerHTML(v) {
      html = String(v)
      els = []
      for (const m of html.matchAll(/<([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*>/g)) {
        const attrs = {}
        for (const a of m[2].matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] === undefined ? '' : decodificar(a[2])
        els.push(elementoFalso(m[1], attrs))
      }
    },
    querySelectorAll: (sel) => els.filter(e => coincide(e, sel)),
    querySelector: (sel) => els.find(e => coincide(e, sel)) || null,
    scrollIntoView() { c.scrolls++ },
  }
  return c
}

// ── El sandbox ──────────────────────────────────────────────────────────────
const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  ${fuenteNumeros()}
  var __caja = null
  var __els = new Map()
  function __el(id) {
    if (id === 'st-en-camino') return __caja
    if (!__els.has(id)) __els.set(id, { id, hidden: true, innerHTML: '', textContent: '' })
    return __els.get(id)
  }
  var document = { getElementById: __el }
  var __ubicacion = { hash: '', search: '' }
  var window = { get location() { return __ubicacion } }
  var __rpcs = []
  var __respuestas = {}
  var supabase = {
    rpc(n, p) {
      __rpcs.push([n, JSON.parse(JSON.stringify(p))])
      const f = __respuestas[n]
      return Promise.resolve(typeof f === 'function' ? f(p) : { data: null, error: null })
    },
  }
  var __exitos = []
  var __lecturas = []
  function mostrarExito(m) { __exitos.push(m) }
  async function cargarStock(o) { __lecturas.push(['cargarStock', o]) }
  async function cargarTerminado(o) { __lecturas.push(['cargarTerminado', o]) }
  async function cargarPendientesStock() { __lecturas.push(['cargarPendientesStock']) }
  var turnoCamino = 0
  var caminoYaMostrado = false
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(), alcancesTareas: new Map(),
    unidadBarra: null, fabrica: { ok: true, unidades: new Set(), personas: new Set(), soyDePrueba: false },
    cargados: new Set(), ptm: null,
  }
`
const FUNCIONES = ['esc', 'puedeTareaEn', 'camino', 'puedeVerEnCamino', 'puedeRecibirEnCamino', 'recibeEnAlgunaFabrica',
  'numeroCamino', 'esCajaCamino', 'decimalesCamino', 'textoCantidadCamino', 'fechaCamino', 'momentoCamino', 'difiereCamino',
  'enviosDeLaBarra', 'recibidosRecientes', 'cargarEnCamino', 'pintarEnCamino', 'htmlEnCamino', 'htmlEnvioCamino',
  'htmlRenglonCamino', 'htmlRenglonRecibir', 'htmlRecibidosCamino', 'htmlRecibidoCamino', 'envioDelFormCamino',
  'itemsDeEnvioCamino', 'prepararCamposCamino', 'pintarFormCamino', 'abrirRecepcion', 'cancelarRecepcion',
  'itemsParaRecibir', 'confirmarRecepcion', 'alTocarEnCamino', 'alEscribirEnCamino', 'pidieronEnCamino',
  'irAEnCaminoSiSePidio', 'ponerCantidadEnCampo', 'formatearFecha', 'formatearCantidadStock', 'pasaFiltroUnidad']
const CONSTANTES = ['DIAS_RECIBIDOS_CAMINO', 'TEXTO_FALTA_CANTIDAD_CAMINO', 'TEXTO_FALTA_MOTIVO_CAMINO', 'DECIMALES_CANTIDAD']

// tareas: { 'stock:ver': alcance, … }
function armar({ tareas = {}, barra = 'u-d', rol = 'usuario', respuestas = {}, ubicacion = {} } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: 'estado, __rpcs, __exitos, __lecturas, __setCaja(c){ __caja = c }, __setRespuestas(r){ __respuestas = r }, __setUbicacion(u){ __ubicacion = u }',
  })
  S.estado.miRolApp = rol
  S.estado.unidadBarra = barra
  for (const [k, a] of Object.entries(tareas)) { S.estado.misTareas.add(k); S.estado.alcancesTareas.set(k, a) }
  S.caja = contenedorFalso()
  S.__setCaja(S.caja)
  S.__setRespuestas(respuestas)
  S.__setUbicacion({ hash: '', search: '', ...ubicacion })
  return S
}

const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const hace = (ms) => new Date(Date.now() - ms).toISOString()

function envio(extra = {}) {
  return {
    id: 'r1', estado: 'en_transito', creada_en: '2026-10-28T12:00:00Z', recibida_en: null, recibida_por: null,
    orden_id: 'o1', codigo: 'N-0031', fecha: '2026-10-28', numero_remito: '0001-00001234', transporte: 'Camión de Juan',
    observaciones: 'Frágil', origen_id: 'u-n', origen: 'Cucuruchos Nuss', destino_id: 'u-d', destino: 'Dolce Pasta',
    items: [
      { item_id: 'i1', tipo: 'producto', descripcion: 'Cucurucho · Caja x 100', unidad: 'cajas', lote: 'L-77', cantidad_enviada: 12, cantidad_recibida: null, motivo_diferencia: null },
      { item_id: 'i2', tipo: 'insumo', descripcion: 'Harina 000 · Wali', unidad: 'kg', lote: null, cantidad_enviada: 1250.5, cantidad_recibida: null, motivo_diferencia: null },
    ],
    ...extra,
  }
}
function recibido(extra = {}) {
  return {
    ...envio({ id: 'r9', codigo: 'N-0020', estado: 'recibida', recibida_en: hace(2 * HORA), recibida_por: 'Lucía' }),
    items: [{ item_id: 'j1', tipo: 'producto', descripcion: 'Cucurucho · Caja x 100', unidad: 'cajas', lote: 'L-70', cantidad_enviada: 12, cantidad_recibida: 12, motivo_diferencia: null }],
    ...extra,
  }
}
// Las respuestas de recepciones_grupo según p_estado.
function lectura({ enTransito = [envio()], recibidos = [], error = null } = {}) {
  return (p) => (error ? { data: null, error } : { data: p.p_estado === 'en_transito' ? enTransito : recibidos, error: null })
}
const RECIBE_D = { 'stock:recibir_transferencia': { unidades: ['u-d'] } }
const VE_D = { 'stock:ver': { unidades: ['u-d'] } }
const campo = (S, attr, id) => S.caja.querySelectorAll(`[${attr}]`).find(e => Object.values(e.dataset).includes(id))
const recibidoDe = (S, id) => campo(S, 'data-camino-recibido', id)
const motivoDe = (S, id) => campo(S, 'data-camino-motivo', id)
const cajaMotivoDe = (S, id) => campo(S, 'data-camino-motivo-caja', id)
const tocar = (S, attr, valor) => {
  const el = S.caja.querySelectorAll(`[${attr}]`).find(e => valor === undefined || Object.values(e.dataset).includes(valor))
  if (!el) throw new Error('no está ' + attr)
  return S.alTocarEnCamino({ target: el })
}
// Tipear en un campo como una persona: borrar todo y escribir.
function escribir(S, el, texto) {
  el.escribirCrudo('')
  S.alEscribirEnCamino({ target: el })
  if (texto) { el.teclear(texto); S.alEscribirEnCamino({ target: el }) }
}
function escribirTexto(S, el, texto) {
  el.value = texto
  S.alEscribirEnCamino({ target: el })
}
const errorBox = (S) => S.caja.querySelector('[data-camino-error]')
const botonConfirmar = (S) => S.caja.querySelector('[data-camino-confirmar]')
const llamadasRecibir = (S) => S.__rpcs.filter(x => x[0] === 'recibir_orden_grupo')

// ═══ La pantalla ═════════════════════════════════════════════════════════════
{
  const ini = HTML.indexOf('<section class="st-camino" id="st-en-camino"')
  chk('la sección existe con id st-en-camino, escondida de entrada', /<section class="st-camino" id="st-en-camino" aria-label="En camino desde otra empresa" hidden><\/section>/.test(HTML))
  const sinAcceso = HTML.indexOf('id="sin-acceso"')
  const eleccion = HTML.indexOf('<div class="stock-eleccion" id="stock-eleccion"')
  chk('va ARRIBA: después del "sin acceso" y antes de la entrada y las vistas', ini > -1 && sinAcceso > -1 && eleccion > -1 && sinAcceso < ini && ini < eleccion)
  chk('los toques y lo que se escribe van a sus manejadores',
    /getElementById\('st-en-camino'\)\.addEventListener\('click', alTocarEnCamino\)/.test(HTML) &&
    /getElementById\('st-en-camino'\)\.addEventListener\('input', alEscribirEnCamino\)/.test(HTML))
  chk('init la lee con la barra ya leída (después de pintarMandarGrupo)', /await estado\.barraLista\n(?:[^\n]*\n){0,3}\s*pintarMandarGrupo\(\)\n(?:\s*\/\/[^\n]*\n)*\s*cargarEnCamino\(\)/.test(HTML))
  chk('con solo producto terminado, también', /if \(!insumos\) \{\n(?:[^\n]*\n){0,4}\s*estado\.barraLista\.then\(cargarEnCamino\)/.test(HTML))
  chk('al cambiar la barra se relee y se cierra un envío a medio recibir',
    /if \(estado\.enCamino\?\.leido\) \{\n\s*if \(!estado\.enCamino\.form\?\.enviando\) estado\.enCamino\.form = null\n\s*cargarEnCamino\(\)/.test(HTML))
  chk('se actualiza sola con lo demás (recargarLoVisible)', /if \(estado\.enCamino\?\.leido\) tareas\.push\(cargarEnCamino\(\)\)/.test(HTML))
  chk('en el catálogo, el recuento, los alias, los precios y el traspaso no se ve (y sí en la entrada)',
    /body:not\(\.stock-en-eleccion\) \.contenedor-stock:has\(#vista-catalogo:not\(\[hidden\]\), #vista-recuento:not\(\[hidden\]\), #vista-alias:not\(\[hidden\]\), #vista-costos:not\(\[hidden\]\), #vista-traspaso:not\(\[hidden\]\)\) #st-en-camino \{ display: none; \}/.test(HTML))
  chk('la tarjeta con el formulario abierto ocupa las dos columnas (fijas)',
    /\.st-camino__lista \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/.test(HTML) && /\.st-camino__envio--abierto \{ grid-column: 1 \/ -1; \}/.test(HTML))
}

let S0
try { S0 = armar() } catch (e) { chk('el sandbox arma (las funciones de En camino existen)', false, e.message) }

if (S0) {
  // ═══ Quién ve la sección y quién ve "Recibir" ═══════════════════════════
  {
    chk('permiso: stock:ver en la fábrica de la barra → ve', armar({ tareas: VE_D }).puedeVerEnCamino() === true)
    chk('permiso: solo recibir_transferencia en la fábrica de la barra → ve', armar({ tareas: RECIBE_D }).puedeVerEnCamino() === true)
    chk('permiso: stock:ver en OTRA fábrica → no ve', armar({ tareas: { 'stock:ver': { unidades: ['u-n'] } } }).puedeVerEnCamino() === false)
    chk('permiso: otra tarea de stock → no ve', armar({ tareas: { 'stock:ajustar_inventario': { todas: true } } }).puedeVerEnCamino() === false)
    chk('permiso: con "Todas", con recibir en alguna → ve', armar({ tareas: RECIBE_D, barra: null }).puedeVerEnCamino() === true)
    chk('permiso: con "Todas", sin ninguna de las dos → no ve', armar({ tareas: { 'stock:dar_baja': { todas: true } }, barra: null }).puedeVerEnCamino() === false)
    chk('permiso: super_admin → ve', armar({ rol: 'super_admin', barra: 'u-m' }).puedeVerEnCamino() === true)
    chk('permiso: recibir se mira en la fábrica que RECIBE', armar({ tareas: RECIBE_D, barra: null }).puedeRecibirEnCamino({ destino_id: 'u-d' }) === true &&
      armar({ tareas: { 'stock:recibir_transferencia': { unidades: ['u-n'] } }, barra: null }).puedeRecibirEnCamino({ destino_id: 'u-d' }) === false)
    chk('permiso: recibir sin alcance no da ninguna fábrica (como la base)', armar({ tareas: { 'stock:recibir_transferencia': null } }).puedeRecibirEnCamino({ destino_id: 'u-d' }) === false)
    chk('permiso: con stock:ver solamente no hay "Recibir"', armar({ tareas: VE_D }).puedeRecibirEnCamino({ destino_id: 'u-d' }) === false)
    chk('entrar solo a recibir: con la tarea en alguna fábrica', armar({ tareas: RECIBE_D }).recibeEnAlgunaFabrica() === true && armar({ tareas: VE_D }).recibeEnAlgunaFabrica() === false)
  }

  // Sin ver ni recibir: no se consulta y la sección no está.
  esperas.push((async () => {
    const S = armar({ tareas: { 'stock:ajustar_inventario': { todas: true } }, respuestas: { recepciones_grupo: lectura() } })
    await S.cargarEnCamino()
    chk('sin ver ni recibir: no consulta nada', S.__rpcs.length === 0)
    chk('… y la sección queda escondida y vacía', S.caja.hidden === true && S.caja.innerHTML === '')
  })())

  // Con stock:ver: la tarjeta sin "Recibir".
  esperas.push((async () => {
    const S = armar({ tareas: VE_D, respuestas: { recepciones_grupo: lectura() } })
    await S.cargarEnCamino()
    chk('lee: dos llamadas, con la fábrica de la barra', JSON.stringify(S.__rpcs) === JSON.stringify([
      ['recepciones_grupo', { p_unidad_negocio_id: 'u-d', p_estado: 'en_transito' }],
      ['recepciones_grupo', { p_unidad_negocio_id: 'u-d', p_estado: 'recibida' }]]), JSON.stringify(S.__rpcs))
    const h = S.caja.innerHTML
    chk('con stock:ver: la sección se ve', S.caja.hidden === false)
    chk('… con el título y cuántos son', /<h2 class="st-camino__titulo">En camino desde otra empresa <span class="st-camino__n">1<\/span><\/h2>/.test(h))
    chk('… sin "Recibir"', !/data-camino-recibir/.test(h))
  })())

  // La tarjeta, con recibir.
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() } })
    await S.cargarEnCamino()
    const h = S.caja.innerHTML
    chk('tarjeta: la orden', /<span class="st-camino__orden">Orden N-0031<\/span>/.test(h))
    chk('tarjeta: el N° de remito', /<span class="st-camino__remito">Remito 0001-00001234<\/span>/.test(h))
    chk('tarjeta: la fecha dd/mm/aaaa', /<span class="st-camino__fecha">28\/10\/2026<\/span>/.test(h))
    chk('tarjeta: desde qué empresa y el transporte', /<div class="st-camino__desde">Desde Cucuruchos Nuss · Camión de Juan<\/div>/.test(h))
    chk('tarjeta: con una sola fábrica no dice a cuál va', !/→/.test(h))
    chk('tarjeta: las observaciones de la orden', /<div class="st-camino__obs">Frágil<\/div>/.test(h))
    chk('tarjeta: el producto con su lote y las cajas', /Cucurucho · Caja x 100<span class="st-camino__lote"> · Lote L-77<\/span><\/span><span class="st-camino__cant">12 cajas<\/span>/.test(h))
    chk('tarjeta: el insumo sin lote, en su unidad y con formato argentino', /Harina 000 · Wali<\/span><span class="st-camino__cant">1\.250,5 kg<\/span>/.test(h))
    chk('tarjeta: "Recibir" con el id del envío', /<button type="button" class="btn-stock" data-camino-recibir="r1">Recibir<\/button>/.test(h))
    chk('tarjeta: una caja sola dice "1 caja"', S.textoCantidadCamino(1, { tipo: 'producto' }) === '1 caja' && S.textoCantidadCamino(1200, { tipo: 'producto' }) === '1.200 cajas')
    chk('tarjeta: insumo con decimales', S.textoCantidadCamino(0.333, { tipo: 'insumo', unidad: 'kg' }) === '0,333 kg')
    chk('tarjeta: sin cantidad, "—" (nunca 0)', S.textoCantidadCamino(null, { tipo: 'insumo', unidad: 'kg' }) === '—' && S.textoCantidadCamino('', { tipo: 'producto' }) === '—')
    chk('tarjeta: sin remito ni transporte, no los nombra', !/Remito|·  ·/.test(S.htmlEnvioCamino(envio({ numero_remito: null, transporte: null }), null, false)) &&
      /<div class="st-camino__desde">Desde Cucuruchos Nuss<\/div>/.test(S.htmlEnvioCamino(envio({ numero_remito: null, transporte: null }), null, false)))
    chk('fecha: una fecha rara no se inventa', S.fechaCamino(null) === '' && S.fechaCamino('ayer') === '' && S.fechaCamino('2026-10-28') === '28/10/2026')
  })())

  // Sin nada: no ocupa lugar. Solo para recibir: lo dice.
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura({ enTransito: [] }) } })
    await S.cargarEnCamino()
    chk('sin envíos ni recibidos: la sección no está', S.caja.hidden === true && S.caja.innerHTML === '')
    const S2 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura({ enTransito: [] }) } })
    S2.camino().soloEsto = true
    await S2.cargarEnCamino()
    chk('entrando solo a recibir y sin envíos: lo dice', S2.caja.hidden === false && /No hay nada en camino desde otra empresa\./.test(S2.caja.innerHTML))
    const S3 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: () => ({ data: null, error: null }) } })
    await S3.cargarEnCamino()
    chk('una respuesta vacía (null) es "nada"', S3.caja.hidden === true)
  })())

  // Error al leer: se dice con el mensaje de la base.
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura({ error: { message: 'Se cortó la conexión' } }) } })
    const ok = await S.cargarEnCamino()
    chk('error al leer: devuelve que no pudo', ok === false)
    chk('error al leer: se ve y dice el mensaje', S.caja.hidden === false && /<p class="rec-aviso" role="alert">No se pudo leer lo que viene en camino: Se cortó la conexión<\/p>/.test(S.caja.innerHTML))
  })())

  // La fábrica de pruebas y la barra.
  esperas.push((async () => {
    const deprueba = [envio({ id: 'rp', destino_id: 'u-p' }), envio({ id: 'rq', origen_id: 'u-p' }), envio({ id: 'rok' }), envio({ id: 'rotra', destino_id: 'u-n' })]
    // Con "Todas" (sin barra que filtre), para ver solo el filtro de pruebas.
    const S = armar({ tareas: RECIBE_D, barra: null, respuestas: { recepciones_grupo: lectura({ enTransito: deprueba }) } })
    S.estado.fabrica = { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: false }
    await S.cargarEnCamino()
    const ids = S.camino().enTransito.map(e => e.id)
    chk('fábrica de pruebas: ni como destino ni como origen, para una cuenta real', !ids.includes('rp') && !ids.includes('rq') && ids.includes('rok') && ids.includes('rotra'), ids.join(','))
    const S1 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura({ enTransito: deprueba }) } })
    await S1.cargarEnCamino()
    const ids1 = S1.camino().enTransito.map(e => e.id)
    chk('barra: aunque la base devolviera otra fábrica, solo la de la barra', !ids1.includes('rotra') && ids1.includes('rok'), ids1.join(','))
    const S2 = armar({ tareas: RECIBE_D, barra: null, respuestas: { recepciones_grupo: lectura({ enTransito: deprueba }) } })
    S2.estado.fabrica = { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: true }
    await S2.cargarEnCamino()
    chk('fábrica de pruebas: una cuenta de prueba sí la ve', S2.camino().enTransito.map(e => e.id).includes('rp'))
  })())

  // "Todas": la llamada sin fábrica, y cada tarjeta dice a cuál va.
  esperas.push((async () => {
    const dos = [envio(), envio({ id: 'r2', codigo: 'N-0032', destino_id: 'u-m', destino: 'Mengui' })]
    const S = armar({ tareas: { 'stock:recibir_transferencia': { unidades: ['u-d'] }, 'stock:ver': { todas: true } }, barra: null, respuestas: { recepciones_grupo: lectura({ enTransito: dos }) } })
    await S.cargarEnCamino()
    chk('"Todas": se pide sin fábrica (la base trae las del alcance)', S.__rpcs[0][1].p_unidad_negocio_id === null)
    const h = S.caja.innerHTML
    chk('"Todas": con dos fábricas, cada tarjeta dice a cuál va', /Desde Cucuruchos Nuss → Dolce Pasta/.test(h) && /Desde Cucuruchos Nuss → Mengui/.test(h))
    chk('"Todas": "Recibir" solo donde puede recibir', /data-camino-recibir="r1"/.test(h) && !/data-camino-recibir="r2"/.test(h))
    S.abrirRecepcion('r2')
    chk('"Todas": sin el permiso en esa fábrica, no se abre', S.camino().form === null)
  })())

  // ═══ Recibir completo ═══════════════════════════════════════════════════
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: { estado: 'recibida', entradas: 2, codigo: 'N-0031' }, error: null }) } })
    S.estado.cargados.add('stock')
    S.estado.ptm = { leido: true }
    await S.cargarEnCamino()
    tocar(S, 'data-camino-recibir', 'r1')
    chk('recibir: abre el formulario de ese envío', S.camino().form?.id === 'r1')
    chk('recibir: la tarjeta abierta ocupa todo el ancho', /st-camino__envio st-camino__envio--abierto/.test(S.caja.innerHTML))
    chk('recibir: "Recibido" precargado con lo enviado (cajas)', recibidoDe(S, 'i1')?.value === '12', recibidoDe(S, 'i1')?.value)
    // (El campo escribe como todos los de cantidad: con dos decimales mínimos.)
    chk('recibir: "Recibido" precargado con lo enviado (insumo, con decimales y miles)', recibidoDe(S, 'i2')?.value === '1.250,50', recibidoDe(S, 'i2')?.value)
    chk('recibir: sin diferencia no se pide motivo', cajaMotivoDe(S, 'i1')?.hidden === true && cajaMotivoDe(S, 'i2')?.hidden === true)
    chk('recibir: el rótulo dice la unidad', /Recibido \(cajas\)/.test(S.caja.innerHTML) && /Recibido \(kg\)/.test(S.caja.innerHTML))
    chk('recibir: "Confirmar recepción" y "Cancelar"', botonConfirmar(S)?.textContent === 'Confirmar recepción' && !!S.caja.querySelector('[data-camino-cancelar]'))
    chk('recibir: el botón se puede tocar', botonConfirmar(S).disabled === false)
    chk('recibir: el error, escondido', errorBox(S).hidden === true)
    await tocar(S, 'data-camino-confirmar')
    const r = llamadasRecibir(S)
    chk('completo: una llamada a recibir_orden_grupo', r.length === 1)
    chk('completo: TODOS los renglones con lo enviado y sin motivo', JSON.stringify(r[0]?.[1]) === JSON.stringify({
      p_recepcion_id: 'r1',
      p_items: [{ item_id: 'i1', cantidad_recibida: 12, motivo_diferencia: null }, { item_id: 'i2', cantidad_recibida: 1250.5, motivo_diferencia: null }],
      p_observaciones: null }), JSON.stringify(r[0]?.[1]))
    chk('completo: avisa con el código de la orden', S.__exitos[0] === 'Orden N-0031 recibida: entró al stock.', S.__exitos.join('|'))
    chk('completo: cierra el formulario', S.camino().form === null)
    chk('completo: relee la sección', S.__rpcs.filter(x => x[0] === 'recepciones_grupo').length === 4)
    chk('completo: relee el stock de insumos (silencioso)', S.__lecturas.some(l => l[0] === 'cargarStock' && l[1]?.silencioso === true))
    chk('completo: relee el producto terminado (si se estaba mirando)', S.__lecturas.some(l => l[0] === 'cargarTerminado' && l[1]?.silencioso === true))
    chk('completo: relee las burbujas', S.__lecturas.some(l => l[0] === 'cargarPendientesStock'))
  })())

  // Sin el stock cargado no se lo relee.
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: { estado: 'recibida', entradas: 2, codigo: 'N-0031' }, error: null }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    await S.confirmarRecepcion()
    chk('completo: sin la lista de stock ni el terminado leídos, no los relee', !S.__lecturas.some(l => l[0] === 'cargarStock' || l[0] === 'cargarTerminado'))
  })())

  // El envío recibido sale de la pantalla en el acto, sin esperar la relectura
  // (que acá no vuelve nunca: la promesa no se espera).
  esperas.push((async () => {
    let lecturas = 0
    const S = armar({ tareas: RECIBE_D, respuestas: {
      recepciones_grupo: (p) => (++lecturas <= 2 ? lectura()(p) : new Promise(() => {})),
      recibir_orden_grupo: () => ({ data: { estado: 'recibida', entradas: 2, codigo: 'N-0031' }, error: null }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    S.confirmarRecepcion()
    for (let i = 0; i < 5 && !S.__exitos.length; i++) await new Promise(r => setTimeout(r, 0))
    chk('completo: el envío sale de la lista aunque la relectura todavía no volvió',
      S.__exitos.length === 1 && !S.camino().enTransito.some(e => e.id === 'r1') && !/data-camino-envio="r1"/.test(S.caja.innerHTML))
  })())

  // ═══ Con diferencia y motivo ════════════════════════════════════════════
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: { estado: 'recibida', entradas: 2, codigo: 'N-0031' }, error: null }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    escribir(S, recibidoDe(S, 'i2'), '1200')
    chk('diferencia: lo tipeado queda en el estado', S.camino().form.renglones.i2.recibido === 1200)
    chk('diferencia: aparece "Motivo de la diferencia" en ESE renglón', cajaMotivoDe(S, 'i2').hidden === false && cajaMotivoDe(S, 'i1').hidden === true)
    escribirTexto(S, motivoDe(S, 'i2'), '  Se rompió una bolsa ')
    escribirTexto(S, S.caja.querySelector('[data-camino-obs]'), 'Llegó tarde')
    // Un repintado (plegar "Recibidos", la barra) no pierde nada de lo escrito.
    S.pintarEnCamino()
    chk('repintar: lo recibido, el motivo y las observaciones siguen en los campos',
      recibidoDe(S, 'i2').value === '1.200' && motivoDe(S, 'i2').value === '  Se rompió una bolsa ' &&
      S.caja.querySelector('[data-camino-obs]').value === 'Llegó tarde' && cajaMotivoDe(S, 'i2').hidden === false,
      `${recibidoDe(S, 'i2').value}|${motivoDe(S, 'i2').value}|${S.caja.querySelector('[data-camino-obs]').value}`)
    await S.confirmarRecepcion()
    const p = llamadasRecibir(S)[0]?.[1]
    chk('diferencia: manda lo recibido y el motivo (sin espacios de más)', JSON.stringify(p?.p_items) === JSON.stringify([
      { item_id: 'i1', cantidad_recibida: 12, motivo_diferencia: null },
      { item_id: 'i2', cantidad_recibida: 1200, motivo_diferencia: 'Se rompió una bolsa' }]), JSON.stringify(p?.p_items))
    chk('diferencia: y las observaciones', p?.p_observaciones === 'Llegó tarde')
  })())

  // Un motivo escrito y después la cantidad corregida a lo enviado: no viaja.
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: { codigo: 'N-0031' }, error: null }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    escribir(S, recibidoDe(S, 'i1'), '10')
    escribirTexto(S, motivoDe(S, 'i1'), 'Dos rotas')
    escribir(S, recibidoDe(S, 'i1'), '12')
    chk('sin diferencia otra vez: el motivo se esconde', cajaMotivoDe(S, 'i1').hidden === true)
    await S.confirmarRecepcion()
    chk('sin diferencia otra vez: el motivo no viaja', llamadasRecibir(S)[0]?.[1].p_items[0].motivo_diferencia === null)
  })())

  // Las cajas van enteras: el campo no deja escribir la coma.
  {
    const S = armar({ tareas: RECIBE_D })
    S.camino().leido = true
    S.camino().enTransito = [envio()]
    S.abrirRecepcion('r1')
    const el = recibidoDe(S, 'i1')
    el.escribirCrudo('')
    el.teclear('5,5')
    chk('cajas: el campo de cajas no admite decimales', el.value === '55', el.value)
    const el2 = recibidoDe(S, 'i2')
    el2.escribirCrudo('')
    el2.teclear('8,5')
    chk('insumo: el campo del insumo sí (con coma)', el2.value === '8,5', el2.value)
  }

  // ═══ Diferencia sin motivo: se pide, sin llamar ═════════════════════════
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: { codigo: 'N-0031' }, error: null }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    escribir(S, recibidoDe(S, 'i1'), '10')
    escribirTexto(S, motivoDe(S, 'i1'), '   ')
    await tocar(S, 'data-camino-confirmar')
    chk('sin motivo: no llama a la base', llamadasRecibir(S).length === 0)
    chk('sin motivo: lo dice pegado al botón, con el texto de la base', errorBox(S).hidden === false && errorBox(S).textContent === 'Hay una diferencia sin explicar: poné el motivo.', errorBox(S).textContent)
    chk('sin motivo: marca el campo del motivo de ese renglón', motivoDe(S, 'i1').classList.contains('st-camino__input--error') && !motivoDe(S, 'i2').classList.contains('st-camino__input--error'))
    chk('sin motivo: el botón se puede volver a tocar', botonConfirmar(S).disabled === false)
    escribirTexto(S, motivoDe(S, 'i1'), 'Dos rotas')
    chk('sin motivo: al escribirlo, la marca y el error se van', !motivoDe(S, 'i1').classList.contains('st-camino__input--error') && errorBox(S).hidden === true)
    await S.confirmarRecepcion()
    chk('sin motivo: con el motivo, ahora sí manda', llamadasRecibir(S).length === 1 && llamadasRecibir(S)[0][1].p_items[0].motivo_diferencia === 'Dos rotas')
  })())

  // Y si la base lo dice igual, tal cual.
  esperas.push((async () => {
    const MSG = 'Hay una diferencia sin explicar: poné el motivo.'
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: null, error: { message: MSG, code: 'P0001' } }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    await S.confirmarRecepcion()
    chk('la base dice que falta el motivo: tal cual', errorBox(S).textContent === MSG && errorBox(S).hidden === false)
  })())

  // ═══ Cantidad vacía ═════════════════════════════════════════════════════
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    escribir(S, recibidoDe(S, 'i2'), '')
    await S.confirmarRecepcion()
    chk('sin cantidad: no llama', llamadasRecibir(S).length === 0)
    chk('sin cantidad: lo dice', errorBox(S).textContent === 'La cantidad recibida no puede faltar ni ser negativa.' && errorBox(S).hidden === false)
    chk('sin cantidad: marca ese campo', recibidoDe(S, 'i2').classList.contains('st-camino__input--error') && !recibidoDe(S, 'i1').classList.contains('st-camino__input--error'))
    chk('sin cantidad: no pide motivo por un campo vacío', cajaMotivoDe(S, 'i2').hidden === true)
    escribir(S, recibidoDe(S, 'i2'), '1250,5')
    chk('sin cantidad: al escribirla, la marca y el error se van', !recibidoDe(S, 'i2').classList.contains('st-camino__input--error') && errorBox(S).hidden === true)
  })())

  // ═══ Más de lo enviado y orden anulada: el error de la base tal cual ═══
  for (const [caso, msg] of [
    ['más de lo enviado', 'No se puede recibir más de lo que se mandó (12). Si llegó de más, es un ajuste aparte.'],
    ['orden anulada', 'La orden N-0031 se anuló: no hay nada para recibir.'],
    ['sin permiso', 'No tenés permiso para recibir mercadería en esta empresa.'],
  ]) {
    esperas.push((async () => {
      const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => ({ data: null, error: { message: msg, code: 'P0001' } }) } })
      await S.cargarEnCamino()
      S.abrirRecepcion('r1')
      if (caso === 'más de lo enviado') { escribir(S, recibidoDe(S, 'i1'), '13'); escribirTexto(S, motivoDe(S, 'i1'), 'Vino una de más') }
      await tocar(S, 'data-camino-confirmar')
      chk(`${caso}: llama a la base`, llamadasRecibir(S).length === 1)
      if (caso === 'más de lo enviado') chk(`${caso}: con lo que se tipeó (13)`, llamadasRecibir(S)[0][1].p_items[0].cantidad_recibida === 13)
      chk(`${caso}: el error de la base TAL CUAL, pegado al botón`, errorBox(S).textContent === msg && errorBox(S).hidden === false, errorBox(S).textContent)
      chk(`${caso}: el formulario sigue abierto con lo escrito`, S.camino().form?.id === 'r1' && recibidoDe(S, 'i1').value === (caso === 'más de lo enviado' ? '13' : '12'))
      chk(`${caso}: el botón vuelve a poder tocarse`, botonConfirmar(S).disabled === false && botonConfirmar(S).textContent === 'Confirmar recepción')
      chk(`${caso}: no avisa éxito ni relee`, S.__exitos.length === 0 && S.__rpcs.filter(x => x[0] === 'recepciones_grupo').length === 2)
    })())
  }

  // Una excepción de red también se dice (y no queda trabado).
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => { throw new Error('Failed to fetch') } } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    await S.confirmarRecepcion()
    chk('sin red: lo dice y el botón vuelve', errorBox(S).textContent === 'Failed to fetch' && botonConfirmar(S).disabled === false)
  })())

  // ═══ Doble toque: manda una vez ═════════════════════════════════════════
  esperas.push((async () => {
    let soltar
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura(), recibir_orden_grupo: () => new Promise(r => { soltar = r }) } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    const a = tocar(S, 'data-camino-confirmar')
    chk('doble toque: mientras manda, el botón se traba y dice "Recibiendo…"', botonConfirmar(S).disabled === true && botonConfirmar(S).textContent === 'Recibiendo…')
    chk('doble toque: Cancelar también se traba', S.caja.querySelector('[data-camino-cancelar]').disabled === true)
    const b = tocar(S, 'data-camino-confirmar')
    S.cancelarRecepcion()
    chk('doble toque: Cancelar mientras manda no cierra', S.camino().form?.id === 'r1')
    S.abrirRecepcion('r1')
    chk('doble toque: "Recibir" otra vez mientras manda no reinicia el formulario', S.camino().form?.enviando === true)
    const el = recibidoDe(S, 'i1')
    el.value = '3'
    S.alEscribirEnCamino({ target: el })
    chk('doble toque: lo que se escriba mientras manda no cambia lo que se mandó', S.camino().form.renglones.i1.recibido === 12)
    await new Promise(r => setTimeout(r, 0))
    chk('doble toque: una sola llamada', llamadasRecibir(S).length === 1, String(llamadasRecibir(S).length))
    soltar({ data: { codigo: 'N-0031' }, error: null })
    await Promise.all([a, b])
    chk('doble toque: un solo aviso', S.__exitos.length === 1)
  })())

  // ═══ Cancelar ═══════════════════════════════════════════════════════════
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    escribir(S, recibidoDe(S, 'i1'), '3')
    tocar(S, 'data-camino-cancelar')
    chk('cancelar: cierra sin llamar a nada', S.camino().form === null && llamadasRecibir(S).length === 0 && S.__rpcs.length === 2)
    chk('cancelar: la tarjeta vuelve a mostrar "Recibir" y los renglones', /data-camino-recibir="r1"/.test(S.caja.innerHTML) && !/data-camino-recibido/.test(S.caja.innerHTML))
    S.abrirRecepcion('r1')
    chk('cancelar: al volver a abrir, arranca de nuevo con lo enviado', recibidoDe(S, 'i1').value === '12')
  })())

  // Con un envío a medio recibir, la relectura no lo pisa.
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() } })
    await S.cargarEnCamino()
    S.abrirRecepcion('r1')
    escribir(S, recibidoDe(S, 'i1'), '7')
    const ok = await S.cargarEnCamino()
    chk('a medio recibir: la relectura no consulta ni redibuja', ok === true && S.__rpcs.length === 2 && recibidoDe(S, 'i1').value === '7')
  })())

  // ═══ Recibidos: los últimos 30 días ═════════════════════════════════════
  {
    const ahora = Date.parse('2026-10-29T15:00:00Z')
    const lista = [
      { id: 'a', recibida_en: new Date(ahora - 29 * DIA).toISOString() },
      { id: 'b', recibida_en: new Date(ahora - 31 * DIA).toISOString() },
      { id: 'c', recibida_en: new Date(ahora - HORA).toISOString() },
      { id: 'd', recibida_en: null },
      { id: 'e', recibida_en: new Date(ahora - 30 * DIA + 60000).toISOString() },
    ]
    const S = armar()
    const ids = S.recibidosRecientes(lista, ahora).map(r => r.id).join(',')
    chk('recibidos: los de los últimos 30 días, el más nuevo primero (sin los de antes ni los sin fecha)', ids === 'c,a,e', ids)
    chk('recibidos: la hora en hora de Argentina', S.momentoCamino('2026-10-29T14:05:00Z') === '29/10/2026 11:05', S.momentoCamino('2026-10-29T14:05:00Z'))
    chk('recibidos: a medianoche de Argentina, el día de Argentina', S.momentoCamino('2026-10-30T02:30:00Z') === '29/10/2026 23:30', S.momentoCamino('2026-10-30T02:30:00Z'))
    chk('recibidos: sin fecha, nada', S.momentoCamino(null) === '' && S.momentoCamino('cualquiera') === '')
  }
  esperas.push((async () => {
    const conDif = recibido({ id: 'r8', codigo: 'N-0025', recibida_en: '2026-10-29T14:05:00Z', recibida_por: 'Lucía',
      items: [
        { item_id: 'k1', tipo: 'producto', descripcion: 'Cucurucho · Caja x 100', unidad: 'cajas', lote: 'L-60', cantidad_enviada: 12, cantidad_recibida: 10, motivo_diferencia: 'Dos rotas' },
        { item_id: 'k2', tipo: 'insumo', descripcion: 'Harina 000 · Wali', unidad: 'kg', lote: null, cantidad_enviada: 50, cantidad_recibida: 50, motivo_diferencia: null }] })
    const viejo = recibido({ id: 'r7', codigo: 'N-0001', recibida_en: hace(40 * DIA) })
    const S = armar({ tareas: VE_D, respuestas: { recepciones_grupo: lectura({ enTransito: [], recibidos: [recibido(), conDif, viejo] }) } })
    await S.cargarEnCamino()
    const ids = S.camino().recibidos.map(r => r.id)
    chk('recibidos: el de hace 40 días no está', !ids.includes('r7') && ids.length === 2, ids.join(','))
    let h = S.caja.innerHTML
    chk('recibidos: sin envíos en camino, solo la barra chica (plegada)', S.caja.hidden === false && !/st-camino__titulo/.test(h) && /<button type="button" class="st-camino__plegar" data-camino-plegar aria-expanded="false"><span>Recibidos en los últimos 30 días \(2\)<\/span><span class="st-camino__accion">Ver<\/span><\/button>/.test(h))
    chk('recibidos: plegado no muestra la lista', !/st-camino__hechos/.test(h))
    tocar(S, 'data-camino-plegar')
    h = S.caja.innerHTML
    chk('recibidos: al tocar se despliega', /aria-expanded="true"/.test(h) && /st-camino__hechos/.test(h) && />Ocultar</.test(h))
    chk('recibidos: la orden, desde qué empresa, quién y cuándo', /Orden N-0025/.test(h) && /Desde Cucuruchos Nuss/.test(h) && /<div class="st-camino__quien">Recibió Lucía el 29\/10\/2026 11:05<\/div>/.test(h))
    chk('recibidos: cada diferencia con enviado, recibido y motivo', /<li>Cucurucho · Caja x 100 · Lote L-60: enviado 12 cajas, recibido 10 cajas — Dos rotas<\/li>/.test(h))
    chk('recibidos: el renglón sin diferencia no se lista', !/Harina 000 · Wali: enviado/.test(h))
    chk('recibidos: el que llegó entero lo dice', /<div class="st-camino__sin-difs">Llegó todo lo que se mandó\.<\/div>/.test(h))
    tocar(S, 'data-camino-plegar')
    chk('recibidos: y se vuelve a plegar', !/st-camino__hechos/.test(S.caja.innerHTML))
  })())

  // ═══ Escape de todo lo de la base ═══════════════════════════════════════
  esperas.push((async () => {
    const m = marca
    const malo = envio({
      id: m('id'), codigo: m('codigo'), numero_remito: m('remito'), fecha: m('fecha'), transporte: m('transporte'),
      observaciones: m('observaciones'), origen: m('origen'), destino: m('destino'),
      items: [
        { item_id: m('item_id'), tipo: 'insumo', descripcion: m('descripcion'), unidad: m('unidad'), lote: m('lote'), cantidad_enviada: 5 },
        { item_id: 'i9', tipo: 'producto', descripcion: 'Caja', unidad: 'cajas', lote: null, cantidad_enviada: 1 }],
    })
    const otro = envio({ id: 'r2', destino_id: 'u-m', destino: 'Mengui' })
    const hecho = recibido({ codigo: m('codigo_r'), numero_remito: m('remito_r'), origen: m('origen_r'), destino: m('destino_r'), recibida_por: m('recibida_por'),
      recibida_en: hace(HORA), items: [{ item_id: 'z', tipo: 'insumo', descripcion: m('descripcion_r'), unidad: m('unidad_r'), lote: m('lote_r'), cantidad_enviada: 5, cantidad_recibida: 4, motivo_diferencia: m('motivo') }] })
    const S = armar({ tareas: { 'stock:recibir_transferencia': { todas: true } }, barra: null,
      respuestas: { recepciones_grupo: lectura({ enTransito: [malo, otro], recibidos: [hecho] }), recibir_orden_grupo: () => ({ data: null, error: { message: m('error_base') } }) } })
    await S.cargarEnCamino()
    S.camino().recibidosAbierto = true
    S.pintarEnCamino()
    chequearMarcas(chk, 'tarjeta y recibidos', S.caja.innerHTML,
      ['id', 'codigo', 'remito', 'transporte', 'observaciones', 'origen', 'destino', 'descripcion', 'unidad', 'lote',
        'codigo_r', 'remito_r', 'origen_r', 'destino_r', 'recibida_por', 'descripcion_r', 'unidad_r', 'lote_r', 'motivo'])
    chk('escape: una fecha con HTML no llega a la página', !/data-xss=&quot;fecha/.test(S.caja.innerHTML))
    // El id con comillas vuelve entero desde el atributo: se abre el envío correcto.
    tocar(S, 'data-camino-recibir', m('id'))
    chk('escape: el id del atributo vuelve entero y abre ese envío', S.camino().form?.id === m('id'))
    chequearMarcas(chk, 'formulario abierto', S.caja.innerHTML, ['id', 'item_id', 'descripcion', 'unidad', 'lote', 'codigo', 'origen'])
    chk('escape: el campo del renglón se encuentra por su id (sin armar selectores con el dato)', recibidoDe(S, m('item_id'))?.value === '5')
    await S.confirmarRecepcion()
    chk('escape: el error de la base va como texto (textContent), no como HTML', errorBox(S).textContent === m('error_base') && !/data-xss=.error_base/.test(S.caja.innerHTML))
    // El error al leer, también escapado.
    const S2 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura({ error: { message: m('error_lectura') } }) } })
    await S2.cargarEnCamino()
    chequearMarcas(chk, 'error al leer', S2.caja.innerHTML, ['error_lectura'])
  })())

  // ═══ El link del tablero ════════════════════════════════════════════════
  esperas.push((async () => {
    const S = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() }, ubicacion: { hash: '#st-en-camino' } })
    await S.cargarEnCamino()
    chk('#st-en-camino: trae la sección a la vista', S.caja.scrolls === 1)
    S.pintarEnCamino()
    chk('#st-en-camino: una sola vez (no a cada repintado)', S.caja.scrolls === 1)
    const S2 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() }, ubicacion: { search: '?seccion=en-camino' } })
    await S2.cargarEnCamino()
    chk('?seccion=en-camino: también', S2.caja.scrolls === 1)
    const S3 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura() }, ubicacion: { search: '?vista=insumos' } })
    await S3.cargarEnCamino()
    chk('sin pedirlo, no mueve la pantalla', S3.caja.scrolls === 0)
    const S4 = armar({ tareas: RECIBE_D, respuestas: { recepciones_grupo: lectura({ enTransito: [] }) }, ubicacion: { hash: '#st-en-camino' } })
    await S4.cargarEnCamino()
    chk('pedida pero sin nada que mostrar: no mueve la pantalla', S4.caja.scrolls === 0)
  })())

  // Una respuesta vieja no pisa la nueva (cambiaron la barra en el medio).
  esperas.push((async () => {
    const pendientes = []
    const S = armar({ tareas: { 'stock:recibir_transferencia': { todas: true } }, respuestas: {
      recepciones_grupo: (p) => new Promise(r => pendientes.push([p, r])) } })
    const a = S.cargarEnCamino()
    S.estado.unidadBarra = 'u-m'
    const b = S.cargarEnCamino()
    await new Promise(r => setTimeout(r, 0))
    // La nueva (Mengui) vuelve primero y la vieja (Dolce) DESPUÉS.
    for (const [p, r] of pendientes.reverse()) {
      const deMengui = p.p_unidad_negocio_id === 'u-m'
      r({ data: p.p_estado === 'en_transito' ? [envio({ id: deMengui ? 'rm' : 'rd', destino_id: deMengui ? 'u-m' : 'u-d' })] : [], error: null })
    }
    await Promise.all([a, b])
    chk('turno: queda lo de la fábrica nueva', S.camino().enTransito.map(e => e.id).join(',') === 'rm', S.camino().enTransito.map(e => e.id).join(','))
  })())
}

fin()
