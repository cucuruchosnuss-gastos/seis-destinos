// REVISAR LOS REMITOS PRECARGADOS DE ROSARIO (27/10/2026, rama
// ci-prueba/remitos-rosario-revisar), en la maqueta "administracion-remitos"
// (Dolce Pasta con controla_stock_terminado = false; Nuss con control), a 390
// y 1280 px, sin scroll horizontal ni errores de JS:
//  - Órdenes de Dolce: "Remitos precargados · por revisar" (4: leyendo, error,
//    precargada y la de acopio; la confirmada no), el más nuevo arriba; abajo
//    las órdenes por N° de remito en solapas Oficial / Acopio;
//  - abrir uno: la foto firmada (con zoom), los renglones en AMARILLO con lo
//    leído y la nota; Aceptar sugerencia; elegir el producto saca el amarillo;
//    los lotes "Asignado X de Y · faltan Z"; "No va en la orden"; el cliente;
//    Guardar manda los renglones bien a actualizar_remito_precarga;
//  - Confirmar: el error de la base TAL CUAL con "Descartar (ya ingresado)", y
//    después OK: sale de la lista;
//  - Descartar con motivo; Volver a leer (ocr-remito);
//  - la ficha y la hoja de impresión: "Remito N° X" / "Acopio N° X";
//  - Nuss: Órdenes como siempre, sin la sección.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// La foto del remito (un dibujo): la firma de la maqueta la devuelve como data:.
const FOTO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fffdf5"/>' +
  '<text x="380" y="50" font-size="22" fill="#222">0001-00003100</text><text x="30" y="120" font-size="20">Señor/es: Almacen Rosario</text>' +
  '<text x="30" y="200" font-size="20">10  Cono dulce 48 con cono Lelona</text><text x="30" y="240" font-size="20">84  Capelinas grandes</text></svg>');

async function abrirOrdenes(page, unidad) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion-remitos`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((u) => { localStorage.setItem('barraUnidad.elegida', u); }, unidad);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate((foto) => {
    window.print = () => {};
    globalThis.__maqueta = { rpc: {}, funciones: {}, firmar: (bucket, ruta) => ({ data: { signedUrl: bucket === 'comprobantes' && /remitos/.test(ruta) ? foto : null }, error: null }) };
  }, FOTO);
  await page.locator('[data-pestana="ordenes"]').first().click();
  await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
}

const renglon = (page, i) => page.locator(`#ad-remito-cuerpo [data-rm-renglon="${i}"]`);

for (const [ancho, alto] of TAMANOS) {
  test(`Dolce: la lista de remitos, las órdenes por N° de remito y la hoja, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrdenes(page, 'u-d');
    const seccion = page.locator('#ad-remitos');
    await expect(seccion).toContainText('Remitos precargados · por revisar');
    await expect(seccion.locator('[data-remitos-cuenta]')).toHaveText('4');
    expect(await seccion.locator('[data-remito]').evaluateAll(bs => bs.map(b => b.dataset.remito))).toEqual(['rm-3', 'rm-2', 'rm-1', 'rm-4']);
    await expect(seccion.locator('[data-remito="rm-2"]')).toContainText('La foto está muy oscura');
    await expect(seccion.locator('[data-remito="rm-1"]')).toContainText('4 en amarillo');
    await expect(seccion.locator('[data-remito="rm-4"]')).toContainText('Acopio N° 977492');

    // Abajo: las órdenes oficiales por N° de remito (las sin número al final).
    const lista = page.locator('#ad-ordenes-lista');
    await expect(lista.locator('[data-orden]').first()).toBeVisible();
    expect(await lista.locator('[data-orden]').evaluateAll(bs => bs.map(b => b.dataset.orden))).toEqual(['od3', 'od1', 'od2', 'od5']);
    await expect(lista.locator('[data-orden="od3"]')).toContainText('Remito N° 0001-00003099');
    await expect(lista.locator('[data-orden="od3"]')).toContainText('Sin valorizar');
    await expect(lista.locator('[data-orden="od1"]')).toContainText('Valorizada');
    await expect(lista.locator('[data-orden="od2"]')).toContainText('Sin N° de remito');
    await sinScrollHorizontal(page);
    await captura(page, `remitos-lista-${ancho}`, info);
    await page.locator('[data-talonario-ordenes="acopio"]').click();
    expect(await lista.locator('[data-orden]').evaluateAll(bs => bs.map(b => b.dataset.orden))).toEqual(['od4', 'od6']);
    await expect(lista.locator('[data-orden="od4"]')).toContainText('Acopio N° 977490');
    await expect(lista.locator('[data-orden="od4"] .ad-sello--acopio')).toBeVisible();

    // La ficha y la hoja de impresión de la de acopio.
    await lista.locator('[data-orden="od4"]').click();
    await expect(page.locator('#ad-orden-cuerpo [data-orden-remito]')).toHaveText('Acopio N° 977490');
    await expect.poll(() => page.locator('#ad-impresion').innerHTML()).toContain('<span class="rh-orden__remito">Acopio N° 977490</span>');
    // Y una oficial.
    await page.locator('#ad-orden-volver').click();
    await page.locator('[data-talonario-ordenes="oficial"]').click();
    await page.locator('#ad-ordenes-lista [data-orden="od3"]').click();
    await expect(page.locator('#ad-orden-cuerpo [data-orden-remito]')).toHaveText('Remito N° 0001-00003099');
    await expect.poll(() => page.locator('#ad-impresion').innerHTML()).toContain('<span class="rh-orden__remito">Remito N° 0001-00003099</span>');
    // La hoja impresa: el remito entra en el recuadro de la orden.
    await page.emulateMedia({ media: 'print' });
    const recuadro = await page.evaluate(() => {
      const r = document.querySelector('#ad-impresion .rh-orden__remito');
      const caja = r?.closest('.rh-orden')?.getBoundingClientRect();
      const b = r?.getBoundingClientRect();
      return r ? { dentro: b.left >= caja.left - 0.5 && b.right <= caja.right + 0.5, cortado: r.scrollWidth > r.clientWidth + 1 } : null;
    });
    await page.emulateMedia({ media: 'screen' });
    expect(recuadro).toEqual({ dentro: true, cortado: false });
    await sinScrollHorizontal(page);
    await captura(page, `remitos-ficha-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Dolce: revisar un remito con amarillos, guardar y confirmar, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrdenes(page, 'u-d');
    await page.locator('#ad-remitos [data-remito="rm-1"]').click();
    await expect(page.locator('#ad-vista-remito')).toBeVisible();
    await expect(page.locator('#ad-remito-titulo')).toHaveText('Remito N° 0001-00003100');
    // La foto, firmada, con zoom.
    await expect.poll(() => page.locator('[data-rm-foto]').getAttribute('src').catch(() => null)).toMatch(/^data:image\/svg/);
    await page.locator('[data-rm-zoom="1"]').click();
    await expect(page.locator('.ad-rm-foto__nivel')).toHaveText('150 %');
    // En la compu, la foto al lado; en el celular, arriba.
    const pos = await page.evaluate(() => {
      const f = document.querySelector('.ad-rm__foto').getBoundingClientRect();
      const d = document.querySelector('.ad-rm__datos').getBoundingClientRect();
      return { lado: f.right <= d.left + 1, arriba: f.bottom <= d.top + 1 };
    });
    expect(ancho >= 1024 ? pos.lado : pos.arriba).toBe(true);

    // Los amarillos, con lo leído y la nota.
    await expect(renglon(page, 0)).toHaveClass(/ad-rm-renglon--revisar/);
    await expect(renglon(page, 0)).toContainText('Leído: «Cono dulce 48 con cono Lelona»');
    await expect(renglon(page, 0)).toContainText('leí Lelona, ¿LEROMA?');
    await expect(renglon(page, 1)).toHaveClass(/ad-rm-renglon--revisar/);
    await expect(renglon(page, 2)).not.toHaveClass(/ad-rm-renglon--revisar/);
    await expect(renglon(page, 4)).toContainText('reposición');
    await sinScrollHorizontal(page);
    await captura(page, `remito-amarillos-${ancho}`, info);
    // El cono que leyó la IA se corrige: LEROMA. Y se acepta.
    await renglon(page, 0).locator('[data-rm-marca="0"][data-id="m-ler"]').click();
    await renglon(page, 0).locator('[data-rm-aceptar="0"]').click();
    await expect(renglon(page, 0)).not.toHaveClass(/ad-rm-renglon--revisar/);
    // Sin producto: se elige en el selector de la Carga → deja de ser amarillo.
    await renglon(page, 1).locator('[data-rm-buscar="1"]').fill('capel');
    await renglon(page, 1).locator('[data-rm-producto="1"][data-presentacion="pr-d-cap"]').click();
    await expect(renglon(page, 1)).not.toHaveClass(/ad-rm-renglon--revisar/);
    await expect(renglon(page, 1)).toContainText('Capelina Grande · Caja x 12');
    // Los lotes: 84 cajas → 10430: 30, + Agregar lote → 10433: 39.
    await expect(page.locator('[data-rm-cantidad="1"]')).toHaveValue('84');
    await expect(page.locator('[data-rm-lotes-pie="1"]')).toContainText('Va sin lote');
    await page.locator('[data-rm-lote="1"][data-k="0"]').pressSequentially('10430');
    await page.locator('[data-rm-lote-cajas="1"][data-k="0"]').fill('30');
    await page.locator('[data-rm-lote-agregar="1"]').click();
    await expect(page.locator('[data-rm-lote="1"][data-k="1"]')).toBeFocused();
    await page.locator('[data-rm-lote="1"][data-k="1"]').pressSequentially('l-10433');
    await expect(page.locator('[data-rm-lote="1"][data-k="1"]')).toHaveValue('L-10433');
    await page.locator('[data-rm-lote-cajas="1"][data-k="1"]').fill('39');
    await expect(page.locator('[data-rm-lotes-pie="1"]')).toHaveText('Asignado 69 de 84 · faltan 15 cajas');
    await page.locator('[data-rm-lote-agregar="1"]').click();
    await page.locator('[data-rm-lote="1"][data-k="2"]').fill('10440');
    await page.locator('[data-rm-lote-cajas="1"][data-k="2"]').fill('15');
    await expect(page.locator('[data-rm-lotes-pie="1"]')).toContainText('✓ Asignado completo');
    // Los envases térmicos no van en la orden; la reposición se acepta.
    await renglon(page, 3).locator('[data-rm-omitir="3"][data-valor="si"]').click();
    await expect(renglon(page, 3)).toHaveClass(/ad-rm-renglon--omitido/);
    await renglon(page, 4).locator('[data-rm-aceptar="4"]').click();
    await expect(page.locator('#ad-rm-resumen')).toHaveText('5 renglones · 1 no va en la orden');
    // El cliente: "Buscar así" con lo leído.
    await page.locator('[data-rm-cliente-leido]').click();
    await page.locator('[data-rm-cliente="c-d-ros"]').click();
    await expect(page.locator('#ad-remito-cuerpo .ad-ret-elegido')).toContainText('Almacén Rosario');
    await page.locator('#ad-rm-transporte').fill('Expreso Rosario');
    await sinScrollHorizontal(page);
    await captura(page, `remito-corregido-${ancho}`, info);

    // Guardar: lo que va a actualizar_remito_precarga.
    await page.locator('[data-rm-accion="guardar"]').click();
    await expect(page.locator('#ad-rm-aviso')).toContainText('Guardado');
    const g = rpc.find(r => r.nombre === 'actualizar_remito_precarga').params;
    expect({ ...g, p_items: undefined }).toEqual({ p_id: 'rm-1', p_numero_remito: '0001-00003100', p_fecha: '2026-10-26', p_cliente_id: 'c-d-ros',
      p_transporte: 'Expreso Rosario', p_observaciones: null, p_talonario: 'oficial', p_items: undefined });
    expect(g.p_items).toEqual([
      { texto_leido: 'Cono dulce 48 con cono Lelona', cantidad: 10, presentacion_id: 'pr-d-cono', marca_id: 'm-ler', insumo_id: null, lotes: [], revisar: false, omitir: false, nota: 'leí Lelona, ¿LEROMA?' },
      { texto_leido: 'Capelinas grandes', cantidad: 84, presentacion_id: 'pr-d-cap', marca_id: null, insumo_id: null,
        lotes: [{ lote: '10430', cajas: 30 }, { lote: 'L-10433', cajas: 39 }, { lote: '10440', cajas: 15 }], revisar: false, omitir: false, nota: 'no encontré el producto' },
      { texto_leido: 'Tallarines x10', cantidad: 20, presentacion_id: 'pr-d-tall', marca_id: null, insumo_id: null, lotes: [{ lote: '10430', cajas: 20 }], revisar: false, omitir: false, nota: '' },
      { texto_leido: 'Envases térmicos', cantidad: 5, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: true, nota: '¿mercadería de terceros?' },
      { texto_leido: 'Capelina reposición', cantidad: 2, presentacion_id: 'pr-d-cap', marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: 'reposición' },
    ]);

    // Confirmar con el error de la base: TAL CUAL, con "Descartar (ya ingresado)".
    const ERROR = 'El remito 0001-00003100 ya entró como ingreso en la otra empresa. No lo confirmes: descartalo con el motivo "ya ingresado".';
    await page.evaluate((e) => { globalThis.__maqueta.rpc.confirmar_remito_precarga = 'ERROR:' + e; }, ERROR);
    await page.locator('[data-rm-accion="confirmar"]').click();
    await expect(page.locator('#ad-rm-error')).toHaveText(ERROR);
    await expect(page.locator('[data-rm-accion="ya-ingresado"]')).toHaveText('Descartar (ya ingresado)');
    await sinScrollHorizontal(page);
    await captura(page, `remito-error-${ancho}`, info);
    // Otro error, también tal cual (sin el botón de ya ingresado).
    await page.evaluate(() => { globalThis.__maqueta.rpc.confirmar_remito_precarga = 'ERROR:El remito 0001-00003100 (talonario oficial) ya está cargado (orden D-0003).'; });
    await page.locator('[data-rm-accion="confirmar"]').click();
    await expect(page.locator('#ad-rm-error')).toHaveText('El remito 0001-00003100 (talonario oficial) ya está cargado (orden D-0003).');
    await expect(page.locator('[data-rm-accion="ya-ingresado"]')).toHaveCount(0);
    // Y luego OK: avisa la orden y sale de la lista.
    await page.evaluate(() => { globalThis.__maqueta.rpc.confirmar_remito_precarga = { orden_id: 'od9', codigo: 'D-0009', numero_remito: '0001-00003100', talonario: 'oficial' }; });
    await page.locator('[data-rm-accion="confirmar"]').click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    await expect(page.locator('body')).toContainText('Remito N° 0001-00003100 confirmado: es la orden D-0009');
    await expect(page.locator('#ad-remitos [data-remito="rm-1"]')).toHaveCount(0);
    await expect(page.locator('#ad-remitos [data-remitos-cuenta]')).toHaveText('3');
    expect(rpc.filter(r => r.nombre === 'confirmar_remito_precarga').every(r => r.params.p_id === 'rm-1')).toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Dolce: descartar con motivo, "ya ingresado" y volver a leer, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrdenes(page, 'u-d');
    // La que no se pudo leer: se descarta con motivo.
    await page.locator('#ad-remitos [data-remito="rm-2"]').click();
    await expect(page.locator('#ad-remito-cuerpo')).toContainText('La IA no pudo leerlo: La foto está muy oscura');
    await page.locator('[data-rm-accion="descartar"]').click();
    await page.locator('#ad-rm-motivo').fill('no');
    await page.locator('[data-rm-accion="descartar-si"]').click();
    await expect(page.locator('#ad-rm-descartar-error')).toContainText('al menos 3 letras');
    expect(rpc.some(r => r.nombre === 'descartar_remito_precarga')).toBe(false);
    await page.locator('#ad-rm-motivo').fill('foto repetida');
    await sinScrollHorizontal(page);
    await page.locator('[data-rm-accion="descartar-si"]').click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    expect(rpc.find(r => r.nombre === 'descartar_remito_precarga').params).toEqual({ p_id: 'rm-2', p_motivo: 'foto repetida' });
    await expect(page.locator('#ad-remitos [data-remito="rm-2"]')).toHaveCount(0);

    // "Descartar (ya ingresado)" en la de acopio.
    await page.locator('#ad-remitos [data-remito="rm-4"]').click();
    await expect(page.locator('[data-rm-talonario="acopio"]')).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => { globalThis.__maqueta.rpc.confirmar_remito_precarga = 'ERROR:El remito 977492 ya entró como ingreso en la otra empresa. No lo confirmes: descartalo con el motivo "ya ingresado".'; });
    await page.locator('[data-rm-accion="confirmar"]').click();
    await page.locator('[data-rm-accion="ya-ingresado"]').click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    expect(rpc.filter(r => r.nombre === 'descartar_remito_precarga').pop().params).toEqual({ p_id: 'rm-4', p_motivo: 'ya ingresado' });

    // La que se está leyendo: Volver a leer (avisa que pisa lo no guardado).
    await page.evaluate(() => {
      globalThis.__maqueta.funciones['ocr-remito'] = (op) => ({ id: op.body.remito_id, unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/rm-3.jpg', estado: 'precargada', talonario: 'oficial',
        numero_remito: '0001-00003105', numero_remito_n: 100003105, fecha: '2026-10-27', cliente_id: null, cliente_leido: 'Kiosco Pepe', transporte: null, observaciones: null,
        items: [{ texto_leido: 'Capelina x12', cantidad: 6, presentacion_id: 'pr-d-cap', marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '' }] });
    });
    await page.locator('#ad-remitos [data-remito="rm-3"]').click();
    await expect(page.locator('#ad-remito-cuerpo')).toContainText('La IA todavía lo está leyendo');
    await page.locator('#ad-rm-transporte').fill('algo sin guardar');
    await page.locator('[data-rm-accion="leer"]').click();
    await expect(page.locator('#ad-rm-panel-leer')).toContainText('también lo que corregiste y todavía no guardaste');
    await page.locator('[data-rm-accion="leer-si"]').click();
    await expect(page.locator('#ad-rm-numero')).toHaveValue('0001-00003105');
    await expect(page.locator('#ad-rm-transporte')).toHaveValue('');
    await expect(page.locator('#ad-rm-aviso')).toContainText('se volvió a leer');
    await expect(renglon(page, 0)).toContainText('Capelina Grande · Caja x 12');
    await sinScrollHorizontal(page);
    await captura(page, `remito-releido-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Cucuruchos Nuss (con control): Órdenes como siempre, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrdenes(page, 'u-n');
    await expect(page.locator('#ad-ordenes-lista [data-orden]').first()).toBeVisible();
    await expect(page.locator('#ad-remitos')).toBeEmpty();
    await expect(page.locator('#ad-ordenes-talonario')).toBeEmpty();
    await expect(page.locator('#ad-ordenes-lista .ad-rm-numero')).toHaveCount(0);
    await expect(page.locator('#ad-ordenes-lista .ad-fila__codigo').first()).toBeVisible();
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
