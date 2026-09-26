// Mutaciones de test-produccion-color.js ("terminar la tablet", parte 1). Ver mutar.js.
//
//   node pruebas/mut-produccion-color.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

const fs = require('fs')
const ORIGINAL = process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html')
const GEN = '    .pr-planilla-cab .pr-btn--accion { border: 2px solid var(--pr-prod-activo); background: var(--color-fondo); color: var(--pr-prod-activo); }\n'

// "La genérica pasa DESPUÉS": el bloque desde la regla genérica blanca hasta
// el separador, con la genérica movida al final. Es el bug de orden que el
// test vigila (misma especificidad: decide el orden en el archivo).
function ordenInvertido() {
  const src = fs.readFileSync(ORIGINAL, 'utf8')
  const i = src.indexOf(GEN)
  const j = src.indexOf('    .pr-planilla-cab__sep {', i)
  const bloque = i === -1 || j === -1 ? '(no se encontró el bloque)' : src.slice(i, j)
  return { nombre: 'la regla genérica pasa DESPUÉS y pisa a Cerrar planilla', de: bloque, a: bloque.slice(GEN.length) + GEN }
}

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-color.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // El azul que vuelve, por cada una de sus formas.
    { nombre: 'vuelve el token --azul en el botón', de: '      border-radius: var(--radio-boton); border: 2px solid var(--naranja);\n      background: var(--naranja); color: #fff;', a: '      border-radius: var(--radio-boton); border: 2px solid var(--azul);\n      background: var(--azul); color: #fff;' },
    { nombre: 'vuelve --azul-suave en un chip', de: '.pr-chip[aria-pressed="true"] { border-color: var(--naranja); background: var(--naranja-suave);', a: '.pr-chip[aria-pressed="true"] { border-color: var(--naranja); background: var(--azul-suave);' },
    { nombre: 'vuelve --azul-oscuro en el secundario', de: 'border-color: var(--pr-borde-boton); color: var(--color-texto); }', a: 'border-color: var(--pr-borde-boton); color: var(--azul-oscuro); }' },
    { nombre: 'vuelve #1f5fad en minúsculas', de: '    [hidden] { display: none !important; }\n', a: '    [hidden] { display: none !important; }\n    .pr-x { color: #1f5fad; }\n' },
    { nombre: 'vuelve #E7EFFA', de: '    [hidden] { display: none !important; }\n', a: '    [hidden] { display: none !important; }\n    .pr-x { background: #E7EFFA; }\n' },
    { nombre: 'vuelve #164680', de: '    [hidden] { display: none !important; }\n', a: '    [hidden] { display: none !important; }\n    .pr-x { border-color: #164680; }\n' },
    // Lo que se toca y lo que se lee.
    { nombre: 'el botón base deja de ser naranja', de: '      border-radius: var(--radio-boton); border: 2px solid var(--naranja);\n      background: var(--naranja); color: #fff;', a: '      border-radius: var(--radio-boton); border: 2px solid var(--color-acento);\n      background: var(--color-acento); color: #fff;' },
    { nombre: 'el secundario pierde el borde con 3:1', de: '.pr-btn--secundario { background: var(--color-fondo); border-color: var(--pr-borde-boton);', a: '.pr-btn--secundario { background: var(--color-fondo); border-color: var(--color-borde);' },
    { nombre: 'el foco de un campo deja de ser naranja', de: '.pr-textarea:focus { outline: none; border-color: var(--naranja); }', a: '.pr-textarea:focus { outline: none; border-color: var(--color-acento); }' },
    { nombre: 'el lote del historial en un acento', de: '.pr-lote { font-size: 3rem; font-weight: 900; color: var(--color-texto);', a: '.pr-lote { font-size: 3rem; font-weight: 900; color: var(--naranja);' },
    // Lo elegido.
    { nombre: 'la máquina elegida vuelve al amarillo', de: '.pr-sala-maq[aria-pressed="true"] { border: 3px solid var(--naranja); background: var(--naranja-suave); }', a: '.pr-sala-maq[aria-pressed="true"] { border: 3px solid var(--pr-masa-letra); background: var(--pr-masa-activo); }' },
    { nombre: 'Simple/Doble vuelve al amarillo', de: '      background: var(--naranja); border: 3px solid var(--naranja); color: #fff; font-weight: 900;', a: '      background: var(--pr-masa-activo); border: 3px solid var(--pr-masa-letra); color: var(--pr-masa-letra); font-weight: 900;' },
    { nombre: 'el turno elegido vuelve al gris de modo', de: '    .pr-segmento--columna .pr-segmento__opcion[aria-pressed="true"] {\n      background: var(--naranja); border-color: var(--naranja); color: #fff;', a: '    .pr-segmento--columna .pr-segmento__opcion[aria-pressed="true"] {\n      background: var(--pr-prod-activo); border-color: var(--pr-prod-activo); color: var(--pr-prod-letra);' },
    { nombre: 'la casilla marcada vuelve al gris de modo', de: '.pr-casilla:checked { background: var(--naranja); border-color: var(--naranja); }', a: '.pr-casilla:checked { background: var(--pr-prod-activo); border-color: var(--pr-prod-activo); }' },
    { nombre: 'el chip elegido en gris', de: '.pr-chip[aria-pressed="true"] { border-color: var(--naranja); background: var(--naranja-suave); color: var(--naranja-oscuro); }', a: '.pr-chip[aria-pressed="true"] { border-color: var(--color-borde); background: var(--color-superficie); color: var(--color-texto); }' },
    { nombre: 'la barra de modos pierde el amarillo', de: '      background: var(--pr-masa-activo); border: 3px solid var(--pr-masa-activo-borde);', a: '      background: var(--naranja); border: 3px solid var(--pr-masa-activo-borde);' },
    // Cerrar planilla.
    { nombre: 'Cerrar planilla pierde su clase', de: 'class="pr-btn pr-btn--accion pr-planilla-cab__cerrar" id="pr-btn-cerrar-planilla"', a: 'class="pr-btn pr-btn--accion" id="pr-btn-cerrar-planilla"' },
    { nombre: 'sin separador', de: '            <span class="pr-planilla-cab__sep" aria-hidden="true"></span>\n', a: '' },
    { nombre: 'Cerrar planilla vuelve a blanco', de: '    .pr-planilla-cab .pr-planilla-cab__cerrar {\n      background: var(--naranja);', a: '    .pr-planilla-cab .pr-planilla-cab__cerrar {\n      background: var(--color-fondo);' },
    { nombre: 'Cerrar planilla igual de ancho', de: '      min-width: 16rem; padding: 0 2rem;', a: '      padding: 0 2rem;' },
    ordenInvertido(),
    // La cabecera.
    { nombre: 'la cabecera de la gestión repite el módulo', de: "textContent = estado.unidadId ? (estado.unidades.get(estado.unidadId) ?? '') : ''", a: "textContent = 'Producción · ' + (estado.unidadId ? (estado.unidades.get(estado.unidadId) ?? '') : '')" },
    { nombre: 'la cabecera de la gestión queda escondida', de: "document.getElementById('pr-header').hidden = false", a: "document.getElementById('pr-header').hidden = true" },
    { nombre: 'la cabecera dice Producción dos veces', de: '          <span class="pr-header__titulo">Producción</span>', a: '          <span class="pr-header__titulo">Producción · Producción</span>' },
    // Desde el diseño de la gestión (26/09/2026) la pantalla de inicio no tiene título propio.
    { nombre: 'la oficina vuelve a titular "Producción"', de: '      <section id="pr-inicio">\n', a: '      <section id="pr-inicio">\n        <h1 class="pr-titulo">Producción</h1>\n' },
    // Las grillas.
    { nombre: 'el tablero vuelve a auto-fill', de: '    .pr-tablero { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit,', a: '    .pr-tablero { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill,' },
    { nombre: 'una sola tarjeta se estira', de: '    .pr-tablero:not(:has(> :nth-child(2))) { max-width: 36rem; margin-inline: auto; }\n', a: '' },
    { nombre: 'las opciones dejan de centrarse', de: '      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 22rem));\n      justify-content: center;', a: '      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 22rem));' },
    // El contraste.
    { nombre: 'el borde del secundario pierde el 3:1', de: '      --pr-borde-boton:         #737C8D;', a: '      --pr-borde-boton:         #9AA1AE;' },
  ],
})
