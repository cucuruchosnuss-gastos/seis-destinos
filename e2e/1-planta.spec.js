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
  // Planta v2: sin tecla "Entrar", con el último número se manda solo.
  for (const d of pin) await teclado.locator(`[data-tecla="${d}"]`).click();
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
      // Sin nadie adentro: "¿Quién sos?" de Producción a pantalla completa,
      // con su banda y sin la barra lateral.
      await expect(page.locator('#pr-quien')).toBeVisible();
      await expect(page.locator('#pr-quien-banda')).toContainText('PRODUCCIÓN');
      await expect(page.locator('#pr-barra')).toBeHidden();
      await captura(page, 'planta-inicio', info);
    });

    await test.step('Producción: Robot Encargado con su PIN', async () => {
      await elegirPersona(page, 'Robot Encargado');
      await captura(page, 'quien-sos-encargado', info);
      await marcarPin(page, PIN_ENCARGADO);
      await expect(page.locator('#pr-barra')).toContainText('Robot Encargado');
      await expect(page.locator('#pr-barra [data-seccion="abrir"]')).toBeVisible();
      await captura(page, 'tablero-vacio', info);
    });

    let lote;
    await test.step('abrir turno en la Máquina robot con un operario', async () => {
      // Planta v2: "Abrir turno" es una sección de la barra; cada máquina es
      // un chip y sus operarios se eligen en la tarjeta de al lado.
      await page.locator('#pr-barra [data-seccion="abrir"]').click();
      await expect(page.locator('#pr-abrir')).toBeVisible();
      await page.locator('#pr-abrir-turnos [data-turno="Mañana"]').click();
      const maquina = page.locator('#pr-abrir [data-abrir-maquina]', { hasText: 'Máquina robot' });
      if ((await maquina.getAttribute('aria-pressed')) !== 'true') await maquina.click();
      const ops = page.locator('#pr-abrir .pr-abrir-ops');
      await ops.locator('[data-toggle-op]', { hasText: 'Robot Masero' }).click();
      await expect(ops.locator('[data-toggle-op][aria-pressed="true"]', { hasText: 'Robot Masero' })).toBeVisible();
      await captura(page, 'abrir-turno', info);
      await page.locator('#pr-abrir-confirmar').click();
      await expect(page.locator('#pr-abiertos')).toBeVisible();
      const texto = await page.locator('#pr-abiertos-lista').innerText();
      lote = (texto.match(/\b9\d{5,}\b/) || [])[0];
      expect(lote, `el lote de la fábrica de pruebas arranca en 900001: "${texto}"`).toBeTruthy();
      expect(Number(lote)).toBeGreaterThanOrEqual(900001);
      await captura(page, 'lote-asignado', info);
      await page.locator('#pr-abiertos-volver').click();
      // La tarjeta andando lleva a Lo producido (data-producido).
      await expect(page.locator('#pr-tablero [data-producido]', { hasText: 'Máquina robot' })).toContainText(lote);
    });

    await test.step('Sala de masa: Robot Masero con su PIN', async () => {
      const sala = page.locator('#pr-barra [data-modo="masa"]');
      await expect(sala).toBeEnabled();
      await sala.click();
      // Robot Encargado también es masero: entra sin PIN. Para que la masa
      // quede a nombre de Robot Masero, "Cambiar de persona".
      if (await page.locator('#pr-lat-cambiar').isVisible().catch(() => false)) await page.locator('#pr-lat-cambiar').click();
      await elegirPersona(page, 'Robot Masero');
      await marcarPin(page, PIN_MASERO);
      await expect(page.locator('#pr-barra')).toContainText('Robot Masero');
      // Con una sola máquina abierta lleva derecho a su masa nueva (4b).
      await expect(page.locator('#pr-receta')).toBeVisible();
      await expect(page.locator('#pr-cab')).toContainText('Máquina robot');
      await captura(page, 'sala', info);
    });

    await test.step('primera masa: con los lotes vacíos no deja registrar', async () => {
      // Arriba de la receta: Simple y Original (sin anterior de hoy, ya viene).
      await page.locator('#pr-receta-opciones [data-doble="no"]').click();
      await page.locator('#pr-receta-opciones [data-base="original"]').click();
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
        // Stock vacío en la fábrica de pruebas: la ventana abre directo con el
        // campo para escribir el lote (Parte 0, 28/09/2026); si hay lotes, el
        // link "El lote no está en la lista: escribirlo" lo abre.
        if (!(await page.locator('#pr-lote-panel-escribir').count())) {
          await page.locator('#pr-lote-panel-otros [data-lote-escribir]').click();
        }
        await page.locator(`#pr-lote-panel-escribir[data-lote-manual="${ing}"]`).fill(`ROBOT-${vueltas}`);
        await page.locator('#pr-lote-panel-usar').click();
      }
      await captura(page, 'masa-con-lotes', info);
      await page.locator('#pr-receta-registrar').click();
      await expect(page.locator('#pr-sala-exito')).toBeVisible();
      await expect(page.locator('#pr-sala-exito-titulo')).toContainText(/masa/i);
      // Registrar deja lista la masa SIGUIENTE de la misma máquina.
      await expect(page.locator('#pr-receta')).toBeVisible();
      await expect(page.locator('#pr-receta-masas')).toContainText(/Masas del turno/);
      await captura(page, 'masa-registrada', info);
    });

    await test.step('volver a Producción sin perder al masero', async () => {
      await page.locator('#pr-barra [data-modo="produccion"]').click();
      await elegirPersona(page, 'Robot Encargado');
      await marcarPin(page, PIN_ENCARGADO);
      await expect(page.locator('#pr-tablero-masero')).toContainText('Robot Masero');
      await captura(page, 'tablero-con-masero', info);
    });

    await test.step('cargar lo producido con su caja', async () => {
      // Tocar la máquina la elige y lleva a su planilla; "+ Agregar producto".
      await page.locator('#pr-tablero [data-producido]', { hasText: 'Máquina robot' }).click();
      await expect(page.locator('#pr-planilla')).toBeVisible();
      await page.locator('#pr-btn-agregar-producto').click();
      await expect(page.locator('#pr-agregar-prod')).toBeVisible();
      await page.locator('[data-ag-producto]', { hasText: 'Cucuruchón Mini' }).click();
      await page.locator('#pr-agregar-sin-cono').click();
      const pres = page.locator('[data-ag-presentacion]').first();
      if (await pres.isVisible().catch(() => false)) await pres.click();
      // Tocar una caja la elige y pasa sola a las cajas; sin cajas
      // configuradas queda "Seguir con las cajas".
      const caja = page.locator('[data-ag-caja]').first();
      if (await caja.isVisible().catch(() => false)) await caja.click();
      const seguir = page.locator('[data-ag-seguir]');
      if (await seguir.isVisible().catch(() => false)) await seguir.click();
      await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
      await page.locator('#pr-agregar-cajas').fill('3');
      await expect(page.locator('#pr-agregar-empaque')).toContainText('Caja');
      await captura(page, 'agregar-producido', info);
      await page.locator('#pr-agregar-confirmar').click();
      await expect(page.locator('#pr-cab')).toContainText(lote);
      await expect(page.locator('#pr-planilla-masas')).toContainText(/simple/i);
      await expect(page.locator('#pr-planilla-producido')).toContainText(`${lote}-1`);
      await expect(page.locator('#pr-planilla-producido')).toContainText('Caja');
      await captura(page, 'planilla-producido', info);
    });

    await test.step('anotar una parada con horarios', async () => {
      await page.locator('#pr-barra [data-seccion="paradas"]').click();
      await expect(page.locator('#pr-paradas')).toBeVisible();
      await page.locator('#pr-btn-anotar-parada').click();
      await expect(page.locator('#pr-parada-editor')).toBeVisible();
      await page.locator('#pr-parada-editor-motivo').fill('Parada del robot de pruebas');
      await captura(page, 'parada-editor', info);
      await page.locator('#pr-parada-editor-guardar').click();
      await expect(page.locator('#pr-parada-editor')).toBeHidden();
      await expect(page.locator('#pr-planilla-paradas')).toContainText('Parada del robot de pruebas');
    });

    await test.step('cerrar la planilla', async () => {
      await page.locator('#pr-barra [data-seccion="cierre"]').click();
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
    await expect(page.locator('#pr-quien')).toBeVisible();

    await page.locator('#pr-btn-maestro').click();
    const elegir = page.locator('[data-maestro]', { hasText: process.env.E2E_MAESTRO_NOMBRE });
    if (await elegir.count()) await elegir.first().click();
    await marcarPin(page, process.env.E2E_MAESTRO_PIN);
    // Planta v2: el acceso maestro abre su propia pantalla, con la pestaña
    // "Asignar PIN".
    await expect(page.locator('#pr-acceso')).toBeVisible();
    await page.locator('#pr-acceso [data-maestro-tab="asignar"]').click();
    await expect(page.locator('#pr-asignar')).toBeVisible();
    const robot = page.locator('#pr-asignar-personas [data-asignar-persona]', { hasText: 'Robot Masero' });
    await expect(robot).toContainText(/PIN propio|Pendiente de cambiar|PIN de un día|Sin PIN/);
    await captura(page, 'asignar-pin-lista', info);
    await robot.click();
    for (const d of '1234') await page.locator(`#pr-asignar-teclado [data-asignar-tecla="${d}"]`).click();
    // Los dígitos no se muestran: solo los puntos.
    await expect(page.locator('#pr-asignar')).not.toContainText('1234');
    // El PIN nuevo se carga DOS veces: "Seguir" y después "Guardar el PIN".
    await expect(page.locator('#pr-asignar-confirmar')).toHaveText('Seguir');
    await page.locator('#pr-asignar-confirmar').click();
    await expect(page.locator('#pr-asignar-paso')).toContainText('de nuevo');
    for (const d of '1234') await page.locator(`#pr-asignar-teclado [data-asignar-tecla="${d}"]`).click();
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
