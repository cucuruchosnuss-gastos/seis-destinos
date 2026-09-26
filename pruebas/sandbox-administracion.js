// Arma un sandbox con las funciones REALES de modulos/administracion.html y de
// js/retiros-comun.js (la hoja, que se pega detrás del script con
// fuente-cobranzas.js). Se EJECUTAN.
//
// supabase es un doble que devuelve __tablas[tabla] (array o función que
// recibe los filtros) y responde las rpc con __rpc(). El doble IGNORA el
// .select(): lo que importa de un select se afirma sobre __llamadas.consultas.

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const FUNCIONES_BASE = [
  'esc', 'normalizar', 'limpio', 'hoyArgentina', 'esFechaIso', 'fechaCorta',
  'tieneTarea', 'puedeEn', 'seccionVisible', 'hayGlobales', 'seccionesVisibles', 'empresasDeAdministracion', 'empresaActual', 'puedeVerLotes', 'linksVisibles',
  'leerPreferencia', 'guardarPreferencia', 'mostrarVista', 'mostrarCheques',
  'htmlLogo', 'htmlEmpresas', 'pintarEmpresas', 'elegirEmpresa', 'empresaInicial',
  'leerClientes', 'leerCatalogo', 'insumoDe', 'partesInsumo', 'asegurarDatosEmpresa', 'clienteDe', 'asegurarNombres', 'partesRenglon',
  'contarSinValorizar', 'textoNumeroSeccion', 'htmlSeccion', 'htmlLink', 'pintarPortada', 'mostrarInicio', 'abrirSeccion',
  'htmlSelloOrden', 'leerOrdenes', 'htmlFilaOrden', 'htmlListaOrdenes', 'htmlOpcionesClientes', 'pintarOrdenes',
  'cargarOrdenes', 'mostrarOrdenes', 'leerFiltros',
  'leerOrden', 'lotesDeRenglon', 'cantidadValorizable', 'htmlDatoAd', 'htmlRenglonOrden', 'htmlDetalleOrden', 'pintarOrden', 'pintarAccionesOrden', 'abrirOrden',
  'clavePrecio', 'preciosVigentes', 'leerSaldoCliente', 'abrirValorizar', 'subtotalValorizar', 'totalValorizar', 'textoTotalValorizar',
  'saldoProyectado', 'avisoLimite', 'faltanPrecios', 'htmlValorizar', 'cambiarPrecio', 'parametrosValorizar',
  'guardarValorizacion', 'cancelarValorizar', 'pedirAnular', 'cancelarAnular', 'confirmarAnular',
  'ordenParaHoja', 'imprimirOrden', 'textoResultadoEnvio', 'enviarOrdenAd',
  // Clientes
  'leerSaldos', 'pasaLimite', 'limiteDe', 'contarSobreLimite', 'clientesFiltrados', 'htmlFilaCliente', 'htmlListaClientes',
  'pintarClientes', 'mostrarClientes', 'abrirAlta', 'puedeDarAlta', 'parametrosAlta', 'guardarAlta', 'leerCuenta', 'detalleMovimiento',
  'tieneSaldoInicial', 'htmlCuenta', 'pintarCliente', 'abrirCliente', 'abrirPanelCliente', 'cerrarPanelCliente', 'guardarPanelCliente',
  'leerFicha', 'asegurarListas', 'asegurarProveedores', 'valorComparable', 'cambiosFicha', 'leerFormFicha', 'htmlOpcionesListas',
  'proveedoresFiltrados', 'htmlProveedorElegido', 'htmlResultadosProveedores', 'pintarProveedorFicha', 'textoCambiosFicha',
  'pintarPieFicha', 'llenarFicha', 'abrirFicha', 'elegirProveedorFicha', 'guardarFicha',
  // Listas de precios
  'htmlFilaLista', 'pintarListas', 'mostrarListas', 'abrirListaNueva', 'guardarListaNueva', 'listaDe', 'leerPreciosLista',
  'versionesDe', 'vigenteYProximo', 'filasGrilla', 'preciosAGuardar', 'calcularAumento', 'htmlFilaPrecio', 'htmlGrilla',
  'htmlHistorial', 'textoPendientes', 'pintarLista', 'abrirLista', 'enlazarPorcentaje', 'cambiarPrecioLista', 'aplicarAumento',
  'descartarCambios', 'pedirGuardarPrecios', 'confirmarGuardarPrecios', 'cambiarActivaLista',
  // js/retiros-comun.js
  'escHoja', 'logoSeguro', 'datosFaltantesEmpresa', 'textoFaltantesEmpresa', 'fechaHoja', 'fechaHoraHoja',
  'enteroHoja', 'importeHoja', 'decimalesDeUnidad', 'unidadHoja', 'cantidadInsumoHoja', 'tieneInsumos', 'totalCajasOrden', 'totalUnidadesOrden', 'textoLotes', 'nombreInsumoHoja',
  'htmlEmpresaHoja', 'htmlClienteHoja', 'htmlFilaHoja', 'htmlTablaHoja', 'htmlCopiaHoja', 'htmlHoja', 'asegurarEstilosHoja',
  'textoOrden', 'nombreArchivoPdf', 'asuntoMail', 'emailValido', 'urlMailto', 'cargarScript', 'generarPdf', 'enviarOrden',
  // Importar (26/09/2026)
  'normalizarEncabezado', 'mapearColumnas', 'textoCelda', 'fechaIsoLocal', 'numeroCelda', 'fechaCelda', 'cuitValido', 'cbuValido',
  'condicionIvaDe', 'claveNombreCliente', 'filasDeHoja', 'estadoFila', 'filaPrevia', 'marcarRepetidas', 'textoFilas',
  'validarClientes', 'parametrosCliente', 'validarPrecios', 'validarSaldos', 'validarImportacion',
  'plantillaClientes', 'instruccionesClientes', 'plantillaPrecios', 'plantillaSaldos', 'filasResumen',
  'cargarXlsx', 'textoDeCsv', 'esCsv', 'leerArchivoPlanilla', 'descargarPlanilla', 'nombreArchivoImportar',
  'importarVacio', 'cuentaImportar', 'textoCuentaImportar', 'htmlFilaImportar', 'htmlVistaPrevia', 'textoConfirmarImportar',
  'pintarImportar', 'mostrarImportar', 'elegirTipoImportar', 'contextoImportar', 'procesarFilasImportar', 'subirArchivoImportar',
  'bajarPlantillaImportar', 'pedirGuardarImportacion', 'confirmarImportacion', 'bajarResumenImportar', 'descartarImportacion',
]

const CONSTANTES_BASE = [
  'ZONA_AR', 'DECIMALES_PRECIO', 'LARGO_MINIMO_MOTIVO', 'SECCIONES', 'LINKS', 'CLAVE_EMPRESA', 'VISTAS', 'SUBTITULO_DE_VISTA',
  'ETIQUETA_VALORIZACION', 'ETIQUETA_MOVIMIENTO', 'CAMPOS_FICHA', 'CATEGORIAS_PRODUCTO', 'TITULO_OTROS_PRODUCTOS', 'TITULO_INSUMOS', 'NOMBRE_UNIDAD_HOJA',
  'LIBRERIA_XLSX', 'TIPOS_IMPORTAR', 'EXPLICA_IMPORTAR', 'TITULO_CODIGO', 'COLUMNAS_CLIENTES', 'COLUMNAS_PRECIOS', 'COLUMNAS_SALDOS',
  'COLUMNAS_DE', 'CONDICIONES_IVA', 'ETIQUETA_FILA',
  'ZONA_HOJA', 'COPIAS_IMPRESION', 'COPIAS_PDF', 'LEYENDA_LEGAL', 'ESTILOS_HOJA', 'LIBRERIAS_PDF', 'CORTE_HOJA',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  function nuevoEl(id) {
    const clases = new Set()
    return {
      id, innerHTML: '', textContent: '', value: '', className: '', hidden: false,
      disabled: false, checked: false, dataset: {}, style: {}, title: '', type: 'text', src: '', href: '', download: '',
      atributos: {},
      setAttribute(k, v) { this.atributos[k] = String(v) }, getAttribute(k) { return this.atributos[k] ?? null },
      removeAttribute(k) { delete this.atributos[k] },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {}, focus() {}, scrollIntoView: () => {},
      closest: () => null, appendChild() {}, remove() {}, click() { __llamadas.clicks.push(this) },
      classList: { add(c){ clases.add(c) }, remove(c){ clases.delete(c) }, toggle(c, f){ (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) }, contains(c){ return clases.has(c) } },
    }
  }
  var __els = new Map()
  var document = {
    body: nuevoEl('body'), head: nuevoEl('head'),
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
    createElement: (tag) => nuevoEl('creado-' + tag),
    addEventListener: () => {},
  }
  var location = { href: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/administracion.html', search: '' }
  var __ls = new Map()
  var localStorage = {
    getItem(k) { return __ls.has(k) ? __ls.get(k) : null },
    setItem(k, v) { __ls.set(k, String(v)) },
    removeItem(k) { __ls.delete(k) },
  }
  var __impresiones = 0
  var window = { location, scrollTo(){}, addEventListener(){}, lucide: null, print(){ __impresiones++ } }
  function setTimeout(f) { return 0 } function clearTimeout(){}
  var navigator = {}
  var turnoPortada = 0
  var turnoOrdenes = 0
  var turnoOrden = 0
  var turnoClientes = 0
  var turnoCliente = 0
  var turnoLista = 0

  var __llamadas = { rpc: [], errores: [], exitos: [], consultas: [], clicks: [] }
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
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-n'] }], ['retiros:anular', { unidades: ['u-n'] }]]),
    misModulos: new Set(['retiros']),
    empresas: [
      { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', razon_social: 'NUSS SRL', cuit: '30700000001', domicilio: 'Ruta 9', telefono: '351', logo_url: 'logo-cucuruchos-nuss.png' },
      { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png' },
    ],
    fabrica: FABRICA_SIN_DATOS,
    empresaId: 'u-n', vista: null,
    clientes: null, catalogo: null, catalogoEmpresa: null, nombres: new Map(),
    portada: null, ordenes: null, errorOrdenes: null,
    filtros: { desde: '', hasta: '', clienteId: '', estado: '', sinValorizar: false },
    orden: null, trabajando: false,
    saldos: null, errorSaldos: null, busquedaClientes: '', alta: null, cliente: null, ficha: null, listas: null, proveedores: null, listaNueva: null, lista: null,
  }
`

function construirAdministracion(ruta, { funciones = [], constantes = [], preludioExtra = '', preludioEstado = '' } = {}) {
  const todasConst = [...CONSTANTES_BASE, ...constantes]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioEstado + preludioExtra,
    funciones: [...FUNCIONES_BASE, ...funciones],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __llamadas, __ls, __tablas, __win: window,
      __setRpc(f){ __rpc = f }, __impresiones(){ return __impresiones }, __setNav(n){ navigator = n },
      ponerNumero, leerCampoNumero, enlazarCampoNumero, leerNumeroAr, formatearNumeroAr`,
  })
}

module.exports = { construirAdministracion, FUNCIONES_BASE, CONSTANTES_BASE }
