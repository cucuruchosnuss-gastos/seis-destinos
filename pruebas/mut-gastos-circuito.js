// Mutaciones de test-gastos-circuito.js. Ver mutar.js.
//
//   node pruebas/mut-gastos-circuito.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-circuito.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: ['htmlAvisoPostGasto', 'htmlIngresosSinGasto', 'renderizarIngresosSinGasto'],
  manuales: [
    { nombre: 'el href del gasto pierde encodeURIComponent',
      de: 'desde_gasto=${encodeURIComponent(p.gastoId)}', a: 'desde_gasto=${p.gastoId}' },
    { nombre: 'el espejo en CC solo se llama con proveedor con cuenta corriente',
      de: 'if (datosGasto.proveedor_id && !estado.wizard.esPendiente) {', a: 'if (datosGasto.proveedor_id && proveedorTieneCuentaCorriente(datosGasto.proveedor_id) && !estado.wizard.esPendiente) {' },
    { nombre: 'dice "registrado en cuenta corriente" aunque sea un ocasional',
      de: 'else enCuentaCorriente = proveedorTieneCuentaCorriente(datosGasto.proveedor_id)', a: 'else enCuentaCorriente = true' },
    { nombre: 'desde un ingreso no se vincula',
      de: '        if (desdeIngreso) {\n          try {', a: '        if (false) {\n          try {' },
    { nombre: 'la falta de ingreso se calcula también viniendo de un ingreso',
      de: 'if (!desdeIngreso && categoriaEsMateriaPrima(datosGasto.categoria_id)) {', a: 'if (categoriaEsMateriaPrima(datosGasto.categoria_id)) {' },
    { nombre: 'el error de CC se recorta',
      de: "texto: `El gasto quedó guardado, pero la cuenta corriente no se actualizó: ${p.errorCuentaCorriente}`", a: "texto: 'El gasto quedó guardado, pero la cuenta corriente no se actualizó.'" },
    { nombre: 'el error de CC no dice qué hacer',
      de: "        lineas.push({ nivel: 'error', texto: 'No lo cargues de nuevo: corregí lo que dice el mensaje desde Cuentas Corrientes, o avisale a administración.' })\n", a: '' },
    { nombre: 'sin permiso igual ofrece el botón de ingresar',
      de: 'const ingresar = (p.faltaIngreso && p.puedeIngresar)', a: 'const ingresar = (p.faltaIngreso)' },
    { nombre: 'gastoFaltaIngresar ignora la lista de la base',
      de: 'if (!error) return (data ?? []).some(f => f.gasto_id === gastoId)', a: 'if (!error) return true' },
    { nombre: 'gastoFaltaIngresar sin permiso ignora la fecha',
      de: "return !!estado.fechaInicioCircuito && !!fecha && String(fecha) >= estado.fechaInicioCircuito", a: 'return true' },
    // Sacar el guard del vacío sería EQUIVALENTE: Number('') es 0 y el n > 0
    // de abajo ya lo rechaza. Lo que sí mide es aflojar ese n > 0.
    { nombre: 'importeDeOcr acepta el 0 (el vacío pasa a mostrarse $ 0,00)',
      de: 'return Number.isFinite(n) && n > 0 ? n : null', a: 'return Number.isFinite(n) && n >= 0 ? n : null' },
    { nombre: 'la lista se consulta sin gastos:ver_exportar',
      de: "if (!tieneTarea('gastos', 'ver_exportar')) { estado.ingresosSinGasto = []; renderizarIngresosSinGasto(); return }", a: '' },
    { nombre: 'el error de ingresos_sin_gasto se tapa',
      de: "estado.errorIngresosSinGasto = error.message || 'No se pudo cargar la lista de facturas ingresadas sin gasto.'", a: "estado.errorIngresosSinGasto = 'Error.'" },
    { nombre: 'la lista vacía se dibuja igual',
      de: '      seccion.hidden = !filas.length\n      document.getElementById(\'ingresos-sin-gasto-titulo\')', a: '      seccion.hidden = false\n      document.getElementById(\'ingresos-sin-gasto-titulo\')' },
    { nombre: 'resetearWizard borra el ingreso de origen',
      de: '    function resetearWizard() {\n      estado.wizard.subpaso    = \'foto\'', a: '    function resetearWizard() {\n      estado.wizard.desdeIngreso = null\n      estado.wizard.subpaso    = \'foto\'' },
    { nombre: 'el aviso "desde ingreso" pasa a innerHTML',
      de: "      el.textContent = `Cargando el gasto de la mercadería ya ingresada:", a: "      el.innerHTML = `Cargando el gasto de la mercadería ya ingresada:" },
  ],
})
