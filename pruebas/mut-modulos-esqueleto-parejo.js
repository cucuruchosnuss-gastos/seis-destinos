// Mutaciones de test-modulos-esqueleto-parejo.js (el esqueleto parejo,
// 23/10/2026: ninguna pantalla tapa las barras y los módulos viejos con el
// encabezado de los nuevos). Ver mutar.js (los tres guards: suite verde sobre
// el limpio, ancla única, mutación que cambia algo). Cada tanda muta su
// archivo y se lo pasa a la suite por su variable. Corren de a una.
//
//   node pruebas/mut-modulos-esqueleto-parejo.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-modulos-esqueleto-parejo.js')
const m = (archivo) => path.join(RAIZ, 'modulos', archivo)

correrMutacionesEnVarios([
  {
    suite: SUITE, original: m('gastos.html'), variable: 'ARCHIVO_GASTOS', funciones: [],
    manuales: [
      { nombre: 'el wizard vuelve a ir encima de todo', de: '    .vista-en-pagina:not([hidden]) {\n      display: flex;', a: '    .vista-en-pagina:not([hidden]) {\n      position: fixed; inset: 0; z-index: 50; background: var(--color-superficie);\n      display: flex;' },
      { nombre: 'el detalle de la factura pierde la clase de vista', de: '<div id="modal-detalle-factura" class="vista-en-pagina" hidden>', a: '<div id="modal-detalle-factura" hidden>' },
      { nombre: 'el paso vuelve a tener scroll propio', de: '    .paso__contenido {\n      flex: 1;\n      min-width: 0;', a: '    .paso__contenido {\n      flex: 1;\n      overflow-y: auto;\n      min-width: 0;' },
      { nombre: 'abrir el wizard no va arriba', de: '      arribaDeLaVista()\n      await iniciarWizard()', a: '      await iniciarWizard()' },
      { nombre: 'abrir el wizard anota la altura DESPUÉS de esconder la lista', de: "      entrarAVista()\n      document.getElementById('vista-lista').hidden = true\n      document.getElementById('vista-wizard')", a: "      document.getElementById('vista-lista').hidden = true\n      entrarAVista()\n      document.getElementById('vista-wizard')" },
      { nombre: 'una vista encima de otra pisa la altura de la lista', de: "if (!document.getElementById('vista-lista').hidden) alturaDeLaLista.y = window.scrollY || 0", a: 'alturaDeLaLista.y = window.scrollY || 0' },
      { nombre: 'volver a la lista va arriba de todo', de: '      window.scrollTo(0, alturaDeLaLista.y)', a: '      window.scrollTo(0, 0)' },
      { nombre: 'cerrar el detalle del gasto no vuelve a la altura', de: "      document.getElementById('modal-detalle-gasto').hidden = true\n      document.getElementById('vista-lista').removeAttribute('hidden')\n      volverALaLista()\n", a: "      document.getElementById('modal-detalle-gasto').hidden = true\n      document.getElementById('vista-lista').removeAttribute('hidden')\n" },
      { nombre: 'abrir la factura no va arriba', de: "      document.getElementById('modal-detalle-factura').removeAttribute('hidden')\n      arribaDeLaVista()", a: "      document.getElementById('modal-detalle-factura').removeAttribute('hidden')" },
      { nombre: 'el encabezado con otro color', de: '--cab-modulo: oklch(0.55 0.16 355)', a: '--cab-modulo: oklch(0.55 0.16 300)' },
      { nombre: 'el encabezado vuelve a la tarjeta vieja', de: '      <header class="cab-modulo">\n        <a href="../dashboard.html" class="cab-modulo__volver" title="Volver al dashboard">‹ Volver</a>', a: '      <header class="gastos-header">\n        <a href="../dashboard.html" class="gastos-header__volver" title="Volver al dashboard">‹ Volver</a>' },
      { nombre: 'el ícono de otro módulo en el encabezado del wizard', de: '      <button class="cab-modulo__volver" id="btn-cancelar-wizard" title="Cancelar y volver a la lista">‹ Volver</button>\n      <span class="cab-modulo__icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12', a: '      <button class="cab-modulo__volver" id="btn-cancelar-wizard" title="Cancelar y volver a la lista">‹ Volver</button>\n      <span class="cab-modulo__icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h12' },
      { nombre: 'se pierde un control (el Volver de la factura cambia de id)', de: 'id="btn-cerrar-detalle-factura" title=', a: 'id="btn-volver-factura" title=' },
      { nombre: 'el modal de anular deja de ser modal', de: '    #modal-anular-gasto {\n      position: fixed;', a: '    #modal-anular-gasto {\n      position: static;' },
      // 24/10/2026: la barra Anterior / Siguiente del wizard pegada abajo.
      { nombre: 'wizard-nav: deja de pegarse (sin sticky)', de: '      gap: 0.75rem;\n      position: sticky;\n      bottom: 0;', a: '      gap: 0.75rem;\n      bottom: 0;' },
      { nombre: 'wizard-nav: se pega arriba en vez de abajo', de: '      gap: 0.75rem;\n      position: sticky;\n      bottom: 0;', a: '      gap: 0.75rem;\n      position: sticky;\n      top: 0;' },
      { nombre: 'wizard-nav: sin fondo (se ve el contenido detrás)', de: '      background: var(--color-superficie);\n      border-top: 1px solid var(--color-borde);', a: '      background: transparent;\n      border-top: 1px solid var(--color-borde);' },
      { nombre: 'wizard-nav: sin el borde de arriba', de: '      border-top: 1px solid var(--color-borde);\n      box-shadow: 0 -2px 12px', a: '      box-shadow: 0 -2px 12px' },
      { nombre: 'wizard-nav: sin la sombra suave', de: '      box-shadow: 0 -2px 12px rgba(28, 26, 23, 0.08);\n      flex-shrink: 0;', a: '      flex-shrink: 0;' },
      { nombre: 'wizard-nav: encima de la barra de abajo de la app', de: '      bottom: 0;\n      z-index: 5;', a: '      bottom: 0;\n      z-index: 30;' },
      { nombre: 'wizard-nav: en la compu sin el safe-area', de: '      padding: 0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px));', a: '      padding: 0.75rem 1.25rem;' },
      { nombre: 'wizard-nav: en el celular, debajo de la barra de abajo', de: 'body.con-barra-lateral .wizard-nav { bottom: calc(68px + env(safe-area-inset-bottom, 0px));', a: 'body.con-barra-lateral .wizard-nav { bottom: 0;' },
      { nombre: 'wizard-nav: en el celular, con otro alto que el que deja el body', de: 'body.con-barra-lateral .wizard-nav { bottom: calc(68px + env(safe-area-inset-bottom, 0px));', a: 'body.con-barra-lateral .wizard-nav { bottom: calc(60px + env(safe-area-inset-bottom, 0px));' },
      { nombre: 'wizard-nav: en el celular, el safe-area dos veces', de: 'bottom: calc(68px + env(safe-area-inset-bottom, 0px)); padding-bottom: 0.75rem; }\n    }\n    /* El sticky', a: 'bottom: calc(68px + env(safe-area-inset-bottom, 0px)); padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px)); }\n    }\n    /* El sticky' },
      { nombre: 'wizard-nav: el body vuelve a hidden (nada se pega)', de: 'body:has(> #vista-wizard:not([hidden])) { overflow-x: clip; }', a: 'body:has(> #vista-wizard:not([hidden])) { overflow-x: hidden; }' },
      { nombre: 'wizard-nav: el wizard deja de ser hijo directo del body', de: '  <div id="vista-wizard" hidden>\n', a: '  <div class="envoltorio">\n  <div id="vista-wizard" hidden>\n' },
      { nombre: 'wizard-nav: sin el scroll-padding de la compu', de: '    html:has(> body > #vista-wizard:not([hidden])) { scroll-padding-bottom: 88px; }\n', a: '' },
      { nombre: 'wizard-nav: en el celular, el scroll-padding sin la barra pegada', de: 'scroll-padding-bottom: calc(76px + 88px + env(safe-area-inset-bottom, 0px));', a: 'scroll-padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));' },
      { nombre: 'wizard-nav: un paso con la barra dentro del contenido', de: '        <div id="ocr-estado" hidden></div>\n      </div>\n      <div class="wizard-nav">\n        <button class="btn btn--secundario" id="btn-sin-foto">Sin comprobante</button>\n        <button class="btn btn--primario" id="btn-foto-siguiente" disabled>Siguiente →</button>\n      </div>\n', a: '        <div id="ocr-estado" hidden></div>\n      <div class="wizard-nav">\n        <button class="btn btn--secundario" id="btn-sin-foto">Sin comprobante</button>\n        <button class="btn btn--primario" id="btn-foto-siguiente" disabled>Siguiente →</button>\n      </div>\n      </div>\n' },
    ],
  },
  {
    suite: SUITE, original: m('caja.html'), variable: 'ARCHIVO_CAJA', funciones: [],
    manuales: [
      { nombre: 'la ficha vuelve a ir encima de todo', de: '    #vista-detalle-persona:not([hidden]) {\n      display: flex;', a: '    #vista-detalle-persona:not([hidden]) {\n      position: fixed; inset: 0; z-index: 50; background: var(--color-superficie);\n      display: flex;' },
      { nombre: 'abrir la ficha no va arriba', de: "      document.getElementById('vista-detalle-persona').removeAttribute('hidden')\n      window.scrollTo(0, 0)\n", a: "      document.getElementById('vista-detalle-persona').removeAttribute('hidden')\n" },
      { nombre: 'cerrar la ficha va arriba de todo', de: 'window.scrollTo(0, scrollDelListado)', a: 'window.scrollTo(0, 0)' },
      { nombre: 'la altura se anota sin mirar si el listado está a la vista', de: "if (!document.getElementById('vista-lista-caja').hidden) scrollDelListado = window.scrollY || 0", a: 'scrollDelListado = window.scrollY || 0' },
      { nombre: 'la ficha sin el ícono de Caja', de: '        <button type="button" class="cab-modulo__volver" id="btn-volver-ficha">‹ Volver</button>\n        <span class="cab-modulo__icono"', a: '        <button type="button" class="cab-modulo__volver" id="btn-volver-ficha">‹ Volver</button>\n        <span class="caja-icono"' },
      { nombre: 'se pierde el id del nombre en la ficha', de: '<span id="detalle-persona-nombre"></span>', a: '<span></span>' },
    ],
  },
  {
    suite: SUITE, original: m('produccion-gestion.html'), variable: 'ARCHIVO_PRODUCCION_GESTION', funciones: [],
    manuales: [
      { nombre: 'el menú del celular vuelve a ir encima de todo', de: '        display: flex; border-right: none; min-width: 0;', a: '        display: flex; position: fixed; inset: 0; z-index: 50; border-right: none; min-width: 0;' },
      { nombre: 'con el menú abierto se ve también el contenido', de: '      body.pg-menu-abierto .pg-contenido { display: none; }\n', a: '' },
      { nombre: 'la página queda trabada con el menú abierto', de: '      body.pg-menu-abierto .pg-contenido { display: none; }\n', a: '      body.pg-menu-abierto .pg-contenido { display: none; }\n      body.pg-menu-abierto { overflow: hidden; }\n' },
      { nombre: 'abrir el menú no va arriba', de: "      window.scrollTo(0, 0)\n      document.getElementById('pr-menu-cerrar').focus?.()", a: "      document.getElementById('pr-menu-cerrar').focus?.()" },
      { nombre: 'la hoja de PINes deja de tapar (la excepción sobra)', de: '      position: fixed; inset: 0; z-index: 60; background: #fff; overflow-y: auto; padding: 1.5rem;', a: '      position: fixed; inset: 0; z-index: 60; background: rgba(255, 255, 255, 0.9); overflow-y: auto; padding: 1.5rem;' },
    ],
  },
  {
    suite: SUITE, original: m('cobranzas.html'), variable: 'ARCHIVO_COBRANZAS', funciones: [],
    manuales: [
      { nombre: 'en la compu la barra de abajo tapa el pie de la lateral', de: 'body.con-barra-lateral .cob-barra-fija { left: var(--ancho-barra-lateral, 0px); }', a: 'body.con-barra-lateral .cob-barra-fija { left: 0; }' },
      { nombre: 'en el celular la barra de abajo tapa la de la app', de: 'body.con-barra-lateral .cob-barra-fija { bottom: calc(68px + env(safe-area-inset-bottom, 0px));', a: 'body.con-barra-lateral .cob-barra-fija { bottom: 0;' },
      { nombre: 'el subtítulo pierde su id', de: '<span class="cab-modulo__sub" id="cob-subtitulo">Listado</span>', a: '<span class="cab-modulo__sub">Listado</span>' },
    ],
  },
  {
    suite: SUITE, original: m('administracion.html'), variable: 'ARCHIVO_ADMINISTRACION', funciones: [],
    manuales: [
      { nombre: 'cheques: en el celular la barra tapa la de abajo', de: 'body.con-barra-lateral .chq-barra { bottom: calc(68px + env(safe-area-inset-bottom, 0px)); padding-bottom: 0.625rem; }', a: '' },
      { nombre: 'cheques: en la compu la barra tapa el pie de la lateral', de: 'body.con-barra-lateral .chq-barra { left: var(--ancho-barra-lateral, 0px); }', a: '' },
      { nombre: 'una barra fija de abajo nueva sin revisar', de: '    .chq-barra {\n      position: fixed;', a: '    .chq-barra-nueva { position: fixed; left: 0; right: 0; bottom: 0; }\n    .chq-barra {\n      position: fixed;' },
    ],
  },
  {
    suite: SUITE, original: m('stock.html'), variable: 'ARCHIVO_STOCK', funciones: [],
    manuales: [
      { nombre: 'stock: el título dice otra cosa', de: '<span class="cab-modulo__titulo">Stock</span>', a: '<span class="cab-modulo__titulo">Stock actual</span>' },
      { nombre: 'stock: el Volver sin el estilo de los módulos', de: 'class="cab-modulo__volver stock-header__volver"', a: 'class="stock-header__volver"' },
      { nombre: 'stock: vuelve "Seis Destinos" al encabezado', de: '<span class="cab-modulo__titulo">Stock</span>', a: '<span class="cab-modulo__titulo">Stock</span><span>Seis Destinos</span>' },
    ],
  },
  {
    suite: SUITE, original: m('accesos.html'), variable: 'ARCHIVO_ACCESOS', funciones: [],
    manuales: [
      { nombre: 'accesos: el encabezado con otro tono', de: '--cab-modulo: oklch(0.50 0.07 205)', a: '--cab-modulo: oklch(0.50 0.07 210)' },
    ],
  },
  {
    suite: SUITE, original: m('cuentas-corrientes.html'), variable: 'ARCHIVO_CUENTAS_CORRIENTES', funciones: [],
    manuales: [
      { nombre: 'cc: el fondo del ícono con otra cuenta', de: '--cab-modulo-suave: oklch(0.955 0.042 322)', a: '--cab-modulo-suave: oklch(0.955 0.050 322)' },
      { nombre: 'cc: la ficha sin el Volver de los módulos', de: '<button type="button" class="cab-modulo__volver" id="btn-cerrar-ficha">', a: '<button type="button" class="btn" id="btn-cerrar-ficha">' },
    ],
  },
  {
    suite: SUITE, original: path.join(RAIZ, 'css/main.css'), variable: 'ARCHIVO_MAIN_CSS', funciones: [],
    manuales: [
      { nombre: 'el encabezado con z-index (taparía algo)', de: '  min-height: 58px; padding: 14px 0 4px; margin: 0 0 12px; font-family: var(--fuente);', a: '  min-height: 58px; padding: 14px 0 4px; margin: 0 0 12px; font-family: var(--fuente); z-index: 40;' },
      { nombre: 'el encabezado vuelve a ser tarjeta', de: '  min-height: 58px; padding: 14px 0 4px; margin: 0 0 12px; font-family: var(--fuente);', a: '  min-height: 58px; padding: 14px 0 4px; margin: 0 0 12px; font-family: var(--fuente); box-shadow: var(--sombra-suave);' },
      { nombre: 'en el celular no va de lado a lado', de: '    margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); padding: 8px 16px; gap: 8px 10px;', a: '    padding: 8px 16px; gap: 8px 10px;' },
      { nombre: 'el título sin la letra de títulos', de: '  font-family: var(--fuente-titulo); font-size: 22px; font-weight: 700; letter-spacing: -0.03em; color: var(--color-texto);\n  min-width: 0; overflow-wrap: anywhere;', a: '  font-size: 22px; font-weight: 700; letter-spacing: -0.03em; color: var(--color-texto);\n  min-width: 0; overflow-wrap: anywhere;' },
      { nombre: 'una vista sin nombre deja la "/" sola', de: '.cab-modulo__sub:empty { display: none; }\n', a: '' },
      { nombre: 'el Volver chico para el dedo', de: '  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; min-height: 40px; padding: 0 12px;', a: '  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; min-height: 28px; padding: 0 12px;' },
      { nombre: 'el ícono sin el color del módulo', de: '  background: var(--cab-modulo-suave); color: var(--cab-modulo); overflow: hidden;', a: '  background: var(--color-pista); color: var(--color-texto); overflow: hidden;' },
    ],
  },
])
