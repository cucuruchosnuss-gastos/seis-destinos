// Mutaciones de test-gastos-baja.js. Ver mutar.js (mismos guards). De a una.
//
//   node pruebas/mut-gastos-baja.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-baja.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'gastos.html'),
  funciones: [],
  manuales: [
    { nombre: 'las elegibles no sacan a los dados de baja',
      de: '        .filter(e => e?.activo !== false)\n    }', a: '\n    }' },
    { nombre: 'las elegibles sacan también a los que no traen activo',
      de: '        .filter(e => e?.activo !== false)\n    }', a: '        .filter(e => e?.activo === true)\n    }' },
    { nombre: 'la edición no conserva a la persona del gasto',
      de: '      if (actual && !lista.some(e => e.id === actual.id)) lista.push(actual)\n', a: '' },
    { nombre: 'la carga inicial vuelve a filtrar activos',
      de: ".select('id, nombre, tipo, activo').order('nombre')", a: ".select('id, nombre, tipo, activo').eq('activo', true).order('nombre')" },
    { nombre: 'cargarMaestros vuelve a filtrar activos',
      de: ".select('id, nombre, unidad_negocio_id, tipo, activo').order('nombre')", a: ".select('id, nombre, unidad_negocio_id, tipo, activo').eq('activo', true).order('nombre')" },
    { nombre: 'la carga inicial no trae activo',
      de: ".select('id, nombre, tipo, activo').order('nombre')", a: ".select('id, nombre, tipo').order('nombre')" },
    { nombre: 'cargarMaestros no trae activo',
      de: ".select('id, nombre, unidad_negocio_id, tipo, activo').order('nombre')", a: ".select('id, nombre, unidad_negocio_id, tipo').order('nombre')" },
  ],
})
