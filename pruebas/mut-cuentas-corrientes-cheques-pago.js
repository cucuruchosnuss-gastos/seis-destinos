// Mutaciones de test-cuentas-corrientes-cheques-pago.js (Clientes y los
// cheques en un pago a proveedor, 05/10/2026; sin el cheque propio desde el
// 11/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cuentas-corrientes-cheques-pago.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuentas-corrientes-cheques-pago.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
    funciones: ['htmlFilaCartera'],
    equivalentes: [
      { expr: 'esc(cobra)', motivo: 'texto armado con formatearFecha() de una fecha y palabras fijas: sin ningún carácter que escapar en los datos de prueba' },
    ],
    manuales: [
      // ── Las pestañas ──────────────────────────────────────────────────────
      { nombre: 'Clientes sin permiso', de: "      return tieneTarea('retiros', 'ver')\n    }\n    function renderizarPrimerNivel", a: "      return true\n    }\n    function renderizarPrimerNivel" },
      { nombre: 'las pestañas no se esconden sin permiso', de: '      if (nav) nav.hidden = !puedeVerClientes()', a: '      if (nav) nav.hidden = false' },
      { nombre: 'Clientes no esconde lo de proveedores', de: "      document.getElementById('cc-seccion-proveedores').hidden = s !== 'proveedores'", a: '' },
      { nombre: 'el marco no se carga', de: "      if (s === 'clientes') abrirMarcoClientes()", a: '' },
      { nombre: 'el marco sin embebido', de: "const URL_CLIENTES = 'administracion.html?seccion=clientes&embebido=cc'", a: "const URL_CLIENTES = 'administracion.html?seccion=clientes'" },
      { nombre: 'la dirección no recuerda la pestaña', de: "location.pathname + (s === 'clientes' ? '?pestana=clientes' : '')", a: 'location.pathname' },
      { nombre: '?pestana=clientes no abre la pestaña', de: "      if (params.get('pestana') === 'clientes') mostrarSeccionCC('clientes')\n", a: '' },
      // ── Los medios ────────────────────────────────────────────────────────
      { nombre: 'vuelve el "Cheque" que no movía nada', de: 'id="btn-medio-cartera" hidden>Cheques de la cartera</button>\n', a: 'id="btn-medio-cartera" hidden>Cheques de la cartera</button>\n            <button type="button" class="btn-tipo-doc" data-valor="cheque">Cheque</button>\n' },
      // ── 11/10/2026: el cheque propio NO vuelve ────────────────────────────
      { nombre: 'vuelve el medio "Cheque / e-cheque propio"', de: 'id="btn-medio-cartera" hidden>Cheques de la cartera</button>\n', a: 'id="btn-medio-cartera" hidden>Cheques de la cartera</button>\n            <button type="button" class="btn-tipo-doc" data-valor="propio">Cheque / e-cheque propio</button>\n' },
      { nombre: 'vuelve la llamada a pagar_proveedor_con_cheque_propio', de: "          : await supabase.rpc('registrar_pago_proveedor', {", a: "          : medio === 'propio' ? await supabase.rpc('pagar_proveedor_con_cheque_propio', {})\n          : await supabase.rpc('registrar_pago_proveedor', {" },
      { nombre: 'vuelve el formulario del cheque propio', de: '        <div class="grupo-campo" id="grupo-cuenta-pago-cc"', a: '        <div id="grupo-propio-pago" hidden><select id="campo-cuenta-propio"></select></div>\n        <div class="grupo-campo" id="grupo-cuenta-pago-cc"' },
      { nombre: 'vuelve la validación del cheque propio', de: '    function parametrosPagoCartera(', a: '    function validarChequePropio() { return null }\n    function parametrosPagoCartera(' },
      { nombre: 'MEDIOS_CHEQUE vuelve a tener "propio"', de: "    const MEDIOS_CHEQUE = ['cartera']", a: "    const MEDIOS_CHEQUE = ['cartera', 'propio']" },
      { nombre: 'la cartera deja un hueco en la grilla', de: '    #grilla-medio-pago-cc [data-valor="cartera"] { grid-column: 1 / -1; }\n', a: '' },
      { nombre: 'la cartera sin cobranzas:procesar', de: "      return tieneTarea('cobranzas', 'procesar')", a: '      return true' },
      { nombre: 'la cartera nace visible', de: 'data-valor="cartera" id="btn-medio-cartera" hidden>', a: 'data-valor="cartera" id="btn-medio-cartera">' },
      // ── Los cheques de la cartera ─────────────────────────────────────────
      { nombre: 'se ofrecen cheques de cobranzas sin asentar', de: "!!cob && cob.estado === 'procesada' && !!cob.unidad_negocio_id", a: '!!cob && !!cob.unidad_negocio_id' },
      // Desde el 15/10/2026 SÍ se ofrecen los de otra empresa: las mutaciones
      // de eso (y de la de una cobranza sin empresa) están en
      // mut-cuentas-corrientes-pago-mixto.js.
      { nombre: 'vuelve a ofrecer solo los de la empresa que paga', de: "cob.estado === 'procesada' && !!cob.unidad_negocio_id && (cob.moneda", a: "cob.estado === 'procesada' && cob.unidad_negocio_id === unidadId && (cob.moneda" },
      { nombre: 'se ofrecen cheques en dólares', de: " && (cob.moneda ?? 'ARS') === 'ARS'\n", a: '\n' },
      { nombre: 'se ofrecen cheques que ya salieron', de: "          if (ch.estado && ch.estado !== 'en_cartera') return false\n", a: '' },
      { nombre: 'un común cobra en su fecha de pago', de: "      return ch?.tipo === 'diferido' ? ch.fecha_pago : ch?.fecha_emision", a: '      return ch?.fecha_pago' },
      { nombre: 'el orden no es por cobro', de: ".sort((a, b) => String(a.cobra ?? '9999').localeCompare(String(b.cobra ?? '9999'))", a: ".sort((a, b) => String(b.cobra ?? '9999').localeCompare(String(a.cobra ?? '9999'))" },
      { nombre: 'la suma sin centavos (arrastra decimales)', de: '.reduce((acc, c) => acc + Math.round(Number(c.importe) * 100), 0)\n      return centavos / 100', a: '.reduce((acc, c) => acc + Number(c.importe), 0)\n      return centavos' },
      { nombre: 'la suma cuenta los destildados', de: '      const centavos = (lista ?? []).filter(c => c.tildado).reduce(', a: '      const centavos = (lista ?? []).reduce(' },
      { nombre: 'el monto no es la suma de los tildados', de: "        ponerNumero(document.getElementById('campo-monto-pago'), tildados.length ? montoTotalCartera() : null)", a: '' },
      { nombre: 'tildar no recalcula las facturas', de: "        ponerNumero(document.getElementById('campo-monto-pago'), tildados.length ? montoTotalCartera() : null)\n        programarActualizarSugerenciasPago()", a: "        ponerNumero(document.getElementById('campo-monto-pago'), tildados.length ? montoTotalCartera() : null)" },
      // ── Confirmar con la cartera: NO MUEVE CAJA ───────────────────────────
      { nombre: 'la cartera va por registrar_pago_proveedor (movería caja con una cuenta)', de: "          ? await supabase.rpc('pagar_proveedor_con_cheques_cartera', parametrosPagoCartera({ ...base, chequeIds, fecha }))", a: "          ? await supabase.rpc('registrar_pago_proveedor', { ...parametrosPagoCartera({ ...base, chequeIds, fecha }), p_medio_pago: 'cheque', p_cuenta_id: document.getElementById('campo-cuenta-pago-cc').value })" },
      { nombre: 'la cartera manda una cuenta de caja', de: '      return { p_proveedor_id: proveedorId, p_unidad_negocio_id: unidadId, p_cheque_ids: chequeIds, p_fecha: fecha, p_aplicaciones: aplicaciones }', a: "      return { p_proveedor_id: proveedorId, p_unidad_negocio_id: unidadId, p_cheque_ids: chequeIds, p_fecha: fecha, p_aplicaciones: aplicaciones, p_cuenta_id: 'cta' }" },
      { nombre: 'la cartera sin tildados igual llama', de: "        if (!chequeIds.length) return mostrarError('Tildá al menos un cheque de la cartera.')\n", a: '' },
      { nombre: 'la cartera con fecha futura igual llama', de: "        if (fecha > hoy) return mostrarError('La fecha del pago no puede ser futura.')\n", a: '' },
      { nombre: 'los cheques en dólares pasan', de: "      if (esMedioCheque(medio) && moneda !== 'ARS') return mostrarError('Los cheques son solo en pesos: elegí ARS.')\n", a: '' },
      { nombre: 'la cartera manda todos los cheques, no los tildados', de: '      const chequeIds = carteraPago.filter(c => c.tildado).map(c => c.id)', a: '      const chequeIds = carteraPago.map(c => c.id)' },
      // ── Pesos ─────────────────────────────────────────────────────────────
      { nombre: 'la moneda no pasa a ARS', de: "      if (sel.value !== 'ARS') { sel.value = 'ARS'; actualizarSelectorCuentaPago(); programarActualizarSugerenciasPago() }", a: '' },
      { nombre: 'sin el aviso de pesos', de: "      const mal = esMedioCheque(medioPagoSeleccionado) && document.getElementById('campo-moneda-pago').value !== 'ARS'", a: '      const mal = false' },
      // ── La etiqueta en la cuenta ──────────────────────────────────────────
      { nombre: 'sin la etiqueta de la cartera', de: '      if (t) return `Cheques de la cartera ${t[1]}`\n', a: '' },
      { nombre: 'vuelve la etiqueta del propio', de: '      if (t) return `Cheques de la cartera ${t[1]}`\n', a: '      if (t) return `Cheques de la cartera ${t[1]}`\n      const p = /^Pago con (e-cheque|cheque) propio N° (\\S+)/.exec(d)\n      if (p) return `Cheque propio N° ${p[2]}`\n' },
    ],
  },
  {
    suite: SUITE,
    original: process.env.ARCHIVO_ADMIN_BASE || path.join(RAIZ, 'modulos/administracion.html'),
    variable: 'ARCHIVO_ADMIN',
    funciones: [],
    manuales: [
      { nombre: 'embebida no marca <html>', de: "      document.documentElement.dataset.embebido = 'cc'\n", a: '' },
      { nombre: 'embebida dibuja la barra lateral', de: '      window.__sinBarraLateral = true\n', a: '' },
      { nombre: 'embebida muestra el encabezado', de: "    html[data-embebido] .ad-header,\n    html[data-embebido] #ad-clientes-volver { display: none !important; }", a: '    html[data-embebido] #ad-clientes-volver { display: none !important; }' },
      { nombre: 'embebida tiene portada', de: '      if (EMBEBIDA) {\n        if (!volviendoAClientes', a: '      if (false) {\n        if (!volviendoAClientes' },
      { nombre: 'embebida en bucle sin permiso', de: '          volviendoAClientes = true\n          const yendo = mostrarClientes()\n          volviendoAClientes = false', a: '          const yendo = mostrarClientes()' },
      { nombre: 'embebida se va al dashboard', de: "      if (!EMBEBIDA) setTimeout(() => { window.location.href = '../dashboard.html' }, 2500)", a: "      setTimeout(() => { window.location.href = '../dashboard.html' }, 2500)" },
    ],
  },
])
