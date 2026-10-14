// Suite: el recuadro naranja del total de Gastos mide lo mismo en todos los
// períodos y el número nunca se corta (14/10/2026).
//
// EL BUG: con "Hoy" el recuadro se veía bien; con "En el mes" se achicaba a
// ~190 px y el número quedaba cortado. La grilla de totales era
// `repeat(auto-fit, minmax(160px, 1fr))`: con dos tarjetas, las columnas que
// sobran se "pliegan" y cada tarjeta se lleva la mitad. Pero con gastos de
// más de una empresa (lo normal en el mes) aparece el detalle "Por unidad",
// que ocupa TODO el ancho (`grid-column: 1 / -1`): esas columnas dejan de
// estar vacías, ya no se pliegan, y el total queda en una de seis columnas de
// 160 px. Encima la tarjeta tenía `overflow: hidden`: el número se cortaba en
// vez de verse.
//
// Qué se prueba, EJECUTANDO renderizarTotalGastos (con un document falso) y
// aplicando el CSS real del archivo (gastos.html + css/main.css) con una
// cascada chica (especificidad, orden, !important, @media por ancho):
//  - la grilla tiene una cantidad FIJA de columnas (nada de auto-fit /
//    auto-fill) que no se estiran por su contenido, y "Por unidad" va en su
//    renglón;
//  - la tarjeta del total es la misma con una empresa y con varias, y nada
//    de lo que rodea al número lo recorta (overflow), lo corta con puntos
//    suspensivos ni le prohíbe bajar de renglón;
//  - la letra se achica sola (clamp con el ancho de la tarjeta) en la compu, y
//    el número puede pasar a dos renglones en cualquier ancho;
//  - el número que se dibuja es el total entero.
//
//   node pruebas/test-gastos-total-mes.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-total-mes.js

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const MAIN_CSS = fs.readFileSync(path.join(RAIZ, 'css/main.css'), 'utf8')
const { chk, fin } = arnes()

// ── Un CSS chico: reglas con su @media, y una cascada ──────────────────────
function estilosDe(html) {
  const bloques = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g
  let m
  while ((m = re.exec(html))) bloques.push(m[1])
  return bloques.join('\n')
}

// Devuelve [{ selectores: [..], decl: [{ prop, valor, imp }], media, orden }].
function reglasDe(css, origen) {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const reglas = []
  let orden = 0
  function parsear(txt, media) {
    let i = 0
    while (i < txt.length) {
      const llave = txt.indexOf('{', i)
      if (llave === -1) break
      let prelude = txt.slice(i, llave).trim()
      // Las @ sin bloque (@import, @charset) terminan en ';'.
      while (prelude.startsWith('@') && prelude.includes(';') && !/^@(media|supports)/.test(prelude)) {
        prelude = prelude.slice(prelude.indexOf(';') + 1).trim()
      }
      let prof = 1, j = llave + 1
      while (j < txt.length && prof > 0) { if (txt[j] === '{') prof++; else if (txt[j] === '}') prof--; j++ }
      const cuerpo = txt.slice(llave + 1, j - 1)
      if (/^@media/.test(prelude)) parsear(cuerpo, [...media, prelude.slice(6).trim()])
      else if (/^@supports/.test(prelude)) parsear(cuerpo, media)
      else if (prelude.startsWith('@')) { /* @keyframes, @font-face: no son reglas de elementos */ }
      else {
        const decl = cuerpo.split(';').map(d => d.trim()).filter(Boolean).map(d => {
          const k = d.indexOf(':')
          if (k === -1) return null
          let valor = d.slice(k + 1).trim()
          const imp = /!\s*important\s*$/i.test(valor)
          if (imp) valor = valor.replace(/!\s*important\s*$/i, '').trim()
          return { prop: d.slice(0, k).trim().toLowerCase(), valor, imp }
        }).filter(Boolean)
        reglas.push({ selectores: prelude.split(',').map(s => s.trim()).filter(Boolean), decl, media, orden: orden++, origen })
      }
      i = j
    }
  }
  parsear(limpio, [])
  return reglas
}

// ¿Vale este @media a este ancho? Solo se entienden min/max-width; cualquier
// otra condición (print, hover, orientación) se toma como que NO vale.
function mediaVale(q, ancho) {
  return q.split(',').some(alt => {
    const a = alt.trim().toLowerCase()
    if (/\bprint\b/.test(a)) return false
    const condiciones = a.match(/\([^)]*\)/g) || []
    return condiciones.every(c => {
      const mm = c.match(/^\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)$/)
      if (!mm) return false
      return mm[1] === 'min' ? ancho >= Number(mm[2]) : ancho <= Number(mm[2])
    })
  })
}

// Un elemento: { tag, id, clases:Set, attrs, estilo:[decl], padre }.
function elemento(tag, attrs, padre) {
  const clase = (attrs.match(/\bclass="([^"]*)"/) || [])[1] || ''
  const id = (attrs.match(/\bid="([^"]*)"/) || [])[1] || ''
  const style = (attrs.match(/\bstyle="([^"]*)"/) || [])[1] || ''
  const estilo = style.split(';').map(d => d.trim()).filter(Boolean).map(d => {
    const k = d.indexOf(':')
    let valor = d.slice(k + 1).trim()
    const imp = /!\s*important\s*$/i.test(valor)
    if (imp) valor = valor.replace(/!\s*important\s*$/i, '').trim()
    return { prop: d.slice(0, k).trim().toLowerCase(), valor, imp }
  })
  return { tag: tag.toLowerCase(), id, clases: new Set(clase.split(/\s+/).filter(Boolean)), attrs, estilo, padre, hijos: [] }
}

const VACIOS = new Set(['input', 'img', 'br', 'meta', 'link', 'hr', 'source', 'col', 'area', 'base', 'wbr'])

// Arma el árbol de un pedazo de HTML (sin <script>/<style> adentro).
function arbol(html, raiz) {
  const pila = [raiz]
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g
  let m
  while ((m = re.exec(html))) {
    const actual = pila[pila.length - 1]
    if (m[4] !== undefined) { actual.texto = (actual.texto || '') + m[4]; continue }
    const tag = m[2].toLowerCase()
    if (m[1]) { if (pila.length > 1 && pila[pila.length - 1].tag === tag) pila.pop(); continue }
    const el = elemento(tag, m[3], actual)
    actual.hijos.push(el)
    if (!VACIOS.has(tag) && !/\/\s*$/.test(m[3])) pila.push(el)
  }
  return raiz
}

// La cadena real de ancestros de #total-gastos en la página (desde <body>).
function grillaEnLaPagina(html) {
  const ini = html.indexOf('<body')
  const iGrilla = html.indexOf('id="total-gastos"')
  if (ini === -1 || iGrilla === -1) return null
  const fin = html.indexOf('>', iGrilla) + 1
  const tramo = html.slice(ini, fin)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const pila = [{ tag: '#doc', clases: new Set(), estilo: [], hijos: [], padre: null, id: '', attrs: '' }]
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g
  let m, ultimo = null
  while ((m = re.exec(tramo))) {
    const tag = m[2].toLowerCase()
    if (m[1]) {
      // Cierra hasta el último abierto con ese nombre.
      for (let k = pila.length - 1; k > 0; k--) if (pila[k].tag === tag) { pila.length = k; break }
      continue
    }
    const el = elemento(tag, m[3], pila[pila.length - 1])
    if (!VACIOS.has(tag)) pila.push(el)
    ultimo = el
  }
  return ultimo && ultimo.id === 'total-gastos' ? ultimo : null
}

// Selectores: compuestos de tag, .clase, #id, [attr] y pseudo-clases, con
// descendiente (espacio) e hijo (>). Una pseudo-clase que no se entiende NO
// matchea (conservador: :hover, :focus, ::before…). :first-child sí.
function partirSelector(sel) {
  const tokens = sel.replace(/\s*>\s*/g, ' > ').trim().split(/\s+/)
  const partes = []
  let comb = ' '
  for (const t of tokens) {
    if (t === '>') { comb = '>'; continue }
    partes.push({ comp: t, comb })
    comb = ' '
  }
  return partes
}
function especificidad(sel) {
  const s = sel.replace(/::?[a-z-]+(\([^)]*\))?/g, m => m.startsWith('::') ? ' tag ' : ' .x ')
  const ids = (s.match(/#[\w-]+/g) || []).length
  const clases = (s.match(/\.[\w-]+|\[[^\]]*\]/g) || []).length
  const tags = (s.replace(/[#.][\w-]+|\[[^\]]*\]/g, ' ').match(/(^|[\s>])[a-z][\w-]*/gi) || []).length
  return ids * 10000 + clases * 100 + tags
}
function matcheaCompuesto(el, comp) {
  if (!el || el.tag === '#doc') return false
  let resto = comp
  const tag = resto.match(/^[a-zA-Z][\w-]*|^\*/)
  if (tag) { if (tag[0] !== '*' && tag[0].toLowerCase() !== el.tag) return false; resto = resto.slice(tag[0].length) }
  const re = /\.([\w-]+)|#([\w-]+)|\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]|(::?[\w-]+(?:\([^)]*\))?)/g
  let m, consumido = 0
  while ((m = re.exec(resto))) {
    if (m.index !== consumido) return false
    consumido = m.index + m[0].length
    if (m[1] && !el.clases.has(m[1])) return false
    if (m[2] && el.id !== m[2]) return false
    if (m[3]) {
      const a = m[3].trim()
      const v = (el.attrs.match(new RegExp('\\b' + a + '(?:="([^"]*)")?(?=[\\s>/]|$)')) || [])
      if (!v.length) return false
      if (m[4] !== undefined && v[1] !== m[4]) return false
    }
    if (m[5]) {
      if (m[5] === ':first-child') { if (!el.padre || el.padre.hijos?.[0] !== el) return false }
      else if (m[5] === ':root') { return false }
      else return false
    }
  }
  return consumido === resto.length
}
function matchea(el, sel) {
  const partes = partirSelector(sel)
  function desde(e, i) {
    if (!matcheaCompuesto(e, partes[i].comp)) return false
    if (i === 0) return true
    if (partes[i].comb === '>') return desde(e.padre, i - 1)
    for (let a = e.padre; a; a = a.padre) if (desde(a, i - 1)) return true
    return false
  }
  return desde(el, partes.length - 1)
}

const REGLAS = [...reglasDe(MAIN_CSS, 'main.css'), ...reglasDe(estilosDe(FUENTE), 'gastos.html')]
  .map((r, k) => ({ ...r, orden: k }))

// El valor que gana para una propiedad, a un ancho de pantalla.
function computado(el, prop, ancho) {
  let mejor = null
  const pesar = (imp, esp, orden) => (imp ? 1e12 : 0) + esp * 1e5 + orden
  for (const r of REGLAS) {
    if (!r.media.every(q => mediaVale(q, ancho))) continue
    for (const sel of r.selectores) {
      if (!matchea(el, sel)) continue
      const esp = especificidad(sel)
      for (const d of r.decl) {
        if (d.prop !== prop) continue
        const p = pesar(d.imp, esp, r.orden)
        if (!mejor || p >= mejor.peso) mejor = { valor: d.valor, peso: p, de: `${r.origen}: ${sel}` }
      }
    }
  }
  for (const d of el.estilo) {
    if (d.prop !== prop) continue
    const p = (d.imp ? 1e12 : 0) + 1e9
    if (!mejor || p >= mejor.peso) mejor = { valor: d.valor, peso: p, de: 'style=""' }
  }
  return mejor
}
// Con los atajos: overflow → overflow-x; los valores sueltos del navegador.
function valor(el, prop, ancho) { return computado(el, prop, ancho)?.valor ?? null }
function overflowX(el, ancho) {
  const x = computado(el, 'overflow-x', ancho), o = computado(el, 'overflow', ancho)
  const ganador = !x ? o : !o ? x : (x.peso >= o.peso ? x : o)
  if (!ganador) return 'visible'
  return ganador.valor.split(/\s+/)[0]
}

// ── El render real ──────────────────────────────────────────────────────────
const NUSS = 'u-n', DOLCE = 'u-d', TALLER = 'u-t'
const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  var __els = new Map()
  function nuevoEl(id) { return { id, innerHTML: '', hidden: true, style: {}, dataset: {} } }
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var estado = {
    filtros: { rangoRapido: 'hoy' },
    maestros: { unidades: [
      { id: '${NUSS}', nombre: 'Cucuruchos Nuss' }, { id: '${DOLCE}', nombre: 'Dolce Pasta' }, { id: '${TALLER}', nombre: 'Taller' },
    ] },
  }
`
const FUNCIONES = ['esc', 'formatearImporte', 'renderizarTotalGastos', 'totalesPorUnidad', 'htmlTotalesPorUnidad', 'unidadDeGasto', 'nombreUnidadDe']
const RETORNO = `estado, __el(id){ return document.getElementById(id) }`
const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: [], retorno: RETORNO })

function gasto(id, unidad, importe) {
  return { id, unidad_negocio_id: unidad, unidades_negocio: { id: unidad, nombre: unidad }, importe, moneda: 'ARS', estado: 'registrado' }
}
// Hoy: una empresa. Mes: tres (aparece "Por unidad").
const HOY = [gasto('g1', NUSS, 123456789.99)]
const MES = [gasto('g1', NUSS, 123456789.99), gasto('g2', DOLCE, 100000000), gasto('g3', TALLER, 200000000)]

function dibujar(rango, gastos) {
  S.estado.filtros.rangoRapido = rango
  S.renderizarTotalGastos(gastos)
  const el = S.__el('total-gastos')
  return { html: el.innerHTML, hidden: el.hidden }
}

const GRILLA = grillaEnLaPagina(FUENTE)
chk('la grilla de totales está en la página (#total-gastos)', !!GRILLA)

function armar(html) {
  const g = GRILLA || elemento('div', 'id="total-gastos" class="grilla-totales"', null)
  // El render la muestra (hidden = false): sin el atributo hidden de la página.
  const copia = { ...g, attrs: g.attrs.replace(/\shidden(?=[\s>/]|$)/, ''), hijos: [] }
  arbol(html, copia)
  return copia
}
const buscar = (raiz, f) => {
  for (const h of raiz.hijos) { if (f(h)) return h; const x = buscar(h, f); if (x) return x }
  return null
}
const conClase = (c) => (e) => e.clases.has(c)
const textoDe = (e) => (e.texto || '') + e.hijos.map(textoDe).join('')

const dHoy = dibujar('hoy', HOY)
const dMes = dibujar('mes', MES)
chk('se dibuja con una empresa y con varias', dHoy.hidden === false && dMes.hidden === false)
chk('con varias empresas aparece "Por unidad" (el caso del bug)', dMes.html.includes('id="totales-por-unidad"') && !dHoy.html.includes('id="totales-por-unidad"'))

const gHoy = armar(dHoy.html)
const gMes = armar(dMes.html)
const tarjetaHoy = gHoy.hijos[0], tarjetaMes = gMes.hijos[0]
chk('la primera tarjeta es la del total', !!tarjetaHoy && tarjetaHoy.clases.has('grilla-totales__card') && !!tarjetaMes)

// Las pistas de un grid-template-columns, con repeat(N, …) desplegado. Un
// repeat que no es un número (auto-fit / auto-fill) no tiene cantidad fija:
// devuelve null.
function pistasDe(cols) {
  const partes = []
  let prof = 0, actual = ''
  for (const ch of cols.trim()) {
    if (ch === '(') prof++
    if (ch === ')') prof--
    if (/\s/.test(ch) && prof === 0) { if (actual) partes.push(actual); actual = ''; continue }
    actual += ch
  }
  if (actual) partes.push(actual)
  const lista = []
  for (const p of partes) {
    const r = p.match(/^repeat\(\s*([^,]+?)\s*,\s*(.+)\)$/)
    if (!r) { lista.push(p); continue }
    if (!/^\d+$/.test(r[1])) return null
    for (let k = 0; k < Number(r[1]); k++) lista.push(r[2].trim())
  }
  return lista
}

// ── 1. La grilla: columnas fijas que no dependen del contenido ─────────────
for (const ancho of [1280, 1000, 700]) {
  const cols = valor(gMes, 'grid-template-columns', ancho) || ''
  chk(`${ancho} px: la grilla es grid`, /grid/.test(valor(gMes, 'display', ancho) || ''), valor(gMes, 'display', ancho))
  chk(`${ancho} px: la grilla NO usa auto-fit / auto-fill (con "Por unidad" a todo el ancho las columnas vacías no se pliegan)`, !/auto-(fit|fill)/.test(cols), cols)
  const lista = pistasDe(cols)
  chk(`${ancho} px: dos columnas, una para el total y otra para Registros`, !!lista && lista.length === 2, cols)
  chk(`${ancho} px: ninguna columna se estira por lo que tiene adentro (mínimo 0)`, !!lista && lista.length > 0 && lista.every(p => /^minmax\(\s*0(px)?\s*,/.test(p)), cols)
}
const porUnidad = buscar(gMes, e => e.id === 'totales-por-unidad')
chk('"Por unidad" va en su propio renglón, a todo el ancho', !!porUnidad && /^1\s*\/\s*-1$/.test(valor(porUnidad, 'grid-column', 1280) || ''), porUnidad && valor(porUnidad, 'grid-column', 1280))
for (const ancho of [390, 360]) {
  const cols = valor(gMes, 'grid-template-columns', ancho) || ''
  chk(`${ancho} px: en el celular, una sola columna`, /^1fr$|^minmax\(\s*0(px)?\s*,\s*1fr\s*\)$/.test(cols), cols)
}

// ── 2. La tarjeta del total: la misma en todos los períodos y sin recortar ──
const abre = (h) => (h.match(/<div class="grilla-totales__card[^"]*"[^>]*>/) || [''])[0].replace(/\s+/g, ' ')
chk('la tarjeta del total es la MISMA (clases y estilo) con una empresa y con varias', abre(dHoy.html) !== '' && abre(dHoy.html) === abre(dMes.html), abre(dHoy.html) + ' vs ' + abre(dMes.html))
chk('la tarjeta del total tiene su clase propia (grilla-totales__card--total)', !!tarjetaMes && tarjetaMes.clases.has('grilla-totales__card--total'))

for (const ancho of [1280, 1000, 390, 360]) {
  const tarjeta = tarjetaMes
  const monto = tarjeta && buscar(tarjeta, conClase('grilla-totales__monto'))
  chk(`${ancho} px: el número está adentro de la tarjeta del total`, !!monto)
  if (!monto) continue
  const cadena = []
  for (let e = monto; e; e = e.padre) { cadena.push(e); if (e === gMes) break }
  const nombre = (e) => [...e.clases][0] || e.tag
  for (const e of cadena) {
    chk(`${ancho} px: ${nombre(e)} no recorta (overflow visible)`, overflowX(e, ancho) === 'visible', `overflow ${overflowX(e, ancho)} — ${computado(e, 'overflow', ancho)?.de || computado(e, 'overflow-x', ancho)?.de}`)
    chk(`${ancho} px: ${nombre(e)} no corta con puntos suspensivos`, valor(e, 'text-overflow', ancho) !== 'ellipsis', computado(e, 'text-overflow', ancho)?.de)
    chk(`${ancho} px: ${nombre(e)} deja bajar de renglón (sin nowrap)`, !/nowrap|^pre$/.test(valor(e, 'white-space', ancho) || ''), computado(e, 'white-space', ancho)?.de)
  }
  chk(`${ancho} px: la tarjeta puede achicarse con su columna (min-width: 0)`, /^0(px)?$/.test(valor(tarjeta, 'min-width', ancho) || ''), valor(tarjeta, 'min-width', ancho))
  const columna = monto.padre
  chk(`${ancho} px: la columna del número puede achicarse adentro de la tarjeta (min-width: 0)`, columna !== tarjeta && /^0(px)?$/.test(valor(columna, 'min-width', ancho) || ''), valor(columna, 'min-width', ancho))
  chk(`${ancho} px: si no entra, el número baja de renglón (overflow-wrap)`, /anywhere|break-word/.test(valor(monto, 'overflow-wrap', ancho) || valor(monto, 'word-wrap', ancho) || ''), valor(monto, 'overflow-wrap', ancho))
  chk(`${ancho} px: la tarjeta tiene un alto mínimo propio`, /^[1-9][\d.]*(rem|px)$/.test(valor(tarjeta, 'min-height', ancho) || ''), valor(tarjeta, 'min-height', ancho))
}

// ── 3. La letra se achica sola en la compu ──────────────────────────────────
{
  const monto = tarjetaMes && buscar(tarjetaMes, conClase('grilla-totales__monto'))
  const letra = monto ? (valor(monto, 'font-size', 1280) || '') : ''
  const c = letra.match(/^clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)cqi\s*,\s*([\d.]+)rem\s*\)$/)
  chk('1280 px: la letra del total es clamp(mínimo rem, N cqi, máximo rem)', !!c, letra)
  chk('1280 px: el clamp achica (mínimo < máximo)', !!c && Number(c[1]) < Number(c[3]), letra)
  chk('la tarjeta es contenedor de su ancho (container-type: inline-size), así el cqi mide la tarjeta', !!tarjetaMes && valor(tarjetaMes, 'container-type', 1280) === 'inline-size', tarjetaMes && valor(tarjetaMes, 'container-type', 1280))
  // Con la letra más grande permitida, "$ 123.456.789,99" (≈ 7,7 em) entra en
  // la tarjeta más angosta de la compu: el cqi la achica antes de cortar.
  chk('el cqi alcanza para 18 caracteres (≤ 12 cqi)', !!c && Number(c[2]) <= 12, letra)
}

// ── 4. El número es el total entero ────────────────────────────────────────
{
  const monto = tarjetaMes && buscar(tarjetaMes, conClase('grilla-totales__monto'))
  const texto = monto ? textoDe(monto).replace(/\s+/g, '') : ''
  chk('el número es el total entero ($ 423.456.789,99)', texto === '$423.456.789,99', texto)
  const montoHoy = tarjetaHoy && buscar(tarjetaHoy, conClase('grilla-totales__monto'))
  chk('con Hoy, el total de hoy ($ 123.456.789,99)', !!montoHoy && textoDe(montoHoy).replace(/\s+/g, '') === '$123.456.789,99')
}

// ── 5. Estático: ninguna regla de los totales corta con puntos suspensivos ──
{
  const malas = REGLAS.filter(r => r.selectores.some(s => /grilla-totales/.test(s)) && r.decl.some(d => d.prop === 'text-overflow' && /ellipsis/.test(d.valor)))
  chk('ninguna regla de la grilla de totales usa text-overflow: ellipsis', malas.length === 0, malas.map(r => r.selectores.join(',')).join(' | '))
  const inline = (FUENTE.match(/<div id="total-gastos"[^>]*>/) || [''])[0]
  chk('la grilla no trae el layout escrito en el style="" (vive en el CSS, donde se prueba)', inline !== '' && !/grid-template-columns/.test(inline), inline)
}

fin()
