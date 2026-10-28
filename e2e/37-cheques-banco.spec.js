// CHEQUES AL BANCO EN DOS PASOS (13/10/2026). En la maqueta (Supabase falso,
// sin credenciales), a 1280, 390 y 360 px, con el reloj en el 13/10/2026 y los
// datos `cheques-banco`:
//  - un cheque VENDIDO dice "Vendido el 05/10 · Banco Macro · Nuss · acreditó
//    $ 95.000,00 ($ 5.000,00 de interés)" y "Ver el gasto"; el filtro
//    "Vendidos" lo muestra solo;
//  - Seleccionar dos cheques de Nuss → "Mandar al banco" → Depositar: la
//    cuenta viene puesta (el primer banco de Nuss), las cuentas en dólares,
//    inactivas o de una persona no se ofrecen, no se ofrece endosar, y viaja
//    UNA llamada a enviar_cheques_al_banco (no mueve plata);
//  - "Ya se acreditó" → Vender: viaja vender_cheques (un solo paso) con el
//    importe completo (24/10/2026: ya no se escribe lo acreditado);
//  - un cheque de Dolce Pasta en un banco de Nuss avisa "entre empresas";
//  - «En el banco» (con su contador): agrupados por cuenta y fecha; elegir
//    los tres → "Cargar lo acreditado" (desde el 28/10/2026 con un campo por
//    cheque: lo acreditado de una venta, los gastos de un depósito) →
//    acreditar_cheques; el resultado dice "Entró $ …", los gastos que creó
//    la base con "Ver el gasto" y "Entre empresas";
//  - "No lo tomó el banco" con motivo → cancelar_envio_cheques;
//  - los botones a la vista; sin scroll de costado y sin errores de JS.
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

// Un botón: entero en la pantalla y nadie encima.
async function aLaVista(page, selector) {
  const btn = page.locator(selector);
  const ok = await btn.evaluate((b) => {
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) return 'fuera';
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el === b || b.contains(el) ? 'ok' : 'tapado';
  });
  expect(ok, selector).toBe('ok');
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

  test(`mandar dos cheques al banco para depositar (no mueve plata), a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await elegir(page, ['chq-1', 'chq-2']);
    await expect(page.locator('#chq-sel-banco')).toBeVisible();
    await page.locator('#chq-sel-banco').click();

    const modal = page.locator('#chq-modal-salida');
    await expect(modal).toBeVisible();
    await expect(page.locator('#chq-salida-titulo')).toContainText('Mandar al banco 2 cheques');
    await expect(page.locator('[data-salida-tipo="endosado"]')).toBeHidden();
    await page.locator('[data-salida-tipo="depositado"]').click();
    await expect(page.locator('#chq-salida-campo-cuenta')).toBeVisible();
    await expect(page.locator('#chq-salida-campo-ya')).toBeVisible();
    await expect(page.locator('#chq-venta')).toBeHidden();
    await expect(page.locator('#chq-salida-cuenta')).toHaveValue('cta-banco-nuss');
    const valores = await page.locator('#chq-salida-cuenta option').evaluateAll(os => os.map(o => o.value));
    expect(valores).toContain('cta-nacion-nuss');
    expect(valores).toContain('cta-dolce');
    for (const no of ['cta-usd-nuss', 'cta-vieja-nuss', 'cta-persona']) expect(valores).not.toContain(no);
    await expect(page.locator('#chq-salida-fecha')).toHaveValue('2026-10-13');
    await expect(page.locator('#chq-salida-resumen')).toContainText('La plata no se mueve todavía');
    await expect(page.locator('#chq-salida-confirmar')).toHaveText('Mandar al banco');
    await sinCostado(page, ancho);
    await aLaVista(page, '#chq-salida-confirmar');
    await page.locator('#chq-salida-confirmar').click();
    await expect(modal).toBeHidden();
    const env = llamadas.filter(l => l.nombre === 'enviar_cheques_al_banco');
    expect(env).toHaveLength(1);
    // Los ids van en el orden de la lista (lo que se paga primero, arriba).
    expect({ ...env[0].params, p_cheque_ids: [...env[0].params.p_cheque_ids].sort() })
      .toEqual({ p_cheque_ids: ['chq-1', 'chq-2'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13', p_modo: 'deposito', p_detalle: null });
    expect(llamadas.some(l => l.nombre === 'depositar_cheques' || l.nombre === 'vender_cheques')).toBe(false);
    await expect(page.locator('.toast')).toContainText('Quedan en «En el banco»');
    expect(errores).toEqual([]);
  });

  // IMPORTE COMPLETO (24/10/2026): vender ya no pide lo acreditado; entra el
  // total (el detalle de lo nuevo, en e2e/61-cheques-importe-completo.spec.js).
  test(`"Ya se acreditó": vender de una vez por el importe completo, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await elegir(page, ['chq-1']);
    await page.locator('#chq-sel-banco').click();
    await page.locator('[data-salida-tipo="vendido"]').click();
    await page.locator('#chq-salida-ya').check();
    await expect(page.locator('#chq-salida-confirmar')).toHaveText('Vender');
    await expect(page.locator('#chq-venta-neto, #chq-venta-descuento, #chq-venta-tasa')).toHaveCount(0);
    await page.locator('#chq-venta-detalle').fill('Operación 1234');
    await expect(page.locator('#chq-salida-resumen')).toBeVisible();
    await sinCostado(page, ancho);
    await aLaVista(page, '#chq-salida-confirmar');
    await page.locator('#chq-salida-confirmar').click();
    await expect(page.locator('#chq-modal-salida')).toBeHidden();
    const ven = llamadas.filter(l => l.nombre === 'vender_cheques');
    expect(ven).toHaveLength(1);
    expect(ven[0].params).toEqual({ p_cheque_ids: ['chq-1'], p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13', p_neto: 387300.5, p_detalle: 'Operación 1234' });
    expect(llamadas.some(l => l.nombre === 'enviar_cheques_al_banco')).toBe(false);
    await expect(page.locator('.toast')).toContainText('Se vendió 1 cheque');
    expect(errores).toEqual([]);
  });

  test(`un cheque de Dolce Pasta en un banco de Nuss avisa "entre empresas", a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho);
    await elegir(page, ['chq-dolce']);
    await page.locator('#chq-sel-banco').click();
    await page.locator('[data-salida-tipo="depositado"]').click();
    await expect(page.locator('#chq-salida-cuenta')).toHaveValue('cta-dolce');
    await expect(page.locator('#chq-salida-aviso-empresas')).toBeHidden();
    await page.selectOption('#chq-salida-cuenta', 'cta-banco-nuss');
    await expect(page.locator('#chq-salida-aviso-empresas')).toBeVisible();
    await expect(page.locator('#chq-salida-aviso-empresas')).toContainText(/entre empresas/);
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`«En el banco»: cargar lo acreditado (importe completo, Entre empresas), a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    const pestana = page.locator('[data-estado-cheque="en_banco"]');
    await expect(pestana).toContainText('En el banco');
    await expect(pestana.locator('.chq-segmento__cuenta')).toHaveText('3');
    await pestana.click();
    const vista = page.locator('#chq-banco');
    await expect(vista).toBeVisible();
    await expect(page.locator('#chq-tabla-caja')).toBeHidden();
    await expect(page.locator('#chq-btn-seleccionar')).toBeHidden();
    await expect(vista.locator('.chq-banco-grupo')).toHaveCount(2);
    await expect(vista.locator('.chq-banco-grupo').first()).toContainText('mandados el 10/10/2026');
    await expect(vista.locator('.chq-banco-grupo').first()).toContainText('hace 3 días');
    await expect(vista.locator('.chq-banco-grupo').first()).toContainText('Venta');
    for (const id of ['chq-b1', 'chq-b2', 'chq-b3']) await page.locator(`[data-banco-cheque="${id}"]`).check();
    await expect(page.locator('#chq-banco-elegidos')).toContainText('3 cheques elegidos');
    await page.locator('#chq-banco-acreditar').click();
    await expect(page.locator('#chq-acreditar')).toBeVisible();
    await expect(page.locator('#chq-acr-fecha')).toHaveValue('2026-10-13');
    // Sin el reparto de antes (total / tasa); desde el 28/10/2026, un campo
    // por cheque: "Monto acreditado" (venta) o "Gastos del banco" (depósito).
    await expect(page.locator('#chq-acr-reparto, [data-acr-cheque]')).toHaveCount(0);
    await expect(page.locator('#chq-acr-lista .chq-acr-fila')).toHaveCount(3);
    await expect(page.locator('#chq-acr-lista [data-acr-monto]')).toHaveCount(3);
    await expect(page.locator('#chq-acr-resumen')).toContainText(/Entran \$\s?550\.000,00 a Banco Macro · Nuss\./);
    await sinCostado(page, ancho);
    await aLaVista(page, '#chq-acr-confirmar');
    await page.locator('#chq-acr-confirmar').click();
    const acr = llamadas.filter(l => l.nombre === 'acreditar_cheques');
    expect(acr).toHaveLength(1);
    const items = [...acr[0].params.p_items].sort((a, b) => a.cheque_id.localeCompare(b.cheque_id));
    expect(items).toEqual([{ cheque_id: 'chq-b1', acreditado: 300000 }, { cheque_id: 'chq-b2', acreditado: 200000 }, { cheque_id: 'chq-b3', gastos: 0 }]);
    expect(acr[0].params.p_fecha).toBe('2026-10-13');
    const res = page.locator('#chq-banco-resultado');
    await expect(res).toBeVisible();
    await expect(res).toContainText(/Entró \$\s?550\.000,00 en Banco Macro · Nuss/);
    await expect(res).not.toContainText('gasto de intereses');
    // La maqueta responde con un gasto por modo (los crea la base).
    await expect(res.locator('a.chq-link-gasto')).toHaveCount(2);
    await expect(res).toContainText('Los cheques de Dolce Pasta');
    await expect(res).toContainText('Entre empresas');
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`«En el banco»: "No lo tomó el banco" vuelve a la cartera con motivo, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await page.locator('[data-estado-cheque="en_banco"]').click();
    await page.locator('[data-banco-grupo]').first().click();
    await expect(page.locator('#chq-banco-elegidos')).toContainText('2 cheques elegidos');
    await page.locator('#chq-banco-no-tomo').click();
    await expect(page.locator('#chq-no-tomo')).toBeVisible();
    await expect(page.locator('#chq-no-tomo-texto')).toContainText('Vuelven 2 cheques');
    await page.locator('#chq-no-tomo-confirmar').click();
    await expect(page.locator('#chq-no-tomo-error')).toBeVisible();
    expect(llamadas.some(l => l.nombre === 'cancelar_envio_cheques')).toBe(false);
    await page.locator('#chq-no-tomo-motivo').fill('el banco no lo aceptó');
    await aLaVista(page, '#chq-no-tomo-confirmar');
    await page.locator('#chq-no-tomo-confirmar').click();
    const c = llamadas.filter(l => l.nombre === 'cancelar_envio_cheques');
    expect(c).toHaveLength(1);
    expect({ ...c[0].params, p_cheque_ids: [...c[0].params.p_cheque_ids].sort() }).toEqual({ p_cheque_ids: ['chq-b1', 'chq-b2'], p_motivo: 'el banco no lo aceptó' });
    await expect(page.locator('.toast')).toContainText('Volvieron 2 cheques a la cartera.');
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}
