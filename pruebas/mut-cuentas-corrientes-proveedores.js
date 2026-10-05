// Mutaciones de test-cuentas-corrientes-proveedores.js (el nombre, los
// colores y el cheque endosado de Cuentas corrientes · Proveedores,
// 29/09/2026). Ver mutar.js (los tres guards: suite verde sobre el limpio,
// ancla única, mutación que cambia algo). Muta modulos/cuentas-corrientes.html
// y, por ARCHIVO_MODULOS_JS, el nombre del catálogo en js/modulos.js.
//
//   node pruebas/mut-cuentas-corrientes-proveedores.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-proveedores.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: [],
    manuales: [
      // ── El nombre y el link a los clientes ──────────────────────────────────
      { nombre: 'la pestaña vuelve al nombre de antes', de: '<title>Cuentas corrientes — Seis Destinos</title>', a: '<title>Cuentas corrientes · Proveedores — Seis Destinos</title>' },
      { nombre: 'la cabecera vuelve al nombre de antes', de: '<span class="cc-header__titulo">Cuentas corrientes</span>', a: '<span class="cc-header__titulo">Cuentas corrientes · Proveedores</span>' },
      { nombre: 'no se leen las tareas de retiros', de: "['cuentas_corrientes', 'facturas_pendientes', 'gastos', 'retiros', 'cobranzas']", a: "['cuentas_corrientes', 'facturas_pendientes', 'gastos', 'cobranzas']" },
      { nombre: 'no se leen las tareas de cobranzas', de: "['cuentas_corrientes', 'facturas_pendientes', 'gastos', 'retiros', 'cobranzas']", a: "['cuentas_corrientes', 'facturas_pendientes', 'gastos', 'retiros']" },
      { nombre: 'las pestañas no se pintan al leer las tareas', de: '      estado.misTareas = new Set((tareas ?? []).map(t => `${t.modulo}:${t.tarea}`))\n      renderizarPrimerNivel()\n', a: '      estado.misTareas = new Set((tareas ?? []).map(t => `${t.modulo}:${t.tarea}`))\n' },
      // ── Colores: lo que se toca, naranja ─────────────────────────────────────
      { nombre: 'la pestaña elegida en verde', de: '    .tabs-cc__opcion--activa {\n      background: var(--color-acento);', a: '    .tabs-cc__opcion--activa {\n      background: var(--verde);' },
      { nombre: 'Hoy / En el mes en turquesa', de: '    .segmented-rango__opcion--activa {\n      background: var(--color-acento);', a: '    .segmented-rango__opcion--activa {\n      background: #3FBFAE;' },
      { nombre: 'el tipo elegido sin naranja', de: '    .btn-tipo-doc--seleccionado {\n      border-color: var(--color-acento);\n      background: var(--color-acento);', a: '    .btn-tipo-doc--seleccionado {\n      border-color: var(--color-acento);\n      background: var(--verde);' },
      { nombre: 'los botones de confirmar en verde', de: '    .btn-cc-accion { background-color: var(--color-acento); color: #fff; }', a: '    .btn-cc-accion { background-color: var(--verde); color: #fff; }' },
      { nombre: 'la barra de filtros sin borde naranja', de: '      border: 1.5px solid var(--color-acento);\n      border-radius: 999px;', a: '      border: 1.5px solid var(--color-borde);\n      border-radius: 999px;' },
      { nombre: 'Registrar pago en blanco', de: '    .banner-ficha-cc__btn--primario { background: var(--color-acento); color: #fff; }', a: '    .banner-ficha-cc__btn--primario { background: #fff; color: var(--color-texto); }' },
      { nombre: 'Ver cuenta sin naranja', de: '      background: var(--color-acento);\n      color: #fff;\n      border-color: var(--color-acento);\n    }\n    .btn-ver-cuenta:hover', a: '      background: var(--verde);\n      color: #fff;\n      border-color: var(--verde);\n    }\n    .btn-ver-cuenta:hover' },
      // ── Colores: los datos no van en naranja ─────────────────────────────────
      { nombre: '"Saldo total a pagar" vuelve a ser naranja', de: '    .resumen-cc-card--navy {\n      background: var(--color-fondo);', a: '    .resumen-cc-card--navy {\n      background: var(--color-acento);' },
      { nombre: 'el número del resumen en blanco', de: '    .resumen-cc-card--navy .resumen-cc-card__monto { color: var(--color-texto); }', a: '    .resumen-cc-card--navy .resumen-cc-card__monto { color: #fff; }' },
      { nombre: 'el banner vuelve al degradé', de: '      padding: 1.5rem;\n      background: var(--color-fondo);\n      border: 1px solid var(--color-borde);', a: '      padding: 1.5rem;\n      background: linear-gradient(135deg, #3FBFAE, #1E8C7C);\n      border: 1px solid var(--color-borde);' },
      { nombre: 'la deuda del banner en naranja', de: '      letter-spacing: -0.02em;\n      color: var(--color-texto);\n      margin-top: 0.25rem;', a: '      letter-spacing: -0.02em;\n      color: var(--color-acento);\n      margin-top: 0.25rem;' },
      { nombre: 'la fecha del movimiento vuelve al naranja', de: '    .fila-movimiento__fecha { font-size: 0.8125rem; color: var(--color-texto-2); }', a: '    .fila-movimiento__fecha { font-size: 0.8125rem; color: var(--color-acento-highlight); }' },
      { nombre: 'el punto de la factura en naranja', de: '    .punto-tipo-mov--factura           { background: var(--color-texto-suave); }', a: '    .punto-tipo-mov--factura           { background: var(--color-acento); }' },
      { nombre: 'el chip "Pago" en naranja', de: '    .chip-tipo-mov--pago              { background: var(--verde-suave); color: var(--verde-oscuro); }', a: '    .chip-tipo-mov--pago              { background: var(--color-acento-suave); color: var(--color-acento-highlight); }' },
      // ── Colores: la deuda, neutra ────────────────────────────────────────────
      { nombre: '"Pendiente" vuelve a rojo', de: '    .badge-estado-factura--pendiente { background: var(--color-superficie); color: var(--color-texto-menu); }', a: '    .badge-estado-factura--pendiente { background: var(--rojo-suave);     color: var(--rojo); }' },
      { nombre: '"Parcial" vuelve a ámbar', de: '    .badge-estado-factura--parcial   { background: var(--color-superficie); color: var(--color-texto-2); }', a: '    .badge-estado-factura--parcial   { background: var(--amarillo-suave); color: var(--amarillo); }' },
      { nombre: 'el chip "Factura" vuelve a rojo', de: '    .chip-tipo-mov--factura           { background: var(--color-superficie); color: var(--color-texto-menu); }', a: '    .chip-tipo-mov--factura           { background: var(--rojo-suave); color: var(--rojo); }' },
      { nombre: 'el "Debe" en bordó', de: '    .proveedor-cc__monto {\n      font-size: 0.9375rem;\n      font-weight: 700;\n      color: var(--color-texto);', a: '    .proveedor-cc__monto {\n      font-size: 0.9375rem;\n      font-weight: 700;\n      color: var(--bordo);' },
      // ── Colores: a favor, verde ──────────────────────────────────────────────
      { nombre: 'el crédito a favor de la lista sin verde', de: '    .proveedor-cc__monto--favor { color: var(--verde-oscuro); }', a: '    .proveedor-cc__monto--favor { color: var(--color-texto); }' },
      { nombre: 'el crédito a favor del resumen sin verde', de: '    .resumen-cc-card__monto--favor { color: var(--verde-oscuro); }', a: '    .resumen-cc-card__monto--favor { color: var(--color-acento); }' },
      { nombre: 'lo que baja la deuda sin verde', de: '    .fila-movimiento__monto--reduce { color: var(--verde-oscuro); }', a: '    .fila-movimiento__monto--reduce { color: var(--color-acento); }' },
      { nombre: '"Pagada" sin verde', de: '    .badge-estado-factura--pagada    { background: var(--verde-suave);      color: var(--verde-oscuro); }', a: '    .badge-estado-factura--pagada    { background: rgba(30,140,74,0.12);  color: #1E8C4A; }' },
      { nombre: 'el sobrante a favor en turquesa', de: '      margin-top: 0.375rem;\n      color: var(--verde-oscuro);', a: '      margin-top: 0.375rem;\n      color: #1E8C7C;' },
      { nombre: 'el crédito del detalle del pago en ámbar', de: '      background: var(--verde-suave);\n      color: var(--verde-oscuro);\n      font-size: 0.8125rem;', a: '      background: var(--amarillo-suave);\n      color: var(--amarillo-oscuro);\n      font-size: 0.8125rem;' },
      { nombre: 'el banner a favor sin clase verde', de: "${esFavor ? ' banner-ficha-cc--favor' : ''}", a: '' },
      { nombre: 'el banner verde también con deuda', de: "${esFavor ? ' banner-ficha-cc--favor' : ''}", a: ' banner-ficha-cc--favor' },
      { nombre: 'la regla verde del banner a favor se va', de: '    .banner-ficha-cc--favor .banner-ficha-cc__etiqueta,\n    .banner-ficha-cc--favor .banner-ficha-cc__monto { color: var(--verde-oscuro); }\n', a: '' },
      // ── Colores: lo que falta, bordó ─────────────────────────────────────────
      { nombre: 'la descarga sin importe sin bordó', de: '      background: var(--bordo-suave);\n      color: var(--bordo);\n      font-size: 0.75rem;', a: '      background: var(--color-superficie);\n      color: var(--color-texto);\n      font-size: 0.75rem;' },
      { nombre: '"Falta importe" vuelve al rojo suelto', de: '    .fila-movimiento__monto--falta { color: var(--bordo); font-weight: 700; white-space: nowrap; }', a: '    .fila-movimiento__monto--falta { color: #B91C1C; font-weight: 700; white-space: nowrap; }' },
      { nombre: 'el ícono vuelve al turquesa', de: '      background: oklch(0.50 0.15 322);', a: '      background: linear-gradient(135deg, var(--turquesa), var(--turquesa-oscuro));' },
      { nombre: 'los avatares vuelven al azul', de: "    const PALETA_AVATAR = ['#FDE7E7', '#F6EBDD', '#E6F4EC', '#FFF3DA', '#F3E8E2']", a: "    const PALETA_AVATAR = ['#FDE7E7', '#E3F0FF', '#E6F7EC', '#FFF3DA', '#F1E7FC']" },
      // ── El cheque endosado ───────────────────────────────────────────────────
      { nombre: 'cualquier medio de pago cuenta como cheque', de: "      if (!gasto || gasto.medio_pago !== 'cheque') return null", a: '      if (!gasto) return null' },
      { nombre: 'el número de cualquier largo', de: '/^Cheque endosado (\\d{3})-(\\d{8})(?!\\d)/', a: '/^Cheque endosado (\\d+)-(\\d+)/' },
      { nombre: 'la etiqueta es la descripción entera', de: '      if (m) return `Cheque endosado ${m[1]}-${m[2]}`', a: '      if (m) return String(gasto.descripcion)' },
      { nombre: 'sin tandas', de: '    const TANDA_GASTOS_PAGO = 200', a: '    const TANDA_GASTOS_PAGO = 1000' },
      { nombre: 'si falla la lectura, se cae', de: "        if (error) { console.error('No se pudieron leer los pagos (cheques endosados):', error); return mapa }", a: '        if (error) throw error' },
      { nombre: 'una factura toma la etiqueta del cheque', de: "      return (m?.tipo === 'pago' && etiquetas?.get(m.gasto_id)) || m?.referencia || ''", a: "      return etiquetas?.get(m?.gasto_id) || m?.referencia || ''" },
      { nombre: 'la ficha sigue con la referencia de la vista', de: "        const referencia = referenciaMovimiento(m, estado.ficha.etiquetasPago, estado.ficha.obsSaldoInicial) || '—'", a: "        const referencia = m.referencia || '—'" },
      { nombre: 'la ficha no guarda las etiquetas', de: '      estado.ficha.etiquetasPago    = etiquetasPago\n', a: '' },
      { nombre: 'la ficha no lee las etiquetas', de: '        cargarEtiquetasDePagos(data ?? []),\n', a: '        new Map(),\n' },
      { nombre: 'el historial sigue con la referencia de la vista', de: '        const referencia = referenciaMovimiento(m, estado.etiquetasPagoHistorial, estado.obsSaldoInicialHistorial)', a: "        const referencia = m.referencia || ''" },
      { nombre: 'el historial no guarda las etiquetas', de: '      estado.etiquetasPagoHistorial = etiquetasPago\n', a: '' },
      { nombre: 'el Excel sigue con la referencia de la vista', de: "        'Referencia': referenciaMovimiento(m, estado.etiquetasPagoHistorial, estado.obsSaldoInicialHistorial),", a: "        'Referencia': m.referencia || ''," },
      { nombre: 'el detalle del pago dice solo "Cheque"', de: '${esc(etiquetaPagoDeGasto(gasto) || MEDIOS_PAGO_LABEL[gasto?.medio_pago]', a: '${esc(MEDIOS_PAGO_LABEL[gasto?.medio_pago]' },
      { nombre: 'el detalle del pago no lee la descripción', de: "select('fecha_pago, medio_pago, importe, moneda, descripcion')", a: "select('fecha_pago, medio_pago, importe, moneda')" },
      { nombre: 'la referencia de la ficha sin escapar', de: '<div class="fila-movimiento__referencia">${esc(referencia)}${badgeEstado}</div>', a: '<div class="fila-movimiento__referencia">${referencia}${badgeEstado}</div>' },
    ],
  },
  {
    suite: SUITE,
    original: process.env.ARCHIVO_MODULOS_BASE || path.join(RAIZ, 'js/modulos.js'),
    variable: 'ARCHIVO_MODULOS_JS',
    funciones: [],
    manuales: [
      { nombre: 'el catálogo vuelve al nombre de antes', de: "    nombre: 'Cuentas corrientes',", a: "    nombre: 'Cuentas corrientes · Proveedores'," },
    ],
  },
])
