// LA PLANTA SIN INTERNET (06/10/2026).
//
// El caso real: una mañana se cortó internet en la fábrica y la planta no se
// pudo usar en toda la mañana. Sin red no abría ninguna pantalla y lo único
// que esperaba en la tablet eran las masas, y solo si la pantalla ya estaba
// abierta.
//
// Este archivo tiene las tres piezas que lo resuelven, y lo usa SOLO la
// planta (modulos/produccion.html, a través de js/supabase.js cuando la
// página tiene <meta name="sd-sin-internet">):
//
// 1. LA COPIA DE LOS DATOS (IndexedDB, almacén 'copias'). Cada LECTURA a
//    Supabase que sale bien se guarda tal cual, con su clave (método + URL +
//    cuerpo). Sin red, la misma lectura se contesta con la copia guardada y
//    se avisa 'sd:copia' con la hora de la copia ("Datos de las 08:40").
//    Las ESCRITURAS nunca se copian ni se contestan con una copia.
//
// 2. LA COLA DE CARGAS (IndexedDB, almacén 'cola'). Cada carga de la planta
//    (un producto, una parada, la hora en que empezó, el cierre, una masa)
//    nace con su client_uuid AL TOCAR EL BOTÓN, con la hora de ESE momento
//    adentro de sus parámetros, y va por ejecutar_tablet() (las masas, por
//    registrar_masa, que ya era a prueba de duplicados con su p_client_uuid).
//    Si la clave ya llegó, la base devuelve el mismo resultado con
//    reintento: true y NO carga dos veces: por eso reintentar es seguro.
//    - En fila POR PLANILLA (el turno): una carga no sale antes que la
//      anterior de su misma planilla.
//    - Sin red: queda esperando y se manda sola (al volver la red y cada 30 s).
//    - Si la BASE la rechaza (no la red): queda "con error para revisar" y
//      frena SOLO las siguientes de ESA planilla.
//    - Una carga puede usar el resultado de otra anterior ({ $ref, campo }):
//      "Volvió a las…" de una parada que se anotó sin red necesita el id que
//      la base le dio a esa parada.
//    - Sobrevive a recargar, cerrar y apagar la tablet (IndexedDB).
//
// 3. LA SESIÓN SIN RED. Con el token vencido y sin red, supabase-js no
//    devuelve sesión (no la borra: un corte de red no es un cierre de sesión).
//    sesionGuardada() la lee del almacenamiento para que la planta abra igual.
//
// Su escape no hace falta: este archivo no arma HTML.

export const NOMBRE_BASE = 'sd-planta'
export const VERSION_BASE = 1
export const CADA_REINTENTO_MS = 30 * 1000
// Lo que ya se mandó se guarda un día: muestra su sublote en la planilla
// hasta que la planilla lo trae de la base, y sirve de referencia.
export const GUARDAR_ENVIADOS_MS = 24 * 3600 * 1000
// Una copia de más de 3 días ya no sirve para trabajar.
export const VIDA_COPIA_MS = 3 * 24 * 3600 * 1000
export const ESPERA_LECTURA_MS = 8000
export const ESPERA_ESCRITURA_MS = 20000

// Las RPC que solo LEEN (POST, pero sin efectos): se copian igual que una
// consulta. Ninguna otra RPC se copia nunca.
export const RPC_LECTURAS = new Set([
  'mi_sesion_produccion', 'personal_produccion', 'datos_para_masa', 'stock_para_masa',
  'que_falta_para_cerrar', 'scrap_de_referencia', 'mis_pendientes',
])

// ── ¿Es un error de red? ─────────────────────────────────────────────────────
// La base que dice que no (un raise de la función: P0001, una regla de un
// CHECK) trae su código: eso NO se reintenta, queda para revisar. Sin código
// (fetch que falló, un corte, un timeout) es la red. Dos casos con código que
// también son pasajeros: el token vencido (PGRST3xx / JWT) y "No se pudo
// identificar tu usuario", que la base dice cuando el pedido salió sin sesión
// (la sesión todavía no se había renovado al volver la red).
export function esErrorDeRedCarga(err, nav = globalThis.navigator) {
  if (!err) return true
  const texto = `${err.name ?? ''} ${err.message ?? ''} ${err.details ?? ''}`
  if (/No se pudo identificar tu usuario/i.test(texto)) return true
  const codigo = typeof err.code === 'string' ? err.code : ''
  if (/^PGRST3/.test(codigo) || /JWT/i.test(texto)) return true
  if (codigo !== '') return false
  if (nav && nav.onLine === false) return true
  if (typeof err.status === 'number' && err.status >= 500) return true
  return err.name === 'TypeError' || err.name === 'TiempoAgotado' || err.name === 'AuthRetryableFetchError' ||
    /fetch|network|conexi|load failed|timeout|tiempo agotado|ERR_INTERNET/i.test(texto)
}

// ── EL ALMACÉN ───────────────────────────────────────────────────────────────
// Dos almacenes: 'copias' (clave) y 'cola' (id). En la tablet es IndexedDB;
// donde no hay (las pruebas), uno en memoria con la misma forma.

export function almacenMemoria() {
  const tablas = { copias: new Map(), cola: new Map() }
  const clave = (t, o) => (t === 'copias' ? o.clave : o.id)
  return {
    tipo: 'memoria',
    async leer(t, k) { const v = tablas[t].get(k); return v === undefined ? null : structuredCloneSeguro(v) },
    async guardar(t, o) { tablas[t].set(clave(t, o), structuredCloneSeguro(o)) },
    async borrar(t, k) { tablas[t].delete(k) },
    async todos(t) { return [...tablas[t].values()].map(structuredCloneSeguro) },
  }
}

function structuredCloneSeguro(v) {
  try { return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)) } catch { return JSON.parse(JSON.stringify(v)) }
}

function promesaDe(pedido) {
  return new Promise((res, rej) => { pedido.onsuccess = () => res(pedido.result); pedido.onerror = () => rej(pedido.error) })
}

export function abrirAlmacenIdb(nombre = NOMBRE_BASE, idb = globalThis.indexedDB) {
  if (!idb) return Promise.resolve(almacenMemoria())
  const abrir = new Promise((res, rej) => {
    const p = idb.open(nombre, VERSION_BASE)
    p.onupgradeneeded = () => {
      const db = p.result
      if (!db.objectStoreNames.contains('copias')) db.createObjectStore('copias', { keyPath: 'clave' })
      if (!db.objectStoreNames.contains('cola')) db.createObjectStore('cola', { keyPath: 'id' })
    }
    p.onsuccess = () => res(p.result)
    p.onerror = () => rej(p.error)
    p.onblocked = () => rej(new Error('IndexedDB bloqueada'))
  })
  return abrir.then(db => {
    const tx = (t, modo) => db.transaction(t, modo).objectStore(t)
    return {
      tipo: 'idb',
      leer: (t, k) => promesaDe(tx(t, 'readonly').get(k)).then(v => v ?? null),
      guardar: (t, o) => promesaDe(tx(t, 'readwrite').put(o)).then(() => undefined),
      borrar: (t, k) => promesaDe(tx(t, 'readwrite').delete(k)).then(() => undefined),
      todos: (t) => promesaDe(tx(t, 'readonly').getAll()),
    }
  }).catch(err => {
    // Sin IndexedDB (modo privado raro): se trabaja en memoria. Lo de la cola
    // no sobrevive a recargar, pero la planta no se traba.
    console.error('IndexedDB:', err)
    return almacenMemoria()
  })
}

let almacenUnico = null
// El almacén de la planta, uno solo por página.
export function almacenPlanta() {
  if (!almacenUnico) {
    almacenUnico = abrirAlmacenIdb()
    // Que el navegador no lo borre para hacer lugar (la cola no se puede perder).
    try { globalThis.navigator?.storage?.persist?.().catch(() => { /* nada */ }) } catch { /* nada */ }
  }
  return almacenUnico
}

// ── 1 · LA COPIA DE LOS DATOS ────────────────────────────────────────────────

// ¿Es una lectura que se puede copiar? GET a /rest/v1/ (una tabla o vista) o
// POST a una RPC de solo lectura. Nunca auth, nunca storage, nunca una
// escritura.
export function esLecturaCopiable(metodo, url, base, lecturas = RPC_LECTURAS) {
  let u
  try { u = new URL(url) } catch { return false }
  if (base && !String(url).startsWith(base)) return false
  const m = String(metodo || 'GET').toUpperCase()
  const rpc = /^\/rest\/v1\/rpc\/([a-z_0-9]+)$/.exec(u.pathname)
  if (rpc) return m === 'POST' && lecturas.has(rpc[1])
  return m === 'GET' && /^\/rest\/v1\/[a-z_0-9]+$/.test(u.pathname)
}

export function claveCopia(metodo, url, cuerpo) {
  return `${String(metodo || 'GET').toUpperCase()} ${url}${cuerpo ? ' ' + cuerpo : ''}`
}

const ENCABEZADOS_COPIA = ['content-type', 'content-range', 'preference-applied']

function conTiempo(promesa, ms) {
  let t
  return Promise.race([
    promesa,
    new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error('tiempo agotado'), { name: 'TiempoAgotado' })), ms) }),
  ]).finally(() => clearTimeout(t))
}

async function cuerpoComoTexto(input, init) {
  const b = init?.body
  if (b == null) {
    if (typeof Request !== 'undefined' && input instanceof Request && input.method !== 'GET') {
      try { return await input.clone().text() } catch { return '' }
    }
    return ''
  }
  return typeof b === 'string' ? b : ''
}

// El fetch que se le pasa a createClient. Las lecturas copiables van a la
// red con un tiempo máximo y, si salen bien, se guardan; si la red falla, se
// contesta con la copia (y se avisa). Todo lo demás pasa igual, con un tiempo
// máximo para que una red colgada no deje la tablet esperando para siempre.
export function crearFetchConCopia({
  fetchBase = globalThis.fetch?.bind(globalThis),
  almacen = almacenPlanta,
  base,
  lecturas = RPC_LECTURAS,
  ahora = () => Date.now(),
  nav = globalThis.navigator,
  alUsarCopia = () => {},
  alLeerDeRed = () => {},
  esperaLectura = ESPERA_LECTURA_MS,
  esperaOtro = ESPERA_ESCRITURA_MS,
} = {}) {
  const tomarAlmacen = () => (typeof almacen === 'function' ? almacen() : almacen)
  return async function fetchConCopia(input, init = {}) {
    const url = typeof input === 'string' ? input : (input?.url ?? String(input))
    const metodo = String(init?.method ?? (typeof input === 'object' && input?.method) ?? 'GET').toUpperCase()
    if (!esLecturaCopiable(metodo, url, base, lecturas)) {
      // Una escritura o auth: a la red, con tiempo máximo (la cola reintenta).
      return conTiempo(fetchBase(input, init), esperaOtro)
    }
    const cuerpo = metodo === 'POST' ? await cuerpoComoTexto(input, init) : ''
    const clave = claveCopia(metodo, url, cuerpo)
    const desdeCopia = async (errorRed) => {
      let copia = null
      try { copia = await (await tomarAlmacen()).leer('copias', clave) } catch { copia = null }
      if (!copia || ahora() - Number(copia.guardado) > VIDA_COPIA_MS) throw errorRed
      alUsarCopia(Number(copia.guardado), clave)
      return new Response(copia.cuerpo, { status: copia.estado, headers: copia.encabezados ?? {} })
    }
    if (nav && nav.onLine === false) return desdeCopia(new TypeError('Failed to fetch (sin internet)'))
    let resp
    try {
      resp = await conTiempo(fetchBase(input, init), esperaLectura)
    } catch (err) {
      return desdeCopia(err)
    }
    if (resp.ok) {
      try {
        const texto = await resp.clone().text()
        const encabezados = {}
        for (const h of ENCABEZADOS_COPIA) { const v = resp.headers.get(h); if (v != null) encabezados[h] = v }
        const a = await tomarAlmacen()
        await a.guardar('copias', { clave, cuerpo: texto, estado: resp.status, encabezados, guardado: ahora() })
      } catch (err) { console.error('copia sin internet:', err) }
      alLeerDeRed()
    } else if (resp.status >= 500) {
      // La base caída cuenta como sin red: mejor la copia que un error.
      try { return await desdeCopia(new Error('HTTP ' + resp.status)) } catch { return resp }
    }
    return resp
  }
}

// Borra las copias viejas (más de 3 días): que IndexedDB no crezca sin fin.
export async function purgarCopias(almacen, ahora = Date.now()) {
  const a = await almacen
  const todas = await a.todos('copias')
  let n = 0
  for (const c of todas) if (ahora - Number(c.guardado) > VIDA_COPIA_MS) { await a.borrar('copias', c.clave); n++ }
  return n
}

// ── 2 · LA COLA DE CARGAS ────────────────────────────────────────────────────

// Reemplaza cada { $ref: id, campo } por el resultado de esa carga. Devuelve
// { params } o { espera: id } si la carga de la que depende todavía no salió.
export function resolverReferencias(params, porId) {
  let espera = null
  const resolver = (v) => {
    if (Array.isArray(v)) return v.map(resolver)
    if (v && typeof v === 'object') {
      if (typeof v.$ref === 'string') {
        const otro = porId.get(v.$ref)
        if (!otro || otro.estado !== 'enviado' || !otro.resultado) { espera = espera ?? v.$ref; return null }
        return otro.resultado[v.campo] ?? null
      }
      const out = {}
      for (const [k, x] of Object.entries(v)) out[k] = resolver(x)
      return out
    }
    return v
  }
  const r = resolver(params)
  return espera ? { espera } : { params: r }
}

// Lo que ya llegó a la base no se reintenta; el resto, en orden de carga.
const ORDEN = (a, b) => (Number(a.orden) - Number(b.orden)) || String(a.id).localeCompare(String(b.id))

// La cola. `enviar(item, params)` manda UNA carga y devuelve { data, error }.
export function crearCola({ almacen, enviar, ahora = () => Date.now(), alCambiar = () => {}, esRed = esErrorDeRedCarga } = {}) {
  const tomar = () => Promise.resolve(typeof almacen === 'function' ? almacen() : almacen)
  let procesando = null
  let sinRed = false
  let ultimoOrden = 0

  async function todos() {
    const a = await tomar()
    return (await a.todos('cola')).sort(ORDEN)
  }

  async function guardar(item) {
    const a = await tomar()
    await a.guardar('cola', item)
  }

  // Una carga nueva. El id es el client_uuid (se genera al tocar el botón).
  async function agregar({ id, operacion, params, grupo = 'general', etiqueta = '', datos = null }) {
    if (!id) throw new Error('Falta la clave de la carga.')
    const actuales = await todos()
    const existente = actuales.find(x => x.id === id)
    if (existente) return existente
    const max = actuales.reduce((m, x) => Math.max(m, Number(x.orden) || 0), 0)
    ultimoOrden = Math.max(ultimoOrden + 1, max + 1, ahora())
    const item = {
      id, operacion, params, grupo: String(grupo ?? 'general'), etiqueta, datos,
      orden: ultimoOrden, creado: ahora(), estado: 'pendiente', intentos: 0,
      error: null, resultado: null, enviado_en: null,
    }
    await guardar(item)
    alCambiar()
    return item
  }

  // Manda lo que espera, en orden y por planilla. Devuelve { enviados,
  // errores, sinRed }. Si ya está mandando, espera esa misma vuelta.
  function procesar() {
    if (procesando) return procesando
    procesando = (async () => {
      const r = { enviados: 0, errores: 0, sinRed: false }
      try {
        const lista = await todos()
        const porId = new Map(lista.map(x => [x.id, x]))
        const grupos = new Map()
        for (const it of lista) {
          if (it.estado === 'enviado') continue
          if (!grupos.has(it.grupo)) grupos.set(it.grupo, [])
          grupos.get(it.grupo).push(it)
        }
        afuera: for (const fila of grupos.values()) {
          for (const it of fila) {
            if (it.estado === 'error') break // frena SOLO esta planilla
            const ref = resolverReferencias(it.params, porId)
            if (ref.espera) {
              const dep = porId.get(ref.espera)
              // Depende de una que tuvo error o que no existe: queda con error.
              if (!dep || dep.estado === 'error') {
                it.estado = 'error'
                it.error = { message: dep ? 'Depende de una carga que tuvo un error.' : 'Falta la carga de la que depende.' }
                await guardar(it); r.errores++; alCambiar()
              }
              break
            }
            it.estado = 'enviando'; it.intentos = (Number(it.intentos) || 0) + 1
            await guardar(it); alCambiar()
            let res
            try { res = await enviar(it, ref.params) } catch (e) { res = { data: null, error: e } }
            if (res?.error) {
              if (esRed(res.error)) {
                it.estado = 'pendiente'
                await guardar(it); alCambiar()
                r.sinRed = true
                sinRed = true
                break afuera
              }
              it.estado = 'error'
              it.error = { message: String(res.error.message ?? res.error), code: res.error.code ?? null }
              await guardar(it); r.errores++; alCambiar()
              break
            }
            it.estado = 'enviado'
            it.resultado = res?.data && typeof res.data === 'object' ? res.data : { valor: res?.data ?? null }
            it.enviado_en = ahora()
            it.error = null
            await guardar(it); r.enviados++; alCambiar()
            sinRed = false
          }
        }
        // Lo enviado hace más de un día se borra.
        const a = await tomar()
        for (const it of await todos()) {
          if (it.estado === 'enviado' && ahora() - Number(it.enviado_en) > GUARDAR_ENVIADOS_MS) await a.borrar('cola', it.id)
        }
      } finally {
        procesando = null
      }
      return r
    })()
    return procesando
  }

  // Agrega una carga y espera a ver qué pasó con ELLA: 'ok' (con la
  // respuesta), 'red' (quedó esperando: se manda sola) o 'rechazo' (la base
  // dijo que no). Una carga que la base rechaza EN EL MOMENTO se saca de la
  // cola: la persona está ahí y puede corregirla, como siempre. La que se
  // rechaza más tarde (mandada sola, sin nadie mirando) queda para revisar.
  async function enviarYEsperar(datos) {
    const it = await agregar(datos)
    await procesar()
    const despues = (await todos()).find(x => x.id === it.id)
    if (!despues) return { resultado: 'red', item: it }
    if (despues.estado === 'enviado') return { resultado: 'ok', data: despues.resultado, item: despues }
    if (despues.estado === 'error') {
      // Si es la primera vez que se intenta y no espera a nadie, la persona
      // lo corrige ahora mismo: se saca de la cola.
      if ((Number(despues.intentos) || 0) <= 1) {
        await (await tomar()).borrar('cola', despues.id)
        alCambiar()
      }
      return { resultado: 'rechazo', error: despues.error, item: despues }
    }
    // Detrás de una carga con error de su misma planilla: espera a que se
    // revise esa (no es la red).
    const lista = await todos()
    if (lista.some(x => x.grupo === despues.grupo && x.estado === 'error' && Number(x.orden) < Number(despues.orden))) {
      return { resultado: 'bloqueada', item: despues }
    }
    return { resultado: 'red', item: despues }
  }

  async function reintentar(id) {
    const it = (await todos()).find(x => x.id === id)
    if (!it || it.estado !== 'error') return false
    it.estado = 'pendiente'; it.error = null
    await guardar(it); alCambiar()
    await procesar()
    return true
  }

  async function descartar(id) {
    await (await tomar()).borrar('cola', id)
    alCambiar()
  }

  async function resumen() {
    const lista = await todos()
    return resumenDeCola(lista, { sinRed })
  }

  return { agregar, procesar, enviarYEsperar, reintentar, descartar, todos, resumen, get sinRed() { return sinRed } }
}

// Cuántas esperan, cuántas tienen error, cuántas se están mandando.
export function resumenDeCola(lista, { sinRed = false } = {}) {
  const esperando = lista.filter(x => x.estado === 'pendiente' || x.estado === 'enviando').length
  const enviando = lista.filter(x => x.estado === 'enviando').length
  const errores = lista.filter(x => x.estado === 'error').length
  return { esperando, enviando, errores, sinRed }
}

// El texto del cartel fijo de arriba. { texto, tono } o null si no hay nada
// que decir. tono: 'sin-red' | 'enviando' | 'ok' | 'error'.
export function textoCartelCola({ enLinea = true, esperando = 0, enviando = 0, errores = 0, recienEnviado = false, copiaDesde = null } = {}) {
  const n = esperando
  const cargas = `${n} ${n === 1 ? 'carga esperando' : 'cargas esperando'}`
  const datos = copiaDesde ? ` · Datos de las ${horaDeCopia(copiaDesde)}` : ''
  if (errores > 0) {
    const e = `${errores} ${errores === 1 ? 'carga con error para revisar' : 'cargas con error para revisar'}`
    return { texto: n ? `${e} · ${cargas}` : e, tono: 'error' }
  }
  if (!enLinea) {
    return { texto: n ? `Sin internet · ${cargas} · se mandan solas${datos}` : `Sin internet${datos}`, tono: 'sin-red' }
  }
  if (enviando > 0 || n > 0) return { texto: 'Enviando…', tono: 'enviando' }
  if (recienEnviado) return { texto: 'Todo enviado ✓', tono: 'ok' }
  if (copiaDesde) return { texto: `Datos de las ${horaDeCopia(copiaDesde)}`, tono: 'sin-red' }
  return null
}

// "08:40" en hora de Argentina. (No se llama horaCorta: la planta ya tiene
// una con ese nombre, que recibe una hora de texto.)
export function horaDeCopia(ms) {
  const d = new Date(Number(ms))
  if (!Number.isFinite(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  } catch {
    return d.toISOString().slice(11, 16)
  }
}

// ── 3 · LA SESIÓN SIN RED ────────────────────────────────────────────────────
// La que supabase-js dejó guardada (no la borra por un corte de red). Solo
// para trabajar sin red: con red, la sesión la maneja supabase-js como siempre.
export function sesionGuardada(clave, almacen = globalThis.localStorage) {
  try {
    const s = JSON.parse(almacen?.getItem(clave) ?? 'null')
    if (s && s.user?.id && s.refresh_token) return s
  } catch { /* nada */ }
  return null
}
