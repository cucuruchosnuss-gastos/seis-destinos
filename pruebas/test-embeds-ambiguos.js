// Embeds de PostgREST que quedan AMBIGUOS entre dos tablas (24/09/2026).
//
// El caso: Accesos dejó de cargar. `empleados` con `unidades_negocio (nombre)`
// pasó a contestar HTTP 300 (PGRST201, "more than one relationship was
// found"): además de la FK directa empleados.unidad_negocio_id, PostgREST ve
// un camino muchos a muchos por puestos_produccion (FK a las dos). Medido con
// la API el 24/09/2026: de los 23 pares de embed del repo, ese es el ÚNICO que
// da 300; los demás resuelven. Cualquier tabla nueva con FK a las dos suma
// otro camino, así que el embed tiene que nombrar la FK siempre.
//
// La suite hace tres cosas:
//  1. Recorre TODOS los HTML y JS del repo (menos pruebas/) y exige que todo
//     embed entre un par de PARES_AMBIGUOS —en los dos sentidos, también
//     anidado— nombre la FK con `!`.
//  2. Prueba el propio escáner con casos sintéticos, para que un escáner que
//     no encuentra nada no dé verde por no mirar.
//  3. Ejecuta fallasDeCarga / textoFallasDeCarga de accesos.html: la pantalla
//     tiene que decir QUÉ consulta falló, con el código y el mensaje.
//
//   node pruebas/test-embeds-ambiguos.js
//   ARCHIVO_TEST=<copia de accesos.html> node pruebas/test-embeds-ambiguos.js

const fs = require('fs')
const path = require('path')
const { extraerFn } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ACCESOS = path.join(RAIZ, 'modulos/accesos.html')
const ARCHIVO = process.env.ARCHIVO_TEST || ACCESOS
const srcAccesos = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${srcAccesos.length} bytes)`)
const { chk, fin } = arnes()

// Pares de tablas con más de un camino entre ellas. Agregar acá el próximo.
const PARES_AMBIGUOS = [['empleados', 'unidades_negocio']]
const FK_ESPERADA = 'unidades_negocio!empleados_unidad_negocio_id_fkey'

// ── El escáner ───────────────────────────────────────────────────────────────
// Toma cada `.from('tabla')` seguido (en la misma sentencia) de `.select('…')`
// y recorre los embeds anidados del string. Devuelve { padre, hijo, fk, linea }.
function embedsDe(src) {
  const res = []
  const re = /\.from\(\s*(['"`])([a-z_]+)\1\s*\)/g
  let m
  while ((m = re.exec(src))) {
    const base = m[2]
    const resto = src.slice(re.lastIndex, re.lastIndex + 2000)
    const corte = resto.search(/\.from\(|;\s*\n/)
    const tramo = corte === -1 ? resto : resto.slice(0, corte)
    const sm = /\.select\(\s*(['"`])([\s\S]*?)\1/.exec(tramo)
    if (!sm) continue
    const linea = src.slice(0, m.index).split('\n').length
    recorrer(sm[2], base, linea, res)
  }
  return res
}

function recorrer(t, padre, linea, res) {
  let i = 0
  while (i < t.length) {
    const mm = /^(?:[a-z_]+\s*:\s*)?([a-z_]+)(\s*!\s*[a-z_]+)?\s*\(/.exec(t.slice(i))
    if (mm && (i === 0 || /[,\s(]/.test(t[i - 1]))) {
      let j = i + mm[0].length, d = 1
      while (j < t.length && d) { if (t[j] === '(') d++; else if (t[j] === ')') d--; j++ }
      const hijo = mm[1]
      res.push({ padre, hijo, fk: mm[2] ? mm[2].replace(/[\s!]/g, '') : null, linea })
      recorrer(t.slice(i + mm[0].length, j - 1), hijo, linea, res)
      i = j
    } else i++
  }
}

function ambiguo(e) {
  return PARES_AMBIGUOS.some(([a, b]) => (e.padre === a && e.hijo === b) || (e.padre === b && e.hijo === a))
}

// ── 2. El escáner funciona ───────────────────────────────────────────────────
{
  const e1 = embedsDe("supabase.from('empleados').select('id, unidades_negocio (nombre)')")
  chk('escáner: encuentra el embed sin FK', e1.length === 1 && e1[0].padre === 'empleados' && e1[0].hijo === 'unidades_negocio' && e1[0].fk === null)
  const e2 = embedsDe("supabase.from('empleados').select('id, unidades_negocio!empleados_unidad_negocio_id_fkey (nombre)')")
  chk('escáner: lee la FK nombrada', e2.length === 1 && e2[0].fk === 'empleados_unidad_negocio_id_fkey')
  const e3 = embedsDe("supabase.from('gastos')\n  // comentario largo\n  .select(`id,\n  empleados (nombre, unidades_negocio (nombre))`)")
  chk('escáner: encuentra el par ANIDADO y en varias líneas', e3.some(e => e.padre === 'empleados' && e.hijo === 'unidades_negocio' && ambiguo(e)))
  const e4 = embedsDe("supabase.from('unidades_negocio').select('id, empleados (nombre)')")
  chk('escáner: el par en el otro sentido también es ambiguo', e4.length === 1 && ambiguo(e4[0]))
  const e5 = embedsDe("supabase.from('gastos').select('id, unidades_negocio (id, nombre)')")
  chk('escáner: gastos → unidades_negocio NO es ambiguo', e5.length === 1 && !ambiguo(e5[0]))
  const e6 = embedsDe("supabase.from('empleados').select('id, alias:unidades_negocio (nombre)')")
  chk('escáner: con alias también lo encuentra', e6.length === 1 && e6[0].hijo === 'unidades_negocio' && e6[0].fk === null)
}

// ── 1. Todo el repo ──────────────────────────────────────────────────────────
function archivosDelRepo() {
  const lista = []
  for (const dir of ['', 'modulos', 'js']) {
    const d = path.join(RAIZ, dir)
    for (const f of fs.readdirSync(d)) if (/\.(html|js)$/.test(f)) lista.push(path.join(d, f))
  }
  return lista
}

let totalEmbeds = 0
let paresRevisados = 0
for (const archivo of archivosDelRepo()) {
  const esAccesos = path.resolve(archivo) === path.resolve(ACCESOS)
  const src = esAccesos ? srcAccesos : fs.readFileSync(archivo, 'utf8')
  const rel = path.relative(RAIZ, archivo).replace(/\\/g, '/')
  for (const e of embedsDe(src)) {
    totalEmbeds++
    if (!ambiguo(e)) continue
    paresRevisados++
    chk(`${rel}:${e.linea} ${e.padre} → ${e.hijo} nombra la FK`, !!e.fk, 'sin `!fk` PostgREST contesta 300 (PGRST201)')
  }
}
chk('el escáner encontró embeds en el repo (si no, no miró nada)', totalEmbeds >= 20, `encontró ${totalEmbeds}`)

// El embed de Accesos existe y nombra exactamente la FK directa: nombrar la de
// puestos_produccion daría las unidades donde la persona tiene un puesto, no
// la suya.
const deAccesos = embedsDe(srcAccesos).filter(e => e.padre === 'empleados' && e.hijo === 'unidades_negocio')
chk('accesos.html sigue trayendo la unidad de cada empleado por embed', deAccesos.length >= 1)
chk('accesos.html nombra la FK directa (empleados_unidad_negocio_id_fkey)', deAccesos.length >= 1 && deAccesos.every(e => `${e.hijo}!${e.fk}` === FK_ESPERADA))
chk('se revisó al menos un par ambiguo', paresRevisados >= 1)

// ── 3. Qué consulta falló ────────────────────────────────────────────────────
function cargarFn(nombre) {
  try { return new Function(extraerFn(srcAccesos, nombre) + `\nreturn ${nombre}`)() }
  catch (e) { chk(`accesos.html tiene ${nombre}()`, false, e.message); return () => { throw new Error(`falta ${nombre}`) } }
}
const fallasDeCarga = cargarFn('fallasDeCarga')
const textoFallasDeCarga = cargarFn('textoFallasDeCarga')

try {
  const err300 = { code: 'PGRST201', message: "Could not embed because more than one relationship was found for 'empleados' and 'unidades_negocio'" }
  const f = fallasDeCarga([
    ['las solicitudes de acceso', { data: [], error: null }],
    ['los empleados', { data: null, error: err300 }],
    ['los módulos de cada persona', { data: [], error: null }],
    ['las unidades de negocio', { data: [], error: null }],
  ])
  chk('fallasDeCarga: devuelve SOLO la que falló', f.length === 1 && f[0].que === 'los empleados' && f[0].error === err300)
  const txt = textoFallasDeCarga(f)
  chk('el texto nombra la consulta que falló', txt.includes('los empleados'), txt)
  chk('el texto trae el código del error', txt.includes('PGRST201'), txt)
  chk('el texto trae el mensaje del error', txt.includes('more than one relationship'), txt)
  chk('el texto no nombra las que anduvieron', !txt.includes('solicitudes') && !txt.includes('unidades de negocio'), txt)

  const dos = fallasDeCarga([
    ['las solicitudes de acceso', { error: { code: '42501', message: 'permission denied' } }],
    ['los empleados', { error: null }],
    ['los módulos de cada persona', { error: { message: 'Failed to fetch' } }],
  ])
  const txt2 = textoFallasDeCarga(dos)
  chk('con dos fallas nombra las dos', dos.length === 2 && txt2.includes('solicitudes') && txt2.includes('módulos'), txt2)
  chk('sin código no inventa uno', txt2.includes('(Failed to fetch)'), txt2)
  chk('sin fallas, lista vacía', fallasDeCarga([['x', { error: null }], ['y', {}]]).length === 0)
} catch (e) { chk('los helpers de carga se pueden ejecutar', false, e.message) }

// cargarTodo usa esas dos funciones, deja cada error en consola y ya no tiene
// el mensaje genérico que tapaba cuál fue.
let cargar = ''
try { cargar = extraerFn(srcAccesos, 'cargarTodo') } catch (e) { chk('accesos.html tiene cargarTodo()', false, e.message) }
chk('cargarTodo arma las fallas con fallasDeCarga', /const fallas = fallasDeCarga\(/.test(cargar))
chk('cargarTodo corta si hay alguna falla', /if \(fallas\.length\) \{/.test(cargar))
chk('cargarTodo deja cada error en console.error', /for \(const f of fallas\) console\.error\([^)]*f\.error\)/.test(cargar))
chk('cargarTodo muestra el texto con la consulta y el error', /mostrarError\(textoFallasDeCarga\(fallas\)\)/.test(cargar))
chk('las cuatro consultas entran a fallasDeCarga', ['solRes', 'empRes', 'modRes', 'unidRes'].every(v => new RegExp(`\\['[^']+', ${v}\\]`).test(cargar)))
chk('ya no está el mensaje genérico', !/No se pudieron cargar los datos de Accesos/.test(cargar))

fin()
