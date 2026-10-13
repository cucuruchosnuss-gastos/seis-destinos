// El navegador de GitHub corre en DOS trabajos a la vez (13/10/2026): que sean
// dos, que entre los dos corran TODOS los specs de e2e/ (ninguno afuera ni en
// los dos), que los recorridos del robot vayan juntos y en orden, y que cada
// trabajo suba sus capturas con un nombre distinto.
//
//   node pruebas/test-navegador-en-dos.js
//
// ARCHIVO_TEST cambia e2e/mitades.js (lo usa mut-navegador-en-dos.js);
// ARCHIVO_YML cambia el workflow.

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'e2e', 'mitades.js')
const ARCHIVO_YML = process.env.ARCHIVO_YML || path.join(RAIZ, '.github', 'workflows', 'navegador.yml')
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
// Node carga como JavaScript un archivo de extensión desconocida (el mut-tmp-*).
const { MITAD_1, filtroDeMitad, mitadDe } = require(ARCHIVO)
const yml = fs.readFileSync(ARCHIVO_YML, 'utf8')
const config = fs.readFileSync(path.join(RAIZ, 'e2e', 'playwright.config.js'), 'utf8')

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

const specs = fs.readdirSync(path.join(RAIZ, 'e2e')).filter(f => f.endsWith('.spec.js')).sort()
chk('hay specs en e2e/', specs.length > 10, specs.length)

// Lo que hace Playwright con el filtro: un archivo corre si lo toma testMatch
// y no lo saca testIgnore (los dos se prueban contra la ruta ABSOLUTA).
const prueba = (re, ruta) => { re.lastIndex = 0; return re.test(ruta) }
function corre(filtro, nombre) {
  const ruta = path.join(RAIZ, 'e2e', nombre)
  const lista = (x) => x == null ? [] : Array.isArray(x) ? x : [x]
  const toma = lista(filtro.testMatch).some(re => prueba(re, ruta))
  const saca = lista(filtro.testIgnore).some(re => prueba(re, ruta))
  return toma && !saca
}
const enMitad = (n) => specs.filter(s => corre(filtroDeMitad(String(n)), s))
const m1 = enMitad(1)
const m2 = enMitad(2)
const todos = specs.filter(s => corre(filtroDeMitad(undefined), s))

// ── el reparto ────────────────────────────────────────────────────────────
chk('sin E2E_MITAD corren todos los specs', todos.length === specs.length, `${todos.length} de ${specs.length}`)
chk('… y solo los .spec.js', !corre(filtroDeMitad(undefined), 'ayuda.js') && !corre(filtroDeMitad(undefined), 'mitades.js'))
chk('la mitad 2 tampoco toma una ayuda', !corre(filtroDeMitad('2'), 'ayuda.js'))
const fuera = specs.filter(s => !m1.includes(s) && !m2.includes(s))
chk('ningún spec queda afuera de las dos mitades', fuera.length === 0, fuera.join(', '))
const enLasDos = specs.filter(s => m1.includes(s) && m2.includes(s))
chk('ningún spec corre en las dos mitades', enLasDos.length === 0, enLasDos.join(', '))
chk('las dos mitades tienen specs', m1.length > 0 && m2.length > 0, `${m1.length} y ${m2.length}`)
const viejos = MITAD_1.filter(s => !specs.includes(s))
chk('la lista de la mitad 1 no nombra specs que ya no existen', viejos.length === 0, viejos.join(', '))
chk('la lista de la mitad 1 no repite', new Set(MITAD_1).size === MITAD_1.length)
chk('la mitad 1 es exactamente su lista', JSON.stringify(m1) === JSON.stringify([...MITAD_1].sort()), m1.join(', '))
chk('un spec nuevo (que no está en la lista) cae en la mitad 2', corre(filtroDeMitad('2'), 'zz-nuevo.spec.js') && !corre(filtroDeMitad('1'), 'zz-nuevo.spec.js'))
chk('un nombre que termina igual no se confunde (1-planta ≠ 21-planta)', !corre(filtroDeMitad('1'), '21-planta.spec.js') || MITAD_1.includes('21-planta.spec.js'))
chk('mitadDe dice la misma mitad que el filtro', specs.every(s => mitadDe(s) === (m1.includes(s) ? 1 : 2)))
let raro = null
try { filtroDeMitad('3') } catch (e) { raro = e }
chk('una mitad que no es 1 ni 2 corta (no corre nada callado)', raro !== null)

// Los recorridos del robot comparten la fábrica de pruebas: van en el MISMO
// trabajo (uno solo a la vez) y en este orden (la gestión mira el turno que
// cerró la planta).
const ROBOT = specs.filter(s => /sesionDelRobot|entrarComo|limpiarFabrica/.test(fs.readFileSync(path.join(RAIZ, 'e2e', s), 'utf8')))
chk('hay recorridos del robot', ROBOT.length >= 3, ROBOT.join(', '))
chk('los recorridos del robot van todos en la misma mitad', new Set(ROBOT.map(mitadDe)).size === 1, ROBOT.map(s => `${s}:${mitadDe(s)}`).join(', '))
chk('la planta corre antes que la gestión (orden alfabético de Playwright)', ['1-planta.spec.js', '2-gestion.spec.js'].every(s => specs.includes(s)) && '1-planta.spec.js' < '2-gestion.spec.js')
chk('el humo corre en la mitad del robot', mitadDe('0-humo.spec.js') === mitadDe(ROBOT[0]))

// ── la config ─────────────────────────────────────────────────────────────
chk('la config usa el filtro de e2e/mitades.js con E2E_MITAD', /require\('\.\/mitades'\)/.test(config) && /filtroDeMitad\(process\.env\.E2E_MITAD\)/.test(config))
chk('la config no pisa el filtro con su propio testMatch', !/^\s*testMatch\s*:/m.test(config))
chk('… ni con un testIgnore', !/^\s*testIgnore\s*:/m.test(config))
chk('la config sigue con un solo worker', /workers:\s*1\b/.test(config))

// ── el workflow ───────────────────────────────────────────────────────────
chk('el workflow corre una matriz de dos mitades', /matrix:\s*\n\s*mitad:\s*\[\s*1\s*,\s*2\s*\]/.test(yml))
chk('una mitad que falla no cancela la otra', /fail-fast:\s*false/.test(yml))
chk('cada trabajo corre su mitad (E2E_MITAD)', /E2E_MITAD:\s*\$\{\{\s*matrix\.mitad\s*\}\}/.test(yml))
chk('los artefactos tienen nombres distintos', /name:\s*capturas-\$\{\{\s*matrix\.mitad\s*\}\}/.test(yml) && !/name:\s*capturas\s*$/m.test(yml))
chk('cada trabajo conserva su tope de 30 minutos', /timeout-minutes:\s*30\b/.test(yml))
chk('cada trabajo se llama por su mitad', /name:\s*Navegador \(mitad \$\{\{\s*matrix\.mitad\s*\}\}\)/.test(yml))
chk('sigue la concurrency "navegador" sin cancelar', /concurrency:[\s\S]*?group:\s*navegador\s*\n\s*cancel-in-progress:\s*false/.test(yml))
chk('sigue corriendo en main, en ci-prueba/** y de noche', /branches:\s*\[main,\s*'ci-prueba\/\*\*'\]/.test(yml) && /cron:\s*'0 8 \* \* \*'/.test(yml) && /workflow_dispatch:/.test(yml))
for (const s of ['E2E_PLANTA_EMAIL', 'E2E_GESTION_EMAIL', 'E2E_RETIROS_EMAIL', 'E2E_SERVICE_ROLE_KEY', 'E2E_MAESTRO_NOMBRE', 'E2E_MAESTRO_PIN']) {
  chk(`sigue el secreto ${s}`, new RegExp(`${s}:\\s*\\$\\{\\{\\s*secrets\\.${s}\\s*\\}\\}`).test(yml))
}
chk('instala chromium y webkit', /npx playwright install --with-deps chromium webkit/.test(yml))
chk('corre Playwright con npm run e2e', /run:\s*npm run e2e/.test(yml))
chk('el resumen nombra el artefacto de su mitad', /artefacto \\"capturas-\$\{\{\s*matrix\.mitad\s*\}\}\\"/.test(yml))
chk('el aviso de los secretos sale solo en la mitad del robot', new RegExp(`if:\\s*matrix\\.mitad\\s*==\\s*${mitadDe(ROBOT[0])}`).test(yml))

console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
console.log(`Mitad 1 (${m1.length}): ${m1.join(', ')}`)
console.log(`Mitad 2 (${m2.length}): ${m2.join(', ')}`)
if (fallas.length) { console.log(`\n✗ ${fallas.length} fallas`); process.exit(1) }
