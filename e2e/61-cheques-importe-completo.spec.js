// CHEQUES: IMPORTE COMPLETO (24/10/2026) Y ACREDITAR VENTA Y DEPÓSITO
// (28/10/2026, el gasto del banco se crea SOLO al acreditar). En la maqueta
// (Supabase falso, sin credenciales), a 390, 360, 768×1024 y 1280 px:
//  - vender y depositar "Ya se acreditó": entra el importe completo, el
//    resumen dice que así no se carga ningún gasto del banco (y cómo
//    cargarlo) y YA NO hay botón "Cargar el gasto del banco";
//    vender_cheques viaja con p_neto = el importe completo;
//  - «En el banco»: dos bloques ("Vendidos · esperando acreditación" y
//    "Depositados · esperando acreditación") con su total; "Cargar lo
//    acreditado": "Monto acreditado" en cada venta (viene el importe) y
//    "Gastos del banco" en cada depósito (viene 0), con lo que se dice en
//    vivo; un monto de más NO se manda y se dice; acreditar_cheques viaja con
//    { cheque_id, acreditado } / { cheque_id, gastos }; el resultado y el
//    aviso dicen los gastos que creó la base, con "Ver el gasto";
//  - el deep link de Gastos (gastos.html?nuevo=1&categoria=<id>&unidad=<id>)
//    sigue abriendo el wizard con la categoría y la fábrica ya elegidas;
//  - el filtro de Gastos por "Gastos bancarios y comisiones" deja solo ese
//    gasto;
//  - sin scroll de costado y sin errores de JS.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const CARTERA = `${MAQUETA}/modulos/administracion.html?seccion=cheques&maqueta=cheques-banco`;
const ID_BANCARIOS = '7041825a-5a0c-484b-be07-17f9978a0d97';
const SIN_GASTO = 'Así no se carga ningún gasto del banco: si cobró gastos, sacá el tilde de «Ya se acreditó» y cargalos al acreditar.';
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
  test(`vender ya acreditado: el resumen dice que no se carga gasto, sin botón a Gastos, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrirCartera(page, ancho, alto);
    await venderOdepositar(page, 'vendido');
    await expect(page.locator('#chq-salida-confirmar')).toHaveText('Vender');
    await expect(page.locator('#chq-venta, #chq-venta-neto, #chq-venta-descuento, #chq-venta-tasa')).toHaveCount(0);
    const resumen = page.locator('#chq-salida-resumen');
    await expect(resumen).toContainText(/Entran \$\s?387\.300,50 a Banco Macro · Nuss\./);
    await expect(resumen).toContainText(SIN_GASTO);
    await expect(page.locator('[data-gastos-banco]')).toHaveCount(0);
    await expect(page.getByText('Cargar el gasto del banco')).toHaveCount(0);
    await sinCostado(page);
    await aLaVista(page, '#chq-salida-confirmar');
    await page.locator('#chq-salida-confirmar').click();
    await expect(page.locator('#chq-modal-salida')).toBeHidden();
    const ven = llamadas.filter(l => l.nombre === 'vender_cheques');
    expect(ven).toHaveLength(1);
    expect(ven[0].params).toEqual({ p_cheque_ids: ['chq-1'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13', p_neto: 387300.5, p_detalle: null });
    await expect(page.locator('.toast')).toContainText('Se vendió 1 cheque');
    await expect(page.locator('.toast')).not.toContainText('se cargan aparte');
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
    await expect(resumen).toContainText(SIN_GASTO);
    await expect(page.locator('[data-gastos-banco]')).toHaveCount(0);
    await sinCostado(page);
    await aLaVista(page, '#chq-salida-confirmar');
    await page.locator('#chq-salida-confirmar').click();
    const dep = llamadas.filter(l => l.nombre === 'depositar_cheques');
    expect(dep).toHaveLength(1);
    expect(dep[0].params).toEqual({ p_cheque_ids: ['chq-1'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13' });
    expect(errores).toEqual([]);
  });

  test(`«En el banco»: dos bloques y acreditar con lo acreditado y los gastos, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrirCartera(page, ancho, alto);
    await page.locator('[data-estado-cheque="en_banco"]').click();
    // Los dos bloques, cada uno con su total.
    const ventas = page.locator('[data-banco-bloque="venta"]');
    const depositos = page.locator('[data-banco-bloque="deposito"]');
    await expect(ventas.locator('.chq-banco-bloque__titulo')).toHaveText('Vendidos · esperando acreditación');
    await expect(ventas.locator('.chq-banco-bloque__total')).toHaveText(/^2 cheques · \$\s?500\.000,00$/);
    await expect(depositos.locator('.chq-banco-bloque__titulo')).toHaveText('Depositados · esperando acreditación');
    await expect(depositos.locator('.chq-banco-bloque__total')).toHaveText(/^1 cheque · \$\s?50\.000,00$/);
    await expect(ventas.locator('[data-banco-cheque="chq-b1"]')).toHaveCount(1);
    await expect(depositos.locator('[data-banco-cheque="chq-b3"]')).toHaveCount(1);
    await sinCostado(page);
    for (const id of ['chq-b1', 'chq-b2', 'chq-b3']) await page.locator(`[data-banco-cheque="${id}"]`).check();
    await page.locator('#chq-banco-acreditar').click();
    await expect(page.locator('#chq-acreditar')).toBeVisible();
    // Los campos: el importe en las ventas, 0 en el depósito.
    const b1 = page.locator('[data-acr-monto="chq-b1"]');
    const b2 = page.locator('[data-acr-monto="chq-b2"]');
    const b3 = page.locator('[data-acr-monto="chq-b3"]');
    await expect(b1).toHaveValue('300.000');
    await expect(b2).toHaveValue('200.000');
    await expect(b3).toHaveValue('0');
    await expect(page.locator('label[for="chq-acr-monto-chq-b1"]')).toHaveText('Monto acreditado');
    await expect(page.locator('label[for="chq-acr-monto-chq-b3"]')).toHaveText('Gastos del banco');
    await expect(page.locator('#chq-acr-resumen')).toContainText('No se carga ningún gasto.');
    await expect(page.locator('[data-gastos-banco]')).toHaveCount(0);
    // Escribir: lo que se dice en vivo y el resumen.
    await b1.fill('294000');
    await expect(b1).toHaveValue('294.000');
    await expect(page.locator('[data-acr-vivo="chq-b1"]')).toHaveText(/^Diferencia \$\s?6\.000,00 \(2 %\) → se carga como gasto$/);
    await b3.fill('1500');
    await expect(page.locator('[data-acr-vivo="chq-b3"]')).toHaveText(/^Se acredita \$\s?50\.000,00 · gasto \$\s?1\.500,00$/);
    await expect(page.locator('#chq-acr-resumen')).toContainText(/Gasto del banco\s*\$\s?7\.500,00/);
    await expect(page.locator('#chq-acr-resumen')).toContainText("El gasto se carga solo en Gastos, categoría 'Gastos bancarios y comisiones'.");
    // Más que el importe: se dice y no se manda.
    await b2.fill('250000');
    await expect(page.locator('[data-acr-vivo="chq-b2"]')).toHaveClass(/chq-acr-fila__vivo--error/);
    await expect(page.locator('[data-acr-vivo="chq-b2"]')).toContainText('no puede ser más que el importe');
    await sinCostado(page);
    await aLaVista(page, '#chq-acr-confirmar');
    await page.locator('#chq-acr-confirmar').click();
    await expect(page.locator('#chq-acr-error')).toBeVisible();
    await expect(page.locator('#chq-acr-error')).toContainText('Cheque Nº 90000002: lo acreditado no puede ser más que el importe');
    expect(llamadas.filter(l => l.nombre === 'acreditar_cheques')).toHaveLength(0);
    await b2.fill('200000');
    await expect(page.locator('#chq-acr-error')).toBeHidden();
    await aLaVista(page, '#chq-acr-confirmar');
    await page.locator('#chq-acr-confirmar').click();
    const acr = llamadas.filter(l => l.nombre === 'acreditar_cheques');
    expect(acr).toHaveLength(1);
    expect(Object.keys(acr[0].params).sort()).toEqual(['p_fecha', 'p_items']);
    expect([...acr[0].params.p_items].sort((a, b) => a.cheque_id.localeCompare(b.cheque_id)))
      .toEqual([{ cheque_id: 'chq-b1', acreditado: 294000 }, { cheque_id: 'chq-b2', acreditado: 200000 }, { cheque_id: 'chq-b3', gastos: 1500 }]);
    // El resultado y el aviso: los gastos que devolvió la base (la maqueta).
    const res = page.locator('#chq-banco-resultado');
    await expect(res).toBeVisible();
    await expect(res).toContainText(/Entró \$\s?550\.000,00 en Banco Macro · Nuss/);
    await expect(res).toContainText(/Gasto del banco \$\s?10\.000,00 · Banco Macro · Nuss · venta/);
    await expect(res).toContainText(/Gasto del banco \$\s?1\.500,00 · Banco Macro · Nuss · depósito/);
    await expect(res.locator('a.chq-link-gasto[href="gastos.html?gasto=g-acr-venta"]')).toHaveText('Ver el gasto');
    await expect(res.locator('a.chq-link-gasto[href="gastos.html?gasto=g-acr-deposito"]')).toHaveText('Ver el gasto');
    await expect(page.locator('[data-gastos-banco]')).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('Se acreditaron 3 cheques. Gastos del banco cargados:');
    await aLaVista(page, '#chq-banco-resultado a.chq-link-gasto');
    await sinCostado(page);
    expect(errores).toEqual([]);
  });

  test(`Gastos: ?nuevo=1&categoria=…&unidad=… abre el wizard con la categoría y la fábrica, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    // La maqueta guarda sus datos por pestaña: Gastos se abre con los suyos.
    await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
    await page.goto(`${MAQUETA}/modulos/gastos.html?maqueta=gastos-bancarios`);
    await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'todas'); sessionStorage.removeItem('maqueta.cambios'); });
    await page.goto(`${MAQUETA}/modulos/${HREF}&maqueta=gastos-bancarios`);
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
