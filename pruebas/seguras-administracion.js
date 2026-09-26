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
]

const SEGURAS_REGEX_ADMINISTRACION = [
]

module.exports = { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION }
