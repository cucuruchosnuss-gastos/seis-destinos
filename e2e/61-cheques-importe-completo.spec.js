// CHEQUES: IMPORTE COMPLETO (24/10/2026, Tanda B, tarea 2). En la maqueta
// (Supabase falso, sin credenciales), a 390, 360, 768×1024 y 1280 px:
//  - vender y depositar "Ya se acreditó": sin el campo de lo acreditado, el
//    resumen dice "Entran $ X a <cuenta>. Los gastos o intereses del banco se
//    cargan aparte en Gastos, categoría 'Gastos bancarios y comisiones'." con
//    el botón "Cargar el gasto del banco" (en otra pestaña), y vender_cheques
//    viaja con p_neto = el importe completo;
//  - «En el banco» → "Cargar lo acreditado": sin total, tasa ni "Acreditó $"
//    por cheque, el mismo resumen, acreditar_cheques solo con los cheques, y el
//    resultado con el botón;
//  - el botón lleva a Gastos (gastos.html?nuevo=1&categoria=<id>&unidad=<id>)
//    y Gastos abre el wizard con la categoría y la fábrica ya elegidas;
//  - el filtro de Gastos por "Gastos bancarios y comisiones" deja solo ese
//    gasto;
//  - sin scroll de costado y sin errores de JS.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const CARTERA = `${MAQUETA}/modulos/administracion.html?seccion=cheques&maqueta=cheques-banco`;
const ID_BANCARIOS = '7041825a-5a0c-484b-be07-17f9978a0d97';
const APARTE = "Los gastos o intereses del banco se cargan aparte en Gastos, categoría 'Gastos bancarios y comisiones'.";
const HREF = `gastos.html?nuevo=1&categoria=${ID_BANCARIOS}&unidad=u-n`;

const TAMANOS = [[390, 844], [360, 780], [768, 1024], [1280, 900]];

async function sinCostado(page) {
  const { w, vw } = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, vw: window.innerWidth }));
  expect(w, 'scroll de costado').toBeLessThanOrEqual(vw);
}

// Las llamadas a la base (la maqueta las anota: "[maqueta] rpc <nombre> <parámetros>").
function anotarRpc(page) {
  const llamadas = [];
  page.on('console', async (m) => {
    const t = m.text();
    if (!t.startsWith('[maqueta] rpc ')) return;
    let params = null;
    try { params = await m.args()[2]?.jsonValue(); } catch { /* sin parámetros */ }
    llamadas.push({ nombre: t.split(' ')[2], params });
  });
  return llamadas;
}

async function abrirCartera(page, ancho, alto) {
  await page.clock.setFixedTime(new Date('2026-10-13T15:00:00Z'));
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(CARTERA);
  await expect(page.locator('[data-cheque-fila="chq-1"]:visible').first()).toBeVisible();
}

// Un botón o link: entero en la pantalla y nadie encima.
async function aLaVista(page, selector) {
  const ok = await page.locator(selector).first().evaluate((b) => {
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) return 'fuera';
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el === b || b.contains(el) ? 'ok' : 'tapado';
  });
  expect(ok, selector).toBe('ok');
}

async function venderOdepositar(page, tipo) {
  await page.locator('#chq-btn-seleccionar').click();
  await page.locator('[data-cheque-fila="chq-1"]:visible').first().click();
  await page.locator('#chq-sel-banco').click();
  await page.locator(`[data-salida-tipo="${tipo}"]`).click();
  await page.locator('#chq-salida-ya').check();
}

for (const [ancho, alto] of TAMANOS) {
  test(`vender ya acreditado: sin el campo, el resumen y el botón a Gastos, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrirCartera(page, ancho, alto);
    await venderOdepositar(page, 'vendido');
    await expect(page.locator('#chq-salida-confirmar')).toHaveText('Vender');
    await expect(page.locator('#chq-venta, #chq-venta-neto, #chq-venta-descuento, #chq-venta-tasa')).toHaveCount(0);
    const resumen = page.locator('#chq-salida-resumen');
    await expect(resumen).toContainText(/Entran \$\s?387\.300,50 a Banco Macro · Nuss\./);
    await expect(resumen).toContainText(APARTE);
    const boton = resumen.locator('a[data-gastos-banco]');
    await expect(boton).toHaveText('Cargar el gasto del banco');
    await expect(boton).toHaveAttribute('href', HREF);
    await expect(boton).toHaveAttribute('target', '_blank');
    await aLaVista(page, '#chq-salida-resumen a[data-gastos-banco]');
    const alto44 = await boton.evaluate(b => b.getBoundingClientRect().height);
    expect(alto44, 'el botón se puede tocar').toBeGreaterThanOrEqual(44);
    await sinCostado(page);
    await aLaVista(page, '#chq-salida-confirmar');
    await page.locator('#chq-salida-confirmar').click();
    await expect(page.locator('#chq-modal-salida')).toBeHidden();
    const ven = llamadas.filter(l => l.nombre === 'vender_cheques');
    expect(ven).toHaveLength(1);
    expect(ven[0].params).toEqual({ p_cheque_ids: ['chq-1'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13', p_neto: 387300.5, p_detalle: null });
    await expect(page.locator('.toast')).toContainText('Los gastos del banco se cargan aparte en Gastos.');
    expect(errores).toEqual([]);
  });

  test(`depositar ya acreditado: el mismo resumen y depositar_cheques, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrirCartera(page, ancho, alto);
    await venderOdepositar(page, 'depositado');
    await expect(page.locator('#chq-salida-confirmar')).toHaveText('Depositar');
    const resumen = page.locator('#chq-salida-resumen');
    await expect(resumen).toContainText(/Entran \$\s?387\.300,50 a Banco Macro · Nuss\./);
    await expect(resumen).toContainText(APARTE);
    await expect(resumen.locator('a[data-gastos-banco]')).toHaveAttribute('href', HREF);
    await sinCostado(page);
    await aLaVista(page, '#chq-salida-confirmar');
    await page.locator('#chq-salida-confirmar').click();
    const dep = llamadas.filter(l => l.nombre === 'depositar_cheques');
    expect(dep).toHaveLength(1);
    expect(dep[0].params).toEqual({ p_cheque_ids: ['chq-1'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13' });
    expect(errores).toEqual([]);
  });

  test(`«En el banco»: acreditar sin el campo, el resumen, el resultado y el botón, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrirCartera(page, ancho, alto);
    await page.locator('[data-estado-cheque="en_banco"]').click();
    for (const id of ['chq-b1', 'chq-b2', 'chq-b3']) await page.locator(`[data-banco-cheque="${id}"]`).check();
    await page.locator('#chq-banco-acreditar').click();
    await expect(page.locator('#chq-acreditar')).toBeVisible();
    await expect(page.locator('#chq-acr-reparto, #chq-acr-total, #chq-acr-tasa, [data-acr-cheque]')).toHaveCount(0);
    await expect(page.locator('#chq-acr-lista input')).toHaveCount(0);
    await expect(page.locator('#chq-acr-lista .chq-acr-fila')).toHaveCount(3);
    const resumen = page.locator('#chq-acr-resumen');
    await expect(resumen).toContainText(/Total de los 3 cheques/);
    await expect(resumen).toContainText(/Entran \$\s?550\.000,00 a Banco Macro · Nuss\./);
    await expect(resumen).toContainText(APARTE);
    await expect(resumen.locator('a[data-gastos-banco]')).toHaveAttribute('href', HREF);
    await expect(resumen.locator('a[data-gastos-banco]')).toHaveAttribute('target', '_blank');
    await aLaVista(page, '#chq-acr-resumen a[data-gastos-banco]');
    await sinCostado(page);
    await aLaVista(page, '#chq-acr-confirmar');
    await page.locator('#chq-acr-confirmar').click();
    const acr = llamadas.filter(l => l.nombre === 'acreditar_cheques');
    expect(acr).toHaveLength(1);
    expect(Object.keys(acr[0].params).sort()).toEqual(['p_fecha', 'p_items']);
    expect([...acr[0].params.p_items].sort((a, b) => a.cheque_id.localeCompare(b.cheque_id)))
      .toEqual([{ cheque_id: 'chq-b1' }, { cheque_id: 'chq-b2' }, { cheque_id: 'chq-b3' }]);
    const res = page.locator('#chq-banco-resultado');
    await expect(res).toBeVisible();
    await expect(res).toContainText(/Entró \$\s?550\.000,00 en Banco Macro · Nuss/);
    await expect(res).not.toContainText('gasto de intereses');
    await expect(res).toContainText(APARTE);
    const boton = res.locator('a[data-gastos-banco]');
    await expect(boton).toHaveAttribute('href', HREF);
    expect(await boton.getAttribute('target')).toBeNull();
    await aLaVista(page, '#chq-banco-resultado a[data-gastos-banco]');
    await sinCostado(page);
    expect(errores).toEqual([]);
  });

  test(`el botón lleva a Gastos con la categoría y la fábrica ya elegidas, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrirCartera(page, ancho, alto);
    await venderOdepositar(page, 'vendido');
    const href = await page.locator('#chq-salida-resumen a[data-gastos-banco]').getAttribute('href');
    expect(href).toBe(HREF);
    // La maqueta guarda sus datos por pestaña: Gastos se abre con los suyos.
    await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
    await page.goto(`${MAQUETA}/modulos/gastos.html?maqueta=gastos-bancarios`);
    await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'todas'); sessionStorage.removeItem('maqueta.cambios'); });
    await page.goto(`${MAQUETA}/modulos/${href}&maqueta=gastos-bancarios`);
    await expect(page.locator('#vista-wizard')).toBeVisible();
    await page.locator('#btn-sin-foto').click();
    await page.locator('#campo-fecha').fill('2026-10-24');
    await page.locator('#campo-fecha-pago').fill('2026-10-24');
    await page.locator('#campo-razon-social').fill('Banco Macro');
    await page.locator('#campo-importe').fill('12500');
    await page.locator('#grilla-medio-pago .btn-tipo-doc[data-valor="efectivo"]').click();
    await page.locator('#btn-datos-siguiente').click();
    await expect(page.locator('#sp-destino')).toBeVisible();
    await expect(page.locator('#grilla-destino .tarjeta-destino[data-id="u-n"]')).toHaveClass(/seleccionada/);
    await page.locator('#btn-destino-siguiente').click();
    await expect(page.locator('#sp-categoria')).toBeVisible();
    const cat = page.locator(`#grilla-categorias .btn-categoria[data-id="${ID_BANCARIOS}"]`);
    await expect(cat).toHaveClass(/btn-categoria--seleccionado/);
    await expect(cat).toContainText('Gastos bancarios y comisiones');
    await expect(cat.locator('[data-lucide="landmark"], svg.lucide-landmark')).toHaveCount(1);
    await expect(page.locator('#grilla-categorias .btn-categoria--seleccionado')).toHaveCount(1);
    await sinCostado(page);
    await cat.click();
    await expect(page.locator('#sp-detalles')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test(`Gastos: filtrar por "Gastos bancarios y comisiones", a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/gastos.html?maqueta=gastos-bancarios`);
    await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'todas'); sessionStorage.removeItem('maqueta.cambios'); });
    await page.reload();
    const lista = page.locator('#lista-gastos');
    await expect(lista.locator('[data-id="g-b1"]')).toBeVisible();
    await expect(lista.locator('[data-id="g-b2"]')).toBeVisible();
    await page.locator('#ms-categoria-boton').click();
    const panel = page.locator('#ms-categoria-panel');
    await expect(panel).toBeVisible();
    await panel.locator(`input[type="checkbox"][value="${ID_BANCARIOS}"]`).check();
    await panel.locator('.multiselect__aplicar').click();
    await expect(lista.locator('[data-id="g-b1"]')).toBeVisible();
    await expect(lista.locator('[data-id="g-b2"]')).toHaveCount(0);
    await expect(lista.locator('[data-id="g-b1"]')).toContainText('Banco Macro');
    await sinCostado(page);
    expect(errores).toEqual([]);
  });
}
