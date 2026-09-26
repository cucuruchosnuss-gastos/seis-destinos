// Servidor estático mínimo: sirve el repo TAL CUAL, como GitHub Pages, para que
// Playwright pruebe el código del commit sin esperar el despliegue.
//   node e2e/servidor.js [puerto]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PUERTO = Number(process.argv[2] || process.env.PUERTO || 4173);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.normalize(path.join(RAIZ, ruta));
  if (!archivo.startsWith(RAIZ) || archivo.includes(`${path.sep}node_modules${path.sep}`)) {
    res.writeHead(403); return res.end('prohibido');
  }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end('no existe'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log(`Sirviendo ${RAIZ} en http://localhost:${PUERTO}`));
