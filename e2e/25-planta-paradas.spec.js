// PARÓ Y TERMINÓ DE PRODUCIR (05/10/2026), en la maqueta, a tamaño tablet
// (1000 × 540, la Samsung de Nuss instalada) y a 390 px.
//
// Los cinco casos de Facu, de punta a punta en la pantalla:
//  1. "Empezó a producir 06:40" y verlo en la planilla;
//  2. una parada de 15:00 a 16:00 con motivo;
//  3. una parada que sigue y termina con "Volvió a las…";
//  4. terminar a las 13:10 en un turno de 06 a 15 pide el motivo y lo manda;
//  5. terminar a las 14:50 no pide nada.
// Las horas se escriben con la ventana de la hora (el teclado de la planta).
// Qué se mandó a la base se lee del console.log de la maqueta ("[maqueta] rpc
// nombre parámetros"). La maqueta es fija: lo que la planilla vuelve a leer
// después de guardar se pone en __maquetaTablas antes de tocar Guardar.
//
// El día de la maqueta es 2099-12-31: el reloj va a las 17:00 de Argentina
// de ese día. Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = 'http://localhost:4180';
const TAMANOS = [[1000, 540], [390, 844]];
const AHORA = new Date('2099-12-31T20:00:00Z'); // 17:00 de Argentina

// Las rpc que la planta le pide a la maqueta, [nombre, parámetros].
function anotarRpc(page) {
  const lista = [];
  page.on('console', async (msg) => {
    if (!msg.text().startsWith('[maqueta] rpc')) return;
    try {
      const a = msg.args();
      const nombre = await a[1].jsonValue(), params = await a[2].jsonValue();
      // Desde el 06/10/2026 las cargas de la planta van por la cola, por
      // ejecutar_tablet: se anota la operación de adentro.
      if (nombre === 'ejecutar_tablet') lista.push([params?.p_operacion, params?.p_params]);
      else lista.push([nombre, params]);
    } catch { /* la página se fue */ }
  });
  return lista;
}
const pedidas = (lista, nombre) => lista.filter(([n]) => n === nombre).map(([, p]) => p);

async function entrarALaPlanilla(page, ancho, alto) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.clock.setFixedTime(AHORA);
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
  await page.locator('#pr-quien-lista [data-persona]', { hasText: 'Federico Silva' }).click();
  await marcarPin(page, '4826');
  await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
  await page.locator('[data-producido]').first().click();
  await expect(page.locator('#pr-planilla')).toBeVisible();
  await expect(page.locator('#pr-planilla-producido')).toContainText('7033-1');
}

async function escribirHora(page, numeros) {
  await expect(page.locator('#pr-hora-ventana')).toBeVisible();
  for (const d of numeros) await page.locator(`#pr-hora-ventana [data-hv-tecla="${d}"]`).click();
  await page.locator('#pr-hora-ventana-guardar').click();
}

async function medir(page, nombre, info, problemas) {
  await page.waitForTimeout(150);
  const m = await page.evaluate(`(${medirPantalla.toString()})()`);
  await captura(page, nombre, info);
  if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
  if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
  // La barra de arriba de la planta a 390 px (el recuadro de quién está) ya
  // se salía antes de este cambio: la planta se diseñó para la tablet. Esta
  // prueba mira lo de Paró y Terminó de producir.
  const angosta = (page.viewportSize()?.width ?? 1000) < 600;
  for (const a of m.afuera) if (!(angosta && /pr-lat__quien/.test(a))) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
  for (const c of m.cortadas) problemas.push(`${nombre}: palabra cortada ${c}`);
}

for (const [ancho, alto] of TAMANOS) {
  test(`1 · "Empezó a producir 06:40" y verlo en la planilla, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaPlanilla(page, ancho, alto);
    await expect(page.locator('#pr-aviso-largada')).toBeVisible();
    await expect(page.locator('#pr-aviso-largada')).toContainText('¿A qué hora empezó a producir?');
    await expect(page.locator('#pr-btn-largada')).toContainText('— (cargar hora)');
    await medir(page, `paradas-planilla-${ancho}x${alto}`, info, problemas);
    await page.locator('#pr-btn-largada').click();
    await expect(page.locator('#pr-hora-ventana-titulo')).toHaveText('¿A qué hora empezó a producir?');
    await expect(page.locator('#pr-hora-ventana-hora')).toContainText('17:00');
    await medir(page, `paradas-ventana-hora-${ancho}x${alto}`, info, problemas);
    // Lo que la planilla vuelve a leer después de guardar. (Las filas de la
    // maqueta son los mismos objetos que tiene la pantalla: se cambia recién
    // con la ventana abierta.)
    await page.evaluate(() => { for (const t of globalThis.__maquetaTablas.turnos_produccion) if (t.id === 't1') t.hora_largada = '06:40:00'; });
    await escribirHora(page, '0640');
    await expect.poll(() => pedidas(rpc, 'registrar_hora_largada')).toEqual([{ p_turno_id: 't1', p_hora: '06:40' }]);
    await expect(page.locator('#pr-hora-ventana')).toBeHidden();
    await expect(page.locator('#pr-btn-largada')).toContainText('EMPEZÓ A PRODUCIR');
    await expect(page.locator('#pr-btn-largada')).toContainText('06:40');
    await expect(page.locator('#pr-aviso-largada')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`2 · una parada de 15:00 a 16:00 con motivo, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaPlanilla(page, ancho, alto);
    await page.locator('#pr-planilla-paradas-resumen').click();
    await expect(page.locator('#pr-paradas')).toBeVisible();
    await page.locator('#pr-parada-sugerencias [data-motivo]', { hasText: 'Limpieza de planchas' }).click();
    await page.locator('#pr-parada-hora [data-parada-hora="inicio"]').click();
    await escribirHora(page, '1500');
    await page.locator('#pr-parada-hora [data-parada-hora="fin"]').click();
    await escribirHora(page, '1600');
    await expect(page.locator('#pr-parada-resumen')).toHaveText('Limpieza de planchas · de 15:00 a 16:00 (1 h)');
    await medir(page, `paradas-paro-${ancho}x${alto}`, info, problemas);
    await page.evaluate(() => globalThis.__maquetaTablas.paradas_produccion.push({ id: 'pa-nueva', turno_id: 't1', inicio: '2099-12-31T18:00:00Z', fin: '2099-12-31T19:00:00Z', motivo: 'Limpieza de planchas', motivo_id: 'mp-limp', categoria: 'programada', detalle: null }));
    await page.locator('#pr-btn-guardar-parada').click();
    await expect.poll(() => pedidas(rpc, 'registrar_parada')).toEqual([
      { p_turno_id: 't1', p_motivo: 'Limpieza de planchas', p_inicio: '2099-12-31T15:00:00-03:00', p_fin: '2099-12-31T16:00:00-03:00' },
    ]);
    await page.locator('#pr-btn-ver-paradas').click();
    await expect(page.locator('#pr-planilla-paradas [data-parada-editar="pa-nueva"]')).toContainText('15:00 a 16:00 · 1 h · Limpieza de planchas');
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`3 · una parada que sigue y "Volvió a las…", a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaPlanilla(page, ancho, alto);
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await page.locator('#pr-parada-sugerencias [data-motivo]', { hasText: 'Corte de cadena' }).click();
    await page.locator('#pr-parada-hora [data-parada-hora="inicio"]').click();
    await escribirHora(page, '1530');
    await page.locator('#pr-parada-hora [data-parada-sigue]').click();
    await expect(page.locator('#pr-parada-hora [data-parada-hora="fin"]')).toHaveCount(0);
    await page.evaluate(() => globalThis.__maquetaTablas.paradas_produccion.push({ id: 'pa-sigue', turno_id: 't1', inicio: '2099-12-31T18:30:00Z', fin: null, motivo: 'Corte de cadena', motivo_id: 'mp-cadena', categoria: 'falla', detalle: null }));
    await page.locator('#pr-btn-guardar-parada').click();
    await expect.poll(() => pedidas(rpc, 'registrar_parada')).toEqual([
      { p_turno_id: 't1', p_motivo: 'Corte de cadena', p_inicio: '2099-12-31T15:30:00-03:00', p_fin: null },
    ]);
    await expect(page.locator('#pr-parada-activa')).toBeVisible();
    await expect(page.locator('#pr-btn-reanudar')).toHaveText('Volvió a las…');
    await page.locator('#pr-btn-reanudar').click();
    await expect(page.locator('#pr-hora-ventana-titulo')).toHaveText('¿A qué hora volvió?');
    await medir(page, `paradas-volvio-${ancho}x${alto}`, info, problemas);
    await escribirHora(page, '1620');
    await expect.poll(() => pedidas(rpc, 'editar_parada')).toEqual([
      { p_parada_id: 'pa-sigue', p_motivo: 'Corte de cadena', p_inicio: '2099-12-31T18:30:00Z', p_fin: '2099-12-31T16:20:00-03:00' },
    ]);
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`4 · terminar a las 13:10 (turno de 06 a 15) pide el motivo y lo manda, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaPlanilla(page, ancho, alto);
    await expect(page.locator('#pr-btn-termino')).toContainText('El turno es hasta las 15:00');
    await page.locator('#pr-btn-termino').click();
    await expect(page.locator('#pr-cierre')).toBeVisible();
    await expect(page.locator('#pr-cierre-hora')).toHaveText('Tocá para poner la hora');
    await page.locator('#pr-cierre-hora').click();
    await expect(page.locator('#pr-hora-ventana-titulo')).toHaveText('¿A qué hora terminó de producir?');
    await escribirHora(page, '1310');
    await expect(page.locator('#pr-cierre-campo-motivo')).toBeVisible();
    await expect(page.locator('#pr-cierre-motivo-nota')).toContainText('el turno es hasta las 15:00');
    await page.locator('#pr-cierre-scrap').fill('0');
    await medir(page, `paradas-cierre-antes-${ancho}x${alto}`, info, problemas);
    await page.locator('#pr-cierre-enviar').click();
    await expect(page.locator('#pr-cierre-error')).toContainText('Falta por qué paró antes.');
    expect(pedidas(rpc, 'cerrar_turno')).toEqual([]);
    await page.locator('#pr-cierre-motivos [data-cierre-motivo="mp-personal"]').click();
    await page.locator('#pr-cierre-enviar').click();
    await expect.poll(() => pedidas(rpc, 'cerrar_turno')).toEqual([{
      p_turno_id: 't1', p_hora_apagado: '13:10', p_scrap_kg: 0, p_observaciones: null, p_productos: [],
      p_hora_fin: null, p_motivo_cierre: 'Se retiró personal',
    }]);
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`5 · terminar a las 14:50 no pide nada, a ${ancho}×${alto}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await entrarALaPlanilla(page, ancho, alto);
    await page.locator('#pr-barra [data-seccion="cierre"]').click();
    await page.locator('#pr-cierre-hora').click();
    await escribirHora(page, '1450');
    await expect(page.locator('#pr-cierre-hora')).toHaveText('14:50');
    await expect(page.locator('#pr-cierre-campo-motivo')).toBeHidden();
    await page.locator('#pr-cierre-scrap').fill('2');
    await page.locator('#pr-cierre-enviar').click();
    await expect.poll(() => pedidas(rpc, 'cerrar_turno')).toEqual([{
      p_turno_id: 't1', p_hora_apagado: '14:50', p_scrap_kg: 2, p_observaciones: null, p_productos: [],
      p_hora_fin: null, p_motivo_cierre: null,
    }]);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
