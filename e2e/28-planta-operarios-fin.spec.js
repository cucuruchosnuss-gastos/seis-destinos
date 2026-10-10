// LOS OPERARIOS CUANDO TERMINA UNA PLANILLA (08/10/2026).
//
// La base le pone `hasta` a los operarios cuando la planilla sale de
// 'abierto'. En Abrir turno, "ocupado" (apagado, "en Máquina N") es solo quien
// sigue sin hora de salida en una planilla ABIERTA. Con los datos
// produccion-operarios (pruebas/datos-maqueta/produccion-operarios.js):
//  - Gómez Rodrigo, de la planilla de la mañana YA CERRADA de la Máquina 3, se
//    puede elegir para el turno siguiente;
//  - Sosa Marcela (sin salida, en una planilla pendiente de completar: dato
//    viejo) también;
//  - Ramón Díaz, que sigue en la Máquina 1 abierta, aparece apagado.
// A 1000 × 540 y 390 × 844. Corre en cada push, sin credenciales (la maqueta).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = 'http://localhost:4180';
const paso = (nombre) => PASOS_PLANTA.find(([n]) => n === nombre)[1];

for (const [ancho, alto] of [[1000, 540], [390, 844]]) {
  test(`Abrir turno: el operario de una planilla cerrada se puede elegir a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion-operarios`);
    for (const n of ['quien-sos', 'pin', 'pin-maestro', 'entrar', 'tablero', 'abrir-turno']) await paso(n)(page);

    await page.locator('#pr-abrir [data-abrir-maquina]:not([disabled])', { hasText: 'Máquina 3' }).click();
    const tag = (nombre) => page.locator('#pr-abrir [data-toggle-op]', { hasText: nombre });
    await expect(tag('Ramón Díaz')).toBeDisabled();
    await expect(tag('Ramón Díaz')).toContainText('en Máquina 1');
    await expect(tag('Gómez Rodrigo')).toBeEnabled();
    await expect(tag('Gómez Rodrigo')).not.toContainText('en Máquina');
    await expect(tag('Sosa Marcela')).toBeEnabled();
    await expect(page.locator('#pr-abrir')).toContainText('LOS QUE ESTÁN AHORA EN OTRA MÁQUINA');

    await tag('Gómez Rodrigo').click();
    await expect(tag('Gómez Rodrigo')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#pr-abrir-confirmar')).toContainText('1 operario');
    await captura(page, `operarios-fin-${ancho}x${alto}`, info);
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}
