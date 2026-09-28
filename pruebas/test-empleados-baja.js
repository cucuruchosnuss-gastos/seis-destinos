// La BAJA DE EMPLEADOS en modulos/empleados.html (28/09/2026).
//
// La base ya lo resuelve: dar_de_baja_empleado(p_empleado_id, p_motivo) exige
// empleados:ver_editar, rechaza darse de baja a uno mismo y a un super_admin,
// pone activo = false y guarda baja_motivo / baja_por / baja_en (y si había
// cuenta, pierde el acceso al instante); reactivar_empleado(p_empleado_id) lo
// deshace. Esta suite EJECUTA el código real de la pantalla (sandbox armado
// por clausura desde los renders, como test-empleados-pin.js) y blinda:
//  - quién es "dado de baja": activo = false, SIN la Cuenta de Empresa (que
//    tiene activo = false a propósito) ni las cuentas 'sistema'; un activo
//    null o ausente sigue siendo una persona activa;
//  - el listado: los dados de baja NO aparecen salvo que se tilde "Mostrar
//    dados de baja" (apagado por defecto); cuando aparecen van en su grupo,
//    después de las personas y antes de las tablets, con el chip "Dado de
//    baja", el motivo y la fecha; no cuentan en las cifras; el interruptor
//    solo se dibuja si hay alguno y con empleados:ver_editar;
//  - la consulta trae a los inactivos (sin .eq('activo', true)) y las columnas
//    de la baja; el doble de Supabase de esta suite SÍ respeta los .eq(), así
//    que volver a filtrar activos en la consulta se ve;
//  - la ficha: "Dar de baja" solo con ver_editar, nunca en la propia, ni en un
//    super_admin, una tablet, la Empresa o una cuenta 'sistema'; el panel es la
//    confirmación (nada se manda hasta "Sí, dar de baja"); con cuenta avisa
//    "Pierde el acceso a la app al instante."; el motivo es opcional (vacío va
//    null); el error de la base se muestra TAL CUAL pegado a los botones; el
//    botón se traba solo mientras se manda; después de la baja se recarga y la
//    ficha muestra el estado nuevo;
//  - la ficha de un dado de baja: cuándo, por quién (aunque sea de otra unidad:
//    mapa de v_empleados_publico) y el motivo; "Reactivar" con confirmación,
//    el error tal cual, y al reactivar se vuelve a pedir el PIN; no se pide el
//    PIN de un dado de baja, no se ofrece editar nada ni los permisos;
//  - la fecha es la de Argentina (una baja a las 22 h no sale con el día
//    siguiente) y nunca "NaN";
//  - todo texto de la base (nombre, motivo, quién, el error) va escapado, y no
//    hay window.confirm ni prompt.
//
//   node pruebas/test-empleados-baja.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-empleados-baja.js

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { arnes, marca, escapada, chequearMarcas, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { preludioFabrica } = require('./fabrica-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/empleados.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const STUBS = new Set(['verificarSesion', 'mostrarBannerVersion', 'mostrarError', 'mostrarExito', 'formatearFecha'])
const RENDERS = ['abrirFicha', 'cerrarFicha', 'renderizarFicha', 'renderizarListado', 'renderizarStats', 'agruparEmpleados',
  'renderizarBaja', 'confirmarBaja', 'confirmarReactivar', 'cargarTodo', 'esDadoDeBaja', 'puedeDarDeBaja',
  'puedeReactivar', 'fechaBajaAr', 'resumenBaja', 'detalleBaja', 'dadosDeBajaVisibles', 'htmlSeccionPin', 'esc']

// La misma clausura que test-empleados-pin.js: desde los renders se arrastra
// todo lo que llaman, con su código REAL. Si una función deja de existir, el
// sandbox se arma sin ella y la prueba que la usa se pone en rojo.
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
        const corte = resto.slice(1).search(/\n {4}(?:const|let|function|async function|\/\/)/)
        mirar(resto.slice(0, corte === -1 ? 400 : corte + 1))
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

// El document falso: los botones que SOLO existen cuando su contenedor los
// dibuja no se pueden tocar si no están, y al redibujar el contenedor se van
// (con sus listeners), como en el navegador. Así "el panel está abierto" y
// "el botón existe" se prueban de verdad, no se suponen.
const PRELUDIO = `
${preludioFabrica()}
  var console = { log(){}, warn(){}, error(){} }
  var __focos = []
  var __els = new Map()
  var __dibujados = {
    'ficha-baja': ['btn-dar-baja', 'btn-baja-cancelar', 'btn-baja-confirmar', 'baja-motivo'],
    'ficha-estado-baja': ['btn-reactivar', 'btn-reactivar-cancelar', 'btn-reactivar-confirmar'],
    'ficha-pin': ['btn-pin-asignar', 'btn-pin-cancelar', 'btn-pin-guardar', 'pin-valor'],
    'ficha-acciones': ['btn-completar-datos'],
  }
  function __contenedorDe(id) {
    for (const [c, ids] of Object.entries(__dibujados)) if (ids.includes(id)) return c
    return null
  }
  function nuevoEl(id) {
    const el = {
      id, textContent: '', value: '', className: '', hidden: false, disabled: false, checked: false,
      title: '', type: '', dataset: {}, style: {}, __handlers: {}, __html: '',
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener(ev, f) { (el.__handlers[ev] = el.__handlers[ev] || []).push(f) },
      removeEventListener(){}, focus(){ __focos.push(id) }, click(){}, removeAttribute(){}, setAttribute(){},
      closest: () => null, remove(){}, appendChild(){}, append(){},
      classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    }
    Object.defineProperty(el, 'innerHTML', {
      get() { return el.__html },
      set(v) { el.__html = v; for (const k of (__dibujados[id] || [])) __els.delete(k) },
    })
    return el
  }
  function __existe(id) {
    const c = __contenedorDe(id)
    if (!c) return true
    return (__els.has(c) ? __els.get(c).innerHTML : '').includes('id="' + id + '"')
  }
  var document = {
    body: nuevoEl('body'),
    getElementById(id) { if (!__existe(id)) return null; if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null, addEventListener(){},
    createElement: (t) => nuevoEl('creado-' + t),
  }
  function __tocar(id) {
    const el = document.getElementById(id)
    if (!el) return Promise.resolve(false)
    return Promise.all((el.__handlers.click || []).slice().map(f => f())).then(() => true)
  }
  function __escribir(id, valor) {
    const el = document.getElementById(id)
    if (!el) return false
    el.value = valor
    for (const f of (el.__handlers.input || []).slice()) f({ target: el })
    return true
  }
  var lucide = { createIcons(){} }
  function setTimeout(f) { f() }
  // Supabase falso que RESPETA los .eq(): una consulta que vuelva a filtrar
  // activo = true deja afuera a los dados de baja, como en la base.
  var __datos = {}
  var __consultas = []
  function __consulta(tabla) {
    const reg = { tabla, select: null, eqs: [] }
    __consultas.push(reg)
    const q = { __uno: false }
    q.select = (s) => { reg.select = s; return q }
    q.eq = (c, v) => { reg.eqs.push([c, v]); return q }
    for (const k of ['neq', 'in', 'is', 'order', 'gte', 'lte', 'limit', 'or', 'not']) q[k] = () => q
    q.maybeSingle = () => { q.__uno = true; return q }
    q.then = (res, rej) => {
      let filas = q.__uno ? (__datos['__uno:' + tabla] ?? null) : (__datos[tabla] ?? [])
      if (!q.__uno && Array.isArray(filas)) filas = filas.filter(f => reg.eqs.every(([c, v]) => f[c] === v))
      return Promise.resolve({ data: filas, error: null }).then(res, rej)
    }
    return q
  }
  var __rpcs = []
  var __responder = async () => ({ data: null, error: null })
  var supabase = { from: (t) => __consulta(t), rpc: (n, a) => { __rpcs.push([n, a]); return __responder(n, a) } }
  var __llamadas = { errores: [], exitos: [] }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function formatearFecha(v) { return String(v ?? '') }
  function mostrarBannerVersion() {}
  async function verificarSesion() { return { user: { id: 'uid-yo' } } }
  var debounceBusquedaEmpleados
`

const RETORNO = 'estado, __els, __rpcs, __llamadas, __focos, __consultas, __tocar, __escribir, ' +
  '__el(id){ return document.getElementById(id) }, __html(id){ return (__els.get(id) || { innerHTML: "" }).innerHTML }, ' +
  '__responderCon(f){ __responder = f }, __setDatos(t, d){ __datos[t] = d }, __getDatos(t){ return __datos[t] }'

const esperar = () => new Promise(r => setImmediate(r))
const U1 = 'u-cn', U2 = 'u-dp'

function personas() {
  return [
    // Activas: una con cuenta y una sin.
    { id: 'p-ana', nombre: 'Ana Pérez', activo: true, tipo: 'naaloo', unidad_negocio_id: U1, auth_user_id: 'a-ana', rol_app: 'usuario', rol: 'Operaria' },
    { id: 'p-beto', nombre: 'Beto Díaz', activo: true, tipo: 'naaloo', unidad_negocio_id: U2, auth_user_id: null, rol_app: 'usuario', rol: 'Masero' },
    // activo null / ausente: siguen siendo personas activas (=== false estricto).
    { id: 'p-null', nombre: 'Nulo Activo', activo: null, tipo: 'naaloo', unidad_negocio_id: U1, auth_user_id: null, rol_app: 'usuario', rol: 'Op' },
    // Un super_admin y la propia fila.
    { id: 'p-jefe', nombre: 'Jefa Súper', activo: true, tipo: 'naaloo', unidad_negocio_id: U1, auth_user_id: 'a-jefe', rol_app: 'super_admin', rol: 'Dueña' },
    { id: 'yo', nombre: 'Yo Mismo', activo: true, tipo: 'naaloo', unidad_negocio_id: U1, auth_user_id: 'uid-yo', rol_app: 'usuario', rol: 'RRHH' },
    // Una tablet (sistema) y la Cuenta de Empresa (activo = false a propósito).
    { id: 't-cn', nombre: 'Tablet Producción · Cucuruchos Nuss', activo: true, tipo: 'sistema', es_dispositivo: true, unidad_negocio_id: U1, auth_user_id: 'a-t', rol_app: 'usuario' },
    { id: 'e-emp', nombre: 'Empresa', activo: false, tipo: 'empresa', unidad_negocio_id: null, auth_user_id: null, rol_app: 'usuario' },
    // Dos dados de baja: una en la app (con cuenta, motivo, fecha y quién) y una
    // que vino del Excel de Naaloo (sin motivo ni fecha).
    { id: 'b-caro', nombre: 'Caro Ruiz', activo: false, tipo: 'naaloo', unidad_negocio_id: U1, auth_user_id: 'a-caro', rol_app: 'usuario', rol: 'Op',
      baja_en_app: true, baja_motivo: 'Renunció', baja_por: 'x-otra', baja_en: '2026-09-29T01:30:00+00:00' },
    { id: 'b-naaloo', nombre: 'Dani Naaloo', activo: false, tipo: 'naaloo', unidad_negocio_id: U2, auth_user_id: null, rol_app: 'usuario', rol: 'Op',
      baja_en_app: false, baja_motivo: null, baja_por: null, baja_en: null },
    // Una cuenta 'sistema' inactiva (una tablet apagada) NO es un dado de baja.
    { id: 's-apagada', nombre: 'Tablet vieja', activo: false, tipo: 'sistema', es_dispositivo: true, unidad_negocio_id: U1, auth_user_id: 'a-s', rol_app: 'usuario' },
  ]
}

function preparar(E, { tareas = ['ver_editar'], rolApp = 'usuario' } = {}) {
  E.empleados = personas()
  E.empleadoModulos = []
  E.maestros.unidadesNegocio = [{ id: U1, nombre: 'Cucuruchos Nuss' }, { id: U2, nombre: 'Dolce Pasta' }]
  E.miEmpleado = { id: 'yo', rol_app: rolApp }
  E.misTareasEmpleados = new Set(tareas)
  E.filtros = { busqueda: '', mostrarBajas: false }
  // La fábrica "sin datos": los filtros de la fábrica de pruebas no sacan nada.
  E.fabrica = { ok: false, unidades: new Set(), personas: new Set(), soyDePrueba: false }
  // 'x-otra' es de una unidad que quien mira no lee en `empleados`: su nombre
  // sale del mapa de v_empleados_publico.
  E.nombres = new Map([['x-otra', 'Olga de Otra Unidad']])
  E.fichaAbierta = null
  E.pin = { empleadoId: null, cargando: false, datos: null, error: false, panel: false, guardando: false, error_texto: null }
  E.baja = { empleadoId: null, panel: null, motivo: '', enviando: false, error: null }
}

const idsDe = (grupos) => grupos.flatMap(g => g.lista.map(e => e.id))

async function correr(S) {
  const E = S.estado

  // ════════════════════════════════════════════════════════════════════════
  // Las reglas
  // ════════════════════════════════════════════════════════════════════════
  preparar(E)
  const P = Object.fromEntries(personas().map(p => [p.id, p]))
  chk('esDadoDeBaja: una persona con activo = false', S.esDadoDeBaja(P['b-caro']) === true && S.esDadoDeBaja(P['b-naaloo']) === true)
  chk('esDadoDeBaja: la Cuenta de Empresa (activo = false a propósito) NO', S.esDadoDeBaja(P['e-emp']) === false)
  chk('esDadoDeBaja: una cuenta sistema inactiva NO', S.esDadoDeBaja(P['s-apagada']) === false)
  chk('esDadoDeBaja: una persona activa NO', S.esDadoDeBaja(P['p-ana']) === false)
  chk('esDadoDeBaja: activo null o ausente NO (=== false estricto)',
    S.esDadoDeBaja(P['p-null']) === false && S.esDadoDeBaja({ id: 'z', tipo: 'naaloo' }) === false && S.esDadoDeBaja(null) === false)

  chk('puedeDarDeBaja: una persona activa, con ver_editar', S.puedeDarDeBaja(P['p-ana']) === true && S.puedeDarDeBaja(P['p-beto']) === true)
  chk('puedeDarDeBaja: activo null cuenta como activa', S.puedeDarDeBaja(P['p-null']) === true)
  chk('puedeDarDeBaja: NUNCA la ficha propia', S.puedeDarDeBaja(P['yo']) === false)
  chk('puedeDarDeBaja: NUNCA un super_admin', S.puedeDarDeBaja(P['p-jefe']) === false)
  chk('puedeDarDeBaja: nunca una tablet', S.puedeDarDeBaja(P['t-cn']) === false)
  // La regla de fondo es es_dispositivo, no el tipo: una tablet con otro tipo
  // tampoco se da de baja desde acá.
  chk('puedeDarDeBaja: nunca una tablet aunque su tipo no sea sistema',
    S.puedeDarDeBaja({ ...P['p-ana'], id: 'tab2', tipo: 'naaloo', es_dispositivo: true }) === false)
  chk('puedeDarDeBaja: nunca la Cuenta de Empresa', S.puedeDarDeBaja(P['e-emp']) === false)
  chk('puedeDarDeBaja: nunca una cuenta sistema aunque no sea tablet',
    S.puedeDarDeBaja({ ...P['p-ana'], id: 'robot', tipo: 'sistema', es_dispositivo: false }) === false)
  chk('puedeDarDeBaja: nunca a alguien ya dado de baja', S.puedeDarDeBaja(P['b-caro']) === false)
  chk('puedeReactivar: un dado de baja, con ver_editar', S.puedeReactivar(P['b-caro']) === true && S.puedeReactivar(P['b-naaloo']) === true)
  chk('puedeReactivar: nunca una persona activa ni la Empresa', S.puedeReactivar(P['p-ana']) === false && S.puedeReactivar(P['e-emp']) === false)
  E.misTareasEmpleados = new Set(['importar_naaloo'])
  chk('sin ver_editar: no se ofrece dar de baja', S.puedeDarDeBaja(P['p-ana']) === false)
  chk('sin ver_editar: no se ofrece reactivar', S.puedeReactivar(P['b-caro']) === false)
  E.miEmpleado = { id: 'yo', rol_app: 'super_admin' }
  E.misTareasEmpleados = new Set()
  chk('un super_admin que mira (bypass) puede dar de baja a una persona común', S.puedeDarDeBaja(P['p-ana']) === true)
  chk('…pero tampoco a otro super_admin', S.puedeDarDeBaja(P['p-jefe']) === false)

  // ── Las fechas ──────────────────────────────────────────────────────────
  chk('fechaBajaAr: el día de ARGENTINA (01:30 UTC del 29 es el 28 a las 22:30)', S.fechaBajaAr('2026-09-29T01:30:00+00:00') === '28/09/2026', S.fechaBajaAr('2026-09-29T01:30:00+00:00'))
  chk('fechaBajaAr: sin dato no dice nada', S.fechaBajaAr(null) === '' && S.fechaBajaAr(undefined) === '' && S.fechaBajaAr('') === '')
  chk('fechaBajaAr: un valor que no es fecha no dice "NaN"', S.fechaBajaAr('no es una fecha') === '')
  chk('resumenBaja: motivo y fecha', S.resumenBaja(P['b-caro']) === 'Renunció · desde el 28/09/2026', S.resumenBaja(P['b-caro']))
  chk('resumenBaja: una baja del Excel de Naaloo lo dice', S.resumenBaja(P['b-naaloo']) === 'Dado de baja en el Excel de Naaloo', S.resumenBaja(P['b-naaloo']))
  chk('resumenBaja: sin nada, "Sin motivo registrado"', S.resumenBaja({ activo: false, baja_en_app: true }) === 'Sin motivo registrado')
  preparar(E)
  chk('detalleBaja: fecha y quién, aunque quien sea de otra unidad (mapa de v_empleados_publico)',
    S.detalleBaja(P['b-caro']) === 'Desde el 28/09/2026 · por Olga de Otra Unidad', S.detalleBaja(P['b-caro']))
  chk('detalleBaja: quién sale primero de las filas de empleados',
    S.detalleBaja({ ...P['b-caro'], baja_por: 'p-ana' }) === 'Desde el 28/09/2026 · por Ana Pérez')
  chk('detalleBaja: una baja de Naaloo lo dice', S.detalleBaja(P['b-naaloo']) === 'La baja vino del Excel de Naaloo.')

  // ════════════════════════════════════════════════════════════════════════
  // El listado
  // ════════════════════════════════════════════════════════════════════════
  preparar(E)
  let grupos = S.agruparEmpleados()
  let ids = idsDe(grupos)
  chk('apagado: no hay grupo "Dados de baja"', !grupos.some(g => g.nombre === 'Dados de baja'), grupos.map(g => g.nombre).join())
  chk('apagado: ningún dado de baja aparece en ningún grupo', !ids.includes('b-caro') && !ids.includes('b-naaloo'), ids.join())
  chk('la Cuenta de Empresa no aparece nunca', !ids.includes('e-emp'))
  chk('una cuenta sistema inactiva no aparece', !ids.includes('s-apagada'))
  chk('las personas activas siguen en sus grupos (también la de activo null)', ['p-ana', 'p-beto', 'p-null', 'yo'].every(i => ids.includes(i)), ids.join())
  E.filtros.mostrarBajas = true
  grupos = S.agruparEmpleados()
  const gBajas = grupos.find(g => g.nombre === 'Dados de baja')
  chk('prendido: aparece el grupo "Dados de baja"', !!gBajas)
  chk('prendido: tiene exactamente a los dos dados de baja (ni la Empresa ni la tablet apagada)',
    gBajas && gBajas.lista.map(e => e.id).sort().join() === 'b-caro,b-naaloo', gBajas && gBajas.lista.map(e => e.id).join())
  const iB = grupos.findIndex(g => g.nombre === 'Dados de baja')
  const iT = grupos.findIndex(g => g.nombre === 'Tablets de la fábrica')
  const iU = grupos.findIndex(g => g.nombre === 'Cucuruchos Nuss')
  chk('prendido: después de las personas y antes de las tablets (que siguen al final)', iU >= 0 && iB > iU && iT === grupos.length - 1 && iB < iT, grupos.map(g => g.nombre).join(' | '))
  chk('prendido: un dado de baja NO aparece además en el grupo de su unidad',
    !grupos.find(g => g.nombre === 'Cucuruchos Nuss').lista.some(e => e.id === 'b-caro'))
  // Un valor raro en el interruptor no lo prende.
  E.filtros.mostrarBajas = 'sí'
  chk('el interruptor exige true', !S.agruparEmpleados().some(g => g.nombre === 'Dados de baja'))
  // Una persona de la FÁBRICA DE PRUEBAS dada de baja tampoco se ve para una
  // cuenta real (la misma regla que el resto del listado).
  preparar(E)
  E.empleados.push({ id: 'b-robot', nombre: 'Robot Dado de Baja', activo: false, tipo: 'naaloo', unidad_negocio_id: 'u-robot', auth_user_id: null, rol_app: 'usuario', baja_en_app: true })
  E.fabrica = { ok: true, unidades: new Set(['u-robot']), personas: new Set(['b-robot']), soyDePrueba: false }
  chk('fábrica de pruebas: su dado de baja no está entre los visibles', !S.dadosDeBajaVisibles().some(e => e.id === 'b-robot') && S.dadosDeBajaVisibles().length === 2)
  E.filtros.mostrarBajas = true
  chk('fábrica de pruebas: tampoco en el grupo', !idsDe(S.agruparEmpleados()).includes('b-robot'))
  E.fabrica = { ok: true, unidades: new Set(['u-robot']), personas: new Set(['b-robot']), soyDePrueba: true }
  chk('fábrica de pruebas: una cuenta de prueba sí lo ve', S.dadosDeBajaVisibles().some(e => e.id === 'b-robot'))

  // ── Las cifras ──────────────────────────────────────────────────────────
  preparar(E)
  E.filtros.mostrarBajas = true
  S.renderizarStats()
  const hS = S.__html('empleados-stats')
  const total = (hS.match(/Total empleados<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1]
  const acceso = (hS.match(/Con acceso a la app<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1]
  const empresas = (hS.match(/Empresas<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1]
  chk('cifras: el total es de personas ACTIVAS (5), sin dados de baja ni la Empresa', total === '5', total)
  chk('cifras: "Con acceso" no cuenta a un dado de baja con cuenta (3)', acceso === '3', acceso)
  chk('cifras: las empresas salen de personas activas (2)', empresas === '2', empresas)
  // Solo dados de baja en una unidad: esa unidad no cuenta como empresa.
  E.empleados = [{ ...P['p-ana'] }, { ...P['b-naaloo'] }]
  S.renderizarStats()
  chk('cifras: una unidad con solo dados de baja no cuenta como empresa',
    (S.__html('empleados-stats').match(/Empresas<\/div>\s*<div class="stat-card__valor">(\d+)/) || [])[1] === '1')

  // ── El interruptor ──────────────────────────────────────────────────────
  preparar(E)
  S.renderizarListado()
  const inter = S.__el('empleados-toolbar-bajas')
  chk('interruptor: se dibuja si hay dados de baja', inter.hidden === false)
  chk('interruptor: dice cuántos hay (2)', S.__el('contador-bajas').textContent === '(2)', S.__el('contador-bajas').textContent)
  chk('interruptor: arranca APAGADO', S.__el('filtro-mostrar-bajas').checked === false)
  chk('listado apagado: no se dibuja ningún dado de baja', !/Caro Ruiz|Dani Naaloo/.test(S.__html('lista-empleados')))
  E.filtros.mostrarBajas = true
  S.renderizarListado()
  const lista = S.__html('lista-empleados')
  chk('listado prendido: el grupo y sus filas', /Dados de baja/.test(lista) && /Caro Ruiz/.test(lista) && /Dani Naaloo/.test(lista))
  chk('listado prendido: la fila dice "Dado de baja"', /<span class="chip-baja">Dado de baja<\/span>/.test(lista))
  chk('listado prendido: con el motivo y la fecha', lista.includes('Renunció · desde el 28/09/2026'))
  chk('listado prendido: la fila del dado de baja NO lleva chip de rol ni "Sin acceso"',
    !/Caro Ruiz<\/span>\s*<span class="chip-rol/.test(lista) && !/Dani Naaloo<\/span>\s*<span class="chip-sin-acceso/.test(lista))
  chk('listado prendido: la casilla queda tildada', S.__el('filtro-mostrar-bajas').checked === true)
  E.filtros.busqueda = 'caro'
  S.renderizarListado()
  chk('el buscador también filtra a los dados de baja', /Caro Ruiz/.test(S.__html('lista-empleados')) && !/Dani Naaloo/.test(S.__html('lista-empleados')))
  // Sin dados de baja el interruptor no aparece.
  preparar(E)
  E.empleados = E.empleados.filter(e => e.activo !== false)
  S.renderizarListado()
  chk('interruptor: sin dados de baja no se dibuja', S.__el('empleados-toolbar-bajas').hidden === true)
  chk('interruptor: sin dados de baja no dice ningún número', S.__el('contador-bajas').textContent === '')
  // Sin ver_editar tampoco (el RLS igual no los traería).
  preparar(E, { tareas: ['importar_naaloo'] })
  S.renderizarListado()
  chk('interruptor: sin empleados:ver_editar no se dibuja', S.__el('empleados-toolbar-bajas').hidden === true)

  // ════════════════════════════════════════════════════════════════════════
  // La consulta
  // ════════════════════════════════════════════════════════════════════════
  preparar(E)
  S.__setDatos('empleados', personas())
  S.__setDatos('empleado_modulos', [])
  S.__setDatos('unidades_negocio', E.maestros.unidadesNegocio)
  S.__setDatos('v_empleados_publico', [{ id: 'x-otra', nombre: 'Olga Recargada' }])
  await S.cargarTodo()
  const qEmp = S.__consultas.filter(c => c.tabla === 'empleados').pop()
  chk('la consulta de empleados NO filtra activo (los dados de baja hacen falta)', qEmp && !qEmp.eqs.some(([c]) => c === 'activo'), JSON.stringify(qEmp && qEmp.eqs))
  chk('cargarTodo trae a los dados de baja al estado', E.empleados.some(e => e.id === 'b-caro'))
  for (const col of ['activo', 'baja_en_app', 'baja_motivo', 'baja_por', 'baja_en']) {
    chk(`la consulta trae ${col}`, qEmp && new RegExp(`\\b${col}\\b`).test(qEmp.select || ''), qEmp && qEmp.select)
  }
  chk('cargarTodo arma el mapa de nombres de v_empleados_publico', E.nombres.get('x-otra') === 'Olga Recargada')
  const qNom = S.__consultas.filter(c => c.tabla === 'v_empleados_publico').pop()
  chk('el mapa de nombres NO filtra activo (quien dio de baja pudo quedar de baja)', qNom && !qNom.eqs.some(([c]) => c === 'activo'))
  // El doble del .select() no mira columnas: sobre el fuente.
  chk('sobre el fuente: la consulta de empleados trae las columnas de la baja',
    /from\('empleados'\)\s*\n?\s*\.select\('[^']*\bbaja_en_app, baja_motivo, baja_por, baja_en\b[^']*'\)/.test(FUENTE))

  // ════════════════════════════════════════════════════════════════════════
  // La ficha de una persona activa: dar de baja
  // ════════════════════════════════════════════════════════════════════════
  preparar(E)
  S.__setDatos('empleados', personas())
  S.__responderCon(async () => ({ data: null, error: null }))
  S.abrirFicha('p-ana')
  await esperar()
  chk('activa: "Dar de baja" está en la ficha', /id="btn-dar-baja"/.test(S.__html('ficha-baja')))
  chk('activa: arriba no hay estado de baja', S.__html('ficha-estado-baja') === '')
  chk('activa: todavía no hay panel ni se mandó nada', !/btn-baja-confirmar/.test(S.__html('ficha-baja')) && !S.__rpcs.some(r => r[0] === 'dar_de_baja_empleado'))
  await S.__tocar('btn-dar-baja')
  let hB = S.__html('ficha-baja')
  chk('tocar "Dar de baja" abre el panel de confirmación', /id="btn-baja-confirmar"/.test(hB) && /id="baja-motivo"/.test(hB))
  chk('el panel pregunta por la persona', /¿Dar de baja a Ana Pérez\?/.test(hB))
  chk('con cuenta: avisa "Pierde el acceso a la app al instante."', hB.includes('Pierde el acceso a la app al instante.'))
  chk('el motivo es opcional y lo dice', /Motivo \(opcional\)/.test(hB))
  chk('abrir el panel todavía NO manda nada', !S.__rpcs.some(r => r[0] === 'dar_de_baja_empleado'))
  chk('el foco va al motivo', S.__focos.includes('baja-motivo'))
  // Cancelar cierra el panel sin mandar.
  await S.__tocar('btn-baja-cancelar')
  chk('Cancelar vuelve al botón sin mandar', /id="btn-dar-baja"/.test(S.__html('ficha-baja')) && !S.__rpcs.some(r => r[0] === 'dar_de_baja_empleado'))

  // Sin cuenta: no avisa del acceso.
  S.abrirFicha('p-beto')
  await S.__tocar('btn-dar-baja')
  chk('sin cuenta: NO dice que pierde el acceso', !S.__html('ficha-baja').includes('Pierde el acceso'))
  // Lo tipeado en el motivo sobrevive a un redibujo de la ficha (una recarga
  // que termina mientras se escribe): se guarda en el estado al tipear.
  S.__escribir('baja-motivo', 'Cambio de trabajo')
  S.renderizarFicha()
  chk('el motivo tipeado sobrevive a un redibujo', S.__html('ficha-baja').includes('value="Cambio de trabajo"') && E.baja.panel === 'baja')

  // El error de la base, TAL CUAL y pegado a los botones.
  S.abrirFicha('p-ana')
  await S.__tocar('btn-dar-baja')
  S.__escribir('baja-motivo', '  Terminó el contrato  ')
  const msjBase = 'No podés darte de baja a vos mismo.' + marca('error_base')
  S.__responderCon(async (n) => (n === 'dar_de_baja_empleado' ? { data: null, error: { message: msjBase } } : { data: null, error: null }))
  await S.__tocar('btn-baja-confirmar')
  let llamada = S.__rpcs.filter(r => r[0] === 'dar_de_baja_empleado').pop()
  chk('confirmar llama a dar_de_baja_empleado con la persona', llamada && llamada[1].p_empleado_id === 'p-ana', JSON.stringify(llamada))
  chk('el motivo viaja sin espacios en los bordes', llamada && llamada[1].p_motivo === 'Terminó el contrato', JSON.stringify(llamada && llamada[1]))
  hB = S.__html('ficha-baja')
  chk('el error de la base se muestra TAL CUAL (escapado)', hB.includes(S.esc(msjBase)))
  chequearMarcas(chk, 'panel de baja con el error', hB, ['error_base'])
  const iErr = hB.indexOf('ficha-baja__error'), iMot = hB.indexOf('id="baja-motivo"'), iBot = hB.indexOf('id="btn-baja-confirmar"')
  chk('el error va PEGADO a los botones: debajo del motivo y antes de "Sí, dar de baja"', iMot >= 0 && iErr > iMot && iBot > iErr, `${iMot} ${iErr} ${iBot}`)
  chk('después del error el botón NO queda trabado', !/id="btn-baja-confirmar" disabled/.test(hB))
  chk('después del error el motivo tipeado sigue en el campo', hB.includes('value="Terminó el contrato"'))
  chk('el error no va a un cartel suelto', S.__llamadas.errores.length === 0, S.__llamadas.errores.join(' | '))

  // Una caída de red tampoco deja el botón trabado.
  S.__responderCon(async (n) => { if (n === 'dar_de_baja_empleado') throw new Error('Failed to fetch'); return { data: null, error: null } })
  await S.__tocar('btn-baja-confirmar')
  hB = S.__html('ficha-baja')
  chk('una caída de red se dice y el botón vuelve', /Failed to fetch/.test(hB) && !/id="btn-baja-confirmar" disabled/.test(hB))

  // Mientras se manda, el botón se traba y un segundo toque no manda otra vez.
  // El doble guarda TODOS los que esperan (no uno): con uno solo, un segundo
  // envío pisaría al primero y la suite se colgaría en vez de fallar.
  const soltadores = []
  S.__responderCon((n) => (n === 'dar_de_baja_empleado' ? new Promise(r => soltadores.push(r)) : Promise.resolve({ data: null, error: null })))
  const antes = S.__rpcs.filter(r => r[0] === 'dar_de_baja_empleado').length
  const p1 = S.__tocar('btn-baja-confirmar')
  await esperar()
  chk('mientras se manda, el botón está trabado', /id="btn-baja-confirmar" disabled/.test(S.__html('ficha-baja')))
  const p2 = S.confirmarBaja()
  await esperar()
  chk('un segundo toque mientras se manda NO manda otra vez', S.__rpcs.filter(r => r[0] === 'dar_de_baja_empleado').length === antes + 1)
  for (const soltar of soltadores) soltar({ data: null, error: { message: 'x' } })
  await Promise.all([p1, p2])
  // Motivo vacío: viaja null.
  S.__escribir('baja-motivo', '   ')
  S.__responderCon(async () => ({ data: null, error: { message: 'otra vez' } }))
  await S.__tocar('btn-baja-confirmar')
  llamada = S.__rpcs.filter(r => r[0] === 'dar_de_baja_empleado').pop()
  chk('un motivo vacío viaja como null (la base lo acepta así)', llamada && llamada[1].p_motivo === null, JSON.stringify(llamada && llamada[1]))

  // Éxito: recarga, el cartel dice que perdió el acceso, y la ficha muestra el estado nuevo.
  const datos = personas()
  S.__setDatos('empleados', datos)
  S.__setDatos('v_empleados_publico', [{ id: 'yo', nombre: 'Yo Mismo' }])
  S.__responderCon(async (n, a) => {
    if (n === 'dar_de_baja_empleado') {
      const f = datos.find(d => d.id === a.p_empleado_id)
      Object.assign(f, { activo: false, baja_en_app: true, baja_motivo: a.p_motivo, baja_por: 'yo', baja_en: '2026-09-28T15:00:00+00:00' })
      return { data: { tenia_cuenta: true }, error: null }
    }
    return { data: null, error: null }
  })
  S.__escribir('baja-motivo', 'Se jubiló')
  const consultasAntes = S.__consultas.length
  await S.__tocar('btn-baja-confirmar')
  await esperar()
  chk('éxito: el cartel dice que ya no puede entrar a la app (tenía cuenta)',
    S.__llamadas.exitos.some(m => m === 'Ana Pérez quedó dado de baja y ya no puede entrar a la app.'), S.__llamadas.exitos.join(' | '))
  chk('éxito: se vuelve a cargar el listado', S.__consultas.slice(consultasAntes).some(c => c.tabla === 'empleados'))
  chk('éxito: la ficha queda abierta y muestra "Dado de baja"', E.fichaAbierta === 'p-ana' && /chip-baja/.test(S.__html('ficha-estado-baja')))
  chk('éxito: con el motivo nuevo y quién', /Motivo: Se jubiló/.test(S.__html('ficha-estado-baja')) && /por Yo Mismo/.test(S.__html('ficha-estado-baja')), S.__html('ficha-estado-baja'))
  chk('éxito: ya no se ofrece "Dar de baja"', S.__html('ficha-baja') === '')
  chk('éxito: el panel quedó cerrado', E.baja.panel === null && E.baja.enviando === false)
  // Sin cuenta, el cartel no habla del acceso.
  S.__setDatos('empleados', personas())
  await S.cargarTodo()
  S.__responderCon(async (n) => (n === 'dar_de_baja_empleado' ? { data: { tenia_cuenta: false }, error: null } : { data: null, error: null }))
  S.abrirFicha('p-beto')
  await S.__tocar('btn-dar-baja')
  await S.__tocar('btn-baja-confirmar')
  chk('éxito sin cuenta: el cartel no habla del acceso', S.__llamadas.exitos.includes('Beto Díaz quedó dado de baja.'), S.__llamadas.exitos.join(' | '))

  // ── Dónde NO se ofrece ─────────────────────────────────────────────────
  preparar(E)
  for (const [id, que] of [['yo', 'la ficha propia'], ['p-jefe', 'un super_admin'], ['t-cn', 'una tablet'], ['e-emp', 'la Cuenta de Empresa']]) {
    S.abrirFicha(id)
    chk(`no se ofrece en ${que}`, !/btn-dar-baja/.test(S.__html('ficha-baja')))
  }
  preparar(E, { tareas: ['importar_naaloo'] })
  S.abrirFicha('p-ana')
  chk('sin empleados:ver_editar no se ofrece', !/btn-dar-baja/.test(S.__html('ficha-baja')))
  // Si igual se llamara, confirmarBaja no manda nada.
  E.baja = { empleadoId: 'p-ana', panel: 'baja', motivo: '', enviando: false, error: null }
  const nRpc = S.__rpcs.length
  await S.confirmarBaja()
  chk('sin permiso, confirmarBaja no llama a la base', S.__rpcs.length === nRpc)

  // ════════════════════════════════════════════════════════════════════════
  // La ficha de un dado de baja: el estado y reactivar
  // ════════════════════════════════════════════════════════════════════════
  preparar(E)
  const pinAntes = S.__rpcs.filter(r => r[0] === 'estado_pin_produccion').length
  S.__responderCon(async () => ({ data: { tiene_pin: true, debe_cambiar: false, puede_asignar: true }, error: null }))
  S.abrirFicha('b-caro')
  await esperar()
  chk('dado de baja: NO se le pregunta el PIN a la base', S.__rpcs.filter(r => r[0] === 'estado_pin_produccion').length === pinAntes)
  E.pin = { empleadoId: 'b-caro', cargando: false, error: false, datos: { tiene_pin: true, puede_asignar: true }, panel: false, guardando: false, error_texto: null }
  chk('dado de baja: la sección del PIN no se dibuja aunque la base conteste', S.htmlSeccionPin() === '')
  let hE = S.__html('ficha-estado-baja')
  chk('dado de baja: arriba dice "Dado de baja"', /<span class="chip-baja">Dado de baja<\/span>/.test(hE))
  chk('dado de baja: desde cuándo y por quién', hE.includes('Desde el 28/09/2026 · por Olga de Otra Unidad'), hE)
  chk('dado de baja: el motivo', hE.includes('Motivo: Renunció'))
  chk('dado de baja: "Reactivar"', /id="btn-reactivar"/.test(hE))
  chk('dado de baja: no se ofrece "Dar de baja" otra vez', S.__html('ficha-baja') === '')
  chk('dado de baja: no se ofrece editar el contacto', S.__el('btn-editar-contacto').hidden === true)
  chk('dado de baja: no se ofrece editar los permisos', !/accesos\.html/.test(S.__html('ficha-acciones')))
  chk('dado de baja con cuenta: el acceso NO dice "Tiene acceso"', !/Tiene acceso/.test(S.__html('ficha-acceso')) && /no puede entrar a la app mientras esté dado de baja/.test(S.__html('ficha-acceso')))
  await S.__tocar('btn-reactivar')
  hE = S.__html('ficha-estado-baja')
  chk('"Reactivar" abre la confirmación', /id="btn-reactivar-confirmar"/.test(hE) && /¿Reactivar a Caro Ruiz\?/.test(hE))
  chk('con cuenta: dice que vuelve a entrar con sus permisos', hE.includes('puede volver a entrar a la app con los permisos que tenía'))
  chk('una baja de la app no habla de Naaloo', !/Naaloo/.test(hE))
  chk('abrir la confirmación no manda nada', !S.__rpcs.some(r => r[0] === 'reactivar_empleado'))
  await S.__tocar('btn-reactivar-cancelar')
  chk('Cancelar cierra la confirmación sin mandar', /id="btn-reactivar"/.test(S.__html('ficha-estado-baja')) && !S.__rpcs.some(r => r[0] === 'reactivar_empleado'))
  await S.__tocar('btn-reactivar')
  const msjReact = 'No tenés permiso.' + marca('error_react')
  S.__responderCon(async (n) => (n === 'reactivar_empleado' ? { data: null, error: { message: msjReact } } : { data: null, error: null }))
  await S.__tocar('btn-reactivar-confirmar')
  llamada = S.__rpcs.filter(r => r[0] === 'reactivar_empleado').pop()
  chk('confirmar llama a reactivar_empleado con la persona', llamada && llamada[1].p_empleado_id === 'b-caro' && Object.keys(llamada[1]).length === 1, JSON.stringify(llamada))
  hE = S.__html('ficha-estado-baja')
  chk('reactivar: el error de la base TAL CUAL, pegado a los botones', hE.includes(S.esc(msjReact)) &&
    hE.indexOf('ficha-baja__error') < hE.indexOf('id="btn-reactivar-confirmar"') && hE.indexOf('ficha-baja__error') > 0)
  chequearMarcas(chk, 'confirmación de reactivar con el error', hE, ['error_react'])
  chk('reactivar: después del error el botón no queda trabado', !/id="btn-reactivar-confirmar" disabled/.test(hE))
  // Éxito: vuelve a estar activo y se pide el PIN.
  const datosR = personas()
  S.__setDatos('empleados', datosR)
  S.__responderCon(async (n, a) => {
    if (n === 'reactivar_empleado') {
      Object.assign(datosR.find(d => d.id === a.p_empleado_id), { activo: true, baja_en_app: false, baja_motivo: null, baja_por: null, baja_en: null })
      return { data: null, error: null }
    }
    if (n === 'estado_pin_produccion') return { data: { tiene_pin: false, debe_cambiar: false, puede_asignar: false }, error: null }
    return { data: null, error: null }
  })
  const pinesAntes = S.__rpcs.filter(r => r[0] === 'estado_pin_produccion').length
  await S.__tocar('btn-reactivar-confirmar')
  await esperar()
  chk('reactivar: el cartel lo dice', S.__llamadas.exitos.includes('Caro Ruiz volvió a estar activo.'), S.__llamadas.exitos.join(' | '))
  chk('reactivar: la ficha ya no dice "Dado de baja"', S.__html('ficha-estado-baja') === '')
  chk('reactivar: vuelve a ofrecer "Dar de baja"', /id="btn-dar-baja"/.test(S.__html('ficha-baja')))
  chk('reactivar: se le vuelve a preguntar el PIN a la base',
    S.__rpcs.filter(r => r[0] === 'estado_pin_produccion').length === pinesAntes + 1 &&
    S.__rpcs.filter(r => r[0] === 'estado_pin_produccion').pop()[1].p_empleado_id === 'b-caro')

  // La baja que vino de Naaloo: lo avisa al reactivar.
  preparar(E)
  S.abrirFicha('b-naaloo')
  hE = S.__html('ficha-estado-baja')
  chk('baja de Naaloo: lo dice arriba', hE.includes('La baja vino del Excel de Naaloo.'))
  chk('baja de Naaloo: sin motivo no dibuja "Motivo:"', !/Motivo:/.test(hE))
  await S.__tocar('btn-reactivar')
  chk('baja de Naaloo: al reactivar avisa que la próxima importación la vuelve a dar de baja',
    /la próxima importación la vuelve a dar de baja/.test(S.__html('ficha-estado-baja')))
  chk('sin cuenta: no promete que vuelve a entrar', !/volver a entrar/.test(S.__html('ficha-estado-baja')))
  // Sin ver_editar: el estado se ve, "Reactivar" no.
  preparar(E, { tareas: ['importar_naaloo'] })
  S.abrirFicha('b-caro')
  chk('sin ver_editar: se ve el estado pero no "Reactivar"', /chip-baja/.test(S.__html('ficha-estado-baja')) && !/btn-reactivar/.test(S.__html('ficha-estado-baja')))
  // Si igual se llamara, confirmarReactivar no manda nada.
  E.baja = { empleadoId: 'b-caro', panel: 'reactivar', motivo: '', enviando: false, error: null }
  const nReact = S.__rpcs.length
  await S.confirmarReactivar()
  chk('sin permiso, confirmarReactivar no llama a la base', S.__rpcs.length === nReact)
  // Cerrar la ficha limpia el panel.
  preparar(E)
  S.abrirFicha('b-caro')
  await S.__tocar('btn-reactivar')
  S.cerrarFicha()
  chk('cerrar la ficha limpia el panel', E.baja.empleadoId === null && E.baja.panel === null)

  // ════════════════════════════════════════════════════════════════════════
  // Escapado: nombre, motivo y quién, en el listado y en la ficha
  // ════════════════════════════════════════════════════════════════════════
  preparar(E)
  E.nombres = new Map([['x-otra', 'Olga' + marca('quien')]])
  E.empleados = [
    { ...P['p-ana'], id: 'p' + marca('p_id'), nombre: 'Ana' + marca('p_nombre') },
    { ...P['b-caro'], id: 'b' + marca('b_id'), nombre: 'Caro' + marca('b_nombre'), baja_motivo: 'Renunció' + marca('b_motivo') },
  ]
  E.filtros.mostrarBajas = true
  S.renderizarListado()
  chequearMarcas(chk, 'listado con dados de baja', S.__html('lista-empleados'), ['b_id', 'b_nombre', 'b_motivo'])
  S.abrirFicha(E.empleados[1].id)
  chequearMarcas(chk, 'ficha de un dado de baja', S.__html('ficha-estado-baja'), ['quien', 'b_motivo'])
  await S.__tocar('btn-reactivar')
  chequearMarcas(chk, 'confirmación de reactivar', S.__html('ficha-estado-baja'), ['b_nombre'])
  S.abrirFicha(E.empleados[0].id)
  await S.__tocar('btn-dar-baja')
  S.__escribir('baja-motivo', 'Motivo' + marca('motivo_tipeado'))
  S.__responderCon(async () => ({ data: null, error: { message: 'no' } }))
  await S.__tocar('btn-baja-confirmar')
  chequearMarcas(chk, 'panel de baja (nombre y motivo tipeado en value=)', S.__html('ficha-baja'), ['p_nombre', 'motivo_tipeado'])

  // ════════════════════════════════════════════════════════════════════════
  // Sobre el fuente
  // ════════════════════════════════════════════════════════════════════════
  const script = scriptModulo(ARCHIVO)
  chk('sin window.confirm ni prompt (el panel ES la confirmación)', !/\b(window\.)?(confirm|prompt)\s*\(/.test(script))
  chk('el interruptor está en el HTML, apagado (sin checked)', /<input type="checkbox" id="filtro-mostrar-bajas">/.test(FUENTE))
  chk('el interruptor arranca oculto en el HTML', /<label class="empleados-toolbar__bajas" id="empleados-toolbar-bajas" hidden>/.test(FUENTE))
  chk('el interruptor se escucha y guarda true/false en el estado',
    /getElementById\('filtro-mostrar-bajas'\)\.addEventListener\('change', \(e\) => \{\s*estado\.filtros\.mostrarBajas = e\.target\.checked === true\s*renderizarListado\(\)/.test(script))
  chk('el estado arranca con el interruptor apagado', /filtros:\s+\{ busqueda: '', mostrarBajas: false \}/.test(script))
  chk('los contenedores de la ficha existen', /<div id="ficha-estado-baja"><\/div>/.test(FUENTE) && /<div id="ficha-baja"><\/div>/.test(FUENTE))
}

let S
try {
  const { funciones, constantes } = clausura(scriptModulo(ARCHIVO))
  S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones, constantes, retorno: RETORNO })
} catch (e) {
  chk('el sandbox se arma con las funciones reales del archivo', false, String(e && e.stack || e))
}
// Un await que no vuelve nunca (un doble que no contesta, un botón que no se
// dibujó) haría terminar la suite SIN imprimir y con código 0, y el runner de
// mutaciones lo contaría como "escapó". Con el tope, un cuelgue es ROJO.
if (S) {
  esperas.push(Promise.race([
    correr(S),
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('la suite se colgó: un await no volvió nunca')), 15000)),
  ]))
}

fin()
