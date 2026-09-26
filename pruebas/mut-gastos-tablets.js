// Mutaciones de test-gastos-tablets.js. Ver mutar.js.
//
//   node pruebas/mut-gastos-tablets.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-tablets.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: [],
  manuales: [
    { nombre: 'esCuentaDeTablet no reconoce ninguna tablet',
      de: "return e?.tipo === 'sistema'", a: 'return false' },
    { nombre: 'esCuentaDeTablet descarta también los tipo null',
      de: "return e?.tipo === 'sistema'", a: "return e?.tipo !== 'naaloo' && e?.tipo !== 'admin' && e?.tipo !== 'empresa'" },
    { nombre: 'esCuentaDeTablet se come a la Empresa',
      de: "return e?.tipo === 'sistema'", a: "return e?.tipo === 'sistema' || e?.tipo === 'empresa'" },
    { nombre: 'personasElegibles no filtra',
      de: 'return (estado.maestros.empleados ?? []).filter(e => !esCuentaDeTablet(e))', a: 'return (estado.maestros.empleados ?? [])' },
    { nombre: 'el selector del wizard vuelve a la lista cruda',
      de: '      const todos   = personasElegibles()', a: '      const todos   = estado.maestros.empleados' },
    { nombre: 'el selector de la edición vuelve a la lista cruda',
      de: '${personasParaEditar(g).map(e =>', a: '${estado.maestros.empleados.map(e =>' },
    { nombre: 'la edición pierde la persona del gasto si es tablet',
      de: '      if (actual && !lista.some(e => e.id === actual.id)) lista.push(actual)\n', a: '' },
    { nombre: 'la edición ofrece TODAS las tablets',
      de: '      const lista = personasElegibles()\n', a: '      const lista = [...estado.maestros.empleados]\n' },
    { nombre: 'la edición ignora empleado_id sin embed',
      de: 'const idActual = g?.empleados?.id ?? g?.empleado_id', a: 'const idActual = g?.empleados?.id' },
    { nombre: 'la carga inicial deja de traer tipo',
      de: ".select('id, nombre, tipo').eq('activo', true)", a: ".select('id, nombre').eq('activo', true)" },
    { nombre: 'cargarMaestros deja de traer tipo',
      de: ".select('id, nombre, unidad_negocio_id, tipo').eq('activo', true)", a: ".select('id, nombre, unidad_negocio_id').eq('activo', true)" },
    { nombre: 'la tablet se filtra en SQL con .neq (descarta los tipo null)',
      de: ".select('id, nombre, tipo').eq('activo', true)", a: ".select('id, nombre, tipo').neq('tipo', 'sistema').eq('activo', true)" },
  ],
})
