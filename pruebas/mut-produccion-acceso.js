// Mutaciones de test-produccion-acceso.js (B1 de Producción; desde el
// 25/09/2026, quién entra a la planta y quién a la gestión). Ver mutar.js y
// mutar-produccion.js.
//
//   node pruebas/mut-produccion-acceso.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-acceso.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'super_admin sin bypass', de: "return estado.miRolApp === 'super_admin' || estado.misTareas.has(tarea)", a: 'return estado.misTareas.has(tarea)', archivo: 'gestion' },
    { nombre: 'todas:true no da todas', de: '      if (alcance && alcance.todas === true) return activas\n', a: '' },
    { nombre: 'la lista no se cruza con las activas', de: '      return activas.filter(id => lista.includes(id))', a: '      return lista' },
    // (Sacar el `if (!estado.misTareas.has(tarea)) return []` es EQUIVALENTE:
    // sin la tarea el alcance es undefined y la lista sale vacía igual.)
    { nombre: 'super_admin sin todas las unidades', de: "      if (estado.miRolApp === 'super_admin') return activas\n", a: '' },
    { nombre: 'lee tareas sin filtrar habilitado', de: ".eq('empleado_id', emp.id).eq('modulo', 'produccion').eq('habilitado', true)", a: ".eq('empleado_id', emp.id).eq('modulo', 'produccion')" },

    // Planta: solo un dispositivo con cargar en su fábrica.
    { nombre: 'un es_dispositivo que no es true entra a la planta', de: "if (!ses || ses.es_dispositivo !== true) return 'gestion'", a: "if (!ses || ses.es_dispositivo === false) return 'gestion'" },
    { nombre: 'un dispositivo sin fábrica entra', de: "      if (!ses.unidad_negocio_id) return 'sin_fabrica'\n", a: '' },
    { nombre: 'un dispositivo con cargar en OTRA fábrica entra', de: "      if (!unidadesCon('cargar').includes(String(ses.unidad_negocio_id))) return 'sin_permiso'\n", a: '' },
    { nombre: 'una cuenta personal se queda en la planta', de: "if (destino === 'gestion') { window.location.replace('produccion-gestion.html'); return }", a: "if (destino === 'gestion') { return }" },
    { nombre: 'si mi_sesion falla se redirige a ciegas', de: "        sinAcceso('No se pudo saber qué cuenta es esta. Revisá la conexión.', LINKS_SIN_SESION)\n", a: "        window.location.replace('produccion-gestion.html')\n" },
    // Gestión: ver o configurar.
    { nombre: 'a la gestión se entra con solo cargar', de: "const puedeVerGestion = () => tieneTarea('ver') || tieneTarea('configurar')", a: "const puedeVerGestion = () => tieneTarea('ver') || tieneTarea('configurar') || tieneTarea('cargar')" },
    { nombre: 'gestión: sin permiso se queda', de: '      if (!puedeVerGestion()) {\n        sinAcceso(', a: '      if (false) {\n        sinAcceso(' },
    { nombre: 'gestión: el dispositivo no va a la planta', de: "if (ses && ses.es_dispositivo === true) { window.location.replace('produccion.html'); return }", a: 'if (false) { return }' },

    // La planta compacta.
    { nombre: 'botones de 40 px', de: 'body { --pr-alto-boton: 48px; font-size: 16px; }', a: 'body { --pr-alto-boton: 40px; font-size: 16px; }' },
    { nombre: 'texto base de 14 px', de: 'body { --pr-alto-boton: 48px; font-size: 16px; }', a: 'body { --pr-alto-boton: 48px; font-size: 14px; }' },
    { nombre: 'la receta se achica con el resto', de: '#pr-receta, #pr-otro, #pr-lote-panel, #pr-pin { --pr-alto-boton: 56px; }', a: '#pr-otro, #pr-lote-panel, #pr-pin { --pr-alto-boton: 56px; }' },
    { nombre: 'el tablero vuelve a tres columnas', de: 'minmax(min(100%, 15rem), 1fr)', a: 'minmax(min(100%, 19rem), 1fr)' },
    { nombre: 'las tarjetas vuelven a 150 px', de: '.pr-tablero .pr-maquina { min-height: 112px;', a: '.pr-tablero .pr-maquina { min-height: 150px;' },
    { nombre: 'la barra baja a 40 px', de: '.pr-barra { min-height: 56px;', a: '.pr-barra { min-height: 40px;' },
    { nombre: 'un texto a 14 px', de: '.pr-masero-adentro { padding: 0.375rem 0.875rem; margin: 0.5rem 0; font-size: 1rem; }', a: '.pr-masero-adentro { padding: 0.375rem 0.875rem; margin: 0.5rem 0; font-size: 0.875rem; }' },
    { nombre: 'un botón de 40 px', de: '.pr-sala__masas { min-height: 52px;', a: '.pr-sala__masas { min-height: 40px;' },
    { nombre: 'los renglones de la receta se achican', de: '    .pr-sala__masas { min-height: 52px; font-size: 1.125rem; }\n', a: '    .pr-sala__masas { min-height: 52px; font-size: 1.125rem; }\n    .pr-rec { min-height: 48px; }\n' },
    { nombre: 'los modos no se reparten el ancho', de: '      flex: 1 1 0; min-width: 0; min-height: 56px;', a: '      flex: 0 0 auto; min-width: 0; min-height: 56px;' },
    { nombre: 'el nombre del modo pierde el espaciado', de: '      font: inherit; font-size: 1.375rem; font-weight: 800; letter-spacing: 0.1em;', a: '      font: inherit; font-size: 1.375rem; font-weight: 800;' },
  ],
})
