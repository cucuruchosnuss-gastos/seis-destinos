// Mutaciones de test-administracion-lista-interna.js (la lista interna en
// Administración → Listas de precios, 30/09/2026). Ver mutar.js (los tres
// guards). Muta modulos/administracion.html, fuera de la región de Cheques.
//
//   node pruebas/mut-administracion-lista-interna.js
'use strict'
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-lista-interna.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: [],
  manuales: [
    { nombre: 'la lectura de las listas no trae es_interna',
      de: "select('id, nombre, moneda, activa, es_interna, es_base, base_id, recargo_pct')", a: "select('id, nombre, moneda, activa, es_base, base_id, recargo_pct')" },
    { nombre: 'la fila no dice "Interna"',
      de: "        `${l.es_interna === true ? '<span class=\"ad-sello ad-sello--interna\">Interna</span>' : ''}` +\n", a: '' },
    { nombre: 'es_interna "true" (texto) cuenta en la fila',
      de: "${l.es_interna === true ? '<span", a: "${l.es_interna ? '<span" },
    { nombre: 'el tilde no refleja la lista',
      de: '      chk.checked = meta?.es_interna === true\n', a: '' },
    { nombre: 'el tilde queda habilitado',
      de: '      chk.disabled = !PUEDE_MARCAR_INTERNA\n', a: '' },
    { nombre: 'se dice que se puede marcar',
      de: 'const PUEDE_MARCAR_INTERNA = false', a: 'const PUEDE_MARCAR_INTERNA = true' },
    { nombre: 'la nota no dice que es la interna',
      de: '      const frase = meta?.es_interna === true', a: '      const frase = false' },
    { nombre: 'la nota no dice que no se puede cambiar',
      de: "frase + ' Todavía no se puede cambiar desde acá: la base no tiene cómo guardarlo.'", a: 'frase' },
    { nombre: 'pintarLista no pinta la lista interna',
      de: '      pintarListaInterna(meta)\n', a: '' },
    { nombre: 'el nombre de la lista sin escapar en la fila',
      de: '<span class="ad-renglon__desc">${esc(l.nombre)}</span>` +\n        `${l.es_interna', a: '<span class="ad-renglon__desc">${l.nombre}</span>` +\n        `${l.es_interna' },
  ],
})
