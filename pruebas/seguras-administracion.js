// Hojas seguras del chequeo estático de modulos/administracion.html, CADA UNA
// CON SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté
// escapada ni figure acá pone test-administracion-xss.js en rojo nombrándola.

const SEGURAS_ADMINISTRACION = [
  ['htmlSelloOrden(o)', 'HTML constante del código: htmlSelloOrden() devuelve uno de tres sellos fijos'],
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
  ["a.sugeridos.map(s => htmlOpcionCliente(s, a.cliente?.id, true)).join('')", 'HTML armado por htmlOpcionCliente(), que escapa id, nombre y detalle'],
  ['sugeridos', 'HTML armado en htmlPanelAsentar() con esc() del texto y htmlOpcionCliente()'],
  ['htmlResultadosAsentar(a)', 'HTML armado por htmlResultadosAsentar(), que escapa los textos y usa htmlOpcionCliente()'],
  ['elegido', 'HTML ya escapado: htmlPanelAsentar() lo arma con esc() del texto, o vacío'],
  ["datos.map(([k, v]) => htmlDatoAd(k, v)).join('')", 'HTML armado por htmlDatoAd(), que escapa rótulo y valor'],
  ['htmlChequesCob(c, cheques)', 'HTML armado por htmlChequesCob(), que escapa los avisos y usa htmlChequeCob()'],
  ['pie', 'HTML armado en htmlTarjetaCobranza(): htmlHechoCob() / htmlPanelAsentar() (escapan) o un botón con esc() del id'],
  // El proyecto del Taller al asentar (28/09/2026)
  ['opciones', 'HTML ya escapado: htmlProyectoAsentar() arma cada <option> con esc() del id y del nombre'],
  ['htmlProyectoAsentar(a)', 'HTML armado por htmlProyectoAsentar(), que escapa id y nombre de cada proyecto'],
]

const SEGURAS_REGEX_ADMINISTRACION = [
]

module.exports = { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION }
