// COMPROBANTES DE COBRANZAS CON LA V2 DEL LECTOR (pedido del 27/10/2026), en
// la maqueta: Yanina elige TRES comprobantes de una vez desde la Galería (un
// ticket de "DEPÓSITO EFECTIVO EN CUENTA" de Macro, una captura de BNA+ de un
// tercero y uno que el lector no puede leer). El lector responde lo que la
// prueba decide, pasado por el normalizador REAL de la Edge Function
// (supabase/functions/ocr-cobranza-comprobantes/normalizar.js).
//
// A 1280 y a 390:
//  - el lector recibe UNO por vez; los que esperan dicen "en espera";
//  - el ticket sale como "Depósito en efectivo 1", sin ordenante y con la
//    cuenta "Banco Macro · Nuss" ya elegida por el CBU (con su aviso);
//  - la captura de BNA+ trae a quien transfirió (no es el cliente) y no frena
//    nada; el que no se leyó deja su tarjeta vacía con el comprobante;
//  - guardar: el depósito viaja como transferencia con "Depósito en efectivo ·
//    Banco Macro" en banco_origen, y lo crudo del que falló viaja igual.
// Sin scroll horizontal ni errores de JavaScript. Corre SIEMPRE, sin
// credenciales.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const CBU = '2850324830094103159311';

const CRUDOS = [
  { comprobantes: [{ medio: 'deposito_efectivo', importe: 500000, fecha: '2026-10-27', banco_origen: 'Banco Macro', ordenante: null,
    cuit_ordenante: null, referencia: '4471', destinatario: 'PAZ MIRTA', cbu_destino: CBU, notas: null }] },
  { comprobantes: [{ medio: 'transferencia', importe: 813174.25, fecha: '2026-10-27', banco_origen: 'BNA+', ordenante: 'FERNANDEZ RICARDO',
    cuit_ordenante: '20111111112', referencia: '000987', destinatario: 'PAZ MIRTA', cbu_destino: CBU, notas: null }] },
  { comprobantes: [{ medio: 'transferencia' }] },
];

async function respuestas() {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'supabase/functions/ocr-cobranza-comprobantes/normalizar.js'), 'utf8');
  const N = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(fuente));
  return CRUDOS.map(crudo => {
    const propuestos = N.normalizarRespuesta('transferencia', crudo);
    return propuestos.length
      ? { ok: true, modelo: 'claude-opus-5', tipo: 'transferencia', crudo, propuestos }
      : { ok: false, modelo: 'claude-opus-5', crudo, propuestos, mensaje: 'No se encontraron datos en el comprobante. Cargalo a mano.' };
  });
}

// Una imagen de verdad (PNG de 1×1): la pantalla la comprime a JPEG con un canvas.
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const IMAGEN = (n) => ({ name: `comprobante-${n}.png`, mimeType: 'image/png', buffer: Buffer.from(PNG_1X1, 'base64') });

for (const t of [{ nombre: '1280', ancho: 1280, alto: 900 }, { nombre: '390', ancho: 390, alto: 844 }]) {
  test(`tres comprobantes de una vez: depósito, CBU y de a uno, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.locator('#cob-btn-nueva').click();
    await page.locator('#cob-empresas [data-empresa="u-n"]').click();
    await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-n"]').click();
    await page.evaluate((r) => {
      globalThis.__maqueta = globalThis.__maqueta || {};
      globalThis.__lecturas = [];
      globalThis.__soltar = [];
      let n = 0;
      globalThis.__maqueta.funciones = {
        'ocr-cobranza-comprobantes': (op) => new Promise((soltar) => {
          const i = n++;
          globalThis.__lecturas.push(op?.body);
          globalThis.__soltar.push(() => soltar(r[i]));
        }),
      };
    }, await respuestas());
    await page.locator('[data-abrir-forma="transferencia"]').click();
    const seccion = page.locator('#cob-seccion-transferencias');
    await expect(seccion).toBeVisible();
    await expect(seccion.locator('[data-ayuda-comprobante]')).toContainText('podés elegir varios de una vez');

    const [elegir] = await Promise.all([
      page.waitForEvent('filechooser'),
      seccion.locator('[data-subir-comprobante="transferencia"][data-origen="galeria"]').click(),
    ]);
    expect(elegir.isMultiple()).toBe(true);
    await elegir.setFiles([IMAGEN(1), IMAGEN(2), IMAGEN(3)]);

    // De a uno: el lector tiene UNO; los otros dos esperan.
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(1);
    await expect(page.locator('#cob-comprobantes-transferencia')).toContainText('Comprobante 2: en espera: se lee cuando termine el anterior.');
    await expect(page.locator('#cob-comprobantes-transferencia')).toContainText('Comprobante 3: en espera');
    await captura(page, `ocr-tickets-en-espera-${t.nombre}`, info);

    // 1) El ticket del depósito.
    await page.evaluate(() => globalThis.__soltar[0]());
    const tarjetas = page.locator('#cob-lista-transferencias [data-transf]');
    await expect(tarjetas).toHaveCount(1);
    const dep = tarjetas.nth(0);
    await expect(dep.locator('.cob-cheque__titulo')).toContainText('Depósito en efectivo 1');
    await expect(dep.locator('.cob-chip--activo')).toHaveText('Depósito en efectivo');
    await expect(dep.locator('[data-transf-campo="ordenante"]')).toHaveValue('');
    await expect(dep).toContainText('Quién depositó (opcional)');
    await expect(dep.locator('[data-transf-campo="importe"]')).toHaveValue('500.000');
    await expect(dep.locator('[data-transf-campo="cuenta_id"]')).toHaveValue('cta-banco-nuss');
    await expect(dep.locator('[data-transf-aviso-cbu]')).toHaveText('Elegida por el CBU del comprobante: cambiala si no es.');
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(2);

    // 2) La captura de BNA+ de un tercero.
    await page.evaluate(() => globalThis.__soltar[1]());
    await expect(tarjetas).toHaveCount(2);
    const bna = tarjetas.nth(1);
    await expect(bna.locator('.cob-cheque__titulo')).toContainText('Transferencia 2');
    await expect(bna.locator('[data-transf-campo="ordenante"]')).toHaveValue('FERNANDEZ RICARDO');
    await expect(bna.locator('[data-transf-campo="cuenta_id"]')).toHaveValue('cta-banco-nuss');
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(3);

    // 3) El que no se pudo leer: tarjeta vacía con su comprobante.
    await page.evaluate(() => globalThis.__soltar[2]());
    await expect(tarjetas).toHaveCount(3);
    await expect(page.locator('#cob-comprobantes-transferencia')).toContainText('Comprobante 3: No se encontraron datos');
    const vacia = tarjetas.nth(2);
    await vacia.locator('[data-transf-campo="importe"]').fill('1000');
    await vacia.locator('[data-transf-campo="cuenta_id"]').selectOption('cta-banco-nuss');

    // Cada uno fue al lector una sola vez, con su propio archivo.
    const rutas = await page.evaluate(() => globalThis.__lecturas.map(b => b.storage_path));
    expect(new Set(rutas).size).toBe(3);

    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await dep.scrollIntoViewIfNeeded();
    await captura(page, `ocr-tickets-deposito-${t.nombre}`, info);
    await bna.scrollIntoViewIfNeeded();
    await captura(page, `ocr-tickets-tercero-${t.nombre}`, info);

    // Guardar: lo que la pantalla le manda a la base lo anota la maqueta en la
    // consola ("[maqueta] rpc <nombre> <parámetros>").
    let p = null;
    page.on('console', async m => {
      const args = m.args();
      if (args.length >= 3 && /\[maqueta\] rpc/.test(m.text()) && (await args[1].jsonValue()) === 'cargar_cobranza_asentada') p = await args[2].jsonValue();
    });
    await page.locator('#cob-btn-guardar').click();
    await expect.poll(() => !!p, { timeout: 15000 }).toBe(true);
    expect(p.p_transferencias.map(x => x.banco_origen)).toEqual(['Depósito en efectivo · Banco Macro', 'BNA+', null]);
    expect(p.p_transferencias[0].ordenante).toBeNull();
    expect(p.p_transferencias[1].ordenante).toBe('FERNANDEZ RICARDO');
    expect(p.p_cliente_id).toBe('cli-jm-n');
    expect(p.p_fotos).toHaveLength(3);
    expect(p.p_fotos[2].ocr_crudo).toEqual(CRUDOS[2]);
    expect(errores).toEqual([]);
  });
}
