// LA FOTO DEL ESQUEMA de la base (27/09/2026): tablas y vistas de `public` con
// sus columnas y tipos, y las funciones con su firma, en supabase/esquema.md.
// Sirve para no tener que ir a la base a cada rato a ver qué columnas tiene
// una tabla o qué devuelve una RPC. Se actualiza al cerrar cada tanda que
// toque la base (skill cerrar-tanda).
//
//   npm run esquema                      → consulta la base: con SUPABASE_ACCESS_TOKEN por la API,
//                                          si no, con el CLI de Supabase ya logueado (supabase db query --linked)
//   node supabase/esquema.js --sql       → imprime la consulta (para correrla por el MCP)
//   node supabase/esquema.js --desde r.json → arma esquema.md desde el resultado
//
// La consulta es UN SOLO SELECT sobre information_schema y pg_proc: no escribe
// nada. Con token, va por la Management API de Supabase
// (POST /v1/projects/<ref>/database/query). El resultado del MCP execute_sql
// sirve igual: un arreglo con una fila { esquema: {...} }, o esa fila sola.
'use strict';
const fs = require('fs');
const path = require('path');

const REF = 'xtorxouhzuizdvawqakb';
const DESTINO = path.join(__dirname, 'esquema.md');

const SQL = `select jsonb_build_object(
  'tablas', (select jsonb_agg(jsonb_build_object(
      'nombre', t.table_name, 'tipo', t.table_type,
      'columnas', (select jsonb_agg(jsonb_build_object('c', c.column_name, 't', c.data_type, 'n', c.is_nullable = 'YES', 'd', c.column_default) order by c.ordinal_position)
                     from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.table_name))
    order by t.table_name)
    from information_schema.tables t where t.table_schema = 'public'),
  'funciones', (select jsonb_agg(jsonb_build_object(
      'nombre', p.proname, 'args', pg_get_function_identity_arguments(p.oid), 'devuelve', pg_get_function_result(p.oid),
      'definer', p.prosecdef, 'anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    order by p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
) as esquema`;

const escMd = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function renderizar(esq, fecha) {
  const tablas = esq.tablas || [];
  const funciones = esq.funciones || [];
  const l = [];
  l.push('# Esquema de la base (nuss-central, `public`)', '');
  l.push(`Foto tomada el ${fecha} con \`npm run esquema\` (una consulta de solo lectura a information_schema y pg_proc). **Es una foto, no la fuente de verdad**: ante la duda, consultá la base.`, '');
  l.push(`- ${tablas.filter(t => t.tipo === 'BASE TABLE').length} tablas, ${tablas.filter(t => t.tipo === 'VIEW').length} vistas, ${funciones.length} funciones.`, '');
  l.push('## Tablas y vistas', '');
  for (const t of tablas) {
    l.push(`### ${t.nombre}${t.tipo === 'VIEW' ? ' (vista)' : ''}`, '');
    l.push('| Columna | Tipo | Nula | Default |', '|---|---|---|---|');
    for (const c of t.columnas || []) l.push(`| ${escMd(c.c)} | ${escMd(c.t)} | ${c.n ? 'sí' : 'no'} | ${escMd(c.d)} |`);
    l.push('');
  }
  l.push('## Funciones', '');
  l.push('`D` = SECURITY DEFINER. `anon` / `auth` = quién la puede ejecutar.', '');
  l.push('| Función | Devuelve | D | anon | auth |', '|---|---|---|---|---|');
  for (const f of funciones) {
    l.push(`| \`${escMd(f.nombre)}(${escMd(f.args)})\` | ${escMd(f.devuelve)} | ${f.definer ? 'D' : ''} | ${f.anon ? 'sí' : ''} | ${f.authenticated ? 'sí' : ''} |`);
  }
  l.push('');
  return l.join('\n');
}

// Acepta lo que devuelve la Management API o el MCP: [{esquema}], {esquema} o el objeto.
function extraer(json) {
  let x = json;
  if (x && Array.isArray(x.rows)) x = x.rows;   // el CLI: { rows: [...] }
  if (Array.isArray(x)) x = x[0];
  if (x && x.esquema) x = x.esquema;
  if (typeof x === 'string') x = JSON.parse(x);
  if (!x || !Array.isArray(x.tablas) || !Array.isArray(x.funciones)) throw new Error('El resultado no tiene la forma esperada { tablas, funciones }.');
  return x;
}

// Con el CLI de Supabase logueado y el proyecto vinculado. null si no se puede.
function porCli() {
  const { spawnSync } = require('child_process');
  const os = require('os');
  const tmp = path.join(os.tmpdir(), 'esquema-seis-destinos.sql');
  fs.writeFileSync(tmp, SQL);
  const r = spawnSync('supabase', ['db', 'query', '--linked', '-f', tmp, '-o', 'json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try { fs.unlinkSync(tmp); } catch { /* ya no estaba */ }
  if (r.status !== 0 || !r.stdout) return null;
  const ini = r.stdout.indexOf('{');
  try { return JSON.parse(r.stdout.slice(ini)); } catch { return null; }
}

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--sql') { console.log(SQL); return; }
  let json;
  if (args[0] === '--desde') {
    json = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  } else {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!token) json = porCli();
    if (!token && !json) {
      console.error('Falta SUPABASE_ACCESS_TOKEN (un token personal de https://supabase.com/dashboard/account/tokens).\n' +
        'Sin token: `node supabase/esquema.js --sql`, correr la consulta por el MCP de Supabase, guardar el resultado\n' +
        'en un archivo y `node supabase/esquema.js --desde <archivo>`.');
      process.exit(2);
    }
    if (!json) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SQL }),
    });
    if (!r.ok) { console.error(`La API respondió ${r.status}: ${await r.text()}`); process.exit(1); }
    json = await r.json();
    }
  }
  const esq = extraer(json);
  fs.writeFileSync(DESTINO, renderizar(esq, hoy()));
  console.log(`supabase/esquema.md: ${esq.tablas.length} tablas y vistas, ${esq.funciones.length} funciones`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { SQL, renderizar, extraer };
