// CÓMO SE DICE UNA CANTIDAD DE UN INSUMO — octava excepción consciente a la
// regla de duplicar (02/10/2026).
//
// En Stock cada insumo se muestra según insumos.vista_preferida: en BULTOS
// ("250 bultos") cuando Facu lo eligió así y se conoce el contenido de UN
// bulto, y si no en su unidad ("6.250 kg"). Esa regla vivía solo en
// modulos/stock.html, y la planta (produccion.html) mostraba kilos donde Facu
// había elegido bultos. Ahora vive UNA vez acá y la usan Stock, la planta y la
// sala de masa: copiada serían tres reglas que divergen en silencio.
//
// Módulo ES, puro (sin DOM ni red). Lo prueban test-cantidades.js y las suites
// de cada pantalla (extraerFn lo encuentra por el import).

import { formatearNumeroAr } from './utils.js'

// Cuántos decimales tiene una cantidad del stock: kilos y litros, 3 (0,300 kg
// de lecitina); las unidades enteras las recorta cada pantalla.
export const DECIMALES_CANTIDAD = 3

// Cantidades del stock: separador de miles argentino y la unidad del catálogo,
// hasta 3 decimales y sin arrastrar ceros. Un dato AUSENTE (null, undefined, ''
// o NaN) dice "—", sin unidad: nunca "0 kg", que sería una afirmación. Un cero
// de verdad (el número 0) sí dice "0 kg".
export function formatearCantidadStock(n, unidad) {
  const num = formatearNumeroAr(n, { decimales: DECIMALES_CANTIDAD, minimos: 0 })
  if (num === '—') return '—'
  return `${num} ${unidad || ''}`.trim()
}

// Facu se maneja con cuartos y tercios. El resto se redondea al más cercano
// de estos siete cortes, así que el error máximo es un OCTAVO de bulto — y por
// eso los kilos exactos van siempre al lado, en gris, donde hay lugar.
export const FRACCIONES = [
  { valor: 0,     texto: '' },
  { valor: 1 / 4, texto: '¼' },
  { valor: 1 / 3, texto: '⅓' },
  { valor: 1 / 2, texto: '½' },
  { valor: 2 / 3, texto: '⅔' },
  { valor: 3 / 4, texto: '¾' },
  { valor: 1,     texto: '' },   // redondear a 1 SUBE el entero
]

// EL EQUIVALENTE SALE DE DIVIDIR LOS KILOS, NO DE CONTAR BULTOS.
// Puede haber 250 bolsas en el depósito con 2 medio usadas y el sistema decir
// "248 + ¾". Para "cuánto tengo" es correcto; para "cuántos bultos cerrados
// hay" NO, y eso solo lo responde un recuento físico. Ninguna pantalla lo
// presenta como un conteo.
export function equivalenteEnBultos(kilos, contenido) {
  const c = Number(contenido)
  if (!Number.isFinite(c) || c <= 0) return null
  // Number(null) y Number('') son 0, que es finito: sin este guard, "no hay
  // dato" se convertiría en "0 bultos", que es una afirmación.
  if (kilos === null || kilos === undefined || kilos === '') return null
  const n = Number(kilos)
  if (!Number.isFinite(n)) return null

  // El saldo puede ser negativo: se trabaja sobre la magnitud y el signo se
  // reaplica al final, para no redondear hacia el lado equivocado.
  const signo = n < 0 ? -1 : 1
  const bultos = Math.abs(n) / c
  let enteros = Math.floor(bultos)
  const resto = bultos - enteros

  let mejor = FRACCIONES[0]
  for (const f of FRACCIONES) {
    if (Math.abs(resto - f.valor) < Math.abs(resto - mejor.valor)) mejor = f
  }
  if (mejor.valor === 1) { enteros += 1; mejor = FRACCIONES[0] }

  return { signo, enteros, fraccion: mejor.texto }
}

// Solo el CONTEO: "100 bultos", "3 bultos + ½". Sin la cola "de 25 kg". La
// palabra "bultos" SÍ va con el número: sin ella no se entiende de qué son
// 100. Cómo se dice "100 bultos" —el signo, el singular, la fracción— se
// decide en UN solo lugar.
export function cabezaBultos(kilos, contenido) {
  const e = equivalenteEnBultos(kilos, contenido)
  if (!e) return null
  const menos = e.signo < 0 ? '−' : ''
  const palabra = (e.enteros === 1 && !e.fraccion) ? 'bulto' : 'bultos'
  const frac = e.fraccion ? ` + ${e.fraccion}` : ''
  return `${menos}${formatearNumeroAr(e.enteros, { decimales: 0 })} ${palabra}${frac}`
}

export function textoBultos(kilos, contenido, unidad) {
  const cabeza = cabezaBultos(kilos, contenido)
  if (!cabeza) return null
  return `${cabeza} de ${formatearCantidadStock(contenido, unidad)}`
}

// LA REGLA DE LA VISTA PREFERIDA, en UN lugar.
//
//   cantidad  — el total en la unidad del catálogo
//   unidad    — kg / lt / un
//   vista     — insumos.vista_preferida: 'bulto' o 'base'
//   contenido — lo que trae UN bulto, SOLO si hay una sola presentación
//               (si hay varias, o ninguna, null: no existe "un" bulto que
//               represente al total)
//   sueltos   — lo que entró SIN presentación (kilos_sueltos): NO se divide
//               (no se sabe en qué venía) y va con la cola, nunca con el número
//
// Devuelve:
//   kilos      — el total en su unidad ("6.350 kg")
//   cabeza     — "250 bultos" o null si no hay con qué armarlos
//   cola       — "de 25 kg" (+ " + 100 kg" sueltos) o null
//   conSueltos — cabeza y cola de corrido, o null
//   enBultos   — si se muestra en bultos (vista 'bulto' Y hay cabeza)
//   destacado  — EL número: la cabeza en bultos, o los kilos
//   secundario — lo que no quedó destacado, para la línea gris (o null)
//
// LA CAÍDA AUTOMÁTICA ES EL CASO MAYORITARIO, NO EL BORDE: un insumo marcado
// 'bulto' sin presentación conocida se muestra en su unidad sin romperse. La
// preferencia dice "cuando PUEDA, mostrame bultos", no "mostrame bultos o
// fallá". Y no hace falta un `if` para eso: cabezaBultos() ya devuelve null
// cuando el contenido no sirve.
export function cantidadSegunVista({ cantidad, unidad, vista, contenido = null, sueltos = 0 } = {}) {
  const kilos = formatearCantidadStock(cantidad, unidad)
  const s = Number(sueltos) || 0
  const cabeza = (cantidad === null || cantidad === undefined || cantidad === '')
    ? null
    : cabezaBultos(Number(cantidad) - s, contenido)
  const cola = cabeza
    ? `de ${formatearCantidadStock(contenido, unidad)}` + (s !== 0 ? ` + ${formatearCantidadStock(s, unidad)}` : '')
    : null
  const conSueltos = cabeza ? `${cabeza} ${cola}` : null
  const enBultos = vista === 'bulto' && !!cabeza
  return {
    kilos, cabeza, cola, conSueltos, enBultos,
    destacado: enBultos ? cabeza : kilos,
    secundario: enBultos ? `${cola} · ${kilos}` : conSueltos,
  }
}

// La versión corta, para una pantalla donde la cantidad va en una línea (la
// tablet): EXACTAMENTE lo que Stock pone a la derecha de la tarjeta. Con
// `conKilos`, en bultos agrega el total en su unidad entre paréntesis
// ("2 bultos (50 kg)"), para cuando al lado hay otra cantidad en kilos.
export function textoSegunVista(args, { conKilos = false } = {}) {
  const r = cantidadSegunVista(args)
  return conKilos && r.enBultos ? `${r.destacado} (${r.kilos})` : r.destacado
}

// ═══════════════════════════════════════════════════════════════════════
// CÓMO SE PIDE UNA CANTIDAD (05/10/2026) — la otra mitad de la regla.
//
// Lo de arriba MUESTRA una cantidad según insumos.vista_preferida. Esto es
// para los campos donde se ESCRIBE una: enviar y recibir entre fábricas,
// corregir y dar de baja stock. El caso que lo motivó: Facu quiso mandar 1
// bolsa de azúcar de Nuss a Mengui, el campo decía "Cantidad a enviar" sin
// unidad, se tomó como 1 kg y hubo que anularlo.
//
// LA REGLA (pedido de Facu):
//  1. 'bulto' y el lote tiene UN contenido por bulto → el campo pide bultos
//     ("bultos de 50 kg") y debajo, en chico, "= 50 kg". Si no, pide en su
//     unidad y la muestra siempre ("kg", "L", "u"). NUNCA un campo sin unidad.
//  2. A la base va SIEMPRE la unidad base, convertida con el contenido del
//     lote elegido. Las funciones de la base no cambian.
//  3. Un lote con dos presentaciones distintas, o con una parte suelta, se
//     pide en la unidad base, con un aviso de por qué.
//
// "Bultos" y no "bolsas": si era bolsa, tacho o bidón no está guardado en
// ningún lado (lo mismo que dice la tarjeta de Stock).
// ═══════════════════════════════════════════════════════════════════════

// Cuántos decimales lleva un campo que pide BULTOS: medio bulto (0,5) es un
// caso real, también en un insumo que se cuenta por unidades enteras.
export const DECIMALES_BULTOS_CARGA = 3

// La unidad del catálogo como se la ve al lado de un campo: "kg", "L", "u".
// Una unidad que no se reconoce se muestra tal cual (nunca vacía si había
// algo); sin unidad, "unidades".
export function unidadCorta(unidad) {
  const crudo = String(unidad ?? '').trim()
  const u = crudo.toLowerCase().replace(/\.$/, '')
  if (!u) return 'unidades'
  if (['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(u)) return 'kg'
  if (['lt', 'l', 'lts', 'litro', 'litros'].includes(u)) return 'L'
  if (['un', 'u', 'uni', 'unid', 'unidad', 'unidades'].includes(u)) return 'u'
  return crudo
}

// Cómo se pide la cantidad de lo que se va a mover.
//
//   unidad          — la del catálogo (kg / lt / un)
//   vista           — insumos.vista_preferida: 'bulto' o 'base'
//   contenidos      — los contenidos por bulto CONOCIDOS del lote (y el de la
//                     presentación elegida, si es otra)
//   haySueltos      — si el lote (o lo que se mueve) tiene una parte que entró
//                     sin presentación
//   decimalesBase   — los decimales de la unidad en ESA pantalla (0 en las que
//                     se cuentan de a enteros); cada pantalla ya los sabe
//
// Devuelve { enBultos, contenido, unidad, rotulo, aviso, decimales,
// decimalesBase }: `rotulo` va AL LADO del campo ("bultos de 50 kg" o "kg"),
// `aviso` explica por qué un insumo en bultos se pide en su unidad (o null).
export function modoDeCarga({ unidad, vista, contenidos = [], haySueltos = false, decimalesBase = DECIMALES_CANTIDAD } = {}) {
  const u = unidadCorta(unidad)
  const conocidos = [...new Set((contenidos ?? [])
    .filter(c => c !== null && c !== undefined && c !== '')
    .map(Number)
    .filter(c => Number.isFinite(c) && c > 0))].sort((a, b) => a - b)
  const enBase = { enBultos: false, contenido: null, unidad: u, rotulo: u, aviso: null, decimales: decimalesBase, decimalesBase }
  if (vista !== 'bulto') return enBase

  if (conocidos.length === 1 && !haySueltos) {
    return {
      enBultos: true, contenido: conocidos[0], unidad: u,
      rotulo: `bultos de ${formatearCantidadStock(conocidos[0], u)}`,
      aviso: null, decimales: DECIMALES_BULTOS_CARGA, decimalesBase,
    }
  }
  // Sin ningún contenido conocido no hay bulto que ofrecer: es el caso común
  // (lo que entró por el recuento inicial) y no necesita explicación.
  if (!conocidos.length) return enBase
  if (conocidos.length > 1) {
    const lista = conocidos.map(c => formatearCantidadStock(c, u))
    const de = lista.length === 2 ? `${lista[0]} y de ${lista[1]}` : lista.join(', ')
    return { ...enBase, aviso: `Este lote tiene bultos de ${de}: como no son todos iguales, la cantidad se pide en ${u}.` }
  }
  return { ...enBase, aviso: `Parte de este lote entró suelta, sin presentación: la cantidad se pide en ${u}.` }
}

// De lo ESCRITO en el campo a la unidad base, que es lo que va a la base.
// `escrito` es el número ya leído del campo (leerCampoNumero / leerNumeroAr).
// Devuelve { base, error }:
//   base  — la cantidad en kg / L / u, o null si no hay o no sirve
//   error — null, o el texto para la persona (p. ej. 2,5 bultos de 3 u dan
//           7,5 u, que no se pueden contar)
// Vacío NO es cero: { base: null, error: null }.
export function aUnidadBase(escrito, modo) {
  if (escrito === null || escrito === undefined || escrito === '') return { base: null, error: null }
  const n = Number(escrito)
  if (!Number.isFinite(n)) return { base: null, error: 'No se entiende ese número.' }
  if (!modo?.enBultos) return { base: n, error: null }
  const c = Number(modo.contenido)
  if (!Number.isFinite(c) || c <= 0) return { base: null, error: 'No se sabe cuánto trae cada bulto.' }
  const base = Math.round(n * c * 1e6) / 1e6
  if (modo.decimalesBase === 0 && !Number.isInteger(base)) {
    return {
      base: null,
      error: `${formatearNumeroAr(n, { decimales: DECIMALES_BULTOS_CARGA, minimos: 0 })} ${modo.rotulo} dan ${formatearCantidadStock(base, modo.unidad)}, y se cuenta por unidades enteras.`,
    }
  }
  return { base, error: null }
}

// Lo que va debajo del campo, en chico: "= 50 kg". Solo cuando se pide en
// bultos y lo escrito se puede convertir; si no, null (no se dibuja nada).
export function equivalenteDeCarga(escrito, modo) {
  if (!modo?.enBultos) return null
  const { base } = aUnidadBase(escrito, modo)
  return base === null ? null : `= ${formatearCantidadStock(base, modo.unidad)}`
}

// Lo que ya está en unidad base, expresado en el campo (para volver a
// escribir un renglón que se edita). En bultos, null si no da un número que
// el campo pueda mostrar sin redondear.
export function desdeUnidadBase(base, modo) {
  if (base === null || base === undefined || base === '') return null
  const n = Number(base)
  if (!Number.isFinite(n)) return null
  if (!modo?.enBultos) return n
  const b = Math.round((n / Number(modo.contenido)) * 1e6) / 1e6
  return Math.abs(Math.round(b * 1000) / 1000 - b) < 1e-9 ? b : null
}
