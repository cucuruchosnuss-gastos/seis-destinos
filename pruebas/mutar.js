// Runner de mutaciones genérico, para las suites del circuito.
//
// Dos clases de mutación:
//  - AUTOMÁTICAS: cada `${esc(...)}` dentro de las funciones nombradas pierde
//    su esc(). Exigen que la suite se ponga en ROJO.
//  - A MANO: reemplazos de comportamiento (una condición, un parámetro de RPC)
//    que cada mut-*.js declara con su nombre.
//
// Los tres guards del runner de Cobranzas, por los mismos bugs documentados:
//  - Si la suite NO está verde sobre el archivo limpio, las mutaciones no
//    miden nada (toda mutación se reportaría "detectada"). Se aborta.
//  - Cada mutación necesita un ANCLA ÚNICA en el archivo. La automática agranda
//    el contexto hasta conseguirla; la de a mano, si no es única, aborta
//    nombrándola en vez de mutar el renglón equivocado.
//  - Una mutación que no cambia el archivo es un ERROR DEL TEST, nunca
//    cobertura. Y el sub-proceso informa cuántos caracteres leyó, para que el
//    runner confirme que leyó el mutado y no el limpio.
//
// Las mutaciones corren DE A UNA, nunca superpuestas: execFileSync espera a
// que termine cada sub-proceso antes de escribir la siguiente.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { interpolaciones } = require('./escaner-interpolaciones')
const { rangosDeFunciones } = require('./circuito-comun')

function correrMutaciones({ suite, original, funciones, escape = 'esc', manuales = [], equivalentes = [] }) {
  const src = fs.readFileSync(original, 'utf8')
  const TMP = path.join(__dirname, `mut-tmp-${path.basename(suite, '.js')}.html`)

  function correr(archivo) {
    try {
      const salida = execFileSync(process.execPath, [suite], {
        encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: archivo }, stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { rojo: false, salida }
    } catch (err) {
      return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') }
    }
  }

  // ── Guard 1 ─────────────────────────────────────────────────────────────
  const limpio = correr(original)
  if (limpio.rojo) {
    console.log('ABORTADO: la suite NO está verde sobre el archivo limpio, así que las mutaciones no medirían nada.')
    console.log(limpio.salida)
    process.exit(2)
  }
  console.log('Suite sobre el limpio:', limpio.salida.trim().split('\n').pop())

  function unica(texto, aguja) {
    let c = 0, d = 0, k
    while ((k = texto.indexOf(aguja, d)) !== -1) { c++; d = k + 1; if (c > 1) break }
    return c === 1
  }

  // ── Automáticas: sacar cada esc() de las funciones nuevas ───────────────
  const rangos = rangosDeFunciones(src, funciones, (n, ok, det) => { if (!ok) { console.log('ABORTADO:', n, det); process.exit(2) } })
  const { interpolaciones: todas } = interpolaciones(original)
  const lineas = src.split('\n')
  const mutaciones = []
  const ambiguas = []
  for (const x of todas) {
    if (!x.html || !rangos.some(r => x.linea >= r.desde && x.linea <= r.hasta)) continue
    if (!x.expr.trim().startsWith(escape + '(')) continue
    const aguja = '${' + x.expr + '}'
    const offsetLinea = lineas.slice(0, x.linea - 1).join('\n').length + (x.linea > 1 ? 1 : 0)
    const idx = src.indexOf(aguja, Math.max(0, offsetLinea - 200))
    if (idx === -1) { ambiguas.push(`línea ${x.linea}: no se encontró «${aguja.slice(0, 60)}»`); continue }
    let ancla = null
    for (let extra = 0; extra < 400 && !ancla; extra += 10) {
      const t = src.slice(Math.max(0, idx - extra), Math.min(src.length, idx + aguja.length + extra))
      if (unica(src, t)) ancla = t
    }
    if (!ancla) { ambiguas.push(`línea ${x.linea}: sin ancla única`); continue }
    const sinEsc = '${' + x.expr.trim().replace(new RegExp('^' + escape + '\\('), '(') + '}'
    const eq = equivalentes.find(e => e.expr === x.expr.trim())
    mutaciones.push({
      nombre: `línea ${x.linea}: sin ${escape}() en ${x.expr.trim().slice(0, 70)}`,
      mutado: src.replace(ancla, ancla.replace(aguja, sinEsc)),
      equivalente: eq?.motivo,
    })
  }

  // ── A mano ──────────────────────────────────────────────────────────────
  for (const m of manuales) {
    if (!unica(src, m.de)) { ambiguas.push(`«${m.nombre}»: el texto a reemplazar ${src.includes(m.de) ? 'NO ES ÚNICO' : 'NO EXISTE'}`); continue }
    mutaciones.push({ nombre: m.nombre, mutado: src.replace(m.de, m.a) })
  }

  if (ambiguas.length) {
    console.log('ABORTADO: mutaciones sin ancla única (mutarían el renglón equivocado):')
    for (const a of ambiguas) console.log('  ' + a)
    process.exit(2)
  }

  // ── Correr, de a una ────────────────────────────────────────────────────
  let detectadas = 0
  const escaparon = [], equivs = [], errores = []
  for (const m of mutaciones) {
    if (m.mutado === src) { errores.push(`${m.nombre}: la mutación no cambió nada`); continue }
    fs.writeFileSync(TMP, m.mutado)
    const r = correr(TMP)
    const leido = (r.salida.match(/ARCHIVO .* \((\d+) bytes\)/) || [])[1]
    if (Number(leido) !== m.mutado.length) { errores.push(`${m.nombre}: el sub-proceso leyó ${leido} y se escribieron ${m.mutado.length}`); continue }
    if (m.equivalente) { equivs.push(`${m.nombre} — ${m.equivalente}${r.rojo ? ' (igual dio rojo)' : ''}`); continue }
    if (r.rojo) detectadas++
    else escaparon.push(m.nombre)
  }
  try { fs.unlinkSync(TMP) } catch { /* no estaba */ }

  const total = mutaciones.length - equivs.length - errores.length
  for (const e of escaparon) console.log('  ESCAPÓ: ' + e)
  for (const e of errores) console.log('  ERROR DEL TEST: ' + e)
  for (const e of equivs) console.log('  equivalente: ' + e)
  console.log(`${detectadas}/${total} mutaciones detectadas${equivs.length ? ` (+${equivs.length} equivalentes, aparte)` : ''}`)
  process.exit(escaparon.length || errores.length ? 1 : 0)
}

module.exports = { correrMutaciones }
