// Hojas seguras del chequeo estático de modulos/produccion.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-produccion-xss.js en rojo nombrándola.

const SEGURAS_PRODUCCION = [
  ['otra', 'HTML constante del código: htmlBotonPersona() lo arma con un literal o vacío'],
  // B3
  ['estadoTxt', 'HTML ya escapado: htmlMaquina() lo arma arriba con esc(textoEstadoMaquina(e))'],
  ['parada', 'HTML ya escapado: htmlMaquina() lo arma arriba con esc(e.parada.motivo), o vacío'],
  ['SIN_OPERARIO', 'constante del código: "__sin__"'],
  ['clase', 'clase CSS constante del código, o vacía'],
  ['i', 'número: índice del .map()'],
  ['htmlOpcionesOperario(operarios, f.operario)', 'HTML armado por htmlOpcionesOperario(), que escapa adentro'],
  // B4
  ['detalle', 'HTML ya escapado: htmlProducido() lo arma arriba con esc(d.detalle), o vacío'],
  // B5
  ['botones', 'HTML ya escapado: htmlPasoTipo() lo arma arriba con esc(t) de cada tipo, o un aviso constante'],
  ['detalleAnt', 'HTML ya escapado: htmlPasoBase() lo arma arriba con esc() del lote, el número, la hora y la diferencia, o un texto constante'],
  ['opcInsumo', 'HTML ya escapado: htmlLoteIngrediente() lo arma arriba con esc() del id, el nombre y la marca de cada insumo'],
  ['htmlOpcionesLote(ins, valorLote)', 'HTML armado por htmlOpcionesLote(), que escapa adentro'],
  ['notaSin', 'HTML ya escapado: htmlPasoLotes() lo arma arriba con esc() de los nombres, o vacío'],
  ['cuerpo', 'HTML ya escapado: htmlPasoLotes() lo arma con htmlLoteIngrediente() (escapa adentro), esc() del lote y el número de la anterior, o textos constantes'],
  ['cartel', 'HTML constante del código: "DOBLE ×2" o "Simple"'],
  ['cabDoble', 'HTML constante del código, o vacío'],
  ['filas', 'HTML ya escapado: htmlPasoResumen() arma cada fila con esc() de cada celda'],
  ['anular', 'HTML ya escapado: htmlMasaFila() lo arma arriba con esc(m.id), o vacío'],
]

const SEGURAS_REGEX_PRODUCCION = [
]

module.exports = { SEGURAS_PRODUCCION, SEGURAS_REGEX_PRODUCCION }
