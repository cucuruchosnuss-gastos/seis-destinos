// Mutaciones de test-cobranzas-unidad.js. Ver mutar.js (los tres guards: suite
// verde sobre el limpio, texto a reemplazar ÚNICO, y que la mutación cambie
// algo).
//
//   node pruebas/mut-cobranzas-unidad.js
//
// Desde el 27/09/2026 la unidad solo se MUESTRA en Cobranzas: asentar (y con
// eso la unidad, que sale del cliente) vive en Administración.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── El asentado ya no vive acá ─────────────────────────────────────────
    { nombre: 'vuelve el botón "Controlada, asentar" con la RPC vieja',
      de: '<a class="cob-btn cob-btn--primario" id="cob-link-asentar"',
      a: '<button type="button" class="cob-btn cob-btn--primario" id="cob-btn-procesar" data-rpc="marcar_cobranza_asentada">Controlada, asentar</button><a class="cob-btn cob-btn--primario" id="cob-link-asentar"' },
    { nombre: 'vuelve un botón de unidad en el detalle',
      de: "                : '<span style=\"color:var(--color-texto-suave);font-weight:500\" data-sin-unidad>Sin unidad</span>'}</span>",
      a: "                : '<span style=\"color:var(--color-texto-suave);font-weight:500\" data-sin-unidad>Sin unidad</span>'}<button type=\"button\" id=\"cob-btn-unidad\">Cambiar</button></span>" },
    { nombre: 'el link de reabrir apunta a otra cobranza',
      de: 'id="cob-link-reabrir" href="administracion.html?seccion=cobranzas&amp;cobranza=${encodeURIComponent(c.id)}"',
      a: 'id="cob-link-reabrir" href="administracion.html?seccion=cobranzas&amp;cobranza=x"' },
    { nombre: 'el link de asentar pierde la cobranza',
      de: 'id="cob-link-asentar" href="administracion.html?seccion=cobranzas&amp;cobranza=${encodeURIComponent(c.id)}"',
      a: 'id="cob-link-asentar" href="administracion.html?seccion=cobranzas"' },
    // ── Detalle ────────────────────────────────────────────────────────────
    { nombre: '"Sin unidad" desaparece',
      de: 'data-sin-unidad>Sin unidad</span>', a: 'data-sin-unidad></span>' },
    { nombre: 'la fila de la unidad solo si tiene unidad',
      de: 'const filaUnidad = tieneUnidad || asentada ?', a: 'const filaUnidad = tieneUnidad ?' },
    { nombre: 'la fila de la unidad no se dibuja',
      de: '            ${filaUnidad}\n', a: '' },
    { nombre: 'el nombre de la unidad del detalle sin escape',
      de: "escCob(c.unidad_negocio_nombre || 'unidad desconocida')", a: "(c.unidad_negocio_nombre || 'unidad desconocida')" },
    { nombre: 'unidad con id y sin nombre queda vacía',
      de: "escCob(c.unidad_negocio_nombre || 'unidad desconocida')", a: "escCob(c.unidad_negocio_nombre || '')" },
    // ── Historial ──────────────────────────────────────────────────────────
    { nombre: 'el historial nombra la unidad VIEJA',
      de: "(h.despues?.unidad_negocio_id ?? null)", a: "(h.antes?.unidad_negocio_id ?? null)" },
    { nombre: 'el historial sin fallback "unidad desconocida"',
      de: "?.nombre ?? 'unidad desconocida'}`", a: "?.nombre ?? ''}`" },
    { nombre: 'el título del historial sin escape',
      de: '<div class="cob-hist__linea">${escCob(titulo)} ·', a: '<div class="cob-hist__linea">${titulo} ·' },
    { nombre: 'el historial muestra el valor crudo de la acción',
      de: "const titulo = h.accion === 'unidad_asignada'", a: "const titulo = h.accion === 'unidad_asignada_no'" },
    // ── Listado ────────────────────────────────────────────────────────────
    { nombre: 'la fila muestra la unidad también por controlar',
      // Desde la barra de unidad (28/09/2026) la regla vive en unidadDeCobranza.
      de: "if (!c || c.estado === 'registrada') return null", a: 'if (!c) return null' },
    { nombre: 'la unidad de la fila sin escape',
      de: '<span class="cob-fila__unidad">${escCob(nombreUni)}</span>', a: '<span class="cob-fila__unidad">${nombreUni}</span>' },
    // ── Carga y consultas ──────────────────────────────────────────────────
    { nombre: 'el init no carga las unidades',
      de: 'asegurarUnidades().then(() => {', a: 'Promise.resolve().then(() => {' },
    { nombre: 'el detalle trae v_cobranzas sin las columnas de la unidad',
      de: "supabase.from('v_cobranzas').select('*').eq('id', cobranzaId).maybeSingle(),\n          supabase.from('cobranza_cheques').select('*').eq('cobranza_id', cobranzaId).order('created_at'),\n          supabase.from('cobranza_fotos').select('id, storage_path, subida_por",
      a: "supabase.from('v_cobranzas').select('id, cliente, estado').eq('id', cobranzaId).maybeSingle(),\n          supabase.from('cobranza_cheques').select('*').eq('cobranza_id', cobranzaId).order('created_at'),\n          supabase.from('cobranza_fotos').select('id, storage_path, subida_por" },
  ],
})
