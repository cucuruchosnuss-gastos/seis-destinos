// Producto terminado desde el Ingreso de materia prima (26/10/2026, rama
// ci-prueba/ingreso-terminado-desde-mp), en la maqueta "ingreso-terminado-mp"
// (Rodrigo Arrascaeta trae la Capelina Grande a Cucuruchos Nuss, lote vigente
// 310476). Lo que se mira, a 390, 360, la tablet (1000×540) y 1280, sin scroll
// horizontal ni errores:
//  - Rodrigo → la oferta "+ Capelina Grande" (solo lo suyo y con presentación);
//    el renglón con la presentación elegida, las cajas, "Último lote: 310476.
//    ¿Sigue siendo este?" → Sí (campo de solo lectura); lo que falta se dice
//    antes de seguir; el resumen; el error de la base tal cual y el reintento
//    con el MISMO p_client_uuid; una sola llamada a ingresar_producto_terminado
//    y NINGÚN insert de materia prima (es solo producto terminado);
//  - "No, es otro" (el foco al campo, en mayúsculas, 40 como mucho) buscando
//    "capelina" en el catálogo, junto con un insumo: se graban por separado
//    (primero el producto terminado, después los insumos) y el resumen
//    muestra las dos partes.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[390, 860], [360, 780], [1000, 540], [1280, 860]];

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// Las llamadas a la base (rpc e insert), como las anota la maqueta en la consola.
function anotar(page) {
  const pendientes = [];
  page.on('console', m => {
    const t = m.text();
    if (!t.startsWith('[maqueta] rpc') && !t.startsWith('[maqueta] insert')) return;
    const [, nombre, params] = m.args();
    const tipo = t.startsWith('[maqueta] rpc') ? 'rpc' : 'insert';
    pendientes.push(Promise.all([nombre?.jsonValue(), params?.jsonValue()])
      .then(([n, p]) => ({ tipo, nombre: n, params: p }), () => ({ tipo, nombre: null, params: null })));
  });
  return { leidas: () => Promise.all(pendientes) };
}

// Nuevo ingreso sin comprobante, en Cucuruchos Nuss, de Rodrigo (del padrón).
async function abrirConRodrigo(page, ancho, alto) {
  await page.setViewportSize({ width: ancho, height: alto });
  await page.goto(`${MAQUETA}/modulos/materia-prima.html?maqueta=ingreso-terminado-mp`);
  await page.locator('#btn-abrir-wizard').click();
  await page.locator('#btn-sin-comprobante').click();
  await expect(page.locator('#wz-paso-datos')).toBeVisible();
  await page.locator('#campo-fecha').fill('2026-10-26');
  await page.locator('#campo-unidad-negocio').selectOption('u-n');
  await page.locator('#campo-buscar-proveedor').fill('rodri');
  await page.locator('#wz-sugerencias-proveedor [data-proveedor="prov-rodrigo"]').click();
  await page.locator('#btn-datos-continuar').click();
  await expect(page.locator('#wz-paso-items')).toBeVisible();
}

for (const [ancho, alto] of TAMANOS) {
  test(`Rodrigo → Capelina Grande, lote vigente "Sí", a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const base = anotar(page);
    await abrirConRodrigo(page, ancho, alto);

    // La oferta: solo la Capelina Grande (la Chica no tiene presentación
    // activa; el Cono Nº 1 no es de Rodrigo).
    const oferta = page.locator('.terminado-mp__oferta');
    await expect(oferta).toContainText('RODRIGO ARRASCAETA también trae producto terminado.');
    await expect(page.locator('[data-pt-agregar]')).toHaveCount(1);
    await expect(page.locator('[data-pt-agregar="pt-capelina"]')).toHaveText('＋ Capelina Grande');
    await page.locator('[data-pt-agregar="pt-capelina"]').click();

    const renglon = page.locator('[data-pt-renglon]');
    await expect(renglon).toHaveCount(1);
    await expect(renglon.locator('.chip-terminado')).toHaveText('Producto terminado');
    await expect(renglon.locator('[data-pt-campo="presentacionId"]')).toHaveValue('pr-capelina-caja');
    await expect(renglon.locator('.terminado-mp__pregunta')).toHaveText('Último lote: 310476. ¿Sigue siendo este?');
    await expect(renglon.locator('[data-pt-campo="lote"]')).toHaveCount(0);

    // Lo que falta se dice antes de seguir.
    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('[data-pt-error]')).toHaveText('Renglón 1: las cajas tienen que ser un número entero mayor que cero.');
    await renglon.locator('[data-pt-campo="cajas"]').fill('44');
    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('[data-pt-error]')).toHaveText('Renglón 1: contestá si el lote sigue siendo 310476.');
    await renglon.locator('[data-pt-lote="si"]').click();
    await expect(renglon.locator('[data-pt-lote="si"]')).toHaveAttribute('aria-pressed', 'true');
    const lote = renglon.locator('[data-pt-campo="lote"]');
    await expect(lote).toHaveValue('310476');
    await expect(lote).toHaveAttribute('readonly', '');
    await page.locator('[data-pt-campo="remito"]').fill('0001-00004400');
    await sinScrollHorizontal(page);
    await captura(page, `mp-terminado-si-${ancho}`, info);

    // El resumen antes de confirmar: es solo producto terminado.
    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('#wz-paso-confirmar')).toBeVisible();
    await expect(page.locator('#wz-resumen')).toContainText('Producto terminado');
    await expect(page.locator('#wz-resumen')).toContainText('1 producto · 44 cajas');
    await expect(page.locator('#wz-resumen')).toContainText('RODRIGO ARRASCAETA');
    await expect(page.locator('#wz-detalle-terminados')).toContainText('Capelina Grande');
    await expect(page.locator('#wz-detalle-terminados')).toContainText('310476');
    await expect(page.locator('#wz-detalle-terminados')).toContainText('0001-00004400');
    await expect(page.locator('#wz-aviso-circuito')).toContainText('Es solo producto terminado');
    await sinScrollHorizontal(page);

    // La base dice que no: el texto tal cual, y se puede reintentar.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { ingresar_producto_terminado: 'ERROR:Renglón 1: ese producto es de otra fábrica.' } } });
    await page.locator('#btn-confirmar-ingreso').click();
    await expect(page.locator('#wz-error-guardado')).toHaveText('Renglón 1: ese producto es de otra fábrica.');
    await expect(page.locator('#btn-confirmar-ingreso')).toBeEnabled();
    await page.evaluate(() => { globalThis.__maqueta = null });
    await page.locator('#btn-confirmar-ingreso').click();
    await expect(page.locator('#pantalla-ingresos')).toBeVisible();
    await expect(page.getByText('Ingreso cargado: 44 cajas de producto terminado.')).toBeVisible();
    const cartel = page.locator('#mp-resumen-guardado');
    await expect(cartel).toBeVisible();
    await expect(cartel, 'el cartel, a la vista').toBeInViewport();
    await expect(cartel).toContainText('Capelina Grande (Caja) · 44 cajas · lote 310476');
    await sinScrollHorizontal(page);
    await captura(page, `mp-terminado-guardado-${ancho}`, info);

    const llamadas = await base.leidas();
    const ingresos = llamadas.filter(l => l.nombre === 'ingresar_producto_terminado');
    expect(ingresos.length, 'dos intentos').toBe(2);
    expect(ingresos[0].params.p_client_uuid, 'el reintento manda el MISMO uuid').toBe(ingresos[1].params.p_client_uuid);
    expect(ingresos[1].params).toEqual({
      p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-26', p_proveedor_id: 'prov-rodrigo', p_unidad_origen_id: null,
      p_remito: '0001-00004400',
      p_items: [{ presentacion_id: 'pr-capelina-caja', marca_id: null, cajas: 44, lote: '310476', precio_caja: null }],
      p_observaciones: null, p_client_uuid: ingresos[0].params.p_client_uuid,
    });
    expect(llamadas.filter(l => l.tipo === 'insert').map(l => l.nombre), 'solo producto terminado: ningún insert de materia prima').toEqual([]);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Capelina Grande buscada, lote "No, es otro", con un insumo, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const base = anotar(page);
    await abrirConRodrigo(page, ancho, alto);

    // Un renglón a mano: "capelina" encuentra el producto terminado de ESTA
    // fábrica (no el de Dolce), marcado.
    await page.locator('#btn-agregar-item').click();
    await page.locator('#wz-lista-items [data-rol="buscador-catalogo"]').fill('capeli');
    const sug = page.locator('[data-rol="sugerencias-catalogo"] [data-terminado]');
    await expect(sug).toHaveCount(1);
    await expect(sug).toHaveAttribute('data-terminado', 'pt-capelina');
    await expect(sug).toContainText('Producto terminado');
    await sug.click();
    // Salió de los insumos y es un renglón de producto terminado.
    await expect(page.locator('#wz-lista-items .item-mp')).toHaveCount(0);
    const renglon = page.locator('[data-pt-renglon]');
    await expect(renglon).toHaveCount(1);

    await renglon.locator('[data-pt-lote="otro"]').click();
    const lote = renglon.locator('[data-pt-campo="lote"]');
    await expect(lote).toBeFocused();
    await expect(lote).toHaveValue('');
    await expect(lote).toHaveAttribute('required', '');
    await expect(lote).toHaveAttribute('maxlength', '40');
    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('[data-pt-error]')).toContainText('Renglón 1:');
    await renglon.locator('[data-pt-campo="cajas"]').fill('44');
    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('[data-pt-error]')).toHaveText('Renglón 1: escribí el lote.');
    await lote.pressSequentially('l-2610');
    await expect(lote).toHaveValue('L-2610');
    // (el ancho de 15 px es el de todos los campos del wizard)

    // Y un insumo: la caja corrugada, 10 unidades sueltas.
    await page.locator('#btn-agregar-item').click();
    await page.locator('#wz-lista-items [data-rol="buscador-catalogo"]').fill('caja');
    await page.locator('#wz-lista-items [data-insumo="ins-caja"]').click();
    await page.locator('[data-accion="interp-granel"]').click();
    await page.locator('[data-campo="numeroPapel"]').fill('10');
    await sinScrollHorizontal(page);
    await captura(page, `mp-terminado-otro-${ancho}`, info);

    await page.locator('#btn-items-continuar').click();
    await expect(page.locator('#wz-paso-confirmar')).toBeVisible();
    await expect(page.locator('#wz-resumen')).toContainText('Insumos');
    await expect(page.locator('#wz-resumen')).toContainText('1 producto · 44 cajas');
    await expect(page.locator('#wz-detalle-items')).toContainText('Caja corrugada');
    await expect(page.locator('#wz-detalle-terminados')).toContainText('L-2610');
    await page.locator('#btn-confirmar-ingreso').click();
    await expect(page.locator('#pantalla-ingresos')).toBeVisible();
    await expect(page.getByText('Ingreso cargado: 1 insumo y 44 cajas de producto terminado.')).toBeVisible();
    const cartel = page.locator('#mp-resumen-guardado');
    await expect(cartel).toContainText('Insumos y materia prima');
    await expect(cartel, 'el cartel, a la vista').toBeInViewport();
    await expect(cartel).toContainText('Caja corrugada');
    await expect(cartel).toContainText('Capelina Grande (Caja) · 44 cajas · lote L-2610');
    await sinScrollHorizontal(page);
    await captura(page, `mp-terminado-mixto-${ancho}`, info);
    await cartel.locator('[data-resumen-cerrar]').click();
    await expect(cartel).toBeHidden();

    // Por separado y en ese orden: primero el producto terminado, después los insumos.
    const llamadas = (await base.leidas()).filter(l => l.nombre === 'ingresar_producto_terminado' || l.tipo === 'insert');
    expect(llamadas.map(l => l.nombre)).toEqual(['ingresar_producto_terminado', 'materia_prima_ingresos', 'materia_prima_items']);
    expect(llamadas[0].params.p_items).toEqual([{ presentacion_id: 'pr-capelina-caja', marca_id: null, cajas: 44, lote: 'L-2610', precio_caja: null }]);
    expect(llamadas[2].params.map(f => f.insumo_id), 'los insumos no llevan el producto terminado').toEqual(['ins-caja']);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
