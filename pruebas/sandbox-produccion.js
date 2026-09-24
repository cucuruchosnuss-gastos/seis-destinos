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
  'leerPreferencia', 'guardarPreferencia', 'leerSesion', 'guardarSesion',
  'modoGuardado', 'unidadInicial', 'personaGuardada',
  'tienePuesto', 'esTemporal', 'personasParaPuesto', 'personasFiltradas',
  'htmlBotonPersona', 'htmlAvisoPuestos',
  'mostrarVista', 'enModoTablet', 'pintarCabecera', 'cerrarMenu', 'alternarMenu', 'siguientePaso',
  'mostrarElegirUnidad', 'elegirUnidad', 'mostrarQuien', 'pintarQuien', 'elegirPersona',
  'entrar', 'accionDelMenu', 'entrarAlModo', 'unidadesDeCarga',
  // Parte 1 del rediseño: barra de modos, PIN, maestro, acceso por hoy
  'salaDeshabilitada', 'htmlQuienEnBarra', 'htmlBarraModos', 'pintarFondoDeModo', 'pintarBarra',
  'tocarModo', 'olvidarPersona', 'salir', 'tocar', 'vencioPorInactividad', 'revisarInactividad',
  'nuevoPanelPin', 'primerNombre', 'textoIntentos', 'mensajeDePin', 'cuentaRegresiva',
  'htmlPuntosPin', 'htmlTecladoPin', 'htmlProgresoPin', 'saludoPin', 'subtituloPin',
  'htmlMensajePin', 'pintarPin', 'teclaPin', 'cerrarPin', 'aplicarRechazoPin',
  'enviarPin', 'enviarCambioPin',
  'abrirMaestro', 'enviarPinMaestro', 'entrarComoMaestro', 'cerrarMaestro', 'pintarMaestro',
  'hastaDesdeFecha', 'faltanParaAcceso', 'abrirDarAcceso', 'pintarDarAcceso',
  'confirmarDarAcceso', 'cerrarDarAcceso',
  'leerHayAbiertas', 'marcarAbiertas', 'refrescarAbiertas',
  // B3: fechas, pantalla encendida, tablero y abrir turno
  'hoyArgentina', 'horaArgentina', 'horaDelDiaAr', 'turnoSegunHora', 'mantenerPantalla',
  'leerTablero', 'estadoMaquinas', 'textoMasas', 'textoSublotes', 'htmlMaquina', 'mostrarTablero',
  // Rediseño parte 2: el orden del tablero, la abierta de ayer y los operarios
  'diaDeLaSemana', 'diaMes', 'esDeAyer', 'rangoTablero', 'ordenTablero', 'encabezadoTablero',
  'formularioAbrirVacio', 'textoFechaAbrir', 'nombreOperario', 'tramoCoincidencia', 'htmlResaltado',
  'candidatosOperario', 'htmlResultadosOperario', 'htmlBuscadorOperarios', 'htmlChipOperario',
  'htmlFilaAbrir', 'faltanParaAbrir', 'resumenAbrir', 'parametrosAbrirTurnos',
  'mostrarAbrir', 'pintarAbrir', 'pintarBotonAbrir', 'cambiarDiaAbrir', 'abrirBuscadorOperario',
  'agregarOperarioFila', 'quitarOperarioFila', 'pintarResultadosOperario',
  'confirmarAbrir', 'htmlLotesAsignados',
  // B4 + rediseño parte 3: planilla, lo producido, paradas y cierre
  'nombrePersona', 'textoMinutos', 'duracionTexto', 'leerPlanilla', 'paradaEnCurso', 'minutosParadas',
  'htmlLotePlanilla', 'htmlQuePlanilla', 'htmlEstadoPlanilla', 'htmlMasasPlanilla', 'htmlParadas',
  'htmlOperariosPlanilla', 'pintarOperariosPlanilla', 'pintarResultadosPlanillaOp', 'recargarPlanilla',
  'cambiarOperarioTurno', 'abrirPlanilla', 'pintarPlanilla', 'pintarBotonesPlanilla', 'motivosSugeridos', 'mostrarFormParada',
  'confirmarParada', 'reanudar', 'abrirForzar', 'confirmarForzar',
  'leerPendientesCompletar', 'htmlPendientesCompletar',
  'detallePresentacion', 'describirProducido', 'itemsVivos', 'totalesProducido', 'htmlProducido',
  'htmlLoProducido', 'htmlTotalTurno', 'pintarProducido',
  'abrirCorregir', 'cerrarCorregir', 'confirmarCorregir',
  'leerCatalogoProductos', 'textoPlano', 'normalizarBusqueda', 'esProductoChocolate', 'productosPorMasa',
  'presentacionesDe', 'pasosAgregar', 'htmlPasosAgregar', 'htmlPasoProducto', 'htmlPasoConoSiNo',
  'htmlPasoPresentacion', 'conoAnterior', 'marcasFiltradas', 'htmlMarcas', 'abrirAgregar', 'irAPasoAgregar',
  'elegirProductoAgregar', 'elegirConoSiNo', 'elegirPresentacionAgregar', 'elegirCono', 'cambiarCajas',
  'pintarCajasAgregar', 'pintarAgregar', 'parametrosRegistrarProducido', 'confirmarAgregar', 'crearConoNuevo',
  // Empaque (24/09/2026): la caja, el embolsado y lo que consume un renglón
  'insumoDe', 'textoInsumoEmpaque', 'cajasDe', 'cajaInicial', 'embolsadoSugerido', 'conoDobleBolsa', 'embolsadoEfectivo',
  'opcionesEmbolsado', 'consumoPorCaja', 'consumoTotal', 'textoConsumo', 'textoCajaElegida', 'htmlEmbolsado', 'htmlPasoCaja',
  'htmlEmpaqueAgregar', 'soltarCaja', 'elegirCaja', 'elegirEmbolsado', 'seguirConCajas',
  'cargarPermisoStock', 'puedeVerStockEn', 'textoEmpaqueItem', 'leerEmpaqueTurno', 'empaqueConsumido', 'htmlEmpaqueTurno',
  'claveBorradorCierre', 'borradorCierreVacio', 'leerBorradorCierre', 'guardarBorradorCierre',
  'normalizarHora', 'horaConPaso', 'faltanParaCerrar', 'parametrosCerrarTurno', 'avisosDeCierre',
  'htmlAvisosCierre', 'htmlResumenCierre', 'enlazarCamposPlanilla', 'mostrarCierre', 'pintarCierre', 'cambioEnCierre', 'alternarRota',
  'cambiarHoraCierre', 'cambiarScrapCierre', 'intentarCerrar', 'enviarCierre', 'htmlSublotesDefinitivos',
  // B5 + rediseño parte 4: la sala de masa, la receta y las masas del turno
  'mostrarSala', 'maquinasAbiertas', 'soltarMaquinaSala', 'htmlFilaSala', 'detalleAnterior', 'htmlComo',
  'htmlPanelSala', 'partidaDeModificar', 'dePartida', 'pintarSala',
  'claveBorradorMasa', 'claveMasaEnCurso', 'nuevoBorradorMasa', 'leerBorradorMasa', 'guardarBorradorMasa',
  'borrarBorradorMasa', 'marcarEnCurso', 'soltarEnCurso', 'borradorEnCurso', 'borradoresPendientes',
  'redondearKg', 'pasoDe', 'cantidadesDesde', 'diferencias', 'textoGramos', 'textoDiferencias', 'textoKg', 'textoCantidad',
  'diferenciaDeMasa', 'seAleja',
  'ingredientesConLote', 'pideLote', 'insumosDe', 'lotesIniciales', 'opcionesLote', 'indiceLote', 'estadoLote',
  'faltanParaRegistrar', 'leerDefineChocolate', 'esChocolate',
  'parametrosRegistrarMasa', 'esErrorDeRed', 'enviarMasa', 'reintentarPendientes', 'textoPendientes', 'pintarPendientes',
  'elegirMaquinaSala', 'cargarTiposMasa', 'cargarDatosMasa', 'elegirTipoMasa', 'elegirTamano', 'elegirComo',
  'mostrarReceta', 'etiquetaBorrador', 'htmlCabeceraReceta', 'htmlOpcionesLote', 'htmlCeldaLote', 'htmlCeldaQueda',
  'htmlFilaReceta', 'htmlFilaOtro', 'htmlFilasReceta', 'pintarReceta', 'pintarPieReceta',
  'cambiarCantidad', 'sumarPaso', 'elegirOpcionLote', 'escribirLoteManual',
  'abrirOtro', 'cerrarOtro', 'faltaParaOtro', 'agregarOtro', 'quitarOtro', 'cambiarCantidadOtro', 'sumarPasoOtro',
  'registrarMasa', 'detalleBandaExito', 'horaDeAhoraAr', 'mostrarBandaExito', 'ocultarBandaExito', 'pintarBandaExito',
  'leerMasasSala', 'nombreDeTurno', 'htmlFilaMasaPendiente', 'htmlFilaMasaTurno', 'mostrarMasasTurno',
  'pintarMasasTurno', 'pedirAnularMasa', 'confirmarAnularMasa',
  // B6 + rediseño parte 5: configuración
  'volverDeOficina', 'mostrarInicioOficina', 'pintarAccesosOficina', 'unidadesDeConfig', 'pintarSelectorUnidad',
  'mostrarConfig', 'htmlPestanasConfig', 'errorConfig', 'htmlErrorPegado', 'contarPendientesMarcas',
  'cargarPestanaConfig', 'pintarPestanaConfig',
  'cambiosSinGuardar', 'pedirSalida', 'htmlSalirSinGuardar', 'cancelarSalida', 'confirmarSalida',
  'leerMaquinasConfig', 'htmlConfigMaquinas', 'moverProducto', 'ordenTrasMover', 'parametrosGuardarMaquina', 'guardarEnConfig',
  'accionMaquina', 'leerRecetasConfig', 'leerInsumosDeIngredientes', 'recetaVigente', 'recetaParaRevisar',
  'filasEditorReceta', 'parametrosGuardarReceta', 'faltanEnReceta', 'proximaVersion', 'textoAntes',
  'htmlConfigRecetas', 'fechaCorta', 'leerEditorReceta', 'marcarCambioReceta', 'guardarReceta',
  'leerIngredientesConfig', 'ingredientesSinInsumo', 'htmlConfigIngredientes',
  'parametrosGuardarIngrediente', 'valorDe', 'accionIngrediente', 'leerProductosConfig', 'avisoProductosRevisado',
  'htmlPresentacionConfig', 'htmlConfigProductos', 'parametrosGuardarProducto', 'parametrosGuardarPresentacion',
  'campoNumero', 'accionProducto',
  'leerMarcasConfig', 'marcasPendientes', 'marcasDelCatalogo', 'parametrosRevisarMarca', 'htmlPendienteMarca',
  'htmlConfigMarcas', 'accionMarca',
  'leerPersonalConfig', 'temporalVigente', 'personalVisible', 'estadoDelPin', 'puestosDe', 'alternarPuesto',
  'textoBotonPersonal', 'htmlFilaPersonal', 'htmlPanelPin', 'htmlPanelTemporal', 'htmlTemporales',
  'htmlConfigPersonal', 'guardarCambiosPersonal', 'tocarPuestoPersonal',
  'pinValido', 'abrirPanelPin', 'olvidarCampoPin', 'cerrarPanelPin', 'confirmarPinConfig',
  'htmlTiraPin', 'mostrarHojaPines', 'cerrarHojaPines', 'generarPines',
  'abrirPanelTemporal', 'cerrarPanelTemporal', 'parametrosDarTemporal', 'confirmarTemporal', 'revocarTemporal',
  // B7 + rediseño parte 7: historial de turnos y stock terminado
  'unidadesDeHistorial', 'sumarDias', 'fechaDelDia', 'unidadInicialOficina', 'nombresDeEmpleados', 'mostrarHistorial',
  'filtrosHistorialValidos', 'cargarHistorial', 'htmlTablaTurnos', 'htmlFilaHistorial', 'htmlEstadoTurno',
  'sumarMedido', 'textoEntero', 'leerDetalleTurno', 'totalesConsumidos', 'detalleIncompleto',
  'nombreInsumo', 'nombreIngredienteItem', 'htmlOperariosHistorial', 'htmlMasaHistorial',
  'correccionesDe', 'htmlCorreccion', 'htmlSubloteHistorial', 'totalSublotes',
  'htmlDetalleTurno', 'abrirDetalleHistorial', 'mostrarStockTerminado', 'cargarStockTerminado',
  'agruparStockTerminado', 'htmlStockTerminado',
]

const CONSTANTES_BASE = [
  'TAREAS_PRODUCCION', 'puedeEntrar',
  'CLAVE_MODO', 'CLAVE_UNIDAD', 'CLAVE_PERSONA', 'PUESTO_DE_MODO', 'TITULO_DE_MODO',
  'ROL_DE_MODO', 'PLURAL_PUESTO', 'VISTAS', 'VISTAS_OFICINA',
  'MINUTOS_INACTIVIDAD', 'LARGO_PIN', 'LARGO_PIN_MAESTRO',
  'ZONA_AR', 'TURNOS', 'CTX_PLANILLA',
  'PREFIJO_BORRADOR_MASA', 'PREFIJO_MASA_EN_CURSO', 'INGREDIENTES_PASO_GRANDE', 'ETIQUETA_ORIGEN',
  'UMBRAL_ALEJADA', 'MS_BANDA_EXITO',
  'PESTANAS_CONFIG', 'PUESTOS', 'CLAVE_AVISO_PRODUCTOS', 'NUEVO_TIPO', 'LECTORES_CONFIG', 'RENDERS_CONFIG',
  'puedeVerHistorial', 'TOPE_FILAS', 'ESTADO_TURNO', 'TIPO_CORRECCION',
  'EMBOLSADOS', 'TEXTO_EMBOLSADO',
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
  var __body = nuevoEl('body')
  var document = {
    body: __body,
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
  var __ss = new Map()
  var sessionStorage = {
    getItem(k) { return __ss.has(k) ? __ss.get(k) : null },
    setItem(k, v) { __ss.set(k, String(v)) },
    removeItem(k) { __ss.delete(k) },
    key(i) { return [...__ss.keys()][i] ?? null },
    get length() { return __ss.size },
  }
  // let del módulo (extraerConst solo toma const).
  var bloqueoPantalla = null
  // El PIN del acceso maestro: let del módulo, en memoria y nada más.
  var pinMaestro = null
  var camposPlanillaEnlazados = false
  var reintentando = false
  var relojBandaExito = null
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
    vista: null, quienBusqueda: '', pin: null, maestro: null, acceso: null,
    ultimoToque: null, abiertasConocido: false,
    tablero: null, hayTurnoAbierto: false, abrir: null, operarios: [], abriendo: false,
    planilla: null, opsPlanilla: { buscando: false, busqueda: '', guardando: false }, catalogo: null, cierre: null,
    agregar: null, corregir: null, cerrando: false,
    salaTurno: null, salaDoble: false, masa: null, datosMasa: null, tiposMasa: null, tipoMasa: null,
    defineChocolate: null, errorSala: null, errorReceta: null, exitoMasa: null,
    masasTurno: null, enviandoMasa: false, anulando: null,
    config: null, historial: null, stockUnidad: null,
  }
`

function construirProduccion(ruta, { funciones = [], constantes = [], preludioExtra = '' } = {}) {
  const todasConst = [...CONSTANTES_BASE, ...constantes]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioExtra,
    funciones: [...FUNCIONES_BASE, ...funciones],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __body, __llamadas, __ls, localStorage,
      __ss, sessionStorage, __pinMaestro(){ return pinMaestro }, __tablas, __setRpc(f){ __rpc = f },
      __uuids(){ return __uuids }, __nav: navigator,
      ponerNumero, leerCampoNumero, enlazarCampoNumero`,
  })
}

module.exports = { construirProduccion, FUNCIONES_BASE, CONSTANTES_BASE }
