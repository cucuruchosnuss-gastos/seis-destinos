// NINGÚN CONTROL SE PIERDE en modulos/cobranzas.html.
//
// Existe para el rediseño visual de Cobranzas (septiembre 2026): cambiar
// estilos y reacomodar el HTML es exactamente la clase de trabajo donde un
// botón, un id o un data-* desaparece sin que nada se queje — el JS que lo
// buscaba hace `?.` o un querySelectorAll vacío y la pantalla sigue andando
// sin esa acción.
//
// Lista, del archivo BASELINE y del actual:
//   - cada id (HTML estático y plantillas del <script>);
//   - cada atributo data-* (todos, no solo los que disparan acciones: es un
//     superconjunto a propósito, así no hay que decidir a mano cuál "cuenta");
//   - cada control interactivo (button, input, select, textarea, a), con una
//     clave que NO depende de clases ni de estilos: id, nombres de data-*,
//     type, name, href; y si no tiene nada de eso, su texto literal.
// Y compara CANTIDADES: todo lo que estaba tiene que seguir estando, al menos
// las mismas veces. Si falta uno, ROJO nombrándolo. Lo nuevo se permite y se
// lista.
//
// Además, sobre el archivo actual: cada getElementById('x'), querySelector
// con '#x' o '[data-x]' y cada `.dataset.x` literal tiene que apuntar a un id
// o un data-* que exista. Un id renombrado en el HTML y no en el JS no rompe
// nada visible: la acción simplemente deja de estar.
//
// Las plantillas del <script> se leen con el tokenizador de
// escaner-interpolaciones.js: el texto literal de cada template (con las
// interpolaciones reemplazadas por un marcador) y el contenido de cada string.
// Los comentarios NO cuentan: sacar un comentario no es perder un control.
//
// Baseline: el commit FIJO de abajo, NUNCA HEAD (ver pruebas/README.md).
// Overrides: ARCHIVO_TEST (archivo bajo prueba) y ARCHIVO_BASE (un archivo
// ya extraído que reemplaza al `git show` del baseline).
//
// RENOMBRADOS: si una sub-parte del rediseño cambia A PROPÓSITO el texto de un
// control sin id ni data-*, el mapeo va acá, explícito, y la salida lo lista.
// No es una puerta para tapar un rojo: cada entrada tiene que decir por qué.
//
// LISTAR=1 imprime el inventario completo del archivo actual.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { bloquesScript, analizar } = require('./escaner-interpolaciones')

const BASE_COMMIT = 'fba6396'
const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')

// clave vieja → clave nueva, con el motivo. Hoy vacío.
const RENOMBRADOS = {
  // 'button{Texto viejo}': { nueva: 'button{Texto nuevo}', motivo: '…' },
}

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

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

try {
  const actual = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`LEIDO:${actual.length} de ${ARCHIVO}`)
  const base = leerBaseline()
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/cobranzas.html'}`)

  const B = inventario(base)
  const A = inventario(actual)

  chk('el baseline tiene controles (si da cero, el inventario no está leyendo nada)',
    [...B.cuenta.keys()].filter(k => k.startsWith('control:')).length > 20)
  chk('el baseline tiene ids', B.ids.size > 50, B.ids.size)

  // 1. Todo lo del baseline sigue estando, al menos las mismas veces.
  const nuevosRenombres = []
  for (const [k, n] of [...B.cuenta.entries()].sort()) {
    let clave = k
    const ren = RENOMBRADOS[k.replace(/^control:/, '')]
    if (ren) { clave = 'control:' + ren.nueva; nuevosRenombres.push(`${k} → ${clave} (${ren.motivo})`) }
    const m = A.cuenta.get(clave) || 0
    chk(`sigue estando ${clave}`, m >= n, m === 0 ? `FALTA (estaba ${n} ${n === 1 ? 'vez' : 'veces'})` : `aparece ${m} y estaba ${n}`)
  }

  // 2. Las referencias literales del JS apuntan a algo que existe.
  for (const r of referenciasDelJs(A.referencias)) {
    const existe = r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor)
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe`, existe, `referencia sin destino: ${r.como}`)
  }

  const nuevos = [...A.cuenta.entries()].filter(([k, n]) => n > (B.cuenta.get(k) || 0))
  if (nuevosRenombres.length) {
    console.log('RENOMBRADOS declarados:')
    for (const x of nuevosRenombres) console.log('  ' + x)
  }
  if (nuevos.length) {
    console.log(`NUEVO respecto de ${BASE_COMMIT} (se permite, se lista):`)
    for (const [k, n] of nuevos) console.log(`  + ${k} (${B.cuenta.get(k) || 0} → ${n})`)
  }
  console.log(`inventario: ${[...A.cuenta.keys()].filter(k => k.startsWith('control:')).length} claves de control, ${A.ids.size} ids, ${A.datas.size} data-*`)

  if (process.env.LISTAR) {
    for (const [k, n] of [...A.cuenta.entries()].sort()) console.log(`  ${n} ${k}`)
  }
  for (const f of fallas) console.log('FALLA ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
} catch (e) {
  console.log('ERROR ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
}
