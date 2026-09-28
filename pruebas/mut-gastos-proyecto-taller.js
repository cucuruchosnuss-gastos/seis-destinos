// Mutaciones de test-gastos-proyecto-taller.js: cada una rompe UNA regla del
// proyecto en un gasto del Taller y la suite tiene que ponerse en rojo. Anclas
// únicas; mutar.js aborta si alguna no lo es. De a una (ver mutar.js).
//
//   node pruebas/mut-gastos-proyecto-taller.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-proyecto-taller.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: [],   // los esc() los mide mut-gastos-xss.js
  manuales: [
    // Qué se ofrece
    { nombre: 'se ofrecen los proyectos cerrados',
      de: '!ESTADOS_PROYECTO_CERRADOS.includes(p.estado)', a: 'true' },
    { nombre: 'los cancelados dejan de contar como cerrados',
      de: "const ESTADOS_PROYECTO_CERRADOS = ['entregado', 'cancelado']", a: "const ESTADOS_PROYECTO_CERRADOS = ['entregado']" },
    { nombre: 'se ofrecen los dados de baja',
      de: 'p && p.activo === true && !ESTADOS', a: 'p && !ESTADOS' },
    { nombre: 'el select del wizard pierde "Gasto general del taller"',
      de: "        `<option value=\"${esc(VALOR_GASTO_GENERAL)}\">${esc(TEXTO_GASTO_GENERAL)}</option>` +\n", a: '' },
    { nombre: 'el select del wizard arranca en "Gasto general" (se saltearía la pregunta)',
      de: "sel.value = sigue ? valorElegido : ''", a: 'sel.value = sigue ? valorElegido : VALOR_GASTO_GENERAL' },
    // La validación
    { nombre: 'el proyecto deja de ser obligatorio en el Taller',
      de: "if (esUnidadTaller(unidadSeleccionada) && !document.getElementById('campo-proyecto')?.value) {", a: 'if (false) {' },
    { nombre: 'el proyecto se exige en cualquier unidad',
      de: "if (esUnidadTaller(unidadSeleccionada) && !document.getElementById('campo-proyecto')?.value) {", a: "if (!document.getElementById('campo-proyecto')?.value) {" },
    { nombre: 'el error del proyecto va como cartel suelto y no pegado',
      de: "          mostrarErrorProyecto('Elegí el proyecto de este gasto,", a: "          mostrarError('Elegí el proyecto de este gasto," },
    { nombre: 'el foco no va al campo del proyecto',
      de: "          document.getElementById('campo-proyecto')?.focus?.()\n", a: '' },
    { nombre: 'el campo no queda marcado con el error',
      de: "?.classList?.toggle('campo--con-error', !!texto)", a: "?.classList?.toggle('campo--con-error', false)" },
    { nombre: 'la ayuda no se esconde con el error a la vista',
      de: '      if (ayuda) ayuda.hidden = !!texto\n', a: '' },
    // Lo que se guarda
    { nombre: '"Gasto general" viaja como "__general__"',
      de: 'return !valor || valor === VALOR_GASTO_GENERAL ? null : valor', a: 'return !valor ? null : valor' },
    { nombre: 'el proyecto se guarda también fuera del Taller',
      de: '      if (!esUnidadTaller(unidadSeleccionada)) return null\n      return valorAProyectoId(', a: '      return valorAProyectoId(' },
    { nombre: 'armarGasto lee el select crudo',
      de: '        proyecto_id:       proyectoIdDeWizard(),', a: "        proyecto_id:       document.getElementById('campo-proyecto')?.value || null," },
    { nombre: 'armarFacturaPendiente lee el select crudo',
      de: '        proyecto_id:        proyectoIdDeWizard(),', a: "        proyecto_id:        document.getElementById('campo-proyecto')?.value || null," },
    { nombre: 'el Taller solo se reconoce por el prefijo',
      de: "return u.prefijo === 'T' || String(u.nombre || '').trim().toLowerCase() === 'taller'", a: "return u.prefijo === 'T'" },
    { nombre: 'el resumen no dice "Gasto general del taller"',
      de: 'return esUnidadTaller(unidadSeleccionada) ? { nombre: TEXTO_GASTO_GENERAL } : null', a: 'return null' },
    { nombre: 'el grupo del proyecto se ve en cualquier unidad',
      de: "if (grupo) grupo.style.display = taller ? 'block' : 'none'", a: "if (grupo) grupo.style.display = 'block'" },
    // Actualizar la lista
    { nombre: 'actualizar pide select(*) (daría permission denied)',
      de: ".from('proyectos').select(COLUMNAS_PROYECTO).eq('activo', true).order('nombre')\n        if (error) throw error",
      a: ".from('proyectos').select('*').eq('activo', true).order('nombre')\n        if (error) throw error" },
    { nombre: 'COLUMNAS_PROYECTO pide una columna que authenticated no puede leer',
      de: "const COLUMNAS_PROYECTO = 'id, nombre, activo, estado'", a: "const COLUMNAS_PROYECTO = 'id, nombre, activo, estado, precio_venta'" },
    { nombre: 'actualizar pierde lo elegido',
      de: '        poblarSelectProyecto(valor)\n        if (valor &&', a: '        poblarSelectProyecto()\n        if (valor &&' },
    { nombre: 'actualizar no avisa que lo elegido se cerró',
      de: "          mostrarErrorProyecto('El proyecto que habías elegido ya no está abierto: elegí otro.')", a: "          mostrarErrorProyecto('')" },
    { nombre: 'actualizar con error muestra el mensaje crudo de la base',
      de: "mostrarErrorProyecto('No se pudo actualizar la lista de proyectos. Probá de nuevo.')", a: 'mostrarErrorProyecto(e.message)' },
    { nombre: 'actualizar con error borra la lista cargada',
      de: "        console.error('[proyectos] no se pudo actualizar la lista:', e)\n", a: "        console.error('[proyectos] no se pudo actualizar la lista:', e)\n        estado.maestros.proyectos = []\n" },
    { nombre: 'el botón "Actualizar la lista" queda deshabilitado',
      de: '        if (boton) boton.disabled = false\n', a: '' },
    { nombre: '"Actualizar la lista" no se cablea',
      de: "document.getElementById('btn-actualizar-proyectos').addEventListener('click', recargarProyectosWizard)", a: '' },
    // La edición
    { nombre: 'la edición del Taller sin proyecto no abre en "Gasto general"',
      de: "${actualId ? '' : 'selected'}", a: "${actualId ? '' : ''}" },
    { nombre: 'la edición pierde el proyecto cerrado del gasto',
      de: 'if (proyectoActual?.id && !activos.some(p => p.id === proyectoActual.id)) {', a: 'if (false) {' },
    { nombre: 'la edición no dice "(cancelado)"',
      de: "          : proyectoActual.estado === 'cancelado' ? 'cancelado'\n", a: '' },
    { nombre: 'la edición del Taller vuelve a tener "Ninguno"',
      de: "        : '<option value=\"\">— Ninguno —</option>'", a: "        : ''" },
    { nombre: 'guardar la edición manda "__general__"',
      de: "proyecto_id:       valorAProyectoId(document.getElementById('edit-proyecto').value),", a: "proyecto_id:       document.getElementById('edit-proyecto').value || null," },
    // Detalle y Excel
    { nombre: 'el detalle y el Excel dejan vacío el gasto general del taller',
      de: 'return esUnidadTaller(unidadDeGasto(g)) ? TEXTO_GASTO_GENERAL : null', a: 'return null' },
    // El link
    { nombre: 'el link a Proyectos Taller pierde el noopener',
      de: 'target="_blank" rel="noopener"', a: 'target="_blank"' },
  ],
})
