// Ayudas de las pruebas en navegador: la sesión del robot, la limpieza de la
// fábrica de pruebas y las capturas de cada paso.
'use strict';
const fs = require('fs');
const path = require('path');

const URL_BASE = 'https://xtorxouhzuizdvawqakb.supabase.co';
const KEY_PUBLICA = 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw';
// La clave con la que supabase-js v2 guarda la sesión en localStorage.
const CLAVE_SESION = 'sb-xtorxouhzuizdvawqakb-auth-token';
const CAPTURAS = path.join(__dirname, 'resultados', 'capturas');

// ═══ POR QUÉ NO SE ENTRA POR EL FORMULARIO DE LOGIN ═══
// El login exige Cloudflare Turnstile y Supabase lo valida del lado del
// servidor (verificado el 25/09/2026: un password grant sin token responde
// `captcha_failed`). Un robot no puede ni debe resolver un CAPTCHA, así que la
// sesión se arma con la API de administración: un enlace mágico para el email
// del robot, canjeado en el acto. Eso necesita la clave de servicio
// (E2E_SERVICE_ROLE_KEY) y, como guarda, SOLO funciona si la cuenta es de un
// empleado marcado es_prueba: nunca abre la sesión de una persona real.
function faltantes(cuenta) {
  const v = cuenta === 'planta'
    ? ['E2E_PLANTA_EMAIL', 'E2E_SERVICE_ROLE_KEY']
    : ['E2E_GESTION_EMAIL', 'E2E_SERVICE_ROLE_KEY'];
  return v.filter(n => !process.env[n]);
}

function avisoSinCredenciales(cuenta) {
  const f = faltantes(cuenta);
  return f.length ? `Faltan las variables ${f.join(', ')}: se saltea (ver .claude/traspasos para cargarlas).` : '';
}

async function json(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return { texto: t }; }
}

async function sesionDelRobot(cuenta) {
  const email = process.env[cuenta === 'planta' ? 'E2E_PLANTA_EMAIL' : 'E2E_GESTION_EMAIL'];
  const service = process.env.E2E_SERVICE_ROLE_KEY;
  const adm = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

  const link = await fetch(`${URL_BASE}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: adm, body: JSON.stringify({ type: 'magiclink', email }),
  });
  const l = await json(link);
  const hashed = l.hashed_token ?? l.properties?.hashed_token;
  const userId = l.id ?? l.user?.id;
  if (!link.ok || !hashed || !userId) throw new Error(`No se pudo generar el enlace del robot (${link.status}): ${JSON.stringify(l).slice(0, 300)}`);

  // LA GUARDA: el email tiene que ser de un empleado es_prueba.
  const emp = await fetch(`${URL_BASE}/rest/v1/empleados?select=nombre,es_prueba&auth_user_id=eq.${userId}`, { headers: adm });
  const filas = await json(emp);
  if (!Array.isArray(filas) || filas.length !== 1 || filas[0].es_prueba !== true) {
    throw new Error(`La cuenta ${email} no es de la fábrica de pruebas (es_prueba): no se abre su sesión.`);
  }

  const ver = await fetch(`${URL_BASE}/auth/v1/verify`, {
    method: 'POST', headers: { apikey: KEY_PUBLICA, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashed }),
  });
  const s = await json(ver);
  if (!ver.ok || !s.access_token) throw new Error(`No se pudo canjear el enlace (${ver.status}): ${JSON.stringify(s).slice(0, 300)}`);
  if (!s.expires_at) s.expires_at = Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
  return s;
}

// Deja la sesión puesta ANTES de que cargue cualquier página del sitio.
async function entrarComo(context, cuenta) {
  const s = await sesionDelRobot(cuenta);
  await context.addInitScript(([clave, valor]) => {
    try { if (!localStorage.getItem(clave)) localStorage.setItem(clave, valor); } catch {}
  }, [CLAVE_SESION, JSON.stringify(s)]);
  return s;
}

// limpiar_fabrica_de_pruebas() con la sesión de la cuenta de gestión.
async function limpiarFabrica(sesion) {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/limpiar_fabrica_de_pruebas`, {
    method: 'POST',
    headers: { apikey: KEY_PUBLICA, Authorization: `Bearer ${sesion.access_token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const j = await json(r);
  if (!r.ok) throw new Error(`limpiar_fabrica_de_pruebas falló (${r.status}): ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

// Una consulta PostgREST con el token de la sesión (para Accesos).
async function consultar(sesion, ruta) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    headers: { apikey: KEY_PUBLICA, Authorization: `Bearer ${sesion.access_token}` },
  });
  return { status: r.status, cuerpo: await json(r) };
}

// Errores de JS de la página: se juntan y la prueba los revisa al final.
function vigilarErrores(page) {
  const errores = [];
  page.on('pageerror', e => {
    // Turnstile tira 110200 ("dominio no permitido") porque localhost no está en
    // la lista del sitio de Cloudflare. Es el widget de ellos, no código nuestro.
    if (/^\[Cloudflare Turnstile\]/.test(e.message)) return;
    errores.push(`pageerror: ${e.message}`);
  });
  page.on('response', r => { if (r.status() === 300) errores.push(`HTTP 300 (embed ambiguo): ${r.url()}`); });
  return errores;
}

let nro = 0;
async function captura(page, nombre, testInfo) {
  fs.mkdirSync(CAPTURAS, { recursive: true });
  nro++;
  const archivo = path.join(CAPTURAS, `${String(nro).padStart(2, '0')}-${nombre}.png`);
  await page.screenshot({ path: archivo, fullPage: false });
  if (testInfo) await testInfo.attach(nombre, { path: archivo, contentType: 'image/png' });
}

module.exports = {
  URL_BASE, KEY_PUBLICA, CLAVE_SESION,
  faltantes, avisoSinCredenciales, sesionDelRobot, entrarComo, limpiarFabrica, consultar, vigilarErrores, captura,
};
