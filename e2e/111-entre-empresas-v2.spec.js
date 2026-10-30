// ADMINISTRACIÓN → ENTRE EMPRESAS v2 (30/10/2026), en la maqueta, sin
// credenciales, a 1280 y 390 px (datos: pruebas/datos-maqueta/entre-empresas-v2.js):
//  - arriba, una tarjeta por par con el saldo neto (el caso real: "Nuss le
//    debe a Dolce Pasta $ 11.687.409,88") y los dos lados; tocarla filtra la
//    lista y tocarla de nuevo muestra todo;
//  - "Mercadería sin valorizar" con la orden D-I-0002 y "Valorizar la orden",
//    que abre la orden en Dolce;
//  - la fila con su sello, quién le debe a quién y el link al gasto;
//  - "Cargar ajuste o compensación" → registrar_movimiento_entre_empresas;
//  - las listas internas: el %, la tabla, lo sin precio en gris, y guardar
//    el % → guardar_lista_interna;
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
  test(`${ancho} px: el saldo por par, el ajuste y las listas internas`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=entre-empresas-v2&seccion=entre`);
    await expect(page.locator('#ad-vista-entre')).toBeVisible();

    // El saldo: desde siempre (800 días hasta hoy), una tarjeta por par.
    const saldos = page.locator('#ad-entre-saldos');
    await expect(saldos).toContainText('Saldo entre empresas (desde siempre)');
    await expect(saldos.locator('[data-entre-saldo]')).toHaveCount(3);
    const nd = saldos.locator('[data-entre-saldo="u-d|u-n"]');
    await expect(nd).toContainText('Nuss le debe a Dolce Pasta $ 11.687.409,88');
    await expect(nd).toContainText('Dolce Pasta debe $ 563.000,07 · Nuss debe $ 12.250.409,95');
    await expect(saldos.locator('[data-entre-saldo="u-o|u-n"]')).toContainText('Mengui le debe a Nuss $ 70.000,00');
    await expect(saldos.locator('[data-entre-saldo="u-d|u-o"]')).toContainText('Dolce Pasta le debe a Mengui $ 42.000,50');
    const pedidos = rpc.filter(r => r.nombre === 'movimientos_entre_empresas').map(r => r.params);
    expect(pedidos.some(p => p.p_desde < '2025-01-01')).toBe(true);

    // La mercadería sin valorizar.
    const sv = page.locator('#ad-entre-sin-valorizar');
    await expect(sv).toContainText('Mercadería sin valorizar');
    await expect(sv).toContainText('Orden D-I-0002');
    await expect(sv).toContainText('Total: 14 cajas sin precio');
    await expect(sv.locator('[data-entre-orden="o-di2"]')).toHaveText('Valorizar la orden');

    // La lista y la tarjeta que filtra.
    const filas = page.locator('#ad-entre-lista [data-entre]');
    await expect(filas).toHaveCount(10);
    const pago = page.locator('#ad-entre-lista [data-entre-tipo="pago"]');
    await expect(pago.locator('.ad-entre-sello--pago')).toHaveText(/pago/i);
    await expect(pago).toContainText('le debe a');
    await expect(pago.locator('[data-entre-link="gasto"]')).toHaveAttribute('href', /^gastos\.html\?gasto=g-1&volver=/);
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await captura(page, `entre-v2-${ancho}`, info);

    await saldos.locator('[data-entre-saldo="u-o|u-n"]').click();
    await expect(filas).toHaveCount(2);
    await expect(saldos.locator('[data-entre-saldo="u-o|u-n"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#ad-entre-par')).toHaveValue('u-o|u-n');
    await expect(sv).toBeEmpty();
    await saldos.locator('[data-entre-saldo="u-o|u-n"]').click();
    await expect(filas).toHaveCount(10);
    await page.locator('#ad-entre-tipo').selectOption('mercaderia');
    await expect(filas).toHaveCount(2);
    await page.locator('#ad-entre-tipo').selectOption('');

    // Cargar ajuste o compensación.
    await page.locator('[data-entre-ajuste-abrir]').click();
    await expect(page.locator('#ad-entre-ajuste')).toContainText('esto es para ajustes y compensaciones');
    await page.locator('#ad-entre-ajuste-deudora').selectOption('u-n');
    await page.locator('#ad-entre-ajuste-acreedora').selectOption('u-d');
    await page.locator('#ad-entre-ajuste-importe').fill('1500,5');
    await page.locator('#ad-entre-ajuste-concepto').fill('Compensación de la nota de crédito 12');
    expect(await sinCostado(page), 'sin scroll de costado con el ajuste abierto').toBe(true);
    if (ancho < 1024) {
      const chicos = await page.evaluate(() => [...document.querySelectorAll('#ad-vista-entre input, #ad-vista-entre select')]
        .filter(el => el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id || el.name));
      expect(chicos).toEqual([]);
    }
    await captura(page, `entre-v2-ajuste-${ancho}`, info);
    await page.locator('#ad-entre-ajuste-guardar').click();
    await expect(page.locator('#ad-entre-ajuste-hecho')).toContainText('Listo: se cargó que Nuss le debe a Dolce Pasta $ 1.500,50');
    const reg = rpc.find(r => r.nombre === 'registrar_movimiento_entre_empresas');
    expect(reg.params).toEqual({ p_acreedora: 'u-d', p_deudora: 'u-n', p_importe: 1500.5, p_fecha: reg.params.p_fecha, p_concepto: 'Compensación de la nota de crédito 12' });
    expect(reg.params.p_fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Las listas internas.
    const internas = page.locator('#ad-entre-internas');
    // Las dos de este pedido y "Entre fábricas" (la interna de siempre de la maqueta, sin productos).
    await expect(internas.locator('[data-entre-interna]')).toHaveCount(3);
    await expect(internas.locator('[data-entre-interna="l3"]')).toContainText('Esta empresa no tiene productos activos para la lista.');
    const nuss = internas.locator('[data-entre-interna="li-nd"]');
    await expect(nuss).toContainText('−5 % sobre la lista más barata de cada producto');
    await expect(nuss).toContainText('Más barata: Distribuidores $ 8.000,00');
    await expect(nuss).toContainText('Precio propio: $ 7.000,00');
    await expect(nuss.locator('.ad-entre-interna__item--sin')).toContainText('sin precio en ninguna lista');
    await expect(internas).toContainText('Si un producto tiene precio propio en la lista interna, manda ese');
    await nuss.scrollIntoViewIfNeeded();
    expect(await sinCostado(page), 'sin scroll de costado en las listas internas').toBe(true);
    await captura(page, `entre-v2-internas-${ancho}`, info);
    await page.locator('#ad-entre-interna-pct-li-nd').fill('-7,5');
    await nuss.locator('[data-entre-interna-guardar]').click();
    await expect(internas.locator('[data-entre-interna="li-nd"]')).toContainText('Guardado: −7,5 % sobre la lista más barata de cada producto.');
    expect(rpc.find(r => r.nombre === 'guardar_lista_interna').params).toEqual({ p_lista_id: 'li-nd', p_pct: -7.5 });

    // "Valorizar la orden" abre la orden en Dolce.
    await sv.locator('[data-entre-orden="o-di2"]').click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await expect(page.locator('#ad-orden-titulo')).toHaveText('Orden D-I-0002');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
