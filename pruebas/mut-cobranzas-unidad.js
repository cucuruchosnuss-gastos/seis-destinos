// Mutaciones de test-cobranzas-unidad.js. Ver mutar.js (los tres guards: suite
// verde sobre el limpio, texto a reemplazar ÚNICO, y que la mutación cambie
// algo).
//
//   node pruebas/mut-cobranzas-unidad.js
//
// Sin automáticas: los escCob() nuevos que importan se sacan acá, de a uno,
// con nombre. (El escCob(u.id) de la opción del diálogo no se muta: los ids
// son uuids y sacarle el escape no cambia ninguna salida posible.)

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

// Los tres renglones de poblar el select y asignarle el value, tal cual están
// en el fuente (strings comunes: el ${ va literal).
const POBLAR_1 = "      sel.innerHTML = (opciones.length === 1 ? '' : '<option value=\"\">Elegí una unidad…</option>') +"
const POBLAR_2 = "        opciones.map(u => `<option value=\"${escCob(u.id)}\">${escCob(u.nombre)}</option>`).join('')"
const ASIGNAR = '      sel.value = elegida'

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── Qué RPC se llama y con qué ─────────────────────────────────────────
    { nombre: 'asentar vuelve a marcar_cobranza_procesada (sin unidad)',
      de: "accionSimple('marcar_cobranza_asentada', { p_id: c.id, p_unidad_negocio_id: unidad }",
      a: "accionSimple('marcar_cobranza_procesada', { p_id: c.id }" },
    { nombre: 'asentar no manda la unidad',
      de: "{ p_id: c.id, p_unidad_negocio_id: unidad }, 'Cobranza asentada.'", a: "{ p_id: c.id }, 'Cobranza asentada.'" },
    { nombre: 'el botón "Controlada, asentar" vuelve a la RPC vieja sin diálogo',
      de: "btnProcesar.addEventListener('click', () => asentarConUnidad(c))",
      a: "btnProcesar.addEventListener('click', () => accionSimple('marcar_cobranza_procesada', { p_id: c.id }, 'Cobranza asentada.'))" },
    { nombre: 'asignar llama a la RPC de asentar',
      de: "accionSimple('asignar_unidad_cobranza',", a: "accionSimple('marcar_cobranza_asentada'," },
    { nombre: 'asignar manda la unidad vieja',
      de: "{ p_id: c.id, p_unidad_negocio_id: unidad }, 'Unidad de negocio guardada.'", a: "{ p_id: c.id, p_unidad_negocio_id: actual }, 'Unidad de negocio guardada.'" },
    { nombre: 'cancelar asienta igual (sin el return)',
      de: "      if (!unidad) return\n      await accionSimple('marcar_cobranza_asentada'", a: "      await accionSimple('marcar_cobranza_asentada'" },
    { nombre: 'elegir la misma unidad llama igual',
      de: 'if (!unidad || unidad === actual) return', a: 'if (!unidad) return' },
    { nombre: 'sin el listener del botón de la unidad',
      de: "      if (btnUnidad) btnUnidad.addEventListener('click', () => asignarUnidad(c))\n", a: '' },
    // ── El diálogo ─────────────────────────────────────────────────────────
    { nombre: 'preselecciona la primera unidad',
      de: ": (opciones.some(u => u.id === actual) ? actual : '')", a: ': opciones[0].id' },
    { nombre: 'Cambiar no preselecciona la actual',
      de: ": (opciones.some(u => u.id === actual) ? actual : '')", a: ": ''" },
    { nombre: 'con una sola unidad no se elige sola',
      de: 'const elegida = opciones.length === 1\n        ? opciones[0].id', a: 'const elegida = false\n        ? opciones[0].id' },
    { nombre: 'confirmar habilitado desde el arranque',
      de: "document.getElementById('cob-dlg-unidad-si').disabled = !document.getElementById('cob-dlg-unidad-select').value",
      a: "document.getElementById('cob-dlg-unidad-si').disabled = false" },
    { nombre: 'no se pinta el botón al abrir',
      de: "      pintarBotonUnidad()\n      return abrirDialogo('cob-dialogo-unidad', null)", a: "      return abrirDialogo('cob-dialogo-unidad', null)" },
    { nombre: 'elegir una unidad no habilita confirmar (sin el change)',
      de: "      selUnidad.addEventListener('change', pintarBotonUnidad)\n", a: '' },
    { nombre: 'confirmar con el select vacío resuelve (sin la guarda)',
      de: "        if (!selUnidad.value) return\n        cerrarDialogo(selUnidad.value)", a: "        cerrarDialogo(selUnidad.value || 'u-cn')" },
    { nombre: 'Escape asienta con una unidad fija',
      de: "return abrirDialogo('cob-dialogo-unidad', null)", a: "return abrirDialogo('cob-dialogo-unidad', 'u-dp')" },
    { nombre: 'Cancelar resuelve con una unidad',
      de: "getElementById('cob-dlg-unidad-cancelar').addEventListener('click', () => cerrarDialogo(null))",
      a: "getElementById('cob-dlg-unidad-cancelar').addEventListener('click', () => cerrarDialogo('u-cn'))" },
    { nombre: 'se ofrecen también las unidades inactivas',
      de: 'filter(u => u.activo !== false || u.id === actual)', a: 'filter(u => true)' },
    { nombre: 'la actual inactiva no se ofrece',
      de: 'filter(u => u.activo !== false || u.id === actual)', a: 'filter(u => u.activo !== false)' },
    // Se MUEVE la asignación (no se duplica): el value queda antes del innerHTML.
    { nombre: 'el value se asigna ANTES de poblar el select',
      de: [POBLAR_1, POBLAR_2, ASIGNAR].join('\n'), a: [ASIGNAR, POBLAR_1, POBLAR_2].join('\n') },
    { nombre: 'el value no se asigna nunca',
      de: "      sel.value = elegida\n      document.getElementById('cob-dlg-unidad-titulo')",
      a: "      document.getElementById('cob-dlg-unidad-titulo')" },
    { nombre: 'sin unidades para elegir abre igual el diálogo',
      de: '      if (!opciones.length) {', a: '      if (false) {' },
    { nombre: 'una carga fallida no se reintenta',
      de: '          if (!ok) promesaUnidades = null\n', a: '' },
    { nombre: 'se consulta el catálogo en cada apertura (sin memo)',
      de: '      if (!promesaUnidades) {\n        promesaUnidades = cargarUnidades()', a: '      if (true) {\n        promesaUnidades = cargarUnidades()' },
    { nombre: 'el nombre de la opción sin escape',
      de: '<option value="${escCob(u.id)}">${escCob(u.nombre)}</option>', a: '<option value="${escCob(u.id)}">${u.nombre}</option>' },
    { nombre: 'el confirmar nace disabled en el HTML',
      de: 'id="cob-dlg-unidad-si">Asentar', a: 'id="cob-dlg-unidad-si" disabled>Asentar' },
    // ── Detalle ────────────────────────────────────────────────────────────
    { nombre: 'botón de la unidad sin pedir procesar',
      de: 'const botonUnidad = asentada && puedeProcesar()', a: 'const botonUnidad = asentada' },
    { nombre: 'botón de la unidad en cualquier estado',
      de: 'const botonUnidad = asentada && puedeProcesar()', a: 'const botonUnidad = puedeProcesar()' },
    { nombre: 'el botón siempre dice "Asignar unidad"',
      de: "${tieneUnidad ? 'Cambiar' : 'Asignar unidad'}", a: "${'Asignar unidad'}" },
    { nombre: 'el botón de la unidad baja de 44px',
      de: 'id="cob-btn-unidad" style="min-height:44px;', a: 'id="cob-btn-unidad" style="' },
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
      de: "if (c.estado === 'procesada' && c.unidad_negocio_nombre) partes.push", a: 'if (c.unidad_negocio_nombre) partes.push' },
    { nombre: 'la unidad de la fila sin escape',
      de: '<span class="cob-fila__unidad">${escCob(c.unidad_negocio_nombre)}</span>', a: '<span class="cob-fila__unidad">${c.unidad_negocio_nombre}</span>' },
    // ── Carga y consultas ──────────────────────────────────────────────────
    { nombre: 'el init no carga las unidades',
      de: 'asegurarUnidades().then(() => {', a: 'Promise.resolve().then(() => {' },
    { nombre: 'el detalle trae v_cobranzas sin las columnas de la unidad',
      de: "supabase.from('v_cobranzas').select('*').eq('id', cobranzaId).maybeSingle(),\n          supabase.from('cobranza_cheques').select('*').eq('cobranza_id', cobranzaId).order('created_at'),\n          supabase.from('cobranza_fotos').select('id, storage_path, subida_por",
      a: "supabase.from('v_cobranzas').select('id, cliente, estado').eq('id', cobranzaId).maybeSingle(),\n          supabase.from('cobranza_cheques').select('*').eq('cobranza_id', cobranzaId).order('created_at'),\n          supabase.from('cobranza_fotos').select('id, storage_path, subida_por" },
  ],
})
