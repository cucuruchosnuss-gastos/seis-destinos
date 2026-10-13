// Mutaciones de test-administracion-entre-empresas.js (Administración →
// Entre empresas, 13/10/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-entre-empresas.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-entre-empresas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlParEntre', 'htmlFilaEntre', 'htmlValorizarUnidadEntre', 'htmlValorizarEntre', 'htmlOpcionesEntre', 'pintarEntre'],
  equivalentes: [
    { expr: "esc('Neto: sin plata en el período')", motivo: 'texto constante del código, sin caracteres que escapar' },
  ],
  manuales: [
    // Las dos mitades
    { nombre: 'las mitades no se juntan', de: "        if (f?.tipo === 'mercaderia' && (!f.de_unidad_id || !f.a_unidad_id)) {", a: '        if (false) {' },
    { nombre: 'el precio con la presentación de destino', de: '            presentacion_id: s.presentacion_id ?? e.presentacion_id, presentacion_destino_id', a: '            presentacion_id: e.presentacion_id, presentacion_destino_id' },
    { nombre: 'no se aparea por el nombre del producto', de: '          if (i < 0) i = buscar(s => primerTramoEntre(s.detalle) === primerTramoEntre(e.detalle))\n', a: '' },
    { nombre: 'la mitad sola se pierde', de: "        salidas.forEach((s, i) => { if (!usadas.has(i)) unidas.push(s) })", a: '' },
    { nombre: 'sin ordenar por fecha', de: "      todas.sort((a, b) => String(b?.fecha ?? '').localeCompare(String(a?.fecha ?? '')))\n", a: '' },
    // Plata
    { nombre: 'un importe ausente es $ 0', de: "      if (c === null) return '—'\n      const m = String(moneda || 'ARS')", a: "      if (c === null) return '$ 0,00'\n      const m = String(moneda || 'ARS')" },
    { nombre: 'centavos sin redondear', de: '      return Math.round(Number((v * 100).toFixed(6)))\n    }\n\n    // "$ 1.234,50"', a: '      return v * 100\n    }\n\n    // "$ 1.234,50"' },
    { nombre: 'null cuenta como 0', de: "    function centavosEntre(n) {\n      if (n === null || n === undefined || n === '') return null", a: '    function centavosEntre(n) {' },
    { nombre: 'dólares como pesos', de: "      const pre = m === 'ARS' ? '$' : m === 'USD' ? 'US$' : m", a: "      const pre = '$'" },
    // El neto
    { nombre: 'el neto suma las dos direcciones', de: "        for (const [dir, signo] of [['xy', 1], ['yx', -1]]) {", a: "        for (const [dir, signo] of [['xy', 1], ['yx', 1]]) {" },
    { nombre: 'monedas mezcladas', de: '        porMoneda.set(v.moneda, (porMoneda.get(v.moneda) ?? 0) + v.cent)', a: "        porMoneda.set('ARS', (porMoneda.get('ARS') ?? 0) + v.cent)" },
    { nombre: 'el deudor al revés', de: '        if (c > 0) return `${ny} le debe a ${nx} ${plataEntre(c / 100, m)}`', a: '        if (c > 0) return `${nx} le debe a ${ny} ${plataEntre(c / 100, m)}`' },
    { nombre: 'en cero no se dice', de: "        return 'Están en cero' + enMoneda", a: "        return ''" },
    { nombre: 'el traspaso con precio se cuenta dos veces', de: '        if (yaTienePrecio(f, conPrecio)) { d.conPrecioEnDeuda++; continue }', a: '' },
    { nombre: 'la deuda cargada no reconoce el traspaso', de: "      return new Set((filas ?? []).filter(f => f?.tipo === 'otro' && String(f?.detalle ?? '').startsWith(CONCEPTO_TRASPASO_CON_PRECIO) &&", a: "      return new Set((filas ?? []).filter(f => false &&" },
    { nombre: 'el par sin las dos direcciones', de: "        dir(p.x, p.y, p.dirs.xy) + dir(p.y, p.x, p.dirs.yx) + neto + notas + '</div>'", a: "        dir(p.x, p.y, p.dirs.xy) + neto + notas + '</div>'" },
    { nombre: 'una fila sin empresas entra al par', de: '        if (!de || !a || de === a) { sueltas.push(f); continue }', a: '        if (!de && !a) { sueltas.push(f); continue }' },
    { nombre: 'no avisa lo que falta valorizar', de: '        p.sinValor = p.dirs.xy.sinValor + p.dirs.yx.sinValor', a: '        p.sinValor = 0' },
    // Filtros
    { nombre: 'el filtro de destino mira el origen', de: '        (!filtros.destino || f?.a_unidad_id === filtros.destino)', a: '        (!filtros.destino || f?.de_unidad_id === filtros.destino)' },
    { nombre: 'sin filtro de tipo', de: ' && (!filtros.tipo || f?.tipo === filtros.tipo))', a: ')' },
    { nombre: 'la fábrica de pruebas aparece', de: '        e.filas = sinPruebaEntre(normalizarEntre(data ?? []))', a: '        e.filas = normalizarEntre(data ?? [])' },
    { nombre: 'la fábrica de pruebas como destino aparece', de: '      return sinUnidadesDePrueba(a, estado.fabrica, f => f?.a_unidad_id)', a: '      return a' },
    // La carga
    { nombre: 'los parámetros de la RPC', de: "        const { data, error } = await supabase.rpc('movimientos_entre_empresas', { p_desde: desde, p_hasta: hasta })", a: "        const { data, error } = await supabase.rpc('movimientos_entre_empresas', { desde, hasta })" },
    { nombre: 'el error de la base se tapa', de: "        e.error = err?.message || 'No se pudieron leer los movimientos entre empresas.'", a: "        e.error = 'No se pudieron leer los movimientos entre empresas.'" },
    { nombre: 'sin Reintentar', de: "          '<button type=\"button\" class=\"ad-btn ad-btn--suave\" data-entre-reintentar>Reintentar</button>'", a: "          ''" },
    { nombre: 'la respuesta vieja pisa', de: "        if (error) throw error\n        if (turno !== e.turno) return\n        e.filas", a: "        if (error) throw error\n        e.filas" },
    { nombre: 'sin período consulta igual', de: "      if (!desde || !hasta) { e.error = 'Elegí el período.'; pintarEntre(); return }\n", a: '' },
    { nombre: 'el período vacío sin palabras', de: "      if (!e.filas.length) { vaciar(); lista.innerHTML = '<div class=\"ad-vacio\">En este período ninguna empresa le pasó nada a otra.</div>'; return }", a: '' },
    // Valorizar
    { nombre: 'las listas de la que recibe', de: '      for (const f of filas ?? []) if (necesitaValor(f, conPrecio) && !ids.includes(f.de_unidad_id)) ids.push(f.de_unidad_id)', a: '      for (const f of filas ?? []) if (necesitaValor(f, conPrecio) && !ids.includes(f.a_unidad_id)) ids.push(f.a_unidad_id)' },
    { nombre: 'listas sin filtrar activas', de: ".eq('unidad_negocio_id', u).eq('activa', true).order('nombre')", a: ".eq('unidad_negocio_id', u).order('nombre')" },
    { nombre: 'precio_venta con un cono', de: "{ p_lista_id: listaId, p_presentacion_id: pres, p_marca_id: null, p_fecha: fecha }", a: "{ p_lista_id: listaId, p_presentacion_id: pres, p_fecha: fecha }" },
    { nombre: 'precio_venta sin la fecha', de: "{ p_lista_id: listaId, p_presentacion_id: pres, p_marca_id: null, p_fecha: fecha }", a: "{ p_lista_id: listaId, p_presentacion_id: pres, p_marca_id: null }" },
    { nombre: 'el producto no multiplica las cajas', de: '            res.set(f._id, { cent: Math.round(pc * cant), moneda, lista: nombreLista })', a: '            res.set(f._id, { cent: pc, moneda, lista: nombreLista })' },
    { nombre: 'sin precio vale 0', de: "            if (!d || d.sin_precio || pc === null || f.cantidad === null || f.cantidad === undefined || !Number.isFinite(cant)) {", a: '            if (false) {' },
    { nombre: 'el insumo sin costo se valoriza', de: "            if (!r || r.sin_costo || r.precio_unitario === null || r.precio_unitario === undefined || c === null) {", a: '            if (!r || c === null) {' },
    { nombre: 'sin permiso de precios se valoriza igual', de: "        if (productos.length && !puedeValorizarProductoEntre(u)) sinPermiso = productos.length", a: '        if (false) sinPermiso = productos.length' },
    { nombre: 'el permiso de precios sin alcance', de: "      return puedeEn('retiros', 'precios', u)\n    }\n\n    function textoEstadoValorEntre", a: "      return true\n    }\n\n    function textoEstadoValorEntre" },
    { nombre: 'sin decir cuántos sin precio', de: "      if (st.sinPrecio) partes.push(", a: '      if (false) partes.push(' },
    { nombre: 'el error de valorizar se tapa', de: "        error = err?.message || 'No se pudo valorizar.'", a: "        error = 'No se pudo valorizar.'" },
    { nombre: 'con error queda algo valorizado', de: "      if (error) { e.valorizando.set(u, { error, lista: nombreLista }); pintarEntre(); return }", a: "      if (error) { e.valorizando.set(u, { error, lista: nombreLista }) }" },
    { nombre: '"Sin valorizar" no limpia', de: '      for (const f of filas) e.valores.delete(f._id)\n', a: '' },
    { nombre: 'lo valorizado no entra al neto', de: "      if (v && v.cent !== null && v.cent !== undefined) return { cent: v.cent, moneda: v.moneda, valorizado: true }", a: '' },
    { nombre: 'la valorización no se marca', de: '        if (v.valorizado) d.valorizados.add(f.tipo)', a: '' },
    { nombre: 'sin permiso de listas: selector igual', de: "      if (!puedeLeerListasEntre(u)) {\n        return `<p class=\"ad-aviso\">", a: "      if (false) {\n        return `<p class=\"ad-aviso\">" },
    // El permiso y la portada
    { nombre: 'la sección sin permiso propio', de: "      { id: 'entre', titulo: 'Entre empresas', global: true, tareas: ['gastos:gastos_empresa'] },", a: "      { id: 'entre', titulo: 'Entre empresas', global: true, tareas: ['retiros:ver'] }," },
    { nombre: 'sin leer las tareas de gastos', de: "['retiros', 'pedidos', 'stock', 'gastos', 'produccion'", a: "['retiros', 'pedidos', 'stock', 'produccion'" },
    { nombre: 'mostrarEntre sin permiso abre', de: "      if (!SECCIONES.some(s => s.id === 'entre' && seccionVisible(s))) { mostrarInicio(); return }\n      mostrarVista('ad-vista-entre')", a: "      mostrarVista('ad-vista-entre')" },
    { nombre: 'la portada cuenta las mitades', de: '      const filas = sinPruebaEntre(normalizarEntre(data ?? []))\n      const pares', a: '      const filas = data ?? []\n      const pares' },
  ],
})
