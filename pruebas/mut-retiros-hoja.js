// Mutaciones de test-retiros-hoja.js: mutan js/retiros-comun.js (la hoja de
// las órdenes de retiro), que la suite recibe por ARCHIVO_COMUN_RETIROS. Ver
// mutar.js.
//
//   node pruebas/mut-retiros-hoja.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-hoja.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'retiros-comun.js'),
  variable: 'ARCHIVO_COMUN_RETIROS',
  funciones: [],
  manuales: [
    // Escapado (el archivo no tiene <script>: las automáticas no aplican)
    { nombre: 'sin escHoja en el nombre de la empresa', de: '<strong class="rh-empresa__nombre">${escHoja(nombre)}</strong>', a: '<strong class="rh-empresa__nombre">${nombre}</strong>' },
    { nombre: 'sin escHoja en el código', de: '<span class="rh-codigo">${escHoja(orden?.codigo || \'—\')}</span>', a: '<span class="rh-codigo">${orden?.codigo || \'—\'}</span>' },
    { nombre: 'sin escHoja en quién cargó', de: "${escHoja(String(orden?.cargadaPor ?? '').trim() || '—')}", a: "${String(orden?.cargadaPor ?? '').trim() || '—'}" },
    { nombre: 'sin escHoja en el rótulo de la copia', de: '<span class="rh-copia__rotulo">${escHoja(rotulo)}</span>', a: '<span class="rh-copia__rotulo">${rotulo}</span>' },
    // Los insumos
    { nombre: 'los insumos suman al total de cajas', de: '(r?.esInsumo ? 0 : (Number(r.cajas) || 0))', a: '(Number(r.cajas) || Number(r.cantidad) || 0)' },
    { nombre: 'el total de unidades con insumos queda en —', de: "  const rs = (orden?.renglones ?? []).filter(r => !r?.esInsumo)", a: '  const rs = orden?.renglones ?? []' },
    { nombre: 'las unidades con decimales', de: "  return unidad === 'un' ? 0 : 3", a: '  return 3' },
    { nombre: 'la cantidad ausente dice 0', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n  const texto = formatearNumeroAr", a: "  if (!Number.isFinite(Number(n))) return '—'\n  const texto = formatearNumeroAr" },
    { nombre: 'el texto no lleva los insumos', de: '      lineas.push(`- ${cantidadInsumoHoja(r.cantidad, r.unidad)} · ${nombreInsumoHoja(r)}${lotesI}`)\n', a: '' },
    { nombre: 'los lotes del insumo en cajas', de: '      return c === null || c === undefined || c === \'\' ? lote : `${lote} (${cantidadInsumoHoja(c, unidad)})`', a: '      return `${lote} (${enteroHoja(l?.cajas)})`' },
    // La hoja del diseño (29/09/2026): escapado
    { nombre: "sin escHoja en los datos de la empresa", de: "(linea1 ? `<span>${escHoja(linea1)}</span>` : '') + (linea2 ? `<span>${escHoja(linea2)}</span>` : '') + `</div></div>`", a: "(linea1 ? `<span>${linea1}</span>` : '') + (linea2 ? `<span>${linea2}</span>` : '') + `</div></div>`" },
    { nombre: "sin escHoja en el cliente", de: "<strong class=\"rh-datos__nombre\">${escHoja(nombre)}</strong>", a: "<strong class=\"rh-datos__nombre\">${nombre}</strong>" },
    { nombre: "sin escHoja en el domicilio del cliente", de: "(dom ? `<span>${escHoja(dom)}</span>` : '')", a: "(dom ? `<span>${dom}</span>` : '')" },
    { nombre: "sin escHoja en el producto", de: "<td class=\"rh-producto\">${escHoja(descripcionHoja(r))}</td>", a: "<td class=\"rh-producto\">${descripcionHoja(r)}</td>" },
    { nombre: "sin escHoja en los lotes", de: "<td class=\"rh-lotes\">${escHoja(lotes)}</td>", a: "<td class=\"rh-lotes\">${lotes}</td>" },
    { nombre: "sin escHoja en la cantidad", de: "<td class=\"rh-num rh-cajas\">${escHoja(cantidadHoja(r))}</td>", a: "<td class=\"rh-num rh-cajas\">${cantidadHoja(r)}</td>" },
    { nombre: "sin escHoja en el precio", de: "precio = `<td class=\"rh-num\">${escHoja(p === '—' || !u ? p : p + ' / ' + u)}</td>", a: "precio = `<td class=\"rh-num\">${p === '—' || !u ? p : p + ' / ' + u}</td>" },
    { nombre: "sin escHoja en observaciones", de: "<strong>Observaciones:</strong> ${escHoja(obs)} ", a: "<strong>Observaciones:</strong> ${obs} " },
    { nombre: "sin escHoja en el faltante", de: "<strong>Faltante:</strong> ${escHoja(faltantes.join('; '))}", a: "<strong>Faltante:</strong> ${faltantes.join('; ')}" },
    { nombre: "sin escHoja en el detalle de anulada", de: "<span class=\"rh-anulada__detalle\">${escHoja(detalle)}</span>", a: "<span class=\"rh-anulada__detalle\">${detalle}</span>" },
    // La hoja del diseño: lo que tiene que decir
    { nombre: "el precio del insumo sin su unidad", de: "p === '—' || !u ? p : p + ' / ' + u", a: "p" },
    { nombre: "el encabezado no dice Cant.", de: "<th class=\"rh-num\">Cant.</th>", a: "<th class=\"rh-num\">Cajas</th>" },
    { nombre: "sin línea de corte", de: "hojas.push(`<div class=\"rh-pagina\">${partes.join(CORTE_HOJA)}</div>`)", a: "hojas.push(`<div class=\"rh-pagina\">${partes.join('')}</div>`)" },
    { nombre: "la leyenda legal se va", de: "    `<p class=\"rh-legal\">${escHoja(LEYENDA_LEGAL)}</p>` +", a: "    ``+" },
    { nombre: "precios siempre", de: "{ conPrecios: conPrecios === true, renglones", a: "{ conPrecios: true, renglones" },
    { nombre: "precios con cualquier valor \"verdadero\"", de: "{ conPrecios: conPrecios === true, renglones", a: "{ conPrecios: !!conPrecios, renglones" },
    { nombre: "sin el sello de anulada", de: "    (anulada ? htmlSelloAnulada(orden) : '') + `</section>`", a: "    `</section>`" },
    { nombre: "sin quién cargó", de: "Cargó: <strong>${escHoja(String(orden?.cargadaPor ?? '').trim() || '—')}</strong>", a: "Cargó: <strong></strong>" },
    { nombre: "sin el total en la hoja con precios", de: "`<span class=\"rh-total\">${escHoja(importeHoja(orden?.total, moneda))}</span>`", a: "`<span class=\"rh-total\"></span>`" },
    { nombre: "sin la razón social de la empresa", de: "  const linea1 = [t(emp?.razon_social) && t(emp.razon_social) !== nombre ? t(emp.razon_social) : '',", a: "  const linea1 = [''," },
    { nombre: "las filas más altas", de: "height: 4.5mm; padding: 0 1mm;", a: "height: 6mm; padding: 0 1mm;" },
    { nombre: "los insumos suman al total de cajas de la hoja", de: "  return [...porUnidad.entries()].map(([u, n]) => cantidadInsumoHoja(n, u || null)).join(' + ')", a: "  return ''" },
    { nombre: "el faltante no se nombra en los lotes", de: "    if (lote === LOTE_SIN_STOCK_HOJA) return `faltan ${cuanto(l)}`\n", a: "" },
    { nombre: "el faltante no va abajo", de: "  const izq = (obs ? `<strong>Observaciones:</strong> ${escHoja(obs)} ` : '') +\n    (faltantes.length ?", a: "  const izq = (obs ? `<strong>Observaciones:</strong> ${escHoja(obs)} ` : '') +\n    (false ?" },
    { nombre: "sin cono no se dice", de: "(cono === 'Sin cono' ? 'sin cono' : cono)", a: "(cono === 'Sin cono' ? '' : cono)" },
    // Más de 12 renglones
    { nombre: "todo en una hoja", de: "  return Math.max(1, Math.ceil(n / RENGLONES_POR_HOJA))", a: "  return 1" },
    { nombre: "15 renglones por hoja", de: "export const RENGLONES_POR_HOJA = 12", a: "export const RENGLONES_POR_HOJA = 15" },
    { nombre: "la numeración vuelve a 1 en cada hoja", de: "htmlFilaHoja(r, desde + k + 1, conPrecios, moneda)", a: "htmlFilaHoja(r, k + 1, conPrecios, moneda)" },
    { nombre: "sin \"Hoja 1 de 2\"", de: "    (paginas > 1 ? `<span class=\"rh-orden__hoja\">Hoja ${escHoja(pagina)} de ${escHoja(paginas)}</span>` : '') +\n", a: "" },
    { nombre: "la firma en todas las hojas", de: "    (ultima\n", a: "    (true\n" },
    { nombre: "la hoja nueva no salta de página", de: ".rh-pagina + .rh-pagina { break-before: page; page-break-before: always; }", a: ".rh-pagina + .rh-pagina { }" },
    // Lo que tiene que decir la hoja
    { nombre: 'una sola copia al imprimir', de: "export const COPIAS_IMPRESION = ['Original — Cliente', 'Duplicado — Depósito']", a: "export const COPIAS_IMPRESION = ['Original — Cliente']" },
    { nombre: 'el PDF con dos copias', de: "export const COPIAS_PDF = ['Original — Cliente']", a: "export const COPIAS_PDF = ['Original — Cliente', 'Duplicado — Depósito']" },
    { nombre: 'sin DNI en la firma', de: '<span class="rh-firma__linea">DNI</span>', a: '' },
    { nombre: 'un importe ausente dice $ 0,00', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n  const simbolo", a: "  if (!Number.isFinite(Number(n))) return '—'\n  const simbolo" },
    { nombre: 'la fecha sin la zona argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HOJA, day:", a: "new Intl.DateTimeFormat('es-AR', { day:" },
    // El logo
    { nombre: 'el logo acepta cualquier cosa', de: "  return /^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i.test(t) && !t.includes('..') ? t : null", a: '  return t || null' },
    { nombre: 'el logo acepta carpetas', de: '/^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i', a: '/^[a-z0-9][a-z0-9._\\/-]*\\.(png|jpe?g|webp)$/i' },
    { nombre: 'los logos sin alto máximo', de: '.rh-logo { max-height: 14mm;', a: '.rh-logo {' },
    { nombre: 'la copia más alta que media hoja', de: 'min-height: 134mm;', a: 'min-height: 150mm;' },
    // Lo que falta de la empresa
    { nombre: 'no avisa del CUIT que falta', de: "  if (!String(emp?.cuit ?? '').trim()) faltan.push('CUIT')\n", a: '' },
    // Texto, PDF y mail
    { nombre: 'el texto con precios', de: "    lineas.push(`- ${enteroHoja(r.cajas)} cajas · ${desc}${lotes}`)", a: "    lineas.push(`- ${enteroHoja(r.cajas)} cajas · ${desc}${lotes} · precio ${r.precio}`)" },
    { nombre: 'el nombre del PDF sin el código', de: '  const nombre = `Orden ${orden?.codigo || \'sin código\'} - ${cli}`', a: '  const nombre = `Orden - ${cli}`' },
    { nombre: 'el nombre del PDF con caracteres prohibidos', de: "  return nombre.replace(/[\\\\/:*?\"<>|\\u0000-\\u001f]/g, ' ')", a: '  return nombre' },
    { nombre: 'el mailto sin codificar el mail', de: "  const para = emailValido(email) ? encodeURIComponent(String(email).trim()) : ''", a: "  const para = String(email ?? '').trim()" },
    { nombre: 'el mailto a cualquier mail', de: '  const para = emailValido(email) ?', a: '  const para = true ?' },
    { nombre: 'no se comparte el PDF aunque se pueda', de: '  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {', a: '  if (false) {' },
    { nombre: 'sin descargar no se abre el mail', de: '  window.location.href = mailto\n', a: '' },
    { nombre: 'librerías de otro lado', de: "  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',", a: "  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'," },
    { nombre: 'una librería que no baja no avisa', de: "    s.onerror = () => { s.remove(); reject(new Error('No se pudo bajar la librería del PDF: revisá la conexión.')) }", a: '    s.onerror = () => { s.remove(); resolve() }' },
    { nombre: 'compartir no manda el texto', de: '      await navigator.share({ title: asuntoMail(orden), text: texto })', a: '      await navigator.share({ title: asuntoMail(orden) })' },
  ],
})
