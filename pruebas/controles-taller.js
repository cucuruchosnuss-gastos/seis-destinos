// NINGÚN CONTROL SE PIERDE en modulos/taller.html (Proyectos Taller, 28/09/2026).
//
// Mismo criterio y mismo inventario que controles-cobranzas.js (ver su
// encabezado por el detalle de qué se lista y por qué).
//
// Baseline: el commit FIJO de abajo, NUNCA HEAD (ver pruebas/README.md): el
// commit que creó el módulo. Lo que venga después (los botones, campos y
// pantallas que se agreguen) se permite y se lista; lo que desaparezca, rojo.
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

const BASE_COMMIT = 'daed9a4'
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/taller.html')

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
}

// Controles RETIRADOS a propósito (el diseño "Proyectos Taller", 29/09/2026):
// clave → motivo. Un retirado que vuelve a aparecer pone la prueba en rojo
// (la declaración sobra y taparía el próximo).
const RETIRADOS = {
  'control:a[href=../dashboard.html]{&lsaquo; Volver}': 'el diseño no tiene "‹ Volver": se vuelve con la barra lateral (Inicio) y, en el celular, con la barra de abajo',
  'control:button[data-filtro-destino][type=button]': 'el filtro de destino pasó a un select ("Externos e internos", #tl-filtro-destino), como en el diseño 1a',
  'data:data-filtro-destino': 'el mismo filtro de destino, ahora un select (#tl-filtro-destino)',
  'control:input#tl-venta-fecha[type=date]': 'la ventana de facturar del diseño (3a/3b) no pide fecha: facturar_proyecto y cargar_proyecto_a_fabrica reciben la de hoy (hoyArgentina())',
  'id:tl-venta-fecha': 'la misma fecha de la venta, que ya no se pide',
  'id:tl-ed-slot-venta': 'renombrado a #tl-ed-slot-precio: sin permiso de precios la palabra "venta" no puede estar en el DOM, ni en un id',
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
    : execFileSync('git', ['show', `${BASE_COMMIT}:modulos/taller.html`], {
        cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      })
  console.log(`BASELINE:${base.length} de ${process.env.ARCHIVO_BASE || BASE_COMMIT + ':modulos/taller.html'}`)

  const B = inventario(base)
  const A = inventario(actual)

  chk('el baseline tiene controles (si da cero, el inventario no está leyendo nada)',
    [...B.cuenta.keys()].filter(k => k.startsWith('control:')).length > 10)
  chk('el baseline tiene ids', B.ids.size > 30, B.ids.size)

  // 1. Todo lo del baseline sigue estando, al menos las mismas veces.
  const nuevosRenombres = []
  for (const [k, m] of Object.entries(RETIRADOS)) {
    console.log(`RETIRADO: ${k} (${m})`)
    chk(`el retirado ${k} ya no está`, !(A.cuenta.get(k) > 0), 'sigue estando: sacá la declaración de RETIRADOS')
    chk(`el retirado ${k} estaba en el baseline`, B.cuenta.get(k) > 0, 'no estaba: la declaración sobra')
  }
  for (const [k, n] of [...B.cuenta.entries()].sort()) {
    if (RETIRADOS[k]) continue
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
