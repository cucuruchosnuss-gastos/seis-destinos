// ARREGLOS DEL DETALLE DEL PAGO (31/10/2026, arreglos de la auditoría del
// 30/10, punto 4). En la maqueta (arreglos-detalle-pago), sin credenciales, a
// 390 y 1280 px, la ficha de ANATOLIA SRL en Nuss:
//  a) después de "Sacar del pago" se vuelve a leer lo de abajo del detalle:
//     lo que quedaba a cuenta se va, y si el pago quedó anulado (era el único
//     cheque) "Anular el pago" desaparece y dice "Pago anulado";
//  b) los cheques del pago son los de la base (endosados, con
//     coalesce(pago_gasto_id, salida_gasto_id) = el pago): el rechazado y el
//     de otro pago no aparecen ni en la lista ni en la vista previa de Anular;
//  c) un pago con cheques de la cartera cuya lectura vuelve vacía dice "No se
//     pueden ver los cheques de este pago con tu usuario";
//  d) Anular un pago en efectivo sin cuenta dice que la plata vuelve a la caja.
// Las rpc que cambian datos son funciones EN VIVO en __maqueta.rpc que cambian
// __maquetaTablas como lo haría la base.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
test.describe.configure({ timeout: 90000 });

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const FICHA = '/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n';

async function abrir(page) {
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=arreglos-detalle-pago`);
  await page.evaluate(() => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    sessionStorage.removeItem('maqueta.cambios');
  });
  await page.goto(`${MAQUETA}${FICHA}`);
}
async function abrirDetalle(page, gasto) {
  await page.locator(`.btn-detalle-pago[data-gasto-id="${gasto}"]`).first().click();
  const modal = page.locator('#modal-detalle-pago');
  await expect(modal.locator('.detalle-pago-hero')).toBeVisible();
  return modal;
}
// sacar_cheque_de_pago como la base: el crédito a cuenta primero, el pago
// baja (o se anula con el único cheque) y el cheque vuelve a la cartera.
async function simularSacar(page) {
  await page.evaluate(() => {
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__maqueta.rpc = globalThis.__maqueta.rpc || {};
    globalThis.__maqueta.rpc.sacar_cheque_de_pago = ({ p_cheque_id, p_motivo }) => {
      const T = globalThis.__maquetaTablas;
      const ch = T.cobranza_cheques.find(q => q.id === p_cheque_id);
      const g = T.gastos.find(x => x.id === (ch.pago_gasto_id ?? ch.salida_gasto_id));
      const cent = (v) => Math.round(Number(v) * 100);
      let resta = cent(ch.importe), cred = 0;
      for (const c of T.creditos_proveedor.filter(c => c.origen_gasto_id === g.id && c.estado === 'disponible')) {
        const toma = Math.min(resta, cent(c.monto_disponible));
        c.monto_disponible = (cent(c.monto_disponible) - toma) / 100; c.monto_original = (cent(c.monto_original) - toma) / 100;
        if (cent(c.monto_disponible) === 0) c.estado = 'agotado';
        resta -= toma; cred += toma;
      }
      const antes = g.importe, nuevo = cent(g.importe) - cent(ch.importe);
      if (nuevo > 0) g.importe = nuevo / 100;
      else Object.assign(g, { estado: 'anulado', motivo_anulacion: `Se sacó el único cheque N° ${ch.numero}: ${p_motivo.trim()}` });
      Object.assign(ch, { estado: 'en_cartera', pago_gasto_id: null, salida_gasto_id: null });
      return { pago_antes: antes, pago_despues: Math.max(nuevo, 0) / 100, del_credito: cred / 100, vuelve_a_facturas: resta / 100, pago_anulado: nuevo <= 0 };
    };
  });
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: b) solo los cheques de la base, en la lista y en la vista previa de Anular`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    const modal = await abrirDetalle(page, 'g-p5');
    await expect(modal.locator('.detalle-pago-hero__meta')).toHaveText('20/10/2026 · Cheques de terceros (5)');
    await expect(modal.locator('.detalle-pago-cheque')).toHaveCount(5);
    await expect(modal.locator('#detalle-pago-contenido')).not.toContainText('33333333');
    await expect(modal.locator('#detalle-pago-contenido')).not.toContainText('44444444');
    const acciones = modal.locator('#detalle-pago-acciones');
    await acciones.locator('[data-anular-pago]').click();
    const previa = acciones.locator('.panel-anular-pago__previa li').first();
    await expect(previa).toHaveText('Vuelven a la cartera: N° 16603539 ($ 100.000,00), N° 21000001 ($ 120.000,00), N° 32000002 ($ 80.000,00), N° 43000003 ($ 150.000,00), N° 55555555 ($ 50.000,00)');
    await expect(acciones).not.toContainText('33333333');
    await expect(acciones).not.toContainText('44444444');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `arreglos-detalle-pago-cheques-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: a) sacar un cheque relee lo de a cuenta; el único cheque saca "Anular"`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await simularSacar(page);
    // El pago de cinco cheques: tenía $ 50.000 a cuenta; sacar el de $ 80.000 lo consume.
    let modal = await abrirDetalle(page, 'g-p5');
    let acciones = modal.locator('#detalle-pago-acciones');
    await expect(acciones.locator('[data-aplicar-pago]')).toContainText('A cuenta $ 50.000,00');
    await modal.locator('.detalle-pago-cheque', { hasText: 'N° 32000002' }).locator('[data-sacar-cheque]').click();
    await modal.locator('[data-sacar-motivo]').fill('El proveedor no lo aceptó');
    await modal.locator('[data-sacar-confirmar]').click();
    await expect(modal.locator('.detalle-pago-aviso')).toContainText('el pago bajó de $ 500.000,00 a $ 420.000,00');
    await expect(acciones.locator('[data-aplicar-pago]')).toHaveCount(0);
    await expect(acciones.locator('[data-anular-pago]')).toBeVisible();
    await page.locator('#btn-cerrar-detalle-pago').click();
    await expect(modal).toBeHidden();

    // El pago de un solo cheque: sacarlo lo anula y "Anular" se va.
    modal = await abrirDetalle(page, 'g-pago-0');
    acciones = modal.locator('#detalle-pago-acciones');
    await expect(acciones.locator('[data-anular-pago]')).toBeVisible();
    await expect(acciones.locator('[data-aplicar-pago]')).toContainText('A cuenta $ 90.000,00');
    await modal.locator('[data-sacar-cheque]').click();
    await modal.locator('[data-sacar-motivo]').fill('Rechazado por el banco del proveedor');
    await modal.locator('[data-sacar-confirmar]').click();
    await expect(modal.locator('.detalle-pago-aviso')).toContainText('El pago quedó anulado');
    await expect(acciones.locator('[data-anular-pago]')).toHaveCount(0);
    await expect(acciones.locator('[data-aplicar-pago]')).toHaveCount(0);
    await expect(acciones).toContainText('Pago anulado');
    await expect(acciones).toContainText('Se sacó el único cheque N° 77777777');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `arreglos-detalle-pago-anulado-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: c) la lectura vacía avisa; d) anular efectivo sin cuenta vuelve a la caja`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    let modal = await abrirDetalle(page, 'g-sinver');
    await expect(modal.locator('#detalle-pago-contenido')).toContainText('No se pueden ver los cheques de este pago con tu usuario.');
    await expect(modal.locator('.detalle-pago-cheque')).toHaveCount(0);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `arreglos-detalle-pago-sin-ver-${ancho}`, info);
    await page.locator('#btn-cerrar-detalle-pago').click();
    await expect(modal).toBeHidden();

    modal = await abrirDetalle(page, 'g-ef');
    const acciones = modal.locator('#detalle-pago-acciones');
    await expect(modal.locator('#detalle-pago-contenido')).not.toContainText('No se pueden ver los cheques');
    await acciones.locator('[data-anular-pago]').click();
    await expect(acciones.locator('.panel-anular-pago__previa')).toContainText('Vuelven $ 1.500,50 a la caja (a la cuenta de la que salieron)');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `arreglos-detalle-pago-anular-efectivo-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
