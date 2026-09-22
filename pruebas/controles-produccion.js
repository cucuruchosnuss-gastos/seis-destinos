// NINGÚN CONTROL SE PIERDE en modulos/produccion.html.
//
// El archivo nació el 22/09/2026 y creció de a una sub-parte por commit (B1…B7).
// Cada sub-parte commiteada se suma a BASES: la siguiente tiene que conservar
// TODOS los controles (button, input, select, textarea, a) de CADA base, con
// su id, sus data-* y, si no tiene identidad propia, su texto. Los baselines
// son COMMITS FIJOS, nunca HEAD: contra HEAD la prueba deja de probar en el
// momento en que el cambio se commitea.
//
// Además, sobre el archivo actual: cada getElementById('x'), querySelector con
// '#x' o '[data-x]' y cada `.dataset.x` literal apunta a algo que existe.
//
//   node pruebas/controles-produccion.js
// Overrides: ARCHIVO_TEST (el produccion.html bajo prueba). LISTAR=1 muestra el
// inventario.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs, veces } = require('./controles-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')

// Un commit por sub-parte ya cerrada, en orden.
const BASES = [
  '9a70841', // B1: estructura y acceso
  'd995d1f', // B2: modo y ¿Quién sos?
  '7aed9b3', // B3: tablero y abrir turno
  'fa693f2', // B4: planilla, paradas y cierre
]

// Controles que cambiaron de texto a propósito: [clave vieja, clave nueva, motivo].
const RENOMBRADOS = [
]

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

try {
  const actual = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`ARCHIVO ${ARCHIVO} (${actual.length} bytes)`)
  const A = inventario(actual)
  const renombrada = new Map(RENOMBRADOS.map(([v, n, m]) => { console.log(`RENOMBRADO: ${v} → ${n} (${m})`); return [v, n] }))

  if (!BASES.length) console.log('Sin baseline todavía: es la primera sub-parte del archivo.')
  for (const base of BASES) {
    const html = execFileSync('git', ['show', `${base}:modulos/produccion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const B = inventario(html)
    const claves = [...B.cuenta.keys()].filter(k => k.startsWith('control:'))
    chk(`el baseline ${base} tiene controles (si da cero, no se está leyendo)`, claves.length > 0)
    for (const k of claves) {
      const nueva = renombrada.get(k) || k
      const n = veces(B, k), hay = veces(A, nueva)
      chk(`${base}: ${k} sigue estando`, hay >= n, hay === 0 ? 'FALTA' : `aparece ${hay} y estaba ${n}`)
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
