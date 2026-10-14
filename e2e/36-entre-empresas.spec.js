// ADMINISTRACIÓN → ENTRE EMPRESAS (13/10/2026), en la maqueta, sin
// credenciales, a 1280, 390 y 360 px (datos: pruebas/datos-maqueta/entre-empresas.js):
//  - la sección se abre desde la portada y desde ?seccion=entre;
//  - el resumen por par de empresas con el NETO (pesos y dólares aparte);
//  - el producto terminado que llega en dos mitades se ve como UN renglón;
//  - un filtro (el tipo) achica la lista;
//  - "Valorizar con la lista": llama a precio_venta con la presentación de
//    origen y a precios_insumos_lista, y el neto suma lo valorizado;
//  - sin scroll horizontal y sin errores de JavaScript.
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
  test(`${ancho} px: entre empresas, el neto y valorizar`, async ({ page }, info) => {
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

    // La RPC con el período de este mes (fechas obligatorias).
    await expect.poll(() => rpc.filter(r => r.nombre === 'movimientos_entre_empresas').length).toBeGreaterThan(1);
    const ultima = rpc.filter(r => r.nombre === 'movimientos_entre_empresas').pop();
    expect(ultima.params.p_desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(ultima.params.p_hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.locator('#ad-entre-desde-periodo')).toContainText('Este mes');

    // El resumen: un par, con el neto en pesos y en dólares aparte.
    const resumen = page.locator('#ad-entre-resumen');
    await expect(resumen.locator('[data-entre-par]')).toHaveCount(1);
    await expect(resumen).toContainText('Neto: Nuss le debe a Dolce Pasta $ 95.000,50');
    await expect(resumen).toContainText('Neto: Dolce Pasta le debe a Nuss US$ 200,00');
    await expect(resumen).toContainText('Faltan valorizar 2 movimientos');

    // La lista: 8 movimientos (las dos mitades de cada traspaso, juntas).
    const lista = page.locator('#ad-entre-lista [data-entre]');
    await expect(lista).toHaveCount(8);
    await expect(page.locator('#ad-entre-lista')).toContainText('10 cajas');
    await expect(page.locator('#ad-entre-lista')).toContainText('Con precio: el importe está en la deuda cargada del mismo día.');
    expect(await sinScrollHorizontal(page)).toBe(true);
    await captura(page, `entre-${ancho}`, info);

    // Un filtro: solo los pagos.
    await page.locator('#ad-entre-tipo').selectOption('pago');
    await expect(lista).toHaveCount(2);
    await page.locator('#ad-entre-tipo').selectOption('');
    await expect(lista).toHaveCount(8);

    // Valorizar lo que entregó Nuss con la lista Mayoristas.
    const selector = page.locator('#ad-entre-valorizar select[data-entre-lista="u-n"]');
    await expect(selector).toBeVisible();
    await selector.selectOption('l1');
    await expect(resumen).toContainText('Neto: Nuss le debe a Dolce Pasta $ 74.973,00');
    await expect(resumen).toContainText('(valorizado)');
    await expect(page.locator('#ad-entre-valorizar')).toContainText('Todo valorizado con la lista Mayoristas.');
    const pv = rpc.find(r => r.nombre === 'precio_venta');
    expect(pv.params).toEqual({ p_lista_id: 'l1', p_presentacion_id: 'pr1', p_marca_id: null, p_fecha: '2026-10-02' });
    expect(rpc.some(r => r.nombre === 'precio_venta' && r.params.p_presentacion_id === 'pr-dp')).toBe(false);
    expect(rpc.some(r => r.nombre === 'precios_insumos_lista' && r.params.p_lista_id === 'l1')).toBe(true);
    expect(await sinScrollHorizontal(page)).toBe(true);

    // En el celular, los campos con letra de 16 px o más.
    if (ancho < 1024) {
      const chicos = await page.evaluate(() => [...document.querySelectorAll('#ad-vista-entre input, #ad-vista-entre select')]
        .filter(el => el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id || el.name))
      expect(chicos).toEqual([]);
    }
    await captura(page, `entre-valorizado-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('?seccion=entre abre la sección derecho', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=entre-empresas&seccion=entre`);
  await expect(page.locator('#ad-vista-entre')).toBeVisible();
  await expect(page.locator('#ad-entre-resumen')).toContainText('Neto:');
  await expect(page.locator('#ad-pestanas [data-pestana="entre"]')).toHaveAttribute('aria-current', 'page');
  expect(errores, errores.join('\n')).toEqual([]);
});
