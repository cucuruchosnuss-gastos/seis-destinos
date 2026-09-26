// Mutaciones de test-cheques-orden.js (Parte 3). Ver mutar.js.
//
//   node pruebas/mut-cheques-orden.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-orden.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: ['htmlEncabezadoOrden', 'pintarOrdenMovil'],
  // htmlEncabezadoOrden recibe SOLO literales del código (la suite lo
  // verifica), y ariaSort y flecha salen de constantes: sacar el esc() no
  // cambia ninguna salida posible. Se escapan igual, por si mañana alguien la
  // llama con un dato.
  equivalentes: [
    { expr: 'esc(clase)', motivo: 'la clase es un literal del código' },
    { expr: 'esc(ariaSort)', motivo: "'none' / 'ascending' / 'descending', constantes" },
    { expr: 'esc(campo)', motivo: 'el campo es un literal del código' },
    { expr: 'esc(flecha)', motivo: "'', '▲' o '▼', constantes" },
    { expr: "esc(c.id + ':' + s)", motivo: "COLUMNAS_ORDEN es una constante del código y s es 'asc' o 'desc'" },
    { expr: 'esc(textoOpcion)', motivo: 'se arma con COLUMNAS_ORDEN y SENTIDO_EN_PALABRAS, constantes del código' },
  ],
  manuales: [
    { nombre: 'el orden por defecto pasa a descendente',
      de: "const ORDEN_DEFECTO = { campo: 'pago', sentido: 'asc' }", a: "const ORDEN_DEFECTO = { campo: 'pago', sentido: 'desc' }" },
    { nombre: 'un común usa su fecha de pago (null) en vez de la emisión',
      de: "case 'pago': return esFechaIso(fechaDeCobroCheque(ch)) ? fechaDeCobroCheque(ch) : null",
      a: "case 'pago': return esFechaIso(ch.fecha_pago) ? ch.fecha_pago : null" },
    { nombre: 'el banco se ordena por código y no por nombre',
      de: "case 'banco': return ch.banco_codigo ? nombreBanco(ch.banco_codigo) : null", a: "case 'banco': return ch.banco_codigo ? String(ch.banco_codigo) : null" },
    { nombre: 'el importe se compara como texto',
      de: "      const col = COLUMNAS_ORDEN.find(c => c.id === orden?.campo) ?? COLUMNAS_ORDEN.find(c => c.id === ORDEN_DEFECTO.campo)",
      a: "      const col0 = COLUMNAS_ORDEN.find(c => c.id === orden?.campo) ?? COLUMNAS_ORDEN.find(c => c.id === ORDEN_DEFECTO.campo)\n      const col = { ...col0, tipo: 'texto' }" },
    { nombre: 'los textos distinguen acentos y mayúsculas',
      de: "return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' })", a: "return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0" },
    { nombre: 'lo sin dato sube arriba en descendente',
      de: "        if (va === null) return 1\n        if (vb === null) return -1\n        const c = compararValores(va, vb, col.tipo)\n        return c !== 0 ? signo * c : desempate(a, b)",
      a: "        if (va === null) return signo\n        if (vb === null) return -signo\n        const c = compararValores(va, vb, col.tipo)\n        return c !== 0 ? signo * c : desempate(a, b)" },
    { nombre: 'el sentido no se aplica',
      de: "        return c !== 0 ? signo * c : desempate(a, b)", a: "        return c !== 0 ? c : desempate(a, b)" },
    { nombre: 'sin desempate',
      de: "        return c !== 0 ? signo * c : desempate(a, b)", a: "        return signo * c" },
    { nombre: 'tocar la misma columna no invierte',
      de: "if (actual?.campo === campo) return { campo, sentido: actual.sentido === 'asc' ? 'desc' : 'asc' }", a: "if (actual?.campo === campo) return { campo, sentido: 'asc' }" },
    { nombre: 'otra columna hereda el sentido',
      de: "      return { campo, sentido: 'asc' }\n    }", a: "      return { campo, sentido: actual?.sentido ?? 'asc' }\n    }" },
    { nombre: 'aplicarOrden vuelve a consultar en vez de reordenar',
      de: "      estado.filas = ordenarCheques(estado.filas, estado.orden, estado.cobranzas)\n      pintarOrdenMovil()\n      renderizarCheques()",
      a: "      pintarOrdenMovil()\n      cargarCheques()" },
    { nombre: 'aplicarOrden no guarda la preferencia',
      de: "      estado.orden = { campo: orden.campo, sentido: orden.sentido === 'desc' ? 'desc' : 'asc' }\n      guardarPreferencias()",
      a: "      estado.orden = { campo: orden.campo, sentido: orden.sentido === 'desc' ? 'desc' : 'asc' }" },
    { nombre: 'aplicarOrden acepta cualquier campo',
      de: "      if (!COLUMNAS_ORDEN.some(c => c.id === orden?.campo)) return\n      estado.orden =", a: "      estado.orden =" },
    { nombre: 'filtrar vuelve al orden por defecto',
      de: "estado.filas = ordenarCheques(filas, estado.orden, new Map(cobs.map(x => [x.id, x])))", a: "estado.filas = ordenarCheques(filas, ORDEN_DEFECTO, new Map(cobs.map(x => [x.id, x])))" },
    { nombre: 'sin aria-sort',
      de: ' aria-sort="${esc(ariaSort)}"', a: '' },
    { nombre: 'aria-sort al revés',
      de: "const ariaSort = !activo ? 'none' : sentido === 'desc' ? 'descending' : 'ascending'", a: "const ariaSort = !activo ? 'none' : sentido === 'desc' ? 'ascending' : 'descending'" },
    { nombre: 'sin flecha',
      de: "const flecha = !activo ? '' : sentido === 'desc' ? '▼' : '▲'", a: "const flecha = ''" },
    { nombre: 'la columna Estado no se ordena',
      de: "            ${htmlEncabezadoOrden('estado', 'Estado')}", a: "            <th scope=\"col\">Estado</th>" },
    { nombre: 'la preferencia de orden no se lee',
      de: "        if (o && COLUMNAS_ORDEN.some(c => c.id === o.campo)) {", a: "        if (false) {" },
    { nombre: 'la preferencia acepta un campo inventado',
      de: "        if (o && COLUMNAS_ORDEN.some(c => c.id === o.campo)) {", a: "        if (o) {" },
    { nombre: 'el tope no dice que el orden es parcial',
      de: 'afiná la búsqueda. El orden es solo sobre esas.`)', a: 'afiná la búsqueda.`)' },
    { nombre: 'el selector del celular se ve en escritorio',
      de: '      .chq-orden-movil { display: none; }\n', a: '' },
    { nombre: 'el select del celular pierde el sentido',
      de: "sel.value = `${estado.orden.campo}:${estado.orden.sentido}`", a: "sel.value = `${estado.orden.campo}:asc`" },
    { nombre: 'el select del celular ofrece un solo sentido',
      de: "COLUMNAS_ORDEN.flatMap(c => ['asc', 'desc'].map(s => {", a: "COLUMNAS_ORDEN.flatMap(c => ['asc'].map(s => {" },
  ],
})
