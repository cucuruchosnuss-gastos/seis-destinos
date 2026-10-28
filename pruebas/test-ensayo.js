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
chk('… y no la de la planta a 390', !r.has('83-planta-390.spec.js'))
r = deVerdad(['modulos/produccion.html'])
chk('la planta corre la de los tamaños de la tablet', r.has('8-planta-tamanos.spec.js'))
chk('… y no la de costos', !r.has('82-costos-insumos.spec.js'))
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

// ── los topes salen de la última corrida (28/10/2026) ─────────────────────
const H = (dia) => `2026-10-${dia}T03:00:00.000Z`
chk('el margen es 30 %', M.MARGEN === 1.3)
chk('suites sin datos: 35 min', M.topePruebasMin(undefined) === 35, M.topePruebasMin(undefined))
chk('suites: la última en verde + 30 % (20 min → 26)', M.topePruebasMin({ verde: { valor: 1200, fecha: H(1) } }) === 26, M.topePruebasMin({ verde: { valor: 1200, fecha: H(1) } }))
chk('… nunca menos de 25 min', M.topePruebasMin({ verde: { valor: 300, fecha: H(1) } }) === 25)
chk('… ni más de 120', M.topePruebasMin({ verde: { valor: 99999, fecha: H(1) } }) === 120)
chk('un corte DESPUÉS de la última en verde sube el tope (el del corte + 30 %)', M.topePruebasMin({ verde: { valor: 1200, fecha: H(1) }, corte: { valor: 2100, fecha: H(2) } }) === 46,
  M.topePruebasMin({ verde: { valor: 1200, fecha: H(1) }, corte: { valor: 2100, fecha: H(2) } }))
chk('… y uno de ANTES de la última en verde no cuenta', M.topePruebasMin({ verde: { valor: 1200, fecha: H(3) }, corte: { valor: 2100, fecha: H(2) } }) === 26)
chk('… ni achica el tope si el verde fue más largo', M.medidaDe({ verde: { valor: 3000, fecha: H(1) }, corte: { valor: 2100, fecha: H(2) } }) === 3000)
chk('un corte sin ninguna en verde también cuenta', M.medidaDe({ corte: { valor: 2100, fecha: H(2) } }) === 2100)
chk('navegador sin datos: factor 2,5 sobre lo de GitHub + 30 % (600 s → 33 min)', M.topeNavegadorMin(undefined, 600) === 33, M.topeNavegadorMin(undefined, 600))
chk('navegador: el factor de la última en verde (1,6 × 900 s → 32 min)', M.topeNavegadorMin({ verde: { valor: 1.6, fecha: H(1) } }, 900) === 32, M.topeNavegadorMin({ verde: { valor: 1.6, fecha: H(1) } }, 900))
chk('… nunca menos de 15 min', M.topeNavegadorMin({ verde: { valor: 1.6, fecha: H(1) } }, 30) === 15)
chk('… ni más de 120', M.topeNavegadorMin({ verde: { valor: 9, fecha: H(1) } }, 5000) === 120)
const an1 = M.anotar({ verde: { valor: 5, fecha: H(1) } }, { corte: 9 }, H(2))
chk('anotar un corte conserva la última en verde', JSON.stringify(an1) === JSON.stringify({ verde: { valor: 5, fecha: H(1) }, corte: { valor: 9, fecha: H(2) } }), JSON.stringify(an1))
chk('anotar un verde lo reemplaza', M.anotar(an1, { verde: 7 }, H(3)).verde.valor === 7)
// cómo le fue al navegador → qué se anota
const cn = (o) => ({ ok: true, colgado: false, segundos: 600, estimado: 300, tope: 20, ...o })
chk('dos mitades en verde: el factor más alto', JSON.stringify(M.resultadoNavegador([cn({}), cn({ segundos: 900 })])) === '{"verde":3}', JSON.stringify(M.resultadoNavegador([cn({}), cn({ segundos: 900 })])))
chk('una mitad cortada: el factor de su tope (20 min / 300 s = 4)', JSON.stringify(M.resultadoNavegador([cn({}), cn({ ok: false, colgado: true })])) === '{"corte":4}')
chk('una roja sin cortarse no anota nada', JSON.stringify(M.resultadoNavegador([cn({}), cn({ ok: false })])) === '{}')
chk('una mitad sin specs no cuenta', JSON.stringify(M.resultadoNavegador([null, cn({})])) === '{"verde":2}')
chk('porMitad reparte con la mitadDe que le pasan', JSON.stringify(M.porMitad(['a', 'b', 'c'], (s) => (s === 'b' ? 1 : 2))) === '[["b"],["a","c"]]')
const archD = M.archivoDuraciones()
chk('lo medido va a .ensayo/duraciones.json de la copia principal (la de .git)', /[\\/]\.ensayo[\\/]duraciones\.json$/.test(archD) && fs.existsSync(path.join(path.dirname(path.dirname(archD)), '.git')), archD)
{
  const tmpD = path.join(require('os').tmpdir(), `ensayo-duraciones-${process.pid}.json`)
  fs.writeFileSync(tmpD, JSON.stringify({ suites: { verde: { valor: 100, fecha: H(1) } } }))
  M.guardarDuracion('navegador', { verde: 1.5 }, tmpD)
  const leido = M.leerDuraciones(tmpD)
  chk('guardar un paso conserva lo de los otros (relee antes de escribir)', leido.suites.verde.valor === 100 && leido.navegador.verde.valor === 1.5, JSON.stringify(leido))
  fs.unlinkSync(tmpD)
  chk('sin archivo, ningún dato (no se rompe)', JSON.stringify(M.leerDuraciones(tmpD)) === '{}')
}
chk('--global-timeout de Playwright: 3 min antes del tope', M.globalTimeoutMs(45) === 42 * 60000, M.globalTimeoutMs(45))
chk('… con un tope corto, a la mitad', M.globalTimeoutMs(2) === 60000, M.globalTimeoutMs(2))
const an = M.argsNavegador('cli.js', ['0-humo.spec.js'], 45)
chk('Playwright corre con --global-timeout', an.includes(`--global-timeout=${42 * 60000}`), an.join(' '))
chk('… y con los specs elegidos', an.includes('e2e/0-humo.spec.js') && an[1] === 'test', an.join(' '))

// ── la marca de cada ensayo: qué puede borrar --limpiar (28/10/2026) ──────
const HORA = 3600000
const AHORA = Date.parse('2026-10-28T12:00:00Z')
const hace = (h) => new Date(AHORA - h * HORA).toISOString()
const vivoSi = (pids) => (pid) => pids.includes(pid)
const est = (marca, mtimeH = 0, vivos = [], compu = 'esta') => M.estadoDe({ marca, mtimeMs: AHORA - mtimeH * HORA, ahora: AHORA, vivo: vivoSi(vivos), compu })
chk('un ensayo corriendo (su PID vive) es "vivo"', est({ pid: 7, compu: 'esta', inicio: hace(1) }, 0, [7]) === 'vivo')
chk('… aunque haga 5 h que empezó', est({ pid: 7, compu: 'esta', inicio: hace(5) }, 9, [7]) === 'vivo')
chk('uno cuyo PID ya no vive, de hace 1 h, es "reciente" (no se borra)', est({ pid: 7, compu: 'esta', inicio: hace(1) }, 0, []) === 'reciente')
chk('… y de hace 7 h, "abandonado"', est({ pid: 7, compu: 'esta', inicio: hace(7) }, 0, []) === 'abandonado')
chk('uno que terminó hace 1 h es "reciente" aunque haya empezado hace 8', est({ pid: 7, compu: 'esta', inicio: hace(8), fin: hace(1) }, 9, [7]) === 'reciente')
chk('uno que terminó hace 7 h, "abandonado" (aunque su PID lo use otro proceso)', est({ pid: 7, compu: 'esta', inicio: hace(8), fin: hace(7) }, 9, [7]) === 'abandonado')
chk('un PID "vivo" de hace 13 h es de otro proceso: abandonado', est({ pid: 7, compu: 'esta', inicio: hace(13) }, 0, [7]) === 'abandonado')
chk('uno de OTRA compu no se puede mirar: vivo mientras no pasen 12 h', est({ pid: 7, compu: 'otra', inicio: hace(2) }, 0, []) === 'vivo')
chk('una carpeta sin marca, tocada hace 2 h, es "reciente"', est(null, 2) === 'reciente')
chk('… y tocada hace 7 h, "abandonado"', est(null, 7) === 'abandonado')
chk('una marca rota se juzga por la carpeta', est({ pid: 7, inicio: 'cualquiera' }, 2) === 'reciente' && est({ pid: 7, inicio: 'cualquiera' }, 7) === 'abandonado')
chk('abandonado = más de 6 h; el PID vale hasta 12 h', M.ABANDONO_H === 6 && M.VIDA_MAXIMA_H === 12)
chk('la marca va al lado de la carpeta', M.marcaDe(path.join('x', '.ensayo', '20261028-010203')) === path.join('x', '.ensayo', '20261028-010203.json'))
chk('pidVivo: este proceso vive', M.pidVivo(process.pid) === true)
chk('… un PID inválido no', M.pidVivo(0) === false && M.pidVivo(-3) === false && M.pidVivo(undefined) === false)

;(async () => {
  const os = require('os')
  const { spawnSync } = require('child_process')
  // Un PID que ya no vive: el de un proceso que terminó.
  const muerto = spawnSync(process.execPath, ['-e', '0']).pid
  chk('… uno que terminó no', M.pidVivo(muerto) === false, muerto)
  const ps = await M.puertosLibres(4)
  chk('cuatro puertos libres, distintos (dos por mitad)', ps.length === 4 && new Set(ps).size === 4 && ps.every(p => p > 0), ps)

  // --limpiar de verdad, en un repo de juguete con cuatro carpetas de ensayo.
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ensayo-limpiar-'))
    const g = (...a) => spawnSync('git', a, { cwd: tmp, encoding: 'utf8' })
    g('init', '-q'); g('config', 'user.email', 'x@x'); g('config', 'user.name', 'x')
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'a'); g('add', '.'); g('commit', '-qm', 'a')
    fs.mkdirSync(path.join(tmp, 'pruebas'))
    fs.copyFileSync(ARCHIVO, path.join(tmp, 'pruebas', 'ensayo.js'))
    const E = path.join(tmp, '.ensayo')
    const armar = (nombre, marca) => {
      g('worktree', 'add', '-q', '-b', `ensayo/${nombre}`, `.ensayo/${nombre}`)
      if (marca) fs.writeFileSync(path.join(E, `${nombre}.json`), JSON.stringify({ compu: os.hostname(), ...marca }))
    }
    const ya = Date.now()
    const h = (n) => new Date(ya - n * HORA).toISOString()
    armar('20261028-000001', { pid: process.pid, inicio: h(0) })          // corriendo (este proceso)
    armar('20261028-000002', { pid: muerto, inicio: h(2), fin: h(1) })    // terminó hace 1 h
    armar('20261028-000003', { pid: muerto, inicio: h(7) })              // abandonado
    g('worktree', 'add', '-q', '--detach', '.ensayo/a-mano')            // sin marca, recién hecha
    // Abandonado y que git no puede borrar (como con los nombres largos de Windows): sin su .git, `worktree remove` falla.
    armar('20261028-000004', { pid: muerto, inicio: h(8) })
    fs.rmSync(path.join(E, '20261028-000004', '.git'))
    fs.writeFileSync(path.join(E, 'duraciones.json'), '{}')
    fs.writeFileSync(path.join(E, '20261028-000009.json'), JSON.stringify({ pid: muerto, compu: os.hostname(), inicio: h(1) })) // marca sin carpeta
    fs.writeFileSync(path.join(E, '20261028-000008.json'), JSON.stringify({ pid: process.pid, compu: os.hostname(), inicio: h(0) })) // armando su carpeta
    const limpiar = (...a) => spawnSync(process.execPath, [path.join(tmp, 'pruebas', 'ensayo.js'), '--limpiar', ...a], { cwd: tmp, encoding: 'utf8' })
    let r = limpiar()
    const hay = (n) => fs.existsSync(path.join(E, n))
    chk('--limpiar saltea el ensayo que sigue corriendo', hay('20261028-000001') && hay('20261028-000001.json') && /Salteo .*20261028-000001: su ensayo sigue corriendo/.test(r.stdout), r.stdout + r.stderr)
    chk('… y el que terminó hace menos de 6 h (y dice cómo borrarlo)', hay('20261028-000002') && /--limpiar 20261028-000002/.test(r.stdout))
    chk('… y la carpeta sin marca recién hecha', hay('a-mano'))
    chk('… y borra el abandonado: carpeta, marca y rama', !hay('20261028-000003') && !hay('20261028-000003.json') && !g('branch', '--list', 'ensayo/20261028-000003').stdout.trim(), r.stdout)
    chk('… no toca duraciones.json', hay('duraciones.json'))
    chk('… y si git no puede borrar una, la borra igual (y git se olvida de ella)', !hay('20261028-000004') && !hay('20261028-000004.json') && !/20261028-000004/.test(g('worktree', 'list').stdout), r.stdout + r.stderr)
    chk('… y borra la marca que quedó sin carpeta', !hay('20261028-000009.json'))
    chk('… salvo la de un ensayo vivo que todavía está armando su carpeta', hay('20261028-000008.json'))
    r = limpiar('20261028-000002')
    chk('--limpiar <carpeta> borra esa aunque sea reciente', !hay('20261028-000002') && !hay('20261028-000002.json'), r.stdout + r.stderr)
    r = limpiar('20261028-000001')
    chk('… pero nunca una que sigue corriendo', hay('20261028-000001'), r.stdout)
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  // Con prefijo: cada renglón de la salida sale con él (las dos mitades a la vez).
  {
    const escrito = []
    const original = process.stdout.write.bind(process.stdout)
    process.stdout.write = (t, ...a) => { escrito.push(String(t)); return true }
    let rp
    try { rp = await M.correr('con prefijo', process.execPath, ['-e', "console.log('uno'); console.error('dos'); process.stdout.write('tres')"], __dirname, {}, 0.5, { prefijo: '[2] ' }) }
    finally { process.stdout.write = original }
    const texto = escrito.join('')
    chk('con prefijo, cada renglón lleva el suyo (también los de error y el último sin salto)', /\[2\] uno\n/.test(texto) && /\[2\] dos\n/.test(texto) && /\[2\] tres\n/.test(texto), JSON.stringify(texto))
    chk('… y dice cuántos segundos tardó', rp.ok === true && Number.isInteger(rp.segundos) && rp.segundos >= 0, JSON.stringify(rp))
  }
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
    // Un ZOMBI (estado Z en /proc: ya está muerto, falta que lo recoja el
    // proceso 1) cuenta como cortado. En el contenedor de la nube el proceso 1
    // tarda en recogerlos y kill(pid, 0) los da por vivos (14/10/2026).
    if (nietoVivo) {
      try { if (fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').pop().startsWith('Z')) nietoVivo = false } catch {}
    }
    if (nietoVivo) try { process.kill(pid) } catch {}
  } catch (e) { nietoVivo = 'sin marca: ' + e.message }
  chk('… y se corta también lo que lanzó (el nieto, como el navegador)', nietoVivo === false, String(nietoVivo))
  try { fs.unlinkSync(marca) } catch {}

  console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
  process.exit(fallas.length ? 1 : 0)
})()
