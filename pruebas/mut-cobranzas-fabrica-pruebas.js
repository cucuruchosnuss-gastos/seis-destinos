// Mutaciones de test-cobranzas-fabrica-pruebas.js. Ver mutar.js (los tres
// guards: suite verde sobre el limpio, texto a reemplazar ÚNICO, y que la
// mutación cambie algo). De a una.
//
//   node pruebas/mut-cobranzas-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── Cada llamada al filtro ─────────────────────────────────────────────
    { nombre: 'el diálogo de la unidad sin el filtro de la fábrica',
      de: 'return sinUnidadesDePrueba(activas, fabrica, u => (u?.id === actual ? null : u?.id))', a: 'return activas' },
    { nombre: 'el selector de repartidores sin el filtro de la fábrica',
      de: 'const visibles = sinPersonasDePrueba(estado.repartidores, estado.fabrica)', a: 'const visibles = estado.repartidores' },
    // ── Cómo se aplica ─────────────────────────────────────────────────────
    { nombre: 'el filtro de unidades no conserva la actual',
      de: 'u => (u?.id === actual ? null : u?.id))', a: 'u => u?.id)' },
    { nombre: 'el diálogo no espera la fábrica (le pasa FABRICA_SIN_DATOS)',
      de: 'const opciones = unidadesParaElegir(unidades, actual, fabrica)', a: 'const opciones = unidadesParaElegir(unidades, actual, FABRICA_SIN_DATOS)' },
    { nombre: 'la fábrica no queda en el estado',
      de: '          estado.fabrica = f ?? FABRICA_SIN_DATOS\n', a: '' },
    { nombre: 'al llegar la fábrica no se repintan los repartidores',
      de: '          pintarRepartidores()\n          return estado.fabrica', a: '          return estado.fabrica' },
    { nombre: 'al repintar no se conserva el repartidor elegido',
      de: 'if (antes && visibles.some(r => r.id === antes)) sel.value = antes', a: 'if (false) sel.value = antes' },
    { nombre: 'pintarRepartidores dibuja aunque no haya ver_todo',
      de: 'if (!puedeVerTodo() || !estado.repartidores.length) return', a: 'if (!estado.repartidores.length) return' },
    { nombre: 'el init no lanza la fábrica',
      de: '      asegurarFabrica()\n      asegurarUnidades().then(() => {', a: '      asegurarUnidades().then(() => {' },
    { nombre: 'el init espera la fábrica (frena el arranque)',
      de: '      asegurarFabrica()\n      asegurarUnidades().then(() => {', a: '      await asegurarFabrica()\n      asegurarUnidades().then(() => {' },
  ],
})
