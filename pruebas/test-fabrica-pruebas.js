// El helper compartido de la fábrica de pruebas (js/utils.js): cargarla con un
// Supabase falso, y los dos filtros. Todo se EJECUTA.
//
//   node pruebas/test-fabrica-pruebas.js
//   UTILS_TEST=/otra/copia/utils.js node pruebas/test-fabrica-pruebas.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const RUTA = process.env.UTILS_TEST || path.join(__dirname, '..', 'js', 'utils.js');
console.log(`LEIDO:${fs.readFileSync(RUTA, 'utf8').length} de ${RUTA}`);

let ok = 0;
const fallas = [];
const chk = (n, c, d) => { if (c) ok++; else fallas.push(n + (d !== undefined ? ` — ${d}` : '')); };

const PRUEBA = 'u-robot', REAL = 'u-real', ROBOT = 'p-robot', PERSONA = 'p-real';

// Un Supabase falso que registra qué se pidió.
function supabaseFalso({ unidades = [{ id: PRUEBA }], personas = [{ id: ROBOT }], yo = { unidad_negocio_id: REAL, es_prueba: false }, fallar = null, uid = 'uid-1' } = {}) {
  const pedidos = [];
  const consulta = (tabla) => {
    const q = { tabla, filtros: [] };
    pedidos.push(q);
    const r = {
      select(s) { q.select = s; return r; },
      eq(c, v) { q.filtros.push(['eq', c, v]); return r; },
      in(c, v) { q.filtros.push(['in', c, v]); return r; },
      maybeSingle() { return r; },
      then(res, rej) {
        if (fallar === tabla) return Promise.resolve({ data: null, error: { message: 'x' } }).then(res, rej);
        const data = tabla === 'unidades_negocio' ? unidades : tabla === 'v_empleados_publico' ? personas : yo;
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return r;
  };
  return {
    pedidos,
    from: consulta,
    auth: { getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null } }) },
  };
}

(async () => {
  const U = await import(pathToFileURL(RUTA).href);
  const { cargarFabricaDePruebas, sinUnidadesDePrueba, sinPersonasDePrueba, FABRICA_SIN_DATOS } = U;
  chk('exporta cargarFabricaDePruebas', typeof cargarFabricaDePruebas === 'function');
  chk('exporta sinUnidadesDePrueba', typeof sinUnidadesDePrueba === 'function');
  chk('exporta sinPersonasDePrueba', typeof sinPersonasDePrueba === 'function');

  const origWarn = console.warn; console.warn = () => {};

  // --- una cuenta real ---
  const sb = supabaseFalso();
  const f = await cargarFabricaDePruebas(sb);
  chk('real: ok', f.ok === true);
  chk('real: conoce la unidad de prueba', f.unidades.has(PRUEBA) && f.unidades.size === 1);
  chk('real: conoce la persona de prueba', f.personas.has(ROBOT));
  chk('real: no es de prueba', f.soyDePrueba === false);
  const qUn = sb.pedidos.find(p => p.tabla === 'unidades_negocio');
  chk('pide las unidades con es_prueba = true', qUn && qUn.filtros.some(x => x[0] === 'eq' && x[1] === 'es_prueba' && x[2] === true));
  const qPer = sb.pedidos.find(p => p.tabla === 'v_empleados_publico');
  chk('pide las personas por la unidad de prueba', qPer && qPer.filtros.some(x => x[0] === 'in' && x[1] === 'unidad_negocio_id' && x[2].includes(PRUEBA)));
  const qYo = sb.pedidos.find(p => p.tabla === 'empleados');
  chk('se mira a sí misma por auth_user_id', qYo && qYo.filtros.some(x => x[1] === 'auth_user_id' && x[2] === 'uid-1'));

  const unidades = [{ id: REAL, nombre: 'Cucuruchos Nuss' }, { id: PRUEBA, nombre: 'Pruebas (robot)' }];
  const fu = sinUnidadesDePrueba(unidades, f);
  chk('real: saca la unidad de prueba', fu.length === 1 && fu[0].id === REAL, JSON.stringify(fu));
  const porClave = sinUnidadesDePrueba([{ unidad_negocio_id: PRUEBA }, { unidad_negocio_id: REAL }], f, x => x.unidad_negocio_id);
  chk('real: la clave de unidad es configurable', porClave.length === 1 && porClave[0].unidad_negocio_id === REAL);

  const personas = [{ id: PERSONA, unidad_negocio_id: REAL }, { id: ROBOT }, { id: 'p-otro-robot', unidad_negocio_id: PRUEBA }, { id: 'p-sin-unidad', unidad_negocio_id: null }];
  const fp = sinPersonasDePrueba(personas, f).map(p => p.id);
  chk('real: saca a la persona de prueba por id', !fp.includes(ROBOT));
  chk('real: saca a la persona de prueba por su unidad', !fp.includes('p-otro-robot'));
  chk('real: deja a las personas reales', fp.includes(PERSONA) && fp.includes('p-sin-unidad'), JSON.stringify(fp));

  // --- una cuenta de la fábrica de pruebas ---
  const f2 = await cargarFabricaDePruebas(supabaseFalso({ yo: { unidad_negocio_id: PRUEBA, es_prueba: true } }));
  chk('robot: es de prueba', f2.soyDePrueba === true);
  chk('robot: ve la unidad de prueba', sinUnidadesDePrueba(unidades, f2).length === 2);
  chk('robot: ve a las personas de prueba', sinPersonasDePrueba(personas, f2).length === 4);
  const f3 = await cargarFabricaDePruebas(supabaseFalso({ yo: { unidad_negocio_id: PRUEBA, es_prueba: false } }));
  chk('cuenta en la unidad de prueba (sin marca propia): es de prueba', f3.soyDePrueba === true);
  const f4 = await cargarFabricaDePruebas(supabaseFalso({ yo: { unidad_negocio_id: REAL, es_prueba: true } }));
  chk('persona marcada es_prueba en otra unidad: es de prueba', f4.soyDePrueba === true);

  // --- sin fábrica de pruebas en la base ---
  const sb5 = supabaseFalso({ unidades: [] });
  const f5 = await cargarFabricaDePruebas(sb5);
  chk('sin unidades de prueba: ok y vacía', f5.ok && !f5.unidades.size && !f5.personas.size);
  chk('sin unidades de prueba: no pide las personas', !sb5.pedidos.some(p => p.tabla === 'v_empleados_publico'));
  chk('sin unidades de prueba: no filtra nada', sinUnidadesDePrueba(unidades, f5).length === 2 && sinPersonasDePrueba(personas, f5).length === 4);

  // --- si algo falla NO se frena nada y NO se filtra nada ---
  for (const t of ['unidades_negocio', 'v_empleados_publico', 'empleados']) {
    const fx = await cargarFabricaDePruebas(supabaseFalso({ fallar: t }));
    chk(`falla ${t}: ok false`, fx.ok === false);
    chk(`falla ${t}: no filtra unidades`, sinUnidadesDePrueba(unidades, fx).length === 2);
    chk(`falla ${t}: no filtra personas`, sinPersonasDePrueba(personas, fx).length === 4);
  }
  const fz = await cargarFabricaDePruebas({ from() { throw new Error('boom'); }, auth: {} });
  chk('una excepción no se escapa', fz.ok === false);
  chk('sin sesión: no es de prueba', (await cargarFabricaDePruebas(supabaseFalso({ uid: null }))).soyDePrueba === false);

  // --- entradas raras ---
  chk('null da lista vacía (unidades)', Array.isArray(sinUnidadesDePrueba(null, f)) && sinUnidadesDePrueba(null, f).length === 0);
  chk('null da lista vacía (personas)', Array.isArray(sinPersonasDePrueba(null, f)) && sinPersonasDePrueba(null, f).length === 0);
  chk('sin fábrica no filtra', sinUnidadesDePrueba(unidades, null).length === 2 && sinPersonasDePrueba(personas, undefined).length === 4);
  chk('FABRICA_SIN_DATOS no filtra', sinUnidadesDePrueba(unidades, FABRICA_SIN_DATOS).length === 2);
  chk('no muta la lista original', unidades.length === 2 && personas.length === 4);

  console.warn = origWarn;
  if (fallas.length) console.log(fallas.map(x => '  ✗ ' + x).join('\n'));
  const total = ok + fallas.length;
  console.log(`${ok}/${total} ${fallas.length ? 'ROJO' : 'verde'}`);
  process.exit(fallas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
