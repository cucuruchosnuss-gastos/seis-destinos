// Mutaciones de test-dashboard-retiros.js. Ver mutar.js.
//
//   node pruebas/mut-dashboard-retiros.js

const path = require('path')
// Reparte cada mutación entre dashboard.html y js/modulos.js: ver mutar-dashboard.js.
const { correrMutacionesDashboard } = require('./mutar-dashboard')

correrMutacionesDashboard({
  suite: path.join(__dirname, 'test-dashboard-retiros.js'),
  funciones: [],
  manuales: [
    { nombre: 'otra clave', de: "        clave: 'retiros',", a: "        clave: 'retiro'," },
    { nombre: 'otra url', de: "        url: 'modulos/retiros.html',", a: "        url: 'modulos/otra.html'," },
    { nombre: 'no pide la tarea de cargar', de: "        requiereTareas: ['retiros:cargar'],\n", a: '' },
    { nombre: 'alcanza con ver', de: "        requiereTareas: ['retiros:cargar'],", a: "        requiereTareas: ['retiros:cargar', 'retiros:ver']," },
    { nombre: 'próximamente', de: "        url: 'modulos/retiros.html',\n        proximamente: false,", a: "        url: 'modulos/retiros.html',\n        proximamente: true," },
  ],
})
