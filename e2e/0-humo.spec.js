// El humo: corre SIEMPRE, sin credenciales. Cada página del repo se abre en un
// Chromium real y no puede tirar ningún error de JavaScript al cargar. Es lo que
// habría atajado en el primer segundo el módulo muerto por dos declaraciones con
// el mismo nombre (ver Aprendizajes: "el harness valida un fragmento y el
// navegador no puede ni cargar el archivo").
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { vigilarErrores, captura } = require('./ayuda');

const RAIZ = path.join(__dirname, '..');
const paginas = [
  ...fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')),
  ...fs.readdirSync(path.join(RAIZ, 'modulos')).filter(f => f.endsWith('.html')).map(f => `modulos/${f}`),
].sort();

for (const p of paginas) {
  test(`humo: ${p} carga sin errores de JavaScript`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto(`/${p}`, { waitUntil: 'load' });
    // Sin sesión, las protegidas se van al login: se da un momento para que
    // corra el módulo (un error de parseo salta antes de cualquier redirección).
    // No se espera "networkidle": Turnstile mantiene la red ocupada.
    await page.waitForTimeout(2500);
    // dashboard.html y mfa.html cortan el script con `throw new Error('Sin
    // sesión')` después de mandar al login: es a propósito, y solo ese texto
    // exacto se acepta.
    const reales = errores.filter(e => e !== 'pageerror: Sin sesión');
    expect(reales, reales.join('\n')).toEqual([]);
  });
}

test('humo: el login se dibuja con su formulario', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.goto('/login.html');
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#contrasena')).toBeVisible();
  await expect(page.locator('#btn-ingresar')).toBeVisible();
  await captura(page, 'login', info);
  expect(errores).toEqual([]);
});

test('humo: la planta sin sesión manda al login', async ({ page }) => {
  await page.goto('/modulos/produccion.html');
  await page.waitForURL(/login\.html/, { timeout: 20000 });
});
