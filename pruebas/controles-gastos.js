// NINGÚN CONTROL SE PIERDE en modulos/gastos.html (28/09/2026).
//
// Mismo inventario que controles-stock.js / controles-cobranzas.js (ver sus
// encabezados): cada id, data-* y control (button/input/select/textarea/a) del
// HTML estático y de las plantillas del <script> del baseline tiene que seguir
// estando, las mismas veces o más.
//
// Nació con la barra de unidad y la mudanza de "Proyectos del Taller" a
// modulos/taller.html, que SACAN controles a propósito. Cada uno que se fue
// está declarado abajo, en RETIRADOS o MOVIDOS, con su motivo. Y una
// declaración que ya no hace falta (el control volvió) pone la prueba en rojo:
// la lista no puede llenarse de declaraciones muertas que tapen la próxima.
//
// Baseline: el commit FIJO de abajo, NUNCA HEAD. Es modulos/gastos.html justo
// antes de este trabajo (5592f5a, la barra de unidad ya cargada en el <head>).
// Overrides: ARCHIVO_TEST (archivo bajo prueba) y ARCHIVO_BASE (un archivo ya
// extraído que reemplaza al `git show`). LISTAR=1 imprime el inventario.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs } = require('./controles-comun')

const BASE_COMMIT = '5592f5a'
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')

const BARRA = 'lo decide la barra de unidad de arriba (js/barra-unidad.js): dos lugares para lo mismo terminan diciendo cosas distintas'
const TALLER = 'la gestión de proyectos se mudó a modulos/taller.html (el Taller tiene su propio módulo); Gastos solo ELIGE el proyecto'

// Controles que salieron de esta pantalla a propósito.
const RETIRADOS = {
  'control:button#ms-unidad-boton[type=button]': BARRA,
  'id:ms-unidad': BARRA,
  'id:ms-unidad-boton': BARRA,
  'id:ms-unidad-panel': BARRA,
}
// Controles que se MUDARON a otra pantalla: [destino, motivo].
const MOVIDOS = {
  'control:button#btn-abrir-proyectos[type=button]': ['modulos/taller.html', TALLER + ' ("🛠 Proyectos del Taller", la pantalla de la lista)'],
  'control:button#btn-cerrar-proyectos[type=button]': ['modulos/taller.html', TALLER + ' (el "← Volver" de esa pantalla)'],
  'control:button#btn-proyectos-alta-crear[type=button]': ['modulos/taller.html', TALLER + ' (el alta de un proyecto)'],
  'control:input#campo-proyectos-alta-nombre[type=text]': ['modulos/taller.html', TALLER + ' (el nombre del proyecto nuevo)'],
  'control:button[data-accion][data-id][type=button]': ['modulos/taller.html', TALLER + ' (Dar de baja / Sí, dar de baja / Reactivar de cada proyecto)'],
  'control:button[data-accion][type=button]': ['modulos/taller.html', TALLER + ' (el Cancelar de la baja)'],
  'control:button#btn-proyecto-nuevo[type=button]': ['modulos/taller.html', TALLER + ' (el "+ Proyecto nuevo" del wizard; en su lugar va el link "¿No está? Crealo en Proyectos Taller")'],
  'control:input#campo-proyecto-nombre[type=text]': ['modulos/taller.html', TALLER + ' (el nombre del "+ Proyecto nuevo")'],
  'control:button#btn-proyecto-nuevo-cancelar[type=button]': ['modulos/taller.html', TALLER + ' (el Cancelar del "+ Proyecto nuevo")'],
  'control:button#btn-proyecto-nuevo-crear[type=button]': ['modulos/taller.html', TALLER + ' (el Crear del "+ Proyecto nuevo")'],
  // Sus ids y data-*: los mismos controles de arriba y sus contenedores.
  'data:data-accion': ['modulos/taller.html', TALLER + ' (las acciones de la lista de proyectos)'],
  ...Object.fromEntries([
    'btn-abrir-proyectos', 'modal-proyectos', 'btn-cerrar-proyectos', 'proyectos-alta', 'campo-proyectos-alta-nombre',
    'proyectos-alta-error', 'btn-proyectos-alta-crear', 'proyectos-lista',
    'btn-proyecto-nuevo', 'proyecto-nuevo', 'campo-proyecto-nombre', 'proyecto-nuevo-error',
    'btn-proyecto-nuevo-cancelar', 'btn-proyecto-nuevo-crear',
  ].map(id => ['id:' + id, ['modulos/taller.html', TALLER]])),
}
// Un control que SIGUE pero aparece menos veces: [cuántas veces ahora, motivo].
const MENOS_COPIAS = {
  'data:data-id': [7, TALLER + ' (los 6 data-id de las filas y botones de la lista de proyectos; los demás siguen)'],
}
// Referencias del JS a un data-* que se escribe desde código (dataset.x = …) y
// por eso el inventario no ve en ninguna etiqueta. Exige que la escritura esté.
const ESCRITOS_POR_CODIGO = {
  'data-multiselect-id': 'dataset.multiselectId =',
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
    : execFileSync('git', ['show', `${BASE_COMMIT}:modulos/gastos.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/gastos.html'}`)

  const B = inventario(base)
  const A = inventario(actual)
  chk('el baseline tiene controles (si da cero, el inventario no está leyendo nada)',
    [...B.cuenta.keys()].filter(k => k.startsWith('control:')).length > 20)
  chk('el baseline tiene ids', B.ids.size > 50, B.ids.size)

  const declarado = (k) => RETIRADOS[k] || (MOVIDOS[k] && MOVIDOS[k].join(': '))
  const usados = new Set()
  // 1. Todo lo del baseline sigue estando, salvo lo declarado.
  for (const [k, n] of [...B.cuenta.entries()].sort()) {
    const m = A.cuenta.get(k) || 0
    if (m >= n) continue
    if (declarado(k)) {
      usados.add(k)
      chk(`lo retirado/movido ${k} ya no está`, m === 0, `aparece ${m}`)
      continue
    }
    if (MENOS_COPIAS[k]) {
      usados.add(k)
      chk(`${k} aparece las veces declaradas (${MENOS_COPIAS[k][0]})`, m === MENOS_COPIAS[k][0], `aparece ${m} y estaba ${n}`)
      continue
    }
    chk(`sigue estando ${k}`, false, m === 0 ? `FALTA (estaba ${n} ${n === 1 ? 'vez' : 'veces'})` : `aparece ${m} y estaba ${n}`)
  }

  // 2. Ninguna declaración sobra: lo declarado tiene que haber faltado de verdad.
  const sobran = [...Object.keys(RETIRADOS), ...Object.keys(MOVIDOS), ...Object.keys(MENOS_COPIAS)].filter(k => !usados.has(k))
  chk('ninguna declaración de RETIRADOS/MOVIDOS/MENOS_COPIAS sobra (si el control sigue, la declaración tapa de más)', sobran.length === 0, sobran.join(', '))

  // 3. Las referencias literales del JS apuntan a algo que existe.
  for (const r of referenciasDelJs(A.referencias)) {
    const escrito = r.tipo === 'data' && ESCRITOS_POR_CODIGO[r.valor]
    const existe = escrito ? actual.includes(escrito) : (r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor))
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe${escrito ? ' (escrito por código)' : ''}`, existe, `referencia sin destino: ${r.como}`)
  }

  // 4. Los ids de la pantalla de proyectos se fueron del archivo (no quedaron
  // escondidos en otra etiqueta).
  for (const id of ['modal-proyectos', 'btn-abrir-proyectos', 'proyectos-lista', 'proyecto-nuevo', 'btn-proyecto-nuevo', 'ms-unidad', 'ms-unidad-panel']) {
    chk(`#${id} ya no está en gastos.html`, !A.ids.has(id))
  }

  const nuevos = [...A.cuenta.entries()].filter(([k, n]) => n > (B.cuenta.get(k) || 0))
  if (nuevos.length) {
    console.log(`NUEVO respecto de ${BASE_COMMIT} (se permite, se lista):`)
    for (const [k, n] of nuevos) console.log(`  + ${k} (${B.cuenta.get(k) || 0} → ${n})`)
  }
  console.log('DECLARADOS:')
  for (const [k, v] of Object.entries(RETIRADOS)) console.log(`  - retirado ${k}: ${v}`)
  for (const [k, [d]] of Object.entries(MOVIDOS)) console.log(`  → movido ${k} a ${d}`)
  for (const [k, [n]] of Object.entries(MENOS_COPIAS)) console.log(`  ≈ ${k}: ahora ${n}`)
  if (process.env.LISTAR) for (const [k, n] of [...A.cuenta.entries()].sort()) console.log(`  ${n} ${k}`)
  for (const f of fallas) console.log('FALLA ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
} catch (e) {
  console.log('ERROR ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
}
