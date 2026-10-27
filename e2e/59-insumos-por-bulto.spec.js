// LOS INSUMOS POR BULTO (23/10/2026, rama ci-prueba/unidades-por-bulto), en
// la maqueta, sin credenciales, a 390, 360, tablet (768) y 1280 px:
//  - La Carga de una orden de retiro: la harina (vista 'bulto', bolsas de
//    25 kg) pide "¿Cuánto se lleva? (bultos de 25 kg)", "4" dice debajo
//    "= 100 kg", lo de cada lote también va en bultos, y a la base van
//    100 kg (50 + 50 por lote).
//  - Administración, una orden valorizada con harina: "10 bultos de 25 kg",
//    "= 250,5 kg", "$ 20.500,00 x bulto de 25 kg"; corregir la valorización
//    muestra el campo en 20.500 y 21.000 la bolsa viaja como 840 el kg.
//  - El catálogo manda (24/10/2026, insumos.contenido_bulto): SIN stock:ver,
//    la Carga pide el colorante Nico en bidones de 25 kg y Administración
//    valoriza la harina por bolsa ($ 17.500 → 700 el kg).
//  - Stock → Costos: la harina dice "$ 27.500,00 el bulto de 25 kg · $ 1.100,00
//    por kg"; la lecitina (vista 'base') sigue por kg.
// Sin scroll horizontal y sin errores de JavaScript. La base responde con
// 'maqueta.cambios' (no se tocan los datos de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const nb = s => String(s ?? '').replace(/[  ]/g, ' ');

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
async function sinScroll(page, donde) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `${donde}: scroll horizontal (${doc} px contra ${vista})`).toBeLessThanOrEqual(vista);
}

const TAMANOS = [['390', 390, 844], ['360', 360, 740], ['tablet', 768, 1024], ['1280', 1280, 900]];

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: la Carga pide la harina en bultos de 25 kg y manda kilos`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const datos = await fetch('/maqueta/datos/retiros.json').then(r => r.json());
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({
        tablas: {
          insumos: datos.tablas.insumos.map(i => ({ ...i, vista_preferida: i.id === 'ins-1' ? 'bulto' : 'base' })),
          v_stock_insumos: [{ unidad_negocio_id: 'u-n', insumo_id: 'ins-1', contenido_unico: 25 }],
        },
        rpc: { registrar_orden_retiro: { orden_id: 'o-1', numero: 12, codigo: 'N-0012', stock_insuficiente: [] } },
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-empresa="u-n"]').click();
    await page.locator('#rt-cliente-buscar').fill('turco');
    await page.locator('[data-cliente]').first().click();
    await page.locator('[data-r-buscar="0"]').fill('harina');
    // La opción del catálogo ya dice los bultos (1.250 kg = 50 bultos).
    await expect(page.locator('[data-r-insumo="0"]').first()).toContainText('50');
    await page.locator('[data-r-insumo="0"]').first().click();
    await expect(page.locator('label[for="rt-r-cantidad-0"]')).toHaveText(/¿Cuánto se lleva\? \(bultos de 25\skg\)/);
    await page.locator('[data-r-cantidad="0"]').fill('4');
    await expect(page.locator('[data-r-equivale="0"]')).toHaveText(/= 100\skg/);
    // Los lotes, en bultos también.
    await expect(page.locator('[data-r-lote-cant="0"][data-lote="H-0910"]')).toBeVisible();
    await expect(page.locator('.rt-lote-fila__unidad').first()).toHaveText('bultos');
    await expect(page.locator('.rt-lote-fila').first()).toContainText('16 bultos (400 kg)');
    await page.locator('[data-r-lote-cant="0"][data-lote="H-0910"]').fill('2');
    await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('Falta asignar 2 bultos (50 kg)');
    await page.locator('[data-r-lote-cant="0"][data-lote="H-0920"]').fill('2');
    await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('Falta asignar 0');
    await sinScroll(page, 'el renglón');
    await captura(page, `bulto-carga-${nombre}`, info);

    await page.locator('[data-r-listo="0"]').click();
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-vista-resumen')).toBeVisible();
    await expect(page.locator('#rt-resumen')).toContainText(/bultos de 25\skg/);
    await sinScroll(page, 'el resumen');
    await page.locator('#rt-confirmar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'registrar_orden_retiro')).toBeTruthy();
    const items = rpc.find(r => r.nombre === 'registrar_orden_retiro').params.p_items;
    expect(items, JSON.stringify(items)).toEqual([{ insumo_id: 'ins-1', cantidad: 100, lotes: [{ lote: 'H-0910', cantidad: 50 }, { lote: 'H-0920', cantidad: 50 }] }]);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: Administración valoriza la harina por bulto y manda el precio por kg`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
    await page.evaluate(async () => {
      localStorage.setItem('barraUnidad.elegida', 'u-n');
      const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({
        tablas: {
          insumos: datos.tablas.insumos.map(i => ({ ...i, vista_preferida: i.id === 'ins-1' ? 'bulto' : 'base' })),
          v_stock_insumos: [{ unidad_negocio_id: 'u-n', insumo_id: 'ins-1', contenido_unico: 25 }],
        },
        rpc: { valorizar_orden_retiro: { total: 652410, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false } },
      }));
    });
    await page.reload();
    await page.locator('[data-pestana="ordenes"]').first().click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo).toContainText(/10 bultos de 25\skg · Harina 000/);
    await expect(cuerpo).toContainText(/= 250,5\skg/);
    // importeHoja separa el "$" con un espacio duro: \s lo incluye.
    await expect(cuerpo).toContainText(/\$\s20\.500,00 x bulto de 25\skg/);
    await expect(cuerpo).toContainText(/\$\s820,00 por kg/);
    // La caja (vista 'base') sigue por unidad.
    await expect(cuerpo).toContainText(/\$\s95,00 x un\./);
    await sinScroll(page, 'la orden');
    await captura(page, `bulto-orden-${nombre}`, info);

    // Corregir: el campo de la harina muestra el precio del bulto.
    await page.locator('#ad-btn-corregir-valor').click();
    await expect(page.locator('#ad-precio-y0')).toHaveValue('20.500');
    await expect(page.locator('label[for="ad-precio-y0"]')).toHaveText(/Precio x bulto de 25\skg/);
    await page.locator('#ad-precio-y0').fill('21.000');
    await expect(page.locator('[data-precio-base="y0"]')).toHaveText(/\$\s840,00 por kg/);
    await sinScroll(page, 'valorizar');
    await captura(page, `bulto-valorizar-${nombre}`, info);
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'valorizar_orden_retiro')).toBeTruthy();
    const p = rpc.find(r => r.nombre === 'valorizar_orden_retiro').params.p_precios;
    expect(p.y0, JSON.stringify(p)).toBe(840);
    expect(p.y2, JSON.stringify(p)).toBe(820);
    expect(p.y1, JSON.stringify(p)).toBe(95);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  // EL CATÁLOGO MANDA (24/10/2026): insumos.contenido_bulto lo lee cualquier
  // usuario logueado. Sin stock:ver (v_stock_insumos vuelve vacía), igual se
  // pide y se valoriza por bulto.
  test(`${nombre}: la Carga sin stock:ver pide el colorante Nico en bidones de 25 kg (del catálogo)`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const datos = await fetch('/maqueta/datos/retiros.json').then(r => r.json());
      const colorante = { id: 'ins-col', nombre: 'Colorante', marca: 'Nico', categoria: 'Aditivos', unidad_medida: 'kg', activo: true, vista_preferida: 'bulto', contenido_bulto: 25 };
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({
        tablas: {
          empleado_tareas: datos.tablas.empleado_tareas.filter(t => !(t.modulo === 'stock' && t.tarea === 'ver')),
          insumos: [...datos.tablas.insumos.map(i => ({ ...i, vista_preferida: i.id === 'ins-1' ? 'bulto' : 'base', contenido_bulto: i.id === 'ins-1' ? 25 : null })), colorante],
          v_stock_insumos: [],
        },
        rpc: {
          catalogo_para_retiro: { ...datos.rpc.catalogo_para_retiro, insumos: [...datos.rpc.catalogo_para_retiro.insumos,
            { insumo_id: 'ins-col', nombre: 'Colorante', marca: 'Nico', categoria: 'Aditivos', unidad_medida: 'kg', stock: 75 }] },
        },
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-empresa="u-n"]').click();
    await page.locator('#rt-cliente-buscar').fill('turco');
    await page.locator('[data-cliente]').first().click();
    await page.locator('[data-r-buscar="0"]').fill('colorante');
    await page.locator('[data-r-insumo="0"]').first().click();
    await expect(page.locator('label[for="rt-r-cantidad-0"]')).toHaveText(/¿Cuánto se lleva\? \(bultos de 25\skg\)/);
    await page.locator('[data-r-cantidad="0"]').fill('2');
    await expect(page.locator('[data-r-equivale="0"]')).toHaveText(/= 50\skg/);
    await sinScroll(page, 'el renglón del colorante');
    await captura(page, `bulto-catalogo-carga-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: Administración sin stock:ver valoriza la harina por bolsa ($ 17.500 → 700 el kg)`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
    await page.evaluate(async () => {
      localStorage.setItem('barraUnidad.elegida', 'u-n');
      const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({
        tablas: {
          // Yanina: retiros:precios, sin stock:ver.
          empleado_tareas: datos.tablas.empleado_tareas.filter(t => !(t.modulo === 'stock' && t.tarea === 'ver')),
          insumos: [...datos.tablas.insumos.map(i => ({ ...i, vista_preferida: i.id === 'ins-1' ? 'bulto' : 'base', contenido_bulto: i.id === 'ins-1' ? 25 : null })),
            { id: 'ins-col', nombre: 'Colorante', marca: 'Nico', unidad_medida: 'kg', categoria: 'Aditivos', activo: true, vista_preferida: 'bulto', contenido_bulto: 25 }],
          v_stock_insumos: [],
        },
        rpc: { valorizar_orden_retiro: { total: 600000, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false } },
      }));
    });
    await page.reload();
    await page.locator('[data-pestana="ordenes"]').first().click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo).toContainText(/10 bultos de 25\skg · Harina 000/);
    await expect(cuerpo).toContainText(/\$\s20\.500,00 x bulto de 25\skg/);
    await page.locator('#ad-btn-corregir-valor').click();
    await expect(page.locator('label[for="ad-precio-y0"]')).toHaveText(/Precio x bulto de 25\skg/);
    await page.locator('#ad-precio-y0').fill('17.500');
    await expect(page.locator('[data-precio-base="y0"]')).toHaveText(/\$\s700,00 por kg/);
    await sinScroll(page, 'valorizar sin stock:ver');
    await captura(page, `bulto-catalogo-valorizar-${nombre}`, info);
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'valorizar_orden_retiro')).toBeTruthy();
    const p = rpc.find(r => r.nombre === 'valorizar_orden_retiro').params.p_precios;
    expect(p.y0, JSON.stringify(p)).toBe(700);
    expect(p.y2, JSON.stringify(p)).toBe(820);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: Stock → Costos dice la harina por bulto`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/stock.html?vista=insumos&maqueta=stock-costos`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    await page.locator('#btn-ver-costos').click();
    const costos = page.locator('#lista-costos');
    const harina = costos.locator('[data-costo="i-harina"]');
    // Precios de compra (27/10/2026): el precio por kg y, debajo del final, la bolsa con IVA.
    await expect(harina.locator('[data-col="unitario"]')).toContainText('$ 1.100,00 por kg');
    await expect(harina.locator('.fila-precio__bulto')).toHaveText(/bolsa de 25\skg con IVA: \$ 33\.275,00/);
    await expect(costos.locator('[data-costo="i-lecitina"] .fila-precio__bulto')).toHaveCount(0);
    await sinScroll(page, 'los costos');
    await captura(page, `bulto-costos-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
