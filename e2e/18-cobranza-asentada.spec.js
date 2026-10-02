// La cobranza YA ASENTADA (01/10/2026) y el ingreso externo de Caja, en la
// maqueta: quien controla las cobranzas elige primero la empresa y después un
// cliente de esa empresa; en Caja, "Ingreso externo (préstamos, aportes)" para
// un super_admin y los ajustes de saldo en gris. A 390 y 1280 px, sin scroll
// horizontal ni errores. Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';

for (const ancho of [390, 1280]) {
  test(`cobranza ya asentada: empresa y después sus clientes, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.locator('#cob-btn-nueva').click();
    await expect(page.locator('#cob-asentar')).toBeVisible();
    await expect(page.locator('#cob-campo-cliente-libre')).toBeHidden();
    const empresas = page.locator('#cob-empresas [data-empresa]');
    await expect(empresas).toHaveCount(2);
    await expect(page.locator('#cob-empresas')).not.toContainText('Pruebas');
    await expect(page.locator('#cob-btn-guardar')).toHaveText('Guardar y asentar');
    // Dolce Pasta: solo sus clientes.
    await page.locator('#cob-empresas [data-empresa="u-d"]').click();
    await expect(page.locator('#cob-empresas [data-empresa="u-d"]')).toHaveAttribute('aria-pressed', 'true');
    const clientes = page.locator('#cob-lista-clientes [data-cliente-id]');
    await expect(clientes).toHaveCount(2);
    await expect(page.locator('#cob-lista-clientes')).not.toContainText('Laponia');
    await captura(page, `cobranza-asentada-clientes-${ancho}`, info);
    await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-d"]').click();
    await expect(page.locator('#cob-lista-clientes')).toContainText('J&M');
    await expect(page.locator('#cob-asentar-buscar')).toBeHidden();
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `cobranza-asentada-elegido-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// "¿De qué empresa es la cobranza?" (02/10/2026): la empresa NO viene marcada
// aunque la barra tenga una, y elegirla pasa la barra de arriba a esa.
test('cobranza ya asentada: con la barra en Nuss la empresa NO viene marcada, y elegir Dolce pasa la barra a Dolce', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
  await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
  await page.reload();
  await page.locator('#cob-btn-nueva').click();
  await expect(page.locator('#cob-rotulo-empresa')).toContainText('¿De qué empresa es la cobranza?');
  await expect(page.locator('#cob-empresas [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#cob-lista-clientes [data-cliente-id]')).toHaveCount(0);
  await page.locator('#cob-empresas [data-empresa="u-d"]').click();
  await expect(page.locator('#cob-empresas [data-empresa="u-d"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('barraUnidad.elegida'))).toBe('u-d');
  await expect(page.locator('.barra-unidad__chip[data-unidad="u-d"]').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-d"]')).toBeVisible();
  await expect(page.locator('#cob-lista-clientes [data-cliente-id="cli-lap-n"]')).toHaveCount(0);
  expect(errores, errores.join('\n')).toEqual([]);
});

// "¿Cómo pagó?" (02/10/2026): cuatro botones grandes; cada uno abre su sección.
// Un PNG mínimo y válido (1×1) para que comprimirFoto lo pueda leer.
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

for (const ancho of [390, 1280]) {
  test(`cobranza: "¿Cómo pagó?" con los cuatro botones, una transferencia leída y corregida, y un PDF de más de 10 MB, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.locator('#cob-btn-nueva').click();
    await page.locator('#cob-empresas [data-empresa="u-d"]').click();
    await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-d"]').click();
    const botones = page.locator('#cob-formas-botones [data-abrir-forma]:visible');
    await expect(botones).toHaveCount(4);
    await expect(page.locator('#cob-rotulo-como-pago')).toHaveText('¿Cómo pagó?');
    // Ninguna sección abierta hasta tocar su botón.
    await expect(page.locator('#cob-seccion-efectivo')).toBeHidden();
    await expect(page.locator('#cob-seccion-transferencias')).toBeHidden();
    await page.locator('[data-abrir-forma="efectivo"]').click();
    await expect(page.locator('#cob-seccion-efectivo')).toBeVisible();
    await page.locator('[data-abrir-forma="cheque"]').click();
    await expect(page.locator('#cob-seccion-cheques')).toBeVisible();
    await expect(page.locator('#cob-btn-archivo-cheque')).toBeVisible();
    await page.locator('[data-abrir-forma="transferencia"]').click();
    await expect(page.locator('#cob-seccion-transferencias')).toBeVisible();
    // Una abierta y vacía se cierra al tocarla otra vez.
    await page.locator('[data-abrir-forma="efectivo"]').click();
    await expect(page.locator('#cob-seccion-efectivo')).toBeHidden();

    // La captura de una transferencia: el lector propone y se marca "leído".
    const [elegir] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#cob-seccion-transferencias [data-subir-comprobante="transferencia"][data-origen="galeria"]').click(),
    ]);
    await elegir.setFiles({ name: 'transferencia.png', mimeType: 'image/png', buffer: PNG_1x1 });
    const tarjeta = page.locator('#cob-lista-transferencias [data-transf]').first();
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator('[data-transf-campo="importe"]')).toHaveValue('150.000');
    await expect(tarjeta.locator('[data-transf-origen]')).toHaveText('Leído del comprobante: revisalo antes de guardar.');
    // La cuenta propia: solo las de Dolce Pasta.
    const cuentas = tarjeta.locator('select[data-transf-campo="cuenta_id"] option');
    await expect(cuentas.filter({ hasText: 'Dolce' })).toHaveCount(1);
    await expect(cuentas.filter({ hasText: 'Nuss' })).toHaveCount(0);
    // Corregir el importe la marca como corregida.
    await tarjeta.locator('[data-transf-campo="importe"]').fill('140000');
    await tarjeta.locator('[data-transf-campo="importe"]').blur();
    await expect(tarjeta.locator('[data-transf-origen]')).toHaveText('Leído del comprobante y corregido.');

    // Un PDF de más de 10 MB: avisa y no se sube.
    const antes = await page.locator('#cob-comprobantes-transferencia [data-ver-comprobante]').count();
    const [elegirPdf] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#cob-seccion-transferencias [data-subir-comprobante="transferencia"][data-origen="archivo"]').click(),
    ]);
    await elegirPdf.setFiles({ name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(11 * 1024 * 1024, 0x20) });
    await expect(page.locator('.toast').last()).toContainText('el máximo es 10 MB: no se subió');
    await expect(page.locator('#cob-comprobantes-transferencia [data-ver-comprobante]')).toHaveCount(antes);

    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `cobranza-como-pago-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`cobranza: el chofer ve solo Efectivo y Cheque, sin "Cargar a mano", a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.evaluate(() => sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: {
      empleado_tareas: [{ empleado_id: 'emp-cob', modulo: 'cobranzas', tarea: 'cargar', habilitado: true, alcance: null }],
    } })));
    await page.reload();
    await page.locator('#cob-btn-nueva').click();
    await expect(page.locator('#cob-asentar')).toBeHidden();
    await expect(page.locator('#cob-campo-cliente-libre')).toBeVisible();
    await expect(page.locator('#cob-formas-botones [data-abrir-forma]:visible')).toHaveCount(2);
    await expect(page.locator('[data-abrir-forma="echeque"]')).toBeHidden();
    await expect(page.locator('[data-abrir-forma="transferencia"]')).toBeHidden();
    await page.locator('[data-abrir-forma="cheque"]').click();
    await expect(page.locator('#cob-btn-cheque-mano')).not.toHaveText('✎ Cargar a mano');
    await expect(page.locator('#cob-btn-cheque-mano')).toBeDisabled();
    await expect(page.locator('#cob-seccion-cheques')).not.toContainText('Cargar a mano');
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `cobranza-chofer-${ancho}`, info);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// Caja con una empresa elegida arriba (01/10/2026): la ficha de Empresa
// muestra TODO lo de esa empresa, salga de la caja que salga.
for (const ancho of [390, 1280]) {
  test(`caja: con Nuss arriba aparece el gasto de Nuss pagado desde la caja de Beto; con Dolce no (${ancho} px)`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/caja.html?maqueta=caja`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    await page.locator('#btn-empresa-atajo').first().click();
    const lista = page.locator('#detalle-persona-movimientos');
    await expect(lista).toContainText('Repuesto de la máquina de Nuss');
    await expect(lista.locator('.tarjeta-movimiento', { hasText: 'Repuesto de la máquina de Nuss' })).toContainText('Beto Dolce');
    await expect(page.locator('#detalle-persona-totales')).toContainText('Entradas y salidas');
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `caja-empresa-nuss-${ancho}`, info);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-d'));
    await page.reload();
    await page.locator('#btn-empresa-atajo').first().click();
    await expect(page.locator('#detalle-persona-totales')).toContainText('Dolce Pasta');
    await expect(lista).not.toContainText('Repuesto de la máquina de Nuss');
    await expect(lista).toContainText('Depósito');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

for (const ancho of [390, 1280]) {
  test(`caja: ingreso externo para super_admin y el ajuste en gris, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/caja.html?maqueta=caja`);
    await page.locator('#btn-empresa-atajo').first().click();
    const boton = page.locator('#btn-detalle-ingreso-externo');
    await expect(boton).toHaveText('Ingreso externo (préstamos, aportes)');
    const ajuste = page.locator('.tarjeta-movimiento--ajuste');
    await expect(ajuste).toHaveCount(1);
    await expect(ajuste).toContainText('Ajuste');
    await expect(ajuste).toContainText('Diferencia del arqueo de septiembre');
    await expect(ajuste).toContainText('no se edita ni se borra');
    await boton.click();
    await expect(page.locator('#movimiento-titulo')).toHaveText('Ingreso externo (préstamos, aportes)');
    await expect(page.locator('#aviso-ingreso-cliente')).toHaveText('La plata de un cliente se carga en Cobranzas');
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `caja-ingreso-externo-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
