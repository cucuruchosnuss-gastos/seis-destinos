// Suite: la FÁBRICA DE PRUEBAS no ensucia Gastos.
//
// La unidad "Pruebas (robot)" (unidades_negocio.es_prueba) y sus personas las
// usa Playwright. No pueden aparecer en ninguna lista de UNIDADES ni de
// PERSONAS de Gastos para una cuenta real; una cuenta de prueba sí las ve, y si
// la fábrica no se pudo leer (FABRICA_SIN_DATOS) no se saca nada.
//
// Los filtros son los REALES de js/utils.js (se pega su código en el preludio)
// y las listas se EJECUTAN con un document falso: la grilla de destino y los
// filtros de la lista (vía activarFiltroFecha, el call site real), el selector
// de empleado del wizard y los dos formularios de edición.
//
// Las personas del robot de acá tienen tipo 'naaloo' / 'admin' A PROPÓSITO: en
// la base hoy tienen tipo='sistema' y caerían por esCuentaDeTablet, que es una
// casualidad. Esta suite exige el filtro de fábrica explícito.
//
//   node pruebas/test-gastos-fabrica-pruebas.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-fabrica-pruebas.js

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

// ── Código real de los filtros de js/utils.js (sin el `export`) ──────────
const UTILS = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
const iFab = UTILS.indexOf('export const FABRICA_SIN_DATOS')
const iFin = UTILS.indexOf('\n}\n', UTILS.indexOf('export function sinPersonasDePrueba'))
if (iFab < 0 || iFin < 0) throw new Error('no se encontraron los filtros de la fábrica en js/utils.js')
const FUENTE_FABRICA = UTILS.slice(iFab, iFin + 3).replace(/^export /gm, '')

const ROBOT = 'u-robot'
const UNIDADES = [
  { id: 'u-cn', nombre: 'Cucuruchos Nuss' },
  { id: 'u-dp', nombre: 'Dolce Pasta' },
  { id: ROBOT,  nombre: 'Pruebas (robot)' },
]
// r-enc y r-mas están en fabrica.personas (la carga inicial no trae
// unidad_negocio_id); r-ges solo se reconoce por su unidad.
const EMPLEADOS = [
  { id: 'e-ana',  nombre: 'Ana',             tipo: 'naaloo', unidad_negocio_id: 'u-cn' },
  { id: 'e-adm',  nombre: 'Admin Real',      tipo: 'admin',  unidad_negocio_id: 'u-dp' },
  { id: 'e-null', nombre: 'Sin unidad',      tipo: null },
  { id: 'r-enc',  nombre: 'Robot Encargado', tipo: 'naaloo' },
  { id: 'r-mas',  nombre: 'Robot Masero',    tipo: 'admin' },
  { id: 'r-ges',  nombre: 'Robot Gestion',   tipo: 'naaloo', unidad_negocio_id: ROBOT },
  { id: 't-cn',   nombre: 'Tablet CN',       tipo: 'sistema', unidad_negocio_id: 'u-cn' },
]
const ROBOTS = ['r-enc', 'r-mas', 'r-ges']
const REALES = ['e-ana', 'e-adm', 'e-null']

const PRELUDIO = FUENTE_FABRICA + `
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, style: {}, dataset: {},
             options: [], addEventListener(){}, removeAttribute(){}, setAttribute(){}, querySelectorAll(){ return [] } }
  }
  var __els = new Map()
  var __multiselects = {}
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector() { return nuevoEl('q') },
    querySelectorAll() { return [] },
  }
  var lucide = { createIcons() {} }
  var viaVehiculos = false, unidadSeleccionada = null
  var MEDIOS_PAGO_LABEL = { efectivo: 'Efectivo' }
  function crearMultiselect(o) { __multiselects[o.idBase] = o }
  function generarOpcionesPeriodo() { return [] }
  function etiquetaResponsive(a) { return a }
  function aplicarBusquedaLocal() {}
  function crearSelectorOrden() {}
  function actualizarSegmentedRango() {}
  function cargarLista() {}
  function fechaISO(d) { return d.toISOString().slice(0, 10) }
  function seleccionarDestino() {}
  function opcionesProyectoEdicion() { return [] }
  function exportarExcel() {}
  function mostrarDetalleGasto() {}
  function mostrarDetalleFactura() {}
  function cerrarProyectoNuevoWizard() {}
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'e-ana', misTareas: new Set(['gastos:ver_exportar']),
    fabrica: FABRICA_SIN_DATOS,
    filtros: { periodos: [], unidad_negocio_ids: [], categoria_ids: [], vehiculo_ids: [], medios_pago: [], busqueda: '' },
    maestros: { empleados: [], unidades: [], categorias: [], vehiculos: [], proyectos: [] },
    listaGastos: [], facturaDetalleActual: null,
  }
`
const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO,
  funciones: ['esc', 'tieneTarea', 'configEmpresa', 'esCuentaDeTablet', 'personasNoTablet', 'personasElegibles',
    'unidadesElegibles', 'unidadesParaEditar', 'personasParaEditar', 'poblarSelectEmpleados',
    'renderizarFiltros', 'activarFiltroFecha', 'renderizarGrillaDestino',
    'mostrarFormularioEdicionGasto', 'mostrarFormularioEdicionFactura'],
  retorno: 'estado, __els, __multiselects, FABRICA_SIN_DATOS',
})

const FAB_REAL   = { ok: true, unidades: new Set([ROBOT]), personas: new Set(['r-enc', 'r-mas']), soyDePrueba: false }
const FAB_PRUEBA = { ...FAB_REAL, soyDePrueba: true }

function preparar(fabrica) {
  S.estado.fabrica = fabrica
  S.estado.maestros.unidades = UNIDADES.map(u => ({ ...u }))
  S.estado.maestros.empleados = EMPLEADOS.map(e => ({ ...e }))
  S.estado.filtros = { periodos: [], unidad_negocio_ids: [], categoria_ids: [], vehiculo_ids: [], medios_pago: [], busqueda: '' }
  for (const k of Object.keys(S.__multiselects)) delete S.__multiselects[k]
  S.__els.clear()
}

// Ejecuta cada lista y devuelve lo que ofreció.
function listas() {
  const log = console.log
  console.log = () => {}   // el módulo loguea de más al editar
  try { return listasSinLog() } finally { console.log = log }
}
function listasSinLog() {
  const r = {}
  // Filtros de la lista, por su call site real.
  S.activarFiltroFecha('hoy')
  r.filtroUnidades = (S.__multiselects['ms-unidad']?.opciones ?? []).map(o => o.value)
  // Grilla de destino del wizard.
  S.renderizarGrillaDestino()
  r.grilla = S.__els.get('grilla-destino').innerHTML
  // Selector de empleado del wizard.
  S.poblarSelectEmpleados('u-cn')
  r.wizardEmpleados = S.__els.get('campo-empleado').innerHTML
  // Edición de un gasto real.
  S.estado.listaGastos = [{ id: 'g1', empleado_id: 'e-ana', empleados: { id: 'e-ana' }, unidades_negocio: { id: 'u-cn' } }]
  try { S.mostrarFormularioEdicionGasto('g1') } catch (_) { /* el HTML ya se escribió; lo que sigue son listeners */ }
  r.edicionGasto = S.__els.get('detalle-gasto-contenido').innerHTML
  // Edición de una factura real.
  S.estado.facturaDetalleActual = { id: 'f1', unidades_negocio: { id: 'u-dp' } }
  try { S.mostrarFormularioEdicionFactura('f1') } catch (_) { /* idem */ }
  r.edicionFactura = S.__els.get('detalle-factura-contenido').innerHTML
  return r
}

const tiene = (html, id) => html.includes(`value="${id}"`) || html.includes(`data-id="${id}"`)
const seccion = (html, idSelect) => {
  const i = html.indexOf(`<select id="${idSelect}"`)
  return i < 0 ? '' : html.slice(i, html.indexOf('</select>', i))
}

// ── Cuenta REAL ──────────────────────────────────────────────────────────
preparar(FAB_REAL)
let L = listas()
chk('real: el filtro de unidades de la lista se armó', L.filtroUnidades.length > 0, L.filtroUnidades.join(','))
chk('real: el filtro de unidades NO ofrece la unidad del robot', !L.filtroUnidades.includes(ROBOT), L.filtroUnidades.join(','))
chk('real: el filtro de unidades ofrece las reales', L.filtroUnidades.includes('u-cn') && L.filtroUnidades.includes('u-dp'))
chk('real: la grilla de destino NO tiene la unidad del robot', !tiene(L.grilla, ROBOT) && !L.grilla.includes('Pruebas (robot)'), L.grilla.slice(0, 200))
chk('real: la grilla de destino tiene las reales', tiene(L.grilla, 'u-cn') && tiene(L.grilla, 'u-dp'))
for (const id of ROBOTS) chk(`real: el selector del wizard NO ofrece ${id}`, !tiene(L.wizardEmpleados, id), L.wizardEmpleados)
for (const id of REALES) chk(`real: el selector del wizard ofrece ${id}`, tiene(L.wizardEmpleados, id))
const edUnidad = seccion(L.edicionGasto, 'edit-unidad'), edEmp = seccion(L.edicionGasto, 'edit-empleado')
chk('real: la edición del gasto se dibujó', edUnidad.length > 0 && edEmp.length > 0, L.edicionGasto.slice(0, 200))
chk('real: la edición del gasto NO ofrece la unidad del robot', !tiene(edUnidad, ROBOT), edUnidad)
chk('real: la edición del gasto ofrece las reales', tiene(edUnidad, 'u-cn') && tiene(edUnidad, 'u-dp'))
for (const id of ROBOTS) chk(`real: la edición del gasto NO ofrece a ${id}`, !tiene(edEmp, id), edEmp)
const edFac = seccion(L.edicionFactura, 'edit-factura-unidad')
chk('real: la edición de la factura se dibujó', edFac.length > 0, L.edicionFactura.slice(0, 200))
chk('real: la edición de la factura NO ofrece la unidad del robot', !tiene(edFac, ROBOT), edFac)
chk('real: la edición de la factura ofrece las reales', tiene(edFac, 'u-cn') && tiene(edFac, 'u-dp'))

chk('real: estado.maestros.unidades queda COMPLETO (resolución de nombres)', S.estado.maestros.unidades.length === UNIDADES.length)
chk('real: estado.maestros.empleados queda COMPLETO', S.estado.maestros.empleados.length === EMPLEADOS.length)

// Edición de un registro que YA es de la fábrica: conserva lo suyo, no ofrece lo demás.
chk('real: unidadesParaEditar conserva la unidad del robot si es la del registro',
  S.unidadesParaEditar(ROBOT).map(u => u.id).includes(ROBOT))
chk('real: unidadesParaEditar con una unidad real no suma la del robot',
  !S.unidadesParaEditar('u-cn').map(u => u.id).includes(ROBOT))
chk('real: unidadesParaEditar sin unidad no suma nada', S.unidadesParaEditar(null).length === 2)
const editRobot = S.personasParaEditar({ empleado_id: 'r-enc', empleados: { id: 'r-enc' } }).map(e => e.id)
chk('real: un gasto del robot no pierde su persona en la edición', editRobot.includes('r-enc'), editRobot.join(','))
chk('real: pero no se ofrecen las otras personas del robot', !editRobot.includes('r-mas') && !editRobot.includes('r-ges'))
chk('real: la persona del gasto no se duplica', S.personasParaEditar({ empleado_id: 'e-ana' }).filter(e => e.id === 'e-ana').length === 1)

// Si el filtro deja UNA sola unidad, la grilla se comporta como con una sola.
preparar(FAB_REAL)
S.estado.maestros.unidades = [{ id: 'u-cn', nombre: 'Cucuruchos Nuss' }, { id: ROBOT, nombre: 'Pruebas (robot)' }]
S.renderizarGrillaDestino()
const g1 = S.__els.get('grilla-destino').innerHTML
chk('real: con una sola unidad real, la grilla muestra solo esa', tiene(g1, 'u-cn') && !tiene(g1, ROBOT))

// ── Cuenta DE PRUEBA ─────────────────────────────────────────────────────
preparar(FAB_PRUEBA)
L = listas()
chk('prueba: el filtro de unidades ofrece la del robot', L.filtroUnidades.includes(ROBOT), L.filtroUnidades.join(','))
chk('prueba: la grilla de destino tiene la unidad del robot', tiene(L.grilla, ROBOT))
for (const id of ROBOTS) chk(`prueba: el selector del wizard ofrece ${id}`, tiene(L.wizardEmpleados, id))
chk('prueba: la edición del gasto ofrece la unidad del robot', tiene(seccion(L.edicionGasto, 'edit-unidad'), ROBOT))
for (const id of ROBOTS) chk(`prueba: la edición del gasto ofrece a ${id}`, tiene(seccion(L.edicionGasto, 'edit-empleado'), id))
chk('prueba: la edición de la factura ofrece la unidad del robot', tiene(seccion(L.edicionFactura, 'edit-factura-unidad'), ROBOT))

// ── FABRICA_SIN_DATOS: no se saca nada ───────────────────────────────────
preparar(S.FABRICA_SIN_DATOS)
L = listas()
chk('sin datos: el filtro de unidades ofrece las tres', ['u-cn', 'u-dp', ROBOT].every(u => L.filtroUnidades.includes(u)))
chk('sin datos: la grilla tiene las tres', ['u-cn', 'u-dp', ROBOT].every(u => tiene(L.grilla, u)))
for (const id of [...ROBOTS, ...REALES]) chk(`sin datos: el selector del wizard ofrece ${id}`, tiene(L.wizardEmpleados, id))
chk('sin datos: la tablet igual NO aparece (esa regla es otra)', !tiene(L.wizardEmpleados, 't-cn'))
chk('sin datos: la edición de la factura ofrece las tres', ['u-cn', 'u-dp', ROBOT].every(u => tiene(seccion(L.edicionFactura, 'edit-factura-unidad'), u)))

// ── Carga en el init (UNA vez, en paralelo, y nunca en SQL) ──────────────
const cargas = FUENTE.match(/cargarFabricaDePruebas\(supabase\)/g) || []
chk('la fábrica se carga UNA sola vez', cargas.length === 1, String(cargas.length))
const iCarga = FUENTE.indexOf('const promesaFabrica = cargarFabricaDePruebas(supabase)')
const iEmp   = FUENTE.indexOf(".from('empleados')\n      .select('id, rol_app')")
const iAwait = FUENTE.indexOf('estado.fabrica = await promesaFabrica')
const iHoy   = FUENTE.indexOf("    activarFiltroFecha('hoy')\n    cargarIngresosSinGasto()")
chk('se lanza sin await, antes de las consultas del arranque', iCarga > 0 && iEmp > 0 && iCarga < iEmp)
chk('se espera antes de dibujar la primera lista', iAwait > 0 && iHoy > 0 && iAwait < iHoy)
chk('el estado arranca en FABRICA_SIN_DATOS', /fabrica: FABRICA_SIN_DATOS,/.test(FUENTE))
chk('nunca se filtra la fábrica en SQL', !/\.neq\(\s*'es_prueba'/.test(FUENTE) && !/\.eq\(\s*'es_prueba',\s*false/.test(FUENTE))
chk('los filtros se importan de utils.js',
  /import \{[^}]*cargarFabricaDePruebas[^}]*sinUnidadesDePrueba[^}]*sinPersonasDePrueba[^}]*FABRICA_SIN_DATOS[^}]*\} from '\.\.\/js\/utils\.js'/.test(FUENTE))
chk('personasElegibles aplica el filtro de fábrica explícito (no solo el de tablet)',
  /sinPersonasDePrueba\(/.test(extraerFn(FUENTE, 'personasElegibles')))

fin()
