// Mutaciones de test-gastos-fabrica-pruebas.js: cada una saca UNA llamada al
// filtro de la fábrica de pruebas (o su carga) y la suite tiene que ponerse en
// rojo. Anclas únicas; mutar.js aborta si alguna no lo es. Ver mutar.js.
//
//   node pruebas/mut-gastos-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: [],
  manuales: [
    { nombre: 'personasElegibles deja de filtrar la fábrica (queda solo el filtro de tablet)',
      de: 'return sinPersonasDePrueba(personasNoTablet(), estado.fabrica)', a: 'return personasNoTablet()' },
    { nombre: 'unidadesElegibles deja de filtrar la fábrica',
      de: 'return sinUnidadesDePrueba(estado.maestros.unidades ?? [], estado.fabrica)', a: 'return estado.maestros.unidades ?? []' },
    { nombre: 'los filtros de la lista vuelven a las unidades crudas',
      de: 'renderizarFiltros(unidadesElegibles())', a: 'renderizarFiltros(estado.maestros.unidades)' },
    { nombre: 'la grilla de destino vuelve a las unidades crudas',
      de: 'const empresasHtml = unidadesElegibles().map(u =>', a: 'const empresasHtml = estado.maestros.unidades.map(u =>' },
    { nombre: 'la edición del gasto vuelve a las unidades crudas',
      de: '${unidadesParaEditar(g.unidades_negocio?.id).map(', a: '${estado.maestros.unidades.map(' },
    { nombre: 'la edición de la factura vuelve a las unidades crudas',
      de: '${unidadesParaEditar(f.unidades_negocio?.id).map(', a: '${estado.maestros.unidades.map(' },
    { nombre: 'unidadesParaEditar no conserva la unidad del registro',
      de: 'if (actual) return [...lista, actual]', a: 'if (actual) return lista' },
    { nombre: 'unidadesParaEditar parte de la lista cruda',
      de: '      const lista = unidadesElegibles()\n', a: '      const lista = [...estado.maestros.unidades]\n' },
    { nombre: 'personasParaEditar parte de la lista sin filtro de fábrica',
      de: '      const lista = personasElegibles()\n', a: '      const lista = personasNoTablet()\n' },
    { nombre: 'personasParaEditar pierde la persona del registro',
      de: '      if (actual && !lista.some(e => e.id === actual.id)) lista.push(actual)\n', a: '' },
    { nombre: 'el selector del wizard saltea el filtro de fábrica',
      de: '      const todos   = personasElegibles()', a: '      const todos   = personasNoTablet()' },
    { nombre: 'la fábrica se carga pero nunca se guarda en el estado',
      de: '    estado.fabrica = await promesaFabrica\n', a: '    await promesaFabrica\n' },
    { nombre: 'la fábrica no se carga',
      de: '    const promesaFabrica = cargarFabricaDePruebas(supabase)\n', a: '    const promesaFabrica = Promise.resolve(FABRICA_SIN_DATOS)\n' },
  ],
})
