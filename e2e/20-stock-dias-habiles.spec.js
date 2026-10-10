// Para cuántos días hábiles alcanza (02/10/2026), en la maqueta: el cartelito
// debajo de cada insumo (rojo / amarillo / gris), "N insumos alcanzan para 7
// días hábiles o menos" arriba, que al tocarlo filtra, y la barra de fábricas
// manda. A 390 y 1280 px, sin scroll horizontal ni errores. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

for (const ancho of [390, 1280]) {
  test(`stock: para cuántos días hábiles alcanza, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    const lista = page.locator('#lista-stock');
    await expect(lista.locator('.cobertura--rojo')).toHaveText('Alcanza para ~2 días hábiles');
    await expect(lista.locator('.cobertura--amarillo')).toHaveText('Alcanza para ~6 días hábiles');
    await expect(lista.locator('.cobertura--gris')).toContainText('Alcanza para ~11 días hábiles (estimado con 1 día)');
    const aviso = page.locator('#stock-cobertura-aviso');
    await expect(aviso).toContainText('2 insumos alcanzan para 7 días hábiles o menos');
    await captura(page, `stock-dias-${ancho}`, info);

    // Tocarlo filtra a esos dos; otra vez, vuelve todo.
    await aviso.click();
    await expect(lista.locator('[data-stock]')).toHaveCount(2);
    await expect(lista).not.toContainText('Harina 000');
    await expect(aviso).toContainText('Ver todos');
    await captura(page, `stock-dias-filtrado-${ancho}`, info);
    await aviso.click();
    await expect(lista.locator('[data-stock]')).toHaveCount(3);

    // Dolce: el azúcar sin consumo no tiene cartelito, y nada apura.
    await page.locator('.barra-unidad__chip[data-unidad="u-d"]').first().click();
    await expect(lista).toContainText('Azúcar');
    await expect(lista.locator('.cobertura--rojo, .cobertura--amarillo')).toHaveCount(0);
    await expect(aviso).toBeHidden();

    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
