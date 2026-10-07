// Mutaciones de test-retiros-cliente-nuevo.js (el cliente nuevo de la Carga
// de órdenes de retiro, 06/10/2026). Ver mutar.js.
//
//   node pruebas/mut-retiros-cliente-nuevo.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-retiros-cliente-nuevo.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/retiros.html'),
  escape: 'esc',
  funciones: ['htmlBotonClienteNuevo', 'htmlClienteNuevo'],
  manuales: [
    // El nombre obligatorio
    { nombre: 'sin nombre se sigue igual', de: "      if (limpio(n.nombre).length < LARGO_MINIMO_NOMBRE_CLIENTE) { n.error = TEXTO_NOMBRE_CORTO; pintarClienteNuevo(); return }\n", a: '' },
    { nombre: 'el mínimo pasa a 2 letras', de: '    const LARGO_MINIMO_NOMBRE_CLIENTE = 3', a: '    const LARGO_MINIMO_NOMBRE_CLIENTE = 2' },
    { nombre: 'crear no revisa el nombre', de: "      if (p.p_nombre.length < LARGO_MINIMO_NOMBRE_CLIENTE) { n.paso = 'datos'; n.error = TEXTO_NOMBRE_CORTO; pintarClienteNuevo(); return }\n", a: '' },
    // Primero los parecidos
    { nombre: 'crear sin pasar por los parecidos', de: "      if (!n || !f || n.form !== f || n.paso !== 'parecidos' || n.buscando || n.enviando || !estado.empresaId) return", a: "      if (!n || !f || n.form !== f || n.buscando || n.enviando || !estado.empresaId) return" },
    { nombre: 'crear mientras se buscan los parecidos', de: "      if (!n || !f || n.form !== f || n.paso !== 'parecidos' || n.buscando || n.enviando || !estado.empresaId) return", a: "      if (!n || !f || n.form !== f || n.paso !== 'parecidos' || n.enviando || !estado.empresaId) return" },
    { nombre: 'el botón no se apaga mientras busca', de: "id=\"rt-nuevo-crear\"${n.buscando || n.enviando ? ' disabled' : ''}>", a: "id=\"rt-nuevo-crear\"${n.enviando ? ' disabled' : ''}>" },
    { nombre: 'nunca le pregunta a la base', de: '      n.buscando = buscarClientesEnLaBase()\n', a: '      n.buscando = false\n' },
    { nombre: 'le pregunta a la base sin permiso', de: '      n.buscando = buscarClientesEnLaBase()\n', a: '      n.buscando = true\n' },
    { nombre: 'la búsqueda local no mira las palabras', de: "      const palabras = normalizar(nombre).split(' ').filter(p => p.length >= 4)", a: '      const palabras = []' },
    { nombre: 'la búsqueda local no mira los apodos', de: "        ? todos.filter(c => [c.nombre, c.razon_social, ...(Array.isArray(c.apodos) ? c.apodos : [])].some(t => palabras.some(p => normalizar(t).includes(p))))", a: '        ? todos.filter(c => [c.nombre, c.razon_social].some(t => palabras.some(p => normalizar(t).includes(p))))' },
    { nombre: 'sin permiso no se recuerda', de: '        if (data === null) estado.buscarClientesSinPermiso = true\n', a: '        if (data === null) {}\n' },
    { nombre: 'trae clientes de otra empresa', de: '            .filter(x => x && x.activo !== false && (x.unidad_negocio_id == null || x.unidad_negocio_id === empresaId))', a: '            .filter(x => x && x.activo !== false)' },
    { nombre: 'trae clientes apagados', de: '            .filter(x => x && x.activo !== false && (x.unidad_negocio_id == null || x.unidad_negocio_id === empresaId))', a: '            .filter(x => x && (x.unidad_negocio_id == null || x.unidad_negocio_id === empresaId))' },
    { nombre: 'el apodo de la base se pierde', de: '              coincide: x.apodo_coincide ?? null, empresa: x.empresa,', a: '              coincide: null, empresa: x.empresa,' },
    { nombre: 'la búsqueda no termina', de: '      if (parecidos) n.parecidos = parecidos\n      n.buscando = false\n', a: '      if (parecidos) n.parecidos = parecidos\n' },
    { nombre: 'un error de la base tapa los locales', de: "        console.error('No se pudieron buscar los parecidos en la base (quedan los de la lista local):', err)\n", a: "        console.error('No se pudieron buscar los parecidos en la base (quedan los de la lista local):', err)\n        parecidos = []\n" },
    // Elegir un parecido
    { nombre: 'elegir un parecido de la base no lo suma', de: '      if (!clienteDe(id)) {\n        const c = { razon_social: null', a: '      if (false) {\n        const c = { razon_social: null' },
    // ("elegir un parecido deja el panel abierto" no va: elegirCliente → pintarClienteNuevo ya lo
    //  cierra porque el formulario tiene cliente; esa guarda la mide "otra orden conserva el panel".)
    // Crear
    { nombre: 'doble toque manda dos veces', de: "      n.enviando = true\n      n.error = null\n      pintarClienteNuevo()\n      try {\n        const { data, error } = await supabase.rpc('crear_cliente_provisorio', p)", a: "      n.error = null\n      pintarClienteNuevo()\n      try {\n        const { data, error } = await supabase.rpc('crear_cliente_provisorio', p)" },
    { nombre: 'el teléfono pierde los espacios', de: '        p_telefono: limpio(n?.telefono) || null,', a: "        p_telefono: String(n?.telefono ?? '').replace(/\\D/g, '') || null," },
    { nombre: 'la localidad vacía va como texto', de: '        p_localidad: limpio(n?.localidad) || null,', a: '        p_localidad: limpio(n?.localidad),' },
    { nombre: 'el nombre sin limpiar', de: '        p_nombre: limpio(n?.nombre),', a: "        p_nombre: String(n?.nombre ?? '')," },
    { nombre: 'la orden no queda con el cliente nuevo', de: '        if (estado.form === f) elegirCliente(data)\n', a: '' },
    { nombre: 'el cliente nuevo no se marca provisorio', de: "email: null, transporte_habitual: null, activo: true, provisorio: true }", a: "email: null, transporte_habitual: null, activo: true }" },
    { nombre: 'una respuesta vacía se toma como buena', de: "        if (!data) throw new Error('La base no devolvió el cliente nuevo. Buscalo en la lista antes de cargarlo de nuevo.')\n", a: '' },
    { nombre: 'el error de la base se tapa', de: "        n.error = err?.message || 'No se pudo cargar el cliente nuevo. Probá de nuevo.'", a: "        n.error = 'No se pudo cargar el cliente nuevo. Probá de nuevo.'" },
    { nombre: 'después de un error no se puede reintentar', de: '        console.error(\'No se pudo cargar el cliente nuevo:\', err)\n        n.enviando = false\n', a: '        console.error(\'No se pudo cargar el cliente nuevo:\', err)\n' },
    // El panel
    { nombre: 'el botón aparece sin búsqueda', de: "      if (!f || f.clienteId || !limpio(f.clienteBusqueda)) return ''", a: "      if (!f || f.clienteId) return ''" },
    { nombre: 'el botón aparece con el cliente elegido', de: "      if (!f || f.clienteId || !limpio(f.clienteBusqueda)) return ''", a: "      if (!f || !limpio(f.clienteBusqueda)) return ''" },
    { nombre: 'la lista se ve con el panel abierto', de: "      const conNuevo = !!estado.nuevoCliente\n", a: '      const conNuevo = false\n' },
    { nombre: 'escribir en el buscador no cierra el panel', de: '      if (estado.nuevoCliente) estado.nuevoCliente = null\n      pintarClienteNuevo()\n', a: '      pintarClienteNuevo()\n' },
    { nombre: 'otra orden conserva el panel', de: '      if (estado.nuevoCliente && (estado.nuevoCliente.form !== f || f?.clienteId)) estado.nuevoCliente = null\n', a: '' },
    { nombre: 'cambiar de empresa conserva el panel', de: '        estado.buscarClientes = null\n        estado.nuevoCliente = null\n', a: '        estado.buscarClientes = null\n' },
    { nombre: 'los campos no muestran lo escrito', de: "          if (i) i.value = n[k] ?? ''", a: "          if (i) i.value = ''" },
    { nombre: 'el chip Provisorio no aparece', de: "        `${c?.provisorio === true ? '<span class=\"rt-sello rt-sello--provisorio\"", a: "        `${false ? '<span class=\"rt-sello rt-sello--provisorio\"" },
    { nombre: 'el teléfono como número', de: '<input type="tel" class="rt-input" id="rt-nuevo-telefono" inputmode="tel"', a: '<input type="text" class="rt-input" id="rt-nuevo-telefono" inputmode="numeric"' },
  ],
})
