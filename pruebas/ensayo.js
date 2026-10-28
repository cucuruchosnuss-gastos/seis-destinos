// EL ENSAYO DE INTEGRACIÓN (10/10/2026): antes de integrar ramas a main, las
// une en una rama LOCAL DE DESCARTE, en una carpeta aparte, y corre ahí
// `npm run pruebas` (check-bytes + todas las suites) MÁS las pruebas de
// navegador de las pantallas que tocan esas ramas. No toca main, no sube nada.
//
//   npm run ensayo -- ci-prueba/a ci-prueba/b     → une a y b (en ese orden) y prueba
//   npm run ensayo -- ci-prueba/a --sin-navegador → solo npm run pruebas
//   npm run ensayo -- ci-prueba/a --lista          → une y dice qué pruebas de navegador correría
//   npm run ensayo -- ci-prueba/a --dejar          → no borra la carpeta al terminar
//   npm run ensayo -- --limpiar                    → borra los ensayos ABANDONADOS hace más de 6 h
//   npm run ensayo -- --limpiar <carpeta>          → borra esa, si su ensayo ya no corre
//   BASE=origin/otra npm run ensayo -- ...         → parte de otra rama (por defecto origin/main)
//
// CÓMO: `git worktree add` de una rama `ensayo/<fecha>` en `.ensayo/<fecha>/`
// (adentro del repo, así encuentra node_modules subiendo de carpeta; está en
// .gitignore), y `git merge --no-ff` de cada rama, primero `origin/<rama>` y si
// no existe la local. Si una choca: dice en qué archivos, deshace ESE merge y
// para (los choques se resuelven en la integración de verdad).
//
// QUÉ PRUEBAS DE NAVEGADOR: las de `navegadorAlcanzado()`. Las pantallas que
// alcanza lo cambiado salen de `alcanzados()` de correr-rama.js (un css o un
// js/ alcanza a toda pantalla que lo carga); un spec corre si abre una de esas
// pantallas, si él (o una ayuda de e2e/ que usa) cambió, si cambiaron datos de
// la maqueta que nombra, o si cambió algo que usan todos (la config, el
// servidor, la maqueta). 0-humo.spec.js corre siempre. Nombrar de más hace
// correr de más: el lado seguro.
//
// PUERTOS: Playwright se lanza con puertos LIBRES (E2E_PUERTO, E2E_PUERTO_MAQUETA,
// MAQUETA_URL, E2E_BASE): con los de siempre (4173 / 4180) reutilizaría un
// servidor que ya esté corriendo, y ese sirve OTRA carpeta (otro código).
//
// LAS DOS MITADES A LA VEZ (28/10/2026): los specs elegidos se reparten como
// en GitHub (mitadDe de e2e/mitades.js) y cada mitad corre en su propio
// Playwright, al mismo tiempo, con sus puertos y su carpeta (E2E_SALIDA=1 o 2 →
// e2e/resultados-1/, e2e/resultados-2/). Cada renglón sale con [1] o [2].
//
// Si algo falla, la carpeta queda (para mirar e2e/resultados-1/ y -2/) y se
// dice cómo borrarla. Si todo pasa, se borra sola.
//
// VARIAS SESIONES A LA VEZ (28/10/2026): cada ensayo deja al lado de su
// carpeta un .json con su PID, su compu y su hora (la MARCA). --limpiar saltea
// las carpetas cuyo ensayo sigue vivo y solo borra las abandonadas hace más de
// ABANDONO_H horas (antes borraba todo y tres veces se llevó el ensayo que
// otra sesión tenía corriendo).
'use strict'
const { execFileSync, spawnSync, spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const CARPETA_ENSAYOS = path.join(RAIZ, '.ensayo')

// ── LO PURO: qué pruebas de navegador alcanza lo cambiado ─────────────────
const SIEMPRE_NAVEGADOR = ['0-humo.spec.js']
// Lo que usan todos los specs: si cambia, corren todos (mitades.js lo lee la
// config: un error ahí no deja correr ninguno).
const DE_TODOS = /^e2e\/(playwright\.config|servidor|ayuda|mitades|reporter-tiempos)\.js$|^e2e\/tiempos-navegador\.json$|^e2e\/maqueta\/[^/]+\.js$|^package(-lock)?\.json$/

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Los require('./x') de un archivo de e2e/ (sus ayudas).
function requiresLocales(texto) {
  const out = []
  const re = /require\(\s*['"]\.\/([a-z0-9-]+)(?:\.js)?['"]\s*\)/gi
  let m
  while ((m = re.exec(texto))) out.push(`${m[1]}.js`)
  return out
}

// Las ayudas que usa un spec, directa o indirectamente (nombres de e2e/).
function ayudasDe(nombre, textos, vistos = new Set()) {
  for (const r of requiresLocales(textos.get(nombre) || '')) {
    if (vistos.has(r) || !textos.has(r)) continue
    vistos.add(r)
    ayudasDe(r, textos, vistos)
  }
  return vistos
}

// ¿El texto abre la pantalla? Por su nombre de archivo, sin que sea el final
// de otro (produccion.html no es produccion-gestion.html ni al revés).
function abrePantalla(texto, pagina) {
  const base = path.posix.basename(pagina)
  return new RegExp(`(?<![a-z0-9_-])${esc(base)}`, 'i').test(texto)
}

// ¿El texto usa ese juego de datos de la maqueta (o esa carpeta de diseño)?
function nombraDatos(texto, nombre) {
  return new RegExp(`maqueta=${esc(nombre)}(?![a-z0-9-])|['"\`]${esc(nombre)}['"\`]`, 'i').test(texto)
}

// cambiados: rutas cambiadas ('modulos/stock.html', 'e2e/x.spec.js', ...)
// paginas: las pantallas alcanzadas (rutas .html)
// textos: Map nombre de archivo de e2e/ → texto (los .spec.js y sus ayudas)
// → Map spec → motivo
function navegadorAlcanzado({ cambiados, paginas, textos }) {
  const specs = [...textos.keys()].filter(f => f.endsWith('.spec.js')).sort()
  const motivo = new Map()
  const poner = (s, m) => { if (!motivo.has(s)) motivo.set(s, m) }
  const deTodos = cambiados.find(f => DE_TODOS.test(f))
  for (const s of specs) {
    if (deTodos) { poner(s, `cambió ${deTodos} (lo usan todos)`); continue }
    if (cambiados.includes(`e2e/${s}`)) poner(s, 'cambió')
    const ayudas = ayudasDe(s, textos)
    const ayuda = [...ayudas].find(a => cambiados.includes(`e2e/${a}`))
    if (ayuda) poner(s, `usa ${ayuda}, que cambió`)
    const texto = [s, ...ayudas].map(f => textos.get(f) || '').join('\n')
    const pag = paginas.find(p => abrePantalla(texto, p))
    if (pag) poner(s, `abre ${pag}`)
    for (const f of cambiados) {
      const d = f.match(/^(?:e2e\/maqueta\/datos\/([^/]+)\.json|pruebas\/datos-maqueta\/([^/]+)\.js|e2e\/disenos\/([^/]+)\/)/)
      const nombre = d && (d[1] || d[2] || d[3])
      if (nombre && nombraDatos(texto, nombre)) { poner(s, `usa ${nombre} (cambió ${f})`); break }
    }
    if (SIEMPRE_NAVEGADOR.includes(s)) poner(s, 'siempre')
  }
  return motivo
}

// ── EL ENSAYO ─────────────────────────────────────────────────────────────
function git(args, cwd = RAIZ, opciones = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opciones })
}
function gitOk(args, cwd = RAIZ) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' })
}

// n puertos libres y distintos (se piden todos antes de soltar ninguno).
async function puertosLibres(n) {
  const servidores = []
  for (let i = 0; i < n; i++) {
    servidores.push(await new Promise((resolve, reject) => {
      const s = net.createServer()
      s.once('error', reject)
      s.listen(0, '127.0.0.1', () => resolve(s))
    }))
  }
  const puertos = servidores.map(s => s.address().port)
  await Promise.all(servidores.map(s => new Promise(r => s.close(r))))
  return puertos
}

// ── LA MARCA DE CADA ENSAYO Y --limpiar ────────────────────────────────────
const ABANDONO_H = 6
// Ningún ensayo dura tanto: una marca más vieja con su PID "vivo" es de un
// proceso nuevo que heredó el número, no del ensayo.
const VIDA_MAXIMA_H = 12
const HORA_MS = 3600000

const marcaDe = (dir) => `${dir}.json`

function leerMarca(dir) {
  try { return JSON.parse(fs.readFileSync(marcaDe(dir), 'utf8')) } catch { return null }
}

function escribirMarca(dir, datos) {
  fs.writeFileSync(marcaDe(dir), JSON.stringify(datos, null, 2) + '\n')
}

// ¿Sigue corriendo ese proceso? (kill 0 no mata: solo pregunta.)
function pidVivo(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

// 'vivo' | 'reciente' | 'abandonado'. marca: la del ensayo (o null si la
// carpeta no tiene: una vieja o una que armó alguien a mano); mtimeMs: la
// última vez que cambió la carpeta; vivo(pid) → boolean.
function estadoDe({ marca, mtimeMs, ahora, vivo = pidVivo, compu = os.hostname() }) {
  const inicio = marca ? Date.parse(marca.inicio) : NaN
  if (marca && !marca.fin && ahora - inicio < VIDA_MAXIMA_H * HORA_MS && (marca.compu !== compu || vivo(marca.pid))) return 'vivo'
  let desde = marca ? Date.parse(marca.fin || marca.inicio) : NaN
  if (!Number.isFinite(desde)) desde = mtimeMs
  if (ahora - desde < ABANDONO_H * HORA_MS) return 'reciente'
  return 'abandonado'
}

function borrarEnsayo(dir) {
  const r = gitOk(['worktree', 'remove', '--force', dir])
  if (r.status !== 0 && fs.existsSync(dir)) console.log(`  (no se pudo borrar ${dir}: ${r.stderr.trim()})`)
  const rama = `ensayo/${path.basename(dir)}`
  if (gitOk(['rev-parse', '--verify', '--quiet', `refs/heads/${rama}`]).status === 0) gitOk(['branch', '-D', rama])
  try { fs.unlinkSync(marcaDe(dir)) } catch {}
}

// Las carpetas de ensayo: las de .ensayo/ de esta copia y las de cualquier
// otra copia del repo (git worktree list), sin repetir.
function carpetasDeEnsayo() {
  const out = new Map()
  const poner = (d) => out.set(path.resolve(d).toLowerCase(), path.resolve(d))
  if (fs.existsSync(CARPETA_ENSAYOS)) {
    for (const e of fs.readdirSync(CARPETA_ENSAYOS, { withFileTypes: true })) if (e.isDirectory()) poner(path.join(CARPETA_ENSAYOS, e.name))
  }
  const lista = gitOk(['worktree', 'list', '--porcelain']).stdout || ''
  for (const l of lista.split('\n')) {
    const m = l.match(/^worktree (.*[\\/]\.ensayo[\\/][^\\/]+)$/)
    if (m && fs.existsSync(m[1])) poner(m[1])
  }
  return [...out.values()]
}

const hhmm = (ms) => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

function limpiar(nombre) {
  const ahora = Date.now()
  const carpetas = carpetasDeEnsayo().filter(d => !nombre || path.basename(d) === nombre)
  if (nombre && !carpetas.length) console.log(`No hay ninguna carpeta de ensayo ${nombre}.`)
  if (!nombre && !carpetas.length) console.log('No hay ensayos.')
  for (const dir of carpetas) {
    const marca = leerMarca(dir)
    const estado = estadoDe({ marca, mtimeMs: fs.statSync(dir).mtimeMs, ahora })
    const rel = path.relative(process.cwd(), dir) || dir
    if (estado === 'vivo') { console.log(`Salteo ${rel}: su ensayo sigue corriendo (PID ${marca.pid}, desde las ${hhmm(Date.parse(marca.inicio))}).`); continue }
    if (estado === 'reciente' && !nombre) {
      console.log(`Salteo ${rel}: terminó hace menos de ${ABANDONO_H} h (si es tuya: npm run ensayo -- --limpiar ${path.basename(dir)}).`)
      continue
    }
    console.log(`Borro ${rel}`)
    borrarEnsayo(dir)
  }
  // Las marcas que quedaron sin carpeta (un ensayo cortado antes de armarla).
  if (fs.existsSync(CARPETA_ENSAYOS) && !nombre) {
    for (const f of fs.readdirSync(CARPETA_ENSAYOS)) {
      const m = f.match(/^(\d{8}-\d{6})\.json$/)
      if (!m || fs.existsSync(path.join(CARPETA_ENSAYOS, m[1]))) continue
      const dir = path.join(CARPETA_ENSAYOS, m[1])
      if (estadoDe({ marca: leerMarca(dir), mtimeMs: 0, ahora }) !== 'vivo') try { fs.unlinkSync(marcaDe(dir)) } catch {}
    }
  }
  gitOk(['worktree', 'prune'])
}

// EL TOPE (11/10/2026). Un ensayo quedó colgado horas: una prueba de navegador
// se trabó TRES HORAS "preparando la página" (el navegador no respondía), y el
// tope de 5 minutos por prueba de Playwright no la cortó porque la traba fue al
// preparar/limpiar el navegador, no adentro de la prueba. Ahora cada paso tiene
// un tope en minutos: si se pasa, se corta TODO el árbol de procesos (en
// Windows `taskkill /T /F`: el navegador y los servidores son nietos) y el paso
// da ROJO diciendo que se colgó. Además Playwright corre con --global-timeout
// un poco antes del tope, así casi siempre termina él solo y deja su informe.
//
// LOS TOPES SALEN DE LA ÚLTIMA CORRIDA (28/10/2026, ensayo-confiable). Los fijos
// (20 min las suites, 45 el navegador) quedaron cortos: las suites ya tardan
// 21-23 min solas y cortaban ensayos sanos. Ahora:
//  - las suites: lo que tardó la última corrida en verde + MARGEN (30 %), nunca
//    menos de 25 min ni más de 120; sin datos, 35.
//  - el navegador, por mitad: los segundos de GitHub de los specs de esa mitad
//    (e2e/tiempos-navegador.json) × cuánto más lento corrió la compu la última
//    vez en verde (el FACTOR) + MARGEN; nunca menos de 15 min ni más de 120;
//    sin datos, factor 2,5.
//  - si un paso se cortó DESPUÉS de su última corrida en verde, el siguiente
//    tope es el del corte + MARGEN: sin eso, una compu más lenta (o dos
//    ensayos a la vez) cortaría siempre en el mismo lugar.
// Lo medido va a .ensayo/duraciones.json de la copia principal del repo
// (ignorado por git, el mismo para todas las copias de trabajo).
// ENSAYO_TOPE_PRUEBAS_MIN / ENSAYO_TOPE_NAVEGADOR_MIN fijan un tope a mano.
const MARGEN = 1.3
const TOPE_PRUEBAS = { minimo: 25, sinDatos: 35, maximo: 120 }
const TOPE_NAVEGADOR = { minimo: 15, factorSinDatos: 2.5, maximo: 120 }
const TOPE_PRUEBAS_FIJO = Number(process.env.ENSAYO_TOPE_PRUEBAS_MIN) || null
const TOPE_NAVEGADOR_FIJO = Number(process.env.ENSAYO_TOPE_NAVEGADOR_MIN) || null

// Lo que cuenta de un paso: lo de su última corrida en verde, o lo de su
// último corte si fue después (lo que sea mayor). { verde, corte } → número o null.
function medidaDe(registro) {
  const { verde, corte } = registro || {}
  let m = verde ? verde.valor : null
  if (corte && (!verde || corte.fecha > verde.fecha)) m = Math.max(m ?? 0, corte.valor)
  return m
}

const entre = (min, x, max) => Math.min(max, Math.max(min, x))

// En minutos. registro: el de las suites (valor = segundos).
function topePruebasMin(registro) {
  if (TOPE_PRUEBAS_FIJO) return TOPE_PRUEBAS_FIJO
  const seg = medidaDe(registro)
  if (seg === null) return TOPE_PRUEBAS.sinDatos
  return entre(TOPE_PRUEBAS.minimo, Math.ceil(seg * MARGEN / 60), TOPE_PRUEBAS.maximo)
}

// En minutos, para una mitad que en GitHub tarda estimadoSeg. registro: el del
// navegador (valor = factor: segundos en la compu / segundos en GitHub).
function topeNavegadorMin(registro, estimadoSeg) {
  if (TOPE_NAVEGADOR_FIJO) return TOPE_NAVEGADOR_FIJO
  const factor = medidaDe(registro) ?? TOPE_NAVEGADOR.factorSinDatos
  return entre(TOPE_NAVEGADOR.minimo, Math.ceil(estimadoSeg * factor * MARGEN / 60), TOPE_NAVEGADOR.maximo)
}

// Anota en el registro de un paso cómo le fue: verde (con su valor) o cortado
// (con el valor que le tocaba al tope). Devuelve el registro nuevo.
function anotar(registro, { verde, corte }, fecha = new Date().toISOString()) {
  const r = { ...(registro || {}) }
  if (verde !== undefined) r.verde = { valor: verde, fecha }
  if (corte !== undefined) r.corte = { valor: corte, fecha }
  return r
}

// .ensayo/duraciones.json de la copia PRINCIPAL (la de .git): así lo comparten
// todas las copias de trabajo (git worktree) y nunca se commitea.
function archivoDuraciones() {
  let comun = gitOk(['rev-parse', '--git-common-dir']).stdout.trim()
  if (!comun) return path.join(CARPETA_ENSAYOS, 'duraciones.json')
  comun = path.resolve(RAIZ, comun)
  return path.join(path.dirname(comun), '.ensayo', 'duraciones.json')
}

function leerDuraciones(archivo = archivoDuraciones()) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')) } catch { return {} }
}

// Relee antes de escribir: otro ensayo pudo anotar lo suyo mientras tanto.
function guardarDuracion(paso, resultado, archivo = archivoDuraciones()) {
  const todo = leerDuraciones(archivo)
  todo[paso] = anotar(todo[paso], resultado)
  fs.mkdirSync(path.dirname(archivo), { recursive: true })
  fs.writeFileSync(archivo, JSON.stringify(todo, null, 2) + '\n')
}

// El --global-timeout de Playwright, en ms: 3 minutos antes del tope (o la
// mitad del tope si es muy corto), para que Playwright corte primero.
function globalTimeoutMs(topeMin) {
  const margen = Math.min(3, topeMin / 2)
  return Math.round((topeMin - margen) * 60000)
}

// Los argumentos de Playwright para el ensayo, con su --global-timeout.
function argsNavegador(cli, specs, topeMin) {
  return [cli, 'test', '--config', 'e2e/playwright.config.js', `--global-timeout=${globalTimeoutMs(topeMin)}`, ...specs.map(s => `e2e/${s}`)]
}

// Los descendientes de un proceso (hijos, nietos…), en Linux / Mac, con `ps`.
// Hace falta porque un proceso lanzado "separado" (como el navegador de
// Playwright) arma su propio grupo y el corte por grupo no lo alcanza.
function descendientes(pid) {
  const r = spawnSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' })
  const hijos = new Map()
  for (const l of (r.stdout || '').split('\n')) {
    const [p, pp] = l.trim().split(/\s+/).map(Number)
    if (!p) continue
    if (!hijos.has(pp)) hijos.set(pp, [])
    hijos.get(pp).push(p)
  }
  const todos = []
  const pendientes = [pid]
  while (pendientes.length) for (const h of hijos.get(pendientes.pop()) || []) { todos.push(h); pendientes.push(h) }
  return todos
}

// Corta el proceso y TODO lo que lanzó.
function matarArbol(hijo) {
  if (process.platform === 'win32') {
    try { spawnSync('taskkill', ['/PID', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' }) } catch {}
    return
  }
  for (const p of descendientes(hijo.pid)) try { process.kill(p, 'SIGKILL') } catch {}
  try { process.kill(-hijo.pid, 'SIGKILL') } catch {}
  try { hijo.kill('SIGKILL') } catch {}
}

// Copia una salida al stdout con un prefijo en cada renglón ("[1] ", "[2] "):
// las dos mitades del navegador escriben a la vez.
function conPrefijo(stream, prefijo) {
  let resto = ''
  stream.setEncoding('utf8')
  stream.on('data', (d) => {
    const lineas = (resto + d).split('\n')
    resto = lineas.pop()
    for (const l of lineas) process.stdout.write(prefijo + l + '\n')
  })
  stream.on('end', () => { if (resto) process.stdout.write(prefijo + resto + '\n') })
}

// Corre un paso con su tope. Devuelve una promesa de { ok, colgado, segundos }.
// prefijo: si viene, la salida va con ese prefijo en cada renglón.
function correr(titulo, cmd, args, cwd, env, topeMin, { prefijo } = {}) {
  console.log(`\n══ ${titulo} (tope ${topeMin} min) ══`)
  const t0 = Date.now()
  return new Promise((resolver) => {
    const hijo = spawn(cmd, args, { cwd, stdio: prefijo ? ['ignore', 'pipe', 'pipe'] : 'inherit', env: { ...process.env, ...env }, detached: process.platform !== 'win32' })
    if (prefijo) { conPrefijo(hijo.stdout, prefijo); conPrefijo(hijo.stderr, prefijo) }
    let colgado = false
    const reloj = setTimeout(() => {
      colgado = true
      console.log(`\n### ${titulo}: pasaron ${topeMin} minutos y no terminó: SE COLGÓ. Corto todo lo que lanzó.`)
      matarArbol(hijo)
    }, topeMin * 60000)
    const fin = (ok) => { clearTimeout(reloj); resolver({ ok, colgado, segundos: Math.round((Date.now() - t0) / 1000) }) }
    hijo.on('exit', (codigo) => fin(!colgado && codigo === 0))
    hijo.on('error', () => fin(false))
  })
}

// Los specs elegidos, repartidos como en GitHub. mitadDe: la de e2e/mitades.js
// (de la carpeta del ensayo). → [specs de la 1, specs de la 2]
function porMitad(specs, mitadDe) {
  return [1, 2].map(n => specs.filter(s => mitadDe(s) === n))
}

// Cómo le fue al navegador, para anotar: corridas = [{ ok, colgado, segundos,
// estimado, tope }] (null la mitad que no tenía specs).
//  - todas las que corrieron en verde → verde: el factor más alto;
//  - alguna cortada → corte: el factor que tenía su tope;
//  - roja sin cortarse → nada (no dice nada del tiempo).
function resultadoNavegador(corridas) {
  const hechas = corridas.filter(Boolean)
  const factor = (seg, c) => Math.round(seg / Math.max(1, c.estimado) * 100) / 100
  const cortadas = hechas.filter(c => c.colgado)
  if (cortadas.length) return { corte: Math.max(...cortadas.map(c => factor(c.tope * 60, c))) }
  if (hechas.length && hechas.every(c => c.ok)) return { verde: Math.max(...hechas.map(c => factor(c.segundos, c))) }
  return {}
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--limpiar')) return limpiar(args.find(a => !a.startsWith('--')))
  const ramas = args.filter(a => !a.startsWith('--'))
  const sinNavegador = args.includes('--sin-navegador')
  const soloLista = args.includes('--lista')
  const dejar = args.includes('--dejar')
  const BASE = process.env.BASE || 'origin/main'
  if (!ramas.length) { console.log('Uso: npm run ensayo -- <rama> [<rama> ...] [--sin-navegador] [--lista] [--dejar]'); process.exit(2) }

  console.log('Traigo lo último de GitHub (git fetch)…')
  git(['fetch', '--quiet', '--prune', 'origin'])
  const refs = ramas.map(r => {
    const remota = `origin/${r.replace(/^origin\//, '')}`
    const sha = (ref) => { const x = gitOk(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return x.status === 0 ? x.stdout.trim() : null }
    if (sha(remota) && sha(r) && sha(remota) !== sha(r)) console.log(`AVISO: ${r} de esta compu no es igual a la de GitHub: se ensaya la de GitHub (${sha(remota).slice(0, 7)}). ¿Falta un push?`)
    for (const ref of [remota, r]) {
      if (gitOk(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0) return ref
    }
    console.log(`No existe la rama ${r} (ni en GitHub ni acá).`); process.exit(2)
  })

  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-')
  const dir = path.join(CARPETA_ENSAYOS, sello)
  const rel = path.relative(RAIZ, dir).replace(/\\/g, '/')
  fs.mkdirSync(CARPETA_ENSAYOS, { recursive: true })
  // La marca va ANTES de armar la carpeta: un --limpiar de otra sesión nunca
  // ve la carpeta sin su marca. Al salir (bien o mal) anota la hora de fin.
  const marca = { pid: process.pid, compu: os.hostname(), inicio: new Date().toISOString(), ramas }
  escribirMarca(dir, marca)
  process.on('exit', () => { if (fs.existsSync(marcaDe(dir))) try { escribirMarca(dir, { ...marca, fin: new Date().toISOString() }) } catch {} })
  git(['worktree', 'add', '--quiet', '-b', `ensayo/${sello}`, rel, BASE])
  console.log(`Carpeta de descarte: ${rel} (rama local ensayo/${sello}, desde ${BASE} ${git(['rev-parse', '--short', BASE]).trim()})`)

  const resumen = []
  for (const ref of refs) {
    const r = gitOk(['merge', '--no-ff', '--no-edit', '-m', `Ensayo: une ${ref}`, ref], dir)
    if (r.status !== 0) {
      const choques = gitOk(['diff', '--name-only', '--diff-filter=U'], dir).stdout.trim().split('\n').filter(Boolean)
      gitOk(['merge', '--abort'], dir)
      console.log(`\n✗ ${ref} CHOCA con lo anterior${choques.length ? ' en:' : ''}`)
      for (const c of choques) console.log(`    ${c}`)
      if (!choques.length) console.log(r.stdout + r.stderr)
      console.log('\nSe resuelve en la integración de verdad (quedándose con lo de todos los lados). El ensayo para acá.')
      if (!dejar) borrarEnsayo(dir)
      process.exit(1)
    }
    resumen.push(`  ✓ ${ref} (${git(['rev-parse', '--short', ref]).trim()}) se une sin chocar`)
  }
  console.log('\n' + resumen.join('\n'))

  const cambiados = git(['diff', '--name-only', `${BASE}...HEAD`], dir).split('\n').map(s => s.trim()).filter(Boolean)
  console.log(`\n${cambiados.length} archivos cambian contra ${BASE}.`)

  // Las pantallas alcanzadas y los specs, con el código DE LA CARPETA de ensayo.
  const { alcanzados } = require(path.join(dir, 'pruebas', 'correr-rama.js'))
  const paginas = [...alcanzados(cambiados).keys()].filter(f => f.endsWith('.html'))
  const e2e = path.join(dir, 'e2e')
  const textos = new Map(fs.readdirSync(e2e).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(e2e, f), 'utf8')]))
  const specs = navegadorAlcanzado({ cambiados, paginas, textos })
  console.log(`Pantallas alcanzadas: ${paginas.length ? paginas.join(', ') : 'ninguna'}`)
  console.log(`Pruebas de navegador que corresponden (${specs.size}):`)
  for (const [s, m] of specs) console.log(`  ${s.padEnd(40)} ${m}`)
  if (soloLista) { if (!dejar) borrarEnsayo(dir); return }

  const duraciones = leerDuraciones()
  const topePruebas = topePruebasMin(duraciones.suites)
  const bytes = await correr('check-bytes', process.execPath, ['pruebas/check-bytes.js'], dir, {}, topePruebas)
  const suites = bytes.ok ? await correr('suites (correr-todo)', process.execPath, ['pruebas/correr-todo.js'], dir, {}, topePruebas) : { ok: false, colgado: false }
  if (suites.ok) guardarDuracion('suites', { verde: suites.segundos })
  else if (suites.colgado) guardarDuracion('suites', { corte: topePruebas * 60 })
  const pruebasOk = bytes.ok && suites.ok
  const pruebasColgadas = bytes.colgado || suites.colgado

  let navegadorOk = null
  let lineaNavegador = 'no se corrió (--sin-navegador)'
  if (!sinNavegador) {
    const cli = path.join(RAIZ, 'node_modules', '@playwright', 'test', 'cli.js')
    if (!fs.existsSync(cli)) { console.log('\nFalta Playwright: corré `npm ci` en la carpeta del repo.'); navegadorOk = false; lineaNavegador = 'ROJO: falta Playwright' }
    else {
      // Las dos mitades, como en GitHub y a la vez, con el reparto de la carpeta de ensayo.
      const mitades = require(path.join(dir, 'e2e', 'mitades.js'))
      const listas = porMitad([...specs.keys()], mitades.mitadDe)
      const puertos = await puertosLibres(4)
      const corridas = await Promise.all(listas.map(async (lista, i) => {
        if (!lista.length) return null
        const n = i + 1
        const estimado = lista.reduce((a, s) => a + mitades.tiempoDe(s), 0)
        const tope = topeNavegadorMin(duraciones.navegador, estimado)
        const [p1, p2] = puertos.slice(i * 2, i * 2 + 2)
        const r = await correr(`navegador, mitad ${n} (${lista.length} specs, ~${estimado} s en GitHub, puertos ${p1} y ${p2})`, process.execPath,
          argsNavegador(cli, lista, tope), dir,
          { E2E_PUERTO: String(p1), E2E_PUERTO_MAQUETA: String(p2), MAQUETA_URL: `http://localhost:${p2}`, E2E_BASE: `http://localhost:${p1}`, E2E_SALIDA: String(n), CI: '' },
          tope, { prefijo: `[${n}] ` })
        return { ...r, n, estimado, tope }
      }))
      const resultado = resultadoNavegador(corridas)
      if (Object.keys(resultado).length) guardarDuracion('navegador', resultado)
      const hechas = corridas.filter(Boolean)
      navegadorOk = hechas.every(c => c.ok)
      lineaNavegador = hechas.map(c => `mitad ${c.n} ${c.ok ? 'VERDE' : c.colgado ? `ROJO: SE COLGÓ (cortada a los ${c.tope} min)` : 'ROJO'} (${Math.round(c.segundos / 60)} min)`).join(' · ') || 'VERDE (ningún spec)'
    }
  }

  console.log('\n══ RESUMEN DEL ENSAYO ══')
  console.log(resumen.join('\n'))
  console.log(`  npm run pruebas: ${pruebasOk ? `VERDE (${Math.round(suites.segundos / 60)} min)` : pruebasColgadas ? `ROJO: SE COLGÓ (cortado a los ${topePruebas} min)` : 'ROJO'}`)
  console.log(`  navegador: ${lineaNavegador}`)
  const ok = pruebasOk && navegadorOk !== false
  if (ok && !dejar) { borrarEnsayo(dir); console.log('  Todo en verde: la carpeta de descarte se borró.') }
  else console.log(`  La carpeta queda en ${rel} (mirá e2e/resultados-1/ y -2/). Para borrarla: npm run ensayo -- --limpiar ${sello}`)
  process.exit(ok ? 0 : 1)
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })

module.exports = { navegadorAlcanzado, abrePantalla, nombraDatos, requiresLocales, ayudasDe, SIEMPRE_NAVEGADOR, DE_TODOS,
  correr, globalTimeoutMs, argsNavegador, puertosLibres, porMitad, resultadoNavegador,
  medidaDe, topePruebasMin, topeNavegadorMin, anotar, leerDuraciones, guardarDuracion, archivoDuraciones, MARGEN, TOPE_PRUEBAS, TOPE_NAVEGADOR,
  estadoDe, pidVivo, leerMarca, escribirMarca, marcaDe, carpetasDeEnsayo, ABANDONO_H, VIDA_MAXIMA_H }
