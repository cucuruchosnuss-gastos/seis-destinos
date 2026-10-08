// LA HOJA de una orden de retiro (js/retiros-comun.js, 26/09/2026; el diseño de
// la impresión del 07/10/2026, en blanco y negro): la que se imprime (media A4
// por copia, o hojas enteras si no entra), la que va en el PDF (una copia, el
// original) y el texto para compartir. La usan la Carga (sin precios) y Administración
// (con precios).
//
//   node pruebas/test-retiros-hoja.js
// Overrides: ARCHIVO_TEST (retiros.html), ARCHIVO_COMUN_RETIROS (el común).

// La hora de la hoja tiene que salir en hora de Argentina AUNQUE el proceso
// corra en otra zona: se corre en UTC, como GitHub Actions.
process.env.TZ = 'UTC'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { RUTA_COMUN_RETIROS } = require('./fuente-cobranzas')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const comun = fs.readFileSync(RUTA_COMUN_RETIROS, 'utf8')
console.log(`ARCHIVO ${RUTA_COMUN_RETIROS} (${comun.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)

const EMPRESA = { id: 'u-n', nombre: 'Cucuruchos Nuss', razon_social: 'NUSS SRL', cuit: '30700000001', domicilio: 'Ruta 9 km 700', telefono: '351 555-0000', logo_url: 'logo-cucuruchos-nuss.png' }
const ORDEN = {
  codigo: 'N-0012', estado: 'confirmada', fecha: '2026-09-26', cargadaEn: '2026-09-26T17:32:00Z', cargadaPor: 'Emanuel Romero',
  transporte: 'Expreso Norte', observaciones: 'Frágil', moneda: 'ARS', total: 45000,
  empresa: EMPRESA,
  cliente: { nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', domicilio: 'Av. Siempreviva 742', localidad: 'Córdoba', email: 'compras@anatolia.com' },
  renglones: [
    { producto: 'Cucurucho grande', presentacion: 'Caja x 100', cono: 'Sin cono', cajas: 10, unidades: 1000, lotes: [{ lote: '7030-1', cajas: 6 }, { lote: '7031-2', cajas: 4 }], precio: 3000, subtotal: 30000 },
    { producto: 'Cucurucho grande', presentacion: 'Caja x 100 con cono', cono: 'LOLO', cajas: 5, unidades: 500, lotes: [{ lote: '7030-3', cajas: 5 }], precio: 3000, subtotal: 15000 },
  ],
}

// ── La hoja SIN precios (la de la carga) ────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlHoja(ORDEN, { conPrecios: false })
  chk('la hoja impresa tiene DOS copias', (h.match(/<section class="rh-copia/g) || []).length === 2)
  chk('arriba el ORIGINAL y abajo el DUPLICADO', h.indexOf('rh-titulo__copia">ORIGINAL<') > 0 && h.indexOf('rh-titulo__copia">DUPLICADO<') > h.indexOf('rh-titulo__copia">ORIGINAL<'))
  chk('con la línea punteada entre las dos, en media hoja', (h.match(/class="rh-corte"/g) || []).length === 1 && /rh-hoja rh-hoja--media/.test(h) &&
    h.indexOf('rh-corte') > h.indexOf('ORIGINAL<') && h.indexOf('rh-corte') < h.indexOf('DUPLICADO<'))
  // 08/10/2026 (pedido de Facu): el título impreso dice "ORDEN DE PEDIDO" (antes "RETIRO DE MERCADERÍA").
  chk('"ORDEN DE PEDIDO" en cada copia', (h.match(/rh-titulo__grande">ORDEN DE PEDIDO</g) || []).length === 2)
  chk('el título viejo "RETIRO DE MERCADERÍA" ya no aparece', !/RETIRO DE MERCADER/i.test(h))
  chk('el logo de ESA empresa, en círculo, en cada copia', (h.match(/<span class="rh-logo"><img src="\.\.\/logo-cucuruchos-nuss\.png"/g) || []).length === 2)
  chk('la fábrica, la razón social, el CUIT, el domicilio y el teléfono', /rh-empresa__nombre">Cucuruchos Nuss</.test(h) && /NUSS SRL/.test(h) && /CUIT 30700000001/.test(h) && /Ruta 9 km 700/.test(h) && /Tel\. 351 555-0000/.test(h))
  chk('el CUIT va tal cual, sin puntos de miles', !/30\.700\.000\.001/.test(h))
  chk('el recuadro: "ORDEN N°", el código y la fecha', /rh-orden__rotulo">ORDEN N°</.test(h) && /class="rh-codigo">N-0012</.test(h))
  chk('fecha y hora de Argentina', /26\/09\/2026 14:32/.test(h))
  chk('el cliente: "CLIENTE" y el nombre grande', /rh-rotulo">CLIENTE</.test(h) && /rh-cliente__nombre">Distribuidora Anatolia</.test(h))
  chk('a la derecha la localidad y el transporte', /rh-cliente__der"><span>Córdoba<\/span><span>Transporte: Expreso Norte<\/span>/.test(h))
  chk('sin transporte: "Retira: en fábrica"', /Retira: en fábrica/.test(S.htmlHoja({ ...ORDEN, transporte: '' })) && S.textoTransporteHoja('  ') === 'Retira: en fábrica')
  chk('la tabla: CAJAS · PRODUCTO · LOTE', /<th class="rh-num">CAJAS<\/th><th>PRODUCTO<\/th><th>LOTE<\/th>/.test(h))
  chk('los renglones: las cajas, el nombre ENTERO y los lotes', /<td class="rh-num rh-cajas">10<\/td><td class="rh-producto">Cucurucho grande · Caja x 100 · sin cono<\/td><td class="rh-lote">7030-1 ×6 · 7031-2 ×4<\/td>/.test(h) && /Caja x 100 con cono · LOLO/.test(h))
  chk('un solo lote va sin la cantidad repetida', /<td class="rh-lote">7030-3<\/td>/.test(h))
  chk('TOTAL DE CAJAS con la suma', /<td class="rh-num rh-cajas">15<\/td><td colspan="2" class="rh-total__rotulo">TOTAL DE CAJAS<\/td>/.test(h))
  chk('las observaciones', /Frágil/.test(h))
  chk('"Entregó:" con quién la cargó', /Entregó: <strong>Emanuel Romero<\/strong>/.test(h))
  chk('FIRMA, ACLARACIÓN y DNI', (h.match(/class="rh-firma">FIRMA</g) || []).length === 2 && /rh-firma">ACLARACIÓN</.test(h) && /rh-firma">DNI</.test(h))
  chk('la leyenda entera en cada copia', (h.match(/rh-legal">Documento interno\. No válido como factura\.</g) || []).length === 2)
  chk('SIN PRECIOS aunque la orden los traiga', !/PRECIO|SUBTOTAL|\$|3\.000,00|45\.000/.test(h))
  chk('sin precios por defecto (sin pasar la opción)', !/PRECIO X CAJA/.test(S.htmlHoja(ORDEN)))
  chk('conPrecios tiene que ser true, no algo "parecido"', !/PRECIO X CAJA/.test(S.htmlHoja(ORDEN, { conPrecios: 'si' })))
  chk('una orden confirmada no dice ANULADA', !/ANULADA/.test(h))
  chk('ningún "…" en la hoja', !/…|\.\.\./.test(h))
}

// ── CON precios (la de Administración) ──────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlHoja(ORDEN, { conPrecios: true })
  chk('con precios: PRECIO X CAJA y SUBTOTAL', /PRECIO X CAJA/.test(h) && /SUBTOTAL/.test(h))
  chk('el subtotal por renglón', /\$\s30\.000,00/.test(h) && /\$\s15\.000,00/.test(h))
  chk('y el total en pesos', /rh-total__plata">\$\s45\.000,00/.test(h))
  const sin = S.htmlHoja({ ...ORDEN, total: null, renglones: [{ ...ORDEN.renglones[0], precio: null, subtotal: null }] }, { conPrecios: true })
  chk('un precio ausente dice "—", nunca "$ 0,00"', !/0,00/.test(sin) && /rh-total__plata">—</.test(sin))
  chk('la misma hoja: dos copias y la leyenda', (h.match(/<section class="rh-copia/g) || []).length === 2 && /No válido como factura/.test(h))
}

// ── Anulada ────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlHoja({ ...ORDEN, estado: 'anulada' })
  chk('anulada: "ANULADA" grande y cruzado en cada copia', (h.match(/class="rh-anulada"/g) || []).length === 2)
  chk('la copia se marca anulada (tachado)', /rh-copia rh-copia--anulada/.test(h) && /rh-copia--anulada \.rh-tabla/.test(S.ESTILOS_HOJA))
  chk('ANULADA está rotada (cruzada)', /\.rh-anulada \{[^}]*rotate\(/.test(S.ESTILOS_HOJA))
}

// ── Empresa con datos que faltan ────────────────────────────────────────────
{
  const S = nuevo()
  const vacia = { nombre: 'Dolce Pasta', razon_social: null, cuit: '', domicilio: null, telefono: null, logo_url: 'logo-dolce-pasta.png' }
  const h = S.htmlHoja({ ...ORDEN, empresa: vacia })
  chk('sin datos, la hoja sale con logo y nombre', /logo-dolce-pasta\.png/.test(h) && /rh-empresa__nombre">Dolce Pasta</.test(h))
  chk('sin huecos: no quedan rótulos vacíos', !/CUIT\s*<|Tel\.\s*<|CUIT undefined|null/.test(h))
  chk('la pantalla lista lo que falta', JSON.stringify(S.datosFaltantesEmpresa(vacia)) === JSON.stringify(['razón social', 'CUIT', 'domicilio', 'teléfono']))
  chk('y lo dice en palabras', /le faltan: razón social, CUIT, domicilio y teléfono/.test(S.textoFaltantesEmpresa(vacia)))
  chk('con todo cargado no avisa nada', S.textoFaltantesEmpresa(EMPRESA) === '')
  chk('con una sola cosa, en singular', /le falta: teléfono\./.test(S.textoFaltantesEmpresa({ ...EMPRESA, telefono: ' ' })))
}

// ── El logo: el de cada empresa, y nada raro en el src ──────────────────────
{
  const S = nuevo()
  for (const l of ['logo-cucuruchos-nuss.png', 'logo-dolce-pasta.png', 'logo-heladitos-orly.png', 'logo-taller.png']) {
    chk(`${l} se acepta y existe en la raíz del repo`, S.logoSeguro(l) === l && fs.existsSync(path.join(__dirname, '..', l)))
  }
  for (const malo of ['javascript:alert(1)', '../secreto.png', 'https://otro.com/x.png', 'x.svg', '"><img src=x onerror=1>.png', '', null, 'carpeta/logo.png']) {
    chk(`logoSeguro rechaza ${JSON.stringify(malo)}`, S.logoSeguro(malo) === null)
  }
  const h = S.htmlHoja({ ...ORDEN, empresa: { ...EMPRESA, logo_url: 'javascript:alert(1)' } })
  chk('un logo raro no genera ninguna imagen', !/<img/.test(h))
  chk('el logo en un círculo de 70 px', /\.rh-logo \{[^}]*width: 70px; height: 70px; border-radius: 50%/.test(S.ESTILOS_HOJA))
  chk('A4 con márgenes de impresión', /@page \{ size: A4; margin: 8mm/.test(S.ESTILOS_HOJA))
  chk('la hoja no usa el naranja ni colores de la app', !/#C2410C|var\(--naranja|--verde|--bordo/i.test(S.ESTILOS_HOJA))
  chk('SOLO NEGRO: ningún color que no sea #000 o #fff', (S.ESTILOS_HOJA.match(/#[0-9a-f]{3,6}\b/gi) || []).every(c => /^#(000|000000|fff|ffffff)$/i.test(c)))
  chk('el logo pasa a blanco y negro', /\.rh-logo img \{[^}]*grayscale\(1\)/.test(S.ESTILOS_HOJA))
  chk('la letra Archivo de Google Fonts, con respaldo sans-serif', /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo/.test(S.ESTILOS_HOJA) && /font-family: Archivo,[^;]*sans-serif/.test(S.ESTILOS_HOJA))
  chk('ninguna línea de menos de 1 px', !/(border[a-z-]*):\s*0\.\d+px/.test(S.ESTILOS_HOJA) && !/0\.\d+mm solid/.test(S.ESTILOS_HOJA))
  chk('el texto nunca se corta con "…" (sin ellipsis ni nowrap en el producto)', !/text-overflow: ellipsis/.test(S.ESTILOS_HOJA) && /\.rh-tabla td \{[^}]*white-space: normal/.test(S.ESTILOS_HOJA))
}

// ── LOS TAMAÑOS DEL DISEÑO (07/10/2026) ──────────────────────────────────────
// Los fija el diseño aprobado por Facu; la medida de verdad (que entre en la
// A4, que no se corte nada) la hace e2e/28-hoja-retiro.spec.js en Chromium.
{
  const S = nuevo()
  const css = S.ESTILOS_HOJA
  chk('la media hoja: dos copias y la línea punteada en los 281 mm útiles', 2 * S.ALTO_MEDIA_HOJA_MM + 7.4 <= S.ALTO_UTIL_A4_MM && /\.rh-hoja--media \.rh-copia \{ height: \$\{?|\.rh-hoja--media \.rh-copia \{ height: 136mm/.test(css))
  chk('la línea punteada de 1,5 px', /\.rh-corte \{[^}]*border-top: 1\.5px dotted #000/.test(css))
  chk('la cabecera de unos 70 px', /\.rh-cab \{[^}]*min-height: 70px/.test(css))
  chk('la fábrica en 16 px negrita y sus datos en 12 px', /\.rh-empresa__nombre \{ font-size: 16px; font-weight: 800/.test(css) && /\.rh-empresa__datos \{[^}]*font-size: 12px/.test(css))
  chk('"ORDEN DE PEDIDO" en 800 y 23 px, sin fondo', /\.rh-titulo__grande \{ font-size: 23px; font-weight: 800/.test(css) && !/\.rh-titulo[^{]*\{[^}]*background/.test(css))
  chk('la copia en 12 px con espaciado', /\.rh-titulo__copia \{ font-size: 12px;[^}]*letter-spacing/.test(css))
  chk('el recuadro de 128 px con borde negro de 2 px', /\.rh-orden \{ width: 128px;[^}]*border: 2px solid #000/.test(css))
  chk('el número de orden en 28 px negrita y la fecha en 12 px', /\.rh-codigo \{ font-size: 28px; font-weight: 800/.test(css) && /\.rh-orden__fecha \{ font-size: 12px/.test(css))
  chk('el cliente en 26 px negrita, con la línea negra de 2 px', /\.rh-cliente__nombre \{ font-size: 26px; font-weight: 800/.test(css) && /\.rh-cliente \{[^}]*border-bottom: 2px solid #000/.test(css))
  chk('CAJAS de 74 px y LOTE de 120 px', /\.rh-col-cajas \{ width: 74px; \}/.test(css) && /\.rh-col-lote \{ width: 120px; \}/.test(css))
  chk('las cajas en 22 px negrita, alineadas a la derecha', /\.rh-cajas \{ font-size: 22px !important; font-weight: 800/.test(css))
  chk('producto y lote en 16 px, con líneas de 1 px', /\.rh-tabla td \{ font-size: 16px;[^}]*border-bottom: 1px solid #000/.test(css))
  chk('el encabezado de la tabla en 12 px negrita con espaciado', /\.rh-tabla th \{ font-size: 12px; font-weight: 800; letter-spacing/.test(css))
  chk('"Entregó" en 14 px y las firmas de unos 440 px', /\.rh-entrego \{ font-size: 14px/.test(css) && /\.rh-firmas \{ width: 440px/.test(css))
  chk('cada firma con su línea de 1 px y el rótulo en 12 px negrita', /\.rh-firma \{ border-top: 1px solid #000;[^}]*font-size: 12px; font-weight: 700/.test(css))
  chk('la leyenda centrada en 12 px, en un renglón (ENTERA)', /\.rh-legal \{[^}]*font-size: 12px; text-align: center; white-space: nowrap/.test(css))
  chk('un renglón no se corta entre páginas', /\.rh-tabla tr \{ break-inside: avoid/.test(css))
}

// ── EL PLAN: media hoja u hojas enteras (lo que se MIDIÓ) ───────────────────
{
  const S = nuevo()
  chk('si la copia entera entra en media hoja: media hoja', S.planHoja({ copiaEntera: 120, filas: [10, 10] }).modo === 'media')
  chk('… justo en el borde, también', S.planHoja({ copiaEntera: S.ALTO_MEDIA_HOJA_MM, filas: [] }).modo === 'media')
  const veinticinco = Array(25).fill(9)
  const p = S.planHoja({ copiaEntera: 300, fijo: 40, final: 50, intermedio: 15, filas: veinticinco })
  chk('si no entra: hojas enteras', p.modo === 'entera')
  chk('… todos los renglones, en orden y sin repetir', p.paginas[0][0] === 0 && p.paginas[p.paginas.length - 1][1] === 25 && p.paginas.every((x, i) => i === 0 || x[0] === p.paginas[i - 1][1]))
  chk('… ninguna hoja se pasa del alto (con el final en la última)', p.paginas.every(([d, h], i) => 40 + 9 * (h - d) + (i === p.paginas.length - 1 ? 50 : 15) <= S.ALTO_UTIL_A4_MM))
  chk('… con 25 renglones de 9 mm: 2 hojas', p.paginas.length === 2)
  // Una hoja que sigue reserva lugar para "Sigue en la hoja…" (15 mm): de 30
  // renglones de 9 mm entran 25 (40 + 225 + 15 = 280), no 26 (sin reservar).
  const treinta = S.planHoja({ copiaEntera: 400, fijo: 40, final: 50, intermedio: 15, filas: Array(30).fill(9) })
  chk('… la hoja que sigue reserva lugar para "Sigue en la hoja…"', treinta.paginas[0][1] === 25)
  // 22 renglones de 9 mm: con el final no entran (288 mm), con "sigue" sí
  // (253): igual la final se queda con al menos uno, y el total y las firmas.
  const justo = S.planHoja({ copiaEntera: 300, fijo: 40, final: 50, intermedio: 15, filas: Array(22).fill(9) })
  chk('si con el final no entra lo último, pasa a otra hoja', justo.paginas.length === 2 && justo.paginas[0][1] === 21 && justo.paginas[1][1] === 22)
  chk('… y 21 renglones (279 mm con el final) van en UNA', S.planHoja({ copiaEntera: 300, fijo: 40, final: 50, intermedio: 15, filas: Array(21).fill(9) }).paginas.length === 1)
  const enorme = S.planHoja({ copiaEntera: 999, fijo: 40, final: 50, intermedio: 15, filas: [300, 5] })
  chk('un renglón más alto que una hoja igual va (nunca se pierde)', enorme.paginas.length === 2 && enorme.paginas[0][1] === 1)
  const h = S.htmlHoja({ ...ORDEN, renglones: Array.from({ length: 3 }, () => ORDEN.renglones[0]) }, { plan: { modo: 'entera', paginas: [[0, 2], [2, 3]] } })
  chk('en hojas enteras: cada copia en sus hojas, sin línea punteada', /rh-hoja rh-hoja--entera/.test(h) && (h.match(/class="rh-pagina"/g) || []).length === 4 && !/rh-corte/.test(h))
  chk('"ORIGINAL · HOJA 1 DE 2" … "DUPLICADO · HOJA 2 DE 2"', /ORIGINAL · HOJA 1 DE 2/.test(h) && /ORIGINAL · HOJA 2 DE 2/.test(h) && /DUPLICADO · HOJA 1 DE 2/.test(h) && /DUPLICADO · HOJA 2 DE 2/.test(h) &&
    h.indexOf('ORIGINAL · HOJA 2 DE 2') < h.indexOf('DUPLICADO · HOJA 1 DE 2'))
  const [p1, p2] = h.split('class="rh-pagina"').slice(1)
  chk('la primera hoja: sus 2 renglones y "Sigue en la hoja 2."', (p1.match(/<tr class="rh-fila/g) || []).length === 2 && /Sigue en la hoja 2\./.test(p1) && !/TOTAL DE CAJAS/.test(p1) && !/rh-firma/.test(p1))
  chk('la última: su renglón, el total y las firmas', (p2.match(/<tr class="rh-fila/g) || []).length === 1 && /TOTAL DE CAJAS/.test(p2) && /rh-firma">FIRMA</.test(p2))
  chk('la leyenda en cada hoja', (h.match(/No válido como factura/g) || []).length === 4)
  chk('una hoja nueva empieza en otra página', /\.rh-pagina \+ \.rh-pagina \{[^}]*break-before: page/.test(S.ESTILOS_HOJA))
  chk('cuántas páginas: media = 1; enteras = hojas × copias', S.paginasHoja({ modo: 'media' }) === 1 && S.paginasHoja({ modo: 'entera', paginas: [[0, 2], [2, 3]] }) === 4)
  chk('imprimir mide la hoja antes (armarHoja), en la Carga', /async function imprimirOrden[\s\S]{0,200}await armarHoja\(document\.getElementById\('rt-impresion'\)/.test(fs.readFileSync(ARCHIVO, 'utf8')))
  chk('el PDF usa la misma medición', /plan = planHoja\(await medirHoja\(orden, \{ conPrecios \}\)\)/.test(comun) && /copias: COPIAS_PDF, plan/.test(comun))
}

// ── El texto para compartir, sin precios ───────────────────────────────────
{
  const S = nuevo()
  const t = S.textoOrden(ORDEN)
  chk('el texto dice el código y la empresa', /^Orden de retiro N-0012 · Cucuruchos Nuss/.test(t))
  chk('el cliente y el transporte', /Cliente: ANATOLIA SRL/.test(t) && /Transporte: Expreso Norte/.test(t))
  chk('cada renglón con sus cajas y lotes', /- 10 cajas · Cucurucho grande · Caja x 100 · Sin cono \(lotes 7030-1 \(6\) · 7031-2 \(4\)\)/.test(t))
  chk('el total de cajas', /Total: 15 cajas/.test(t))
  chk('SIN precios', !/\$|precio|30\.000|45\.000/i.test(t))
  chk('anulada lo dice', /ANULADA/.test(S.textoOrden({ ...ORDEN, estado: 'anulada' })))
}

// ── El PDF y el mail ───────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('el nombre del PDF: "Orden N-0012 - <cliente>.pdf"', S.nombreArchivoPdf(ORDEN) === 'Orden N-0012 - Distribuidora Anatolia.pdf')
  chk('sin caracteres prohibidos en un archivo', S.nombreArchivoPdf({ codigo: 'D-0001', cliente: { nombre: 'A/B: "C"?' } }) === 'Orden D-0001 - A B C.pdf')
  chk('el asunto: "Orden de retiro N-0012 · <empresa>"', S.asuntoMail(ORDEN) === 'Orden de retiro N-0012 · Cucuruchos Nuss')
  const m = S.urlMailto('compras@anatolia.com', ORDEN)
  chk('el mailto va al mail del cliente', m.startsWith('mailto:compras%40anatolia.com?subject='))
  chk('con el asunto codificado', m.includes(encodeURIComponent('Orden de retiro N-0012 · Cucuruchos Nuss')))
  chk('y el aviso de adjuntar el PDF', decodeURIComponent(m.split('&body=')[1]).includes('Va adjunta en PDF'))
  chk('un mail inválido no se usa (va sin destinatario)', S.urlMailto('no es un mail', ORDEN).startsWith('mailto:?subject=') && S.urlMailto('a@b.co?cc=x@y.z', ORDEN).startsWith('mailto:?subject='))
  chk('las librerías del PDF salen de cdnjs', S.LIBRERIAS_PDF.every(u => u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/')) && S.LIBRERIAS_PDF.some(u => /jspdf/.test(u)) && S.LIBRERIAS_PDF.some(u => /html2canvas/.test(u)))
  chk('el PDF lleva UNA sola copia, el original', JSON.stringify(S.COPIAS_PDF) === '["ORIGINAL"]' && /copias: COPIAS_PDF/.test(comun))
}

// Enviar, con un navegador falso: comparte el PDF si puede; si no, descarga
// y abre el mail.
function conPdfFalso(S) {
  S.__win.html2canvas = async () => ({ width: 1000, height: 700, toDataURL: () => 'data:image/jpeg;base64,' })
  S.__win.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF'], { type: 'application/pdf' }) } }
  // Las librerías "ya cargadas": cargarScript encuentra su <script>.
  S.__doc.querySelector = (sel) => /data-lib=/.test(sel) ? {} : null
}
{
  const S = nuevo()
  conPdfFalso(S)
  let compartido = null
  S.__setNav({ canShare: ({ files }) => Array.isArray(files) && files.length === 1, share: async (d) => { compartido = d } })
  esperas.push(S.enviarOrden(ORDEN, { conPrecios: false, email: 'compras@anatolia.com' }).then(r => {
    chk('si el dispositivo comparte archivos, se comparte el PDF', r.modo === 'compartido' && compartido && compartido.files.length === 1)
    chk('el archivo compartido se llama como la orden y es PDF', compartido.files[0].name === 'Orden N-0012 - Distribuidora Anatolia.pdf' && compartido.files[0].type === 'application/pdf')
  }))
}
{
  const S = nuevo()
  conPdfFalso(S)
  S.__setNav({})
  esperas.push(S.enviarOrden(ORDEN, { conPrecios: false, email: 'compras@anatolia.com' }).then(r => {
    chk('si no comparte archivos, se descarga', r.modo === 'descargado' && S.__llamadas.clicks.some(a => a.download === 'Orden N-0012 - Distribuidora Anatolia.pdf'))
    chk('y se abre el mail al cliente', /^mailto:compras%40anatolia\.com\?subject=/.test(S.__win.location.href) && r.conMail === true)
  }))
}
{
  const S = nuevo()
  S.__doc.querySelector = () => null
  S.__doc.head.appendChild = (s) => { setTimeout(() => s.onerror && s.onerror(), 0) }
  esperas.push(S.enviarOrden(ORDEN, {}).then(() => chk('sin librerías, falla', false), (err) =>
    chk('si no baja la librería, el error lo dice (y no se inventa un PDF)', /No se pudo bajar la librería del PDF/.test(err.message))))
}
{
  const S = nuevo()
  let dado = null
  S.__setNav({ share: async (d) => { dado = d } })
  esperas.push(S.compartirTextoOrden(ORDEN).then(r => {
    chk('Compartir manda el texto de la orden', r.modo === 'compartido' && dado.text === S.textoOrden(ORDEN))
  }))
  const T = nuevo()
  let copiado = null
  T.__setNav({ clipboard: { writeText: async (t) => { copiado = t } } })
  esperas.push(T.compartirTextoOrden(ORDEN).then(r => chk('sin share, se copia', r.modo === 'copiado' && copiado === T.textoOrden(ORDEN))))
}

// ── Los renglones de INSUMOS (materia prima, cajas, bolsas de reventa) ─────
const MIXTA = {
  ...ORDEN, total: 47500,
  renglones: [
    ORDEN.renglones[0],
    { esInsumo: true, producto: 'Harina 000', marca: 'Molino Cañuelas', cantidad: 25.5, unidad: 'kg', lotes: [{ lote: 'H-10', cantidad: 25.5 }], precio: 100, subtotal: 2550 },
    { esInsumo: true, producto: 'Caja N°1', marca: null, cantidad: 300, unidad: 'un', lotes: [], precio: null, subtotal: null },
  ],
}
{
  const S = nuevo()
  const h = S.htmlHoja(MIXTA, { conPrecios: false })
  chk('la hoja muestra el insumo con su nombre y marca', /Harina 000 · Molino Cañuelas/.test(h))
  chk('con su cantidad y su unidad, no en cajas', /rh-num rh-cajas">25,5 kg</.test(h) && /rh-num rh-cajas">300 un\.</.test(h))
  chk('los decimales de los kilos con coma y las unidades enteras', !/25\.5/.test(h))
  chk('los insumos no suman al total de cajas: van aparte, por unidad', /rh-cajas">10<\/td><td colspan="2" class="rh-total__rotulo">TOTAL DE CAJAS <span class="rh-total__insumos">\+ 25,5 kg \+ 300 un\.<\/span>/.test(h))
  chk('el lote del insumo (uno solo: sin la cantidad repetida)', /<td class="rh-lote">H-10<\/td>/.test(h))
  chk('un insumo no se cuenta en cajas', /<tr class="rh-fila rh-insumo">(?:(?!<\/tr>).)*rh-cajas">25,5 kg</.test(h))
  chk('sin precios aunque el insumo los traiga', !/PRECIO|SUBTOTAL|\$|2\.550/.test(h))
  const hp = S.htmlHoja(MIXTA, { conPrecios: true })
  chk('con precios, el insumo va por su unidad', /\$\s100,00 \/ kg/.test(hp) && /\$\s2\.550,00/.test(hp))
  chk('un insumo sin precio dice "—", nunca $ 0,00', /<td class="rh-producto">Caja N°1<\/td>(?:(?!<\/tr>).)*<td class="rh-num rh-plata">—<\/td><td class="rh-num rh-plata">—<\/td><\/tr>/.test(hp) && !/\$\s0,00/.test(hp))
  chk('con insumos, el encabezado del precio es genérico', /<th class="rh-num">PRECIO<\/th>/.test(hp))
  const sinInsumos = S.htmlHoja(ORDEN, { conPrecios: true })
  chk('sin insumos el precio es "PRECIO X CAJA"', /PRECIO X CAJA/.test(sinInsumos) && !/<th class="rh-num">PRECIO<\/th>/.test(sinInsumos) && /rh-total__plata">\$\s45\.000,00</.test(sinInsumos))
  chk('el total de unidades cuenta solo los productos', S.totalUnidadesOrden(MIXTA) === 1000)
  const t = S.textoOrden(MIXTA)
  chk('el texto para compartir lleva el insumo con su cantidad', /- 25,5 kg · Harina 000 · Molino Cañuelas \(lotes H-10 \(25,5 kg\)\)/.test(t) && /- 300 un\. · Caja N°1/.test(t))
  chk('y el total dice cuántos renglones de insumos', /Total: 10 cajas y 2 renglones de materia prima e insumos/.test(t))
  chk('el texto nunca lleva precios', !/\$|100,00|2\.550/.test(t))
  chk('una cantidad ausente es "—", nunca "0 kg"', S.cantidadInsumoHoja(null, 'kg') === '—' && S.cantidadInsumoHoja('', 'kg') === '—')
  chk('lo que se cuenta de a unidades va sin decimales', S.decimalesDeUnidad('un') === 0 && S.cantidadInsumoHoja(12.4, 'un') === '12 un.' && S.decimalesDeUnidad('lt') === 3)
  chk('kilos hasta 3 decimales', S.cantidadInsumoHoja(1.2346, 'kg') === '1,235 kg' && S.cantidadInsumoHoja(1500, 'kg') === '1.500 kg')
}

// ── HTML malicioso en la hoja y en el texto ─────────────────────────────────
{
  const S = nuevo()
  const mala = {
    codigo: marca('codigo'), estado: 'confirmada', cargadaEn: '2026-09-26T17:32:00Z', cargadaPor: marca('cargo'),
    transporte: marca('transporte'), observaciones: marca('obs'), moneda: 'ARS', total: 1,
    empresa: { nombre: marca('emp-nombre'), razon_social: marca('emp-rs'), cuit: marca('emp-cuit'), domicilio: marca('emp-dom'), telefono: marca('emp-tel'), logo_url: 'logo-taller.png' },
    cliente: { nombre: marca('cli-nombre'), razon_social: marca('cli-rs'), cuit: marca('cli-cuit'), domicilio: marca('cli-dom'), localidad: marca('cli-loc') },
    renglones: [{ producto: marca('producto'), presentacion: marca('presentacion'), cono: marca('cono'), cajas: 1, unidades: 1, lotes: [{ lote: marca('lote'), cajas: 1 }], precio: 1, subtotal: 1 }],
  }
  chequearMarcas(chk, 'hoja con precios', S.htmlHoja(mala, { conPrecios: true }),
    // (El diseño del 07/10/2026 muestra del cliente el nombre y la localidad.)
    ['codigo', 'cargo', 'transporte', 'obs', 'emp-nombre', 'emp-rs', 'emp-cuit', 'emp-dom', 'emp-tel', 'cli-nombre', 'cli-loc', 'producto', 'presentacion', 'cono', 'lote'])
  const malaInsumo = { ...mala, renglones: [{ esInsumo: true, producto: marca('ins-nombre'), marca: marca('ins-marca'), cantidad: 3, unidad: marca('ins-unidad'), lotes: [{ lote: marca('ins-lote'), cantidad: 1 }], precio: 1, subtotal: 1 }] }
  chequearMarcas(chk, 'hoja con un insumo', S.htmlHoja(malaInsumo, { conPrecios: true }), ['ins-nombre', 'ins-marca', 'ins-unidad', 'ins-lote'])
  chequearMarcas(chk, 'el rótulo de la copia', S.htmlHoja(mala, { copias: [marca('rotulo')] }), ['rotulo'])
  // El sello de anulada con su detalle, y el faltante (un lote SIN STOCK).
  const anul = { ...mala, estado: 'anulada', anuladaPor: marca('anul-por'), anuladaMotivo: marca('anul-motivo'),
    renglones: [{ producto: marca('f-producto'), presentacion: 'Caja', cono: 'Sin cono', cajas: 5, unidades: 5, lotes: [{ lote: 'SIN STOCK', cajas: 5 }] }] }
  chequearMarcas(chk, 'hoja anulada con faltante', S.htmlHoja(anul), ['anul-por', 'anul-motivo', 'f-producto'])
}

// ── El faltante y el sello de anulada ──────────────────────
{
  const S = nuevo()
  const conFaltante = { ...ORDEN, renglones: [{ producto: 'Cucurucho mini', presentacion: 'Caja x 320', cono: 'CASERATO', cajas: 50, unidades: 16000, lotes: [{ lote: '7031', cajas: 20 }, { lote: '7038', cajas: 16 }, { lote: 'SIN STOCK', cajas: 14 }] }] }
  const h = S.htmlHoja(conFaltante)
  chk('lo que no estaba en stock se dice "faltan N" en los lotes', /7031 ×20 · 7038 ×16 · faltan 14/.test(h))
  chk('y abajo, el faltante pendiente de revisión', /<strong>Faltante:<\/strong> 14 cajas de Cucurucho mini · Caja x 320 · CASERATO, pendiente de revisión\./.test(h))
  chk('sin faltante no se nombra', !/Faltante/.test(S.htmlHoja(ORDEN)))
  const a = S.htmlHoja({ ...ORDEN, estado: 'anulada', anuladaEn: '2026-09-28', anuladaPor: 'Pablo Nuss', anuladaMotivo: 'el cliente canceló el retiro' })
  chk('el sello de ANULADA lleva fecha, quién y motivo', /rh-anulada__detalle">28\/09\/2026 · Pablo Nuss · el cliente canceló el retiro</.test(a))
  chk('sin esos datos el sello va solo', !/rh-anulada__detalle/.test(S.htmlHoja({ ...ORDEN, estado: 'anulada' })))
  chk('el sello va en negro (la hoja es blanco y negro)', /\.rh-anulada \{[^}]*border: 6px solid #000/.test(S.ESTILOS_HOJA))
}

fin()
