// Hojas seguras del chequeo estático de modulos/produccion.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-produccion-xss.js en rojo nombrándola.

const SEGURAS_PRODUCCION = [
  // Parte 1 del rediseño: barra de modos, ¿Quién sos? y el PIN
  ['unidad', 'HTML ya escapado: htmlQuienEnBarra() lo arma arriba con esc() del nombre de la unidad'],
  ['htmlQuienEnBarra()', 'HTML armado por htmlQuienEnBarra(), que escapa adentro'],
  ['d', 'número: el dígito del for del teclado, de 1 a 9'],
  ['off', 'constante del código: " disabled" o vacío'],
  // B3
  ['clase', 'clase CSS constante del código, o vacía'],
  ['i', 'número: índice del .map()'],
  // Rediseño parte 2: tablero, abrir turno y los operarios del turno
  ['nombreEsc', 'HTML ya escapado: htmlMaquina() lo arma arriba con esc(e.maquina.nombre)'],
  ['cuentaHtml', 'HTML ya escapado: htmlMaquina() lo arma arriba con esc(textoMasas()) y esc(textoSublotes())'],
  ['pieHtml', 'HTML ya escapado: htmlMaquina() lo arma arriba con esc() de la hora y del motivo de la parada'],
  ['htmlResaltado(c.nombre, texto)', 'HTML armado por htmlResaltado(), que escapa los tres pedazos del nombre por separado'],
  ['htmlResultadosOperario(cands, texto, ctx)', 'HTML armado por htmlResultadosOperario(), que escapa adentro'],
  ['chipsHtml', 'HTML armado por htmlChipOperario() (escapa adentro) más esc() del nombre y la hora de salida'],
  ['derechaHtml', 'HTML ya escapado: htmlFilaAbrir() lo arma con htmlChipOperario() (escapa adentro) y texto constante'],
  ['buscadorHtml', 'HTML armado por htmlBuscadorOperarios(), que escapa adentro, o vacío'],
  ['vacioHtml', 'HTML constante del código, o vacío'],
  ['sumarHtml', 'HTML constante del código (el botón "+ Sumar" con CTX_PLANILLA), o vacío'],
  ['CTX_PLANILLA', 'constante del código: "planilla"'],
  // B4 + rediseño parte 3: la planilla, lo producido y agregar un producto
  ['clases', 'clases CSS constantes del código, armadas con banderas de la fila'],
  ['desc', 'HTML ya escapado: htmlProducido() lo arma arriba con esc() del producto, la presentación, la marca y las unidades por caja, o texto constante'],
  ['cab', 'HTML ya escapado: htmlPasosAgregar() lo arma arriba con esc(x.n) y esc(x.titulo)'],
  ['valor', 'HTML ya escapado: htmlPasosAgregar() lo arma arriba con esc(x.valor)'],
  ["chocolate.map(boton).join('')", 'HTML armado por boton(), que escapa el id y el nombre de cada producto'],
  ["comunes.map(boton).join('')", 'HTML armado por boton(), que escapa el id y el nombre de cada producto'],
  ['chocoHtml', "HTML ya escapado: htmlPasoProducto() lo arma arriba con boton() (escapa adentro) y la palabra 'Chocolate', constante"],
  ["opcion(true, 'Con cono')", 'HTML armado por opcion(), que escapa el texto y la cuenta de presentaciones'],
  ["opcion(false, 'Sin cono')", 'HTML armado por opcion(), que escapa el texto y la cuenta de presentaciones'],
  ['htmlResaltado(m.nombre, texto)', 'HTML armado por htmlResaltado(), que escapa los tres pedazos del nombre por separado'],
  ['notas', 'HTML ya escapado: htmlMarcas() lo arma arriba con esc(anterior.sublote), o un chip de texto constante'],
  ['detalle', 'HTML ya escapado: htmlProducido() lo arma arriba con esc(d.detalle), o vacío'],
  // B5
  ['botones', 'HTML ya escapado: lo arman htmlPasoTipo() con esc(t) de cada tipo y htmlProducido() con esc(it.id), o un texto constante'],
  ['detalleAnt', 'HTML ya escapado: htmlPasoBase() lo arma arriba con esc() del lote, el número, la hora y la diferencia, o un texto constante'],
  ['opcInsumo', 'HTML ya escapado: htmlLoteIngrediente() lo arma arriba con esc() del id, el nombre y la marca de cada insumo'],
  ['htmlOpcionesLote(ins, valorLote)', 'HTML armado por htmlOpcionesLote(), que escapa adentro'],
  ['notaSin', 'HTML ya escapado: htmlPasoLotes() lo arma arriba con esc() de los nombres, o vacío'],
  ['cuerpo', 'HTML ya escapado: htmlPasoLotes() lo arma con htmlLoteIngrediente() (escapa adentro), esc() del lote y el número de la anterior, o textos constantes'],
  ['cartel', 'HTML constante del código: "DOBLE ×2" o "Simple"'],
  ['cabDoble', 'HTML constante del código, o vacío'],
  ['filas', 'HTML ya escapado: htmlPasoResumen() arma cada fila con esc() de cada celda'],
  ['anular', 'HTML ya escapado: htmlMasaFila() lo arma arriba con esc(m.id), o vacío'],
  // B6
  ['claveTab', 'constante del código: la clave de PESTANAS_CONFIG'],
  ['tituloTab', 'constante del código: el título de PESTANAS_CONFIG'],
  ['puestoClave', 'constante del código: la clave de PUESTOS (encargado / masero / operario)'],
  ['puestoRotulo', 'constante del código: el rótulo de PUESTOS'],
  ['NUEVO_TIPO', 'constante del código: "__nuevo__"'],
  ['selMaq', 'HTML ya escapado: htmlConfigRecetas() lo arma arriba con esc() del id y el nombre de cada máquina'],
  ['selTipo', 'HTML ya escapado: htmlConfigRecetas() lo arma arriba con esc() de cada tipo'],
  ['aviso', 'HTML constante del código, o vacío'],
  ['cabNuevo', 'HTML ya escapado: htmlConfigRecetas() lo arma arriba con esc() de los tipos y de la versión'],
  ['editor', 'HTML ya escapado: htmlConfigRecetas() arma cada fila con esc() del ingrediente, la cantidad y los insumos'],
  ['historial', 'HTML ya escapado: htmlConfigRecetas() arma cada versión con esc() de la versión, la fecha, el autor y la nota'],
  ['panelInsumos', 'HTML ya escapado: htmlConfigIngredientes() lo arma arriba con esc() de la búsqueda y de cada insumo, o vacío'],
  // B7
  ['TOPE_FILAS', 'constante numérica del código: 1000'],
  ['masas', 'HTML ya escapado: htmlDetalleTurno() arma cada masa con esc() de cada dato'],
  ['htmlParadas(d.paradas)', 'HTML armado por htmlParadas(), que escapa adentro'],
  ['producido', 'HTML ya escapado: htmlDetalleTurno() y htmlResumenCierre() arman cada sublote con esc() de cada dato'],
  ['totales', 'HTML ya escapado: htmlDetalleTurno() arma cada total con esc() del insumo, el lote y los kilos'],
]

const SEGURAS_REGEX_PRODUCCION = [
]

module.exports = { SEGURAS_PRODUCCION, SEGURAS_REGEX_PRODUCCION }
