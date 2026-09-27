// js/salud.js (27/09/2026): el registro de errores, la sesión al volver de
// estar bloqueada y el aviso de "Sin conexión", compartidos por TODAS las
// pantallas. Se EJECUTA el módulo real (importado de una copia .mjs, una por
// caso, así cada caso arranca de cero) con un navegador falso.
//
// Lo que se afirma, sobre todo: NUNCA se manda un dato sensible (los
// parámetros de una RPC —PINes, importes—, un número largo, el # de la URL),
// el registro no rompe nada si falla, y un corte de red nunca manda al login.
//
//   node pruebas/test-salud.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'salud.js');
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8');
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`);
const TMP = path.join(__dirname, '..', 'js', `.tmp-salud-${process.pid}.mjs`);
fs.writeFileSync(TMP, FUENTE);
process.on('exit', () => { try { fs.unlinkSync(TMP) } catch { /* nada */ } });

let ok = 0; const fallas = [];
const chk = (n, c, d) => { if (c) ok++; else fallas.push(n + (d !== undefined ? ' — ' + String(d).slice(0, 300) : '')); };
const tick = () => new Promise(r => setImmediate(r));
const esperar = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

// ── Un navegador falso ──────────────────────────────────────────────────────
function navegador({ meta = null, href = 'https://x.github.io/seis-destinos/modulos/produccion.html?cheque=abc#access_token=SECRETO' } = {}) {
  const ls = new Map();
  const oyentes = new Map();
  const eventos = [];
  const els = new Map();
  const u = new URL(href);
  const loc = { href: u.href, origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash, reemplazos: [], replace(x) { this.reemplazos.push(x) } };
  const doc = {
    body: { appendChild(el) { els.set(el.id, el) } },
    visibilityState: 'visible',
    getElementById: (id) => els.get(id) ?? null,
    createElement: () => ({ id: '', className: '', hidden: false, textContent: '', setAttribute() {} }),
    querySelector: (sel) => (sel === 'meta[name="sd-login"]' && meta ? { getAttribute: () => meta } : null),
    addEventListener: (ev, f) => { oyentes.set('doc:' + ev, [...(oyentes.get('doc:' + ev) ?? []), f]) },
  };
  const win = {
    addEventListener: (ev, f) => { oyentes.set(ev, [...(oyentes.get(ev) ?? []), f]) },
    document: doc,
  };
  Object.assign(globalThis, {
    location: loc, document: doc,
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    innerWidth: 800, innerHeight: 1280,
    screen: { orientation: { type: 'portrait-primary' } },
    matchMedia: () => ({ matches: true }),
    dispatchEvent: (ev) => { eventos.push(ev.type) },
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail } },
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X135) Chrome/140' } });
  const disparar = (ev, arg) => (oyentes.get(ev) ?? []).forEach(f => f(arg));
  return { ls, loc, doc, win, eventos, els, disparar };
}

// Un supabase falso: rpc devuelve un "builder" thenable, y auth responde lo
// que diga cada caso.
function supabaseFalso({ rpcRespuesta = () => ({ data: null, error: null }), sesion = { expires_at: Date.now() / 1000 + 3600 }, getSessionError = null, refresh = () => ({ data: {}, error: null }) } = {}) {
  const llamadas = { rpc: [], refresh: 0, signOut: 0 };
  const sb = {
    rpc(fn, args) {
      llamadas.rpc.push([fn, args]);
      const r = rpcRespuesta(fn, args);
      return { then: (a, b) => Promise.resolve(r).then(a, b) };
    },
    auth: {
      onAuthStateChange(cb) { sb.__cb = cb },
      async getSession() {
        if (typeof getSessionError === 'function') { const e = getSessionError(); if (e) return { data: { session: null }, error: e } }
        return { data: { session: typeof sesion === 'function' ? sesion() : sesion }, error: null };
      },
      async refreshSession() { llamadas.refresh++; return refresh() },
      async signOut() { llamadas.signOut++; return {} },
    },
  };
  return { sb, llamadas };
}

let n = 0;
async function modulo() { return import(pathToFileURL(TMP).href + '?caso=' + (++n)); }
const registros = (ll) => ll.rpc.filter(([fn]) => fn === 'registrar_error_app').map(([, a]) => a);

async function pruebas() {
  // ── Qué se manda ──
  {
    navegador();
    const S = await modulo();
    chk('limpiarTexto tapa un PIN', !/4821/.test(S.limpiarTexto('PIN 4821 rechazado')));
    chk('limpiarTexto tapa un importe', !/437\.300/.test(S.limpiarTexto('No alcanza: $ 437.300,50')) && !/437/.test(S.limpiarTexto('total 437300.50')));
    chk('limpiarTexto tapa un CUIT', !/30719434777/.test(S.limpiarTexto('cuit 30719434777')));
    chk('limpiarTexto deja un uuid', S.limpiarTexto('id a1111111-1111-4111-8111-111111111111').includes('a1111111-1111-4111-8111-111111111111'));
    chk('limpiarTexto deja los números cortos (una línea de código)', S.limpiarTexto('línea 12 col 7') === 'línea 12 col 7');
    chk('limpiarTexto deja un número de 3 cifras con decimales (una versión)', S.limpiarTexto('versión 12.5') === 'versión 12.5');
    chk('limpiarTexto tapa "contraseña: …" y "token=…"', !/abc123/.test(S.limpiarTexto('contraseña: abc123')) && !/eyJ/.test(S.limpiarTexto('token=eyJhbGci')));
    chk('limpiarTexto corta en 4000', S.limpiarTexto('x'.repeat(5000)).length === 4000);
    chk('la URL va sin ? ni # (el # trae un token)', S.urlSegura() === 'https://x.github.io/seis-destinos/modulos/produccion.html');
    chk('la pantalla es el nombre del archivo', S.pantallaActual() === 'produccion');
    chk('el dispositivo: userAgent, app instalada, tamaño y orientación', /SM-X135/.test(S.dispositivo()) && /app instalada/.test(S.dispositivo()) && /800x1280/.test(S.dispositivo()) && /portrait/.test(S.dispositivo()));
    const p = S.parametrosError({ evento: 'rpc', mensaje: 'x', detalle: 'y' });
    chk('los parámetros del registro son exactamente los seis de la RPC', JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_detalle', 'p_dispositivo', 'p_evento', 'p_mensaje', 'p_pantalla', 'p_url']));
  }
  // ── El envoltorio de las RPC ──
  {
    const N = navegador();
    const S = await modulo();
    const { sb, llamadas } = supabaseFalso({ rpcRespuesta: (fn) => fn === 'verificar_pin_produccion'
      ? { data: null, error: { code: '42501', message: 'permission denied for function', details: 'd' } }
      : fn === 'guardar_x' ? { data: null, error: { code: 'P0001', message: 'Poné el motivo.' } } : { data: 1, error: null } });
    S.instalarSalud(sb, N.win);
    const r = await sb.rpc('verificar_pin_produccion', { p_empleado_id: 'e1', p_pin: '4821' });
    await esperar();
    chk('la pantalla recibe el error igual (el envoltorio no lo come)', r.error?.code === '42501');
    const reg = registros(llamadas);
    chk('una RPC que falla se registra como "rpc"', reg.length === 1 && reg[0].p_evento === 'rpc' && /verificar_pin_produccion/.test(reg[0].p_mensaje), JSON.stringify(reg));
    chk('NUNCA con los parámetros de la RPC (el PIN)', !JSON.stringify(reg).includes('4821'));
    await sb.rpc('guardar_x', { p_importe: 1234 });
    await esperar();
    chk('un mensaje de negocio (P0001) no se registra', registros(llamadas).length === 1);
    await sb.rpc('verificar_pin_produccion', { p_pin: '4821' });
    await esperar();
    chk('el mismo error en un minuto no se repite', registros(llamadas).length === 1);
    await sb.rpc('otra', {});
    chk('una RPC que anda no registra nada', registros(llamadas).length === 1);
    // window.onerror y las promesas rechazadas
    N.disparar('error', { message: 'x is not defined PIN 9999', filename: 'https://x/modulos/produccion.html?a=1', lineno: 10, colno: 2, error: { stack: 'at f' } });
    N.disparar('unhandledrejection', { reason: { message: 'se rechazó', stack: 's' } });
    await esperar();
    const todos = registros(llamadas);
    chk('window.onerror → "error"', todos.some(a => a.p_evento === 'error' && /x is not defined/.test(a.p_mensaje)));
    chk('el error sin el PIN y el archivo sin su ?', !JSON.stringify(todos).includes('9999') && !JSON.stringify(todos).includes('?a=1'));
    chk('una promesa rechazada → "promesa"', todos.some(a => a.p_evento === 'promesa' && a.p_mensaje === 'se rechazó'));
  }
  // ── Si falla el registro: no rompe, y queda en la cola ──
  {
    const N = navegador();
    const S = await modulo();
    let conRed = false;
    const { sb, llamadas } = supabaseFalso({ rpcRespuesta: (fn) => fn === 'registrar_error_app' && !conRed ? Promise.reject(new TypeError('Failed to fetch')) : { data: null, error: null } });
    S.instalarSalud(sb, N.win);
    let tiro = false;
    try { await S.registrarError({ evento: 'error', mensaje: 'algo' }) } catch { tiro = true }
    chk('si el registro falla, no tira', !tiro);
    // Ni aunque armar los datos del error tire (un navegador raro).
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, get() { throw new Error('navegador raro') } });
    let tiro2 = false;
    try { await S.registrarError({ evento: 'error', mensaje: 'otra cosa' }) } catch { tiro2 = true }
    Object.defineProperty(globalThis, 'navigator', nav);
    chk('ni aunque armar el registro tire', !tiro2);
    chk('y queda en la cola del navegador', JSON.parse(N.ls.get('sd_errores_pendientes') ?? '[]').length === 1);
    for (let i = 0; i < 30; i++) await S.registrarError({ evento: 'error', mensaje: 'algo ' + i });
    chk('la cola no pasa de 20', JSON.parse(N.ls.get('sd_errores_pendientes')).length === 20);
    conRed = true;
    const antes = registros(llamadas).length;
    await S.vaciarCola();
    chk('con red, la cola se manda y se vacía', registros(llamadas).length - antes === 20 && !N.ls.has('sd_errores_pendientes'));
  }
  // ── Qué clase de error es ──
  {
    navegador();
    const S = await modulo();
    chk('sin red: "Failed to fetch"', S.esErrorDeRed(new TypeError('Failed to fetch')));
    chk('sin red: AuthRetryableFetchError', S.esErrorDeRed({ name: 'AuthRetryableFetchError', message: 'x' }));
    chk('sin red: el tiempo agotado', S.esErrorDeRed({ name: 'TiempoAgotado', message: 'tiempo agotado' }));
    chk('un permiso no es de red', !S.esErrorDeRed({ code: '42501', message: 'permission denied' }));
    chk('sesión inválida: refresh_token_not_found', S.esSesionInvalida({ code: 'refresh_token_not_found', message: 'Invalid Refresh Token' }));
    chk('sesión inválida: session_not_found', S.esSesionInvalida({ code: 'session_not_found', message: 'x' }));
    chk('un corte de red NUNCA es sesión inválida', !S.esSesionInvalida({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }));
    chk('…ni aunque traiga un código de sesión (es de red: se reintenta)', !S.esSesionInvalida({ name: 'AuthRetryableFetchError', code: 'refresh_token_not_found', message: 'x' }));
    chk('"No se pudo identificar tu usuario"', S.esUsuarioNoIdentificado({ message: 'No se pudo identificar tu usuario.' }));
  }
  // ── Al volver ──
  {
    const N = navegador();
    const S = await modulo();
    const { sb, llamadas } = supabaseFalso();
    S.instalarSalud(sb, N.win);
    const r = await S.revisarAlVolver('visible');
    chk('con sesión buena: "ok" y avisa app:reanudada', r === 'ok' && N.eventos.includes('app:reanudada'));
    chk('sin renovar si no vence pronto', llamadas.refresh === 0);
  }
  {
    const N = navegador();
    const S = await modulo();
    const { sb, llamadas } = supabaseFalso({ sesion: { expires_at: Date.now() / 1000 + 10 } });
    S.instalarSalud(sb, N.win);
    const r = await S.revisarAlVolver('visible');
    chk('el token por vencer se renueva', r === 'ok' && llamadas.refresh === 1);
  }
  {
    const N = navegador();
    const S = await modulo();
    const { sb, llamadas } = supabaseFalso({ sesion: { expires_at: Date.now() / 1000 - 100 }, refresh: () => ({ data: {}, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } }) });
    S.instalarSalud(sb, N.win);
    const demoras = [];
    const st = globalThis.setTimeout;
    globalThis.setTimeout = (f, ms) => { demoras.push(ms); return 0 };
    const r = await S.revisarAlVolver('visible');
    globalThis.setTimeout = st;
    chk('sin red se reintenta solo (a los 3 s el primero)', demoras.includes(3000), JSON.stringify(demoras));
    chk('sin red al volver: "sin_red", el aviso, y NO va al login', r === 'sin_red' && N.els.get('sd-aviso-conexion')?.hidden === false &&
      N.els.get('sd-aviso-conexion')?.textContent === 'Sin conexión, reintentando…' && N.loc.reemplazos.length === 0 && llamadas.signOut === 0);
    chk('no se dispara app:reanudada sin sesión revisada', !N.eventos.includes('app:reanudada'));
    await esperar();
    chk('queda registrado un "reanudar"', registros(llamadas).some(a => a.p_evento === 'reanudar'));
  }
  {
    const N = navegador({ meta: 'produccion.html' });
    const S = await modulo();
    const { sb, llamadas } = supabaseFalso({ sesion: { expires_at: Date.now() / 1000 - 100 }, refresh: () => ({ data: {}, error: { code: 'refresh_token_not_found', message: 'Invalid Refresh Token' } }) });
    S.instalarSalud(sb, N.win);
    const r = await S.revisarAlVolver('visible');
    chk('sesión cortada de verdad: "cortada"', r === 'cortada');
    chk('va al login de la pantalla (la planta: ella misma)', N.loc.reemplazos[0] === 'https://x.github.io/seis-destinos/modulos/produccion.html', N.loc.reemplazos[0]);
    chk('deja el aviso para el login, y cierra la sesión local', N.ls.get('sd_aviso_login') === 'Tu sesión fue cerrada. Volvé a iniciar sesión.' && llamadas.signOut === 1);
    chk('el login lo toma UNA vez', S.tomarAvisoLogin() === 'Tu sesión fue cerrada. Volvé a iniciar sesión.' && S.tomarAvisoLogin() === null);
  }
  {
    // La página TENÍA sesión y al volver ya no está: corte.
    const N = navegador();
    const S = await modulo();
    let hay = true;
    const { sb } = supabaseFalso({ sesion: () => (hay ? { expires_at: Date.now() / 1000 + 3600 } : null) });
    S.instalarSalud(sb, N.win);
    await S.revisarAlVolver('visible');
    hay = false;
    const r = await S.revisarAlVolver('visible');
    chk('tenía sesión y ya no: corte, al login.html de la raíz', r === 'cortada' && /\/login\.html$/.test(N.loc.reemplazos[0] ?? ''), N.loc.reemplazos[0]);
  }
  {
    // Una página que nunca tuvo sesión (el login) no corta nada.
    const N = navegador();
    const S = await modulo();
    const { sb } = supabaseFalso({ sesion: null });
    S.instalarSalud(sb, N.win);
    chk('sin sesión nunca: "sin_sesion", sin navegar', (await S.revisarAlVolver('visible')) === 'sin_sesion' && N.loc.reemplazos.length === 0);
  }
  {
    // Un meta de otro sitio no manda afuera.
    const N = navegador({ meta: 'https://malo.example/login' });
    const S = await modulo();
    chk('un sd-login de otro sitio cae al login.html propio', /\/login\.html$/.test(S.rutaLogin()) && !/malo/.test(S.rutaLogin()));
    void N;
  }
  {
    // "No se pudo identificar tu usuario" → se renueva; si Auth dice que no existe, corte.
    const N = navegador();
    const S = await modulo();
    const { sb, llamadas } = supabaseFalso({
      rpcRespuesta: (fn) => fn === 'algo' ? { data: null, error: { code: 'P0001', message: 'No se pudo identificar tu usuario.' } } : { data: null, error: null },
      refresh: () => ({ data: {}, error: { code: 'session_not_found', message: 'Session not found' } }),
    });
    S.instalarSalud(sb, N.win);
    await sb.rpc('algo', {});
    await esperar(15);
    chk('"No se pudo identificar tu usuario" con la sesión borrada: corte', llamadas.refresh === 1 && N.loc.reemplazos.length === 1);
  }
  {
    // …y si el refresco falla por red, NO es un corte.
    const N = navegador();
    const S = await modulo();
    const { sb } = supabaseFalso({
      rpcRespuesta: (fn) => fn === 'algo' ? { data: null, error: { code: 'P0001', message: 'No se pudo identificar tu usuario.' } } : { data: null, error: null },
      refresh: () => ({ data: {}, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } }),
    });
    S.instalarSalud(sb, N.win);
    await sb.rpc('algo', {});
    await esperar(15);
    chk('…sin red no corta nada', N.loc.reemplazos.length === 0);
  }
  {
    // Los eventos de volver están conectados.
    const N = navegador();
    const S = await modulo();
    const { sb } = supabaseFalso();
    S.instalarSalud(sb, N.win);
    chk('escucha visibilitychange, resume, pageshow y online', ['doc:visibilitychange', 'doc:resume'].every(e => N.disparar && true) &&
      /addEventListener\?\.\('visibilitychange'/.test(FUENTE) && /addEventListener\?\.\('resume'/.test(FUENTE) && /addEventListener\?\.\('pageshow'/.test(FUENTE) && /addEventListener\?\.\('online'/.test(FUENTE));
  }
}

pruebas().then(() => {
  for (const f of fallas) console.log('  ✗ ' + f);
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`);
  process.exit(fallas.length ? 1 : 0);
}).catch(e => { console.log('EXCEPCIÓN: ' + (e && e.stack || e)); console.log('ROJO'); process.exit(1) });
