// js/salud.js — EL TIEMPO REAL (30/09/2026). Que la conexión en vivo de la
// planta se corte y se reconecte es normal: no se registra como error. Se
// registra UNA vez por corte, y solo si pasaron 2 minutos sin reconectar.
// Se EJECUTA el módulo real (una copia .mjs por caso, así cada caso arranca de
// cero) con un reloj falso.
//
//   node pruebas/test-salud-tiempo-real.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'salud.js');
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8');
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`);
const PLANTA = fs.readFileSync(path.join(__dirname, '..', 'modulos', 'produccion.html'), 'utf8');

let ok = 0; const fallas = [];
const chk = (n, c, d) => { if (c) ok++; else fallas.push(n + (d !== undefined ? ' — ' + String(d).slice(0, 300) : '')); };

let n = 0;
async function modulo() {
  const tmp = path.join(__dirname, '..', 'js', `.tmp-salud-tr-${process.pid}-${++n}.mjs`);
  fs.writeFileSync(tmp, FUENTE);
  try { return await import(pathToFileURL(tmp).href) } finally { try { fs.unlinkSync(tmp) } catch { /* nada */ } }
}

// Un reloj falso: programar guarda la función y su espera; correr() la ejecuta.
function reloj() {
  const timers = new Map(); let id = 0;
  return {
    programar: (fn, ms) => { timers.set(++id, { fn, ms }); return id },
    cancelar: (t) => { timers.delete(t) },
    correr() { const v = [...timers.values()]; timers.clear(); for (const t of v) t.fn() },
    get pendientes() { return [...timers.values()] },
  };
}

(async () => {
  {
    const S = await modulo(); const r = reloj(); const reg = [];
    const registrar = (x) => reg.push(x);
    S.tiempoRealCaido('CLOSED', { programar: r.programar, registrar });
    chk('al cortarse NO se registra nada en el momento', reg.length === 0);
    chk('se programa UNA espera de 2 minutos', r.pendientes.length === 1 && r.pendientes[0].ms === 2 * 60 * 1000 && S.ESPERA_TIEMPO_REAL_MS === 120000);
    S.tiempoRealCaido('CHANNEL_ERROR', { programar: r.programar, registrar });
    chk('otro aviso del mismo corte no programa otra espera', r.pendientes.length === 1);
    S.tiempoRealConectado({ cancelar: r.cancelar });
    chk('si reconecta antes, la espera se cancela', r.pendientes.length === 0);
    r.correr();
    chk('y no se registra nada', reg.length === 0);
  }
  {
    const S = await modulo(); const r = reloj(); const reg = [];
    const registrar = (x) => reg.push(x);
    S.tiempoRealCaido('CLOSED', { programar: r.programar, registrar });
    S.tiempoRealCaido('CHANNEL_ERROR', { programar: r.programar, registrar });
    r.correr();
    chk('sin reconectar en 2 minutos, se registra UNA vez', reg.length === 1, JSON.stringify(reg));
    chk('con el último estado y el patrón de errores_conocidos ("Tiempo real: …")', reg[0]?.mensaje === 'Tiempo real: CHANNEL_ERROR (no se pudo reconectar en 2 minutos)' && reg[0]?.evento === 'planta', JSON.stringify(reg[0]));
    S.tiempoRealCaido('CLOSED', { programar: r.programar, registrar });
    r.correr();
    chk('seguir caído no vuelve a registrar', reg.length === 1 && r.pendientes.length === 0);
    S.tiempoRealConectado({ cancelar: r.cancelar });
    S.tiempoRealCaido('TIMED_OUT', { programar: r.programar, registrar });
    r.correr();
    chk('un corte NUEVO (después de reconectar) puede registrarse otra vez', reg.length === 2 && /TIMED_OUT/.test(reg[1].mensaje));
  }
  {
    // Una espera que igual corre (no se pudo cancelar) después de reconectar
    // no registra un corte que ya terminó.
    const S = await modulo(); const r = reloj(); const reg = [];
    S.tiempoRealCaido('CLOSED', { programar: r.programar, registrar: (x) => reg.push(x) });
    S.tiempoRealConectado({ cancelar: () => {} });
    r.correr();
    chk('una espera vieja no registra un corte ya terminado', reg.length === 0);
  }
  {
    const S = await modulo();
    let tiro = false;
    try { S.tiempoRealConectado({ cancelar: () => { throw new Error('x') } }) } catch { tiro = true }
    chk('reconectar sin corte no hace nada ni tira', !tiro);
  }
  // La planta usa esto y ya no registra cada corte.
  const cb = PLANTA.slice(PLANTA.indexOf('ch.subscribe(status => {'), PLANTA.indexOf('ch.subscribe(status => {') + 800);
  chk('la planta avisa el corte con tiempoRealCaido(status)', /tiempoRealCaido\(status\)/.test(cb));
  chk('y la vuelta con tiempoRealConectado() en SUBSCRIBED', /if \(status === 'SUBSCRIBED'\) tiempoRealConectado\(\)/.test(cb));
  chk('y ya no registra cada corte como error', !/registrarError\(/.test(cb));

  for (const f of fallas) console.log('  ✗ ' + f);
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`);
  process.exit(fallas.length ? 1 : 0);
})().catch(e => { console.log('  ✗ excepción: ' + e.stack); console.log('0/1  ROJO'); process.exit(1) });
