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
  '10df632', // B5: sala de masa
  '7cb199b', // B6: configuración
]

// Controles que cambiaron de texto a propósito: [clave vieja, clave nueva, motivo].
const RENOMBRADOS = [
  ['control:button[data-menu][type=button]', 'control:button#pr-menu-modo[data-menu][type=button]',
    'B6: "Cambiar el modo" ganó un id para ocultarlo a quien no carga desde la tablet; mismo texto y mismo data-menu'],
  ['control:button#pr-btn-cambiar-persona[type=button]', 'control:button#pr-btn-salir[type=button]',
    'Rediseño parte 1: el botón que dejaba la tablet sin nadie se llama Salir y vive en la barra de modos; hace lo mismo'],
]

// Controles RETIRADOS a propósito: [clave, motivo]. La clave se compara DESPUÉS
// de aplicar RENOMBRADOS, así que una que primero se renombró y después se
// retiró se declara con su nombre nuevo.
//
// NINGÚN CONTROL PUEDE DESAPARECER SIN FIGURAR ACÁ CON SU RAZÓN: esa es toda
// la gracia de este chequeo. Un control que se fue sin explicación es
// indistinguible de uno que se perdió al mover código.
const RETIRADOS = [
  ['control:a#pr-volver-dashboard[href=../dashboard.html]',
    'Rediseño parte 1: la tablet está en modo kiosco y el diseño no tiene "Volver" (README, barra de modos). ' +
    'El dashboard se sigue alcanzando desde el menú de la cabecera, que queda para la oficina.'],
  ['control:button#pr-menu-modo[data-menu][type=button]',
    'Rediseño parte 1: "Cambiar el modo de esta tablet" no existe más porque el cambio de modo son los dos ' +
    'botones de la barra, que además dicen en qué modo está la tablet sin abrir ningún menú.'],
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

  if (!BASES.length) console.log('Sin baseline todavía: es la primera sub-parte del archivo.')
  for (const base of BASES) {
    const html = execFileSync('git', ['show', `${base}:modulos/produccion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const B = inventario(html)
    const claves = [...B.cuenta.keys()].filter(k => k.startsWith('control:'))
    chk(`el baseline ${base} tiene controles (si da cero, no se está leyendo)`, claves.length > 0)
    for (const k of claves) {
      const nueva = renombrada.get(k) || k
      if (retirada.has(nueva)) continue
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
