// Sin sesión, todo módulo CORTA después de verificarSesion() (11/10/2026).
//
// El caso: gastos.html seguía de largo y leía estado.sesion.user de un null
// mientras la página ya se iba al login. El humo de navegador (e2e/0-humo) lo
// veía a veces ("Cannot read properties of null (reading 'user')"): era una
// carrera entre el error y la navegación.
//
// Regla: en cada modulos/*.html, después de `estado.sesion = await
// verificarSesion()` (que redirige al login), la línea siguiente con código
// corta: `if (!estado.sesion) return` o, en el nivel de arriba del módulo,
// `if (!estado.sesion) await new Promise(() => {})`.
// La planta (produccion.html) no redirige (pide entrar ahí mismo) y queda afuera.
//
// RAIZ_TEST cambia la carpeta (para correrla contra otro árbol).

const fs = require('fs')
const path = require('path')

const RAIZ = process.env.RAIZ_TEST || path.join(__dirname, '..')
const DIR = path.join(RAIZ, 'modulos')
let ok = 0
const fallas = []
function chk(n, c, d) { if (c) ok++; else fallas.push(n + (d !== undefined ? ' — ' + d : '')) }

let vistos = 0
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.html'))) {
  const rel = 'modulos/' + f
  const ruta = path.join(DIR, f)
  const lineas = fs.readFileSync(ruta, 'utf8').split('\n')
  if (ruta === (process.env.ARCHIVO_TEST || '')) console.log(`ARCHIVO ${ruta} (${lineas.join('\n').length} bytes)`)
  lineas.forEach((l, i) => {
    if (!/estado\.sesion = await verificarSesion\(\)\s*$/.test(l)) return
    vistos++
    const siguiente = lineas.slice(i + 1).find(x => x.trim() && !x.trim().startsWith('//')) || ''
    const corta = /^\s*if \(!estado\.sesion\) (return\b|await new Promise\(\(\) => \{\}\))/.test(siguiente)
    chk(`${rel}:${i + 1}: sin sesión corta después de verificarSesion()`, corta, siguiente.trim())
  })
}
chk('encontró los módulos que llaman a verificarSesion()', vistos >= 14, vistos)

for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${ok + fallas.length}  ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
