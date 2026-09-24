// Hojas seguras del chequeo estático de modulos/pedidos.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-pedidos-xss.js en rojo nombrándola.

const SEGURAS_PEDIDOS = [
  // Parte 2: unidades y clientes
  ['botones', 'HTML ya escapado: htmlUnidades() lo arma arriba con esc() del id y del nombre de cada unidad'],
  ["lista.map(a => `<span class=\"pe-apodo\">${esc(a)}</span>`).join('')", 'HTML armado en el mismo renglón con esc() de cada apodo'],
  ['htmlChipsApodos(c.apodos)', 'HTML armado por htmlChipsApodos(), que escapa cada apodo'],
  ['i', 'número: índice del .map()'],
  // Parte 3: cargar un pedido
  ["chocolate.map(boton).join('')", 'HTML armado por boton(), que escapa el id y el nombre de cada producto'],
  ["comunes.map(boton).join('')", 'HTML armado por boton(), que escapa el id y el nombre de cada producto'],
  ['choco', "HTML ya escapado: htmlProductosRenglon() lo arma arriba con boton() (escapa adentro) y la palabra 'Chocolate', constante"],
  ['htmlMarcasRenglon(r, i, cat)', 'HTML armado por htmlMarcasRenglon(), que escapa el id y el nombre de cada cono y lo buscado'],
  ["lista.map(pr => htmlOpcionPresentacion(pr, i, r)).join('')", 'HTML armado por htmlOpcionPresentacion(), que escapa el id, el nombre y el detalle'],
  ['quitar', 'HTML armado en htmlRenglon() con el índice numérico del renglón y texto constante'],
  ['cuerpo', 'HTML ya escapado: htmlRenglon() lo arma con htmlProductosRenglon() / htmlConoRenglon() / htmlPresentacionesRenglon() (escapan adentro) y esc() del nombre del producto'],
  ['htmlPieRenglon(r, i, false)', 'HTML armado por htmlPieRenglon(), que escapa la nota del renglón'],
  ['htmlPieRenglon(r, i, true)', 'HTML armado por htmlPieRenglon(), que escapa la nota del renglón'],
  ['error', 'HTML ya escapado: htmlRenglon() lo arma arriba con esc() de lo que falta, o vacío'],
]

const SEGURAS_REGEX_PEDIDOS = [
]

module.exports = { SEGURAS_PEDIDOS, SEGURAS_REGEX_PEDIDOS }
