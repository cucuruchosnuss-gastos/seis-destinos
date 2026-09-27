// Verifica que ningún archivo de TEXTO versionado tenga CR (0x0D) ni NUL (0x00),
// midiendo los BYTES del archivo y del blob del índice. Y, desde el 27/09/2026,
// que ningún .js ni <script> de un .html tenga un texto entre comillas que no
// cierra en su misma línea (pruebas/comillas.js).
//
//   node pruebas/check-bytes.js
//
// Por qué así y no con `grep -c $'\r'`: adentro de "$( … )" la comilla ANSI-C
// puede no procesarse, el patrón queda vacío y grep devuelve la cantidad de
// LÍNEAS, que se lee como un desastre de CRLF (ver Aprendizajes en CLAUDE.md).
// Y un NUL literal saca el archivo del régimen de texto de git sin avisar.
//
// Un chequeo que no pudo leer nada NO devuelve cero: falla. Si git no lista
// archivos, o un archivo listado no se puede leer, sale en rojo.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { revisarArchivo } = require('./comillas');

const RAIZ = path.join(__dirname, '..');
const BINARIOS = /\.(png|jpe?g|webp|pdf|zip|ico|gif|woff2?)$/i;

const lista = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\0').filter(Boolean);
if (lista.length < 10) {
  console.error(`git ls-files devolvió ${lista.length} archivos: no se puede verificar nada.`);
  process.exit(2);
}

const malos = [];
let revisados = 0;
let revisados_js = 0;
for (const f of lista) {
  if (BINARIOS.test(f)) continue;
  let buf;
  try { buf = fs.readFileSync(path.join(RAIZ, f)); }
  catch (e) { malos.push(`${f}: no se pudo leer (${e.code})`); continue; }
  revisados++;
  let cr = 0, nul = 0;
  for (const b of buf) { if (b === 13) cr++; else if (b === 0) nul++; }
  if (cr) malos.push(`${f}: ${cr} CR`);
  if (nul) malos.push(`${f}: ${nul} NUL`);
  // Comillas que no cierran en su línea (.js y los <script> de los .html).
  if (/\.(js|html)$/i.test(f)) {
    revisados_js++;
    for (const e of revisarArchivo(f, buf.toString('utf8'))) malos.push(`${f}:${e.linea}: texto entre comillas que no cierra en su línea → ${e.texto}`);
  }
}

// El blob del índice también: la copia de trabajo puede estar bien y el blob no.
const eol = execFileSync('git', ['ls-files', '--eol'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\n').filter(Boolean);
for (const l of eol) {
  const [i] = l.split(/\s+/);
  const f = l.split('\t').pop();
  if (BINARIOS.test(f)) continue;
  if (i === 'i/crlf' || i === 'i/mixed') malos.push(`${f}: el blob del índice es ${i}`);
  if (i === 'i/-text') malos.push(`${f}: git lo trata como binario (¿un byte de control?)`);
}

if (malos.length) {
  console.log(malos.join('\n'));
  console.log(`\n${malos.length} problemas en ${revisados} archivos de texto — ROJO`);
  process.exit(1);
}
if (revisados_js < 10) { console.error(`solo ${revisados_js} archivos .js/.html revisados por comillas: no se puede afirmar nada.`); process.exit(2); }
console.log(`${revisados} archivos de texto, 0 CR, 0 NUL; ${revisados_js} .js/.html sin comillas abiertas — verde`);
