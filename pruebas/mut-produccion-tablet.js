// Mutaciones de test-produccion-tablet.js (la planta en la tablet real,
// parte A, 28/09/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-tablet.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-tablet.js'),
  soloPlanta: ['abrirPlanilla'],
  manuales: [
    // 1. los operarios
    { nombre: 'la planilla no asegura el personal', de: "      await asegurarPersonal()\n      estado.operarios = personasParaPuesto(estado.personal, 'operario').personas", a: "      estado.operarios = personasParaPuesto(estado.personal, 'operario').personas" },
    { nombre: 'Abrir turno no asegura el personal', de: '    async function mostrarAbrir(maquinaId) {\n      await asegurarPersonal()\n', a: '    async function mostrarAbrir(maquinaId) {\n' },
    { nombre: 'entrar al modo no lo pide', de: '      // la planilla y Abrir turno lo esperan por su cuenta.\n      asegurarPersonal()\n', a: '      // la planilla y Abrir turno lo esperan por su cuenta.\n' },
    { nombre: 'asegurar no guarda el personal', de: '          estado.personal = personalSinPruebas(data)\n          estado.personalError = false', a: '          estado.personalError = false' },
    { nombre: 'dos pedidos a la vez leen dos veces', de: '      if (lecturaPersonal) return lecturaPersonal\n', a: '' },
    { nombre: 'con el personal leído lo vuelve a leer', de: "      if (!forzar && Array.isArray(estado.personal) && estado.personal.length) return Promise.resolve(true)\n", a: '' },
    { nombre: 'sin personal dice "No hay operarios"', de: "        if (estado.personalError && !texto) return", a: "        if (false) return" },
    // 2. la máquina cerrada
    { nombre: 'la máquina cerrada sigue elegida', de: '      if (estado.planilla?.turno?.id === turnoId) {\n        estado.planilla = null', a: '      if (false) {\n        estado.planilla = null' },
    { nombre: 'cerrar otra suelta la elegida', de: '      if (estado.planilla?.turno?.id === turnoId) {\n        estado.planilla = null', a: '      if (estado.planilla) {\n        estado.planilla = null' },
    // Planta v2: el título va en la cabecera y las secciones en la barra.
    { nombre: 'la cabecera no dice la máquina', de: "const ctxPlanilla = p?.turno ? `Lote ${p.turno.lote} · ${p.maquinaNombre ?? 'Máquina'}` : ''", a: "const ctxPlanilla = p?.turno ? `Lote ${p.turno.lote}` : ''" },
    { nombre: 'el cierre no tiene título propio', de: "case 'pr-cierre': return { ctx: ctxPlanilla, titulo: pendiente ? 'Completar la planilla' : 'Cerrar planilla' }", a: "case 'pr-cierre': return { ctx: ctxPlanilla, titulo: 'Planilla' }" },
    // (El ancla es el paréntesis: la misma línea también apaga "Abrir turno"
    // con todas las máquinas abiertas, y eso lo prueba test-produccion-abrir.)
    { nombre: 'sin máquina las secciones siguen prendidas', de: '        const off = (sec.deMaquina && !hay) ||', a: '        const off = (false) ||' },
    { nombre: 'con máquina las secciones se apagan', de: '        const off = (sec.deMaquina && !hay) ||', a: '        const off = (sec.deMaquina) ||' },
    { nombre: 'el nombre de la máquina no se lee', de: "        maquinaNombre = maq?.nombre ?? null\n", a: '' },
    { nombre: 'sin nombre en la base no usa el del tablero', de: '{ const l = await leerPlanilla(turnoId); estado.planilla = { ...l, maquinaNombre: l.maquinaNombre ?? nombre } }', a: "{ const l = await leerPlanilla(turnoId); estado.planilla = { ...l, maquinaNombre: l.maquinaNombre ?? 'Máquina' } }" },
    // 3. tiempo real
    { nombre: 'turnos sin filtro de fábrica', de: "const f = [{ tabla: 'turnos_produccion', filtro: `unidad_negocio_id=eq.${unidadId}` }]", a: "const f = [{ tabla: 'turnos_produccion', filtro: undefined }]" },
    { nombre: 'masas sin filtro de turnos', de: "f.push({ tabla, filtro: `turno_id=in.(${lista.join(',')})` })", a: 'f.push({ tabla, filtro: undefined })' },
    { nombre: 'falta una tabla', de: "const TABLAS_VIVAS = ['masas', 'produccion_items', 'paradas_produccion', 'turno_operarios']", a: "const TABLAS_VIVAS = ['masas', 'produccion_items', 'paradas_produccion']" },
    { nombre: 'un turno de otra fábrica se cuela', de: "if (tabla === 'turnos_produccion') return fila.unidad_negocio_id != null && String(fila.unidad_negocio_id) === String(unidadId)", a: "if (tabla === 'turnos_produccion') return true" },
    { nombre: 'una masa de otra fábrica se cuela', de: '      return fila.turno_id != null && ids.has(String(fila.turno_id))', a: '      return fila.turno_id != null' },
    { nombre: 'una tabla desconocida se acepta', de: '      if (!TABLAS_VIVAS.includes(tabla)) return false\n', a: '' },
    { nombre: 'el aviso no filtra', de: "      if (!cambioEsDeMiFabrica(tabla, fila, estado.turnosVivos ?? new Set(), estado.unidadId)) return false\n", a: '' },
    { nombre: 'la planilla no se redibuja', de: "        else if (estado.vista === 'pr-planilla') await recargarPlanilla()\n        else if (estado.vista === 'pr-sala') await mostrarSala()\n        else if (estado.vista === 'pr-receta') await cargarMasasReceta()\n        else if (estado.vista === 'pr-hist-maq'", a: "        else if (estado.vista === 'pr-sala') await mostrarSala()\n        else if (estado.vista === 'pr-receta') await cargarMasasReceta()\n        else if (estado.vista === 'pr-hist-maq'" },
    { nombre: 'un cierre de otra tablet no suelta la máquina', de: '        await maquinaCerrada(fila.id)\n        if (mirandola) {', a: '        if (mirandola) {' },
    { nombre: 'un cierre de otra tablet no avisa', de: "          mostrarError('Esta planilla se cerró desde otra tablet.')\n", a: '' },
    { nombre: 'con los mismos turnos rearma el canal', de: '      if (canalVivo && clave === claveCanalVivo) return\n', a: '' },
    { nombre: 'el canal viejo no se quita', de: "      if (canalVivo) { try { supabase.removeChannel(canalVivo) } catch { /* nada */ } canalVivo = null }", a: '      canalVivo = null' },
    { nombre: 'el canal caído no se anota', de: "          registrarError({ evento: 'planta', mensaje: 'Tiempo real: ' + status })\n", a: '' },
    { nombre: 'al reanudar no se rearma el canal', de: "      claveCanalVivo = ''\n      conectarTiempoReal()\n    }\n\n    // ═══", a: '    }\n\n    // ═══' },
    { nombre: 'init no conecta el tiempo real', de: '      registrarPantalla()\n      conectarTiempoReal()\n    }\n\n    init()', a: '      registrarPantalla()\n    }\n\n    init()' },
    // 4. pantalla
    { nombre: 'la pantalla se registra siempre', de: "      if (leerSesion('produccion.pantalla') === '1') return false\n", a: '' },
    { nombre: 'la pantalla sin evento', de: "registrarError({ evento: 'pantalla', mensaje: t.mensaje, detalle: t.detalle })", a: "registrarError({ evento: 'error', mensaje: t.mensaje, detalle: t.detalle })" },
    { nombre: 'la pantalla sin DPR', de: "· DPR ${Math.round(dpr * 100) / 100} · ${orientacion}`, detalle", a: "· ${orientacion}`, detalle" },
    { nombre: 'la pantalla no dice si está instalada', de: 'dpr, orientacion, instalada })', a: 'dpr, orientacion })' },
    { nombre: 'init no registra la pantalla', de: '      iniciarReloj()\n      registrarPantalla()\n', a: '      iniciarReloj()\n' },
  ],
})
