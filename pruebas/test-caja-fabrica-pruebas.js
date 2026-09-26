// La FÁBRICA DE PRUEBAS no ensucia Caja (26/09/2026).
//
// En la base hay una unidad de mentira ("Pruebas (robot)", es_prueba) con
// personas de mentira que usa Playwright. Para una cuenta REAL no pueden
// aparecer en ninguna lista de unidades ni de personas; para una cuenta de
// prueba (fabrica.soyDePrueba) sí; y si la fábrica no se pudo leer
// (FABRICA_SIN_DATOS) no se saca nada.
//
// Se EJECUTA el código real: las funciones de caja.html y los filtros de
// js/utils.js (sin los `export`, vía fuenteNumeros()). Las listas:
//   - estado.empleados (cargarPersonasConAcceso) → listado, Directorio,
//     filtros de Retiros y de Todos los movimientos, contraparte;
//   - agruparPersonas() → los grupos por UNIDAD del listado general;
//   - renderizarListaDirectorio(), poblarSelectorRetirosPersona(),
//     renderizarFiltrosTodosMovimientos() (personas y cuentas);
//   - poblarSelectorContraparte() en sus cuatro ramas;
//   - abrirModalCuentaNueva() → el selector de UNIDAD de una cuenta de Empresa.
//
// Las personas del robot van con tipo 'naaloo' / null A PROPÓSITO: hoy son
// tipo 'sistema' y caerían por esCuentaDeTablet(); esta suite prueba que las
// saca el filtro de la fábrica, no esa casualidad.
//
//   node pruebas/test-caja-fabrica-pruebas.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-fabrica-pruebas.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const SRC = leer(ARCHIVO) // informa el largo leído (lo usa el runner de mutaciones)
const { chk, esperas, fin } = arnes()

const FUNCIONES = [
  'esc', 'iniciales', 'tieneTarea', 'tieneTareaExplicita', 'esCuentaDeTablet',
  'cargarSuperAdmins', 'cargarPersonasConAcceso', 'asegurarEmpresaEnEmpleados',
  'poblarSelectorContraparte', 'agruparPersonas', 'renderizarListaDirectorio',
  'poblarSelectorRetirosPersona', 'renderizarFiltrosTodosMovimientos',
  'opcionesCuentaTodasPersonas', 'abrirModalCuentaNueva',
]

const U_ROBOT = 'u-robot', U_REAL = 'u-real', U_OTRA = 'u-otra'

const PRELUDIO = `
  ${fuenteNumeros()}
  var __errores = []
  function mostrarError(m) { __errores.push(m) }
  var __els = new Map()
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, checked: false,
      querySelectorAll: () => [], addEventListener() {}, closest: () => nuevoEl('x') }
  }
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [],
  }
  var __multiselects = {}
  function crearMultiselect(op) { __multiselects[op.idBase] = op.opciones }
  function generarOpcionesPeriodo() { return [] }
  var TIPO_MOVIMIENTO_OPCIONES = []
  function cargarTodosMovimientos() {}
  function exportarMovimientosExcel() {}
  function seleccionarMedioCuentaNueva() {}
  var __respuestas = {}
  function __consulta(tabla) {
    const reg = { tabla, select: null, filtros: [] }
    const q = {}
    q.select = (s) => { reg.select = s; return q }
    for (const k of ['eq', 'neq', 'in', 'is', 'not', 'or', 'order', 'gte', 'lte', 'limit', 'filter'])
      q[k] = (...a) => { reg.filtros.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: (__respuestas[reg.filtros.some(f => f[0] === 'eq' && f[1] === 'rol_app') ? 'super' : 'personas'] || []).map(x => ({ ...x })), error: null }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t) }
  var estado = {
    miEmpleado: { id: 'yo', nombre: 'Yo', rol_app: 'usuario' },
    idEmpresa: 'emp', misTareasCaja: new Set(), personaAbierta: null,
    empleados: [], superAdmins: [], nombresEmpleados: { emp: 'Empresa' },
    maestros: { unidadesNegocio: [] }, cuentasPorId: {},
    filtrosRetiros: { empleado_id: '' },
    filtrosTodosMovimientos: { periodos: [], tipos: [], cuenta_ids: [], empleado_ids: [] },
    fabrica: FABRICA_SIN_DATOS,
  }
`
const RETORNO = 'estado, __errores, __multiselects, FABRICA_SIN_DATOS, __set(r) { __respuestas = r }, __el(id) { return document.getElementById(id) }'

// Lo que devolvería v_empleados_publico.
const PERSONAS = [
  { id: 'yo', nombre: 'Yo', tipo: 'admin', rol_app: 'usuario', unidad_negocio_id: U_REAL },
  { id: 'p1', nombre: 'Persona Uno', tipo: 'naaloo', rol_app: 'usuario', unidad_negocio_id: U_REAL },
  { id: 'p2', nombre: 'Persona Dos', tipo: 'naaloo', rol_app: 'usuario', unidad_negocio_id: U_OTRA },
  { id: 'sa', nombre: 'Súper', tipo: 'admin', rol_app: 'super_admin', unidad_negocio_id: U_REAL },
  // El robot: en la fábrica por id Y por unidad…
  { id: 'r1', nombre: 'Robot Encargado', tipo: 'naaloo', rol_app: 'usuario', unidad_negocio_id: U_ROBOT },
  // …solo por unidad (no está en fabrica.personas)…
  { id: 'r2', nombre: 'Robot Masero', tipo: null, rol_app: 'usuario', unidad_negocio_id: U_ROBOT },
  // …solo por id (la fila no trae unidad).
  { id: 'r3', nombre: 'Robot · gestión', tipo: 'admin', rol_app: 'usuario', unidad_negocio_id: null },
]
// La lista de super admins NO trae unidad: el robot cae por id.
const SUPER = [
  { id: 'sa', nombre: 'Súper', tipo: 'admin', rol_app: 'super_admin' },
  { id: 'r1', nombre: 'Robot Encargado', tipo: 'naaloo', rol_app: 'super_admin' },
]
const UNIDADES = [
  { id: U_REAL, nombre: 'Cucuruchos Nuss' },
  { id: U_OTRA, nombre: 'Dolce Pasta' },
  { id: U_ROBOT, nombre: 'Pruebas (robot)' },
]
const ROBOTS = new Set(['r1', 'r2', 'r3'])
const REALES = ['p1', 'p2', 'sa']

const fabricaReal = () => ({ ok: true, unidades: new Set([U_ROBOT]), personas: new Set(['r1', 'r3']), soyDePrueba: false })
const fabricaPrueba = () => ({ ...fabricaReal(), soyDePrueba: true })

// modo: 'real' | 'prueba' | 'sin'
function nuevoSandbox(modo) {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, retorno: RETORNO })
  S.__set({ personas: PERSONAS, super: SUPER })
  S.estado.maestros.unidadesNegocio = UNIDADES.map(u => ({ ...u }))
  S.estado.fabrica = modo === 'real' ? fabricaReal() : modo === 'prueba' ? fabricaPrueba() : S.FABRICA_SIN_DATOS
  for (const p of PERSONAS) S.estado.nombresEmpleados[p.id] = p.nombre
  for (const p of PERSONAS) S.estado.cuentasPorId['c-' + p.id] = { id: 'c-' + p.id, empleado_id: p.id, nombre: 'Efectivo', activa: true }
  return S
}

const opcionesDe = (html) => [...(html || '').matchAll(/<option value="([^"]*)"/g)].map(m => m[1]).filter(Boolean)
const dataIds = (html) => [...(html || '').matchAll(/data-id="([^"]*)"/g)].map(m => m[1])
const hayRobot = (ids) => ids.some(id => ROBOTS.has(id))
const todosRobots = (ids) => [...ROBOTS].every(id => ids.includes(id))

// Para cada modo, qué se espera: real saca a los tres robots; prueba y sin
// datos no sacan nada.
function esperar(nombre, modo, ids) {
  if (modo === 'real') chk(`[real] ${nombre}: sin el robot`, !hayRobot(ids), ids.join())
  else chk(`[${modo}] ${nombre}: el robot SÍ aparece`, todosRobots(ids), ids.join())
  chk(`[${modo}] ${nombre}: las personas reales siguen`, REALES.every(id => ids.includes(id)), ids.join())
}

async function casos() {
  for (const modo of ['real', 'prueba', 'sin']) {
    // ── estado.empleados ───────────────────────────────────────────────
    {
      const S = nuevoSandbox(modo)
      await S.cargarPersonasConAcceso()
      esperar('estado.empleados', modo, S.estado.empleados.map(e => e.id))
    }

    // ── Listado general: grupos por unidad ─────────────────────────────
    {
      const S = nuevoSandbox(modo)
      await S.cargarPersonasConAcceso()
      const grupos = S.agruparPersonas()
      esperar('listado general', modo, grupos.flatMap(g => g.lista.map(e => e.id)))
      // La unidad del robot como grupo: se mira con una persona (no robot)
      // metida a mano en esa unidad, para que el grupo tenga con qué aparecer.
      const S2 = nuevoSandbox(modo)
      S2.estado.empleados = [{ id: 'x', nombre: 'Alguien', unidad_negocio_id: U_ROBOT }, { id: 'y', nombre: 'Otro', unidad_negocio_id: U_REAL }]
      const g2 = S2.agruparPersonas()
      const ids = g2.map(g => g.id)
      if (modo === 'real') chk('[real] listado: la unidad del robot no es un grupo', !ids.includes(U_ROBOT), ids.join())
      else chk(`[${modo}] listado: la unidad del robot SÍ es un grupo`, ids.includes(U_ROBOT), ids.join())
      chk(`[${modo}] listado: la unidad real sigue`, ids.includes(U_REAL), ids.join())
    }

    // ── Directorio ─────────────────────────────────────────────────────
    {
      const S = nuevoSandbox(modo)
      await S.renderizarListaDirectorio()
      esperar('Directorio', modo, dataIds(S.__el('directorio-contenido').innerHTML))
    }

    // ── Filtro de Retiros ──────────────────────────────────────────────
    {
      const S = nuevoSandbox(modo)
      await S.cargarPersonasConAcceso()
      S.poblarSelectorRetirosPersona()
      esperar('filtro de Retiros', modo, opcionesDe(S.__el('filtro-retiros-persona').innerHTML))
    }

    // ── Filtros de Todos los movimientos (personas y cuentas) ──────────
    {
      const S = nuevoSandbox(modo)
      await S.cargarPersonasConAcceso()
      S.renderizarFiltrosTodosMovimientos()
      esperar('filtro de personas de Todos los movimientos', modo, (S.__multiselects['ms-tm-persona'] || []).map(o => o.value))
      const cuentas = (S.__multiselects['ms-tm-cuenta'] || []).map(o => o.value.replace(/^c-/, ''))
      esperar('filtro de cuentas de Todos los movimientos', modo, cuentas)
    }

    // ── Contraparte, en sus cuatro ramas ───────────────────────────────
    const ramas = [
      ['usuario común (super admins)', () => {}, 'yo', ['sa'], ['r1']],
      ['super_admin', (S) => { S.estado.miEmpleado.rol_app = 'super_admin' }, 'yo', REALES, [...ROBOTS]],
      ['transferir_entre_personas', (S) => { S.estado.misTareasCaja = new Set(['transferir_entre_personas']) }, 'yo', REALES, [...ROBOTS]],
      ['desde Empresa', () => {}, 'emp', REALES, [...ROBOTS]],
    ]
    for (const [nombre, preparar, propio, reales, robots] of ramas) {
      const S = nuevoSandbox(modo)
      preparar(S)
      await S.cargarSuperAdmins()
      await S.poblarSelectorContraparte(propio)
      const ops = opcionesDe(S.__el('contraparte-select').innerHTML)
      if (modo === 'real') chk(`[real] contraparte ${nombre}: sin el robot`, !robots.some(id => ops.includes(id)), ops.join())
      else chk(`[${modo}] contraparte ${nombre}: el robot SÍ aparece`, robots.every(id => ops.includes(id)), ops.join())
      chk(`[${modo}] contraparte ${nombre}: las reales siguen`, reales.every(id => ops.includes(id)), ops.join())
    }
    // La red del selector: aunque estado.empleados llegara sin filtrar.
    if (modo === 'real') {
      const S = nuevoSandbox(modo)
      S.estado.miEmpleado.rol_app = 'super_admin'
      S.estado.empleados = PERSONAS.map(x => ({ ...x })).concat([{ id: 'emp', nombre: 'Empresa' }])
      await S.poblarSelectorContraparte('yo')
      const ops = opcionesDe(S.__el('contraparte-select').innerHTML)
      chk('[real] contraparte con la lista sin filtrar: tampoco el robot', !hayRobot(ops), ops.join())
    }

    // ── Selector de unidad de una cuenta nueva de Empresa ──────────────
    {
      const S = nuevoSandbox(modo)
      S.estado.personaAbierta = 'emp'
      S.abrirModalCuentaNueva()
      const ops = opcionesDe(S.__el('cuenta-unidad-negocio').innerHTML)
      if (modo === 'real') chk('[real] unidad de cuenta nueva: sin la del robot', !ops.includes(U_ROBOT), ops.join())
      else chk(`[${modo}] unidad de cuenta nueva: la del robot SÍ aparece`, ops.includes(U_ROBOT), ops.join())
      chk(`[${modo}] unidad de cuenta nueva: las reales siguen`, [U_REAL, U_OTRA].every(u => ops.includes(u)), ops.join())
    }
    // Y la búsqueda de un nombre por id NO se filtra (el maestro queda entero).
    {
      const S = nuevoSandbox(modo)
      S.estado.personaAbierta = 'emp'
      S.abrirModalCuentaNueva()
      chk(`[${modo}] el maestro de unidades queda completo`, S.estado.maestros.unidadesNegocio.some(u => u.id === U_ROBOT))
    }
  }

  // ── El init carga la fábrica y la espera antes de armar las listas ─────
  {
    const init = extraerFn(SRC, 'init')
    chk('init llama a cargarFabricaDePruebas(supabase)', /cargarFabricaDePruebas\(supabase\)/.test(init))
    chk('init guarda la fábrica en el estado', /estado\.fabrica = f/.test(init))
    const pa = init.match(/await Promise\.all\(\[([^\]]*)\]\)/)
    chk('el Promise.all del init espera la fábrica', !!pa && /promesaFabrica/.test(pa[1]), pa && pa[1])
    chk('la fábrica arranca ANTES de la consulta del empleado propio',
      init.indexOf('cargarFabricaDePruebas') !== -1 && init.indexOf("from('empleados')") !== -1 &&
      init.indexOf('cargarFabricaDePruebas') < init.indexOf("from('empleados')"))
    chk('el estado arranca con FABRICA_SIN_DATOS', /fabrica:\s*FABRICA_SIN_DATOS/.test(SRC))
    chk('no se filtra en la consulta (.neq de es_prueba)', !/\.neq\('es_prueba'/.test(SRC))
  }
}

esperas.push(casos())
fin()
