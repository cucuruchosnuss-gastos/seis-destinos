// Suite: Conos de papel → "Todos los conos" (modulos/conos.html, 14/10/2026).
//
// Se EJECUTA el código real de la pantalla con los datos de la maqueta
// (datos-maqueta/conos.js y conos-configura.js, 357 marcas como la base):
//  - los filtros En producción / Apagados / Doble bolsa / Ilustración / Todos;
//  - el buscador sin acentos ni mayúsculas;
//  - que cada interruptor mande a configurar_cono SOLO su campo (los otros null);
//  - los permisos de cada interruptor, en todas las combinaciones (como
//    configurar_cono: activa y doble bolsa piden produccion:configurar;
//    ilustración, eso o conos:pedir o conos:precios), deshabilitado sin permiso;
//  - el stock solo con conos:ver (la base devuelve 0 y no null sin ese permiso);
//  - la etiqueta "nuevo, a revisar", y que acá NO se aprueba;
//  - que si la base rechaza, el interruptor vuelve y el error va tal cual;
//  - que Producción → Configuración → Marcas / Conos muestre lo mismo.
//
//   node pruebas/test-conos-todos.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-conos-todos.js

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const DATOS = require('./datos-maqueta/conos')
const GRANDE = require('./datos-maqueta/conos-configura')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/conos.html')
const GESTION = process.env.ARCHIVO_GESTION || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
const FUENTE_GESTION = fs.readFileSync(GESTION, 'utf8')
// El runner de mutaciones compara el primer "ARCHIVO" con el archivo que mutó.
if (process.env.ARCHIVO_GESTION) console.log(`ARCHIVO ${GESTION} (${FUENTE_GESTION.length} bytes)`)
else console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['esc', 'miles', 'normalizarBusqueda', 'permisosDe', 'vistasDe', 'mensajeDe', 'pasaFiltroTodos',
  'conosDeTodos', 'cuentaTodos', 'puedeTocar', 'porQueNoSePuede', 'paramsConfigurarCono', 'aplicarRespuestaCono',
  'guardarInterruptor', 'textoGuardado', 'stockVisible', 'stockEnRojo', 'htmlFilaTodos', 'htmlAvisoRevisar']
const CONSTANTES = ['FILTROS_TODOS', 'INTERRUPTORES', 'ETIQUETA_ALTA', 'DONDE_SE_APRUEBA', 'MOSTRAR_NEGATIVOS_CONOS']
const S = construirCon(ARCHIVO, {
  preludio: fuenteNumeros(), funciones: FUNCIONES, constantes: CONSTANTES, retorno: CONSTANTES.join(', '),
})

const copia = filas => filas.map(f => ({ ...f, _buscar: S.normalizarBusqueda(f.cono) }))
const CAT = copia(DATOS.rpc.conos_catalogo)
const nombres = l => l.map(f => f.cono)

// ── 1. Quién ve la pestaña ──────────────────────────────────────────────────
{
  const tiene = p => S.vistasDe(p).some(v => v.clave === 'todos' && v.texto === 'Todos los conos')
  chk('la pestaña se llama "Todos los conos" y la ve quien tiene conos:ver', tiene(S.permisosDe(['ver'], false)))
  chk('… o conos:pedir', tiene(S.permisosDe(['pedir'], false)))
  chk('… o producción (configurar, ver o cargar), como deja conos_catalogo()',
    tiene(S.permisosDe([], false, ['configurar'])) && tiene(S.permisosDe([], false, ['ver'])) && tiene(S.permisosDe([], false, ['cargar'])))
  chk('solo precios o solo recibir: no (conos_catalogo() no los deja leer)', !tiene(S.permisosDe(['precios'], false)) && !tiene(S.permisosDe(['recibir'], false)))
  chk('super_admin: sí, con configurar', tiene(S.permisosDe([], true)) && S.permisosDe([], true).configurar === true)
  chk('produccion:configurar se lee aparte de las de conos', S.permisosDe(['configurar'], false).configurar === false && S.permisosDe([], false, ['configurar']).configurar === true)
  chk('la pantalla lee las tareas de conos Y de producción', /\.in\('modulo', \['conos', 'produccion'\]\)/.test(FUENTE))
  chk('el stock (conos_stock) solo se pide con ver o pedir', /if \(!estado\.perm\.ver && !estado\.perm\.pedir\) \{ estado\.conos = \[\]/.test(FUENTE))
}

// ── 2. Los filtros ──────────────────────────────────────────────────────────
{
  chk('los cinco filtros, en el orden del pedido', S.FILTROS_TODOS.map(x => x.t).join(' / ') === 'En producción / Apagados / Doble bolsa / Ilustración / Todos')
  const de = f => S.conosDeTodos(CAT, f, '')
  chk('Todos: las 26 marcas, también la rechazada y la nueva', de('todos').length === 26 && nombres(de('todos')).includes('RECHAZADO SA') && nombres(de('todos')).includes('HELADERÍA ÑANDÚ'))
  chk('En producción: las activas (23, con la nueva que se usa igual)', de('produccion').length === 23 && de('produccion').every(f => f.activa === true) && nombres(de('produccion')).includes('HELADERÍA ÑANDÚ'))
  chk('Apagados: las no activas (3, con la rechazada, como en Configuración)', de('apagados').length === 3 && de('apagados').every(f => f.activa !== true) && nombres(de('apagados')).includes('RECHAZADO SA'))
  chk('En producción + Apagados = Todos', de('produccion').length + de('apagados').length === de('todos').length)
  chk('Doble bolsa: QUINTANA, RIO y ÁRBOL VIEJO (aunque esté apagado)', nombres(de('doble')).join() === 'QUINTANA,RIO,ÁRBOL VIEJO', nombres(de('doble')).join())
  chk('Ilustración: los cuatro de papel ilustración', nombres(de('ilus')).sort().join() === 'MARBET,QUINTANA,RIO,RIO OLIMPICOS', nombres(de('ilus')).join())
  const n = S.cuentaTodos(CAT)
  chk('la cuenta de cada filtro', n.produccion === 23 && n.apagados === 3 && n.doble === 3 && n.ilus === 4 && n.todos === 26, JSON.stringify(n))
  chk('un filtro desconocido muestra todos', S.conosDeTodos(CAT, 'cualquiera', '').length === 26)
  chk('se respeta el orden de la base (activos primero)', de('todos')[0].activa === true && de('todos').at(-1).activa === false)
}

// ── 3. El buscador ──────────────────────────────────────────────────────────
{
  const b = (q, f = 'todos') => nombres(S.conosDeTodos(CAT, f, q))
  chk('sin acentos ni mayúsculas: "nandu" encuentra HELADERÍA ÑANDÚ', b('nandu').join() === 'HELADERÍA ÑANDÚ')
  chk('"ÁRBOL" con acento y "arbol" sin acento encuentran lo mismo', b('ÁRBOL').join() === 'ÁRBOL VIEJO' && b('arbol').join() === 'ÁRBOL VIEJO')
  chk('busca en cualquier parte del nombre ("olimp")', b('olimp').join() === 'RIO OLIMPICOS')
  chk('buscador + filtro: "rio" en Ilustración', b('rio', 'ilus').sort().join() === 'RIO,RIO OLIMPICOS')
  chk('"rio" en Doble bolsa: solo RIO', b('rio', 'doble').join() === 'RIO')
  chk('espacios en los bordes no cuentan', b('  aspen  ').join() === 'ASPEN')
  chk('nada que coincida: vacío', b('zzz').length === 0)
  chk('vacío: todos', b('').length === 26)
  chk('funciona sin el nombre ya normalizado', S.conosDeTodos(DATOS.rpc.conos_catalogo, 'todos', 'ñandu').length === 1)
  // Con 357 marcas, mil búsquedas tienen que tardar poco (lo de cada tecla).
  const G = copia(GRANDE.rpc.conos_catalogo)
  chk('la maqueta grande tiene 357 marcas, como la base', G.length === 357)
  const t0 = process.hrtime.bigint()
  for (let i = 0; i < 1000; i++) S.conosDeTodos(G, 'todos', ['h', 'he', 'hel', 'cafe', 'ñ'][i % 5])
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  chk('1.000 búsquedas sobre 357 marcas en menos de 1,5 s', ms < 1500, `${ms.toFixed(0)} ms`)
  chk('el nombre normalizado se guarda una vez al cargar (_buscar)', /_buscar: normalizarBusqueda\(f\.cono\)/.test(FUENTE))
  chk('el buscador pinta una vez por cuadro (requestAnimationFrame)', /cuadroTodos = requestAnimationFrame\(/.test(FUENTE))
  const t1 = process.hrtime.bigint()
  const html = G.map(f => S.htmlFilaTodos(f, S.permisosDe([], true))).join('')
  const ms2 = Number(process.hrtime.bigint() - t1) / 1e6
  chk('armar los 357 renglones tarda poco (< 200 ms)', ms2 < 200 && (html.match(/data-cat-cono=/g) || []).length === 357, `${ms2.toFixed(0)} ms`)
}

// ── 4. Cada interruptor manda SOLO su campo ─────────────────────────────────
{
  chk('los tres interruptores con los nombres del pedido', S.INTERRUPTORES.map(i => i.texto).join() === 'En producción,Doble bolsa,Ilustración')
  const p = (c, v) => JSON.stringify(S.paramsConfigurarCono('m1', c, v))
  chk('En producción: solo p_activa', p('activa', false) === '{"p_marca_id":"m1","p_activa":false,"p_doble_bolsa":null,"p_papel_ilustracion":null}', p('activa', false))
  chk('Doble bolsa: solo p_doble_bolsa', p('doble_bolsa', true) === '{"p_marca_id":"m1","p_activa":null,"p_doble_bolsa":true,"p_papel_ilustracion":null}', p('doble_bolsa', true))
  chk('Ilustración: solo p_papel_ilustracion', p('papel_ilustracion', true) === '{"p_marca_id":"m1","p_activa":null,"p_doble_bolsa":null,"p_papel_ilustracion":true}', p('papel_ilustracion', true))
  chk('el valor va como booleano', S.paramsConfigurarCono('m1', 'activa', 1).p_activa === true && S.paramsConfigurarCono('m1', 'activa', 0).p_activa === false)
  chk('un campo desconocido no manda nada', S.paramsConfigurarCono('m1', 'nombre', 'X') === null)
  chk('el cambio lo dispara el interruptor (data-configurar) con su campo', /if \(sw\) tocarInterruptor\(sw\.dataset\.configurar, sw\.dataset\.campo, sw\.checked\)/.test(FUENTE))
}

// ── 5. Permisos: cada combinación ───────────────────────────────────────────
{
  const claves = ['configurar', 'pedir', 'precios', 'ver', 'recibir']
  let todasBien = true, detalle = ''
  for (let m = 0; m < 32; m++) {
    const perm = Object.fromEntries(claves.map((k, i) => [k, !!(m & (1 << i))]))
    const esperado = {
      activa: perm.configurar, doble_bolsa: perm.configurar,
      papel_ilustracion: perm.configurar || perm.pedir || perm.precios,
    }
    const fila = { marca_id: 'm1', cono: 'ASPEN', activa: true, doble_bolsa: false, papel_ilustracion: false, estado_alta: 'aprobada', stock: 10 }
    const h = S.htmlFilaTodos(fila, perm)
    for (const campo of Object.keys(esperado)) {
      const puede = S.puedeTocar(perm, campo)
      const inp = h.match(new RegExp(`<input[^>]*data-campo="${campo}"[^>]*>`))?.[0] ?? ''
      const deshabilitado = / disabled/.test(inp)
      if (puede !== esperado[campo] || deshabilitado === esperado[campo] || !inp) {
        todasBien = false; detalle += ` ${JSON.stringify(perm)} ${campo};`
      }
    }
  }
  chk('las 32 combinaciones: cada interruptor habilitado SOLO con su permiso (y deshabilitado sin él)', todasBien, detalle)
  const nada = S.htmlFilaTodos({ marca_id: 'm1', cono: 'ASPEN', activa: true, doble_bolsa: true, papel_ilustracion: true }, {})
  chk('sin permiso los tres se VEN (con su valor) pero deshabilitados', (nada.match(/role="switch"[^>]* checked disabled/g) || []).length === 3)
  chk('… y dicen por qué', /title="Hace falta el permiso de configurar producción\."/.test(nada) &&
    /title="Para cambiar el papel hace falta el permiso de configurar producción, de armar pedidos de conos o de precios del papel\."/.test(nada))
  const pedir = S.htmlFilaTodos({ marca_id: 'm1', cono: 'ASPEN', activa: true }, S.permisosDe(['pedir'], false))
  chk('Pablo (conos:pedir): solo Ilustración habilitado', /data-campo="papel_ilustracion"(?![^>]*disabled)/.test(pedir) &&
    /data-campo="activa"[^>]*disabled/.test(pedir) && /data-campo="doble_bolsa"[^>]*disabled/.test(pedir))
  const conf = S.htmlFilaTodos({ marca_id: 'm1', cono: 'ASPEN', activa: true }, S.permisosDe([], false, ['configurar']))
  chk('quien configura producción: los tres habilitados', !/ disabled/.test(conf))
  const ocupado = S.htmlFilaTodos({ marca_id: 'm1', cono: 'ASPEN', activa: true }, S.permisosDe([], true), true)
  chk('mientras guarda, los tres quedan trabados aunque tenga permiso', (ocupado.match(/role="switch"[^>]*disabled/g) || []).length === 3)
  chk('cada interruptor es un role=switch con su nombre y el del cono', /role="switch"[^>]*aria-label="En producción: ASPEN"/.test(conf) &&
    /aria-label="Doble bolsa: ASPEN"/.test(conf) && /aria-label="Ilustración: ASPEN"/.test(conf))
  chk('tocarInterruptor vuelve a chequear el permiso antes de llamar', /!puedeTocar\(estado\.perm, campo\)\) \{ pintarFilaTodos\(marcaId\); return \}/.test(FUENTE))
}

// ── 6. El stock, solo con conos:ver ─────────────────────────────────────────
{
  const fila = { marca_id: 'm1', cono: 'ASPEN', activa: true, stock: 42000 }
  const conVer = S.htmlFilaTodos(fila, S.permisosDe(['ver'], false))
  chk('con conos:ver: el stock en formato argentino', />Stock<\/small>42\.000</.test(conVer))
  const sinVer = S.htmlFilaTodos({ ...fila, stock: 0 }, S.permisosDe(['pedir'], false))
  chk('sin conos:ver: NO se muestra (la base manda 0, no null)', !/Stock/.test(sinVer) && !/cn-cat-stock/.test(sinVer) && /cn-cat-fila--sin-stock/.test(sinVer))
  const sinVerConDato = S.htmlFilaTodos(fila, S.permisosDe(['pedir'], false, ['configurar']))
  chk('se decide por el permiso, no por el valor: con stock 42.000 y sin conos:ver tampoco', !/42\.000/.test(sinVerConDato))
  // Por ahora (21/10/2026) un negativo se ve 0 y sin bordó (test-conos-negativos.js prueba las dos posiciones).
  chk('stock negativo: se ve 0, sin bordó', /class="cn-cat-stock"><small>Stock<\/small>0</.test(S.htmlFilaTodos({ ...fila, stock: -2000 }, { ver: true })))
  chk('stock ausente: "—", nunca 0', />Stock<\/small>—</.test(S.htmlFilaTodos({ ...fila, stock: null }, { ver: true })))
}

// ── 7. "nuevo, a revisar" y los rechazados ──────────────────────────────────
{
  const nueva = CAT.find(f => f.estado_alta === 'pendiente_revision')
  const h = S.htmlFilaTodos(nueva, { configurar: true })
  chk('la nueva lleva "nuevo, a revisar"', /HELADERÍA ÑANDÚ <span class="cn-chip cn-chip--revisar">nuevo, a revisar<\/span>/.test(h), h.slice(0, 200))
  chk('la rechazada lleva "Rechazado"', /cn-chip--rechazado">Rechazado</.test(S.htmlFilaTodos(CAT.find(f => f.estado_alta === 'rechazada'), {})))
  chk('una aceptada no lleva etiqueta', !/cn-chip/.test(S.htmlFilaTodos(CAT.find(f => f.cono === 'ASPEN'), {})))
  chk('acá NO se aprueba: ningún Aceptar / Rechazar ni revisar_marca', !/revisar_marca|data-pend-si|data-pend-no|>Aceptar</.test(FUENTE))
  const aviso = S.htmlAvisoRevisar(CAT, { configurar: true })
  chk('arriba dice cuántos hay y DÓNDE se aceptan', /Hay 1 cono nuevo, a revisar\. Se aceptan o se rechazan en <a href="produccion-gestion\.html\?vista=conos">Producción → Configuración → Marcas \/ Conos<\/a>/.test(aviso), aviso)
  chk('el enlace solo para quien puede aceptarlos (configurar)', !/<a /.test(S.htmlAvisoRevisar(CAT, { pedir: true })) && /Marcas \/ Conos/.test(S.htmlAvisoRevisar(CAT, { pedir: true })))
  chk('dos nuevas: "Hay 2 conos nuevos"', /Hay 2 conos nuevos, a revisar/.test(S.htmlAvisoRevisar([nueva, { ...nueva, marca_id: 'x' }], {})))
  chk('sin nuevas, sin aviso', S.htmlAvisoRevisar(CAT.filter(f => f !== nueva), { configurar: true }) === '')
}

// ── 8. Al tocar: lo que devuelve la base, o vuelve atrás ────────────────────
esperas.push((async () => {
  const f = { marca_id: 'm1', cono: 'ASPEN', activa: true, doble_bolsa: false, papel_ilustracion: false, _buscar: 'aspen' }
  const llamadas = []
  let durante = null
  const r = await S.guardarInterruptor(f, 'doble_bolsa', true, async (n, p) => {
    llamadas.push([n, p])
    return { marca_id: 'm1', cono: 'ASPEN 2', activa: true, doble_bolsa: true, papel_ilustracion: true }
  }, () => { durante = f.doble_bolsa })
  chk('llama a configurar_cono una vez, con solo doble bolsa', llamadas.length === 1 && llamadas[0][0] === 'configurar_cono' &&
    JSON.stringify(llamadas[0][1]) === '{"p_marca_id":"m1","p_activa":null,"p_doble_bolsa":true,"p_papel_ilustracion":null}')
  chk('mientras guarda ya muestra el valor nuevo (y se pinta: alCambiar)', durante === true)
  chk('queda como lo devolvió la base (también lo que no tocó)', r.ok === true && f.doble_bolsa === true && f.papel_ilustracion === true && f.cono === 'ASPEN 2' && f._buscar === 'aspen 2')

  const g = { marca_id: 'm2', cono: 'RIO', activa: true, doble_bolsa: true, papel_ilustracion: true }
  const r2 = await S.guardarInterruptor(g, 'activa', false, async () => { throw { message: 'Para prender o apagar un cono o marcar doble bolsa hace falta el permiso de configurar producción.' } })
  chk('si la base lo rechaza, VUELVE al valor de antes', r2.ok === false && g.activa === true)
  chk('… y el error, tal cual', r2.error === 'Para prender o apagar un cono o marcar doble bolsa hace falta el permiso de configurar producción.', r2.error)
  const r3 = await S.guardarInterruptor(g, 'papel_ilustracion', false, async () => { throw undefined })
  chk('sin respuesta: un texto que se entiende', r3.ok === false && g.papel_ilustracion === true && /Revisá la conexión/.test(r3.error))

  const h = { marca_id: 'm3', cono: 'MAS', activa: false }
  await S.guardarInterruptor(h, 'activa', true, async () => ({ marca_id: 'OTRO', activa: false }))
  chk('una respuesta de OTRO cono no pisa la fila', h.activa === true)
  await S.guardarInterruptor(h, 'activa', false, async () => null)
  chk('una respuesta vacía deja el valor que se puso', h.activa === false)
  chk('el error queda pegado al renglón', /<div class="cn-error cn-cat-error" role="alert">No &lt;b&gt;\.<\/div>/.test(S.htmlFilaTodos(h, {}, false, 'No <b>.')))
  chk('los avisos de guardado', S.textoGuardado({ cono: 'X', activa: true }, 'activa') === 'X: en producción.' &&
    S.textoGuardado({ cono: 'X', doble_bolsa: false }, 'doble_bolsa') === 'X ya no va con doble bolsa.' &&
    S.textoGuardado({ cono: 'X', papel_ilustracion: true }, 'papel_ilustracion') === 'X va en papel Ilustración.')
  chk('al tocar se repinta SOLO ese renglón, no la lista entera', /const r = await guardarInterruptor\(f, campo, valor, rpc, \(\) => pintarFilaTodos\(marcaId\)\)/.test(FUENTE) &&
    /el\.outerHTML = htmlFilaDe\(f\)/.test(FUENTE))
  chk('un segundo toque mientras guarda no manda nada', /estado\.conosOcupados\.has\(marcaId\) \|\|/.test(FUENTE))
  chk('la lista no se rearma al tocar (no desaparece bajo el dedo)', !/function tocarInterruptor[\s\S]{0,900}estado\.listaTodos = null/.test(FUENTE))
})())

// ── 9. El escape ────────────────────────────────────────────────────────────
{
  const mala = { marca_id: '"><i>', cono: 'VIEJO <b>X</b>', activa: false, estado_alta: 'pendiente_revision', stock: 1 }
  const h = S.htmlFilaTodos(mala, { ver: true, configurar: true })
  chk('el nombre y el id van escapados', !/<b>X<\/b>|<i>/.test(h) && /VIEJO &lt;b&gt;X&lt;\/b&gt;/.test(h) && /data-cat-cono="&quot;&gt;&lt;i&gt;"/.test(h))
}

// ── 10. Las dos pantallas muestran lo mismo ─────────────────────────────────
{
  chk('Configuración: el interruptor se llama "En producción"', /aria-label="En producción: \$\{esc\(m\.nombre\)\}"/.test(FUENTE_GESTION) && />EN PRODUCCIÓN</.test(FUENTE_GESTION))
  chk('Configuración: tiene "Doble bolsa" e "Ilustración"', /aria-label="Doble bolsa: \$\{esc\(m\.nombre\)\}"/.test(FUENTE_GESTION) &&
    /data-marca-ilus="\$\{esc\(m\.id\)\}"\$\{m\.papel_ilustracion \? ' checked' : ''\}/.test(FUENTE_GESTION) && />ILUSTRACIÓN</.test(FUENTE_GESTION))
  chk('Configuración: lee papel_ilustracion', /\.select\('id, nombre, activa, estado_alta, creada_por, creada_en, doble_bolsa, papel_ilustracion'\)/.test(FUENTE_GESTION))
  chk('Configuración: Ilustración va a configurar_cono con solo ese campo',
    /supabase\.rpc\('configurar_cono', \{ p_marca_id: m\.id, p_activa: null, p_doble_bolsa: null, p_papel_ilustracion: !!valor \}\)/.test(FUENTE_GESTION))
  chk('Configuración: los nuevos dicen "Nuevo, a revisar"', /pendiente_revision: \['Nuevo, a revisar', 'naranja'\]/.test(FUENTE_GESTION))
  chk('Configuración: el filtro también dice "En producción"', /\['activos', 'En producción'\]/.test(FUENTE_GESTION))
  chk('Configuración muestra en Todos también los rechazados, como acá', /if \(filtro === 'apagados'\) return todas\.filter\(m => m\.estado_alta !== 'pendiente_revision' && !m\.activa\)\n\s+return todas/.test(FUENTE_GESTION))
}

// ── 11. Nada de lo que había se perdió ──────────────────────────────────────
// Baseline: el commit FIJO de abajo (main antes de esta pestaña), NUNCA HEAD.
// Todo id y todo atributo data-* de las dos pantallas en ese commit sigue en
// el archivo de hoy. ARCHIVO_BASE / ARCHIVO_BASE_GESTION: archivos ya
// extraídos que reemplazan al `git show`.
{
  const BASE_COMMIT = 'e9fdabf'
  const base = (env, ruta) => {
    if (process.env[env]) return fs.readFileSync(process.env[env], 'utf8')
    try {
      return require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:${ruta}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { return null }
  }
  const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
  for (const [nombre, env, ruta, hoy] of [['conos.html', 'ARCHIVO_BASE', 'modulos/conos.html', FUENTE],
    ['produccion-gestion.html', 'ARCHIVO_BASE_GESTION', 'modulos/produccion-gestion.html', FUENTE_GESTION]]) {
    const antes = base(env, ruta)
    chk(`${nombre}: se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
    if (!antes) continue
    const ahora = marcas(hoy)
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
    chk(`${nombre}: ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
  }
}

fin()
