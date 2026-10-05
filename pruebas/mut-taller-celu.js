// Mutaciones de Proyectos Taller en el celular (ver test-taller-celu.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-taller-celu.js'),
  original: path.join(__dirname, '..', 'modulos', 'taller.html'),
  funciones: [],
  manuales: [
    { nombre: 'el botón vuelve a ser solo de la compu', de: 'class="tl-btn tl-btn--primario" id="tl-btn-nuevo" hidden', a: 'class="tl-btn tl-btn--primario tl-solo-compu" id="tl-btn-nuevo" hidden' },
    { nombre: 'el botón se ve sin gestionar', de: "document.getElementById('tl-btn-nuevo').hidden = !puedeGestionar()", a: "document.getElementById('tl-btn-nuevo').hidden = false" },
    { nombre: 'el botón no se ve nunca', de: "document.getElementById('tl-btn-nuevo').hidden = !puedeGestionar()", a: "document.getElementById('tl-btn-nuevo').hidden = true" },
    { nombre: 'el valor de la hora vuelve a ser solo de la compu', de: '`<button type="button" class="tl-btn" id="tl-btn-valor-hora">', a: '`<button type="button" class="tl-btn tl-solo-compu" id="tl-btn-valor-hora">' },
    { nombre: 'en el celular el botón no va primero', de: '#tl-btn-nuevo { order: -1; flex: 1 0 100%;', a: '#tl-btn-nuevo { order: 0; flex: 1 0 100%;' },
    { nombre: 'en el celular el botón queda chico', de: 'flex: 1 0 100%; height: 48px;', a: 'flex: 1 0 100%; height: 36px;' },
    { nombre: 'los campos con letra chica (zoom)', de: '#tl-vista-editor .tl-campo select { font-size: 16px;', a: '#tl-vista-editor .tl-campo select { font-size: 14.5px;' },
    { nombre: 'la barra de abajo tapa el formulario con el teclado', de: ':focus) .barra-abajo { display: none !important; }', a: ':focus) .barra-abajo { display: flex !important; }' },
    { nombre: 'los campos de a dos no pasan a una columna', de: '#tl-vista-editor .tl-fila-campos { grid-template-columns: minmax(0, 1fr); }', a: '#tl-vista-editor .tl-fila-campos { grid-template-columns: 1fr 1fr; }' },
    { nombre: '"¿Para quién es?" se corta', de: '.tl-seg-editor .tl-seg__op { flex: 1 1 0; min-height: 44px; white-space: normal;', a: '.tl-seg-editor .tl-seg__op { flex: 1 1 0; min-height: 44px; white-space: nowrap;' },
    { nombre: 'la ficha del celular sin "Editar"', de: "(ctx.gestionar ? '<button type=\"button\" class=\"tl-btn\" data-accion=\"editar\">Editar el proyecto</button>' : '')", a: "''" },
    { nombre: 'la ficha del celular ofrece editar sin gestionar', de: "(ctx.gestionar ? '<button type=\"button\" class=\"tl-btn\" data-accion=\"editar\">Editar el proyecto</button>' : '')", a: "'<button type=\"button\" class=\"tl-btn\" data-accion=\"editar\">Editar el proyecto</button>'" },
    { nombre: 'el diagrama de la compu pasa al celular', de: '<div class="tl-diag-compu tl-solo-compu">', a: '<div class="tl-diag-compu">' },
  ],
})
