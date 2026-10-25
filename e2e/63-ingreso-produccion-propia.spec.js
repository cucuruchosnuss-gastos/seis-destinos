// La producción propia en el ingreso de producto terminado (24/10/2026), en
// la maqueta "ingreso-produccion-propia" (Producción + materia_prima:cargar en
// Cucuruchos Nuss y Dolce Pasta; en Dolce, el "Cono dulce" con origen_tipo
// 'fabrica' y lote vigente B-0910, y unos Ñoquis sin origen). Lo que se mira:
// el botón "Producción propia (Dolce Pasta)" arriba de los otros dos y a lo
// ancho; el producto de fábrica la trae elegida; el lote se llama "Lote de
// fabricación", se escribe (no se pregunta por el último) y sin él no se
// guarda; sin precio; el error de la base tal cual y el reintento con el
// MISMO client_uuid; a la base va la misma fábrica de origen y destino y el
// proveedor en null. Y que lo elegido a mano no se pisa. A 390, 360, la
// tablet (1000×540) y 1280, sin scroll horizontal ni errores. Corre SIEMPRE,
// sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[390, 860], [360, 780], [1000, 540], [1280, 860]];

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// Las llamadas a la base, como las anota la maqueta en la consola.
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

// Abre el ingreso y elige Dolce Pasta como la fábrica que recibe.
async function abrirEnDolce(page, ancho, alto) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(`${MAQUETA}/modulos/produccion-gestion.html?vista=stock&maqueta=ingreso-produccion-propia`);
  await expect(page.locator('#pr-stock')).toBeVisible();
  await page.locator('#pr-stock-ingresar').click();
  await expect(page.locator('#pr-ingreso')).toBeVisible();
  await page.locator('#pr-ing-unidad').selectOption('u-d');
  await expect(page.locator('[data-ing-campo="productoId"] option[value="p-d1"]')).toBeAttached();
}

for (const [ancho, alto] of TAMANOS) {
  test(`producción propia de Dolce Pasta, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await abrirEnDolce(page, ancho, alto);

    // Tres botones: producción propia primero, con el nombre de la fábrica.
    const botones = page.locator('[data-ing-origen]');
    await expect(botones).toHaveCount(3);
    await expect(botones.first()).toHaveAttribute('data-ing-origen', 'propia');
    const propia = page.locator('[data-ing-origen="propia"]');
    await expect(propia).toHaveText('Producción propia (Dolce Pasta)');
    await expect(propia).toHaveAttribute('aria-pressed', 'false');
    // Arriba de los otros dos y a lo ancho de los dos.
    const bp = await propia.boundingBox(), bv = await page.locator('[data-ing-origen="proveedor"]').boundingBox(), bf = await page.locator('[data-ing-origen="fabrica"]').boundingBox();
    expect(bp.y + bp.height, 'arriba de Proveedor').toBeLessThanOrEqual(bv.y + 1);
    expect(Math.abs(bv.y - bf.y), 'Proveedor y Otra fábrica en la misma fila').toBeLessThan(2);
    expect(bp.width, 'a lo ancho de los dos').toBeGreaterThan((bf.x + bf.width - bv.x) - 2);

    // El Cono dulce se hace en Dolce: trae elegida la producción propia.
    await page.locator('[data-ing-campo="productoId"]').selectOption('p-d1');
    await expect(propia).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ing-origen="proveedor"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.pr-ing__nota')).toContainText('No genera deuda entre empresas.');
    await expect(page.locator('#pr-ing-buscar')).toHaveCount(0);
    await expect(page.locator('#pr-ing-origen-unidad')).toHaveCount(0);
    await expect(page.locator('[data-ing-campo="presentacionId"]')).toHaveValue('pr-d1');
    // El lote de fabricación: sin la pregunta del último (aunque haya vigente), vacío y obligatorio.
    await expect(page.locator('.pr-ing__lote-pregunta')).toHaveCount(0);
    await expect(page.locator('[data-ing-lote]')).toHaveCount(0);
    await expect(page.locator('.pr-ing__lote .pr-campo__rotulo')).toHaveText('Lote de fabricación');
    const lote = page.locator('[data-ing-campo="lote"]');
    await expect(lote).toHaveValue('');
    await expect(lote).toHaveAttribute('required', '');
    await expect(lote).not.toHaveAttribute('readonly', '');
    await expect(page.locator('[data-ing-campo="precio"]')).toHaveCount(0);
    await expect(page.getByText('Remito (opcional)')).toBeVisible();
    await page.locator('[data-ing-campo="cajas"]').fill('8');

    // Sin lote no se guarda.
    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-ing-error')).toHaveText('Renglón 1: poné el lote de fabricación.');
    await lote.pressSequentially('t-2410');
    await expect(lote).toHaveValue('T-2410');
    expect(await lote.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
    await sinScrollHorizontal(page);
    await captura(page, `ingreso-propia-${ancho}`, info);

    // La base dice que no: el texto tal cual, y el formulario sigue.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { ingresar_producto_terminado: 'ERROR:Renglón 1: poné el lote de fabricación.' } } });
    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-ing-error')).toHaveText('Renglón 1: poné el lote de fabricación.');
    await expect(page.locator('#pr-ingreso')).toBeVisible();
    await expect(lote).toHaveValue('T-2410');

    // Después sí.
    await page.evaluate(() => { globalThis.__maqueta = null });
    await page.locator('#pr-ing-guardar').click();
    await expect(page.locator('#pr-stock')).toBeVisible();
    await expect(page.getByText('Listo: entraron 8 cajas.')).toBeVisible();

    const ingresos = (await rpc.leidas()).filter(l => l.nombre === 'ingresar_producto_terminado');
    expect(ingresos.length, 'dos intentos').toBe(2);
    expect(ingresos[0].params.p_client_uuid, 'el reintento manda el MISMO uuid').toBe(ingresos[1].params.p_client_uuid);
    const p = ingresos[1].params;
    expect(p.p_unidad_negocio_id).toBe('u-d');
    expect(p.p_unidad_origen_id, 'el origen es la misma fábrica').toBe('u-d');
    expect(p.p_proveedor_id).toBeNull();
    expect(p.p_remito).toBeNull();
    expect(p.p_items).toEqual([{ presentacion_id: 'pr-d1', marca_id: null, cajas: 8, lote: 'T-2410', precio_caja: null }]);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('lo elegido a mano no se pisa, y un producto de afuera no elige nada', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await abrirEnDolce(page, 390, 860);
  const propia = page.locator('[data-ing-origen="propia"]');
  // Los Ñoquis no se hacen en Dolce: no eligen nada.
  await page.locator('[data-ing-campo="productoId"]').selectOption('p-d2');
  await expect(propia).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-ing-origen="proveedor"]')).toHaveAttribute('aria-pressed', 'false');
  // Con Proveedor elegido a mano, el Cono dulce no lo cambia y el lote se pregunta.
  await page.locator('[data-ing-origen="proveedor"]').click();
  await page.locator('[data-ing-campo="productoId"]').selectOption('p-d1');
  await expect(page.locator('[data-ing-origen="proveedor"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(propia).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.pr-ing__lote-pregunta')).toHaveText('Último lote: B-0910. ¿Sigue siendo este?');
  // Sí, y después producción propia a mano: el vigente se suelta y se pide el de la tanda.
  await page.locator('[data-ing-lote="si"]').click();
  await expect(page.locator('[data-ing-campo="lote"]')).toHaveValue('B-0910');
  await propia.click();
  await expect(propia).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pr-ing__lote-pregunta')).toHaveCount(0);
  await expect(page.locator('.pr-ing__lote .pr-campo__rotulo')).toHaveText('Lote de fabricación');
  await expect(page.locator('[data-ing-campo="lote"]')).toHaveValue('');
  // Sin elegir nada: el mensaje nombra los tres orígenes.
  await page.locator('#pr-ing-volver').click();
  await page.locator('#pr-stock-ingresar').click();
  await page.locator('#pr-ing-guardar').click();
  await expect(page.locator('#pr-ing-error')).toHaveText('Elegí de dónde viene: producción propia, un proveedor o una fábrica del grupo.');
  await sinScrollHorizontal(page);
  await captura(page, 'ingreso-propia-a-mano', info);
  expect(errores, errores.join('\n')).toEqual([]);
});
