// El cliente PROVISORIO (06/10/2026), en la maqueta, a 390 y 1280 px:
//  - Órdenes de retiro: el cliente no está → "+ Cliente nuevo" → datos →
//    "¿Es alguno de estos?" (los parecidos de la lista local: el depósito no
//    puede usar buscar_clientes) → "No es ninguno" → la orden sigue con él,
//    con el chip "Provisorio".
//  - Administración → Clientes: el provisorio arriba con su chip, la burbuja
//    de la pestaña, "Unir con un cliente existente" con su vista previa y su
//    confirmación propia, y "Completar y confirmar" (la ficha).
//  - Valorizar una orden de un provisorio sin lista: "Primero asigná la lista".
// Sin scroll horizontal, sin errores, y cada botón que se toca, entero a la
// vista. Corre SIEMPRE, sin credenciales. Lo propio entra con
// 'maqueta.cambios' (no se tocan los datos que usan otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function sinScroll(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// El botón entero adentro de la pantalla y nada encima de su centro.
async function alAlcance(page, selector) {
  const loc = page.locator(selector);
  await loc.scrollIntoViewIfNeeded();
  const r = await loc.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const arriba = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { izq: b.left, der: b.right, ancho: window.innerWidth, propio: !!arriba && (arriba === el || el.contains(arriba)) };
  });
  expect(r.izq, `${selector} se sale por la izquierda`).toBeGreaterThanOrEqual(0);
  expect(r.der, `${selector} se sale por la derecha`).toBeLessThanOrEqual(r.ancho);
  expect(r.propio, `${selector}: hay algo encima`).toBe(true);
}

async function conCambios(page, url, cambios) {
  await page.goto(url);
  await page.evaluate((c) => sessionStorage.setItem('maqueta.cambios', JSON.stringify(c)), cambios);
  await page.reload();
}

const PROVISORIO = { id: 'c-prov', unidad_negocio_id: 'u-n', nombre: 'KIOSCO PEPITO', razon_social: null, apodos: [], cuit: null,
  localidad: 'Villa María', telefono: '351 555 1234', activo: true, provisorio: true, lista_precio_id: null, limite_credito: null, codigo_anterior: null };
const ANATOLIA = { id: 'c1', unidad_negocio_id: 'u-n', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: ['el Turco'],
  cuit: '30712345678', localidad: 'Córdoba', activo: true, provisorio: false, lista_precio_id: 'l1', limite_credito: 100000, codigo_anterior: 101 };
const PEPE = { id: 'c2', unidad_negocio_id: 'u-n', nombre: 'Kiosco Pepe', razon_social: null, apodos: [], cuit: null, localidad: null,
  activo: true, provisorio: false, lista_precio_id: null, limite_credito: null, codigo_anterior: null };
const SALDO = (c, saldo) => ({ cliente_id: c.id, nombre: c.nombre, razon_social: c.razon_social, cuit: c.cuit, lista: c.lista_precio_id ? 'Mayoristas' : null,
  saldo, retiros_mes: 0, es_tambien_proveedor: false, activo: true, codigo_anterior: c.codigo_anterior });

for (const ancho of [390, 1280]) {
  test(`retiros: cargar un cliente nuevo (provisorio), a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await conCambios(page, `${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { rpc: { crear_cliente_provisorio: 'c-nuevo' } });
    await page.locator('[data-empresa="u-n"]').first().click();
    await page.locator('#rt-cliente-buscar').fill('Kiosco Pepito');
    await alAlcance(page, '#rt-cliente-nuevo-abrir');
    await page.locator('#rt-cliente-nuevo-abrir').click();
    await expect(page.locator('#rt-nuevo-nombre')).toHaveValue('Kiosco Pepito');
    // El teléfono es un identificador: se escribe tal cual.
    await page.locator('#rt-nuevo-telefono').fill('0351 15-555 1234');
    await page.locator('#rt-nuevo-localidad').fill('Villa María');
    await alAlcance(page, '#rt-nuevo-seguir');
    await page.locator('#rt-nuevo-seguir').click();
    // Primero, los parecidos.
    await expect(page.locator('#rt-cliente-nuevo')).toContainText('¿Es alguno de estos?');
    await expect(page.locator('#rt-nuevo-parecidos [data-cliente="c2"]')).toBeVisible();
    await captura(page, `provisorio-parecidos-${ancho}`, info);
    await sinScroll(page);
    await alAlcance(page, '#rt-nuevo-crear');
    await page.locator('#rt-nuevo-crear').click();
    // La orden sigue con el cliente nuevo.
    const elegido = page.locator('#rt-cliente-elegido');
    await expect(elegido).toContainText('KIOSCO PEPITO');
    await expect(elegido.locator('.rt-sello--provisorio')).toHaveText('Provisorio');
    await captura(page, `provisorio-elegido-${ancho}`, info);
    await sinScroll(page);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`retiros: sin nombre no se carga, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`);
    await page.locator('[data-empresa="u-n"]').first().click();
    await page.locator('#rt-cliente-buscar').fill('xy');
    await page.locator('#rt-cliente-nuevo-abrir').click();
    await page.locator('#rt-nuevo-seguir').click();
    await expect(page.locator('#rt-nuevo-error')).toHaveText('Escribí el nombre del cliente (al menos 3 letras).');
    await expect(page.locator('#rt-nuevo-parecidos')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`administración: el provisorio arriba, unir y completar, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await conCambios(page, `${MAQUETA}/modulos/administracion.html?maqueta=administracion`, {
      tablas: {
        clientes: [ANATOLIA, PEPE, PROVISORIO],
        ordenes_retiro: [{ id: 'o-p1', cliente_id: 'c-prov', unidad_negocio_id: 'u-n' }, { id: 'o-p2', cliente_id: 'c-prov', unidad_negocio_id: 'u-n' }],
        cobranzas: [{ id: 'k1', cliente_id: 'c-prov' }],
        pedidos: [],
        cliente_movimientos: [{ cliente_id: 'c-prov', importe: 15000 }],
      },
      rpc: { clientes_con_saldo: [SALDO(ANATOLIA, 126000), SALDO(PEPE, 0), SALDO(PROVISORIO, 15000)], unir_clientes: 'c1', confirmar_cliente: null },
    });
    // La burbuja de la pestaña Clientes cuenta el provisorio.
    await expect(page.locator('[data-pestana="clientes"] .ad-pestana__burbuja').first()).toHaveText('1');
    await page.locator('[data-pestana="clientes"]').first().click();
    const lista = page.locator('#ad-clientes-lista');
    await expect(lista.locator('[data-cliente]').first()).toHaveAttribute('data-cliente', 'c-prov');
    await expect(lista.locator('.ad-sello--provisorio')).toHaveText('Provisorio');
    await captura(page, `provisorio-lista-${ancho}`, info);
    await sinScroll(page);
    // Unir con un cliente existente.
    await alAlcance(page, '[data-provisorio-unir="c-prov"]');
    await page.locator('[data-provisorio-unir="c-prov"]').click();
    await expect(page.locator('#ad-panel-unir')).toBeVisible();
    await page.locator('#ad-unir-buscar').fill('anat');
    await page.locator('[data-unir-destino="c1"]').click();
    const previa = page.locator('#ad-unir-previa');
    await expect(previa).toContainText('Pasan a Distribuidora Anatolia: 2 órdenes de retiro, 1 cobranza y');
    // El usuario de la maqueta no tiene pedidos:ver: se dice, nunca un 0.
    await expect(previa).toContainText('los pedidos (con tu usuario no se pueden contar)');
    await expect(previa).toContainText('KIOSCO PEPITO queda apagado y su nombre queda como apodo de Distribuidora Anatolia.');
    await alAlcance(page, '#ad-unir-pedir');
    await page.locator('#ad-unir-pedir').click();
    await expect(page.locator('#ad-unir-cuerpo')).toContainText('¿Unir a KIOSCO PEPITO con Distribuidora Anatolia?');
    await captura(page, `provisorio-unir-${ancho}`, info);
    await sinScroll(page);
    await alAlcance(page, '#ad-unir-si');
    await page.locator('#ad-unir-si').click();
    await expect(page.locator('#ad-panel-unir')).toBeHidden();
    // Completar y confirmar: la ficha de siempre.
    await page.locator('[data-provisorio-completar="c-prov"]').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    await expect(page.locator('#ad-ficha-provisorio')).toBeVisible();
    await expect(page.locator('#ad-ficha-guardar')).toHaveText('Guardar y confirmar');
    await captura(page, `provisorio-ficha-${ancho}`, info);
    await sinScroll(page);
    await alAlcance(page, '#ad-ficha-guardar');
    await page.locator('#ad-ficha-guardar').click();
    await expect(page.locator('#ad-vista-cliente')).toBeVisible();
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`administración: valorizar a un provisorio sin lista avisa, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await conCambios(page, `${MAQUETA}/modulos/administracion.html?maqueta=administracion`, {
      tablas: {
        clientes: [ANATOLIA, PEPE, PROVISORIO],
        ordenes_retiro: [{ id: 'o-prov', numero: 99, codigo: 'N-0099', unidad_negocio_id: 'u-n', fecha: '2026-10-05', estado: 'confirmada', estado_valorizacion: 'pendiente',
          total: 0, moneda: 'ARS', cliente_id: 'c-prov', cargada_por: 'emp-1', cargada_en: '2026-10-05T15:00:00Z', transporte: null, observaciones: null }],
        orden_retiro_items: [{ id: 'it-p', orden_id: 'o-prov', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 5, unidades: 500, precio_caja: null, subtotal: null, lote: null }],
      },
      rpc: { clientes_con_saldo: [SALDO(ANATOLIA, 126000), SALDO(PEPE, 0), SALDO(PROVISORIO, 0)] },
    });
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('[data-orden="o-prov"]').click();
    await alAlcance(page, '#ad-btn-valorizar');
    await page.locator('#ad-btn-valorizar').click();
    await expect(page.locator('#ad-falta-lista')).toContainText('Primero asigná la lista de precios a KIOSCO PEPITO');
    await expect(page.locator('[data-precio]')).toHaveCount(0);
    await captura(page, `provisorio-sin-lista-${ancho}`, info);
    await sinScroll(page);
    await alAlcance(page, '#ad-falta-lista-ficha');
    await page.locator('#ad-falta-lista-ficha').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    await expect(page.locator('#ad-ficha-guardar')).toHaveText('Guardar y confirmar');
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
