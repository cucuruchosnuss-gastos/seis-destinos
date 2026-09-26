// Mutaciones de test-administracion-clientes.js. Ver mutar.js.
//
//   node pruebas/mut-administracion-clientes.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-clientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlFilaCliente', 'htmlListaClientes', 'htmlCuenta', 'htmlOpcionesListas', 'htmlProveedorElegido', 'htmlResultadosProveedores'],
  equivalentes: [
    { expr: 'esc(c.cliente_id)', motivo: 'el id de un cliente va a un data-cliente entre comillas (uuid de la base)' },
    { expr: 'esc(importeHoja(c.saldo))', motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(estado.errorSaldos)', motivo: 'texto constante del código: lo pone mostrarClientes()' },
    { expr: 'esc(c.error)', motivo: 'texto constante del código: lo pone abrirCliente()' },
    { expr: 'esc(importeHoja(saldo))', motivo: 'un importe formateado por importeHoja()' },
    { expr: "esc('Límite de crédito ' + importeHoja(limite))", motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(importeHoja(m.importe))', motivo: 'un importe formateado por importeHoja()' },
    { expr: "esc('saldo ' + importeHoja(m.saldo))", motivo: 'un importe formateado por importeHoja()' },
    { expr: 'esc(l.id)', motivo: 'el id de una lista va al value de un <option> entre comillas (uuid de la base)' },
    { expr: 'esc(p.id)', motivo: 'el id de un proveedor va a un data-proveedor entre comillas (uuid de la base)' },
  ],
  manuales: [
    { nombre: 'la sección Clientes sin permiso', de: "      { id: 'clientes', titulo: 'Clientes', permiso: ['retiros', 'ver'] },", a: "      { id: 'clientes', titulo: 'Clientes', permiso: ['retiros', 'cargar'] }," },
    // El límite
    { nombre: 'igual al límite lo pasa', de: '      return Number(saldo) > Number(limite)\n    }', a: '      return Number(saldo) >= Number(limite)\n    }' },
    { nombre: 'sin límite cuenta como que lo pasa', de: "      if (saldo === null || saldo === undefined || limite === null || limite === undefined || limite === '') return false\n      return Number(saldo) > Number(limite)", a: '      return Number(saldo) > Number(limite)' },
    { nombre: 'la portada no cuenta los que pasan el límite', de: '      return saldos.filter(x => pasaLimite(x.saldo, limiteDe(x.cliente_id))).length', a: '      return 0' },
    { nombre: 'el que pasa no va en bordó', de: "${pasa ? ' ad-fila--atencion' : ''}\" data-cliente=", a: '" data-cliente=' },
    { nombre: 'sin el chip de proveedor', de: "${c.es_tambien_proveedor ? '<span class=\"ad-sello ad-sello--proveedor\">También proveedor</span>' : ''}", a: '' },
    // Búsqueda
    { nombre: 'no busca por CUIT', de: '        (digitos.length >= 3 && String(c.cuit ?? \'\').includes(digitos)))\n    }\n\n    function htmlFilaCliente', a: '        false)\n    }\n\n    function htmlFilaCliente' },
    { nombre: 'no busca por razón social', de: '      return todos.filter(c => normalizar(c.nombre).includes(q) || normalizar(c.razon_social).includes(q) ||', a: '      return todos.filter(c => normalizar(c.nombre).includes(q) ||' },
    // La cuenta
    { nombre: 'el detalle con el número pelado', de: "      return 'Orden de retiro ' + (codigo || '(sin código)') + resto", a: '      return base' },
    { nombre: 'se pierde el resto del detalle', de: "      return 'Orden de retiro ' + (codigo || '(sin código)') + resto", a: "      return 'Orden de retiro ' + (codigo || '(sin código)')" },
    { nombre: 'los códigos no se leen', de: "        const r = await supabase.from('ordenes_retiro').select('id, codigo').in('id', ids)\n        if (!r.error) for (const o of r.data ?? []) codigos.set(o.id, o.codigo)", a: '' },
    { nombre: 'el más viejo arriba', de: '      const filas = [...c.cuenta].reverse().map(m =>', a: '      const filas = [...c.cuenta].map(m =>' },
    { nombre: 'saldo inicial dos veces', de: "      document.getElementById('ad-btn-saldo-inicial').hidden = !(precios && c.cuenta && !tieneSaldoInicial(c.cuenta))", a: "      document.getElementById('ad-btn-saldo-inicial').hidden = !(precios && c.cuenta)" },
    { nombre: 'el panel del saldo inicial se abre igual', de: "      if (panel === 'saldo' && tieneSaldoInicial(c.cuenta)) return\n", a: '' },
    { nombre: 'ver alcanza para la ficha', de: "      const precios = puedeEn('retiros', 'precios')\n      document.getElementById('ad-btn-ficha')", a: "      const precios = puedeEn('retiros', 'ver')\n      document.getElementById('ad-btn-ficha')" },
    // Saldo inicial y ajuste
    { nombre: 'el saldo inicial sin negativos', de: "        enlazarCampoNumero(document.getElementById('ad-saldo-importe'), { decimales: DECIMALES_PRECIO, negativos: true })", a: "        enlazarCampoNumero(document.getElementById('ad-saldo-importe'), { decimales: DECIMALES_PRECIO })" },
    { nombre: 'un importe cero se manda', de: "        if (importe === null || importe === 0) { c.errorPanel = 'Escribí el importe (distinto de cero).'; pintarCliente(); return }\n        if (!esFechaIso(fecha))", a: '        if (!esFechaIso(fecha))' },
    { nombre: 'un ajuste sin motivo se manda', de: "        if (motivo.length < LARGO_MINIMO_MOTIVO) { c.errorPanel = 'Un ajuste lleva motivo.'; pintarCliente(); return }\n", a: '' },
    { nombre: 'el error del panel se tapa', de: "        c.errorPanel = err?.message || 'No se pudo guardar. Probá de nuevo.'", a: "        c.errorPanel = 'No se pudo guardar. Probá de nuevo.'" },
    { nombre: 'la observación del saldo sin limpiar', de: "p_observacion: limpio(document.getElementById('ad-saldo-obs').value) || null }", a: "p_observacion: document.getElementById('ad-saldo-obs').value }" },
    // La ficha
    { nombre: 'la ficha manda todo', de: '        if (a !== valorComparable(tipo, original[clave])) datos[clave] = a', a: '        datos[clave] = a' },
    { nombre: 'la ficha no manda el proveedor', de: "      if ((actual.proveedor_id ?? '') !== (original.proveedor_id ?? '')) datos.proveedor_id = actual.proveedor_id ?? ''\n", a: '' },
    { nombre: 'borrar un dato manda null', de: '        if (a !== valorComparable(tipo, original[clave])) datos[clave] = a', a: '        if (a !== valorComparable(tipo, original[clave])) datos[clave] = a || null' },
    { nombre: 'los espacios cuentan como cambio', de: '      return limpio(v)\n    }\n\n    // LO QUE SE MANDA', a: "      return String(v ?? '')\n    }\n\n    // LO QUE SE MANDA" },
    { nombre: 'sin cambios se llama igual', de: "      if (!Object.keys(datos).length) { f.error = 'No cambiaste nada.'; pintarPieFicha(); return }\n", a: '' },
    { nombre: 'el nombre vacío se manda', de: "      if ('nombre' in datos && datos.nombre.length < 2) { f.error = 'El nombre no puede quedar vacío.'; pintarPieFicha(); return }\n", a: '' },
    { nombre: 'el error de la ficha se tapa', de: "        f.error = err?.message || 'No se pudo guardar la ficha. Probá de nuevo.'", a: "        f.error = 'No se pudo guardar la ficha. Probá de nuevo.'" },
    { nombre: 'se elige un proveedor que no está', de: "      if (!f || (id && !(estado.proveedores ?? []).some(p => p.id === id))) return", a: '      if (!f) return' },
    { nombre: 'la ficha se abre sin precios', de: "    async function abrirFicha(clienteId) {\n      if (!puedeEn('retiros', 'precios')) return", a: '    async function abrirFicha(clienteId) {' },
    { nombre: 'el proveedor no busca por CUIT', de: "        (digitos.length >= 3 && String(p.cuit ?? '').includes(digitos))).slice(0, 8)", a: '        false).slice(0, 8)' },
    // El alta
    { nombre: 'el alta sin permiso', de: "      if (!puedeDarAlta()) return\n      estado.alta = { error: null }", a: '      estado.alta = { error: null }' },
    { nombre: 'el alta solo con pedidos:configurar', de: "      return puedeEn('pedidos', 'configurar', unidadId) || puedeEn('retiros', 'precios', unidadId)", a: "      return puedeEn('pedidos', 'configurar', unidadId)" },
    { nombre: 'el alta sin alcance', de: "      return puedeEn('pedidos', 'configurar', unidadId) || puedeEn('retiros', 'precios', unidadId)", a: "      return tieneTarea('pedidos', 'configurar') || tieneTarea('retiros', 'precios')" },
    { nombre: 'el aviso viejo del alta se muestra', de: "      document.getElementById('ad-clientes-alta-aviso').hidden = true", a: "      document.getElementById('ad-clientes-alta-aviso').hidden = false" },
    { nombre: 'el alta sin nombre se manda', de: "      if (p.p_nombre.length < 2) { estado.alta.error = 'Poné el nombre del cliente.'; pintarClientes(); return }\n", a: '' },
    { nombre: 'el alta no abre la ficha', de: '        if (data) await abrirFicha(data)', a: '' },
  ],
})
