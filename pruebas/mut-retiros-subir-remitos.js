// Mutaciones de test-retiros-subir-remitos.js (subir remitos Rosario,
// 27/10/2026): mutan modulos/retiros.html, que la suite recibe por
// ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// carga de ANTES del cambio (BASE = f364914, el pedido del que salió la rama
// ci-prueba/remitos-rosario-subir). Si estuviera verde ahí, no probaría nada
// de lo nuevo. Nunca HEAD: al commitear el cambio, HEAD ya lo tiene.
//
//   node pruebas/mut-retiros-subir-remitos.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-retiros-subir-remitos.js')
const BASE = 'f364914'

// La suite sobre la carga de antes: tiene que dar rojo.
if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/retiros.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-retiros-subir-remitos.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la carga de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/retiros.html'),
  escape: 'esc',
  funciones: ['htmlRemitoSubido', 'htmlMisRemitos', 'htmlFabricaRemitos'],
  equivalentes: [
    { expr: 'esc(d.error)', motivo: 'd.error es uno de dos textos constantes del código ("No se pudieron leer tus remitos subidos…"), nunca de la base' },
  ],
  manuales: [
    // ── Quién ve el botón ──────────────────────────────────────────────
    { nombre: 'el botón sin mirar si carga ahí', de: '      return empresasDeCarga().filter(e => sin.has(e.id))', a: '      return (estado.empresas ?? []).filter(e => sin.has(e.id))' },
    { nombre: 'el botón en todas las fábricas', de: '      return empresasDeCarga().filter(e => sin.has(e.id))', a: '      return empresasDeCarga()' },
    { nombre: 'sin saber, todas sin control', de: "      if (!(sin instanceof Set) || !sin.size) return []\n", a: "      if (!(sin instanceof Set)) return empresasDeCarga()\n" },
    { nombre: 'controla_stock_terminado null cuenta como sin control', de: "filter(u => u?.controla_stock_terminado === false && ids.includes(u.id))", a: "filter(u => u?.controla_stock_terminado !== true && ids.includes(u.id))" },
    { nombre: 'una fábrica donde no carga cuenta', de: "filter(u => u?.controla_stock_terminado === false && ids.includes(u.id))", a: "filter(u => u?.controla_stock_terminado === false)" },
    { nombre: 'no pide controla_stock_terminado de las fábricas donde carga', de: ".select('id, controla_stock_terminado').in('id', ids)", a: ".select('id, controla_stock_terminado')" },
    { nombre: 'si no se puede leer, igual sigue', de: "        const { data, error } = await supabase.from('unidades_negocio').select('id, controla_stock_terminado').in('id', ids)\n        if (error) throw error\n", a: "        const { data, error } = await supabase.from('unidades_negocio').select('id, controla_stock_terminado').in('id', ids)\n" },
    { nombre: 'la entrada en medio de la orden', de: "(id === 'rt-vista-form' && paso === 'cliente')", a: "(id === 'rt-vista-form')" },
    { nombre: 'la entrada sin mirar si puede', de: '      el.hidden = !(enVista && puedeSubirRemitos())', a: '      el.hidden = !enVista' },
    { nombre: 'pintarEncabezado no prende la entrada', de: '      pintarEntradaRemitos(id, paso)\n', a: '' },
    { nombre: 'la flecha de la pantalla de remitos no se ve', de: "        'rt-remitos-volver': id === 'rt-vista-remitos',\n", a: '' },
    { nombre: 'abrir sin mirar si puede', de: "      if (!puedeSubirRemitos()) return\n      mostrarVista('rt-vista-remitos')", a: "      mostrarVista('rt-vista-remitos')" },
    // ── La fábrica ─────────────────────────────────────────────────────
    { nombre: 'con varias, la primera sin preguntar', de: '      if (lista.length === 1) return lista[0]\n', a: '      if (lista.length) return lista[0]\n' },
    { nombre: 'con varias, sin la de la barra', de: '      if (deBarra) return deBarra\n', a: '' },
    { nombre: 'con varias, sin la última', de: '      return lista.find(e => e.id === ultima) ?? null\n    }', a: '      return null\n    }' },
    { nombre: 'se puede elegir una con control', de: '      if (!fabricasRemitos().some(e => e.id === id)) return\n', a: '' },
    { nombre: 'la elegida no se recuerda', de: '      datosRemitos().fabricaId = id\n      guardarPreferencia(CLAVE_REMITOS_FABRICA, id)\n', a: '      datosRemitos().fabricaId = id\n' },
    { nombre: 'sin fábrica igual encola', de: "      if (!fab) { mostrarError('Elegí de qué fábrica son los remitos.'); return 0 }\n", a: '' },
    { nombre: 'sin fábrica la cámara igual se prende', de: "      document.getElementById('rt-remitos-camara').disabled = !fab\n", a: '' },
    // ── La foto ────────────────────────────────────────────────────────
    { nombre: 'la ruta sin la carpeta remitos', de: '      return `${uid}/remitos/${uuid}.jpg`', a: '      return `${uid}/${uuid}.jpg`' },
    { nombre: 'la ruta con el client_uuid', de: "        clientUuid: nuevoUuid(), unidadId, ruta: rutaFotoRemito(uid, nuevoUuid()),", a: "        clientUuid: uid, unidadId, ruta: rutaFotoRemito(uid, nuevoUuid())," },
    { nombre: 'sin achicar las grandes', de: '      const k = Math.min(1, max / Math.max(w, h))', a: '      const k = 1' },
    { nombre: 'agranda las chicas', de: '      const k = Math.min(1, max / Math.max(w, h))', a: '      const k = max / Math.max(w, h)' },
    { nombre: 'achica por el ancho y no por el lado mayor', de: '      const k = Math.min(1, max / Math.max(w, h))', a: '      const k = Math.min(1, max / w)' },
    { nombre: 'el tope en 2000', de: 'const LADO_MAXIMO_FOTO = 1600', a: 'const LADO_MAXIMO_FOTO = 2000' },
    { nombre: 'la calidad en 0,95', de: 'const CALIDAD_FOTO = 0.82', a: 'const CALIDAD_FOTO = 0.95' },
    { nombre: 'en PNG', de: "lienzo.toBlob(res, 'image/jpeg', calidad)", a: "lienzo.toBlob(res, 'image/png', calidad)" },
    { nombre: 'sube la original', de: '          item.blob = await achicarFoto(item.archivo)', a: '          item.blob = item.archivo' },
    { nombre: 'si no se puede achicar, no sube nada', de: "        console.warn('No se pudo achicar la foto, va como vino:', err)\n        return archivo", a: "        console.warn('No se pudo achicar la foto, va como vino:', err)\n        return null" },
    { nombre: 'sube a otro bucket', de: "          const { error } = await supabase.storage.from('comprobantes')", a: "          const { error } = await supabase.storage.from('remitos')" },
    { nombre: 'sube pisando', de: "{ contentType: item.blob.type || 'image/jpeg', upsert: false }", a: "{ contentType: item.blob.type || 'image/jpeg', upsert: true }" },
    { nombre: 'un error de subida pasa de largo', de: '          if (error && !yaEstabaSubida(error)) throw error\n', a: '' },
    { nombre: '"ya existe" es un error', de: '          if (error && !yaEstabaSubida(error)) throw error\n', a: '          if (error) throw error\n' },
    { nombre: 'cualquier error de subida es "ya existe"', de: "      return String(error?.statusCode ?? error?.status ?? '') === '409' || /already exists|duplicate/i.test(String(error?.message ?? ''))", a: '      return true' },
    // ── crear_remito_precarga y el client_uuid ─────────────────────────
    { nombre: 'un client_uuid nuevo en cada intento', de: 'p_foto_path: item.ruta, p_client_uuid: item.clientUuid,', a: 'p_foto_path: item.ruta, p_client_uuid: nuevoUuid(),' },
    { nombre: 'sin client_uuid', de: 'p_foto_path: item.ruta, p_client_uuid: item.clientUuid,', a: 'p_foto_path: item.ruta, p_client_uuid: null,' },
    { nombre: 'otra fábrica', de: 'p_unidad_negocio_id: item.unidadId, p_foto_path', a: 'p_unidad_negocio_id: estado.empresaId, p_foto_path' },
    { nombre: 'un error de crear pasa de largo', de: "          if (error) throw error\n          if (!data) throw new Error('La base no devolvió el remito.')", a: "          if (!data) throw new Error('La base no devolvió el remito.')" },
    { nombre: 'el reintento vuelve a subir', de: "          item.paso = 'crear'\n          guardarColaRemitos()", a: "          item.paso = 'crear'\n          item.paso = 'subir'\n          guardarColaRemitos()" },
    { nombre: 'la cola no se guarda', de: "      try { guardarPreferencia(CLAVE_REMITOS_COLA, lista.length ? JSON.stringify(lista) : null) } catch { /* nada */ }", a: '' },
    { nombre: 'la cola guardada no se vacía', de: "      const lista = d.cola.filter(i => !i.remitoId)\n", a: "      const lista = d.cola\n" },
    { nombre: 'recargada, la subida se da por perdida', de: "          const subida = i.paso === 'crear'\n", a: "          const subida = false\n" },
    { nombre: 'recargada, la perdida se intenta', de: "            paso: subida ? 'crear' : 'perdida',", a: "            paso: subida ? 'crear' : 'subir'," },
    { nombre: 'quitar no quita', de: "      d.cola = d.cola.filter(i => !(i.clientUuid === clave && i.paso === 'perdida'))", a: '' },
    { nombre: 'reintentar una perdida', de: "        if (item.paso === 'perdida') return\n", a: '' },
    { nombre: 'el reintento no limpia el error', de: '        item.error = null\n        pintarRemitos()\n        procesarCola()', a: '        pintarRemitos()\n        procesarCola()' },
    { nombre: 'acepta cualquier archivo', de: "filter(f => f && (!f.type || String(f.type).startsWith('image/')))", a: 'filter(f => f)' },
    { nombre: 'el campo no se vacía', de: "      try { input.value = '' } catch { /* nada */ }\n", a: '' },
    // ── ocr-remito sin esperar ─────────────────────────────────────────
    { nombre: 'la cola espera la lectura', de: '          lanzarLectura(item.remitoId)\n', a: '          await leerRemitoConIa(item.remitoId)\n' },
    { nombre: 'no se pide la lectura', de: '          lanzarLectura(item.remitoId)\n', a: '' },
    { nombre: 'todas las lecturas a la vez', de: '      while (d.leyendo.size < LECTURAS_A_LA_VEZ && d.lecturas.length) {', a: '      while (d.lecturas.length) {' },
    { nombre: 'de a una lectura', de: 'const LECTURAS_A_LA_VEZ = 2', a: 'const LECTURAS_A_LA_VEZ = 1' },
    { nombre: 'la que esperaba no arranca', de: "        leerRemitoConIa(id).finally(() => { d.leyendo.delete(id); seguirLecturas() })", a: "        leerRemitoConIa(id).finally(() => { d.leyendo.delete(id) })" },
    { nombre: 'otra Edge Function', de: "await supabase.functions.invoke('ocr-remito', { body: { remito_id: id } })", a: "await supabase.functions.invoke('ocr-materia-prima', { body: { remito_id: id } })" },
    { nombre: 'sin el id', de: "await supabase.functions.invoke('ocr-remito', { body: { remito_id: id } })", a: "await supabase.functions.invoke('ocr-remito', { body: { id } })" },
    { nombre: 'un error de la función no se ve', de: "        if (error) throw error\n        if (data?.error) throw new Error(String(data.error))\n      } catch (err) {\n        console.error('No se pudo leer el remito:', err)", a: "        if (data?.error) throw new Error(String(data.error))\n      } catch (err) {\n        console.error('No se pudo leer el remito:', err)" },
    { nombre: 'una respuesta con error es lectura buena', de: "        if (data?.error) throw new Error(String(data.error))\n", a: '' },
    { nombre: 'al volver la lectura no se refresca', de: '      d.leyendo.delete(id)\n      await leerMisRemitos()\n', a: '      d.leyendo.delete(id)\n' },
    { nombre: 'reintentar una lectura no la pide', de: '      lanzarLectura(item?.remitoId ?? clave)\n      pintarRemitos()', a: '      pintarRemitos()' },
    { nombre: 'una lectura fallida no se olvida al reintentar', de: '      d.lecturaFallida.delete(remitoId)\n', a: '' },
    // ── Mis remitos subidos ────────────────────────────────────────────
    { nombre: 'los remitos de todos', de: ".eq('subido_por', estado.miEmpleadoId).gte('subido_en', desde)", a: ".gte('subido_en', desde)" },
    { nombre: 'sin el tope de días', de: ".eq('subido_por', estado.miEmpleadoId).gte('subido_en', desde)", a: ".eq('subido_por', estado.miEmpleadoId)" },
    { nombre: '30 días', de: 'const DIAS_MIS_REMITOS = 7', a: 'const DIAS_MIS_REMITOS = 30' },
    { nombre: 'sin el talonario', de: 'numero_remito, talonario, error', a: 'numero_remito, error' },
    { nombre: 'el embed sin nombrar la FK', de: 'orden:ordenes_retiro!remitos_precarga_orden_id_fkey(codigo)', a: 'orden:ordenes_retiro(codigo)' },
    { nombre: 'más viejo primero', de: ".sort((a, b) => String(b.subido_en ?? '').localeCompare(String(a.subido_en ?? '')))", a: ".sort((a, b) => String(a.subido_en ?? '').localeCompare(String(b.subido_en ?? '')))" },
    { nombre: 'lo que ya está en la base sigue en la cola', de: '        d.cola = d.cola.filter(i => !(i.remitoId && enBase.has(i.remitoId)))\n', a: '' },
    { nombre: 'un error de lectura de la lista pasa de largo', de: "          .order('subido_en', { ascending: false }).limit(60)\n        if (error) throw error\n", a: "          .order('subido_en', { ascending: false }).limit(60)\n" },
    { nombre: 'sin miniaturas', de: '        pedirMiniaturas(filas)\n', a: '' },
    { nombre: 'la miniatura se pide cada vez', de: "      const faltan = filas.map(f => f.foto_path).filter(p => p && !d.miniaturas.has(p))", a: "      const faltan = filas.map(f => f.foto_path).filter(p => p)" },
    { nombre: 'la miniatura por un minuto', de: 'const SEGUNDOS_MINIATURA = 3600', a: 'const SEGUNDOS_MINIATURA = 60' },
    { nombre: 'el src no se pone', de: '        if (u) img.src = u\n', a: '' },
    { nombre: 'cualquier link es miniatura', de: "      return /^(https:\\/\\/|blob:)/i.test(s) ? s : null", a: '      return s || null' },
    { nombre: 'la miniatura en el HTML', de: '`<img class="rt-remito__foto" data-remito-miniatura="${esc(x.clave)}" alt="Foto del remito">`', a: '`<img class="rt-remito__foto" data-remito-miniatura="${esc(x.clave)}" src="${esc(x.miniatura)}" alt="Foto del remito">`' },
    { nombre: 'la hora sin la zona de Argentina', de: "        timeZone: ZONA_AR, day: '2-digit'", a: "        timeZone: 'UTC', day: '2-digit'" },
    // ── Los estados ────────────────────────────────────────────────────
    { nombre: 'leyendo: no muestra que se está releyendo', de: "      if (pidiendo && ['leyendo', 'error'].includes(f.estado)) return { tipo: 'leyendo', texto: 'Leyendo…', detalle: '' }\n", a: '' },
    { nombre: 'pidiendo la lectura tapa el resultado de la base', de: "      if (pidiendo && ['leyendo', 'error'].includes(f.estado)) return", a: '      if (pidiendo) return' },
    { nombre: 'precargado sin el N°', de: "detalle: n ? n.texto : 'Sin número leído · lo revisa Administración'", a: "detalle: 'Sin número leído · lo revisa Administración'" },
    { nombre: 'el N° sin "Remito N°"', de: '      return n ? { texto: `Remito N° ${n}`, acopio:', a: '      return n ? { texto: n, acopio:' },
    { nombre: 'el sello para cualquier talonario', de: "acopio: f?.talonario === 'acopio' } : null", a: "acopio: !!f?.talonario } : null" },
    { nombre: 'el sello nunca', de: "acopio: f?.talonario === 'acopio' } : null", a: 'acopio: false } : null' },
    { nombre: 'precargado sin sello', de: "'Sin número leído · lo revisa Administración', acopio: !!n?.acopio }", a: "'Sin número leído · lo revisa Administración' }" },
    { nombre: 'confirmado sin sello', de: "detalle: n ? n.texto : '', acopio: !!n?.acopio }", a: "detalle: n ? n.texto : '' }" },
    { nombre: 'el sello no se dibuja', de: "      const selloAcopio = e.acopio ? '<span class=\"rt-remito__sello\">Acopio</span>' : ''", a: "      const selloAcopio = ''" },
    { nombre: 'confirmado sin el código', de: '      const codigo = limpio(f.orden?.codigo)', a: "      const codigo = ''" },
    { nombre: 'descartado sin el motivo', de: "texto: `Descartado: ${limpio(f.descartado_motivo) || 'sin motivo'}`", a: "texto: 'Descartado'" },
    { nombre: 'error sin Reintentar', de: "          return { tipo: 'error', texto: 'No se pudo leer', detalle: limpio(f.error), reintentar: true }", a: "          return { tipo: 'error', texto: 'No se pudo leer', detalle: limpio(f.error) }" },
    { nombre: 'error sin el motivo', de: "          return { tipo: 'error', texto: 'No se pudo leer', detalle: limpio(f.error), reintentar: true }", a: "          return { tipo: 'error', texto: 'No se pudo leer', detalle: '', reintentar: true }" },
    { nombre: 'la lectura fallida sigue "Leyendo…"', de: "          if (fallo) return { tipo: 'error', texto: 'No se pudo leer', detalle: fallo, reintentar: true }\n", a: '' },
    { nombre: 'un "Leyendo…" trabado sin Reintentar', de: "detalle: trabado ? 'Tarda más de lo normal' : '', reintentar: trabado }", a: "detalle: trabado ? 'Tarda más de lo normal' : '' }" },
    { nombre: 'trabado enseguida', de: 'const LECTURA_TRABADA_MS = 3 * 60 * 1000', a: 'const LECTURA_TRABADA_MS = 0' },
    { nombre: 'no registrada sin Reintentar', de: "texto: i.paso === 'crear' ? 'No se pudo registrar' : 'No se pudo subir', detalle: i.error, reintentar: true }", a: "texto: i.paso === 'crear' ? 'No se pudo registrar' : 'No se pudo subir', detalle: i.error }" },
    { nombre: 'perdida sin Quitar', de: "detalle: i.error || TEXTO_FOTO_PERDIDA, quitar: true }", a: 'detalle: i.error || TEXTO_FOTO_PERDIDA }' },
    { nombre: 'registrada se ve "Subiendo…"', de: "      if (i.remitoId) return estadoRemitoSubido({ id: i.remitoId, estado: 'leyendo', subido_en: i.creadoEn }, d)\n", a: '' },
    { nombre: 'el botón Reintentar no se dibuja', de: "(e.reintentar ? `<button type=\"button\" class=\"rt-btn rt-btn--secundario rt-remito__accion\" data-remito-reintentar=\"${esc(x.reintentarCon)}\">Reintentar</button>` : '')", a: "''" },
    { nombre: 'sin la lista de la cola', de: '      return [...enCola, ...deBase]', a: '      return deBase' },
    { nombre: 'la cola abajo', de: '      return [...enCola, ...deBase]', a: '      return [...deBase, ...enCola]' },
    { nombre: 'sin el error de la lista', de: "        if (d.error) return `<p class=\"rt-aviso rt-aviso--grave\">${esc(d.error)}</p>`\n", a: '' },
    // ── El sondeo ──────────────────────────────────────────────────────
    { nombre: 'sin sondeo', de: '      if (d.sondeo || estado.vista !== \'rt-vista-remitos\' || !hayRemitosLeyendo(d)) return', a: '      return' },
    { nombre: 'sondeo aunque no haya nada leyéndose', de: '      if (d.sondeo || estado.vista !== \'rt-vista-remitos\' || !hayRemitosLeyendo(d)) return', a: "      if (d.sondeo || estado.vista !== 'rt-vista-remitos') return" },
    { nombre: 'el sondeo lee fuera de la pantalla', de: "        d.sondeo = null\n        if (estado.vista !== 'rt-vista-remitos') return\n", a: '        d.sondeo = null\n' },
    { nombre: 'sondeo cada minuto', de: 'const SONDEO_REMITOS_MS = 6000', a: 'const SONDEO_REMITOS_MS = 60000' },
    { nombre: 'leyendo no cuenta para el sondeo', de: "        (d.filas ?? []).some(f => f.estado === 'leyendo' && !d.lecturaFallida.has(f.id))", a: '        false' },
    // ── La página ──────────────────────────────────────────────────────
    { nombre: 'la cámara sin capture', de: 'accept="image/*" capture="environment">', a: 'accept="image/*">' },
    { nombre: 'la galería de a una', de: 'class="rt-sr" accept="image/*" multiple>', a: 'class="rt-sr" accept="image/*">' },
    { nombre: 'al arrancar no se lee qué fábricas', de: '      leerFabricasSinControl().then(() => { if (estado.vista) pintarEncabezado() })\n', a: '' },
  ],
})
