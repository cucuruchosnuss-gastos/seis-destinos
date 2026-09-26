// Mutaciones de test-materia-prima-fabrica-pruebas.js. Ver mutar.js.
// Cada una saca UNA llamada al filtro (o su cableado en init) y la suite tiene
// que ponerse en rojo.
//
//   node pruebas/mut-materia-prima-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: [],
  manuales: [
    { nombre: 'unidadesParaElegir no filtra', de: '      return sinUnidadesDePrueba(estado.unidades, estado.fabrica)', a: '      return estado.unidades' },
    { nombre: 'los chips usan estado.unidades', de: "const chips = [{ id: '', nombre: 'Todas' }, ...unidadesParaElegir()]", a: "const chips = [{ id: '', nombre: 'Todas' }, ...estado.unidades]" },
    { nombre: 'el selector del wizard usa estado.unidades', de: '        unidadesParaElegir().map(u => `<option value="${esc(u.id)}">', a: '        estado.unidades.map(u => `<option value="${esc(u.id)}">' },
    { nombre: 'la preselección cuenta estado.unidades', de: '      const elegibles = unidadesParaElegir()\n      if (elegibles.length === 1)', a: '      const elegibles = estado.unidades\n      if (elegibles.length === 1)' },
    { nombre: 'stock visibles sin filtrar', de: '      estado.unidadesStockVisibles = sinUnidadesDePrueba(data ?? [], estado.fabrica)', a: '      estado.unidadesStockVisibles = data ?? []' },
    { nombre: 'recepción sin filtrar', de: '      estado.unidadesRecepcion = sinUnidadesDePrueba(data ?? [], estado.fabrica)', a: '      estado.unidadesRecepcion = data ?? []' },
    { nombre: 'el aviso del pie no saca la unidad de prueba', de: "const faltantes = sinUnidadesDePrueba([...new Set(estado.listaIngresos.map(i => i.unidad_negocio_id))], estado.fabrica, id => id)", a: "const faltantes = [...new Set(estado.listaIngresos.map(i => i.unidad_negocio_id))]" },
    { nombre: 'nombreUnidad filtra (no debe)', de: '      return estado.unidades.find(u => u.id === id)?.nombre', a: '      return unidadesParaElegir().find(u => u.id === id)?.nombre' },
    { nombre: 'init no asigna la fábrica', de: '      estado.fabrica = await fabricaPrometida\n', a: '      await fabricaPrometida\n' },
    { nombre: 'init asigna la fábrica después de los chips', de: '      estado.fabrica = await fabricaPrometida\n\n      renderizarChipsUnidadIngresos()', a: '\n      renderizarChipsUnidadIngresos()\n      estado.fabrica = await fabricaPrometida' },
    { nombre: 'init no pide la fábrica', de: '      const fabricaPrometida = cargarFabricaDePruebas(supabase)', a: '      const fabricaPrometida = Promise.resolve(FABRICA_SIN_DATOS)' },
  ],
})
