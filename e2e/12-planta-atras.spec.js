// EL "ATRÁS" DE ANDROID NUNCA SACA DE LA PLANTA (29/09/2026).
//
// Caso real: con la app anclada en la tablet, un toque en "atrás" sacaba a
// Android de produccion.html (todo el alcance del manifest) y la tablet
// quedaba en blanco con el logo, clavada. Esta prueba recorre la planta en la
// maqueta (Supabase falso) y en CADA pantalla de los dos modos, en el
// "¿Quién sos?" y en el acceso maestro dispara el "atrás" (page.goBack()) y
// verifica que:
//  - sigue en modulos/produccion.html (no se salió del alcance);
//  - la pantalla no quedó vacía (hay una vista de la planta a la vista);
//  - la ventana o el paso se cerró como corresponde (o, en el Inicio, se
//    quedó donde estaba y dijo cómo salir).
// Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const VISTAS = ['pr-inicio', 'pr-quien', 'pr-acceso', 'pr-asignar', 'pr-produccion', 'pr-abrir', 'pr-abiertos', 'pr-planilla',
  'pr-agregar-prod', 'pr-paradas', 'pr-cierre', 'pr-cerrado', 'pr-sala', 'pr-receta', 'pr-hist-maq', 'pr-masas'];

const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });

async function vistaActual(page) {
  return page.evaluate((ids) => ids.find(id => { const el = document.getElementById(id); return el && !el.hidden }) ?? null, VISTAS);
}

// Un "atrás" y las verificaciones de siempre. Devuelve la vista donde quedó.
async function atras(page, esperada) {
  await page.goBack();
  await page.waitForTimeout(250);
  expect(new URL(page.url()).pathname).toMatch(/\/modulos\/produccion\.html$/);
  const vista = await vistaActual(page);
  expect(vista, 'la pantalla quedó vacía').not.toBeNull();
  await expect(page.locator('#pr-vista')).toBeVisible();
  if (esperada) expect(vista).toBe(esperada);
  return vista;
}

test('el "atrás" nunca saca de la planta y cierra lo que corresponde', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await page.setViewportSize({ width: 1000, height: 540 });
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);

  await test.step('¿Quién sos? — en el inicio no hace nada', async () => {
    await expect(persona(page, 'Federico Silva')).toBeVisible();
    await atras(page, 'pr-quien');
    await expect(page.locator('.toast').last()).toContainText('Para salir, usá Salir');
    // Dos seguidos tampoco sacan.
    await atras(page, 'pr-quien');
  });

  await test.step('la ventana del PIN se cierra', async () => {
    await persona(page, 'Federico Silva').click();
    await expect(page.locator('#pr-pin')).toBeVisible();
    await atras(page, 'pr-quien');
    await expect(page.locator('#pr-pin')).toBeHidden();
  });

  await test.step('el PIN maestro se cierra', async () => {
    await page.locator('#pr-btn-maestro').click();
    await expect(page.locator('#pr-pin')).toBeVisible();
    await atras(page, 'pr-quien');
    await expect(page.locator('#pr-pin')).toBeHidden();
  });

  await test.step('entrar a Producción', async () => {
    await persona(page, 'Federico Silva').click();
    await marcarPin(page, '4826');
    await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
  });

  await test.step('Inicio de Producción — no hace nada', async () => {
    await expect(page.locator('#pr-produccion')).toBeVisible();
    await atras(page, 'pr-produccion');
  });

  await test.step('Abrir turno → Inicio', async () => {
    await page.locator('#pr-barra [data-seccion="abrir"]').click();
    await expect(page.locator('#pr-abrir')).toBeVisible();
    await atras(page, 'pr-produccion');
  });

  await test.step('Planilla → Inicio', async () => {
    await page.locator('[data-producido]').first().click();
    await expect(page.locator('#pr-planilla')).toBeVisible();
    await atras(page, 'pr-produccion');
  });

  await test.step('Agregar producto: cada paso vuelve al anterior, el primero a la planilla', async () => {
    await page.locator('[data-producido]').first().click();
    await page.locator('#pr-btn-agregar-producto').click();
    await expect(page.locator('#pr-agregar-prod')).toBeVisible();
    await page.locator('[data-ag-producto]').first().click();
    await expect(page.locator('#pr-agregar-cono')).toBeVisible();
    await page.locator('#pr-agregar-marcas [data-marca]').nth(2).click();
    await expect(page.locator('[data-ag-presentacion]').first()).toBeVisible();
    const paso = () => page.evaluate(() => document.querySelector('#pr-agregar-prod [aria-current="step"]')?.textContent ?? '');
    const antes = await paso();
    await atras(page, 'pr-agregar-prod');
    expect(await paso()).not.toBe(antes);
    // Hasta el primero y de ahí a la planilla.
    for (let i = 0; i < 6 && (await vistaActual(page)) === 'pr-agregar-prod'; i++) await atras(page);
    expect(await vistaActual(page)).toBe('pr-planilla');
  });

  await test.step('Paradas → Inicio, Cerrar planilla → Inicio', async () => {
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await expect(page.locator('#pr-paradas')).toBeVisible();
    await atras(page, 'pr-produccion');
    await page.locator('[data-producido]').first().click();
    await page.locator('#pr-barra [data-seccion="cierre"]').click();
    await expect(page.locator('#pr-cierre')).toBeVisible();
    await atras(page, 'pr-produccion');
  });

  await test.step('pasar a Sala de masa', async () => {
    await page.locator('#pr-barra [data-modo="masa"]').click();
    await persona(page, 'Agustín Barrera').click();
    await marcarPin(page, '7391');
    await expect(page.locator('#pr-sala')).toBeVisible();
  });

  await test.step('Sala — en el inicio no hace nada', async () => {
    await atras(page, 'pr-sala');
  });

  await test.step('la ventana de lotes se cierra, y la receta vuelve a la sala', async () => {
    await page.locator('[data-sala-turno="t1"]').first().click();
    await expect(page.locator('#pr-receta')).toBeVisible();
    await page.locator('#pr-receta-opciones [data-base="modificar"]').click();
    await page.locator('[data-lote="i-harina"]').first().click();
    await expect(page.locator('#pr-lote-panel')).toBeVisible();
    await atras(page, 'pr-receta');
    await expect(page.locator('#pr-lote-panel')).toBeHidden();
    await atras(page, 'pr-sala');
  });

  await test.step('el historial de una máquina vuelve a la sala', async () => {
    await page.locator('[data-lateral-turno]').first().click();
    await expect(page.locator('#pr-hist-maq')).toBeVisible();
    await atras(page, 'pr-sala');
  });

  expect(errores, errores.join('\n')).toEqual([]);
});

test('el acceso maestro: el "atrás" no lo saca de la planta', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  await page.setViewportSize({ width: 1000, height: 540 });
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
  await expect(persona(page, 'Federico Silva')).toBeVisible();
  // La maqueta acepta cualquier PIN maestro (verificar_pin_maestro → ok) y
  // tiene un solo maestro (Marta Jefa): no hay que elegirlo.
  await page.locator('#pr-btn-maestro').click();
  await marcarPin(page, '12345678');
  await expect(page.locator('#pr-acceso')).toBeVisible();
  await atras(page, 'pr-acceso');
  await expect(page.locator('.toast').last()).toContainText('acceso maestro');
  // Asignar PIN → la pantalla del maestro; con una persona elegida, se suelta.
  await page.locator('#pr-acceso [data-maestro-tab="asignar"]').click();
  await expect(page.locator('#pr-asignar')).toBeVisible();
  const alguien = page.locator('#pr-asignar [data-asignar-persona]').first();
  if (await alguien.count()) {
    await alguien.click();
    await expect(page.locator('#pr-asignar-panel')).toBeVisible();
    await atras(page, 'pr-asignar');
    await expect(page.locator('#pr-asignar-panel')).toBeHidden();
  }
  await atras(page, 'pr-acceso');
  expect(errores, errores.join('\n')).toEqual([]);
});
