// EL "LOTE NUEVO" POR ERROR EN LA TABLET (pedido del 14/10/2026), en la
// maqueta, a tamaño tablet (1000 × 540 y 1280 × 800) y en celular (390 y 360).
//
// Caso real (14/10 15:03, Máquina 2): una parada terminó con "Volvió con lote
// nuevo" en el cambio de turno y abrió un lote de la Mañana a nombre del
// encargado de la mañana. Los cuatro arreglos, de punta a punta:
//  1. "Volvió con lote nuevo" pide confirmación con el cartel (lote, máquina,
//     turno y encargado de la planilla) y "No, solo terminar la parada" la
//     termina sin lote nuevo;
//  2. en los últimos 30 minutos del turno (Mañana hasta las 15:00 en
//     horarios_turno) no se ofrece: "Terminar parada" y "Cerrar planilla del
//     turno", que la termina y pasa al cierre;
//  3. "Anular, se abrió por error" en una planilla recién abierta y vacía
//     (anular_turno_vacio), con el error de la base tal cual;
//  4. el scrap "6.700" pregunta «¿Quisiste decir 6,7 kg?» antes de mandar.
// Qué se mandó a la base se lee del console.log de la maqueta ("[maqueta] rpc
// nombre parámetros"). El día de la maqueta es 2099-12-31. Corre en cada
// push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[1000, 540], [1280, 800], [390, 844], [360, 780]];
// Una hora de Argentina (−03:00) del día de la maqueta.
const ar = (hhmm) => new Date(`2099-12-31T${hhmm}:00-03:00`);

function anotarRpc(page) {
  const lista = [];
  page.on('console', async (msg) => {
    if (!msg.text().startsWith('[maqueta] rpc')) return;
    try {
      const a = msg.args();
      const nombre = await a[1].jsonValue(), params = await a[2].jsonValue();
      // Las cargas de la planta van por la cola (ejecutar_tablet).
      if (nombre === 'ejecutar_tablet') lista.push([params?.p_operacion, params?.p_params]);
      else lista.push([nombre, params]);
    } catch { /* la página se fue */ }
  });
  return lista;
}
const pedidas = (lista, nombre) => lista.filter(([n]) => n === nombre).map(([, p]) => p);

// Entra como Federico a la planilla de la Máquina 2 (lote 7034, sin cajas ni
// masas), con el reloj a la hora dada y, si hace falta, una parada que sigue.
async function entrarALaMaquina2(page, ancho, alto, hora, { parada = null } = {}) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.clock.setFixedTime(ar(hora));
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
  // La Máquina 2 de la maqueta tiene una parada que sigue desde las 07:32
  // (pa-1): se saca, y va la de la prueba si hay.
  await page.evaluate((p) => {
    const t = globalThis.__maquetaTablas.paradas_produccion;
    t.splice(0, t.length, ...t.filter(x => x.turno_id !== 't2'), ...(p ? [p] : []));
  }, parada);
  await page.locator('#pr-quien-lista [data-persona]', { hasText: 'Federico Silva' }).click();
  await marcarPin(page, '4826');
  await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
  await page.locator('[data-producido="t2"]').click();
  await expect(page.locator('#pr-planilla')).toBeVisible();
}

async function escribirHora(page, numeros) {
  await expect(page.locator('#pr-hora-ventana')).toBeVisible();
  for (const d of numeros) await page.locator(`#pr-hora-ventana [data-hv-tecla="${d}"]`).click();
}

// Sin scroll de costado y sin palabras partidas en lo nuevo.
async function medir(page, nombre, info, problemas) {
  await page.waitForTimeout(150);
  const m = await page.evaluate(`(${medirPantalla.toString()})()`);
  await captura(page, nombre, info);
  if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
  for (const c of m.cortadas) if (/pr-confirma|pr-anular|pr-pa-cerrar|pr-aviso--anular|pr-hora-ventana|pr-pa-casilla/.test(c)) problemas.push(`${nombre}: palabra cortada ${c}`);
}

const PARADA_10 = { id: 'pa-sigue', turno_id: 't2', inicio: '2099-12-31T13:00:00Z', fin: null, motivo: 'Limpieza de planchas', motivo_id: 'mp-limp', categoria: 'programada', detalle: null };
const PARADA_13 = { ...PARADA_10, inicio: '2099-12-31T16:00:00Z' };
const CARTEL = 'Se va a CERRAR el lote 7034 y se va a ABRIR el lote nuevo en Máquina 2, turno Mañana, encargado Federico Silva. ¿Confirmás?';

for (const [ancho, alto] of TAMANOS) {
  test(`1 · "Volvió con lote nuevo" pide el cartel; "No" solo termina la parada, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaMaquina2(page, ancho, alto, '11:00', { parada: PARADA_10 });
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await page.locator('#pr-btn-reanudar').click();
    await escribirHora(page, '1030');
    await page.locator('#pr-hora-ventana [data-hv-lote-nuevo]').click();
    await expect(page.locator('#pr-hora-ventana-guardar')).toHaveText('Volvió con lote nuevo');
    await page.locator('#pr-hora-ventana-guardar').click();
    await expect(page.locator('#pr-confirma')).toBeVisible();
    await expect(page.locator('#pr-confirma-texto')).toHaveText(CARTEL);
    await expect(page.locator('#pr-confirma-si')).toHaveText('Sí, abrir lote nuevo');
    await expect(page.locator('#pr-confirma-no')).toHaveText('No, solo terminar la parada');
    await expect(page.locator('#pr-confirma-si')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#pr-confirma-no')).toBeInViewport({ ratio: 1 });
    await medir(page, `lote-nuevo-cartel-${ancho}x${alto}`, info, problemas);
    expect(pedidas(rpc, 'relanzar_con_lote_nuevo')).toEqual([]);
    expect(pedidas(rpc, 'editar_parada')).toEqual([]);
    await page.locator('#pr-confirma-no').click();
    await expect.poll(() => pedidas(rpc, 'editar_parada')).toEqual([
      { p_parada_id: 'pa-sigue', p_motivo: 'Limpieza de planchas', p_inicio: '2099-12-31T13:00:00Z', p_fin: '2099-12-31T10:30:00-03:00' },
    ]);
    expect(pedidas(rpc, 'relanzar_con_lote_nuevo')).toEqual([]);
    await expect(page.locator('#pr-confirma')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`1b · "Sí, abrir lote nuevo" relanza, a ${ancho}×${alto}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await entrarALaMaquina2(page, ancho, alto, '11:00', { parada: PARADA_10 });
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { ejecutar_tablet: { lote_viejo: 7034, turno_id: null, lote: 7036 } } }; });
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await page.locator('#pr-btn-reanudar').click();
    await escribirHora(page, '1030');
    await page.locator('#pr-hora-ventana [data-hv-lote-nuevo]').click();
    await page.locator('#pr-hora-ventana-guardar').click();
    await expect(page.locator('#pr-confirma-texto')).toHaveText(CARTEL);
    await page.locator('#pr-confirma-si').click();
    await expect.poll(() => pedidas(rpc, 'relanzar_con_lote_nuevo')).toEqual([{ p_parada_id: 'pa-sigue', p_hora: '2099-12-31T10:30:00-03:00' }]);
    expect(pedidas(rpc, 'editar_parada')).toEqual([]);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`2 · al final del turno: "Terminar parada" y "Cerrar planilla del turno", a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    // EL CASO REAL: paró a las 13:00, volvió 14:35, se carga a las 15:03.
    await entrarALaMaquina2(page, ancho, alto, '15:03', { parada: PARADA_13 });
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await page.locator('#pr-btn-reanudar').click();
    await escribirHora(page, '1435');
    await expect(page.locator('#pr-hora-ventana [data-hv-lote-nuevo]')).toHaveCount(0);
    await expect(page.locator('#pr-hora-ventana [data-hv-cerrar-planilla]')).toHaveText('Cerrar planilla del turno');
    await expect(page.locator('#pr-hora-ventana-guardar')).toHaveText('Terminar parada');
    await expect(page.locator('#pr-hora-ventana-nota')).toContainText('El turno termina a las 15:00: a esta hora no se abre un lote nuevo.');
    await medir(page, `lote-nuevo-fin-turno-${ancho}x${alto}`, info, problemas);
    // Lo que la planilla vuelve a leer: la parada ya terminada.
    await page.evaluate(() => { for (const p of globalThis.__maquetaTablas.paradas_produccion) if (p.id === 'pa-sigue') p.fin = '2099-12-31T17:35:00Z'; });
    await page.locator('#pr-hora-ventana [data-hv-cerrar-planilla]').click();
    await expect.poll(() => pedidas(rpc, 'editar_parada')).toEqual([
      { p_parada_id: 'pa-sigue', p_motivo: 'Limpieza de planchas', p_inicio: '2099-12-31T16:00:00Z', p_fin: '2099-12-31T14:35:00-03:00' },
    ]);
    await expect(page.locator('#pr-cierre')).toBeVisible();
    expect(pedidas(rpc, 'relanzar_con_lote_nuevo')).toEqual([]);
    await medir(page, `lote-nuevo-al-cierre-${ancho}x${alto}`, info, problemas);
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`2b · Paró de 13:00 a 14:35, a las 14:40: sin lote nuevo, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const problemas = [];
    await entrarALaMaquina2(page, ancho, alto, '14:40');
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await page.locator('#pr-parada-motivo-lista').selectOption({ label: 'Limpieza de planchas' });
    await page.locator('#pr-parada-hora [data-parada-hora="inicio"]').click();
    await escribirHora(page, '1300');
    await page.locator('#pr-hora-ventana-guardar').click();
    await page.locator('#pr-parada-hora [data-parada-hora="fin"]').click();
    await escribirHora(page, '1435');
    await page.locator('#pr-hora-ventana-guardar').click();
    await expect(page.locator('#pr-parada-hora [data-parada-lote-nuevo]')).toHaveCount(0);
    await expect(page.locator('#pr-parada-hora [data-parada-fin-turno]')).toHaveText('El turno termina a las 15:00: a esta hora no se abre un lote nuevo.');
    await expect(page.locator('#pr-parada-hora [data-parada-cerrar-planilla]')).toHaveText('Cerrar planilla del turno');
    await medir(page, `lote-nuevo-paro-fin-turno-${ancho}x${alto}`, info, problemas);
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`3 · "Anular, se abrió por error", a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    // La Máquina 2 se abrió 06:02; son las 06:30 y no tiene cajas ni masas.
    await entrarALaMaquina2(page, ancho, alto, '06:30');
    const boton = page.locator('#pr-planilla-estado [data-anular-error]');
    await expect(boton).toHaveText('Anular, se abrió por error');
    await medir(page, `anular-boton-${ancho}x${alto}`, info, problemas);
    await boton.click();
    await expect(page.locator('#pr-anular-planilla')).toBeVisible();
    await expect(page.locator('#pr-anular-planilla-titulo')).toHaveText('Anular la planilla del lote 7034');
    await page.locator('#pr-anular-planilla-motivo').fill('ab');
    await page.locator('#pr-anular-planilla-confirmar').click();
    await expect(page.locator('#pr-anular-planilla-error')).toHaveText('Escribí por qué se anula, con tres letras por lo menos.');
    expect(pedidas(rpc, 'anular_turno_vacio')).toEqual([]);
    // El error de la base, tal cual.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { anular_turno_vacio: 'ERROR:La planilla ya tiene masas cargadas: no se puede anular.' } }; });
    await page.locator('#pr-anular-planilla-motivo').fill('Se abrió en la máquina equivocada');
    await page.locator('#pr-anular-planilla-confirmar').click();
    await expect(page.locator('#pr-anular-planilla-error')).toHaveText('La planilla ya tiene masas cargadas: no se puede anular.');
    await medir(page, `anular-ventana-${ancho}x${alto}`, info, problemas);
    // Ahora sí: la base la borra y la máquina queda sin planilla.
    await page.evaluate(() => {
      globalThis.__maqueta = { rpc: { anular_turno_vacio: { lote_anulado: 7034, motivo: 'Se abrió en la máquina equivocada' } } };
      const t = globalThis.__maquetaTablas.turnos_produccion;
      t.splice(t.findIndex(x => x.id === 't2'), 1);
    });
    await page.locator('#pr-anular-planilla-confirmar').click();
    await expect.poll(() => pedidas(rpc, 'anular_turno_vacio')).toEqual([
      { p_turno_id: 't2', p_motivo: 'Se abrió en la máquina equivocada' },
      { p_turno_id: 't2', p_motivo: 'Se abrió en la máquina equivocada' },
    ]);
    await expect(page.locator('#pr-anular-planilla')).toBeHidden();
    await expect(page.locator('#pr-produccion')).toBeVisible();
    await expect(page.locator('[data-producido="t2"]')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`4 · el scrap "6.700" pregunta «¿Quisiste decir 6,7 kg?», a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaMaquina2(page, ancho, alto, '17:00');
    await page.locator('#pr-barra [data-seccion="cierre"]').click();
    await page.locator('#pr-cierre-hora').click();
    await escribirHora(page, '1450');
    await page.locator('#pr-hora-ventana-guardar').click();
    // Escrito como lo escribe la persona: 6700 (el campo pone el punto de miles).
    await page.locator('#pr-cierre-scrap').pressSequentially('6700');
    await expect(page.locator('#pr-cierre-scrap')).toHaveValue('6.700');
    await page.locator('#pr-cierre-enviar').click();
    // Sin producido la pantalla pregunta primero eso; se confirma y sigue.
    if (await page.locator('#pr-cierre-confirmar').isVisible()) await page.locator('#pr-cierre-confirmar-si').click();
    await expect(page.locator('#pr-confirma')).toBeVisible();
    await expect(page.locator('#pr-confirma-titulo')).toHaveText('¿Quisiste decir 6,7 kg?');
    await expect(page.locator('#pr-confirma-si')).toHaveText('Sí, 6,7 kg');
    await expect(page.locator('#pr-confirma-no')).toHaveText('No, fueron 6.700 kg');
    await medir(page, `scrap-miles-${ancho}x${alto}`, info, problemas);
    expect(pedidas(rpc, 'cerrar_turno')).toEqual([]);
    await page.locator('#pr-confirma-si').click();
    await expect(page.locator('#pr-cierre-scrap')).toHaveValue(/^6,70?$/);
    if (await page.locator('#pr-cierre-confirmar').isVisible()) await page.locator('#pr-cierre-confirmar-si').click();
    await expect.poll(() => pedidas(rpc, 'cerrar_turno').map(p => p.p_scrap_kg)).toEqual([6.7]);
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`4b · "6.7" se lee 6,7 (coma decimal) y no pregunta, a ${ancho}×${alto}`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await entrarALaMaquina2(page, ancho, alto, '17:00');
    await page.locator('#pr-barra [data-seccion="cierre"]').click();
    await page.locator('#pr-cierre-hora').click();
    await escribirHora(page, '1450');
    await page.locator('#pr-hora-ventana-guardar').click();
    await page.locator('#pr-cierre-scrap').pressSequentially('6.7');
    await expect(page.locator('#pr-cierre-scrap')).toHaveValue('6,7');
    await page.locator('#pr-cierre-enviar').click();
    if (await page.locator('#pr-cierre-confirmar').isVisible()) await page.locator('#pr-cierre-confirmar-si').click();
    await expect.poll(() => pedidas(rpc, 'cerrar_turno').map(p => p.p_scrap_kg)).toEqual([6.7]);
    await expect(page.locator('#pr-confirma')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
