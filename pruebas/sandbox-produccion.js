// Arma un sandbox con las funciones REALES de modulos/produccion.html (la
// planta) o de modulos/produccion-gestion.html (la gestión): lo decide la
// ruta. Desde el 25/09/2026 Producción está partida en esos dos archivos, y
// cada uno tiene SU lista de funciones — escrita a mano, para que una que
// falte siga tirando ReferenceError acá y no en la pantalla.
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
  // Terminar la tablet, parte 2: una persona por modo, sacar al masero, la sala que no queda vacía
  'clavePersona', 'olvidarTodas', 'puedeSacarMasero', 'maseroAdentro', 'htmlMaseroAdentro', 'pintarMaseroAdentro',
  'sacarMasero', 'pintarQuienFija', 'soyOtraPersona', 'maquinaCerrada', 'sacarMaseroPorCierre',
  // Terminar la tablet, parte 3: el panel de lotes
  'textoVacioLote', 'marcarLoteTerminado', 'leerFechasLotes', 'textoFechaLote', 'fechaLote',
  'htmlPanelLote', 'pintarPanelLote', 'abrirPanelLote', 'cerrarPanelLote', 'elegirTarjetaLote', 'teclaPanelLote',
  // Terminar la tablet, parte 4: anotar, corregir y borrar paradas
  'htmlAccionesParada', 'instanteAr', 'isoAr', 'limitesParada', 'resolverHorasParada', 'faltanParaParada', 'horaRedondeada',
  'horaDeReferencia', 'abrirEditorParada', 'cerrarEditorParada', 'puedeSeguirParada', 'htmlCampoHora', 'htmlTecladoHora',
  'textoDiaParada', 'htmlHorasParada', 'tituloEditorParada', 'pintarEditorParada', 'cambiarHoraParada', 'tocarHoraParada',
  'teclaHoraParada', 'alternarSigueParada', 'parametrosParada', 'guardarParada', 'abrirEditorDesdePlanilla',
  'accionesParadaHistorial', 'abrirEditorDesdeHistorial', 'teclaEditorParada', 'pasarABorrarParada',
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
  'cambiarOperarioTurno', 'abrirPlanilla', 'pintarPlanilla', 'pintarBotonesPlanilla', 'abrirForzar', 'confirmarForzar',
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
  'cargarPermisoStock', 'puedeVerStockEn', 'nombreCajaItem', 'envasePresentacion', 'partesProducido',
  'textoTamanoMasa', 'htmlChipsMasa', 'chipsDeMasa', 'conoOfrecible', 'conosParaElegir', 'leerEmpaqueTurno', 'empaqueConsumido', 'htmlEmpaqueTurno',
  'leerEmpaqueConfig', 'faltaEmpaque', 'nombreInsumoConfig', 'htmlEmpaquePresentacion', 'htmlConfigEmpaque',
  'sincronizarCantidadesEmpaque', 'insumoPorTexto', 'parametrosGuardarEmpaque', 'valorEmpaque', 'accionEmpaque',
  'cambiarSelectEmpaque', 'cambiarDobleBolsa',
  'leerStockEmpaque', 'cargarStockAgregar', 'faltantesEmpaque', 'htmlAvisoStockEmpaque',
  // Sin empaque legible (24/09/2026): se carga igual, sin caja, y se marca
  'leerEmpaqueCatalogo', 'htmlAvisoSinEmpaque', 'sinCajaDescontada', 'textoSinCaja',
  // La burbuja de conos por revisar en los accesos a Configuración
  'cargarBurbujaConos', 'textoConosPendientes', 'htmlBotonConfig', 'pintarBurbujaConos', 'abrirConfigDesdeAcceso',
  'claveBorradorCierre', 'borradorCierreVacio', 'leerBorradorCierre', 'guardarBorradorCierre',
  'normalizarHora', 'horaConPaso', 'faltanParaCerrar', 'parametrosCerrarTurno', 'avisosDeCierre',
  'htmlAvisosCierre', 'htmlResumenCierre', 'enlazarCamposPlanilla', 'mostrarCierre', 'pintarCierre', 'cambioEnCierre',
  'cambiarScrapCierre', 'intentarCerrar', 'enviarCierre', 'htmlSublotesDefinitivos',
  // B5 + rediseño parte 4: la sala de masa, la receta y las masas del turno
  'mostrarSala', 'maquinasAbiertas', 'soltarMaquinaSala', 'htmlFilaSala', 'detalleAnterior', 'htmlComo',
  'htmlPanelSala', 'partidaDeModificar', 'dePartida', 'pintarSala',
  'claveBorradorMasa', 'claveMasaEnCurso', 'nuevoBorradorMasa', 'leerBorradorMasa', 'guardarBorradorMasa',
  'borrarBorradorMasa', 'marcarEnCurso', 'soltarEnCurso', 'borradorEnCurso', 'borradoresPendientes',
  'redondearKg', 'pasoDe', 'cantidadesDesde', 'diferencias', 'textoGramos', 'textoDiferencias', 'textoKg', 'textoCantidad',
  'diferenciaDeMasa', 'seAleja',
  'ingredientesConLote', 'pideLote', 'insumosDe', 'lotesIniciales', 'opcionesLote', 'indiceLote', 'estadoLote',
  'faltanParaRegistrar', 'leerDefineChocolate', 'esChocolate', 'pasaAChocolate',
  'parametrosRegistrarMasa', 'esErrorDeRed', 'enviarMasa', 'reintentarPendientes', 'textoPendientes', 'pintarPendientes',
  'elegirMaquinaSala', 'cargarTiposMasa', 'cargarDatosMasa', 'elegirTipoMasa', 'elegirTamano', 'elegirComo',
  'mostrarReceta', 'etiquetaBorrador', 'htmlCabeceraReceta', 'htmlCeldaLote', 'htmlCeldaQueda',
  'htmlFilaReceta', 'htmlFilaOtro', 'htmlFilasReceta', 'pintarReceta', 'pintarPieReceta',
  'cambiarCantidad', 'sumarPaso', 'elegirOpcionLote', 'escribirLoteManual',
  'abrirOtro', 'cerrarOtro', 'faltaParaOtro', 'agregarOtro', 'quitarOtro', 'cambiarCantidadOtro', 'sumarPasoOtro',
  'registrarMasa', 'detalleMasaRegistrada', 'horaDeAhoraAr', 'mostrarRegistrada', 'ocultarRegistrada',
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
  'pintarEstadosHistorial', 'filtrosHistorialValidos', 'cargarHistorial', 'htmlTablaTurnos', 'htmlFilaHistorial', 'htmlEstadoTurno',
  'sumarMedido', 'textoEntero', 'leerDetalleTurno', 'totalesConsumidos', 'detalleIncompleto',
  'nombreInsumo', 'nombreIngredienteItem', 'htmlOperariosHistorial', 'htmlMasaHistorial',
  'correccionesDe', 'htmlCorreccion', 'htmlSubloteHistorial', 'totalSublotes',
  'htmlDetalleTurno', 'abrirDetalleHistorial', 'mostrarStockTerminado', 'cargarStockTerminado',
  'agruparStockTerminado', 'htmlStockTerminado',
  // La fábrica de pruebas (26/09/2026): la unidad y las personas del robot no se muestran
  'mapaDeUnidades', 'personalSinPruebas',
]

// Lo que está en los DOS archivos (cada uno con su copia: en este proyecto
// los módulos duplican sus helpers), y lo que se fue a la gestión.
const EN_AMBOS = [
  'esc', 'tieneTarea', 'unidadesCon', 'leerPreferencia', 'guardarPreferencia', 'mostrarVista', 'pintarCabecera',
  'tocar', 'htmlAccionesParada', 'instanteAr', 'isoAr', 'limitesParada', 'resolverHorasParada', 'faltanParaParada',
  'horaRedondeada', 'horaDeReferencia', 'abrirEditorParada', 'cerrarEditorParada', 'puedeSeguirParada',
  'htmlCampoHora', 'htmlTecladoHora', 'textoDiaParada', 'htmlHorasParada', 'tituloEditorParada',
  'pintarEditorParada', 'cambiarHoraParada', 'tocarHoraParada', 'teclaHoraParada', 'alternarSigueParada',
  'parametrosParada', 'guardarParada', 'teclaEditorParada', 'pasarABorrarParada', 'hastaDesdeFecha',
  'faltanParaAcceso', 'hoyArgentina', 'horaArgentina', 'textoMinutos', 'duracionTexto', 'htmlParadas', 'textoPlano',
  'normalizarBusqueda', 'esProductoChocolate', 'productosPorMasa', 'marcasFiltradas', 'textoInsumoEmpaque',
  'cargarPermisoStock', 'puedeVerStockEn', 'nombreCajaItem', 'envasePresentacion', 'partesProducido',
  'textoTamanoMasa', 'htmlChipsMasa', 'chipsDeMasa', 'sinCajaDescontada', 'textoSinCaja', 'normalizarHora',
  'horaConPaso', 'redondearKg', 'diferencias', 'textoGramos', 'textoDiferencias', 'textoKg', 'fechaCorta',
  'sumarDias', 'fechaDelDia', 'mapaDeUnidades', 'personalSinPruebas',
]
const SOLO_GESTION = [
  'cerrarMenu', 'alternarMenu', 'accionesParadaHistorial', 'abrirEditorDesdeHistorial',
  'leerEmpaqueTurno', 'empaqueConsumido', 'htmlEmpaqueTurno', 'leerEmpaqueConfig', 'faltaEmpaque',
  'nombreInsumoConfig', 'htmlEmpaquePresentacion', 'htmlConfigEmpaque', 'sincronizarCantidadesEmpaque',
  'insumoPorTexto', 'parametrosGuardarEmpaque', 'valorEmpaque', 'accionEmpaque', 'cambiarSelectEmpaque',
  'cambiarDobleBolsa', 'cargarBurbujaConos', 'textoConosPendientes', 'htmlBotonConfig', 'pintarBurbujaConos',
  'abrirConfigDesdeAcceso', 'diferenciaDeMasa', 'volverDeOficina', 'mostrarInicioOficina', 'pintarAccesosOficina',
  'unidadesDeConfig', 'pintarSelectorUnidad', 'mostrarConfig', 'htmlPestanasConfig', 'errorConfig',
  'htmlErrorPegado', 'contarPendientesMarcas', 'cargarPestanaConfig', 'pintarPestanaConfig', 'cambiosSinGuardar',
  'pedirSalida', 'htmlSalirSinGuardar', 'cancelarSalida', 'confirmarSalida', 'leerMaquinasConfig',
  'htmlConfigMaquinas', 'moverProducto', 'ordenTrasMover', 'parametrosGuardarMaquina', 'guardarEnConfig',
  'accionMaquina', 'leerRecetasConfig', 'leerInsumosDeIngredientes', 'recetaVigente', 'recetaParaRevisar',
  'filasEditorReceta', 'parametrosGuardarReceta', 'faltanEnReceta', 'proximaVersion', 'textoAntes',
  'htmlConfigRecetas', 'leerEditorReceta', 'marcarCambioReceta', 'guardarReceta', 'leerIngredientesConfig',
  'ingredientesSinInsumo', 'htmlConfigIngredientes', 'parametrosGuardarIngrediente', 'valorDe', 'accionIngrediente',
  'leerProductosConfig', 'avisoProductosRevisado', 'htmlPresentacionConfig', 'htmlConfigProductos',
  'parametrosGuardarProducto', 'parametrosGuardarPresentacion', 'campoNumero', 'accionProducto', 'leerMarcasConfig',
  'marcasPendientes', 'marcasDelCatalogo', 'parametrosRevisarMarca', 'htmlPendienteMarca', 'htmlConfigMarcas',
  'accionMarca', 'leerPersonalConfig', 'temporalVigente', 'personalVisible', 'estadoDelPin', 'puestosDe',
  'alternarPuesto', 'textoBotonPersonal', 'htmlFilaPersonal', 'htmlPanelPin', 'htmlPanelTemporal', 'htmlTemporales',
  'htmlConfigPersonal', 'guardarCambiosPersonal', 'tocarPuestoPersonal', 'pinValido', 'abrirPanelPin',
  'olvidarCampoPin', 'cerrarPanelPin', 'confirmarPinConfig', 'htmlTiraPin', 'mostrarHojaPines', 'cerrarHojaPines',
  'generarPines', 'abrirPanelTemporal', 'cerrarPanelTemporal', 'parametrosDarTemporal', 'confirmarTemporal',
  'revocarTemporal', 'unidadesDeHistorial', 'unidadInicialOficina', 'nombresDeEmpleados', 'mostrarHistorial',
  'pintarEstadosHistorial', 'filtrosHistorialValidos', 'cargarHistorial', 'htmlTablaTurnos', 'htmlFilaHistorial', 'htmlEstadoTurno',
  'sumarMedido', 'textoEntero', 'leerDetalleTurno', 'totalesConsumidos', 'detalleIncompleto', 'nombreInsumo',
  'nombreIngredienteItem', 'htmlOperariosHistorial', 'htmlMasaHistorial', 'correccionesDe', 'htmlCorreccion',
  'htmlSubloteHistorial', 'totalSublotes', 'htmlDetalleTurno', 'abrirDetalleHistorial', 'mostrarStockTerminado',
  'cargarStockTerminado', 'agruparStockTerminado', 'htmlStockTerminado',
]
// Nuevas de la gestión (se suman a su lista).
const NUEVAS_GESTION = [
  // Parte 2 (25/09/2026): la unidad de la gestión y los indicadores
  'unidadesDeGestion', 'unidadSegunBarra', 'textoSinProduccionEnBarra', 'sinUnidadPorBarra', 'unidadGestionInicial', 'pintarSelectorGestion', 'elegirUnidadGestion', 'alCambiarLaBarra',
  'numeroInd', 'enteroInd', 'diferenciaInd', 'horasMinutosInd', 'porcentajeScrapInd',
  'renderAhora', 'renderHoy', 'renderSemana', 'renderRendimiento', 'renderPendientes',
  'htmlTarjetaIndicador', 'htmlIndicadores', 'cargarIndicadores', 'irDesdeIndicador',
  // El diseño "Producción · Gestión" (26/09/2026): el menú, los indicadores
  // nuevos, Personal y PINes, la hoja, los conos y el historial de un turno
  'abrirMenu', 'seccionActual', 'destinoDeItem', 'pintarMenuActivo', 'irA', 'navegar',
  'htmlSinDatosInd', 'diaSemanaInd', 'textoDiaInd', 'diaCortoInd', 'fechaInd', 'tieneParadaInd', 'contextoAhora',
  'cajasDelDiaInd', 'sumaInd', 'htmlDiferenciaInd', 'contextoHoy', 'contextoSemana', 'rindePoco', 'gruposRendimiento',
  'renderScrap', 'htmlFallaInd', 'pintarDiaIndicadores', 'cambiarDiaIndicadores', 'htmlNumeroMenu', 'pintarNumerosMenu',
  // Las masas tiradas (30/09/2026): su tarjeta, con datos propios.
  'leerTiradas', 'resumenTiradas', 'renderTiradas',
  // Las paradas de la semana (30/09/2026): la limpieza aparte de las fallas.
  'leerParadasSemana', 'minutosDeParadaInd', 'resumenParadasSemana', 'renderParadasSemana',
  'pintarTituloConfig', 'tocarCono', 'conosDelFiltro', 'listaConosVisible', 'htmlFilaCono', 'elegirFiltroConos',
  'sinPinEnUnidad', 'rolesDe', 'deQuienHoja', 'pedirCerrarHoja', 'volverAHojaPines',
  'puedeCorregirSublote', 'htmlEditorSublote', 'horarioTurno', 'minutosParadasTurno', 'pintarDetalleHistorial',
  'abrirCorreccionSublote', 'cerrarCorreccionSublote', 'faltaEnCorreccion', 'guardarCorreccionSublote',
  // Lo que salió por retiros en el stock terminado (26/09/2026)
  'cargarPermisoRetiros', 'puedeVerRetirosEn', 'salidasPorRetiro', 'codigoRetiro', 'htmlRetirosStock',
  // Reventa y traspasos entre fábricas en el stock terminado (30/09/2026)
  'leerOrigenesReventa', 'etiquetaReventa', 'textoTipoStockTerminado', 'traspasosDeStock', 'htmlTraspasosStock',
  // El diseño "Producción · Configuración" (29/09/2026): el segmentado, la
  // lista | detalle, el color de cada producto, el empaque en su renglón, las
  // versiones de receta y los ingredientes con su stock.
  'tonoProducto', 'claveColorProducto', 'colorDeProducto', 'nombreSeccion', 'burbujaSeccion', 'htmlSeccionesConfig',
  'pintarSeccionesConfig', 'htmlPastilla', 'htmlFilaLista', 'htmlGrupoLista', 'htmlLista', 'htmlListaDetalle',
  'htmlVacioLista', 'elegidoEn', 'coincideLista', 'nombreElegido', 'pintarFilasLista', 'elegirEnLista', 'volverEnConfig',
  'cargarResumenConfig', 'contarSinEmpaque', 'actualizarResumenDesde', 'cambiarSeccionConfig',
  'leerRecetasDeMaquinas', 'tiposDeMaquina', 'textoRecetaMaquina', 'filasListaMaquinas', 'htmlAltaMaquina',
  'renglonesReceta', 'sinInsumoIngrediente', 'textoKgReceta', 'htmlRecetaVigenteMaquina', 'htmlDetalleMaquina', 'irARecetaDe',
  'cambiosEntreVersiones', 'textoQueCambio', 'htmlInsumosIngrediente', 'htmlVersiones', 'htmlTablaRecetaVista',
  'textoAutorVersion', 'htmlAutorVersion', 'htmlEditorReceta', 'htmlComparar', 'htmlDetalleReceta', 'filasListaRecetas',
  'parametrosVolverAVersion', 'accionReceta',
  'leerIngredientesBase', 'leerRecetasDeMaquinasSolo', 'nombreYMarca', 'insumosDeIngrediente', 'subIngrediente',
  'filasListaIngredientes', 'usosIngrediente', 'sugerenciasIngrediente', 'textoStockInsumo', 'textoStockSugerencia', 'ultimoLoteInsumo',
  'avisoStockIngredientes', 'htmlPanelElegirInsumos', 'htmlDetalleIngrediente',
  'borradorDesdeGuardado', 'sinNingunEmpaque', 'lineaEmpaque', 'presentacionesDeProducto', 'sinEmpaqueDeProducto',
  'gruposProductos', 'subProducto', 'filasListaProductos', 'htmlCajaPredeterminada', 'htmlAltaProducto', 'htmlCajasEditor',
  'htmlInsumosEditor', 'htmlEditorEmpaque', 'htmlFilaPresentacion', 'htmlDetalleProducto', 'tocarActivoProducto',
  'tocarActivaPresentacion', 'borradorTocado', 'abrirEmpaque', 'descartarBorrador', 'diaRelativo', 'htmlResaltado',
  // El color elegido de cada producto y la caja predeterminada (29/09/2026)
  'htmlColoresProducto', 'parametrosColorProducto', 'cambiarColorProducto', 'parametrosCajaPredeterminada', 'cambiarCajaPredeterminada',
  // Los indicadores de las máquinas (04/10/2026) y los gráficos que importa de
  // js/graficos.js (extraerFn los encuentra por el import).
  'uhPonderada', 'sumarTurnos', 'maquinasDe', 'coloresDeMaquinas', 'variacionPct', 'textoVariacion', 'diasEntreInd', 'periodoAnterior',
  'lunesDe', 'rangoTendencia', 'serieTendencia', 'msDe', 'minutosEnMarcha', 'minutosParadaEntera', 'categoriaDe', 'partesDelTurno',
  'paradasPorCategoria', 'motivosTop', 'horasMin', 'uhTexto', 'htmlTarjetaMaquina', 'htmlFigura', 'htmlMotivo', 'htmlMaquinas',
  'pintarGraficosMaquinas', 'pintarMaquinas', 'leerMetricas', 'leerParadasDeTurnos', 'periodoMaquinas', 'cargarMaquinas',
  'cambiarGranularidad', 'alCambiarAnchoMaquinas', 'barrasRendimiento', 'pintarGraficosRendimiento',
  'escGraf', 'numeroGraf', 'formatoEntero', 'cortarGraf', 'topeRedondo', 'r1', 'dato', 'svg',
  'barrasAgrupadas', 'lineas', 'barrasApiladas', 'dona', 'barrasConReferencia', 'leyendaGraf', 'activarDetalles',
  // Horarios de turno, y la planilla que volvió con lote nuevo (01/10/2026,
  // traídos de ci-prueba/planta-horarios el 05/10/2026)
  'leerHorariosConfig', 'horarioGuardado', 'horarioEnPantalla', 'duracionHorario', 'htmlConfigHorarios', 'tocarHorario',
  'parametrosHorario', 'guardarHorario', 'esRelanzado', 'finTurnoAbierto', 'finDelTurnoMs', 'htmlNotaNoVolvio',
]
const CONST_NUEVAS_GESTION = ['puedeVerGestion', 'CLAVE_UNIDAD_GESTION', 'TARJETAS_INDICADORES',
  'DIAS_SEMANA', 'UMBRAL_RINDE_POCO', 'FILTROS_CONOS',
  // El diseño "Producción · Configuración" (29/09/2026)
  'SECCIONES_CONFIG', 'ALIAS_CONFIG', 'CON_LISTA', 'ICONO_BUSCAR', 'ICONO_MAS', 'ICONO_CAJA', 'ICONO_CHEVRON', 'ICONO_ALERTA',
  'ICONO_EXCLAMACION', 'ICONO_CRUZ', 'ICONO_TILDE', 'ICONO_ESTRELLA', 'ICONO_HISTORIAL', 'ICONO_FLECHA',
  'COLORES_ELEGIBLES', 'PALETA_PRODUCTO', 'ESPECIALES_PRODUCTO', 'FILAS_CONFIG', 'ESTADO_CONO', 'swAbre', 'SW_CIERRA', 'PASTILLA_SIN_INSUMO',
  // Reventa y traspasos en el stock terminado (30/09/2026)
  'NOMBRE_TIPO_STOCK_TERMINADO',
  // Los indicadores de las máquinas (04/10/2026)
  'COLORES_MAQUINA', 'COLOR_UH_TURNO', 'CATEGORIAS_PARADA', 'PARTES_TURNO', 'GRANULARIDADES', 'MESES_CORTOS', 'TOPE_PAGINAS_METRICAS',
  // Horarios de turno (01/10/2026)
  'TURNOS_HORARIO']
// Se fueron de los DOS archivos al partirlo: la tablet ya no elige fábrica
// (la trae la cuenta del dispositivo) y el menú de la tablet no existe más.
const RETIRADAS = [
  // "Recargar" se fue (01/10/2026): vuelve el deslizar para recargar.
  'hayAlgoAMedioCargar', 'htmlConfirmaRecargar', 'pedirRecargar', 'recargarPantalla',
  'unidadInicial', 'mostrarElegirUnidad', 'elegirUnidad', 'unidadesDeCarga', 'olvidarTodas',
  'TAREAS_PRODUCCION', 'puedeEntrar', 'CLAVE_UNIDAD',
  // Se fueron de la gestión con su diseño (26/09/2026): el botón
  // "Configuración" con su burbuja y la fila de pestañas (el menú nombra
  // cada sección y lleva el número de conos al lado de "Marcas / Conos").
  // accionDelMenu era el "Menú" viejo: cada renglón nuevo lleva a su sección.
  'htmlBotonConfig', 'abrirConfigDesdeAcceso', 'htmlPestanasConfig', 'contarPendientesMarcas', 'accionDelMenu',
  // Se fueron con la planta con dos modos (28/09/2026): la barra de modos de
  // arriba la reemplazó la barra lateral; el acceso maestro quedó solo en el
  // pie de "¿Quién sos?" de Producción.
  'htmlQuienEnBarra', 'htmlBarraModos', 'pintarBarra', 'htmlMaestroEnBarra',
  // Sala de masa (parte 2): el panel de la derecha pasó arriba de la receta
  // (htmlOpcionesReceta) y la fecha de cada lote sale de stock_para_masa.
  'htmlPanelSala', 'leerFechasLotes',
  // Configuración (29/09/2026): el Empaque ya no es una sección aparte, y la
  // presentación ya no es un formulario suelto (se edita en su renglón).
  'htmlEmpaquePresentacion', 'htmlConfigEmpaque', 'htmlPresentacionConfig',
  // Planta v2 (28/09/2026): la máquina elegida va en la cabecera, no en la barra.
  'htmlLatMaquina',
  // Paradas (30/09/2026): los motivos ya no se escriben en el código (salen
  // de motivos_parada) y el motivo de una parada en curso no se cambia desde
  // la pantalla de Paradas (el trigger lo reescribe con el de la lista).
  'motivosSugeridos', 'motivoDeParada', 'textoMotivoParada', 'seleccionParada', 'tocarMotivoParada', 'guardarMotivoParada',
  'MOTIVOS_PARADA', 'OTRO_MOTIVO',
  // Paró y Terminó de producir (05/10/2026): un solo formulario de parada con
  // DESDE / HASTA y la ventana de la hora; el cierre pregunta la hora en que
  // terminó de producir, sin el ± 5 ni "La máquina se rompió".
  'esLimpieza', 'minutosLimpieza', 'limpiezaQuedaAbierta', 'htmlDuracionesParada', 'elegirDuracionParada',
  'minutosDeRueda', 'htmlColumnaRueda', 'htmlRueda', 'alinearRuedas', 'fijarRuedaPorScroll', 'ponerValorRueda', 'tocarRueda',
  'mostrarFormParada', 'confirmarParada', 'reanudar', 'htmlParadasResumen', 'alternarRota', 'cambiarHoraCierre',
  'NOMBRE_LIMPIEZA', 'DURACIONES_PARADA', 'ALTO_RUEDA', 'MINUTOS_LIMPIEZA']
// Nuevas de la planta
const NUEVAS_PLANTA = [
  'mostrarSinFabrica', 'htmlMaestroEnBarra', 'maestrosDisponibles', 'pintarQuienMaestro', 'htmlMaestrosPin',
  'elegirMaestro', 'personasParaAcceso', 'detallePersonaAcceso', 'htmlPersonaAcceso', 'htmlNotaAcceso',
  'sinAcceso', 'leerMiSesion', 'destinoDeSesion',
  // Asignar PIN con el acceso maestro (26/09/2026)
  'estadoPinPlanta', 'personasParaAsignar', 'htmlPersonaAsignar', 'htmlTecladoAsignar', 'abrirAsignarPin',
  'pintarAsignarPin', 'elegirPersonaAsignar', 'teclaAsignar', 'volverAsignarPin', 'cerrarAsignarPin',
  'confirmarAsignarPin',
  // La planta con dos modos (28/09/2026): la barra lateral y la banda de
  // "¿Quién sos?".
  'htmlBotonOtroModo', 'puestoEnLateral', 'htmlLatPersona', 'maquinaElegida',
  'htmlLatMaquina', 'htmlLatSecciones', 'htmlLatSala', 'htmlLatConexion', 'htmlLateral', 'lateralVisible',
  // Lo que queda a medio cargar al recargar deslizando (01/10/2026)
  'guardarCargaAMedias', 'tomarCargaAMedias',
  // El teclado de la tablet: "Listo" arriba del teclado (01/10/2026)
  'campoDeTexto', 'tecladoAbierto', 'revisarTeclado', 'cerrarTeclado',
  'pintarLateral', 'htmlBandaQuien', 'pintarBandaQuien', 'cancelarOtroModo', 'cambiarDePersona',
  'irASeccion', 'abrirLoProducido', 'mostrarHistorialMaquina',
  // Sala de masa con dos modos (28/09/2026): la masa nueva, lo que queda de
  // cada lote, agregar un ingrediente, otro insumo y las masas del turno.
  'quedaDelLote', 'conQuedan', 'avisosDeLotes', 'comoInicial', 'htmlOpcionesReceta', 'leerStockMasa',
  // Bultos o kilos, como en Stock (02/10/2026): lo propio de la planta y lo
  // que importa de js/cantidades.js (extraerFn lo encuentra por el import).
  'leerPresentacionesMasa', 'contenidoPorLote', 'textoStockLote', 'textoHayEmpaque',
  'formatearCantidadStock', 'equivalenteEnBultos', 'cabezaBultos', 'cantidadSegunVista', 'textoSegunVista',
  'renglonesVisibles', 'siguienteMasa', 'anteriorDesdeBorrador', 'opcionesAgregar', 'opcionesAgregarFiltradas',
  'htmlOpcionAgregar', 'pintarAgregarIngrediente', 'abrirAgregarIngrediente', 'cerrarAgregarIngrediente',
  'elegirOpcionAgregar', 'sumarPasoAgregar', 'confirmarAgregarIngrediente', 'quitarAgregado', 'escribirOtroIngrediente',
  'cargarMasasReceta', 'ultimaMasaAnulable', 'htmlMasaReceta', 'htmlMasaRecetaPendiente', 'htmlAnularUltima',
  'pintarMasasReceta', 'pedirAnularUltima', 'cancelarAnularUltima', 'confirmarAnularUltima',
  // Tirar una masa (30/09/2026): se hizo y se tiró, el stock no vuelve.
  'esTirada', 'htmlTirada', 'anteriorFueTirada', 'repintarOpcionesReceta', 'htmlTirarUltima',
  'pedirTirarUltima', 'cancelarTirarUltima', 'confirmarTirarUltima',
  'opcionesOtroInsumo', 'htmlPanelOtroInsumo', 'elegirInsumoOtro',
  // Parte 0 (28/09/2026): escribir un lote en la ventana, desde cualquier estado.
  'insumoParaEscribir', 'htmlEscribirLote', 'usarLoteEscrito', 'enfocarEscribir', 'abrirEscribirLote',
  // 4h · El historial de una máquina.
  'cargarDetalleHist', 'htmlMasaHist', 'htmlIngredientesHist', 'htmlAnularHist', 'htmlDetalleHist', 'pintarHistMaq',
  'elegirMasaHist', 'pedirAnularHist', 'cancelarAnularHist', 'confirmarAnularHist', 'nuevaMasaDesdeHist',
  // Producción con dos modos: el inicio y lo que falta para cerrar.
  'textoCajasTablero', 'htmlFaltaCierre',
  // Arreglos en la tablet real (28/09/2026): el personal se asegura en cada camino.
  'asegurarPersonal',
  // Tiempo real y el tamaño de la pantalla (28/09/2026)
  'leerTurnosVivos', 'filtrosTiempoReal', 'cambioEsDeMiFabrica', 'conectarTiempoReal', 'programarReconexionVivo',
  'alCambioVivo', 'refrescarVivo', 'revisarVivo', 'alVolverLaRed', 'textoPantalla', 'registrarPantalla', 'alReanudar',
  // La tablet real, parte C (28/09/2026): el reloj, las etiquetas de operarios,
  // los productos, la ventana de lotes, el renglón en una línea y corregir todo
  'textoReloj', 'htmlReloj', 'tocarReloj', 'iniciarReloj', 'htmlTagsOperarios', 'partesNombreProducto',
  'marcaDeInsumo', 'filasPanelLote', 'htmlFilaLote', 'abrirCorregirCompleto',
  'datosCorregirCompleto', 'confirmarCorregirCompleto',
  // Planta v2 (28/09/2026): el diseño "Planta v2" de Claude Design.
  'icono', 'inicialesDe', 'htmlRelojDoble', 'cabeceraDeVista', 'pintarCabeceraVista', 'contextoAbrir',
  'alternarBuscarOtra', 'pintarBandaMaestro', 'spanTablero', 'htmlOperariosAbrir', 'leerOcupadosYRecientes',
  'tocarMaquinaAbrir', 'apellidoDe', 'htmlOpsResumen', 'htmlMasasResumen', 'htmlParadasResumen', 'abrirVentanaOps',
  'cerrarVentanaOps', 'htmlParadasTurno', 'pintarParadas',
  'mayusculaInicial', 'indiceDeNombre', 'colorProducto', 'colorCono',
  'htmlNombreProducto', 'htmlChipCono', 'nombreCorto', 'hayMasaChocolate', 'leerUsoConos', 'ponerCajasAgregar',
  'scrapAlto', 'bloqueosCierre', 'irDesdeCierre', 'detalleAnteriorCorto', 'htmlCantidadGrande', 'usarLoteDeLista',
  'mostrarEntrar', 'errorEntrar', 'conReintento', 'textoDeHtml',
  // La receta que cambia en medio del turno (30/09/2026).
  'recetaCambioDesdeAnterior', 'nuevosEnReceta', 'otrosDeLaAnterior', 'textoCambioReceta', 'leerRecetaDeLaAnterior',
  // "Anterior (última)": qué masa fue y cuándo (30/09/2026).
  'diaDeLaMasa', 'cuandoFueLaAnterior', 'leerTurnoDeLaAnterior',
  // El botón de volver y "¿Salir sin guardar?" (30/09/2026).
  'destinoVolver', 'aMedioCargar', 'pintarVolver', 'irAlInicioDelModo', 'volverEnPlanta', 'pedirConfirmacion', 'pintarConfirma', 'responderConfirma',
  // Paradas con motivos fijos y anotar una que ya pasó (30/09/2026).
  'leerMotivosParada', 'asegurarMotivosParada', 'esLimpieza', 'motivoElegido', 'paradaNuevaVacia', 'paradaNuevaEmpezada',
  'pasoAnteriorParada', 'volverPasoParada', 'prepararParadaNueva', 'textoParadaNueva', 'textoDuracion', 'hhmm', 'puedeQuedarAbierta',
  'horasParadaNueva', 'minutosLimpieza', 'limpiezaQuedaAbierta', 'faltanParaParadaNueva', 'parametrosParadaNueva', 'resumenParadaNueva',
  'minutosDeRueda', 'htmlColumnaRueda', 'htmlRueda', 'alinearRuedas', 'fijarRuedaPorScroll', 'ponerValorRueda', 'tocarRueda',
  'htmlMotivosParada', 'htmlDuracionesParada', 'htmlHorasParadaNueva', 'pintarResumenParada', 'pintarParadaNueva', 'elegirMotivoParada',
  'elegirDuracionParada', 'escribirDetalleParada', 'guardarParadaNueva', 'abrirVentanaParadas', 'cerrarVentanaParadas',
  // Las pestañas de las máquinas (01/10/2026).
  'nombreCortoMaquina', 'turnoDePantalla', 'pestanasMaquinas', 'htmlPestanasMaquinas', 'pintarPestanasMaquinas', 'cambiarDeMaquina',
  // Las tres acciones, Paró, la ventana de la hora y Terminó de producir (05/10/2026).
  'htmlAccionLargada', 'htmlAccionParo', 'htmlAccionTermino', 'faltaLargada', 'horarioDePlanilla',
  'grupoDeMotivo', 'motivosAgrupados', 'htmlMotivosAgrupados', 'puedeLoteNuevo', 'alternarSigueParadaNueva', 'alternarLoteNuevoParada',
  'textoRelanzado', 'htmlAvisoRelanzado', 'trasRelanzar',
  'horaSugerida', 'horaCorta', 'abrirHoraVentana', 'cerrarHoraVentana', 'muestraHoraVentana', 'conAhoraVentana', 'htmlHoraVentana',
  'textosHoraVentana', 'pintarHoraVentana', 'teclaHoraVentana', 'ahoraHoraVentana', 'alternarLoteNuevoVentana', 'instanteDelTurno', 'instanteLargada',
  'vueltaDeParada', 'pedidoHoraVentana', 'confirmarHoraVentana', 'teclaVentanaHora',
  'textoMotivoCierre', 'ponerHoraCierre', 'pintarMotivoCierre', 'elegirMotivoCierre',
  // El cierre simple y la planilla que llega tarde (07/10/2026).
  'elegirParoAntes', 'planillaSigue',
  // Sin internet (06/10/2026): la cola y la copia (de js/sin-internet.js) y
  // lo propio de la planta. La cola corre de verdad, con el almacén en
  // memoria (no hay IndexedDB en el sandbox).
  'esErrorDeRedCarga', 'almacenMemoria', 'structuredCloneSeguro', 'promesaDe', 'abrirAlmacenIdb', 'almacenPlanta',
  'resolverReferencias', 'crearCola', 'resumenDeCola', 'textoCartelCola', 'horaDeCopia', 'sesionGuardada',
  'colaPlanta', 'sinInternet', 'enviarCargaCola', 'mandarCarga', 'textoGuardadaEnTablet', 'paradaRef', 'alCambiarCola',
  'refrescarListaCola', 'procesarColaPlanta', 'textoColaFila', 'htmlEstadoColaFila', 'planillaConCola', 'repintarConCola',
  'recargarOConCola', 'turnosConCierreEnCola', 'htmlErroresCola', 'pintarCartelCola', 'reintentarCarga', 'descartarCarga',
  'precargarCopias', 'registrarServiceWorker', 'pedirRevisionVersion', 'alMensajeSW', 'mostrarAvisoVersion', 'actualizarVersion',
  'etiquetaMasa',
  // La calculadora de cajas (06/10/2026)
  'sumarCajas', 'recordarCajas', 'sumarCajasAgregar', 'deshacerCajasAgregar', 'borrarCajasAgregar',
]
const CONST_EN_AMBOS = ['VISTAS', 'LARGO_PIN', 'LARGO_PIN_MAESTRO', 'ZONA_AR', 'PUESTOS', 'EMBOLSADOS', 'TEXTO_EMBOLSADO',
  'MS_DIA', 'TOLERANCIA_FUTURO_MS', 'PISO_APERTURA_MS', 'MAX_CRUCE_MS']
const CONST_SOLO_GESTION = ['PESTANAS_CONFIG', 'CLAVE_AVISO_PRODUCTOS', 'NUEVO_TIPO', 'LECTORES_CONFIG', 'RENDERS_CONFIG',
  'puedeVerHistorial', 'TOPE_FILAS', 'ESTADO_TURNO', 'TIPO_CORRECCION', 'CONDICIONES_EMPAQUE']
// ICONO primero: ICONO_MODO y otras lo usan al declararse.
const CONST_NUEVAS_PLANTA = ['ICONO', 'LINKS_SIN_SESION',
  'TABLAS_VIVAS', 'CADA_REVISION_VIVO_MS', 'QUIETO_PARA_REVISAR_MS', 'ICONO_MODO', 'OTRO_MODO', 'NOMBRE_MODO', 'SECCIONES_PRODUCCION', 'SECCION_DE_VISTA', 'MINIMO_PARA_BUSCAR',
  // Planta v2 (28/09/2026)
  'PANTALLAS_SIN_BARRA', 'QUE_HACE_PUESTO', 'COLOR_TAMANO', 'COLOR_CHOCO',
  'TONOS_NOMBRE', 'PALETA_CONO', 'COLOR_CONO_COMUN', 'COLORES_ELEGIBLES',
  // Lo que queda a medio cargar al recargar (01/10/2026)
  'CLAVE_AGREGAR_A_MEDIAS', 'CLAVE_PARADA_A_MEDIAS', 'CAMPOS_AGREGAR_A_MEDIAS',
  'MARGEN_TECLADO',
  // El botón de volver (30/09/2026)
  'VISTAS_INICIO',
  // Paradas (30/09/2026)
  'NOMBRE_CATEGORIA_PARADA', 'GRUPOS_MOTIVO',
  // La hora de largada con la regla de las 2 horas de la base (05/10/2026)
  'MARGEN_LARGADA_MS',
  'VISTAS_CON_PESTANAS',
  // De js/cantidades.js (02/10/2026)
  'DECIMALES_CANTIDAD', 'FRACCIONES',
  // Sin internet (06/10/2026): de js/sin-internet.js y de la planta
  'NOMBRE_BASE', 'VERSION_BASE', 'CADA_REINTENTO_MS', 'GUARDAR_ENVIADOS_MS', 'VIDA_COPIA_MS', 'ORDEN',
  'CLAVE_SESION_SB', 'CADA_PRECARGA_MS', 'CADA_REVISAR_VERSION_MS', 'MS_TODO_ENVIADO',
  'MENSAJE_ABRIR_SIN_RED', 'MENSAJE_PIN_SIN_RED', 'MENSAJE_LOTE_NUEVO_SIN_RED', 'MENSAJE_SIN_RED']

const CONSTANTES_BASE = [
  'TAREAS_PRODUCCION', 'puedeEntrar',
  'CLAVE_MODO', 'CLAVE_UNIDAD', 'CLAVE_PERSONA', 'PUESTO_DE_MODO', 'TITULO_DE_MODO',
  'ROL_DE_MODO', 'PLURAL_PUESTO', 'VISTAS', 'VISTAS_OFICINA',
  'MINUTOS_INACTIVIDAD', 'LARGO_PIN', 'LARGO_PIN_MAESTRO',
  'ZONA_AR', 'TURNOS', 'CTX_PLANILLA',
  'PREFIJO_BORRADOR_MASA', 'PREFIJO_MASA_EN_CURSO', 'INGREDIENTES_PASO_GRANDE', 'ETIQUETA_ORIGEN',
  'UMBRAL_ALEJADA', 'MS_BOTON_REGISTRADA', 'MOTIVO_PASADA_A_CHOCOLATE',
  'PESTANAS_CONFIG', 'PUESTOS', 'CLAVE_AVISO_PRODUCTOS', 'NUEVO_TIPO', 'LECTORES_CONFIG', 'RENDERS_CONFIG',
  'puedeVerHistorial', 'TOPE_FILAS', 'ESTADO_TURNO', 'TIPO_CORRECCION',
  'EMBOLSADOS', 'TEXTO_EMBOLSADO', 'CONDICIONES_EMPAQUE',
  'AVISO_SALA_REINTENTAR',
  'MS_DIA', 'TOLERANCIA_FUTURO_MS', 'PISO_APERTURA_MS', 'MAX_CRUCE_MS',
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
  var lecturaPersonal = null
  var relojPlanta = null
  var canalVivo = null, claveCanalVivo = '', relojVivo = null, reconexionVivo = null, nroCanalVivo = 0
  var __registros = []
  function registrarError(r) { __registros.push(r) }
  // El tiempo real (js/salud.js, 30/09/2026): se anota el corte y la vuelta.
  var __tiempoReal = []
  function tiempoRealCaido(estado) { __tiempoReal.push(['caido', estado]) }
  function tiempoRealConectado() { __tiempoReal.push(['conectado']) }
  var __canales = []
  var reintentando = false
  // Sin internet (06/10/2026): los let del módulo y de js/sin-internet.js.
  var colaInstancia = null, almacenUnico = null, precargando = null, sinInternetInstalado = false
  var relojBotonRegistrada = null
  var turnoBurbujaConos = 0
  var turnoResumenConfig = 0
  var turnoIndicadores = 0
  var turnoMaquinas = 0
  var esperaAnchoMaquinas = null
  var __uuids = 0
  var crypto = { randomUUID() { __uuids++; return 'uuid-' + __uuids } }
  var navigator = { onLine: true, wakeLock: null }
  var window = { location, scrollTo(){}, addEventListener(){}, lucide: null, confirm: () => true }
  var history = { replaceState(){}, pushState(){}, back(){} }
  // Los timers no corren: se anotan [función, ms] en __timeouts, así una
  // suite puede disparar a mano el que le interesa (30/09/2026).
  var __timeouts = []
  function setTimeout(f, ms) { __timeouts.push([f, ms]); return 0 } function clearTimeout(){} function setInterval(){ return 0 } function clearInterval(){}

  var __llamadas = { rpc: [], errores: [], exitos: [], consultas: [], tablet: [] }
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
    rpc(nombre, params) {
      if (nombre === 'ejecutar_tablet') {
        __llamadas.tablet.push([params.p_client_uuid, params.p_operacion, params.p_params])
        __llamadas.rpc.push([params.p_operacion, params.p_params])
        return Promise.resolve(__rpc(params.p_operacion, params.p_params, params.p_client_uuid))
      }
      __llamadas.rpc.push([nombre, params]); return Promise.resolve(__rpc(nombre, params))
    },
    // Un canal de tiempo real simulado: guarda cada .on() y el callback de
    // .subscribe(), así la suite dispara cambios y estados a mano.
    // Como realtime-js 2.117: un canal con el MISMO nombre que todavía no
    // terminó de cerrarse se devuelve en vez de crear otro (removeChannel lo
    // saca recién cuando el servidor confirma: __cerrarCanal).
    channel(nombre) {
      const existe = __canales.find(x => x.nombre === nombre && !x.cerrado)
      if (existe) return existe
      const c = { nombre, ons: [], estadoCb: null, quitado: false, cerrado: false,
        on(tipo, cfg, cb) { this.ons.push({ tipo, cfg, cb }); return this },
        subscribe(cb) { this.estadoCb = cb; return this } }
      __canales.push(c)
      return c
    },
    removeChannel(c) { c.quitado = true; return Promise.resolve('ok') },
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

const esGestion = (ruta) => /produccion-gestion/.test(String(ruta))

function listas(ruta) {
  const fuera = new Set(RETIRADAS)
  if (esGestion(ruta)) {
    const f = new Set([...EN_AMBOS, ...SOLO_GESTION, ...NUEVAS_GESTION])
    const c = new Set([...CONST_EN_AMBOS, ...CONST_SOLO_GESTION, ...CONST_NUEVAS_GESTION])
    return {
      funciones: [...FUNCIONES_BASE, ...NUEVAS_GESTION].filter(n => f.has(n) && !fuera.has(n)),
      constantes: [...CONSTANTES_BASE, ...CONST_NUEVAS_GESTION].filter(n => c.has(n) && !fuera.has(n)),
    }
  }
  const g = new Set([...SOLO_GESTION, ...CONST_SOLO_GESTION])
  return {
    funciones: [...FUNCIONES_BASE, ...NUEVAS_PLANTA].filter(n => !g.has(n) && !fuera.has(n)),
    constantes: [...CONSTANTES_BASE, ...CONST_NUEVAS_PLANTA].filter(n => !g.has(n) && !fuera.has(n)),
  }
}

function construirProduccion(ruta, { funciones = [], constantes = [], preludioExtra = '' } = {}) {
  const base = listas(ruta)
  const todasConst = [...new Set([...base.constantes, ...constantes])]
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioExtra,
    funciones: [...new Set([...base.funciones, ...funciones])],
    constantes: todasConst,
    retorno: `${todasConst.join(', ')}, estado, __els, __doc: document, __body, __llamadas, __ls, localStorage,
      __ss, sessionStorage, __pinMaestro(){ return pinMaestro }, __tablas, __setRpc(f){ __rpc = f },
      __uuids(){ return __uuids }, __timeouts, __nav: navigator, __canales, __registros, __tiempoReal(){ return __tiempoReal }, __canalVivo(){ return canalVivo }, __win: window,
      ponerNumero, leerCampoNumero, enlazarCampoNumero`,
  })
}

// La gestión, para las suites que prueban las dos puntas.
const GESTION = require('path').join(__dirname, '..', 'modulos/produccion-gestion.html')

module.exports = { construirProduccion, FUNCIONES_BASE, CONSTANTES_BASE, EN_AMBOS, SOLO_GESTION, GESTION, esGestion }
