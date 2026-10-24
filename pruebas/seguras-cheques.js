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
  // Depositar y vender al banco (13/10/2026)
  ['htmlLinkGastoVenta(ch)', 'HTML armado por htmlLinkGastoVenta(): el id con encodeURIComponent, entre comillas dobles, o vacío'],
  ['htmlOpcionesCuentas(cuentasOfrecidas(), estado.nombresUnidades)', 'HTML armado por htmlOpcionesCuentas(), que escapa adentro'],
  ['html', 'HTML armado arriba en pintarBanco: cada valor con esc() (la fila, la cuenta, los importes)'],
  // En el banco (13/10/2026)
  ['htmlCuentaEnBanco()', 'HTML armado por htmlCuentaEnBanco(): el número con esc(), o vacío'],
  ['n', 'un número: la cantidad de cheques del grupo (g.cheques.length)'],
  ['boton', 'HTML armado arriba en htmlGruposEnBanco: la clave con esc(), el texto fijo y un número, o vacío'],
  ['casilla', 'HTML armado arriba en htmlChequeEnBanco: el id y el número con esc(), o vacío'],
  // Importe completo (24/10/2026): htmlResultadoAcreditar ya no arma el link
  // del gasto de intereses (la base no lo carga más).
  ['destino', 'HTML constante de htmlGastosBanco(): \' target="_blank" rel="noopener"\' o vacío, sin nada de la base'],
  ['htmlGruposEnBanco(gruposEnBanco(filas, estado.cuentasBanco?.porId), bancoUI.ids, puedeProcesar(), estado.cobranzas, hoyArgentina())', 'HTML armado por htmlGruposEnBanco(), que escapa adentro'],
  ['bancoUI.resultado', 'HTML armado por htmlResultadoAcreditar(), que escapa adentro'],
]

const SEGURAS_REGEX_CHEQUES = [
  [/^htmlEncabezadoOrden\('[a-z]+', '[^'$`]*'(, '[a-z_-]*')?\)$/s, 'HTML armado por htmlEncabezadoOrden(), que escapa adentro; los argumentos son literales'],
  [/^COLUMNAS_ORDEN\.flatMap\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^filas\.map\(ch => htmlFilaCheque\(ch, cobranzas\.get\(ch\.cobranza_id\)\)\)\.join\(''\)$/s, 'HTML armado por htmlFilaCheque(), que escapa adentro'],
  [/^notas\.map\(t =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^codigos\.map\(c =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^unidades\.map\(u =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^ESTADOS_FILTRO_CHEQUES\.map\(e =>/s, 'HTML de una plantilla anidada, verificada aparte'],
  [/^g\.cuentas\.map\(c =>/s, 'HTML de una plantilla anidada (htmlOpcionesCuentas), verificada aparte'],
  [/^g\.cheques\.map\(ch => htmlChequeEnBanco\(/s, 'HTML armado por htmlChequeEnBanco(), que escapa adentro'],
  [/^cheques\.map\(ch =>/s, 'HTML de una plantilla anidada (armarFilasAcreditar, sin campos desde el 24/10/2026), verificada aparte'],
]

module.exports = { SEGURAS_CHEQUES, SEGURAS_REGEX_CHEQUES }
