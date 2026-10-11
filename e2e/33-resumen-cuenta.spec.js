// EL RESUMEN DE CUENTA (11/10/2026, js/resumen-cuenta.js). En la maqueta
// (Supabase falso, sin credenciales), a 1280 y 390 px, con el reloj en el
// 11/10/2026 (así "Mes pasado" es septiembre):
//  - Proveedor (Cuentas corrientes, Harinera Uno): el panel abre con el mes
//    pasado y "Todas, separadas" (la barra está en Todas y tiene cuenta en las
//    dos empresas): una sección por empresa, con su saldo anterior y su saldo
//    final (Nuss 300.000,00 → 502.500,50; Dolce 0,00 → 0,00), el cheque
//    endosado nombrado y la empresa con su razón social y CUIT;
//  - elegir una empresa deja una sola sección; elegir otras fechas cambia el
//    saldo (al 31/10, la descarga sin importe dice "—" y el aviso);
//  - Cliente (Administración, Distribuidora Anatolia): la cuenta de Nuss y la
//    de Dolce Pasta (el mismo CUIT), con su Debe y Haber;
//  - "Imprimir" deja la hoja sola para imprimir (page.pdf en modo print);
//  - Escape cierra el panel y el foco vuelve al botón;
//  - sin scroll de costado y sin errores de JavaScript.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { vigilarErrores } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const RESULTADOS = path.join(__dirname, 'resultados');

async function sinCostado(page, ancho) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w, 'scroll de costado').toBeLessThanOrEqual(ancho);
}

async function elegirFechas(page, desde, hasta) {
  await page.locator('#rc-periodo').click();
  await page.locator('#rc-periodo-panel [data-periodo-elegir]').click();
  await page.fill('#rc-periodo-desde', desde);
  await page.fill('#rc-periodo-hasta', hasta);
  await page.locator('#rc-periodo-panel [data-periodo-aplicar]').click();
}

for (const ancho of [1280, 390]) {
  const alto = ancho === 390 ? 844 : 900;

  test(`Proveedor: mes pasado, todas separadas, una empresa y otras fechas, a ${ancho}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-11T15:00:00Z'));
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=resumen-proveedor`);
    await page.locator('#tab-proveedores .btn-ver-cuenta[data-proveedor="p1"][data-unidad="u-n"]').click();
    const boton = page.locator('#btn-resumen-cuenta-ficha');
    await expect(boton).toBeVisible();
    await boton.click();

    const vista = page.locator('#rc-vista');
    await expect(vista.locator('.rc-seccion')).toHaveCount(2);
    await expect(page.locator('#rc-periodo')).toContainText('Mes pasado');
    await expect(page.locator('#rc-empresa')).toHaveValue('todas');
    const nuss = vista.locator('.rc-seccion', { hasText: 'Cucuruchos Nuss' });
    await expect(nuss).toContainText('RESUMEN DE CUENTA');
    await expect(nuss).toContainText('SEIS DESTINOS SAS');
    await expect(nuss).toContainText('CUIT 30719434777');
    await expect(nuss).toContainText('Harinera Uno SA');
    await expect(nuss).toContainText('CUIT 30111111118');
    await expect(nuss).toContainText('Del 01/09/2026 al 30/09/2026');
    await expect(nuss.locator('.rc-anterior')).toContainText('Saldo anterior al 01/09/2026');
    await expect(nuss.locator('.rc-anterior')).toContainText('$ 300.000,00');
    await expect(nuss.locator('tbody tr')).toHaveCount(3);
    await expect(nuss).toContainText('Cheque endosado 072-43300023');
    await expect(nuss.locator('.rc-final')).toContainText('Saldo al 30/09/2026');
    await expect(nuss.locator('.rc-final__monto')).toHaveText('$ 502.500,50');
    const dolce = vista.locator('.rc-seccion', { hasText: 'DOLCE PASTA SRL' });
    await expect(dolce.locator('.rc-anterior')).toContainText('$ 0,00');
    await expect(dolce.locator('.rc-final__monto')).toHaveText('$ 0,00');
    await expect(dolce.locator('tbody tr')).toHaveCount(2);
    await expect(vista).toContainText(/Generado el 11\/10\/2026 12:00/);

    // Una sola empresa.
    await page.selectOption('#rc-empresa', 'u-n');
    await expect(vista.locator('.rc-seccion')).toHaveCount(1);
    await expect(vista).not.toContainText('DOLCE PASTA SRL');

    // Otras fechas: los bordes entran; la descarga sin importe dice "—".
    await elegirFechas(page, '2026-09-30', '2026-10-31');
    await expect(vista.locator('.rc-anterior')).toContainText('$ 500.000,50');
    await expect(vista.locator('tbody tr')).toHaveCount(3);
    await expect(vista.locator('tbody tr').last()).toContainText('—');
    await expect(vista).toContainText('sin importe todavía');
    await expect(vista.locator('.rc-final__monto')).toHaveText('$ 1.752.501,00');
    await expect(vista).not.toContainText('$ 0,00');

    await sinCostado(page, ancho);
    await page.keyboard.press('Escape');
    await expect(page.locator('#rc-fondo')).toHaveCount(0);
    await expect(boton).toBeFocused();
    expect(errores).toEqual([]);
  });

  test(`Cliente: la cuenta de las dos fábricas e imprimir, a ${ancho}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-11T15:00:00Z'));
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=resumen-cliente&seccion=clientes`);
    await page.locator('[data-cliente="c1"]').first().click();
    const boton = page.locator('#ad-btn-resumen');
    await expect(boton).toBeEnabled();
    // Las otras fábricas se leen después de la cuenta: se espera el aviso.
    await expect(page.locator('.ad-otras-cuentas')).toBeVisible();
    await boton.click();

    const vista = page.locator('#rc-vista');
    await expect(page.locator('#rc-campo-empresa')).toBeVisible();
    await page.selectOption('#rc-empresa', 'todas');
    await expect(vista.locator('.rc-seccion')).toHaveCount(2);
    const nuss = vista.locator('.rc-seccion', { hasText: 'SEIS DESTINOS SAS' });
    await expect(nuss.locator('.rc-anterior')).toContainText('$ 0,00');
    await expect(nuss.locator('tbody tr')).toHaveCount(3);
    await expect(nuss).toContainText('Retiro N-0012');
    await expect(nuss.locator('.rc-final__monto')).toHaveText('$ 96.000,00');
    await expect(nuss).toContainText('le debe a');
    const dolce = vista.locator('.rc-seccion', { hasText: 'DOLCE PASTA SRL' });
    await expect(dolce).toContainText('DIST. ANAT. SRL');
    await expect(dolce.locator('.rc-anterior')).toContainText('$ 20.000,00');
    await expect(dolce.locator('.rc-final__monto')).toHaveText('$ 48.000,00');

    // Imprimir: la hoja queda sola (window.print no abre nada en la prueba).
    await page.evaluate(() => { window.print = () => { window.__imprimio = true } });
    await page.locator('#rc-imprimir').click();
    await expect.poll(() => page.evaluate(() => window.__imprimio === true)).toBe(true);
    await page.evaluate(() => document.documentElement.classList.add('rc-imprimiendo'));
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#rc-impresion .rc-seccion')).toHaveCount(2);
    await expect(page.locator('#rc-impresion')).toBeVisible();
    await expect(page.locator('#rc-fondo')).toBeHidden();
    if (ancho === 1280) {
      fs.mkdirSync(RESULTADOS, { recursive: true });
      await page.pdf({ path: path.join(RESULTADOS, 'resumen-de-cuenta-cliente.pdf'), format: 'A4', printBackground: true });
    }
    await page.emulateMedia({ media: 'screen' });
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}
