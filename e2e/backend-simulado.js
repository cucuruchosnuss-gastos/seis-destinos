// UN SUPABASE SIMULADO EN LA RED (27/09/2026), para correr una pantalla REAL
// —con el supabase-js real, su manejo de la sesión y sus reintentos— sin
// credenciales ni base: Playwright intercepta cada pedido a
// https://xtorxouhzuizdvawqakb.supabase.co y lo contesta con datos fijos.
//
// A diferencia de la maqueta (que cambia js/supabase.js por un doble), acá el
// SDK es el de verdad: sirve para probar lo que pasa con la SESIÓN (un token
// vencido, un refresco que falla sin red, la página congelada y vuelta).
//
//   const b = await backendSimulado(page, { tablas, rpc })
//   b.sinRed(true)            → todo pedido a Supabase falla como sin conexión
//   b.pedidos                 → lo que pidió la página: [{ metodo, ruta }]
//   await sembrarSesion(page, { venceEn: 3600 })  → una sesión en localStorage
'use strict';

const URL_SUPABASE = 'https://xtorxouhzuizdvawqakb.supabase.co';
const CLAVE_SESION = 'sb-xtorxouhzuizdvawqakb-auth-token';
const USUARIO = { id: '00000000-0000-4000-8000-00000000ab1e', aud: 'authenticated', role: 'authenticated', email: 'tablet@prueba.local', app_metadata: { provider: 'email' }, user_metadata: {}, factors: [] };

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// Un JWT con la forma que espera supabase-js (no se verifica la firma en el
// navegador): sub, exp, aal y amr.
function jwt(expSeg) {
  const ahora = Math.floor(Date.now() / 1000);
  return [b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ sub: USUARIO.id, exp: expSeg, iat: ahora, aal: 'aal1', amr: [{ method: 'password', timestamp: ahora }], role: 'authenticated', session_id: 'ses-simulada' }),
    'c2ltdWxhZGE'].join('.');
}

function sesion(venceEn = 3600, sufijo = '1') {
  const exp = Math.floor(Date.now() / 1000) + venceEn;
  return { access_token: jwt(exp), token_type: 'bearer', expires_in: venceEn, expires_at: exp, refresh_token: 'refresh-' + sufijo, user: USUARIO };
}

// Guarda la sesión ANTES de que cargue la página (addInitScript).
async function sembrarSesion(page, { venceEn = 3600 } = {}) {
  const s = sesion(venceEn);
  await page.addInitScript(([clave, valor]) => {
    try { if (!localStorage.getItem(clave)) localStorage.setItem(clave, valor) } catch { /* nada */ }
  }, [CLAVE_SESION, JSON.stringify(s)]);
  return s;
}

// Filtros eq.* de PostgREST, lo mínimo para que las consultas de una pantalla
// devuelvan sus filas.
function filtrar(filas, params) {
  let r = Array.isArray(filas) ? filas : [];
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v);
    if (m) r = r.filter(f => String(f[k]) === decodeURIComponent(m[1]));
    const i = /^in\.\((.*)\)$/.exec(v);
    if (i) { const vals = i[1].split(',').map(x => x.replace(/^"|"$/g, '')); r = r.filter(f => vals.includes(String(f[k]))); }
  }
  return r;
}

async function backendSimulado(page, { tablas = {}, rpc = {} } = {}) {
  const estado = { sinRed: false, pedidos: [], refrescos: 0, refrescoFalla: false, sockets: 0 };
  // El tiempo real NUNCA va al servidor de verdad (30/09/2026): la sesión de
  // acá es de mentira (sub …ab1e) y Supabase la rechazaba con
  // "JwtSignatureError" en sus registros, cada vez que corría esta prueba.
  // El socket queda abierto y mudo: el canal no se suscribe y la planta sigue.
  await page.routeWebSocket(/\/realtime\/v1\//, () => { estado.sockets++; });
  await page.route(`${URL_SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    estado.pedidos.push({ metodo: req.method(), ruta: url.pathname + url.search });
    if (estado.sinRed) return route.abort('internetdisconnected');
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = (status, cuerpo) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });

    if (url.pathname === '/auth/v1/token') {
      estado.refrescos++;
      if (estado.refrescoFalla) return json(400, { code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' });
      return json(200, sesion(3600, String(estado.refrescos + 1)));
    }
    if (url.pathname === '/auth/v1/user') return json(200, USUARIO);
    if (url.pathname.startsWith('/auth/v1/')) return json(200, {});

    const mRpc = /^\/rest\/v1\/rpc\/([a-z_0-9]+)$/.exec(url.pathname);
    if (mRpc) {
      const r = rpc[mRpc[1]];
      const valor = typeof r === 'function' ? r(req.postDataJSON?.() ?? null) : (r === undefined ? null : r);
      return json(200, valor);
    }
    const mTabla = /^\/rest\/v1\/([a-z_0-9]+)$/.exec(url.pathname);
    if (mTabla) {
      if (req.method() !== 'GET') return json(201, []);
      const filas = filtrar(tablas[mTabla[1]] ?? [], url.searchParams);
      if (/pgrst\.object/.test(req.headers()['accept'] ?? '')) {
        if (!filas.length) return json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
        return json(200, filas[0]);
      }
      return json(200, filas);
    }
    return json(404, { message: 'no simulado' });
  });
  return {
    get pedidos() { return estado.pedidos; },
    get refrescos() { return estado.refrescos; },
    get sockets() { return estado.sockets; },
    sinRed(v) { estado.sinRed = !!v; },
    refrescoFalla(v) { estado.refrescoFalla = !!v; },
  };
}

// La planta de una tablet (Cucuruchos Nuss simulada): lo mínimo para llegar
// a "¿Quién sos?" con el personal, y al tablero.
const DATOS_PLANTA = {
  tablas: {
    empleados: [{ id: 'e-tablet', rol_app: 'usuario', auth_user_id: USUARIO.id, es_prueba: false, unidad_negocio_id: 'u-1' }],
    empleado_tareas: [
      { empleado_id: 'e-tablet', modulo: 'produccion', tarea: 'cargar', alcance: { unidades: ['u-1'] }, habilitado: true },
    ],
    unidades_negocio: [{ id: 'u-1', nombre: 'Cucuruchos Nuss', activo: true, es_prueba: false }],
    maquinas: [{ id: 'm-1', unidad_negocio_id: 'u-1', nombre: 'Máquina 1', activa: true, orden: 1 }],
    turnos_produccion: [],
  },
  rpc: {
    mi_sesion_produccion: { empleado_id: 'e-tablet', nombre: 'Tablet Producción · Cucuruchos Nuss', es_dispositivo: true, unidad_negocio_id: 'u-1' },
    personal_produccion: [
      { id: 'p-1', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado', 'operario'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
      { id: 'p-2', nombre: 'Juan Masero', misma_unidad: true, puestos: ['masero'], tiene_pin: true, pin_temporal: false, debe_cambiar_pin: false, es_maestro: false },
    ],
    mis_pendientes: [],
    registrar_error_app: null,
  },
};

module.exports = { backendSimulado, sembrarSesion, sesion, DATOS_PLANTA, CLAVE_SESION, URL_SUPABASE };
