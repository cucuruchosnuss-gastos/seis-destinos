// Los gráficos de la app (js/graficos.js, 04/10/2026). Se EJECUTA el archivo
// real y se mira el SVG que devuelve:
//  - ninguno inventa: un valor null no dibuja barra ni punto, dice "—";
//  - la escala es proporcional (la barra más alta ocupa el alto útil);
//  - los números van escritos en el gráfico;
//  - cada dato lleva su cifra exacta (data-detalle) y se puede tocar o
//    enfocar; activarDetalles la escribe debajo;
//  - sin datos devuelven '' (la pantalla dice "sin datos" con palabras);
//  - todo texto va escapado.
//
//   ARCHIVO_TEST=<copia de js/graficos.js>
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'graficos.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, fin } = arnes()

const codigo = src.replace(/^export /gm, '')
const nombres = [...codigo.matchAll(/^(?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
const G = new Function(codigo + `\nreturn { ${nombres.join(', ')} }`)()

const cuenta = (t, re) => (t.match(re) || []).length
const MAL = '"><b data-xss="1">'

// ── Ayudas ───────────────────────────────────────────────────────────────
chk('escGraf escapa', G.escGraf(`<"'&>`) === '&lt;&quot;&#39;&amp;&gt;')
chk('numeroGraf: null, undefined y vacío son null (nunca 0)', G.numeroGraf(null) === null && G.numeroGraf(undefined) === null && G.numeroGraf('') === null)
chk('numeroGraf: texto no numérico es null', G.numeroGraf('abc') === null)
chk('numeroGraf: un número de texto', G.numeroGraf('12.5') === 12.5)
chk('formatoEntero con miles', G.formatoEntero(1234567.6) === '1.234.568', G.formatoEntero(1234567.6))
chk('formatoEntero de null es "—"', G.formatoEntero(null) === '—')
chk('formatoEntero negativo', G.formatoEntero(-1500) === '−1.500')
chk('formatoEntero del cero', G.formatoEntero(0) === '0')
chk('topeRedondo', G.topeRedondo(1290) === 2000 && G.topeRedondo(950) === 1000 && G.topeRedondo(230) === 250 && G.topeRedondo(1) === 1, [G.topeRedondo(1290), G.topeRedondo(950), G.topeRedondo(230)].join())
chk('topeRedondo sin dato es 0', G.topeRedondo(0) === 0 && G.topeRedondo(null) === 0)
chk('cortarGraf', G.cortarGraf('Máquina larguísima', 8) === 'Máquina…' && G.cortarGraf('Corto', 8) === 'Corto')

// ── a) Barras agrupadas ──────────────────────────────────────────────────
const series = [{ clave: 'p', nombre: 'Productiva', color: '#C2410C' }, { clave: 't', nombre: 'Turno', color: '#9A9287' }]
{
  const s = G.barrasAgrupadas({ ancho: 360, alto: 220, series, grupos: [
    { etiqueta: 'Máquina 1', valores: { p: { valor: 1200, detalle: 'M1 productiva exacta' }, t: { valor: 600 } } },
    { etiqueta: 'Máquina 2', valores: { p: { valor: null }, t: { valor: 300 } } },
  ] })
  chk('dibuja un rect por cada valor que hay (3, no 4)', cuenta(s, /<rect /g) === 3, cuenta(s, /<rect /g))
  chk('el null dice "—" y no tiene barra', s.includes('graf-num--falta') && s.includes('>—<'))
  chk('los números van escritos', s.includes('>1.200<') && s.includes('>600<') && s.includes('>300<'))
  const alturas = [...s.matchAll(/height="([\d.]+)" rx/g)].map(m => Number(m[1]))
  chk('la más alta ocupa el alto útil (220 − 22 − 30)', Math.max(...alturas) === 168, alturas.join())
  chk('proporcional: 600 es la mitad de 1200', alturas.includes(84) && alturas.includes(42), alturas.join())
  chk('cada dato lleva su cifra exacta', s.includes('data-detalle="M1 productiva exacta"'))
  chk('un dato sin detalle propio arma uno', s.includes('data-detalle="Máquina 1 · Turno: 600"'))
  chk('cada dato se puede enfocar', cuenta(s, /class="graf-dato" tabindex="0"/g) === 4)
  chk('las etiquetas del eje', s.includes('>Máquina 1<') && s.includes('>Máquina 2<'))
  chk('el svg tiene el ancho pedido', /<svg class="graf" width="360" height="220" viewBox="0 0 360 220"/.test(s))
  chk('sin grupos: nada', G.barrasAgrupadas({ series, grupos: [] }) === '')
  const cero = G.barrasAgrupadas({ series, grupos: [{ etiqueta: 'M', valores: { p: { valor: 0 }, t: { valor: 0 } } }] })
  chk('todo en cero: barras de alto 0, sin NaN', !cero.includes('NaN') && cero.includes('>0<'))
  const x = G.barrasAgrupadas({ series: [{ clave: 'p', nombre: MAL, color: MAL }], grupos: [{ etiqueta: MAL, valores: { p: { valor: 1, detalle: MAL } } }] })
  chk('barras: todo escapado', !x.includes('<b data-xss') && x.includes('&quot;&gt;&lt;b'))
}

// ── b) Líneas ────────────────────────────────────────────────────────────
{
  const ejeX = ['a', 'b', 'c', 'd', 'e'].map((c, i) => ({ clave: c, etiqueta: `0${i + 1}/10` }))
  const s = G.lineas({ ancho: 360, alto: 220, ejeX, series: [{ nombre: 'M1', color: '#C2410C', valores: {
    a: { valor: 100 }, b: { valor: 200 }, d: { valor: 300, detalle: 'M1 día d exacto' }, e: { valor: 250 } } }] })
  chk('un día sin dato corta la línea: dos tramos', cuenta(s, /<polyline /g) === 2, cuenta(s, /<polyline /g))
  chk('un punto por cada dato (4)', cuenta(s, /class="graf-dato"/g) === 4)
  // (el eje también puede decir 250: se busca el número de la serie, con su color)
  chk('el último valor va escrito', /<text class="graf-num"[^>]*fill="#C2410C">250<\/text>/.test(s))
  chk('la cifra exacta de cada punto', s.includes('data-detalle="M1 día d exacto"'))
  chk('el eje Y llega a un número redondo', s.includes('>400<') || s.includes('>500<'), s.match(/text-anchor="end">[^<]+/g))
  chk('sin ningún dato: nada (nunca un gráfico vacío)', G.lineas({ ejeX, series: [{ nombre: 'M', color: '#000', valores: {} }] }) === '')
  chk('sin eje: nada', G.lineas({ ejeX: [], series: [] }) === '')
  const uno = G.lineas({ ejeX: [{ clave: 'a', etiqueta: 'x' }], series: [{ nombre: 'M', color: '#000', valores: { a: { valor: 5 } } }] })
  chk('un solo punto: se dibuja sin línea y sin NaN', uno.includes('graf-dato') && !uno.includes('NaN') && !uno.includes('<polyline'))
  const yPuntos = [...s.matchAll(/r="3.5"/g)].length
  chk('los puntos se ven (radio 3,5) y el toque es más grande', yPuntos === 4 && cuenta(s, /class="graf-toque"/g) === 4)
  const x = G.lineas({ ejeX: [{ clave: 'a', etiqueta: MAL }], series: [{ nombre: MAL, color: MAL, valores: { a: { valor: 1, detalle: MAL } } }] })
  chk('líneas: todo escapado', !x.includes('<b data-xss'))
}

// ── c) Barras apiladas ───────────────────────────────────────────────────
{
  const partes = [{ clave: 'prod', nombre: 'Produciendo', color: '#2F7D4F', oscuro: true }, { clave: 'par', nombre: 'Parada', color: '#7A2E42' }, { clave: 'arr', nombre: 'Arranque', color: '#D6CFC4' }]
  const s = G.barrasApiladas({ ancho: 400, partes, filas: [
    { etiqueta: 'Máquina 1', partes: { prod: { valor: 450, detalle: 'M1 produciendo 7 h 30 min' }, par: { valor: 30 }, arr: { valor: 60 } } },
    { etiqueta: 'Máquina 2', partes: { prod: { valor: 0 }, par: { valor: 0 }, arr: { valor: 0 } } },
  ] })
  const anchos = [...s.matchAll(/<rect x="[\d.]+" y="\d+" width="([\d.]+)"/g)].map(m => Number(m[1]))
  chk('cada fila es el 100 %: los segmentos suman el ancho', Math.abs(anchos.reduce((a, b) => a + b, 0) - 400) < 0.5, anchos.join())
  chk('el % escrito en los segmentos anchos', s.includes('>83 %<') && s.includes('>11 %<'), s.match(/>\d+ %</g))
  chk('un segmento angosto no lleva número (no se pisa)', !s.includes('>6 %<'))
  chk('el texto sobre un color oscuro va claro', s.includes('graf-num--claro'))
  chk('una fila sin horas lo dice', s.includes('Sin horas en el período'))
  chk('la cifra exacta de cada segmento', s.includes('data-detalle="M1 produciendo 7 h 30 min"'))
  chk('las etiquetas de cada fila', s.includes('>Máquina 1<') && s.includes('>Máquina 2<'))
  chk('sin filas: nada', G.barrasApiladas({ partes, filas: [] }) === '')
  const neg = G.barrasApiladas({ ancho: 100, partes, filas: [{ etiqueta: 'M', partes: { prod: { valor: -50 }, par: { valor: 50 } } }] })
  chk('un valor negativo no resta (cuenta 0)', neg.includes('>100 %<'))
}

// ── d) Dona ──────────────────────────────────────────────────────────────
{
  const s = G.dona({ tamano: 180, centro: '2 h', subcentro: 'de paradas', partes: [
    { nombre: 'Falla', valor: 90, color: '#7A2E42', detalle: 'Falla: 1 h 30 min' }, { nombre: 'Programada', valor: 30, color: '#C99A2E' }, { nombre: 'Otra', valor: 0, color: '#A8601F' }] })
  chk('un arco por cada parte con minutos (2)', cuenta(s, /class="graf-dato"/g) === 2)
  const largos = [...s.matchAll(/stroke-dasharray="([\d.]+) ([\d.]+)"/g)].map(m => [Number(m[1]), Number(m[2])])
  chk('los arcos son proporcionales (3 a 1)', largos.length === 2 && Math.abs(largos[0][0] / largos[1][0] - 3) < 0.01, JSON.stringify(largos))
  chk('el segundo arco empieza donde termina el primero', s.includes(`stroke-dashoffset="${-largos[0][0]}"`), s.match(/stroke-dashoffset="[^"]+"/g))
  chk('el centro dice el total', s.includes('>2 h<') && s.includes('>de paradas<'))
  chk('la cifra exacta', s.includes('data-detalle="Falla: 1 h 30 min"'))
  chk('sin minutos: nada (nunca una dona vacía)', G.dona({ partes: [{ nombre: 'x', valor: 0 }] }) === '' && G.dona({ partes: [] }) === '')
  const x = G.dona({ centro: MAL, partes: [{ nombre: MAL, valor: 1, color: MAL }] })
  chk('dona: todo escapado', !x.includes('<b data-xss'))
}

// ── e) Barras contra una línea de referencia ────────────────────────────
{
  const s = G.barrasConReferencia({ ancho: 300, alto: 190, referencia: { valor: 200, texto: 'promedio 200' }, barras: [
    { etiqueta: 'Lote A', valor: 150, tono: 'bajo', detalle: 'A exacto' }, { etiqueta: 'Lote B', valor: 250, tono: 'mejor' }, { etiqueta: 'Lote C', valor: null }, { etiqueta: 'Lote D', valor: 200, tono: 'raro' }] })
  chk('el tono de cada barra', s.includes('graf-barra--bajo') && s.includes('graf-barra--mejor') && s.includes('graf-barra--medio'))
  chk('un tono desconocido cae a "medio"', !s.includes('graf-barra--raro'))
  chk('el lote sin dato dice "—"', s.includes('>—<') && cuenta(s, /<rect /g) === 3)
  chk('la línea del promedio, con su texto', s.includes('class="graf-ref"') && s.includes('>promedio 200<'))
  const yRef = Number(s.match(/class="graf-ref" x1="\d+" x2="[\d.]+" y1="([\d.]+)"/)[1])
  chk('la línea está a la altura del promedio (200 de 250 en 140 px)', Math.abs(yRef - (162 - 200 * (140 / 250))) < 0.2, yRef)
  chk('sin promedio no hay línea', !G.barrasConReferencia({ barras: [{ etiqueta: 'A', valor: 1 }] }).includes('graf-ref'))
  chk('la cifra exacta', s.includes('data-detalle="A exacto"'))
}

// ── Leyenda ──────────────────────────────────────────────────────────────
chk('leyenda con muestra y nombre', G.leyendaGraf([{ nombre: 'M1', color: '#C2410C' }]).includes('background:#C2410C') && G.leyendaGraf([{ nombre: 'M1', color: '#C2410C' }]).includes('M1</li>'))
chk('leyenda vacía: nada', G.leyendaGraf([]) === '')
chk('leyenda escapada', !G.leyendaGraf([{ nombre: MAL, color: MAL }]).includes('<b data-xss'))

// ── La cifra exacta al tocar ─────────────────────────────────────────────
{
  const oyentes = {}
  const marcados = new Set()
  const dato = { getAttribute: () => 'M1 · 1.234,5 u/h', classList: { add: () => marcados.add(dato), remove: () => marcados.delete(dato) } }
  const otro = { closest: () => null }
  const raiz = {
    addEventListener(t, f) { (oyentes[t] = oyentes[t] || []).push(f) },
    contains: () => true,
    querySelectorAll: () => [...marcados].map(d => d),
  }
  const salida = { textContent: '', hidden: true }
  G.activarDetalles(raiz, salida)
  G.activarDetalles(raiz, salida)
  chk('se escucha una sola vez aunque se llame dos', (oyentes.click || []).length === 1 && (oyentes.focusin || []).length === 1)
  for (const f of oyentes.click) f({ target: otro })
  chk('tocar afuera de un dato no escribe nada', salida.hidden && salida.textContent === '')
  for (const f of oyentes.click) f({ target: { closest: () => dato } })
  chk('tocar un dato escribe su cifra exacta', !salida.hidden && salida.textContent === 'M1 · 1.234,5 u/h')
  chk('y lo marca', marcados.has(dato))
  salida.textContent = ''
  for (const f of oyentes.focusin) f({ target: { closest: () => dato } })
  chk('enfocarlo con Tab también', salida.textContent === 'M1 · 1.234,5 u/h')
  chk('sin raíz o sin salida no rompe', (() => { try { G.activarDetalles(null, null); return true } catch { return false } })())
}

fin()
