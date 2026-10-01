// Ningún id se repite en el HTML ESTÁTICO de una pantalla (01/10/2026).
//
// getElementById devuelve el PRIMERO: con dos elementos con el mismo id, el
// código del segundo escribe en el primero y no da ningún error. Caso real:
// el buscador de la cobranza ya asentada nació como "cob-buscar-cliente", el
// mismo id del buscador del listado; las suites (con un DOM falso) daban
// verde y en el navegador el buscador nuevo no funcionaba. Lo vio el
// recorrido de la maqueta.
//
// Mira solo el HTML fuera de <script> y <style> (lo que el navegador arma al
// cargar). Los ids de las plantillas del JS no entran: se dibujan de a uno.
//
//   node pruebas/test-ids-unicos.js
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const RAIZ = path.join(__dirname, '..')
const archivos = process.env.ARCHIVO_TEST
  ? [process.env.ARCHIVO_TEST]
  : execSync('git ls-files "*.html"', { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean).map(f => path.join(RAIZ, f))

let ok = 0
const fallas = []
for (const archivo of archivos) {
  const html = fs.readFileSync(archivo, 'utf8')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const vistos = new Map()
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) vistos.set(m[1], (vistos.get(m[1]) ?? 0) + 1)
  const repetidos = [...vistos].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`)
  if (repetidos.length) fallas.push(`${path.relative(RAIZ, archivo)}: ${repetidos.join(', ')}`)
  else ok++
}
for (const f of fallas) console.log('  ✗', f)
console.log(`${ok}/${archivos.length} ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
