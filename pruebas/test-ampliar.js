// "Ampliar" el panel de detalle (js/ampliar.js, 06/10/2026). Se EJECUTA el
// archivo real sobre un DOM falso:
//  - el botón NO aparece debajo del corte (el celular) ni sin un detalle
//    abierto, y no se abre aunque se lo toque;
//  - abrir arma la ventana: role="dialog", aria-modal, el título por
//    aria-labelledby, el foco en la X, el fondo oscuro aparte;
//  - el resumen, la grilla y las acciones son COPIAS de los nodos del panel
//    (los originales quedan donde estaban), sin id / name / for / data-*, con
//    los campos deshabilitados, y sin lo que en el panel está escondido;
//  - la grilla va de 2 o 3 por fila según su ancho, y nunca más columnas que
//    cosas;
//  - tocar una acción de la ventana CIERRA la ventana y toca el ORIGINAL (los
//    mismos handlers); un desplegable (aria-expanded o `quedarse`) la deja
//    abierta y la actualiza; lo de `tocables` se mira en el original;
//  - se cierra con la X, con Escape (sin que el Escape siga de largo) y
//    tocando el fondo; tocar adentro no la cierra; el foco vuelve a Ampliar;
//  - el foco queda atrapado (Tab al final vuelve al principio y al revés);
//  - si el panel cambia, la ventana se vuelve a copiar; si el detalle ya no
//    está o se pasa al ancho del celular, se cierra y el botón se esconde;
//  - el botón no se vuelve a poner `hidden` si no cambió (un bucle con el
//    observador: el botón vive adentro del panel observado);
//  - el título y los rótulos van escapados.
// Lo que hace en un navegador de verdad lo mira e2e/27-ampliar.spec.js.
//
//   ARCHIVO_TEST=<copia de js/ampliar.js>
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'ampliar.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

// ── Un DOM falso, lo justo para js/ampliar.js ────────────────────────────

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&times;': '×', '&nbsp;': ' ' }
const desentidad = (t) => t.replace(/&(?:amp|lt|gt|quot|#39|times|nbsp);/g, m => ENT[m])
const VACIOS = new Set(['input', 'img', 'br', 'hr'])

class Texto {
  constructor(t) { this.nodeType = 3; this._t = t; this.parentNode = null }
  get textContent() { return this._t }
  cloneNode() { return new Texto(this._t) }
}

let doc, win

class Elemento {
  constructor(tag, attrs = {}) {
    this.nodeType = 1
    this.tagName = tag.toUpperCase()
    this.attrs = { ...attrs }
    this.nodos = []
    this.parentNode = null
    this.oyentes = {}
    this.style = {}
    this.scrollTop = 0
    this.sets = { hidden: 0 }
  }
  get ownerDocument() { return doc }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null }
  setAttribute(k, v) { this.attrs[k] = String(v) }
  removeAttribute(k) { delete this.attrs[k] }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) }
  getAttributeNames() { return Object.keys(this.attrs) }
  get id() { return this.getAttribute('id') || '' }
  get hidden() { return this.hasAttribute('hidden') }
  set hidden(v) { this.sets.hidden++; if (v) this.attrs.hidden = ''; else delete this.attrs.hidden }
  get disabled() { return this.hasAttribute('disabled') }
  set disabled(v) { if (v) this.attrs.disabled = ''; else delete this.attrs.disabled }
  get className() { return this.getAttribute('class') || '' }
  set className(v) { this.attrs.class = String(v) }
  get classList() {
    const yo = this
    const lista = () => yo.className.split(/\s+/).filter(Boolean)
    return {
      contains: (c) => lista().includes(c),
      add: (c) => { if (!lista().includes(c)) yo.className = [...lista(), c].join(' ') },
      remove: (c) => { yo.className = lista().filter(x => x !== c).join(' ') },
      toggle: (c, si) => { const v = si === undefined ? !lista().includes(c) : !!si; v ? this.add(c) : this.remove(c); return v },
    }
  }
  get children() { return this.nodos.filter(n => n.nodeType === 1) }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null }
  get textContent() { return this.nodos.map(n => n.textContent).join('') }
  set textContent(t) { this.nodos.forEach(n => { n.parentNode = null }); this.nodos = []; if (t !== '' && t != null) this.agregar(new Texto(String(t))) }
  agregar(n) { if (n.parentNode) n.parentNode.nodos = n.parentNode.nodos.filter(x => x !== n); n.parentNode = this; this.nodos.push(n); return n }
  appendChild(n) { return this.agregar(n) }
  replaceChildren(...ns) { this.nodos.forEach(n => { n.parentNode = null }); this.nodos = []; for (const n of ns) this.agregar(n) }
  remove() { if (this.parentNode) { this.parentNode.nodos = this.parentNode.nodos.filter(x => x !== this); this.parentNode = null } }
  contains(o) { for (let x = o; x; x = x.parentNode) if (x === this) return true; return false }
  get isConnected() { for (let x = this; x; x = x.parentNode) if (x === doc.documentElement) return true; return false }
  cloneNode(profundo) {
    const c = new (this instanceof Campo ? Campo : Elemento)(this.tagName.toLowerCase(), this.attrs)
    if (profundo) for (const n of this.nodos) c.agregar(n.cloneNode(true))
    return c
  }
  matches(sel) { return sel.split(',').some(s => coincide(this, s.trim())) }
  todos() { const r = []; const ir = (e) => { for (const h of e.children) { r.push(h); ir(h) } }; ir(this); return r }
  querySelectorAll(sel) { return this.todos().filter(e => e.matches(sel)) }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
  addEventListener(t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f) }
  dispatchEvent(ev) {
    ev.target = ev.target || this
    ev.cortado = false
    ev.defaultPrevented = false
    ev.stopPropagation = () => { ev.cortado = true }
    ev.preventDefault = () => { ev.defaultPrevented = true }
    // El camino se arma ANTES, como en el navegador: un oyente que saca el
    // nodo del DOM no corta la propagación hacia arriba.
    const camino = []
    for (let x = this; x; x = x.parentNode) camino.push(x)
    for (const x of camino) { if (ev.cortado) break; for (const f of (x.oyentes?.[ev.type] || [])) f(ev) }
    return !ev.defaultPrevented
  }
  click() { this.dispatchEvent({ type: 'click' }) }
  focus() { doc.activeElement = this }
  getBoundingClientRect() { return { width: this.classList.contains('amp__grilla') ? win.anchoGrilla : 0 } }
  getClientRects() { for (let x = this; x; x = x.parentElement) if (x._sinCaja) return []; return [{}] }
  set innerHTML(html) {
    this.nodos.forEach(n => { n.parentNode = null })
    this.nodos = []
    const pila = [this]
    const re = /<(\/?)([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*>|([^<]+)/g
    let m
    while ((m = re.exec(html))) {
      const arriba = pila[pila.length - 1]
      if (m[4] !== undefined) { if (m[4].trim() || m[4] === ' ') arriba.agregar(new Texto(desentidad(m[4]))); continue }
      if (m[1]) { pila.pop(); continue }
      const attrs = {}
      for (const a of m[3].matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] === undefined ? '' : desentidad(a[2])
      const e = new (['input', 'textarea', 'select'].includes(m[2]) ? Campo : Elemento)(m[2], attrs)
      arriba.agregar(e)
      if (!VACIOS.has(m[2])) pila.push(e)
    }
  }
}
class Campo extends Elemento {}

function coincide(el, sel) {
  const m = sel.match(/^([a-z0-9]*)((?:#[\w-]+|\.[\w-]+|\[[\w-]+(?:="[^"]*")?\])*)$/)
  if (!m) throw new Error('selector no soportado por el DOM falso: ' + sel)
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false
  for (const p of m[2].match(/#[\w-]+|\.[\w-]+|\[[\w-]+(?:="[^"]*")?\]/g) || []) {
    if (p[0] === '#') { if (el.id !== p.slice(1)) return false; continue }
    if (p[0] === '.') { if (!el.classList.contains(p.slice(1))) return false; continue }
    const a = p.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)
    if (!el.hasAttribute(a[1])) return false
    if (a[2] !== undefined && el.getAttribute(a[1]) !== a[2]) return false
  }
  return true
}

const observadores = []
class ObservadorFalso {
  constructor(cb) { this.cb = cb; this.raices = []; observadores.push(this) }
  observe(raiz, opciones) { this.raices.push({ raiz, opciones }) }
  disconnect() {}
}
const consultas = []
function nuevoMundo(ancho = 1280) {
  observadores.length = 0
  consultas.length = 0
  const html = new Elemento('html')
  const body = new Elemento('body')
  html.agregar(body)
  doc = { documentElement: html, body, activeElement: null, oyentes: {}, createElement: (t) => new (['input', 'textarea', 'select'].includes(t) ? Campo : Elemento)(t) }
  html.parentNode = doc
  doc.dispatchEvent = () => {}
  win = {
    innerWidth: ancho, anchoGrilla: 1000, oyentes: {},
    addEventListener(t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f) },
    matchMedia(q) {
      const mq = { q, oyentes: [], get matches() { const n = q.match(/min-width:\s*(\d+)px/); return n ? win.innerWidth >= Number(n[1]) : false }, addEventListener(t, f) { this.oyentes.push(f) } }
      consultas.push(mq)
      return mq
    },
    MutationObserver: ObservadorFalso,
  }
  doc.defaultView = win
  return { doc, win, body }
}
function cambiarAncho(w) { win.innerWidth = w; for (const mq of consultas) for (const f of mq.oyentes) f({ matches: mq.matches }) }
const mutar = () => { for (const o of observadores) o.cb([]) }
const tic = () => new Promise(r => setTimeout(r, 0))

function cargar() {
  const codigo = src.replace(/^export /gm, '')
  const nombres = [...codigo.matchAll(/^(?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
  return new Function('document', 'window', codigo + `\nreturn { ${nombres.join(', ')} }`)(undefined, undefined)
}
const A = cargar()

// El panel de una pantalla: un resumen, tres cosas para la grilla (una
// escondida), una acción visible y una escondida, un desplegable.
function armarPanel() {
  const { body } = nuevoMundo()
  const panel = new Elemento('div', { id: 'panel' })
  body.agregar(panel)
  panel.innerHTML =
    '<div class="barra"><button type="button" id="btn-amp" hidden>Ampliar</button></div>' +
    '<section id="resumen" data-x="1"><h3>Cliente</h3><p class="obs">Observaciones largas que en el panel van cortadas</p>' +
    '<label for="motivo">Motivo</label><input id="motivo" name="motivo" value="hola" data-campo="m">' +
    '<input type="radio" name="tipo" checked></section>' +
    '<div class="item" id="i1" data-item="1"><span>Cheque 1</span><button type="button" data-ver="1">Ver la foto</button></div>' +
    '<div class="item" id="i2"><span>Cheque 2</span><button type="button" aria-expanded="false" data-plegar="2">Titulares</button><div data-titulares="2" hidden>Ana</div></div>' +
    '<div class="item" id="i3" hidden><span>Escondido</span></div>' +
    '<div class="item" id="i4"><img data-foto="4" src="x.jpg" alt="foto"><span class="mas" data-mas="4">Más</span></div>' +
    '<div class="acciones"><button type="button" id="acc-editar">Editar</button><button type="button" id="acc-anular" hidden>Anular</button>' +
    '<a id="acc-link" href="otra.html">Asentar</a></div>'
  return { body, panel, q: (s) => panel.querySelector(s) }
}

function crear(extra = {}) {
  const P = armarPanel()
  const estado = { hay: true, titulo: 'Cobranza de Anatolia' }
  const ctl = A.crearAmpliar({
    boton: P.q('#btn-amp'),
    observar: P.panel,
    corte: '(min-width: 1100px)',
    disponible: () => estado.hay,
    titulo: () => estado.titulo,
    tituloResumen: 'La cobranza',
    tituloGrilla: 'Cheques',
    resumen: () => [P.q('#resumen')],
    grilla: () => P.panel.querySelectorAll('.item'),
    acciones: () => [P.q('#acc-editar'), P.q('#acc-anular'), P.q('#acc-link')],
    quedarse: '[data-plegar]',
    tocables: 'img[data-foto], [data-mas]',
    ...extra,
  })
  const fondo = () => P.body.children.find(e => e.classList.contains('amp-fondo')) || null
  const en = (sel) => fondo()?.querySelector(sel) || null
  const todosEn = (sel) => fondo()?.querySelectorAll(sel) || []
  return { ...P, estado, ctl, fondo, en, todosEn, boton: P.q('#btn-amp') }
}

// ── Lo puro ──────────────────────────────────────────────────────────────

chk('escAmp escapa < > & " \'', A.escAmp(`<a href="x">'&'</a>`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
chk('escAmp de null es vacío', A.escAmp(null) === '')
chk('2 columnas con un ancho chico', A.columnasGrilla(800, 5) === 2)
chk('3 columnas desde ANCHO_TRES_COLUMNAS', A.columnasGrilla(A.ANCHO_TRES_COLUMNAS, 5) === 3 && A.columnasGrilla(1400, 9) === 3)
chk('nunca más de 3', A.columnasGrilla(5000, 20) === 3)
chk('una sola cosa va a todo el ancho', A.columnasGrilla(1400, 1) === 1 && A.columnasGrilla(600, 1) === 1)
chk('dos cosas con ancho grande: 2', A.columnasGrilla(1400, 2) === 2)
chk('sin cosas: 1 (no 0)', A.columnasGrilla(1400, 0) === 1)
chk('ancho que no es número: 2', A.columnasGrilla(null, 4) === 2)
chk('el corte es el de la compu (1100 px)', A.CORTE_AMPLIAR === '(min-width: 1100px)')

// ── Debajo del corte: no se dibuja ───────────────────────────────────────
{
  const P = armarPanel()
  cambiarAncho(390)
  const ctl = A.crearAmpliar({ boton: P.q('#btn-amp'), observar: P.panel, disponible: () => true, resumen: () => [P.q('#resumen')] })
  chk('a 390 px el botón queda escondido', P.q('#btn-amp').hidden === true)
  P.q('#btn-amp').click()
  chk('a 390 px tocarlo igual no abre nada', !P.body.children.some(e => e.classList.contains('amp-fondo')))
  chk('a 390 px abrir() devuelve false', ctl.abrir() === false && !ctl.abierta())
  cambiarAncho(1099)
  chk('a 1099 px tampoco', P.q('#btn-amp').hidden === true)
  cambiarAncho(1100)
  chk('a 1100 px aparece', P.q('#btn-amp').hidden === false)
  cambiarAncho(800)
  chk('volver a achicar lo esconde', P.q('#btn-amp').hidden === true)
}
{
  const T = crear()
  T.estado.hay = false
  T.ctl.pintarBoton()
  chk('sin detalle abierto el botón queda escondido', T.boton.hidden === true)
  chk('sin detalle abrir() no abre', T.ctl.abrir() === false && !T.fondo())
  T.estado.hay = true
  T.ctl.pintarBoton()
  chk('con detalle aparece', T.boton.hidden === false)
  chk('el botón dice que abre un diálogo', T.boton.getAttribute('aria-haspopup') === 'dialog')
  const antes = T.boton.sets.hidden
  T.ctl.pintarBoton(); T.ctl.pintarBoton()
  chk('pintar sin cambios no vuelve a poner hidden (bucle con el observador)', T.boton.sets.hidden === antes, `${antes} → ${T.boton.sets.hidden}`)
}

// ── Abrir ────────────────────────────────────────────────────────────────
{
  const T = crear()
  T.boton.click()
  const dlg = T.en('[role="dialog"]')
  chk('tocar Ampliar abre la ventana', !!T.fondo() && T.ctl.abierta())
  chk('la ventana es un diálogo modal', !!dlg && dlg.getAttribute('aria-modal') === 'true')
  const tit = T.en('.amp__titulo')
  chk('con título por aria-labelledby', !!tit && dlg.getAttribute('aria-labelledby') === tit.id && tit.id.startsWith('amp-titulo-'))
  chk('el título dice el detalle', tit?.textContent === 'Cobranza de Anatolia')
  chk('el fondo oscuro es aparte de la ventana', T.fondo() !== dlg && T.fondo().contains(dlg))
  chk('la página no scrollea atrás', doc.documentElement.classList.contains('amp-abierta'))
  chk('el foco va a la X', doc.activeElement === T.en('.amp__cerrar'))
  chk('la X dice Cerrar', T.en('.amp__cerrar')?.getAttribute('aria-label') === 'Cerrar')
  chk('rótulos de las dos partes', T.en('.amp__resumen')?.getAttribute('aria-label') === 'La cobranza' && T.en('.amp__lado')?.getAttribute('aria-label') === 'Cheques')

  // El resumen: una copia.
  const res = T.en('.amp__resumen-cuerpo')
  const copia = res?.children[0]
  chk('el resumen es una copia del original', !!copia && copia !== T.q('#resumen') && copia.textContent.includes('Observaciones largas'))
  chk('el original sigue en el panel', T.q('#resumen')?.parentNode === T.panel)
  chk('la copia no tiene id', !copia?.hasAttribute('id') && !copia?.querySelector('[id]'))
  chk('la copia no tiene data-*', !copia?.getAttributeNames().some(n => n.startsWith('data-')) && !copia?.todos().some(e => e.getAttributeNames().some(n => n.startsWith('data-'))))
  chk('la copia no tiene name ni for', !copia?.todos().some(e => e.hasAttribute('name') || e.hasAttribute('for')))
  chk('los campos copiados quedan deshabilitados', copia?.todos().filter(e => e.tagName === 'INPUT').every(e => e.disabled) && copia.todos().some(e => e.tagName === 'INPUT'))
  chk('el original no se toca (sigue con id, name y data-*)', T.q('#motivo')?.getAttribute('name') === 'motivo' && !T.q('#motivo').disabled && T.q('#resumen').hasAttribute('data-x'))

  // La grilla: lo visible, en celdas, 3 por fila con 1000 px.
  const celdas = T.todosEn('.amp__celda')
  chk('la grilla tiene lo que se ve (3 de 4: el escondido no)', celdas.length === 3, String(celdas.length))
  chk('el escondido no está', !celdas.some(c => c.textContent.includes('Escondido')))
  const g = T.en('.amp__grilla')
  chk('con 1000 px de ancho, 3 por fila', g?.getAttribute('data-columnas') === '3' && g.style.gridTemplateColumns === 'repeat(3, minmax(0, 1fr))', g?.style.gridTemplateColumns)
  chk('las celdas llevan marco', celdas.every(c => !c.classList.contains('amp__celda--sin-marco')))

  // Las acciones: copias de las visibles.
  const acc = T.en('.amp__acciones')
  chk('las acciones visibles van abajo (Editar y el link; Anular escondido no)', acc?.children.length === 2 && acc.textContent.includes('Editar') && acc.textContent.includes('Asentar') && !acc.textContent.includes('Anular'))
  chk('el pie se ve', acc?.hidden === false)
  chk('un link copiado conserva su href', acc?.children[1]?.getAttribute('href') === 'otra.html')
}

// Ancho de la grilla: 2 por fila con 700 px; una sola cosa a todo el ancho.
{
  const T = crear()
  win.anchoGrilla = 700
  T.ctl.abrir()
  chk('con 700 px de ancho, 2 por fila', T.en('.amp__grilla')?.getAttribute('data-columnas') === '2')
  T.ctl.cerrar()
  const U = crear({ grilla: () => [] , marcoCelda: false })
  win.anchoGrilla = 1000
  U.ctl.abrir()
  chk('sin cosas para la grilla lo dice con palabras', U.en('.amp__vacio')?.textContent === 'No hay nada para mostrar en esta parte.')
  U.ctl.cerrar()
  const V = crear({ marcoCelda: false })
  V.ctl.abrir()
  chk('marcoCelda: false deja las celdas sin marco', V.todosEn('.amp__celda').every(c => c.classList.contains('amp__celda--sin-marco')))
  const W = crear({ acciones: () => [] })
  W.ctl.abrir()
  chk('sin acciones el pie no se dibuja', W.en('.amp__acciones')?.hidden === true)
}

// ── Tocar una acción: cierra y toca el original ──────────────────────────
{
  const T = crear()
  let veces = 0, abiertaAlTocar = null
  T.q('#acc-editar').addEventListener('click', () => { veces++; abiertaAlTocar = !!T.fondo() })
  T.ctl.abrir()
  const copia = T.en('.amp__acciones').children[0]
  copia.click()
  chk('tocar la acción copiada toca el original una vez', veces === 1, String(veces))
  chk('la ventana se cierra ANTES de tocar el original', abiertaAlTocar === false)
  chk('la ventana quedó cerrada', !T.fondo() && !T.ctl.abierta() && !doc.documentElement.classList.contains('amp-abierta'))
  chk('el foco vuelve a Ampliar', doc.activeElement === T.boton)
}
{
  // Un botón adentro de una cosa de la grilla (Ver la foto): igual.
  const T = crear()
  let veces = 0
  T.panel.addEventListener('click', (e) => { if (e.target.getAttribute?.('data-ver') === '1') veces++ })
  T.ctl.abrir()
  const ver = T.todosEn('button').find(b => b.textContent === 'Ver la foto')
  ver.click()
  chk('un botón de la grilla llega por delegación al panel', veces === 1)
  chk('y cierra la ventana', !T.fondo())
}
{
  // Un desplegable: queda abierta y se actualiza.
  const T = crear()
  T.q('[data-plegar="2"]').addEventListener('click', () => { const c = T.q('[data-titulares="2"]'); c.hidden = !c.hidden })
  T.ctl.abrir()
  const titularesEn = () => T.fondo().todos().find(e => e.textContent === 'Ana')
  chk('antes de desplegar, los titulares están escondidos en la ventana', titularesEn()?.hidden === true)
  T.todosEn('button').find(b => b.textContent === 'Titulares').click()
  chk('desplegar deja la ventana abierta', !!T.fondo())
  chk('y la vuelve a copiar (se ven los titulares)', titularesEn()?.hidden === false)
  chk('el original se desplegó', T.q('[data-titulares="2"]').hidden === false)
}
{
  // `tocables`: la imagen se mira en el ORIGINAL (la copia no tiene data-*).
  const T = crear()
  let foto = 0, mas = 0
  T.q('[data-foto="4"]').addEventListener('click', () => { foto++ })
  T.q('[data-mas="4"]').addEventListener('click', () => { mas++ })
  T.ctl.abrir()
  T.todosEn('img')[0].click()
  chk('tocar la imagen copiada toca la original', foto === 1)
  T.ctl.abrir()
  T.todosEn('.mas')[0].click()
  chk('un span de `tocables` también', mas === 1)
  T.ctl.abrir()
  let tocado = false
  T.panel.addEventListener('click', () => { tocado = true })
  T.en('.amp__resumen-cuerpo').querySelector('h3').click()
  chk('tocar algo que no es tocable no hace nada (sigue abierta)', !!T.fondo() && !tocado)
}
{
  // El original ya no está (el panel se redibujó): no toca nada, refresca.
  const T = crear()
  let veces = 0
  T.q('#acc-editar').addEventListener('click', () => { veces++ })
  T.ctl.abrir()
  const copia = T.en('.amp__acciones').children[0]
  T.q('#acc-editar').remove()
  copia.click()
  chk('una copia de un original que ya no está no toca nada', veces === 0)
}

// ── Cerrar: X, Escape, afuera ────────────────────────────────────────────
{
  const T = crear()
  T.ctl.abrir()
  T.en('.amp__cerrar').click()
  chk('la X cierra', !T.fondo())
  chk('y el foco vuelve a Ampliar', doc.activeElement === T.boton)

  T.ctl.abrir()
  let llegoAfuera = false
  T.body.addEventListener('keydown', () => { llegoAfuera = true })
  const ev = { type: 'keydown', key: 'Escape' }
  T.en('.amp__acciones').children[0].dispatchEvent(ev)
  chk('Escape cierra', !T.fondo())
  chk('Escape no sigue de largo a la página', llegoAfuera === false && ev.defaultPrevented === true)
  chk('Escape devuelve el foco', doc.activeElement === T.boton)

  T.ctl.abrir()
  T.en('[role="dialog"]').dispatchEvent({ type: 'click' })
  chk('tocar adentro de la ventana no la cierra', !!T.fondo())
  T.fondo().dispatchEvent({ type: 'click' })
  chk('tocar afuera (el fondo) la cierra', !T.fondo())
}

// ── El foco atrapado ─────────────────────────────────────────────────────
{
  const T = crear()
  T.ctl.abrir()
  const x = T.en('.amp__cerrar')
  const ultimo = T.en('.amp__acciones').children[1]
  ultimo.focus()
  const tab = { type: 'keydown', key: 'Tab' }
  ultimo.dispatchEvent(tab)
  chk('Tab en el último vuelve al primero (la X)', doc.activeElement === x && tab.defaultPrevented)
  const atras = { type: 'keydown', key: 'Tab', shiftKey: true }
  x.dispatchEvent(atras)
  chk('Shift+Tab en el primero va al último', doc.activeElement === ultimo && atras.defaultPrevented)
  const medio = T.todosEn('button').find(b => b.textContent === 'Ver la foto')
  medio.focus()
  const tab2 = { type: 'keydown', key: 'Tab' }
  medio.dispatchEvent(tab2)
  chk('Tab en el medio deja hacer al navegador', !tab2.defaultPrevented && doc.activeElement === medio)
  doc.activeElement = T.boton
  const tab3 = { type: 'keydown', key: 'Tab' }
  T.en('[role="dialog"]').dispatchEvent(tab3)
  chk('con el foco afuera, Tab lo trae adentro', doc.activeElement === x)
  chk('los campos deshabilitados no reciben el foco', !T.todosEn('input').includes(doc.activeElement))
}
{
  // Solo la X y un campo (deshabilitado): Tab en la X vuelve a la X.
  const P = armarPanel()
  const ctl = A.crearAmpliar({ boton: P.q('#btn-amp'), observar: P.panel, disponible: () => true, resumen: () => [P.q('#motivo')] })
  ctl.abrir()
  const fondo = P.body.children.find(e => e.classList.contains('amp-fondo'))
  const x = fondo.querySelector('.amp__cerrar')
  const tab = { type: 'keydown', key: 'Tab' }
  x.dispatchEvent(tab)
  chk('con un campo deshabilitado como único otro, Tab en la X se queda en la X', tab.defaultPrevented === true && doc.activeElement === x)
  ctl.cerrar()
}
{
  // refrescar() solo (lo que llama un desplegable): sin detalle, cierra.
  const T = crear()
  T.ctl.abrir()
  T.estado.hay = false
  T.ctl.refrescar()
  chk('refrescar sin detalle cierra la ventana', !T.fondo())
}

// ── Escapado ─────────────────────────────────────────────────────────────
{
  const T = crear({ tituloResumen: '<b>r</b>', tituloGrilla: '"><img src=x>' })
  T.estado.titulo = '<img src=x onerror=alert(1)>'
  T.ctl.abrir()
  chk('el título va como texto (sin <img>)', T.en('.amp__titulo')?.textContent === '<img src=x onerror=alert(1)>' && !T.todosEn('img').some(i => i.getAttribute('src') === 'x'))
  chk('los rótulos van escapados', !T.fondo().todos().some(e => e.tagName === 'B') && T.en('.amp__resumen')?.querySelector('.amp__sub')?.textContent === '<b>r</b>')
  chk('un rótulo no rompe su atributo', T.en('.amp__lado')?.getAttribute('aria-label') === '"><img src=x>')
}

// ── Sin botón no se arma ─────────────────────────────────────────────────
{
  nuevoMundo()
  let mensaje = ''
  try { A.crearAmpliar({}) } catch (e) { mensaje = e.message }
  chk('sin el botón Ampliar, crearAmpliar lo dice', mensaje.includes('falta el botón Ampliar'), mensaje)
}

// Va al FINAL: las ramas async siguen después de un await, y un bloque
// sincrónico de más abajo armaría otro DOM falso en el medio.
// ── Seguir al panel ──────────────────────────────────────────────────────
esperas.push((async () => {
  const T = crear()
  chk('se observa el panel con subtree y atributos', observadores.some(o => o.raices.some(r => r.raiz === T.panel && r.opciones.subtree && r.opciones.attributes && r.opciones.childList)))
  T.ctl.abrir()
  T.q('#resumen').innerHTML = '<p>Otra cobranza</p>'
  T.estado.titulo = 'Cobranza de Pepe'
  mutar()
  await tic()
  chk('si el panel cambia, la ventana se vuelve a copiar', T.en('.amp__resumen-cuerpo')?.textContent === 'Otra cobranza')
  chk('y el título también', T.en('.amp__titulo')?.textContent === 'Cobranza de Pepe')
  chk('sigue abierta', !!T.fondo())
  // El foco en una acción copiada vuelve a la copia nueva del mismo original.
  T.en('.amp__acciones').children[1].focus()
  mutar()
  await tic()
  chk('al refrescar, el foco vuelve a la copia del mismo original', doc.activeElement === T.en('.amp__acciones').children[1])
  T.estado.hay = false
  mutar()
  await tic()
  chk('si el detalle ya no está, la ventana se cierra', !T.fondo())
  chk('y el botón se esconde', T.boton.hidden === true)
  T.estado.hay = true
  mutar()
  await tic()
  chk('vuelve el detalle: vuelve el botón (sin abrirse solo)', T.boton.hidden === false && !T.fondo())
  T.ctl.abrir()
  cambiarAncho(900)
  chk('pasar al ancho del celular cierra la ventana', !T.fondo())
  chk('y esconde el botón', T.boton.hidden === true)
  cambiarAncho(1280)
})())

fin()
