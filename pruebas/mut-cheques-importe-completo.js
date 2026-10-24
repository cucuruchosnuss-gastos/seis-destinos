// Mutaciones de test-cheques-importe-completo.js (importe completo de los
// cheques y los gastos del banco aparte, 24/10/2026). Ver mutar.js. Dos
// archivos: la región de Cheques de administracion.html y gastos.html.
//
//   node pruebas/mut-cheques-importe-completo.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cheques-importe-completo.js')

correrMutacionesEnVarios([
  {
    region: limitesCheques,
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
    escape: 'esc',
    funciones: ['htmlGastosBanco'],
    manuales: [
      // La categoría y el botón
      { nombre: 'el id de la categoría equivocado', de: "id: '7041825a-5a0c-484b-be07-17f9978a0d97', nombre: 'Gastos bancarios y comisiones'", a: "id: '7041825a-5a0c-484b-be07-17f9978a0d98', nombre: 'Gastos bancarios y comisiones'" },
      { nombre: 'la categoría con el nombre viejo', de: "nombre: 'Gastos bancarios y comisiones' }", a: "nombre: 'Intereses-Venta de cheques' }" },
      { nombre: 'el botón sin la categoría', de: 'href="gastos.html?nuevo=1&amp;categoria=${encodeURIComponent(CATEGORIA_GASTOS_BANCARIOS.id)}', a: 'href="gastos.html?nuevo=1&amp;categoria=' },
      { nombre: 'el botón sin ?nuevo=1', de: 'href="gastos.html?nuevo=1&amp;categoria=', a: 'href="gastos.html?categoria=' },
      { nombre: 'la fábrica sin encodeURIComponent', de: '&amp;unidad=${encodeURIComponent(unidad)}', a: '&amp;unidad=${unidad}' },
      { nombre: 'sin fábrica viaja "null"', de: "      const unidad = unidadId || ''\n", a: '      const unidad = unidadId\n' },
      { nombre: 'nunca en otra pestaña', de: "const destino = nuevaPestana ? ' target=\"_blank\" rel=\"noopener\"' : ''", a: "const destino = ''" },
      { nombre: 'siempre en otra pestaña', de: "const destino = nuevaPestana ? ' target=\"_blank\" rel=\"noopener\"' : ''", a: "const destino = ' target=\"_blank\" rel=\"noopener\"'" },
      { nombre: 'la frase sin "Entran"', de: ".join(' ')\n      const texto = `${entran}", a: ".join(' ')\n      const texto = `" },
      { nombre: 'la frase con otro nombre de categoría', de: "categoría '${CATEGORIA_GASTOS_BANCARIOS.nombre}'.`", a: "categoría 'Gastos bancarios'.`" },
      // Vender
      { nombre: 'vender sin el aviso de los gastos aparte', de: "        html += htmlGastosBanco([{ cuenta: cuenta?.nombre ?? 'la cuenta elegida', centavos: brutoCent }], cuenta?.unidad_negocio_id ?? null, { nuevaPestana: true })\n", a: "        html += `<div><span>Entran ${esc(formatearImporte(brutoCent / 100))}.</span></div>`\n" },
      { nombre: 'vender: el botón sin la fábrica de la cuenta', de: "centavos: brutoCent }], cuenta?.unidad_negocio_id ?? null, { nuevaPestana: true })", a: "centavos: brutoCent }], null, { nuevaPestana: true })" },
      { nombre: 'vender: el botón en la misma pestaña (se pierde el diálogo)', de: "centavos: brutoCent }], cuenta?.unidad_negocio_id ?? null, { nuevaPestana: true })", a: "centavos: brutoCent }], cuenta?.unidad_negocio_id ?? null)" },
      { nombre: 'vender: p_neto en centavos', de: 'p.p_neto = (Number(brutoCent) || 0) / 100', a: 'p.p_neto = (Number(brutoCent) || 0)' },
      { nombre: 'vender: p_neto vacío', de: 'p.p_neto = (Number(brutoCent) || 0) / 100', a: 'p.p_neto = null' },
      { nombre: 'depositar también manda neto', de: "      if (tipo === 'vendido') {\n        p.p_neto", a: "      {\n        p.p_neto" },
      { nombre: 'el aviso de la venta sin los gastos aparte', de: ' en ${cuenta}. Los gastos del banco se cargan aparte en Gastos.`', a: ' en ${cuenta}.`' },
      // La lista
      { nombre: 'una venta por el importe completo dice "acreditó … ($ 0,00 de interés)"', de: '        if (interes !== 0) acredito =', a: '        acredito =' },
      // Acreditar
      { nombre: 'acreditar vuelve a mandar lo acreditado', de: 'p_items: cheques.map(ch => ({ cheque_id: ch.id }))', a: 'p_items: cheques.map(ch => ({ cheque_id: ch.id, acreditado: ch.importe }))' },
      { nombre: 'acreditar: el resumen sin el aviso', de: "      html += htmlGastosBanco(entradas.map(e => ({ cuenta: e.cuenta, centavos: e.centavos })), unidadUnicaDe(entradas), { nuevaPestana: true })\n", a: '' },
      { nombre: 'acreditar: el resumen en la misma pestaña', de: 'unidadUnicaDe(entradas), { nuevaPestana: true })', a: 'unidadUnicaDe(entradas))' },
      { nombre: 'acreditar: las cuentas todas juntas', de: "        const k = ch?.salida_cuenta_id ?? ''\n", a: "        const k = ''\n" },
      { nombre: 'acreditar: el total por cuenta en pesos sueltos', de: '        e.centavos += aCentavos(ch?.importe)\n', a: '        e.centavos += Number(ch?.importe)\n' },
      { nombre: 'la fábrica de dos cuentas distintas: la primera', de: 'return us.size === 1 ? us.values().next().value : null', a: 'return us.size >= 1 ? us.values().next().value : null' },
      { nombre: 'el resultado sin el botón', de: '      if (lineas.length) lineas.push(htmlGastosBanco(', a: '      if (false) lineas.push(htmlGastosBanco(' },
      { nombre: 'el resultado con el botón aunque no haya respuesta', de: '      if (lineas.length) lineas.push(htmlGastosBanco(', a: '      lineas.push(htmlGastosBanco(' },
      { nombre: 'el resultado: lo acreditado y no lo que entró', de: '        const entro = r?.bruto ?? r?.acreditado', a: '        const entro = 0' },
      { nombre: 'el resultado dice el gasto de intereses', de: "return `<div>Entró ${esc(formatearImporte(entro))} en ${esc(r?.cuenta ?? 'la cuenta')}</div>`", a: "return `<div>Entró ${esc(formatearImporte(entro))} en ${esc(r?.cuenta ?? 'la cuenta')} · gasto de intereses</div>`" },
    ],
  },
  {
    suite: SUITE,
    variable: 'ARCHIVO_GASTOS_TEST',
    original: path.join(RAIZ, 'modulos', 'gastos.html'),
    funciones: [],
    manuales: [
      { nombre: 'Gastos: el ícono de los gastos bancarios', de: "'Gastos bancarios y comisiones': 'landmark',", a: "'Gastos bancarios y comisiones': 'tag'," },
      { nombre: 'Gastos: el nombre viejo en el mapa', de: "'Gastos bancarios y comisiones': 'landmark',", a: "'Intereses-Venta de cheques': 'landmark'," },
      { nombre: 'Gastos: la categoría solo por id', de: " ?? lista.find(c => String(c.nombre ?? '').toLocaleLowerCase('es') === v.toLocaleLowerCase('es'))", a: '' },
      { nombre: 'Gastos: la categoría sin recortar espacios', de: "      const v = String(valor ?? '').trim()\n      if (!v) return null\n      const lista", a: "      const v = String(valor ?? '')\n      if (!v) return null\n      const lista" },
      { nombre: 'Gastos: no se elige la categoría', de: '      if (cat) categoriaSeleccionada = cat.id\n      if (unidad &&', a: '      if (unidad &&' },
      { nombre: 'Gastos: no se elige la fábrica', de: "      if (unidad && unidadesElegibles().some(u => u.id === unidad)) { unidadSeleccionada = unidad; viaVehiculos = false }\n", a: '' },
      { nombre: 'Gastos: cualquier fábrica de la URL', de: 'if (unidad && unidadesElegibles().some(u => u.id === unidad))', a: 'if (unidad)' },
      { nombre: 'Gastos: con el wizard cerrado sigue', de: "      if (document.getElementById('vista-wizard').hidden) return\n      const cat = categoriaDeURL", a: '      const cat = categoriaDeURL' },
      { nombre: 'Gastos: la grilla de categorías no se repinta', de: '      renderizarGrillaDestino()\n      renderizarGrillaCategorias()\n    }\n\n    // "Cargar gasto" de una factura', a: '      renderizarGrillaDestino()\n    }\n\n    // "Cargar gasto" de una factura' },
      { nombre: 'Gastos: el deep link también con ?gasto', de: "if (paramsNuevoURL.get('nuevo') === '1' && !idGastoURL && !idFacturaURL) {", a: "if (paramsNuevoURL.get('nuevo') === '1') {" },
      { nombre: 'Gastos: el deep link sin la fábrica', de: "abrirWizardConCategoria(paramsNuevoURL.get('categoria'), paramsNuevoURL.get('unidad'))", a: "abrirWizardConCategoria(paramsNuevoURL.get('categoria'))" },
      { nombre: 'Gastos: el deep link frena el arranque (await)', de: "      abrirWizardConCategoria(paramsNuevoURL.get('categoria'), paramsNuevoURL.get('unidad'))\n        .catch(", a: "      await abrirWizardConCategoria(paramsNuevoURL.get('categoria'), paramsNuevoURL.get('unidad'))\n        .catch(" },
    ],
  },
])
