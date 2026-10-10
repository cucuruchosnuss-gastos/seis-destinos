// La barra de abajo del celular a gusto de cada persona (05/10/2026), en la
// maqueta (el tablero del dueño, que ve todos los módulos):
//  - a 360 y 390 px entran Inicio + 4 módulos + "Más", sin amontonarse ni
//    scroll de costado, con los íconos y los nombres un poco más grandes;
//  - "Más" → "Editar la barra de abajo": sacar, agregar y ordenar; Guardar
//    sube SOLO barra_inferior y el objeto entero con el tablero que tenía la
//    cuenta (no lo borra); la barra queda con lo elegido;
//  - un toque largo sobre la barra abre el editor y no navega;
//  - a 1280 px la barra lateral de la compu no cambia y la de abajo no está.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
// Lo que la cuenta tiene guardado de la pantalla principal (no se puede perder).
const TABLERO = { orden: ['caja', 'gastos', 'cobranzas'], tamanos: { caja: 'ancha' }, ocultas: ['stock'] };
const CUENTA = { v: 1, barra: { orden: 'mano', manual: [], fijados: ['gastos'] }, tablero: TABLERO, uso: {} };

async function abrir(page, ancho) {
  await page.setViewportSize({ width: ancho, height: 800 });
  await page.goto(`${MAQUETA}/dashboard.html?maqueta=tablero`);
  await page.evaluate((c) => sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc: { mis_preferencias: c } })), CUENTA);
  await page.reload();
}
// Lo que se manda a guardar_mis_preferencias (la maqueta lo escribe en la consola).
function guardadas(page) {
  const lista = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc guardar_mis_preferencias')) return;
    try { lista.push((await m.args()[2].jsonValue())?.p_datos); } catch { /* nada */ }
  });
  return lista;
}
const tabs = (page) => page.$$eval('.barra-abajo .barra-abajo__tab', ts => ts.map(t => t.dataset.clave));

for (const ancho of [360, 390]) {
  test(`celular (${ancho} px): Inicio + 4 + Más, cómodos y sin amontonarse`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho);
    const barra = page.locator('.barra-abajo');
    await expect(barra).toBeVisible();
    await expect.poll(() => tabs(page).then(t => t.length)).toBe(6);
    const t = await tabs(page);
    expect(t[0]).toBe('inicio');
    expect(t.at(-1)).toBe('mas');
    const medidas = await page.$$eval('.barra-abajo .barra-abajo__tab', ts => ts.map(x => { const r = x.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width, h: r.height }; }));
    for (const m of medidas) {
      expect(m.w, 'cada tab, cómoda de tocar').toBeGreaterThanOrEqual(56);
      expect(m.h).toBeGreaterThanOrEqual(60);
      expect(m.r).toBeLessThanOrEqual(ancho + 0.5);
    }
    for (let i = 1; i < medidas.length; i++) expect(medidas[i].l, 'no se pisan').toBeGreaterThanOrEqual(medidas[i - 1].r - 0.5);
    const letra = await page.$eval('.barra-abajo__nombre', e => parseFloat(getComputedStyle(e).fontSize));
    expect(letra, 'el nombre un poco más grande').toBeGreaterThanOrEqual(12.5);
    const icono = await page.$eval('.barra-abajo__icono svg', e => e.getBoundingClientRect().width);
    expect(icono, 'el ícono un poco más grande').toBeGreaterThanOrEqual(23);
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, 'sin scroll de costado').toBeLessThanOrEqual(vista);
    await captura(page, `barra-abajo-${ancho}`, info);
    expect(errores).toEqual([]);
  });
}

test('celular (390 px): elegir y ordenar la barra; guardar no borra el tablero', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  const lista = guardadas(page);
  await abrir(page, 390);
  await expect.poll(() => tabs(page).then(t => t.length)).toBe(6);
  await page.locator('#barra-abajo-mas').click();
  await page.locator('#hoja-mas-editar').click();
  const editor = page.locator('.hoja-abajo');
  await expect(editor).toBeVisible();
  await expect(editor).toContainText('En la barra · 4 de 4');
  await captura(page, 'barra-abajo-editor-390', info);
  // Sacar los cuatro y armarla de cero: Stock, Caja, Pedidos; Caja primero.
  const actuales = (await tabs(page)).slice(1, -1);
  for (const c of actuales) await editor.locator(`[data-abajo-sacar="${c}"]`).click();
  await expect(editor).toContainText('Todavía no elegiste ninguno');
  for (const c of ['stock', 'caja', 'pedidos']) await editor.locator(`[data-abajo-agregar="${c}"]`).click();
  await editor.locator('[data-abajo-subir="caja"]').click();
  await expect(editor).toContainText('En la barra · 3 de 4');
  const sinScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(sinScroll).toBe(true);
  await editor.locator('#editar-abajo-guardar').click();
  await expect(editor).toBeHidden();
  await expect.poll(() => tabs(page).then(t => t.join())).toBe('inicio,caja,stock,pedidos,mas');
  await expect.poll(() => lista.filter(d => d && 'barra_inferior' in d).length).toBeGreaterThan(0);
  const g = lista.filter(d => d && 'barra_inferior' in d).at(-1);
  expect(g.barra_inferior).toEqual(['caja', 'stock', 'pedidos']);
  expect(g.tablero, 'el tablero de la cuenta queda como estaba').toEqual(TABLERO);
  expect(g.barra.fijados).toEqual(['gastos']);
  await captura(page, 'barra-abajo-elegida-390', info);
  expect(errores).toEqual([]);
});

test('celular (390 px): un toque largo abre el editor y no navega', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrir(page, 390);
  await expect.poll(() => tabs(page).then(t => t.length)).toBe(6);
  const antes = page.url();
  const caja = await page.locator('.barra-abajo .barra-abajo__tab').nth(1).boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await expect(page.locator('.hoja-abajo')).toBeVisible();
  expect(page.url()).toBe(antes);
  await page.keyboard.press('Escape');
  await expect(page.locator('.hoja-abajo')).toBeHidden();
  expect(errores).toEqual([]);
});

test('compu (1280 px): la barra lateral no cambia y la de abajo no está', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await abrir(page, 1280);
  await expect(page.locator('.barra-lateral')).toBeVisible();
  await expect(page.locator('.barra-abajo')).toBeHidden();
  await expect(page.locator('#hoja-mas-editar')).toBeHidden();
  const items = await page.$$eval('.barra-lateral .barra-lateral__item', is => is.map(i => i.dataset.clave));
  expect(items[0]).toBe('inicio');
  expect(items[1], 'el fijado de la cuenta arriba, como siempre').toBe('gastos');
  expect(items.length).toBeGreaterThan(8);
  await captura(page, 'barra-abajo-compu-1280', info);
  expect(errores).toEqual([]);
});
