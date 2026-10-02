// Mutaciones de test-caja-unidad-movimientos.js (01/10/2026). Ver mutar.js.
//
//   node pruebas/mut-caja-unidad-movimientos.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-unidad-movimientos.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/caja.html'),
  funciones: [],
  manuales: [
    // EL CASO DEL PEDIDO: el gasto de Nuss desde una caja personal.
    { nombre: 'la unidad sale de la cuenta o del dueño (la regla vieja)',
      de: '      if (m?.unidad_negocio_id) return m.unidad_negocio_id\n', a: '' },
    { nombre: 'la ficha de Empresa pide solo sus cuentas aunque haya una empresa elegida',
      de: "      consulta = porUnidad ? consulta.eq('unidad_negocio_id', porUnidad) : consulta.in('cuenta_id', cuentaIds)",
      a: "      consulta = consulta.in('cuenta_id', cuentaIds)" },
    { nombre: 'pide por unidad también con "Todas"',
      de: "      const porUnidad = fichaEmpresaPorUnidad() ? estado.unidadElegida : null", a: "      const porUnidad = estado.unidadElegida || 'u-nuss'" },
    { nombre: 'pide por unidad sin el permiso para leer todas las cajas',
      de: '      return !!estado.unidadElegida && puedeVerMovimientosDeTodos()', a: '      return !!estado.unidadElegida' },
    { nombre: 'el permiso no mira movimientos_todos',
      de: "tieneTarea('ver_listado') || tieneTarea('retiros_todos') || tieneTarea('movimientos_todos')", a: "tieneTarea('ver_listado') || tieneTarea('retiros_todos')" },
    { nombre: 'no lee las cuentas de las cajas que faltan',
      de: '        if (faltan.length) await cargarCuentas(faltan)\n', a: '' },
    { nombre: 'el renglón no dice de qué caja salió',
      de: 'renderizarFilaMovimiento(m, { conUnidad, mostrarPersona: deTodasLasCajas })', a: 'renderizarFilaMovimiento(m, { conUnidad })' },
    { nombre: 'no queda marcado el modo "toda la unidad"',
      de: '      estado.movimientosPorUnidad = porUnidad\n      renderizarMovimientos()', a: '      estado.movimientosPorUnidad = null\n      renderizarMovimientos()' },
    // Las entradas y salidas
    { nombre: 'sin la tarjeta de entradas y salidas en la ficha',
      de: '      cont.innerHTML = htmlEntradasYSalidas(movimientosVisibles(), nombre)', a: "      cont.innerHTML = ''" },
    { nombre: 'la tarjeta también con "Todas"',
      de: "      if (!esEmpresa || !estado.unidadElegida) { cont.innerHTML = ''; return }", a: "      if (!esEmpresa) { cont.innerHTML = ''; return }" },
    { nombre: 'sin permiso no lo dice',
      de: "cont.innerHTML = `<div class=\"nota-unidad-caja\">Con tu usuario se ven solo", a: "cont.innerHTML = `<div class=\"nota-unidad-caja\" hidden>Con tu usuario se ven solo" },
    { nombre: 'los traspasos cuentan como entradas y salidas',
      de: "        if (tipo === 'ingreso_traspaso' || tipo === 'egreso_traspaso') continue\n", a: '' },
    { nombre: 'las salidas suman como entradas',
      de: "        else if (tipo.startsWith('egreso')) por[moneda].salidas += monto", a: "        else if (tipo.startsWith('egreso')) por[moneda].entradas += monto" },
    { nombre: 'se mezclan las monedas',
      de: "        const moneda = m.moneda || 'ARS'", a: "        const moneda = 'ARS'" },
    { nombre: 'un monto que no es número suma NaN',
      de: '        if (!Number.isFinite(monto)) continue\n', a: '' },
    { nombre: 'el nombre de la unidad sin escapar',
      de: '<div class="stat-card-caja__label">Entradas y salidas · ${esc(nombreUnidad || \'Unidad\')}</div>', a: '<div class="stat-card-caja__label">Entradas y salidas · ${nombreUnidad || \'Unidad\'}</div>' },
    { nombre: 'Todos los movimientos sin las entradas y salidas de la empresa',
      de: "        ${estado.unidadElegida ? htmlEntradasYSalidas(movimientos, nombreEmpresa(estado.unidadElegida)) : ''}", a: '' },
    // El cambio de empresa con la ficha abierta
    { nombre: 'cambiar de empresa no vuelve a pedir',
      de: '          if (podo || porUnidadAhora !== (estado.movimientosPorUnidad ?? null)) cargarMovimientosFichaEmpresa()', a: '          if (podo) cargarMovimientosFichaEmpresa()' },
    // Los selects
    { nombre: '"Todos los movimientos" sin la unidad del movimiento',
      de: "contraparte_empleado_id, gasto_id, cobranza_id, unidad_negocio_id')", a: "contraparte_empleado_id, gasto_id, cobranza_id')" },
    { nombre: 'Retiros sin la unidad del movimiento',
      de: ".select('id, tipo, monto, moneda, medio_pago, cuenta_id, descripcion, fecha, empleado_id, unidad_negocio_id')", a: ".select('id, tipo, monto, moneda, medio_pago, cuenta_id, descripcion, fecha, empleado_id')" },
  ],
})
