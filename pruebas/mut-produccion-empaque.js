// Mutaciones de test-produccion-empaque.js (la caja, el embolsado, lo que
// consume cada renglón, el empaque consumido del turno, la configuración del
// empaque y los avisos de stock). Ver mutar.js.
//
//   node pruebas/mut-produccion-empaque.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-empaque.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  // htmlProducido y htmlSubloteHistorial NO van acá: sus escapes viejos los
  // cubren test-produccion-cierre y test-produccion-historial. Lo nuevo de
  // ellas (el empaque del renglón) va en mutaciones a mano.
  funciones: ['htmlEmbolsado', 'htmlPasoCaja', 'htmlEmpaqueAgregar', 'htmlEmpaqueTurno'],
  equivalentes: [
    { expr: 'esc(o.valor)', motivo: "constante del código: 'grande' | 'individual' | 'doble' | 'ninguno'" },
    { expr: 'esc(o.texto)', motivo: 'constante del código: el rótulo de cada embolsado' },
    { expr: 'esc(formatearNumeroAr(cajas, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(f.cantidad, { decimales: 3, minimos: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
  ],
  manuales: [
    // ── La caja inicial ─────────────────────────────────────────────────
    { nombre: 'la caja de la unidad no viene puesta', de: "      if (pred && cajas.some(c => c.insumo_id === pred)) return { cajaId: pred, cajaElegida: true }", a: '' },
    { nombre: 'la caja de la unidad se pone aunque no esté habilitada', de: "      if (pred && cajas.some(c => c.insumo_id === pred)) return", a: '      if (pred) return' },
    { nombre: 'la única caja no viene puesta', de: "      if (cajas.length === 1) return { cajaId: cajas[0].insumo_id, cajaElegida: true }", a: '' },
    { nombre: 'sin cajas configuradas hay que elegir igual', de: "      if (!cajas.length) return { cajaId: null, cajaElegida: true }", a: "      if (!cajas.length) return { cajaId: null, cajaElegida: false }" },
    { nombre: 'con varias cajas se elige la primera sola', de: "      return { cajaId: null, cajaElegida: false }\n    }", a: "      return { cajaId: cajas[0].insumo_id, cajaElegida: true }\n    }" },
    // ── Elegir la caja y el embolsado ───────────────────────────────────
    { nombre: 'se puede elegir una caja no habilitada', de: "      if (!a || !cajasDe(estado.catalogo, a.presentacionId).some(c => c.insumo_id === id)) return", a: '      if (!a) return' },
    { nombre: 'cambiar de caja no trae su embolsado', de: "      a.faltaCaja = false\n      a.embolsado = embolsadoSugerido(estado.catalogo, a.presentacionId, id)", a: '      a.faltaCaja = false' },
    { nombre: 'el cono de doble bolsa no fuerza nada', de: "      if (conoDobleBolsa(cat, a?.marcaId)) return 'doble'", a: '' },
    { nombre: 'con doble bolsa se puede bajar a mano', de: "      if (!a || conoDobleBolsa(estado.catalogo, a.marcaId)) return", a: '      if (!a) return' },
    { nombre: 'con doble bolsa las otras opciones no se deshabilitan', de: "`${forzado && o.valor !== 'doble' ? ' disabled' : ''}", a: "`${false ? ' disabled' : ''}" },
    { nombre: 'no se explica la doble bolsa', de: "(forzado ? '<div class=\"pr-aviso\">Este cono va con doble bolsa", a: "(false ? '<div class=\"pr-aviso\">Este cono va con doble bolsa" },
    { nombre: '"Sin bolsa" aparece siempre', de: "      return EMBOLSADOS.filter(o => o.valor !== 'ninguno' || sug === 'ninguno')", a: '      return EMBOLSADOS' },
    { nombre: 'se acepta un embolsado que no se ofrece', de: "      if (!opcionesEmbolsado(a, estado.catalogo).some(o => o.valor === v)) return\n", a: '' },
    { nombre: 'la misma presentación pisa la caja elegida', de: "      if (a.presentacionId !== id || !a.cajaElegida) {", a: '      if (true) {' },
    { nombre: 'otro producto no suelta la caja', de: "a.marcaElegida = false; soltarCaja(a) }\n      a.productoId = id", a: "a.marcaElegida = false }\n      a.productoId = id" },
    { nombre: 'seguir sin caja avanza igual', de: "      if (!a.cajaElegida) { a.faltaCaja = true; return pintarAgregar() }", a: '' },
    { nombre: 'confirmar sin caja manda igual', de: "      if (!a.cajaElegida) { err.textContent = 'Elegí la caja.'; err.hidden = false; return }", a: '' },
    { nombre: 'la caja puesta no saltea su paso (con cono)', de: "      a.paso = a.cajaElegida ? 'cajas' : 'caja'\n", a: "      a.paso = 'caja'\n" },
    { nombre: 'la caja puesta no saltea su paso (sin cono)', de: "      a.paso = a.conCono ? 'cono' : (a.cajaElegida ? 'cajas' : 'caja')", a: "      a.paso = a.conCono ? 'cono' : 'cajas'" },
    { nombre: 'el paso de la caja no se dibuja', de: "          : a.paso === 'caja' ? htmlPasoCaja(a, cat)\n", a: '' },
    { nombre: 'la caja no es un paso', de: "      pasos.push({ clave: 'caja', titulo: 'Caja',", a: "      if (false) pasos.push({ clave: 'caja', titulo: 'Caja'," },
    { nombre: 'el error de caja se muestra antes de intentar', de: "(a.faltaCaja ? '<p class=\"pr-error\">Elegí una caja.</p>'", a: "(true ? '<p class=\"pr-error\">Elegí una caja.</p>'" },
    // ── El consumo: la misma regla que la base ──────────────────────────
    { nombre: 'la caja de cartón no se cuenta', de: '      if (cajaId) sumar(cajaId, 1)\n', a: '' },
    { nombre: 'la bolsa grande no se cuenta con doble', de: "if (e.condicion === 'bolsa_grande' && emb !== 'grande' && emb !== 'doble') continue", a: "if (e.condicion === 'bolsa_grande' && emb !== 'grande') continue" },
    { nombre: 'la bolsa individual no se cuenta con doble', de: "if (e.condicion === 'bolsa_individual' && emb !== 'individual' && emb !== 'doble') continue", a: "if (e.condicion === 'bolsa_individual' && emb !== 'individual') continue" },
    { nombre: 'la bolsa grande se cuenta siempre', de: "        if (e.condicion === 'bolsa_grande' && emb !== 'grande' && emb !== 'doble') continue\n", a: '' },
    { nombre: 'la bolsa individual se cuenta siempre', de: "        if (e.condicion === 'bolsa_individual' && emb !== 'individual' && emb !== 'doble') continue\n", a: '' },
    { nombre: 'un insumo repetido va en dos líneas', de: '        if (f) f.cantidad += cantidad\n        else filas.push', a: '        filas.push' },
    { nombre: 'el total no multiplica por las cajas', de: 'cantidad: Math.round(f.cantidad * cajas * 1000) / 1000', a: 'cantidad: f.cantidad' },
    { nombre: 'el total sin redondear', de: 'cantidad: Math.round(f.cantidad * cajas * 1000) / 1000', a: 'cantidad: f.cantidad * cajas' },
    { nombre: 'el consumo sin decimales', de: '`${formatearNumeroAr(f.cantidad, { decimales: 3, minimos: 0 })}', a: '`${formatearNumeroAr(f.cantidad, { decimales: 0 })}' },
    { nombre: 'el insumo sin la marca', de: "      return ins.marca ? `${ins.nombre} ${ins.marca}` : String(ins.nombre ?? '')", a: "      return String(ins.nombre ?? '')" },
    { nombre: 'el consumo con el embolsado sin forzar', de: "      const porCaja = consumoPorCaja(cat, a.presentacionId, a.cajaId, embolsadoEfectivo(a, cat))\n      h += !a.cajaElegida", a: "      const porCaja = consumoPorCaja(cat, a.presentacionId, a.cajaId, a.embolsado)\n      h += !a.cajaElegida" },
    { nombre: 'el total en vivo no se dibuja', de: "      document.getElementById('pr-agregar-empaque').innerHTML = enFinal ? htmlEmpaqueAgregar(a, cat) : ''", a: "      document.getElementById('pr-agregar-empaque').innerHTML = ''" },
    { nombre: 'sin cajas configuradas no se avisa al lado de las cajas', de: "      if (sinCajas) h += '<div class=\"pr-aviso pr-aviso--grave\">", a: "      if (false) h += '<div class=\"pr-aviso pr-aviso--grave\">" },
    // ── Lo que se lee y lo que viaja ────────────────────────────────────
    { nombre: 'los conos sin doble_bolsa', de: ".select('id, nombre, estado_alta, doble_bolsa')", a: ".select('id, nombre, estado_alta')" },
    { nombre: 'la unidad sin su caja', de: ".select('id, caja_predeterminada_id')", a: ".select('id')" },
    { nombre: 'la caja predeterminada de otra unidad', de: ".select('id, caja_predeterminada_id').eq('id', unidadId)", a: ".select('id, caja_predeterminada_id')" },
    { nombre: 'sin el empaque se agrega igual', de: '        if (re.error) throw re.error\n', a: '' },
    { nombre: 'la caja no viaja', de: 'p_caja_insumo_id: a.cajaId ?? null, p_embolsado', a: 'p_caja_insumo_id: null, p_embolsado' },
    { nombre: 'viaja el embolsado sin el cono', de: 'p_embolsado: embolsadoEfectivo(a, cat),', a: 'p_embolsado: a.embolsado,' },
    // ── Parte 2: verlo después ──────────────────────────────────────────
    { nombre: 'la planilla no trae la caja', de: "unidades, anulado, caja_insumo_id, embolsado')\n        .eq('turno_id', turnoId).order('orden')", a: "unidades, anulado')\n        .eq('turno_id', turnoId).order('orden')" },
    { nombre: 'el historial no trae la caja', de: "unidades, anulado, caja_insumo_id, embolsado').eq('turno_id', turnoId).order('orden'))", a: "unidades, anulado').eq('turno_id', turnoId).order('orden'))" },
    { nombre: 'el renglón de la planilla no dice su empaque', de: "          (empaque ? `<div class=\"pr-producido__detalle\">${esc(empaque)}</div>` : '')", a: "          ''" },
    { nombre: 'el sublote del historial no dice su empaque', de: "        (empaque ? `${esc(empaque)} · ` : '') +", a: "        '' +" },
    { nombre: 'la caja del renglón no se nombra', de: "        partes.push(ins ? textoInsumoEmpaque(ins) : 'caja sin nombre')", a: "        partes.push('caja')" },
    { nombre: 'el embolsado del renglón no se dice', de: "      if (it?.embolsado) partes.push(TEXTO_EMBOLSADO[it.embolsado] ?? it.embolsado)\n", a: '' },
    { nombre: 'la caja de un renglón viejo no se busca aparte', de: "        const { data: ins, error: e6 } = await supabase.from('insumos').select('id, nombre, marca').in('id', cajaIds)", a: "        const { data: ins, error: e6 } = { data: [], error: null }" },
    { nombre: 'el permiso de stock mira otro módulo', de: ".eq('modulo', 'stock').eq('tarea', 'ver')", a: ".eq('modulo', 'produccion').eq('tarea', 'ver')" },
    { nombre: 'sin leer el permiso se asume que no hay', de: "        estado.stockVer = undefined\n", a: "        estado.stockVer = null\n" },
    { nombre: 'super_admin no ve el stock', de: "      if (estado.miRolApp === 'super_admin') return true\n      if (estado.stockVer === undefined) return null", a: "      if (estado.stockVer === undefined) return null" },
    { nombre: 'el alcance todas no alcanza', de: "      if (estado.stockVer.todas === true) return true\n", a: '' },
    { nombre: 'el alcance no mira la unidad', de: "      return lista.includes(String(unidadId))\n    }", a: "      return lista.length > 0\n    }" },
    { nombre: 'sin permiso se consulta igual', de: "      if (permiso === false) return { estado: 'sin_permiso', movimientos: [] }", a: '' },
    { nombre: 'sin saber el permiso se consulta igual', de: "      if (permiso === null) return { estado: 'desconocido', movimientos: [] }", a: '' },
    { nombre: 'el empaque se lee de la unidad equivocada', de: 'const empaque = await leerEmpaqueTurno(turno.unidad_negocio_id, itemIds)', a: 'const empaque = await leerEmpaqueTurno(estado.unidadId, itemIds)' },
    { nombre: 'sin permiso se dice "no se descontó"', de: "      if (e.estado === 'sin_permiso') return", a: "      if (false) return" },
    { nombre: 'un error del libro tira el turno entero', de: "        console.error('empaque del turno:', err)\n        return { estado: 'error', movimientos: [] }", a: '        throw err' },
    { nombre: 'el consumido no es neto (solo los descuentos)', de: '        if (!Number.isFinite(n)) continue', a: '        if (!Number.isFinite(n) || n > 0) continue' },
    { nombre: 'el consumido con el signo del libro', de: 'cantidad: Math.round(-suma * 1000) / 1000', a: 'cantidad: Math.round(suma * 1000) / 1000' },
    { nombre: 'lo devuelto entero se lista en cero', de: '        .filter(f => f.cantidad !== 0)', a: '' },
    { nombre: 'sin movimientos se dice otra cosa', de: "      if (!e.movimientos.length) return '<p class=\"pr-texto-suave\">No se descontó empaque en este turno.</p>'", a: '' },
    { nombre: 'el tope de 1000 no se avisa', de: '      const tope = e.movimientos.length >= TOPE_FILAS', a: '      const tope = false' },
    { nombre: 'el empaque del renglón de la planilla sin escapar', de: '<div class="pr-producido__detalle">${esc(empaque)}</div>', a: '<div class="pr-producido__detalle">${empaque}</div>' },
    { nombre: 'el empaque del sublote del historial sin escapar', de: '(empaque ? `${esc(empaque)} · `', a: '(empaque ? `${empaque} · `' },
    { nombre: 'la sección del empaque no se dibuja', de: '        `<h2 class="pr-subtitulo">Empaque consumido</h2>${htmlEmpaqueTurno(d)}`', a: "        ''" },
  ],
})
