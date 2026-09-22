// NINGÚN CONTROL SE PIERDE en modulos/cobranzas.html.
//
// Existe para el rediseño visual de Cobranzas (septiembre 2026): cambiar
// estilos y reacomodar el HTML es exactamente la clase de trabajo donde un
// botón, un id o un data-* desaparece sin que nada se queje — el JS que lo
// buscaba hace `?.` o un querySelectorAll vacío y la pantalla sigue andando
// sin esa acción.
//
// Lista, del archivo BASELINE y del actual:
//   - cada id (HTML estático y plantillas del <script>);
//   - cada atributo data-* (todos, no solo los que disparan acciones: es un
//     superconjunto a propósito, así no hay que decidir a mano cuál "cuenta");
//   - cada control interactivo (button, input, select, textarea, a), con una
//     clave que NO depende de clases ni de estilos: id, nombres de data-*,
//     type, name, href; y si no tiene nada de eso, su texto literal.
// Y compara CANTIDADES: todo lo que estaba tiene que seguir estando, al menos
// las mismas veces. Si falta uno, ROJO nombrándolo. Lo nuevo se permite y se
// lista.
//
// Además, sobre el archivo actual: cada getElementById('x'), querySelector
// con '#x' o '[data-x]' y cada `.dataset.x` literal tiene que apuntar a un id
// o un data-* que exista. Un id renombrado en el HTML y no en el JS no rompe
// nada visible: la acción simplemente deja de estar.
//
// Las plantillas del <script> se leen con el tokenizador de
// escaner-interpolaciones.js: el texto literal de cada template (con las
// interpolaciones reemplazadas por un marcador) y el contenido de cada string.
// Los comentarios NO cuentan: sacar un comentario no es perder un control.
//
// Baseline: el commit FIJO de abajo, NUNCA HEAD (ver pruebas/README.md).
// Overrides: ARCHIVO_TEST (archivo bajo prueba) y ARCHIVO_BASE (un archivo
// ya extraído que reemplaza al `git show` del baseline).
//
// RENOMBRADOS: si una sub-parte del rediseño cambia A PROPÓSITO el texto de un
// control sin id ni data-*, el mapeo va acá, explícito, y la salida lo lista.
// No es una puerta para tapar un rojo: cada entrada tiene que decir por qué.
//
// MOVIDOS (22/09/2026): la cartera de cheques se mudó a modulos/cheques.html.
// Lo que salió de acá está en controles-movidos.js, y controles-cheques.js
// exige que exista allá. Si un control desaparece de los dos, rojo.
//
// LISTAR=1 imprime el inventario completo del archivo actual.

const fs = require('fs')
const path = require('path')
const { BASE_COMMIT, RAIZ, leerBaseline, inventario, referenciasDelJs } = require('./controles-comun')
// Lo que se mudó a modulos/cheques.html (22/09/2026). Ver controles-movidos.js.
const { MOVIDOS } = require('./controles-movidos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')

// clave vieja → clave nueva, con el motivo. Hoy vacío.
const RENOMBRADOS = {
  // 'button{Texto viejo}': { nueva: 'button{Texto nuevo}', motivo: '…' },
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
  const base = leerBaseline()
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/cobranzas.html'}`)

  const B = inventario(base)
  const A = inventario(actual)

  chk('el baseline tiene controles (si da cero, el inventario no está leyendo nada)',
    [...B.cuenta.keys()].filter(k => k.startsWith('control:')).length > 20)
  chk('el baseline tiene ids', B.ids.size > 50, B.ids.size)

  // 1. Todo lo del baseline sigue estando, al menos las mismas veces.
  const nuevosRenombres = []
  const movidos = []
  for (const [k, n] of [...B.cuenta.entries()].sort()) {
    let clave = k
    const ren = RENOMBRADOS[k.replace(/^control:/, '')]
    if (ren) { clave = 'control:' + ren.nueva; nuevosRenombres.push(`${k} → ${clave} (${ren.motivo})`) }
    // Lo que se mudó a cheques.html lo exige controles-cheques.js; lo que se
    // reemplazó por otra cosa DENTRO de cobranzas.html se exige acá, con su
    // clave nueva.
    const mov = MOVIDOS[k]
    if (mov && (A.cuenta.get(k) || 0) < n) {
      if (mov.a === 'cheques') { movidos.push(`${k} → cheques.html ${mov.nueva}`); ok++; continue }
      clave = mov.nueva
      movidos.push(`${k} → cobranzas.html ${clave} (${mov.motivo})`)
      const m2 = A.cuenta.get(clave) || 0
      chk(`sigue estando ${clave} (reemplaza a ${k})`, m2 >= 1, 'FALTA')
      continue
    }
    const m = A.cuenta.get(clave) || 0
    chk(`sigue estando ${clave}`, m >= n, m === 0 ? `FALTA (estaba ${n} ${n === 1 ? 'vez' : 'veces'})` : `aparece ${m} y estaba ${n}`)
  }

  // 2. Las referencias literales del JS apuntan a algo que existe.
  for (const r of referenciasDelJs(A.referencias)) {
    const existe = r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor)
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe`, existe, `referencia sin destino: ${r.como}`)
  }

  const nuevos = [...A.cuenta.entries()].filter(([k, n]) => n > (B.cuenta.get(k) || 0))
  if (movidos.length) {
    console.log(`MOVIDOS (${movidos.length}):`)
    for (const x of movidos) console.log('  ' + x)
  }
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
