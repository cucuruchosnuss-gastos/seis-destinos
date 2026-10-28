// La Edge Function ocr-remito (27/10/2026): los remitos a mano de Rosario
// leídos por la IA. La suite CORRE el index.ts sin Deno: le saca los tipos
// (stripTypeScriptTypes de Node), cambia el import de supabase-js por un
// cliente FALSO, pone un Deno falso (env y serve) y un fetch falso que hace de
// modelo. Así se prueba lo que hace, no solo lo que dice el texto.
//
//   node pruebas/test-ocr-remito.js
// Archivo bajo prueba: INDEX_TEST (por defecto supabase/functions/ocr-remito/index.ts).
// El módulo se carga desde su TEXTO (import de un data: URL): el runner de
// mutaciones escribe la copia mutada con otra extensión.

const fs = require('fs')
const path = require('path')
const { stripTypeScriptTypes } = require('node:module')

const RAIZ = path.join(__dirname, '..')
const INDEX = process.env.INDEX_TEST || path.join(RAIZ, 'supabase/functions/ocr-remito/index.ts')
const FUENTE = fs.readFileSync(INDEX, 'utf8')
console.log(`ARCHIVO ${INDEX} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 300)}` : ''))
}

// ── Los datos ─────────────────────────────────────────────────────────────────
const ROSARIO = '118b348c-43ec-4f6c-8bc2-27ab6f24b761'
const CORDOBA = '22222222-2222-4222-8222-222222222222'
const UID = '33333333-3333-4333-8333-333333333333'
const REMITO = '44444444-4444-4444-8444-444444444444'
const id = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`
const B40 = id(1), B45 = id(2), B45x3 = id(3), CBA = id(4)
const P40_SIN = id(11), P40_CON = id(12), P40_N2 = id(13), P45_SIN = id(21), P45_CON = id(22), P45_N2 = id(23), P45x3 = id(31), PCBA = id(41), P_INACTIVA = id(14)
const LEROMA = id(51), RECHAZADA = id(52), INACTIVA = id(53), QUINTANA = id(54)
const BOLSA = id(61), INS_INACTIVO = id(62)
const CLI_ROS = id(71), CLI_CBA = id(72), CLI_ROS_INACTIVO = id(73)

function tablasBase() {
  return {
    remitos_precarga: [{ id: REMITO, unidad_negocio_id: ROSARIO, foto_path: `${UID}/remitos/r1.jpg`, estado: 'leyendo' }],
    productos_terminados: [
      { id: B40, unidad_negocio_id: ROSARIO, nombre: 'Barquillo 40 x4', activo: true, orden: 1, alias: ['Cono dulce 40', 'Cucurucho 40', 'Barquillo N°40'] },
      { id: B45, unidad_negocio_id: ROSARIO, nombre: 'Barquillo 45 x4', activo: true, orden: 2, alias: [] },
      { id: B45x3, unidad_negocio_id: ROSARIO, nombre: 'Barquillo 45 x3', activo: true, orden: 3, alias: [] },
      { id: id(5), unidad_negocio_id: ROSARIO, nombre: 'Producto Viejo', activo: false, orden: 4, alias: [] },
      { id: CBA, unidad_negocio_id: CORDOBA, nombre: 'Cucurucho Cordobés', activo: true, orden: 1, alias: [] },
    ],
    producto_presentaciones: [
      { id: P40_SIN, producto_id: B40, nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 252, activa: true, orden: 1 },
      { id: P40_CON, producto_id: B40, nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 252, activa: true, orden: 2 },
      { id: P40_N2, producto_id: B40, nombre: 'Caja N°2', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 180, activa: true, orden: 3 },
      { id: P_INACTIVA, producto_id: B40, nombre: 'Caja vieja', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 99, activa: false, orden: 4 },
      { id: P45_SIN, producto_id: B45, nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 216, activa: true, orden: 1 },
      { id: P45_CON, producto_id: B45, nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 216, activa: true, orden: 2 },
      { id: P45_N2, producto_id: B45, nombre: 'Caja N°2', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 168, activa: true, orden: 3 },
      { id: P45x3, producto_id: B45x3, nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 300, activa: true, orden: 1 },
      { id: PCBA, producto_id: CBA, nombre: 'Caja cordobesa', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 777, activa: true, orden: 1 },
    ],
    marcas_personalizadas: [
      { id: LEROMA, nombre: 'LEROMA', activa: true, estado_alta: 'aprobada', papel_ilustracion: false },
      { id: QUINTANA, nombre: 'QUINTANA', activa: true, estado_alta: 'aprobada', papel_ilustracion: true },
      { id: RECHAZADA, nombre: 'CONO RECHAZADO', activa: true, estado_alta: 'rechazada', papel_ilustracion: false },
      { id: INACTIVA, nombre: 'CONO INACTIVO', activa: false, estado_alta: 'aprobada', papel_ilustracion: false },
    ],
    insumos: [
      { id: BOLSA, nombre: 'Bolsa | de 25\nkg', marca: 'X', nombre_bulto: 'fardo', contenido_bulto: 100, unidad_medida: 'un', activo: true },
      { id: INS_INACTIVO, nombre: 'Insumo Inactivo', marca: null, nombre_bulto: null, contenido_bulto: null, unidad_medida: 'kg', activo: false },
    ],
    clientes: [
      { id: CLI_ROS, unidad_negocio_id: ROSARIO, nombre: 'Heladería Rosarina', razon_social: 'ROSARINA SRL', apodos: ['La Rosa'], codigo_anterior: 1979, activo: true },
      { id: CLI_ROS_INACTIVO, unidad_negocio_id: ROSARIO, nombre: 'Cliente Dado De Baja', razon_social: null, apodos: [], codigo_anterior: 5, activo: false },
      { id: CLI_CBA, unidad_negocio_id: CORDOBA, nombre: 'Cliente Cordobés', razon_social: null, apodos: [], codigo_anterior: 7, activo: true },
    ],
  }
}

const LECTURA = {
  talonario: 'oficial',
  numero_remito: '0001-00003100',
  fecha: '2026-10-20',
  cliente_id: CLI_ROS,
  cliente_leido: 'Rosarina',
  transporte: 'Expreso Sur',
  observaciones: null,
  items: [
    { texto_leido: '10 Barquillo 40 x252 con cono Leroma', cantidad: 10, presentacion_id: P40_CON, marca_id: LEROMA, insumo_id: null, lotes: [{ lote: 'a12', cajas: 10 }], revisar: false, nota: null },
    { texto_leido: '5 Barquillo 45 común', cantidad: 5, presentacion_id: P45_SIN, marca_id: null, insumo_id: null, lotes: [], revisar: false, nota: null },
    { texto_leido: '2 fardos bolsa', cantidad: 2, presentacion_id: null, marca_id: null, insumo_id: BOLSA, lotes: [], revisar: false, nota: null },
  ],
}

// ── Los falsos ────────────────────────────────────────────────────────────────
let E // el estado de cada caso
function nuevoEstado(extra = {}) {
  E = {
    entorno: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', ANTHROPIC_API_KEY: 'sk-prueba' },
    tablas: tablasBase(),
    usuario: { id: UID },
    errorTabla: {},
    invisible: false,
    blob: new Blob([Buffer.from('FOTO-DEL-REMITO')], { type: 'image/jpeg' }),
    errorDescarga: null,
    respuestaModelo: () => respuestaTexto('```json\n' + JSON.stringify(LECTURA, null, 2) + '\n```'),
    errorGuardar: null,
    clientes: [], consultas: [], rpcs: [], descargas: [], llamadasModelo: [],
    ...extra,
  }
}
function respuestaTexto(texto, stop = 'end_turn') {
  return new Response(JSON.stringify({ content: [{ type: 'text', text: texto }], stop_reason: stop }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function consulta(tabla) {
  const q = { tabla, filtros: [], cols: null }
  E.consultas.push(q)
  const resolver = () => {
    if (E.errorTabla[tabla]) return { data: null, error: { message: 'falla de ' + tabla } }
    let filas = (E.tablas[tabla] ?? []).slice()
    if (tabla === 'remitos_precarga' && E.invisible) filas = []
    for (const f of q.filtros) {
      if (f.op === 'eq') filas = filas.filter(r => r[f.col] === f.v)
      if (f.op === 'neq') filas = filas.filter(r => r[f.col] !== f.v)
      if (f.op === 'in') filas = filas.filter(r => f.v.includes(r[f.col]))
    }
    if (q.cols) {
      const cols = q.cols.split(',').map(s => s.trim())
      filas = filas.map(r => Object.fromEntries(cols.map(c => [c, r[c]])))
    }
    return { data: filas, error: null }
  }
  const b = {
    select(cols) { q.cols = cols; return b },
    eq(col, v) { q.filtros.push({ op: 'eq', col, v }); return b },
    neq(col, v) { q.filtros.push({ op: 'neq', col, v }); return b },
    in(col, v) { q.filtros.push({ op: 'in', col, v }); return b },
    order() { return b },
    maybeSingle() { const r = resolver(); return Promise.resolve(r.error ? r : { data: r.data[0] ?? null, error: null }) },
    then(ok, mal) { return Promise.resolve(resolver()).then(ok, mal) },
  }
  return b
}

globalThis.__falso = {
  createClient(url, key, opciones) {
    E.clientes.push({ url, key, opciones })
    return {
      auth: { getUser: async () => (E.usuario ? { data: { user: E.usuario }, error: null } : { data: { user: null }, error: { message: 'jwt' } }) },
      from: (t) => consulta(t),
      rpc: async (nombre, args) => {
        E.rpcs.push({ nombre, args: JSON.parse(JSON.stringify(args)) })
        if (nombre === 'guardar_lectura_remito') {
          if (E.errorGuardar) return { data: null, error: E.errorGuardar }
          return { data: { id: args.p_id, estado: 'precargada', numero_remito: args.p_datos.numero_remito, items: args.p_datos.items, ocr_modelo: args.p_modelo }, error: null }
        }
        return { data: null, error: null }
      },
      storage: {
        from: (bucket) => ({
          download: async (ruta) => {
            E.descargas.push({ bucket, ruta })
            return E.errorDescarga ? { data: null, error: E.errorDescarga } : { data: E.blob, error: null }
          },
        }),
      },
    }
  },
}

let handler = null
globalThis.Deno = { env: { get: (k) => E.entorno[k] }, serve: (h) => { handler = h } }
globalThis.fetch = async (url, init) => {
  E.llamadasModelo.push({ url, init, cuerpo: JSON.parse(init.body) })
  return E.respuestaModelo()
}

async function pedir({ metodo = 'POST', token = 'Bearer abc', cuerpo = { remito_id: REMITO }, crudo } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = token
  const req = new Request('https://x.supabase.co/functions/v1/ocr-remito', {
    method: metodo, headers, body: metodo === 'GET' || metodo === 'OPTIONS' ? undefined : (crudo ?? JSON.stringify(cuerpo)),
  })
  const res = await handler(req)
  const texto = await res.text()
  let j = null
  try { j = JSON.parse(texto) } catch { /* vacío */ }
  return { status: res.status, j, headers: res.headers }
}
const guardar = () => E.rpcs.find(r => r.nombre === 'guardar_lectura_remito')
const marcar = () => E.rpcs.find(r => r.nombre === 'marcar_error_lectura_remito')
const prompt = () => E.llamadasModelo[0]?.cuerpo?.messages?.[0]?.content?.find(b => b.type === 'text')?.text ?? ''

;(async () => {
  // ── Cargar el TS ────────────────────────────────────────────────────────────
  const IMPORT = /^import \{ createClient \} from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2'\s*$/m
  chk('importa createClient de supabase-js@2 (esm.sh)', IMPORT.test(FUENTE))
  // stripTypeScriptTypes avisa que es experimental: el aviso no se imprime.
  const avisar = process.emitWarning
  process.emitWarning = () => {}
  const js = stripTypeScriptTypes(FUENTE.replace(IMPORT, 'const { createClient } = globalThis.__falso'))
  process.emitWarning = avisar
  // Los console.error de la función (los errores a propósito de cada caso) no
  // ensucian la salida: se guardan.
  const erroresDeLaFuncion = []
  console.error = (...a) => { erroresDeLaFuncion.push(a.map(String).join(' ')) }
  nuevoEstado()
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(js))
  chk('registra el handler con Deno.serve', typeof handler === 'function')
  if (typeof handler !== 'function') throw new Error('sin handler')

  // ── CORS y método ───────────────────────────────────────────────────────────
  nuevoEstado()
  let r = await pedir({ metodo: 'OPTIONS', token: null })
  chk('OPTIONS: 200 con CORS', r.status === 200 && r.headers.get('access-control-allow-origin') === '*' &&
    /authorization, x-client-info, apikey, content-type/.test(r.headers.get('access-control-allow-headers') || '') &&
    r.headers.get('access-control-allow-methods') === 'POST, OPTIONS')
  r = await pedir({ metodo: 'GET' })
  chk('GET: 405', r.status === 405)

  // ── Sesión ──────────────────────────────────────────────────────────────────
  nuevoEstado()
  r = await pedir({ token: null })
  chk('sin token: 401 y no llama a nadie', r.status === 401 && E.clientes.length === 0 && E.llamadasModelo.length === 0)
  r = await pedir({ token: 'Basic xyz' })
  chk('token que no es Bearer: 401', r.status === 401)
  nuevoEstado({ usuario: null })
  r = await pedir()
  chk('sesión inválida: 401, sin leer la fila', r.status === 401 && E.consultas.length === 0 && E.llamadasModelo.length === 0)

  // ── Cuerpo ──────────────────────────────────────────────────────────────────
  nuevoEstado()
  r = await pedir({ crudo: 'no es json' })
  chk('cuerpo que no es JSON: 400', r.status === 400)
  r = await pedir({ cuerpo: {} })
  chk('sin remito_id: 400, sin marcar error', r.status === 400 && /remito_id/.test(r.j?.mensaje) && E.rpcs.length === 0 && E.consultas.length === 0)
  r = await pedir({ cuerpo: { remito_id: 'abc' } })
  chk('remito_id que no es un uuid: 400', r.status === 400 && E.consultas.length === 0)
  r = await pedir({ cuerpo: { remito_id: 123 } })
  chk('remito_id que no es texto: 400', r.status === 400)

  // ── La fila ─────────────────────────────────────────────────────────────────
  nuevoEstado({ invisible: true })
  r = await pedir()
  chk('la fila que no ve (RLS): 404 claro, sin foto ni modelo ni marcar', r.status === 404 && /permiso/.test(r.j?.mensaje) &&
    E.descargas.length === 0 && E.llamadasModelo.length === 0 && E.rpcs.length === 0, JSON.stringify(r.j))
  nuevoEstado({ errorTabla: { remitos_precarga: true } })
  r = await pedir()
  chk('error al leer la fila: 500 sin modelo', r.status === 500 && E.llamadasModelo.length === 0)
  for (const estado of ['confirmada', 'descartada']) {
    nuevoEstado()
    E.tablas.remitos_precarga[0].estado = estado
    r = await pedir()
    chk(`remito ${estado}: 409, no se lee ni se marca`, r.status === 409 && E.llamadasModelo.length === 0 && E.rpcs.length === 0 && E.descargas.length === 0)
  }
  for (const estado of ['error', 'precargada']) {
    nuevoEstado()
    E.tablas.remitos_precarga[0].estado = estado
    r = await pedir()
    chk(`remito en ${estado}: se vuelve a leer`, r.status === 200 && r.j?.ok === true && !!guardar())
  }

  // ── El caso bueno ───────────────────────────────────────────────────────────
  nuevoEstado()
  r = await pedir()
  chk('ok: 200 con la fila de guardar_lectura_remito', r.status === 200 && r.j?.ok === true && r.j?.remito?.id === REMITO && r.j?.remito?.estado === 'precargada', JSON.stringify(r.j))
  chk('ok: CORS también en la respuesta', r.headers.get('access-control-allow-origin') === '*')
  chk('cliente con la anon key y el token de quien llama', E.clientes[0]?.key === 'anon' && E.clientes[0]?.url === 'https://x.supabase.co' &&
    E.clientes[0]?.opciones?.global?.headers?.Authorization === 'Bearer abc')
  const qRemito = E.consultas.find(q => q.tabla === 'remitos_precarga')
  chk('lee la fila por id', qRemito && qRemito.filtros.some(f => f.op === 'eq' && f.col === 'id' && f.v === REMITO) && /foto_path/.test(qRemito.cols) && /unidad_negocio_id/.test(qRemito.cols))
  chk('baja la foto del bucket comprobantes con su foto_path', E.descargas.length === 1 && E.descargas[0].bucket === 'comprobantes' && E.descargas[0].ruta === `${UID}/remitos/r1.jpg`)
  const llamada = E.llamadasModelo[0]
  chk('llama a la Messages API', llamada?.url === 'https://api.anthropic.com/v1/messages' && llamada.init.method === 'POST' &&
    llamada.init.headers['x-api-key'] === 'sk-prueba' && llamada.init.headers['anthropic-version'] === '2023-06-01')
  const porDefectoMP = (fs.readFileSync(path.join(RAIZ, 'supabase/functions/ocr-materia-prima/index.ts'), 'utf8').match(/const MODELO = '([^']+)'/) || [])[1]
  chk('sin OCR_REMITO_MODELO: el mismo modelo por defecto que ocr-materia-prima', porDefectoMP && llamada?.cuerpo?.model === porDefectoMP, `${llamada?.cuerpo?.model} vs ${porDefectoMP}`)
  chk('max_tokens alcanza para 60 renglones (≥ 8000)', llamada?.cuerpo?.max_tokens >= 8000, llamada?.cuerpo?.max_tokens)
  const img = llamada?.cuerpo?.messages?.[0]?.content?.[0]
  chk('la foto va como imagen base64, antes del texto', img?.type === 'image' && img.source.type === 'base64' && img.source.media_type === 'image/jpeg' &&
    img.source.data === Buffer.from('FOTO-DEL-REMITO').toString('base64'), JSON.stringify(img).slice(0, 200))
  const g = guardar()
  chk('graba con guardar_lectura_remito y no marca error', g && !marcar() && g.args.p_id === REMITO)
  chk('p_crudo: la respuesta del modelo SIN TOCAR (aunque venga en ```json)', JSON.stringify(g?.args?.p_crudo) === JSON.stringify(LECTURA), JSON.stringify(g?.args?.p_crudo))
  chk('p_modelo: el modelo usado', g?.args?.p_modelo === porDefectoMP)
  const d = g?.args?.p_datos
  chk('p_datos: encabezado', d?.numero_remito === '0001-00003100' && d.fecha === '2026-10-20' && d.cliente_id === CLI_ROS &&
    d.cliente_leido === 'Rosarina' && d.transporte === 'Expreso Sur' && d.observaciones === null, JSON.stringify(d))
  chk('p_datos: los renglones con los ids del catálogo', d?.items?.length === 3 && d.items[0].presentacion_id === P40_CON && d.items[0].marca_id === LEROMA &&
    d.items[1].presentacion_id === P45_SIN && d.items[2].insumo_id === BOLSA && d.items[2].presentacion_id === null, JSON.stringify(d?.items))
  chk('p_datos: lo claro no queda para revisar ni se omite', d?.items?.every(i => i.revisar === false && i.nota === null && i.omitir === false), JSON.stringify(d?.items))
  chk('p_datos: talonario oficial', d?.talonario === 'oficial')
  chk('p_datos: lotes y texto leído', JSON.stringify(d?.items?.[0]?.lotes) === JSON.stringify([{ lote: 'a12', cajas: 10 }]) && d.items[0].texto_leido === LECTURA.items[0].texto_leido)

  // ── El catálogo: solo de la fábrica de la fila ─────────────────────────────
  const P = prompt()
  const consultaDe = (t) => E.consultas.find(q => q.tabla === t)
  chk('productos filtrados por la fábrica de la fila y activos', consultaDe('productos_terminados')?.filtros.some(f => f.col === 'unidad_negocio_id' && f.v === ROSARIO) &&
    consultaDe('productos_terminados')?.filtros.some(f => f.col === 'activo' && f.v === true))
  chk('clientes filtrados por la fábrica de la fila y activos', consultaDe('clientes')?.filtros.some(f => f.col === 'unidad_negocio_id' && f.v === ROSARIO) &&
    consultaDe('clientes')?.filtros.some(f => f.col === 'activo' && f.v === true))
  chk('presentaciones activas', consultaDe('producto_presentaciones')?.filtros.some(f => f.col === 'activa' && f.v === true))
  chk('el prompt trae las presentaciones de Rosario con sus unidades', [P40_SIN, P40_CON, P40_N2, P45_SIN, P45_CON, P45_N2, P45x3].every(x => P.includes(x)) &&
    /Barquillo 40 x4 \| Cono dulce 40; Cucurucho 40; Barquillo N°40 \| Caja con cono \| 252 \| sí/.test(P) && /Caja N°2 \| 168/.test(P), P.slice(-1500))
  chk('el prompt NO trae lo de Córdoba', !P.includes(PCBA) && !P.includes('Cucurucho Cordobés') && !P.includes(CLI_CBA) && !P.includes('Cliente Cordobés'))
  chk('el prompt NO trae lo inactivo', !P.includes(P_INACTIVA) && !P.includes('Producto Viejo') && !P.includes(INS_INACTIVO) && !P.includes(CLI_ROS_INACTIVO) && !P.includes(INACTIVA))
  chk('conos: activos y no rechazados (como la Carga)', P.includes(LEROMA) && !P.includes(RECHAZADA))
  chk('conos: con papel ilustración', P.includes(`${QUINTANA} | QUINTANA | sí`) && P.includes(`${LEROMA} | LEROMA | no`) && /papel_ilustracion/.test(consultaDe('marcas_personalizadas')?.cols), P.slice(P.indexOf('CONOS'), P.indexOf('CONOS') + 300))
  chk('insumos activos, sin romper la tabla', P.includes(BOLSA) && P.includes('Bolsa de 25 kg | X | fardo | 100 | un'), P.slice(P.indexOf('INSUMOS'), P.indexOf('INSUMOS') + 300))
  chk('clientes con N° de cliente, razón social y apodos', P.includes(`${CLI_ROS} | 1979 | Heladería Rosarina | ROSARINA SRL | La Rosa`))

  // ── Las reglas del prompt ──────────────────────────────────────────────────
  const reglas = [
    ['solo ids del catálogo, nunca inventar', /SOLO ids que estén en el catálogo/.test(P) && /NUNCA inventes/.test(P)],
    ['texto_leido literal', /texto_leido: lo que dice el papel en ese renglón, LITERAL/.test(P)],
    ['presentación por unidades (×252, ×180, ×168)', /UNIDADES de la caja \(×252, ×180, ×168…\)/.test(P) && /"con cono X"/.test(P)],
    ['el cono en marca_id', /El cono va en marca_id/.test(P)],
    ['duda → revisar con nota corta (Lelona)', /leí Lelona, ¿LEROMA\?/.test(P) && /un 48 que no existe/.test(P) && /revisar true con la nota/.test(P)],
    ['el 40 o el 45 sin x3 es el x4', /El "40" o el "45" sin "x3" es el x4/.test(P) && /El x3 solo si dice x3/.test(P)],
    ['chocolate solo si lo dice', /Chocolate SOLO si el renglón lo dice/.test(P)],
    ['fecha dd/mm/aa → AAAA-MM-DD', /casillas dd\/mm\/aa, en formato AAAA-MM-DD/.test(P) && /"27\/10\/26" → "2026-10-27"/.test(P)],
    ['número impreso arriba a la derecha', /número IMPRESO arriba a la derecha/.test(P) && /0001-00003100/.test(P)],
    ['los alias', /ALIAS/.test(P)],
    ['solo el JSON', /Respondé ÚNICAMENTE con este JSON/.test(P)],
    ['dos talonarios: oficial y acopio (celeste, número rojo)', /"oficial": el talonario Dolce Pasta/.test(P) && /"acopio": un talonario CELESTE/.test(P) &&
      /Documento no válido como\s+factura/.test(P) && /número ROJO \(tipo 977492…\)/.test(P) && /"talonario": "oficial" \| "acopio"/.test(P)],
    ['omitir: mercadería de terceros (envases térmicos, salsas)', /omitir: true si el renglón es mercadería de TERCEROS/.test(P) && /envases térmicos, salsas/.test(P) && /"omitir": true \| false/.test(P)],
    ['"com" = común = sin cono', /"Común" \(o "com"\) = sin cono/.test(P)],
    ['ILUST. = papel ilustración (QUINTANA, MARBET, RIO)', /"ILUST\." = el cono es de papel ilustración/.test(P) && /QUINTANA, MARBET, RIO/.test(P)],
    ['C. Gde / Mini / ST / Chico = Cucuruchón; NUSS es la caja', /"C\. Gde" \/ "C\. Mini" \/ "C\. ST" \/ "C\. Chico" = Cucuruchón Grande \/ Mini \/ Standard \/\s+Chico/.test(P) && /"NUSS" al lado es la caja, NO un cono/.test(P)],
    ['Cap. x80 = Capelina Grande', /"Cap\. x80" = Capelina Grande/.test(P)],
    ['Cono 40x180 RIO = Barquillo 40 x4 Caja N°2 ×180 cono RIO', /"Cono 40x180 RIO" = Barquillo 40 x4, presentación "Caja N°2" ×180, cono RIO/.test(P)],
    ['Reposición → revisar con nota "reposición"', /"Reposición" escrito arriba/.test(P) && /revisar true y nota "reposición"/.test(P)],
    ['pallets y a granel → observaciones', /"N pallets" y "a granel" van a observaciones/.test(P)],
    ['Acopio MAS / Kiwi → observaciones', /"Acopio MAS" \/ "Acopio Kiwi"/.test(P) && /observaciones con la marca del acopio/.test(P)],
    ['clientes por nombre, razón social, apodos o número', /nombre, razón social, apodos o N° de cliente/.test(P)],
  ]
  for (const [n, c] of reglas) chk('prompt: ' + n, c)
  chk('prompt: el JSON pedido tiene todos los campos', ['talonario', 'omitir', 'numero_remito', 'fecha', 'cliente_id', 'cliente_leido', 'transporte', 'observaciones', 'items',
    'texto_leido', 'cantidad', 'presentacion_id', 'marca_id', 'insumo_id', 'lotes', 'revisar', 'nota'].every(c => P.includes(`"${c}"`)))

  // ── El modelo por el secret ────────────────────────────────────────────────
  nuevoEstado()
  E.entorno.OCR_REMITO_MODELO = '  claude-opus-5  '
  r = await pedir()
  chk('OCR_REMITO_MODELO elige el modelo y va en p_modelo', E.llamadasModelo[0]?.cuerpo?.model === 'claude-opus-5' && guardar()?.args?.p_modelo === 'claude-opus-5')
  nuevoEstado()
  E.entorno.OCR_COMPROBANTES_MODELO = 'otro'
  r = await pedir()
  chk('otro secret no cambia el modelo', E.llamadasModelo[0]?.cuerpo?.model === porDefectoMP)

  // ── JSON sin envoltorio y en varios bloques ────────────────────────────────
  nuevoEstado({ respuestaModelo: () => new Response(JSON.stringify({ content: [{ type: 'thinking', thinking: '{"no": 1}', text: '{"no": 1}' },{ type: 'text', text: 'Acá va: ' + JSON.stringify(LECTURA) }], stop_reason: 'end_turn' })) })
  r = await pedir()
  chk('JSON con texto antes y un bloque que no es texto: se lee', r.j?.ok === true && JSON.stringify(guardar()?.args?.p_crudo) === JSON.stringify(LECTURA))

  // ── Lo que el modelo inventa o duda ────────────────────────────────────────
  const conItems = (items, extra = {}) => () => respuestaTexto(JSON.stringify({ ...LECTURA, ...extra, items }))
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: PCBA, marca_id: null, insumo_id: null, lotes: [], revisar: false, nota: null }], { cliente_id: CLI_CBA }) })
  r = await pedir()
  let gi = guardar()?.args
  chk('un id de presentación de otra fábrica: null y revisar con nota', gi?.p_datos?.items?.[0]?.presentacion_id === null && gi.p_datos.items[0].revisar === true &&
    /no está en el catálogo/.test(gi.p_datos.items[0].nota), JSON.stringify(gi?.p_datos?.items))
  chk('…pero p_crudo lo conserva como vino', gi?.p_crudo?.items?.[0]?.presentacion_id === PCBA)
  chk('un cliente de otra fábrica: null', gi?.p_datos?.cliente_id === null)
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: P40_CON, marca_id: RECHAZADA, insumo_id: null, lotes: [], revisar: false, nota: 'leí Lelona, ¿LEROMA?' }]) })
  r = await pedir()
  gi = guardar()?.args
  chk('un cono rechazado: null, revisar, y la nota de la IA se conserva', gi?.p_datos?.items?.[0]?.marca_id === null && gi.p_datos.items[0].revisar === true &&
    gi.p_datos.items[0].nota.startsWith('leí Lelona, ¿LEROMA?'), JSON.stringify(gi?.p_datos?.items))
  // Talonario y omitir
  for (const [t, esp] of [['acopio', 'acopio'], ['oficial', 'oficial'], ['ACOPIO', 'oficial'], [null, 'oficial'], [undefined, 'oficial']]) {
    nuevoEstado({ respuestaModelo: conItems([], { talonario: t }) })
    r = await pedir()
    chk(`talonario ${JSON.stringify(t)} → ${esp}`, guardar()?.args?.p_datos?.talonario === esp, guardar()?.args?.p_datos?.talonario)
  }
  nuevoEstado({ respuestaModelo: conItems([
    { texto_leido: '3 envases térmicos', cantidad: 3, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], omitir: true, revisar: true, nota: 'de terceros' },
    { texto_leido: '2 salsas', cantidad: 2, omitir: 'true', revisar: false },
  ]) })
  r = await pedir()
  gi = guardar()?.args?.p_datos?.items
  chk('omitir true: no queda para revisar aunque no tenga producto', gi?.[0]?.omitir === true && gi[0].revisar === false, JSON.stringify(gi))
  chk('omitir que no es true (un texto): false, y sin producto queda para revisar', gi?.[1]?.omitir === false && gi[1].revisar === true, JSON.stringify(gi))
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: null, marca_id: null, insumo_id: INS_INACTIVO, lotes: [], revisar: false, nota: null }]) })
  r = await pedir()
  chk('un insumo inactivo: null y revisar', guardar()?.args?.p_datos?.items?.[0]?.insumo_id === null && guardar().args.p_datos.items[0].revisar === true)
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: P40_SIN, marca_id: null, insumo_id: BOLSA, lotes: [], revisar: false, nota: null }]) })
  r = await pedir()
  chk('con presentación, el insumo se borra', guardar()?.args?.p_datos?.items?.[0]?.insumo_id === null && guardar().args.p_datos.items[0].presentacion_id === P40_SIN)
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: P40_SIN, marca_id: LEROMA, insumo_id: null, lotes: [], revisar: false, nota: null }]) })
  r = await pedir()
  chk('cono con una presentación sin cono: revisar', guardar()?.args?.p_datos?.items?.[0]?.revisar === true && /sin cono/.test(guardar().args.p_datos.items[0].nota))
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: P45_CON, marca_id: null, insumo_id: null, lotes: [], revisar: false, nota: null }]) })
  r = await pedir()
  chk('presentación con cono sin el cono: revisar', guardar()?.args?.p_datos?.items?.[0]?.revisar === true && /Falta el cono/.test(guardar().args.p_datos.items[0].nota))
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 0, presentacion_id: P40_SIN, revisar: false }, { texto_leido: 'y', cantidad: '4', presentacion_id: P40_SIN, revisar: false }, { texto_leido: 'z', cantidad: 2, revisar: false }]) })
  r = await pedir()
  gi = guardar()?.args?.p_datos?.items
  chk('sin cantidad (0 o texto) o sin producto ni insumo: revisar', gi?.length === 3 && gi.every(i => i.revisar === true) && gi[0].cantidad === null && gi[1].cantidad === null, JSON.stringify(gi))
  nuevoEstado({ respuestaModelo: conItems([{ texto_leido: 'x', cantidad: 3, presentacion_id: P40_SIN, revisar: false, lotes: [{ lote: ' b7 ', cajas: 2 }, { lote: '', cajas: 1 }, { lote: 'c1', cajas: 1.5 }, 'basura'] }]) })
  r = await pedir()
  chk('lotes: sin lote se saca, cajas no enteras → null', JSON.stringify(guardar()?.args?.p_datos?.items?.[0]?.lotes) === JSON.stringify([{ lote: 'b7', cajas: 2 }, { lote: 'c1', cajas: null }]), JSON.stringify(guardar()?.args?.p_datos?.items?.[0]?.lotes))
  nuevoEstado({ respuestaModelo: conItems(Array.from({ length: 70 }, (_, k) => ({ texto_leido: 'r' + k, cantidad: 1, presentacion_id: P40_SIN, revisar: false }))) })
  r = await pedir()
  chk('hasta 60 renglones', guardar()?.args?.p_datos?.items?.length === 60 && guardar().args.p_crudo.items.length === 70)
  nuevoEstado({ respuestaModelo: conItems([null, 'texto', [1], { texto_leido: 'ok', cantidad: 1, presentacion_id: P40_SIN }]) })
  r = await pedir()
  chk('lo que no es un renglón se saca', guardar()?.args?.p_datos?.items?.length === 1)
  nuevoEstado({ respuestaModelo: conItems('no es lista', { fecha: '27/10/26' }) })
  r = await pedir()
  chk('items que no es una lista: []', JSON.stringify(guardar()?.args?.p_datos?.items) === '[]')
  chk('fecha dd/mm/aa → AAAA-MM-DD', guardar()?.args?.p_datos?.fecha === '2026-10-27')
  for (const [f, esp] of [['1/9/2026', '2026-09-01'], ['ayer', null], [20261027, null]]) {
    nuevoEstado({ respuestaModelo: conItems([], { fecha: f }) })
    r = await pedir()
    chk(`fecha ${JSON.stringify(f)} → ${esp}`, guardar()?.args?.p_datos?.fecha === esp, guardar()?.args?.p_datos?.fecha)
  }
  nuevoEstado({ respuestaModelo: conItems([], { numero_remito: '  ', cliente_leido: 42, transporte: ' Flete  ' }) })
  r = await pedir()
  chk('textos: vacío o no texto → null, con trim', guardar()?.args?.p_datos?.numero_remito === null && guardar().args.p_datos.cliente_leido === null && guardar().args.p_datos.transporte === 'Flete')

  // ── Lo que falla: marcar_error_lectura_remito ──────────────────────────────
  const marcaYNoGuarda = (n, cond, extra) => chk(n, cond && !!marcar() && marcar().args.p_id === REMITO && typeof marcar().args.p_error === 'string' && marcar().args.p_error.length > 10 && !guardar() &&
    r.j?.ok === false && r.j?.mensaje === marcar().args.p_error, extra ?? JSON.stringify({ status: r.status, j: r.j, rpcs: E.rpcs }))
  nuevoEstado({ respuestaModelo: () => respuestaTexto('{"numero_remito": "0001-0000', 'max_tokens') })
  r = await pedir()
  marcaYNoGuarda('cortado por max_tokens: marca error (renglones) y no graba', /demasiados renglones/.test(marcar()?.args?.p_error))
  nuevoEstado({ respuestaModelo: () => new Response('sobrecargado', { status: 529 }) })
  r = await pedir()
  marcaYNoGuarda('error del modelo: marca error (dice que la IA dio error) y 502', r.status === 502 && /La IA devolvió un error/.test(r.j?.mensaje))
  nuevoEstado({ respuestaModelo: () => new Response(JSON.stringify({ type: 'error', error: { type: 'overloaded_error' } }), { status: 529 }) })
  r = await pedir()
  marcaYNoGuarda('error del modelo con cuerpo JSON: igual marca error', r.status === 502 && /La IA devolvió un error/.test(r.j?.mensaje))
  nuevoEstado({ respuestaModelo: () => { throw new Error('red caída') } })
  r = await pedir()
  marcaYNoGuarda('error de red: marca error y 502', r.status === 502)
  nuevoEstado({ respuestaModelo: () => respuestaTexto('No puedo leer esta imagen.') })
  r = await pedir()
  marcaYNoGuarda('respuesta sin JSON: marca error, no graba', true)
  nuevoEstado({ respuestaModelo: () => respuestaTexto('```json\n{"numero_remito": "1", }\n```') })
  r = await pedir()
  marcaYNoGuarda('JSON roto: marca error', true)
  nuevoEstado({ respuestaModelo: () => respuestaTexto('[{"a": 1}]') })
  r = await pedir()
  marcaYNoGuarda('una lista en vez de un objeto: marca error', true)
  nuevoEstado({ respuestaModelo: () => respuestaTexto('```json\n[{"a": 1}]\n```') })
  r = await pedir()
  marcaYNoGuarda('una lista envuelta en ```json: marca error', true)
  nuevoEstado({ respuestaModelo: () => new Response('<html>', { status: 200 }) })
  r = await pedir()
  marcaYNoGuarda('el cuerpo del modelo no es JSON: marca error', true)
  nuevoEstado({ errorDescarga: { message: 'Object not found' } })
  r = await pedir()
  marcaYNoGuarda('la foto no baja: marca error, 404, sin modelo', r.status === 404 && E.llamadasModelo.length === 0)
  nuevoEstado()
  E.tablas.remitos_precarga[0].foto_path = `${UID}/../otro/r1.jpg`
  r = await pedir()
  marcaYNoGuarda('ruta con "..": marca error sin bajar nada', E.descargas.length === 0)
  for (const mala of ['../remitos/r1.jpg', `${UID}/remitos/..`, `./remitos/r1.jpg`, `/remitos/r1.jpg`]) {
    nuevoEstado()
    E.tablas.remitos_precarga[0].foto_path = mala
    r = await pedir()
    marcaYNoGuarda(`ruta ${mala}: marca error sin bajar`, E.descargas.length === 0)
  }
  nuevoEstado()
  E.tablas.remitos_precarga[0].foto_path = `${UID}/cobranzas/r1.jpg`
  r = await pedir()
  marcaYNoGuarda('ruta fuera de la carpeta remitos: marca error sin bajar', E.descargas.length === 0)
  nuevoEstado()
  E.tablas.remitos_precarga[0].foto_path = null
  r = await pedir()
  marcaYNoGuarda('sin foto_path: marca error', E.descargas.length === 0)
  nuevoEstado({ blob: new Blob([Buffer.from('GIF')], { type: 'image/gif' }) })
  r = await pedir()
  marcaYNoGuarda('un gif: marca error sin modelo', E.llamadasModelo.length === 0)
  nuevoEstado({ blob: { type: 'image/jpeg', size: 11 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(1) } })
  r = await pedir()
  marcaYNoGuarda('más de 10 MB: marca error sin modelo', E.llamadasModelo.length === 0)
  nuevoEstado()
  delete E.entorno.ANTHROPIC_API_KEY
  r = await pedir()
  marcaYNoGuarda('sin ANTHROPIC_API_KEY: marca error y 500', r.status === 500 && E.llamadasModelo.length === 0)
  for (const t of ['productos_terminados', 'producto_presentaciones', 'marcas_personalizadas', 'insumos', 'clientes']) {
    nuevoEstado({ errorTabla: { [t]: true } })
    r = await pedir()
    marcaYNoGuarda(`el catálogo (${t}) no se lee: marca error sin modelo`, E.llamadasModelo.length === 0)
  }
  nuevoEstado({ errorGuardar: { message: 'No tenés permiso sobre los remitos de esta fábrica.' } })
  r = await pedir()
  chk('guardar_lectura_remito falla: marca error y ok false', !!marcar() && r.j?.ok === false && r.status === 500 && r.j.mensaje === marcar().args.p_error)

  // ── Mime por la extensión, y el PDF ────────────────────────────────────────
  nuevoEstado({ blob: new Blob([Buffer.from('X')], { type: '' }) })
  E.tablas.remitos_precarga[0].foto_path = `${UID}/remitos/r1.PNG`
  r = await pedir()
  chk('sin tipo en la foto: por la extensión', E.llamadasModelo[0]?.cuerpo?.messages?.[0]?.content?.[0]?.source?.media_type === 'image/png')
  nuevoEstado({ blob: new Blob([Buffer.from('%PDF')], { type: 'application/pdf' }) })
  E.tablas.remitos_precarga[0].foto_path = `${UID}/remitos/r1.pdf`
  r = await pedir()
  chk('un PDF va como documento', E.llamadasModelo[0]?.cuerpo?.messages?.[0]?.content?.[0]?.type === 'document')

  // ── Una fábrica sin productos: no consulta presentaciones con una lista vacía
  nuevoEstado()
  E.tablas.remitos_precarga[0].unidad_negocio_id = '99999999-9999-4999-8999-999999999999'
  r = await pedir()
  chk('fábrica sin productos: igual lee, sin pedir presentaciones', r.j?.ok === true && !E.consultas.some(q => q.tabla === 'producto_presentaciones') && /\(ninguno\)/.test(prompt()))

  // ── Lo que solo se mira en el texto ────────────────────────────────────────
  chk('dice que NO está desplegada y que va con verify_jwt', /NO DESPLEGADA/.test(FUENTE) && /verify_jwt: true/.test(FUENTE))

  console.log(`\n${ok}/${ok + fallas.length} verificaciones OK`)
  if (fallas.length) {
    console.log('\nFALLAS:')
    for (const f of fallas) console.log('  ✗ ' + f)
    process.exit(1)
  }
})().catch(err => { console.log('ERROR:', String(err?.message ?? err).slice(0, 500)); process.exit(1) })
