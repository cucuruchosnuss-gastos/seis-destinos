// Mutaciones de test-produccion-salidas.js (Salidas entre fábricas en la
// gestión de Producción, 21/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-salidas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-salidas.js'),
  escape: 'esc',
  funciones: ['htmlSalidas', 'htmlTotalesSalidas', 'pintarFiltrosSalidas', 'pintarProductosSalidas'],
  soloGestion: ['htmlSalidas', 'htmlTotalesSalidas', 'pintarFiltrosSalidas', 'pintarProductosSalidas'],
  equivalentes: [
    { expr: 'esc(textoEntero(general.cajas))', motivo: 'textoEntero() devuelve un número con puntos o "—": nada que escapar' },
    { expr: 'esc(textoEntero(general.unidades))', motivo: 'textoEntero() devuelve un número con puntos o "—": nada que escapar' },
    { expr: 'esc(textoEntero(t.cajas))', motivo: 'textoEntero() devuelve un número con puntos o "—": nada que escapar' },
    { expr: 'esc(textoEntero(t.unidades))', motivo: 'textoEntero() devuelve un número con puntos o "—": nada que escapar' },
    { expr: 'esc(textoEntero(f.cajas))', motivo: 'textoEntero() devuelve un número con puntos o "—": nada que escapar' },
    { expr: 'esc(textoEntero(f.unidades))', motivo: 'textoEntero() devuelve un número con puntos o "—": nada que escapar' },
    { expr: 'esc(fechaDelDia(f.fecha))', motivo: 'fechaDelDia() devuelve dd/mm/aaaa: nada que escapar' },
  ],
  manuales: [
    // ── Los valores de entrada ──────────────────────────────────────────
    { nombre: 'el origen de entrada no es Mengui', de: "      const mengui = origenes.find(u => normalizarBusqueda(u.nombre).includes('mengui'))", a: '      const mengui = null' },
    { nombre: 'Mengui solo con el nombre exacto', de: "      const mengui = origenes.find(u => normalizarBusqueda(u.nombre).includes('mengui'))", a: "      const mengui = origenes.find(u => u.nombre === 'Mengui')" },
    { nombre: 'el período de entrada empieza hoy', de: "      return { desde: hoy.slice(0, 8) + '01', hasta: hoy }", a: '      return { desde: hoy, hasta: hoy }' },
    // ── La consulta ─────────────────────────────────────────────────────
    { nombre: 'lee la tabla en vez de la vista', de: "await supabase.from('v_salidas_entre_fabricas')", a: "await supabase.from('stock_terminado_movimientos')" },
    { nombre: 'no filtra por origen', de: "          .eq('unidad_origen_id', s.origenId).gte('fecha', s.desde)", a: "          .gte('fecha', s.desde)" },
    { nombre: 'filtra por destino en vez de origen', de: "          .eq('unidad_origen_id', s.origenId).gte('fecha', s.desde)", a: "          .eq('destino_id', s.origenId).gte('fecha', s.desde)" },
    { nombre: 'sin fecha desde', de: ".gte('fecha', s.desde).lte('fecha', s.hasta)", a: ".lte('fecha', s.hasta)" },
    { nombre: 'sin fecha hasta', de: ".gte('fecha', s.desde).lte('fecha', s.hasta)", a: ".gte('fecha', s.desde)" },
    { nombre: 'lo más viejo primero', de: "          .order('fecha', { ascending: false }).order('created_at', { ascending: false })", a: "          .order('fecha', { ascending: true }).order('created_at', { ascending: false })" },
    { nombre: 'sin el remito en las columnas', de: "lote, cajas, unidades, remito, ingreso_id, motivo'", a: "lote, cajas, unidades, ingreso_id, motivo'" },
    { nombre: 'una respuesta vieja pisa la nueva', de: '        if (estado.salidas !== s || turno !== s.turno) return\n        s.filas = data ?? []', a: '        s.filas = data ?? []' },
    { nombre: 'sin aviso de 1000 filas', de: '        s.recortado = s.filas.length >= TOPE_FILAS', a: '        s.recortado = false' },
    { nombre: 'un error se ve como "no hay salidas"', de: "        s.filas = null; s.error = true\n      }", a: "        s.filas = []; s.error = false\n      }" },
    // ── El filtro y los totales ─────────────────────────────────────────
    { nombre: 'el filtro de producto no filtra', de: "      return producto ? (filas ?? []).filter(f => String(f.producto ?? '') === producto) : (filas ?? [])", a: '      return filas ?? []' },
    { nombre: 'filtrar por producto vuelve a consultar', de: "        if (campo === 'producto') pintarSalidas()\n        else cargarSalidas()", a: '        cargarSalidas()' },
    { nombre: 'los totales no filtran', de: '      tot.innerHTML = htmlTotalesSalidas(totalesSalidas(filas))', a: '      tot.innerHTML = htmlTotalesSalidas(totalesSalidas(s.filas))' },
    { nombre: 'un dato ausente suma como 0', de: '        t.unidades = sumarMedido(t.unidades, f.unidades)', a: '        t.unidades = t.unidades + (Number(f.unidades) || 0)' },
    { nombre: 'los totales no suman cajas', de: '        t.cajas = sumarMedido(t.cajas, f.cajas)', a: '        t.cajas = f.cajas' },
    { nombre: 'los totales sin orden', de: "      return [...mapa.values()].sort((a, b) => a.producto.localeCompare(b.producto, 'es'))", a: '      return [...mapa.values()]' },
    { nombre: 'un producto que ya no está queda elegido', de: "      if (s.producto && !productos.includes(s.producto)) s.producto = ''\n", a: '' },
    // ── La tabla ────────────────────────────────────────────────────────
    { nombre: 'sin la presentación ni el cono', de: "      return [f.presentacion, f.marca].map(x => String(x ?? '').trim()).filter(Boolean).join(' · ')", a: "      return ''" },
    { nombre: 'sin el destino', de: "            celda('Destino', esc(f.destino ?? '—')) +\n", a: '' },
    { nombre: 'sin el remito', de: "            celda('Remito', esc(String(f.remito ?? '').trim() || '—')) +\n", a: '' },
    { nombre: 'un remito vacío sin "—"', de: "esc(String(f.remito ?? '').trim() || '—')", a: "esc(f.remito ?? '—')" },
    { nombre: 'sin el lote', de: "            celda('Lote', esc(f.lote ?? '—'), 'pr-sal__lote') +\n", a: '' },
    { nombre: 'la tabla según la pantalla y no la sección', de: '    .pr-sal { container-type: inline-size; }\n', a: '' },
    { nombre: 'la cabecera escondida también ancha', de: '      .pr-sal .pr-of-cab { display: grid; }\n', a: '' },
    { nombre: 'la tabla ancha desde 1300 px', de: '    @container (min-width: 900px) {\n      .pr-sal .pr-of-cab', a: '    @container (min-width: 1300px) {\n      .pr-sal .pr-of-cab' },
    { nombre: 'sin cabecera de columnas', de: '`<span class="pr-of-num">Cajas</span><span class="pr-of-num">Unidades</span><span>Destino</span><span>Remito</span></div>` +', a: '`</div>` +' },
    // ── El Excel ────────────────────────────────────────────────────────
    { nombre: 'el Excel con las cajas como texto', de: '          num(f.cajas), num(f.unidades), t(f.remito), t(f.motivo)])]', a: '          String(f.cajas), num(f.unidades), t(f.remito), t(f.motivo)])]' },
    { nombre: 'el Excel sin la hoja de totales', de: "        XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filasExcelTotalesSalidas(totalesSalidas(filas))), 'Totales por producto')\n", a: '' },
    { nombre: 'el Excel exporta todo y no lo filtrado', de: '      const filas = filtrarSalidas(s.filas, s.producto)\n      if (!filas.length) { decir(', a: '      const filas = s.filas\n      if (!filas.length) { decir(' },
    { nombre: 'exporta sin salidas', de: "      if (!filas.length) { decir('No hay salidas en este período para exportar.'); return }", a: '' },
    { nombre: 'el archivo sin la fábrica', de: "      return `Salidas entre fábricas${origen ? ' - ' + origen : ''} ${f(s.desde)} a ${f(s.hasta)}.xlsx`", a: '      return `Salidas entre fábricas ${f(s.desde)} a ${f(s.hasta)}.xlsx`' },
    // ── La pantalla ─────────────────────────────────────────────────────
    { nombre: 'no se conecta', de: '      conectarIngreso()\n      conectarSalidas()', a: '      conectarIngreso()' },
    { nombre: 'en el menú no cuenta como el stock', de: " || estado.vista === 'pr-salidas') return 'stock'", a: ") return 'stock'" },
    { nombre: 'los filtros a 15 px', de: '.pr-sal .pr-input, .pr-sal .pr-select { font-size: 16px;', a: '.pr-sal .pr-input, .pr-sal .pr-select { font-size: 15px;' },
  ],
})
