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
]

const SEGURAS_REGEX_PRODUCCION = [
]

module.exports = { SEGURAS_PRODUCCION, SEGURAS_REGEX_PRODUCCION }
