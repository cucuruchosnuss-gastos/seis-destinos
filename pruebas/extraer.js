// Extractor de funciones y constantes del <script> de un HTML del proyecto.
//
// Dos trampas ya documentadas y cerradas acá:
//  - Cerrar PRIMERO la lista de parámetros y recién después buscar la llave del
//    cuerpo: con `function f(a, { b } = {})` saltar al primer '{' devuelve la
//    llave del destructuring y trunca la función en silencio.
//  - Un `const` declarado dentro de un eval NO escapa al scope de afuera; una
//    `function` sí. Las constantes se convierten a `var` al extraerlas.

function cuerpoDesde(src, inicioLlave) {
  let d = 0, i = inicioLlave
  let modo = null // "'" | '"' | '`' | 'lc' | 'bc' | 're'
  let claseRe = false
  let ultimo = ''
  const pilaPlantilla = []
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1]
    if (modo === 'lc') { if (c === '\n') modo = null; continue }
    if (modo === 'bc') { if (c === '*' && n === '/') { modo = null; i++ } continue }
    if (modo === "'" || modo === '"') { if (c === '\\') i++; else if (c === modo) modo = null; continue }
    if (modo === 're') {
      if (c === '\\') { i++; continue }
      if (c === '[') claseRe = true
      else if (c === ']') claseRe = false
      else if (c === '/' && !claseRe) modo = null
      continue
    }
    if (modo === '`') {
      if (c === '\\') { i++; continue }
      if (c === '`') { modo = null; continue }
      if (c === '$' && n === '{') { pilaPlantilla.push(d); d++; i++; modo = null; continue }
      continue
    }
    if (c === '/' && n === '/') { modo = 'lc'; continue }
    if (c === '/' && n === '*') { modo = 'bc'; i++; continue }
    if (c === "'" || c === '"') { modo = c; continue }
    if (c === '`') { modo = '`'; continue }
    if (c === '/' && '(,=:[!&|?{};+-*%<>~^'.includes(ultimo)) { modo = 're'; claseRe = false; continue }
    if (c === '{' || c === '(' || c === '[') d++
    else if (c === '}' || c === ')' || c === ']') {
      d--
      if (c === '}' && pilaPlantilla.length && d === pilaPlantilla[pilaPlantilla.length - 1]) {
        pilaPlantilla.pop(); modo = '`'; continue
      }
      if (d === 0) return src.slice(inicioLlave, i + 1)
    }
    if (!/\s/.test(c)) ultimo = c
  }
  throw new Error('no se cerró el bloque que empieza en ' + inicioLlave)
}

function extraerFn(src, nombre) {
  const re = new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?function\\s+${nombre}\\s*\\(`, 'm')
  const m = re.exec(src)
  if (!m) throw new Error(`extraerFn: NO EXISTE la función ${nombre}`)
  // El `async` es parte de la declaración: arrancar en `function` lo perdería
  // y el cuerpo con `await` no parsearía.
  const inicio = m.index + m[0].search(/(?:async\s+)?function/)
  // 1) cerrar la lista de parámetros
  const abreParen = src.indexOf('(', src.indexOf(nombre, inicio) + nombre.length)
  const params = cuerpoDesde(src, abreParen)
  // 2) recién ahora, la llave del cuerpo
  const llave = src.indexOf('{', abreParen + params.length)
  if (llave === -1) throw new Error(`extraerFn: ${nombre} sin cuerpo`)
  const cuerpo = cuerpoDesde(src, llave)
  const texto = src.slice(inicio, llave) + cuerpo
  // El extractor valida su propia salida: si truncó, grita acá y no doscientas
  // líneas después con un error que no habla de esto.
  if (!texto.trimEnd().endsWith('}')) throw new Error(`extraerFn: ${nombre} quedó truncada`)
  if (texto.split('\n').length < 2) throw new Error(`extraerFn: ${nombre} quedó en una línea, sospechoso`)
  if (new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?function\\s+${nombre}\\s*\\(`, 'gm').exec(src) && src.match(new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?function\\s+${nombre}\\s*\\(`, 'gm')).length > 1) {
    throw new Error(`extraerFn: ${nombre} está declarada más de una vez`)
  }
  return texto
}

// Constante top-level. Se devuelve como `var` para que sobreviva al eval.
function extraerConst(src, nombre) {
  const re = new RegExp(`(?:^|\\n)\\s*const\\s+${nombre}\\s*=`, 'm')
  const m = re.exec(src)
  if (!m) throw new Error(`extraerConst: NO EXISTE la constante ${nombre}`)
  const igual = src.indexOf('=', m.index + m[0].indexOf(nombre))
  let i = igual + 1
  while (/\s/.test(src[i])) i++
  // Se agrandan líneas hasta que la expresión PARSEA. Así sirve igual para una
  // flecha de una línea que para un array multilínea, y el extractor valida su
  // propia salida en vez de devolver un pedazo que rompe doscientas líneas
  // después.
  let fin = i
  for (let intento = 0; intento < 200; intento++) {
    const salto = src.indexOf('\n', fin)
    fin = salto === -1 ? src.length : salto
    const texto = src.slice(i, fin)
    try {
      new Function(`return (${texto})`)
      return `var ${nombre} = ${texto}\n`
    } catch { /* todavía incompleta */ }
    if (salto === -1) break
    fin = salto + 1
  }
  throw new Error(`extraerConst: no se pudo cerrar la expresión de ${nombre}`)
}

module.exports = { extraerFn, extraerConst, cuerpoDesde }
