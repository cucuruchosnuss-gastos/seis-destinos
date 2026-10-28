// LA ORDEN A OTRA EMPRESA DEL GRUPO (24/10/2026). En la maqueta (Supabase
// falso, sin credenciales), a 390, 360, tablet (768 × 1024) y 1280 px:
//  - LA CARGA (retiros.html, datos `retiros-entre-empresas`): al elegir el
//    cliente "DOLCE PASTA SRL" (unidad_grupo_id = Dolce Pasta) se ve "Entre
//    empresas…" (desde el 26/10/2026, "Va al stock de Dolce Pasta con los
//    mismos lotes") y NO se ofrece
//    "Devolución de mercadería"; el resumen lo repite, a la base va lo de
//    siempre y la orden confirmada dice adónde entró. Con otro cliente, la
//    devolución vuelve.
//  - ADMINISTRACIÓN (datos `orden-entre-empresas`): la lista marca "Entre
//    empresas"; el detalle de la valorizada dice "Queda como deuda de Dolce
//    Pasta con Cucuruchos Nuss", sin comisión, sin "Facturas de ARCA" y sin
//    "Dividir para facturar"; valorizar la otra avisa lo mismo y manda la RPC
//    de siempre; la lista de clientes dice "Empresa del grupo" y la ficha "Es
//    la empresa Dolce Pasta del grupo"; Entre empresas muestra el código de la
//    orden con el link, y el link abre la orden.
//  - sin scroll de costado y sin errores de JavaScript.
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

const TAMANOS = [['390', 390, 844], ['360', 360, 780], ['tablet', 768, 1024], ['1280', 1280, 900]];

async function abrirCarga(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-entre-empresas`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.removeItem('retiros.borrador') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-empresa]').first()).toBeVisible();
  await page.locator('[data-empresa="u-n"]').click();
}

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: la carga a otra empresa del grupo avisa y no ofrece devoluciones`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page);

    // DOLCE PASTA SRL: el aviso a la vista mientras se elige del catálogo
    // (en el celular la tarjeta del cliente no se ve en ese paso) y sin devolución.
    await page.locator('#rt-cliente-buscar').fill('dolce');
    await page.locator('[data-cliente="c-dp"]').first().click();
    const TEXTO = 'Va al stock de Dolce Pasta con los mismos lotes';
    const avisoPaso = page.locator(ancho < 1024 ? '#rt-aviso-entre-catalogo' : '#rt-aviso-entre');
    await expect(avisoPaso).toBeVisible();
    await expect(avisoPaso).toHaveText(TEXTO);
    expect(await page.locator('#rt-agregar-devolucion').getAttribute('hidden'), 'sin "Devolución de mercadería"').not.toBeNull();
    if (ancho >= 1024) await expect(page.locator('#rt-aviso-entre-catalogo')).toBeHidden();
    expect(await sinCostado(page), 'sin scroll de costado con el aviso').toBe(true);
    const caja = await avisoPaso.boundingBox();
    expect(caja.x >= -0.5 && caja.x + caja.width <= ancho + 0.5, 'el aviso entra a lo ancho').toBe(true);
    await captura(page, `entre-empresas-catalogo-${nombre}`, info);

    // Un renglón de 5 cajas: la orden armada con el cliente, el aviso y sin devolución.
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('5');
    await page.locator('[data-r-listo="0"]').click();
    await expect(page.locator('#rt-aviso-entre')).toBeVisible();
    await expect(page.locator('#rt-aviso-entre')).toHaveText(TEXTO);
    // 27/10/2026: es una ORDEN INTERNA, con su numeración N-I-….
    await expect(page.locator('#rt-cliente-elegido .rt-sello--entre')).toHaveText('Orden interna');
    await expect(page.locator('#rt-cliente-elegido .rt-numerar')).toHaveText('Se numera al confirmar: N-I-…');
    await expect(page.locator('#rt-agregar')).toBeVisible();
    await expect(page.locator('#rt-agregar-devolucion')).toBeHidden();
    expect(await sinCostado(page), 'sin scroll de costado en la orden').toBe(true);
    await captura(page, `entre-empresas-orden-${nombre}`, info);
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-vista-resumen')).toBeVisible();
    await expect(page.locator('#rt-resumen .rt-aviso-entre')).toHaveText('Va al stock de Dolce Pasta con los mismos lotes');
    expect(await sinCostado(page), 'sin scroll de costado en el resumen').toBe(true);
    await page.locator('#rt-confirmar').click();
    await expect(page.locator('#rt-hecho')).toContainText('N-I-0042');
    await expect(page.locator('#rt-hecho .rt-hecho__rotulo')).toHaveText('Orden interna confirmada');
    await expect(page.locator('#rt-hecho .rt-aviso-entre')).toHaveText('Orden interna: lo que salió entra al stock de Dolce Pasta.');
    const reg = rpc.find(r => r.nombre === 'registrar_orden_retiro')
    expect(reg?.params?.p_cliente_id).toBe('c-dp');
    expect(reg.params.p_items.every(i => !i.tipo || i.tipo === 'retiro'), 'sin devoluciones').toBe(true);
    expect(await sinCostado(page), 'sin scroll de costado en la orden confirmada').toBe(true);
    await captura(page, `entre-empresas-confirmada-${nombre}`, info);

    // Otro retiro, a un cliente común: sin aviso y con la devolución.
    await page.locator('#rt-otra').click();
    if (await page.locator('[data-empresa="u-n"]').isVisible()) await page.locator('[data-empresa="u-n"]').click();
    await page.locator('#rt-cliente-buscar').fill('turco');
    await page.locator('[data-cliente]').first().click();
    await expect(page.locator('#rt-aviso-entre-catalogo')).toBeHidden();
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('1');
    await page.locator('[data-r-listo="0"]').click();
    await expect(page.locator('#rt-aviso-entre')).toHaveCount(0);
    await expect(page.locator('#rt-agregar-devolucion')).toBeVisible();
    expect(errores).toEqual([]);
  });
}

async function abrirAdministracion(page, extra = '') {
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => { try { localStorage.setItem('barraUnidad.elegida', 'u-n') } catch { /* nada */ } });
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=orden-entre-empresas${extra}`);
}

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: Administración marca la orden entre empresas y dice de quién es la deuda`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();

    // La lista: el sello.
    const fila = page.locator('#ad-ordenes-lista [data-orden="o42"]');
    await expect(fila.locator('.ad-sello--entre')).toHaveText('Orden interna');
    await expect(page.locator('#ad-ordenes-lista [data-orden="o12"] .ad-sello--entre')).toHaveCount(0);
    expect(await sinCostado(page), 'sin scroll de costado en la lista').toBe(true);

    // El detalle de la valorizada.
    await fila.click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo.locator('[data-entre-deuda]')).toHaveText('Queda como deuda de Dolce Pasta con Cucuruchos Nuss (Entre empresas): no va a la cuenta corriente.');
    await expect(cuerpo).toContainText('Es Dolce Pasta, otra empresa del grupo: lo que salió entró a su stock.');
    await expect(cuerpo).not.toContainText('Comisión');
    await expect(cuerpo).not.toContainText('Facturas de ARCA');
    // Ni los puntos N1 / N2 (28/10/2026: van en la misma pantalla).
    await expect(page.locator('#ad-orden-facturar')).toBeHidden();
    await expect(page.locator('#ad-btn-corregir-valor')).toBeVisible();
    expect(await sinCostado(page), 'sin scroll de costado en el detalle').toBe(true);
    await captura(page, `entre-empresas-detalle-${nombre}`, info);

    // Valorizar la otra: el aviso y la RPC de siempre.
    await page.goBack().catch(() => {});
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o43"]').click();
    await page.locator('#ad-btn-valorizar').click();
    await expect(cuerpo.locator('[data-entre-deuda]')).toHaveText('Al valorizar, queda como deuda de Dolce Pasta con Cucuruchos Nuss (Entre empresas): no va a la cuenta corriente.');
    await expect(cuerpo).not.toContainText('límite de crédito');
    const precio = cuerpo.locator('[data-precio]').first();
    await precio.fill('50000');
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.some(r => r.nombre === 'valorizar_orden_retiro')).toBe(true);
    const v = rpc.find(r => r.nombre === 'valorizar_orden_retiro');
    expect(Object.keys(v.params).sort()).toEqual(['p_orden_id', 'p_precios']);
    expect(v.params.p_orden_id).toBe('o43');
    expect(errores).toEqual([]);
  });

  test(`${nombre}: la ficha, la lista de clientes y Entre empresas con el link a la orden`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    // Entre empresas: la deuda de la orden con su código y el link.
    await abrirAdministracion(page, '&seccion=entre');
    await expect(page.locator('#ad-vista-entre')).toBeVisible();
    const link = page.locator('#ad-entre-lista [data-entre-orden="o42"]').first();
    await expect(link).toHaveText('N-I-0042');
    await expect(page.locator('#ad-entre-lista [data-entre-orden-fila]')).toHaveCount(2);
    expect(await sinCostado(page), 'sin scroll de costado en Entre empresas').toBe(true);
    await link.scrollIntoViewIfNeeded();
    await captura(page, `entre-empresas-movimientos-${nombre}`, info);
    await link.click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await expect(page.locator('#ad-orden-titulo')).toHaveText('Orden N-I-0042');
    await expect(page.locator('#ad-orden-cuerpo [data-entre-deuda]')).toBeVisible();

    // Clientes: "Empresa del grupo" y la ficha.
    await page.locator('[data-pestana="clientes"]').first().click();
    const cli = page.locator('[data-cliente="c-dp"]').first();
    await expect(cli.locator('[data-sello-entre]')).toHaveText(/Empresa del grupo/i);
    await cli.click();
    await page.locator('#ad-btn-ficha').click();
    await expect(page.locator('#ad-ficha-aviso [data-ficha-entre]')).toContainText('Es la empresa Dolce Pasta del grupo.');
    expect(await sinCostado(page), 'sin scroll de costado en la ficha').toBe(true);
    await captura(page, `entre-empresas-ficha-${nombre}`, info);
    expect(errores).toEqual([]);
  });
}
