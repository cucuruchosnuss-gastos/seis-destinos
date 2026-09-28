// Hojas seguras del chequeo estático de modulos/taller.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-taller-xss.js en rojo nombrándola.
//
// OJO: el chequeo estático mira las plantillas (`${…}`); lo que el archivo arma
// concatenando con + lo cubren los renders EJECUTADOS con texto malicioso de
// test-taller.js, que es la otra mitad.

const SEGURAS_TALLER = [
  ['ancho', 'número: htmlBarraCosto() lo acota con Math.max(0, Math.min(100, avance))'],
  ['opciones', 'HTML ya escapado: htmlPanelHoras() arma cada <option> con esc() del id y del nombre'],
  ['tipos', 'HTML ya escapado: htmlSeccionArchivos() arma cada <option> con esc() de la clave y la etiqueta (constantes)'],
  ['htmlSeccionDatos(r, c)', 'HTML armado por htmlSeccionDatos(), que escapa cada dato con dato() / esc()'],
  ['htmlSeccionPlata(r, c)', 'HTML armado por htmlSeccionPlata(), que escapa cada cifra con cifra() / esc()'],
  ["futuros.map(v => `${esc(importe(v.valor))} desde el ${esc(fechaCorta(v.vigente_desde))}`).join(' · ')", 'HTML armado en el mismo renglón con esc() del importe y de la fecha'],
]

const SEGURAS_REGEX_TALLER = [
]

module.exports = { SEGURAS_TALLER, SEGURAS_REGEX_TALLER }
