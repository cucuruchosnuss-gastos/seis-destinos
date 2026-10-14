// CONOS DE PAPEL → "+ Cono nuevo" también al ANOTAR para pedir (14/10/2026,
// .claude/pedidos/2026-10-14-conos-anotar.md). En la maqueta (Supabase falso,
// sin credenciales), a 1280, 390 y 360 px y en la tablet (1000 × 540):
//  - un nombre que no existe en "Anotar para pedir" → aparece "+ Cono nuevo:
//    «LE CREMME»" (y es lo único que se ve, porque no hay resultados);
//  - al tocarlo, proponer_marca viaja con ese nombre (espacios del medio
//    colapsados) y el cono queda ELEGIDO en el formulario de anotar;
//  - se anota: anotar_cono_pendiente viaja con el marca_id que devolvió la base;
//  - un nombre que existe exacto (sin mirar mayúsculas ni acentos) no ofrece crear;
//  - si la base lo rechaza ("rechazado"), el error se ve tal cual;
//  - sin scroll de costado ni errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const DATOS = require('../pruebas/datos-maqueta/conos');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const URL = `${MAQUETA}/modulos/conos.html?maqueta=conos&vista=porpedir`;
const NUEVO_ID = DATOS.rpc.proponer_marca.marca_id;

function anotarRpc(page) {
  const llamadas = [];
  page.on('console', async (msg) => {
    const args = msg.args();
    if (args.length < 3) return;
    const a = await args[0].jsonValue().catch(() => null);
    if (a !== '[maqueta] rpc') return;
    llamadas.push({ nombre: await args[1].jsonValue().catch(() => null), params: await args[2].jsonValue().catch(() => null) });
  });
  return llamadas;
}
const llamadas = (ll, nombre) => ll.filter(x => x.nombre === nombre);

async function sinCostado(page, ancho) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w, 'scroll de costado').toBeLessThanOrEqual(ancho);
}

const TAMANOS = [[1280, 900, 'compu'], [390, 844, 'celular'], [360, 740, 'celular angosto'], [1000, 540, 'tablet']];

for (const [ancho, alto, que] of TAMANOS) {
  test(`Anotar para pedir: "+ Cono nuevo", queda elegido y se anota, a ${ancho} (${que})`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(URL);
    await expect(page.locator('#cn-vista-porpedir')).toBeVisible();
    const res = page.locator('#cn-anotar-resultados');
    // Un nombre que existe exacto (sin mirar mayúsculas ni acentos): no ofrece crear.
    await page.fill('#cn-anotar-buscar', 'Áspen');
    await expect(res.locator('[data-anotar-cono]')).toHaveText(['ASPEN']);
    await expect(res.locator('[data-cono-nuevo]')).toHaveCount(0);
    // Una sola letra: tampoco.
    await page.fill('#cn-anotar-buscar', 'z');
    await expect(res.locator('[data-cono-nuevo]')).toHaveCount(0);
    // "LE CREMME" no existe: el botón es lo único que se ve.
    await page.fill('#cn-anotar-buscar', 'le   cremme');
    await expect(res.locator('button')).toHaveCount(1);
    await expect(res.locator('[data-cono-nuevo]')).toHaveText('+ Cono nuevo: «LE CREMME»');
    await res.locator('[data-cono-nuevo]').click();
    await expect.poll(() => llamadas(ll, 'proponer_marca').length).toBe(1);
    expect(llamadas(ll, 'proponer_marca')[0].params).toEqual({ p_nombre: 'le cremme' });
    // Queda ELEGIDO en el formulario de anotar.
    await expect(page.locator('#cn-anotar-elegido')).toBeVisible();
    await expect(page.locator('#cn-anotar-elegido')).toContainText('LE CREMME');
    await expect(page.locator('#cn-anotar-buscar')).toBeHidden();
    await expect(page.locator('#cn-anotar-error')).toBeHidden();
    // Y se anota con el cono que devolvió la base.
    await page.locator('[data-sumar-anotar="10000"]').click();
    await page.locator('#cn-btn-anotar').click();
    await expect.poll(() => llamadas(ll, 'anotar_cono_pendiente').length).toBe(1);
    expect(llamadas(ll, 'anotar_cono_pendiente')[0].params.p_marca_id).toBe(NUEVO_ID);
    expect(llamadas(ll, 'anotar_cono_pendiente')[0].params.p_cantidad).toBe(10000);
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}

for (const [ancho, alto] of [[1280, 900], [390, 844]]) {
  test(`Anotar para pedir: si la base rechaza el cono nuevo, el error se ve tal cual, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(URL);
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { proponer_marca: 'ERROR:Ese cono está marcado como rechazado. Hablalo con quien configura producción.' } }; });
    await page.fill('#cn-anotar-buscar', 'no va mas');
    await page.locator('#cn-anotar-resultados [data-cono-nuevo]').click();
    await expect(page.locator('#cn-anotar-error')).toHaveText('Ese cono está marcado como rechazado. Hablalo con quien configura producción.');
    await expect(page.locator('#cn-anotar-error')).toBeVisible();
    await expect(page.locator('#cn-anotar-elegido')).toBeHidden();
    expect(llamadas(ll, 'anotar_cono_pendiente')).toEqual([]);
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}
