// LA COMISIÓN DE UNA ORDEN DE RETIRO (06/10/2026), en la maqueta, sin
// credenciales, a 390 y 1280 px:
//  - Administración → Órdenes: el filtro "Con comisión sin cargar", el
//    renglón "Comisión: sin cargar" debajo del total, "Cargar comisión" con el
//    porcentaje habitual del cliente y el cálculo ANTES de guardar; se llama a
//    cargar_comision_orden; el error de la base va TAL CUAL pegado al botón.
//  - La ficha del cliente: "Comisión habitual (%)"; como guardar_ficha_cliente
//    todavía no la guarda, la pantalla lo DICE.
//  - Cuentas corrientes → la ficha del proveedor COMISIONES: "Pagar" abre el
//    Registrar pago con esa factura sola; "Se la queda la empresa" con su panel.
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
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

// Administración con la comisión habitual de Anatolia (c1) en 5 %.
async function abrirAdministracion(page) {
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async () => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const clientes = datos.tablas.clientes.map(c => ({ ...c, comision_habitual: c.id === 'c1' ? 5 : null }));
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: { clientes },
      rpc: { cargar_comision_orden: { comision_importe: 32120.5, total_con_comision: 674530.5, factura_pendiente_id: 'fc1' } },
    }));
  });
  await page.reload();
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: cargar la comisión de una orden`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();

    // El filtro: solo las valorizadas, sin comisión, de clientes con habitual.
    await page.locator('#ad-filtro-comision').check();
    const filas = page.locator('#ad-ordenes-lista [data-orden]');
    await expect(filas.first()).toBeVisible();
    const n = await filas.count();
    for (let i = 0; i < n; i++) await expect(filas.nth(i)).toContainText('Comisión sin cargar');
    await expect(page.locator('#ad-ordenes-lista [data-orden="o12"]')).toBeVisible();
    await expect(page.locator('#ad-ordenes-lista [data-orden="o2"]')).toHaveCount(0);
    // "Sin valorizar" no convive con él.
    await page.locator('#ad-filtro-sin-valorizar').check();
    await expect(page.locator('#ad-filtro-comision')).not.toBeChecked();
    await page.locator('#ad-filtro-comision').check();
    await expect(page.locator('#ad-filtro-sin-valorizar')).not.toBeChecked();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la lista').toBe(true);
    await captura(page, `comision-filtro-${ancho}`, info);

    await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo).toContainText('Comisión: sin cargar (la habitual de este cliente es 5 %)');
    await page.locator('#ad-btn-comision').click();
    await expect(page.locator('[data-comision-modo="porcentaje"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#ad-comision-valor')).toHaveValue('5');
    await expect(page.locator('#ad-comision-calculo')).toHaveText(/^5 % de \$\s642\.410,00 = \$\s32\.120,50 · Total con comisión \$\s674\.530,50$/);
    const guardar = page.locator('#ad-comision-guardar');
    await guardar.scrollIntoViewIfNeeded();
    await expect(guardar).toBeInViewport();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en el panel').toBe(true);
    await captura(page, `comision-panel-${ancho}`, info);
    await guardar.click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'cargar_comision_orden').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'cargar_comision_orden').params).toEqual({ p_orden_id: 'o12', p_modo: 'porcentaje', p_valor: 5 });

    // Monto fijo, y la base frena (ya tiene pagos): el mensaje TAL CUAL.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { cargar_comision_orden: 'ERROR:La comisión de esta orden ya tiene pagos: no se puede cambiar.' } } });
    await page.locator('#ad-btn-comision').click();
    await page.locator('[data-comision-modo="monto"]').click();
    await expect(page.locator('#ad-comision-valor')).toHaveValue('');
    await page.locator('#ad-comision-valor').fill('1500');
    await expect(page.locator('#ad-comision-calculo')).toHaveText(/^Comisión \$\s1\.500,00 · Total con comisión \$\s643\.910,00$/);
    await page.locator('#ad-comision-guardar').click();
    await expect(page.locator('#ad-comision-error')).toHaveText('La comisión de esta orden ya tiene pagos: no se puede cambiar.');
    expect(rpc.filter(r => r.nombre === 'cargar_comision_orden').pop().params).toEqual({ p_orden_id: 'o12', p_modo: 'monto', p_valor: 1500 });
    // Sin comisión manda null.
    await page.locator('[data-comision-modo="ninguna"]').click();
    await expect(page.locator('#ad-comision-calculo')).toHaveText(/^Sin comisión: el total queda en \$\s642\.410,00\.$/);
    await page.locator('#ad-comision-guardar').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'cargar_comision_orden').length).toBe(3);
    expect(rpc.filter(r => r.nombre === 'cargar_comision_orden').pop().params).toEqual({ p_orden_id: 'o12', p_modo: 'ninguna', p_valor: null });
    await captura(page, `comision-error-${ancho}`, info);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: la comisión habitual en la ficha del cliente`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('#ad-clientes-lista [data-cliente="c1"]').first().click();
    await page.locator('#ad-btn-ficha').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    const campo = page.locator('#ad-f-comision_habitual');
    await expect(campo).toHaveValue('5');
    await campo.fill('7,5');
    await expect(campo).toHaveValue('7,5');
    await page.locator('#ad-ficha-guardar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'guardar_ficha_cliente')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'guardar_ficha_cliente').params.p_datos).toEqual({ comision_habitual: '7.5' });
    // La maqueta (como la base hoy) no la guarda: se dice, no "Ficha guardada".
    await expect(page.locator('#ad-ficha-error')).toHaveText('La comisión habitual NO se guardó: la base todavía no la guarda. Avisale a administración.');
    await expect(campo).toHaveValue('5');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la ficha').toBe(true);
    await captura(page, `comision-ficha-${ancho}`, info);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: las comisiones en la cuenta del proveedor COMISIONES`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes`);
    await page.evaluate(async () => {
      localStorage.setItem('barraUnidad.elegida', 'u-n');
      const datos = await fetch('/maqueta/datos/cuentas-corrientes.json').then(r => r.json());
      const t = datos.tablas;
      const fc = (id, unidad, estado, importe, saldo, numero, cliente, fecha) => ({ id, proveedor_id: 'pc', unidad_negocio_id: unidad, estado, moneda: 'ARS',
        importe, saldo_pendiente: saldo, numero_comprobante: 'Orden ' + numero, fecha_factura: fecha, modulo_origen: 'comision',
        observaciones: 'Comisión de la orden N° ' + numero + ' · ' + cliente });
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({
        tablas: {
          proveedores: [...t.proveedores, { id: 'pc', razon_social: 'COMISIONES', nombre_fantasia: null, cuit: null, direccion: null, activo: true, estado_alta: 'activo' }],
          v_saldo_proveedor: [...t.v_saldo_proveedor, { proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 33620.5, credito_disponible: 0 }],
          facturas_pendientes: [...t.facturas_pendientes,
            fc('fc1', 'u-n', 'pendiente', 32120.5, 32120.5, 13, 'Distribuidora Anatolia', '2026-10-05'),
            fc('fc0', 'u-n', 'pendiente', 1500, 1500, 9, 'Kiosco Pepe', '2026-10-01')],
          v_cuenta_corriente_movimientos: [...t.v_cuenta_corriente_movimientos,
            { proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-05', tipo: 'factura', monto: 32120.5, factura_pendiente_id: 'fc1', gasto_id: null, credito_id: null, referencia: 'Orden 13', saldo_acumulado: 33620.5, orden_desempate: 2 },
            { proveedor_id: 'pc', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-01', tipo: 'factura', monto: 1500, factura_pendiente_id: 'fc0', gasto_id: null, credito_id: null, referencia: 'Orden 9', saldo_acumulado: 1500, orden_desempate: 1 }],
          ordenes_retiro: [{ codigo: 'N-0013', comision_factura_id: 'fc1' }, { codigo: 'N-0009', comision_factura_id: 'fc0' }],
        },
        rpc: {
          // El FIFO propone la más vieja: "Pagar" tiene que dejar tildada la elegida.
          sugerir_facturas_fifo: [{ factura_pendiente_id: 'fc0', fecha_factura: '2026-10-01', numero_comprobante: 'Orden 9', saldo_pendiente: 1500, monto_a_aplicar: 1500 }],
          quedarse_comision: null,
        },
      }));
    });
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pc&unidad=u-n`);
    const lista = page.locator('#lista-movimientos-ficha');
    await expect(lista).toContainText('Orden N-0013 · Distribuidora Anatolia');
    await expect(lista.locator('.btn-pagar-comision[data-id="fc1"]')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la ficha').toBe(true);
    await captura(page, `comision-cc-ficha-${ancho}`, info);

    // Pagar: el Registrar pago de siempre, con ESA factura sola.
    await lista.locator('.btn-pagar-comision[data-id="fc1"]').click();
    await expect(page.locator('#modal-pago')).toBeVisible();
    await expect(page.locator('#campo-monto-pago')).toHaveValue('32.120,50');
    await expect(page.locator('#lista-fifo .check-fifo')).toHaveCount(2);
    const tildadas = await page.locator('#lista-fifo .fila-fifo').evaluateAll(f => f.map(x => ({ texto: x.textContent, tildada: x.querySelector('.check-fifo').checked })));
    expect(tildadas.filter(x => x.tildada).map(x => x.texto.includes('Orden 13'))).toEqual([true]);
    await captura(page, `comision-cc-pagar-${ancho}`, info);
    await page.locator('#btn-cancelar-pago').click();
    await expect(page.locator('#modal-pago')).toBeHidden();

    // Se la queda la empresa: panel propio, y se llama a quedarse_comision.
    await lista.locator('.btn-quedarse-comision[data-id="fc1"]').click();
    await expect(lista.locator('.quedarse-comision[data-id="fc1"]')).toContainText('se cierra: nadie la cobra');
    expect(rpc.some(r => r.nombre === 'quedarse_comision')).toBe(false);
    await lista.locator('.btn-confirmar-quedarse[data-id="fc1"]').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'quedarse_comision')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'quedarse_comision').params).toEqual({ p_factura_pendiente_id: 'fc1' });
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
