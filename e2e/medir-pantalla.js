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
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3
    if (el.getBoundingClientRect().height > lh * 1.6) res.lote.push(nombre(el))
  }
  return res
}

module.exports = { medirPantalla }
