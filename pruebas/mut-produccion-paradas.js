// Mutaciones de test-produccion-paradas.js ("terminar la tablet", parte 4). Ver mutar.js.
//
//   node pruebas/mut-produccion-paradas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-paradas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlAccionesParada', 'htmlParadas', 'htmlCampoHora', 'htmlHorasParada'],
  equivalentes: [
    { expr: 'esc(clave)', motivo: 'clave es "inicio" o "fin", constantes del código' },
    { expr: 'esc(rotulo)', motivo: 'el rótulo es "Paró a las" / "Volvió a las", constantes del código' },
    { expr: "esc(normalizarHora(valor) || 'sin hora')", motivo: 'normalizarHora() solo devuelve "HH:MM" o vacío' },
    { expr: 'esc(muestra)', motivo: 'la hora que se muestra es "HH:MM", los dígitos tipeados con "·" o "—"' },
    { expr: 'esc(dia)', motivo: 'textoDiaParada() arma el texto con fechas dd/mm/aaaa, sin datos de nadie' },
    { expr: 'esc(desde)', motivo: 'horaArgentina() solo devuelve "HH:MM" o vacío, y si no "—"' },
    { expr: 'esc(dur)', motivo: 'duracionTexto() solo devuelve horas y minutos' },
    { expr: "esc(horaArgentina(p.fin) || '—')", motivo: 'horaArgentina() solo devuelve "HH:MM" o vacío' },
  ],
  manuales: [
    // Las horas.
    { nombre: 'la hora sin la zona de Argentina', de: '      return `${hoyArgentina(d)}T${horaArgentina(d)}:00-03:00`', a: '      return `${hoyArgentina(d)}T${horaArgentina(d)}:00`' },
    { nombre: 'el instante sin la zona (se lee en la del proceso)', de: '      return new Date(`${dia}T${hhmm}:00-03:00`).getTime()', a: '      return new Date(`${dia}T${hhmm}:00`).getTime()' },
    { nombre: 'la vuelta menor NO pasa al día siguiente', de: '      if (fin <= ini) fin += MS_DIA\n', a: '' },
    { nombre: 'una hora antes del piso no pasa al día siguiente', de: '      if (ini < piso) ini += MS_DIA\n', a: '' },
    { nombre: 'sin el piso de una hora antes de abrir', de: '    const PISO_APERTURA_MS = 3600000', a: '    const PISO_APERTURA_MS = 0' },
    { nombre: 'el cruce de medianoche sin tope de horas', de: '      if (h2 <= h1 && fin - ini > MAX_CRUCE_MS)', a: '      if (false)' },
    { nombre: 'el cruce de medianoche con tope de 24 horas', de: '    const MAX_CRUCE_MS = 12 * 3600000', a: '    const MAX_CRUCE_MS = 24 * 3600000' },
    { nombre: 'sin la tolerancia de 5 minutos', de: '    const TOLERANCIA_FUTURO_MS = 5 * 60000', a: '    const TOLERANCIA_FUTURO_MS = 0' },
    { nombre: 'una cerrada usa "ahora" como tope', de: "      const cerrado = turno?.estado === 'cerrado' && !!turno?.cerrado_en", a: '      const cerrado = false' },
    { nombre: 'vuelta igual a la parada no se trata como un error de tipeo', de: '      if (h2 <= h1 && fin - ini', a: '      if (h2 < h1 && fin - ini' },
    { nombre: 'la vuelta futura pasa', de: '      if (fin > tope) return', a: '      if (false) return' },
    { nombre: 'sigue parada igual manda la vuelta', de: '      if (f.sigue) return { inicio: isoAr(ini), fin: null }', a: '      if (false) return { inicio: isoAr(ini), fin: null }' },
    { nombre: 'no se dice en qué día cayó', de: "      if (dIni === diaTurno && dFin === diaTurno) return ''", a: "      return ''" },
    // El teclado.
    { nombre: '+ y − no son de a 5', de: 'data-minutos="-5"', a: 'data-minutos="-1"' },
    { nombre: 'una hora inválida no se dice', de: "          else { f.errorBase = 'Esa hora no existe. Escribila con 4 números, por ejemplo 0930.' }", a: '          else { }' },
    { nombre: 'Borrar no borra', de: "      if (t === 'borrar') f.buffer = f.buffer.slice(0, -1)", a: "      if (t === 'borrar') f.buffer = f.buffer" },
    { nombre: 'tocar el número no abre el teclado', de: '      f.teclado = f.teclado === clave ? null : clave', a: '      f.teclado = null' },
    { nombre: 'el teclado no se dibuja', de: "        (f.teclado ? htmlTecladoHora() : '') + '</div>'", a: "        '' + '</div>'" },
    { nombre: '"Todavía no volvió" no saca la vuelta', de: "      const vuelta = f.sigue ? '' : htmlCampoHora('fin', 'Volvió a las', f.fin, f)", a: "      const vuelta = htmlCampoHora('fin', 'Volvió a las', f.fin, f)" },
    { nombre: 'una cerrada ofrece "Todavía no volvió"', de: "      return f.turno.estado === 'abierto'\n", a: '      return true\n' },
    // Lo que falta.
    { nombre: 'editar puede dejar dos abiertas', de: "      if (f.sigue && (f.paradas ?? []).some(p => !p.fin && p.id !== f.paradaId)) {", a: '      if (false) {' },
    { nombre: 'la misma abierta cuenta como otra', de: 'p => !p.fin && p.id !== f.paradaId', a: 'p => !p.fin' },
    { nombre: 'borrar una cerrada sin motivo', de: "        if (f.turno.estado === 'cerrado' && motivo.length < 3)", a: '        if (false)' },
    { nombre: 'el motivo de la parada no se pide', de: "      if (motivo.length < 2) faltan.push('Escribí el motivo de la parada.')\n", a: '' },
    // Los payloads.
    { nombre: 'registrar_parada sin la hora de vuelta', de: "p_turno_id: f.turno.id, p_motivo: motivo, p_inicio: horas.inicio, p_fin: horas.fin }]", a: "p_turno_id: f.turno.id, p_motivo: motivo, p_inicio: horas.inicio, p_fin: null }]" },
    { nombre: 'el motivo va sin recortar', de: "      const motivo = String(f.motivo ?? '').trim()\n      if (f.modo === 'anotar')", a: "      const motivo = String(f.motivo ?? '')\n      if (f.modo === 'anotar')" },
    { nombre: 'editar_parada con el id equivocado', de: "p_parada_id: f.paradaId, p_motivo: motivo, p_inicio: horas.inicio", a: "p_parada_id: f.turno.id, p_motivo: motivo, p_inicio: horas.inicio" },
    { nombre: 'borrar manda el motivo también abierta', de: "p_motivo: f.turno.estado === 'cerrado' ? motivo : null }]", a: 'p_motivo: motivo }]' },
    { nombre: 'borrar una cerrada sin mandar el motivo', de: "p_motivo: f.turno.estado === 'cerrado' ? motivo : null }]", a: 'p_motivo: null }]' },
    { nombre: 'se manda aunque falte algo', de: '      if (faltan.length) return pintarEditorParada()\n', a: '' },
    // El error de la base.
    { nombre: 'el error de la base no se muestra', de: "      const texto = f.errorBase || (f.intentado && faltan.length ? faltan[0] : '')", a: "      const texto = f.intentado && faltan.length ? faltan[0] : ''" },
    { nombre: 'el error de la base se cambia por uno genérico', de: "        f.errorBase = e?.message || 'No se pudo guardar la parada.", a: "        f.errorBase = 'No se pudo guardar la parada." },
    { nombre: 'el botón se deshabilita por lo que falta', de: '      btn.disabled = !!f.enviando\n', a: '      btn.disabled = !!f.enviando || !!faltan.length\n' },
    { nombre: 'guardar no cierra el editor', de: "      const { contexto, turno, modo } = f\n      cerrarEditorParada()", a: '      const { contexto, turno, modo } = f' },
    // Permisos.
    { nombre: 'el historial ofrece corregir sin cargar', de: '      return { editar: configura && carga, borrar: configura }', a: '      return { editar: configura, borrar: configura }' },
    { nombre: 'el historial deja borrar sin configurar', de: '      return { editar: configura && carga, borrar: configura }', a: '      return { editar: configura && carga, borrar: true }' },
    { nombre: 'el historial toca planillas abiertas', de: "      if (!turno || turno.estado !== 'cerrado') return { editar: false, borrar: false }\n", a: '' },
    { nombre: 'el historial abre el editor sin permiso', de: "      if (modo === 'borrar' ? !acc.borrar : !acc.editar) return\n", a: '' },
    { nombre: 'la planilla no ofrece corregir', de: 'htmlParadas(p.paradas, { editar: true, borrar: true })', a: 'htmlParadas(p.paradas)' },
    // El editor.
    { nombre: 'Escape no cierra el editor', de: "      if (ev.key === 'Escape') { ev.preventDefault(); cerrarEditorParada(); return }\n", a: '' },
    { nombre: 'borrar en una abierta pide motivo', de: "      document.getElementById('pr-parada-editor-campo-motivo').hidden = f.modo === 'borrar' && !cerrada", a: "      document.getElementById('pr-parada-editor-campo-motivo').hidden = false" },
    { nombre: 'corregir no trae el motivo', de: "        motivo: modo === 'borrar' ? '' : (parada?.motivo ?? ''),", a: "        motivo: '',"},
    { nombre: '"Paró ahora" también en una pendiente de completar', de: "!!enCurso || p.turno.estado !== 'abierto'\n", a: '!!enCurso\n' },
    { nombre: '"Anotar una parada" nunca aparece', de: "document.getElementById('pr-btn-anotar-parada').hidden = !p", a: "document.getElementById('pr-btn-anotar-parada').hidden = true" },
    { nombre: 'una abierta en una pendiente arranca "todavía no volvió"', de: "sigue: !!parada && !parada.fin && turno?.estado === 'abierto',", a: 'sigue: !!parada && !parada.fin,' },
    { nombre: 'una pendiente no arranca en la hora en que se la forzó', de: "      if (turno?.estado === 'pendiente_completar' && turno.forzado_en) return horaRedondeada(new Date(turno.forzado_en))\n", a: '' },
    { nombre: 'el error del editor no se ve', de: '      errEditor.textContent = texto\n      errEditor.hidden = !texto', a: "      errEditor.textContent = ''\n      errEditor.hidden = true" },
    { nombre: 'el foco va al motivo y abre el teclado del sistema', de: "de texto abre el teclado del sistema y tapa las horas.\n      document.getElementById('pr-parada-editor-titulo').focus()", a: "de texto abre el teclado del sistema y tapa las horas.\n      document.getElementById('pr-parada-editor-motivo').focus()" },
    { nombre: 'el editor no ofrece "Borrar esta parada"', de: "document.getElementById('pr-parada-editor-a-borrar').hidden = !(f.modo === 'editar' && f.puedeBorrar)", a: "document.getElementById('pr-parada-editor-a-borrar').hidden = true" },
    { nombre: 'pasar a borrar arrastra el motivo de la parada', de: "      Object.assign(f, { modo: 'borrar', motivo: '',", a: "      Object.assign(f, { modo: 'borrar'," },
    { nombre: 'la planilla pone dos botones por parada', de: "      if (acciones?.editar) return `<button", a: "      if (false) return `<button" },
    { nombre: 'solo borrar no dibuja el botón', de: "      if (acciones?.borrar) return `<button", a: "      if (false) return `<button" },
    { nombre: '"Paró ahora" deja de usar iniciar_parada', de: "supabase.rpc('iniciar_parada',", a: "supabase.rpc('registrar_parada'," },
  ],
})
