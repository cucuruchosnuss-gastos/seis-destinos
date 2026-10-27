// LOS ACOPIOS EN ADMINISTRACIÓN (27/10/2026, rama ci-prueba/acopios), en la
// maqueta "administracion-acopios" (Dolce Pasta sin control de stock, con
// acopios; Nuss sin acopios), a 390 y 1280 px, sin scroll horizontal ni
// errores de JS:
//  - la tarjeta de la portada y la pestaña Acopios (en Nuss no aparece);
//  - el listado: activos con "Quedan N de M cajas" y su barra, terminados
//    abajo, anulados al final cerrados, el filtro por cliente;
//  - el detalle con los retiros (Acopio N° 977490, −30 cajas) y Anular con
//    motivo (solo sin retiros);
//  - Nuevo acopio: el buscador ("FERNANDEZ RICARDO (también en Nuss)"), el
//    catálogo de la Carga y el cono, cajas, precio → lo que va a crear_acopio;
//  - la revisión del remito de acopio rm-4: el saldo al lado de cada renglón,
//    en amarillo si no hay o no alcanza;
//  - la cuenta del cliente: sus acopios activos, "Acopio …" / "Anulación de
//    acopio" y la "Cuenta en el grupo";
//  - valorizar la orden de FERNANDEZ con la lista de Nuss (la equivalente).
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}
async function abrir(page, unidad) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion-acopios`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((u) => { localStorage.setItem('barraUnidad.elegida', u); }, unidad);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.print = () => {}; globalThis.__maqueta = { rpc: {}, funciones: {}, firmar: () => ({ data: null, error: null }) }; });
  await expect(page.locator('#ad-vista-inicio')).toBeVisible();
}
const nb = (t) => String(t ?? '').replace(/ /g, ' ');

for (const [ancho, alto] of TAMANOS) {
  test(`Dolce: la portada, el listado, el detalle y Anular, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, 'u-d');
    const tarjeta = page.locator('#ad-secciones [data-seccion="acopios"]');
    await expect(tarjeta).toContainText('2');
    await expect(tarjeta).toContainText('Quedan 90 cajas por retirar');
    await tarjeta.click();
    await expect(page.locator('#ad-vista-acopios')).toBeVisible();
    const lista = page.locator('#ad-acopios-lista');
    await expect(lista.locator('[data-acopio]').first()).toBeVisible();
    expect(await lista.locator('[data-acopio]').evaluateAll(bs => bs.map(b => b.dataset.acopio))).toEqual(['ac-1', 'ac-2', 'ac-3', 'ac-4']);
    await expect(lista.locator('[data-acopio="ac-1"]')).toContainText('Quedan 70 de 100 cajas');
    await expect(lista.locator('[data-acopio="ac-1"] .ad-acopio__barra')).toHaveAttribute('aria-valuenow', '30');
    await expect(lista.locator('[data-acopio="ac-3"]')).toContainText('Terminado');
    // Los anulados, cerrados: el de Kiosco Pepe no se ve hasta abrirlos.
    await expect(lista.locator('[data-acopio="ac-4"]')).toBeHidden();
    await sinScrollHorizontal(page);
    await captura(page, `acopios-lista-${ancho}`, info);
    await lista.locator('[data-acopios-anulados] summary').click();
    await expect(lista.locator('[data-acopio="ac-4"]')).toBeVisible();
    // El filtro por cliente.
    await page.locator('#ad-acopios-cliente').selectOption('c-dolce');
    expect(await lista.locator('[data-acopio]').evaluateAll(bs => bs.map(b => b.dataset.acopio))).toEqual(['ac-3']);
    await page.locator('#ad-acopios-cliente').selectOption('');

    // El detalle de uno con retiros: no se anula.
    await lista.locator('[data-acopio="ac-1"]').click();
    await expect(page.locator('#ad-vista-acopio')).toBeVisible();
    const det = page.locator('#ad-acopio-cuerpo');
    await expect(det).toContainText('Quedan 70 de 100 cajas');
    await expect(det.locator('.ad-sello--acopio')).toHaveText('Acopio N° 977490');
    await expect(det).toContainText('−30 cajas');
    await expect(det).toContainText('+5 cajas');
    await expect(det).toContainText('anulá primero las órdenes de acopio');
    await expect(det.locator('[data-ac-det="anular"]')).toHaveCount(0);
    await sinScrollHorizontal(page);
    await captura(page, `acopios-detalle-${ancho}`, info);
    // Tocar la orden la abre.
    await det.locator('[data-ac-orden="od4"]').click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await page.locator('#ad-volver').click();
    await expect(page.locator('#ad-vista-acopio')).toBeVisible();
    await page.locator('#ad-acopio-volver').click();
    await expect(page.locator('#ad-vista-acopios')).toBeVisible();

    // Uno sin retiros: Anular con motivo.
    await lista.locator('[data-acopio="ac-2"]').click();
    await det.locator('[data-ac-det="anular"]').click();
    await page.locator('#ad-ac-motivo').fill('no');
    await det.locator('[data-ac-det="anular-si"]').click();
    await expect(page.locator('#ad-ac-anular-error')).toContainText('Poné el motivo');
    await page.locator('#ad-ac-motivo').fill('  Se cargó de más ');
    await det.locator('[data-ac-det="anular-si"]').click();
    await expect(det).toContainText('Acopio anulado.');
    await expect(det).toContainText('Anulado: Se cargó de más');
    await expect.poll(() => rpc.find(r => r.nombre === 'anular_acopio')?.params).toEqual({ p_id: 'ac-2', p_motivo: 'Se cargó de más' });
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Dolce: Nuevo acopio, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, 'u-d');
    await page.locator('[data-pestana="acopios"]').first().click();
    await page.locator('[data-ac-accion="nuevo"]').click();
    await expect(page.locator('#ad-ac-nuevo')).toContainText('Si ponés precio se le carga en la cuenta');
    await page.locator('#ad-ac-cliente-buscar').fill('fern');
    await expect(page.locator('#ad-ac-clientes')).toContainText('FERNANDEZ RICARDO (también en Nuss)');
    await page.locator('[data-ac-cliente="c-d-fer"]').click();
    await page.locator('#ad-ac-buscar').fill('cono');
    await page.locator('[data-ac-producto="pr-d-cono"]').click();
    await page.locator('[data-ac-accion="guardar"]').click();
    await expect(page.locator('#ad-ac-error')).toHaveText('Elegí el cono.');
    await page.locator('[data-ac-marca="m-lel"]').click();
    await page.locator('#ad-ac-cajas').fill('12');
    await page.locator('#ad-ac-precio').fill('1500,50');
    await expect.poll(async () => nb(await page.locator('#ad-ac-total').textContent())).toBe('Se le carga $ 18.006,00 en la cuenta del cliente.');
    await page.locator('#ad-ac-remito').fill('3050');
    await page.locator('#ad-ac-factura').fill('A-0001-77');
    await sinScrollHorizontal(page);
    await captura(page, `acopios-nuevo-${ancho}`, info);
    await page.locator('[data-ac-accion="guardar"]').click();
    await expect(page.locator('#ad-acopios-aviso')).toContainText('Acopio cargado: 12 cajas de Cono dulce 48');
    await expect.poll(() => rpc.some(r => r.nombre === 'crear_acopio')).toBe(true);
    const p = rpc.find(r => r.nombre === 'crear_acopio').params;
    expect(p).toMatchObject({ p_unidad_negocio_id: 'u-d', p_cliente_id: 'c-d-fer', p_presentacion_id: 'pr-d-cono', p_marca_id: 'm-lel', p_cajas: 12, p_numero_remito: '3050',
      p_numero_factura: 'A-0001-77', p_precio_caja: 1500.5, p_observaciones: null });
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Dolce: el saldo del acopio en el remito, la cuenta y valorizar, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, 'u-d');
    // El remito de acopio: el saldo al lado de cada renglón.
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-remitos [data-remito="rm-4"]').click();
    await expect(page.locator('#ad-vista-remito')).toBeVisible();
    const saldo = (i) => page.locator(`#ad-remito-cuerpo [data-rm-acopio="${i}"]`);
    await expect(saldo(0)).toHaveText('Acopio: quedan 70 cajas; después de este remito, 40.');
    await expect(saldo(1)).toHaveText('No hay acopio de esto para el cliente: quedan 20 cajas y el remito pide 25.');
    await expect(saldo(1)).toHaveClass(/ad-rm-acopio--falta/);
    await expect(saldo(2)).toHaveText('No hay acopio de esto para el cliente.');
    await sinScrollHorizontal(page);
    await saldo(1).scrollIntoViewIfNeeded();
    await captura(page, `acopios-remito-${ancho}`, info);
    await page.locator('#ad-rm-cantidad-1').fill('20');
    await expect(saldo(1)).toHaveText('Acopio: quedan 20 cajas; después de este remito, 0.');
    await expect(page.locator('#ad-rm-cantidad-1')).toBeFocused();
    expect(rpc.some(r => r.nombre === 'acopios_lista' && r.params.p_cliente_id === 'c-d-ros')).toBe(true);
    await page.locator('#ad-remito-volver').click();

    // La cuenta de Almacén Rosario: sus acopios activos y los movimientos.
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('#ad-clientes-lista [data-cliente="c-d-fer"]').first().waitFor();
    await expect(page.locator('#ad-clientes-lista [data-cliente="c-d-fer"]')).toContainText('FERNANDEZ RICARDO (también en Nuss)');
    await page.locator('#ad-clientes-lista [data-cliente="c-d-ros"]').click();
    const cuenta = page.locator('#ad-cliente-cuerpo');
    await expect(cuenta.locator('[data-acopios-cliente]')).toContainText('Quedan 70 de 100 cajas');
    await expect(cuenta).toContainText('Anulación de acopio');
    await expect(cuenta).toContainText('Acopio 100 cajas Tallarín al huevo');
    await sinScrollHorizontal(page);
    await cuenta.locator('[data-cliente-acopio="ac-1"]').click();
    await expect(page.locator('#ad-vista-acopio')).toBeVisible();
    await expect(page.locator('#ad-acopio-volver')).toHaveText('‹ Cuenta del cliente');
    await page.locator('#ad-acopio-volver').click();
    await expect(page.locator('#ad-vista-cliente')).toBeVisible();

    // FERNANDEZ RICARDO: la cuenta en el grupo.
    await page.locator('#ad-cliente-volver').click();
    await page.locator('#ad-clientes-lista [data-cliente="c-d-fer"]').click();
    const grupo = page.locator('#ad-cliente-cuerpo [data-cuenta-grupo]');
    await expect.poll(async () => nb(await grupo.textContent())).toContain('$ 470.000,00');
    await expect.poll(async () => nb(await grupo.textContent())).toContain('Nuss $ 350.000,00');
    await expect.poll(async () => nb(await grupo.textContent())).toContain('Dolce Pasta $ 120.000,00');
    // Con Dolce elegida en la barra de arriba, la cuenta de Nuss se dice pero no
    // se abre desde acá (la empresa la decide la barra, como "También es
    // cliente de…"; el link lo prueba test-administracion-acopios.js).
    await expect(grupo.locator('[data-otra-cuenta]')).toHaveCount(0);
    await sinScrollHorizontal(page);
    await captura(page, `acopios-cuenta-grupo-${ancho}`, info);

    // Valorizar su orden con la lista de Nuss: la equivalente.
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="od7"]').click();
    await page.locator('#ad-btn-valorizar').click();
    await expect(page.locator('[data-precio="id7a"]')).toHaveValue('9.600');
    await expect(page.locator('[data-precio="id7b"]')).toHaveValue('');
    await expect(page.locator('#ad-orden-cuerpo')).toContainText('de Nuss');
    expect(rpc.some(r => r.nombre === '_presentacion_en_unidad' && r.params.p_presentacion_id === 'pr-d-cap' && r.params.p_unidad === 'u-n')).toBe(true);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Cucuruchos Nuss (sin acopios): no hay sección Acopios, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, 'u-n');
    await expect(page.locator('#ad-secciones [data-seccion="ordenes"]')).toBeVisible();
    await expect(page.locator('[data-pestana="acopios"]')).toHaveCount(0);
    await expect(page.locator('#ad-secciones [data-seccion="acopios"]')).toHaveCount(0);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
