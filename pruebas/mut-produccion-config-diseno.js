// Mutaciones de test-produccion-config-diseno.js (el diseño "Producción ·
// Configuración", 29/09/2026). Ver mutar.js.
//
//   node pruebas/mut-produccion-config-diseno.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-config-diseno.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion-gestion.html'),
  escape: 'esc',
  funciones: ['htmlResaltado', 'htmlFilaCono', 'htmlPendienteMarca', 'htmlFilaLista'],
  equivalentes: [
    { expr: 'esc(fechaCorta(r.created_at))', motivo: 'una fecha dd/mm/aaaa formateada por Intl, o vacía' },
  ],
  manuales: [
    // ── El color ───────────────────────────────────────────────────────
    { nombre: 'Grande en el naranja de acción', de: 'grande: [0.68, 0.16, 50]', a: 'grande: [0.62, 0.19, 42]' },
    { nombre: 'el chocolate sin su marrón', de: "      if (tam) return choco ? `${tam}Ch` : tam", a: '      if (tam) return tam' },
    { nombre: 'los especiales no ganan al tamaño', de: '      for (const [palabra, clave] of ESPECIALES_PRODUCTO) if (new RegExp(`\\\\b${palabra}`).test(n)) return clave', a: '' },
    { nombre: 'los barquillos por tamaño', de: '      if (esBarquillo && num) {', a: '      if (false) {' },
    { nombre: 'el suave sin la fórmula', de: 't: `oklch(0.955 ${(C * 0.3).toFixed(3)} ${H})`', a: 't: `oklch(0.955 ${C} ${H})`' },
    { nombre: 'el oscuro sin el tope de 0.5', de: 'dk: `oklch(${r(Math.min(L, 0.5) - 0.06)}', a: 'dk: `oklch(${r(L - 0.06)}' },
    // ── Productos y empaque ────────────────────────────────────────────
    { nombre: 'cuenta también las inactivas', de: '.filter(pr => pr.activa && activos.has(pr.producto_id) && sinNingunEmpaque(d, pr.id)).length', a: '.filter(pr => activos.has(pr.producto_id) && sinNingunEmpaque(d, pr.id)).length' },
    { nombre: 'un empaque sin caja cuenta como falta', de: "      return !(d.cajas ?? []).some(x => x.presentacion_id === presId) && !(d.empaque ?? []).some(x => x.presentacion_id === presId)", a: "      return !(d.cajas ?? []).some(x => x.presentacion_id === presId)" },
    { nombre: 'la burbuja de otra unidad se muestra', de: '      if (!r || r.unidadId !== c.unidadId) return null', a: '      if (!r) return null' },
    { nombre: 'sin poder contar los conos, una burbuja igual', de: "        return Number.isInteger(n) && n > 0 ? { n, texto: textoConosPendientes(n), grave: false } : null", a: "        return { n: n ?? 0, texto: textoConosPendientes(n ?? 0), grave: false }" },
    { nombre: 'sin caja no lo dice', de: "cajas.length ? cajas.join(' o ') : 'Sin caja'", a: "cajas.join(' o ')" },
    { nombre: 'la línea del empaque sin cantidades', de: "        ...x.empaque.map(e => `${e.cantidad == null || !Number.isFinite(Number(e.cantidad)) ? '—' : formatearNumeroAr(Number(e.cantidad), { decimales: 3, minimos: 0 })} ${", a: "        ...x.empaque.map(e => `${" },
    { nombre: 'buscar en la lista no filtra', de: "      return !q || textos.some(t => normalizarBusqueda(t).includes(q))", a: '      return true' },
    { nombre: '"‹" desde el detalle abre el menú', de: '      if (c && c.movilDetalle && CON_LISTA.includes(c.tab)) {', a: '      if (false) {' },
    { nombre: 'elegir no abre el detalle en el celular', de: '      c.sel[c.tab] = id\n      c.movilDetalle = true', a: '      c.sel[c.tab] = id' },
    { nombre: 'abrir otro empaque no pregunta', de: '      if (c.empAbierto && borradorTocado(c, c.empAbierto)) { c.empPreguntar = { pres: presId }; pintarPestanaConfig(); return }', a: '' },
    { nombre: 'cambiar de producto no pregunta', de: "      if (c.tab === 'productos' && c.empAbierto && c.sel.productos !== id && borradorTocado(c, c.empAbierto)) {", a: '      if (false) {' },
    { nombre: 'el producto no vuelve si la base rechaza', de: '        p.activo = anterior\n', a: '' },
    { nombre: 'la presentación no vuelve si la base rechaza', de: '        pr.activa = anterior\n', a: '' },
    { nombre: 'el error del interruptor no dice qué no se pudo', de: "        if (c.error) c.error.texto = `${valor ? 'No se pudo prender' : 'No se pudo apagar'}: ${c.error.texto}`\n      }\n      actualizarResumenDesde(c)\n      if (estado.config === c) pintarPestanaConfig()\n      return r.ok\n    }\n\n    async function tocarActivaPresentacion", a: "      }\n      actualizarResumenDesde(c)\n      if (estado.config === c) pintarPestanaConfig()\n      return r.ok\n    }\n\n    async function tocarActivaPresentacion" },
    { nombre: 'apagar la presentación no recuenta lo que falta', de: "        valor ? `${pr.nombre}: activa.` : `${pr.nombre}: apagada.`, `pr-cfg-pressw-${pr.id}`)\n      c.guardandoSw = false\n      if (!r.ok) {\n        pr.activa = anterior\n        if (c.error) c.error.texto = `${valor ? 'No se pudo prender' : 'No se pudo apagar'}: ${c.error.texto}`\n      }\n      actualizarResumenDesde(c)", a: "        valor ? `${pr.nombre}: activa.` : `${pr.nombre}: apagada.`, `pr-cfg-pressw-${pr.id}`)\n      c.guardandoSw = false\n      if (!r.ok) {\n        pr.activa = anterior\n        if (c.error) c.error.texto = `${valor ? 'No se pudo prender' : 'No se pudo apagar'}: ${c.error.texto}`\n      }" },
    // ── Recetas ────────────────────────────────────────────────────────
    { nombre: 'la primera versión compara contra nada', de: "      if (!anterior) return 'Primera versión'", a: "      if (!anterior) return ''" },
    { nombre: 'qué cambió lista también lo que no cambió', de: '      return ids.filter(id => a.get(id) === undefined || b.get(id) === undefined || Math.abs(a.get(id) - b.get(id)) > 1e-9)', a: '      return ids.filter(id => true)' },
    { nombre: 'volver a una versión sin la nota', de: "p_nota: `Vuelve a la versión ${receta.version}` }", a: 'p_nota: null }' },
    { nombre: 'volver a una versión sin sus ingredientes', de: '      const items = d.items.filter(i => i.receta_id === receta.id)', a: '      const items = d.items.filter(i => false)' },
    { nombre: 'volver a una versión no pide confirmar', de: '      if (ds.recetaVolver !== undefined) { c.volverA = ds.recetaVolver; errorConfig(null); pintarPestanaConfig(); return }', a: "      if (ds.recetaVolver !== undefined) return accionReceta({ recetaVolverSi: ds.recetaVolver })" },
    { nombre: 'volver no dice cuál quedó igual a cuál', de: "          mostrarExito(`Listo: la v${r.data?.version ?? ''} es igual a la v${receta.version}.`)", a: '' },
    // ── Ingredientes ───────────────────────────────────────────────────
    { nombre: 'se sugiere lo que ya está conectado', de: '      return d.insumos.filter(i => !ya.has(i.id) && normalizarBusqueda(', a: '      return d.insumos.filter(i => normalizarBusqueda(' },
    { nombre: 'conectar pisa los que tenía', de: '[...new Set([...actuales, insId])]', a: '[insId]' },
    { nombre: 'quitar saca todos', de: ': actuales.filter(x => x !== insId)', a: ': []' },
    // ── Conos ──────────────────────────────────────────────────────────
    { nombre: 'Apagados deja afuera los rechazados', de: "      if (filtro === 'apagados') return todas.filter(m => m.estado_alta !== 'pendiente_revision' && !m.activa)", a: "      if (filtro === 'apagados') return marcasDelCatalogo(d).filter(m => !m.activa)" },
    { nombre: 'Activos cuenta los pendientes', de: "      if (filtro === 'activos') return marcasDelCatalogo(d).filter(m => m.activa)", a: "      if (filtro === 'activos') return todas.filter(m => m.activa)" },
    { nombre: 'Conos abre en Activos', de: "        filtroConos: 'todos', errorCono: null,", a: "        filtroConos: 'activos', errorCono: null," },
    { nombre: 'el resaltado sensible a mayúsculas', de: '      const pos = plano.indexOf(q)', a: '      const pos = t.indexOf(String(busqueda ?? \'\'))' },
    { nombre: 'sin coincidencia no escapa', de: '      if (pos < 0) return esc(t)', a: '      if (pos < 0) return t' },
  ],
})
