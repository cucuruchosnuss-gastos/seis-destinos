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
    { nombre: 'sin escHoja en los datos de la empresa', de: "    lineas.map(l => `<span>${escHoja(l)}</span>`).join('')", a: "    lineas.map(l => `<span>${l}</span>`).join('')" },
    { nombre: 'sin escHoja en el cliente', de: '<span class="rh-rotulo">Cliente</span> <strong>${escHoja(nombre)}</strong>', a: '<span class="rh-rotulo">Cliente</span> <strong>${nombre}</strong>' },
    { nombre: 'sin escHoja en el producto', de: '`<tr><td>${escHoja(r.producto || \'—\')}</td>', a: '`<tr><td>${r.producto || \'—\'}</td>' },
    { nombre: 'sin escHoja en los lotes', de: '<td class="rh-lotes">${escHoja(textoLotes(r.lotes))}</td>', a: '<td class="rh-lotes">${textoLotes(r.lotes)}</td>' },
    { nombre: 'sin escHoja en el código', de: '<span class="rh-codigo">${escHoja(orden?.codigo || \'—\')}</span>', a: '<span class="rh-codigo">${orden?.codigo || \'—\'}</span>' },
    { nombre: 'sin escHoja en observaciones', de: '<span class="rh-rotulo">Observaciones</span> ${escHoja(String(orden.observaciones).trim())}', a: '<span class="rh-rotulo">Observaciones</span> ${String(orden.observaciones).trim()}' },
    { nombre: 'sin escHoja en quién cargó', de: "${escHoja(String(orden?.cargadaPor ?? '').trim() || '—')}", a: "${String(orden?.cargadaPor ?? '').trim() || '—'}" },
    { nombre: 'sin escHoja en el rótulo de la copia', de: '<span class="rh-copia__rotulo">${escHoja(rotulo)}</span>', a: '<span class="rh-copia__rotulo">${rotulo}</span>' },
    { nombre: 'sin escHoja en el nombre del insumo', de: '<tr class="rh-insumo"><td>${escHoja(nombreInsumoHoja(r))}</td>', a: '<tr class="rh-insumo"><td>${nombreInsumoHoja(r)}</td>' },
    { nombre: 'sin escHoja en la cantidad del insumo', de: '<td class="rh-num rh-cajas">${escHoja(cantidadInsumoHoja(r.cantidad, r.unidad))}</td>', a: '<td class="rh-num rh-cajas">${cantidadInsumoHoja(r.cantidad, r.unidad)}</td>' },
    { nombre: 'sin escHoja en los lotes del insumo', de: '<td class="rh-lotes">${escHoja(textoLotes(r.lotes, r.unidad))}</td>', a: '<td class="rh-lotes">${textoLotes(r.lotes, r.unidad)}</td>' },
    { nombre: 'sin escHoja en el precio del insumo', de: '<td class="rh-num">${escHoja(precioPorUnidad)}</td>', a: '<td class="rh-num">${precioPorUnidad}</td>' },
    // Los insumos
    { nombre: 'el insumo se dibuja como producto', de: '  if (r?.esInsumo) {\n    const u = unidadHoja(r.unidad)', a: '  if (false) {\n    const u = unidadHoja(r.unidad)' },
    { nombre: 'los insumos suman al total de cajas', de: '(r?.esInsumo ? 0 : (Number(r.cajas) || 0))', a: '(Number(r.cajas) || Number(r.cantidad) || 0)' },
    { nombre: 'el total de unidades con insumos queda en —', de: "  const rs = (orden?.renglones ?? []).filter(r => !r?.esInsumo)", a: '  const rs = orden?.renglones ?? []' },
    { nombre: 'las unidades con decimales', de: "  return unidad === 'un' ? 0 : 3", a: '  return 3' },
    { nombre: 'la cantidad ausente dice 0', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n  const texto = formatearNumeroAr", a: "  if (!Number.isFinite(Number(n))) return '—'\n  const texto = formatearNumeroAr" },
    { nombre: 'el precio del insumo sin su unidad', de: "    const precioPorUnidad = precio === '—' || !u ? precio : precio + ' / ' + u", a: '    const precioPorUnidad = precio' },
    { nombre: 'el encabezado no avisa de la cantidad', de: "${conInsumos ? 'Cajas / cant.' : 'Cajas'}", a: 'Cajas' },
    { nombre: 'el texto no lleva los insumos', de: '      lineas.push(`- ${cantidadInsumoHoja(r.cantidad, r.unidad)} · ${nombreInsumoHoja(r)}${lotesI}`)\n', a: '' },
    { nombre: 'los lotes del insumo en cajas', de: '      return c === null || c === undefined || c === \'\' ? lote : `${lote} (${cantidadInsumoHoja(c, unidad)})`', a: '      return `${lote} (${enteroHoja(l?.cajas)})`' },
    // Lo que tiene que decir la hoja
    { nombre: 'una sola copia al imprimir', de: "export const COPIAS_IMPRESION = ['Original — Cliente', 'Duplicado — Depósito']", a: "export const COPIAS_IMPRESION = ['Original — Cliente']" },
    { nombre: 'el PDF con dos copias', de: "export const COPIAS_PDF = ['Original — Cliente']", a: "export const COPIAS_PDF = ['Original — Cliente', 'Duplicado — Depósito']" },
    { nombre: 'sin línea de corte', de: '  const cuerpo = partes.join(CORTE_HOJA)', a: "  const cuerpo = partes.join('')" },
    { nombre: 'la leyenda legal se va', de: "    `<p class=\"rh-legal\">${escHoja(LEYENDA_LEGAL)}</p></section>`", a: '    `</section>`' },
    { nombre: 'precios siempre', de: '  const partes = copias.map(rotulo => htmlCopiaHoja(orden, rotulo, { conPrecios: conPrecios === true }))', a: '  const partes = copias.map(rotulo => htmlCopiaHoja(orden, rotulo, { conPrecios: true }))' },
    { nombre: 'precios con cualquier valor "verdadero"', de: '{ conPrecios: conPrecios === true }', a: '{ conPrecios: !!conPrecios }' },
    { nombre: 'sin la marca de anulada', de: "    (anulada ? '<div class=\"rh-anulada\" aria-hidden=\"true\">ANULADA</div>' : '') +", a: '' },
    { nombre: 'sin quién cargó', de: '<div class="rh-cargo"><span class="rh-rotulo">Cargó</span>', a: '<div class="rh-cargo"><span class="rh-rotulo"></span>' },
    { nombre: 'sin DNI en la firma', de: '<span class="rh-firma__linea">DNI</span>', a: '' },
    { nombre: 'un importe ausente dice $ 0,00', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'\n  const simbolo", a: "  if (!Number.isFinite(Number(n))) return '—'\n  const simbolo" },
    { nombre: 'sin el total en la hoja con precios', de: '<td class="rh-num rh-total">${escHoja(importeHoja(orden?.total, moneda))}</td>', a: '<td class="rh-num rh-total"></td>' },
    { nombre: 'sin la razón social de la empresa', de: "  const nombre = String(emp?.razon_social ?? '').trim() || String(emp?.nombre ?? '').trim() || 'Empresa'", a: "  const nombre = String(emp?.nombre ?? '').trim() || 'Empresa'" },
    { nombre: 'la fecha sin la zona argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HOJA, day:", a: "new Intl.DateTimeFormat('es-AR', { day:" },
    // El logo
    { nombre: 'el logo acepta cualquier cosa', de: "  return /^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i.test(t) && !t.includes('..') ? t : null", a: '  return t || null' },
    { nombre: 'el logo acepta carpetas', de: '/^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i', a: '/^[a-z0-9][a-z0-9._\\/-]*\\.(png|jpe?g|webp)$/i' },
    { nombre: 'los logos sin alto máximo', de: '.rh-logo { max-height: 14mm;', a: '.rh-logo {' },
    { nombre: 'la copia más alta que media hoja', de: 'min-height: 134mm;', a: 'min-height: 150mm;' },
    { nombre: 'las filas más altas', de: 'padding: 0.45mm 1.2mm;', a: 'padding: 1mm 1.2mm;' },
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
