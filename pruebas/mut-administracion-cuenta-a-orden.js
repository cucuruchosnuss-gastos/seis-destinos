// Mutaciones de test-administracion-cuenta-a-orden.js (14/10/2026): desde la
// cuenta del cliente, abrir la orden de retiro (o la cobranza) y "← Volver"
// con la pila de navegación. Muta js/cuenta-unica.js (el renglón link,
// compartido), modulos/administracion.html (la pila, el historial, la cuenta
// de cliente) y css/main.css (el look de link). Ver mutar.js (los tres
// guards). Corren de a una:
//
//   node pruebas/mut-administracion-cuenta-a-orden.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-cuenta-a-orden.js')

correrMutacionesEnVarios([
  {
    suite: SUITE, variable: 'ARCHIVO_JS_CUENTA_UNICA', original: process.env.ARCHIVO_BASE_JS || path.join(RAIZ, 'js/cuenta-unica.js'), funciones: [],
    manuales: [
      // ── El escape de los ids (vienen de la base) ─────────────────────────
      { nombre: 'cu: data-orden-retiro sin escCu', de: 'data-orden-retiro="${escCu(f.orden_retiro_id)}"', a: 'data-orden-retiro="${f.orden_retiro_id}"' },
      { nombre: 'cu: data-cobranza-id sin escCu', de: 'data-cobranza-id="${escCu(f.cobranza_id)}"', a: 'data-cobranza-id="${f.cobranza_id}"' },
      // ── El link solo si la pantalla lo pide ──────────────────────────────
      { nombre: 'cu: la orden es link aunque la pantalla no lo pida', de: "  if (abreOrden && f?.orden_retiro_id) return 'orden'", a: "  if (f?.orden_retiro_id) return 'orden'" },
      { nombre: 'cu: la cobranza es link aunque la pantalla no lo pida', de: "  if (abreCobranza && f?.cobranza_id) return 'cobranza'", a: "  if (f?.cobranza_id) return 'cobranza'" },
      { nombre: 'cu: la orden nunca es link', de: "  if (abreOrden && f?.orden_retiro_id) return 'orden'\n", a: '' },
      { nombre: 'cu: con las dos manda la cobranza', de: "  if (abreOrden && f?.orden_retiro_id) return 'orden'\n  if (abreCobranza && f?.cobranza_id) return 'cobranza'", a: "  if (abreCobranza && f?.cobranza_id) return 'cobranza'\n  if (abreOrden && f?.orden_retiro_id) return 'orden'" },
      { nombre: 'cu: data-orden-retiro solo en los links', de: '  const datos = (f.orden_retiro_id ? ', a: '  const datos = (link && f.orden_retiro_id ? ' },
      { nombre: 'cu: data-cobranza-id solo en los links', de: '    (f.cobranza_id ? ` data-cobranza-id', a: '    (link && f.cobranza_id ? ` data-cobranza-id' },
      { nombre: 'cu: el link no dice "Ver la orden"', de: "${link === 'orden' ? 'Ver la orden' : 'Ver la cobranza'}", a: "${'Ver la cobranza'}" },
      { nombre: 'cu: el link sin "Ver…"', de: "  const ver = link ? `<span", a: "  const ver = false ? `<span" },
      { nombre: 'cu: el link es un div (no se toca con el teclado)', de: '(link ? `<button type="button" class="cu-fila cu-fila--link"${datos}>`', a: '(link ? `<div class="cu-fila cu-fila--link"${datos}>`' },
      { nombre: 'cu: el botón no se cierra', de: "(link ? '</button>' : '</div>')", a: "'</div>'" },
      { nombre: 'cu: el link sin la clase cu-fila--link', de: 'class="cu-fila cu-fila--link"${datos}>`', a: 'class="cu-fila"${datos}>`' },
      // ── htmlCuentaUnica / pintarCuentaUnica pasan lo que pide la pantalla ─
      { nombre: 'cu: htmlCuentaUnica no pasa las opciones al renglón', de: 'filas.map(f => htmlFilaCu(f, { abreOrden, abreCobranza }))', a: 'filas.map(f => htmlFilaCu(f))' },
      { nombre: 'cu: pintarCuentaUnica: la orden link siempre', de: "abreOrden: typeof ctx.abrirOrden === 'function'", a: 'abreOrden: true' },
      { nombre: 'cu: pintarCuentaUnica: la orden link nunca', de: "abreOrden: typeof ctx.abrirOrden === 'function'", a: 'abreOrden: false' },
      { nombre: 'cu: pintarCuentaUnica: la cobranza link siempre', de: "abreCobranza: typeof ctx.abrirCobranza === 'function'", a: 'abreCobranza: true' },
      { nombre: 'cu: pintarCuentaUnica: abrirOrden null cuenta como pedido', de: "abreOrden: typeof ctx.abrirOrden === 'function'", a: "abreOrden: 'abrirOrden' in ctx" },
      // ── El toque ─────────────────────────────────────────────────────────
      { nombre: 'cu: tocar la orden no hace nada', de: "  if (fo && typeof ctx.abrirOrden === 'function') { ctx.abrirOrden(fo.dataset.ordenRetiro); return }\n", a: '' },
      { nombre: 'cu: tocar la orden sin mirar si la pantalla la abre (tira)', de: "  if (fo && typeof ctx.abrirOrden === 'function') {", a: '  if (fo) {' },
      { nombre: 'cu: tocar la orden manda otro id', de: 'ctx.abrirOrden(fo.dataset.ordenRetiro)', a: 'ctx.abrirOrden(fo.dataset.orden)' },
      { nombre: 'cu: tocar la cobranza no hace nada', de: "  if (fc && typeof ctx.abrirCobranza === 'function') ctx.abrirCobranza(fc.dataset.cobranzaId)\n", a: '' },
      { nombre: 'cu: tocar la cobranza sin mirar si la pantalla la abre (tira)', de: "  if (fc && typeof ctx.abrirCobranza === 'function') ctx", a: '  if (fc) ctx' },
      { nombre: 'cu: tocar la cobranza manda el id de la orden', de: 'ctx.abrirCobranza(fc.dataset.cobranzaId)', a: 'ctx.abrirCobranza(fc.dataset.ordenRetiro)' },
      { nombre: 'cu: tocar la orden abre también la cobranza', de: "ctx.abrirOrden(fo.dataset.ordenRetiro); return }", a: 'ctx.abrirOrden(fo.dataset.ordenRetiro) }' },
    ],
  },
  {
    suite: SUITE, variable: 'ARCHIVO_TEST', original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'), funciones: [],
    manuales: [
      // ── mostrarVista y la pila ───────────────────────────────────────────
      { nombre: 'adm: ir a otra vista no vacía la pila', de: '      if (PILA_NAV.length && PILA_NAV[PILA_NAV.length - 1].destino !== id) PILA_NAV.length = 0\n', a: '' },
      { nombre: 'adm: cualquier vista vacía la pila (también la que la abrió)', de: '      if (PILA_NAV.length && PILA_NAV[PILA_NAV.length - 1].destino !== id) PILA_NAV.length = 0', a: '      if (PILA_NAV.length) PILA_NAV.length = 0' },
      { nombre: 'adm: mostrarVista no pinta la flecha', de: '      pintarVolverPila()\n      window.scrollTo(0, 0)', a: '      window.scrollTo(0, 0)' },
      { nombre: 'adm: el scroll no se guarda', de: 'scroll: scrollActual(), clienteId', a: 'scroll: 0, clienteId' },
      { nombre: 'adm: scrollActual siempre 0', de: '      return Math.max(0, Number(window.scrollY ?? window.pageYOffset ?? 0) || 0)', a: '      return 0' },
      { nombre: 'adm: no se guarda el cliente', de: "clienteId: estado.cliente?.id ?? null })", a: 'clienteId: null })' },
      { nombre: 'adm: no se empuja al historial', de: "      try { history.pushState?.({ adPila: PILA_NAV.length }, '') } catch (err) { console.error('No se pudo anotar en el historial:', err) }\n", a: '' },
      { nombre: 'adm: pushState sin try (si falla, no abre)', de: "      try { history.pushState?.({ adPila: PILA_NAV.length }, '') } catch (err) { console.error('No se pudo anotar en el historial:', err) }", a: "      history.pushState?.({ adPila: PILA_NAV.length }, '')" },
      { nombre: 'adm: la entrada del historial sin su número', de: "history.pushState?.({ adPila: PILA_NAV.length }, '')", a: "history.pushState?.({ adPila: 1 + PILA_NAV.length }, '')" },
      // ── La flecha y los otros "Volver" ───────────────────────────────────
      { nombre: 'adm: la flecha siempre visible', de: "      document.getElementById('ad-volver').hidden = !flecha", a: "      document.getElementById('ad-volver').hidden = false" },
      { nombre: 'adm: "‹ Órdenes" no se esconde con la pila', de: "      document.getElementById('ad-orden-volver').hidden = flecha", a: "      document.getElementById('ad-orden-volver').hidden = false" },
      { nombre: 'adm: "‹ Órdenes" se esconde también desde la lista (e2e/detalles-dispositivos)', de: "      document.getElementById('ad-orden-volver').hidden = flecha", a: '      document.getElementById(\'ad-orden-volver\').hidden = PILA_NAV.length > 0' },
      { nombre: 'adm: "‹ Cuenta del cliente" no se esconde con la pila', de: "      document.getElementById('ad-cobranza-volver').hidden = flecha", a: "      document.getElementById('ad-cobranza-volver').hidden = false" },
      { nombre: 'adm: el "‹ Volver" al dashboard no se esconde', de: "toggle('ad-app--pila', flecha)", a: "toggle('ad-app--pila', false)" },
      { nombre: 'adm: la flecha también desde la lista', de: "      return !!tope && tope.vista !== 'ad-vista-ordenes'", a: '      return !!tope' },
      { nombre: 'adm: la flecha nunca', de: "      return !!tope && tope.vista !== 'ad-vista-ordenes'", a: '      return false' },
      { nombre: 'adm: "‹ Órdenes" no vuelve por la pila (recarga y deja el historial colgado)', de: "      if (PILA_NAV[PILA_NAV.length - 1]?.vista === 'ad-vista-ordenes') { volverPila(); return }\n", a: '' },
      { nombre: 'adm: "‹ Órdenes" vuelve por la pila aunque se haya venido de la cuenta', de: "      if (PILA_NAV[PILA_NAV.length - 1]?.vista === 'ad-vista-ordenes') { volverPila(); return }", a: '      if (PILA_NAV.length) { volverPila(); return }' },
      { nombre: 'adm: "‹ Órdenes" no escucha a la pila', de: "addEventListener('click', () => volverAOrdenes())", a: "addEventListener('click', () => mostrarOrdenes())" },
      { nombre: 'adm: la flecha nace visible', de: 'id="ad-volver" hidden>', a: 'id="ad-volver">' },
      { nombre: 'adm: el CSS no esconde el "‹ Volver" al dashboard', de: '    .ad-app--pila .ad-header__volver { display: none; }\n', a: '' },
      // ── Abrir ────────────────────────────────────────────────────────────
      { nombre: 'adm: abrir otra orden con la lista al costado apila de nuevo', de: "      if (estado.vista !== 'ad-vista-orden') apilarNav('ad-vista-orden')", a: "      apilarNav('ad-vista-orden')" },
      { nombre: 'adm: abrir la orden no apila', de: "      if (estado.vista !== 'ad-vista-orden') apilarNav('ad-vista-orden')\n", a: '' },
      { nombre: 'adm: abrir la orden con otro destino', de: "apilarNav('ad-vista-orden')", a: "apilarNav('ad-vista-ordenes')" },
      { nombre: 'adm: abrirOrdenDesde sin id abre igual', de: '      if (!id) return\n      if (estado.vista', a: '      if (estado.vista' },
      { nombre: 'adm: abrir la cobranza no apila', de: "      if (estado.vista !== 'ad-vista-cobranza') apilarNav('ad-vista-cobranza')\n", a: '' },
      { nombre: 'adm: la cobranza sin mirar el uuid', de: "      if (!RE_UUID.test(String(id ?? '')) || !estado.cliente || !puedeVerLaCobranza()) return", a: '      if (!estado.cliente || !puedeVerLaCobranza()) return' },
      { nombre: 'adm: la cobranza sin permiso', de: "      if (!RE_UUID.test(String(id ?? '')) || !estado.cliente || !puedeVerLaCobranza()) return", a: "      if (!RE_UUID.test(String(id ?? '')) || !estado.cliente) return" },
      { nombre: 'adm: la cobranza sin su origen (volvería a la lista)', de: "      return abrirCobranza(id, { origen: 'cuenta', clienteOrigen: estado.cliente.id })", a: '      return abrirCobranza(id)' },
      // ── Volver ───────────────────────────────────────────────────────────
      { nombre: 'adm: la flecha no usa el historial', de: "      if (history.state?.adPila === antes && typeof history.back === 'function') {", a: '      if (false) {' },
      { nombre: 'adm: la flecha usa el historial aunque la entrada no sea suya', de: "      if (history.state?.adPila === antes && typeof history.back === 'function') {", a: "      if (typeof history.back === 'function') {" },
      { nombre: 'adm: la flecha sin el plan B si el navegador no avisa', de: '        setTimeout(() => { if (PILA_NAV.length === antes && PILA_NAV[antes - 1] === tope) desapilarNav() }, 600)\n', a: '' },
      { nombre: 'adm: el plan B sin mirar si ya se volvió', de: 'if (PILA_NAV.length === antes && PILA_NAV[antes - 1] === tope) desapilarNav()', a: 'desapilarNav()' },
      { nombre: 'adm: el plan B saca una entrada nueva', de: ' && PILA_NAV[antes - 1] === tope) desapilarNav()', a: ') desapilarNav()' },
      { nombre: 'adm: el adelante del navegador también vuelve', de: '      if (n >= PILA_NAV.length) return\n', a: '' },
      { nombre: 'adm: el atrás que salta varias saca una sola', de: '      PILA_NAV.length = n + 1\n', a: '' },
      { nombre: 'adm: volver no suelta la cobranza', de: "      if (estado.vista === 'ad-vista-cobranza') { estado.cobranza = null; estado.cobranzas.asentando = null }\n", a: '' },
      { nombre: 'adm: volver a la cuenta de otro cliente sin reabrirla', de: "      if (e.vista === 'ad-vista-cliente' && e.clienteId && estado.cliente?.id !== e.clienteId) {", a: '      if (false) {' },
      { nombre: 'adm: volver sin el scroll', de: '      window.scrollTo(0, e.scroll)\n', a: '' },
      { nombre: 'adm: volver sin releer', de: '      refrescarAlVolver(e)\n      return true', a: '      return true' },
      { nombre: 'adm: volver a otra vista', de: '      mostrarVista(e.vista)\n      window.scrollTo(0, e.scroll)', a: "      mostrarVista('ad-vista-clientes')\n      window.scrollTo(0, e.scroll)" },
      // ── Releer al volver ─────────────────────────────────────────────────
      { nombre: 'adm: releer la cuenta redibuja aunque llegue igual', de: '          if (JSON.stringify([r.cuenta, unicaNueva]) === JSON.stringify([c.cuenta, c.unica?.filas ?? null])) return\n', a: '' },
      { nombre: 'adm: releer la cuenta nunca redibuja', de: '          Object.assign(c, r)\n          if (c.unica) c.unica.filas = unicaNueva\n          pintarCliente()', a: '' },
      { nombre: 'adm: releer no pone la cuenta de cliente y proveedor nueva', de: '          if (c.unica) c.unica.filas = unicaNueva\n', a: '' },
      { nombre: 'adm: releer pisa la cuenta con un error', de: '          const unicaNueva = cu && !cu.error ? cu.filas : (c.unica?.filas ?? null)', a: '          const unicaNueva = cu ? cu.filas : null' },
      { nombre: 'adm: releer sobre la cuenta que se ve (no una copia)', de: '          const cu = c.unica ? { ...c.unica } : null', a: '          const cu = c.unica' },
      { nombre: 'adm: releer la lista redibuja aunque llegue igual', de: '          if (JSON.stringify(lista) === JSON.stringify(estado.ordenes)) return\n', a: '' },
      { nombre: 'adm: releer la lista nunca redibuja', de: '          estado.ordenes = lista\n          pintarOrdenes()', a: '' },
      { nombre: 'adm: releer la lista con "Cargando…"', de: "        } else if (e.vista === 'ad-vista-ordenes' && Array.isArray(estado.ordenes)) {\n", a: "        } else if (e.vista === 'ad-vista-ordenes' && Array.isArray(estado.ordenes)) {\n          cargarOrdenes(); return\n" },
      { nombre: 'adm: releer la cuenta con "Cargando…" (abrirCliente)', de: "          if (c.error || !c.cuenta) return\n", a: "          if (c.error || !c.cuenta) return\n          return abrirCliente(c.id)\n" },
      // ── La cuenta de cliente (cuenta_cliente) ────────────────────────────
      { nombre: 'adm: la orden de la cuenta nunca es link', de: '        const orden = m.orden_retiro_id && puedeVerLaOrden() ? m.orden_retiro_id : null', a: '        const orden = null' },
      { nombre: 'adm: la orden de la cuenta es link sin permiso', de: '        const orden = m.orden_retiro_id && puedeVerLaOrden() ? m.orden_retiro_id : null', a: '        const orden = m.orden_retiro_id || null' },
      { nombre: 'adm: data-orden-retiro sin esc', de: 'data-orden-retiro="${esc(orden)}"', a: 'data-orden-retiro="${orden}"' },
      { nombre: 'adm: el botón de la orden no se cierra', de: "${orden || abre ? '</button>' : '</div>'}", a: "${abre ? '</button>' : '</div>'}" },
      { nombre: 'adm: sin "Ver la orden ›"', de: "${orden ? ' · <span class=\"ad-renglon__ver\">Ver la orden ›</span>' : abre ?", a: '${abre ?' },
      { nombre: 'adm: la cobranza de la cuenta deja de abrirse', de: "        const abre = !orden && m.tipo === 'cobranza'", a: "        const abre = !orden && m.tipo === 'cobranzas'" },
      { nombre: 'adm: puedeVerLaOrden siempre', de: "    function puedeVerLaOrden() {\n      return puedeEn('retiros', 'ver')", a: "    function puedeVerLaOrden() {\n      return true" },
      { nombre: 'adm: puedeVerLaOrden sin mirar la empresa', de: "    function puedeVerLaOrden() {\n      return puedeEn('retiros', 'ver')", a: "    function puedeVerLaOrden() {\n      return tieneTarea('retiros', 'ver')" },
      // ── La cuenta de cliente y proveedor ─────────────────────────────────
      { nombre: 'adm: ctx.abrirOrden sin permiso', de: 'abrirOrden: puedeVerLaOrden() ? (id) => abrirOrdenDesde(id) : null', a: 'abrirOrden: (id) => abrirOrdenDesde(id)' },
      { nombre: 'adm: ctx.abrirOrden sin la pila', de: 'abrirOrden: puedeVerLaOrden() ? (id) => abrirOrdenDesde(id) : null', a: 'abrirOrden: puedeVerLaOrden() ? (id) => abrirOrden(id) : null' },
      { nombre: 'adm: ctx.abrirCobranza sin permiso', de: 'abrirCobranza: puedeVerLaCobranza() ? (id) => abrirCobranzaDesdeCuenta(id) : null', a: 'abrirCobranza: (id) => abrirCobranzaDesdeCuenta(id)' },
      { nombre: 'adm: ctx sin abrirCobranza', de: '        abrirCobranza: puedeVerLaCobranza() ? (id) => abrirCobranzaDesdeCuenta(id) : null,\n', a: '' },
      // ── El cableado ──────────────────────────────────────────────────────
      { nombre: 'adm: la lista abre sin la pila', de: '        if (b) abrirOrdenDesde(b.dataset.orden)', a: '        if (b) abrirOrden(b.dataset.orden)' },
      { nombre: 'adm: la cobranza de la cuenta sin la pila', de: '        if (b && estado.cliente) abrirCobranzaDesdeCuenta(b.dataset.cuentaCobranza)', a: "        if (b && estado.cliente) abrirCobranza(b.dataset.cuentaCobranza, { origen: 'cuenta', clienteOrigen: estado.cliente.id })" },
      { nombre: 'adm: la orden de la cuenta de cliente no se toca', de: '        if (r && puedeVerLaOrden()) abrirOrdenDesde(r.dataset.ordenRetiro)', a: '        void r' },
      { nombre: 'adm: la flecha no escucha', de: "      document.getElementById('ad-volver').addEventListener('click', () => volverPila())\n", a: '' },
      { nombre: 'adm: el atrás del navegador no escucha', de: "      window.addEventListener('popstate', (e) => alVolverNavegador(e))\n", a: '' },
    ],
  },
  {
    suite: SUITE, variable: 'ARCHIVO_CSS', original: process.env.ARCHIVO_BASE_CSS || path.join(RAIZ, 'css/main.css'), funciones: [],
    manuales: [
      { nombre: 'css: el renglón link sin cursor de link', de: 'font: inherit; color: inherit; text-align: left; cursor: pointer; }', a: 'font: inherit; color: inherit; text-align: left; }' },
      { nombre: 'css: el renglón link con el borde del botón', de: '.cu-fila--link { width: 100%; margin: 0; background: none; border: 0; border-bottom', a: '.cu-fila--link { width: 100%; margin: 0; background: none; border-bottom' },
      { nombre: 'css: el renglón link angosto', de: '.cu-fila--link { width: 100%; ', a: '.cu-fila--link { ' },
      { nombre: 'css: "Ver la orden ›" sin color de link', de: '.cu-fila__ver { font-size: 0.8125rem; font-weight: 700; color: var(--naranja-oscuro);', a: '.cu-fila__ver { font-size: 0.8125rem; font-weight: 700;' },
    ],
  },
])
