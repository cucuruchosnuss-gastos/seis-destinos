// Caja: el ingreso externo solo para Facu y Pablo, y los ajustes de saldo
// (01/10/2026).
//
//  - "Ingreso externo (préstamos, aportes)": registrar_ingreso_externo_caja
//    rechaza a quien no es super_admin y sigue pidiendo la tarea explícita de
//    esa caja. La pantalla pide las dos cosas: a los demás no les aparece.
//    Debajo del título, en chico: "La plata de un cliente se carga en
//    Cobranzas".
//  - Los ajustes (ingreso_ajuste / egreso_ajuste), cargados desde la base: en
//    la lista como "Ajuste", con su descripción, en gris y sin nada para
//    editarlos.
// Se EJECUTAN las funciones reales.
//
//   node pruebas/test-caja-ingreso-externo.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const src = leer(ARCHIVO)
const { chk, fin } = arnes()

const FUNCIONES = ['esc', 'importeHtml', 'formatearImporte', 'clienteDeCobranza', 'etiquetaMovimiento',
  'renderizarFilaMovimiento', 'htmlCentavos', 'htmlSaldoDeFila', 'tieneTareaExplicita', 'puedoIngresoExterno', 'renderizarAccionesDetalle']
const CONSTANTES = ['TIPO_LABEL', 'MEDIO_PAGO_LABEL_CAJA', 'TITULO_INGRESO_EXTERNO', 'TIPO_MOVIMIENTO_OPCIONES']

const PRELUDIO = `
  ${fuenteNumeros()}
  function formatearFecha(f) { return String(f) }
  function otroMedioPago(m) { return m }
  function htmlUnidadDeFila() { return '' }
  function unidadDeMovimiento() { return null }
  function htmlBurbujaCaja() { return '' }
  var location = { href: 'caja.html' }
  var __els = {}
  var document = { getElementById(id) {
    if (!__els[id]) __els[id] = { id, innerHTML: '', addEventListener() {} }
    return __els[id]
  } }
  var estado = { nombresEmpleados: {}, cuentasPorId: {}, misTareasCaja: new Set(),
    miEmpleado: { id: 'yo', rol_app: 'usuario' }, idEmpresa: 'empresa', origenFicha: 'listado', tieneModuloCaja: true,
    __els }
`

const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES, retorno: 'estado' })

// renderizarAccionesDetalle lee el estado del scope: se le cambian rol y
// tareas y se devuelve el HTML de los botones.
function botones({ rol, tareas, ficha }) {
  const est = S.estado
  est.miEmpleado = { id: 'yo', rol_app: rol }
  est.misTareasCaja = new Set(tareas)
  S.renderizarAccionesDetalle(ficha)
  return est.__els['detalle-persona-acciones'].innerHTML
}
const TODAS = ['ingreso_externo_propio', 'ingreso_externo_empresa']

// ── Quién ve el ingreso externo ─────────────────────────────────────────────
const superPropia = botones({ rol: 'super_admin', tareas: TODAS, ficha: 'yo' })
chk('super_admin con la tarea: en su ficha ve "Ingreso externo (préstamos, aportes)"',
  superPropia.includes('id="btn-detalle-ingreso-externo"') && superPropia.includes('>Ingreso externo (préstamos, aportes)</button>'))
const superEmpresa = botones({ rol: 'super_admin', tareas: TODAS, ficha: 'empresa' })
chk('super_admin con la tarea: en la ficha de Empresa también',
  superEmpresa.includes('id="btn-detalle-ingreso-externo"') && superEmpresa.includes('(préstamos, aportes)'))
const usuarioPropia = botones({ rol: 'usuario', tareas: TODAS, ficha: 'yo' })
chk('un usuario CON la tarea ya no lo ve en su ficha', !usuarioPropia.includes('btn-detalle-ingreso-externo'))
chk('…pero sigue viendo "Añadir ingreso"', usuarioPropia.includes('id="btn-detalle-ingreso"'))
const usuarioEmpresa = botones({ rol: 'usuario', tareas: TODAS, ficha: 'empresa' })
chk('un usuario CON la tarea ya no lo ve en la ficha de Empresa', !usuarioEmpresa.includes('btn-detalle-ingreso-externo'))
const superSinTarea = botones({ rol: 'super_admin', tareas: [], ficha: 'yo' })
chk('un super_admin SIN la tarea tampoco (la base la sigue pidiendo)', !superSinTarea.includes('btn-detalle-ingreso-externo'))
const superSinEmpresa = botones({ rol: 'super_admin', tareas: ['ingreso_externo_propio'], ficha: 'empresa' })
chk('en Empresa pide la tarea de Empresa', !superSinEmpresa.includes('btn-detalle-ingreso-externo'))
chk('el título del modal es el mismo nombre', /getElementById\('movimiento-titulo'\)\.textContent = TITULO_INGRESO_EXTERNO/.test(src))

// ── El texto debajo del título ──────────────────────────────────────────────
chk('debajo del título, en chico: "La plata de un cliente se carga en Cobranzas"',
  /<h2 id="movimiento-titulo">[^<]*<\/h2>\s*<!--[\s\S]*?-->\s*<div id="aviso-ingreso-cliente" class="aviso-ingreso-cliente" hidden>La plata de un cliente se carga en <a href="cobranzas\.html">Cobranzas<\/a><\/div>/.test(src))
chk('ese texto va en chico y en el gris secundario',
  /\.aviso-ingreso-cliente \{\s*font-size: 0\.8125rem;\s*color: var\(--color-texto-2\);/.test(src))

// ── Los ajustes ─────────────────────────────────────────────────────────────
const MAL = '"><b data-xss="aj">'
const aj = { id: 'a1', tipo: 'egreso_ajuste', monto: 1500, moneda: 'ARS', medio_pago: 'efectivo', cuenta_id: null,
  fecha: '2026-10-01', gasto_id: null, contraparte_empleado_id: null, cobranza_id: null, descripcion: 'Diferencia del arqueo ' + MAL }
chk('egreso_ajuste se llama "Ajuste"', S.etiquetaMovimiento(aj) === 'Ajuste')
chk('ingreso_ajuste se llama "Ajuste"', S.etiquetaMovimiento({ ...aj, tipo: 'ingreso_ajuste' }) === 'Ajuste')
const filaAj = S.renderizarFilaMovimiento(aj)
chk('la fila del ajuste va en gris', filaAj.includes('class="tarjeta-movimiento tarjeta-movimiento--ajuste"'))
chk('la fila dice "Ajuste"', filaAj.includes('>Ajuste</span>'))
chk('la fila muestra la descripción, escapada', filaAj.includes('Diferencia del arqueo &quot;&gt;&lt;b data-xss=&quot;aj&quot;&gt;') && !filaAj.includes(MAL))
chk('la fila dice que no se edita ni se borra', /Ajuste de saldo: no se edita ni se borra desde Caja\./.test(filaAj))
chk('la fila no tiene ningún botón (no se edita)', !/<button/.test(filaAj))
chk('el egreso_ajuste resta', filaAj.includes('− '))
chk('el ingreso_ajuste suma', S.renderizarFilaMovimiento({ ...aj, tipo: 'ingreso_ajuste' }).includes('+ '))
const comun = S.renderizarFilaMovimiento({ ...aj, tipo: 'ingreso', descripcion: 'algo' })
chk('un movimiento común no va en gris ni dice "Ajuste"', !comun.includes('--ajuste') && !/Ajuste/.test(comun))
chk('el chip del ajuste es gris', /\.chip-tipo-movimiento--ingreso_ajuste,\s*\.chip-tipo-movimiento--egreso_ajuste \{\s*background: var\(--color-pista\);\s*color: var\(--color-texto-2\);/.test(src))
chk('el fondo gris va DESPUÉS de .tarjeta-movimiento (no queda pisado)',
  src.indexOf('.tarjeta-movimiento {') >= 0 && src.indexOf('.tarjeta-movimiento.tarjeta-movimiento--ajuste {') > src.indexOf('.tarjeta-movimiento {'))
chk('el filtro por tipo ofrece los ajustes', /\{ value: 'ingreso_ajuste',\s*label: 'Ajuste que suma' \}/.test(src) && /\{ value: 'egreso_ajuste',\s*label: 'Ajuste que resta' \}/.test(src))
fin()
