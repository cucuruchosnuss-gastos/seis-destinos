// Lo común a los dos chequeos de controles: controles-cobranzas.js y
// controles-cheques.js (22/09/2026, cuando la cartera de cheques se mudó de
// modulos/cobranzas.html a modulos/cheques.html). Ver el encabezado de
// controles-cobranzas.js para qué se inventaría y por qué.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { bloquesScript, analizar } = require('./escaner-interpolaciones')

// El baseline de los dos chequeos: el mismo commit fijo, NUNCA HEAD.
const BASE_COMMIT = 'fba6396'
const RAIZ = path.join(__dirname, '..')

const MARCA = '\u0001'
const CONTROLES = new Set(['button', 'input', 'select', 'textarea', 'a'])

function leerBaseline() {
  if (process.env.ARCHIVO_BASE) return fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
  return execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cobranzas.html`], {
    cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  })
}

function desescapar(s) {
  return s.replace(/\\(.)/gs, (_, c) => ({ n: '\n', t: '\t', r: '' })[c] ?? c)
}

// Pedazos de "markup": el HTML estático (sin el contenido de los <script> ni
// los comentarios HTML), el texto literal de cada template y cada string.
// También devuelve el código de cada script SIN strings/templates/comentarios,
// para buscar las referencias (getElementById, dataset…).
function fragmentos(html) {
  const bloques = bloquesScript(html)
  let estatico = ''
  let desde = 0
  for (const b of bloques) { estatico += html.slice(desde, b.ini) + '\n'; desde = b.fin }
  estatico += html.slice(desde)
  estatico = estatico.replace(/<!--[\s\S]*?-->/g, '')
  // El CSS no tiene controles, pero sus COMENTARIOS pueden nombrar uno
  // ("ya no es un <select> del sistema") y el inventario lo tomaba como una
  // etiqueta: un control fantasma que después "faltaba". Se saca el <style>.
  estatico = estatico.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')

  const markup = [estatico]
  const referencias = []   // { codigo, strings } por bloque
  for (const b of bloques) {
    const r = analizar(b.codigo, b.ini, html)
    for (const t of r.templates) markup.push(t.partes.join(MARCA))
    const strings = []
    for (const [a, z] of r.rangos) {
      const q = b.codigo[a]
      if (q === "'" || q === '"') {
        const s = desescapar(b.codigo.slice(a + 1, z - 1))
        markup.push(s)
        strings.push({ a, z, s })
      }
    }
    referencias.push({ codigo: b.codigo, rangos: r.rangos, templates: r.templates })
  }
  return { markup, referencias }
}

// Atributos de una etiqueta abierta: nombre → valor (o null si no tiene).
function atributos(txt) {
  const out = []
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*|\u0001)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g
  let m
  while ((m = re.exec(txt)) !== null) {
    if (m[1] === MARCA) continue
    const v = m[3] ?? m[4] ?? (m[2] && !/^["']/.test(m[2]) ? m[2] : null)
    out.push([m[1].toLowerCase(), v ?? null])
  }
  return out
}

function literal(v) { return v != null && !v.includes(MARCA) }

function inventario(html) {
  const { markup, referencias } = fragmentos(html)
  const cuenta = new Map()
  const suma = (k) => cuenta.set(k, (cuenta.get(k) || 0) + 1)
  const ids = new Set()
  const datas = new Set()

  for (const frag of markup) {
    // Etiquetas de apertura. El final de la etiqueta es el primer '>' que no
    // está entre comillas; en un string que se corta a mitad de etiqueta
    // ('<option value="' + x + '">') se toma hasta el final del pedazo.
    const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b/g
    let m
    while ((m = re.exec(frag)) !== null) {
      let j = re.lastIndex, q = null
      for (; j < frag.length; j++) {
        const c = frag[j]
        if (q) { if (c === q) q = null; continue }
        if (c === '"' || c === "'") { q = c; continue }
        if (c === '>') break
      }
      const tag = m[1].toLowerCase()
      const attrs = atributos(frag.slice(re.lastIndex, j))
      const texto = frag.slice(j + 1).split('<')[0].replace(/\s+/g, ' ').trim()

      let id = null
      const nombresData = []
      for (const [n, v] of attrs) {
        if (n === 'id') {
          id = literal(v) ? v : (v ? v.split(MARCA)[0] + '*' : null)
          if (id) { ids.add(id); suma(`id:${id}`) }
        } else if (n.startsWith('data-')) {
          nombresData.push(n)
          datas.add(n)
          suma(`data:${n}`)
        }
      }

      if (CONTROLES.has(tag)) {
        const get = (n) => { const a = attrs.find(x => x[0] === n); return a ? a[1] : undefined }
        let clave = tag
        if (id) clave += `#${id}`
        if (nombresData.length) clave += nombresData.sort().map(n => `[${n}]`).join('')
        const type = get('type'); if (literal(type)) clave += `[type=${type}]`
        const name = get('name'); if (literal(name)) clave += `[name=${name}]`
        const href = get('href'); if (literal(href)) clave += `[href=${href}]`
        if (clave === tag || (tag !== 'input' && !id && !nombresData.length)) {
          // Sin identidad propia: el texto literal es lo único que lo nombra.
          // Un texto con interpolaciones se recorta a su parte fija.
          const t = texto.split(MARCA).join('…')
          if (t) clave += `{${t}}`
        }
        suma(`control:${clave}`)
      }
      re.lastIndex = j
    }
  }
  return { cuenta, ids, datas, referencias }
}

// Referencias literales del JS a ids y data-*.
function referenciasDelJs(referencias) {
  const out = []
  const aKebab = (s) => 'data-' + s.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
  for (const { codigo, rangos } of referencias) {
    const enComentario = (off) => rangos.some(([a, z]) => off >= a && off < z && codigo[a] === '/' &&
      (codigo[a + 1] === '/' || codigo[a + 1] === '*'))
    let m
    const reId = /getElementById\(\s*(['"])([^'"]+)\1\s*\)/g
    while ((m = reId.exec(codigo)) !== null) if (!enComentario(m.index)) out.push({ tipo: 'id', valor: m[2], como: m[0] })
    const reQs = /querySelector(?:All)?\(\s*(['"`])((?:(?!\1).)*)\1/g
    while ((m = reQs.exec(codigo)) !== null) {
      if (enComentario(m.index)) continue
      const sel = m[2]
      if (sel.includes('${')) {
        // Sólo la parte fija: `[data-${attr}]` no se puede resolver.
        for (const d of sel.matchAll(/\[(data-[a-z0-9-]+)(?=[\]=])/g)) out.push({ tipo: 'data', valor: d[1], como: m[0] })
        for (const d of sel.matchAll(/#([A-Za-z][\w-]*)(?![\w-]*\$)/g)) out.push({ tipo: 'id', valor: d[1], como: m[0] })
        continue
      }
      for (const d of sel.matchAll(/#([A-Za-z][\w-]*)/g)) out.push({ tipo: 'id', valor: d[1], como: m[0] })
      for (const d of sel.matchAll(/\[(data-[a-z0-9-]+)/g)) out.push({ tipo: 'data', valor: d[1], como: m[0] })
    }
    const reDs = /\.dataset\.([a-zA-Z0-9]+)/g
    while ((m = reDs.exec(codigo)) !== null) if (!enComentario(m.index)) out.push({ tipo: 'data', valor: aKebab(m[1]), como: m[0] })
  }
  return out
}


// Cuántas veces está una clave del inventario.
function veces(inv, clave) { return inv.cuenta.get(clave) || 0 }

module.exports = { BASE_COMMIT, RAIZ, leerBaseline, inventario, referenciasDelJs, veces, MARCA }
