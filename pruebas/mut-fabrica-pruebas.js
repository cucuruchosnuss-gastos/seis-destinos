// Mutaciones de test-fabrica-pruebas.js sobre js/utils.js. Mismos guards que
// mut-numeros.js: suite verde sobre el limpio, ancla ÚNICA, la mutación tiene
// que cambiar el archivo, y el sub-proceso tiene que haber leído el mutado.
//
//   node pruebas/mut-fabrica-pruebas.js

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const SUITE = path.join(__dirname, 'test-fabrica-pruebas.js')
const ORIGINAL = process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'utils.js')
const TMP = path.join(__dirname, 'mut-tmp-utils-fabrica.js')

const MUTACIONES = [
  ['no filtra por es_prueba', ".eq('es_prueba', true)", ''],
  ['las personas no se piden por unidad', "select('id').in('unidad_negocio_id', [...unidades])", "select('id')"],
  ['soyDePrueba ignora la marca propia', "yo.data?.es_prueba === true || ", ''],
  ['soyDePrueba ignora la unidad propia', " || unidades.has(yo.data?.unidad_negocio_id)", ''],
  ['el error de las personas se traga', "    if (per.error) throw per.error", ''],
  ['el error propio se traga', "    if (yo.error) throw yo.error", ''],
  ['el catch deja pasar la excepción', "    console.warn('No se pudo leer la fábrica de pruebas; no se filtra nada.', e)", "throw e"],
  ['la cuenta de prueba también filtra unidades', "if (!Array.isArray(filas) || !fabrica || fabrica.soyDePrueba || !fabrica.unidades?.size) return filas ?? []", "if (!Array.isArray(filas) || !fabrica || !fabrica.unidades?.size) return filas ?? []"],
  ['el filtro de unidades se invierte', "return filas.filter(f => !fabrica.unidades.has(clave(f)))", "return filas.filter(f => fabrica.unidades.has(clave(f)))"],
  ['la cuenta de prueba también filtra personas', "if (!Array.isArray(filas) || !fabrica || fabrica.soyDePrueba) return filas ?? []", "if (!Array.isArray(filas) || !fabrica) return filas ?? []"],
  ['personas: no mira el id', "!fabrica.personas.has(clave(f)) && ", ''],
  ['personas: no mira la unidad', " && !fabrica.unidades.has(claveUnidad(f))", ''],
  ['null no da lista vacía', "if (!Array.isArray(filas) || !fabrica || fabrica.soyDePrueba || !fabrica.unidades?.size) return filas ?? []", "if (!Array.isArray(filas) || !fabrica || fabrica.soyDePrueba || !fabrica.unidades?.size) return filas"],
]

function correr(archivo) {
  try {
    const salida = execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, UTILS_TEST: archivo }, stdio: ['ignore', 'pipe', 'pipe'] })
    return { rojo: false, salida }
  } catch (err) { return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') } }
}

const src = fs.readFileSync(ORIGINAL, 'utf8')
const limpio = correr(ORIGINAL)
if (limpio.rojo) { console.log('ABORTADO: la suite no está verde sobre el limpio.\n' + limpio.salida); process.exit(2) }
console.log('Suite sobre el limpio:', limpio.salida.trim().split('\n').pop())

let detectadas = 0
const escapadas = []
try {
  for (const [nombre, de, a] of MUTACIONES) {
    const primera = src.indexOf(de)
    if (primera === -1) { console.log(`ABORTADO: «${nombre}» NO EXISTE`); process.exit(2) }
    if (src.indexOf(de, primera + 1) !== -1) { console.log(`ABORTADO: «${nombre}» AMBIGUA`); process.exit(2) }
    const mutado = src.slice(0, primera) + a + src.slice(primera + de.length)
    if (mutado === src) { console.log(`ABORTADO: «${nombre}» no cambia nada`); process.exit(2) }
    fs.writeFileSync(TMP, mutado)
    const r = correr(TMP)
    const leido = (r.salida.match(/LEIDO:(\d+)/) || [])[1]
    if (Number(leido) !== mutado.length) { console.log(`ABORTADO: «${nombre}»: el sub-proceso leyó ${leido}, se escribieron ${mutado.length}`); process.exit(2) }
    if (r.rojo) detectadas++
    else escapadas.push(nombre)
  }
} finally { try { fs.unlinkSync(TMP) } catch {} }

for (const e of escapadas) console.log('  ESCAPÓ: ' + e)
console.log(`${detectadas}/${MUTACIONES.length} mutaciones detectadas`)
process.exit(escapadas.length ? 1 : 0)
