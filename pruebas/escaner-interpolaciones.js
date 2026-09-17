// Escáner de interpolaciones de un HTML del proyecto.
//
// Tokeniza el JS de cada <script> (strings, templates, comentarios y regex) y
// devuelve TODAS las `${...}`, con la línea, la expresión y si el template en
// el que viven arma HTML.
//
// NO pela comentarios con un replace de /* */: sobre un HTML eso es inseguro
// (un accept="image/*" abre un comentario falso que se come miles de líneas).
// Acá el estado de comentario sale del tokenizador, que ya sabe distinguir un
// /* de código de una barra dentro de un string.

const fs = require('fs')

function bloquesScript(html) {
  const bloques = []
  const re = /<script\b[^>]*>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const ini = m.index + m[0].length
    const fin = html.indexOf('</script>', ini)
    if (fin === -1) throw new Error('Hay un <script> sin cerrar')
    bloques.push({ ini, fin, codigo: html.slice(ini, fin) })
    re.lastIndex = fin
  }
  return bloques
}

const ANTES_DE_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^'])

// Devuelve { templates } con cada template literal del código y sus
// interpolaciones. `nivelHtml` indica si el template está (transitivamente)
// dentro de un template que arma HTML.
function analizar(codigo, offsetGlobal, html) {
  const templates = []
  const rangos = []   // [ini, fin) de strings, templates, comentarios y regex
  // pila: { tipo: 'template', partes:[], interpolaciones:[], inicio } para templates
  //       { tipo: 'expr', llaves: n } para el ${ ... } de un template
  const pila = []
  let i = 0
  let ultimoSignificativo = ''

  const enTemplate = () => pila.length && pila[pila.length - 1].tipo === 'template'
  const templateActual = () => {
    for (let k = pila.length - 1; k >= 0; k--) if (pila[k].tipo === 'template') return pila[k]
    return null
  }

  while (i < codigo.length) {
    const c = codigo[i]
    const d = codigo[i + 1]

    if (enTemplate()) {
      const t = pila[pila.length - 1]
      if (c === '\\') { t.partes[t.partes.length - 1] += codigo.slice(i, i + 2); i += 2; continue }
      if (c === '`') {
        pila.pop()
        t.fin = i
        rangos.push([t.inicio, i + 1])
        templates.push(t)
        ultimoSignificativo = '`'
        i++
        continue
      }
      if (c === '$' && d === '{') {
        t.interpolaciones.push({ inicio: i + 2, template: t })
        t.partes.push('')
        pila.push({ tipo: 'expr', llaves: 0, template: t, idx: t.interpolaciones.length - 1 })
        i += 2
        ultimoSignificativo = '{'
        continue
      }
      t.partes[t.partes.length - 1] += c
      i++
      continue
    }

    // --- contexto de código ---
    if (c === '/' && d === '/') { const n = codigo.indexOf('\n', i); const f = n === -1 ? codigo.length : n; rangos.push([i, f]); i = f; continue }
    if (c === '/' && d === '*') { const n = codigo.indexOf('*/', i + 2); if (n === -1) throw new Error('comentario /* sin cerrar'); rangos.push([i, n + 2]); i = n + 2; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < codigo.length) {
        if (codigo[j] === '\\') { j += 2; continue }
        if (codigo[j] === c) break
        j++
      }
      rangos.push([i, j + 1])
      i = j + 1
      ultimoSignificativo = 'x'
      continue
    }
    if (c === '`') {
      const t = { tipo: 'template', partes: [''], interpolaciones: [], inicio: i, padre: templateActual() }
      pila.push(t)
      i++
      continue
    }
    if (c === '/') {
      // ¿regex o división? Decide el último carácter significativo.
      if (ANTES_DE_REGEX.has(ultimoSignificativo) || ultimoSignificativo === '') {
        let j = i + 1, clase = false
        while (j < codigo.length) {
          const e = codigo[j]
          if (e === '\\') { j += 2; continue }
          if (e === '[') clase = true
          else if (e === ']') clase = false
          else if (e === '/' && !clase) break
          else if (e === '\n') throw new Error('regex sin cerrar en offset ' + i)
          j++
        }
        j++
        while (j < codigo.length && /[a-z]/.test(codigo[j])) j++
        rangos.push([i, j])
        i = j
        ultimoSignificativo = 'x'
        continue
      }
      i++
      ultimoSignificativo = '/'
      continue
    }
    if (c === '{') {
      const top = pila[pila.length - 1]
      if (top && top.tipo === 'expr') top.llaves++
      i++; ultimoSignificativo = '{'; continue
    }
    if (c === '}') {
      const top = pila[pila.length - 1]
      if (top && top.tipo === 'expr') {
        if (top.llaves === 0) {
          const interp = top.template.interpolaciones[top.idx]
          interp.fin = i
          interp.expr = codigo.slice(interp.inicio, i)
          pila.pop()
          i++; ultimoSignificativo = '}'; continue
        }
        top.llaves--
      }
      i++; ultimoSignificativo = '}'; continue
    }
    if (!/\s/.test(c)) ultimoSignificativo = c
    i++
  }

  if (pila.length) throw new Error('quedó algo abierto al final del script: ' + pila[pila.length - 1].tipo)

  // Línea de cada interpolación, contra el HTML completo.
  const lineaDe = (off) => html.slice(0, offsetGlobal + off).split('\n').length

  const salida = []
  for (const t of templates) {
    t.esHtmlPropio = t.partes.some(p => /<[a-zA-Z/!]/.test(p))
  }
  const esHtml = (t) => {
    let cur = t
    while (cur) { if (cur.esHtmlPropio) return true; cur = cur.padre }
    return false
  }
  for (const t of templates) {
    t.interpolaciones.forEach((it, k) => {
      salida.push({
        linea: lineaDe(it.inicio),
        expr: it.expr,
        html: esHtml(t),
        htmlPropio: t.esHtmlPropio,
        // TODO el texto literal del template que va ANTES de esta
        // interpolación, no solo el pedazo desde la anterior: es lo que dice en
        // qué contexto del HTML cae (contenido, atributo entre comillas,
        // atributo sin comillas, manejador de evento). Las interpolaciones
        // anteriores se reemplazan por un marcador para no desbalancear el
        // conteo de comillas.
        antes: t.partes.slice(0, k + 1).join(''),
      })
    })
  }
  salida.sort((a, b) => a.linea - b.linea)

  // --- asignaciones directas a innerHTML / outerHTML / insertAdjacentHTML ---
  // NO se cuentan: se clasifica cada una. Una assertion de conteo exacto se
  // rompe sola con cualquier cambio y después nadie sabe si fue una regresión
  // de seguridad o alguien que sumó un render.
  const enRango = (off) => rangos.some(([a, b]) => off >= a && off < b)
  const asignaciones = []
  const reSink = /\.(innerHTML|outerHTML)\s*=(?!=)|insertAdjacentHTML\s*\(/g
  let mm
  while ((mm = reSink.exec(codigo)) !== null) {
    if (enRango(mm.index)) continue
    const desde = mm.index + mm[0].length
    // Cortes candidatos en orden creciente: cada ';' y cada salto de línea. El
    // PRIMERO que parsea es la expresión asignada. Sin esto, un
    // `x.innerHTML = '…'; return }` se comía las líneas siguientes hasta que
    // algo parseaba, y la expresión reportada no era la asignada.
    const cortes = []
    for (let k = desde; k < Math.min(codigo.length, desde + 4000); k++) {
      if (codigo[k] === ';' || codigo[k] === '\n') cortes.push(k)
    }
    let expr = null
    for (const k of cortes) {
      const txt = codigo.slice(desde, k)
      if (!txt.trim()) continue
      try { new Function(`return (${txt})`); expr = txt; break } catch { /* sigue */ }
    }
    asignaciones.push({ linea: lineaDe(mm.index), expr: (expr ?? codigo.slice(desde, desde + 120)).trim() })
  }

  return { interpolaciones: salida, asignaciones }
}

function interpolaciones(rutaHtml) {
  const html = fs.readFileSync(rutaHtml, 'utf8')
  const out = [], asig = []
  for (const b of bloquesScript(html)) {
    const r = analizar(b.codigo, b.ini, html)
    out.push(...r.interpolaciones); asig.push(...r.asignaciones)
  }
  return { interpolaciones: out, asignaciones: asig }
}

module.exports = { interpolaciones, bloquesScript }

if (require.main === module) {
  const ruta = process.argv[2]
  const { interpolaciones: todas, asignaciones } = interpolaciones(ruta)
  console.log('TOTAL', todas.length, '| en HTML', todas.filter(x => x.html).length, '| sinks directos', asignaciones.length)
  for (const a of asignaciones) console.log(`SINK ${String(a.linea).padStart(4)}  ${a.expr.replace(/\s+/g, ' ').slice(0, 140)}`)
  for (const x of todas) {
    console.log(`${x.html ? 'HTML' : '----'} ${String(x.linea).padStart(4)}  ${x.expr.replace(/\s+/g, ' ').slice(0, 150)}`)
  }
}
