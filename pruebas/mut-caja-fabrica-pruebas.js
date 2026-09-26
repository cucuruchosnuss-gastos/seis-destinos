// Mutaciones de test-caja-fabrica-pruebas.js: saca cada llamada al filtro de
// la fábrica de pruebas, de a una, y exige que la suite se ponga en rojo. Ver
// mutar.js (suite verde sobre el limpio, ancla única, la mutación cambia el
// archivo, el sub-proceso leyó el mutado).
//
//   node pruebas/mut-caja-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'caja.html'),
  funciones: [],
  manuales: [
    { nombre: 'personas (estado.empleados) sin el filtro de la fábrica',
      de: 'estado.empleados = sinPersonasDePrueba((data || []).filter(e => !esCuentaDeTablet(e)), estado.fabrica)',
      a: 'estado.empleados = (data || []).filter(e => !esCuentaDeTablet(e))' },
    { nombre: 'la contraparte sin el filtro de la fábrica',
      de: 'candidatos = sinPersonasDePrueba(candidatos.filter(c => !c.oculto_como_contraparte && !esCuentaDeTablet(c)), estado.fabrica)',
      a: 'candidatos = candidatos.filter(c => !c.oculto_como_contraparte && !esCuentaDeTablet(c))' },
    { nombre: 'los grupos por unidad del listado sin el filtro',
      de: 'sinUnidadesDePrueba(estado.maestros.unidadesNegocio, estado.fabrica).forEach(u => porUnidad.set(',
      a: 'estado.maestros.unidadesNegocio.forEach(u => porUnidad.set(' },
    { nombre: 'el selector de unidad de la cuenta nueva sin el filtro',
      de: 'sinUnidadesDePrueba(estado.maestros.unidadesNegocio, estado.fabrica).map(u => `<option',
      a: 'estado.maestros.unidadesNegocio.map(u => `<option' },
    { nombre: 'el init no espera la fábrica',
      de: 'cargarUnidadesNegocio(), promesaFabrica])',
      a: 'cargarUnidadesNegocio()])' },
    { nombre: 'el init no guarda la fábrica',
      de: '.then(f => { estado.fabrica = f })',
      a: '.then(f => {})' },
    { nombre: 'el estado arranca sin fábrica',
      de: '      fabrica:         FABRICA_SIN_DATOS,\n',
      a: '      fabrica:         null,\n' },
  ],
})
