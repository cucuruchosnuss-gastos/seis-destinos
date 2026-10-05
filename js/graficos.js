// LOS GRÁFICOS DE LA APP (04/10/2026) — novena excepción consciente a la
// regla de duplicar: dibujar barras, líneas y donas en SVG es lo mismo en
// cualquier pantalla, y copiado en cada una serían escalas y redondeos que
// divergen en silencio. SVG PROPIO, sin librerías de afuera ni CDN.
//
// Cada función recibe datos ya calculados (la pantalla decide QUÉ se mide) y
// devuelve el SVG como texto. Ninguna inventa: un valor null no dibuja barra
// ni punto, dice "—". Los números van ESCRITOS en el gráfico, y cada dato es
// un elemento que se puede tocar (o enfocar con Tab) para ver la cifra exacta:
// lleva `data-detalle` y `activarDetalles()` la escribe debajo del gráfico.
//
// `ancho` es el de la pantalla en px (la pantalla mide su contenedor): así el
// texto se ve a su tamaño real también a 390 px, en vez de achicarse con un
// viewBox fijo.
//
// Su escape es `escGraf`.

export function escGraf(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// null, undefined, '' y lo que no es un número → null (nunca 0).
export function numeroGraf(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// 12345.6 → "12.346". Lo usa cada gráfico si la pantalla no le pasa otro.
export function formatoEntero(v) {
  const n = numeroGraf(v)
  if (n === null) return '—'
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (n < 0 && Math.round(n) !== 0 ? '−' : '') + s
}

// Un texto largo se corta con "…" para que entre en `max` caracteres.
export function cortarGraf(t, max) {
  const s = String(t ?? '')
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s
}

// Un número redondo para el tope del eje (1, 2, 2,5, 5 × 10ⁿ).
export function topeRedondo(max) {
  const m = numeroGraf(max)
  if (m === null || m <= 0) return 0
  const p = Math.pow(10, Math.floor(Math.log10(m)))
  for (const f of [1, 2, 2.5, 5, 10]) if (f * p >= m) return f * p
  return 10 * p
}

// Un decimal para las coordenadas del SVG.
function r1(n) {
  return Math.round(n * 10) / 10
}

function dato(detalle, cuerpo, etiqueta) {
  return `<g class="graf-dato" tabindex="0" role="img" aria-label="${escGraf(etiqueta ?? detalle)}" data-detalle="${escGraf(detalle)}">${cuerpo}</g>`
}

function svg(ancho, alto, titulo, cuerpo) {
  return `<svg class="graf" width="${r1(ancho)}" height="${r1(alto)}" viewBox="0 0 ${r1(ancho)} ${r1(alto)}" role="group" aria-label="${escGraf(titulo)}">${cuerpo}</svg>`
}

// ── a) Barras agrupadas ──────────────────────────────────────────────────
// grupos: [{ etiqueta, valores: { <serie>: { valor, detalle } } }]
// series: [{ clave, nombre, color }]
export function barrasAgrupadas({ grupos = [], series = [], ancho = 360, alto = 220, formato = formatoEntero, titulo = '' } = {}) {
  if (!grupos.length || !series.length) return ''
  const m = { izq: 6, der: 6, arriba: 22, abajo: 30 }
  const vals = grupos.flatMap(g => series.map(s => numeroGraf(g.valores?.[s.clave]?.valor))).filter(v => v !== null)
  const max = vals.length ? Math.max(...vals) : 0
  const altoUtil = alto - m.arriba - m.abajo
  const escala = max > 0 ? altoUtil / max : 0
  const base = alto - m.abajo
  const anchoGrupo = (ancho - m.izq - m.der) / grupos.length
  const anchoBarra = Math.max(10, Math.min(56, (anchoGrupo - 12) / series.length))
  let cuerpo = `<line class="graf-base" x1="${m.izq}" x2="${r1(ancho - m.der)}" y1="${base}" y2="${base}"/>`
  grupos.forEach((g, i) => {
    const x0 = m.izq + i * anchoGrupo + (anchoGrupo - anchoBarra * series.length) / 2
    series.forEach((s, j) => {
      const v = numeroGraf(g.valores?.[s.clave]?.valor)
      const det = g.valores?.[s.clave]?.detalle ?? `${g.etiqueta} · ${s.nombre}: ${formato(v)}`
      const x = x0 + j * anchoBarra
      const cx = x + anchoBarra / 2
      if (v === null) {
        cuerpo += dato(det, `<text class="graf-num graf-num--falta" x="${r1(cx)}" y="${base - 6}" text-anchor="middle">—</text>`)
        return
      }
      const h = Math.max(v > 0 ? 2 : 0, v * escala)
      cuerpo += dato(det,
        `<rect x="${r1(x + 1)}" y="${r1(base - h)}" width="${r1(anchoBarra - 2)}" height="${r1(h)}" rx="3" fill="${escGraf(s.color)}"/>` +
        `<text class="graf-num" x="${r1(cx)}" y="${r1(base - h - 5)}" text-anchor="middle">${escGraf(formato(v))}</text>`)
    })
    const maxCar = Math.max(3, Math.floor(anchoGrupo / 7))
    cuerpo += `<text class="graf-eje" x="${r1(m.izq + i * anchoGrupo + anchoGrupo / 2)}" y="${alto - 10}" text-anchor="middle">${escGraf(cortarGraf(g.etiqueta, maxCar))}</text>`
  })
  return svg(ancho, alto, titulo, cuerpo)
}

// ── b) Líneas ────────────────────────────────────────────────────────────
// ejeX: [{ clave, etiqueta }]   series: [{ nombre, color, valores: { <clave>: { valor, detalle } } }]
// Un valor null corta la línea (no se une un día sin datos con el siguiente).
export function lineas({ ejeX = [], series = [], ancho = 360, alto = 220, formato = formatoEntero, titulo = '' } = {}) {
  if (!ejeX.length || !series.length) return ''
  const m = { izq: 44, der: 14, arriba: 16, abajo: 28 }
  const vals = series.flatMap(s => ejeX.map(x => numeroGraf(s.valores?.[x.clave]?.valor))).filter(v => v !== null)
  if (!vals.length) return ''
  const tope = topeRedondo(Math.max(...vals)) || 1
  const altoUtil = alto - m.arriba - m.abajo
  const y = (v) => m.arriba + altoUtil - (v / tope) * altoUtil
  const paso = ejeX.length > 1 ? (ancho - m.izq - m.der) / (ejeX.length - 1) : 0
  const x = (i) => ejeX.length > 1 ? m.izq + i * paso : (ancho + m.izq - m.der) / 2
  let cuerpo = ''
  for (const f of [0, 0.5, 1]) {
    const yy = r1(y(tope * f))
    cuerpo += `<line class="graf-guia" x1="${m.izq}" x2="${r1(ancho - m.der)}" y1="${yy}" y2="${yy}"/>` +
      `<text class="graf-eje" x="${m.izq - 6}" y="${r1(yy + 4)}" text-anchor="end">${escGraf(formato(tope * f))}</text>`
  }
  const cada = Math.max(1, Math.ceil(ejeX.length / Math.max(2, Math.floor((ancho - m.izq) / 64))))
  ejeX.forEach((p, i) => {
    if (i % cada === 0 || i === ejeX.length - 1) cuerpo += `<text class="graf-eje" x="${r1(x(i))}" y="${alto - 8}" text-anchor="middle">${escGraf(p.etiqueta)}</text>`
  })
  for (const s of series) {
    let tramo = []
    const tramos = []
    ejeX.forEach((p, i) => {
      const v = numeroGraf(s.valores?.[p.clave]?.valor)
      if (v === null) { if (tramo.length) tramos.push(tramo); tramo = []; return }
      tramo.push([x(i), y(v)])
    })
    if (tramo.length) tramos.push(tramo)
    for (const t of tramos) if (t.length > 1) cuerpo += `<polyline class="graf-linea" fill="none" stroke="${escGraf(s.color)}" points="${t.map(([a, b]) => `${r1(a)},${r1(b)}`).join(' ')}"/>`
    let ultimo = null
    ejeX.forEach((p, i) => {
      const v = numeroGraf(s.valores?.[p.clave]?.valor)
      if (v === null) return
      ultimo = { i, v }
      const det = s.valores[p.clave].detalle ?? `${s.nombre} · ${p.etiqueta}: ${formato(v)}`
      cuerpo += dato(det, `<circle class="graf-toque" cx="${r1(x(i))}" cy="${r1(y(v))}" r="11"/>` +
        `<circle cx="${r1(x(i))}" cy="${r1(y(v))}" r="3.5" fill="${escGraf(s.color)}"/>`)
    })
    if (ultimo) {
      const ux = x(ultimo.i), uy = y(ultimo.v)
      const izquierda = ux > ancho - 50
      cuerpo += `<text class="graf-num" x="${r1(izquierda ? ux - 6 : ux + 6)}" y="${r1(uy - 7)}" text-anchor="${izquierda ? 'end' : 'start'}" fill="${escGraf(s.color)}">${escGraf(formato(ultimo.v))}</text>`
    }
  }
  return svg(ancho, alto, titulo, cuerpo)
}

// ── c) Barras horizontales apiladas (cada fila = 100 %) ─────────────────
// filas: [{ etiqueta, partes: { <clave>: { valor, detalle } } }]
// partes: [{ clave, nombre, color, oscuro }]  (oscuro: el texto va blanco)
export function barrasApiladas({ filas = [], partes = [], ancho = 360, titulo = '' } = {}) {
  if (!filas.length || !partes.length) return ''
  const altoFila = 52
  const alto = filas.length * altoFila
  let cuerpo = ''
  filas.forEach((f, i) => {
    const y0 = i * altoFila
    const vals = partes.map(p => Math.max(0, numeroGraf(f.partes?.[p.clave]?.valor) ?? 0))
    const total = vals.reduce((a, b) => a + b, 0)
    cuerpo += `<text class="graf-eje graf-eje--fila" x="0" y="${y0 + 14}">${escGraf(f.etiqueta)}</text>`
    if (total <= 0) {
      cuerpo += `<text class="graf-num graf-num--falta" x="0" y="${y0 + 38}">Sin horas en el período</text>`
      return
    }
    let x = 0
    partes.forEach((p, j) => {
      const v = vals[j]
      if (v <= 0) return
      const w = (v / total) * ancho
      const pct = Math.round((v / total) * 100)
      const det = f.partes[p.clave]?.detalle ?? `${f.etiqueta} · ${p.nombre}: ${pct} %`
      cuerpo += dato(det,
        `<rect x="${r1(x)}" y="${y0 + 20}" width="${r1(Math.max(1, w))}" height="26" fill="${escGraf(p.color)}"/>` +
        (w >= 34 ? `<text class="graf-num graf-num--adentro${p.oscuro ? ' graf-num--claro' : ''}" x="${r1(x + w / 2)}" y="${y0 + 38}" text-anchor="middle">${pct} %</text>` : ''),
        `${f.etiqueta} · ${p.nombre}: ${pct} %`)
      x += w
    })
  })
  return svg(ancho, alto, titulo, cuerpo)
}

// ── d) Dona ──────────────────────────────────────────────────────────────
// partes: [{ nombre, valor, color, detalle }]   centro / subcentro: el texto del medio
export function dona({ partes = [], tamano = 180, centro = '', subcentro = '', titulo = '' } = {}) {
  const vals = partes.map(p => Math.max(0, numeroGraf(p.valor) ?? 0))
  const total = vals.reduce((a, b) => a + b, 0)
  if (total <= 0) return ''
  const c = tamano / 2
  const grosor = Math.round(tamano * 0.16)
  const r = c - grosor / 2 - 2
  const largo = 2 * Math.PI * r
  let cuerpo = `<circle class="graf-pista" cx="${c}" cy="${c}" r="${r1(r)}" stroke-width="${grosor}" fill="none"/>`
  let acum = 0
  partes.forEach((p, i) => {
    const v = vals[i]
    if (v <= 0) return
    const l = (v / total) * largo
    const pct = Math.round((v / total) * 100)
    cuerpo += dato(p.detalle ?? `${p.nombre}: ${pct} %`,
      `<circle cx="${c}" cy="${c}" r="${r1(r)}" fill="none" stroke="${escGraf(p.color)}" stroke-width="${grosor}" ` +
      `stroke-dasharray="${r1(l)} ${r1(largo - l)}" stroke-dashoffset="${r1(-acum)}" transform="rotate(-90 ${c} ${c})"/>`,
      `${p.nombre}: ${pct} %`)
    acum += l
  })
  cuerpo += `<text class="graf-centro" x="${c}" y="${c + 2}" text-anchor="middle">${escGraf(centro)}</text>` +
    (subcentro ? `<text class="graf-eje" x="${c}" y="${c + 20}" text-anchor="middle">${escGraf(subcentro)}</text>` : '')
  return svg(tamano, tamano, titulo, cuerpo)
}

// ── e) Barras contra una línea de referencia ────────────────────────────
// barras: [{ etiqueta, valor, detalle, tono: 'bajo' | 'mejor' | 'medio' }]
// referencia: { valor, texto }   (la línea punteada: el promedio)
export function barrasConReferencia({ barras = [], referencia = null, ancho = 360, alto = 190, formato = formatoEntero, titulo = '' } = {}) {
  if (!barras.length) return ''
  const m = { izq: 6, der: 6, arriba: 22, abajo: 28 }
  const ref = numeroGraf(referencia?.valor)
  const vals = barras.map(b => numeroGraf(b.valor)).filter(v => v !== null)
  const max = Math.max(...vals, ref ?? 0)
  const altoUtil = alto - m.arriba - m.abajo
  const escala = max > 0 ? altoUtil / max : 0
  const base = alto - m.abajo
  const anchoCol = (ancho - m.izq - m.der) / barras.length
  const anchoBarra = Math.max(10, Math.min(48, anchoCol - 10))
  let cuerpo = `<line class="graf-base" x1="${m.izq}" x2="${r1(ancho - m.der)}" y1="${base}" y2="${base}"/>`
  barras.forEach((b, i) => {
    const v = numeroGraf(b.valor)
    const cx = m.izq + i * anchoCol + anchoCol / 2
    const det = b.detalle ?? `${b.etiqueta}: ${formato(v)}`
    if (v === null) cuerpo += dato(det, `<text class="graf-num graf-num--falta" x="${r1(cx)}" y="${base - 6}" text-anchor="middle">—</text>`)
    else {
      const h = Math.max(v > 0 ? 2 : 0, v * escala)
      const tono = ['bajo', 'mejor'].includes(b.tono) ? b.tono : 'medio'
      cuerpo += dato(det,
        `<rect class="graf-barra graf-barra--${tono}" x="${r1(cx - anchoBarra / 2)}" y="${r1(base - h)}" width="${r1(anchoBarra)}" height="${r1(h)}" rx="3"/>` +
        `<text class="graf-num" x="${r1(cx)}" y="${r1(base - h - 5)}" text-anchor="middle">${escGraf(formato(v))}</text>`)
    }
    cuerpo += `<text class="graf-eje" x="${r1(cx)}" y="${alto - 9}" text-anchor="middle">${escGraf(cortarGraf(b.etiqueta, Math.max(3, Math.floor(anchoCol / 7))))}</text>`
  })
  if (ref !== null && escala > 0) {
    const yy = r1(base - ref * escala)
    cuerpo += `<line class="graf-ref" x1="${m.izq}" x2="${r1(ancho - m.der)}" y1="${yy}" y2="${yy}"/>` +
      `<text class="graf-ref__texto" x="${r1(ancho - m.der)}" y="${r1(yy - 5)}" text-anchor="end">${escGraf(referencia.texto ?? formato(ref))}</text>`
  }
  return svg(ancho, alto, titulo, cuerpo)
}

// La leyenda de un gráfico: [{ nombre, color }] → HTML.
export function leyendaGraf(items = []) {
  if (!items.length) return ''
  return '<ul class="graf-leyenda">' + items.map(i =>
    `<li><span class="graf-leyenda__muestra" style="background:${escGraf(i.color)}" aria-hidden="true"></span>${escGraf(i.nombre)}</li>`).join('') + '</ul>'
}

// La cifra exacta al tocar: un toque (o el foco con Tab, o Enter) sobre un
// dato escribe su `data-detalle` en `salida` y lo marca. Delegado en `raiz`:
// se puede llamar una sola vez aunque los gráficos se redibujen.
export function activarDetalles(raiz, salida) {
  if (!raiz || !salida || raiz._graficosActivos) return
  raiz._graficosActivos = true
  const mostrar = (ev) => {
    const d = ev.target && ev.target.closest && ev.target.closest('.graf-dato')
    if (!d || !raiz.contains(d)) return
    raiz.querySelectorAll('.graf-dato--elegido').forEach(x => x.classList.remove('graf-dato--elegido'))
    d.classList.add('graf-dato--elegido')
    salida.textContent = d.getAttribute('data-detalle') || ''
    salida.hidden = false
  }
  raiz.addEventListener('click', mostrar)
  raiz.addEventListener('focusin', mostrar)
}
