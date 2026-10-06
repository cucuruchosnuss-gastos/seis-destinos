// EL CLIENTE NUEVO en la Carga de órdenes de retiro (06/10/2026, pedido de
// Facu): si el buscador no lo encuentra, el depósito lo carga en el momento
// (nombre obligatorio, teléfono y localidad) y queda PROVISORIO hasta que
// administración lo complete o lo una con el que ya existía.
//
// Lo que se exige, EJECUTANDO el código real de modulos/retiros.html:
//  - sin nombre (menos de 3 letras, la regla de crear_cliente_provisorio) no
//    se busca ni se crea nada, y se dice;
//  - ANTES de crear se muestran los parecidos ("¿Es alguno de estos?"): de
//    buscar_clientes (también por apodo) o, si devuelve null (el depósito con
//    solo retiros:cargar), de la búsqueda local, que también mira apodos;
//  - mientras se buscan los parecidos no se puede crear;
//  - elegir un parecido NO crea nada;
//  - crear manda los parámetros exactos (el teléfono como TEXTO), la orden
//    sigue con ese cliente sin perder lo cargado (mismo uuid), el error de la
//    base va tal cual y pegado, y un doble toque manda una sola vez;
//  - todo lo nuevo escapa.
//
//   node pruebas/test-retiros-cliente-nuevo.js

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

const CAT = {
  productos: [{ id: 'p-cuc', nombre: 'Cucurucho grande', categoria: 'cucuruchones' }],
  presentaciones: [{ id: 'pr-cuc-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100, stock_cajas: 40 }],
  marcas: [], insumos: [],
}
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: ['el Turco'], cuit: '30712345678', localidad: 'Córdoba', transporte_habitual: 'Expreso Norte', activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, apodos: [], cuit: null, localidad: null, transporte_habitual: null, activo: true },
  { id: 'c3', nombre: 'Almacén Rosa', razon_social: null, apodos: [], cuit: null, localidad: 'Villa María', transporte_habitual: null, activo: true },
]
const copia = (x) => JSON.parse(JSON.stringify(x))

// Una empresa elegida, el catálogo y los clientes cargados, y el formulario.
// sinPermiso = true: buscar_clientes devolvió null antes (la búsqueda local).
function nuevo({ sinPermiso = true, rpc = null } = {}) {
  const S = construirRetiros(ARCHIVO)
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = copia(CLIENTES)
  S.estado.buscarClientesSinPermiso = sinPermiso
  S.estado.vista = 'rt-vista-form'
  S.estado.form = S.formVacio()
  S.__setRpc(rpc ?? (async () => ({ data: null, error: null })))
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(([n]) => n === nombre)

// Abre el panel y escribe los datos como los escribe la persona (en los
// campos que dibujó el panel).
function cargarDatos(S, { nombre = '', telefono = '', localidad = '' } = {}) {
  S.estado.form.clienteBusqueda = nombre
  S.abrirClienteNuevo()
  S.__els.get('rt-nuevo-nombre').value = nombre
  S.__els.get('rt-nuevo-telefono').value = telefono
  S.__els.get('rt-nuevo-localidad').value = localidad
  S.leerDatosClienteNuevo()
}

async function pruebas() {
  // ── El botón ──────────────────────────────────────────────────────────────
  {
    const S = nuevo()
    S.pintarCliente()
    chk('sin escribir nada no se ofrece "Cliente nuevo"', html(S, 'rt-cliente-nuevo') === '')
    S.buscarClienteRetiro('Pepito')
    chk('con algo escrito aparece "+ Cliente nuevo" con lo escrito', /id="rt-cliente-nuevo-abrir"/.test(html(S, 'rt-cliente-nuevo')) && /Pepito/.test(html(S, 'rt-cliente-nuevo')))
    chk('y dice que queda provisorio', /queda provisorio/.test(html(S, 'rt-cliente-nuevo')))
    S.elegirCliente('c1')
    chk('con el cliente elegido no se ofrece', html(S, 'rt-cliente-nuevo') === '')
  }

  // ── Los datos: nombre obligatorio, teléfono como texto ───────────────────
  {
    const S = nuevo()
    S.estado.form.clienteBusqueda = 'Kiosco Pepito'
    S.abrirClienteNuevo()
    const h = html(S, 'rt-cliente-nuevo')
    chk('el panel pide nombre, teléfono y localidad', /id="rt-nuevo-nombre"/.test(h) && /id="rt-nuevo-telefono"/.test(h) && /id="rt-nuevo-localidad"/.test(h))
    chk('el nombre viene con lo que se buscó', S.__els.get('rt-nuevo-nombre').value === 'Kiosco Pepito')
    chk('el teléfono es un campo de texto de teléfono (un identificador, no un número)', /type="tel" class="rt-input" id="rt-nuevo-telefono" inputmode="tel"/.test(h))
    chk('el teléfono nunca pasa por enlazarCampoNumero', !/enlazarCampoNumero\([^)]*rt-nuevo/.test(src))
    chk('con el panel abierto la lista de resultados no se ve', html(S, 'rt-clientes-resultados') === '' && html(S, 'rt-clientes-frecuentes') === '')
  }
  // La base exige 3 caracteres de upper(btrim(nombre)): "a b" ya los tiene.
  for (const nombre of ['', '  ', 'ab', ' a  ']) {
    const S = nuevo({ sinPermiso: false })
    cargarDatos(S, { nombre })
    await S.seguirClienteNuevo()
    const n = S.estado.nuevoCliente
    chk(`sin nombre («${nombre}») no se sigue y se dice`, n.paso === 'datos' && n.error === 'Escribí el nombre del cliente (al menos 3 letras).')
    chk(`sin nombre («${nombre}») no se busca ni se crea nada`, S.__llamadas.rpc.length === 0)
    chk(`sin nombre («${nombre}») el error se ve pegado`, /id="rt-nuevo-error">Escribí el nombre/.test(html(S, 'rt-cliente-nuevo')))
  }
  {
    const S = nuevo({ sinPermiso: true, rpc: async () => ({ data: 'nunca', error: null }) })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.crearClienteNuevo()
    chk('sin pasar por "¿Es alguno de estos?" no se crea nada', rpcs(S, 'crear_cliente_provisorio').length === 0 && S.estado.form.clienteId === null)
  }
  {
    // Aunque se llegue a crear con un nombre corto (desde otro camino), no se manda.
    const S = nuevo()
    cargarDatos(S, { nombre: 'Kiosco' })
    await S.seguirClienteNuevo()
    S.estado.nuevoCliente.nombre = 'ab'
    await S.crearClienteNuevo()
    chk('crear con un nombre corto no llama a la base', rpcs(S, 'crear_cliente_provisorio').length === 0 && S.estado.nuevoCliente.paso === 'datos')
  }

  // ── Primero los parecidos: la lista local (sin permiso de buscar) ─────────
  {
    const S = nuevo({ sinPermiso: true })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    const n = S.estado.nuevoCliente
    const h = html(S, 'rt-cliente-nuevo')
    chk('después de los datos viene "¿Es alguno de estos?"', n.paso === 'parecidos' && /¿Es alguno de estos\?/.test(h))
    chk('sin permiso de buscar en la base no se le pregunta', rpcs(S, 'buscar_clientes').length === 0)
    chk('la búsqueda local encuentra a "Kiosco Pepe" por la palabra "Kiosco"', n.parecidos.some(p => p.c.id === 'c2') && /data-cliente="c2"/.test(h))
    chk('no trae lo que no se parece', !n.parecidos.some(p => p.c.id === 'c3'))
    chk('todavía no se creó nada', rpcs(S, 'crear_cliente_provisorio').length === 0)
    chk('y se puede crear (la búsqueda terminó)', /id="rt-nuevo-crear">No es ninguno: cargar «Kiosco Pepito»/.test(h))
  }
  {
    const S = nuevo({ sinPermiso: true })
    cargarDatos(S, { nombre: 'el Turco' })
    await S.seguirClienteNuevo()
    const n = S.estado.nuevoCliente
    chk('la búsqueda local encuentra por APODO ("el Turco" → Distribuidora Anatolia)', n.parecidos.some(p => p.c.id === 'c1'))
    chk('y dice el apodo al lado del nombre', /Distribuidora Anatolia<span class="rt-resultado__apodo"> · <mark class="rt-resaltado">el Turco<\/mark>/.test(html(S, 'rt-cliente-nuevo')))
  }
  {
    const S = nuevo({ sinPermiso: true })
    cargarDatos(S, { nombre: 'Turco Pérez' })
    await S.seguirClienteNuevo()
    chk('la búsqueda local también encuentra por una PALABRA de un apodo ("Turco Pérez" → el Turco)', S.estado.nuevoCliente.parecidos.some(p => p.c.id === 'c1'))
  }
  {
    const S = nuevo({ sinPermiso: true })
    cargarDatos(S, { nombre: 'Zapatería Lunes' })
    await S.seguirClienteNuevo()
    chk('sin parecidos lo dice', /No hay ningún cliente parecido en Cucuruchos Nuss/.test(html(S, 'rt-cliente-nuevo')))
  }

  // ── Primero los parecidos: buscar_clientes (con permiso) ─────────────────
  {
    let soltar
    const S = nuevo({
      sinPermiso: false,
      rpc: async (n) => {
        if (n === 'buscar_clientes') {
          await new Promise(r => { soltar = r })
          return { data: [
            { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', localidad: 'Córdoba', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, apodos: ['el Turco', 'Turquito'], apodo_coincide: 'Turquito' },
            { cliente_id: 'c-base', nombre: 'TURQUITO SRL', razon_social: null, localidad: null, empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, apodos: [], apodo_coincide: null },
            { cliente_id: 'c-otra', nombre: 'Turquito de Dolce', empresa: 'Dolce Pasta', unidad_negocio_id: 'u-d', activo: true, apodos: [] },
            { cliente_id: 'c-off', nombre: 'Turquito viejo', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: false, apodos: [] },
          ], error: null }
        }
        return { data: null, error: null }
      },
    })
    cargarDatos(S, { nombre: 'Turquito' })
    const yendo = S.seguirClienteNuevo()
    await esperar()
    const n = S.estado.nuevoCliente
    chk('con permiso pregunta a buscar_clientes con lo escrito y la empresa', JSON.stringify(rpcs(S, 'buscar_clientes')[0]?.[1]) === JSON.stringify({ p_busqueda: 'Turquito', p_unidad_negocio_id: 'u-n' }))
    chk('mientras busca, "No es ninguno" está apagado', n.buscando === true && /id="rt-nuevo-crear" disabled/.test(html(S, 'rt-cliente-nuevo')))
    await S.crearClienteNuevo()
    chk('mientras busca, crear no llama a la base', rpcs(S, 'crear_cliente_provisorio').length === 0)
    soltar()
    await yendo
    const ids = n.parecidos.map(p => p.c.id)
    chk('los parecidos son los de la base, de esta empresa y prendidos', JSON.stringify(ids) === '["c1","c-base"]')
    chk('dice el apodo que coincidió según la base', /Distribuidora Anatolia<span class="rt-resultado__apodo"> · <mark class="rt-resaltado">Turquito<\/mark>/.test(html(S, 'rt-cliente-nuevo')))
    chk('terminó de buscar: ya se puede crear', n.buscando === false && !/id="rt-nuevo-crear" disabled/.test(html(S, 'rt-cliente-nuevo')))
    // Elegir uno que la base trajo y no estaba en la lista local: se suma y se elige.
    S.elegirParecido('c-base')
    chk('elegir un parecido de la base lo elige (y lo suma a la lista)', S.estado.form.clienteId === 'c-base' && S.estado.clientes.some(c => c.id === 'c-base'))
    chk('elegir un parecido NO crea nada y cierra el panel', rpcs(S, 'crear_cliente_provisorio').length === 0 && S.estado.nuevoCliente === null)
  }
  {
    const S = nuevo({ sinPermiso: false, rpc: async (n) => n === 'buscar_clientes' ? { data: null, error: null } : { data: null, error: null } })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    chk('si buscar_clientes devuelve null (sin permiso), quedan los de la lista local', S.estado.nuevoCliente.parecidos.some(p => p.c.id === 'c2') && S.estado.buscarClientesSinPermiso === true)
  }
  {
    const S = nuevo({ sinPermiso: false, rpc: async (n) => n === 'buscar_clientes' ? { data: null, error: { message: 'sin red' } } : { data: null, error: null } })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    chk('si buscar_clientes falla, quedan los de la lista local y se puede seguir', S.estado.nuevoCliente.parecidos.some(p => p.c.id === 'c2') && S.estado.nuevoCliente.buscando === false)
  }
  {
    const S = nuevo({ sinPermiso: true })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    S.elegirParecido('c2')
    chk('elegir un parecido local elige ese cliente', S.estado.form.clienteId === 'c2' && rpcs(S, 'crear_cliente_provisorio').length === 0)
  }

  // ── Crear ─────────────────────────────────────────────────────────────────
  {
    const S = nuevo({ sinPermiso: true, rpc: async (n) => n === 'crear_cliente_provisorio' ? { data: 'nuevo-uuid', error: null } : { data: null, error: null } })
    const f = S.estado.form
    S.elegirProductoRenglon(0, 'p-cuc')
    f.renglones[0].cajas = 7
    f.transporte = 'Camión propio'
    const uuid = f.uuid
    cargarDatos(S, { nombre: '  Kiosco   Pepito ', telefono: ' 0351 15-555 1234 ', localidad: '' })
    await S.seguirClienteNuevo()
    await S.crearClienteNuevo()
    const llamada = rpcs(S, 'crear_cliente_provisorio')
    chk('crea con crear_cliente_provisorio una sola vez', llamada.length === 1)
    chk('con los parámetros exactos (texto limpio; localidad vacía va null; el teléfono como texto)',
      JSON.stringify(llamada[0]?.[1]) === JSON.stringify({ p_unidad_negocio_id: 'u-n', p_nombre: 'Kiosco Pepito', p_telefono: '0351 15-555 1234', p_localidad: null }))
    chk('la orden sigue con el cliente nuevo', S.estado.form === f && f.clienteId === 'nuevo-uuid')
    chk('sin perder lo cargado: el mismo uuid, el renglón y el transporte', f.uuid === uuid && f.renglones[0].cajas === 7 && f.transporte === 'Camión propio')
    chk('y el registro viaja con ese cliente y ese uuid', S.parametrosRegistrar(f).p_cliente_id === 'nuevo-uuid' && S.parametrosRegistrar(f).p_client_uuid === uuid)
    const c = S.estado.clientes.find(x => x.id === 'nuevo-uuid')
    chk('el cliente nuevo queda en la lista, en mayúsculas como lo guarda la base y provisorio', c?.nombre === 'KIOSCO PEPITO' && c?.provisorio === true)
    chk('"Retira" dice el nombre y el chip "Provisorio"', /KIOSCO PEPITO/.test(html(S, 'rt-cliente-elegido')) && /rt-sello--provisorio"[^>]*>Provisorio</.test(html(S, 'rt-cliente-elegido')))
    chk('el panel se cierra y se avisa', S.estado.nuevoCliente === null && S.__llamadas.exitos.some(m => /Cliente nuevo: KIOSCO PEPITO/.test(m)))
  }
  {
    // Doble toque: una sola llamada.
    // TODOS los que esperan se sueltan: si quedara uno colgado la suite no
    // terminaría y el runner lo contaría como que escapó.
    const soltar = []
    const S = nuevo({ sinPermiso: true, rpc: async (n) => {
      if (n === 'crear_cliente_provisorio') { await new Promise(r => { soltar.push(r) }); return { data: 'x-uuid', error: null } }
      return { data: null, error: null }
    } })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    const a = S.crearClienteNuevo()
    const b = S.crearClienteNuevo()
    await esperar()
    chk('mientras manda, el botón dice "Cargando…" y está apagado', /id="rt-nuevo-crear" disabled>Cargando…/.test(html(S, 'rt-cliente-nuevo')))
    for (const r of soltar) r()
    await Promise.all([a, b])
    chk('un doble toque manda UNA sola vez', rpcs(S, 'crear_cliente_provisorio').length === 1)
  }
  {
    const MSG = 'Ya hay un cliente con ese nombre en esta empresa: buscalo en la lista.'
    const S = nuevo({ sinPermiso: true, rpc: async (n) => n === 'crear_cliente_provisorio' ? { data: null, error: { message: MSG, code: 'P0001' } } : { data: null, error: null } })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    await S.crearClienteNuevo()
    const n = S.estado.nuevoCliente
    chk('el error de la base va TAL CUAL', n?.error === MSG)
    chk('y pegado, en el panel', html(S, 'rt-cliente-nuevo').includes(`id="rt-nuevo-error">${MSG}</p>`))
    chk('no queda ningún cliente elegido y se puede reintentar', S.estado.form.clienteId === null && n.enviando === false && !/id="rt-nuevo-crear" disabled/.test(html(S, 'rt-cliente-nuevo')))
  }
  {
    const S = nuevo({ sinPermiso: true, rpc: async () => ({ data: null, error: null }) })
    cargarDatos(S, { nombre: 'Kiosco Pepito' })
    await S.seguirClienteNuevo()
    await S.crearClienteNuevo()
    chk('si la base no devuelve el cliente, se dice (no se elige nada)', /no devolvió el cliente nuevo/.test(S.estado.nuevoCliente?.error ?? '') && S.estado.form.clienteId === null)
  }

  // ── Volver, cancelar, escribir de nuevo, cambiar de empresa ──────────────
  {
    const S = nuevo({ sinPermiso: true })
    cargarDatos(S, { nombre: 'Kiosco Pepito', telefono: '351' })
    await S.seguirClienteNuevo()
    S.volverDatosClienteNuevo()
    chk('"Corregir los datos" vuelve a los campos con lo escrito', S.estado.nuevoCliente.paso === 'datos' && S.__els.get('rt-nuevo-telefono').value === '351')
    S.cerrarClienteNuevo()
    chk('"Cancelar" cierra el panel y vuelve el botón', S.estado.nuevoCliente === null && /rt-cliente-nuevo-abrir/.test(html(S, 'rt-cliente-nuevo')))
    S.abrirClienteNuevo()
    S.buscarClienteRetiro('Kiosco')
    chk('escribir en el buscador cierra el cliente nuevo a medio cargar', S.estado.nuevoCliente === null)
    S.abrirClienteNuevo()
    S.estado.form = S.formVacio()
    S.pintarCliente()
    chk('una orden nueva se olvida del cliente nuevo de la anterior', S.estado.nuevoCliente === null)
  }
  chk('cambiar de empresa se olvida del cliente nuevo', /estado\.buscarClientes = null\n\s+estado\.nuevoCliente = null/.test(src))

  // ── XSS: todo lo nuevo escapa ────────────────────────────────────────────
  {
    const S = nuevo({ sinPermiso: true })
    S.estado.empresas[0].nombre = 'Nuss ' + marca('empresa')
    cargarDatos(S, { nombre: 'Zapatería Lunes' })
    await S.seguirClienteNuevo()
    chequearMarcas(chk, 'sin parecidos', html(S, 'rt-cliente-nuevo'), ['empresa'])
  }
  {
    const S = nuevo({ sinPermiso: true, rpc: async (n) => n === 'crear_cliente_provisorio' ? { data: null, error: { message: 'falla ' + marca('error') } } : { data: null, error: null } })
    S.estado.clientes.push({ id: 'cx', nombre: 'Kiosco ' + marca('parecido'), razon_social: marca('razon'), apodos: [], localidad: marca('localidad'), activo: true })
    S.estado.form.clienteBusqueda = 'Kiosco ' + marca('busqueda')
    S.pintarCliente()
    chequearMarcas(chk, 'el botón "Cliente nuevo"', html(S, 'rt-cliente-nuevo'), ['busqueda'])
    cargarDatos(S, { nombre: 'Kiosco ' + marca('nombre') })
    await S.seguirClienteNuevo()
    await S.crearClienteNuevo()
    chequearMarcas(chk, 'el panel de parecidos', html(S, 'rt-cliente-nuevo'), ['nombre', 'parecido', 'razon', 'localidad', 'error'])
  }
}

esperas.push(pruebas())
fin()
