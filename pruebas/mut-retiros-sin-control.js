// Mutaciones de test-retiros-sin-control.js (la fábrica sin control de stock
// en la Carga, 26/10/2026). Ver mutar.js.
//
//   node pruebas/mut-retiros-sin-control.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-sin-control.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/retiros.html'),
  funciones: ['htmlLotesMano', 'htmlResumenLotesMano'],
  equivalentes: [
    { expr: 'esc(titulo)', motivo: 'el título del bloque es texto constante del código' },
    { expr: 'esc(enteroHoja(a.asignado))', motivo: 'un número formateado por el código' },
    { expr: 'esc(enteroHoja(a.pedido))', motivo: 'un número formateado por el código' },
    { expr: 'esc(cantidadRenglon(r, a.falta))', motivo: 'un número formateado por el código' },
    { expr: 'esc(cantidadRenglon(r, -a.falta))', motivo: 'un número formateado por el código' },
  ],
  manuales: [
    // ── Leer si la fábrica controla el stock ───────────────────────────
    { nombre: 'sinControl con cualquier valor que no sea true', de: "      cat.sinControl = !u.error && u.data?.controla_stock_terminado === false", a: "      cat.sinControl = !u.error && u.data?.controla_stock_terminado !== true" },
    { nombre: 'sinControl aunque no se pueda leer', de: "      cat.sinControl = !u.error && u.data?.controla_stock_terminado === false", a: "      cat.sinControl = !!u.error || u.data?.controla_stock_terminado === false" },
    { nombre: 'controla_stock_terminado de cualquier fábrica', de: ".select('controla_stock_terminado').eq('id', unidadId).maybeSingle()", a: ".select('controla_stock_terminado').maybeSingle()" },
    // ── El catálogo ────────────────────────────────────────────────────
    { nombre: 'sin control igual muestra el stock', de: "const stockPres = cat?.sinControl === true || pr.stock_cajas === null", a: "const stockPres = pr.stock_cajas === null" },
    { nombre: 'sin control, con cono, por cono con stock', de: "        if (cat?.sinControl === true) { con.push({ ...base, grupo: 'con_cono', marcaId: undefined, stock: null }); continue }\n", a: '' },
    { nombre: 'la pista de siempre también sin control', de: "${cat?.sinControl === true ? 'Escribí para buscar también los insumos sin stock.' : 'Escribí para buscar también lo que no tiene stock.'}", a: 'Escribí para buscar también lo que no tiene stock.' },
    // ── Cuándo se escriben los lotes ───────────────────────────────────
    { nombre: 'también los insumos se escriben a mano', de: '      return !!r && !r.insumoId && !!r.presentacionId && saleDelStock(r) && sinControlStock()', a: '      return !!r && (!!r.insumoId || !!r.presentacionId) && saleDelStock(r) && sinControlStock()' },
    { nombre: 'también con control se escriben a mano', de: '      return !!r && !r.insumoId && !!r.presentacionId && saleDelStock(r) && sinControlStock()', a: '      return !!r && !r.insumoId && !!r.presentacionId && saleDelStock(r)' },
    { nombre: 'sin control igual lee los lotes con stock', de: '&& saleDelStock(r) && !lotesAMano(r)', a: '&& saleDelStock(r)' },
    { nombre: 'el renglón sin control dibuja la lista de stock', de: '      if (lotesAMano(r)) return htmlLotesMano(r, i)\n', a: '' },
    // ── Las filas ──────────────────────────────────────────────────────
    { nombre: 'los lotes escritos no se sueltan al cambiar de producto', de: '      if (m && m.clave === claveLotesRenglon(r) && Array.isArray(m.filas) && m.filas.length) return m.filas', a: '      if (m && Array.isArray(m.filas) && m.filas.length) return m.filas' },
    { nombre: 'el lote sin mayúsculas', de: '      return String(t ?? \'\').trim().toUpperCase()', a: '      return String(t ?? \'\').trim()' },
    { nombre: 'el lote sin recortar', de: '      return String(t ?? \'\').trim().toUpperCase()', a: '      return String(t ?? \'\').toUpperCase()' },
    { nombre: 'no pasa a mayúsculas al escribir', de: '        const may = String(t.value).toUpperCase()\n        if (may !== t.value) {\n          const a = t.selectionStart, b = t.selectionEnd', a: '        const may = String(t.value)\n        if (may !== t.value) {\n          const a = t.selectionStart, b = t.selectionEnd' },
    { nombre: '"+ Agregar lote" no agrega', de: "      filas.push({ lote: '', cajas: null })\n", a: '' },
    { nombre: 'quitar un lote no quita', de: '      const filas = filasLotesMano(r).filter((_, j) => j !== Number(k))', a: '      const filas = filasLotesMano(r)' },
    // ── Lo que falta ───────────────────────────────────────────────────
    { nombre: 'sin lotes escritos no deja confirmar', de: '      if (!filas.length) return null\n      for (let k = 0;', a: "      if (!filas.length) return 'escribí los lotes'\n      for (let k = 0;" },
    { nombre: 'deja pasar cajas sin lote', de: '        if (!lote) return `escribí el lote de las ${enteroHoja(cajasDeFila(filas[k]))} cajas`\n', a: '' },
    { nombre: 'deja pasar un lote sin cajas', de: '        if (!(cajasDeFila(filas[k]) > 0)) return `poné las cajas del lote ${lote}`\n', a: '' },
    { nombre: 'sin tope de largo', de: '        if (lote.length > LARGO_LOTE_MANO) return', a: '        if (false) return' },
    { nombre: 'deja pasar si falta asignar', de: '      if (a.falta > 0) return `faltan asignar ${cantidadRenglon(r, a.falta)} a los lotes`\n', a: '' },
    { nombre: 'deja pasar si se asignó de más', de: '      if (a.falta < 0) return `asignaste ${cantidadRenglon(r, -a.falta)} de más a los lotes`\n      return null\n    }\n\n    // Los lotes que viajan', a: '      return null\n    }\n\n    // Los lotes que viajan' },
    { nombre: 'faltanRenglon no mira los lotes escritos', de: '      return lotesAMano(r) ? faltaLotesMano(r) : faltaEnLotes(r)\n    }', a: '      return faltaEnLotes(r)\n    }' },
    // ── Lo que viaja ───────────────────────────────────────────────────
    { nombre: 'los lotes escritos no viajan', de: '      const lotes = lotesAMano(r) ? lotesManoParaBase(r) : lotesParaBase(r, listaLotesDe(r))', a: '      const lotes = lotesParaBase(r, listaLotesDe(r))' },
    { nombre: 'sin lotes viaja una lista vacía', de: '      return out.length ? out : null\n    }\n\n    // El pie', a: '      return out\n    }\n\n    // El pie' },
    { nombre: 'viajan los lotes sin normalizar', de: '        .map(f => ({ lote: normalizarLoteMano(f.lote), cajas: cajasDeFila(f) }))', a: '        .map(f => ({ lote: f.lote, cajas: cajasDeFila(f) }))' },
    // ── Los textos ─────────────────────────────────────────────────────
    { nombre: 'sin lotes no avisa "Va sin lote"', de: '<span class="rt-estado-lotes rt-estado-lotes--falta">Va sin lote</span>', a: '<span class="rt-estado-lotes rt-estado-lotes--falta"></span>' },
    { nombre: 'la tarjeta dice "de los más viejos" sin control', de: "      const sinLotes = a.aMano ? 'va sin lote' : 'de los lotes más viejos'", a: "      const sinLotes = 'de los lotes más viejos'" },
    { nombre: 'el resumen dice "De los más viejos" sin control', de: "          : (a.aMano ? 'Va sin lote' : 'De los lotes más viejos')", a: "          : 'De los lotes más viejos'" },
    { nombre: 'la tarjeta y el resumen no muestran los lotes escritos', de: '      const a = asignacionDe(r)\n      // Sin lotes: de los más viejos', a: '      const a = asignacion(r, listaLotesDe(r))\n      // Sin lotes: de los más viejos' },
    { nombre: 'el pie sin lo que falta', de: '`<span class="rt-estado-lotes rt-lotes__falta">faltan ${esc(cantidadRenglon(r, a.falta))}</span>`', a: "''" },
  ],
})
