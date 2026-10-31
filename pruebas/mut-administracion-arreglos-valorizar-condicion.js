// Mutaciones de test-administracion-arreglos-valorizar-condicion.js (los
// arreglos de la auditoría del 30/10/2026, puntos 1 y 6: revalorizar sin
// leer las condiciones, el bulto con precio_lista, la condición desactivada,
// "sin condición" leído de la base y no salir de la ficha si no se guardó).
// Mutan modulos/administracion.html, que la suite recibe por ARCHIVO_TEST.
// Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = 1c20f98, de donde salió la rama
// de los arreglos). Nunca HEAD.
//
//   node pruebas/mut-administracion-arreglos-valorizar-condicion.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-arreglos-valorizar-condicion.js')
const BASE = '1c20f98'
const CONSTANTE = 'texto constante del código: sin texto de la base'

if (!process.env.MUT_SOLO_ANCLAS) {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-arreglos-valorizar-condicion.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  region: limitesAdministracion,
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlDesactivadasValorizar', 'htmlBloqueoCondicionesValorizar', 'htmlClienteSinLeerFacturar'],
  equivalentes: [
    { expr: 'esc(AVISO_CONDICIONES_SIN_LEER)', motivo: CONSTANTE + ' (el aviso de Facu)' },
    { expr: 'esc(fc.errorCondicionCliente)', motivo: CONSTANTE + ' (leerPctClienteFacturar solo pone uno fijo)' },
  ],
  manuales: [
    // 1a: revalorizar sin leer las condiciones
    { nombre: '1a: Guardar manda [] sin las condiciones leídas', de: '      if (bloqueo) { v.errorGuardar = bloqueo; pintarOrden(); return }\n', a: '' },
    { nombre: '1a: no se marca la falla de lectura', de: '      v.condicionesSinLeer = !!resto.error || !!resto.condiciones?.error\n', a: '      v.condicionesSinLeer = false\n' },
    { nombre: '1a: la falla de una lectura de antes no cuenta', de: '      v.condicionesSinLeer = !!resto.error || !!resto.condiciones?.error\n', a: '      v.condicionesSinLeer = !!resto.condiciones?.error\n' },
    { nombre: '1a: bloquea aunque la orden no tuviera condiciones', de: '      return condicionesPreviasValorizar(d).length ? AVISO_CONDICIONES_SIN_LEER : null', a: '      return AVISO_CONDICIONES_SIN_LEER' },
    { nombre: '1a: Guardar no se apaga', de: "id=\"ad-valorizar-guardar\"${bloqueoCondicionesValorizar(d) ? ' disabled' : ''}>", a: 'id="ad-valorizar-guardar">' },
    { nombre: '1a: sin el aviso en pantalla', de: '      if (bloqueoCondicionesValorizar(d)) return htmlBloqueoCondicionesValorizar()\n', a: '' },
    { nombre: '1a: volver a leer no desbloquea', de: 'v.errorCondiciones = null; v.condicionesSinLeer = false }', a: 'v.errorCondiciones = null }' },
    { nombre: '1a: volver a leer no trae los tildes', de: '      if (!r.error) { v.condiciones = r.lista; ', a: '      if (!r.error) { ' },
    // 1b: el bulto con precio_lista
    { nombre: '1b: con precio_lista se usa el subtotal descontado', de: '      if (numeroONull(it?.precio_lista) !== null) return { decimalesBase: 2 }\n', a: '' },
    { nombre: '1b: prepararPreciosPorBulto sin la regla nueva', de: '          ? opcionesBultoGuardado(it)\n', a: '          ? { decimalesBase: 2, subtotal: it.subtotal, cantidad: it.cantidad }\n' },
    // 1c: la condición desactivada que la orden tenía
    { nombre: '1c: solo las activas aunque la orden tenga condiciones', de: 'p_solo_activas: !conPrevias }', a: 'p_solo_activas: true }' },
    { nombre: '1c: la desactivada previa se filtra', de: '(k.activa !== false || (conPrevias && previas.includes(k.id)))', a: 'k.activa !== false' },
    { nombre: '1c: entran todas las inactivas', de: '(conPrevias && previas.includes(k.id))', a: 'conPrevias' },
    { nombre: '1c: no se pasan las de la orden', de: 'leerCondicionesValorizar(o.cliente_id, [...v.elegidas])', a: 'leerCondicionesValorizar(o.cliente_id)' },
    { nombre: '1c: sin "(desactivada)"', de: "(k.activa === false ? ' (desactivada)' : '')", a: "''" },
    { nombre: '1c: sin el aviso de la desactivada', de: '+ htmlDesactivadasValorizar(lista) +', a: '+' },
    { nombre: '1c: el aviso con las activas también', de: '      const desact = (lista ?? []).filter(k => k?.activa === false)\n', a: '      const desact = lista ?? []\n' },
    // 6: "sin condición" de la base
    { nombre: '6: arranca con "sin condición" de la lista', de: 'clienteSinCondicion: null, cliente: nuevoClienteFacturar(), errorCondicionCliente: null,', a: 'clienteSinCondicion: numeroONulo(cli?.pct_parte_a) === null, cliente: nuevoClienteFacturar(), errorCondicionCliente: null,' },
    { nombre: '6: no lee el cliente de la base', de: '      const leido = await leerPctClienteFacturar(o.cliente_id)\n', a: '      const leido = { pct: numeroONulo(cli?.pct_parte_a), error: null }\n' },
    { nombre: '6: "sin condición" sale de la lista', de: '      fc.clienteSinCondicion = leido.error ? null : leido.pct === null\n', a: '      fc.clienteSinCondicion = numeroONulo(cli?.pct_parte_a) === null\n' },
    { nombre: '6: lectura fallida = sin condición', de: 'fc.clienteSinCondicion = leido.error ? null : leido.pct === null', a: 'fc.clienteSinCondicion = leido.pct === null' },
    { nombre: '6: el % de la lista vieja', de: 'pctInicialFacturar(o, leido.error ? cli : { pct_parte_a: leido.pct })', a: 'pctInicialFacturar(o, cli)' },
    { nombre: '6: sin la fila = sin condición', de: "        if (!data) throw new Error('No se encontró el cliente.')\n", a: '        if (!data) return { pct: null, error: null }\n' },
    { nombre: '6: sin el aviso de "no se pudo leer"', de: ': htmlClienteSinLeerFacturar(fc)', a: ": ''" },
    { nombre: '6: la lista de clientes no se entera', de: '        estado.clientes = estado.clientes.map(c => c.id === fc.clienteId ? { ...c, pct_parte_a: leido.pct } : c)\n', a: '' },
    // 6: no salir de la ficha si no se guardó
    { nombre: '6: sale de la ficha sin esperar el guardado', de: '      else guardarCondicionAlSalir(f)\n      return true\n', a: '      else guardarCondicionAlSalir(f)\n      return false\n' },
    { nombre: '6: bien guardada no sigue', de: '      salida()\n    }', a: '    }' },
    { nombre: '6: con un envío en camino sale igual', de: '      if (f.condicion.enviando) esperarEnvioYSalir(f)\n', a: '      if (f.condicion.enviando) return false\n' },
    { nombre: '6: no avisa el fin del envío', de: '        avisarFinEnvioFicha(f)\n', a: '' },
    { nombre: '6: otra ficha se abre igual', de: 'retenerEnFicha(() => abrirFicha(clienteId))) return', a: 'retenerEnFicha(() => abrirFicha(clienteId)) && false) return' },
  ],
})
