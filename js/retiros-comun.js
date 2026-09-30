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

// LA HOJA CON EL DISEÑO "ÓRDENES DE RETIRO" (29/09/2026, handoff de Claude
// Design, pantallas 3a y 3b): arriba el logo, el nombre de la fábrica, la
// razón social y el CUIT, el domicilio y el teléfono; a la derecha la copia,
// "ORDEN DE RETIRO", el código grande y la fecha. Después el cliente y el
// transporte, la tabla # · Producto · Lotes · Cant. (y, con precios, Precio y
// Subtotal), las observaciones y el faltante con el total, y el pie: quién
// cargó, "Recibí conforme" con Firma, Aclaración y DNI, y la leyenda.
function htmlEmpresaHoja(emp) {
  const logo = logoSeguro(emp?.logo_url)
  const t = (x) => String(x ?? '').trim()
  const nombre = t(emp?.nombre) || t(emp?.razon_social) || 'Empresa'
  const linea1 = [t(emp?.razon_social) && t(emp.razon_social) !== nombre ? t(emp.razon_social) : '', t(emp?.cuit) ? `CUIT ${t(emp.cuit)}` : '']
    .filter(Boolean).join(' · ')
  const linea2 = [t(emp?.domicilio), t(emp?.telefono) ? `Tel. ${t(emp.telefono)}` : ''].filter(Boolean).join(' · ')
  return `<div class="rh-empresa">` +
    // logoSeguro() ya dejó solo un nombre de archivo de imagen (la raíz del
    // repo, un nivel arriba de modulos/); igual va con encodeURIComponent.
    (logo ? `<img class="rh-logo" src="../${encodeURIComponent(logo)}" alt="${escHoja(nombre)}">` : '') +
    `<div class="rh-empresa__datos"><strong class="rh-empresa__nombre">${escHoja(nombre)}</strong>` +
    (linea1 ? `<span>${escHoja(linea1)}</span>` : '') + (linea2 ? `<span>${escHoja(linea2)}</span>` : '') + `</div></div>`
}

function htmlClienteHoja(cli, transporte) {
  const t = (x) => String(x ?? '').trim()
  const nombre = t(cli?.razon_social) || t(cli?.nombre) || 'Cliente'
  const linea1 = [t(cli?.razon_social) && t(cli?.nombre) && t(cli.razon_social) !== t(cli.nombre) ? t(cli.nombre) : '', t(cli?.cuit) ? `CUIT ${t(cli.cuit)}` : '']
    .filter(Boolean).join(' · ')
  const dom = [cli?.domicilio, cli?.localidad].map(t).filter(Boolean).join(', ')
  return `<div class="rh-datos">` +
    `<div class="rh-datos__col"><span class="rh-rotulo">Cliente</span><strong class="rh-datos__nombre">${escHoja(nombre)}</strong>` +
    (linea1 ? `<span>${escHoja(linea1)}</span>` : '') + (dom ? `<span>${escHoja(dom)}</span>` : '') + `</div>` +
    `<div class="rh-datos__col"><span class="rh-rotulo">Transporte</span><strong class="rh-datos__nombre">${escHoja(t(transporte) || '—')}</strong></div></div>`
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
    return `${lote} ×${cuanto(l)}`
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
// su cono (o "sin cono"); un insumo con su marca.
function descripcionHoja(r) {
  if (r?.esInsumo) return nombreInsumoHoja(r)
  const cono = String(r?.cono ?? '').trim()
  return [r?.producto, r?.presentacion, cono && cono !== '—' ? (cono === 'Sin cono' ? 'sin cono' : cono) : '']
    .map(x => String(x ?? '').trim()).filter(Boolean).join(' · ') || '—'
}

function cantidadHoja(r) {
  return r?.esInsumo ? cantidadInsumoHoja(r.cantidad, r.unidad) : `${enteroHoja(r?.cajas)} cajas`
}

function htmlFilaHoja(r, n, conPrecios, moneda) {
  const lotes = textoLotesHoja(r?.lotes, r?.esInsumo ? r.unidad : null)
  let precio = ''
  if (conPrecios) {
    const u = r?.esInsumo ? unidadHoja(r.unidad) : ''
    const p = importeHoja(r?.precio, moneda)
    precio = `<td class="rh-num">${escHoja(p === '—' || !u ? p : p + ' / ' + u)}</td><td class="rh-num">${escHoja(importeHoja(r?.subtotal, moneda))}</td>`
  }
  return `<tr${r?.esInsumo ? ' class="rh-insumo"' : ''}><td class="rh-n">${escHoja(n)}</td><td class="rh-producto">${escHoja(descripcionHoja(r))}</td>` +
    `<td class="rh-lotes">${escHoja(lotes)}</td><td class="rh-num rh-cajas">${escHoja(cantidadHoja(r))}</td>${precio}</tr>`
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

function htmlTablaHoja(renglones, desde, conPrecios, moneda) {
  const col = `<colgroup><col class="rh-col-n"><col class="rh-col-producto"><col class="rh-col-lotes"><col class="rh-col-cant">` +
    (conPrecios ? '<col class="rh-col-precio"><col class="rh-col-precio">' : '') + '</colgroup>'
  const hayInsumo = renglones.some(r => r?.esInsumo)
  const cab = `<tr><th>#</th><th>Producto</th><th>Lotes</th><th class="rh-num">Cant.</th>` +
    (conPrecios ? `<th class="rh-num">${hayInsumo ? 'Precio' : 'Precio x caja'}</th><th class="rh-num">Subtotal</th>` : '') + '</tr>'
  const filas = renglones.map((r, k) => htmlFilaHoja(r, desde + k + 1, conPrecios, moneda)).join('')
  return `<table class="rh-tabla">${col}<thead>${cab}</thead><tbody>${filas}</tbody></table>`
}

// Las observaciones y el faltante a la izquierda, el total a la derecha.
function htmlResumenHoja(orden, conPrecios) {
  const moneda = orden?.moneda || 'ARS'
  const obs = String(orden?.observaciones ?? '').trim()
  const faltantes = (orden?.renglones ?? []).map(r => {
    const f = faltanteDeRenglon(r)
    if (f === null) return null
    const cuanto = r.esInsumo ? cantidadInsumoHoja(f, r.unidad) : `${enteroHoja(f)} ${f === 1 ? 'caja' : 'cajas'}`
    return `${cuanto} de ${descripcionHoja(r)}`
  }).filter(Boolean)
  const izq = (obs ? `<strong>Observaciones:</strong> ${escHoja(obs)} ` : '') +
    (faltantes.length ? `<strong>Faltante:</strong> ${escHoja(faltantes.join('; '))}, pendiente de revisión.` : '')
  const insumos = totalInsumosHoja(orden)
  const total = `Total ${enteroHoja(totalCajasOrden(orden))} cajas${insumos ? ' + ' + insumos : ''}`
  return `<div class="rh-resumen"><div class="rh-obs">${izq}</div>` +
    `<div class="rh-totales"><span class="rh-total-cajas">${escHoja(total)}</span>` +
    (conPrecios ? `<span class="rh-total">${escHoja(importeHoja(orden?.total, moneda))}</span>` : '') + `</div></div>`
}

function htmlSelloAnulada(orden) {
  const detalle = [orden?.anuladaEn ? fechaHoja(orden.anuladaEn) : '', orden?.anuladaPor, orden?.anuladaMotivo]
    .map(x => String(x ?? '').trim()).filter(Boolean).join(' · ')
  return `<div class="rh-anulada-capa" aria-hidden="true"><div class="rh-anulada">ANULADA` +
    (detalle ? `<span class="rh-anulada__detalle">${escHoja(detalle)}</span>` : '') + `</div></div>`
}

function htmlCopiaHoja(orden, rotulo, { conPrecios, renglones, desde, pagina, paginas }) {
  const anulada = orden?.estado === 'anulada'
  const ultima = pagina === paginas
  return `<section class="rh-copia${anulada ? ' rh-copia--anulada' : ''}">` +
    `<header class="rh-cab">${htmlEmpresaHoja(orden?.empresa)}` +
    `<div class="rh-orden"><span class="rh-copia__rotulo">${escHoja(rotulo)}</span>` +
    `<span class="rh-orden__titulo">Orden de retiro</span>` +
    `<span class="rh-codigo">${escHoja(orden?.codigo || '—')}</span>` +
    `<span class="rh-orden__fecha">${escHoja(orden?.cargadaEn ? fechaHoraHoja(orden.cargadaEn) : fechaHoja(orden?.fecha))}</span>` +
    (paginas > 1 ? `<span class="rh-orden__hoja">Hoja ${escHoja(pagina)} de ${escHoja(paginas)}</span>` : '') +
    (anulada ? '<span class="rh-orden__anulada">ANULADA</span>' : '') + `</div></header>` +
    htmlClienteHoja(orden?.cliente, orden?.transporte) +
    htmlTablaHoja(renglones, desde, conPrecios, orden?.moneda || 'ARS') +
    (ultima
      ? htmlResumenHoja(orden, conPrecios) +
        `<div class="rh-pie"><div class="rh-cargo">Cargó: <strong>${escHoja(String(orden?.cargadaPor ?? '').trim() || '—')}</strong><br>Recibí conforme:</div>` +
        `<span class="rh-firma__linea">Firma</span><span class="rh-firma__linea">Aclaración</span><span class="rh-firma__linea">DNI</span></div>`
      : `<p class="rh-sigue">Sigue en la hoja ${escHoja(pagina + 1)}.</p>`) +
    `<p class="rh-legal">${escHoja(LEYENDA_LEGAL)}</p>` +
    (anulada ? htmlSelloAnulada(orden) : '') + `</section>`
}

// La hoja entera. `copias`: las dos para imprimir, una para el PDF. Las dos
// páginas que la usan están en modulos/, así que el logo va con '../'.
// CON MÁS DE 12 RENGLONES PASA A OTRA HOJA (decisión de Facu, 29/09/2026):
// cada hoja lleva las mismas copias con el mismo encabezado ("Hoja 1 de 2") y
// sus 12 renglones; el total, las observaciones y la firma van en la última.
// Medido en Chromium (medirHoja() de e2e/5-maqueta.spec.js): una hoja con 12
// renglones entra en los 281 mm útiles de una A4.
export const CORTE_HOJA = '<div class="rh-corte" aria-hidden="true"><span>✂ cortar acá</span></div>'
export const RENGLONES_POR_HOJA = 12

export function paginasHoja(orden) {
  const n = (orden?.renglones ?? []).length
  return Math.max(1, Math.ceil(n / RENGLONES_POR_HOJA))
}

export function htmlHoja(orden, { conPrecios = false, copias = COPIAS_IMPRESION } = {}) {
  const todos = Array.isArray(orden?.renglones) ? orden.renglones : []
  const paginas = paginasHoja(orden)
  const hojas = []
  for (let p = 0; p < paginas; p++) {
    const desde = p * RENGLONES_POR_HOJA
    const renglones = todos.slice(desde, desde + RENGLONES_POR_HOJA)
    const partes = copias.map(rotulo => htmlCopiaHoja(orden, rotulo, { conPrecios: conPrecios === true, renglones, desde, pagina: p + 1, paginas }))
    hojas.push(`<div class="rh-pagina">${partes.join(CORTE_HOJA)}</div>`)
  }
  return `<div class="rh-hoja">${hojas.join('')}</div>`
}

// ── Los estilos de la hoja ─────────────────────────────────────────────────
// Se inyectan UNA vez. Van en mm/pt porque la hoja es papel: una A4 con dos
// copias, y 12 renglones entran en una página. Los valores salen del diseño
// (en px a 794 px = 210 mm: 1 px = 0,2646 mm = 0,75 pt). Sin el naranja de la
// app: blanco, negro y grises cálidos; el logo va a color y el sello de
// ANULADA en bordó (así lo dibuja el diseño). La letra (6,4 a 9 pt) es más
// chica que el mínimo habitual porque lo pide el formato de dos copias.
export const ESTILOS_HOJA = `
.rh-hoja { font-family: Figtree, Inter, Arial, sans-serif; color: #1C1A17; background: #fff; width: 194mm; font-size: 7.5pt; line-height: 1.3; }
.rh-pagina + .rh-pagina { break-before: page; page-break-before: always; }
.rh-copia { position: relative; box-sizing: border-box; padding: 3mm 2mm 2mm; min-height: 134mm; display: flex; flex-direction: column; gap: 2mm; page-break-inside: avoid; break-inside: avoid; overflow: hidden; }
.rh-cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 3.2mm; }
.rh-empresa { display: flex; gap: 3.2mm; align-items: flex-start; min-width: 0; flex: 1; }
.rh-logo { max-height: 14mm; max-width: 32mm; width: auto; height: auto; object-fit: contain; flex-shrink: 0; }
.rh-empresa__datos { display: flex; flex-direction: column; font-size: 7.5pt; color: #3D3831; line-height: 1.3; }
.rh-empresa__nombre { font-family: 'Bricolage Grotesque', Figtree, Arial, sans-serif; font-size: 12pt; font-weight: 800; color: #1C1A17; }
.rh-orden { display: flex; flex-direction: column; align-items: flex-end; text-align: right; flex-shrink: 0; line-height: 1.15; }
.rh-copia__rotulo { font-size: 6.75pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border: 0.4mm solid #1C1A17; border-radius: 1mm; padding: 0.5mm 1.6mm; margin-bottom: 1mm; }
.rh-orden__titulo { font-size: 6.75pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6B645A; }
.rh-codigo { font-family: 'Bricolage Grotesque', Figtree, Arial, sans-serif; font-size: 22.5pt; font-weight: 800; line-height: 1.05; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.rh-orden__fecha, .rh-orden__hoja { font-size: 7.5pt; font-weight: 600; }
.rh-orden__anulada { font-size: 9pt; font-weight: 900; color: #7A2E42; }
.rh-datos { display: grid; grid-template-columns: 1.4fr 1fr; gap: 2.6mm; border-top: 0.4mm solid #1C1A17; border-bottom: 0.26mm solid #D6CFC4; padding: 1.6mm 0; }
.rh-datos__col { display: flex; flex-direction: column; font-size: 7.5pt; line-height: 1.35; min-width: 0; }
.rh-datos__nombre { font-size: 9pt; font-weight: 800; }
.rh-rotulo { font-size: 6.4pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6B645A; }
.rh-tabla { width: 100%; border-collapse: collapse; table-layout: fixed; }
.rh-col-n { width: 6mm; } .rh-col-producto { width: auto; } .rh-col-lotes { width: 40%; } .rh-col-cant { width: 16mm; } .rh-col-precio { width: 21mm; }
.rh-tabla th { font-size: 6.4pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #6B645A; text-align: left; border-bottom: 0.26mm solid #1C1A17; padding: 0 1mm 0.8mm; }
.rh-tabla td { font-size: 7.5pt; height: 4.5mm; padding: 0 1mm; border-bottom: 0.26mm solid #EFEBE5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; font-variant-numeric: tabular-nums; }
.rh-tabla tr { page-break-inside: avoid; break-inside: avoid; }
.rh-n { color: #6B645A; }
.rh-producto { font-weight: 700; }
.rh-num { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rh-cajas { font-weight: 800; }
.rh-lotes { font-weight: 400; }
.rh-resumen { display: flex; justify-content: space-between; align-items: baseline; gap: 3.2mm; font-size: 7.5pt; }
.rh-obs { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.rh-totales { display: flex; flex-direction: column; align-items: flex-end; white-space: nowrap; }
.rh-total-cajas, .rh-total { font-family: 'Bricolage Grotesque', Figtree, Arial, sans-serif; font-size: 10.5pt; font-weight: 800; }
.rh-pie { margin-top: auto; display: grid; grid-template-columns: 1fr 1.3fr 1.2fr 0.8fr; gap: 3.7mm; align-items: end; font-size: 6.75pt; color: #3D3831; }
.rh-cargo { line-height: 1.35; }
.rh-firma__linea { border-top: 0.26mm solid #1C1A17; padding-top: 0.8mm; height: 7.4mm; display: flex; align-items: flex-end; box-sizing: border-box; }
.rh-sigue { margin: auto 0 0; font-size: 7.5pt; font-weight: 700; color: #3D3831; }
.rh-legal { font-size: 6.4pt; color: #6B645A; margin: 0; text-align: center; letter-spacing: 0.04em; }
.rh-corte { height: 0; border-top: 0.4mm dashed #9A9287; position: relative; margin: 2.5mm 0; }
.rh-corte span { position: absolute; left: 50%; top: -1.8mm; transform: translateX(-50%); background: #fff; padding: 0 2mm; font-size: 7.5pt; line-height: 1.2; color: #6B645A; font-weight: 700; }
.rh-anulada-capa { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.rh-anulada { transform: rotate(-16deg); border: 1.6mm solid #7A2E42; border-radius: 3.7mm; padding: 1mm 6.9mm; color: #7A2E42; background: rgba(255,255,255,0.75); font-family: 'Bricolage Grotesque', Figtree, Arial, sans-serif; font-size: 72pt; font-weight: 800; letter-spacing: 0.08em; line-height: 1.05; text-align: center; display: flex; flex-direction: column; align-items: center; }
.rh-anulada__detalle { font-family: Figtree, Arial, sans-serif; font-size: 9.75pt; letter-spacing: 0.02em; font-weight: 700; }
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
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    // Una página del PDF por hoja (con más de 12 renglones, la orden ocupa
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
