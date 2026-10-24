// LOTES NO REGISTRADOS, LA CAJA DOLCE PASTA Y EL AVISO DE STOCK (23/10/2026),
// en la maqueta (Supabase falso, sin credenciales). Corre SIEMPRE.
//
// a) La tablet: la primera masa del día trae puesto el último lote NO
//    registrado que se usó en esa máquina (la memoria de la tablet), en rojo,
//    "Lote no registrado por administración"; la ventana de lotes lo muestra
//    arriba, en rojo, y se elige de un toque.
// c) La caja: "Caja N°1 Dolce Pasta" en grande, con qué bolsa va, y si se
//    cambia la bolsa y no la caja: "La caja sigue siendo la Caja N°1 Nuss".
// b) Stock: "Lotes usados sin ingreso cargado" (desde el 24/10/2026, de la RPC
//    lotes_usados_sin_ingreso, con stock:ver alcanza) y el error de la base de
//    UNA fábrica, tal cual, sin tapar lo de las demás.
// A 390, 360, la tablet parada (768×1024), la acostada (1000×540) y 1280:
// sin scroll horizontal y sin errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });
const PRODUCCION = require('./maqueta/datos/produccion.json');

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
// Desde el 24/10/2026 el aviso sale de la RPC lotes_usados_sin_ingreso (una
// llamada por fábrica; ya sin los lotes con ingreso), como la devuelve:
// [{insumo_id, insumo, marca, unidad_medida, lote, kg, masas, ultima_fecha, maquinas}].
function lote(insumo_id, insumo, marca, lote, kg, masas, ultima_fecha, maquinas) {
  return { insumo_id, insumo, marca, unidad_medida: 'kg', lote, kg, masas, ultima_fecha, maquinas };
}

for (const [ancho, alto] of TAMANOS) {
  test(`stock: lotes usados sin ingreso cargado, a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);

    // La cuenta de la maqueta tiene stock:ver en Nuss y Dolce (sin ninguna
    // tarea de Producción): con la RPC ALCANZA, ya no hay nota de permiso.
    // Nuss devuelve dos lotes; Dolce, un error de la base (se muestra tal
    // cual, solo para Dolce).
    const respuesta = {
      __segun: [
        { si: { p_unidad_negocio_id: 'u-n' }, r: [
          lote('ins-col', 'Colorante caramelo', 'Fleibor', '35349771', 0.1, 2, '2026-10-22', 'Máquina 1, Máquina 2'),
          lote('ins-h1', 'Harina 000', 'Júpiter', '01/10/26', 50, 1, '2026-10-19', 'Máquina 3'),
        ] },
        { si: { p_unidad_negocio_id: 'u-d' }, r: 'ERROR:No tenés permiso para ver el stock de esta fábrica.' },
      ],
      __defecto: [],
    };
    await page.addInitScript(([c]) => sessionStorage.setItem('maqueta.cambios', c),
      [JSON.stringify({ rpc: { lotes_usados_sin_ingreso: respuesta } })]);
    await page.goto(`${MAQUETA}/modulos/stock.html?vista=insumos&maqueta=stock`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    const caja = page.locator('#stock-sin-ingreso');
    const cabeza = caja.locator('[data-sin-ingreso-alternar]');
    await expect(cabeza).toContainText('2 lotes usados sin ingreso cargado');
    await expect(page.locator('#lista-stock [data-stock]').first()).toBeVisible();
    await expect(caja).not.toContainText('No se pueden ver');
    await expect(caja).not.toContainText('No se pudieron leer');
    await captura(page, `stock-sin-ingreso-${ancho}`, info);
    await cabeza.click();
    await expect(cabeza).toHaveAttribute('aria-expanded', 'true');
    const filas = caja.locator('.stock-sin-ingreso__fila');
    await expect(filas).toHaveCount(2);
    await expect(filas.first()).toContainText('Colorante caramelo · Fleibor');
    await expect(filas.first()).toContainText('Lote 35349771');
    await expect(filas.first()).toContainText('0,1 kg en 2 masas · Máquina 1, Máquina 2 · última masa el 22/10/2026');
    await captura(page, `stock-sin-ingreso-abierto-${ancho}`, info);
    await sinScrollHorizontal(page, ancho);
    // Dolce Pasta en la barra: su error, tal cual.
    await page.locator('.barra-unidad__chip[data-unidad="u-d"]').first().click();
    await expect(caja).toContainText('No se pudieron leer los lotes usados sin ingreso cargado de Dolce Pasta: No tenés permiso para ver el stock de esta fábrica.');
    await expect(caja).not.toContainText('35349771');
    await sinScrollHorizontal(page, ancho);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
