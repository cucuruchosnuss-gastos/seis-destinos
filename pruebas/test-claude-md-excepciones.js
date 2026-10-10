// Las excepciones a la regla de duplicar helpers (CLAUDE.md, Arquitectura)
// van numeradas una sola vez cada número y sin saltos (08/10/2026: hubo dos
// "octava excepción" sin que nada avisara). Y cuando un archivo de js/ dice su
// número en el encabezado, tiene que ser el mismo que en CLAUDE.md.
//
//   node pruebas/test-claude-md-excepciones.js
//
// Una excepción nueva: el ordinal que sigue en CLAUDE.md (ORDINALES llega a
// la vigésima; si hace falta más, se agrega).

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'CLAUDE.md')
const md = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${md.length} bytes)`)   // mutar.js lee esta línea

const ORDINALES = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima',
  'undécima', 'duodécima', 'decimotercera', 'decimocuarta', 'decimoquinta', 'decimosexta', 'decimoséptima', 'decimoctava',
  'decimonovena', 'vigésima']

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

// Los títulos: "- **<Tema> — <ordinal> excepción consciente a la regla …".
const re = /^- \*\*(.+?) — (\S+) excepción consciente a la regla/gm
const titulos = [...md.matchAll(re)].map(m => ({ tema: m[1], ordinal: m[2].toLowerCase() }))
chk('hay excepciones numeradas (si da cero, el título cambió de forma)', titulos.length >= 10, titulos.length)
const numeros = titulos.map(t => ORDINALES.indexOf(t.ordinal) + 1)
chk('todo ordinal es conocido', numeros.every(n => n > 0), JSON.stringify(titulos.filter((t, i) => numeros[i] === 0)))
const repetidos = numeros.filter((n, i) => numeros.indexOf(n) !== i)
chk('ningún número se repite', repetidos.length === 0, repetidos.map(n => ORDINALES[n - 1]).join(', '))
chk('van de la primera en adelante, sin saltos y en orden', numeros.every((n, i) => n === i + 1), numeros.join(','))

// El encabezado de cada archivo de js/ que dice su número, contra CLAUDE.md.
const dir = path.join(RAIZ, 'js')
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const txt = fs.readFileSync(path.join(dir, f), 'utf8')
  for (const m of txt.matchAll(/\b(\S+) excepci[oó]n consciente a la/gi)) {
    const ord = m[1].toLowerCase()
    if (!ORDINALES.includes(ord)) continue
    const t = titulos.find(x => x.ordinal === ord)
    // La excepción de ese número tiene que nombrar al archivo en su bloque
    // (del título hasta el título de la excepción siguiente).
    const i = t ? titulos.indexOf(t) : -1
    const desde = i < 0 ? -1 : md.indexOf(`- **${t.tema} — ${t.ordinal} `)
    const sig = titulos[i + 1]
    const hasta = sig ? md.indexOf(`- **${sig.tema} — ${sig.ordinal} `) : desde + 20000
    const bloque = desde < 0 ? '' : md.slice(desde, hasta)
    chk(`js/${f} dice "${ord}" y es la de CLAUDE.md que lo nombra`, bloque.includes(`js/${f}`), t ? t.tema : 'no hay ninguna con ese número')
  }
}

console.log(`\n${ok}/${ok + fallas.length}  ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
