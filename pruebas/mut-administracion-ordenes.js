// Mutaciones de test-administracion-ordenes.js (Administración: portada y
// órdenes). Ver mutar.js.
//
//   node pruebas/mut-administracion-ordenes.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
// Solo la parte de Administración: la cartera de cheques (una región al
// final del archivo) la mutan las suites de Cheques.
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-ordenes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlEmpresas', 'htmlSeccion', 'htmlLink', 'htmlFilaOrden', 'htmlListaOrdenes', 'htmlOpcionesClientes',
    'htmlDatoAd', 'htmlRenglonOrden', 'htmlDetalleOrden', 'htmlValorizar', 'htmlOrigenPrecio'],
  equivalentes: [
    { expr: 'esc(e.id)', motivo: 'el id de una empresa va a un data-empresa entre comillas (uuid de la base)' },
    { expr: 'esc(TODAS_LAS_FABRICAS)', motivo: "constante del código: 'todas' (\"Todas las fábricas\" de Clientes, 29/09/2026)" },
    { expr: "esc('Con ' + nombre + ' elegida arriba no tenés órdenes, clientes ni precios en Administración. Elegí otra unidad o \"Todas\".')", motivo: 'el nombre de la unidad lo prueba test-administracion-barra-unidad.js (marca «unidad»)' },
    { expr: 'esc(c.id)', motivo: 'el id de un cliente va al value de un <option> entre comillas (uuid de la base)' },
    { expr: 'esc(o.id)', motivo: 'el id de una orden va a un data-orden entre comillas (uuid de la base)' },
    { expr: 'esc(s.id)', motivo: 'constante del código: el id de una SECCIÓN' },
    // La portada y los accesos del diseño (29/09/2026): lo nuevo lo prueba test-administracion-diseno.js.
    { expr: 'esc(col.t)', motivo: 'color armado por el código (colorDeModulo o ICONO_SECCION), nunca de la base' },
    { expr: 'esc(col.c)', motivo: 'color armado por el código (colorDeModulo o ICONO_SECCION), nunca de la base' },
    { expr: 'esc(c.chip)', motivo: 'constante del código ("super_admin")' },
    { expr: 'esc(textoNumeroSeccion(c.numero))', motivo: 'un número, "—" o un texto constante' },
    { expr: 'esc(c.unidad)', motivo: 'lleva el nombre de la empresa: lo prueba test-administracion-diseno.js (empresa con HTML)' },
    { expr: 'esc(s.titulo)', motivo: 'constante del código: el título de una SECCIÓN' },
    { expr: 'esc(l.clave)', motivo: 'constante del código: la clave de un LINK' },
    { expr: 'esc(l.titulo)', motivo: 'constante del código: el título de un LINK' },
    { expr: 'esc(l.detalle)', motivo: 'constante del código: el detalle de un LINK' },
    { expr: 'esc(textoNumeroSeccion(numero))', motivo: 'un número o "—"' },
    { expr: 'esc(detalle)', motivo: 'texto constante del código en htmlSeccion()' },
    { expr: 'esc(estado.errorOrdenes)', motivo: 'texto constante del código: lo pone cargarOrdenes()' },
    { expr: 'esc(valor)', motivo: 'un importe formateado por importeHoja() o la constante "sin valorizar"' },
    { expr: 'esc(importeHoja(subtotalValorizar(d, it), moneda))', motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(importeHoja(it.precio_caja, moneda))', motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(importeHoja(it.subtotal, moneda))', motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(importeHoja(o.total, o.moneda))', motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(textoTotalValorizar(d))', motivo: 'un importe formateado por importeHoja() o una constante' },
    { expr: 'esc(it.id)', motivo: 'el id de un renglón va a atributos entre comillas (uuid de la base)' },
    { expr: 'esc(aviso)', motivo: 'avisoLimite() arma el texto con dos importes formateados' },
    { expr: 'esc(l.icono)', motivo: 'el ícono es una constante del catálogo (js/modulos.js)' },
    { expr: 'esc(l.nombre)', motivo: 'el nombre es una constante del catálogo (js/modulos.js)' },
    { expr: 'esc(rotulo)', motivo: 'htmlDatoAd() recibe rótulos constantes del código ("Cliente", "Cargó"…)' },
  ],
  manuales: [
    // Permisos
    { nombre: 'la sección Órdenes sin permiso', de: "      { id: 'ordenes', titulo: 'Órdenes de retiro', permiso: ['retiros', 'ver'] },", a: "      { id: 'ordenes', titulo: 'Órdenes de retiro', permiso: ['retiros', 'cargar'] }," },
    { nombre: 'el alcance no se mira', de: "      return Array.isArray(alcance?.unidades) && alcance.unidades.map(String).includes(String(unidadId))\n    }\n\n    // Las secciones", a: "      return true\n    }\n\n    // Las secciones" },
    { nombre: 'cargar abre Administración', de: "        puedeEn('retiros', 'ver', e.id) || puedeEn('retiros', 'precios', e.id) || puedeEn('retiros', 'anular', e.id))", a: "        puedeEn('retiros', 'ver', e.id) || puedeEn('retiros', 'cargar', e.id) || puedeEn('retiros', 'precios', e.id) || puedeEn('retiros', 'anular', e.id))" },
    { nombre: 'la fábrica de pruebas se ve', de: '      return sinUnidadesDePrueba(lista, estado.fabrica)', a: '      return lista' },
    // La fila de accesos directos (27/09/2026)
    { nombre: 'los accesos sin mirar el permiso', de: '      return LINKS.filter(m => moduloVisible(m, ctx))', a: '      return LINKS' },
    { nombre: 'falta Caja en la fila', de: "    const CLAVES_ACCESOS = ['cheques', 'cobranzas', 'cuentas-corrientes', 'gastos', 'caja']", a: "    const CLAVES_ACCESOS = ['cheques', 'cobranzas', 'cuentas-corrientes', 'gastos']" },
    { nombre: 'las tareas no cuentan (Cheques nunca aparece)', de: 'misTareas: new Set(estado.misTareas.keys()) }', a: 'misTareas: new Set() }' },
    { nombre: 'un super_admin no ve los accesos', de: "const ctx = { esAdmin: sa, esSuperAdmin: sa, misModulos", a: "const ctx = { esAdmin: false, esSuperAdmin: false, misModulos" },
    { nombre: 'Cheques como link (recarga la pantalla)', de: "      if (l.url.includes('?')) return", a: "      if (false) return" },
    { nombre: 'el título no se esconde sin accesos', de: "      document.getElementById('ad-links-titulo').hidden = !links.length\n", a: "      document.getElementById('ad-links-titulo').hidden = false\n" },
    { nombre: 'Cheques no abre su sección', de: "        if (e.target.closest('button[data-link=\"cheques\"]')) mostrarCheques()", a: "        if (e.target.closest('button[data-link=\"cheques\"]')) return" },
    { nombre: 'solo lectura ve Valorizar', de: "      const precios = activa && puedeEn('retiros', 'precios', u)", a: '      const precios = activa' },
    { nombre: 'Anular sin permiso', de: "      document.getElementById('ad-btn-anular').hidden = !(activa && puedeEn('retiros', 'anular', u))", a: "      document.getElementById('ad-btn-anular').hidden = !activa" },
    { nombre: 'anular se pide sin permiso', de: "      if (!d?.orden || !puedeEn('retiros', 'anular', d.orden.unidad_negocio_id)) return\n      d.anular", a: '      if (!d?.orden) return\n      d.anular' },
    // Portada
    { nombre: 'la portada no cuenta las sin valorizar', de: ".eq('unidad_negocio_id', unidadId).eq('estado', 'confirmada').eq('estado_valorizacion', 'pendiente')\n      if (error) throw error\n      return (data ?? []).length", a: ".eq('unidad_negocio_id', unidadId).eq('estado', 'confirmada')\n      if (error) throw error\n      return (data ?? []).length" },
    { nombre: 'la portada inventa un cero', de: "p.error = 'No se pudo contar.' })", a: 'p.sinValorizar = 0 })' },
    { nombre: 'el número sin valorizar no se marca', de: "const clase = c.urgente ? ' ad-seccion__numero--atencion'", a: "const clase = false ? ' ad-seccion__numero--atencion'" },
    { nombre: 'sin ver se cuenta igual', de: "      if (!puedeEn('retiros', 'ver', unidad)) return\n      await Promise.all([", a: '      await Promise.all([' },
    // Lista y filtros
    { nombre: 'no filtra por fecha desde', de: "      if (esFechaIso(filtros.desde)) q = q.gte('fecha', filtros.desde)\n", a: '' },
    { nombre: 'no filtra por cliente', de: "      if (filtros.clienteId) q = q.eq('cliente_id', filtros.clienteId)\n", a: '' },
    { nombre: 'solo sin valorizar no filtra', de: "      if (filtros.sinValorizar) q = q.eq('estado', 'confirmada').eq('estado_valorizacion', 'pendiente')\n", a: '' },
    { nombre: 'no filtra por empresa', de: "        .select('id, numero, codigo, fecha, estado, estado_valorizacion, total, moneda, cliente_id, cargada_por, cargada_en, transporte, observaciones, anulada_motivo, anulada_en, valorizada_en, comision_modo, comision_importe')\n        .eq('unidad_negocio_id', unidadId)", a: "        .select('id, numero, codigo, fecha, estado, estado_valorizacion, total, moneda, cliente_id, cargada_por, cargada_en, transporte, observaciones, anulada_motivo, anulada_en, valorizada_en, comision_modo, comision_importe')" },
    { nombre: 'la lista muestra el número pelado', de: "`<span class=\"ad-fila__linea\"><span class=\"ad-fila__codigo\">${esc(o.codigo || '—')}</span>", a: "`<span class=\"ad-fila__linea\"><span class=\"ad-fila__codigo\">${esc(o.numero)}</span>" },
    { nombre: 'sin valorizar no va en bordó', de: "${pendiente ? ' ad-fila__importe--pendiente' : ''}", a: '' },
    // Detalle y lotes
    { nombre: 'sin permiso se consultan los lotes', de: '      let lotes = null\n      if (puedeVerLotes()) {', a: '      let lotes = null\n      if (true) {' },
    { nombre: 'los lotes de otro cono', de: "      return lotes.filter(l => l.presentacion_id === it.presentacion_id && (l.marca_id ?? null) === (it.marca_id ?? null))", a: '      return lotes.filter(l => l.presentacion_id === it.presentacion_id)' },
    // Valorizar
    { nombre: 'vale un precio posterior al retiro', de: "        if (!esFechaIso(x.vigente_desde) || x.vigente_desde > fecha) continue", a: '        if (!esFechaIso(x.vigente_desde)) continue' },
    { nombre: 'toma el precio más viejo', de: '        if (!a || x.vigente_desde > a.vigente_desde) porClave.set(k, x)', a: '        if (!a) porClave.set(k, x)' },
    { nombre: 'el precio de un insumo se busca por presentación', de: "      return x?.insumo_id ? 'ins:' + x.insumo_id : x?.presentacion_id", a: '      return x?.presentacion_id' },
    { nombre: 'los precios de la lista sin los insumos', de: ".select('presentacion_id, insumo_id, precio_caja, vigente_desde').eq('lista_id', cli.lista_precio_id)", a: ".select('presentacion_id, precio_caja, vigente_desde').eq('lista_id', cli.lista_precio_id)" },
    { nombre: 'el insumo se valoriza por cajas', de: '      return it?.insumo_id ? Number(it.cantidad) : Number(it?.cajas)', a: '      return Number(it?.cajas)' },
    { nombre: 'los renglones se leen sin la cantidad', de: ".select('id, orden, presentacion_id, marca_id, cajas, unidades, insumo_id, cantidad, precio_caja, subtotal, lote')", a: ".select('id, orden, presentacion_id, marca_id, cajas, unidades, insumo_id, precio_caja, subtotal, lote')" },
    { nombre: 'los lotes de los insumos sin stock:ver', de: "      if ((items ?? []).some(it => it.insumo_id) && puedeEn('stock', 'ver', o.unidad_negocio_id)) {", a: "      if ((items ?? []).some(it => it.insumo_id)) {" },
    { nombre: 'el insumo se dibuja como producto', de: '      if (it.insumo_id) {\n        // Un INSUMO de reventa', a: '      if (false) {\n        // Un INSUMO de reventa' },
    { nombre: 'el precio del insumo se pide x caja', de: "        porQue = unidadHoja(pi.unidad) || 'unidad'", a: "        porQue = 'caja'" },
    { nombre: 'la hoja dibuja el insumo como producto', de: '          if (it.insumo_id) {\n            const pi = partesInsumo(estado.catalogo, it)', a: '          if (false) {\n            const pi = partesInsumo(estado.catalogo, it)' },
    { nombre: 'corregir arranca de la lista', de: "      const vigente = (it) => o.estado_valorizacion === 'valorizada' && it.precio_caja !== null && it.precio_caja !== undefined", a: '      const vigente = (it) => false' },
    // Valorizar con precio_venta() (30/09/2026)
    { nombre: 'precio_venta sin el cono del renglón', de: '          p_lista_id: listaId, p_presentacion_id: it.presentacion_id, p_marca_id: it.marca_id ?? null, p_fecha: fecha,', a: '          p_lista_id: listaId, p_presentacion_id: it.presentacion_id, p_marca_id: null, p_fecha: fecha,' },
    { nombre: 'precio_venta sin la fecha del retiro', de: '          p_lista_id: listaId, p_presentacion_id: it.presentacion_id, p_marca_id: it.marca_id ?? null, p_fecha: fecha,', a: '          p_lista_id: listaId, p_presentacion_id: it.presentacion_id, p_marca_id: it.marca_id ?? null, p_fecha: null,' },
    { nombre: 'una llamada por renglón aunque se repita', de: '        if (!porClave.has(k)) porClave.set(k, leerPrecioVenta(listaId, it, o.fecha))', a: '        porClave.set(k + it.id, leerPrecioVenta(listaId, it, o.fecha))' },
    { nombre: 'sin_precio no se mira', de: '        if (!data || data.sin_precio) return {', a: '        if (!data) return {' },
    { nombre: 'un error de la llamada inventa un cero', de: "        return { error: 'No se pudo leer el precio de la lista.' + (limpio(err?.message) ? ' ' + limpio(err.message) : '') }", a: '        return { precio: 0, datos: {} }' },
    { nombre: 'el error no dice cuál fue', de: "        return { error: 'No se pudo leer el precio de la lista.' + (limpio(err?.message) ? ' ' + limpio(err.message) : '') }", a: "        return { error: 'No se pudo leer el precio de la lista.' }" },
    { nombre: 'los insumos también van a precio_venta', de: '      const productos = listaId ? d.items.filter(it => !it.insumo_id && it.presentacion_id && !vigente(it)) : []', a: '      const productos = listaId ? d.items.filter(it => !vigente(it)) : []' },
    { nombre: 'sin lista se llama igual', de: '      const productos = listaId ? d.items.filter(it => !it.insumo_id && it.presentacion_id && !vigente(it)) : []', a: '      const productos = d.items.filter(it => !it.insumo_id && it.presentacion_id && !vigente(it))' },
    { nombre: 'la lista se lee aunque no haya insumos', de: '          if (listaId && d.items.some(it => it.insumo_id && !vigente(it))) {', a: '          if (listaId) {' },
    { nombre: 'lo propuesto no cuenta como de la lista', de: '          v.desdeLista.add(it.id)\n          const conCono', a: '          const conCono' },
    { nombre: 'sin el conito en el origen', de: "      if (conCono) unidad += Number.isFinite(conito)", a: "      if (false) unidad += Number.isFinite(conito)" },
    { nombre: 'el motivo no va en bordó', de: "${o.grave ? ' ad-renglon__origen--grave' : ''}", a: '' },
    { nombre: 'el origen no se dibuja', de: '          htmlOrigenPrecio(d.valorizar.origen?.[it.id]) + ', a: '          ' },
    { nombre: 'el precio por unidad con 2 decimales', de: "      return '$ ' + formatearNumeroAr(n, { decimales: 4, minimos: 2 })", a: "      return '$ ' + formatearNumeroAr(n, { decimales: 2 })" },
    { nombre: 'la respuesta del producto no se usa', de: '          v.precios[it.id] = r.precio\n', a: '' },
    { nombre: 'la corrección no descuenta lo anterior', de: "      const anterior = d.orden.estado_valorizacion === 'valorizada' ? Number(d.orden.total) || 0 : 0", a: '      const anterior = 0' },
    { nombre: 'el aviso del límite con >=', de: '      if (!(Number(saldo) > Number(limite))) return null', a: '      if (!(Number(saldo) >= Number(limite) - 1000000)) return null' },
    { nombre: 'sin aviso del límite', de: "      partes.push(`<div id=\"ad-valorizar-limite\">${aviso ? `<div class=\"ad-aviso ad-aviso--grave\">${esc(aviso)}</div>` : ''}</div>`)", a: "      partes.push('<div id=\"ad-valorizar-limite\"></div>')" },
    { nombre: 'faltando precios se manda igual', de: "      if (n) { v.errorGuardar = `Faltan precios en ${n} ${n === 1 ? 'renglón' : 'renglones'}.`; pintarOrden(); return }", a: '' },
    { nombre: 'un negativo se manda', de: "      if (Object.values(v.precios).some(p => Number(p) < 0)) { v.errorGuardar = 'Un precio no puede ser negativo.'; pintarOrden(); return }", a: '' },
    { nombre: 'se mandan solo los corregidos', de: '      for (const it of d.items) precios[it.id] = d.valorizar.precios[it.id]', a: '      for (const it of d.items) if (!d.valorizar.desdeLista.has(it.id)) precios[it.id] = d.valorizar.precios[it.id]' },
    { nombre: 'el error de valorizar se tapa', de: "        v.errorGuardar = err?.message || 'No se pudo valorizar. Probá de nuevo.'", a: "        v.errorGuardar = 'No se pudo valorizar. Probá de nuevo.'" },
    { nombre: 'supera el límite y no se avisa', de: '        const aviso = data?.supera_limite ? avisoLimite(data.saldo_cliente, data.limite_credito, data.moneda) : null', a: '        const aviso = null' },
    { nombre: 'el subtotal no multiplica las cajas', de: '      return p === null || p === undefined ? null : Math.round(p * cantidadValorizable(it) * 100) / 100', a: '      return p === null || p === undefined ? null : p' },
    // Anular
    { nombre: 'anular sin motivo', de: "      if (motivo.length < LARGO_MINIMO_MOTIVO) { d.anular.error = 'Escribí por qué se anula la orden.'; pintarAccionesOrden(); return }\n", a: '' },
    { nombre: 'el motivo sin limpiar', de: "      const motivo = limpio(document.getElementById('ad-anular-motivo').value)", a: "      const motivo = document.getElementById('ad-anular-motivo').value" },
    // La hoja
    { nombre: 'imprimir sin precios', de: "ordenParaHoja(d), { conPrecios: true, copias: COPIAS_IMPRESION })", a: "ordenParaHoja(d), { conPrecios: false, copias: COPIAS_IMPRESION })" },
    { nombre: 'sin valorizar la hoja inventa precios', de: "          return { ...p, cajas: it.cajas, unidades: it.unidades, lotes: lotesDeRenglon(d.lotes, it) ?? [],\n            precio: o.estado_valorizacion === 'valorizada' ? it.precio_caja : null,", a: "          return { ...p, cajas: it.cajas, unidades: it.unidades, lotes: lotesDeRenglon(d.lotes, it) ?? [],\n            precio: it.precio_caja ?? 0," },
    { nombre: 'la hoja sin quién cargó', de: "        cargadaPor: estado.nombres.get(o.cargada_por) ?? '',", a: "        cargadaPor: ''," },
  ],
})
