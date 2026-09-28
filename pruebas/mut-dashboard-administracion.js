// Mutaciones de test-dashboard-administracion.js. Ver mutar.js.
//
//   node pruebas/mut-dashboard-administracion.js

const path = require('path')
// Reparte cada mutación entre dashboard.html y js/modulos.js: ver mutar-dashboard.js.
const { correrMutacionesDashboard } = require('./mutar-dashboard')

correrMutacionesDashboard({
  suite: path.join(__dirname, 'test-dashboard-administracion.js'),
  funciones: [],
  manuales: [
    { nombre: 'la burbuja de administración no va a su tarjeta', de: "      administracion: 'administracion',\n    }", a: '    }' },
    { nombre: 'la burbuja de administración va a otra tarjeta', de: "      administracion: 'administracion',\n    }", a: "      administracion: 'retiros',\n    }" },
    { nombre: 'otra url', de: "        url: 'modulos/administracion.html',", a: "        url: 'modulos/retiros.html'," },
    { nombre: 'sin el módulo requerido', de: "        requiereModulo: 'retiros',\n        requiereTareas: ['retiros:ver', 'retiros:precios'],", a: "        requiereTareas: ['retiros:ver', 'retiros:precios']," },
    { nombre: 'alcanza con cargar', de: "        requiereTareas: ['retiros:ver', 'retiros:precios'],", a: "        requiereTareas: ['retiros:ver', 'retiros:precios', 'retiros:cargar']," },
    { nombre: 'precios no alcanza', de: "        requiereTareas: ['retiros:ver', 'retiros:precios'],", a: "        requiereTareas: ['retiros:ver']," },
    { nombre: 'las cobranzas por controlar no suman en Administración', de: "      'cobranzas:por_controlar': ['administracion'],", a: "      'cobranzas:por_controlar': []," },
    { nombre: 'los cheques por vencer también suman en Administración', de: "      'cobranzas:por_controlar': ['administracion'],", a: "      'cobranzas:por_controlar': ['administracion'],\n      'cheques:por_vencer': ['administracion']," },
    { nombre: 'la cobranza pasa a Administración y deja la suya', de: "        for (const c of [clave, ...(TAMBIEN_EN_TARJETA", a: "        for (const c of [...(TAMBIEN_EN_TARJETA" },
    { nombre: 'próximamente', de: "        url: 'modulos/administracion.html',\n        proximamente: false,", a: "        url: 'modulos/administracion.html',\n        proximamente: true," },
  ],
})
