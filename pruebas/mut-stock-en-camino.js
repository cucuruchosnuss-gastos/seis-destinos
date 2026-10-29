// Mutaciones de test-stock-en-camino.js ("En camino desde otra empresa" en
// Stock, 29/10/2026) y de la parte de init() que prueba
// test-permisos-pantallas-stock.js (entrar a Stock solo para recibir). De a
// una. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, test-stock-en-camino.js tiene que dar ROJO
// sobre el Stock de ANTES del cambio (BASE = 497c393, el main del que salió la
// rama ci-prueba/recibir-stock). Nunca HEAD.
//
//   node pruebas/mut-stock-en-camino.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-stock-en-camino.js')
const BASE = '497c393'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/stock.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-stock-en-camino.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre el Stock de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

const STOCK = path.join(RAIZ, 'modulos', 'stock.html')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: STOCK,
    escape: 'esc',
    funciones: ['htmlEnCamino', 'htmlEnvioCamino', 'htmlRenglonCamino', 'htmlRenglonRecibir', 'htmlRecibidosCamino', 'htmlRecibidoCamino'],
    equivalentes: [
      { expr: 'esc(n)', motivo: 'un número: c.enTransito.length' },
      { expr: 'esc(DIAS_RECIBIDOS_CAMINO)', motivo: 'constante numérica del código (30)' },
      { expr: 'esc(lista.length)', motivo: 'un número: el largo de la lista' },
      { expr: 'esc(fechaCamino(e.fecha))', motivo: 'fechaCamino() solo devuelve dd/mm/aaaa (valida el formato AAAA-MM-DD antes) o vacío' },
      { expr: 'esc(momentoCamino(r.recibida_en))', motivo: 'momentoCamino() arma dd/mm/aaaa hh:mm con las partes numéricas de Intl, o vacío' },
    ],
    manuales: [
      // ── La pantalla ──────────────────────────────────────────────────────
      { nombre: 'la sección visible de entrada', de: 'aria-label="En camino desde otra empresa" hidden></section>', a: 'aria-label="En camino desde otra empresa"></section>' },
      { nombre: 'la sección con otro id', de: '<section class="st-camino" id="st-en-camino"', a: '<section class="st-camino" id="st-en-camino-x"' },
      { nombre: 'los toques no llegan', de: "    document.getElementById('st-en-camino').addEventListener('click', alTocarEnCamino)\n", a: '' },
      { nombre: 'lo escrito no llega', de: "    document.getElementById('st-en-camino').addEventListener('input', alEscribirEnCamino)\n", a: '' },
      { nombre: 'init no la lee', de: '      // barra, así que también con la barra ya leída. No frena lo que sigue.\n      cargarEnCamino()\n', a: '      // barra, así que también con la barra ya leída. No frena lo que sigue.\n' },
      { nombre: 'con solo producto terminado no se lee', de: '        estado.barraLista.then(cargarEnCamino)\n', a: '' },
      { nombre: 'la barra no la relee', de: "        if (!estado.enCamino.form?.enviando) estado.enCamino.form = null\n        cargarEnCamino()\n", a: "        if (!estado.enCamino.form?.enviando) estado.enCamino.form = null\n" },
      { nombre: 'la barra no cierra el envío a medio recibir', de: "        if (!estado.enCamino.form?.enviando) estado.enCamino.form = null\n", a: '' },
      { nombre: 'no se actualiza sola', de: '      if (estado.enCamino?.leido) tareas.push(cargarEnCamino())\n', a: '' },
      { nombre: 'se ve también en el recuento', de: '#vista-catalogo:not([hidden]), #vista-recuento:not([hidden]), #vista-alias', a: '#vista-catalogo:not([hidden]), #vista-alias' },
      { nombre: 'la tarjeta abierta no ocupa todo el ancho', de: '    .st-camino__envio--abierto { grid-column: 1 / -1; }', a: '    .st-camino__envio--abierto { grid-column: auto; }' },
      // ── Quién la ve ──────────────────────────────────────────────────────
      { nombre: 'en la barra, sin stock:ver', de: "      if (u) return puedeTareaEn('stock:ver', u) || puedeTareaEn('stock:recibir_transferencia', u)", a: "      if (u) return puedeTareaEn('stock:recibir_transferencia', u)" },
      { nombre: 'en la barra, sin recibir', de: "      if (u) return puedeTareaEn('stock:ver', u) || puedeTareaEn('stock:recibir_transferencia', u)", a: "      if (u) return puedeTareaEn('stock:ver', u)" },
      { nombre: 'en la barra, cualquiera', de: "      if (u) return puedeTareaEn('stock:ver', u) || puedeTareaEn('stock:recibir_transferencia', u)", a: '      if (u) return true' },
      { nombre: 'con "Todas", cualquiera', de: "      return estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:ver') || estado.misTareas.has('stock:recibir_transferencia')\n    }\n\n    // \"Recibir\"", a: "      return true\n    }\n\n    // \"Recibir\"" },
      { nombre: 'con "Todas", sin recibir', de: "      return estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:ver') || estado.misTareas.has('stock:recibir_transferencia')\n    }\n\n    // \"Recibir\"", a: "      return estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:ver')\n    }\n\n    // \"Recibir\"" },
      { nombre: '"Recibir" con stock:ver', de: "      return puedeTareaEn('stock:recibir_transferencia', envio?.destino_id)", a: "      return puedeTareaEn('stock:ver', envio?.destino_id)" },
      { nombre: '"Recibir" en la fábrica de la barra y no en la que recibe', de: "      return puedeTareaEn('stock:recibir_transferencia', envio?.destino_id)", a: "      return puedeTareaEn('stock:recibir_transferencia', estado.unidadBarra)" },
      { nombre: 'entrar solo a recibir sin la tarea', de: "      return estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:recibir_transferencia')\n    }\n\n    function numeroCamino", a: "      return true\n    }\n\n    function numeroCamino" },
      { nombre: 'sin permiso igual consulta', de: '      const c = camino()\n      if (!puedeVerEnCamino()) {\n        turnoCamino++', a: '      const c = camino()\n      if (false) {\n        turnoCamino++' },
      // ── Qué se lee ───────────────────────────────────────────────────────
      { nombre: 'en camino sin el estado', de: "supabase.rpc('recepciones_grupo', { p_unidad_negocio_id: unidad, p_estado: 'en_transito' })", a: "supabase.rpc('recepciones_grupo', { p_unidad_negocio_id: unidad })" },
      { nombre: 'recibidos con otro estado', de: "supabase.rpc('recepciones_grupo', { p_unidad_negocio_id: unidad, p_estado: 'recibida' })", a: "supabase.rpc('recepciones_grupo', { p_unidad_negocio_id: unidad, p_estado: null })" },
      { nombre: 'sin la fábrica de la barra', de: '      const unidad = estado.unidadBarra || null\n', a: '      const unidad = null\n' },
      { nombre: 'una respuesta vieja pisa la nueva', de: '      if (turno !== turnoCamino || c.form) return true', a: '      if (c.form) return true' },
      { nombre: 'a medio recibir, relee igual', de: '      if (c.form) return true\n      const turno = ++turnoCamino', a: '      const turno = ++turnoCamino' },
      { nombre: 'el error de la base no se dice', de: "        c.error = error.message || 'Revisá la conexión y probá de nuevo.'", a: "        c.error = 'Revisá la conexión y probá de nuevo.'" },
      { nombre: 'el error al leer devuelve que pudo', de: "        pintarEnCamino()\n        return false\n", a: "        pintarEnCamino()\n        return true\n" },
      { nombre: 'la fábrica de pruebas como destino', de: 'sinUnidadesDePrueba(sinUnidadesDePrueba(lista, estado.fabrica, r => r?.destino_id), estado.fabrica, r => r?.origen_id)', a: 'sinUnidadesDePrueba(lista, estado.fabrica, r => r?.origen_id)' },
      { nombre: 'la fábrica de pruebas como origen', de: 'sinUnidadesDePrueba(sinUnidadesDePrueba(lista, estado.fabrica, r => r?.destino_id), estado.fabrica, r => r?.origen_id)', a: 'sinUnidadesDePrueba(lista, estado.fabrica, r => r?.destino_id)' },
      { nombre: 'sin mirar la barra', de: '      return sinPrueba.filter(r => pasaFiltroUnidad(r.destino_id, estado.unidadBarra))', a: '      return sinPrueba' },
      { nombre: 'la barra por el origen', de: '      return sinPrueba.filter(r => pasaFiltroUnidad(r.destino_id, estado.unidadBarra))', a: '      return sinPrueba.filter(r => pasaFiltroUnidad(r.origen_id, estado.unidadBarra))' },
      // ── Recibidos ────────────────────────────────────────────────────────
      { nombre: 'recibidos de cualquier fecha', de: '      c.recibidos = recibidosRecientes(enviosDeLaBarra(res[1]?.data))', a: '      c.recibidos = enviosDeLaBarra(res[1]?.data)' },
      { nombre: 'recibidos: sin el corte de los 30 días', de: '.filter(r => { const t = Date.parse(r?.recibida_en ?? \'\'); return Number.isFinite(t) && t >= desde })', a: '.filter(r => { const t = Date.parse(r?.recibida_en ?? \'\'); return Number.isFinite(t) })' },
      { nombre: 'recibidos: también los sin fecha', de: '.filter(r => { const t = Date.parse(r?.recibida_en ?? \'\'); return Number.isFinite(t) && t >= desde })', a: '.filter(r => { const t = Date.parse(r?.recibida_en ?? \'\'); return !(t < desde) })' },
      { nombre: 'recibidos: 31 días', de: '    const DIAS_RECIBIDOS_CAMINO = 30\n', a: '    const DIAS_RECIBIDOS_CAMINO = 31\n' },
      { nombre: 'recibidos: los días mal contados', de: '      const desde = ahora - DIAS_RECIBIDOS_CAMINO * 24 * 60 * 60 * 1000', a: '      const desde = ahora - DIAS_RECIBIDOS_CAMINO * 24 * 60 * 1000' },
      { nombre: 'recibidos: el más viejo primero', de: '        .sort((x, y) => Date.parse(y.recibida_en) - Date.parse(x.recibida_en))', a: '        .sort((x, y) => Date.parse(x.recibida_en) - Date.parse(y.recibida_en))' },
      { nombre: 'recibidos: la hora del celular y no la de Argentina', de: "        timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric',\n        hour: '2-digit'", a: "        timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',\n        hour: '2-digit'" },
      { nombre: 'recibidos: una fecha rara se muestra', de: "      if (Number.isNaN(d.getTime())) return ''\n      const p = {}", a: "      const p = {}" },
      { nombre: 'recibidos: siempre desplegado', de: "        (abierto ? '<ul class=\"st-camino__hechos\">'", a: "        (true ? '<ul class=\"st-camino__hechos\">'" },
      { nombre: 'recibidos: plegar no vuelve a plegar', de: '        c.recibidosAbierto = !c.recibidosAbierto', a: '        c.recibidosAbierto = true' },
      { nombre: 'recibidos: sin quién', de: "Recibió ${esc(r.recibida_por || 'alguien')} el", a: 'Recibió el' },
      { nombre: 'recibidos: lista también lo que llegó igual', de: '        return env !== null && rec !== null && Math.abs(env - rec) > 1e-9\n      })', a: '        return env !== null && rec !== null\n      })' },
      { nombre: 'recibidos: sin el motivo', de: "recibido ${esc(textoCantidadCamino(it.cantidad_recibida, it))}${it.motivo_diferencia ? ` — ${esc(it.motivo_diferencia)}` : ''}", a: 'recibido ${esc(textoCantidadCamino(it.cantidad_recibida, it))}' },
      { nombre: 'recibidos: no dice que llegó todo', de: "          : '<div class=\"st-camino__sin-difs\">Llegó todo lo que se mandó.</div>') +", a: "          : '') +" },
      // ── La sección y la tarjeta ──────────────────────────────────────────
      { nombre: 'sin nada, igual ocupa lugar', de: '      const hayAlgo = c.enTransito.length > 0 || c.recibidos.length > 0 || !!c.error || c.soloEsto', a: '      const hayAlgo = true' },
      { nombre: 'entrando solo a recibir, sin nada no lo dice', de: '      const hayAlgo = c.enTransito.length > 0 || c.recibidos.length > 0 || !!c.error || c.soloEsto', a: '      const hayAlgo = c.enTransito.length > 0 || c.recibidos.length > 0 || !!c.error' },
      { nombre: 'sin el texto de "no hay nada"', de: "      if (!n && c.soloEsto && !c.error) html += '<p class=\"st-camino__vacio\">No hay nada en camino desde otra empresa.</p>'\n", a: '' },
      { nombre: 'con un error al leer no se ve', de: '|| c.recibidos.length > 0 || !!c.error || c.soloEsto', a: '|| c.recibidos.length > 0 || c.soloEsto' },
      { nombre: 'sin el aviso del error', de: '      if (c.error) html += `<p class="rec-aviso" role="alert">', a: '      if (false) html += `<p class="rec-aviso" role="alert">' },
      { nombre: 'siempre dice a qué fábrica va', de: '.map(e => e.destino_id)).size > 1', a: '.map(e => e.destino_id)).size > 0' },
      { nombre: 'nunca dice a qué fábrica va', de: '.map(e => e.destino_id)).size > 1', a: '.map(e => e.destino_id)).size > 99' },
      { nombre: 'sin el título', de: "      if (n) html += `<h2 class=\"st-camino__titulo\">En camino desde otra empresa", a: "      if (n) html += `<h2 class=\"st-camino__titulo\">En camino" },
      { nombre: 'la tarjeta sin el remito', de: "        (e.numero_remito ? `<span class=\"st-camino__remito\">Remito ${esc(e.numero_remito)}</span>` : '') +", a: '' },
      { nombre: 'la tarjeta sin la fecha', de: '        `<span class="st-camino__fecha">${esc(fechaCamino(e.fecha))}</span></div>` +', a: "        '</div>' +" },
      { nombre: 'la tarjeta: desde el destino', de: "`<div class=\"st-camino__desde\">Desde ${esc(e.origen || 'otra empresa')}", a: "`<div class=\"st-camino__desde\">Desde ${esc(e.destino || 'otra empresa')}" },
      { nombre: 'la tarjeta sin el transporte', de: "${e.transporte ? ` · ${esc(e.transporte)}` : ''}", a: '' },
      { nombre: 'la tarjeta sin las observaciones', de: "        (e.observaciones ? `<div class=\"st-camino__obs\">${esc(e.observaciones)}</div>` : '')\n", a: "        ''\n" },
      { nombre: '"Recibir" para cualquiera', de: '        if (puedeRecibirEnCamino(e)) html += `<div class="st-camino__pie">', a: '        if (true) html += `<div class="st-camino__pie">' },
      { nombre: 'la tarjeta abierta sin su clase', de: "${abierto ? ' st-camino__envio--abierto' : ''}", a: '' },
      { nombre: 'el renglón sin el lote', de: "        `<span class=\"st-camino__desc\">${esc(it.descripcion || 'Sin descripción')}${it.lote ? `<span class=\"st-camino__lote\"> · Lote ${esc(it.lote)}</span>` : ''}</span>` +\n        `<span class=\"st-camino__cant\">", a: "        `<span class=\"st-camino__desc\">${esc(it.descripcion || 'Sin descripción')}</span>` +\n        `<span class=\"st-camino__cant\">" },
      { nombre: '"1 cajas"', de: "${n === 1 ? 'caja' : 'cajas'}", a: 'cajas' },
      { nombre: 'las cajas con decimales', de: '      if (esCajaCamino(it)) return `${formatearNumeroAr(n, { decimales: 0 })}', a: '      if (esCajaCamino(it)) return `${formatearNumeroAr(n, { decimales: 2, minimos: 2 })}' },
      { nombre: 'un dato ausente es 0', de: "      if (v == null || v === '') return null\n", a: '' },
      { nombre: 'una fecha rara se inventa', de: "      return typeof f === 'string' && /^\\d{4}-\\d{2}-\\d{2}/.test(f) ? formatearFecha(f.slice(0, 10)) : ''", a: "      return typeof f === 'string' ? formatearFecha(f.slice(0, 10)) : ''" },
      // ── El formulario ────────────────────────────────────────────────────
      { nombre: 'abrir sin mirar el permiso', de: '      if (!e || !puedeRecibirEnCamino(e)) return\n', a: '      if (!e) return\n' },
      { nombre: 'abrir mientras manda reinicia', de: '      if (c.form?.enviando) return\n      const e = c.enTransito.find(x => x.id === id)', a: '      const e = c.enTransito.find(x => x.id === id)' },
      { nombre: 'sin precargar lo enviado', de: '{ recibido: numeroCamino(it.cantidad_enviada), motivo: \'\' }', a: "{ recibido: null, motivo: '' }" },
      { nombre: 'las cajas con decimales en el campo', de: '        enlazarCampoNumero(el, { decimales: decimalesCamino(it) })', a: '        enlazarCampoNumero(el, { decimales: DECIMALES_CANTIDAD })' },
      { nombre: 'el insumo sin decimales en el campo', de: '      return esCajaCamino(it) ? 0 : DECIMALES_CANTIDAD', a: '      return 0' },
      { nombre: 'el campo no se precarga', de: '        ponerCantidadEnCampo(el, c.form.renglones[it.item_id]?.recibido ?? null)\n', a: '' },
      { nombre: 'repintar pierde el motivo', de: "      for (const el of caja.querySelectorAll('[data-camino-motivo]')) el.value = c.form.renglones[el.dataset.caminoMotivo]?.motivo ?? ''\n", a: '' },
      { nombre: 'repintar pierde las observaciones', de: '      if (obs) obs.value = c.form.obs\n', a: '' },
      { nombre: 'el motivo siempre a la vista', de: '        el.hidden = !(it && difiereCamino(it, f.renglones[it.item_id]))', a: '        el.hidden = false' },
      { nombre: 'el motivo nunca a la vista', de: '        el.hidden = !(it && difiereCamino(it, f.renglones[it.item_id]))', a: '        el.hidden = true' },
      { nombre: 'un campo vacío pide motivo', de: '      return rec !== null && env !== null && Math.abs(rec - env) > 1e-9', a: '      return Math.abs(rec - env) > 1e-9' },
      { nombre: 'la marca de la cantidad en el motivo', de: "el.classList.toggle('st-camino__input--error', f.marcas.get(el.dataset.caminoRecibido) === 'cantidad')", a: "el.classList.toggle('st-camino__input--error', f.marcas.get(el.dataset.caminoRecibido) === 'motivo')" },
      { nombre: 'sin marcar el motivo', de: "el.classList.toggle('st-camino__input--error', f.marcas.get(el.dataset.caminoMotivo) === 'motivo')", a: "el.classList.toggle('st-camino__input--error', false)" },
      { nombre: 'el error no se escribe', de: "      if (err) { err.textContent = f.error || ''; err.hidden = !f.error }", a: '      if (err) { err.hidden = !f.error }' },
      { nombre: 'el error no se ve', de: "      if (err) { err.textContent = f.error || ''; err.hidden = !f.error }", a: "      if (err) { err.textContent = f.error || '' }" },
      { nombre: 'el botón no se traba mientras manda', de: "      if (btn) { btn.disabled = !!f.enviando; btn.textContent", a: '      if (btn) { btn.disabled = false; btn.textContent' },
      { nombre: 'el botón no dice "Recibiendo…"', de: "btn.textContent = f.enviando ? 'Recibiendo…' : 'Confirmar recepción' }", a: "btn.textContent = 'Confirmar recepción' }" },
      { nombre: 'Cancelar no se traba mientras manda', de: '      if (cancelar) cancelar.disabled = !!f.enviando\n', a: '' },
      { nombre: 'Cancelar mientras manda cierra', de: '      if (!c.form || c.form.enviando) return\n      c.form = null\n      pintarEnCamino()', a: '      if (!c.form) return\n      c.form = null\n      pintarEnCamino()' },
      { nombre: 'Cancelar no cierra', de: '      if (!c.form || c.form.enviando) return\n      c.form = null\n      pintarEnCamino()', a: '      if (!c.form || c.form.enviando) return\n      pintarEnCamino()' },
      { nombre: 'escribir no anota lo recibido', de: '        r.recibido = leerCampoNumero(t)\n', a: '' },
      { nombre: 'escribir la cantidad no saca la marca', de: '        r.recibido = leerCampoNumero(t)\n        f.marcas.delete(t.dataset.caminoRecibido)\n', a: '        r.recibido = leerCampoNumero(t)\n' },
      { nombre: 'escribir la cantidad no saca el error', de: "        f.marcas.delete(t.dataset.caminoRecibido)\n        f.error = ''\n", a: '        f.marcas.delete(t.dataset.caminoRecibido)\n' },
      { nombre: 'escribir el motivo no lo anota', de: '        r.motivo = t.value\n', a: '' },
      { nombre: 'escribir el motivo no saca la marca', de: '        r.motivo = t.value\n        f.marcas.delete(t.dataset.caminoMotivo)\n', a: '        r.motivo = t.value\n' },
      { nombre: 'las observaciones no se anotan', de: '        f.obs = t.value\n', a: '' },
      { nombre: 'escribir mientras manda cambia lo mandado', de: '      if (!f || !t?.dataset || f.enviando) return', a: '      if (!f || !t?.dataset) return' },
      // ── Confirmar ────────────────────────────────────────────────────────
      { nombre: 'doble toque manda dos veces', de: '      if (!f || !e || f.enviando) return\n      const items = itemsDeEnvioCamino(e)', a: '      if (!f || !e) return\n      const items = itemsDeEnvioCamino(e)' },
      { nombre: 'sin pedir la cantidad', de: "        if (rec === null || rec < 0) f.marcas.set(String(it.item_id), 'cantidad')\n        else if", a: '        if (false) f.marcas.set(String(it.item_id), \'cantidad\')\n        else if' },
      { nombre: 'sin pedir el motivo', de: "        else if (difiereCamino(it, r) && !String(r?.motivo ?? '').trim()) f.marcas.set(String(it.item_id), 'motivo')", a: '        else if (false) f.marcas.set(String(it.item_id), \'motivo\')' },
      { nombre: 'un motivo de espacios vale', de: "        else if (difiereCamino(it, r) && !String(r?.motivo ?? '').trim()) f.marcas.set", a: "        else if (difiereCamino(it, r) && !String(r?.motivo ?? '')) f.marcas.set" },
      { nombre: 'los dos textos cruzados', de: '        f.error = marcas.includes(\'cantidad\') ? TEXTO_FALTA_CANTIDAD_CAMINO : TEXTO_FALTA_MOTIVO_CAMINO', a: '        f.error = marcas.includes(\'cantidad\') ? TEXTO_FALTA_MOTIVO_CAMINO : TEXTO_FALTA_CANTIDAD_CAMINO' },
      { nombre: 'falta algo y manda igual', de: '        pintarFormCamino()\n        return\n      }\n      f.enviando = true', a: '        pintarFormCamino()\n      }\n      f.enviando = true' },
      { nombre: 'el texto del motivo distinto del de la base', de: "    const TEXTO_FALTA_MOTIVO_CAMINO = 'Hay una diferencia sin explicar: poné el motivo.'", a: "    const TEXTO_FALTA_MOTIVO_CAMINO = 'Falta el motivo.'" },
      { nombre: 'sin las observaciones', de: "          p_observaciones: String(f.obs ?? '').trim() || null,", a: '          p_observaciones: null,' },
      { nombre: 'el motivo aunque no difiera', de: "        const motivo = difiereCamino(it, r) ? String(r.motivo ?? '').trim() : ''", a: "        const motivo = String(r.motivo ?? '').trim()" },
      { nombre: 'el motivo con los espacios', de: "        const motivo = difiereCamino(it, r) ? String(r.motivo ?? '').trim() : ''", a: "        const motivo = difiereCamino(it, r) ? String(r.motivo ?? '') : ''" },
      { nombre: 'motivo vacío en vez de null', de: '        return { item_id: it.item_id, cantidad_recibida: numeroCamino(r.recibido), motivo_diferencia: motivo || null }', a: '        return { item_id: it.item_id, cantidad_recibida: numeroCamino(r.recibido), motivo_diferencia: motivo }' },
      { nombre: 'solo los renglones con diferencia', de: '      return itemsDeEnvioCamino(e).map(it => {\n        const r = f.renglones[it.item_id] ?? {}', a: '      return itemsDeEnvioCamino(e).filter(it => difiereCamino(it, f.renglones[it.item_id])).map(it => {\n        const r = f.renglones[it.item_id] ?? {}' },
      { nombre: 'con error queda trabado', de: '        f.enviando = false\n        f.error = res.error.message', a: '        f.error = res.error.message' },
      { nombre: 'el error de la base no se dice tal cual', de: "        f.error = res.error.message || 'No se pudo confirmar la recepción. Revisá la conexión y probá de nuevo.'", a: "        f.error = 'No se pudo confirmar la recepción. Revisá la conexión y probá de nuevo.'" },
      { nombre: 'con error avisa éxito igual', de: '        pintarFormCamino()\n        return\n      }\n      const codigo', a: '        pintarFormCamino()\n      }\n      const codigo' },
      { nombre: 'al terminar no cierra', de: '      const codigo = res?.data?.codigo || e.codigo\n      c.form = null\n', a: '      const codigo = res?.data?.codigo || e.codigo\n' },
      { nombre: 'al terminar el envío sigue en la lista', de: '      c.enTransito = c.enTransito.filter(x => x.id !== e.id)\n', a: '' },
      { nombre: 'otro aviso', de: '      mostrarExito(`Orden ${codigo} recibida: entró al stock.`)', a: '      mostrarExito(`Recibida.`)' },
      { nombre: 'no relee la sección', de: '        cargarEnCamino(),\n        estado.cargados.has', a: '        estado.cargados.has' },
      { nombre: 'relee el stock aunque no se lo mire', de: "        estado.cargados.has('stock') ? cargarStock({ silencioso: true }) : null,", a: '        cargarStock({ silencioso: true }),' },
      { nombre: 'no relee el stock', de: "        estado.cargados.has('stock') ? cargarStock({ silencioso: true }) : null,", a: '        null,' },
      { nombre: 'no relee el terminado', de: '        estado.ptm?.leido ? cargarTerminado({ silencioso: true }) : null,', a: '        null,' },
      { nombre: 'no relee las burbujas', de: '        cargarPendientesStock(),\n      ])', a: '      ])' },
      { nombre: 'Confirmar no llega', de: "      if (t.closest('[data-camino-confirmar]')) { confirmarRecepcion(); return }", a: '' },
      { nombre: 'Cancelar no llega', de: "      if (t.closest('[data-camino-cancelar]')) { cancelarRecepcion(); return }", a: '' },
      // ── El link del tablero ──────────────────────────────────────────────
      { nombre: '#st-en-camino no lleva', de: "        if (window.location.hash === '#st-en-camino') return true", a: '' },
      { nombre: '?seccion=en-camino no lleva', de: "        return new URLSearchParams(window.location.search).get('seccion') === 'en-camino'", a: '        return false' },
      { nombre: 'lleva a cada repintado', de: '      caminoYaMostrado = true\n', a: '' },
      { nombre: 'lleva aunque no haya nada', de: '      if (!c.leido || !puedeVerEnCamino() || !hayAlgo) {\n        caja.hidden = true\n        caja.innerHTML = \'\'\n        return\n      }', a: '      if (!c.leido || !puedeVerEnCamino() || !hayAlgo) {\n        caja.hidden = true\n        caja.innerHTML = \'\'\n        irAEnCaminoSiSePidio()\n        return\n      }' },
    ],
  },
  {
    // Entrar a Stock solo para recibir (init(): test-permisos-pantallas-stock.js).
    suite: path.join(__dirname, 'test-permisos-pantallas-stock.js'),
    original: STOCK,
    funciones: [],
    manuales: [
      { nombre: 'solo recibir: "sin acceso"', de: '        if (recibeEnAlgunaFabrica()) {\n', a: '        if (false) {\n' },
      { nombre: 'solo recibir: no lee', de: '          camino().soloEsto = true\n          await cargarEnCamino()\n', a: '          camino().soloEsto = true\n' },
      { nombre: 'solo recibir: sin "no hay nada"', de: '          camino().soloEsto = true\n', a: '' },
      { nombre: 'solo recibir: con pestañas', de: "        if (recibeEnAlgunaFabrica()) {\n          document.getElementById('pestanas-stock').hidden = true\n", a: '        if (recibeEnAlgunaFabrica()) {\n' },
      { nombre: 'solo recibir: sin el subtítulo', de: "          document.getElementById('stock-subtitulo').textContent = 'En camino desde otra empresa'\n", a: '' },
      { nombre: 'con stock:ver no se lee', de: '      // barra, así que también con la barra ya leída. No frena lo que sigue.\n      cargarEnCamino()\n', a: '      // barra, así que también con la barra ya leída. No frena lo que sigue.\n' },
    ],
  },
])
