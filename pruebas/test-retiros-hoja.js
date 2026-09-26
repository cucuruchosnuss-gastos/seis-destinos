// LA HOJA de una orden de retiro (js/retiros-comun.js, 26/09/2026): la que se
// imprime (A4 con dos copias), la que va en el PDF (una copia, la del cliente)
// y el texto para compartir. La usan la Carga (sin precios) y Administración
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
  chk('arriba "Original — Cliente" y abajo "Duplicado — Depósito"', h.indexOf('Original — Cliente') > 0 && h.indexOf('Duplicado — Depósito') > h.indexOf('Original — Cliente'))
  chk('con la línea de corte entre las dos', (h.match(/class="rh-corte"/g) || []).length === 1 && h.indexOf('rh-corte') > h.indexOf('Original — Cliente') && h.indexOf('rh-corte') < h.indexOf('Duplicado — Depósito'))
  chk('el logo de ESA empresa, en cada copia', (h.match(/src="\.\.\/logo-cucuruchos-nuss\.png"/g) || []).length === 2)
  chk('la razón social, el CUIT, el domicilio y el teléfono de la empresa', /NUSS SRL/.test(h) && /CUIT 30700000001/.test(h) && /Ruta 9 km 700/.test(h) && /Tel\. 351 555-0000/.test(h))
  chk('el CUIT va tal cual, sin puntos de miles', !/30\.700\.000\.001/.test(h))
  chk('el código bien grande', /class="rh-codigo">N-0012</.test(h))
  chk('fecha y hora de Argentina', /26\/09\/2026 14:32/.test(h))
  chk('el cliente con razón social, CUIT y domicilio', /ANATOLIA SRL/.test(h) && /CUIT 30712345678/.test(h) && /Av\. Siempreviva 742, Córdoba/.test(h))
  chk('el transporte', /Expreso Norte/.test(h))
  chk('los renglones: producto, cono, presentación, cajas, unidades y lotes', /Cucurucho grande/.test(h) && /LOLO/.test(h) && /Caja x 100 con cono/.test(h) && /1\.000/.test(h) && /7030-1 \(6\) · 7031-2 \(4\)/.test(h))
  chk('el total de cajas', /rh-num rh-cajas">15</.test(h))
  chk('las observaciones', /Frágil/.test(h))
  chk('quién la cargó', /Cargó<\/span> Emanuel Romero/.test(h))
  chk('"Recibí conforme" con firma, aclaración y DNI', /Recibí conforme/.test(h) && />Firma</.test(h) && />Aclaración</.test(h) && />DNI</.test(h))
  chk('la leyenda: no válido como factura', (h.match(/Documento interno\. No válido como factura\./g) || []).length === 2)
  chk('SIN PRECIOS aunque la orden los traiga', !/Precio|Subtotal|\$|3\.000,00|45\.000/.test(h))
  chk('sin precios por defecto (sin pasar la opción)', !/Precio x caja/.test(S.htmlHoja(ORDEN)))
  chk('conPrecios tiene que ser true, no algo "parecido"', !/Precio x caja/.test(S.htmlHoja(ORDEN, { conPrecios: 'si' })))
  chk('una orden confirmada no dice ANULADA', !/ANULADA/.test(h))
}

// ── CON precios (la de Administración) ──────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlHoja(ORDEN, { conPrecios: true })
  chk('con precios: la columna Precio x caja y Subtotal', /Precio x caja/.test(h) && /Subtotal/.test(h))
  chk('el subtotal por renglón', /\$ 30\.000,00/.test(h) && /\$ 15\.000,00/.test(h))
  chk('y el total', /rh-total">\$ 45\.000,00/.test(h))
  const sin = S.htmlHoja({ ...ORDEN, total: null, renglones: [{ ...ORDEN.renglones[0], precio: null, subtotal: null }] }, { conPrecios: true })
  chk('un precio ausente dice "—", nunca "$ 0,00"', !/0,00/.test(sin) && /rh-total">—</.test(sin))
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
  chk('los logos tienen un alto máximo parejo', /\.rh-logo \{[^}]*max-height: 14mm/.test(S.ESTILOS_HOJA))
  chk('A4 con márgenes de impresión', /@page \{ size: A4/.test(S.ESTILOS_HOJA))
  chk('la hoja no usa el naranja ni colores de la app', !/#C2410C|var\(--naranja|--verde|--bordo/i.test(S.ESTILOS_HOJA))
  chk('el logo va a color (sin filtro a gris)', !/grayscale/.test(S.ESTILOS_HOJA))
}

// ── Doce renglones entran en una página ─────────────────────────────────────
// MEDIDO el 26/09/2026 en Chromium, con la hoja renderizada a 194 mm de ancho
// (A4 con 8 mm de margen) y una orden de 12 renglones con observaciones: el
// contenido de cada copia mide 123 mm; con el alto mínimo, 134 mm cada una y
// 273 mm las dos con el corte, de los 281 mm útiles. Esto fija los valores del
// CSS que sostienen esa medición: si alguien los agranda, hay que volver a medir.
{
  const S = nuevo()
  chk('la copia tiene un alto mínimo de media hoja (134 mm)', /\.rh-copia \{[^}]*min-height: 134mm/.test(S.ESTILOS_HOJA))
  chk('dos copias de 134 mm y el corte entran en 281 mm', 2 * 134 + 5 <= 281)
  chk('una copia no se corta entre páginas', /\.rh-copia \{[^}]*break-inside: avoid/.test(S.ESTILOS_HOJA))
  chk('las filas de la tabla son bajas (0,45 mm de relleno, 8 pt)', /\.rh-tabla th, \.rh-tabla td \{[^}]*padding: 0\.45mm 1\.2mm;[^}]*font-size: 8pt/.test(S.ESTILOS_HOJA))
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
  chk('el PDF lleva UNA sola copia, la del cliente', JSON.stringify(S.COPIAS_PDF) === '["Original — Cliente"]' && /copias: COPIAS_PDF/.test(comun))
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
    ['codigo', 'cargo', 'transporte', 'obs', 'emp-nombre', 'emp-rs', 'emp-cuit', 'emp-dom', 'emp-tel', 'cli-nombre', 'cli-rs', 'cli-cuit', 'cli-dom', 'cli-loc', 'producto', 'presentacion', 'cono', 'lote'])
  chk('el rótulo de la copia también se escapa', /&lt;b data-xss=&quot;rotulo&quot;&gt;/.test(S.htmlHoja(mala, { copias: [marca('rotulo')] })))
}

fin()
