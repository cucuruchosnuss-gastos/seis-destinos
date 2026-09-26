// NINGÚN CONTROL MUDADO SE PIERDE en la cartera de cheques.
//
// DOS MUDANZAS: (1) el 22/09/2026 la cartera salió de cobranzas.html a
// cheques.html; (2) el 26/09/2026 se mudó ENTERA a administracion.html, a una
// región entre dos marcas (fuente-cheques.js), y cheques.html quedó como una
// redirección. Este chequeo exige las dos: cada control MOVIDO de cobranzas
// (controles-movidos.js) y CADA control que tenía cheques.html en su último
// commit antes de la segunda mudanza (BASE_CHEQUES) están en la región.
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
const { execFileSync } = require('child_process')
const { MOVIDOS } = require('./controles-movidos')
const { ARCHIVO_CHEQUES, regionCheques } = require('./fuente-cheques')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES

// El último commit con la cartera en cheques.html: un commit FIJO, nunca HEAD.
const BASE_CHEQUES = '4435cdc'

// Controles de cheques.html que NO se mudaron, a propósito y con su motivo. Si
// uno vuelve a aparecer, la declaración sobra y se dice.
const RETIRADOS_CHEQUES = [
  { clave: 'control:a[href=../dashboard.html]{&lsaquo; Volver}',
    motivo: 'el encabezado propio de cheques.html: adentro de Administración vuelven su "‹ Volver" al dashboard y el "‹ Portada" de la sección (#ad-cheques-volver)' },
]

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
  const todo = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`LEIDO:${todo.length} de ${ARCHIVO}`)
  console.log(`ARCHIVO ${ARCHIVO} (${todo.length} bytes)`)
  // La región de la cartera (el archivo entero si no tiene las marcas).
  const actual = regionCheques(todo)
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

  // La segunda mudanza: cada control de cheques.html está en la región.
  const viejo = process.env.ARCHIVO_BASE_CHEQUES
    ? fs.readFileSync(process.env.ARCHIVO_BASE_CHEQUES, 'utf8')
    : execFileSync('git', ['show', `${BASE_CHEQUES}:modulos/cheques.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const V = inventario(viejo)
  const controlesViejos = [...V.cuenta.keys()].filter(k => k.startsWith('control:'))
  chk('cheques.html tenía controles (si da cero, el baseline no se está leyendo)', controlesViejos.length > 20, controlesViejos.length)
  for (const k of controlesViejos) {
    const ret = RETIRADOS_CHEQUES.find(r => r.clave === k)
    const n = veces(V, k), hay = veces(A, k)
    if (ret) {
      console.log(`RETIRADO: ${k} (${ret.motivo})`)
      chk(`${k}: declarado retirado y de verdad no está (si volvió, sacá la declaración)`, hay === 0)
      continue
    }
    chk(`${k} → se mudó a administracion.html`, hay >= n, hay === 0 ? 'FALTA' : `aparece ${hay} y estaba ${n}`)
  }
  for (const id of V.ids) chk(`el id #${id} de cheques.html está en la región`, A.ids.has(id))
  for (const d of V.datas) chk(`el data-${d} de cheques.html está en la región`, A.datas.has(d))
  for (const r of RETIRADOS_CHEQUES) chk(`la declaración de ${r.clave} apunta a un control que existía`, veces(V, r.clave) > 0)
  chk('la región tiene el "‹ Portada" que reemplaza al encabezado', A.ids.has('ad-cheques-volver'))

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
