// correr-rama.js (corre solo lo que alcanza lo cambiado) y parecido.js (la
// línea más parecida cuando una mutación no encuentra su texto). 08/10/2026.
//
//   node pruebas/test-correr-rama.js

const fs = require('fs')
const path = require('path')

// Los dos archivos bajo prueba, cambiables por las mutaciones (mut-correr-rama.js).
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, 'correr-rama.js')
const PARECIDO = process.env.ARCHIVO_PARECIDO || path.join(__dirname, 'parecido.js')
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`)
console.log(`COMUN ${PARECIDO} (${fs.readFileSync(PARECIDO, 'utf8').length} bytes)`)
// Node carga como JavaScript un archivo de extensión desconocida (el mut-tmp-*.html).
const { nombra, alcanzados } = require(ARCHIVO)
const { parecido, lineaMasParecida, parteQueFalta, lineasDondeEsta, pistaDeAncla } = require(PARECIDO)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else { fallas.push(nombre); console.log(`  ✗ ${nombre}${detalle !== undefined ? ' — ' + detalle : ''}`) }
}

// ── nombra() ──────────────────────────────────────────────────────────────
chk('una suite nombra una pantalla por su ruta', nombra("path.join(__dirname, '..', 'modulos/stock.html')", 'modulos/stock.html'))
chk('… y no a otra que termina igual', !nombra("'modulos/produccion-gestion.html'", 'modulos/gestion.html'))
chk('… ni a una que solo comparte el final del nombre', !nombra("'modulos/produccion-gestion.html'", 'modulos/produccion.html'))
chk('un require de pruebas/ cuenta', nombra("const { x } = require('./sandbox-produccion')", 'pruebas/sandbox-produccion.js', 'pruebas/test-x.js'))
chk('… también con .js', nombra("require('./mutar.js')", 'pruebas/mutar.js', 'pruebas/mut-x.js'))
chk('un nombre entre comillas cuenta (la suite de un mut)', nombra("path.join(__dirname, 'test-x.js')", 'pruebas/test-x.js', 'pruebas/mut-x.js'))
chk('mencionar una de pruebas/ en un comentario NO cuenta', !nombra('// ver mutar.js (los guards)', 'pruebas/mutar.js', 'pruebas/test-x.js'))
chk('una pantalla NUNCA depende de pruebas/', !nombra("require('./mutar')", 'pruebas/mutar.js', 'modulos/stock.html'))
chk('un js/ tampoco', !nombra("'test-x.js'", 'pruebas/test-x.js', 'js/utils.js'))
chk('un js/ se nombra desde una pantalla', nombra('<script type="module" src="../js/barra-unidad.js">', 'js/barra-unidad.js', 'modulos/stock.html'))

// ── alcanzados(): casos reales del repo ──────────────────────────────────
const deGestion = alcanzados(['modulos/produccion-gestion.html'])
chk('la gestión de Producción alcanza su suite del historial', deGestion.has('pruebas/test-produccion-historial.js'))
chk('… y sus controles', deGestion.has('pruebas/controles-produccion-gestion.js'))
chk('… y la mutación de esa suite (por la suite)', deGestion.has('pruebas/mut-produccion-historial.js'))
chk('… y no a Stock', !deGestion.has('pruebas/test-stock-recuento.js'))
const deHoja = alcanzados(['js/retiros-comun.js'])
chk('la hoja de retiros alcanza su suite', deHoja.has('pruebas/test-retiros-hoja.js'))
chk('… y su mutación', deHoja.has('pruebas/mut-retiros-hoja.js'))
chk('… y las pantallas que la importan', deHoja.has('modulos/retiros.html') && deHoja.has('modulos/administracion.html'))
chk('… y no a Producción', !deHoja.has('pruebas/test-produccion-historial.js'))
const deMutar = alcanzados(['pruebas/mutar.js'])
const muts = fs.readdirSync(__dirname).filter(f => /^mut-.*\.js$/.test(f))
const sinAlcanzar = muts.filter(f => !deMutar.has('pruebas/' + f))
chk('un cambio en mutar.js alcanza a toda mut-*.js que lo usa', sinAlcanzar.every(f => !/require\(['"]\.\/mutar(\.js)?['"]/.test(fs.readFileSync(path.join(__dirname, f), 'utf8'))), sinAlcanzar.join(', '))
chk('… y no a las pantallas', ![...deMutar.keys()].some(f => f.startsWith('modulos/')))
// Que no se ESCAPE ninguna: cada pantalla alcanza las suites que llevan su
// nombre (test-<pantalla>-*.js, mut-<pantalla>-*.js, controles-<pantalla>.js),
// salvo las que, con ese nombre, prueban OTRA pantalla.
const PRUEBAN_OTRA = {
  'controles-cheques.js': 'la cartera vive en administracion.html desde el 26/09/2026',
  'test-produccion-maquinas.js': 'los gráficos de las máquinas son de produccion-gestion.html',
  'mut-produccion-maquinas.js': 'muta produccion-gestion.html',
}
const suites = fs.readdirSync(__dirname).filter(f => /^(test|mut|controles)-.*\.js$/.test(f))
const escapadas = []
for (const h of fs.readdirSync(path.join(__dirname, '..', 'modulos')).filter(f => f.endsWith('.html'))) {
  const n = h.replace(/\.html$/, '')
  const a = alcanzados([`modulos/${h}`])
  for (const s of suites) {
    if (!(s.startsWith(`test-${n}-`) || s.startsWith(`mut-${n}-`) || s === `controles-${n}.js`)) continue
    if (!a.has(`pruebas/${s}`) && !PRUEBAN_OTRA[s]) escapadas.push(`${h} → ${s}`)
  }
}
chk('ninguna suite de una pantalla se escapa de su pantalla', escapadas.length === 0, escapadas.join(', '))
for (const [s, motivo] of Object.entries(PRUEBAN_OTRA)) chk(`la excepción ${s} sigue existiendo (${motivo})`, suites.includes(s))
chk('el motivo dice por qué', /nombra a /.test(deGestion.get('pruebas/test-produccion-historial.js') ?? ''))
chk('lo cambiado dice "cambió"', deGestion.get('modulos/produccion-gestion.html') === 'cambió')

// ── parecido.js ───────────────────────────────────────────────────────────
chk('iguales: 1', parecido('abc', 'abc') === 1)
chk('iguales de una letra (una llave sola): también 1', parecido('}', '}') === 1)
chk('nada en común: 0', parecido('aaaa', 'zzzz') === 0)
chk('parecidos: entre 0 y 1', parecido("return { resultado: 'ok', data }", "return { resultado: 'ok', data: r.data }") > 0.7)
const archivo = 'uno\n  const a = await f(x)\n  return { resultado: \'ok\', data: r.data }\nfin\n'
chk('la línea más parecida, con su número', lineaMasParecida(archivo, "return { resultado: 'ok', data }")?.numero === 3)
chk('de varias líneas, la primera que falta', parteQueFalta(archivo, "  const a = await f(x)\n  return { resultado: 'ok', data }") === "return { resultado: 'ok', data }")
chk('las líneas donde está repetido', JSON.stringify(lineasDondeEsta('a\nX\nb\nX\n', 'X')) === '[2,4]')
const pista = pistaDeAncla(archivo, "  const a = await f(x)\n  return { resultado: 'ok', data }")
chk('la pista dice lo que no está y lo más parecido con la línea', /lo que no está: «return \{ resultado: 'ok', data \}»/.test(pista) && /línea 3, \d+ %/.test(pista), pista)
chk('con un desplazamiento (una región), la línea real', /línea 13,/.test(pistaDeAncla(archivo, "return { resultado: 'ok', data }", 10)))
chk('sin nada parecido, lo dice', /no hay ninguna línea parecida/.test(pistaDeAncla(archivo, 'zzzzqqqqwwww')))
chk('repetido: dice dónde está', /está en las líneas 2, 4/.test(pistaDeAncla('a\nX\nb\nX\n', 'X')))

// ── mutar.js de verdad: un ancla que no existe aborta CON la pista ───────
{
  const os = require('os')
  const { spawnSync } = require('child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'correr-rama-'))
  const archivo = path.join(dir, 'pantalla.html')
  fs.writeFileSync(archivo, "<script>\n  function f() {\n    return { resultado: 'ok', data: r.data }\n  }\n</script>\n")
  const suite = path.join(dir, 'test-falso.js')
  fs.writeFileSync(suite, "const s = require('fs').readFileSync(process.env.ARCHIVO_TEST, 'utf8'); console.log('ARCHIVO ' + process.env.ARCHIVO_TEST + ' (' + s.length + ' bytes)'); console.log('1/1  verde')\n")
  const runner = path.join(dir, 'mut-falso.js')
  // ARCHIVO_MUTAR: la mutación de mut-correr-rama.js (un mut-tmp en pruebas/, así sus require siguen andando).
  const MUTAR = process.env.ARCHIVO_MUTAR || path.join(__dirname, 'mutar.js')
  console.log(`COMUN ${MUTAR} (${fs.readFileSync(MUTAR, 'utf8').length} bytes)`)
  fs.writeFileSync(runner, `require(${JSON.stringify(MUTAR)}).correrMutaciones({ suite: ${JSON.stringify(suite)}, original: ${JSON.stringify(archivo)}, funciones: [], manuales: [{ nombre: 'vieja', de: "return { resultado: 'ok', data }", a: 'x' }] })\n`)
  const r = spawnSync(process.execPath, [runner], { encoding: 'utf8' })
  const salida = (r.stdout || '') + (r.stderr || '')
  chk('mutar.js: un ancla que no existe aborta (no da verde)', r.status === 2, `status ${r.status}`)
  chk('… y dice lo que no está y la línea más parecida del archivo', /NO EXISTE en pantalla\.html/.test(salida) && /lo más parecido \(línea 3, \d+ %\)/.test(salida), salida.slice(0, 400))
  fs.rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${ok}/${ok + fallas.length}  ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
