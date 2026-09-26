// Accesos: que cargue sin el error del embed ambiguo (HTTP 300 / PGRST201) que
// dejó la pantalla en blanco el 24/09/2026.
//
// La cuenta del robot NO es super_admin (y no tiene que serlo), así que la
// pantalla la rechaza antes de pedir los datos. Por eso la prueba tiene dos
// mitades: (1) la pantalla responde con su mensaje y sin errores de JS, y (2)
// las MISMAS consultas de cargarTodo(), leídas del archivo tal cual está en el
// commit, se hacen con la sesión del robot y ninguna vuelve con 300 ni error.
// PostgREST resuelve el embed antes de mirar permisos: sirve igual.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { avisoSinCredenciales, entrarComo, sesionDelRobot, consultar, vigilarErrores, captura } = require('./ayuda');

function consultasDeCargarTodo() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'modulos', 'accesos.html'), 'utf8');
  const ini = html.indexOf('async function cargarTodo()');
  const fin = html.indexOf('document.getElementById(\'estado-cargando\').hidden = true', ini);
  const cuerpo = html.slice(ini, fin);
  const out = [...cuerpo.matchAll(/\.from\('([\w]+)'\)\.select\('([^']+)'\)/g)]
    .map(m => ({ tabla: m[1], select: m[2].replace(/\s+/g, '') }));
  if (out.length < 4) throw new Error(`No se encontraron las consultas de cargarTodo (${out.length}).`);
  return out;
}

// Corre SIEMPRE, sin credenciales: con la key pública PostgREST contesta 300 al
// embed ambiguo y 401 al sano (medido el 25/09/2026), así que el choque se ve igual.
test('accesos (sin sesión): ninguna consulta de cargarTodo es un embed ambiguo', async () => {
  const { URL_BASE, KEY_PUBLICA } = require('./ayuda');
  for (const c of consultasDeCargarTodo()) {
    const r = await fetch(`${URL_BASE}/rest/v1/${c.tabla}?select=${encodeURIComponent(c.select)}&limit=1`, { headers: { apikey: KEY_PUBLICA } });
    expect(r.status, `${c.tabla}: ${await r.text()}`).not.toBe(300);
  }
});

test.describe('accesos', () => {
  test.skip(!!avisoSinCredenciales('gestion'), avisoSinCredenciales('gestion'));

  test('las consultas de Accesos no chocan con un embed ambiguo', async () => {
    const sesion = await sesionDelRobot('gestion');
    for (const c of consultasDeCargarTodo()) {
      const r = await consultar(sesion, `${c.tabla}?select=${encodeURIComponent(c.select)}&limit=1`);
      expect(r.status, `${c.tabla}: ${JSON.stringify(r.cuerpo).slice(0, 300)}`).toBe(200);
    }
  });

  test('la pantalla responde sin errores de JavaScript', async ({ page, context }, info) => {
    const errores = vigilarErrores(page);
    await entrarComo(context, 'gestion');
    await page.goto('/modulos/accesos.html');
    await expect(page.locator('body')).toContainText('No tenés permiso para acceder a este módulo.');
    await captura(page, 'accesos', info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
});
