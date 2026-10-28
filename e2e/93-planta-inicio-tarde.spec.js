// INICIO TARDE DE PRODUCCIÓN (27/10/2026), en la maqueta, a la medida de la
// tablet (1000 × 540, la Samsung de Nuss instalada) y a 390 px.
//
// El caso real (lote 6270): el turno era de 15:00, faltó un operario y se
// empezó a producir más tarde. La cuarta acción de la planilla abre la
// ventana: la hora del turno, la hora en que se empezó a producir (con el
// teclado de la planta), "Empezó X h Y min tarde" en vivo y el motivo,
// obligatorio. Manda registrar_inicio_tarde por la cola (ejecutar_tablet) y la
// planilla muestra "Inicio tarde: 15:00 → 16:53 (1 h 53 min) · Falta de
// operario". Lo que se manda se lee del console.log de la maqueta.
//
// El día de la maqueta es 2099-12-31: el reloj va a las 17:00 de Argentina.
// Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[1000, 540], [390, 844]];
const AHORA = new Date('2099-12-31T20:00:00Z'); // 17:00 de Argentina

function anotarRpc(page) {
  const lista = [];
  page.on('console', async (msg) => {
    if (!msg.text().startsWith('[maqueta] rpc')) return;
    try {
      const a = msg.args();
      const nombre = await a[1].jsonValue(), params = await a[2].jsonValue();
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

async function teclas(page, numeros) {
  for (const d of numeros) await page.locator(`#pr-tarde-ventana [data-it-tecla="${d}"]`).click();
}

async function medir(page, nombre, info, problemas) {
  await page.waitForTimeout(150);
  const m = await page.evaluate(`(${medirPantalla.toString()})()`);
  await captura(page, nombre, info);
  if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
  if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
  // La barra de arriba de la planta a 390 px (el recuadro de quién está) ya
  // se salía antes: la planta se diseñó para la tablet.
  const angosta = (page.viewportSize()?.width ?? 1000) < 600;
  for (const a of m.afuera) if (!(angosta && /pr-lat__quien/.test(a))) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
  for (const c of m.cortadas) problemas.push(`${nombre}: palabra cortada ${c}`);
}

for (const [ancho, alto] of TAMANOS) {
  test(`inicio tarde: 15:00 → 16:53 por falta de operario, y se ve en la planilla, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarALaPlanilla(page, ancho, alto);
    await expect(page.locator('#pr-btn-tarde')).toContainText('INICIO TARDE');
    await expect(page.locator('#pr-btn-tarde')).toContainText('Cargar');
    await expect(page.locator('#pr-aviso-tarde')).toBeHidden();
    // En la tablet, las cuatro acciones en una fila y sin nada cortado.
    if (ancho >= 600) {
      const tops = await page.locator('.pr-acc3 > .pr-acc').evaluateAll(bs => bs.map(b => Math.round(b.getBoundingClientRect().top)));
      expect(new Set(tops).size, `las cuatro acciones en una fila: ${tops}`).toBe(1);
    }
    const cortados = await page.locator('.pr-acc3 .pr-acc__dato, .pr-acc3 .pr-acc__rotulo').evaluateAll(xs => xs.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent));
    expect(cortados, 'ningún rótulo ni dato de las acciones cortado').toEqual([]);
    await medir(page, `inicio-tarde-planilla-${ancho}x${alto}`, info, problemas);

    await page.locator('#pr-btn-tarde').click();
    await expect(page.locator('#pr-tarde-ventana')).toBeVisible();
    await expect(page.locator('#pr-tarde-ventana-titulo')).toHaveText('Inicio tarde de producción');
    // Precargada con la hora del turno de la planilla (06:00): se corrige a 15:00.
    await expect(page.locator('#pr-tarde-ventana [data-it-campo="inicio"]')).toContainText('06:00');
    expect(await page.locator('#pr-tarde-ventana input[type="time"]').count()).toBe(0);
    await page.locator('#pr-tarde-ventana [data-it-campo="inicio"]').click();
    await teclas(page, '1500');
    // Pasa sola a "¿A qué hora se empezó a producir?".
    await expect(page.locator('#pr-tarde-ventana [data-it-campo="largada"]')).toHaveAttribute('aria-pressed', 'true');
    await teclas(page, '1653');
    await expect(page.locator('#pr-tarde-ventana-demora')).toHaveText('Empezó 1 h 53 min tarde');
    // El motivo es obligatorio.
    await page.locator('#pr-tarde-ventana-guardar').click();
    await expect(page.locator('#pr-tarde-ventana-error')).toHaveText('Elegí por qué se empezó tarde.');
    expect(pedidas(rpc, 'registrar_inicio_tarde')).toEqual([]);
    await page.locator('#pr-tarde-ventana [data-it-motivo="Otro"]').click();
    await expect(page.locator('#pr-tarde-ventana-otro')).toBeVisible();
    await medir(page, `inicio-tarde-ventana-otro-${ancho}x${alto}`, info, problemas);
    // La ventana entra entera en la pantalla: Guardar se ve sin mover nada.
    await expect(page.locator('#pr-tarde-ventana-guardar')).toBeInViewport();
    await page.locator('#pr-tarde-ventana [data-it-motivo="Falta de operario"]').click();
    await expect(page.locator('#pr-tarde-ventana-otro')).toBeHidden();
    await medir(page, `inicio-tarde-ventana-${ancho}x${alto}`, info, problemas);
    // Lo que la planilla vuelve a leer después de guardar.
    await page.evaluate(() => {
      for (const t of globalThis.__maquetaTablas.turnos_produccion) {
        if (t.id === 't1') Object.assign(t, { hora_inicio: '15:00:00', hora_largada: '16:53:00', largada_motivo: 'Falta de operario' });
      }
    });
    await page.locator('#pr-tarde-ventana-guardar').click();
    await expect.poll(() => pedidas(rpc, 'registrar_inicio_tarde')).toEqual([
      { p_turno_id: 't1', p_hora_inicio: '15:00', p_hora_largada: '16:53', p_motivo: 'Falta de operario' },
    ]);
    await expect(page.locator('#pr-tarde-ventana')).toBeHidden();
    await expect(page.locator('#pr-aviso-tarde')).toBeVisible();
    await expect(page.locator('#pr-aviso-tarde-texto')).toHaveText('Inicio tarde: 15:00 → 16:53 (1 h 53 min) · Falta de operario');
    await expect(page.locator('#pr-btn-tarde')).toContainText('1 h 53 min');
    await expect(page.locator('#pr-btn-largada')).toContainText('16:53');
    await medir(page, `inicio-tarde-cargado-${ancho}x${alto}`, info, problemas);
    // Ya cargado: el botón abre la ventana para corregirlo.
    await page.locator('#pr-btn-tarde').click();
    await expect(page.locator('#pr-tarde-ventana [data-it-campo="inicio"]')).toContainText('15:00');
    await expect(page.locator('#pr-tarde-ventana [data-it-campo="largada"]')).toContainText('16:53');
    await expect(page.locator('#pr-tarde-ventana [data-it-motivo="Falta de operario"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#pr-tarde-ventana-cancelar').click();
    await expect(page.locator('#pr-tarde-ventana')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}
