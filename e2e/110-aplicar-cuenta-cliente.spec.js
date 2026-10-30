// LA CUENTA DEL CLIENTE: PENDIENTES DESDE EL CORTE, APLICAR Y EL RECIBO
// (30/10/2026, rama ci-prueba/aplicar-cobranzas, parte B), en la maqueta
// (administracion), sin credenciales, a 390 y 1280 px:
//  - Administración → Clientes → Distribuidora Anatolia CON corte: la sección
//    "Pendientes desde el corte" con lo que debe y lo que tiene a favor; el
//    hueco de la base dicho en el crédito que no se puede seguir aplicando;
//  - "Aplicar" en la cobranza que cargó el cobrador: sugiere, aplica
//    (aplicar_credito_cliente) y vuelve a leer; después el saldo a favor del
//    corte;
//  - "Recibo" en la línea de la cobranza: UNA hoja A4 al imprimir y "Enviar"
//    descarga el PDF;
//  - el error de la base al aplicar, tal cual;
//  - un cliente SIN corte no ve nada nuevo;
//  - embebida en Cuentas corrientes → Clientes se ve igual.
// Sin scroll horizontal ni errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const sinNbsp = (s) => String(s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const COBRANZA = 'c3333333-3333-4333-8333-333333333333';

const D = (doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado = 0) => ({ doc_tipo, doc_id, parte, etiqueta, fecha, orden_id: null, monto, aplicado, pendiente: monto - aplicado });
const DOCS = [
  D('orden', 'o1', 'N1', 'N1-0012', '2026-09-20', 26000),
  D('orden', 'o1', 'N2', 'N2-0012', '2026-09-20', 20000),
  D('nota_debito', 'nd-1', 'total', 'Nota de débito N-ND-0001', '2026-09-25', 15000),
];
const K = (credito_tipo, credito_id, etiqueta, fecha, monto, aplicado, medios = null, apm = null) => ({ credito_tipo, credito_id, etiqueta, fecha, monto, aplicado, libre: monto - aplicado, medios, aplicado_por_medio: apm });
const CREDITOS = [
  K('corte', 'c1', 'Saldo a favor al corte', '2026-09-01', 10000, 0),
  K('cobranza', COBRANZA, 'Cobranza del 22/09/2026', '2026-09-22', 30000, 0, { cheque: 0, transferencia: 0, efectivo: 30000 }, null),
  K('movimiento', 'mv-9', 'Ajuste a favor', '2026-09-23', 5000, 1000),
];

// Las rpc en vivo de la maqueta (en la página o en el marco).
async function prepararBase(destino, { corte = true, errorAplicar = null } = {}) {
  await destino.evaluate(({ docs, creditos, corte, errorAplicar, cobranza }) => {
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__aplicadas = [];
    globalThis.__lecturas = 0;
    const sugerir = (p) => {
      let resta = Math.round(p.p_monto * 100); const items = [];
      for (const d of docs) {
        if (resta <= 0) break;
        const pend = Math.round(d.pendiente * 100);
        if (!(pend > 0) || (p.p_parte && d.parte !== p.p_parte)) continue;
        const toma = Math.min(resta, pend);
        items.push({ doc_tipo: d.doc_tipo, doc_id: d.doc_id, parte: d.parte, etiqueta: d.etiqueta, monto: toma / 100 });
        resta -= toma;
      }
      return { items, sobra: resta / 100 };
    };
    globalThis.__maqueta.rpc = Object.assign(globalThis.__maqueta.rpc || {}, {
      cliente_pendientes: () => { globalThis.__lecturas++; return { activo: corte, imputa_desde: corte ? '2026-09-01T03:00:00+00:00' : null, saldo_cuenta: 96000, docs: corte ? docs : [], creditos: corte ? creditos : [] }; },
      sugerir_aplicacion: sugerir,
      aplicar_credito_cliente: (p) => {
        globalThis.__aplicadas.push(p);
        if (errorAplicar) return 'ERROR:' + errorAplicar;
        const aplicado = p.p_items.reduce((s, x) => s + x.monto, 0);
        const k = creditos.find(x => x.credito_id === p.p_credito_id);
        return { aplicado, a_cuenta: k.monto - aplicado };
      },
      recibo_cobranza: (p) => ({
        empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'CUCURUCHOS NUSS SRL', cuit: '30712345671', domicilio: 'Av. Siempre Viva 123, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
        cliente: { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', solo_n2: false },
        fecha: '2026-09-22', estado: 'procesada', cheques: [], transferencias: [],
        efectivo: 30000, medios: { cheque: 0, transferencia: 0, efectivo: 30000 }, total: 30000,
        aplicaciones: [{ etiqueta: 'N1-0012', parte: 'N1', doc_tipo: 'orden', doc_id: 'o1', fecha: '2026-09-20', monto_doc: 26000, aplicado: 26000, medios: { efectivo: 26000 } }],
        a_cuenta: 4000, saldo_cuenta: 96000, _pedido: p.p_cobranza_id === cobranza,
      }),
    });
  }, { docs: DOCS, creditos: CREDITOS, corte, errorAplicar, cobranza: COBRANZA });
}

async function abrirCuenta(page, opciones) {
  await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes&maqueta=administracion`);
  await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
  await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=clientes`);
  await expect(page.locator('#ad-vista-clientes')).toBeVisible();
  await prepararBase(page, opciones);
  await page.locator('.ad-fila[data-cliente="c1"]').click();
  await expect(page.locator('#ad-cliente-cuerpo')).toContainText('Deuda de agosto');
}

const sinScrollHorizontal = async (page) => {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
};

for (const t of [{ nombre: '390', ancho: 390, alto: 844 }, { nombre: '1280', ancho: 1280, alto: 900 }]) {
  test(`aplicar después desde la cuenta del cliente: la cobranza del cobrador y el corte, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await abrirCuenta(page);
    const sec = page.locator('#ad-pend');
    await expect(sec).toBeVisible();
    await expect(sec).toContainText('Pendientes desde el corte');
    await expect(sec.locator('[data-ad-pend-doc]')).toHaveCount(3);
    await expect(sec.locator('[data-ad-pend-credito]')).toHaveCount(3);
    await expect(sec).toContainText('Este crédito ya tiene una parte aplicada: para seguir aplicando falta una función de la base');
    await expect(sec.locator('[data-ad-aplicar]')).toHaveCount(2);
    await sinScrollHorizontal(page);
    await sec.scrollIntoViewIfNeeded();
    await captura(page, `pendientes-${t.nombre}`, info);

    // La cobranza que cargó el cobrador.
    await sec.locator(`[data-ad-aplicar="cobranza|${COBRANZA}"]`).click();
    const panel = page.locator('#ad-apl');
    await expect(panel).toBeVisible();
    await expect.poll(async () => sinNbsp(await page.locator('#ad-apl-cifras').innerText())).toMatch(/Libre para aplicar\s*\$ 30\.000,00\s*Aplicado ahora\s*\$ 30\.000,00\s*Queda a cuenta\s*\$ 0,00/);
    await expect(panel.locator('[data-ad-apl-doc="orden|o1|N1"]')).toHaveValue('26.000');
    await expect(panel.locator('[data-ad-apl-doc="orden|o1|N2"]')).toHaveValue('4.000');
    // Escribir a mano: las cifras en el lugar, sin perder el foco.
    const n2 = panel.locator('[data-ad-apl-doc="orden|o1|N2"]');
    await n2.fill('');
    await n2.pressSequentially('3000');
    await expect.poll(async () => sinNbsp(await page.locator('#ad-apl-cifras').innerText())).toContain('Queda a cuenta $ 1.000,00');
    await expect(n2).toBeFocused();
    // Por medio de pago: un bloque, el efectivo.
    await panel.locator('[data-ad-apl-modo="medio"]').click();
    await expect(panel.locator('[data-ad-apl-bloque]')).toHaveCount(1);
    await panel.locator('[data-ad-apl-modo="todo"]').click();
    await panel.locator('[data-ad-apl-sugerir="todo"][data-ad-apl-parte=""]').click();
    await expect(panel.locator('[data-ad-apl-doc="orden|o1|N2"]')).toHaveValue('4.000');
    await sinScrollHorizontal(page);
    await panel.scrollIntoViewIfNeeded();
    await captura(page, `aplicar-cobrador-${t.nombre}`, info);
    await page.locator('#ad-apl-confirmar').click();
    await expect(panel).toBeHidden();
    const ap = await page.evaluate(() => globalThis.__aplicadas.at(-1));
    expect(ap.p_cliente_id).toBe('c1');
    expect(ap.p_credito_tipo).toBe('cobranza');
    expect(ap.p_credito_id).toBe(COBRANZA);
    expect(ap.p_items.map(x => `${x.parte}:${x.monto}:${x.medio}`)).toEqual(['N1:26000:null', 'N2:4000:null']);
    await expect.poll(() => page.evaluate(() => globalThis.__lecturas)).toBe(2);

    // El saldo a favor del corte.
    await sec.locator('[data-ad-aplicar="corte|c1"]').click();
    await expect.poll(async () => sinNbsp(await page.locator('#ad-apl-cifras').innerText())).toMatch(/Libre para aplicar\s*\$ 10\.000,00/);
    await page.locator('#ad-apl-confirmar').click();
    await expect(panel).toBeHidden();
    const ap2 = await page.evaluate(() => globalThis.__aplicadas.at(-1));
    expect(ap2.p_credito_tipo).toBe('corte');
    expect(ap2.p_credito_id).toBe('c1');
    expect(ap2.p_items.map(x => `${x.parte}:${x.monto}`)).toEqual(['N1:10000']);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`"Recibo" en la línea de la cobranza: una hoja A4 y el PDF, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await abrirCuenta(page);
    const boton = page.locator(`.ad-rc-linea [data-ad-recibo="${COBRANZA}"]`);
    await expect(boton).toBeVisible();
    await boton.click();
    const modal = page.locator('#ad-rc');
    await expect(modal).toBeVisible();
    const hoja = page.locator('#ad-rc-hoja');
    await expect(hoja.locator('.ad-rc-titulo')).toHaveText('RECIBO');
    await expect(hoja).toContainText('Con qué pagó');
    await expect(hoja).toContainText('Qué cancela');
    expect(sinNbsp(await hoja.innerText())).toContain('Queda a cuenta del cliente $ 4.000,00');
    expect(sinNbsp(await hoja.innerText())).toContain('Saldo de la cuenta: $ 96.000,00 a pagar');
    await expect(hoja.locator('img.ad-rc-cab__logo')).toHaveAttribute('src', '../logo-cucuruchos-nuss.png');
    const cajas = await hoja.locator('.ad-rc-caja').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)] }));
    expect(cajas.length).toBe(2);
    expect(cajas[0]).toEqual(cajas[1]);
    await captura(page, `recibo-cuenta-${t.nombre}`, info);
    // Imprimir: UNA hoja A4 (alto útil de 281 mm a 96 ppp = 1062 px), sola.
    await page.evaluate(() => { window.print = () => {}; });
    await page.locator('#ad-rc-imprimir').click();
    await page.emulateMedia({ media: 'print' });
    const impresa = page.locator('#ad-impresion .ad-rc-hoja');
    await expect(impresa).toHaveCount(1);
    const alto = await impresa.evaluate(e => e.getBoundingClientRect().height);
    expect(alto, `alto impreso ${alto}px`).toBeLessThanOrEqual(1062);
    await expect(modal).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    // Enviar: sin compartir, descarga el PDF (las librerías de cdnjs, dobles).
    await page.evaluate(() => {
      window.html2canvas = async () => ({ width: 1000, height: 1400, toDataURL: () => 'data:image/jpeg;base64,AA==' });
      window.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }); } };
    });
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('#ad-rc-enviar').click()]);
    expect(descarga.suggestedFilename()).toBe('Recibo - Distribuidora Anatolia - 22-09-2026.pdf');
    await page.locator('#ad-rc-cerrar').click();
    await expect(modal).toBeHidden();
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('el error de la base al aplicar se muestra tal cual', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const MSJ = 'Uno de los renglones no está pendiente en la cuenta de este cliente.';
  await abrirCuenta(page, { errorAplicar: MSJ });
  await page.locator('[data-ad-aplicar="corte|c1"]').click();
  await expect.poll(async () => sinNbsp(await page.locator('#ad-apl-cifras').innerText())).toMatch(/Aplicado ahora\s*\$ 10\.000,00/);
  await page.locator('#ad-apl-confirmar').click();
  await expect(page.locator('#ad-apl-error')).toHaveText(MSJ);
  await expect(page.locator('#ad-apl')).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});

test('un cliente SIN corte no ve nada nuevo', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirCuenta(page, { corte: false });
  await expect.poll(() => page.evaluate(() => globalThis.__lecturas)).toBe(1);
  await expect(page.locator('#ad-pend')).toHaveCount(0);
  await expect(page.locator('.ad-rc-linea')).toHaveCount(0);
  await expect(page.locator('#ad-cliente-cuerpo [data-ad-recibo], #ad-cliente-cuerpo [data-ad-aplicar]')).toHaveCount(0);
  expect(errores, errores.join('\n')).toEqual([]);
});

test('embebida en Cuentas corrientes → Clientes se ve igual', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`);
  await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
  await page.reload();
  await page.locator('[data-cc-seccion="clientes"]').click();
  const marco = page.frameLocator('#cc-clientes-marco');
  await expect(marco.locator('#ad-vista-clientes')).toBeVisible();
  const frame = page.frames().find(f => /administracion\.html/.test(f.url()));
  await prepararBase(frame);
  await marco.locator('.ad-fila[data-cliente="c1"]').click();
  await expect(marco.locator('#ad-pend')).toBeVisible();
  await expect(marco.locator(`[data-ad-aplicar="cobranza|${COBRANZA}"]`)).toBeVisible();
  await marco.locator(`#ad-pend [data-ad-recibo="${COBRANZA}"]`).click();
  await expect(marco.locator('#ad-rc')).toBeVisible();
  await expect(marco.locator('#ad-rc-hoja .ad-rc-titulo')).toHaveText('RECIBO');
  await sinScrollHorizontal(page);
  expect(errores, errores.join('\n')).toEqual([]);
});
