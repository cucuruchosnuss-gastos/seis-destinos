// Mutaciones de test-clientes-apagados.js (el interruptor de clientes y los
// apagados en Administración, 28/09/2026; con cambiar_activo_cliente y
// clientes_con_saldo(p_incluir_apagados) el 29/09/2026). Ver mutar.js. Muta
// modulos/administracion.html; lo de Retiros y Pedidos (que los apagados no
// se ofrezcan al cargar) ya estaba y la suite solo lo fija.
//
//   node pruebas/mut-clientes-apagados.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-clientes-apagados.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlInterruptor', 'htmlFilaCliente', 'htmlListaClientes'],
  equivalentes: [
    { expr: 'esc(estado.errorSaldos)', motivo: 'texto constante del código: lo pone mostrarClientes()' },
    { expr: 'esc(estado.apagados.error)', motivo: 'texto constante del código: lo pone cargarApagados()' },
    { expr: 'esc(importeHoja(c.saldo))', motivo: 'importeHoja() arma "$ " y un número formateado, o "—"' },
    { expr: "esc('Ningún cliente coincide con «' + limpio(estado.busquedaClientes) + '».')", motivo: 'lo buscado lo prueba test-administracion-clientes.js' },
  ],
  manuales: [
    // El interruptor
    { nombre: 'no hay interruptor', de: '      return `<div class="ad-fila-cliente">${fila}${htmlInterruptor(c)}</div>`', a: '      return `<div class="ad-fila-cliente">${fila}</div>`' },
    { nombre: 'el interruptor sin permiso', de: '      if (!puedePrenderApagar()) return \'\'\n', a: '' },
    { nombre: 'el interruptor con otro permiso', de: '      return puedeDarAlta(unidadId)\n    }\n\n    function htmlInterruptor', a: "      return puedeEn('retiros', 'ver', unidadId)\n    }\n\n    function htmlInterruptor" },
    { nombre: 'el apagado se ve prendido', de: '      const prendido = !c.apagado\n', a: '      const prendido = true\n' },
    { nombre: 'mientras guarda no se traba', de: "aria-label=\"${esc((prendido ? 'Apagar a ' : 'Prender a ') + (c.nombre ?? 'este cliente'))}\"${it?.guardando ? ' disabled' : ''}>", a: "aria-label=\"${esc((prendido ? 'Apagar a ' : 'Prender a ') + (c.nombre ?? 'este cliente'))}\">" },
    { nombre: 'tocar el interruptor abre la cuenta', de: '        if (s) { cambiarActivoCliente(s.dataset.clienteActivo); return }\n', a: '' },
    // Guardar
    { nombre: 'apagar manda activo al revés', de: '      const prender = !!fila.apagado\n', a: '      const prender = !fila.apagado\n' },
    { nombre: 'el interruptor vuelve a guardar_cliente', de: "supabase.rpc('cambiar_activo_cliente', { p_cliente_id: id, p_activo: prender })", a: "supabase.rpc('guardar_cliente', { p_id: id, p_activo: prender })" },
    { nombre: 'el interruptor manda otro cliente', de: "supabase.rpc('cambiar_activo_cliente', { p_cliente_id: id, p_activo: prender })", a: "supabase.rpc('cambiar_activo_cliente', { p_cliente_id: fila.nombre, p_activo: prender })" },
    { nombre: 'el interruptor manda de más', de: "supabase.rpc('cambiar_activo_cliente', { p_cliente_id: id, p_activo: prender })", a: "supabase.rpc('cambiar_activo_cliente', { p_cliente_id: id, p_activo: prender, p_nombre: fila.nombre })" },
    { nombre: 'el éxito no nombra al cliente', de: "        const nombre = limpio(fila.nombre) || 'El cliente'", a: "        const nombre = 'El cliente'" },
    { nombre: 'el error de la base se tapa', de: "        estado.interruptor = { id, guardando: false, error: err?.message || 'No se pudo guardar. Probá de nuevo.' }", a: "        estado.interruptor = { id, guardando: false, error: 'No se pudo guardar. Probá de nuevo.' }" },
    { nombre: 'el error no va pegado a la fila', de: "        `${it?.error ? `<span class=\"ad-error-pegado\">${esc(it.error)}</span>` : ''}</button>`", a: '        `</button>`' },
    { nombre: 'después del error queda trabado', de: "        estado.interruptor = { id, guardando: false, error: err?.message", a: "        estado.interruptor = { id, guardando: true, error: err?.message" },
    { nombre: 'un doble toque manda dos veces', de: '      if (!puedePrenderApagar() || estado.interruptor?.guardando) return', a: '      if (!puedePrenderApagar()) return' },
    { nombre: 'no se dice qué pasa al apagar', de: 'está apagado: ya no aparece para cargar retiros, pedidos ni cobranzas.', a: 'listo.' },
    { nombre: 'no se vuelve a leer la lista', de: '        estado.apagados = null\n        await mostrarClientes()\n', a: '' },
    // Los apagados
    { nombre: 'los apagados no piden incluir apagados', de: "supabase.rpc('clientes_con_saldo', { p_unidad_negocio_id: unidadId, p_incluir_apagados: true })", a: "supabase.rpc('clientes_con_saldo', { p_unidad_negocio_id: unidadId })" },
    { nombre: 'los apagados de otra empresa', de: "supabase.rpc('clientes_con_saldo', { p_unidad_negocio_id: unidadId, p_incluir_apagados: true })", a: "supabase.rpc('clientes_con_saldo', { p_unidad_negocio_id: estado.empresaId + 'x', p_incluir_apagados: true })" },
    { nombre: 'los prendidos se toman como apagados', de: '.filter(c => c?.activo === false).map(c => ({ ...c, apagado: true }))', a: '.map(c => ({ ...c, apagado: true }))' },
    { nombre: 'los prendidos piden también los apagados', de: "supabase.rpc('clientes_con_saldo', { p_unidad_negocio_id: unidadId, p_incluir_apagados: false })", a: "supabase.rpc('clientes_con_saldo', { p_unidad_negocio_id: unidadId, p_incluir_apagados: true })" },
    { nombre: 'un apagado que viene igual se mezcla con los prendidos', de: '.filter(c => c?.activo !== false)', a: '' },
    { nombre: 'un apagado no muestra su lista', de: "        c.lista ? 'Lista ' + c.lista : 'Sin lista', (Number(c.retiros_mes) || 0) + ' retiros este mes',", a: "        c.apagado ? null : (c.lista ? 'Lista ' + c.lista : 'Sin lista'), c.apagado ? null : (Number(c.retiros_mes) || 0) + ' retiros este mes'," },
    { nombre: 'los apagados no se leen', de: '      if (estado.mostrarApagados && !estado.apagados?.filas) cargarApagados()', a: '      if (false) cargarApagados()' },
    { nombre: 'los apagados se ven sin tildar', de: '      const apagados = estado.mostrarApagados ? (estado.apagados?.filas ?? []) : []', a: '      const apagados = estado.apagados?.filas ?? []' },
    { nombre: 'el apagado no se marca', de: "        `${c.apagado ? '<span class=\"ad-sello\">Apagado</span>' : ''}` +", a: '' },
    { nombre: 'un error de los apagados se esconde', de: "        estado.apagados = { filas: null, error: 'No se pudieron leer los clientes apagados. Revisá la conexión y volvé a entrar.' }", a: '        estado.apagados = { filas: [], error: null }' },
    { nombre: 'la cuenta no suma los apagados', de: '      const n = estado.saldos ? clientesFiltrados(clientesDeLaLista(), estado.busquedaClientes).length : null', a: '      const n = estado.saldos ? clientesFiltrados(estado.saldos, estado.busquedaClientes).length : null' },
    { nombre: 'el checkbox no refleja', de: "      document.getElementById('ad-clientes-apagados').checked = !!estado.mostrarApagados\n", a: '' },
    // Código anterior y la cuenta
    { nombre: 'sin código en la fila', de: "        codigo !== null && codigo !== undefined ? 'cód. ' + codigo : null].filter(Boolean).join(' · ')", a: "        null].filter(Boolean).join(' · ')" },
    { nombre: 'la cuenta no dice apagado', de: "      const extras = [cli?.activo === false ?", a: '      const extras = [false ?' },
    { nombre: 'la cuenta sin código anterior', de: "        cli && textoCodigoAnterior(cli.codigo_anterior) ?", a: '        false ?' },
    { nombre: 'la ficha no lee el código anterior', de: 'proveedor_id, observaciones, unidad_negocio_id, codigo_anterior\')', a: "proveedor_id, observaciones, unidad_negocio_id')" },
    { nombre: 'el código cero no se muestra', de: "      if (codigo === null || codigo === undefined || codigo === '') return ''", a: "      if (!codigo) return ''" },
    { nombre: 'el buscador no mira el código', de: "(digitos.length > 0 && digitos === String(c.codigo_anterior ?? clienteDe(c.cliente_id)?.codigo_anterior ?? ''))", a: 'false' },
    { nombre: 'el buscador del código por parte', de: "(digitos.length > 0 && digitos === String(c.codigo_anterior ?? clienteDe(c.cliente_id)?.codigo_anterior ?? ''))", a: "(digitos.length > 0 && String(c.codigo_anterior ?? clienteDe(c.cliente_id)?.codigo_anterior ?? '').includes(digitos))" },
    { nombre: 'asentar ofrece apagados', de: ".select('id, nombre, razon_social, apodos, unidad_negocio_id').eq('activo', true).order('nombre')", a: ".select('id, nombre, razon_social, apodos, unidad_negocio_id').order('nombre')" },
  ],
})
