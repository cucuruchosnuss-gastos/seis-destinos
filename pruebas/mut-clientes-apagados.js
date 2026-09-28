// Mutaciones de test-clientes-apagados.js (el interruptor de clientes y los
// apagados en Administración, 28/09/2026). Ver mutar.js. Muta
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
    { nombre: 'no se lee la fila entera antes', de: "        const c = await leerClienteEntero(id)\n", a: "        const c = { ...clienteDe(id), apodos: [], telefono: null, observaciones: null, unidad_negocio_id: estado.empresaId }\n" },
    { nombre: 'la fila entera sin apodos', de: ".select('id, unidad_negocio_id, nombre, apodos, localidad, telefono, observaciones, activo')", a: ".select('id, unidad_negocio_id, nombre, localidad, telefono, observaciones, activo')" },
    { nombre: 'los apodos se borran', de: 'p_apodos: Array.isArray(c.apodos) ? c.apodos : [],', a: 'p_apodos: [],' },
    { nombre: 'el teléfono se borra', de: 'p_telefono: c.telefono ?? null,', a: 'p_telefono: null,' },
    { nombre: 'las observaciones se borran', de: 'p_observaciones: c.observaciones ?? null, p_activo', a: 'p_observaciones: null, p_activo' },
    { nombre: 'la localidad se borra', de: 'p_localidad: c.localidad ?? null,', a: 'p_localidad: null,' },
    { nombre: 'el error de la base se tapa', de: "        estado.interruptor = { id, guardando: false, error: err?.message || 'No se pudo guardar. Probá de nuevo.' }", a: "        estado.interruptor = { id, guardando: false, error: 'No se pudo guardar. Probá de nuevo.' }" },
    { nombre: 'el error no va pegado a la fila', de: "        `${it?.error ? `<span class=\"ad-error-pegado\">${esc(it.error)}</span>` : ''}</button>`", a: '        `</button>`' },
    { nombre: 'después del error queda trabado', de: "        estado.interruptor = { id, guardando: false, error: err?.message", a: "        estado.interruptor = { id, guardando: true, error: err?.message" },
    { nombre: 'un doble toque manda dos veces', de: '      if (!puedePrenderApagar() || estado.interruptor?.guardando) return', a: '      if (!puedePrenderApagar()) return' },
    { nombre: 'no se dice qué pasa al apagar', de: 'está apagado: ya no aparece para cargar retiros, pedidos ni cobranzas.', a: 'listo.' },
    { nombre: 'no se vuelve a leer la lista', de: '        estado.apagados = null\n        await mostrarClientes()\n', a: '' },
    // Los apagados
    { nombre: 'los apagados no se leen', de: '      if (estado.mostrarApagados && !estado.apagados?.filas) cargarApagados()', a: '      if (false) cargarApagados()' },
    { nombre: 'los apagados de todas las empresas', de: ".eq('unidad_negocio_id', unidadId).eq('activo', false).order('nombre')", a: ".eq('activo', false).order('nombre')" },
    { nombre: 'se leen los prendidos como apagados', de: ".eq('unidad_negocio_id', unidadId).eq('activo', false).order('nombre')", a: ".eq('unidad_negocio_id', unidadId).order('nombre')" },
    { nombre: 'los apagados se ven sin tildar', de: '      const apagados = estado.mostrarApagados ? (estado.apagados?.filas ?? []) : []', a: '      const apagados = estado.apagados?.filas ?? []' },
    { nombre: 'el apagado no se marca', de: "        `${c.apagado ? '<span class=\"ad-sello\">Apagado</span>' : ''}` +", a: '' },
    { nombre: 'el saldo del apagado no se suma', de: '          for (const m of r.data ?? []) saldos.set(m.cliente_id, (saldos.get(m.cliente_id) ?? 0) + (Number(m.importe) || 0))', a: '' },
    { nombre: 'al tope se suma igual', de: '          if ((r.data ?? []).length >= TOPE_MOVIMIENTOS) completo = false\n', a: '' },
    { nombre: 'un error de movimientos da cero', de: '        if (r.error) completo = false\n', a: '        if (r.error) {}\n' },
    { nombre: 'no se avisa que el saldo no se pudo sumar', de: "else if (estado.apagados.filas.some(c => c.saldo === null)) aviso =", a: 'else if (false) aviso =' },
    { nombre: 'un error de los apagados se esconde', de: "        estado.apagados = { filas: null, error: 'No se pudieron leer los clientes apagados. Revisá la conexión y volvé a entrar.' }", a: '        estado.apagados = { filas: [], error: null }' },
    { nombre: 'el apagado inventa "Sin lista"', de: "        c.apagado ? null : (c.lista ? 'Lista ' + c.lista : 'Sin lista'),", a: "        (c.lista ? 'Lista ' + c.lista : 'Sin lista')," },
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
