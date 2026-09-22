// NINGÚN CONTROL MUDADO SE PIERDE en modulos/cheques.html.
//
// La cartera de cheques salió de modulos/cobranzas.html el 22/09/2026. Cada
// control que se fue de allá está en controles-movidos.js con su clave nueva.
// Esto inventaría el MISMO baseline que controles-cobranzas.js (el commit fijo
// de controles-comun.js, nunca HEAD) y el archivo actual de cheques.html, y
// exige que cada clave MOVIDA a cheques.html esté acá al menos las mismas
// veces que estaba en el baseline. Si un control desaparece de los dos
// archivos, este o controles-cobranzas.js da rojo.
//
// Además, sobre cheques.html: cada getElementById('x'), querySelector con
// '#x' o '[data-x]' y cada `.dataset.x` literal apunta a algo que existe.
//
//   node pruebas/controles-cheques.js
// Overrides: ARCHIVO_TEST (cheques.html bajo prueba) y ARCHIVO_BASE.

const fs = require('fs')
const path = require('path')
const { BASE_COMMIT, RAIZ, leerBaseline, inventario, referenciasDelJs, veces } = require('./controles-comun')
const { MOVIDOS } = require('./controles-movidos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cheques.html')

// RENOMBRADOS: controles que además de mudarse cambiaron de TEXTO o de LUGAR a
// propósito. Se listan en la salida y se verifica el texto y el lugar nuevos
// sobre el código real: un cambio que nadie declaró no pasa como mudanza.
const RENOMBRADOS = [
  {
    vieja: 'button[data-salio]{Salió}',
    nueva: 'button[data-dar-salida]{Dar salida}',
    lugar: 'de debajo del número (la columna fija) a la columna "Salida"',
    motivo: 'Parte 2 (22/09/2026): en la columna fija estiraba la fila al doble; la columna Salida mostraba "—".',
    // El botón existe con ese texto…
    texto: /data-dar-salida="\$\{esc\(ch\.id\)\}">Dar salida<\/button>/,
    // …y se dibuja en la celda de la columna Salida, no en la del número.
    lugarRe: /<td class="chq-tabla__salida">\$\{htmlSalidaCheque\(ch, cob\)\}<\/td>/,
  },
]

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

try {
  const actual = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`LEIDO:${actual.length} de ${ARCHIVO}`)
  console.log(`ARCHIVO ${ARCHIVO} (${actual.length} bytes)`)
  const base = leerBaseline()
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/cobranzas.html'}`)

  const B = inventario(base)
  const A = inventario(actual)

  const aCheques = Object.entries(MOVIDOS).filter(([, m]) => m.a === 'cheques')
  chk('hay controles movidos a cheques.html (si da cero, el mapa no se está leyendo)', aCheques.length > 20, aCheques.length)

  for (const [vieja, m] of aCheques) {
    const n = veces(B, vieja)
    chk(`la clave movida ${vieja} existía en el baseline (si no, la entrada del mapa está mal)`, n > 0)
    const hay = veces(A, m.nueva)
    chk(`${vieja} → está en cheques.html como ${m.nueva}`, hay >= n, hay === 0 ? 'FALTA' : `aparece ${hay} y estaba ${n}`)
  }

  for (const r of RENOMBRADOS) {
    console.log(`RENOMBRADO: ${r.vieja} → ${r.nueva}, ${r.lugar} (${r.motivo})`)
    chk(`${r.nueva}: el texto nuevo está en el código`, r.texto.test(actual))
    chk(`${r.nueva}: y en su lugar nuevo`, r.lugarRe.test(actual))
  }

  for (const r of referenciasDelJs(A.referencias)) {
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
