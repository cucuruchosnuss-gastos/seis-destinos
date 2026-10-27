// El trabajo "Navegador" de GitHub en dos mitades a la vez (14/10/2026).
// Exige que cada spec de e2e/ corra en UNA sola mitad (ni afuera de las dos ni
// en las dos), que las mitades tarden parecido, que los specs del robot (la
// fábrica de pruebas real, que es una sola) vayan juntos, y que el workflow
// tenga las dos mitades, sus artefactos con nombre distinto, la fila por rama
// y los secretos del robot solo en main.
//
//   node pruebas/test-navegador-en-dos.js
//
// Archivos bajo prueba (las mutaciones los cambian por estas variables):
//   ARCHIVO_MITADES  (e2e/mitades.js)
//   ARCHIVO_WORKFLOW (.github/workflows/navegador.yml)
//   ARCHIVO_CONFIG   (e2e/playwright.config.js)

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const E2E = path.join(RAIZ, 'e2e')
const ARCHIVO_MITADES = process.env.ARCHIVO_MITADES || path.join(E2E, 'mitades.js')
const ARCHIVO_WORKFLOW = process.env.ARCHIVO_WORKFLOW || path.join(RAIZ, '.github', 'workflows', 'navegador.yml')
const ARCHIVO_CONFIG = process.env.ARCHIVO_CONFIG || path.join(E2E, 'playwright.config.js')

const leer = (f) => fs.readFileSync(f, 'utf8')
for (const f of [ARCHIVO_MITADES, ARCHIVO_WORKFLOW, ARCHIVO_CONFIG]) console.log(`ARCHIVO ${f} (${leer(f).length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

// Node carga como JavaScript un archivo de extensión desconocida (el mut-tmp-*.html).
const M = require(ARCHIVO_MITADES)
const { MITADES, MITAD_1, TIEMPOS, tiempoDe, mitadDe, listarSpecs, opcionesDeMitad } = M

// ── Los specs, como los encuentra Playwright ──────────────────────────────
const specs = listarSpecs(E2E)
chk('hay specs en e2e/', specs.length > 10, specs.length)
chk('el humo está entre los specs', specs.includes('0-humo.spec.js'))
// Comparación independiente de listarSpecs: los *.spec.js de e2e/ (sin subcarpetas hoy).
const aMano = fs.readdirSync(E2E).filter(f => f.endsWith('.spec.js')).sort()
chk('listarSpecs encuentra todos los *.spec.js de e2e/', aMano.every(f => specs.includes(f)), aMano.filter(f => !specs.includes(f)))

// ── Qué corre cada mitad, con la MISMA regla que Playwright ───────────────
// testMatch (o el de la config: *.spec.js) tiene que reconocer la ruta
// absoluta, y testIgnore no.
const TEST_MATCH_CONFIG = /.*\.spec\.js$/
function correEn(n, rutaAbs) {
  const o = opcionesDeMitad(String(n))
  const match = (o.testMatch ?? [TEST_MATCH_CONFIG]).some(r => r.test(rutaAbs))
  const ignorado = (o.testIgnore ?? []).some(r => r.test(rutaAbs))
  return match && !ignorado
}
const mitadesDe = (spec) => {
  const out = []
  for (let n = 1; n <= MITADES; n++) if (correEn(n, path.join(E2E, spec))) out.push(n)
  return out
}

chk('son dos mitades', MITADES === 2, MITADES)
const sinMitad = specs.filter(s => mitadesDe(s).length === 0)
const enDos = specs.filter(s => mitadesDe(s).length > 1)
chk('ningún spec queda sin correr', sinMitad.length === 0, sinMitad)
chk('ningún spec corre dos veces', enDos.length === 0, enDos)
chk('cada spec corre en la mitad que dice mitadDe()', specs.every(s => {
  const m = mitadesDe(s)
  return m.length === 1 && m[0] === mitadDe(s)
}), specs.filter(s => mitadesDe(s)[0] !== mitadDe(s)))

// Un spec nuevo, que nadie anotó, va a la mitad 2 (y solo a esa).
for (const nuevo of ['99-nuevo.spec.js', 'algo-nuevo.spec.js', 'sub/carpeta/otro.spec.js']) {
  chk(`un spec nuevo (${nuevo}) va solo a la mitad 2`, JSON.stringify(mitadesDe(nuevo)) === '[2]', mitadesDe(nuevo))
}
// Un nombre que TERMINA como uno de la mitad 1 no es ese spec.
chk('«x-detalles-dispositivos.spec.js» no es detalles-dispositivos', JSON.stringify(mitadesDe('x-detalles-dispositivos.spec.js')) === '[2]', mitadesDe('x-detalles-dispositivos.spec.js'))
chk('«16-planta-reanudar.spec.js» no es 6-planta-reanudar (el 1 de adelante)', JSON.stringify(mitadesDe('16-planta-reanudar.spec.js')) === '[2]')
// También con barras de Windows (Playwright compara la ruta absoluta del sistema).
chk('con barras de Windows, la mitad 1 sigue siendo la mitad 1',
  correEn(1, 'C:\\repo\\e2e\\detalles-dispositivos.spec.js') && !correEn(2, 'C:\\repo\\e2e\\detalles-dispositivos.spec.js'))
chk('… y un node_modules nunca corre en la 2', !correEn(2, path.join(E2E, 'node_modules', 'x.spec.js')))

// La lista de la mitad 1: sin repetidos y cada uno existe.
chk('la mitad 1 no repite specs', new Set(MITAD_1).size === MITAD_1.length, MITAD_1)
const inexistentes = MITAD_1.filter(s => !specs.includes(s))
chk('cada spec de la mitad 1 existe', inexistentes.length === 0, inexistentes)
chk('las dos mitades tienen specs', specs.some(s => mitadDe(s) === 1) && specs.some(s => mitadDe(s) === 2))

// ── Sin E2E_MITAD corre todo; una mitad rara es un error ──────────────────
chk('sin E2E_MITAD no cambia nada (corre todo)', Object.keys(opcionesDeMitad(undefined)).length === 0 && Object.keys(opcionesDeMitad('')).length === 0)
for (const raro of ['3', '0', 'uno', '1.5', '-1']) {
  let tiro = false
  try { opcionesDeMitad(raro) } catch { tiro = true }
  chk(`E2E_MITAD=${raro} es un error, no "todo"`, tiro)
}

// ── Parejas en tiempo ─────────────────────────────────────────────────────
const tiempoMitad = (n) => specs.filter(s => mitadDe(s) === n).reduce((a, s) => a + tiempoDe(s), 0)
const t1 = tiempoMitad(1), t2 = tiempoMitad(2), total = t1 + t2
console.log(`  tiempos estimados: mitad 1 ${t1} s, mitad 2 ${t2} s`)
chk('ninguna mitad pasa del 55 % del tiempo total', Math.max(t1, t2) <= total * 0.55, `${t1} / ${t2}`)
const viejos = Object.keys(TIEMPOS).filter(s => !specs.includes(s))
chk('TIEMPOS no nombra specs que ya no existen', viejos.length === 0, viejos)
chk('los largos que lanzan varios navegadores están medidos', ['detalles-dispositivos.spec.js', 'filtros-dispositivos.spec.js', '5-maqueta.spec.js', '0-humo.spec.js'].every(s => TIEMPOS[s] > 30))

// ── Los del robot, juntos ─────────────────────────────────────────────────
const robot = specs.filter(s => /entrarComo|sesionDelRobot|limpiarFabrica/.test(leer(path.join(E2E, s))))
chk('se encuentran los specs del robot (planta, gestión, retiros)', ['1-planta.spec.js', '2-gestion.spec.js', '4-retiros.spec.js'].every(s => robot.includes(s)), robot)
chk('los specs del robot van todos en la misma mitad', new Set(robot.map(mitadDe)).size === 1, robot.map(s => `${s}:${mitadDe(s)}`))

// ── La configuración de Playwright usa las mitades ────────────────────────
const cfg = leer(ARCHIVO_CONFIG)
chk('la config trae opcionesDeMitad de mitades.js', /const \{ opcionesDeMitad \} = require\('\.\/mitades'\)/.test(cfg))
const iMatch = cfg.indexOf('testMatch:')
const iMitad = cfg.indexOf('...opcionesDeMitad(process.env.E2E_MITAD)')
chk('la config suma las opciones de E2E_MITAD', iMitad !== -1)
chk('… DESPUÉS de testMatch (si no, la mitad 1 correría todo)', iMatch !== -1 && iMitad > iMatch)
chk('el ensayo de integración trata mitades.js como algo que usan todos', require('./ensayo').DE_TODOS.test('e2e/mitades.js'))
chk('la config sigue con testMatch *.spec.js', /testMatch: \/\.\*\\\.spec\\\.js\$\//.test(cfg))

// ── El workflow ───────────────────────────────────────────────────────────
const wf = leer(ARCHIVO_WORKFLOW)
const sinComentarios = wf.split('\n').map(l => l.replace(/^\s*#.*$/, '')).join('\n')
chk('el workflow se sigue llamando "Navegador" (lo leen scripts y el badge)', /^name: Navegador$/m.test(sinComentarios))
chk('corre en cada push a main y a las ramas ci-prueba/**', /push:\n\s+branches: \[main, 'ci-prueba\/\*\*'\]/.test(sinComentarios))
chk('… a la noche', /schedule:\n\s+- cron: '0 8 \* \* \*'/.test(sinComentarios))
chk('… y a mano', /^\s+workflow_dispatch:/m.test(sinComentarios))
const matriz = (sinComentarios.match(/^\s+mitad: \[([^\]]*)\]/m) || [])[1]
const valores = (matriz || '').split(',').map(s => Number(s.trim())).filter(Number.isFinite)
chk('la matriz tiene una entrada por mitad (1 y 2)', JSON.stringify(valores) === JSON.stringify(Array.from({ length: MITADES }, (_, i) => i + 1)), matriz)
chk('fail-fast: false (una mitad que falla no corta la otra)', /^\s+fail-fast: false$/m.test(sinComentarios))
chk('cada trabajo recibe su mitad en E2E_MITAD', /^\s+E2E_MITAD: \$\{\{ matrix\.mitad \}\}$/m.test(sinComentarios))
chk('el nombre de cada trabajo dice su mitad', new RegExp(`^\\s+name: Navegador \\$\\{\\{ matrix\\.mitad \\}\\}/${MITADES}$`, 'm').test(sinComentarios))
// El del trabajo va a 4 espacios; el de un paso, más adentro (26/10/2026: la
// instalación de los navegadores tiene su propio tope, ver abajo).
const timeouts = [...sinComentarios.matchAll(/^ {4}timeout-minutes: (\d+)$/gm)].map(m => Number(m[1]))
chk('un tope por trabajo, de 30 minutos o menos', timeouts.length === 1 && timeouts[0] > 0 && timeouts[0] <= 30, timeouts)
// 26/10/2026: la instalación con sus dependencias (apt-get) se colgó cuatro
// veces en el día. El trabajo corre en la imagen oficial de Playwright, de la
// MISMA versión que el proyecto, y no instala nada con apt.
const lock = JSON.parse(leer(path.join(RAIZ, 'package-lock.json')))
const versionPw = lock.packages?.['node_modules/@playwright/test']?.version
const imagen = (sinComentarios.match(/^ {6}image: mcr\.microsoft\.com\/playwright:v([\d.]+)-noble$/m) || [])[1]
chk('corre en la imagen oficial de Playwright', !!imagen, imagen)
chk('… de la misma versión que @playwright/test en package-lock.json', imagen === versionPw, `imagen ${imagen}, proyecto ${versionPw}`)
chk('… con --ipc=host (lo pide Playwright para Chromium en un contenedor)', /^ {6}options: --ipc=host$/m.test(sinComentarios))
chk('en Ubuntu 24.04 fijo', /^ {4}runs-on: ubuntu-24\.04$/m.test(sinComentarios))
chk('Chromium y WebKit, sin --with-deps (nada de apt)', /npx playwright install chromium webkit/.test(sinComentarios) && !/--with-deps/.test(sinComentarios))
const pasoNavegadores = (sinComentarios.match(/- name: Chromium y WebKit[^\n]*\n(?: {8}[^\n]*\n)+/) || [''])[0]
const topePaso = Number((pasoNavegadores.match(/^ {8}timeout-minutes: (\d+)$/m) || [])[1])
chk('ese paso tiene su propio tope, menor que el del trabajo', topePaso > 0 && topePaso < timeouts[0], pasoNavegadores)
chk('corre Playwright con npm run e2e', /^\s+run: npm run e2e$/m.test(sinComentarios))
chk('un artefacto por mitad, con nombre distinto', /^\s+name: capturas-\$\{\{ matrix\.mitad \}\}$/m.test(sinComentarios))
chk('… que se sube aunque falle', /if: always\(\)\n\s+with:\n\s+name: capturas-/.test(sinComentarios))
chk('el resumen dice la mitad', /GITHUB_STEP_SUMMARY/.test(sinComentarios) && /Mitad \$\{\{ matrix\.mitad \}\}/.test(sinComentarios))

// La fila: por rama, sin cortar una corrida empezada.
const grupo = (sinComentarios.match(/concurrency:\n\s+group: (.*)/) || [])[1] || ''
chk('una fila por rama (una rama no le cancela la espera a main)', /\$\{\{ github\.ref \}\}/.test(grupo), grupo)
chk('cancel-in-progress: false', /concurrency:\n\s+group: .*\n\s+cancel-in-progress: false/.test(sinComentarios))

// Los secretos del robot, solo en main.
const SECRETOS = ['E2E_PLANTA_EMAIL', 'E2E_GESTION_EMAIL', 'E2E_RETIROS_EMAIL', 'E2E_SERVICE_ROLE_KEY', 'E2E_MAESTRO_NOMBRE', 'E2E_MAESTRO_PIN']
for (const s of SECRETOS) {
  chk(`el secreto ${s} llega solo a las corridas de main`,
    new RegExp(`^\\s+${s}: \\$\\{\\{ github\\.ref == 'refs/heads/main' && secrets\\.${s} \\|\\| '' \\}\\}$`, 'm').test(sinComentarios))
}
const sueltos = [...sinComentarios.matchAll(/secrets\.(\w+)/g)].filter(m => {
  const linea = sinComentarios.slice(sinComentarios.lastIndexOf('\n', m.index) + 1, sinComentarios.indexOf('\n', m.index))
  return !linea.includes("github.ref == 'refs/heads/main' &&")
}).map(m => m[1])
chk('ningún secreto llega a una rama', sueltos.length === 0, sueltos)

console.log(`${ok}/${ok + fallas.length} verificaciones`)
process.exit(fallas.length ? 1 : 0)
