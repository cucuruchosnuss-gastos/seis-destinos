// Corre SOLO lo que toca lo que cambió la rama contra main (08/10/2026): las
// suites test-*.js y controles-*.js (o las mut-*.js con "mut") que nombran,
// directa o indirectamente, un archivo cambiado.
//
//   node pruebas/correr-rama.js            → check-scripts + las suites alcanzadas
//   node pruebas/correr-rama.js mut        → las mut-*.js alcanzadas, de a una
//   node pruebas/correr-rama.js lista      → solo dice qué correría y por qué
//   node pruebas/correr-rama.js mut lista  → lo mismo, para las mutaciones
//   BASE=origin/otra node pruebas/correr-rama.js   → contra otra rama (por defecto origin/main)
//
// (npm run pruebas:rama / npm run mutaciones:rama)
//
// QUÉ CUENTA COMO CAMBIADO: lo commiteado en la rama desde que se separó de la
// base (git diff BASE...HEAD) MÁS lo que está sin commitear o sin agregar.
//
// QUÉ CUENTA COMO ALCANZADO: un archivo que NOMBRA a uno cambiado (su nombre
// con extensión, o "./nombre" para un require de pruebas/), y de ahí en más lo
// que nombra a ese, hasta que no aparece nada nuevo. Así un cambio en
// modulos/produccion.html alcanza a sandbox-produccion.js y, por ella, a cada
// suite que la usa; uno en js/utils.js alcanza a casi todo (es lo que es).
// Nombrar de más hace correr de más, que es el lado seguro: nunca de menos.
//
// NO REEMPLAZA a `npm run pruebas` antes de integrar: es para ir rápido
// mientras se trabaja. Las suites que no nombran nada (leen todo el repo, como
// test-ids-unicos.js o test-embeds-ambiguos.js) entran por SIEMPRE_SUITES.
'use strict'
const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const args = process.argv.slice(2)
const modo = args.includes('mut') ? 'mut' : ''
const soloLista = args.includes('lista')
const BASE = process.env.BASE || 'origin/main'

// Las que recorren el repo entero sin nombrar archivos: corren siempre.
const SIEMPRE_SUITES = ['check-scripts.js', 'test-ids-unicos.js', 'test-embeds-ambiguos.js', 'test-baselines.js', 'test-comillas.js']

// Ayudas de pruebas/ que leen los js/ que importe CUALQUIER pantalla (no uno fijo).
const GENERICAS = [
  'pruebas/imports.js',          // sigue los import de la pantalla
  'pruebas/fuente-cobranzas.js', // pega cobranzas-comun / retiros-comun / modulos.js si la pantalla los importa
]

function git(args) {
  return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function cambiados() {
  const lista = new Set()
  const agregar = (salida) => salida.split('\n').map(s => s.trim()).filter(Boolean).forEach(f => lista.add(f.replace(/\\/g, '/')))
  agregar(git(['diff', '--name-only', `${BASE}...HEAD`]))
  agregar(git(['diff', '--name-only', 'HEAD']))
  agregar(git(['ls-files', '--others', '--exclude-standard']))
  return [...lista]   // un archivo borrado también cuenta: lo que lo nombraba tiene que correr
}

// Los archivos donde se buscan nombres: pruebas/, js/, modulos/, los html de la raíz y css/.
function candidatos() {
  const out = []
  const leerDir = (dir, re) => {
    const d = path.join(RAIZ, dir)
    if (!fs.existsSync(d)) return
    for (const f of fs.readdirSync(d)) if (re.test(f)) out.push(dir ? `${dir}/${f}` : f)
  }
  leerDir('pruebas', /\.js$/)
  leerDir('js', /\.js$/)
  leerDir('modulos', /\.html$/)
  leerDir('', /\.html$/)
  leerDir('css', /\.css$/)
  return out.filter(f => !/^pruebas\/mut-tmp-/.test(f))
}

// ¿`quien` (con su texto) usa a `archivo`?
//  - Una pantalla, un js/ o un css NUNCA usa algo de pruebas/ (un comentario que
//    nombra una suite no la vuelve una dependencia).
//  - Algo de pruebas/ se usa por require('./nombre') o por su nombre entre
//    comillas ('test-x.js', path.join(__dirname, 'sandbox-x.js')); mencionarlo
//    en un comentario no cuenta.
//  - Desde pruebas/, una pantalla, un js/ o un css se usan por su nombre entre
//    comillas ('modulos/stock.html', path.join(__dirname, '..', 'js', 'x.js')).
//  - Entre pantallas y js/ cuenta SOLO un import o un <script src> (un link a
//    otra pantalla o un comentario que nombra un archivo no son dependencias);
//    un css, por su <link href>. Una pantalla nunca depende de otra pantalla.
function nombra(texto, archivo, quien = 'pruebas/') {
  const base = path.posix.basename(archivo)
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const entreComillas = new RegExp(`['"](?:[^'"\\n]*/)?${esc(base)}['"]`)
  if (archivo.startsWith('pruebas/')) {
    if (!quien.startsWith('pruebas/')) return false
    const sin = base.replace(/\.js$/, '')
    return new RegExp(`require\\(\\s*['"]\\./${esc(sin)}(\\.js)?['"]`).test(texto) || entreComillas.test(texto)
  }
  // Las GENÉRICAS siguen los import de cualquier pantalla y nombran los js/ en
  // una tabla: eso no es una dependencia (la pantalla que importa el js/ ya
  // queda alcanzada por su import, y con ella sus suites).
  if (GENERICAS.includes(quien)) return false
  if (quien.startsWith('pruebas/')) return entreComillas.test(texto)
  const ruta = `['"](?:[^'"\\n]*/)?${esc(base)}['"]`
  if (archivo.endsWith('.js')) return new RegExp(`(?:src=|from\\s*|import\\s*\\(\\s*)${ruta}`).test(texto)
  if (archivo.endsWith('.css')) return new RegExp(`href=${ruta}`).test(texto)
  return false
}

// El cierre: lo cambiado y todo lo que lo nombra, hasta que no aparezca nada nuevo.
function alcanzados(lista) {
  const textos = new Map(candidatos().map(f => [f, fs.readFileSync(path.join(RAIZ, f), 'utf8')]))
  const porque = new Map(lista.map(f => [f, 'cambió']))
  let nuevos = [...lista]
  while (nuevos.length) {
    const siguiente = []
    for (const [f, t] of textos) {
      if (porque.has(f)) continue
      const quien = nuevos.find(n => nombra(t, n, f))   // f no está en nuevos: ya se salteó si estaba alcanzado
      if (quien) { porque.set(f, `nombra a ${quien}`); siguiente.push(f) }
    }
    nuevos = siguiente
  }
  return porque
}

function plan() {
  const lista = cambiados()
  const porque = alcanzados(lista)
  const enPruebas = [...porque.keys()].filter(f => f.startsWith('pruebas/')).map(f => f.slice(8))
  let trabajos
  if (modo === 'mut') trabajos = enPruebas.filter(f => /^mut-.*\.js$/.test(f))
  else {
    trabajos = [...new Set([...SIEMPRE_SUITES.filter(f => fs.existsSync(path.join(__dirname, f))),
      ...enPruebas.filter(f => /^test-.*\.js$/.test(f) || (/^controles-.*\.js$/.test(f) && f !== 'controles-comun.js'))])]
  }
  return { lista, porque, trabajos: trabajos.sort() }
}

if (require.main === module) {
  const { lista, porque, trabajos } = plan()
  console.log(`Contra ${BASE}: ${lista.length} ${lista.length === 1 ? 'archivo cambiado' : 'archivos cambiados'}.`)
  for (const f of lista) console.log('  · ' + f)
  if (soloLista) {
    console.log(`\nCorrería ${trabajos.length}:`)
    for (const t of trabajos) console.log(`  ${t.padEnd(46)} ${porque.get('pruebas/' + t) ?? 'siempre'}`)
    process.exit(0)
  }
  if (!trabajos.length) { console.log('\nNada que correr: ningún archivo de pruebas/ nombra lo que cambió.'); process.exit(0) }
  console.log(`\nCorro ${trabajos.length} (de lo que alcanza el cambio).\n`)
  const r = spawnSync(process.execPath, [path.join(__dirname, 'correr-todo.js'), ...(modo === 'mut' ? ['mut'] : [])], {
    cwd: RAIZ, stdio: 'inherit', env: { ...process.env, SOLO: trabajos.join(',') },
  })
  process.exit(r.status ?? 1)
}

module.exports = { nombra, alcanzados, plan, SIEMPRE_SUITES }
