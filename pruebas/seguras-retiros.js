// Hojas seguras del chequeo estático de modulos/retiros.html y de
// js/retiros-comun.js, CADA UNA CON SU MOTIVO (ver clasificar.js). Una
// interpolación nueva que no esté escapada ni figure acá pone
// test-retiros-xss.js en rojo nombrándola.

const SEGURAS_RETIROS = [
  ['i', 'número: índice del renglón en el .map() o el parámetro numérico de los renders'],
  ['htmlLogo(e)', 'HTML armado por htmlLogo(), que escapa la clase y pasa el archivo por logoSeguro() + encodeURIComponent'],
  ['cambiar', 'HTML constante del código: el botón "Cambiar", o vacío'],
  ['htmlProductosRenglon(i, cat, r.busqueda)', 'HTML armado por htmlProductosRenglon(), que escapa el nombre, la marca, el stock y lo buscado de cada opción'],
  ['aviso', 'HTML constante del código: el aviso de insumos que Mis retiros no ve, o vacío'],
  ['htmlMarcasRenglon(r, i, cat)', 'HTML armado por htmlMarcasRenglon(), que escapa el id y el nombre de cada cono y lo buscado'],
  ['elegido', 'HTML ya escapado: htmlLoteRenglon() lo arma con esc() del lote elegido, o texto constante'],
  ['cuerpo', 'HTML ya escapado: lo arman htmlLoteRenglon() / htmlRenglon() con esc() o con renders que escapan adentro'],
  ['htmlLoteRenglon(r, i)', 'HTML armado por htmlLoteRenglon(), que escapa cada lote'],
  ['quitar', 'HTML armado en htmlRenglon() con el índice numérico y texto constante'],
  ['pie', 'HTML armado en htmlRenglon() con el índice numérico y htmlLoteRenglon(), que escapa adentro'],
  ['error', 'HTML ya escapado: htmlRenglon() lo arma con esc() de lo que falta, o vacío'],
  ['filas', 'HTML ya escapado: htmlResumen() arma cada fila con esc() de la descripción, el lote y las cajas'],
  ['renglones', 'HTML ya escapado: htmlFaltantes() / htmlDetalleMio() arman cada renglón con esc()'],
]

const SEGURAS_REGEX_RETIROS = [
]

const SEGURAS_HOJA = [
  ['cab', 'HTML constante del código: los encabezados de la tabla de la hoja'],
  ['filas', 'HTML ya escapado: htmlTablaHoja() arma cada fila con escHoja() de cada dato'],
  ['pie', 'HTML ya escapado: htmlTablaHoja() arma el pie con escHoja() de los totales'],
  ['htmlEmpresaHoja(orden?.empresa)', 'HTML armado por htmlEmpresaHoja(), que escapa cada dato y pasa el logo por logoSeguro() + encodeURIComponent'],
  ['cuerpo', 'HTML ya escapado: htmlHoja() une las copias de htmlCopiaHoja() (que escapa todo) con CORTE_HOJA, constante'],
]

module.exports = { SEGURAS_RETIROS, SEGURAS_REGEX_RETIROS, SEGURAS_HOJA }
