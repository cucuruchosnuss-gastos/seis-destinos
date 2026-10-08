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
    // El título impreso (08/10/2026: "ORDEN DE PEDIDO")
    { nombre: 'el título vuelve a "RETIRO DE MERCADERÍA"', de: '<span class="rh-titulo__grande">ORDEN DE PEDIDO</span>', a: '<span class="rh-titulo__grande">RETIRO DE MERCADERÍA</span>' },
    { nombre: 'el título impreso sin texto', de: '<span class="rh-titulo__grande">ORDEN DE PEDIDO</span>', a: '<span class="rh-titulo__grande"></span>' },
    // Los insumos
    { nombre: 'los insumos suman al total de cajas', de: '(r?.esInsumo ? 0 : (Number(r.cajas) || 0))', a: '(Number(r.cajas) || Number(r.cantidad) || 0)' },
    { nombre: 'el total de unidades con insumos queda en —', de: "  const rs = (orden?.renglones ?? []).filter(r => !r?.esInsumo)", a: '  const rs = orden?.renglones ?? []' },
    { nombre: 'las unidades con decimales', de: "  return unidad === 'un' ? 0 : 3", a: '  return 3' },
    { nombre: 'la cantidad ausente dice 0', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n  const texto = formatearNumeroAr", a: "  if (!Number.isFinite(Number(n))) return '—'\n  const texto = formatearNumeroAr" },
    { nombre: 'el texto no lleva los insumos', de: '      lineas.push(`- ${cantidadInsumoHoja(r.cantidad, r.unidad)} · ${nombreInsumoHoja(r)}${lotesI}`)\n', a: '' },
    { nombre: 'los lotes del insumo en cajas', de: '      return c === null || c === undefined || c === \'\' ? lote : `${lote} (${cantidadInsumoHoja(c, unidad)})`', a: '      return `${lote} (${enteroHoja(l?.cajas)})`' },
    // La hoja del diseño (29/09/2026): escapado
    { nombre: "sin escHoja en el producto", de: "<td class=\"rh-producto\">${escHoja(descripcionHoja(r))}</td>", a: "<td class=\"rh-producto\">${descripcionHoja(r)}</td>" },
    { nombre: "sin escHoja en la cantidad", de: "<td class=\"rh-num rh-cajas\">${escHoja(cantidadHoja(r))}</td>", a: "<td class=\"rh-num rh-cajas\">${cantidadHoja(r)}</td>" },
    { nombre: "sin escHoja en observaciones", de: "<strong>Observaciones:</strong> ${escHoja(obs)} ", a: "<strong>Observaciones:</strong> ${obs} " },
    { nombre: "sin escHoja en el faltante", de: "<strong>Faltante:</strong> ${escHoja(faltantes.join('; '))}", a: "<strong>Faltante:</strong> ${faltantes.join('; ')}" },
    { nombre: "sin escHoja en el detalle de anulada", de: "<span class=\"rh-anulada__detalle\">${escHoja(detalle)}</span>", a: "<span class=\"rh-anulada__detalle\">${detalle}</span>" },
    // La hoja del diseño: lo que tiene que decir
    { nombre: "el precio del insumo sin su unidad", de: "p === '—' || !u ? p : p + ' / ' + u", a: "p" },
    { nombre: "la leyenda legal se va", de: "    `<p class=\"rh-legal\">${escHoja(LEYENDA_LEGAL)}</p>` +", a: "    ``+" },
    { nombre: "sin el sello de anulada", de: "    (anulada ? htmlSelloAnulada(orden) : '') + `</section>`", a: "    `</section>`" },
    { nombre: "los insumos suman al total de cajas de la hoja", de: "  return [...porUnidad.entries()].map(([u, n]) => cantidadInsumoHoja(n, u || null)).join(' + ')", a: "  return ''" },
    { nombre: "el faltante no se nombra en los lotes", de: "    if (lote === LOTE_SIN_STOCK_HOJA) return `faltan ${cuanto(l)}`\n", a: "" },
    { nombre: "sin cono no se dice", de: "(cono === 'Sin cono' ? 'sin cono' : cono)", a: "(cono === 'Sin cono' ? '' : cono)" },
    // LA IMPRESIÓN NUEVA (07/10/2026): escapado
    { nombre: 'sin escHoja en los datos de la empresa', de: 'datos.map(d => `<span>${escHoja(d)}</span>`)', a: 'datos.map(d => `<span>${d}</span>`)' },
    { nombre: 'sin escHoja en el nombre del cliente', de: '<strong class="rh-cliente__nombre">${escHoja(nombre)}</strong>', a: '<strong class="rh-cliente__nombre">${nombre}</strong>' },
    { nombre: 'sin escHoja en la localidad', de: 'localidad ? `<span>${escHoja(localidad)}</span>`', a: 'localidad ? `<span>${localidad}</span>`' },
    { nombre: 'sin escHoja en el transporte', de: '<span>${escHoja(textoTransporteHoja(transporte))}</span>', a: '<span>${textoTransporteHoja(transporte)}</span>' },
    { nombre: 'sin escHoja en el lote', de: '<td class="rh-lote">${escHoja(lotes)}</td>', a: '<td class="rh-lote">${lotes}</td>' },
    { nombre: 'sin escHoja en el precio', de: '<td class="rh-num rh-plata">${escHoja(p === \'—\' || !u ? p : p + \' / \' + u)}</td>', a: '<td class="rh-num rh-plata">${p === \'—\' || !u ? p : p + \' / \' + u}</td>' },
    { nombre: 'sin escHoja en el rótulo de la copia', de: '<span class="rh-titulo__copia">${escHoja(rotuloCopiaHoja(copia, pagina, paginas, entera))}</span>', a: '<span class="rh-titulo__copia">${rotuloCopiaHoja(copia, pagina, paginas, entera)}</span>' },
    // La hoja nueva: lo que tiene que decir
    { nombre: 'sin la línea punteada', de: '<div class="rh-pagina">${partes.join(CORTE_HOJA)}</div>', a: '<div class="rh-pagina">${partes.join(\'\')}</div>' },
    { nombre: 'precios siempre', de: '  const precios = conPrecios === true\n', a: '  const precios = true\n' },
    { nombre: 'precios con cualquier valor "verdadero"', de: '  const precios = conPrecios === true\n', a: '  const precios = !!conPrecios\n' },
    { nombre: 'sin "Entregó"', de: 'Entregó: <strong>${escHoja(String(orden?.cargadaPor ?? \'\').trim() || \'—\')}</strong>', a: 'Entregó: <strong></strong>' },
    { nombre: 'sin el total en pesos', de: '<td class="rh-num rh-plata rh-total__plata">${escHoja(importeHoja(orden?.total, moneda))}</td>', a: '<td class="rh-num rh-plata rh-total__plata"></td>' },
    { nombre: 'sin la razón social de la empresa', de: "    t(emp?.razon_social) && t(emp.razon_social) !== nombre ? t(emp.razon_social) : '',", a: "    ''," },
    { nombre: 'sin "Retira: en fábrica"', de: "  return t ? `Transporte: ${t}` : 'Retira: en fábrica'", a: "  return t ? `Transporte: ${t}` : ''" },
    { nombre: 'el faltante no va abajo', de: '    (faltantes.length ? `<strong>Faltante:</strong>', a: '    (false ? `<strong>Faltante:</strong>' },
    { nombre: 'sin DNI en la firma', de: '<span class="rh-firma">DNI</span>', a: '' },
    { nombre: 'una sola copia al imprimir', de: "export const COPIAS_IMPRESION = ['ORIGINAL', 'DUPLICADO']", a: "export const COPIAS_IMPRESION = ['ORIGINAL']" },
    { nombre: 'el PDF con dos copias', de: "export const COPIAS_PDF = ['ORIGINAL']", a: "export const COPIAS_PDF = ['ORIGINAL', 'DUPLICADO']" },
    { nombre: 'un lote solo repite su cantidad', de: '    return lista.length === 1 ? lote : ', a: '    return false ? lote : ' },
    { nombre: 'el producto se corta con "…"', de: '.rh-tabla td { font-size: 16px; padding: 3px 6px; border-bottom: 1px solid #000; vertical-align: top; overflow-wrap: anywhere; white-space: normal; }', a: '.rh-tabla td { font-size: 16px; padding: 3px 6px; border-bottom: 1px solid #000; vertical-align: top; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' },
    { nombre: 'la leyenda se puede partir', de: '.rh-legal { margin: 0; font-size: 12px; text-align: center; white-space: nowrap; }', a: '.rh-legal { margin: 0; font-size: 12px; text-align: center; }' },
    { nombre: 'el logo a color', de: ' filter: grayscale(1); }', a: ' }' },
    { nombre: 'un gris en la hoja', de: '.rh-anulada { transform: rotate(-16deg); border: 6px solid #000;', a: '.rh-anulada { transform: rotate(-16deg); border: 6px solid #7A2E42;' },
    { nombre: 'sin la letra Archivo', de: "@import url('${FUENTE_HOJA}');\n", a: '' },
    { nombre: 'la línea punteada de otro grosor', de: 'border-top: 1.5px dotted #000;', a: 'border-top: 1px dotted #000;' },
    { nombre: 'el cliente chico', de: '.rh-cliente__nombre { font-size: 26px;', a: '.rh-cliente__nombre { font-size: 18px;' },
    { nombre: 'el recuadro sin borde', de: 'border: 2px solid #000; padding: 4px 6px;', a: 'padding: 4px 6px;' },
    // El plan: media hoja u hojas enteras
    { nombre: 'nunca media hoja', de: "  if (Number(medidas?.copiaEntera) <= media) return { modo: 'media' }\n", a: '' },
    { nombre: 'siempre media hoja', de: "  if (Number(medidas?.copiaEntera) <= media) return { modo: 'media' }", a: "  return { modo: 'media' }" },
    { nombre: 'el borde de la media hoja estricto', de: '  if (Number(medidas?.copiaEntera) <= media) return', a: '  if (Number(medidas?.copiaEntera) < media) return' },
    { nombre: 'la última hoja sin lugar para el final', de: '    if (k === filas.length && k - desde > 1) k--\n', a: '' },
    { nombre: 'la hoja que sigue sin reservar "Sigue en…"', de: '    while (k < filas.length && fijo + suma + filas[k] + inter <= entera) { suma += filas[k]; k++ }', a: '    while (k < filas.length && fijo + suma + filas[k] <= entera) { suma += filas[k]; k++ }' },
    { nombre: 'la final sin el final', de: '    while (k < filas.length && fijo + suma + filas[k] + final <= entera) { suma += filas[k]; k++ }', a: '    while (k < filas.length && fijo + suma + filas[k] <= entera) { suma += filas[k]; k++ }' },
    { nombre: 'un renglón enorme se pierde', de: '    if (k === desde) k = desde + 1\n', a: '' },
    { nombre: 'en hojas enteras sin "HOJA 1 DE N"', de: '  return entera ? `${copia} · HOJA ${pagina} DE ${paginas}` : copia', a: '  return copia' },
    { nombre: 'en hojas enteras sin el total y la firma en la última', de: '    (ultima ? htmlNotasHoja(orden) + htmlPieHoja(orden) :', a: '    (false ? htmlNotasHoja(orden) + htmlPieHoja(orden) :' },
    { nombre: 'el total en todas las hojas', de: '{ conTotal: ultima, orden }', a: '{ conTotal: true, orden }' },
    { nombre: 'la hoja nueva no salta de página', de: '.rh-pagina + .rh-pagina { break-before: page; page-break-before: always; }', a: '.rh-pagina + .rh-pagina { }' },
    { nombre: 'el PDF sin medir', de: 'copias: COPIAS_PDF, plan })', a: 'copias: COPIAS_PDF })' },
    { nombre: 'el renglón se corta entre páginas', de: '.rh-tabla tr { break-inside: avoid; page-break-inside: avoid; }', a: '.rh-tabla tr { }' },
    // Lo que tiene que decir la hoja
    { nombre: 'un importe ausente dice $ 0,00', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n  const simbolo", a: "  if (!Number.isFinite(Number(n))) return '—'\n  const simbolo" },
    { nombre: 'la fecha sin la zona argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HOJA, day:", a: "new Intl.DateTimeFormat('es-AR', { day:" },
    // El logo
    { nombre: 'el logo acepta cualquier cosa', de: "  return /^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i.test(t) && !t.includes('..') ? t : null", a: '  return t || null' },
    { nombre: 'el logo acepta carpetas', de: '/^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i', a: '/^[a-z0-9][a-z0-9._\\/-]*\\.(png|jpe?g|webp)$/i' },
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
