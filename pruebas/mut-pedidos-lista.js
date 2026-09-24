// Mutaciones de test-pedidos-lista.js (Parte 4 de Pedidos). Ver mutar.js.
//
//   node pruebas/mut-pedidos-lista.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html y
// dan "ESCAPÓ" falsos.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pedidos-lista.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/pedidos.html'),
  escape: 'esc',
  funciones: ['htmlEstado', 'htmlAvance', 'htmlFilaPedido', 'htmlFiltroEstado', 'htmlListaPedidos',
    'htmlItem', 'htmlDato', 'htmlDetalle', 'pintarDetalle'],
  equivalentes: [
    { expr: 'esc(textoAvance(cumplidas, pedidas))', motivo: 'dígitos, puntos, comas y texto constante del código' },
    { expr: 'esc(texto)', motivo: 'htmlFiltroEstado(): los textos de FILTROS_ESTADO, constantes del código' },
    { expr: 'esc(valor)', motivo: 'htmlFiltroEstado(): los valores de FILTROS_ESTADO, constantes del código' },
    { expr: 'esc(estado.errorPedidos)', motivo: 'texto constante del código: lo pone cargarPedidos()' },
    { expr: 'esc(sinId)', motivo: 'un número: la cuenta de renglones sin identificar' },
    { expr: 'esc(rotulo)', motivo: 'htmlDato(): los rótulos son constantes del código' },
    { expr: 'esc(d.error)', motivo: 'texto constante del código: lo pone abrirDetalle()' },
    { expr: 'esc(fechas)', motivo: 'fechaCorta() solo devuelve DD/MM/AAAA o una raya, más texto constante' },
    { expr: 'esc(d.aviso)', motivo: 'texto constante del código: AVISO_CUMPLIDOS' },
  ],
  manuales: [
    // La barra
    { nombre: 'el porcentaje pasa de 100', de: '      return Math.max(0, Math.min(100, Math.round((c / p) * 100)))', a: '      return Math.max(0, Math.round((c / p) * 100))' },
    { nombre: 'sin cajas pedidas da NaN', de: '      if (!(p > 0) || !Number.isFinite(c)) return 0\n', a: '' },
    { nombre: 'el texto dice al revés', de: '      return `${textoCajas(cumplidas)} de ${textoCajas(pedidas)} cajas`', a: '      return `${textoCajas(pedidas)} de ${textoCajas(cumplidas)} cajas`' },
    { nombre: 'la barra sin ancho', de: '<div class="pe-avance__barra" style="width: ${pct}%"></div>', a: '<div class="pe-avance__barra"></div>' },
    { nombre: 'la barra nunca se completa', de: "      return `<div class=\"pe-avance${completo ? ' pe-avance--completo' : ''}\">` +", a: "      return `<div class=\"pe-avance\">` +" },
    // La fila
    { nombre: 'la fila sin la barra', de: '        `${htmlAvance(p.cajas_cumplidas, p.cajas_pedidas)}</button>`', a: '        `</button>`' },
    { nombre: 'la fila sin el sello de sin identificar', de: "        `${sinId ? `<span class=\"pe-sello\">${esc(sinId)} sin identificar</span>` : ''}</span>` +", a: "        `</span>` +" },
    { nombre: 'la fila sin la entrega', de: "${p.fecha_entrega ? ` · Entrega ${fechaCorta(p.fecha_entrega)}` : ''}", a: '' },
    { nombre: 'un estado desconocido inventa clase', de: "      const clave = Object.prototype.hasOwnProperty.call(ETIQUETA_ESTADO, estadoPedido) ? estadoPedido : null", a: '      const clave = estadoPedido' },
    { nombre: 'listo no es verde', de: '    .pe-estado--listo { background: var(--verde);', a: '    .pe-estado--listo { background: var(--naranja);' },
    // Los filtros
    { nombre: 'el filtro de sin identificar no filtra', de: '      if (!filtros?.sinIdentificar) return todos\n', a: '      return todos\n' },
    { nombre: 'el filtro de sin identificar al revés', de: '      return todos.filter(p => Number(p.sin_interpretar) > 0)', a: '      return todos.filter(p => Number(p.sin_interpretar) === 0)' },
    { nombre: 'el estado no viaja', de: '        p_estado: filtros.estado || null,', a: '        p_estado: null,' },
    { nombre: 'la fecha vacía viaja ""', de: '        p_desde: esFechaIso(filtros.desde) ? filtros.desde : null,', a: '        p_desde: filtros.desde,' },
    { nombre: 'un estado inventado se pide', de: '      if (!FILTROS_ESTADO.some(([v]) => v === valor)) return\n      estado.filtros.estado = valor', a: '      estado.filtros.estado = valor' },
    { nombre: 'sin identificar vuelve a la base', de: '      estado.filtros.sinIdentificar = !!valor\n      pintarListaPedidos()', a: '      estado.filtros.sinIdentificar = !!valor\n      cargarPedidos()' },
    { nombre: 'la respuesta vieja pisa la nueva', de: "        if (error) throw error\n        if (turno !== turnoPedidos) return\n        estado.pedidos = data ?? []", a: "        if (error) throw error\n        estado.pedidos = data ?? []" },
    { nombre: 'sin ver pide la lista igual', de: "      if (!puedeEn('ver')) { estado.pedidos = null; pintarListaPedidos(); return }\n", a: '' },
    { nombre: 'la cuenta no sigue el filtro', de: '      const n = pedidosVisibles(estado.pedidos, estado.filtros).length', a: '      const n = estado.pedidos.length' },
    // El detalle
    { nombre: 'el cumplido no se tacha', de: "      return `<div class=\"pe-item${texto ? ' pe-item--texto' : ''}${cumplido ? ' pe-item--cumplido' : ''}\"", a: "      return `<div class=\"pe-item${texto ? ' pe-item--texto' : ''}\"" },
    { nombre: 'el tachado no tacha', de: '    .pe-item--cumplido .pe-item__desc { text-decoration: line-through;', a: '    .pe-item--cumplido .pe-item__desc {' },
    { nombre: 'cumplido con la mitad', de: '    const renglonCumplido = (it) => Number(it.cajas) > 0 && Number(it.cajas_cumplidas) >= Number(it.cajas)', a: '    const renglonCumplido = (it) => Number(it.cajas_cumplidas) > 0' },
    { nombre: 'hay control de avance en un entregado', de: "      return !!p && puedeEn('cargar', p.unidad_negocio_id) && !pedidoCerrado(p)", a: "      return !!p && puedeEn('cargar', p.unidad_negocio_id)" },
    { nombre: 'hay control de avance sin cargar', de: "      return !!p && puedeEn('cargar', p.unidad_negocio_id) && !pedidoCerrado(p)", a: '      return !!p && !pedidoCerrado(p)' },
    { nombre: 'el texto libre del detalle sin sello', de: "      const sello = texto ? '<span class=\"pe-sello\">Falta identificar</span>' : ''", a: "      const sello = ''" },
    { nombre: 'el detalle no avisa los sin identificar', de: '      const sinId = items.filter(it => !it.presentacion_id).length', a: '      const sinId = 0' },
    { nombre: 'el detalle no muestra el motivo', de: "      const anulado = p.estado === 'anulado'", a: "      const anulado = false" },
    { nombre: 'el detalle no muestra el mensaje original', de: '      const mensaje = p.texto_original\n', a: '      const mensaje = false\n' },
    // El avance
    { nombre: 'se cumplen más que las pedidas', de: "      if (Number(valor) > Number(cajas)) return `No se pueden cumplir más de ${textoCajas(cajas)} cajas: son las pedidas.`\n", a: '' },
    { nombre: 'vacío se manda', de: "      if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return 'Escribí cuántas cajas están cumplidas.'\n", a: '' },
    { nombre: 'negativo se manda', de: "      if (Number(valor) < 0) return 'Las cajas cumplidas no pueden ser negativas.'\n", a: '' },
    { nombre: 'se manda aunque no valide', de: '      if (d.errores[itemId]) { pintarDetalle(); return }\n', a: '' },
    { nombre: 'avance a un pedido cerrado', de: '      if (!d || !it || !puedeAvanzar(d.pedido) || estado.enviandoAvance) return', a: '      if (!d || !it || estado.enviandoAvance) return' },
    { nombre: 'el avance no se guarda en el renglón', de: '        it.cajas_cumplidas = Number(valor)\n', a: '' },
    { nombre: 'el estado de la base se ignora', de: '        if (data?.estado) d.pedido.estado = data.estado\n', a: '' },
    { nombre: 'Cumplido manda la mitad', de: '      if (it) marcarAvance(itemId, Number(it.cajas))', a: '      if (it) marcarAvance(itemId, Number(it.cajas) / 2)' },
    { nombre: 'el error de avance se tapa', de: "        d.errores = { ...d.errores, [itemId]: err?.message || 'No se pudo guardar el avance. Probá de nuevo.' }", a: "        d.errores = { ...d.errores, [itemId]: 'No se pudo guardar el avance. Probá de nuevo.' }" },
    { nombre: 'el avance queda trabado', de: '      } finally {\n        estado.enviandoAvance = false\n      }', a: '      } finally {\n      }' },
    { nombre: 'el campo de avance no se lee con leerCampoNumero', de: '      marcarAvance(itemId, input ? leerCampoNumero(input) : null)', a: '      marcarAvance(itemId, input ? Number(input.value) : null)' },
    // El estado a mano
    { nombre: 'se puede pedir cualquier estado', de: "      if (!d?.pedido || !ESTADOS_A_MANO.includes(tipo)) return\n      d.accion = { tipo, error: null }", a: "      if (!d?.pedido) return\n      d.accion = { tipo, error: null }" },
    { nombre: 'ESTADOS_A_MANO suma listo', de: "    const ESTADOS_A_MANO = ['entregado', 'anulado']", a: "    const ESTADOS_A_MANO = ['entregado', 'anulado', 'listo']" },
    { nombre: 'anula sin motivo', de: '        accion.error = faltaMotivo(motivo)\n        if (accion.error) { pintarAccionesDetalle(); return }', a: '        accion.error = null' },
    { nombre: 'el motivo de una letra alcanza', de: '    const LARGO_MINIMO_MOTIVO = 3', a: '    const LARGO_MINIMO_MOTIVO = 1' },
    { nombre: 'entregado manda motivo', de: "      return { p_pedido_id: pedidoId, p_estado: tipo, p_motivo: tipo === 'anulado' ? limpio(motivo) : null }", a: "      return { p_pedido_id: pedidoId, p_estado: tipo, p_motivo: limpio(motivo) || '' }" },
    { nombre: 'el motivo sin limpiar', de: "p_motivo: tipo === 'anulado' ? limpio(motivo) : null }", a: "p_motivo: tipo === 'anulado' ? motivo : null }" },
    { nombre: 'el error del estado se tapa', de: "        accion.error = err?.message || 'No se pudo cambiar el estado. Probá de nuevo.'", a: "        accion.error = 'No se pudo cambiar el estado. Probá de nuevo.'" },
    { nombre: 'el estado queda trabado', de: "        accion.error = err?.message || 'No se pudo cambiar el estado. Probá de nuevo.'\n        estado.cambiandoEstado = false", a: "        accion.error = err?.message || 'No se pudo cambiar el estado. Probá de nuevo.'" },
    { nombre: 'Marcar entregado se ve en un entregado', de: "      document.getElementById('pe-btn-entregado').hidden = !(cargar && !pedidoCerrado(p))", a: "      document.getElementById('pe-btn-entregado').hidden = !cargar" },
    { nombre: 'Anular se ve en un anulado', de: "      document.getElementById('pe-btn-anular').hidden = !(cargar && p.estado !== 'anulado')", a: "      document.getElementById('pe-btn-anular').hidden = !cargar" },
    { nombre: 'Corregir se ve sin cargar', de: "      document.getElementById('pe-btn-corregir').hidden = !(cargar && !pedidoCerrado(p))", a: "      document.getElementById('pe-btn-corregir').hidden = pedidoCerrado(p)" },
    // Corregir con cumplidos
    { nombre: 'con cumplidos abre el formulario', de: '      if (tieneCumplidos(d.items)) {\n        d.aviso = AVISO_CUMPLIDOS', a: '      if (false) {\n        d.aviso = AVISO_CUMPLIDOS' },
    { nombre: 'el aviso del detalle no se dibuja', de: "      document.getElementById('pe-detalle-aviso').innerHTML = d.aviso ?", a: "      document.getElementById('pe-detalle-aviso').innerHTML = false ?" },
    // Leer
    { nombre: 'los renglones sin orden', de: ".eq('pedido_id', id).order('orden')", a: ".eq('pedido_id', id)" },
    { nombre: 'el pedido sin texto_original', de: "estado, observaciones, texto_original, anulado_motivo, cliente_id", a: "estado, observaciones, anulado_motivo, cliente_id" },
    { nombre: 'un pedido que no aparece no se dice', de: "        if (!r) estado.detalle.error = 'No se encontró el pedido: puede ser de una unidad que no ves.'\n        else {", a: "        if (!r) {} else {" },
    { nombre: 'el avance sin máximo', de: 'enlazarCampoNumero(input, { decimales: DECIMALES_CAJAS, max: it ? Number(it.cajas) : null })', a: 'enlazarCampoNumero(input, { decimales: DECIMALES_CAJAS })' },
  ],
})
