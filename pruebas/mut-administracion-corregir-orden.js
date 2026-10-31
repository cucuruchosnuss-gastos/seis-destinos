// Mutaciones de test-administracion-corregir-orden.js (Corregir una orden en
// Administración, 29/10/2026): mutan modulos/administracion.html
// (ARCHIVO_TEST). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre la Administración de
// 2003aa3 (el origin/ci-prueba/recibir-entre-empresas del que salió la rama
// ci-prueba/corregir-orden). Nunca HEAD.
//
//   node pruebas/mut-administracion-corregir-orden.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-corregir-orden.js')
const BASE = '2003aa3'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-administracion-corregir-orden.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

// Los esc() que escapan algo que no viene de la base (o que la base no puede
// traer con HTML): sacarlos no cambia nada que la suite pueda ver.
const NUMERO_DEL_CODIGO = 'la clave del renglón o del lote es un número que arma el módulo (++claveCorregir), nunca un dato de la base'
const equivalentes = [
  { expr: "esc(l.clave)", motivo: NUMERO_DEL_CODIGO },
  { expr: "esc(r.clave)", motivo: NUMERO_DEL_CODIGO },
  { expr: "esc('Renglón ' + (i + 1))", motivo: 'texto del código con un número' },
  { expr: "esc(textoSinCargarCorregir())", motivo: 'texto constante del código' },
  { expr: "esc(hoyArgentina())", motivo: 'la fecha de hoy que arma el código (aaaa-mm-dd)' },
  { expr: "esc(c.fecha)", motivo: 'una fecha aaaa-mm-dd: la de la base pasa por esFechaIso y la del campo la pone el navegador (input type=date)' },
  { expr: "esc(textoTotalCorregir(c))", motivo: 'texto del código con importes formateados (números)' },
  { expr: "esc(textoSubtotalCorregir(c, r))", motivo: 'texto del código con importes formateados (números)' },
  { expr: "esc(textoLotesCorregir(r))", motivo: 'texto del código con cantidades (números) y la unidad, que pasa por unidadHoja; los nombres de los lotes no van en este texto' },
  { expr: "esc(e)", motivo: 'cada error del editor es un texto del código con el número de renglón y cantidades' },
  { expr: "esc(g.titulo)", motivo: 'título constante de GRUPOS_REMITO (js/remitos-comun.js)' },
  { expr: "esc(o.insumoId)", motivo: 'el id (uuid) de un insumo del catálogo, en un atributo entre comillas' },
  { expr: "esc(o.presentacionId)", motivo: 'el id (uuid) de una presentación del catálogo, en un atributo entre comillas' },
  { expr: "esc(m.id)", motivo: 'el id (uuid) de un cono del catálogo, en un atributo entre comillas' },
  { expr: "esc(titulo)", motivo: '"Corregida N vez/veces": texto del código con un número' },
  { expr: "esc(plata)", motivo: 'texto del código con dos importes formateados (números)' },
  { expr: "esc('Total ' + importeHoja(t.antes, m) + ' → ' + (t.despues === null ? 'se completa con la lista' : importeHoja(t.despues, m)) + ' (estimado con los precios de la pantalla)')", motivo: 'texto del código con importes formateados (números)' },
]

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlCorregirOrden', 'htmlRenglonCorregir', 'htmlProductoCorregir', 'htmlOpcionesCorregir', 'htmlMarcasCorregir', 'htmlDevCorregir',
    'htmlLotesCorregir', 'htmlResumenCorregir', 'htmlCorreccionesOrden'],
  equivalentes,
  manuales: [
    // El botón
    { nombre: 'el botón se ve en una anulada', de: "return !!o && o.estado !== 'anulada' && puedeEn('retiros', 'precios', o.unidad_negocio_id)", a: "return !!o && puedeEn('retiros', 'precios', o.unidad_negocio_id)" },
    { nombre: 'el botón pide cargar en vez de precios', de: "return !!o && o.estado !== 'anulada' && puedeEn('retiros', 'precios', o.unidad_negocio_id)", a: "return !!o && o.estado !== 'anulada' && puedeEn('retiros', 'cargar', o.unidad_negocio_id)" },
    { nombre: 'el botón no se oculta mientras se corrige', de: "(puedeCorregirOrden(o) && !d.valorizar && !d.anular && !corrigiendo)", a: "(puedeCorregirOrden(o) && !d.valorizar && !d.anular)" },
    { nombre: 'el botón se ve mientras se valoriza', de: "(puedeCorregirOrden(o) && !d.valorizar && !d.anular && !corrigiendo)", a: "(puedeCorregirOrden(o) && !d.anular && !corrigiendo)" },
    { nombre: 'Anular se ve mientras se corrige', de: "(activa && puedeEn('retiros', 'anular', u) && !corrigiendo)", a: "(activa && puedeEn('retiros', 'anular', u))" },
    { nombre: 'la pantalla de facturar a la vista mientras se corrige', de: '!d.valorizar && !d.corregir && puedeFacturar(o)', a: '!d.valorizar && puedeFacturar(o)' },
    { nombre: 'Corregir valorización se ve mientras se corrige', de: "o.estado_valorizacion === 'valorizada' && !d.valorizar && !corrigiendo)", a: "o.estado_valorizacion === 'valorizada' && !d.valorizar)" },
    // Abrir
    { nombre: 'abre aunque se esté valorizando', de: 'if (!puedeCorregirOrden(o) || d.valorizar || d.anular || d.corregir || estado.trabajando) return', a: 'if (!puedeCorregirOrden(o)) return' },
    { nombre: 'Valorizar abre mientras se corrige', de: '|| estado.trabajando || d.corregir) return\n      const turno = ++turnoValorizar', a: '|| estado.trabajando) return\n      const turno = ++turnoValorizar' },
    { nombre: 'orden_para_corregir con otra cosa', de: "supabase.rpc('orden_para_corregir', { p_orden_id: o.id })", a: "supabase.rpc('orden_para_corregir', { p_orden_id: o.codigo })" },
    { nombre: 'ignora no_se_puede', de: 'c.noSePuede = limpio(data.no_se_puede) || null', a: 'c.noSePuede = null' },
    { nombre: 'el error al leer no va tal cual', de: "c.errorLeer = err?.message || 'No se pudo leer la orden para corregirla. Probá de nuevo.'", a: "c.errorLeer = 'No se pudo leer la orden para corregirla. Probá de nuevo.'" },
    { nombre: 'pintarOrden no dibuja el editor', de: '      else if (d.corregir) {\n', a: '      else if (false) {\n' },
    { nombre: 'no_se_puede igual deja revisar', de: "if (!c || c.cargando || c.noSePuede || c.errorLeer || c.paso !== 'editar') return", a: "if (!c || c.paso !== 'editar') return" },
    { nombre: 'no_se_puede igual deja agregar renglones', de: "if (!c || c.paso !== 'editar' || c.cargando || c.noSePuede || c.errorLeer) return", a: 'if (!c) return' },
    { nombre: 'Cerrar no cierra', de: 'turnoCorregir++\n      d.corregir = null', a: 'turnoCorregir++' },
    // Los lotes
    { nombre: 'no agrega el lote sin nombre de lo que faltaba', de: 'if (cantidad !== null && suma < cantidad) lotes.push', a: 'if (false) lotes.push' },
    { nombre: 'falta y sobra al revés', de: 'falta: dif > 0 ? dif : 0, sobra: dif < 0 ? -dif : 0', a: 'falta: dif < 0 ? -dif : 0, sobra: dif > 0 ? dif : 0' },
    { nombre: 'dice completo aunque falte', de: 'if (e.falta) return `${de} · faltan repartir', a: 'if (false) return `${de} · faltan repartir' },
    { nombre: 'dice completo aunque sobre', de: 'if (e.sobra) return `${de} · sobran', a: 'if (false) return `${de} · sobran' },
    { nombre: 'deja guardar si faltan repartir', de: "else if (e.falta) errores.push(n + 'faltan repartir '", a: "else if (false) errores.push(n + 'faltan repartir '" },
    { nombre: 'deja guardar si sobran', de: "else if (e.sobra) errores.push(n + 'los lotes suman '", a: "else if (false) errores.push(n + 'los lotes suman '" },
    { nombre: 'deja un lote vacío', de: 'if (e.vacios) errores.push', a: 'if (false) errores.push' },
    { nombre: 'el estado de los lotes no se repinta', de: '        est.textContent = textoLotesCorregir(r)\n', a: '' },
    { nombre: 'sin el amarillo de los lotes', de: "est.classList.toggle('ad-co-lotes__estado--falta', e.hay && !!(e.falta || e.sobra || e.vacios))", a: "est.classList.toggle('ad-co-lotes__estado--falta', false)" },
    { nombre: 'el primer lote no se lleva el renglón', de: 'n: r.lotes.length ? (e.falta || null) : numeroONull(r.cantidad)', a: 'n: null' },
    { nombre: 'el segundo lote no se lleva lo que falta', de: 'n: r.lotes.length ? (e.falta || null) : numeroONull(r.cantidad)', a: 'n: r.lotes.length ? null : numeroONull(r.cantidad)' },
    { nombre: 'sacar un lote no lo saca', de: 'r.lotes = r.lotes.filter(l => String(l.clave) !== String(k))', a: 'r.lotes = r.lotes.slice()' },
    { nombre: 'el número de un lote no se toma', de: 'else { l.n = leerCampoNumero(t); repintarCuentasCorregir(c, r) }', a: 'else { repintarCuentasCorregir(c, r) }' },
    { nombre: 'el nombre de un lote no se toma', de: "if (ds.coLote !== undefined) l.lote = String(t.value ?? '')", a: 'if (ds.coLote !== undefined) {}' },
    // La fecha
    { nombre: 'la fecha valorizada no se deshabilita', de: `\${valorizada ? ' disabled aria-describedby="ad-co-fecha-ayuda"' : ''}`, a: '' },
    { nombre: 'sin la explicación de la fecha', de: `(valorizada ? '<span class="ad-campo__ayuda" id="ad-co-fecha-ayuda">La orden ya está valorizada: no se le puede cambiar la fecha.</span>' : '')`, a: "''" },
    { nombre: 'toma la fecha aunque esté valorizada', de: "if (ds.coCampo === 'fecha' && valorizadaCorregir(c)) return", a: '' },
    { nombre: 'p_fecha viaja aunque esté valorizada', de: 'p_fecha: valorizadaCorregir(c) || c.fecha === d.fecha ? null : c.fecha', a: 'p_fecha: c.fecha === d.fecha ? null : c.fecha' },
    { nombre: 'p_fecha nunca viaja', de: 'p_fecha: valorizadaCorregir(c) || c.fecha === d.fecha ? null : c.fecha', a: 'p_fecha: null' },
    // Lo que viaja
    { nombre: 'p_transporte siempre', de: 'p_transporte: transporte === limpio(d.transporte) ? null : transporte', a: 'p_transporte: transporte' },
    { nombre: 'p_transporte sin limpiar', de: 'const transporte = limpio(c.transporte)', a: 'const transporte = String(c.transporte)' },
    { nombre: 'borrar las observaciones viaja null (no las borra)', de: "p_observaciones: obs === String(d.observaciones ?? '').trim() ? null : obs", a: "p_observaciones: obs === String(d.observaciones ?? '').trim() ? null : (obs || null)" },
    { nombre: 'sin el motivo', de: 'p_motivo: limpio(c.motivo),', a: "p_motivo: '.'," },
    { nombre: 'el lote del insumo sin mayúsculas', de: '{ lote: limpio(l.lote).toUpperCase(), cantidad: Number(l.n) }', a: '{ lote: limpio(l.lote), cantidad: Number(l.n) }' },
    { nombre: 'el lote del producto como cantidad', de: '{ lote: limpio(l.lote).toUpperCase(), cajas: Number(l.n) }', a: '{ lote: limpio(l.lote).toUpperCase(), cantidad: Number(l.n) }' },
    { nombre: 'el insumo sin decimales', de: 'item = { insumo_id: r.insumoId, cantidad: Number(r.cantidad) }', a: 'item = { insumo_id: r.insumoId, cantidad: Math.round(Number(r.cantidad)) }' },
    { nombre: 'sin lotes nunca', de: '      if (lotes) item.lotes = lotes\n', a: '' },
    { nombre: 'la devolución sin tipo', de: '        item.tipo = r.tipo\n', a: '' },
    { nombre: 'la devolución sin su motivo', de: '        item.motivo = limpio(r.motivo)\n', a: '' },
    { nombre: 'la devolución sin el lote que trajo', de: "        item.lote_devuelto = limpio(r.loteDevuelto).toUpperCase() || null\n", a: '' },
    { nombre: 'la devolución siempre se descarta', de: "item.destino = r.destino === 'stock' ? 'stock' : 'descarte'", a: "item.destino = 'descarte'" },
    { nombre: 'el destino elegido no se toma', de: "r.destino = t.value === 'stock' ? 'stock' : 'descarte'", a: "r.destino = 'descarte'" },
    { nombre: 'el motivo de la devolución no se toma', de: "else if (ds.coMotivoDev !== undefined) r.motivo = String(t.value ?? '')", a: 'else if (ds.coMotivoDev !== undefined) {}' },
    { nombre: 'la reposición con precio', de: "if (conPreciosCorregir(c) && r.tipo !== 'reposicion' && r.precio !== null && r.precio !== undefined) item.precio", a: 'if (conPreciosCorregir(c) && r.precio !== null && r.precio !== undefined) item.precio' },
    { nombre: 'el precio viaja sin valorizar', de: "if (conPreciosCorregir(c) && r.tipo !== 'reposicion' && r.precio !== null && r.precio !== undefined) item.precio", a: "if (r.tipo !== 'reposicion' && r.precio !== null && r.precio !== undefined) item.precio" },
    { nombre: 'una orden de acopio también con precios', de: "return valorizadaCorregir(c) && c?.datos?.talonario !== 'acopio'", a: 'return valorizadaCorregir(c)' },
    // Validar
    { nombre: 'deja guardar sin renglones', de: "if (!(c?.renglones ?? []).length) errores.push(", a: 'if (false) errores.push(' },
    { nombre: 'deja guardar sin el cono', de: 'if (pr?.con_cono && !r.marcaId) errores.push', a: 'if (false) errores.push' },
    { nombre: 'deja guardar con motivo corto', de: "if (limpio(c?.motivo).length < LARGO_MINIMO_MOTIVO) errores.push('Poné el motivo de la corrección.')", a: '' },
    { nombre: 'deja guardar sin cambios', de: 'if (!errores.length && !hayCambiosCorregir(c)) errores.push', a: 'if (false) errores.push' },
    // El resumen
    { nombre: 'el resumen sin lo que se saca', de: "const lineas = quitadosCorregir(c).map(it => 'Se saca: ' + descripcionItemCorregir(c, it))", a: 'const lineas = []' },
    { nombre: 'el resumen sin lo que se agrega', de: "if (!r.original) lineas.push('Se agrega: '", a: "if (false) lineas.push('Se agrega: '" },
    { nombre: 'el resumen sin el cambio de producto', de: 'if (a.presentacionId !== b.presentacionId || a.marcaId !== b.marcaId || a.insumoId !== b.insumoId) out.push', a: 'if (false) out.push' },
    { nombre: 'el resumen sin el cambio de cajas', de: '      if (a.cantidad !== b.cantidad) {\n', a: '      if (false) {\n' },
    { nombre: 'el resumen sin los lotes', de: '      if (a.lotes !== b.lotes) {\n', a: '      if (false) {\n' },
    { nombre: 'el resumen sin el precio', de: "if (conPreciosCorregir(c) && r.tipo !== 'reposicion' && a.precio !== b.precio) {", a: 'if (false) {' },
    { nombre: 'el resumen sin el transporte', de: 'if (limpio(c.transporte) !== limpio(d.transporte)) out.push', a: 'if (false) out.push' },
    { nombre: 'el resumen sin las observaciones borradas', de: "out.push(obs ? 'Observaciones: ' + obs : 'Se borran las observaciones')", a: "out.push('Observaciones: ' + obs)" },
    { nombre: 'el resumen sin la fecha', de: 'if (!valorizadaCorregir(c) && esFechaIso(c.fecha) && c.fecha !== d.fecha) out.push', a: 'if (false) out.push' },
    { nombre: 'Volver a editar no vuelve', de: "      c.paso = 'editar'\n      c.errorGuardar = null\n      pintarOrden()\n    }\n\n    function cancelarCorregir", a: "      c.errorGuardar = null\n      pintarOrden()\n    }\n\n    function cancelarCorregir" },
    // La plata
    { nombre: 'una devolución suma en vez de restar', de: "p * (r.tipo === 'devolucion' ? -n : n)", a: 'p * n' },
    { nombre: 'la diferencia sin restar el total de antes', de: 'Math.round((despues - antes) * 100) / 100', a: 'Math.round(despues * 100) / 100' },
    { nombre: 'la diferencia con el signo al revés', de: "(t.diferencia > 0 ? '+ ' : '− ')", a: "(t.diferencia > 0 ? '− ' : '+ ')" },
    { nombre: 'entre empresas va a la cuenta corriente', de: '      if (d.entre_empresas) {\n', a: '      if (false) {\n' },
    { nombre: 'sin diferencia dice otra cosa', de: "if (t.diferencia === 0) return 'Sin diferencia de plata.'", a: '' },
    { nombre: 'el precio de la pantalla no manda', de: '      if (r.precio !== null && r.precio !== undefined) return Number(r.precio)\n', a: '' },
    { nombre: 'sin el precio anterior', de: 'return it ? precioDe(it) : null', a: 'return null' },
    { nombre: 'el precio anterior de otro tipo', de: 'precioDe(it) !== null && tipoItem(it) === r.tipo &&', a: 'precioDe(it) !== null &&' },
    { nombre: 'el precio anterior sin mirar el cono', de: 'viejos.find(x => (x.marca_id ?? null) === (r.marcaId ?? null)) ?? viejos[0]', a: 'viejos[0]' },
    { nombre: 'la reposición estimada con precio', de: "      if (r.tipo === 'reposicion') return 0\n      const lista = precioListaCorregir(c, r)", a: '      const lista = precioListaCorregir(c, r)' },
    { nombre: 'el precio escrito no se toma', de: '        r.precio = leerCampoNumero(t)\n', a: '' },
    { nombre: 'las cajas escritas no se toman', de: '        r.cantidad = leerCampoNumero(t)\n', a: '' },
    { nombre: 'el subtotal no se repinta', de: 'if (sub) sub.textContent = textoSubtotalCorregir(c, r)', a: '' },
    { nombre: 'el total no se repinta', de: 'if (tot) tot.textContent = textoTotalCorregir(c)', a: '' },
    { nombre: 'el resumen sin la diferencia', de: '`<p class="ad-co-diferencia" id="ad-co-diferencia">${esc(textoDiferenciaCorregir(c, t))}</p>`', a: "''" },
    // Editar renglones
    { nombre: 'sacar un renglón no lo saca', de: 'c.renglones = c.renglones.filter(r => String(r.clave) !== String(clave))', a: 'c.renglones = c.renglones.slice()' },
    { nombre: 'otro producto conserva los lotes', de: '        if (r.presentacionId !== pr.id) r.lotes = []\n', a: '' },
    { nombre: 'pasar a insumo conserva la cantidad', de: "if (!r.insumoId || (ins.unidad_medida ?? null) !== (r.unidad ?? null)) r.cantidad = null", a: '' },
    { nombre: 'toma un cono que no existe', de: 'if (!r || !(c.cat?.marcas ?? []).some(m => m.id === marcaId)) return', a: 'if (!r) return' },
    { nombre: 'un insumo en una devolución', de: "filter(g => g.tipo !== 'insumos' || r.tipo === 'retiro')", a: 'filter(g => true)' },
    // Guardar
    { nombre: 'doble toque manda dos veces', de: "if (!c || c.paso !== 'resumen' || c.guardando || estado.trabajando || !puedeGuardarCorregir(c)) return", a: "if (!c || c.paso !== 'resumen' || !puedeGuardarCorregir(c)) return" },
    { nombre: 'guarda sin retiros:cargar', de: "if (!c || c.paso !== 'resumen' || c.guardando || estado.trabajando || !puedeGuardarCorregir(c)) return", a: "if (!c || c.paso !== 'resumen' || c.guardando || estado.trabajando) return" },
    { nombre: 'Guardar prendido sin retiros:cargar', de: "${c.guardando || !puede ? ' disabled' : ''}", a: "${c.guardando ? ' disabled' : ''}" },
    { nombre: 'sin la explicación de cargar en el editor', de: 'if (!puedeGuardarCorregir(c)) avisos.push(', a: 'if (false) avisos.push(' },
    { nombre: 'puede guardar pide precios', de: "return puedeEn('retiros', 'cargar', c?.datos?.unidad_negocio_id)", a: "return puedeEn('retiros', 'precios', c?.datos?.unidad_negocio_id)" },
    { nombre: 'el error de guardar no va tal cual', de: "c.errorGuardar = err?.message || 'No se pudo corregir la orden. Probá de nuevo.'", a: "c.errorGuardar = 'No se pudo corregir la orden. Probá de nuevo.'" },
    { nombre: 'después de un error queda Guardando…', de: "        c.guardando = false\n        estado.trabajando = false\n        pintarOrden()\n      }\n    }\n\n    // Lo que no estaba en stock", a: "        estado.trabajando = false\n        pintarOrden()\n      }\n    }\n\n    // Lo que no estaba en stock" },
    { nombre: 'no relee la orden', de: '        await abrirOrden(id)\n        if (estado.orden?.orden?.id === id) {\n          actualizarFilaOrden(id, { ...estado.orden.orden, ...conteos', a: '        if (estado.orden?.orden?.id === id) {\n          actualizarFilaOrden(id, { ...estado.orden.orden, ...conteos' },
    { nombre: 'la fila sin las cajas releídas', de: 'actualizarFilaOrden(id, { ...estado.orden.orden, ...conteosFilaOrden(estado.orden.items) })', a: 'actualizarFilaOrden(id, { ...estado.orden.orden })' },
    { nombre: 'la fila no toma transporte ni cajas', de: "'talonario', 'fecha', 'transporte', 'cajas', 'sueltas', 'insumos', 'devueltas']", a: "'talonario']" },
    { nombre: 'el éxito sin los totales', de: "(data?.valorizada ? ` Total ${importeHoja(data.total_antes, moneda)} → ${importeHoja(data.total_despues, moneda)}.` : '')", a: "''" },
    { nombre: 'los faltantes no se guardan', de: 'if (faltantes.length) { estado.orden.faltantesCorreccion = faltantes; pintarOrden() }', a: '' },
    { nombre: 'los faltantes no van en el detalle', de: 'return `${htmlFaltantesCorreccion(d)}<div class="ad-tarjeta">', a: 'return `<div class="ad-tarjeta">' },
    { nombre: 'el faltante de un insumo en cajas', de: '      if (x?.insumo) return limpio(x.insumo)', a: '      if (false) return limpio(x.insumo)' },
    { nombre: 'los faltantes sin escape', de: "l.map(x => '<li>' + esc(textoFaltanteCorreccion(x)) + '</li>')", a: "l.map(x => '<li>' + textoFaltanteCorreccion(x) + '</li>')" },
    { nombre: 'conteosFilaOrden cuenta la devolución como caja que sale', de: 'else { cajas += cajasQueSalen(it); hayCajas = true }', a: 'else { cajas += Number(it.cajas) || 0; hayCajas = true }' },
    // El historial
    { nombre: 'no lee el historial', de: 'const correcciones = await leerCorreccionesDeOrden(o)', a: 'const correcciones = []' },
    { nombre: 'el historial de todas las órdenes', de: ".eq('orden_retiro_id', o.id).order('corregida_en'", a: ".order('corregida_en'" },
    { nombre: 'el historial sin los totales', de: "'corregida_en, corregida_por, motivo, total_antes:antes->>total, total_despues:despues->>total'", a: "'corregida_en, corregida_por, motivo'" },
    { nombre: 'el historial que falla se muestra vacío', de: "        console.error('No se pudieron leer las correcciones de la orden:', err)\n        return null", a: "        console.error('No se pudieron leer las correcciones de la orden:', err)\n        return []" },
    { nombre: 'el historial no se dibuja', de: '${htmlCorreccionesOrden(d)}${recepcion}', a: '${recepcion}' },
    { nombre: '"Corregida 1 veces"', de: "(l.length === 1 ? ' vez' : ' veces')", a: "' veces'" },
    { nombre: 'el historial en UTC', de: 'esc(fechaHoraHoja(k?.corregida_en) + ', a: 'esc(String(k?.corregida_en).slice(0, 16) + ' },
    { nombre: 'el historial sin quién', de: "const quien = estado.nombres.get(k?.corregida_por) ?? '—'", a: "const quien = '—'" },
    { nombre: 'no lee los nombres de quién corrigió', de: 'await asegurarNombres([r.orden.cargada_por, ...(Array.isArray(r.correcciones) ? r.correcciones.map(k => k?.corregida_por) : [])])', a: 'await asegurarNombres([r.orden.cargada_por])' },
    { nombre: 'el historial con plata aunque no haya totales', de: 'const plata = antes !== null || despues !== null ?', a: 'const plata = true ?' },
  ],
})
