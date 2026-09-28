// LAS FOTOS DEL DISEÑO (28/09/2026, "comparar con el diseño").
//
// Un handoff de Claude Design trae un .dc.html: un lienzo con TODAS las
// pantallas, cada una en un recuadro del tamaño exacto (por ejemplo 1000 × 540
// y 600 × 940 en la planta), armadas por support.js con los datos de ejemplo
// del propio archivo. Este módulo abre ese lienzo en un navegador, marca cada
// recuadro con su id de pantalla ("4a", "9e"…) y su tamaño, y le saca una foto
// a cada uno. Con eso comparar.js pone al lado la pantalla real.
//
// Los diseños viven en e2e/disenos/<nombre>/<nombre>.dc.html (copiados del
// .zip del handoff; el único cambio es que todos usan ../support.js). El
// logo.png que piden se sirve con el de la raíz del repo, que es el mismo
// archivo (md5 igual, 28/09/2026).
'use strict';
const path = require('path');
const fs = require('fs');

const RAIZ = path.join(__dirname, '..');

// Abre el diseño y devuelve la lista de recuadros [{ clave, id, titulo, w, h, n }].
// `base` es el servidor que sirve el repo (la maqueta o el estático).
async function abrirDiseno(page, base, nombre) {
  await page.route('**/e2e/disenos/*/logo.png', ruta =>
    ruta.fulfill({ path: path.join(RAIZ, 'logo.png'), contentType: 'image/png' }));
  await page.setViewportSize({ width: 2400, height: 1400 });
  await page.goto(`${base}/e2e/disenos/${nombre}/${nombre}.dc.html`, { waitUntil: 'load' });
  // support.js arma el lienzo con React: se espera a que haya recuadros.
  await page.waitForFunction(() => document.querySelectorAll('div[style*="overflow: hidden"]').length > 3, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const out = [];
    const cuenta = {};
    for (const d of document.querySelectorAll('div')) {
      const w = parseFloat(d.style.width), h = parseFloat(d.style.height);
      if (!(w >= 300 && h >= 300 && d.style.overflow === 'hidden')) continue;
      // El id de la pantalla es la etiqueta negra de la fila ("1a", "4b"…),
      // el primer <div> con ese formato subiendo desde el recuadro.
      let fila = d.parentElement, id = '', titulo = '';
      while (fila && !id) {
        const etiqueta = [...fila.querySelectorAll(':scope > div > div')].find(x => /^\d+[a-z]?$/.test(x.textContent.trim()));
        if (etiqueta) { id = etiqueta.textContent.trim(); titulo = etiqueta.nextElementSibling?.textContent.trim() ?? ''; }
        fila = fila.parentElement;
      }
      const base = `${id || 'x'}-${w}x${h}`;
      cuenta[base] = (cuenta[base] ?? 0) + 1;
      const clave = cuenta[base] > 1 ? `${base}-${cuenta[base]}` : base;
      d.setAttribute('data-foto', clave);
      out.push({ clave, id, titulo, w, h });
    }
    return out;
  });
}

// La foto de UN recuadro, como Buffer PNG.
async function fotoDelDiseno(page, clave) {
  const el = page.locator(`[data-foto="${clave}"]`);
  await el.scrollIntoViewIfNeeded();
  return el.screenshot();
}

// Guarda todas las fotos del diseño en una carpeta (para mirarlas).
//   node e2e/diseno.js <nombre> <carpeta> [puerto]
async function main() {
  const [nombre, carpeta, puerto = '4180'] = process.argv.slice(2);
  if (!nombre || !carpeta) { console.error('uso: node e2e/diseno.js <nombre> <carpeta> [puerto]'); process.exit(2); }
  const { chromium } = require('@playwright/test');
  fs.mkdirSync(carpeta, { recursive: true });
  const nav = await chromium.launch();
  const page = await nav.newPage();
  const recuadros = await abrirDiseno(page, `http://localhost:${puerto}`, nombre);
  for (const r of recuadros) fs.writeFileSync(path.join(carpeta, `${r.clave}.png`), await fotoDelDiseno(page, r.clave));
  console.log(recuadros.map(r => `${r.clave}  ${r.titulo}`).join('\n'));
  await nav.close();
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

module.exports = { abrirDiseno, fotoDelDiseno };
