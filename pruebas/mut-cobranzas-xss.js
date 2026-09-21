// Runner de mutaciones: saca cada escCob y exige que la suite se ponga en ROJO.
//
// Tres guards, los tres por bugs ya documentados en el proyecto:
//  - Si la suite NO está verde sobre el archivo limpio, las mutaciones no
//    miden nada: toda mutación se reportaría como "detectada". Se aborta.
//  - Cada mutación usa un ANCLA ÚNICA (se agranda el contexto hasta que lo
//    sea). Si no se consigue, se aborta nombrándola en vez de mutar el renglón
//    equivocado y reportar un hueco que no existe.
//  - Una mutación que no cambia el archivo es un ERROR DEL TEST, nunca
//    cobertura. Y el sub-proceso confirma cuántos bytes leyó.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { interpolaciones } = require('./escaner-interpolaciones')

const RAIZ = path.join(__dirname, '..')
const ORIGINAL = process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html')
const SOLO = process.env.SOLO || ''          // '' | 'render' (para medir sin el estático)
const TMP = path.join(__dirname, 'mut-tmp.html')

const src = fs.readFileSync(ORIGINAL, 'utf8')

function correr(archivo) {
  try {
    const salida = execFileSync(process.execPath, [path.join(__dirname, 'test-cobranzas-xss.js')], {
      encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: archivo, SOLO },
    })
    return { rojo: false, salida }
  } catch (err) {
    return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') }
  }
}

// ── Guard 1: verde sobre el limpio ────────────────────────────────────────
const limpio = correr(ORIGINAL)
if (limpio.rojo) {
  console.log('ABORTADO: la suite NO está verde sobre el archivo limpio, así que las mutaciones no medirían nada.')
  console.log(limpio.salida)
  process.exit(2)
}
console.log('Suite sobre el limpio:', limpio.salida.trim().split('\n').pop())

// ── Construcción de las mutaciones ────────────────────────────────────────
const { interpolaciones: todas } = interpolaciones(ORIGINAL)
const objetivo = todas.filter(x => x.html && /^\s*escCob\(/.test(x.expr))

function anclaUnica(texto, centro, largoInicial) {
  for (let extra = 0; extra < 400; extra += 10) {
    const ini = Math.max(0, centro - extra)
    const fin = Math.min(texto.length, centro + largoInicial + extra)
    const ancla = texto.slice(ini, fin)
    let cuenta = 0, desde = 0, k
    while ((k = texto.indexOf(ancla, desde)) !== -1) { cuenta++; desde = k + 1; if (cuenta > 1) break }
    if (cuenta === 1) return { ancla, ini, fin }
  }
  return null
}

// EQUIVALENTES declaradas a mano, CON SU MOTIVO. Una mutación equivalente no
// puede cambiar ninguna salida posible, así que no es un hueco de cobertura —
// pero se cuenta APARTE y nunca se suma a las detectadas. La lista es explícita
// justamente para que no crezca sola y tape un hueco de verdad.
const EQUIVALENTES = [{
  expr: "escCob(ch.tipo === 'diferido' ? 'Diferido' : 'Común')",
  motivo: "las dos ramas son literales del código sin ningún carácter escapable: escCob('Diferido') === 'Diferido' y escCob('Común') === 'Común', así que la página sale idéntica",
}]

const mutaciones = []
const ambiguas = []
for (const x of objetivo) {
  // Posición exacta de esta interpolación en el fuente.
  const aguja = '${' + x.expr + '}'
  // Puede haber muchas iguales: se ubica por línea.
  const lineas = src.split('\n')
  const offsetLinea = lineas.slice(0, x.linea - 1).join('\n').length + (x.linea > 1 ? 1 : 0)
  const idx = src.indexOf(aguja, Math.max(0, offsetLinea - 200))
  if (idx === -1) { ambiguas.push(`línea ${x.linea}: no se encontró «${aguja.slice(0, 50)}»`); continue }

  const u = anclaUnica(src, idx, aguja.length)
  if (!u) { ambiguas.push(`línea ${x.linea}: no se consiguió un ancla única para «${aguja.slice(0, 50)}»`); continue }

  const sinEsc = x.expr.trim().replace(/^escCob\(/, '').replace(/\)$/, '')
  const reemplazo = u.ancla.replace(aguja, '${' + sinEsc + '}')
  const equivalente = EQUIVALENTES.some(e => e.expr === x.expr.trim().replace(/\s+/g, ' '))
  mutaciones.push({
    nombre: `línea ${x.linea}: sacar escCob de ${x.expr.trim().replace(/\s+/g, ' ').slice(0, 60)}`,
    ancla: u.ancla, reemplazo, equivalente,
  })
}

// Los .map(escCob) también se mutan.
for (const m of ['cambios.map(escCob).join', 'errores.map(escCob).join', 'todo.map(escCob).join']) {
  const veces = src.split(m).length - 1
  if (veces !== 1) { ambiguas.push(`«${m}» aparece ${veces} veces`); continue }
  mutaciones.push({
    nombre: `sacar el escCob de ${m}`,
    ancla: m, reemplazo: m.replace('.map(escCob)', ''),
  })
}

// Mutaciones de COMPORTAMIENTO: no sacan un escape, rompen una regla de un
// render. Cada ancla tiene que ser ÚNICA en el archivo; si no, se aborta.
const COMPORTAMIENTO = [
  ['pie: el caso CMC-7 muestra el desglose como si se hubiera leído',
    "if (c.completado_desde_cmc7) return '<div class=\"cob-campo__ayuda\">", "if (false) return '<div class=\"cob-campo__ayuda\">"],
  ['pie: el desglose guarda el número pegado a su dígito',
    'Se guarda ${escCob(d.slice(0, largo - 1))}', 'Se guarda ${escCob(d)}'],
  ['pie: un renglón corto también muestra el desglose',
    "if (est !== 'ok') return ''", "if (est !== 'ok' && est !== 'corto') return ''"],
  ['pie: un renglón que no cierra no avisa',
    "if (est === 'mal') return '<div class=\"cob-campo__error\">", "if (false) return '<div class=\"cob-campo__error\">"],
  ['renglones: el prellenado vuelve a pegar el número a su dígito',
    "return `${partes.join('-')} ${dv}`", "return `${partes.join('')}${dv}`"],
  ['renglones: un renglón sin dígito se prellena a medias',
    "if (dv === null || dv === undefined || dv === '') return ''", "if (dv === null) return ''"],
]
for (const [nombre, ancla, reemplazo] of COMPORTAMIENTO) {
  const veces = src.split(ancla).length - 1
  if (veces !== 1) { ambiguas.push(`«${nombre}»: el ancla aparece ${veces} veces`); continue }
  mutaciones.push({ nombre, ancla, reemplazo })
}

if (ambiguas.length) {
  console.log('\nMUTACIONES ABORTADAS POR AMBIGÜEDAD (no se reportan como huecos de cobertura):')
  for (const a of ambiguas) console.log('  · ' + a)
}

// ── Correr ────────────────────────────────────────────────────────────────
let detectadas = 0
const escapadas = [], equivalentes = []
for (const m of mutaciones) {
  const mutado = src.replace(m.ancla, m.reemplazo)
  if (mutado === src) { console.log('ERROR DEL TEST: la mutación no cambió nada → ' + m.nombre); process.exit(3) }
  fs.writeFileSync(TMP, mutado)
  const r = correr(TMP)
  // El sub-proceso dice cuántos bytes leyó: así se sabe que leyó el MUTADO.
  const bytes = Number((r.salida.match(/\((\d+) bytes\)/) || [])[1] || 0)
  if (bytes !== mutado.length) {
    console.log(`ERROR DEL TEST: el sub-proceso leyó ${bytes} caracteres y el mutado tiene ${mutado.length} → ${m.nombre}`)
    process.exit(4)
  }
  if (m.equivalente) { equivalentes.push(m.nombre); continue }
  if (r.rojo) detectadas++
  else escapadas.push(m.nombre)
}

fs.existsSync(TMP) && fs.unlinkSync(TMP)
const reales = mutaciones.length - equivalentes.length
console.log(`\nMUTACIONES${SOLO ? ' (SOLO=' + SOLO + ')' : ''}: ${detectadas}/${reales} detectadas` +
  (equivalentes.length ? `, más ${equivalentes.length} EQUIVALENTES contadas aparte` : ''))
for (const e of equivalentes) console.log('  equivalente → ' + e)
if (equivalentes.length) for (const m of EQUIVALENTES) console.log('     motivo: ' + m.motivo)
for (const e of escapadas) console.log('  ESCAPÓ → ' + e)
