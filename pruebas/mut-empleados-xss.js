// Mutaciones de test-empleados-xss.js. Ver mutar.js.
//
//   node pruebas/mut-empleados-xss.js
//
// AUTOMÁTICAS: cada `${esc(...)}` de las funciones de render pierde su esc()
// (también la del <select> de la importación, que se dibuja en init()).
//
// A MANO: esc() mismo (deja de escapar la comilla o el &), la cabecera de la
// ficha que pasa de textContent a innerHTML, el color del avatar que deja de
// salir de la paleta, un dato de la base en el style del avatar y en un href
// (escapado, pero en un contexto donde escapar HTML no alcanza).

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-empleados-xss.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/empleados.html'),
  funciones: [
    'renderizarFilaEmpleado', 'renderizarListado', 'renderizarFormularioEdicion',
    'renderizarFormularioContacto', 'renderizarFicha', 'htmlPanelPin', 'init',
  ],
  manuales: [
    { nombre: 'esc() deja de escapar la comilla doble (rompe los value="..." y data-id)',
      de: ".replace(/\"/g, '&quot;')", a: '' },
    { nombre: 'esc() deja de escapar el &',
      de: ".replace(/&/g, '&amp;')", a: '' },
    { nombre: 'el nombre de la cabecera de la ficha pasa a innerHTML',
      de: "document.getElementById('ficha-nombre').textContent = emp.nombre",
      a: "document.getElementById('ficha-nombre').innerHTML = emp.nombre" },
    { nombre: 'el email de la cabecera de la ficha pasa a innerHTML',
      de: "document.getElementById('ficha-email').textContent = emp.email || '—'",
      a: "document.getElementById('ficha-email').innerHTML = emp.email || '—'" },
    { nombre: 'las iniciales de la cabecera de la ficha pasan a innerHTML',
      de: "document.getElementById('ficha-avatar').textContent = iniciales(emp.nombre)",
      a: "document.getElementById('ficha-avatar').innerHTML = iniciales(emp.nombre)" },
    { nombre: 'colorAvatar() devuelve el texto en vez de un color de la paleta',
      de: 'return PALETA_AVATAR[Math.abs(hash) % PALETA_AVATAR.length]', a: 'return texto' },
    { nombre: 'el style del avatar recibe el nombre (escapado, pero en un style)',
      de: 'style="background:${colorAvatar(emp.nombre)};"', a: 'style="background:${esc(emp.nombre)};"' },
    { nombre: 'el enlace a Accesos pasa a un dato de la base (escapado, pero en un href)',
      de: '<a href="accesos.html" class="btn btn--secundario">', a: '<a href="${esc(emp.email)}" class="btn btn--secundario">' },
    { nombre: 'el chip de módulo deja de escapar el fallback (módulo desconocido)',
      de: 'esc(info ? info.label : m)', a: '(info ? esc(info.label) : m)' },
  ],
})
