// EL ESQUELETO PAREJO (23/10/2026): ninguna pantalla de los módulos tapa las
// barras de la app. Antes, el wizard y los detalles de Gastos, la ficha de una
// persona en Caja y el menú del celular de la gestión de producción se abrían
// "position: fixed; inset: 0" con z-index 50/60 (más que el 30 de la barra
// lateral) y tapaban la barra lateral, la de arriba (fábricas y usuario) y la
// de abajo del celular. Ahora son vistas DENTRO de la página, con el
// encabezado de todos los módulos ("‹ Volver", el ícono y el nombre).
// También las barras fijas de abajo de Cobranzas y de la cartera de cheques:
// en la compu tapaban el pie de la barra lateral y la de cheques, en el
// celular, la barra de abajo.
//
// Para cada pantalla, a 1280, 768 (tablet), 390 y 360 px, en la maqueta:
//  - la pantalla está a la vista y NO es "position: fixed";
//  - document.elementFromPoint en el centro de cada barra que corresponde al
//    ancho (la lateral desde 1024, la de arriba siempre, la de abajo debajo de
//    1024) devuelve un elemento de ESA barra; en la lateral, también el pie;
//  - una vista convertida arranca arriba de la página y lleva el encabezado
//    de los módulos con su "‹ Volver";
//  - sin scroll de costado y sin errores de JavaScript.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;

const ANCHOS = [
  { ancho: 1280, alto: 800 },
  { ancho: 768, alto: 1024 },
  { ancho: 390, alto: 844 },
  { ancho: 360, alto: 800 },
];

// vista: true = una pantalla que pasó a ser vista dentro de la página (lleva
// el encabezado y arranca arriba); false = una barra fija que no tiene que
// tapar a las de la app.
const PANTALLAS = [
  {
    nombre: 'gastos-wizard', que: 'Gastos · cargar un gasto', vista: true,
    url: '/modulos/gastos.html?maqueta=gastos', ver: '#vista-wizard',
    pasos: async (page) => { await page.locator('#btn-nuevo-gasto').click(); },
  },
  {
    nombre: 'gastos-detalle', que: 'Gastos · detalle de un gasto', vista: true,
    url: '/modulos/gastos.html?maqueta=celular-gastos&gasto=g-anu', ver: '#modal-detalle-gasto',
  },
  {
    nombre: 'gastos-factura', que: 'Gastos · detalle de una factura', vista: true,
    url: '/modulos/gastos.html?maqueta=cuentas-corrientes&factura=f-n1', ver: '#modal-detalle-factura',
  },
  {
    nombre: 'caja-ficha', que: 'Caja · la ficha de una persona', vista: true,
    url: '/modulos/caja.html?maqueta=caja', ver: '#vista-detalle-persona',
    pasos: async (page) => {
      // Bien abajo en el listado, para ver que la ficha arranca arriba.
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.locator('.lista-personas .tarjeta-lista').first().click();
    },
  },
  {
    // En el celular y la tablet, "Menú" lo abre en el lugar del contenido; en
    // la compu (desde 900 px) es la columna de la izquierda, siempre a la vista.
    nombre: 'gestion-menu', que: 'Gestión de producción · el menú', vista: false,
    url: '/modulos/produccion-gestion.html?maqueta=produccion-gestion', ver: '#pr-menu',
    pasos: async (page, ancho) => {
      if (ancho < 900) await page.locator('#pr-btn-menu').click();
      else await expect(page.locator('#pr-menu')).toBeVisible();
    },
  },
  {
    nombre: 'cobranzas-barra', que: 'Cobranzas · la barra de abajo', vista: false,
    url: '/modulos/cobranzas.html?maqueta=cobranzas', ver: '#cob-barra-listado',
  },
  {
    nombre: 'cheques-barra', que: 'Cheques · la barra de lo elegido', vista: false,
    url: '/modulos/administracion.html?seccion=cheques&maqueta=cheques-banco', ver: '#chq-barra-seleccion',
    pasos: async (page) => {
      await expect(page.locator('[data-cheque-fila="chq-1"]:visible').first()).toBeVisible();
      await page.locator('#chq-btn-seleccionar').click();
      await page.locator('[data-cheque-fila="chq-1"]:visible').first().click();
    },
  },
];

// Qué hay en el centro de cada barra (y del pie de la lateral).
async function barras(page) {
  return page.evaluate(() => {
    const out = {};
    const medir = (nombre, sel, dueno) => {
      const e = document.querySelector(sel);
      if (!e) { out[nombre] = 'no está'; return; }
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(e).display === 'none') { out[nombre] = 'escondida'; return; }
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { out[nombre] = 'fuera de la pantalla'; return; }
      const en = document.elementFromPoint(x, y);
      out[nombre] = en && en.closest(dueno) ? 'a la vista'
        : `tapada por ${en ? `${en.tagName.toLowerCase()}${en.id ? '#' + en.id : ''}.${String(en.className).trim().split(/\s+/).join('.')}` : 'nada'}`;
    };
    medir('lateral', '.barra-lateral', '.barra-lateral');
    medir('pie de la lateral', '.barra-lateral__pie', '.barra-lateral');
    medir('arriba', '.barra-arriba', '.barra-arriba');
    medir('abajo', '.barra-abajo', '.barra-abajo');
    return out;
  });
}

for (const p of PANTALLAS) {
  for (const { ancho, alto } of ANCHOS) {
    test(`${p.que}: no tapa las barras, a ${ancho} px`, async ({ page }, info) => {
      const errores = vigilarErrores(page);
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto(`${MAQUETA}${p.url}`);
      // La barra de la app ya dibujada (la lateral en la compu, la de abajo en el celular).
      await expect(page.locator(ancho >= 1024 ? '.barra-lateral' : '.barra-abajo')).toBeVisible();
      await expect(page.locator('.barra-arriba')).toBeVisible();
      if (p.pasos) await p.pasos(page, ancho);
      const ver = page.locator(p.ver);
      await expect(ver).toBeVisible();

      const posicion = await ver.evaluate(e => getComputedStyle(e).position);
      if (p.vista) {
        expect(posicion, 'la vista va dentro de la página, no encima de todo').not.toBe('fixed');
        await expect.poll(() => page.evaluate(() => window.scrollY), { message: 'la vista arranca arriba' }).toBe(0);
        const cab = ver.locator('header.cab-modulo').first();
        await expect(cab, 'el encabezado de los módulos').toBeVisible();
        await expect(cab.locator('.cab-modulo__volver')).toContainText('Volver');
        await expect(cab.locator('.cab-modulo__icono svg')).toBeVisible();
      }
      // Lo que no es vista arranca donde está: para mirar la barra de arriba
      // (que no se pega), la página va arriba.
      if (!p.vista) await page.evaluate(() => window.scrollTo(0, 0));

      const b = await barras(page);
      if (ancho >= 1024) {
        expect(b.lateral, 'la barra lateral').toBe('a la vista');
        expect(b['pie de la lateral'], 'el pie de la barra lateral (Personalizar)').toBe('a la vista');
        expect(b.abajo).toBe('escondida');
      } else {
        expect(b.abajo, 'la barra de abajo del celular').toBe('a la vista');
        expect(b.lateral).toBe('escondida');
      }
      expect(b.arriba, 'la barra de arriba (fábricas y usuario)').toBe('a la vista');

      const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
      expect(doc, 'sin scroll de costado').toBeLessThanOrEqual(vista);
      await captura(page, `esqueleto-${p.nombre}-${ancho}`, info);
      expect(errores).toEqual([]);
    });
  }
}

// Los encabezados de los módulos viejos: los mismos que los nuevos, con el
// color propio de cada módulo, a 1280 y a 390 px.
const MODULOS = [
  ['gastos', 'gastos', 'Gastos'], ['caja', 'caja', 'Caja'], ['cobranzas', 'cobranzas', 'Cobranzas'],
  ['cuentas-corrientes', 'cuentas-corrientes', 'Cuentas corrientes'], ['materia-prima', 'materia-prima', 'Ingreso'],
  ['stock', 'stock', 'Stock'], ['pedidos', 'pedidos', 'Pedidos'], ['conos', 'conos', 'Conos de papel'],
  ['accesos', 'tablero', 'Accesos'], ['empleados', 'empleados', 'Empleados'],
];
for (const ancho of [1280, 390]) {
  test(`los encabezados de los módulos viejos, iguales a los nuevos, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 800 });
    const colores = new Set();
    for (const [archivo, datos, titulo] of MODULOS) {
      await page.goto(`${MAQUETA}/modulos/${archivo}.html?maqueta=${datos}`);
      const cab = page.locator('header.cab-modulo').first();
      await expect(cab, archivo).toBeVisible();
      await expect(cab.locator('.cab-modulo__titulo'), archivo).toHaveText(titulo);
      await expect(cab.locator('.cab-modulo__volver'), archivo).toHaveText(/Volver/);
      const m = await cab.evaluate((h) => {
        const r = h.getBoundingClientRect();
        const icono = h.querySelector('.cab-modulo__icono');
        return {
          izq: r.left, der: r.right, alto: r.height,
          color: getComputedStyle(icono).color, fondo: getComputedStyle(icono).backgroundColor,
          letra: getComputedStyle(h.querySelector('.cab-modulo__titulo')).fontFamily,
          sombra: getComputedStyle(h).boxShadow,
        };
      });
      expect(m.letra, `${archivo}: el título en la letra de títulos`).toMatch(/Bricolage/);
      expect(m.sombra, `${archivo}: sin la tarjeta vieja`).toBe('none');
      expect(m.alto, `${archivo}: el alto del encabezado`).toBeLessThanOrEqual(120);
      if (ancho < 1024) {
        // Una franja de lado a lado.
        expect(Math.round(m.izq), `${archivo}: de borde a borde`).toBe(0);
        expect(Math.round(m.der), `${archivo}: de borde a borde`).toBe(ancho);
      }
      expect(m.color, `${archivo}: el ícono tiene color`).not.toBe(m.fondo);
      colores.add(m.color);
      const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
      expect(doc, `${archivo}: sin scroll de costado`).toBeLessThanOrEqual(vista);
    }
    expect(colores.size, 'cada módulo con su color').toBe(MODULOS.length);
    await captura(page, `esqueleto-encabezados-${ancho}`, info);
    expect(errores).toEqual([]);
  });
}
