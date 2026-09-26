// LA REVISIÓN VISUAL, SOLA (26/09/2026): cada pantalla que tiene datos en
// e2e/maqueta/datos, abierta en la maqueta (Supabase falso, sin sesión ni
// base) a 390 y a 1280 px. Falla si hay scroll horizontal o un error de
// JavaScript, y guarda una captura de cada una como artefacto. Corre SIEMPRE,
// sin credenciales.
//
// Una pantalla nueva es una entrada de PANTALLAS (y su archivo de datos).
//
// LA HOJA IMPRESA DE UNA ORDEN DE RETIRO SE MIDE SOLA: con 12 renglones
// (producto e insumos), las dos copias y la línea de corte tienen que entrar
// en una A4 con 8 mm de margen (281 mm útiles). Se mide en la Carga (sin
// precios) y en Administración (con precios, la más ancha).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';

// A4 (297 mm) menos 8 mm de margen arriba y abajo.
const ALTO_UTIL_A4_MM = 297 - 2 * 8;

// Mide la hoja que armó la pantalla en `contenedor`, como se imprime: con los
// estilos de impresión (emulateMedia) y en milímetros (96 px = 25,4 mm).
async function medirHoja(page, boton, contenedor, info, nombre) {
  await page.evaluate(() => { window.print = () => {} });
  await page.locator(boton).click();
  await page.emulateMedia({ media: 'print' });
  const m = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const mm = (px) => px / (96 / 25.4);
    const hoja = el.querySelector('.rh-hoja');
    const copias = [...el.querySelectorAll('.rh-copia')];
    return {
      copias: copias.length,
      altoHoja: hoja ? mm(hoja.getBoundingClientRect().height) : null,
      altoCopias: copias.map((c) => mm(c.getBoundingClientRect().height)),
      renglones: copias[0] ? copias[0].querySelectorAll('tbody tr').length : 0,
      insumos: copias[0] ? copias[0].querySelectorAll('tbody tr.rh-insumo').length : 0,
    };
  }, contenedor);
  await captura(page, `hoja-${nombre}`, info);
  await page.emulateMedia({ media: 'screen' });
  expect(m.copias, 'la hoja impresa tiene dos copias').toBe(2);
  expect(m.renglones, 'la orden de prueba tiene 12 renglones').toBe(12);
  expect(m.insumos, 'y algunos son insumos').toBeGreaterThan(0);
  expect(m.renglones - m.insumos, 'y otros son productos').toBeGreaterThan(0);
  expect(m.altoHoja, `las dos copias y el corte miden ${m.altoHoja?.toFixed(1)} mm y en la A4 entran ${ALTO_UTIL_A4_MM}`).toBeLessThanOrEqual(ALTO_UTIL_A4_MM);
  for (const a of m.altoCopias) expect(a, `una copia mide ${a.toFixed(1)} mm: más de media hoja`).toBeLessThanOrEqual(ALTO_UTIL_A4_MM / 2);
  console.log(`[hoja ${nombre}] ${m.renglones} renglones (${m.insumos} de insumos): ${m.altoHoja.toFixed(1)} mm de ${ALTO_UTIL_A4_MM}`);
}

// Sube un archivo al importador (el input escondido) y espera la vista previa.
async function subirAlImportador(page, nombre, contenido) {
  await page.locator('#ad-importar-archivo').setInputFiles({ name: nombre, mimeType: 'text/csv', buffer: Buffer.from(contenido, 'utf8') });
  await expect(page.locator('#ad-importar-pie')).toBeVisible();
}

// [archivo, datos, pasos opcionales para llegar a una vista]
// Un paso puede tener un tercer elemento: 'solo1280' (la hoja no depende del ancho).
const PANTALLAS = [
  ['modulos/retiros.html', 'retiros', [
    ['empresa', async (page) => { await page.locator('[data-empresa]').first().click() }],
    ['cargar', async (page) => {
      await page.locator('#rt-cliente-buscar').fill('turco')
      await page.locator('[data-cliente]').first().click()
      await page.locator('[data-r-producto]').first().click()
      await page.locator('[data-r-cajas="0"]').fill('3')
      await page.locator('[data-r-lote-abrir="0"]').click()
      // Un renglón de insumo, buscado por el buscador que filtra todo junto.
      await page.locator('#rt-agregar').click()
      await page.locator('[data-r-buscar="1"]').fill('harina')
      await page.locator('[data-r-insumo="1"]').first().click()
      await page.locator('[data-r-cantidad="1"]').fill('25,5')
      await expect(page.locator('.rt-sello--insumo').first()).toBeVisible()
    }],
    ['resumen', async (page) => { await page.locator('#rt-revisar').click(); await expect(page.locator('#rt-resumen')).toContainText('25,5 kg') }],
    ['hecho', async (page) => { await page.locator('#rt-confirmar').click(); await expect(page.locator('.rt-codigo-grande')).toBeVisible() }],
    ['hoja', async (page, info) => { await medirHoja(page, '#rt-hecho-imprimir', '#rt-impresion', info, 'carga') }, 'solo1280'],
  ]],
  ['modulos/administracion.html', 'administracion', [
    ['portada', async () => {}],
    ['ordenes', async (page) => { await page.locator('[data-seccion="ordenes"]').click(); await expect(page.locator('[data-orden]').first()).toBeVisible() }],
    ['orden-con-insumos', async (page) => { await page.locator('[data-orden="o12"]').click(); await expect(page.locator('#ad-orden-cuerpo')).toContainText('250,5 kg') }],
    ['hoja', async (page, info) => { await medirHoja(page, '#ad-btn-imprimir', '#ad-impresion', info, 'administracion') }, 'solo1280'],
    ['valorizar', async (page) => { await page.locator('#ad-orden-volver').click(); await page.locator('[data-orden="o1"]').click(); await page.locator('#ad-btn-valorizar').click(); await expect(page.locator('[data-precio]').first()).toBeVisible() }],
    ['clientes', async (page) => { await page.locator('#ad-orden-volver').click(); await page.locator('#ad-ordenes-volver').click(); await page.locator('[data-seccion="clientes"]').click(); await expect(page.locator('[data-cliente]').first()).toBeVisible() }],
    ['ficha', async (page) => { await page.locator('[data-cliente="c1"]').click(); await page.locator('#ad-btn-ficha').click(); await expect(page.locator('#ad-f-nombre')).toHaveValue(/Anatolia/) }],
    ['listas', async (page) => { await page.locator('#ad-ficha-volver').click(); await page.locator('#ad-cliente-volver').click(); await page.locator('#ad-clientes-volver').click(); await page.locator('[data-seccion="listas"]').click(); await page.locator('[data-lista="l1"]').click(); await expect(page.locator('[data-precio-lista]').first()).toBeVisible(); await expect(page.locator('#ad-lista-grilla')).toContainText('Materia prima e insumos') }],
    ['importar-clientes', async (page) => {
      await page.locator('#ad-lista-volver').click(); await page.locator('#ad-listas-volver').click(); await page.locator('[data-seccion="importar"]').click()
      await subirAlImportador(page, 'clientes.csv', 'Nombre,CUIT,Mail,CBU\nAlmacén Don José,20-12345678-6,jose@x.com,2850590940090418135201\nMal CUIT,30719434778,,\nMail malo,,juan@@gmail,\nKiosco Pepe,,,\n')
      await expect(page.locator('#ad-importar-cuenta')).toHaveText('4 filas: 1 bien, 3 con errores, 0 se ignoran.')
      await page.locator('#ad-importar-guardar').click()
      await expect(page.locator('#ad-importar-confirmar')).toBeVisible()
    }],
    ['importar-precios', async (page) => {
      await page.locator('[data-importar-tipo="precios"]').click()
      await page.locator('#ad-importar-lista').selectOption('l1')
      await subirAlImportador(page, 'precios.csv', 'Código (no tocar),Precio nuevo\npr1,3.300\nins:ins-1,820\nzzz,10\n')
      await expect(page.locator('#ad-importar-vista-previa')).toContainText('no es de un producto ni de un insumo')
    }],
    ['importar-saldos', async (page) => {
      await page.locator('[data-importar-tipo="saldos"]').click()
      await subirAlImportador(page, 'saldos.csv', 'Código (no tocar),Saldo inicial\nc1,50000\nc2,"-1.500,50"\n')
    }],
    ['cheques', async (page) => {
      await page.locator('#ad-importar-volver').click(); await page.locator('[data-seccion="cheques"]').click()
      await expect(page.locator('#chq-cartera')).toContainText('En cartera')
      await expect(page.locator('#ad-empresas')).toBeHidden()
    }],
    ['cheques-salidos', async (page) => { await page.locator('#chq-chips-estado button', { hasText: 'Salidos' }).click(); await expect(page.locator('#chq-leyenda')).toBeVisible() }],
  ]],
  ['modulos/pedidos.html', 'pedidos', [
    ['lista', async (page) => { await expect(page.locator('[data-pedido]').first()).toBeVisible() }],
    ['detalle', async (page) => { await page.locator('[data-pedido="pe1"]').click(); await expect(page.locator('#pe-btn-imprimir')).toBeVisible() }],
    ['clientes', async (page) => { await page.locator('#pe-detalle-volver').click(); await page.locator('#pe-btn-clientes').click(); await expect(page.locator('#pe-clientes-lista')).toContainText('Anatolia') }],
    ['cargar', async (page) => { await page.locator('#pe-clientes-volver').click(); await page.locator('#pe-btn-nuevo').click() }],
  ]],
  ['modulos/produccion-gestion.html', 'produccion-gestion', [
    ['indicadores', async (page) => { await expect(page.locator('body')).toContainText('lote 7021') }],
    ['personal', async (page) => {
      if (await page.locator('#pr-btn-menu').isVisible()) await page.locator('#pr-btn-menu').click()
      await page.locator('[data-ir-config="personal"]').first().click()
      await expect(page.locator('body')).toContainText('Agustín Barrera')
    }],
    ['conos', async (page) => {
      if (await page.locator('#pr-btn-menu').isVisible()) await page.locator('#pr-btn-menu').click()
      await page.locator('[data-ir-config="marcas"]').first().click()
      // El nombre del pendiente va en un campo (se corrige al aceptar): se afirma el grupo.
      await expect(page.locator('body')).toContainText('Por revisar · 1')
    }],
  ]],
];

for (const [archivo, datos, pasos] of PANTALLAS) {
  for (const ancho of [390, 1280]) {
    test(`maqueta: ${archivo} a ${ancho} px, sin scroll horizontal ni errores`, async ({ page }, info) => {
      await page.setViewportSize({ width: ancho, height: ancho < 800 ? 844 : 900 });
      const errores = vigilarErrores(page);
      await page.goto(`${MAQUETA}/${archivo}?maqueta=${datos}`);
      for (const [nombre, paso, cuando] of pasos) {
        if (cuando === 'solo1280' && ancho !== 1280) continue
        await test.step(nombre, async () => {
          await paso(page, info);
          await page.waitForTimeout(150);
          const { ancho: doc, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth }));
          expect(doc, `scroll horizontal en ${nombre}: el documento mide ${doc} px y la pantalla ${vista}`).toBeLessThanOrEqual(vista);
          await captura(page, `maqueta-${datos}-${nombre}-${ancho}`, info);
        });
      }
      expect(errores, errores.join('\n')).toEqual([]);
    });
  }
}
