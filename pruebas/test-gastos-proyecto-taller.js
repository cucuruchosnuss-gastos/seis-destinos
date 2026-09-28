// Suite: el PROYECTO en un gasto del Taller (28/09/2026).
//
// La gestión de proyectos ("Proyectos del Taller" y el "+ Proyecto nuevo" del
// wizard) se MUDÓ a modulos/taller.html. En Gastos solo se ELIGE, y en un
// gasto del Taller es OBLIGATORIO: un proyecto abierto o "Gasto general del
// taller", que guarda proyecto_id null (de 26 gastos del Taller solo 1 tenía
// proyecto: que no vuelvan a quedar sueltos).
//
// Se EJECUTA el código real del módulo con un document falso:
//  - el select del wizard (general + los abiertos, sin entregados/cancelados),
//  - la validación del paso Detalles (Taller sí, otra unidad no; el error va
//    PEGADO al campo y el botón no se deshabilita),
//  - lo que se guarda (armarGasto / armarFacturaPendiente: general → null),
//  - "Actualizar la lista" (relee sin perder lo elegido, pide solo las
//    columnas permitidas),
//  - la EDICIÓN (conserva un proyecto cerrado; sin proyecto abre en "Gasto
//    general del taller"; guardar lo manda como null),
//  - el detalle y el Excel ("Gasto general del taller" en vez de vacío),
//  - y que la pantalla y el botón viejos NO estén.
//
//   node pruebas/test-gastos-proyecto-taller.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-proyecto-taller.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)
const { chk, esperas, fin } = arnes()

const TALLER = 'u-t', NUSS = 'u-n'
const PROYECTOS_BASE = [
  { id: 'p-cur', nombre: 'Máquina barquillo', activo: true,  estado: 'en_curso' },
  { id: 'p-pre', nombre: 'Automatización',     activo: true,  estado: 'presupuestado' },
  { id: 'p-ent', nombre: 'Horno entregado',    activo: true,  estado: 'entregado' },
  { id: 'p-can', nombre: 'Proyecto cancelado', activo: true,  estado: 'cancelado' },
  { id: 'p-baj', nombre: 'Dado de baja',       activo: false, estado: 'en_curso' },
]

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, style: {}, dataset: {},
      __on: {}, addEventListener(t, f) { el.__on[t] = f }, removeAttribute(){}, setAttribute(){}, focus(){ __foco.push(id) },
      querySelectorAll: () => [], options: { length: 0 },
      classList: { __c: new Set(), add(c){ this.__c.add(c) }, remove(c){ this.__c.delete(c) }, toggle(c, v){ v ? this.__c.add(c) : this.__c.delete(c) }, contains(c){ return this.__c.has(c) } },
    }
    return el
  }
  var __foco = []
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelector(s) { return s.startsWith('#') ? document.getElementById(s.slice(1)) : nuevoEl(s) },
    querySelectorAll: () => [],
  }
  var lucide = { createIcons(){} }
  var __errores = [], __exitos = [], __consultas = [], __updates = [], __rpcs = []
  var __proyectosDeLaBase = []
  var __falla = null
  function mostrarError(m) { __errores.push(m) }
  function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return ''; const [a, m, d] = f.split('-'); return d + '/' + m + '/' + a }
  var supabase = {
    from(tabla) {
      const q = { __tabla: tabla, __llamadas: [] }
      for (const k of ['eq', 'neq', 'in', 'order', 'is', 'not']) q[k] = (...a) => { q.__llamadas.push([k, ...a]); return q }
      q.select = (cols) => { __consultas.push({ tabla, cols }); return q }
      q.update = (c) => { __updates.push({ tabla, cambios: JSON.parse(JSON.stringify(c)) }); return { eq: async () => ({ error: null }) } }
      q.then = (res, rej) => Promise.resolve(__falla ? { data: null, error: __falla } : { data: __proyectosDeLaBase, error: null }).then(res, rej)
      return q
    },
    rpc: async (n, p) => { __rpcs.push([n, p]); return { data: null, error: null } },
  }
  // Lo que el formulario de edición llama y no hace al proyecto.
  function poblarSelectMoneda(id, v) { document.getElementById(id).value = v }
  function actualizarSelectorCuentaEdicion() {} function detectarDuplicadoEdicion() {}
  function abrirDuplicadoEnPestana() {} function mostrarDetalleGasto() {} function cerrarDetalleGasto() {}
  function cargarLista() {}
  var MEDIOS_PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia / QR', cheque: 'Cheque' }
  // Selecciones del wizard (let del módulo).
  var categoriaSeleccionada = 'cat-1', tipDocSeleccionado = null, medioPagoSeleccionado = 'cheque'
  var unidadSeleccionada = null, vehiculoSeleccionado = null, viaVehiculos = false, proveedorSeleccionado = null
  var estado = {
    miRolApp: 'super_admin', miEmpleadoId: 'e1', misTareas: new Set(),
    fabrica: FABRICA_SIN_DATOS,
    wizard: { fotoUrl: null, esPendiente: false },
    listaGastos: [],
    maestros: {
      unidades: [{ id: '${NUSS}', nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: '${TALLER}', nombre: 'Taller', prefijo: 'T' }],
      empleados: [{ id: 'e1', nombre: 'Ana', tipo: 'naaloo' }], vehiculos: [], categorias: [{ id: 'cat-1', nombre: 'Repuestos' }],
      proyectos: [],
    },
  }
`
const FUNCIONES = [
  'esc', 'tieneTarea', 'esUnidadTaller', 'proyectosAbiertos', 'ordenarProyectos', 'valorAProyectoId',
  'poblarSelectProyecto', 'proyectoIdDeWizard', 'proyectoParaResumen', 'etiquetaProyectoGasto', 'unidadDeGasto',
  'mostrarErrorProyecto', 'actualizarGrupoProyecto', 'recargarProyectosWizard',
  'opcionesProyectoEdicion', 'htmlSelectProyectoEdicion', 'validarSubpaso', 'armarGasto', 'armarFacturaPendiente',
  'importeDelWizard', 'kilometrajeDelWizard', 'fechaAPeriodo', 'formatearImporte',
  'mostrarFormularioEdicionGasto', 'esCuentaDeTablet', 'personasNoTablet', 'personasElegibles', 'personasParaEditar',
  'unidadesElegibles', 'unidadesParaEditar',
]
const CONSTANTES = ['COLUMNAS_PROYECTO', 'ESTADOS_PROYECTO_CERRADOS', 'VALOR_GASTO_GENERAL', 'TEXTO_GASTO_GENERAL']
const RETORNO = `estado, __els, __el(id){ return document.getElementById(id) }, __errores, __exitos, __consultas, __updates, __foco,
  __set(k, v){ eval(k + ' = v') }, __base(l){ __proyectosDeLaBase = l }, __fallar(e){ __falla = e }`

function sandbox() {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES, retorno: RETORNO })
  S.estado.maestros.proyectos = S.ordenarProyectos(S.proyectosAbiertos(PROYECTOS_BASE))
  return S
}
const el = (S, id) => S.__el(id)

// ── 1. Qué proyectos se ofrecen ─────────────────────────────────────────────
{
  const S = sandbox()
  const ids = S.estado.maestros.proyectos.map(p => p.id)
  chk('abiertos: entran los activos en curso y presupuestados', ids.includes('p-cur') && ids.includes('p-pre'), ids.join(','))
  chk('abiertos: NO entran los entregados', !ids.includes('p-ent'))
  chk('abiertos: NO entran los cancelados', !ids.includes('p-can'))
  chk('abiertos: NO entran los dados de baja', !ids.includes('p-baj'))
  chk('abiertos: ordenados por nombre', ids.join(',') === 'p-pre,p-cur', ids.join(','))
  chk('abiertos: una lista null no rompe', S.proyectosAbiertos(null).length === 0)

  S.poblarSelectProyecto()
  const h = el(S, 'campo-proyecto').innerHTML
  chk('select: arranca en "Elegí el proyecto" (vacío, no pasa la validación)', /<option value="">— Elegí el proyecto —<\/option>/.test(h) && el(S, 'campo-proyecto').value === '')
  chk('select: ofrece "Gasto general del taller"', h.includes(`value="${S.VALOR_GASTO_GENERAL ?? '__general__'}"`) || h.includes('value="__general__">Gasto general del taller'))
  chk('select: ofrece los abiertos', h.includes('value="p-cur"') && h.includes('value="p-pre"'))
  chk('select: no ofrece entregados, cancelados ni dados de baja', !h.includes('p-ent') && !h.includes('p-can') && !h.includes('p-baj'))
  S.poblarSelectProyecto('p-cur')
  chk('select: conserva lo elegido si sigue', el(S, 'campo-proyecto').value === 'p-cur')
  S.poblarSelectProyecto('p-ent')
  chk('select: un proyecto que ya no está abierto no queda elegido', el(S, 'campo-proyecto').value === '')
  S.poblarSelectProyecto('__general__')
  chk('select: conserva "Gasto general"', el(S, 'campo-proyecto').value === '__general__')
}

// ── 2. Taller: grupo visible y validación obligatoria ───────────────────────
{
  const S = sandbox()
  S.actualizarGrupoProyecto(TALLER)
  chk('Taller: el grupo del proyecto se ve', el(S, 'grupo-proyecto').style.display === 'block')
  S.actualizarGrupoProyecto(NUSS)
  chk('otra unidad: el grupo del proyecto no se ve', el(S, 'grupo-proyecto').style.display === 'none')
  S.actualizarGrupoProyecto(null)
  chk('sin unidad (vehículos): el grupo del proyecto no se ve', el(S, 'grupo-proyecto').style.display === 'none')

  // Detalles del Taller sin elegir nada: no pasa, error pegado, sin toast.
  S.__set('unidadSeleccionada', TALLER)
  el(S, 'campo-empleado').value = 'e1'
  S.poblarSelectProyecto()
  const antes = S.__errores.length
  chk('Taller sin proyecto: NO pasa del paso Detalles', S.validarSubpaso('detalles') === false)
  chk('Taller sin proyecto: el error va PEGADO al campo', el(S, 'proyecto-error').hidden === false && /Elegí el proyecto/.test(el(S, 'proyecto-error').textContent), el(S, 'proyecto-error').textContent)
  chk('Taller sin proyecto: el error nombra "Gasto general del taller"', /Gasto general del taller/.test(el(S, 'proyecto-error').textContent))
  chk('Taller sin proyecto: no es un cartel suelto (toast)', S.__errores.length === antes)
  chk('Taller sin proyecto: el campo queda marcado', el(S, 'campo-proyecto').classList.contains('campo--con-error'))
  chk('Taller sin proyecto: la ayuda se esconde (no dice lo mismo dos veces)', el(S, 'proyecto-ayuda').hidden === true)
  S.mostrarErrorProyecto('')
  chk('sin error: la ayuda vuelve y el error se va', el(S, 'proyecto-ayuda').hidden === false && el(S, 'proyecto-error').hidden === true)
  S.validarSubpaso('detalles')
  chk('Taller sin proyecto: el foco va al campo', S.__foco.includes('campo-proyecto'))
  chk('Taller sin proyecto: el botón Siguiente NO se deshabilita', el(S, 'btn-detalles-siguiente').disabled !== true)

  el(S, 'campo-proyecto').value = '__general__'
  chk('Taller con "Gasto general": pasa', S.validarSubpaso('detalles') === true, JSON.stringify(S.__errores))
  el(S, 'campo-proyecto').value = 'p-cur'
  chk('Taller con un proyecto: pasa', S.validarSubpaso('detalles') === true)

  // Otra unidad: el proyecto no se pide.
  S.__set('unidadSeleccionada', NUSS)
  el(S, 'campo-proyecto').value = ''
  chk('otra unidad sin proyecto: pasa (no se pide)', S.validarSubpaso('detalles') === true)
  S.__set('viaVehiculos', false)
}

// ── 3. Lo que se guarda ─────────────────────────────────────────────────────
{
  const S = sandbox()
  S.__set('unidadSeleccionada', TALLER)
  el(S, 'campo-fecha').value = '2026-09-27'
  el(S, 'campo-fecha-pago').value = '2026-09-27'
  el(S, 'campo-proyecto').value = '__general__'
  chk('guardar: "Gasto general del taller" guarda proyecto_id null (gasto)', S.armarGasto().proyecto_id === null)
  chk('guardar: "Gasto general del taller" guarda proyecto_id null (factura pendiente)', S.armarFacturaPendiente().proyecto_id === null)
  chk('guardar: nunca viaja el valor "__general__"', JSON.stringify(S.armarGasto()).indexOf('__general__') === -1)
  el(S, 'campo-proyecto').value = 'p-cur'
  chk('guardar: un proyecto elegido viaja con su id (gasto)', S.armarGasto().proyecto_id === 'p-cur')
  chk('guardar: un proyecto elegido viaja con su id (factura pendiente)', S.armarFacturaPendiente().proyecto_id === 'p-cur')
  S.__set('unidadSeleccionada', NUSS)
  chk('guardar: en otra unidad el proyecto va null aunque haya quedado algo en el select', S.armarGasto().proyecto_id === null)

  // El resumen del wizard.
  S.__set('unidadSeleccionada', TALLER)
  chk('resumen: Taller sin proyecto dice "Gasto general del taller"', S.proyectoParaResumen(null)?.nombre === 'Gasto general del taller')
  chk('resumen: con proyecto dice su nombre', S.proyectoParaResumen('p-cur')?.nombre === 'Máquina barquillo')
  S.__set('unidadSeleccionada', NUSS)
  chk('resumen: otra unidad sin proyecto no dice nada', S.proyectoParaResumen(null) === null)
}

// ── 4. "Actualizar la lista" ────────────────────────────────────────────────
esperas.push((async () => {
  const S = sandbox()
  S.poblarSelectProyecto('p-cur')
  S.__base([...PROYECTOS_BASE, { id: 'p-new', nombre: 'Recién creado', activo: true, estado: 'aprobado' }])
  await S.recargarProyectosWizard()
  const c = S.__consultas.find(x => x.tabla === 'proyectos')
  chk('actualizar: consulta proyectos', !!c)
  chk('actualizar: pide SOLO columnas que authenticated puede leer', c && c.cols === 'id, nombre, activo, estado', c && c.cols)
  chk('actualizar: el recién creado aparece', el(S, 'campo-proyecto').innerHTML.includes('p-new'))
  chk('actualizar: lo elegido se conserva', el(S, 'campo-proyecto').value === 'p-cur')
  chk('actualizar: sigue sin ofrecer los cerrados', !el(S, 'campo-proyecto').innerHTML.includes('p-ent'))
  chk('actualizar: avisa que se actualizó', S.__exitos.some(m => /actualizada/.test(m)))
  chk('actualizar: el botón queda habilitado al terminar', el(S, 'btn-actualizar-proyectos').disabled === false)

  // Si el elegido se cerró mientras tanto, se dice pegado al campo.
  S.__base(PROYECTOS_BASE.map(p => p.id === 'p-cur' ? { ...p, estado: 'entregado' } : p))
  await S.recargarProyectosWizard()
  chk('actualizar: si lo elegido se cerró, se dice pegado al campo', el(S, 'proyecto-error').hidden === false && /ya no está abierto/.test(el(S, 'proyecto-error').textContent))

  // Si la consulta falla, no se borra nada y se dice.
  const S2 = sandbox()
  S2.poblarSelectProyecto('p-pre')
  const antes = S2.estado.maestros.proyectos.length
  S2.__fallar({ message: 'permission denied for table proyectos' })
  await S2.recargarProyectosWizard()
  chk('actualizar con error: lo cargado no se pierde', S2.estado.maestros.proyectos.length === antes && el(S2, 'campo-proyecto').value === 'p-pre')
  chk('actualizar con error: se dice pegado al campo, sin el mensaje crudo', /No se pudo actualizar/.test(el(S2, 'proyecto-error').textContent) && !/permission/.test(el(S2, 'proyecto-error').textContent))
})())

// ── 5. La EDICIÓN ───────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = sandbox()
  const cerrado = { id: 'p-ent', nombre: 'Horno entregado', activo: true, estado: 'entregado' }
  let h = S.htmlSelectProyectoEdicion({ unidad_negocio_id: TALLER, proyectos: cerrado })
  chk('edición: conserva el proyecto cerrado, marcado', /<option value="p-ent" selected>Horno entregado \(entregado\)<\/option>/.test(h), h)
  chk('edición Taller: no hay "Ninguno"', !h.includes('Ninguno'))
  chk('edición Taller con proyecto: "Gasto general" no queda elegido', /<option value="__general__" >Gasto general del taller/.test(h))
  h = S.htmlSelectProyectoEdicion({ unidad_negocio_id: TALLER, proyectos: null })
  chk('edición: un gasto del Taller sin proyecto abre con "Gasto general del taller" elegido', /<option value="__general__" selected>Gasto general del taller<\/option>/.test(h), h)
  h = S.htmlSelectProyectoEdicion({ unidad_negocio_id: NUSS, proyectos: null })
  chk('edición de otra unidad: conserva "— Ninguno —"', h.includes('<option value="">— Ninguno —</option>') && !h.includes('Gasto general'))
  const baja = S.opcionesProyectoEdicion(S.estado.maestros.proyectos, { id: 'p-baj', nombre: 'Dado de baja', activo: false, estado: 'en_curso' })
  chk('edición: un dado de baja se marca "(dado de baja)"', baja.some(o => o.id === 'p-baj' && /\(dado de baja\)$/.test(o.etiqueta)))
  const can = S.opcionesProyectoEdicion(S.estado.maestros.proyectos, { id: 'p-can', nombre: 'X', activo: true, estado: 'cancelado' })
  chk('edición: un cancelado se marca "(cancelado)"', can.some(o => o.id === 'p-can' && /\(cancelado\)$/.test(o.etiqueta)))
  const abierto = S.opcionesProyectoEdicion(S.estado.maestros.proyectos, { id: 'p-cur', nombre: 'Máquina barquillo' })
  chk('edición: un abierto no se duplica', abierto.filter(o => o.id === 'p-cur').length === 1)

  // Guardar la edición de un gasto del Taller sin proyecto: viaja null.
  S.estado.listaGastos = [{
    id: 'g1', fecha: '2026-09-20', fecha_pago: '2026-09-20', importe: 100, moneda: 'ARS', medio_pago: 'cheque', estado: 'registrado',
    unidad_negocio_id: TALLER, unidades_negocio: { id: TALLER, nombre: 'Taller' }, empleado_id: 'e1', empleados: { id: 'e1', nombre: 'Ana' },
    categorias: { id: 'cat-1', nombre: 'Repuestos' }, proyectos: null,
  }]
  S.mostrarFormularioEdicionGasto('g1')
  const form = el(S, 'detalle-gasto-contenido').innerHTML
  chk('edición del gasto: el formulario dibuja el select de proyecto', form.includes('id="edit-proyecto"'))
  chk('edición del gasto: sin proyecto abre en "Gasto general del taller"', /<option value="__general__" selected>/.test(form))
  for (const [id, v] of [['edit-empleado', 'e1'], ['edit-categoria', 'cat-1'], ['edit-unidad', TALLER], ['edit-vehiculo', ''],
    ['edit-medio-pago', 'cheque'], ['edit-cuenta', ''], ['edit-fecha-pago', '2026-09-20'], ['edit-fecha', '2026-09-20'],
    ['edit-proyecto', '__general__'], ['edit-moneda', 'ARS']]) el(S, id).value = v
  await el(S, 'btn-guardar-edicion').__on.click()
  const up = S.__updates.find(u => u.tabla === 'gastos')
  chk('edición del gasto: guardar con "Gasto general" manda proyecto_id null', up && up.cambios.proyecto_id === null, JSON.stringify(up && up.cambios.proyecto_id))
  el(S, 'edit-proyecto').value = 'p-ent'
  S.__updates.length = 0
  await el(S, 'btn-guardar-edicion').__on.click()
  const up2 = S.__updates.find(u => u.tabla === 'gastos')
  chk('edición del gasto: el proyecto cerrado se conserva al guardar', up2 && up2.cambios.proyecto_id === 'p-ent')
})())

// ── 6. Detalle y Excel: "Gasto general del taller" en vez de vacío ─────────
{
  const S = sandbox()
  chk('etiqueta: gasto del Taller sin proyecto → "Gasto general del taller"',
    S.etiquetaProyectoGasto({ unidad_negocio_id: TALLER, proyectos: null }) === 'Gasto general del taller')
  chk('etiqueta: por el embed de la unidad también', S.etiquetaProyectoGasto({ unidades_negocio: { id: TALLER }, proyectos: null }) === 'Gasto general del taller')
  chk('etiqueta: con proyecto, su nombre', S.etiquetaProyectoGasto({ unidad_negocio_id: TALLER, proyectos: { nombre: 'Máquina barquillo' } }) === 'Máquina barquillo')
  chk('etiqueta: otra unidad sin proyecto → nada', S.etiquetaProyectoGasto({ unidad_negocio_id: NUSS, proyectos: null }) === null)
  chk('etiqueta: sin unidad (vehículo) sin proyecto → nada', S.etiquetaProyectoGasto({ unidad_negocio_id: null, proyectos: null }) === null)
  S.estado.maestros.unidades = [{ id: TALLER, nombre: 'Taller' }]
  chk('Taller se reconoce por el nombre si no vino el prefijo', S.esUnidadTaller(TALLER) === true)
}
chk('el detalle usa etiquetaProyectoGasto', /fila\('Proyecto',\s+etiquetaProyectoGasto\(g\)\)/.test(extraerFn(SCRIPT, 'mostrarDetalleGasto')))
chk('el Excel usa etiquetaProyectoGasto', /'Proyecto':\s+etiquetaProyectoGasto\(g\)/.test(extraerFn(SCRIPT, 'exportarExcel')))

// ── 7. La base: solo columnas permitidas, nunca select('*') ────────────────
{
  const consultas = [...SCRIPT.matchAll(/from\('proyectos'\)\s*\.select\(([^)]*)\)/g)].map(m => m[1].trim())
  chk('proyectos: hay consultas (si da cero, no se está mirando nada)', consultas.length >= 3, String(consultas.length))
  chk('proyectos: todas piden COLUMNAS_PROYECTO', consultas.every(c => c === 'COLUMNAS_PROYECTO'), consultas.join(' | '))
  // Verificado con has_column_privilege('authenticated', …) el 27/09/2026.
  const permitidas = new Set(['id', 'nombre', 'activo', 'created_at', 'destino', 'categoria', 'estado'])
  const cols = String(require('./extraer').extraerConst(SCRIPT, 'COLUMNAS_PROYECTO')).match(/'([^']*)'/)[1].split(',').map(s => s.trim())
  chk('COLUMNAS_PROYECTO: solo columnas que authenticated puede leer', cols.length > 0 && cols.every(c => permitidas.has(c)), cols.join(','))
  chk('los embeds de proyectos piden COLUMNAS_PROYECTO', (SCRIPT.match(/proyectos\s+\(\$\{COLUMNAS_PROYECTO\}\)/g) || []).length === 2)
  chk('ningún embed de proyectos pide columnas sueltas', !/\bproyectos\s+\((?!\$\{COLUMNAS_PROYECTO\})[a-z_,\s*]*\)/.test(SCRIPT))
}

// ── 8. La pantalla y el botón viejos NO están (se mudaron a taller.html) ────
for (const id of ['btn-abrir-proyectos', 'modal-proyectos', 'btn-proyecto-nuevo', 'proyecto-nuevo', 'campo-proyecto-nombre',
  'btn-proyecto-nuevo-crear', 'btn-proyecto-nuevo-cancelar', 'proyectos-lista', 'btn-proyectos-alta-crear', 'campo-proyectos-alta-nombre']) {
  chk(`ya no existe #${id}`, !new RegExp(`id="${id}"|getElementById\\('${id}'\\)`).test(FUENTE))
}
for (const rpc of ['crear_proyecto', 'dar_de_baja_proyecto', 'reactivar_proyecto']) {
  chk(`Gastos ya no llama a ${rpc}`, !new RegExp(`rpc\\('${rpc}'`).test(SCRIPT) && !SCRIPT.includes(`'${rpc}'`))
}
chk('ya no hay tarea gestionar_proyectos en Gastos', !/gestionar_proyectos/.test(SCRIPT))
chk('el link a Proyectos Taller abre taller.html en otra pestaña, con noopener',
  /<a[^>]*id="link-crear-proyecto"[^>]*href="taller\.html"[^>]*target="_blank"[^>]*rel="noopener"/.test(FUENTE))
chk('el link dice "¿No está? Crealo en Proyectos Taller"', /¿No está\? Crealo en Proyectos Taller/.test(FUENTE))
chk('"Actualizar la lista" está y está cableado', /id="btn-actualizar-proyectos"[^>]*>Actualizar la lista</.test(FUENTE) &&
  /getElementById\('btn-actualizar-proyectos'\)\.addEventListener\('click', recargarProyectosWizard\)/.test(SCRIPT))
chk('el campo tiene su error pegado', /<p class="campo-error-pegado" id="proyecto-error"/.test(FUENTE))
chk('poblarSelectEmpleados decide el grupo con actualizarGrupoProyecto', /actualizarGrupoProyecto\(unidadId\)/.test(extraerFn(SCRIPT, 'poblarSelectEmpleados')))

fin()
