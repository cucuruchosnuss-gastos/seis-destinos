// Mutaciones de test-gastos-barra-unidad.js: cada una rompe UNA regla de la
// barra de unidad en Gastos y la suite tiene que ponerse en rojo. Anclas
// únicas; mutar.js aborta si alguna no lo es. De a una (ver mutar.js).
//
//   node pruebas/mut-gastos-barra-unidad.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-barra-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: [],   // los esc() los mide mut-gastos-xss.js
  manuales: [
    // La lista
    { nombre: 'la lista deja de filtrar por la unidad de la barra',
      de: '.filter(g => pasaFiltroUnidad(unidadDeGasto(g), elegida))', a: '.filter(g => true)' },
    { nombre: 'lo SIN unidad desaparece al elegir una unidad',
      de: '.filter(g => pasaFiltroUnidad(unidadDeGasto(g), elegida))', a: '.filter(g => !elegida || unidadDeGasto(g) === elegida)' },
    { nombre: 'la unidad del gasto no se lee',
      de: 'return g?.unidad_negocio_id ?? g?.unidades_negocio?.id ?? null', a: 'return null' },
    { nombre: 'lo sin unidad deja de ir marcado',
      de: `? '<span class="gasto__sin-unidad">Sin unidad</span>' : ''`, a: `? '' : ''` },
    { nombre: 'aplicarBusquedaLocal pinta todo en vez de lo visible',
      de: '      const filtrados = gastosVisibles()\n', a: '      const filtrados = estado.listaGastos\n' },
    // Las cifras
    { nombre: 'el detalle por unidad no se dibuja nunca',
      de: 'if (grupos.length < 2) return', a: 'if (grupos.length < 99) return' },
    { nombre: 'el detalle por unidad se dibuja con una sola',
      de: 'if (grupos.length < 2) return', a: 'if (grupos.length < 1) return' },
    { nombre: 'el total por unidad suma los anulados',
      de: "if ((g.moneda || 'ARS') === 'ARS' && g.estado !== 'anulado') x.total +=", a: "if ((g.moneda || 'ARS') === 'ARS') x.total +=" },
    { nombre: 'el total por unidad no cuenta los registros',
      de: '        x.registros++\n', a: '' },
    { nombre: '"Sin unidad" deja de ir última',
      de: '(a.id == null) - (b.id == null) || ', a: '' },
    { nombre: 'las cifras no llevan el detalle por unidad',
      de: 'tarjetaTotal + tarjetaRegistros + htmlTotalesPorUnidad(gastos)', a: 'tarjetaTotal + tarjetaRegistros' },
    // El Excel
    { nombre: 'el Excel exporta todo y no lo que se ve',
      de: '      const visibles = gastosVisibles()\n', a: '      const visibles = estado.listaGastos ?? []\n' },
    { nombre: 'el Excel deja la empresa vacía en lo sin unidad',
      de: "'Empresa':        g.unidades_negocio?.nombre || 'Sin unidad',", a: "'Empresa':        g.unidades_negocio?.nombre || ''," },
    // Cambiar la barra
    { nombre: 'cambiar la barra no repinta la lista',
      de: '      if (estado.listaGastos) aplicarBusquedaLocal()\n', a: '' },
    { nombre: 'cambiar la barra vuelve a consultar la base',
      de: '      if (estado.listaGastos) aplicarBusquedaLocal()\n', a: '      cargarLista()\n' },
    { nombre: 'el aviso de cambio no guarda la elección',
      de: '    alCambiarUnidad(({ elegida, unidades, mostrar }) => {\n      estado.unidadBarra = { elegida: elegida ?? null, unidades: unidades ?? [], mostrar: !!mostrar }\n',
      a: '    alCambiarUnidad(({ elegida, unidades, mostrar }) => {\n' },
    { nombre: 'el arranque no se suscribe a los cambios de la barra',
      de: '    alCambiarUnidad(({ elegida, unidades, mostrar }) => {', a: '    ;(({ elegida, unidades, mostrar }) => {' },
    // La consulta
    { nombre: 'la consulta vuelve a filtrar por unidad en SQL',
      de: "      if (estado.filtros.categoria_ids?.length)       query = query.in('categoria_id', estado.filtros.categoria_ids)",
      a: "      if (estado.unidadBarra?.elegida) query = query.eq('unidad_negocio_id', estado.unidadBarra.elegida)\n      if (estado.filtros.categoria_ids?.length)       query = query.in('categoria_id', estado.filtros.categoria_ids)" },
    { nombre: 'la consulta deja de traer unidad_negocio_id',
      de: '          proveedor_id, unidad_negocio_id,\n', a: '          proveedor_id,\n' },
    { nombre: 'cargarLista deja de pintar al llegar',
      de: '      // aplicarBusquedaLocal() con lo que se ve (unidad de la barra y buscador).\n      aplicarBusquedaLocal()\n', a: '' },
    // Facturas ingresadas sin gasto
    { nombre: 'ingresos sin gasto dejan de filtrarse por la barra',
      de: 'const filas = todas.filter(f => pasaFiltroUnidad(f.unidad_negocio_id, estado.unidadBarra?.elegida ?? null))', a: 'const filas = todas' },
    { nombre: 'ingresos sin gasto no dicen cuántas hay en otras unidades',
      de: '      lista.innerHTML = (deOtras > 0', a: '      lista.innerHTML = (false' },
    { nombre: 'ingresos sin gasto: lo sin unidad deja de ir marcado',
      de: "(estado.unidadBarra?.elegida ? 'Sin unidad' : null)", a: 'null' },
    // El wizard
    { nombre: 'el wizard no toma la unidad de la barra',
      de: '      unidadSeleccionada    = unidadDeLaBarraParaWizard()\n', a: '      unidadSeleccionada    = null\n' },
    { nombre: 'el wizard toma una unidad que la grilla no ofrece',
      de: 'return id && unidadesElegibles().some(u => u.id === id) ? id : null', a: 'return id' },
    { nombre: '"Siguiente" del destino siempre visible',
      de: 'if (b) b.hidden = !(viaVehiculos || unidadSeleccionada)', a: 'if (b) b.hidden = false' },
    { nombre: 'la grilla no actualiza el "Siguiente"',
      de: '      actualizarBotonDestinoSiguiente()\n      pintarAvisoTaller()', a: '      pintarAvisoTaller()' },
    { nombre: '"Siguiente" del destino salta la categoría',
      de: "else if (unidadSeleccionada) irASubpaso('categoria')", a: "else if (unidadSeleccionada) irASubpaso('detalles')" },
    { nombre: 'el "Siguiente" del destino no se cablea',
      de: "document.getElementById('btn-destino-siguiente').addEventListener('click', avanzarDesdeDestino)", a: '' },
    // El filtro viejo
    { nombre: 'vuelve el filtro "Unidad" de la lista',
      de: '        <div class="multiselect" id="ms-periodo">', a: '        <div class="multiselect" id="ms-unidad"></div>\n        <div class="multiselect" id="ms-periodo">' },
  ],
})
