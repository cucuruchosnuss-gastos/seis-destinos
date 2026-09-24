// NINGÚN CONTROL SE PIERDE en modulos/pedidos.html.
//
// El archivo nació el 23/09/2026 y crece de a una parte por commit. Cada parte
// commiteada se suma a BASES: la siguiente tiene que conservar TODOS los
// controles (button, input, select, textarea, a) de CADA base, con su id, sus
// data-* y, si no tiene identidad propia, su texto. Los baselines son COMMITS
// FIJOS, nunca HEAD: contra HEAD la prueba deja de probar en el momento en que
// el cambio se commitea.
//
// Además, sobre el archivo actual: cada getElementById('x'), querySelector con
// '#x' o '[data-x]' y cada `.dataset.x` literal apunta a algo que existe.
//
//   node pruebas/controles-pedidos.js
// Overrides: ARCHIVO_TEST (el pedidos.html bajo prueba). LISTAR=1 muestra el
// inventario.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs, veces } = require('./controles-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/pedidos.html')

// Un commit por parte ya cerrada, en orden.
const BASES = [
  '87d3c9d', // Parte 2: la pantalla nueva y los clientes con sus apodos
  'd525f8f', // Parte 3: cargar un pedido, con renglones de producto y de texto libre
]

// Controles que cambiaron de texto a propósito: [clave vieja, clave nueva, motivo].
const RENOMBRADOS = [
]

// Controles RETIRADOS a propósito: [clave, motivo]. La clave se compara DESPUÉS
// de aplicar RENOMBRADOS, así que una que primero se renombró y después se
// retiró se declara con su nombre nuevo.
//
// NINGÚN CONTROL PUEDE DESAPARECER SIN FIGURAR ACÁ CON SU RAZÓN: esa es toda
// la gracia de este chequeo. Un control que se fue sin explicación es
// indistinguible de uno que se perdió al mover código.
const RETIRADOS = [
]

// Controles que SIGUEN estando pero aparecen MENOS VECES en el fuente:
// [clave, cuántas veces ahora, motivo]. No es una excepción al chequeo —la
// clave tiene que seguir existiendo— y si aparece más veces que lo declarado,
// la declaración sobra y se dice.
const MENOS_COPIAS = [
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
  const retirada = new Map(RETIRADOS.map(([k, m]) => { console.log(`RETIRADO: ${k} (${m})`); return [k, m] }))
  // Un RETIRADO que ya no hace falta es ruido que tapa el próximo: si el
  // control sigue en el archivo, la declaración sobra y se dice.
  for (const [k] of RETIRADOS) chk(`el retirado ${k} ya no está en el archivo`, veces(A, k) === 0, 'sigue estando: sacá la declaración de RETIRADOS')
  const copias = new Map(MENOS_COPIAS.map(([k, n, m]) => { console.log(`MENOS COPIAS: ${k} × ${n} (${m})`); return [k, n] }))
  for (const [k, n] of MENOS_COPIAS) {
    chk(`el control ${k} sigue en el archivo`, veces(A, k) > 0, 'ya no está: va en RETIRADOS, no en MENOS_COPIAS')
    chk(`${k} aparece las ${n} veces declaradas`, veces(A, k) === n, `aparece ${veces(A, k)}: actualizá o sacá la declaración`)
  }

  if (!BASES.length) console.log('Sin baseline todavía: es la primera sub-parte del archivo.')
  for (const base of BASES) {
    const html = execFileSync('git', ['show', `${base}:modulos/pedidos.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const B = inventario(html)
    const claves = [...B.cuenta.keys()].filter(k => k.startsWith('control:'))
    chk(`el baseline ${base} tiene controles (si da cero, no se está leyendo)`, claves.length > 0)
    for (const k of claves) {
      const nueva = renombrada.get(k) || k
      if (retirada.has(nueva)) continue
      const n = veces(B, k), hay = veces(A, nueva)
      const pide = copias.has(nueva) ? Math.min(n, copias.get(nueva)) : n
      chk(`${base}: ${k} sigue estando`, hay >= pide && hay > 0, hay === 0 ? 'FALTA' : `aparece ${hay} y estaba ${n}`)
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
