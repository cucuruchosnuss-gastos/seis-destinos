// Mutaciones de test-cheques-lote.js (Parte 8). Ver mutar.js.
//
//   node pruebas/mut-cheques-lote.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cheques-lote.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cheques.html'),
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
      de: '      btn.disabled = !v.puede', a: '      btn.disabled = false' },
    { nombre: 'no se marcan los que no pueden salir',
      de: '      estado.seleccion.noPueden = new Set(v.noPueden)\n      marcarNoSalen()', a: '      estado.seleccion.noPueden = new Set()\n      marcarNoSalen()' },
    { nombre: 'no se dice cuántos no pueden salir',
      de: '      aviso.hidden = !v.motivo', a: '      aviso.hidden = true' },
    { nombre: 'llama a la RPC de a un cheque',
      de: "const { data, error } = await supabase.rpc('marcar_salida_cheques', parametrosSalidaLote(ids, datos))", a: "const { data, error } = await supabase.rpc('marcar_salida_cheque', parametrosSalida(ids[0], datos))" },
    { nombre: 'el payload pierde el destino',
      de: 'return { p_cheque_ids: [...ids], p_tipo: tipo, p_fecha: fecha, p_destino: textoOpcional(destino) }', a: 'return { p_cheque_ids: [...ids], p_tipo: tipo, p_fecha: fecha, p_destino: null }' },
    { nombre: 'el error de la base se tapa',
      de: "        err.textContent = e?.message || 'No se pudo marcar la salida.'", a: "        err.textContent = 'No se pudo marcar la salida.'" },
    { nombre: 'no limpia la selección al terminar',
      de: '          cerrarModalSalida()\n          cancelarSeleccion()', a: '          cerrarModalSalida()' },
    { nombre: 'no recarga al terminar',
      de: "          mostrarExito(n === 1 ? 'Salió 1 cheque.' : `Salieron ${n} cheques.`)\n          await refrescarTodo()", a: "          mostrarExito(n === 1 ? 'Salió 1 cheque.' : `Salieron ${n} cheques.`)" },
    { nombre: 'no dice cuántos salieron',
      de: "          mostrarExito(n === 1 ? 'Salió 1 cheque.' : `Salieron ${n} cheques.`)", a: "          mostrarExito('Listo.')" },
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
