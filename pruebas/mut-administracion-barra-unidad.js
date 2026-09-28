// Mutaciones de la barra de unidad en Administración (ver test-administracion-barra-unidad.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-barra-unidad.js'),
  original: path.join(__dirname, '..', 'modulos', 'administracion.html'),
  funciones: [],
  manuales: [
    { nombre: 'Todas no pide elegir', de: "      if (!elegida) return undefined                    // Todas: se elige acá", a: "      if (!elegida) return null" },
    { nombre: 'una unidad sin Administración cuenta como empresa', de: '      return lista.some(e => e.id === elegida) ? elegida : null', a: '      return elegida' },
    { nombre: 'con la barra elegida igual se dibuja el selector', de: "        if (empresaSegunBarra(lista) !== null) return ''\n", a: '' },
    { nombre: 'sin Administración no lo dice', de: "        return `<div class=\"ad-aviso\">${esc('Con ' + nombre + ' elegida arriba no tenés órdenes, clientes ni precios en Administración. Elegí otra unidad o \"Todas\".')}</div>`", a: "        return ''" },
    { nombre: 'el nombre de la unidad sin escape', de: "        return `<div class=\"ad-aviso\">${esc('Con ' + nombre + ' elegida arriba no tenés órdenes, clientes ni precios en Administración. Elegí otra unidad o \"Todas\".')}</div>`", a: "        return `<div class=\"ad-aviso\">Con ${nombre} elegida</div>`" },
    { nombre: 'cambiar la barra no cambia la empresa', de: '      estado.empresaId = segun\n      estado.clientes = null', a: '      estado.clientes = null' },
    { nombre: 'cambiar la barra no descarta lo leído', de: '      estado.empresaId = segun\n      estado.clientes = null\n      estado.catalogo = null\n      estado.ordenes = null', a: '      estado.empresaId = segun\n      estado.catalogo = null' },
    { nombre: 'una vista global vuelve a la portada', de: '      if (!VISTAS_GLOBALES.includes(estado.vista)) mostrarInicio()\n    }\n\n    async function init()', a: '      mostrarInicio()\n    }\n\n    async function init()' },
    { nombre: 'init ignora la barra', de: 'estado.empresaId = segun === undefined ? empresaInicial(lista, leerPreferencia(CLAVE_EMPRESA)) : segun', a: 'estado.empresaId = empresaInicial(lista, leerPreferencia(CLAVE_EMPRESA))' },
  ],
})
