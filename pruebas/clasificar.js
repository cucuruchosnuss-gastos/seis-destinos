// Clasificador de expresiones: dice si lo que se INTERPOLA en un HTML está
// escapado, o si es seguro y POR QUÉ.
//
// No alcanza con mirar si la expresión entera arranca con escCob(: un ternario
// escapa en sus ramas y no afuera. Se buscan las POSICIONES DE VALOR —lo que
// termina en la página— y se clasifica cada una:
//   a ? X : Y   → X e Y (la condición no sale a la página)
//   a || b      → los dos
//   a && b      → solo b (si a fuera el resultado, es falsy y no imprime nada)
//   a + b       → los dos

function partirTopLevel(expr, op) {
  const partes = []
  let d = 0, ini = 0, modo = null, claseRe = false, ultimo = ''
  const pilaT = []
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i], n = expr[i + 1]
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
    if (d === 0 && expr.startsWith(op, i)) {
      // Un '?' de encadenamiento opcional (?.) o de ?? no es un ternario.
      if (op === '?' && (n === '.' || n === '?')) { ultimo = c; continue }
      if (op === ':' && expr[i - 1] === '?') { ultimo = c; continue }
      if (op === '+' && (n === '+' || ultimo === '+')) { ultimo = c; continue }
      partes.push(expr.slice(ini, i))
      ini = i + op.length
      i += op.length - 1
      ultimo = op[op.length - 1]
      continue
    }
    if (!/\s/.test(c)) ultimo = c
  }
  partes.push(expr.slice(ini))
  return partes
}

// Saca los comentarios de línea de una expresión (los hay: una interpolación
// del archivo lleva un comentario adentro).
function sinComentarios(e) {
  return e.split('\n').map(l => {
    let modo = null
    for (let i = 0; i < l.length; i++) {
      const c = l[i], n = l[i + 1]
      if (modo) { if (c === '\\') i++; else if (c === modo) modo = null; continue }
      if (c === "'" || c === '"' || c === '`') { modo = c; continue }
      if (c === '/' && n === '/') return l.slice(0, i)
    }
    return l
  }).join('\n')
}

function posicionesDeValor(expr) {
  const e = sinComentarios(expr).trim()
  if (!e) return []
  // Paréntesis que envuelven todo.
  if (e.startsWith('(') && partirTopLevel(e, ',').length === 1) {
    const interior = e.slice(1, -1)
    try { new Function(`return (${interior})`); return posicionesDeValor(interior) } catch { /* no envolvía */ }
  }
  for (const op of ['?', '||', '??', '&&', '+']) {
    const partes = partirTopLevel(e, op)
    if (partes.length > 1) {
      if (op === '?') {
        const ramas = partirTopLevel(partes.slice(1).join('?'), ':')
        return ramas.flatMap(posicionesDeValor)
      }
      if (op === '&&') return posicionesDeValor(partes[partes.length - 1])
      return partes.flatMap(posicionesDeValor)
    }
  }
  return [e]
}

// Hojas seguras por REGLA (no por lista).
function porRegla(hoja) {
  const h = hoja.trim()
  if (/^`/.test(h) && /`$/.test(h)) return 'plantilla anidada: sus propias interpolaciones se verifican aparte'
  if (/^'.*'$/s.test(h) || /^".*"$/s.test(h)) return 'literal del código'
  if (/^-?\d+(\.\d+)?$/.test(h)) return 'número literal'
  if (/^escCob\(/.test(h) && cierraAlFinal(h, 'escCob(')) return 'escapada'
  if (/^encodeURIComponent\(/.test(h) && cierraAlFinal(h, 'encodeURIComponent(')) return 'escapada para URL'
  if (/\.map\(escCob\)\.join\(/.test(h)) return 'escapada elemento por elemento'
  return null
}

function cierraAlFinal(h, prefijo) {
  let d = 0
  for (let i = prefijo.length - 1; i < h.length; i++) {
    if (h[i] === '(') d++
    else if (h[i] === ')') { d--; if (d === 0) return i === h.length - 1 }
  }
  return false
}

// Hojas seguras CON SU MOTIVO. Cada una verificada leyendo el código; una hoja
// que no esté acá ni pase por regla pone la prueba en rojo NOMBRÁNDOLA.
const SEGURAS = [
  // números calculados en el código
  ['i', 'número: índice del .map()'],
  ['indiceFoto', 'número: findIndex() + 1'],
  ['titulares.length', 'número: largo del array'],
  ['ch.titulares.length', 'número: largo del array'],
  // HTML ya armado y escapado más arriba en la misma función
  ['aviso', 'HTML ya escapado: se arma arriba con escCob(benef)'],
  ['avisos', 'HTML ya escapado: se arma arriba con escCob(foto.error)'],
  ['avisoMoneda', 'HTML constante del código'],
  ['avisoCmc7', 'HTML constante del código'],
  ['avisoCmc7Distinta', 'HTML constante del código'],
  ['avisoFechas', 'HTML constante del código'],
  ['avisoCuit', 'HTML constante del código'],
  ['avisoLetras', 'HTML ya escapado: se arma arriba con escCob(formatearImporte(...))'],
  ['avisoNotas', 'HTML ya escapado: se arma arriba con escCob(ch.ocr_propuesto.notas)'],
  ['avisoDuplicado', 'HTML ya escapado: se arma arriba con escCob(ch.duplicado.texto)'],
  // HTML constante del código, elegido por una función pura
  ['pieRenglon(e1)', 'HTML constante del código según el estado del renglón'],
  ['pieRenglon(e2)', 'HTML constante del código según el estado del renglón'],
  ['pieRenglon(e3)', 'HTML constante del código según el estado del renglón'],
  ['claseRenglon(e1)', 'clase CSS constante del código'],
  ['claseRenglon(e2)', 'clase CSS constante del código'],
  ['claseRenglon(e3)', 'clase CSS constante del código'],
  ['botones.join(\'\')', 'HTML constante del código: los botones se arman con literales'],
  // HTML armado por funciones que escapan adentro
  ['htmlHistorial(d.historial, d.nombres)', 'HTML armado por htmlHistorial(), que escapa adentro'],
]

const SEGURAS_REGEX = [
  [/^d\.cheques\.map\(ch => htmlChequeDetalle\(ch\)\)\.join\(''\)$/s, 'HTML armado por htmlChequeDetalle(), que escapa adentro'],
  [/^datos\.map\(\[?\(?\[k, v\]\)? =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^d\.fotos\.map\(\(f, i\) =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^f\.fotos\.map\(\(foto, i\) =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^pendientes\.map\(f =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^titulares\.map\(t =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^ch\.titulares\.map\(\(t, i\) =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^filas\.map\(htmlFilaCobranza\)\.join\(''\)$/s, 'HTML armado por htmlFilaCobranza(), que escapa adentro'],
  [/^f\.cheques\.map\(ch => htmlTarjetaCheque\(ch, f\)\)\.join\(''\)$/s, 'HTML armado por htmlTarjetaCheque(), que escapa adentro'],
  [/^ESTADOS_COBRANZA\.map\(e =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^estado\.repartidores\.map\(r =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^htmlDetalle\(d\)$/s, 'HTML armado por htmlDetalle(), que escapa adentro'],
]

function motivoSeguro(hoja) {
  const h = sinComentarios(hoja).trim().replace(/\s+/g, ' ')
  for (const [texto, motivo] of SEGURAS) if (h === texto.replace(/\s+/g, ' ')) return motivo
  for (const [re, motivo] of SEGURAS_REGEX) if (re.test(h)) return motivo
  return null
}

// Devuelve { ok, motivos:[...], hojasMalas:[...] }
function clasificar(expr) {
  const hojas = posicionesDeValor(expr)
  const motivos = [], malas = []
  for (const h of hojas) {
    const m = porRegla(h) || motivoSeguro(h)
    if (m) motivos.push(m); else malas.push(h.trim().replace(/\s+/g, ' '))
  }
  return { ok: malas.length === 0, motivos, hojasMalas: malas }
}

module.exports = { clasificar, posicionesDeValor, partirTopLevel }
