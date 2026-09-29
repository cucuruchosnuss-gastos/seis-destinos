// LAS PREFERENCIAS DE CADA PERSONA (29/09/2026, handoff "Esqueleto"): cómo se
// ordena la barra lateral (a mano / alfabético / los que más uso), qué
// módulos van fijados arriba, el tablero (orden, tamaño y cuáles se ven) y
// cuántas veces se abrió cada módulo en los últimos 30 días.
//
// El diseño pide guardarlas EN EL SERVIDOR (así se ve igual en la compu y el
// celular), pero la base no tiene dónde (verificado el 29/09/2026: ninguna
// tabla ni columna de preferencias, y Supabase estaba en solo lectura). Hasta
// que exista, se guardan en ESTE dispositivo, una clave por persona
// (sd.prefs.<empleado_id>). Lo que falta en la base está en el traspaso
// (2026-09-29-sistema-visual.md): una tabla preferencias_usuario y dos RPCs.
//
// Módulo ES, puro salvo leer/guardar (que nunca tiran: sin localStorage, las
// preferencias vuelven a las de fábrica).

export const ORDENES_BARRA = ['mano', 'alfa', 'uso']
export const TAMANOS = ['chica', 'mediana', 'ancha']
const DIAS_USO = 30
const MS_DIA = 24 * 60 * 60 * 1000

export function clavePrefs(empleadoId) {
  return `sd.prefs.${empleadoId}`
}

export function prefsVacias() {
  return { barra: { orden: 'mano', manual: [], fijados: [] }, tablero: { orden: [], tamanos: {}, ocultas: [] }, uso: {} }
}

// Una preferencia leída de afuera se limpia: solo se quedan las formas
// conocidas (un valor raro vuelve al de fábrica, nunca rompe).
export function normalizarPrefs(p) {
  const v = prefsVacias()
  if (!p || typeof p !== 'object') return v
  const lista = x => Array.isArray(x) ? x.filter(c => typeof c === 'string' && c) : []
  const b = p.barra ?? {}
  v.barra.orden = ORDENES_BARRA.includes(b.orden) ? b.orden : 'mano'
  v.barra.manual = [...new Set(lista(b.manual))]
  v.barra.fijados = [...new Set(lista(b.fijados))]
  const t = p.tablero ?? {}
  v.tablero.orden = [...new Set(lista(t.orden))]
  v.tablero.ocultas = [...new Set(lista(t.ocultas))]
  for (const [k, tam] of Object.entries(t.tamanos ?? {})) if (TAMANOS.includes(tam)) v.tablero.tamanos[k] = tam
  for (const [k, veces] of Object.entries(p.uso ?? {})) {
    const ok = Array.isArray(veces) ? veces.filter(n => Number.isFinite(n)) : []
    if (ok.length) v.uso[k] = ok
  }
  return v
}

export function leerPrefs(empleadoId, ls = globalThis.localStorage) {
  try {
    const crudo = ls?.getItem(clavePrefs(empleadoId))
    return normalizarPrefs(crudo ? JSON.parse(crudo) : null)
  } catch { return prefsVacias() }
}

export function guardarPrefs(empleadoId, prefs, ls = globalThis.localStorage) {
  try { ls?.setItem(clavePrefs(empleadoId), JSON.stringify(normalizarPrefs(prefs))); return true } catch { return false }
}

// Una apertura del módulo `clave` ahora. Se guardan solo las de los últimos
// 30 días (el conteo de "los que más uso").
export function anotarUso(prefs, clave, ahora = Date.now()) {
  const p = normalizarPrefs(prefs)
  const desde = ahora - DIAS_USO * MS_DIA
  for (const k of Object.keys(p.uso)) p.uso[k] = p.uso[k].filter(t => t >= desde)
  p.uso[clave] = [...(p.uso[clave] ?? []), ahora].slice(-200)
  return p
}

export function vecesUsado(prefs, clave, ahora = Date.now()) {
  const desde = ahora - DIAS_USO * MS_DIA
  return (prefs?.uso?.[clave] ?? []).filter(t => t >= desde).length
}

// El orden de la barra: los FIJADOS siempre arriba (en el orden en que se
// fijaron) y el resto según el orden elegido. `modulos` son los que la persona
// puede abrir, en el orden del catálogo. Devuelve { fijados, resto }.
export function ordenarBarra(modulos, prefs, ahora = Date.now()) {
  const p = normalizarPrefs(prefs)
  const porClave = new Map(modulos.map(m => [m.clave, m]))
  const fijados = p.barra.fijados.filter(c => porClave.has(c)).map(c => porClave.get(c))
  const enFijados = new Set(fijados.map(m => m.clave))
  let resto = modulos.filter(m => !enFijados.has(m.clave))
  if (p.barra.orden === 'alfa') {
    resto = [...resto].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  } else if (p.barra.orden === 'uso') {
    const pos = new Map(modulos.map((m, i) => [m.clave, i]))
    resto = [...resto].sort((a, b) => vecesUsado(p, b.clave, ahora) - vecesUsado(p, a.clave, ahora) || pos.get(a.clave) - pos.get(b.clave))
  } else if (p.barra.manual.length) {
    const pos = new Map(p.barra.manual.map((c, i) => [c, i]))
    const idx = new Map(modulos.map((m, i) => [m.clave, i]))
    resto = [...resto].sort((a, b) => (pos.get(a.clave) ?? 1000 + idx.get(a.clave)) - (pos.get(b.clave) ?? 1000 + idx.get(b.clave)))
  }
  return { fijados, resto }
}

// Los 3 módulos de la barra de abajo del celular: los fijados; si no hay 3,
// se completa con los que más se usan; si no, con el orden de la barra.
export function modulosDeAbajo(modulos, prefs, ahora = Date.now()) {
  const { fijados, resto } = ordenarBarra(modulos, prefs, ahora)
  const elegidos = [...fijados]
  const porUso = [...resto].filter(m => vecesUsado(prefs, m.clave, ahora) > 0)
    .sort((a, b) => vecesUsado(prefs, b.clave, ahora) - vecesUsado(prefs, a.clave, ahora))
  for (const m of [...porUso, ...resto]) {
    if (elegidos.length >= 3) break
    if (!elegidos.some(x => x.clave === m.clave)) elegidos.push(m)
  }
  return elegidos.slice(0, 3)
}
