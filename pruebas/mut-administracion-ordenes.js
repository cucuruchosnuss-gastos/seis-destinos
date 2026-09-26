// Mutaciones de test-administracion-ordenes.js (Administración: portada y
// órdenes). Ver mutar.js.
//
//   node pruebas/mut-administracion-ordenes.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-ordenes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlEmpresas', 'htmlSeccion', 'htmlLink', 'htmlFilaOrden', 'htmlListaOrdenes', 'htmlOpcionesClientes',
    'htmlDatoAd', 'htmlRenglonOrden', 'htmlDetalleOrden', 'htmlValorizar'],
  equivalentes: [
    { expr: 'esc(e.id)', motivo: 'el id de una empresa va a un data-empresa entre comillas (uuid de la base)' },
    { expr: 'esc(c.id)', motivo: 'el id de un cliente va al value de un <option> entre comillas (uuid de la base)' },
    { expr: 'esc(o.id)', motivo: 'el id de una orden va a un data-orden entre comillas (uuid de la base)' },
    { expr: 'esc(s.id)', motivo: 'constante del código: el id de una SECCIÓN' },
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
    { expr: 'esc(rotulo)', motivo: 'htmlDatoAd() recibe rótulos constantes del código ("Cliente", "Cargó"…)' },
  ],
  manuales: [
    // Permisos
    { nombre: 'la sección Órdenes sin permiso', de: "      { id: 'ordenes', titulo: 'Órdenes de retiro', permiso: ['retiros', 'ver'] },", a: "      { id: 'ordenes', titulo: 'Órdenes de retiro', permiso: ['retiros', 'cargar'] }," },
    { nombre: 'el alcance no se mira', de: "      return Array.isArray(alcance?.unidades) && alcance.unidades.map(String).includes(String(unidadId))\n    }\n\n    // Las secciones", a: "      return true\n    }\n\n    // Las secciones" },
    { nombre: 'cargar abre Administración', de: "        puedeEn('retiros', 'ver', e.id) || puedeEn('retiros', 'precios', e.id) || puedeEn('retiros', 'anular', e.id))", a: "        puedeEn('retiros', 'ver', e.id) || puedeEn('retiros', 'cargar', e.id) || puedeEn('retiros', 'precios', e.id) || puedeEn('retiros', 'anular', e.id))" },
    { nombre: 'la fábrica de pruebas se ve', de: '      return sinUnidadesDePrueba(lista, estado.fabrica)', a: '      return lista' },
    { nombre: 'Cheques sin pedir tarea', de: "url: 'cheques.html', modulo: 'cobranzas', tareas: ['cobranzas:ver_todo', 'cobranzas:procesar'] },", a: "url: 'cheques.html', modulo: 'cobranzas' }," },
    { nombre: 'los links sin mirar el módulo', de: '      return LINKS.filter(l => (sa || estado.misModulos.has(l.modulo)) &&', a: '      return LINKS.filter(l => true &&' },
    { nombre: 'solo lectura ve Valorizar', de: "      const precios = activa && puedeEn('retiros', 'precios', u)", a: '      const precios = activa' },
    { nombre: 'Anular sin permiso', de: "      document.getElementById('ad-btn-anular').hidden = !(activa && puedeEn('retiros', 'anular', u))", a: "      document.getElementById('ad-btn-anular').hidden = !activa" },
    { nombre: 'anular se pide sin permiso', de: "      if (!d?.orden || !puedeEn('retiros', 'anular', d.orden.unidad_negocio_id)) return\n      d.anular", a: '      if (!d?.orden) return\n      d.anular' },
    // Portada
    { nombre: 'la portada no cuenta las sin valorizar', de: ".eq('unidad_negocio_id', unidadId).eq('estado', 'confirmada').eq('estado_valorizacion', 'pendiente')\n      if (error) throw error\n      return (data ?? []).length", a: ".eq('unidad_negocio_id', unidadId).eq('estado', 'confirmada')\n      if (error) throw error\n      return (data ?? []).length" },
    { nombre: 'la portada inventa un cero', de: "p.error = 'No se pudo contar.' })", a: 'p.sinValorizar = 0 })' },
    { nombre: 'el número sin valorizar no se marca', de: '      const atencion = Number(numero) > 0', a: '      const atencion = false' },
    { nombre: 'sin ver se cuenta igual', de: "      if (!puedeEn('retiros', 'ver', unidad)) return\n      const p = estado.portada", a: '      const p = estado.portada' },
    // Lista y filtros
    { nombre: 'no filtra por fecha desde', de: "      if (esFechaIso(filtros.desde)) q = q.gte('fecha', filtros.desde)\n", a: '' },
    { nombre: 'no filtra por cliente', de: "      if (filtros.clienteId) q = q.eq('cliente_id', filtros.clienteId)\n", a: '' },
    { nombre: 'solo sin valorizar no filtra', de: "      if (filtros.sinValorizar) q = q.eq('estado', 'confirmada').eq('estado_valorizacion', 'pendiente')\n", a: '' },
    { nombre: 'no filtra por empresa', de: "        .select('id, numero, codigo, fecha, estado, estado_valorizacion, total, moneda, cliente_id, cargada_por, cargada_en, transporte, observaciones, anulada_motivo, anulada_en, valorizada_en')\n        .eq('unidad_negocio_id', unidadId)", a: "        .select('id, numero, codigo, fecha, estado, estado_valorizacion, total, moneda, cliente_id, cargada_por, cargada_en, transporte, observaciones, anulada_motivo, anulada_en, valorizada_en')" },
    { nombre: 'la lista muestra el número pelado', de: "`<span class=\"ad-fila__linea\"><span class=\"ad-fila__codigo\">${esc(o.codigo || '—')}</span>", a: "`<span class=\"ad-fila__linea\"><span class=\"ad-fila__codigo\">${esc(o.numero)}</span>" },
    { nombre: 'sin valorizar no va en bordó', de: "${pendiente ? ' ad-fila__importe--pendiente' : ''}", a: '' },
    // Detalle y lotes
    { nombre: 'sin permiso se consultan los lotes', de: '      let lotes = null\n      if (puedeVerLotes()) {', a: '      let lotes = null\n      if (true) {' },
    { nombre: 'los lotes de otro cono', de: "      return lotes.filter(l => l.presentacion_id === it.presentacion_id && (l.marca_id ?? null) === (it.marca_id ?? null))", a: '      return lotes.filter(l => l.presentacion_id === it.presentacion_id)' },
    // Valorizar
    { nombre: 'vale un precio posterior al retiro', de: "        if (!esFechaIso(x.vigente_desde) || x.vigente_desde > fecha) continue", a: '        if (!esFechaIso(x.vigente_desde)) continue' },
    { nombre: 'toma el precio más viejo', de: '        if (!a || x.vigente_desde > a.vigente_desde) porPresentacion.set(x.presentacion_id, x)', a: '        if (!a) porPresentacion.set(x.presentacion_id, x)' },
    { nombre: 'corregir arranca de la lista', de: "          if (o.estado_valorizacion === 'valorizada' && it.precio_caja !== null && it.precio_caja !== undefined) v.precios[it.id] = Number(it.precio_caja)\n          else if", a: '          if' },
    { nombre: 'la corrección no descuenta lo anterior', de: "      const anterior = d.orden.estado_valorizacion === 'valorizada' ? Number(d.orden.total) || 0 : 0", a: '      const anterior = 0' },
    { nombre: 'el aviso del límite con >=', de: '      if (!(Number(saldo) > Number(limite))) return null', a: '      if (!(Number(saldo) >= Number(limite) - 1000000)) return null' },
    { nombre: 'sin aviso del límite', de: "      partes.push(`<div id=\"ad-valorizar-limite\">${aviso ? `<div class=\"ad-aviso ad-aviso--grave\">${esc(aviso)}</div>` : ''}</div>`)", a: "      partes.push('<div id=\"ad-valorizar-limite\"></div>')" },
    { nombre: 'faltando precios se manda igual', de: "      if (n) { v.errorGuardar = `Faltan precios en ${n} ${n === 1 ? 'renglón' : 'renglones'}.`; pintarOrden(); return }", a: '' },
    { nombre: 'un negativo se manda', de: "      if (Object.values(v.precios).some(p => Number(p) < 0)) { v.errorGuardar = 'Un precio no puede ser negativo.'; pintarOrden(); return }", a: '' },
    { nombre: 'se mandan solo los corregidos', de: '      for (const it of d.items) precios[it.id] = d.valorizar.precios[it.id]', a: '      for (const it of d.items) if (!d.valorizar.desdeLista.has(it.id)) precios[it.id] = d.valorizar.precios[it.id]' },
    { nombre: 'el error de valorizar se tapa', de: "        v.errorGuardar = err?.message || 'No se pudo valorizar. Probá de nuevo.'", a: "        v.errorGuardar = 'No se pudo valorizar. Probá de nuevo.'" },
    { nombre: 'supera el límite y no se avisa', de: '        const aviso = data?.supera_limite ? avisoLimite(data.saldo_cliente, data.limite_credito, data.moneda) : null', a: '        const aviso = null' },
    { nombre: 'el subtotal no multiplica las cajas', de: '      return p === null || p === undefined ? null : Math.round(p * Number(it.cajas) * 100) / 100', a: '      return p === null || p === undefined ? null : p' },
    // Anular
    { nombre: 'anular sin motivo', de: "      if (motivo.length < LARGO_MINIMO_MOTIVO) { d.anular.error = 'Escribí por qué se anula la orden.'; pintarAccionesOrden(); return }\n", a: '' },
    { nombre: 'el motivo sin limpiar', de: "      const motivo = limpio(document.getElementById('ad-anular-motivo').value)", a: "      const motivo = document.getElementById('ad-anular-motivo').value" },
    // La hoja
    { nombre: 'imprimir sin precios', de: "htmlHoja(ordenParaHoja(d), { conPrecios: true, copias: COPIAS_IMPRESION })", a: "htmlHoja(ordenParaHoja(d), { conPrecios: false, copias: COPIAS_IMPRESION })" },
    { nombre: 'sin valorizar la hoja inventa precios', de: "            precio: o.estado_valorizacion === 'valorizada' ? it.precio_caja : null,", a: '            precio: it.precio_caja ?? 0,' },
    { nombre: 'la hoja sin quién cargó', de: "        cargadaPor: estado.nombres.get(o.cargada_por) ?? '',", a: "        cargadaPor: ''," },
  ],
})
