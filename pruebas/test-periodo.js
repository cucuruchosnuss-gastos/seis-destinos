// El control de período (js/periodo.js, 04/10/2026). Se EJECUTA el archivo real:
//  - los atajos (Hoy, Esta semana —del lunes—, Este mes, Mes pasado, Todo) dan
//    el rango correcto, también en los bordes (domingo, 1º de mes, enero);
//  - el botón dice lo elegido ("Este mes", "Del 01/10 al 05/10/2026", "Todo");
//  - un rango a mano se valida, y con `obligatorias` pide las dos fechas;
//  - un panel flotante se ubica ADENTRO de la pantalla (abajo, arriba o
//    achicado), que es lo que estaba roto en los menús de Gastos y Caja;
//  - con un DOM falso: el control envuelve los campos de la pantalla sin
//    reemplazarlos, les pone el valor y les dispara 'change' SOLO a los que
//    cambiaron, se entera cuando la pantalla les pone un valor desde código,
//    Escape cierra y devuelve el foco, y con `obligatorias` no ofrece "Todo";
//  - todo lo que entra al HTML va escapado.
// Lo que hace en un navegador de verdad (tocar, el calendario del sistema,
// que no se pise con nada) lo mide e2e/filtros-dispositivos.spec.js.
//
//   ARCHIVO_TEST=<copia de js/periodo.js>
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'periodo.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, fin } = arnes()

// ── Un DOM falso, lo justo para crearPeriodo ─────────────────────────────

class Elemento {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag.toUpperCase()
    this.attrs = { ...attrs }
    this.hidden = 'hidden' in attrs
    this.style = {}
    this.oyentes = {}
    this.hijos = []
    this.parentNode = null
    this.textContent = ''
    this._clases = new Set(String(attrs.class || '').split(/\s+/).filter(Boolean))
    this.classList = {
      add: (c) => this._clases.add(c),
      remove: (c) => this._clases.delete(c),
      contains: (c) => this._clases.has(c),
      toggle: (c, si) => { const v = si === undefined ? !this._clases.has(c) : !!si; v ? this._clases.add(c) : this._clases.delete(c); return v },
    }
    this.isConnected = true
    this.offsetWidth = 300
    this.offsetHeight = 200
    this.disabled = false
    this.offsetParent = {}
  }
  get id() { return this.attrs.id || '' }
  get dataset() {
    const d = {}
    for (const [k, v] of Object.entries(this.attrs)) if (k.startsWith('data-')) d[k.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase())] = v
    return d
  }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null }
  setAttribute(k, v) { this.attrs[k] = String(v) }
  addEventListener(t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f) }
  dispatchEvent(e) { e.target = e.target || this; for (const f of this.oyentes[e.type] || []) f(e); return true }
  click() { this.dispatchEvent({ type: 'click' }) }
  focus() { documento.activeElement = this }
  contains(o) { for (let x = o; x; x = x.parentNode) if (x === this) return true; return false }
  matches(sel) { return sel === '[data-periodo-barra]' && 'data-periodo-barra' in this.attrs }
  closest(sel) { for (let x = this; x; x = x.parentNode) if (sel === 'label' ? x.tagName === 'LABEL' : false) return x; return null }
  get parentElement() { return this.parentNode }
  appendChild(h) { h.parentNode = this; this.hijos.push(h); return h }
  insertBefore(n, ref) { n.parentNode = this; const i = this.hijos.indexOf(ref); this.hijos.splice(i < 0 ? this.hijos.length : i, 0, n); return n }
  getBoundingClientRect() { return this._rect || { left: 10, right: 110, top: 100, bottom: 140, width: 100, height: 40 } }
  // Todos los descendientes (incluidos los que armó innerHTML).
  todos() { const r = []; const ir = (e) => { for (const h of e.hijos) { r.push(h); ir(h) } }; ir(this); return r }
  querySelectorAll(sel) {
    const lista = this.todos()
    if (sel === 'input, select, button, textarea') return lista.filter(e => ['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(e.tagName))
    if (sel === 'button, input') return lista.filter(e => ['INPUT', 'BUTTON'].includes(e.tagName))
    const m = sel.match(/^\[([a-z-]+)(?:="([^"]*)")?\]$/)
    if (m) return lista.filter(e => m[1] in e.attrs && (m[2] === undefined || e.attrs[m[1]] === m[2]))
    if (sel.startsWith('.')) return lista.filter(e => e._clases.has(sel.slice(1)))
    throw new Error('selector no soportado por el DOM falso: ' + sel)
  }
  querySelector(sel) {
    if (sel === '[aria-pressed="true"]') return this.todos().find(e => e.attrs['aria-pressed'] === 'true') || null
    return this.querySelectorAll(sel)[0] || null
  }
  // innerHTML: arma los elementos de las etiquetas de apertura, anidados.
  set innerHTML(html) {
    this._html = html
    this.hijos = []
    const pila = [this]
    const re = /<(\/?)([a-z]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*>|([^<]+)/g
    let m
    while ((m = re.exec(html))) {
      if (m[4] !== undefined) { pila[pila.length - 1].textContent += m[4]; continue }
      if (m[1]) { pila.pop(); continue }
      const attrs = {}
      for (const a of m[3].matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] === undefined ? '' : a[2].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      const e = new (m[2] === 'input' ? Campo : Elemento)(m[2], attrs)
      pila[pila.length - 1].appendChild(e)
      if (m[2] !== 'input') pila.push(e)
    }
  }
  get innerHTML() { return this._html || '' }
}

// Un <input>: su `value` vive en el PROTOTIPO, como en el navegador (así
// vigilarValor lo puede envolver).
class Campo extends Elemento {
  constructor(tag = 'input', attrs = {}) { super(tag, attrs); this._valor = attrs.value || '' }
}
Object.defineProperty(Campo.prototype, 'value', {
  configurable: true,
  get() { return this._valor },
  set(v) { this._valor = String(v) },
})

const documento = { activeElement: null, oyentes: {}, addEventListener(t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f) }, createElement: (t) => new Elemento(t) }
let anchoVentana = 1280
const ventana = { get innerWidth() { return anchoVentana }, innerHeight: 800, visualViewport: null }

function cargar() {
  const codigo = src.replace(/^export /gm, '')
  const nombres = [...codigo.matchAll(/^(?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
  return new Function('document', 'window', 'HTMLInputElement', 'Event',
    codigo + `\nreturn { ${nombres.join(', ')} }`)(documento, ventana, Campo, function Event(t, o) { this.type = t; this.bubbles = !!(o && o.bubbles) })
}
const P = cargar()

// ── Los atajos ───────────────────────────────────────────────────────────

const r = P.rangoDePeriodo
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
chk('Hoy', igual(r('hoy', '2026-10-04'), { desde: '2026-10-04', hasta: '2026-10-04' }))
// 04/10/2026 es domingo: la semana arranca el lunes 28/09.
chk('Esta semana un domingo empieza el lunes anterior', igual(r('semana', '2026-10-04'), { desde: '2026-09-28', hasta: '2026-10-04' }), JSON.stringify(r('semana', '2026-10-04')))
chk('Esta semana un lunes es solo ese día', igual(r('semana', '2026-09-28'), { desde: '2026-09-28', hasta: '2026-09-28' }))
chk('Esta semana un miércoles', igual(r('semana', '2026-09-30'), { desde: '2026-09-28', hasta: '2026-09-30' }))
chk('Esta semana cruza de año', igual(r('semana', '2027-01-01'), { desde: '2026-12-28', hasta: '2027-01-01' }), JSON.stringify(r('semana', '2027-01-01')))
chk('Este mes del 1º a hoy', igual(r('mes', '2026-10-04'), { desde: '2026-10-01', hasta: '2026-10-04' }))
chk('Mes pasado entero', igual(r('mes_pasado', '2026-10-04'), { desde: '2026-09-01', hasta: '2026-09-30' }))
chk('Mes pasado en enero es diciembre del año anterior', igual(r('mes_pasado', '2027-01-15'), { desde: '2026-12-01', hasta: '2026-12-31' }))
chk('Mes pasado en marzo termina el 28 de febrero', igual(r('mes_pasado', '2027-03-10'), { desde: '2027-02-01', hasta: '2027-02-28' }))
chk('Mes pasado en bisiesto termina el 29', igual(r('mes_pasado', '2028-03-10'), { desde: '2028-02-01', hasta: '2028-02-29' }))
chk('Todo va sin fechas', igual(r('todo', '2026-10-04'), { desde: '', hasta: '' }))
chk('un atajo desconocido no inventa', r('otro', '2026-10-04') === null)
chk('un hoy inválido no inventa', r('hoy', '04/10/2026') === null)
chk('cinco atajos, en orden', P.ATAJOS_PERIODO.map(a => a.clave).join() === 'hoy,semana,mes,mes_pasado,todo')

// Hoy en Argentina: a las 23:30 de Buenos Aires ya es el día siguiente en UTC.
chk('hoy es el de Argentina, no el de UTC', P.hoyIsoAr(new Date('2026-10-05T02:30:00Z')) === '2026-10-04', P.hoyIsoAr(new Date('2026-10-05T02:30:00Z')))
chk('hoy a la mañana', P.hoyIsoAr(new Date('2026-10-04T12:00:00Z')) === '2026-10-04')

// ── Qué atajo es un rango, y qué dice el botón ───────────────────────────

const c = P.claveDeRango
chk('reconoce Hoy', c('2026-10-04', '2026-10-04', '2026-10-04') === 'hoy')
chk('reconoce Esta semana', c('2026-09-28', '2026-10-04', '2026-10-04') === 'semana')
chk('reconoce Este mes', c('2026-10-01', '2026-10-04', '2026-10-04') === 'mes')
chk('reconoce Mes pasado', c('2026-09-01', '2026-09-30', '2026-10-04') === 'mes_pasado')
chk('reconoce Todo (vacíos y null)', c('', '', '2026-10-04') === 'todo' && c(null, undefined, '2026-10-04') === 'todo')
chk('un rango cualquiera es "fechas"', c('2026-09-02', '2026-09-20', '2026-10-04') === 'fechas')
// Un lunes "Hoy" y "Esta semana" son el mismo rango: gana Hoy, el primero.
chk('un lunes, Hoy le gana a Esta semana', c('2026-09-28', '2026-09-28', '2026-09-28') === 'hoy')

const t = P.textoDePeriodo
chk('texto de un atajo', t('2026-10-01', '2026-10-04', '2026-10-04') === 'Este mes')
chk('texto de Todo', t('', '', '2026-10-04') === 'Todo')
chk('rango en el mismo año', t('2026-09-02', '2026-09-20', '2026-10-04') === 'Del 02/09 al 20/09/2026', t('2026-09-02', '2026-09-20', '2026-10-04'))
chk('rango entre dos años', t('2025-12-20', '2026-01-05', '2026-10-04') === 'Del 20/12/2025 al 05/01/2026')
chk('un solo día a mano', t('2026-09-02', '2026-09-02', '2026-10-04') === '02/09/2026')
chk('solo desde', t('2026-09-02', '', '2026-10-04') === 'Desde el 02/09/2026')
chk('solo hasta', t('', '2026-09-20', '2026-10-04') === 'Hasta el 20/09/2026')

const e = P.errorDeRango
chk('un rango bien no tiene error', e('2026-09-01', '2026-09-30') === '')
chk('desde después de hasta', e('2026-09-30', '2026-09-01') !== '')
chk('el mismo día está bien', e('2026-09-01', '2026-09-01') === '')
chk('una fecha rota', e('2026-13', '') !== '' && e('', '30/09/2026') !== '')
chk('sin fechas está bien (es "Todo")', e('', '') === '')
chk('con obligatorias, faltar una es error', e('2026-09-01', '', { obligatorias: true }) !== '' && e('', '2026-09-01', { obligatorias: true }) !== '')
chk('con obligatorias, las dos están bien', e('2026-09-01', '2026-09-02', { obligatorias: true }) === '')

chk('escPer escapa', P.escPer(`<a href="x">'&`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;')
chk('escPer de null', P.escPer(null) === '')

// ── ubicarPanel: siempre adentro de la pantalla ─────────────────────────

function ubicar({ ancho = 360, alto = 780, boton, panel = { w: 300, h: 400 } }) {
  anchoVentana = ancho
  ventana.innerHeight = alto
  const p = new Elemento('div')
  p.offsetWidth = panel.w; p.offsetHeight = panel.h
  const a = new Elemento('button')
  a._rect = { left: boton.left, right: boton.left + 100, top: boton.top, bottom: boton.top + 40, width: 100, height: 40 }
  P.ubicarPanel(p, a)
  return { left: parseFloat(p.style.left), top: parseFloat(p.style.top), maxH: p.style.maxHeight ? parseFloat(p.style.maxHeight) : null, maxW: parseFloat(p.style.maxWidth) }
}
let u = ubicar({ boton: { left: 10, top: 100 } })
chk('con lugar abajo, se abre abajo del botón', u.top === 144 && u.left === 10 && u.maxH === null, JSON.stringify(u))
u = ubicar({ boton: { left: 10, top: 700 } })
chk('sin lugar abajo, se abre arriba', u.top + 400 <= 700 && u.top >= 8 && u.maxH === null, JSON.stringify(u))
u = ubicar({ boton: { left: 300, top: 100 } })
chk('no se sale por la derecha', u.left + 300 <= 360 - 8 + 0.5, JSON.stringify(u))
u = ubicar({ ancho: 1280, alto: 900, boton: { left: 1200, top: 100 } })
chk('en la compu tampoco se sale por la derecha (Categoría de Gastos)', u.left + 300 <= 1280 - 8 + 0.5, JSON.stringify(u))
u = ubicar({ boton: { left: 10, top: 300 }, alto: 600, panel: { w: 300, h: 1000 } })
chk('si no entra en ningún lado, se achica y scrollea', u.maxH !== null && u.top >= 8 && u.top + u.maxH <= 600 - 8 + 0.5, JSON.stringify(u))
u = ubicar({ boton: { left: 10, top: 100 }, alto: 600, panel: { w: 300, h: 1000 } })
chk('abajo hay más lugar pero no entra: se achica abajo', u.top === 144 && u.maxH !== null && u.top + u.maxH <= 600 - 8 + 0.5, JSON.stringify(u))
u = ubicar({ ancho: 280, boton: { left: 10, top: 100 }, panel: { w: 300, h: 100 } })
chk('más ancho que la pantalla: se le pone tope de ancho', u.maxW === 280 - 16 && u.left >= 8, JSON.stringify(u))
chk('sin panel o sin ancla no rompe', (() => { try { P.ubicarPanel(null, null); return true } catch { return false } })())

// ── envoltorioDe ─────────────────────────────────────────────────────────

{
  const label = new Elemento('label'); const i = new Campo('input', { type: 'date' }); label.appendChild(i)
  chk('el envoltorio es el label con un solo campo', P.envoltorioDe(i) === label)
  const caja = new Elemento('div'); const i2 = new Campo('input'); caja.appendChild(new Elemento('span')); caja.appendChild(i2)
  chk('o el padre con un solo campo', P.envoltorioDe(i2) === caja)
  const barra = new Elemento('div'); const a = new Campo('input'); const b = new Campo('input'); barra.appendChild(a); barra.appendChild(b)
  chk('si el padre tiene otros campos, solo el campo', P.envoltorioDe(a) === a)
}

// ── crearPeriodo, ejecutado sobre el DOM falso ──────────────────────────

function montar({ desde = '', hasta = '', hoy = '2026-10-04', ancho = 1280, ...opc } = {}) {
  anchoVentana = ancho
  ventana.innerHeight = 800
  const barra = new Elemento('div', { class: 'barra' })
  const lD = new Elemento('label'); const d = new Campo('input', { type: 'date', id: 'f-desde' }); lD.appendChild(d)
  const lH = new Elemento('label'); const h = new Campo('input', { type: 'date', id: 'f-hasta' }); lH.appendChild(h)
  barra.appendChild(lD); barra.appendChild(lH)
  d.value = desde; h.value = hasta
  const cambios = []
  d.addEventListener('change', () => cambios.push('desde:' + d.value))
  h.addEventListener('change', () => cambios.push('hasta:' + h.value))
  const ctl = P.crearPeriodo({ desde: d, hasta: h, hoy: () => hoy, ...opc })
  return { ctl, d, h, lD, lH, barra, cambios, valor: () => ctl.caja.querySelector('[data-periodo-valor]').textContent }
}

{
  const m = montar()
  chk('envuelve: los campos siguen en la página', m.barra.contains(m.d) && m.barra.contains(m.h) && m.barra.hijos.includes(m.lD) && m.barra.hijos.includes(m.lH))
  chk('esconde los Desde/Hasta sueltos', m.lD.hidden && m.lH.hidden)
  chk('el control va antes del "Desde"', m.barra.hijos[0] === m.ctl.caja)
  chk('el botón lleva el id del Desde + "-periodo"', m.ctl.boton.id === 'f-desde-periodo')
  chk('el botón dice "Período: Todo"', m.ctl.boton.querySelector('.periodo__rotulo').textContent === 'Período:' && m.valor() === 'Todo', m.valor())
  chk('sin filtro el botón no se marca', !m.ctl.boton.classList.contains('periodo__boton--activo'))
  chk('arranca cerrado', m.ctl.panel.hidden && m.ctl.boton.getAttribute('aria-expanded') === 'false')

  m.ctl.boton.click()
  chk('tocar el botón abre el panel', !m.ctl.panel.hidden && m.ctl.boton.getAttribute('aria-expanded') === 'true')
  chk('el foco va al atajo marcado (Todo)', documento.activeElement && documento.activeElement.getAttribute('data-periodo-atajo') === 'todo')
  chk('en la compu no hay fondo oscuro', m.ctl.caja.querySelector('[data-periodo-fondo]').hidden)

  m.ctl.caja.querySelector('[data-periodo-atajo="mes"]').click()
  chk('un atajo cierra el panel', m.ctl.panel.hidden)
  chk('y le pone el rango a los campos de la pantalla', m.d.value === '2026-10-01' && m.h.value === '2026-10-04')
  chk('y les avisa con change, a los dos', m.cambios.join() === 'desde:2026-10-01,hasta:2026-10-04', m.cambios.join())
  chk('el botón dice "Este mes" y se marca', m.valor() === 'Este mes' && m.ctl.boton.classList.contains('periodo__boton--activo'), m.valor())
  chk('el atajo queda marcado (aria-pressed)', m.ctl.caja.querySelector('[data-periodo-atajo="mes"]').getAttribute('aria-pressed') === 'true')

  m.cambios.length = 0
  m.ctl.boton.click()
  m.ctl.caja.querySelector('[data-periodo-atajo="hoy"]').click()
  chk('solo avisa al campo que cambió', m.cambios.join() === 'desde:2026-10-04', m.cambios.join())

  m.cambios.length = 0
  m.ctl.boton.click()
  m.ctl.caja.querySelector('[data-periodo-atajo="hoy"]').click()
  chk('si nada cambió, no avisa', m.cambios.length === 0)

  // Elegir fechas a mano.
  m.ctl.boton.click()
  const fechas = m.ctl.caja.querySelector('[data-periodo-fechas]')
  chk('las fechas a mano arrancan escondidas', fechas.hidden)
  m.ctl.caja.querySelector('[data-periodo-elegir]').click()
  chk('"Elegir fechas" las muestra', !fechas.hidden && m.ctl.caja.querySelector('[data-periodo-elegir]').getAttribute('aria-expanded') === 'true')
  chk('y le da el foco a "Desde"', documento.activeElement === m.ctl.caja.querySelector('[data-periodo-campo="desde"]'))
  const campoD = m.ctl.caja.querySelector('[data-periodo-campo="desde"]')
  const campoH = m.ctl.caja.querySelector('[data-periodo-campo="hasta"]')
  chk('los campos del panel son fechas del sistema', campoD.getAttribute('type') === 'date' && campoH.getAttribute('type') === 'date')
  campoD.value = '2026-09-20'; campoH.value = '2026-09-02'
  m.cambios.length = 0
  m.ctl.caja.querySelector('[data-periodo-aplicar]').click()
  const err = m.ctl.caja.querySelector('[data-periodo-error]')
  chk('un rango al revés no se aplica y avisa', !err.hidden && err.textContent !== '' && !m.ctl.panel.hidden && m.cambios.length === 0)
  campoH.value = '2026-09-25'
  m.ctl.caja.querySelector('[data-periodo-aplicar]').click()
  chk('un rango bien se aplica y cierra', m.ctl.panel.hidden && m.d.value === '2026-09-20' && m.h.value === '2026-09-25')
  chk('el botón dice el rango', m.valor() === 'Del 20/09 al 25/09/2026', m.valor())

  // Al reabrir con un rango a mano, las fechas vienen a la vista y cargadas.
  m.ctl.boton.click()
  chk('reabrir con un rango a mano muestra las fechas', !fechas.hidden && campoD.value === '2026-09-20' && campoH.value === '2026-09-25')
  chk('y el error de antes ya no está', err.hidden)

  // Si la pantalla cambió las fechas desde código, el panel las trae al reabrir.
  m.ctl.cerrar()
  m.d.value = '2026-09-01'
  m.ctl.boton.click()
  chk('reabrir trae las fechas que tiene la pantalla', campoD.value === '2026-09-01' && campoH.value === '2026-09-25', campoD.value)

  // Teclado.
  documento.activeElement = campoD
  m.ctl.panel.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {}, stopPropagation() {} })
  chk('Escape cierra', m.ctl.panel.hidden)
  chk('y el foco vuelve al botón', documento.activeElement === m.ctl.boton)

  // La pantalla le pone un valor desde código ("Borrar filtros").
  m.h.value = ''; m.d.value = ''
  chk('el botón se entera cuando la pantalla cambia "Desde"', m.valor() === 'Todo', m.valor())
  m.h.value = '2026-09-30'
  chk('y cuando cambia "Hasta"', m.valor() === 'Hasta el 30/09/2026', m.valor())
  m.h.value = ''

  // Idempotente: una pantalla que redibuja puede llamarlo otra vez.
  chk('llamarlo dos veces devuelve el mismo control', P.crearPeriodo({ desde: m.d, hasta: m.h }) === m.ctl)
  chk('sin campos no hace nada', P.crearPeriodo({}) === null && P.crearPeriodo({ desde: m.d }) === null)

  // Un toque afuera cierra; adentro, no.
  m.ctl.boton.click()
  const toque = (target) => { for (const f of documento.oyentes.pointerdown || []) f({ target }) }
  toque(m.ctl.panel)
  chk('tocar adentro del panel no lo cierra', !m.ctl.panel.hidden)
  toque(new Elemento('div'))
  chk('tocar afuera lo cierra', m.ctl.panel.hidden)
}

{
  // En el celular el panel sale desde abajo, con fondo oscuro.
  const m = montar({ ancho: 360 })
  m.ctl.boton.click()
  chk('en el celular es una hoja desde abajo', m.ctl.caja.classList.contains('periodo--hoja'))
  chk('con el fondo oscuro', !m.ctl.caja.querySelector('[data-periodo-fondo]').hidden)
  chk('y sin posición calculada (la pone el CSS)', !m.ctl.panel.style.top && !m.ctl.panel.style.left)
  m.ctl.caja.querySelector('[data-periodo-fondo]').click()
  chk('tocar el fondo lo cierra', m.ctl.panel.hidden && m.ctl.caja.querySelector('[data-periodo-fondo]').hidden)
  chk('la hoja es debajo de 640 px', P.ANCHO_HOJA_PERIODO === 640)
}

{
  // obligatorias: la pantalla no sabe buscar sin fechas.
  const m = montar({ desde: '2026-09-27', hasta: '2026-10-04', obligatorias: true })
  chk('con obligatorias no se ofrece "Todo"', m.ctl.caja.querySelector('[data-periodo-atajo="todo"]') === null)
  chk('pero sí los otros atajos', m.ctl.caja.querySelectorAll('[data-periodo-atajo]').length === 4)
  m.ctl.boton.click()
  const campoD = m.ctl.caja.querySelector('[data-periodo-campo="desde"]')
  campoD.value = ''
  m.ctl.caja.querySelector('[data-periodo-aplicar]').click()
  chk('con obligatorias, una sola fecha no se aplica', !m.ctl.panel.hidden && m.d.value === '2026-09-27')
  chk('y avisa', !m.ctl.caja.querySelector('[data-periodo-error]').hidden)
  const sin = montar()
  chk('sin obligatorias "Todo" está', sin.ctl.caja.querySelector('[data-periodo-atajo="todo"]') !== null)
}

{
  // Lo que entra al HTML va escapado (el id sale de la pantalla).
  anchoVentana = 1280
  const d = new Campo('input', { id: 'x"><b>' }); const h = new Campo('input')
  const lD = new Elemento('label'); lD.appendChild(d); const lH = new Elemento('label'); lH.appendChild(h)
  const barra = new Elemento('div'); barra.appendChild(lD); barra.appendChild(lH)
  const ctl = P.crearPeriodo({ desde: d, hasta: h, hoy: () => '2026-10-04' })
  chk('el id va escapado en el HTML', !ctl.caja.innerHTML.includes('"><b>') && ctl.caja.innerHTML.includes('x&quot;&gt;&lt;b&gt;-periodo'))
}

// ── Que todas las pantallas con fechas lo usen ───────────────────────────

const RAIZ = path.join(__dirname, '..')
const USOS = {
  'modulos/gastos.html': ['filtro-fecha-desde'],
  'modulos/caja.html': ['filtro-retiros-desde'],
  'modulos/cobranzas.html': ['cob-filtro-desde'],
  'modulos/cuentas-corrientes.html': ['filtro-fecha-desde-historial', 'filtro-fecha-desde-ficha'],
  'modulos/pedidos.html': ['pe-filtro-desde'],
  'modulos/administracion.html': ['ad-filtro-desde'],
  'modulos/produccion-gestion.html': ['pr-historial-desde'],
}
for (const [archivo, ids] of Object.entries(USOS)) {
  const html = fs.readFileSync(path.join(RAIZ, archivo), 'utf8')
  chk(`${archivo} importa crearPeriodo de js/periodo.js`, /import \{[^}]*\bcrearPeriodo\b[^}]*\} from '\.\.\/js\/periodo\.js'/.test(html))
  for (const id of ids) chk(`${archivo}: "${id}" va con el control de período`, html.includes(`crearPeriodo({ desde: document.getElementById('${id}')`))
}
chk('el historial de Producción pide las dos fechas', /crearPeriodo\(\{ desde: document\.getElementById\('pr-historial-desde'\)[^\n]*obligatorias: true/.test(fs.readFileSync(path.join(RAIZ, 'modulos/produccion-gestion.html'), 'utf8')))
// Los menús de filtro se ubican adentro de la pantalla.
for (const archivo of ['modulos/gastos.html', 'modulos/caja.html', 'modulos/cuentas-corrientes.html']) {
  const html = fs.readFileSync(path.join(RAIZ, archivo), 'utf8')
  chk(`${archivo}: los menús usan ubicarPanel`, /if \(!estabaAbierto\) ubicarPanel\(panel, boton\)/.test(html))
  chk(`${archivo}: ya no se ubican en rect.bottom a ciegas`, !/panel\.style\.top\s*=\s*\(rect\.bottom \+ 4\)/.test(html))
}

fin()
