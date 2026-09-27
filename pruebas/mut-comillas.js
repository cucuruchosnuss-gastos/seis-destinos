// Mutaciones de test-comillas.js (27/09/2026): el chequeo de comillas que no
// cierran en su línea tiene que atrapar un caso roto y no marcar lo sano.
//
//   node pruebas/mut-comillas.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-comillas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, 'comillas.js'),
  funciones: [],
  manuales: [
    { nombre: 'el salto de línea no corta el string', de: "        if (e === '\\n') break;\n        j++;\n      }\n      if (!cerrado) {", a: "        j++;\n      }\n      if (!cerrado) {" },
    { nombre: 'un string sin cerrar no se reporta', de: "        errores.push({ linea: lineaDe(ini), texto: codigo.slice(ini, fin === -1 ? n : fin).slice(0, 80) });", a: '' },
    { nombre: 'la barra no escapa', de: "        if (e === '\\\\') { j += 2; continue; }        // incluye la barra de continuación", a: '' },
    { nombre: 'sin comentarios de línea', de: "    if (c === '/' && d === '/') { const f = codigo.indexOf('\\n', i); i = f === -1 ? n : f; continue; }", a: '' },
    { nombre: 'sin templates', de: "    if (c === '`') { pila.push('template'); i++; continue; }", a: '' },
    { nombre: 'sin ${ } en los templates', de: "      if (c === '$' && d === '{') { pila.push({ llaves: 0 }); ultimo = '{'; palabra = ''; i += 2; continue; }", a: '' },
    { nombre: 'sin regex', de: "      if (ANTES_DE_REGEX.has(ultimo) || PALABRAS_ANTES_DE_REGEX.has(palabra)) {", a: '      if (false) {' },
    { nombre: 'return no precede a un regex', de: "const PALABRAS_ANTES_DE_REGEX = new Set(['return', ", a: "const PALABRAS_ANTES_DE_REGEX = new Set([" },
    { nombre: 'la línea es la del bloque y no la del archivo', de: "      for (const e of comillasSinCerrar(b.codigo)) salida.push({ linea: base + e.linea, texto: e.texto });", a: "      for (const e of comillasSinCerrar(b.codigo)) salida.push({ linea: e.linea, texto: e.texto });" },
    { nombre: 'se revisan los <script> de JSON', de: "    if (!tipo || /^(module|text\\/javascript|application\\/javascript)$/i.test(tipo)) {", a: '    if (true) {' },
    { nombre: 'los .js no se revisan', de: "  if (/\\.(c|m)?js$/i.test(nombre)) return comillasSinCerrar(contenido);", a: '' },
    { nombre: 'la línea es 0-based', de: "  const lineaDe = (off) => codigo.slice(0, off).split('\\n').length;", a: "  const lineaDe = (off) => codigo.slice(0, off).split('\\n').length - 1;" },
  ],
})
