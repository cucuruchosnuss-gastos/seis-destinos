// La vista de ESCRITORIO de Cobranzas (master-detail, rediseño 3.5).
//
// Desde 1100px el listado y la cobranza abierta quedan lado a lado; abajo de
// eso, el flujo de celular de siempre. Se EJECUTAN las funciones reales
// —mostrarVistaCob, abrirDetalle, renderizarListado, htmlFilaCobranza y las de
// la selección— con un document falso cuyos elementos guardan sus clases, y un
// window.matchMedia que la suite prende y apaga. Lo que se afirma:
//  - en celular nada cambia: listado y detalle son pantallas separadas y abrir
//    una cobranza sube la página;
//  - en escritorio el listado y el panel conviven, abrir NO mueve la página,
//    la fila elegida lleva la clase y aria-current, y solo una;
//  - si el filtro deja afuera la elegida, el panel se vacía con texto neutro;
//  - un detalle abierto desde la vista Cheques sigue a pantalla entera y no
//    toca la selección;
//  - la respuesta de una apertura vieja no pisa el panel de la elegida;
//  - volver al listado vuelve a leer la cobranza abierta;
//  - el CSS: todo lo de escritorio vive adentro del @media (min-width: 1100px),
//    con el mismo corte que MQ_ESCRITORIO, y la franja de celular no cambia;
//  - no hay cifras de cabecera ("Sin procesar" / "Total del mes"): no existe
//    una agregación en la base con los mismos filtros, y sumar en el cliente
//    daría un total falso.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')

// El sub-proceso VERIFICA que leyó el archivo que el runner le pasó.
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 300)}` : ''))
}

const PRELUDIO = `
  var console = { error(){}, log(){}, warn(){} }

  // --- DOM falso, con clases y atributos de verdad ---------------------------
  function nuevoEl(id) {
    const clases = new Set()
    const atributos = new Map()
    return {
      id, innerHTML: '', textContent: '', hidden: false, scrollTop: 0, dataset: {},
      classList: {
        add(c) { clases.add(c) }, remove(c) { clases.delete(c) },
        toggle(c, v) { const on = v === undefined ? !clases.has(c) : !!v; if (on) clases.add(c); else clases.delete(c); return on },
        contains(c) { return clases.has(c) },
      },
      setAttribute(k, v) { atributos.set(k, String(v)) },
      removeAttribute(k) { atributos.delete(k) },
      getAttribute(k) { return atributos.has(k) ? atributos.get(k) : null },
      addEventListener(t, f) { this.__click = f },
      querySelectorAll(sel) { return filasDe(this, sel) },
    }
  }
  // Las filas del listado salen del innerHTML de #cob-lista, con las clases y
  // el aria-current que trae el render. Se cachean por el texto del HTML: si
  // el listado se redibuja, las filas son otras.
  var __cacheFilas = { html: null, filas: [] }
  function filasDe(el, sel) {
    if (!/data-cobranza/.test(sel)) return []
    const lista = document.getElementById('cob-lista')
    if (__cacheFilas.html !== lista.innerHTML) {
      const filas = []
      for (const m of lista.innerHTML.matchAll(/<div class="([^"]*cob-fila[^"]*)"([^>]*)data-cobranza="([^"]*)"/g)) {
        const f = nuevoEl('fila')
        m[1].split(/\\s+/).filter(Boolean).forEach(c => f.classList.add(c))
        if (/aria-current="true"/.test(m[2])) f.setAttribute('aria-current', 'true')
        f.dataset.cobranza = m[3]
        filas.push(f)
      }
      __cacheFilas = { html: lista.innerHTML, filas }
    }
    return __cacheFilas.filas
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll(sel) { return filasDe(null, sel) },
  }

  // --- el ancho de la pantalla -------------------------------------------------
  var __escritorio = false
  var __scrolls = 0
  var window = {
    scrollTo() { __scrolls++ },
    matchMedia(q) { return { matches: __escritorio && q === '(min-width: 1100px)', addEventListener(){} } },
  }

  // --- supabase falso: la cabecera de cada cobranza se puede demorar -----------
  var __cabeceras = new Map()
  var __demoras = new Map()
  var __lecturas = 0
  function consulta(tabla) {
    let id = null
    const q = {
      select: () => q, order: () => q, in: () => q,
      eq(col, v) { if (col === 'id') id = v; return q },
      maybeSingle() {
        __lecturas++
        const r = { data: __cabeceras.get(id) ?? null, error: null }
        return __demoras.has(id) ? __demoras.get(id).then(() => r) : Promise.resolve(r)
      },
      then(res) { return Promise.resolve({ data: [], error: null }).then(res) },
    }
    return q
  }
  var supabase = { from: consulta }

  // --- lo que estas vistas usan y acá no importa -------------------------------
  var __detalles = []
  function renderizarDetalle() {
    __detalles.push(estado.detalle.cabecera.id)
    document.getElementById('cob-detalle-cuerpo').innerHTML = 'DETALLE:' + estado.detalle.cabecera.id
  }
  function detenerReintentosFotos(){} function mostrarError(){}
  var puedeCargar = () => true
  var puedeVerTodo = () => true
  var turnoDetalle = 0

  var estado = {
    vista: null, cobranzas: [], hayMas: false, detalle: null, detalleOrigen: 'listado',
    cobranzaSeleccionadaId: null,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
  }
`

const FUNCIONES = [
  'escCob', 'formatearImporte', 'esFechaIso', 'formatearFechaCob', 'momentoArgentina', 'fechaDeMomentoAr',
  'normalizarCliente', 'hayFiltrosPuestos', 'htmlFilaCobranza', 'renderizarListado',
  'soltarSeleccionFueraDelListado', 'esEscritorio', 'enModoMaestro', 'pintarPanelVacio',
  'marcarFilaSeleccionada', 'mostrarVistaCob', 'abrirDetalle',
]
const CONSTANTES = ['ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'SUBTITULO_VISTA_COB', 'MQ_ESCRITORIO']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __cabeceras, __demoras, __detalles,
      __escritorio(v){ __escritorio = v }, __scrolls(){ return __scrolls }, __lecturas(){ return __lecturas },
      __filas(){ return filasDe(null, '[data-cobranza]') }`,
  })
}

const el = (S, id) => S.__els.get(id) ?? { hidden: undefined, classList: { contains: () => false }, innerHTML: '' }
const maestro = (S) => el(S, 'cob-maestro').classList.contains('cob-maestro--activo')
const cob = (id, extra) => ({
  id, cliente: 'Cliente ' + id, estado: 'registrada', fecha: '2026-09-17', total: 1000, efectivo: 0,
  cantidad_cheques: 1, created_at: '2026-09-17T12:00:00Z', cargada_por_nombre: 'Mariano', ...extra,
})
function conListado(S, ids) {
  S.estado.cobranzas = ids.map(i => cob(i))
  ids.forEach(i => S.__cabeceras.set(i, cob(i)))
}
const esperar = () => new Promise(r => setTimeout(r, 0))
function diferida() { let resolver; const p = new Promise(r => { resolver = r }); return { p, resolver } }

async function pruebas() {
  // ── Celular: nada cambia ─────────────────────────────────────────────────
  {
    const S = sandbox()
    S.__escritorio(false)
    conListado(S, ['c1', 'c2'])
    S.mostrarVistaCob('listado')
    chk('celular: el listado no activa el modo maestro', !maestro(S))
    chk('celular: en el listado el detalle está oculto', el(S, 'cob-vista-detalle').hidden === true && el(S, 'cob-vista-listado').hidden === false)
    S.renderizarListado()
    const antes = S.__scrolls()
    await S.abrirDetalle('c1')
    chk('celular: abrir una cobranza es OTRA pantalla (listado oculto, detalle visible)',
      el(S, 'cob-vista-listado').hidden === true && el(S, 'cob-vista-detalle').hidden === false && !maestro(S))
    chk('celular: abrir una cobranza sube la página', S.__scrolls() > antes)
    chk('celular: el subtítulo dice Detalle', el(S, 'cob-subtitulo').textContent === 'Detalle')
  }

  // ── Escritorio: lado a lado ──────────────────────────────────────────────
  {
    const S = sandbox()
    S.__escritorio(true)
    conListado(S, ['c1', 'c2', 'c3'])
    S.mostrarVistaCob('listado')
    chk('escritorio: el listado activa el modo maestro', maestro(S))
    chk('escritorio: listado y panel visibles a la vez', el(S, 'cob-vista-listado').hidden === false && el(S, 'cob-vista-detalle').hidden === false)
    chk('escritorio: sin cobranza elegida, el panel dice algo neutro y ninguna cifra',
      /Elegí una cobranza/.test(el(S, 'cob-detalle-cuerpo').innerHTML) && !/\$/.test(el(S, 'cob-detalle-cuerpo').innerHTML))
    S.renderizarListado()
    const antes = S.__scrolls()
    await S.abrirDetalle('c2')
    chk('escritorio: abrir una cobranza la deja elegida', S.estado.cobranzaSeleccionadaId === 'c2')
    chk('escritorio: abrir una cobranza NO oculta el listado', el(S, 'cob-vista-listado').hidden === false && maestro(S))
    chk('escritorio: abrir una cobranza NO mueve la página', S.__scrolls() === antes)
    chk('escritorio: el panel muestra la elegida', el(S, 'cob-detalle-cuerpo').innerHTML === 'DETALLE:c2')
    chk('escritorio: el subtítulo sigue diciendo Listado', el(S, 'cob-subtitulo').textContent === 'Listado')
    chk('escritorio: las pestañas y la barra del listado siguen a la vista',
      el(S, 'cob-pestanas').hidden === false && el(S, 'cob-barra-listado').hidden === false)
    const filas = S.__filas()
    const marcadas = filas.filter(f => f.classList.contains('cob-fila--seleccionada'))
    chk('escritorio: la fila elegida lleva la clase, y solo ella', marcadas.length === 1 && marcadas[0].dataset.cobranza === 'c2')
    chk('escritorio: la fila elegida lleva aria-current y las otras no',
      filas.filter(f => f.getAttribute('aria-current') === 'true').map(f => f.dataset.cobranza).join() === 'c2')

    // Redibujar el listado (después de una acción) conserva la elegida.
    S.renderizarListado()
    chk('escritorio: al redibujar, el render marca la elegida',
      /class="tarjeta-lista cob-fila cob-fila--registrada cob-fila--seleccionada" aria-current="true" data-cobranza="c2"/.test(el(S, 'cob-lista').innerHTML) &&
      (el(S, 'cob-lista').innerHTML.match(/cob-fila--seleccionada/g) || []).length === 1)

    // Otra fila: la marca se mueve.
    await S.abrirDetalle('c3')
    chk('escritorio: elegir otra fila mueve la marca',
      S.__filas().filter(f => f.classList.contains('cob-fila--seleccionada')).map(f => f.dataset.cobranza).join() === 'c3')

    // Volver al listado (por ejemplo, después de editar) vuelve a leer la elegida.
    const lecturas = S.__lecturas()
    S.mostrarVistaCob('listado')
    await esperar()
    chk('escritorio: volver al listado vuelve a leer la cobranza abierta', S.__lecturas() === lecturas + 1)

    // El filtro deja afuera la elegida: el panel se vacía.
    S.estado.cobranzas = [cob('c1')]
    S.renderizarListado()
    chk('escritorio: si el filtro deja afuera la elegida, se suelta la selección', S.estado.cobranzaSeleccionadaId === null && S.estado.detalle === null)
    chk('escritorio: ...y el panel dice algo neutro, sin cifras',
      /no está en el listado/.test(el(S, 'cob-detalle-cuerpo').innerHTML) && !/\$/.test(el(S, 'cob-detalle-cuerpo').innerHTML))
  }

  // ── Escritorio: un detalle abierto desde Cheques sigue a pantalla entera ──
  {
    const S = sandbox()
    S.__escritorio(true)
    conListado(S, ['c1', 'c2'])
    S.mostrarVistaCob('listado')
    await S.abrirDetalle('c1')
    await S.abrirDetalle('c2', { origen: 'cheques' })
    chk('desde Cheques: el detalle ocupa la pantalla (sin modo maestro, listado oculto)',
      !maestro(S) && el(S, 'cob-vista-listado').hidden === true && el(S, 'cob-vista-detalle').hidden === false)
    chk('desde Cheques: la selección del listado no cambia', S.estado.cobranzaSeleccionadaId === 'c1')
    S.estado.cobranzas = []
    S.renderizarListado()
    chk('desde Cheques: redibujar el listado no vacía el detalle abierto', el(S, 'cob-detalle-cuerpo').innerHTML === 'DETALLE:c2')
  }

  // ── Escritorio: una respuesta vieja no pisa el panel ─────────────────────
  {
    const S = sandbox()
    S.__escritorio(true)
    conListado(S, ['c1', 'c2'])
    S.mostrarVistaCob('listado')
    const lenta = diferida()
    S.__demoras.set('c1', lenta.p)
    const pa = S.abrirDetalle('c1')
    await S.abrirDetalle('c2')
    lenta.resolver()
    await pa
    await esperar()
    chk('turno: la respuesta de la cobranza anterior no pisa el panel', el(S, 'cob-detalle-cuerpo').innerHTML === 'DETALLE:c2')

    // Y si la anterior no existe (se borró o no se ve), su "No se encontró"
    // tampoco pisa el panel: esa rama escribe ANTES del segundo guard.
    const perdida = diferida()
    S.__demoras.set('cx', perdida.p)
    const px = S.abrirDetalle('cx')
    await S.abrirDetalle('c1')
    perdida.resolver()
    await px
    await esperar()
    chk('turno: el "No se encontró" de la anterior no pisa el panel', el(S, 'cob-detalle-cuerpo').innerHTML === 'DETALLE:c1')
  }

  // ── Escritorio: el filtro que no deja NINGUNA fila también suelta ─────────
  {
    const S = sandbox()
    S.__escritorio(true)
    conListado(S, ['c1'])
    S.mostrarVistaCob('listado')
    S.renderizarListado()
    await S.abrirDetalle('c1')
    S.estado.cobranzas = []
    S.renderizarListado()
    chk('escritorio: un filtro sin ninguna fila suelta la selección y vacía el panel',
      S.estado.cobranzaSeleccionadaId === null && /no está en el listado/.test(el(S, 'cob-detalle-cuerpo').innerHTML))
  }

  // ── La fila: celdas de escritorio ─────────────────────────────────────────
  {
    const S = sandbox()
    const h = S.htmlFilaCobranza(cob('x', { efectivo: 0, cantidad_cheques: 0, fecha: '2026-09-07', total: 1500 }))
    chk('fila: la fecha de la tabla va como DD/MM', /cob-celda--fecha">07\/09</.test(h))
    chk('fila: sin cheques ni efectivo, las celdas dicen "—" atenuado',
      (h.match(/cob-celda--vacia">—</g) || []).length === 2)
    chk('fila: sin elegir, ni la clase ni aria-current', !/cob-fila--seleccionada/.test(h) && !/aria-current/.test(h))
  }

  // ── El CSS ────────────────────────────────────────────────────────────────
  {
    // Sin los comentarios del CSS: nombran clases para explicarlas y no son
    // reglas. Pelar /* */ es seguro ACÁ porque se corta en </style>, antes de
    // cualquier accept="image/*" del HTML.
    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')
    // Los bloques @media, con su contenido.
    const bloques = []
    const re = /@media\s*([^{]+)\{/g
    let m
    while ((m = re.exec(css)) !== null) {
      let d = 1, i = re.lastIndex
      for (; i < css.length && d; i++) { if (css[i] === '{') d++; else if (css[i] === '}') d-- }
      bloques.push({ cond: m[1].trim(), ini: m.index, fin: i })
      re.lastIndex = i
    }
    const dentroDeEscritorio = (pos) => bloques.some(b => b.ini < pos && pos < b.fin && /min-width:\s*1100px/.test(b.cond))
    const posiciones = (aguja) => { const r = []; let k = -1; while ((k = css.indexOf(aguja, k + 1)) !== -1) r.push(k); return r }
    const maestroPos = posiciones('.cob-maestro--activo')
    chk('css: hay reglas de escritorio', maestroPos.length > 10)
    chk('css: TODA regla de .cob-maestro--activo está adentro del @media (min-width: 1100px)',
      maestroPos.every(dentroDeEscritorio), maestroPos.filter(p => !dentroDeEscritorio(p)).map(p => css.slice(p, p + 60)).join(' | '))
    const selPos = posiciones('cob-fila--seleccionada')
    chk('css: la fila elegida solo se pinta en escritorio (celular no cambia)', selPos.length > 0 && selPos.every(dentroDeEscritorio))
    const mqJs = (FUENTE.match(/const MQ_ESCRITORIO = '([^']+)'/) || [])[1]
    chk('css: el corte del script es el mismo que el del CSS', mqJs === '(min-width: 1100px)' && bloques.some(b => b.cond === mqJs))
    const franjaCelular = css.indexOf('\n    .cob-fila--registrada { border-left-color: var(--naranja); }')
    chk('css: en celular la franja naranja sigue diciendo "falta procesar"', franjaCelular !== -1 && !dentroDeEscritorio(franjaCelular))
    const iReg = css.indexOf('.cob-maestro--activo .cob-fila--registrada { border-left-color: transparent; }')
    const iSel = css.indexOf('.cob-maestro--activo .cob-fila--seleccionada,')
    chk('css: en escritorio la franja pasa a marcar la elegida (registrada sin franja, elegida después)',
      iReg !== -1 && iSel !== -1 && iSel > iReg && dentroDeEscritorio(iReg) &&
      /border-left-color:\s*var\(--naranja\);\s*background:\s*var\(--naranja-suave\)/.test(css.slice(iSel, css.indexOf('}', iSel))))
    const iTablaBase = css.indexOf('.cob-fila__tabla,\n    .cob-lista-cabecera { display: none; }')
    chk('css: la tabla de escritorio no se dibuja en celular', iTablaBase !== -1 && !dentroDeEscritorio(iTablaBase))
    chk('css: en escritorio se esconde "Volver al listado"', /\.cob-maestro--activo #cob-btn-volver-listado \{ display: none; \}/.test(css))
    chk('css: el panel tiene scroll propio',
      /\.cob-maestro--activo #cob-vista-detalle \{[^}]*position:\s*sticky[^}]*overflow-y:\s*auto/.test(css))
    chk('css: el total de la tabla nunca lleva el color del módulo',
      /\.cob-maestro--activo \.cob-celda--total \{ font-weight: 700; color: var\(--color-texto\); \}/.test(css))
  }

  // ── Cifras de cabecera: no existen, a propósito ─────────────────────────────
  chk('no hay "Sin procesar" ni "Total del mes": no hay agregación en la base con los mismos filtros',
    // Como texto que llega a la pantalla (entre comillas o como contenido de
    // una etiqueta), no en los comentarios que explican por qué no están.
    !/['"`>]\s*(sin procesar|total del mes)/i.test(FUENTE))
}

pruebas().then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}).catch(e => {
  console.log('EXCEPCIÓN: ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
})
