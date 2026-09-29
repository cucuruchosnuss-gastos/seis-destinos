// LAS PREFERENCIAS DE CADA PERSONA (29/09/2026, handoff "Esqueleto"): cómo se
// ordena la barra lateral (a mano / alfabético / los que más uso), qué
// módulos van fijados arriba, el tablero (orden, tamaño y cuáles se ven) y
// cuántas veces se abrió cada módulo en los últimos 30 días.
//
// Se guardan EN LA CUENTA (29/09/2026): la base las guarda en
// preferencias_usuario con mis_preferencias() y guardar_mis_preferencias(p_datos)
// (las dos SECURITY DEFINER, de quien llama), así se ven igual en la compu y
// en el celular. Este dispositivo guarda además una copia (sd.prefs.<empleado_id>):
// la pantalla arranca con ella sin esperar a la red, y si la base no contesta
// se sigue con la copia (y la pantalla lo dice).
//  - La PRIMERA vez (la cuenta todavía no tiene nada guardado: mis_preferencias
//    devuelve {}), lo que había en el dispositivo se sube a la cuenta.
//  - Lo que se guardó mientras se esperaba a la base no se pierde: al llegar
//    la respuesta, se sube eso.
//  - La barra lateral y el tablero comparten UNA sola lectura y el mismo
//    estado en memoria (este módulo es uno solo por página), así una no pisa
//    lo que guardó la otra.
//
// Módulo ES, puro salvo leer/guardar (que nunca tiran: sin localStorage ni
// base, las preferencias vuelven a las de fábrica).

export const ORDENES_BARRA = ['mano', 'alfa', 'uso']
export const TAMANOS = ['chica', 'mediana', 'ancha']
const DIAS_USO = 30
const MS_DIA = 24 * 60 * 60 * 1000
// Aperturas que se guardan por módulo (alcanza para "los que más uso" y deja
// el total muy por debajo del tope de guardar_mis_preferencias, 50.000).
const TOPE_USO = 100
// Marca de lo guardado en la cuenta: {} quiere decir "nunca se guardó".
const VERSION_PREFS = 1
// El estado de la página, por persona: lo que hay en memoria, la lectura de
// la cuenta (una sola), dónde quedó ('cargando' | 'cuenta' | 'dispositivo'),
// la base con la que se sube, la cola de subidas y si se guardó algo antes de
// que la cuenta contestara.
const ESTADO_PREFS = { memoria: new Map(), cargas: new Map(), donde: new Map(), base: new Map(), cola: new Map(), pendiente: new Set() }

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

function leerCopia(empleadoId, ls) {
  try {
    const crudo = ls?.getItem(clavePrefs(empleadoId))
    return normalizarPrefs(crudo ? JSON.parse(crudo) : null)
  } catch { return prefsVacias() }
}

function escribirCopia(empleadoId, prefs, ls) {
  try { ls?.setItem(clavePrefs(empleadoId), JSON.stringify(normalizarPrefs(prefs))); return true } catch { return false }
}

function sonDeFabrica(prefs) {
  return JSON.stringify(normalizarPrefs(prefs)) === JSON.stringify(prefsVacias())
}

// Las preferencias de ahora: las de memoria (ya leídas de la cuenta), o la
// copia del dispositivo si todavía no se leyeron.
export function leerPrefs(empleadoId, ls = globalThis.localStorage) {
  if (ESTADO_PREFS.memoria.has(empleadoId)) return normalizarPrefs(ESTADO_PREFS.memoria.get(empleadoId))
  return leerCopia(empleadoId, ls)
}

// Guarda en memoria y en la copia del dispositivo, y las sube a la cuenta
// (en orden, de a una). Devuelve si la copia se pudo escribir.
export function guardarPrefs(empleadoId, prefs, ls = globalThis.localStorage) {
  const p = normalizarPrefs(prefs)
  ESTADO_PREFS.memoria.set(empleadoId, p)
  const ok = escribirCopia(empleadoId, p, ls)
  if (ESTADO_PREFS.donde.get(empleadoId) === 'cargando') ESTADO_PREFS.pendiente.add(empleadoId)
  else if (ESTADO_PREFS.base.has(empleadoId)) subirPrefs(empleadoId, p)
  return ok
}

// Sube a la cuenta. Nunca tira: si falla, queda la copia del dispositivo y
// dondeSeGuardanPrefs() dice 'dispositivo'.
function subirPrefs(empleadoId, prefs) {
  const sb = ESTADO_PREFS.base.get(empleadoId)
  if (!sb) return Promise.resolve(false)
  const datos = { ...normalizarPrefs(prefs), v: VERSION_PREFS }
  const antes = ESTADO_PREFS.cola.get(empleadoId) ?? Promise.resolve()
  const esta = antes.then(async () => {
    try {
      const { error } = await sb.rpc('guardar_mis_preferencias', { p_datos: datos })
      if (error) throw error
      ESTADO_PREFS.donde.set(empleadoId, 'cuenta')
      return true
    } catch (e) {
      console.warn('preferencias: no se pudieron guardar en la cuenta', e)
      ESTADO_PREFS.donde.set(empleadoId, 'dispositivo')
      return false
    }
  })
  ESTADO_PREFS.cola.set(empleadoId, esta)
  return esta
}

// Lee las preferencias de la cuenta (UNA vez por página y por persona: la
// barra lateral y el tablero comparten la lectura). Nunca tira.
export function cargarPrefs({ sb, empleadoId, ls = globalThis.localStorage }) {
  if (!empleadoId) return Promise.resolve(prefsVacias())
  if (ESTADO_PREFS.cargas.has(empleadoId)) return ESTADO_PREFS.cargas.get(empleadoId)
  ESTADO_PREFS.donde.set(empleadoId, 'cargando')
  const carga = (async () => {
    const copia = leerCopia(empleadoId, ls)
    let datos
    try {
      const { data, error } = await sb.rpc('mis_preferencias')
      if (error) throw error
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('mis_preferencias devolvió algo que no es un objeto')
      datos = data
    } catch (e) {
      console.warn('preferencias: no se pudieron leer de la cuenta', e)
      ESTADO_PREFS.donde.set(empleadoId, 'dispositivo')
      if (!ESTADO_PREFS.memoria.has(empleadoId)) ESTADO_PREFS.memoria.set(empleadoId, copia)
      ESTADO_PREFS.pendiente.delete(empleadoId)
      return leerPrefs(empleadoId, ls)
    }
    ESTADO_PREFS.base.set(empleadoId, sb)
    ESTADO_PREFS.donde.set(empleadoId, 'cuenta')
    if (ESTADO_PREFS.pendiente.has(empleadoId)) {
      // Se guardó algo mientras se esperaba: gana eso y se sube.
      ESTADO_PREFS.pendiente.delete(empleadoId)
      const p = leerPrefs(empleadoId, ls)
      await subirPrefs(empleadoId, p)
      return p
    }
    if (Object.keys(datos).length === 0) {
      // La cuenta nunca guardó nada: se sube lo del dispositivo (la primera vez).
      ESTADO_PREFS.memoria.set(empleadoId, copia)
      if (!sonDeFabrica(copia)) await subirPrefs(empleadoId, copia)
      return normalizarPrefs(copia)
    }
    const p = normalizarPrefs(datos)
    ESTADO_PREFS.memoria.set(empleadoId, p)
    escribirCopia(empleadoId, p, ls)
    return normalizarPrefs(p)
  })()
  ESTADO_PREFS.cargas.set(empleadoId, carga)
  return carga
}

// Dónde quedaron: 'cargando' (todavía no contestó la cuenta), 'cuenta' o
// 'dispositivo' (la cuenta no contestó o no se pudo guardar).
export function dondeSeGuardanPrefs(empleadoId) {
  return ESTADO_PREFS.donde.get(empleadoId) ?? 'dispositivo'
}

// Una apertura del módulo `clave` ahora. Se guardan solo las de los últimos
// 30 días (el conteo de "los que más uso").
export function anotarUso(prefs, clave, ahora = Date.now()) {
  const p = normalizarPrefs(prefs)
  const desde = ahora - DIAS_USO * MS_DIA
  for (const k of Object.keys(p.uso)) p.uso[k] = p.uso[k].filter(t => t >= desde)
  p.uso[clave] = [...(p.uso[clave] ?? []), ahora].slice(-TOPE_USO)
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
