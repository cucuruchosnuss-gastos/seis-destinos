// Los apodos de los clientes (02/10/2026), en la maqueta: buscar "Turi" da
// "SALVADOR LOFORTE · Turi" en Órdenes de retiro y en Cobranzas, y en la ficha
// del cliente (Administración) los apodos son etiquetas con una X que se
// agregan y se sacan. A 390 y 1280 px, sin scroll horizontal ni errores. Corre
// SIEMPRE, sin credenciales. Los clientes se suman con 'maqueta.cambios' (no
// se tocan los datos que usan otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';

const LOFORTE = { id: 'c-turi', unidad_negocio_id: 'u-n', nombre: 'SALVADOR LOFORTE', razon_social: null, apodos: ['Los Forte', 'Turi'],
  cuit: null, localidad: 'Córdoba', transporte_habitual: null, activo: true };

async function sinScroll(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

for (const ancho of [390, 1280]) {
  test(`retiros: "Turi" da SALVADOR LOFORTE · Turi, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
    await page.evaluate((c) => {
      const datos = { tablas: { clientes: [c] } };
      sessionStorage.setItem('maqueta.cambios', JSON.stringify(datos));
    }, LOFORTE);
    await page.reload();
    // "¿De qué empresa es el retiro?": Nuss.
    await page.locator('[data-empresa="u-n"]').first().click();
    await page.locator('#rt-cliente-buscar').fill('Turi');
    const resultado = page.locator('#rt-clientes-resultados [data-cliente="c-turi"]');
    await expect(resultado).toBeVisible();
    await expect(resultado.locator('.rt-resultado__nombre')).toHaveText('SALVADOR LOFORTE · Turi');
    await captura(page, `apodos-retiros-${ancho}`, info);
    await sinScroll(page);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`cobranzas: "Turi" da SALVADOR LOFORTE · Turi, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.evaluate(() => {
      const fila = { cliente_id: 'c-turi', nombre: 'SALVADOR LOFORTE', razon_social: null, localidad: 'Córdoba', empresa: 'Cucuruchos Nuss',
        unidad_negocio_id: 'u-n', activo: true, saldo: 120000, parecido: 1 };
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({
        tablas: { clientes: [{ id: 'c-turi', apodos: ['Los Forte', 'Turi'] }] },
        rpc: { buscar_clientes: [fila] },
      }));
    });
    await page.reload();
    await page.locator('#cob-btn-nueva').click();
    await page.locator('#cob-empresas [data-empresa="u-n"]').click();
    await page.locator('#cob-asentar-buscar').fill('Turi');
    const op = page.locator('#cob-lista-clientes [data-cliente-id="c-turi"]');
    await expect(op.locator('.cob-cliente-op__nombre')).toHaveText('SALVADOR LOFORTE · Turi');
    await captura(page, `apodos-cobranzas-${ancho}`, info);
    await sinScroll(page);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`la ficha: agregar y sacar apodos como etiquetas, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('[data-cliente]').first().click();
    await page.locator('#ad-btn-ficha').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    const etiquetas = page.locator('#ad-f-apodos .ad-apodo');
    const antes = await etiquetas.count();
    await page.locator('#ad-f-apodo-nuevo').fill('Turi');
    await page.locator('#ad-f-apodo-nuevo').press('Enter');
    await expect(etiquetas).toHaveCount(antes + 1);
    await expect(page.locator('#ad-f-apodos')).toContainText('Turi');
    await expect(page.locator('#ad-f-apodo-nuevo')).toHaveValue('');
    // Repetido: se dice y no se agrega.
    await page.locator('#ad-f-apodo-nuevo').fill('turi');
    await page.locator('#ad-f-apodo-agregar').click();
    await expect(page.locator('#ad-f-apodos-error')).toContainText('ya está en la lista');
    await expect(etiquetas).toHaveCount(antes + 1);
    await captura(page, `apodos-ficha-${ancho}`, info);
    // La X lo saca.
    await page.locator('#ad-f-apodos [aria-label="Sacar el apodo Turi"]').click();
    await expect(etiquetas).toHaveCount(antes);
    await sinScroll(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
