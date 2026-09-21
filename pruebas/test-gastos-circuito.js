// Suite del circuito en modulos/gastos.html.
//
// Cubre lo NUEVO del circuito con Ingreso y Cuentas Corrientes: el aviso de
// después de guardar (cuenta corriente y mercadería), la lista "Facturas
// ingresadas sin gasto" y las reglas del guardado. Los renders se EJECUTAN.
//
//   node pruebas/test-gastos-circuito.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-circuito.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, marca, chequearMarcas, estaticoAcotado, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, dataset: {}, addEventListener(){} }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __rpc = async () => ({ data: [], error: null })
  var __llamadas = { rpc: [] }
  var supabase = { rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) } }
  function formatearFecha(f) { const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(['gastos:ver_exportar']),
    fechaInicioCircuito: '2026-10-01', ingresosSinGasto: [], errorIngresosSinGasto: null, postGasto: null,
    wizard: { desdeIngreso: null },
    maestros: {
      categorias: [{ id: 'c-mp', nombre: 'Insumos - Materia Prima' }, { id: 'c-otra', nombre: 'Combustible' }],
      proveedores: [{ id: 'p-cc', cuenta_corriente: true }, { id: 'p-oc', cuenta_corriente: false }],
      unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }],
    },
  }
`

const FUNCIONES = [
  'esc', 'formatearImporte', 'tieneTarea', 'categoriaEsMateriaPrima', 'proveedorTieneCuentaCorriente',
  'gastoFaltaIngresar', 'lineasAvisoPostGasto', 'htmlAvisoPostGasto', 'renderizarAvisoPostGasto',
  'importeDeOcr', 'htmlIngresosSinGasto', 'renderizarIngresosSinGasto', 'cargarIngresosSinGasto',
  'renderizarAvisoDesdeIngreso',
]
const CONSTANTES = ['CATEGORIA_MATERIA_PRIMA', 'NIVELES_AVISO_GASTO']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: 'estado, __els, __llamadas, __setRpc(f){ __rpc = f }',
})
const el = (id) => S.__els.get(id) || { innerHTML: '', textContent: '', hidden: true }

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS CON TEXTO MALICIOSO
// ══════════════════════════════════════════════════════════════════════════
{
  const p = {
    gastoId: marca('gasto_id'), errorCuentaCorriente: marca('error_cc'), errorIngreso: marca('error_ingreso'),
    vinculadoIngreso: false, faltaIngreso: true, puedeIngresar: true,
  }
  const html = S.htmlAvisoPostGasto(p)
  chequearMarcas(chk, 'htmlAvisoPostGasto', html, ['error_cc', 'error_ingreso'])
  chk('aviso: el id del gasto va al href con encodeURIComponent, sin nada crudo',
    html.includes('href="materia-prima.html?desde_gasto=' + encodeURIComponent(marca('gasto_id')) + '"'))
  chk('aviso: el href va entre comillas DOBLES', /href="materia-prima\.html\?desde_gasto=[^"]*"/.test(html))

  const filas = [{
    ingreso_id: marca('ingreso_id'), razon_social: marca('razon_social'), numero_doc: marca('numero_doc'),
    fecha: '2026-10-03', importe_ocr: '1500.5', unidad_negocio_id: 'u-x',
  }]
  S.estado.maestros.unidades.push({ id: 'u-x', nombre: marca('unidad') })
  const lista = S.htmlIngresosSinGasto(filas)
  chequearMarcas(chk, 'htmlIngresosSinGasto', lista, ['ingreso_id', 'razon_social', 'numero_doc', 'unidad'])
  chk('lista: muestra el importe leído de la factura', lista.includes('$ 1.500,50'))
  chk('lista: un importe_ocr vacío no se muestra como $0',
    !/\$ 0,00/.test(S.htmlIngresosSinGasto([{ ...filas[0], importe_ocr: '' }])) &&
    !/\$ 0,00/.test(S.htmlIngresosSinGasto([{ ...filas[0], importe_ocr: null }])))
  chk('lista: un importe_ocr que no es número no se muestra', !S.htmlIngresosSinGasto([{ ...filas[0], importe_ocr: marca('importe') }]).includes('importe'))

  S.estado.errorIngresosSinGasto = marca('error_lista')
  S.renderizarIngresosSinGasto()
  chequearMarcas(chk, 'renderizarIngresosSinGasto (error)', el('lista-ingresos-sin-gasto').innerHTML, ['error_lista'])
  chk('lista: el error de la RPC se muestra', el('seccion-ingresos-sin-gasto').hidden === false)
  S.estado.errorIngresosSinGasto = null
  S.estado.ingresosSinGasto = []
  S.renderizarIngresosSinGasto()
  chk('lista: sin filas no se dibuja', el('seccion-ingresos-sin-gasto').hidden === true)

  // El aviso de "viene de un ingreso" va por textContent.
  S.estado.wizard.desdeIngreso = { razon_social: marca('aviso_ingreso'), numero_doc: '1' }
  S.renderizarAvisoDesdeIngreso(true)
  chk('desde ingreso: el aviso va por textContent', el('aviso-desde-ingreso').textContent.includes('data-xss="aviso_ingreso"') && el('aviso-desde-ingreso').innerHTML === '')
  chk('desde ingreso: sin foto lo dice', el('aviso-desde-ingreso').textContent.includes('No se pudo traer la foto'))
  S.estado.wizard.desdeIngreso = null
  S.renderizarAvisoDesdeIngreso()
  chk('desde ingreso: sin ingreso de origen se esconde', el('aviso-desde-ingreso').hidden === true)
}

// ══════════════════════════════════════════════════════════════════════════
// 2. EL AVISO DE DESPUÉS DE GUARDAR
// ══════════════════════════════════════════════════════════════════════════
{
  const L = (p) => S.lineasAvisoPostGasto({ gastoId: 'g', errorCuentaCorriente: null, errorIngreso: null, vinculadoIngreso: false, faltaIngreso: false, puedeIngresar: false, ...p })
  chk('aviso: sin nada que decir no dibuja nada', L({}) === null && S.htmlAvisoPostGasto(null) === '')
  const cc = L({ errorCuentaCorriente: 'La factura 0001-5 ya figura pagada en cuenta corriente. Revisá si este gasto no está repetido.' })
  chk('aviso: el error de CC se muestra ENTERO', cc[0].texto.endsWith('La factura 0001-5 ya figura pagada en cuenta corriente. Revisá si este gasto no está repetido.'))
  chk('aviso: el error de CC dice que el gasto quedó guardado', cc[0].texto.startsWith('El gasto quedó guardado'))
  chk('aviso: el error de CC dice qué hacer', cc[1].texto.includes('No lo cargues de nuevo'))
  const ing = L({ errorIngreso: 'Ese gasto ya tiene su ingreso.' })
  chk('aviso: el error de vincular el ingreso se muestra entero', ing[0].texto.endsWith('Ese gasto ya tiene su ingreso.') && ing[0].nivel === 'error')
  chk('aviso: materia prima CON permiso ofrece ingresar', L({ faltaIngreso: true, puedeIngresar: true })[0].texto === 'Es un gasto de materia prima: falta ingresar la mercadería.'
    && S.htmlAvisoPostGasto({ gastoId: 'g', faltaIngreso: true, puedeIngresar: true }).includes('Ingresar la mercadería ahora'))
  chk('aviso: materia prima SIN permiso dice que quedó para el depósito', L({ faltaIngreso: true, puedeIngresar: false })[0].texto === 'Quedó pendiente de ingresar para el depósito.'
    && !S.htmlAvisoPostGasto({ gastoId: 'g', faltaIngreso: true, puedeIngresar: false }).includes('desde_gasto'))
  chk('aviso: vinculado a un ingreso lo dice', L({ vinculadoIngreso: true })[0].nivel === 'ok')
  chk('aviso: siempre se puede cerrar', S.htmlAvisoPostGasto({ gastoId: 'g', vinculadoIngreso: true }).includes('btn-cerrar-aviso-post-gasto'))

  chk('categoría: reconoce materia prima por nombre', S.categoriaEsMateriaPrima('c-mp') && !S.categoriaEsMateriaPrima('c-otra') && !S.categoriaEsMateriaPrima(null))
  chk('proveedor: con cuenta corriente sí, ocasional no, desconocido no',
    S.proveedorTieneCuentaCorriente('p-cc') === true && S.proveedorTieneCuentaCorriente('p-oc') === false && S.proveedorTieneCuentaCorriente('nada') === false)
  chk('importeDeOcr: vacío y null dan null (no 0)', S.importeDeOcr('') === null && S.importeDeOcr(null) === null && S.importeDeOcr('abc') === null)
  chk('importeDeOcr: "1500.5" da 1500.5', S.importeDeOcr('1500.5') === 1500.5)
  chk('importeDeOcr: un total en "0" no es un importe (no se muestra $ 0,00)',
    S.importeDeOcr('0') === null && !/\$ 0,00/.test(S.htmlIngresosSinGasto([{ ingreso_id: 'i', importe_ocr: '0' }])))
}

esperas.push((async () => {
  // gastoFaltaIngresar: con permiso decide la base; sin permiso, la fecha.
  S.__setRpc(async () => ({ data: [{ gasto_id: 'g1' }], error: null }))
  chk('falta ingresar: con permiso y el gasto en la lista → sí', await S.gastoFaltaIngresar('g1', '2026-09-01') === true)
  chk('falta ingresar: con permiso y el gasto NO en la lista → no (aunque la fecha entre)', await S.gastoFaltaIngresar('g2', '2026-10-05') === false)
  S.estado.misTareas = new Set()
  S.__llamadas.rpc.length = 0
  chk('falta ingresar: sin permiso decide la fecha (dentro del circuito)', await S.gastoFaltaIngresar('g3', '2026-10-05') === true)
  chk('falta ingresar: sin permiso decide la fecha (antes del circuito)', await S.gastoFaltaIngresar('g3', '2026-09-30') === false)
  chk('falta ingresar: sin permiso no consulta la lista', S.__llamadas.rpc.length === 0)
  S.estado.fechaInicioCircuito = null
  chk('falta ingresar: sin permiso ni fecha de inicio → no afirma que falte', await S.gastoFaltaIngresar('g3', '2026-10-05') === false)
  S.estado.fechaInicioCircuito = '2026-10-01'

  // cargarIngresosSinGasto: sin gastos:ver_exportar no consulta.
  S.__llamadas.rpc.length = 0
  await S.cargarIngresosSinGasto()
  chk('lista: sin gastos:ver_exportar no consulta', S.__llamadas.rpc.length === 0 && el('seccion-ingresos-sin-gasto').hidden === true)
  S.estado.misTareas = new Set(['gastos:ver_exportar'])
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso Y.' } }))
  await S.cargarIngresosSinGasto()
  chk('lista: el error de ingresos_sin_gasto queda tal cual', S.estado.errorIngresosSinGasto === 'No tenés permiso Y.')
})())

// ══════════════════════════════════════════════════════════════════════════
// 3. EL GUARDADO (sobre el fuente, anclado a la condición)
// ══════════════════════════════════════════════════════════════════════════
{
  const g = extraerFn(FUENTE, 'guardarGasto')
  chk('guardado: registrar_pago_directo_proveedor se llama para TODO gasto con proveedor (la base decide)',
    /if \(datosGasto\.proveedor_id && !estado\.wizard\.esPendiente\) \{\s*const \{ error: errorCta \} = await supabase\.rpc\('registrar_pago_directo_proveedor'/.test(g))
  chk('guardado: "registrado en cuenta corriente" solo si el proveedor tiene cuenta corriente',
    /else enCuentaCorriente = proveedorTieneCuentaCorriente\(datosGasto\.proveedor_id\)/.test(g) &&
    /mostrarExito\(enCuentaCorriente \? '¡Gasto guardado y registrado en cuenta corriente!' : '¡Gasto guardado correctamente!'\)/.test(g))
  chk('guardado: el comentario ya no afirma que TODO gasto con proveedor va a CC', !/SIEMPRE se refleja en sus movimientos/.test(g))
  chk('guardado: desde un ingreso llama a vincular_ingreso_a_gasto con el gasto nuevo',
    /if \(desdeIngreso\) \{[\s\S]*?supabase\.rpc\('vincular_ingreso_a_gasto', \{\s*p_ingreso_id: desdeIngreso\.ingreso_id, p_gasto_id: gastoInsertado\.id,/.test(g))
  chk('guardado: la falta de ingreso solo se calcula para materia prima que no vino de un ingreso',
    /if \(!desdeIngreso && categoriaEsMateriaPrima\(datosGasto\.categoria_id\)\) \{/.test(g))
  chk('guardado: el error de CC no pasa por el catch genérico (el gasto ya está guardado)',
    /if \(errorCta\) errorCuentaCorriente = errorCta\.message/.test(g))
  chk('guardado: el aviso se dibuja al volver a la lista', g.indexOf('renderizarAvisoPostGasto()') > g.indexOf('cerrarWizard()'))
  chk('guardado: el wizard limpia el ingreso de origen al abrirse',
    /estado\.wizard\.desdeIngreso = null\s*\n\s*resetearWizard\(\)/.test(extraerFn(FUENTE, 'iniciarWizard')))
  chk('guardado: resetearWizard NO borra el ingreso de origen', !/desdeIngreso/.test(extraerFn(FUENTE, 'resetearWizard')))
  chk('edición: si la sincronización falla, dice qué hacer', FUENTE.includes('Corregilo desde Cuentas Corrientes o avisale a administración.'))
}

// ══════════════════════════════════════════════════════════════════════════
// 4. ESTÁTICO, ACOTADO A LAS FUNCIONES NUEVAS
// ══════════════════════════════════════════════════════════════════════════
estaticoAcotado(chk, ARCHIVO, FUENTE,
  ['htmlAvisoPostGasto', 'htmlIngresosSinGasto', 'renderizarIngresosSinGasto'],
  {
    escape: 'esc',
    seguras: [
      ['nivel', 'clase CSS: solo pasa si está en NIVELES_AVISO_GASTO'],
      ['html', 'HTML ya escapado: se arma arriba con esc(l.texto)'],
      ['ingresar', 'HTML armado arriba con encodeURIComponent(p.gastoId) en un href entre comillas dobles'],
      ['htmlIngresosSinGasto(filas)', 'HTML armado por htmlIngresosSinGasto(), que escapa adentro'],
    ],
  })

fin()
