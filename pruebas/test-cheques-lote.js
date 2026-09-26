// Parte 8 del módulo Cheques (22/09/2026): dar salida a los seleccionados.
//
// marcar_salida_cheques(p_cheque_ids uuid[], p_tipo, p_fecha, p_destino) es
// TODO O NADA (verificado con pg_get_functiondef el 22/09/2026): si uno no
// puede salir, no sale ninguno y el mensaje dice cuál y por qué; devuelve
// cuántos salieron; tope de 100. La pantalla habilita "Dar salida a N" solo si
// TODOS están en cartera y son de cobranzas asentadas, y con `procesar`.
//
//   node pruebas/test-cheques-lote.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
// La cartera vive en una región de administracion.html: FUENTE es esa región.
const FUENTE = leerCheques(ARCHIVO)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

// El mensaje EXACTO que arma la base cuando uno no puede salir (el formato de
// marcar_salida_cheques + el de marcar_salida_cheque, leídos de la base).
const MSG_BASE = 'No salió ninguno. El cheque 007 Nº 22222222 no puede salir: Solo se puede marcar la salida de un cheque de una cobranza asentada.'

function armar({ tareas = ['cobranzas:ver_todo', 'cobranzas:procesar'] } = {}) {
  const S = construirCheques(ARCHIVO)
  S.estado.misTareas = new Set(tareas)
  S.estado.cobranzas = new Map([
    ['asentada', { id: 'asentada', cliente: 'Molino', estado: 'procesada', fecha: '2026-09-01' }],
    ['asentada2', { id: 'asentada2', cliente: 'Kiosco', estado: 'procesada', fecha: '2026-09-10' }],
    ['porControlar', { id: 'porControlar', cliente: 'Don Pepe', estado: 'registrada', fecha: '2026-09-01' }],
  ])
  const base = { banco_codigo: '007', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null }
  S.estado.filas = [
    { ...base, id: 'a', cobranza_id: 'asentada', numero: '11111111', importe: 100000, estado: 'en_cartera' },
    { ...base, id: 'b', cobranza_id: 'asentada2', numero: '33333333', importe: 4000000, estado: 'en_cartera' },
    { ...base, id: 'c', cobranza_id: 'porControlar', numero: '22222222', importe: 5, estado: 'en_cartera' },
    { ...base, id: 'd', cobranza_id: 'asentada', numero: '44444444', importe: 7, estado: 'depositado', salida_fecha: '2026-09-10' },
  ]
  S.estado.seleccion = { activa: true, ids: new Set(), ultimo: null, noPueden: new Set() }
  return S
}

// ── Habilitado y deshabilitado ───────────────────────────────────────────
{
  const S = armar()
  const btn = S.__doc.getElementById('chq-sel-dar-salida')
  const aviso = S.__doc.getElementById('chq-sel-no-salen')
  S.pintarSalidaLote()
  chk('sin nada elegido: no hay botón', btn.hidden === true)
  S.estado.seleccion.ids = new Set(['a', 'b'])
  S.pintarSalidaLote()
  chk('dos en cartera y asentadas: "Dar salida a 2", habilitado', btn.hidden === false && btn.disabled === false && btn.textContent === 'Dar salida a 2', btn.textContent)
  chk('… sin aviso', aviso.hidden === true)
  S.estado.seleccion.ids = new Set(['a', 'c'])
  S.pintarSalidaLote()
  chk('uno de una cobranza por controlar: deshabilitado', btn.disabled === true)
  chk('… y dice "Hay 1 cheque que no puede salir"', aviso.hidden === false && /^Hay 1 cheque que no puede salir/.test(aviso.textContent), aviso.textContent)
  chk('… y lo marca', S.estado.seleccion.noPueden.has('c') && !S.estado.seleccion.noPueden.has('a'))
  S.estado.seleccion.ids = new Set(['a', 'c', 'd'])
  S.pintarSalidaLote()
  chk('uno que ya salió tampoco puede: "Hay 2 cheques que no pueden salir"', /^Hay 2 cheques que no pueden salir/.test(aviso.textContent) && S.estado.seleccion.noPueden.size === 2)
  const tabla = S.htmlTablaCheques(S.estado.filas, S.estado.cobranzas)
  chk('los que no pueden salir van marcados en la tabla', /class="[^"]*chq-tabla__fila--no-sale[^"]*" data-cheque-fila="c"/.test(tabla) && !/chq-tabla__fila--no-sale[^"]*" data-cheque-fila="a"/.test(tabla))
  chk('… y en la tarjeta', /chq-tarjeta--no-sale/.test(S.htmlTarjetaCheque(S.estado.filas[2], S.estado.cobranzas.get('porControlar'))))

  // Tope de 100.
  S.estado.filas = Array.from({ length: 101 }, (_, i) => ({ id: 'x' + i, cobranza_id: 'asentada', numero: String(i), estado: 'en_cartera', importe: 1, tipo: 'comun', fecha_emision: '2026-09-01' }))
  S.estado.seleccion.ids = new Set(S.estado.filas.map(x => x.id))
  S.pintarSalidaLote()
  chk('más de 100: deshabilitado y lo dice', btn.disabled === true && /hasta 100 cheques a la vez: elegiste 101/.test(aviso.textContent), aviso.textContent)
  S.estado.seleccion.ids = new Set(S.estado.filas.slice(0, 100).map(x => x.id))
  S.pintarSalidaLote()
  chk('100 justos: habilitado', btn.disabled === false)
}
{
  const S = armar({ tareas: ['cobranzas:ver_todo'] })
  S.estado.seleccion.ids = new Set(['a', 'b'])
  S.pintarSalidaLote()
  chk('sin cobranzas:procesar no hay botón (la RPC lo rechazaría)', S.__doc.getElementById('chq-sel-dar-salida').hidden === true)
  S.estado.miRolApp = 'super_admin'
  S.pintarSalidaLote()
  chk('super_admin sí (bypass)', S.__doc.getElementById('chq-sel-dar-salida').hidden === false)
}

// ── El diálogo, el payload exacto, el error entero y la limpieza ─────────
{
  const S = armar()
  const doc = S.__doc
  S.estado.seleccion.ids = new Set(['a', 'b'])
  S.abrirModalSalidaLote()
  chk('abre el MISMO diálogo de salida', doc.getElementById('chq-modal-salida').hidden === false && S.estado.salida?.lote === true)
  chk('título: "Dar salida a 2 cheques · $ 4.100.000,00"', doc.getElementById('chq-salida-titulo').textContent === 'Dar salida a 2 cheques · $ 4.100.000,00',
    doc.getElementById('chq-salida-titulo').textContent)
  const lista = doc.getElementById('chq-salida-cheques')
  chk('la lista corta de los cheques, por textContent', lista.textContent.split('\n').length === 2 && /N° 11111111 · Banco 007/.test(lista.textContent) && lista.innerHTML === '')
  chk('la fecha no puede ser anterior a la cobranza MÁS NUEVA de los elegidos', doc.getElementById('chq-salida-fecha').min === '2026-09-10')
  chk('la fecha arranca en hoy', doc.getElementById('chq-salida-fecha').value === S.hoyArgentina())
  // Un endoso a otra cobranza anterior a la más nueva: no sigue.
  S.estado.salida.tipo = 'depositado'
  doc.getElementById('chq-salida-fecha').value = '2026-09-05'
  const llamadas = []
  S.__setRpc(async (...a) => { llamadas.push(a); return { data: 2, error: null } })
  esperas.push((async () => {
    await S.confirmarSalida()
    chk('una fecha anterior a la cobranza más nueva: no llama a la base', llamadas.length === 0 && /anterior a la cobranza/.test(doc.getElementById('chq-salida-error').textContent))

    // La base rechaza: el mensaje ENTERO, y no sale ninguno.
    doc.getElementById('chq-salida-fecha').value = S.hoyArgentina()
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: { message: MSG_BASE } } })
    await S.confirmarSalida()
    chk('el error de la base se muestra ENTERO', doc.getElementById('chq-salida-error').textContent === MSG_BASE, doc.getElementById('chq-salida-error').textContent)
    chk('con error el diálogo sigue abierto y la selección intacta', doc.getElementById('chq-modal-salida').hidden === false && S.estado.seleccion.ids.size === 2)

    // Sale bien: el payload exacto, limpia, recarga y avisa.
    const antes = S.__llamadas.refrescar
    llamadas.length = 0
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: 2, error: null } })
    S.estado.salida.tipo = 'endosado'
    doc.getElementById('chq-salida-destino').value = '  Molino del Sur SA  '
    await S.confirmarSalida()
    const ult = llamadas[0]
    chk('llama a marcar_salida_cheques con el payload EXACTO', ult && ult[0] === 'marcar_salida_cheques' &&
      JSON.stringify(ult[1]) === JSON.stringify({ p_cheque_ids: ['a', 'b'], p_tipo: 'endosado', p_fecha: S.hoyArgentina(), p_destino: 'Molino del Sur SA' }),
      JSON.stringify(ult))
    chk('una sola llamada (no una por cheque)', llamadas.length === 1)
    chk('al salir bien: cierra el diálogo', doc.getElementById('chq-modal-salida').hidden === true && S.estado.salida === null)
    chk('… limpia la selección', S.estado.seleccion.activa === false && S.estado.seleccion.ids.size === 0)
    chk('… recarga lista, total, bancos y vencimientos (refrescarTodo)', S.__llamadas.refrescar === antes + 1)
    chk('… y dice "Salieron 2 cheques."', S.__llamadas.exitos[S.__llamadas.exitos.length - 1] === 'Salieron 2 cheques.')
  })())
}
{
  const S = armar()
  S.estado.seleccion.ids = new Set(['a', 'c'])
  S.abrirModalSalidaLote()
  chk('con uno que no puede salir, el diálogo no se abre', S.estado.salida === null)
  const S2 = armar()
  S2.estado.seleccion.ids = new Set(['a'])
  S2.abrirModalSalidaLote()
  chk('uno solo: "Dar salida a 1 cheque"', /^Dar salida a 1 cheque · /.test(S2.__doc.getElementById('chq-salida-titulo').textContent))
  S2.abrirModalSalida('a')
  chk('la salida de UN cheque vuelve a titularse "Salida del cheque"', S2.__doc.getElementById('chq-salida-titulo').textContent === 'Salida del cheque' && !S2.estado.salida.lote)
  const muchos = armar()
  muchos.estado.filas = Array.from({ length: 9 }, (_, i) => ({ id: 'm' + i, cobranza_id: 'asentada', numero: String(i), banco_codigo: '007', estado: 'en_cartera', importe: 1, tipo: 'comun', fecha_emision: '2026-09-01' }))
  muchos.estado.seleccion.ids = new Set(muchos.estado.filas.map(x => x.id))
  muchos.abrirModalSalidaLote()
  const t = muchos.__doc.getElementById('chq-salida-cheques').textContent.split('\n')
  chk('la lista es CORTA: 6 cheques y "y 3 más"', t.length === 7 && t[6] === 'y 3 más', t.join(' | '))
  const p = S.parametrosSalidaLote(['x', 'y'], { tipo: 'depositado', fecha: '2026-09-20', destino: '   ' })
  chk('parámetros: un destino vacío viaja como null', p.p_destino === null && JSON.stringify(p.p_cheque_ids) === '["x","y"]')
  chk('el tope es 100, como la base', S.TOPE_SALIDA_LOTE === 100)
}
{
  const S = armar()
  S.estado.seleccion.ids = new Set(['a', 'b'])
  S.abrirModalSalidaLote()
  S.estado.salida.tipo = 'depositado'
  S.__setRpc(async () => ({ data: 1, error: null }))
  esperas.push(S.confirmarSalida().then(() => {
    chk('dice lo que devolvió la base (1): "Salió 1 cheque."', S.__llamadas.exitos[S.__llamadas.exitos.length - 1] === 'Salió 1 cheque.')
  }))
}
{
  chk('css: los que no pueden salir, con una franja bordó (no naranja)', /\.chq-tabla__fila--no-sale td:first-child \{ box-shadow: inset 4px 0 0 var\(--bordo\); \}/.test(CSS))
  chk('el botón empieza escondido en el HTML y lo habilita el JS', /id="chq-sel-dar-salida" hidden>/.test(FUENTE))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
