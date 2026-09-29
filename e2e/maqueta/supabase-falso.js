// Doble de js/supabase.js para la maqueta (ver servir.js). Lee los datos de
// /maqueta/datos/<nombre>.json con un await de nivel superior, así la pantalla
// los tiene antes de su primera consulta.
const CLAVE = 'maqueta.datos'
const pedido = new URLSearchParams(location.search).get('maqueta')
let nombre = null
try {
  if (pedido && /^[a-z0-9-]+$/.test(pedido)) sessionStorage.setItem(CLAVE, pedido)
  nombre = sessionStorage.getItem(CLAVE)
} catch { nombre = pedido }

const DATOS = nombre
  ? await fetch(`/maqueta/datos/${nombre}.json`).then(r => r.ok ? r.json() : { tablas: {}, rpc: {} }).catch(() => ({ tablas: {}, rpc: {} }))
  : { tablas: {}, rpc: {} }
if (!nombre) console.warn('[maqueta] sin datos: abrí la primera página con ?maqueta=<nombre>')

// CAMBIOS PUNTUALES (28/09/2026, comparar con el diseño): para dibujar un estado
// que los datos fijos no tienen (un PIN incorrecto, una fábrica sin máquinas
// abiertas) una prueba deja en sessionStorage 'maqueta.cambios' un
// { tablas: {…}, rpc: {…} } que PISA esas tablas o respuestas al cargar la
// página, o lo pone en globalThis.__maqueta para las rpc de ahí en adelante.
try {
  const cambios = JSON.parse(sessionStorage.getItem('maqueta.cambios') || 'null')
  if (cambios) {
    Object.assign(DATOS.tablas ??= {}, cambios.tablas ?? {})
    Object.assign(DATOS.rpc ??= {}, cambios.rpc ?? {})
  }
} catch { /* sin sessionStorage: sin cambios */ }

function consulta(tabla) {
  const filtros = []
  const q = {
    select() { return q }, order() { return q }, limit() { return q }, range() { return q },
    eq(a, b) { filtros.push(r => r[a] === b); return q }, neq(a, b) { filtros.push(r => r[a] !== b); return q },
    in(a, b) { filtros.push(r => b.includes(r[a])); return q }, is(a, b) { filtros.push(r => (r[a] ?? null) === b); return q },
    gte(a, b) { filtros.push(r => r[a] >= b); return q }, lte(a, b) { filtros.push(r => r[a] <= b); return q },
    like() { return q }, ilike() { return q }, not() { return q }, or() { return q },
    maybeSingle() { q._uno = true; return q }, single() { q._uno = true; return q },
    then(res, rej) {
      // Una tabla con el texto "ERROR:…" responde como un error de la base, y
      // "ESPERAR" no responde nunca (para mirar el estado "Cargando…").
      const cruda = DATOS.tablas?.[tabla]
      if (cruda === 'ESPERAR') return new Promise(() => {})
      if (typeof cruda === 'string' && cruda.startsWith('ERROR:')) return Promise.resolve({ data: null, error: { message: cruda.slice(6), code: 'P0001' } }).then(res, rej)
      const filas = (cruda || []).filter(r => filtros.every(f => f(r)))
      return Promise.resolve({ data: q._uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
    },
  }
  return q
}

export const supabase = {
  from: consulta,
  // Una rpc responde lo que diga "rpc" en los datos. Un texto "ERROR:…" se
  // devuelve como error de la base, para mirar cómo lo muestra la pantalla.
  rpc(nombreRpc, params) {
    console.log('[maqueta] rpc', nombreRpc, params)
    const vivo = globalThis.__maqueta?.rpc
    let r = vivo && Object.prototype.hasOwnProperty.call(vivo, nombreRpc) ? vivo[nombreRpc] : DATOS.rpc?.[nombreRpc]
    // Una respuesta que depende de los parámetros (29/09/2026, el tablero pide
    // la misma rpc por fábrica y por fecha): { "__segun": [{ "si": {…}, "r": … }],
    // "__defecto": … } responde la primera cuyo "si" coincide con los parámetros.
    if (r && typeof r === 'object' && !Array.isArray(r) && Array.isArray(r.__segun)) {
      const hit = r.__segun.find(c => Object.entries(c.si ?? {}).every(([k, v]) => (params?.[k] ?? null) === v))
      r = hit ? hit.r : (r.__defecto ?? null)
    }
    if (r === 'ESPERAR') return new Promise(() => {})
    if (typeof r === 'string' && r.startsWith('ERROR:')) return Promise.resolve({ data: null, error: { message: r.slice(6), code: 'P0001' } })
    return Promise.resolve({ data: r ?? null, error: null })
  },
  auth: {
    async getSession() { return { data: { session: { user: { id: DATOS.uid ?? 'uid-maqueta', email: DATOS.email ?? 'maqueta@local', user_metadata: DATOS.meta ?? {} } } }, error: null } },
    mfa: { async getAuthenticatorAssuranceLevel() { return { data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null } } },
    async signOut() { return {} },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
  },
  storage: { from() { return { createSignedUrl: async () => ({ data: null, error: null }), upload: async () => ({ data: null, error: null }) } } },
  functions: { invoke: async () => ({ data: null, error: { message: 'sin funciones en la maqueta' } }) },
}
