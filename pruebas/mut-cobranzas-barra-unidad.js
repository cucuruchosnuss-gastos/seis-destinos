// Mutaciones de test-cobranzas-barra-unidad.js. Ver mutar.js (los tres guards:
// suite verde sobre el limpio, texto a reemplazar ÚNICO, y que la mutación
// cambie algo).
//
//   node pruebas/mut-cobranzas-barra-unidad.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-barra-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── Qué unidad cuenta ────────────────────────────────────────────────
    { nombre: 'una por controlar cuenta con la unidad vieja de antes de reabrirse',
      de: "if (!c || c.estado === 'registrada') return null", a: 'if (!c) return null' },
    { nombre: 'la lista no se filtra al armarla',
      de: 'return estado.cobranzas.filter(c => pasaFiltroUnidad(unidadDeCobranza(c), estado.unidadElegida))',
      a: 'return estado.cobranzas' },
    { nombre: 'renderizarListado dibuja estado.cobranzas sin filtrar',
      de: '      const filas = cobranzasVisibles()\n', a: '      const filas = estado.cobranzas\n' },
    // ── La consulta ──────────────────────────────────────────────────────
    { nombre: 'el or() descarta lo que no tiene unidad',
      de: 'unidad_negocio_id.eq.${elegida},unidad_negocio_id.is.null,estado.eq.registrada',
      a: 'unidad_negocio_id.eq.${elegida},estado.eq.registrada' },
    { nombre: 'el or() descarta las por controlar',
      de: 'unidad_negocio_id.is.null,estado.eq.registrada`', a: 'unidad_negocio_id.is.null`' },
    { nombre: 'cualquier texto se mete en el filtro de PostgREST',
      de: "if (!elegida || !UUID_COB.test(String(elegida))) return null", a: 'if (!elegida) return null' },
    { nombre: 'la consulta no lleva la unidad',
      de: '      if (filtroUnidad) q = q.or(filtroUnidad)\n', a: '' },
    { nombre: 'la unidad va con un .eq() que descarta los null',
      de: '      if (filtroUnidad) q = q.or(filtroUnidad)\n', a: "      if (filtroUnidad) q = q.eq('unidad_negocio_id', estado.unidadElegida)\n" },
    // ── El turno ─────────────────────────────────────────────────────────
    { nombre: 'sin turno: la respuesta vieja se suma',
      de: '        // Mientras llegaba, otro filtro o la barra pidieron otra lista.\n        if (turno !== turnoListado) return\n', a: '' },
    { nombre: 'sin turno en el error',
      de: '        if (turno !== turnoListado) return\n        console.error', a: '        console.error' },
    { nombre: 'reiniciar no avanza el turno',
      de: '        turnoListado++\n', a: '' },
    // ── La fila ──────────────────────────────────────────────────────────
    { nombre: '"Sin unidad" también con Todas',
      de: 'const sinUnidad = !uni && !!estado.unidadElegida', a: 'const sinUnidad = !uni' },
    { nombre: '"Sin unidad" nunca',
      de: 'const sinUnidad = !uni && !!estado.unidadElegida', a: 'const sinUnidad = false' },
    { nombre: 'el texto "Sin unidad" desaparece de la línea chica',
      de: 'data-sin-unidad="fila">Sin unidad</span>', a: 'data-sin-unidad="fila"></span>' },
    { nombre: 'la unidad solo en la asentada (la anulada la pierde)',
      de: "const nombreUni = uni ? (c.unidad_negocio_nombre || '') : ''",
      a: "const nombreUni = uni && c.estado === 'procesada' ? (c.unidad_negocio_nombre || '') : ''" },
    { nombre: 'la unidad de la línea chica sin escapar',
      de: 'partes.push(`<span class="cob-fila__unidad">${escCob(nombreUni)}</span>`)',
      a: 'partes.push(`<span class="cob-fila__unidad">${nombreUni}</span>`)' },
    { nombre: 'la unidad de la tabla sin escapar',
      de: '`<span class="cob-unidad-tabla">${escCob(nombreUni)}</span>`', a: '`<span class="cob-unidad-tabla">${nombreUni}</span>`' },
    { nombre: 'la tabla de escritorio pierde la unidad',
      de: '${escCob(c.cliente)}${unidadTabla}</span>', a: '${escCob(c.cliente)}</span>' },
    { nombre: 'la tabla de escritorio pierde "sin unidad"',
      de: "data-sin-unidad=\"tabla\">sin unidad</span>' : ''", a: "data-sin-unidad=\"tabla\"></span>' : ''" },
    // ── La nota y el vacío ───────────────────────────────────────────────
    { nombre: 'el listado no pinta la nota',
      de: '      pintarNotaUnidad()\n\n      if (!filas.length)', a: '\n      if (!filas.length)' },
    { nombre: 'la nota nunca se muestra',
      de: '      el.hidden = !unidad\n', a: '      el.hidden = true\n' },
    { nombre: 'la nota nunca se oculta',
      de: '      el.hidden = !unidad\n', a: '      el.hidden = false\n' },
    { nombre: 'la nota no nombra la unidad',
      de: '`Se ven las cobranzas de ${unidad} y', a: '`Se ven las cobranzas de la unidad y' },
    { nombre: 'el vacío con unidad dice el texto de siempre',
      de: '        vacio.textContent = unidad\n', a: '        vacio.textContent = false\n' },
    { nombre: 'la unidad elegida sin nombre (siempre el genérico)',
      de: "return u?.nombre || 'la unidad elegida'", a: "return 'la unidad elegida'" },
    // ── Cambiar la barra ─────────────────────────────────────────────────
    { nombre: 'cambiar la barra no repinta en el acto',
      de: '      renderizarListado()\n      cargarCobranzas({ reiniciar: true })\n    }', a: '      cargarCobranzas({ reiniciar: true })\n    }' },
    { nombre: 'cambiar la barra no recarga',
      de: '      renderizarListado()\n      cargarCobranzas({ reiniciar: true })\n    }', a: '      renderizarListado()\n    }' },
    { nombre: 'recarga antes del primer listado',
      de: '      if (!estado.listadoPedido) return\n', a: '' },
    { nombre: 'la misma unidad recarga igual',
      de: '      const cambio = nueva !== estado.unidadElegida\n', a: '      const cambio = true\n' },
    { nombre: 'no guarda las unidades de la barra',
      de: '      estado.unidadesBarra = Array.isArray(e?.unidades) ? e.unidades : []\n', a: '' },
    { nombre: 'la selección del panel mira lo que llegó y no lo que se ve',
      de: '      if (cobranzasVisibles().some(c => c.id === id)) return', a: '      if (estado.cobranzas.some(c => c.id === id)) return' },
    // ── Las cifras ───────────────────────────────────────────────────────
    { nombre: 'el total no dice que es de todas las unidades',
      de: "const deTodas = r.todasLasUnidades ? ' · de todas las unidades' : ''", a: "const deTodas = ''" },
    { nombre: 'cargarResumen no marca el total como de todas',
      de: 'todasLasUnidades: !!estado.unidadElegida }', a: 'todasLasUnidades: false }' },
    { nombre: '"Por controlar" también dice todas las unidades',
      de: "const subPendientes = r.desdeMes ? 'de todas las fechas' : 'en el período'",
      a: "const subPendientes = (r.desdeMes ? 'de todas las fechas' : 'en el período') + (r.todasLasUnidades ? ' · de todas las unidades' : '')" },
    // ── El init ──────────────────────────────────────────────────────────
    { nombre: 'el init no se suscribe a la barra',
      de: '      alCambiarUnidad(alCambiarUnidadCob)\n', a: '' },
    { nombre: 'el primer listado no espera a la barra',
      de: '      await Promise.race([promesaBarra, new Promise(r => setTimeout(r, MS_ESPERA_BARRA))])\n', a: '' },
    { nombre: 'el primer listado espera a la barra para siempre',
      de: '      await Promise.race([promesaBarra, new Promise(r => setTimeout(r, MS_ESPERA_BARRA))])\n', a: '      await promesaBarra\n' },
    { nombre: 'nunca se marca que el listado se pidió',
      de: '      estado.listadoPedido = true\n', a: '' },
    { nombre: 'la barra se pide después de las otras cargas',
      de: '      const promesaBarra = unidadesDeLaBarra()\n', a: '      const promesaBarra = Promise.resolve().then(() => cargarBancos()).then(() => unidadesDeLaBarra())\n' },
    // ── La carga no pide unidad ──────────────────────────────────────────
    { nombre: 'el formulario de carga pide la unidad',
      de: '        <div class="cob-campo">\n          <label for="cob-fecha">Fecha de la cobranza</label>',
      a: '        <div class="cob-campo"><label for="cob-unidad">Unidad</label><select id="cob-unidad"></select></div>\n        <div class="cob-campo">\n          <label for="cob-fecha">Fecha de la cobranza</label>' },
    { nombre: 'vuelve un selector de unidad propio en los filtros',
      de: '        <div class="cob-segmento" id="cob-chips-estado"',
      a: '        <select id="cob-filtro-unidad"></select>\n        <div class="cob-segmento" id="cob-chips-estado"' },
  ],
})
