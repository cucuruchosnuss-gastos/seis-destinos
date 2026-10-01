// EL HORARIO DEL TURNO EN LA PLANTA (01/10/2026).
//
// Con los datos de pruebas/datos-maqueta/produccion-horarios.js (Nuss con el
// turno Mañana de 06:00 a 15:00, la Máquina 2 con una parada ABIERTA y una
// planilla que quedó para completar porque la máquina siguió con un lote
// nuevo), recorre en la maqueta, a 390 × 844, a 1000 × 540 y 600 × 940 (la
// tablet de Nuss, apaisada y parada) y a 1280 × 800:
//  - el tablero avisa "1 planilla falta completar (productos y scrap)";
//  - la planilla dice "Turno Mañana · 06:00 – 15:00";
//  - la parada abierta ofrece "Volvió con el mismo lote" y "Volvió con lote
//    nuevo", y este abre la ventana de la hora (teclado propio, "Ahora");
//  - el cierre pregunta "¿A qué hora terminó el turno?" con 14:00 (8 h) y
//    15:00 (9 h), y dice hasta cuándo se cuenta la parada abierta;
//  - "Volvió con lote nuevo" → "Lote 7034 queda para completar · Ahora la
//    Máquina 2 sigue con el lote 7036".
// En la tablet (1000 × 540, 600 × 940 y 1280 × 800) nada scrollea; en el celular
// (390 × 844) se exige que no haya scroll de costado.
// Corre en cada push, sin credenciales (la maqueta).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = 'http://localhost:4180';
const TAMANOS = [[390, 844, false], [1000, 540, true], [600, 940, true], [1280, 800, true]];

for (const [ancho, alto, sinScroll] of TAMANOS) {
  test(`el horario del turno en la planta a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const problemas = [];
    const medir = async (nombre) => {
      await page.waitForTimeout(150);
      const m = await page.evaluate(`(${medirPantalla.toString()})()`);
      await captura(page, `horarios-${nombre}-${ancho}x${alto}`, info);
      if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
      if (!sinScroll) return;
      if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
      for (const a of m.afuera) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
      for (const c of m.cortadas) problemas.push(`${nombre}: palabra cortada ${c}`);
    };

    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion-horarios`);
    const hasta = PASOS_PLANTA.findIndex(([n]) => n === 'tablero');
    for (const [, fn] of PASOS_PLANTA.slice(0, hasta + 1)) await fn(page);

    // El tablero: la planilla que dejó "Volvió con lote nuevo".
    await expect(page.locator('#pr-produccion')).toContainText('falta completar (productos y scrap)');
    await medir('tablero');

    // La planilla de la Máquina 2 (parada): el horario del turno.
    await page.locator('[data-producido="t2"]').click();
    await expect(page.locator('#pr-planilla-horario')).toContainText('06:00 – 15:00');
    await medir('planilla');

    // La parada abierta: los dos "Volvió".
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await expect(page.locator('#pr-btn-reanudar')).toHaveText('Volvió con el mismo lote');
    await expect(page.locator('#pr-btn-relanzar')).toBeVisible();
    await medir('paradas');

    // El cierre: la hora de fin con sus dos atajos y la parada abierta
    // contada hasta esa hora.
    await page.locator('#pr-barra [data-seccion="cierre"]').click();
    await expect(page.locator('#pr-cierre')).toContainText(/a qué hora terminó el turno/i);
    await expect(page.locator('#pr-cierre-fin')).toHaveValue('15:00');
    await expect(page.locator('#pr-cierre-fin-chips [data-fin-chip="14:00"]')).toHaveText('14:00 · 8 h');
    await expect(page.locator('#pr-cierre-fin-chips [data-fin-chip="15:00"]')).toHaveText('15:00 · 9 h');
    await expect(page.locator('#pr-cierre-falta')).toContainText('se va a contar hasta las 15:00');
    await page.locator('#pr-cierre-fin-chips [data-fin-chip="14:00"]').click();
    await expect(page.locator('#pr-cierre-fin')).toHaveValue('14:00');
    await expect(page.locator('#pr-cierre-falta')).toContainText('se va a contar hasta las 14:00');
    // La hora se lee entera: el medidor no ve lo que se corta ADENTRO de un
    // campo (pasó: "14:0" con el campo angosto).
    const campo = await page.locator('#pr-cierre-fin').evaluate(i => ({ sw: i.scrollWidth, cw: i.clientWidth }));
    if (campo.sw > campo.cw + 1) problemas.push(`cierre: la hora de fin no entra en su campo (${campo.sw} en ${campo.cw})`);
    await medir('cierre');

    // "Volvió con lote nuevo": la ventana de la hora, "Ahora" y el aviso.
    await page.locator('#pr-barra [data-seccion="paradas"]').click();
    await page.locator('#pr-btn-relanzar').click();
    await expect(page.locator('#pr-hora-ventana')).toBeVisible();
    await expect(page.locator('#pr-hora-ventana [data-hv-ahora]')).toBeVisible();
    await medir('relanzar');
    await page.locator('#pr-hora-ventana [data-hv-ahora]').click();
    await page.locator('#pr-hora-ventana-guardar').click();
    await expect(page.locator('#pr-hora-ventana')).toBeHidden();
    await expect(page.locator('#pr-planilla-estado')).toContainText('Lote 7034 queda para completar');
    await expect(page.locator('#pr-planilla-estado')).toContainText('sigue con el lote 7036');
    await medir('relanzado');

    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}
