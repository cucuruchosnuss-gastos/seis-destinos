// Mutaciones de test-pedidos-fabrica-pruebas.js. Ver mutar.js.
//
//   node pruebas/mut-pedidos-fabrica-pruebas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html y
// dan "ESCAPÓ" falsos.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pedidos-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/pedidos.html'),
  funciones: [],
  manuales: [
    { nombre: 'unidadesDelModulo sin el filtro', de: '      return sinUnidadesDePrueba(ids, estado.fabrica, id => id)', a: '      return ids' },
    { nombre: 'el filtro con la clave de una fila (no de un id)', de: 'sinUnidadesDePrueba(ids, estado.fabrica, id => id)', a: 'sinUnidadesDePrueba(ids, estado.fabrica)' },
    { nombre: 'init no guarda la fábrica', de: '        estado.fabrica = f\n', a: '' },
    { nombre: 'init no lee la fábrica', de: '      const fabrica = cargarFabricaDePruebas(supabase)', a: '      const fabrica = Promise.resolve(FABRICA_SIN_DATOS)' },
    { nombre: 'la fábrica después de los permisos, no en paralelo', de: '        const [, f] = await Promise.all([cargarPermisos(), fabrica])', a: '        await cargarPermisos(); const f = await fabrica' },
  ],
})
