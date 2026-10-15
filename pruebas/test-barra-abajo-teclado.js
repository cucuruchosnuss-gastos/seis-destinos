// LA BARRA DE ABAJO Y EL TECLADO DEL IPHONE (pedido del 15/10/2026; captura de
// Facu del 14/10, 18:57: en Inicio la barra quedó a mitad de pantalla, ~380 pt
// arriba del borde, el alto del teclado). Se EJECUTAN las funciones reales de
// js/barra-lateral.js con una ventana falsa (visualViewport, scroll y relojes):
//  - qué campos abren el teclado (y cuáles no: botones, casillas, solo lectura);
//  - el desfase entre lo que se ve (visualViewport.height + offsetTop) y el
//    alto de la ventana (innerHeight); con zoom no cuenta;
//  - el rebote de arriba o de abajo de todo no se toca;
//  - al cerrarse el teclado con la barra corrida, se fuerza la recolocación
//    con un scroll de ida y vuelta de 1 px que deja la página donde estaba;
//  - con el teclado abierto, con zoom, en el rebote, en Android (sin desfase)
//    y en la compu no se hace nada; si no se arregla, pocos intentos y
//    espaciados (nunca en bucle);
//  - el CSS: la barra fija abajo de punta a punta y sin ancestros con
//    transform / filter / will-change.
//
//   node pruebas/test-barra-abajo-teclado.js
//   ARCHIVO_TEST=<copia de js/barra-lateral.js>  ARCHIVO_CSS=<copia de css/main.css>

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'barra-lateral.js')
const RUTA_CSS = process.env.ARCHIVO_CSS || path.join(RAIZ, 'css', 'main.css')
const src = fs.readFileSync(RUTA, 'utf8')
const css = fs.readFileSync(RUTA_CSS, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_CSS} (${css.length} bytes)`)
const { chk, fin } = arnes()

const FUNCIONES = ['abreTeclado', 'desfaseTeclado', 'enRebote', 'barraCorrida', 'hayQueRecolocar', 'recolocarFijos', 'vigilarTeclado']
const CONSTANTES = ['TIPOS_SIN_TECLADO', 'TOLERANCIA_TECLADO_PX', 'MS_DESPUES_DEL_TECLADO', 'MS_ENTRE_RECOLOCACIONES', 'MAX_RECOLOCACIONES', 'MS_QUIETO']
function construir() {
  let codigo = ''
  for (const c of CONSTANTES) codigo += extraerConst(src, c)
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, ${CONSTANTES.join(', ')} }`
  return new Function(codigo)()
}
const B = construir()

// ── Una ventana falsa de iPhone 13 (390 × 844) ──────────────────────────────
function oyentes() {
  const o = {}
  return {
    o,
    addEventListener(t, f) { (o[t] ||= []).push(f) },
    disparar(t, ev = {}) { (o[t] || []).forEach(f => f(ev)) },
  }
}
function ventana({ alto = 844, altoPagina = 3000, scrollY = 0, vv = true } = {}) {
  const ov = oyentes()
  const visual = vv ? { height: alto, offsetTop: 0, scale: 1, ...oyentes() } : undefined
  let reloj = 0
  const relojes = new Map()
  let id = 0
  const w = {
    innerHeight: alto, scrollX: 0, scrollY, visualViewport: visual, scrolls: [], ...ov,
    ahora: () => reloj,
    setTimeout(f, ms) { relojes.set(++id, { f, cuando: reloj + (ms || 0) }); return id },
    clearTimeout(n) { relojes.delete(n) },
    scrollTo(x, y) {
      const max = altoPagina - w.innerHeight
      w.scrollX = x; w.scrollY = Math.max(0, Math.min(max, y)); w.scrolls.push([x, y])
      // Como el navegador: un scroll avisa (también el de la recolocación).
      w.disparar('scroll')
    },
    // Avanza el reloj y corre lo que vence (en orden), como el navegador.
    pasar(ms) {
      const hasta = reloj + ms
      for (;;) {
        const proximos = [...relojes.entries()].filter(([, r]) => r.cuando <= hasta).sort((a, b) => a[1].cuando - b[1].cuando)
        if (!proximos.length) break
        const [n, r] = proximos[0]
        relojes.delete(n)
        reloj = r.cuando
        r.f()
      }
      reloj = hasta
    },
    pendientes: () => relojes.size,
  }
  const doc = { activeElement: { tagName: 'BODY' }, documentElement: { scrollHeight: altoPagina }, ...oyentes() }
  // La barra: fija abajo; su borde de abajo es donde iOS la dibuja.
  const barra = { abajo: alto, alto: 68, getBoundingClientRect() { return { bottom: this.abajo, top: this.abajo - this.alto, height: this.alto } } }
  return { win: w, doc, barra }
}
const campo = (props = {}) => ({ tagName: 'INPUT', type: 'text', ...props })
// El iPhone abre el teclado: lo que se ve se achica 380 px.
function abrirTeclado({ win, doc }, el = campo()) {
  doc.activeElement = el
  doc.disparar('focusin', { target: el })
  win.visualViewport.height = win.innerHeight - 380
  win.visualViewport.disparar('resize')
}
// Cierra el teclado. Con `bug`, iOS no recoloca: lo que se ve vuelve a medir
// todo, pero corrido 380 px (offsetTop) y la barra queda dibujada arriba.
function cerrarTeclado({ win, doc, barra }, { bug = false } = {}) {
  const el = doc.activeElement
  doc.activeElement = { tagName: 'BODY' }
  doc.disparar('focusout', { target: el })
  win.visualViewport.height = bug ? win.innerHeight - 380 : win.innerHeight
  win.visualViewport.offsetTop = 0
  if (bug) barra.abajo = win.innerHeight - 380
  win.visualViewport.disparar('resize')
}
// Lo que hace iOS cuando se fuerza la recolocación: todo vuelve a su lugar.
function iosRecolocaAlScrollear(e) {
  const original = e.win.scrollTo
  e.win.scrollTo = (x, y) => {
    original(x, y)
    e.win.visualViewport.height = e.win.innerHeight
    e.win.visualViewport.offsetTop = 0
    e.barra.abajo = e.win.innerHeight
  }
}

// ── Qué abre el teclado ─────────────────────────────────────────────────────
chk('un campo de texto abre el teclado', B.abreTeclado(campo()) === true)
chk('un campo sin type también', B.abreTeclado({ tagName: 'INPUT' }) === true)
chk('número, mail, clave, fecha y búsqueda también',
  ['number', 'email', 'password', 'date', 'search', 'tel'].every(t => B.abreTeclado(campo({ type: t }))))
chk('un textarea y un select (la rueda) también', B.abreTeclado({ tagName: 'TEXTAREA' }) && B.abreTeclado({ tagName: 'SELECT' }))
chk('un texto editable también', B.abreTeclado({ tagName: 'DIV', isContentEditable: true }))
chk('botones, casillas y archivos NO',
  ['button', 'submit', 'checkbox', 'radio', 'reset', 'range', 'color', 'file', 'image', 'hidden'].every(t => !B.abreTeclado(campo({ type: t }))))
chk('un campo de solo lectura o apagado NO', !B.abreTeclado(campo({ readOnly: true })) && !B.abreTeclado(campo({ disabled: true })) && !B.abreTeclado({ tagName: 'TEXTAREA', readOnly: true }))
chk('un div, un botón o nada NO', !B.abreTeclado({ tagName: 'DIV' }) && !B.abreTeclado({ tagName: 'BUTTON' }) && !B.abreTeclado(null) && !B.abreTeclado(undefined))
chk('el type en mayúsculas cuenta igual', !B.abreTeclado(campo({ type: 'CHECKBOX' })))

// ── El desfase ──────────────────────────────────────────────────────────────
{
  const { win } = ventana()
  chk('sin teclado, lo que se ve coincide con la ventana', B.desfaseTeclado(win) === 0)
  win.visualViewport.height = 464
  chk('con el alto del teclado: 380 px', B.desfaseTeclado(win) === 380)
  win.visualViewport.offsetTop = 380
  chk('corrido pero completo: coincide', B.desfaseTeclado(win) === 0)
  win.visualViewport.offsetTop = 0
  win.visualViewport.scale = 1.6
  chk('con zoom no cuenta', B.desfaseTeclado(win) === 0)
  win.visualViewport.scale = 1.005
  chk('un zoom de redondeo sí cuenta', B.desfaseTeclado(win) === 380)
  chk('sin visualViewport, 0', B.desfaseTeclado(ventana({ vv: false }).win) === 0 && B.desfaseTeclado(null) === 0)
  win.visualViewport.scale = 1
  win.visualViewport.height = 843.6
  chk('se redondea', B.desfaseTeclado(win) === 0)
  win.visualViewport.height = NaN
  chk('un número roto no inventa desfase', B.desfaseTeclado(win) === 0)
}

// ── El rebote ───────────────────────────────────────────────────────────────
{
  const { win, doc } = ventana({ altoPagina: 2000 })
  chk('arriba de todo sin rebote', !B.enRebote(win, doc))
  win.scrollY = -40
  chk('el rebote de arriba', B.enRebote(win, doc))
  win.scrollY = 2000 - 844
  chk('abajo de todo sin rebote', !B.enRebote(win, doc))
  win.scrollY = 2000 - 844 + 30
  chk('el rebote de abajo', B.enRebote(win, doc))
  win.scrollY = 500
  chk('en el medio, no', !B.enRebote(win, doc))
}

// ── La barra corrida ────────────────────────────────────────────────────────
{
  const { win, barra } = ventana()
  chk('la barra en su lugar', !B.barraCorrida(win, barra))
  barra.abajo = 464
  chk('la barra a mitad de pantalla', B.barraCorrida(win, barra))
  barra.abajo = 845
  chk('un píxel de redondeo no cuenta', !B.barraCorrida(win, barra))
  barra.alto = 0; barra.abajo = 100
  chk('escondida (la compu) no cuenta', !B.barraCorrida(win, barra))
  chk('sin barra no cuenta', !B.barraCorrida(win, null) && !B.barraCorrida(win, {}))
}

// ── recolocarFijos: ida y vuelta, la página queda donde estaba ──────────────
{
  const { win } = ventana({ scrollY: 500 })
  B.recolocarFijos(win)
  chk('en el medio: un px para arriba y vuelve', JSON.stringify(win.scrolls) === '[[0,499],[0,500]]' && win.scrollY === 500)
  const arriba = ventana({ scrollY: 0 }).win
  B.recolocarFijos(arriba)
  chk('arriba de todo: un px para abajo y vuelve', JSON.stringify(arriba.scrolls) === '[[0,1],[0,0]]' && arriba.scrollY === 0)
}

// ── El caso de Facu: cerrar el teclado deja la barra a mitad de pantalla ────
{
  const e = ventana({ scrollY: 300 })
  iosRecolocaAlScrollear(e)
  const v = B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  chk('vigila', v !== null && typeof v.revisar === 'function')
  e.win.pasar(1000)
  chk('al abrir la página, sin desfase, no toca nada', e.win.scrolls.length === 0)
  abrirTeclado(e)
  e.win.pasar(1000)
  chk('con el teclado abierto no toca nada', e.win.scrolls.length === 0)
  cerrarTeclado(e, { bug: true })
  chk('recién cerrado todavía no (espera a que se acomode)', e.win.scrolls.length === 0)
  e.win.pasar(B.MS_DESPUES_DEL_TECLADO)
  chk('mientras el teclado se va (resize del visualViewport) tampoco', e.win.scrolls.length === 0)
  e.win.pasar(B.MS_QUIETO - B.MS_DESPUES_DEL_TECLADO)
  chk('al cerrar el teclado con la barra corrida: se recoloca', e.win.scrolls.length === 2)
  chk('… sin mover la página', e.win.scrollY === 300)
  chk('… y la barra vuelve al borde de abajo', e.barra.abajo === e.win.innerHeight && B.desfaseTeclado(e.win) === 0)
  e.win.pasar(5000)
  chk('arreglado, no vuelve a tocar nada', e.win.scrolls.length === 2)
  // Scrollear arriba y abajo después: nada.
  e.win.scrollY = 50; e.win.disparar('scroll')
  e.win.scrollY = 900; e.win.disparar('scroll')
  e.win.pasar(2000)
  chk('scrollear después no mueve nada', e.win.scrolls.length === 2)
  // Arreglada, cada vez que vuelve a correrse se recoloca (los intentos se
  // cuentan de nuevo; más veces que el tope de intentos seguidos).
  let bien = 0
  for (let i = 0; i <= B.MAX_RECOLOCACIONES; i++) {
    const antes = e.win.scrolls.length
    e.barra.abajo = 464
    e.win.disparar('scroll')
    e.win.pasar(2000)
    if (e.win.scrolls.length === antes + 2 && e.barra.abajo === 844) bien++
  }
  chk('arreglada, cada nueva corrida se recoloca', bien === B.MAX_RECOLOCACIONES + 1, String(bien))
}

// ── hayQueRecolocar: el desfase solo, o la barra corrida sola, alcanzan ─────
{
  const e = ventana({ scrollY: 300 })
  chk('todo en su lugar: no', !B.hayQueRecolocar(e))
  e.win.visualViewport.height = 464
  chk('lo que se ve no coincide (la barra parece bien): sí', B.hayQueRecolocar(e))
  e.win.visualViewport.height = 844
  e.barra.abajo = 464
  chk('la barra corrida (lo que se ve parece bien): sí', B.hayQueRecolocar(e))
  e.doc.activeElement = campo()
  chk('con un campo enfocado: no', !B.hayQueRecolocar(e))
  e.doc.activeElement = { tagName: 'BODY' }
  e.win.scrollY = -20
  chk('en el rebote: no', !B.hayQueRecolocar(e))
  e.win.scrollY = 300
  e.barra.abajo = 844
  e.win.visualViewport.height = 464
  e.barra.alto = 0
  chk('con la barra escondida (la compu), aunque no coincida: no', !B.hayQueRecolocar(e))
  chk('sin barra: no', !B.hayQueRecolocar({ ...e, barra: null }))
}

// ── iOS cierra el teclado sin avisar con un resize ──────────────────────────
{
  const e = ventana({ scrollY: 300 })
  iosRecolocaAlScrollear(e)
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  abrirTeclado(e)
  const el = e.doc.activeElement
  e.doc.activeElement = { tagName: 'BODY' }
  e.win.visualViewport.offsetTop = 380
  e.barra.abajo = 464
  e.doc.disparar('focusout', { target: el })
  e.win.pasar(B.MS_DESPUES_DEL_TECLADO)
  chk('al soltar el campo se mira solo (sin esperar otro aviso)', e.win.scrolls.length === 2 && e.barra.abajo === 844)
}

// ── Si iOS no se arregla: pocos intentos, espaciados ────────────────────────
{
  const e = ventana({ scrollY: 300 })
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  abrirTeclado(e)
  cerrarTeclado(e, { bug: true })
  e.win.pasar(B.MS_QUIETO)
  chk('primer intento', e.win.scrolls.length === 2)
  // Un scroll en el medio pide revisar antes: igual el segundo intento espera.
  e.win.pasar(10)
  e.win.disparar('scroll')
  e.win.pasar(B.MS_ENTRE_RECOLOCACIONES - 20)
  chk('el segundo no antes de tiempo', e.win.scrolls.length === 2, String(e.win.scrolls.length))
  e.win.pasar(60000)
  chk(`a lo sumo ${B.MAX_RECOLOCACIONES} intentos`, e.win.scrolls.length === 2 * B.MAX_RECOLOCACIONES, String(e.win.scrolls.length))
  chk('y no queda nada dando vueltas', e.win.pendientes() === 0)
  // Un scroll del usuario dispara una revisión, pero no más intentos.
  e.win.disparar('scroll'); e.win.visualViewport.disparar('scroll')
  e.win.pasar(5000)
  chk('scrollear no reabre los intentos', e.win.scrolls.length === 2 * B.MAX_RECOLOCACIONES)
  chk('la página sigue donde estaba', e.win.scrollY === 300)
  // Volver a escribir y cerrar el teclado: se vuelve a intentar.
  abrirTeclado(e)
  cerrarTeclado(e, { bug: true })
  e.win.pasar(B.MS_QUIETO)
  chk('otro teclado, otro intento', e.win.scrolls.length === 2 * B.MAX_RECOLOCACIONES + 2)
}

// ── Lo que mueve la pantalla se revisa cuando queda quieta ──────────────────
{
  const e = ventana({ scrollY: 300 })
  iosRecolocaAlScrollear(e)
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  e.win.pasar(1000)
  // La barra quedó corrida sin que veamos el teclado (vino de otra página).
  e.barra.abajo = 464
  for (let i = 0; i < 10; i++) { e.win.disparar('scroll'); e.win.pasar(B.MS_QUIETO - 50) }
  chk('mientras se scrollea (el envión) no se toca', e.win.scrolls.length === 0)
  e.win.pasar(60)
  chk('quieta: se recoloca', e.win.scrolls.length === 2 && e.barra.abajo === 844)
}

// ── Al abrir la página con el desfase del login ─────────────────────────────
{
  const e = ventana({ scrollY: 0 })
  iosRecolocaAlScrollear(e)
  e.win.visualViewport.height = 464
  e.barra.abajo = 464
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  e.win.pasar(B.MS_DESPUES_DEL_TECLADO)
  chk('la página abre con la barra corrida: se recoloca', e.win.scrolls.length === 2 && e.win.scrollY === 0 && e.barra.abajo === 844)
  // Volver a la página (pageshow) con la barra corrida.
  e.win.pasar(60000)
  chk('quieta, sin nada pendiente', e.win.pendientes() === 0)
  e.barra.abajo = 400
  e.win.disparar('pageshow')
  e.win.pasar(1)
  chk('al volver a la página también, enseguida', e.win.scrolls.length === 4 && e.barra.abajo === 844)
}

// ── Lo que NO se toca ───────────────────────────────────────────────────────
{
  // Con el campo enfocado (el teclado abierto), aunque cambie lo que se ve.
  const e = ventana({ scrollY: 300 })
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  abrirTeclado(e)
  e.win.visualViewport.offsetTop = 120; e.win.visualViewport.disparar('scroll')
  e.win.pasar(5000)
  chk('con el teclado abierto: nada (el formulario no salta)', e.win.scrolls.length === 0)
  // Pasar de un campo a otro (el teclado sigue abierto).
  const otro = campo({ type: 'number' })
  doc2(e, otro)
  e.win.pasar(5000)
  chk('pasar de un campo a otro: nada', e.win.scrolls.length === 0)
}
function doc2(e, el) {
  const antes = e.doc.activeElement
  e.doc.activeElement = el
  e.doc.disparar('focusout', { target: antes })
  e.doc.disparar('focusin', { target: el })
}
{
  // El rebote arriba de todo con lo que se ve corrido.
  const e = ventana({ scrollY: -60 })
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  e.win.visualViewport.offsetTop = -60; e.win.visualViewport.height = 844
  e.barra.abajo = 784
  e.win.visualViewport.disparar('scroll')
  e.win.pasar(5000)
  chk('el rebote de arriba de todo: nada', e.win.scrolls.length === 0)
}
{
  // Con zoom (dos dedos).
  const e = ventana({ scrollY: 300 })
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  e.win.visualViewport.scale = 2; e.win.visualViewport.height = 422; e.win.visualViewport.offsetTop = 100
  e.win.visualViewport.disparar('resize'); e.win.visualViewport.disparar('scroll')
  e.win.pasar(5000)
  chk('con zoom: nada', e.win.scrolls.length === 0)
}
{
  // Android: al cerrar el teclado todo coincide.
  const e = ventana({ alto: 780, scrollY: 300 })
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  abrirTeclado(e)
  cerrarTeclado(e)
  e.win.pasar(5000)
  chk('Android (sin desfase): nada', e.win.scrolls.length === 0)
}
{
  // La compu: la barra de abajo está escondida; aunque lo que se ve no
  // coincida (una ventana rara), no se toca nada.
  const e = ventana({ alto: 800, scrollY: 300 })
  e.barra.alto = 0; e.barra.abajo = 0
  e.win.visualViewport.height = 500
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  e.doc.disparar('focusout', { target: campo() })
  e.win.disparar('scroll')
  e.win.visualViewport.disparar('resize')
  e.win.pasar(5000)
  chk('la compu: nada', e.win.scrolls.length === 0)
}
{
  // Una casilla o un botón no son el teclado.
  const e = ventana({ scrollY: 300 })
  B.vigilarTeclado({ ...e, ahora: e.win.ahora })
  e.win.pasar(1000)
  e.doc.disparar('focusout', { target: campo({ type: 'checkbox' }) })
  chk('soltar una casilla no pide revisar', e.win.pendientes() === 0)
}
chk('sin relojes ni documento no se rompe', B.vigilarTeclado({ win: {}, doc: {}, barra: null }) === null && B.vigilarTeclado({ win: null, doc: null }) === null)

// ── La instalación y el CSS ─────────────────────────────────────────────────
chk('la barra lo usa al instalarse, con la barra de abajo', /doc\.body\.append\(abajo, hoja, editor\)[\s\S]{0,300}vigilarTeclado\(\{ win, doc, barra: abajo \}\)/.test(src))
chk('la barra cuelga directo del body', /doc\.body\.append\(abajo,/.test(src))
const reglaBarra = (css.match(/\n {2}\.barra-abajo \{([^}]*)\}/) || [])[1] || ''
chk('la barra: position fixed', /position: fixed;/.test(reglaBarra))
chk('… pegada abajo y de punta a punta', /left: 0;/.test(reglaBarra) && /right: 0;/.test(reglaBarra) && /bottom: 0;/.test(reglaBarra))
chk('… sin transform, filter ni will-change propios', !/transform|filter|will-change|contain/.test(reglaBarra))
// Ninguna regla de html o body (los ancestros de la barra) rompe position: fixed.
const reglasAncestros = [...css.matchAll(/(^|\n)\s*([^{}\n]*\b(?:html|body)\b[^{}\n]*)\{([^}]*)\}/g)]
  .filter(m => !/\.barra-abajo|\.hoja-|#version|\.barra-lateral|::|:has\(|\.rh-/.test(m[2]) && /^\s*(html|body)\b/.test(m[2].trim()))
chk('hay reglas de html y body para revisar', reglasAncestros.length >= 2, String(reglasAncestros.length))
chk('ningún html/body con transform, filter, will-change, perspective o contain',
  reglasAncestros.every(m => !/\b(transform|filter|will-change|perspective|contain)\s*:/.test(m[3])), reglasAncestros.map(m => m[2]).join(' | '))
chk('ningún html/body con alto fijo de pantalla (height: 100vh)', reglasAncestros.every(m => !/(^|[^-])height:\s*100(d|s|l)?vh/.test(m[3])))

fin()
