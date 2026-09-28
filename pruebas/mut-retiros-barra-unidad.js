// Mutaciones de la barra de unidad en la Carga de retiros (ver test-retiros-barra-unidad.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-barra-unidad.js'),
  original: path.join(__dirname, '..', 'modulos', 'retiros.html'),
  funciones: [],
  manuales: [
    { nombre: 'la barra no preselecciona', de: '      if (deBarra) { aplicarEmpresa(deBarra.id); return }\n', a: '' },
    { nombre: 'acepta una empresa donde no carga', de: 'return elegida ? (lista.find(e => e.id === elegida) ?? null) : null', a: "return elegida ? { id: elegida } : null" },
    { nombre: 'una orden a medio cargar cambia de empresa', de: '|| formTieneDatos(estado.form)) return', a: ') return' },
    { nombre: 'la barra no se anota', de: '      estado.unidadBarra = elegida ?? null\n      const deBarra = empresaDeLaBarra()', a: '      const deBarra = empresaDeLaBarra()' },
    { nombre: 'cambiar la barra no mueve la orden vacía', de: "      if (estado.vista === 'rt-vista-empresa' || estado.vista === 'rt-vista-form') aplicarEmpresa(deBarra.id)", a: '' },
  ],
})
