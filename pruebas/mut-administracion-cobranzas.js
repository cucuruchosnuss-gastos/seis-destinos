// Mutaciones de test-administracion-cobranzas.js (27/09/2026). Ver mutar.js:
// las automáticas sacan cada esc() de las funciones nuevas; las de a mano
// rompen una regla por vez.
//
//   node pruebas/mut-administracion-cobranzas.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-cobranzas.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: [
    'htmlChequeCob', 'htmlChequesCob', 'htmlOpcionCliente', 'htmlResultadosAsentar', 'htmlPanelAsentar', 'htmlHechoCob',
    'htmlTarjetaCobranza', 'htmlListaCobranzas', 'htmlCobranzaAbierta',
  ],
  // Textos del código (o un número): sacarles el esc() no cambia ninguna
  // salida posible.
  equivalentes: [
    { expr: 'esc(estado.cobranzas.errorCheques)', motivo: 'texto constante del código: lo pone mostrarCobranzas()' },
    { expr: "esc(n === 1 ? 'Tiene 1 cheque' : 'Tiene ' + n + ' cheques')", motivo: 'texto constante con un número (Number())' },
    { expr: 'esc(cb.errorClientes)', motivo: 'texto constante del código: lo pone abrirAsentar()' },
    { expr: "esc(mas === 1 ? 'Y 1 cliente más: seguí escribiendo.' : 'Y ' + mas + ' clientes más: seguí escribiendo.')", motivo: 'texto constante con un número' },
    { expr: "esc(a.sugeridos.length === 1 ? 'Sugerido por lo que escribió el chofer:' : 'Sugeridos por lo que escribió el chofer:')", motivo: 'uno de dos textos constantes' },
    { expr: 'esc(d.error)', motivo: 'texto constante del código: lo pone recargarCobranza()' },
    { expr: "esc(d.clienteId ? 'la deuda vuelve a la cuenta del cliente' : 'no tiene cuenta de cliente que tocar')", motivo: 'uno de dos textos constantes' },
  ],
  manuales: [
    // ── Permisos ──
    { nombre: 'la sección se ve con ver_todo', de: "{ id: 'cobranzas', titulo: 'Cobranzas por asentar', global: true, tareas: ['cobranzas:procesar'] }", a: "{ id: 'cobranzas', titulo: 'Cobranzas por asentar', global: true, tareas: ['cobranzas:procesar', 'cobranzas:ver_todo'] }" },
    { nombre: 'la sección depende de la empresa', de: "{ id: 'cobranzas', titulo: 'Cobranzas por asentar', global: true,", a: "{ id: 'cobranzas', titulo: 'Cobranzas por asentar', global: false, permiso: ['retiros', 'ver']," },
    { nombre: 'asentar no pide procesar', de: "      return tieneTarea('cobranzas', 'procesar')\n    }\n\n    // Ver una cobranza", a: "      return true\n    }\n\n    // Ver una cobranza" },
    { nombre: 'la portada no cuenta las cobranzas', de: "        leerPorAsentar().then(l => { p.porAsentar = l.length })", a: "        leerPorAsentar().then(l => { p.porAsentar = 0 })" },
    { nombre: 'la portada inventa un 0 si falla', de: "numero = portada?.porAsentar ?? null", a: "numero = portada?.porAsentar ?? 0" },
    // ── La lista ──
    { nombre: 'la lista no pide los cheques', de: "          const r = await leerChequesDe(lista.map(f => f.cobranza_id))", a: "          const r = await leerChequesDe([])" },
    { nombre: 'sin el aviso de los cheques ajenos', de: "        ? '<div class=\"ad-aviso\">Sin el permiso de ver todas las cobranzas, los cheques de las que cargaron otras personas no se ven. Se pueden asentar igual.</div>' : ''", a: "        ? '' : ''" },
    { nombre: 'lo escrito no va entre comillas bajas', de: "esc('«' + (limpio(c.escrito) || '—') + '»')", a: "esc(limpio(c.escrito) || '—')" },
    { nombre: 'un común dice su fecha y no "a la vista"', de: "const pago = ch.tipo === 'diferido' ? 'paga el ' + fechaCorta(ch.fecha_pago) : 'a la vista'", a: "const pago = 'paga el ' + fechaCorta(ch.fecha_pago)" },
    { nombre: 'la cuenta cuenta también las asentadas', de: "return (cb.lista ?? []).filter(f => !cb.hechos.has(f.cobranza_id)).length", a: "return (cb.lista ?? []).length" },
    // ── Asentar ──
    { nombre: 'los sugeridos van después del buscador', de: "        `<h3 class=\"ad-subtitulo\" style=\"margin-top:0\">¿De qué cliente es?</h3>${sugeridos}` +", a: "        `<h3 class=\"ad-subtitulo\" style=\"margin-top:0\">¿De qué cliente es?</h3>` +" },
    { nombre: 'los sugeridos no se destacan', de: "<button type=\"button\" class=\"ad-opcion-cliente${sugerido ? ' ad-opcion-cliente--sugerido' : ''}\"", a: "<button type=\"button\" class=\"ad-opcion-cliente\"" },
    { nombre: 'el sugerido se repite en el buscador', de: "const lista = clientesParaAsentar(cb.clientes, a.busqueda).filter(c => !sugeridosIds.has(c.id))", a: "const lista = clientesParaAsentar(cb.clientes, a.busqueda)" },
    { nombre: 'el buscador no mira los apodos', de: " ||\n        (Array.isArray(c.apodos) && c.apodos.some(a => normalizar(a).includes(q))))", a: ")" },
    { nombre: 'el buscador no mira la razón social', de: "normalizar(c.nombre).includes(q) || normalizar(c.razon_social).includes(q) ||\n        (Array", a: "normalizar(c.nombre).includes(q) ||\n        (Array" },
    { nombre: 'el buscador sin la empresa', de: "      const detalle = [razon, empresa].filter(Boolean).join(' · ')", a: "      const detalle = [razon].filter(Boolean).join(' · ')" },
    { nombre: 'la fábrica de pruebas aparece en el buscador', de: "      cb.clientes = sinUnidadesDePrueba(data ?? [], estado.fabrica, c => c.unidad_negocio_id)", a: "      cb.clientes = data ?? []" },
    { nombre: 'los clientes inactivos también', de: ".select('id, nombre, razon_social, apodos, unidad_negocio_id').eq('activo', true).order('nombre')", a: ".select('id, nombre, razon_social, apodos, unidad_negocio_id').order('nombre')" },
    { nombre: 'sin sugeridos no se dice lo que escribió el chofer', de: "esc('Ningún cliente se llama «' + limpio(c.escrito) + '» ni tiene ese apodo. Buscalo:')", a: "esc('Buscalo:')" },
    { nombre: 'sin sugeridos el foco no va al buscador', de: "enfocar: !c.sugeridos.length }", a: "enfocar: false }" },
    { nombre: 'confirmar sin cliente llama igual', de: "      if (!a.cliente) { a.error = 'Elegí el cliente: un sugerido o uno del buscador.'; repintarAsentar(); return }\n", a: '' },
    { nombre: 'el payload lleva la empresa', de: "      return { p_id: a.id, p_cliente_id: a.cliente.id, p_proyecto_id:", a: "      return { p_id: a.id, p_cliente_id: a.cliente.id, p_unidad_negocio_id: null, p_proyecto_id:" },
    { nombre: 'el payload manda otra cobranza', de: "      return { p_id: a.id, p_cliente_id: a.cliente.id, p_proyecto_id:", a: "      return { p_id: estado.cobranzas.lista?.[0]?.cobranza_id, p_cliente_id: a.cliente.id, p_proyecto_id:" },
    { nombre: 'el error de la base se tapa', de: "        a.error = err?.message || 'No se pudo asentar la cobranza. Probá de nuevo.'", a: "        a.error = 'No se pudo asentar la cobranza. Probá de nuevo.'" },
    { nombre: 'después del error queda trabado', de: "        a.enviando = false\n        a.error = err?.message", a: "        a.error = err?.message" },
    { nombre: 'no dice el saldo que le queda', de: "        `${esc('Se descontaron ' + importeCob(h.importe) + ' de la cuenta de ' + cuenta + '. ' + textoSaldoCliente(h.saldo))}</div>`", a: "        `${esc('Se descontaron ' + importeCob(h.importe) + ' de la cuenta de ' + cuenta + '.')}</div>`" },
    { nombre: 'no dice en qué cuenta', de: "      const cuenta = h.cliente.nombre + (h.cliente.empresa ? ' (' + h.cliente.empresa + ')' : '')", a: "      const cuenta = 'el cliente'" },
    { nombre: 'un saldo que no vino se muestra en cero', de: "      if (saldo === null || saldo === undefined || saldo === '' || !Number.isFinite(Number(saldo))) return 'No se pudo leer el saldo que le queda.'\n", a: '' },
    { nombre: 'el saldo a favor se muestra negativo', de: "      if (n < 0) return `Le queda un saldo a favor de ${importeCob(-n)}.`\n", a: '' },
    { nombre: 'la tarjeta asentada sigue con "Asentar"', de: "      if (hecho) pie = htmlHechoCob(hecho)", a: "      if (false) pie = htmlHechoCob(hecho)" },
    // ── La cuenta y reabrir ──
    { nombre: 'la cuenta no averigua de qué cobranza es cada movimiento', de: "        if (!r.error) cuenta = aparearCobranzas(cuenta, r.data ?? [])", a: "" },
    { nombre: 'aparea aunque los movimientos no sean los mismos', de: "      if (!iguales) return cuenta\n", a: '' },
    { nombre: 'se abre también sin permisos de cobranzas', de: "        const abre = m.tipo === 'cobranza' && m.cobranza_id && puedeVerLaCobranza()", a: "        const abre = m.tipo === 'cobranza' && m.cobranza_id" },
    { nombre: 'se consulta cliente_movimientos sin permiso', de: "      if (cuenta.some(m => m.tipo === 'cobranza') && puedeVerLaCobranza()) {", a: "      if (cuenta.some(m => m.tipo === 'cobranza')) {" },
    { nombre: 'Reabrir sin procesar', de: "      if (c.estado === 'procesada' && puedeAsentar()) {\n        reabrir", a: "      if (c.estado === 'procesada') {\n        reabrir" },
    { nombre: 'reabrir sin motivo mínimo', de: "      if (motivo.length < LARGO_MINIMO_MOTIVO) { r.error = 'Escribí por qué se reabre.'; pintarCobranza(); return }\n", a: '' },
    { nombre: 'reabrir manda el motivo crudo', de: "supabase.rpc('reabrir_cobranza', { p_id: d.id, p_motivo: motivo })", a: "supabase.rpc('reabrir_cobranza', { p_id: d.id, p_motivo: r.motivo })" },
    { nombre: 'el error de reabrir se tapa', de: "        r.error = err?.message || 'No se pudo reabrir la cobranza. Probá de nuevo.'", a: "        r.error = 'No se pudo reabrir la cobranza. Probá de nuevo.'" },
    { nombre: 'volver no vuelve a la cuenta', de: "      if (d?.origen === 'cuenta' && d.clienteOrigen) abrirCliente(d.clienteOrigen)", a: "      if (false) abrirCliente(d.clienteOrigen)" },
    { nombre: 'un id que no es uuid se abre', de: "      if (!RE_UUID.test(String(id ?? ''))) return\n      const turno = ++turnoCobranza", a: "      const turno = ++turnoCobranza" },
    { nombre: 'el id de la cobranza de la cuenta sin escape', de: 'data-cuenta-cobranza="${esc(m.cobranza_id)}"', a: 'data-cuenta-cobranza="${m.cobranza_id}"' },
    // ── La foto ──
    { nombre: 'la foto se firma por un día', de: "supabase.storage.from('cobranzas').createSignedUrl(foto.storage_path, 300)", a: "supabase.storage.from('cobranzas').createSignedUrl(foto.storage_path, 86400)" },
    { nombre: 'cerrar el visor deja la imagen', de: "      document.getElementById('ad-visor-img').src = ''\n    }", a: "    }" },
    // ── El proyecto del Taller (28/09/2026) ──
    { nombre: 'el proyecto no viaja', de: "p_proyecto_id: (esClienteDelTaller(a.cliente) && a.proyectoId) ? a.proyectoId : null", a: 'p_proyecto_id: null' },
    { nombre: 'sin la clave p_proyecto_id', de: ", p_proyecto_id: (esClienteDelTaller(a.cliente) && a.proyectoId) ? a.proyectoId : null }", a: ' }' },
    { nombre: 'busca proyectos para cualquier cliente', de: "      return !!cl && normalizar(cl.empresa) === 'taller'", a: '      return !!cl' },
    { nombre: 'ofrece los cancelados', de: "p.destino === 'externo' && p.estado !== 'cancelado' && ", a: "p.destino === 'externo' && " },
    { nombre: 'ofrece los de otro cliente', de: " && p.cliente_id != null && String(p.cliente_id) === String(cl.id))", a: ')' },
    { nombre: 'no busca los proyectos', de: '      if (esClienteDelTaller(cl) && (a.proyectos === undefined)) cargarProyectosAsentar(a)\n', a: '' },
    { nombre: 'sin taller:ver no lo dice', de: "      if (a.proyectos === null) return '<div class=\"ad-texto-suave\">Con tu usuario no se ven los proyectos del Taller: se asienta sin proyecto.</div>'\n", a: '' },
    { nombre: 'el nombre del proyecto sin escape', de: "${esc(p.nombre + (ETIQUETA_ESTADO_PROYECTO[p.estado] ? ' (' + ETIQUETA_ESTADO_PROYECTO[p.estado] + ')' : ''))}", a: "${p.nombre}" },
    { nombre: 'los proyectos vuelven a compararse por nombre', de: 'p.cliente_id != null && String(p.cliente_id) === String(cl.id)', a: 'normalizar(p.cliente) === normalizar(cl.nombre)' },
    { nombre: 'pide solo los activos', de: "supabase.rpc('proyectos_taller', { p_solo_activos: false })", a: "supabase.rpc('proyectos_taller', { p_solo_activos: true })" },
  ],
})
