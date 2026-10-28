// Cada spec de e2e/ con su número propio, y el script que dice el siguiente
// (spec-numero.js, npm run spec:numero). 28/10/2026.
//
//   node pruebas/test-navegador-numeros.js

const fs = require('fs')
const path = require('path')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, 'spec-numero.js')
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
// Node carga como JavaScript un archivo de extensión desconocida (el mut-tmp-*.html).
const { numeroDe, repetidos, siguiente, specsDe } = require(ARCHIVO)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

// ── Las piezas, con datos armados ────────────────────────────────────────
chk('el número de un spec', numeroDe('27-ampliar.spec.js') === 27)
chk('… también en una subcarpeta', numeroDe('sub/8-x.spec.js') === 8)
chk('un spec sin número no tiene', numeroDe('detalles-dispositivos.spec.js') === null)
chk('… ni uno que tiene un número adentro del nombre', numeroDe('planta-390.spec.js') === null)
chk('… ni un archivo que no es spec', numeroDe('27-ayuda.js') === null)
const armados = ['0-humo.spec.js', '9-a.spec.js', '27-a.spec.js', '27-b.spec.js', '27-c.spec.js', '30-x.spec.js', '300-y.spec.js', 'sin-numero.spec.js', 'otro-sin.spec.js']
const rep = repetidos(armados)
chk('encuentra el número repetido, con todos los que lo comparten', rep.size === 1 && JSON.stringify(rep.get(27)) === '["27-a.spec.js","27-b.spec.js","27-c.spec.js"]', JSON.stringify([...rep]))
chk('30 no es 300', !rep.has(30) && !rep.has(300))
chk('los sin número no son repetidos entre ellos', !rep.has(null) && !rep.has(NaN))
chk('el siguiente es el más alto + 1 (no el primer hueco)', siguiente(armados) === 301, siguiente(armados))
chk('… comparando números, no texto (9 < 27)', siguiente(['9-a.spec.js', '27-b.spec.js']) === 28)
chk('sin specs numerados, el 1', siguiente(['humo.spec.js']) === 1)

// ── El repo de verdad ─────────────────────────────────────────────────────
const specs = specsDe()
chk('hay specs en e2e/', specs.length > 50, specs.length)
chk('specsDe lee los *.spec.js de e2e/', specs.every(s => s.endsWith('.spec.js')) && specs.includes('0-humo.spec.js'))
const reales = repetidos(specs)
chk('NINGÚN número de spec repetido (npm run spec:numero dice el siguiente libre)', reales.size === 0,
  [...reales].map(([n, l]) => `${n}: ${l.join(', ')}`).join(' | '))
const sig = siguiente(specs)
chk('el siguiente no lo usa ningún spec', !specs.some(s => numeroDe(s) === sig), sig)

// ── npm run spec:numero ───────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
chk('npm run spec:numero corre spec-numero.js', pkg.scripts['spec:numero'] === 'node pruebas/spec-numero.js', pkg.scripts['spec:numero'])

console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
process.exit(fallas.length ? 1 : 0)
