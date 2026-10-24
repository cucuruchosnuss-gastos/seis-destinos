// Suite: Conos de papel → "+ Cono nuevo" también al ANOTAR para pedir
// (modulos/conos.html, pedido del 14/10/2026: .claude/pedidos/2026-10-14-conos-anotar.md).
//
// Facu escribió "LE CREMME" en "Anotar para pedir", no estaba y no pudo seguir:
// ese buscador nunca ofrecía crear el cono (el de "Agregar cono" al pliego sí).
// Se EJECUTA el código real de la pantalla con los conos de la maqueta:
//  - la regla de cuándo se ofrece "+ Cono nuevo: «TEXTO»": 2 letras o más y
//    ningún cono con ese nombre exacto, sin mirar mayúsculas, acentos ni
//    espacios (los de los bordes y los repetidos del medio);
//  - el texto que viaja a proponer_marca (espacios del medio colapsados: la
//    base compara upper(btrim(p_nombre)) exacto y no los colapsa);
//  - que el botón solo aparezca a quien la base deja proponer
//    (produccion:cargar, produccion:configurar o conos:pedir);
//  - que el cono creado quede elegido en el formulario de donde salió.
//
//   node pruebas/test-conos-anotar-nuevo.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-conos-anotar-nuevo.js

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const DATOS = require('./datos-maqueta/conos')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/conos.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, fin } = arnes()

let S = null
try {
  S = construirCon(ARCHIVO, {
    preludio: fuenteNumeros(),
    funciones: ['esc', 'normalizarBusqueda', 'permisosDe', 'textoConoNuevo', 'conoNuevoOfrecido', 'puedeProponer', 'htmlResultados'],
    constantes: [],
  })
} catch (err) {
  chk('la pantalla tiene las funciones de "+ Cono nuevo" (textoConoNuevo, conoNuevoOfrecido, puedeProponer)', false, String(err.message).slice(0, 200))
}

const CONOS = DATOS.rpc.conos_stock

if (S) {
  // ── 1. La regla: exacto vs. parecido ─────────────────────────────────────
  const of = t => S.conoNuevoOfrecido(t, CONOS)
  chk('"LE CREMME", que no existe: se ofrece', of('LE CREMME') === 'LE CREMME', of('LE CREMME'))
  chk('en minúsculas también, y viaja como se escribió (la base lo pasa a MAYÚSCULAS)', of('le cremme') === 'le cremme')
  chk('un nombre que existe exacto: no ("ASPEN")', of('ASPEN') === null)
  chk('… sin importar las mayúsculas ("aspen")', of('aspen') === null)
  chk('… ni los acentos ("Áspen")', of('Áspen') === null)
  chk('… ni los espacios de los bordes ("  aspen  ")', of('  aspen  ') === null)
  chk('… ni los espacios repetidos del medio ("la   americana" = LA AMERICANA)', of('la   americana') === null)
  chk('parecido no es exacto: "aspe" se ofrece (ASPEN es otro cono)', of('aspe') === 'aspe')
  chk('"rio olimpico" (sin la S) se ofrece', of('rio olimpico') === 'rio olimpico')
  chk('una sola letra: no', of('x') === null && of(' x ') === null)
  chk('vacío o solo espacios: no', of('') === null && of('   ') === null && of(null) === null && of(undefined) === null)
  chk('dos letras: sí', of('zz') === 'zz')
  chk('el exacto se busca en TODOS los conos, no solo en los 8 que muestra la lista', S.conoNuevoOfrecido('C9', [...Array(20)].map((_, i) => ({ cono: 'C' + i }))) === null)
  chk('un cono apagado con ese nombre también cuenta (la base lo encontraría: ya_existia)', S.conoNuevoOfrecido('viejo', [{ cono: 'VIEJO', activa: false }]) === null)
  chk('un cono CON acentos y lo escrito sin ellos: no ("heladeria nandu" = HELADERÍA ÑANDÚ)', S.conoNuevoOfrecido('heladeria nandu', [{ cono: 'HELADERÍA ÑANDÚ' }]) === null)
  chk('un cono guardado con espacios de más también cuenta ("LA  AMERICANA")', S.conoNuevoOfrecido('la americana', [{ cono: ' LA  AMERICANA' }]) === null)
  chk('sin lista de conos: se ofrece', S.conoNuevoOfrecido('nuevo', null) === 'nuevo')

  // ── 2. El texto que viaja a proponer_marca ───────────────────────────────
  chk('se recortan los bordes', S.textoConoNuevo('  le cremme  ') === 'le cremme')
  chk('los espacios repetidos del medio quedan en uno', S.textoConoNuevo('le    cremme') === 'le cremme' && of('Le   Cremme') === 'Le Cremme')
  chk('tabulaciones y saltos también', S.textoConoNuevo('le\t\ncremme') === 'le cremme')
  chk('los acentos NO se tocan (es el nombre que se guarda)', S.textoConoNuevo('Heladería') === 'Heladería')
  chk('vacío: ""', S.textoConoNuevo(null) === '' && S.textoConoNuevo('   ') === '')

  // ── 3. Quién puede proponer (lo mismo que proponer_marca) ────────────────
  chk('conos:pedir: sí', S.puedeProponer(S.permisosDe(['pedir'], false)) === true)
  chk('produccion:configurar: sí', S.puedeProponer(S.permisosDe([], false, ['configurar'])) === true)
  chk('produccion:cargar: sí', S.puedeProponer(S.permisosDe([], false, ['cargar'])) === true)
  chk('solo ver conos (Mauricio): no', S.puedeProponer(S.permisosDe(['ver', 'recibir'], false)) === false)
  chk('solo precios: no', S.puedeProponer(S.permisosDe(['precios'], false)) === false)
  chk('solo produccion:ver: no', S.puedeProponer(S.permisosDe([], false, ['ver'])) === false)
  chk('super_admin: sí', S.puedeProponer(S.permisosDe([], true)) === true)

  // ── 4. El botón dice a qué formulario vuelve ─────────────────────────────
  const h = S.htmlResultados([], 'data-anotar-cono', 'le cremme', 'anotar')
  chk('sin resultados, el botón es lo único que hay', (h.match(/<button/g) || []).length === 1 && /\+ Cono nuevo: «LE CREMME»/.test(h), h)
  chk('el botón lleva el texto y el formulario de anotar', /data-cono-nuevo="le cremme" data-cono-destino="anotar"/.test(h), h)
  const h2 = S.htmlResultados([{ marca_id: 'm1', cono: 'ASPEN' }], 'data-agregar-cono', 'aspe', 'agregar')
  chk('con resultados, el botón va AL FINAL', /data-agregar-cono="m1"[\s\S]*data-cono-nuevo="aspe" data-cono-destino="agregar"/.test(h2), h2)
  chk('sin texto nuevo, sin botón', !/data-cono-nuevo/.test(S.htmlResultados([{ marca_id: 'm1', cono: 'ASPEN' }], 'data-anotar-cono', null, 'anotar')))
  const malo = S.htmlResultados([], 'data-anotar-cono', '"><b>x', 'anotar')
  chk('el texto va escapado', !/<b>/.test(malo) && /data-cono-nuevo="&quot;&gt;&lt;b&gt;x"/.test(malo))
}

// ── 5. La pantalla usa la regla en los dos buscadores ──────────────────────
// (21/10/2026: los dos buscadores suman los parecidos de la base, "¿Quisiste
// decir…?", como quinto parámetro: test-conos-parecidos.js.)
chk('Anotar ofrece "+ Cono nuevo" (conoNuevoOfrecido) y vuelve a anotar',
  /htmlResultados\(buscarConos\(texto\), 'data-anotar-cono', ofrecerConoNuevo\(texto\), 'anotar', estadoParecidos\('anotar'\)\)/.test(FUENTE) &&
  /cn-anotar-buscar'\)\.addEventListener\('input', ev => \{\n\s+programarParecidos\('anotar', ev\.target\.value\)\n\s+pintarResultadosAnotar\(\)/.test(FUENTE))
chk('Agregar usa la misma regla y vuelve a agregar',
  /htmlResultados\(lista, 'data-agregar-cono', ofrecerConoNuevo\(texto\), 'agregar', estadoParecidos\('agregar'\)\)/.test(FUENTE))
chk('el botón solo a quien puede proponer', /function ofrecerConoNuevo\(texto\) \{\n\s+return puedeProponer\(estado\.perm\) \? conoNuevoOfrecido\(texto, estado\.conos\) : null/.test(FUENTE))
chk('al tocarlo, proponerCono sabe a qué formulario volver', /if \(\(el = b\('\[data-cono-nuevo\]'\)\)\) \{ proponerCono\(el\.dataset\.conoNuevo, el\.dataset\.conoDestino\); return \}/.test(FUENTE))
chk('en anotar, el cono creado queda ELEGIDO ahí (elegirConoAnotar)', /if \(destino === 'anotar'\) await elegirConoAnotar\(id\)/.test(FUENTE))
chk('se refresca el catálogo después de crearlo', /await Promise\.allSettled\(\[cargarStock\(\), cargarCatalogo\(\)\]\)/.test(FUENTE))
chk('el error de la base va tal cual al formulario de donde salió', /document\.getElementById\(destino === 'anotar' \? 'cn-anotar-error' : 'cn-agr-error'\)/.test(FUENTE) &&
  /if \(err\) \{ err\.textContent = mensajeDe\(e\); err\.hidden = false \} else mostrarError\(mensajeDe\(e\)\)/.test(FUENTE))
chk('a proponer_marca viaja el texto con los espacios colapsados', /rpc\('proponer_marca', esOtro \? \{ p_nombre: textoConoNuevo\(nombre\), p_es_otro: true \} : \{ p_nombre: textoConoNuevo\(nombre\) \}\)/.test(FUENTE))
chk('ya_existia: igual queda elegido (y se avisa)', /if \(r\.ya_existia\) mostrarExito\('Ese cono ya existía: quedó elegido\.'\)/.test(FUENTE))
chk('un segundo toque mientras crea no manda otra vez', /if \(estado\.proponiendo\) return/.test(FUENTE))

// ── 6. Nada de lo que había se perdió ──────────────────────────────────────
// Baseline: el commit FIJO de abajo (main antes de este arreglo), NUNCA HEAD.
// ARCHIVO_BASE: un archivo ya extraído que reemplaza al `git show`.
{
  const BASE_COMMIT = '1fa4d4f'
  let antes = null
  if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
  else {
    try {
      antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/conos.html`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { antes = null }
  }
  chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
  if (antes) {
    const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
    const ahora = marcas(FUENTE)
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
    chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
  }
}

fin()
