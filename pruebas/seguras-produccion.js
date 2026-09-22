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
  ['producido', 'HTML ya escapado: htmlDetalleTurno() arma cada sublote con esc() de cada dato'],
  ['totales', 'HTML ya escapado: htmlDetalleTurno() arma cada total con esc() del insumo, el lote y los kilos'],
]

const SEGURAS_REGEX_PRODUCCION = [
]

module.exports = { SEGURAS_PRODUCCION, SEGURAS_REGEX_PRODUCCION }
