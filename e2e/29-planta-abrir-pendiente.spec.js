// ABRIR UN TURNO CON UNA PLANILLA PENDIENTE DE COMPLETAR (09/10/2026), en la
// maqueta, a tamaño tablet (1000 × 540, la Samsung de Nuss instalada) y a 390 px.
//
// Datos: produccion-pendiente (la Máquina 3 tiene su planilla del turno Noche
// del día anterior, lote 7030, cerrada a la fuerza: 'pendiente_completar').
//  1. La Máquina 3 se ve LIBRE con su "Abrir turno"; la pendiente sigue en el
//     aviso de arriba. Abrir manda ejecutar_tablet('abrir_turnos') con la
//     Máquina 3 y muestra el lote nuevo (7036).
//  2. Si la base rechaza (hoy abrir_turnos rechaza si en la fábrica hay una
//     planilla no cerrada de otro turno), el error se ve TAL CUAL y al lado la
//     pendiente con "Completar Máquina 3 · lote 7030", que abre su planilla.
// Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = 'http://localhost:4180';
const TAMANOS = [[1000, 540], [390, 844]];
const AHORA = new Date('2099-12-31T20:00:00Z'); // 17:00 de Argentina
const MSJ = 'La Máquina 3 sigue abierta en el turno Noche del 30/12. Cerrá primero las planillas de ese turno antes de abrir el turno Tarde.';

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

async function entrarAlTablero(page, ancho, alto) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.clock.setFixedTime(AHORA);
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion-pendiente`);
  await page.locator('#pr-quien-lista [data-persona]', { hasText: 'Federico Silva' }).click();
  await marcarPin(page, '4826');
  await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
  await expect(page.locator('[data-producido]').first()).toBeVisible();
}

async function medir(page, nombre, info, problemas, { sinScroll }) {
  await page.waitForTimeout(150);
  const m = await page.evaluate(`(${medirPantalla.toString()})()`);
  await captura(page, nombre, info);
  if (sinScroll && m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
  if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
  // A 390 px la planta ya se salía de sus recuadros ANTES de este cambio (la
  // cabecera de Abrir turno, el nombre y el lote de cada tarjeta, la barra de
  // quién está: medido el 09/10/2026 sobre main): se diseñó para la tablet.
  // Ahí esta prueba mira solo lo nuevo, las pendientes al lado del error, y
  // que la página no scrollee de costado.
  const angosta = (page.viewportSize()?.width ?? 1000) < 600;
  const mirar = (t) => !angosta || /pr-abrir-pendientes|Completar M|planilla pendiente/.test(t);
  for (const a of m.afuera) if (mirar(a)) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
  for (const c of m.cortadas) if (mirar(c)) problemas.push(`${nombre}: palabra cortada ${c}`);
  if (angosta) {
    for (const b of await page.locator('#pr-abrir-pendientes button').all()) {
      const r = await b.boundingBox();
      if (r && (r.x < 0 || r.x + r.width > (page.viewportSize()?.width ?? 0) + 1)) problemas.push(`${nombre}: un botón de las pendientes se sale de la pantalla`);
    }
  }
}

for (const [ancho, alto] of TAMANOS) {
  const tablet = ancho >= 1000;

  test(`1 · la máquina con la planilla pendiente se abre igual, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarAlTablero(page, ancho, alto);
    // La pendiente no ocupa la máquina: libre, con su "Abrir turno".
    await expect(page.locator('#pr-tablero [data-abrir-libre="maq-3"]')).toBeVisible();
    await expect(page.locator('#pr-tablero [data-producido="t3p"]')).toHaveCount(0);
    // … y la pendiente se sigue viendo, para completarla.
    await expect(page.locator('#pr-tablero-aviso [data-planilla="t3p"]')).toContainText('Máquina 3 · lote 7030');
    await medir(page, `abrir-pendiente-tablero-${ancho}x${alto}`, info, problemas, { sinScroll: false });
    await page.locator('#pr-tablero [data-abrir-libre="maq-3"]').click();
    await expect(page.locator('#pr-abrir')).toBeVisible();
    await expect(page.locator('#pr-abrir-confirmar')).toContainText('Abrir turno de Máquina 3');
    await expect(page.locator('#pr-abrir-confirmar')).toBeEnabled();
    await medir(page, `abrir-pendiente-form-${ancho}x${alto}`, info, problemas, { sinScroll: tablet });
    await page.locator('#pr-abrir-confirmar').click();
    await expect.poll(() => pedidas(rpc, 'abrir_turnos').length).toBe(1);
    expect(pedidas(rpc, 'abrir_turnos')[0].p_maquinas).toEqual([{ maquina_id: 'maq-3', operarios: [] }]);
    await expect(page.locator('#pr-abiertos')).toBeVisible();
    await expect(page.locator('#pr-abiertos-lista')).toContainText('7036');
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });

  test(`2 · si la base rechaza, el error tal cual y la pendiente para completarla, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    const problemas = [];
    await entrarAlTablero(page, ancho, alto);
    await page.locator('#pr-tablero [data-abrir-libre="maq-3"]').click();
    await expect(page.locator('#pr-abrir')).toBeVisible();
    await page.evaluate((m) => { globalThis.__maqueta = { rpc: { ejecutar_tablet: 'ERROR:' + m } }; }, MSJ);
    await page.locator('#pr-abrir-confirmar').click();
    await expect(page.locator('#pr-abrir-error')).toHaveText(MSJ);
    const boton = page.locator('#pr-abrir-pendientes [data-planilla="t3p"]');
    await expect(boton).toHaveText('Completar Máquina 3 · lote 7030');
    await expect(page.locator('#pr-abrir-pendientes')).toContainText('Hay 1 planilla pendiente de completar en esta fábrica');
    await expect(page.locator('#pr-abrir-confirmar')).toBeEnabled();
    await medir(page, `abrir-pendiente-error-${ancho}x${alto}`, info, problemas, { sinScroll: tablet });
    expect(pedidas(rpc, 'abrir_turnos').length).toBe(1);
    await page.evaluate(() => { globalThis.__maqueta = null; });
    await boton.click();
    await expect(page.locator('#pr-planilla')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}
