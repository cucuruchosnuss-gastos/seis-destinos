// js/sin-internet.js (06/10/2026): la copia de los datos, la cola de cargas y
// la sesión sin red de la planta. Se EJECUTA el módulo real (importado de una
// copia .mjs) con un almacén en memoria y una red falsa.
//
// Lo que más se afirma:
//  - la cola manda EN ORDEN, UNA vez cada carga, y por planilla: un error de
//    la BASE frena solo las siguientes de ESA planilla; uno de RED las deja
//    esperando y no las marca;
//  - reenviar la misma clave no duplica (la base contesta reintento: true);
//  - una carga puede usar el resultado de otra (la parada que se anotó sin
//    red, y después "Volvió a las…");
//  - la cola sobrevive a "recargar" (otra cola sobre el mismo almacén);
//  - la copia contesta las LECTURAS sin red y NUNCA una escritura.
//
//   node pruebas/test-sin-internet.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'sin-internet.js');
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8');
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`);
const TMP = path.join(__dirname, '..', 'js', `.tmp-sin-internet-${process.pid}.mjs`);
fs.writeFileSync(TMP, FUENTE);
process.on('exit', () => { try { fs.unlinkSync(TMP) } catch { /* nada */ } });

let ok = 0; const fallas = [];
const chk = (n, c, d) => { if (c) ok++; else fallas.push(n + (d !== undefined ? ' — ' + String(d).slice(0, 300) : '')); };

const RED = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };
const BASE_NO = (m) => ({ message: m, code: 'P0001' });

// Una base falsa con ejecutar_tablet: guarda cada clave y la segunda vez
// contesta lo mismo con reintento: true (como operaciones_tablet).
function baseFalsa() {
  const vistas = new Map();
  const cargas = [];
  let sinRed = false;
  let rechazos = new Map();
  let perderRespuesta = new Set();
  return {
    cargas, vistas,
    sinRed(v) { sinRed = !!v },
    rechazar(op, msg) { rechazos.set(op, msg) },
    noRechazar(op) { rechazos.delete(op) },
    perderRespuestaDe(id) { perderRespuesta.add(id) },
    async enviar(item, params) {
      if (sinRed) return { data: null, error: RED };
      if (vistas.has(item.id)) return { data: { ...vistas.get(item.id), reintento: true }, error: null };
      if (rechazos.has(item.operacion)) return { data: null, error: BASE_NO(rechazos.get(item.operacion)) };
      const n = cargas.length + 1;
      const res = item.operacion === 'registrar_parada' ? { parada_id: 'par-' + n } : { sublote: '7023-' + n, produccion_item_id: 'pi-' + n };
      cargas.push({ id: item.id, operacion: item.operacion, params });
      vistas.set(item.id, res);
      // La base guardó, pero la respuesta se perdió en el camino.
      if (perderRespuesta.has(item.id)) { perderRespuesta.delete(item.id); return { data: null, error: RED } }
      return { data: { ...res, reintento: false }, error: null };
    },
  };
}

(async () => {
  const M = await import(pathToFileURL(TMP).href);

  // ── ¿Es un error de red? ─────────────────────────────────────────────────
  chk('un fetch que falló es de red', M.esErrorDeRedCarga(RED, { onLine: true }) === true);
  chk('un raise de la base NO es de red', M.esErrorDeRedCarga(BASE_NO('La máquina ya tiene un turno abierto.'), { onLine: true }) === false);
  chk('"No se pudo identificar tu usuario" es pasajero (salió sin sesión)', M.esErrorDeRedCarga(BASE_NO('No se pudo identificar tu usuario.'), { onLine: true }) === true);
  chk('el token vencido es pasajero', M.esErrorDeRedCarga({ code: 'PGRST301', message: 'JWT expired' }, { onLine: true }) === true);
  chk('sin navegador en línea, cualquier error sin código es de red', M.esErrorDeRedCarga({ message: 'algo', code: '' }, { onLine: false }) === true);
  chk('un 503 es de red', M.esErrorDeRedCarga({ message: 'x', status: 503 }, { onLine: true }) === true);
  chk('un raise que habla de "conexión" sigue siendo de la base (manda el código)', M.esErrorDeRedCarga(BASE_NO('Revisá la conexión del sensor de la máquina.'), { onLine: true }) === false);
  chk('un CHECK es de la base',M.esErrorDeRedCarga({ message: 'violates check constraint', code: '23514' }, { onLine: true }) === false);

  // ── Qué se copia ─────────────────────────────────────────────────────────
  const B = 'https://x.supabase.co';
  chk('una consulta GET se copia', M.esLecturaCopiable('GET', B + '/rest/v1/turnos_produccion?select=id', B));
  chk('una RPC de lectura se copia', M.esLecturaCopiable('POST', B + '/rest/v1/rpc/personal_produccion', B));
  chk('ejecutar_tablet NUNCA se copia', !M.esLecturaCopiable('POST', B + '/rest/v1/rpc/ejecutar_tablet', B));
  chk('registrar_masa NUNCA se copia', !M.esLecturaCopiable('POST', B + '/rest/v1/rpc/registrar_masa', B));
  chk('un POST a una tabla no se copia', !M.esLecturaCopiable('POST', B + '/rest/v1/turnos_produccion', B));
  chk('auth no se copia', !M.esLecturaCopiable('GET', B + '/auth/v1/user', B));
  chk('otro servidor no se copia', !M.esLecturaCopiable('GET', 'https://otro.co/rest/v1/x', B));

  // ── La copia de los datos ────────────────────────────────────────────────
  {
    const alm = M.almacenMemoria();
    let reloj = 1000000;
    const usadas = [];
    let redOk = true;
    const pedidos = [];
    const fetchBase = async (url, init) => {
      pedidos.push([init?.method ?? 'GET', url]);
      if (!redOk) throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify([{ id: 't1', lote: 7023 }]), { status: 200, headers: { 'content-type': 'application/json', 'content-range': '0-0/1' } });
    };
    const nav = { onLine: true };
    const f = M.crearFetchConCopia({ fetchBase, almacen: alm, base: B, ahora: () => reloj, nav, alUsarCopia: (g) => usadas.push(g) });
    const url = B + '/rest/v1/turnos_produccion?select=id,lote&estado=eq.abierto';
    const r1 = await f(url, { method: 'GET' });
    chk('con red, contesta la red', r1.status === 200 && usadas.length === 0);
    redOk = false; reloj += 60000;
    const r2 = await f(url, { method: 'GET' });
    chk('sin red, contesta la copia', r2.status === 200 && JSON.stringify(await r2.json()) === JSON.stringify([{ id: 't1', lote: 7023 }]));
    chk('… con su content-range', r2.headers.get('content-range') === '0-0/1');
    chk('… y avisa la hora de la copia (la de cuando se guardó)', usadas[0] === 1000000, usadas);
    nav.onLine = false;
    const antes = pedidos.length;
    await f(url, { method: 'GET' });
    chk('con el navegador sin red, ni siquiera intenta la red', pedidos.length === antes);
    let tiro = false;
    try { await f(B + '/rest/v1/otra_tabla', { method: 'GET' }) } catch { tiro = true }
    chk('una lectura sin copia, sin red, falla como siempre', tiro);
    // Una escritura nunca sale de la copia.
    let tiroEsc = false;
    try { await f(B + '/rest/v1/rpc/ejecutar_tablet', { method: 'POST', body: '{}' }) } catch { tiroEsc = true }
    chk('una escritura sin red falla (nunca se contesta con una copia)', tiroEsc);
    const rpcBody = JSON.stringify({ p_unidad_negocio_id: 'u1' });
    nav.onLine = true; redOk = true;
    await f(B + '/rest/v1/rpc/personal_produccion', { method: 'POST', body: rpcBody });
    redOk = false;
    const r3 = await f(B + '/rest/v1/rpc/personal_produccion', { method: 'POST', body: rpcBody });
    chk('una RPC de lectura se contesta con su copia (por su cuerpo)', r3.status === 200);
    let tiroOtroCuerpo = false;
    try { await f(B + '/rest/v1/rpc/personal_produccion', { method: 'POST', body: JSON.stringify({ p_unidad_negocio_id: 'u2' }) }) } catch { tiroOtroCuerpo = true }
    chk('… pero NO la de otros parámetros', tiroOtroCuerpo);
    reloj += 4 * 24 * 3600 * 1000;
    let tiroVieja = false;
    try { await f(url, { method: 'GET' }) } catch { tiroVieja = true }
    chk('una copia de más de 3 días no se usa', tiroVieja);
    chk('purgarCopias borra las viejas', (await M.purgarCopias(alm, reloj)) >= 1 && (await alm.todos('copias')).length === 0);
    // La base caída (500) también cae a la copia.
    redOk = true; reloj = 2000000;
    await f(url, { method: 'GET' });
    const f500 = M.crearFetchConCopia({ fetchBase: async () => new Response('caída', { status: 503 }), almacen: alm, base: B, ahora: () => reloj, nav: { onLine: true } });
    chk('con la base caída (5xx), contesta la copia', (await f500(url, { method: 'GET' })).status === 200);
    // Una lectura colgada: a los N segundos, la copia.
    const fColgada = M.crearFetchConCopia({ fetchBase: () => new Promise(() => {}), almacen: alm, base: B, ahora: () => reloj, nav: { onLine: true }, esperaLectura: 30 });
    const colgada = await Promise.race([fColgada(url, { method: 'GET' }), new Promise(r => setTimeout(() => r('colgada'), 1500))]);
    chk('una red colgada no deja esperando: contesta la copia', colgada !== 'colgada' && colgada.status === 200);
  }

  // ── La cola: en orden, una vez, y que sobrevive a recargar ───────────────
  {
    const alm = M.almacenMemoria();
    const base = baseFalsa();
    let reloj = 1000;
    const cola = M.crearCola({ almacen: alm, enviar: base.enviar, ahora: () => ++reloj });
    base.sinRed(true);
    await cola.agregar({ id: 'c1', operacion: 'registrar_produccion_item', params: { p_turno_id: 't1', p_cajas: 3 }, grupo: 't1' });
    await cola.agregar({ id: 'c2', operacion: 'registrar_parada', params: { p_turno_id: 't1', p_inicio: '2026-10-06T12:00:00Z', p_fin: null }, grupo: 't1' });
    await cola.agregar({ id: 'c3', operacion: 'registrar_hora_largada', params: { p_turno_id: 't1', p_hora: '06:40' }, grupo: 't1' });
    const r0 = await cola.procesar();
    chk('sin red no se manda nada y se dice', r0.sinRed === true && r0.enviados === 0 && base.cargas.length === 0);
    chk('… las tres quedan esperando (no con error)', (await cola.todos()).every(x => x.estado === 'pendiente'));
    chk('… y el resumen las cuenta', (await cola.resumen()).esperando === 3);
    chk('la misma clave no se agrega dos veces', (await cola.agregar({ id: 'c1', operacion: 'registrar_produccion_item', params: {}, grupo: 't1' })).params.p_cajas === 3 && (await cola.todos()).length === 3);
    // "Recargar la tablet": otra cola sobre el mismo almacén.
    const cola2 = M.crearCola({ almacen: alm, enviar: base.enviar, ahora: () => ++reloj });
    chk('la cola sobrevive a recargar', (await cola2.todos()).map(x => x.id).join() === 'c1,c2,c3');
    base.sinRed(false);
    const r1 = await cola2.procesar();
    chk('al volver la red se mandan solas', r1.enviados === 3);
    chk('… EN ORDEN', base.cargas.map(c => c.id).join() === 'c1,c2,c3', base.cargas.map(c => c.id).join());
    chk('… una vez cada una', base.cargas.length === 3);
    chk('… con los parámetros de cuando se tocó (la hora no se recalcula)', base.cargas[1].params.p_inicio === '2026-10-06T12:00:00Z' && base.cargas[2].params.p_hora === '06:40');
    chk('… y queda el resultado (el sublote)', (await cola2.todos()).find(x => x.id === 'c1').resultado.sublote === '7023-1');
    await cola2.procesar();
    chk('otra vuelta no vuelve a mandar lo enviado', base.cargas.length === 3);
    // Reenviar la misma clave a la base: reintento y no duplica.
    const re = await base.enviar({ id: 'c1', operacion: 'registrar_produccion_item' }, {});
    chk('reenviar una clave da reintento: true y no carga dos veces', re.data.reintento === true && base.cargas.length === 3);
  }

  // ── Sin red, una vuelta no golpea la puerta de cada planilla ─────────────
  {
    let intentos = 0;
    const cola = M.crearCola({ almacen: M.almacenMemoria(), enviar: async () => { intentos++; return { data: null, error: RED } } });
    await cola.agregar({ id: 'g1', operacion: 'registrar_produccion_item', params: {}, grupo: 'A' });
    await cola.agregar({ id: 'g2', operacion: 'registrar_produccion_item', params: {}, grupo: 'B' });
    await cola.procesar();
    chk('sin red, la vuelta corta en el primer intento (no prueba cada planilla)', intentos === 1, intentos);
  }

  // ── La respuesta perdida: se reintenta con la MISMA clave y no duplica ───
  {
    const alm = M.almacenMemoria();
    const base = baseFalsa();
    const cola = M.crearCola({ almacen: alm, enviar: base.enviar });
    base.perderRespuestaDe('p1');
    await cola.agregar({ id: 'p1', operacion: 'registrar_produccion_item', params: { p_cajas: 5 }, grupo: 't1' });
    const r = await cola.procesar();
    chk('si la respuesta se pierde, la carga queda esperando', r.sinRed === true && (await cola.todos())[0].estado === 'pendiente');
    await cola.procesar();
    chk('… y al reintentar, la base no la carga dos veces', base.cargas.length === 1 && (await cola.todos())[0].estado === 'enviado');
    chk('… y el resultado dice reintento', (await cola.todos())[0].resultado.reintento === true);
    chk('… y la clave viajó dos veces la misma', (await cola.todos())[0].intentos === 2);
  }

  // ── Un error de la BASE frena solo ESA planilla ──────────────────────────
  {
    const alm = M.almacenMemoria();
    const base = baseFalsa();
    const cola = M.crearCola({ almacen: alm, enviar: base.enviar });
    await cola.agregar({ id: 'a1', operacion: 'registrar_produccion_item', params: {}, grupo: 'A' });
    await cola.agregar({ id: 'a2', operacion: 'cerrar_turno', params: {}, grupo: 'A' });
    await cola.agregar({ id: 'a3', operacion: 'registrar_produccion_item', params: {}, grupo: 'A' });
    await cola.agregar({ id: 'b1', operacion: 'registrar_produccion_item', params: {}, grupo: 'B' });
    base.rechazar('cerrar_turno', 'Falta el scrap.');
    const r = await cola.procesar();
    const lista = await cola.todos();
    const est = id => lista.find(x => x.id === id).estado;
    chk('la de antes sale', est('a1') === 'enviado');
    chk('la rechazada queda "con error para revisar", con el mensaje de la base', est('a2') === 'error' && lista.find(x => x.id === 'a2').error.message === 'Falta el scrap.');
    chk('las siguientes de ESA planilla esperan', est('a3') === 'pendiente');
    chk('otra planilla sigue', est('b1') === 'enviado');
    chk('… y se cuenta un error', r.errores === 1 && (await cola.resumen()).errores === 1);
    base.noRechazar('cerrar_turno');
    await cola.procesar();
    chk('el error NO se reintenta solo', est('a2') === 'error' && (await cola.todos()).find(x => x.id === 'a2').estado === 'error');
    await cola.reintentar('a2');
    const l2 = await cola.todos();
    chk('"Reintentar" la manda, y destraba las siguientes', l2.find(x => x.id === 'a2').estado === 'enviado' && l2.find(x => x.id === 'a3').estado === 'enviado');
    await cola.agregar({ id: 'a4', operacion: 'cerrar_turno', params: {}, grupo: 'A' });
    base.rechazar('cerrar_turno', 'otra vez no');
    await cola.procesar();
    await cola.descartar('a4');
    chk('"Descartar" la saca de la cola', !(await cola.todos()).some(x => x.id === 'a4'));
  }

  // ── Una carga que usa el resultado de otra ($ref) ────────────────────────
  {
    const alm = M.almacenMemoria();
    const base = baseFalsa();
    const cola = M.crearCola({ almacen: alm, enviar: base.enviar });
    base.sinRed(true);
    await cola.agregar({ id: 'r1', operacion: 'registrar_parada', params: { p_turno_id: 't1', p_fin: null }, grupo: 't1' });
    await cola.agregar({ id: 'r2', operacion: 'editar_parada', params: { p_parada_id: { $ref: 'r1', campo: 'parada_id' }, p_fin: '2026-10-06T13:00:00Z' }, grupo: 't1' });
    await cola.procesar();
    base.sinRed(false);
    await cola.procesar();
    chk('la vuelta de una parada anotada sin red lleva el id que le dio la base', base.cargas[1]?.params.p_parada_id === 'par-1', JSON.stringify(base.cargas[1]));
    const ref = M.resolverReferencias({ x: { $ref: 'nada', campo: 'id' } }, new Map());
    chk('una referencia a algo que no salió espera', ref.espera === 'nada');
    // Una que depende de una con error, queda con error (no se manda a ciegas).
    const c2 = M.crearCola({ almacen: M.almacenMemoria(), enviar: base.enviar });
    base.rechazar('registrar_parada', 'Ya hay una parada abierta.');
    await c2.agregar({ id: 'q1', operacion: 'registrar_parada', params: {}, grupo: 'X' });
    await c2.agregar({ id: 'q2', operacion: 'editar_parada', params: { p_parada_id: { $ref: 'q1', campo: 'parada_id' } }, grupo: 'Y' });
    await c2.procesar();
    chk('la que depende de una rechazada no se manda', (await c2.todos()).find(x => x.id === 'q2').estado === 'error');
    base.noRechazar('registrar_parada');
  }

  // ── enviarYEsperar: lo que ve la persona ─────────────────────────────────
  {
    const base = baseFalsa();
    const cola = M.crearCola({ almacen: M.almacenMemoria(), enviar: base.enviar });
    const ok1 = await cola.enviarYEsperar({ id: 'e1', operacion: 'registrar_produccion_item', params: {}, grupo: 't1' });
    chk('con red: ok con la respuesta de la base', ok1.resultado === 'ok' && ok1.data.sublote === '7023-1');
    base.rechazar('registrar_produccion_item', 'Esa caja no está habilitada.');
    const no = await cola.enviarYEsperar({ id: 'e2', operacion: 'registrar_produccion_item', params: {}, grupo: 't1' });
    chk('rechazada en el momento: "rechazo" con el mensaje', no.resultado === 'rechazo' && no.error.message === 'Esa caja no está habilitada.');
    chk('… y sale de la cola (la persona la corrige ahí)', !(await cola.todos()).some(x => x.id === 'e2'));
    base.noRechazar('registrar_produccion_item');
    base.sinRed(true);
    const red = await cola.enviarYEsperar({ id: 'e3', operacion: 'registrar_produccion_item', params: {}, grupo: 't1' });
    chk('sin red: "red" y queda en la cola', red.resultado === 'red' && (await cola.todos()).some(x => x.id === 'e3' && x.estado === 'pendiente'));
    chk('… la cola sabe que está sin red', cola.sinRed === true);
    // Detrás de un error de su planilla: "bloqueada".
    base.sinRed(false);
    base.rechazar('cerrar_turno', 'Falta el scrap.');
    await cola.agregar({ id: 'e4', operacion: 'cerrar_turno', params: {}, grupo: 't9' });
    await cola.procesar();
    base.noRechazar('cerrar_turno');
    const bl = await cola.enviarYEsperar({ id: 'e5', operacion: 'registrar_produccion_item', params: {}, grupo: 't9' });
    chk('detrás de una carga con error de su planilla: "bloqueada"', bl.resultado === 'bloqueada');
    chk('… y la que estaba sin red ya salió', (await cola.todos()).find(x => x.id === 'e3').estado === 'enviado');
  }

  // ── Una que quedó "enviando" (se apagó la tablet a la mitad) se manda ────
  {
    const alm = M.almacenMemoria();
    await alm.guardar('cola', { id: 'z1', operacion: 'registrar_produccion_item', params: {}, grupo: 't1', orden: 1, estado: 'enviando', intentos: 1 });
    const base = baseFalsa();
    const cola = M.crearCola({ almacen: alm, enviar: base.enviar });
    await cola.procesar();
    chk('una carga cortada a la mitad se vuelve a mandar (con su clave)', base.cargas.length === 1 && base.cargas[0].id === 'z1');
  }

  // ── Lo enviado se borra al día ───────────────────────────────────────────
  {
    let reloj = 1;
    const base = baseFalsa();
    const cola = M.crearCola({ almacen: M.almacenMemoria(), enviar: base.enviar, ahora: () => reloj });
    await cola.agregar({ id: 'v1', operacion: 'registrar_produccion_item', params: {}, grupo: 't1' });
    await cola.procesar();
    chk('lo enviado se guarda un rato (muestra su sublote)', (await cola.todos()).length === 1);
    reloj += 25 * 3600 * 1000;
    await cola.procesar();
    chk('… y se borra pasado un día', (await cola.todos()).length === 0);
  }

  // ── El cartel ────────────────────────────────────────────────────────────
  const T = (o) => M.textoCartelCola(o);
  chk('sin internet con cargas', T({ enLinea: false, esperando: 3 })?.texto === 'Sin internet · 3 cargas esperando · se mandan solas', T({ enLinea: false, esperando: 3 })?.texto);
  chk('… en singular', T({ enLinea: false, esperando: 1 })?.texto === 'Sin internet · 1 carga esperando · se mandan solas');
  const conCopia = T({ enLinea: false, esperando: 2, copiaDesde: Date.parse('2026-10-06T11:40:00Z') })?.texto;
  chk('… con la hora de los datos ("Datos de las HH:MM", hora argentina)', conCopia === 'Sin internet · 2 cargas esperando · se mandan solas · Datos de las 08:40', conCopia);
  chk('sin internet y sin cargas, igual se dice', T({ enLinea: false })?.texto === 'Sin internet');
  chk('con red y esperando: "Enviando…"', T({ enLinea: true, esperando: 2 })?.texto === 'Enviando…');
  chk('recién enviado todo: "Todo enviado ✓"', T({ enLinea: true, recienEnviado: true })?.texto === 'Todo enviado ✓' && T({ enLinea: true, recienEnviado: true }).tono === 'ok');
  chk('con errores, lo dice primero', /^1 carga con error para revisar/.test(T({ enLinea: true, errores: 1, esperando: 2 })?.texto ?? '') && T({ enLinea: true, errores: 1 }).tono === 'error');
  chk('con todo bien, no hay cartel', T({ enLinea: true }) === null);

  // ── La sesión guardada ───────────────────────────────────────────────────
  const ls = (v) => ({ getItem: () => v });
  chk('la sesión guardada se lee', M.sesionGuardada('k', ls(JSON.stringify({ user: { id: 'u' }, refresh_token: 'r', access_token: 'a' })))?.user?.id === 'u');
  chk('sin refresh token, no hay sesión', M.sesionGuardada('k', ls(JSON.stringify({ user: { id: 'u' } }))) === null);
  chk('basura, no hay sesión', M.sesionGuardada('k', ls('{no')) === null && M.sesionGuardada('k', ls(null)) === null);

  // ── Sin IndexedDB, en memoria (la planta no se traba) ────────────────────
  const alm = await M.abrirAlmacenIdb('x', undefined);
  chk('sin IndexedDB, el almacén es en memoria', alm.tipo === 'memoria');

  for (const f of fallas) console.log('  ✗ ' + f);
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`);
  process.exit(fallas.length ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1) });
