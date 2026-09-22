// Mutaciones de test-produccion-config.js (B6 de Producción). Ver mutar.js.
//
//   node pruebas/mut-produccion-config.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-config.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['pintarSelectorUnidad', 'htmlConfigMaquinas', 'htmlConfigRecetas', 'htmlConfigIngredientes', 'htmlPresentacionConfig',
    'htmlConfigProductos', 'htmlConfigMarcas', 'htmlConfigPersonal'],
  equivalentes: [
    { expr: 'esc(fechaCorta(r.created_at))', motivo: 'una fecha dd/mm/aaaa formateada por Intl, o vacía' },
  ],
  manuales: [
    // Acceso
    { nombre: 'Configuración visible sin la tarea', de: "      document.getElementById('pr-btn-ir-config').hidden = !tieneTarea('configurar')", a: "      document.getElementById('pr-btn-ir-config').hidden = false" },
    { nombre: 'mostrarConfig sin unidades igual abre', de: '      const unidades = unidadesDeConfig()\n      if (!unidades.length) return\n      const actual', a: '      const unidades = unidadesDeConfig()\n      const actual' },
    { nombre: 'las unidades de config salen de cargar', de: "      return unidadesCon('configurar')", a: "      return unidadesCon('cargar')" },
    // Máquinas
    { nombre: 'lee solo las máquinas activas', de: "      const { data, error } = await supabase.from('maquinas').select('id, nombre, activa, orden')\n        .eq('unidad_negocio_id', c.unidadId).order('orden')", a: "      const { data, error } = await supabase.from('maquinas').select('id, nombre, activa, orden')\n        .eq('unidad_negocio_id', c.unidadId).eq('activa', true).order('orden')" },
    { nombre: 'reordenar manda todas', de: '.filter((m, k) => lista.find(x => x.id === m.id).orden !== k + 1)', a: '' },
    { nombre: 'desactivar pierde el nombre', de: "        p_nombre: (cambios.nombre ?? m?.nombre ?? '').trim(),", a: "        p_nombre: (cambios.nombre ?? '').trim()," },
    { nombre: 'desactivar no invierte', de: "parametrosGuardarMaquina(m, c.unidadId, { activa: !m.activa })", a: "parametrosGuardarMaquina(m, c.unidadId, { activa: m.activa })" },
    { nombre: 'agregar sin orden al final', de: '        const orden = lista.reduce((mx, m) => Math.max(mx, m.orden ?? 0), 0) + 1', a: '        const orden = 0' },
    { nombre: 'agregar sin nombre se manda', de: "        if (!nombre) { errorConfig('Escribí el nombre de la máquina.'); return }", a: '' },
    { nombre: 'el error de la base se tapa', de: "        errorConfig(error.message || 'No se pudo guardar.')", a: "        errorConfig('No se pudo guardar.')" },
    // Recetas
    { nombre: 'la vigente es la de versión más baja', de: '      return recetas.filter(r => r.tipo_masa === tipo).sort((a, b) => b.version - a.version)[0] ?? null', a: '      return recetas.filter(r => r.tipo_masa === tipo).sort((a, b) => a.version - b.version)[0] ?? null' },
    { nombre: 'sin aviso de prototipo', de: "      return !!receta && /prototipo|revisar/i.test(receta.nota ?? '')", a: '      return false' },
    { nombre: 'el editor incluye inactivos', de: '      return ingredientes.filter(g => g.activo).map(g => {', a: '      return ingredientes.map(g => {' },
    { nombre: 'el payload manda los vacíos', de: '        p_items: filas.filter(f => f.kg != null).map(f =>', a: '        p_items: filas.map(f =>' },
    { nombre: 'el payload saca los ceros', de: '        p_items: filas.filter(f => f.kg != null).map(f =>', a: '        p_items: filas.filter(f => f.kg).map(f =>' },
    { nombre: 'preferido vacío viaja como texto', de: 'insumo_preferido_id: f.preferido || null })),', a: 'insumo_preferido_id: f.preferido })),' },
    { nombre: 'la nota no es obligatoria', de: "      if (!p.p_nota) faltan.push('una nota que diga qué cambió')\n", a: '' },
    { nombre: 'tipo sin tope de 40', de: "      else if (p.p_tipo_masa.length > 40) faltan.push('un tipo de masa de hasta 40 letras')\n", a: '' },
    { nombre: 'guarda aunque falte algo', de: "      if (faltan.length) { errorConfig(`Falta ${faltan.join(', ')}.`); return }\n      const r = await guardarEnConfig('guardar_receta_original', p, null)", a: "      const r = await guardarEnConfig('guardar_receta_original', p, null)" },
    { nombre: 'el tipo nuevo no toma el nombre escrito', de: "      const tipo = c.recetaTipo === NUEVO_TIPO ? document.getElementById('pr-config-tipo-nuevo')?.value : c.recetaTipo", a: '      const tipo = c.recetaTipo' },
    { nombre: 'el tipo nuevo no parte de otro', de: '      const partida = nuevo ? recetaVigente(d.recetas, c.recetaPartida ?? d.tipos[0]) : vigente', a: '      const partida = nuevo ? null : vigente' },
    { nombre: 'la cantidad se pone con value=', de: 'data-numero="${f.kg == null ? \'\' : esc(f.kg)}" data-decimales="3"', a: 'value="${f.kg == null ? \'\' : esc(f.kg)}" data-numero="" data-decimales="3"' },
    // Ingredientes
    { nombre: 'sin aviso de los que no tienen insumo', de: '      return d.ingredientes.filter(g => g.activo && g.descuenta_stock && !d.relaciones.some(r => r.ingrediente_id === g.id))', a: '      return []' },
    { nombre: 'el aviso incluye los que no descuentan', de: '      return d.ingredientes.filter(g => g.activo && g.descuenta_stock && !d.relaciones.some(r => r.ingrediente_id === g.id))', a: '      return d.ingredientes.filter(g => g.activo && !d.relaciones.some(r => r.ingrediente_id === g.id))' },
    { nombre: 'guardar insumos pierde los elegidos', de: "{ p_ingrediente_id: ds.ingGuardarInsumos, p_insumo_ids: [...(c.insumosElegidos ?? [])] }", a: "{ p_ingrediente_id: ds.ingGuardarInsumos, p_insumo_ids: [] }" },
    { nombre: 'guardar ingrediente ignora "descuenta"', de: "          nombre, descuenta_stock: valorDe('data-ing-descuenta', g.id, 'checked') ?? g.descuenta_stock,", a: '          nombre, descuenta_stock: g.descuenta_stock,' },
    // Productos
    { nombre: 'el aviso del prototipo no se va', de: '      return leerPreferencia(CLAVE_AVISO_PRODUCTOS) === \'1\'', a: '      return false' },
    { nombre: 'unidades por caja en 0 se guarda', de: "        if (upc !== undefined && (!Number.isInteger(upc) || upc <= 0)) { errorConfig(", a: "        if (false) { errorConfig(" },
    { nombre: 'empaque vacío viaja como texto', de: '        p_empaque: empaque === \'\' ? null : empaque,', a: '        p_empaque: empaque,' },
    { nombre: 'tipo de masa vacío viaja como texto', de: '        p_tipo_masa: tipo === \'\' ? null : tipo,', a: '        p_tipo_masa: tipo,' },
    { nombre: 'la presentación ignora la media caja', de: "          media_caja: valorDe('data-pres-media', pr.id, 'checked') ?? pr.media_caja,", a: '          media_caja: pr.media_caja,' },
    { nombre: 'sin la nota de lo ya producido', de: "      const nota = '<p class=\"pr-texto-suave\">Cambiar las unidades por caja no toca lo ya producido: cada sublote guardó las suyas.</p>'", a: "      const nota = ''" },
    // Marcas y personal
    { nombre: 'dar de baja no invierte', de: "{ p_id: m.id, p_nombre: m.nombre, p_activa: !m.activa }", a: "{ p_id: m.id, p_nombre: m.nombre, p_activa: m.activa }" },
    { nombre: 'el buscador de marcas no filtra', de: '      const lista = marcasFiltradas(c.datos.marcas, c.busqueda)', a: '      const lista = c.datos.marcas' },
    { nombre: 'el personal muestra todas las unidades siempre', de: '      const base = todos ? personal : personal.filter(p => p.misma_unidad || (p.puestos ?? []).length)', a: '      const base = personal' },
    { nombre: 'el personal oculta a los prestados con puesto', de: '      const base = todos ? personal : personal.filter(p => p.misma_unidad || (p.puestos ?? []).length)', a: '      const base = todos ? personal : personal.filter(p => p.misma_unidad)' },
    { nombre: 'guardar_puestos con los de otra persona', de: '        .filter(x => x.dataset.personaPuesto === personaId && x.checked).map(x => x.dataset.puesto)', a: '        .filter(x => x.checked).map(x => x.dataset.puesto)' },
    { nombre: 'guardar_puestos en otra unidad', de: "{ p_empleado_id: id, p_unidad_negocio_id: c.unidadId, p_puestos: puestosElegidos(id) }", a: "{ p_empleado_id: id, p_unidad_negocio_id: estado.unidadId, p_puestos: puestosElegidos(id) }" },
  ],
})
