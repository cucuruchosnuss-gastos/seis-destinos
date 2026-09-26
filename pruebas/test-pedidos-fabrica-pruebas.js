// Pedidos y la FÁBRICA DE PRUEBAS: la unidad "Pruebas (robot)" no aparece en
// ninguna lista de unidades para una cuenta real; una cuenta de la fábrica sí
// la ve; y si la fábrica no se pudo leer, no se saca nada.
//
// Pedidos no tiene listas de PERSONAS (los clientes no son empleados), así que
// lo único que se filtra son las unidades: unidadesDelModulo(), de donde salen
// el segmento, la unidad inicial (la recordada en `pedidos.unidad`) y
// elegirUnidad(). Se EJECUTA el código real, init() incluido.
//
//   node pruebas/test-pedidos-fabrica-pruebas.js

const path = require('path')
const fs = require('fs')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const ROBOT = 'u-rob'
const UNIDADES = [{ id: 'u-cn', nombre: 'Cucuruchos Nuss' }, { id: 'u-dp', nombre: 'Dolce Pasta' }, { id: ROBOT, nombre: 'Pruebas (robot)' }]

// init() de verdad, con verificarSesion y conectarTodo de mentira y un
// supabase que contesta a cargarPermisos() y a cargarFabricaDePruebas().
const PRELUDIO_INIT = `
  async function verificarSesion() { return { user: { id: 'uid-1' } } }
  var __conectado = 0
  function conectarTodo() { __conectado++ }
  supabase.auth = { async getSession() { return { data: { session: { user: { id: 'uid-1' } } } } } }
`
const nuevo = () => construirPedidos(ARCHIVO, {
  funciones: ['init', 'cargarPermisos', 'sinAcceso'],
  preludioExtra: PRELUDIO_INIT,
})

function preparar(S, { rol = 'usuario', alcance = { todas: true }, yo = { unidad_negocio_id: 'u-cn', es_prueba: false }, fallaFabrica = false, recordada = null } = {}) {
  const t = S.__tablas
  t.unidades_negocio = (f) => {
    if (f.some(x => x[0] === 'eq' && x[1] === 'es_prueba')) {
      return fallaFabrica ? { data: null, error: { message: 'caída' } } : { data: [{ id: ROBOT }], error: null }
    }
    return { data: UNIDADES, error: null }
  }
  t.v_empleados_publico = [{ id: 'p-robot' }]
  t.empleados = (f) => {
    const sel = (f.find(x => x[0] === 'select') || [])[1] || ''
    if (sel.includes('es_prueba')) return { data: [yo], error: null }
    return { data: [{ id: 'emp-1', rol_app: rol }], error: null }
  }
  t.empleado_tareas = ['ver', 'cargar', 'configurar'].map(tarea => ({ tarea, alcance }))
  S.estado.unidades = new Map()
  S.estado.misTareas = new Map()
  S.estado.unidadId = null
  if (recordada) S.__ls.set('pedidos.unidad', recordada)
}

async function arrancar(op) {
  const S = nuevo()
  preparar(S, op)
  const warn = console.warn
  console.warn = () => {}
  try { await S.init() } finally { console.warn = warn }
  await new Promise(r => setImmediate(r))
  return S
}

const segmento = (S) => (S.__els.get('pe-unidades') || {}).innerHTML || ''

// ── Cuenta REAL con alcance en todas (tres unidades, una de prueba) ──────────
esperas.push((async () => {
  const S = await arrancar({ recordada: ROBOT })
  chk('real: la fábrica se leyó', S.estado.fabrica.ok === true && S.estado.fabrica.unidades.has(ROBOT))
  chk('real: no es de prueba', S.estado.fabrica.soyDePrueba === false)
  const ids = S.unidadesDelModulo()
  chk('real: unidadesDelModulo sin la de prueba', !ids.includes(ROBOT) && ids.length === 2, JSON.stringify(ids))
  chk('real: el segmento no dibuja la de prueba', !segmento(S).includes(ROBOT) && !segmento(S).includes('Pruebas (robot)'), segmento(S))
  chk('real: el segmento dibuja las dos reales', segmento(S).includes('u-cn') && segmento(S).includes('u-dp'))
  chk('real: la recordada de prueba NO queda elegida', S.estado.unidadId === 'u-cn', S.estado.unidadId)
  S.elegirUnidad(ROBOT)
  chk('real: elegirUnidad no acepta la de prueba', S.estado.unidadId === 'u-cn', S.estado.unidadId)
})())

// ── Super admin real: también sin la de prueba ───────────────────────────────
esperas.push((async () => {
  const S = await arrancar({ rol: 'super_admin', alcance: null })
  const ids = S.unidadesDelModulo()
  chk('super_admin real: sin la de prueba', !ids.includes(ROBOT) && ids.length === 2, JSON.stringify(ids))
})())

// ── Real con la de prueba + una sola real: igual que con una sola unidad ─────
esperas.push((async () => {
  const S = await arrancar({ alcance: { unidades: ['u-dp', ROBOT] }, recordada: ROBOT })
  chk('una sola real: queda una unidad', JSON.stringify(S.unidadesDelModulo()) === '["u-dp"]', JSON.stringify(S.unidadesDelModulo()))
  chk('una sola real: el segmento no se dibuja', segmento(S) === '', segmento(S))
  chk('una sola real: queda elegida la real', S.estado.unidadId === 'u-dp', S.estado.unidadId)
  chk('una sola real: entra (no sinAcceso)', S.__llamadas.errores.length === 0, JSON.stringify(S.__llamadas.errores))
})())

// ── Cuenta de la FÁBRICA: sí ve la de prueba ─────────────────────────────────
esperas.push((async () => {
  const S = await arrancar({ yo: { unidad_negocio_id: ROBOT, es_prueba: true }, recordada: ROBOT })
  chk('prueba: soyDePrueba', S.estado.fabrica.soyDePrueba === true)
  chk('prueba: unidadesDelModulo trae la de prueba', S.unidadesDelModulo().includes(ROBOT) && S.unidadesDelModulo().length === 3)
  chk('prueba: el segmento la dibuja', segmento(S).includes(ROBOT))
  chk('prueba: la recordada de prueba queda elegida', S.estado.unidadId === ROBOT, S.estado.unidadId)
})())

// ── La fábrica no se pudo leer: no se saca nada ──────────────────────────────
esperas.push((async () => {
  const S = await arrancar({ fallaFabrica: true })
  chk('sin datos: fabrica = FABRICA_SIN_DATOS', S.estado.fabrica.ok === false)
  chk('sin datos: no se saca nada', S.unidadesDelModulo().length === 3)
  chk('sin datos: igual arranca', S.__llamadas.errores.length === 0)
})())

// ── Directo sobre el helper del módulo, con la fábrica puesta a mano ─────────
{
  const S = nuevo()
  S.estado.unidades = new Map(UNIDADES.map(u => [u.id, u.nombre]))
  S.estado.misTareas = new Map([['ver', { todas: true }]])
  S.estado.fabrica = { ok: true, unidades: new Set([ROBOT]), personas: new Set(), soyDePrueba: false }
  chk('directo real: sin la de prueba', !S.unidadesDelModulo().includes(ROBOT))
  chk('directo real: htmlUnidades sin la de prueba', !S.htmlUnidades().includes(ROBOT))
  chk('directo real: unidadInicial no la elige', S.unidadInicial(S.unidadesDelModulo(), ROBOT) === 'u-cn')
  S.estado.fabrica = { ...S.estado.fabrica, soyDePrueba: true }
  chk('directo prueba: la trae', S.unidadesDelModulo().includes(ROBOT))
}

// ── La carga es en paralelo con los permisos, no después ─────────────────────
const iFab = src.indexOf('const fabrica = cargarFabricaDePruebas(supabase)')
const iAll = src.indexOf('Promise.all([cargarPermisos(), fabrica])')
chk('init lee la fábrica en paralelo con los permisos', iFab > 0 && iAll > iFab)

fin()
