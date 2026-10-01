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
    { nombre: 'una cuenta personal se queda en la planta', de: "if (destino === 'gestion') { olvidarPlantaInstalada(); window.location.replace('produccion-gestion.html'); return }", a: "if (destino === 'gestion') { olvidarPlantaInstalada(); return }" },
    { nombre: 'si mi_sesion falla se redirige a ciegas', de: "        sinAcceso('No se pudo saber qué cuenta es esta. Revisá la conexión.', LINKS_SIN_SESION)\n", a: "        window.location.replace('produccion-gestion.html')\n" },
    // Gestión: ver o configurar.
    { nombre: 'a la gestión se entra con solo cargar', de: "const puedeVerGestion = () => tieneTarea('ver') || tieneTarea('configurar')", a: "const puedeVerGestion = () => tieneTarea('ver') || tieneTarea('configurar') || tieneTarea('cargar')" },
    { nombre: 'gestión: sin permiso se queda', de: '      if (!puedeVerGestion()) {\n        sinAcceso(', a: '      if (false) {\n        sinAcceso(' },
    { nombre: 'gestión: el dispositivo no va a la planta', de: "if (ses && ses.es_dispositivo === true) { window.location.replace('produccion.html'); return }", a: 'if (false) { return }' },

    // Planta v2 (28/09/2026): el <style> del handoff (tokens --p-*, px, la
    // tablet parada con @media (orientation: portrait)). Se fueron los
    // bloques "LA TABLET REAL" / "LA TABLET PARADA" y la barra de modos, así
    // que "la tablet parada deja de ir última" y "los modos no se reparten el
    // ancho" no tienen qué mutar.
    { nombre: 'botones de 40 px', de: '    .pr-btn {\n      min-height: 44px;', a: '    .pr-btn {\n      min-height: 40px;' },
    { nombre: 'texto base de 14 px', de: '      font-size: 15px;\n      line-height: 1.25;', a: '      font-size: 14px;\n      line-height: 1.25;' },
    { nombre: 'la acción principal se achica', de: '--p-prim: 54px;', a: '--p-prim: 44px;' },
    { nombre: 'un texto a 10 px', de: '.pr-lat__modo { font-size: 11px;', a: '.pr-lat__modo { font-size: 10px;' },
    { nombre: 'un botón de 28 px', de: '.pr-rec__otro, .pr-rec__quitar { min-height: 32px;', a: '.pr-rec__otro, .pr-rec__quitar { min-height: 26px;' },
    { nombre: 'el teclado del PIN se achica', de: '--p-tecla: 58px;', a: '--p-tecla: 40px;' },
    { nombre: 'el tablero pierde las 6 columnas', de: 'grid-template-columns: repeat(6, minmax(0, 1fr)); grid-auto-rows: 1fr;', a: 'grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr;' },
    { nombre: 'la barra lateral se angosta', de: 'width: 200px; flex-shrink: 0; background: var(--p-tarjeta); border-right', a: 'width: 180px; flex-shrink: 0; background: var(--p-tarjeta); border-right' },
    { nombre: 'la barra pasa arriba también apaisada', de: '@media (orientation: portrait) {\n      .pr-lateral {\n        width: auto;', a: '@media (max-width: 1100px) {\n      .pr-lateral {\n        width: auto;' },
    { nombre: 'el lote de la tarjeta puede partirse', de: '.pr-maquina__lote { display: flex; align-items: baseline; gap: 8px; }', a: '.pr-maquina__lote { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }' },
    { nombre: 'las palabras se cortan', de: '.pr-persona__nombre { font-size: 17px; font-weight: 700; overflow-wrap: anywhere; }', a: '.pr-persona__nombre { font-size: 17px; font-weight: 700; word-break: break-all; }' },
    { nombre: 'el nombre del modo pierde la negrita', de: '.pr-banda-modo__nombre { font-family: var(--p-titulo); font-size: 21px; font-weight: 800;', a: '.pr-banda-modo__nombre { font-family: var(--p-titulo); font-size: 21px; font-weight: 500;' },
  ],
})
