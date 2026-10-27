// Mutaciones de test-ocr-remito.js (la Edge Function ocr-remito, los remitos a
// mano de Rosario, 27/10/2026): mutan supabase/functions/ocr-remito/index.ts,
// que la suite recibe por INDEX_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// función de la que se copió la estructura, ocr-materia-prima, tal como estaba
// en f364914 (el pedido del 27/10, el commit del que salió la rama: ocr-remito
// todavía no existía). Si diera verde ahí, la suite solo estaría mirando la
// estructura común y no lo propio del remito. Nunca HEAD.
//
//   node pruebas/mut-ocr-remito.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-ocr-remito.js')
const BASE = 'f364914'

{
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:supabase/functions/ocr-materia-prima/index.ts`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-ocr-remito.ts')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, INDEX_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre ocr-materia-prima de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo propio del remito.`)
    if (!rojo) process.exit(2)
  }
}

correrMutaciones({
  suite: SUITE,
  variable: 'INDEX_TEST',
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'supabase/functions/ocr-remito/index.ts'),
  funciones: [],
  manuales: [
    // Modelo, bucket, CORS
    { nombre: 'el modelo por otro secret', de: "Deno.env.get('OCR_REMITO_MODELO')", a: "Deno.env.get('OCR_MODELO')" },
    { nombre: 'el secret sin trim', de: "Deno.env.get('OCR_REMITO_MODELO')?.trim() || MODELO_POR_DEFECTO", a: "Deno.env.get('OCR_REMITO_MODELO') || MODELO_POR_DEFECTO" },
    { nombre: 'otro modelo por defecto', de: "const MODELO_POR_DEFECTO = 'claude-sonnet-4-6'", a: "const MODELO_POR_DEFECTO = 'claude-opus-5'" },
    { nombre: 'max_tokens corto', de: 'const MAX_TOKENS = 8192', a: 'const MAX_TOKENS = 4096' },
    { nombre: 'otro bucket', de: "const BUCKET = 'comprobantes'", a: "const BUCKET = 'cobranzas'" },
    { nombre: 'CORS cerrado', de: "'Access-Control-Allow-Origin': '*',", a: "'Access-Control-Allow-Origin': 'https://otro.ejemplo',", },
    // Sesión y cuerpo
    { nombre: 'sin el token de quien llama', de: '{ global: { headers: { Authorization: authHeader } } },', a: '{},' },
    { nombre: 'sin token no da 401', de: "  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, mensaje: 'No autorizado' }, 401)\n", a: '' },
    { nombre: 'la sesión no se verifica', de: "  if (errorAuth || !user) return json({ ok: false, mensaje: 'Sesión inválida o expirada' }, 401)\n", a: '' },
    { nombre: 'remito_id sin validar', de: "  if (!UUID.test(remitoId)) return json({ ok: false, mensaje: 'Falta el remito a leer (remito_id).' }, 400)\n", a: '' },
    // La fila
    { nombre: 'el error al leer la fila no se ve', de: '  if (errorRemito) {', a: '  if (false) {' },
    { nombre: 'la fila que no ve no da 404', de: '  if (!remito) {', a: '  if (false) {' },
    { nombre: 'se relee un remito confirmado', de: '  if (!ESTADOS_QUE_SE_LEEN.includes(remito.estado)) {', a: '  if (false) {' },
    { nombre: 'el error no se marca', de: "    const { error } = await supabase.rpc('marcar_error_lectura_remito', { p_id: remitoId, p_error: mensaje })", a: '    const error = null' },
    // La foto
    { nombre: 'la ruta no se valida', de: "  if (!rutaValida(ruta)) return await fallar('La foto del remito no está donde tiene que estar. Volvé a subirla.', 400)\n", a: '' },
    { nombre: 'la ruta fuera de remitos pasa', de: "s.length === 3 && s[1] === 'remitos' && ", a: 's.length === 3 && ' },
    { nombre: 'la ruta con ".." pasa', de: "s.every((x) => x !== '' && x !== '.' && x !== '..')", a: 'true' },
    { nombre: 'se acepta un gif', de: "const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']", a: "const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif']" },
    { nombre: 'sin mime por la extensión', de: "  if (r.endsWith('.png')) return 'image/png'\n", a: '' },
    { nombre: 'sin tope de 10 MB', de: "  if (blob.size > BYTES_MAXIMO) return await fallar('La foto pesa más de 10 MB. Sacala de nuevo con menos calidad.', 400)\n", a: '' },
    { nombre: 'la foto no va en base64', de: "    : { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } }", a: "    : { type: 'image', source: { type: 'base64', media_type: mime, data: '' } }" },
    { nombre: 'el PDF va como imagen', de: "  const archivo = mime === 'application/pdf'", a: '  const archivo = false' },
    { nombre: 'sin clave de la IA sigue', de: '  if (!apiKey) {', a: '  if (false) {' },
    // El catálogo
    { nombre: 'productos de todas las fábricas', de: ".select('id, nombre, alias')\n      .eq('unidad_negocio_id', unidadId).eq('activo', true)", a: ".select('id, nombre, alias')\n      .eq('activo', true)" },
    { nombre: 'productos inactivos', de: ".select('id, nombre, alias')\n      .eq('unidad_negocio_id', unidadId).eq('activo', true)", a: ".select('id, nombre, alias')\n      .eq('unidad_negocio_id', unidadId)" },
    { nombre: 'clientes de todas las fábricas', de: ".select('id, nombre, razon_social, apodos, codigo_anterior')\n      .eq('unidad_negocio_id', unidadId).eq('activo', true)", a: ".select('id, nombre, razon_social, apodos, codigo_anterior')\n      .eq('activo', true)" },
    { nombre: 'clientes inactivos', de: ".select('id, nombre, razon_social, apodos, codigo_anterior')\n      .eq('unidad_negocio_id', unidadId).eq('activo', true)", a: ".select('id, nombre, razon_social, apodos, codigo_anterior')\n      .eq('unidad_negocio_id', unidadId)" },
    { nombre: 'conos rechazados', de: ".eq('activa', true).neq('estado_alta', 'rechazada')", a: ".eq('activa', true)" },
    { nombre: 'conos sin papel ilustración', de: "select('id, nombre, papel_ilustracion')", a: "select('id, nombre')" },
    { nombre: 'insumos inactivos', de: ".select('id, nombre, marca, nombre_bulto, contenido_bulto, unidad_medida')\n      .eq('activo', true)", a: ".select('id, nombre, marca, nombre_bulto, contenido_bulto, unidad_medida')" },
    { nombre: 'presentaciones inactivas', de: ".in('producto_id', productos.map((x) => x.id)).eq('activa', true)", a: ".in('producto_id', productos.map((x) => x.id))" },
    { nombre: 'un error del catálogo se ignora', de: '  for (const r of [p, m, i, c]) if (r.error) throw r.error\n', a: '' },
    { nombre: 'un error de las presentaciones se ignora', de: '    if (pr.error) throw pr.error\n', a: '' },
    { nombre: 'presentaciones aunque no haya productos', de: '  if (productos.length) {', a: '  if (true) {' },
    { nombre: 'el catálogo sin los alias', de: '[x.id, x.producto, x.alias, x.nombre,', a: '[x.id, x.producto, x.nombre,' },
    { nombre: 'el catálogo sin las unidades', de: 'x.nombre, x.unidades_por_caja, siNo(x.con_cono)', a: 'x.nombre, siNo(x.con_cono)' },
    { nombre: 'el catálogo sin el N° de cliente', de: '[x.id, x.codigo_anterior, x.nombre,', a: '[x.id, x.nombre,' },
    { nombre: 'una celda rompe la tabla', de: ".replace(/[|\\r\\n\\t]+/g, ' ')", a: '' },
    { nombre: 'el catálogo no va al modelo', de: "text: REGLAS + '\\n\\n' + textoCatalogo(catalogo)", a: 'text: REGLAS' },
    // Lo que responde el modelo
    { nombre: 'el error del modelo no corta', de: '  if (!respuesta.ok) {', a: '  if (false) {' },
    { nombre: 'sin guarda de max_tokens', de: "  if (cuerpo?.stop_reason === 'max_tokens') {", a: '  if (false) {' },
    { nombre: 'un bloque que no es texto se lee', de: ".filter((b) => b?.type === 'text')", a: '' },
    { nombre: 'el envoltorio ```json no se saca', de: ".replace(/^```(?:json)?\\s*/i, '').replace(/\\s*```$/, '')", a: '' },
    { nombre: 'sin el corte del primer { al último }', de: '[t, (t.match(/\\{[\\s\\S]*\\}/) ?? [])[0]]', a: '[t]' },
    { nombre: 'una lista sirve como lectura', de: "v && typeof v === 'object' && !Array.isArray(v) ? v as Fila : null", a: "v && typeof v === 'object' ? v as Fila : null" },
    { nombre: 'sin JSON igual se graba', de: '  if (!crudo) {', a: '  if (false) {' },
    // Grabar
    { nombre: 'p_crudo depurado', de: 'p_crudo: crudo,', a: 'p_crudo: datos,' },
    { nombre: 'p_modelo fijo', de: 'p_modelo: modelo,', a: 'p_modelo: MODELO_POR_DEFECTO,' },
    { nombre: 'p_datos sin depurar', de: '  const datos = depurar(crudo, catalogo)', a: '  const datos = crudo' },
    { nombre: 'el error de guardar no se ve', de: '  if (errorGuardar || !fila) {', a: '  if (false) {' },
    { nombre: 'la respuesta sin la fila', de: 'return json({ ok: true, remito: fila }, 200)', a: 'return json({ ok: true }, 200)' },
    // Depurar
    { nombre: 'un id fuera del catálogo pasa', de: '        if (valido(t)) return t', a: '        return t' },
    { nombre: 'con presentación, el insumo no se borra', de: 'const insumo_id = presentacion_id ? null : id(', a: 'const insumo_id = id(' },
    { nombre: 'cono con presentación sin cono no se marca', de: "      if (pres && marca_id && pres.con_cono !== true) { revisar = true; notas.push('Tiene cono pero la presentación es sin cono.') }\n", a: '' },
    { nombre: 'falta el cono no se marca', de: "      if (pres && !marca_id && pres.con_cono === true) { revisar = true; notas.push('Falta el cono.') }\n", a: '' },
    { nombre: 'una cantidad cero pasa', de: '&& it.cantidad > 0 ? it.cantidad : null', a: '? it.cantidad : null' },
    { nombre: 'sin producto ni cantidad no queda para revisar', de: '(revisar || (!presentacion_id && !insumo_id) || cantidad === null)', a: '(revisar)' },
    { nombre: 'omitir con cualquier cosa', de: 'const omitir = it.omitir === true', a: 'const omitir = Boolean(it.omitir)' },
    { nombre: 'omitir no se manda', de: 'lotes, omitir,\n', a: 'lotes,\n' },
    { nombre: 'un omitido queda para revisar', de: 'revisar: !omitir && (', a: 'revisar: (' },
    { nombre: 'el talonario tal cual vino', de: "talonario: crudo.talonario === 'acopio' ? 'acopio' : 'oficial',", a: "talonario: crudo.talonario ?? 'oficial'," },
    { nombre: 'sin talonario', de: "    talonario: crudo.talonario === 'acopio' ? 'acopio' : 'oficial',\n", a: '' },
    { nombre: 'más de 60 renglones', de: '    .slice(0, RENGLONES_MAXIMO)\n', a: '' },
    { nombre: 'lo que no es renglón pasa', de: ".filter((it: unknown) => it && typeof it === 'object' && !Array.isArray(it))", a: ".filter((it: unknown) => it && typeof it === 'object')" },
    { nombre: 'un cliente de otra fábrica pasa', de: 'cliente_id: cliente && clientes.has(cliente) ? cliente : null,', a: 'cliente_id: cliente,' },
    { nombre: 'la fecha dd/mm/aa no se convierte', de: "  const anio = m[3].length === 2 ? '20' + m[3] : m[3]", a: '  const anio = m[3]' },
    { nombre: 'la fecha con el día y el mes al revés', de: "return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`", a: "return `${anio}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`" },
    { nombre: 'un lote vacío pasa', de: '        .filter((l: Fila) => l.lote !== null)\n', a: '' },
    { nombre: 'las cajas no enteras pasan', de: "cajas: typeof l.cajas === 'number' && Number.isInteger(l.cajas) && l.cajas > 0 ? l.cajas : null", a: "cajas: typeof l.cajas === 'number' ? l.cajas : null" },
    { nombre: 'los textos sin trim', de: '  const t = v.trim()\n  return t', a: '  const t = v\n  return t' },
    // El prompt
    { nombre: 'el prompt sin "nunca inventes"', de: 'NUNCA inventes\n  un id', a: 'no inventes\n  un id' },
    { nombre: 'el prompt sin chocolate solo si lo dice', de: '- Chocolate SOLO si el renglón lo dice. Si no lo dice, el producto común.\n', a: '' },
    { nombre: 'el prompt sin el x3', de: '- El "40" o el "45" sin "x3" es el x4. El x3 solo si dice x3.\n', a: '' },
    { nombre: 'el prompt sin ILUST.', de: '- "ILUST." = el cono es de papel ilustración', a: '- el cono es de papel ilustración' },
    { nombre: 'el prompt sin NUSS es la caja', de: '"NUSS" al lado es la caja, NO un cono.', a: '' },
    { nombre: 'el prompt sin Cap. x80', de: '- "Cap. x80" = Capelina Grande.\n', a: '' },
    { nombre: 'el prompt sin Cono 40x180 RIO', de: '- "Cono 40x180 RIO" = Barquillo 40 x4, presentación "Caja N°2" ×180, cono RIO.\n', a: '' },
    { nombre: 'el prompt sin reposición', de: 'revisar true y nota "reposición"', a: 'revisar true' },
    { nombre: 'el prompt sin pallets', de: '- "N pallets" y "a granel" van a observaciones, no son renglones.\n', a: '' },
    { nombre: 'el prompt sin el acopio de marca', de: '"Acopio MAS" / "Acopio Kiwi"', a: '"Acopio"' },
    { nombre: 'el prompt sin el talonario celeste', de: '- "acopio": un talonario CELESTE genérico', a: '- "acopio": un talonario genérico' },
    { nombre: 'el prompt sin omitir', de: '  · omitir: true si el renglón es mercadería de TERCEROS', a: '  · omitir: true si el renglón es mercadería' },
    { nombre: 'el prompt sin "com"', de: '"Común" (o "com") = sin cono.', a: '"Común" = sin cono.' },
    { nombre: 'el prompt sin la fecha de ejemplo', de: '("27/10/26" → "2026-10-27")', a: '' },
    { nombre: 'el prompt sin el Lelona', de: '"leí Lelona, ¿LEROMA?", ', a: '' },
  ],
})
