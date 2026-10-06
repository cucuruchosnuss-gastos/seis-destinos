// "Ampliar" el panel de detalle (06/10/2026): una ventana grande en el medio
// de la pantalla, con el fondo oscurecido, para mirar un detalle con aire. A
// la izquierda el resumen y las observaciones completas (sin cortar); a la
// derecha los cheques, las fotos o los renglones en una grilla de 2 o 3 por
// fila; abajo las MISMAS acciones del panel.
//
// Una sola pieza para las cinco pantallas que la usan (Cobranzas, Gastos, la
// cobranza de un cheque en Administración, las órdenes de retiro y el detalle
// de un pago en Cuentas corrientes): copiada en cada una serían cinco ventanas
// que divergen en silencio (el foco atrapado, el Escape, el corte del celular).
//
// LA VENTANA NO TIENE LÓGICA PROPIA. Cada pantalla le dice qué nodos de SU
// panel son el resumen, cuáles van en la grilla y cuáles son las acciones, y
// la ventana los COPIA (cloneNode). Tocar algo en la copia toca el ORIGINAL
// (original.click()): los mismos handlers, nada duplicado. Antes, la ventana se
// cierra (el foco vuelve al botón Ampliar), así un formulario, una
// confirmación o un visor que abra la acción se ven en el panel de siempre.
// La excepción son los desplegables (aria-expanded, <summary> o lo que la
// pantalla marque en `quedarse`): ahí la ventana sigue abierta y se actualiza.
// Si el panel cambia (otra cobranza, una foto que terminó de firmarse, una
// acción que lo redibujó) la ventana se vuelve a copiar sola; si el detalle ya
// no está, se cierra.
//
// En las copias se sacan los id, name, for, aria-*by / aria-controls y los
// data-* (que una pantalla que busca sus propios elementos no encuentre la
// copia, y que un radio copiado no le saque la marca al original), y los
// campos quedan deshabilitados: la ventana es para MIRAR y actuar con los
// botones, no para escribir.
//
// EN EL CELULAR NO APARECE: ahí el detalle ya ocupa toda la pantalla. El corte
// lo da cada pantalla (por defecto CORTE_AMPLIAR, el de la compu donde el
// detalle es un panel al lado de la lista).
//
// Su escape es escAmp: solo el título y los rótulos se escriben acá; el resto
// son copias de nodos que la pantalla ya armó escapados.

export const CORTE_AMPLIAR = '(min-width: 1100px)'
// Desde este ancho de la grilla, 3 por fila; menos, 2.
export const ANCHO_TRES_COLUMNAS = 900

export function escAmp(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Cuántas columnas tiene la grilla: 3 desde ANCHO_TRES_COLUMNAS, si no 2; y
// nunca más columnas que cosas (una sola foto va a todo el ancho).
export function columnasGrilla(ancho, cantidad) {
  const base = Number(ancho) >= ANCHO_TRES_COLUMNAS ? 3 : 2
  const n = Number.isFinite(Number(cantidad)) ? Math.floor(Number(cantidad)) : 0
  return Math.max(1, Math.min(base, n))
}

// Lo que se toca: un botón, un link, un role=button, un <summary> o lo que la
// pantalla sume en `tocables` (un selector que se mira en el ORIGINAL: la
// copia ya no tiene sus data-*).
const TAGS_TOCABLES = new Set(['BUTTON', 'A', 'SUMMARY'])
function esTocable(el, extra, original) {
  if (!el || el.nodeType !== 1) return false
  if (TAGS_TOCABLES.has(el.tagName) && (el.tagName !== 'A' || el.hasAttribute('href'))) return true
  if (el.getAttribute('role') === 'button') return true
  return !!(extra && original?.matches?.(extra))
}

// Lo que recibe el foco con Tab adentro de la ventana.
const TAGS_ENFOCABLES = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'])
function esEnfocable(el) {
  if (!el || el.nodeType !== 1 || el.hidden || el.disabled) return false
  if (TAGS_ENFOCABLES.has(el.tagName)) return true
  if (el.tagName === 'A' && el.hasAttribute('href')) return true
  if (el.tagName === 'SUMMARY') return true
  const t = el.getAttribute('tabindex')
  return t !== null && t !== '-1'
}

function descendientes(el, fuera = []) {
  for (const h of el.children ?? []) {
    if (h.hidden) continue
    fuera.push(h)
    descendientes(h, fuera)
  }
  return fuera
}

// ¿Se ve el original? Ni él ni nadie arriba con `hidden`, y con caja en la
// página (getClientRects vacío = display none de él o de un ancestro).
export function seVeAmpliar(el) {
  for (let x = el; x; x = x.parentElement) if (x.hidden) return false
  if (typeof el.getClientRects === 'function') return el.getClientRects().length > 0
  return true
}

const QUITAR = ['id', 'name', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']

// Copia un nodo de la pantalla y anota de qué original sale cada elemento de
// la copia (los dos árboles se recorren a la par: cloneNode los deja iguales).
function copiar(original, mapa) {
  const copia = original.cloneNode(true)
  const ir = (o, c) => {
    mapa.set(c, o)
    for (const nombre of [...(c.getAttributeNames?.() ?? [])]) {
      if (QUITAR.includes(nombre) || nombre.startsWith('data-')) c.removeAttribute(nombre)
    }
    if (c.tagName === 'INPUT' || c.tagName === 'SELECT' || c.tagName === 'TEXTAREA') c.disabled = true
    const oh = o.children ?? [], ch = c.children ?? []
    for (let i = 0; i < ch.length; i++) if (oh[i]) ir(oh[i], ch[i])
  }
  ir(original, copia)
  return copia
}

let numeroVentana = 0

export function crearAmpliar({
  boton,
  observar = [],
  corte = CORTE_AMPLIAR,
  titulo = () => '',
  resumen = () => [],
  grilla = () => [],
  acciones = () => [],
  disponible = () => true,
  tituloResumen = 'Resumen',
  tituloGrilla = 'Detalle',
  quedarse = null,
  tocables = null,
  // Cada cosa de la grilla va en una tarjeta de la ventana. Con false, sin
  // marco: para lo que ya es una tarjeta en el panel (un cheque, una sección).
  marcoCelda = true,
} = {}) {
  if (!boton) throw new Error('crearAmpliar: falta el botón Ampliar')
  const doc = boton.ownerDocument ?? document
  const win = doc.defaultView ?? globalThis.window
  const mq = typeof win?.matchMedia === 'function' ? win.matchMedia(corte) : null
  const enCompu = () => !!mq?.matches
  const id = 'amp-titulo-' + (++numeroVentana)

  let fondo = null      // el fondo oscuro (y la ventana adentro), mientras está abierta
  let mapa = new WeakMap()
  let pendiente = false

  boton.setAttribute('aria-haspopup', 'dialog')

  const lista = (f) => {
    try { return [...(f() ?? [])].filter(Boolean) } catch (err) { console.error('[ampliar]', err); return [] }
  }
  const hayDetalle = () => {
    try { return !!disponible() } catch { return false }
  }

  function pintarBoton() {
    const ver = enCompu() && hayDetalle()
    // Solo si cambia: el botón suele estar adentro del panel observado, y
    // volver a poner el mismo `hidden` es otra mutación (un bucle sin fin).
    if (boton.hidden !== !ver) boton.hidden = !ver
    if (fondo && !ver) cerrar({ devolverFoco: false })
  }

  // ── El armado ──────────────────────────────────────────────────────────
  function armarFondo() {
    const f = doc.createElement('div')
    f.className = 'amp-fondo'
    f.innerHTML =
      `<div class="amp" role="dialog" aria-modal="true" aria-labelledby="${id}" tabindex="-1">` +
      `<div class="amp__cabeza"><h2 class="amp__titulo" id="${id}"></h2>` +
      `<button type="button" class="amp__cerrar" aria-label="Cerrar">&times;</button></div>` +
      `<div class="amp__cuerpo">` +
      `<section class="amp__resumen" aria-label="${escAmp(tituloResumen)}"><h3 class="amp__sub">${escAmp(tituloResumen)}</h3><div class="amp__resumen-cuerpo"></div></section>` +
      `<section class="amp__lado" aria-label="${escAmp(tituloGrilla)}"><h3 class="amp__sub">${escAmp(tituloGrilla)}</h3><div class="amp__grilla"></div></section>` +
      `</div>` +
      `<div class="amp__acciones"></div>` +
      `</div>`
    f.addEventListener('click', alTocar)
    f.addEventListener('keydown', alTeclear)
    return f
  }

  const parte = (clase) => descendientes(fondo).find(e => e.classList?.contains(clase)) ?? null

  function dibujar() {
    mapa = new WeakMap()
    parte('amp__titulo').textContent = String(titulo() ?? '')
    const cuerpo = parte('amp__resumen-cuerpo')
    cuerpo.replaceChildren(...lista(resumen).filter(seVeAmpliar).map(o => copiar(o, mapa)))
    const celdas = lista(grilla).filter(seVeAmpliar)
    const g = parte('amp__grilla')
    g.replaceChildren(...celdas.map(o => {
      const c = doc.createElement('div')
      c.className = marcoCelda ? 'amp__celda' : 'amp__celda amp__celda--sin-marco'
      c.appendChild(copiar(o, mapa))
      return c
    }))
    if (!celdas.length) {
      const v = doc.createElement('p')
      v.className = 'amp__vacio'
      v.textContent = 'No hay nada para mostrar en esta parte.'
      g.appendChild(v)
    }
    ponerColumnas(celdas.length)
    const acc = parte('amp__acciones')
    const botones = lista(acciones).filter(seVeAmpliar)
    acc.replaceChildren(...botones.map(o => copiar(o, mapa)))
    acc.hidden = !botones.length
  }

  function ponerColumnas(cantidad) {
    const g = parte('amp__grilla')
    if (!g) return
    const n = cantidad ?? Number(g.getAttribute('data-cantidad') ?? 0)
    const ancho = g.getBoundingClientRect?.().width || ((win?.innerWidth ?? 1280) * 0.6)
    const cols = columnasGrilla(ancho, n)
    g.setAttribute('data-cantidad', String(n))
    g.setAttribute('data-columnas', String(cols))
    g.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`
  }

  // ── Abrir, refrescar, cerrar ───────────────────────────────────────────
  function abrir() {
    if (!enCompu() || !hayDetalle()) return false
    if (!fondo) {
      fondo = armarFondo()
      doc.body.appendChild(fondo)
      doc.documentElement?.classList?.add('amp-abierta')
    }
    dibujar()
    ponerColumnas()
    parte('amp__cerrar')?.focus()
    return true
  }

  function refrescar() {
    if (!fondo) return
    if (!enCompu() || !hayDetalle()) { cerrar({ devolverFoco: false }); return }
    const r = parte('amp__resumen'), l = parte('amp__lado')
    const scroll = [r?.scrollTop ?? 0, l?.scrollTop ?? 0]
    // El foco: si estaba en una copia, vuelve a la copia del MISMO original.
    const activo = doc.activeElement
    const adentro = !!activo && fondo.contains(activo)
    const deQuien = adentro ? mapa.get(activo) : null
    dibujar()
    if (r) r.scrollTop = scroll[0]
    if (l) l.scrollTop = scroll[1]
    if (adentro) {
      const nuevo = deQuien ? descendientes(fondo).find(e => mapa.get(e) === deQuien) : null
      ;(nuevo ?? parte('amp__cerrar'))?.focus()
    }
  }

  function cerrar({ devolverFoco = true } = {}) {
    if (!fondo) return
    const f = fondo
    fondo = null
    f.remove()
    doc.documentElement?.classList?.remove('amp-abierta')
    if (devolverFoco && !boton.hidden) boton.focus()
  }

  // ── Tocar y teclear adentro ────────────────────────────────────────────
  function alTocar(e) {
    // Afuera de la ventana (el fondo oscuro): cierra.
    if (e.target === fondo) { cerrar(); return }
    // La copia tocable más cercana (o la X), y su original.
    let el = e.target
    while (el && el !== fondo && !esTocable(el, tocables, mapa.get(el))) el = el.parentElement
    if (!el || el === fondo) return
    if (el.classList?.contains('amp__cerrar')) { cerrar(); return }
    const original = mapa.get(el)
    if (!original) return
    e.preventDefault?.()
    e.stopPropagation?.()
    if (!original.isConnected) { refrescar(); return }
    const queda = original.hasAttribute('aria-expanded') || original.tagName === 'SUMMARY' || !!(quedarse && original.matches?.(quedarse))
    if (queda) { original.click(); refrescar(); return }
    cerrar()
    original.click()
  }

  function alTeclear(e) {
    if (e.key === 'Escape') {
      e.preventDefault?.()
      e.stopPropagation?.()
      cerrar()
      return
    }
    if (e.key !== 'Tab') return
    const enfocables = descendientes(fondo).filter(esEnfocable)
    if (!enfocables.length) { e.preventDefault?.(); return }
    const primero = enfocables[0], ultimo = enfocables[enfocables.length - 1]
    const activo = doc.activeElement
    const dentro = enfocables.includes(activo)
    if (e.shiftKey && (activo === primero || !dentro)) { e.preventDefault?.(); ultimo.focus() }
    else if (!e.shiftKey && (activo === ultimo || !dentro)) { e.preventDefault?.(); primero.focus() }
  }

  // ── Seguir a la pantalla ───────────────────────────────────────────────
  boton.addEventListener('click', () => abrir())
  mq?.addEventListener?.('change', () => pintarBoton())
  win?.addEventListener?.('resize', () => { if (fondo) ponerColumnas() })

  function alCambiarElPanel() {
    if (pendiente) return
    pendiente = true
    Promise.resolve().then(() => {
      pendiente = false
      pintarBoton()
      refrescar()
    })
  }
  const Observador = win?.MutationObserver ?? globalThis.MutationObserver
  if (typeof Observador === 'function') {
    const obs = new Observador(alCambiarElPanel)
    for (const raiz of [].concat(observar).filter(Boolean)) {
      obs.observe(raiz, { childList: true, subtree: true, attributes: true, characterData: true })
    }
  }

  pintarBoton()
  return { abrir, cerrar, refrescar, pintarBoton, abierta: () => !!fondo }
}
