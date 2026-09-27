// El chequeo de comillas que no cierran en su línea (pruebas/comillas.js), que
// corre dentro de check-bytes.js (27/09/2026).
//
//   node pruebas/test-comillas.js
//   ARCHIVO_TEST=otro.js node pruebas/test-comillas.js   (las mutaciones)
'use strict';
const fs = require('fs');
const path = require('path');

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, 'comillas.js');
console.log(`ARCHIVO ${ARCHIVO} (${fs.readFileSync(ARCHIVO, 'utf8').length} bytes)`);
// Se carga desde la ruta pedida (una mutación puede tener otra extensión).
const Module = require('module');
const m = new Module(ARCHIVO, module);
m.filename = ARCHIVO;
m.paths = Module._nodeModulePaths(path.dirname(ARCHIVO));
m._compile(fs.readFileSync(ARCHIVO, 'utf8'), ARCHIVO);
const { comillasSinCerrar, revisarArchivo } = m.exports;

let ok = 0, mal = 0;
function chk(nombre, cond) { if (cond) ok++; else { mal++; console.log('FALLA:', nombre); } }
const lineas = (codigo) => comillasSinCerrar(codigo).map(e => e.linea);

// ── Lo roto se ve, con su línea ────────────────────────────────────────────
chk('comilla simple sin cerrar', JSON.stringify(lineas("const a = 1\nconst b = 'hola\nconst c = 2\n")) === '[2]');
chk('comilla doble sin cerrar', JSON.stringify(lineas('x("uno")\ny("dos)\n')) === '[2]');
chk('la barra comida: \'\\\' deja la comilla abierta', lineas("const s = 'a\\'\nconst t = 1").length === 1);
chk('dentro de un ${ } de un template también', JSON.stringify(lineas('const t = `a ${f(\'x)} b`\n')) === '[1]');
chk('varios errores, varias líneas', JSON.stringify(lineas("'a\n'b\n'c'\n")) === '[1,2]');
chk('el texto roto va en el reporte', (comillasSinCerrar("  f('no cierra\n")[0] || {}).texto === "'no cierra");

// ── Lo sano NO se marca ────────────────────────────────────────────────────
chk('strings normales', lineas("const a = 'x'; const b = \"y\"; const c = 'it\\'s'\n").length === 0);
chk('template de varias líneas', lineas('const t = `\n  <div class="a">\n  it\'s\n`\n').length === 0);
chk('comillas en un comentario de línea', lineas("// it's fine\nconst a = 1 // don't\n").length === 0);
chk('comillas en un comentario de bloque', lineas("/* it's\n  \"fine */ x()\n").length === 0);
chk('barra de continuación', lineas("const a = 'uno \\\ndos'\n").length === 0);
chk('regex con una comilla adentro', lineas("const r = /[\"']/g; const s = 'x'\n").length === 0);
chk('regex después de return', lineas("function f(t) { return /^'/.test(t) }\n").length === 0);
chk('división no es regex', lineas("const a = b / c; const d = 'x' / 2\n").length === 0);
chk('templates anidados con strings', lineas('const t = `a ${x ? `b ${\'c\'}` : "d"} e`\n').length === 0);
chk('objeto dentro de ${ }', lineas('const t = `${f({ a: \'x\' })}`\n').length === 0);

// ── HTML: solo los <script> de JavaScript, con la línea del archivo ────────
const html = "<p>it's</p>\n<script>\nconst a = 'ok'\nconst b = 'mal\n</script>\n<script type=\"application/ld+json\">{\"a\": \"b\n}</script>\n";
const eh = revisarArchivo('x.html', html);
chk('html: solo el error del script JS, en la línea del archivo', eh.length === 1 && eh[0].linea === 4);
chk('html: el texto afuera de <script> no cuenta', revisarArchivo('y.html', "<p title='it's'>x</p>\n").length === 0);
chk('html: un <script type="module"> se revisa', revisarArchivo('z.html', "<script type=\"module\">\nf('a\n</script>").length === 1);
chk('.js se revisa entero', revisarArchivo('a.js', "f('a\n").length === 1);
chk('.css no se revisa', revisarArchivo('a.css', "a { content: 'x\n }").length === 0);

// ── El repo entero, hoy, está sano ─────────────────────────────────────────
const { execFileSync } = require('child_process');
const RAIZ = path.join(__dirname, '..');
const lista = execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(f => /\.(js|html)$/.test(f));
chk('hay archivos para revisar', lista.length > 100);
const rotos = lista.flatMap(f => revisarArchivo(f, fs.readFileSync(path.join(RAIZ, f), 'utf8')).map(e => `${f}:${e.linea}`));
chk('ningún archivo del repo tiene comillas abiertas: ' + rotos.slice(0, 5).join(', '), rotos.length === 0);

console.log(`${ok}/${ok + mal} verificaciones`);
process.exit(mal ? 1 : 0);
