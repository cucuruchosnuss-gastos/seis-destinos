// Genera e2e/maqueta/datos/*.json desde pruebas/datos-maqueta/*.js, que son
// los MISMOS datos que usan las suites (27/09/2026).
//
//   npm run maqueta:datos        (o node e2e/maqueta/generar-datos.js)
//
// Los .json están versionados porque la maqueta los sirve tal cual; la prueba
// pruebas/test-maqueta-datos.js da rojo si alguno no coincide con lo que
// genera este script (un .json editado a mano o un módulo sin regenerar).
'use strict';
const fs = require('fs');
const path = require('path');

const ORIGEN = path.join(__dirname, '..', '..', 'pruebas', 'datos-maqueta');
const DESTINO = path.join(__dirname, 'datos');

function generar() {
  const salida = {};
  for (const f of fs.readdirSync(ORIGEN).sort()) {
    if (!f.endsWith('.js') || f === 'comun.js') continue;
    const nombre = f.slice(0, -3);
    delete require.cache[require.resolve(path.join(ORIGEN, f))];
    salida[nombre] = JSON.stringify(require(path.join(ORIGEN, f)), null, 1) + '\n';
  }
  return salida;
}

if (require.main === module) {
  const datos = generar();
  for (const [nombre, texto] of Object.entries(datos)) fs.writeFileSync(path.join(DESTINO, nombre + '.json'), texto);
  console.log(`${Object.keys(datos).length} archivos de datos generados en e2e/maqueta/datos/`);
}

module.exports = { generar, ORIGEN, DESTINO };
