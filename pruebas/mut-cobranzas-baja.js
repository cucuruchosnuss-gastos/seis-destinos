// Mutaciones de test-cobranzas-baja.js. Ver mutar.js (mismos guards). De a una.
//
//   node pruebas/mut-cobranzas-baja.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-baja.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'cobranzas.html'),
  funciones: ['pintarRepartidores'],
  manuales: [
    { nombre: 'el filtro ofrece a los dados de baja',
      de: '        .filter(r => r?.activo !== false || (antes && r.id === antes))\n', a: '\n' },
    { nombre: 'el filtro no conserva al dado de baja ya elegido',
      de: '.filter(r => r?.activo !== false || (antes && r.id === antes))', a: '.filter(r => r?.activo !== false)' },
    { nombre: 'el filtro saca también a los que no traen activo',
      de: '.filter(r => r?.activo !== false || (antes && r.id === antes))', a: '.filter(r => r?.activo === true || (antes && r.id === antes))' },
    { nombre: 'la consulta no trae activo',
      de: ".select('id, nombre, unidad_negocio_id, activo')\n          .eq('tiene_acceso', true)", a: ".select('id, nombre, unidad_negocio_id')\n          .eq('tiene_acceso', true)" },
    { nombre: 'la consulta filtra activo',
      de: "          .eq('tiene_acceso', true)\n          .order('nombre')\n        if (error) throw error\n        estado.repartidores",
      a: "          .eq('tiene_acceso', true)\n          .eq('activo', true)\n          .order('nombre')\n        if (error) throw error\n        estado.repartidores" },
  ],
})
