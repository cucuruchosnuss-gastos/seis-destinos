// Mutaciones de test-produccion-color.js ("terminar la tablet", parte 1). Ver mutar.js.
// Planta v2 (28/09/2026): las anclas son las del <style> nuevo (tokens --p-*).
//
//   node pruebas/mut-produccion-color.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

const HIDDEN = '    [hidden] { display: none !important; }\n'

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-color.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // El azul que vuelve, por cada una de sus formas.
    { nombre: 'vuelve el token --azul en el botón de acción', de: '.pr-btn--accion { background: var(--p-acento); border-color: var(--p-acento);', a: '.pr-btn--accion { background: var(--azul); border-color: var(--azul);' },
    { nombre: 'vuelve --azul-suave en la persona elegida', de: '.pr-persona[aria-pressed="true"] { background: var(--p-acento-suave);', a: '.pr-persona[aria-pressed="true"] { background: var(--azul-suave);' },
    { nombre: 'vuelve --azul-oscuro en el motivo elegido', de: '.pr-motivo[aria-pressed="true"] { border-color: var(--p-acento); background: var(--p-acento-suave); color: var(--p-acento-osc); }', a: '.pr-motivo[aria-pressed="true"] { border-color: var(--p-acento); background: var(--p-acento-suave); color: var(--azul-oscuro); }' },
    { nombre: 'vuelve #1f5fad en minúsculas', de: HIDDEN, a: HIDDEN + '    .pr-x { color: #1f5fad; }\n' },
    { nombre: 'vuelve #E7EFFA', de: HIDDEN, a: HIDDEN + '    .pr-x { background: #E7EFFA; }\n' },
    { nombre: 'vuelve #164680', de: HIDDEN, a: HIDDEN + '    .pr-x { border-color: #164680; }\n' },
    // El acento es EL naranja de la app.
    { nombre: '--p-acento pasa a un naranja parecido', de: '      --p-acento: #C2410C;', a: '      --p-acento: #C2410D;' },
    { nombre: '--p-acento-suave pasa a otro suave', de: '      --p-acento-suave: #FDEEE4;', a: '      --p-acento-suave: #FDEEE5;' },
    { nombre: '--p-acento-osc pasa a otro oscuro', de: '      --p-acento-osc: #8F2F08;', a: '      --p-acento-osc: #8F2F09;' },
    // Lo que se toca y lo que se lee.
    { nombre: 'el botón de acción deja de ser naranja', de: '.pr-btn--accion { background: var(--p-acento); border-color: var(--p-acento); color: #fff;', a: '.pr-btn--accion { background: var(--p-tinta); border-color: var(--p-tinta); color: #fff;' },
    { nombre: 'Registrar la masa deja de ser naranja', de: 'border: 0; background: var(--p-acento); color: #fff; font-size: 19px; font-weight: 800; }', a: 'border: 0; background: var(--p-prod); color: #fff; font-size: 19px; font-weight: 800; }' },
    { nombre: 'la tecla de acción con letra oscura', de: '.pr-tecla--accion { background: var(--p-acento); color: #fff;', a: '.pr-tecla--accion { background: var(--p-acento); color: var(--p-tinta);' },
    { nombre: 'el botón secundario se vuelve naranja', de: 'border: 1px solid var(--p-borde); background: var(--p-tarjeta); color: var(--p-tinta-2);', a: 'border: 1px solid var(--p-borde); background: var(--p-tarjeta); color: var(--p-acento);' },
    { nombre: 'el foco deja de ser naranja', de: ':focus-visible { outline: 3px solid var(--p-acento); outline-offset: 2px; }', a: ':focus-visible { outline: 3px solid var(--p-tinta); outline-offset: 2px; }' },
    { nombre: 'el foco de un campo deja de ser naranja', de: '.pr-input:focus, .pr-textarea:focus { outline: none; border-color: var(--p-acento); }', a: '.pr-input:focus, .pr-textarea:focus { outline: none; border-color: var(--p-borde); }' },
    { nombre: 'el lote del historial en un acento', de: '    .pr-hm__ing-marca { font-size: 13.5px; color: var(--p-tinta-2); }\n', a: '    .pr-hm__ing-marca { font-size: 13.5px; color: var(--p-tinta-2); }\n    .pr-hm__ing-lote { color: var(--p-acento); }\n' },
    // Lo elegido.
    { nombre: 'la máquina elegida de la sala vuelve al amarillo', de: '.pr-sala-card[aria-pressed="true"] { border-color: var(--p-acento); }', a: '.pr-sala-card[aria-pressed="true"] { border-color: var(--p-masa-borde); }' },
    { nombre: 'Simple/Doble vuelve al amarillo', de: '.pr-seg-rec__op[aria-pressed="true"], .pr-como[aria-pressed="true"] { background: var(--p-acento);', a: '.pr-seg-rec__op[aria-pressed="true"], .pr-como[aria-pressed="true"] { background: var(--p-masa);' },
    { nombre: 'el turno elegido vuelve al gris de modo', de: '.pr-segmento__opcion[aria-pressed="true"] { background: var(--p-acento);', a: '.pr-segmento__opcion[aria-pressed="true"] { background: var(--p-prod);' },
    { nombre: 'la casilla de la máquina marcada en gris de modo', de: '.pr-abrir-maq[aria-pressed="true"] .pr-abrir-maq__casilla { border-color: var(--p-acento); background: var(--p-acento); }', a: '.pr-abrir-maq[aria-pressed="true"] .pr-abrir-maq__casilla { border-color: var(--p-prod); background: var(--p-prod); }' },
    { nombre: 'el operario elegido en tinta', de: '.pr-op-tag[aria-pressed="true"] { background: var(--p-acento-suave); border-color: var(--p-acento); }', a: '.pr-op-tag[aria-pressed="true"] { background: var(--p-tinte); border-color: var(--p-tinta); }' },
    { nombre: 'la persona elegida vuelve al amarillo', de: '.pr-persona[aria-pressed="true"] { background: var(--p-acento-suave); border-color: var(--p-acento); }', a: '.pr-persona[aria-pressed="true"] { background: var(--p-masa); border-color: var(--p-masa-borde); }' },
    { nombre: 'el lote marcado en gris', de: '.pr-lp__tarjeta[aria-pressed="true"] { border-color: var(--p-acento); background: var(--p-acento-suave); }', a: '.pr-lp__tarjeta[aria-pressed="true"] { border-color: var(--p-linea); background: var(--p-caja); }' },
    { nombre: 'la masa elegida del historial en amarillo', de: '.pr-hm__masa[aria-pressed="true"] { border-color: var(--p-acento); background: var(--p-acento-suave); }', a: '.pr-hm__masa[aria-pressed="true"] { border-color: var(--p-masa-borde); background: var(--p-masa); }' },
    { nombre: 'el puesto elegido en gris de modo', de: '.pr-puesto-card[aria-pressed="true"] { border: 3px solid var(--p-acento); background: var(--p-acento-suave);', a: '.pr-puesto-card[aria-pressed="true"] { border: 3px solid var(--p-prod); background: var(--p-renglon);' },
    { nombre: 'la opción elegida en gris', de: '.pr-opcion[aria-pressed="true"] { border-color: var(--p-acento); background: var(--p-acento-suave); }', a: '.pr-opcion[aria-pressed="true"] { border-color: var(--p-linea); background: var(--p-caja); }' },
    // El color del modo.
    { nombre: 'el botón al otro modo pierde el amarillo', de: '.pr-lat__otro--masa { background: var(--p-masa);', a: '.pr-lat__otro--masa { background: var(--p-acento);' },
    { nombre: 'la banda de Producción pierde su color', de: '.pr-banda-modo--produccion { background: var(--p-prod);', a: '.pr-banda-modo--produccion { background: var(--p-acento);' },
    { nombre: 'el color de Sala de masa pasa a ser el naranja', de: '      --p-masa: #F3D774;', a: '      --p-masa: #C2410C;' },
    // "Cerrar planilla" con su propio lugar.
    { nombre: 'Cerrar planilla deja de ser una sección de la barra', de: "      { id: 'cierre', texto: 'Cerrar planilla', corto: 'Cerrar', icono: 'cerrar', tono: 'tinta', deMaquina: true },\n", a: '' },
    { nombre: 'Cerrar planilla en bordó', de: "{ id: 'cierre', texto: 'Cerrar planilla', corto: 'Cerrar', icono: 'cerrar', tono: 'tinta',", a: "{ id: 'cierre', texto: 'Cerrar planilla', corto: 'Cerrar', icono: 'cerrar', tono: 'bordo'," },
    { nombre: 'Paradas pierde el bordó', de: "{ id: 'paradas', texto: 'Paradas', corto: 'Paradas', icono: 'paradas', tono: 'bordo',", a: "{ id: 'paradas', texto: 'Paradas', corto: 'Paradas', icono: 'paradas', tono: 'tinta'," },
    { nombre: 'vuelve el botón viejo de Cerrar planilla', de: '<div class="pr-segmento" id="pr-abrir-turnos"', a: '<button type="button" id="pr-btn-cerrar-planilla">Cerrar planilla</button><div class="pr-segmento" id="pr-abrir-turnos"' },
    // La cabecera.
    { nombre: 'la cabecera de la gestión repite el módulo', de: "textContent = estado.unidadId ? (estado.unidades.get(estado.unidadId) ?? '') : ''", a: "textContent = 'Producción · ' + (estado.unidadId ? (estado.unidades.get(estado.unidadId) ?? '') : '')" },
    { nombre: 'la cabecera de la gestión queda escondida', de: "document.getElementById('pr-header').hidden = false", a: "document.getElementById('pr-header').hidden = true" },
    { nombre: 'la cabecera dice Producción dos veces', de: '          <span class="pr-header__titulo">Producción</span>', a: '          <span class="pr-header__titulo">Producción · Producción</span>' },
    // Desde el diseño de la gestión (26/09/2026) la pantalla de inicio no tiene título propio.
    { nombre: 'la oficina vuelve a titular "Producción"', de: '      <section id="pr-inicio">\n', a: '      <section id="pr-inicio">\n        <h1 class="pr-titulo">Producción</h1>\n' },
    // La planta llena la tablet sin scroll.
    { nombre: 'la página vuelve a scrollear', de: '      -webkit-font-smoothing: antialiased;\n      overflow: hidden;', a: '      -webkit-font-smoothing: antialiased;\n      overflow: auto;' },
    { nombre: 'la app pierde el 100dvh', de: '.pr-app { height: 100dvh; display: flex;', a: '.pr-app { min-height: 100vh; display: flex;' },
    { nombre: 'el tablero pasa a auto-fill', de: 'grid-template-columns: repeat(6, minmax(0, 1fr)); grid-auto-rows: 1fr;', a: 'grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); grid-auto-rows: 1fr;' },
    { nombre: 'la tarjeta ignora --span-h', de: 'grid-column: span var(--span-h, 2);', a: 'grid-column: span 2;' },
    { nombre: 'spanTablero deja una fila a medias', de: '      const h = 6 / enFila\n', a: '      const h = 2\n' },
    // El contraste.
    { nombre: 'el naranja oscuro pierde el 4.5:1', de: '      --p-acento-osc: #8F2F08;', a: '      --p-acento-osc: #E08A5C;' },
    { nombre: 'la letra de Sala de masa pierde el 4.5:1', de: '      --p-masa-txt: #3B2E00;', a: '      --p-masa-txt: #B8961F;' },
    { nombre: 'la tinta del secundario pierde el 4.5:1', de: '      --p-tinta-2: #3D3831;', a: '      --p-tinta-2: #B8B0A4;' },
  ],
})
