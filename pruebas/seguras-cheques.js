// Hojas seguras del chequeo estático de modulos/cheques.html, CADA UNA CON SU
// MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada con
// esc() ni figure acá pone test-cheques-vista.js en rojo nombrándola.

const SEGURAS_CHEQUES = [
  ['cantidadCartera', 'número: conteo calculado en resumenCartera()'],
  ['celdaSalida', 'HTML ya escapado: se arma arriba con esc() de la fecha y del destino'],
  ['htmlTablaCheques(estado.filas, estado.cobranzas)', 'HTML armado por htmlTablaCheques(), que escapa adentro'],
  ['htmlCartera(estado.cartera, hayFiltrosCheques(), estado.topeResumen)', 'HTML armado por htmlCartera(), que escapa adentro'],
  ['htmlAccionCheque(ch, cob)', 'HTML armado por htmlAccionCheque(), que escapa adentro'],
]

const SEGURAS_REGEX_CHEQUES = [
  [/^filas\.map\(ch => htmlFilaCheque\(ch, cobranzas\.get\(ch\.cobranza_id\)\)\)\.join\(''\)$/s, 'HTML armado por htmlFilaCheque(), que escapa adentro'],
  [/^notas\.map\(t =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^codigos\.map\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^ESTADOS_FILTRO_CHEQUES\.map\(e =>/s, 'HTML de una plantilla anidada, verificada aparte'],
]

module.exports = { SEGURAS_CHEQUES, SEGURAS_REGEX_CHEQUES }
