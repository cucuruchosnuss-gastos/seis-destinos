// El control de PERÍODO de toda la app (04/10/2026) — novena excepción
// consciente a la regla de duplicar: es el mismo control en todas las
// pantallas con fechas, y copiado en cada una serían reglas ("esta semana",
// "mes pasado") que divergen en silencio.
//
// QUÉ HACE: reemplaza los "Desde / Hasta" sueltos de una barra de filtros por
// UN botón "Período: <lo elegido>" que abre un panel (en el celular, desde
// abajo) con Hoy, Esta semana, Este mes, Mes pasado, Todo y "Elegir fechas".
//
// CÓMO NO CAMBIA QUÉ FILTRA CADA PANTALLA: no reemplaza los campos de fecha de
// la pantalla, los ENVUELVE. Los campos originales quedan en el DOM, con sus
// ids y sus listeners, escondidos; el control les pone el valor y les dispara
// el MISMO evento 'change' que dispararía la persona al elegir una fecha. Así
// la lógica de cada módulo (lo que lee, cuándo vuelve a pedir) sigue siendo
// exactamente la de antes.
//
// Y si la pantalla les pone un valor desde código (restaurar un filtro,
// "Borrar filtros"), el botón se entera solo: el setter de `value` de esos dos
// campos avisa (ver `vigilarValor`).
//
// Su escape es `escPer`.

// ── Fechas (hora de Argentina) ───────────────────────────────────────────

export const ZONA_PERIODO = 'America/Argentina/Buenos_Aires'

// Hoy en Argentina, como 'aaaa-mm-dd'. Supabase y el navegador pueden estar en
// otra zona: "hoy" se calcula siempre en la de la fábrica.
export function hoyIsoAr(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_PERIODO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

function esIso(t) { return typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) }

// Las cuentas de días se hacen en UTC sobre la fecha pura: no hay horas que
// crucen de un día a otro por la zona.
function aFecha(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)) }
function aIso(f) { return f.toISOString().slice(0, 10) }

// Los atajos, en el orden en que se ofrecen.
export const ATAJOS_PERIODO = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'semana', texto: 'Esta semana' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'mes_pasado', texto: 'Mes pasado' },
  { clave: 'todo', texto: 'Todo' },
]

// El rango de un atajo. "Esta semana" va del LUNES a hoy (la semana de la
// fábrica empieza el lunes); "Este mes", del 1º a hoy; "Mes pasado", entero;
// "Todo", sin fechas ('' y '').
export function rangoDePeriodo(clave, hoyIso = hoyIsoAr()) {
  if (!esIso(hoyIso)) return null
  const h = aFecha(hoyIso)
  if (clave === 'hoy') return { desde: hoyIso, hasta: hoyIso }
  if (clave === 'semana') {
    const dia = h.getUTCDay() // 0 domingo … 6 sábado
    const atras = (dia + 6) % 7 // cuántos días hasta el lunes
    const lunes = new Date(h); lunes.setUTCDate(h.getUTCDate() - atras)
    return { desde: aIso(lunes), hasta: hoyIso }
  }
  if (clave === 'mes') return { desde: hoyIso.slice(0, 8) + '01', hasta: hoyIso }
  if (clave === 'mes_pasado') {
    const primero = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1))
    const ultimo = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 0))
    return { desde: aIso(primero), hasta: aIso(ultimo) }
  }
  if (clave === 'todo') return { desde: '', hasta: '' }
  return null
}

// Qué atajo es un rango ya puesto (o 'fechas' si no coincide con ninguno).
export function claveDeRango(desde, hasta, hoyIso = hoyIsoAr()) {
  const d = desde || '', h = hasta || ''
  for (const a of ATAJOS_PERIODO) {
    const r = rangoDePeriodo(a.clave, hoyIso)
    if (r && r.desde === d && r.hasta === h) return a.clave
  }
  return 'fechas'
}

function dmy(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) }
function dm(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7) }

// Lo que dice el botón después de "Período:".
export function textoDePeriodo(desde, hasta, hoyIso = hoyIsoAr()) {
  const clave = claveDeRango(desde, hasta, hoyIso)
  if (clave !== 'fechas') return ATAJOS_PERIODO.find(a => a.clave === clave).texto
  const d = esIso(desde) ? desde : '', h = esIso(hasta) ? hasta : ''
  if (d && h) {
    if (d === h) return dmy(d)
    return 'Del ' + (d.slice(0, 4) === h.slice(0, 4) ? dm(d) : dmy(d)) + ' al ' + dmy(h)
  }
  if (d) return 'Desde el ' + dmy(d)
  if (h) return 'Hasta el ' + dmy(h)
  return 'Todo'
}

// Un rango elegido a mano tiene que tener sentido antes de aplicarse. Con
// `obligatorias`, las dos fechas hacen falta (hay pantallas que no saben
// buscar "sin fechas": el historial de Producción).
export function errorDeRango(desde, hasta, { obligatorias = false } = {}) {
  if (obligatorias && (!desde || !hasta)) return 'Elegí las dos fechas.'
  if (desde && !esIso(desde)) return 'La fecha "desde" no es válida.'
  if (hasta && !esIso(hasta)) return 'La fecha "hasta" no es válida.'
  if (desde && hasta && desde > hasta) return '"Desde" tiene que ser antes que "Hasta".'
  return ''
}

// ── Ubicar un panel flotante dentro de la pantalla ───────────────────────
//
// Para los menús de filtro que se abren con position: fixed (los multiselect
// de Gastos y Caja, y este panel en la compu). Antes se ponían en
// rect.bottom / rect.left del botón sin mirar la pantalla: en el celular se
// abrían por debajo del borde de abajo y en la compu se salían por la derecha.
// Se mide contra visualViewport (con el teclado abierto, innerHeight no se
// achica). Si abajo no entra y arriba hay más lugar, se abre arriba; si no
// entra en ningún lado, se achica y scrollea adentro.
export function ubicarPanel(panel, ancla, { margen = 8, separacion = 4 } = {}) {
  if (!panel || !ancla) return
  const vv = (typeof window !== 'undefined' && window.visualViewport) || null
  const anchoVista = vv ? vv.width : window.innerWidth
  const altoVista = vv ? vv.height : window.innerHeight
  const r = ancla.getBoundingClientRect()
  panel.style.maxHeight = ''
  panel.style.overflowY = ''
  const anchoMax = anchoVista - margen * 2
  panel.style.maxWidth = anchoMax + 'px'
  const ancho = Math.min(panel.offsetWidth, anchoMax)
  const alto = panel.offsetHeight
  const left = Math.max(margen, Math.min(r.left, anchoVista - margen - ancho))
  const abajo = altoVista - r.bottom - separacion - margen
  const arriba = r.top - separacion - margen
  let top
  if (alto <= abajo || abajo >= arriba) {
    top = r.bottom + separacion
    if (alto > abajo) { panel.style.maxHeight = Math.max(abajo, 120) + 'px'; panel.style.overflowY = 'auto' }
  } else {
    const usado = Math.min(alto, arriba)
    if (alto > arriba) { panel.style.maxHeight = arriba + 'px'; panel.style.overflowY = 'auto' }
    top = r.top - separacion - usado
  }
  panel.style.left = Math.round(left) + 'px'
  panel.style.top = Math.round(Math.max(margen, top)) + 'px'
}

// ── El control ───────────────────────────────────────────────────────────

export function escPer(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Debajo de este ancho el panel sale desde abajo (hoja), como en el resto de
// la app en el celular.
export const ANCHO_HOJA_PERIODO = 640

// El envoltorio de un campo: lo que se esconde junto con él (su label o la
// cajita que tiene el rótulo "Desde"). Si el padre tiene otros controles, se
// esconde solo el campo.
export function envoltorioDe(input) {
  const label = input.closest('label')
  if (label && label.querySelectorAll('input, select, button, textarea').length === 1) return label
  const padre = input.parentElement
  if (padre && padre.querySelectorAll('input, select, button, textarea').length === 1 && !padre.matches('[data-periodo-barra]')) return padre
  return input
}

// Avisa cuando la pantalla le pone un valor al campo desde código.
function vigilarValor(input, alCambiar) {
  const proto = Object.getPrototypeOf(input)
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') || Object.getOwnPropertyDescriptor(proto, 'value')
  if (!desc || !desc.set) return
  Object.defineProperty(input, 'value', {
    configurable: true,
    get() { return desc.get.call(this) },
    set(v) { desc.set.call(this, v); alCambiar() },
  })
}

let contador = 0

// Los paneles abiertos. UN solo listener para toda la página (una pantalla
// que redibuja sus filtros crea controles nuevos; un listener por control se
// iría acumulando): un toque afuera, en la compu, cierra el panel sin robar el
// foco. Los controles que ya no están en la página se sueltan.
const ABIERTOS = new Set()
let escuchando = false
function escucharToquesAfuera() {
  if (escuchando || typeof document === 'undefined') return
  escuchando = true
  document.addEventListener('pointerdown', (e) => {
    for (const c of [...ABIERTOS]) {
      if (!c.caja.isConnected) { ABIERTOS.delete(c); continue }
      if (!c.caja.contains(e.target)) c.cerrar({ devolverFoco: false })
    }
  }, true)
}

// crearPeriodo({ desde, hasta, id, obligatorias }) → { boton, panel, repintar, abrir, cerrar, aplicar }
// `desde` y `hasta` son los <input type="date"> que ya tiene la pantalla.
// Si ya están envueltos, devuelve el control existente (una pantalla que
// redibuja sus filtros puede llamarlo cada vez).
// `obligatorias`: la pantalla necesita las dos fechas (no sabe buscar "sin
// fechas"), así que no se ofrece "Todo" y "Elegir fechas" pide las dos.
export function crearPeriodo({ desde, hasta, id, hoy = hoyIsoAr, obligatorias = false } = {}) {
  if (!desde || !hasta) return null
  if (desde._periodo) return desde._periodo
  const base = id || (desde.id ? desde.id + '-periodo' : 'periodo-' + (++contador))
  const envD = envoltorioDe(desde), envH = envoltorioDe(hasta)

  const caja = document.createElement('div')
  caja.className = 'periodo'
  caja.innerHTML =
    `<button type="button" class="periodo__boton" id="${escPer(base)}" aria-haspopup="dialog" aria-expanded="false" aria-controls="${escPer(base)}-panel">` +
      `<span class="periodo__rotulo">Período:</span> <span class="periodo__valor" data-periodo-valor></span>` +
    `</button>` +
    `<div class="periodo__fondo" data-periodo-fondo hidden></div>` +
    `<div class="periodo__panel" id="${escPer(base)}-panel" role="dialog" aria-label="Elegir el período" hidden>` +
      `<div class="periodo__titulo">Período</div>` +
      `<div class="periodo__atajos" role="group" aria-label="Atajos">` +
        ATAJOS_PERIODO.filter(a => !(obligatorias && a.clave === 'todo')).map(a => `<button type="button" class="periodo__atajo" data-periodo-atajo="${escPer(a.clave)}" aria-pressed="false">${escPer(a.texto)}</button>`).join('') +
        `<button type="button" class="periodo__atajo" data-periodo-elegir aria-expanded="false">Elegir fechas</button>` +
      `</div>` +
      `<div class="periodo__fechas" data-periodo-fechas hidden>` +
        `<label class="periodo__campo"><span>Desde</span><input type="date" id="${escPer(base)}-desde" data-periodo-campo="desde"></label>` +
        `<label class="periodo__campo"><span>Hasta</span><input type="date" id="${escPer(base)}-hasta" data-periodo-campo="hasta"></label>` +
        `<p class="periodo__error" data-periodo-error role="alert" hidden></p>` +
        `<button type="button" class="periodo__aplicar" data-periodo-aplicar>Aplicar</button>` +
      `</div>` +
    `</div>`

  envD.parentNode.insertBefore(caja, envD)
  envD.hidden = true
  envH.hidden = true

  const boton = caja.querySelector('.periodo__boton')
  const panel = caja.querySelector('.periodo__panel')
  const fondo = caja.querySelector('[data-periodo-fondo]')
  const fechas = caja.querySelector('[data-periodo-fechas]')
  const campoD = caja.querySelector('[data-periodo-campo="desde"]')
  const campoH = caja.querySelector('[data-periodo-campo="hasta"]')
  const error = caja.querySelector('[data-periodo-error]')
  const elegir = caja.querySelector('[data-periodo-elegir]')

  function repintar() {
    const d = desde.value, h = hasta.value, hoyIso = hoy()
    const clave = claveDeRango(d, h, hoyIso)
    caja.querySelector('[data-periodo-valor]').textContent = textoDePeriodo(d, h, hoyIso)
    boton.classList.toggle('periodo__boton--activo', clave !== 'todo')
    caja.querySelectorAll('[data-periodo-atajo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.periodoAtajo === clave)))
  }

  function esHoja() { return window.innerWidth < ANCHO_HOJA_PERIODO }

  function abrir() {
    campoD.value = desde.value
    campoH.value = hasta.value
    error.hidden = true
    const aMano = claveDeRango(desde.value, hasta.value, hoy()) === 'fechas'
    fechas.hidden = !aMano
    elegir.setAttribute('aria-expanded', String(aMano))
    panel.hidden = false
    ABIERTOS.add(control)
    boton.setAttribute('aria-expanded', 'true')
    caja.classList.toggle('periodo--hoja', esHoja())
    if (esHoja()) {
      fondo.hidden = false
      panel.style.left = panel.style.top = panel.style.maxHeight = panel.style.maxWidth = ''
    } else {
      fondo.hidden = true
      ubicarPanel(panel, boton)
    }
    const marcado = panel.querySelector('[aria-pressed="true"]') || (aMano ? campoD : panel.querySelector('[data-periodo-atajo]'))
    marcado && marcado.focus()
  }

  function cerrar({ devolverFoco = true } = {}) {
    if (panel.hidden) return
    panel.hidden = true
    ABIERTOS.delete(control)
    fondo.hidden = true
    boton.setAttribute('aria-expanded', 'false')
    if (devolverFoco && boton.isConnected) boton.focus()
  }

  // Pone las fechas en los campos de la pantalla y les avisa con 'change',
  // solo a los que cambiaron: eso es lo que hacía la persona al tocarlos.
  function aplicar(d, h) {
    const cambios = []
    if (desde.value !== d) { desde.value = d; cambios.push(desde) }
    if (hasta.value !== h) { hasta.value = h; cambios.push(hasta) }
    for (const c of cambios) c.dispatchEvent(new Event('change', { bubbles: true }))
    repintar()
  }

  boton.addEventListener('click', () => { panel.hidden ? abrir() : cerrar() })
  fondo.addEventListener('click', () => cerrar())
  caja.querySelectorAll('[data-periodo-atajo]').forEach(b => b.addEventListener('click', () => {
    const r = rangoDePeriodo(b.dataset.periodoAtajo, hoy())
    cerrar()
    if (r) aplicar(r.desde, r.hasta)
  }))
  elegir.addEventListener('click', () => {
    fechas.hidden = !fechas.hidden
    elegir.setAttribute('aria-expanded', String(!fechas.hidden))
    if (!fechas.hidden) { campoD.focus(); if (!esHoja()) ubicarPanel(panel, boton) }
  })
  caja.querySelector('[data-periodo-aplicar]').addEventListener('click', () => {
    const msg = errorDeRango(campoD.value, campoH.value, { obligatorias })
    if (msg) { error.textContent = msg; error.hidden = false; return }
    cerrar()
    aplicar(campoD.value, campoH.value)
  })
  // Teclado: Escape cierra y el foco vuelve al botón; Tab no se sale del panel.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return }
    if (e.key !== 'Tab') return
    const foco = [...panel.querySelectorAll('button, input')].filter(x => !x.disabled && x.offsetParent !== null)
    if (!foco.length) return
    const primero = foco[0], ultimo = foco[foco.length - 1]
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
  })
  escucharToquesAfuera()

  vigilarValor(desde, repintar)
  vigilarValor(hasta, repintar)
  desde.addEventListener('change', repintar)
  hasta.addEventListener('change', repintar)
  const control = { boton, panel, caja, repintar, abrir, cerrar, aplicar }
  repintar()

  desde._periodo = control
  hasta._periodo = control
  return control
}
