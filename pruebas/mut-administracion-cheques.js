// Mutaciones de test-administracion-cheques.js: la cartera de cheques adentro
// de Administración (sobre administracion.html) y la redirección de
// cheques.html (por ARCHIVO_REDIRECCION). Ver mutar.js.
//
//   node pruebas/mut-administracion-cheques.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const SUITE = path.join(__dirname, 'test-administracion-cheques.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
    funciones: [],
    manuales: [
      { nombre: 'Cheques con cualquier tarea', de: "      if (s.global) return estado.miRolApp === 'super_admin' || s.tareas.some(t => estado.misTareas.has(t))", a: '      if (s.global) return true' },
      { nombre: 'Cheques sin el bypass de super_admin', de: "      if (s.global) return estado.miRolApp === 'super_admin' || s.tareas.some(t => estado.misTareas.has(t))", a: '      if (s.global) return s.tareas.some(t => estado.misTareas.has(t))' },
      { nombre: 'Cheques también con cobranzas:cargar', de: "tareas: ['cobranzas:ver_todo', 'cobranzas:procesar'] },\n    ]", a: "tareas: ['cobranzas:ver_todo', 'cobranzas:procesar', 'cobranzas:cargar'] },\n    ]" },
      { nombre: 'sin empresas no se entra aunque vea Cheques', de: '      if (!lista.length && !hayGlobales()) {', a: '      if (!lista.length) {' },
      { nombre: 'el selector de empresa no se esconde en Cheques', de: "      document.getElementById('ad-empresas').hidden = id === 'ad-vista-cheques'", a: '' },
      { nombre: 'abrir Cheques no avisa a la cartera', de: "      document.dispatchEvent(new CustomEvent('administracion:cheques'))\n", a: '' },
      { nombre: 'abrir Cheques no deja la dirección', de: "      if (!/[?&]seccion=cheques/.test(window.location.search)) history.replaceState(null, '', window.location.pathname + '?seccion=cheques')", a: '' },
      { nombre: 'abrir Cheques sin permiso igual la muestra', de: "      if (!SECCIONES.some(s => s.id === 'cheques' && seccionVisible(s))) { mostrarInicio(); return }", a: '' },
      { nombre: '?seccion=cheques no abre la cartera', de: "      if (pedida === 'cheques' && seccionesVisibles().some(s => s.id === 'cheques')) mostrarCheques()", a: '      if (false) mostrarCheques()' },
      { nombre: 'la cartera arranca sola al cargar', de: "    if (document.getElementById('ad-vista-cheques')?.hidden === false) arrancar()", a: '    init()' },
      { nombre: 'la cartera vuelve a redirigir al dashboard', de: "      el.hidden = false\n      mostrarError(texto)\n    }\n\n    async function init() {", a: "      el.hidden = false\n      mostrarError(texto)\n      setTimeout(() => { window.location.href = '../dashboard.html' }, 2500)\n    }\n\n    async function init() {" },
      { nombre: 'el volver= vuelve a ser esta página', de: "urlDeCobranza(cobranzaId, new URL('cheques.html', window.location.href).href)", a: 'urlDeCobranza(cobranzaId, window.location.href)' },
      { nombre: 'las variables de la cartera vuelven al body', de: '    #ad-vista-cheques {\n      /* Receta de tarjeta del proyecto', a: '    body {\n      /* Receta de tarjeta del proyecto' },
    ],
  },
  {
    suite: SUITE,
    variable: 'ARCHIVO_REDIRECCION',
    original: path.join(__dirname, '..', 'modulos/cheques.html'),
    funciones: [],
    manuales: [
      { nombre: 'la redirección pierde el cheque', de: "destino.set('cheque', cheque)", a: 'void 0' },
      { nombre: 'la redirección pasa cualquier cheque', de: "if (cheque && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cheque))", a: 'if (cheque)' },
      { nombre: 'la redirección va a otro lado', de: "window.location.replace('administracion.html?' + destino.toString())", a: "window.location.replace('../dashboard.html')" },
      { nombre: 'la redirección con href (atrás vuelve acá)', de: "window.location.replace('administracion.html?' + destino.toString())", a: "window.location.href = 'administracion.html?' + destino.toString()" },
      { nombre: 'sin la sección', de: "destino.set('seccion', 'cheques')", a: 'void 0' },
    ],
  },
])
