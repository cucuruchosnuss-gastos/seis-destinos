// Los datos de la maqueta (e2e/maqueta/datos/*.json) son los que genera
// e2e/maqueta/generar-datos.js desde pruebas/datos-maqueta/*.js: los mismos
// datos que usan las suites (27/09/2026). Un .json editado a mano, o un módulo
// cambiado sin `npm run maqueta:datos`, da rojo.
//
//   node pruebas/test-maqueta-datos.js
'use strict';
const fs = require('fs');
const path = require('path');
const { generar, DESTINO } = require('../e2e/maqueta/generar-datos');
const { UID } = require('./datos-maqueta/comun');

let ok = 0, mal = 0;
function chk(nombre, cond) { if (cond) ok++; else { mal++; console.log('FALLA:', nombre); } }

const datos = generar();
const nombres = Object.keys(datos);
chk('hay datos para generar', nombres.length >= 4);
const enDisco = fs.readdirSync(DESTINO).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
chk(`cada .json de la maqueta sale de un módulo (sobran: ${enDisco.filter(n => !nombres.includes(n)).join(', ')})`,
  enDisco.every(n => nombres.includes(n)));
for (const n of nombres) {
  const archivo = path.join(DESTINO, n + '.json');
  const hay = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : null;
  chk(`${n}.json está generado y al día (corré npm run maqueta:datos)`, hay === datos[n]);
  const d = JSON.parse(datos[n]);
  chk(`${n}: tiene tablas`, d.tablas && typeof d.tablas === 'object');
  chk(`${n}: la cuenta de la maqueta tiene su fila de empleados`,
    (d.tablas.empleados || []).some(e => e.auth_user_id === (d.uid || UID)));
}

console.log(`${ok}/${ok + mal} verificaciones`);
process.exit(mal ? 1 : 0);
