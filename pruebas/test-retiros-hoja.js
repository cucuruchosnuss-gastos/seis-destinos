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
// Las pruebas de TEXTO miran la hoja sin los <span class="rh-n"> ni los
// data-col de los números (15/10/2026); las de los números, la cruda.
const plano = (h) => String(h).replace(/<span class="rh-n">([^<]*)<\/span>/g, '$1').replace(/ data-col="[a-z]+"/g, '')
const nuevo = () => {
  const S = construirRetiros(ARCHIVO)
  const cruda = S.htmlHoja
  S.htmlHojaCruda = cruda
  S.htmlHoja = (...x) => plano(cruda(...x))
  return S
}

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
  chk('el logo en un círculo (56 px desde el 15/10/2026)', /\.rh-logo \{[^}]*width: 56px; height: 56px; border-radius: 50%/.test(S.ESTILOS_HOJA))
  chk('A4 con márgenes de impresión', /@page \{ size: A4; margin: 8mm/.test(S.ESTILOS_HOJA))
  chk('la hoja no usa el naranja ni colores de la app', !/#C2410C|var\(--naranja|--verde|--bordo/i.test(S.ESTILOS_HOJA))
  chk('SOLO NEGRO: ningún color que no sea #000 o #fff', (S.ESTILOS_HOJA.match(/#[0-9a-f]{3,6}\b/gi) || []).every(c => /^#(000|000000|fff|ffffff)$/i.test(c)))
  chk('el logo pasa a blanco y negro', /\.rh-logo img \{[^}]*grayscale\(1\)/.test(S.ESTILOS_HOJA))
  chk('la letra Archivo de Google Fonts, con respaldo sans-serif', /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo/.test(S.ESTILOS_HOJA) && /font-family: Archivo,[^;]*sans-serif/.test(S.ESTILOS_HOJA))
  chk('ninguna línea de menos de 1 px', !/(border[a-z-]*):\s*0\.\d+px/.test(S.ESTILOS_HOJA) && !/0\.\d+mm solid/.test(S.ESTILOS_HOJA))
  chk('el texto nunca se corta con "…" (sin ellipsis ni nowrap en el producto)', !/text-overflow: ellipsis/.test(S.ESTILOS_HOJA) && /\.rh-tabla td \{[^}]*white-space: normal/.test(S.ESTILOS_HOJA))
}

// ── LOS TAMAÑOS (15/10/2026, caso N-0014: ~22 % más chicos que el diseño del
// 07/10, para que entren más renglones en cada mitad) ─────────────────────────
// La medida de verdad (que entre en la A4, que no se corte nada, que ningún
// importe baje de renglón) la hace e2e/28-hoja-retiro.spec.js en Chromium.
{
  const S = nuevo()
  const css = S.ESTILOS_HOJA
  const px = (re) => { const m = css.match(re); return m ? Number(m[1]) : NaN }
  chk('la media hoja: dos copias y la línea punteada en los 281 mm útiles', 2 * S.ALTO_MEDIA_HOJA_MM + 7.4 <= S.ALTO_UTIL_A4_MM && /\.rh-hoja--media \.rh-copia \{ height: \$\{?|\.rh-hoja--media \.rh-copia \{ height: 136mm/.test(css))
  chk('la línea punteada de 1,5 px', /\.rh-corte \{[^}]*border-top: 1\.5px dotted #000/.test(css))
  // Lo que era (07/10) → lo que es: entre 20 y 25 % más chico.
  const antes = {
    'el cliente': [26, px(/\.rh-cliente__nombre \{ font-size: ([\d.]+)px/)],
    'el producto y el lote': [16, px(/\.rh-tabla td \{ font-size: ([\d.]+)px/)],
    'las cajas': [22, px(/\.rh-tabla td\.rh-cajas \{ font-size: calc\(([\d.]+)px/)],
    'el precio': [14, px(/td\[data-col="precio"\] \{ font-size: calc\(([\d.]+)px/)],
    'el subtotal': [14, px(/td\[data-col="subtotal"\] \{ font-size: calc\(([\d.]+)px/)],
    'el total en pesos': [16, px(/td\[data-col="total"\] \{ font-size: calc\(([\d.]+)px/)],
    'TOTAL DE CAJAS': [14, px(/\.rh-total__rotulo \{ font-size: ([\d.]+)px/)],
    '"ORDEN DE PEDIDO"': [23, px(/\.rh-titulo__grande \{ font-size: ([\d.]+)px/)],
    'el número de orden': [28, px(/\.rh-codigo \{ font-size: ([\d.]+)px/)],
    'la letra de la hoja': [14, px(/\.rh-hoja \{[^}]*font-size: ([\d.]+)px/)],
    'el encabezado de la tabla': [12, px(/\.rh-tabla th \{ font-size: ([\d.]+)px/)],
    'la leyenda': [12, px(/\.rh-legal \{[^}]*font-size: ([\d.]+)px/)],
  }
  for (const [que, [viejo, nuevo]] of Object.entries(antes)) {
    const r = nuevo / viejo
    chk(`${que}: entre 20 y 25 % más chico (${viejo} → ${nuevo} px)`, r >= 0.75 && r <= 0.8, String(r))
  }
  chk('la cabecera de unos 56 px y el logo en un círculo de 56 px', /\.rh-cab \{[^}]*min-height: 56px/.test(css) && /\.rh-logo \{[^}]*width: 56px; height: 56px; border-radius: 50%/.test(css))
  chk('"ORDEN DE PEDIDO" en 800, sin fondo', /\.rh-titulo__grande \{ font-size: [\d.]+px; font-weight: 800/.test(css) && !/\.rh-titulo[^{]*\{[^}]*background/.test(css))
  chk('el recuadro del número con borde negro de 2 px', /\.rh-orden \{ width: 104px;[^}]*border: 2px solid #000/.test(css))
  chk('el cliente en negrita, con la línea negra de 2 px', /\.rh-cliente__nombre \{ font-size: [\d.]+px; font-weight: 800/.test(css) && /\.rh-cliente \{[^}]*border-bottom: 2px solid #000/.test(css))
  // Anchos FIJOS (el producto es el único que se estira).
  chk('CAJAS, LOTE, PRECIO X CAJA y SUBTOTAL con ancho fijo', /\.rh-col-cajas \{ width: 56px; \}/.test(css) && /\.rh-col-lote \{ width: 104px; \}/.test(css) &&
    /\.rh-col-precio \{ width: 100px; \}/.test(css) && /\.rh-col-subtotal \{ width: 116px; \}/.test(css) && /\.rh-col-producto \{ width: auto; \}/.test(css) && /\.rh-tabla \{[^}]*table-layout: fixed/.test(css))
  chk('la tabla tiene sus columnas (precio y subtotal, cada una la suya)', /<col class="rh-col-precio"><col class="rh-col-subtotal">/.test(S.htmlHojaCruda(ORDEN, { conPrecios: true })))
  chk('las líneas de la tabla de 1 px', /\.rh-tabla td \{[^}]*border-bottom: 1px solid #000/.test(css))
  chk('las firmas con su línea de 1 px', /\.rh-firma \{ border-top: 1px solid #000;[^}]*font-weight: 700/.test(css))
  chk('la leyenda centrada, en un renglón (ENTERA)', /\.rh-legal \{[^}]*text-align: center; white-space: nowrap/.test(css))
  chk('un renglón no se corta entre páginas', /\.rh-tabla tr \{ break-inside: avoid/.test(css))
  chk('el producto SÍ puede ir en dos renglones', /\.rh-tabla td \{[^}]*white-space: normal/.test(css) && !/\.rh-producto \{[^}]*nowrap/.test(css))
}

// ── 1) LOS NÚMEROS NUNCA SE PARTEN (15/10/2026, caso N-0014) ────────────────
// "$ 1.007.613, / 60" y "$ 2.220.1 / 40,16": la regla general de la celda
// (white-space: normal) le ganaba a la de los importes. Ahora cada número va
// en un <span class="rh-n"> que no baja de renglón, con tabular-nums, y si no
// entra se achica la letra de esa columna.
{
  const S = nuevo()
  const css = S.ESTILOS_HOJA
  const N0014 = {
    ...ORDEN, codigo: 'N-0014', total: 2220140.16, cliente: { nombre: 'FERNANDEZ RICARDO' },
    renglones: [
      { producto: 'Cucuruchón Mini', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 42, unidades: 4200, lotes: [{ lote: '6235-1', cajas: 42 }], precio: 23990.8, subtotal: 1007613.6 },
      { producto: 'Cucuruchón Grande', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 21, unidades: 2100, lotes: [{ lote: '6241-2', cajas: 1 }, { lote: 'SIN STOCK', cajas: 20 }], precio: 21150.62, subtotal: 444163.02 },
      { producto: 'Cono dulce 35 x4', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 21, unidades: 2100, lotes: [{ lote: 'INICIAL', cajas: 21 }], precio: 36588.74, subtotal: 768363.54 },
    ],
  }
  const h = S.htmlHojaCruda(N0014, { conPrecios: true })
  chk('N-0014: el subtotal entero en UN bloque', /<td class="rh-num rh-plata" data-col="subtotal"><span class="rh-n">\$\s1\.007\.613,60<\/span><\/td>/.test(h))
  chk('N-0014: el precio entero en UN bloque', /<td class="rh-num rh-plata" data-col="precio"><span class="rh-n">\$\s23\.990,80<\/span><\/td>/.test(h))
  chk('N-0014: el total entero en UN bloque', /<td class="rh-num rh-plata rh-total__plata" data-col="total"><span class="rh-n">\$\s2\.220\.140,16<\/span><\/td>/.test(h))
  chk('las cajas (y el total de cajas) también', /data-col="cajas"><span class="rh-n">42<\/span>/.test(h) && /data-col="cajas"><span class="rh-n">84<\/span><\/td><td colspan="2" class="rh-total__rotulo">/.test(h))
  chk('un lote no se parte; entre lotes sí', /<td class="rh-lote"><span class="rh-n">6235-1<\/span><\/td>/.test(h) &&
    /<td class="rh-lote"><span class="rh-n">7030-1 ×6<\/span> · <span class="rh-n">7031-2 ×4<\/span><\/td>/.test(S.htmlHojaCruda(ORDEN)))
  chk('el bloque del número no baja de renglón y usa números de ancho fijo', /\.rh-tabla td \.rh-n \{[^}]*white-space: nowrap;[^}]*font-variant-numeric: tabular-nums/.test(css))
  chk('… y no se corta en ningún carácter', /\.rh-tabla td \.rh-n \{[^}]*overflow-wrap: normal; word-break: keep-all/.test(css))
  // La regla de la celda numérica le gana a la general (.rh-tabla td): misma
  // tabla, más específica. Antes era solo .rh-plata (perdía).
  chk('la celda de números: nowrap con más peso que la regla general', /\.rh-tabla td\.rh-num \{ white-space: nowrap; overflow-wrap: normal; \}/.test(css))
  chk('precio, subtotal y total se achican por columna (--rh-esc-…)', ['precio', 'subtotal', 'total'].every(c => new RegExp(`td\\[data-col="${c}"\\] \\{ font-size: calc\\([\\d.]+px \\* var\\(--rh-esc-${c}, 1\\)\\)`).test(css)))
  chk('las cajas también', /td\.rh-cajas \{ font-size: calc\([\d.]+px \* var\(--rh-esc-cajas, 1\)\)/.test(css))
  chk('las columnas de números', JSON.stringify(S.COLUMNAS_NUMERO_HOJA) === '["cajas","cantidad","precio","subtotal","total"]')
  // La cantidad de un insumo ("1.250,5 kg") se achica aparte: no achica las cajas.
  const conInsumo = S.htmlHojaCruda({ ...ORDEN, renglones: [{ esInsumo: true, producto: 'Harina', cantidad: 1250.5, unidad: 'kg', lotes: [] }, ORDEN.renglones[0]] })
  chk('la cantidad de un insumo es su propia columna de números', /<tr class="rh-fila rh-insumo"><td class="rh-num rh-cajas" data-col="cantidad"><span class="rh-n">1\.250,5 kg<\/span>/.test(conInsumo) &&
    /<tr class="rh-fila"><td class="rh-num rh-cajas" data-col="cajas"><span class="rh-n">10<\/span>/.test(conInsumo))
  chk('… con su escala', /tr\.rh-insumo td\.rh-cajas \{ font-size: calc\([\d.]+px \* var\(--rh-esc-cantidad, 1\)\)/.test(css))
  // Las escalas: solo números entre 0,4 y 1, solo columnas conocidas.
  chk('escalas: se quedan las que achican', JSON.stringify(S.escalasHoja({ precio: 0.8, subtotal: 1, total: 'x', otra: 0.5, cajas: 0.1 })) === '{"cajas":0.4,"precio":0.8}')
  chk('escalas: nada raro entra al estilo', JSON.stringify(S.escalasHoja({ precio: '0.5;background:red', total: null })) === '{}' && JSON.stringify(S.escalasHoja(null)) === '{}')
  chk('escalas: vacía, cero o negativa no achican', JSON.stringify(S.escalasHoja({ precio: '', subtotal: 0, total: -1, cajas: undefined })) === '{}')
  chk('escalas: se redondean para abajo (nunca más grande de lo medido)', S.escalasHoja({ total: 0.98765 }).total === 0.987)
  const conEsc = S.htmlHojaCruda(N0014, { conPrecios: true, plan: { modo: 'media', escalas: { total: 0.9, subtotal: 0.85 } } })
  chk('la hoja achica la letra de ESAS columnas', /<div class="rh-hoja rh-hoja--media" style="--rh-esc-subtotal:0\.85;--rh-esc-total:0\.9">/.test(conEsc))
  chk('sin escalas, sin estilo', /<div class="rh-hoja rh-hoja--media">/.test(h))
  chk('el plan pasa las escalas que midió', S.planHoja({ copiaEntera: 100, escalas: { total: 0.9 } }).escalas.total === 0.9 &&
    S.planHoja({ copiaEntera: 300, fijo: 40, final: 30, intermedio: 10, filas: Array(25).fill(9), escalas: { precio: 0.7 } }).escalas.precio === 0.7)
  chk('medir mide cada columna de números (y el PDF usa la misma medición)', /escalas: medirEscalasHoja\(ultima\)/.test(comun) && /plan = planHoja\(await medirHoja\(orden, \{ conPrecios \}\)\)/.test(comun))
  // 4) y 5) en la misma orden: nada repetido, "INICIAL" no es un lote.
  const p = S.htmlHoja(N0014, { conPrecios: true })
  chk('N-0014: "Caja sin cono" sin "· sin cono" repetido', /<td class="rh-producto">Cucuruchón Mini · Caja sin cono<\/td>/.test(p) && !/sin cono · sin cono/i.test(p))
  chk('N-0014: el lote INICIAL sale como "—"', /<td class="rh-producto">Cono dulce 35 x4 · Caja sin cono<\/td><td class="rh-lote">—<\/td>/.test(p) && !/INICIAL/.test(p))
  chk('N-0014: 6241-2 ×1 (el resto todavía sin lote)', /<td class="rh-lote">6241-2 ×1<\/td>/.test(p))
}

// ── 4) "SIN CONO" / "CON CONO" NO SE REPITEN (15/10/2026, caso N-0014) ───────
{
  const S = nuevo()
  const d = (presentacion, cono) => S.descripcionHoja({ producto: 'Cucuruchón Mini', presentacion, cono })
  chk('"Caja sin cono" + sin cono: una sola vez', d('Caja sin cono', 'Sin cono') === 'Cucuruchón Mini · Caja sin cono')
  chk('"Caja con cono" + con cono: una sola vez', d('Caja con cono', 'Con cono') === 'Cucuruchón Mini · Caja con cono' && d('Media caja con cono', 'con cono') === 'Cucuruchón Mini · Media caja con cono')
  chk('mayúsculas y acentos no importan', d('CAJA SIN CONO', 'sin cono') === 'Cucuruchón Mini · CAJA SIN CONO' && d('Caja sín cono', 'Sin cono') === 'Cucuruchón Mini · Caja sín cono')
  chk('la presentación que no lo dice sigue llevando "sin cono"', d('Caja x 100', 'Sin cono') === 'Cucuruchón Mini · Caja x 100 · sin cono')
  chk('la marca del cono va siempre', d('Caja con cono', 'ASPEN') === 'Cucuruchón Mini · Caja con cono · ASPEN')
  chk('una marca que se llama parecido no se pierde', d('Caja con cono', 'Cono') === 'Cucuruchón Mini · Caja con cono · Cono')
  chk('sin cono conocido ("—"), nada', d('Caja con cono', '—') === 'Cucuruchón Mini · Caja con cono')
  chk('"con cono" en una presentación sin cono no se tapa', d('Caja sin cono', 'Con cono') === 'Cucuruchón Mini · Caja sin cono · Con cono')
  const t = S.textoOrden({ ...ORDEN, renglones: [{ producto: 'Cucuruchón Mini', presentacion: 'Caja sin cono', cono: 'Sin cono', cajas: 42, lotes: [] }] })
  chk('el texto para compartir tampoco lo repite', /- 42 cajas · Cucuruchón Mini · Caja sin cono\n/.test(t + '\n') && !/sin cono · sin cono/i.test(t))
}

// ── 5) EL LOTE "INICIAL" (el stock del corte) ────────────────────────────────
{
  const S = nuevo()
  chk('INICIAL solo: "—"', S.textoLotesHoja([{ lote: 'INICIAL', cajas: 21 }], null, 21) === '—')
  chk('en minúsculas también', S.textoLotesHoja([{ lote: 'inicial', cajas: 21 }], null, 21) === '—')
  chk('con un lote real: solo el real', S.textoLotesHoja([{ lote: 'INICIAL', cajas: 20 }, { lote: '6241-2', cajas: 1 }], null, 21) === '6241-2 ×1')
  chk('un insumo con INICIAL: "—"', S.textoLotesHoja([{ lote: 'INICIAL', cantidad: 5 }], 'kg', 5) === '—')
  chk('el texto para compartir no lo nombra', !/INICIAL|lotes/.test(S.textoOrden({ ...ORDEN, renglones: [{ producto: 'X', presentacion: 'Caja', cajas: 21, lotes: [{ lote: 'INICIAL', cajas: 21 }] }] })))
  chk('otros lotes con letras siguen yendo (no se adivina)', S.textoLotesHoja([{ lote: 'CORTE-1010', cajas: 3 }], null, 3) === 'CORTE-1010')
}

// ── 3) EL PLAN: SIEMPRE PARTIDA AL MEDIO, Y SI NO ENTRA, OTRA HOJA ────────────
{
  const S = nuevo()
  chk('si la copia entera entra en media hoja: una hoja', S.planHoja({ copiaEntera: 120, filas: [10, 10] }).modo === 'media' && !S.planHoja({ copiaEntera: 120, filas: [10, 10] }).paginas)
  chk('… justo en el borde (con 1 mm de aire), también', !S.planHoja({ copiaEntera: S.ALTO_MEDIA_HOJA_MM - 1, filas: [5] }).paginas)
  const M = { fijo: 40, final: 30, intermedio: 10 }
  const p = S.planHoja({ copiaEntera: 300, ...M, filas: Array(25).fill(9) })
  chk('si no entra: varias hojas, también partidas', p.modo === 'media' && Array.isArray(p.paginas) && p.paginas.length > 1)
  chk('… todos los renglones, en orden y sin repetir', p.paginas[0][0] === 0 && p.paginas[p.paginas.length - 1][1] === 25 && p.paginas.every((x, i) => i === 0 || x[0] === p.paginas[i - 1][1]))
  const cabe = S.ALTO_MEDIA_HOJA_MM - S.MARGEN_PLAN_MM
  chk('… ninguna mitad se pasa de la media hoja (con el final en la última)', p.paginas.every(([d, h], i) => 40 + 9 * (h - d) + (i === p.paginas.length - 1 ? 30 : 10) <= cabe))
  chk('… con 25 renglones de 9 mm: 3 hojas (9 + 9 + 7)', JSON.stringify(p.paginas) === '[[0,9],[9,18],[18,25]]')
  // 9 renglones de 9 mm: con el final no entran (151), con "sigue" sí (131):
  // igual la última se queda con al menos uno, y el total y las firmas.
  const justo = S.planHoja({ copiaEntera: 160, ...M, filas: Array(9).fill(9) })
  chk('si con el final no entra lo último, pasa a otra hoja', JSON.stringify(justo.paginas) === '[[0,8],[8,9]]')
  chk('… y 7 renglones (133 mm con el final) van en UNA', !S.planHoja({ copiaEntera: 140, ...M, filas: Array(7).fill(9) }).paginas)
  const enorme = S.planHoja({ copiaEntera: 999, ...M, filas: [300, 5] })
  chk('un renglón más alto que media hoja igual va (nunca se pierde)', JSON.stringify(enorme.paginas) === '[[0,1],[1,2]]')
  chk('sin renglones medidos, una hoja', !S.planHoja({ copiaEntera: 999, ...M, filas: [] }).paginas)
  // 1 mm de aire: lo que llena la mitad justo (135,5 de 136) pasa a otra hoja.
  chk('con 1 mm de aire: lo que llena la mitad justo pasa a otra hoja', S.planHoja({ copiaEntera: 135.5, ...M, filas: [32.75, 32.75] }).paginas?.length === 2)
  const tres = { ...ORDEN, renglones: Array.from({ length: 3 }, () => ORDEN.renglones[0]) }
  const h = S.htmlHoja(tres, { plan: { modo: 'media', paginas: [[0, 2], [2, 3]] } })
  const paginas = h.split('class="rh-pagina"').slice(1)
  chk('dos hojas, cada una partida: ORIGINAL arriba, la línea, DUPLICADO abajo', paginas.length === 2 && /rh-hoja rh-hoja--media/.test(h) && !/rh-hoja--entera/.test(h) &&
    paginas.every(pg => (pg.match(/<section class="rh-copia/g) || []).length === 2 && (pg.match(/class="rh-corte"/g) || []).length === 1 && pg.indexOf('ORIGINAL · HOJA') < pg.indexOf('rh-corte') && pg.indexOf('rh-corte') < pg.indexOf('DUPLICADO · HOJA')))
  chk('"ORIGINAL · HOJA 1 DE 2" y "DUPLICADO · HOJA 1 DE 2" en la primera; "… 2 DE 2" en la segunda',
    /ORIGINAL · HOJA 1 DE 2/.test(paginas[0]) && /DUPLICADO · HOJA 1 DE 2/.test(paginas[0]) && /ORIGINAL · HOJA 2 DE 2/.test(paginas[1]) && /DUPLICADO · HOJA 2 DE 2/.test(paginas[1]))
  chk('cada hoja repite el encabezado: cliente, N° y fecha', paginas.every(pg => (pg.match(/rh-cliente__nombre">Distribuidora Anatolia</g) || []).length === 2 &&
    (pg.match(/class="rh-codigo">N-0012</g) || []).length === 2 && (pg.match(/26\/09\/2026 14:32/g) || []).length === 2))
  chk('la primera: sus 2 renglones en cada mitad y "Sigue en la hoja 2.", sin total ni firmas',
    (paginas[0].match(/<tr class="rh-fila/g) || []).length === 4 && (paginas[0].match(/Sigue en la hoja 2\./g) || []).length === 2 && !/TOTAL DE CAJAS/.test(paginas[0]) && !/rh-firma/.test(paginas[0]))
  chk('la última: su renglón, el TOTAL (de toda la orden) y las firmas', (paginas[1].match(/<tr class="rh-fila/g) || []).length === 2 &&
    (paginas[1].match(/TOTAL DE CAJAS/g) || []).length === 2 && />30<\/td><td colspan="2" class="rh-total__rotulo">TOTAL DE CAJAS/.test(paginas[1]) && /rh-firma">FIRMA</.test(paginas[1]))
  chk('la leyenda en cada mitad de cada hoja', (h.match(/No válido como factura/g) || []).length === 4)
  chk('una hoja nueva empieza en otra página', /\.rh-pagina \+ \.rh-pagina \{[^}]*break-before: page/.test(S.ESTILOS_HOJA))
  chk('cuántas páginas: una, o las hojas del plan (las dos copias van juntas)', S.paginasHoja({ modo: 'media' }) === 1 && S.paginasHoja({ modo: 'media', paginas: [[0, 2], [2, 3]] }) === 2 && S.paginasHoja(null) === 1)
  const pdf = S.htmlHoja(tres, { copias: S.COPIAS_PDF, plan: { modo: 'media', paginas: [[0, 2], [2, 3]] } })
  chk('el PDF: el original, en sus hojas, sin la línea', (pdf.match(/class="rh-pagina"/g) || []).length === 2 && !/DUPLICADO|rh-corte/.test(pdf) && /ORIGINAL · HOJA 2 DE 2/.test(pdf))
  chk('un plan de una sola hoja no dice "HOJA 1 DE 1"', !/HOJA 1 DE 1/.test(S.htmlHoja(tres, { plan: { modo: 'media', paginas: [[0, 3]] } })))
  chk('un plan de una sola hoja no pierde renglones', (S.htmlHoja(tres, { copias: S.COPIAS_PDF, plan: { modo: 'media', paginas: [[0, 2]] } }).match(/<tr class="rh-fila/g) || []).length === 3)
  chk('imprimir mide la hoja antes (armarHoja), en la Carga', /async function imprimirOrden[\s\S]{0,200}await armarHoja\(document\.getElementById\('rt-impresion'\)/.test(fs.readFileSync(ARCHIVO, 'utf8')))
  chk('el PDF usa la misma medición', /plan = planHoja\(await medirHoja\(orden, \{ conPrecios \}\)\)/.test(comun) && /copias: COPIAS_PDF, plan/.test(comun))
  chk('medir: la última hoja y una que sigue, sin alto fijo', /rh-hoja--medir/.test(comun) && /\.rh-hoja--medir \.rh-copia \{ height: auto; min-height: 0; overflow: visible; \}/.test(S.ESTILOS_HOJA))
}

// ── El texto para compartir, sin precios ───────────────────────────────────
{
  const S = nuevo()
  const t = S.textoOrden(ORDEN)
  chk('el texto dice el código y la empresa', /^Orden de retiro N-0012 · Cucuruchos Nuss/.test(t))
  chk('el cliente y el transporte', /Cliente: ANATOLIA SRL/.test(t) && /Transporte: Expreso Norte/.test(t))
  chk('cada renglón con sus cajas y lotes', /- 10 cajas · Cucurucho grande · Caja x 100 · sin cono \(lotes 7030-1 \(6\) · 7031-2 \(4\)\)/.test(t))
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

// ── El faltante NUNCA va en la hoja (pedido del 15/10/2026, caso N-0013) ────
// La hoja la firma el cliente: muestra lo que se llevó y de qué lotes salió,
// nunca "faltan N" ni "Faltante… pendiente de revisión".
{
  const S = nuevo()
  const PROD = { producto: 'Cucuruchón Mini', presentacion: 'Caja con cono', cono: 'ASPEN', unidades: 3500 }
  const lotesDe = (h) => [...h.matchAll(/<td class="rh-lote">([^<]*)<\/td>/g)].map(m => m[1])
  const sinInternos = (txt) => !/pendiente de revisi|faltan|Faltante|SIN STOCK/i.test(txt)
  // Un lote: va solo, sin cantidad.
  const uno = S.htmlHoja({ ...ORDEN, renglones: [{ ...PROD, cajas: 35, lotes: [{ lote: '6242-2', cajas: 35 }] }] })
  chk('LOTE con un lote que cubre todo: el lote solo', lotesDe(uno)[0] === '6242-2')
  // Dos lotes (N-0013 ya conciliada): los dos, con lo de cada uno.
  const dos = S.htmlHoja({ ...ORDEN, renglones: [{ ...PROD, cajas: 35, lotes: [{ lote: '6242-2', cajas: 30 }, { lote: '6244-1', cajas: 5 }] }] })
  chk('LOTE con dos lotes: "6242-2 ×30 · 6244-1 ×5"', lotesDe(dos)[0] === '6242-2 ×30 · 6244-1 ×5')
  // Una parte sin lote todavía (N-0013 al imprimirse): solo lo conocido.
  const caso = { ...ORDEN, observaciones: '', renglones: [{ ...PROD, cajas: 35, lotes: [{ lote: '6242-2', cajas: 30 }, { lote: 'SIN STOCK', cajas: 5 }] }] }
  const parte = S.htmlHoja(caso)
  chk('LOTE con una parte sin lote: solo el lote conocido, con su cantidad', lotesDe(parte)[0] === '6242-2 ×30')
  chk('N-0013: la hoja no dice "faltan" ni "pendiente de revisión" ni "SIN STOCK"', sinInternos(parte))
  chk('N-0013: CAJAS dice 35 (lo que se llevó)', /<td class="rh-num rh-cajas">35<\/td><td class="rh-producto">/.test(parte))
  chk('N-0013: TOTAL DE CAJAS dice 35', /<tr class="rh-total"><td class="rh-num rh-cajas">35<\/td>/.test(parte))
  chk('N-0013: el PDF (una copia) tampoco', sinInternos(S.htmlHoja(caso, { copias: S.COPIAS_PDF })))
  chk('N-0013: con precios (Administración) tampoco', sinInternos(S.htmlHoja({ ...caso, renglones: caso.renglones.map(r => ({ ...r, precio: 100, subtotal: 3500 })) }, { conPrecios: true })))
  const entera = S.htmlHoja(caso, { plan: { modo: 'media', paginas: [[0, 1]] } })
  chk('N-0013: ni con un plan de una hoja', sinInternos(entera) && lotesDe(entera)[0] === '6242-2 ×30')
  // Todo sin lote: guion, sin texto de faltante.
  const nada = S.htmlHoja({ ...ORDEN, renglones: [{ ...PROD, cajas: 50, lotes: [{ lote: 'SIN STOCK', cajas: 50 }] }] })
  chk('todo sin lote: "—" en LOTE y nada de faltante', lotesDe(nada)[0] === '—' && sinInternos(nada))
  // El viejo caso de tres lotes con faltante.
  const viejo = S.htmlHoja({ ...ORDEN, renglones: [{ producto: 'Cucurucho mini', presentacion: 'Caja x 320', cono: 'CASERATO', cajas: 50, unidades: 16000, lotes: [{ lote: '7031', cajas: 20 }, { lote: '7038', cajas: 16 }, { lote: 'SIN STOCK', cajas: 14 }] }] })
  chk('tres lotes con faltante: solo los reales', lotesDe(viejo)[0] === '7031 ×20 · 7038 ×16' && sinInternos(viejo))
  chk('y las observaciones siguen yendo', /<strong>Observaciones:<\/strong> Frágil/.test(viejo))
  chk('sin faltante no se nombra', !/Faltante/.test(S.htmlHoja(ORDEN)))
  // Agrupados: el mismo lote en dos movimientos va una vez, sumado.
  chk('el mismo lote dos veces se suma', S.textoLotesHoja([{ lote: '6244-1', cajas: 3 }, { lote: '6242-2', cajas: 30 }, { lote: '6244-1', cajas: 2 }], null, 35) === '6244-1 ×5 · 6242-2 ×30')
  chk('un lote partido en dos movimientos que cubre todo va solo', S.textoLotesHoja([{ lote: '6242-2', cajas: 30 }, { lote: '6242-2', cajas: 5 }], null, 35) === '6242-2')
  chk('un movimiento que se compensa a cero no va', S.textoLotesHoja([{ lote: '6242-2', cajas: 35 }, { lote: '7000', cajas: 4 }, { lote: '7000', cajas: -4 }], null, 35) === '6242-2')
  chk('un lote sin cantidad va solo', S.textoLotesHoja([{ lote: '6242-2' }, { lote: '6244-1', cajas: 5 }], null, 35) === '6242-2 · 6244-1 ×5')
  chk('sin total conocido, un lote va solo', S.textoLotesHoja([{ lote: '6242-2', cajas: 30 }]) === '6242-2')
  chk('lote vacío o "sin lote" no va', S.textoLotesHoja([{ lote: '', cajas: 2 }, { lote: null, cajas: 1 }, { lote: 'sin lote', cajas: 3 }, { lote: '6242-2', cajas: 30 }], null, 36) === '6242-2 ×30')
  chk('lista vacía o ausente: "—"', S.textoLotesHoja([]) === '—' && S.textoLotesHoja(null) === '—')
  // Un INSUMO: lo mismo, en su unidad.
  const ins = S.htmlHoja({ ...ORDEN, renglones: [{ esInsumo: true, producto: 'Azúcar', marca: 'Ledesma', cantidad: 50, unidad: 'kg', lotes: [{ lote: 'A-1', cantidad: 30.5 }, { lote: 'SIN STOCK', cantidad: 19.5 }] }] })
  chk('insumo con una parte sin lote: solo el lote conocido, en kilos', lotesDe(ins)[0] === 'A-1 ×30,5 kg' && sinInternos(ins))
  // Compartir (WhatsApp): lo mismo.
  const t = S.textoOrden(caso)
  chk('el texto para compartir dice 35 cajas y solo el lote real', /- 35 cajas · Cucuruchón Mini · Caja con cono · ASPEN \(lotes 6242-2 \(30\)\)/.test(t) && /Total: 35 cajas/.test(t))
  chk('el texto para compartir no dice SIN STOCK ni faltante', sinInternos(t))
  const tDos = S.textoOrden({ ...caso, renglones: [{ ...PROD, cajas: 35, lotes: [{ lote: '6242-2', cajas: 30 }, { lote: '6244-1', cajas: 2 }, { lote: '6244-1', cajas: 3 }] }] })
  chk('el texto para compartir suma por lote', /\(lotes 6242-2 \(30\) · 6244-1 \(5\)\)/.test(tDos))
  const tIns = S.textoOrden({ ...caso, renglones: [{ esInsumo: true, producto: 'Azúcar', cantidad: 50, unidad: 'kg', lotes: [{ lote: 'SIN STOCK', cantidad: 50 }] }] })
  chk('un insumo todo sin lote: el texto no nombra lotes', /- 50 kg · Azúcar\n/.test(tIns + '\n') && sinInternos(tIns))
}

// ── El sello de anulada ─────────────────────────────────────────────────────
{
  const S = nuevo()
  const a = S.htmlHoja({ ...ORDEN, estado: 'anulada', anuladaEn: '2026-09-28', anuladaPor: 'Pablo Nuss', anuladaMotivo: 'el cliente canceló el retiro' })
  chk('el sello de ANULADA lleva fecha, quién y motivo', /rh-anulada__detalle">28\/09\/2026 · Pablo Nuss · el cliente canceló el retiro</.test(a))
  chk('sin esos datos el sello va solo', !/rh-anulada__detalle/.test(S.htmlHoja({ ...ORDEN, estado: 'anulada' })))
  chk('el sello va en negro (la hoja es blanco y negro)', /\.rh-anulada \{[^}]*border: 6px solid #000/.test(S.ESTILOS_HOJA))
}

fin()
