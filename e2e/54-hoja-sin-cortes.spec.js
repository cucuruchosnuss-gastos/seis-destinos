// LA HOJA SIN CORTES DE MÁS (23/10/2026, caso N-0025 de SALVADOR LOFORTE).
// La orden real (leída de la base el 23/10/2026: 5 renglones, observaciones,
// transporte Ostera) en la Carga (sin precios) y en Administración (con
// precios), a 390, 360, tablet (768 × 1024) y 1280 px:
//  - sale en MEDIA HOJA (original + duplicado en UNA A4) y el PDF de imprimir
//    tiene UNA página; nada queda recortado adentro de su copia;
//  - una de 8 renglones con observaciones entra en media hoja con 10 mm o más
//    de margen;
//  - con Google Fonts lento o caído, la hoja igual se mide CON sus estilos
//    (la causa del caso: en Safari se medía sin estilos y salía 4 + 1);
//  - lo mismo en WebKit (el motor de Safari), y el PDF de "Enviar"
//    (html2canvas + jsPDF) en una página;
//  - sin scroll horizontal ni errores de JavaScript en la pantalla.
const { test, expect, webkit } = require('@playwright/test');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const ALTO_UTIL_A4_MM = 281;
const MEDIA_MM = 136;
const MARGEN_PEDIDO_MM = 10;

const N0025 = {
  codigo: 'N-0025', estado: 'confirmada', fecha: '2026-10-21', cargadaEn: '2026-10-21T14:46:35.985156Z', cargadaPor: 'Usabarrena Franco',
  transporte: 'Ostera', observaciones: 'Las 4 cajas de cucuruchon son de cambio', moneda: 'ARS', total: null,
  empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 846, Córdoba Capital', telefono: '+54 351 312-5236', logo_url: 'logo-cucuruchos-nuss.png' },
  cliente: { nombre: 'SALVADOR LOFORTE', razon_social: 'SALVADOR LOFORTE', localidad: 'Cordoba' },
  renglones: [
    { producto: 'Cucuruchón Mini', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 62, unidades: 19840, lotes: [{ lote: '6244-2', cajas: 20 }, { lote: '6252-1', cajas: 42 }], precio: null, subtotal: null },
    { producto: 'Obleas dulces', presentacion: 'Caja', cono: 'Sin cono', cajas: 30, unidades: 1650, lotes: [{ lote: 'DOLCE-2110', cajas: 30 }], precio: null, subtotal: null },
    { producto: 'Capelina Grande', presentacion: 'Caja', cono: 'Sin cono', cajas: 15, unidades: 1200, lotes: [{ lote: 'RODRIGOA-2110', cajas: 15 }], precio: null, subtotal: null },
    { producto: 'Cucuruchón Mini', presentacion: 'Caja con cono', cono: 'LLAO LLAO', cajas: 9, unidades: 2880, lotes: [{ lote: 'INICIAL', cajas: 9 }], precio: null, subtotal: null },
    { producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 4, unidades: 960, lotes: [{ lote: '6245-1', cajas: 4 }], precio: null, subtotal: null },
  ],
};
// 8 renglones de prueba: los 5 de la N-0025 y 3 más, con observaciones.
const OCHO = { ...N0025, codigo: 'N-9008', observaciones: 'Las 4 cajas de cucuruchon son de cambio. Entregar por el portón de atrás.',
  renglones: [...N0025.renglones,
    { producto: 'Barquillo 35', presentacion: 'Caja x 600', cono: 'Sin cono', cajas: 12, unidades: 7200, lotes: [{ lote: '7021', cajas: 12 }], precio: null, subtotal: null },
    { producto: 'Cucuruchón Grande', presentacion: 'Caja con cono', cono: 'LOLO', cajas: 6, unidades: 1440, lotes: [{ lote: '6250-2', cajas: 6 }], precio: null, subtotal: null },
    { producto: 'Cono dulce', presentacion: 'Caja x 320', cono: 'Sin cono', cajas: 8, unidades: 2560, lotes: [{ lote: '7033', cajas: 8 }], precio: null, subtotal: null }] };

const PANTALLAS = [
  { nombre: '390', viewport: { width: 390, height: 844 }, celu: true },
  { nombre: '360', viewport: { width: 360, height: 780 }, celu: true },
  { nombre: 'tablet', viewport: { width: 768, height: 1024 }, celu: true },
  { nombre: '1280', viewport: { width: 1280, height: 800 }, celu: false },
];
const DONDE = [
  { nombre: 'la Carga', url: '/modulos/retiros.html?maqueta=retiros', contenedor: 'rt-impresion', conPrecios: false },
  { nombre: 'Administración', url: '/modulos/administracion.html?maqueta=administracion', contenedor: 'ad-impresion', conPrecios: true },
];

// Mide la orden como lo hace imprimir: medirHoja + planHoja, y armarHoja en el
// contenedor de impresión de la pantalla (sin tocar el resto de la página).
async function medirYArmar(page, o, d) {
  return page.evaluate(async ({ o, d }) => {
    const m = await import('/js/retiros-comun.js');
    const med = await m.medirHoja(o, { conPrecios: d.conPrecios });
    const plan = await m.armarHoja(document.getElementById(d.contenedor), o, { conPrecios: d.conPrecios, copias: m.COPIAS_IMPRESION });
    return { med, plan, planDeMedidas: m.planHoja(med) };
  }, { o, d });
}

// En modo impresión: el alto de cada copia y si algo queda recortado adentro.
async function medirImpresa(page) {
  return page.evaluate(() => {
    const mm = (px) => px / (96 / 25.4);
    const copias = [...document.querySelectorAll('.rh-copia')];
    const afuera = [];
    for (const c of copias) {
      const rc = c.getBoundingClientRect();
      if (c.scrollHeight > c.clientHeight + 1) afuera.push('la copia ' + c.dataset.copia + ' se pasa de su alto');
      for (const el of c.querySelectorAll('tbody tr, tfoot tr, .rh-notas, .rh-pie, .rh-legal')) {
        const re = el.getBoundingClientRect();
        if (re.bottom > rc.bottom + 0.5) afuera.push(el.className || el.tagName);
      }
    }
    return {
      copias: copias.length, altos: copias.map(c => mm(c.getBoundingClientRect().height)), cortes: document.querySelectorAll('.rh-corte').length,
      paginas: [...document.querySelectorAll('.rh-pagina')].map(p => mm(p.getBoundingClientRect().height)), afuera,
      sigue: /Sigue en la hoja/.test(document.querySelector('.rh-hoja')?.innerText || ''),
      tamTd: getComputedStyle(document.querySelector('.rh-producto')).fontSize, tamCajas: getComputedStyle(document.querySelector('.rh-cajas')).fontSize,
    };
  });
}

const paginasPdf = (pdf) => Math.max(0, ...[...pdf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)].map(x => Number(x[1])));

for (const p of PANTALLAS) {
  for (const d of DONDE) {
    test(`N-0025 en ${d.nombre} a ${p.nombre}: media hoja, UNA página`, async ({ browser }, info) => {
      const ctx = await browser.newContext({ viewport: p.viewport, isMobile: p.celu && p.viewport.width < 768, hasTouch: p.celu, deviceScaleFactor: p.celu ? 2 : 1 });
      const page = await ctx.newPage();
      const errores = [];
      page.on('pageerror', e => errores.push(e.message));
      await page.goto(`${MAQUETA}${d.url}`);
      await page.waitForLoadState('networkidle');
      const anchos = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, ventana: window.innerWidth }));
      expect(anchos.doc, 'sin scroll horizontal').toBeLessThanOrEqual(anchos.ventana);

      const { med, plan, planDeMedidas } = await medirYArmar(page, N0025, d);
      expect(med.estilos, 'se midió con los estilos de la hoja').toBe(true);
      expect(plan.modo, `media hoja (la copia mide ${med.copiaEntera.toFixed(1)} mm)`).toBe('media');
      expect(planDeMedidas.modo).toBe('media');
      expect(med.copiaEntera, 'entra en media hoja con margen').toBeLessThanOrEqual(MEDIA_MM - MARGEN_PEDIDO_MM);
      info.annotations.push({ type: 'medida', description: `N-0025 ${d.nombre} ${p.nombre}: copia ${med.copiaEntera.toFixed(1)} mm, fijo ${med.fijo.toFixed(1)}, final ${med.final.toFixed(1)}, renglones ${med.filas.map(f => f.toFixed(1)).join(' ')}` });

      await page.emulateMedia({ media: 'print' });
      const imp = await medirImpresa(page);
      expect(imp.copias, 'original y duplicado').toBe(2);
      expect(imp.cortes, 'la línea punteada').toBe(1);
      expect(imp.sigue, 'sin "Sigue en la hoja"').toBe(false);
      expect(imp.paginas.length).toBe(1);
      expect(imp.paginas[0]).toBeLessThanOrEqual(ALTO_UTIL_A4_MM);
      for (const a of imp.altos) expect(a).toBeLessThanOrEqual(MEDIA_MM + 0.5);
      expect(imp.afuera, 'nada recortado: ' + imp.afuera.join(', ')).toEqual([]);
      expect(imp.tamTd, 'los renglones en 14 px').toBe('14px');
      expect(imp.tamCajas, 'las cajas en 18 px').toBe('18px');
      if (p.nombre === '1280') {
        const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
        await info.attach(`n0025-${d.conPrecios ? 'admin' : 'carga'}.pdf`, { body: pdf, contentType: 'application/pdf' });
        expect(paginasPdf(pdf), 'el PDF de imprimir tiene UNA página').toBe(1);
      }
      expect(errores, errores.join('\n')).toEqual([]);
      await ctx.close();
    });
  }
}

for (const d of DONDE) {
  test(`8 renglones con observaciones en ${d.nombre}: media hoja con ${MARGEN_PEDIDO_MM} mm de margen`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${MAQUETA}${d.url}`);
    const { med, plan } = await medirYArmar(page, OCHO, d);
    info.annotations.push({ type: 'medida', description: `8 renglones ${d.nombre}: copia ${med.copiaEntera.toFixed(1)} mm (margen ${(MEDIA_MM - med.copiaEntera).toFixed(1)})` });
    expect(plan.modo).toBe('media');
    expect(med.copiaEntera, `la copia mide ${med.copiaEntera.toFixed(1)} mm`).toBeLessThanOrEqual(MEDIA_MM - MARGEN_PEDIDO_MM);
    await page.emulateMedia({ media: 'print' });
    const imp = await medirImpresa(page);
    expect(imp.copias).toBe(2);
    expect(imp.afuera, imp.afuera.join(', ')).toEqual([]);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    expect(paginasPdf(pdf)).toBe(1);
  });
}

// La causa del caso: la letra de Google Fonts lenta (o caída). Antes, en
// Safari, la hoja se medía sin sus estilos. Ahora se mide igual con estilos.
for (const [como, ruta] of [['lenta (2,5 s)', async (r) => { await new Promise(x => setTimeout(x, 2500)); await r.continue(); }], ['caída', (r) => r.abort()]]) {
  test(`Google Fonts ${como}: la hoja se mide con sus estilos y va en media hoja`, async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, ruta);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
    const { med, plan } = await medirYArmar(page, N0025, DONDE[0]);
    expect(med.estilos).toBe(true);
    expect(med.fijo, 'la cabecera no es la del logo sin estilos').toBeLessThan(60);
    expect(plan.modo).toBe('media');
  });
}

test('WebKit (Safari), con la letra lenta: la N-0025 en media hoja, sin cortes', async ({}, info) => {
  let nav;
  try { nav = await webkit.launch(); } catch (e) { test.skip(true, 'WebKit no está instalado: ' + String(e.message).slice(0, 120)); }
  try {
    for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      for (const d of DONDE) {
        const page = await nav.newPage({ viewport: vp });
        const errores = [];
        page.on('pageerror', e => errores.push(e.message));
        await page.route(/fonts\.googleapis\.com/, async (r) => { await new Promise(x => setTimeout(x, 2000)); await r.continue(); });
        await page.goto(`${MAQUETA}${d.url}`);
        const { med, plan } = await medirYArmar(page, N0025, d);
        info.annotations.push({ type: 'medida', description: `WebKit ${vp.width} ${d.nombre}: copia ${med.copiaEntera.toFixed(1)} mm, fijo ${med.fijo.toFixed(1)}` });
        expect(med.estilos, `WebKit ${vp.width} ${d.nombre}: con estilos`).toBe(true);
        expect(med.fijo).toBeLessThan(60);
        expect(plan.modo, `WebKit ${vp.width} ${d.nombre}: media hoja`).toBe('media');
        expect(med.copiaEntera).toBeLessThanOrEqual(MEDIA_MM - MARGEN_PEDIDO_MM);
        expect(errores, errores.join('\n')).toEqual([]);
        await page.close();
      }
    }
  } finally {
    await nav.close();
  }
});

test('el PDF de "Enviar" (html2canvas + jsPDF): la N-0025 en UNA página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
  const r = await page.evaluate(async (o) => {
    const m = await import('/js/retiros-comun.js');
    const blob = await m.generarPdf(o, { conPrecios: false });
    const texto = await blob.text();
    return { tam: blob.size, paginas: (texto.match(/\/Type\s*\/Page\b(?!s)/g) || []).length };
  }, N0025);
  expect(r.tam).toBeGreaterThan(1000);
  expect(r.paginas, 'una sola página').toBe(1);
});
