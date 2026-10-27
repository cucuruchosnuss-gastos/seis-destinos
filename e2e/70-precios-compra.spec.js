// El precio de compra en el Ingreso de materia prima (27/10/2026, rama
// ci-prueba/precios-compra), en la maqueta "precios-compra-mp": un ingreso sin
// comprobante de 20 bolsas de 25 kg de Harina 000. El bloque "Precio" del
// renglón: "Precio unitario sin IVA", IVA 0 fijo (sin comprobante), "por bolsa
// de 25 kg / por kg", "$ 17.500,00 la bolsa = $ 700,00 el kg" y el final con
// IVA; al confirmar, materia_prima_items lleva precio_unitario 700 (por kg, sin
// IVA) y alicuota_iva 0. A 390 y 1280 px, sin scroll horizontal ni errores.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// Los insert, como los anota la maqueta en la consola.
function anotar(page) {
  const pendientes = [];
  page.on('console', m => {
    if (!m.text().startsWith('[maqueta] insert')) return;
    const [, nombre, filas] = m.args();
    pendientes.push(Promise.all([nombre?.jsonValue(), filas?.jsonValue()])
      .then(([n, f]) => ({ tabla: n, filas: f }), () => ({ tabla: null, filas: null })));
  });
  return { leidas: () => Promise.all(pendientes) };
}

for (const ancho of [390, 1280]) {
  test(`ingreso: el precio por bolsa se guarda por kg, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const inserts = anotar(page);
    await page.setViewportSize({ width: ancho, height: 860 });
    await page.goto(`${MAQUETA}/modulos/materia-prima.html?maqueta=precios-compra-mp`);
    await page.locator('#btn-abrir-wizard').click();
    await page.locator('#btn-sin-comprobante').click();
    await expect(page.locator('#wz-paso-datos')).toBeVisible();
    await page.locator('#campo-fecha').fill('2026-10-27');
    await page.locator('#campo-unidad-negocio').selectOption('u-n');
    await page.locator('#campo-buscar-proveedor').fill('molino');
    await page.locator('#wz-sugerencias-proveedor [data-proveedor="prov-molino"]').click();
    await page.locator('#btn-datos-continuar').click();
    await expect(page.locator('#wz-paso-items')).toBeVisible();

    // 20 bolsas de 25 kg de Harina 000.
    await page.locator('#btn-agregar-item').click();
    await page.locator('#wz-lista-items [data-rol="buscador-catalogo"]').fill('harina');
    await page.locator('#wz-lista-items [data-insumo="ins-harina"]').click();
    await page.locator('[data-accion="interp-bultos"]').click();
    await page.locator('[data-campo="numeroPapel"]').fill('20');
    await page.locator('[data-campo="contenido"]').fill('25');
    await page.locator('[data-campo="lote"]').fill('L-2710');

    // El precio: sin comprobante va sin IVA, sin elegir.
    const precio = page.locator('[data-bloque="precio"]');
    await expect(precio).toContainText('Precio unitario sin IVA');
    await expect(precio.locator('.mp-precio__iva-fijo')).toHaveText('IVA 0 % (sin comprobante: va sin IVA)');
    await expect(precio.locator('[data-precio="iva"]')).toHaveCount(0);
    await expect(precio.locator('[data-precio-falta]')).toBeHidden();
    await expect(precio.locator('[data-accion="precio-por-bulto"]')).toHaveText('por bolsa de 25 kg');
    await precio.locator('[data-accion="precio-por-bulto"]').click();
    await expect(precio.locator('[data-accion="precio-por-bulto"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-bloque="precio"] [data-precio="precio"]').pressSequentially('17500');
    await expect(page.locator('[data-precio="precio"]')).toHaveValue('17.500');
    await expect(page.locator('[data-precio-equivale]')).toHaveText('$ 17.500,00 la bolsa = $ 700,00 el kg');
    await expect(page.locator('[data-precio-final]')).toHaveText('Precio final con IVA: $ 17.500,00 la bolsa · $ 700,00 el kg');
    await sinScrollHorizontal(page);
    await captura(page, `precios-mp-renglon-${ancho}`, info);

    // Pasarlo a "por kg" re-dibuja con el mismo número tipeado, ahora por kg.
    await page.locator('[data-accion="precio-por-unidad"]').click();
    await expect(page.locator('[data-precio-equivale]')).toBeHidden();
    await expect(page.locator('[data-precio-final]')).toHaveText('Precio final con IVA: $ 17.500,00 el kg');
    await page.locator('[data-accion="precio-por-bulto"]').click();
    await expect(page.locator('[data-precio-equivale]')).toHaveText('$ 17.500,00 la bolsa = $ 700,00 el kg');

    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('#wz-paso-confirmar')).toBeVisible();
    await page.locator('#btn-confirmar-ingreso').click();
    await expect(page.locator('#pantalla-ingresos')).toBeVisible();

    const items = (await inserts.leidas()).find(i => i.tabla === 'materia_prima_items');
    expect(items?.filas?.length).toBe(1);
    expect(items.filas[0].precio_unitario, 'por kg y sin IVA').toBe(700);
    expect(items.filas[0].alicuota_iva).toBe(0);
    expect(items.filas[0].cantidad).toBe(500);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
