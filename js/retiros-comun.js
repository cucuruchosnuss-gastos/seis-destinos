// LA HOJA DE UNA ORDEN DE RETIRO (26/09/2026): imprimirla, mandarla en PDF y
// compartirla como texto. La usan DOS módulos: la CARGA en el depósito
// (modulos/retiros.html, SIN precios) y ADMINISTRACIÓN
// (modulos/administracion.html, CON precios). Vive acá, una sola vez, por el
// mismo motivo que js/cobranzas-comun.js: es "la misma hoja" (pedido de Facu),
// y copiada en dos archivos serían dos hojas que divergen en silencio —el
// logo de una empresa en una y no en la otra, la leyenda legal en una sola—.
// Quinta excepción consciente a la regla de duplicar helpers (ver CLAUDE.md).
//
// LA HOJA SIN PRECIOS NO TIENE NINGUNA COLUMNA DE PLATA, aunque el objeto de la
// orden traiga precios: `conPrecios` es lo único que las dibuja, y la carga
// nunca lo pasa. El que opera no ve plata.
//
// Las suites leen este archivo con pruebas/fuente-retiros.js, que lo pega
// detrás del script del módulo y le saca los `export`.

import { formatearNumeroAr } from './utils.js'
import { registrarError } from './salud.js'
// Los insumos por bulto (23/10/2026): la regla de cómo se dice una cantidad y
// un precio por bulto vive UNA vez en js/cantidades.js.
import { cantidadSegunVista, modoDePrecio, precioDesdeBase } from './cantidades.js'

// El escape de la hoja. La hoja se arma ENTERA acá, así que el escape que
// usa vive acá también (cada módulo conserva el suyo para sus pantallas).
export function escHoja(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const ZONA_HOJA = 'America/Argentina/Buenos_Aires'

// ── El logo de la empresa ──────────────────────────────────────────────────
// unidades_negocio.logo_url es un nombre de archivo en la RAÍZ del repo
// ('logo-cucuruchos-nuss.png'). Viene de la base y termina en un src=: por eso
// solo se acepta un nombre de archivo de imagen, sin carpetas, sin "..", sin
// esquema (nada de "javascript:" ni "https://otro-sitio"). Cualquier otra cosa
// es "sin logo", nunca un src raro.
export function logoSeguro(logoUrl) {
  const t = String(logoUrl ?? '').trim()
  return /^[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp)$/i.test(t) && !t.includes('..') ? t : null
}

// Qué datos de la empresa faltan para que la hoja salga completa. La hoja sale
// igual —con el logo y el nombre, sin huecos— y la PANTALLA dice qué falta.
export function datosFaltantesEmpresa(emp) {
  const faltan = []
  if (!String(emp?.razon_social ?? '').trim()) faltan.push('razón social')
  if (!String(emp?.cuit ?? '').trim()) faltan.push('CUIT')
  if (!String(emp?.domicilio ?? '').trim()) faltan.push('domicilio')
  if (!String(emp?.telefono ?? '').trim()) faltan.push('teléfono')
  return faltan
}

export function textoFaltantesEmpresa(emp) {
  const f = datosFaltantesEmpresa(emp)
  if (!f.length) return ''
  const lista = f.length === 1 ? f[0] : `${f.slice(0, -1).join(', ')} y ${f[f.length - 1]}`
  return `A la hoja de ${String(emp?.nombre ?? 'esta empresa')} le falta${f.length === 1 ? '' : 'n'}: ${lista}. Sale igual, con el logo y el nombre; esos datos los carga administración.`
}

// ── Fechas ─────────────────────────────────────────────────────────────────
// AAAA-MM-DD → DD/MM/AAAA, sin pasar por Date (que la correría de día).
export function fechaHoja(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? ''))) return '—'
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}

// Un momento (timestamptz) en hora de Argentina: "26/09/2026 14:32".
export function fechaHoraHoja(momento) {
  const d = new Date(momento ?? NaN)
  if (!momento || Number.isNaN(d.getTime())) return '—'
  const p = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HOJA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {})
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

// ── Números ────────────────────────────────────────────────────────────────
// Cajas y unidades se cuentan de a enteros. Un dato ausente es "—", nunca "0".
export function enteroHoja(n) {
  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'
  return formatearNumeroAr(Number(n), { decimales: 0 })
}

// Un importe: "$ 1.234,50". Ausente → "—", NUNCA "$ 0,00": Number(null) es 0
// y es finito, así que convertiría "no hay precio" en una cifra plausible.
export function importeHoja(n, moneda = 'ARS') {
  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'
  const simbolo = moneda === 'USD' ? 'US$' : '$'
  return `${simbolo} ${formatearNumeroAr(Number(n), { decimales: 2 })}`
}

// ── Los renglones de INSUMOS (26/09/2026) ──────────────────────────────────
// Una orden puede llevar, además de producto terminado (por cajas), insumos de
// reventa —materia prima, cajas, bolsas— por CANTIDAD en su unidad de medida.
// Un renglón de insumo lleva `esInsumo: true`, `cantidad` y `unidad`, y NO
// tiene cajas ni unidades: no suma al total de cajas.
export const NOMBRE_UNIDAD_HOJA = { kg: 'kg', lt: 'lt', un: 'un.' }

// Kilos y litros hasta 3 decimales; lo que se cuenta de a unidades, enteros.
export function decimalesDeUnidad(unidad) {
  return unidad === 'un' ? 0 : 3
}

export function unidadHoja(unidad) {
  const u = String(unidad ?? '').trim()
  return NOMBRE_UNIDAD_HOJA[u] ?? u
}

// "25 kg", "12,5 kg", "300 un.". Ausente → "—", nunca "0 kg".
export function cantidadInsumoHoja(n, unidad) {
  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'
  const texto = formatearNumeroAr(Number(n), { decimales: decimalesDeUnidad(unidad), minimos: 0 })
  const u = unidadHoja(unidad)
  return u ? `${texto} ${u}` : texto
}

// UN INSUMO POR BULTO EN LA HOJA (23/10/2026). Un renglón de insumo puede
// traer `contenido`: lo que trae UN bulto, SOLO si el insumo se muestra por
// bulto (insumos.vista_preferida = 'bulto') y se sabe cuánto trae; cada
// pantalla lo decide con js/cantidades.js y, si no, lo manda null. Con
// contenido, la cantidad dice "4 bultos de 25 kg (100 kg)" y el precio "por
// bulto"; sin contenido, todo sigue en su unidad.
export function modoPrecioHoja(r) {
  return modoDePrecio({ unidad: r?.unidad, vista: r?.contenido ? 'bulto' : 'base', contenido: r?.contenido ?? null })
}

// "4 bultos de 25 kg (100 kg)", o "100 kg" si no va por bulto.
export function cantidadInsumoBultoHoja(n, unidad, contenido) {
  const kilos = cantidadInsumoHoja(n, unidad)
  if (!contenido || kilos === '—') return kilos
  const r = cantidadSegunVista({ cantidad: n, unidad, vista: 'bulto', contenido })
  return r.enBultos ? `${r.cabeza} ${r.cola} (${kilos})` : kilos
}

// El precio de un renglón de insumo en la hoja: "$ 17.500,00 / bulto" (sale
// de lo guardado y de su subtotal, así no dice 17.499,90) o "$ 700,00 / kg".
export function precioInsumoHoja(r, moneda) {
  const modo = modoPrecioHoja(r)
  if (!modo.porBulto) {
    const p = importeHoja(r?.precio, moneda)
    const u = unidadHoja(r?.unidad)
    return p === '—' || !u ? p : p + ' / ' + u
  }
  const p = importeHoja(precioDesdeBase(r?.precio, modo, { decimalesBase: 2, subtotal: r?.subtotal, cantidad: r?.cantidad }), moneda)
  return p === '—' ? p : p + ' / bulto'
}

export function tieneInsumos(orden) {
  return (orden?.renglones ?? []).some(r => r?.esInsumo === true)
}

export function totalCajasOrden(orden) {
  return (orden?.renglones ?? []).reduce((s, r) => s + (r?.esInsumo ? 0 : (Number(r.cajas) || 0)), 0)
}

// Las unidades de los renglones de PRODUCTO (los de insumo no tienen).
export function totalUnidadesOrden(orden) {
  const rs = (orden?.renglones ?? []).filter(r => !r?.esInsumo)
  if (rs.some(r => r.unidades === null || r.unidades === undefined || r.unidades === '')) return null
  return rs.reduce((s, r) => s + (Number(r.unidades) || 0), 0)
}

// "7023-1 (6) · 7024-2 (4)". Los lotes son IDENTIFICADORES: van tal cual. Con
// `unidad` (un renglón de insumo) lo que va entre paréntesis es la cantidad en
// esa unidad; un lote sin cantidad conocida va solo.
export function textoLotes(lotes, unidad = null) {
  const lista = Array.isArray(lotes) ? lotes : []
  if (!lista.length) return '—'
  return lista.map(l => {
    const lote = String(l?.lote ?? '—')
    if (unidad) {
      const c = l?.cantidad
      return c === null || c === undefined || c === '' ? lote : `${lote} (${cantidadInsumoHoja(c, unidad)})`
    }
    return `${lote} (${enteroHoja(l?.cajas)})`
  }).join(' · ')
}

// El nombre de un insumo en la hoja: "Harina 000 · Molino Cañuelas".
export function nombreInsumoHoja(r) {
  return [r?.producto, r?.marca].map(x => String(x ?? '').trim()).filter(Boolean).join(' · ') || 'Insumo'
}

// ── LA HOJA ────────────────────────────────────────────────────────────────
// EL DISEÑO DE LA IMPRESIÓN (07/10/2026, aprobado por Facu): BLANCO Y NEGRO,
// A4 vertical, letra Archivo (Google Fonts) con respaldo sans-serif.
//
// HOJA PARTIDA AL MEDIO: el ORIGINAL arriba y el DUPLICADO abajo, cada uno en
// media A4, con una línea punteada de 1,5 px entre los dos. Si los renglones
// no entran en media hoja —se MIDE, no se cuenta: armarHoja()— cada copia va
// en hojas enteras (primero el original, después el duplicado) y debajo del
// título dice "ORIGINAL · HOJA 1 DE N". Ningún renglón se corta entre páginas.
//
// Cada copia: la cabecera (logo en círculo, la fábrica y sus datos, "RETIRO DE
// MERCADERÍA" con la copia, y el recuadro con el número de orden y la fecha),
// el cliente (nombre grande; a la derecha la localidad y el transporte o
// "Retira: en fábrica"), la tabla CAJAS · PRODUCTO · LOTE (el nombre ENTERO,
// en dos renglones si hace falta, nunca "…") con TOTAL DE CAJAS, y el pie:
// "Entregó", FIRMA / ACLARACIÓN / DNI y la leyenda legal entera.
//
// CON PRECIOS (Administración): suma PRECIO y SUBTOTAL a la tabla y el total
// en pesos al lado de TOTAL DE CAJAS. Sin `conPrecios: true`, ninguna columna
// de plata, aunque el objeto traiga precios.
export const COPIAS_IMPRESION = ['ORIGINAL', 'DUPLICADO']
export const COPIAS_PDF = ['ORIGINAL']
export const LEYENDA_LEGAL = 'Documento interno. No válido como factura.'

// Media A4 y una A4 entera, en milímetros, adentro de los 8 mm de margen de
// @page (297 − 16 = 281). Medido en Chromium (07/10/2026): con 137 mm las dos
// copias y la línea punteada sumaban 281,25; con 136 entran.
export const ALTO_UTIL_A4_MM = 281
export const ALTO_MEDIA_HOJA_MM = 136
export const ANCHO_UTIL_A4_MM = 194

function htmlLogoHoja(emp, nombre) {
  const logo = logoSeguro(emp?.logo_url)
  // logoSeguro() ya dejó solo un nombre de archivo de imagen (la raíz del
  // repo, un nivel arriba de modulos/); igual va con encodeURIComponent.
  return logo
    ? `<span class="rh-logo"><img src="../${encodeURIComponent(logo)}" alt="${escHoja(nombre)}"></span>`
    : `<span class="rh-logo rh-logo--vacio" aria-hidden="true"></span>`
}

function htmlEmpresaHoja(emp) {
  const t = (x) => String(x ?? '').trim()
  const nombre = t(emp?.nombre) || t(emp?.razon_social) || 'Empresa'
  const datos = [
    t(emp?.razon_social) && t(emp.razon_social) !== nombre ? t(emp.razon_social) : '',
    t(emp?.cuit) ? `CUIT ${t(emp.cuit)}` : '',
    t(emp?.domicilio),
    t(emp?.telefono) ? `Tel. ${t(emp.telefono)}` : '',
  ].filter(Boolean)
  return `<div class="rh-empresa">${htmlLogoHoja(emp, nombre)}` +
    `<div class="rh-empresa__datos"><strong class="rh-empresa__nombre">${escHoja(nombre)}</strong>` +
    datos.map(d => `<span>${escHoja(d)}</span>`).join('') + `</div></div>`
}

// "Retira: en fábrica" cuando no hay transporte.
export function textoTransporteHoja(transporte) {
  const t = String(transporte ?? '').trim()
  return t ? `Transporte: ${t}` : 'Retira: en fábrica'
}

function htmlClienteHoja(cli, transporte) {
  const t = (x) => String(x ?? '').trim()
  const nombre = t(cli?.nombre) || t(cli?.razon_social) || 'Cliente'
  const localidad = t(cli?.localidad)
  return `<div class="rh-cliente"><div class="rh-cliente__izq"><span class="rh-rotulo">CLIENTE</span>` +
    `<strong class="rh-cliente__nombre">${escHoja(nombre)}</strong></div>` +
    `<div class="rh-cliente__der">${localidad ? `<span>${escHoja(localidad)}</span>` : ''}` +
    `<span>${escHoja(textoTransporteHoja(transporte))}</span></div></div>`
}

// "7021 ×15 · 7033 ×10", y lo que no estaba en stock (el lote "SIN STOCK")
// como "faltan 14". Los lotes son IDENTIFICADORES: van tal cual.
export const LOTE_SIN_STOCK_HOJA = 'SIN STOCK'
export function textoLotesHoja(lotes, unidad = null) {
  const lista = Array.isArray(lotes) ? lotes : []
  if (!lista.length) return '—'
  const cuanto = (l) => unidad ? cantidadInsumoHoja(l?.cantidad, unidad) : enteroHoja(l?.cajas)
  return lista.map(l => {
    const lote = String(l?.lote ?? '—')
    const c = unidad ? l?.cantidad : l?.cajas
    if (lote === LOTE_SIN_STOCK_HOJA) return `faltan ${cuanto(l)}`
    if (c === null || c === undefined || c === '') return lote
    return lista.length === 1 ? lote : `${lote} ×${cuanto(l)}`
  }).join(' · ')
}

// Lo que faltó de un renglón (su lote "SIN STOCK"), o null.
function faltanteDeRenglon(r) {
  const l = (Array.isArray(r?.lotes) ? r.lotes : []).find(x => String(x?.lote ?? '') === LOTE_SIN_STOCK_HOJA)
  if (!l) return null
  const n = Number(r?.esInsumo ? l.cantidad : l.cajas)
  return n > 0 ? n : null
}

// "Cucurucho grande · Caja x 100 · LOLO": el producto con su presentación y
// su cono (o "sin cono"); un insumo con su marca. ENTERO, siempre.
export function descripcionHoja(r) {
  if (r?.esInsumo) return nombreInsumoHoja(r)
  const cono = String(r?.cono ?? '').trim()
  return [r?.producto, r?.presentacion, cono && cono !== '—' ? (cono === 'Sin cono' ? 'sin cono' : cono) : '']
    .map(x => String(x ?? '').trim()).filter(Boolean).join(' · ') || '—'
}

function cantidadHoja(r) {
  return r?.esInsumo ? cantidadInsumoBultoHoja(r.cantidad, r.unidad, r.contenido) : enteroHoja(r?.cajas)
}

function htmlFilaHoja(r, conPrecios, moneda) {
  const lotes = textoLotesHoja(r?.lotes, r?.esInsumo ? r.unidad : null)
  let precio = ''
  if (conPrecios) {
    const p = r?.esInsumo ? precioInsumoHoja(r, moneda) : importeHoja(r?.precio, moneda)
    precio = `<td class="rh-num rh-plata">${escHoja(p)}</td><td class="rh-num rh-plata">${escHoja(importeHoja(r?.subtotal, moneda))}</td>`
  }
  return `<tr class="rh-fila${r?.esInsumo ? ' rh-insumo' : ''}"><td class="rh-num rh-cajas">${escHoja(cantidadHoja(r))}</td>` +
    `<td class="rh-producto">${escHoja(descripcionHoja(r))}</td><td class="rh-lote">${escHoja(lotes)}</td>${precio}</tr>`
}

// Las cantidades de los insumos, sumadas por unidad ("100 un. + 25,5 kg"):
// kilos y unidades no se suman entre sí.
function totalInsumosHoja(orden) {
  const porUnidad = new Map()
  for (const r of orden?.renglones ?? []) {
    if (!r?.esInsumo || !(Number(r.cantidad) > 0)) continue
    const u = String(r.unidad ?? '')
    porUnidad.set(u, (porUnidad.get(u) ?? 0) + Number(r.cantidad))
  }
  return [...porUnidad.entries()].map(([u, n]) => cantidadInsumoHoja(n, u || null)).join(' + ')
}

function htmlTablaHoja(renglones, conPrecios, moneda, { conTotal, orden }) {
  const col = '<colgroup><col class="rh-col-cajas"><col class="rh-col-producto"><col class="rh-col-lote">' +
    (conPrecios ? '<col class="rh-col-precio"><col class="rh-col-precio">' : '') + '</colgroup>'
  const hayInsumo = (orden?.renglones ?? []).some(r => r?.esInsumo)
  const cab = '<tr><th class="rh-num">CAJAS</th><th>PRODUCTO</th><th>LOTE</th>' +
    (conPrecios ? `<th class="rh-num">${hayInsumo ? 'PRECIO' : 'PRECIO X CAJA'}</th><th class="rh-num">SUBTOTAL</th>` : '') + '</tr>'
  const filas = renglones.map(r => htmlFilaHoja(r, conPrecios, moneda)).join('')
  let pie = ''
  if (conTotal) {
    const insumos = totalInsumosHoja(orden)
    pie = `<tfoot><tr class="rh-total"><td class="rh-num rh-cajas">${escHoja(enteroHoja(totalCajasOrden(orden)))}</td>` +
      `<td colspan="2" class="rh-total__rotulo">TOTAL DE CAJAS${insumos ? ` <span class="rh-total__insumos">+ ${escHoja(insumos)}</span>` : ''}</td>` +
      (conPrecios ? `<td></td><td class="rh-num rh-plata rh-total__plata">${escHoja(importeHoja(orden?.total, moneda))}</td>` : '') + '</tr></tfoot>'
  }
  return `<table class="rh-tabla">${col}<thead>${cab}</thead><tbody>${filas}</tbody>${pie}</table>`
}

// Las observaciones y el faltante (si hay), en un renglón chico debajo de la tabla.
function htmlNotasHoja(orden) {
  const obs = String(orden?.observaciones ?? '').trim()
  const faltantes = (orden?.renglones ?? []).map(r => {
    const f = faltanteDeRenglon(r)
    if (f === null) return null
    const cuanto = r.esInsumo ? cantidadInsumoHoja(f, r.unidad) : `${enteroHoja(f)} ${f === 1 ? 'caja' : 'cajas'}`
    return `${cuanto} de ${descripcionHoja(r)}`
  }).filter(Boolean)
  if (!obs && !faltantes.length) return ''
  return '<p class="rh-notas">' + (obs ? `<strong>Observaciones:</strong> ${escHoja(obs)} ` : '') +
    (faltantes.length ? `<strong>Faltante:</strong> ${escHoja(faltantes.join('; '))}, pendiente de revisión.` : '') + '</p>'
}

function htmlPieHoja(orden) {
  return '<div class="rh-pie">' +
    `<div class="rh-entrego">Entregó: <strong>${escHoja(String(orden?.cargadaPor ?? '').trim() || '—')}</strong></div>` +
    '<div class="rh-firmas"><span class="rh-firma">FIRMA</span><span class="rh-firma">ACLARACIÓN</span><span class="rh-firma">DNI</span></div></div>'
}

function htmlSelloAnulada(orden) {
  const detalle = [orden?.anuladaEn ? fechaHoja(orden.anuladaEn) : '', orden?.anuladaPor, orden?.anuladaMotivo]
    .map(x => String(x ?? '').trim()).filter(Boolean).join(' · ')
  return `<div class="rh-anulada-capa" aria-hidden="true"><div class="rh-anulada">ANULADA` +
    (detalle ? `<span class="rh-anulada__detalle">${escHoja(detalle)}</span>` : '') + `</div></div>`
}

// "ORIGINAL", o "ORIGINAL · HOJA 1 DE 3" en hojas enteras.
export function rotuloCopiaHoja(copia, pagina = 1, paginas = 1, entera = false) {
  return entera ? `${copia} · HOJA ${pagina} DE ${paginas}` : copia
}

// UNA copia en UNA página: la cabecera, el cliente, sus renglones y, en la
// última, el total, las notas y el pie. La leyenda va en todas.
function htmlCopiaHoja(orden, copia, { conPrecios, renglones, pagina = 1, paginas = 1, entera = false }) {
  const anulada = orden?.estado === 'anulada'
  const ultima = pagina === paginas
  const fecha = orden?.cargadaEn ? fechaHoraHoja(orden.cargadaEn) : fechaHoja(orden?.fecha)
  return `<section class="rh-copia${anulada ? ' rh-copia--anulada' : ''}" data-copia="${escHoja(copia)}">` +
    `<header class="rh-cab">${htmlEmpresaHoja(orden?.empresa)}` +
    `<div class="rh-titulo"><span class="rh-titulo__grande">ORDEN DE PEDIDO</span>` +
    `<span class="rh-titulo__copia">${escHoja(rotuloCopiaHoja(copia, pagina, paginas, entera))}</span>` +
    (anulada ? '<span class="rh-titulo__anulada">ANULADA</span>' : '') + '</div>' +
    `<div class="rh-orden"><span class="rh-orden__rotulo">ORDEN N°</span>` +
    `<span class="rh-codigo">${escHoja(orden?.codigo || '—')}</span>` +
    `<span class="rh-orden__fecha">${escHoja(fecha)}</span></div></header>` +
    htmlClienteHoja(orden?.cliente, orden?.transporte) +
    htmlTablaHoja(renglones, conPrecios, orden?.moneda || 'ARS', { conTotal: ultima, orden }) +
    (ultima ? htmlNotasHoja(orden) + htmlPieHoja(orden) : `<p class="rh-sigue">Sigue en la hoja ${escHoja(pagina + 1)}.</p>`) +
    `<p class="rh-legal">${escHoja(LEYENDA_LEGAL)}</p>` +
    (anulada ? htmlSelloAnulada(orden) : '') + `</section>`
}

export const CORTE_HOJA = '<div class="rh-corte" aria-hidden="true"></div>'

// EL PLAN DE LA HOJA, con lo que se midió (puro: lo prueban las suites sin
// navegador). `medidas`: { copiaEntera } = cuánto mide UNA copia con todos
// sus renglones, y para las hojas enteras { fijo, final, intermedio, filas }:
// la cabecera + el cliente + el encabezado de la tabla; lo que va al final
// (total, notas, pie y leyenda); lo que va en una hoja que sigue ("Sigue en
// la hoja…" y leyenda); y el alto de cada renglón. Todo en mm.
// → { modo: 'media' } o { modo: 'entera', paginas: [[desde, hasta), …] }.
//
// SIN CORTES DE MÁS (23/10/2026, caso N-0025: 5 renglones salieron en "HOJA 1
// DE 2" con 4 y "HOJA 2 DE 2" con 1, y entraban en media hoja):
//  - si la copia ENTERA entra en una hoja, va en UNA hoja por copia, sin
//    "Sigue en la hoja…": se parte solo lo que de verdad no entra;
//  - si una medida no puede ser (medidasRaras: una parte más alta que la hoja
//    entera, algo que no es un número o la hoja medida sin sus estilos), no se
//    confía en las partes: media hoja si la copia entra, si no UNA hoja entera.
export function planHoja(medidas, { media = ALTO_MEDIA_HOJA_MM, entera = ALTO_UTIL_A4_MM } = {}) {
  const filas = Array.isArray(medidas?.filas) ? medidas.filas.map(Number) : []
  const copia = Number(medidas?.copiaEntera)
  if (copia <= media) return { modo: 'media' }
  const una = { modo: 'entera', paginas: [[0, filas.length]] }
  if (medidasRaras(medidas, { entera })) return copia > 0 ? una : { modo: 'media' }
  if (copia <= entera) return una
  const fijo = Number(medidas?.fijo) || 0, final = Number(medidas?.final) || 0, inter = Number(medidas?.intermedio) || 0
  const paginas = []
  let desde = 0
  while (desde < filas.length || !paginas.length) {
    // ¿Entra todo lo que queda, con el final?
    let suma = 0, k = desde
    while (k < filas.length && fijo + suma + filas[k] + final <= entera) { suma += filas[k]; k++ }
    if (k === filas.length) { paginas.push([desde, k]); break }
    // No: esta hoja lleva lo que entre con "Sigue en la hoja…" (al menos un renglón).
    suma = 0; k = desde
    while (k < filas.length && fijo + suma + filas[k] + inter <= entera) { suma += filas[k]; k++ }
    if (k === desde) k = desde + 1
    // Si entraron TODOS los que quedan, la hoja final quedaría sin renglones
    // y sin lugar para el total y las firmas: el último pasa a la final.
    if (k === filas.length && k - desde > 1) k--
    paginas.push([desde, k])
    desde = k
  }
  return { modo: 'entera', paginas }
}

// ¿Alguna medida que no puede ser? Devuelve el motivo (para el registro de
// errores) o null. Una parte fija (cabecera, final, lo de una hoja que sigue)
// más alta que la hoja entera, o la cabecera y el final que no entran juntos,
// es una medida mal tomada (pasó en Safari: la hoja se midió antes de tener
// sus estilos). Un RENGLÓN muy alto no es raro: va solo en su hoja.
export function medidasRaras(medidas, { entera = ALTO_UTIL_A4_MM } = {}) {
  if (!medidas) return 'no hay medidas'
  if (medidas.estilos === false) return 'la hoja se midió sin sus estilos'
  const copia = Number(medidas.copiaEntera)
  if (!Number.isFinite(copia) || copia <= 0) return 'la copia entera no se pudo medir'
  for (const k of ['fijo', 'final', 'intermedio']) {
    const v = Number(medidas[k])
    if (!Number.isFinite(v) || v < 0) return `${k} no es una medida`
    if (v > entera) return `${k} mide más que una hoja entera`
  }
  if (Number(medidas.fijo) + Number(medidas.final) > entera) return 'la cabecera y el final no entran juntos en una hoja'
  const filas = Array.isArray(medidas.filas) ? medidas.filas : []
  if (filas.some(f => !Number.isFinite(Number(f)) || Number(f) < 0)) return 'un renglón no es una medida'
  return null
}

// La hoja con un plan ya hecho. Sin plan (o 'media'): las copias juntas en
// una página, con la línea punteada. 'entera': cada copia en sus hojas.
export function htmlHoja(orden, { conPrecios = false, copias = COPIAS_IMPRESION, plan = null } = {}) {
  const todos = Array.isArray(orden?.renglones) ? orden.renglones : []
  const precios = conPrecios === true
  if (!plan || plan.modo !== 'entera') {
    const partes = copias.map(c => htmlCopiaHoja(orden, c, { conPrecios: precios, renglones: todos }))
    return `<div class="rh-hoja rh-hoja--media"><div class="rh-pagina">${partes.join(CORTE_HOJA)}</div></div>`
  }
  const hojas = []
  for (const c of copias) {
    plan.paginas.forEach(([d, h], i) => {
      hojas.push(`<div class="rh-pagina">${htmlCopiaHoja(orden, c, { conPrecios: precios, renglones: todos.slice(d, h), pagina: i + 1, paginas: plan.paginas.length, entera: true })}</div>`)
    })
  }
  return `<div class="rh-hoja rh-hoja--entera">${hojas.join('')}</div>`
}

// Cuántas páginas imprime la hoja con ese plan.
export function paginasHoja(plan, copias = COPIAS_IMPRESION) {
  return plan?.modo === 'entera' ? plan.paginas.length * copias.length : 1
}

// ── MEDIR Y ARMAR (en el navegador) ────────────────────────────────────────
// Arma la hoja en `contenedor`: primero la mide afuera de la pantalla (con el
// ancho útil de la A4 y la letra ya cargada) y después pone la que corresponde.
// Devuelve el plan. Si no se puede medir (sin DOM), media hoja.
const MM = 96 / 25.4
// ¿La hoja ya tiene SUS estilos? (la copia en columna y el logo de su tamaño).
// Sin ellos el logo sale del tamaño de la imagen (~160 mm) y todo mide mal.
function hojaConEstilos(caja, doc) {
  const copia = caja.querySelector('.rh-copia'), logo = caja.querySelector('.rh-logo')
  const vista = doc.defaultView || globalThis
  if (!copia || !logo || !vista?.getComputedStyle) return false
  return vista.getComputedStyle(copia).display === 'flex' && Math.abs(logo.getBoundingClientRect().height - ALTO_LOGO_HOJA_PX) < 2
}
// Espera, con tope, a que la hoja que ya está en la caja tenga sus estilos y
// su letra. La LETRA se pide recién con el texto puesto (antes de ponerlo,
// fonts.ready no espera nada: nadie la pidió todavía).
async function esperarHojaLista(caja, doc, tope = 3000) {
  // Sin una hoja de verdad en la caja (sin navegador) no hay nada que esperar.
  if (!caja.querySelector('.rh-copia')) return false
  const vista = doc.defaultView || globalThis
  const reloj = typeof vista?.setTimeout === 'function' ? vista.setTimeout.bind(vista) : setTimeout
  const hasta = Date.now() + tope
  const dormir = (ms) => new Promise(r => reloj(r, Math.max(0, ms)))
  const resto = () => dormir(hasta - Date.now())
  const fuente = doc.getElementById?.('rh-fuente')
  if (fuente && 'sheet' in fuente && !fuente.sheet && typeof fuente.addEventListener === 'function') {
    await Promise.race([new Promise(r => { fuente.addEventListener('load', r, { once: true }); fuente.addEventListener('error', r, { once: true }) }), resto()])
  }
  try {
    if (typeof doc.fonts?.load === 'function') {
      const pesos = ['400', '600', '700', '800']
      await Promise.race([Promise.all(pesos.map(p => doc.fonts.load(`${p} 14px Archivo`))), resto()])
      await Promise.race([doc.fonts.ready, resto()])
    }
  } catch { /* sin fuentes: la de respaldo */ }
  await Promise.all([...caja.querySelectorAll('img')].map(img => img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r; reloj(r, Math.max(0, hasta - Date.now())) })))
  while (!hojaConEstilos(caja, doc) && Date.now() < hasta) await dormir(50)
  return hojaConEstilos(caja, doc)
}
export async function medirHoja(orden, { conPrecios = false, doc = document } = {}) {
  asegurarEstilosHoja(doc)
  const caja = doc.createElement('div')
  caja.style.cssText = `position:fixed;left:-10000px;top:0;width:${ANCHO_UTIL_A4_MM}mm;background:#fff`
  doc.body.appendChild(caja)
  try {
    const una = [COPIAS_IMPRESION[0]]
    caja.innerHTML = htmlHoja(orden, { conPrecios, copias: una })
    const estilos = await esperarHojaLista(caja, doc)
    const alto = (el) => el ? el.getBoundingClientRect().height / MM : 0
    const copia = caja.querySelector('.rh-copia')
    // La copia con TODO, sin el alto mínimo de la media hoja.
    copia.style.minHeight = '0'; copia.style.height = 'auto'
    const filas = [...copia.querySelectorAll('tbody tr')].map(alto)
    const tabla = copia.querySelector('.rh-tabla')
    const fijo = alto(copia.querySelector('.rh-cab')) + alto(copia.querySelector('.rh-cliente')) + alto(tabla?.querySelector('thead')) + 6
    const final = alto(tabla?.querySelector('tfoot')) + alto(copia.querySelector('.rh-notas')) + alto(copia.querySelector('.rh-pie')) + alto(copia.querySelector('.rh-legal')) + 8
    const intermedio = 8 + alto(copia.querySelector('.rh-legal')) + 4
    const medidas = { copiaEntera: alto(copia), fijo, final, intermedio, filas, estilos }
    const rara = medidasRaras(medidas)
    if (rara) registrarMedidaRara(orden, medidas, rara, conPrecios)
    return medidas
  } finally {
    caja.remove()
  }
}

// Una medida que no puede ser va al registro de errores (Administración →
// Errores de la app) con las medidas en mm ENTEROS (el registro tapa los
// números de 4 cifras: 129,2 saldría "#"). Nunca rompe la impresión.
export function textoMedidaRara(orden, medidas, motivo, conPrecios = false) {
  const r = (x) => Number.isFinite(Number(x)) ? Math.round(Number(x)) : String(x)
  return JSON.stringify({
    orden: String(orden?.codigo ?? ''), conPrecios: conPrecios === true, motivo, estilos: medidas?.estilos !== false,
    copiaEntera: r(medidas?.copiaEntera), fijo: r(medidas?.fijo), final: r(medidas?.final), intermedio: r(medidas?.intermedio),
    // Los renglones separados con espacios: "12,8,12" el registro lo taparía.
    filas: (Array.isArray(medidas?.filas) ? medidas.filas : []).map(r).join(' '), plan: planHoja(medidas),
  })
}
function registrarMedidaRara(orden, medidas, motivo, conPrecios) {
  try {
    console.warn('medir la hoja: medida rara,', motivo)
    registrarError({ evento: 'hoja', mensaje: `Hoja de la orden: medida rara (${motivo})`, detalle: textoMedidaRara(orden, medidas, motivo, conPrecios) })
  } catch { /* el registro nunca rompe la hoja */ }
}

export async function armarHoja(contenedor, orden, { conPrecios = false, copias = COPIAS_IMPRESION, doc = document } = {}) {
  let plan = { modo: 'media' }
  try { plan = planHoja(await medirHoja(orden, { conPrecios, doc })) } catch (err) { console.error('medir la hoja:', err) }
  contenedor.innerHTML = htmlHoja(orden, { conPrecios, copias, plan })
  return plan
}

// ── Los estilos de la hoja ─────────────────────────────────────────────────
// Se inyectan UNA vez. SOLO NEGRO SOBRE BLANCO (nada de grises claros; las
// líneas de 1 px o más) y la letra Archivo, con respaldo sans-serif. Los
// tamaños son los del diseño en px (a 96 por pulgada: 1 px = 0,26 mm). La
// media hoja tiene alto fijo: dos copias + la línea punteada = una A4.
// MÁS LUGAR EN MEDIA HOJA (23/10/2026): la cabecera y el logo de 56 px (antes
// 70), los espacios entre bloques de 3 px (antes 8), los renglones en 14 px y
// las cajas en 18 px (antes 16 y 22) con menos relleno y renglón más justo,
// el margen de la copia de 1 mm y las firmas de 26 px (antes 34). Mismo
// diseño, en blanco y negro.
// LA LETRA VA EN SU PROPIO <link> (23/10/2026): con un @import adentro de
// estos estilos, Safari no aplicaba NINGUNA regla de la hoja hasta que Google
// Fonts contestaba, y la hoja se medía sin estilos (caso N-0025).
export const FUENTE_HOJA = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&display=swap'
export const ALTO_LOGO_HOJA_PX = 56
export const ESTILOS_HOJA = `
.rh-hoja { font-family: Archivo, 'Helvetica Neue', Arial, sans-serif; color: #000; background: #fff; width: ${ANCHO_UTIL_A4_MM}mm; font-size: 14px; line-height: 1.25; }
.rh-hoja * { color: #000; }
.rh-pagina + .rh-pagina { break-before: page; page-break-before: always; }
.rh-copia { position: relative; box-sizing: border-box; padding: 1mm 1mm; display: flex; flex-direction: column; gap: 3px; break-inside: avoid; page-break-inside: avoid; overflow: hidden; }
.rh-hoja--media .rh-copia { height: ${ALTO_MEDIA_HOJA_MM}mm; }
.rh-hoja--entera .rh-copia { min-height: ${ALTO_UTIL_A4_MM - 2}mm; }
.rh-cab { display: flex; align-items: center; gap: 10px; min-height: ${ALTO_LOGO_HOJA_PX}px; }
.rh-empresa { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 1 260px; }
.rh-logo { width: ${ALTO_LOGO_HOJA_PX}px; height: ${ALTO_LOGO_HOJA_PX}px; border-radius: 50%; border: 1px solid #000; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fff; }
.rh-logo img { width: 100%; height: 100%; object-fit: contain; filter: grayscale(1); }
.rh-empresa__datos { display: flex; flex-direction: column; font-size: 12px; line-height: 1.15; min-width: 0; overflow-wrap: anywhere; }
.rh-empresa__nombre { font-size: 16px; font-weight: 800; }
.rh-titulo { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; }
.rh-titulo__grande { font-size: 23px; font-weight: 800; letter-spacing: 0.01em; line-height: 1.1; }
.rh-titulo__copia { font-size: 12px; font-weight: 700; letter-spacing: 0.18em; }
.rh-titulo__anulada { font-size: 14px; font-weight: 800; letter-spacing: 0.1em; }
.rh-orden { width: 128px; box-sizing: border-box; border: 2px solid #000; padding: 2px 6px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; }
.rh-orden__rotulo { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; }
.rh-codigo { font-size: 28px; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rh-orden__fecha { font-size: 12px; font-weight: 600; white-space: nowrap; }
.rh-cliente { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; border-bottom: 2px solid #000; padding-bottom: 3px; }
.rh-cliente__izq { display: flex; flex-direction: column; min-width: 0; }
.rh-rotulo { font-size: 12px; font-weight: 700; letter-spacing: 0.18em; }
.rh-cliente__nombre { font-size: 26px; font-weight: 800; line-height: 1.1; overflow-wrap: anywhere; }
.rh-cliente__der { display: flex; flex-direction: column; align-items: flex-end; text-align: right; font-size: 14px; flex-shrink: 0; max-width: 45%; }
.rh-tabla { width: 100%; border-collapse: collapse; table-layout: fixed; }
.rh-col-cajas { width: 74px; } .rh-col-producto { width: auto; } .rh-col-lote { width: 120px; } .rh-col-precio { width: 96px; }
.rh-tabla th { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-align: left; border-bottom: 1px solid #000; padding: 1px 6px 2px; }
.rh-tabla td { font-size: 14px; padding: 2px 6px; border-bottom: 1px solid #000; line-height: 1.15; vertical-align: top; overflow-wrap: anywhere; white-space: normal; }
.rh-tabla tr { break-inside: avoid; page-break-inside: avoid; }
.rh-num { text-align: right !important; font-variant-numeric: tabular-nums; }
.rh-cajas { font-size: 18px !important; font-weight: 800; line-height: 1 !important; white-space: nowrap; }
.rh-insumo .rh-cajas { font-size: 14px !important; white-space: normal; }
.rh-producto { font-weight: 600; }
.rh-plata { font-size: 14px !important; white-space: nowrap; }
.rh-total td { border-bottom: 0; padding-top: 2px; }
.rh-total__rotulo { font-size: 14px !important; font-weight: 800; letter-spacing: 0.08em; vertical-align: middle !important; }
.rh-total__insumos { font-weight: 600; letter-spacing: 0; }
.rh-total__plata { font-size: 16px !important; font-weight: 800; }
.rh-notas { margin: 0; font-size: 12px; overflow-wrap: anywhere; }
.rh-pie { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.rh-entrego { font-size: 14px; min-width: 0; overflow-wrap: anywhere; }
.rh-firmas { width: 440px; max-width: 70%; display: grid; grid-template-columns: 1.3fr 1.3fr 1fr; gap: 12px; flex-shrink: 0; }
.rh-firma { border-top: 1px solid #000; padding-top: 3px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; height: 26px; box-sizing: border-box; display: flex; align-items: flex-end; justify-content: center; }
.rh-sigue { margin: auto 0 0; font-size: 14px; font-weight: 700; }
.rh-legal { margin: 0; font-size: 12px; text-align: center; white-space: nowrap; }
.rh-corte { height: 0; border-top: 1.5px dotted #000; margin: 3.5mm 0; }
.rh-anulada-capa { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.rh-anulada { transform: rotate(-16deg); border: 6px solid #000; border-radius: 14px; padding: 4px 26px; background: rgba(255,255,255,0.85); font-size: 72pt; font-weight: 800; letter-spacing: 0.08em; line-height: 1.05; text-align: center; display: flex; flex-direction: column; align-items: center; }
.rh-anulada__detalle { font-size: 10pt; letter-spacing: 0.02em; font-weight: 700; }
.rh-copia--anulada .rh-tabla, .rh-copia--anulada .rh-codigo { text-decoration: line-through; }
@media print { @page { size: A4; margin: 8mm; } }
`

export function asegurarEstilosHoja(doc = document) {
  if (!doc || doc.getElementById('rh-estilos')) return
  const s = doc.createElement('style')
  s.id = 'rh-estilos'
  s.textContent = ESTILOS_HOJA
  doc.head.appendChild(s)
  // La letra, aparte y DESPUÉS: si Google Fonts tarda o no contesta, la hoja
  // igual tiene todos sus estilos (con la letra de respaldo). En Safari una
  // hoja de estilos que todavía está bajando frena a las que se agregan
  // después: por eso los estilos de la hoja van primero.
  const f = doc.createElement('link')
  f.id = 'rh-fuente'
  f.rel = 'stylesheet'
  f.href = FUENTE_HOJA
  doc.head.appendChild(f)
}

// ── Compartir como texto (sin precios, siempre) ────────────────────────────
export function textoOrden(orden) {
  const cli = String(orden?.cliente?.razon_social ?? '').trim() || String(orden?.cliente?.nombre ?? '').trim() || 'Cliente'
  const lineas = [
    `Orden de retiro ${orden?.codigo || '—'} · ${String(orden?.empresa?.nombre ?? '').trim() || 'Empresa'}`,
    `Fecha: ${orden?.cargadaEn ? fechaHoraHoja(orden.cargadaEn) : fechaHoja(orden?.fecha)}`,
    `Cliente: ${cli}`,
  ]
  if (String(orden?.transporte ?? '').trim()) lineas.push(`Transporte: ${String(orden.transporte).trim()}`)
  if (orden?.estado === 'anulada') lineas.push('ANULADA')
  lineas.push('')
  let insumos = 0
  for (const r of orden?.renglones ?? []) {
    if (r?.esInsumo) {
      insumos++
      const lotesI = Array.isArray(r.lotes) && r.lotes.length ? ` (lotes ${textoLotes(r.lotes, r.unidad)})` : ''
      lineas.push(`- ${cantidadInsumoBultoHoja(r.cantidad, r.unidad, r.contenido)} · ${nombreInsumoHoja(r)}${lotesI}`)
      continue
    }
    const desc = [r.producto, r.presentacion, r.cono].map(x => String(x ?? '').trim()).filter(Boolean).join(' · ')
    const lotes = Array.isArray(r.lotes) && r.lotes.length ? ` (lotes ${textoLotes(r.lotes)})` : ''
    lineas.push(`- ${enteroHoja(r.cajas)} cajas · ${desc}${lotes}`)
  }
  lineas.push('', `Total: ${enteroHoja(totalCajasOrden(orden))} cajas` +
    (insumos ? ` y ${insumos} ${insumos === 1 ? 'renglón' : 'renglones'} de materia prima e insumos` : ''))
  if (String(orden?.observaciones ?? '').trim()) lineas.push(`Observaciones: ${String(orden.observaciones).trim()}`)
  return lineas.join('\n')
}

// ── El PDF y el mail ───────────────────────────────────────────────────────
// "Orden N-0012 - Distribuidora Anatolia.pdf". Sin los caracteres que un
// sistema de archivos no acepta.
export function nombreArchivoPdf(orden) {
  const cli = String(orden?.cliente?.nombre ?? orden?.cliente?.razon_social ?? '').trim() || 'cliente'
  const nombre = `Orden ${orden?.codigo || 'sin código'} - ${cli}`
  return nombre.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '.pdf'
}

export function asuntoMail(orden) {
  return `Orden de retiro ${orden?.codigo || ''} · ${String(orden?.empresa?.nombre ?? '').trim()}`.trim()
}

export function emailValido(t) {
  const forma = /^[^@\s,;<>"]+@[^@\s,;<>"]+\.[^@\s,;<>"]+$/
  return forma.test(String(t ?? '').trim())
}

// El mailto: al mail del cliente. Si el mail no es válido, va sin destinatario
// (la persona lo completa). Todo con encodeURIComponent.
export function urlMailto(email, orden) {
  const para = emailValido(email) ? encodeURIComponent(String(email).trim()) : ''
  const cuerpo = `Hola, te mandamos la orden de retiro ${orden?.codigo || ''}. Va adjunta en PDF (${nombreArchivoPdf(orden)}).`
  return `mailto:${para}?subject=${encodeURIComponent(asuntoMail(orden))}&body=${encodeURIComponent(cuerpo)}`
}

// Las dos librerías del PDF, de cdnjs, cargadas recién cuando hacen falta.
export const LIBRERIAS_PDF = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
]

export function cargarScript(url, doc = document) {
  return new Promise((resolve, reject) => {
    if (doc.querySelector(`script[data-lib="${url}"]`)) { resolve(); return }
    const s = doc.createElement('script')
    s.src = url
    s.async = true
    s.dataset.lib = url
    s.onload = () => resolve()
    s.onerror = () => { s.remove(); reject(new Error('No se pudo bajar la librería del PDF: revisá la conexión.')) }
    doc.head.appendChild(s)
  })
}

// Arma el PDF (una copia, el original) en el navegador, sin servidor. Con la
// MISMA medición que la impresión: si no entra en media hoja, hojas enteras.
export async function generarPdf(orden, { conPrecios = false } = {}) {
  for (const url of LIBRERIAS_PDF) await cargarScript(url)
  asegurarEstilosHoja()
  let plan = { modo: 'media' }
  try { plan = planHoja(await medirHoja(orden, { conPrecios })) } catch (err) { console.error('medir la hoja:', err) }
  const cont = document.createElement('div')
  cont.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;padding:8mm;box-sizing:border-box'
  cont.innerHTML = htmlHoja(orden, { conPrecios, copias: COPIAS_PDF, plan })
  document.body.appendChild(cont)
  try {
    const imgs = [...cont.querySelectorAll('img')]
    await Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r })))
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    // Una página del PDF por hoja (si no entra en media hoja, la orden ocupa
    // más de una): cada hoja se fotografía sola y va con 8 mm de margen.
    const hojas = [...cont.querySelectorAll('.rh-pagina')]
    const partes = hojas.length ? hojas : [cont]
    for (let k = 0; k < partes.length; k++) {
      const canvas = await window.html2canvas(partes[k], { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const ancho = partes === hojas ? 194 : 210
      const margen = partes === hojas ? 8 : 0
      const alto = canvas.height * ancho / canvas.width
      if (k > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margen, margen, ancho, Math.min(alto, 297 - 2 * margen))
    }
    return pdf.output('blob')
  } finally {
    cont.remove()
  }
}

// ENVIAR: el PDF compartido con navigator.share({ files }) (Gmail, WhatsApp u
// otra). Si el dispositivo no comparte archivos: se descarga y se abre el
// mailto: al mail del cliente. Devuelve qué pasó, para que la pantalla lo diga.
export async function enviarOrden(orden, { conPrecios = false, email = null } = {}) {
  const blob = await generarPdf(orden, { conPrecios })
  const nombre = nombreArchivoPdf(orden)
  const archivo = typeof File === 'function' ? new File([blob], nombre, { type: 'application/pdf' }) : null
  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: asuntoMail(orden), text: asuntoMail(orden) })
      return { modo: 'compartido', nombre }
    } catch (err) {
      if (err && err.name === 'AbortError') return { modo: 'cancelado', nombre }
      // cualquier otro error: se cae a descargar
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  const mailto = urlMailto(email, orden)
  window.location.href = mailto
  return { modo: 'descargado', nombre, mailto, conMail: emailValido(email) }
}

// COMPARTIR: el texto de la orden, sin precios. Sin navigator.share, se copia.
export async function compartirTextoOrden(orden) {
  const texto = textoOrden(orden)
  if (navigator.share) {
    try {
      await navigator.share({ title: asuntoMail(orden), text: texto })
      return { modo: 'compartido' }
    } catch (err) {
      if (err && err.name === 'AbortError') return { modo: 'cancelado' }
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto)
    return { modo: 'copiado' }
  }
  return { modo: 'sin_soporte', texto }
}
