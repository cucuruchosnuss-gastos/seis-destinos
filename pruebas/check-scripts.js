// El archivo entero, COMO LO VE EL NAVEGADOR.
//
// El harness valida fragmentos; el navegador parsea el archivo completo antes
// de ejecutar una línea. Un `const` que choca con una `function` declarada 700
// líneas más abajo es un SyntaxError y deja el módulo muerto, con 32 mutaciones
// en verde. Esto hace las dos cosas:
//   1. parsea CADA bloque <script> por separado con node --check (cada uno
//      tiene su propio scope: concatenarlos daría falsos positivos);
//   2. busca identificadores DUPLICADOS en el top-level, porque con dos
//      `function` o dos `var` JavaScript los deja pisarse EN SILENCIO — peor
//      que el SyntaxError, porque una de las dos implementaciones desaparece y
//      nadie se entera.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { bloquesScript } = require('./escaner-interpolaciones')

// Declaraciones que están a profundidad CERO del bloque, salteando strings,
// templates, comentarios y regex.
function declaracionesTopLevel(codigo) {
  const salida = []
  let d = 0, modo = null, claseRe = false, ultimo = ''
  const pilaT = []
  for (let i = 0; i < codigo.length; i++) {
    const c = codigo[i], n = codigo[i + 1]
    if (modo === 'lc') { if (c === '\n') modo = null; continue }
    if (modo === 'bc') { if (c === '*' && n === '/') { modo = null; i++ } continue }
    if (modo === "'" || modo === '"') { if (c === '\\') i++; else if (c === modo) modo = null; continue }
    if (modo === 're') {
      if (c === '\\') { i++; continue }
      if (c === '[') claseRe = true; else if (c === ']') claseRe = false
      else if (c === '/' && !claseRe) modo = null
      continue
    }
    if (modo === '`') {
      if (c === '\\') { i++; continue }
      if (c === '`') { modo = null; continue }
      if (c === '$' && n === '{') { pilaT.push(d); d++; i++; modo = null }
      continue
    }
    if (c === '/' && n === '/') { modo = 'lc'; continue }
    if (c === '/' && n === '*') { modo = 'bc'; i++; continue }
    if (c === "'" || c === '"') { modo = c; continue }
    if (c === '`') { modo = '`'; continue }
    if (c === '/' && '(,=:[!&|?{};+-*%<>~^'.includes(ultimo)) { modo = 're'; claseRe = false; continue }
    if ('([{'.includes(c)) { d++; ultimo = c; continue }
    if (')]}'.includes(c)) {
      d--
      if (c === '}' && pilaT.length && d === pilaT[pilaT.length - 1]) { pilaT.pop(); modo = '`' }
      ultimo = c
      continue
    }
    if (d === 0 && /[A-Za-z]/.test(c) && !/[\w$.]/.test(codigo[i - 1] || ' ')) {
      const m = /^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(codigo.slice(i, i + 120))
      if (m) {
        salida.push({ nombre: m[1], offset: i })
        // Saltar la declaración entera: si no, `async function X` matchea dos
        // veces —en el `async` y en el `function`— y X sale reportada como
        // duplicada de sí misma.
        i += m[0].length - 1
        continue
      }
    }
    if (!/\s/.test(c)) ultimo = c
  }
  return salida
}

// Sin argumentos revisa TODOS los HTML del repo, que es como se corre en el
// cierre de un commit: si hay que acordarse de enumerarlos, el que se agregue
// mañana no lo revisa nadie.
const RAIZ = path.join(__dirname, '..')
function htmlDelRepo() {
  const out = []
  for (const dir of [RAIZ, path.join(RAIZ, 'modulos')]) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.html')) out.push(path.join(dir, f))
    }
  }
  return out.sort()
}
const archivos = process.argv.length > 2 ? process.argv.slice(2) : htmlDelRepo()

let problemas = 0

for (const archivo of archivos) {
  const html = fs.readFileSync(archivo, 'utf8')
  const bloques = bloquesScript(html)
  const nombre = path.basename(archivo)

  bloques.forEach((b, i) => {
    const lineaInicio = html.slice(0, b.ini).split('\n').length
    const tmp = path.join(os.tmpdir(), `chk-${process.pid}-${i}.mjs`)
    fs.writeFileSync(tmp, b.codigo)
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' })
    } catch (err) {
      problemas++
      console.log(`✗ ${nombre}: el bloque <script> que empieza en la línea ${lineaInicio} NO PARSEA`)
      console.log(String(err.stderr).split('\n').slice(0, 6).map(l => '    ' + l).join('\n'))
    } finally {
      fs.existsSync(tmp) && fs.unlinkSync(tmp)
    }

    // Identificadores del top-level. Se decide por PROFUNDIDAD DE LLAVES y no
    // por sangría: la sangría es una convención de formato y esto tiene que
    // valer igual si alguien reformatea.
    const declarados = new Map()
    for (const { nombre: clave, offset } of declaracionesTopLevel(b.codigo)) {
      const donde = lineaInicio + b.codigo.slice(0, offset).split('\n').length - 1
      if (declarados.has(clave)) {
        problemas++
        console.log(`✗ ${nombre}: «${clave}» se declara DOS veces en el top-level, líneas ${declarados.get(clave)} y ${donde}`)
      } else declarados.set(clave, donde)
    }
    console.log(`  ${nombre}: bloque de la línea ${lineaInicio} — ${declarados.size} identificadores top-level`)
  })
}

// ── Los módulos JS del repo (js/*.js), sin argumentos ────────────────────
// Desde el 22/09/2026 dos módulos importan js/cobranzas-comun.js: un archivo
// JS que no parsea deja muertas las DOS pantallas. Se parsean igual que un
// bloque <script>, y se buscan los mismos duplicados.
const jsDelRepo = process.argv.length > 2 ? [] :
  fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).map(f => path.join(RAIZ, 'js', f)).sort()
for (const archivo of jsDelRepo) {
  const codigo = fs.readFileSync(archivo, 'utf8')
  const nombre = 'js/' + path.basename(archivo)
  const tmp = path.join(os.tmpdir(), `chk-${process.pid}-js.mjs`)
  fs.writeFileSync(tmp, codigo)
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' })
  } catch (err) {
    problemas++
    console.log(`✗ ${nombre}: NO PARSEA`)
    console.log(String(err.stderr).split('\n').slice(0, 6).map(l => '    ' + l).join('\n'))
  } finally {
    fs.existsSync(tmp) && fs.unlinkSync(tmp)
  }
  const vistos = new Map()
  for (const { nombre: clave, offset } of declaracionesTopLevel(codigo)) {
    const donde = codigo.slice(0, offset).split('\n').length
    if (vistos.has(clave)) { problemas++; console.log(`✗ ${nombre}: «${clave}» se declara DOS veces, líneas ${vistos.get(clave)} y ${donde}`) }
    else vistos.set(clave, donde)
  }
  console.log(`  ${nombre}: ${vistos.size} identificadores top-level`)
}

// ── Cada nombre IMPORTADO existe como export del archivo local ───────────
// node --check no resuelve los imports; el navegador sí, y un
// `import { x } from './a.js'` con x que a.js no exporta es un SyntaxError al
// enlazar: la pantalla entera no carga. Se revisan los imports con ruta
// relativa (los del repo) de cada HTML y cada js/*.js.
function exportsDe(ruta) {
  const codigo = fs.readFileSync(ruta, 'utf8')
  const out = new Set()
  for (const m of codigo.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1])
  for (const m of codigo.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const parte of m[1].split(',')) {
      const n = parte.trim().split(/\s+as\s+/).pop().trim()
      if (n) out.add(n)
    }
  }
  return out
}
let importsRevisados = 0
function revisarImports(codigo, desde, nombre) {
  for (const m of codigo.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const destino = path.resolve(path.dirname(desde), m[2])
    if (!fs.existsSync(destino)) { problemas++; console.log(`✗ ${nombre}: importa de ${m[2]}, que NO EXISTE`); continue }
    const exp = exportsDe(destino)
    for (const parte of m[1].split(',')) {
      const n = parte.trim().split(/\s+as\s+/)[0].trim()
      if (!n) continue
      importsRevisados++
      if (!exp.has(n)) { problemas++; console.log(`✗ ${nombre}: importa «${n}» de ${m[2]}, que NO lo exporta`) }
    }
  }
}
for (const archivo of archivos) {
  const html = fs.readFileSync(archivo, 'utf8')
  for (const b of bloquesScript(html)) revisarImports(b.codigo, archivo, path.basename(archivo))
}
for (const archivo of jsDelRepo) revisarImports(fs.readFileSync(archivo, 'utf8'), archivo, 'js/' + path.basename(archivo))
console.log(`  imports revisados: ${importsRevisados}`)

console.log(problemas ? `\n${problemas} PROBLEMA(S)` : '\nOK: todos los bloques parsean, no hay identificadores pisados y cada nombre importado existe')
process.exit(problemas ? 1 : 0)
