// Mutaciones de test-produccion-conos-color.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-produccion-conos-color.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-conos-color.js'),
  original: path.join(__dirname, '..', 'modulos', 'produccion.html'),
  funciones: [],
  manuales: [
    { nombre: 'vuelve la lavanda', de: "{ nombre: 'ciruela',  bg: 'oklch(0.85 0.07 330)',  fg: 'oklch(0.36 0.12 330)', bd: 'oklch(0.73 0.1 330)' },", a: "{ nombre: 'ciruela',  bg: 'oklch(0.85 0.07 290)',  fg: 'oklch(0.36 0.12 290)', bd: 'oklch(0.73 0.1 290)' }," },
    { nombre: 'un azul', de: "{ nombre: 'verde',    bg: 'oklch(0.89 0.08 155)',  fg: 'oklch(0.4 0.1 155)',   bd: 'oklch(0.77 0.1 155)' },", a: "{ nombre: 'verde',    bg: 'oklch(0.89 0.08 240)',  fg: 'oklch(0.4 0.1 240)',   bd: 'oklch(0.77 0.1 240)' }," },
    { nombre: 'dos colores casi iguales', de: "{ nombre: 'rosa',     bg: 'oklch(0.94 0.05 355)',", a: "{ nombre: 'rosa',     bg: 'oklch(0.87 0.08 22)'," },
    { nombre: 'letra que no se lee', de: "fg: 'oklch(0.46 0.1 90)',", a: "fg: 'oklch(0.75 0.1 90)'," },
    { nombre: 'siete colores', de: "      { nombre: 'marron',   bg: 'oklch(0.83 0.045 60)',  fg: 'oklch(0.34 0.06 55)',  bd: 'oklch(0.7 0.06 60)' },\n", a: '' },
    { nombre: 'el color por el nombre', de: "        const col = colorCono(m.id)\n", a: "        const col = colorCono(m.nombre)\n" },
    { nombre: 'la planilla no pasa el id', de: "htmlChipCono(d.marcaNombre ?? 'Común', it.marca_id)", a: "htmlChipCono(d.marcaNombre ?? 'Común')" },
    { nombre: 'el chip usa el nombre', de: "    function htmlChipCono(nombre, id) {\n      const col = colorCono(id)", a: "    function htmlChipCono(nombre, id) {\n      const col = colorCono(nombre)" },
    { nombre: 'el común toma un color de la paleta', de: "      if (id == null || id === '') return COLOR_CONO_COMUN\n", a: '' },
    { nombre: 'siempre el primero', de: '      return PALETA_CONO[indiceDeNombre(String(id), PALETA_CONO.length)]', a: '      return PALETA_CONO[0]' },
  ],
})
