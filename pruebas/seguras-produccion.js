// Hojas seguras del chequeo estático de modulos/produccion.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-produccion-xss.js en rojo nombrándola.

const SEGURAS_PRODUCCION = [
  ['otra', 'HTML constante del código: htmlBotonPersona() lo arma con un literal o vacío'],
]

const SEGURAS_REGEX_PRODUCCION = [
]

module.exports = { SEGURAS_PRODUCCION, SEGURAS_REGEX_PRODUCCION }
