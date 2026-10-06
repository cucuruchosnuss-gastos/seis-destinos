// LOS DETALLES VIEJOS (05/10/2026). Lo que se puede probar sin navegador de
// lo que mide e2e/detalles-dispositivos.spec.js:
//   1. Cada campo de PLATA de la app pone los puntos de miles: lo enlaza
//      enlazarCampoNumero() de js/utils.js (en la misma línea o en las tres de
//      antes: la lista de ids, el querySelectorAll o el getElementById). Y
//      ningún <input type="number"> (se come la coma).
//   2. Lo que no deja llegar al botón de abajo: la barra de abajo del celular
//      deja su alto libre al traer algo a la vista (scroll-padding-bottom).
//   3. Fechas que se salían de su recuadro: la grilla de fechas del wizard de
//      Gastos con minmax(0, 1fr) y las fechas de su barra de filtros con
//      width: auto.
//   4. Administración, lista | detalle: en la compu la lista sigue a la vista
//      al lado de la orden / la lista de precios abierta y la fila abierta
//      queda marcada; en el celular, de a una. Se EJECUTA (sandbox).
//   5. La tarjeta de cheques del celular: lo que no entra baja de renglón.
//
//   node pruebas/test-detalles-viejos.js
//   ARCHIVO_<X>=<copia> para probar otra versión de un archivo (ver ARCHIVOS).

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')
const { construirAdministracion } = require('./sandbox-administracion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVOS = {
  ARCHIVO_CSS: 'css/main.css',
  ARCHIVO_ADM: 'modulos/administracion.html',
  ARCHIVO_GASTOS: 'modulos/gastos.html',
  ARCHIVO_CAJA: 'modulos/caja.html',
  ARCHIVO_COBRANZAS: 'modulos/cobranzas.html',
  ARCHIVO_CC: 'modulos/cuentas-corrientes.html',
  ARCHIVO_MP: 'modulos/materia-prima.html',
  ARCHIVO_STOCK: 'modulos/stock.html',
  ARCHIVO_TALLER: 'modulos/taller.html',
}
const ruta = v => process.env[v] || path.join(RAIZ, ARCHIVOS[v])
const SRC = {}
for (const v of Object.keys(ARCHIVOS)) {
  SRC[v] = fs.readFileSync(ruta(v), 'utf8')
  console.log(`ARCHIVO ${ruta(v)} (${SRC[v].length} bytes)`)
}
const { chk, fin } = arnes()

// ── 1. La plata con punto de miles ──────────────────────────────────────────
// [archivo, cómo se nombra el campo en el código]. El campo tiene que existir
// en el archivo y estar enlazado.
const PLATA = [
  ['ARCHIVO_CAJA', "'movimiento-monto'"], ['ARCHIVO_CAJA', "'traspaso-monto'"], ['ARCHIVO_CAJA', "'traspaso-monto-destino'"],
  ['ARCHIVO_COBRANZAS', "'cob-efectivo'"], ['ARCHIVO_COBRANZAS', "'[data-importe-forma]'"], ['ARCHIVO_COBRANZAS', "'[data-importe]'"],
  ['ARCHIVO_CC', "'campo-monto-pago'"], ['ARCHIVO_CC', "'campo-monto-credito'"], ['ARCHIVO_CC', "'campo-saldo-inicial-importe'"],
  ['ARCHIVO_CC', "'.campo-importe-sin'"], ['ARCHIVO_CC', "'.monto-fifo'"],
  ['ARCHIVO_GASTOS', "'campo-importe'"], ['ARCHIVO_GASTOS', "'edit-importe'"], ['ARCHIVO_GASTOS', "'edit-factura-importe'"], ['ARCHIVO_GASTOS', "'campo-interes-monto'"],
  ['ARCHIVO_MP', "'campo-total-factura'"], ['ARCHIVO_MP', "'.campo-reintento-total'"],
  ['ARCHIVO_STOCK', "'[data-trp-precio]'"],
  ['ARCHIVO_ADM', "'ad-saldo-importe'"], ['ARCHIVO_ADM', "'ad-ajuste-importe'"], ['ARCHIVO_ADM', "'[data-precio]'"], ['ARCHIVO_ADM', "'[data-precio-lista]'"],
  ['ARCHIVO_TALLER', "'tl-venta-importe'"], ['ARCHIVO_TALLER', "'tl-ed-venta'"], ['ARCHIVO_TALLER', "'tl-hora-valor'"], ['ARCHIVO_TALLER', "'tl-ed-presupuesto'"],
]

// Sin comentarios de línea (un comentario que nombra el campo no lo enlaza).
const sinComentarios = s => s.split('\n').map(l => (/^\s*\/\//.test(l) ? '' : l)).join('\n')

function enlazado(src, ref) {
  const lineas = sinComentarios(src).split('\n')
  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].includes('enlazarCampoNumero(') || /^\s*import\b/.test(lineas[i])) continue
    if (lineas[i].includes(ref)) return true
    // Si el campo se busca en la misma línea (getElementById / querySelector),
    // tiene que ser ESE; si no, es una variable que se armó en las tres de antes.
    const enLaLinea = (lineas[i].match(/enlazarCampoNumero\(([^,)]*)/) || [])[1] ?? ''
    if (/(getElementById|querySelector(All)?)\(\s*['"`]/.test(enLaLinea)) continue
    if (lineas.slice(Math.max(0, i - 3), i).some(l => l.includes(ref))) return true
  }
  return false
}

// El campo existe en el archivo (como id="…", class o data-…).
function existe(src, ref) {
  const t = ref.replace(/^'|'$/g, '')
  if (t.startsWith('[')) return src.includes(t.slice(1, -1))
  if (t.startsWith('.')) return src.includes(t.slice(1))
  return src.includes(`id="${t}"`)
}

for (const [v, ref] of PLATA) {
  chk(`${ARCHIVOS[v]}: el campo ${ref} existe`, existe(SRC[v], ref))
  chk(`${ARCHIVOS[v]}: ${ref} pone los puntos de miles (enlazarCampoNumero)`, enlazado(SRC[v], ref))
}
// El límite de crédito de la ficha: CAMPOS_FICHA lo marca 'importe' y llenarFicha enlaza los 'importe'.
chk('Administración: el límite de crédito es un campo de importe de la ficha', /limite_credito['"]?\s*[:,]\s*['"]importe['"]|\['limite_credito',\s*'importe'\]/.test(SRC.ARCHIVO_ADM))
chk('Administración: llenarFicha enlaza los campos de importe', /if \(tipo === 'importe'\) \{ enlazarCampoNumero\(el/.test(SRC.ARCHIVO_ADM))
for (const [v, rel] of Object.entries(ARCHIVOS)) {
  if (!rel.endsWith('.html')) continue
  const inputs = sinComentarios(SRC[v]).replace(/<!--[\s\S]*?-->/g, '').match(/<input\b[^>]*>/g) ?? []
  chk(`${rel}: ningún <input type="number">`, !inputs.some(i => /type="number"/.test(i)))
}

// ── 2. La barra de abajo no tapa el botón de abajo ──────────────────────────
{
  const css = SRC.ARCHIVO_CSS
  const i = css.indexOf('@media (max-width: 1023.98px)')
  const bloque = i < 0 ? '' : css.slice(i, css.indexOf('\n}\n', i))
  // La RELACIÓN, no los números: el margen tiene que ser al menos el alto de
  // la barra + 8 px. La barra pasó de 64 a 68 px (barra-abajo-a-gusto) y con
  // números clavados la prueba se rompía sin que nada estuviera mal.
  const pad = /html:has\(> body\.con-barra-lateral\) \{ scroll-padding-bottom: calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\); \}/.exec(bloque)
  const alto = /\.barra-abajo \{[^}]*height: calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\)/.exec(bloque)
  chk('main.css: con la barra de abajo, scroll-padding-bottom deja libre su alto', !!pad)
  chk('main.css: la barra de abajo tiene su alto + el área segura', !!alto)
  chk('main.css: el scroll-padding cubre la barra entera y 8 px más',
    !!pad && !!alto && Number(pad[1]) >= Number(alto[1]) + 8, [pad?.[1], alto?.[1]])
}

// ── 3. Fechas que se salían de su recuadro (Gastos) ─────────────────────────
{
  const g = SRC.ARCHIVO_GASTOS
  const i = g.indexOf('id="grupo-fecha"')
  const antes = g.slice(Math.max(0, i - 600), i)
  chk('Gastos: la grilla de las dos fechas del wizard con minmax(0, 1fr)', /grid-template-columns:repeat\(2, minmax\(0, 1fr\)\)/.test(antes) && !/grid-template-columns:1fr 1fr/.test(antes))
  const j = g.indexOf('.lista-filtros input[type="date"] {')
  const regla = j < 0 ? '' : g.slice(j, g.indexOf('}', j))
  chk('Gastos: las fechas de la barra de filtros con width: auto (no se pisan con "Categoría")', /width: auto;/.test(regla))
}

// ── 4. Administración: lista | detalle ──────────────────────────────────────
{
  const adm = SRC.ARCHIVO_ADM
  const css = adm.slice(adm.indexOf('<style>'), adm.indexOf('</style>'))
  chk('CSS: desde 1100 px, .ad-md--lado arma lista | detalle', /@media \(min-width: 1100px\) \{\s*\.ad-md--lado \{ display: grid; grid-template-columns: minmax\(300px, 400px\) minmax\(0, 1fr\);/.test(css))
  chk('CSS: la lista con su propio scroll, pegada arriba', /\.ad-md--lado > section:first-of-type \{[^}]*position: sticky;[^}]*overflow-y: auto;/.test(css))
  chk('CSS: la fila abierta con el fondo naranja suave y el borde de 3 px', /\.ad-md--lado \.ad-fila\[aria-current="true"\] \{ background: var\(--naranja-suave\); box-shadow: inset 3px 0 0 var\(--naranja\);/.test(css))
  // "‹ Órdenes" / "‹ Listas" siguen a la vista en la compu (vuelven a la lista sola).
  chk('CSS: el "‹ Órdenes" / "‹ Listas" del detalle no se esconde', !/#ad-orden-volver[^{]*\{[^}]*display: none/.test(css) && !/#ad-lista-volver[^{]*\{[^}]*display: none/.test(css))
  chk('CSS: en la columna angosta los filtros de las órdenes van de a dos', /\.ad-md--lado \.ad-filtros \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/.test(css))
  chk('HTML: órdenes y una orden en el mismo contenedor', /<div class="ad-md" id="ad-md-ordenes">\s*(<!--[\s\S]*?-->\s*)?<section id="ad-vista-ordenes"/.test(adm) && /<div id="ad-orden-cuerpo"><\/div>\s*<\/section>\s*<\/div>/.test(adm))
  chk('HTML: las listas y una lista en el mismo contenedor', /<div class="ad-md ad-md--listas" id="ad-md-listas">\s*(<!--[\s\S]*?-->\s*)?<section id="ad-vista-listas"/.test(adm) && /id="ad-lista-descartar">Descartar los cambios<\/button>\s*<\/div>\s*<\/div>\s*<\/section>\s*<\/div>/.test(adm))

  const nuevo = (compu) => {
    const S = construirAdministracion(ruta('ARCHIVO_ADM'))
    const contenedores = {}
    for (const l of ['ad-vista-ordenes', 'ad-vista-listas']) {
      const clases = new Set()
      contenedores[l] = { clases, classList: { toggle(c, f) { (f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c) } } }
      S.__doc.getElementById(l).parentElement = contenedores[l]
    }
    S.__win.matchMedia = (q) => ({ matches: compu && q === '(min-width: 1100px)', addEventListener() {} })
    const filas = ['o1', 'o2'].map(id => { const f = S.__doc.createElement('button'); f.dataset = { orden: id }; return f })
    const filasLista = ['l1', 'l2'].map(id => { const f = S.__doc.createElement('button'); f.dataset = { lista: id }; return f })
    S.__doc.querySelectorAll = (sel) => sel.startsWith('#ad-ordenes-lista') ? filas : sel.startsWith('#ad-listas-lista') ? filasLista : []
    return { S, contenedores, filas, filasLista }
  }
  const el = (S, id) => S.__doc.getElementById(id)

  // En la compu, entrando por la lista.
  {
    const { S, contenedores, filas } = nuevo(true)
    S.mostrarVista('ad-vista-ordenes')
    chk('compu: la lista sola, sin columnas', el(S, 'ad-vista-ordenes').hidden === false && !contenedores['ad-vista-ordenes'].clases.has('ad-md--lado'))
    S.estado.orden = { id: 'o2' }
    S.mostrarVista('ad-vista-orden')
    chk('compu: abierta una orden, la lista sigue a la vista', el(S, 'ad-vista-ordenes').hidden === false && el(S, 'ad-vista-orden').hidden === false)
    chk('compu: el contenedor arma lista | detalle', contenedores['ad-vista-ordenes'].clases.has('ad-md--lado'))
    chk('compu: la fila abierta queda marcada (y solo ella)', filas[1].getAttribute('aria-current') === 'true' && filas[0].getAttribute('aria-current') === null)
    S.mostrarVista('ad-vista-inicio')
    chk('compu: al irse, la lista y el detalle se esconden y no quedan columnas', el(S, 'ad-vista-ordenes').hidden === true && !contenedores['ad-vista-ordenes'].clases.has('ad-md--lado'))
    chk('compu: al irse, ninguna fila queda marcada', filas.every(f => f.getAttribute('aria-current') === null))
    S.estado.lista = { id: 'l1' }
    S.mostrarVista('ad-vista-listas')
    S.mostrarVista('ad-vista-lista')
    chk('compu: lo mismo con las listas de precios', el(S, 'ad-vista-listas').hidden === false && contenedores['ad-vista-listas'].clases.has('ad-md--lado'))
    chk('compu: con una lista abierta, las órdenes no se ven', el(S, 'ad-vista-ordenes').hidden === true)
  }
  // En la compu, llegando a la orden sin pasar por la lista (no está leída).
  {
    const { S, contenedores } = nuevo(true)
    S.estado.orden = { id: 'o1' }
    S.mostrarVista('ad-vista-orden')
    chk('compu: sin pasar por la lista, el detalle solo', el(S, 'ad-vista-ordenes').hidden === true && !contenedores['ad-vista-ordenes'].clases.has('ad-md--lado'))
  }
  // En el celular: de a una.
  {
    const { S, contenedores } = nuevo(false)
    S.mostrarVista('ad-vista-ordenes')
    S.estado.orden = { id: 'o1' }
    S.mostrarVista('ad-vista-orden')
    chk('celular: abierta una orden, la lista no se ve', el(S, 'ad-vista-ordenes').hidden === true && el(S, 'ad-vista-orden').hidden === false)
    chk('celular: sin columnas', !contenedores['ad-vista-ordenes'].clases.has('ad-md--lado'))
  }
  // Clientes no se parte: el diseño (5a, 5b) va a todo el ancho.
  chk('clientes no entra en lista | detalle', !/'ad-vista-cliente':/.test((adm.match(/const LISTA_DE_DETALLE = \{[^}]*\}/) || [''])[0]))
  chk('al girar la tablet se rearma', /window\.matchMedia\?\.\(MQ_LISTA_DETALLE\)\?\.addEventListener\?\.\('change', \(\) => aplicarListaDetalle\(\)\)/.test(adm))
  chk('al repintar la lista de órdenes se vuelve a marcar la abierta', /function pintarOrdenes\(\) \{[\s\S]{0,400}marcarElegidosLista\(\)\s*\}/.test(adm))
  chk('al repintar las listas de precios se vuelve a marcar la abierta', /function pintarListas\(\) \{[\s\S]{0,900}marcarElegidosLista\(\)\s*\}/.test(adm))
}

// ── 5. La tarjeta de cheques del celular ────────────────────────────────────
{
  const adm = SRC.ARCHIVO_ADM
  const regla = sel => { const i = adm.indexOf('\n    ' + sel + ' {'); return i < 0 ? '' : adm.slice(i, adm.indexOf('}', i)) }
  chk('cheques: el renglón de arriba baja en vez de cortarse', /flex-wrap: wrap/.test(regla('.chq-tarjeta__l1')))
  chk('cheques: el renglón de abajo baja en vez de cortarse', /flex-wrap: wrap/.test(regla('.chq-tarjeta__l2')))
  const i = adm.indexOf('@media (max-width: 520px) {\n      .chq-tarjeta__l2')
  const m = i < 0 ? '' : adm.slice(i, adm.indexOf('\n    }\n', i))
  chk('cheques (≤ 520 px): el estado va en el renglón del número', /\.chq-tarjeta__l2 > \.chq-tarjeta__estado \{ order: 1; \}/.test(m))
  chk('cheques (≤ 520 px): banco y cliente en el renglón de abajo', /\.chq-tarjeta__l2 > \.chq-tarjeta__banco, \.chq-tarjeta__l2 > \.chq-tarjeta__cliente, \.chq-tarjeta__l2 > \.chq-tarjeta__salida \{ order: 2; \}/.test(m))
  chk('cheques (≤ 520 px): el banco no queda en 2 px', /\.chq-tarjeta__l2 > \.chq-tarjeta__banco \{ flex: 1 1 5rem; \}/.test(m))
}

fin()
