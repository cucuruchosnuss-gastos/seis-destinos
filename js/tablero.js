// EL TABLERO DE RESÚMENES (29/09/2026, handoff "Esqueleto", Parte 2 de la
// tanda del sistema visual). Reemplaza a la grilla vieja "Módulos · Abrir →"
// de dashboard.html: una tarjeta por módulo con su número grande, su contexto
// y "lo que hay que resolver", el saludo, la franja "Para resolver ya", la
// pantalla Personalizar (dashboard.html?vista=personalizar) y el modo acomodar.
//
// SÉPTIMA EXCEPCIÓN a la regla de duplicar (ver CLAUDE.md, Arquitectura): el
// tablero lee datos de catorce módulos y es la única pantalla que junta todo,
// así que su lógica vive UNA vez acá (módulo ES) y no dentro de dashboard.html,
// para poder EJECUTARLA en las suites (pruebas/test-tablero*.js) con datos
// falsos. Lo usa solo el dashboard.
//
// Las reglas, en un solo lugar:
// - Cada persona ve SOLO las tarjetas de los módulos que puede abrir: la misma
//   regla de la barra lateral (moduloVisible de js/modulos.js). Seguridad,
//   solo un super_admin.
// - Cada tarjeta pide sus datos POR SEPARADO: si una falla dice "No se pudo
//   cargar" con Reintentar, y las otras siguen.
// - La fábrica elegida arriba (js/barra-unidad.js) filtra; "Todas" suma.
// - Un dato ausente es "—", nunca "$ 0". La plata sin decimales ("$ 1.234.567",
//   "US$ 2.350").
// - Todo texto de la base se escapa (escTab).
// - Lo que la base no tiene se dice "Pronto" en esa parte de la tarjeta; no se
//   inventa (la lista de funciones de base que faltan está en el traspaso).
// - Las preferencias (orden, tamaño, escondidas) son las de js/preferencias.js:
//   se guardan en este dispositivo hasta que la base tenga dónde.

import { MODULOS, moduloVisible, colorDeModulo } from './modulos.js'
import { formatearNumeroAr, sinPersonasDePrueba, cargarFabricaDePruebas, FABRICA_SIN_DATOS } from './utils.js'
import { pasaFiltroUnidad, nombreDePila, unidadesDeLaBarra, alCambiarUnidad } from './barra-unidad.js'
import { htmlIcono, modulosDeBarra } from './barra-lateral.js'
import { TAMANOS, normalizarPrefs, leerPrefs, guardarPrefs, ordenarBarra } from './preferencias.js'

// ═══ El catálogo del tablero ══════════════════════════════════════════════
// El orden por defecto (el de la pantalla 1a del diseño) y los tamaños por
// defecto del dueño: Producción ancha; Cobranzas, Caja, Gastos,
// Administración, Cuentas corrientes, Stock y Proyectos Taller medianas; el
// resto chicas.
export const ORDEN_TABLERO = ['produccion', 'cobranzas', 'caja', 'gastos', 'cheques', 'pedidos', 'administracion',
  'cuentas-corrientes', 'stock', 'materia-prima', 'retiros', 'taller', 'accesos', 'empleados', 'seguridad']

export const TAMANOS_POR_DEFECTO = {
  produccion: 'ancha', cobranzas: 'mediana', caja: 'mediana', gastos: 'mediana', administracion: 'mediana',
  'cuentas-corrientes': 'mediana', stock: 'mediana', taller: 'mediana',
}

// Lo que no es un módulo del catálogo (o se llama distinto en el tablero).
export const SEGURIDAD_TABLERO = { clave: 'seguridad', nombre: 'Seguridad', url: 'modulos/administracion.html?seccion=seguridad' }
export const NOMBRE_TARJETA = { accesos: 'Accesos y empleados' }

export function escTab(texto) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Las tarjetas que esta persona puede ver, en el orden por defecto. La de
// Empleados sola aparece solo si no ve Accesos (la de Accesos ya los cuenta).
export function tarjetasPosibles(ctx, esDispositivo = false) {
  const vis = MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx))
  const claves = new Set(vis.map(m => m.clave))
  const out = []
  for (const c of ORDEN_TABLERO) {
    if (c === 'seguridad') { if (ctx?.esSuperAdmin) out.push({ ...SEGURIDAD_TABLERO }); continue }
    if (!claves.has(c)) continue
    if (c === 'empleados' && claves.has('accesos')) continue
    const m = vis.find(x => x.clave === c)
    out.push({ clave: c, nombre: NOMBRE_TARJETA[c] ?? m.nombre, url: (esDispositivo && m.urlDispositivo) || m.url })
  }
  // Un módulo nuevo que no está en ORDEN_TABLERO va al final (no desaparece).
  for (const m of vis) if (!ORDEN_TABLERO.includes(m.clave)) out.push({ clave: m.clave, nombre: m.nombre, url: m.url })
  return out
}

export function tamanoDe(clave, prefs) {
  const t = prefs?.tablero?.tamanos?.[clave]
  return TAMANOS.includes(t) ? t : (TAMANOS_POR_DEFECTO[clave] ?? 'chica')
}

// Las tarjetas en el orden de la persona (las que eligió primero, en su orden;
// las demás atrás, en el orden por defecto), con su tamaño y si está escondida.
export function tarjetasOrdenadas(posibles, prefs) {
  const p = normalizarPrefs(prefs)
  const pos = new Map(p.tablero.orden.map((c, i) => [c, i]))
  const idx = new Map(posibles.map((t, i) => [t.clave, i]))
  const ocultas = new Set(p.tablero.ocultas)
  return [...posibles]
    .sort((a, b) => (pos.get(a.clave) ?? 1000 + idx.get(a.clave)) - (pos.get(b.clave) ?? 1000 + idx.get(b.clave)))
    .map(t => ({ ...t, tamano: tamanoDe(t.clave, p), oculta: ocultas.has(t.clave) }))
}

// ── Cambios de preferencias (puros: devuelven otras preferencias) ─────────
export function conTamano(prefs, clave, tamano) {
  const p = normalizarPrefs(prefs)
  if (TAMANOS.includes(tamano)) p.tablero.tamanos[clave] = tamano
  return p
}
export function conOculta(prefs, clave, oculta) {
  const p = normalizarPrefs(prefs)
  const s = new Set(p.tablero.ocultas)
  if (oculta) s.add(clave); else s.delete(clave)
  p.tablero.ocultas = [...s]
  return p
}
export function conOrden(prefs, orden) {
  const p = normalizarPrefs(prefs)
  p.tablero.orden = [...new Set(orden)]
  return p
}
// Mueve `clave` `delta` lugares dentro de `orden` (sin salirse de la lista).
export function moverClave(orden, clave, delta) {
  const lista = [...orden]
  const i = lista.indexOf(clave)
  if (i === -1) return lista
  const j = Math.max(0, Math.min(lista.length - 1, i + delta))
  if (j === i) return lista
  lista.splice(i, 1)
  lista.splice(j, 0, clave)
  return lista
}
// "Volver a como venía": la barra y el tablero de fábrica. Lo usado se queda
// (es la cuenta de "los que más uso", no una preferencia).
export function prefsDeFabrica(prefs) {
  const p = normalizarPrefs(prefs)
  p.barra = { orden: 'mano', manual: [], fijados: [] }
  p.tablero = { orden: [], tamanos: {}, ocultas: [] }
  return p
}

// ═══ Fechas (hora de Argentina: UTC-3 fijo, sin horario de verano) ═══════
const MS_DIA = 24 * 60 * 60 * 1000
export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const MESES_TABLERO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function relojAr(ahora) {
  return new Date(+ahora - 3 * 60 * 60 * 1000)
}
export function hoyAr(ahora = new Date()) {
  return relojAr(ahora).toISOString().slice(0, 10)
}
export function horaAr(ahora = new Date()) {
  return relojAr(ahora).getUTCHours()
}
export function sumarDias(iso, n) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function diaSemana(iso) {
  return new Date(iso + 'T12:00:00Z').getUTCDay()
}
export function lunesDe(iso) {
  return sumarDias(iso, -((diaSemana(iso) + 6) % 7))
}
export function primeroDelMes(iso) {
  return iso.slice(0, 8) + '01'
}
export function diasEntre(desde, hasta) {
  return Math.round((new Date(hasta + 'T12:00:00Z') - new Date(desde + 'T12:00:00Z')) / MS_DIA)
}
export function nombreMes(iso) {
  return MESES_TABLERO[Number(iso.slice(5, 7)) - 1] ?? ''
}

// "Buen día" hasta las 13, "Buenas tardes" hasta las 20, "Buenas noches"
// después; y "· lunes 28/09".
export function saludo(ahora, nombre) {
  const h = horaAr(ahora)
  const hola = h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const hoy = hoyAr(ahora)
  const pila = String(nombre ?? '').trim() ? nombreDePila(nombre) : ''
  return { saludo: pila ? `${hola}, ${pila}` : hola, fecha: `· ${DIAS_SEMANA[diaSemana(hoy)]} ${hoy.slice(8, 10)}/${hoy.slice(5, 7)}` }
}

// ═══ Números ══════════════════════════════════════════════════════════════
function esNumero(n) {
  if (n === null || n === undefined || n === '') return false
  return Number.isFinite(typeof n === 'number' ? n : Number(n))
}
export function num(n) {
  return esNumero(n) ? Number(n) : null
}
// Plata del tablero: sin decimales. Un dato ausente es "—" (nunca "$ 0").
export function plata(n, moneda = 'ARS') {
  if (!esNumero(n)) return '—'
  const pre = moneda === 'USD' ? 'US$ ' : (!moneda || moneda === 'ARS') ? '$ ' : `${moneda} `
  return pre + formatearNumeroAr(Math.round(Number(n)), { decimales: 0 })
}
// "hace 12 min", "hace 2 h 5 min", "hace 18 h" (desde las 24 h, en días).
export function haceCuanto(min) {
  if (!Number.isFinite(min) || min < 0) return ''
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  if (m < 24 * 60) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h` }
  const d = Math.floor(m / (24 * 60))
  return `${d} ${d === 1 ? 'día' : 'días'}`
}

export function entero(n) {
  return esNumero(n) ? formatearNumeroAr(Math.round(Number(n)), { decimales: 0 }) : '—'
}
function plural(n, uno, varios) {
  return Number(n) === 1 ? uno : varios
}

// ═══ "Lo que hay que resolver" que viene de mis_pendientes() ═════════════
// Cada fila de la RPC (modulo:clave) va a la PRIMERA de sus tarjetas que la
// persona vea, con su texto y a dónde lleva. Las que el tablero calcula por
// su cuenta respetando la fábrica (cheques que vencen, cobranzas por controlar
// en su tarjeta, planillas por completar) no están acá: se contarían dos veces.
// mis_pendientes() NO filtra por fábrica: estos números son de todas.
export const RESOLVER_PENDIENTES = {
  'caja:solicitudes_mi_caja': { tarjetas: ['caja'], uno: 'movimiento por aceptar en tu caja', varios: 'movimientos por aceptar en tu caja', url: 'modulos/caja.html' },
  'caja:solicitudes_empresa': { tarjetas: ['caja'], uno: 'movimiento por aceptar en la caja de la empresa', varios: 'movimientos por aceptar en la caja de la empresa', url: 'modulos/caja.html' },
  'cobranzas:por_controlar': { tarjetas: ['administracion'], uno: 'cobranza por asentar', varios: 'cobranzas por asentar', url: 'modulos/administracion.html?seccion=cobranzas', urgente: true, franja: 'cobranzas por asentar' },
  'produccion:conos_por_revisar': { tarjetas: ['produccion'], uno: 'cono nuevo por revisar', varios: 'conos nuevos por revisar', url: 'modulos/produccion-gestion.html' },
  'accesos:solicitudes': { tarjetas: ['accesos'], uno: 'solicitud de acceso', varios: 'solicitudes de acceso', url: 'modulos/accesos.html' },
  'materia_prima:facturas_por_ingresar': { tarjetas: ['materia-prima'], uno: 'factura por ingresar', varios: 'facturas por ingresar', url: 'modulos/materia-prima.html' },
  'materia_prima:pagado_sin_ingresar': { tarjetas: ['materia-prima'], uno: 'pagado sin ingresar', varios: 'pagados sin ingresar', url: 'modulos/materia-prima.html' },
  'materia_prima:insumos_por_revisar': { tarjetas: ['stock', 'materia-prima'], uno: 'insumo nuevo por revisar', varios: 'insumos nuevos por revisar', url: 'modulos/stock.html?vista=catalogo' },
  'gastos:ingresos_sin_gasto': { tarjetas: ['gastos'], uno: 'factura ingresada sin gasto', varios: 'facturas ingresadas sin gasto', url: 'modulos/gastos.html' },
  'cuentas_corrientes:proveedores_por_aceptar': { tarjetas: ['cuentas-corrientes'], uno: 'proveedor nuevo por aceptar', varios: 'proveedores nuevos por aceptar', url: 'modulos/cuentas-corrientes.html' },
  'cuentas_corrientes:sin_importe': { tarjetas: ['cuentas-corrientes'], uno: 'descarga sin importe', varios: 'descargas sin importe', url: 'modulos/cuentas-corrientes.html' },
  'cuentas_corrientes:sin_proveedor': { tarjetas: ['cuentas-corrientes'], uno: 'factura sin proveedor', varios: 'facturas sin proveedor', url: 'modulos/cuentas-corrientes.html' },
  'stock:transferencias_por_aceptar': { tarjetas: ['stock', 'materia-prima'], uno: 'transferencia por recibir', varios: 'transferencias por recibir', url: 'modulos/materia-prima.html' },
  'stock:recuento_abierto': { tarjetas: ['stock'], uno: 'recuento abierto', varios: 'recuentos abiertos', url: 'modulos/stock.html' },
  'stock:lotes_sin_ingreso': { tarjetas: ['stock'], uno: 'lote usado sin ingreso cargado', varios: 'lotes usados sin ingreso cargado', url: 'modulos/stock.html' },
  'administracion:ordenes_sin_valorizar': { tarjetas: ['retiros', 'administracion'], uno: 'orden sin valorizar', varios: 'órdenes sin valorizar', url: 'modulos/administracion.html' },
  'administracion:retiros_por_revisar': { tarjetas: ['administracion'], uno: 'retiro por revisar', varios: 'retiros por revisar', url: 'modulos/administracion.html' },
  'administracion:clientes_sobre_limite': { tarjetas: ['administracion'], uno: 'cliente pasado de su límite', varios: 'clientes pasados de su límite', url: 'modulos/administracion.html', urgente: true, franja: 'clientes pasados de su límite' },
}

// Filas de mis_pendientes → Map('modulo:clave' → cantidad). Solo cuentan las
// cantidades enteras y positivas (un null o un texto no se vuelven un número).
export function mapaPendientes(filas) {
  const m = new Map()
  for (const f of Array.isArray(filas) ? filas : []) {
    if (f?.cantidad === null || f?.cantidad === undefined || f?.cantidad === '') continue
    const n = Number(f.cantidad)
    if (!Number.isInteger(n) || n <= 0) continue
    const k = `${f.modulo}:${f.clave}`
    m.set(k, (m.get(k) ?? 0) + n)
  }
  return m
}

// Los renglones de `clave` que salen de mis_pendientes, sabiendo qué tarjetas
// ve la persona (`visibles`: Set de claves).
export function resolverDePendientes(clave, pend, visibles) {
  const out = []
  if (!pend) return out
  for (const [k, def] of Object.entries(RESOLVER_PENDIENTES)) {
    const n = pend.get(k)
    if (!n) continue
    const destino = def.tarjetas.find(t => visibles.has(t))
    if (destino !== clave) continue
    out.push({ n, t: plural(n, def.uno, def.varios), url: def.url, urgente: !!def.urgente, origen: k, franja: def.franja ? `${def.franja}` : null })
  }
  return out
}
// ¿Esta tarjeta tiene renglones que dependen de mis_pendientes?
export function usaPendientes(clave, visibles) {
  return Object.values(RESOLVER_PENDIENTES).some(d => d.tarjetas.find(t => visibles.has(t)) === clave)
}

// La franja "Para resolver ya": lo urgente de todas las tarjetas cargadas,
// cada cosa una vez, hasta 4, en este orden.
export const PRIORIDAD_FRANJA = ['produccion:paradas', 'cobranzas:por_controlar', 'pedidos:atrasados', 'cheques:por_vencer',
  'administracion:clientes_sobre_limite', 'taller:atrasados']
export function itemsFranja(modelos) {
  const vistos = new Map()
  for (const m of modelos) {
    if (!m || m.estado !== 'ok' && m.estado !== 'vacio') continue
    for (const r of m.resolver ?? []) {
      if (!r.urgente || !(r.n !== null && r.n !== undefined && r.n !== '')) continue
      const k = r.origen || r.t
      if (!vistos.has(k)) vistos.set(k, { n: r.n, t: r.franja || r.t, url: r.url, origen: k })
    }
  }
  const pos = k => { const i = PRIORIDAD_FRANJA.indexOf(k); return i === -1 ? 100 : i }
  return [...vistos.values()].sort((a, b) => pos(a.origen) - pos(b.origen)).slice(0, 4)
}

// ═══ Lo que pide cada tarjeta ═════════════════════════════════════════════
// Cada cargador recibe el contexto y devuelve el MODELO de la tarjeta:
//   { estado: 'ok' | 'vacio' | 'pronto', etiqueta, valor, unidad, sub,
//     tendencia: { texto, sube, bueno } , ctx: [{ k, v, tono }],
//     listaTitulo, lista: [{ nombre, v, pct, tono }], maquinas: [...],
//     resolver: [{ n, t, url, urgente, origen, franja }], nota, vacioMsg,
//     pendientes: true si usa mis_pendientes }
// Si algo falla, TIRA: quien los llama (cargarTarjeta) pone la tarjeta en
// error y las demás siguen.
//
// ctx = { sb, yo: { id }, esSuperAdmin, tieneTarea('mod:tarea'), elegida (id o
// null), unidades ([{ id, nombre, prefijo }] de la barra), unidadesDe([tareas])
// (los ids donde puede, respetando la elegida), hoy ('AAAA-MM-DD'), ahora
// (Date), pend (Promise<Map | null>), visibles (Set), fabrica }

const TOPE_FILAS = 1000
function avisoParcial(filas) {
  return Array.isArray(filas) && filas.length >= TOPE_FILAS ? 'Parcial: hay más de 1.000 filas y la base devuelve hasta 1.000.' : null
}
function nombreUnidad(ctx, id) {
  const u = (ctx.unidades ?? []).find(x => x.id === id)
  return u ? (u.nombre ?? '') : ''
}
function sinPermisoEn(ctx, que) {
  const u = ctx.elegida ? nombreUnidad(ctx, ctx.elegida) : ''
  return u ? `No tenés permiso para ver ${que} en ${u}.` : `No tenés permiso para ver ${que}.`
}
async function consulta(q) {
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function cargarGastos(ctx) {
  const { sb, hoy, elegida } = ctx
  const mes = primeroDelMes(hoy)
  const hace7 = sumarDias(hoy, -6)
  const desde = hace7 < mes ? hace7 : mes
  const filas = await consulta(sb.from('gastos')
    .select('fecha, importe, moneda, categoria_id, proveedor_id, unidad_negocio_id, estado')
    .gte('fecha', desde).lte('fecha', hoy).limit(TOPE_FILAS))
  const vivos = (filas ?? []).filter(g => g?.estado !== 'anulado' && pasaFiltroUnidad(g.unidad_negocio_id, elegida))
  const enPesos = vivos.filter(g => !g.moneda || g.moneda === 'ARS')
  const suma = xs => xs.reduce((s, g) => s + (num(g.importe) ?? 0), 0)
  const delMes = enPesos.filter(g => g.fecha >= mes)
  const total = suma(delMes)
  const usd = suma(vivos.filter(g => g.moneda === 'USD' && g.fecha >= mes))
  const porCat = new Map()
  for (const g of delMes) porCat.set(g.categoria_id ?? '', (porCat.get(g.categoria_id ?? '') ?? 0) + (num(g.importe) ?? 0))
  const top = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  let nombres = new Map()
  const ids = top.map(([id]) => id).filter(Boolean)
  if (ids.length) {
    try { nombres = new Map((await consulta(sb.from('categorias').select('id, nombre').in('id', ids)) ?? []).map(c => [c.id, c.nombre])) } catch { /* sin nombres */ }
  }
  const sinProveedor = vivos.filter(g => g.fecha >= mes && !g.proveedor_id).length
  const resolver = []
  if (sinProveedor > 0) resolver.push({ n: sinProveedor, t: plural(sinProveedor, 'gasto del mes sin proveedor', 'gastos del mes sin proveedor'), url: 'modulos/gastos.html', origen: 'gastos:sin_proveedor' })
  const notas = [avisoParcial(filas), ctx.tieneTarea('gastos:ver_exportar') ? null : 'Ves solo los gastos que cargaste.'].filter(Boolean)
  const m = {
    estado: delMes.length ? 'ok' : 'vacio',
    etiqueta: `Gastado en ${nombreMes(hoy)}`,
    valor: plata(total), sub: usd ? plata(usd, 'USD') : '',
    vacioMsg: 'Este mes no hay gastos',
    ctx: [{ k: 'Hoy', v: plata(suma(enPesos.filter(g => g.fecha === hoy))) }, { k: 'Últimos 7 días', v: plata(suma(enPesos.filter(g => g.fecha >= hace7))) }],
    listaTitulo: top.length ? 'LO QUE MÁS PESA' : '',
    lista: top.map(([id, v]) => ({ nombre: id ? (nombres.get(id) ?? 'Sin nombre') : 'Sin categoría', v: plata(v), pct: total > 0 ? Math.round(v / total * 100) : 0 })),
    resolver, nota: notas.join(' '), pendientes: true,
  }
  return m
}

export async function cargarCaja(ctx) {
  const { sb, yo, hoy, elegida } = ctx
  const saldos = await consulta(sb.from('v_caja_saldos').select('moneda, saldo').eq('empleado_id', yo.id))
  const de = mon => (saldos ?? []).filter(s => (s.moneda ?? 'ARS') === mon).reduce((a, s) => a + (num(s.saldo) ?? 0), 0)
  const hayUsd = (saldos ?? []).some(s => s.moneda === 'USD')
  const movs = await consulta(sb.from('caja_movimientos').select('tipo, monto, moneda').eq('empleado_id', yo.id).eq('fecha', hoy))
  let entro = 0, salio = 0
  for (const mv of movs ?? []) {
    if (mv.moneda && mv.moneda !== 'ARS') continue
    const t = String(mv.tipo ?? '')
    // Un traspaso entre cuentas propias no entra ni sale de la caja.
    if (t.endsWith('_traspaso')) continue
    if (t.startsWith('ingreso')) entro += num(mv.monto) ?? 0
    else if (t.startsWith('egreso')) salio += num(mv.monto) ?? 0
  }
  const lineas = []
  // La caja de la empresa: solo un super_admin (el diseño lo pide así).
  if (ctx.esSuperAdmin) {
    try {
      const emp = await consulta(sb.from('v_empleados_publico').select('id, tipo').eq('tipo', 'empresa'))
      const empresaId = emp?.[0]?.id
      if (empresaId) {
        const cuentas = (await consulta(sb.from('cuentas_caja').select('id, moneda, unidad_negocio_id').eq('empleado_id', empresaId)) ?? [])
          .filter(c => pasaFiltroUnidad(c.unidad_negocio_id, elegida))
        const porCuenta = new Map((await consulta(sb.from('v_caja_saldos_cuenta').select('cuenta_id, saldo').in('cuenta_id', cuentas.map(c => c.id))) ?? []).map(s => [s.cuenta_id, num(s.saldo) ?? 0]))
        let ars = 0, usd = 0, conUsd = false
        for (const c of cuentas) { if (c.moneda === 'USD') { usd += porCuenta.get(c.id) ?? 0; conUsd = true } else ars += porCuenta.get(c.id) ?? 0 }
        lineas.push({ k: 'Caja de la empresa', v: plata(ars) })
        if (conUsd) lineas.push({ k: '', v: plata(usd, 'USD') })
      }
    } catch { lineas.push({ k: 'Caja de la empresa', v: '—' }) }
  }
  lineas.push({ k: 'Entró hoy', v: entro > 0 ? `+ ${plata(entro)}` : plata(0), tono: entro > 0 ? 'bien' : '' })
  lineas.push({ k: 'Salió hoy', v: salio > 0 ? `− ${plata(salio)}` : plata(0) })
  return {
    estado: 'ok', etiqueta: 'Mi saldo', valor: plata(de('ARS')), sub: hayUsd ? plata(de('USD'), 'USD') : '',
    ctx: lineas, resolver: [], pendientes: true,
  }
}

export async function cargarCobranzas(ctx) {
  const { sb, hoy, elegida } = ctx
  const resumen = async (p) => {
    const d = await consulta(sb.rpc('resumen_cobranzas', { p_unidad: elegida || null, ...p }))
    return Array.isArray(d) ? d[0] ?? null : d
  }
  const hace7 = sumarDias(hoy, -6)
  const [rHoy, r7, rCtrl] = await Promise.all([
    resumen({ p_desde: hoy, p_hasta: hoy }), resumen({ p_desde: hace7, p_hasta: hoy }), resumen({ p_estado: 'registrada' }),
  ])
  const filas = await consulta(sb.from('v_cobranzas').select('cargada_por_nombre, total, estado, unidad_negocio_id, fecha')
    .gte('fecha', hace7).lte('fecha', hoy).limit(TOPE_FILAS))
  const porChofer = new Map()
  for (const c of filas ?? []) {
    if (c.estado === 'anulada') continue
    // Una cobranza por controlar todavía no tiene unidad (se decide al asentar).
    if (!pasaFiltroUnidad(c.estado === 'registrada' ? null : c.unidad_negocio_id, elegida)) continue
    const k = c.cargada_por_nombre || 'Sin nombre'
    porChofer.set(k, (porChofer.get(k) ?? 0) + (num(c.total) ?? 0))
  }
  const top = [...porChofer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const totalHoy = num(rHoy?.total)
  const nCtrl = num(rCtrl?.por_controlar)
  const resolver = []
  if (nCtrl > 0) resolver.push({ n: nCtrl, t: `por controlar · ${plata(rCtrl?.total)}`, url: 'modulos/administracion.html?seccion=cobranzas', origen: 'cobranzas:por_controlar' })
  return {
    estado: totalHoy === 0 ? 'vacio' : 'ok', etiqueta: 'Cobrado hoy', valor: plata(totalHoy), vacioMsg: 'Hoy no hubo cobranzas',
    ctx: [{ k: 'Últimos 7 días', v: plata(r7?.total) }],
    listaTitulo: top.length ? 'POR CHOFER' : '', lista: top.map(([nombre, v]) => ({ nombre, v: plata(v) })),
    resolver, bienMsg: 'Nada por controlar', nota: avisoParcial(filas) ?? '',
  }
}

// El plazo para depositar: 30 días desde el pago (o la emisión, si es común).
// Replica public.cheque_plazo_presentacion (ver CLAUDE.md, Cheques).
export function plazoCheque(ch) {
  const base = ch?.tipo === 'diferido' ? ch.fecha_pago : ch?.fecha_emision
  return base ? sumarDias(base, 30) : null
}

export async function cargarCheques(ctx) {
  const { sb, hoy, elegida } = ctx
  const filas = await consulta(sb.from('cobranza_cheques')
    .select('importe, tipo, fecha_emision, fecha_pago, estado, cobranzas(unidad_negocio_id, estado)')
    .eq('estado', 'en_cartera').limit(TOPE_FILAS))
  const vivos = (filas ?? []).filter(ch => {
    const cob = ch.cobranzas ?? {}
    return pasaFiltroUnidad(cob.estado === 'registrada' ? null : cob.unidad_negocio_id, elegida)
  })
  const total = vivos.reduce((s, ch) => s + (num(ch.importe) ?? 0), 0)
  let pond = 0
  for (const ch of vivos) {
    const pago = ch.tipo === 'diferido' ? ch.fecha_pago : null
    pond += Math.max(0, pago ? diasEntre(hoy, pago) : 0) * (num(ch.importe) ?? 0)
  }
  const plazo = total > 0 ? Math.round(pond / total) : null
  const hoyDepositar = vivos.filter(ch => (ch.tipo === 'diferido' ? ch.fecha_pago : ch.fecha_emision) === hoy).length
  const limite = sumarDias(hoy, 7)
  const vencen = vivos.filter(ch => { const p = plazoCheque(ch); return p && p <= limite }).length
  const resolver = []
  if (vencen > 0) resolver.push({ n: vencen, t: plural(vencen, 'vence esta semana', 'vencen esta semana'), url: 'modulos/administracion.html?seccion=cheques', urgente: true, origen: 'cheques:por_vencer', franja: plural(vencen, 'cheque vence esta semana', 'cheques vencen esta semana') })
  return {
    estado: vivos.length ? 'ok' : 'vacio', etiqueta: 'En cartera', valor: plata(total), vacioMsg: 'No hay cheques en cartera',
    sub: `${entero(vivos.length)} ${plural(vivos.length, 'cheque', 'cheques')}`,
    ctx: [{ k: 'Plazo promedio', v: plazo === null ? '—' : `${entero(plazo)} ${plural(plazo, 'día', 'días')}` }, { k: 'Para depositar hoy', v: entero(hoyDepositar) }],
    resolver, nota: avisoParcial(filas) ?? '',
  }
}

export async function cargarCuentasCorrientes(ctx) {
  const { sb, elegida } = ctx
  const filas = await consulta(sb.from('v_saldo_proveedor').select('proveedor_id, unidad_negocio_id, moneda, deuda_pendiente'))
  const porProv = new Map()
  let total = 0
  for (const f of filas ?? []) {
    if ((f.moneda ?? 'ARS') !== 'ARS' || !pasaFiltroUnidad(f.unidad_negocio_id, elegida)) continue
    const d = num(f.deuda_pendiente) ?? 0
    if (d <= 0) continue
    total += d
    porProv.set(f.proveedor_id, (porProv.get(f.proveedor_id) ?? 0) + d)
  }
  const top = [...porProv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  let nombres = new Map()
  if (top.length) {
    try { nombres = new Map((await consulta(sb.from('proveedores').select('id, razon_social, nombre_fantasia').in('id', top.map(([id]) => id))) ?? []).map(p => [p.id, p.nombre_fantasia || p.razon_social])) } catch { /* sin nombres */ }
  }
  return {
    estado: total > 0 ? 'ok' : 'vacio', etiqueta: 'Le debemos a proveedores', valor: plata(total), vacioMsg: 'No le debemos a ningún proveedor',
    ctx: [{ k: 'Vencido', v: 'Pronto', tono: 'suave' }],
    listaTitulo: top.length ? 'LOS MÁS GRANDES' : '', lista: top.map(([id, v]) => ({ nombre: nombres.get(id) ?? 'Proveedor', v: plata(v) })),
    resolver: [], pendientes: true,
  }
}

export async function cargarIngreso(ctx) {
  const { sb, hoy, elegida } = ctx
  const hace7 = sumarDias(hoy, -6)
  const filas = (await consulta(sb.from('materia_prima_ingresos').select('fecha, unidad_negocio_id').gte('fecha', hace7).lte('fecha', hoy).limit(TOPE_FILAS)) ?? [])
    .filter(i => pasaFiltroUnidad(i.unidad_negocio_id, elegida))
  const deHoy = filas.filter(i => i.fecha === hoy).length
  const notas = [avisoParcial(filas), ctx.tieneTarea('materia_prima:ver_todo') ? null : 'Ves solo los que cargaste.'].filter(Boolean)
  return {
    estado: deHoy ? 'ok' : 'vacio', etiqueta: 'Ingresos de materia prima hoy', valor: entero(deHoy), unidad: plural(deHoy, 'ingreso', 'ingresos'),
    vacioMsg: 'Hoy no hubo ingresos', ctx: [{ k: 'Últimos 7 días', v: entero(filas.length) }], resolver: [], nota: notas.join(' '), pendientes: true,
  }
}

// Stock: los insumos por agotarse y "para cuántos días alcanza" necesitan el
// mínimo y el consumo de cada insumo, que la base no tiene: Pronto.
export async function cargarStock() {
  return {
    estado: 'pronto', etiqueta: 'Insumos por agotarse',
    prontoMsg: 'Pronto: falta que la base sepa el mínimo y el consumo de cada insumo.',
    resolver: [], pendientes: true,
  }
}

export async function cargarProduccion(ctx) {
  const { sb, ahora, hoy } = ctx
  const ids = ctx.unidadesDe(['produccion:ver', 'produccion:configurar'])
  if (!ids.length) return { estado: 'pronto', etiqueta: 'Cajas producidas hoy', prontoMsg: sinPermisoEn(ctx, 'Producción'), resolver: [] }
  const res = await Promise.all(ids.map(id => consulta(sb.rpc('indicadores_produccion', { p_unidad_negocio_id: id })).then(d => ({ id, d }))))
  let hoyCajas = 0, antes = 0, masas = 0, scrap = 0, masaKg = 0, planillas = 0
  const maquinas = []
  let peor = null
  // El nombre de la fábrica va al lado de la máquina solo si hay máquinas de
  // más de una (con "Todas").
  const varias = res.filter(({ d }) => (d?.ahora ?? []).length).length > 1
  for (const { id, d } of res) {
    for (const p of d?.cajas_por_producto ?? []) { hoyCajas += num(p.hoy) ?? 0; antes += num(p.semana_pasada) ?? 0 }
    for (const a of d?.ahora ?? []) {
      const nombre = (a.maquina ?? 'Máquina') + (varias ? ` · ${nombreUnidad(ctx, id)}` : '')
      if (a.estado === 'pendiente_completar') { maquinas.push({ nombre, st: 'Por completar', det: `lote ${a.lote ?? '—'}`, tipo: 'neutro' }); continue }
      masas += num(a.masas) ?? 0
      if (a.parada_en_curso) {
        const min = a.parada_en_curso.desde ? Math.max(0, Math.round((+ahora - new Date(a.parada_en_curso.desde)) / 60000)) : null
        maquinas.push({ nombre, st: 'Parada', det: `${min === null ? 'Parada' : `Hace ${haceCuanto(min)}`}${a.parada_en_curso.motivo ? ' · ' + a.parada_en_curso.motivo : ''}`, tipo: 'mal' })
      } else maquinas.push({ nombre, st: 'Andando', det: `${entero(a.cajas)} cajas · lote ${a.lote ?? '—'}`, tipo: 'bien' })
    }
    scrap += num(d?.semana?.scrap_kg) ?? 0
    masaKg += num(d?.semana?.masa_kg) ?? 0
    planillas += num(d?.pendientes?.planillas_por_completar) ?? 0
    for (const r of d?.rendimiento_harina ?? []) {
      const dif = num(r.diferencia_pct)
      if (dif !== null && dif < -10 && (peor === null || dif < peor.dif)) peor = { dif, lote: r.lote }
    }
  }
  const orden = { mal: 0, bien: 1, neutro: 2 }
  maquinas.sort((a, b) => orden[a.tipo] - orden[b.tipo])
  const paradas = maquinas.filter(m => m.tipo === 'mal')
  const andando = maquinas.filter(m => m.tipo === 'bien').length
  const abiertas = andando + paradas.length
  const dif = hoyCajas - antes
  const dia = DIAS_SEMANA[diaSemana(hoy)]
  const tendencia = antes > 0 || hoyCajas > 0
    ? { texto: dif === 0 ? `Igual que el ${dia} pasado (${entero(antes)})` : `${entero(Math.abs(dif))} ${dif > 0 ? 'más' : 'menos'} que el ${dia} pasado (${entero(antes)})`, sube: dif > 0, igual: dif === 0 }
    : null
  const resolver = []
  if (paradas.length) resolver.push({ n: paradas.length, t: paradas.length === 1 ? `máquina parada · ${paradas[0].nombre}` : 'máquinas paradas', url: 'modulos/produccion-gestion.html', urgente: true, origen: 'produccion:paradas', franja: plural(paradas.length, 'máquina parada', 'máquinas paradas') })
  if (planillas > 0) resolver.push({ n: planillas, t: plural(planillas, 'planilla por completar', 'planillas por completar'), url: 'modulos/produccion-gestion.html', origen: 'produccion:planillas' })
  if (peor) resolver.push({ n: `Lote ${peor.lote ?? '—'}`, t: 'de harina es el que peor rinde', url: 'modulos/produccion-gestion.html', origen: 'produccion:peor_lote' })
  return {
    estado: hoyCajas > 0 || maquinas.length ? 'ok' : 'vacio', etiqueta: 'Cajas producidas hoy', valor: entero(hoyCajas), unidad: plural(hoyCajas, 'caja', 'cajas'),
    vacioMsg: 'Hoy no se produjo', tendencia,
    maquinas, ctx: [{ k: 'Máquinas andando', v: abiertas ? `${andando} de ${abiertas}` : '—' }, { k: 'Masas', v: entero(masas) },
      { k: 'Scrap · 7 días', v: masaKg > 0 ? `${formatearNumeroAr(scrap / masaKg * 100, { decimales: 1, minimos: 1 })} %` : '—' }],
    resolver, pendientes: true, refresco: 30,
  }
}

export async function cargarPedidos(ctx) {
  const { sb, hoy } = ctx
  const ids = ctx.unidadesDe(['pedidos:ver'])
  if (!ids.length) return { estado: 'pronto', etiqueta: 'Por entregar', prontoMsg: sinPermisoEn(ctx, 'los pedidos'), resolver: [] }
  const listas = await Promise.all(ids.map(id => consulta(sb.rpc('pedidos_de', { p_unidad_negocio_id: id }))))
  const abiertos = listas.flat().filter(p => p && p.estado !== 'entregado' && p.estado !== 'anulado')
  const lunes = lunesDe(hoy), domingo = sumarDias(lunes, 6)
  const atrasados = abiertos.filter(p => p.fecha_entrega && p.fecha_entrega < hoy).length
  const resolver = []
  if (atrasados) resolver.push({ n: atrasados, t: plural(atrasados, 'atrasado', 'atrasados'), url: 'modulos/pedidos.html', urgente: true, origen: 'pedidos:atrasados', franja: plural(atrasados, 'pedido atrasado', 'pedidos atrasados') })
  return {
    estado: abiertos.length ? 'ok' : 'vacio', etiqueta: 'Por entregar', valor: entero(abiertos.length), unidad: plural(abiertos.length, 'pedido', 'pedidos'),
    vacioMsg: 'No hay pedidos por entregar',
    ctx: [{ k: 'Para hoy', v: entero(abiertos.filter(p => p.fecha_entrega === hoy).length) },
      { k: 'Esta semana', v: entero(abiertos.filter(p => p.fecha_entrega && p.fecha_entrega >= lunes && p.fecha_entrega <= domingo).length) }],
    resolver,
  }
}

export async function cargarRetiros(ctx) {
  const { sb, hoy, elegida } = ctx
  const resolver = []
  if (!ctx.tieneTarea('retiros:ver')) {
    return { estado: 'pronto', etiqueta: 'Cajas despachadas hoy', prontoMsg: 'Las órdenes de todos se ven con el permiso de Administración.', resolver, pendientes: true }
  }
  const lunes = lunesDe(hoy)
  const ordenes = (await consulta(sb.from('ordenes_retiro').select('id, fecha, estado, unidad_negocio_id').gte('fecha', lunes).lte('fecha', hoy).limit(TOPE_FILAS)) ?? [])
    .filter(o => o.estado === 'confirmada' && pasaFiltroUnidad(o.unidad_negocio_id, elegida))
  const deHoy = ordenes.filter(o => o.fecha === hoy).map(o => o.id)
  let cajas = 0
  if (deHoy.length) {
    const items = await consulta(sb.from('orden_retiro_items').select('orden_id, cajas').in('orden_id', deHoy))
    cajas = (items ?? []).reduce((s, i) => s + (num(i.cajas) ?? 0), 0)
  }
  return {
    estado: cajas > 0 ? 'ok' : 'vacio', etiqueta: 'Cajas despachadas hoy', valor: entero(cajas), unidad: plural(cajas, 'caja', 'cajas'),
    vacioMsg: 'Hoy no salieron cajas', ctx: [{ k: 'Órdenes esta semana', v: entero(ordenes.length) }], resolver, pendientes: true,
  }
}

export async function cargarAdministracion(ctx) {
  const { sb, hoy } = ctx
  const ids = ctx.unidadesDe(['retiros:ver'])
  if (!ids.length) return { estado: 'pronto', etiqueta: 'Nos deben los clientes', prontoMsg: sinPermisoEn(ctx, 'las cuentas de los clientes'), resolver: [], pendientes: true }
  const clientes = (await Promise.all(ids.map(id => consulta(sb.rpc('clientes_con_saldo', { p_unidad_negocio_id: id, p_incluir_apagados: false }))))).flat().filter(Boolean)
  const deben = clientes.filter(c => (num(c.saldo) ?? 0) > 0)
  const total = deben.reduce((s, c) => s + num(c.saldo), 0)
  const top = [...deben].sort((a, b) => num(b.saldo) - num(a.saldo)).slice(0, 3)
  let cobrado = null
  try {
    const ids2 = new Set(clientes.map(c => c.cliente_id))
    const movs = await consulta(sb.from('cliente_movimientos').select('cliente_id, importe, fecha').eq('tipo', 'cobranza').gte('fecha', primeroDelMes(hoy)).lte('fecha', hoy).limit(TOPE_FILAS))
    cobrado = (movs ?? []).filter(m => ids2.has(m.cliente_id)).reduce((s, m) => s - (num(m.importe) ?? 0), 0)
  } catch { cobrado = null }
  return {
    estado: total > 0 ? 'ok' : 'vacio', etiqueta: 'Nos deben los clientes', valor: plata(total), vacioMsg: 'Ningún cliente nos debe',
    ctx: [{ k: `Cobrado en ${nombreMes(hoy)}`, v: plata(cobrado), tono: cobrado > 0 ? 'bien' : '' }],
    listaTitulo: top.length ? 'LOS QUE MÁS DEBEN' : '', lista: top.map(c => ({ nombre: c.nombre || c.razon_social || 'Cliente', v: plata(c.saldo) })),
    resolver: [], pendientes: true,
  }
}

export async function cargarTaller(ctx) {
  const { sb, elegida } = ctx
  const lista = await consulta(sb.rpc('proyectos_taller', { p_solo_activos: true }))
  if (lista === null) return { estado: 'pronto', etiqueta: 'Proyectos en curso', prontoMsg: 'No tenés permiso para ver los proyectos.', resolver: [] }
  // Con una fábrica que no es el Taller, los trabajos internos para ella.
  const fabrica = elegida ? nombreUnidad(ctx, elegida) : ''
  const vivos = (Array.isArray(lista) ? lista : []).filter(p => !fabrica || fabrica === 'Taller' || (p.destino === 'interno' && p.fabrica_destino === fabrica))
  const atrasados = vivos.filter(p => p.atrasado === true).length
  const pasados = vivos.filter(p => (num(p.presupuesto_costo) ?? 0) > 0 && (num(p.costo_total) ?? 0) > num(p.presupuesto_costo)).length
  const resolver = []
  if (atrasados) resolver.push({ n: atrasados, t: plural(atrasados, 'atrasado', 'atrasados'), url: 'modulos/taller.html', urgente: true, origen: 'taller:atrasados', franja: plural(atrasados, 'proyecto atrasado', 'proyectos atrasados') })
  if (pasados) resolver.push({ n: pasados, t: plural(pasados, 'pasado de presupuesto', 'pasados de presupuesto'), url: 'modulos/taller.html', origen: 'taller:presupuesto' })
  // Facturado · cobrado · falta cobrar: solo con permiso de precios, y la base
  // no los junta para todos los proyectos (resumen_proyecto es de a uno).
  const conPrecios = ctx.tieneTarea('taller:precios')
  return {
    estado: vivos.length ? 'ok' : 'vacio', etiqueta: 'Proyectos en curso', valor: entero(vivos.length), unidad: plural(vivos.length, 'proyecto', 'proyectos'),
    vacioMsg: 'No hay proyectos en curso',
    ctx: conPrecios ? [{ k: 'Facturado', v: 'Pronto', tono: 'suave' }, { k: 'Cobrado', v: 'Pronto', tono: 'suave' }, { k: 'Falta cobrar', v: 'Pronto', tono: 'suave' }] : [],
    resolver,
  }
}

export async function cargarAccesos(ctx) {
  const personas = sinPersonasDePrueba(await consulta(ctx.sb.from('v_empleados_publico').select('id, activo, tipo, tiene_acceso, unidad_negocio_id')) ?? [], ctx.fabrica)
  const reales = personas.filter(p => p.activo !== false && p.tipo !== 'sistema' && p.tipo !== 'empresa')
  const usuarios = reales.filter(p => p.tiene_acceso === true).length
  return {
    estado: 'ok', etiqueta: 'Usuarios activos', valor: entero(usuarios),
    ctx: [{ k: 'Empleados en Naaloo', v: entero(reales.filter(p => p.tipo === 'naaloo').length) }],
    resolver: [], nota: 'Muestra todas las unidades.', pendientes: true,
  }
}

export async function cargarEmpleados(ctx) {
  const personas = sinPersonasDePrueba(await consulta(ctx.sb.from('v_empleados_publico').select('id, activo, tipo, unidad_negocio_id')) ?? [], ctx.fabrica)
  const reales = personas.filter(p => p.activo !== false && p.tipo !== 'sistema' && p.tipo !== 'empresa')
  return { estado: 'ok', etiqueta: 'Empleados activos', valor: entero(reales.length), ctx: [], resolver: [], nota: 'Muestra todas las unidades.', sinPie: true }
}

export async function cargarSeguridad(ctx) {
  const desde = new Date(+ctx.ahora - 7 * MS_DIA).toISOString()
  const filas = await consulta(ctx.sb.from('errores_app').select('id, creado_en').gte('creado_en', desde).limit(TOPE_FILAS))
  const n = (filas ?? []).length
  return {
    estado: 'ok', etiqueta: 'Errores de la app · 7 días', valor: entero(n),
    ctx: [{ k: 'Sesiones abiertas', v: 'Pronto', tono: 'suave' }], resolver: [], nota: avisoParcial(filas) ?? '', sinPie: true,
  }
}

export const CARGADORES = {
  gastos: cargarGastos, caja: cargarCaja, cobranzas: cargarCobranzas, cheques: cargarCheques,
  'cuentas-corrientes': cargarCuentasCorrientes, 'materia-prima': cargarIngreso, stock: cargarStock,
  produccion: cargarProduccion, pedidos: cargarPedidos, retiros: cargarRetiros, administracion: cargarAdministracion,
  taller: cargarTaller, accesos: cargarAccesos, empleados: cargarEmpleados, seguridad: cargarSeguridad,
}

// Carga UNA tarjeta: su cargador + los renglones de mis_pendientes. Nunca
// tira: si el cargador falla, el modelo es { estado: 'error' } y las demás
// tarjetas siguen. Si mis_pendientes falló, el pie lo dice en vez de afirmar
// "Nada pendiente".
export async function cargarTarjeta(clave, ctx, cargadores = CARGADORES) {
  const fn = cargadores[clave]
  if (!fn) return { estado: 'error', detalle: 'sin cargador' }
  let m
  try { m = await fn(ctx) } catch (err) {
    try { console.error(`tablero: ${clave}`, err) } catch { /* sin consola */ }
    return { estado: 'error' }
  }
  if (!m || typeof m !== 'object') return { estado: 'error' }
  const visibles = ctx.visibles ?? new Set()
  if (usaPendientes(clave, visibles)) {
    const pend = await Promise.resolve(ctx.pend).catch(() => null)
    if (pend) m.resolver = [...(m.resolver ?? []), ...resolverDePendientes(clave, pend, visibles)]
    else m.pendError = true
  }
  return m
}

// ═══ El HTML ══════════════════════════════════════════════════════════════
const FLECHA_DER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
const MANIJA = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></svg>'
const OJO_TACHADO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.5 8 3 10 2 12c1 2.5 5 7 10 7 1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
const VOLVER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/></svg>'
export const NOMBRE_TAMANO = { chica: 'Chica', mediana: 'Mediana', ancha: 'Ancha' }

function htmlTono(tono) {
  return tono === 'bien' ? ' tb-dato--bien' : tono === 'mal' ? ' tb-dato--mal' : tono === 'suave' ? ' tb-dato--suave' : ''
}

function htmlCtx(m) {
  const filas = (m.ctx ?? []).map(x => `<div class="tb-dato"><span class="tb-dato__k">${escTab(x.k)}</span><span class="tb-dato__v${htmlTono(x.tono)}">${escTab(x.v)}</span></div>`).join('')
  const lista = (m.lista ?? []).length
    ? `<div class="tb-lista__titulo">${escTab(m.listaTitulo)}</div>` + m.lista.map(x => {
      const barra = x.pct !== undefined && x.pct !== null
        ? `<div class="tb-barrita"><div class="tb-barrita__lleno${x.tono === 'mal' ? ' tb-barrita__lleno--mal' : ''}" style="width: ${Math.max(0, Math.min(100, Number(x.pct) || 0))}%"></div></div>` : ''
      return `<div class="tb-lista__item"><div class="tb-lista__fila"><span class="tb-lista__nombre">${escTab(x.nombre)}</span><span class="tb-lista__v${x.tono === 'mal' ? ' tb-lista__v--mal' : ''}">${escTab(x.v)}</span></div>${barra}</div>`
    }).join('') : ''
  return filas || lista ? `<div class="tb-bloque tb-bloque--ctx">${filas}${lista}</div>` : ''
}

function htmlMaquinas(m) {
  if (!(m.maquinas ?? []).length) return ''
  return '<div class="tb-maquinas">' + m.maquinas.map(q =>
    `<div class="tb-maquina tb-maquina--${q.tipo === 'mal' ? 'mal' : q.tipo === 'bien' ? 'bien' : 'neutro'}">` +
      `<div class="tb-maquina__st"><span class="tb-maquina__punto" aria-hidden="true"></span>${escTab(q.st)}</div>` +
      `<div class="tb-maquina__nombre">${escTab(q.nombre)}</div><div class="tb-maquina__det">${escTab(q.det)}</div></div>`).join('') + '</div>'
}

function htmlTendencia(t) {
  if (!t) return ''
  const cls = t.igual ? 'igual' : t.sube ? 'sube' : 'baja'
  const d = t.igual ? 'M5 12h14' : t.sube ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'
  return `<div class="tb-tendencia tb-tendencia--${cls}"><span class="tb-tendencia__circulo"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></span>${escTab(t.texto)}</div>`
}

function htmlCuerpo(m) {
  if (m.estado === 'cargando') {
    return '<div class="tb-cargando" aria-busy="true"><div class="tb-hueso tb-hueso--etiqueta"></div><div class="tb-hueso tb-hueso--numero"></div>' +
      '<div class="tb-hueso tb-hueso--linea"></div><div class="tb-hueso tb-hueso--linea2"></div><div class="tb-cargando__texto">Cargando…</div></div>'
  }
  if (m.estado === 'error') {
    return '<div class="tb-error" role="alert"><div class="tb-error__titulo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A2E42" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 8v5M12 16v.01"/></svg>No se pudo cargar</div>' +
      '<div class="tb-error__texto">Puede ser la conexión. El resto del tablero anda bien.</div>' +
      `<button type="button" class="tb-reintentar" data-reintentar="${escTab(m.clave)}">${VOLVER}Reintentar</button></div>`
  }
  const principal = m.estado === 'ok'
    ? `<div class="tb-bloque tb-bloque--principal"><div class="tb-etiqueta">${escTab(m.etiqueta)}</div>` +
      `<div class="tb-cifra"><span class="tb-numero">${escTab(m.valor)}</span>${m.unidad ? `<span class="tb-unidad">${escTab(m.unidad)}</span>` : ''}</div>` +
      (m.sub ? `<div class="tb-sub">${escTab(m.sub)}</div>` : '') + htmlTendencia(m.tendencia) + '</div>'
    : `<div class="tb-bloque tb-bloque--principal"><div class="tb-etiqueta">${escTab(m.etiqueta)}</div>` +
      `<div class="tb-vacio"><span class="tb-vacio__marca" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></span>` +
      `<span class="tb-vacio__msg${m.estado === 'pronto' ? ' tb-vacio__msg--pronto' : ''}">${escTab(m.estado === 'pronto' ? (m.prontoMsg || 'Pronto') : (m.vacioMsg || 'Sin datos'))}</span></div></div>`
  return `<div class="tb-cuerpo">${principal}${htmlMaquinas(m)}${htmlCtx(m)}</div>` + (m.nota ? `<div class="tb-nota">${escTab(m.nota)}</div>` : '')
}

function htmlPie(m) {
  if (m.estado === 'cargando' || m.estado === 'error' || m.sinPie) return ''
  const filas = (m.resolver ?? []).map(r =>
    `<a class="tb-res${r.urgente ? ' tb-res--urgente' : ''}" href="${escTab(r.url)}" data-resolver="${escTab(r.origen ?? '')}">` +
      `<span class="tb-res__n">${escTab(r.n)}</span><span class="tb-res__t">${escTab(r.t)}</span><span class="tb-res__flecha">${FLECHA_DER}</span></a>`).join('')
  let fin = ''
  if (!filas) {
    fin = m.pendError
      ? '<div class="tb-pie__nota">No se pudo saber qué hay pendiente.</div>'
      : `<div class="tb-bien"><span class="tb-bien__tilde" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F7D4F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>${escTab(m.bienMsg || 'Nada pendiente')}</div>`
  } else if (m.pendError) fin = '<div class="tb-pie__nota">No se pudo saber todo lo pendiente.</div>'
  return `<div class="tb-pie">${filas}${fin}</div>`
}

// Una tarjeta. `t` = { clave, nombre, url, tamano }. En modo acomodar no
// navega: lleva la manija, el tamaño y el botón de esconder.
export function htmlTarjeta(t, modelo, { acomodar = false } = {}) {
  const m = { ...(modelo ?? { estado: 'cargando' }), clave: t.clave }
  const col = colorDeModulo(t.clave)
  const tam = TAMANOS.includes(t.tamano) ? t.tamano : 'chica'
  const icono = `<span class="tb-tarjeta__icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(t.clave, 17)}</span>`
  const cab = acomodar
    ? `<div class="tb-tarjeta__cab"><button type="button" class="tb-manija" data-manija="${escTab(t.clave)}" aria-label="Mover ${escTab(t.nombre)} (Enter la levanta, las flechas la mueven, Enter la suelta)" aria-pressed="false">${MANIJA}</button>${icono}<span class="tb-tarjeta__nombre">${escTab(t.nombre)}</span></div>` +
      '<div class="tb-acomodo">' +
        `<div class="tb-seg" role="group" aria-label="Tamaño de ${escTab(t.nombre)}">` +
          TAMANOS.map(z => `<button type="button" class="tb-seg__op${z === tam ? ' tb-seg__op--activa' : ''}" data-tamano-de="${escTab(t.clave)}" data-tamano="${z}" aria-pressed="${z === tam}">${NOMBRE_TAMANO[z]}</button>`).join('') +
        '</div>' +
        `<button type="button" class="tb-esconder" data-esconder="${escTab(t.clave)}" title="Esconder" aria-label="Esconder ${escTab(t.nombre)}">${OJO_TACHADO}</button>` +
      '</div>'
    : `<div class="tb-tarjeta__cab">${icono}<a class="tb-tarjeta__abrir" href="${escTab(t.url)}">${escTab(t.nombre)}</a><span class="tb-tarjeta__chev">${FLECHA_DER}</span></div>`
  return `<article class="tb-tarjeta tb-tarjeta--${tam}${acomodar ? ' tb-tarjeta--acomodar' : ''} tb-tarjeta--${escTab(m.estado)}" data-tarjeta="${escTab(t.clave)}" style="--tb-color: ${col.c}">` +
    cab + htmlCuerpo(m) + htmlPie(m) + '</article>'
}

export function htmlFranja(items) {
  if (!items?.length) return ''
  return '<div class="tb-franja__titulo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A2E42" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19zM12 10v4M12 17.5v.01"/></svg>Para resolver ya</div>' +
    items.map(u => `<a class="tb-franja__item" href="${escTab(u.url)}"><span class="tb-franja__n">${escTab(u.n)}</span>${escTab(u.t)}</a>`).join('')
}

export function htmlEscondidas(tarjetas) {
  const ocultas = tarjetas.filter(t => t.oculta)
  return '<div class="tb-escondidas__titulo">Escondidas</div>' + (ocultas.length
    ? ocultas.map(t => {
      const col = colorDeModulo(t.clave)
      return `<div class="tb-escondida"><span class="tb-escondida__icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(t.clave, 14)}</span>` +
        `<span class="tb-escondida__nombre">${escTab(t.nombre)}</span><button type="button" class="tb-escondida__mostrar" data-mostrar="${escTab(t.clave)}">Mostrar</button></div>`
    }).join('')
    : '<span class="tb-escondidas__vacio">No hay ninguna escondida.</span>')
}

// ═══ Personalizar (6a) ════════════════════════════════════════════════════
export const NOMBRE_ORDEN_BARRA = { mano: 'A mano', alfa: 'Alfabético', uso: 'Los que más uso' }
export function htmlPersonalizar({ nombre, orden = 'mano', fijados = [], resto = [], tablero = [] }) {
  const itemBarra = (m, fijado) => {
    const col = colorDeModulo(m.clave)
    return `<div class="pz-fila" data-pz-barra="${escTab(m.clave)}">` +
      (orden === 'mano' && !fijado ? `<button type="button" class="pz-manija" data-pz-manija-barra="${escTab(m.clave)}" aria-label="Mover ${escTab(m.nombre)} (Enter la levanta, las flechas la mueven, Enter la suelta)" aria-pressed="false">${MANIJA}</button>` : '<span class="pz-manija pz-manija--vacia" aria-hidden="true"></span>') +
      `<span class="pz-icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(m.clave, 14)}</span>` +
      `<span class="pz-nombre">${escTab(m.nombre)}</span>` +
      `<button type="button" class="pz-fijar${fijado ? ' pz-fijar--si' : ''}" data-pz-fijar="${escTab(m.clave)}" aria-pressed="${fijado}">` +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15 3l6 6-3 1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4z"/></svg>' +
        `${fijado ? 'Fijado' : 'Fijar'}</button></div>`
  }
  const itemTablero = (t) => {
    const col = colorDeModulo(t.clave)
    return `<div class="pz-fila pz-fila--tablero${t.oculta ? ' pz-fila--apagada' : ''}" data-pz-tablero="${escTab(t.clave)}">` +
      `<button type="button" class="pz-manija" data-pz-manija-tablero="${escTab(t.clave)}" aria-label="Mover ${escTab(t.nombre)} (Enter la levanta, las flechas la mueven, Enter la suelta)" aria-pressed="false">${MANIJA}</button>` +
      `<span class="pz-icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(t.clave, 14)}</span>` +
      `<span class="pz-nombre">${escTab(t.nombre)}</span>` +
      `<div class="tb-seg pz-seg" role="group" aria-label="Tamaño de ${escTab(t.nombre)}">` +
        TAMANOS.map(z => `<button type="button" class="tb-seg__op${z === t.tamano ? ' tb-seg__op--activa' : ''}" data-pz-tamano="${escTab(t.clave)}" data-tamano="${z}" aria-pressed="${z === t.tamano}">${NOMBRE_TAMANO[z]}</button>`).join('') +
      '</div>' +
      `<button type="button" class="pz-interruptor${t.oculta ? '' : ' pz-interruptor--si'}" role="switch" aria-checked="${!t.oculta}" data-pz-mostrar="${escTab(t.clave)}" title="Mostrar en el tablero" aria-label="Mostrar ${escTab(t.nombre)} en el tablero"><span class="pz-interruptor__bola"></span></button></div>`
  }
  return '<div class="pz-cab"><h1 class="pz-titulo">Personalizar</h1>' +
      `<p class="pz-bajada">Lo que cambies acá se guarda solo para vos${String(nombre ?? '').trim() ? `, ${escTab(nombreDePila(nombre))}` : ''}. Los demás siguen viendo lo suyo.</p></div>` +
    '<div class="pz-columnas">' +
      '<section class="pz-caja" aria-labelledby="pz-barra-titulo"><h2 class="pz-caja__titulo" id="pz-barra-titulo">Barra lateral</h2>' +
        '<p class="pz-caja__texto">Cómo se ordenan los módulos.</p>' +
        '<div class="pz-orden" role="group" aria-label="Orden de la barra">' +
          Object.entries(NOMBRE_ORDEN_BARRA).map(([k, v]) => `<button type="button" class="pz-orden__op${k === orden ? ' pz-orden__op--activa' : ''}" data-orden-barra="${k}" aria-pressed="${k === orden}">${v}</button>`).join('') +
        '</div>' +
        '<div class="pz-lista" id="pz-lista-barra">' +
          (fijados.length ? '<div class="pz-grupo">FIJADOS ARRIBA</div>' + fijados.map(m => itemBarra(m, true)).join('') : '') +
          (resto.length ? `<div class="pz-grupo">${fijados.length ? 'EL RESTO' : 'LOS MÓDULOS'}</div><div id="pz-resto">` + resto.map(m => itemBarra(m, false)).join('') + '</div>' : '') +
        '</div>' +
      '</section>' +
      '<section class="pz-caja" aria-labelledby="pz-tablero-titulo"><div class="pz-caja__cab"><div class="pz-caja__cab-texto"><h2 class="pz-caja__titulo" id="pz-tablero-titulo">Tablero</h2>' +
          '<p class="pz-caja__texto">Arrastrá para cambiar el orden. Elegí el tamaño de cada resumen o escondelo.</p></div>' +
          '<button type="button" class="pz-acomodar" id="pz-acomodar">Acomodar sobre el tablero</button></div>' +
        `<div class="pz-lista" id="pz-lista-tablero">${tablero.map(itemTablero).join('')}</div>` +
        `<div class="pz-pie"><button type="button" class="pz-volver" id="pz-volver-fabrica">${VOLVER}Volver a como venía</button>` +
          '<span class="pz-pie__texto">Deja la barra y el tablero como vienen de fábrica.</span></div>' +
        '<p class="pz-dispositivo">Se guarda en este dispositivo.</p>' +
      '</section>' +
    '</div>'
}

// ═══ La pantalla: el tablero, acomodar y Personalizar ═════════════════════

// Las fábricas donde la persona puede ver algo con estas tareas: un
// super_admin, todas las de la barra; si no, las del ALCANCE de esas tareas
// ({"todas": true} = todas; una tarea sin alcance no suma). Con una fábrica
// elegida arriba, solo esa (si puede).
export function unidadesPermitidas({ tareas, esSuperAdmin, alcances, todas, elegida }) {
  let ids
  if (esSuperAdmin) ids = [...todas]
  else {
    const s = new Set()
    for (const t of tareas ?? []) {
      const a = alcances?.get?.(t)
      if (!a || typeof a !== 'object') continue
      if (a.todas === true) { for (const x of todas) s.add(x); continue }
      for (const id of Array.isArray(a.unidades) ? a.unidades : []) if (todas.includes(id)) s.add(id)
    }
    ids = todas.filter(id => s.has(id))
  }
  return elegida ? ids.filter(id => id === elegida) : ids
}

// Recarga UNA tarjeta con su turno: la respuesta de un pedido viejo no pisa la
// de uno nuevo. La primera vez (o con mostrarCargando) se ve "Cargando…"; al
// refrescar, los números de antes quedan hasta que llegan los nuevos.
export async function refrescarTarjeta(estado, clave, ctx, pintar, cargar = cargarTarjeta, { mostrarCargando = false } = {}) {
  const turno = (estado.turnos.get(clave) ?? 0) + 1
  estado.turnos.set(clave, turno)
  if (mostrarCargando || !estado.modelos.has(clave)) { estado.modelos.set(clave, { estado: 'cargando' }); pintar(clave) }
  const m = await cargar(clave, ctx)
  if (estado.turnos.get(clave) !== turno) return false
  estado.modelos.set(clave, m)
  pintar(clave)
  return true
}

// Arrastrar con el mouse o el dedo desde una manija. `flotar`: la tarjeta se
// levanta y sigue al puntero, y un recuadro "Soltá acá" marca dónde cae (el
// tablero); sin flotar, la fila se corre en vivo (las listas de Personalizar).
// Al soltar, alSoltar(claves en el orden nuevo).
export function arrastrar(ev, { doc, win, item, contenedor, selItem, clave, flotar = false, alSoltar }) {
  if (ev.button !== undefined && ev.button !== 0) return
  ev.preventDefault()
  const r = item.getBoundingClientRect()
  const dx = ev.clientX - r.left, dy = ev.clientY - r.top
  let hueco = null
  // El estilo propio de la tarjeta (su color) se devuelve al soltar.
  const estiloAntes = item.getAttribute('style')
  item.classList.add('arrastrando')
  if (flotar) {
    hueco = doc.createElement('div')
    hueco.className = 'tb-soltar ' + [...item.classList].filter(c => /^tb-tarjeta--(chica|mediana|ancha)$/.test(c)).join(' ')
    hueco.textContent = 'Soltá acá'
    contenedor.insertBefore(hueco, item.nextSibling)
    Object.assign(item.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, zIndex: '60', pointerEvents: 'none', margin: '0' })
  }
  const mover = (e) => {
    if (flotar) { item.style.left = `${e.clientX - dx}px`; item.style.top = `${e.clientY - dy}px` }
    // Cerca del borde de arriba o de abajo, la página se corre sola (el
    // tablero es más alto que la pantalla).
    const alto = win.innerHeight || 0
    if (alto && e.clientY < 60) win.scrollBy?.(0, -24)
    else if (alto && e.clientY > alto - 60) win.scrollBy?.(0, 24)
    const bajo = doc.elementFromPoint(e.clientX, e.clientY)?.closest?.(selItem)
    if (!bajo || bajo === item || !contenedor.contains(bajo)) return
    const b = bajo.getBoundingClientRect()
    const antes = flotar ? e.clientX < b.left + b.width / 2 : e.clientY < b.top + b.height / 2
    const quien = flotar ? hueco : item
    contenedor.insertBefore(quien, antes ? bajo : bajo.nextSibling)
  }
  const soltar = () => {
    win.removeEventListener('pointermove', mover)
    win.removeEventListener('pointerup', soltar)
    win.removeEventListener('pointercancel', soltar)
    if (flotar) {
      contenedor.insertBefore(item, hueco); hueco.remove()
      if (estiloAntes === null) item.removeAttribute('style'); else item.setAttribute('style', estiloAntes)
    }
    item.classList.remove('arrastrando')
    alSoltar([...contenedor.querySelectorAll(selItem)].map(clave))
  }
  win.addEventListener('pointermove', mover)
  win.addEventListener('pointerup', soltar)
  win.addEventListener('pointercancel', soltar)
}

// Arma la pantalla entera. Lo llama dashboard.html cuando ya sabe quién es la
// persona y qué módulos ve.
export function crearTablero({ sb, doc = document, win = window, yo, nombre, esSuperAdmin, misTareas = new Set(), alcances = new Map(),
  ctxVis, esDispositivo = false, reloj = () => new Date(), vistaInicial = 'tablero' }) {
  const el = id => doc.getElementById(id)
  const posibles = tarjetasPosibles(ctxVis, esDispositivo)
  const visibles = new Set(posibles.map(t => t.clave))
  const estado = { vista: vistaInicial, acomodar: false, modelos: new Map(), turnos: new Map(), prefs: leerPrefs(yo.id),
    elegida: null, unidades: [], fabrica: null, pend: Promise.resolve(null), teclado: null, listo: false }
  const tieneTarea = t => esSuperAdmin || misTareas.has(t)
  const tarjetas = () => tarjetasOrdenadas(posibles, estado.prefs)
  const ctx = () => {
    const ahora = reloj()
    return {
      sb, yo, esSuperAdmin, tieneTarea, elegida: estado.elegida, unidades: estado.unidades, ahora, hoy: hoyAr(ahora),
      unidadesDe: tareas => unidadesPermitidas({ tareas, esSuperAdmin, alcances, todas: estado.unidades.map(u => u.id), elegida: estado.elegida }),
      pend: estado.pend, visibles, fabrica: estado.fabrica,
    }
  }

  const guardar = (p) => {
    estado.prefs = normalizarPrefs(p)
    guardarPrefs(yo.id, estado.prefs)
    try { win.dispatchEvent(new CustomEvent('preferencias:cambio')) } catch { /* sin eventos */ }
  }

  function pintarSaludo() {
    const s = saludo(reloj(), nombre)
    el('dashboard-titulo').innerHTML = `<h1 class="tb-saludo__hola">${escTab(s.saludo)}</h1><span class="tb-saludo__fecha">${escTab(s.fecha)}</span>`
  }
  function pintarFranja() {
    const f = el('tb-franja')
    const items = estado.acomodar ? [] : itemsFranja(tarjetas().filter(t => !t.oculta).map(t => estado.modelos.get(t.clave)))
    f.innerHTML = htmlFranja(items)
    // También arriba de Personalizar (así lo dibuja el diseño, pantalla 6a).
    f.hidden = !items.length
  }
  function pintarGrilla() {
    const lista = tarjetas()
    el('grilla-modulos').innerHTML = lista.filter(t => !t.oculta).map(t => htmlTarjeta(t, estado.modelos.get(t.clave), { acomodar: estado.acomodar })).join('')
    el('tb-escondidas').innerHTML = htmlEscondidas(lista)
    el('tb-escondidas').hidden = !estado.acomodar || estado.vista !== 'tablero'
    el('tb-acomodar-barra').hidden = !estado.acomodar || estado.vista !== 'tablero'
    el('dashboard-titulo').hidden = estado.acomodar || estado.vista !== 'tablero'
    el('grilla-modulos').classList.toggle('tb-grilla--acomodar', estado.acomodar)
    pintarFranja()
  }
  function pintarTarjeta(clave) {
    // En Personalizar no hay grilla, pero la franja de arriba sí se actualiza.
    if (estado.vista !== 'tablero') { pintarFranja(); return }
    const t = tarjetas().find(x => x.clave === clave)
    const art = [...el('grilla-modulos').querySelectorAll('[data-tarjeta]')].find(a => a.dataset.tarjeta === clave)
    if (t && art && !t.oculta) art.outerHTML = htmlTarjeta(t, estado.modelos.get(clave), { acomodar: estado.acomodar })
    pintarFranja()
  }
  function pintarPersonalizar() {
    const { fijados, resto } = ordenarBarra(modulosDeBarra(ctxVis), estado.prefs)
    el('tb-personalizar').innerHTML = htmlPersonalizar({ nombre, orden: estado.prefs.barra.orden, fijados, resto, tablero: tarjetas() })
  }
  function mostrarVista(v) {
    estado.vista = v
    el('tb-personalizar').hidden = v !== 'personalizar'
    el('grilla-modulos').hidden = v !== 'tablero'
    if (v === 'personalizar') { estado.acomodar = false; pintarPersonalizar() }
    pintarGrilla()
  }

  function cargar(clave, opciones) { return refrescarTarjeta(estado, clave, ctx(), pintarTarjeta, cargarTarjeta, opciones) }
  function cargarTodo({ mostrarCargando = false } = {}) {
    if (!estado.listo) return
    estado.pend = Promise.resolve().then(() => sb.rpc('mis_pendientes'))
      .then(({ data, error }) => (error ? null : mapaPendientes(data)))
      .catch(() => null)
    pintarSaludo()
    for (const t of tarjetas()) if (!t.oculta) cargar(t.clave, { mostrarCargando })
  }

  // ── El panel de confirmación de "Volver a como venía" (no confirm()) ──
  let alCerrar = null
  function abrirConfirmar(desde) {
    alCerrar = desde
    el('tb-confirmar').hidden = false
    el('tb-confirmar-no').focus()
  }
  function cerrarConfirmar() {
    el('tb-confirmar').hidden = true
    alCerrar?.focus?.()
    alCerrar = null
  }
  function volverDeFabrica() {
    guardar(prefsDeFabrica(estado.prefs))
    cerrarConfirmar()
    if (estado.vista === 'personalizar') pintarPersonalizar()
    pintarGrilla()
    cargarFaltantes()
  }
  function cargarFaltantes() { for (const t of tarjetas()) if (!t.oculta && !estado.modelos.has(t.clave)) cargar(t.clave) }

  // ── Mover con el teclado: la manija toma foco, Enter la levanta, las
  //    flechas mueven, Enter (o Escape) la suelta. ────────────────────────
  const MANIJAS = '[data-manija], [data-pz-manija-barra], [data-pz-manija-tablero]'
  function tipoManija(m) { return m.dataset.manija ? 'tablero' : m.dataset.pzManijaBarra ? 'barra' : 'pz-tablero' }
  function claveManija(m) { return m.dataset.manija || m.dataset.pzManijaBarra || m.dataset.pzManijaTablero }
  function selManija(tipo, clave) {
    const attr = tipo === 'tablero' ? 'data-manija' : tipo === 'barra' ? 'data-pz-manija-barra' : 'data-pz-manija-tablero'
    return [...doc.querySelectorAll(`[${attr}]`)].find(x => x.getAttribute(attr) === clave)
  }
  function ordenarPor(tipo, orden) {
    if (tipo === 'tablero') {
      const ocultas = tarjetas().filter(t => t.oculta).map(t => t.clave)
      guardar(conOrden(estado.prefs, [...orden, ...ocultas]))
      pintarGrilla()
    } else if (tipo === 'pz-tablero') {
      guardar(conOrden(estado.prefs, orden))
      pintarPersonalizar()
    } else {
      const p = normalizarPrefs(estado.prefs)
      p.barra.manual = [...orden]
      guardar(p)
      pintarPersonalizar()
    }
  }
  function ordenActual(tipo) {
    if (tipo === 'tablero') return tarjetas().filter(t => !t.oculta).map(t => t.clave)
    if (tipo === 'pz-tablero') return tarjetas().map(t => t.clave)
    return ordenarBarra(modulosDeBarra(ctxVis), estado.prefs).resto.map(m => m.clave)
  }
  function levantar(tipo, clave, si) {
    estado.teclado = si ? { tipo, clave } : null
    const m = selManija(tipo, clave)
    if (m) { m.setAttribute('aria-pressed', si ? 'true' : 'false'); m.closest('[data-tarjeta], .pz-fila')?.classList.toggle('levantada-teclado', si); m.focus() }
  }

  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el('tb-confirmar').hidden) { cerrarConfirmar(); return }
    const m = e.target?.closest?.(MANIJAS)
    if (!m) return
    const tipo = tipoManija(m), clave = claveManija(m)
    const arriba = estado.teclado && estado.teclado.tipo === tipo && estado.teclado.clave === clave
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); levantar(tipo, clave, !arriba); return }
    if (e.key === 'Escape' && arriba) { levantar(tipo, clave, false); return }
    const delta = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key]
    if (!delta || !arriba) return
    e.preventDefault()
    ordenarPor(tipo, moverClave(ordenActual(tipo), clave, delta))
    levantar(tipo, clave, true)
  })

  doc.addEventListener('pointerdown', (e) => {
    const m = e.target?.closest?.(MANIJAS)
    if (!m) return
    const tipo = tipoManija(m)
    if (tipo === 'barra' && estado.prefs.barra.orden !== 'mano') return
    const item = m.closest(tipo === 'tablero' ? '[data-tarjeta]' : '.pz-fila')
    const contenedor = tipo === 'tablero' ? el('grilla-modulos') : tipo === 'barra' ? el('pz-resto') : el('pz-lista-tablero')
    if (!item || !contenedor) return
    arrastrar(e, {
      doc, win, item, contenedor, flotar: tipo === 'tablero',
      selItem: tipo === 'tablero' ? '[data-tarjeta]' : tipo === 'barra' ? '[data-pz-barra]' : '[data-pz-tablero]',
      clave: x => x.dataset.tarjeta || x.dataset.pzBarra || x.dataset.pzTablero,
      alSoltar: orden => ordenarPor(tipo, orden),
    })
  })

  doc.addEventListener('click', (e) => {
    const t = e.target?.closest?.('button, a')
    if (!t) return
    const d = t.dataset
    if (d.reintentar) { cargar(d.reintentar, { mostrarCargando: true }); return }
    if (d.tamanoDe) { guardar(conTamano(estado.prefs, d.tamanoDe, d.tamano)); pintarGrilla(); return }
    if (d.esconder) { guardar(conOculta(estado.prefs, d.esconder, true)); pintarGrilla(); return }
    if (d.mostrar) { guardar(conOculta(estado.prefs, d.mostrar, false)); pintarGrilla(); cargarFaltantes(); return }
    if (d.ordenBarra) { const p = normalizarPrefs(estado.prefs); p.barra.orden = d.ordenBarra; guardar(p); pintarPersonalizar(); return }
    if (d.pzFijar) {
      const p = normalizarPrefs(estado.prefs)
      p.barra.fijados = p.barra.fijados.includes(d.pzFijar) ? p.barra.fijados.filter(c => c !== d.pzFijar) : [...p.barra.fijados, d.pzFijar]
      guardar(p); pintarPersonalizar(); return
    }
    if (d.pzTamano) { guardar(conTamano(estado.prefs, d.pzTamano, d.tamano)); pintarPersonalizar(); return }
    if (d.pzMostrar) {
      const oculta = normalizarPrefs(estado.prefs).tablero.ocultas.includes(d.pzMostrar)
      guardar(conOculta(estado.prefs, d.pzMostrar, !oculta)); pintarPersonalizar(); return
    }
    switch (t.id) {
      case 'pz-acomodar':
        try { win.history.replaceState(null, '', win.location.pathname) } catch { /* sin historial */ }
        // La barra lateral marca Inicio (se acomoda el tablero, no Personalizar).
        try { win.dispatchEvent(new CustomEvent('vista:cambio')) } catch { /* sin eventos */ }
        estado.acomodar = true
        mostrarVista('tablero')
        cargarFaltantes()
        el('tb-acomodar-listo')?.focus()
        return
      case 'tb-acomodar-listo': estado.acomodar = false; estado.teclado = null; pintarGrilla(); cargarFaltantes(); return
      case 'tb-acomodar-volver-fabrica': case 'pz-volver-fabrica': abrirConfirmar(t); return
      case 'tb-confirmar-no': cerrarConfirmar(); return
      case 'tb-confirmar-si': volverDeFabrica(); return
    }
  })
  el('tb-confirmar')?.addEventListener('click', (e) => { if (e.target === el('tb-confirmar')) cerrarConfirmar() })

  // ── Arranque y refrescos ────────────────────────────────────────────────
  pintarSaludo()
  mostrarVista(vistaInicial)
  const arranque = Promise.all([
    unidadesDeLaBarra().catch(() => ({ unidades: [], elegida: null })),
    cargarFabricaDePruebas(sb).catch(() => FABRICA_SIN_DATOS),
  ]).then(([u, fab]) => {
    estado.unidades = u?.unidades ?? []
    estado.elegida = u?.elegida ?? null
    estado.fabrica = fab
    estado.listo = true
    cargarTodo()
  })
  alCambiarUnidad(({ elegida }) => { estado.elegida = elegida ?? null; cargarTodo({ mostrarCargando: true }) })
  const quieto = () => doc.visibilityState !== 'hidden' && estado.vista === 'tablero' && !estado.acomodar
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible' && quieto()) cargarTodo() })
  win.setInterval(() => { if (quieto()) cargarTodo() }, 2 * 60 * 1000)
  // Producción, cada 30 segundos (una máquina que para tiene que verse ya).
  win.setInterval(() => { if (quieto() && visibles.has('produccion') && !normalizarPrefs(estado.prefs).tablero.ocultas.includes('produccion')) cargar('produccion') }, 30 * 1000)
  return { estado, arranque, cargarTodo, mostrarVista }
}
