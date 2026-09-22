// Helpers que usan DOS módulos: Cobranzas (modulos/cobranzas.html) y Cheques
// (modulos/cheques.html). Viven acá, una sola vez, porque la cartera de
// cheques se mudó a su propio módulo (22/09/2026) y copiar estas funciones en
// los dos archivos sería tener dos versiones de la misma regla que pueden
// divergir sin que nadie lo note.
//
// La excepción a "cada módulo duplica sus helpers" (ver CLAUDE.md) es solo
// esta pareja de módulos, que comparte datos: los cheques son de una cobranza.
// El escape de HTML NO está acá: cada módulo tiene el suyo, como el resto.
//
// Las suites de pruebas leen este archivo con pruebas/fuente-cobranzas.js,
// que lo pega detrás del <script> del módulo y le saca los `export`.

import { formatearNumeroAr } from './utils.js'

// ── Dígito verificador BCRA ─────────────────────────────────────────────
// Dígito verificador del código de ruta — BCRA, ponderador 9713. MISMA
// fórmula que public.dv_bcra() en la base y que dvBcra() en la Edge
// Function ocr-cheques: si se cambia una, se cambian las tres.
// Casos de la norma: '0110381425' → 7, '0111381425' → 0.
// (Hasta el 22/09/2026 vivía dentro de modulos/cobranzas.html; ahora la usan
// Cobranzas y Cheques desde este archivo.)
export function dvBcra(digitos) {
  if (!/^[0-9]+$/.test(String(digitos ?? ''))) return null
  const pesos = [3, 1, 7, 9]
  let suma = 0
  const inv = String(digitos).split('').reverse()
  for (let i = 0; i < inv.length; i++) suma += Number(inv[i]) * pesos[i % 4]
  return (10 - (suma % 10)) % 10
}

// ── Importes ────────────────────────────────────────────────────────────
// El número canónico vive como valor JS; esto es SOLO para mostrar. Nunca
// se re-parsea un texto ya formateado.
// Un importe AUSENTE (null, undefined, '') dice "—" y nunca "$ 0,00":
// Number(null) es 0 y es finito, así que convertiría "no hay dato" en una
// cifra plausible en una pantalla de plata. El "$" va con un espacio que no
// se corta, así el importe no se parte en dos renglones.
export function formatearImporte(n) {
  const texto = formatearNumeroAr(n, { decimales: 2 })
  if (texto === '—') return '—'
  return texto.startsWith('-') ? '-$ ' + texto.slice(1) : '$ ' + texto
}

// ── Fechas ──────────────────────────────────────────────────────────────
// Toda la aritmética se hace sobre 'YYYY-MM-DD' interpretado en UTC. Con
// horas locales, un mismo día da resultados distintos según el huso.

export const ZONA_AR = 'America/Argentina/Buenos_Aires'

// El "hoy" que vale es el de Argentina, no el del reloj del celular: un
// teléfono en otro huso mostraría una fecha que el servidor rechaza.
export function hoyArgentina() {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_AR, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return f.format(new Date())
}

export function esFechaIso(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(v + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

export function diasEntre(desdeIso, hastaIso) {
  if (!esFechaIso(desdeIso) || !esFechaIso(hastaIso)) return null
  return Math.round((Date.parse(hastaIso + 'T00:00:00Z') - Date.parse(desdeIso + 'T00:00:00Z')) / 86400000)
}

// dd/mm/aaaa sin pasar por Date local, que con un 'YYYY-MM-DD' restaría el
// huso y mostraría el día anterior.
export function formatearFechaCob(iso) {
  if (!esFechaIso(iso)) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// ── Cheques ─────────────────────────────────────────────────────────────

export const ETIQUETA_ESTADO_CHEQUE = {
  en_cartera: 'En cartera', depositado: 'Depositado', endosado: 'Endosado', anulado: 'Anulado',
}

// El nombre del banco por su código. Un código que no está en el catálogo se
// DICE, con el número a la vista: inventarle un nombre o dejarlo vacío
// esconde que el dato puede estar mal. `bancos` es el Map código → nombre de
// cada módulo.
export function nombreBancoDe(bancos, codigo) {
  if (!codigo) return 'Banco sin identificar'
  const b = bancos?.get?.(String(codigo))
  return b ? b : `Banco ${codigo} (no está en el catálogo)`
}

// Cómo se lee la salida de un cheque, en una frase de texto plano. La usan
// el detalle de la cobranza, su historial y la cartera de cheques: una sola
// redacción. El destino lo tipea una persona: quien la muestre en HTML la
// escapa.
export function textoSalidaCheque(estadoCheque, fecha, destino) {
  const cuando = esFechaIso(fecha) ? ` el ${formatearFechaCob(fecha)}` : ''
  const d = String(destino ?? '').trim()
  if (estadoCheque === 'endosado') return `Endosado${cuando}${d ? ` a ${d}` : ''}`
  if (estadoCheque === 'depositado') return `Depositado${cuando}${d ? ` en ${d}` : ''}`
  return ETIQUETA_ESTADO_CHEQUE[estadoCheque] ?? String(estadoCheque ?? '')
}
