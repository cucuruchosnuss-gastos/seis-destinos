// E-CHEQUE DESDE UN PDF (pedido de Facu del 14/10/2026), en la maqueta: el
// caso real de la cobranza f47dadf1… (Dolce, BERSANO), donde en la tarjeta
// "solo apareció el importe". El lector responde con el crudo REAL de esa
// foto pasado por el normalizador REAL de la Edge Function
// (supabase/functions/ocr-cobranza-comprobantes/normalizar.js) y TARDA lo que
// la prueba decide (con un PDF son 20-40 s de verdad).
//
// Por cada tamaño (1280, 390, 360 y la tablet de 1000×540) y por cada forma
// de elegir el PDF (Archivo, Galería, Sacar foto):
//  - sin tarjeta: la tarjeta aparece al subir, dice "Leyendo el comprobante…"
//    y al responder se completan banco, número, emisor, CUIT, fecha de pago e
//    importe; la fecha de emisión, la de hoy con "No figura en el comprobante:
//    revisala";
//  - con una tarjeta vacía ya abierta ("Cargar a mano"): se completa ESA (no
//    aparece otra);
//  - escribiendo en la tarjeta mientras el lector no respondió: lo escrito no
//    se pisa, lo vacío se completa y el foco sigue en el campo.
// Sin scroll horizontal ni errores de JavaScript. Corre SIEMPRE, sin
// credenciales.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// El ocr_crudo REAL de la foto 25582a7d-90c5-4893-a937-dd049fc4529f (leído de
// la base el 14/10/2026).
const CRUDO = { comprobantes: [{
  cmc7: null,
  notas: "Comprobante de pago Macro; 'numero' tomado de 'Nro. de Instrumento de Pago' (78013718). No figura CMC7. Cta de origen informada: 379200002792208 (15 dígitos, no 11). Beneficiario: DOLCE PASTA SRL, CUIT 33709335419. Medio de pago: ECHEQ DIFERIDO, estado ENTREGADA.",
  cuenta: null, emisor: 'BERSANO SRL', numero: '78013718', importe: 9400228.77, id_echeq: null, fecha_pago: '2026-11-16',
  cuit_emisor: '30690839691', banco_codigo: '285', banco_nombre: 'Banco Macro', codigo_postal: null, fecha_emision: null, sucursal_codigo: null,
}] };

// Lo que responde la Edge Function: el crudo normalizado por su propio código.
async function respuestaDelLector() {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'supabase/functions/ocr-cobranza-comprobantes/normalizar.js'), 'utf8');
  const N = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(fuente));
  return { ok: true, modelo: 'claude-opus-5', tipo: 'echeque', crudo: CRUDO, propuestos: N.normalizarRespuesta('echeque', CRUDO) };
}

const hoyAr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const PDF = { name: 'ECHEQ BERSANO.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n') };

const TAMANOS = [
  { nombre: '1280', ancho: 1280, alto: 900 },
  { nombre: '390', ancho: 390, alto: 844 },
  { nombre: '360', ancho: 360, alto: 780 },
  { nombre: 'tablet', ancho: 1000, alto: 540 },
];
const ORIGENES = [['archivo', 'Archivo'], ['galeria', 'Galería'], ['camara', 'Sacar foto']];
const CASOS = ['sin tarjeta', 'con tarjeta vacía', 'escribiendo mientras lee'];

// La cobranza nueva de Dolce Pasta (J&M), con la sección E-cheque abierta y un
// lector que no responde hasta que la prueba lo suelta.
async function prepararCobranza(page, respuesta) {
  await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
  await page.locator('#cob-btn-nueva').click();
  await page.locator('#cob-empresas [data-empresa="u-d"]').click();
  await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-d"]').click();
  await page.evaluate((r) => {
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__lecturas = [];
    globalThis.__maqueta.funciones = {
      'ocr-cobranza-comprobantes': (op) => new Promise((soltar) => { globalThis.__lecturas.push(op?.body); globalThis.__soltarLector = () => soltar(r); }),
    };
  }, respuesta);
  await page.locator('[data-abrir-forma="echeque"]').click();
  await expect(page.locator('#cob-seccion-echecks')).toBeVisible();
}

async function subirPdf(page, origen) {
  const [elegir] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator(`#cob-seccion-echecks [data-subir-comprobante="echeque"][data-origen="${origen}"]`).click(),
  ]);
  await elegir.setFiles(PDF);
  // Llegó al lector (o sea: ya se subió y está leyendo).
  await expect.poll(() => page.evaluate(() => (globalThis.__lecturas || []).length)).toBe(1);
}

const campo = (tarjeta, c) => tarjeta.locator(`[data-echeck-campo="${c}"]`);

for (const t of TAMANOS) {
  for (const [origen, rotulo] of ORIGENES) {
    for (const caso of CASOS) {
      test(`e-cheque desde PDF (${rotulo}), ${caso}, a ${t.nombre}`, async ({ page }, info) => {
        const errores = vigilarErrores(page);
        await page.setViewportSize({ width: t.ancho, height: t.alto });
        await prepararCobranza(page, await respuestaDelLector());
        if (caso !== 'sin tarjeta') {
          await page.locator('#cob-btn-echeck').click();
          await expect(page.locator('#cob-lista-echecks [data-echeck]')).toHaveCount(1);
        }
        await subirPdf(page, origen);

        // Mientras lee: UNA tarjeta, con el comprobante y "Leyendo el comprobante…".
        const tarjetas = page.locator('#cob-lista-echecks [data-echeck]');
        await expect(tarjetas).toHaveCount(1);
        const tarjeta = tarjetas.first();
        await expect(tarjeta.locator('[data-echeck-leyendo]')).toBeVisible();
        await expect(tarjeta.locator('[data-echeck-leyendo]')).toContainText('Leyendo el comprobante…');
        await expect(tarjeta.locator('[data-ver-comprobante]')).toBeVisible();

        if (caso === 'escribiendo mientras lee') {
          await campo(tarjeta, 'emisor').click();
          await campo(tarjeta, 'emisor').pressSequentially('Bersano');
        }
        await captura(page, `echeque-pdf-leyendo-${origen}-${t.nombre}`, info);

        // Responde el lector.
        await page.evaluate(() => globalThis.__soltarLector());
        await expect(tarjeta.locator('[data-echeck-leyendo]')).toBeHidden();
        await expect(tarjetas).toHaveCount(1);
        await expect(campo(tarjeta, 'banco_codigo')).toHaveValue('285');
        await expect(campo(tarjeta, 'numero')).toHaveValue('78013718');
        await expect(campo(tarjeta, 'cuit_emisor')).toHaveValue('30690839691');
        await expect(campo(tarjeta, 'fecha_pago')).toHaveValue('2026-11-16');
        await expect(campo(tarjeta, 'importe')).toHaveValue('9.400.228,77');
        await expect(tarjeta.locator('.cob-chip--activo')).toHaveText('Diferido');
        await expect(campo(tarjeta, 'fecha_emision')).toHaveValue(hoyAr());
        await expect(tarjeta.locator('[data-echeck-aviso-fecha]')).toHaveText('No figura en el comprobante: revisala');

        if (caso === 'escribiendo mientras lee') {
          // Lo escrito no se pisa y el foco sigue ahí: se puede seguir tipeando.
          await expect(campo(tarjeta, 'emisor')).toHaveValue('Bersano');
          await expect(campo(tarjeta, 'emisor')).toBeFocused();
          await page.keyboard.type(' Hnos');
          await expect(campo(tarjeta, 'emisor')).toHaveValue('Bersano Hnos');
          await expect(tarjeta.locator('[data-echeck-origen]')).toHaveText('Leído del comprobante y corregido.');
        } else {
          await expect(campo(tarjeta, 'emisor')).toHaveValue('BERSANO SRL');
          await expect(tarjeta.locator('[data-echeck-origen]')).toHaveText('Leído del comprobante: revisalo antes de guardar.');
        }

        // Cambiar la fecha de emisión saca la leyenda.
        await campo(tarjeta, 'fecha_emision').fill('2026-10-10');
        await expect(tarjeta.locator('[data-echeck-aviso-fecha]')).toBeHidden();

        const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
        expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
        await tarjeta.scrollIntoViewIfNeeded();
        await captura(page, `echeque-pdf-leido-${origen}-${caso.replace(/\s+/g, '-')}-${t.nombre}`, info);
        expect(errores, errores.join('\n')).toEqual([]);
      });
    }
  }
}
