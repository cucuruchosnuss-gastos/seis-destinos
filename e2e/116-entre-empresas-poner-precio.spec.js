// ADMINISTRACIÓN → ENTRE EMPRESAS: "PONER PRECIO" (31/10/2026, arreglos de la
// auditoría, punto 7), en la maqueta, sin credenciales, a 1280 y 390 px
// (datos: pruebas/datos-maqueta/entre-empresas-precio.js):
//  - "Mercadería sin valorizar" con el traspaso Y la transferencia de
//    insumos, quién entrega → quién recibe y "Poner precio" (la orden sigue
//    con "Valorizar la orden");
//  - la ventana: la lista interna, el sugerido precargado con su fuente, el
//    que no tiene sugerido en naranja, el total en vivo;
//  - guardar con un precio vacío: "Faltan precios: …" de la base, tal cual;
//    con todos: se cierra y se releen el saldo y la lista;
//  - la fila de una valorización: "Valorización" y "Cambiar precio", que
//    prueba los tipos hasta que uno contesta y dice "Valorizado en $ X el dd/mm";
//  - los insumos: por kg, del costo de compra;
//  - el ajuste no deja mandar un importe en cero;
//  - sin scroll de costado, campos de 16 px en el celular y sin errores.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const sinCostado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}

for (const [ancho, alto] of [[1280, 900], [390, 844]]) {
  test(`${ancho} px: poner precio a un traspaso, a insumos y cambiar una valorización`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=entre-empresas-precio&seccion=entre`);
    await expect(page.locator('#ad-vista-entre')).toBeVisible();
    // La lista desde el 1/10/2026 (los datos son de octubre), sea el día que sea.
    await page.evaluate(() => { const d = document.getElementById('ad-entre-desde'); d.value = '2026-10-01'; d.dispatchEvent(new Event('change')); });

    // a) El bloque: el traspaso y los insumos, cada uno con "Poner precio".
    const sv = page.locator('#ad-entre-sin-valorizar');
    await expect(sv.locator('[data-entre-sv]')).toHaveCount(3);
    const tt = sv.locator('[data-entre-sv="traspaso_terminado|tt-1"]');
    await expect(tt).toContainText('Traspaso de producto terminado');
    await expect(tt).toContainText('27/10/2026');
    await expect(tt).toContainText('Total: 15 cajas sin precio');
    await expect(tt.locator('.ad-entre-sv__flecha')).toHaveText('→');
    const st = sv.locator('[data-entre-sv="transferencia_stock|s-1"]');
    await expect(st).toContainText('Transferencia de insumos');
    await expect(st).toContainText('1 insumo sin precio');
    // b) La orden: como antes.
    await expect(sv.locator('[data-entre-orden="o-di2"]')).toHaveText('Valorizar la orden');
    await expect(sv.locator('[data-entre-valorizar]')).toHaveCount(2);
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);

    // c) La ventana del traspaso.
    await tt.locator('[data-entre-valorizar="tt-1"]').click();
    const vz = page.locator('#ad-entre-vz');
    await expect(vz).toBeVisible();
    await expect(vz.locator('#ad-entre-vz-titulo')).toHaveText('Poner precio');
    await expect(vz).toContainText('Traspaso de producto terminado del 27/10/2026');
    await expect(vz).toContainText('Dolce Pasta le va a deber a Nuss lo que sume.');
    await expect(vz).toContainText('Precios sugeridos de la lista interna "Nuss → Dolce Pasta (interna)".');
    await expect(vz.locator('[data-entre-vz-item]')).toHaveCount(2);
    await expect(page.locator('#ad-entre-vz-precio-0')).toHaveValue('7.000');
    await expect(vz.locator('[data-entre-vz-fuente="0"]')).toHaveText('lista interna');
    await expect(page.locator('#ad-entre-vz-precio-1')).toHaveValue('');
    await expect(vz.locator('[data-entre-vz-fuente="1"]')).toHaveClass(/ad-entre-vz__fuente--falta/);
    await expect(page.locator('#ad-entre-vz-sub-0')).toHaveText('$ 70.000,00');
    await expect(page.locator('#ad-entre-vz-total')).toHaveText('Total: $ 70.000,00 · falta 1 precio');
    expect(await sinCostado(page), 'sin scroll de costado con la ventana').toBe(true);
    if (ancho < 1024) {
      const chicos = await page.evaluate(() => [...document.querySelectorAll('#ad-entre-vz input')]
        .filter(el => el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id));
      expect(chicos).toEqual([]);
    }
    await captura(page, `entre-precio-${ancho}`, info);

    // Guardar con un precio vacío: la base contesta y se muestra tal cual.
    await page.evaluate(() => {
      globalThis.__maqueta = { rpc: { valorizar_movimiento_entre_empresas: (p) => p.p_precios.some(x => x.precio === null)
        ? 'ERROR:Faltan precios: Cucuruchón Chico · Caja sin cono' : { id: 'mu-nueva', importe: 87500 } }, funciones: {} };
    });
    await page.locator('#ad-entre-vz-guardar').click();
    await expect(page.locator('#ad-entre-vz-error')).toHaveText('Faltan precios: Cucuruchón Chico · Caja sin cono');
    await expect(vz).toBeVisible();
    const falta = rpc.filter(r => r.nombre === 'valorizar_movimiento_entre_empresas');
    expect(falta[0].params).toEqual({ p_referencia_tipo: 'traspaso_terminado', p_referencia_id: 'tt-1',
      p_precios: [{ clave: 'pr-a:', precio: 7000 }, { clave: 'pr-b:', precio: null }], p_concepto: null });

    // El total en vivo y guardar con todos los precios.
    await page.locator('#ad-entre-vz-precio-1').fill('3500');
    await expect(page.locator('#ad-entre-vz-precio-1')).toHaveValue('3.500');
    await expect(page.locator('#ad-entre-vz-sub-1')).toHaveText('$ 17.500,00');
    await expect(page.locator('#ad-entre-vz-total')).toHaveText('Total: $ 87.500,00');
    const antes = rpc.filter(r => r.nombre === 'movimientos_entre_empresas').length;
    await page.locator('#ad-entre-vz-guardar').click();
    await expect(vz).toBeHidden();
    const ok = rpc.filter(r => r.nombre === 'valorizar_movimiento_entre_empresas');
    expect(ok[1].params.p_precios).toEqual([{ clave: 'pr-a:', precio: 7000 }, { clave: 'pr-b:', precio: 3500 }]);
    await expect.poll(() => rpc.filter(r => r.nombre === 'movimientos_entre_empresas').length).toBe(antes + 2);

    // d) La fila de una valorización: "Valorización" y "Cambiar precio".
    const val = page.locator('#ad-entre-lista [data-entre-tipo="otro"]').filter({ hasText: 'Valorización Ingreso' });
    await expect(val.locator('.ad-sello').first()).toHaveText('Valorización');
    await val.locator('[data-entre-valorizar="ie-7"]').click();
    await expect(vz).toBeVisible();
    await expect(vz.locator('#ad-entre-vz-titulo')).toHaveText('Cambiar precio');
    await expect(vz.locator('[data-entre-vz-valorizado]')).toContainText('Valorizado en $ 50.000,00 el 12/10');
    await expect(page.locator('#ad-entre-vz-guardar')).toHaveText('Cambiar precio');
    await expect(vz).toContainText('Ingreso de producto de otra empresa del 12/10/2026');
    const tipos = rpc.filter(r => r.nombre === 'movimiento_para_valorizar' && r.params.p_referencia_id === 'ie-7').map(r => r.params.p_referencia_tipo);
    expect(tipos).toEqual(['traspaso_terminado', 'ingreso_externo']);
    await captura(page, `entre-precio-cambiar-${ancho}`, info);
    await vz.locator('.ad-entre-vz__acciones [data-entre-vz-cerrar]').click();
    await expect(vz).toBeHidden();

    // Los insumos: por kg, del costo de compra. Escape cierra.
    await st.locator('[data-entre-valorizar="s-1"]').click();
    await expect(vz).toContainText('Precio por kg ($)');
    await expect(page.locator('#ad-entre-vz-precio-0')).toHaveValue('820,50');
    await expect(vz.locator('[data-entre-vz-fuente="0"]')).toHaveText('costo de compra');
    await expect(page.locator('#ad-entre-vz-total')).toHaveText('Total: $ 41.025,00');
    await page.locator('#ad-entre-vz-precio-0').press('Escape');
    await expect(vz).toBeHidden();

    // e) El ajuste no deja mandar un importe en cero.
    await page.locator('[data-entre-ajuste-abrir]').click();
    await page.locator('#ad-entre-ajuste-deudora').selectOption('u-n');
    await page.locator('#ad-entre-ajuste-acreedora').selectOption('u-d');
    await page.locator('#ad-entre-ajuste-importe').fill('0');
    await page.locator('#ad-entre-ajuste-concepto').fill('Compensación');
    await page.locator('#ad-entre-ajuste-guardar').click();
    await expect(page.locator('#ad-entre-ajuste-error')).toHaveText('El importe tiene que ser mayor que cero.');
    expect(rpc.some(r => r.nombre === 'registrar_movimiento_entre_empresas')).toBe(false);

    expect(errores, errores.join('\n')).toEqual([]);
  });
}
