// Mutaciones de test-materia-prima-baja.js. Ver mutar.js (mismos guards). De a una.
//
//   node pruebas/mut-materia-prima-baja.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-baja.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'materia-prima.html'),
  funciones: [],
  manuales: [
    { nombre: 'el mapa de nombres vuelve a filtrar activos',
      de: "        .from('v_empleados_publico')\n        .select('id, nombre')\n      if (error) { console.error(error); return }",
      a: "        .from('v_empleados_publico')\n        .select('id, nombre')\n        .eq('activo', true)\n      if (error) { console.error(error); return }" },
    { nombre: 'el detalle no escapa "Cargado por"',
      de: '${carga ? `<div class="comprobante-mp__edicion">${esc(carga)}</div>` : \'\'}',
      a: '${carga ? `<div class="comprobante-mp__edicion">${carga}</div>` : \'\'}' },
  ],
})
