// LOTES NO REGISTRADOS, LA CAJA DOLCE PASTA Y EL AVISO DE STOCK (23/10/2026),
// en la maqueta (Supabase falso, sin credenciales). Corre SIEMPRE.
//
// a) La tablet: la primera masa del día trae puesto el último lote NO
//    registrado que se usó en esa máquina (la memoria de la tablet), en rojo,
//    "Lote no registrado por administración"; la ventana de lotes lo muestra
//    arriba, en rojo, y se elige de un toque.
// c) La caja: "Caja N°1 Dolce Pasta" en grande, con qué bolsa va, y si se
//    cambia la bolsa y no la caja: "La caja sigue siendo la Caja N°1 Nuss".
// b) Stock: "Lotes usados sin ingreso cargado" (con permiso de Producción) y,
//    sin él, lo dice.
// A 390, 360, la tablet parada (768×1024), la acostada (1000×540) y 1280:
// sin scroll horizontal y sin errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });
const PRODUCCION = require('./maqueta/datos/produccion.json');
const STOCK = require('./maqueta/datos/stock.json');

const TAMANOS = [[390, 844], [360, 780], [768, 1024], [1000, 540], [1280, 800]];

async function sinScrollHorizontal(page, ancho) {
  const doc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(doc, `scroll horizontal: ${doc} px contra ${ancho}`).toBeLessThanOrEqual(ancho);
}

// La maqueta de la planta con: la caja de la unidad (Caja N°1 Nuss), la
// masa anterior de AYER (la primera del día llega sin lotes) y, en la
// memoria de la tablet, el colorante y el azúcar no registrados de la M1.
async function prepararPlanta(page) {
  const unidades = PRODUCCION.tablas.unidades_negocio.map(u => u.id === 'u-n' ? { ...u, caja_predeterminada_id: 'caja-1' } : u);
  const datos = JSON.parse(JSON.stringify(PRODUCCION.rpc.datos_para_masa));
  datos.anterior.es_de_hoy = false;
  const cambios = { tablas: { unidades_negocio: unidades }, rpc: { datos_para_masa: datos } };
  const memoria = { 'maq-1': { 'ins-col': { lote: 'C-NOREG', en: 2 }, 'ins-az': { lote: 'AZ-NOREG', en: 1 } } };
  await page.addInitScript(([c, m]) => {
    sessionStorage.setItem('maqueta.cambios', c);
    if (!localStorage.getItem('produccion.lotes-no-registrados')) localStorage.setItem('produccion.lotes-no-registrados', m);
  }, [JSON.stringify(cambios), JSON.stringify(memoria)]);
}

for (const [ancho, alto] of TAMANOS) {
  test(`tablet: lote no registrado y la caja, a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await prepararPlanta(page);
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);

    // ── c) La caja ───────────────────────────────────────────────────────
    await persona(page, 'Federico Silva').click();
    await marcarPin(page, '4826');
    await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
    await page.locator('[data-producido]').first().click();
    await page.locator('#pr-btn-agregar-producto').click();
    await page.locator('[data-ag-producto="p1"]').click();
    await page.locator('#pr-agregar-sin-cono').click();
    await page.locator('[data-ag-presentacion="pp-p1-sin"]').click();
    await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
    // La caja de la unidad viene puesta; "Cambiar" lleva al paso.
    await expect(page.locator('#pr-agregar-empaque')).toContainText('Caja N°1 Nuss');
    await page.locator('#pr-agregar-empaque [data-paso-ag="caja"]').click();
    const dolce = page.locator('[data-ag-caja="caja-dp"]');
    await expect(dolce).toContainText('Caja N°1 Dolce Pasta');
    await expect(dolce).toContainText('con bolsitas individuales');
    await expect(page.locator('[data-ag-caja="caja-1"]')).toContainText('la de la unidad');
    // Lo que pasó el 21/10: la bolsa sí, la caja no.
    await page.locator('[data-ag-embolsado="individual"]').click();
    const ojo = page.locator('.pr-ag__ojo-caja');
    await expect(ojo).toBeVisible();
    await expect(ojo).toContainText('La caja sigue siendo la Caja N°1 Nuss');
    await expect(page.locator('[data-ag-seguir]')).toBeInViewport();
    await captura(page, `caja-ojo-${ancho}`, info);
    await sinScrollHorizontal(page, ancho);
    await dolce.click();
    await expect(page.locator('#pr-agregar-empaque')).toContainText('Caja N°1 Dolce Pasta · bolsitas individuales');

    // ── a) La sala de masa ───────────────────────────────────────────────
    await page.locator('#pr-barra [data-modo="masa"]').click();
    await persona(page, 'Agustín Barrera').click();
    await marcarPin(page, '7391');
    await page.locator('[data-sala-turno="t1"]').first().click();
    await expect(page.locator('#pr-receta')).toContainText('Esencia de vainilla');
    // Primera masa del día: el colorante recordado viene puesto, en rojo.
    const col = page.locator('[data-lote="i-colorante"]');
    await expect(col).toContainText('C-NOREG');
    await expect(col).toContainText('Lote no registrado por administración');
    await expect(col).toHaveClass(/pr-rec__lote--no-registrado/);
    // Los registrados siguen la regla de siempre: hay que elegirlos.
    await expect(page.locator('[data-lote="i-harina"]')).toContainText('Elegí el lote');
    // La nota entra en el recuadro del lote (no lo desborda).
    const desborda = await col.evaluate(b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1);
    expect(desborda, 'la nota desborda el recuadro del lote').toBe(false);
    await captura(page, `masa-no-registrado-${ancho}`, info);
    await sinScrollHorizontal(page, ancho);

    // La ventana del azúcar: el no registrado puesto arriba, en rojo.
    await page.locator('[data-lote="i-azucar"]').click();
    const panel = page.locator('#pr-lote-panel');
    await expect(panel).toBeVisible();
    const noReg = panel.locator('.pr-lp__fila--no-registrado');
    await expect(noReg).toHaveCount(1);
    await expect(noReg).toContainText('AZ-NOREG');
    await expect(noReg).toContainText('Lote no registrado por administración');
    await expect(noReg).toHaveAttribute('aria-pressed', 'true');
    await captura(page, `masa-ventana-${ancho}`, info);
    await sinScrollHorizontal(page, ancho);
    // Elegir uno con stock…
    await panel.locator('[data-lote-op]').first().click();
    await page.locator('#pr-lote-panel-usar-lista').click();
    await expect(panel).toBeHidden();
    await expect(page.locator('[data-lote="i-azucar"]')).not.toHaveClass(/no-registrado/);
    // …y volver al no registrado de un toque.
    await page.locator('[data-lote="i-azucar"]').click();
    await expect(noReg).toContainText('el último que se usó en esta máquina');
    await noReg.click();
    await expect(panel).toBeHidden();
    await expect(page.locator('[data-lote="i-azucar"]')).toContainText('AZ-NOREG');
    await expect(page.locator('[data-lote="i-azucar"]')).toHaveClass(/pr-rec__lote--no-registrado/);

    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// ── b) Stock ───────────────────────────────────────────────────────────────
function haceDias(d) { return new Date(Date.now() - d * 24 * 3600 * 1000).toISOString(); }
function usado(unidad, insumo, nombre, marca, lote, kg, masa, hora, anulada = false) {
  return { lote_fuera_de_stock: true, masa_id: masa, insumo_id: insumo, lote, cantidad_kg: String(kg), insumos: { nombre, marca },
    masas: { hora, anulada, turnos_produccion: { unidad_negocio_id: unidad } } };
}

for (const [ancho, alto] of TAMANOS) {
  test(`stock: lotes usados sin ingreso cargado, a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);

    // Sin permiso de Producción (la cuenta de la maqueta): lo dice.
    await page.goto(`${MAQUETA}/modulos/stock.html?vista=insumos&maqueta=stock`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    const caja = page.locator('#stock-sin-ingreso');
    await expect(caja).toContainText('No se pueden ver los lotes usados sin ingreso cargado de Cucuruchos Nuss');
    await expect(page.locator('#lista-stock [data-stock]').first()).toBeVisible();
    await sinScrollHorizontal(page, ancho);

    // Con produccion:ver: la lista.
    const tareas = [...STOCK.tablas.empleado_tareas, { empleado_id: 'emp-stock', modulo: 'produccion', tarea: 'ver', alcance: { todas: true }, habilitado: true }];
    const masaItems = [
      usado('u-n', 'ins-col', 'Colorante caramelo', 'Fleibor', '35349771', 0.05, 'm1', haceDias(3)),
      usado('u-n', 'ins-col', 'Colorante caramelo', 'Fleibor', '35349771', 0.05, 'm2', haceDias(1)),
      usado('u-n', 'ins-h1', 'Harina 000', 'Júpiter', '01/10/26', 50, 'm3', haceDias(5)),
      usado('u-n', 'ins-az', 'Azúcar', 'Ledesma', 'YA-CARGADO', 2.5, 'm4', haceDias(2)),
      usado('u-n', 'ins-az', 'Azúcar', 'Ledesma', 'ANULADA', 2.5, 'm5', haceDias(2), true),
      usado('u-n', 'ins-az', 'Azúcar', 'Ledesma', 'VIEJO', 2.5, 'm6', haceDias(45)),
      usado('u-d', 'ins-col', 'Colorante caramelo', 'Fleibor', 'D-77', 0.04, 'm7', haceDias(1)),
    ];
    const movs = [{ unidad_negocio_id: 'u-n', insumo_id: 'ins-az', lote: 'YA-CARGADO', cantidad: 25 }];
    await page.evaluate(([c]) => sessionStorage.setItem('maqueta.cambios', c),
      [JSON.stringify({ tablas: { empleado_tareas: tareas, masa_items: masaItems, stock_movimientos: movs } })]);
    await page.reload();
    const cabeza = caja.locator('[data-sin-ingreso-alternar]');
    await expect(cabeza).toContainText('2 lotes usados sin ingreso cargado');
    await expect(caja).not.toContainText('No se pueden ver');
    await captura(page, `stock-sin-ingreso-${ancho}`, info);
    await cabeza.click();
    await expect(cabeza).toHaveAttribute('aria-expanded', 'true');
    const filas = caja.locator('.stock-sin-ingreso__fila');
    await expect(filas).toHaveCount(2);
    await expect(filas.first()).toContainText('Colorante caramelo · Fleibor');
    await expect(filas.first()).toContainText('Lote 35349771');
    await expect(filas.first()).toContainText('0,1 kg en 2 masas · última masa el');
    await expect(caja).not.toContainText('YA-CARGADO');
    await expect(caja).not.toContainText('ANULADA');
    await expect(caja).not.toContainText('VIEJO');
    await expect(caja).not.toContainText('D-77');
    await captura(page, `stock-sin-ingreso-abierto-${ancho}`, info);
    await sinScrollHorizontal(page, ancho);
    // Dolce Pasta en la barra: lo suyo.
    await page.locator('.barra-unidad__chip[data-unidad="u-d"]').first().click();
    await expect(caja).toContainText('1 lote usado sin ingreso cargado');
    await expect(caja).toContainText('D-77');
    await sinScrollHorizontal(page, ancho);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
