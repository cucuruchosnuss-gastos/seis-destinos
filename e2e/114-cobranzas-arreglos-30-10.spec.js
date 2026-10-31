// ARREGLOS DE LA AUDITORÍA DEL 30/10/2026 en Cobranzas (puntos 3 y 5a), en
// la maqueta, a 390 y 1280 px:
//  3) Yanina asienta una cobranza de J&M con una transferencia; la base la
//     GUARDA pero la respuesta no llega (sin señal) y queda en el celular. Más
//     tarde vuelve a abrir la app y ese borrador: comprobantes_ya_cargados
//     recibe p_cobranza_id = el id de la cobranza (el mismo que mandaba cuando
//     era nueva) y su propia transferencia NO sale en rojo: Guardar no se
//     traba. La base de mentira responde como la real (sin la cobranza
//     p_cobranza_id) y recuerda lo guardado aunque se recargue la página.
//  5a) "Por medio de pago" con efectivo y transferencia, cada uno a un renglón;
//     se borra el efectivo: su bloque desaparece y Guardar NO queda trabado
//     por lo que tenía escrito; aplicar_credito_cliente no recibe el efectivo.
// Sin scroll horizontal ni errores de JavaScript. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const sinNbsp = (s) => String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const D = (doc_tipo, doc_id, parte, etiqueta, fecha, monto) => ({ doc_tipo, doc_id, parte, etiqueta, fecha, monto, aplicado: 0, pendiente: monto, orden_id: null });
const DOCS = [
  D('corte', 'c-1', 'total', 'Saldo de corte 02/11/2026', '2026-11-02', 50000),
  D('orden', 'o-42', 'N1', 'N1-0042', '2026-11-03', 100000),
  D('orden', 'o-42', 'N2', 'N2-0042', '2026-11-03', 80000),
];

// Las rpc en vivo de la maqueta, puestas ANTES de que cargue la página (y en
// cada recarga). Lo que "guardó la base" vive en localStorage: sobrevive a la
// recarga. `sinRespuesta`: cargar_cobranza_asentada guarda pero contesta como
// si se hubiera cortado la señal.
async function prepararBase(page, { corte = false, sinRespuesta = false } = {}) {
  await page.addInitScript(({ docs, corte, sinRespuesta }) => {
    const CLAVE = 'e2e114.guardadas';
    const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') } catch { return {} } };
    const norm = (r) => String(r ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    globalThis.__aplicadas = [];
    globalThis.__preguntas = [];
    globalThis.__guardadas = () => leer();
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__maqueta.rpc = Object.assign(globalThis.__maqueta.rpc || {}, {
      cliente_pendientes: () => ({ activo: corte, imputa_desde: corte ? '2026-11-02T03:00:00Z' : null, saldo_cuenta: 230000, docs: corte ? docs : [], creditos: [] }),
      // Como la base: del más viejo al más nuevo, el último parcial.
      sugerir_aplicacion: (p) => {
        let resta = p.p_monto; const items = [];
        for (const d of docs) {
          if (resta <= 0) break;
          if (!(d.pendiente > 0) || (p.p_parte && d.parte !== p.p_parte)) continue;
          const toma = Math.min(resta, d.pendiente);
          items.push({ doc_tipo: d.doc_tipo, doc_id: d.doc_id, parte: d.parte, etiqueta: d.etiqueta, monto: toma });
          resta -= toma;
        }
        return { items, sobra: Math.max(resta, 0) };
      },
      aplicar_credito_cliente: (p) => {
        globalThis.__aplicadas.push(p);
        return { aplicado: p.p_items.reduce((s, x) => s + x.monto, 0), a_cuenta: 0 };
      },
      cargar_cobranza_asentada: (p) => {
        const g = leer(); g[p.p_id] = p;
        try { localStorage.setItem(CLAVE, JSON.stringify(g)) } catch { /* nada */ }
        if (sinRespuesta) return 'ERROR:Failed to fetch';
        return { id: p.p_id, importe: 0, saldo_cliente: 0, asentada: true };
      },
      // Como la real (pg_get_functiondef del 31/10/2026): mismo número
      // normalizado desde 4 caracteres, SIN la cobranza p_cobranza_id.
      comprobantes_ya_cargados: (p) => {
        globalThis.__preguntas.push(p);
        const r = [];
        for (const it of p.p_items || []) {
          const ref = norm(it.referencia);
          if (ref.length < 4) continue;
          for (const [id, c] of Object.entries(leer())) {
            if (p.p_cobranza_id && id === p.p_cobranza_id) continue;
            for (const t of c.p_transferencias || []) {
              if (norm(t.referencia) !== ref) continue;
              r.push({ clave: it.clave, motivo: 'mismo_numero', cobranza_id: id, cliente: 'J&M', fecha: c.p_fecha, importe: t.importe,
                referencia: t.referencia, cargada_por: 'Godoy Yanina', cargada_en: '2026-10-31T13:00:00Z', estado: 'procesada' });
            }
          }
        }
        return r;
      },
    });
  }, { docs: DOCS, corte, sinRespuesta });
}

async function nuevaDeJm(page, opciones) {
  await prepararBase(page, opciones);
  await page.goto(`${MAQUETA}/modulos/cobranzas.html?maqueta=cobranzas`);
  await page.locator('#cob-btn-nueva').click();
  await page.locator('#cob-empresas [data-empresa="u-n"]').click();
  await page.locator('#cob-lista-clientes [data-cliente-id="cli-jm-n"]').click();
}

async function agregarTransferencia(page, { importe = '100000', referencia = '' } = {}) {
  await page.locator('[data-abrir-forma="transferencia"]').click();
  await page.locator('#cob-btn-transferencia').click();
  const tarjeta = page.locator('#cob-lista-transferencias [data-transf]').first();
  await tarjeta.locator('[data-transf-campo="importe"]').fill(importe);
  await tarjeta.locator('[data-transf-campo="importe"]').blur();
  if (referencia) {
    await tarjeta.locator('[data-transf-campo="referencia"]').fill(referencia);
    await tarjeta.locator('[data-transf-campo="referencia"]').blur();
  }
  await tarjeta.locator('[data-transf-campo="cuenta_id"]').selectOption('cta-banco-nuss');
  return tarjeta;
}

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

for (const t of [{ nombre: '390', ancho: 390, alto: 844 }, { nombre: '1280', ancho: 1280, alto: 900 }]) {
  test(`punto 3: el borrador que la base ya guardó no choca consigo mismo, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await nuevaDeJm(page, { sinRespuesta: true });
    const tarjeta = await agregarTransferencia(page, { importe: '928559,01', referencia: '274845028' });
    // Mientras es nueva ya se pregunta, y con el id del formulario.
    await expect.poll(() => page.evaluate(() => globalThis.__preguntas.length)).toBeGreaterThan(0);
    const idNueva = await page.evaluate(() => globalThis.__preguntas.at(-1).p_cobranza_id);
    expect(idNueva, 'una cobranza nueva manda su id').toMatch(/^[0-9a-f-]{36}$/);
    await expect(tarjeta).not.toHaveClass(/cob-transferencia--repetida/);
    await expect(page.locator('#cob-btn-guardar')).toBeEnabled();

    // Guardar: la base la guarda, la respuesta no llega. Queda en el celular.
    await page.locator('#cob-btn-guardar').click();
    await expect.poll(() => page.evaluate(() => Object.keys(globalThis.__guardadas()).length)).toBe(1);
    const idGuardada = await page.evaluate(() => Object.keys(globalThis.__guardadas())[0]);
    expect(idGuardada).toBe(idNueva);
    await expect(page.locator('#cob-banner-local')).toBeVisible();

    // Más tarde vuelve a abrir la app: el borrador sigue en el celular.
    await page.reload();
    const banner = page.locator('#cob-banner-local');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Hay cobranzas solo en este celular.');
    await banner.locator(`[data-abrir-local="${idGuardada}"]`).click();
    // La revisión pregunta con su propio id…
    await expect.poll(() => page.evaluate(() => globalThis.__preguntas.length)).toBeGreaterThan(0);
    const ultima = await page.evaluate(() => globalThis.__preguntas.at(-1));
    expect(ultima.p_cobranza_id).toBe(idGuardada);
    expect(ultima.p_items.map(x => x.referencia)).toEqual(['274845028']);
    // …y su propia transferencia NO sale en rojo.
    const reabierta = page.locator('#cob-lista-transferencias [data-transf]').first();
    await expect(reabierta).toBeVisible();
    await expect(reabierta).not.toHaveClass(/cob-transferencia--repetida/);
    await expect(page.locator('#cob-lista-transferencias')).not.toContainText('Ya cargada');
    await expect(page.locator('#cob-btn-guardar')).toBeEnabled();
    await expect(page.locator('#cob-form-pendientes')).not.toContainText('Sacá los comprobantes repetidos.');
    await reabierta.scrollIntoViewIfNeeded();
    await captura(page, `borrador-reabierto-sin-rojo-${t.nombre}`, info);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`punto 5a: un medio que se queda sin cobro no traba Guardar, a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await nuevaDeJm(page, { corte: true });
    await page.locator('[data-abrir-forma="efectivo"]').click();
    await page.locator('#cob-efectivo').fill('20000');
    await page.locator('#cob-efectivo').blur();
    await agregarTransferencia(page, { importe: '100000' });

    const sec = page.locator('#cob-aplicar');
    await expect(sec).toBeVisible();
    const cifras = page.locator('#cob-aplicar-cifras');
    // Primero termina la sugerencia de "Aplicar todo" (como en e2e/108).
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Aplicado\s*\$ 120\.000,00/);
    await sec.locator('[data-aplicar-modo="medio"]').click();
    await expect(sec.locator('[data-aplicar-bloque]')).toHaveCount(2);
    const bTransf = sec.locator('[data-aplicar-bloque="transferencia"]');
    const bEfect = sec.locator('[data-aplicar-bloque="efectivo"]');
    await bTransf.getByRole('button', { name: 'Solo N1' }).click();
    await bEfect.getByRole('button', { name: 'Sugerir' }).click();
    await expect(bTransf.locator('[data-aplicar-doc="orden|o-42|N1"]')).toHaveValue('100.000');
    await expect(bEfect.locator('[data-aplicar-doc="corte|c-1|total"]')).toHaveValue('20.000');
    await expect(page.locator('#cob-btn-guardar')).toBeEnabled();

    // Se borra el efectivo: el bloque desaparece y Guardar sigue habilitado.
    await page.locator('#cob-efectivo').fill('');
    await page.locator('#cob-efectivo').blur();
    await expect(sec.locator('[data-aplicar-bloque="efectivo"]')).toHaveCount(0);
    await expect(sec.locator('[data-aplicar-bloque]')).toHaveCount(1);
    await expect(page.locator('#cob-aplicar-errores')).toBeHidden();
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Total cobrado\s*\$ 100\.000,00\s*Aplicado\s*\$ 100\.000,00\s*Queda a cuenta\s*\$ 0,00/);
    await expect(page.locator('#cob-btn-guardar')).toBeEnabled();
    await sec.scrollIntoViewIfNeeded();
    await captura(page, `medio-sin-cobro-${t.nombre}`, info);
    await sinScrollHorizontal(page);

    // Guardar: se aplica solo la transferencia.
    await page.locator('#cob-btn-guardar').click();
    await expect(page.locator('#cob-recien-asentada')).toBeVisible();
    const ap = await page.evaluate(() => globalThis.__aplicadas.at(-1));
    expect(ap.p_items.map(x => `${x.parte}:${x.monto}:${x.medio}`)).toEqual(['N1:100000:transferencia']);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`"Por medio de pago" enseguida de cambiar lo cobrado no vuelve solo a "Aplicar todo", a ${t.nombre}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: t.ancho, height: t.alto });
    await nuevaDeJm(page, { corte: true });
    await page.locator('[data-abrir-forma="efectivo"]').click();
    await page.locator('#cob-efectivo').fill('20000');
    await page.locator('#cob-efectivo').blur();
    await agregarTransferencia(page, { importe: '100000' });
    const sec = page.locator('#cob-aplicar');
    const cifras = page.locator('#cob-aplicar-cifras');
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Aplicado\s*\$ 120\.000,00/);
    // Cambia el efectivo y, sin esperar la sugerencia nueva, "Por medio de pago".
    await page.locator('#cob-efectivo').fill('40000');
    await page.locator('#cob-efectivo').blur();
    await sec.locator('[data-aplicar-modo="medio"]').click();
    // Pasa de largo el retardo de 400 ms: la pantalla sigue por medio.
    await page.waitForTimeout(1000);
    await expect(sec.locator('[data-aplicar-modo="medio"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(sec.locator('[data-aplicar-bloque]')).toHaveCount(2);
    await expect.poll(async () => sinNbsp(await cifras.innerText())).toMatch(/Total cobrado\s*\$ 140\.000,00/);
    await sec.scrollIntoViewIfNeeded();
    await captura(page, `por-medio-enseguida-${t.nombre}`, info);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
