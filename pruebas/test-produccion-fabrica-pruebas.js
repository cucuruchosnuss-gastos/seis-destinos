// La fábrica de pruebas (26/09/2026) en Producción: la unidad "Pruebas
// (robot)" y sus personas (Robot Encargado, Robot Masero…) NO aparecen para
// una cuenta real, ni en la planta (modulos/produccion.html) ni en la gestión
// (modulos/produccion-gestion.html). Una cuenta de la fábrica de pruebas (la
// tablet y la gestión del robot) SÍ las ve. Y si la fábrica no se pudo leer
// (FABRICA_SIN_DATOS) no se saca nada.
//
// Se EJECUTA el código real de los dos archivos (sandbox-produccion.js) con
// el helper real de js/utils.js (va en el preludio, por fuenteNumeros()).
//
//   node pruebas/test-produccion-fabrica-pruebas.js
//   ARCHIVO_TEST=… ARCHIVO_GESTION=… node pruebas/test-produccion-fabrica-pruebas.js

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')


const PLANTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE_P = leer(PLANTA)
const FUENTE_G = leer(ARCHIVO_G)
const { chk, esperas, fin } = arnes()

const ROBOT_U = 'u-robot'
const E_ROBOT = 'e-robot-enc', M_ROBOT = 'e-robot-mas'

// Las tres fábricas posibles, con la misma forma que devuelve cargarFabricaDePruebas.
const REAL = { ok: true, unidades: new Set([ROBOT_U]), personas: new Set([E_ROBOT, M_ROBOT]), soyDePrueba: false }
const DE_PRUEBA = { ok: true, unidades: new Set([ROBOT_U]), personas: new Set([E_ROBOT, M_ROBOT]), soyDePrueba: true }

const UNIDADES = [
  { id: 'u-cn', nombre: 'Cucuruchos Nuss' },
  { id: ROBOT_U, nombre: 'Pruebas (robot)' },
]

const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: true, tiene_pin: true },
  { id: E_ROBOT, nombre: 'Robot Encargado', misma_unidad: false, puestos: ['encargado'], puestos_temporales: [], es_maestro: true, tiene_pin: true },
  { id: 'e-juan', nombre: 'Juan Masero', misma_unidad: true, puestos: ['masero', 'operario'], puestos_temporales: [], es_maestro: false, tiene_pin: true },
  { id: M_ROBOT, nombre: 'Robot Masero', misma_unidad: false, puestos: ['masero', 'operario'], puestos_temporales: [], es_maestro: false, tiene_pin: false },
]

const ids = (l) => (l ?? []).map(x => x.id)
const tieneRobots = (l) => ids(l).includes(E_ROBOT) && ids(l).includes(M_ROBOT)
const sinRobots = (l) => !ids(l).includes(E_ROBOT) && !ids(l).includes(M_ROBOT) && ids(l).includes('e-fede') && ids(l).includes('e-juan')

function armar(archivo, fabrica, { unidades = UNIDADES, tareas = [['cargar', { todas: true }]] } = {}) {
  const S = construirProduccion(archivo, { funciones: ['cargarPermisos'], constantes: [] })
  // La fábrica que cargó el init (la tablet la recibe antes de pedir el personal).
  S.estado.fabrica = fabrica
  S.__tablas.empleados = [{ id: 'emp-yo', rol_app: 'usuario' }]
  S.__tablas.empleado_tareas = tareas.map(([tarea, alcance]) => ({ tarea, alcance }))
  S.__tablas.unidades_negocio = unidades
  S.__setRpc(async (nombre) => nombre === 'personal_produccion' ? { data: PERSONAL, error: null } : { data: null, error: null })
  return S
}

// La de "no se pudo leer": la REAL de utils.js, la misma que usa el preludio.
const { fuenteNumeros } = require('./numeros-comun')
const FSD = new Function(fuenteNumeros() + ';return FABRICA_SIN_DATOS')()

for (const [archivo, nombreArchivo] of [[PLANTA, 'planta'], [ARCHIVO_G, 'gestión']]) {
  // ── Las UNIDADES: cargarPermisos arma estado.unidades ─────────────────────
  esperas.push((async () => {
    for (const [quien, f, ve] of [['cuenta real', REAL, false], ['cuenta de prueba', DE_PRUEBA, true], ['sin datos', FSD, true]]) {
      const S = armar(archivo, null)
      await S.cargarPermisos(Promise.resolve(f))
      chk(`${nombreArchivo}, ${quien}: estado.fabrica queda con la que cargó el init`, S.estado.fabrica === f)
      chk(`${nombreArchivo}, ${quien}: la unidad del robot ${ve ? 'SÍ' : 'NO'} está entre las unidades`,
        S.estado.unidades.has(ROBOT_U) === ve, JSON.stringify([...S.estado.unidades]))
      chk(`${nombreArchivo}, ${quien}: las reales siguen`, S.estado.unidades.get('u-cn') === 'Cucuruchos Nuss')
      chk(`${nombreArchivo}, ${quien}: unidadesCon (todas) ${ve ? 'la trae' : 'no la trae'}`,
        S.unidadesCon('cargar').includes(ROBOT_U) === ve)
    }
    // Sin argumento (una llamada vieja) no se filtra nada y no se rompe.
    const V = armar(archivo, null)
    await V.cargarPermisos()
    chk(`${nombreArchivo}: cargarPermisos sin fábrica no saca nada`, V.estado.unidades.has(ROBOT_U))
  })())
}

// ── PLANTA: "¿Quién sos?", el acceso maestro y lo que sale del personal ─────
esperas.push((async () => {
  for (const [quien, fab, ve] of [['cuenta real', REAL, false], ['cuenta de prueba', DE_PRUEBA, true], ['sin datos', FSD, true]]) {
    const S = armar(PLANTA, fab)
    S.estado.modo = 'produccion'
    await S.mostrarQuien()
    chk(`planta, ${quien}: el personal ${ve ? 'trae' : 'no trae'} a los robots`, ve ? tieneRobots(S.estado.personal) : sinRobots(S.estado.personal),
      JSON.stringify(ids(S.estado.personal)))
    const html = S.__doc.getElementById('pr-quien-lista').innerHTML
    chk(`planta, ${quien}: "¿Quién sos?" (encargados) ${ve ? 'muestra' : 'no muestra'} a Robot Encargado`,
      /Robot Encargado/.test(html) === ve && /Federico Silva/.test(html), html)

    const M = armar(PLANTA, fab)
    M.estado.modo = 'masa'
    await M.mostrarQuien()
    chk(`planta, ${quien}: "¿Quién sos?" (maseros) ${ve ? 'muestra' : 'no muestra'} a Robot Masero`,
      /Robot Masero/.test(M.__doc.getElementById('pr-quien-lista').innerHTML) === ve)

    // Lo que se arma del mismo personal: operarios, maestros y "Dar acceso por hoy".
    chk(`planta, ${quien}: los operarios para abrir turno`, ids(S.personasParaPuesto(S.estado.personal, 'operario').personas).includes(M_ROBOT) === ve)
    chk(`planta, ${quien}: "Dar acceso por hoy"`, ids(S.personasParaAcceso(S.estado.personal, '', 'masero')).includes(M_ROBOT) === ve)

    // El acceso maestro pide el personal por su cuenta cuando todavía no está.
    const A = armar(PLANTA, fab)
    A.estado.personal = []
    await A.abrirMaestro()
    chk(`planta, ${quien}: el acceso maestro ${ve ? 'ofrece' : 'no ofrece'} al robot como maestro`,
      ids(A.maestrosDisponibles()).includes(E_ROBOT) === ve && ids(A.maestrosDisponibles()).includes('e-fede'),
      JSON.stringify(ids(A.maestrosDisponibles())))
  }
  // Sin la fábrica en el estado (una suite vieja, o antes del init) no se rompe ni saca nada.
  const S = armar(PLANTA, undefined)
  S.estado.modo = 'produccion'
  await S.mostrarQuien()
  chk('planta: sin estado.fabrica no se saca nada', tieneRobots(S.estado.personal))
})())

// ── GESTIÓN: Personal y PINes, accesos temporales y los selectores de unidad ──
esperas.push((async () => {
  const TEMPORALES = [
    { id: 't1', empleado_id: 'e-juan', puesto: 'masero', desde: '2026-01-01T00:00:00Z', hasta: '2099-01-01T00:00:00Z', otorgado_por: 'e-fede' },
    { id: 't2', empleado_id: M_ROBOT, puesto: 'masero', desde: '2026-01-01T00:00:00Z', hasta: '2099-01-01T00:00:00Z', otorgado_por: 'e-fede' },
  ]
  for (const [quien, fab, ve] of [['cuenta real', REAL, false], ['cuenta de prueba', DE_PRUEBA, true], ['sin datos', FSD, true]]) {
    const S = armar(ARCHIVO_G, fab)
    S.__tablas.puestos_temporales = TEMPORALES
    S.__tablas.v_empleados_publico = [{ id: 'e-fede', nombre: 'Federico Silva' }]
    const d = await S.leerPersonalConfig({ unidadId: 'u-cn' })
    chk(`gestión, ${quien}: Personal y PINes ${ve ? 'trae' : 'no trae'} a los robots`, ve ? tieneRobots(d.personal) : sinRobots(d.personal),
      JSON.stringify(ids(d.personal)))
    chk(`gestión, ${quien}: todo el personal (el filtro "todos") ${ve ? 'los muestra' : 'no los muestra'}`,
      ids(S.personalVisible(d.personal, '', true)).includes(E_ROBOT) === ve)
    chk(`gestión, ${quien}: los accesos temporales ${ve ? 'traen' : 'no traen'} al robot`,
      d.temporales.some(t => t.empleado_id === M_ROBOT) === ve && d.temporales.some(t => t.empleado_id === 'e-juan'),
      JSON.stringify(d.temporales.map(t => t.empleado_id)))

    // Los selectores de unidad (gestión, historial/stock, configuración).
    const U = armar(ARCHIVO_G, null, { tareas: [['ver', { todas: true }], ['configurar', { todas: true }]], unidades: [...UNIDADES, { id: 'u-dp', nombre: 'Dolce Pasta' }] })
    await U.cargarPermisos(Promise.resolve(fab))
    U.estado.unidadId = 'u-cn'
    U.pintarSelectorGestion()
    const opts = U.__doc.getElementById('pr-gestion-unidad').innerHTML
    chk(`gestión, ${quien}: el selector de unidad ${ve ? 'ofrece' : 'no ofrece'} "Pruebas (robot)"`, /Pruebas \(robot\)/.test(opts) === ve && /Dolce Pasta/.test(opts), opts)
    chk(`gestión, ${quien}: historial y stock terminado`, U.unidadesDeHistorial().includes(ROBOT_U) === ve)
    chk(`gestión, ${quien}: configuración`, U.unidadesDeConfig().includes(ROBOT_U) === ve)
    U.pintarSelectorUnidad('pr-cfg-unidad', U.unidadesDeConfig(), 'u-cn')
    chk(`gestión, ${quien}: el selector de unidad de configuración`, /Pruebas \(robot\)/.test(U.__doc.getElementById('pr-cfg-unidad').innerHTML) === ve)

    // Con UNA real + la del robot: para una cuenta real queda una sola y el
    // selector se esconde, igual que siempre con una sola unidad.
    const W = armar(ARCHIVO_G, null, { tareas: [['ver', { todas: true }]] })
    await W.cargarPermisos(Promise.resolve(fab))
    W.estado.unidadId = W.unidadGestionInicial(W.unidadesDeGestion(), null)
    W.pintarSelectorGestion()
    chk(`gestión, ${quien}: con una real y la del robot, el selector ${ve ? 'se ve' : 'se esconde'} y arranca en la real`,
      W.__doc.getElementById('pr-gestion-unidad-campo').hidden === !ve && W.estado.unidadId === 'u-cn')
  }
})())

// ── El cableado del arranque (no se puede ejecutar init: verificarSesion) ──
for (const [src, nombre] of [[FUENTE_P, 'planta'], [FUENTE_G, 'gestión']]) {
  chk(`${nombre}: importa el helper de utils.js`, /cargarFabricaDePruebas, sinUnidadesDePrueba, sinPersonasDePrueba, FABRICA_SIN_DATOS,\n    \} from '\.\.\/js\/utils\.js'/.test(src))
  chk(`${nombre}: el init la carga en paralelo y se la pasa a cargarPermisos`,
    /const pFabrica = cargarFabricaDePruebas\(supabase\)\s*\n\s*try \{\s*\n\s*await cargarPermisos\(pFabrica\)/.test(src))
  chk(`${nombre}: no filtra en la consulta (un .neq de es_prueba descartaría nulls y a la cuenta de prueba)`, !/es_prueba/.test(src.replace(/\/\/.*$/gm, '')))
}

fin()
