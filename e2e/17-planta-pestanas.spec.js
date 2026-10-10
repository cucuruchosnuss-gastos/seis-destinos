// LAS PESTAÑAS DE LAS MÁQUINAS (01/10/2026).
//
// Con dos máquinas abiertas, pasar de la Máquina 1 a la 2 obligaba a volver
// al Inicio. Ahora, arriba de Planilla, Lo producido, Paradas y Cerrar
// planilla (y de la receta en Sala de masa), una fila de pestañas con las
// máquinas abiertas ("M1 · 7033"). Esta prueba abre la planta en la maqueta
// con DOS y con CINCO máquinas (pruebas/datos-maqueta/produccion-2maq.js y
// produccion-5maq.js) a 1000 × 540 y 600 × 940, y exige:
//  - las pestañas en UNA fila, sin cortar ninguna y sin scroll;
//  - la activa marcada, y un puntito en las máquinas paradas;
//  - cambiar de máquina en Paradas deja en Paradas de la otra;
//  - con un producto a medio cargar pregunta "¿Dejar esto sin guardar?";
//  - en Sala de masa, las pestañas arriba de la receta cambian de máquina;
//  - y la pantalla sigue entrando sin scroll.
// Corre en cada push, sin credenciales (la maqueta).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[1000, 540], [600, 940]];
const CASOS = [
  { datos: 'produccion-2maq', n: 2, paradas: 1 },
  { datos: 'produccion-5maq', n: 5, paradas: 2 },
];
const paso = (nombre) => PASOS_PLANTA.find(([n]) => n === nombre)[1];

function medirPestanas() {
  const nav = document.getElementById('pr-cab-maquinas');
  if (!nav || nav.hidden) return { visibles: false };
  const tabs = [...nav.querySelectorAll('.pr-pest')];
  const cab = document.getElementById('pr-cab').getBoundingClientRect();
  const r = nav.getBoundingClientRect();
  return {
    visibles: true,
    n: tabs.length,
    filas: new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top))).size,
    cortadas: tabs.filter(t => t.scrollWidth > t.clientWidth + 1).map(t => t.textContent),
    navDesborda: nav.scrollWidth > nav.clientWidth + 1 || r.right > cab.right + 1,
    altoCabecera: Math.round(cab.height),
    activa: nav.querySelector('[aria-current="page"]')?.textContent ?? null,
    puntos: nav.querySelectorAll('.pr-pest__punto').length,
  };
}

function problemasDePantalla(m, nombre) {
  const p = [];
  if (m.scroll) p.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
  if (m.scrollX) p.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
  for (const a of m.afuera) p.push(`${nombre}: se sale de su recuadro ${a}`);
  for (const c of m.cortadas) p.push(`${nombre}: palabra cortada ${c}`);
  for (const l of m.lote) p.push(`${nombre}: el lote en dos renglones ${l}`);
  return p;
}

for (const caso of CASOS) {
  for (const [ancho, alto] of TAMANOS) {
    test(`pestañas con ${caso.n} máquinas a ${ancho}×${alto}`, async ({ page }, info) => {
      test.setTimeout(3 * 60 * 1000);
      await page.setViewportSize({ width: ancho, height: alto });
      const errores = vigilarErrores(page);
      const problemas = [];
      await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=${caso.datos}`);
      // Sin "Abrir turno": con las cinco abiertas está apagado (no hay libres).
      for (const n of ['quien-sos', 'pin', 'pin-maestro', 'entrar', 'tablero', 'planilla']) await paso(n)(page);

      // La planilla de la Máquina 1: todas las pestañas, en una fila.
      const enPlanilla = await page.evaluate(medirPestanas);
      await captura(page, `pestanas-${caso.n}-planilla-${ancho}x${alto}`, info);
      expect(enPlanilla.visibles, 'hay pestañas en la planilla').toBe(true);
      expect(enPlanilla.n, `una pestaña por máquina abierta: ${JSON.stringify(enPlanilla)}`).toBe(caso.n);
      expect(enPlanilla.filas, `en una sola fila: ${JSON.stringify(enPlanilla)}`).toBe(1);
      expect(enPlanilla.cortadas, `ninguna cortada: ${JSON.stringify(enPlanilla)}`).toEqual([]);
      expect(enPlanilla.navDesborda, `sin scroll ni desborde: ${JSON.stringify(enPlanilla)}`).toBe(false);
      expect(enPlanilla.altoCabecera, `la cabecera sigue en una línea: ${JSON.stringify(enPlanilla)}`).toBeLessThanOrEqual(48);
      expect(enPlanilla.activa, 'la activa es la Máquina 1').toContain('7033');
      expect(enPlanilla.puntos, 'un puntito por máquina parada').toBe(caso.paradas);
      problemas.push(...problemasDePantalla(await page.evaluate(`(${medirPantalla.toString()})()`), 'planilla'));

      // En Paradas de M1, tocar M2: queda en Paradas de M2.
      await paso('paradas')(page);
      await page.locator('#pr-cab-maquinas [data-pestana-turno="t2"]').click();
      await expect(page.locator('#pr-paradas')).toBeVisible();
      await expect(page.locator('#pr-cab-maquinas [aria-current="page"]')).toContainText('7034');
      await expect(page.locator('#pr-barra [data-seccion="paradas"]')).toHaveAttribute('aria-current', 'page');
      await captura(page, `pestanas-${caso.n}-paradas-m2-${ancho}x${alto}`, info);
      const enParadas = await page.evaluate(medirPestanas);
      expect(enParadas.filas, `en Paradas, una fila: ${JSON.stringify(enParadas)}`).toBe(1);
      expect(enParadas.cortadas, `en Paradas, ninguna cortada: ${JSON.stringify(enParadas)}`).toEqual([]);
      problemas.push(...problemasDePantalla(await page.evaluate(`(${medirPantalla.toString()})()`), 'paradas M2'));

      // Un producto a medio cargar en M2: tocar M1 pregunta antes.
      await page.locator('#pr-barra [data-seccion="planilla"]').click();
      await expect(page.locator('#pr-planilla')).toBeVisible();
      await page.locator('#pr-btn-agregar-producto').click();
      await page.locator('[data-ag-producto]').first().click();
      await page.locator('#pr-cab-maquinas [data-pestana-turno="t1"]').click();
      await expect(page.locator('#pr-confirma')).toBeVisible();
      await expect(page.locator('#pr-confirma-titulo')).toHaveText('¿Dejar esto sin guardar?');
      await page.locator('#pr-confirma-si').click();
      await expect(page.locator('#pr-agregar-prod')).toBeVisible();
      await expect(page.locator('#pr-cab-maquinas [aria-current="page"]')).toContainText('7033');

      // Sala de masa: las pestañas arriba de la receta.
      await page.locator('#pr-cab-volver').click();
      await expect(page.locator('#pr-produccion')).toBeVisible();
      await paso('ir-a-sala')(page);
      await paso('receta')(page);
      const enReceta = await page.evaluate(medirPestanas);
      expect(enReceta.n, `en la receta, las máquinas abiertas: ${JSON.stringify(enReceta)}`).toBe(caso.n);
      expect(enReceta.filas, `en la receta, una fila: ${JSON.stringify(enReceta)}`).toBe(1);
      expect(enReceta.cortadas, `en la receta, ninguna cortada: ${JSON.stringify(enReceta)}`).toEqual([]);
      problemas.push(...problemasDePantalla(await page.evaluate(`(${medirPantalla.toString()})()`), 'receta M1'));
      await page.locator('#pr-cab-maquinas [data-pestana-turno="t2"]').click();
      await expect(page.locator('#pr-receta')).toBeVisible();
      await expect(page.locator('#pr-cab-maquinas [aria-current="page"]')).toContainText('7034');
      await captura(page, `pestanas-${caso.n}-receta-m2-${ancho}x${alto}`, info);
      problemas.push(...problemasDePantalla(await page.evaluate(`(${medirPantalla.toString()})()`), 'receta M2'));

      expect(errores, errores.join('\n')).toEqual([]);
      expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
    });
  }
}
