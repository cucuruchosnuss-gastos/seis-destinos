// Mutaciones de "Ampliar" en las cinco pantallas (ver test-ampliar-pantallas.js).
// Cada tanda muta UN archivo y se lo pasa a la suite por su variable.
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const R = path.join(__dirname, '..')
const suite = path.join(__dirname, 'test-ampliar-pantallas.js')
const IMPORTA = "    import { crearAmpliar } from '../js/ampliar.js'\n"

correrMutacionesEnVarios([
  { suite, original: path.join(R, 'modulos', 'cobranzas.html'), variable: 'ARCHIVO_COBRANZAS', funciones: [], manuales: [
    { nombre: 'Cobranzas: no importa la pieza', de: IMPORTA, a: '' },
    { nombre: 'Cobranzas: sin el botón', de: '<div class="amp-barra amp-barra--fija"><button type="button" class="amp-boton" id="cob-btn-ampliar" hidden>Ampliar</button></div>', a: '' },
    { nombre: 'Cobranzas: el botón nace visible', de: 'id="cob-btn-ampliar" hidden>', a: 'id="cob-btn-ampliar">' },
    { nombre: 'Cobranzas: el botón se va al recorrer el panel', de: '<div class="amp-barra amp-barra--fija">', a: '<div class="amp-barra">' },
    { nombre: 'Cobranzas: el botón dice otra cosa', de: 'id="cob-btn-ampliar" hidden>Ampliar<', a: 'id="cob-btn-ampliar" hidden>Ver grande<' },
    { nombre: 'Cobranzas: init no la conecta', de: '      conectarTodo()\n      conectarAmpliarCob()\n', a: '      conectarTodo()\n' },
    { nombre: 'Cobranzas: sin el corte del panel', de: '        corte: MQ_ESCRITORIO,\n', a: '' },
    { nombre: 'Cobranzas: observa otra cosa', de: "        observar: document.getElementById('cob-vista-detalle'),", a: "        observar: document.getElementById('cob-detalle-cuerpo')," },
    { nombre: 'Cobranzas: sin Anular abajo', de: ", 'cob-btn-anular'].map(id => document.getElementById(id))", a: '].map(id => document.getElementById(id))' },
    { nombre: 'Cobranzas: marco doble', de: '        marcoCelda: false,\n      })', a: '      })' },
    { nombre: 'Cobranzas: los titulares cierran la ventana', de: "        quedarse: '[data-plegar-titulares]',\n", a: '' },
    { nombre: 'Cobranzas: se ofrece con otra cobranza cargando', de: 'estado.detalle.cabecera?.id === estado.cobranzaSeleccionadaId &&', a: 'true &&' },
  ] },
  { suite, original: path.join(R, 'modulos', 'gastos.html'), variable: 'ARCHIVO_GASTOS', funciones: [], manuales: [
    { nombre: 'Gastos: no importa la pieza', de: IMPORTA, a: '' },
    { nombre: 'Gastos: sin el botón del gasto', de: '        <button type="button" class="amp-boton" id="btn-ampliar-gasto" hidden>Ampliar</button>\n', a: '' },
    { nombre: 'Gastos: sin el botón de la factura', de: '        <button type="button" class="amp-boton" id="btn-ampliar-factura" hidden>Ampliar</button>\n', a: '' },
    { nombre: 'Gastos: el botón nace visible', de: 'id="btn-ampliar-gasto" hidden>', a: 'id="btn-ampliar-gasto">' },
    { nombre: 'Gastos: la llamada apunta a otro botón', de: "      boton: document.getElementById('btn-ampliar-gasto'),", a: "      boton: document.getElementById('btn-ampliar-gasto-2')," },
    { nombre: 'Gastos: observa el contenido y no el modal', de: "      observar: document.getElementById('modal-detalle-gasto'),", a: "      observar: document.getElementById('detalle-gasto-contenido')," },
    { nombre: 'Gastos: sin Anular abajo', de: ", document.getElementById('btn-anular-gasto')]", a: ']' },
    { nombre: 'Gastos: la factura sin acciones', de: "      acciones: () => [document.getElementById('btn-editar-factura')],", a: '      acciones: () => [],' },
    { nombre: 'Gastos: un corte propio', de: "      boton: document.getElementById('btn-ampliar-factura'),\n", a: "      boton: document.getElementById('btn-ampliar-factura'),\n      corte: '(min-width: 600px)',\n" },
  ] },
  { suite, original: path.join(R, 'modulos', 'administracion.html'), variable: 'ARCHIVO_ADMINISTRACION', funciones: [], manuales: [
    { nombre: 'Administración: no importa la pieza', de: IMPORTA, a: '' },
    { nombre: 'Administración: init no la conecta', de: '      conectarTodo()\n      conectarAmpliarAd()\n', a: '      conectarTodo()\n' },
    { nombre: 'Órdenes: sin el botón', de: '        <button type="button" class="amp-boton" id="ad-orden-ampliar" hidden>Ampliar</button>\n', a: '' },
    { nombre: 'Cheques: sin el botón', de: '        <button type="button" class="amp-boton" id="ad-cobranza-ampliar" hidden>Ampliar</button>\n', a: '' },
    { nombre: 'Cheques: el botón nace visible', de: 'id="ad-cobranza-ampliar" hidden>', a: 'id="ad-cobranza-ampliar">' },
    { nombre: 'Órdenes: se ofrece mientras se valoriza', de: '!estado.orden.valorizar && ', a: '' },
    { nombre: 'Cheques: se ofrece mientras se asienta', de: '!estado.cobranzas.asentando && ', a: '' },
    { nombre: 'Órdenes: sin el corte del panel', de: "        observar: document.getElementById('ad-vista-orden'),\n        corte: MQ_LISTA_DETALLE,\n", a: "        observar: document.getElementById('ad-vista-orden'),\n" },
    { nombre: 'Órdenes: sin las acciones de la orden', de: "      acciones: () => document.querySelectorAll('#ad-orden-acciones > button'),", a: '      acciones: () => [],' },
    { nombre: 'Cheques: sin Reabrir abajo', de: "document.querySelectorAll('#ad-cobranza-reabrir, ", a: "document.querySelectorAll('" },
  ] },
  { suite, original: path.join(R, 'modulos', 'cuentas-corrientes.html'), variable: 'ARCHIVO_CC', funciones: [], manuales: [
    { nombre: 'Cuentas corrientes: no importa la pieza', de: IMPORTA, a: '' },
    { nombre: 'Cuentas corrientes: sin el botón', de: '        <button type="button" class="amp-boton" id="btn-ampliar-pago" hidden>Ampliar</button>\n', a: '' },
    { nombre: 'Cuentas corrientes: el botón nace visible', de: 'id="btn-ampliar-pago" hidden>', a: 'id="btn-ampliar-pago">' },
    { nombre: 'Cuentas corrientes: no se crea la ventana', de: "    crearAmpliar({\n      boton: document.getElementById('btn-ampliar-pago'),", a: "    void ({\n      boton: document.getElementById('btn-ampliar-pago')," },
    { nombre: 'Cuentas corrientes: el botón fuera del modal', de: "      observar: document.getElementById('modal-detalle-pago'),", a: "      observar: document.getElementById('detalle-pago-contenido')," },
  ] },
  { suite, original: path.join(R, 'css', 'main.css'), variable: 'ARCHIVO_CSS', funciones: [], manuales: [
    { nombre: 'CSS: la ventana debajo de los modales', de: '  position: fixed; inset: 0; z-index: 75; box-sizing: border-box;', a: '  position: fixed; inset: 0; z-index: 50; box-sizing: border-box;' },
    { nombre: 'CSS: el fondo casi transparente', de: '  background: rgba(28, 26, 23, 0.6);', a: '  background: rgba(28, 26, 23, 0.1);' },
    { nombre: 'CSS: la ventana chica', de: '  width: min(1560px, 96vw); height: 94vh;', a: '  width: min(1560px, 60vw); height: 60vh;' },
    { nombre: 'CSS: todo en una columna', de: 'grid-template-columns: minmax(320px, 1fr) minmax(0, 2fr); }', a: 'grid-template-columns: 1fr; }' },
    { nombre: 'CSS: lo cortado sigue cortado', de: '.amp__resumen-cuerpo *, .amp__celda * { white-space: normal !important; text-overflow: clip !important;', a: '.amp__resumen-cuerpo *, .amp__celda * {' },
    { nombre: 'CSS: la barra fija no se pega', de: '.amp-barra--fija { position: sticky; top: 0;', a: '.amp-barra--fija { position: static; top: 0;' },
    { nombre: 'CSS: la página de atrás scrollea', de: 'html.amp-abierta { overflow: hidden; }\n', a: '' },
    { nombre: 'CSS: la ventana se imprime', de: '@media print { .amp-fondo, .amp-boton { display: none !important; } }\n', a: '' },
  ] },
])
