// LOS AJUSTES DEL 24/10/2026 (rama ci-prueba/ajustes-24-10), en la maqueta,
// sin credenciales, a 390, 360, tablet (768) y 1280 px:
//  a) Stock → Costos: el bulto sale PRIMERO del catálogo
//     (insumos.contenido_bulto): la harina (catálogo 50, la fábrica 25) dice
//     "el bulto de 50 kg"; la lecitina sin stock en Nuss y con 20 kg en el
//     catálogo, "el bulto de 20 kg"; cargar $ 55.000 el bulto de la harina
//     viaja como 1.100 el kg.
//  b) Administración: Anular una nota de débito al cliente solo con
//     retiros:precios EN LA FÁBRICA DE LA NOTA (o cobranzas:procesar).
//  c) Cuentas corrientes: "Ver PDF" de una nota de débito de proveedor firma
//     el link (bucket comprobantes, 300 s) y lo abre en otra pestaña; si la
//     firma falla, el error tal cual debajo de la fila.
//  d) Stock, "Lotes usados sin ingreso cargado": la cantidad con la unidad que
//     manda la base (lt, un), "kg" de respaldo.
// Sin scroll horizontal y sin errores de JavaScript. Los datos que cambian van
// por 'maqueta.cambios' o en nota-debito-pdf (no se tocan los de otras pruebas).
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const datosDe = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'maqueta', 'datos', `${n}.json`), 'utf8'));
const nb = (s) => String(s ?? '').replace(/[  ]/g, ' ');

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
function anotarFirmas(page) {
  const firmas = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] firmar')) return;
    const args = m.args();
    try { firmas.push({ bucket: await args[1].jsonValue(), ruta: await args[2].jsonValue(), segundos: await args[3].jsonValue() }); } catch { /* nada */ }
  });
  return firmas;
}
async function sinScroll(page, donde) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `${donde}: scroll horizontal (${doc} px contra ${vista})`).toBeLessThanOrEqual(vista);
}
async function conCambios(page, cambios) {
  await page.addInitScript(([c]) => sessionStorage.setItem('maqueta.cambios', c), [JSON.stringify(cambios)]);
}

const TAMANOS = [['390', 390, 844], ['360', 360, 740], ['tablet', 768, 1024], ['1280', 1280, 900]];

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: Stock → Costos toma el bulto del catálogo`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    const datos = datosDe('stock-costos');
    await conCambios(page, {
      tablas: {
        // El catálogo: la harina en bolsas de 50 (la fábrica tiene lotes de 25),
        // la lecitina en bidones de 20 y por bulto.
        insumos: datos.tablas.insumos.map(i => i.id === 'i-harina' ? { ...i, contenido_bulto: 50 }
          : i.id === 'i-lecitina' ? { ...i, contenido_bulto: 20, vista_preferida: 'bulto' } : { ...i, contenido_bulto: null }),
        // La lecitina sin stock en Nuss.
        v_stock_insumos: datos.tablas.v_stock_insumos.filter(f => !(f.insumo_id === 'i-lecitina' && f.unidad_negocio_id === 'u-n')),
      },
      // precios_compra trae el contenido del catálogo: el mismo de arriba.
      rpc: {
        precios_compra: { __segun: [{ si: { p_unidad_negocio_id: 'u-n' }, r: datos.rpc.precios_compra.__segun[0].r.map(p =>
          p.insumo_id === 'i-harina' ? { ...p, contenido_bulto: '50' } : p.insumo_id === 'i-lecitina' ? { ...p, contenido_bulto: '20' } : p) }], __defecto: [] },
      },
    });
    await page.goto(`${MAQUETA}/modulos/stock.html?vista=insumos&maqueta=stock-costos`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    await page.locator('#btn-ver-costos').click();
    const costos = page.locator('#lista-costos');
    // Precios de compra (27/10/2026): la bolsa con IVA, del contenido del catálogo.
    await expect(costos.locator('[data-costo="i-harina"] .fila-precio__bulto')).toHaveText(/bolsa de 50\skg con IVA: \$ 66\.550,00/);
    await expect(costos.locator('[data-costo="i-lecitina"] .fila-precio__bulto')).toHaveText(/bulto de 20\skg con IVA: \$ 120\.051,93/);
    await sinScroll(page, 'los costos');
    await captura(page, `ajustes-costos-${nombre}`, info);
    // Cargar por bulto: $ 55.000 el bulto de 50 kg → 1.100 el kg.
    await costos.locator('[data-costo="i-harina"]').click();
    await expect(page.locator('#modal-costo')).toBeVisible();
    await expect(page.locator('#costo-precio-rotulo')).toHaveText(/Precio por bulto de 50\skg/);
    await page.locator('#costo-precio').fill('55000');
    await expect(page.locator('#costo-equivale')).toHaveText(/→ \$ 1\.100,00 por kg/);
    await page.locator('#costo-iva').selectOption('21');
    await sinScroll(page, 'el modal del costo');
    await captura(page, `ajustes-costo-modal-${nombre}`, info);
    await page.locator('#btn-guardar-costo').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_costo_insumo').length).toBe(1);
    const g = rpc.find(r => r.nombre === 'guardar_costo_insumo');
    expect(g.params.p_costo_unitario).toBe(1100);
    expect(g.params.p_alicuota_iva).toBe(21);
    expect(g.params.p_insumo_id).toBe('i-harina');
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: Stock, lotes usados sin ingreso con la unidad de la base`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    const lote = (insumo_id, insumo, unidad_medida, l, kg) => ({ insumo_id, insumo, marca: null, unidad_medida, lote: l, kg, masas: 2, ultima_fecha: '2026-10-22', maquinas: 'Máquina 1' });
    await conCambios(page, { rpc: { lotes_usados_sin_ingreso: { __segun: [{ si: { p_unidad_negocio_id: 'u-n' }, r: [
      lote('ins-lec', 'Lecitina líquida', 'lt', 'L-77', 1.5),
      lote('ins-caja', 'Caja N°1', 'un', 'C-12', 40),
      lote('ins-col', 'Colorante caramelo', null, '35349771', 0.1),
    ] }], __defecto: [] } } });
    await page.goto(`${MAQUETA}/modulos/stock.html?vista=insumos&maqueta=stock`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    const caja = page.locator('#stock-sin-ingreso');
    const cabeza = caja.locator('[data-sin-ingreso-alternar]');
    await expect(cabeza).toContainText('3 lotes usados sin ingreso cargado');
    await cabeza.click();
    const filas = caja.locator('.stock-sin-ingreso__fila');
    await expect(filas).toHaveCount(3);
    await expect(filas.filter({ hasText: 'Lote L-77' })).toContainText(/1,5 lt en 2 masas/);
    await expect(filas.filter({ hasText: 'Lote C-12' })).toContainText(/40 un en 2 masas/);
    await expect(filas.filter({ hasText: 'Lote 35349771' })).toContainText(/0,1 kg en 2 masas/);
    await sinScroll(page, 'los lotes sin ingreso');
    await captura(page, `ajustes-sin-ingreso-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: Cuentas corrientes, "Ver PDF" de la nota de débito del proveedor`, async ({ page, context }, info) => {
    const errores = vigilarErrores(page);
    const firmas = anotarFirmas(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=nota-debito-pdf`);
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=p1&unidad=u-n`);
    const conPdf = page.locator('#lista-movimientos-ficha .fila-movimiento').filter({ hasText: 'Nota de débito 0001-4567' });
    const sinPdf = page.locator('#lista-movimientos-ficha .fila-movimiento').filter({ hasText: 'Nota de débito 0002-0099' });
    const boton = conPdf.locator('[data-ver-pdf-nd="nd-p1"]');
    await expect(boton).toHaveText('Ver PDF');
    await expect(sinPdf.locator('[data-ver-pdf-nd]')).toHaveCount(0);
    await sinScroll(page, 'la cuenta del proveedor');
    await captura(page, `ajustes-nd-pdf-${nombre}`, info);

    // Firma bien: se abre otra pestaña con el link firmado.
    await page.evaluate(() => {
      globalThis.__maqueta = { ...(globalThis.__maqueta || {}), firmar: (bucket, ruta) => ({ data: { signedUrl: `${location.origin}/manifest.json?firmado=${encodeURIComponent(ruta)}` }, error: null }) };
    });
    const [pestana] = await Promise.all([context.waitForEvent('page'), boton.click()]);
    await pestana.waitForURL(/manifest\.json\?firmado=/);
    expect(decodeURIComponent(pestana.url())).toContain('uid-maqueta/notas-debito/p1/2026/1729800000000.pdf');
    await pestana.close();
    expect(firmas).toEqual([{ bucket: 'comprobantes', ruta: 'uid-maqueta/notas-debito/p1/2026/1729800000000.pdf', segundos: 300 }]);
    await expect(conPdf.locator('.fila-movimiento__error-pdf')).toHaveCount(0);

    // La firma falla: el error tal cual, debajo de esa fila.
    await page.evaluate(() => { globalThis.__maqueta.firmar = () => ({ data: null, error: { message: 'Object not found' } }); });
    await boton.click();
    await expect(conPdf.locator('.fila-movimiento__error-pdf')).toHaveText('No se pudo abrir el PDF: Object not found');
    await expect(sinPdf.locator('.fila-movimiento__error-pdf')).toHaveCount(0);
    await sinScroll(page, 'el error del PDF');
    await captura(page, `ajustes-nd-pdf-error-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  // Sin cobranzas:procesar; retiros:precios solo en la fábrica que se dice.
  // La nota N-ND-0001 de los datos es de Nuss (u-n).
  for (const [fabrica, seVe] of [['u-d', false], ['u-n', true]]) {
    test(`${nombre}: Administración, retiros:precios en ${fabrica === 'u-n' ? 'Nuss (la de la nota): Anular se ofrece' : 'Dolce (otra fábrica): Anular no se ofrece'}`, async ({ page }, info) => {
      const errores = vigilarErrores(page);
      page.setDefaultTimeout(15000);
      await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
      await page.setViewportSize({ width: ancho, height: alto });
      const datos = datosDe('cheque-rechazado');
      const tareas = datos.tablas.empleado_tareas
        .filter(t => !(t.modulo === 'cobranzas' && t.tarea === 'procesar'))
        .map(t => t.modulo === 'retiros' && t.tarea === 'precios' ? { ...t, alcance: { unidades: [fabrica] } } : t);
      await conCambios(page, { tablas: { empleado_tareas: tareas } });
      await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes&maqueta=cheque-rechazado`);
      await page.locator('[data-cliente="c1"]').first().click();
      await page.locator('[data-cuenta-nota-debito="nd-1"]').click();
      await expect(page.locator('#ad-nd')).toBeVisible();
      await expect(page.locator('#ad-nd-hoja .ndh-copia--original')).toContainText('N-ND-0001');
      await expect(page.locator('#ad-nd-imprimir')).toBeEnabled();
      if (seVe) {
        await expect(page.locator('#ad-nd-anular')).toBeVisible();
        await page.locator('#ad-nd-anular').click();
        await expect(page.locator('#ad-nd-anular-panel')).toBeVisible();
      } else {
        await expect(page.locator('#ad-nd-anular')).toBeHidden();
      }
      await sinScroll(page, 'la hoja de la nota');
      await captura(page, `ajustes-nd-anular-${fabrica}-${nombre}`, info);
      expect(nb(await page.locator('#ad-nd-titulo').textContent())).toBe('Nota de débito N-ND-0001');
      expect(errores, errores.join('\n')).toEqual([]);
    });
  }
}
