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
    chk(`sigue estando ${clave}`, m >= n, m === 0 ? `FALTA (estaba ${n} ${n === 1 ? 'vez' : 'veces'})` : `aparece ${m} y estaba ${n}`)
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
