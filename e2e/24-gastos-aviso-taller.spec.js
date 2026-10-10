// Gastos (02/10/2026): en el paso donde se elige la empresa del gasto, si se
// elige una que NO es el Taller y hay algún proyecto abierto, aparece en
// chico "¿Es de un proyecto del Taller? Elegí Taller." — debajo de las
// empresas y arriba de las categorías (tocar una empresa avanza solo hasta
// ahí). "Elegí Taller." pone el Taller. A 390 y 1280 px, en la maqueta, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TEXTO = '¿Es de un proyecto del Taller? Elegí Taller.';

async function hastaElDestino(page) {
  await page.locator('#btn-nuevo-gasto').click();
  await page.locator('#btn-sin-foto').click();
  await page.locator('#campo-fecha').fill('2026-10-02');
  await page.locator('#campo-fecha-pago').fill('2026-10-02');
  await page.locator('#campo-razon-social').fill('Ferretería del Centro');
  await page.locator('#campo-importe').fill('1500');
  await page.locator('#grilla-medio-pago .btn-tipo-doc[data-valor="efectivo"]').click();
  await page.locator('#btn-datos-siguiente').click();
  await expect(page.locator('#sp-destino')).toBeVisible();
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: elegir otra empresa avisa del Taller, y "Elegí Taller." lo pone`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/gastos.html?maqueta=gastos`);
    await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'todas'); sessionStorage.removeItem('maqueta.cambios'); });
    await page.reload();
    await hastaElDestino(page);
    // Todavía no eligió ninguna empresa: no hay aviso.
    await expect(page.locator('#aviso-taller-destino')).toBeHidden();

    // Elige Nuss: avanza a Categoría y el aviso está arriba, en chico.
    await page.locator('#grilla-destino .tarjeta-destino[data-id="u-n"]').click();
    await expect(page.locator('#sp-categoria')).toBeVisible();
    const aviso = page.locator('#aviso-taller-categoria');
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText(TEXTO);
    const letra = await aviso.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    expect(letra, 'en chico').toBeLessThan(15);
    await captura(page, `gastos-aviso-taller-${ancho}`, info);

    // Volver: debajo de las empresas también está.
    await page.locator('#btn-categoria-atras').click();
    await expect(page.locator('#aviso-taller-destino')).toBeVisible();
    await expect(page.locator('#aviso-taller-destino')).toHaveText(TEXTO);
    const sinScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(sinScroll, 'sin scroll horizontal').toBe(true);

    // "Elegí Taller.": pone el Taller y el aviso se va.
    await page.locator('#aviso-taller-destino [data-elegir-taller]').click();
    await expect(page.locator('#sp-categoria')).toBeVisible();
    await expect(page.locator('#aviso-taller-categoria')).toBeHidden();
    await page.locator('#btn-categoria-atras').click();
    await expect(page.locator('#grilla-destino .tarjeta-destino[data-id="u-t"]')).toHaveClass(/seleccionada/);
    await expect(page.locator('#aviso-taller-destino')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('390 px: sin proyectos abiertos no hay aviso', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/gastos.html?maqueta=gastos`);
  await page.evaluate(() => {
    localStorage.setItem('barraUnidad.elegida', 'todas');
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { proyectos: [
      { id: 'p-x', nombre: 'Horno entregado', activo: true, estado: 'entregado' },
    ] } }));
  });
  await page.reload();
  await hastaElDestino(page);
  await page.locator('#grilla-destino .tarjeta-destino[data-id="u-n"]').click();
  await expect(page.locator('#sp-categoria')).toBeVisible();
  await expect(page.locator('#aviso-taller-categoria')).toBeHidden();
  await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
  expect(errores, errores.join('\n')).toEqual([]);
});
