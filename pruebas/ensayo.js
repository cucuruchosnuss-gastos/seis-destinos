// EL ENSAYO DE INTEGRACIÓN (10/10/2026): antes de integrar ramas a main, las
// une en una rama LOCAL DE DESCARTE, en una carpeta aparte, y corre ahí
// `npm run pruebas` (check-bytes + todas las suites) MÁS las pruebas de
// navegador de las pantallas que tocan esas ramas. No toca main, no sube nada.
//
//   npm run ensayo -- ci-prueba/a ci-prueba/b     → une a y b (en ese orden) y prueba
//   npm run ensayo -- ci-prueba/a --sin-navegador → solo npm run pruebas
//   npm run ensayo -- ci-prueba/a --lista          → une y dice qué pruebas de navegador correría
//   npm run ensayo -- ci-prueba/a --dejar          → no borra la carpeta al terminar
//   npm run ensayo -- --limpiar                    → borra las carpetas de ensayos viejos
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
// Si algo falla, la carpeta queda (para mirar e2e/resultados/) y se dice cómo
// borrarla. Si todo pasa, se borra sola.
'use strict'
const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const CARPETA_ENSAYOS = path.join(RAIZ, '.ensayo')

// ── LO PURO: qué pruebas de navegador alcanza lo cambiado ─────────────────
const SIEMPRE_NAVEGADOR = ['0-humo.spec.js']
// Lo que usan todos los specs: si cambia, corren todos.
const DE_TODOS = /^e2e\/(playwright\.config|servidor|ayuda)\.js$|^e2e\/maqueta\/[^/]+\.js$|^package(-lock)?\.json$/

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

function puertoLibre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
  })
}

function borrarEnsayo(dir) {
  const rel = path.relative(RAIZ, dir)
  const r = gitOk(['worktree', 'remove', '--force', rel])
  if (r.status !== 0) console.log(`  (no se pudo borrar ${rel}: ${r.stderr.trim()})`)
  const rama = `ensayo/${path.basename(dir)}`
  if (gitOk(['rev-parse', '--verify', '--quiet', `refs/heads/${rama}`]).status === 0) gitOk(['branch', '-D', rama])
}

function limpiar() {
  if (!fs.existsSync(CARPETA_ENSAYOS)) { console.log('No hay ensayos viejos.'); return }
  for (const d of fs.readdirSync(CARPETA_ENSAYOS)) { console.log(`Borro .ensayo/${d}`); borrarEnsayo(path.join(CARPETA_ENSAYOS, d)) }
  gitOk(['worktree', 'prune'])
}

function correr(titulo, cmd, args, cwd, env) {
  console.log(`\n══ ${titulo} ══`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } })
  return r.status === 0
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--limpiar')) return limpiar()
  const ramas = args.filter(a => !a.startsWith('--'))
  const sinNavegador = args.includes('--sin-navegador')
  const soloLista = args.includes('--lista')
  const dejar = args.includes('--dejar')
  const BASE = process.env.BASE || 'origin/main'
  if (!ramas.length) { console.log('Uso: npm run ensayo -- <rama> [<rama> ...] [--sin-navegador] [--lista] [--dejar]'); process.exit(2) }

  console.log('Traigo lo último de GitHub (git fetch)…')
  git(['fetch', '--quiet', '--prune', 'origin'])
  const refs = ramas.map(r => {
    for (const ref of [`origin/${r.replace(/^origin\//, '')}`, r]) {
      if (gitOk(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0) return ref
    }
    console.log(`No existe la rama ${r} (ni en GitHub ni acá).`); process.exit(2)
  })

  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-')
  const dir = path.join(CARPETA_ENSAYOS, sello)
  const rel = path.relative(RAIZ, dir).replace(/\\/g, '/')
  fs.mkdirSync(CARPETA_ENSAYOS, { recursive: true })
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

  const pruebasOk = correr('npm run pruebas', process.execPath, ['pruebas/check-bytes.js'], dir) &&
    correr('suites (correr-todo)', process.execPath, ['pruebas/correr-todo.js'], dir)

  let navegadorOk = null
  if (!sinNavegador) {
    const cli = path.join(RAIZ, 'node_modules', '@playwright', 'test', 'cli.js')
    if (!fs.existsSync(cli)) { console.log('\nFalta Playwright: corré `npm ci` en la carpeta del repo.'); navegadorOk = false }
    else {
      const [p1, p2] = [await puertoLibre(), await puertoLibre()]
      navegadorOk = correr(`navegador (${specs.size} specs, puertos ${p1} y ${p2})`, process.execPath,
        [cli, 'test', '--config', 'e2e/playwright.config.js', ...[...specs.keys()].map(s => `e2e/${s}`)], dir,
        { E2E_PUERTO: String(p1), E2E_PUERTO_MAQUETA: String(p2), MAQUETA_URL: `http://localhost:${p2}`, E2E_BASE: `http://localhost:${p1}`, CI: '' })
    }
  }

  console.log('\n══ RESUMEN DEL ENSAYO ══')
  console.log(resumen.join('\n'))
  console.log(`  npm run pruebas: ${pruebasOk ? 'VERDE' : 'ROJO'}`)
  console.log(`  navegador: ${navegadorOk === null ? 'no se corrió (--sin-navegador)' : navegadorOk ? 'VERDE' : 'ROJO'}`)
  const ok = pruebasOk && navegadorOk !== false
  if (ok && !dejar) { borrarEnsayo(dir); console.log('  Todo en verde: la carpeta de descarte se borró.') }
  else console.log(`  La carpeta queda en ${rel} (mirá e2e/resultados/). Para borrarla: npm run ensayo -- --limpiar`)
  process.exit(ok ? 0 : 1)
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })

module.exports = { navegadorAlcanzado, abrePantalla, nombraDatos, requiresLocales, ayudasDe, SIEMPRE_NAVEGADOR, DE_TODOS }
