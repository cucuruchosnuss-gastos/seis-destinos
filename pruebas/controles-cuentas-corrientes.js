// NINGÚN CONTROL SE PIERDE en modulos/cuentas-corrientes.html (28/09/2026).
//
// Mismo criterio y mismo inventario que controles-stock.js y
// controles-cobranzas.js (ver sus encabezados). Nace con la barra de unidad de
// arriba (js/barra-unidad.js), que RETIRA los tres selectores de unidad del
// módulo: reacomodar filtros es exactamente el trabajo donde otro control
// desaparece sin que nada se queje.
//
// Baseline: el commit FIJO de abajo, NUNCA HEAD (ver pruebas/README.md): el
// estado de la pantalla justo antes de la barra de unidad.
// Overrides: ARCHIVO_TEST (archivo bajo prueba) y ARCHIVO_BASE (un archivo ya
// extraído que reemplaza al `git show`).
//
// RETIRADOS: un control que se fue A PROPÓSITO, con su motivo. Uno que sigue
// estando pone la prueba en rojo (la declaración sobra).
//
// LISTAR=1 imprime el inventario completo del archivo actual.
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs, veces } = require('./controles-comun')

const BASE_COMMIT = '5592f5a'
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')

const POR_LA_BARRA = 'lo decide la barra de unidad de arriba (js/barra-unidad.js, 28/09/2026): nunca dos lugares para lo mismo'
const RETIRADOS = [
  ['control:select#filtro-unidad-proveedores', `el filtro de unidad de la lista de proveedores: ${POR_LA_BARRA}`],
  ['id:filtro-unidad-proveedores', `el filtro de unidad de la lista de proveedores: ${POR_LA_BARRA}`],
  ['control:select#filtro-unidad-historial', `el filtro de unidad del historial: ${POR_LA_BARRA}`],
  ['id:filtro-unidad-historial', `el filtro de unidad del historial: ${POR_LA_BARRA}`],
  ['control:select#filtro-unidad-ficha', `el filtro de unidad de la ficha: ${POR_LA_BARRA}. Para OPERAR con la barra en "Todas" la ficha pide la unidad en #ficha-unidad-operar, sin cambiar la barra (regla f)`],
  ['id:filtro-unidad-ficha', `el filtro de unidad de la ficha: ${POR_LA_BARRA}`],
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
  const base = process.env.ARCHIVO_BASE
    ? fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
    : execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cuentas-corrientes.html`], {
        cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      })
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/cuentas-corrientes.html'}`)

  const B = inventario(base)
  const A = inventario(actual)

  chk('el baseline tiene controles (si da cero, el inventario no está leyendo nada)',
    [...B.cuenta.keys()].filter(k => k.startsWith('control:')).length > 20)
  chk('el baseline tiene ids', B.ids.size > 50, B.ids.size)

  const retirado = new Map(RETIRADOS)
  for (const [k, m] of RETIRADOS) {
    console.log(`RETIRADO: ${k} (${m})`)
    chk(`el retirado ${k} estaba en el baseline`, veces(B, k) > 0, 'no estaba: la declaración sobra')
    chk(`el retirado ${k} ya no está`, veces(A, k) === 0, 'sigue estando: sacá la declaración de RETIRADOS')
  }

  // 1. Todo lo del baseline sigue estando, al menos las mismas veces.
  for (const [k, n] of [...B.cuenta.entries()].sort()) {
    if (retirado.has(k)) continue
    const m = A.cuenta.get(k) || 0
    chk(`sigue estando ${k}`, m >= n, m === 0 ? `FALTA (estaba ${n} ${n === 1 ? 'vez' : 'veces'})` : `aparece ${m} y estaba ${n}`)
  }

  // 2. Las referencias literales del JS apuntan a algo que existe.
  // Lo que escribe un archivo de js/ que la pantalla importa (06/10/2026).
  const EN_JS = {
    'data-clasificacion': ['js/cuenta-unica.js', /data-clasificacion="\$\{escCu\(clave\)\}"/, 'htmlClasificacion(): los botones Cliente / Proveedor / Cliente y proveedor'],
  }
  for (const r of referenciasDelJs(A.referencias)) {
    if (EN_JS[r.valor]) {
      const [archivo, re, motivo] = EN_JS[r.valor]
      chk(`${r.valor}: lo escribe ${archivo} (${motivo})`, re.test(fs.readFileSync(path.join(RAIZ, archivo), 'utf8')))
      continue
    }
    const existe = r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor)
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe`, existe, `referencia sin destino: ${r.como}`)
  }

  const nuevos = [...A.cuenta.entries()].filter(([k, n]) => n > (B.cuenta.get(k) || 0))
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
