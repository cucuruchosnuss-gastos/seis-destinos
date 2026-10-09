// Runner de mutaciones genérico, para las suites del circuito.
//
// Dos clases de mutación:
//  - AUTOMÁTICAS: cada `${esc(...)}` dentro de las funciones nombradas pierde
//    su esc(). Exigen que la suite se ponga en ROJO.
//  - A MANO: reemplazos de comportamiento (una condición, un parámetro de RPC)
//    que cada mut-*.js declara con su nombre.
//
// Los tres guards del runner de Cobranzas, por los mismos bugs documentados:
//  - Si la suite NO está verde sobre el archivo limpio, las mutaciones no
//    miden nada (toda mutación se reportaría "detectada"). Se aborta.
//  - Cada mutación necesita un ANCLA ÚNICA en el archivo. La automática agranda
//    el contexto hasta conseguirla; la de a mano, si no es única, aborta
//    nombrándola en vez de mutar el renglón equivocado.
//    Cuando el texto NO EXISTE (el código cambió), dice la línea más parecida
//    del archivo (parecido.js), y cuando NO ES ÚNICO, en qué líneas está.
//  - Una mutación que no cambia el archivo es un ERROR DEL TEST, nunca
//    cobertura. Y el sub-proceso informa cuántos caracteres leyó, para que el
//    runner confirme que leyó el mutado y no el limpio.
//
// Las mutaciones corren DE A UNA, nunca superpuestas: execFileSync espera a
// que termine cada sub-proceso antes de escribir la siguiente.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { interpolaciones } = require('./escaner-interpolaciones')
const { rangosDeFunciones } = require('./circuito-comun')
const { pistaDeAncla } = require('./parecido')

// `variable`: la variable de entorno por la que la suite recibe el archivo
// (ARCHIVO_TEST por defecto; una suite que lee DOS archivos recibe el otro por
// otra). `salir: false` devuelve el resultado en vez de terminar el proceso,
// para correr las mutaciones de dos archivos en un solo runner.
// `region` (opcional): una función texto → { ini, fin } que acota las
// mutaciones a un pedazo del archivo (la cartera de cheques vive en una región
// de administracion.html: fuente-cheques.js). Las funciones se buscan, el
// ancla se exige única y el reemplazo se aplica SOLO adentro de la región.
function correrMutacionesEn({ suite, original, funciones, escape = 'esc', manuales = [], equivalentes = [], variable = 'ARCHIVO_TEST', salir = true, region = null }) {
  const src = fs.readFileSync(original, 'utf8')
  const lim = region ? region(src) : null
  if (region && !lim) { console.log('ABORTADO: no se encontró la región en ' + original); process.exit(2) }
  const RI = lim ? lim.ini : 0
  const RF = lim ? lim.fin : src.length
  const zona = src.slice(RI, RF)
  // La región con saltos de línea adelante: los números de línea del archivo.
  const zonaConLineas = '\n'.repeat(src.slice(0, RI).split('\n').length - 1) + zona
  const enZona = (zonaMutada) => src.slice(0, RI) + zonaMutada + src.slice(RF)
  const TMP = path.join(__dirname, `mut-tmp-${path.basename(suite, '.js')}${variable === 'ARCHIVO_TEST' ? '' : '-' + variable.toLowerCase()}.html`)

  function correr(archivo) {
    try {
      const salida = execFileSync(process.execPath, [suite], {
        encoding: 'utf8', env: { ...process.env, [variable]: archivo }, stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { rojo: false, salida }
    } catch (err) {
      return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') }
    }
  }

  // ── Guard 1 ─────────────────────────────────────────────────────────────
  const limpio = correr(original)
  if (limpio.rojo) {
    console.log('ABORTADO: la suite NO está verde sobre el archivo limpio, así que las mutaciones no medirían nada.')
    console.log(limpio.salida)
    process.exit(2)
  }
  console.log('Suite sobre el limpio:', limpio.salida.trim().split('\n').pop())

  function unica(texto, aguja) {
    let c = 0, d = 0, k
    while ((k = texto.indexOf(aguja, d)) !== -1) { c++; d = k + 1; if (c > 1) break }
    return c === 1
  }

  // ── Automáticas: sacar cada esc() de las funciones nuevas ───────────────
  const rangos = rangosDeFunciones(zonaConLineas, funciones, (n, ok, det) => { if (!ok) { console.log('ABORTADO:', n, det); process.exit(2) } })
  // Sin funciones no hay automáticas: no se escanea (un .js que menciona "<script" rompería el escáner).
  const { interpolaciones: todas } = funciones.length ? interpolaciones(original) : { interpolaciones: [] }
  const lineas = src.split('\n')
  const mutaciones = []
  const ambiguas = []
  for (const x of todas) {
    if (!x.html || !rangos.some(r => x.linea >= r.desde && x.linea <= r.hasta)) continue
    if (!x.expr.trim().startsWith(escape + '(')) continue
    const aguja = '${' + x.expr + '}'
    const offsetLinea = lineas.slice(0, x.linea - 1).join('\n').length + (x.linea > 1 ? 1 : 0)
    const idx = src.indexOf(aguja, Math.max(RI, offsetLinea - 200))
    if (idx === -1 || idx >= RF) { ambiguas.push(`línea ${x.linea}: no se encontró «${aguja.slice(0, 60)}»`); continue }
    let ancla = null
    for (let extra = 0; extra < 400 && !ancla; extra += 10) {
      const t = src.slice(Math.max(RI, idx - extra), Math.min(RF, idx + aguja.length + extra))
      if (unica(zona, t)) ancla = t
    }
    if (!ancla) { ambiguas.push(`línea ${x.linea}: sin ancla única`); continue }
    const sinEsc = '${' + x.expr.trim().replace(new RegExp('^' + escape + '\\('), '(') + '}'
    const eq = equivalentes.find(e => e.expr === x.expr.trim())
    mutaciones.push({
      nombre: `línea ${x.linea}: sin ${escape}() en ${x.expr.trim().slice(0, 70)}`,
      // Con función: un texto de reemplazo con "$'", "$&" o "$$" NO se
      // interpreta (String.replace con un string los expande y la mutación
      // pasa a ser otra, que casi siempre rompe el archivo y "se detecta").
      mutado: enZona(zona.replace(ancla, () => ancla.replace(aguja, () => sinEsc))),
      equivalente: eq?.motivo,
    })
  }

  // ── A mano ──────────────────────────────────────────────────────────────
  for (const m of manuales) {
    if (!unica(zona, m.de)) {
      const lineasAntes = src.slice(0, RI).split('\n').length - 1
      ambiguas.push(`«${m.nombre}»: el texto a reemplazar ${zona.includes(m.de) ? 'NO ES ÚNICO' : 'NO EXISTE'} en ${path.basename(original)}\n${pistaDeAncla(zona, m.de, lineasAntes)}`)
      continue
    }
    mutaciones.push({ nombre: m.nombre, mutado: enZona(zona.replace(m.de, () => m.a)) })
  }

  if (ambiguas.length) {
    console.log('ABORTADO: mutaciones sin ancla única (mutarían el renglón equivocado):')
    for (const a of ambiguas) console.log('  ' + a)
    process.exit(2)
  }

  // ── Correr, de a una ────────────────────────────────────────────────────
  let detectadas = 0
  const escaparon = [], equivs = [], errores = []
  for (const m of mutaciones) {
    if (m.mutado === src) { errores.push(`${m.nombre}: la mutación no cambió nada`); continue }
    fs.writeFileSync(TMP, m.mutado)
    const r = correr(TMP)
    // Lo que leyó el sub-proceso DE ESTE archivo (una suite puede leer dos).
    const lineasSalida = r.salida.split(/\r?\n/)
    const lineaLeida = lineasSalida.find(l => /^(ARCHIVO|COMUN) /.test(l) && l.includes(TMP)) ?? lineasSalida.find(l => l.startsWith('ARCHIVO ')) ?? ''
    const leido = (lineaLeida.match(/(?:ARCHIVO|COMUN) .* \((\d+) bytes\)/) || [])[1]
    if (Number(leido) !== m.mutado.length) { errores.push(`${m.nombre}: el sub-proceso leyó ${leido} y se escribieron ${m.mutado.length}`); continue }
    if (m.equivalente) { equivs.push(`${m.nombre} — ${m.equivalente}${r.rojo ? ' (igual dio rojo)' : ''}`); continue }
    if (r.rojo) detectadas++
    else escaparon.push(m.nombre)
  }
  try { fs.unlinkSync(TMP) } catch { /* no estaba */ }

  const total = mutaciones.length - equivs.length - errores.length
  for (const e of escaparon) console.log('  ESCAPÓ: ' + e)
  for (const e of errores) console.log('  ERROR DEL TEST: ' + e)
  for (const e of equivs) console.log('  equivalente: ' + e)
  console.log(`${detectadas}/${total} mutaciones detectadas${equivs.length ? ` (+${equivs.length} equivalentes, aparte)` : ''}`)
  // Un "0/0" con errores del test no es verde: se dice (antes se leía como si no hubiera nada que medir).
  if (errores.length) console.log(`ROJO: ${errores.length} ${errores.length === 1 ? 'error' : 'errores'} del test (arriba): esas mutaciones no midieron nada`)
  const res = { detectadas, total, equivalentes: equivs.length, fallas: escaparon.length + errores.length }
  if (!salir) return res
  process.exit(escaparon.length || errores.length ? 1 : 0)
}

// Una suite que prueba DOS archivos (la planta y la gestión de Producción, por
// ejemplo): cada tanda de mutaciones va sobre su archivo y por su variable.
// Termina el proceso con el total.
function correrMutacionesEnVarios(tandas) {
  let det = 0, tot = 0, eq = 0, mal = 0
  for (const t of tandas) {
    console.log(`── ${path.basename(t.original)} (${t.variable ?? 'ARCHIVO_TEST'}) ──`)
    const r = correrMutacionesEn({ ...t, salir: false })
    det += r.detectadas; tot += r.total; eq += r.equivalentes; mal += r.fallas
  }
  console.log(`TOTAL: ${det}/${tot} mutaciones detectadas${eq ? ` (+${eq} equivalentes, aparte)` : ''}`)
  process.exit(mal ? 1 : 0)
}

// ── Cada mutación, al archivo donde está su código (28/09/2026) ──────────────
// Una función o un texto que el HTML ya no tiene porque se mudó a js/ (y el
// HTML lo importa) se muta en ESE archivo, pasándoselo a la suite por su
// variable (imports.js: ARCHIVO_JS_<NOMBRE>, o el alias viejo). Así mudar código
// a js/ no obliga a tocar ningún mut-*.js. Lo que sigue en el HTML se muta ahí,
// igual que siempre; sin nada que derivar, el runner hace exactamente lo de antes.

function declaraFuncion(texto, nombre) {
  return new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${nombre}\\s*\\(`).test(texto)
}

// El texto de una mutación a mano puede venir con la sangría del <script>
// (4 espacios, a veces 2 o 6): se prueba sin ella.
function variantesSinSangria(t) {
  const out = []
  for (const n of [4, 2, 6, 8]) {
    const pre = ' '.repeat(n)
    const v = t.split('\n').map(l => l.startsWith(pre) ? l.slice(n) : l).join('\n')
    if (v !== t && !out.includes(v)) out.push(v)
  }
  return out
}

// Las mutaciones automáticas (sacar el escape) de una función que vive en un
// .js: el escáner de interpolaciones es para HTML, así que acá se buscan los
// `${esc(` de la función a mano, con el paréntesis balanceado.
function automaticasEnJs(texto, funcion, escape) {
  const { extraerFn, cuerpoDesde } = require('./extraer')
  const cuerpo = extraerFn(texto, funcion)
  const base = texto.indexOf(cuerpo)
  const out = []
  let d = 0, k
  const abre = '${' + escape + '('
  while ((k = cuerpo.indexOf(abre, d)) !== -1) {
    d = k + 1
    const paren = k + 2 + escape.length
    let dentro
    try { dentro = cuerpoDesde(cuerpo, paren) } catch { continue }
    if (cuerpo[paren + dentro.length] !== '}') continue
    const aguja = cuerpo.slice(k, paren + dentro.length + 1)
    const sinEsc = '${' + dentro + '}'
    const pos = base + k
    let ancla = null
    for (let extra = 0; extra < 400 && !ancla; extra += 10) {
      const t = texto.slice(Math.max(0, pos - extra), pos + aguja.length + extra)
      if (texto.split(t).length === 2) ancla = t
    }
    if (!ancla) continue
    out.push({ nombre: `${funcion}: sin ${escape}() en ${aguja.slice(2, 72)}`, de: ancla, a: ancla.replace(aguja, () => sinEsc) })
  }
  return out
}

// Devuelve las tandas (una por archivo) o null si no hay nada que derivar.
function planificarMutaciones(opts) {
  const { original, funciones = [], manuales = [], equivalentes = [], escape = 'esc', region = null, variable = 'ARCHIVO_TEST' } = opts
  // Una región (la cartera de cheques) o un archivo que no es HTML: tal cual.
  if (region || !/\.html$/i.test(original)) return null
  const src = fs.readFileSync(original, 'utf8')
  const imps = [...require('./imports').archivosDe(original)]
  if (!imps.length) return null
  const locales = { f: [], m: [] }
  const porArchivo = new Map()
  const destino = (a) => {
    if (!porArchivo.has(a.ruta)) porArchivo.set(a.ruta, { archivo: a, manuales: [] })
    return porArchivo.get(a.ruta)
  }
  for (const f of funciones) {
    if (declaraFuncion(src, f)) { locales.f.push(f); continue }
    const a = imps.find(x => declaraFuncion(x.texto, f))
    if (!a) { locales.f.push(f); continue }   // que aborte como siempre, nombrándola
    destino(a).manuales.push(...automaticasEnJs(a.texto, f, escape))
  }
  for (const m of manuales) {
    if (src.includes(m.de)) { locales.m.push(m); continue }
    let hecho = false
    for (const a of imps) {
      if (a.texto.includes(m.de)) { destino(a).manuales.push(m); hecho = true; break }
      const v = variantesSinSangria(m.de).find(x => a.texto.includes(x))
      if (v) {
        const i = variantesSinSangria(m.de).indexOf(v)
        const va = variantesSinSangria(m.a)[i] ?? m.a
        destino(a).manuales.push({ ...m, de: v, a: va }); hecho = true; break
      }
    }
    if (!hecho) locales.m.push(m)                // que aborte como siempre
  }
  if (!porArchivo.size) return null
  const tandas = []
  if (locales.f.length || locales.m.length) tandas.push({ ...opts, funciones: locales.f, manuales: locales.m, variable })
  for (const { archivo, manuales: ms } of porArchivo.values()) {
    tandas.push({ suite: opts.suite, original: archivo.ruta, funciones: [], manuales: ms, equivalentes, escape, variable: archivo.variable })
  }
  return tandas
}

function correrMutaciones(opts) {
  const tandas = planificarMutaciones(opts)
  if (!tandas) return correrMutacionesEn(opts)
  if (opts.salir === false) {
    let det = 0, tot = 0, eq = 0, mal = 0
    for (const t of tandas) { const r = correrMutacionesEn({ ...t, salir: false }); det += r.detectadas; tot += r.total; eq += r.equivalentes; mal += r.fallas }
    return { detectadas: det, total: tot, equivalentes: eq, fallas: mal }
  }
  correrMutacionesEnVarios(tandas)
}

module.exports = { correrMutaciones, correrMutacionesEn, correrMutacionesEnVarios, planificarMutaciones, automaticasEnJs, variantesSinSangria }
