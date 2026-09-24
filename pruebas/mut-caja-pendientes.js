// Mutaciones de test-caja-pendientes.js. Ver mutar.js (mismos guards: suite
// verde sobre el limpio, ancla única, la mutación cambia el archivo, el
// sub-proceso leyó el mutado). De a una.
//
//   node pruebas/mut-caja-pendientes.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-pendientes.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'caja.html'),
  funciones: ['htmlBurbujaCaja'],
  escape: 'esc',
  manuales: [
    // Agrupación
    { nombre: 'toma filas de otros módulos', de: "        if (fila?.modulo !== 'caja') continue\n", a: '' },
    { nombre: 'mi caja mapeada a empresa', de: "solicitudes_mi_caja: 'mi', solicitudes_empresa: 'empresa' }", a: "solicitudes_mi_caja: 'empresa', solicitudes_empresa: 'empresa' }" },
    { nombre: 'clave desconocida sin aviso', de: "if (!tipo) { console.warn('mis_pendientes: clave de caja desconocida', fila.clave); continue }", a: 'if (!tipo) continue' },
    { nombre: 'el cero cuenta', de: "!Number.isInteger(n) || n <= 0) continue\n        const t = String(fila.texto", a: "!Number.isInteger(n) || n < 0) continue\n        const t = String(fila.texto" },
    { nombre: 'null cuenta (se vuelve 0 → y el cero dibuja)', de: "if (c === null || c === undefined || c === '' || typeof c === 'boolean' || !Number.isInteger(n) || n <= 0) continue", a: 'if (!Number.isInteger(n) || n < 0) continue' },
    { nombre: 'un booleano cuenta como 1', de: " || typeof c === 'boolean' || ", a: ' || ' },
    { nombre: 'el detalle no dice la cantidad', de: 'detalle: `${total} ${frase}` }', a: 'detalle: frase }' },
    // Render
    { nombre: 'empresa sin gate ver_empresa', de: "if (tipo === 'empresa') return !!estado.idEmpresa && tieneTareaExplicita('ver_empresa')", a: "if (tipo === 'empresa') return !!estado.idEmpresa" },
    { nombre: 'empresa con bypass de super_admin', de: "return !!estado.idEmpresa && tieneTareaExplicita('ver_empresa')", a: "return !!estado.idEmpresa && tieneTarea('ver_empresa')" },
    { nombre: 'empresa sin exigir idEmpresa', de: "return !!estado.idEmpresa && tieneTareaExplicita('ver_empresa')", a: "return tieneTareaExplicita('ver_empresa')" },
    { nombre: 'burbujaVisible acepta cualquier tipo', de: "      return tipo === 'mi'\n", a: '      return true\n' },
    { nombre: 'el cero dibuja burbuja', de: "if (!p || !(p.total > 0) || !burbujaVisible(tipo)) return ''", a: "if (!p || !burbujaVisible(tipo)) return ''" },
    { nombre: 'sin aria-label', de: ' aria-label="${detalle}">${numero}</span>`', a: '>${numero}</span>`' },
    { nombre: 'sin title', de: 'class="burbuja-caja" title="${detalle}"', a: 'class="burbuja-caja"' },
    { nombre: 'sin tope 99+', de: "p.total > 99 ? '99+' : String(p.total)", a: 'String(p.total)' },
    // Dónde va cada una
    { nombre: 'la ficha propia lleva la de empresa', de: "if (empleadoId === estado.miEmpleado?.id) return 'mi'", a: "if (empleadoId === estado.miEmpleado?.id) return 'empresa'" },
    { nombre: 'la ficha de Empresa no lleva la suya', de: "if (empleadoId === estado.idEmpresa) return 'empresa'\n", a: '' },
    { nombre: 'la ficha de otro lleva la mía', de: "      if (empleadoId === estado.idEmpresa) return 'empresa'\n      return null", a: "      if (empleadoId === estado.idEmpresa) return 'empresa'\n      return 'mi'" },
    { nombre: '"Mi caja" repinta la de empresa', de: "poner('burbuja-btn-mi-caja', 'mi')", a: "poner('burbuja-btn-mi-caja', 'empresa')" },
    { nombre: 'el atajo Empresa no se repinta', de: "      poner('burbuja-btn-empresa-atajo', 'empresa')\n", a: '' },
    { nombre: 'el atajo de la ficha no se repinta', de: "      poner('burbuja-detalle-empresa-atajo', 'empresa')\n", a: '' },
    { nombre: 'la sección no se repinta', de: "      poner('burbuja-solicitudes', tipoBurbujaDeFicha(estado.personaAbierta))\n", a: '' },
    { nombre: 'mi fila repite la de "Mi caja"', de: "poner('burbuja-tarjeta-propia', miCajaTieneBoton() ? null : 'mi')", a: "poner('burbuja-tarjeta-propia', 'mi')" },
    { nombre: 'mi fila no la lleva nunca', de: "poner('burbuja-tarjeta-propia', miCajaTieneBoton() ? null : 'mi')", a: "poner('burbuja-tarjeta-propia', null)" },
    { nombre: 'miCajaTieneBoton ignora movimientos_todos', de: "return tieneTarea('retiros_todos') || tieneTarea('movimientos_todos')", a: "return tieneTarea('retiros_todos')" },
    { nombre: 'la plantilla de la tarjeta no trae la burbuja', de: "${miCajaTieneBoton() ? '' : htmlBurbujaCaja('mi')}", a: '' },
    { nombre: 'la tarjeta de cualquiera trae el slot', de: "${emp.id === estado.miEmpleado?.id ? `<span id=\"burbuja-tarjeta-propia\">", a: "${true ? `<span id=\"burbuja-tarjeta-propia\">" },
    { nombre: 'el atajo de la ficha sin la burbuja', de: 'Empresa<span id="burbuja-detalle-empresa-atajo">${htmlBurbujaCaja(\'empresa\')}</span>', a: 'Empresa<span id="burbuja-detalle-empresa-atajo"></span>' },
    { nombre: 'el summary sin la burbuja', de: '<span id="burbuja-solicitudes">${htmlBurbujaCaja(tipoBurbujaDeFicha(estado.personaAbierta))}</span>', a: '<span id="burbuja-solicitudes"></span>' },
    { nombre: 'el slot de "Mi caja" fuera del botón', de: 'Mi caja<span id="burbuja-btn-mi-caja"></span></button>', a: 'Mi caja</button><span id="burbuja-btn-mi-caja"></span>' },
    { nombre: 'el slot de "Empresa" fuera del botón', de: 'Empresa<span id="burbuja-btn-empresa-atajo"></span></button>', a: 'Empresa</button><span id="burbuja-btn-empresa-atajo"></span>' },
    // Carga
    { nombre: 'la respuesta vieja pisa la nueva', de: '      if (turno !== estado.turnoPendientesCaja) return\n', a: '' },
    { nombre: 'un error deja el número viejo', de: "        console.error('mis_pendientes:', err)\n        res = null\n      }", a: "        console.error('mis_pendientes:', err)\n        return\n      }" },
    { nombre: 'un error de la RPC se ignora', de: '        if (error) throw error\n        res = agruparPendientesCaja', a: '        res = agruparPendientesCaja' },
    { nombre: 'no repinta al llegar', de: '      estado.pendientesCaja = res\n      pintarBurbujasCaja()', a: '      estado.pendientesCaja = res' },
    // Refrescos
    { nombre: 'no se recarga al resolver una solicitud', de: '      // await: tiene su propio turno y no tiene por qué frenar el resto.\n      cargarPendientesCaja()', a: '      // await: tiene su propio turno y no tiene por qué frenar el resto.' },
    { nombre: 'no se recarga al volver a la pestaña', de: "if (document.visibilityState === 'visible' && estado.miEmpleado) cargarPendientesCaja()", a: "if (false) cargarPendientesCaja()" },
    { nombre: 'init no pide las burbujas', de: '      // repinte, y lo que ya esté en pantalla lo repinta ella).\n      cargarPendientesCaja()', a: '      // repinte, y lo que ya esté en pantalla lo repinta ella).' },
    // Orden y apertura de la sección
    { nombre: 'la sección no se abre sola', de: "<details${hayQueResponder ? ' open' : ''}>", a: '<details>' },
    { nombre: 'la sección se abre siempre', de: "<details${hayQueResponder ? ' open' : ''}>", a: '<details open>' },
    { nombre: 'sin ordenar (las que esperan a otro pueden ir arriba)', de: "        .sort((a, b) => (puedoResponderSolicitud(b) ? 1 : 0) - (puedoResponderSolicitud(a) ? 1 : 0))\n", a: '\n' },
    { nombre: 'orden invertido', de: '(puedoResponderSolicitud(b) ? 1 : 0) - (puedoResponderSolicitud(a) ? 1 : 0)', a: '(puedoResponderSolicitud(a) ? 1 : 0) - (puedoResponderSolicitud(b) ? 1 : 0)' },
    { nombre: 'se ordena el estado en vez de una copia', de: 'const ordenadas = [...estado.solicitudesPendientes]', a: 'const ordenadas = estado.solicitudesPendientes' },
    { nombre: 'puedoResponderSolicitud deja responder al creador', de: ': soyParte && miId !== s.creado_por', a: ': soyParte' },
    { nombre: 'puedoResponderSolicitud ignora la regla de Empresa', de: 'return involucraAEmpresa(s)\n        ? puedoResponderSolicitudesDeEmpresa()\n        : soyParte', a: 'return soyParte' },
  ],
})
