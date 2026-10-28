// Mutaciones de test-cheques-importe-completo.js (importe completo de los
// cheques, 24/10/2026). Ver mutar.js. Dos archivos: la región de Cheques de
// administracion.html y gastos.html.
//
// 28/10/2026: se fue el botón "Cargar el gasto del banco" (htmlGastosBanco,
// unidadUnicaDe, CATEGORIA_GASTOS_BANCARIOS): el gasto lo crea la base al
// acreditar (mut-cheques-acreditar.js). Quedan acá el camino de un solo paso
// ("Ya se acreditó", que no carga gasto y lo dice), lo que entra por cuenta y
// el deep link de Gastos (?nuevo=1&categoria=…), que Gastos sigue teniendo.
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
    funciones: [],
    manuales: [
      // El camino de un solo paso ("Ya se acreditó"): no carga gasto y lo dice
      { nombre: 'la frase sin "Entran"', de: "      return `Entran ${formatearImporte((Number(centavos) || 0) / 100)} a ${cuentaNombre || 'la cuenta elegida'}. ` +", a: "      return `${cuentaNombre || 'la cuenta elegida'}. ` +" },
      { nombre: 'la frase sin decir cómo cargar el gasto', de: "        'Así no se carga ningún gasto del banco: si cobró gastos, sacá el tilde de «Ya se acreditó» y cargalos al acreditar.'", a: "        ''" },
      { nombre: 'sin cuenta dice "undefined"', de: "a ${cuentaNombre || 'la cuenta elegida'}. ` +", a: 'a ${cuentaNombre}. ` +' },
      { nombre: 'vender ya acreditado sin la frase', de: "        html += `<div><span>${esc(textoEntranSinGasto(brutoCent, cuenta?.nombre))}</span></div>`\n", a: '' },
      { nombre: 'vender ya acreditado: la frase con la cuenta de antes', de: 'esc(textoEntranSinGasto(brutoCent, cuenta?.nombre))', a: "esc(textoEntranSinGasto(brutoCent, 'Macro Paz Mirta'))" },
      { nombre: 'vender: p_neto en centavos', de: 'p.p_neto = (Number(brutoCent) || 0) / 100', a: 'p.p_neto = (Number(brutoCent) || 0)' },
      { nombre: 'vender: p_neto vacío', de: 'p.p_neto = (Number(brutoCent) || 0) / 100', a: 'p.p_neto = null' },
      { nombre: 'depositar también manda neto', de: "      if (tipo === 'vendido') {\n        p.p_neto", a: "      {\n        p.p_neto" },
      { nombre: 'el aviso de la venta vuelve a mandar los gastos aparte', de: '        return `${que}: entraron ${entraron} en ${cuenta}.`\n      }', a: '        return `${que}: entraron ${entraron} en ${cuenta}. Los gastos del banco se cargan aparte en Gastos.`\n      }' },
      // La lista
      { nombre: 'una venta por el importe completo dice "acreditó … ($ 0,00 de interés)"', de: '        if (interes !== 0) acredito =', a: '        acredito =' },
      // Acreditar: lo que entra por cuenta
      { nombre: 'acreditar: las cuentas todas juntas', de: "        const k = ch?.salida_cuenta_id ?? ''\n", a: "        const k = ''\n" },
      { nombre: 'acreditar: el total por cuenta en pesos sueltos', de: '        e.centavos += aCentavos(ch?.importe)\n', a: '        e.centavos += Number(ch?.importe)\n' },
      { nombre: 'acreditar: el resumen sin "Entran" por cuenta', de: "      const entran = entradas.map(e => `Entran ${formatearImporte(e.centavos / 100)} a ${e.cuenta}.`).join(' ')", a: "      const entran = ''" },
      { nombre: 'el resultado: una línea por renglón (cuenta y modo) en vez de por cuenta', de: "        porCuenta.set(k, (porCuenta.get(k) ?? 0) + aCentavos(", a: "        porCuenta.set(k + porCuenta.size, (porCuenta.get(k) ?? 0) + aCentavos(" },
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
