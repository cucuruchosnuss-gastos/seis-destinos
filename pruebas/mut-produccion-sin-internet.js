// Mutaciones de test-produccion-sin-internet.js (06/10/2026): la cola adentro
// de la planta, lo pendiente de enviar, lo que no anda sin red y la
// calculadora de cajas. Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-sin-internet.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-sin-internet.js'),
  escape: 'esc',
  funciones: ['htmlErroresCola'],
  soloPlanta: ['htmlErroresCola'],
  equivalentes: [
    { expr: 'esc(x.id)', motivo: 'el id de la carga es un client_uuid que genera la tablet (crypto.randomUUID): ningún carácter escapable' },
  ],
  manuales: [
    // ── La cola ──
    { nombre: 'lo producido vuelve a llamar directo (sin clave ni cola)', de: "      const r = await mandarCarga({\n        operacion: 'registrar_produccion_item', params: parametrosRegistrarProducido(turnoId, a), grupo: turnoId,", a: "      const r = await supabase.rpc('registrar_produccion_item', parametrosRegistrarProducido(turnoId, a)).then(x => ({ resultado: x.error ? 'rechazo' : 'ok', data: x.data, error: x.error }))\n      void ({\n        operacion: 'registrar_produccion_item', params: parametrosRegistrarProducido(turnoId, a), grupo: turnoId," },
    { nombre: 'ejecutar_tablet sin la clave de la carga', de: "      return supabase.rpc('ejecutar_tablet', { p_client_uuid: item.id, p_operacion: item.operacion, p_params: params })", a: "      return supabase.rpc('ejecutar_tablet', { p_client_uuid: crypto.randomUUID(), p_operacion: item.operacion, p_params: params })" },
    { nombre: 'las masas van por ejecutar_tablet', de: "      if (item.operacion === 'registrar_masa') {\n        const r = await supabase.rpc('registrar_masa', params)", a: "      if (false) {\n        const r = await supabase.rpc('registrar_masa', params)" },
    { nombre: 'la masa enviada no borra su borrador', de: "          const b = leerBorradorMasa(item.id)\n          if (b) borrarBorradorMasa(b)\n        }\n        return r", a: "        }\n        return r" },
    { nombre: 'la planilla no muestra lo pendiente', de: "      return planillaConCola({ turno, operarios: ops ?? [], masas: masas ?? [], paradas: paradas ?? [], items: items ?? [], insumosCaja, marcasItems, maquinaNombre, horario })", a: "      return { turno, operarios: ops ?? [], masas: masas ?? [], paradas: paradas ?? [], items: items ?? [], insumosCaja, marcasItems, maquinaNombre, horario }" },
    { nombre: 'aplicar la cola dos veces duplica', de: '      const base = l?._base ?? l\n', a: '      const base = l\n' },
    { nombre: 'lo enviado que la planilla ya trae se repite', de: "          if (!enCola(x) && real != null && idsItems.has(String(real))) continue\n", a: '' },
    { nombre: 'otra planilla se mezcla', de: "      const mias = (lista ?? []).filter(x => String(x.grupo) === String(turnoId))", a: '      const mias = (lista ?? []).filter(x => true)' },
    { nombre: 'lo pendiente tiene Corregir y Anular', de: '      const botones = it.cola ? htmlEstadoColaFila(it.cola) : it.anulado', a: '      const botones = it.anulado' },
    { nombre: 'la vuelta de una parada pendiente no va como referencia', de: '      if (params.p_parada_id != null) params.p_parada_id = paradaRef(params.p_parada_id)\n', a: '' },
    { nombre: 'la largada pendiente no se ve', de: '          turno.hora_largada = p.p_hora\n', a: '' },
    { nombre: 'la vuelta pendiente no termina la parada en pantalla', de: "          if (par) Object.assign(par, { inicio: p.p_inicio ?? par.inicio, fin: p.p_fin ?? null, motivo: p.p_motivo ?? par.motivo, cola: estadoCola(x) })", a: '          void par' },
    { nombre: 'el cierre pendiente no se avisa en la planilla', de: '          turno.cierreCola = estadoCola(x)\n', a: '' },
    // ── El cartel ──
    { nombre: 'el cartel no se muestra', de: '      el.hidden = !c\n', a: '      el.hidden = true\n' },
    { nombre: 'sin la clase que esconde el aviso viejo', de: "      document.body?.classList?.toggle('pr-con-cartel', !!c)\n", a: '' },
    { nombre: 'los errores de la cola no se dibujan', de: "      document.getElementById('pr-cola-errores').innerHTML = htmlErroresCola(lista)", a: "      document.getElementById('pr-cola-errores').innerHTML = ''" },
    { nombre: 'sin "Todo enviado"', de: '          estado.recienEnviado = Date.now()\n', a: '' },
    // ── Lo que no anda sin red ──
    { nombre: 'abrir sin red no avisa', de: "      if (sinInternet()) { mostrarError(MENSAJE_ABRIR_SIN_RED); return }\n", a: '' },
    { nombre: 'confirmar abrir sin red manda igual', de: "      if (sinInternet()) { err.textContent = MENSAJE_ABRIR_SIN_RED; err.hidden = false; return }\n", a: '' },
    { nombre: 'el reintento de abrir usa otra clave', de: '        if (form.envio?.clave !== clave) form.envio = { clave, id: crypto.randomUUID() }', a: '        form.envio = { clave, id: crypto.randomUUID() }' },
    { nombre: 'abrir no lee { turnos }', de: '        const data = Array.isArray(resp?.turnos) ? resp.turnos : resp', a: '        const data = resp' },
    { nombre: 'el PIN sin red dice el mensaje viejo', de: "        p.mensaje = { texto: esErrorDeRedCarga(err) ? MENSAJE_PIN_SIN_RED : 'No se pudo verificar el PIN. Revisá la conexión y probá de nuevo.' }", a: "        p.mensaje = { texto: 'No se pudo verificar el PIN. Revisá la conexión y probá de nuevo.' }" },
    { nombre: 'sin red, la persona sale por inactividad', de: '      if (sinInternet()) return false\n', a: '' },
    { nombre: 'lote nuevo sin red se manda igual', de: "      if (loteNuevo && sinInternet()) {\n        f.errorBase = MENSAJE_LOTE_NUEVO_SIN_RED\n        return pintarResumenParada(ahora)\n      }\n", a: '' },
    { nombre: 'el cierre sin red da error en vez de quedar en la tablet', de: "        if (r.resultado === 'rechazo') throw r.error ?? new Error('No se pudo cerrar la planilla.')", a: "        if (r.resultado !== 'ok') throw r.error ?? new Error('No se pudo cerrar la planilla.')" },
    // ── La versión ──
    { nombre: 'la primera huella avisa siempre', de: '        if (d.cambio && estado.cargadaDeCopia) mostrarAvisoVersion()', a: '        if (d.cambio) mostrarAvisoVersion()' },
    { nombre: 'una huella nueva no avisa', de: '      if (d.huella !== estado.huellaApp) mostrarAvisoVersion()', a: '      void d' },
    { nombre: 'Actualizar recarga en medio de una carga', de: "      if (aMedioCargar()) {\n        pedirConfirmacion({ titulo: '¿Actualizar ahora?'", a: "      if (false) {\n        pedirConfirmacion({ titulo: '¿Actualizar ahora?'" },
    // ── La calculadora ──
    { nombre: 'los rápidos ponen en vez de sumar', de: '      ponerNumero(campo, sumarCajas(antes, n))', a: '      ponerNumero(campo, n)' },
    { nombre: 'deshacer no deshace', de: '      const valor = h.pop()\n', a: '      const valor = h[0]\n' },
    { nombre: 'sumar no se recuerda para deshacer', de: '      recordarCajas(a, antes)\n      ponerNumero(campo, sumarCajas(antes, n))', a: '      ponerNumero(campo, sumarCajas(antes, n))' },
    { nombre: 'sumarCajas deja negativos', de: '      return Math.max(0, t + (Number(n) || 0))', a: '      return t + (Number(n) || 0)' },
  ],
})
