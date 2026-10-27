// NINGÚN CONTROL SE PIERDE en modulos/stock.html.
//
// Mismo criterio y mismo inventario que controles-cobranzas.js (ver su
// encabezado por el detalle de qué se lista y por qué). Existe desde la tanda
// de preparación del recuento para el conteo inicial del 1/10: esa tanda
// agrega botones, campos y una pantalla de impresión sobre una pantalla que ya
// funciona, y reacomodar HTML es exactamente el trabajo donde un control
// desaparece sin que nada se queje.
//
// Baseline: el commit FIJO de abajo, NUNCA HEAD (ver pruebas/README.md). Es el
// estado de modulos/stock.html justo antes de la tanda.
// Overrides: ARCHIVO_TEST (archivo bajo prueba) y ARCHIVO_BASE (un archivo ya
// extraído que reemplaza al `git show`).
//
// RENOMBRADOS: un control sin id ni data-* cuyo TEXTO cambia a propósito va
// acá, con su motivo. No es una puerta para tapar un rojo.
//
// RETIRADOS / MENOS_COPIAS (28/09/2026): un control que se va a propósito, o
// que queda menos veces, se declara con su motivo (ver abajo).
//
// LISTAR=1 imprime el inventario completo del archivo actual.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs } = require('./controles-comun')

const BASE_COMMIT = '2cd547a'
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')

// clave vieja → clave nueva, con el motivo.
const RENOMBRADOS = {
  // 'button{Texto viejo}': { nueva: 'button{Texto nuevo}', motivo: '…' },
}

// Controles RETIRADOS a propósito: clave → motivo. NINGÚN control puede
// desaparecer sin figurar acá con su razón, y uno declarado que sigue en el
// archivo es rojo (la declaración sobra y taparía el próximo).
const MOTIVO_BARRA = 'lo decide la barra de unidad de arriba (js/barra-unidad.js, 28/09/2026): nunca dos lugares para elegir lo mismo'
const RETIRADOS = {
  'id:chips-unidad-stock': 'los chips de unidad del listado de stock: ' + MOTIVO_BARRA,
  'id:chips-unidad-historial': 'los chips de unidad del historial de recuentos: ' + MOTIVO_BARRA,
  'id:chips-unidad-mermas': 'los chips de unidad del tablero de mermas: ' + MOTIVO_BARRA,
  'control:button[data-unidad-hist][type=button]': 'el chip de unidad del historial: ' + MOTIVO_BARRA,
  'data:data-unidad-hist': 'el chip de unidad del historial: ' + MOTIVO_BARRA,
  'control:button[data-unidad-merma][type=button]': 'el chip de unidad de mermas: ' + MOTIVO_BARRA,
  'data:data-unidad-merma': 'el chip de unidad de mermas: ' + MOTIVO_BARRA,
}

// Controles que SIGUEN estando pero aparecen MENOS veces: clave → [cuántas
// ahora, motivo]. Si aparece un número distinto del declarado, rojo.
const MENOS_COPIAS = {
  'control:button[data-unidad][type=button]': [1, 'queda el chip de unidad del RECUENTO (elige en qué unidad se cuenta con "Todas" en la barra); se fue el del listado de stock: ' + MOTIVO_BARRA],
}

// Atributos que el inventario NO ve porque el HTML que los escribe vive en una
// plantilla ANIDADA dentro de una interpolación — el tokenizador la guarda
// como su propio template y ahí el texto ya no está en contexto de etiqueta:
//
//     <div class="${clases}"${gestiona ? ` data-insumo="${esc(i.id)}"` : ''}>
//
// NO es un perdón en blanco: la excepción exige igual que el atributo aparezca
// LITERALMENTE en el archivo. Si desaparece de verdad, rojo. Es una limitación
// conocida del inventario, no un control perdido.
const EN_PLANTILLA_ANIDADA = {
  'data-insumo': 'modulos/stock.html: el data-insumo de la tarjeta del catálogo, que solo se escribe con stock:gestionar_catalogo',
}

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

try {
  const actual = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`LEIDO:${actual.length} de ${ARCHIVO}`)
  const base = process.env.ARCHIVO_BASE
    ? fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
    : execFileSync('git', ['show', `${BASE_COMMIT}:modulos/stock.html`], {
        cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      })
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/stock.html'}`)

  const B = inventario(base)
  const A = inventario(actual)

  chk('el baseline tiene controles (si da cero, el inventario no está leyendo nada)',
    [...B.cuenta.keys()].filter(k => k.startsWith('control:')).length > 20)
  chk('el baseline tiene ids', B.ids.size > 50, B.ids.size)

  // 1. Todo lo del baseline sigue estando, al menos las mismas veces.
  const nuevosRenombres = []
  for (const [k, n] of [...B.cuenta.entries()].sort()) {
    let clave = k
    const ren = RENOMBRADOS[k.replace(/^control:/, '')]
    if (ren) { clave = 'control:' + ren.nueva; nuevosRenombres.push(`${k} → ${clave} (${ren.motivo})`) }
    const m = A.cuenta.get(clave) || 0
    if (RETIRADOS[clave]) {
      console.log(`RETIRADO: ${clave} (${RETIRADOS[clave]})`)
      chk(`el retirado ${clave} ya no está`, m === 0, `sigue estando ${m} ${m === 1 ? 'vez' : 'veces'}: sacá la declaración de RETIRADOS`)
      continue
    }
    if (MENOS_COPIAS[clave]) {
      const [ahora, motivo] = MENOS_COPIAS[clave]
      console.log(`MENOS COPIAS: ${clave} × ${ahora} (${motivo})`)
      chk(`${clave} aparece las ${ahora} veces declaradas`, m === ahora, `aparece ${m}: actualizá o sacá la declaración`)
      continue
    }
    chk(`sigue estando ${clave}`, m >= n, m === 0 ? `FALTA (estaba ${n} ${n === 1 ? 'vez' : 'veces'})` : `aparece ${m} y estaba ${n}`)
  }
  for (const k of [...Object.keys(RETIRADOS), ...Object.keys(MENOS_COPIAS)]) {
    chk(`la declaración de ${k} apunta a algo que estaba en el baseline`, (B.cuenta.get(k) || 0) > 0)
  }

  // 2. Las referencias literales del JS apuntan a algo que existe.
  for (const r of referenciasDelJs(A.referencias)) {
    const anidada = r.tipo === 'data' && EN_PLANTILLA_ANIDADA[r.valor]
    const existe = anidada
      ? actual.includes(`${r.valor}="`)
      : (r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor))
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe${anidada ? ' (en plantilla anidada)' : ''}`,
      existe, `referencia sin destino: ${r.como}`)
  }
  const sobran = Object.keys(EN_PLANTILLA_ANIDADA).filter(d => A.datas.has(d))
  chk('ninguna excepción de plantilla anidada sobra (si el inventario ya lo ve, la declaración tapa de más)',
    sobran.length === 0, sobran.join(', '))

  const nuevos = [...A.cuenta.entries()].filter(([k, n]) => n > (B.cuenta.get(k) || 0))
  if (nuevosRenombres.length) {
    console.log('RENOMBRADOS declarados:')
    for (const x of nuevosRenombres) console.log('  ' + x)
  }
  if (nuevos.length) {
    console.log(`NUEVO respecto de ${BASE_COMMIT} (se permite, se lista):`)
    for (const [k, n] of nuevos) console.log(`  + ${k} (${B.cuenta.get(k) || 0} → ${n})`)
  }
  console.log(`inventario: ${[...A.cuenta.keys()].filter(k => k.startsWith('control:')).length} claves de control, ${A.ids.size} ids, ${A.datas.size} data-*`)

  if (process.env.LISTAR) {
    for (const [k, n] of [...A.cuenta.entries()].sort()) console.log(`  ${n} ${k}`)
  }
  for (const f of fallas) console.log('FALLA ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
} catch (e) {
  console.log('ERROR ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
}
