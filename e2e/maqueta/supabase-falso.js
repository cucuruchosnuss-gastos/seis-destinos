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
      const filas = (DATOS.tablas?.[tabla] || []).filter(r => filtros.every(f => f(r)))
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
    const r = DATOS.rpc?.[nombreRpc]
    if (typeof r === 'string' && r.startsWith('ERROR:')) return Promise.resolve({ data: null, error: { message: r.slice(6), code: 'P0001' } })
    return Promise.resolve({ data: r ?? null, error: null })
  },
  auth: {
    async getSession() { return { data: { session: { user: { id: DATOS.uid ?? 'uid-maqueta', email: 'maqueta@local' } } }, error: null } },
    mfa: { async getAuthenticatorAssuranceLevel() { return { data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null } } },
    async signOut() { return {} },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } } },
  },
  storage: { from() { return { createSignedUrl: async () => ({ data: null, error: null }), upload: async () => ({ data: null, error: null }) } } },
  functions: { invoke: async () => ({ data: null, error: { message: 'sin funciones en la maqueta' } }) },
}
