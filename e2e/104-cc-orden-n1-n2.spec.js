// LA VENTA Y SUS PUNTOS N1 / N2 (30/10/2026, rama ci-prueba/cc-orden-n1-n2).
// En la maqueta (cc-orden-n1-n2), sin credenciales, a 390 y 1280 px, la ficha
// de ANATOLIA SRL en Nuss (también es el cliente Distribuidora Anatolia): en
// la cuenta de las dos cosas juntas,
//  - tocar la fila "Venta" de la orden N-0042 despliega N1 (con la comisión
//    de vendedores y cuánto), N2 y el total, con UNA llamada a
//    datos_division_orden y ninguna antes de tocar; cerrar y abrir no vuelve
//    a leer; también con el teclado (Enter);
//  - la corrección "Comisión" de la misma orden no despliega nada;
//  - la venta sin condición de venta dice el total y "Sin división N1/N2";
//    la 100/0 no muestra el N2;
//  - el filtro "Ver" (repinta js/cuenta-unica.js) deja la venta abierta;
//  - sin retiros:precios: solo el total, sin llamar a la base y sin error.
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
const FICHA = '/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n';

// Abre la ficha con los datos de la maqueta; `sinPrecios` saca retiros:precios.
async function abrir(page, { sinPrecios = false } = {}) {
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-orden-n1-n2`);
  await page.evaluate((sin) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    if (sin) {
      const tareas = globalThis.__maquetaTablas.empleado_tareas.filter(t => !(t.modulo === 'retiros' && t.tarea === 'precios'));
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { empleado_tareas: tareas } }));
    } else sessionStorage.removeItem('maqueta.cambios');
  }, sinPrecios);
  await page.goto(`${MAQUETA}${FICHA}`);
}

const fila = (unica, chip, texto) => unica.locator('.cu-fila', { has: unica.page().locator(chip) }).filter({ hasText: texto });

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: la venta despliega N1, N2 y el total`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    const unica = page.locator('#ficha-cuenta-unica');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    const v42 = fila(unica, '.cu-chip--venta', 'Orden N-0042');
    await expect(v42).toHaveAttribute('role', 'button');
    await expect(v42).toHaveAttribute('aria-expanded', 'false');
    await expect(v42.locator('.cc-fila-venta__ver')).toHaveText('Ver N1 / N2 ▾');
    // La corrección de la comisión no se toca.
    const correccion = fila(unica, '.cu-chip--comision', 'Corrección de la comisión');
    await expect(correccion).not.toHaveAttribute('role', 'button');
    await expect(correccion.locator('.cc-fila-venta__ver')).toHaveCount(0);
    expect(rpc.some(r => r.nombre === 'datos_division_orden'), 'nada se lee antes de tocar').toBe(false);

    await v42.click();
    const panel = page.locator('#cc-n1n2-or-42');
    await expect(panel).toBeVisible();
    const lineas = panel.locator('.cc-n1n2__linea');
    await expect(lineas).toHaveText([
      'N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88)',
      'N2-0042: $ 2.286.939,17',
      'Total: $ 4.012.369,65',
    ]);
    await expect(v42).toHaveAttribute('aria-expanded', 'true');
    const llamadas = () => rpc.filter(r => r.nombre === 'datos_division_orden');
    expect(llamadas()).toEqual([{ nombre: 'datos_division_orden', params: { p_orden_id: 'or-42', p_pct_a: null, p_comisiones: null } }]);
    // El panel va justo debajo de su fila.
    expect(await v42.evaluate(el => el.nextElementSibling?.id)).toBe('cc-n1n2-or-42');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await panel.scrollIntoViewIfNeeded();
    await captura(page, `cc-orden-n1-n2-${ancho}`, info);

    // Cerrar y abrir (con Enter): no vuelve a leer.
    await v42.click();
    await expect(panel).toHaveCount(0);
    await v42.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await expect(lineas).toHaveCount(3);
    expect(llamadas()).toHaveLength(1);

    // Tocar la corrección: nada.
    await correccion.click();
    expect(llamadas()).toHaveLength(1);

    // Sin condición de venta: el total y "Sin división N1/N2".
    await fila(unica, '.cu-chip--venta', 'Orden N-0043').click();
    const p43 = page.locator('#cc-n1n2-or-43');
    await expect(p43).toContainText('Total: $ 500.000,00');
    await expect(p43).toContainText('Sin división N1/N2');
    await expect(p43).not.toContainText('N1-');
    // 100/0: sin el N2.
    await fila(unica, '.cu-chip--venta', 'Orden N-0044').click();
    await expect(page.locator('#cc-n1n2-or-44 .cc-n1n2__linea')).toHaveText([
      'N1-0044: $ 120.000,00 (incluye comisión de vendedores $ 6.000,00)',
      'Total: $ 120.000,00',
    ]);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con tres abiertas').toBe(true);

    // El filtro de js/cuenta-unica.js repinta: la venta sigue abierta.
    await unica.locator('[data-cu-filtro]').selectOption('Venta');
    await expect(unica.locator('.cu-fila')).toHaveCount(3);
    await expect(panel).toBeVisible();
    await expect(lineas).toHaveCount(3);
    await unica.locator('[data-cu-filtro]').selectOption('');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    await expect(panel).toBeVisible();
    expect(llamadas().map(r => r.params.p_orden_id)).toEqual(['or-42', 'or-43', 'or-44']);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: sin retiros:precios, solo el total`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { sinPrecios: true });
    const unica = page.locator('#ficha-cuenta-unica');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    await fila(unica, '.cu-chip--venta', 'Orden N-0042').click();
    const panel = page.locator('#cc-n1n2-or-42');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.cc-n1n2__linea')).toHaveText(['Total: $ 4.012.369,65']);
    await expect(panel).not.toContainText('Sin división');
    await expect(panel).not.toContainText('N1');
    expect(rpc.some(r => r.nombre === 'datos_division_orden'), 'no llama a la base').toBe(false);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cc-orden-n1n2-sin-precios-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
  });
}
