// Mide una pantalla YA ABIERTA en el navegador y devuelve lo que está mal
// para una tablet (28/09/2026, la planta en la tablet real):
//  - scroll: la página mide más que la ventana (document.scrollingElement);
//  - afuera: un elemento cuyo contenido se sale de su recuadro (scrollWidth >
//    clientWidth con overflow visible), o un hijo que se sale del borde de su
//    padre;
//  - cortadas: una palabra partida en dos renglones ("Cucuruch / ón");
//  - lote: el número de lote en dos renglones.
// Las listas largas de verdad (conos, personas, lotes) llevan
// data-scroll-propio: adentro pueden scrollear, y no se miran.
//
// Se usa desde e2e/8-planta-tamanos.spec.js con page.evaluate(medirPantalla).
function medirPantalla() {
  const vivo = (el) => {
    if (!(el instanceof Element)) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const dentroDeScroll = (el) => !!el.closest('[data-scroll-propio]')
  const nombre = (el) => {
    const id = el.id ? '#' + el.id : ''
    const cl = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    return (el.tagName.toLowerCase() + id + cl + ' «' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '»')
  }
  const esc = document.scrollingElement || document.documentElement
  const res = {
    ancho: innerWidth, alto: innerHeight,
    altoDoc: esc.scrollHeight, anchoDoc: esc.scrollWidth,
    scroll: esc.scrollHeight > innerHeight + 1,
    scrollX: esc.scrollWidth > innerWidth + 1,
    afuera: [], cortadas: [], lote: [],
  }
  const todos = [...document.body.querySelectorAll('*')].filter(vivo)
  for (const el of todos) {
    if (dentroDeScroll(el) && !el.matches('[data-scroll-propio]')) continue
    const cs = getComputedStyle(el)
    if (['SCRIPT', 'STYLE', 'SVG', 'svg', 'PATH', 'path'].includes(el.tagName)) continue
    if (cs.display.startsWith('inline') && cs.display !== 'inline-block' && cs.display !== 'inline-flex' && cs.display !== 'inline-grid') continue
    const ox = cs.overflowX
    if ((ox === 'visible') && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      res.afuera.push(nombre(el) + ` (${el.scrollWidth} en ${el.clientWidth})`)
    }
  }
  // Palabras partidas: cada palabra (3 letras o más) de cada texto visible
  // tiene que caer en UN renglón.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const rango = document.createRange()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const padre = n.parentElement
    if (!padre || !vivo(padre) || dentroDeScroll(padre)) continue
    if (padre.closest('script, style, [aria-hidden="true"]')) continue
    const texto = n.textContent
    const re = /[^\s·|/]{3,}/g
    let m
    while ((m = re.exec(texto))) {
      rango.setStart(n, m.index)
      rango.setEnd(n, m.index + m[0].length)
      const rects = [...rango.getClientRects()].filter(r => r.width > 0.5)
      const tops = new Set(rects.map(r => Math.round(r.top)))
      if (tops.size > 1) res.cortadas.push(`«${m[0]}» en ${nombre(padre)}`)
    }
  }
  // El lote nunca en dos renglones.
  for (const el of document.querySelectorAll('[data-lote-numero], .pr-maquina__lote, .pr-lat__maq-lote, .pr-planilla-cab__numero')) {
    if (!vivo(el)) continue
    // Planta v2: "Lote" chico y el número grande en la misma línea; el renglón
    // lo marca el texto MÁS grande de adentro. Dos renglones = partes con
    // arriba distinto (una debajo de la otra).
    const partes = [el, ...el.querySelectorAll('*')].filter(vivo)
    const lh = Math.max(...partes.map(p => parseFloat(getComputedStyle(p).lineHeight) || parseFloat(getComputedStyle(p).fontSize) * 1.3))
    if (el.getBoundingClientRect().height > lh * 1.6) res.lote.push(nombre(el))
  }
  return res
}

// LO QUE SE CORTA POR DENTRO EN UN CELULAR (10/10/2026, la planta a 360 px).
// medirPantalla mira el contenido que se sale con overflow VISIBLE; esto mira
// las piezas de la planta que, en un celular angosto, quedaban tapadas por
// una caja que recorta (overflow hidden) o pisadas con lo de al lado, sin
// ningún scroll que lo delate: el lote del tablero, el chip de estado de cada
// máquina, el encargado de Abrir turno, "Andando" de Paradas, la tarjeta de
// la Sala de masa y las pestañas de las máquinas. Para cada una que esté a la
// vista:
//  - su contenido no puede ser más ancho ni más alto que ella (scrollWidth /
//    scrollHeight);
//  - todo lo que tiene adentro (cada elemento a la vista) cae dentro de su
//    recuadro (así se ve el número de masas de la Sala tapado por arriba,
//    que no suma al scroll);
//  - ella cae dentro de la primera caja de arriba que recorta.
// Devuelve una lista de textos ("" si está todo bien).
const PIEZAS_CELULAR = [
  ['el lote del tablero', '.pr-maquina__lote'],
  ['el chip de estado de una máquina', '.pr-maquina__chip'],
  ['el encargado de Abrir turno', '#pr-abrir-encargado'],
  ['«Andando» de Paradas', '#pr-parada-andando'],
  ['la tarjeta de la Sala de masa', '.pr-sala-card'],
  // Lo de arriba de "+ Nueva masa": lo que se pasa por abajo queda debajo del botón.
  ['lo de arriba de una tarjeta de la Sala de masa', '.pr-sala-card__cuerpo'],
  ['una pestaña de máquina', '.pr-pest'],
]
function medirCortesPlanta(piezas) {
  const T = 1
  const vivo = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const texto = (el) => '«' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '»'
  const fuera = (a, b) => a.left < b.left - T || a.right > b.right + T || a.top < b.top - T || a.bottom > b.bottom + T
  const mal = []
  const pisan = (a, b) => a.left < b.right - T && b.left < a.right - T && a.top < b.bottom - T && b.top < a.bottom - T
  for (const [cual, sel] of piezas) {
    // Dos de la misma clase no se pisan (una tarjeta encima de la otra).
    const todas = [...document.querySelectorAll(sel)].filter(el => vivo(el) && !el.closest('[hidden]'))
    for (let i = 0; i < todas.length; i++) for (let j = i + 1; j < todas.length; j++) {
      if (todas[i].contains(todas[j]) || todas[j].contains(todas[i])) continue
      if (pisan(todas[i].getBoundingClientRect(), todas[j].getBoundingClientRect())) mal.push(`${cual} ${texto(todas[i])} se pisa con ${texto(todas[j])}`)
    }
    for (const el of todas) {
      const que = `${cual} ${texto(el)}`
      if (el.scrollWidth > el.clientWidth + T) mal.push(`${que}: mide ${el.scrollWidth} px de ancho en ${el.clientWidth}`)
      // Lo alto solo cuenta si la pieza recorta (con overflow visible, unos
      // px de la línea de base que bajan no tapan nada).
      if (getComputedStyle(el).overflowY !== 'visible' && el.scrollHeight > el.clientHeight + T) mal.push(`${que}: mide ${el.scrollHeight} px de alto en ${el.clientHeight}`)
      const caja = el.getBoundingClientRect()
      for (const h of el.querySelectorAll('*')) {
        if (!vivo(h) || (h.tagName.toLowerCase() !== 'svg' && h.closest('svg'))) continue
        const cs = getComputedStyle(h)
        // Lo escondido para la vista (solo para el lector de pantalla) no cuenta.
        if (cs.position === 'absolute' && h.getBoundingClientRect().width <= 1) continue
        if (fuera(h.getBoundingClientRect(), caja)) { mal.push(`${que}: ${h.tagName.toLowerCase()} ${texto(h)} se sale de su recuadro`); break }
      }
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p)
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
        if (p.hasAttribute('data-scroll-propio') || /auto|scroll/.test(cs.overflowX + cs.overflowY)) break
        if (fuera(caja, p.getBoundingClientRect())) mal.push(`${que}: queda tapado por ${p.tagName.toLowerCase()}${p.className && typeof p.className === 'string' ? '.' + p.className.trim().split(/\s+/)[0] : ''}`)
        break
      }
    }
  }
  return mal
}

// LA PÁGINA Y EL MARCO DE LA PLANTA NO SE SALEN DE COSTADO (09/10/2026; se
// mudó acá desde e2e/29-planta-390.spec.js el 10/10/2026 para usarla también
// a 360 px). Lo que tiene que entrar en el ancho de la pantalla: la página y el marco.
function medirCostado() {
  const ancho = document.documentElement.clientWidth
  const marcos = [
    document.documentElement, document.body,
    document.querySelector('.pr-app'), document.getElementById('pr-vista'),
    document.getElementById('pr-barra'),
    ...document.querySelectorAll('#pr-vista > section'),
  ].filter(el => el && !el.hidden && getComputedStyle(el).display !== 'none')
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')
  const mal = []
  for (const el of marcos) {
    if (el.scrollWidth > el.clientWidth + 1) mal.push(`${nombre(el)} mide ${el.scrollWidth} px de ancho en ${el.clientWidth}`)
    if (el.scrollLeft > 0) mal.push(`${nombre(el)} quedó corrido ${el.scrollLeft} px de costado`)
    const r = el.getBoundingClientRect()
    if (r.right > ancho + 1 || r.left < -1) mal.push(`${nombre(el)} va de ${Math.round(r.left)} a ${Math.round(r.right)} (pantalla de ${ancho})`)
  }
  // Los campos donde se escribe, con letra de 16 px o más.
  const chicos = [...document.querySelectorAll('input, select, textarea')].filter(c => {
    if (c.type === 'hidden' || c.type === 'checkbox' || c.type === 'radio') return false
    const cs = getComputedStyle(c), r = c.getBoundingClientRect()
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) return false
    return parseFloat(cs.fontSize) < 16
  }).map(c => `${nombre(c)} con letra de ${getComputedStyle(c).fontSize}`)
  return { mal, chicos }
}

module.exports = { medirPantalla, medirCostado, medirCortesPlanta, PIEZAS_CELULAR }
