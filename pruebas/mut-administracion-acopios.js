// Mutaciones de test-administracion-acopios.js (los acopios en
// Administración, la cuenta en el grupo y "(también en Nuss)", 27/10/2026;
// el saldo en la revisión de un remito se mudó a mut-remitos-dolce-acopio.js
// el 28/10/2026): mutan
// modulos/administracion.html, que la suite recibe por ARCHIVO_TEST. Ver
// mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que dar ROJO sobre la
// Administración de ANTES del cambio (BASE = 5e6ca2b, de donde salió la rama
// ci-prueba/acopios). Nunca HEAD.
//
//   node pruebas/mut-administracion-acopios.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-acopios.js')
const BASE = '5e6ca2b'

if (!process.env.MUT_SOLO_ANCLAS) {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-administracion-acopios.html')
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
  funciones: ['htmlTarjetaAcopio', 'htmlFiltroAcopios', 'htmlListaAcopios', 'htmlBarraAcopio', 'htmlClientesAcopio', 'htmlClienteAcopio', 'htmlOpcionesAcopio',
    'htmlMarcasAcopio', 'htmlProductoAcopio', 'htmlNuevoAcopio', 'htmlMovimientoAcopio', 'htmlAnularAcopio', 'htmlDetalleAcopio', 'htmlAcopiosCliente',
    'htmlCuentaGrupo', 'pintarAcopios'],
  equivalentes: [
    { expr: 'esc(pct)', motivo: 'un número de 0 a 100 calculado acá (porcentajeAcopio)' },
    { expr: 'esc(est)', motivo: 'un estado de ESTADOS_ACOPIO (constante): estadoAcopio() nunca devuelve otra cosa' },
    { expr: "esc('Activos (' + activos.length + ')')", motivo: 'texto constante con un número' },
    { expr: "esc('Terminados (' + terminados.length + ')')", motivo: 'texto constante con un número' },
    { expr: "esc('Anulados (' + anulados.length + ')')", motivo: 'texto constante con un número' },
    { expr: "esc(ac.clienteId ? 'Ese cliente no tiene acopios.' : 'Todavía no hay acopios en esta fábrica.')", motivo: 'texto constante' },
    { expr: "esc('Escribí al menos ' + MIN_LETRAS_BUSCAR + ' letras para buscar el cliente.')", motivo: 'texto constante con una constante numérica' },
    { expr: 'esc(g.titulo)', motivo: 'un título constante de GRUPOS_REMITO' },
    { expr: 'esc(n.fecha)', motivo: 'una fecha del <input type="date"> (el navegador solo deja AAAA-MM-DD) o la de hoy' },
    { expr: 'esc(hoyArgentina())', motivo: 'la fecha de hoy, armada acá con Intl' },
    { expr: 'esc(textoTotalAcopio(n))', motivo: 'texto constante con un importe formateado por importeHoja()' },
    { expr: 'esc(textoQuedanAcopio(a))', motivo: 'texto constante con dos números formateados por enteroHoja()' },
    { expr: 'esc(textoQuedanAcopio(x))', motivo: 'texto constante con dos números formateados por enteroHoja()' },
    { expr: 'esc(fechaCorta(m.fecha))', motivo: 'una fecha formateada por fechaCorta() (o "—")' },
    { expr: "esc((cajas < 0 ? '−' : '+') + enteroHoja(Math.abs(cajas)) + (Math.abs(cajas) === 1 ? ' caja' : ' cajas'))", motivo: 'un número formateado con texto constante' },
    { expr: 'esc(importeHoja(centavos / 100))', motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(ac.error)', motivo: 'texto constante: lo pone cargarAcopios() (nunca el de la base)' },
    { expr: 'esc(det.error)', motivo: 'texto constante: lo pone abrirAcopio() (nunca el de la base)' },
    { expr: 'esc(det.aviso)', motivo: 'texto constante: lo pone confirmarAnularAcopio()' },
    { expr: 'esc(a.error)', motivo: 'texto constante: lo pone cargarAcopiosCliente()' },
    { expr: 'esc(g.error)', motivo: 'texto constante: lo pone cargarCuentaGrupo()' },
    { expr: 'esc(f.unidad_negocio_id)', motivo: 'el id de una empresa que ya está en estado.empresas (el link solo sale si empresasDeAdministracion() la tiene)' },
    { expr: "esc(a.precio_caja !== null && a.precio_caja !== undefined && Number(a.precio_caja) > 0 ? 'Lo que se le cargó en la cuenta al cliente se revierte.' : 'No tiene nada cargado en la cuenta del cliente.')", motivo: 'texto constante' },  ],
  manuales: [
    // La sección: dónde y para quién
    { nombre: 'la sección en todas las fábricas', de: ", solo: (u) => acopiosEnEmpresa(u) },", a: ' },' },
    { nombre: 'seccionVisible ignora solo', de: "      if (typeof s.solo === 'function' && s.solo(unidadId) !== true) return false\n", a: '' },
    { nombre: 'Nuss con acopios no la ve', de: '(sinControlStockEmpresa(unidadId) || estado.hayAcopios?.get?.(unidadId) === true)', a: 'sinControlStockEmpresa(unidadId)' },
    { nombre: 'pregunta siempre si hay acopios', de: '      if (sinControlStockEmpresa(unidadId) || estado.hayAcopios?.has?.(unidadId)) return\n', a: '' },
    { nombre: 'la pestaña no abre la sección', de: "      else if (id === 'acopios') mostrarAcopios()\n", a: '' },
    { nombre: 'la portada no cuenta los acopios', de: '      contarAcopiosPortada(p, turno, unidad)\n', a: '' },
    { nombre: 'la portada cuenta también los no activos', de: "      const activos = filas ? filas.filter(a => estadoAcopio(a) === 'activo') : []", a: '      const activos = filas ?? []' },
    // El listado
    { nombre: 'acopios_lista sin el cliente', de: "      const { data, error } = await supabase.rpc('acopios_lista', { p_unidad_negocio_id: unidadId, p_cliente_id: clienteId })", a: "      const { data, error } = await supabase.rpc('acopios_lista', { p_unidad_negocio_id: unidadId, p_cliente_id: null })" },
    { nombre: 'los anulados abiertos', de: '<details class="ad-acopios-anulados" data-acopios-anulados>', a: '<details class="ad-acopios-anulados" data-acopios-anulados open>' },
    { nombre: 'quedan = lo retirado', de: 'Quedan ${enteroHoja(cajasAcopio(a?.saldo))}', a: 'Quedan ${enteroHoja(cajasAcopio(a?.retiradas))}' },
    { nombre: 'la barra al revés', de: 'Math.round(cajasAcopio(a?.retiradas) / total * 100)', a: 'Math.round(cajasAcopio(a?.saldo) / total * 100)' },
    { nombre: 'el filtro no filtra', de: '      return ac?.clienteId ? filas.filter(a => a.cliente_id === ac.clienteId) : filas', a: '      return filas' },
    { nombre: 'el anulado dice cuánto queda', de: "(est === 'anulado' ? '' : `<span class=\"ad-acopio__quedan\">", a: "(false ? '' : `<span class=\"ad-acopio__quedan\">" },
    // Nuevo acopio
    { nombre: 'Nuevo acopio sin permiso', de: '      if (!ac || !puedeCargarAcopio()) return\n      const n = nuevoAcopioVacio()', a: '      if (!ac) return\n      const n = nuevoAcopioVacio()' },
    { nombre: 'el botón sin permiso', de: "puedeCargarAcopio() && !ac.nuevo ? '<div class=\"ad-barra-acciones\">", a: "!ac.nuevo ? '<div class=\"ad-barra-acciones\">" },
    { nombre: 'los insumos en el selector', de: ".filter(g => g.tipo !== 'insumos')", a: '' },
    { nombre: 'un apagado se elige', de: '      if (!n || !c || c.activo === false) return\n      n.clienteId = id', a: '      if (!n || !c) return\n      n.clienteId = id' },
    { nombre: 'sin pedir el cono', de: "      if (pr.con_cono && !n.marcaId) return 'Elegí el cono.'\n", a: '' },
    { nombre: 'cajas con decimales', de: '!Number.isInteger(cajas) || cajas <= 0', a: '!(cajas > 0)' },
    { nombre: 'fecha futura', de: "      if (n.fecha > hoyArgentina()) return 'La fecha no puede ser futura.'\n", a: '' },
    { nombre: 'el cono viaja sin cono', de: 'p_marca_id: pr?.con_cono ? (n.marcaId ?? null) : null,', a: 'p_marca_id: n.marcaId ?? null,' },
    { nombre: 'el remito sin limpiar', de: 'p_numero_remito: limpio(n.numeroRemito) || null,', a: 'p_numero_remito: n.numeroRemito,' },
    { nombre: 'la factura sin limpiar', de: 'p_numero_factura: limpio(n.numeroFactura) || null,', a: 'p_numero_factura: n.numeroFactura,' },
    { nombre: 'sin precio va 0', de: 'p_precio_caja: Number.isFinite(precio) ? precio : null,', a: 'p_precio_caja: Number.isFinite(precio) ? precio : 0,' },
    { nombre: 'precio negativo pasa', de: "      if (n.precio !== null && n.precio !== undefined && !(Number(n.precio) >= 0)) return 'El precio no puede ser negativo.'\n", a: '' },
    { nombre: 'el error de crear genérico', de: "        n.error = err?.message || 'No se pudo cargar el acopio. Probá de nuevo.'", a: "        n.error = 'No se pudo cargar el acopio. Probá de nuevo.'" },
    { nombre: 'guardado no relee', de: '      ac.filas = null\n      pintarAcopios()\n      await cargarAcopios()', a: '      pintarAcopios()' },
    { nombre: 'el total sin las cajas', de: '      return Math.round(cajas * precio * 100) / 100', a: '      return Math.round(precio * 100) / 100' },
    { nombre: 'un campo cualquiera se escribe', de: "        if (!['fecha', 'numeroRemito', 'numeroFactura', 'observaciones'].includes(d.acCampo)) return\n", a: '' },
    // El detalle
    { nombre: 'los movimientos de cualquier acopio', de: ".eq('acopio_id', id).order('fecha')", a: ".order('fecha')" },
    { nombre: 'N° de acopio en la orden oficial', de: "o?.talonario === 'acopio' && limpio(o?.numero_remito)", a: 'limpio(o?.numero_remito)' },
    { nombre: 'todo en negativo', de: "(cajas < 0 ? '−' : '+')", a: "'−'" },
    { nombre: 'Anular con retiros', de: "estadoAcopio(a) !== 'anulado' && cajasAcopio(a.retiradas) === 0 && puedeCargarAcopio()", a: "estadoAcopio(a) !== 'anulado' && puedeCargarAcopio()" },
    { nombre: 'Anular sin retiros:precios', de: "      if (estadoAcopio(a) === 'anulado' || !puedeCargarAcopio()) return ''", a: "      if (estadoAcopio(a) === 'anulado') return ''" },
    { nombre: 'el motivo sin mínimo', de: '      if (motivo.length < LARGO_MINIMO_MOTIVO) { n.error', a: '      if (motivo.length < 1) { n.error' },
    { nombre: 'el motivo sin limpiar', de: "{ p_id: det.id, p_motivo: motivo }", a: '{ p_id: det.id, p_motivo: n.motivo }' },
    { nombre: 'el error de anular genérico', de: "        n.error = err?.message || 'No se pudo anular el acopio. Probá de nuevo.'", a: "        n.error = 'No se pudo anular el acopio. Probá de nuevo.'" },
    { nombre: 'la lista no se entera de la anulación', de: "        estado.acopios.filas = estado.acopios.filas.map(a => a.id === det.id ? { ...a, estado: 'anulado' } : a)\n", a: '' },
    // La cuenta del cliente
    { nombre: 'la cuenta con todos los acopios', de: "        c.acopios = { filas: filas.filter(a => estadoAcopio(a) === 'activo'), error: null }", a: '        c.acopios = { filas, error: null }' },
    { nombre: 'la cuenta busca acopios en cualquier fábrica', de: "        if (!acopiosEnEmpresa(unidad) || (!puedeEn('retiros', 'ver', unidad)", a: "        if ((!puedeEn('retiros', 'ver', unidad)" },
    { nombre: 'la cuenta sin los acopios', de: "        `${pasa ? '<div class=\"ad-aviso ad-aviso--grave\">Pasa su límite de crédito.</div>' : ''}</div>` + htmlAcopiosCliente(c)", a: "        `${pasa ? '<div class=\"ad-aviso ad-aviso--grave\">Pasa su límite de crédito.</div>' : ''}</div>`" },
    { nombre: 'la cuenta sin el grupo', de: '      const cabecera = htmlCuentaGrupo(c, cli) + extras +', a: '      const cabecera = extras +' },
    { nombre: 'el vinculado con una sola cuenta no la ve', de: "      if (!(filas.length > 1 || (vinculado && filas.length))) return ''", a: "      if (!(filas.length > 1)) return ''" },
    { nombre: 'cualquiera con una sola cuenta la ve', de: "      if (!(filas.length > 1 || (vinculado && filas.length))) return ''", a: "      if (!filas.length) return ''" },
    { nombre: 'la propia es un link', de: '        if (f.cliente_id === c.id) return `<strong>${esc(texto)}</strong>`\n', a: '' },
    { nombre: 'sin mirar la barra de arriba', de: '        const abre = (!estado.unidadBarra || estado.unidadBarra === f.unidad_negocio_id) && ', a: '        const abre = ' },
    { nombre: 'el error del grupo a cualquiera', de: "      if (g.error) return vinculado ? `<p class=\"ad-texto-suave\">${esc(g.error)}</p>` : ''", a: "      if (g.error) return `<p class=\"ad-texto-suave\">${esc(g.error)}</p>`" },
    { nombre: '"También es cliente de…" repite', de: '      if (enGrupo.size && Array.isArray(c.otras?.filas)) c.otras = { ...c.otras, filas: c.otras.filas.filter(f => !enGrupo.has(f.cliente_id)) }\n', a: '' },
    { nombre: 'el total sumando mal', de: 's + Math.round((Number(f.saldo) || 0) * 100), 0)', a: 's + Math.trunc(Number(f.saldo) || 0) * 100, 0)' },
    { nombre: 'sin las etiquetas de acopio', de: "      acopio: 'Acopio', anulacion_acopio: 'Anulación de acopio',\n", a: '' },
    // "(también en Nuss)"
    { nombre: 'siempre "otra empresa del grupo"', de: "      return ` (también en ${e ? nombreCorto(e) : 'otra empresa del grupo'})`", a: "      return ' (también en otra empresa del grupo)'" },
    { nombre: 'el principal de la misma empresa también', de: "      if (u && u === estado.empresaId) return ''\n", a: '' },
    { nombre: 'los principales sin recordar', de: '      const faltan = ids.filter(id => !estado.principales.has(id))', a: '      const faltan = ids' },
    { nombre: 'la lista de Clientes sin "(también en…)"', de: '${esc((c.nombre ?? \'\') + textoTambienEn(fichaCliente(c.cliente_id)))}', a: "${esc(c.nombre ?? '')}" },
    { nombre: 'el buscador del acopio sin "(también en…)"', de: 'data-ac-cliente="${esc(c.id)}">` +\n          `<span class="ad-opcion-cliente__nombre">${esc(limpio(c.nombre) + textoTambienEn(c) + (apodo',
      a: 'data-ac-cliente="${esc(c.id)}">` +\n          `<span class="ad-opcion-cliente__nombre">${esc(limpio(c.nombre) + (apodo' },
    { nombre: 'leerClientes sin cliente_principal_id', de: 'pct_parte_a, cliente_principal_id, comision_habitual', a: 'pct_parte_a, comision_habitual' },
  ],
})
