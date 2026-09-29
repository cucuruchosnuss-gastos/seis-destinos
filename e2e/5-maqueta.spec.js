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

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// Configuración de Producción: en la compu se cambia de sección con el
// segmentado de arriba; en el celular no hay segmentado, se vuelve con "‹"
// (del detalle a la lista, de la lista al menú) y se elige en el menú.
async function seccionConfig(page, seccion) {
  const tab = page.locator(`[data-config-seccion="${seccion}"]`);
  if (await tab.isVisible()) { await tab.click(); return; }
  for (let i = 0; i < 3 && !(await page.locator(`[data-ir-config="${seccion}"]`).first().isVisible()); i++) await page.locator('#pr-config-volver').click();
  await page.locator(`[data-ir-config="${seccion}"]`).first().click();
}

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
      // Los tres grupos (28/09/2026): SIN CONO, CON CONO con el cono de cada uno, insumos.
      await expect(page.locator('.rt-grupo--con-cono')).toContainText('CON CONO')
      await expect(page.locator('[data-r-producto="0"][data-marca="m1"]')).toContainText('LOLO')
      await page.locator('[data-r-producto]').first().click()
      await page.locator('[data-r-cajas="0"]').fill('30')
      // Varios lotes: "Completar con los más viejos" reparte las 30 entre los dos
      // lotes (8 + 15 = 23) y lo que falta queda como faltante, en bordó.
      await page.locator('[data-r-completar="0"]').click()
      await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('falta asignar')
      await expect(page.locator('[data-r-lotes-resumen="0"] [data-r-faltante]')).toContainText('queda pendiente de revisión en Administración')
      // Un renglón de insumo, buscado por el buscador que filtra todo junto.
      await page.locator('#rt-agregar').click()
      await page.locator('[data-r-buscar="1"]').fill('harina')
      await page.locator('[data-r-insumo="1"]').first().click()
      await page.locator('[data-r-cantidad="1"]').fill('25,5')
      await expect(page.locator('.rt-sello--insumo').first()).toBeVisible()
      // Los lotes de un insumo, de lotes_insumo_para_retiro() (sin permiso de Stock).
      await expect(page.locator('[data-r-lote-cant="1"][data-lote="H-0910"]')).toBeVisible()
      await page.locator('[data-r-lote-cant="1"][data-lote="H-0910"]').fill('25,5')
      await expect(page.locator('[data-r-lotes-resumen="1"]')).toContainText('asignado todo')
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
    // El interruptor de cada cliente y "Mostrar apagados" (28/09/2026).
    ['clientes-apagados', async (page) => {
      await expect(page.locator('[data-cliente-activo="c1"]')).toHaveAttribute('aria-checked', 'true')
      await page.locator('#ad-clientes-apagados').check()
      await expect(page.locator('[data-cliente-activo="c-apagado"]')).toHaveAttribute('aria-checked', 'false')
      await expect(page.locator('#ad-clientes-lista')).toContainText('cód. 55')
    }],
    ['ficha', async (page) => { await page.locator('[data-cliente="c1"]').click(); await expect(page.locator('#ad-cliente-cuerpo')).toContainText('Código en el sistema anterior: 101'); await page.locator('#ad-btn-ficha').click(); await expect(page.locator('#ad-f-nombre')).toHaveValue(/Anatolia/); await expect(page.locator('#ad-ficha-codigo-anterior')).toHaveText('Código en el sistema anterior: 101') }],
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
    // Cobranzas por asentar (27/09/2026): la tarjeta, asentar con el sugerido,
    // y una cobranza asentada desde la cuenta del cliente, con "Reabrir".
    ['cobranzas', async (page) => {
      await page.locator('#ad-cheques-volver').click(); await page.locator('[data-seccion="cobranzas"]').click()
      await expect(page.locator('.ad-cob__escrito').first()).toHaveText('«Caserato»')
      await expect(page.locator('#ad-empresas')).toBeHidden()
    }],
    ['asentar', async (page) => {
      await page.locator('[data-asentar]').first().click()
      await expect(page.locator('.ad-opcion-cliente--sugerido')).toBeVisible()
      await page.locator('#ad-asentar-buscar').fill('pepe de la')
      await expect(page.locator('#ad-asentar-resultados')).toContainText('Kiosco Pepe')
      await page.locator('.ad-opcion-cliente--sugerido').click()
      await page.locator('#ad-asentar-confirmar').click()
      await expect(page.locator('.ad-cob__hecho')).toContainText('Le queda un saldo a favor')
    }],
    ['cobranza-en-la-cuenta', async (page) => {
      await page.locator('#ad-cobranzas-volver').click(); await page.locator('[data-seccion="clientes"]').click()
      await page.locator('[data-cliente="c1"]').click()
      await page.locator('[data-cuenta-cobranza]').click()
      await expect(page.locator('#ad-cobranza-cuerpo')).toContainText('Asentada por Yanina Godoy')
      await page.locator('#ad-cobranza-reabrir').click()
      await expect(page.locator('#ad-reabrir-motivo')).toBeVisible()
    }],
    // Retiros por revisar (28/09/2026): el número en la portada, la lista y "Aceptar".
    ['revisar', async (page) => {
      await page.locator('#ad-cobranza-volver').click(); await page.locator('#ad-cliente-volver').click(); await page.locator('#ad-clientes-volver').click()
      await expect(page.locator('[data-seccion="revisar"] .ad-seccion__numero')).toHaveText('2')
      await page.locator('[data-seccion="revisar"]').click()
      await expect(page.locator('#ad-revisar-lista')).toContainText('faltaban 10,5 kg en stock')
      await page.locator('[data-revisar-aceptar="it-1"]').click()
      await page.locator('#ad-revisar-motivo').fill('se compró y no se cargó el ingreso')
      await page.locator('#ad-revisar-si').click()
      await expect(page.locator('#ad-revisar-lista')).toContainText('Aceptado: N-0042')
    }],
  ]],
  // Un super_admin (27/09/2026): los errores de la app.
  ['modulos/administracion.html', 'administracion-super', [
    ['errores', async (page) => {
      await page.locator('[data-seccion="errores"]').click()
      await expect(page.locator('#ad-errores-lista')).toContainText('SM-X135 · Android 14 · app instalada')
      await page.locator('#ad-errores-pantalla').selectOption('produccion')
      await expect(page.locator('#ad-errores-cuenta')).toHaveText('1 de 2')
    }],
    ['seguridad', async (page) => {
      await page.locator('#ad-errores-volver').click()
      await page.locator('[data-seccion="seguridad"]').click()
      await expect(page.locator('#ad-seguridad-lista')).toContainText('De Franco Díaz · lo hizo Emanuel Romero')
      await expect(page.locator('#ad-seguridad-cuenta')).toHaveText('2 registros')
    }],
    ['mis-sesiones', async (page) => {
      // En la compu, desde la barra lateral; en el celular, el panel se prueba en el dashboard.
      if (!(await page.locator('#barra-lateral-sesiones').isVisible())) return
      await page.locator('#barra-lateral-sesiones').click()
      await expect(page.locator('.sesiones')).toContainText('Chrome en Android')
      await expect(page.locator('.sesiones')).toContainText('Edge en Windows')
      await page.locator('[data-accion="pedir-cerrar"]').click()
      await expect(page.locator('.sesiones')).toContainText('Poné el motivo')
      await page.keyboard.press('Escape')
      await expect(page.locator('.sesiones')).toHaveCount(0)
    }],
  ]],
  // El tablero de resúmenes (29/09/2026, handoff "Esqueleto"): el tablero,
  // Personalizar (fijar, tamaño, esconder), el modo acomodar con el teclado y
  // "Volver a como venía" con su panel. Los datos son los del diseño (el
  // reloj NO está fijo acá: lo compara 11-comparar-esqueleto.spec.js).
  ['dashboard.html', 'tablero', [
    ['tablero', async (page) => {
      await expect(page.locator('#grilla-modulos [data-tarjeta]')).toHaveCount(14)
      await expect(page.locator('.tb-tarjeta--cargando')).toHaveCount(0)
      await expect(page.locator('[data-tarjeta="produccion"]')).toContainText('Máquina 4')
    }],
    ['personalizar', async (page) => {
      await page.goto(`${MAQUETA}/dashboard.html?vista=personalizar`)
      await expect(page.locator('#tb-personalizar')).toContainText('Se guarda en tu cuenta: lo ves igual en la compu y en el celular.')
      await page.locator('[data-pz-fijar="stock"]').click()
      await expect(page.locator('[data-pz-fijar="stock"]')).toHaveAttribute('aria-pressed', 'true')
      await page.locator('[data-pz-tamano="cheques"][data-tamano="mediana"]').click()
      await page.locator('[data-pz-mostrar="seguridad"]').click()
      await expect(page.locator('[data-pz-mostrar="seguridad"]')).toHaveAttribute('aria-checked', 'false')
    }],
    ['acomodar', async (page) => {
      await page.locator('#pz-acomodar').click()
      await expect(page.locator('#tb-acomodar-barra')).toBeVisible()
      await expect(page.locator('#tb-escondidas')).toContainText('Seguridad')
      await expect(page.locator('.tb-tarjeta__abrir')).toHaveCount(0)
      await page.locator('[data-manija="caja"]').focus()
      await page.keyboard.press('Enter')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Enter')
      const orden = await page.locator('#grilla-modulos [data-tarjeta]').evaluateAll(xs => xs.map(x => x.dataset.tarjeta))
      expect(orden.indexOf('caja')).toBe(1)
    }],
    ['volver-a-como-venia', async (page) => {
      await page.locator('#tb-acomodar-volver-fabrica').click()
      await expect(page.locator('#tb-confirmar')).toBeVisible()
      await page.locator('#tb-confirmar-si').click()
      await expect(page.locator('#tb-confirmar')).toBeHidden()
      await page.locator('#tb-acomodar-listo').click()
      await expect(page.locator('#grilla-modulos [data-tarjeta]')).toHaveCount(14)
      await expect(page.locator('.tb-tarjeta__abrir')).toHaveCount(14)
    }],
  ]],
  ['dashboard.html', 'tablero-estados', [
    ['estados', async (page) => {
      await expect(page.locator('[data-tarjeta="caja"]')).toContainText('No se pudo cargar')
      await expect(page.locator('[data-tarjeta="cheques"]')).toContainText('Cargando…')
      await expect(page.locator('[data-tarjeta="gastos"]')).not.toContainText('No se pudo cargar')
    }],
  ]],
  ['modulos/pedidos.html', 'pedidos', [
    ['lista', async (page) => { await expect(page.locator('[data-pedido]').first()).toBeVisible() }],
    ['detalle', async (page) => { await page.locator('[data-pedido="pe1"]').click(); await expect(page.locator('#pe-btn-imprimir')).toBeVisible() }],
    ['clientes', async (page) => { await page.locator('#pe-detalle-volver').click(); await page.locator('#pe-btn-clientes').click(); await expect(page.locator('#pe-clientes-lista')).toContainText('Anatolia') }],
    ['cargar', async (page) => { await page.locator('#pe-clientes-volver').click(); await page.locator('#pe-btn-nuevo').click() }],
  ]],
  // Proyectos Taller (29/09/2026, el diseño nuevo, con los datos del diseño):
  // la lista, la ficha con la venta (Tomás tiene precios), cargar horas,
  // facturar, el editor, el valor de la hora (solo en la compu) y el diagrama.
  ['modulos/taller.html', 'taller-diseno', [
    ['lista', async (page) => { await expect(page.locator('[data-proyecto]').first()).toBeVisible(); await expect(page.locator('#tl-lista')).toContainText('se pasó') }],
    ['ficha', async (page) => {
      await page.locator('[data-proyecto]').filter({ hasText: 'Maq Barquillo 24 Carrizo' }).first().click()
      await expect(page.locator('#tl-ficha .tl-tabs')).toBeVisible()
      await expect(page.locator('#tl-ficha')).toContainText('PRECIO DE VENTA')
      await page.locator('#tl-ficha [data-tab="horas"]').click()
      await expect(page.locator('#tl-ficha')).toContainText('Soldadura del bastidor')
    }],
    ['horas', async (page) => { await page.locator('[data-accion="horas"]:visible').first().click(); await expect(page.locator('#tl-horas-persona')).toBeVisible(); await page.locator('#tl-modal [data-accion="modal-cerrar"]').click() }],
    ['facturar', async (page) => {
      await page.locator('[data-accion="facturar"]:visible').first().click()
      await page.locator('#tl-venta-importe').fill('300000')
      await page.locator('#tl-venta-concepto').fill('Avance')
      await page.locator('#tl-venta-importe').dispatchEvent('input')
      await expect(page.locator('#tl-venta-resumen')).toContainText('Facturado pasa de')
      await page.locator('#tl-modal [data-accion="modal-cerrar"]').click()
    }],
    ['editor', async (page) => { await page.locator('[data-accion="editar"]:visible').first().click(); await expect(page.locator('#tl-ed-nombre')).toHaveValue(/Barquillo/); await expect(page.locator('#tl-ed-venta')).toBeVisible() }],
    ['valor-hora', async (page) => {
      await page.locator('#tl-editor-volver').click()
      if (await page.locator('#tl-ficha-volver').isVisible()) await page.locator('#tl-ficha-volver').click()
      else await page.locator('[data-pestana="proyectos"]').click()
      await expect(page.locator('#tl-lista')).toBeVisible()
      // En el celular no hay botón del valor de la hora (el diseño no lo dibuja).
      if (await page.locator('#tl-btn-valor-hora').isVisible()) {
        await page.locator('#tl-btn-valor-hora').click()
        await expect(page.locator('#tl-hora')).toContainText('18.500')
        await page.locator('#tl-hora-volver').click()
      }
    }],
    ['diagrama', async (page) => { await page.locator('[data-pestana="diagrama"]').click(); await expect(page.locator('#tl-diagrama')).toBeVisible() }],
  ]],
  ['modulos/produccion-gestion.html', 'produccion-gestion', [
    ['indicadores', async (page) => { await expect(page.locator('body')).toContainText('lote 7021') }],
    ['personal', async (page) => {
      if (await page.locator('#pr-btn-menu').isVisible()) await page.locator('#pr-btn-menu').click()
      await page.locator('[data-ir-config="personal"]').first().click()
      await expect(page.locator('body')).toContainText('Agustín Barrera')
    }],
    ['conos', async (page) => {
      // Dentro de Configuración se cambia de sección con el segmentado de arriba
      // (el diseño de Configuración, 29/09/2026).
      await seccionConfig(page, 'marcas')
      // El nombre del pendiente va en un campo (se corrige al aceptar): se afirma el grupo.
      await expect(page.locator('body')).toContainText(/por revisar · 1/i)
    }],
    ['productos', async (page) => {
      await seccionConfig(page, 'productos')
      await expect(page.locator('#pr-config-titulo')).toContainText('Productos')
      const primera = page.locator('[data-cfg-sel]').first()
      if (await primera.count()) await primera.click()
    }],
    ['recetas', async (page) => {
      await seccionConfig(page, 'recetas')
      await expect(page.locator('#pr-config-titulo')).toContainText('Recetas')
    }],
  ]],
  // Dar de baja y reactivar (28/09/2026): los dados de baja se ven solo con
  // "Mostrar dados de baja", su ficha dice la baja y ofrece Reactivar, y la de
  // alguien activo ofrece "Dar de baja" con su panel (nunca un confirm()).
  ['modulos/empleados.html', 'empleados', [
    ['lista', async (page) => {
      await expect(page.locator('[data-id="emp-2"]')).toBeVisible()
      await expect(page.locator('[data-id="emp-4"]')).toHaveCount(0)
    }],
    ['dados-de-baja', async (page) => {
      await page.locator('#filtro-mostrar-bajas').check()
      await expect(page.locator('[data-id="emp-4"]')).toContainText('Dado de baja')
      await expect(page.locator('[data-id="empresa"]')).toHaveCount(0)
    }],
    ['ficha-de-baja', async (page) => {
      await page.locator('[data-id="emp-4"]').click()
      await expect(page.locator('#ficha-estado-baja')).toContainText('por Usabarrena Facundo')
      await page.locator('#btn-reactivar').click()
      await expect(page.locator('#btn-reactivar-confirmar')).toBeVisible()
    }],
    ['panel-dar-de-baja', async (page) => {
      await page.locator('#btn-cerrar-ficha').click()
      await page.locator('[data-id="emp-2"]').click()
      await page.locator('#btn-dar-baja').click()
      await expect(page.locator('#ficha-baja')).toContainText('Pierde el acceso a la app al instante.')
    }],
  ]],
];

for (const [archivo, datos, pasos] of PANTALLAS) {
  for (const ancho of [390, 1280]) {
    // Con otro juego de datos para la misma pantalla, el título lo nombra.
    const conDatos = archivo.endsWith(`/${datos}.html`) ? '' : ` (${datos})`;
    test(`maqueta: ${archivo}${conDatos} a ${ancho} px, sin scroll horizontal ni errores`, async ({ page }, info) => {
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

// La barra lateral de la compu (27/09/2026): en cada pantalla de la maqueta,
// a 1280 px está a la vista con el módulo actual marcado y la página no se
// mete debajo; a 390 px no existe a la vista. La planta no la carga.
const conBarra = [...new Map(PANTALLAS.map(([archivo, datos]) => [`${archivo}|${datos}`, [archivo, datos]])).values()];
for (const [archivo, datos] of conBarra) {
  test(`maqueta: la barra lateral en ${archivo} (${datos}) — a la vista en la compu, no en el celular`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${MAQUETA}/${archivo}?maqueta=${datos}`);
    const barra = page.locator('nav.barra-lateral');
    await expect(barra).toBeVisible();
    await expect(barra.locator('[aria-current="page"]')).toHaveCount(1);
    const { izquierda, ancho } = await page.evaluate(() => ({
      izquierda: parseFloat(getComputedStyle(document.body).marginLeft),
      ancho: document.querySelector('nav.barra-lateral').getBoundingClientRect().width,
    }));
    expect(izquierda, 'la página se corre lo que mide la barra').toBeCloseTo(ancho, 0);
    // Achicar y recordar.
    await page.locator('#barra-lateral-plegar').click();
    await expect(page.locator('body')).toHaveClass(/barra-lateral-colapsada/);
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/barra-lateral-colapsada/);
    await expect(page.locator('nav.barra-lateral .barra-lateral__nombre').first()).toBeHidden();
    // El celular.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(barra).toBeHidden();
    expect(parseFloat(await page.evaluate(() => getComputedStyle(document.body).marginLeft))).toBe(0);
  });
}

// LA PLANTA CON DOS MODOS (28/09/2026): la tablet en horizontal (1280×800) y en
// vertical (800×1280). Va aparte de PANTALLAS porque la planta no tiene barra
// lateral, y porque se usa en la tablet y no en el celular ni la compu.
// Recorre: ¿Quién sos? → PIN → tablero → Lo producido → Sala de masa →
// la receta (Modificar, + Otro) → el historial de la máquina.
async function planta_marcarPin(page, pin) {
  const teclado = page.locator('#pr-pin-teclado');
  await expect(teclado).toBeVisible();
  // Planta v2: sin tecla "Entrar", con el último número se manda solo.
  for (const d of pin) await teclado.locator(`[data-tecla="${d}"]`).click();
}
async function planta_elegir(page, nombre) {
  const fija = page.locator('#pr-quien-fija');
  if (await fija.isVisible().catch(() => false)) return;
  await page.locator('#pr-quien-lista [data-persona]', { hasText: nombre }).click();
}
async function planta_sinScroll(page, nombre) {
  await page.waitForTimeout(150);
  const { ancho: doc, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal en ${nombre}: el documento mide ${doc} px y la pantalla ${vista}`).toBeLessThanOrEqual(vista);
}
for (const [ancho, alto] of [[1280, 800], [800, 1280]]) {
  test(`maqueta: la planta (dos modos) a ${ancho}×${alto}, sin scroll horizontal ni errores`, async ({ page }, info) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    const paso = async (nombre, fn) => test.step(nombre, async () => {
      await fn();
      await planta_sinScroll(page, nombre);
      await captura(page, `maqueta-planta-${nombre}-${ancho}x${alto}`, info);
    });
    await paso('quien-sos', async () => { await expect(page.locator('#pr-quien')).toBeVisible() });
    await paso('tablero', async () => {
      await planta_elegir(page, 'Federico Silva');
      await planta_marcarPin(page, '4826');
      await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
      await expect(page.locator('[data-producido]').first()).toBeVisible();
      await expect(page.locator('#pr-tablero')).toContainText('Sin turno');
      // Planta v2: el motivo va en la tarjeta parada, en minúscula como en el diseño 2a.
      await expect(page.locator('#pr-tablero')).toContainText(/se rompió la cadena/i);
    });
    await paso('lo-producido', async () => {
      await page.locator('[data-producido]').first().click();
      await expect(page.locator('#pr-planilla')).toBeVisible();
      await page.locator('#pr-btn-agregar-producto').click();
      await expect(page.locator('#pr-agregar-prod')).toBeVisible();
    });
    await paso('sala-de-masa', async () => {
      await page.locator('#pr-barra [data-modo="masa"]').click();
      await planta_elegir(page, 'Agustín Barrera');
      await planta_marcarPin(page, '7391');
      await expect(page.locator('#pr-sala')).toBeVisible();
    });
    await paso('receta', async () => {
      await page.locator('[data-sala-turno="t1"]').first().click();
      await expect(page.locator('#pr-receta')).toBeVisible();
      await expect(page.locator('#pr-receta')).toContainText('Harina');
      // Adentro de la tarjeta tampoco se sale nada: a 1280 el botón "Otro" de
      // cada renglón quedaba afuera (la fila pedía 706 px en 642) y el
      // documento no scrolleaba, así que el chequeo general no lo veía.
      const afuera = await page.evaluate(() => [...document.querySelectorAll('#pr-receta .pr-rec')]
        .filter(f => f.scrollWidth > f.clientWidth + 1 || [...f.children].some(c => c.getBoundingClientRect().right > f.getBoundingClientRect().right + 1))
        .map(f => f.textContent.trim().slice(0, 30)));
      expect(afuera, `renglones de la receta que se salen de la tarjeta: ${afuera.join(' | ')}`).toEqual([]);
    });
    await paso('receta-modificar', async () => {
      await page.locator('#pr-receta-opciones [data-base="modificar"]').click();
      await expect(page.locator('#pr-receta')).toContainText('Azúcar');
    });
    await paso('historial-maquina', async () => {
      await page.locator('[data-lateral-turno]').first().click();
      await expect(page.locator('#pr-hist-maq')).toBeVisible();
      await expect(page.locator('#pr-hm-lista')).toContainText('Masa 3');
    });
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('maqueta: la planta no carga la barra lateral', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${MAQUETA}/modulos/produccion.html`);
  await page.waitForTimeout(1500);
  await expect(page.locator('nav.barra-lateral')).toHaveCount(0);
  const html = await (await page.request.get(`${MAQUETA}/modulos/produccion.html`)).text();
  expect(html).not.toContain('barra-lateral.js');
});
