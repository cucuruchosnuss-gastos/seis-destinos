// Mutaciones de test-administracion-entre-empresas.js (Administración →
// Entre empresas, 13/10/2026; al día con la v2 del 30/10/2026: sin la cuenta
// "≈" con una lista, con el filtro por par y con_precio de la base). Lo nuevo
// de la v2 lo mutan mut-administracion-entre-empresas-v2.js. Ver mutar.js.
//
//   node pruebas/mut-administracion-entre-empresas.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-entre-empresas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlFilaEntre', 'htmlOpcionesEntre', 'pintarEntre'],
  equivalentes: [
    { expr: 'esc(clase)', motivo: "constante del código: un tipo de ORDEN_TIPOS_ENTRE o 'otro' (la clase del sello)" },
  ],
  manuales: [
    // Las dos mitades
    { nombre: 'las mitades no se juntan', de: "        if (f?.tipo === 'mercaderia' && (!f.de_unidad_id || !f.a_unidad_id)) {", a: '        if (false) {' },
    { nombre: 'el precio con la presentación de destino', de: '            presentacion_id: s.presentacion_id ?? e.presentacion_id, presentacion_destino_id', a: '            presentacion_id: e.presentacion_id, presentacion_destino_id' },
    { nombre: 'no se aparea por el nombre del producto', de: '          if (i < 0) i = buscar(s => primerTramoEntre(s.detalle) === primerTramoEntre(e.detalle))\n', a: '' },
    { nombre: 'la mitad sola se pierde', de: "        salidas.forEach((s, i) => { if (!usadas.has(i)) unidas.push(s) })", a: '' },
    { nombre: 'sin ordenar por fecha', de: "      todas.sort((a, b) => String(b?.fecha ?? '').localeCompare(String(a?.fecha ?? '')))\n", a: '' },
    // Plata
    { nombre: 'un importe ausente es $ 0', de: "      if (c === null) return '—'\n      const m = String(moneda || 'ARS')", a: "      if (c === null) return '$ 0,00'\n      const m = String(moneda || 'ARS')" },
    { nombre: 'centavos sin redondear', de: '      return Math.round(Number((v * 100).toFixed(6)))\n    }\n\n    // "$ 1.234,50"', a: '      return v * 100\n    }\n\n    // "$ 1.234,50"' },
    { nombre: 'null cuenta como 0', de: "    function centavosEntre(n) {\n      if (n === null || n === undefined || n === '') return null", a: '    function centavosEntre(n) {' },
    { nombre: 'dólares como pesos', de: "      const pre = m === 'ARS' ? '$' : m === 'USD' ? 'US$' : m", a: "      const pre = '$'" },
    // El neto
    { nombre: 'el neto suma las dos direcciones', de: "        for (const [dir, signo] of [['xy', 1], ['yx', -1]]) {", a: "        for (const [dir, signo] of [['xy', 1], ['yx', 1]]) {" },
    { nombre: 'monedas mezcladas', de: '        porMoneda.set(v.moneda, (porMoneda.get(v.moneda) ?? 0) + v.cent)', a: "        porMoneda.set('ARS', (porMoneda.get('ARS') ?? 0) + v.cent)" },
    { nombre: 'el deudor al revés', de: '        if (c > 0) return `${ny} le debe a ${nx} ${plataEntre(c / 100, m)}`', a: '        if (c > 0) return `${nx} le debe a ${ny} ${plataEntre(c / 100, m)}`' },
    { nombre: 'en cero no se dice', de: "        return 'Están en cero' + enMoneda", a: "        return ''" },
    { nombre: 'el traspaso con precio se cuenta dos veces', de: '        if (yaTienePrecio(f)) { d.conPrecioEnDeuda++; continue }', a: '' },
    { nombre: 'con_precio de la base no se mira', de: "      return f?.tipo === 'mercaderia' && f?.con_precio === true", a: '      return false' },
    { nombre: 'una fila sin empresas entra al par', de: '        if (!de || !a || de === a) { sueltas.push(f); continue }', a: '        if (!de && !a) { sueltas.push(f); continue }' },
    { nombre: 'no cuenta lo que no tiene valor', de: '        p.sinValor = p.dirs.xy.sinValor + p.dirs.yx.sinValor', a: '        p.sinValor = 0' },
    // Filtros
    { nombre: 'el filtro de par no mira el par', de: '(!filtros.par || (!!f?.de_unidad_id && !!f?.a_unidad_id && claveParEntre(f.de_unidad_id, f.a_unidad_id) === filtros.par))', a: 'true' },
    { nombre: 'sin filtro de tipo', de: '        (!filtros.tipo || f?.tipo === filtros.tipo))', a: '        true)' },
    { nombre: 'la fábrica de pruebas aparece', de: '        e.filas = sinPruebaEntre(normalizarEntre(data ?? []))', a: '        e.filas = normalizarEntre(data ?? [])' },
    { nombre: 'la fábrica de pruebas como destino aparece', de: '      return sinUnidadesDePrueba(a, estado.fabrica, f => f?.a_unidad_id)', a: '      return a' },
    // La carga
    { nombre: 'los parámetros de la RPC', de: "        const { data, error } = await supabase.rpc('movimientos_entre_empresas', { p_desde: desde, p_hasta: hasta })", a: "        const { data, error } = await supabase.rpc('movimientos_entre_empresas', { desde, hasta })" },
    { nombre: 'el error de la base se tapa', de: "        e.error = err?.message || 'No se pudieron leer los movimientos entre empresas.'", a: "        e.error = 'No se pudieron leer los movimientos entre empresas.'" },
    { nombre: 'sin Reintentar', de: "          '<button type=\"button\" class=\"ad-btn ad-btn--suave\" data-entre-reintentar>Reintentar</button>'", a: "          ''" },
    { nombre: 'la respuesta vieja pisa', de: "        if (error) throw error\n        if (turno !== e.turno) return\n        e.filas", a: "        if (error) throw error\n        e.filas" },
    { nombre: 'sin período consulta igual', de: "      if (!desde || !hasta) { e.error = 'Elegí el período.'; pintarEntre(); return }\n", a: '' },
    { nombre: 'el período vacío sin palabras', de: "lista.innerHTML = '<div class=\"ad-vacio\">En este período ninguna empresa le pasó nada a otra.</div>'; return }", a: "lista.innerHTML = ''; return }" },
    // El permiso y la portada
    { nombre: 'la sección sin permiso propio', de: "      { id: 'entre', titulo: 'Entre empresas', global: true, tareas: ['gastos:gastos_empresa'] },", a: "      { id: 'entre', titulo: 'Entre empresas', global: true, tareas: ['retiros:ver'] }," },
    { nombre: 'sin leer las tareas de gastos', de: "'cobranzas', 'cuentas_corrientes', 'gastos']).eq('habilitado', true)", a: "'cobranzas', 'cuentas_corrientes']).eq('habilitado', true)" },
    { nombre: 'mostrarEntre sin permiso abre', de: "      if (!SECCIONES.some(s => s.id === 'entre' && seccionVisible(s))) { mostrarInicio(); return }\n      mostrarVista('ad-vista-entre')", a: "      mostrarVista('ad-vista-entre')" },
    { nombre: 'la portada cuenta las mitades', de: '      const filas = sinPruebaEntre(normalizarEntre(data ?? []))\n      const pares', a: '      const filas = data ?? []\n      const pares' },
  ],
})
