// LA PLANTA ENTRA EN LA TABLET REAL, SIN SCROLL (28/09/2026).
//
// La planta se diseñó para 1280 × 800, pero la tablet de Nuss (Samsung Galaxy
// Tab A11) mide 1007 × 604 CSS px, y instalada quedan unos 1000 × 540 útiles
// apaisada y 600 × 940 parada. Esta prueba abre CADA pantalla de los dos modos
// en la maqueta (Supabase falso, con datos de volumen real: 10 ingredientes,
// muchos lotes y conos, 6 sublotes) a esos dos tamaños y a 1280 × 800, y
// falla si:
//  - la página scrollea (document.scrollingElement.scrollHeight > innerHeight);
//  - algo se sale de su recuadro;
//  - una palabra se corta a la mitad ("Cucuruch / ón");
//  - el número de lote va en dos renglones.
// Las listas largas de verdad (conos, personas, lotes, lo producido) llevan
// data-scroll-propio y scrollean adentro de su recuadro.
//
// Los pasos son los de e2e/pasos-planta.js, los mismos que usa
// e2e/recorrer-planta.js para MIRAR las capturas mientras se ajusta el CSS.
// Corre en cada push, sin credenciales (la maqueta).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[1000, 540], [600, 940], [1280, 800]];

for (const [ancho, alto] of TAMANOS) {
  test(`la planta entra sin scroll a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const problemas = [];
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    for (const [nombre, fn, medir = true] of PASOS_PLANTA) {
      await test.step(nombre, async () => {
        await fn(page);
        if (!medir) return;
        await page.waitForTimeout(150);
        const m = await page.evaluate(`(${medirPantalla.toString()})()`);
        await captura(page, `tamano-${nombre}-${ancho}x${alto}`, info);
        if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
        if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
        for (const a of m.afuera) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
        for (const c of m.cortadas) problemas.push(`${nombre}: palabra cortada ${c}`);
        for (const l of m.lote) problemas.push(`${nombre}: el lote en dos renglones ${l}`);
        // La barra lateral nunca scrollea (01/10/2026: sin "Recargar"
        // entran todos sus botones).
        const barra = await page.evaluate(() => {
          const b = document.getElementById('pr-barra');
          if (!b || b.hidden) return null;
          return { alto: b.scrollHeight > b.clientHeight + 1, ancho: b.scrollWidth > b.clientWidth + 1, sh: b.scrollHeight, ch: b.clientHeight };
        });
        if (barra?.alto || barra?.ancho) problemas.push(`${nombre}: la barra lateral scrollea ${JSON.stringify(barra)}`);
      });
    }
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}

// LA RECETA QUE CAMBIÓ EN MEDIO DEL TURNO (30/09/2026): la misma planta con
// los datos de pruebas/datos-maqueta/produccion-receta-cambio.js (la masa
// anterior es de la v7, la vigente es la v8). La receta suma arriba el aviso
// "La receta cambió (v7 → v8)…", el renglón "nuevo en la receta" y el "otro"
// de la anterior: es la receta más alta que se dibuja, y tiene que entrar
// igual. Se recorren los mismos pasos y se miden solo los de la receta.
const PASOS_RECETA = ['receta', 'receta-modificar'];
for (const [ancho, alto] of TAMANOS) {
  test(`la receta con el aviso de receta cambiada entra sin scroll a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const problemas = [];
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion-receta-cambio`);
    const hasta = PASOS_PLANTA.findIndex(([n]) => n === PASOS_RECETA[PASOS_RECETA.length - 1]);
    for (const [nombre, fn] of PASOS_PLANTA.slice(0, hasta + 1)) {
      await test.step(nombre, async () => {
        await fn(page);
        if (!PASOS_RECETA.includes(nombre)) return;
        // El aviso tiene que estar: si no, se estaría midiendo la receta de siempre.
        await expect(page.locator('#pr-receta-cambio')).toBeVisible();
        await expect(page.locator('#pr-receta-cambio')).toContainText('La receta cambió (v7 → v8) desde la masa anterior.');
        await expect(page.locator('#pr-receta-filas .pr-rec__nuevo')).toHaveText('nuevo en la receta');
        await page.waitForTimeout(150);
        const m = await page.evaluate(`(${medirPantalla.toString()})()`);
        await captura(page, `tamano-cambio-${nombre}-${ancho}x${alto}`, info);
        if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
        if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
        for (const a of m.afuera) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
        for (const c of m.cortadas) problemas.push(`${nombre}: palabra cortada ${c}`);
        for (const l of m.lote) problemas.push(`${nombre}: el lote en dos renglones ${l}`);
      });
    }
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}

// SALA DE MASA SIN MOVER LA RECETA (30/09/2026, Facu en la tablet real):
//  - "Anterior (última)" con el texto más largo ("Masa 128 · ayer, turno
//    Mañana · chocolate": datos produccion-choco y el reloj en el día después
//    del de la maqueta) deja los segmentos en UNA fila de alto fijo, con "…"
//    si no entra;
//  - registrar una masa NO cambia el alto de la lista de ingredientes: la
//    confirmación va EN el botón ("Masa 128 registrada ✓", verde) y vuelve a
//    "Registrar masa" a los 2,5 s, sin ninguna leyenda que empuje la receta.
for (const [ancho, alto] of TAMANOS) {
  test(`registrar y "Anterior" de chocolate no mueven la receta a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion-choco`);
    const hasta = PASOS_PLANTA.findIndex(([n]) => n === 'receta');
    for (const [, fn] of PASOS_PLANTA.slice(0, hasta)) await fn(page);
    // Recién en la sala, el reloj pasa al día después del de la maqueta
    // (2099-12-31), a las 12 de Argentina: la anterior es de AYER y el botón
    // dice su turno. (Antes, el tablero de Producción cambiaría de cara.)
    await page.clock.setFixedTime(new Date('2100-01-01T15:00:00Z'));
    await PASOS_PLANTA[hasta][1](page);
    const detalle = page.locator('#pr-receta-opciones [data-base="anterior"] .pr-como__detalle');
    await expect(page.locator('#pr-receta-opciones [data-base="anterior"] .pr-como__titulo')).toHaveText('Anterior (última)');
    await expect(detalle).toContainText('Masa 128 · ayer, turno Mañana');
    await expect(detalle).toContainText('chocolate');
    const fila = await page.evaluate(() => {
      const o = document.getElementById('pr-receta-opciones');
      const hijos = [...o.children].map(h => h.getBoundingClientRect());
      const ant = o.querySelector('[data-base="anterior"]');
      const det = ant.querySelector('.pr-como__detalle');
      return {
        alto: o.getBoundingClientRect().height,
        tops: [...new Set(hijos.map(r => Math.round(r.top)))],
        altoAnterior: ant.getBoundingClientRect().height,
        detalleEnUnaLinea: det.getBoundingClientRect().height < 20,
        detalleDentro: det.getBoundingClientRect().right <= ant.getBoundingClientRect().right + 1,
      };
    });
    await captura(page, `choco-anterior-${ancho}x${alto}`, info);
    expect(fila.tops.length, `los segmentos en una fila: ${JSON.stringify(fila)}`).toBe(1);
    expect(fila.alto, `la fila de segmentos no crece: ${JSON.stringify(fila)}`).toBeLessThanOrEqual(52);
    expect(fila.altoAnterior, `"Anterior" de alto fijo: ${JSON.stringify(fila)}`).toBeLessThanOrEqual(44);
    expect(fila.detalleEnUnaLinea && fila.detalleDentro, `el detalle en una línea y adentro: ${JSON.stringify(fila)}`).toBe(true);
    const altoLista = () => page.evaluate(() => Math.round(document.getElementById('pr-receta-filas').getBoundingClientRect().height));
    const antes = await altoLista();
    const m1 = await page.evaluate(`(${medirPantalla.toString()})()`);
    expect(m1.scroll || m1.scrollX, `sin scroll antes de registrar: ${JSON.stringify(m1)}`).toBe(false);
    const boton = page.locator('#pr-receta-registrar');
    await boton.click();
    await expect(boton).toHaveText(/registrada ✓/);
    const durante = await altoLista();
    await captura(page, `choco-registrada-${ancho}x${alto}`, info);
    const m2 = await page.evaluate(`(${medirPantalla.toString()})()`);
    expect(m2.scroll || m2.scrollX, `sin scroll con "registrada": ${JSON.stringify(m2)}`).toBe(false);
    expect(durante, `la lista no cambia de alto al registrar (antes ${antes}, durante ${durante})`).toBe(antes);
    await expect(boton).toHaveText(/^Registrar masa/, { timeout: 6000 });
    expect(await altoLista(), 'y tampoco al volver a "Registrar masa"').toBe(antes);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// LA LISTA DE MASAS COMPACTA (08/10/2026): la columna "Masas del turno" de la
// receta y el historial de una máquina, un renglón por masa, y su detalle
// (la ventana, y el panel del historial) entran sin scroll de página en la
// tablet acostada (1000 × 540) y en un teléfono (390 × 844).
for (const [ancho, alto] of [[1000, 540], [390, 844]]) {
  test(`la lista de masas compacta y su detalle entran a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const problemas = [];
    const medir = async (nombre) => {
      await page.waitForTimeout(150);
      const m = await page.evaluate(`(${medirPantalla.toString()})()`);
      await captura(page, `masas-${nombre}-${ancho}x${alto}`, info);
      if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
      if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
      const caja = await page.evaluate(() => {
        const c = document.querySelector('#pr-masa-ventana:not([hidden]) .pr-lp__caja');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, alto: innerHeight };
      });
      if (caja && (caja.top < 0 || caja.bottom > caja.alto + 1)) problemas.push(`${nombre}: la ventana no entra en la pantalla ${JSON.stringify(caja)}`);
      // A 390 px la planta (hecha para la tablet) ya se salía en la cabecera
      // y en los segmentos de la receta antes de este cambio: acá se miden
      // las listas de masas y su detalle, y en la tablet, todo.
      const deLasMasas = (a) => ancho >= 600 || /pr-masa-ventana|pr-mv|pr-mc|pr-rm|pr-hm|pr-lp/.test(a);
      for (const a of m.afuera.filter(deLasMasas)) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
      for (const c of m.cortadas.filter(deLasMasas)) problemas.push(`${nombre}: palabra cortada ${c}`);
      // Cada renglón y la caja de la ventana, adentro del ancho de la pantalla.
      const fuera = await page.evaluate(() => [...document.querySelectorAll('[data-masa-ver], [data-hm-masa], #pr-masa-ventana:not([hidden]) .pr-lp__caja, #pr-hm-detalle')]
        .filter(e => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 1).map(e => e.dataset.masaVer || e.dataset.hmMasa || e.id || e.className));
      for (const f of fuera) problemas.push(`${nombre}: se sale de la pantalla ${f}`);
    };
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    const hasta = PASOS_PLANTA.findIndex(([n]) => n === 'receta');
    for (const [, fn] of PASOS_PLANTA.slice(0, hasta + 1)) await fn(page);
    // Un renglón por masa, sin la fórmula.
    const lista = page.locator('#pr-receta-masas');
    await expect(lista.locator('[data-masa-ver]')).toHaveCount(6);
    await expect(lista.locator('[data-masa-ver="ma-2"]')).toContainText('Modificada');
    await expect(lista.locator('[data-masa-ver="ma-3"]')).toContainText('Original');
    await expect(lista).not.toContainText('Júpiter');
    // Al tocarlo, el detalle.
    await lista.locator('[data-masa-ver="ma-2"]').click();
    const ventana = page.locator('#pr-masa-ventana');
    await expect(ventana).toBeVisible();
    await expect(ventana).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#pr-masa-ventana-titulo')).toHaveText('Masa 2 · Doble');
    await expect(page.locator('#pr-masa-ventana-cuerpo')).toContainText('la cargó');
    await expect(page.locator('#pr-masa-ventana-cuerpo')).toContainText('50 kg');
    await expect(page.locator('#pr-masa-ventana-cuerpo')).toContainText('Júpiter');
    await medir('ventana');
    await page.keyboard.press('Escape');
    await expect(ventana).toBeHidden();
    await expect(lista.locator('[data-masa-ver="ma-2"]')).toBeFocused();
    // El historial de la máquina: la lista compacta y el detalle al lado.
    await page.locator('[data-lateral-turno]').first().click();
    await expect(page.locator('#pr-hist-maq')).toBeVisible();
    await page.locator('#pr-hm-lista [data-hm-masa="ma-2"]').click();
    await expect(page.locator('#pr-hm-detalle')).toContainText('Júpiter');
    await expect(page.locator('#pr-hm-lista')).not.toContainText('Júpiter');
    await medir('historial');
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}

// El medidor mide de verdad: una página que scrollea y una palabra partida
// ponen la prueba en rojo (así un cero no es "no miré").
test('el medidor detecta el scroll, lo que se sale y la palabra cortada', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 300 });
  await page.setContent(`<body style="margin:0;font:16px sans-serif">
    <div style="height:600px">alto</div>
    <div style="width:100px;white-space:nowrap">un texto demasiado largo para su caja</div>
    <div style="width:60px;word-break:break-all">Cucuruchón</div>
    <div class="pr-maquina__lote" style="width:20px;font-size:30px;line-height:1">Lote 7033</div>
  </body>`);
  const m = await page.evaluate(`(${medirPantalla.toString()})()`);
  expect(m.scroll).toBe(true);
  expect(m.afuera.length).toBeGreaterThan(0);
  expect(m.cortadas.some(c => /Cucuruchón/.test(c))).toBe(true);
  expect(m.lote.length).toBe(1);
});
