// Mutaciones de test-administracion-revisar-reposicion.js (la reposición en
// Retiros por revisar, 24/10/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-revisar-reposicion.js
//
// UN RUNNER POR VEZ.
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-revisar-reposicion.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  escape: 'esc',
  funciones: ['htmlFilaRevisar'],
  manuales: [
    // El ayudante
    { nombre: 'todo es reposición', de: "      return f?.tipo === 'reposicion'\n", a: '      return true\n' },
    { nombre: 'nada es reposición', de: "      return f?.tipo === 'reposicion'\n", a: '      return false\n' },
    { nombre: 'la devolución también', de: "      return f?.tipo === 'reposicion'\n", a: "      return f?.tipo === 'reposicion' || f?.tipo === 'devolucion'\n" },
    { nombre: 'cualquier tipo que no sea retiro', de: "      return f?.tipo === 'reposicion'\n", a: "      return !!f?.tipo && f.tipo !== 'retiro'\n" },
    { nombre: 'sin fila explota', de: "      return f?.tipo === 'reposicion'\n", a: "      return f.tipo === 'reposicion'\n" },
    { nombre: 'sin mayúsculas exactas', de: "      return f?.tipo === 'reposicion'\n", a: "      return /reposicion/i.test(f?.tipo ?? '')\n" },
    // La tarjeta
    { nombre: 'la tarjeta no lo dice', de: "${esReposicionRevisar(f) ? '<span class=\"ad-sello ad-sello--dev\">Reposición</span> ' : ''}${esc(f.que || '—')}", a: "${esc(f.que || '—')}" },
    { nombre: 'la tarjeta lo dice siempre', de: "${esReposicionRevisar(f) ? '<span class=\"ad-sello ad-sello--dev\">Reposición</span> ' : ''}", a: "${'<span class=\"ad-sello ad-sello--dev\">Reposición</span> '}" },
    { nombre: 'el sello reemplaza qué se llevó', de: "${esReposicionRevisar(f) ? '<span class=\"ad-sello ad-sello--dev\">Reposición</span> ' : ''}${esc(f.que || '—')}", a: "${esReposicionRevisar(f) ? '<span class=\"ad-sello ad-sello--dev\">Reposición</span> ' : esc(f.que || '—')}" },
    { nombre: 'el sello sin su clase', de: "'<span class=\"ad-sello ad-sello--dev\">Reposición</span> '", a: "'<span>Reposición</span> '" },
    { nombre: 'el sello dice otra cosa', de: "'<span class=\"ad-sello ad-sello--dev\">Reposición</span> '", a: "'<span class=\"ad-sello ad-sello--dev\">Devolución</span> '" },
  ],
})
