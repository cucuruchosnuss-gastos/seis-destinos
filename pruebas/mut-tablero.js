// Mutaciones de test-tablero.js (la lógica del tablero de resúmenes,
// js/tablero.js). Ver mutar.js: suite verde sobre el limpio, ancla única, la
// mutación cambia el archivo y el sub-proceso leyó el mutado. De a una.
// Las anclas están en js/tablero.js: el runner las muta ahí (ARCHIVO_JS_TABLERO).
//
//   node pruebas/mut-tablero.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-tablero.js'),
  original: path.join(__dirname, '..', 'dashboard.html'),
  funciones: [],
  escape: 'escTab',
  manuales: [
    { nombre: 'una parada larga en minutos ("1.079 min")', de: '  if (m < 60) return `${m} min`\n', a: '  return `${m} min`\n' },
    // Fechas y saludo
    { nombre: 'hoy en UTC y no en Argentina', de: 'return new Date(+ahora - 3 * 60 * 60 * 1000)', a: 'return new Date(+ahora)' },
    { nombre: '"Buen día" hasta las 13 inclusive', de: "h < 13 ? 'Buen día'", a: "h <= 13 ? 'Buen día'" },
    { nombre: '"Buenas tardes" hasta las 20 inclusive', de: "h < 20 ? 'Buenas tardes'", a: "h <= 20 ? 'Buenas tardes'" },
    { nombre: 'la semana empieza el domingo', de: 'return sumarDias(iso, -((diaSemana(iso) + 6) % 7))', a: 'return sumarDias(iso, -diaSemana(iso))' },
    { nombre: 'sin nombre dice "Buen día, Mi cuenta"', de: "const pila = String(nombre ?? '').trim() ? nombreDePila(nombre) : ''", a: 'const pila = nombreDePila(nombre)' },
    // Plata
    { nombre: 'un dato ausente se vuelve "$ 0"', de: "  if (!esNumero(n)) return '—'\n  const pre", a: "  if (n === null) return '—'\n  const pre" },
    { nombre: 'los dólares sin "US$"', de: "moneda === 'USD' ? 'US$ '", a: "moneda === 'USD' ? '$ '" },
    { nombre: 'la plata con decimales', de: "return pre + formatearNumeroAr(Math.round(Number(n)), { decimales: 0 })", a: "return pre + formatearNumeroAr(Number(n), { decimales: 2 })" },
    // Qué tarjetas
    { nombre: 'Seguridad para cualquiera', de: "if (c === 'seguridad') { if (ctx?.esSuperAdmin) out.push({ ...SEGURIDAD_TABLERO }); continue }", a: "if (c === 'seguridad') { out.push({ ...SEGURIDAD_TABLERO }); continue }" },
    { nombre: 'Empleados repetida al lado de Accesos', de: "    if (c === 'empleados' && claves.has('accesos')) continue\n", a: '' },
    { nombre: 'una tablet va a la gestión', de: 'url: (esDispositivo && m.urlDispositivo) || m.url', a: 'url: m.url' },
    { nombre: 'Producción mediana por defecto', de: "  produccion: 'ancha', cobranzas: 'mediana',", a: "  produccion: 'mediana', cobranzas: 'mediana'," },
    { nombre: 'un tamaño inventado se acepta', de: "  return TAMANOS.includes(t) ? t : (TAMANOS_POR_DEFECTO[clave] ?? 'chica')", a: "  return t || (TAMANOS_POR_DEFECTO[clave] ?? 'chica')" },
    { nombre: 'mover se sale de la lista', de: 'const j = Math.max(0, Math.min(lista.length - 1, i + delta))', a: 'const j = i + delta' },
    { nombre: '"Volver a como venía" borra lo usado', de: "  p.tablero = { orden: [], tamanos: {}, ocultas: [] }\n  return p", a: "  p.tablero = { orden: [], tamanos: {}, ocultas: [] }\n  p.uso = {}\n  return p" },
    { nombre: 'esconder no esconde', de: '  if (oculta) s.add(clave); else s.delete(clave)', a: '  s.delete(clave)' },
    // Fábricas
    { nombre: 'la fábrica elegida no filtra', de: '  return elegida ? ids.filter(id => id === elegida) : ids', a: '  return ids' },
    { nombre: 'una tarea sin alcance suma todas', de: "      if (!a || typeof a !== 'object') continue\n      if (a.todas === true)", a: "      if (!a || typeof a !== 'object') { for (const x of todas) s.add(x); continue }\n      if (a.todas === true)" },
    // Pendientes y franja
    { nombre: 'el cero cuenta', de: '    if (!Number.isInteger(n) || n <= 0) continue\n    const k = ', a: '    if (!Number.isInteger(n) || n < 0) continue\n    const k = ' },
    { nombre: 'un renglón va a cualquier tarjeta', de: '    if (destino !== clave) continue\n', a: '' },
    { nombre: 'las cobranzas por asentar dejan de ser urgentes', de: "url: 'modulos/administracion.html?seccion=cobranzas', urgente: true, franja: 'cobranzas por asentar'", a: "url: 'modulos/administracion.html?seccion=cobranzas', franja: 'cobranzas por asentar'" },
    { nombre: 'la franja muestra 5', de: '.slice(0, 4)\n}', a: '.slice(0, 5)\n}' },
    { nombre: 'la franja repite', de: '      const k = r.origen || r.t\n', a: '      const k = Math.random()\n' },
    { nombre: 'la franja toma una tarjeta en error', de: "    if (!m || m.estado !== 'ok' && m.estado !== 'vacio') continue", a: '    if (!m) continue' },
    { nombre: 'la franja toma lo no urgente', de: "      if (!r.urgente || !(r.n !== null && r.n !== undefined && r.n !== '')) continue", a: "      if (!(r.n !== null && r.n !== undefined && r.n !== '')) continue" },
    { nombre: 'la franja en otro orden', de: '  return [...vistos.values()].sort((a, b) => pos(a.origen) - pos(b.origen)).slice(0, 4)', a: '  return [...vistos.values()].slice(0, 4)' },
    // Gastos
    { nombre: 'gastos: suma los anulados', de: "(filas ?? []).filter(g => g?.estado !== 'anulado' && pasaFiltroUnidad(g.unidad_negocio_id, elegida))", a: '(filas ?? []).filter(g => pasaFiltroUnidad(g.unidad_negocio_id, elegida))' },
    { nombre: 'gastos: no filtra por fábrica', de: "(filas ?? []).filter(g => g?.estado !== 'anulado' && pasaFiltroUnidad(g.unidad_negocio_id, elegida))", a: "(filas ?? []).filter(g => g?.estado !== 'anulado')" },
    { nombre: 'gastos: no avisa que ve solo los suyos', de: "ctx.tieneTarea('gastos:ver_exportar') ? null : 'Ves solo los gastos que cargaste.'", a: 'null' },
    { nombre: 'gastos: suma dólares con pesos', de: "const enPesos = vivos.filter(g => !g.moneda || g.moneda === 'ARS')", a: 'const enPesos = vivos' },
    { nombre: 'gastos: sin tope', de: ".gte('fecha', desde).lte('fecha', hoy).limit(TOPE_FILAS))\n  const vivos", a: ".gte('fecha', desde).lte('fecha', hoy))\n  const vivos" },
    // Caja
    { nombre: 'caja: un traspaso cuenta como entrada y salida', de: "    if (t.endsWith('_traspaso')) continue\n", a: '' },
    { nombre: 'caja: la de la empresa para cualquiera', de: '  if (ctx.esSuperAdmin) {\n    try {', a: '  if (true) {\n    try {' },
    { nombre: 'caja: la de la empresa no sigue a la fábrica', de: ".filter(c => pasaFiltroUnidad(c.unidad_negocio_id, elegida))\n        const porCuenta", a: '\n        const porCuenta' },
    // Cobranzas
    { nombre: 'cobranzas: siempre de todas las fábricas', de: '{ p_unidad: elegida || null, ...p }', a: '{ p_unidad: null, ...p }' },
    { nombre: 'cobranzas: una por controlar tiene la fábrica de la columna', de: "c.estado === 'registrada' ? null : c.unidad_negocio_id", a: 'c.unidad_negocio_id' },
    { nombre: 'cobranzas: un total null es "sin datos"', de: "estado: totalHoy === 0 ? 'vacio' : 'ok'", a: "estado: !totalHoy ? 'vacio' : 'ok'" },
    { nombre: 'cobranzas: suma las anuladas por chofer', de: "    if (c.estado === 'anulada') continue\n", a: '' },
    // Cheques
    { nombre: 'cheques: el plazo de un común desde el pago', de: "const base = ch?.tipo === 'diferido' ? ch.fecha_pago : ch?.fecha_emision", a: 'const base = ch?.fecha_pago' },
    { nombre: 'cheques: vencen esta semana no es urgente', de: "url: 'modulos/administracion.html?seccion=cheques', urgente: true,", a: "url: 'modulos/administracion.html?seccion=cheques', urgente: false," },
    { nombre: 'cheques: plazo sin ponderar por importe', de: 'pond += Math.max(0, pago ? diasEntre(hoy, pago) : 0) * (num(ch.importe) ?? 0)', a: 'pond += Math.max(0, pago ? diasEntre(hoy, pago) : 0)' },
    // Cuentas corrientes
    { nombre: 'cuentas corrientes: suma dólares', de: "    if ((f.moneda ?? 'ARS') !== 'ARS' || !pasaFiltroUnidad(f.unidad_negocio_id, elegida)) continue", a: '    if (!pasaFiltroUnidad(f.unidad_negocio_id, elegida)) continue' },
    // Producción
    { nombre: 'producción: las paradas no van primero', de: '  maquinas.sort((a, b) => orden[a.tipo] - orden[b.tipo])\n', a: '' },
    { nombre: 'producción: el peor lote con 10 % justo', de: 'dif !== null && dif < -10 &&', a: 'dif !== null && dif <= -10 &&' },
    { nombre: 'producción: la máquina parada abre en la tabla', de: "url: 'modulos/produccion-gestion.html?vista=indicadores', urgente: true", a: "url: 'modulos/produccion-gestion.html', urgente: true" },
    { nombre: 'producción: las planillas abren en la tabla', de: "url: 'modulos/produccion-gestion.html?vista=pendientes', origen", a: "url: 'modulos/produccion-gestion.html', origen" },
    { nombre: 'producción: el peor lote abre en la tabla', de: "t: 'de harina es el que peor rinde', url: 'modulos/produccion-gestion.html?vista=indicadores'", a: "t: 'de harina es el que peor rinde', url: 'modulos/produccion-gestion.html'" },
    { nombre: 'producción: los conos abren en la tabla', de: "url: 'modulos/produccion-gestion.html?vista=conos' }", a: "url: 'modulos/produccion-gestion.html' }" },
    { nombre: 'producción: máquina parada no es urgente', de: "url: 'modulos/produccion-gestion.html?vista=indicadores', urgente: true, origen: 'produccion:paradas'", a: "url: 'modulos/produccion-gestion.html?vista=indicadores', urgente: false, origen: 'produccion:paradas'" },
    { nombre: 'producción: una planilla por completar cuenta como andando', de: "tipo: 'neutro' }); continue }", a: "tipo: 'neutro' }) }" },
    { nombre: 'producción: el scrap con masa 0 da "0 %"', de: "masaKg > 0 ? `${formatearNumeroAr(scrap / masaKg * 100, { decimales: 1, minimos: 1 })} %` : '—'", a: "`${formatearNumeroAr(masaKg ? scrap / masaKg * 100 : 0, { decimales: 1, minimos: 1 })} %`" },
    { nombre: 'producción: la tendencia al revés', de: 'sube: dif > 0, igual: dif === 0', a: 'sube: dif >= 0, igual: false' },
    { nombre: 'producción: el nombre de la fábrica siempre', de: "const varias = res.filter(({ d }) => (d?.ahora ?? []).length).length > 1", a: 'const varias = ids.length > 1' },
    // Pedidos
    { nombre: 'pedidos: cuenta los entregados', de: "p && p.estado !== 'entregado' && p.estado !== 'anulado'", a: "p && p.estado !== 'anulado'" },
    { nombre: 'pedidos: hoy cuenta como atrasado', de: 'abiertos.filter(p => p.fecha_entrega && p.fecha_entrega < hoy).length', a: 'abiertos.filter(p => p.fecha_entrega && p.fecha_entrega <= hoy).length' },
    { nombre: 'pedidos: la semana sin el domingo', de: 'const lunes = lunesDe(hoy), domingo = sumarDias(lunes, 6)', a: 'const lunes = lunesDe(hoy), domingo = sumarDias(lunes, 5)' },
    // Retiros, Administración, Taller
    { nombre: 'retiros: lee las órdenes sin retiros:ver', de: "  if (!ctx.tieneTarea('retiros:ver')) {", a: '  if (false) {' },
    { nombre: 'retiros: suma las anuladas', de: "    .filter(o => o.estado === 'confirmada' && pasaFiltroUnidad(o.unidad_negocio_id, elegida))", a: '    .filter(o => pasaFiltroUnidad(o.unidad_negocio_id, elegida))' },
    { nombre: 'administración: suma los saldos a favor', de: 'const deben = clientes.filter(c => (num(c.saldo) ?? 0) > 0)', a: 'const deben = clientes.filter(c => num(c.saldo) !== null)' },
    { nombre: 'administración: el cobrado con el signo al revés', de: 'reduce((s, m) => s - (num(m.importe) ?? 0), 0)', a: 'reduce((s, m) => s + (num(m.importe) ?? 0), 0)' },
    { nombre: 'administración: pide los apagados', de: 'p_incluir_apagados: false', a: 'p_incluir_apagados: true' },
    { nombre: 'administración: un cobrado ilegible es $ 0', de: '  } catch { cobrado = null }', a: '  } catch { cobrado = 0 }' },
    { nombre: 'taller: los precios sin permiso', de: "const conPrecios = ctx.tieneTarea('taller:precios')", a: 'const conPrecios = true' },
    { nombre: 'taller: no sigue a la fábrica', de: "!fabrica || fabrica === 'Taller' ||", a: 'true ||' },
    { nombre: 'taller: atrasados no es urgente', de: "url: 'modulos/taller.html', urgente: true, origen: 'taller:atrasados'", a: "url: 'modulos/taller.html', urgente: false, origen: 'taller:atrasados'" },
    { nombre: 'accesos: cuenta tablets y la Empresa', de: 'const usuarios = reales.filter(p => p.tiene_acceso === true).length', a: 'const usuarios = personas.filter(p => p.tiene_acceso === true).length' },
    { nombre: 'accesos: muestra el robot de la fábrica de pruebas', de: "sinPersonasDePrueba(await consulta(ctx.sb.from('v_empleados_publico').select('id, activo, tipo, tiene_acceso, unidad_negocio_id')) ?? [], ctx.fabrica)", a: "(await consulta(ctx.sb.from('v_empleados_publico').select('id, activo, tipo, tiene_acceso, unidad_negocio_id')) ?? [])" },
    // Cada tarjeta por separado
    { nombre: 'una tarjeta que falla tumba a las demás', de: "  try { m = await fn(ctx) } catch (err) {\n    try { console.error(`tablero: ${clave}`, err) } catch { /* sin consola */ }\n    return { estado: 'error' }\n  }", a: '  m = await fn(ctx)' },
    { nombre: 'la respuesta vieja pisa la nueva', de: '  if (estado.turnos.get(clave) !== turno) return false\n', a: '' },
    { nombre: 'al refrescar parpadea "Cargando…"', de: "  if (mostrarCargando || !estado.modelos.has(clave)) { estado.modelos.set(clave, { estado: 'cargando' }); pintar(clave) }", a: "  estado.modelos.set(clave, { estado: 'cargando' }); pintar(clave)" },
    { nombre: 'sin mis_pendientes no avisa', de: '    else m.pendError = true\n', a: '' },
    // La pantalla
    { nombre: 'no recarga al cambiar la fábrica', de: "alCambiarUnidad(({ elegida }) => { estado.elegida = elegida ?? null; cargarTodo({ mostrarCargando: true }) })", a: 'alCambiarUnidad(() => {})' },
    { nombre: 'no avisa a la barra lateral', de: "    try { win.dispatchEvent(new CustomEvent('preferencias:cambio')) } catch { /* sin eventos */ }\n", a: '' },
  ],
})
