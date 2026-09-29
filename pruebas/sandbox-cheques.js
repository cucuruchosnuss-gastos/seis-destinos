// Arma un sandbox con las funciones REALES de modulos/cheques.html y las que
// importa de js/cobranzas-comun.js. Se EJECUTAN: una assertion sobre el call
// site no dice nada del callee, y el único test que prueba que un helper
// existe es correr el código.

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const FUNCIONES = [
  // helpers propios y del común
  'esc', 'nombreBanco', 'nombreBancoDe', 'textoOpcional', 'urlDeCobranza', 'tieneTarea',
  'dvBcra', 'formatearImporte', 'hoyArgentina', 'esFechaIso', 'diasEntre', 'formatearFechaCob',
  'textoSalidaCheque',
  // filtros y carga
  'filtroNumeroCheque', 'aplicarFiltrosCheques', 'hayFiltrosCheques', 'fechaDeCobroCheque',
  'ordenarCheques', 'resumenCartera', 'cargarResumenCheques', 'pintarSelectorBancos',
  'pintarCartera', 'htmlCartera', 'pintarFiltrosCheques', 'limpiarFiltrosCheques',
  'renderizarCheques', 'htmlTablaCheques', 'htmlFilaCheque', 'htmlSalidaCheque',
  // vencimiento (Parte 6)
  'plazoPresentacion', 'estadoVencimiento', 'textoVencimiento', 'textoVencimientoCorto', 'resumenVencimientos', 'filasVisibles',
  'alternarSoloVencen', 'htmlAvisoVencimientos',
  // selección (Parte 7)
  'diasHastaCobro', 'resumenSeleccion', 'textoResumenSeleccion', 'chequesElegidos', 'activarSeleccion',
  'cancelarSeleccion', 'tocarParaElegir', 'marcarElegidosEnPantalla', 'pintarSeleccion', 'soltarSeleccionPorFiltro',
  'htmlCasillaElegir', 'htmlAriaElegido',
  // salida de los elegidos (Parte 8)
  'puedeSalir', 'validarSalidaLote', 'pintarSalidaLote', 'marcarNoSalen', 'parametrosSalidaLote', 'fechaMinimaLote', 'abrirModalSalidaLote',
  'accionSalida', 'htmlAccionSalida', 'textoSalidaCorto', 'fechaCorta', 'htmlTarjetaCheque', 'htmlListaCheques', 'conectarFilas',
  // salida y vuelta a cartera
  'erroresSalida', 'parametrosSalida', 'abrirModalSalida', 'cerrarModalSalida',
  'pintarModalSalida', 'confirmarSalida', 'abrirModalMotivo', 'cerrarModalMotivo',
  'abrirVolverACartera',
  // preferencias
  'guardarPreferencias', 'leerPreferencias',
  // orden (Parte 3)
  'valorDeOrden', 'compararValores', 'siguienteOrden', 'aplicarOrden', 'pintarOrdenMovil', 'htmlEncabezadoOrden',
]

const CONSTANTES = [
  'ZONA_AR', 'ETIQUETA_ESTADO_CHEQUE', 'TOPE_FILAS_POSTGREST', 'FILTROS_CHEQUES_DEFECTO',
  'ESTADOS_FILTRO_CHEQUES', 'LARGO_MAXIMO_DESTINO', 'CLAVE_PREFERENCIAS', 'AVISO_CARTERA_PARCIAL', 'ORDEN_DEFECTO', 'COLUMNAS_ORDEN', 'SENTIDO_EN_PALABRAS', 'DIAS_PLAZO_PRESENTACION', 'DIAS_AVISO_VENCIMIENTO', 'TOPE_SALIDA_LOTE',
  'puedeProcesar', 'puedeVerCartera',
]

// Las funciones y constantes opcionales: las que agregan las partes
// siguientes. El sandbox las carga SI EXISTEN, así la suite de una parte no
// depende de las otras.
const OPCIONALES = [
  // unidad de negocio (22/09/2026, tarea A2)
  'filasPorPlazo', 'unidadDeCheque',
  'desgloseUnidades', 'textoUnidadesSeleccion', 'htmlCeldaUnidad',
  // la barra de unidad de arriba (28/09/2026)
  'chequesDeLaUnidad', 'nombreDeLaElegida', 'recalcularResumen', 'aplicarEleccionBarra', 'alCambiarLaBarra',
  'avisoDestacadoOtraUnidad',
  // color por estado y leyenda (22/09/2026)
  'esPorControlar', 'clavesEstadoCheque', 'leyendaDeCheques', 'htmlLeyendaEstados', 'pintarLeyendaEstados',
  // endosar a un proveedor (29/09/2026)
  'textoChequeEndosado', 'aCentavos', 'ordenarFacturasFifo', 'repartoFifo', 'deudasVisibles', 'deudaDeUnidad',
  'textoDeudaProveedor', 'chequesDelEndoso', 'unidadDefectoEndoso', 'opcionesUnidadEndoso', 'htmlOpcionesUnidadEndoso',
  'textoEntreEmpresas', 'nombreUnidadEndoso', 'erroresEndoso', 'parametrosEndoso', 'reiniciarEndoso',
  'cargarUnidadesEndoso', 'prepararEndoso', 'buscarProveedoresEndoso', 'htmlResultadosEndoso', 'pintarResultadosEndoso',
  'elegirProveedorEndoso', 'cambiarProveedorEndoso', 'elegirUnidadEndoso', 'cargarPreviaEndoso', 'htmlPreviaEndoso',
  'pintarPreviaEndoso', 'pintarEndoso', 'abrirVincularProveedor', 'endosarEnOrden', 'textoResultadoEndoso',
  'textoFalloEndoso', 'confirmarEndoso',
]
const CONSTANTES_OPCIONALES = ['SIN_UNIDAD', 'TEXTO_SIN_UNIDAD', 'LEYENDA_ESTADOS',
  // endosar a un proveedor (29/09/2026)
  'puedeRegistrarPago', 'puedeVerFacturas', 'TEXTO_SIN_PERMISO_ENDOSO', 'TEXTO_SIN_FACTURAS', 'LARGO_MINIMO_BUSQUEDA']

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, max: '', min: '', dataset: {}, checked: false, title: '',
      __attrs: {},
      setAttribute(k, v) { this.__attrs[k] = String(v) }, removeAttribute(k) { delete this.__attrs[k] },
      getAttribute(k) { return this.__attrs[k] ?? null },
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {}, focus: () => {}, scrollIntoView: () => {},
      __clases: new Set(),
      classList: {
        add(c) { el.__clases.add(c) }, remove(c) { el.__clases.delete(c) },
        toggle(c, f) { if (f === undefined ? !el.__clases.has(c) : f) el.__clases.add(c); else el.__clases.delete(c) },
        contains(c) { return el.__clases.has(c) },
      },
    }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => nuevoEl('creado'),
    addEventListener: () => {},
    body: nuevoEl('body'),
  }
  var __almacen = new Map()
  var sessionStorage = {
    getItem: (k) => __almacen.has(k) ? __almacen.get(k) : null,
    setItem: (k, v) => __almacen.set(k, String(v)),
    removeItem: (k) => __almacen.delete(k),
  }
  var window = { location: { href: 'https://app.test/modulos/cheques.html', pathname: '/modulos/cheques.html', search: '' },
    scrollTo(){}, matchMedia: () => ({ matches: false, addEventListener(){} }) }
  var CSS = { escape: (s) => String(s) }
  var history = { replaceState(){} }

  var __datos = []
  var __errorFalso = null
  var __consultas = []
  var __rpc = async () => ({ data: null, error: null })
  var supabase = {
    from(tabla) {
      const reg = { tabla, llamadas: [] }
      __consultas.push(reg)
      const q = {}
      for (const m of ['select', 'eq', 'in', 'order', 'range', 'like', 'gte', 'lte', 'maybeSingle', 'limit'])
        q[m] = (...a) => { reg.llamadas.push([m, ...a]); return q }
      q.then = (res) => Promise.resolve({ data: __errorFalso ? null : (typeof __datos === 'function' ? __datos(tabla) : __datos), error: __errorFalso }).then(res)
      return q
    },
    rpc: (...a) => __rpc(...a),
  }
  var __llamadas = { cargarCheques: 0, errores: [], exitos: [], refrescar: 0 }
  function mostrarError(m){ __llamadas.errores.push(m) } function mostrarExito(m){ __llamadas.exitos.push(m) }
  function cargarCheques(){ __llamadas.cargarCheques++ }
  async function refrescarTodo(){ __llamadas.refrescar++ }
  function abrirCobranza(id){ __llamadas.abrirCobranza = id }
  var __renders = 0

  var estado = {
    sesion: { user: { id: 'uid-de-prueba' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:ver_todo', 'cobranzas:procesar']),
    bancos: new Map(),
    filtros: { estado: 'en_cartera', numero: '', banco: '', soloVencen: false },
    unidadElegida: null, unidadesBarra: [], filasResumen: null, cobranzasListas: false, carteraDetalle: null,
    vencimientos: null,
    orden: { campo: 'pago', sentido: 'asc' },
    filas: [], cobranzas: new Map(), cartera: null, tope: false, topeResumen: false, error: null,
    bancosDeCheques: [], destacado: null, salida: null,
    seleccion: { activa: false, ids: new Set(), ultimo: null },
  }
  // Lo que la región importa de js/barra-unidad.js y tiene estado de módulo:
  // un doble que la prueba maneja. pasaFiltroUnidad es la REAL (llega por el
  // import, ver construirCheques).
  var __barra = { elegida: null, unidades: [], mostrar: false, listo: true }
  var __oyentesBarra = []
  function unidadesDeLaBarra() { return Promise.resolve({ ...__barra, unidades: [...__barra.unidades] }) }
  function alCambiarUnidad(fn) { __oyentesBarra.push(fn); return () => {} }
  function __elegirEnBarra(id) { __barra.elegida = id; for (const f of __oyentesBarra) f({ ...__barra, unidades: [...__barra.unidades] }) }
  var accionDelMotivo = null
  var turnoCheques = 0
  var temporizadorAvisoSeleccion = null
  var turnoBusquedaEndoso = 0
  var turnoPreviaEndoso = 0
  var temporizadorBusquedaEndoso = null
`

function construirCheques(ruta, { preludioExtra = '', funciones = [], constantes = [], stubs = [] } = {}) {
  const { scriptModulo } = require('./sandbox')
  // La cartera vive en una región de administracion.html (26/09/2026).
  const { regionCheques } = require('./fuente-cheques')
  const src = scriptModulo(ruta, regionCheques)
  const existe = (n) => new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?function\\s+${n}\\s*\\(`).test(src)
  const existeC = (n) => new RegExp(`(?:^|\\n)\\s*const\\s+${n}\\s*=`).test(src)
  // Una función que el preludio STUBEA no se extrae: el stub la reemplaza.
  // pasaFiltroUnidad es de js/barra-unidad.js: si la región la importa, se
  // trae la función REAL por el import (extraer.js la busca ahí).
  const importadas = /\bpasaFiltroUnidad\b[^\n]*from\s+'\.\.\/js\/barra-unidad\.js'/.test(src) ? ['pasaFiltroUnidad'] : []
  // sinUnidadesDePrueba (js/utils.js): la REAL, si la región la importa.
  if (/\bsinUnidadesDePrueba\b[^\n]*from\s+'\.\.\/js\/utils\.js'/.test(src)) importadas.push('sinUnidadesDePrueba')
  const fns = [...FUNCIONES, ...OPCIONALES.filter(existe), ...importadas, ...funciones].filter(f => !stubs.includes(f))
  const cts = [...CONSTANTES, ...CONSTANTES_OPCIONALES.filter(existeC), ...constantes]
  return construirCon(ruta, {
    recortar: regionCheques,
    preludio: PRELUDIO + preludioExtra,
    funciones: [...new Set(fns)],
    constantes: [...new Set(cts)],
    retorno: `${[...new Set(cts)].join(", ")}, estado, __els, __doc: document, __llamadas, __consultas, __almacen, window,
      __set(d){ __datos = d }, __setError(e){ __errorFalso = e }, __setRpc(f){ __rpc = f },
      __accionMotivo(){ return accionDelMotivo },
      __barra, __oyentesBarra, __elegirEnBarra`,
  })
}

module.exports = { construirCheques, FUNCIONES, CONSTANTES }
