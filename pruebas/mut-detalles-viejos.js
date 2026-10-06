// Mutaciones de test-detalles-viejos.js. Ver mutar.js (mismos guards). De a una.
//
//   node pruebas/mut-detalles-viejos.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-detalles-viejos.js')
const RAIZ = path.join(__dirname, '..')
const tanda = (variable, rel, manuales) => ({ suite, original: path.join(RAIZ, rel), funciones: [], variable, manuales })

correrMutacionesEnVarios([
  tanda('ARCHIVO_CSS', 'css/main.css', [
    { nombre: 'la barra de abajo vuelve a tapar el botón', de: '  html:has(> body.con-barra-lateral) { scroll-padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }\n', a: '' },
    { nombre: 'el scroll-padding más chico que la barra', de: 'scroll-padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));', a: 'scroll-padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));' },
  ]),
  tanda('ARCHIVO_GASTOS', 'modulos/gastos.html', [
    { nombre: 'la grilla de fechas del wizard vuelve a 1fr 1fr', de: 'grid-template-columns:repeat(2, minmax(0, 1fr)); gap:0.75rem;', a: 'grid-template-columns:1fr 1fr; gap:0.75rem;' },
    { nombre: 'las fechas de los filtros vuelven al 100 %', de: '      width: auto;\n      padding: 0.4375rem 0.75rem;', a: '      padding: 0.4375rem 0.75rem;' },
    { nombre: 'el importe del wizard sin puntos de miles', de: "enlazarCampoNumero(document.getElementById('campo-importe'), { decimales: 2 })", a: "(document.getElementById('campo-importe'), { decimales: 2 })" },
    { nombre: 'el interés sin puntos de miles', de: "enlazarCampoNumero(document.getElementById('campo-interes-monto'), { decimales: 2 })", a: "(document.getElementById('campo-interes-monto'), { decimales: 2 })" },
    { nombre: 'un <input type="number"> de plata', de: '<input type="text" inputmode="decimal" id="edit-importe">', a: '<input type="number" id="edit-importe">' },
  ]),
  tanda('ARCHIVO_CAJA', 'modulos/caja.html', [
    { nombre: 'el monto de destino del traspaso sin enlazar', de: "const IDS_CAMPOS_MONTO = ['movimiento-monto', 'traspaso-monto', 'traspaso-monto-destino']", a: "const IDS_CAMPOS_MONTO = ['movimiento-monto', 'traspaso-monto']" },
  ]),
  tanda('ARCHIVO_COBRANZAS', 'modulos/cobranzas.html', [
    { nombre: 'el efectivo sin puntos de miles', de: "enlazarCampoNumero(document.getElementById('cob-efectivo'), { decimales: 2 })", a: "(document.getElementById('cob-efectivo'), { decimales: 2 })" },
  ]),
  tanda('ARCHIVO_CC', 'modulos/cuentas-corrientes.html', [
    { nombre: 'los montos del pago repartido sin puntos de miles', de: "cont.querySelectorAll('.monto-fifo').forEach(inp => {\n        enlazarCampoNumero(inp, { decimales: 2 })", a: "cont.querySelectorAll('.monto-fifo').forEach(inp => {\n        (inp, { decimales: 2 })" },
  ]),
  tanda('ARCHIVO_MP', 'modulos/materia-prima.html', [
    { nombre: 'el total de la factura sin puntos de miles', de: 'enlazarCampoNumero(campoTotal, { decimales: 2 })', a: '(campoTotal, { decimales: 2 })' },
  ]),
  tanda('ARCHIVO_STOCK', 'modulos/stock.html', [
    { nombre: 'el precio del traspaso sin puntos de miles', de: "for (const input of cont.querySelectorAll('[data-trp-precio]')) {\n        enlazarCampoNumero(input, { decimales: 2 })", a: "for (const input of cont.querySelectorAll('[data-trp-precio]')) {\n        (input, { decimales: 2 })" },
  ]),
  tanda('ARCHIVO_TALLER', 'modulos/taller.html', [
    { nombre: 'el valor de la hora sin puntos de miles', de: 'if (v) enlazarCampoNumero(v, { decimales: 2 })', a: 'if (v) (v, { decimales: 2 })' },
  ]),
  tanda('ARCHIVO_ADM', 'modulos/administracion.html', [
    { nombre: 'el saldo inicial sin puntos de miles', de: "enlazarCampoNumero(document.getElementById('ad-saldo-importe')", a: "(document.getElementById('ad-saldo-importe')" },
    { nombre: 'el ajuste sin puntos de miles', de: "enlazarCampoNumero(document.getElementById('ad-ajuste-importe')", a: "(document.getElementById('ad-ajuste-importe')" },
    { nombre: 'los precios de valorizar sin puntos de miles', de: "for (const input of cuerpo.querySelectorAll('[data-precio]')) {\n            enlazarCampoNumero(input, { decimales: DECIMALES_PRECIO })", a: "for (const input of cuerpo.querySelectorAll('[data-precio]')) {\n            (input, { decimales: DECIMALES_PRECIO })" },
    { nombre: 'el límite de crédito como texto', de: "['limite_credito', 'importe']", a: "['limite_credito', 'texto']" },
    { nombre: 'sin columnas en la compu', de: '.ad-md--lado { display: grid; grid-template-columns: minmax(300px, 400px) minmax(0, 1fr);', a: '.ad-md--lado { display: block; grid-template-columns: minmax(300px, 400px) minmax(0, 1fr);' },
    { nombre: 'la lista sin su propio scroll', de: '        overflow-y: auto; overscroll-behavior: contain; min-width: 0; padding: 0 4px 8px 0;', a: '        overscroll-behavior: contain; min-width: 0; padding: 0 4px 8px 0;' },
    { nombre: 'la fila abierta sin marcar', de: '.ad-md--lado .ad-fila[aria-current="true"] { background: var(--naranja-suave);', a: '.ad-md--lado .ad-fila[aria-current="true"] { background: var(--color-fondo);' },
    { nombre: 'el "‹ Órdenes" se esconde en la compu', de: '      /* "‹ Órdenes" / "‹ Listas" siguen: vuelven a la lista sola, a todo el ancho. */', a: '      .ad-md--lado #ad-orden-volver { display: none; }' },
    { nombre: 'los filtros de las órdenes, de a uno en la columna angosta', de: '.ad-md--lado .ad-filtros { grid-template-columns: repeat(2, minmax(0, 1fr)); }', a: '.ad-md--lado .ad-filtros { }' },
    { nombre: 'la lista no se muestra al lado', de: '        if (lado && l === lista) el.hidden = false\n', a: '' },
    { nombre: 'en el celular también al lado', de: "try { return !!window.matchMedia?.(MQ_LISTA_DETALLE)?.matches } catch { return false }", a: 'return true' },
    { nombre: 'no recuerda que pasó por la lista', de: '(estado.listasAbiertas ??= new Set()).add(id)', a: '(estado.listasAbiertas ??= new Set())' },
    { nombre: 'sin pasar por la lista también al lado', de: "const lado = !!lista && ladoALado() && !!estado.listasAbiertas?.has(lista)", a: 'const lado = !!lista && ladoALado()' },
    { nombre: 'la fila abierta no se marca', de: "if (id != null && b.dataset?.[clave] === String(id)) b.setAttribute('aria-current', 'true')", a: "if (false) b.setAttribute('aria-current', 'true')" },
    { nombre: 'la marca no se saca al irse', de: "          else b.removeAttribute?.('aria-current')\n", a: '' },
    { nombre: 'clientes también partido', de: "const LISTA_DE_DETALLE = { 'ad-vista-orden': 'ad-vista-ordenes',", a: "const LISTA_DE_DETALLE = { 'ad-vista-cliente': 'ad-vista-clientes', 'ad-vista-orden': 'ad-vista-ordenes'," },
    { nombre: 'al girar no se rearma', de: "window.matchMedia?.(MQ_LISTA_DETALLE)?.addEventListener?.('change', () => aplicarListaDetalle())", a: '' },
    { nombre: 'la tarjeta de cheques se corta arriba', de: '.chq-tarjeta__l1 { display: flex; flex-wrap: wrap;', a: '.chq-tarjeta__l1 { display: flex;' },
    { nombre: 'la tarjeta de cheques se corta abajo', de: '      display: flex;\n      flex-wrap: wrap;\n      row-gap: 0.125rem;', a: '      display: flex;\n      row-gap: 0.125rem;' },
    { nombre: 'el banco vuelve a quedar en 2 px', de: '.chq-tarjeta__l2 > .chq-tarjeta__banco { flex: 1 1 5rem; }', a: '.chq-tarjeta__l2 > .chq-tarjeta__banco { flex: 1 1 auto; }' },
    { nombre: 'el estado vuelve al final', de: '.chq-tarjeta__l2 > .chq-tarjeta__estado { order: 1; }', a: '.chq-tarjeta__l2 > .chq-tarjeta__estado { order: 0; }' },
  ]),
])
