// LO QUE QUEDÓ DE LA REVISIÓN EN EL CELULAR (10/10/2026, noche), a 360 y 390:
//  (a) En la barra de abajo, "Administración" se cortaba con "…": ahí dice
//      "Admin", entero (con el nombre completo en el title). La compu y la
//      hoja "Más" siguen diciendo "Administración".
//  (b) Órdenes de retiro (la Carga): la acción del renglón ("Agregar igual ·
//      30 cajas" / "Quitar de la orden") a mitad de scroll pasaba POR DEBAJO
//      de la barra de abajo de la app. Ahora queda pegada arriba de ella, se
//      puede tocar, y al final no tapa el último pedazo del renglón.
// Maqueta (Supabase falso, sin sesión ni base). Contra el código de antes da
// ROJO (verificado al escribirla). Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
// La barra de abajo elegida por la persona, con Administración adentro.
const CUENTA = { v: 1, barra: { orden: 'mano', manual: [], fijados: [] }, uso: {}, barra_inferior: ['administracion', 'gastos', 'caja', 'cobranzas'] };

const alto = (ancho) => (ancho < 380 ? 780 : 844);

for (const ancho of [360, 390]) {
  test.describe(`celular a ${ancho} px`, () => {
    test('la barra de abajo dice "Admin", entero', async ({ page }, info) => {
      const errores = vigilarErrores(page);
      await page.setViewportSize({ width: ancho, height: alto(ancho) });
      await page.goto(`${MAQUETA}/dashboard.html?maqueta=tablero`);
      await page.evaluate((c) => sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc: { mis_preferencias: c } })), CUENTA);
      await page.reload();
      const tab = page.locator('.barra-abajo [data-clave="administracion"]');
      await expect(tab).toBeVisible();
      const nombre = tab.locator('.barra-abajo__nombre');
      await expect(nombre).toHaveText('Admin');
      await expect(tab).toHaveAttribute('title', 'Administración');
      const m = await nombre.evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }));
      expect(m.sw, 'sin cortarse de costado').toBeLessThanOrEqual(m.cw);
      expect(m.sh, 'ni para abajo').toBeLessThanOrEqual(m.ch + 1);
      // La hoja "Más" sigue con el nombre entero.
      await page.locator('#barra-abajo-mas').click();
      await expect(page.locator('.hoja-mas')).toContainText('Administración');
      await captura(page, `celular-admin-${ancho}`, info);
      expect(errores).toEqual([]);
    });

    test('Órdenes de retiro: "Agregar igual" queda arriba de la barra de abajo', async ({ page }, info) => {
      const errores = vigilarErrores(page);
      await page.setViewportSize({ width: ancho, height: alto(ancho) });
      await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
      await page.locator('[data-empresa]').first().click();
      await page.locator('#rt-cliente-buscar').fill('turco');
      await page.locator('[data-cliente]').first().click();
      await page.locator('[data-r-producto]').first().click();
      await page.locator('[data-r-cajas="0"]').fill('30');
      await page.locator('[data-r-completar="0"]').click();
      await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('Faltan 7 cajas');
      const boton = page.locator('[data-r-listo="0"]');
      await expect(boton).toHaveText(/Agregar igual · 30 cajas/);
      await expect(page.locator('.rt-accion [data-r-quitar="0"]')).toHaveText('Quitar de la orden');

      // La medida: el botón entero en la pantalla, arriba de la barra de abajo,
      // y lo que se ve en su centro es él (no la barra).
      const medir = () => page.evaluate(() => {
        const b = document.querySelector('[data-r-listo="0"]').getBoundingClientRect();
        const q = document.querySelector('.rt-accion [data-r-quitar="0"]').getBoundingClientRect();
        const barra = document.querySelector('.barra-abajo').getBoundingClientRect();
        const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        const tq = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return {
          top: b.top, bottom: b.bottom, quitar: q.bottom, barraTop: barra.top, alto: window.innerHeight,
          esEl: !!t && !!t.closest('[data-r-listo="0"]'), esQuitar: !!tq && !!tq.closest('.rt-accion [data-r-quitar="0"]'),
          scroll: window.scrollY, maximo: document.documentElement.scrollHeight - window.innerHeight,
        };
      });
      const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(max, 'el renglón es más alto que la pantalla (hay scroll)').toBeGreaterThan(100);
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(max / 2));
      await page.waitForTimeout(200);
      const mitad = await medir();
      expect(mitad.top, 'a mitad de scroll el botón está en la pantalla').toBeGreaterThanOrEqual(0);
      expect(mitad.quitar, '"Quitar de la orden" arriba de la barra de abajo').toBeLessThanOrEqual(mitad.barraTop + 0.5);
      expect(mitad.bottom, 'el botón arriba de la barra de abajo').toBeLessThanOrEqual(mitad.barraTop + 0.5);
      expect(mitad.esEl, 'en el centro del botón está el botón').toBe(true);
      expect(mitad.esQuitar, '"Quitar de la orden" se puede tocar').toBe(true);
      await captura(page, `celular-retiros-mitad-${ancho}`, info);

      // Al final: el último pedazo del renglón (lo de antes de la acción) no
      // queda tapado ni por la acción ni por la barra.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      const fin = await page.evaluate(() => {
        const editor = document.querySelector('.rt-editor[data-renglon="0"]');
        const accion = editor.querySelector('.rt-accion').getBoundingClientRect();
        const barra = document.querySelector('.barra-abajo').getBoundingClientRect();
        const antes = [...editor.children].filter(c => !c.classList.contains('rt-accion') && c.getBoundingClientRect().height > 0);
        const ultimo = antes.at(-1).getBoundingClientRect();
        return { ultimo: ultimo.bottom, accionTop: accion.top, accionBottom: accion.bottom, barraTop: barra.top };
      });
      expect(fin.ultimo, 'el último pedazo del renglón no queda debajo de la acción').toBeLessThanOrEqual(fin.accionTop + 0.5);
      expect(fin.accionBottom, 'la acción arriba de la barra de abajo').toBeLessThanOrEqual(fin.barraTop + 0.5);
      const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
      expect(doc, 'sin scroll de costado').toBeLessThanOrEqual(vista);
      await captura(page, `celular-retiros-fin-${ancho}`, info);
      expect(errores).toEqual([]);
    });
  });
}

test('compu (1280): la barra lateral sigue diciendo "Administración"', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${MAQUETA}/dashboard.html?maqueta=tablero`);
  await expect(page.locator('.barra-lateral [data-clave="administracion"] .barra-lateral__nombre')).toHaveText('Administración');
  await expect(page.locator('.barra-abajo')).toBeHidden();
});
