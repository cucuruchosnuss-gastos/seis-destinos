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
// Las copias de una hoja impresa: arriba la del cliente y abajo la del
// depósito, con una línea de corte. El PDF lleva una sola: la del cliente.
export const COPIAS_IMPRESION = ['Original — Cliente', 'Duplicado — Depósito']
export const COPIAS_PDF = ['Original — Cliente']
export const LEYENDA_LEGAL = 'Documento interno. No válido como factura.'

function htmlEmpresaHoja(emp) {
  const logo = logoSeguro(emp?.logo_url)
  const nombre = String(emp?.razon_social ?? '').trim() || String(emp?.nombre ?? '').trim() || 'Empresa'
  const lineas = []
  if (String(emp?.razon_social ?? '').trim() && String(emp?.nombre ?? '').trim() && emp.razon_social.trim() !== emp.nombre.trim()) lineas.push(emp.nombre)
  if (String(emp?.cuit ?? '').trim()) lineas.push(`CUIT ${String(emp.cuit).trim()}`)
  if (String(emp?.domicilio ?? '').trim()) lineas.push(String(emp.domicilio).trim())
  if (String(emp?.telefono ?? '').trim()) lineas.push(`Tel. ${String(emp.telefono).trim()}`)
  return `<div class="rh-empresa">` +
    // logoSeguro() ya dejó solo un nombre de archivo de imagen (la raíz del
    // repo, un nivel arriba de modulos/); igual va con encodeURIComponent.
    (logo ? `<img class="rh-logo" src="../${encodeURIComponent(logo)}" alt="${escHoja(nombre)}">` : '') +
    `<div class="rh-empresa__datos"><strong class="rh-empresa__nombre">${escHoja(nombre)}</strong>` +
    lineas.map(l => `<span>${escHoja(l)}</span>`).join('') + `</div></div>`
}

function htmlClienteHoja(cli, transporte) {
  const nombre = String(cli?.razon_social ?? '').trim() || String(cli?.nombre ?? '').trim() || 'Cliente'
  const partes = []
  if (String(cli?.razon_social ?? '').trim() && String(cli?.nombre ?? '').trim() && cli.razon_social.trim() !== cli.nombre.trim()) partes.push(`(${cli.nombre.trim()})`)
  const extra = []
  if (String(cli?.cuit ?? '').trim()) extra.push(`CUIT ${String(cli.cuit).trim()}`)
  const dom = [cli?.domicilio, cli?.localidad].map(x => String(x ?? '').trim()).filter(Boolean).join(', ')
  if (dom) extra.push(dom)
  return `<div class="rh-datos">` +
    `<div><span class="rh-rotulo">Cliente</span> <strong>${escHoja(nombre)}</strong>${partes.length ? ` ${escHoja(partes.join(' '))}` : ''}` +
    `${extra.length ? `<span class="rh-datos__extra"> · ${escHoja(extra.join(' · '))}</span>` : ''}</div>` +
    `<div><span class="rh-rotulo">Transporte</span> ${escHoja(String(transporte ?? '').trim() || '—')}</div></div>`
}

function htmlFilaHoja(r, conPrecios, moneda) {
  if (r?.esInsumo) {
    const u = unidadHoja(r.unidad)
    const precio = importeHoja(r.precio, moneda)
    const precioPorUnidad = precio === '—' || !u ? precio : precio + ' / ' + u
    return `<tr class="rh-insumo"><td>${escHoja(nombreInsumoHoja(r))}</td><td>—</td><td>Insumo</td>` +
      `<td class="rh-num rh-cajas">${escHoja(cantidadInsumoHoja(r.cantidad, r.unidad))}</td><td class="rh-num">—</td>` +
      `<td class="rh-lotes">${escHoja(textoLotes(r.lotes, r.unidad))}</td>` +
      (conPrecios ? `<td class="rh-num">${escHoja(precioPorUnidad)}</td><td class="rh-num">${escHoja(importeHoja(r.subtotal, moneda))}</td>` : '') +
      `</tr>`
  }
  return `<tr><td>${escHoja(r.producto || '—')}</td><td>${escHoja(r.cono || '—')}</td><td>${escHoja(r.presentacion || '—')}</td>` +
    `<td class="rh-num rh-cajas">${escHoja(enteroHoja(r.cajas))}</td><td class="rh-num">${escHoja(enteroHoja(r.unidades))}</td>` +
    `<td class="rh-lotes">${escHoja(textoLotes(r.lotes))}</td>` +
    (conPrecios ? `<td class="rh-num">${escHoja(importeHoja(r.precio, moneda))}</td><td class="rh-num">${escHoja(importeHoja(r.subtotal, moneda))}</td>` : '') +
    `</tr>`
}

function htmlTablaHoja(orden, conPrecios) {
  const moneda = orden?.moneda || 'ARS'
  const conInsumos = tieneInsumos(orden)
  const filas = (orden?.renglones ?? []).map(r => htmlFilaHoja(r, conPrecios, moneda)).join('')
  // Con insumos, la columna de las cajas lleva también su cantidad ("25 kg")
  // y el encabezado lo dice. El precio de un insumo es por su unidad.
  const cab = `<tr><th>Producto</th><th>Cono</th><th>Presentación</th><th class="rh-num">${conInsumos ? 'Cajas / cant.' : 'Cajas'}</th><th class="rh-num">Unidades</th><th>Lotes</th>` +
    (conPrecios ? `<th class="rh-num">${conInsumos ? 'Precio' : 'Precio x caja'}</th><th class="rh-num">Subtotal</th>` : '') + '</tr>'
  const pie = `<tr><td colspan="3">${conInsumos ? 'Total de cajas' : 'Total'}</td><td class="rh-num rh-cajas">${escHoja(enteroHoja(totalCajasOrden(orden)))}</td>` +
    `<td class="rh-num">${escHoja(enteroHoja(totalUnidadesOrden(orden)))}</td><td></td>` +
    (conPrecios ? `<td></td><td class="rh-num rh-total">${escHoja(importeHoja(orden?.total, moneda))}</td>` : '') + '</tr>'
  return `<table class="rh-tabla"><thead>${cab}</thead><tbody>${filas}</tbody><tfoot>${pie}</tfoot></table>`
}

function htmlCopiaHoja(orden, rotulo, { conPrecios }) {
  const anulada = orden?.estado === 'anulada'
  return `<section class="rh-copia${anulada ? ' rh-copia--anulada' : ''}">` +
    (anulada ? '<div class="rh-anulada" aria-hidden="true">ANULADA</div>' : '') +
    `<header class="rh-cab">${htmlEmpresaHoja(orden?.empresa)}` +
    `<div class="rh-orden"><span class="rh-copia__rotulo">${escHoja(rotulo)}</span>` +
    `<span class="rh-orden__titulo">Orden de retiro</span>` +
    `<span class="rh-codigo">${escHoja(orden?.codigo || '—')}</span>` +
    `<span class="rh-orden__fecha">${escHoja(orden?.cargadaEn ? fechaHoraHoja(orden.cargadaEn) : fechaHoja(orden?.fecha))}</span>` +
    (anulada ? '<span class="rh-orden__anulada">ANULADA</span>' : '') + `</div></header>` +
    htmlClienteHoja(orden?.cliente, orden?.transporte) +
    htmlTablaHoja(orden, conPrecios) +
    (String(orden?.observaciones ?? '').trim() ? `<div class="rh-obs"><span class="rh-rotulo">Observaciones</span> ${escHoja(String(orden.observaciones).trim())}</div>` : '') +
    `<div class="rh-pie"><div class="rh-cargo"><span class="rh-rotulo">Cargó</span> ${escHoja(String(orden?.cargadaPor ?? '').trim() || '—')}</div>` +
    `<div class="rh-firma"><span class="rh-rotulo">Recibí conforme</span>` +
    `<span class="rh-firma__linea">Firma</span><span class="rh-firma__linea">Aclaración</span><span class="rh-firma__linea">DNI</span></div></div>` +
    `<p class="rh-legal">${escHoja(LEYENDA_LEGAL)}</p></section>`
}

// La hoja entera. `copias`: las dos para imprimir, una para el PDF. Las dos
// páginas que la usan están en modulos/, así que el logo va con '../'.
export const CORTE_HOJA = '<div class="rh-corte" aria-hidden="true">✂ cortar acá</div>'

export function htmlHoja(orden, { conPrecios = false, copias = COPIAS_IMPRESION } = {}) {
  const partes = copias.map(rotulo => htmlCopiaHoja(orden, rotulo, { conPrecios: conPrecios === true }))
  const cuerpo = partes.join(CORTE_HOJA)
  return `<div class="rh-hoja">${cuerpo}</div>`
}

// ── Los estilos de la hoja ─────────────────────────────────────────────────
// Se inyectan UNA vez. Van en mm/pt porque la hoja es papel: una A4 con dos
// copias, y 12 renglones entran en una página. Sin fondos de color ni el
// naranja de la app: blanco, negro y grises. El logo va a color (la impresora
// lo pasa a gris si hace falta), con un alto máximo parejo para las cuatro.
export const ESTILOS_HOJA = `
.rh-hoja { font-family: Inter, Arial, sans-serif; color: #000; background: #fff; width: 194mm; font-size: 8.5pt; line-height: 1.25; }
.rh-copia { position: relative; box-sizing: border-box; padding: 2mm 2mm; min-height: 134mm; page-break-inside: avoid; break-inside: avoid; overflow: hidden; }
.rh-cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm; border-bottom: 0.4mm solid #000; padding-bottom: 1.5mm; margin-bottom: 1.5mm; }
.rh-empresa { display: flex; gap: 3mm; align-items: center; min-width: 0; }
.rh-logo { max-height: 14mm; max-width: 32mm; width: auto; height: auto; object-fit: contain; }
.rh-empresa__datos { display: flex; flex-direction: column; font-size: 8pt; }
.rh-empresa__nombre { font-size: 10.5pt; }
.rh-orden { display: flex; flex-direction: column; align-items: flex-end; text-align: right; flex-shrink: 0; }
.rh-copia__rotulo { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border: 0.3mm solid #000; padding: 0.3mm 1.5mm; }
.rh-orden__titulo { font-size: 8pt; font-weight: 700; text-transform: uppercase; margin-top: 1mm; }
.rh-codigo { font-size: 20pt; font-weight: 900; line-height: 1; letter-spacing: 0.02em; }
.rh-orden__fecha { font-size: 8.5pt; }
.rh-orden__anulada { font-size: 11pt; font-weight: 900; }
.rh-datos { display: flex; flex-wrap: wrap; gap: 0.5mm 6mm; margin-bottom: 1.5mm; }
.rh-datos__extra { color: #222; }
.rh-rotulo { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #333; }
.rh-tabla { width: 100%; border-collapse: collapse; margin-bottom: 1.5mm; }
.rh-tabla th, .rh-tabla td { border: 0.25mm solid #555; padding: 0.45mm 1.2mm; text-align: left; vertical-align: top; font-size: 8pt; }
.rh-tabla th { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.04em; }
.rh-tabla tr { page-break-inside: avoid; break-inside: avoid; }
.rh-tabla tfoot td { font-weight: 800; }
.rh-num { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rh-cajas { font-weight: 800; font-size: 9pt !important; }
.rh-lotes { font-size: 7pt !important; }
.rh-total { font-size: 10pt; }
.rh-obs { margin-bottom: 1.5mm; overflow-wrap: anywhere; }
.rh-pie { display: flex; justify-content: space-between; align-items: flex-end; gap: 4mm; margin-top: 1mm; }
.rh-firma { display: flex; gap: 3mm; align-items: flex-end; }
.rh-firma__linea { display: inline-block; min-width: 30mm; border-top: 0.3mm solid #000; padding-top: 0.5mm; font-size: 7pt; text-align: center; margin-top: 6mm; }
.rh-legal { font-size: 6.5pt; color: #333; margin: 1mm 0 0; }
.rh-corte { border-top: 0.3mm dashed #000; text-align: center; font-size: 7pt; color: #333; margin: 1mm 0; line-height: 1; padding-top: 0.5mm; }
.rh-anulada { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 64pt; font-weight: 900; letter-spacing: 0.1em; color: rgba(0,0,0,0.18); transform: rotate(-24deg); pointer-events: none; }
.rh-copia--anulada .rh-tabla, .rh-copia--anulada .rh-codigo { text-decoration: line-through; }
@media print { @page { size: A4; margin: 8mm; } }
`

export function asegurarEstilosHoja(doc = document) {
  if (!doc || doc.getElementById('rh-estilos')) return
  const s = doc.createElement('style')
  s.id = 'rh-estilos'
  s.textContent = ESTILOS_HOJA
  doc.head.appendChild(s)
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
      lineas.push(`- ${cantidadInsumoHoja(r.cantidad, r.unidad)} · ${nombreInsumoHoja(r)}${lotesI}`)
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

// Arma el PDF (una copia, la del cliente) en el navegador, sin servidor.
export async function generarPdf(orden, { conPrecios = false } = {}) {
  for (const url of LIBRERIAS_PDF) await cargarScript(url)
  asegurarEstilosHoja()
  const cont = document.createElement('div')
  cont.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;padding:8mm;box-sizing:border-box'
  cont.innerHTML = htmlHoja(orden, { conPrecios, copias: COPIAS_PDF })
  document.body.appendChild(cont)
  try {
    const imgs = [...cont.querySelectorAll('img')]
    await Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r })))
    const canvas = await window.html2canvas(cont, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const ancho = 210
    const alto = canvas.height * ancho / canvas.width
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, ancho, Math.min(alto, 297))
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
