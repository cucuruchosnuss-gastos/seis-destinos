// EL FALTANTE DE UN RETIRO: "¿DE DÓNDE SALEN?" (13/10/2026).
//
// Cuando una orden de retiro lleva más cajas de producto terminado que las
// que hay en stock, registrar_orden_retiro() las saca igual del lote
// 'SIN STOCK' y deja el renglón con revision = 'pendiente'. Este archivo arma
// la pregunta de dónde salieron esas cajas, con dos respuestas y un ajuste:
//   a) "Se están produciendo": una planilla abierta de la fábrica
//      (planillas_en_curso) → faltante_en_produccion(p_item_id, p_turno_id).
//      Cuando se carga la producción de esa planilla, la base pasa las cajas
//      'SIN STOCK' al sublote producido; si la planilla cierra sin alcanzar,
//      el renglón vuelve a 'pendiente' ("La planilla … cerró y faltan N…").
//   b) "Entró de otro lado": primero se carga el traspaso (o el ingreso) y
//      después se elige el lote, que tiene que tener stock suficiente
//      (lotes_para_retiro) → faltante_a_lote(p_item_id, p_lote, p_motivo).
//   c) "Otro / ajustar": resolver_faltante_retiro(p_item_id, p_motivo), el
//      ajuste a mano de siempre (pide retiros:precios).
//
// La pregunta se hace en DOS pantallas —la Carga (modulos/retiros.html, en un
// cartel al confirmar) y Administración (modulos/administracion.html, en
// "Retiros por revisar")— y tiene que decir lo mismo en las dos: copiada
// serían dos carteles que divergen en silencio. Por eso vive acá, una sola
// vez: DECIMOQUINTA excepción consciente a la regla de duplicar helpers (ver
// CLAUDE.md). El escape de lo que se arma acá es escFr. Cada pantalla pone
// el cartel donde le corresponde y le pasa sus eventos con accionFaltante().
//
// La base (verificada con pg_get_functiondef el 13/10/2026):
//  - planillas_en_curso(p_unidad_negocio_id) → (turno_id, fecha, turno,
//    maquina, lote, estado): las planillas 'abierto' o 'pendiente_completar'
//    de la fábrica; con retiros:cargar o retiros:precios ahí (si no, vacío).
//  - faltante_en_produccion(p_item_id, p_turno_id) → text: la revisión que
//    queda ('en_produccion', o 'aceptada' si la planilla ya tenía esa
//    producción cargada). Rechaza una planilla de otra fábrica o cerrada.
//  - faltante_a_lote(p_item_id, p_lote, p_motivo) → void: el lote tiene que
//    tener las cajas que faltan; motivo de 3 letras o más.
//  - Las dos piden retiros:cargar o retiros:precios en la fábrica de la orden
//    y un renglón de producto terminado con revision = 'pendiente'.

import { formatearNumeroAr } from './utils.js'

export const LARGO_MINIMO_MOTIVO_FALTANTE = 3

// Los pasos del cartel.
export const PASOS_FALTANTE = ['pregunta', 'produccion', 'otro', 'lote', 'ajuste', 'listo']

export function escFr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function limpioFr(t) {
  return String(t ?? '').trim()
}

// Un entero con punto de miles ("1.200"), con el formato de la app. Nunca
// inventa: lo que no es un número es "—".
export function enteroFr(n) {
  const v = typeof n === 'number' ? n : (n === null || n === undefined || n === '' ? NaN : Number(n))
  if (!Number.isFinite(v)) return '—'
  return formatearNumeroAr(Math.round(v), { decimales: 0 })
}

export function textoCajasFr(n) {
  const v = Number(n)
  return Number.isFinite(v) && Math.round(v) === 1 ? '1 caja' : `${enteroFr(n)} cajas`
}

function fechaCortaFr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return m ? `${m[3]}/${m[2]}` : ''
}

// "Máquina 2 · turno Mañana · lote 6237", con la fecha si no es la de hoy y
// "pendiente de completar" si la planilla quedó así.
export function textoPlanilla(p, hoy = null) {
  if (!p) return '—'
  const partes = [
    limpioFr(p.maquina) || 'Máquina sin nombre',
    limpioFr(p.turno) ? 'turno ' + limpioFr(p.turno) : null,
    p.lote !== null && p.lote !== undefined && p.lote !== '' ? 'lote ' + p.lote : null,
  ]
  if (p.fecha && hoy && String(p.fecha).slice(0, 10) !== hoy) partes.push(fechaCortaFr(p.fecha))
  if (p.estado === 'pendiente_completar') partes.push('pendiente de completar')
  return partes.filter(Boolean).join(' · ')
}

// "la Máquina 2" (o "esa planilla" si no se sabe la máquina).
function laMaquinaFr(p) {
  const m = limpioFr(p?.maquina)
  return m ? 'la ' + m : 'esa planilla'
}

// Lo que se ve en la orden de un renglón que espera una planilla: no es un
// error, es "esto sale de lo que se está produciendo".
export function textoEsperando(planilla) {
  const m = limpioFr(planilla?.maquina)
  const lote = planilla?.lote !== null && planilla?.lote !== undefined && planilla?.lote !== '' ? ` (lote ${planilla.lote})` : ''
  return m ? `Esperando la planilla de ${m}${lote}` : `Esperando una planilla en curso${lote}`
}

// El mensaje después de faltante_en_produccion: 'en_produccion' espera el
// cierre; 'aceptada' quiere decir que la planilla ya tenía esa producción.
export function mensajeProduccion(revision, planilla) {
  if (revision === 'aceptada') return `Listo: ya salieron del lote que produjo ${laMaquinaFr(planilla)}.`
  if (revision === 'en_produccion') {
    return planilla?.maquina
      ? `Listo: cuando se cierre la planilla de ${laMaquinaFr(planilla)} se descuentan de su lote.`
      : 'Listo: cuando se cierre esa planilla se descuentan de su lote.'
  }
  return 'Quedó pendiente: lo revisa Administración.'
}

// Los lotes de lotes_para_retiro() (lote, cajas, desde), sin 'SIN STOCK', con
// si alcanzan para lo que falta (la base exige que el lote tenga todas).
export function lotesParaFaltante(filas, faltan) {
  const n = Number(faltan) || 0
  return (Array.isArray(filas) ? filas : [])
    .filter(l => l?.lote && l.lote !== 'SIN STOCK' && Number(l.cajas) > 0)
    .map(l => ({ lote: String(l.lote), cajas: Number(l.cajas), desde: l.desde ?? null, alcanza: Number(l.cajas) >= n }))
}

// Un faltante, como lo usa el cartel. De dónde sale cada dato:
//  - itemId: el renglón (orden_retiro_items.id). Sin él no se puede resolver
//    desde la pantalla: queda para "Por revisar".
//  - unidadId, presentacionId, marcaId: para buscar los lotes y las planillas.
//  - faltan: las cajas que no estaban en stock.
export function nuevoFaltante(item) {
  return {
    item: {
      itemId: item?.itemId ?? null,
      unidadId: item?.unidadId ?? null,
      presentacionId: item?.presentacionId ?? null,
      marcaId: item?.marcaId ?? null,
      texto: limpioFr(item?.texto) || 'este producto',
      faltan: Number(item?.faltan) || 0,
      codigo: item?.codigo ?? null,
    },
    paso: 'pregunta',
    planillas: null, errorPlanillas: null,
    lotes: null, errorLotes: null,
    loteElegido: null,
    motivo: '',
    error: null,
    enviando: false,
    resultado: null,   // { revision, planilla?, lote?, mensaje }
  }
}

export function puedeResolverFaltante(f) {
  return !!(f?.item?.itemId)
}

export function validarMotivoFaltante(m, ejemplo) {
  return limpioFr(m).length >= LARGO_MINIMO_MOTIVO_FALTANTE ? null : `Escribí ${ejemplo}.`
}

// ── El HTML del cartel ──────────────────────────────────────────────────────

function htmlErrorFr(f) {
  return f.error ? `<p class="fr-error" role="alert">${escFr(f.error)}</p>` : ''
}

function htmlVolverFr(f) {
  return `<button type="button" class="fr-link" data-fr="volver"${f.enviando ? ' disabled' : ''}>&lsaquo; Volver</button>`
}

function htmlPreguntaFr(f, op) {
  const it = f.item
  return `<p class="fr-titulo" id="${escFr(op.idTitulo)}">Faltan ${escFr(textoCajasFr(it.faltan))} de ${escFr(it.texto)} en stock.</p>` +
    `<p class="fr-sub">¿De dónde salen?</p>` +
    `<div class="fr-opciones">` +
    `<button type="button" class="fr-opcion" data-fr="produccion"><strong>Se están produciendo</strong><small>Salen de una planilla que está abierta ahora</small></button>` +
    `<button type="button" class="fr-opcion" data-fr="otro"><strong>Entró de otro lado</strong><small>No se cargó el ingreso o el traspaso</small></button>` +
    `</div>` +
    (op.puedeAjustar ? `<button type="button" class="fr-link fr-link--chico" data-fr="ajuste">Otro / ajustar</button>` : '')
}

function htmlProduccionFr(f, op) {
  let cuerpo
  if (f.errorPlanillas) cuerpo = `<p class="fr-error" role="alert">${escFr(f.errorPlanillas)}</p><button type="button" class="fr-link" data-fr="produccion">Volver a intentar</button>`
  else if (f.planillas === null) cuerpo = '<p class="fr-sub">Buscando las planillas abiertas…</p>'
  else if (!f.planillas.length) cuerpo = '<p class="fr-sub">No hay ninguna planilla abierta en esta fábrica. Si se produce más tarde, dejalo pendiente: lo revisa Administración.</p>'
  else cuerpo = `<div class="fr-lista">` + f.planillas.map(p =>
      `<button type="button" class="fr-planilla" data-fr="planilla" data-fr-valor="${escFr(p.turno_id)}"${f.enviando ? ' disabled' : ''}>${escFr(textoPlanilla(p, op.hoy))}</button>`).join('') + `</div>`
  return `<p class="fr-titulo" id="${escFr(op.idTitulo)}">¿En qué planilla se están produciendo?</p>` +
    `<p class="fr-sub">Las ${escFr(textoCajasFr(f.item.faltan))} de ${escFr(f.item.texto)} salen del lote que produzca esa máquina.</p>` +
    cuerpo + htmlErrorFr(f) + htmlVolverFr(f)
}

function htmlOtroFr(f, op) {
  const link = op.linkTraspaso
    ? `<a class="fr-boton fr-boton--secundario" href="${escFr(op.linkTraspaso)}" target="_blank" rel="noopener">Ir al traspaso de producto terminado</a>` : ''
  return `<p class="fr-titulo" id="${escFr(op.idTitulo)}">Primero hay que cargar lo que entró</p>` +
    `<p class="fr-sub">Si las ${escFr(textoCajasFr(f.item.faltan))} vinieron de otra fábrica, cargá el traspaso de producto terminado (Stock → Traspaso a otra fábrica); si entraron de otro lado, el ingreso. Si no podés cargarlo vos, pedíselo a quien lo carga.</p>` +
    `<p class="fr-sub">Cuando esté cargado, volvé acá y elegí de qué lote salieron.</p>` +
    `<div class="fr-acciones">${link}` +
    `<button type="button" class="fr-boton" data-fr="lote">Ya está cargado: elegir el lote</button></div>` +
    htmlVolverFr(f)
}

function htmlLoteFr(f, op) {
  let lista
  if (f.errorLotes) lista = `<p class="fr-error" role="alert">${escFr(f.errorLotes)}</p><button type="button" class="fr-link" data-fr="lote">Volver a intentar</button>`
  else if (f.lotes === null) lista = '<p class="fr-sub">Buscando los lotes con stock…</p>'
  else if (!f.lotes.length) lista = '<p class="fr-sub">Todavía no hay ningún lote con stock de esto. Cargá el traspaso o el ingreso y volvé a mirar.</p>' +
    '<button type="button" class="fr-link" data-fr="lote">Volver a mirar</button>'
  else lista = `<div class="fr-lista" role="group" aria-label="Lotes con stock">` + f.lotes.map(l => {
      const elegido = f.loteElegido === l.lote
      const det = l.alcanza ? `hay ${textoCajasFr(l.cajas)}` : `tiene ${textoCajasFr(l.cajas)} y faltan ${textoCajasFr(f.item.faltan)}`
      return `<button type="button" class="fr-lote${elegido ? ' fr-lote--elegido' : ''}" data-fr="elegir-lote" data-fr-valor="${escFr(l.lote)}" aria-pressed="${elegido}"${l.alcanza && !f.enviando ? '' : ' disabled'}>` +
        `<strong>Lote ${escFr(l.lote)}</strong><small>${escFr(det)}</small></button>`
    }).join('') + `</div>`
  const listos = Array.isArray(f.lotes) && f.lotes.some(l => l.alcanza)
  return `<p class="fr-titulo" id="${escFr(op.idTitulo)}">¿De qué lote salieron?</p>` +
    `<p class="fr-sub">Las ${escFr(textoCajasFr(f.item.faltan))} de ${escFr(f.item.texto)} pasan a ese lote. Tiene que tener todas.</p>` +
    lista +
    (listos ? `<div class="fr-campo"><label for="fr-motivo">¿De dónde vino? (obligatorio)</label>` +
      `<textarea id="fr-motivo" data-fr-motivo maxlength="300" placeholder="Por ejemplo: traspaso desde Dolce Pasta">${escFr(f.motivo)}</textarea></div>` +
      htmlErrorFr(f) +
      `<div class="fr-acciones"><button type="button" class="fr-boton" data-fr="confirmar-lote"${f.enviando ? ' disabled' : ''}>${f.enviando ? 'Guardando…' : (f.loteElegido ? `Sacar del lote ${escFr(f.loteElegido)}` : 'Sacar de ese lote')}</button></div>`
      : htmlErrorFr(f)) +
    htmlVolverFr(f)
}

function htmlAjusteFr(f, op) {
  return `<p class="fr-titulo" id="${escFr(op.idTitulo)}">Ajustar a mano</p>` +
    `<p class="fr-sub">Al aceptar, el stock de los lotes que quedaron en negativo vuelve a cero con un ajuste.</p>` +
    `<div class="fr-campo"><label for="fr-motivo">¿Qué pasó? (obligatorio)</label>` +
    `<textarea id="fr-motivo" data-fr-motivo maxlength="300" placeholder="Por ejemplo: se compró y no se cargó el ingreso">${escFr(f.motivo)}</textarea></div>` +
    htmlErrorFr(f) +
    `<div class="fr-acciones"><button type="button" class="fr-boton" data-fr="confirmar-ajuste"${f.enviando ? ' disabled' : ''}>${f.enviando ? 'Guardando…' : 'Ajustar con este motivo'}</button></div>` +
    htmlVolverFr(f)
}

function htmlListoFr(f, op) {
  return `<p class="fr-titulo fr-titulo--ok" id="${escFr(op.idTitulo)}">${escFr(f.resultado?.mensaje ?? 'Listo.')}</p>`
}

// op: { puedeAjustar, linkTraspaso, hoy, idTitulo }
export function htmlFaltante(f, op = {}) {
  const o = { puedeAjustar: false, linkTraspaso: null, hoy: null, idTitulo: 'fr-titulo', ...op }
  if (!f) return ''
  const paso = f.paso
  if (paso === 'produccion') return htmlProduccionFr(f, o)
  if (paso === 'otro') return htmlOtroFr(f, o)
  if (paso === 'lote') return htmlLoteFr(f, o)
  if (paso === 'ajuste') return htmlAjusteFr(f, o)
  if (paso === 'listo') return htmlListoFr(f, o)
  return htmlPreguntaFr(f, o)
}

// ── Lo que hace el cartel ───────────────────────────────────────────────────
//
// ctx = { sb, f, repintar(), alResolver(resultado, item), puedeAjustar }.
// `f` conviene darlo con un getter (el cartel abierto AHORA): así una
// respuesta que llega con el cartel cerrado o cambiado no pisa nada. Las
// pantallas traducen sus eventos: un toque en [data-fr] llama a
// accionFaltante(ctx, b.dataset.fr, b.dataset.frValor); lo que se escribe en
// [data-fr-motivo] va a escribirMotivoFaltante(ctx, valor), sin redibujar.

export async function cargarPlanillas(ctx) {
  const f = ctx.f
  f.planillas = null
  f.errorPlanillas = null
  ctx.repintar?.()
  try {
    const { data, error } = await ctx.sb.rpc('planillas_en_curso', { p_unidad_negocio_id: f.item.unidadId })
    if (error) throw error
    if (ctx.f !== f || f.paso !== 'produccion') return
    f.planillas = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('No se pudieron leer las planillas en curso:', err)
    if (ctx.f !== f) return
    f.errorPlanillas = 'No se pudieron leer las planillas abiertas. Revisá la conexión y volvé a intentar.'
  }
  ctx.repintar?.()
}

export async function cargarLotesFaltante(ctx) {
  const f = ctx.f
  f.lotes = null
  f.errorLotes = null
  f.loteElegido = null
  ctx.repintar?.()
  try {
    const { data, error } = await ctx.sb.rpc('lotes_para_retiro', {
      p_unidad_negocio_id: f.item.unidadId, p_presentacion_id: f.item.presentacionId, p_marca_id: f.item.marcaId ?? null,
    })
    if (error) throw error
    if (ctx.f !== f || f.paso !== 'lote') return
    f.lotes = lotesParaFaltante(data, f.item.faltan)
    const alcanzan = f.lotes.filter(l => l.alcanza)
    if (alcanzan.length === 1) f.loteElegido = alcanzan[0].lote
  } catch (err) {
    console.error('No se pudieron leer los lotes:', err)
    if (ctx.f !== f) return
    f.errorLotes = 'No se pudieron leer los lotes. Revisá la conexión y volvé a intentar.'
  }
  ctx.repintar?.()
}

// Las tres que mandan a la base se llaman SOLO desde accionFaltante(), que ya
// corta si hay algo en vuelo (un doble toque manda una vez).
async function elegirPlanillaFr(ctx, turnoId) {
  const f = ctx.f
  const planilla = (f.planillas ?? []).find(p => String(p.turno_id) === String(turnoId))
  if (!planilla) return
  f.enviando = true
  f.error = null
  ctx.repintar?.()
  try {
    const { data, error } = await ctx.sb.rpc('faltante_en_produccion', { p_item_id: f.item.itemId, p_turno_id: planilla.turno_id })
    if (error) throw error
    const revision = typeof data === 'string' ? data : 'en_produccion'
    f.resultado = { revision, planilla: { maquina: planilla.maquina ?? null, lote: planilla.lote ?? null, turno: planilla.turno ?? null }, mensaje: mensajeProduccion(revision, planilla) }
    f.paso = 'listo'
    f.enviando = false
    ctx.alResolver?.(f.resultado, f.item)
  } catch (err) {
    console.error('No se pudo pasar el faltante a la planilla:', err)
    f.enviando = false
    // Los mensajes de la base ya vienen escritos para una persona: tal cual.
    f.error = err?.message || 'No se pudo guardar. Probá de nuevo.'
  }
  ctx.repintar?.()
}

async function confirmarLoteFr(ctx) {
  const f = ctx.f
  if (!f.loteElegido) { f.error = 'Elegí el lote.'; ctx.repintar?.(); return }
  const motivoMal = validarMotivoFaltante(f.motivo, 'de dónde vino (por ejemplo: "traspaso desde Dolce Pasta")')
  if (motivoMal) { f.error = motivoMal; ctx.repintar?.(); return }
  f.enviando = true
  f.error = null
  ctx.repintar?.()
  try {
    const { error } = await ctx.sb.rpc('faltante_a_lote', { p_item_id: f.item.itemId, p_lote: f.loteElegido, p_motivo: limpioFr(f.motivo) })
    if (error) throw error
    f.resultado = { revision: 'aceptada', lote: f.loteElegido, mensaje: `Listo: las ${textoCajasFr(f.item.faltan)} salieron del lote ${f.loteElegido}.` }
    f.paso = 'listo'
    f.enviando = false
    ctx.alResolver?.(f.resultado, f.item)
  } catch (err) {
    console.error('No se pudo pasar el faltante al lote:', err)
    f.enviando = false
    f.error = err?.message || 'No se pudo guardar. Probá de nuevo.'
  }
  ctx.repintar?.()
}

async function confirmarAjusteFr(ctx) {
  const f = ctx.f
  const motivoMal = validarMotivoFaltante(f.motivo, 'qué pasó (por ejemplo: "se compró y no se cargó el ingreso")')
  if (motivoMal) { f.error = motivoMal; ctx.repintar?.(); return }
  f.enviando = true
  f.error = null
  ctx.repintar?.()
  try {
    const { error } = await ctx.sb.rpc('resolver_faltante_retiro', { p_item_id: f.item.itemId, p_motivo: limpioFr(f.motivo) })
    if (error) throw error
    f.resultado = { revision: 'aceptada', ajuste: true, mensaje: 'Listo: quedó ajustado. El stock de esos lotes volvió a cero.' }
    f.paso = 'listo'
    f.enviando = false
    ctx.alResolver?.(f.resultado, f.item)
  } catch (err) {
    console.error('No se pudo ajustar el faltante:', err)
    f.enviando = false
    f.error = err?.message || 'No se pudo guardar. Probá de nuevo.'
  }
  ctx.repintar?.()
}

function irAFr(ctx, paso) {
  const f = ctx.f
  f.paso = paso
  f.error = null
  // Volver a la pregunta empieza de nuevo: el motivo de otro camino no sirve.
  if (paso === 'pregunta') f.motivo = ''
}

export async function accionFaltante(ctx, accion, valor) {
  const f = ctx?.f
  if (!f || !puedeResolverFaltante(f)) return
  if (f.enviando && accion !== 'volver') return
  if (accion === 'produccion') { irAFr(ctx, 'produccion'); return cargarPlanillas(ctx) }
  if (accion === 'otro') { irAFr(ctx, 'otro'); ctx.repintar?.(); return }
  if (accion === 'lote') { irAFr(ctx, 'lote'); return cargarLotesFaltante(ctx) }
  if (accion === 'ajuste') { if (!ctx.puedeAjustar) return; irAFr(ctx, 'ajuste'); ctx.repintar?.(); return }
  if (accion === 'volver') {
    if (f.enviando) return
    const destino = f.paso === 'lote' ? 'otro' : 'pregunta'
    // Una pantalla que hace la pregunta con sus propios botones (Administración)
    // cierra el panel en vez de volver a preguntar.
    if (destino === 'pregunta' && ctx.alVolverAlPrincipio) { ctx.alVolverAlPrincipio(); return }
    irAFr(ctx, destino)
    ctx.repintar?.()
    return
  }
  if (accion === 'planilla') return elegirPlanillaFr(ctx, valor)
  if (accion === 'elegir-lote') {
    const l = (f.lotes ?? []).find(x => x.lote === valor)
    if (!l || !l.alcanza) return
    f.loteElegido = l.lote
    f.error = null
    ctx.repintar?.()
    return
  }
  if (accion === 'confirmar-lote') return confirmarLoteFr(ctx)
  if (accion === 'confirmar-ajuste') { if (!ctx.puedeAjustar) return; return confirmarAjusteFr(ctx) }
}

export function escribirMotivoFaltante(ctx, valor) {
  if (ctx?.f) ctx.f.motivo = String(valor ?? '')
}

// Los estilos del cartel (las dos pantallas los inyectan una vez con
// asegurarEstilosFaltante). Los colores son los de la app.
export const ESTILOS_FALTANTE = `
.fr-titulo { font-family: var(--fuente-titulo, inherit); font-size: 20px; font-weight: 700; line-height: 1.25; margin: 0 0 6px; color: var(--color-texto, #1C1A17); }
.fr-titulo--ok { color: var(--verde-oscuro, #1E6B45); }
.fr-sub { font-size: 15px; line-height: 1.45; margin: 0 0 12px; color: var(--color-texto-2, #6B645A); }
.fr-opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0 12px; }
@media (max-width: 520px) { .fr-opciones { grid-template-columns: 1fr; } }
.fr-opcion { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-height: 84px; padding: 14px 16px; border: 2px solid var(--color-acento, #C2410C); border-radius: 12px; background: var(--color-fondo, #fff); color: var(--color-texto, #1C1A17); font: inherit; text-align: left; cursor: pointer; }
.fr-opcion strong { font-size: 17px; }
.fr-opcion small { font-size: 13.5px; color: var(--color-texto-2, #6B645A); }
.fr-opcion:hover, .fr-opcion:focus-visible { background: var(--color-acento-suave, #FDEEE4); }
.fr-lista { display: flex; flex-direction: column; gap: 8px; margin: 0 0 12px; }
.fr-planilla, .fr-lote { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 48px; padding: 10px 14px; border: 1px solid var(--color-borde-boton, #9A9287); border-radius: 12px; background: var(--color-fondo, #fff); color: var(--color-texto, #1C1A17); font: inherit; font-size: 16px; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.fr-planilla:hover, .fr-lote:hover { border-color: var(--color-acento, #C2410C); }
.fr-lote small { font-size: 13.5px; color: var(--color-texto-2, #6B645A); }
.fr-lote--elegido { border: 2px solid var(--color-acento, #C2410C); background: var(--color-acento-suave, #FDEEE4); }
.fr-planilla:disabled, .fr-lote:disabled { opacity: 0.55; cursor: default; }
.fr-campo { display: flex; flex-direction: column; gap: 6px; margin: 0 0 12px; }
.fr-campo label { font-size: 14px; font-weight: 600; }
.fr-campo textarea { min-height: 72px; padding: 10px 12px; border: 1px solid var(--color-borde-fuerte, #D6CFC4); border-radius: 8px; font: inherit; font-size: 16px; resize: vertical; }
.fr-acciones { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 10px; }
.fr-boton { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 18px; border: 0; border-radius: 12px; background: var(--color-acento, #C2410C); color: #fff; font: inherit; font-weight: 700; font-size: 16px; text-decoration: none; cursor: pointer; }
.fr-boton--secundario { background: var(--color-fondo, #fff); color: var(--color-texto, #1C1A17); border: 1px solid var(--color-borde-boton, #9A9287); }
.fr-boton:disabled { opacity: 0.6; cursor: default; }
.fr-link { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--color-acento-hover, #8F2F08); font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; }
.fr-link--chico { font-size: 14px; font-weight: 500; color: var(--color-texto-2, #6B645A); }
.fr-error { margin: 0 0 10px; color: var(--bordo, #8B1E3F); font-weight: 600; font-size: 14.5px; }
.fr-esperando { color: var(--color-texto-2, #6B645A); font-size: 14px; }
`

export function asegurarEstilosFaltante() {
  if (typeof document === 'undefined' || document.getElementById('estilos-faltante-retiro')) return
  const st = document.createElement('style')
  st.id = 'estilos-faltante-retiro'
  st.textContent = ESTILOS_FALTANTE
  document.head.appendChild(st)
}
