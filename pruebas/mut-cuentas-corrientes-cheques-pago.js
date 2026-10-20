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
      { nombre: 'vuelve el "Cheque" que no movía nada', de: 'data-valor="qr" id="btn-medio-qr">QR</button>\n', a: 'data-valor="qr" id="btn-medio-qr">QR</button>\n              <button type="button" class="btn-tipo-doc" data-valor="cheque">Cheque</button>\n' },
      // ── 11/10/2026: el cheque propio NO vuelve ────────────────────────────
      { nombre: 'vuelve el medio "Cheque / e-cheque propio"', de: 'data-valor="qr" id="btn-medio-qr">QR</button>\n', a: 'data-valor="qr" id="btn-medio-qr">QR</button>\n              <button type="button" class="btn-tipo-doc" data-valor="propio">Cheque / e-cheque propio</button>\n' },
      { nombre: 'vuelve la llamada a pagar_proveedor_con_cheque_propio', de: "          const { error } = await supabase.rpc('registrar_pago_proveedor', {", a: "          const { error } = medio === 'propio' ? await supabase.rpc('pagar_proveedor_con_cheque_propio', {}) : await supabase.rpc('registrar_pago_proveedor', {" },
      { nombre: 'vuelve el formulario del cheque propio', de: '        <div class="grupo-campo" id="grupo-cuenta-pago-cc"', a: '        <div id="grupo-propio-pago" hidden><select id="campo-cuenta-propio"></select></div>\n        <div class="grupo-campo" id="grupo-cuenta-pago-cc"' },
      { nombre: 'vuelve la validación del cheque propio', de: '    function parametrosPagoMixto(', a: '    function validarChequePropio() { return null }\n    function parametrosPagoMixto(' },
      { nombre: 'MEDIOS_CHEQUE vuelve a tener "propio"', de: "    const MEDIOS_CHEQUE = ['cartera']", a: "    const MEDIOS_CHEQUE = ['cartera', 'propio']" },
      { nombre: 'la cartera no ocupa todo el ancho', de: '    .btn-cartera-pago { display: block; width: 100%;', a: '    .btn-cartera-pago { display: inline-block; width: auto;' },
      { nombre: 'la grilla vuelve a dos columnas (el QR queda solo)', de: '    #grilla-medio-pago-cc { grid-template-columns: repeat(3, 1fr); }', a: '    #grilla-medio-pago-cc { grid-template-columns: repeat(2, 1fr); }' },
      { nombre: 'la cartera sin cobranzas:procesar', de: "      return tieneTarea('cobranzas', 'procesar')", a: '      return true' },
      { nombre: 'la cartera nace visible', de: 'data-valor="cartera" id="btn-medio-cartera" aria-pressed="false" hidden>', a: 'data-valor="cartera" id="btn-medio-cartera" aria-pressed="false">' },
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
      { nombre: 'tildar no actualiza la barra de valores', de: "      refrescarPago()\n    }\n\n    function tildarChequeCartera", a: "    }\n\n    function tildarChequeCartera" },
      { nombre: 'los cheques vuelven a escribir el monto', de: "      caja.hidden = !avisos.length\n", a: "      caja.hidden = !avisos.length\n      ponerNumero(document.getElementById('campo-monto-pago'), tildados.length ? sumaCheques(carteraPago) : null)\n" },
      // ── Confirmar con la cartera: NO MUEVE CAJA ───────────────────────────
      { nombre: 'la cartera va por registrar_pago_proveedor (movería caja con una cuenta)', de: "          const { data, error } = await supabase.rpc('pagar_proveedor_mixto', parametrosPagoMixto({", a: "          const { data, error } = await supabase.rpc('registrar_pago_proveedor', parametrosPagoMixto({" },
      { nombre: 'la cartera manda una cuenta de caja', de: '        p_cuenta_resto: conResto ? cuentaId : null,', a: "        p_cuenta_resto: cuentaId ?? 'cta'," },
      { nombre: 'la cartera sin tildados igual llama', de: '      if (t.cValores <= 0) return enPesos', a: '      if (false) return enPesos' },
      { nombre: 'la cartera con fecha futura igual llama', de: "      if (fecha > hoy) return 'La fecha del pago no puede ser futura.'", a: "      if (false) return 'La fecha del pago no puede ser futura.'" },
      { nombre: 'los cheques en dólares pasan', de: "      if (!enPesos && (chequeIds ?? []).length) return 'Los cheques son solo en pesos: elegí ARS.'", a: "      if (false) return 'Los cheques son solo en pesos: elegí ARS.'" },
      { nombre: 'la cartera manda todos los cheques, no los tildados', de: '      const chequeIds = estado.pagoCheques ? carteraPago.filter(c => c.tildado).map(c => c.id) : []', a: '      const chequeIds = estado.pagoCheques ? carteraPago.map(c => c.id) : []' },
      // ── Pesos ─────────────────────────────────────────────────────────────
      { nombre: 'en otra moneda se ofrece el QR', de: "      document.getElementById('btn-medio-qr').hidden = !enPesos", a: "      document.getElementById('btn-medio-qr').hidden = false" },
      { nombre: 'en otra moneda se ofrece la cartera', de: "      document.getElementById('btn-medio-cartera').hidden = !(puedeUsarCartera() && enPesos)", a: "      document.getElementById('btn-medio-cartera').hidden = !puedeUsarCartera()" },
      { nombre: 'sin el aviso de otra moneda', de: '      aviso.hidden = enPesos\n', a: '      aviso.hidden = true\n' },
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
