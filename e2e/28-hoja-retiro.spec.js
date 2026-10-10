// LA IMPRESIÓN DE LA ORDEN DE RETIRO (07/10/2026, diseño aprobado por Facu),
// medida en Chromium de verdad, en modo impresión (A4 con 8 mm de margen):
//  - una orden de 3 renglones sale en UNA hoja con las DOS copias (original
//    arriba, duplicado abajo, la línea punteada en el medio);
//  - una de 25 sale en hojas ENTERAS (cada copia en las suyas, "ORIGINAL ·
//    HOJA 1 DE N"), sin cortar ningún renglón entre páginas;
//  - ningún nombre termina en "…" ni queda cortado; el pie sale entero;
//  - solo negro sobre blanco; la letra Archivo.
// Deja los dos PDF (page.pdf) y una captura de cada uno en los resultados.
// Corre sin credenciales: la página de la maqueta solo sirve para cargar
// js/retiros-comun.js desde el mismo lugar que la app.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const ALTO_UTIL_A4_MM = 281;

function orden(n) {
  const productos = ['Cucuruchón Mini', 'Cucuruchón Grande con una descripción bastante larga para que no entre en un renglón', 'Barquillo 35', 'Cono dulce'];
  const renglones = Array.from({ length: n }, (_, i) => i % 5 === 4
    ? { esInsumo: true, producto: 'Harina 000', marca: 'Molino Cañuelas', cantidad: 250.5, unidad: 'kg', lotes: [{ lote: 'L-' + (100 + i), cantidad: 250.5 }] }
    : { producto: productos[i % productos.length], presentacion: i % 2 ? 'Caja x 600' : 'Caja x 320', cono: i % 3 ? 'LOLO' : 'Sin cono', cajas: 10 + i, unidades: (10 + i) * 320, lotes: [{ lote: '70' + (21 + i), cajas: 10 + i }] });
  return {
    codigo: 'N-0042', estado: 'confirmada', fecha: '2026-10-07', cargadaEn: '2026-10-07T13:32:00Z', cargadaPor: 'Emanuel Romero',
    transporte: n > 10 ? '' : 'Expreso del Sur', observaciones: '',
    empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'SEIS DESTINOS SAS', cuit: '30719434777', domicilio: 'Ruta 9 km 711, Córdoba', telefono: '351 555-0000', logo_url: 'logo-cucuruchos-nuss.png' },
    cliente: { nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', localidad: 'Villa María' },
    renglones,
  };
}

// Arma la hoja en una página en blanco del mismo sitio y la mide impresa.
async function armarYMedir(page, n, conPrecios = false) {
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
  // El MISMO contenedor que usa la Carga: al imprimir, la página esconde todo
  // lo demás (si la hoja fuera otro div, se mediría escondida: todo en cero).
  await page.evaluate(() => { document.body.innerHTML = '<div id="rt-impresion" class="rt-impresion"></div>'; });
  const plan = await page.evaluate(async ({ o, conPrecios }) => {
    const m = await import('/js/retiros-comun.js');
    m.asegurarEstilosHoja();
    return m.armarHoja(document.getElementById('rt-impresion'), o, { conPrecios, copias: m.COPIAS_IMPRESION });
  }, { o: orden(n), conPrecios });
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  const m = await page.evaluate(() => {
    const mm = (px) => px / (96 / 25.4);
    const r = (el) => el.getBoundingClientRect();
    const paginas = [...document.querySelectorAll('.rh-pagina')].map(p => mm(r(p).height));
    const copias = [...document.querySelectorAll('.rh-copia')];
    const cortados = [];
    for (const el of document.querySelectorAll('.rh-hoja *')) {
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis') cortados.push('ellipsis: ' + el.className);
      if (el.matches('.rh-producto, .rh-lote, .rh-legal, .rh-cliente__nombre, .rh-firma, .rh-entrego') && (el.scrollWidth > el.clientWidth + 1)) cortados.push('ancho: ' + el.className + ' ' + el.textContent.slice(0, 40));
    }
    // Cada renglón, el pie y la leyenda, ADENTRO de su copia (nada recortado por overflow).
    const afuera = [];
    for (const c of copias) {
      const rc = r(c);
      for (const el of c.querySelectorAll('tbody tr, .rh-pie, .rh-legal, tfoot tr')) {
        const re = r(el);
        if (re.top < rc.top - 0.5 || re.bottom > rc.bottom + 0.5) afuera.push(el.className || el.tagName);
      }
    }
    const textos = [...document.querySelectorAll('.rh-hoja')].map(h => h.innerText).join('\n');
    const colores = new Set();
    for (const el of document.querySelectorAll('.rh-hoja, .rh-hoja *')) {
      const cs = getComputedStyle(el);
      if (el.textContent.trim()) colores.add(cs.color);
    }
    return {
      altosCopias: copias.map(c => mm(r(c).height)), paginas, copias: copias.length, rotulos: [...document.querySelectorAll('.rh-titulo__copia')].map(e => e.textContent),
      cortes: document.querySelectorAll('.rh-corte').length, cortados, afuera, colores: [...colores],
      tienePuntos: /…|\.\.\./.test(textos), legales: (textos.match(/Documento interno\. No válido como factura\./g) || []).length,
      firmas: document.querySelectorAll('.rh-firma').length, filas: document.querySelectorAll('tbody tr').length,
      fuente: getComputedStyle(document.querySelector('.rh-hoja')).fontFamily,
    };
  });
  return { plan, m };
}

async function guardarPdf(page, nombre, info) {
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const archivo = info.outputPath(`${nombre}.pdf`);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, pdf);
  await info.attach(nombre, { body: pdf, contentType: 'application/pdf' });
  // Las páginas del PDF.
  // Las páginas, del árbol de páginas del PDF ("/Count N").
  return Math.max(0, ...[...pdf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)].map(x => Number(x[1])));
}

test('3 renglones: UNA hoja con el original y el duplicado', async ({ page }, info) => {
  const { plan, m } = await armarYMedir(page, 3);
  expect(plan.modo).toBe('media');
  expect(m.copias).toBe(2);
  // Medida de verdad: cada copia mide media hoja (si estuviera escondida, 0).
  for (const a of m.altosCopias) expect(a, `una copia mide ${a.toFixed(1)} mm`).toBeGreaterThan(130);
  expect(m.rotulos).toEqual(['ORIGINAL', 'DUPLICADO']);
  expect(m.cortes, 'la línea punteada entre las dos').toBe(1);
  expect(m.paginas.length).toBe(1);
  expect(m.paginas[0], `la hoja mide ${m.paginas[0].toFixed(1)} mm`).toBeLessThanOrEqual(ALTO_UTIL_A4_MM);
  expect(m.cortados, m.cortados.join('\n')).toEqual([]);
  expect(m.afuera, 'nada se sale de su copia: ' + m.afuera.join(', ')).toEqual([]);
  expect(m.tienePuntos, 'ningún "…"').toBe(false);
  expect(m.legales, 'la leyenda entera en cada copia').toBe(2);
  expect(m.firmas, 'FIRMA, ACLARACIÓN y DNI en cada copia').toBe(6);
  expect(m.colores, 'solo negro').toEqual(['rgb(0, 0, 0)']);
  expect(m.fuente).toMatch(/^Archivo/);
  await page.screenshot({ path: info.outputPath('hoja-3-renglones.png'), fullPage: true });
  expect(await guardarPdf(page, 'hoja-3-renglones', info), 'el PDF tiene UNA página').toBe(1);
});

test('25 renglones: hojas enteras, sin cortar renglones', async ({ page }, info) => {
  const { plan, m } = await armarYMedir(page, 25);
  expect(plan.modo).toBe('entera');
  const n = plan.paginas.length;
  expect(n).toBeGreaterThan(1);
  expect(m.paginas.length, 'cada copia en sus hojas').toBe(2 * n);
  for (const a of m.altosCopias) expect(a, `una hoja mide ${a.toFixed(1)} mm`).toBeGreaterThan(200);
  expect(m.rotulos[0]).toBe(`ORIGINAL · HOJA 1 DE ${n}`);
  expect(m.rotulos[n]).toBe(`DUPLICADO · HOJA 1 DE ${n}`);
  for (const [k, alto] of m.paginas.entries()) expect(alto, `la hoja ${k + 1} mide ${alto.toFixed(1)} mm`).toBeLessThanOrEqual(ALTO_UTIL_A4_MM);
  expect(m.filas, 'los 25 renglones en cada copia').toBe(50);
  expect(m.cortes, 'sin la línea punteada').toBe(0);
  expect(m.cortados, m.cortados.join('\n')).toEqual([]);
  expect(m.afuera, 'ningún renglón ni el pie se cortan: ' + m.afuera.join(', ')).toEqual([]);
  expect(m.tienePuntos, 'ningún "…"').toBe(false);
  expect(m.legales, 'la leyenda entera en cada hoja').toBe(2 * n);
  expect(m.firmas, 'el pie de firmas en la última hoja de cada copia').toBe(6);
  expect(m.colores, 'solo negro').toEqual(['rgb(0, 0, 0)']);
  await page.screenshot({ path: info.outputPath('hoja-25-renglones.png'), fullPage: true });
  expect(await guardarPdf(page, 'hoja-25-renglones', info), 'el PDF tiene una página por hoja').toBe(2 * n);
});

test('con precios (Administración): también entra y suma PRECIO y SUBTOTAL', async ({ page }) => {
  const { plan, m } = await armarYMedir(page, 3, true);
  expect(plan.modo).toBe('media');
  expect(m.cortados, m.cortados.join('\n')).toEqual([]);
  expect(m.afuera, m.afuera.join(', ')).toEqual([]);
  const cab = await page.locator('.rh-tabla thead').first().innerText();
  expect(cab).toMatch(/PRECIO/);
  expect(cab).toMatch(/SUBTOTAL/);
});
