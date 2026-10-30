// EL DETALLE DEL PAGO CON SUS CHEQUES (30/10/2026, rama
// ci-prueba/detalle-pago-cheques). En la maqueta (detalle-pago-cheques), sin
// credenciales, a 390 y 1280 px, la ficha de ANATOLIA SRL en Nuss:
//  - el detalle del pago de $ 500.000 en dos columnas (una abajo de la otra
//    en el celular): "Con qué se pagó" con los CINCO cheques (banco, N°,
//    importe, fecha de pago, a nombre de quién, de qué cliente), las
//    observaciones y el crédito; "Facturas que paga";
//  - "Sacar del pago": pide el motivo (sin motivo no llama), muestra qué va a
//    pasar y manda sacar_cheque_de_pago; ofrece reemplazarlo;
//  - "Agregar cheque": la cartera con buscador, la vista previa (completa la
//    factura y el resto queda a favor) y agregar_cheques_a_pago;
//  - el pago con un solo cheque avisa que queda anulado;
//  - sin cobranzas:procesar no hay botones.
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

async function abrir(page, { sinProcesar = false } = {}) {
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=detalle-pago-cheques`);
  await page.evaluate((sin) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    if (sin) {
      const tareas = globalThis.__maquetaTablas.empleado_tareas.filter(t => !(t.modulo === 'cobranzas' && t.tarea === 'procesar'));
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { empleado_tareas: tareas } }));
    } else sessionStorage.removeItem('maqueta.cambios');
  }, sinProcesar);
  await page.goto(`${MAQUETA}${FICHA}`);
}
async function abrirDetalle(page, gasto) {
  await page.locator(`.btn-detalle-pago[data-gasto-id="${gasto}"]`).first().click();
  const modal = page.locator('#modal-detalle-pago');
  await expect(modal.locator('.detalle-pago-hero')).toBeVisible();
  return modal;
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: el detalle en dos columnas con los cheques, sacar y agregar`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    const modal = await abrirDetalle(page, 'g-p5');
    const cols = modal.locator('.detalle-pago-col');
    await expect(cols).toHaveCount(2);
    await expect(cols.nth(0).locator('.detalle-pago-seccion-titulo').first()).toHaveText('Con qué se pagó');
    await expect(cols.nth(1).locator('.detalle-pago-seccion-titulo')).toHaveText('Facturas que paga');
    // Dos columnas iguales en la compu; una abajo de la otra en el celular.
    const [a, b] = [await cols.nth(0).boundingBox(), await cols.nth(1).boundingBox()];
    if (ancho >= 720) {
      expect(Math.abs(a.width - b.width)).toBeLessThan(2);
      expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    } else {
      expect(b.y).toBeGreaterThan(a.y + a.height - 1);
    }
    await expect(modal.locator('.detalle-pago-hero__monto')).toHaveText('$ 500.000,00');
    await expect(modal.locator('.detalle-pago-hero__meta')).toHaveText('20/10/2026 · Cheques de terceros (5)');
    await expect(modal.locator('.detalle-pago-obs')).toHaveText('25/10/2026: se agregó N° 55555555 ($ 50.000,00) — Reemplaza al cheque N° 16603538');
    const cheques = modal.locator('.detalle-pago-cheque');
    await expect(cheques).toHaveCount(5);
    const primero = cheques.filter({ hasText: 'N° 16603539' });
    await expect(primero).toContainText('BANCO DE GALICIA Y BUENOS AIRES S.A.');
    await expect(primero).toContainText('$ 100.000,00');
    await expect(primero).toContainText('paga 10/11/2026');
    await expect(primero).toContainText('A nombre de PEREZ JUAN CARLOS · De Distribuidora Anatolia');
    await expect(cheques.filter({ hasText: 'N° 32000002' })).toContainText('a la vista · 01/10/2026');
    // El texto corrido de antes ("N° 16603539, N° 21000001…") ya no está.
    await expect(modal).not.toContainText('Cheques de la cartera N°');
    await expect(modal.locator('.detalle-pago-credito')).toContainText('$ 50.000,00');
    await expect(cols.nth(1).locator('.fila-pago-aplicacion')).toHaveCount(2);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `detalle-pago-cheques-${ancho}`, info);

    // Sacar del pago: sin motivo no llama; con motivo, la vista previa y el RPC.
    const ch3 = cheques.filter({ hasText: 'N° 32000002' });
    await ch3.locator('[data-sacar-cheque]').click();
    await expect(modal.locator('.detalle-pago-previa li')).toHaveText([
      'El pago baja de $ 500.000,00 a $ 420.000,00.',
      'Sale $ 50.000,00 del crédito a favor.',
      '$ 30.000,00 vuelve a deberse en la factura 0003-00001245.',
      'El cheque N° 32000002 vuelve a la cartera.',
    ]);
    await modal.locator('[data-sacar-confirmar]').click();
    await expect(modal.locator('[data-sacar-error]')).toContainText('Poné el motivo');
    expect(rpc.some(r => r.nombre === 'sacar_cheque_de_pago'), 'sin motivo no llama').toBe(false);
    await modal.locator('[data-sacar-motivo]').fill('El proveedor no lo aceptó: tiene rechazos');
    await expect(modal.locator('[data-sacar-error]')).toBeHidden();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con la vista previa').toBe(true);
    await captura(page, `detalle-pago-sacar-${ancho}`, info);
    await modal.locator('[data-sacar-confirmar]').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'sacar_cheque_de_pago')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'sacar_cheque_de_pago').params).toEqual({ p_cheque_id: 'chq-p5-3', p_motivo: 'El proveedor no lo aceptó: tiene rechazos' });
    await expect(modal.locator('.detalle-pago-aviso')).toContainText('Listo: el pago bajó de $ 500.000,00 a $ 420.000,00. Salieron $ 50.000,00 del crédito a favor. $ 30.000,00 volvieron a deberse en las facturas. El cheque N° 32000002 volvió a la cartera.');

    // ¿Lo reemplazás? → la cartera: buscar, tildar, la vista previa y agregar.
    await modal.locator('.detalle-pago-aviso [data-agregar-cheque]').click();
    const filas = modal.locator('.detalle-pago-cartera__fila');
    await expect(filas.first()).toBeVisible();
    await modal.locator('[data-agregar-buscar]').fill('66259');
    await expect(filas).toHaveCount(1);
    await expect(filas).toContainText('N° 66259862');
    await expect(filas).toContainText('$ 387.300,50');
    await expect(filas).toContainText('De Distribuidora Anatolia');
    await filas.locator('input[type="checkbox"]').check();
    await expect(modal.locator('[data-agregar-previa] .detalle-pago-previa li')).toHaveText([
      'El pago sube de $ 500.000,00 a $ 887.300,50.',
      '$ 200.000,00 completa la factura 0003-00001245.',
      '$ 187.300,50 queda como crédito a favor.',
    ]);
    // Buscar otra cosa no destilda.
    await modal.locator('[data-agregar-buscar]').fill('');
    await expect(filas.filter({ hasText: 'N° 66259862' }).locator('input')).toBeChecked();
    await modal.locator('[data-agregar-motivo]').fill('Reemplaza al cheque N° 32000002');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con la cartera').toBe(true);
    await captura(page, `detalle-pago-agregar-${ancho}`, info);
    await modal.locator('[data-agregar-confirmar]').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'agregar_cheques_a_pago')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'agregar_cheques_a_pago').params).toEqual({ p_gasto_id: 'g-p5', p_cheque_ids: ['chq-1'], p_motivo: 'Reemplaza al cheque N° 32000002' });
    await expect(modal.locator('.detalle-pago-aviso')).toContainText('Listo: el pago subió de $ 500.000,00 a $ 887.300,50. $ 200.000,00 fueron a las facturas. $ 187.300,50 quedaron como crédito a favor.');
    await expect(modal.locator('.detalle-pago-agregar')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: un solo cheque: sacarlo anula el pago`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    const modal = await abrirDetalle(page, 'g-pago-0');
    await expect(modal.locator('.detalle-pago-cheque')).toHaveCount(1);
    await modal.locator('[data-sacar-cheque]').click();
    await expect(modal.locator('.detalle-pago-previa li').first()).toHaveText('El pago baja de $ 90.000,00 a $ 0,00: queda anulado (era el único cheque).');
    await modal.locator('[data-sacar-motivo]').fill('Rechazado por el banco del proveedor');
    await modal.locator('[data-sacar-confirmar]').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'sacar_cheque_de_pago')).toBeTruthy();
    await expect(modal.locator('.detalle-pago-aviso')).toContainText('El pago quedó anulado (era el único cheque). El cheque N° 77777777 volvió a la cartera.');
    await expect(modal.locator('.detalle-pago-aviso [data-agregar-cheque]')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: sin cobranzas:procesar, los cheques sin botones`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { sinProcesar: true });
    const modal = await abrirDetalle(page, 'g-p5');
    await expect(modal.locator('.detalle-pago-cheque')).toHaveCount(5);
    await expect(modal.locator('[data-sacar-cheque]')).toHaveCount(0);
    await expect(modal.locator('[data-agregar-cheque]')).toHaveCount(0);
    await captura(page, `detalle-pago-sin-permiso-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
  });
}
