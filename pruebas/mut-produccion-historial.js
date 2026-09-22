// Mutaciones de test-produccion-historial.js (B7 de Producción). Ver mutar.js.
//
//   node pruebas/mut-produccion-historial.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-historial.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['cargarHistorial', 'htmlFilaHistorial', 'htmlDetalleTurno', 'htmlStockTerminado'],
  equivalentes: [
    { expr: 'esc(fechaDelDia(t.fecha))', motivo: 'una fecha dd/mm/aaaa formateada por Intl' },
    { expr: "esc(horaArgentina(m.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(textoKg(Number(t.scrap_kg)))', motivo: 'formatearNumeroAr() + " kg"' },
    { expr: 'esc(textoKg(c.kg))', motivo: 'formatearNumeroAr() + " kg"' },
    { expr: 'esc(formatearNumeroAr(p.cajas, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(p.unidades_por_caja, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(p.unidades, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(g.cajas, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(g.unidades, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(s.cajas, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(s.unidades, { decimales: 0 }))', motivo: 'dígitos, puntos y comas' },
    { expr: 'esc(dif)', motivo: 'textoDiferencias(): gramos formateados y el nombre del ingrediente, que se prueba escapado en el detalle de ingredientes' },
  ],
  manuales: [
    { nombre: 'historial solo con ver (sin configurar)', de: "      const set = new Set([...unidadesCon('ver'), ...unidadesCon('configurar')])", a: "      const set = new Set([...unidadesCon('ver')])" },
    { nombre: 'sin filtro de fecha desde', de: "          .eq('unidad_negocio_id', h.unidadId).gte('fecha', h.desde).lte('fecha', h.hasta)", a: "          .eq('unidad_negocio_id', h.unidadId).lte('fecha', h.hasta)" },
    { nombre: 'la máquina elegida no filtra', de: "        if (h.maquina) q = q.eq('maquina_id', h.maquina)\n", a: '' },
    { nombre: 'el estado elegido no filtra', de: "        if (h.estado) q = q.eq('estado', h.estado)\n", a: '' },
    { nombre: 'filtra la máquina aunque no haya', de: "        if (h.maquina) q = q.eq('maquina_id', h.maquina)", a: "        q = q.eq('maquina_id', h.maquina)" },
    { nombre: 'desde > hasta igual consulta', de: "      return /^\\d{4}-\\d{2}-\\d{2}$/.test(h.desde ?? '') && /^\\d{4}-\\d{2}-\\d{2}$/.test(h.hasta ?? '') && h.desde <= h.hasta", a: "      return true" },
    { nombre: 'sin aviso de tope', de: "      if (h.turnos.length >= TOPE_FILAS) aviso.innerHTML", a: "      if (false) aviso.innerHTML" },
    { nombre: 'arranca sin los últimos 7 días', de: "      estado.historial = estado.historial ?? { desde: sumarDias(hoy, -7), hasta: hoy, maquina: '', estado: '' }", a: "      estado.historial = estado.historial ?? { desde: hoy, hasta: hoy, maquina: '', estado: '' }" },
    { nombre: 'consumido cuenta las anuladas', de: "      const vivas = new Set(d.masas.filter(m => !m.anulada).map(m => m.id))", a: "      const vivas = new Set(d.masas.map(m => m.id))" },
    { nombre: 'consumido con la cantidad simple', de: '        act.kg = redondearKg(act.kg + Number(it.cantidad_kg))', a: '        act.kg = redondearKg(act.kg + Number(it.cantidad_simple_kg))' },
    { nombre: 'consumido incluye los sin insumo', de: "        if (!it.insumo_id || !vivas.has(it.masa_id)) continue", a: "        if (!vivas.has(it.masa_id)) continue" },
    { nombre: 'consumido no separa por lote', de: "        const k = `${it.insumo_id}|${it.lote ?? ''}`", a: '        const k = it.insumo_id' },
    { nombre: 'no marca el lote fuera de stock', de: "${i.lote_fuera_de_stock ? ', lote fuera de stock' : ''}", a: '' },
    { nombre: 'el detalle no muestra la anulada', de: "(m.anulada ? `<br><strong>Anulada:</strong> ${esc(m.anulada_motivo ?? '')}` : `<br>${esc(dif)}`)", a: '`<br>${esc(dif)}`' },
    { nombre: 'sin marca no dice Común', de: "        const marca = p.marca_id ? (d.marcas.find(x => x.id === p.marca_id)?.nombre ?? 'Marca') : 'Común'", a: "        const marca = p.marca_id ? (d.marcas.find(x => x.id === p.marca_id)?.nombre ?? 'Marca') : ''" },
    { nombre: 'stock: un sublote en cero se lista', de: '      return [...mapa.values()].filter(x => x.cajas !== 0 || x.unidades !== 0)', a: '      return [...mapa.values()]' },
    { nombre: 'stock: no suma por sublote', de: "        const k = `${m.presentacion_id}|${m.marca_id ?? ''}|${m.lote}`", a: "        const k = `${m.presentacion_id}|${m.marca_id ?? ''}|${m.lote}|${Math.random()}`" },
    { nombre: 'stock: junta marcas distintas', de: "        const k = `${m.presentacion_id}|${m.marca_id ?? ''}|${m.lote}`", a: "        const k = `${m.presentacion_id}|${m.lote}`" },
    { nombre: 'stock: de todas las unidades', de: ".select('presentacion_id, marca_id, lote, cajas, unidades').eq('unidad_negocio_id', estado.stockUnidad))", a: ".select('presentacion_id, marca_id, lote, cajas, unidades'))" },
    { nombre: 'stock: los sublotes sin ordenar', de: ".sort((a, b) => String(a.lote).localeCompare(String(b.lote), 'es', { numeric: true }))", a: '' },
    { nombre: 'stock: si falla deja lo viejo', de: "        cont.innerHTML = ''\n        aviso.innerHTML = '<div class=\"pr-aviso pr-aviso--grave\">No se pudo leer el stock terminado.", a: "        aviso.innerHTML = '<div class=\"pr-aviso pr-aviso--grave\">No se pudo leer el stock terminado." },
  ],
})
