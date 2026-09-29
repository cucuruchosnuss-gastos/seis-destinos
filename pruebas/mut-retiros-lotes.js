// Mutaciones de test-retiros-lotes.js (varios lotes por renglón, los tres
// grupos del catálogo y el faltante que no bloquea). Ver mutar.js.
//
//   node pruebas/mut-retiros-lotes.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-lotes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/retiros.html'),
  escape: 'esc',
  funciones: ['htmlProductosRenglon', 'htmlAvisoFaltante', 'htmlResumenLotes', 'htmlLoteRenglon'],
  equivalentes: [
    { expr: 'esc(o.insumoId)', motivo: 'el id de un insumo va a un data-id entre comillas (uuid de la base)' },
    { expr: 'esc(o.presentacionId)', motivo: 'el id de una presentación va a un data-presentacion entre comillas (uuid de la base)' },
    { expr: 'esc(marca)', motivo: 'el id de un cono (uuid), "" o la constante MARCA_A_ELEGIR, en un data-marca entre comillas' },
    { expr: 'esc(o.productoId)', motivo: 'el id interno del producto lleva su nombre: lo cubre test-retiros-carga.js («id interno del producto»)' },
    { expr: 'esc(g.titulo)', motivo: 'el título de un grupo es una constante del código (GRUPOS_RETIRO)' },
    { expr: 'esc(TEXTO_FALTANTE)', motivo: 'texto constante del código' },
    { expr: 'esc(info.error)', motivo: 'texto constante del código: lo pone asegurarLotes()' },
    { expr: 'esc(fechaCorta(l.desde))', motivo: 'fechaCorta() devuelve dd/mm/aaaa o "—"' },
    { expr: 'esc(q)', motivo: 'lo buscado solo se muestra en «Nada coincide»: lo prueba test-retiros-carga.js («búsqueda sin resultados»)' },
    { expr: 'esc(detalle)', motivo: 'el detalle es la marca del insumo o una constante: lo prueba test-retiros-carga.js («productos»: insumo-marca)' },
  ],
  manuales: [
    // Los tres grupos
    { nombre: 'CON CONO antes que SIN CONO', de: "      { tipo: 'sin_cono', titulo: 'Producto terminado · SIN CONO' },\n      { tipo: 'con_cono', titulo: 'Producto terminado · CON CONO' },", a: "      { tipo: 'con_cono', titulo: 'Producto terminado · CON CONO' },\n      { tipo: 'sin_cono', titulo: 'Producto terminado · SIN CONO' }," },
    { nombre: 'sin buscar se ofrece lo que no tiene stock', de: '(q ? true : hayStock(o))', a: '(true)' },
    { nombre: 'al buscar NO se ofrece lo que no tiene stock', de: '(q ? true : hayStock(o))', a: '(hayStock(o))' },
    { nombre: 'un stock desconocido se esconde', de: 'const hayStock = (o) => o.stock === null || o.stock === undefined || o.stock > 0', a: 'const hayStock = (o) => o.stock > 0' },
    { nombre: 'los conos sin stock se ofrecen sin buscar', de: "k.startsWith(pr.id + '|') && v > 0)", a: "k.startsWith(pr.id + '|'))" },
    { nombre: 'el cono no va en el nombre', de: "nombre: `${base.nombre} · ${cono}`,", a: 'nombre: base.nombre,' },
    { nombre: 'sin stock por cono no se dice "entre todos los conos"', de: "con.push({ ...base, grupo: 'con_cono', marcaId: undefined, stock: stockPres, entreConos: true })", a: "con.push({ ...base, grupo: 'con_cono', marcaId: undefined, stock: stockPres })" },
    { nombre: '"sin stock" no se marca en bordó', de: '<span${sinStock ? \' class="rt-opcion__sin-stock"\' : \'\'}>', a: '<span>' },
    { nombre: 'no se dice la pista de buscar', de: "      const pista = q ? '' : '<p class=\"rt-pista\">Escribí para buscar también lo que no tiene stock.</p>'", a: "      const pista = ''" },
    { nombre: 'la opción con cono no lleva el cono', de: " data-marca=\"${esc(marca)}\">${partes}</button>`", a: '>${partes}</button>`' },
    { nombre: 'elegir la opción no toma la presentación', de: '      if (pr) {\n        r.presentacionId = pr.id', a: '      if (false) {\n        r.presentacionId = pr.id' },
    { nombre: 'elegir la opción no toma el cono', de: "        r.marcaId = r.conCono && marcaId && marcaId !== MARCA_A_ELEGIR ? marcaId : null", a: '        r.marcaId = null' },
    { nombre: '"elegir" se toma como un cono', de: "        r.marcaId = r.conCono && marcaId && marcaId !== MARCA_A_ELEGIR ? marcaId : null", a: '        r.marcaId = r.conCono && marcaId ? marcaId : null' },
    { nombre: 'la presentación de otro producto se toma', de: '.find(x => x.id === presentacionId && x.producto_id === id)', a: '.find(x => x.id === presentacionId)' },
    // Leer el catálogo y el stock por cono (catalogo_para_retiro().conos, 29/09/2026)
    { nombre: 'el catálogo no lleva los conos', de: 'insumos, conos: conosDesdeRpc(data) }', a: 'insumos, conos: null }' },
    { nombre: 'sin la clave conos se inventa un Map vacío', de: '      if (!Array.isArray(data?.conos)) return null\n', a: '' },
    { nombre: 'una fila sin marca se toma como cono', de: "        if (!c?.presentacion_id || !c?.marca_id) continue", a: "        if (!c?.presentacion_id) continue" },
    { nombre: 'los conos no se suman', de: '        m.set(k, (m.get(k) ?? 0) + (Number(c.stock_cajas) || 0))', a: '        m.set(k, 0)' },
    { nombre: 'el cono común no se deduce', de: '        if (comun > 0) m.set(claveLotes(x.presentacion_id, null), comun)', a: '' },
    { nombre: 'el cono común sin restar los conos', de: '        const comun = (Number(x.stock_cajas) || 0) - deConos', a: '        const comun = (Number(x.stock_cajas) || 0)' },
    { nombre: 'un cono común en cero se ofrece', de: '        if (comun > 0) m.set(claveLotes(x.presentacion_id, null), comun)', a: '        m.set(claveLotes(x.presentacion_id, null), comun)' },
    { nombre: 'las presentaciones sin cono suman cono común', de: "        if (!x?.presentacion_id || x.con_cono !== true) continue", a: "        if (!x?.presentacion_id) continue" },
    { nombre: 'un stock de presentación desconocido inventa un común', de: '        const comun = (Number(x.stock_cajas) || 0) - deConos', a: '        const comun = (Number(x.stock_cajas) || 1) - deConos' },
    { nombre: 'las opciones no miran los conos del catálogo', de: "    function htmlProductosRenglon(i, cat, busqueda = '', stockConos = cat?.conos ?? null) {", a: "    function htmlProductosRenglon(i, cat, busqueda = '', stockConos = null) {" },
    { nombre: 'los insumos sin stock no se suman', de: '        if (!i?.id || conStock.has(i.id)) continue', a: '        continue' },
    { nombre: 'el insumo con stock se duplica', de: '        if (!i?.id || conStock.has(i.id)) continue', a: '        if (!i?.id) continue' },
    { nombre: 'los insumos sin stock se leen también los inactivos', de: ".select('id, nombre, marca, categoria, unidad_medida').eq('activo', true)", a: ".select('id, nombre, marca, categoria, unidad_medida')" },
    { nombre: 'si fallan los insumos sin stock, se cae el catálogo', de: '      if (t.error) console.error', a: '      if (t.error) throw t.error\n      if (t.error) console.error' },
    // Completar con los más viejos
    { nombre: 'completar no respeta el stock del lote', de: '        const toma = r3(Math.min(resta, l.saldo))', a: '        const toma = r3(resta)' },
    { nombre: 'completar arranca del más nuevo', de: '      for (const l of Array.isArray(lista) ? lista : []) {\n        if (resta <= 0) break', a: '      for (const l of (Array.isArray(lista) ? [...lista].reverse() : [])) {\n        if (resta <= 0) break' },
    { nombre: 'completar sin redondeo', de: '        const toma = r3(Math.min(resta, l.saldo))\n        if (toma > 0) out[l.lote] = toma\n        resta = r3(resta - toma)', a: '        const toma = Math.min(resta, l.saldo)\n        if (toma > 0) out[l.lote] = toma\n        resta = resta - toma' },
    { nombre: 'el botón Completar no reparte', de: '      r.lotes = completarConLosMasViejos(lista, cantidadPedida(r))', a: '      r.lotes = {}' },
    { nombre: 'no hay botón Completar', de: 'data-r-completar="${i}">Completar con los más viejos</button>', a: 'data-r-nada="${i}">Listo</button>' },
    { nombre: 'Que salga sola no suelta', de: '    function limpiarLotes(i) {\n      const r = renglon(i)\n      if (!r) return\n      r.lotes = {}', a: '    function limpiarLotes(i) {\n      const r = renglon(i)\n      if (!r) return' },
    // Lo asignado y lo que falta
    { nombre: 'no se dice cuánto falta asignar', de: '`<span class="rt-lotes__falta">falta asignar: <strong>${esc(cantidadRenglon(r, a.falta))}</strong>', a: '`<span class="rt-lotes__falta">asignado: <strong>${esc(cantidadRenglon(r, a.asignado))}</strong>' },
    { nombre: 'no se dice el total pedido', de: '      } else linea = `Pedido: <strong>${esc(cantidadRenglon(r, a.pedido))}</strong> · asignado todo.`', a: '      } else linea = `Asignado todo.`' },
    { nombre: 'lo que falta asignar con lugar no bloquea', de: "      if (a.falta > 0 && !a.sinLugar) return", a: '      if (false) return' },
    { nombre: 'asignar de más no bloquea', de: '      if (a.falta < 0) return `asignaste', a: '      if (false) return `asignaste' },
    { nombre: 'un lote que no está en la lista se cuenta', de: "      const porLote = (Array.isArray(lista) ? lista : []).map(l => {", a: "      const porLote = [...(Array.isArray(lista) ? lista : []), ...Object.keys(asignados).filter(k => !(lista ?? []).some(l => l.lote === k)).map(k => ({ lote: k, saldo: 1e9 }))].map(l => {" },
    { nombre: 'sinLugar mira un solo lote', de: '      const sinLugar = porLote.every(l => l.q >= l.saldo)', a: '      const sinLugar = porLote.some(l => l.q >= l.saldo)' },
    // El payload con 'lotes'
    { nombre: 'el producto no manda sus lotes', de: '      if (lotes) item.lotes = lotes\n', a: '' },
    { nombre: 'el insumo no manda sus lotes', de: '        if (lotes) ins.lotes = lotes\n', a: '' },
    { nombre: 'los lotes del insumo viajan con cajas', de: "      const clave = r.insumoId ? 'cantidad' : 'cajas'", a: "      const clave = 'cajas'" },
    { nombre: 'lo que no entra no va a SIN STOCK', de: '      if (a.falta > 0 && a.sinLugar) out.push({ lote: LOTE_FALTANTE, [clave]: a.falta })\n', a: '' },
    { nombre: 'lo que falta con lugar también va a SIN STOCK', de: '      if (a.falta > 0 && a.sinLugar) out.push({ lote: LOTE_FALTANTE, [clave]: a.falta })', a: '      if (a.falta > 0) out.push({ lote: LOTE_FALTANTE, [clave]: a.falta })' },
    { nombre: 'viajan los lotes en cero', de: '      const out = a.porLote.filter(l => l.q > 0).map(', a: '      const out = a.porLote.map(' },
    { nombre: 'sin repartir viajan lotes vacíos', de: '      if (!(a.asignado > 0)) return null\n      const clave', a: '      const clave' },
    { nombre: 'el stock sin lote de un insumo se descarta', de: '        if (lote === LOTE_FALTANTE) continue', a: '        if (!lote || lote === LOTE_FALTANTE) continue' },
    { nombre: 'SIN STOCK se ofrece como lote de insumo', de: '        if (lote === LOTE_FALTANTE) continue', a: '' },
    // El faltante que no bloquea
    { nombre: 'el faltante sin repartir no se calcula', de: '        if (asignado === 0) faltante = r3(Math.max(pedido - porLote.reduce((s, l) => s + l.saldo, 0), 0))', a: '        if (asignado === 0) faltante = 0' },
    { nombre: 'el lote excedido no es faltante', de: '        else faltante = r3(porLote.reduce((s, l) => s + l.excede, 0) + (falta > 0 && sinLugar ? falta : 0))', a: '        else faltante = r3(falta > 0 && sinLugar ? falta : 0)' },
    { nombre: 'sin lista de lotes se inventa un faltante', de: '      if (Array.isArray(lista) && pedido !== null) {', a: '      if (pedido !== null) {' },
    { nombre: 'el aviso del faltante no se muestra', de: "      if (!(a?.faltante > 0)) return ''\n      return `<div", a: "      return ''\n      return `<div" },
    { nombre: 'el aviso del faltante no es bordó', de: '<div class="rt-aviso rt-aviso--grave" data-r-faltante>', a: '<div class="rt-aviso" data-r-faltante>' },
    { nombre: 'el aviso no dice que queda pendiente en Administración', de: "const TEXTO_FALTANTE = 'Esto no está en stock: la orden sale igual y queda pendiente de revisión en Administración'", a: "const TEXTO_FALTANTE = 'Esto no está en stock'" },
    { nombre: 'el faltante bloquea', de: '    function faltaEnLotes(r) {\n      const a = asignacion(r, listaLotesDe(r))', a: '    function faltaEnLotes(r) {\n      const a = asignacion(r, listaLotesDe(r))\n      if (a.faltante > 0) return \'no hay stock\'' },
    { nombre: 'el resumen no avisa el faltante', de: '${htmlAvisoFaltante(r, a)}</span>`', a: '</span>`' },
    { nombre: 'el lote excedido no se dice', de: ".map(l => `<br><span class=\"rt-lotes__falta\">${esc(nombreLote(l.lote))}: pusiste", a: ".filter(() => false).map(l => `<br><span class=\"rt-lotes__falta\">${esc(nombreLote(l.lote))}: pusiste" },
    { nombre: 'el hecho no dice que quedó pendiente en Administración', de: 'y lo que faltó quedó pendiente de revisión en Administración.', a: 'avisale a Producción.' },
    // Los lotes se leen solos
    { nombre: 'tocar un renglón no lee sus lotes', de: '      guardarBorrador()\n      asegurarLotesDeRenglones()\n    }', a: '      guardarBorrador()\n    }' },
    { nombre: 'tipear en un lote redibuja el renglón', de: '      else delete r.lotes[lote]\n      pintarResumenLotes(i)', a: '      else delete r.lotes[lote]\n      pintarRenglones()' },
    { nombre: 'borrar un lote deja el cero', de: '      else delete r.lotes[lote]\n', a: '      else r.lotes[lote] = 0\n' },
    { nombre: 'los campos de lote se enlazan sin decimales', de: 'enlazarCampoNumero(input, { decimales: r?.insumoId ? decimalesDeUnidad(r.unidad) : DECIMALES_CAJAS })', a: 'enlazarCampoNumero(input, { decimales: DECIMALES_CAJAS })' },
    // El borrador viejo
    { nombre: 'el borrador viejo pierde su lote', de: '        if (r.lote && !Object.keys(r.lotes).length && cantidadPedida(r) !== null) r.lotes[r.lote] = cantidadPedida(r)\n', a: '' },
    { nombre: 'el borrador viejo conserva "lote"', de: '        delete r.lote\n        delete r.eligiendoLote\n', a: '' },
    { nombre: 'retomar el borrador no lo reconcilia', de: '      reconciliarRenglones(estado.form, null)\n', a: '' },
  ],
})
