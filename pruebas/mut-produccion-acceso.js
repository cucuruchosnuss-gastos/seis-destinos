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

    // La tablet real (28/09/2026): los mínimos nuevos y el bloque que los pone.
    { nombre: 'botones de 40 px', de: 'body { --pr-alto-boton: 44px; font-size: 15px; }', a: 'body { --pr-alto-boton: 40px; font-size: 15px; }' },
    { nombre: 'texto base de 14 px', de: 'body { --pr-alto-boton: 44px; font-size: 15px; }', a: 'body { --pr-alto-boton: 44px; font-size: 14px; }' },
    { nombre: 'un texto a 10 px', de: '.pr-rec__lote-nota { font-size: 0.6875rem; }', a: '.pr-rec__lote-nota { font-size: 0.625rem; }' },
    { nombre: 'un botón de 28 px', de: '.pr-lp__filtro {\n      min-height: 30px;', a: '.pr-lp__filtro {\n      min-height: 28px;' },
    { nombre: 'el teclado del PIN se achica', de: '.pr-tecla { min-height: clamp(48px, 9.5vh, 72px);', a: '.pr-tecla { min-height: clamp(40px, 9.5vh, 72px);' },
    { nombre: 'el tablero vuelve a dos columnas', de: '.pr-tablero { gap: 0.5rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }', a: '.pr-tablero { gap: 0.5rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }' },
    { nombre: 'la barra lateral se angosta sin correr la página', de: 'body.pr-con-lateral .pr-app { margin-left: 208px; }', a: 'body.pr-con-lateral .pr-app { margin-left: 180px; }' },
    { nombre: 'la barra pasa arriba también apaisada', de: '@media (orientation: portrait), (max-width: 760px) {\n      .pr-lateral { position: static;', a: '@media (max-width: 1000px) {\n      .pr-lateral { position: static;' },
    { nombre: 'el lote de la tarjeta puede partirse', de: '.pr-maquina__lote { font-size: 1.875rem; line-height: 1.05; white-space: nowrap; }', a: '.pr-maquina__lote { font-size: 1.875rem; line-height: 1.05; }' },
    { nombre: 'las palabras se cortan', de: '.pr-app, .pr-lateral { overflow-wrap: normal; word-break: normal; hyphens: manual; }', a: '.pr-app, .pr-lateral { overflow-wrap: anywhere; }' },
    { nombre: 'la tablet parada deja de ir última', de: '    /* ══ LA TABLET PARADA', a: '    /* ══ LA TABLET PARADA */\n    /* ══ OTRO BLOQUE */\n    /* ══ LA TABLET PARADA' },
    { nombre: 'los modos no se reparten el ancho', de: '      flex: 1 1 0; min-width: 0; min-height: 56px;', a: '      flex: 0 0 auto; min-width: 0; min-height: 56px;' },
    { nombre: 'el nombre del modo pierde el espaciado', de: '      font: inherit; font-size: 1.375rem; font-weight: 800; letter-spacing: 0.1em;', a: '      font: inherit; font-size: 1.375rem; font-weight: 800;' },
  ],
})
