// "AMPLIAR" EL PANEL DE DETALLE (06/10/2026, js/ampliar.js).
//
// En la maqueta (Supabase falso, sin sesión ni base), en las cinco pantallas:
// Cobranzas, Gastos, Cheques (la cobranza de un cheque, en Administración),
// Órdenes de retiro y Cuentas corrientes (el detalle de un pago).
//   - A 1280 px: el botón "Ampliar" se ve arriba a la derecha del detalle;
//     abre una ventana grande en el medio (casi toda la pantalla) con el fondo
//     oscurecido, el resumen a la izquierda, la grilla de 2 o 3 por fila a la
//     derecha y las acciones abajo; el foco queda adentro (Tab no se escapa);
//     Escape la cierra y el foco vuelve al botón; tocar afuera también cierra.
//   - Una acción de la ventana hace lo mismo que en el panel (Órdenes:
//     "Anular" abre el panel de anular y la ventana se va).
//   - A 390 px el botón no aparece: ahí el detalle ya es toda la pantalla.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';
const ADM = '/modulos/administracion.html?maqueta=administracion';
const COB_CHEQUE = 'd4444444-4444-4444-8444-444444444444';

// pasos: lo que se toca para llegar al detalle. panel: el contenedor del
// detalle (el botón va arriba a la derecha de él). celdas / acciones: cuántas
// tiene que haber, como mínimo, en la ventana.
const PANTALLAS = [
  { nombre: 'Cobranzas', url: '/modulos/cobranzas.html?maqueta=cobranzas',
    pasos: ['[data-cobranza="00000000-0000-4000-8000-000000000008"]'], boton: '#cob-btn-ampliar', panel: '#cob-vista-detalle',
    celdas: 3, acciones: 3, texto: 'Distribuidora Anatolia' },
  { nombre: 'Gastos', url: '/modulos/gastos.html?maqueta=ampliar-gastos&gasto=g-amp',
    pasos: [], boton: '#btn-ampliar-gasto', panel: '#modal-detalle-gasto',
    celdas: 2, acciones: 2, texto: 'Pedir factura A la próxima vez: esta vino como X y hay que reclamarla.' },
  { nombre: 'Cheques', url: `${ADM}&seccion=cobranzas&cobranza=${COB_CHEQUE}`,
    pasos: [], boton: '#ad-cobranza-ampliar', panel: '#ad-vista-cobranza',
    celdas: 1, acciones: 2, texto: 'Anatolia' },
  { nombre: 'Órdenes de retiro', url: ADM,
    pasos: ['[data-pestana="ordenes"]', '#ad-ordenes-lista [data-orden="o1"]'], boton: '#ad-orden-ampliar', panel: '#ad-vista-orden',
    celdas: 2, acciones: 4, texto: 'Distribuidora Anatolia' },
  { nombre: 'Cuentas corrientes', url: '/modulos/cuentas-corrientes.html?maqueta=ampliar-cc',
    pasos: ['#tab-proveedores .btn-ver-cuenta[data-proveedor="p1"][data-unidad="u-d"]', '.btn-detalle-pago[data-gasto-id="g-1"]'],
    boton: '#btn-ampliar-pago', panel: '#modal-detalle-pago .modal-cc__panel', celdas: 3, acciones: 0, texto: 'Sobrante' },
];

async function llegar(page, p) {
  await page.goto(MAQUETA + p.url);
  await page.waitForLoadState('networkidle').catch(() => {});
  for (const s of p.pasos) {
    const loc = page.locator(s).filter({ visible: true }).first();
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    await loc.click();
    await page.waitForTimeout(400);
  }
}

for (const p of PANTALLAS) {
  test(`1280 px · ${p.nombre}: Ampliar abre la ventana grande y Escape la cierra`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await llegar(page, p);
    const boton = page.locator(p.boton);
    await expect(boton).toBeVisible();
    await expect(boton).toHaveText('Ampliar');

    // Arriba a la derecha del detalle.
    const lugar = await page.evaluate(([b, pan]) => {
      const r = document.querySelector(b).getBoundingClientRect();
      const q = document.querySelector(pan).getBoundingClientRect();
      return { derecha: r.left + r.width / 2 > q.left + q.width / 2, arriba: r.top - q.top < 160, adentro: r.right <= q.right + 1 && r.left >= q.left - 1 };
    }, [p.boton, p.panel]);
    expect(lugar, 'el botón va arriba a la derecha del detalle').toEqual({ derecha: true, arriba: true, adentro: true });
    await captura(page, `ampliar-${p.nombre}-panel`, info);

    await boton.click();
    const dlg = page.locator('.amp[role="dialog"][aria-modal="true"]');
    await expect(dlg).toBeVisible();
    // El título, por aria-labelledby.
    const titulo = await dlg.evaluate(d => document.getElementById(d.getAttribute('aria-labelledby'))?.textContent ?? '');
    expect(titulo.trim().length, 'la ventana tiene título').toBeGreaterThan(3);

    // Grande y en el medio, con el fondo oscuro.
    const medidas = await page.evaluate(() => {
      const d = document.querySelector('.amp').getBoundingClientRect();
      const f = document.querySelector('.amp-fondo');
      const fr = f.getBoundingClientRect();
      const a = (getComputedStyle(f).backgroundColor.match(/rgba?\(([^)]+)\)/) || [])[1]?.split(',').map(Number) ?? [];
      return {
        ancho: d.width / innerWidth, alto: d.height / innerHeight,
        centrado: Math.abs((d.left + d.right) / 2 - innerWidth / 2) < 4 && Math.abs((d.top + d.bottom) / 2 - innerHeight / 2) < 4,
        fondoTapaTodo: fr.left <= 0 && fr.top <= 0 && fr.right >= innerWidth && fr.bottom >= innerHeight,
        alfa: a.length === 4 ? a[3] : 1, oscuro: a.length >= 3 && a[0] < 80 && a[1] < 80 && a[2] < 80,
        pagina: getComputedStyle(document.documentElement).overflow,
      };
    });
    expect(medidas.ancho, 'casi todo el ancho').toBeGreaterThan(0.9);
    expect(medidas.alto, 'casi todo el alto').toBeGreaterThan(0.85);
    expect(medidas.centrado, 'en el medio').toBe(true);
    expect(medidas.fondoTapaTodo, 'el fondo tapa toda la pantalla').toBe(true);
    expect(medidas.oscuro && medidas.alfa >= 0.4, `el fondo oscurece (alfa ${medidas.alfa})`).toBe(true);
    expect(medidas.pagina, 'la página de atrás no scrollea').toBe('hidden');

    // Resumen a la izquierda, grilla a la derecha.
    const partes = await page.evaluate(() => {
      const r = document.querySelector('.amp__resumen').getBoundingClientRect();
      const l = document.querySelector('.amp__lado').getBoundingClientRect();
      const g = document.querySelector('.amp__grilla');
      const celdas = [...g.querySelectorAll(':scope > .amp__celda')].map(c => c.getBoundingClientRect());
      return {
        izquierda: r.right <= l.left + 1, columnas: Number(g.dataset.columnas),
        pistas: getComputedStyle(g).gridTemplateColumns.split(' ').length, celdas: celdas.length,
        ladoALado: celdas.length < 2 || Math.abs(celdas[0].top - celdas[1].top) < 2,
        acciones: document.querySelectorAll('.amp__acciones > *').length,
        pieVisible: !document.querySelector('.amp__acciones').hidden,
        texto: document.querySelector('.amp').innerText,
      };
    });
    expect(partes.izquierda, 'el resumen a la izquierda de la grilla').toBe(true);
    expect(partes.celdas, 'la grilla tiene lo del detalle').toBeGreaterThanOrEqual(p.celdas);
    expect([1, 2, 3], 'grilla de 2 o 3 por fila (1 si hay una sola cosa)').toContain(partes.columnas);
    expect(partes.pistas, 'las columnas de la grilla se aplican').toBe(partes.columnas);
    if (partes.celdas >= 2) expect(partes.columnas, 'con 2 o más cosas, 2 o 3 por fila').toBeGreaterThanOrEqual(2);
    expect(partes.ladoALado, 'las primeras dos cosas van lado a lado').toBe(true);
    expect(partes.acciones, 'las acciones del panel van abajo').toBe(p.acciones);
    expect(partes.pieVisible, 'el pie solo con acciones').toBe(p.acciones > 0);
    expect(partes.texto, 'el texto del detalle, entero').toContain(p.texto);
    await captura(page, `ampliar-${p.nombre}-ventana`, info);

    // El foco: en la X al abrir, y Tab no se escapa.
    await expect(page.locator('.amp__cerrar')).toBeFocused();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
      const adentro = await page.evaluate(() => document.querySelector('.amp').contains(document.activeElement));
      expect(adentro, `el foco queda adentro (Tab ${i + 1})`).toBe(true);
    }

    // Escape cierra y el foco vuelve a Ampliar.
    await page.keyboard.press('Escape');
    await expect(page.locator('.amp-fondo')).toHaveCount(0);
    await expect(boton).toBeFocused();
    // El detalle sigue abierto atrás (Escape no se lo llevó).
    await expect(page.locator(p.panel).first()).toBeVisible();

    // Tocar afuera también cierra.
    await boton.click();
    await expect(dlg).toBeVisible();
    await page.mouse.click(6, 6);
    await expect(page.locator('.amp-fondo')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`390 px · ${p.nombre}: el botón Ampliar no aparece`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await llegar(page, p);
    await expect(page.locator(p.panel).first()).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.locator(p.boton)).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('1280 px · Órdenes: una acción de la ventana hace lo mismo que en el panel', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await llegar(page, PANTALLAS.find(x => x.nombre === 'Órdenes de retiro'));
  await page.locator('#ad-orden-ampliar').click();
  await expect(page.locator('.amp[role="dialog"]')).toBeVisible();
  await page.locator('.amp__acciones').getByRole('button', { name: 'Anular' }).click();
  // La ventana se va y el panel de siempre abre el formulario de anular.
  await expect(page.locator('.amp-fondo')).toHaveCount(0);
  await expect(page.locator('#ad-panel-anular')).toBeVisible();
  // Mientras se anula, no se ofrece Ampliar (es un formulario).
  await expect(page.locator('#ad-orden-ampliar')).toBeHidden();
  await captura(page, 'ampliar-ordenes-anular', info);
  await page.locator('#ad-anular-no').click();
  await expect(page.locator('#ad-orden-ampliar')).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});

test('1280 px · Cobranzas: la ventana sigue a la cobranza elegida', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await llegar(page, PANTALLAS[0]);
  await page.locator('#cob-btn-ampliar').click();
  await expect(page.locator('.amp__titulo')).toContainText('Distribuidora Anatolia');
  // "Editar" desde la ventana: la ventana se va y abre el formulario de siempre.
  await page.locator('.amp__acciones').getByRole('button', { name: 'Editar' }).click();
  await expect(page.locator('.amp-fondo')).toHaveCount(0);
  await expect(page.locator('#cob-vista-form')).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});
