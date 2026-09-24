// Arma un sandbox con las funciones REALES de modulos/pedidos.html.
// Se EJECUTAN: una assertion sobre el call site no dice nada del callee, y el
// único test que prueba que un helper existe es correr el código.
//
// El DOM es falso pero guarda lo que se le escribe (innerHTML, textContent,
// hidden, disabled, value, checked, dataset), y supabase es un doble que:
//  - devuelve lo que la suite ponga en __tablas[tabla] (un array, o una función
//    que recibe los filtros aplicados y devuelve { data, error });
//  - anota cada rpc en __llamadas.rpc como [nombre, parámetros] y responde con
//    __rpc(nombre, parámetros), que la suite reemplaza con __setRpc().
// OJO: el doble IGNORA el .select(): una columna que falte en la consulta no
// se ve acá. Lo que importa de un select se afirma sobre __llamadas.consultas.

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

// TODAS las funciones que las suites ejecutan. Crece con cada parte.
const FUNCIONES_BASE = [
  'esc', 'normalizar', 'limpio', 'tieneTarea', 'unidadesCon', 'puedeEn', 'unidadesDelModulo',
  'leerPreferencia', 'guardarPreferencia', 'unidadInicial', 'mostrarVista',
  'htmlUnidades', 'pintarUnidades', 'elegirUnidad', 'pintarAccionesInicio', 'mostrarInicio',
  // Parte 2: clientes
  'leerClientes', 'clientesFiltrados', 'htmlChipsApodos', 'htmlFilaCliente', 'htmlListaClientes',
  'pintarClientes', 'mostrarClientes', 'formClienteVacio', 'formClienteDesde', 'agregarApodo',
  'quitarApodo', 'htmlApodosForm', 'faltanCliente', 'parametrosGuardarCliente', 'abrirCliente',
  'pintarFormCliente', 'leerFormCliente', 'agregarApodoAlForm', 'quitarApodoDelForm', 'guardarCliente',
]

const CONSTANTES_BASE = [
  'TAREAS_PEDIDOS', 'puedeEntrar', 'CLAVE_UNIDAD', 'VISTAS', 'SUBTITULO_DE_VISTA',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const clases = new Set()
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, checked: false, dataset: {}, style: {}, title: '', type: 'text',
      atributos: {},
      setAttribute(k, v) { this.atributos[k] = String(v) },
      getAttribute(k) { return this.atributos[k] ?? null },
      removeAttribute(k) { delete this.atributos[k] },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {}, focus() { __llamadas.foco.push(id) }, scrollIntoView: () => {},
      closest: () => null, appendChild: () => {},
      classList: { add(c){ clases.add(c) }, remove(c){ clases.delete(c) }, toggle(c, f){ (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) }, contains(c){ return clases.has(c) } },
    }
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'),
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
    createElement: () => nuevoEl('creado'),
    addEventListener: () => {},
  }
  var location = { href: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/pedidos.html', search: '' }
  var __ls = new Map()
  var localStorage = {
    getItem(k) { return __ls.has(k) ? __ls.get(k) : null },
    setItem(k, v) { __ls.set(k, String(v)) },
    removeItem(k) { __ls.delete(k) },
  }
  var __impresiones = 0
  var window = { location, scrollTo(){}, addEventListener(){}, lucide: null, print(){ __impresiones++ } }
  function setTimeout(f) { return 0 } function clearTimeout(){}

  var __llamadas = { rpc: [], errores: [], exitos: [], consultas: [], foco: [] }
  var __tablas = {}
  var __rpc = async () => ({ data: null, error: null })
  var supabase = {
    from(tabla) {
      const filtros = []
      const q = {
        select(c) { filtros.push(['select', c]); return q }, eq(a, b) { filtros.push(['eq', a, b]); return q },
        in(a, b) { filtros.push(['in', a, b]); return q }, order(a) { filtros.push(['order', a]); return q },
        neq(a, b) { filtros.push(['neq', a, b]); return q }, limit() { return q },
        maybeSingle() { filtros.push(['single']); return q },
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
    sesion: { user: { id: 'uid-1' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Map([['ver', { unidades: ['u-cn'] }], ['cargar', { unidades: ['u-cn'] }], ['configurar', { unidades: ['u-cn'] }]]),
    unidades: new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta']]),
    unidadId: 'u-cn', vista: null,
    clientes: null, errorClientes: null, clientesBusqueda: '', clienteForm: null, guardandoCliente: false,
  }
`

function construirPedidos(ruta, { funciones = [], constantes = [], preludioExtra = '' } = {}) {
  const todasConst = [...CONSTANTES_BASE, ...constantes]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioExtra,
    funciones: [...FUNCIONES_BASE, ...funciones],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __llamadas, __ls, __tablas,
      __setRpc(f){ __rpc = f }, __impresiones(){ return __impresiones },
      ponerNumero, leerCampoNumero, enlazarCampoNumero, leerNumeroAr, formatearNumeroAr`,
  })
}

module.exports = { construirPedidos, FUNCIONES_BASE, CONSTANTES_BASE }
