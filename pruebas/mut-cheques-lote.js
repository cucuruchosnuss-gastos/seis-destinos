// Mutaciones de test-cheques-lote.js (Parte 8). Ver mutar.js.
//
//   node pruebas/mut-cheques-lote.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-lote.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'se habilita con uno de una cobranza por controlar',
      de: "      return ch.estado === 'en_cartera' && estado.cobranzas.get(ch.cobranza_id)?.estado === 'procesada'", a: "      return ch.estado === 'en_cartera'" },
    { nombre: 'se habilita con uno que ya salió',
      de: "      return ch.estado === 'en_cartera' && estado.cobranzas.get(ch.cobranza_id)?.estado === 'procesada'", a: "      return estado.cobranzas.get(ch.cobranza_id)?.estado === 'procesada'" },
    { nombre: 'sin el tope de 100',
      de: '      if (elegidos.length > TOPE_SALIDA_LOTE) {', a: '      if (false) {' },
    { nombre: 'el botón aparece sin la tarea procesar',
      de: '      if (!puedeProcesar() || !elegidos.length) {', a: '      if (!elegidos.length) {' },
    { nombre: 'el botón queda habilitado aunque no puedan',
      de: '        b.disabled = !v.puede', a: '        b.disabled = false' },
    { nombre: 'no se marcan los que no pueden salir',
      de: '      estado.seleccion.noPueden = new Set(v.noPueden)\n      marcarNoSalen()', a: '      estado.seleccion.noPueden = new Set()\n      marcarNoSalen()' },
    { nombre: 'no se dice cuántos no pueden salir',
      de: '      aviso.hidden = !v.motivo', a: '      aviso.hidden = true' },
    { nombre: 'llama a la RPC de a un cheque',
      de: 'supabase.rpc(rpc, parametrosBanco(cheques.map(ch => ch.id), datos))', a: 'supabase.rpc(rpc, parametrosBanco([cheques[0].id], datos))' },
    { nombre: 'el payload pierde la cuenta',
      de: 'const p = { p_cheque_ids: [...ids], p_cuenta_id: cuentaId, p_fecha: fecha }', a: 'const p = { p_cheque_ids: [...ids], p_cuenta_id: null, p_fecha: fecha }' },
    { nombre: 'el error de la base se tapa',
      de: "        err.textContent = e?.message || 'No se pudo registrar la salida.'", a: "        err.textContent = 'No se pudo registrar la salida.'" },
    { nombre: 'no limpia la selección al terminar',
      de: '        if (s.lote) cancelarSeleccion()\n        mostrarExito(textoResultadoBanco', a: '        mostrarExito(textoResultadoBanco' },
    { nombre: 'no recarga al terminar',
      de: "        mostrarExito(textoResultadoBanco(data, datos.tipo, cuentaNombre))\n        await refrescarTodo()", a: "        mostrarExito(textoResultadoBanco(data, datos.tipo, cuentaNombre))" },
    { nombre: 'no dice cuántos salieron',
      de: "        mostrarExito(textoResultadoBanco(data, datos.tipo, cuentaNombre))\n", a: "        mostrarExito('Listo.')\n" },
    { nombre: 'la fecha mínima es la de la cobranza más vieja',
      de: '        if (esFechaIso(f) && (max === null || f > max)) max = f', a: '        if (esFechaIso(f) && (max === null || f < max)) max = f' },
    { nombre: 'el título no dice el total',
      de: "`Dar salida a ${elegidos.length} ${elegidos.length === 1 ? 'cheque' : 'cheques'} · ${formatearImporte(total)}`", a: "`Dar salida a ${elegidos.length} ${elegidos.length === 1 ? 'cheque' : 'cheques'}`" },
    { nombre: 'la lista no se corta',
      de: '      const lineas = elegidos.slice(0, MAX_LINEAS).map(ch => {', a: '      const lineas = elegidos.map(ch => {' },
    { nombre: 'la salida de un cheque conserva el título del lote',
      de: "      document.getElementById('chq-salida-titulo').textContent = 'Salida del cheque'\n", a: '' },
    { nombre: 'la marca usa naranja',
      de: '    .chq-tabla__fila--no-sale td:first-child { box-shadow: inset 4px 0 0 var(--bordo); }', a: '    .chq-tabla__fila--no-sale td:first-child { box-shadow: inset 4px 0 0 var(--naranja); }' },
  ],
})
