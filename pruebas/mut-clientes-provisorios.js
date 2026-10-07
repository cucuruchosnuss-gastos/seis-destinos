// Mutaciones de test-clientes-provisorios.js (los clientes provisorios en
// Administración, 06/10/2026). Ver mutar.js.
//
//   node pruebas/mut-clientes-provisorios.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
// Solo la parte de Administración: la cartera de cheques (una región al
// final del archivo) la mutan las suites de Cheques.
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-clientes-provisorios.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlAccionesProvisorio', 'htmlDestinoUnir', 'htmlUnir', 'htmlFaltaLista'],
  equivalentes: [
    { expr: 'esc(c.cliente_id)', motivo: 'el id de un cliente va a un data-* entre comillas (uuid de la base)' },
    { expr: 'esc(c.id)', motivo: 'el id de un cliente va a un data-unir-destino entre comillas (uuid de la base)' },
    { expr: "esc('Cliente provisorio · ' + TEXTO_ELEGI_FABRICA + ' para completarlo o unirlo')", motivo: 'texto constante del código' },
  ],
  manuales: [
    // La lista
    { nombre: 'los provisorios no van arriba', de: '      const prendidos = provisoriosPrimero(estado.saldos ?? [])', a: '      const prendidos = estado.saldos ?? []' },
    { nombre: 'sin el chip Provisorio', de: "        `${esProvisorio(c) ? '<span class=\"ad-sello ad-sello--provisorio\">Provisorio</span>' : ''}` +\n", a: '' },
    { nombre: 'sin las acciones debajo de la fila', de: '${htmlInterruptor(c)}</div>${htmlAccionesProvisorio(c)}`', a: '${htmlInterruptor(c)}</div>`' },
    { nombre: 'un apagado cuenta como provisorio', de: '      if (!c || c.apagado || c.activo === false) return false', a: '      if (!c) return false' },
    { nombre: 'la columna provisorio no se lee', de: 'limite_credito, activo, codigo_anterior, apodos, provisorio\')', a: 'limite_credito, activo, codigo_anterior, apodos\')' },
    { nombre: 'Completar sin precios', de: "      if (puedeConfirmar(unidad)) botones.push(", a: '      if (true) botones.push(' },
    { nombre: 'Unir sin permiso', de: '      if (puedeDarAlta(unidad)) botones.push(', a: '      if (true) botones.push(' },
    { nombre: 'con Todas se ofrecen las acciones', de: "      if (clientesEnTodas()) return `<div class=\"ad-provisorio\"><span class=\"ad-bloqueado-todas\">", a: "      if (false) return `<div class=\"ad-provisorio\"><span class=\"ad-bloqueado-todas\">" },
    // La burbuja y la portada
    { nombre: 'la pestaña Clientes sin burbuja', de: ": id === 'clientes' ? p?.provisorios : null", a: ': null' },
    { nombre: 'la portada no cuenta los provisorios', de: '; p.provisorios = r.provisorios })', a: ' })' },
    { nombre: 'contarProvisorios cuenta los apagados', de: '      return clientes.filter(c => c?.provisorio === true && c.activo !== false).length', a: '      return clientes.filter(c => c?.provisorio === true).length' },
    { nombre: 'la tarjeta no dice los provisorios', de: "            Number(p?.provisorios) > 0 ? { t: n(p.provisorios, '1 cliente provisorio por confirmar', p.provisorios + ' clientes provisorios por confirmar'), tono: 'mal' } : null] }", a: '            null] }' },
    { nombre: 'la lista no pone al día la burbuja', de: '        estado.saldos = saldos\n        actualizarProvisoriosPortada()\n', a: '        estado.saldos = saldos\n' },
    // Completar y confirmar
    { nombre: 'completar no marca la ficha para confirmar', de: '      if (estado.ficha?.id === id) estado.ficha.confirmar = true\n', a: '' },
    { nombre: 'guardar la ficha no confirma', de: '      if (f?.confirmar) return guardarYConfirmarFicha()\n', a: '' },
    { nombre: 'sin cambios no confirma', de: "        if (Object.keys(datos).length) {\n          const r = await supabase.rpc('guardar_ficha_cliente'", a: "        if (!Object.keys(datos).length) throw new Error('No cambiaste nada.')\n        {\n          const r = await supabase.rpc('guardar_ficha_cliente'" },
    { nombre: 'confirma antes de guardar', de: "        const { error } = await supabase.rpc('confirmar_cliente', { p_cliente_id: f.id })\n        if (error) throw error\n        mostrarExito('Cliente confirmado: ya no es provisorio.')", a: "        mostrarExito('Cliente confirmado: ya no es provisorio.')" },
    { nombre: 'confirmar con el nombre vacío', de: "      if (datos.nombre !== undefined && datos.nombre.length < 2) { f.error = 'El nombre no puede quedar vacío.'; pintarPieFicha(); return }\n", a: '' },
    { nombre: 'el error de confirmar se tapa', de: "        const msg = err?.message || 'No se pudo confirmar el cliente. Probá de nuevo.'", a: "        const msg = 'No se pudo confirmar el cliente. Probá de nuevo.'" },
    { nombre: 'no dice que la ficha se guardó', de: "        f.error = guardada ? 'La ficha se guardó, pero no se pudo confirmar el cliente: ' + msg : msg", a: '        f.error = msg' },
    { nombre: 'reintentar vuelve a mandar la ficha', de: '        if (guardada) f.original = { ...f.original, ...actual }\n', a: '' },
    { nombre: 'el botón no dice "Guardar y confirmar"', de: "      if (b) b.textContent = confirmar ? 'Guardar y confirmar' : 'Guardar la ficha'", a: "      if (b) b.textContent = 'Guardar la ficha'" },
    { nombre: 'la ficha común queda diciendo "Guardar y confirmar"', de: '    function pintarPieFicha() {\n      pintarConfirmarFicha()\n', a: '    function pintarPieFicha() {\n' },
    // ("Completar sin precios abre la ficha" no va: abrirFicha() ya corta sin
    //  retiros:precios, así que sacar esta guarda no cambia nada.)
    // Unir: buscador
    { nombre: 'el buscador ofrece al mismo provisorio', de: '        .filter(c => c && c.id !== origenId && c.activo !== false)', a: '        .filter(c => c && c.activo !== false)' },
    { nombre: 'el buscador ofrece apagados', de: '        .filter(c => c && c.id !== origenId && c.activo !== false)', a: '        .filter(c => c && c.id !== origenId)' },
    { nombre: 'el buscador no mira apodos', de: "          (Array.isArray(c.apodos) ? c.apodos : []).some(a => normalizar(a).includes(q)) ||\n", a: '' },
    { nombre: 'el buscador no mira el CUIT', de: "          (digitos.length >= 3 && String(c.cuit ?? '').includes(digitos)))", a: '          false)' },
    { nombre: 'Unir sin permiso abre', de: '      if (clientesEnTodas() || !puedeDarAlta(estado.empresaId)) return\n      const o = clienteDe(origenId)', a: '      const o = clienteDe(origenId)' },
    // Unir: la vista previa
    { nombre: 'sin permiso de cobranzas cuenta igual', de: "        tieneTarea('cobranzas', 'ver_todo') ? intento(() => contar('cobranzas')) : { sinPermiso: true },", a: "        intento(() => contar('cobranzas'))," },
    { nombre: 'sin permiso de pedidos cuenta igual', de: "        puedeEn('pedidos', 'ver', unidadId) ? intento(() => contar('pedidos')) : { sinPermiso: true },", a: "        intento(() => contar('pedidos'))," },
    { nombre: 'un error se toma como cero', de: "console.error('No se pudo leer para la vista previa de unir:', err); return { error: true } }", a: "console.error('No se pudo leer para la vista previa de unir:', err); return { n: 0 } }" },
    { nombre: 'cuenta por el destino y no por el provisorio', de: "        const { data, error } = await supabase.from(tabla).select('id').eq('cliente_id', origenId)", a: "        const { data, error } = await supabase.from(tabla).select('id').eq('cliente_id', estado.unir?.destinoId)" },
    { nombre: 'no dice que el provisorio queda apagado', de: "      lineas.push(origen + ' queda apagado y su nombre queda como apodo de ' + destino + '.')\n", a: '' },
    { nombre: 'no avisa los proyectos del Taller', de: "      if (pv.taller) lineas.push('Si tiene proyectos del Taller, también pasan (no se pueden contar desde acá).')\n", a: '' },
    { nombre: 'el saldo sin movimientos dice $ 0', de: "          : 'su cuenta, que está en cero')", a: "          : importeHoja(c.saldo) + ' de saldo')" },
    // Unir: confirmación y rpc
    { nombre: 'unir sin confirmar', de: '      if (!u?.destinoId || !u.confirmando || u.enviando) return\n      u.enviando = true', a: '      if (!u?.destinoId || u.enviando) return\n      u.enviando = true' },
    { nombre: 'doble toque une dos veces', de: '      if (!u?.destinoId || !u.confirmando || u.enviando) return\n      u.enviando = true', a: '      if (!u?.destinoId || !u.confirmando) return' },
    { nombre: '"No" no vuelve', de: '      if (!u || u.enviando) return\n      u.confirmando = false\n      pintarUnir()', a: '      if (!u || u.enviando) return\n      pintarUnir()' },
    { nombre: 'unir con los ids al revés', de: "{ p_origen_id: u.origenId, p_destino_id: u.destinoId }", a: "{ p_origen_id: u.destinoId, p_destino_id: u.origenId }" },
    { nombre: 'el error de unir se tapa', de: "        u.error = err?.message || 'No se pudieron unir los clientes. Probá de nuevo.'", a: "        u.error = 'No se pudieron unir los clientes. Probá de nuevo.'" },
    { nombre: 'después de un error no se puede reintentar', de: "        console.error('No se pudieron unir los clientes:', err)\n", a: "        console.error('No se pudieron unir los clientes:', err)\n        return\n" },
    { nombre: 'después de unir no se relee la lista', de: '        estado.clientes = null\n        await mostrarClientes()\n', a: '        estado.clientes = null\n' },
    { nombre: '"Elegir otro" no suelta el destino', de: '      u.turno++\n      u.destinoId = null\n', a: '      u.turno++\n' },
    // Valorizar
    { nombre: 'valorizar no avisa la lista', de: '      if (avisarFaltaLista(d, cli, listaId)) return\n', a: '' },
    { nombre: 'el aviso también para un cliente común', de: '      if (!d || cli?.provisorio !== true || listaId) return false', a: '      if (!d || listaId) return false' },
    { nombre: 'el aviso también con lista', de: '      if (!d || cli?.provisorio !== true || listaId) return false', a: '      if (!d || cli?.provisorio !== true) return false' },
    { nombre: 'el aviso no se dibuja', de: '${total}${htmlValorizar(d)}${htmlFaltaLista(d)}</div>`', a: '${total}${htmlValorizar(d)}</div>`' },
    { nombre: 'Valorizar queda visible con el aviso', de: " && !d.valorizar && !d.faltaLista)", a: ' && !d.valorizar)' },
    { nombre: 'Ir a su ficha no abre en modo confirmar', de: '      if (id) abrirCompletar(id)', a: '      if (id) abrirFicha(id)' },
  ],
})
