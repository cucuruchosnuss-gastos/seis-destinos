// NINGÚN CONTROL MUDADO SE PIERDE en modulos/produccion-gestion.html.
//
// Producción se partió en dos el 25/09/2026: la planta (produccion.html) y la
// gestión (este archivo). Cada control que salió de la planta está en
// controles-produccion-movidos.js con su clave nueva. Esto inventaría los
// MISMOS baselines que controles-produccion.js (commits fijos, nunca HEAD) y
// el archivo actual de la gestión, y exige que cada clave MOVIDA esté acá al
// menos las mismas veces que estaba en el último baseline que la tenía. Si
// un control desaparece de los dos archivos, este o controles-produccion.js
// da rojo.
//
// Además, sobre la gestión: cada getElementById('x'), querySelector con '#x'
// o '[data-x]' y cada `.dataset.x` literal apunta a algo que existe; y los
// controles que la gestión sumó después de la mudanza (BASES_GESTION) siguen
// estando.
//
//   node pruebas/controles-produccion-gestion.js
// Overrides: ARCHIVO_TEST (la gestión bajo prueba). LISTAR=1 muestra el inventario.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs, veces } = require('./controles-comun')
const { MOVIDOS } = require('./controles-produccion-movidos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion-gestion.html')

// Los baselines del archivo entero (produccion.html antes de partirse): los
// mismos de controles-produccion.js, leídos de su fuente para no tener dos
// listas que se desincronicen.
const fuenteChequeo = fs.readFileSync(path.join(__dirname, 'controles-produccion.js'), 'utf8')
const bloque = fuenteChequeo.slice(fuenteChequeo.indexOf('const BASES = ['), fuenteChequeo.indexOf(']', fuenteChequeo.indexOf('const BASES = [')))
const BASES = [...bloque.matchAll(/'([0-9a-f]{7,})'/g)].map(m => m[1])
const RENOMBRADOS = [...fuenteChequeo.matchAll(/\['(control:[^']+)', '(control:[^']+)',/g)].map(m => [m[1], m[2]])

// Commits de la gestión ya cerrados: lo que tenían tiene que seguir estando.
const BASES_GESTION = []

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

try {
  const actual = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`LEIDO:${actual.length} de ${ARCHIVO}`)
  const A = inventario(actual)
  chk('se leyeron los baselines de controles-produccion.js (si da cero, no se está leyendo)', BASES.length > 10, BASES.length)
  chk('hay controles movidos a la gestión (si da cero, el mapa no se está leyendo)', Object.keys(MOVIDOS).length > 50, Object.keys(MOVIDOS).length)
  const renombrada = new Map(RENOMBRADOS)

  // Cuántas veces estaba cada clave movida en el ÚLTIMO baseline que la tenía
  // (el orden de BASES es cronológico).
  const maximo = new Map()
  for (const base of BASES) {
    const html = execFileSync('git', ['show', `${base}:modulos/produccion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const B = inventario(html)
    for (const [k, n] of B.cuenta) {
      if (!k.startsWith('control:')) continue
      const nueva = renombrada.get(k) || k
      if (MOVIDOS[nueva]) maximo.set(nueva, n)
    }
  }
  for (const [vieja, m] of Object.entries(MOVIDOS)) {
    console.log(`MOVIDO: ${vieja} → ${m.nueva} (${m.motivo})`)
    const n = maximo.get(vieja) || 0
    chk(`la clave movida ${vieja} existía en algún baseline (si no, la entrada del mapa está mal)`, n > 0)
    const hay = veces(A, m.nueva)
    chk(`${vieja} → está en la gestión como ${m.nueva}`, hay > 0 && hay >= n, hay === 0 ? 'FALTA' : `aparece ${hay} y estaba ${n}`)
  }

  for (const base of BASES_GESTION) {
    const html = execFileSync('git', ['show', `${base}:modulos/produccion-gestion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const B = inventario(html)
    for (const k of [...B.cuenta.keys()].filter(k => k.startsWith('control:'))) {
      chk(`${base}: ${k} sigue estando en la gestión`, veces(A, k) > 0, 'FALTA')
    }
  }

  const refs = referenciasDelJs(A.referencias)
  chk('el JS apunta a algún id (si da cero, no se están leyendo las referencias)', refs.length > 0)
  for (const r of refs) {
    const existe = r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor)
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe`, existe, `referencia sin destino: ${r.como}`)
  }

  console.log(`inventario: ${[...A.cuenta.keys()].filter(k => k.startsWith('control:')).length} claves de control, ${A.ids.size} ids, ${A.datas.size} data-*`)
  if (process.env.LISTAR) for (const [k, n] of [...A.cuenta.entries()].sort()) console.log(`  ${n} ${k}`)
  for (const f of fallas) console.log('FALLA ' + f)
  console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
} catch (e) {
  console.log('ERROR ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
}
