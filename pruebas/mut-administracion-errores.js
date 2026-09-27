// Mutaciones de test-administracion-errores.js (27/09/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-errores.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-errores.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlOpcionesFiltro', 'htmlFilaError', 'pintarErrores'],
  equivalentes: [
    { expr: 'esc(todos)', motivo: 'uno de tres rótulos constantes del código (Todas las pantallas…)' },
    { expr: "esc(er.error)", motivo: 'texto constante del código: lo pone mostrarErrores()' },
    { expr: "esc(tipo)", motivo: 'si el tipo es conocido, una etiqueta constante; si no, lo cubre la marca "evento" en el filtro (mismo dato)' },
  ],
  manuales: [
    { nombre: 'la sección la ve cualquiera', de: "      if (s.soloSuperAdmin) return estado.miRolApp === 'super_admin'\n", a: "      if (s.soloSuperAdmin) return true\n" },
    { nombre: 'se abre sin ser super_admin', de: "      if (estado.miRolApp !== 'super_admin') { mostrarInicio(); return }\n      mostrarVista('ad-vista-errores')", a: "      mostrarVista('ad-vista-errores')" },
    { nombre: 'sin orden por fecha', de: ".order('creado_en', { ascending: false }).limit(MAX_ERRORES)", a: '.limit(MAX_ERRORES)' },
    { nombre: 'el filtro de pantalla no filtra', de: "        (!f.pantalla || e.pantalla === f.pantalla) &&", a: '        true &&' },
    { nombre: 'el filtro de dispositivo no filtra', de: "        (!f.dispositivo || etiquetaDispositivo(e.dispositivo) === f.dispositivo) &&", a: '        true &&' },
    { nombre: 'el filtro de tipo no filtra', de: "        (!f.evento || e.evento === f.evento))", a: '        true)' },
    { nombre: 'sin quién', de: "      const quien = e.empleado_id ? (estado.nombres.get(e.empleado_id) ?? 'Alguien') : 'Sin sesión'", a: "      const quien = ''" },
    { nombre: 'la hora sin la zona de Argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, day: '2-digit'", a: "new Intl.DateTimeFormat('es-AR', { day: '2-digit'" },
    { nombre: 'el dispositivo sin el modelo', de: "      if (android) aparato = `${android[2].replace(/ Build.*$/, '').trim()} · Android ${android[1]}`", a: "      if (android) aparato = 'Android'" },
    { nombre: 'el dispositivo sin el modo', de: "      return modo ? `${aparato} · ${modo}` : aparato", a: '      return aparato' },
    { nombre: 'sin el detalle', de: "      const extra = [e.detalle, e.url, e.dispositivo].filter(Boolean).join('\\n')", a: "      const extra = ''" },
    { nombre: 'el tipo sin palabras', de: "      const tipo = ETIQUETA_EVENTO_ERROR[e.evento] ?? e.evento ?? 'Error'", a: "      const tipo = e.evento ?? 'Error'" },
  ],
})
