// Arma un sandbox con las funciones REALES de modulos/administracion.html y de
// js/retiros-comun.js (la hoja, que se pega detrás del script con
// fuente-cobranzas.js). Se EJECUTAN.
//
// supabase es un doble que devuelve __tablas[tabla] (array o función que
// recibe los filtros) y responde las rpc con __rpc(). El doble IGNORA el
// .select(): lo que importa de un select se afirma sobre __llamadas.consultas.

const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_CU, CONSTANTES_CU } = require('./cuenta-unica-comun')
const { FUNCIONES_FR, CONSTANTES_FR } = require('./faltante-comun')
const { FUNCIONES_CANTIDADES, CONSTANTES_CANTIDADES, FUNCIONES_PRECIO, CONSTANTES_PRECIO } = require('./cantidades-comun')

// Los acopios, la cuenta en el grupo, "(también en Nuss)" y valorizar con la
// lista de otra empresa (27/10/2026). Van todas a la base: las llaman la
// portada, la cuenta del cliente y valorizar. (El saldo del acopio al revisar
// un remito se mudó a Remitos Dolce el 28/10/2026.)
const FUNCIONES_ACOPIOS = [
  'leerPrincipales', 'textoTambienEn', 'unidadListaDeOtraEmpresa', 'presentacionEnUnidad', 'leerPrecioVentaEn',
  'acopiosVacio', 'acopiosEnEmpresa', 'asegurarAcopiosEmpresa', 'leerAcopios', 'estadoAcopio', 'cajasAcopio', 'textoQuedanAcopio', 'porcentajeAcopio',
  'nombreProductoAcopio', 'papelesAcopio', 'htmlBarraAcopio', 'htmlSelloEstadoAcopio', 'htmlTarjetaAcopio', 'acopiosFiltrados', 'htmlFiltroAcopios',
  'htmlListaAcopios', 'puedeCargarAcopio', 'pintarAcopios', 'mostrarAcopios', 'cargarAcopios', 'contarAcopiosPortada', 'contenidoSeccionAcopios',
  'nuevoAcopioVacio', 'abrirNuevoAcopio', 'htmlClientesAcopio', 'htmlClienteAcopio', 'htmlOpcionesAcopio', 'htmlMarcasAcopio', 'htmlProductoAcopio',
  'importeAcopio', 'textoTotalAcopio', 'htmlNuevoAcopio', 'enlazarNuevoAcopio', 'errorNuevoAcopio', 'parametrosCrearAcopio', 'guardarNuevoAcopio',
  'accionAcopios', 'elegirClienteAcopio', 'elegirProductoAcopio', 'elegirMarcaAcopio', 'alTocarAcopios', 'alEscribirAcopios', 'alCambiarAcopios',
  'acopioDe', 'leerMovimientosAcopio', 'leerAnulacionAcopio', 'abrirAcopio', 'htmlMovimientoAcopio', 'puedeAnularAcopio', 'htmlAnularAcopio',
  'htmlDetalleAcopio', 'pintarAcopio', 'confirmarAnularAcopio', 'alTocarAcopio', 'alEscribirAcopio', 'volverDeAcopio',
  'cargarAcopiosCliente', 'htmlAcopiosCliente', 'cargarCuentaGrupo', 'nombreEmpresaGrupo', 'htmlCuentaGrupo',
  // Lo de la Carga que usa "Nuevo acopio" (js/remitos-comun.js desde el 28/10/2026).
  'presentacionRemito', 'productoDePresentacionRemito', 'nombreConoRemito', 'nombreConoPorIdRemito', 'nombreRenglonRemito', 'ordenCategoriaRemito', 'opcionesRemito', 'gruposRemito',
  'limpioRc', 'normalizarRc', 'insumoRemito',
  // Las unidades de la caja ("× 252 u.", 29/10/2026).
  'unidadesPresentacionRemito', 'textoUnidadesRemito', 'presentacionConUnidadesRc',
  'clientesParaAsentar', 'apodoMostrarRet', 'claveBusquedaCliente',
]

// Corregir una orden (29/10/2026): el editor, el resumen, el historial
// ("Corregida N veces") y lo que faltó en stock. Las llaman leerOrden,
// htmlDetalleOrden, pintarOrden y pintarAccionesOrden.
const FUNCIONES_CORREGIR = [
  'puedeCorregirOrden', 'puedeGuardarCorregir', 'textoSinCargarCorregir', 'valorizadaCorregir', 'conPreciosCorregir', 'redondearCorregir',
  'decimalesRenglonCorregir', 'claveLotesCorregir', 'fotoRenglonCorregir', 'renglonCorregirDeItem', 'renglonCorregirNuevo', 'renglonCorregir',
  'nombreItemCorregir', 'nombreRenglonCorregir', 'cantidadTextoCorregir', 'prefijoTipoCorregir', 'descripcionItemCorregir', 'descripcionRenglonCorregir',
  'estadoLotesCorregir', 'textoLotesCorregir', 'quitadosCorregir', 'cambiosRenglonCorregir', 'cambiosDatosCorregir', 'hayCambiosCorregir',
  'lineasResumenCorregir', 'erroresCorregir', 'precioEstimadoCorregir', 'subtotalCorregir', 'totalesCorregir', 'textoTotalCorregir',
  'textoSubtotalCorregir', 'textoDiferenciaCorregir', 'itemCorregirParaBase', 'parametrosCorregir', 'conteosFilaOrden', 'abrirCorregir',
  'revisarCorregir', 'volverAEditarCorregir', 'cancelarCorregir', 'guardarCorregir', 'textoFaltanteCorreccion', 'htmlFaltantesCorreccion', 'leerCorreccionesDeOrden',
  'htmlCorreccionesOrden', 'htmlCorregirOrden', 'htmlRenglonCorregir', 'htmlOpcionesCorregir', 'htmlMarcasCorregir', 'htmlProductoCorregir',
  'htmlDevCorregir', 'htmlLotesCorregir', 'htmlResumenCorregir', 'enlazarCorregir', 'enfocarCorregir', 'agregarRenglonCorregir',
  'quitarRenglonCorregir', 'cambiarProductoCorregir', 'elegirProductoCorregir', 'elegirMarcaCorregir', 'agregarLoteCorregir', 'quitarLoteCorregir',
  'accionCorregir', 'alTocarCorregir', 'repintarCuentasCorregir', 'alEscribirCorregir',
]

const FUNCIONES_BASE = [
  'esc', 'normalizar', 'limpio', 'hoyArgentina', 'esFechaIso', 'fechaCorta',
  'tieneTarea', 'puedeEn', 'seccionVisible', 'hayGlobales', 'seccionesVisibles', 'empresasDeAdministracion', 'empresaActual', 'puedeVerLotes', 'linksVisibles', 'moduloVisible',
  'leerPreferencia', 'guardarPreferencia', 'mostrarVista', 'mostrarCheques',
  // La pila de navegación: "← Volver" y el atrás del navegador (14/10/2026)
  'scrollActual', 'apilarNav', 'pintarVolverPila', 'abrirOrdenDesde', 'abrirCobranzaDesdeCuenta', 'volverPila',
  'alVolverNavegador', 'desapilarNav', 'refrescarAlVolver', 'puedeVerLaOrden', 'flechaVisible', 'propioVuelveAlMismoLugar', 'volverAOrdenes',
  // Lista | detalle en la compu (05/10/2026)
  'ladoALado', 'aplicarListaDetalle', 'marcarElegidosLista',
  'htmlLogo', 'empresaSegunBarra', 'htmlEmpresas', 'pintarEmpresas', 'elegirEmpresa', 'empresaInicial', 'alCambiarLaBarra',
  'leerClientes', 'leerCatalogo', 'insumoDe', 'partesInsumo', 'asegurarDatosEmpresa', 'clienteDe', 'asegurarNombres', 'partesRenglon',
  'contarSinValorizar', 'textoNumeroSeccion', 'htmlSeccion', 'htmlLink', 'pintarPortada', 'mostrarInicio', 'abrirSeccion',
  // El diseño "Administración" (29/09/2026): pestañas y tarjetas de la portada
  'colorDeModulo', 'htmlTrazo', 'coloresIcono', 'plataPortada', 'diasEntreIso', 'resumenCheques', 'htmlLineaSeccion', 'contenidoSeccion',
  'burbujaPestana', 'htmlPestanas', 'contarPortada', 'pintarPestanas', 'enOrdenDePestanas', 'leerChequesPortada', 'contarDesde', 'leerResumenClientes',
  'htmlSelloOrden', 'leerOrdenes', 'htmlFilaOrden', 'htmlListaOrdenes', 'htmlOpcionesClientes', 'pintarOrdenes',
  'cargarOrdenes', 'mostrarOrdenes', 'leerFiltros',
  'leerOrden', 'lotesDeRenglon', 'cantidadValorizable', 'htmlDatoAd', 'htmlRenglonOrden', 'htmlDetalleOrden', 'pintarOrden', 'pintarAccionesOrden', 'abrirOrden',
  'clavePrecio', 'preciosInsumosDeLista', 'leerSaldoCliente', 'abrirValorizar',
  'precioFijoDeVersion', 'textoPrecioInsumoGrilla',
  // Valorizar con precio_venta() (30/09/2026)
  'textoPrecioUnitario', 'textoOrigenPrecio', 'htmlOrigenPrecio', 'leerPrecioVenta', 'precioPropioEnLista', 'subtotalValorizar', 'totalValorizar', 'textoTotalValorizar',
  'saldoProyectado', 'avisoLimite', 'faltanPrecios', 'htmlValorizar', 'cambiarPrecio', 'parametrosValorizar',
  // La comisión de una orden (06/10/2026)
  'comisionHabitualDe', 'faltaComision', 'ordenesComisionSinCargar', 'importeComision', 'totalConComision', 'validarComision',
  'textoPorcentaje', 'textoCalculoComision', 'parametrosComision', 'puedeCargarComision', 'comisionDesactualizada', 'rotuloComision',
  'htmlPanelComision', 'htmlComisionOrden', 'abrirComision', 'elegirModoComision', 'cambiarValorComision', 'cancelarComision',
  'guardarComision', 'porcentajeComision',
  'guardarValorizacion', 'cancelarValorizar', 'pedirAnular', 'cancelarAnular', 'confirmarAnular',
  'ordenParaHoja', 'imprimirOrden', 'prepararHojaOrden', 'textoResultadoEnvio', 'enviarOrdenAd',
  // Clientes
  'leerSaldos', 'pasaLimite', 'limiteDe', 'contarSobreLimite', 'clientesFiltrados', 'htmlFilaCliente', 'htmlListaClientes',
  'pintarClientes', 'mostrarClientes', 'abrirAlta', 'puedeDarAlta', 'parametrosAlta', 'guardarAlta', 'leerCuenta', 'detalleMovimiento',
  'tieneSaldoInicial', 'htmlCuenta', 'pintarCliente', 'abrirCliente', 'abrirPanelCliente', 'cerrarPanelCliente', 'guardarPanelCliente',
  // Las notas de débito (24/10/2026)
  'leerNotasDebitoCliente', 'notaDeMovimiento', 'puedeNotaDebitoCliente', 'renglonNota', 'htmlRenglonesNota', 'itemsNota', 'totalNota',
  'erroresNotaCliente', 'parametrosNotaCliente', 'abrirNotaDebitoCliente', 'pintarRenglonesNota', 'pintarTotalNotaCliente',
  'escribirRenglonNota', 'agregarRenglonNota', 'quitarRenglonNota', 'guardarNotaDebitoCliente',
  'letrasMenorDeMilNd', 'letrasMenorDeMillonNd', 'enteroEnLetrasNd', 'importeEnLetrasNd', 'cuitConGuionesNd', 'fechaNd', 'htmlNotaDebito',
  'puedeAnularNotaDebito', 'leerUnidadNotaDebito', 'nombreArchivoNota', 'abrirNotaDebito', 'pintarNotaDebito', 'cerrarNotaDebito', 'imprimirNotaDebito',
  'pdfNotaDebito', 'compartirNotaDebito', 'pedirAnularNotaDebito', 'cancelarAnularNotaDebito', 'confirmarAnularNotaDebito',
  // Clientes apagados y el interruptor (28/09/2026)
  'textoCodigoAnterior', 'puedePrenderApagar', 'htmlInterruptor', 'leerApagados', 'clientesDeLaLista', 'cargarApagados',
  'cambiarMostrarApagados', 'cambiarActivoCliente',
  // Clientes de "Todas las fábricas" (29/09/2026)
  'empresasDeClientes', 'clientesEnTodas', 'fichaCliente', 'porSaldo', 'leerClientesTodas', 'leerApagadosTodas',
  'elegirEnSegmento', 'abrirClienteDeLista',
  // La etiqueta de la empresa con su color (30/09/2026; js/barra-unidad.js)
  'nombreCorto', 'colorEmpresa', 'htmlSelloEmpresa',
  // El cliente completo (30/09/2026)
  'cuitDeCliente', 'agruparClientes', 'saldoConocido', 'totalDelGrupo', 'textoDebeGrupo', 'gruposDeLaLista', 'htmlGrupoCliente',
  'agrupandoClientes', 'pasarAEmpresa', 'leerOtrasCuentas', 'htmlOtrasCuentas', 'abrirOtraCuenta',
  'leerFicha', 'asegurarListas', 'asegurarProveedores', 'valorComparable', 'cambiosFicha', 'leerFormFicha', 'htmlOpcionesListas',
  'proveedoresFiltrados', 'htmlProveedorElegido', 'htmlResultadosProveedores', 'pintarProveedorFicha', 'textoCambiosFicha',
  'pintarPieFicha', 'llenarFicha', 'abrirFicha', 'elegirProveedorFicha', 'guardarFicha',
  // Los apodos de la ficha (02/10/2026)
  'agregarApodoALista', 'htmlApodosFicha', 'pintarApodosFicha', 'parametrosApodos', 'guardarApodos',
  'agregarApodoFicha', 'quitarApodoFicha',
  // Los clientes provisorios (06/10/2026)
  'esProvisorio', 'contarProvisorios', 'provisoriosPrimero', 'actualizarProvisoriosPortada', 'puedeConfirmar', 'htmlAccionesProvisorio',
  // Permisos en pantalla (11/10/2026, M2): solo los provisorios para quien gestiona clientes
  'puedeGestionarCliente', 'puedeLeerClientes', 'puedeCompletarFicha', 'confirmarProvisorio', 'leerSoloProvisorios',
  'htmlFilaSoloProvisorio', 'htmlSoloProvisorios',
  'abrirCompletar', 'pintarConfirmarFicha', 'guardarYConfirmarFicha', 'destinosUnir', 'abrirUnir', 'cerrarUnir', 'leerPreviaUnir',
  'textoCantidad', 'textosPreviaUnir', 'elegirDestinoUnir', 'cambiarDestinoUnir', 'pedirConfirmarUnir', 'noConfirmarUnir', 'unirClientes',
  'htmlDestinoUnir', 'htmlUnir', 'pintarUnir', 'avisarFaltaLista', 'htmlFaltaLista', 'cerrarFaltaLista', 'irAFichaDesdeOrden',
  // Listas de precios
  'htmlFilaLista', 'pintarListas', 'mostrarListas', 'abrirListaNueva', 'guardarListaNueva', 'listaDe', 'leerPreciosLista',
  'versionesDe', 'vigenteYProximo', 'filasGrilla', 'preciosAGuardar', 'calcularAumento', 'htmlFilaPrecio', 'htmlGrilla',
  'htmlHistorial', 'textoPendientes', 'pintarLista', 'abrirLista', 'enlazarPorcentaje', 'cambiarPrecioLista', 'aplicarAumento',
  'descartarCambios', 'pedirGuardarPrecios', 'confirmarGuardarPrecios', 'cambiarActivaLista',
  // La lista interna (30/09/2026)
  'textoListaInterna', 'pintarListaInterna',
  // La grilla completa: lista_completa (30/09/2026)
  'leerListaCompleta', 'leerListaCompletaSegura', 'completaDelProducto', 'listaDerivada', 'filaEditable', 'numeroONull',
  'precioUnitarioONada', 'textoPrecioVentaGrilla', 'conConoConPrecioNuevo', 'chocanMismaFecha', 'textoChoqueMismaFecha',
  'htmlFilaProducto', 'htmlConito', 'plantillaConito', 'textoConConoNuevo', 'pintarConConoNuevo', 'recargoDeLista',
  // Los insumos de una lista a precio fijo o costo + % (09/10/2026)
  'plataInsumoLista', 'porUnidadInsumo', 'renglonesInsumosLista', 'precioConRecargo', 'textoRenglonInsumo', 'leerInsumosLista',
  'cargarInsumosLista', 'htmlInsumosLista', 'htmlOpcionInsumoLista', 'htmlEditorInsumoLista', 'textoPreviaInsumoLista', 'campoValorInsumo',
  'pintarPreviaInsumoLista', 'pintarInsumosLista', 'abrirEditorInsumoLista', 'cambiarModoInsumoLista', 'validarInsumoLista',
  'parametrosPrecioInsumoLista', 'guardarInsumoLista',
  // Los clientes de una lista (30/09/2026)
  'clientesActivosEmpresa', 'htmlNombresCortos', 'htmlResumenClientesLista', 'htmlClientesLista', 'pintarClientesLista', 'cambiarListaCliente',
  // js/retiros-comun.js
  'escHoja', 'logoSeguro', 'datosFaltantesEmpresa', 'textoFaltantesEmpresa', 'fechaHoja', 'fechaHoraHoja',
  'enteroHoja', 'importeHoja', 'decimalesDeUnidad', 'unidadHoja', 'cantidadInsumoHoja', 'tieneInsumos', 'totalCajasOrden', 'totalUnidadesOrden', 'textoLotes', 'nombreInsumoHoja',
  'htmlEmpresaHoja', 'htmlClienteHoja', 'htmlFilaHoja', 'htmlTablaHoja', 'htmlCopiaHoja', 'htmlHoja', 'asegurarEstilosHoja', 'textoRemitoHoja',
  'faltanteDeRenglon', 'descripcionHoja', 'htmlNotasHoja', 'htmlSelloAnulada', 'paginasHoja',
  // La hoja nueva (26/10/2026): CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE.
  'porCajaHoja', 'nombreConoHoja', 'conMayuscula', 'bultoInsumoHoja', 'descripcionCortaHoja', 'htmlDescripcionHoja', 'bultosHoja',
  'cantidadColHoja', 'totalColHoja', 'htmlLotesHoja', 'rotuloTotalHoja', 'totalPesoHoja',
  // La venta por unidad (27/10/2026): los conos de papel sueltos.
  'esPorUnidadHoja', 'palabraUnidadesHoja', 'cantidadUnidadesHoja', 'unidadesDeRenglonHoja', 'totalUnidadesSueltasOrden',
  // La impresión nueva (07/10/2026): medida, media hoja u hojas enteras.
  'htmlLogoHoja', 'textoTransporteHoja', 'htmlPieHoja', 'rotuloCopiaHoja', 'planHoja', 'medirHoja', 'armarHoja',
  // Imprimir pegado al toque, por el iPhone (26/10/2026): del común y de la pantalla.
  'nuevaImpresion', 'claveHoja', 'hojaLista', 'olvidarHoja', 'prepararHoja', 'esIos', 'imprimirHoja', 'mostrarListoParaImprimir',
  'asegurarEstilosListo', 'impresionHoja',
  // Sin cortes de más (23/10/2026): las medidas que no pueden ser.
  'medidasRaras', 'textoMedidaRara', 'registrarMedidaRara', 'hojaConEstilos', 'esperarHojaLista',
  'textoOrden', 'nombreArchivoPdf', 'asuntoMail', 'emailValido', 'urlMailto', 'cargarScript', 'generarPdf', 'enviarOrden',
  // Devoluciones y reposiciones (22/10/2026)
  'esDevolucionHoja', 'ordenarRenglonesHoja', 'textoDestinoDevuelto', 'detalleDevolucionHoja', 'totalCajasDevueltas', 'htmlFilaDevolucionHoja',
  'tipoItem', 'esItemDev', 'textoDevolucionItem', 'cajasQueSalen', 'textoAFavor',
  // Importar (26/09/2026)
  'normalizarEncabezado', 'mapearColumnas', 'textoCelda', 'fechaIsoLocal', 'numeroCelda', 'fechaCelda', 'cuitValido', 'cbuValido',
  'condicionIvaDe', 'claveNombreCliente', 'filasDeHoja', 'estadoFila', 'filaPrevia', 'marcarRepetidas', 'textoFilas',
  'validarClientes', 'parametrosCliente', 'validarPrecios', 'validarSaldos', 'validarImportacion',
  'plantillaClientes', 'instruccionesClientes', 'plantillaPrecios', 'plantillaSaldos', 'filasResumen',
  'cargarXlsx', 'textoDeCsv', 'esCsv', 'leerArchivoPlanilla', 'descargarPlanilla', 'nombreArchivoImportar',
  'importarVacio', 'cuentaImportar', 'textoCuentaImportar', 'htmlFilaImportar', 'htmlVistaPrevia', 'textoConfirmarImportar',
  'pintarImportar', 'mostrarImportar', 'elegirTipoImportar', 'contextoImportar', 'procesarFilasImportar', 'subirArchivoImportar',
  'bajarPlantillaImportar', 'pedirGuardarImportacion', 'confirmarImportacion', 'bajarResumenImportar', 'descartarImportacion',
  // Cobranzas por asentar (27/09/2026)
  'puedeVerLaCobranza', 'aparearCobranzas',
  'puedeAsentar', 'puedeVerTodasLasCobranzas', 'cobranzasVacio', 'datosCobranza', 'leerPorAsentar', 'leerChequesDe', 'asegurarBancos',
  'nombreBanco', 'asegurarClientesAsentar', 'nombreEmpresa', 'clientesParaAsentar', 'importeCob', 'textoSaldoCliente', 'htmlChequeCob',
  'htmlFormaPago', 'htmlTransferenciaCob', 'htmlTransferenciasCob', 'textoDondeVaLaPlata', 'htmlFormasDeCobranza', 'leerTransferenciasDe', 'sumaImportesCob',
  'htmlChequesCob', 'htmlOpcionCliente', 'htmlResultadosAsentar', 'htmlResultadosLocales', 'claveBusquedaCliente', 'buscaEnLaListaLocal', 'textoSaldoCorto', 'consultarClientesAsentar', 'esClienteDelTaller', 'proyectosDelCliente', 'htmlProyectoAsentar', 'cargarProyectosAsentar', 'htmlPanelAsentar', 'htmlHechoCob', 'htmlTarjetaCobranza',
  'htmlListaCobranzas', 'porAsentarPendientes', 'pintarCobranzas', 'enfocarBuscadorAsentar', 'mostrarCobranzas', 'abrirAsentar',
  'repintarAsentar', 'repintarResultadosAsentar', 'buscarClienteAsentar', 'elegirClienteAsentar', 'cancelarAsentar', 'parametrosAsentar',
  'confirmarAsentar', 'quitarHecho', 'leerCobranza', 'htmlCobranzaAbierta', 'pintarCobranza', 'abrirCobranza', 'recargarCobranza',
  'volverDeCobranza', 'pedirReabrir', 'cancelarReabrir', 'confirmarReabrir', 'verFotoCobranza', 'cerrarVisorCobranza',
  // Errores de la app (27/09/2026)
  // (en castellano, con errores_resumen, desde el 30/09/2026)
  'leerErrores', 'contarErrores', 'momentoAr', 'listaCorta', 'htmlArreglarError', 'htmlTipoError', 'pintarErrores', 'mostrarErrores',
  'cambiarInfoErrores', 'abrirArreglarError', 'cancelarArreglarError', 'confirmarArreglarError',
  // Seguridad (27/09/2026)
  'leerSeguridad', 'htmlFilaSeguridad', 'pintarSeguridad', 'mostrarSeguridad',
  // Retiros por revisar (28/09/2026)
  'leerPorRevisar', 'cantidadRevisar', 'htmlFilaRevisar', 'pintarRevisar', 'mostrarRevisar',
  'abrirAceptarRevisar', 'cancelarAceptarRevisar', 'confirmarAceptarRevisar',
  // El faltante: "¿de dónde salen?" (13/10/2026)
  'esProductoRevisar', 'htmlBotonesRevisar', 'completarRenglonesRevisar', 'ctxFaltanteRevisar', 'abrirFaltanteRevisar', 'resolverFilaRevisar',
  'htmlFaltanteRenglon', 'leerPlanillasDeOrden',
  // La reposición por revisar (24/10/2026)
  'esReposicionRevisar',
  // Retenciones (13/10/2026)
  'retencionesVacio', 'ret', 'tipoRetencion', 'detalleRetencion', 'plataRet', 'sumaRet', 'origenRetencion', 'empresasRet', 'sinPruebaRet',
  'leerRetenciones', 'leerRetencionesPortada', 'totalesPorEmpresa', 'htmlTotalRet', 'htmlTotalesRet', 'htmlAnularRet', 'htmlFilaRet',
  'nombreEmpresaRet', 'pintarRetenciones', 'cargarRetenciones', 'mostrarRetenciones', 'cambiarPeriodoRet',
  'abrirAnularRet', 'cancelarAnularRet', 'confirmarAnularRet', 'cargaVacia', 'leerCuentasBancoRet', 'cuentasDeEmpresaRet', 'cuentaElegidaRet',
  'avisoCargaRet', 'validarCargaRet', 'textoONull', 'parametrosRet', 'htmlOrigenesRet', 'apodoMostrarRet', 'htmlOpcionClienteRet',
  'htmlLocalesRet', 'htmlResultadosRet', 'htmlClienteElegidoRet', 'repintarResultadosRet', 'pintarAvisoRet', 'pintarCargaRet',
  'abrirCargaRet', 'cerrarCargaRet', 'leerFormRet', 'elegirOrigenRet', 'buscarClienteRet', 'leerLocalesRet', 'consultarClientesRet',
  'elegirClienteRet', 'cambiarClienteRet', 'guardarRetencion', 'filasExcelRet', 'filasExcelTotalesRet', 'nombreArchivoRet', 'exportarRetenciones',
  ...FUNCIONES_FR,
  // Cliente y proveedor (06/10/2026): la cuenta juntas y la clasificación
  'puedeCompensarCuentas', 'ctxCuentaUnica', 'pintarCuentaUnicaCliente',
  'nombreProveedorFicha', 'pintarClasificacionFicha', 'elegirClasificacionFicha', 'cerrarPanelVinculo',
  'confirmarVincular', 'confirmarDesvincular',
  // Préstamos (13/10/2026)
  'prestamosVacio', 'estadoPrestamos', 'centavosAd', 'leerPrestamos', 'resumenPrestamos', 'textoSaldosPrestamos', 'contarPrestamosPortada',
  'textoProximaCuota', 'htmlFilaPrestamoAd', 'prestamosDelFiltro', 'pintarPrestamosAd', 'puedePrestamos', 'mostrarPrestamos', 'elegirFiltroPrestamos',
  'sumarMesesIso', 'cuotasIguales', 'cuotasDistintas', 'sumaCuotasCentavos', 'validarCuotasPrestamo', 'validarAltaPrestamo', 'parametrosCuotas',
  'parametrosAltaPrestamo', 'empresasParaPrestamo', 'abrirAltaPrestamo', 'cancelarAltaPrestamo', 'armarCuotasAlta', 'textoSumaCuotas',
  'htmlFilasCuotas', 'htmlAltaPrestamo', 'htmlCuotasAlta', 'enlazarCuotas', 'pintarAltaPrestamo', 'pintarCuotasAlta', 'pintarSumaAlta',
  'pintarErrorAlta', 'guardarAltaPrestamo', 'abrirPrestamoAd', 'pctCuota', 'htmlCuotaDetalle', 'textoPagoPrestamo', 'htmlPagoAd',
  'htmlDetallePrestamoAd', 'pintarPrestamoAd', 'pedirAnularPago', 'cancelarAnularPago', 'pintarErrorPago', 'confirmarAnularPago',
  'pagadoPorCuota', 'cuotaConPagos', 'abrirEditarPrestamo', 'cancelarEditarPrestamo', 'agregarCuotaEdicion', 'quitarUltimaCuotaEdicion',
  'htmlEditarPrestamo', 'validarEditarPrestamo', 'parametrosEditarPrestamo', 'pintarErrorEditar', 'guardarEditarPrestamo', 'pintarSumaEdicion',
  // Entre empresas (13/10/2026)
  'entreVacio', 'datosEntre', 'nombreTipoEntre', 'nombreEmpresaEntre', 'centavosEntre', 'plataEntre', 'cantidadEntre', 'primerTramoEntre',
  'normalizarEntre', 'sinPruebaEntre', 'claveParFechaEntre', 'traspasosConPrecio', 'yaTienePrecio', 'necesitaValor', 'filtrarEntre',
  'valorEntre', 'direccionVaciaEntre', 'resumenEntre', 'ordenMonedasEntre', 'textoDireccionEntre', 'textosNetoEntre', 'htmlParEntre',
  'htmlFilaEntre', 'entregadorasEntre', 'puedeLeerListasEntre', 'puedeValorizarProductoEntre', 'textoEstadoValorEntre',
  'htmlValorizarUnidadEntre', 'htmlValorizarEntre', 'leerListasEntre', 'valorizarEntre', 'htmlOpcionesEntre', 'pintarFiltrosEntre',
  'pintarEntre', 'cargarEntre', 'mostrarEntre', 'contarEntrePortada', 'contenidoSeccionEntre',
  // La condición de venta (21/10/2026) y las órdenes de pedido N1 / N2 (28/10/2026)
  'leerFacturasDeOrden', 'leerRecepcionDeOrden', 'cantidadRecepcion', 'textoRecepcionOrden', 'diferenciasRecepcion', 'htmlRecepcionOrden', 'complementoPct', 'textoPct', 'validarCondicionVenta', 'parametrosDivision',
  'codigoPunto', 'textoCondicion', 'facturasPorParte', 'puntosDePct', 'partesFacturaOrden', 'validarNumeroFactura', 'validarPdfFactura',
  'cantidadDivision', 'renglonesParte', 'htmlTotalesPunto', 'htmlHojaPunto', 'nombrePdfPunto', 'htmlFacturasOrden', 'puedeFacturar',
  'pctInicialFacturar', 'actualizarFilaOrden', 'contenedorFacturar', 'sincronizarFacturar', 'cerrarFacturar', 'iniciarFacturar',
  'aplicarDatosFacturar', 'anotarDivisionGuardada', 'pintarFacturar', 'idFc', 'htmlPuntoFacturar', 'pintarVendedoresFacturar', 'facturarPendiente',
  'puntoListo', 'actualizarFacturar', 'actualizarFacturaPunto', 'elegirPctFacturar', 'escribirPctFacturar', 'cambiarVendedorFacturar',
  'programarGuardarFacturar', 'validarDivision', 'guardarFacturar', 'imprimirPunto', 'pdfPunto', 'compartirPunto', 'rutaPdfFactura',
  'subirPdfFactura', 'escribirNumeroFactura', 'guardarFacturaPunto', 'verPdfFactura', 'listaOrdenesALaVista', 'releerOrdenesEnSilencio',
  'llenarCondicionVenta', 'completarOtroPct', 'pintarCondicionVenta', 'guardarCondicionVenta',
  // Los 3 vendedores y la configuración de comisiones (21/10/2026, tarde)
  'numeroONulo', 'leerVendedores', 'leerComisionesCliente', 'sumaPcts', 'parametrosComisiones', 'validarComisiones', 'htmlVendedoresPct',
  'llenarVendedoresPct', 'comisionesDeDatos', 'comisionesSinDatos',
  'filasVendedoresFicha', 'cargarVendedoresFicha', 'pintarVendedoresFicha', 'cambiarVendedorFicha', 'volverVendedorAConfig', 'comisionesFicha',
  'contenidoSeccionComisiones', 'mostrarComisiones', 'cargarComisiones', 'textoTotalComisiones', 'pintarComisiones', 'cambiarComisionConfig',
  'guardarComisionConfig',
  ...FUNCIONES_CU,
  // Los insumos por bulto (23/10/2026): de este archivo y de js/cantidades.js
  'leerContenidosInsumos', 'contenidoDelCatalogo', 'modoPrecioInsumo', 'modoPrecioRenglon', 'cantidadInsumoSegunModo', 'textoPrecioPorBase',
  'prepararPreciosPorBulto', 'textoPrecioInsumoLista', 'modoPrecioFila', 'modoPrecioClave', 'bultoDeVersion', 'presentacionFilaInsumo',
  'modoPrecioHoja', 'cantidadInsumoBultoHoja', 'precioInsumoHoja',
  ...FUNCIONES_CANTIDADES, 'unidadCorta', ...FUNCIONES_PRECIO,
  // La orden a otra empresa del grupo (24/10/2026)
  'empresaGrupoDe', 'ordenEntreEmpresas', 'textoDeudaEntre', 'htmlDeudaEntre', 'htmlSelloEntre', 'htmlFichaEntre', 'ponerEmpresa',
  'codigoOrdenEntre', 'puedeAbrirOrdenEntre', 'htmlOrdenEntre', 'vincularOrdenesEntre', 'abrirOrdenEntre',
  // Lo que quedó de los remitos de Rosario (28/10/2026; la revisión se mudó
  // a Remitos Dolce): si la fábrica controla el stock, el link de Órdenes y
  // el "Remito N° X" de la ficha (js/remitos-comun.js).
  'sinControlStockEmpresa', 'leerSinControl', 'pintarLinkRemitos', 'talonarioDe', 'textoNumeroRemito', 'htmlSelloAcopio',
  // Los acopios, la cuenta en el grupo y la lista de otra empresa (27/10/2026)
  ...FUNCIONES_ACOPIOS,
  // Corregir una orden (29/10/2026)
  ...FUNCIONES_CORREGIR,
]

const CONSTANTES_BASE = [
  // La orden a otra empresa del grupo (24/10/2026)
  'RE_CODIGO_ORDEN_ENTRE',
  // MODULOS (js/modulos.js) antes de LINKS, que se arma con él.
  'MODULOS', 'ZONA_AR', 'DECIMALES_PRECIO', 'LARGO_MINIMO_MOTIVO', 'SECCIONES', 'CLAVES_ACCESOS', 'LINKS', 'CLAVE_EMPRESA', 'VISTAS', 'SUBTITULO_DE_VISTA',
  'LISTA_DE_DETALLE', 'MQ_LISTA_DETALLE', 'MODOS_COMISION', 'PILA_NAV',
  'ETIQUETA_VALORIZACION', 'ETIQUETA_MOVIMIENTO', 'CAMPOS_FICHA', 'CATEGORIAS_PRODUCTO', 'TITULO_OTROS_PRODUCTOS', 'TITULO_INSUMOS', 'NOMBRE_UNIDAD_HOJA',
  'LIBRERIA_XLSX', 'TIPOS_IMPORTAR', 'EXPLICA_IMPORTAR', 'TITULO_CODIGO', 'COLUMNAS_CLIENTES', 'COLUMNAS_PRECIOS', 'COLUMNAS_SALDOS',
  'COLUMNAS_DE', 'CONDICIONES_IVA', 'ETIQUETA_FILA',
  'VISTAS_GLOBALES', 'RE_UUID', 'MAX_RESULTADOS_CLIENTES', 'MIN_LETRAS_BUSCAR', 'ESPERA_BUSCAR_MS', 'SUGERIDOS_EN_BOTONES', 'ETIQUETA_ESTADO_PROYECTO', 'ETIQUETA_ESTADO_COBRANZA', 'DIAS_ERRORES', 'GRAVEDAD_ERROR', 'MAX_SEGURIDAD', 'ETIQUETA_ACCION_SEGURIDAD', 'LARGO_MINIMO_MOTIVO_REVISAR',
  'ZONA_HOJA', 'COPIAS_IMPRESION', 'COPIAS_PDF', 'LEYENDA_LEGAL', 'ALTO_UTIL_A4_MM', 'ALTO_MEDIA_HOJA_MM', 'ANCHO_UTIL_A4_MM', 'FUENTE_HOJA', 'MM', 'ALTO_LOGO_HOJA_PX', 'ESTILOS_HOJA', 'LIBRERIAS_PDF', 'CORTE_HOJA', 'LOTE_SIN_STOCK_HOJA', 'ESTILOS_LISTO',
  'NOMBRE_BULTO_HOJA', 'POR_UNIDAD_HOJA', 'SIN_NOMBRE_DE_CONO',
  // Clientes de "Todas las fábricas" (29/09/2026)
  'TODAS_LAS_FABRICAS',
  // Las notas de débito (24/10/2026)
  'TIPOS_MOVIMIENTO_NOTA', 'RE_CODIGO_NOTA', 'COPIAS_NOTA_DEBITO', 'LETRAS_UNIDAD_ND', 'LETRAS_DECENA_ND', 'LETRAS_CENTENA_ND', 'CONDICION_IVA_ND',
  // La etiqueta de la empresa y "Todas" que no cambia nada (30/09/2026)
  'NOMBRE_CORTO', 'MARCA_FABRICA', 'COLOR_EMPRESA_SIN_MARCA', 'TEXTO_ELEGI_FABRICA',
  // El diseño "Administración" (29/09/2026)
  'PALETA_MODULO', 'TRAZO_ICONO', 'ICONO_SECCION', 'PESTANAS', 'PESTANA_DE_VISTA',
  // La lista interna (30/09/2026)
  'PUEDE_MARCAR_INTERNA',
  // La grilla completa (30/09/2026)
  'CONITOS',
  // Cliente y proveedor (06/10/2026)
  ...CONSTANTES_CU,
  'LINK_TRASPASO_AD', ...CONSTANTES_FR,
  // Los insumos por bulto (23/10/2026), de js/cantidades.js
  ...CONSTANTES_CANTIDADES, ...CONSTANTES_PRECIO,
  // Los clientes provisorios (06/10/2026)
  'TEXTO_FICHA_PROVISORIO', 'MAX_DESTINOS_UNIR', 'TOPE_BUSCAR_CLIENTES', 'TEXTO_SOLO_PROVISORIOS', 'TEXTO_SIN_LEER_CLIENTES',
  // Retenciones (13/10/2026)
  'TIPOS_RETENCION', 'TIPOS_CON_JURISDICCION', 'ORIGENES_RETENCION', 'LARGO_MINIMO_MOTIVO_RET',
  // Préstamos (13/10/2026)
  'MONEDAS_PRESTAMO_AD', 'NOMBRE_MONEDA_AD', 'NOMBRE_MEDIO_PRESTAMO', 'MAX_CUOTAS_PRESTAMO', 'LARGO_MINIMO_MOTIVO_PAGO',
  // Entre empresas (13/10/2026)
  'TIPOS_ENTRE', 'ORDEN_TIPOS_ENTRE', 'SIN_IMPORTE_ENTRE', 'CONCEPTO_TRASPASO_CON_PRECIO', 'MONEDAS_ORDEN_ENTRE', 'UNIDAD_ENTRE',
  // Dividir para facturar (21/10/2026) y los puntos N1 / N2 (28/10/2026)
  'PARTES_DIVISION', 'PARTE_UNICA', 'ESPERA_GUARDAR_DIVISION', 'NUMERO_PUNTO', 'CONDICIONES_RAPIDAS', 'CAMPOS_FILA_ORDEN', 'RELEER_ORDENES_CADA',
  // Los remitos precargados de Rosario (27/10/2026)
  'ESTADOS_REMITO_POR_REVISAR', 'ETIQUETA_ESTADO_REMITO', 'TALONARIOS', 'CAMPOS_REMITO',
  // Los acopios (27/10/2026)
  'ESTADOS_ACOPIO', 'LARGO_NUMERO_ACOPIO', 'GRUPOS_REMITO',
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
  var turnoValorizar = 0
  var turnoClientes = 0
  var turnoCliente = 0
  var claveRenglonNota = 0
  var turnoNotaDebito = 0
  var turnoLista = 0
  var turnoCobranzas = 0
  var turnoCobranza = 0
  var turnoErrores = 0
  var turnoSeguridad = 0
  var turnoRevisar = 0
  var turnoRetenciones = 0
  var turnoPrestamos = 0
  var turnoPrestamo = 0
  var turnoVolver = 0
  var turnoAcopios = 0, turnoAcopio = 0
  var turnoCorregir = 0, claveCorregir = 0
  // Embebida en Cuentas corrientes → Clientes (05/10/2026): acá, nunca.
  var EMBEBIDA = false, volviendoAClientes = false
  var history = { replaceState() {} }
  var __urlsFirmadas = []

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
    storage: { from(b) { return { createSignedUrl(ruta, seg) { __urlsFirmadas.push([b, ruta, seg]); return Promise.resolve({ data: { signedUrl: 'https://firmada/' + ruta }, error: null }) } } } },
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
    saldos: null, errorSaldos: null, busquedaClientes: '', mostrarApagados: false, apagados: null, interruptor: null, alta: null, unir: null, cliente: null, ficha: null, listas: null, proveedores: null, listaNueva: null, lista: null,
    cobranzas: { lista: null, error: null, cheques: new Map(), fotos: new Map(), errorCheques: null, clientes: null, errorClientes: null, asentando: null, hechos: new Map() },
    cobranza: null, bancos: null,
    errores: { grupos: null, error: null, info: false, arreglando: null },
    seguridad: { filas: null, error: null },
    revisar: { filas: null, error: null, aceptando: null, falt: null, hechos: [] },
  }
`

// Lo que entró el 11/10/2026 (permisos en pantalla) puede no estar en una
// copia vieja del archivo: se reemplaza por algo que no da permiso / no hace
// nada, así esa copia corre y las suites dan ROJO por lo que afirman, no por
// una excepción al extraer. Solo estos; todo lo demás tiene que existir.
const OPCIONALES_FN = {
  puedeGestionarCliente: 'function puedeGestionarCliente() { return false }',
  puedeLeerClientes: 'function puedeLeerClientes() { return false }',
  puedeCompletarFicha: "function puedeCompletarFicha(u) { return puedeEn('retiros', 'precios', u) }",
  confirmarProvisorio: 'async function confirmarProvisorio() {}',
  leerSoloProvisorios: 'async function leerSoloProvisorios() { return { filas: [], provisorios: [], sinLeer: true, incompleta: false } }',
  htmlFilaSoloProvisorio: "function htmlFilaSoloProvisorio() { return '' }",
  htmlSoloProvisorios: "function htmlSoloProvisorios() { return '' }",
  // La fábrica de la nota para Anular (24/10/2026): una copia de antes no la lee.
  leerUnidadNotaDebito: 'async function leerUnidadNotaDebito() { return null }',
  // Los remitos precargados (27/10/2026): una copia de antes no los tiene
  // (todas sus fábricas son "con control": nada cambia).
  sinControlStockEmpresa: 'function sinControlStockEmpresa() { return false }',
  leerSinControl: 'async function leerSinControl() {}',
  talonarioDe: "function talonarioDe() { return 'oficial' }",
  textoNumeroRemito: "function textoNumeroRemito() { return '' }",
  htmlSelloAcopio: "function htmlSelloAcopio() { return '' }",
  numeroRemitoN: 'function numeroRemitoN() { return null }',
  ordenarPorRemito: 'function ordenarPorRemito(l) { return Array.isArray(l) ? l : [] }',
  ordenesVisibles: 'function ordenesVisibles(l = estado.ordenes) { return Array.isArray(l) ? l : [] }',
  htmlTalonariosOrdenes: "function htmlTalonariosOrdenes() { return '' }",
  elegirTalonarioOrdenes: 'function elegirTalonarioOrdenes() {}',
  htmlFilaOrdenRemito: "function htmlFilaOrdenRemito() { return '' }",
  remitosPorRevisar: 'function remitosPorRevisar() { return [] }',
  leerRemitosPrecarga: 'async function leerRemitosPrecarga() { return [] }',
  cargarRemitosPrecarga: 'async function cargarRemitosPrecarga() {}',
  amarillosDe: 'function amarillosDe() { return 0 }',
  nombreClienteRemito: "function nombreClienteRemito() { return '' }",
  htmlTarjetaRemito: "function htmlTarjetaRemito() { return '' }",
  htmlRemitosPrecarga: "function htmlRemitosPrecarga() { return '' }",
  pintarRemitosPrecarga: 'function pintarRemitosPrecarga() {}',
  // El link a Remitos Dolce (28/10/2026): una copia de antes no lo tiene.
  pintarLinkRemitos: 'function pintarLinkRemitos() {}',
}
const OPCIONALES_CONST = {
  TOPE_BUSCAR_CLIENTES: 'var TOPE_BUSCAR_CLIENTES = 60', TEXTO_SOLO_PROVISORIOS: "var TEXTO_SOLO_PROVISORIOS = '(no existe)'", TEXTO_SIN_LEER_CLIENTES: "var TEXTO_SIN_LEER_CLIENTES = '(no existe)'",
  ESTADOS_REMITO_POR_REVISAR: 'var ESTADOS_REMITO_POR_REVISAR = []', ETIQUETA_ESTADO_REMITO: 'var ETIQUETA_ESTADO_REMITO = {}', TALONARIOS: 'var TALONARIOS = []', CAMPOS_REMITO: "var CAMPOS_REMITO = ''",
  ESTADOS_ACOPIO: "var ESTADOS_ACOPIO = ['activo', 'terminado', 'anulado']", LARGO_NUMERO_ACOPIO: 'var LARGO_NUMERO_ACOPIO = 30',
  GRUPOS_REMITO: 'var GRUPOS_REMITO = []',
}
// Los acopios (27/10/2026): una copia de antes no tiene ninguna de estas.
// Las que llaman las funciones de siempre tienen su reemplazo que no hace
// nada (sin acopios, sin cuenta en el grupo, la lista de la misma empresa);
// las demás, uno que devuelve '' (un pedazo de HTML o un texto) o null.
const REEMPLAZOS_ACOPIOS = {
  acopiosEnEmpresa: 'function acopiosEnEmpresa() { return false }',
  leerPrecioVentaEn: 'function leerPrecioVentaEn(l, it, f) { return leerPrecioVenta(l, it, f) }',
  presentacionEnUnidad: 'async function presentacionEnUnidad(p) { return p }',
  contenidoSeccionAcopios: "function contenidoSeccionAcopios() { return { numero: null, unidad: '', lineas: [] } }",
  leerAcopios: 'async function leerAcopios() { return [] }',
}
for (const n of FUNCIONES_ACOPIOS) {
  OPCIONALES_FN[n] = REEMPLAZOS_ACOPIOS[n] ?? (/^(html|texto|nombre|papeles)/.test(n) ? `function ${n}() { return '' }` : `function ${n}() { return null }`)
}
// Corregir una orden (29/10/2026): una copia de antes no tiene ninguna. Sin
// permiso para corregir, sin historial y sin errores ni cambios: así esa
// copia corre y las suites dan ROJO por lo que afirman.
const REEMPLAZOS_CORREGIR = {
  puedeCorregirOrden: 'function puedeCorregirOrden() { return false }',
  leerCorreccionesDeOrden: 'async function leerCorreccionesDeOrden() { return null }',
  erroresCorregir: 'function erroresCorregir() { return [] }',
  lineasResumenCorregir: 'function lineasResumenCorregir() { return [] }',
  conteosFilaOrden: 'function conteosFilaOrden() { return {} }',
  abrirCorregir: 'async function abrirCorregir() {}',
  guardarCorregir: 'async function guardarCorregir() {}',
}
for (const n of FUNCIONES_CORREGIR) {
  OPCIONALES_FN[n] = REEMPLAZOS_CORREGIR[n] ?? (/^(html|texto|nombre|descripcion)/.test(n) ? `function ${n}() { return '' }` : `function ${n}() { return null }`)
}

function construirAdministracion(ruta, { funciones = [], constantes = [], preludioExtra = '', preludioEstado = '' } = {}) {
  const html = require('fs').readFileSync(ruta, 'utf8')
  // Lo que se mudó a js/remitos-comun.js (28/10/2026) cuenta como del
  // módulo si el módulo lo importa (lo pega fuenteConComun).
  const comunRemitos = html.includes("from '../js/remitos-comun.js'")
    ? require('fs').readFileSync(process.env.ARCHIVO_COMUN_REMITOS || require('path').join(__dirname, '..', 'js', 'remitos-comun.js'), 'utf8').replace(/^export /gm, '') : ''
  const texto = html + '\n' + comunRemitos
  const falta = (n, re) => !re.test(texto)
  const fnFaltan = Object.keys(OPCIONALES_FN).filter(n => falta(n, new RegExp('function ' + n + '\\(')))
  const constFaltan = Object.keys(OPCIONALES_CONST).filter(n => falta(n, new RegExp('const ' + n + ' =')))
  const stubs = [...fnFaltan.map(n => OPCIONALES_FN[n]), ...constFaltan.map(n => OPCIONALES_CONST[n])].join('\n')
  // Sin repetidos (27/10/2026): una suite puede pedir algo que ya está en la
  // base (un const repetido no compila).
  const todasConst = [...new Set([...CONSTANTES_BASE, ...constantes])].filter(c => !constFaltan.includes(c))
  return construirCon(ruta, {
    preludio: PRELUDIO + preludioEstado + preludioExtra + (stubs ? '\n' + stubs + '\n' : ''),
    funciones: [...new Set([...FUNCIONES_BASE, ...funciones])].filter(f => !fnFaltan.includes(f)),
    constantes: todasConst,
    retorno: `${[...todasConst, ...constFaltan].join(', ')}, ${fnFaltan.map(f => f + ', ').join('')}estado, __els, __doc: document, __llamadas, __ls, __tablas, __win: window,
      __setRpc(f){ __rpc = f }, __impresiones(){ return __impresiones }, __setNav(n){ navigator = n }, __urlsFirmadas(){ return __urlsFirmadas },
      ponerNumero, leerCampoNumero, enlazarCampoNumero, leerNumeroAr, formatearNumeroAr`,
  })
}

module.exports = { construirAdministracion, FUNCIONES_BASE, CONSTANTES_BASE }
