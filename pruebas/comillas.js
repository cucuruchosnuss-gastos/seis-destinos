// Busca TEXTOS ENTRE COMILLAS QUE NO CIERRAN EN SU MISMA LÍNEA en código JS.
//
// Por qué existe (27/09/2026): un script de edición corrido por heredoc puede
// comerse una comilla o una barra, y el archivo queda con un 'texto que no
// cierra. En un .js eso es un SyntaxError que node --check ve, pero:
//   - en un <script> de un .html solo lo ve check-scripts (que corre después), y
//   - en un comentario o en un archivo que nadie parsea, no lo ve nadie.
// Este chequeo corre en check-bytes.js, el primero de todos, y nombra el
// archivo y la LÍNEA donde empieza el texto roto.
//
// Tokeniza (no pela con regex): distingue comentarios, strings, templates (con
// sus ${ } anidados) y regex. Un string con '…' o "…" que llega al fin de línea
// sin cerrar y sin barra de continuación (\ al final) es un error.
//
//   const { comillasSinCerrar } = require('./comillas')
//   comillasSinCerrar(codigo) → [{ linea, texto }]   (linea 1-based dentro de `codigo`)
'use strict';

// Después de estos caracteres, una "/" empieza un regex y no una división.
const ANTES_DE_REGEX = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const PALABRAS_ANTES_DE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);

function comillasSinCerrar(codigo) {
  const errores = [];
  const lineaDe = (off) => codigo.slice(0, off).split('\n').length;
  const n = codigo.length;
  // pila de contextos: 'template' o { expr: llaves } (el ${ } de un template)
  const pila = [];
  let i = 0;
  let ultimo = '';       // último carácter significativo del código
  let palabra = '';      // última palabra (para `return /re/`)

  while (i < n) {
    const tope = pila[pila.length - 1];
    const c = codigo[i];
    const d = codigo[i + 1];

    if (tope === 'template') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { pila.pop(); ultimo = 'x'; palabra = ''; i++; continue; }
      if (c === '$' && d === '{') { pila.push({ llaves: 0 }); ultimo = '{'; palabra = ''; i += 2; continue; }
      i++; continue;
    }

    // --- código ---
    if (c === '/' && d === '/') { const f = codigo.indexOf('\n', i); i = f === -1 ? n : f; continue; }
    if (c === '/' && d === '*') {
      const f = codigo.indexOf('*/', i + 2);
      if (f === -1) { errores.push({ linea: lineaDe(i), texto: 'comentario /* sin cerrar' }); return errores; }
      i = f + 2; continue;
    }
    if (c === '"' || c === "'") {
      const ini = i;
      let j = i + 1;
      let cerrado = false;
      while (j < n) {
        const e = codigo[j];
        if (e === '\\') { j += 2; continue; }        // incluye la barra de continuación
        if (e === c) { cerrado = true; break; }
        if (e === '\n') break;
        j++;
      }
      if (!cerrado) {
        const fin = codigo.indexOf('\n', ini);
        errores.push({ linea: lineaDe(ini), texto: codigo.slice(ini, fin === -1 ? n : fin).slice(0, 80) });
        i = j; ultimo = 'x'; palabra = '';
        continue;
      }
      i = j + 1; ultimo = 'x'; palabra = ''; continue;
    }
    if (c === '`') { pila.push('template'); i++; continue; }
    if (c === '/') {
      if (ANTES_DE_REGEX.has(ultimo) || PALABRAS_ANTES_DE_REGEX.has(palabra)) {
        let j = i + 1, clase = false, ok = false;
        while (j < n) {
          const e = codigo[j];
          if (e === '\\') { j += 2; continue; }
          if (e === '\n') break;
          if (e === '[') clase = true;
          else if (e === ']') clase = false;
          else if (e === '/' && !clase) { ok = true; break; }
          j++;
        }
        if (ok) {
          j++;
          while (j < n && /[a-z]/i.test(codigo[j])) j++;
          i = j; ultimo = 'x'; palabra = ''; continue;
        }
        // No cerró en la línea: no era un regex (o es un error que ve check-scripts).
      }
      ultimo = '/'; palabra = ''; i++; continue;
    }
    if (c === '{') { if (tope && tope.llaves !== undefined) tope.llaves++; ultimo = '{'; palabra = ''; i++; continue; }
    if (c === '}') {
      if (tope && tope.llaves !== undefined) {
        if (tope.llaves === 0) { pila.pop(); i++; continue; }   // vuelve al template
        tope.llaves--;
      }
      ultimo = '}'; palabra = ''; i++; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[\w$]/.test(codigo[j])) j++;
      palabra = codigo.slice(i, j);
      ultimo = 'x';
      i = j; continue;
    }
    if (!/\s/.test(c)) { ultimo = c; palabra = ''; }
    i++;
  }
  return errores;
}

// Bloques <script> de un HTML que son JavaScript (sin src, o de tipo módulo).
function scriptsJs(html) {
  const bloques = [];
  const re = /<script\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const ini = m.index + m[0].length;
    const fin = html.indexOf('</script>', ini);
    if (fin === -1) { bloques.push({ ini, codigo: '', roto: true }); break; }
    const tipo = (/type\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) || [])[1];
    if (!tipo || /^(module|text\/javascript|application\/javascript)$/i.test(tipo)) {
      bloques.push({ ini, codigo: html.slice(ini, fin) });
    }
    re.lastIndex = fin;
  }
  return bloques;
}

// Revisa un archivo por su contenido. Devuelve [{ linea, texto }] con la línea
// del ARCHIVO (no del bloque).
function revisarArchivo(nombre, contenido) {
  if (/\.(c|m)?js$/i.test(nombre)) return comillasSinCerrar(contenido);
  if (/\.html?$/i.test(nombre)) {
    const salida = [];
    for (const b of scriptsJs(contenido)) {
      const base = contenido.slice(0, b.ini).split('\n').length - 1;
      if (b.roto) { salida.push({ linea: base + 1, texto: '<script> sin cerrar' }); continue; }
      for (const e of comillasSinCerrar(b.codigo)) salida.push({ linea: base + e.linea, texto: e.texto });
    }
    return salida;
  }
  return [];
}

module.exports = { comillasSinCerrar, revisarArchivo, scriptsJs };
