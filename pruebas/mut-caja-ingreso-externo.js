// Mutaciones de test-caja-ingreso-externo.js (01/10/2026). Ver mutar.js.
//
//   node pruebas/mut-caja-ingreso-externo.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-ingreso-externo.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/caja.html'),
  funciones: [],
  manuales: [
    { nombre: 'el ingreso externo vuelve a ser de cualquiera con la tarea',
      de: "return estado.miEmpleado?.rol_app === 'super_admin' && tieneTareaExplicita(tarea)", a: 'return tieneTareaExplicita(tarea)' },
    { nombre: 'el super_admin lo ve sin la tarea',
      de: "return estado.miEmpleado?.rol_app === 'super_admin' && tieneTareaExplicita(tarea)", a: "return estado.miEmpleado?.rol_app === 'super_admin'" },
    { nombre: 'la ficha propia vuelve a mirar solo la tarea',
      de: "if (puedoIngresoExterno('ingreso_externo_propio')) {", a: "if (tieneTareaExplicita('ingreso_externo_propio')) {" },
    { nombre: 'la ficha de Empresa vuelve a mirar solo la tarea',
      de: "empleadoId === estado.idEmpresa && puedoIngresoExterno('ingreso_externo_empresa')", a: "empleadoId === estado.idEmpresa && tieneTareaExplicita('ingreso_externo_empresa')" },
    { nombre: 'en Empresa pide la tarea propia',
      de: "empleadoId === estado.idEmpresa && puedoIngresoExterno('ingreso_externo_empresa')", a: "empleadoId === estado.idEmpresa && puedoIngresoExterno('ingreso_externo_propio')" },
    { nombre: 'el botón vuelve a decir "Ingreso externo" a secas',
      de: "const TITULO_INGRESO_EXTERNO = 'Ingreso externo (préstamos, aportes)'", a: "const TITULO_INGRESO_EXTERNO = 'Ingreso externo'" },
    { nombre: 'el título del modal no usa el nombre nuevo',
      de: "getElementById('movimiento-titulo').textContent = TITULO_INGRESO_EXTERNO", a: "getElementById('movimiento-titulo').textContent = 'Ingreso externo'" },
    { nombre: 'el texto de Cobranzas no va en chico',
      de: '    .aviso-ingreso-cliente {\n      font-size: 0.8125rem;', a: '    .aviso-ingreso-cliente {\n      font-size: 1rem;' },
    { nombre: 'el texto de Cobranzas dice otra cosa',
      de: 'hidden>La plata de un cliente se carga en <a', a: 'hidden>Si es de un cliente, va en <a' },
    { nombre: 'el ingreso_ajuste se llama por su tipo',
      de: "ingreso_ajuste: 'Ajuste', egreso_ajuste: 'Ajuste' }", a: "egreso_ajuste: 'Ajuste' }" },
    { nombre: 'el egreso_ajuste se llama por su tipo',
      de: "ingreso_ajuste: 'Ajuste', egreso_ajuste: 'Ajuste' }", a: "ingreso_ajuste: 'Ajuste' }" },
    { nombre: 'el egreso_ajuste no va en gris',
      de: "const ajuste = m.tipo === 'ingreso_ajuste' || m.tipo === 'egreso_ajuste'", a: "const ajuste = m.tipo === 'ingreso_ajuste'" },
    { nombre: 'ningún ajuste va en gris',
      de: "<div class=\"tarjeta-movimiento${ajuste ? ' tarjeta-movimiento--ajuste' : ''}\">", a: '<div class="tarjeta-movimiento">' },
    { nombre: 'la fila del ajuste no dice que no se edita',
      de: '              ${refCobranza}\n              ${refAjuste}\n', a: '              ${refCobranza}\n' },
    { nombre: 'el chip del ajuste no es gris',
      de: '    .chip-tipo-movimiento--egreso_ajuste {\n      background: var(--color-pista);', a: '    .chip-tipo-movimiento--egreso_ajuste {\n      background: var(--amarillo-suave);' },
    { nombre: 'el filtro no ofrece los ajustes',
      de: "      { value: 'ingreso_ajuste',       label: 'Ajuste que suma' },\n", a: '' },
  ],
})
