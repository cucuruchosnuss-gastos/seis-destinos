// Hojas seguras del chequeo estático de modulos/taller.html, CADA UNA CON
// SU MOTIVO (ver clasificar.js). Una interpolación nueva que no esté escapada
// con esc() ni figure acá pone test-taller-xss.js en rojo nombrándola.
//
// OJO: el chequeo estático mira las plantillas (`${…}`); lo que el archivo arma
// concatenando con + lo cubren los renders EJECUTADOS con texto malicioso de
// test-taller.js, que es la otra mitad.

const SEGURAS_TALLER = [
  ['ancho', 'número: htmlBarraCosto() lo acota con Math.max(0, Math.min(100, avance))'],
  ['clases', 'clases CSS armadas en la misma función con literales del código (kv, cabecera y celdas del diagrama)'],
  ['estilo', 'htmlTabla(): "grid-template-columns:" + esc(columnas), ya escapado en el renglón de arriba'],
  ['importe((c ?? 0) - pr, moneda)', 'texto de una plantilla que queda adentro de un esc(): htmlCosto() escapa "se pasó $ …" entero'],
]

const SEGURAS_REGEX_TALLER = [
]

module.exports = { SEGURAS_TALLER, SEGURAS_REGEX_TALLER }
