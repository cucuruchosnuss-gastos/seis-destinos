// Mutaciones de test-produccion-quien.js (B2 de Producción). Ver mutar.js.
//
//   node pruebas/mut-produccion-quien.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-quien.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/produccion.html'),
  escape: 'esc',
  funciones: ['htmlBotonPersona', 'htmlAvisoPuestos', 'mostrarElegirUnidad'],
  equivalentes: [
    { expr: 'esc(PLURAL_PUESTO[puesto] ?? puesto)', motivo: 'PLURAL_PUESTO y el puesto salen de constantes del código (PUESTO_DE_MODO): ninguna salida posible tiene un carácter escapable' },
  ],
  manuales: [
    { nombre: 'no filtra por puesto', de: '      if (conPuesto.length) return { personas: conPuesto, sinConfigurar: false }', a: '      if (false) return { personas: conPuesto, sinConfigurar: false }' },
    { nombre: 'sin puestos no muestra a nadie', de: '      return { personas: lista, sinConfigurar: true }', a: '      return { personas: [], sinConfigurar: true }' },
    { nombre: 'el modo masa pide encargados', de: "const PUESTO_DE_MODO = { produccion: 'encargado', masa: 'masero' }", a: "const PUESTO_DE_MODO = { produccion: 'encargado', masa: 'encargado' }" },
    { nombre: 'el aviso sale siempre', de: '      if (!sinConfigurar) return \'\'\n', a: '' },
    { nombre: 'personal_produccion sin la unidad', de: "supabase.rpc('personal_produccion', { p_unidad_negocio_id: estado.unidadId })", a: "supabase.rpc('personal_produccion', { p_unidad_negocio_id: null })" },
    { nombre: 'si falla deja la lista de antes', de: "        lista.innerHTML = '<button type=\"button\" class=\"pr-btn\" id=\"pr-quien-reintentar\">Reintentar</button>'", a: '' },
    { nombre: 'cambiar de modo conserva la persona', de: '      // Cambiar de modo cambia quién puede responder "¿Quién sos?".\n      estado.persona = null\n', a: '' },
    { nombre: 'un modo inválido se elige', de: "      if (!Object.prototype.hasOwnProperty.call(PUESTO_DE_MODO, modo)) return\n", a: '' },
    { nombre: 'el modo guardado acepta cualquier cosa', de: "      return Object.prototype.hasOwnProperty.call(PUESTO_DE_MODO, m ?? '') ? m : null", a: '      return m' },
    { nombre: 'la unidad guardada no se valida', de: '      if (guardada && candidatas.includes(guardada)) return guardada', a: '      if (guardada) return guardada' },
    { nombre: 'una sola unidad igual pregunta', de: '      if (candidatas.length === 1) return candidatas[0]\n', a: '' },
    { nombre: 'elegir unidad ajena', de: '      if (!estado.unidadesPosibles.includes(id)) return\n', a: '' },
    { nombre: 'no guarda el modo', de: '      guardarPreferencia(CLAVE_MODO, modo)\n', a: '' },
    { nombre: 'no guarda la unidad', de: '      guardarPreferencia(CLAVE_UNIDAD, id)\n', a: '' },
    { nombre: 'el orden pregunta el modo antes que la unidad', de: '      if (!estado.unidadId) return mostrarElegirUnidad()\n      if (!estado.modo) return mostrarVista(\'pr-elegir-modo\')', a: '      if (!estado.modo) return mostrarVista(\'pr-elegir-modo\')\n      if (!estado.unidadId) return mostrarElegirUnidad()' },
    { nombre: 'cambiar de persona no borra la persona', de: '    function cambiarDePersona() {\n      estado.persona = null', a: '    function cambiarDePersona() {' },
    { nombre: 'el botón "Cambiar de persona" nunca se ve', de: "      document.getElementById('pr-btn-cambiar-persona').hidden = !estado.persona", a: "      document.getElementById('pr-btn-cambiar-persona').hidden = true" },
    { nombre: 'leer preferencia sin try', de: '      try { return localStorage.getItem(clave) } catch { return null }', a: '      return localStorage.getItem(clave)' },
    { nombre: 'unidades de carga sin filtrar por máquinas', de: '      return conMaquinas.length ? conMaquinas : permitidas', a: '      return permitidas' },
    { nombre: 'el menú no olvida el modo', de: "        guardarPreferencia(CLAVE_MODO, null)\n", a: '' },
  ],
})
