// VARIOS COMPROBANTES EN UNA COBRANZA, AGRUPADOS Y SIN REPETIDOS (pedido de
// Facu del 30/10/2026), en la maqueta: Yanina elige SIETE comprobantes de una
// vez desde "Archivo" (PDF de Mercado Pago, Banco Nación y tickets de depósito
// del Macro). El lector (la maqueta) responde uno por vez lo que la prueba
// decide, y comprobantes_ya_cargados responde según el número de operación.
//
// A 1280 y a 390:
//  - el avance "Leyendo 3 de 7…" mientras se leen de a uno;
//  - una foto con dos operaciones da dos tarjetas;
//  - el resumen agrupado ("Transferencias: Mercado Pago 3 · … — Banco Nación
//    3 · …", "Depósitos en efectivo: Macro 2 · …", "Total: …");
//  - ROJO con los datos y "Sacar" para el ya cargado; ROJO en el segundo con
//    el mismo número dentro de la tanda; AMARILLO (revisalo) para el mismo
//    número con otro importe, que no bloquea;
//  - Guardar deshabilitado con "Sacá los comprobantes repetidos."; sacados los
//    rojos se habilita; el rechazo de la base se muestra tal cual; cada foto
//    viaja con su sha256 (64 letras hex).
// Sin scroll horizontal ni errores de JavaScript. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const CBU = '2850324830094103159311';

const op = (banco, importe, referencia, extra = {}) => ({ medio: 'transferencia', importe, fecha: '2026-10-30', banco_origen: banco,
  ordenante: 'GODOY JUAN', cuit_ordenante: null, referencia, destinatario: 'PAZ MIRTA', cbu_destino: CBU, notas: null, ...extra });
const dep = (importe, referencia) => op('Macro', importe, referencia, { medio: 'deposito_efectivo', ordenante: null });
// Lo que lee el lector de cada archivo, en orden. El 6 trae DOS operaciones;
// el 7 repite el número del 5.
const LECTURAS = [
  [op('Mercado Pago', 150000, '274845028')],
  [op('Banco Nación', 100000, '55500011')],
  [op('Mercado Pago', 200000, '274845999')],
  [dep(140000, '4471')],
  [op('Banco Nación', 200000, '55500022')],
  [op('Mercado Pago', 100000, '274846000'), dep(140000, '4472')],
  [op('Banco Nación', 200000, '555-000-22')],
];
const MSJ_BASE = 'Esa transferencia ya está cargada en la cobranza de DUOLATE del 30/10/2026 (operación 274845999, $ 200.000,00). No se carga dos veces.';

const PDF = (n) => ({ name: `comprobante-${n}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4\n% comprobante ${n}\n%%EOF\n`) });
const sinNbsp = (s) => String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

for (const t of [{ nombre: '1280', ancho: 1280, alto: 900 }, { nombre: '390', ancho: 390, alto: 844 }]) {
  test(`siete comprobantes de una vez: avance, resumen y repetidos, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
    await page.locator('#cob-btn-nueva').click();
    await page.locator('#cob-empresas [data-empresa="u-n"]').click();
    await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-n"]').click();
    await page.evaluate((lecturas) => {
      globalThis.__maqueta = globalThis.__maqueta || {};
      globalThis.__lecturas = [];
      globalThis.__soltar = [];
      globalThis.__preguntas = [];
      let n = 0;
      globalThis.__maqueta.funciones = {
        'ocr-cobranza-comprobantes': (op) => new Promise((soltar) => {
          const i = n++;
          globalThis.__lecturas.push(op?.body);
          globalThis.__soltar.push(() => soltar({ ok: true, modelo: 'claude-opus-5', tipo: 'transferencia', crudo: { comprobantes: lecturas[i] }, propuestos: lecturas[i] }));
        }),
      };
      const norm = (r) => String(r ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
      globalThis.__maqueta.rpc = Object.assign(globalThis.__maqueta.rpc || {}, {
        comprobantes_ya_cargados: (p) => {
          globalThis.__preguntas.push(p);
          const ya = (it, importe) => ({ clave: it.clave, motivo: 'mismo_numero', cobranza_id: 'cob-vieja', cliente: 'DUOLATE', fecha: '2026-10-30',
            importe, referencia: it.referencia, cargada_por: 'Godoy Yanina', cargada_en: '2026-10-30T13:00:00Z', estado: 'registrada' });
          return (p.p_items || []).flatMap(it => norm(it.referencia) === '274845028' ? [ya(it, 150000)]
            : norm(it.referencia) === '55500011' ? [ya(it, 99999)] : []);
        },
      });
    }, LECTURAS);

    await page.locator('[data-abrir-forma="transferencia"]').click();
    const seccion = page.locator('#cob-seccion-transferencias');
    await expect(seccion).toBeVisible();
    const [elegir] = await Promise.all([
      page.waitForEvent('filechooser'),
      seccion.locator('[data-subir-comprobante="transferencia"][data-origen="archivo"]').click(),
    ]);
    expect(elegir.isMultiple()).toBe(true);
    await elegir.setFiles([1, 2, 3, 4, 5, 6, 7].map(PDF));

    // De a uno, con el avance.
    const avance = page.locator('[data-avance-lector="transferencia"]');
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(1);
    await expect(avance).toHaveText('Leyendo 1 de 7…');
    await page.evaluate(() => globalThis.__soltar[0]());
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(2);
    await page.evaluate(() => globalThis.__soltar[1]());
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(3);
    await expect(avance).toHaveText('Leyendo 3 de 7…');
    await avance.scrollIntoViewIfNeeded();
    await captura(page, `muchos-comprobantes-leyendo-${t.nombre}`, info);
    for (let i = 2; i < 7; i++) {
      await expect.poll(() => page.evaluate(() => globalThis.__lecturas.length)).toBe(i + 1);
      await page.evaluate((k) => globalThis.__soltar[k](), i);
    }
    const tarjetas = page.locator('#cob-lista-transferencias [data-transf]');
    await expect(tarjetas).toHaveCount(8);
    await expect(avance).toContainText('Listo: se leyeron los 7 comprobantes');

    // Una foto con dos operaciones: dos tarjetas con el mismo comprobante.
    await expect(tarjetas.nth(5).locator('[data-transf-linea]')).toContainText('Op. N° 274846000');
    await expect(tarjetas.nth(6).locator('.cob-cheque__titulo')).toContainText('Depósito en efectivo 7');

    // El resumen agrupado.
    const resumen = page.locator('#cob-resumen-transferencias');
    await expect(resumen).toBeVisible();
    const textoResumen = sinNbsp(await resumen.innerText());
    expect(textoResumen).toContain('Transferencias: Mercado Pago 3 · $ 450.000,00 — Banco Nación 3 · $ 500.000,00');
    expect(textoResumen).toContain('Depósitos en efectivo: Macro 2 · $ 280.000,00');
    expect(textoResumen).toContain('Total: $ 1.230.000,00');
    await resumen.scrollIntoViewIfNeeded();
    await captura(page, `muchos-comprobantes-resumen-${t.nombre}`, info);
    await expect(tarjetas.nth(0).locator('[data-transf-linea]')).toHaveText(/Mercado Pago · GODOY JUAN · 30\/10\/2026 · \$\s150\.000,00 · Op\. N° 274845028/);

    // Los repetidos.
    const rojo1 = tarjetas.nth(0).locator('[data-transf-repetido]');
    await expect(rojo1).toBeVisible();
    await expect(rojo1).toHaveClass(/cob-aviso--grave/);
    expect(sinNbsp(await rojo1.innerText())).toContain('Ya cargada: cobranza de DUOLATE del 30/10/2026, la cargó Godoy Yanina (op. 274845028, $ 150.000,00).');
    await expect(tarjetas.nth(0)).toHaveClass(/cob-transferencia--repetida/);
    const amarillo = tarjetas.nth(1).locator('[data-transf-repetido]');
    await expect(amarillo).toHaveClass(/cob-aviso--revisar/);
    await expect(amarillo).toContainText('con otro importe');
    await expect(amarillo).toContainText('revisalo');
    await expect(amarillo.locator('[data-sacar-transf]')).toHaveCount(0);
    const rojoTanda = tarjetas.nth(7).locator('[data-transf-repetido]');
    await expect(rojoTanda).toHaveClass(/cob-aviso--grave/);
    await expect(rojoTanda).toContainText('Mismo número de operación que la transferencia 5 de esta cobranza');
    await expect(tarjetas.nth(4).locator('[data-transf-repetido]')).toBeHidden();

    // Guardar bloqueado.
    const guardar = page.locator('#cob-btn-guardar');
    await expect(guardar).toBeDisabled();
    await expect(page.locator('#cob-form-pendientes')).toContainText('Sacá los comprobantes repetidos.');
    await tarjetas.nth(0).scrollIntoViewIfNeeded();
    await captura(page, `muchos-comprobantes-repetidos-${t.nombre}`, info);
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);

    // Sacar los dos rojos: el amarillo no bloquea.
    await tarjetas.nth(7).locator('[data-sacar-transf]').click();
    await tarjetas.nth(0).locator('[data-sacar-transf]').click();
    await expect(tarjetas).toHaveCount(6);
    await expect(page.locator('#cob-lista-transferencias .cob-transferencia--repetida')).toHaveCount(0);
    await expect(guardar).toBeEnabled();
    expect(sinNbsp(await resumen.innerText())).toContain('Total: $ 880.000,00');

    // La pregunta a la base llevó la clave, el número, el importe y la huella.
    const pregunta = await page.evaluate(() => globalThis.__preguntas[globalThis.__preguntas.length - 1]);
    expect(pregunta.p_cobranza_id).toBeNull();
    expect(pregunta.p_items.every(x => typeof x.clave === 'string' && /^[0-9a-f]{64}$/.test(x.sha256))).toBe(true);

    // Guardar: la base lo rechaza y se muestra TAL CUAL; las fotos llevan su huella.
    await page.evaluate((m) => { globalThis.__maqueta.rpc.cargar_cobranza_asentada = 'ERROR:' + m; }, MSJ_BASE);
    let p = null;
    page.on('console', async m => {
      const args = m.args();
      if (args.length >= 3 && /\[maqueta\] rpc/.test(m.text()) && (await args[1].jsonValue()) === 'cargar_cobranza_asentada') p = await args[2].jsonValue();
    });
    await guardar.click();
    await expect(page.locator('#cob-error-guardar')).toHaveText(MSJ_BASE);
    await expect.poll(() => !!p, { timeout: 15000 }).toBe(true);
    expect(p.p_transferencias).toHaveLength(6);
    expect(p.p_fotos).toHaveLength(5);
    expect(p.p_fotos.every(x => /^[0-9a-f]{64}$/.test(x.sha256))).toBe(true);
    expect(new Set(p.p_fotos.map(x => x.sha256)).size).toBe(5);
    await page.locator('#cob-error-guardar').scrollIntoViewIfNeeded();
    await captura(page, `muchos-comprobantes-error-base-${t.nombre}`, info);
    expect(errores).toEqual([]);
  });
}
