// NINGÚN CONTROL SE PIERDE en modulos/administracion.html.
//
// El archivo nació el 26/09/2026 y crece de a una parte por commit. Cada parte
// commiteada se suma a BASES: la siguiente tiene que conservar TODOS los
// controles (button, input, select, textarea, a) de CADA base, con su id, sus
// data-* y, si no tiene identidad propia, su texto. Los baselines son COMMITS
// FIJOS, nunca HEAD: contra HEAD la prueba deja de probar en el momento en que
// el cambio se commitea.
//
// Además, sobre el archivo actual: cada getElementById('x'), querySelector con
// '#x' o '[data-x]' y cada `.dataset.x` literal apunta a algo que existe.
//
//   node pruebas/controles-administracion.js
// Overrides: ARCHIVO_TEST (el administracion.html bajo prueba). LISTAR=1 muestra el
// inventario.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs, veces } = require('./controles-comun')
// Lo que se mudó de cobranzas.html a acá (asentar y reabrir, 27/09/2026).
const { MOVIDOS } = require('./controles-movidos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/administracion.html')

// Un commit por parte ya cerrada, en orden.
const BASES = [
  'e8c0905', // Parte 1: la portada y las órdenes de retiro
  'ab577fc', // Parte 2: clientes, su cuenta, su ficha, saldo inicial, ajuste y alta
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
    const html = execFileSync('git', ['show', `${base}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
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

  // Lo que salió de cobranzas.html (asentar y reabrir, 27/09/2026) está acá.
  const aAdministracion = Object.entries(MOVIDOS).filter(([, m]) => m.a === 'administracion')
  chk('hay controles movidos a administracion.html (si da cero, el mapa no se está leyendo)', aAdministracion.length >= 4, aAdministracion.length)
  for (const [vieja, m] of aAdministracion) {
    console.log(`MOVIDO desde cobranzas.html: ${vieja} → ${m.nueva}`)
    chk(`llegó ${m.nueva} (reemplaza a ${vieja} de cobranzas.html)`, veces(A, m.nueva) > 0, 'FALTA')
  }

  const refs = referenciasDelJs(A.referencias)
  chk('el JS apunta a algún id (si da cero, no se están leyendo las referencias)', refs.length > 0)
  // Referencias cuyo destino NO está escrito en el HTML a propósito, con su motivo.
  const SIN_DESTINO_EN_HTML = {
    'data-embebido': 'lo pone en <html> el <script> del <head> al abrir la página embebida en Cuentas corrientes → Clientes (05/10/2026)',
  }
  // Lo que escribe un archivo de js/ que la pantalla importa (06/10/2026).
  const EN_JS = {
    'data-clasificacion': ['js/cuenta-unica.js', /data-clasificacion="\$\{escCu\(clave\)\}"/, 'htmlClasificacion(): los botones Cliente / Proveedor / Cliente y proveedor'],
  }
  for (const r of refs) {
    if (EN_JS[r.valor]) {
      const [archivo, re, motivo] = EN_JS[r.valor]
      chk(`${r.valor}: lo escribe ${archivo} (${motivo})`, re.test(fs.readFileSync(path.join(RAIZ, archivo), 'utf8')))
      continue
    }
    if (SIN_DESTINO_EN_HTML[r.valor]) { chk(`${r.valor}: lo escribe el <head>`, A.referencias !== undefined && /dataset\.embebido = 'cc'/.test(fs.readFileSync(ARCHIVO, 'utf8'))); continue }
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
