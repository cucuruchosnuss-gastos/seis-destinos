// Mutaciones de test-pedidos-barra-unidad.js (la barra de unidad, 28/09/2026).
// Ver mutar.js.
//
//   node pruebas/mut-pedidos-barra-unidad.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html y
// dan "ESCAPÓ" falsos.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pedidos-barra-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/pedidos.html'),
  escape: 'esc',
  funciones: ['htmlUnidadForm', 'htmlUnidadCliente', 'htmlListaPedidos'],
  equivalentes: [
    { expr: 'esc(estado.errorPedidos)', motivo: 'texto constante del código: lo pone cargarPedidos()' },
  ],
  manuales: [
    // Las unidades que se miran
    { nombre: 'la barra no filtra', de: '      return estado.unidadBarra ? [estado.unidadBarra] : unidadesDelModulo()', a: '      return unidadesDelModulo()' },
    { nombre: 'una unidad sin tareas no se dice', de: '      return !!estado.unidadBarra && !unidadesDelModulo().includes(estado.unidadBarra)', a: '      return false' },
    { nombre: 'la lista no dice lo de la unidad sin tareas', de: "      if (unidadSinTareas()) return `<div class=\"pe-aviso\">En ${esc(nombreUnidad(estado.unidadBarra))} no tenés ninguna tarea de Pedidos. Elegí otra unidad arriba, o «Todas».</div>`\n", a: '' },
    // La lista con "Todas"
    { nombre: 'con Todas se pide una sola unidad', de: '      const resultados = await Promise.all(unidades.map(u => leerPedidosDe(u)))', a: '      const resultados = await Promise.all(unidades.slice(0, 1).map(u => leerPedidosDe(u)))' },
    { nombre: 'cada llamada pide la unidad de la pantalla', de: "        const { data, error } = await supabase.rpc('pedidos_de', parametrosPedidosDe(u, estado.filtros))", a: "        const { data, error } = await supabase.rpc('pedidos_de', parametrosPedidosDe(estado.unidadId, estado.filtros))" },
    { nombre: 'la fila no lleva su unidad', de: '          todos.push({ ...p, unidad_negocio_id: p.unidad_negocio_id ?? u })', a: '          todos.push(p)' },
    { nombre: 'Todas sin ordenar', de: "      if (resultados.length > 1) todos.sort(", a: "      if (false) todos.sort(" },
    { nombre: 'una unidad que falla tapa las otras', de: '      if (!bien.length) {\n        estado.errorPedidos', a: '      if (mal.length) {\n        estado.errorPedidos' },
    { nombre: 'no se dice qué unidad falló', de: '        if (mal.length) estado.avisoPedidos = ', a: '        if (false) estado.avisoPedidos = ' },
    { nombre: 'la respuesta vieja pisa la nueva', de: '      if (turno !== turnoPedidos) return\n      const bien', a: '      const bien' },
    { nombre: 'la fila no dice su unidad', de: "${conUnidad ? ` · ${esc(nombreUnidad(p.unidad_negocio_id))}` : ''}", a: '' },
    { nombre: 'la unidad de la fila sin escapar', de: '` · ${esc(nombreUnidad(p.unidad_negocio_id))}`', a: '` · ${nombreUnidad(p.unidad_negocio_id)}`' },
    { nombre: 'con Todas las filas no dicen la unidad', de: '      const varias = conVer.length > 1\n', a: '      const varias = false\n' },
    { nombre: 'la cuenta sin el detalle por unidad', de: '      if (unidades.length > 1 && n) texto += ', a: '      if (false) texto += ' },
    { nombre: 'una fila de otra unidad se muestra', de: '.filter(p => pasaFiltroUnidad(p.unidad_negocio_id, estado.unidadBarra))', a: '' },
    { nombre: 'la unidad sin permiso de ver no se dice', de: '      const avisoSinVer = sinVer.length ?', a: '      const avisoSinVer = false ?' },
    { nombre: 'Pedido nuevo con puedeEn de la pantalla', de: "      document.getElementById('pe-btn-nuevo').hidden = !puedeEnAlguna('cargar')", a: "      document.getElementById('pe-btn-nuevo').hidden = !puedeEn('cargar')" },
    { nombre: 'Clientes con puedeEn de la pantalla', de: "      document.getElementById('pe-btn-clientes').hidden = !puedeEnAlguna('configurar')", a: "      document.getElementById('pe-btn-clientes').hidden = !puedeEn('configurar')" },
    // Cambiar la barra con la pantalla abierta
    { nombre: 'cambiar la barra no repinta la lista', de: "      if (estado.vista === 'pe-vista-inicio') mostrarInicio()\n", a: "      if (estado.vista === 'pe-vista-inicio') {}\n" },
    { nombre: 'cambiar la barra no recalcula la unidad', de: "      estado.unidadId = unidadUnica()\n      if (estado.vista === 'pe-vista-inicio')", a: "      if (estado.vista === 'pe-vista-inicio')" },
    { nombre: 'la misma unidad vuelve a pedir', de: '      if (nueva === estado.unidadBarra) return\n', a: '' },
    { nombre: 'el detalle se cierra aunque siga a la vista', de: '        if (u && !pasaFiltroUnidad(u, nueva)) mostrarInicio()', a: '        if (u) mostrarInicio()' },
    { nombre: 'el detalle de otra unidad queda abierto', de: '        if (u && !pasaFiltroUnidad(u, nueva)) mostrarInicio()', a: '        if (false) mostrarInicio()' },
    { nombre: 'init no se suscribe a la barra', de: '      alCambiarUnidad((e) => aplicarUnidadDeLaBarra(e?.elegida))\n', a: '' },
    { nombre: 'init ignora la unidad de la barra', de: '      estado.unidadBarra = elegida || null\n', a: '      estado.unidadBarra = null\n' },
    { nombre: 'init no pide la barra', de: "      const barra = unidadesDeLaBarra().catch(() => ({ elegida: null }))", a: '      const barra = null' },
    // Cargar un pedido con "Todas"
    { nombre: 'el pedido nuevo toma siempre la primera unidad', de: '      const f = formPedidoVacio(unidades.length === 1 ? unidades[0] : null)', a: '      const f = formPedidoVacio(unidades[0])' },
    { nombre: 'guardar sin unidad no dice que falta', de: "      if (!f.unidadId) faltan.push('Elegí de qué unidad es el pedido.')\n", a: '' },
    { nombre: 'se pregunta la unidad con una sola', de: '      if (opciones.length > 1) {\n        const botonesUnidad = opciones.map(u => `<button type="button" class="pe-segmento__opcion" data-form-unidad=', a: '      if (opciones.length > 0) {\n        const botonesUnidad = opciones.map(u => `<button type="button" class="pe-segmento__opcion" data-form-unidad=' },
    { nombre: 'no se dice la unidad del pedido', de: "      if (unidadesDelModulo().length > 1 && f.unidadId) return `<p class=\"pe-texto-suave\">Unidad: ${esc(nombreUnidad(f.unidadId))}</p>`\n      return ''\n    }\n\n    // Elegir (o cambiar)", a: "      return ''\n    }\n\n    // Elegir (o cambiar)" },
    { nombre: 'los clientes no esperan la unidad', de: "      if (estado.form && !estado.form.unidadId) return '<div class=\"pe-texto-suave\">Elegí primero de qué unidad es el pedido.</div>'\n", a: '' },
    { nombre: 'cambiar de unidad no suelta el cliente', de: '      f.clienteId = null\n      f.renglones = f.renglones.map(', a: '      f.renglones = f.renglones.map(' },
    { nombre: 'cambiar de unidad borra el texto libre', de: "f.renglones.map(r => r.tipo === 'texto' ? r : Object.assign(renglonProducto(), { cajas: r.cajas, observacion: r.observacion }))", a: "f.renglones.map(r => Object.assign(renglonProducto(), { cajas: r.cajas, observacion: r.observacion }))" },
    { nombre: 'cambiar de unidad pierde las cajas', de: 'Object.assign(renglonProducto(), { cajas: r.cajas, observacion: r.observacion })', a: 'renglonProducto()' },
    { nombre: 'el producto no se suelta al cambiar de unidad', de: "f.renglones.map(r => r.tipo === 'texto' ? r : Object.assign(renglonProducto(), { cajas: r.cajas, observacion: r.observacion }))", a: 'f.renglones' },
    { nombre: 'se elige una unidad donde no puede cargar', de: "      if (!f || f.id || f.unidadId === u || !unidadesVistasCon('cargar').includes(u)) return", a: '      if (!f || f.id || f.unidadId === u) return' },
    { nombre: 'elegir la unidad no lee su catálogo', de: '      await asegurarCatalogoYClientes(u)\n', a: '      await asegurarCatalogoYClientes()\n' },
    { nombre: 'guardar manda la unidad de la pantalla', de: "parametrosGuardarPedido(f, f.unidadId))", a: "parametrosGuardarPedido(f, estado.unidadId))" },
    { nombre: 'los clientes de otra unidad se reusan', de: '      if (estado.clientes === null || estado.clientesDe !== unidad) {', a: '      if (estado.clientes === null) {' },
    // El detalle
    { nombre: 'el detalle lee el catálogo de la pantalla', de: '          await asegurarCatalogoYClientes(r.pedido.unidad_negocio_id)', a: '          await asegurarCatalogoYClientes()' },
    { nombre: 'el detalle no dice la unidad', de: "        ...(unidadesDelModulo().length > 1 ? [htmlDato('Unidad', nombreUnidad(p.unidad_negocio_id))] : []),\n", a: '' },
    // Clientes con "Todas"
    { nombre: 'los clientes de una sola unidad', de: '      const r = await leerClientesDe(unidades)', a: '      const r = await leerClientesDe(unidades.slice(0, 1))' },
    { nombre: 'el cliente no lleva su unidad', de: 'filas.map(c => ({ ...c, unidad_negocio_id: c.unidad_negocio_id ?? u }))', a: 'filas' },
    { nombre: 'los clientes sin ordenar', de: "      if (bien.length > 1) clientes.sort(", a: '      if (false) clientes.sort(' },
    { nombre: 'la fila del cliente no dice su unidad', de: "[conUnidad ? nombreUnidad(c.unidad_negocio_id) : '', ", a: '[' },
    { nombre: 'la lista de clientes no dice la unidad con Todas', de: "      const varias = hayVariasUnidades('configurar')\n", a: '      const varias = false\n' },
    { nombre: 'no se dice qué clientes no se leyeron', de: '        if (r.fallaron.length) estado.avisoClientes = ', a: '        if (false) estado.avisoClientes = ' },
    { nombre: 'el aviso de clientes sin escapar', de: '${esc(estado.avisoClientes)}', a: '${estado.avisoClientes}' },
    { nombre: 'un cliente que falla tapa los otros', de: '      if (r.ok) {\n        estado.clientes = r.clientes', a: '      if (r.ok && !r.fallaron.length) {\n        estado.clientes = r.clientes' },
    { nombre: 'el cliente nuevo toma la primera unidad', de: '      estado.clienteForm = c ? formClienteDesde(c) : formClienteVacio(unidades.length === 1 ? unidades[0] : null)', a: '      estado.clienteForm = c ? formClienteDesde(c) : formClienteVacio(unidades[0])' },
    { nombre: 'editar no toma la unidad del cliente', de: "id: c.id, unidadId: c.unidad_negocio_id ?? unidadUnica(),", a: "id: c.id, unidadId: unidadUnica()," },
    { nombre: 'se elige una unidad donde no configura', de: "      if (!f || f.id || !unidadesVistasCon('configurar').includes(u)) return", a: '      if (!f || f.id) return' },
    { nombre: 'un cliente nuevo se guarda sin unidad', de: "      f.error = f.unidadId ? faltanCliente(f) : 'Elegí de qué unidad es el cliente.'", a: '      f.error = faltanCliente(f)' },
    { nombre: 'se edita un cliente de una unidad donde no configura', de: "      if (c && !puedeEn('configurar', c.unidad_negocio_id ?? unidadUnica())) return\n", a: '' },
    { nombre: 'el cliente viaja con la unidad de la pantalla', de: 'parametrosGuardarCliente(f, f.unidadId)', a: 'parametrosGuardarCliente(f, estado.unidadId)' },
  ],
})
