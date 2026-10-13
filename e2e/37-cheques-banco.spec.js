// DEPOSITAR Y VENDER CHEQUES AL BANCO (13/10/2026). En la maqueta
// (Supabase falso, sin credenciales), a 1280, 390 y 360 px, con el reloj en
// el 13/10/2026 y los datos `cheques-banco`:
//  - un cheque VENDIDO dice "Vendido el 05/10 · Banco Macro · Nuss · acreditó
//    $ 95.000,00 ($ 5.000,00 de interés)" y "Ver el gasto"; el filtro
//    "Vendidos" lo muestra solo;
//  - Seleccionar dos cheques de Nuss → "Depositar": la cuenta viene puesta
//    (el primer banco de Nuss), las cuentas en dólares, inactivas o de una
//    persona no se ofrecen, y viaja UNA llamada a depositar_cheques con los
//    dos ids, la cuenta y la fecha de hoy;
//  - "Vender al banco": la tasa completa el descuento y lo acreditado, y
//    escribir "Acreditó" recalcula los otros dos; viaja vender_cheques con
//    lo acreditado en pesos;
//  - un cheque de Dolce Pasta en un banco de Nuss avisa "entre empresas";
//  - el botón de confirmar entero a la vista; sin scroll de costado y sin
//    errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const URL = `${MAQUETA}/modulos/administracion.html?seccion=cheques&maqueta=cheques-banco`;

async function sinCostado(page, ancho) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w, 'scroll de costado').toBeLessThanOrEqual(ancho);
}

// Las llamadas a la base que hace la pantalla (la maqueta las anota en la
// consola: "[maqueta] rpc <nombre> <parámetros>").
function anotarRpc(page) {
  const llamadas = [];
  page.on('console', async (m) => {
    const t = m.text();
    if (!t.startsWith('[maqueta] rpc ')) return;
    const args = m.args();
    let params = null;
    try { params = await args[2]?.jsonValue(); } catch { /* sin parámetros */ }
    llamadas.push({ nombre: t.split(' ')[2], params });
  });
  return llamadas;
}

async function abrir(page, ancho) {
  const alto = ancho >= 1024 ? 900 : 844;
  await page.clock.setFixedTime(new Date('2026-10-13T15:00:00Z'));
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(URL);
  await expect(page.locator('[data-cheque-fila="chq-1"]:visible').first()).toBeVisible();
}

async function elegir(page, ids) {
  await page.locator('#chq-btn-seleccionar').click();
  for (const id of ids) await page.locator(`[data-cheque-fila="${id}"]:visible`).first().click();
}

// El botón de confirmar: entero en la pantalla y nadie encima.
async function confirmarALaVista(page) {
  const btn = page.locator('#chq-salida-confirmar');
  await btn.scrollIntoViewIfNeeded();
  const ok = await btn.evaluate((b) => {
    const r = b.getBoundingClientRect();
    if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) return 'fuera';
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el === b || b.contains(el) ? 'ok' : 'tapado';
  });
  expect(ok).toBe('ok');
}

for (const ancho of [1280, 390, 360]) {
  test(`un vendido dice cuánto acreditó y el filtro "Vendidos", a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho);
    await page.locator('[data-estado-cheque="vendidos"]').click();
    const fila = page.locator('[data-cheque-fila="chq-vendido"]:visible').first();
    await expect(fila).toBeVisible();
    await expect(page.locator('[data-cheque-fila="chq-1"]:visible')).toHaveCount(0);
    await expect(fila).toContainText(/Vendido el 05\/10/);
    if (ancho >= 1024) {
      await expect(fila).toContainText('Banco Macro · Nuss');
      await expect(fila).toContainText(/acreditó \$\s?95\.000,00 \(\$\s?5\.000,00 de interés\)/);
      await expect(fila.locator('a.chq-link-gasto')).toHaveAttribute('href', 'gastos.html?gasto=g-venta-1');
    }
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`depositar dos cheques en una cuenta de la Empresa, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await elegir(page, ['chq-1', 'chq-2']);
    await expect(page.locator('#chq-sel-depositar')).toBeVisible();
    await expect(page.locator('#chq-sel-vender')).toBeVisible();
    await page.locator('#chq-sel-depositar').click();

    const modal = page.locator('#chq-modal-salida');
    await expect(modal).toBeVisible();
    await expect(page.locator('#chq-salida-campo-cuenta')).toBeVisible();
    await expect(page.locator('#chq-venta')).toBeHidden();
    await expect(page.locator('#chq-salida-cuenta')).toHaveValue('cta-banco-nuss');
    const valores = await page.locator('#chq-salida-cuenta option').evaluateAll(os => os.map(o => o.value));
    expect(valores).toContain('cta-nacion-nuss');
    expect(valores).toContain('cta-dolce');
    for (const no of ['cta-usd-nuss', 'cta-vieja-nuss', 'cta-persona']) expect(valores).not.toContain(no);
    await expect(page.locator('#chq-salida-fecha')).toHaveValue('2026-10-13');
    await expect(page.locator('#chq-salida-aviso-empresas')).toBeHidden();
    await expect(page.locator('#chq-salida-confirmar')).toHaveText(/Depositar/);
    await sinCostado(page, ancho);
    await confirmarALaVista(page);
    await page.locator('#chq-salida-confirmar').click();
    await expect(modal).toBeHidden();
    const dep = llamadas.filter(l => l.nombre === 'depositar_cheques');
    expect(dep).toHaveLength(1);
    // Los ids van en el orden de la lista (lo que se paga primero, arriba).
    expect({ ...dep[0].params, p_cheque_ids: [...dep[0].params.p_cheque_ids].sort() })
      .toEqual({ p_cheque_ids: ['chq-1', 'chq-2'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13' });
    await expect(page.locator('.toast')).toContainText('Se depositaron 2 cheques en Banco Macro · Nuss');
    expect(errores).toEqual([]);
  });

  test(`vender al banco: tasa, descuento y acreditó atados, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await elegir(page, ['chq-1']);
    await page.locator('#chq-sel-vender').click();
    await expect(page.locator('#chq-venta')).toBeVisible();
    await expect(page.locator('#chq-salida-confirmar')).toHaveText(/Vender/);

    // 5 % de $ 387.300,50 = $ 19.365,03 de descuento → acreditó $ 367.935,47.
    await page.locator('#chq-venta-tasa').fill('5');
    await expect(page.locator('#chq-venta-descuento')).toHaveValue('19.365,03');
    await expect(page.locator('#chq-venta-neto')).toHaveValue('367.935,47');
    // Lo acreditado manda: 370.000 → descuento 17.300,50 y la tasa 4,47.
    await page.locator('#chq-venta-neto').fill('370000');
    await expect(page.locator('#chq-venta-descuento')).toHaveValue('17.300,50');
    await expect(page.locator('#chq-venta-tasa')).toHaveValue('4,47');
    await page.locator('#chq-venta-detalle').fill('Operación 1234');
    await expect(page.locator('#chq-salida-resumen')).toBeVisible();
    await sinCostado(page, ancho);
    await confirmarALaVista(page);
    await page.locator('#chq-salida-confirmar').click();
    await expect(page.locator('#chq-modal-salida')).toBeHidden();
    const ven = llamadas.filter(l => l.nombre === 'vender_cheques');
    expect(ven).toHaveLength(1);
    expect(ven[0].params).toEqual({ p_cheque_ids: ['chq-1'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13', p_neto: 370000, p_detalle: 'Operación 1234' });
    expect(llamadas.some(l => l.nombre === 'depositar_cheques')).toBe(false);
    await expect(page.locator('.toast')).toContainText('Se vendió 1 cheque');
    expect(errores).toEqual([]);
  });

  test(`un cheque de Dolce Pasta en un banco de Nuss avisa "entre empresas", a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho);
    await elegir(page, ['chq-dolce']);
    await page.locator('#chq-sel-depositar').click();
    await expect(page.locator('#chq-salida-cuenta')).toHaveValue('cta-dolce');
    await expect(page.locator('#chq-salida-aviso-empresas')).toBeHidden();
    await page.selectOption('#chq-salida-cuenta', 'cta-banco-nuss');
    await expect(page.locator('#chq-salida-aviso-empresas')).toBeVisible();
    await expect(page.locator('#chq-salida-aviso-empresas')).toContainText(/entre empresas/);
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}
