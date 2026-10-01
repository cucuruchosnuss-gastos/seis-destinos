// La cobranza YA ASENTADA (01/10/2026) y el ingreso externo de Caja, en la
// maqueta: quien controla las cobranzas elige primero la empresa y después un
// cliente de esa empresa; en Caja, "Ingreso externo (préstamos, aportes)" para
// un super_admin y los ajustes de saldo en gris. A 390 y 1280 px, sin scroll
// horizontal ni errores. Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';

for (const ancho of [390, 1280]) {
  test(`cobranza ya asentada: empresa y después sus clientes, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.locator('#cob-btn-nueva').click();
    await expect(page.locator('#cob-asentar')).toBeVisible();
    await expect(page.locator('#cob-campo-cliente-libre')).toBeHidden();
    const empresas = page.locator('#cob-empresas [data-empresa]');
    await expect(empresas).toHaveCount(2);
    await expect(page.locator('#cob-empresas')).not.toContainText('Pruebas');
    await expect(page.locator('#cob-btn-guardar')).toHaveText('Guardar y asentar');
    // Dolce Pasta: solo sus clientes.
    await page.locator('#cob-empresas [data-empresa="u-d"]').click();
    await expect(page.locator('#cob-empresas [data-empresa="u-d"]')).toHaveAttribute('aria-pressed', 'true');
    const clientes = page.locator('#cob-lista-clientes [data-cliente-id]');
    await expect(clientes).toHaveCount(2);
    await expect(page.locator('#cob-lista-clientes')).not.toContainText('Laponia');
    await captura(page, `cobranza-asentada-clientes-${ancho}`, info);
    await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-d"]').click();
    await expect(page.locator('#cob-lista-clientes')).toContainText('J&M');
    await expect(page.locator('#cob-asentar-buscar')).toBeHidden();
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `cobranza-asentada-elegido-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('cobranza ya asentada: con la barra en Nuss viene marcada Nuss', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
  await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
  await page.reload();
  await page.locator('#cob-btn-nueva').click();
  await expect(page.locator('#cob-empresas [data-empresa="u-n"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cob-lista-clientes [data-cliente-id="cli-lap-n"]')).toBeVisible();
  await expect(page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-d"]')).toHaveCount(0);
  expect(errores, errores.join('\n')).toEqual([]);
});

// Caja con una empresa elegida arriba (01/10/2026): la ficha de Empresa
// muestra TODO lo de esa empresa, salga de la caja que salga.
for (const ancho of [390, 1280]) {
  test(`caja: con Nuss arriba aparece el gasto de Nuss pagado desde la caja de Beto; con Dolce no (${ancho} px)`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/caja.html?maqueta=caja`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    await page.locator('#btn-empresa-atajo').first().click();
    const lista = page.locator('#detalle-persona-movimientos');
    await expect(lista).toContainText('Repuesto de la máquina de Nuss');
    await expect(lista.locator('.tarjeta-movimiento', { hasText: 'Repuesto de la máquina de Nuss' })).toContainText('Beto Dolce');
    await expect(page.locator('#detalle-persona-totales')).toContainText('Entradas y salidas');
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `caja-empresa-nuss-${ancho}`, info);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-d'));
    await page.reload();
    await page.locator('#btn-empresa-atajo').first().click();
    await expect(page.locator('#detalle-persona-totales')).toContainText('Dolce Pasta');
    await expect(lista).not.toContainText('Repuesto de la máquina de Nuss');
    await expect(lista).toContainText('Depósito');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

for (const ancho of [390, 1280]) {
  test(`caja: ingreso externo para super_admin y el ajuste en gris, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/caja.html?maqueta=caja`);
    await page.locator('#btn-empresa-atajo').first().click();
    const boton = page.locator('#btn-detalle-ingreso-externo');
    await expect(boton).toHaveText('Ingreso externo (préstamos, aportes)');
    const ajuste = page.locator('.tarjeta-movimiento--ajuste');
    await expect(ajuste).toHaveCount(1);
    await expect(ajuste).toContainText('Ajuste');
    await expect(ajuste).toContainText('Diferencia del arqueo de septiembre');
    await expect(ajuste).toContainText('no se edita ni se borra');
    await boton.click();
    await expect(page.locator('#movimiento-titulo')).toHaveText('Ingreso externo (préstamos, aportes)');
    await expect(page.locator('#aviso-ingreso-cliente')).toHaveText('La plata de un cliente se carga en Cobranzas');
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `caja-ingreso-externo-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
