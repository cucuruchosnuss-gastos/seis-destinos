// Arma un sandbox con las funciones REALES de modulos/retiros.html (la CARGA
// de órdenes de retiro) y de js/retiros-comun.js (la hoja), que se pega detrás
// del script con fuente-cobranzas.js. Se EJECUTAN: una assertion sobre el call
// site no dice nada del callee.
//
// El DOM es falso pero guarda lo que se le escribe, y supabase es un doble que:
//  - devuelve lo que la suite ponga en __tablas[tabla] (array, o función que
//    recibe los filtros y devuelve { data, error });
//  - anota cada consulta en __llamadas.consultas y cada rpc en __llamadas.rpc,
//    y responde las rpc con __rpc(nombre, parámetros) (__setRpc()).
// OJO: el doble IGNORA el .select(): lo que importa de un select se afirma
// sobre __llamadas.consultas.

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const FUNCIONES_BASE = [
  'esc', 'normalizar', 'limpio', 'hoyArgentina', 'fechaCorta', 'nuevoUuid',
  'tieneTarea', 'puedeCargarEn', 'puedeVerLotesInsumo', 'empresasDeCarga', 'empresaActual',
  'leerPreferencia', 'guardarPreferencia', 'guardarBorrador', 'leerBorrador', 'mostrarVista',
  'htmlLogo', 'htmlEmpresas', 'htmlEmpresaActual', 'pintarEmpresaActual', 'mostrarEleccionEmpresa',
  'formTieneDatos', 'elegirEmpresa', 'aplicarEmpresa', 'confirmarCambioEmpresa', 'cancelarCambioEmpresa', 'pedirCambioEmpresa',
  'leerClientes', 'clientesFiltrados', 'leerCatalogo', 'catalogoDesdeRpc', 'insumoDe', 'stockProducto', 'gruposCatalogo', 'presentacionesDe',
  'marcasFiltradas', 'textoCono', 'descripcionRenglon', 'asegurarDatosEmpresa',
  'claveLotesRenglon', 'lotesDeRetiro', 'lotesDeInsumo', 'leerLotes', 'leerLotesInsumo', 'asegurarLotes',
  'renglonNuevo', 'formVacio', 'autoPresentacion', 'faltanRenglon', 'faltanOrden', 'itemParaBase', 'parametrosRegistrar',
  'totalCajasForm', 'textoCuentaForm', 'clienteDe', 'detalleCliente', 'htmlClienteElegido', 'htmlResultadosClientes',
  'pintarCliente', 'elegirCliente', 'cambiarCliente',
  'htmlProductosRenglon', 'htmlEleccionRenglon', 'htmlMarcasRenglon', 'htmlConoRenglon', 'htmlPresentacionesRenglon', 'htmlLoteRenglon',
  'htmlRenglon', 'htmlAvisoCatalogo', 'pintarRenglones', 'pintarPie', 'renglon', 'tocarRenglon',
  'elegirProductoRenglon', 'cambiarProductoRenglon', 'elegirInsumoRenglon', 'buscarCatalogoRenglon', 'elegirConoRenglon', 'elegirMarcaRenglon', 'buscarConoRenglon',
  'elegirPresentacionRenglon', 'abrirLotes', 'cerrarLotes', 'elegirLote', 'quitarLote', 'agregarRenglon', 'quitarRenglon',
  'pintarFormEntero', 'abrirFormulario', 'reconciliarRenglones', 'leerCabecera', 'htmlDatoRt', 'htmlResumen', 'textoInsumosForm', 'revisar', 'pintarConfirmar',
  'esErrorDeRed', 'confirmar',
  'htmlFaltantes', 'htmlHecho', 'pintarHecho', 'mostrarHecho', 'cargarOrdenHecha', 'faltantesDeLotes', 'htmlAvisoEmpresa',
  'conoDeRenglonMio', 'clienteDeOrden', 'leerMemoriaInsumos', 'recordarInsumosDeOrden', 'renglonesParaHoja', 'faltanInsumosEnHoja', 'ordenParaHoja', 'imprimirOrden', 'textoResultadoEnvio', 'pintarAccionesHoja',
  'enviarDesde', 'compartirDesde', 'imprimirDesde',
  'leerMisOrdenes', 'cajasDeOrden', 'htmlFilaMia', 'htmlMisRetiros', 'mostrarMisRetiros', 'htmlDetalleMio', 'abrirMia',
  'empezarOrden', 'retomarBorrador',
  // js/retiros-comun.js
  'escHoja', 'logoSeguro', 'datosFaltantesEmpresa', 'textoFaltantesEmpresa', 'fechaHoja', 'fechaHoraHoja',
  'enteroHoja', 'importeHoja', 'decimalesDeUnidad', 'unidadHoja', 'cantidadInsumoHoja', 'tieneInsumos', 'totalCajasOrden', 'totalUnidadesOrden', 'textoLotes', 'nombreInsumoHoja',
  'htmlEmpresaHoja', 'htmlClienteHoja', 'htmlFilaHoja', 'htmlTablaHoja', 'htmlCopiaHoja', 'htmlHoja', 'asegurarEstilosHoja',
  'textoOrden', 'nombreArchivoPdf', 'asuntoMail', 'emailValido', 'urlMailto', 'cargarScript', 'generarPdf',
  'enviarOrden', 'compartirTextoOrden',
]

const CONSTANTES_BASE = [
  'ZONA_AR', 'DECIMALES_CAJAS', 'CLAVE_EMPRESA', 'CLAVE_BORRADOR', 'VISTAS', 'SUBTITULO_DE_VISTA', 'claveLotes', 'claveLotesInsumo',
  'CATEGORIAS_RETIRO', 'TITULO_SIN_CATEGORIA', 'TITULO_INSUMOS', 'CLAVE_INSUMOS_ORDENES', 'DIAS_MEMORIA_INSUMOS', 'NOMBRE_UNIDAD_HOJA',
  'ZONA_HOJA', 'COPIAS_IMPRESION', 'COPIAS_PDF', 'LEYENDA_LEGAL', 'ESTILOS_HOJA', 'LIBRERIAS_PDF', 'CORTE_HOJA',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const clases = new Set()
    const el = {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, checked: false, dataset: {}, style: {}, title: '', type: 'text', src: '', href: '', download: '',
      atributos: {}, hijos: [],
      setAttribute(k, v) { this.atributos[k] = String(v) },
      getAttribute(k) { return this.atributos[k] ?? null },
      removeAttribute(k) { delete this.atributos[k] },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {}, focus() {}, scrollIntoView: () => {},
      closest: () => null, appendChild(h) { this.hijos.push(h); __llamadas.anexados.push(h) }, remove() { __llamadas.removidos.push(this.id) },
      click() { __llamadas.clicks.push(this) },
      classList: { add(c){ clases.add(c) }, remove(c){ clases.delete(c) }, toggle(c, f){ (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) }, contains(c){ return clases.has(c) } },
    }
    return el
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'), head: nuevoEl('head'),
    getElementById(id) { if (!__els.has(id)) { if (__faltanIds.has(id)) return null; __els.set(id, nuevoEl(id)) } return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
    createElement: (tag) => nuevoEl('creado-' + tag),
    addEventListener: () => {},
  }
  var __faltanIds = new Set()
  var location = { href: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/retiros.html', search: '' }
  var __ls = new Map()
  var localStorage = {
    getItem(k) { return __ls.has(k) ? __ls.get(k) : null },
    setItem(k, v) { __ls.set(k, String(v)) },
    removeItem(k) { __ls.delete(k) },
  }
  var __impresiones = 0
  var window = { location, scrollTo(){}, addEventListener(){}, lucide: null, print(){ __impresiones++ } }
  var __uuids = 0
  var crypto = { randomUUID() { __uuids++; return '00000000-0000-4000-8000-' + String(__uuids).padStart(12, '0') } }
  var globalThis_ = null
  function setTimeout(f) { return 0 } function clearTimeout(){}
  var navigator = {}
  var claveRenglon = 0
  var turnoMis = 0

  var __llamadas = { rpc: [], errores: [], exitos: [], consultas: [], anexados: [], removidos: [], clicks: [] }
  var __tablas = {}
  var __rpc = async () => ({ data: null, error: null })
  var supabase = {
    from(tabla) {
      const filtros = []
      const q = {
        select(c) { filtros.push(['select', c]); return q }, eq(a, b) { filtros.push(['eq', a, b]); return q },
        in(a, b) { filtros.push(['in', a, b]); return q }, order(a) { filtros.push(['order', a]); return q },
        neq(a, b) { filtros.push(['neq', a, b]); return q }, is(a, b) { filtros.push(['is', a, b]); return q }, limit() { return q },
        gte(a, b) { filtros.push(['gte', a, b]); return q }, lte(a, b) { filtros.push(['lte', a, b]); return q },
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
    rpc(nombre, params) { __llamadas.rpc.push([nombre, JSON.parse(JSON.stringify(params ?? null))]); return Promise.resolve(__rpc(nombre, params)) },
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }

  var estado = {
    sesion: { user: { id: 'uid-1' } },
    miEmpleadoId: 'emp-1', miRolApp: 'usuario', miNombre: 'Emanuel Romero',
    misTareas: new Map([['retiros:cargar', { unidades: ['u-n'] }]]),
    empresas: [
      { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', razon_social: null, cuit: null, domicilio: null, telefono: null, logo_url: 'logo-cucuruchos-nuss.png' },
      { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', razon_social: null, cuit: null, domicilio: null, telefono: null, logo_url: 'logo-dolce-pasta.png' },
    ],
    fabrica: FABRICA_SIN_DATOS,
    empresaId: null, empresaPendiente: null, vista: null,
    clientes: null, errorClientes: null, catalogo: null, catalogoEmpresa: null, errorCatalogo: null,
    lotes: new Map(), form: null, confirmando: false, hecho: null, mis: null, errorMis: null, mio: null, enviando: false,
  }
`

function construirRetiros(ruta, { funciones = [], constantes = [], preludioExtra = '' } = {}) {
  const todasConst = [...CONSTANTES_BASE, ...constantes]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioExtra,
    funciones: [...FUNCIONES_BASE, ...funciones],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __llamadas, __ls, __tablas, __nav: navigator, __win: window,
      __setRpc(f){ __rpc = f }, __impresiones(){ return __impresiones }, __faltanIds,
      __setNav(n){ navigator = n }, __setLocation(h){ location.href = h },
      ponerNumero, leerCampoNumero, enlazarCampoNumero, leerNumeroAr, formatearNumeroAr`,
  })
}

module.exports = { construirRetiros, FUNCIONES_BASE, CONSTANTES_BASE }
