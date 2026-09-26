// LA MAQUETA: el repo tal cual, pero con js/supabase.js cambiado por un doble
// con datos fijos, para MIRAR una pantalla sin sesión ni base (26/09/2026).
//
//   node e2e/maqueta/servir.js [puerto]        (por defecto 4180)
//   → http://localhost:4180/modulos/retiros.html?maqueta=retiros
//
// `?maqueta=<nombre>` elige e2e/maqueta/datos/<nombre>.json (queda recordado en
// la pestaña para las páginas siguientes). Las RPCs se responden con lo que el
// archivo dice en "rpc"; las tablas se filtran por eq / in / is / gte / lte.
// No escribe nada en ningún lado: lo que "guarda" una pantalla se ve en la
// consola del navegador ("[maqueta] rpc …").
//
// SIRVE PARA MIRAR, NO PARA PROBAR: lo que hace la pantalla con la base real lo
// dicen las suites de pruebas/ y los recorridos de e2e/.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const AQUI = __dirname;
const PUERTO = Number(process.argv[2] || process.env.PUERTO || 4180);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function responder(res, archivo) {
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end('no existe'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(datos);
  });
}

http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta === '/js/supabase.js') return responder(res, path.join(AQUI, 'supabase-falso.js'));
  if (ruta.startsWith('/maqueta/datos/')) {
    const nombre = path.basename(ruta);
    if (!/^[a-z0-9-]+\.json$/.test(nombre)) { res.writeHead(403); return res.end('prohibido'); }
    return responder(res, path.join(AQUI, 'datos', nombre));
  }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.normalize(path.join(RAIZ, ruta));
  if (!archivo.startsWith(RAIZ) || archivo.includes(`${path.sep}node_modules${path.sep}`)) {
    res.writeHead(403); return res.end('prohibido');
  }
  responder(res, archivo);
}).listen(PUERTO, () => console.log(`Maqueta en http://localhost:${PUERTO} (agregá ?maqueta=<datos> a la primera página)`));
