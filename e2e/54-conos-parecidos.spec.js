// "¿QUISISTE DECIR…?" AL CREAR UN CONO (21/10/2026,
// .claude/pedidos/2026-10-21-conos-parecidos.md). En producción crearon
// "CASERATTO" cuando ya existía "CASERATO". En la maqueta (Supabase falso, sin
// credenciales), en la tablet acostada (1000×540) y en un celular (390×844):
//  - la TABLET (produccion.html → Agregar producto → "+ Agregar cono nuevo") y
//    CONOS DE PAPEL (conos.html → Anotar para pedir y Agregar cono al pliego):
//    al escribir se piden los parecidos (conos_parecidos) y aparecen como
//    botones arriba del de crear; tocar uno elige ESE cono y no se crea nada;
//  - con uno "igual", crear pide "¿Seguro que no es CASERATO?" y recién al
//    confirmar manda proponer_marca con p_es_otro = true;
//  - el error de la base "Ya existe el cono X…" se ve tal cual y ofrece elegirlo;
//  - sin internet no se piden parecidos y crear anda como antes;
//  - sin scroll de costado ni errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const YA_EXISTE = 'Ya existe el cono CASERATO: elegí ese. Si de verdad es otro cono, confirmalo.';
const CASERATO_CONOS = 'cccccccc-0000-4000-8000-000000000002';
const NUEVO_CONOS = 'cccccccc-0000-4000-8000-000000000099';

function anotarRpc(page) {
  const ll = [];
  page.on('console', async (msg) => {
    const args = msg.args();
    if (args.length < 3) return;
    const a = await args[0].jsonValue().catch(() => null);
    if (a !== '[maqueta] rpc') return;
    ll.push({ nombre: await args[1].jsonValue().catch(() => null), params: await args[2].jsonValue().catch(() => null) });
  });
  return ll;
}
const de = (ll, nombre) => ll.filter(x => x.nombre === nombre);
async function sinCostado(page, ancho) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth), 'scroll de costado').toBeLessThanOrEqual(ancho);
}
// La base falsa de la página: los parecidos y lo que contesta proponer_marca.
async function base(page, { parecidos, proponer }) {
  await page.evaluate(({ parecidos, proponer }) => {
    globalThis.__maqueta = { rpc: { conos_parecidos: parecidos, proponer_marca: proponer } };
  }, { parecidos, proponer });
}

const TAMANOS = [[1000, 540, 'tablet'], [390, 844, 'celular']];

// ── La tablet ───────────────────────────────────────────────────────────────
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });
async function abrirConoNuevoTablet(page) {
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
  await persona(page, 'Federico Silva').click();
  await marcarPin(page, '4826');
  await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
  await page.locator('[data-producido]').first().click();
  await page.locator('#pr-btn-agregar-producto').click();
  await page.locator('[data-ag-producto]').first().click();
  await expect(page.locator('#pr-agregar-cono')).toBeVisible();
  await page.locator('#pr-agregar-cono-nuevo').click();
  await expect(page.locator('#pr-agregar-cono-nombre')).toBeVisible();
}
const PARECIDOS_TABLET = [
  { marca_id: 'mc-1', nombre: 'CASERATO', igual: true, similitud: 0.8 },
  { marca_id: 'mc-2', nombre: 'FABRI', igual: false, similitud: 0.45 },
];

for (const [ancho, alto, que] of TAMANOS) {
  test(`tablet: parecidos al escribir, elegir uno no crea nada, a ${ancho}×${alto} (${que})`, async ({ page }) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await abrirConoNuevoTablet(page);
    await base(page, { parecidos: PARECIDOS_TABLET, proponer: { marca_id: 'mc-nuevo', ya_existia: false } });
    await page.locator('#pr-agregar-cono-nombre').fill('CASERATTO');
    const caja = page.locator('#pr-agregar-cono-parecidos');
    await expect(caja).toContainText('¿Quisiste decir…?');
    expect(de(ll, 'conos_parecidos').pop().params).toEqual({ p_nombre: 'CASERATTO' });
    await expect(caja.locator('[data-parecido]')).toHaveText(['CASERATO', 'FABRI']);
    // Botones grandes, para el dedo, arriba del botón de crear.
    const b = await caja.locator('[data-parecido="mc-1"]').boundingBox();
    const crear = await page.locator('#pr-agregar-cono-confirmar').boundingBox();
    expect(b.height, 'el parecido es grande (56 px)').toBeGreaterThanOrEqual(56);
    expect(b.y + b.height, 'los parecidos van arriba del botón').toBeLessThanOrEqual(crear.y + 1);
    await expect(page.locator('#pr-agregar-cono-confirmar')).toHaveText('Es otro cono, crearlo igual');
    await caja.locator('[data-parecido="mc-1"]').scrollIntoViewIfNeeded();
    await sinCostado(page, ancho);
    await page.screenshot({ path: test.info().outputPath(`parecidos-tablet-${ancho}.png`) });
    // Tocar uno ELIGE ese cono: no se crea nada y el paso "Cono" lo dice.
    await caja.locator('[data-parecido="mc-1"]').click();
    await expect(page.locator('#pr-agregar-pasos [data-paso-ag="cono"]')).toContainText('CASERATO');
    await expect(page.locator('#pr-agregar-cono-form')).toBeHidden();
    expect(de(ll, 'proponer_marca')).toEqual([]);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`tablet: "igual" pide confirmación y manda p_es_otro, a ${ancho}×${alto} (${que})`, async ({ page }) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await abrirConoNuevoTablet(page);
    await base(page, { parecidos: PARECIDOS_TABLET, proponer: { marca_id: 'mc-nuevo', ya_existia: false } });
    await page.locator('#pr-agregar-cono-nombre').fill('CASERATTO');
    await expect(page.locator('#pr-agregar-cono-confirmar')).toHaveText('Es otro cono, crearlo igual');
    await page.locator('#pr-agregar-cono-confirmar').click();
    await expect(page.locator('#pr-confirma')).toBeVisible();
    await expect(page.locator('#pr-confirma-titulo')).toHaveText('¿Seguro que no es CASERATO?');
    await expect(page.locator('#pr-confirma-no')).toHaveText('No, elegir CASERATO');
    expect(de(ll, 'proponer_marca')).toEqual([]);
    await page.locator('#pr-confirma-si').click();
    await expect.poll(() => de(ll, 'proponer_marca').length).toBe(1);
    expect(de(ll, 'proponer_marca')[0].params).toEqual({ p_nombre: 'CASERATTO', p_es_otro: true });
    await expect(page.locator('#pr-agregar-pasos [data-paso-ag="cono"]')).toContainText('CASERATTO');
    await sinCostado(page, ancho);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`tablet: el error de la base tal cual y sin red sin parecidos, a ${ancho}×${alto} (${que})`, async ({ page, context }) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await abrirConoNuevoTablet(page);
    // Sin internet: no se piden parecidos; crear va directo (la base frena igual).
    await base(page, { parecidos: PARECIDOS_TABLET, proponer: 'ERROR:' + YA_EXISTE });
    await context.setOffline(true);
    await page.locator('#pr-agregar-cono-nombre').fill('CASERATTO');
    await page.waitForTimeout(600);
    expect(de(ll, 'conos_parecidos')).toEqual([]);
    await expect(page.locator('#pr-agregar-cono-parecidos')).toBeHidden();
    await expect(page.locator('#pr-agregar-cono-confirmar')).toHaveText('Agregarlo');
    await page.locator('#pr-agregar-cono-confirmar').click();
    await expect.poll(() => de(ll, 'proponer_marca').length).toBe(1);
    expect(de(ll, 'proponer_marca')[0].params).toEqual({ p_nombre: 'CASERATTO' });
    await context.setOffline(false);
    // El rechazo de la base, tal cual, y "Elegir CASERATO".
    await expect(page.locator('#pr-agregar-cono-error')).toHaveText(YA_EXISTE);
    const elegir = page.locator('#pr-agregar-cono-parecidos [data-parecido="mc-1"]');
    await expect(elegir).toHaveText('Elegir CASERATO');
    await expect(page.locator('#pr-agregar-cono-parecidos [data-cono-es-otro]')).toBeVisible();
    await elegir.click();
    await expect(page.locator('#pr-agregar-pasos [data-paso-ag="cono"]')).toContainText('CASERATO');
    expect(de(ll, 'proponer_marca')).toHaveLength(1);
    await sinCostado(page, ancho);
    expect(errores.filter(e => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/i.test(e)), errores.join('\n')).toEqual([]);
  });
}

// ── Conos de papel ──────────────────────────────────────────────────────────
const PARECIDOS_CONOS = [
  { marca_id: CASERATO_CONOS, nombre: 'CASERATO', igual: true, similitud: 0.8 },
];

for (const [ancho, alto, que] of TAMANOS) {
  test(`conos: Anotar para pedir con parecidos, elegir y confirmar, a ${ancho}×${alto} (${que})`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(`${MAQUETA}/modulos/conos.html?maqueta=conos&vista=porpedir`);
    await expect(page.locator('#cn-vista-porpedir')).toBeVisible();
    await base(page, { parecidos: PARECIDOS_CONOS, proponer: { marca_id: NUEVO_CONOS, ya_existia: false } });
    const res = page.locator('#cn-anotar-resultados');
    await page.fill('#cn-anotar-buscar', 'caseratto');
    await expect(res).toContainText('¿Quisiste decir…?');
    expect(de(ll, 'conos_parecidos').pop().params).toEqual({ p_nombre: 'caseratto' });
    await expect(res.locator('.cn-resultado--parecido')).toHaveText(['CASERATO']);
    await expect(res.locator('[data-cono-nuevo]')).toHaveText('Es otro cono, crearlo igual: «CASERATTO»');
    await sinCostado(page, ancho);
    await page.screenshot({ path: test.info().outputPath(`parecidos-conos-${ancho}.png`) });
    // Crear pregunta; "No: elegir CASERATO" lo elige sin crear.
    await res.locator('[data-cono-nuevo]').click();
    await expect(page.locator('#cn-modal-titulo')).toHaveText('¿Seguro que no es CASERATO?');
    await page.locator('#cn-modal [data-anotar-cono]').click();
    await expect(page.locator('#cn-modal-fondo')).toBeHidden();
    await expect(page.locator('#cn-anotar-elegido')).toContainText('CASERATO');
    expect(de(ll, 'proponer_marca')).toEqual([]);
    // Otra vez, ahora confirmando que es otro: p_es_otro.
    await page.locator('[data-anotar-cambiar]').click();
    await page.fill('#cn-anotar-buscar', 'caseratto');
    await expect(res.locator('[data-cono-nuevo]')).toHaveText('Es otro cono, crearlo igual: «CASERATTO»');
    await res.locator('[data-cono-nuevo]').click();
    await page.locator('#cn-modal-ok').click();
    await expect.poll(() => de(ll, 'proponer_marca').length).toBe(1);
    expect(de(ll, 'proponer_marca')[0].params).toEqual({ p_nombre: 'caseratto', p_es_otro: true });
    await expect(page.locator('#cn-anotar-elegido')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`conos: Agregar cono al pliego, el error de la base y sin red, a ${ancho}×${alto} (${que})`, async ({ page, context }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(`${MAQUETA}/modulos/conos.html?maqueta=conos&pliego=pl-322`);
    await page.locator('#cn-arm-agregar-abrir').click();
    // Elegir un parecido en Agregar: queda elegido ahí, sin crear.
    await base(page, { parecidos: PARECIDOS_CONOS, proponer: { marca_id: NUEVO_CONOS, ya_existia: false } });
    await page.fill('#cn-agr-buscar', 'caseratto');
    await page.locator('#cn-agr-resultados .cn-resultado--parecido').click();
    await expect(page.locator('#cn-arm-agregar .cn-elegido')).toContainText('CASERATO');
    expect(de(ll, 'proponer_marca')).toEqual([]);
    // Sin internet: sin parecidos; la base rechaza y se ve tal cual con "Elegir".
    await page.locator('[data-agregar-cambiar]').click();
    await base(page, { parecidos: PARECIDOS_CONOS, proponer: 'ERROR:' + YA_EXISTE });
    await context.setOffline(true);
    const antes = de(ll, 'conos_parecidos').length;
    await page.fill('#cn-agr-buscar', 'caseratto');
    await page.waitForTimeout(600);
    expect(de(ll, 'conos_parecidos')).toHaveLength(antes);
    await expect(page.locator('#cn-agr-resultados .cn-resultado--parecido')).toHaveCount(0);
    await expect(page.locator('#cn-agr-resultados [data-cono-nuevo]')).toHaveText('+ Cono nuevo: «CASERATTO»');
    await page.locator('#cn-agr-resultados [data-cono-nuevo]').click();
    await expect.poll(() => de(ll, 'proponer_marca').length).toBe(1);
    expect(de(ll, 'proponer_marca')[0].params).toEqual({ p_nombre: 'caseratto' });
    await context.setOffline(false);
    await expect(page.locator('#cn-agr-error')).toHaveText(YA_EXISTE);
    await expect(page.locator('#cn-agr-resultados [data-agregar-cono]', { hasText: 'Elegir CASERATO' })).toBeVisible();
    await page.locator('#cn-agr-resultados [data-agregar-cono]', { hasText: 'Elegir CASERATO' }).click();
    await expect(page.locator('#cn-arm-agregar .cn-elegido')).toContainText('CASERATO');
    expect(de(ll, 'proponer_marca')).toHaveLength(1);
    await sinCostado(page, ancho);
    expect(errores.filter(e => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/i.test(e)), errores.join('\n')).toEqual([]);
  });
}
