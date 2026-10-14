// RETENCIONES en Administración (13/10/2026). En la maqueta (Supabase falso,
// sin credenciales), a 1280, 390 y 360 px, con el reloj en el 13/10/2026 y los
// datos `retenciones`:
//  - la sección abre con "Este mes", pide retenciones_resumen con las fechas y
//    la empresa (con "Todas", null), y muestra los totales por tipo por
//    empresa (2 decimales) y la lista (la anulada con su motivo, sin Anular);
//  - Anular pide el motivo en el renglón y manda anular_retencion;
//  - Cargar una de un CLIENTE: el buscador encuentra a Anatolia por su apodo
//    ("el Turco"), el aviso dice "Baja la deuda de …" antes de confirmar y
//    viaja registrar_retencion con los parámetros exactos;
//  - Cargar una que debitó el BANCO: solo las cuentas de banco de esa empresa
//    en pesos y activas, el aviso "Se descuenta … de <cuenta>" y viaja
//    registrar_retencion_banco;
//  - la cuenta del cliente dice "Retención Percepción de IIBB · cert. …";
//  - los botones a la vista; sin scroll de costado y sin errores de JS.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const URL = `${MAQUETA}/modulos/administracion.html?seccion=retenciones&maqueta=retenciones`;

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

async function abrir(page, ancho, url = URL) {
  const alto = ancho >= 1024 ? 900 : 844;
  await page.clock.setFixedTime(new Date('2026-10-13T15:00:00Z'));
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(url);
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
  test(`la lista y los totales por tipo, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await expect(page.locator('#ad-vista-retenciones')).toBeVisible();
    await expect(page.locator('[data-retencion="ret-1"]')).toBeVisible();
    const res = llamadas.filter(l => l.nombre === 'retenciones_resumen');
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0].params).toEqual({ p_desde: '2026-10-01', p_hasta: '2026-10-13', p_unidad_negocio_id: null });
    const totales = page.locator('#ad-ret-totales');
    await expect(totales).toContainText('Cucuruchos Nuss');
    await expect(totales).toContainText('Dolce Pasta');
    await expect(totales).toContainText('Ganancias');
    await expect(totales).toContainText(/\$\s12\.500,50/);
    await expect(totales).toContainText(/\$\s16\.546,25/);
    await expect(page.locator('[data-retencion="ret-1"]')).toContainText('Percepción de IIBB');
    await expect(page.locator('[data-retencion="ret-1"]')).toContainText('Cliente: Distribuidora Anatolia');
    await expect(page.locator('[data-retencion="ret-1"]')).toContainText('Cert. 0001-00012345');
    const anulada = page.locator('[data-retencion="ret-5"]');
    await expect(anulada).toContainText('Anulada: Cargada dos veces');
    await expect(anulada.locator('[data-ret-anular]')).toHaveCount(0);
    await expect(page.locator('#ad-ret-cantidad')).toContainText('6 retenciones (1 anulada, no suma)');
    await expect(page.locator('#ad-ret-desde-periodo')).toBeVisible();
    await sinCostado(page, ancho);
    await aLaVista(page, '#ad-ret-nueva');
    expect(errores).toEqual([]);
  });

  test(`anular con motivo, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await page.locator('[data-ret-anular="ret-4"]').click();
    await expect(page.locator('#ad-ret-motivo')).toBeVisible();
    await page.locator('#ad-ret-anular-si').click();
    await expect(page.locator('[data-retencion="ret-4"] .ad-error-pegado')).toContainText('al menos 3 letras');
    expect(llamadas.some(l => l.nombre === 'anular_retencion')).toBe(false);
    await page.locator('#ad-ret-motivo').fill('Era de otro cliente');
    await aLaVista(page, '#ad-ret-anular-si');
    await page.locator('#ad-ret-anular-si').click();
    await expect(page.locator('.toast')).toContainText('Retención anulada');
    const an = llamadas.filter(l => l.nombre === 'anular_retencion');
    expect(an).toHaveLength(1);
    expect(an[0].params).toEqual({ p_id: 'ret-4', p_motivo: 'Era de otro cliente' });
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`cargar la retención de un cliente (buscado por su apodo), a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await page.locator('#ad-ret-nueva').click();
    await expect(page.locator('#ad-ret-carga')).toBeVisible();
    await expect(page.locator('#ad-ret-fecha')).toHaveValue('2026-10-13');
    await page.selectOption('#ad-ret-empresa', 'u-n');
    await page.selectOption('#ad-ret-tipo', 'percepcion_iibb');
    await expect(page.locator('#ad-ret-jurisdiccion')).toBeVisible();
    await page.locator('#ad-ret-importe').pressSequentially('1500');
    await expect(page.locator('#ad-ret-importe')).toHaveValue('1.500');
    await page.locator('[data-ret-origen="cliente"]').click();
    await page.locator('#ad-ret-cliente-buscar').fill('turco');
    const opcion = page.locator('[data-ret-cliente="c1"]');
    await expect(opcion).toContainText('Distribuidora Anatolia · el Turco');
    const bus = llamadas.filter(l => l.nombre === 'buscar_clientes').at(-1);
    expect(bus.params).toEqual({ p_busqueda: 'turco', p_unidad_negocio_id: 'u-n' });
    await opcion.click();
    await expect(page.locator('#ad-ret-cliente-elegido')).toContainText('Distribuidora Anatolia');
    await page.locator('#ad-ret-certificado').fill('0001-00099999');
    await page.locator('#ad-ret-jurisdiccion').fill('Córdoba');
    await expect(page.locator('#ad-ret-aviso')).toHaveText(/Baja la deuda de Distribuidora Anatolia en \$\s1\.500,00\./);
    await sinCostado(page, ancho);
    await aLaVista(page, '#ad-ret-guardar');
    await page.locator('#ad-ret-guardar').click();
    await expect(page.locator('.toast')).toContainText('Retención cargada');
    await expect(page.locator('#ad-ret-carga')).toBeHidden();
    const reg = llamadas.filter(l => l.nombre === 'registrar_retencion');
    expect(reg).toHaveLength(1);
    expect(reg[0].params).toEqual({
      p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-13', p_tipo: 'percepcion_iibb', p_importe: 1500, p_origen: 'cliente', p_cliente_id: 'c1',
      p_numero_certificado: '0001-00099999', p_jurisdiccion: 'Córdoba', p_detalle: null,
    });
    expect(errores).toEqual([]);
  });

  test(`cargar la que debitó el banco, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const llamadas = anotarRpc(page);
    await abrir(page, ancho);
    await page.locator('#ad-ret-nueva').click();
    await page.selectOption('#ad-ret-empresa', 'u-n');
    await page.selectOption('#ad-ret-tipo', 'sircreb');
    await page.locator('#ad-ret-importe').pressSequentially('845,75');
    await page.locator('[data-ret-origen="banco"]').click();
    await expect(page.locator('#ad-ret-campo-cuenta')).toBeVisible();
    await expect(page.locator('#ad-ret-campo-certificado')).toBeHidden();
    const valores = await page.locator('#ad-ret-cuenta option').evaluateAll(os => os.map(o => o.value));
    expect(valores).toEqual(['', 'cta-banco-nuss', 'cta-nacion-nuss']);
    await page.selectOption('#ad-ret-cuenta', 'cta-banco-nuss');
    await expect(page.locator('#ad-ret-aviso')).toHaveText(/Se descuenta \$\s845,75 de Banco Macro · Nuss\./);
    await sinCostado(page, ancho);
    await aLaVista(page, '#ad-ret-guardar');
    await page.locator('#ad-ret-guardar').click();
    await expect(page.locator('.toast')).toContainText('Retención cargada');
    const reg = llamadas.filter(l => l.nombre === 'registrar_retencion_banco');
    expect(reg).toHaveLength(1);
    expect(reg[0].params).toEqual({ p_cuenta_id: 'cta-banco-nuss', p_fecha: '2026-10-13', p_tipo: 'sircreb', p_importe: 845.75, p_jurisdiccion: null, p_detalle: null });
    expect(llamadas.some(l => l.nombre === 'registrar_retencion')).toBe(false);
    expect(errores).toEqual([]);
  });

  test(`la cuenta del cliente dice la retención con su tipo, a ${ancho}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho, `${MAQUETA}/modulos/administracion.html?seccion=clientes&maqueta=retenciones`);
    await page.locator('[data-cliente="c1"]').first().click();
    await expect(page.locator('#ad-vista-cliente')).toBeVisible();
    await expect(page.locator('#ad-vista-cliente')).toContainText('Retención Percepción de IIBB · cert. 0001-00012345');
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}
