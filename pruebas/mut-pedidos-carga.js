// Mutaciones de test-pedidos-carga.js (Parte 3 de Pedidos). Ver mutar.js.
//
//   node pruebas/mut-pedidos-carga.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html y
// dan "ESCAPÓ" falsos.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pedidos-carga.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/pedidos.html'),
  escape: 'esc',
  funciones: ['htmlClienteElegido', 'htmlResultadosClientes', 'htmlProductosRenglon', 'htmlMarcasRenglon',
    'htmlConoRenglon', 'htmlPresentacionesRenglon', 'htmlOpcionPresentacion', 'htmlPieRenglon', 'htmlRenglon',
    'htmlAvisoCatalogo'],
  equivalentes: [
    { expr: 'esc(estado.errorClientes)', motivo: 'texto constante del código: lo ponen asegurarCatalogoYClientes() y mostrarClientes()' },
    { expr: 'esc(estado.errorCatalogo)', motivo: 'texto constante del código: lo pone asegurarCatalogoYClientes()' },
    { expr: 'esc(falta)', motivo: 'texto constante del código que devuelve faltanRenglon()' },
  ],
  manuales: [
    // Lo que viene puesto
    { nombre: 'la fecha no viene en hoy', de: "return { id: null, clienteId: null, clienteBusqueda: '', fecha: hoyArgentina(),", a: "return { id: null, clienteId: null, clienteBusqueda: '', fecha: ''," },
    { nombre: 'CON cono viene puesto', de: "      return { clave: claveRenglon, tipo: 'producto', productoId: null, conCono: false, marcaId: null,", a: "      return { clave: claveRenglon, tipo: 'producto', productoId: null, conCono: true, marcaId: null," },
    { nombre: 'hoy sin la zona argentina', de: "new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_AR, year:", a: "new Intl.DateTimeFormat('en-CA', { year:" },
    { nombre: 'la presentación única no se elige sola', de: '      if (!r.presentacionId && lista.length === 1) r.presentacionId = lista[0].id\n', a: '' },
    { nombre: 'cambiar el cono no suelta la presentación', de: "      if (!conCono) { r.marcaId = null; r.marcaBusqueda = '' }\n      r.presentacionId = null\n", a: "      if (!conCono) { r.marcaId = null; r.marcaBusqueda = '' }\n" },
    { nombre: 'cambiar el producto no suelta la presentación', de: '      r.productoId = id\n      r.presentacionId = null\n', a: '      r.productoId = id\n' },
    // El cono
    { nombre: 'el buscador de conos aparece sin cono', de: '      if (!r.conCono) return seg\n', a: '' },
    { nombre: 'volver a sin cono no olvida el cono', de: "      if (!conCono) { r.marcaId = null; r.marcaBusqueda = '' }\n", a: '' },
    { nombre: 'se elige cono estando sin cono', de: '      if (!r || !r.conCono) return\n      if (id && !(estado.catalogo?.marcas', a: '      if (!r) return\n      if (id && !(estado.catalogo?.marcas' },
    { nombre: 'un cono inexistente se elige', de: "      if (id && !(estado.catalogo?.marcas ?? []).some(m => m.id === id)) return\n", a: '' },
    { nombre: 'el buscador de conos no filtra', de: '      if (!q) return lista\n      return lista.filter(m => normalizar(m.nombre).includes(q))', a: '      return lista' },
    // El chocolate
    { nombre: 'el chocolate va primero', de: "      return `<div class=\"pe-opciones\" role=\"group\" aria-label=\"Producto\">${comunes.map(boton).join('')}${choco}</div>`", a: "      return `<div class=\"pe-opciones\" role=\"group\" aria-label=\"Producto\">${choco}${comunes.map(boton).join('')}</div>`" },
    { nombre: 'chocolate por el nombre', de: "      return normalizar(p?.tipo_masa).includes('chocolate')", a: "      return normalizar(p?.nombre).includes('choco')" },
    { nombre: 'sin la línea del chocolate', de: '<div class="pe-separador">Chocolate</div>${chocolate.map(boton)', a: '${chocolate.map(boton)' },
    // El payload
    { nombre: 'el texto libre lleva presentacion_id null', de: "        return { texto_libre: limpio(r.texto), cajas: r.cajas ?? null, observacion }", a: "        return { presentacion_id: null, texto_libre: limpio(r.texto), cajas: r.cajas ?? null, observacion }" },
    { nombre: 'el producto lleva texto_libre null', de: "      return { presentacion_id: r.presentacionId, marca_id: r.conCono ? (r.marcaId ?? null) : null, cajas: r.cajas, observacion }", a: "      return { presentacion_id: r.presentacionId, texto_libre: null, marca_id: r.conCono ? (r.marcaId ?? null) : null, cajas: r.cajas, observacion }" },
    { nombre: 'la marca viaja aunque sea sin cono', de: 'marca_id: r.conCono ? (r.marcaId ?? null) : null, cajas: r.cajas, observacion }', a: 'marca_id: r.marcaId ?? null, cajas: r.cajas, observacion }' },
    { nombre: 'el texto libre sin limpiar', de: '        return { texto_libre: limpio(r.texto),', a: '        return { texto_libre: r.texto,' },
    { nombre: 'texto libre sin cajas inventa 0', de: 'texto_libre: limpio(r.texto), cajas: r.cajas ?? null,', a: 'texto_libre: limpio(r.texto), cajas: r.cajas ?? 0,' },
    { nombre: 'la entrega vacía viaja ""', de: '        p_fecha_entrega: f.entrega || null,', a: '        p_fecha_entrega: f.entrega,' },
    { nombre: 'texto_original inventado', de: '        p_texto_original: f.textoOriginal ?? null,', a: "        p_texto_original: f.observaciones || null," },
    { nombre: 'se manda solo el primer renglón', de: '        p_items: f.renglones.map(itemParaBase),', a: '        p_items: f.renglones.slice(0, 1).map(itemParaBase),' },
    { nombre: 'la nota del renglón sin limpiar', de: '      const observacion = limpio(r.observacion) || null', a: '      const observacion = r.observacion || null' },
    // Lo que falta
    { nombre: 'sin cliente se guarda', de: "      if (!f.clienteId) faltan.push('Elegí el cliente.')\n", a: '' },
    { nombre: 'la entrega anterior se acepta', de: "      if (esFechaIso(f.fecha) && esFechaIso(f.entrega) && f.entrega < f.fecha) faltan.push('La entrega no puede ser anterior al pedido.')\n", a: '' },
    { nombre: 'sin renglones se guarda', de: "      if (!f.renglones.length) faltan.push('Agregá al menos un renglón.')\n", a: '' },
    { nombre: 'cero cajas se acepta', de: "      if (r.cajas === null || r.cajas === undefined || !(Number(r.cajas) > 0)) return 'poné las cajas'", a: "      if (r.cajas === null || r.cajas === undefined) return 'poné las cajas'" },
    { nombre: 'sin presentación se acepta', de: "      if (!r.presentacionId) return 'elegí la presentación'\n", a: '' },
    { nombre: 'un texto de una letra se acepta', de: "        return limpio(r.texto).length < 2 ? 'escribí lo que dice el mensaje' : null", a: "        return limpio(r.texto).length < 1 ? 'escribí lo que dice el mensaje' : null" },
    // Guardar
    { nombre: 'con cumplidos se manda igual', de: '      if (f.tieneCumplidos) {\n        f.error = AVISO_CUMPLIDOS', a: '      if (false) {\n        f.error = AVISO_CUMPLIDOS' },
    { nombre: 'no detecta los cumplidos', de: '        tieneCumplidos: (items ?? []).some(it => Number(it.cajas_cumplidas) > 0),', a: '        tieneCumplidos: false,' },
    { nombre: 'el aviso de cumplidos no se dibuja', de: "      document.getElementById('pe-form-aviso').innerHTML = f.tieneCumplidos ?", a: "      document.getElementById('pe-form-aviso').innerHTML = false ?" },
    { nombre: 'guarda con cosas faltando', de: '      if (faltanPedido(f).length) { pintarRenglones(); return }', a: '' },
    { nombre: 'el error de la base se tapa', de: "        f.error = err?.message || 'No se pudo guardar el pedido. Probá de nuevo: no quedó nada a medias.'", a: "        f.error = 'No se pudo guardar el pedido. Probá de nuevo: no quedó nada a medias.'" },
    { nombre: 'el botón se deshabilita por lo que falta', de: "      document.getElementById('pe-form-guardar').disabled = estado.guardandoPedido", a: "      document.getElementById('pe-form-guardar').disabled = estado.guardandoPedido || faltan.length > 0" },
    { nombre: 'el error no se ve', de: '      e.textContent = texto\n      e.hidden = !texto', a: '      e.textContent = texto\n      e.hidden = true' },
    { nombre: 'la fecha del campo no se lee', de: "      f.fecha = document.getElementById('pe-form-fecha').value\n", a: '' },
    { nombre: 'el renglón incompleto no se marca', de: "      return `<div class=\"pe-renglon${falta ? ' pe-renglon--error' : ''}\" data-renglon=\"${i}\">` +", a: "      return `<div class=\"pe-renglon\" data-renglon=\"${i}\">` +" },
    // Texto libre
    { nombre: 'el texto libre sin sello', de: 'Renglón ${i + 1}</span><span class="pe-sello">Falta identificar</span>', a: 'Renglón ${i + 1}</span>' },
    { nombre: 'el texto libre no va en bordó', de: '        return `<div class="pe-renglon pe-renglon--texto${falta', a: '        return `<div class="pe-renglon${falta' },
    { nombre: '"Ya sé qué es" pierde el texto', de: '      nuevo.observacion = limpio([r.observacion, r.texto].filter(x => limpio(x)).join(\' · \')).slice(0, 200)', a: '      nuevo.observacion = limpio(r.observacion)' },
    { nombre: 'formPedidoDesde pierde el texto libre', de: "          const r = renglonTexto(it.texto_libre ?? '')", a: "          const r = renglonTexto('')" },
    { nombre: 'formPedidoDesde pierde el texto_original', de: "        observaciones: p.observaciones ?? '', textoOriginal: p.texto_original ?? null,", a: "        observaciones: p.observaciones ?? '', textoOriginal: null," },
    // Clientes en el formulario
    { nombre: 'se ofrecen los inactivos', de: '      const activos = estado.clientes.filter(c => c.activo !== false)', a: '      const activos = estado.clientes' },
    { nombre: 'el cliente no se busca por apodo', de: '      const lista = clientesFiltrados(activos, busqueda).slice(0, 8)', a: '      const lista = activos.filter(c => normalizar(c.nombre).includes(normalizar(busqueda))).slice(0, 8)' },
    // Catálogo
    { nombre: 'se ofrecen conos rechazados', de: ".eq('activa', true).neq('estado_alta', 'rechazada').order('nombre')", a: ".eq('activa', true).order('nombre')" },
    { nombre: 'productos de otra unidad', de: ".select('id, nombre, tipo_masa, orden').eq('unidad_negocio_id', unidadId).eq('activo', true)", a: ".select('id, nombre, tipo_masa, orden').eq('activo', true)" },
    { nombre: 'el aviso del catálogo vacío no sale', de: '      if (estado.catalogo && !estado.catalogo.productos.length) {', a: '      if (false) {' },
    // Permisos
    { nombre: 'Pedido nuevo se ve sin cargar', de: "      document.getElementById('pe-btn-nuevo').hidden = !puedeEn('cargar')", a: "      document.getElementById('pe-btn-nuevo').hidden = false" },
    { nombre: 'abrirPedidoNuevo sin gate', de: "      if (!puedeEn('cargar')) return\n      estado.form = formPedidoVacio()", a: '      estado.form = formPedidoVacio()' },
    // Números
    { nombre: 'un dato ausente sale como 0', de: "      if (n === null || n === undefined || n === '') return '—'", a: "      if (n === null || n === undefined || n === '') return '0'" },
    { nombre: 'las cajas se enlazan sin decimales', de: '    const DECIMALES_CAJAS = 2', a: '    const DECIMALES_CAJAS = 0' },
  ],
})
