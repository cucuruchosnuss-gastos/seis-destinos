// A QUÉ SE APLICA LA COBRANZA Y EL RECIBO (pedido de Facu del 30/10/2026), en
// la maqueta. Yanina asienta una cobranza de J&M (efectivo $ 20.000 y una
// transferencia de $ 100.000) a un cliente CON CORTE:
//  - aparecen los renglones pendientes; "Aplicar todo" reparte con
//    sugerir_aplicacion (el último queda parcial); "Solo N2" deja el resto a
//    cuenta; arriba siempre Total cobrado / Aplicado / Queda a cuenta;
//  - "Por medio de pago": la transferencia a N1 y el efectivo al corte; con un
//    medio pasado se dice y Guardar no se habilita;
//  - Guardar asienta y aplica (aplicar_credito_cliente con medio); el cartel
//    ofrece "Ver / enviar recibo"; el recibo entra en UNA hoja A4 y "Enviar"
//    descarga "Recibo - J&M - dd-mm-aaaa.pdf";
//  - el error de la base al aplicar se muestra tal cual;
//  - un cliente SIN corte no ve nada nuevo.
// A 390 y 1280, sin scroll horizontal ni errores de JavaScript. Corre SIEMPRE,
// sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const sinNbsp = (s) => String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const D = (doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado = 0) => ({ doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado, pendiente: monto - aplicado, orden_id: null });
const DOCS = [
  D('corte', 'c-1', 'total', 'Saldo de corte 02/11/2026', '2026-11-02', 50000),
  D('orden', 'o-42', 'N1', 'N1-0042', '2026-11-03', 100000),
  D('orden', 'o-42', 'N2', 'N2-0042', '2026-11-03', 80000),
  D('nota_debito', 'nd-1', 'total', 'Nota de débito N-ND-0001', '2026-11-04', 30000),
];

// Pone las rpc en vivo de la maqueta. `corte`: si el cliente tiene corte.
async function prepararBase(page, { corte = true, errorAplicar = null } = {}) {
  await page.evaluate(({ docs, corte, errorAplicar }) => {
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__aplicadas = [];
    const sugerir = (p) => {
      let resta = p.p_monto; const items = [];
      for (const d of docs) {
        if (resta <= 0) break;
        if (!(d.pendiente > 0) || (p.p_parte && d.parte !== p.p_parte)) continue;
        const toma = Math.min(resta, d.pendiente);
        items.push({ doc_tipo: d.doc_tipo, doc_id: d.doc_id, parte: d.parte, etiqueta: d.etiqueta, monto: toma });
        resta -= toma;
      }
      return { items, sobra: Math.max(resta, 0) };
    };
    globalThis.__maqueta.rpc = Object.assign(globalThis.__maqueta.rpc || {}, {
      cliente_pendientes: () => ({ activo: corte, imputa_desde: corte ? '2026-11-02T03:00:00Z' : null, saldo_cuenta: 260000, docs: corte ? docs : [], creditos: [] }),
      sugerir_aplicacion: sugerir,
      aplicar_credito_cliente: (p) => {
        globalThis.__aplicadas.push(p);
        if (errorAplicar) return 'ERROR:' + errorAplicar;
        const aplicado = p.p_items.reduce((s, x) => s + x.monto, 0);
        return { aplicado, a_cuenta: 120000 - aplicado };
      },
      recibo_cobranza: (p) => ({
        empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'CUCURUCHOS NUSS SRL', cuit: '30712345671', domicilio: 'Av. Siempre Viva 123, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
        cliente: { id: 'cli-jm-n', nombre: 'J&M', razon_social: 'J Y M SA', cuit: '30999999993', solo_n2: false },
        fecha: '2026-11-05', estado: 'procesada',
        cheques: [{ banco: 'BANCO DE GALICIA Y BUENOS AIRES S.A.U.', banco_codigo: '007', numero: '66259862', tipo: 'diferido', emision: '2026-11-01', pago: '2026-12-15', importe: 150000, echeq: false }],
        transferencias: [{ medio: 'transferencia', cuenta: 'Banco Macro · Nuss', banco_origen: 'Mercado Pago', referencia: '274845028', fecha: '2026-11-05', importe: 100000 }],
        efectivo: 20000, medios: { cheque: 150000, transferencia: 100000, efectivo: 20000 }, total: 270000,
        aplicaciones: [
          { etiqueta: 'Saldo de corte 02/11/2026', parte: 'total', monto_doc: 50000, aplicado: 50000 },
          { etiqueta: 'N1-0042', parte: 'N1', monto_doc: 100000, aplicado: 100000 },
          { etiqueta: 'N2-0042', parte: 'N2', monto_doc: 80000, aplicado: 80000 },
        ],
        a_cuenta: 40000, saldo_cuenta: 30000, _pedido: p.p_cobranza_id,
      }),
    });
  }, { docs: DOCS, corte, errorAplicar });
}

// Una cobranza nueva de J&M (Nuss) con efectivo y una transferencia.
async function cargarCobranza(page, { corte = true, errorAplicar = null } = {}) {
  await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
  await page.locator('#cob-btn-nueva').click();
  await prepararBase(page, { corte, errorAplicar });
  await page.locator('#cob-empresas [data-empresa="u-n"]').click();
  await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-n"]').click();
  await page.locator('[data-abrir-forma="efectivo"]').click();
  await page.locator('#cob-efectivo').fill('20000');
  await page.locator('#cob-efectivo').blur();
  await page.locator('[data-abrir-forma="transferencia"]').click();
  await page.locator('#cob-btn-transferencia').click();
  const tarjeta = page.locator('#cob-lista-transferencias [data-transf]').first();
  await tarjeta.locator('[data-transf-campo="importe"]').fill('100000');
  await tarjeta.locator('[data-transf-campo="importe"]').blur();
  await tarjeta.locator('[data-transf-campo="cuenta_id"]').selectOption('cta-banco-nuss');
}

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

for (const t of [{ nombre: '390', ancho: 390, alto: 844 }, { nombre: '1280', ancho: 1280, alto: 900 }]) {
  test(`aplicar al asentar: todo, solo N2, por medio, guardar y el recibo, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await cargarCobranza(page);

    const sec = page.locator('#cob-aplicar');
    await expect(sec).toBeVisible();
    const cifras = page.locator('#cob-aplicar-cifras');
    // Aplicar todo: el corte entero y el N1 parcial.
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toContain('Aplicado');
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Total cobrado\s*\$ 120\.000,00\s*Aplicado\s*\$ 120\.000,00\s*Queda a cuenta\s*\$ 0,00/);
    const filas = sec.locator('[data-aplicar-fila]');
    await expect(filas).toHaveCount(4);
    await expect(sec.locator('[data-aplicar-doc="corte|c-1|total"]')).toHaveValue('50.000');
    await expect(sec.locator('[data-aplicar-doc="orden|o-42|N1"]')).toHaveValue('70.000');
    await expect(sec.locator('[data-aplicar-doc="orden|o-42|N2"]')).toHaveValue('');
    // Siempre a la vista: en la barra fija de abajo, junto al total.
    await expect(page.locator('#cob-barra-aplicar')).toBeVisible();
    expect(sinNbsp(await page.locator('#cob-barra-aplicar').innerText())).toBe('Aplicado $ 120.000,00 · Queda a cuenta $ 0,00');
    await sec.scrollIntoViewIfNeeded();
    await captura(page, `aplicar-todo-${t.nombre}`, info);

    // Solo N2.
    await sec.getByRole('button', { name: 'Solo N2' }).click();
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Aplicado\s*\$ 80\.000,00\s*Queda a cuenta\s*\$ 40\.000,00/);
    await expect(sec.locator('[data-aplicar-doc="orden|o-42|N2"]')).toHaveValue('80.000');

    // Por medio de pago: la transferencia a N1, el efectivo al corte.
    await sec.locator('[data-aplicar-modo="medio"]').click();
    await expect(sec.locator('[data-aplicar-bloque]')).toHaveCount(2);
    const bTransf = sec.locator('[data-aplicar-bloque="transferencia"]');
    const bEfect = sec.locator('[data-aplicar-bloque="efectivo"]');
    await bTransf.getByRole('button', { name: 'Solo N1' }).click();
    await bEfect.getByRole('button', { name: 'Sugerir' }).click();
    await expect(bTransf.locator('[data-aplicar-doc="orden|o-42|N1"]')).toHaveValue('100.000');
    await expect(bEfect.locator('[data-aplicar-doc="corte|c-1|total"]')).toHaveValue('20.000');
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Aplicado\s*\$ 120\.000,00/);
    // Un medio pasado: se dice y Guardar no se habilita.
    const campoNd = bTransf.locator('[data-aplicar-doc="nota_debito|nd-1|total"]');
    await campoNd.fill('10000');
    await expect(page.locator('#cob-aplicar-errores')).toContainText('Con transferencias aplicás $ 110.000,00 y se cobró $ 100.000,00.');
    await expect(page.locator('#cob-btn-guardar')).toBeDisabled();
    await bTransf.scrollIntoViewIfNeeded();
    await captura(page, `aplicar-por-medio-${t.nombre}`, info);
    await sinScrollHorizontal(page);
    await campoNd.fill('');
    await expect(page.locator('#cob-aplicar-errores')).toBeHidden();
    await expect(page.locator('#cob-btn-guardar')).toBeEnabled();

    // Guardar: asienta y aplica con cada medio.
    await page.locator('#cob-btn-guardar').click();
    const cartel = page.locator('#cob-recien-asentada');
    await expect(cartel).toBeVisible();
    await expect(cartel).toContainText('Aplicado');
    const ap = await page.evaluate(() => globalThis.__aplicadas.at(-1));
    expect(ap.p_credito_tipo).toBe('cobranza');
    expect(ap.p_cliente_id).toBe('cli-jm-n');
    expect(ap.p_items.map(x => `${x.parte}:${x.monto}:${x.medio}`).sort()).toEqual(['N1:100000:transferencia', 'total:20000:efectivo']);
    expect(sinNbsp(await cartel.innerText())).toContain('Queda a cuenta $ 0,00');

    // El recibo.
    await cartel.getByRole('button', { name: 'Ver / enviar recibo' }).click();
    const modal = page.locator('#cob-modal-recibo');
    await expect(modal).toBeVisible();
    const hoja = page.locator('#cob-recibo-hoja');
    await expect(hoja.locator('.rc-titulo')).toHaveText('RECIBO');
    await expect(hoja).toContainText('Con qué pagó');
    await expect(hoja).toContainText('Qué cancela');
    await expect(hoja).toContainText('TOTAL COBRADO');
    await expect(hoja).toContainText('TOTAL APLICADO');
    expect(sinNbsp(await hoja.innerText())).toContain('Queda a cuenta del cliente $ 40.000,00');
    expect(sinNbsp(await hoja.innerText())).toContain('Saldo de la cuenta: $ 30.000,00 a pagar');
    await expect(hoja.locator('img.rc-cab__logo')).toHaveAttribute('src', '../logo-cucuruchos-nuss.png');
    // Las dos cajas de totales a la misma altura.
    const cajas = await hoja.locator('.rc-caja').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)] }));
    expect(cajas.length).toBe(2);
    expect(cajas[0]).toEqual(cajas[1]);
    await captura(page, `recibo-${t.nombre}`, info);
    // UNA hoja A4 al imprimir (alto útil de 281 mm a 96 ppp = 1062 px).
    await page.evaluate(() => document.documentElement.classList.add('rc-imprimiendo'));
    await page.emulateMedia({ media: 'print' });
    const altoImpreso = await hoja.evaluate(e => e.getBoundingClientRect().height);
    expect(altoImpreso, `alto impreso ${altoImpreso}px`).toBeLessThanOrEqual(1062);
    await expect(page.locator('#cob-maestro')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.documentElement.classList.remove('rc-imprimiendo'));

    // Enviar: sin compartir (escritorio) descarga el PDF con su nombre. Las
    // librerías de cdnjs se reemplazan por dobles (sin red en la prueba).
    await page.evaluate(() => {
      window.html2canvas = async () => ({ width: 1000, height: 1400, toDataURL: () => 'data:image/jpeg;base64,AA==' });
      window.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }); } };
    });
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('#cob-recibo-enviar').click()]);
    expect(descarga.suggestedFilename()).toMatch(/^Recibo - J&M - \d{2}-\d{2}-\d{4}\.pdf$/);
    await page.locator('#cob-recibo-cerrar').click();
    await expect(modal).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('el error de la base al aplicar se muestra tal cual, con "Volver a intentar aplicar"', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const MSJ = 'Lo aplicado con un medio de pago supera lo que se cobró con ese medio (cheques $ 0,00, transferencias $ 100.000,00, efectivo $ 20.000,00).';
  await cargarCobranza(page, { errorAplicar: MSJ });
  await expect(page.locator('#cob-aplicar')).toBeVisible();
  await expect.poll(async () => sinNbsp(await page.locator('#cob-aplicar-cifras').innerText())).toMatch(/Aplicado\s*\$ 120\.000,00/);
  await page.locator('#cob-btn-guardar').click();
  const cartel = page.locator('#cob-recien-asentada');
  await expect(cartel).toContainText('No se pudo aplicar: ' + MSJ);
  await expect(cartel.getByRole('button', { name: 'Volver a intentar aplicar' })).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});

test('un cliente SIN corte no ve nada nuevo y se asienta como siempre', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await cargarCobranza(page, { corte: false });
  await expect(page.locator('#cob-btn-guardar')).toBeEnabled();
  await expect(page.locator('#cob-aplicar')).toBeHidden();
  await expect(page.locator('#cob-barra-aplicar')).toBeHidden();
  await page.locator('#cob-btn-guardar').click();
  await expect(page.locator('#cob-vista-listado')).toBeVisible();
  await expect(page.locator('#cob-recien-asentada')).toBeHidden();
  expect(await page.evaluate(() => globalThis.__aplicadas.length)).toBe(0);
  expect(errores, errores.join('\n')).toEqual([]);
});
