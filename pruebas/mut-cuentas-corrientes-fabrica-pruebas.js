// Mutaciones de test-cuentas-corrientes-fabrica-pruebas.js. Ver mutar.js (los
// tres guards: suite verde sobre el limpio, ancla única, mutación que cambia
// algo). De a una, cada una saca un filtro de la fábrica de pruebas o su carga.
//
//   node pruebas/mut-cuentas-corrientes-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
  funciones: [],
  manuales: [
    { nombre: 'unidadesParaElegir deja de filtrar',
      de: '      return sinUnidadesDePrueba(lista ?? [], estado.fabrica)', a: '      return lista ?? []' },
    { nombre: 'unidadesParaElegir ignora la fábrica cargada',
      de: '      return sinUnidadesDePrueba(lista ?? [], estado.fabrica)', a: '      return sinUnidadesDePrueba(lista ?? [], FABRICA_SIN_DATOS)' },
    { nombre: 'los filtros de la pantalla principal usan la lista maestra',
      de: '      const unidades = unidadesParaElegir(estado.maestros.unidades)', a: '      const unidades = estado.maestros.unidades' },
    { nombre: 'unidadesDeFicha deja de filtrar',
      de: '      return unidadesParaElegir((ids ?? [])', a: '      return ((ids ?? [])' },
    { nombre: 'abrirFicha arma las unidades sin unidadesDeFicha',
      de: '      estado.ficha.unidades = unidadesDeFicha(ids)',
      a: '      estado.ficha.unidades = ids.map(id => estado.maestros.unidades.find(u => u.id === id)).filter(Boolean)' },
    { nombre: 'init no carga la fábrica',
      de: '        cargarFabricaDePruebas(supabase),\n', a: '        Promise.resolve(null),\n' },
    { nombre: 'init no guarda la fábrica',
      de: '      estado.fabrica = fabrica ?? FABRICA_SIN_DATOS', a: '      estado.fabrica = FABRICA_SIN_DATOS' },
    { nombre: 'init vuelve a poblar los filtros con la lista maestra',
      de: '      poblarFiltrosUnidad()\n\n',
      a: "      poblarSelect('filtro-unidad-proveedores', estado.maestros.unidades, u => ({ value: u.id, label: u.nombre }), 'Todas las unidades')\n\n" },
    { nombre: 'maestros.unidades se filtra (rompe nombreUnidad)',
      de: '      estado.maestros.unidades = unids.data ?? []', a: '      estado.maestros.unidades = sinUnidadesDePrueba(unids.data ?? [], fabrica)' },
    { nombre: 'nombreUnidad busca en la lista filtrada',
      de: "      return estado.maestros.unidades.find(u => u.id === id)?.nombre || '—'",
      a: "      return unidadesParaElegir(estado.maestros.unidades).find(u => u.id === id)?.nombre || '—'" },
    { nombre: 'estado.fabrica arranca en null',
      de: '      fabrica: FABRICA_SIN_DATOS,\n', a: '      fabrica: null,\n' },
  ],
})
