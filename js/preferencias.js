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
//  - barra_inferior (05/10/2026): los módulos de la barra de abajo del
//    celular, en orden, si la persona los eligió. Sin elegir (o una lista
//    vacía) no está: la barra se arma sola (modulosDeAbajo).
export function normalizarPrefs(p) {
  const v = prefsVacias()
  if (!p || typeof p !== 'object' || Array.isArray(p)) return v
  // Cualquier OTRA clave que venga de la cuenta se conserva tal cual
  // (05/10/2026): guardar_mis_preferencias reemplaza el objeto entero, así
  // que tirarla al limpiar la borraría de la cuenta en el próximo guardado
  // (la marca 'v' no: se vuelve a poner al subir).
  const conocidas = ['barra', 'tablero', 'uso', 'barra_inferior', 'v']
  for (const [k, x] of Object.entries(p)) if (!conocidas.includes(k) && x !== undefined) v[k] = x
  const lista = x => Array.isArray(x) ? x.filter(c => typeof c === 'string' && c) : []
  const abajo = [...new Set(lista(p.barra_inferior))]
  if (abajo.length) v.barra_inferior = abajo
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
// La barra de abajo del celular (barra_inferior) NO se toca acá: la escribe
// solo guardarBarraInferior, y se conserva la que hay ahora. Así una pantalla
// que tiene una copia vieja de las preferencias (el tablero, Personalizar)
// no la borra al guardar lo suyo. Lo mismo con una clave que este módulo no
// conoce: si la copia que llega no la trae, se conserva la de ahora.
export function guardarPrefs(empleadoId, prefs, ls = globalThis.localStorage) {
  const p = normalizarPrefs(prefs)
  const ahora = leerPrefs(empleadoId, ls)
  if (ahora.barra_inferior) p.barra_inferior = ahora.barra_inferior
  else delete p.barra_inferior
  for (const [k, x] of Object.entries(ahora)) if (!(k in p)) p[k] = x
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

// LA BARRA DE ABAJO DEL CELULAR (05/10/2026): guarda SOLO la clave
// barra_inferior (la lista en orden; null o [] = volver a la automática).
// guardar_mis_preferencias REEMPLAZA el objeto entero, así que antes de
// guardar se LEE lo que hay en la cuenta en ese momento (mis_preferencias:
// puede haber cambiado en otro dispositivo), se cambia solo esa clave y se
// sube el objeto entero: el tablero, la barra de la compu y el uso quedan
// como están en la cuenta. Va en la misma cola que las demás subidas, así no
// se cruza con una que esté en camino. Nunca tira: devuelve { ok, donde }
// ('cuenta' si quedó en la cuenta, 'dispositivo' si quedó solo acá).
export function guardarBarraInferior({ empleadoId, lista, ls = globalThis.localStorage }) {
  const nueva = Array.isArray(lista) ? [...new Set(lista.filter(c => typeof c === 'string' && c))] : []
  const conClave = (p) => {
    const x = { ...p }
    delete x.v
    if (nueva.length) x.barra_inferior = nueva
    else delete x.barra_inferior
    return x
  }
  const enEsteDispositivo = () => {
    const p = normalizarPrefs(conClave(leerPrefs(empleadoId, ls)))
    ESTADO_PREFS.memoria.set(empleadoId, p)
    escribirCopia(empleadoId, p, ls)
  }
  const lectura = ESTADO_PREFS.cargas.get(empleadoId) ?? Promise.resolve()
  const enCamino = ESTADO_PREFS.cola.get(empleadoId) ?? Promise.resolve()
  const esta = Promise.all([lectura, enCamino]).catch(() => {}).then(async () => {
    const sb = ESTADO_PREFS.base.get(empleadoId)
    if (!sb) { enEsteDispositivo(); return { ok: false, donde: 'dispositivo' } }
    try {
      const { data, error } = await sb.rpc('mis_preferencias')
      if (error) throw error
      if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('mis_preferencias no devolvió un objeto')
      // La cuenta nunca guardó nada ({}): la base es lo de este dispositivo.
      const actual = Object.keys(data).length ? data : leerPrefs(empleadoId, ls)
      const datos = conClave(actual)
      const { error: e2 } = await sb.rpc('guardar_mis_preferencias', { p_datos: { ...datos, v: VERSION_PREFS } })
      if (e2) throw e2
      const p = normalizarPrefs(datos)
      ESTADO_PREFS.memoria.set(empleadoId, p)
      escribirCopia(empleadoId, p, ls)
      ESTADO_PREFS.donde.set(empleadoId, 'cuenta')
      return { ok: true, donde: 'cuenta' }
    } catch (e) {
      console.warn('preferencias: no se pudo guardar la barra de abajo en la cuenta', e)
      enEsteDispositivo()
      ESTADO_PREFS.donde.set(empleadoId, 'dispositivo')
      return { ok: false, donde: 'dispositivo' }
    }
  })
  ESTADO_PREFS.cola.set(empleadoId, esta)
  return esta
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

// Los módulos de la barra de abajo del celular (entran `cantidad`; 05/10/2026):
//  - si la persona ELIGIÓ (barra_inferior), esos, en su orden, solo los que
//    todavía puede abrir y hasta `cantidad` (el resto queda en "Más");
//  - si nunca eligió (o ninguno de los elegidos sigue a su alcance), los que
//    MÁS USA (30 días) y, para completar, los fijados y el orden de la barra.
export function modulosDeAbajo(modulos, prefs, ahora = Date.now(), cantidad = 4) {
  const p = normalizarPrefs(prefs)
  const porClave = new Map(modulos.map(m => [m.clave, m]))
  const elegidos = (p.barra_inferior ?? []).filter(c => porClave.has(c)).map(c => porClave.get(c))
  if (elegidos.length) return elegidos.slice(0, cantidad)
  const { fijados, resto } = ordenarBarra(modulos, p, ahora)
  const pos = new Map(modulos.map((m, i) => [m.clave, i]))
  const porUso = modulos.filter(m => vecesUsado(p, m.clave, ahora) > 0)
    .sort((a, b) => vecesUsado(p, b.clave, ahora) - vecesUsado(p, a.clave, ahora) || pos.get(a.clave) - pos.get(b.clave))
  const salen = []
  for (const m of [...porUso, ...fijados, ...resto]) {
    if (salen.length >= cantidad) break
    if (!salen.some(x => x.clave === m.clave)) salen.push(m)
  }
  return salen
}
