// Mutaciones de test-numeros-plata.js. Ver mutar.js (los tres guards).
//
//   node pruebas/mut-numeros-plata.js
//
// Cada una vuelve a formatear un número a mano, de a una. Todas tienen que dar
// ROJO.

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-numeros-plata.js')

correrMutacionesEnVarios([
  {
    suite: SUITE, variable: 'ARCHIVO_TEST_MP',
    original: path.join(RAIZ, 'modulos/materia-prima.html'),
    funciones: [],
    manuales: [
      { nombre: 'Ingreso: la plata vuelve a toLocaleString con maximumFractionDigits ("$387.300,5")',
        de: "      return '$' + formatearNumeroAr(num, { decimales: 2 })",
        a: "      return '$' + num.toLocaleString('es-AR', { maximumFractionDigits: 2 })" },
      { nombre: 'Ingreso: la plata recorta los ceros con minimos: 0',
        de: "      return '$' + formatearNumeroAr(num, { decimales: 2 })",
        a: "      return '$' + formatearNumeroAr(num, { decimales: 2, minimos: 0 })" },
      { nombre: 'Ingreso: importeConMoneda arma el número a mano',
        de: "      const base = formatearImporteDuplicado(v)\n",
        a: "      const base = v == null || v === '' ? null : '$' + String(v)\n" },
    ],
  },
  {
    suite: SUITE, variable: 'ARCHIVO_TEST_GASTOS',
    original: path.join(RAIZ, 'modulos/gastos.html'),
    funciones: [],
    manuales: [
      { nombre: 'Gastos: formatearImporteDuplicado recorta los ceros',
        de: "'$' + formatearNumeroAr(num, { decimales: 2 })",
        a: "'$' + formatearNumeroAr(num, { decimales: 2, minimos: 0 })" },
      { nombre: 'Gastos: el kilometraje sin punto de miles',
        de: "      return `${formatearNumeroAr(n, { decimales: 0 })} km`",
        a: "      return `${n} km`" },
      { nombre: 'Gastos: el kilometraje en cero se dibuja',
        de: "      if (!Number.isFinite(n) || n === 0) return null",
        a: "      if (!Number.isFinite(n)) return null" },
      { nombre: 'Gastos: el detalle vuelve a mostrar el kilometraje crudo',
        de: "          ${fila('Kilometraje', textoKilometraje(g.kilometraje))}",
        a: "          ${fila('Kilometraje', g.kilometraje ? `${g.kilometraje} km` : null)}" },
      { nombre: 'Gastos: la tasa del interés vuelve a toFixed',
        de: "`≈ ${formatearNumeroAr(tasaAnual, { decimales: 2 })} % anual`",
        a: "`≈ ${tasaAnual.toFixed(2)}% anual`" },
    ],
  },
])
