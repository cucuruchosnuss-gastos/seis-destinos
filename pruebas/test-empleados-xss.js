// Barrido de escapado de modulos/empleados.html — el archivo ENTERO.
//
// El barrido se cerró en 3ee44c5 (17/09/2026) y la prueba que lo demostraba se
// perdió con la sesión. Esta suite lo BLOQUEA sobre el estado actual, con el
// mismo método que test-caja-xss.js y test-cuentas-corrientes-xss.js, en tres
// partes:
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO
//     (`"><b data-xss="campo">`), con datos que imitan lo que devuelve la base:
//     las cifras, el listado agrupado por unidad (título de grupo, tarjeta,
//     avatar, chip de rol, puesto), la ficha (datos de Naaloo, datos
//     laborales, contacto de emergencia, acceso con chips de módulo —incluido
//     el fallback de un módulo desconocido—, acciones), los DOS formularios de
//     edición que precargan value="...", el <select> de unidad de la edición y
//     el de la importación (que se dibuja en init(), así que se corre init()
//     entero), los datos de cabecera de la ficha que van por textContent, y la
//     IMPORTACIÓN DE NAALOO de punta a punta: un Excel con texto malicioso en
//     cada columna pasa por manejarArchivoExcel(), se verifica qué viaja a la
//     RPC y que, cuando vuelve de la base, se dibuja escapado.
//  2. CHEQUEO ESTÁTICO sobre TODO el <script>: cada ${...} de una plantilla que
//     arma HTML, cada asignación a innerHTML (la expresión ENTERA) y cada
//     plantilla sin HTML propio que termina en un innerHTML tiene que estar
//     escapada o figurar en la lista de seguras CON SU MOTIVO, por función. Una
//     entrada que no se usa es rojo. Más el contexto: atributo sin comillas,
//     on*=, href/src, style (el único style del archivo, justificado).
//  3. SINKS DE NAVEGACIÓN: Empleados no lee NINGÚN parámetro de la URL, su
//     única navegación por código es la literal al dashboard, y el único href
//     de una plantilla es el literal "accesos.html".
//
// Empleados NO importa funciones de números de js/utils.js (solo mostrarError,
// mostrarExito y formatearFecha; verificado y afirmado abajo), así que el
// preludio no lleva fuenteNumeros().
//
//   node pruebas/test-empleados-xss.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-empleados-xss.js
//   SOLO=render | SOLO=estatico      INFORME=1 (imprime los conteos)

const fs = require('fs')
const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, escapada, chequearMarcas, leer } = require('./circuito-comun')
const { interpolaciones, analizar } = require('./escaner-interpolaciones')
const { clasificar, partirTopLevel } = require('./clasificar')
const { extraerFn, cuerpoDesde } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/empleados.html')
const SOLO = process.env.SOLO || ''
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// HALLAZGOS ABIERTOS: sinks encontrados por esta suite y todavía sin arreglar.
// Al 21/09/2026 NO hay ninguno. Si aparece uno, se declara acá con su chequeo
// invertido (como en test-gastos-xss.js) y el cierre lo imprime.
const HALLAZGOS_ABIERTOS = new Set([])

// formatearFecha de js/utils.js, con su código REAL (sin el export).
const UTILS = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
const FORMATEAR_FECHA = extraerFn(UTILS.replace(/^export /gm, ''), 'formatearFecha')

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

// Lo que define el preludio y NO se extrae: lo importado de otros archivos.
const STUBS = new Set(['verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha'])

const RENDERS = [
  'esc', 'formatearCuil', 'iniciales', 'colorAvatar',
  'renderizarStats', 'renderizarFilaEmpleado', 'renderizarListado', 'abrirFicha', 'renderizarFicha',
  'renderizarFormularioEdicion', 'renderizarFormularioContacto',
  'cargarTodo', 'manejarArchivoExcel', 'init',
]

function clausura(src) {
  const nombresFn = new Set([...src.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))
  const posConst = new Map([...src.matchAll(/\n {4}const ([A-Za-z_$][\w$]*)\s*=/g)].map(m => [m[1], m.index + 1]))
  const fns = new Set(), consts = []
  const cola = [...RENDERS]
  const mirar = (texto) => {
    for (const m of texto.matchAll(/[A-Za-z_$][\w$]*/g)) {
      const id = m[0]
      if (nombresFn.has(id) && !fns.has(id) && !STUBS.has(id)) cola.push(id)
      if (posConst.has(id) && !consts.includes(id)) {
        consts.push(id)
        const resto = src.slice(posConst.get(id))
        const fin = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, fin === -1 ? 400 : fin + 1))
      }
    }
  }
  while (cola.length) {
    const n = cola.shift()
    if (fns.has(n) || STUBS.has(n)) continue
    let texto
    try { texto = extraerFn(src, n) } catch (e) { chk(`existe la función ${n}`, false, e.message); continue }
    fns.add(n)
    mirar(texto)
  }
  consts.sort((a, b) => posConst.get(a) - posConst.get(b))
  return { funciones: [...fns], constantes: consts }
}

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, checked: false, disabled: false,
      title: '', type: '', dataset: {}, style: {}, hijos: [],
      querySelector: () => nuevoEl('hijo'), querySelectorAll: () => [], addEventListener(){}, removeEventListener(){}, focus(){}, click(){},
      removeAttribute(){}, setAttribute(){}, closest: () => nuevoEl('cercano'), remove(){},
      appendChild(h){ el.hijos.push(h) }, append(...hs){ el.hijos.push(...hs) },
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    return el
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'),
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => nuevoEl(s), addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
  }
  var __navegacion = []
  var window = { location: { set href(v) { __navegacion.push(v) }, replace(v) { __navegacion.push(v) } } }
  function setTimeout(f) { f() }
  var lucide = { createIcons(){} }
  // XLSX falso: el Excel "leído" son las filas que pone la prueba.
  var __filasExcel = []
  var XLSX = {
    read: () => ({ SheetNames: ['Colaboradores'], Sheets: { Colaboradores: {} } }),
    utils: { sheet_to_json: () => __filasExcel },
  }
  var __datos = {}
  function __consulta(tabla) {
    const q = { __uno: false }
    for (const k of ['select', 'eq', 'neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not']) q[k] = () => q
    q.maybeSingle = () => { q.__uno = true; return q }
    q.then = (res, rej) => Promise.resolve({ data: q.__uno ? (__datos['__uno:' + tabla] ?? null) : (__datos[tabla] ?? []), error: null }).then(res, rej)
    return q
  }
  var __rpcs = []
  var __rpcRespuesta = { data: { altas: 1, actualizaciones: 0 }, error: null }
  var supabase = { from: (t) => __consulta(t), rpc: async (n, a) => { __rpcs.push([n, a]); return __rpcRespuesta } }
  var __llamadas = { errores: [], exitos: [] }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function mostrarBannerVersion() {}
  async function verificarSesion() { return { user: { id: 'uid-yo' } } }
  ${FORMATEAR_FECHA}
  var debounceBusquedaEmpleados
`

const RETORNO = 'estado, __els, __el(id){ return document.getElementById(id) }, __llamadas, __navegacion, __rpcs, ' +
  '__setDatos(t, d){ __datos[t] = d }, __setExcel(f){ __filasExcel = f }, __setRpc(r){ __rpcRespuesta = r }'

if (SOLO !== 'estatico') {
  let S
  try {
    const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
    S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
  } catch (e) {
    chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
  }
  if (S) esperas.push(correrRenders(S))
}

async function correrRenders(S) {
  const el = (id) => S.__el(id)
  const html = (id) => el(id).innerHTML
  const E = S.estado

  // ── esc y los helpers que devuelven texto crudo ──────────────────────────
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, S.esc(crudo) === esperado, S.esc(crudo))
  }
  chk('esc no convierte null en la palabra null', S.esc(null) === '' && S.esc(undefined) === '')
  chk('iniciales devuelve texto crudo (se escapa su RESULTADO)', S.iniciales('<x y') === '<Y')
  chk('formatearCuil devuelve el CUIL CRUDO si no tiene 11 dígitos (se escapa su RESULTADO)', S.formatearCuil('<b>1') === '<b>1')
  const paleta = ['#6E56CF', '#5B45AD', '#8B75DB', '#4A5568', '#6E3B5C']
  chk('colorAvatar devuelve SIEMPRE un color de la paleta del código, nunca el texto', [marca('x'), '', null, 'Ana'].every(t => paleta.includes(S.colorAvatar(t))))

  // ── Estado base: unidades, personas y módulos ────────────────────────────
  const U = marca('uni_id')
  const unidades = [{ id: 'u-cn', nombre: 'Cucuruchos Nuss' }, { id: U, nombre: marca('uni_nombre') }]
  const p1 = {
    id: marca('p1_id'), nombre: marca('p1_nombre'), cuil: marca('p1_cuil'), activo: true, auth_user_id: 'auth-1',
    rol_app: marca('p1_rol_app'), tipo: 'naaloo', origen: 'naaloo', unidad_negocio_id: U, rol: marca('p1_rol'),
    email: marca('p1_email'), domicilio: marca('p1_domicilio'), legajo: marca('p1_legajo'),
    fecha_alta: '2026-01-02', fecha_nacimiento: '1990-03-04', telefono: marca('p1_telefono'),
    contacto_emergencia_nombre: marca('p1_ce_nombre'), contacto_emergencia_telefono: marca('p1_ce_telefono'),
  }
  // Registrada por la app, sin puesto: "incompleta", sin unidad y sin acceso.
  const p2 = {
    id: 'p2', nombre: marca('p2_nombre'), cuil: '20123456789', activo: true, auth_user_id: null, rol_app: 'usuario',
    tipo: 'admin', origen: 'app_registro', unidad_negocio_id: null, rol: null, email: null, domicilio: null,
    legajo: null, fecha_alta: null, fecha_nacimiento: null, telefono: null,
    contacto_emergencia_nombre: null, contacto_emergencia_telefono: null,
  }
  // Sin unidad y CON acceso: el grupo "Con acceso a la app, sin empresa asignada".
  const p3 = { ...p2, id: 'p3', nombre: marca('p3_nombre'), auth_user_id: 'auth-3', origen: 'naaloo', rol: marca('p3_rol') }
  S.__setDatos('empleados', [p1, p2, p3])
  S.__setDatos('empleado_modulos', [
    { empleado_id: p1.id, modulo: 'gastos', habilitado: true },
    // empleado_modulos.modulo es texto sin CHECK ni FK: el chip escapa también el fallback.
    { empleado_id: p1.id, modulo: marca('modulo_desconocido'), habilitado: true },
  ])
  S.__setDatos('unidades_negocio', unidades)
  S.__setDatos('__uno:empleados', { id: 'yo', rol_app: 'super_admin' })
  S.__setDatos('empleado_tareas', [{ tarea: 'ver_editar' }, { tarea: 'importar_naaloo' }, { tarea: 'reasignar_unidad' }])

  // ── init(): carga, cifras, listado y el <select> de la importación ───────
  await S.init()
  chk('init: no hubo errores', S.__llamadas.errores.length === 0, S.__llamadas.errores.join(' | '))
  chk('cifras: solo números calculados (3 empleados, 2 con acceso, 1 empresa)',
    /stat-card__valor">3</.test(html('empleados-stats')) && /stat-card__valor">2</.test(html('empleados-stats')) && !/data-xss/.test(html('empleados-stats')))
  const lista = html('lista-empleados')
  chequearMarcas(chk, 'listado por unidad', lista,
    ['uni_nombre', 'p1_id', 'p1_nombre', 'p1_rol', 'p1_rol_app', 'p2_nombre', 'p3_nombre', 'p3_rol'])
  chk('listado: se dibujaron los tres grupos (si no, el chequeo no mira nada)',
    /Con acceso a la app, sin empresa asignada/.test(lista) && /Sin empresa asignada/.test(lista) && lista.includes(escapada('uni_nombre')))
  chk('listado: las iniciales del avatar se escapan', S.renderizarFilaEmpleado({ id: 'z', nombre: '<x y' }).includes('&lt;Y</div>'))
  chk('listado: el style del avatar es un color de la paleta, nunca el nombre',
    [...lista.matchAll(/style="background:([^;"]*);"/g)].map(m => m[1]).every(c => paleta.includes(c)) && /style="background:#/.test(lista))
  chk('listado: la clase del chip de rol no sale del atributo con un rol_app raro', !/chip-rol--"/.test(lista) && lista.includes('chip-rol--' + S.esc(marca('p1_rol_app'))))
  chequearMarcas(chk, 'select de empresa de la importación', html('select-empresa-import'), ['uni_id', 'uni_nombre'])
  chk('select de importación: se dibujó la opción de la unidad', /<option value="[^"]*uni_id/.test(html('select-empresa-import')))

  // ── Ficha: datos de Naaloo, laborales, contacto, acceso, acciones ────────
  S.abrirFicha(p1.id)
  chk('ficha: se abrió', el('modal-ficha').hidden === false && E.fichaAbierta === p1.id)
  chequearMarcas(chk, 'ficha: datos de Naaloo', html('ficha-datos-naaloo'), ['p1_legajo', 'p1_cuil', 'p1_domicilio', 'p1_telefono'])
  chk('ficha: las fechas son las de la columna date, formateadas', /02\/01\/2026/.test(html('ficha-datos-naaloo')) && /04\/03\/1990/.test(html('ficha-datos-naaloo')))
  chequearMarcas(chk, 'ficha: datos laborales', html('ficha-datos-laborales'), ['p1_rol', 'uni_nombre'])
  chequearMarcas(chk, 'ficha: contacto de emergencia', html('ficha-contacto-emergencia'), ['p1_ce_nombre', 'p1_ce_telefono'])
  chequearMarcas(chk, 'ficha: acceso (chip de rol y chips de módulo, con el fallback)', html('ficha-acceso'), ['p1_rol_app', 'modulo_desconocido'])
  chk('ficha: el chip de un módulo conocido usa la etiqueta del código', />Gastos</.test(html('ficha-acceso')))
  chk('ficha: acciones solo literales (link a accesos.html)', /<a href="accesos\.html"/.test(html('ficha-acciones')) && !/data-xss/.test(html('ficha-acciones')))
  // La cabecera de la ficha va por textContent: el dato queda CRUDO ahí, que es lo seguro.
  chk('ficha: el nombre va por textContent', el('ficha-nombre').textContent === marca('p1_nombre') && el('ficha-nombre').innerHTML === '')
  chk('ficha: el email va por textContent', el('ficha-email').textContent === marca('p1_email') && el('ficha-email').innerHTML === '')
  chk('ficha: las iniciales van por textContent', el('ficha-avatar').textContent === S.iniciales(marca('p1_nombre')) && el('ficha-avatar').innerHTML === '')
  chk('ficha: el fondo del avatar es un color de la paleta', paleta.includes(el('ficha-avatar').style.background))

  // Formularios de edición: precargan value="${esc(...)}".
  E.modoEdicionFicha = true
  E.modoEdicionContacto = true
  S.renderizarFicha()
  const form = html('ficha-datos-laborales')
  chequearMarcas(chk, 'formulario de edición (value= y select de unidad)', form, ['p1_rol', 'p1_domicilio', 'p1_telefono', 'uni_id', 'uni_nombre'])
  chk('formulario de edición: la unidad de la persona sale seleccionada', new RegExp('value="' + S.esc(U).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '" selected').test(form))
  chequearMarcas(chk, 'formulario de contacto (value=)', html('ficha-contacto-emergencia'), ['p1_ce_nombre', 'p1_ce_telefono'])
  E.modoEdicionFicha = false
  E.modoEdicionContacto = false

  // ── PIN de producción ────────────────────────────────────────────────────
  // Los dos textos no confiables de la sección: el nombre de la persona (que
  // viene de empleados) y el mensaje de error, que lo redacta la BASE.
  E.pin = {
    empleadoId: p1.id, cargando: false, error: false, panel: true, guardando: false,
    datos: { tiene_pin: false, debe_cambiar: false, puede_asignar: true },
    error_texto: marca('pin_error'),
  }
  S.renderizarPin()
  chequearMarcas(chk, 'PIN: el panel con el nombre de la persona y el error de la base', html('ficha-pin'), ['p1_nombre', 'pin_error'])
  chk('PIN: el panel se dibujó (si no, el chequeo de arriba no mira nada)', /id="pin-valor"/.test(html('ficha-pin')))
  chk('PIN: el campo es type="text" + inputmode, NUNCA type="number" (un PIN es un identificador)',
    /<input type="text" id="pin-valor" inputmode="numeric"/.test(html('ficha-pin')))
  E.pin = { empleadoId: null, cargando: false, datos: null, error: false, panel: false, guardando: false, error_texto: null }
  S.renderizarPin()

  // Persona sin acceso, incompleta: "Completar datos" y "Sin acceso".
  S.abrirFicha('p2')
  chk('ficha incompleta: botón literal "Completar datos"', /btn-completar-datos/.test(html('ficha-acciones')))
  chk('ficha sin acceso: texto literal', /Sin acceso a la app/.test(html('ficha-acceso')))
  chk('ficha sin datos: el CUIL de 11 dígitos se formatea', /20-12345678-9/.test(html('ficha-datos-naaloo')))

  // ── Importación de Naaloo, de punta a punta ──────────────────────────────
  // Lo que viene del Excel también es dato no confiable: cada columna lleva su
  // marca. La importación no dibuja las filas: las manda a la RPC y después las
  // muestra el listado/ficha cuando vuelven de la base.
  el('select-empresa-import').value = 'u-cn'
  S.__setExcel([{
    'Apellidos': marca('xl_apellido'), 'Nombres': marca('xl_nombre'), 'CUIL': marca('xl_cuil'),
    'Dirección de correo': marca('xl_email'), 'Fecha de nacimiento (dd/mm/yyyy)': marca('xl_fnac'),
    'Teléfonos': marca('xl_telefono'), 'Domicilio': marca('xl_domicilio'), 'Legajo': marca('xl_legajo'),
    'Fecha alta (dd/mm/yyyy)': '05/06/2020', 'Categoría': marca('xl_cat'), 'Subcategoría': marca('xl_subcat'),
    'Fecha baja (dd/mm/yyyy)': null,
  }])
  const antesRpc = S.__rpcs.length
  await S.manejarArchivoExcel({ arrayBuffer: async () => new ArrayBuffer(0) })
  const llamada = S.__rpcs[antesRpc]
  chk('importación: llamó a importar_empleados_naaloo', llamada && llamada[0] === 'importar_empleados_naaloo')
  const fila = llamada?.[1]?.p_filas?.[0] || {}
  chk('importación: la unidad elegida viaja a la RPC', llamada?.[1]?.p_unidad_negocio_id === 'u-cn')
  chk('importación: una fecha que no es dd/mm/yyyy NO viaja (null), aunque la columna ya sea date',
    fila.fecha_nacimiento === null && fila.fecha_alta === '2020-06-05')
  chk('importación: el éxito se informa con un toast (textContent en utils.js)', S.__llamadas.exitos.some(m => /altas/.test(m)))
  // Lo que la base devuelve después: esas mismas filas, con su id.
  const importada = {
    ...p2, id: marca('xl_id'), nombre: fila.nombre, cuil: fila.cuil, email: fila.email, telefono: fila.telefono,
    domicilio: fila.domicilio, legajo: fila.legajo, rol: fila.rol, origen: 'naaloo', unidad_negocio_id: 'u-cn', auth_user_id: null,
  }
  S.__setDatos('empleados', [p1, importada])
  await S.cargarTodo()
  chequearMarcas(chk, 'importación: el listado con lo que vino del Excel', html('lista-empleados'),
    ['xl_id', 'xl_apellido', 'xl_nombre', 'xl_cat', 'xl_subcat'])
  S.abrirFicha(importada.id)
  chequearMarcas(chk, 'importación: la ficha con lo que vino del Excel', html('ficha-datos-naaloo'),
    ['xl_legajo', 'xl_cuil', 'xl_domicilio', 'xl_telefono'])
  chequearMarcas(chk, 'importación: los datos laborales con la categoría del Excel', html('ficha-datos-laborales'), ['xl_cat', 'xl_subcat'])
  chk('importación: el email del Excel va por textContent', el('ficha-email').textContent === marca('xl_email'))
  // Un error de la RPC se informa con un toast (textContent), no con innerHTML.
  S.__setRpc({ data: null, error: { message: marca('rpc_error') } })
  await S.manejarArchivoExcel({ arrayBuffer: async () => new ArrayBuffer(0) })
  chk('importación: el error de la RPC va al toast (textContent), no a la página', S.__llamadas.errores.includes(marca('rpc_error')))

  chk('ningún render navegó', S.__navegacion.length === 0, S.__navegacion.join(' | '))
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO — TODO el <script>
// ══════════════════════════════════════════════════════════════════════════

const HTML_PROPIO = 'HTML armado más arriba en la misma función, con esc() de cada dato (sus interpolaciones las revisa el escáner)'
const NUM = 'número: conteo o largo calculado en el código (.length, Set.size)'
const ETIQUETA_ROL = "etiquetaRol: ternario de literales del código ('Super admin' / 'Admin' / 'Usuario')"
const FECHA = 'formatearFecha() de una columna DATE (empleados.fecha_nacimiento / fecha_alta, verificado el 21/09/2026): solo dígitos y /; o el literal —'
const SEGURAS = {
  renderizarStats: { total: NUM, conAcceso: NUM, empresas: NUM },
  renderizarFilaEmpleado: {
    etiquetaRol: ETIQUETA_ROL,
    "incompleto ? 'tarjeta-empleado--incompleta' : ''": 'clase CSS: ternario de literales',
    'colorAvatar(emp.nombre)': 'colorAvatar(): PALETA_AVATAR[hash % 5], un hex de la constante del código (ejecutado con un nombre malicioso)',
    badgeAcceso: HTML_PROPIO,
  },
  renderizarListado: {
    'g.lista.length': NUM,
    "g.lista.map(renderizarFilaEmpleado).join('')": 'HTML de renderizarFilaEmpleado(), que escapa adentro (ejecutada con marcas)',
  },
  renderizarFormularioEdicion: {
    "tieneTarea('empleados', 'reasignar_unidad') ? '' : 'disabled title=\"Solo quien tiene permiso para reasignar unidad puede cambiar este campo\"'": 'ternario de literales del código',
    "u.id === emp.unidad_negocio_id ? 'selected' : ''": 'ternario de literales del código',
  },
  renderizarFicha: {
    "emp.fecha_nacimiento ? formatearFecha(emp.fecha_nacimiento) : '—'": FECHA,
    "emp.fecha_alta ? formatearFecha(emp.fecha_alta) : '—'": FECHA,
    etiquetaRol: ETIQUETA_ROL,
    chipsModulos: HTML_PROPIO,
    "acciones.join('')": 'botón y enlace literales del código',
  },
  htmlPanelPin: {
    LARGO_PIN_PRODUCCION: 'número: la constante 4 del código (el largo del PIN)',
  },
  htmlSeccionPin: {
    'est.clase': "clase CSS: estadoDelPin() devuelve uno de los tres literales del código ('chip-pin--gris' / '--alerta' / '--ok')",
    'est.texto': "estadoDelPin() devuelve uno de los tres literales del código ('Sin PIN' / 'PIN pendiente de cambiar' / 'PIN propio')",
    boton: HTML_PROPIO,
    'htmlPanelPin(emp)': 'HTML armado por htmlPanelPin(), que escapa adentro (sus interpolaciones las revisa el escáner)',
  },
  renderizarPin: {
    'htmlSeccionPin()': 'HTML armado por htmlSeccionPin(), que escapa adentro (sus interpolaciones las revisa el escáner)',
  },
}
const SEGURAS_REGEX = {}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

function esMapDePlantilla(expr) {
  const e = norm(expr)
  if (!/\.join\((''|"")\)$/.test(e)) return false
  return /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*`/.test(e) ||
         /\.map\(\s*\(?[\w\s,[\]{}]*\)?\s*=>\s*\{.*return\s*`/.test(e)
}

// posicionesDeValor() de clasificar.js, pero desenvolviendo SOLO paréntesis
// que envuelven la expresión ENTERA.
function hojas(expr) {
  const e = norm(expr.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n'))
  if (!e) return []
  if (e.startsWith('(')) {
    let cierre = null
    try { cierre = cuerpoDesde(e, 0) } catch { cierre = null }
    if (cierre && cierre.length === e.length) return hojas(e.slice(1, -1))
  }
  for (const op of ['?', '||', '??', '&&', '+']) {
    const partes = partirTopLevel(e, op)
    if (partes.length > 1) {
      if (op === '?') return partirTopLevel(partes.slice(1).join('?'), ':').flatMap(hojas)
      if (op === '&&') return hojas(partes[partes.length - 1])
      return partes.flatMap(hojas)
    }
  }
  return [e]
}

const USADAS = new Set()
function motivoHoja(hoja, fn) {
  const c = clasificar(hoja, { escape: 'esc', seguras: [], segurasRegex: [] })
  if (c.ok) return c.motivos[0]
  if (esMapDePlantilla(hoja)) return 'plantilla anidada devuelta por un map: sus interpolaciones se verifican aparte'
  const tabla = SEGURAS[fn] || {}
  for (const [k, v] of Object.entries(tabla)) if (norm(k) === norm(hoja)) { USADAS.add(fn + '::' + norm(k)); return v }
  for (const [re, v] of (SEGURAS_REGEX[fn] || [])) if (re.test(norm(hoja))) { USADAS.add(fn + '::' + re); return v }
  return null
}

// Las SEGURAS se matchean contra la EXPRESIÓN entera de la interpolación y
// contra cada hoja: un ternario de literales entra por la entrada entera.
function sinJustificar(expr, fn) {
  const tabla = SEGURAS[fn] || {}
  for (const k of Object.keys(tabla)) if (norm(k) === norm(expr)) { USADAS.add(fn + '::' + norm(k)); return [] }
  return hojas(expr).filter(h => !motivoHoja(h, fn))
}

function expresionCompleta(linea) {
  const lineas = FUENTE.split('\n')
  const off = lineas.slice(0, linea - 1).join('\n').length + (linea > 1 ? 1 : 0)
  const m = /\.(innerHTML|outerHTML)\s*=(?!=)/.exec(FUENTE.slice(off))
  if (!m) return null
  const desde = off + m.index + m[0].length
  for (let k = desde; k < Math.min(FUENTE.length, desde + 20000); k++) {
    const c = FUENTE[k]
    if (c !== ';' && c !== '}' && c !== '\n') continue
    const txt = FUENTE.slice(desde, k)
    if (!txt.trim()) continue
    try { new Function(`return (${txt})`) } catch { continue }
    if (c === '\n') {
      const resto = FUENTE.slice(k + 1).replace(/^\s*(\/\/[^\n]*\n\s*)*/, '')
      if (/^[.?:+|&)\]]/.test(resto)) continue
    }
    return txt
  }
  return null
}

// Las plantillas SIN HTML propio cuyo valor TERMINA en un innerHTML: las que
// devuelve una flecha o un return, y las que son una hoja de la asignación.
const esHtmlT = (x) => { for (let c = x; c; c = c.padre) if (c.esHtmlPropio) return true; return false }
function plantillasSinHtml(expr) {
  const out = []
  let t
  try { t = analizar(expr, 0, expr).templates } catch { t = [] }
  for (const x of t) {
    if (esHtmlT(x)) continue
    if (/(=>|return)\s*$/.test(expr.slice(0, x.inicio))) out.push(x)
  }
  for (const h of hojas(expr)) {
    if (!/^`/.test(h)) continue
    let th
    try { th = analizar(h, 0, h).templates } catch { continue }
    const raiz = th.find(x => x.inicio === 0)
    if (raiz && !esHtmlT(raiz)) out.push(raiz)
  }
  return out
}

if (SOLO !== 'render') {
  const r = interpolaciones(ARCHIVO)
  const rangos = []
  for (const m of FUENTE.matchAll(/(?:^|\n)(\s*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nombre = m[2]
    const ini = m.index + m[0].indexOf('function')
    const abre = FUENTE.indexOf('(', ini)
    const params = cuerpoDesde(FUENTE, abre)
    const llave = FUENTE.indexOf('{', abre + params.length)
    const cuerpo = cuerpoDesde(FUENTE, llave)
    const desde = FUENTE.slice(0, ini).split('\n').length
    rangos.push({ nombre, desde, hasta: desde + FUENTE.slice(ini, llave + cuerpo.length).split('\n').length - 1 })
  }
  const funcionDe = (linea) => {
    let mejor = null
    for (const g of rangos) if (linea >= g.desde && linea <= g.hasta && (!mejor || g.hasta - g.desde < mejor.hasta - mejor.desde)) mejor = g
    return mejor ? mejor.nombre : '(top-level)'
  }

  const enHtml = r.interpolaciones.filter(i => i.html)
  const malas = []
  for (const x of enHtml) {
    const fn = funcionDe(x.linea)
    for (const h of sinJustificar(x.expr, fn)) malas.push(`línea ${x.linea} (${fn}): ${norm(h).slice(0, 120)}`)
  }
  chk('estático: ninguna interpolación de HTML queda sin escapar ni justificar', malas.length === 0, '\n      ' + malas.join('\n      '))

  const malasAsig = []
  const asignaciones = r.asignaciones.map(a => ({ ...a, expr: expresionCompleta(a.linea) ?? a.expr }))
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const h of sinJustificar(a.expr, fn)) malasAsig.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
  }
  chk('estático: ninguna asignación a innerHTML queda sin escapar ni justificar', malasAsig.length === 0, '\n      ' + malasAsig.join('\n      '))

  const malasSinHtml = []
  for (const a of asignaciones) {
    const fn = funcionDe(a.linea)
    for (const x of plantillasSinHtml(a.expr)) {
      for (const it of x.interpolaciones) {
        for (const h of sinJustificar(it.expr, fn)) malasSinHtml.push(`línea ${a.linea} (${fn}): ${norm(h).slice(0, 120)}`)
      }
    }
  }
  chk('estático: las plantillas SIN HTML propio que terminan en un innerHTML están escapadas o justificadas',
    malasSinHtml.length === 0, '\n      ' + malasSinHtml.join('\n      '))
  const prueba1 = plantillasSinHtml("items.map(i => `${i.crudo}`).join('')")
  const prueba2 = plantillasSinHtml("cond ? `Hola ${x.crudo}` : ''")
  chk('estático: el chequeo de plantillas sin HTML propio encuentra la hoja cruda de un map de prueba',
    prueba1.length === 1 && prueba1[0].interpolaciones.some(it => it.expr.trim() === 'i.crudo'))
  chk('estático: el chequeo de plantillas sin HTML propio encuentra la hoja cruda de una asignación directa de prueba',
    prueba2.length === 1 && prueba2[0].interpolaciones.some(it => it.expr.trim() === 'x.crudo'))

  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length >= 40, `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 12, `solo ${r.asignaciones.length}`)
  const conEsc = enHtml.filter(i => /^esc\(/.test(i.expr.trim())).length
  chk('estático: hay escapes de verdad, no todo justificado por lista', conEsc >= 25, `${conEsc}`)
  const huerfanas = [
    ...Object.entries(SEGURAS).flatMap(([fn, t]) => Object.keys(t).map(k => fn + '::' + norm(k))),
    ...Object.entries(SEGURAS_REGEX).flatMap(([fn, t]) => t.map(([re]) => fn + '::' + re)),
  ].filter(k => !USADAS.has(k))
  chk('estático: ninguna hoja de la lista de seguras quedó huérfana', huerfanas.length === 0, huerfanas.join(' | '))

  // Los helpers que devuelven texto CRUDO se escapan en su RESULTADO en cada
  // interpolación: ninguna aparece sin esc() alrededor.
  const crudas = enHtml.filter(i => /(iniciales|formatearCuil)\(/.test(i.expr) && !/^esc\((iniciales|formatearCuil)\(/.test(i.expr.trim()))
  chk('estático: iniciales() y formatearCuil() solo entran a HTML dentro de esc()', crudas.length === 0, crudas.map(i => i.linea).join(', '))
  const cuerpoDe = (n) => { try { return extraerFn(FUENTE, n) } catch (e) { chk(`estático: existe la función ${n}`, false, e.message); return '' } }
  chk('estático: colorAvatar() devuelve un elemento de PALETA_AVATAR', /return PALETA_AVATAR\[/.test(cuerpoDe('colorAvatar')))

  // ── Contexto ─────────────────────────────────────────────────────────────
  const STYLE_SEGUROS = { 'colorAvatar(emp.nombre)': 'PALETA_AVATAR: hex de la constante del código' }
  const sinComillas = [], enEvento = [], enUrl = [], enStyle = []
  const usadasCtx = new Set()
  for (const x of enHtml) {
    const ultimaEtiqueta = x.antes.lastIndexOf('<')
    if (ultimaEtiqueta < x.antes.lastIndexOf('>')) continue
    const tramo = x.antes.slice(ultimaEtiqueta)
    const dentroDeAtributo = (tramo.match(/"/g) || []).length % 2 === 1
    if (!dentroDeAtributo && /[\w-]+\s*=\s*$/.test(tramo)) sinComillas.push(x.linea)
    if (!dentroDeAtributo) continue
    const attr = (tramo.match(/([\w-]+)\s*=\s*"[^"]*$/) || [])[1] || ''
    const e = norm(x.expr)
    if (/^on/i.test(attr)) enEvento.push(`${x.linea} (${attr})`)
    if (/^(href|src|action|formaction|xlink:href)$/i.test(attr) && !/^encodeURIComponent\(/.test(e)) enUrl.push(`${x.linea} (${attr}: ${e})`)
    if (/^style$/i.test(attr)) {
      if (STYLE_SEGUROS[e]) usadasCtx.add('style::' + e); else enStyle.push(`${x.linea}: ${e}`)
    }
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae en un href/src sin encodeURIComponent', enUrl.length === 0, enUrl.join(', '))
  chk('estático: ninguna interpolación cae en un style (salvo el color del avatar, justificado)', enStyle.length === 0, enStyle.join(', '))
  const huerfanasCtx = Object.keys(STYLE_SEGUROS).map(k => 'style::' + k).filter(k => !usadasCtx.has(k))
  chk('estático: ninguna excepción de contexto quedó huérfana', huerfanasCtx.length === 0, huerfanasCtx.join(' | '))

  // Otros sinks que el escáner no mira.
  const script = scriptModulo(ARCHIVO)
  chk('estático: no hay insertAdjacentHTML, outerHTML, document.write ni innerHTML +=',
    !/insertAdjacentHTML|\.outerHTML\s*=|document\.write|innerHTML\s*\+=|createContextualFragment/.test(script))
  // La cabecera de la ficha va por textContent (nombre, email, iniciales).
  for (const id of ['ficha-nombre', 'ficha-email', 'ficha-avatar']) {
    chk(`estático: #${id} solo se escribe con textContent`,
      new RegExp(`getElementById\\('${id}'\\)\\.textContent\\s*=`).test(script) && !new RegExp(`getElementById\\('${id}'\\)\\.innerHTML`).test(script))
  }
  // Navegación: Empleados no lee parámetros de la URL, su única navegación por
  // código va a una ruta literal, y el único href de plantilla es literal.
  chk('estático: Empleados no lee parámetros de la URL', !/URLSearchParams|location\.search|location\.hash/.test(script))
  const navs = [...script.matchAll(/(?:location\.href\s*=|location\.replace\(|location\.assign\(|window\.open\()\s*([^\n;)]*)/g)].map(m => norm(m[1]))
  chk('estático: la única navegación por código es la literal al dashboard',
    navs.length === 1 && navs[0] === "'../dashboard.html'", navs.join(' | '))
  const hrefs = [...script.matchAll(/\bhref="([^"]*)"/g)].map(m => m[1])
  chk('estático: el único href de las plantillas es el literal accesos.html', hrefs.length === 1 && hrefs[0] === 'accesos.html', hrefs.join(' | '))
  chk('estático: ningún .src ni .href se asigna en runtime', !/\.(src|href)\s*=(?!=)/.test(script))

  // Empleados NO importa funciones de números de utils.js (por eso el preludio
  // no lleva fuenteNumeros()): si mañana las importa, esta suite hay que revisarla.
  chk('estático: de js/utils.js importa solo mostrarError, mostrarExito y formatearFecha',
    /import \{ mostrarError, mostrarExito, formatearFecha \} from '\.\.\/js\/utils\.js'/.test(script) &&
    (script.match(/from '\.\.\/js\/utils\.js'/g) || []).length === 1)

  chk('control: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(UTILS) && !/toast\.innerHTML\s*=/.test(UTILS))

  if (process.env.INFORME) {
    console.log(`INFORME: ${r.interpolaciones.length} interpolaciones, ${enHtml.length} en HTML (${conEsc} empiezan con esc), ${r.asignaciones.length} asignaciones a innerHTML`)
  }
}

for (const h of HALLAZGOS_ABIERTOS) console.log(`  (hallazgo abierto declarado: ${h})`)
fin()
