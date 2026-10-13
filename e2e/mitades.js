// Qué specs corre cada uno de los DOS trabajos del navegador de GitHub
// (.github/workflows/navegador.yml, 13/10/2026). Con E2E_MITAD=1 corre la
// lista de abajo; con E2E_MITAD=2, TODO LO DEMÁS (así un spec nuevo nunca queda
// afuera: cae solo en la mitad 2). Sin E2E_MITAD, todos (en la compu y en el
// ensayo, como siempre).
//
// Cómo se armó: con lo que tarda cada spec en una corrida entera, para que las
// dos mitades tarden más o menos lo mismo. Los recorridos del robot (planta,
// gestión, Accesos, retiros) van TODOS acá: comparten la fábrica de pruebas y
// no pueden correr en dos máquinas a la vez; Playwright los corre en orden
// alfabético (la planta antes que la gestión). pruebas/test-navegador-en-dos.js
// verifica todo eso.

const MITAD_1 = [
  // El humo y los recorridos del robot (siempre juntos).
  '0-humo.spec.js',
  '1-planta.spec.js',
  '2-gestion.spec.js',
  '3-accesos.spec.js',
  '4-retiros.spec.js',
  // El resto, para emparejar los tiempos.
]

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// La ruta termina en /nombre (o \nombre en Windows): 1-planta no toma 21-planta.
const regexDe = (nombre) => new RegExp(`[\\\\/]${esc(nombre)}$`)
const TODOS = /.*\.spec\.js$/

function mitadDe(nombre) {
  return MITAD_1.includes(nombre) ? 1 : 2
}

// → lo que va en defineConfig: testMatch (y testIgnore en la mitad 2).
function filtroDeMitad(mitad) {
  if (mitad === undefined || mitad === null || mitad === '') return { testMatch: TODOS }
  if (String(mitad) === '1') return { testMatch: MITAD_1.map(regexDe) }
  if (String(mitad) === '2') return { testMatch: TODOS, testIgnore: MITAD_1.map(regexDe) }
  throw new Error(`E2E_MITAD tiene que ser 1 o 2 (llegó "${mitad}")`)
}

module.exports = { MITAD_1, mitadDe, filtroDeMitad }
