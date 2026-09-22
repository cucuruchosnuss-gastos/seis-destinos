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
//    con el mismo corte que MQ_ESCRITORIO;
//  - LA FRANJA NARANJA DICE SIEMPRE "POR CONTROLAR" (estado registrada), en
//    celular y en escritorio. La fila elegida se marca solo con el fondo y
//    aria-current: ninguna regla de .cob-fila--seleccionada toca un borde.
//  - las cifras de cabecera ("Por controlar" / "Total del mes") viven en
//    test-cobranzas-cabecera.js: salen de resumen_cobranzas(), nunca de sumar
//    filas.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
// Las funciones de números de js/utils.js (leerNumeroAr, ponerNumero…),
// con su código REAL: el módulo las importa desde el 21/09/2026.
const { fuenteNumeros } = require('./numeros-comun')

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
  ${fuenteNumeros()}
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
const CONSTANTES = ['ZONA_AR', 'ACENTOS_COB', 'SIN_ACENTOS_COB', 'SUBTITULO_VISTA_COB', 'MQ_ESCRITORIO', 'ETIQUETA_ESTADO_COBRANZA']

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
    S.estado.cobranzaSeleccionadaId = 'r'
    const elegidaPorControlar = S.htmlFilaCobranza(cob('r', { estado: 'registrada' }))
    chk('fila: elegida y por controlar lleva las DOS clases (franja y fondo) y aria-current',
      /class="tarjeta-lista cob-fila cob-fila--registrada cob-fila--seleccionada" aria-current="true"/.test(elegidaPorControlar))
    S.estado.cobranzaSeleccionadaId = 'p'
    const elegidaAsentada = S.htmlFilaCobranza(cob('p', { estado: 'procesada' }))
    chk('fila: elegida y asentada lleva la clase de elegida y aria-current, sin la de por controlar',
      /class="tarjeta-lista cob-fila cob-fila--procesada cob-fila--seleccionada" aria-current="true"/.test(elegidaAsentada) &&
      !/cob-fila--registrada/.test(elegidaAsentada))
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
    chk('css: en celular la franja naranja dice "por controlar"', franjaCelular !== -1 && !dentroDeEscritorio(franjaCelular))

    // Las reglas, con su selector y su cuerpo, para mirar QUÉ toca cada una.
    const reglas = []
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) reglas.push({ sel: m[1].trim(), cuerpo: m[2], pos: m.index + m[0].indexOf(m[1].trim()) })
    const deSeleccion = reglas.filter(r => /cob-fila--seleccionada/.test(r.sel))
    chk('css: hay regla de la fila elegida, con el fondo naranja suave',
      deSeleccion.length > 0 && deSeleccion.some(r => /background:\s*var\(--naranja-suave\)/.test(r.cuerpo)))
    chk('css: NINGUNA regla de la fila elegida toca un borde (la franja no depende de la selección)',
      deSeleccion.every(r => !/border/.test(r.cuerpo)), deSeleccion.filter(r => /border/.test(r.cuerpo)).map(r => r.sel + ' {' + r.cuerpo + '}').join(' | '))
    const iBaseEsc = css.indexOf('.cob-maestro--activo .cob-fila {')
    const regEsc = reglas.filter(r => r.sel === '.cob-maestro--activo .cob-fila--registrada' && dentroDeEscritorio(r.pos))
    chk('css: en escritorio lo por controlar lleva la franja naranja, DESPUÉS de la base que la pone transparente',
      iBaseEsc !== -1 && regEsc.length === 1 && regEsc[0].pos > iBaseEsc && /border-left-color:\s*var\(--naranja\)/.test(regEsc[0].cuerpo))
    chk('css: ninguna regla de escritorio le saca la franja a lo por controlar',
      !reglas.some(r => /cob-fila--registrada/.test(r.sel) && dentroDeEscritorio(r.pos) && /border-left-color:\s*transparent/.test(r.cuerpo)))
    const iTablaBase = css.indexOf('.cob-fila__tabla,\n    .cob-lista-cabecera { display: none; }')
    chk('css: la tabla de escritorio no se dibuja en celular', iTablaBase !== -1 && !dentroDeEscritorio(iTablaBase))
    chk('css: en escritorio se esconde "Volver al listado"', /\.cob-maestro--activo #cob-btn-volver-listado \{ display: none; \}/.test(css))
    chk('css: el panel tiene scroll propio',
      /\.cob-maestro--activo #cob-vista-detalle \{[^}]*position:\s*sticky[^}]*overflow-y:\s*auto/.test(css))
    chk('css: el total de la tabla nunca lleva el color del módulo',
      /\.cob-maestro--activo \.cob-celda--total \{ font-weight: 700; color: var\(--color-texto\); \}/.test(css))
  }


  // ── La vista CHEQUES en escritorio (parte 9, 21/09/2026) ─────────────────
  // Desde 1100px la planilla usa el MISMO ancho que el listado en modo maestro
  // y el banco va en UNA línea con el nombre completo en el title. Abajo de
  // 1100px NADA cambia: el CSS fuera de los @media (min-width: 1100px) tiene
  // que ser idéntico al del baseline fijo (d79765b, NUNCA HEAD).
  {
    const pelar = (f) => f.slice(f.indexOf('<style>'), f.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')
    const bloquesDe = (css) => {
      const out = []
      const re = /@media\s*([^{]+)\{/g
      let m
      while ((m = re.exec(css)) !== null) {
        let d = 1, i = re.lastIndex
        for (; i < css.length && d; i++) { if (css[i] === '{') d++; else if (css[i] === '}') d-- }
        out.push({ cond: m[1].trim(), ini: m.index, fin: i, texto: css.slice(m.index, i) })
        re.lastIndex = i
      }
      return out
    }
    // El CSS que rige ABAJO de 1100px: todo menos los bloques con min-width 1100.
    const fueraDeEscritorio = (css) => {
      let r = css
      for (const b of bloquesDe(css).filter(b => /min-width:\s*1100px/.test(b.cond)).reverse()) r = r.slice(0, b.ini) + r.slice(b.fin)
      return r.replace(/\s+/g, ' ').trim()
    }
    const css = pelar(FUENTE)
    const bloques = bloquesDe(css)
    const escritorio = bloques.filter(b => b.cond === '(min-width: 1100px)')
    const angosto = bloques.filter(b => b.cond === '(min-width: 1100px) and (max-width: 1399px)')

    // (1) El contenedor de la vista Cheques toma el ancho del listado.
    const cuerpoDe = (sel) => {
      for (const b of escritorio) {
        const i = b.texto.indexOf(sel + ' {')
        if (i !== -1) return (b.texto.slice(i).match(/^[^{]*\{([^}]*)\}/) || [])[1] || null
      }
      return null
    }
    const cuerpoListado = cuerpoDe('.cob-contenedor:has(.cob-maestro--activo)')
    const cuerpoCheques = cuerpoDe('.cob-contenedor:has(#cob-vista-cheques:not([hidden]))')
    const max = (c) => ((c || '').match(/max-width:\s*([^;]+);/) || [])[1]
    chk('cheques escritorio: hay regla del contenedor de la vista Cheques adentro del @media (min-width: 1100px)', !!cuerpoCheques)
    chk('cheques escritorio: el ancho es EL MISMO que el del listado en modo maestro',
      !!max(cuerpoListado) && max(cuerpoListado) === max(cuerpoCheques), `${max(cuerpoListado)} vs ${max(cuerpoCheques)}`)
    chk('cheques escritorio: el ancho engancha a la vista VISIBLE (un detalle abierto desde Cheques vuelve al ancho de siempre)',
      !/\.cob-contenedor:has\(#cob-vista-cheques\)\s*\{/.test(css))

    // (2) El banco en una línea, con puntos suspensivos, SOLO en escritorio.
    const posBanco = []
    { let k = -1; while ((k = css.indexOf('.cob-tabla__banco', k + 1)) !== -1) posBanco.push(k) }
    const enEscritorio = (p) => bloques.some(b => b.ini < p && p < b.fin && /min-width:\s*1100px/.test(b.cond))
    chk('cheques escritorio: toda regla de .cob-tabla__banco vive adentro de un @media (min-width: 1100px)',
      posBanco.length > 0 && posBanco.every(enEscritorio))
    const reglaBanco = escritorio.map(b => (b.texto.match(/\.cob-tabla__banco \{([^}]*)\}/) || [])[1]).find(Boolean) || ''
    chk('cheques escritorio: el banco no se parte (white-space: nowrap)', /white-space:\s*nowrap/.test(reglaBanco), reglaBanco)
    chk('cheques escritorio: el banco se corta con puntos suspensivos',
      /overflow:\s*hidden/.test(reglaBanco) && /text-overflow:\s*ellipsis/.test(reglaBanco), reglaBanco)
    chk('cheques escritorio: el banco tiene un ancho máximo (sin él, nowrap no corta nada)', /max-width:\s*[\d.]+rem/.test(reglaBanco), reglaBanco)
    // Entre 1100 y 1399 el banco se achica y suelta el min-width de
    // .cob-tabla__texto, que si no le gana al max-width: medido en Chrome, sin
    // esto a 1100px la tabla se pasaba 77px y aparecía scroll de costado.
    const reglaAngosta = angosto.map(b => (b.texto.match(/\.cob-tabla__banco \{([^}]*)\}/) || [])[1]).find(Boolean) || ''
    chk('cheques escritorio: entre 1100 y 1399 el banco se achica y suelta el min-width',
      /min-width:\s*0/.test(reglaAngosta) && /max-width:\s*[\d.]+rem/.test(reglaAngosta), reglaAngosta)
    const remDe = (c) => Number((c.match(/max-width:\s*([\d.]+)rem/) || [])[1])
    chk('cheques escritorio: entre 1100 y 1399 el banco es más angosto que desde 1400',
      remDe(reglaAngosta) < remDe(reglaBanco), `${remDe(reglaAngosta)} vs ${remDe(reglaBanco)}`)

    // (3) ABAJO DE 1100 NADA CAMBIÓ: el CSS fuera de los bloques de escritorio,
    // idéntico al del baseline fijo.
    let base = ''
    try {
      base = require('child_process').execSync('git show d79765b:modulos/cobranzas.html',
        { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    } catch (e) { base = '' }
    chk('baseline d79765b: se pudo leer (si no, esta verificación no mide nada)', base.length > 100000 && base.includes('<style>'), base.length)
    const hoyFuera = fueraDeEscritorio(css)
    const antesFuera = fueraDeEscritorio(pelar(base))
    let dif = ''
    if (hoyFuera !== antesFuera) {
      let i = 0; while (hoyFuera[i] === antesFuera[i]) i++
      dif = `hoy «${hoyFuera.slice(Math.max(0, i - 60), i + 80)}» / antes «${antesFuera.slice(Math.max(0, i - 60), i + 80)}»`
    }
    chk('abajo de 1100px el CSS es IDÉNTICO al del baseline d79765b', base.length > 100000 && hoyFuera === antesFuera, dif)

    // (4) La celda del banco, EJECUTADA: la clase de una línea y el title
    // escapado. El nombre es texto de la base (bancos_bcra, o el texto de un
    // código que no está en el catálogo): va con escCob, también en el atributo.
    const { construir } = require('./sandbox')
    const S = construir(ARCHIVO)
    const marcaT = '"><b data-xss="banco_title">'
    const nombre = marcaT + 'BANCO DE GALICIA Y BUENOS AIRES S.A.'
    S.estado.bancos = new Map([['007', nombre]])
    const h = S.htmlTablaCheques([{ id: 'x1', cobranza_id: 'c1', banco_codigo: '007', numero: '12345678', tipo: 'comun',
      fecha_emision: '2026-09-02', fecha_pago: null, importe: 10, estado: 'en_cartera', salida_fecha: null, salida_destino: null }],
      new Map([['c1', { id: 'c1', cliente: 'X', estado: 'registrada' }]]))
    const esc = S.escCob(nombre)
    const td = (h.match(/<td class="[^"]*cob-tabla__banco[^"]*"[^>]*>/) || [])[0] || ''
    chk('cheques: la celda del banco lleva la clase de una línea', td !== '', h.slice(0, 400))
    chk('cheques: la celda del banco lleva el nombre COMPLETO en el title, escapado', td.includes(`title="${esc}"`), td)
    chk('cheques: ninguna marca sale cruda (tampoco en el title)', !/<b data-xss=/.test(h))
    chk('cheques: el texto de la celda sigue siendo el nombre, escapado', h.includes(`>${esc}</td>`))
    chk('cheques: la celda conserva .cob-tabla__texto (abajo de 1100 se ve como antes)',
      /class="cob-tabla__texto cob-tabla__banco"/.test(td), td)
  }

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
