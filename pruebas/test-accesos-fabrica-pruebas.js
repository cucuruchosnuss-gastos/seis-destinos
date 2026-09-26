// La fábrica de pruebas (unidad "Pruebas (robot)" y sus personas, las que usa
// Playwright) NO aparece en modulos/accesos.html para una cuenta real:
//  - "Usuarios y roles": ni las personas ni la tablet del robot;
//  - las cifras (usuarios activos, super admins) no las cuentan;
//  - el selector de unidad al aprobar a alguien nuevo no ofrece la unidad;
//  - el alcance por unidad de las tareas conAlcance no la ofrece, y un
//    alcance ya guardado que la incluya NO la pierde al guardar;
//  - init carga la fábrica ANTES de dibujar y en paralelo con los módulos;
//  - la consulta de empleados trae unidad_negocio_id (y sigue nombrando la FK).
// Con una cuenta de prueba (soyDePrueba) SÍ aparece todo, y con
// FABRICA_SIN_DATOS (la carga falló) no se saca nada.
//
// Todo se EJECUTA sobre las funciones reales del archivo y las reales de
// js/utils.js.
//
//   node pruebas/test-accesos-fabrica-pruebas.js
//   ARCHIVO_TEST=otra.html node pruebas/test-accesos-fabrica-pruebas.js

'use strict'
const path = require('path')
const { pathToFileURL } = require('url')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/accesos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const U_ROBOT = 'u-robot', U_REAL = 'u-cn', U_REAL2 = 'u-dp'
const P_ROBOT = 'p-robot', P_ROBOT_TAB = 'p-robot-tab', P_ROBOT_SIN_UNIDAD = 'p-robot-2', P_REAL = 'p-real', P_ADMIN = 'p-admin'

const FNS = ['esc', 'soloDigitos', 'iniciales', 'colorAvatar', 'formatearCuil', 'esDispositivo',
  'empleadosConAcceso', 'unidadesElegibles', 'modulosDeEmpleado', 'renderizarStats', 'renderizarUsuarios',
  'htmlTarjetaUsuario', 'alcanceDe', 'renderizarModalTareas', 'renderizarSelectorUnidad', 'armarTareasPayload',
  'fallasDeCarga', 'textoFallasDeCarga', 'cargarTodo', 'init']
let codigo = ''
for (const n of FNS) {
  try { codigo += extraerFn(FUENTE, n) + '\n' } catch (e) { chk(`existe la función ${n}`, false, e.message) }
}

function fabricaReal(U) {
  return { ok: true, unidades: new Set([U_ROBOT]), personas: new Set([P_ROBOT, P_ROBOT_TAB, P_ROBOT_SIN_UNIDAD]), soyDePrueba: false }
}
function fabricaDePrueba() {
  return { ok: true, unidades: new Set([U_ROBOT]), personas: new Set([P_ROBOT, P_ROBOT_TAB, P_ROBOT_SIN_UNIDAD]), soyDePrueba: true }
}

function baseEstado(fabrica) {
  return {
    sesion: { user: { id: 'uid' } },
    solicitudes: [],
    miEmpleado: { id: 'yo' },
    filtrosUsuarios: { texto: '', rol: '', modulo: '' },
    empleadoModulos: [],
    fabrica,
    maestros: { unidadesNegocio: [
      { id: U_REAL, nombre: 'Cucuruchos Nuss' },
      { id: U_ROBOT, nombre: 'Pruebas (robot)' },
      { id: U_REAL2, nombre: 'Dolce Pasta' },
    ] },
    empleados: [
      { id: P_REAL, nombre: 'Zoe Real', cuil: '20123456789', auth_user_id: 'a1', rol_app: 'usuario', es_dispositivo: false, unidad_negocio_id: U_REAL },
      { id: P_ADMIN, nombre: 'Ana Admin', cuil: '27123456789', auth_user_id: 'a2', rol_app: 'super_admin', es_dispositivo: false, unidad_negocio_id: U_REAL },
      { id: P_ROBOT, nombre: 'Robot Encargado', cuil: null, auth_user_id: 'ar1', rol_app: 'super_admin', es_dispositivo: false, unidad_negocio_id: U_ROBOT },
      { id: P_ROBOT_TAB, nombre: 'Robot · tablet de planta', cuil: null, auth_user_id: 'ar2', rol_app: 'usuario', es_dispositivo: true, unidad_negocio_id: U_ROBOT, unidades_negocio: { nombre: 'Pruebas (robot)' } },
      // Por si la fila no trae la unidad: se reconoce igual por el id.
      { id: P_ROBOT_SIN_UNIDAD, nombre: 'Robot Masero', cuil: null, auth_user_id: 'ar3', rol_app: 'usuario', es_dispositivo: false },
    ],
    modal: null,
  }
}

function armar(U, estado, extras = {}) {
  const dom = {}
  const el = (id) => (dom[id] ||= { id, innerHTML: '', hidden: true, value: '', textContent: '', disabled: false,
    classList: { add() {}, remove() {} }, style: {},
    querySelectorAll: () => [] })
  const document = { getElementById: el }
  const f = new Function('estado', 'document', 'U', 'extras', `
    const { cargarFabricaDePruebas: _cargar, sinUnidadesDePrueba, sinPersonasDePrueba, FABRICA_SIN_DATOS } = U
    const cargarFabricaDePruebas = extras.cargarFabricaDePruebas || _cargar
    const supabase = extras.supabase || {}
    const verificarSesion = extras.verificarSesion || (async () => null)
    const construirListasModulos = () => {}
    const mostrarError = (m) => { extras.errores && extras.errores.push(m) }
    const lucide = { createIcons() {} }
    let MODULOS_INFO = []
    const PALETA_AVATAR = ['#111']
    const CATALOGO_TAREAS = [{ grupo: 'Stock', modulos: ['stock'], tareas: [
      { modulo: 'stock', tarea: 'ver', label: 'Ver stock', conAlcance: true },
    ] }]
    function grupoEsVisible() { return true }
    function labelDeTarea(c) { return c }
    function avisoModuloDeRequerida() { return '' }
    function tareaDeCatalogo(clave) { return CATALOGO_TAREAS[0].tareas.find(t => t.modulo + ':' + t.tarea === clave) || null }
    function abrirModalEditar() {}
    function confirmarQuitarMfa() {}
    function renderizarSolicitudes() {}
    ${codigo}
    const falta = (n) => () => { throw new Error('no existe ' + n) }
    return {
      renderizarStats, renderizarUsuarios, renderizarModalTareas, renderizarSelectorUnidad,
      armarTareasPayload, cargarTodo, init,
      empleadosConAcceso: typeof empleadosConAcceso === 'function' ? empleadosConAcceso : falta('empleadosConAcceso'),
      unidadesElegibles: typeof unidadesElegibles === 'function' ? unidadesElegibles : falta('unidadesElegibles'),
      getRenderizadoCon: () => extras.fabricaAlDibujar,
    }
  `)
  return { api: f(estado, document, U, extras), dom }
}

function bloque(n, fn) { try { fn() } catch (e) { chk(`${n}: sin excepción`, false, String(e && e.message || e)) } }
async function bloqueA(n, fn) { try { await fn() } catch (e) { chk(`${n}: sin excepción`, false, String(e && e.message || e)) } }

function modalCon(unidades) {
  return {
    modo: 'editar', esNuevoEmpleado: true, unidadElegida: null,
    modulosElegidos: new Set(['stock']),
    tareasElegidas: new Set(['stock:ver']),
    alcances: new Map([['stock:ver', { todas: false, unidades: new Set(unidades) }]]),
    tareasRecordadas: new Map(), ayudaAbierta: null,
  }
}

;(async () => {
  const U = await import(pathToFileURL(path.join(RAIZ, 'js/utils.js')).href)
  const origWarn = console.warn; console.warn = () => {}

  const casos = [
    ['real', fabricaReal(U), false],
    ['de prueba', fabricaDePrueba(), true],
    ['sin datos', U.FABRICA_SIN_DATOS, true],
  ]

  for (const [nom, fab, veRobot] of casos) {
    // Usuarios y roles
    bloque(`${nom} usuarios`, () => {
      const { api, dom } = armar(U, baseEstado(fab))
      api.renderizarUsuarios()
      const h = dom['lista-usuarios'].innerHTML
      chk(`${nom}: la persona real está en Usuarios y roles`, h.includes(`data-id="${P_REAL}"`) && h.includes(`data-id="${P_ADMIN}"`))
      for (const id of [P_ROBOT, P_ROBOT_TAB, P_ROBOT_SIN_UNIDAD]) {
        chk(`${nom}: ${id} ${veRobot ? 'SÍ' : 'NO'} aparece en Usuarios y roles`, h.includes(`data-id="${id}"`) === veRobot)
      }
      chk(`${nom}: el grupo de tablets ${veRobot ? 'aparece' : 'no aparece'} (su única tablet es del robot)`,
        h.includes('Tablets de la fábrica') === veRobot)
    })
    // Filtro por texto: buscar "robot" no lo encuentra en una cuenta real.
    bloque(`${nom} buscar`, () => {
      const e = baseEstado(fab); e.filtrosUsuarios.texto = 'robot'
      const { api, dom } = armar(U, e)
      api.renderizarUsuarios()
      const h = dom['lista-usuarios'].innerHTML
      chk(`${nom}: buscar "robot" ${veRobot ? 'encuentra' : 'no encuentra'} al robot`, h.includes(`data-id="${P_ROBOT}"`) === veRobot)
      chk(`${nom}: buscar "robot" deja el vacío ${veRobot ? 'oculto' : 'visible'}`, dom['estado-vacio-usuarios'].hidden === veRobot)
    })
    // Cifras
    bloque(`${nom} cifras`, () => {
      const { api, dom } = armar(U, baseEstado(fab))
      api.renderizarStats()
      const h = dom['accesos-stats'].innerHTML
      const activos = (h.match(/Usuarios activos<\/div>\s*<div class="stat-card__valor">(\d+)</) || [])[1]
      const supers = (h.match(/stat-card--secundario">\s*<div class="stat-card__label">Super admins<\/div>\s*<div class="stat-card__valor">(\d+)</) || [])[1]
      // Reales: Zoe + Ana = 2 activos, 1 super. Con los robots (no tablet): +2 activos, +1 super.
      chk(`${nom}: usuarios activos = ${veRobot ? 4 : 2}`, activos === String(veRobot ? 4 : 2), activos)
      chk(`${nom}: super admins = ${veRobot ? 2 : 1}`, supers === String(veRobot ? 2 : 1), supers)
    })
    // Selector de unidad al aprobar a alguien nuevo
    bloque(`${nom} selector de unidad`, () => {
      const e = baseEstado(fab); e.modal = modalCon([])
      const { api, dom } = armar(U, e)
      api.renderizarSelectorUnidad()
      const h = dom['modal-select-unidad'].innerHTML
      chk(`${nom}: el selector ofrece las unidades reales`, h.includes(`value="${U_REAL}"`) && h.includes(`value="${U_REAL2}"`))
      chk(`${nom}: el selector ${veRobot ? 'SÍ' : 'NO'} ofrece la unidad del robot`, h.includes(`value="${U_ROBOT}"`) === veRobot)
      chk(`${nom}: el selector ${veRobot ? 'SÍ' : 'NO'} nombra "Pruebas (robot)"`, h.includes('Pruebas (robot)') === veRobot)
    })
    // Alcance por unidad
    bloque(`${nom} alcance`, () => {
      const e = baseEstado(fab); e.modal = modalCon([U_REAL])
      const { api, dom } = armar(U, e)
      api.renderizarModalTareas()
      const h = dom['modal-tareas'].innerHTML
      chk(`${nom}: el alcance ofrece las unidades reales`, h.includes(`data-alcance-unidad="${U_REAL}"`) && h.includes(`data-alcance-unidad="${U_REAL2}"`))
      chk(`${nom}: el alcance ${veRobot ? 'SÍ' : 'NO'} ofrece la unidad del robot`, h.includes(`data-alcance-unidad="${U_ROBOT}"`) === veRobot)
    })
  }

  // Un alcance ya guardado con la unidad del robot NO la pierde al guardar
  // (con una cuenta real, que no ve su casilla).
  bloque('passthrough del alcance', () => {
    const e = baseEstado(fabricaReal(U)); e.modal = modalCon([U_REAL, U_ROBOT])
    const { api } = armar(U, e)
    api.renderizarModalTareas()
    const p = api.armarTareasPayload()
    const fila = p.find(x => x.modulo === 'stock' && x.tarea === 'ver')
    chk('el payload conserva la unidad del robot aunque no se dibuje', !!fila && fila.alcance && fila.alcance.unidades.includes(U_ROBOT) && fila.alcance.unidades.includes(U_REAL), JSON.stringify(fila))
  })

  // cargarTodo: la consulta trae unidad_negocio_id y sigue nombrando la FK.
  await bloqueA('cargarTodo', async () => {
    const selects = {}
    const q = (tabla) => {
      const r = { select(s) { selects[tabla] = s; return r }, eq() { return r }, order() { return r },
        then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej) } }
      return r
    }
    const e = baseEstado(fabricaReal(U))
    const { api } = armar(U, e, { supabase: { from: q } })
    await api.cargarTodo()
    const s = selects.empleados || ''
    chk('la consulta de empleados trae unidad_negocio_id', /\bunidad_negocio_id\b/.test(s), s)
    chk('el embed de unidades_negocio sigue nombrando la FK', /unidades_negocio!empleados_unidad_negocio_id_fkey/.test(s), s)
  })

  // init: carga la fábrica, la guarda en el estado, y recién ahí dibuja; y la
  // pide en paralelo (antes de esperar los módulos).
  await bloqueA('init', async () => {
    const orden = []
    const fabricaCargada = fabricaReal(U)
    let resolverModulos
    const q = (tabla) => {
      orden.push('from:' + tabla)
      let una = false
      const r = { select() { return r }, eq() { return r }, order() { return r }, maybeSingle() { una = true; return r },
        then(res, rej) {
          if (tabla === 'empleados' && una) return Promise.resolve({ data: { id: 'yo', rol_app: 'super_admin' }, error: null }).then(res, rej)
          if (tabla === 'modulos') return new Promise(ok => { resolverModulos = () => ok({ data: [], error: null }) }).then(res, rej)
          return Promise.resolve({ data: [], error: null }).then(res, rej)
        } }
      return r
    }
    const e = baseEstado(U.FABRICA_SIN_DATOS)
    let fabricaAlDibujar = 'no dibujó'
    const extras = {
      supabase: { from: q },
      verificarSesion: async () => ({ user: { id: 'uid' } }),
      cargarFabricaDePruebas: async () => { orden.push('fabrica'); return fabricaCargada },
    }
    // Se mira qué fábrica tiene el estado en el momento en que cargarTodo
    // empieza a pedir los datos que después dibuja.
    const qOrig = extras.supabase.from
    extras.supabase.from = (t) => { if (t === 'solicitudes_acceso') fabricaAlDibujar = e.fabrica; return qOrig(t) }
    const { api } = armar(U, e, extras)
    const p = api.init()
    await new Promise(r => setTimeout(r, 0))
    chk('init pide la fábrica sin esperar a que lleguen los módulos', orden.includes('fabrica') && typeof resolverModulos === 'function', orden.join(','))
    resolverModulos && resolverModulos()
    await p
    chk('init guarda la fábrica en el estado', e.fabrica === fabricaCargada)
    chk('init dibuja con la fábrica ya cargada', fabricaAlDibujar === fabricaCargada, String(fabricaAlDibujar))
  })

  console.warn = origWarn
  fin()
})()
