// ensayo.js (npm run ensayo): qué pruebas de navegador elige para lo que cambió
// y que ningún spec tenga los puertos fijos (el ensayo los cambia). 10/10/2026.
//
//   node pruebas/test-ensayo.js

const fs = require('fs')
const path = require('path')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, 'ensayo.js')
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
// Node carga como JavaScript un archivo de extensión desconocida (el mut-tmp-*.html).
const { navegadorAlcanzado, abrePantalla, nombraDatos, requiresLocales, ayudasDe } = require(ARCHIVO)
const { alcanzados } = require('./correr-rama')

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

// ── las piezas ───────────────────────────────────────────────────────────
chk('abre una pantalla por su ruta en una URL', abrePantalla('await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock`)', 'modulos/stock.html'))
chk('produccion.html no es produccion-gestion.html', !abrePantalla("'modulos/produccion-gestion.html'", 'modulos/produccion.html'))
chk('… ni al revés', !abrePantalla("'modulos/produccion.html'", 'modulos/produccion-gestion.html'))
chk('… ni una que es el final del nombre de otra', !abrePantalla("'modulos/produccion-gestion.html'", 'modulos/gestion.html'))
chk('una pantalla de la raíz', abrePantalla("page.goto('/login.html')", 'login.html'))
chk('no la abre si no la nombra', !abrePantalla("page.goto('/dashboard.html')", 'login.html'))
chk('los datos de la maqueta por ?maqueta=', nombraDatos('?maqueta=stock&x', 'stock'))
chk('… o entre comillas', nombraDatos("{ datos: 'stock-costos' }", 'stock-costos'))
chk('stock no es stock-costos', !nombraDatos('?maqueta=stock-costos', 'stock'))
chk('… ni entre comillas', !nombraDatos("'stock-costos'", 'stock'))
chk('los require locales', JSON.stringify(requiresLocales("const a = require('./ayuda'); const b = require('./pasos-planta.js'); require('@playwright/test')")) === '["ayuda.js","pasos-planta.js"]')
const tx = new Map([['a.spec.js', "require('./pasos')"], ['pasos.js', "require('./medir')"], ['medir.js', '']])
chk('las ayudas de un spec, también las de sus ayudas', [...ayudasDe('a.spec.js', tx)].sort().join() === 'medir.js,pasos.js')

// ── navegadorAlcanzado() con datos armados ───────────────────────────────
const textos = new Map([
  ['0-humo.spec.js', "page.goto('/login.html')"],
  ['stock.spec.js', "require('./ayuda'); page.goto(`${M}/modulos/stock.html?maqueta=stock`)"],
  ['planta.spec.js', "require('./ayuda'); require('./pasos-planta'); page.goto(`${M}/modulos/produccion.html?maqueta=produccion`)"],
  ['gestion.spec.js', "require('./ayuda'); page.goto(`${M}/modulos/produccion-gestion.html?maqueta=produccion-gestion`)"],
  ['comparar.spec.js', "require('./pasos-comparar')"],
  ['pasos-comparar.js', "goto(`${M}/modulos/taller.html`)"],
  ['ayuda.js', ''],
  ['pasos-planta.js', "require('./medir-pantalla')"],
  ['medir-pantalla.js', ''],
])
const corr = (cambiados, paginas = []) => navegadorAlcanzado({ cambiados, paginas, textos })
let r = corr(['modulos/stock.html'], ['modulos/stock.html'])
chk('una pantalla cambiada corre su spec', r.has('stock.spec.js'), [...r.keys()])
chk('… y no los de otras', !r.has('planta.spec.js') && !r.has('gestion.spec.js'))
chk('… y el humo siempre', r.get('0-humo.spec.js') === 'siempre')
chk('el motivo dice qué pantalla abre', r.get('stock.spec.js') === 'abre modulos/stock.html')
r = corr(['modulos/produccion.html'], ['modulos/produccion.html'])
chk('la planta corre el de la planta y no el de la gestión', r.has('planta.spec.js') && !r.has('gestion.spec.js'))
r = corr(['e2e/planta.spec.js'])
chk('un spec cambiado corre aunque no cambie ninguna pantalla', r.get('planta.spec.js') === 'cambió')
r = corr(['e2e/medir-pantalla.js'])
chk('una ayuda cambiada corre los specs que la usan, aunque sea de segunda mano', r.get('planta.spec.js') === 'usa medir-pantalla.js, que cambió', [...r])
chk('… y no los que no la usan', !r.has('stock.spec.js'))
r = corr(['pruebas/datos-maqueta/stock.js'])
chk('datos de la maqueta cambiados corren el spec que los usa', r.has('stock.spec.js'), [...r])
chk('… y no los otros', !r.has('planta.spec.js') && !r.has('gestion.spec.js'))
r = corr(['e2e/maqueta/datos/produccion-gestion.json'])
chk('el .json generado también cuenta', r.has('gestion.spec.js') && !r.has('planta.spec.js'))
r = corr(['e2e/ayuda.js'])
chk('lo que usan todos corre todos', ['stock.spec.js', 'planta.spec.js', 'gestion.spec.js', '0-humo.spec.js'].every(s => r.has(s)))
r = corr(['e2e/maqueta/supabase-falso.js'])
chk('… también la maqueta', r.size === [...textos.keys()].filter(f => f.endsWith('.spec.js')).length)
r = corr(['CLAUDE.md'])
chk('lo que no es de ninguna pantalla corre solo el humo', r.size === 1 && r.has('0-humo.spec.js'), [...r])

// ── con el repo real: correr-rama alcanza las pantallas, ensayo elige ─────
const E2E = path.join(__dirname, '..', 'e2e')
const reales = new Map(fs.readdirSync(E2E).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(E2E, f), 'utf8')]))
const deVerdad = (cambiados) => navegadorAlcanzado({ cambiados, textos: reales, paginas: [...alcanzados(cambiados).keys()].filter(f => f.endsWith('.html')) })
r = deVerdad(['modulos/stock.html'])
chk('Stock corre la prueba de Stock que se actualiza', r.has('19-stock-se-actualiza.spec.js'), [...r.keys()])
chk('… y la de la maqueta', r.has('5-maqueta.spec.js') || r.has('7-barra-unidad.spec.js'))
chk('… y no la de la planta a 390', !r.has('29-planta-390.spec.js'))
r = deVerdad(['modulos/produccion.html'])
chk('la planta corre la de los tamaños de la tablet', r.has('8-planta-tamanos.spec.js'))
chk('… y no la de costos', !r.has('29-costos-insumos.spec.js'))
r = deVerdad(['modulos/taller.html'])
chk('una comparación con el diseño que abre la pantalla en sus pasos (no en el spec) también corre', r.has('14-comparar-taller.spec.js'), [...r.keys()])
r = corr(['modulos/taller.html'], ['modulos/taller.html'])
chk('… y con datos armados: el spec no nombra la pantalla, su ayuda sí', r.has('comparar.spec.js'), [...r.keys()])
r = deVerdad(['css/main.css'])
chk('main.css alcanza a todas las pantallas y a casi todos los specs', r.has('19-stock-se-actualiza.spec.js') && r.has('8-planta-tamanos.spec.js') && r.has('29-produccion-tabla.spec.js'), r.size)

// ── los puertos: nada fijo, así el ensayo los puede cambiar ──────────────
for (const [f, t] of reales) {
  if (!f.endsWith('.spec.js')) continue
  const lineas = t.split('\n').filter(l => /localhost:41(73|80)/.test(l) && !/process\.env\./.test(l))
  chk(`${f} no tiene los puertos fijos`, lineas.length === 0, lineas.join(' | '))
}
const cfg = fs.readFileSync(path.join(E2E, 'playwright.config.js'), 'utf8')
chk('la config toma el puerto de E2E_PUERTO', /process\.env\.E2E_PUERTO\b/.test(cfg))
chk('… y el de la maqueta de E2E_PUERTO_MAQUETA', /process\.env\.E2E_PUERTO_MAQUETA/.test(cfg) && /servir\.js \$\{PUERTO_MAQUETA\}/.test(cfg))
chk('.ensayo/ está en .gitignore', /^\.ensayo\/$/m.test(fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8')))

// ── el tope (11/10/2026): un paso colgado se corta, con todo lo que lanzó ──
const M = require(ARCHIVO)
chk('el navegador tiene tope de 45 min por defecto', M.TOPE_NAVEGADOR_MIN === 45, M.TOPE_NAVEGADOR_MIN)
chk('las suites tienen tope de 20 min por defecto', M.TOPE_PRUEBAS_MIN === 20, M.TOPE_PRUEBAS_MIN)
chk('--global-timeout de Playwright: 3 min antes del tope', M.globalTimeoutMs(45) === 42 * 60000, M.globalTimeoutMs(45))
chk('… con un tope corto, a la mitad', M.globalTimeoutMs(2) === 60000, M.globalTimeoutMs(2))
const an = M.argsNavegador('cli.js', ['0-humo.spec.js'], 45)
chk('Playwright corre con --global-timeout', an.includes(`--global-timeout=${42 * 60000}`), an.join(' '))
chk('… y con los specs elegidos', an.includes('e2e/0-humo.spec.js') && an[1] === 'test', an.join(' '))

;(async () => {
  const os = require('os')
  // Un paso que termina bien: ok, sin colgarse.
  let r = await M.correr('prueba que termina', process.execPath, ['-e', 'process.exit(0)'], __dirname, {}, 0.5)
  chk('un paso que termina en 0 da ok', r.ok === true && r.colgado === false, JSON.stringify(r))
  r = await M.correr('prueba que falla', process.execPath, ['-e', 'process.exit(3)'], __dirname, {}, 0.5)
  chk('un paso que falla no da ok y no se colgó', r.ok === false && r.colgado === false, JSON.stringify(r))
  // Un paso colgado que además lanzó un NIETO colgado (como Playwright con el
  // navegador): al pasar el tope se cortan los dos.
  const marca = path.join(os.tmpdir(), `ensayo-nieto-${process.pid}.txt`)
  try { fs.unlinkSync(marca) } catch {}
  const hijo = `const { spawn } = require('child_process');` +
    `const n = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 90000)'], { stdio: 'ignore', detached: true });` +
    `require('fs').writeFileSync(${JSON.stringify(marca)}, String(n.pid)); setTimeout(() => {}, 60000)`
  const t0 = Date.now()
  r = await M.correr('prueba colgada', process.execPath, ['-e', hijo], __dirname, {}, 0.05)
  const seg = (Date.now() - t0) / 1000
  chk('un paso colgado se corta al pasar el tope (no espera para siempre)', r.colgado === true && r.ok === false && seg < 20, `${JSON.stringify(r)} en ${seg}s`)
  let nietoVivo = null
  try {
    const pid = Number(fs.readFileSync(marca, 'utf8'))
    await new Promise(res => setTimeout(res, 1500))
    try { process.kill(pid, 0); nietoVivo = true } catch { nietoVivo = false }
    if (nietoVivo) try { process.kill(pid) } catch {}
  } catch (e) { nietoVivo = 'sin marca: ' + e.message }
  chk('… y se corta también lo que lanzó (el nieto, como el navegador)', nietoVivo === false, String(nietoVivo))
  try { fs.unlinkSync(marca) } catch {}

  console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
  process.exit(fallas.length ? 1 : 0)
})()
