// Hojas seguras del chequeo estático de modulos/pedidos.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-pedidos-xss.js en rojo nombrándola.

const SEGURAS_PEDIDOS = [
  // Parte 2: unidades y clientes
  ['botones', 'HTML ya escapado: htmlUnidades() lo arma arriba con esc() del id y del nombre de cada unidad'],
  ["lista.map(a => `<span class=\"pe-apodo\">${esc(a)}</span>`).join('')", 'HTML armado en el mismo renglón con esc() de cada apodo'],
  ['htmlChipsApodos(c.apodos)', 'HTML armado por htmlChipsApodos(), que escapa cada apodo'],
  ['i', 'número: índice del .map()'],
]

const SEGURAS_REGEX_PEDIDOS = [
]

module.exports = { SEGURAS_PEDIDOS, SEGURAS_REGEX_PEDIDOS }
