// El número de un spec nuevo de e2e/ (28/10/2026, ensayo-confiable).
//
//   npm run spec:numero        → dice el número siguiente libre (el más alto + 1)
//
// Cada spec numerado (e2e/<n>-<tema>.spec.js) tiene un número propio:
// pruebas/test-navegador-numeros.js da rojo si dos lo comparten. Pasó con el
// 25 al 32, el 53, el 54 y el 70 al 72 (dos o más sesiones a la vez tomaron el
// mismo "siguiente"); se renumeraron el 28/10/2026. El siguiente es el más alto
// + 1 y no un hueco: los huecos son de specs de ramas que no se integraron y
// pueden volver. Dos sesiones a la vez pueden pedir el mismo número igual: la
// prueba lo frena en el ensayo, y la segunda en integrar renumera el suyo.
'use strict'
const fs = require('fs')
const path = require('path')

const E2E = path.join(__dirname, '..', 'e2e')

// El número de un spec (por su nombre de archivo), o null si no tiene.
function numeroDe(spec) {
  const m = path.posix.basename(spec).match(/^(\d+)-[^/]*\.spec\.js$/)
  return m ? Number(m[1]) : null
}

// Map número → specs, solo los números que tienen más de un spec.
function repetidos(specs) {
  const por = new Map()
  for (const s of specs) {
    const n = numeroDe(s)
    if (n === null) continue
    if (!por.has(n)) por.set(n, [])
    por.get(n).push(s)
  }
  return new Map([...por].filter(([, l]) => l.length > 1).sort((a, b) => a[0] - b[0]))
}

// El número que le toca al próximo spec.
function siguiente(specs) {
  const nums = specs.map(numeroDe).filter(n => n !== null)
  return nums.length ? Math.max(...nums) + 1 : 1
}

function specsDe(dir = E2E) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.spec.js')).sort()
}

if (require.main === module) {
  const specs = specsDe()
  const rep = repetidos(specs)
  for (const [n, l] of rep) console.log(`OJO: el ${n} lo comparten ${l.join(', ')}`)
  console.log(`El próximo spec es el ${siguiente(specs)}: e2e/${siguiente(specs)}-<tema>.spec.js`)
}

module.exports = { numeroDe, repetidos, siguiente, specsDe }
