// PRÉSTAMOS (13/10/2026), en la maqueta (datos `prestamos`), sin credenciales,
// a 1280, 390 y 360 px:
//  - GASTOS: empresa + categoría «Préstamos» → los préstamos activos de esa
//    empresa, elegir uno, pagar la cuota en dos partes (dólares y pesos con
//    tipo de cambio) con el cálculo en vivo, y volver a la lista de gastos.
//  - ADMINISTRACIÓN → Préstamos: la lista (Activos / Cancelados), "Nuevo
//    préstamo" con cuotas iguales (la suma da el total), el detalle con las
//    barras de cada cuota y "Anular pago" con motivo.
// Sin scroll horizontal y sin errores de JavaScript en ningún paso.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// Las librerías de afuera (Lucide, SheetJS) no son parte de lo que se prueba:
// se sirven vacías, así la prueba no depende de un CDN.
async function sinCdn(page) {
  await page.route(/unpkg\.com\/lucide/, r => r.fulfill({ contentType: 'application/javascript', body: 'window.lucide = { createIcons() {} }' }));
  await page.route(/cdn\.sheetjs\.com/, r => r.fulfill({ contentType: 'application/javascript', body: '' }));
}

async function sinScrollHorizontal(page, donde) {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(ok, `sin scroll horizontal (${donde})`).toBe(true);
}

async function abrir(page, archivo, ancho) {
  await sinCdn(page);
  await page.setViewportSize({ width: ancho, height: ancho >= 1000 ? 900 : 844 });
  await page.goto(`${MAQUETA}/modulos/${archivo}?maqueta=prestamos`);
  await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'todas'); sessionStorage.removeItem('maqueta.cambios'); });
  await page.reload();
}

for (const ancho of [1280, 390, 360]) {
  test(`${ancho} px: Gastos → Préstamos: pagar una cuota en dos monedas`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await abrir(page, 'gastos.html', ancho);
    await page.locator('#btn-nuevo-gasto').click();
    await page.locator('#btn-sin-foto').click();
    await page.locator('#campo-fecha').fill('2026-10-13');
    await page.locator('#campo-fecha-pago').fill('2026-10-13');
    await page.locator('#campo-razon-social').fill('Banco Galicia');
    await page.locator('#campo-importe').fill('1000');
    await page.locator('#grilla-medio-pago .btn-tipo-doc[data-valor="efectivo"]').click();
    await page.locator('#btn-datos-siguiente').click();
    await page.locator('#grilla-destino .tarjeta-destino[data-id="u-n"]').click();
    await page.locator('#grilla-categorias .btn-categoria[data-id="c-pr"]').click();

    // En vez del formulario común: los préstamos activos de Nuss.
    await expect(page.locator('#sp-prestamo')).toBeVisible();
    await expect(page.locator('#sp-detalles')).toBeHidden();
    await expect(page.locator('#prestamo-titulo')).toHaveText('Préstamos activos de Cucuruchos Nuss');
    const tarjeta = page.locator('#prestamo-cuerpo [data-prestamo="pr-1"]');
    await expect(tarjeta).toContainText('Préstamo Galicia');
    await expect(tarjeta).toContainText('Saldo USD 15.000,00');
    await expect(page.locator('#prestamo-cuerpo [data-prestamo="pr-2"]')).toHaveCount(0);
    await sinScrollHorizontal(page, 'lista');
    await captura(page, `prestamos-gastos-lista-${ancho}`, info);

    await tarjeta.click();
    await expect(page.locator('#prestamo-cuerpo')).toContainText('Cuota 2 de 4');
    await expect(page.locator('#prestamo-calculo')).toHaveText('Pagás USD 5.000,00; la cuota de octubre queda paga.');
    // La primera parte: USD 2.000 de mis dólares.
    const monto0 = page.locator('#prestamo-parte-monto-0');
    await monto0.fill('');
    await monto0.pressSequentially('2000');
    await expect(page.locator('#prestamo-calculo')).toHaveText('Pagás USD 2.000,00; quedan USD 3.000,00 de la cuota de octubre.');
    await expect(page.locator('#prestamo-parte-cuenta-0')).toHaveValue('cta-usd');
    // Otra parte, en pesos, desde el banco de la Empresa, a 1.300.
    await page.locator('[data-parte-agregar]').click();
    await expect(page.locator('#prestamo-parte-moneda-1')).toHaveValue('ARS');
    await page.locator('#prestamo-parte-cuenta-1').selectOption('cta-emp-ars');
    await page.locator('#prestamo-parte-monto-1').pressSequentially('2600000');
    await page.locator('#prestamo-tc').pressSequentially('1300');
    await expect(page.locator('#prestamo-calculo')).toHaveText('Pagás USD 2.000,00 + $ 2.600.000,00 a 1.300 = USD 4.000,00; quedan USD 1.000,00 de la cuota de octubre.');
    const letra = await page.locator('#prestamo-parte-monto-1').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    expect(letra, 'campos con letra de 16 px o más').toBeGreaterThanOrEqual(16);
    await sinScrollHorizontal(page, 'pago');
    await captura(page, `prestamos-gastos-pago-${ancho}`, info);

    // Pasarse: lo dice antes de mandar.
    await page.locator('#prestamo-parte-monto-0').fill('');
    await page.locator('#prestamo-parte-monto-0').pressSequentially('9000');
    await expect(page.locator('#prestamo-calculo')).toHaveClass(/prestamo-calculo--mal/);
    await page.locator('#prestamo-pagar').click();
    await expect(page.locator('#prestamo-error')).toContainText('Te pasás');
    await page.locator('#prestamo-parte-monto-0').fill('');
    await page.locator('#prestamo-parte-monto-0').pressSequentially('2000');

    await page.locator('#prestamo-pagar').click();
    await expect(page.locator('.toast')).toContainText('Pago registrado: se imputaron USD 4.000,00');
    await expect(page.locator('#vista-lista')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: Administración → Préstamos: lista, nuevo y anular un pago`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await abrir(page, 'administracion.html', ancho);
    await page.locator('#ad-pestanas button[data-pestana="prestamos"]').click();
    await expect(page.locator('#ad-vista-prestamos')).toBeVisible();
    await expect(page.locator('#ad-prestamos-lista [data-prestamo-abrir]')).toHaveCount(2);
    await expect(page.locator('#ad-prestamos-lista')).toContainText('Préstamo Galicia');
    await page.locator('#ad-prestamos-filtro [data-prestamos-filtro="cancelado"]').click();
    await expect(page.locator('#ad-prestamos-lista [data-prestamo-abrir]')).toHaveCount(1);
    await expect(page.locator('#ad-prestamos-lista')).toContainText('Préstamo viejo');
    await page.locator('#ad-prestamos-filtro [data-prestamos-filtro="activo"]').click();
    await sinScrollHorizontal(page, 'lista');
    await captura(page, `prestamos-admin-lista-${ancho}`, info);

    // Nuevo préstamo: 3 cuotas iguales de $ 1.000 → 333,33 + 333,33 + 333,34.
    await page.locator('#ad-prestamo-nuevo').click();
    await page.locator('#ad-pr-nombre').fill('Préstamo de un socio');
    await page.locator('#ad-pr-empresa').selectOption('u-d');
    await page.locator('#ad-pr-total').pressSequentially('1000');
    await page.locator('#ad-pr-total').blur();
    await page.locator('#ad-pr-cantidad').pressSequentially('3');
    await page.locator('#ad-pr-cantidad').blur();
    await page.locator('#ad-pr-primer').fill('2026-11-10');
    await page.locator('#ad-pr-primer').dispatchEvent('change');
    await expect(page.locator('#ad-pr-cuotas [data-cuota-importe]')).toHaveCount(3);
    await expect(page.locator('#ad-pr-cuotas [data-cuota-importe="2"]')).toHaveValue('333,34');
    await expect(page.locator('#ad-pr-suma')).toContainText('da el total');
    await sinScrollHorizontal(page, 'alta');
    await captura(page, `prestamos-admin-alta-${ancho}`, info);
    // Cambiar una cuota: la suma ya no da y no se manda.
    await page.locator('#ad-pr-cuotas [data-cuota-importe="0"]').fill('');
    await page.locator('#ad-pr-cuotas [data-cuota-importe="0"]').pressSequentially('300');
    await expect(page.locator('#ad-pr-suma')).toHaveClass(/ad-prestamo-suma--mal/);
    await page.locator('#ad-pr-guardar').click();
    await expect(page.locator('#ad-pr-error')).toContainText('tienen que dar lo mismo');
    await page.locator('#ad-pr-cuotas [data-cuota-importe="0"]').fill('');
    await page.locator('#ad-pr-cuotas [data-cuota-importe="0"]').pressSequentially('333,33');
    await page.locator('#ad-pr-guardar').click();
    await expect(page.locator('.toast')).toContainText('Préstamo creado');
    await expect(page.locator('#ad-prestamo-alta')).toBeEmpty();

    // El detalle: barras y pagos; anular uno con motivo.
    await page.locator('#ad-prestamos-lista [data-prestamo-abrir="pr-1"]').click();
    await expect(page.locator('#ad-prestamo-titulo')).toHaveText('Préstamo Galicia');
    await expect(page.locator('#ad-prestamo-cuerpo [role="progressbar"]')).toHaveCount(4);
    await expect(page.locator('#ad-prestamo-cuerpo [data-pago="pg-3"]')).toContainText('Anulado: Cargado dos veces');
    await sinScrollHorizontal(page, 'detalle');
    await captura(page, `prestamos-admin-detalle-${ancho}`, info);
    await page.locator('[data-pago-anular="pg-1"]').click();
    await page.locator('#ad-pago-si').click();
    await expect(page.locator('#ad-pago-error')).toHaveText('Poné el motivo.');
    await page.locator('#ad-pago-motivo').fill('Se cargó con el tipo de cambio equivocado');
    await page.locator('#ad-pago-si').click();
    await expect(page.locator('.toast')).toContainText('Pago anulado');
    await sinScrollHorizontal(page, 'después de anular');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
