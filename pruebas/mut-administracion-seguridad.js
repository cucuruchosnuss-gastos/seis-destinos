// Mutaciones de test-administracion-seguridad.js (27/09/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-seguridad.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-seguridad.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlFilaSeguridad', 'pintarSeguridad'],
  equivalentes: [
    { expr: 'esc(sg.error)', motivo: 'texto constante del código: lo pone mostrarSeguridad()' },
    { expr: 'esc(momentoAr(r.hecho_en))', motivo: 'momentoAr() arma una fecha con números o "—"' },
  ],
  manuales: [
    { nombre: 'Seguridad la ve cualquiera', de: "      { id: 'seguridad', titulo: 'Seguridad', global: true, soloSuperAdmin: true, tareas: [] },", a: "      { id: 'seguridad', titulo: 'Seguridad', global: true, tareas: ['cobranzas:procesar'] }," },
    { nombre: 'se abre sin ser super_admin', de: "      if (estado.miRolApp !== 'super_admin') { mostrarInicio(); return }\n      mostrarVista('ad-vista-seguridad')", a: "      mostrarVista('ad-vista-seguridad')" },
    { nombre: 'sin orden por fecha', de: ".order('hecho_en', { ascending: false }).limit(MAX_SEGURIDAD)", a: '.limit(MAX_SEGURIDAD)' },
    { nombre: 'sin los nombres', de: '        await asegurarNombres(filas.flatMap(r => [r.empleado_id, r.hecho_por]))\n', a: '' },
    { nombre: 'sin quién lo hizo', de: '`De ${de} · lo hizo ${por}`', a: '`De ${de}`' },
    { nombre: 'sin "a sí mismo"', de: 'r.empleado_id && r.empleado_id === r.hecho_por ?', a: 'false ?' },
    { nombre: 'la acción sin palabras', de: "      cerrar_sesiones: 'Cerró todas las sesiones',\n", a: '' },
    { nombre: 'un error inventa un registro vacío', de: "        estado.seguridad.error = 'No se pudo leer el registro de seguridad. Revisá la conexión y volvé a entrar.'", a: '        estado.seguridad.filas = []' },
    { nombre: 'la respuesta vieja pisa la nueva', de: '        if (turno !== turnoSeguridad) return\n        estado.seguridad.filas = filas', a: '        estado.seguridad.filas = filas' },
    { nombre: 'con empresa (el selector no se esconde)', de: "'ad-vista-cobranza', 'ad-vista-errores', 'ad-vista-seguridad']\n    const SUBTITULO", a: "'ad-vista-cobranza', 'ad-vista-errores']\n    const SUBTITULO" },
    { nombre: 'la portada no la ofrece', de: "      else if (id === 'seguridad') mostrarSeguridad()\n", a: '' },
  ],
})
