// ADMINISTRACIÓN → ENTRE EMPRESAS (13/10/2026; al día con la v2 del
// 30/10/2026), en la maqueta, sin credenciales, a 1280, 390 y 360 px (datos:
// pruebas/datos-maqueta/entre-empresas.js):
//  - la sección se abre desde la portada y desde ?seccion=entre;
//  - arriba, el saldo por par con el NETO (pesos y dólares aparte);
//  - el producto terminado que llega en dos mitades se ve como UN renglón;
//  - un filtro (el tipo) achica la lista;
//  - ya no está "Valorizar con la lista" (la cuenta "≈" salió con la v2);
//  - sin scroll horizontal y sin errores de JavaScript.
// Lo nuevo de la v2 (la tarjeta que filtra, el ajuste, las listas internas)
// está en e2e/111-entre-empresas-v2.spec.js.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [ancho, alto] of [[1280, 900], [390, 844], [360, 780]]) {
  test(`${ancho} px: entre empresas, el saldo y la lista`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=entre-empresas`);

    // La portada tiene su tarjeta y la pestaña.
    const tarjeta = page.locator('#ad-secciones [data-seccion="entre"]');
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText('Entre empresas');
    await expect(tarjeta).toContainText('movimientos este mes');
    await expect(page.locator('#ad-pestanas [data-pestana="entre"]')).toHaveCount(1);
    await tarjeta.click();
    await expect(page.locator('#ad-vista-entre')).toBeVisible();

    // La lista con el período de este mes (fechas obligatorias).
    await expect.poll(() => rpc.filter(r => r.nombre === 'movimientos_entre_empresas' && /-01$/.test(r.params.p_desde)).length).toBeGreaterThan(1);
    const delMes = rpc.filter(r => r.nombre === 'movimientos_entre_empresas' && /-01$/.test(r.params.p_desde)).pop();
    expect(delMes.params.p_hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.locator('#ad-entre-desde-periodo')).toContainText('Este mes');

    // Arriba: el saldo de un par, pesos y dólares aparte.
    const saldos = page.locator('#ad-entre-saldos');
    await expect(saldos.locator('[data-entre-saldo]')).toHaveCount(1);
    await expect(saldos).toContainText('Nuss le debe a Dolce Pasta $ 95.000,50');
    await expect(saldos).toContainText('Dolce Pasta le debe a Nuss US$ 200,00');

    // La lista: 8 movimientos (las dos mitades de cada traspaso, juntas).
    const lista = page.locator('#ad-entre-lista [data-entre]');
    await expect(lista).toHaveCount(8);
    await expect(page.locator('#ad-entre-lista')).toContainText('10 cajas');
    await expect(page.locator('#ad-entre-valorizar')).toHaveCount(0);
    expect(await sinScrollHorizontal(page)).toBe(true);
    await captura(page, `entre-${ancho}`, info);

    // Un filtro: solo los pagos.
    await page.locator('#ad-entre-tipo').selectOption('pago');
    await expect(lista).toHaveCount(2);
    await page.locator('#ad-entre-tipo').selectOption('');
    await expect(lista).toHaveCount(8);
    expect(rpc.some(r => r.nombre === 'precio_venta')).toBe(false);

    // En el celular, los campos con letra de 16 px o más.
    if (ancho < 1024) {
      const chicos = await page.evaluate(() => [...document.querySelectorAll('#ad-vista-entre input, #ad-vista-entre select')]
        .filter(el => el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id || el.name))
      expect(chicos).toEqual([]);
    }
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('?seccion=entre abre la sección derecho', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=entre-empresas&seccion=entre`);
  await expect(page.locator('#ad-vista-entre')).toBeVisible();
  await expect(page.locator('#ad-entre-saldos')).toContainText('le debe a');
  await expect(page.locator('#ad-pestanas [data-pestana="entre"]')).toHaveAttribute('aria-current', 'page');
  expect(errores, errores.join('\n')).toEqual([]);
});
