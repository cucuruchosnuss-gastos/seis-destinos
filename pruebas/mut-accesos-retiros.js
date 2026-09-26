// Mutaciones de test-accesos-retiros.js. Ver mutar.js.
//
//   node pruebas/mut-accesos-retiros.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-accesos-retiros.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/accesos.html'),
  funciones: [],
  manuales: [
    { nombre: 'el grupo cuelga de pedidos', de: "        modulos: ['retiros'],", a: "        modulos: ['pedidos'],\n        // x" },
    { nombre: 'cargar sin alcance', de: "label: 'Cargar órdenes de retiro en el depósito (sin precios)', conAlcance: true,", a: "label: 'Cargar órdenes de retiro en el depósito (sin precios)'," },
    { nombre: 'precios con otra clave', de: "{ modulo: 'retiros', tarea: 'precios',", a: "{ modulo: 'retiros', tarea: 'precio'," },
    { nombre: 'anular pide ver', de: "label: 'Anular órdenes de retiro', conAlcance: true,", a: "label: 'Anular órdenes de retiro', conAlcance: true, requiere: ['retiros:ver']," },
    { nombre: 'cargar pierde el "sin precios"', de: "label: 'Cargar órdenes de retiro en el depósito (sin precios)'", a: "label: 'Cargar órdenes de retiro en el depósito'" },
    { nombre: 'se va la tarea ver', de: "          { modulo: 'retiros', tarea: 'ver',", a: "          { modulo: 'retiros_x', tarea: 'ver'," },
  ],
})
