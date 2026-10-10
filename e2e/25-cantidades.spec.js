// Cómo se pide una cantidad (05/10/2026), en la maqueta `cantidades`. El caso
// que lo motivó: 1 bolsa de azúcar de Nuss a Mengui se mandó como 1 kg.
//  - Stock → Enviar a otra unidad: el azúcar (vista en bultos, bolsas de 50 kg)
//    pide "bultos de 50 kg" y debajo "= 50 kg"; la harina (vista en kilos)
//    pide "kg"; la lecitina (un lote en dos presentaciones) pide "kg" con el
//    aviso. A la base van 50 y 1.
//  - Ingreso → Ingresos internos: lo mismo al recibir.
// A 390 y 1280 px, sin scroll horizontal ni errores. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const nb = s => String(s ?? '').replace(/ /g, ' ');

// Lo que la pantalla le manda a la base: la maqueta lo escribe en la consola.
function anotarRpc(page) {
  const llamadas = [];
  page.on('console', async m => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { llamadas.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* sin params */ }
  });
  return llamadas;
}

async function sinScroll(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

for (const ancho of [390, 1280]) {
  test(`stock: enviar a otra fábrica pide la cantidad como está configurado el insumo, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=cantidades`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();

    await page.locator('#btn-enviar-transferencia').click();
    await page.locator('[data-destino-transf="u-d"]').click();

    // Con un lote de una sola presentación, el campo aparece solo; con dos,
    // recién al elegir la presentación.
    const agregar = async (buscar, id, { esperarCampo = true } = {}) => {
      await page.locator('#btn-transf-agregar-item').click();
      await page.locator('#ti-buscar-insumo').fill(buscar);
      await page.locator(`[data-sug-ti="${id}"]`).click();
      if (esperarCampo) await expect(page.locator('#ti-campo-cantidad')).toBeVisible();
    };

    // El azúcar: en bultos de 50 kg.
    await agregar('Azúcar', 'i-azucar');
    await expect(page.locator('#ti-unidad-cantidad')).toHaveText(/bultos de 50\skg/);
    await page.locator('#ti-cantidad').fill('1');
    await expect(page.locator('#ti-equivale-cantidad')).toBeVisible();
    expect(nb(await page.locator('#ti-equivale-cantidad').textContent())).toBe('= 50 kg');
    await captura(page, `cantidades-envio-azucar-${ancho}`, info);
    await sinScroll(page);
    await page.locator('#btn-transf-confirmar-item').click();
    await expect(page.locator('#modal-transf-item')).toBeHidden();

    // La harina: en kilos aunque venga en bolsas de 25.
    await agregar('Harina', 'i-harina');
    await expect(page.locator('#ti-unidad-cantidad')).toHaveText('kg');
    await expect(page.locator('#ti-equivale-cantidad')).toBeHidden();
    await page.locator('#ti-cantidad').fill('1');
    await page.locator('#btn-transf-confirmar-item').click();
    await expect(page.locator('#modal-transf-item')).toBeHidden();

    // La lecitina: un lote en dos presentaciones → en kg, con el aviso.
    await agregar('Lecitina', 'i-lecitina', { esperarCampo: false });
    await page.locator('[data-pres-ti="50"]').click();
    await expect(page.locator('#ti-unidad-cantidad')).toHaveText('kg');
    await expect(page.locator('#ti-aviso-unidad')).toBeVisible();
    expect(nb(await page.locator('#ti-aviso-unidad').textContent())).toMatch(/25 kg y de 50 kg.*se pide en kg/);
    await captura(page, `cantidades-envio-lecitina-${ancho}`, info);
    await page.locator('[data-cerrar-transf-item]').last().click();

    await expect(page.locator('#transf-lista-items')).toContainText('Azúcar');
    await page.locator('#btn-confirmar-transf').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'crear_transferencia_stock')).toBeTruthy();
    const items = rpc.find(r => r.nombre === 'crear_transferencia_stock').params.p_items;
    expect(items.map(i => i.cantidad), JSON.stringify(items)).toEqual([50, 1]);

    await sinScroll(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`stock: corregir stock pide la cantidad como está configurado el insumo, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=cantidades`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();

    await page.locator('#btn-registrar-movimiento').click();
    await page.locator('#mov-modos [data-modo="baja"]').click();
    await page.locator('#mov-buscar-insumo').fill('Azúcar');
    await page.locator('[data-sug-mov="i-azucar"], #mov-sugerencias .rec-sug').first().click();
    await page.locator('#mov-lote').fill('L-AZ');
    await page.locator('#mov-chips-presentacion [data-presentacion="50"]').click();
    await expect(page.locator('#mov-unidad-cantidad')).toHaveText(/bultos de 50\skg/);
    await page.locator('#mov-cantidad').fill('1');
    expect(nb(await page.locator('#mov-equivale-cantidad').textContent())).toBe('= 50 kg');
    await page.locator('#mov-motivo-tipo').selectOption('rotura');
    await page.locator('#mov-motivo').fill('Se rompió una bolsa en el depósito');
    await captura(page, `cantidades-baja-azucar-${ancho}`, info);
    await sinScroll(page);
    await page.locator('#btn-confirmar-mov').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'registrar_baja_stock')).toBeTruthy();
    const p = rpc.find(r => r.nombre === 'registrar_baja_stock').params;
    expect(p.p_cantidad, JSON.stringify(p)).toBe(50);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`ingreso: recibir un envío pide la cantidad como está configurado el insumo, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/materia-prima.html?maqueta=cantidades`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();

    await page.locator('#btn-abrir-internos').click();
    await page.locator('[data-transito="t-c"]').click();
    const items = page.locator('#internos-items .int-item');
    await expect(items).toHaveCount(2);

    // El azúcar: en bultos de 50 kg, con "= 50 kg" debajo.
    const azucar = items.nth(0);
    await expect(azucar.locator('.cantidad-fila__unidad')).toHaveText(/bultos de 50\skg/);
    await azucar.locator('[data-rec="bultos"]').fill('1');
    await expect(azucar.locator('.int-equivale')).toBeVisible();
    expect(nb(await azucar.locator('.int-equivale').textContent())).toBe('= 50 kg');

    // La harina: en kilos, aunque el renglón venga en bolsas de 25.
    const harina = items.nth(1);
    await expect(harina.locator('.cantidad-fila__unidad')).toHaveText('kg');
    await harina.locator('[data-rec="base"]').fill('1');
    await captura(page, `cantidades-recepcion-${ancho}`, info);
    await sinScroll(page);

    await page.locator('#btn-internos-aceptar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'responder_transferencia_stock')).toBeTruthy();
    const p = rpc.find(r => r.nombre === 'responder_transferencia_stock').params;
    expect(p.p_items.map(i => i.cantidad_recibida), JSON.stringify(p.p_items)).toEqual([50, 1]);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
