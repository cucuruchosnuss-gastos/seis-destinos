// Mutaciones de test-administracion-listas.js. Ver mutar.js.
//
//   node pruebas/mut-administracion-listas.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-listas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlFilaLista', 'htmlFilaPrecio', 'htmlGrilla', 'htmlHistorial'],
  equivalentes: [
    { expr: 'esc(l.id)', motivo: 'el id de una lista va a un data-lista entre comillas (uuid de la base)' },
    { expr: 'esc(meta)', motivo: 'texto constante del código ("En pesos" / "En dólares" / "inactiva")' },
    { expr: 'esc(f.presentacionId)', motivo: 'el id de una presentación va a atributos entre comillas (uuid de la base)' },
    { expr: 'esc(actual + prox)', motivo: 'importes formateados y fechas dd/mm/aaaa' },
    { expr: 'esc(importeHoja(v.precio_caja, moneda))', motivo: 'un importe formateado por importeHoja()' },
    { expr: "esc('Desde ' + fechaCorta(v.vigente_desde) + (v === vigente ? ' · rige hoy' : (v.vigente_desde > hoy ? ' · todavía no rige' : '')))", motivo: 'una fecha dd/mm/aaaa y texto constante' },
  ],
  manuales: [
    { nombre: 'la sección Listas con solo ver', de: "      { id: 'listas', titulo: 'Listas de precios', permiso: ['retiros', 'precios'] },", a: "      { id: 'listas', titulo: 'Listas de precios', permiso: ['retiros', 'ver'] }," },
    { nombre: 'la lista se abre sin precios', de: "    async function abrirLista(id) {\n      if (!puedeEn('retiros', 'precios')) return", a: '    async function abrirLista(id) {' },
    // Vigente
    { nombre: 'rige un precio futuro', de: '      return { vigente: v.find(x => x.vigente_desde <= hoy) ?? null,', a: '      return { vigente: v[0] ?? null,' },
    { nombre: 'las versiones sin ordenar', de: "        .sort((a, b) => String(b.vigente_desde).localeCompare(String(a.vigente_desde)) || String(b.cargado_en ?? '').localeCompare(String(a.cargado_en ?? '')))", a: '' },
    { nombre: 'la grilla incluye las presentaciones inactivas', de: '.filter(x => x.producto_id === p.id && x.activa !== false)', a: '.filter(x => x.producto_id === p.id)' },
    { nombre: 'el chocolate no va al final', de: "        (normalizar(a.tipo_masa).includes('chocolate') - normalizar(b.tipo_masa).includes('chocolate')) || 0)", a: '        0)' },
    // Guardar
    { nombre: 'un precio igual al vigente cuenta como nuevo', de: '        if (actual && Number(actual.precio_caja) === Number(precio)) continue\n', a: '' },
    { nombre: 'guardar sin confirmar', de: '      l.confirmar = { items, desde, error: null }\n      pintarLista(false)\n    }', a: '      l.confirmar = { items, desde, error: null }\n      confirmarGuardarPrecios()\n    }' },
    { nombre: 'guarda sin fecha', de: "      if (!esFechaIso(desde)) { l.errorPorcentaje = 'Poné desde qué fecha rigen los precios nuevos.'; pintarLista(false); return }\n", a: '' },
    { nombre: 'guarda sin nada nuevo', de: "      if (!items.length) { l.errorPorcentaje = 'No hay precios nuevos para guardar.'; pintarLista(false); return }\n", a: '' },
    { nombre: 'se manda la fecha de hoy y no la elegida', de: "        const { error } = await supabase.rpc('guardar_precios', { p_lista_id: l.id, p_vigente_desde: l.confirmar.desde, p_items: l.confirmar.items })", a: "        const { error } = await supabase.rpc('guardar_precios', { p_lista_id: l.id, p_vigente_desde: hoyArgentina(), p_items: l.confirmar.items })" },
    { nombre: 'el error de guardar se tapa', de: "        l.confirmar.error = err?.message || 'No se pudieron guardar los precios. Probá de nuevo.'", a: "        l.confirmar.error = 'No se pudieron guardar los precios. Probá de nuevo.'" },
    { nombre: '"desde" no viene en hoy', de: "      document.getElementById('ad-lista-desde').value = hoyArgentina()\n      ponerNumero(enlazarPorcentaje(), null)", a: "      document.getElementById('ad-lista-desde').value = ''\n      ponerNumero(enlazarPorcentaje(), null)" },
    { nombre: 'la fecha pasada no se avisa', de: "      aviso.textContent = esFechaIso(desde) && desde < hoy ?", a: '      aviso.textContent = false ?' },
    // Aumento
    { nombre: 'el aumento guarda solo', de: '      l.pendientes = calcularAumento(l, pct, hoyArgentina())\n      l.confirmar = null\n      pintarLista(true)', a: '      l.pendientes = calcularAumento(l, pct, hoyArgentina())\n      l.confirmar = { items: preciosAGuardar(l, hoyArgentina()), desde: hoyArgentina(), error: null }\n      confirmarGuardarPrecios()' },
    { nombre: 'el aumento sin redondear', de: '        nuevos.set(f.presentacionId, Math.round(Number(v.precio_caja) * (1 + porcentaje / 100) * 100) / 100)', a: '        nuevos.set(f.presentacionId, Number(v.precio_caja) * (1 + porcentaje / 100) + 0.001)' },
    { nombre: 'el aumento inventa precio donde no había', de: '        if (!v) continue\n        nuevos.set', a: '        if (!v) { nuevos.set(f.presentacionId, 0); continue }\n        nuevos.set' },
    { nombre: 'el aumento sobre el precio futuro', de: '        const v = vigenteYProximo(l.precios, f.presentacionId, hoy).vigente\n        if (!v) continue', a: '        const v = vigenteYProximo(l.precios, f.presentacionId, hoy).proximo ?? vigenteYProximo(l.precios, f.presentacionId, hoy).vigente\n        if (!v) continue' },
    { nombre: 'sin porcentaje se aplica igual', de: "      if (pct === null || pct === 0) { l.errorPorcentaje = 'Escribí el porcentaje (por ejemplo 12,5).'; pintarLista(false); return }\n", a: '' },
    { nombre: 'descartar no descarta', de: '      l.pendientes = new Map()\n      l.confirmar = null\n      pintarLista(true)', a: '      l.confirmar = null\n      pintarLista(true)' },
    // Lista nueva y activar
    { nombre: 'la lista nueva sin nombre se manda', de: "      if (!nombre) { estado.listaNueva.error = 'Poné el nombre de la lista.'; pintarListas(); return }\n", a: '' },
    { nombre: 'la lista nueva siempre en pesos', de: "      const moneda = document.getElementById('ad-lista-moneda').value === 'USD' ? 'USD' : 'ARS'", a: "      const moneda = 'ARS'" },
    { nombre: 'desactivar no cambia nada', de: 'p_moneda: meta.moneda, p_activa: meta.activa === false })', a: 'p_moneda: meta.moneda, p_activa: meta.activa })' },
    // Historial
    { nombre: 'el historial no marca la que rige', de: "(v === vigente ? ' · rige hoy' :", a: "(false ? ' · rige hoy' :" },
  ],
})
