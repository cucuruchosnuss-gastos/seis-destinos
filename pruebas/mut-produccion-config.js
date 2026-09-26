// Mutaciones de test-produccion-config.js (B6 de Producción + el rediseño
// parte 5: la configuración en la compu). Ver mutar.js.
//
//   node pruebas/mut-produccion-config.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-config.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion-gestion.html'),
  escape: 'esc',
  funciones: ['pintarSelectorUnidad', 'htmlConfigMaquinas', 'htmlConfigRecetas', 'htmlConfigIngredientes', 'htmlPresentacionConfig',
    'htmlConfigProductos', 'htmlPendienteMarca', 'htmlConfigMarcas', 'htmlFilaPersonal', 'htmlPanelPin', 'htmlPanelTemporal',
    'htmlTemporales', 'htmlConfigPersonal', 'htmlTiraPin', 'htmlErrorPegado'],
  equivalentes: [
    { expr: 'esc(fechaCorta(r.created_at))', motivo: 'una fecha dd/mm/aaaa formateada por Intl, o vacía' },
    { expr: 'esc(fechaCorta(t.hasta))', motivo: 'una fecha dd/mm/aaaa formateada por Intl, o vacía' },
    { expr: 'esc(horaArgentina(t.hasta))', motivo: 'una hora HH:MM formateada por Intl, o vacía' },
    { expr: 'esc(pend.length)', motivo: 'un número: la cantidad de pendientes' },
    { expr: 'esc(marcasDelCatalogo(d).length)', motivo: 'un número: la cantidad de conos del catálogo' },
    { expr: 'esc(version)', motivo: 'un número: la versión que va a crear guardar_receta_original' },
    { expr: 'esc(textoBotonPersonal(n))', motivo: 'texto constante del código con un número adentro' },
    { expr: 'esc(pin.texto)', motivo: 'texto constante del código: el que devuelve estadoDelPin() ("Sin PIN", "PIN propio", "PIN pendiente de cambiar")' },
  ],
  manuales: [
    // ── Acceso ─────────────────────────────────────────────────────────
    { nombre: 'Configuración visible sin la tarea', de: "      document.getElementById('pr-btn-ir-config').hidden = !tieneTarea('configurar')", a: "      document.getElementById('pr-btn-ir-config').hidden = false" },
    { nombre: 'mostrarConfig sin unidades igual abre', de: '      const unidades = unidadesDeConfig()\n      if (!unidades.length) return\n      const actual', a: '      const unidades = unidadesDeConfig()\n      const actual' },
    { nombre: 'las unidades de config salen de cargar', de: "      return unidadesCon('configurar')", a: "      return unidadesCon('cargar')" },

    // ── Pestañas y el contador de conos por revisar ────────────────────
    { nombre: 'el contador cuenta TODAS las marcas, no las pendientes', de: "      const { data, error } = await supabase.from('marcas_personalizadas').select('id').eq('estado_alta', 'pendiente_revision')", a: "      const { data, error } = await supabase.from('marcas_personalizadas').select('id')" },
    { nombre: 'un contador inventado cuando no se pudo contar', de: "        const chapa = claveTab === 'marcas' && pendientes > 0 ?", a: "        const chapa = claveTab === 'marcas' && pendientes >= 0 ?" },
    { nombre: 'la pestaña abierta no se marca', de: `class="pr-cfg-tab\${claveTab === tab ? ' pr-cfg-tab--activa' : ''}"`, a: 'class="pr-cfg-tab"' },

    // ── El error PEGADO al botón ───────────────────────────────────────
    { nombre: 'el error no se dibuja pegado a ningún botón', de: "      return c?.error && c.error.donde === donde ? `<div class=\"pr-cfg-error\" role=\"alert\">${esc(c.error.texto)}</div>` : ''", a: "      return ''" },
    { nombre: 'el error se dibuja pegado a TODOS los botones', de: '      return c?.error && c.error.donde === donde ?', a: '      return c?.error ?' },
    { nombre: 'el error se guarda pero no se repinta', de: '      if (c?.datos && (texto || habia)) pintarPestanaConfig()', a: '' },
    { nombre: 'el error va arriba de todo aunque haya dónde pegarlo', de: '      const suelto = !!texto && !c?.datos', a: '      const suelto = !!texto' },

    // ── Máquinas ───────────────────────────────────────────────────────
    { nombre: 'lee solo las máquinas activas', de: "      const { data, error } = await supabase.from('maquinas').select('id, nombre, activa, orden')\n        .eq('unidad_negocio_id', c.unidadId).order('orden')", a: "      const { data, error } = await supabase.from('maquinas').select('id, nombre, activa, orden')\n        .eq('unidad_negocio_id', c.unidadId).eq('activa', true).order('orden')" },
    { nombre: 'reordenar manda todas', de: '.filter((m, k) => lista.find(x => x.id === m.id).orden !== k + 1)', a: '' },
    { nombre: 'desactivar pierde el nombre', de: "        p_nombre: (cambios.nombre ?? m?.nombre ?? '').trim(),", a: "        p_nombre: (cambios.nombre ?? '').trim()," },
    { nombre: 'desactivar no invierte', de: 'parametrosGuardarMaquina(m, c.unidadId, { activa: !m.activa })', a: 'parametrosGuardarMaquina(m, c.unidadId, { activa: m.activa })' },
    { nombre: 'agregar sin orden al final', de: '        const orden = lista.reduce((mx, m) => Math.max(mx, m.orden ?? 0), 0) + 1', a: '        const orden = 0' },
    { nombre: 'agregar sin nombre se manda', de: "        if (!nombre) { errorConfig('Escribí el nombre de la máquina.', DONDE); return }", a: '' },
    { nombre: 'el error de la base se tapa', de: "        errorConfig(error.message || 'No se pudo guardar.', donde)", a: "        errorConfig('No se pudo guardar.', donde)" },

    // ── Recetas ────────────────────────────────────────────────────────
    { nombre: 'la vigente es la de versión más baja', de: '      return recetas.filter(r => r.tipo_masa === tipo).sort((a, b) => b.version - a.version)[0] ?? null', a: '      return recetas.filter(r => r.tipo_masa === tipo).sort((a, b) => a.version - b.version)[0] ?? null' },
    { nombre: 'sin aviso de prototipo', de: "      return !!receta && /prototipo|revisar/i.test(receta.nota ?? '')", a: '      return false' },
    { nombre: 'el editor incluye inactivos', de: '      return ingredientes.filter(g => g.activo).map(g => {', a: '      return ingredientes.map(g => {' },
    { nombre: 'el payload manda los vacíos', de: '        p_items: filas.filter(f => f.kg != null).map(f =>', a: '        p_items: filas.map(f =>' },
    { nombre: 'el payload saca los ceros', de: '        p_items: filas.filter(f => f.kg != null).map(f =>', a: '        p_items: filas.filter(f => f.kg).map(f =>' },
    { nombre: 'preferido vacío viaja como texto', de: 'insumo_preferido_id: f.preferido || null })),', a: 'insumo_preferido_id: f.preferido })),' },
    { nombre: 'la nota no es obligatoria', de: "      if (!p.p_nota) faltan.push('una nota que diga qué cambió')\n", a: '' },
    { nombre: 'tipo sin tope de 40', de: "      else if (p.p_tipo_masa.length > 40) faltan.push('un tipo de masa de hasta 40 letras')\n", a: '' },
    { nombre: 'guarda aunque falte algo', de: "      if (faltan.length) { errorConfig(`Falta ${faltan.join(', ')}.`, DONDE); return }", a: '' },
    { nombre: 'el tipo nuevo no toma el nombre escrito', de: "      const tipo = c.recetaTipo === NUEVO_TIPO ? document.getElementById('pr-config-tipo-nuevo')?.value : c.recetaTipo", a: '      const tipo = c.recetaTipo' },
    { nombre: 'el tipo nuevo no parte de otro', de: '      const partida = nuevo ? recetaVigente(d.recetas, c.recetaPartida ?? d.tipos[0]) : vigente', a: '      const partida = nuevo ? null : vigente' },
    { nombre: 'la cantidad se pone con value=', de: 'data-numero="${f.kg == null ? \'\' : esc(f.kg)}" data-decimales="3"', a: 'value="${f.kg == null ? \'\' : esc(f.kg)}" data-numero="" data-decimales="3"' },
    { nombre: 'el botón no dice qué versión crea', de: '      return (recetaVigente(recetas, tipo)?.version ?? 0) + 1', a: '      return 1' },
    { nombre: 'la vigente no se marca en el historial', de: "`<div class=\"pr-cfg-version${i === 0 ? ' pr-cfg-version--vigente' : ''}\">", a: '`<div class="pr-cfg-version">' },
    { nombre: 'textoAntes marca aunque no haya cambiado', de: '      if (Math.abs(Number(original) - Number(actual)) < 1e-9) return null\n', a: '' },
    { nombre: 'textoAntes inventa un "antes" que no existe', de: '      if (original == null || actual == null) return null\n', a: '' },
    { nombre: 'la marca de "antes" no se esconde al volver al valor original', de: '      antes.hidden = !texto', a: '      antes.hidden = false' },
    { nombre: 'la marca de "antes" no dice el valor viejo', de: '      antes.textContent = texto ?? \'\'', a: "      antes.textContent = ''" },

    // ── Ingredientes ───────────────────────────────────────────────────
    { nombre: 'sin aviso de los que no tienen insumo', de: '      return d.ingredientes.filter(g => g.activo && g.descuenta_stock && !d.relaciones.some(r => r.ingrediente_id === g.id))', a: '      return []' },
    { nombre: 'el aviso incluye los que no descuentan', de: '      return d.ingredientes.filter(g => g.activo && g.descuenta_stock && !d.relaciones.some(r => r.ingrediente_id === g.id))', a: '      return d.ingredientes.filter(g => g.activo && !d.relaciones.some(r => r.ingrediente_id === g.id))' },
    { nombre: 'guardar insumos pierde los elegidos', de: '{ p_ingrediente_id: ds.ingGuardarInsumos, p_insumo_ids: [...(c.insumosElegidos ?? [])] }', a: '{ p_ingrediente_id: ds.ingGuardarInsumos, p_insumo_ids: [] }' },
    { nombre: 'guardar ingrediente ignora "descuenta"', de: "          nombre, descuenta_stock: valorDe('data-ing-descuenta', g.id, 'checked') ?? g.descuenta_stock,", a: '          nombre, descuenta_stock: g.descuenta_stock,' },
    { nombre: 'el error de ingredientes no se pega a su botón', de: "        if (!nombre) { errorConfig('Escribí el nombre del ingrediente.', DONDE); return }", a: "        if (!nombre) { errorConfig('Escribí el nombre del ingrediente.'); return }" },

    // ── Productos ──────────────────────────────────────────────────────
    { nombre: 'el aviso del prototipo no se va', de: "      return leerPreferencia(CLAVE_AVISO_PRODUCTOS) === '1'", a: '      return false' },
    { nombre: 'unidades por caja en 0 se guarda', de: '        if (upc !== undefined && (!Number.isInteger(upc) || upc <= 0)) { errorConfig(', a: '        if (false) { errorConfig(' },
    { nombre: 'empaque vacío viaja como texto', de: "        p_empaque: empaque === '' ? null : empaque,", a: '        p_empaque: empaque,' },
    { nombre: 'tipo de masa vacío viaja como texto', de: "        p_tipo_masa: tipo === '' ? null : tipo,", a: '        p_tipo_masa: tipo,' },
    { nombre: 'la presentación ignora la media caja', de: "          media_caja: valorDe('data-pres-media', pr.id, 'checked') ?? pr.media_caja,", a: '          media_caja: pr.media_caja,' },
    { nombre: 'sin la nota de lo ya producido', de: '      const nota = \'<p class="pr-texto-suave">Cambiar las unidades por caja no toca lo ya producido: cada sublote guardó las suyas.</p>\'', a: "      const nota = ''" },
    { nombre: 'los de chocolate no van separados', de: '      const bloques = comunes.map(bloque).join(\'\') +\n        (chocolate.length ? corte + chocolate.map(bloque).join(\'\') : \'\')', a: '      const bloques = d.productos.map(bloque).join(\'\')' },
    { nombre: 'la línea de chocolate se dibuja siempre', de: "        (chocolate.length ? corte + chocolate.map(bloque).join('') : '')", a: "        corte + chocolate.map(bloque).join('')" },

    // ── Marcas / Conos ─────────────────────────────────────────────────
    { nombre: 'dar de baja no invierte', de: '{ p_id: m.id, p_nombre: m.nombre, p_activa: !m.activa }', a: '{ p_id: m.id, p_nombre: m.nombre, p_activa: m.activa }' },
    { nombre: 'el buscador de marcas no filtra', de: '      const lista = marcasFiltradas(marcasDelCatalogo(d), c.busqueda)', a: '      const lista = marcasDelCatalogo(d)' },
    { nombre: 'no se separan los pendientes de revisar', de: "      return (d?.marcas ?? []).filter(m => m.estado_alta === 'pendiente_revision')", a: '      return []' },
    { nombre: 'el catálogo lista también los pendientes y los rechazados', de: "      return (d?.marcas ?? []).filter(m => m.estado_alta !== 'pendiente_revision' && m.estado_alta !== 'rechazada')", a: '      return (d?.marcas ?? [])' },
    { nombre: 'aceptar no manda el nombre corregido', de: "        const nombre = aprobar ? valorDe('data-pend-nombre', id) : null", a: '        const nombre = null' },
    { nombre: 'rechazar aprueba igual', de: '        const aprobar = ds.pendSi !== undefined', a: '        const aprobar = true' },
    { nombre: 'un nombre vacío pisa el que tenía', de: "      return { p_marca_id: id, p_aprobar: aprobar, p_nombre: n === '' ? null : n }", a: '      return { p_marca_id: id, p_aprobar: aprobar, p_nombre: n }' },
    { nombre: 'el error de revisar un cono no se pega a los pendientes', de: "          aprobar ? 'Cono aceptado.' : 'Cono rechazado.', 'pr-cfg-pendientes')", a: "          aprobar ? 'Cono aceptado.' : 'Cono rechazado.', DONDE)" },
    { nombre: 'no se dice quién cargó el cono', de: '      const pie = [quien ? `Lo cargó ${quien}` : null, cuando || null].filter(Boolean).join(\' · \')', a: "      const pie = ''" },

    // ── Personal: el guardado de a muchos ──────────────────────────────
    { nombre: 'se mandan TODAS las filas, no solo las tocadas', de: '        for (const id of ids) {', a: '        for (const id of c.datos.personal.map(x => x.id)) {' },
    { nombre: 'el botón no dice cuántas filas se tocaron', de: "      return n ? `Guardar los cambios · ${n} ${n === 1 ? 'fila' : 'filas'}` : 'Guardar los cambios'", a: "      return 'Guardar los cambios'" },
    { nombre: 'la fila tocada no se marca', de: '      const tocada = c.cambios.has(p.id)', a: '      const tocada = false' },
    { nombre: 'destildar y volver atrás igual cuenta como cambio', de: "      if (nuevos.slice().sort().join(',') === antes) c.cambios.delete(persona.id)\n      else c.cambios.set(persona.id, nuevos)", a: '      c.cambios.set(persona.id, nuevos)' },
    { nombre: 'la casilla muestra siempre lo de la base', de: '      return c.cambios.get(p.id) ?? (p.puestos ?? [])', a: '      return p.puestos ?? []' },
    { nombre: 'tocar una casilla guarda de una', de: '      alternarPuesto(c, p, puesto, marcado)\n      pintarPestanaConfig()', a: '      alternarPuesto(c, p, puesto, marcado)\n      guardarCambiosPersonal()' },
    { nombre: 'el botón se deshabilita por lo que falta', de: `<button type="button" class="pr-btn" id="pr-cfg-personal-guardar"\${c.guardando ? ' disabled' : ''}>`, a: `<button type="button" class="pr-btn" id="pr-cfg-personal-guardar"\${c.guardando || !n ? ' disabled' : ''}>` },
    { nombre: 'guardar sin cambios no dice nada', de: "      if (!ids.length) { errorConfig('No cambiaste nada todavía.', DONDE); return }", a: '      if (!ids.length) return' },
    { nombre: 'un rechazo de la base no frena las demás filas', de: 'p_puestos: c.cambios.get(id) }, null, DONDE)\n          if (!r.ok) break', a: 'p_puestos: c.cambios.get(id) }, null, DONDE)\n          if (!r.ok) continue' },
    { nombre: 'el botón queda trabado después de guardar', de: '      } finally {\n        c.guardando = false\n      }', a: '      } finally {\n      }' },
    { nombre: 'guardar_puestos en la unidad de la tablet', de: "          const r = await guardarEnConfig('guardar_puestos', { p_empleado_id: id, p_unidad_negocio_id: c.unidadId, p_puestos: c.cambios.get(id) }, null, DONDE)", a: "          const r = await guardarEnConfig('guardar_puestos', { p_empleado_id: id, p_unidad_negocio_id: estado.unidadId, p_puestos: c.cambios.get(id) }, null, DONDE)" },
    { nombre: 'la fila guardada sigue contando como pendiente', de: '          c.cambios.delete(id)\n          hechas++', a: '          hechas++' },
    { nombre: 'el personal muestra todas las unidades siempre', de: '      const base = todos ? personal : personal.filter(p => p.misma_unidad || (p.puestos ?? []).length)', a: '      const base = personal' },
    { nombre: 'el personal oculta a los prestados con puesto', de: '      const base = todos ? personal : personal.filter(p => p.misma_unidad || (p.puestos ?? []).length)', a: '      const base = todos ? personal : personal.filter(p => p.misma_unidad)' },

    // ── Salir sin guardar ──────────────────────────────────────────────
    { nombre: 'nunca se pregunta antes de salir', de: '      if (!cambiosSinGuardar(c) || !c.datos) return true', a: '      return true' },
    { nombre: 'se pregunta aunque no haya nada cambiado', de: '      if (!cambiosSinGuardar(c) || !c.datos) return true', a: '      if (!c.datos) return true' },
    { nombre: 'preguntar no frena la salida', de: '      c.salida = accion\n      pintarPestanaConfig()\n      return false', a: '      c.salida = accion\n      pintarPestanaConfig()\n      return true' },
    { nombre: 'salir sin guardar no tira los cambios', de: '      c.salida = null\n      c.cambios = new Map()', a: '      c.salida = null' },
    { nombre: 'el aviso de salida no se dibuja', de: '      cuerpo.innerHTML = c.salida ? htmlSalirSinGuardar(c) : RENDERS_CONFIG[c.tab](c)', a: '      cuerpo.innerHTML = RENDERS_CONFIG[c.tab](c)' },

    // ── El estado del PIN ──────────────────────────────────────────────
    { nombre: 'sin PIN igual dice que tiene uno propio', de: "      if (!p?.tiene_pin) return { texto: 'Sin PIN', clase: 'pr-cfg-chip--gris' }\n", a: '' },
    { nombre: 'no se distingue el PIN que hay que cambiar', de: "      if (p.debe_cambiar_pin) return { texto: 'PIN pendiente de cambiar', clase: 'pr-cfg-chip--alerta' }\n", a: '' },
    { nombre: 'no se dice cuál es un PIN temporal', de: "      const temp = p.pin_temporal ? ` <span class=\"pr-cfg-chip pr-cfg-chip--gris\">temporal</span>` : ''", a: "      const temp = ''" },
    { nombre: 'el botón dice siempre lo mismo tenga o no PIN', de: `>\${p.tiene_pin ? 'Resetear PIN' : 'Asignar PIN'}</button>`, a: '>Resetear PIN</button>' },

    // ── La hoja de PINes ───────────────────────────────────────────────
    { nombre: 'se abre una hoja vacía cuando no había nadie sin PIN', de: "      if (!lista.length) { errorConfig('Ya todos tienen PIN: no hizo falta generar ninguno.', DONDE); return }", a: '' },
    { nombre: 'los PINes quedan en el DOM al cerrar la hoja', de: "      document.getElementById('pr-cfg-hoja-tiras').innerHTML = ''", a: '' },
    { nombre: 'los PINes quedan en la memoria al cerrar la hoja', de: '      if (estado.config) estado.config.hoja = null', a: '' },
    { nombre: 'la hoja no se cierra', de: "      document.getElementById('pr-cfg-hoja').hidden = true\n    }\n\n    async function generarPines()", a: "      document.getElementById('pr-cfg-hoja').hidden = false\n    }\n\n    async function generarPines()" },
    { nombre: 'los PINes se guardan en la tablet', de: '      estado.config.hoja = lista\n', a: "      estado.config.hoja = lista\n      guardarPreferencia('produccion.pines', JSON.stringify(lista))\n" },
    { nombre: 'la tira no dice que el PIN es de un solo uso', de: '`<div class="pr-tira__nota">PIN de un solo uso: la primera vez vas a elegir uno tuyo.</div>', a: '`<div class="pr-tira__nota"></div>' },
    { nombre: 'generar PINes en otra unidad', de: "      const r = await guardarEnConfig('generar_pines_iniciales', { p_unidad_negocio_id: c.unidadId }, null, DONDE)", a: "      const r = await guardarEnConfig('generar_pines_iniciales', { p_unidad_negocio_id: estado.unidadId }, null, DONDE)" },

    // ── Asignar el PIN ─────────────────────────────────────────────────
    { nombre: 'un PIN corto se manda igual', de: '      if (!pinValido(pin, largo)) { errorConfig(`El PIN tiene que ser de ${largo} números.`, DONDE); return }', a: '' },
    { nombre: 'el PIN maestro también sería de 4 números', de: '      const largo = maestro ? LARGO_PIN_MAESTRO : LARGO_PIN\n      const pin =', a: '      const largo = LARGO_PIN\n      const pin =' },
    { nombre: 'asignar el PIN sin decir de quién', de: "        : await guardarEnConfig('asignar_pin_produccion', { p_empleado_id: c.pinPara.id, p_pin: pin }, 'PIN asignado.', DONDE)", a: "        : await guardarEnConfig('asignar_pin_produccion', { p_empleado_id: null, p_pin: pin }, 'PIN asignado.', DONDE)" },
    { nombre: 'el panel del PIN no se cierra al guardarlo', de: '      olvidarCampoPin()\n      c.pinPara = null\n      await cargarPestanaConfig()', a: '      await cargarPestanaConfig()' },
    { nombre: 'el PIN tipeado queda en el campo', de: "      const el = document.getElementById('pr-cfg-pin-valor')\n      if (el) el.value = ''", a: "      const el = document.getElementById('pr-cfg-pin-valor')" },
    { nombre: 'el campo del PIN se enlaza como número', de: `id="pr-cfg-pin-valor" inputmode="numeric" autocomplete="off" maxlength="\${largo}"`, a: `id="pr-cfg-pin-valor" inputmode="numeric" autocomplete="off" data-numero="" maxlength="\${largo}"` },

    // ── Accesos temporales ─────────────────────────────────────────────
    { nombre: 'se listan también los temporales vencidos', de: '      const hasta = new Date(t?.hasta ?? \'\').getTime()\n      return Number.isFinite(hasta) && hasta > ahora', a: '      return true' },
    { nombre: 'un temporal sin fecha se da por vigente', de: "      return Number.isFinite(hasta) && hasta > ahora", a: '      return hasta > ahora || !Number.isFinite(hasta)' },
    { nombre: 'los vencidos llegan igual al render', de: 'sinPersonasDePrueba((t.data ?? []).filter(x => temporalVigente(x)), estado.fabrica', a: 'sinPersonasDePrueba((t.data ?? []), estado.fabrica' },
    { nombre: 'no se dice quién dio el acceso', de: '`<div class="pr-texto-suave">Lo dio ${esc(c.datos.nombres.get(t.otorgado_por) ?? \'—\')} · hasta ${esc(fechaCorta(t.hasta))} ${esc(horaArgentina(t.hasta))}</div></span>`', a: '`</span>`' },
    { nombre: 'el acceso temporal va a la unidad de la tablet', de: '        p_unidad_negocio_id: c.unidadId,\n        p_puesto: c.temporal?.puesto ?? null,', a: '        p_unidad_negocio_id: estado.unidadId,\n        p_puesto: c.temporal?.puesto ?? null,' },
    { nombre: 'se da el acceso sin elegir nada', de: "      if (faltan.length) { errorConfig(`Falta: ${faltan.join(' · ')}.`, DONDE); return }", a: '' },
    { nombre: 'un pin_temporal null igual abre la hoja', de: '      if (r.data?.pin_temporal) {', a: '      if (r.data) {' },
    { nombre: 'el PIN temporal no se muestra', de: '      if (r.data?.pin_temporal) {', a: '      if (false) {' },
    { nombre: 'revocar sin decir cuál', de: "      const r = await guardarEnConfig('revocar_puesto_temporal', { p_id: id }, 'Acceso revocado.', 'pr-cfg-abrir-temporal')", a: "      const r = await guardarEnConfig('revocar_puesto_temporal', { p_id: null }, 'Acceso revocado.', 'pr-cfg-abrir-temporal')" },
  ],
})
