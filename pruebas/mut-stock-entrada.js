// Mutaciones de test-stock-entrada.js: las dos entradas de Stock (sobre
// stock.html), el "‹ Stock" y el "solo stock" de la gestión de Producción
// (por ARCHIVO_GESTION). De a una. Ver mutar.js.
//
//   node pruebas/mut-stock-entrada.js
'use strict'

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const SUITE = path.join(__dirname, 'test-stock-entrada.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: path.join(__dirname, '..', 'modulos', 'stock.html'),
    funciones: [],
    manuales: [
      { nombre: 'nunca muestra la elección', de: "      if (insumos && terminado) return 'eleccion'\n", a: '' },
      { nombre: 'la elección aunque falte uno', de: "      if (insumos && terminado) return 'eleccion'", a: "      if (insumos || terminado) return 'eleccion'" },
      { nombre: 'solo terminado cae en sin acceso', de: "      if (terminado) return 'terminado'\n      return 'sin'", a: "      return 'sin'" },
      { nombre: '?vista=terminado no se respeta', de: "      if (pedida === 'terminado') return terminado ? 'terminado' : (insumos ? 'insumos' : 'sin')\n", a: '' },
      { nombre: '?vista=insumos no saltea la elección', de: "    const VISTAS_DE_INSUMOS = ['insumos', 'catalogo', 'costos', 'traspaso']", a: "    const VISTAS_DE_INSUMOS = ['catalogo', 'costos', 'traspaso']" },
      { nombre: 'el terminado sin Producción (solo stock:ver)', de: "      return estado.miRolApp === 'super_admin' || estado.misTareas.has('stock:ver') ||\n", a: "      return estado.miRolApp === 'super_admin' ||\n" },
      { nombre: 'el terminado sin produccion:ver', de: "        estado.misTareas.has('produccion:ver') || estado.misTareas.has('produccion:configurar')", a: "        estado.misTareas.has('produccion:configurar')" },
      { nombre: 'no lee las tareas de producción', de: "        .in('modulo', ['stock', 'retiros', 'produccion'])", a: "        .in('modulo', ['stock', 'retiros'])" },
      { nombre: 'con desde=stock aunque no haya insumos', de: '        window.location.replace(urlTerminado(insumos))', a: '        window.location.replace(urlTerminado(true))' },
      { nombre: 'nunca con desde=stock', de: "      return 'produccion-gestion.html?vista=stock' + (conVolver ? '&desde=stock' : '')", a: "      return 'produccion-gestion.html?vista=stock'" },
      { nombre: 'sin acceso no frena', de: "      if (entrada === 'sin') {\n        document.getElementById('sin-acceso').hidden = false\n        return\n      }\n", a: '' },
      { nombre: 'la elección no saca el body', de: "      document.body?.classList.remove('stock-en-eleccion')", a: '' },
      { nombre: 'volver no vuelve a la elección', de: '      if (estado.hayEleccion && !estado.enEleccion) {\n        e.preventDefault()', a: '      if (false) {\n        e.preventDefault()' },
      { nombre: 'volver se traba en la elección', de: '      if (estado.hayEleccion && !estado.enEleccion) {\n        e.preventDefault()', a: '      if (estado.hayEleccion) {\n        e.preventDefault()' },
      { nombre: 'hayEleccion siempre', de: '      estado.hayEleccion = insumos && terminado', a: '      estado.hayEleccion = true' },
      { nombre: 'el botón de insumos sin conectar', de: "    document.getElementById('btn-entrada-insumos').addEventListener('click', salirDeEleccion)\n", a: '' },
      { nombre: 'en la compu una arriba de la otra', de: '      .stock-eleccion { grid-template-columns: 1fr 1fr; }', a: '      .stock-eleccion { grid-template-columns: 1fr; }' },
      { nombre: 'el subtítulo de la elección se pisa', de: "estado.enEleccion ? 'Elegí qué mirar' : SUBTITULO_VISTA[id]", a: 'SUBTITULO_VISTA[id]' },
    ],
  },
  {
    suite: SUITE,
    original: path.join(__dirname, '..', 'modulos', 'produccion-gestion.html'),
    variable: 'ARCHIVO_GESTION',
    funciones: [],
    manuales: [
      { nombre: 'solo stock: las unidades de Producción', de: '      if (estado.soloStock) return [...estado.unidades.keys()].filter(id => puedeVerStockEn(id) === true)\n', a: '' },
      { nombre: 'solo stock: con menú', de: "      if (estado.soloStock) { document.getElementById('pr-menu').hidden = true; return }\n", a: '' },
      { nombre: 'desde Stock: no dice "‹ Stock"', de: "      if (desdeStock) return { texto: '‹ Stock', url: 'stock.html' }\n", a: '' },
      { nombre: 'solo stock vuelve a Stock (rebotaría)', de: "      if (soloStock) return { texto: '‹ Inicio', url: '../dashboard.html' }", a: "      if (soloStock) return { texto: '‹ Stock', url: 'stock.html' }" },
      { nombre: 'el botón sigue escondido en la compu', de: "      btn.classList.remove('pg-volver-menu')\n", a: '' },
      { nombre: 'volver siempre abre el menú', de: '      if (estado.volverStock) { window.location.href = estado.volverStock; return }\n', a: '' },
      { nombre: 'el botón del stock abre el menú directo', de: "getElementById('pr-stock-volver').addEventListener('click', alVolverDelStock)", a: "getElementById('pr-stock-volver').addEventListener('click', abrirMenu)" },
      { nombre: 'desde=stock no se lee', de: "        return { vista: p.get('vista'), desdeStock: p.get('desde') === 'stock' }", a: "        return { vista: p.get('vista'), desdeStock: false }" },
      { nombre: 'solo stock con cualquier vista', de: "      if (!puedeVerGestion() && entradaUrl.vista === 'stock') {", a: '      if (!puedeVerGestion()) {' },
      { nombre: 'sin Producción siempre rebota', de: '      if (!puedeVerGestion() && !estado.soloStock) {', a: '      if (!puedeVerGestion()) {' },
      { nombre: 'solo stock abre la tabla', de: "      const entrada = estado.soloStock ? 'stock' : vistaDeEntrada(window.location?.search)", a: '      const entrada = vistaDeEntrada(window.location?.search)' },
      { nombre: 'desde Stock la dirección se limpia', de: '      if (!estado.desdeStock && !estado.soloStock && window.location?.search', a: '      if (window.location?.search' },
    ],
  },
])
