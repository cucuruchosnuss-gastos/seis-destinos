// Cuando una mutación no encuentra su texto (el ancla "NO EXISTE"), decir
// DÓNDE está lo más parecido del archivo, así el arreglo es mirar una línea y
// no buscar a ciegas (08/10/2026). Y cuando no es única, en qué líneas está.
//
// La regla: de un texto de varias líneas se busca la PRIMERA línea que ya no
// está en el archivo (ahí es donde el código cambió) y se muestra la línea del
// archivo más parecida a esa, con su número y cuánto se parece (bigramas de
// letras, coeficiente de Dice). Las líneas se comparan sin la sangría.
'use strict'

function bigramas(s) {
  const m = new Map()
  for (let i = 0; i < s.length - 1; i++) {
    const b = s.slice(i, i + 2)
    m.set(b, (m.get(b) || 0) + 1)
  }
  return m
}

// 0 a 1: cuánto se parecen dos textos (1 = iguales).
function parecido(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const A = bigramas(a), B = bigramas(b)
  let comun = 0
  for (const [k, n] of A) comun += Math.min(n, B.get(k) || 0)
  return (2 * comun) / (a.length - 1 + b.length - 1)
}

// La línea del archivo más parecida a `linea`: { numero (1 en adelante), texto, parecido }.
function lineaMasParecida(texto, linea) {
  const buscada = linea.trim()
  let mejor = null
  const lineas = texto.split('\n')
  for (let i = 0; i < lineas.length; i++) {
    const t = lineas[i].trim()
    if (!t) continue
    // Un atajo: si el largo es muy distinto, no puede parecerse mucho.
    if (Math.min(t.length, buscada.length) / Math.max(t.length, buscada.length) < 0.3) continue
    const p = parecido(t, buscada)
    if (!mejor || p > mejor.parecido) mejor = { numero: i + 1, texto: t, parecido: p }
  }
  return mejor
}

// La primera línea del ancla que ya no está en el archivo (sin sangría). Si
// todas están sueltas (el ancla se partió distinto), la más larga.
function parteQueFalta(texto, aguja) {
  const lineasArchivo = new Set(texto.split('\n').map(l => l.trim()))
  const partes = aguja.split('\n').map(l => l.trim()).filter(Boolean)
  // Una sola línea: la línea del archivo puede tener más cosas alrededor.
  if (partes.length === 1) return partes[0]
  const falta = partes.find(p => !lineasArchivo.has(p) && !texto.includes(p))
  return falta ?? partes.reduce((a, b) => (b.length > a.length ? b : a), '')
}

// Las líneas (1 en adelante) donde empieza cada aparición de `aguja`.
function lineasDondeEsta(texto, aguja, tope = 6) {
  const out = []
  let d = 0, k
  while ((k = texto.indexOf(aguja, d)) !== -1 && out.length < tope) {
    out.push(texto.slice(0, k).split('\n').length)
    d = k + 1
  }
  return out
}

const corto = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// El texto de ayuda, listo para imprimir debajo del aviso (renglones con sangría).
// `desplazamiento`: cuántas líneas hay antes de `texto` en el archivo real (una región).
function pistaDeAncla(texto, aguja, desplazamiento = 0) {
  if (!aguja) return ''
  if (texto.includes(aguja)) {
    const ls = lineasDondeEsta(texto, aguja).map(n => n + desplazamiento)
    return `      está en las líneas ${ls.join(', ')}${ls.length >= 6 ? ' y más' : ''}: agregale contexto para que sea única`
  }
  const falta = parteQueFalta(texto, aguja)
  const m = lineaMasParecida(texto, falta)
  const out = [`      lo que no está: «${corto(falta)}»`]
  if (m && m.parecido >= 0.35) out.push(`      lo más parecido (línea ${m.numero + desplazamiento}, ${Math.round(m.parecido * 100)} %): «${corto(m.texto)}»`)
  else out.push('      no hay ninguna línea parecida: ese código se fue del archivo')
  return out.join('\n')
}

module.exports = { parecido, lineaMasParecida, parteQueFalta, lineasDondeEsta, pistaDeAncla }
