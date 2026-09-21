// Lo común de las suites del circuito Ingreso ↔ Gastos ↔ Cuentas Corrientes
// (test-materia-prima-circuito.js, test-gastos-circuito.js,
// test-cuentas-corrientes-circuito.js).
//
// Esas tres suites cubren los renders NUEVOS del circuito, no el archivo
// entero: materia-prima.html todavía tiene su barrido de XSS pendiente, y un
// chequeo estático sobre todo el archivo daría rojo por sinks viejos que no
// son de este trabajo. Por eso el chequeo estático se ACOTA a las funciones que
// se le nombran — y si una función nombrada no existe, eso es rojo.

const fs = require('fs')
const { interpolaciones } = require('./escaner-interpolaciones')
const { clasificar } = require('./clasificar')
const { extraerFn } = require('./extraer')

function arnes() {
  let ok = 0
  const fallas = []
  const esperas = []
  function chk(nombre, condicion, detalle) {
    if (condicion) ok++
    else fallas.push(nombre + (detalle ? ` — ${detalle}` : ''))
  }
  function cerrar() {
    const total = ok + fallas.length
    for (const f of fallas) console.log('  ✗ ' + f)
    console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
    process.exit(fallas.length ? 1 : 0)
  }
  // Las ramas async cierran al terminar TODAS: un cierre por timeout podría
  // cortar antes de que una afirme nada. Una que tire es una falla.
  function fin() {
    Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err)))))
      .then(cerrar)
  }
  return { chk, esperas, fin, get ok() { return ok }, fallas }
}

// Una marca distinta por campo: si aparece cruda, se sabe CUÁL campo fue.
const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`

function chequearMarcas(chk, render, html, campos) {
  chk(`${render}: no aparece NINGUNA marca cruda`, !/<b data-xss=/.test(html),
    (html.match(/.{0,60}<b data-xss=[^>]*>/) || [''])[0])
  for (const campo of campos) {
    chk(`${render}: «${campo}» aparece escapado`, html.includes(escapada(campo)))
  }
}

// Rango de líneas [desde, hasta] de cada función nombrada, en el HTML entero.
function rangosDeFunciones(fuente, nombres, chk) {
  const rangos = []
  for (const n of nombres) {
    let texto
    try { texto = extraerFn(fuente, n) } catch (e) { chk(`estático: existe la función ${n}`, false, e.message); continue }
    const idx = fuente.indexOf(texto)
    const desde = fuente.slice(0, idx).split('\n').length
    rangos.push({ n, desde, hasta: desde + texto.split('\n').length - 1 })
  }
  return rangos
}

// El chequeo estático, acotado: cada `${...}` de una plantilla que arma HTML,
// dentro de las funciones nombradas, tiene que estar escapado o figurar en las
// hojas seguras CON SU MOTIVO. Y ninguna cae en un atributo sin comillas, en
// un on*= ni en un href/src.
function estaticoAcotado(chk, ruta, fuente, nombres, { escape = 'esc', seguras = [], segurasRegex = [] } = {}) {
  const rangos = rangosDeFunciones(fuente, nombres, chk)
  const { interpolaciones: todas } = interpolaciones(ruta)
  const adentro = todas.filter(x => x.html && rangos.some(r => x.linea >= r.desde && x.linea <= r.hasta))
  chk('estático: el recorte encontró interpolaciones que revisar', adentro.length > 0, `${adentro.length}`)
  const malas = []
  for (const x of adentro) {
    const c = clasificar(x.expr, { escape, seguras, segurasRegex })
    if (!c.ok) malas.push(`línea ${x.linea}: ${c.hojasMalas.join(' | ')}`)
  }
  chk('estático: toda interpolación en HTML de las funciones nuevas está escapada o justificada',
    malas.length === 0, malas.join('\n      '))

  // Contexto: el mismo criterio que la suite de Cobranzas.
  const lineas = fuente.split('\n')
  const sinComillas = [], enEvento = [], enUrl = []
  for (const x of adentro) {
    const linea = lineas[x.linea - 1] || ''
    const pos = linea.indexOf('${' + x.expr.split('\n')[0])
    if (pos === -1) continue
    const tramo = linea.slice(0, pos)
    const ultimaEtiqueta = tramo.lastIndexOf('<')
    if (ultimaEtiqueta === -1 || tramo.lastIndexOf('>') > ultimaEtiqueta) continue
    const dentro = tramo.slice(ultimaEtiqueta)
    const comillas = (dentro.match(/"/g) || []).length
    const dentroDeAtributo = comillas % 2 === 1
    if (!dentroDeAtributo && /[\w-]+\s*=\s*$/.test(dentro)) sinComillas.push(x.linea)
    if (dentroDeAtributo) {
      const nombreAttr = (dentro.match(/([\w-]+)\s*=\s*"[^"]*$/) || [])[1] || ''
      if (/^on/i.test(nombreAttr)) enEvento.push(`${x.linea} (${nombreAttr})`)
      // En un href/src escapar HTML no alcanza. Lo único que se acepta ahí es
      // encodeURIComponent() entre comillas DOBLES (no escapa la simple): es
      // el criterio que CLAUDE.md ya dejó escrito para los enlaces a gastos.
      const esUrlCodificada = x.expr.trim().startsWith('encodeURIComponent(')
      if (/^(href|src|action|formaction|xlink:href)$/i.test(nombreAttr) && !esUrlCodificada) enUrl.push(`${x.linea} (${nombreAttr})`)
    }
  }
  chk('estático: ninguna interpolación nueva cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación nueva cae dentro de un on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación nueva cae dentro de un href/src sin encodeURIComponent', enUrl.length === 0, enUrl.join(', '))
  return adentro
}

function leer(ruta) {
  const fuente = fs.readFileSync(ruta, 'utf8')
  // El sub-proceso INFORMA qué leyó: el runner de mutaciones lo compara contra
  // lo que escribió, así no reporta cobertura habiendo leído el limpio.
  console.log(`ARCHIVO ${ruta} (${fuente.length} bytes)`)
  return fuente
}

module.exports = { arnes, marca, escapada, chequearMarcas, estaticoAcotado, rangosDeFunciones, leer }
