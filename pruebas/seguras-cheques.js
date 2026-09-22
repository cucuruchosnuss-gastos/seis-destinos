// Hojas seguras del chequeo estático de modulos/cheques.html, CADA UNA CON SU
// MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada con
// esc() ni figure acá pone test-cheques-vista.js en rojo nombrándola.

const SEGURAS_CHEQUES = [
  ['cantidadCartera', 'número: conteo calculado en resumenCartera()'],
  ['htmlTablaCheques(visibles, estado.cobranzas)', 'HTML armado por htmlTablaCheques(), que escapa adentro'],
  ['htmlAvisoVencimientos(estado.vencimientos, !!estado.filtros.soloVencen)', 'HTML armado por htmlAvisoVencimientos(), que escapa adentro'],
  ['celdaPago', 'HTML ya escapado: se arma arriba con esc() de la fecha y de la etiqueta del plazo'],
  ['htmlCartera(estado.cartera, hayFiltrosCheques(), estado.topeResumen)', 'HTML armado por htmlCartera(), que escapa adentro'],
  ['htmlSalidaCheque(ch, cob)', 'HTML armado por htmlSalidaCheque(), que escapa adentro'],
  ['rotulo', 'HTML constante del código: htmlEncabezadoOrden() se llama SOLO con literales (lo verifica test-cheques-vista.js)'],
  ['htmlAccionSalida(ch, accion)', 'HTML armado por htmlAccionSalida(), que escapa adentro'],
  ['accion', 'HTML ya escapado: htmlAccionSalida() lo arma arriba y escapa adentro'],
  ['htmlListaCheques(visibles, estado.cobranzas)', 'HTML armado por htmlListaCheques() → htmlTarjetaCheque(), que escapa adentro'],
  ['volver', 'HTML ya escapado: el botón se arma arriba con esc(ch.id), o vacío'],
]

const SEGURAS_REGEX_CHEQUES = [
  [/^htmlEncabezadoOrden\('[a-z]+', '[^'$`]*'(, '[a-z_-]*')?\)$/s, 'HTML armado por htmlEncabezadoOrden(), que escapa adentro; los argumentos son literales'],
  [/^COLUMNAS_ORDEN\.flatMap\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^filas\.map\(ch => htmlFilaCheque\(ch, cobranzas\.get\(ch\.cobranza_id\)\)\)\.join\(''\)$/s, 'HTML armado por htmlFilaCheque(), que escapa adentro'],
  [/^notas\.map\(t =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^codigos\.map\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^ESTADOS_FILTRO_CHEQUES\.map\(e =>/s, 'HTML de una plantilla anidada, verificada aparte'],
]

module.exports = { SEGURAS_CHEQUES, SEGURAS_REGEX_CHEQUES }
