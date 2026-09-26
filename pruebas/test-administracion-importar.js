// EL IMPORTADOR de la carga inicial (modulos/administracion.html, 26/09/2026):
// clientes, precios y saldos iniciales desde un Excel o un CSV.
//
// Se EJECUTAN las funciones reales con las filas ya leídas (el arreglo que
// devolvería SheetJS): la vista previa con cada error y su motivo (CUIT con
// dígito verificador inválido, CBU corto, mail mal escrito, nombre repetido
// contra un cliente o dentro del archivo), que NADA se guarde hasta
// confirmar, que se guarden SOLO las filas buenas, el saldo inicial repetido
// marcado, el resumen descargable y HTML malicioso en cada render.
//
//   node pruebas/test-administracion-importar.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30719434777', activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, activo: true },
  { id: 'c3', nombre: 'Viejo', razon_social: null, cuit: null, activo: false },
]
const LISTAS = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true }]
const CAT = {
  productos: [{ id: 'p1', nombre: 'Cucurucho grande', categoria: 'cucuruchones' }],
  presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', activa: true }, { id: 'pr2', producto_id: 'p1', nombre: 'Media', activa: true }],
  marcas: [],
  insumos: [{ id: 'i1', nombre: 'Harina 000', marca: 'Molino', unidad_medida: 'kg', activo: true }],
}
const CAB_CLIENTES = ['Nombre', 'Razón social', 'CUIT', 'Condición IVA', 'Domicilio', 'Localidad', 'Provincia', 'Código postal', 'Teléfono', 'Mail',
  'Contacto', 'Teléfono del contacto', 'Transporte habitual', 'Banco', 'CBU', 'Alias', 'Lista de precios', 'Límite de crédito', 'Plazo de pago', 'Observaciones']
function filaCli(o) { return CAB_CLIENTES.map(t => o[t] ?? '') }

function preparar(S) {
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-n'] }]])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.listas = { unidad: 'u-n', filas: LISTAS }
  S.__tablas.listas_precios = LISTAS
  S.__tablas.clientes = CLIENTES
  S.__tablas.lista_precios_items = [{ presentacion_id: 'pr1', insumo_id: null, precio_caja: 3000, vigente_desde: '2026-09-01' }]
  S.__tablas.cliente_movimientos = [{ cliente_id: 'c1' }]
  S.estado.importar = S.importarVacio('clientes')
}

// ── Los dígitos verificadores ──────────────────────────────────────────────
{
  const S = nuevo()
  chk('un CUIT real pasa', S.cuitValido('30719434777') && S.cuitValido('33709335419') && S.cuitValido('20123456786'))
  chk('si la cuenta da 10, el dígito es 9 (regla de la AFIP)', S.cuitValido('20200000099') && !S.cuitValido('20200000090'))
  chk('un CUIT con el dígito verificador mal NO pasa', !S.cuitValido('30719434778') && !S.cuitValido('30712345678'))
  chk('un CUIT que no tiene 11 números NO pasa', !S.cuitValido('3071943477') && !S.cuitValido('307194347770') && !S.cuitValido(''))
  chk('un CBU real pasa', S.cbuValido('2850590940090418135201') && S.cbuValido('0170099220000067797370'))
  chk('un CBU con el primer dígito verificador mal NO pasa', !S.cbuValido('2850590840090418135201'))
  chk('un CBU con el segundo dígito verificador mal NO pasa', !S.cbuValido('2850590940090418135202'))
  chk('un CBU corto NO pasa', !S.cbuValido('285059094009041813520'))
}

// ── Leer la planilla ───────────────────────────────────────────────────────
{
  const S = nuevo()
  const h = S.filasDeHoja([[], ['', ''], ['Nombre', 'Mail'], ['A', 'a@b.com'], ['', ''], ['B', '']])
  chk('el encabezado es la primera fila con algo, y las vacías se saltean', h.encabezados.join() === 'Nombre,Mail' && h.filas.length === 2)
  chk('cada fila sabe su número en la planilla', h.filas[0].numero === 4 && h.filas[1].numero === 6)
  const m = S.mapearColumnas(['NOMBRE ', 'e-mail', 'Condicion IVA', 'otra cosa'], S.COLUMNAS_CLIENTES)
  chk('las columnas se reconocen sin acentos, mayúsculas ni espacios, y por alias', m.indice.nombre === 0 && m.indice.email === 1 && m.indice.condicion_iva === 2)
  chk('sin la columna Nombre, falta', S.mapearColumnas(['Mail'], S.COLUMNAS_CLIENTES).faltan.join() === 'Nombre')
  chk('un CUIT guardado como número en Excel sigue siendo el CUIT', S.textoCelda(30719434777) === '30719434777')
  chk('un número de la planilla o un texto argentino', S.numeroCelda(150000) === 150000 && S.numeroCelda('150.000,50') === 150000.5 && S.numeroCelda('$ 1.200') === 1200)
  chk('un número ilegible es null, nunca 0', S.numeroCelda('mil') === null && S.numeroCelda('') === null)
  chk('una fecha dd/mm/aaaa, aaaa-mm-dd o de Excel', S.fechaCelda('01/09/2026') === '2026-09-01' && S.fechaCelda('2026-09-01') === '2026-09-01' && S.fechaCelda(new Date(2026, 8, 1)) === '2026-09-01')
  chk('una fecha que no existe es null', S.fechaCelda('31/02/2026') === null && S.fechaCelda('ayer') === null)
  chk('la condición de IVA por nombre o sigla', S.condicionIvaDe('Responsable Inscripto').valor === 'responsable_inscripto' && S.condicionIvaDe('CF').valor === 'consumidor_final' && S.condicionIvaDe('monotributista').valor === 'monotributo')
  chk('una condición de IVA que no es de la lista es un error', !!S.condicionIvaDe('Autónomo').error)
}

{
  // Un CSV se lee como TEXTO: un CBU de 22 dígitos no se vuelve número (visto
  // en la maqueta) y los acentos llegan bien, en UTF-8 o en Windows-1252.
  const S = nuevo()
  chk('un CSV UTF-8 (con BOM) se decodifica bien', S.textoDeCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('Almacén')])) === 'Almacén')
  chk('un CSV de Excel en Windows-1252 también', S.textoDeCsv(new Uint8Array([65, 108, 109, 97, 99, 0xe9, 110])) === 'Almacén')
  chk('se reconoce un CSV por el nombre o el tipo', S.esCsv({ name: 'x.CSV' }) && S.esCsv({ name: 'x', type: 'text/csv' }) && !S.esCsv({ name: 'x.xlsx', type: 'application/vnd.ms-excel' }))
  let leido = null
  S.__win.XLSX = { read(d, o) { leido = [typeof d, o]; return { SheetNames: ['H'], Sheets: { H: {} } } }, utils: { sheet_to_json: () => [['Nombre']] } }
  S.__doc.querySelector = () => ({})   // cargarScript(): la librería "ya está"
  const archivo = { name: 'c.csv', type: 'text/csv', arrayBuffer: async () => new TextEncoder().encode('CBU' + String.fromCharCode(10) + '2850590940090418135201').buffer }
  esperas.push(S.leerArchivoPlanilla(archivo).then(() => chk('un CSV va a SheetJS como texto y con raw (sin interpretar números)', leido && leido[0] === 'string' && leido[1].raw === true && leido[1].type === 'string'),
    (e) => chk('un CSV va a SheetJS como texto y con raw (sin interpretar números)', false, e.message)))
}

// ── Clientes: la vista previa ──────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  const aoa = [CAB_CLIENTES,
    filaCli({ Nombre: 'Almacén Don José', CUIT: '20-12345678-6', 'Condición IVA': 'Monotributo', Mail: 'JOSE@Almacen.com', CBU: '2850590940090418135201', Alias: 'don.jose.mp', 'Lista de precios': 'mayoristas', 'Límite de crédito': '150.000', 'Plazo de pago': 30, Localidad: 'Córdoba' }),
    filaCli({ Nombre: 'Mal CUIT', CUIT: '30719434778' }),
    filaCli({ Nombre: 'CBU corto', CBU: '28505909400904181352' }),
    filaCli({ Nombre: 'Mail malo', Mail: 'juan@@gmail' }),
    filaCli({ Nombre: 'kiosco pepe' }),
    filaCli({ Nombre: 'Repetido' }),
    filaCli({ Nombre: 'repetido ' }),
    filaCli({ Nombre: 'Sin lista', 'Lista de precios': 'Minoristas', 'Plazo de pago': '400', 'Límite de crédito': '-5' }),
    filaCli({ Nombre: '', Localidad: 'Rosario' }),
    filaCli({ Nombre: 'Mismo CUIT', CUIT: '30719434777', 'Condición IVA': 'Autónomo' }),
  ]
  const r = S.validarClientes(aoa, { clientes: CLIENTES, listas: LISTAS })
  const f = (n) => r.filas.find(x => x.numero === n)
  chk('sin error general', r.error === null && r.filas.length === 10)
  chk('una fila bien queda "ok", sin errores', f(2).estado === 'ok' && f(2).errores.length === 0)
  chk('el CUIT va solo con los números', f(2).datos.cuit === '20123456786')
  chk('el mail en minúsculas y la condición de IVA como la guarda la base', f(2).datos.email === 'jose@almacen.com' && f(2).datos.condicion_iva === 'monotributo')
  chk('la lista se encuentra por nombre (sin mayúsculas) y va su id', f(2).datos.lista_precio_id === 'l1')
  chk('el límite y el plazo como números', f(2).datos.limite_credito === 150000 && f(2).datos.plazo_pago_dias === 30)
  chk('CUIT con dígito verificador inválido: error con su motivo', f(3).estado === 'error' && /dígito verificador no cierra/.test(f(3).errores.join()))
  chk('CBU que no tiene 22 números: error con su motivo', f(4).estado === 'error' && /tiene 20 números y tiene que tener 22/.test(f(4).errores.join()))
  chk('mail mal escrito: error', f(5).estado === 'error' && /mail «juan@@gmail» está mal escrito/.test(f(5).errores.join()))
  chk('nombre repetido con un cliente de la empresa (sin mayúsculas): error', f(6).estado === 'error' && /Ya hay un cliente «Kiosco Pepe»/.test(f(6).errores.join()))
  chk('nombre repetido DENTRO del archivo: error en las DOS filas', f(7).estado === 'error' && f(8).estado === 'error' &&
    /repetido en el archivo \(también en la fila 8\)/.test(f(7).errores.join()) && /también en la fila 7/.test(f(8).errores.join()))
  chk('una lista que no existe, un plazo de más de 365 y un límite negativo: tres errores', f(9).errores.length === 3)
  chk('una fila sin nombre: error', f(10).estado === 'error' && /Falta el nombre/.test(f(10).errores.join()))
  chk('un CUIT que ya tiene otro cliente es un AVISO, no un error', f(11).avisos.some(a => /Distribuidora Anatolia/.test(a)))
  chk('una condición de IVA inválida es un error', /condición de IVA «Autónomo»/.test(f(11).errores.join()))
  chk('la cuenta dice cuántas bien, con errores y se ignoran', S.textoCuentaImportar(r.filas) === '10 filas: 1 bien, 9 con errores, 0 se ignoran.')
  const sinNombre = S.validarClientes([['Mail'], ['a@b.com']], { clientes: [], listas: [] })
  chk('sin la columna Nombre: error general y ninguna fila', /le falta la columna «Nombre»/.test(sinNombre.error) && sinNombre.filas.length === 0)
  chk('un archivo vacío lo dice', /no tiene filas/.test(S.validarClientes([CAB_CLIENTES], {}).error))
  const p = S.parametrosCliente(f(2), 'u-n')
  chk('guardar_cliente con la empresa, el nombre, la localidad y activo', p.cliente.p_unidad_negocio_id === 'u-n' && p.cliente.p_nombre === 'Almacén Don José' && p.cliente.p_localidad === 'Córdoba' && p.cliente.p_activo === true && p.cliente.p_id === null)
  chk('la ficha SOLO con los datos que vinieron', JSON.stringify(Object.keys(p.ficha).sort()) === JSON.stringify(['alias_cbu', 'cbu', 'condicion_iva', 'cuit', 'email', 'limite_credito', 'lista_precio_id', 'plazo_pago_dias']))
}

// ── Nada se guarda hasta confirmar; se guardan SOLO las buenas ───────────────
{
  const S = nuevo()
  preparar(S)
  const aoa = [CAB_CLIENTES, filaCli({ Nombre: 'Uno', Mail: 'uno@x.com' }), filaCli({ Nombre: 'Malo', CUIT: '123' }), filaCli({ Nombre: 'Dos' })]
  let id = 0
  S.__setRpc(async (n) => {
    if (n === 'guardar_cliente') return { data: 'nuevo-' + (++id), error: null }
    return { data: null, error: null }
  })
  esperas.push(S.procesarFilasImportar(aoa, 'clientes.xlsx').then(async () => {
    const im = S.estado.importar
    chk('subir el archivo arma la vista previa', im.filas.length === 3 && im.archivo === 'clientes.xlsx')
    chk('y NO llama a la base', !S.__llamadas.rpc.some(x => ['guardar_cliente', 'guardar_ficha_cliente'].includes(x[0])))
    chk('el botón dice cuántas buenas se guardan', /Guardar las 2 filas buenas/.test(S.__els.get('ad-importar-guardar').textContent))
    await S.confirmarImportacion()
    chk('confirmar sin haber pedido guardar no manda nada', !S.__llamadas.rpc.some(x => x[0] === 'guardar_cliente'))
    S.pedirGuardarImportacion()
    chk('guardar pide CONFIRMAR y todavía no manda nada', im.confirmar === true && S.__els.get('ad-importar-confirmar').hidden === false && !S.__llamadas.rpc.some(x => x[0] === 'guardar_cliente'))
    chk('la confirmación dice cuántas y que las malas no se guardan', /Vas a guardar 2 clientes en Cucuruchos Nuss\. Las 1 filas con errores no se guardan\./.test(S.__els.get('ad-importar-confirmar-texto').textContent))
    await S.confirmarImportacion()
    const altas = S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').map(x => x[1].p_nombre)
    chk('al confirmar se guardan SOLO las filas buenas, de a una', JSON.stringify(altas) === '["Uno","Dos"]')
    const fichas = S.__llamadas.rpc.filter(x => x[0] === 'guardar_ficha_cliente')
    chk('la ficha va con el id que devolvió el alta y solo si hay datos', fichas.length === 1 && fichas[0][1].p_cliente_id === 'nuevo-1' && fichas[0][1].p_datos.email === 'uno@x.com')
    chk('cada fila guardada queda marcada', im.filas.filter(f => f.resultado?.ok).length === 2 && !im.filas.find(f => f.numero === 3).resultado)
    chk('y al final dice cuántas se guardaron', /Listo: se guardaron 2 de 2\./.test(im.avance))
    chk('queda el resumen para descargar', S.__els.get('ad-importar-resumen').hidden === false)
    const res = S.filasResumen(im.filas)
    chk('el resumen dice qué se guardó y qué no', res[0].join() === 'Fila,Nombre,Resultado,Detalle' && res[1][2] === 'Guardada' && res[2][2] === 'Con errores: no se intentó' && /11 números/.test(res[2][3]))
    S.pedirGuardarImportacion()
    chk('terminada la importación, no se puede pedir guardar otra vez', im.confirmar === false)
    im.confirmar = true
    await S.confirmarImportacion()
    chk('confirmar otra vez no vuelve a guardar', S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').length === 2)
  }))
}
{
  const S = nuevo()
  preparar(S)
  S.__setRpc(async (n, p) => {
    if (n === 'guardar_cliente' && p.p_nombre === 'Choca') return { data: null, error: { code: 'P0001', message: 'Ya hay un cliente con ese nombre en esta unidad.' } }
    if (n === 'guardar_cliente') return { data: 'x1', error: null }
    if (n === 'guardar_ficha_cliente') return { data: null, error: { code: 'P0001', message: 'El CBU tiene que tener 22 números.' } }
    return { data: null, error: null }
  })
  esperas.push(S.procesarFilasImportar([CAB_CLIENTES, filaCli({ Nombre: 'Choca' }), filaCli({ Nombre: 'Ficha', Banco: 'Galicia' })], 'c.csv').then(async () => {
    S.pedirGuardarImportacion()
    await S.confirmarImportacion()
    const im = S.estado.importar
    chk('el error de la base se muestra tal cual en su fila', im.filas[0].resultado.ok === false && im.filas[0].resultado.mensaje === 'Ya hay un cliente con ese nombre en esta unidad.')
    chk('si la ficha falla, se dice que el cliente se creó igual', im.filas[1].resultado.ok === false && /Se creó el cliente pero la ficha no se guardó/.test(im.filas[1].resultado.mensaje))
    chk('y la cuenta final lo refleja', /se guardaron 0 de 2/.test(im.avance))
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.procesarFilasImportar([CAB_CLIENTES, filaCli({ Nombre: 'X', CUIT: '1' })], 'c.xlsx').then(() => {
    S.pedirGuardarImportacion()
    chk('sin filas buenas no se puede ni pedir guardar', S.estado.importar.confirmar === false && S.__els.get('ad-importar-guardar').disabled === true)
  }))
}

// ── Precios ────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  const filasG = S.filasGrilla(CAT)
  const pl = S.plantillaPrecios(filasG, [{ presentacion_id: 'pr1', precio_caja: 3000, vigente_desde: '2026-09-01' }], '2026-09-26')
  chk('la plantilla de precios trae una fila por presentación y por insumo', pl.length === 1 + 3 && pl[1][0] === 'pr1' && pl[3][0] === 'ins:i1' && pl[3][1] === 'Insumo')
  chk('con el precio que rige hoy en la lista', pl[1][5] === 3000 && pl[2][5] === '')
  chk('y la columna de precio nuevo vacía', pl.slice(1).every(f => f[6] === ''))
  const aoa = [pl[0], ['pr1', '', '', '', '', 3000, '3.300'], ['pr2', '', '', '', '', '', ''], ['ins:i1', '', '', '', '', '', '120,5'], ['zzz', '', '', '', '', '', '10'],
    ['pr1', '', '', '', '', '', 'mil'], ['pr2', '', '', '', '', '', '3000']]
  const r = S.validarPrecios(aoa, { filas: filasG, precios: [{ presentacion_id: 'pr1', precio_caja: 3000, vigente_desde: '2026-09-01' }, { presentacion_id: 'pr2', insumo_id: null, precio_caja: 3000, vigente_desde: '2026-09-01' }], hoy: '2026-09-26' })
  const f = (n) => r.filas.find(x => x.numero === n)
  chk('el mismo producto dos veces: error en las dos filas', f(2).estado === 'error' && f(6).estado === 'error')
  chk('una fila sin precio nuevo se ignora (no se toca)', f(3).estado === 'ignorada')
  chk('el precio de un insumo va con insumo_id', f(4).estado === 'ok' && JSON.stringify(f(4).datos) === '{"insumo_id":"i1","precio_caja":120.5}')
  chk('un código que no es de la empresa: error', f(5).estado === 'error' && /no es de un producto ni de un insumo/.test(f(5).errores.join()))
  chk('un precio igual al que rige se ignora', f(7).estado === 'ignorada' && /igual al que rige/.test(f(7).avisos.join()))
  S.estado.importar = { ...S.importarVacio('precios'), listaId: '' }
  esperas.push(S.procesarFilasImportar(aoa, 'p.xlsx').then(async () => {
    chk('sin lista elegida no arma la vista previa', S.estado.importar.filas === null && /Elegí primero la lista/.test(S.estado.importar.error))
    S.estado.importar.listaId = 'l1'
    S.estado.importar.desde = '2026-10-01'
    await S.procesarFilasImportar([pl[0], ['pr1', '', '', '', '', '', '3.300'], ['ins:i1', '', '', '', '', '', '120,5'], ['zzz', '', '', '', '', '', '1']], 'p.xlsx')
    chk('los precios tampoco se guardan hasta confirmar', !S.__llamadas.rpc.some(x => x[0] === 'guardar_precios'))
    S.pedirGuardarImportacion()
    chk('la confirmación dice la lista y la fecha', /en la lista «Mayoristas», que rigen desde el 01\/10\/2026/.test(S.__els.get('ad-importar-confirmar-texto').textContent))
    let p = null
    S.__setRpc(async (n, q) => { if (n === 'guardar_precios') p = q; return { data: { precios: 2 }, error: null } })
    await S.confirmarImportacion()
    chk('guardar_precios en UNA llamada con la lista, la fecha y SOLO las filas buenas', p && p.p_lista_id === 'l1' && p.p_vigente_desde === '2026-10-01' &&
      JSON.stringify(p.p_items) === JSON.stringify([{ presentacion_id: 'pr1', precio_caja: 3300 }, { insumo_id: 'i1', precio_caja: 120.5 }]))
  }))
}

// ── Saldos iniciales ───────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  const pl = S.plantillaSaldos(CLIENTES)
  chk('la plantilla de saldos trae los clientes activos de la empresa', pl.length === 3 && pl[1][0] === 'c1' && pl[2][1] === 'Kiosco Pepe')
  const aoa = [pl[0], ['c1', '', '', '', '50000', '', ''], ['c2', '', '', '', '-1.500,50', '15/09/2026', 'A favor'], ['c9', '', '', '', '10', '', ''], ['c2', '', '', '', '0', '', ''],
    ['c2', '', '', '', 'mucho', '', ''], ['c2', '', '', '', '', '', ''], ['c2', '', '', '', '10', '01/01/2099', '']]
  const r = S.validarSaldos(aoa, { clientes: CLIENTES, conSaldo: new Set(['c1']), hoy: '2026-09-26' })
  const f = (n) => r.filas.find(x => x.numero === n)
  chk('un cliente que YA tiene saldo inicial queda marcado con error', f(2).estado === 'error' && /Ya tiene saldo inicial/.test(f(2).errores.join()))
  chk('un saldo negativo (a favor) con fecha y observación pasa', f(3).datos.importe === -1500.5 && f(3).datos.fecha === '2026-09-15' && f(3).datos.observacion === 'A favor')
  chk('un código que no es de un cliente: error', f(4).estado === 'error')
  chk('un saldo en cero se ignora', f(5).estado === 'ignorada')
  chk('un saldo ilegible: error', f(6).estado === 'error')
  chk('sin saldo se ignora', f(7).estado === 'ignorada')
  chk('una fecha futura: error', /posterior a hoy/.test(f(8).errores.join()))
  chk('el mismo cliente en dos filas que se cargan: error en las dos', f(3).estado === 'error' && /El mismo cliente está en/.test(f(3).errores.join()))
  const sinFecha = S.validarSaldos([pl[0], ['c2', '', '', '', '100', '', '']], { clientes: CLIENTES, conSaldo: new Set(), hoy: '2026-09-26' })
  chk('sin fecha, va la de hoy', sinFecha.filas[0].datos.fecha === '2026-09-26')
  S.estado.importar = S.importarVacio('saldos')
  let pedidos = []
  S.__setRpc(async (n, q) => { if (n === 'registrar_saldo_inicial_cliente') pedidos.push(q); return { data: null, error: null } })
  esperas.push(S.procesarFilasImportar([pl[0], ['c1', '', '', '', '500', '', ''], ['c2', '', '', '', '750,25', '', 'Deuda vieja']], 's.xlsx').then(async () => {
    chk('quién ya tiene saldo inicial sale de cliente_movimientos (con retiros:ver)', S.__llamadas.consultas.some(c => c[0] === 'cliente_movimientos' && c[1].some(x => x[0] === 'eq' && x[1] === 'tipo' && x[2] === 'saldo_inicial')))
    chk('y en la vista previa el que ya tiene queda con error', S.estado.importar.filas[0].estado === 'error')
    chk('nada se guarda hasta confirmar', pedidos.length === 0)
    S.pedirGuardarImportacion()
    await S.confirmarImportacion()
    chk('se guarda SOLO el que no tenía, con su importe, fecha y observación', pedidos.length === 1 && pedidos[0].p_cliente_id === 'c2' && pedidos[0].p_importe === 750.25 && pedidos[0].p_observacion === 'Deuda vieja' && /^\d{4}-\d{2}-\d{2}$/.test(pedidos[0].p_fecha))
  }))
  const T = nuevo()
  preparar(T)
  T.estado.misTareas = new Map([['retiros:precios', { unidades: ['u-n'] }]])
  T.estado.importar = T.importarVacio('saldos')
  esperas.push(T.procesarFilasImportar([pl[0], ['c1', '', '', '', '500', '', '']], 's.xlsx').then(() => {
    chk('sin retiros:ver no se puede saber quién ya tiene saldo, y se dice', T.estado.importar.conSaldo === null && /no se puede ver quién ya tiene saldo inicial/.test(T.estado.importar.error))
    chk('y no se consulta cliente_movimientos', !T.__llamadas.consultas.some(c => c[0] === 'cliente_movimientos'))
  }))
}

// ── Permiso, portada y plantilla de clientes ───────────────────────────────
{
  const S = nuevo()
  preparar(S)
  chk('con retiros:precios se ve la sección Importar', S.seccionesVisibles().some(s => s.id === 'importar'))
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
  chk('solo con ver NO', !S.seccionesVisibles().some(s => s.id === 'importar'))
  const pl = S.plantillaClientes()
  chk('la plantilla de clientes tiene las columnas exactas de la ficha', pl[0].join('|') === CAB_CLIENTES.join('|'))
  const ins = S.instruccionesClientes(LISTAS).map(f => f.join(' ')).join('\n')
  chk('las instrucciones nombran las condiciones de IVA y las listas de la empresa', /Responsable inscripto/.test(ins) && /Mayoristas/.test(ins))
  chk('SheetJS de cdnjs', S.LIBRERIA_XLSX.startsWith('https://cdnjs.cloudflare.com/ajax/libs/xlsx/'))
  chk('elegir otro tipo vacía la vista previa', (S.estado.importar = { ...S.importarVacio('clientes'), filas: [] }, S.elegirTipoImportar('saldos'), S.estado.importar.tipo === 'saldos' && S.estado.importar.filas === null))
}

// ── HTML malicioso ─────────────────────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  const aoa = [CAB_CLIENTES, filaCli({ Nombre: marca('nombre'), Mail: marca('mail'), CUIT: marca('cuit'), 'Lista de precios': marca('lista'), 'Condición IVA': marca('iva') })]
  const r = S.validarClientes(aoa, { clientes: CLIENTES, listas: LISTAS })
  chequearMarcas(chk, 'fila de la vista previa con errores', S.htmlFilaImportar(r.filas[0]), ['nombre', 'mail', 'cuit', 'lista', 'iva'])
  const f = { ...r.filas[0], errores: [], avisos: [marca('aviso')], resultado: { ok: false, mensaje: marca('mensaje') } }
  chequearMarcas(chk, 'resultado de la base', S.htmlFilaImportar(f), ['nombre', 'aviso', 'mensaje'])
  chequearMarcas(chk, 'vista previa', S.htmlVistaPrevia({ archivo: marca('archivo'), filas: r.filas }), ['archivo', 'nombre'])
}

fin()
