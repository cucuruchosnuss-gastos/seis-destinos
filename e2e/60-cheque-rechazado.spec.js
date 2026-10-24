// EL CHEQUE RECHAZADO Y LA NOTA DE DÉBITO (24/10/2026). En la maqueta
// (Supabase falso, sin credenciales; datos `cheque-rechazado`), a 390, 360,
// tablet (768 × 1024) y 1280 px:
//  - la cartera con el filtro "Rechazados": el cheque en rojo, con la fecha,
//    el motivo y el link a su nota de débito; el link abre la hoja (solo el
//    ORIGINAL en la pantalla);
//  - "Cheque rechazado": se escribe el número, la lista se filtra (con
//    espera), se elige el depositado, el motivo con su chip, un gasto, el
//    resumen ("Se descuentan $ … de <cuenta>", el total de la nota) y UNA
//    llamada a registrar_cheque_rechazado con los parámetros exactos; después
//    se abre la hoja de la nota;
//  - el endosado a un proveedor sin cliente en la cobranza: el selector de
//    cliente y la nota de débito del proveedor;
//  - la hoja al imprimir: dos páginas A4 (ORIGINAL y DUPLICADO);
//  - "Compartir PDF" arma el PDF (sin compartir en Chromium: se descarga);
//  - la cuenta del cliente: "Nota de débito N-ND-0001" abre la hoja, y
//    "+ Nota de débito" suelta → registrar_nota_debito_cliente;
//  - sin scroll de costado y sin errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const CARTERA = `${MAQUETA}/modulos/administracion.html?seccion=cheques&maqueta=cheque-rechazado`;
const sinCostado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const N = (s) => String(s ?? '').replace(/ /g, ' ');

// Las llamadas a la base ("[maqueta] rpc <nombre> <parámetros>" en la consola).
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

async function abrir(page, ancho, alto) {
  await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
  await page.addInitScript(() => { window.print = () => { window.__impresiones = (window.__impresiones || 0) + 1 } });
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(CARTERA);
  await expect(page.locator('#chq-btn-rechazado')).toBeVisible();
}

// Un botón: entero en la pantalla y nadie encima.
async function aLaVista(page, selector) {
  const ok = await page.locator(selector).evaluate((b) => {
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    if (r.left < 0 || r.right > innerWidth + 0.5 || r.top < 0 || r.bottom > innerHeight + 0.5) return 'fuera';
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el === b || b.contains(el) ? 'ok' : 'tapado';
  });
  expect(ok, selector).toBe('ok');
}

const TAMANOS = [['390', 390, 844], ['360', 360, 780], ['tablet', 768, 1024], ['1280', 1280, 900]];

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: el rechazado en la cartera, en rojo y con su nota de débito`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho, alto);
    // Las seis opciones del filtro entran (bajan de renglón), sin pisarse.
    const pisadas = await page.locator('#chq-chips-estado [data-estado-cheque]').evaluateAll(bs => bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
    expect(pisadas, 'ninguna opción del filtro cortada').toEqual([]);
    await page.locator('[data-estado-cheque="rechazados"]').click();
    const fila = page.locator('[data-cheque-fila="chq-rech"]:visible').first();
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('Rechazado el 20/10/2026 · Sin fondos');
    const fondo = await fila.evaluate((el) => getComputedStyle(el.tagName === 'TR' ? el.querySelector('td') : el).backgroundColor);
    expect(fondo, 'en rojo (--rojo-suave)').toBe('rgb(251, 234, 234)');
    await expect(page.locator('#chq-leyenda')).toContainText('Rechazado');
    // En "Salidos" también figura.
    await page.locator('[data-estado-cheque="salidos"]').click();
    await expect(page.locator('[data-cheque-fila="chq-rech"]:visible').first()).toBeVisible();
    await page.locator('[data-estado-cheque="rechazados"]').click();
    const link = page.locator('[data-cheque-fila="chq-rech"]:visible [data-ver-nota-debito="nd-1"]').first();
    await expect(link).toHaveText('Nota de débito N-ND-0001');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await captura(page, `cheque-rechazado-cartera-${nombre}`, info);
    await link.click();
    const hoja = page.locator('#ad-nd');
    await expect(hoja).toBeVisible();
    expect(llamadas.some(l => l.nombre === 'datos_nota_debito' && l.params?.p_id === 'nd-1')).toBe(true);
    await expect(page.locator('#ad-nd-hoja .ndh-copia--original')).toBeVisible();
    await expect(page.locator('#ad-nd-hoja .ndh-copia--duplicado')).toBeHidden();
    await expect(page.locator('#ad-nd-hoja .ndh-copia--original .ndh-cab__titulo')).toHaveText(/NOTA DE DÉBITO\s*N-ND-0001\s*Fecha 20\/10\/2026\s*ORIGINAL/);
    await expect(page.locator('#ad-nd-hoja .ndh-copia--original')).toContainText('SON CIENTO CINCUENTA Y UN MIL QUINIENTOS PESOS CON CINCUENTA CENTAVOS'.replace(/^SON/, 'Son'));
    await expect(page.locator('#ad-nd-hoja .ndh-copia--original')).toContainText('Cheque rechazado');
    for (const b of ['#ad-nd-imprimir', '#ad-nd-compartir', '#ad-nd-anular', '#ad-nd-cerrar']) await aLaVista(page, b);
    expect(await sinCostado(page), 'la hoja sin scroll de costado de la página').toBe(true);
    await captura(page, `cheque-rechazado-hoja-${nombre}`, info);
    await page.locator('#ad-nd-cerrar').click();
    await expect(hoja).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: registrar un cheque rechazado (buscar, motivo, gastos, resumen)`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho, alto);
    await page.locator('#chq-btn-rechazado').click();
    const modal = page.locator('#chq-modal-rechazo');
    await expect(modal).toBeVisible();
    await page.locator('#chq-rech-buscar').fill('1111');
    // El reloj de la página está fijo (setFixedTime): los 300 ms de espera se adelantan a mano.
    await expect(page.locator('#chq-rech-buscando')).toHaveText('Buscando…');
    await page.clock.runFor(400);
    const resultado = page.locator('[data-rech-cheque="chq-4"]');
    await expect(resultado).toBeVisible();
    await expect(resultado).toContainText('Nº 11112222');
    await expect(resultado).toContainText('Distribuidora Anatolia · Depositado el 02/09/2026 en Macro · Dolce');
    expect(llamadas.filter(l => l.nombre === 'buscar_cheques_para_rechazo').length, 'con espera: una sola búsqueda').toBe(1);
    expect(await sinCostado(page)).toBe(true);
    await resultado.click();
    await expect(page.locator('#chq-rech-elegido')).toBeVisible();
    await expect(page.locator('#chq-rech-form')).toBeVisible();
    await expect(page.locator('#chq-rech-fecha')).toHaveValue('2026-10-24');
    await page.locator('[data-rech-motivo="Sin fondos"]').click();
    await expect(page.locator('[data-rech-motivo="Sin fondos"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#chq-rech-gastos [data-rech-concepto]').first()).toHaveValue('Gastos de cheque rechazado');
    await page.locator('#chq-rech-gastos [data-rech-importe]').first().fill('1500,50');
    await expect(page.locator('#chq-rech-resumen')).toContainText(/Se descuentan \$\s?250\.000,00 de Macro · Dolce\./);
    await expect(page.locator('#chq-rech-resumen')).toContainText(/Nota de débito al cliente \(Distribuidora Anatolia\)\s*\$\s?251\.500,50/);
    await expect(page.locator('#chq-rech-prov')).toBeHidden();
    expect(await sinCostado(page), 'el diálogo sin scroll de costado').toBe(true);
    await aLaVista(page, '#chq-rech-confirmar');
    await captura(page, `cheque-rechazado-dialogo-${nombre}`, info);
    await page.locator('#chq-rech-confirmar').click();
    await expect(modal).toBeHidden();
    const reg = llamadas.filter(l => l.nombre === 'registrar_cheque_rechazado');
    expect(reg).toHaveLength(1);
    expect(reg[0].params).toEqual({ p_cheque_id: 'chq-4', p_fecha: '2026-10-24', p_motivo: 'Sin fondos', p_gastos: [{ concepto: 'Gastos de cheque rechazado', importe: 1500.5 }], p_cliente_id: null, p_nd_proveedor: null });
    await expect(page.locator('.toast')).toContainText('Nota de débito N-ND-0001');
    await expect(page.locator('#ad-nd')).toBeVisible();
    await expect(page.locator('#ad-nd-hoja')).toContainText('NOTA DE DÉBITO');
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: un endoso sin cliente, con la nota de débito del proveedor`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho, alto);
    await page.locator('#chq-btn-rechazado').click();
    await page.locator('#chq-rech-buscar').fill('6843');
    await page.clock.runFor(400);
    await page.locator('[data-rech-cheque="chq-6"]').click();
    await expect(page.locator('#chq-rech-campo-cliente')).toBeVisible();
    const opciones = await page.locator('#chq-rech-cliente option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    expect(opciones.length, 'los clientes de la fábrica').toBeGreaterThan(0);
    await page.locator('#chq-rech-cliente').selectOption(opciones[0]);
    await page.locator('[data-rech-motivo="Otro"]').click();
    await page.locator('#chq-rech-motivo-texto').fill('Cheque adulterado');
    await expect(page.locator('#chq-rech-prov')).toBeVisible();
    await expect(page.locator('#chq-rech-prov-titulo')).toHaveText('Nota de débito del proveedor (ANATOLIA SRL)');
    await page.locator('#chq-rech-prov-si').check();
    await expect(page.locator('#chq-rech-prov-campos')).toBeVisible();
    await page.locator('#chq-rech-prov-comprobante').fill('0001-00004567');
    await page.locator('#chq-rech-prov-gastos [data-rech-importe]').first().fill('2500');
    await expect(page.locator('#chq-rech-resumen')).toContainText(/Nota de débito del proveedor \(ANATOLIA SRL\)\s*\$\s?552\.500,00/);
    await expect(page.locator('#chq-rech-resumen')).toContainText('Se lo habíamos dado a ANATOLIA SRL');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await aLaVista(page, '#chq-rech-confirmar');
    await captura(page, `cheque-rechazado-proveedor-${nombre}`, info);
    await page.locator('#chq-rech-confirmar').click();
    await expect(page.locator('#chq-modal-rechazo')).toBeHidden();
    const reg = llamadas.filter(l => l.nombre === 'registrar_cheque_rechazado');
    expect(reg).toHaveLength(1);
    expect(reg[0].params.p_cliente_id).toBe(opciones[0]);
    expect(reg[0].params.p_motivo).toBe('Cheque adulterado');
    expect(reg[0].params.p_nd_proveedor).toEqual({ comprobante: '0001-00004567', fecha: '2026-10-24', gastos: [{ concepto: 'Gastos de cheque rechazado', importe: 2500 }], observaciones: null, archivo_url: null });
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('la hoja al imprimir: dos páginas A4 (ORIGINAL y DUPLICADO)', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await abrir(page, 1280, 900);
  await page.locator('[data-estado-cheque="rechazados"]').click();
  await page.locator('[data-cheque-fila="chq-rech"]:visible [data-ver-nota-debito="nd-1"]').first().click();
  await expect(page.locator('#ad-nd-hoja .ndh-copia--original')).toBeVisible();
  await page.locator('#ad-nd-imprimir').click();
  expect(await page.evaluate(() => window.__impresiones)).toBe(1);
  await page.emulateMedia({ media: 'print' });
  const original = page.locator('#ad-impresion .ndh-copia--original');
  const duplicado = page.locator('#ad-impresion .ndh-copia--duplicado');
  await expect(original).toBeVisible();
  await expect(duplicado).toBeVisible();
  await expect(page.locator('#ad-nd')).toBeHidden();
  await expect(duplicado.locator('.ndh-cab__titulo')).toHaveText(/NOTA DE DÉBITO\s*N-ND-0001\s*Fecha 20\/10\/2026\s*DUPLICADO/);
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  expect((pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length, 'dos hojas').toBe(2);
  await page.setViewportSize({ width: 794, height: 1123 });
  await captura(page, 'cheque-rechazado-hoja-impresa', info);
  await page.emulateMedia({ media: 'screen' });
  expect(errores, errores.join('\n')).toEqual([]);
});

test('Compartir PDF: arma el PDF de la nota (en Chromium, se descarga)', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrir(page, 1280, 900);
  await page.locator('[data-estado-cheque="rechazados"]').click();
  await page.locator('[data-cheque-fila="chq-rech"]:visible [data-ver-nota-debito="nd-1"]').first().click();
  await expect(page.locator('#ad-nd-compartir')).toBeEnabled();
  const [descarga] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.locator('#ad-nd-compartir').click(),
  ]);
  expect(descarga.suggestedFilename()).toBe('Nota de debito N-ND-0001.pdf');
  await expect(page.locator('#ad-nd-compartir')).toHaveText('Compartir PDF');
  expect(errores, errores.join('\n')).toEqual([]);
});

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1280', 1280, 900]]) {
  test(`${nombre}: la cuenta del cliente: la nota abre su hoja y "+ Nota de débito" suelta`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes&maqueta=cheque-rechazado`);
    await page.locator('[data-cliente="c1"]').first().click();
    const renglon = page.locator('[data-cuenta-nota-debito="nd-1"]');
    await expect(renglon).toBeVisible();
    await expect(renglon).toContainText('Nota de débito N-ND-0001');
    await expect(renglon).toContainText('Ver la nota ›');
    await renglon.click();
    await expect(page.locator('#ad-nd')).toBeVisible();
    await page.locator('#ad-nd-cerrar').click();
    await page.locator('#ad-btn-nota-debito').click();
    await expect(page.locator('#ad-panel-nota-debito')).toBeVisible();
    await page.locator('#ad-ndc-renglones [data-ndc-concepto]').first().fill('Intereses por mora');
    await page.locator('#ad-ndc-renglones [data-ndc-importe]').first().fill('2500');
    await expect(page.locator('#ad-ndc-total')).toHaveText(/Total de la nota: \$\s?2\.500,00/);
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await aLaVista(page, '#ad-ndc-guardar');
    await captura(page, `nota-debito-suelta-${nombre}`, info);
    await page.locator('#ad-ndc-guardar').click();
    await expect(page.locator('#ad-nd')).toBeVisible();
    const reg = llamadas.filter(l => l.nombre === 'registrar_nota_debito_cliente');
    expect(reg).toHaveLength(1);
    expect(reg[0].params).toEqual({ p_cliente_id: 'c1', p_fecha: '2026-10-24', p_items: [{ concepto: 'Intereses por mora', importe: 2500 }], p_observaciones: null });
    expect(N(await page.locator('.toast').first().textContent())).toContain('Nota de débito N-ND-0001');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
