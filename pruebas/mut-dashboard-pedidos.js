// Mutaciones de test-dashboard-pedidos.js. Ver mutar.js.
//
//   node pruebas/mut-dashboard-pedidos.js

const path = require('path')
// Reparte cada mutación entre dashboard.html y js/modulos.js: ver mutar-dashboard.js.
const { correrMutacionesDashboard } = require('./mutar-dashboard')

correrMutacionesDashboard({
  suite: path.join(__dirname, 'test-dashboard-pedidos.js'),
  funciones: [],
  manuales: [
    { nombre: 'otra clave', de: "        clave: 'pedidos',", a: "        clave: 'pedido'," },
    { nombre: 'otra url', de: "        url: 'modulos/pedidos.html',", a: "        url: 'modulos/pedido.html'," },
    { nombre: 'azul en vez de naranja', de: "        descripcion: 'Pedidos de los clientes y su avance',\n        url: 'modulos/pedidos.html',\n        proximamente: false,\n        color: 'naranja'", a: "        descripcion: 'Pedidos de los clientes y su avance',\n        url: 'modulos/pedidos.html',\n        proximamente: false,\n        color: 'azul'" },
    { nombre: 'próximamente', de: "        url: 'modulos/pedidos.html',\n        proximamente: false,", a: "        url: 'modulos/pedidos.html',\n        proximamente: true," },
    { nombre: 'pide tareas', de: "        url: 'modulos/pedidos.html',\n        proximamente: false,\n        color: 'naranja'", a: "        url: 'modulos/pedidos.html',\n        proximamente: false,\n        requiereTareas: ['pedidos:cargar'],\n        color: 'naranja'" },
  ],
})
