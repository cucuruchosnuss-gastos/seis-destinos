// Ingreso de producto terminado (14/10/2026, pedido del 14/10), en la maqueta
// "ingreso-terminado" (Producción + materia_prima:cargar en Cucuruchos Nuss,
// dos proveedores y el lote vigente del Mini): en el stock terminado de la
// gestión, "Cargar ingreso" abre el formulario; de un proveedor (con precio)
// y de otra fábrica (sin precio, y sin proveedor en el pedido); el lote viene
// con el vigente y al cambiarlo aparece el tilde; el error de la base se ve
// tal cual y el reintento manda el MISMO client_uuid; "Listo: entraron 12
// cajas" y vuelve al stock. Sin el permiso, el botón no aparece. A 1280, 390,
// 360 y la tablet (1000×540), sin scroll horizontal ni errores. Corre
// SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[1280, 860], [390, 860], [360, 780], [1000, 540]];

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// Las llamadas a la base, como las anota la maqueta en la consola.
// console.log('[maqueta] rpc', nombre, params): se guarda la promesa en el
// momento (el orden queda) y leidas() espera a que estén todas.
function anotarRpc(page) {
  const pendientes = [];
  page.on('console', m => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const [, nombre, params] = m.args();
    pendientes.push(Promise.all([nombre?.jsonValue(), params?.jsonValue()])
      .then(([n, p]) => ({ nombre: n, params: p }), () => ({ nombre: null, params: null })));
  });
  return { leidas: () => Promise.all(pendientes) };
}

async function abrir(page, ancho, alto) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(`${MAQUETA}/modulos/produccion-gestion.html?vista=stock&maqueta=ingreso-terminado`);
  await expect(page.locator('#pr-stock')).toBeVisible();
  const boton = page.locator('#pr-stock-ingresar');
  await expect(boton).toBeVisible();
  await boton.click();
  await expect(page.locator('#pr-ingreso')).toBeVisible();
  await expect(page.locator('#pr-stock')).toBeHidden();
  await expect(page.locator('[data-ing-campo="productoId"]')).toBeVisible();
}

for (const [ancho, alto] of TAMANOS) {
  test(`ingreso de un proveedor, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await abrir(page, ancho, alto);
    await expect(page.locator('#pr-ing-unidad')).toHaveValue('u-n');
    await expect(page.locator('#pr-ing-fecha')).not.toHaveValue('');

    // Sin elegir de dónde viene, no manda.
    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-ing-error')).toHaveText('Elegí de dónde viene: un proveedor o una fábrica del grupo.');

    await page.locator('[data-ing-origen="proveedor"]').click();
    await expect(page.locator('[data-ing-origen="proveedor"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#pr-ing-buscar').fill('rodr');
    await page.locator('[data-ing-proveedor="prov-1"]').click();
    await expect(page.locator('.pr-ing__elegido')).toContainText('RODRIGO CAPELINAS SRL');

    // El producto trae su única presentación y el lote vigente.
    await page.locator('[data-ing-campo="productoId"]').selectOption('p1');
    await expect(page.locator('[data-ing-campo="presentacionId"]')).toHaveValue('pr1');
    const lote = page.locator('[data-ing-campo="lote"]');
    await expect(lote).toHaveValue('L-1013');
    const tilde = page.locator('.pr-ing__tilde');
    await expect(tilde).toBeHidden();
    await lote.fill('L-1014');
    await expect(tilde).toBeVisible();
    await tilde.locator('input').check();

    await page.locator('[data-ing-campo="cajas"]').fill('12');
    await expect(page.locator('[data-ing-campo="precio"]')).toBeVisible();
    await page.locator('[data-ing-campo="precio"]').fill('1500');
    await page.locator('#pr-ing-remito').fill('R-0001-123');

    // Los campos a 16 px (sin zoom en el celular).
    const fuente = await page.locator('[data-ing-campo="cajas"]').evaluate(el => getComputedStyle(el).fontSize);
    expect(fuente).toBe('16px');
    await sinScrollHorizontal(page);
    await captura(page, `ingreso-proveedor-${ancho}`, info);

    // Primero la base dice que no: el texto tal cual, y el formulario sigue.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { ingresar_producto_terminado: 'ERROR:Renglón 1: ese producto es de otra fábrica.' } } });
    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-ing-error')).toHaveText('Renglón 1: ese producto es de otra fábrica.');
    await expect(page.locator('#pr-ingreso')).toBeVisible();

    // Después sí.
    await page.evaluate(() => { globalThis.__maqueta = null });
    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-stock')).toBeVisible();
    await expect(page.locator('#pr-ingreso')).toBeHidden();
    await expect(page.getByText('Listo: entraron 12 cajas.')).toBeVisible();

    const llamadas = await rpc.leidas();
    const ingresos = llamadas.filter(l => l.nombre === 'ingresar_producto_terminado');
    expect(ingresos.length, 'dos intentos').toBe(2);
    expect(ingresos[0].params.p_client_uuid, 'el reintento manda el MISMO uuid').toBe(ingresos[1].params.p_client_uuid);
    const p = ingresos[1].params;
    expect(p.p_unidad_negocio_id).toBe('u-n');
    expect(p.p_proveedor_id).toBe('prov-1');
    expect(p.p_unidad_origen_id).toBeNull();
    expect(p.p_remito).toBe('R-0001-123');
    expect(p.p_items).toEqual([{ presentacion_id: 'pr1', marca_id: null, cajas: 12, lote: 'L-1014', precio_caja: 1500 }]);
    const lotes = llamadas.filter(l => l.nombre === 'guardar_lote_vigente');
    expect(lotes.map(l => l.params)).toEqual([{ p_unidad_negocio_id: 'u-n', p_producto_id: 'p1', p_lote: 'L-1014' }]);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`ingreso de otra fábrica (sin precio), a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await abrir(page, ancho, alto);
    // Primero proveedor, después otra fábrica: el proveedor se suelta.
    await page.locator('[data-ing-origen="proveedor"]').click();
    await page.locator('#pr-ing-buscar').fill('anatolia');
    await page.locator('[data-ing-proveedor="prov-2"]').click();
    await page.locator('[data-ing-origen="fabrica"]').click();
    await expect(page.locator('[data-ing-origen="fabrica"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ing-origen="proveedor"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#pr-ing-buscar')).toHaveCount(0);
    await expect(page.locator('.pr-ing__elegido')).toHaveCount(0);
    // La fábrica que recibe no se ofrece como origen.
    const origen = page.locator('#pr-ing-origen-unidad');
    await expect(origen.locator('option[value="u-n"]')).toHaveCount(0);
    await origen.selectOption('u-d');

    await page.locator('[data-ing-campo="productoId"]').selectOption('p1');
    await page.locator('[data-ing-campo="cajas"]').fill('12');
    await expect(page.locator('[data-ing-campo="precio"]')).toHaveCount(0);
    await sinScrollHorizontal(page);
    await captura(page, `ingreso-fabrica-${ancho}`, info);

    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-stock')).toBeVisible();
    await expect(page.getByText('Listo: entraron 12 cajas.')).toBeVisible();
    const llamadas = await rpc.leidas();
    const ingresos = llamadas.filter(l => l.nombre === 'ingresar_producto_terminado');
    expect(ingresos.length).toBe(1);
    expect(ingresos[0].params.p_proveedor_id, 'nunca los dos').toBeNull();
    expect(ingresos[0].params.p_unidad_origen_id).toBe('u-d');
    expect(ingresos[0].params.p_items[0].precio_caja).toBeNull();
    expect(llamadas.filter(l => l.nombre === 'guardar_lote_vigente')).toEqual([]);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('sin materia_prima:cargar ni stock:ajustar_inventario, no hay "Cargar ingreso"', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto(`${MAQUETA}/modulos/produccion-gestion.html?vista=stock&maqueta=produccion-gestion`);
  await expect(page.locator('#pr-stock')).toBeVisible();
  // El botón se pinta justo después del selector de fábrica: con el selector
  // lleno, ya se decidió.
  await expect(page.locator('#pr-stock-unidad option').first()).toBeAttached();
  await expect(page.locator('#pr-stock-ingresar')).toBeHidden();
  expect(errores, errores.join('\n')).toEqual([]);
});
