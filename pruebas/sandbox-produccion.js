// Arma un sandbox con las funciones REALES de modulos/produccion.html.
// Se EJECUTAN: una assertion sobre el call site no dice nada del callee, y el
// único test que prueba que un helper existe es correr el código.
//
// El DOM es falso pero guarda lo que se le escribe (innerHTML, textContent,
// hidden, disabled, value, dataset), y supabase es un doble que:
//  - devuelve lo que la suite ponga en __tablas[tabla] (un array, o una función
//    que recibe los filtros aplicados y devuelve { data, error });
//  - anota cada rpc en __llamadas.rpc como [nombre, parámetros] y responde con
//    __rpc(nombre, parámetros), que la suite reemplaza con __setRpc().
// localStorage es un Map en memoria, y crypto.randomUUID devuelve uuid-1,
// uuid-2… para poder afirmar CUÁNTOS se generaron.

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

// TODAS las funciones que las suites ejecutan. Crece con cada sub-parte: se
// cargan juntas porque una llama a la otra (siguientePaso → entrarAlModo → …) y
// una que falte tiene que tirar ReferenceError acá, no en la tablet.
const FUNCIONES_BASE = [
  'esc', 'tieneTarea', 'unidadesCon',
  // B2: preferencias, ¿Quién sos?, navegación
  'leerPreferencia', 'guardarPreferencia', 'modoGuardado', 'unidadInicial',
  'personasParaPuesto', 'htmlBotonPersona', 'htmlAvisoPuestos',
  'mostrarVista', 'pintarCabecera', 'cerrarMenu', 'alternarMenu', 'siguientePaso',
  'mostrarElegirUnidad', 'elegirUnidad', 'elegirModo', 'mostrarQuien', 'elegirPersona',
  'cambiarDePersona', 'accionDelMenu', 'entrarAlModo', 'unidadesDeCarga',
  // B3: fechas, pantalla encendida, tablero y abrir turno
  'hoyArgentina', 'horaArgentina', 'horaDelDiaAr', 'turnoSegunHora', 'mantenerPantalla',
  'leerTablero', 'estadoMaquinas', 'textoMasas', 'textoEstadoMaquina', 'htmlMaquina', 'mostrarTablero',
  'formularioAbrirVacio', 'htmlOpcionesOperario', 'htmlFilaAbrir', 'faltanParaAbrir', 'parametrosAbrirTurnos',
  'mostrarAbrir', 'pintarAbrir', 'pintarBotonAbrir', 'confirmarAbrir', 'htmlLotesAsignados', 'abrirPlanilla',
]

const CONSTANTES_BASE = [
  'TAREAS_PRODUCCION', 'puedeEntrar',
  'CLAVE_MODO', 'CLAVE_UNIDAD', 'PUESTO_DE_MODO', 'TITULO_DE_MODO', 'PLURAL_PUESTO', 'VISTAS',
  'ZONA_AR', 'TURNOS', 'SIN_OPERARIO',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const clases = new Set()
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, checked: false, dataset: {}, style: {}, title: '', type: 'text',
      options: [], atributos: {},
      setAttribute(k, v) { this.atributos[k] = String(v) },
      getAttribute(k) { return this.atributos[k] ?? null },
      removeAttribute(k) { delete this.atributos[k] },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {}, focus: () => {}, scrollIntoView: () => {},
      closest: () => null, appendChild: () => {},
      classList: { add(c){ clases.add(c) }, remove(c){ clases.delete(c) }, toggle(c, f){ (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) }, contains(c){ return clases.has(c) } },
    }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
    createElement: () => nuevoEl('creado'),
    addEventListener: () => {}, visibilityState: 'visible',
  }
  var location = { href: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/produccion.html', search: '', pathname: '/seis-destinos/modulos/produccion.html' }
  var __ls = new Map()
  var localStorage = {
    getItem(k) { return __ls.has(k) ? __ls.get(k) : null },
    setItem(k, v) { __ls.set(k, String(v)) },
    removeItem(k) { __ls.delete(k) },
    key(i) { return [...__ls.keys()][i] ?? null },
    get length() { return __ls.size },
  }
  // let del módulo (extraerConst solo toma const).
  var bloqueoPantalla = null
  var __uuids = 0
  var crypto = { randomUUID() { __uuids++; return 'uuid-' + __uuids } }
  var navigator = { onLine: true, wakeLock: null }
  var window = { location, scrollTo(){}, addEventListener(){}, lucide: null, confirm: () => true }
  var history = { replaceState(){}, pushState(){}, back(){} }
  function setTimeout(f) { return 0 } function clearTimeout(){} function setInterval(){ return 0 } function clearInterval(){}

  var __llamadas = { rpc: [], errores: [], exitos: [], consultas: [] }
  var __tablas = {}
  var __rpc = async () => ({ data: null, error: null })
  var supabase = {
    from(tabla) {
      const filtros = []
      const q = {
        select(c) { filtros.push(['select', c]); return q }, eq(a, b) { filtros.push(['eq', a, b]); return q },
        in(a, b) { filtros.push(['in', a, b]); return q }, order() { return q }, range() { return q },
        gte(a, b) { filtros.push(['gte', a, b]); return q }, lte(a, b) { filtros.push(['lte', a, b]); return q },
        is(a, b) { filtros.push(['is', a, b]); return q }, limit() { return q }, maybeSingle() { filtros.push(['single']); return q },
        not() { return q }, neq(a, b) { filtros.push(['neq', a, b]); return q },
        then(res, rej) {
          __llamadas.consultas.push([tabla, filtros])
          const t = __tablas[tabla]
          let r = typeof t === 'function' ? t(filtros) : { data: t ?? [], error: null }
          if (filtros.some(f => f[0] === 'single') && Array.isArray(r.data)) r = { ...r, data: r.data[0] ?? null }
          return Promise.resolve(r).then(res, rej)
        },
      }
      return q
    },
    rpc(nombre, params) { __llamadas.rpc.push([nombre, params]); return Promise.resolve(__rpc(nombre, params)) },
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }

  var estado = {
    sesion: { user: { id: 'uid-tablet' } },
    miEmpleadoId: 'emp-tablet', miRolApp: 'usuario',
    misTareas: new Map([['cargar', { unidades: ['u-cn'] }]]),
    unidades: new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta']]),
    unidadId: 'u-cn', unidadesPosibles: ['u-cn'], modo: null, persona: null, personal: [],
    tablero: null, hayTurnoAbierto: false, abrir: null, abrirOperarios: [], abriendo: false,
  }
`

function construirProduccion(ruta, { funciones = [], constantes = [], preludioExtra = '' } = {}) {
  const todasConst = [...CONSTANTES_BASE, ...constantes]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioExtra,
    funciones: [...FUNCIONES_BASE, ...funciones],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __llamadas, __ls, localStorage,
      __tablas, __setRpc(f){ __rpc = f }, __uuids(){ return __uuids }, __nav: navigator`,
  })
}

module.exports = { construirProduccion, FUNCIONES_BASE, CONSTANTES_BASE }
