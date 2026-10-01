// Mutaciones de test-cuentas-corrientes-saldo-inicial.js (el saldo inicial de
// un proveedor en Cuentas corrientes · Proveedores, 30/09/2026). Ver mutar.js
// (los tres guards: suite verde sobre el limpio, ancla única, mutación que
// cambia algo).
//
//   node pruebas/mut-cuentas-corrientes-saldo-inicial.js
'use strict'
const path = require('path')
const { correrMutacionesEn } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutacionesEn({
  suite: path.join(__dirname, 'test-cuentas-corrientes-saldo-inicial.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
  funciones: [],
  manuales: [
    // ── El permiso ────────────────────────────────────────────────────────────
    { nombre: 'el saldo inicial sin permiso', de: "    function puedeCargarSaldoInicial() {\n      return tieneTarea('cuentas_corrientes', 'registrar_pago')", a: "    function puedeCargarSaldoInicial() {\n      return true" },
    { nombre: 'el saldo inicial con otra tarea', de: "    function puedeCargarSaldoInicial() {\n      return tieneTarea('cuentas_corrientes', 'registrar_pago')", a: "    function puedeCargarSaldoInicial() {\n      return tieneTarea('cuentas_corrientes', 'aplicar_credito')" },
    { nombre: 'el modal abre sin permiso', de: '      if (!puedeCargarSaldoInicial() || !proveedorId) return\n', a: '      if (!proveedorId) return\n' },
    { nombre: 'la ficha muestra el botón sin permiso', de: "${puedeCargarSaldoInicial() ? '<button type=\"button\" class=\"banner-ficha-cc__btn banner-ficha-cc__btn--secundario\" id=\"btn-saldo-inicial-ficha\">", a: "${true ? '<button type=\"button\" class=\"banner-ficha-cc__btn banner-ficha-cc__btn--secundario\" id=\"btn-saldo-inicial-ficha\">" },
    { nombre: 'el botón de la ficha se deshabilita con "Todas"', de: 'id="btn-saldo-inicial-ficha">Cargar saldo inicial</button>', a: 'id="btn-saldo-inicial-ficha" \' + dis + \'>Cargar saldo inicial</button>' },
    { nombre: 'el padrón muestra el botón sin permiso', de: '      const puedeSaldoInicial = puedeCargarSaldoInicial()', a: '      const puedeSaldoInicial = true' },
    { nombre: 'el padrón no muestra el botón', de: '      const puedeSaldoInicial = puedeCargarSaldoInicial()', a: '      const puedeSaldoInicial = false' },
    { nombre: 'el botón del padrón abre además la ficha', de: "      listaEl.querySelectorAll('.btn-saldo-inicial-padron').forEach(btn => {\n        btn.addEventListener('click', (e) => {\n          e.stopPropagation()\n", a: "      listaEl.querySelectorAll('.btn-saldo-inicial-padron').forEach(btn => {\n        btn.addEventListener('click', (e) => {\n" },
    // ── La fábrica ────────────────────────────────────────────────────────────
    { nombre: 'no viene la fábrica de la ficha ni de la barra', de: '      let elegida = unidadId || estado.unidadElegida || null', a: '      let elegida = null' },
    { nombre: 'no viene la fábrica de la barra', de: '      let elegida = unidadId || estado.unidadElegida || null', a: '      let elegida = unidadId || null' },
    { nombre: 'se ofrece la fábrica de pruebas', de: '      return unidadesParaElegir(estado.maestros.unidades)\n    }\n\n    // Un chip por fábrica', a: '      return estado.maestros.unidades\n    }\n\n    // Un chip por fábrica' },
    { nombre: 'una fábrica que no se ofrece queda elegida', de: '      if (elegida && !unidades.some(u => u.id === elegida)) elegida = null\n', a: '' },
    { nombre: 'con una sola fábrica no viene puesta', de: '      if (!elegida && unidades.length === 1) elegida = unidades[0].id\n', a: '' },
    { nombre: 'la elegida no se marca', de: "${es ? ' ficha-unidad-cc__chip--elegido' : ''}", a: '' },
    { nombre: 'elegir una fábrica no borra el error', de: "      saldoInicial.unidadId = unidadId || null\n      saldoInicial.error = null\n", a: '      saldoInicial.unidadId = unidadId || null\n' },
    { nombre: 'los chips no se conectan', de: '      if (b) elegirUnidadSaldoInicial(b.dataset.siUnidad)', a: '      void b' },
    // ── Lo que viaja ──────────────────────────────────────────────────────────
    { nombre: 'sin fábrica se manda igual', de: "      if (!unidadId) return { error: 'Elegí la fábrica.' }\n", a: '' },
    { nombre: 'un importe vacío se manda igual', de: "      if (importe == null) return { error: 'Escribí el importe que se le debía.' }\n      if (!(importe > 0)) return { error: 'El importe tiene que ser mayor a cero.' }\n", a: '' },
    { nombre: 'un importe vacío dice el otro mensaje', de: "      if (importe == null) return { error: 'Escribí el importe que se le debía.' }\n", a: '' },
    { nombre: 'un importe en cero se manda', de: "      if (!(importe > 0)) return { error: 'El importe tiene que ser mayor a cero.' }\n", a: "      if (importe < 0) return { error: 'El importe tiene que ser mayor a cero.' }\n" },
    { nombre: 'sin fecha se manda igual', de: "      if (!fecha) return { error: 'Elegí la fecha.' }\n", a: '' },
    { nombre: 'la observación no se recorta', de: "      const obs = String(observacion ?? '').trim()", a: "      const obs = String(observacion ?? '')" },
    { nombre: 'una observación vacía viaja como ""', de: '          p_observacion: obs || null,', a: '          p_observacion: obs,' },
    { nombre: 'la moneda siempre pesos', de: "          p_moneda: moneda || 'ARS',", a: "          p_moneda: 'ARS'," },
    { nombre: 'la fábrica que viaja es la de la barra', de: '          p_unidad_negocio_id: unidadId,', a: '          p_unidad_negocio_id: estado.unidadElegida,' },
    { nombre: 'la fecha no viaja', de: '          p_fecha: fecha,', a: '          p_fecha: null,' },
    { nombre: 'el importe se lee sin el formato argentino', de: "        importe: montoDeCampo('campo-saldo-inicial-importe'),", a: "        importe: Number(document.getElementById('campo-saldo-inicial-importe').value)," },
    { nombre: 'llama a la función equivocada', de: "supabase.rpc('registrar_saldo_inicial_proveedor', r.params)", a: "supabase.rpc('registrar_saldo_inicial_cliente', r.params)" },
    { nombre: 'la moneda no arranca en pesos', de: "${m === 'ARS' ? ' selected' : ''}", a: '' },
    { nombre: 'el importe no se vacía al abrir', de: "      ponerNumero(document.getElementById('campo-saldo-inicial-importe'), null)\n", a: '' },
    { nombre: 'la observación no se vacía al abrir', de: "      document.getElementById('campo-saldo-inicial-observacion').value = ''\n", a: '' },
    // ── El error y el doble toque ─────────────────────────────────────────────
    { nombre: 'un doble toque manda dos veces', de: '      if (!s || s.enviando) return\n', a: '      if (!s) return\n' },
    { nombre: 'el botón no se traba mientras se manda', de: '      btn.disabled = !!saldoInicial.enviando', a: '      btn.disabled = false' },
    { nombre: 'el error de la base se tapa con un genérico', de: "        s.error = error.message || 'No se pudo cargar el saldo inicial.'", a: "        s.error = 'No se pudo cargar el saldo inicial.'" },
    { nombre: 'el error va por innerHTML', de: "      err.textContent = saldoInicial.error || ''", a: "      err.innerHTML = saldoInicial.error || ''" },
    { nombre: 'el error no se ve', de: '      err.hidden = !saldoInicial.error', a: '      err.hidden = true' },
    { nombre: 'con error se cierra el modal', de: '        if (saldoInicial === s) renderizarSaldoInicial()\n        return', a: '        if (saldoInicial === s) cerrarModalSaldoInicial()\n        return' },
    { nombre: 'se cierra mientras se manda', de: '      if (saldoInicial?.enviando) return\n', a: '' },
    { nombre: 'sin conexión queda trabado', de: "      } catch (e) {\n        error = { message: 'No hay conexión: el saldo inicial no se cargó. Probá de nuevo.' }\n      }", a: '      } catch (e) {\n        throw e\n      }' },
    { nombre: 'al salir bien no se cierra', de: '      if (saldoInicial === s) cerrarModalSaldoInicial()\n      await refrescarTrasSaldoInicial', a: '      await refrescarTrasSaldoInicial' },
    { nombre: 'al salir bien no lo dice', de: "      mostrarExito(`Saldo inicial cargado en la cuenta de ${nombreUnidad(s.unidadId)}.`)\n", a: '' },
    { nombre: 'el nombre del proveedor va por innerHTML', de: "      document.getElementById('saldo-inicial-proveedor').textContent = saldoInicial.nombre || ''", a: "      document.getElementById('saldo-inicial-proveedor').innerHTML = saldoInicial.nombre || ''" },
    // ── El refresco ───────────────────────────────────────────────────────────
    { nombre: 'no se recarga la lista de saldos', de: "      if (tieneTarea('cuentas_corrientes', 'ver_todo')) cargas.push(cargarSaldos())\n      if (!document.getElementById('vista-padron')", a: "      if (!document.getElementById('vista-padron')" },
    { nombre: 'no se recarga el padrón', de: "      if (!document.getElementById('vista-padron').hidden) cargas.push(cargarPadronSaldos())\n", a: '' },
    { nombre: 'el padrón escondido se recarga igual', de: "      if (!document.getElementById('vista-padron').hidden) cargas.push(cargarPadronSaldos())\n", a: '      cargas.push(cargarPadronSaldos())\n' },
    { nombre: 'no se recarga la ficha abierta', de: '      if (ficha && ficha.proveedorId === proveedorId) {', a: '      if (false) {' },
    { nombre: 'se recarga la ficha de otro proveedor', de: '      if (ficha && ficha.proveedorId === proveedorId) {', a: '      if (ficha) {' },
    // ── El renglón ────────────────────────────────────────────────────────────
    { nombre: 'nada es saldo inicial', de: '      return m?.referencia === NUMERO_SALDO_INICIAL', a: '      return false' },
    { nombre: 'el tipo sigue diciendo "Factura"', de: "      if (m?.tipo === 'factura' && esSaldoInicial(m)) return 'Saldo inicial'\n", a: '' },
    { nombre: 'el interés del saldo inicial se llama "Saldo inicial"', de: "      if (m?.tipo === 'factura' && esSaldoInicial(m)) return 'Saldo inicial'", a: "      if (esSaldoInicial(m)) return 'Saldo inicial'" },
    { nombre: 'la referencia no muestra la observación', de: "        return (m.tipo === 'factura' && observaciones?.get(m.factura_pendiente_id)) || 'Saldo inicial'", a: "        return 'Saldo inicial'" },
    { nombre: 'la referencia vuelve a SALDO-INICIAL', de: "        return (m.tipo === 'factura' && observaciones?.get(m.factura_pendiente_id)) || 'Saldo inicial'", a: "        return (m.tipo === 'factura' && observaciones?.get(m.factura_pendiente_id)) || m.referencia" },
    { nombre: 'nombreFactura no conoce el saldo inicial', de: "      return numero === NUMERO_SALDO_INICIAL ? 'Saldo inicial' : `Factura ${numero || '—'}`", a: "      return `Factura ${numero || '—'}`" },
    { nombre: 'numeroParaMostrar no conoce el saldo inicial', de: "      return numero === NUMERO_SALDO_INICIAL ? 'Saldo inicial' : (numero || '(sin número)')", a: "      return numero || '(sin número)'" },
    { nombre: 'la lista para pagar con el número crudo', de: '        numero: numeroParaMostrar(f.numero_comprobante),', a: "        numero: f.numero_comprobante || '(sin número)'," },
    { nombre: 'la lista de créditos con el número crudo', de: '${numeroParaMostrar(f.numero_comprobante)} — saldo', a: "${f.numero_comprobante || '(sin número)'} — saldo" },
    { nombre: 'el detalle del pago dice "Factura SALDO-INICIAL"', de: '<div class="fila-fifo__numero">${esc(nombreFactura(fp?.numero_comprobante))}</div>', a: '<div class="fila-fifo__numero">Factura ${esc(fp?.numero_comprobante || \'—\')}</div>' },
    { nombre: 'el crédito "se aplicó a la Factura SALDO-INICIAL"', de: 'se aplicó a: ${esc(nombreFactura(ac.facturas_pendientes?.numero_comprobante))}', a: "se aplicó a la Factura ${esc(ac.facturas_pendientes?.numero_comprobante || '—')}" },
    { nombre: 'la ficha dice "Factura"', de: '<div class="fila-movimiento__tipo">${esc(etiquetaTipoMovimiento(m))}</div>', a: '<div class="fila-movimiento__tipo">${esc(TIPO_MOVIMIENTO_LABEL[m.tipo] || m.tipo)}</div>' },
    { nombre: 'el historial dice "Factura"', de: '">${esc(etiquetaTipoMovimiento(m))}</span>', a: '">${esc(TIPO_MOVIMIENTO_LABEL[m.tipo] || m.tipo)}</span>' },
    { nombre: 'el Excel dice "Factura"', de: "        'Tipo':       etiquetaTipoMovimiento(m),", a: "        'Tipo':       TIPO_MOVIMIENTO_LABEL[m.tipo] || m.tipo," },
    { nombre: 'la ficha no lee las observaciones', de: '        cargarObservacionesSaldoInicial(data ?? []),\n', a: '        new Map(),\n' },
    { nombre: 'el historial no lee las observaciones', de: '        cargarObservacionesSaldoInicial(filas),\n', a: '        new Map(),\n' },
    { nombre: 'la ficha no guarda las observaciones', de: '      estado.ficha.obsSaldoInicial  = obsSaldoInicial\n', a: '' },
    { nombre: 'el historial no guarda las observaciones', de: '      estado.obsSaldoInicialHistorial = obsSaldoInicial\n', a: '' },
    { nombre: 'se leen las observaciones de todas las facturas', de: ".filter(m => m.tipo === 'factura' && esSaldoInicial(m) && m.factura_pendiente_id)", a: '.filter(m => m.factura_pendiente_id)' },
    { nombre: 'la consulta no pide la observación', de: ".from('facturas_pendientes').select('id, observaciones')", a: ".from('facturas_pendientes').select('id')" },
    { nombre: 'si falla la lectura, se cae', de: "      if (error) { console.error('No se pudieron leer las observaciones de los saldos iniciales:', error); return mapa }", a: '      if (error) throw error' },
    { nombre: 'sin saldos iniciales igual consulta', de: '      if (!ids.length) return mapa\n      const { data, error } = await supabase.from(\'facturas_pendientes\').select(\'id, observaciones\')', a: "      const { data, error } = await supabase.from('facturas_pendientes').select('id, observaciones')" },
    // ── El escape ─────────────────────────────────────────────────────────────
    { nombre: 'el nombre de la fábrica sin escapar', de: 'aria-pressed="${es ? \'true\' : \'false\'}">${esc(u.nombre)}</button>', a: 'aria-pressed="${es ? \'true\' : \'false\'}">${u.nombre}</button>' },
    { nombre: 'el id de la fábrica sin escapar', de: 'data-si-unidad="${esc(u.id)}"', a: 'data-si-unidad="${u.id}"' },
    // ── El marcado ────────────────────────────────────────────────────────────
    { nombre: 'el modal nace visible', de: '<div class="modal-cc" id="modal-saldo-inicial" hidden>', a: '<div class="modal-cc" id="modal-saldo-inicial">' },
    { nombre: 'el importe vuelve a type=number', de: '<input type="text" id="campo-saldo-inicial-importe" placeholder="0,00" inputmode="decimal">', a: '<input type="number" id="campo-saldo-inicial-importe" placeholder="0,00">' },
    { nombre: 'el botón nace deshabilitado', de: 'id="btn-confirmar-saldo-inicial">Cargar saldo inicial</button>', a: 'id="btn-confirmar-saldo-inicial" disabled>Cargar saldo inicial</button>' },
    { nombre: 'el confirmar no se conecta', de: "    document.getElementById('btn-confirmar-saldo-inicial').addEventListener('click', confirmarSaldoInicial)\n", a: '' },
  ],
})
