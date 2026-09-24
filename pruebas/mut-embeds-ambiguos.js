// Mutaciones de test-embeds-ambiguos.js. Ver mutar.js.
//
//   node pruebas/mut-embeds-ambiguos.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-embeds-ambiguos.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/accesos.html'),
  funciones: [],
  manuales: [
    { nombre: 'el embed vuelve a quedar sin FK', de: "rol_app, unidades_negocio!empleados_unidad_negocio_id_fkey (nombre)')", a: "rol_app, unidades_negocio (nombre)')" },
    { nombre: 'el embed nombra el camino de puestos_produccion', de: "rol_app, unidades_negocio!empleados_unidad_negocio_id_fkey (nombre)')", a: "rol_app, unidades_negocio!puestos_produccion (nombre)')" },
    { nombre: 'fallasDeCarga devuelve todas', de: ".filter(([, res]) => res && res.error)", a: ".filter(([, res]) => res)" },
    { nombre: 'el texto pierde el código', de: "const codigo = error.code ? `${error.code}: ` : ''", a: "const codigo = ''" },
    { nombre: 'el texto pierde el mensaje', de: "const msj = error.message || 'error desconocido'", a: "const msj = 'error'" },
    { nombre: 'el texto pierde qué consulta', de: "return `${que} (${codigo}${msj})`", a: "return `(${codigo}${msj})`" },
    { nombre: 'sin console.error', de: "for (const f of fallas) console.error(`Accesos: no se pudieron cargar ${f.que}.`, f.error)", a: "" },
    { nombre: 'vuelve el mensaje genérico', de: "mostrarError(textoFallasDeCarga(fallas))", a: "mostrarError('No se pudieron cargar los datos de Accesos.')" },
    { nombre: 'la carga de unidades no se revisa', de: "        ['las unidades de negocio', unidRes],\n", a: "" },
    { nombre: 'no corta con una falla', de: "      if (fallas.length) {", a: "      if (false) {" },
  ],
})
