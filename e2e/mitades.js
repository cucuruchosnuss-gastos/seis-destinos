// Las dos mitades del trabajo "Navegador" de GitHub (14/10/2026).
//
// Con un solo trabajo, Playwright tardaba ~22 de los 30 minutos de tope y
// cualquier traba lo cortaba. Ahora .github/workflows/navegador.yml corre DOS
// trabajos a la vez, cada uno con E2E_MITAD=1 o E2E_MITAD=2, y
// playwright.config.js le pide a este archivo qué specs le tocan.
//
// EL REPARTO ES AUTOMÁTICO (28/10/2026, ensayo-confiable). Antes la mitad 1 era
// una lista a mano y cada spec nuevo obligaba a mover otros para que ninguna
// mitad pasara del 55 %: trabó tres integraciones. Ahora repartir() arma las
// dos con los segundos de e2e/tiempos-navegador.json (medidos en GitHub; se
// refrescan con `npm run tiempos:navegador`): el spec más largo primero, a la
// mitad que va más liviana. Un spec sin medir cuenta TIEMPO_SIN_MEDIR.
//
// LA REGLA de Playwright no cambió: la mitad 1 es la lista calculada; la mitad 2
// es TODO LO DEMÁS, así ningún spec queda afuera de las dos.
// pruebas/test-navegador-en-dos.js exige que cada spec corra en UNA sola mitad,
// que las dos tarden parecido y que los specs que usan la fábrica de pruebas
// real (el robot) vayan juntos en la misma mitad: la fábrica es una sola, y dos
// trabajos a la vez se pisarían los turnos (repartir() los mueve en bloque).
//
// Las dos mitades de GitHub calculan lo mismo: los mismos archivos y los
// mismos tiempos dan el mismo reparto (los empates se ordenan por nombre).
//
// Sin E2E_MITAD (npm run e2e en la compu) corre todo, como siempre. El ensayo
// de integración corre las dos mitades a la vez, como GitHub (ver ensayo.js).

const fs = require('fs')
const path = require('path')

const MITADES = 2

// La carpeta e2e/ también cuando este archivo se carga desde pruebas/ (las
// mutaciones lo copian ahí).
const DIR_E2E = path.join(__dirname, '..', 'e2e')

// Segundos de cada spec en GitHub. Solo sirven para repartir parejo.
const TIEMPOS = JSON.parse(fs.readFileSync(path.join(DIR_E2E, 'tiempos-navegador.json'), 'utf8')).segundos
// Lo que tarda un spec nuevo, mientras no se mide (los de octubre: 20 a 50 s).
const TIEMPO_SIN_MEDIR = 20

function tiempoDe(nombre) {
  return TIEMPOS[path.posix.basename(nombre)] ?? TIEMPO_SIN_MEDIR
}

// Los specs como los encuentra Playwright (testDir = e2e, *.spec.js, también
// en subcarpetas), con la ruta relativa a e2e/ y "/" como separador.
function listarSpecs(dir = DIR_E2E) {
  const out = []
  const recorrer = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) recorrer(path.join(d, e.name), r)
      else if (/\.spec\.js$/.test(e.name)) out.push(r)
    }
  }
  recorrer(dir, '')
  return out.sort()
}

// Los specs que entran a la fábrica de pruebas real (con el robot).
const ROBOT = /entrarComo|sesionDelRobot|limpiarFabrica/

// Reparte los specs en dos mitades parejas. Los del robot van en un solo
// bloque. tiempoDe(spec) → segundos; textoDe(spec) → el texto del spec.
// → [{ specs, segundos }, { specs, segundos }]
function repartir(specs, { tiempoDe: t = tiempoDe, textoDe } = {}) {
  const robot = specs.filter(s => ROBOT.test(textoDe(s)))
  const bloques = specs.filter(s => !robot.includes(s)).map(s => [s])
  if (robot.length) bloques.push(robot)
  const conTiempo = bloques.map(b => ({ specs: b, segundos: b.reduce((a, s) => a + t(s), 0) }))
  conTiempo.sort((a, b) => b.segundos - a.segundos || (a.specs[0] < b.specs[0] ? -1 : 1))
  const mitades = [{ specs: [], segundos: 0 }, { specs: [], segundos: 0 }]
  for (const b of conTiempo) {
    const liviana = mitades[0].segundos <= mitades[1].segundos ? mitades[0] : mitades[1]
    liviana.specs.push(...b.specs)
    liviana.segundos += b.segundos
  }
  for (const m of mitades) m.specs.sort()
  return mitades
}

const textoDeSpec = (s) => fs.readFileSync(path.join(DIR_E2E, s), 'utf8')
const MITAD_1 = repartir(listarSpecs(), { textoDe: textoDeSpec })[0].specs

// 1 o 2.
function mitadDe(nombre) {
  return MITAD_1.includes(nombre) ? 1 : 2
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Una expresión que reconoce, por el final de la ruta, los specs de la mitad 1.
function reMitad1() {
  return new RegExp(`(^|[\\\\/])(?:${MITAD_1.map(escRe).join('|')})$`)
}

// Lo que playwright.config.js suma a su configuración. Sin mitad: nada (todo).
// Una mitad que no es 1 ni 2 es un error, no "todo": si el workflow manda algo
// raro, que se vea en vez de correr dos veces lo mismo.
function opcionesDeMitad(valor) {
  if (valor === undefined || valor === null || valor === '') return {}
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 1 || n > MITADES) {
    throw new Error(`E2E_MITAD tiene que ser un número de 1 a ${MITADES} (llegó «${valor}»)`)
  }
  if (n === 1) return { testMatch: [reMitad1()] }
  return { testIgnore: [/[\\/]node_modules[\\/]/, reMitad1()] }
}

module.exports = { MITADES, MITAD_1, TIEMPOS, TIEMPO_SIN_MEDIR, ROBOT, tiempoDe, mitadDe, listarSpecs, repartir, textoDeSpec, opcionesDeMitad }
