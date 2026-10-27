// SUBIR REMITOS ROSARIO (27/10/2026, rama ci-prueba/remitos-rosario-subir),
// en la maqueta "retiros-remitos" (Dolce Pasta con controla_stock_terminado
// = false, el usuario con retiros:cargar y remitos subidos en cada estado).
// A 390 y 1280 px, sin scroll horizontal ni errores de JS:
//  - el botón "Subir remitos Rosario" aparece; "Mis remitos subidos" muestra
//    cada estado (y el sello "Acopio"), solo los míos;
//  - una foto de prueba (un PNG de 2400×1200 armado en la página) se achica a
//    1600×800 en JPEG, se sube a <uid>/remitos/<uuid>.jpg, va a
//    crear_remito_precarga con su client_uuid y a ocr-remito, sin esperarla:
//    con la IA sin responder, otra foto igual se sube;
//  - si crear_remito_precarga falla, "Reintentar" usa el MISMO client_uuid y
//    no vuelve a subir la foto; el sondeo trae el remito leído;
//  - en una maqueta de Nuss (todas con control) el botón no aparece.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

function anotar(page) {
  const rpc = [];
  const funciones = [];
  page.on('console', async (m) => {
    const t = m.text();
    const args = m.args();
    try {
      if (t.startsWith('[maqueta] rpc')) rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() });
      else if (t.startsWith('[maqueta] función')) funciones.push({ nombre: await args[1].jsonValue(), body: await args[2].jsonValue() });
    } catch { /* nada */ }
  });
  return { rpc, funciones };
}
async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// Un PNG de prueba, armado en la página.
async function pngDePrueba(page, ancho, alto) {
  const b64 = await page.evaluate(([w, h]) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#123'; g.font = '120px sans-serif'; g.fillText('REMITO 0001-00003101', 60, h / 2);
    return c.toDataURL('image/png').split(',')[1];
  }, [ancho, alto]);
  return Buffer.from(b64, 'base64');
}

async function abrir(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-remitos`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Array.isArray(globalThis.__maquetaTablas?.remitos_precarga));
  await page.evaluate(() => {
    localStorage.removeItem('retiros.borrador');
    localStorage.removeItem('retiros.remitos.cola');
    localStorage.removeItem('retiros.remitos.fabrica');
    // Las fechas de la maqueta, a "recién": la lista es de los últimos 7 días.
    const filas = globalThis.__maquetaTablas.remitos_precarga;
    const base = Date.parse('2026-10-27T18:00:00Z');
    for (const f of filas) f.subido_en = new Date(Date.now() - (base - Date.parse(f.subido_en))).toISOString();
    // Lo subido, con sus medidas; la IA no responde (para ver que no se la espera).
    window.__subidas = [];
    window.__maqueta = {
      subir: async (bucket, ruta, archivo, op) => {
        const bm = await createImageBitmap(archivo);
        window.__subidas.push({ bucket, ruta, tipo: archivo.type, contentType: op?.contentType, upsert: op?.upsert, ancho: bm.width, alto: bm.height });
        return { data: { path: ruta }, error: null };
      },
      funciones: { 'ocr-remito': () => new Promise(() => {}) },
    };
  });
}

for (const [ancho, alto] of TAMANOS) {
  test(`Subir remitos Rosario en Dolce Pasta, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const { rpc, funciones } = anotar(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);

    // El botón, en la elección de fábrica.
    const boton = page.locator('#rt-btn-remitos');
    await expect(boton).toBeVisible();
    await expect(boton).toContainText('Subir remitos Rosario');
    await sinScrollHorizontal(page);
    await captura(page, `remitos-boton-${ancho}`, info);
    await boton.click();
    await expect(page.locator('#rt-subtitulo')).toHaveText('Subir remitos');
    await expect(page.locator('#rt-remitos-fabrica')).toContainText('Los remitos van a Dolce Pasta.');

    // Mis remitos subidos: cada estado, solo los míos.
    const lista = page.locator('#rt-remitos-lista');
    const fila = (id) => lista.locator(`[data-remito="${id}"]`);
    await expect(lista.locator('.rt-remito')).toHaveCount(6);
    await expect(fila('rp-otro')).toHaveCount(0);
    await expect(fila('rp-leyendo')).toContainText('Leyendo…');
    await expect(fila('rp-pre')).toContainText('Precargado');
    await expect(fila('rp-pre')).toContainText('Remito N° 0001-00003100');
    await expect(fila('rp-pre').locator('.rt-remito__sello')).toHaveCount(0);
    await expect(fila('rp-aco')).toContainText('Remito N° 977492');
    await expect(fila('rp-aco').locator('.rt-remito__sello')).toHaveText('Acopio');
    await expect(fila('rp-conf')).toContainText('Confirmado como orden D-0005');
    await expect(fila('rp-err')).toContainText('No se pudo leer');
    await expect(fila('rp-err')).toContainText('la foto está movida');
    await expect(fila('rp-err').locator('[data-remito-reintentar="rp-err"]')).toBeVisible();
    await expect(fila('rp-desc')).toContainText('Descartado: Foto repetida');
    // Más nuevo primero.
    const orden = await lista.locator('.rt-remito').evaluateAll(els => els.map(e => e.dataset.remito));
    expect(orden).toEqual(['rp-leyendo', 'rp-pre', 'rp-aco', 'rp-conf', 'rp-err', 'rp-desc']);
    await sinScrollHorizontal(page);
    await captura(page, `remitos-lista-${ancho}`, info);

    // Una foto: achicada, subida, registrada y mandada a leer.
    const png = await pngDePrueba(page, 2400, 1200);
    await page.locator('#rt-remitos-camara').setInputFiles({ name: 'remito.png', mimeType: 'image/png', buffer: png });
    await expect.poll(() => rpc.filter(r => r.nombre === 'crear_remito_precarga').length).toBe(1);
    const crear1 = rpc.find(r => r.nombre === 'crear_remito_precarga').params;
    expect(crear1.p_unidad_negocio_id).toBe('u-d');
    expect(crear1.p_foto_path).toMatch(new RegExp(`^uid-maqueta/remitos/${UUID}\\.jpg$`));
    expect(crear1.p_client_uuid).toMatch(new RegExp(`^${UUID}$`));
    const subidas = await page.evaluate(() => window.__subidas);
    expect(subidas).toEqual([{ bucket: 'comprobantes', ruta: crear1.p_foto_path, tipo: 'image/jpeg', contentType: 'image/jpeg', upsert: false, ancho: 1600, alto: 800 }]);
    await expect.poll(() => funciones.filter(f => f.nombre === 'ocr-remito').length).toBe(1);
    expect(funciones[0].body).toEqual({ remito_id: 'rp-nuevo' });
    // La foto recién sacada, arriba, con su miniatura local y "Leyendo…".
    const nueva = lista.locator('.rt-remito').first();
    await expect(nueva).toContainText('Leyendo…');
    await expect(nueva.locator('img.rt-remito__foto')).toHaveAttribute('src', /^blob:/);

    // Con la IA sin responder, otra foto (de la galería) igual se sube.
    await page.locator('#rt-remitos-galeria').setInputFiles([{ name: 'otro.png', mimeType: 'image/png', buffer: await pngDePrueba(page, 800, 1200) }]);
    await expect.poll(() => rpc.filter(r => r.nombre === 'crear_remito_precarga').length).toBe(2);
    const sub2 = await page.evaluate(() => window.__subidas[1]);
    expect([sub2.ancho, sub2.alto]).toEqual([800, 1200]);
    const crear2 = rpc.filter(r => r.nombre === 'crear_remito_precarga')[1].params;
    expect(crear2.p_client_uuid).not.toBe(crear1.p_client_uuid);
    expect(crear2.p_foto_path).not.toBe(crear1.p_foto_path);

    // Si crear_remito_precarga falla: "Reintentar" con el MISMO client_uuid.
    await page.evaluate(() => { window.__maqueta.rpc = { crear_remito_precarga: 'ERROR:No tenés permiso para subir remitos en esta fábrica.' }; });
    await page.locator('#rt-remitos-camara').setInputFiles({ name: 'tercero.png', mimeType: 'image/png', buffer: png });
    await expect.poll(() => rpc.filter(r => r.nombre === 'crear_remito_precarga').length).toBe(3);
    const fallida = lista.locator('.rt-remito--error').first();
    await expect(fallida).toContainText('No se pudo registrar');
    await expect(fallida).toContainText('No tenés permiso para subir remitos');
    const crear3 = rpc.filter(r => r.nombre === 'crear_remito_precarga')[2].params;
    await page.evaluate(() => { window.__maqueta.rpc = {}; });
    await fallida.locator('[data-remito-reintentar]').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'crear_remito_precarga').length).toBe(4);
    const crear4 = rpc.filter(r => r.nombre === 'crear_remito_precarga')[3].params;
    expect(crear4.p_client_uuid).toBe(crear3.p_client_uuid);
    expect(crear4.p_foto_path).toBe(crear3.p_foto_path);
    expect(await page.evaluate(() => window.__subidas.length), 'el reintento no vuelve a subir la foto').toBe(3);
    await sinScrollHorizontal(page);
    await captura(page, `remitos-subidos-${ancho}`, info);

    // El sondeo: cuando la base lo tiene leído, la lista lo muestra.
    await page.evaluate(([ruta]) => {
      globalThis.__maquetaTablas.remitos_precarga.push({
        id: 'rp-nuevo', unidad_negocio_id: 'u-d', foto_path: ruta, subido_por: 'emp-1', subido_en: new Date().toISOString(),
        estado: 'precargada', numero_remito: '0001-00003101', talonario: 'oficial', error: null, orden_id: null, descartado_motivo: null, orden: null,
      });
    }, [crear1.p_foto_path]);
    await expect(fila('rp-nuevo')).toContainText('Remito N° 0001-00003101', { timeout: 15000 });
    await expect(lista.locator('[data-remito="rp-nuevo"]')).toHaveCount(1);

    // Reintentar la lectura de uno que no se pudo leer.
    await fila('rp-err').locator('[data-remito-reintentar="rp-err"]').click();
    await expect.poll(() => funciones.some(f => f.nombre === 'ocr-remito' && f.body?.remito_id === 'rp-err')).toBe(true);
    await expect(fila('rp-err')).toContainText('Leyendo…');

    // Volver a la carga.
    await page.locator('#rt-remitos-volver').click();
    await expect(page.locator('#rt-vista-remitos')).toBeHidden();
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`En Nuss y Mengui (todas con control) no hay botón, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.addInitScript(() => {
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { unidades_negocio: [
        { id: 'u-n', nombre: 'Cucuruchos Nuss', es_prueba: false, controla_stock_terminado: true },
        { id: 'u-d', nombre: 'Mengui', es_prueba: false, controla_stock_terminado: true },
      ] } }));
    });
    const { rpc } = anotar(page);
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-remitos`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-empresa="u-n"]')).toBeVisible();
    await page.waitForTimeout(400);
    await expect(page.locator('#rt-remitos-entrada')).toBeHidden();
    await page.locator('[data-empresa="u-n"]').click();
    await expect(page.locator('#rt-cliente-buscar')).toBeVisible();
    await expect(page.locator('#rt-remitos-entrada')).toBeHidden();
    expect(rpc.some(r => r.nombre === 'crear_remito_precarga')).toBe(false);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
