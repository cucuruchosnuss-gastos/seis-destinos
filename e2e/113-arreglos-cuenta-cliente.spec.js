// LA CUENTA DEL CLIENTE (31/10/2026, arreglos de la auditoría del 30/10,
// puntos 2 y 5b), en la maqueta, sin credenciales, a 390 y 1280 px:
//  - Administración → Clientes → Distribuidora Anatolia (c1, vinculada con su
//    proveedor: la cuenta de cliente y proveedor, maqueta cc-orden-n1-n2):
//    tocar la fila "Venta" de N-0042 despliega N1 (con la comisión de
//    vendedores y cuánto), N2 y el total, con UNA llamada a
//    datos_division_orden; "Ver la orden ›" va adentro del desplegable y abre
//    la orden; la venta sin condición dice el total y "Sin división N1/N2";
//    la 100/0 no muestra el N2; el filtro "Ver" la deja abierta;
//  - sin retiros:precios: solo el total, sin llamar a la base;
//  - embebida en Cuentas corrientes → Clientes se ve igual;
//  - "Aplicar" en el saldo a favor del corte que ya tiene algo aplicado: lee
//    aplicaciones_credito_cliente y manda lo de antes MÁS lo nuevo, sumado
//    por doc, parte y medio; si la lectura falla, lo dice y no deja aplicar.
// Sin scroll horizontal ni errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const sinNbsp = (s) => String(s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
const sinScrollHorizontal = async (page) => {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
};

// Administración con los datos de la maqueta cc-orden-n1-n2; `sinPrecios`
// saca retiros:precios.
async function abrirAdministracion(page, { sinPrecios = false } = {}) {
  await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes&maqueta=cc-orden-n1-n2`);
  await page.evaluate((sin) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    if (sin) {
      const tareas = globalThis.__maquetaTablas.empleado_tareas.filter(t => !(t.modulo === 'retiros' && t.tarea === 'precios'));
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { empleado_tareas: tareas } }));
    } else sessionStorage.removeItem('maqueta.cambios');
  }, sinPrecios);
  await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes`);
  await expect(page.locator('#ad-vista-clientes')).toBeVisible();
  await page.locator('.ad-fila[data-cliente="c1"]').click();
}

const fila = (unica, chip, texto) => unica.locator('.cu-fila', { has: unica.page().locator(chip) }).filter({ hasText: texto });

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: en la cuenta del cliente, la venta despliega N1, N2 y el total`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    const unica = page.locator('#ad-cuenta-unica');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    const v42 = fila(unica, '.cu-chip--venta', 'Orden N-0042');
    await expect(v42).toHaveClass(/ad-fila-venta/);
    await expect(v42).toHaveAttribute('aria-expanded', 'false');
    await expect(v42.locator('.ad-fila-venta__ver')).toHaveText('Ver N1 / N2 ▾');
    // El "Ver la orden ›" de la fila pasa adentro del desplegable.
    await expect(v42.locator('.cu-fila__ver:not(.ad-fila-venta__ver)')).toBeHidden();
    // La corrección de la comisión sigue siendo un link a la orden.
    const correccion = fila(unica, '.cu-chip--comision', 'Corrección de la comisión');
    await expect(correccion).not.toHaveClass(/ad-fila-venta/);
    await expect(correccion.locator('.cu-fila__ver')).toBeVisible();
    expect(rpc.some(r => r.nombre === 'datos_division_orden'), 'nada se lee antes de tocar').toBe(false);

    await v42.click();
    const panel = page.locator('#ad-n1n2-or-42');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.ad-n1n2__linea')).toHaveText([
      'N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88)',
      'N2-0042: $ 2.286.939,17',
      'Total: $ 4.012.369,65',
    ]);
    await expect(v42).toHaveAttribute('aria-expanded', 'true');
    const llamadas = () => rpc.filter(r => r.nombre === 'datos_division_orden');
    expect(llamadas()).toEqual([{ nombre: 'datos_division_orden', params: { p_orden_id: 'or-42', p_pct_a: null, p_comisiones: null } }]);
    expect(await v42.evaluate(el => el.nextElementSibling?.id)).toBe('ad-n1n2-or-42');
    await expect(panel.locator('[data-ad-n1n2-orden="or-42"]')).toHaveText('Ver la orden ›');
    await sinScrollHorizontal(page);
    await panel.scrollIntoViewIfNeeded();
    await captura(page, `cuenta-cliente-n1n2-${ancho}`, info);

    // Cerrar y abrir con el teclado (la fila es un botón): no vuelve a leer.
    await v42.click();
    await expect(panel).toHaveCount(0);
    await v42.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.ad-n1n2__linea')).toHaveCount(3);
    expect(llamadas()).toHaveLength(1);

    // Sin condición de venta: el total y "Sin división N1/N2". 100/0: sin N2.
    await fila(unica, '.cu-chip--venta', 'Orden N-0043').click();
    const p43 = page.locator('#ad-n1n2-or-43');
    await expect(p43).toContainText('Total: $ 500.000,00');
    await expect(p43).toContainText('Sin división N1/N2');
    await expect(p43).not.toContainText('N1-');
    await fila(unica, '.cu-chip--venta', 'Orden N-0044').click();
    await expect(page.locator('#ad-n1n2-or-44 .ad-n1n2__linea')).toHaveText([
      'N1-0044: $ 120.000,00 (incluye comisión de vendedores $ 6.000,00)',
      'Total: $ 120.000,00',
    ]);
    await sinScrollHorizontal(page);

    // El filtro de js/cuenta-unica.js repinta: la venta sigue abierta.
    await unica.locator('[data-cu-filtro]').selectOption('Venta');
    await expect(unica.locator('.cu-fila')).toHaveCount(3);
    await expect(panel).toBeVisible();
    await unica.locator('[data-cu-filtro]').selectOption('');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    await expect(panel.locator('.ad-n1n2__linea')).toHaveCount(3);
    expect(llamadas().map(r => r.params.p_orden_id)).toEqual(['or-42', 'or-43', 'or-44']);

    // "Ver la orden ›" del desplegable abre la orden.
    await panel.locator('[data-ad-n1n2-orden="or-42"]').click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: sin retiros:precios, solo el total`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { sinPrecios: true });
    const unica = page.locator('#ad-cuenta-unica');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    await fila(unica, '.cu-chip--venta', 'Orden N-0042').click();
    const panel = page.locator('#ad-n1n2-or-42');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.ad-n1n2__linea')).toHaveText(['Total: $ 4.012.369,65']);
    await expect(panel).not.toContainText('Sin división');
    await expect(panel).not.toContainText('N1-');
    expect(rpc.some(r => r.nombre === 'datos_division_orden'), 'no llama a la base').toBe(false);
    await sinScrollHorizontal(page);
    await captura(page, `cuenta-cliente-n1n2-sin-precios-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
  });
}

test('embebida en Cuentas corrientes → Clientes se ve igual', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-orden-n1-n2`);
  await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'u-n'); sessionStorage.removeItem('maqueta.cambios'); });
  await page.reload();
  await page.locator('[data-cc-seccion="clientes"]').click();
  const marco = page.frameLocator('#cc-clientes-marco');
  await expect(marco.locator('#ad-vista-clientes')).toBeVisible();
  await marco.locator('.ad-fila[data-cliente="c1"]').click();
  const unica = marco.locator('#ad-cuenta-unica');
  await expect(unica.locator('.cu-fila')).toHaveCount(5);
  await unica.locator('.cu-fila', { has: marco.locator('.cu-chip--venta') }).filter({ hasText: 'Orden N-0042' }).click();
  const panel = marco.locator('#ad-n1n2-or-42');
  await expect(panel.locator('.ad-n1n2__linea')).toHaveText([
    'N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88)',
    'N2-0042: $ 2.286.939,17',
    'Total: $ 4.012.369,65',
  ]);
  await sinScrollHorizontal(page);
  await captura(page, 'cuenta-cliente-n1n2-embebida', info);
  expect(errores, errores.join('\n')).toEqual([]);
});

// ── 5b: el saldo a favor del corte con algo aplicado ─────────────────────────
const D = (doc_tipo, doc_id, parte, etiqueta, monto, aplicado = 0) => ({ doc_tipo, doc_id, parte, etiqueta, fecha: '2026-09-20', orden_id: null, monto, aplicado, pendiente: monto - aplicado });
const DOCS = [
  D('orden', 'o1', 'N1', 'N1-0012', 26000, 4000),
  D('orden', 'o1', 'N2', 'N2-0012', 20000),
];
const CREDITOS = [
  { credito_tipo: 'corte', credito_id: 'c1', etiqueta: 'Saldo a favor al corte', fecha: '2026-09-01', monto: 10000, aplicado: 4000, libre: 6000, medios: null, aplicado_por_medio: null },
];

async function prepararBase(page, { errorLeer = null } = {}) {
  await page.evaluate(({ docs, creditos, errorLeer }) => {
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__aplicadas = [];
    globalThis.__leidas = [];
    globalThis.__maqueta.rpc = Object.assign(globalThis.__maqueta.rpc || {}, {
      cliente_pendientes: () => ({ activo: true, imputa_desde: '2026-09-01T03:00:00+00:00', saldo_cuenta: 36000, docs, creditos }),
      sugerir_aplicacion: (p) => ({ items: [{ doc_tipo: 'orden', doc_id: 'o1', parte: 'N1', etiqueta: 'N1-0012', monto: Math.min(p.p_monto, 22000) }], sobra: 0 }),
      aplicaciones_credito_cliente: (p) => {
        globalThis.__leidas.push(p);
        if (errorLeer) return 'ERROR:' + errorLeer;
        // Dos imputaciones a la N1 (se suman): 2.500 + 1.500.
        return [
          { doc_tipo: 'orden', doc_id: 'o1', parte: 'N1', medio: null, monto: 2500, efectivo: 2500 },
          { doc_tipo: 'orden', doc_id: 'o1', parte: 'N1', medio: null, monto: 1500, efectivo: 1500 },
        ];
      },
      aplicar_credito_cliente: (p) => {
        globalThis.__aplicadas.push(p);
        const aplicado = p.p_items.reduce((s, x) => s + x.monto, 0);
        return { aplicado, a_cuenta: 10000 - aplicado };
      },
    });
  }, { docs: DOCS, creditos: CREDITOS, errorLeer });
}

async function abrirConCorte(page, opciones) {
  await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes&maqueta=administracion`);
  await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'u-n'); sessionStorage.removeItem('maqueta.cambios'); });
  await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes`);
  await expect(page.locator('#ad-vista-clientes')).toBeVisible();
  await prepararBase(page, opciones);
  await page.locator('.ad-fila[data-cliente="c1"]').click();
  await expect(page.locator('#ad-pend')).toBeVisible();
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: el corte con algo aplicado manda lo de antes MÁS lo nuevo`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirConCorte(page);
    const sec = page.locator('#ad-pend');
    await expect(sec).not.toContainText('falta una función de la base');
    await sec.locator('[data-ad-aplicar="corte|c1"]').click();
    const panel = page.locator('#ad-apl');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Ya tenía aplicado $ 4.000,00: se mantiene y se le suma lo de abajo.');
    await expect.poll(async () => sinNbsp(await page.locator('#ad-apl-cifras').innerText())).toMatch(/Libre para aplicar\s*\$ 6\.000,00\s*Aplicado ahora\s*\$ 6\.000,00/);
    expect(await page.evaluate(() => globalThis.__leidas)).toEqual([{ p_cliente_id: 'c1', p_credito_tipo: 'corte', p_credito_id: 'c1' }]);
    await sinScrollHorizontal(page);
    await panel.scrollIntoViewIfNeeded();
    await captura(page, `aplicar-corte-con-aplicado-${ancho}`, info);
    await page.locator('#ad-apl-confirmar').click();
    await expect(panel).toBeHidden();
    const ap = await page.evaluate(() => globalThis.__aplicadas.at(-1));
    expect(ap.p_credito_tipo).toBe('corte');
    // 2.500 + 1.500 de antes + 6.000 nuevos, a la N1, en UN renglón.
    expect(ap.p_items).toEqual([{ doc_tipo: 'orden', doc_id: 'o1', parte: 'N1', monto: 10000, medio: null }]);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('si no se puede leer lo que ya tenía aplicado, no se aplica', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirConCorte(page, { errorLeer: 'No tenés permiso sobre la cuenta de este cliente.' });
  await page.locator('[data-ad-aplicar="corte|c1"]').click();
  const panel = page.locator('#ad-apl');
  await expect(panel).toContainText('No se pudo leer lo que este crédito ya tenía aplicado (No tenés permiso sobre la cuenta de este cliente.). Sin eso no se puede aplicar: se borraría.');
  await expect(page.locator('#ad-apl-confirmar')).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.__aplicadas.length)).toBe(0);
  await sinScrollHorizontal(page);
  expect(errores, errores.join('\n')).toEqual([]);
});
