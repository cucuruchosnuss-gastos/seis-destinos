// Hojas seguras del chequeo estático de modulos/administracion.html, CADA UNA
// CON SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté
// escapada ni figure acá pone test-administracion-xss.js en rojo nombrándola.

const SEGURAS_ADMINISTRACION = [
  ['htmlSelloOrden(o)', 'HTML constante del código: htmlSelloOrden() devuelve uno de tres sellos fijos'],
  ['colorEmpresa(unidadId)', 'constante del código: un color de MARCA_FABRICA (js/barra-unidad.js) o el gris fijo; nunca un dato de la base'],
  ['plata', 'HTML ya escapado: htmlRenglonOrden() lo arma con esc() del id y de los importes, o vacío'],
  ["datos.join('')", 'HTML armado por htmlDatoAd(), que escapa rótulo y valor'],
  ['anulada', 'HTML ya escapado: htmlDetalleOrden() lo arma con esc() del motivo, o vacío'],
  ['sinLotes', 'HTML constante del código: el aviso de que no se pueden ver los lotes, o vacío'],
  ['renglones', 'HTML armado por htmlRenglonOrden(), que escapa cada dato'],
  ['total', 'HTML ya escapado: htmlDetalleOrden() lo arma con esc() del total, o vacío'],
  ['htmlValorizar(d)', 'HTML armado por htmlValorizar(), que escapa los errores y el aviso del límite'],
  ['filas', 'HTML ya escapado: htmlCuenta() / htmlHistorial() arman cada fila con esc() del texto y los importes'],
  ["partes.join('')", 'HTML armado por htmlFilaPrecio(), que escapa cada dato, y el separador de cada grupo, escapado'],
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
]

const SEGURAS_REGEX_ADMINISTRACION = [
]

module.exports = { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION }
