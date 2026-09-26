// Mutaciones de test-dashboard-administracion.js. Ver mutar.js.
//
//   node pruebas/mut-dashboard-administracion.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-dashboard-administracion.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'dashboard.html'),
  funciones: [],
  manuales: [
    { nombre: 'la burbuja de administración no va a su tarjeta', de: "      administracion: 'administracion',\n    }", a: '    }' },
    { nombre: 'la burbuja de administración va a otra tarjeta', de: "      administracion: 'administracion',\n    }", a: "      administracion: 'retiros',\n    }" },
    { nombre: 'otra url', de: "        url: 'modulos/administracion.html',", a: "        url: 'modulos/retiros.html'," },
    { nombre: 'sin el módulo requerido', de: "        requiereModulo: 'retiros',\n        requiereTareas: ['retiros:ver', 'retiros:precios'],", a: "        requiereTareas: ['retiros:ver', 'retiros:precios']," },
    { nombre: 'alcanza con cargar', de: "        requiereTareas: ['retiros:ver', 'retiros:precios'],", a: "        requiereTareas: ['retiros:ver', 'retiros:precios', 'retiros:cargar']," },
    { nombre: 'precios no alcanza', de: "        requiereTareas: ['retiros:ver', 'retiros:precios'],", a: "        requiereTareas: ['retiros:ver']," },
    { nombre: 'próximamente', de: "        url: 'modulos/administracion.html',\n        proximamente: false,", a: "        url: 'modulos/administracion.html',\n        proximamente: true," },
  ],
})
