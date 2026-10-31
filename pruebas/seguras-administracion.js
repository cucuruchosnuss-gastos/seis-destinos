// Hojas seguras del chequeo estático de modulos/administracion.html, CADA UNA
// CON SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté
// escapada ni figure acá pone test-administracion-xss.js en rojo nombrándola.

const SEGURAS_ADMINISTRACION = [
  ['htmlSelloOrden(o)', 'HTML constante del código: htmlSelloOrden() devuelve uno de tres sellos fijos'],
  [`partes.join('<span aria-hidden="true">·</span>')`, 'HTML ya escapado: cada parte la arma htmlOtrasCuentas() con esc(), unidas por un separador constante'],
  ['DIAS_ERRORES', 'constante numérica del código (7)'],
  ['grav.clase','constante del código: una clase de GRAVEDAD_ERROR (la de error si la gravedad no se conoce)'],
  ['cuentas','HTML ya escapado: htmlGrupoCliente() arma cada botón con esc() y htmlSelloEmpresa()'],
  ['quien', 'HTML ya escapado: htmlOtrasCuentas() arma el botón (o el <strong>) con esc() del id, la unidad y el nombre'],
  ['avisoSinLista', 'HTML ya escapado: htmlResumenClientesLista() lo arma con esc() del texto y htmlNombresCortos(), o vacío'],
  ['htmlNombresCortos(sinLista)', 'HTML ya escapado: htmlNombresCortos() devuelve esc() de los nombres unidos'],
  ['colorEmpresa(unidadId)', 'constante del código: un color de MARCA_FABRICA (js/barra-unidad.js) o el gris fijo; nunca un dato de la base'],
  ['plata', 'HTML ya escapado: htmlRenglonOrden() lo arma con esc() del id y de los importes, o vacío'],
  ["datos.join('')", 'HTML armado por htmlDatoAd(), que escapa rótulo y valor'],
  ['anulada', 'HTML ya escapado: htmlDetalleOrden() lo arma con esc() del motivo, o vacío'],
  ['sinLotes', 'HTML constante del código: el aviso de que no se pueden ver los lotes, o vacío'],
  ['renglones', 'HTML armado por htmlRenglonOrden(), que escapa cada dato'],
  // 29/10/2026: la orden interna recibida, con sus diferencias.
  ['recepcion', 'HTML armado por htmlRecepcionOrden(), que escapa el texto, el estado y cada diferencia, o vacío (orden común)'],
  ["dif.map(t => `<li>${esc(t)}</li>`).join('')", 'HTML ya escapado: cada diferencia (de diferenciasRecepcion) va con esc() en su <li> (test-administracion-orden-recepcion.js lo ejecuta con marcas)'],
  // 13/10/2026: el faltante, "¿de dónde salen?".
  ['htmlFaltanteRenglon(it, d)', 'HTML armado por htmlFaltanteRenglon(), que escapa el estado y el motivo con esc()'],
  ['htmlBotonesRevisar(f)', 'HTML armado por htmlBotonesRevisar(), con esc() del id del renglón'],
  ["htmlFaltante(falt.f, { puedeAjustar: false, linkTraspaso: LINK_TRASPASO_AD, hoy: hoyArgentina(), idTitulo: 'fr-titulo' })", 'HTML armado por htmlFaltante() de js/faltante-retiro.js, que escapa todo con escFr() (test-faltante-retiro.js lo ejecuta con marcas)'],
  ['total', 'HTML ya escapado: htmlDetalleOrden() lo arma con esc() del total, o vacío'],
  ['htmlValorizar(d)', 'HTML armado por htmlValorizar(), que escapa los errores y el aviso del límite'],
  ['htmlFaltaLista(d)', 'HTML armado por htmlFaltaLista(), que escapa el nombre del cliente (06/10/2026; ejecutado con marcas en test-clientes-provisorios.js)'],
  ['filas', 'HTML ya escapado: htmlCuenta() / htmlHistorial() arman cada fila con esc() del texto y los importes'],
  ["partes.join('')", 'HTML armado por htmlFilaPrecio(), que escapa cada dato, y el separador de cada grupo, escapado'],
  // La grilla completa: lista_completa (30/09/2026)
  ['entrada', 'HTML armado en htmlFilaProducto(): el campo y el botón Historial con esc() de la clave y del nombre, o vacío (fila de solo lectura)'],
  ['celdas', 'HTML armado en htmlConito() con esc() del título (constante de CONITOS) y del precio formateado'],
  ["avisos.join('')", 'HTML ya escapado: htmlGrilla() arma cada aviso con esc() de su texto'],
  ['htmlConito(l)', 'HTML armado por htmlConito(), que escapa títulos y precios'],
  ['sello', 'HTML armado en htmlFilaImportar(): el sello con esc() de su etiqueta, o uno constante (Guardada / No se guardó)'],
  ['errores', 'HTML ya escapado: htmlFilaImportar() arma cada error con esc()'],
  ['avisos', 'HTML ya escapado: htmlFilaImportar() arma cada aviso con esc()'],
  ['resultado', 'HTML ya escapado: htmlFilaImportar() arma el resultado con esc() del mensaje, o vacío'],
  ["im.filas.map(htmlFilaImportar).join('')", 'HTML armado por htmlFilaImportar(), que escapa cada dato de la fila'],
  // La fila de accesos directos (27/09/2026)
  ['contenido', 'HTML armado en htmlLink() con esc() del ícono y del nombre (constantes de js/modulos.js)'],
  // Cobranzas por asentar (27/09/2026)
  ['foto', 'HTML armado en htmlChequeCob(): el botón con esc() del id de la foto, o vacío'],
  ["lista.map(htmlChequeCob).join('')", 'HTML armado por htmlChequeCob(), que escapa la línea del cheque y el id de la foto'],
  ["lista.slice(0, MAX_RESULTADOS_CLIENTES).map(c => htmlOpcionCliente(c, a.cliente?.id, false)).join('')", 'HTML armado por htmlOpcionCliente(), que escapa id, nombre y detalle'],
  ["botones.map(s => htmlOpcionCliente(s, a.cliente?.id, true)).join('')", 'HTML armado por htmlOpcionCliente(), que escapa id, nombre y detalle (los tres primeros sugeridos, 29/09/2026)'],
  ["resto.map(s => htmlOpcionCliente(s, a.cliente?.id, false)).join('')", 'HTML armado por htmlOpcionCliente(), que escapa id, nombre y detalle (el resto de los sugeridos, 29/09/2026)'],
  ['sugeridos', 'HTML armado en htmlPanelAsentar() con esc() del texto y htmlOpcionCliente()'],
  ['htmlResultadosAsentar(a)', 'HTML armado por htmlResultadosAsentar(), que escapa los textos y usa htmlOpcionCliente()'],
  ['elegido', 'HTML ya escapado: htmlPanelAsentar() lo arma con esc() del texto, o vacío'],
  ["datos.map(([k, v]) => htmlDatoAd(k, v)).join('')", 'HTML armado por htmlDatoAd(), que escapa rótulo y valor'],
  ['htmlChequesCob(c, cheques)', 'HTML armado por htmlChequesCob(), que escapa los avisos y usa htmlChequeCob()'],
  // E-cheques y transferencias (30/09/2026)
  ["htmlFormaPago(ch.es_echeck ? 'echeck' : 'cheque')", 'HTML constante de htmlFormaPago(): una etiqueta fija del código, sin datos de la base'],
  ["htmlFormaPago('transferencia')", 'HTML constante de htmlFormaPago(): la etiqueta fija de la transferencia, con su ícono'],
  ["formas.map(htmlFormaPago).join('')", 'HTML constante de htmlFormaPago(): las formas salen de una lista fija del código'],
  ['lista.map(t => htmlTransferenciaCob(t, cuentas)).join(\'\')', 'HTML armado por htmlTransferenciaCob(), que escapa importe, cuenta, fecha y referencia'],
  ['htmlTransferenciasCob(transf, cuentas, errorTransf)', 'HTML armado por htmlTransferenciasCob(), que escapa el aviso y usa htmlTransferenciaCob()'],
  ['htmlFormasDeCobranza(c, lista, transf)', 'HTML armado por htmlFormasDeCobranza(), etiquetas fijas del código'],
  ['pie', 'HTML armado en htmlTarjetaCobranza(): htmlHechoCob() / htmlPanelAsentar() (escapan) o un botón con esc() del id'],
  // El proyecto del Taller al asentar (28/09/2026)
  ['opciones', 'HTML ya escapado: htmlProyectoAsentar() arma cada <option> con esc() del id y del nombre'],
  ['htmlProyectoAsentar(a)', 'HTML armado por htmlProyectoAsentar(), que escapa id y nombre de cada proyecto'],
  ['fila', 'HTML ya escapado: htmlFilaCliente() arma el botón de la fila con esc() de cada dato'],
  ['htmlInterruptor(c)', 'HTML armado por htmlInterruptor(), que escapa el id y el nombre del cliente'],
  // El diseño "Administración" (29/09/2026): la portada y las pestañas
  ['tam', 'número del código: el tamaño del ícono que pasa quien llama a htmlTrazo() (18 o 15)'],
  ['d', 'constante del código: el trazo del ícono sale de TRAZO_ICONO, nunca de la base'],
  ['tono', 'constante del código: una de dos clases fijas (--mal / --bien) o vacío'],
  ['clase', 'constante del código: una de dos clases fijas (--atencion / --suave) o vacío'],
  ['htmlTrazo(info.trazo)', 'HTML constante del código: el <svg> con un trazo de TRAZO_ICONO'],
  ['htmlTrazo(l.clave, 15)', 'HTML constante del código: el <svg> con un trazo de TRAZO_ICONO'],
  ['lineas', 'HTML armado por htmlLineaSeccion(), que escapa cada renglón'],
  ['cabeza', 'HTML ya escapado: htmlSeccion() arma la cabeza con esc() del título y del chip'],
  ['cuerpo', 'HTML ya escapado: htmlSeccion() arma el cuerpo con esc() del número y la unidad, o textos constantes'],
  ['acciones', 'HTML ya escapado: htmlFilaRevisar() arma el panel del motivo con esc() del motivo y del error, o el botón "Aceptar" con esc() del id'],
  // La comisión de una orden (06/10/2026)
  ["opcion('porcentaje', 'Porcentaje')", 'HTML armado por opcion() de htmlPanelComision(), que escapa el modo y el texto (constantes del código)'],
  ["opcion('monto', 'Monto fijo')", 'HTML armado por opcion() de htmlPanelComision(), que escapa el modo y el texto (constantes del código)'],
  ["opcion('ninguna', 'Sin comisión')", 'HTML armado por opcion() de htmlPanelComision(), que escapa el modo y el texto (constantes del código)'],
  ['selloComision', 'HTML constante del código: el sello "Comisión sin cargar" o vacío'],
  // Los clientes provisorios (06/10/2026)
  ['previa', 'HTML ya escapado: htmlUnir() arma la vista previa con esc() de cada línea de textosPreviaUnir(), o texto constante'],
  ['destinos.map(htmlDestinoUnir).join(\'\')', 'HTML armado por htmlDestinoUnir(), que escapa el id, el nombre y los datos de cada cliente'],
  ['cancelar', 'HTML constante del código: el botón Cancelar del panel de unir (con disabled o no)'],
  ['botones.join(\'\')', 'HTML ya escapado: htmlAccionesProvisorio() arma cada botón con esc() del id del cliente y texto constante'],
  ['htmlAccionesProvisorio(c)', 'HTML armado por htmlAccionesProvisorio(), que escapa el id del cliente y el texto (06/10/2026)'],
  // Los insumos de una lista a precio fijo o costo + % (09/10/2026): los
  // ejecuta con texto malicioso test-administracion-costos.js.
  ["catalogo.map(i => htmlOpcionInsumoLista(i, ed.insumoId)).join('')", 'HTML armado por htmlOpcionInsumoLista(), que escapa el id y el nombre del insumo'],
  ['elegir', 'HTML ya escapado: htmlEditorInsumoLista() arma el selector (o el nombre) con esc()'],
  ['modos', 'HTML constante del código: el segmento Precio fijo / Costo + %'],
  ['campo', 'HTML ya escapado: htmlEditorInsumoLista() arma el campo con esc() de la unidad'],
  // Retenciones (13/10/2026): los ejecuta con texto malicioso
  // test-administracion-retenciones.js.
  ['tarjetaTotal', 'HTML armado por htmlTotalRet(), que escapa el tipo, la plata y la cantidad'],
  ['tarjetasTipo', 'HTML armado por htmlTotalRet(), que escapa el tipo, la plata y la cantidad'],
  ["lista.map(x => htmlOpcionClienteRet(x, q)).join('')", 'HTML armado por htmlOpcionClienteRet(), que escapa el id, el nombre, el apodo y el detalle'],
  ["rr.filas.slice(0, MAX_RESULTADOS_CLIENTES).map(x => htmlOpcionClienteRet(x, q)).join('')", 'HTML armado por htmlOpcionClienteRet(), que escapa el id, el nombre, el apodo y el detalle'],
  // Préstamos (13/10/2026): test-administracion-prestamos.js ejecuta estos renders con marcas.
  ['htmlFilasCuotas(e.cuotas.map(c => ({ ...c, moneda })), { pagados })', 'HTML armado por htmlFilasCuotas(), que escapa cada vencimiento, rótulo y lo pagado'],
  // Entre empresas (13/10/2026): los ejecuta con texto malicioso
  // test-administracion-entre-empresas.js.
  ['selloXEntre', 'HTML armado por htmlSelloEmpresa(), que escapa el nombre y el id de la empresa'],
  ['selloYEntre', 'HTML armado por htmlSelloEmpresa(), que escapa el nombre y el id de la empresa'],
  ['selloOrigenEntre', 'HTML armado por htmlSelloEmpresa() (escapa nombre e id), o un sello constante "—"'],
  ['selloDestinoEntre', 'HTML armado por htmlSelloEmpresa() (escapa nombre e id), o un sello constante "—"'],
  ['valorHtmlEntre', 'HTML ya escapado: htmlFilaEntre() lo arma con esc() del importe valorizado, la lista y el motivo, o un texto constante'],
  // Dividir para facturar (21/10/2026): lo ejecuta con texto malicioso
  // test-administracion-division-orden.js.
  // Los puntos N1 / N2 (28/10/2026): lo ejecuta con texto malicioso
  // test-administracion-valorizar-con-division.js.
  ['rapidas', 'HTML ya escapado: pintarFacturar() arma los botones rápidos de la condición con esc() del % (una constante)'],
  ['htmlHojaPunto(fc.datos, parte, fc.moneda)', 'HTML armado por htmlHojaPunto(): cada dato de la base con esc() (la orden de pedido de un punto)'],
  ['factura', 'HTML ya escapado: htmlPuntoFacturar() arma la carga de la factura con esc() de la parte, su id y el número guardado'],
  ['puntos', 'HTML armado por htmlPuntoFacturar(), que escapa el código de cada punto, la parte y el número de factura'],
  ['vendedores', 'HTML ya escapado: htmlTotalesPunto() arma una línea por vendedor con esc() del nombre y del monto'],
  ['htmlTotalesPunto(datos, parte, moneda)', 'HTML armado por htmlTotalesPunto(): cada línea con esc() de los importes y del nombre del vendedor'],
  ['origen', 'HTML ya escapado: htmlVendedoresPct() arma los rótulos con esc() del id del vendedor y del % de la configuración, o vacío'],
  // La nota de débito (24/10/2026): la ejecuta con texto malicioso
  // test-administracion-nota-debito.js.
  ['copia(r)', 'HTML armado por copia() adentro de htmlNotaDebito(): cada dato de la base con esc(), el logo por logoSeguro() + encodeURIComponent, y el rótulo con esc()'],
  ['htmlNotaDebito(d)', 'HTML armado por htmlNotaDebito(), que escapa adentro (lo ejecuta con marcas test-administracion-nota-debito.js)'],
  // La orden a otra empresa del grupo (24/10/2026): las ejecuta con texto
  // malicioso test-administracion-orden-entre-empresas.js.
  ['htmlSelloEntre(o)', 'HTML armado por htmlSelloEntre(): un sello fijo con el nombre de la empresa en esc() (lo ejecuta con marcas test-administracion-orden-entre-empresas.js)'],
  ['htmlDeudaEntre(o)', 'HTML armado por htmlDeudaEntre(), todo el texto en esc() (lo ejecuta con marcas test-administracion-orden-entre-empresas.js)'],
  ['htmlOrdenEntre(f)', 'HTML armado por htmlOrdenEntre(): el código y el id en esc() (lo ejecuta con marcas test-administracion-orden-entre-empresas.js)'],
  // Los remitos precargados de Rosario (27/10/2026): los ejecuta con texto
  // malicioso test-administracion-remitos-precarga.js.
  ['htmlSelloAcopio(o)', 'HTML constante del código: el sello fijo "Acopio" o vacío'],
  ['htmlSelloAcopio(r)', 'HTML constante del código: el sello fijo "Acopio" o vacío'],
  ["rr.filas.map(htmlTarjetaRemito).join('')", 'HTML armado por htmlTarjetaRemito(), que escapa el número, el cliente, la fecha, el estado y el error'],
  ['rmTitulo', 'HTML ya escapado: htmlRemitosPrecarga() arma el título constante con esc() del contador'],
  ['rmLista', 'HTML ya escapado: htmlRemitosPrecarga() arma el error con esc(), un texto constante o las tarjetas de htmlTarjetaRemito()'],
  ['rmEstadoLotes', 'HTML ya escapado: htmlResumenLotesRemito() arma lo que falta o sobra con esc() de enteroHoja(), o un texto constante'],
  ['rmVolver', 'HTML ya escapado: htmlSelectorRemito() arma "Dejar …" con esc() del índice y del nombre, o vacío'],
  ["htmlOpcionesRemito(i, cat, r.busqueda ?? '')", 'HTML armado por htmlOpcionesRemito(), que escapa el índice, los ids, los nombres y lo buscado'],
  ['htmlMarcasRemito(r, i, cat)', 'HTML armado por htmlMarcasRemito(), que escapa el índice, el id y el nombre de cada cono'],
  ['LARGO_LOTE_REMITO', 'constante numérica del código (40)'],
  ['htmlResumenLotesRemito(r)', 'HTML armado por htmlResumenLotesRemito(), que escapa las cantidades con esc()'],
  ['rmCab', 'HTML ya escapado: htmlRenglonRemito() arma la cabecera con esc() del número de renglón y un sello constante'],
  ['rmLeido', 'HTML ya escapado: htmlRenglonRemito() arma "Leído: «…»" con esc() del texto leído por la IA, o vacío'],
  ['rmNota', 'HTML ya escapado: htmlRenglonRemito() arma la nota de la IA con esc(), o vacío'],
  ['rmAceptar', 'HTML ya escapado: el botón "Aceptar sugerencia" con esc() del índice, o vacío'],
  ['rmAyuda', 'HTML ya escapado: htmlClienteRemito() arma "Leído en la foto: «…»" con esc() del cliente leído y un botón constante, o vacío'],
  ['htmlClientesRemito(rm)', 'HTML armado por htmlClientesRemito(), que escapa el id, el nombre, el apodo y el detalle de cada cliente'],
  ['rmTal', 'HTML ya escapado: htmlEncabezadoRemito() arma un botón por talonario (constantes de TALONARIOS) con esc()'],
  ['rmZoom', 'HTML ya escapado: htmlFotoRemito() arma los botones del zoom con esc() del porcentaje'],
  ['rmLienzo', 'HTML ya escapado: htmlFotoRemito() arma el aviso con esc() o el lienzo con la imagen SIN src (lo pone ponerSrcFotoRemito() por la propiedad, validado por urlFotoSegura())'],
  ['rmDis', "constante del código: ' disabled' o vacío"],
  ['rmError', 'HTML ya escapado: htmlAccionesRemito() arma el error de la base con esc() y un botón constante, o vacío'],
  ['rmAviso', 'HTML ya escapado: htmlAccionesRemito() arma el aviso con esc(), o vacío'],
  ['rmLeer', 'HTML ya escapado: htmlAccionesRemito() arma el panel de "Volver a leer" con esc() del texto, o vacío'],
  ['rmDescartar', 'HTML ya escapado: htmlAccionesRemito() arma el panel de Descartar con esc() del motivo y del error, o vacío'],
  ['htmlFotoRemito(rm)', 'HTML armado por htmlFotoRemito(), que escapa todo y no pone el src'],
  ['rmLectura', 'HTML ya escapado: pintarRemito() arma el aviso de la lectura con esc() del error de la IA, o un texto constante'],
  ['htmlEncabezadoRemito(rm)', 'HTML armado por htmlEncabezadoRemito(), que escapa cada campo'],
  ['rmRenglones', 'HTML armado por htmlRenglonRemito(), que escapa cada dato del renglón'],
  ['htmlAccionesRemito(rm)', 'HTML armado por htmlAccionesRemito(), que escapa los mensajes'],
  // Los acopios (27/10/2026). Todo lo ejecuta test-administracion-acopios.js con marcas.
  ['htmlSelloEstadoAcopio(a)', 'HTML constante del código: el sello fijo "Terminado" / "Anulado", o vacío'],
  ['htmlBarraAcopio(a)', 'HTML armado por htmlBarraAcopio(), con esc() de un porcentaje calculado acá'],
  ['htmlBarraAcopio(x)', 'HTML armado por htmlBarraAcopio(), con esc() de un porcentaje calculado acá'],
  ["id === ac.clienteId ? ' selected' : ''", "constante del código: ' selected' o vacío"],
  ['acOpciones', 'HTML ya escapado: htmlFiltroAcopios() arma cada <option> con esc() del id y del nombre'],
  ["activos.map(htmlTarjetaAcopio).join('')", 'HTML armado por htmlTarjetaAcopio(), que escapa cada dato del acopio'],
  ["terminados.map(htmlTarjetaAcopio).join('')", 'HTML armado por htmlTarjetaAcopio(), que escapa cada dato del acopio'],
  ["anulados.map(htmlTarjetaAcopio).join('')", 'HTML armado por htmlTarjetaAcopio(), que escapa cada dato del acopio'],
  ['detalle ? `<span class="ad-opcion-cliente__detalle">${esc(detalle)}</span>` : \'\'', 'HTML ya escapado: el detalle con esc(), o vacío'],
  ['o.conCono ? \'<span class="ad-rm-opcion__detalle">elegí el cono</span>\' : \'\'', 'HTML constante del código, o vacío'],
  ['htmlOpcionesAcopio(cat, n.busqueda)', 'HTML armado por htmlOpcionesAcopio(), que escapa cada producto'],
  ['htmlMarcasAcopio(n, cat)', 'HTML armado por htmlMarcasAcopio(), que escapa cada cono'],
  ['htmlClientesAcopio(n)', 'HTML armado por htmlClientesAcopio(), que escapa cada cliente'],
  ['LARGO_NUMERO_ACOPIO', 'constante numérica del código (30)'],
  ['acDis', "constante del código: ' disabled' o vacío"],
  ["n.guardando ? 'Guardando…' : 'Guardar el acopio'", 'texto constante del código'],
  ["n.enviando ? 'Anulando…' : 'Anular el acopio'", 'texto constante del código'],
  ['htmlFiltroAcopios(ac)', 'HTML armado por htmlFiltroAcopios(), que escapa cada cliente'],
  ['htmlListaAcopios(ac)', 'HTML armado por htmlListaAcopios(), que escapa cada acopio'],
  ['acOrden', 'HTML ya escapado: htmlMovimientoAcopio() arma el botón de la orden con esc() del id y del código'],
  ['acNumero', 'HTML ya escapado: htmlMovimientoAcopio() arma el sello con esc() del N° de acopio, o vacío'],
  ['datos', "HTML armado por htmlDatoAd(), que escapa rótulo y valor (htmlDetalleAcopio, unidos con join(''))"],
  ['acObs', 'HTML ya escapado: htmlDetalleAcopio() arma las observaciones con esc(), o vacío'],
  ['acMovs', 'HTML armado por htmlMovimientoAcopio(), que escapa cada movimiento, o un texto constante'],
  // Corregir una orden (29/10/2026, ci-prueba/corregir-orden): todo lo ejecuta
  // test-administracion-corregir-orden.js con marcas donde va algo de la base.
  ['k', 'HTML ya escapado: k = esc(r.clave), la clave del renglón del editor (un número del código)'],
  ['cab', 'HTML ya escapado: la cabeza del panel / del renglón, con textos constantes, esc() del número y el botón Sacar con k'],
  ['cant', 'HTML ya escapado: htmlRenglonCorregir() arma el campo de cajas o cantidad con esc() del rótulo y k (el número se pone después con ponerNumero)'],
  ['precio', 'HTML ya escapado: htmlRenglonCorregir() arma el campo del precio con esc() del rótulo, k y el subtotal, o un texto constante, o vacío'],
  ['fecha', 'HTML ya escapado: htmlCorregirOrden() arma el campo de la fecha con esc() del valor y de hoy, con su explicación constante'],
  ["c.errores.map(e => `<li>${esc(e)}</li>`).join('')", 'HTML ya escapado: cada error del editor con esc()'],
  ["lineasResumenCorregir(c).map(l => `<li>${esc(l)}</li>`).join('')", 'HTML ya escapado: cada línea del resumen con esc()'],
  ['htmlCorreccionesOrden(d)', 'HTML armado por htmlCorreccionesOrden(), que escapa fecha, nombre, motivo y totales'],
  ['htmlFaltantesCorreccion(d)', 'HTML armado por htmlFaltantesCorreccion(), que escapa cada renglón que faltó'],
  ['htmlProductoCorregir(c, r)', 'HTML armado por htmlProductoCorregir(), que escapa el nombre y la búsqueda'],
  ['htmlOpcionesCorregir(c, r)', 'HTML armado por htmlOpcionesCorregir(), que escapa cada producto o insumo'],
  ['htmlMarcasCorregir(c, r)', 'HTML armado por htmlMarcasCorregir(), que escapa cada cono'],
  ['htmlDevCorregir(r)', 'HTML armado por htmlDevCorregir(), que escapa motivo, lote y destino'],
  ['htmlLotesCorregir(r)', 'HTML armado por htmlLotesCorregir(), que escapa cada lote y el estado'],
]

const SEGURAS_REGEX_ADMINISTRACION = [
]

module.exports = { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION }
