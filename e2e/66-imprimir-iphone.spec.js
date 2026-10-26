// IMPRIMIR EN EL IPHONE (26/10/2026, rama ci-prueba/imprimir-iphone), con
// WebKit (el motor de Safari) y un iPhone de Playwright. Safari del iPhone
// ignora window.print() si no se llama pegado al toque: acá window.print se
// reemplaza por uno que anota si el toque seguía "vivo" (una marca que se
// prende en la captura del click, en el document, y se apaga en el burbujeo,
// en window: lo que corre después de un await ya la encuentra apagada).
//  - La Carga: la N-0032 (FERNANDEZ RICARDO, 42 cajas) abierta en "Mis
//    retiros" → la hoja ya está armada → Imprimir llama a print EN el toque, y
//    la hoja tiene original y duplicado en una sola A4 con la línea de corte.
//  - Reimprimir desde la fila sin abrir la orden → no imprime fuera del toque:
//    aparece "Listo, imprimir", y ese botón imprime en SU toque.
//  - Administración: la orden abierta → Imprimir en el toque.
//  - El PDF real (html2canvas + jsPDF): la N-0032 en UNA página con las DOS
//    copias; una orden larga, cada copia en sus hojas.
// Corre SIEMPRE, sin credenciales.
const { test, expect, devices } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const { defaultBrowserType, ...IPHONE } = devices['iPhone 13'];
void defaultBrowserType;
test.use({ ...IPHONE, browserName: 'webkit' });

// La N-0032 como la devolvería mis_ordenes_retiro (1 renglón, 42 cajas).
const N0032 = {
  orden_id: 'o-n32', codigo: 'N-0032', fecha: '2026-10-26', estado: 'confirmada', cliente: 'FERNANDEZ RICARDO', transporte: null, observaciones: null,
  cargada_en: '2026-10-26T13:00:00Z',
  renglones: [{ orden: 1, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 42, unidades: 4200, movimiento: 'retiro', item_id: 'it-n32', lotes: [{ lote: '7030-1', cajas: 42 }] }],
};

// window.print de mentira: anota si se llamó dentro del toque.
async function espiarImpresion(page) {
  await page.evaluate(() => {
    window.__prints = [];
    let enToque = false;
    document.addEventListener('click', () => { enToque = true; }, true);
    window.addEventListener('click', () => { enToque = false; });
    window.print = () => { window.__prints.push({ enToque }); };
  });
}
const impresiones = (page) => page.evaluate(() => window.__prints);

async function abrirCarga(page) {
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ N0032 }) => {
    const datos = await fetch('/maqueta/datos/retiros.json').then(r => r.json());
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc: { mis_ordenes_retiro: [N0032, ...datos.rpc.mis_ordenes_retiro] } }));
    localStorage.removeItem('retiros.borrador');
  }, { N0032 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await espiarImpresion(page);
  await page.locator('[data-empresa="u-n"]').click();
  await page.locator('#rt-btn-mis').click();
  await expect(page.locator('[data-mia="o-n32"]')).toBeVisible();
}

test('iPhone, la Carga: la N-0032 abierta se imprime EN el toque, original y duplicado en una A4', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await abrirCarga(page);
  await page.locator('[data-mia="o-n32"]').click();
  await expect(page.locator('#rt-vista-mio')).toBeVisible();
  // La hoja se arma al abrir la orden, antes de tocar Imprimir.
  await expect.poll(() => page.locator('#rt-impresion').innerHTML()).toContain('N-0032');
  await page.locator('#rt-mio-imprimir').click();
  expect(await impresiones(page), 'una impresión, dentro del toque').toEqual([{ enToque: true }]);
  await expect(page.locator('#rh-listo')).toHaveCount(0);
  // Una sola página, con las dos copias y la línea de corte.
  const hoja = page.locator('#rt-impresion');
  await expect(hoja.locator('.rh-hoja--media .rh-pagina')).toHaveCount(1);
  await expect(hoja.locator('.rh-copia')).toHaveCount(2);
  await expect(hoja.locator('.rh-corte')).toHaveCount(1);
  await expect(hoja.locator('.rh-titulo__copia')).toHaveText(['ORIGINAL', 'DUPLICADO']);
  await expect(hoja.locator('.rh-copia').first()).toContainText('FERNANDEZ RICARDO');
  await expect(hoja.locator('.rh-copia').first()).toContainText('42');
  await page.emulateMedia({ media: 'print' });
  await captura(page, 'iphone-hoja-n0032', info);
  await page.emulateMedia({ media: 'screen' });
  expect(errores, errores.join('\n')).toEqual([]);
});

test('iPhone, la Carga: Reimprimir sin abrir la orden pide "Listo, imprimir", que imprime en su toque', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await abrirCarga(page);
  await page.locator('[data-mia-imprimir="o-n32"]').click();
  // Fuera del toque NO se llama a print (en el iPhone no haría nada).
  const listo = page.locator('#rh-listo');
  await expect(listo).toBeVisible();
  await expect(listo).toContainText('La hoja está lista.');
  expect(await impresiones(page), 'antes de "Listo", ninguna impresión').toEqual([]);
  await expect(page.locator('#rt-impresion')).toContainText('N-0032');
  await captura(page, 'iphone-listo-imprimir', info);
  const caja = await listo.boundingBox();
  const vp = page.viewportSize();
  expect(caja.x >= 0 && caja.x + caja.width <= vp.width && caja.y + caja.height <= vp.height, 'el cartel entra en la pantalla').toBe(true);
  await listo.getByRole('button', { name: 'Listo, imprimir' }).click();
  expect(await impresiones(page), '"Listo, imprimir" imprime dentro de su toque').toEqual([{ enToque: true }]);
  await expect(listo).toHaveCount(0);
  // La misma orden otra vez: la hoja ya quedó armada, así que imprime directo en el toque.
  await page.locator('[data-mia-imprimir="o-n32"]').click();
  expect(await impresiones(page), 'la segunda vez, en el toque y sin cartel').toEqual([{ enToque: true }, { enToque: true }]);
  await expect(page.locator('#rh-listo')).toHaveCount(0);
  // Otra orden sin armar: el cartel; Cancelar no imprime.
  await page.locator('[data-mia-imprimir]:not([data-mia-imprimir="o-n32"])').first().click();
  await page.locator('#rh-listo').getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('#rh-listo')).toHaveCount(0);
  expect((await impresiones(page)).length, 'Cancelar no imprime').toBe(2);
  expect(errores, errores.join('\n')).toEqual([]);
});

test('iPhone, Administración: la orden abierta se imprime EN el toque, con precios', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'u-n'); });
  await page.reload();
  await espiarImpresion(page);
  await page.locator('[data-pestana="ordenes"]').first().click();
  await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
  await expect(page.locator('#ad-vista-orden')).toBeVisible();
  await expect.poll(() => page.locator('#ad-impresion').innerHTML()).toContain('N-0013');
  await page.locator('#ad-btn-imprimir').click();
  expect(await impresiones(page), 'una impresión, dentro del toque').toEqual([{ enToque: true }]);
  await expect(page.locator('#ad-impresion .rh-copia')).toHaveCount(2);
  await expect(page.locator('#ad-impresion')).toContainText('PRECIO');
  expect(errores, errores.join('\n')).toEqual([]);
});

test('el PDF de "Enviar": la N-0032 en UNA página con original y duplicado; una larga, cada copia en sus hojas', async ({ page }) => {
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
  const hoja = (n) => ({
    codigo: 'N-0032', estado: 'confirmada', fecha: '2026-10-26', cargadaEn: '2026-10-26T13:00:00Z', cargadaPor: 'Emanuel Romero',
    empresa: { id: 'u-n', nombre: 'Cucuruchos Nuss', logo_url: 'logo-cucuruchos-nuss.png' },
    cliente: { nombre: 'FERNANDEZ RICARDO' },
    renglones: Array.from({ length: n }, (_, i) => ({ producto: 'Cucurucho grande ' + (i + 1), presentacion: 'Caja x 100', cono: 'Sin cono', cajas: n === 1 ? 42 : 2, unidades: 200, lotes: [{ lote: '7030-' + i, cajas: 2 }] })),
  });
  const r = await page.evaluate(async ({ corta, larga }) => {
    const m = await import('/js/retiros-comun.js');
    for (const url of m.LIBRERIAS_PDF) await m.cargarScript(url);
    const original = window.html2canvas;
    let fotos = [];
    window.html2canvas = (el, op) => { fotos.push(el.textContent); return original(el, op); };
    const paginas = async (o) => { fotos = []; const b = await m.generarPdf(o, { conPrecios: false }); const t = await b.text(); return { paginas: (t.match(/\/Type\s*\/Page\b(?!s)/g) || []).length, fotos }; };
    return { corta: await paginas(corta), larga: await paginas(larga) };
  }, { corta: hoja(1), larga: hoja(60) });
  expect(r.corta.paginas, 'la N-0032: una sola página').toBe(1);
  expect(r.corta.fotos[0], 'con el original').toContain('ORIGINAL');
  expect(r.corta.fotos[0], 'y el duplicado, en la misma').toContain('DUPLICADO');
  const n = r.larga.paginas;
  expect(n % 2, 'la larga: las hojas del original y las del duplicado').toBe(0);
  expect(n).toBeGreaterThanOrEqual(4);
  expect(r.larga.fotos.slice(0, n / 2).every(t => t.includes('ORIGINAL') && !t.includes('DUPLICADO')), 'primero las hojas del original').toBe(true);
  expect(r.larga.fotos.slice(n / 2).every(t => t.includes('DUPLICADO')), 'después las del duplicado').toBe(true);
});
