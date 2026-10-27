// Mutaciones de test-retiros-venta-por-unidad.js: la venta por unidad (los
// conos de papel sueltos, 27/10/2026). Mutan js/retiros-comun.js (la hoja,
// por ARCHIVO_COMUN_RETIROS), la Carga (ARCHIVO_TEST) y Administración
// (ARCHIVO_ADMIN). De a una. Ver mutar.js.
//
//   node pruebas/mut-retiros-venta-por-unidad.js
'use strict'

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const SUITE = path.join(__dirname, 'test-retiros-venta-por-unidad.js')

correrMutacionesEnVarios([{
  suite: SUITE,
  original: path.join(__dirname, '..', 'js', 'retiros-comun.js'),
  variable: 'ARCHIVO_COMUN_RETIROS',
  funciones: [],
  manuales: [
    { nombre: 'la hoja vuelve a sumar los conos como cajas', de: "      if (esPorUnidadHoja(r)) unidades += unidadesDeRenglonHoja(r)\n      else cajas += Number(r.cajas) || 0", a: '      cajas += Number(r.cajas) || 0' },
    { nombre: '1 por caja no alcanza (solo sinStock)', de: "  return r.sinStock === true || r.sin_stock === true || porCajaHoja(r) === 1", a: '  return r.sinStock === true || r.sin_stock === true' },
    { nombre: 'la descripción vuelve a decir ×1', de: "  const n = esPorUnidadHoja(r) ? null : porCajaHoja(r)\n  const cono = nombreConoHoja(r)\n  return [n ? `×", a: "  const n = porCajaHoja(r)\n  const cono = nombreConoHoja(r)\n  return [n ? `×" },
    { nombre: 'la descripción en HTML vuelve a decir ×1', de: "  if (r?.esInsumo) return escHoja(descripcionCortaHoja(r))\n  const n = esPorUnidadHoja(r) ? null : porCajaHoja(r)", a: "  if (r?.esInsumo) return escHoja(descripcionCortaHoja(r))\n  const n = porCajaHoja(r)" },
    { nombre: 'siempre "unidades"', de: "  const conos = /^\\s*conos?\\b/i.test(String(producto ?? ''))", a: '  const conos = false' },
    { nombre: 'el singular de cono', de: "Number(n) === 1 ? (conos ? 'cono' : 'unidad')", a: "Number(n) === 1 ? (conos ? 'conos' : 'unidad')" },
    { nombre: 'las cajas de la orden cuentan los conos', de: "r?.movimiento === 'devolucion' || esPorUnidadHoja(r) ? 0 : (Number(r.cajas) || 0)), 0)\n}", a: "r?.movimiento === 'devolucion' ? 0 : (Number(r.cajas) || 0)), 0)\n}" },
    { nombre: 'el texto dice cajas para los conos', de: "    lineas.push(`- ${esPorUnidadHoja(r) ? cantidadUnidadesHoja(r.producto, r.cajas) : `${enteroHoja(r.cajas)} cajas`} · ${desc}${lotes}`)", a: "    lineas.push(`- ${enteroHoja(r.cajas)} cajas · ${desc}${lotes}`)" },
    { nombre: 'el total del texto sin los conos', de: "sueltas ? `${enteroHoja(sueltas)} un.` : ''].filter(Boolean).join(' + ')", a: "''].filter(Boolean).join(' + ')" },
    { nombre: 'el total del texto con "0 cajas"', de: "[cajasTotal || !sueltas ? `${enteroHoja(cajasTotal)} cajas` : '',", a: "[`${enteroHoja(cajasTotal)} cajas`," },
  ],
}, {
  suite: SUITE,
  original: path.join(__dirname, '..', 'modulos', 'retiros.html'),
  variable: 'ARCHIVO_TEST',
  funciones: [],
  manuales: [
    { nombre: 'el catálogo no pide sin_stock', de: "supabase.from('producto_presentaciones').select('id').eq('sin_stock', true),", a: "supabase.from('producto_presentaciones').select('id').eq('sin_stock', false)," },
    { nombre: 'el catálogo no marca', de: "      for (const pr of cat.presentaciones) if (sinStock.has(pr.id)) pr.sin_stock = true\n", a: '' },
    { nombre: 'un error del catálogo frena la carga', de: "      if (s.error) console.error('No se pudo leer qué se vende sin stock:', s.error)\n", a: '      if (s.error) throw s.error\n' },
    { nombre: 'los conos sueltos con stock (sin stock)', de: "        const libre = cat?.sinControl === true || pr.sin_stock === true", a: '        const libre = cat?.sinControl === true' },
    { nombre: 'sin_stock no se mira en la asignación', de: "      if (sinStockRenglon(r)) {\n        const p = cantidadPedida(r)", a: "      if (false) {\n        const p = cantidadPedida(r)" },
    { nombre: 'viajan lotes vacíos', de: "      if (a.sinStock || !(a.asignado > 0)) return null", a: '      if (!(a.asignado > 0)) return null' },
    { nombre: 'lee lotes', de: '&& !lotesAMano(r) && !sinStockRenglon(r)', a: '&& !lotesAMano(r)' },
    { nombre: 'los escribe a mano', de: '&& sinControlStock() && !sinStockRenglon(r)', a: '&& sinControlStock()' },
    { nombre: 'por unidad solo con sin_stock', de: "      return pr?.sin_stock === true || Number(pr?.unidades_por_caja) === 1", a: '      return pr?.sin_stock === true' },
    { nombre: 'la cantidad en cajas', de: "      if (!r?.insumoId) return porUnidadRenglon(r) ? cantidadUnidadesHoja(productoDeRenglon(r), n) : `${enteroHoja(n)} cajas`", a: "      if (!r?.insumoId) return `${enteroHoja(n)} cajas`" },
    { nombre: 'la pregunta en cajas', de: "        const sueltos = porUnidadRenglon(r) ? palabraUnidadesHoja(productoDeRenglon(r), 2) : null", a: '        const sueltos = null' },
    { nombre: '"¿Cuántos unidades"', de: ".replace('¿Cuántos unidades', '¿Cuántas unidades')", a: '' },
    { nombre: '"caja completa" para los conos', de: "(porUnidadRenglon(r) ? 'por unidad' : 'caja completa')", a: "'caja completa'" },
    { nombre: 'la tarjeta dice cajas', de: "      const u = esInsumo ? pi.u : (porUnidadRenglon(r) ? palabraUnidadesHoja(productoDeRenglon(r), pedido) : 'cajas')\n      return `<div class=\"rt-item", a: "      const u = esInsumo ? pi.u : 'cajas'\n      return `<div class=\"rt-item" },
    { nombre: 'el resumen dice cajas', de: "        const u = esInsumo ? pi.u : (porUnidadRenglon(r) ? palabraUnidadesHoja(productoDeRenglon(r), r.cajas) : 'cajas')", a: "        const u = esInsumo ? pi.u : 'cajas'" },
    { nombre: 'el resumen sin "Va sin lote"', de: "        let lote = a.sinStock ? 'Va sin lote' : a.asignado > 0", a: '        let lote = a.asignado > 0' },
    { nombre: 'el formulario cuenta los conos como cajas', de: "tipoRenglon(r) !== 'devolucion' && !porUnidadRenglon(r) && Number(r.cajas) > 0 ? Number(r.cajas) : 0), 0)", a: "tipoRenglon(r) !== 'devolucion' && Number(r.cajas) > 0 ? Number(r.cajas) : 0), 0)" },
    { nombre: 'el formulario dice "0 cajas"', de: "      const cajas = totalCajasForm(f)\n      return [cajas || !sueltos ? `${enteroHoja(cajas)} cajas` : '', sueltos]", a: "      const cajas = totalCajasForm(f)\n      return [`${enteroHoja(cajas)} cajas`, sueltos]" },
    { nombre: 'Mis retiros dice "0 cajas"', de: "      const cajas = cajasDeOrden(o)\n      return [cajas || !sueltos ? `${enteroHoja(cajas)} cajas` : '', sueltos]", a: "      const cajas = cajasDeOrden(o)\n      return [`${enteroHoja(cajas)} cajas`, sueltos]" },
    { nombre: 'Mis retiros cuenta los conos como cajas', de: "r?.movimiento === 'devolucion' || esPorUnidadHoja(r) ? 0 : (Number(r.cajas) || 0)), 0)\n    }", a: "r?.movimiento === 'devolucion' ? 0 : (Number(r.cajas) || 0)), 0)\n    }" },
    { nombre: 'la ficha dice cajas', de: "(suelto ? cantidadUnidadesHoja(r.producto, r.cajas) : enteroHoja(r.cajas) + ' cajas')", a: "enteroHoja(r.cajas) + ' cajas'" },
    { nombre: 'la hoja de la Carga no sabe que es sin stock', de: "?.sin_stock === true,\n            // Devoluciones (22/10/2026)", a: "?.sin_stock === 'x',\n            // Devoluciones (22/10/2026)" },
  ],
}, {
  suite: SUITE,
  original: path.join(__dirname, '..', 'modulos', 'administracion.html'),
  variable: 'ARCHIVO_ADMIN',
  funciones: [],
  manuales: [
    { nombre: 'Administración sin sin_stock', de: ", activa, orden, sin_stock').in('producto_id', ids)", a: ", activa, orden').in('producto_id', ids)" },
    { nombre: 'la lista sin las unidades', de: ".select('orden_id, cajas, unidades, insumo_id, tipo')", a: ".select('orden_id, cajas, insumo_id, tipo')" },
    { nombre: 'la fila sin los sueltos', de: "o.sueltas > 0 ? enteroHoja(o.sueltas) + ' un.' : ''].filter(Boolean).join(' + ')", a: "''].filter(Boolean).join(' + ')" },
    { nombre: 'la fila con "0 cajas"', de: "[Number(o.cajas) > 0 || !(o.sueltas > 0) ? enteroHoja(o.cajas) + ' cajas' : '',", a: "[enteroHoja(o.cajas) + ' cajas'," },
    { nombre: 'la ficha dice cajas', de: "(suelto ? cantidadUnidadesHoja(p.producto, it.cajas) : enteroHoja(it.cajas) + ' cajas')", a: "enteroHoja(it.cajas) + ' cajas'" },
    { nombre: 'el precio x caja', de: "porQue = suelto ? palabraUnidadesHoja(p.producto, 1) : 'caja'", a: "porQue = 'caja'" },
    { nombre: 'valorizar no busca el precio propio', de: "          if (esPorUnidadHoja({ ...p, cajas: it.cajas, unidades: it.unidades })) {\n            const propio", a: "          if (false) {\n            const propio" },
    { nombre: 'el precio propio para cualquier producto', de: "          if (esPorUnidadHoja({ ...p, cajas: it.cajas, unidades: it.unidades })) {\n            const propio", a: "          if (true) {\n            const propio" },
    { nombre: 'el precio propio de cualquier fecha', de: "        if (fecha) q = q.lte('vigente_desde', fecha)\n", a: '' },
    { nombre: 'el precio propio de otra presentación', de: ".eq('lista_id', listaId).eq('presentacion_id', presentacionId)", a: ".eq('lista_id', listaId)" },
    { nombre: 'el origen del precio propio sin "por cono"', de: "textoPrecioUnitario(r.precio_caja) + ' por ' + (r.palabra || 'unidad')", a: "textoPrecioUnitario(r.precio_caja)" },
  ],
}])
