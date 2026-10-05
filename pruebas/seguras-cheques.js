// Hojas seguras del chequeo estático de modulos/cheques.html, CADA UNA CON SU
// MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada con
// esc() ni figure acá pone test-cheques-vista.js en rojo nombrándola.

const SEGURAS_CHEQUES = [
  ['cantidadCartera', 'número: conteo calculado en resumenCartera()'],
  ['htmlFormaCheque(ch)', 'HTML constante de htmlFormaCheque() (30/09/2026): una de dos etiquetas fijas del código, sin nada de la base'],
  ['htmlTablaCheques(visibles, estado.cobranzas)', 'HTML armado por htmlTablaCheques(), que escapa adentro'],
  ['htmlAvisoVencimientos(estado.vencimientos, !!estado.filtros.soloVencen)', 'HTML armado por htmlAvisoVencimientos(), que escapa adentro'],
  ['celdaPago', 'HTML ya escapado: se arma arriba con esc() de la fecha y de la etiqueta del plazo'],
  ['htmlCartera(estado.cartera, hayFiltrosCheques(), estado.topeResumen, estado.carteraDetalle)', 'HTML armado por htmlCartera(), que escapa adentro'],
  ['marcaSinUnidad', 'HTML armado arriba en htmlTarjetaCheque: un span fijo con esc(TEXTO_SIN_UNIDAD), o vacío'],
  ['htmlSalidaCheque(ch, cob)', 'HTML armado por htmlSalidaCheque(), que escapa adentro'],
  ['rotulo', 'HTML constante del código: htmlEncabezadoOrden() se llama SOLO con literales (lo verifica test-cheques-vista.js)'],
  ['htmlAccionSalida(ch, accion)', 'HTML armado por htmlAccionSalida(), que escapa adentro'],
  ['accion', 'HTML ya escapado: htmlAccionSalida() lo arma arriba y escapa adentro'],
  ['htmlListaCheques(visibles, estado.cobranzas)', 'HTML armado por htmlListaCheques() → htmlTarjetaCheque(), que escapa adentro'],
  ['htmlAriaElegido(ch)', 'HTML armado por htmlAriaElegido(): un atributo con "true" o "false", constantes'],
  ['htmlCasillaElegir(ch)', 'HTML armado por htmlCasillaElegir(), que escapa adentro'],
  ['volver', 'HTML ya escapado: el botón se arma arriba con esc(ch.id), o vacío'],
  ['htmlCeldaUnidad(ch, cob)', 'HTML armado por htmlCeldaUnidad(), que escapa adentro'],
  ['htmlLeyendaEstados(entradas)', 'HTML armado por htmlLeyendaEstados(), que escapa adentro'],
  // Endosar a un proveedor (29/09/2026)
  ["htmlAccionSalida(ch, 'volver')", 'HTML armado por htmlAccionSalida(), que escapa adentro (el botón de volver a cartera)'],
  ['lineasFacturas.join(\'\')', 'HTML armado arriba en htmlPreviaEndoso: cada <li> con esc() del nombre y del detalle'],
  ['lineasCheques.join(\'\')', 'HTML armado arriba en htmlPreviaEndoso: cada <li> con esc() del texto'],
  ['htmlResultadosEndoso(estado.salida)', 'HTML armado por htmlResultadosEndoso(), que escapa adentro'],
  ['htmlPreviaEndoso(estado.salida)', 'HTML armado por htmlPreviaEndoso(), que escapa adentro'],
  ['htmlOpcionesUnidadEndoso(s)', 'HTML armado por htmlOpcionesUnidadEndoso(), que escapa adentro'],
  // Un pago con cheques de la cartera y los cheques emitidos (05/10/2026)
  ['linkPago', 'HTML armado arriba en htmlEmitido: el link "Ver el pago" con encodeURIComponent del id, o vacío'],
  ['g.cantidad', 'número: conteo calculado en pendientePorCuenta()'],
  ["grupos.map(htmlTotalEmitidos).join('')", 'HTML armado por htmlTotalEmitidos(), que escapa adentro'],
  ["filas.map(c => htmlEmitido(c, hoy)).join('')", 'HTML armado por htmlEmitido(), que escapa adentro'],
]

const SEGURAS_REGEX_CHEQUES = [
  [/^htmlEncabezadoOrden\('[a-z]+', '[^'$`]*'(, '[a-z_-]*')?\)$/s, 'HTML armado por htmlEncabezadoOrden(), que escapa adentro; los argumentos son literales'],
  [/^COLUMNAS_ORDEN\.flatMap\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^filas\.map\(ch => htmlFilaCheque\(ch, cobranzas\.get\(ch\.cobranza_id\)\)\)\.join\(''\)$/s, 'HTML armado por htmlFilaCheque(), que escapa adentro'],
  [/^notas\.map\(t =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^codigos\.map\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^unidades\.map\(u =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^ESTADOS_FILTRO_CHEQUES\.map\(e =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^opciones\.map\(o =>/s, 'HTML de una plantilla anidada (las cuentas de los emitidos), verificada aparte'],
]

module.exports = { SEGURAS_CHEQUES, SEGURAS_REGEX_CHEQUES }
