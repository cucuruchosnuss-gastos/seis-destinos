// Las preferencias de cada persona en la cuenta (js/preferencias.js,
// 29/09/2026): mis_preferencias() y guardar_mis_preferencias(p_datos). Se
// EJECUTAN las funciones reales con una base falsa y un localStorage falso:
//  - se leen de la cuenta UNA vez por página (la barra y el tablero comparten);
//  - la primera vez (la cuenta devuelve {}) se sube lo del dispositivo;
//  - lo guardado mientras se esperaba a la cuenta gana y se sube;
//  - cada cambio se sube, en orden, con la marca v: 1;
//  - si la cuenta no contesta o no guarda, queda la copia del dispositivo y
//    dondeSeGuardanPrefs() lo dice;
//  - el uso guarda 100 aperturas por módulo (debajo del tope de la base).
//
//   node pruebas/test-preferencias.js
//   ARCHIVO_TEST=<copia de js/preferencias.js>

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'js', 'preferencias.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const FUNCIONES = ['clavePrefs', 'prefsVacias', 'normalizarPrefs', 'leerCopia', 'escribirCopia', 'sonDeFabrica', 'leerPrefs', 'guardarPrefs',
  'subirPrefs', 'cargarPrefs', 'dondeSeGuardanPrefs', 'anotarUso', 'vecesUsado']
function construir() {
  let codigo = `
    var __ls = new Map()
    var localStorage = { getItem(k) { return __ls.has(k) ? __ls.get(k) : null }, setItem(k, v) { __ls.set(k, String(v)) } }
    var globalThis = { localStorage }
    var console = { warn() {}, error() {}, log() {} }
  `
  for (const c of ['ORDENES_BARRA', 'TAMANOS', 'DIAS_USO', 'MS_DIA', 'TOPE_USO', 'VERSION_PREFS', 'ESTADO_PREFS']) codigo += extraerConst(src, c)
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, TOPE_USO, __ls }`
  return new Function(codigo)()
}

// Una base falsa: `cuenta` es lo que devuelve mis_preferencias (o un error);
// `demorar` deja la lectura esperando hasta llamar a sb.contestar().
// `retrasos`: cuánto tarda cada guardado (ms); lo que queda en la cuenta es el
// ÚLTIMO que TERMINA, como en la base de verdad.
function base({ cuenta = {}, errorLeer = null, errorGuardar = null, demorar = false, retrasos = [] } = {}) {
  const sb = { lecturas: 0, guardadas: [], contestar: null, enCuenta: null }
  sb.rpc = (nombre, args) => {
    if (nombre === 'mis_preferencias') {
      sb.lecturas++
      const r = errorLeer ? { data: null, error: errorLeer } : { data: cuenta, error: null }
      if (!demorar) return Promise.resolve(r)
      return new Promise(ok => { sb.contestar = () => ok(r) })
    }
    if (nombre === 'guardar_mis_preferencias') {
      sb.guardadas.push(args?.p_datos)
      const r = errorGuardar ? { data: null, error: errorGuardar } : { data: null, error: null }
      const ms = retrasos[sb.guardadas.length - 1] ?? 0
      return new Promise(ok => setTimeout(() => { if (!r.error) sb.enCuenta = args?.p_datos; ok(r) }, ms))
    }
    return Promise.resolve({ data: null, error: { message: 'rpc desconocida' } })
  }
  return sb
}
const conFijado = (clave) => ({ barra: { orden: 'mano', manual: [], fijados: [clave] }, tablero: { orden: [], tamanos: {}, ocultas: [] }, uso: {} })

esperas.push((async () => {
  // 1. La cuenta tiene preferencias: mandan, y se copian al dispositivo.
  {
    const S = construir()
    S.__ls.set('sd.prefs.e1', JSON.stringify(conFijado('caja')))
    const sb = base({ cuenta: { v: 1, ...conFijado('gastos') } })
    const p = await S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('1. mandan las de la cuenta', p.barra.fijados.join() === 'gastos', p.barra.fijados.join())
    chk('1. la copia del dispositivo queda igual a la cuenta', JSON.parse(S.__ls.get('sd.prefs.e1')).barra.fijados.join() === 'gastos')
    chk('1. dónde: en la cuenta', S.dondeSeGuardanPrefs('e1') === 'cuenta')
    chk('1. leerPrefs devuelve las de la cuenta', S.leerPrefs('e1').barra.fijados.join() === 'gastos')
    chk('1. no sube nada al leer', sb.guardadas.length === 0)
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('1. una sola lectura por página (la barra y el tablero comparten)', sb.lecturas === 1)
  }
  // 2. La primera vez: la cuenta devuelve {} y el dispositivo tiene algo → se sube.
  {
    const S = construir()
    S.__ls.set('sd.prefs.e1', JSON.stringify(conFijado('caja')))
    const sb = base({ cuenta: {} })
    const p = await S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('2. la primera vez se usa lo del dispositivo', p.barra.fijados.join() === 'caja')
    chk('2. y se sube a la cuenta, con la marca v: 1', sb.guardadas.length === 1 && sb.guardadas[0].v === 1 && sb.guardadas[0].barra.fijados.join() === 'caja', JSON.stringify(sb.guardadas))
  }
  // 3. La primera vez sin nada en el dispositivo: no se sube nada.
  {
    const S = construir()
    const sb = base({ cuenta: {} })
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('3. sin nada guardado en ningún lado, no se sube nada', sb.guardadas.length === 0 && S.dondeSeGuardanPrefs('e1') === 'cuenta')
    S.guardarPrefs('e1', conFijado('stock'))
    await new Promise(r => setImmediate(r))
    chk('3. el primer cambio sí se sube', sb.guardadas.length === 1 && sb.guardadas[0].barra.fijados.join() === 'stock')
  }
  // 4. La cuenta no contesta: queda la copia del dispositivo, y lo dice.
  {
    const S = construir()
    S.__ls.set('sd.prefs.e1', JSON.stringify(conFijado('caja')))
    const sb = base({ errorLeer: { message: 'sin red' } })
    const p = await S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('4. sin cuenta, la copia del dispositivo', p.barra.fijados.join() === 'caja')
    chk('4. dónde: en el dispositivo', S.dondeSeGuardanPrefs('e1') === 'dispositivo')
    S.guardarPrefs('e1', conFijado('gastos'))
    await new Promise(r => setImmediate(r))
    chk('4. sin cuenta, guardar no intenta subir (y la copia queda)', sb.guardadas.length === 0 && JSON.parse(S.__ls.get('sd.prefs.e1')).barra.fijados.join() === 'gastos')
  }
  // 5. Una respuesta que no es un objeto se trata como que no contestó.
  {
    const S = construir()
    const sb = base({ cuenta: [1, 2] })
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('5. mis_preferencias con un arreglo: dispositivo', S.dondeSeGuardanPrefs('e1') === 'dispositivo')
  }
  // 6. Guardar mientras se espera a la cuenta: gana lo guardado y se sube.
  {
    const S = construir()
    const sb = base({ cuenta: { v: 1, ...conFijado('gastos') }, demorar: true })
    const carga = S.cargarPrefs({ sb, empleadoId: 'e1' })
    chk('6. mientras espera, dónde: cargando', S.dondeSeGuardanPrefs('e1') === 'cargando')
    S.guardarPrefs('e1', conFijado('pedidos'))
    chk('6. mientras espera no se sube nada', sb.guardadas.length === 0)
    await new Promise(r => setImmediate(r))
    sb.contestar()
    const p = await carga
    chk('6. al contestar gana lo que se guardó mientras tanto', p.barra.fijados.join() === 'pedidos' && S.leerPrefs('e1').barra.fijados.join() === 'pedidos')
    chk('6. y se sube', sb.guardadas.length === 1 && sb.guardadas[0].barra.fijados.join() === 'pedidos')
  }
  // 7. Varios cambios seguidos se suben en orden; el último es el que queda.
  {
    const S = construir()
    const sb = base({ cuenta: { v: 1, ...conFijado('gastos') } })
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    S.guardarPrefs('e1', conFijado('caja'))
    S.guardarPrefs('e1', conFijado('stock'))
    await new Promise(r => setTimeout(r, 5))
    chk('7. cada cambio se sube, en orden', sb.guardadas.map(g => g.barra.fijados[0]).join() === 'caja,stock', sb.guardadas.map(g => g.barra.fijados[0]).join())
    chk('7. lo que se sube está limpio (normalizado) y con v: 1', sb.guardadas.every(g => g.v === 1 && Array.isArray(g.tablero.orden)))
  }
  // 7b. Un guardado lento no pisa al siguiente: van de a uno.
  {
    const S = construir()
    const sb = base({ cuenta: { v: 1, ...conFijado('gastos') }, retrasos: [30, 0] })
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    S.guardarPrefs('e1', conFijado('caja'))
    S.guardarPrefs('e1', conFijado('stock'))
    await new Promise(r => setTimeout(r, 60))
    chk('7b. en la cuenta queda el ÚLTIMO cambio aunque el anterior tarde más', sb.enCuenta?.barra?.fijados?.join() === 'stock', sb.enCuenta?.barra?.fijados?.join())
  }
  // 7c. Sin copia en el dispositivo (localStorage que no deja escribir), lo guardado sigue en memoria.
  {
    const S = construir()
    const lsRoto = { getItem() { return null }, setItem() { throw new Error('lleno') } }
    const sb = base({ cuenta: { v: 1, ...conFijado('gastos') } })
    await S.cargarPrefs({ sb, empleadoId: 'e1', ls: lsRoto })
    const ok = S.guardarPrefs('e1', conFijado('caja'), lsRoto)
    chk('7c. guardarPrefs dice que la copia no se pudo escribir', ok === false)
    chk('7c. pero leerPrefs devuelve lo guardado (memoria)', S.leerPrefs('e1', lsRoto).barra.fijados.join() === 'caja')
    await new Promise(r => setTimeout(r, 5))
    chk('7c. y se subió a la cuenta', sb.enCuenta?.barra?.fijados?.join() === 'caja')
  }
  // 8. Si la cuenta no guarda, queda la copia y se dice.
  {
    const S = construir()
    const sb = base({ cuenta: { v: 1, ...conFijado('gastos') }, errorGuardar: { message: 'Las preferencias son demasiado grandes.' } })
    await S.cargarPrefs({ sb, empleadoId: 'e1' })
    S.guardarPrefs('e1', conFijado('caja'))
    await new Promise(r => setTimeout(r, 5))
    chk('8. si guardar falla: dónde = dispositivo', S.dondeSeGuardanPrefs('e1') === 'dispositivo')
    chk('8. la copia del dispositivo tiene el cambio', JSON.parse(S.__ls.get('sd.prefs.e1')).barra.fijados.join() === 'caja')
  }
  // 9. El uso: 100 aperturas por módulo, y todo entra en el tope de la base.
  {
    const S = construir()
    let p = S.prefsVacias()
    const ahora = Date.UTC(2026, 8, 29)
    for (let i = 0; i < 150; i++) p = S.anotarUso(p, 'caja', ahora + i)
    chk('9. se guardan como mucho 100 aperturas por módulo', p.uso.caja.length === 100 && S.TOPE_USO === 100, p.uso.caja.length)
    const claves = ['gastos', 'caja', 'cuentas-corrientes', 'accesos', 'empleados', 'materia-prima', 'stock', 'cobranzas', 'cheques', 'produccion',
      'pedidos', 'retiros', 'administracion', 'taller', 'dashboard', 'seguridad']
    const grande = { v: 1, ...S.prefsVacias(), uso: Object.fromEntries(claves.map(k => [k, Array.from({ length: S.TOPE_USO }, (_, i) => 1790000000000 + i)])) }
    chk('9. con todos los módulos al tope, entra en los 50.000 de guardar_mis_preferencias', JSON.stringify(grande).length < 50000, JSON.stringify(grande).length)
  }
  // 10. Sin persona no se consulta nada.
  {
    const S = construir()
    const sb = base()
    const p = await S.cargarPrefs({ sb, empleadoId: null })
    chk('10. sin persona: las de fábrica y ninguna lectura', sb.lecturas === 0 && S.sonDeFabrica(p))
  }
})())
fin()
