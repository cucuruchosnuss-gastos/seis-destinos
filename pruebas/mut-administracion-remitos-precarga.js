// Mutaciones de test-administracion-remitos-precarga.js (los remitos
// precargados de Rosario en Administración, 27/10/2026): mutan
// modulos/administracion.html, que la suite recibe por ARCHIVO_TEST. Ver
// mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que dar ROJO sobre la
// Administración de ANTES del cambio (BASE = f364914, el pedido del que salió
// la rama ci-prueba/remitos-rosario-revisar). Nunca HEAD.
//
//   node pruebas/mut-administracion-remitos-precarga.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-remitos-precarga.js')
const BASE = 'f364914'

{
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-administracion-remitos-precarga.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlTarjetaRemito', 'htmlRenglonRemito', 'htmlEncabezadoRemito', 'htmlAccionesRemito', 'htmlFilaOrdenRemito', 'htmlClientesRemito',
    'htmlClienteRemito', 'htmlOpcionesRemito', 'htmlLotesRemito', 'htmlMarcasRemito', 'htmlRemitosPrecarga', 'htmlTalonariosOrdenes', 'htmlFotoRemito'],
  equivalentes: [
    { expr: 'esc(r.id)', motivo: 'el id de un remito (uuid de la base) en un data-remito entre comillas' },
    { expr: 'esc(r.estado)', motivo: 'un estado de remitos_precarga (CHECK de la base: leyendo, precargada, error…) como clase y fuera de la lista no llega' },
    { expr: 'esc(estadoR)', motivo: 'una etiqueta constante de ETIQUETA_ESTADO_REMITO (o el estado del CHECK)' },
    { expr: "esc(amarillos + ' en amarillo')", motivo: 'un número contado acá con un texto constante' },
    { expr: "esc('Subido ' + momentoAr(r.subido_en))", motivo: 'una fecha formateada por momentoAr() (o "—")' },
    { expr: 'esc(n)', motivo: 'un número: el largo de la lista' },
    { expr: 'esc(i)', motivo: 'el índice del renglón (un número de la pantalla)' },
    { expr: "esc('Renglón ' + (i + 1))", motivo: 'texto constante con el número del renglón' },
    { expr: 'esc(k)', motivo: 'el índice del lote (un número de la pantalla)' },
    { expr: "esc('Lote ' + (k + 1))", motivo: 'texto constante con el número del lote' },
    { expr: "esc('Cajas del lote ' + (k + 1))", motivo: 'texto constante con el número del lote' },
    { expr: "esc('Quitar el lote ' + (k + 1))", motivo: 'texto constante con el número del lote' },
    { expr: 'esc(rotulo)', motivo: '"Cajas" o "Cantidad (kg)": la unidad pasa por unidadHoja() de una unidad_medida del CHECK de insumos' },
    { expr: 'esc(t.id)', motivo: "constante del código: 'oficial' o 'acopio' (TALONARIOS)" },
    { expr: 'esc(t.nombre)', motivo: 'constante del código: Oficial o Acopio (TALONARIOS)' },
    { expr: "esc(t.nombre + ' · ' + n)", motivo: 'constante del código con un número contado acá' },
    { expr: "esc(f.talonario === 'acopio' ? 'Acopio: el talonario celeste con número rojo, para retirar lo ya facturado como acopio.' : 'Oficial: el talonario de Dolce Pasta (0001-0000…).')", motivo: 'texto constante del código' },
    { expr: 'esc(hoyArgentina())', motivo: 'una fecha ISO que arma hoyArgentina()' },
    { expr: 'esc(f.fecha)', motivo: 'una fecha ISO validada por esFechaIso() en formDesdeRemito (o vacía)' },
    { expr: "esc('Escribí al menos ' + MIN_LETRAS_BUSCAR + ' letras para buscar el cliente.')", motivo: 'texto constante con una constante numérica' },
    { expr: 'esc(Math.round(ZOOM_FOTO_REMITO[z] * 100) + \' %\')', motivo: 'un número de ZOOM_FOTO_REMITO' },
    { expr: 'esc(ZOOM_FOTO_REMITO[z] * 100)', motivo: 'un número de ZOOM_FOTO_REMITO' },
    { expr: "esc(ft.error || 'No se pudo mostrar la foto.')", motivo: 'texto constante del código: lo pone cargarFotoRemito()' },
    { expr: 'esc(rr.error)', motivo: 'texto constante del código: lo pone cargarRemitosPrecarga()' },
    { expr: 'esc(o.id)', motivo: 'el id de una orden (uuid de la base) en un data-orden entre comillas' },
    { expr: 'esc(o.presentacionId)', motivo: 'el id de una presentación (uuid de la base) en un data- entre comillas' },
    { expr: 'esc(o.insumoId)', motivo: 'el id de un insumo (uuid de la base) en un data- entre comillas' },
    { expr: 'esc(m.id)', motivo: 'el id de un cono (uuid de la base) en un data- entre comillas' },
    { expr: 'esc(c.id)', motivo: 'el id de un cliente (uuid de la base) en un data- entre comillas' },
    { expr: 'esc(g.titulo)', motivo: 'constante del código: un título de GRUPOS_REMITO' },
    { expr: "esc(importeHoja(totalRemito, o.moneda) + textoAFavor(totalRemito))", motivo: 'un importe formateado por importeHoja() y un texto constante' },
    { expr: "esc('Volver a leer la foto con la IA pisa todo lo de este remito' + (rm.sucio ? ', también lo que corregiste y todavía no guardaste.' : '.'))", motivo: 'texto constante del código' },
    { expr: "esc('Nada coincide con «' + q + '».')", motivo: 'lo cubre la búsqueda con marca; el texto buscado lo escribe la persona en su propia pantalla' },
    { expr: "esc('Ningún cono coincide con «' + limpio(r.marcaBusqueda) + '».')", motivo: 'el texto buscado lo escribe la persona en su propia pantalla (nunca viene de la base)' },
  ],
  manuales: [
    // La lista de arriba
    { nombre: 'la lista sin los que se están leyendo', de: "const ESTADOS_REMITO_POR_REVISAR = ['precargada', 'error', 'leyendo']", a: "const ESTADOS_REMITO_POR_REVISAR = ['precargada', 'error']" },
    { nombre: 'la lista con los confirmados', de: "const ESTADOS_REMITO_POR_REVISAR = ['precargada', 'error', 'leyendo']", a: "const ESTADOS_REMITO_POR_REVISAR = ['precargada', 'error', 'leyendo', 'confirmada']" },
    { nombre: 'la lista al revés', de: ".sort((a, b) => String(b.subido_en ?? '').localeCompare(String(a.subido_en ?? '')))", a: ".sort((a, b) => String(a.subido_en ?? '').localeCompare(String(b.subido_en ?? '')))" },
    { nombre: 'lo resuelto vuelve', de: ' && !(resueltos instanceof Set && resueltos.has(r.id)))', a: ')' },
    { nombre: 'confirmar no lo marca resuelto', de: '      estado.remitosResueltos.add(id)\n', a: '' },
    { nombre: 'la consulta sin la fábrica', de: ".eq('unidad_negocio_id', unidadId).in('estado', ESTADOS_REMITO_POR_REVISAR)", a: ".in('estado', ESTADOS_REMITO_POR_REVISAR)" },
    { nombre: 'amarillos cuenta los omitidos', de: "filter(it => it?.revisar === true && it?.omitir !== true).length", a: "filter(it => it?.revisar === true).length" },
    { nombre: 'la tarjeta sin el error de la IA', de: "        (r.estado === 'error' && limpio(r.error) ? `<span class=\"ad-fila__meta ad-rm-tarjeta__error\">${esc(limpio(r.error))}</span>` : '') +\n", a: '' },
    // Con control / sin control
    { nombre: 'toda fábrica es sin control', de: "      return !!unidadId && estado.sinControl?.get?.(unidadId) === true", a: '      return !!unidadId' },
    { nombre: 'null cuenta como sin control', de: "estado.sinControl.set(unidadId, data?.controla_stock_terminado === false)", a: "estado.sinControl.set(unidadId, data?.controla_stock_terminado !== true)" },
    { nombre: 'Nuss también lee los remitos', de: '      if (sinControlStockEmpresa()) cargarRemitosPrecarga()\n      else pintarRemitosPrecarga()', a: '      cargarRemitosPrecarga()' },
    { nombre: 'la lista de Dolce con la fila de siempre', de: '      return lista.map(sinControlStockEmpresa() ? htmlFilaOrdenRemito : htmlFilaOrden).join(\'\')', a: "      return lista.map(htmlFilaOrden).join('')" },
    { nombre: 'la lista de Nuss ordenada por remito', de: "      if (!sinControlStockEmpresa()) return lista\n      const tal = estado.talonarioOrdenes", a: "      if (!sinControlStockEmpresa()) return ordenarPorRemito(lista)\n      const tal = estado.talonarioOrdenes" },
    { nombre: 'la sección se ve en Nuss', de: "      if (!sinControlStockEmpresa() || !rr || rr.empresaId !== estado.empresaId) return ''", a: "      if (!rr || rr.empresaId !== estado.empresaId) return ''" },
    // El listado de abajo
    { nombre: 'las sin número primero', de: "        if (x === null) return 1\n        if (y === null) return -1", a: "        if (x === null) return -1\n        if (y === null) return 1" },
    { nombre: 'por número de menor a mayor', de: '        return y - x || i - j', a: '        return x - y || i - j' },
    { nombre: 'sin solapas: todos los talonarios juntos', de: '      return ordenarPorRemito(lista.filter(o => talonarioDe(o) === tal))', a: '      return ordenarPorRemito(lista)' },
    { nombre: 'null es acopio', de: "      return x?.talonario === 'acopio' ? 'acopio' : 'oficial'", a: "      return x?.talonario === 'oficial' ? 'oficial' : 'acopio'" },
    { nombre: 'el acopio dice Remito', de: "      return `${talonarioDe(o) === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}`", a: '      return `Remito N° ${n}`' },
    { nombre: 'sin el sello Acopio', de: "      return o?.talonario === 'acopio' ? '<span class=\"ad-sello ad-sello--acopio\">Acopio</span>' : ''", a: "      return ''" },
    { nombre: 'la fila sin "Valorizada / Sin valorizar"', de: '`<span class="ad-fila__sellos">${htmlSelloOrden(o)}${htmlSelloAcopio(o)}${htmlSelloEntre(o)}</span></span>`', a: '`<span class="ad-fila__sellos">${htmlSelloAcopio(o)}${htmlSelloEntre(o)}</span></span>`' },
    { nombre: 'la fila sin el total', de: "        (valorizada ? `<span class=\"ad-fila__importe\">${esc(importeHoja(totalRemito, o.moneda) + textoAFavor(totalRemito))}</span>` : '') + '</span></button>'", a: "        '</span></button>'" },
    { nombre: 'la cuenta cuenta todas', de: "      const n = Array.isArray(estado.ordenes) ? ordenesVisibles().length : 0", a: '      const n = estado.ordenes?.length ?? 0' },
    // El remito abierto
    { nombre: 'la foto de otro bucket', de: "await supabase.storage.from('comprobantes').createSignedUrl(ruta, 600)", a: "await supabase.storage.from('cobranzas').createSignedUrl(ruta, 600)" },
    { nombre: 'cualquier link es una foto', de: "      return /^https?:\\/\\//i.test(t) || /^blob:/i.test(t) || /^data:image\\//i.test(t) ? t : null", a: '      return t || null' },
    { nombre: 'el src interpolado', de: '<img class="ad-rm-foto__img" data-rm-foto alt="Foto del remito"', a: '<img class="ad-rm-foto__img" data-rm-foto src="${esc(ft.url)}" alt="Foto del remito"' },
    { nombre: 'el zoom sin tope', de: "      rm.zoom = Math.min(Math.max((Number(rm.zoom) || 0) + (Number(paso) || 0), 0), ZOOM_FOTO_REMITO.length - 1)", a: '      rm.zoom = (Number(rm.zoom) || 0) + (Number(paso) || 0)' },
    // (Sin "el amarillo con los omitidos" en htmlRenglonRemito: el omitido sale
    // antes por su rama tachada, así que ahí el `&& r.omitir !== true` es de
    // resguardo y sacarlo no cambia nada. El amarillo de los omitidos lo cubren
    // "amarillos cuenta los omitidos" y "el omitido va con revisar".)
    { nombre: 'sin lo leído', de: "      const rmLeido = limpio(r.texto_leido) ? `<p class=\"ad-rm-leido\">Leído: «${esc(limpio(r.texto_leido))}»</p>` : ''", a: "      const rmLeido = ''" },
    { nombre: 'sin la nota', de: "      const rmNota = limpio(r.nota) ? `<p class=\"ad-rm-nota\">${esc(limpio(r.nota))}</p>` : ''", a: "      const rmNota = ''" },
    { nombre: 'Aceptar sin producto', de: "return !!r && r.revisar === true && r.omitir !== true && !!(r.presentacionId || r.insumoId) && Number(r.cantidad) > 0", a: "return !!r && r.revisar === true && r.omitir !== true && Number(r.cantidad) > 0" },
    { nombre: 'Aceptar no saca el amarillo', de: "      if (!puedeAceptarSugerencia(r)) return\n      r.revisar = false\n", a: '      if (!puedeAceptarSugerencia(r)) return\n' },
    { nombre: 'elegir el producto no saca el amarillo', de: "      r.presentacionId = pr.id\n      r.insumoId = null\n      r.revisar = false\n", a: '      r.presentacionId = pr.id\n      r.insumoId = null\n' },
    { nombre: 'elegir cualquier presentación', de: "      const pr = presentacionRemito(estado.catalogo, presentacionId)\n      if (!r || !pr) return", a: "      const pr = presentacionRemito(estado.catalogo, presentacionId) ?? { id: presentacionId }\n      if (!r || !pr) return" },
    { nombre: 'con presentaciones apagadas', de: "        if (!prod || pr.activa === false) continue", a: '        if (!prod) continue' },
    { nombre: 'con productos apagados', de: "(cat?.productos ?? []).filter(p => p.activo !== false).map(p => [p.id, p])", a: '(cat?.productos ?? []).map(p => [p.id, p])' },
    { nombre: 'los insumos sin buscar', de: "lista: g.tipo === 'insumos' && !q ? [] : todas[g.tipo].filter(coincide)", a: 'lista: todas[g.tipo].filter(coincide)' },
    { nombre: 'omitir no hace nada', de: '      r.omitir = !!si\n', a: '' },
    { nombre: 'el omitido sin tachar', de: '<div class="ad-rm-renglon ad-rm-renglon--omitido" data-rm-renglon', a: '<div class="ad-rm-renglon" data-rm-renglon' },
    { nombre: 'el cliente apagado se elige', de: "      if (!f || !c || c.activo === false) return\n      f.clienteId = id", a: '      if (!f || !c) return\n      f.clienteId = id' },
    { nombre: 'el buscador con apagados', de: 'clientesParaAsentar(estado.clientes.filter(c => c.activo !== false), q)', a: 'clientesParaAsentar(estado.clientes, q)' },
    { nombre: 'sin permiso igual hay botones', de: "      if (!puedeEn('retiros', 'cargar', rm.fila?.unidad_negocio_id ?? estado.empresaId)) {", a: '      if (false) {' },
    // Lo que va a la base
    { nombre: 'el omitido va con revisar', de: "        revisar: r?.omitir === true ? false : r?.revisar === true,", a: '        revisar: r?.revisar === true,' },
    { nombre: 'sin omitir', de: "        omitir: r?.omitir === true,\n        nota: String(r?.nota ?? ''),", a: "        nota: String(r?.nota ?? '')," },
    { nombre: 'sin el talonario', de: ", p_talonario: f.talonario === 'acopio' ? 'acopio' : 'oficial',", a: ',' },
    { nombre: 'el talonario siempre oficial', de: "p_talonario: f.talonario === 'acopio' ? 'acopio' : 'oficial',", a: "p_talonario: 'oficial'," },
    { nombre: 'los lotes sin mayúsculas', de: "      return String(t ?? '').trim().toUpperCase()\n    }\n\n    function renglonDesdeItem", a: "      return String(t ?? '').trim()\n    }\n\n    function renglonDesdeItem" },
    { nombre: 'un insumo con marca', de: "        marca_id: pres ? (r.marcaId ?? null) : null,", a: '        marca_id: r?.marcaId ?? null,' },
    { nombre: 'vacíos como texto vacío', de: 'p_transporte: limpio(f.transporte) || null,', a: 'p_transporte: limpio(f.transporte),' },
    { nombre: 'lo faltante al revés', de: '      return { pedido, asignado, falta: pedido === null ? null : pedido - asignado }', a: '      return { pedido, asignado, falta: pedido === null ? null : asignado - pedido }' },
    // Confirmar, descartar, volver a leer
    { nombre: 'Confirmar no guarda primero', de: '        if (rm.sucio) await guardarRemitoEnBase(rm)\n', a: '' },
    { nombre: 'Confirmar guarda siempre', de: '        if (rm.sucio) await guardarRemitoEnBase(rm)\n', a: '        await guardarRemitoEnBase(rm)\n' },
    { nombre: 'el error de confirmar genérico', de: "        rm.mensaje = err?.message || 'No se pudo confirmar el remito. Probá de nuevo.'", a: "        rm.mensaje = 'No se pudo confirmar el remito. Probá de nuevo.'" },
    { nombre: 'sin "Descartar (ya ingresado)"', de: '        rm.yaIngresado = RE_YA_INGRESADO.test(rm.mensaje)\n', a: '' },
    { nombre: '"ya ingresado" con otro motivo', de: "      else if (a === 'ya-ingresado') descartarRemito('ya ingresado')", a: "      else if (a === 'ya-ingresado') descartarRemito('repetido')" },
    { nombre: 'confirmado no vuelve a Órdenes', de: "      estado.ordenes = null\n      if (estado.vista === 'ad-vista-remito') await mostrarOrdenes()", a: '      estado.ordenes = null' },
    { nombre: 'el aviso de confirmar sin la orden', de: "${res.codigo ? 'es la orden ' + res.codigo : 'ya es una orden'}", a: 'ya es una orden' },
    { nombre: 'el motivo sin mínimo', de: '      if (m.length < LARGO_MINIMO_MOTIVO_REMITO) {', a: '      if (m.length < 1) {' },
    { nombre: 'el motivo sin limpiar', de: "        const { error } = await supabase.rpc('descartar_remito_precarga', { p_id: rm.id, p_motivo: m })", a: "        const { error } = await supabase.rpc('descartar_remito_precarga', { p_id: rm.id, p_motivo: motivo })" },
    { nombre: 'el error de descartar genérico', de: "        const texto = err?.message || 'No se pudo descartar el remito. Probá de nuevo.'", a: "        const texto = 'No se pudo descartar el remito. Probá de nuevo.'" },
    { nombre: 'volver a leer con otra clave', de: "supabase.functions.invoke('ocr-remito', { body: { remito_id: rm.id } })", a: "supabase.functions.invoke('ocr-remito', { body: { id: rm.id } })" },
    { nombre: 'volver a leer no pisa el formulario', de: '          aplicarFilaRemito(rm, fila)\n          rm.aviso = fila.estado', a: '          rm.aviso = fila.estado' },
    { nombre: 'el error de la lectura se ignora', de: '        if (data?.error) throw new Error(String(data.error))\n', a: '' },
    { nombre: 'el error del cuerpo de la función se pierde', de: "        const cuerpo = await error?.context?.json?.()\n        if (cuerpo?.error) return String(cuerpo.error)", a: '        await error?.context?.json?.()' },
    { nombre: 'volver a leer sin avisar lo no guardado', de: "(rm.sucio ? ', también lo que corregiste y todavía no guardaste.' : '.')", a: "'.'" },
    { nombre: 'Órdenes sale sin avisar', de: '      if (rm?.sucio && !rm.saliendo && !rm.trabajando) {', a: '      if (false) {' },
    // La ficha y la hoja
    { nombre: 'la ficha sin el remito', de: "${remito ? `<p class=\"ad-orden-remito\" data-orden-remito>${esc(remito)}</p>` : ''}", a: '' },
    { nombre: 'la ficha sin el sello Acopio', de: '${htmlSelloOrden(o)}${htmlSelloEntre(o)}${htmlSelloAcopio(o)}</div><div class="ad-datos">', a: '${htmlSelloOrden(o)}${htmlSelloEntre(o)}</div><div class="ad-datos">' },
    { nombre: 'la hoja sin el N° de remito', de: "numeroRemito: limpio(o.numero_remito) || null, talonario: o.talonario === 'acopio' ? 'acopio' : null,", a: "numeroRemito: null, talonario: o.talonario === 'acopio' ? 'acopio' : null," },
    { nombre: 'la hoja sin el talonario', de: "numeroRemito: limpio(o.numero_remito) || null, talonario: o.talonario === 'acopio' ? 'acopio' : null,", a: 'numeroRemito: limpio(o.numero_remito) || null, talonario: null,' },
    { nombre: 'la orden se lee sin numero_remito', de: 'division_pct_a, numero_remito, talonario\')', a: 'division_pct_a\')' },
    { nombre: 'la lista se lee sin numero_remito', de: 'comision_modo, comision_importe, numero_remito, numero_remito_n, talonario\')', a: 'comision_modo, comision_importe\')' },
  ],
})
