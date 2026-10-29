// Mutaciones de Buscar → "Lote" (ver test-buscar-lote.js). Muta
// modulos/buscar.html: cada esc() de las funciones que dibujan el resultado
// (automáticas) y lo que arma la trazabilidad y hace la búsqueda (a mano).
//
//   node pruebas/mut-buscar-lote.js
const path = require('path')
const { correrMutacionesEn } = require('./mutar')

correrMutacionesEn({
  suite: path.join(__dirname, 'test-buscar-lote.js'),
  original: path.join(__dirname, '..', 'modulos', 'buscar.html'),
  funciones: ['htmlDato', 'htmlTurno', 'htmlProducido', 'htmlInsumo', 'htmlMasas', 'htmlParadas', 'htmlAdelante', 'htmlResultado', 'pintarAviso'],
  // Lo que arma el código (números, horas, rótulos fijos): sin texto de la base.
  equivalentes: [
    { expr: 'esc(rotulo)', motivo: 'texto fijo: los rótulos los escribe htmlTurno' },
    { expr: "esc(plural(p.cajas, 'caja', 'cajas'))", motivo: 'número: produccion_items.cajas es integer' },
    { expr: "esc(`${plural(a.totalCajas, 'caja', 'cajas')} · ${plural(a.totalUnidades, 'unidad', 'unidades')}`)", motivo: 'número: sumas de integer' },
    { expr: 'esc(i.kg)', motivo: 'número: textoKg formatea masa_items.cantidad_kg (numeric)' },
    { expr: 'esc(m.nro)', motivo: 'número: masas.nro es integer' },
    { expr: "esc(`Masa ${m.nro ?? '—'} · ${m.hora}`)", motivo: 'número y hora: masas.nro integer y la hora formateada por Intl' },
    { expr: 'esc(a.masas.length)', motivo: 'número: un conteo' },
    { expr: 'esc(p.hasta ? `${p.desde} a ${p.hasta}` : `desde ${p.desde}`)', motivo: 'hora: inicio y fin (timestamptz) formateados por Intl' },
    { expr: "esc(plural(s.cajas, 'caja', 'cajas'))", motivo: 'número: cajas (integer / sum)' },
    { expr: "esc(plural(a.totalSalidas, 'caja', 'cajas'))", motivo: 'número: una suma' },
    { expr: 'esc(cuantos)', motivo: 'número: un conteo con texto fijo' },
    { expr: 'esc(`Seis Destinos · impreso el ${impreso}`)', motivo: 'fecha: la de la compu, formateada por Intl' },
  ],
  manuales: [
    // El armado
    { nombre: 'el insumo con 0 kg se muestra', de: '.filter(i => numeroCobertura(i?.kg) !== 0)', a: '.filter(i => true)' },
    { nombre: 'un insumo sin kg se esconde', de: '.filter(i => numeroCobertura(i?.kg) !== 0)', a: '.filter(i => numeroCobertura(i?.kg) > 0)' },
    { nombre: 'sin ingreso queda un arreglo vacío (no dice "sin ingreso encontrado")', de: '      return lista.length ? lista : null', a: '      return lista' },
    { nombre: 'el origen sin el comprobante', de: "        o?.comprobante ? `comprobante ${o.comprobante}` : '',\n", a: '' },
    { nombre: 'chocolate se lee solo del texto', de: "const choco = m?.chocolate === true || /choco/i.test(String(m?.tipo ?? ''))", a: "const choco = /choco/i.test(String(m?.tipo ?? ''))" },
    { nombre: 'simple y doble al revés', de: "${m?.doble === true ? 'Doble' : 'Simple'}", a: "${m?.doble === true ? 'Simple' : 'Doble'}" },
    { nombre: 'la hora de la masa sin zona de Argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, hour: '2-digit', minute: '2-digit', hour12: false })", a: "new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false })" },
    { nombre: 'empezó a producir muestra el inicio', de: 'largada: horaCorta(t.hora_largada)', a: 'largada: horaCorta(t.hora_inicio)' },
    { nombre: 'sin el motivo del inicio tarde', de: "inicioTarde: String(t.largada_motivo ?? '').trim() || null", a: 'inicioTarde: null' },
    { nombre: 'el stock en 0 se lista', de: '.filter(s => s.cajas !== null && s.cajas !== 0)', a: '.filter(s => s.cajas !== null)' },
    { nombre: 'un traspaso dice "Sin cliente"', de: "(String(s?.tipo ?? '').startsWith('traspaso') ? 'Traspaso a otra fábrica' : 'Sin cliente')", a: "'Sin cliente'" },
    { nombre: 'la caja no se distingue del turno', de: "esCaja: buscado.includes('-')", a: 'esCaja: false' },
    { nombre: 'la parada sin su categoría', de: "categoria: CATEGORIA_PARADA[p?.categoria] ?? (p?.categoria || ''),", a: "categoria: '',", },
    { nombre: 'el total salido no suma', de: "totalSalidas: suma(salidas, 'cajas')", a: 'totalSalidas: 0' },
    { nombre: 'un operario que sigue muestra una hora inventada', de: 'hasta: o?.hasta ? horaDe(o.hasta) : null', a: 'hasta: horaDe(o?.hasta)' },
    // El HTML
    { nombre: 'paradas antes que las masas', de: '${htmlMasas(a)}${htmlParadas(a)}', a: '${htmlParadas(a)}${htmlMasas(a)}' },
    { nombre: 'sin la tarjeta de hacia adelante', de: '${htmlParadas(a)}${htmlAdelante(a)}</div>', a: '${htmlParadas(a)}</div>' },
    { nombre: 'sin el "sin ingreso encontrado"', de: "        : '<div class=\"bu-meta bu-sin-ingreso\" data-sin-ingreso>sin ingreso encontrado</div>'", a: "        : ''" },
    // Los permisos
    { nombre: 'un alcance null da todas', de: '      if (!permisos?.alcances?.has(clave)) return false\n      const alcance = permisos.alcances.get(clave)\n      if (alcance && alcance.todas === true) return true', a: '      if (!permisos?.alcances?.has(clave)) return false\n      const alcance = permisos.alcances.get(clave)\n      if (!alcance || alcance.todas === true) return true' },
    { nombre: 'super_admin no pasa', de: "      if (permisos?.rol === 'super_admin') return true\n", a: '' },
    { nombre: 'Lote con produccion:cargar', de: "const TAREAS_LOTE = ['produccion:ver', 'stock:ver']", a: "const TAREAS_LOTE = ['produccion:ver', 'stock:ver', 'produccion:cargar']" },
    { nombre: 'Lote sin stock:ver', de: "const TAREAS_LOTE = ['produccion:ver', 'stock:ver']", a: "const TAREAS_LOTE = ['produccion:ver']" },
    { nombre: 'Precios sin retiros:precios', de: "const TAREAS_PRECIOS = ['stock:ver_costos', 'retiros:precios']", a: "const TAREAS_PRECIOS = ['stock:ver_costos']" },
    // La búsqueda
    { nombre: 'vacío llama igual', de: '      if (!lote) {\n        l.error', a: '      if (false) {\n        l.error' },
    { nombre: 'el lote viaja sin recortar', de: "{ p_lote: lote, p_unidad_negocio_id: unidad }", a: "{ p_lote: texto, p_unidad_negocio_id: unidad }" },
    { nombre: 'con "Todas" viaja una fábrica cualquiera', de: '      const unidad = estado.unidadBarra || null', a: "      const unidad = estado.unidadBarra || 'u-n'" },
    { nombre: 'sin permiso en la barra busca igual', de: '      if (sinPermisoLote()) { pintarLote(); return }\n', a: '' },
    { nombre: 'el error de la base no va tal cual', de: '        l.error = mensajeDe(error)\n        l.armados = null', a: "        l.error = 'No se pudo buscar.'\n        l.armados = null" },
    { nombre: 'la fábrica de pruebas se muestra', de: 'const lista = sinUnidadesDePrueba(Array.isArray(data) ? data : [], estado.fabrica, r => r?.turno?.unidad_negocio_id)', a: 'const lista = Array.isArray(data) ? data : []' },
    { nombre: 'una respuesta vieja pisa a la nueva', de: '      if (turno !== l.turnoBusqueda) return\n', a: '' },
    { nombre: 'sin resultados no dice la fábrica', de: "textoSinResultados(l.unidad ? nombreUnidad(l.unidad) : null)", a: 'textoSinResultados(null)' },
    { nombre: 'el botón no se traba mientras busca', de: '      boton.disabled = estado.lote.buscando\n', a: '' },
    { nombre: 'imprimir después de un await', de: "addEventListener('click', () => window.print())", a: "addEventListener('click', async () => { await null; window.print() })" },
  ],
})
