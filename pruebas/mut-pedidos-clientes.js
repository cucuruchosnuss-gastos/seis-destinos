// Mutaciones de test-pedidos-clientes.js (Parte 2 de Pedidos). Ver mutar.js.
//
//   node pruebas/mut-pedidos-clientes.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html y
// dan "ESCAPÓ" falsos.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-pedidos-clientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/pedidos.html'),
  escape: 'esc',
  funciones: ['htmlChipsApodos', 'htmlFilaCliente', 'htmlListaClientes', 'htmlApodosForm'],
  equivalentes: [
    { expr: 'esc(estado.errorClientes)', motivo: 'texto constante del código: mostrarClientes() lo pone siempre igual' },
  ],
  manuales: [
    { nombre: 'el buscador no mira los apodos', de: "      return todos.filter(c => normalizar(c.nombre).includes(q) ||\n        (Array.isArray(c.apodos) ? c.apodos : []).some(a => normalizar(a).includes(q)))", a: '      return todos.filter(c => normalizar(c.nombre).includes(q))' },
    { nombre: 'normalizar no saca acentos', de: ".normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim()", a: ".toLowerCase().replace(/\\s+/g, ' ').trim()" },
    { nombre: 'un apodo repetido se agrega igual', de: "      if (lista.some(a => normalizar(a) === normalizar(t))) return { apodos: lista, error: `«${t}» ya está en la lista.` }\n", a: '' },
    { nombre: 'un apodo vacío se agrega', de: "      if (!t) return { apodos: lista, error: 'Escribí el apodo antes de agregarlo.' }\n", a: '' },
    { nombre: 'agregar pisa la lista en vez de sumar', de: '      return { apodos: [...lista, t], error: null }', a: '      return { apodos: [t], error: null }' },
    { nombre: 'quitar saca el equivocado', de: '      return (Array.isArray(apodos) ? apodos : []).filter((_, k) => k !== i)', a: '      return (Array.isArray(apodos) ? apodos : []).filter((_, k) => k !== i + 1)' },
    { nombre: 'los apodos viajan como texto con comas', de: "        p_apodos: [...(form.apodos ?? [])],", a: "        p_apodos: (form.apodos ?? []).join(', ')," },
    { nombre: 'el teléfono se recorta como número', de: "        p_telefono: limpio(form.telefono) || null,", a: "        p_telefono: limpio(form.telefono).replace(/\\D/g, '') || null," },
    { nombre: 'un vacío viaja como ""', de: "        p_localidad: limpio(form.localidad) || null,", a: "        p_localidad: limpio(form.localidad)," },
    { nombre: 'activo siempre true', de: '        p_activo: form.activo !== false,', a: '        p_activo: true,' },
    { nombre: 'el apodo escrito no se agrega al guardar', de: '      if (limpio(f.apodoNuevo)) {\n        const r = agregarApodo(f.apodos, f.apodoNuevo)', a: '      if (false) {\n        const r = agregarApodo(f.apodos, f.apodoNuevo)' },
    { nombre: 'guarda sin nombre', de: "      f.error = f.unidadId ? faltanCliente(f) : 'Elegí de qué unidad es el cliente.'\n      if (f.error) { pintarFormCliente(false); return }", a: '      f.error = null' },
    { nombre: 'el error de la base se tapa', de: "        f.error = err?.message || 'No se pudo guardar el cliente. Probá de nuevo.'", a: "        f.error = 'No se pudo guardar el cliente. Probá de nuevo.'" },
    { nombre: 'el botón queda trabado después de un error', de: '        estado.guardandoCliente = false\n        pintarFormCliente(false)\n      }', a: '        pintarFormCliente(false)\n      }' },
    { nombre: 'Clientes se ve sin configurar', de: "      document.getElementById('pe-btn-clientes').hidden = !puedeEnAlguna('configurar')", a: "      document.getElementById('pe-btn-clientes').hidden = !puedeEnAlguna('ver')" },
    { nombre: 'mostrarClientes sin gate', de: "      const unidades = unidadesVistasCon('configurar')\n      if (!unidades.length) { mostrarInicio(); return }\n      mostrarVista('pe-vista-clientes')", a: "      const unidades = unidadesVistasCon('configurar')\n      mostrarVista('pe-vista-clientes')" },
    { nombre: 'abrirCliente sin gate', de: "      if (!unidades.length) return\n      const c = id ? (estado.clientes", a: '      const c = id ? (estado.clientes' },
    { nombre: 'unidadesCon: todas:true no da todas', de: '      if (alcance && alcance.todas === true) return activas\n', a: '' },
    { nombre: 'unidadesCon: sin bypass de super_admin', de: "      if (estado.miRolApp === 'super_admin') return activas\n", a: '' },
    { nombre: 'los clientes no se filtran por unidad', de: ".eq('unidad_negocio_id', unidadId).order('nombre')", a: ".order('nombre')" },
    { nombre: 'la lista no trae los apodos', de: ".select('id, nombre, apodos, localidad, telefono, observaciones, activo, unidad_negocio_id')", a: ".select('id, nombre, localidad, telefono, observaciones, activo, unidad_negocio_id')" },
    // Las tres mutaciones del segmento de unidades propio (se dibuja con una
    // sola, no recuerda la elegida, no olvida los clientes) se fueron con el
    // segmento (28/09/2026): lo reemplazó la barra de unidad de arriba, y lo
    // que queda de la unidad se muta en mut-pedidos-barra-unidad.js.
    { nombre: 'un inactivo no se marca', de: "${c.activo === false ? '<span class=\"pe-marca-inactivo\">Inactivo</span>' : ''}", a: '' },
    { nombre: 'sin la ayuda de los apodos', de: 'Cómo lo nombran en los mensajes, para reconocerlo después.', a: 'Apodos del cliente.' },
    { nombre: 'permisos sin filtrar habilitado', de: ".eq('modulo', 'pedidos').eq('habilitado', true)", a: ".eq('modulo', 'pedidos')" },
  ],
})
