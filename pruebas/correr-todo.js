// Corre TODO lo que cierra un commit: check-scripts, cada suite test-*.js y
// cada controles-*.js, de a una, y dice cuántas pasaron y cuáles fallaron.
//
//   node pruebas/correr-todo.js            → todo
//   node pruebas/correr-todo.js mut        → las mut-*.js (tardan: una por vez)
//   FILTRO=produccion node pruebas/correr-todo.js   → solo las que contienen "produccion"
//
// Sale con código distinto de cero si falla cualquiera. Si existe
// GITHUB_STEP_SUMMARY (en GitHub Actions), escribe ahí el resumen en markdown.
//
// Las mutaciones se corren DE A UNA a propósito: dos runners a la vez se pisan
// el archivo temporal y el resultado se lee como cobertura faltante (ver
// Aprendizajes en CLAUDE.md).
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const modoMut = process.argv[2] === 'mut';
const filtro = process.env.FILTRO || '';

const archivos = fs.readdirSync(DIR).sort();
let trabajos;
if (modoMut) {
  trabajos = archivos.filter(f => /^mut-.*\.js$/.test(f));
} else {
  trabajos = ['check-scripts.js',
    ...archivos.filter(f => /^test-.*\.js$/.test(f)),
    ...archivos.filter(f => /^controles-.*\.js$/.test(f) && f !== 'controles-comun.js')];
}
if (filtro) trabajos = trabajos.filter(f => f.includes(filtro));

const resultados = [];
const inicio = Date.now();
for (const f of trabajos) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(DIR, f)], {
    cwd: path.join(DIR, '..'),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: (() => { const e = { ...process.env }; delete e.ARCHIVO_TEST; return e; })(),
  });
  const salida = (r.stdout || '') + (r.stderr || '');
  const ultima = ((r.stdout || '').trim() ? r.stdout : salida).trim().split('\n').filter(Boolean).slice(-1)[0] || '';
  const ok = r.status === 0;
  const seg = ((Date.now() - t0) / 1000).toFixed(1);
  resultados.push({ f, ok, ultima, seg, salida });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${f.padEnd(44)} ${seg.padStart(6)}s  ${ultima.slice(0, 90)}`);
  if (!ok) console.log(salida.split('\n').slice(-40).map(l => '      | ' + l).join('\n'));
}

const fallas = resultados.filter(r => !r.ok);
const total = ((Date.now() - inicio) / 1000).toFixed(0);
const linea = `${resultados.length - fallas.length}/${resultados.length} en verde` +
  (fallas.length ? ` — FALLARON: ${fallas.map(r => r.f).join(', ')}` : '') + ` (${total}s)`;
console.log('\n' + linea);

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    `## ${modoMut ? 'Mutaciones' : 'Pruebas'}: ${fallas.length ? '❌' : '✅'} ${linea}`, '',
    '| | Archivo | Tiempo | Resultado |', '|---|---|---|---|',
    ...resultados.map(r => `| ${r.ok ? '✅' : '❌'} | \`${r.f}\` | ${r.seg}s | ${r.ultima.replace(/\|/g, '\\|').slice(0, 120)} |`),
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
}
process.exit(fallas.length ? 1 : 0);
