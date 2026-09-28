// Mutaciones de test-materia-prima-barra-unidad.js. Ver mutar.js (los tres
// guards: suite verde sobre el limpio, ancla única, mutación que cambia algo).
// El escape del detalle por unidad del banner lo mutan test-/mut-materia-prima-xss.js.
//
//   node pruebas/mut-materia-prima-barra-unidad.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-barra-unidad.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: [],
  manuales: [
    // ── El selector viejo ──
    { nombre: 'vuelve el contenedor de los chips de unidad', de: '      <div class="chips-unidad" id="chips-vinculo-ingresos"></div>', a: '      <div class="chips-unidad" id="chips-unidad-ingresos"></div>\n      <div class="chips-unidad" id="chips-vinculo-ingresos"></div>' },
    { nombre: 'se deja de importar la barra', de: "    import { unidadesDeLaBarra, alCambiarUnidad, filtrarPorUnidad } from '../js/barra-unidad.js'\n", a: "    import { unidadesDeLaBarra, alCambiarUnidad } from '../js/barra-unidad.js'\n    const filtrarPorUnidad = (f) => f\n" },
    // ── El listado ──
    { nombre: 'el listado no filtra por la barra', de: '      if (elegida) filas = filtrarPorUnidad(filas, elegida, e => e.base.unidad_negocio_id)\n', a: '' },
    { nombre: 'el vacío no dice cuántos hay en otras unidades', de: "        const otras = elegida ? textoOtrasUnidades(antesDeLaUnidad - filas.length, { singular: 'ingreso', plural: 'ingresos' }) : ''", a: "        const otras = ''" },
    { nombre: 'el vacío culpa a la barra con Todas', de: "        const otras = elegida ? textoOtrasUnidades(antesDeLaUnidad - filas.length, { singular: 'ingreso', plural: 'ingresos' }) : ''", a: "        const otras = textoOtrasUnidades(estado.entregas.length - filas.length, { singular: 'ingreso', plural: 'ingresos' })" },
    { nombre: 'textoOtrasUnidades no dice nunca nada', de: "      if (!(n > 0)) return ''\n      return `Hay", a: "      if (true) return ''\n      return `Hay" },
    // ── El banner ──
    { nombre: 'el banner no filtra por la barra', de: '      const entregas = elegida ? filtrarPorUnidad(estado.entregas, elegida, e => e.base.unidad_negocio_id) : estado.entregas', a: '      const entregas = estado.entregas' },
    { nombre: 'el detalle por unidad sale sin barra', de: '      if (!elegida && estado.barra?.mostrar) {', a: '      if (!elegida) {' },
    { nombre: 'el detalle por unidad sale con una sola unidad', de: '      if (grupos.size > 1) {', a: '      if (grupos.size > 0) {' },
    { nombre: 'el detalle se ordena al revés', de: '          .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, \'es\'))', a: '          .sort((a, b) => a.n - b.n || a.nombre.localeCompare(b.nombre, \'es\'))' },
    { nombre: 'el detalle no se esconde al elegir una unidad', de: "        porUnidadEl.innerHTML = ''\n        porUnidadEl.hidden = true\n", a: "        porUnidadEl.innerHTML = ''\n" },
    // ── El aviso de stock ──
    { nombre: 'el aviso de stock no mira la unidad elegida', de: '        .filter(id => !elegida || id === elegida)', a: '        .filter(Boolean)' },
    // ── Pagado sin ingresar ──
    { nombre: '"Pagado sin ingresar" no filtra', de: '      const filas = elegida ? filtrarPorUnidad(estado.pagadoSinIngresar, elegida) : estado.pagadoSinIngresar', a: '      const filas = estado.pagadoSinIngresar' },
    { nombre: '"Pagado sin ingresar" esconde lo sin unidad', de: '      const filas = elegida ? filtrarPorUnidad(estado.pagadoSinIngresar, elegida) : estado.pagadoSinIngresar', a: '      const filas = elegida ? estado.pagadoSinIngresar.filter(f => f.unidad_negocio_id === elegida) : estado.pagadoSinIngresar' },
    { nombre: 'un gasto sin unidad no lo dice', de: "          nombreUnidad(f.unidad_negocio_id) || (f.unidad_negocio_id ? null : 'Sin unidad'),", a: '          nombreUnidad(f.unidad_negocio_id) || null,' },
    // ── Facturas por ingresar ──
    { nombre: '"Facturas por ingresar" no filtra', de: '      return elegida ? filtrarPorUnidad(filas, elegida) : filas', a: '      return filas' },
    { nombre: 'todasLasUnidades se ignora', de: '      const elegida = todasLasUnidades ? null : (estado.barra?.elegida || null)', a: '      const elegida = estado.barra?.elegida || null' },
    { nombre: 'las marcas se calculan solo sobre lo visible', de: '        marcas: marcasPorIngresar(filasPorIngresarVisibles({ todasLasUnidades: true }), estado.listaIngresos),', a: '        marcas: marcasPorIngresar(filas, estado.listaIngresos),' },
    { nombre: 'una factura sin unidad no lo dice', de: "          f.unidad || (f.unidad_negocio_id ? null : 'Sin unidad'),", a: '          f.unidad || null,' },
    // ── Ingresos internos ──
    { nombre: '"Ingresos internos" no filtra', de: '      const transito = elegida ? filtrarPorUnidad(estado.transito, elegida, x => x.unidad_destino_id) : estado.transito', a: '      const transito = estado.transito' },
    { nombre: '"Ingresos internos" filtra por el origen', de: 'filtrarPorUnidad(estado.transito, elegida, x => x.unidad_destino_id)', a: 'filtrarPorUnidad(estado.transito, elegida, x => x.unidad_origen_id)' },
    { nombre: 'se agrupa aunque se mire una sola unidad', de: '      const agrupar = !elegida && estado.unidadesRecepcion.length > 1', a: '      const agrupar = estado.unidadesRecepcion.length > 1' },
    { nombre: 'el vacío de internos no dice lo de otras unidades', de: '        const otras = elegida ? estado.transito.length : 0', a: '        const otras = 0' },
    // ── La burbuja ──
    { nombre: 'la burbuja no dice que cuenta todas las unidades', de: "      const notaTodas = estado.barra?.elegida ? '(en todas tus unidades)' : ''", a: "      const notaTodas = ''" },
    { nombre: 'htmlBurbujaMp ignora la nota', de: '      const detalle = nota ? `${textoPendienteMp(p)} ${nota}` : textoPendienteMp(p)', a: '      const detalle = textoPendienteMp(p)' },
    // ── Repintar al cambiar ──
    { nombre: 'cambiar la barra no repinta', de: '      if (cambio && estado.listadoCargado) repintarPorUnidad()', a: '      if (false) repintarPorUnidad()' },
    { nombre: 'se repinta antes de tener el listado', de: '      if (cambio && estado.listadoCargado) repintarPorUnidad()', a: '      if (cambio) repintarPorUnidad()' },
    { nombre: 'se repinta aunque la elección sea la misma', de: '      if (cambio && estado.listadoCargado) repintarPorUnidad()', a: '      if (estado.listadoCargado) repintarPorUnidad()' },
    { nombre: 'repintar no redibuja el listado', de: '      renderizarAvisoSinStock()\n      renderizarListaIngresos()\n      renderizarPagadoSinIngresar()', a: '      renderizarAvisoSinStock()\n      renderizarPagadoSinIngresar()' },
    { nombre: 'repintar no redibuja el banner', de: '    function repintarPorUnidad() {\n      renderizarBannerIngresos()\n', a: '    function repintarPorUnidad() {\n' },
    { nombre: 'repintar no redibuja "Pagado sin ingresar"', de: '      renderizarListaIngresos()\n      renderizarPagadoSinIngresar()\n      renderizarAccesoPorIngresar()', a: '      renderizarListaIngresos()\n      renderizarAccesoPorIngresar()' },
    { nombre: 'la elección se guarda sin normalizar', de: '        elegida: e?.elegida || null,', a: '        elegida: e?.elegida,' },
    // ── El wizard ──
    { nombre: 'el wizard no mira si puede cargar ahí', de: ' && puedeCargarEn(deLaBarra)) {', a: ') {' },
    { nombre: 'el wizard no mira si la unidad se ofrece', de: 'elegibles.some(u => u.id === deLaBarra) && ', a: '' },
    { nombre: 'el wizard ignora la barra', de: '          estado.wizard.encabezado.unidadId = deLaBarra\n', a: '' },
    { nombre: 'puedeCargarEn ignora {todas: true}', de: '      return a.todas === true || (Array.isArray(a.unidades) && a.unidades.includes(unidadId))', a: '      return Array.isArray(a.unidades) && a.unidades.includes(unidadId)' },
    { nombre: 'puedeCargarEn ignora super_admin', de: "      if (estado.miRolApp === 'super_admin') return true\n      const a = estado.alcances", a: '      const a = estado.alcances' },
    { nombre: 'puedeCargarEn mira otra tarea', de: "estado.alcances?.get('materia_prima:cargar')", a: "estado.alcances?.get('materia_prima:ver_todo')" },
    { nombre: 'puedeCargarEn con alcance null habilita', de: "      if (!a || typeof a !== 'object') return false\n      return a.todas", a: "      if (!a || typeof a !== 'object') return true\n      return a.todas" },
    // ── El init ──
    { nombre: 'las tareas no traen el alcance', de: ".select('modulo, tarea, alcance')", a: ".select('modulo, tarea')" },
    { nombre: 'init no escucha los cambios de la barra', de: '      alCambiarUnidad(aplicarBarraUnidad)\n', a: '' },
    { nombre: 'init no espera la barra antes del listado', de: '      await Promise.race([barraPrometida.catch(() => null), new Promise(r => setTimeout(r, 3000))])\n', a: '' },
    { nombre: 'cargarIngresos no marca el listado como cargado', de: '      estado.listadoCargado = true\n', a: '' },
  ],
})
