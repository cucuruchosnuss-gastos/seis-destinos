// Mutaciones de test-permisos-pantallas-ingreso.js (M1, 11/10/2026). De a una.
//
//   node pruebas/mut-permisos-pantallas-ingreso.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-permisos-pantallas-ingreso.js'),
  original: path.join(__dirname, '..', 'modulos', 'materia-prima.html'),
  funciones: [],
  manuales: [
    { nombre: 'M1: el wizard ofrece todas las fábricas', de: '      return sinUnidadesDePrueba(estado.unidades, estado.fabrica).filter(u => puedeCargarEn(u.id))', a: '      return sinUnidadesDePrueba(estado.unidades, estado.fabrica)' },
    { nombre: 'M1: puedeCargarAlguna siempre', de: '      return unidadesParaElegir().length > 0', a: '      return true' },
    { nombre: 'M1: el botón siempre a la vista', de: "      document.getElementById('btn-abrir-wizard').hidden = !puedeCargarAlguna()", a: "      document.getElementById('btn-abrir-wizard').hidden = false" },
    { nombre: 'M1: el wizard se abre sin poder cargar', de: '      if (!puedeCargarAlguna()) {\n        mostrarError(', a: '      if (false) {\n        mostrarError(' },
    { nombre: 'M1: no dice por qué', de: "        mostrarError('Para cargar un ingreso hace falta el permiso de registrar ingresos de materia prima en alguna fábrica.')\n", a: '' },
    { nombre: 'M1: puedeCargarEn sin super_admin', de: "      if (!unidadId) return false\n      if (estado.miRolApp === 'super_admin') return true\n      const a = estado.alcances?.get('materia_prima:cargar')", a: "      if (!unidadId) return false\n      const a = estado.alcances?.get('materia_prima:cargar')" },
  ],
})
