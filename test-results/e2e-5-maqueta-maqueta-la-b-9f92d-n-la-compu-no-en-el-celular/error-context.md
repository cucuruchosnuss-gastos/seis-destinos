# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\5-maqueta.spec.js >> maqueta: la barra lateral en modulos/retiros.html (retiros) — a la vista en la compu, no en el celular
- Location: e2e\5-maqueta.spec.js:199:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4180/modulos/retiros.html?maqueta=retiros
Call log:
  - navigating to "http://localhost:4180/modulos/retiros.html?maqueta=retiros", waiting until "load"

```

# Test source

```ts
  101 |       await page.locator('#ad-importar-lista').selectOption('l1')
  102 |       await subirAlImportador(page, 'precios.csv', 'Código (no tocar),Precio nuevo\npr1,3.300\nins:ins-1,820\nzzz,10\n')
  103 |       await expect(page.locator('#ad-importar-vista-previa')).toContainText('no es de un producto ni de un insumo')
  104 |     }],
  105 |     ['importar-saldos', async (page) => {
  106 |       await page.locator('[data-importar-tipo="saldos"]').click()
  107 |       await subirAlImportador(page, 'saldos.csv', 'Código (no tocar),Saldo inicial\nc1,50000\nc2,"-1.500,50"\n')
  108 |     }],
  109 |     ['cheques', async (page) => {
  110 |       await page.locator('#ad-importar-volver').click(); await page.locator('[data-seccion="cheques"]').click()
  111 |       await expect(page.locator('#chq-cartera')).toContainText('En cartera')
  112 |       await expect(page.locator('#ad-empresas')).toBeHidden()
  113 |     }],
  114 |     ['cheques-salidos', async (page) => { await page.locator('#chq-chips-estado button', { hasText: 'Salidos' }).click(); await expect(page.locator('#chq-leyenda')).toBeVisible() }],
  115 |     // Cobranzas por asentar (27/09/2026): la tarjeta, asentar con el sugerido,
  116 |     // y una cobranza asentada desde la cuenta del cliente, con "Reabrir".
  117 |     ['cobranzas', async (page) => {
  118 |       await page.locator('#ad-cheques-volver').click(); await page.locator('[data-seccion="cobranzas"]').click()
  119 |       await expect(page.locator('.ad-cob__escrito').first()).toHaveText('«Caserato»')
  120 |       await expect(page.locator('#ad-empresas')).toBeHidden()
  121 |     }],
  122 |     ['asentar', async (page) => {
  123 |       await page.locator('[data-asentar]').first().click()
  124 |       await expect(page.locator('.ad-opcion-cliente--sugerido')).toBeVisible()
  125 |       await page.locator('#ad-asentar-buscar').fill('pepe de la')
  126 |       await expect(page.locator('#ad-asentar-resultados')).toContainText('Kiosco Pepe')
  127 |       await page.locator('.ad-opcion-cliente--sugerido').click()
  128 |       await page.locator('#ad-asentar-confirmar').click()
  129 |       await expect(page.locator('.ad-cob__hecho')).toContainText('Le queda un saldo a favor')
  130 |     }],
  131 |     ['cobranza-en-la-cuenta', async (page) => {
  132 |       await page.locator('#ad-cobranzas-volver').click(); await page.locator('[data-seccion="clientes"]').click()
  133 |       await page.locator('[data-cliente="c1"]').click()
  134 |       await page.locator('[data-cuenta-cobranza]').click()
  135 |       await expect(page.locator('#ad-cobranza-cuerpo')).toContainText('Asentada por Yanina Godoy')
  136 |       await page.locator('#ad-cobranza-reabrir').click()
  137 |       await expect(page.locator('#ad-reabrir-motivo')).toBeVisible()
  138 |     }],
  139 |   ]],
  140 |   // Un super_admin (27/09/2026): los errores de la app.
  141 |   ['modulos/administracion.html', 'administracion-super', [
  142 |     ['errores', async (page) => {
  143 |       await page.locator('[data-seccion="errores"]').click()
  144 |       await expect(page.locator('#ad-errores-lista')).toContainText('SM-X135 · Android 14 · app instalada')
  145 |       await page.locator('#ad-errores-pantalla').selectOption('produccion')
  146 |       await expect(page.locator('#ad-errores-cuenta')).toHaveText('1 de 2')
  147 |     }],
  148 |   ]],
  149 |   ['modulos/pedidos.html', 'pedidos', [
  150 |     ['lista', async (page) => { await expect(page.locator('[data-pedido]').first()).toBeVisible() }],
  151 |     ['detalle', async (page) => { await page.locator('[data-pedido="pe1"]').click(); await expect(page.locator('#pe-btn-imprimir')).toBeVisible() }],
  152 |     ['clientes', async (page) => { await page.locator('#pe-detalle-volver').click(); await page.locator('#pe-btn-clientes').click(); await expect(page.locator('#pe-clientes-lista')).toContainText('Anatolia') }],
  153 |     ['cargar', async (page) => { await page.locator('#pe-clientes-volver').click(); await page.locator('#pe-btn-nuevo').click() }],
  154 |   ]],
  155 |   ['modulos/produccion-gestion.html', 'produccion-gestion', [
  156 |     ['indicadores', async (page) => { await expect(page.locator('body')).toContainText('lote 7021') }],
  157 |     ['personal', async (page) => {
  158 |       if (await page.locator('#pr-btn-menu').isVisible()) await page.locator('#pr-btn-menu').click()
  159 |       await page.locator('[data-ir-config="personal"]').first().click()
  160 |       await expect(page.locator('body')).toContainText('Agustín Barrera')
  161 |     }],
  162 |     ['conos', async (page) => {
  163 |       if (await page.locator('#pr-btn-menu').isVisible()) await page.locator('#pr-btn-menu').click()
  164 |       await page.locator('[data-ir-config="marcas"]').first().click()
  165 |       // El nombre del pendiente va en un campo (se corrige al aceptar): se afirma el grupo.
  166 |       await expect(page.locator('body')).toContainText('Por revisar · 1')
  167 |     }],
  168 |   ]],
  169 | ];
  170 | 
  171 | for (const [archivo, datos, pasos] of PANTALLAS) {
  172 |   for (const ancho of [390, 1280]) {
  173 |     // Con otro juego de datos para la misma pantalla, el título lo nombra.
  174 |     const conDatos = archivo.endsWith(`/${datos}.html`) ? '' : ` (${datos})`;
  175 |     test(`maqueta: ${archivo}${conDatos} a ${ancho} px, sin scroll horizontal ni errores`, async ({ page }, info) => {
  176 |       await page.setViewportSize({ width: ancho, height: ancho < 800 ? 844 : 900 });
  177 |       const errores = vigilarErrores(page);
  178 |       await page.goto(`${MAQUETA}/${archivo}?maqueta=${datos}`);
  179 |       for (const [nombre, paso, cuando] of pasos) {
  180 |         if (cuando === 'solo1280' && ancho !== 1280) continue
  181 |         await test.step(nombre, async () => {
  182 |           await paso(page, info);
  183 |           await page.waitForTimeout(150);
  184 |           const { ancho: doc, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth }));
  185 |           expect(doc, `scroll horizontal en ${nombre}: el documento mide ${doc} px y la pantalla ${vista}`).toBeLessThanOrEqual(vista);
  186 |           await captura(page, `maqueta-${datos}-${nombre}-${ancho}`, info);
  187 |         });
  188 |       }
  189 |       expect(errores, errores.join('\n')).toEqual([]);
  190 |     });
  191 |   }
  192 | }
  193 | 
  194 | // La barra lateral de la compu (27/09/2026): en cada pantalla de la maqueta,
  195 | // a 1280 px está a la vista con el módulo actual marcado y la página no se
  196 | // mete debajo; a 390 px no existe a la vista. La planta no la carga.
  197 | const conBarra = [...new Map(PANTALLAS.map(([archivo, datos]) => [`${archivo}|${datos}`, [archivo, datos]])).values()];
  198 | for (const [archivo, datos] of conBarra) {
  199 |   test(`maqueta: la barra lateral en ${archivo} (${datos}) — a la vista en la compu, no en el celular`, async ({ page }) => {
  200 |     await page.setViewportSize({ width: 1280, height: 900 });
> 201 |     await page.goto(`${MAQUETA}/${archivo}?maqueta=${datos}`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4180/modulos/retiros.html?maqueta=retiros
  202 |     const barra = page.locator('nav.barra-lateral');
  203 |     await expect(barra).toBeVisible();
  204 |     await expect(barra.locator('[aria-current="page"]')).toHaveCount(1);
  205 |     const { izquierda, ancho } = await page.evaluate(() => ({
  206 |       izquierda: parseFloat(getComputedStyle(document.body).marginLeft),
  207 |       ancho: document.querySelector('nav.barra-lateral').getBoundingClientRect().width,
  208 |     }));
  209 |     expect(izquierda, 'la página se corre lo que mide la barra').toBeCloseTo(ancho, 0);
  210 |     // Achicar y recordar.
  211 |     await page.locator('#barra-lateral-plegar').click();
  212 |     await expect(page.locator('body')).toHaveClass(/barra-lateral-colapsada/);
  213 |     await page.reload();
  214 |     await expect(page.locator('body')).toHaveClass(/barra-lateral-colapsada/);
  215 |     await expect(page.locator('nav.barra-lateral .barra-lateral__nombre').first()).toBeHidden();
  216 |     // El celular.
  217 |     await page.setViewportSize({ width: 390, height: 844 });
  218 |     await expect(barra).toBeHidden();
  219 |     expect(parseFloat(await page.evaluate(() => getComputedStyle(document.body).marginLeft))).toBe(0);
  220 |   });
  221 | }
  222 | 
  223 | test('maqueta: la planta no carga la barra lateral', async ({ page }) => {
  224 |   await page.setViewportSize({ width: 1280, height: 800 });
  225 |   await page.goto(`${MAQUETA}/modulos/produccion.html`);
  226 |   await page.waitForTimeout(1500);
  227 |   await expect(page.locator('nav.barra-lateral')).toHaveCount(0);
  228 |   const html = await (await page.request.get(`${MAQUETA}/modulos/produccion.html`)).text();
  229 |   expect(html).not.toContain('barra-lateral.js');
  230 | });
  231 | 
```