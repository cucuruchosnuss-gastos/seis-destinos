// El recorrido de la PLANTA en 1280×800, con la cuenta de la tablet del robot,
// en la fábrica de pruebas "Pruebas (robot)". En cada paso se verifica lo que
// la pantalla MUESTRA, no solo que no haya errores.
const { test, expect } = require('@playwright/test');
const { avisoSinCredenciales, entrarComo, sesionDelRobot, limpiarFabrica, vigilarErrores, captura } = require('./ayuda');

const PIN_ENCARGADO = '4826'; // "Robot Encargado": encargado, masero y operario
const PIN_MASERO = '7391';    // "Robot Masero": masero y operario

test.use({ viewport: { width: 1280, height: 800 } });

async function marcarPin(page, pin) {
  const teclado = page.locator('#pr-pin-teclado');
  await expect(teclado).toBeVisible();
  for (const d of pin) await teclado.locator(`[data-tecla="${d}"]`).click();
  await teclado.locator('[data-tecla="entrar"]').click();
}

async function elegirPersona(page, nombre) {
  // "¿Quién sos?" con la lista; si ya hay una persona fija en ese modo, pide solo el PIN.
  const fija = page.locator('#pr-quien-fija');
  if (await fija.isVisible().catch(() => false)) {
    await expect(fija).toContainText(nombre);
    return;
  }
  await page.locator('#pr-quien-lista [data-persona]', { hasText: nombre }).click();
}

test.describe('planta', () => {
  test.skip(!!avisoSinCredenciales('planta') || !!avisoSinCredenciales('gestion'),
    avisoSinCredenciales('planta') || avisoSinCredenciales('gestion'));

  let gestion;
  test.beforeAll(async () => {
    gestion = await sesionDelRobot('gestion');
    console.log('limpieza antes:', JSON.stringify(await limpiarFabrica(gestion)));
  });
  // La limpieza de DESPUÉS la hace 2-gestion.spec.js, que corre a continuación
  // y tiene que encontrar en el historial el turno que se cerró acá.

  test('turno completo: abrir, masa, producido, parada y cierre', async ({ page, context }, info) => {
    const errores = vigilarErrores(page);
    await entrarComo(context, 'planta');

    await test.step('la cuenta de la tablet entra derecho a la planta', async () => {
      await page.goto('/dashboard.html');
      await page.waitForURL(/modulos\/produccion\.html/);
      await expect(page.locator('#pr-barra')).toBeVisible();
      await captura(page, 'planta-inicio', info);
    });

    await test.step('Producción: Robot Encargado con su PIN', async () => {
      await page.locator('[data-modo="produccion"]').click();
      if (await page.locator('#pr-btn-entrar').isVisible().catch(() => false)) await page.locator('#pr-btn-entrar').click();
      await elegirPersona(page, 'Robot Encargado');
      await captura(page, 'quien-sos-encargado', info);
      await marcarPin(page, PIN_ENCARGADO);
      await expect(page.locator('#pr-barra')).toContainText('Robot Encargado');
      await expect(page.locator('#pr-btn-abrir-turno')).toBeVisible();
      await captura(page, 'tablero-vacio', info);
    });

    let lote;
    await test.step('abrir turno en la Máquina robot con un operario', async () => {
      await page.locator('#pr-btn-abrir-turno').click();
      await expect(page.locator('#pr-abrir')).toBeVisible();
      await page.locator('#pr-abrir-turnos [data-turno="Mañana"]').click();
      const fila = page.locator('.pr-abrir-fila', { hasText: 'Máquina robot' });
      await fila.locator('[data-abrir-maquina]').check();
      await fila.locator('[data-mas-operario]').click();
      await fila.locator('[data-elegir-op]', { hasText: 'Robot Masero' }).click();
      await expect(fila.locator('.pr-chip-op', { hasText: 'Robot Masero' })).toBeVisible();
      await captura(page, 'abrir-turno', info);
      await page.locator('#pr-abrir-confirmar').click();
      await expect(page.locator('#pr-abiertos')).toBeVisible();
      const texto = await page.locator('#pr-abiertos-lista').innerText();
      lote = (texto.match(/\b9\d{5,}\b/) || [])[0];
      expect(lote, `el lote de la fábrica de pruebas arranca en 900001: "${texto}"`).toBeTruthy();
      expect(Number(lote)).toBeGreaterThanOrEqual(900001);
      await captura(page, 'lote-asignado', info);
      await page.locator('#pr-abiertos-volver').click();
      await expect(page.locator('#pr-tablero [data-planilla]', { hasText: 'Máquina robot' })).toContainText(lote);
    });

    await test.step('Sala de masa: Robot Masero con su PIN', async () => {
      const sala = page.locator('[data-modo="masa"]');
      await expect(sala).toBeEnabled();
      await sala.click();
      await elegirPersona(page, 'Robot Masero');
      await marcarPin(page, PIN_MASERO);
      await expect(page.locator('#pr-barra')).toContainText('Robot Masero');
      // Con una sola máquina abierta lleva derecho a ella.
      await expect(page.locator('#pr-sala')).toBeVisible();
      await captura(page, 'sala', info);
    });

    await test.step('primera masa: con los lotes vacíos no deja registrar', async () => {
      const simple = page.locator('[data-doble="no"]');
      if (await simple.isVisible().catch(() => false)) await simple.click();
      await page.locator('[data-base="original"]').click();
      await expect(page.locator('#pr-receta')).toBeVisible();
      const vacios = page.locator('#pr-receta-filas [data-lote].pr-rec__lote--vacio');
      expect(await vacios.count(), 'la primera masa del día tiene que llegar con lotes vacíos').toBeGreaterThan(0);
      await page.locator('#pr-receta-registrar').click();
      await expect(page.locator('#pr-sala-exito')).toBeHidden();
      await expect(page.locator('#pr-receta')).toContainText(/lote/i);
      await captura(page, 'masa-sin-lotes', info);
    });

    await test.step('cargar los lotes y registrar la masa', async () => {
      const vacios = page.locator('#pr-receta-filas [data-lote].pr-rec__lote--vacio');
      let vueltas = 0;
      while (await vacios.count() && vueltas++ < 20) {
        const boton = vacios.first();
        const ing = await boton.getAttribute('data-lote');
        await boton.click();
        await expect(page.locator('#pr-lote-panel')).toBeVisible();
        // Stock vacío en la fábrica de pruebas: "Otro lote de este insumo".
        await page.locator('#pr-lote-panel-otros [data-lote-op]').first().click();
        await page.locator(`[data-lote-manual="${ing}"]`).fill(`ROBOT-${vueltas}`);
      }
      await captura(page, 'masa-con-lotes', info);
      await page.locator('#pr-receta-registrar').click();
      await expect(page.locator('#pr-sala-exito')).toBeVisible();
      await expect(page.locator('#pr-sala-exito-titulo')).toContainText(/masa/i);
      await captura(page, 'masa-registrada', info);
    });

    await test.step('volver a Producción sin perder al masero', async () => {
      await page.locator('[data-modo="produccion"]').click();
      await elegirPersona(page, 'Robot Encargado');
      await marcarPin(page, PIN_ENCARGADO);
      await expect(page.locator('#pr-tablero-masero')).toContainText('Robot Masero');
      await captura(page, 'tablero-con-masero', info);
    });

    await test.step('cargar lo producido con su caja', async () => {
      await page.locator('#pr-tablero [data-planilla]', { hasText: 'Máquina robot' }).click();
      await expect(page.locator('#pr-planilla-lote')).toContainText(lote);
      await expect(page.locator('#pr-planilla-masas')).toContainText(/simple/i);
      await page.locator('#pr-btn-agregar-producto').click();
      await page.locator('[data-ag-producto]', { hasText: 'Cucuruchón Mini' }).click();
      await page.locator('[data-ag-cono="0"]').click();
      const pres = page.locator('[data-ag-presentacion]').first();
      if (await pres.isVisible().catch(() => false)) await pres.click();
      const seguir = page.locator('[data-ag-seguir]');
      if (await seguir.isVisible().catch(() => false)) await seguir.click();
      await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
      await page.locator('#pr-agregar-cajas').fill('3');
      await expect(page.locator('#pr-agregar-empaque')).toContainText('Caja');
      await captura(page, 'agregar-producido', info);
      await page.locator('#pr-agregar-confirmar').click();
      await expect(page.locator('#pr-planilla-producido')).toContainText(`${lote}-1`);
      await expect(page.locator('#pr-planilla-producido')).toContainText('Caja');
      await captura(page, 'planilla-producido', info);
    });

    await test.step('anotar una parada con horarios', async () => {
      await page.locator('#pr-btn-anotar-parada').click();
      await expect(page.locator('#pr-parada-editor')).toBeVisible();
      await page.locator('#pr-parada-editor-motivo').fill('Parada del robot de pruebas');
      await captura(page, 'parada-editor', info);
      await page.locator('#pr-parada-editor-guardar').click();
      await expect(page.locator('#pr-parada-editor')).toBeHidden();
      await expect(page.locator('#pr-planilla-paradas')).toContainText('Parada del robot de pruebas');
    });

    await test.step('cerrar la planilla', async () => {
      await page.locator('#pr-btn-cerrar-planilla').click();
      await expect(page.locator('#pr-cierre')).toBeVisible();
      await page.locator('#pr-cierre-scrap').fill('2');
      await captura(page, 'cierre', info);
      await page.locator('#pr-cierre-enviar').click();
      const confirmar = page.locator('#pr-cierre-confirmar-si');
      if (await confirmar.isVisible().catch(() => false)) await confirmar.click();
      await expect(page.locator('#pr-cerrado')).toBeVisible();
      await expect(page.locator('#pr-cerrado-lista')).toContainText(`${lote}-1`);
      await captura(page, 'planilla-cerrada', info);
      require('fs').mkdirSync(require('path').join(__dirname, 'resultados'), { recursive: true })
      require('fs').writeFileSync(require('path').join(__dirname, 'resultados', 'ultimo-lote.txt'), lote)
    });

    expect(errores, errores.join('\n')).toEqual([]);
  });

  // "Asignar PIN" con el acceso maestro. NO cambia ningún PIN: intenta 1234,
  // que la base rechaza DESPUÉS de verificar el maestro (asignar_pin_con_maestro
  // verifica el maestro primero y el PIN obvio después), así que el recorrido
  // prueba la cadena entera sin tocar datos. Necesita un maestro: los secretos
  // opcionales E2E_MAESTRO_NOMBRE y E2E_MAESTRO_PIN (8 dígitos).
  test('asignar PIN con el acceso maestro (sin cambiar nada)', async ({ page, context }, info) => {
    test.skip(!process.env.E2E_MAESTRO_NOMBRE || !process.env.E2E_MAESTRO_PIN,
      'Faltan E2E_MAESTRO_NOMBRE y E2E_MAESTRO_PIN: se saltea el paso de Asignar PIN.');
    const errores = vigilarErrores(page);
    await entrarComo(context, 'planta');
    await page.goto('/modulos/produccion.html');
    await expect(page.locator('#pr-barra')).toBeVisible();

    await page.locator('#pr-btn-barra-maestro, #pr-btn-maestro').first().click();
    const elegir = page.locator('[data-maestro]', { hasText: process.env.E2E_MAESTRO_NOMBRE });
    if (await elegir.count()) await elegir.first().click();
    await marcarPin(page, process.env.E2E_MAESTRO_PIN);
    await expect(page.locator('#pr-maestro')).toBeVisible();

    await page.locator('#pr-btn-asignar-pin').click();
    await expect(page.locator('#pr-asignar')).toBeVisible();
    const robot = page.locator('#pr-asignar-personas [data-asignar-persona]', { hasText: 'Robot Masero' });
    await expect(robot).toContainText(/PIN propio|Pendiente de cambiar|PIN de un día|Sin PIN/);
    await captura(page, 'asignar-pin-lista', info);
    await robot.click();
    for (const d of '1234') await page.locator(`#pr-asignar-teclado [data-asignar-tecla="${d}"]`).click();
    // Los dígitos no se muestran: solo los puntos.
    await expect(page.locator('#pr-asignar')).not.toContainText('1234');
    await page.locator('#pr-asignar-confirmar').click();
    await expect(page.locator('#pr-asignar-error')).toContainText('no tan obvio');
    await captura(page, 'asignar-pin-rechazado', info);
    const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(guardado).not.toContain('1234');
    await page.locator('#pr-btn-cerrar-maestro').click();
    await expect(page.locator('#pr-maestro')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
});
