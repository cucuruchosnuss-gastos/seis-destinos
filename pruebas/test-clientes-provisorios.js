// LOS CLIENTES PROVISORIOS en Administración (06/10/2026, pedido de Facu).
//
// El depósito los carga desde Órdenes de retiro (crear_cliente_provisorio) y
// quedan con clientes.provisorio = true. Acá, EJECUTANDO el código real de
// modulos/administracion.html:
//  - van ARRIBA de la lista de Clientes con el chip "Provisorio";
//  - la burbuja de la pestaña Clientes y la línea de la tarjeta de la portada
//    los cuentan (mis_pendientes() no los devuelve: se cuentan de clientes);
//  - "Completar y confirmar" abre la ficha de siempre y al guardar llama a
//    confirmar_cliente (sin cambios también; con cambios, primero los guarda);
//  - "Unir con un cliente existente": buscador de la misma empresa, vista
//    previa de lo que pasa (lo que no se puede leer se DICE, nunca un 0) y una
//    confirmación propia antes de unir_clientes (nunca confirm());
//  - Valorizar una orden de un provisorio SIN lista avisa "Primero asigná la
//    lista" con un botón a su ficha, en vez de dejar los precios vacíos;
//  - todo lo nuevo escapa.
//
//   node pruebas/test-clientes-provisorios.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))

const SALDOS = [
  { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista: 'General', saldo: 1500, retiros_mes: 2, es_tambien_proveedor: false, activo: true, codigo_anterior: 101 },
  { cliente_id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, lista: null, saldo: 200, retiros_mes: 0, es_tambien_proveedor: false, activo: true, codigo_anterior: null },
  { cliente_id: 'cp', nombre: 'KIOSCO PEPITO', razon_social: null, cuit: null, lista: null, saldo: 0, retiros_mes: 1, es_tambien_proveedor: false, activo: true, codigo_anterior: null },
]
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', localidad: 'Córdoba', apodos: ['el Turco'], activo: true, provisorio: false, lista_precio_id: 'l1', limite_credito: null },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, localidad: null, apodos: [], activo: true, provisorio: false, lista_precio_id: null, limite_credito: null },
  { id: 'cp', nombre: 'KIOSCO PEPITO', razon_social: null, cuit: null, localidad: 'Villa María', apodos: [], activo: true, provisorio: true, lista_precio_id: null, limite_credito: null },
  { id: 'cx', nombre: 'Otro Viejo', razon_social: null, cuit: null, localidad: null, apodos: [], activo: false, provisorio: false, lista_precio_id: null, limite_credito: null },
]
const FICHA = { id: 'cp', nombre: 'KIOSCO PEPITO', apodos: [], razon_social: null, cuit: null, condicion_iva: null, domicilio: null, localidad: 'Villa María', provincia: null,
  codigo_postal: null, telefono: '351 555', email: null, contacto_nombre: null, contacto_telefono: null, transporte_habitual: null, banco: null, cbu: null,
  alias_cbu: null, lista_precio_id: null, limite_credito: null, plazo_pago_dias: null, proveedor_id: null, observaciones: null, unidad_negocio_id: 'u-n', codigo_anterior: null }

const valorDe = (filtros, col) => filtros.find(f => f[0] === 'eq' && f[1] === col)?.[2]

function nuevo({ tareas = null, clientes = CLIENTES, rpc = null, previa = {} } = {}) {
  const S = construirAdministracion(ARCHIVO)
  if (tareas) S.estado.misTareas = new Map(tareas)
  S.__tablas.clientes = (f) => {
    const id = valorDe(f, 'id')
    if (id) return { data: id === 'cp' ? [copia(FICHA)] : copia(clientes.filter(c => c.id === id)), error: null }
    return { data: copia(clientes), error: null }
  }
  S.__tablas.listas_precios = [{ id: 'l1', nombre: 'General', moneda: 'ARS', activa: true }]
  S.__tablas.proveedores = []
  // Lo que se cuenta para la vista previa de unir (por cliente_id).
  const tabla = (nombre, porDefecto) => (f) => {
    const p = previa[nombre]
    if (typeof p === 'function') return p(f)
    if (p !== undefined) return { data: valorDe(f, 'cliente_id') === 'cp' ? p : [], error: null }
    return { data: porDefecto, error: null }
  }
  S.__tablas.ordenes_retiro = tabla('ordenes_retiro', [])
  S.__tablas.cobranzas = tabla('cobranzas', [])
  S.__tablas.pedidos = tabla('pedidos', [])
  S.__tablas.cliente_movimientos = tabla('cliente_movimientos', [])
  S.__setRpc(rpc ?? (async (n) => {
    if (n === 'clientes_con_saldo') return { data: copia(SALDOS), error: null }
    if (n === 'cuenta_cliente') return { data: [], error: null }
    return { data: null, error: null }
  }))
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(([n]) => n === nombre)
const PRECIOS = [['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-n'] }]]
const CONFIG = [['retiros:ver', { unidades: ['u-n'] }], ['pedidos:configurar', { unidades: ['u-n'] }]]
const SOLO_VER = [['retiros:ver', { unidades: ['u-n'] }]]

async function pruebas() {
  // ── La lista: arriba y con su chip ────────────────────────────────────────
  {
    const S = nuevo({ tareas: PRECIOS })
    S.estado.portada = {}
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    const ids = S.clientesDeLaLista().map(c => c.cliente_id)
    chk('el provisorio va ARRIBA de la lista (los demás, en su orden)', JSON.stringify(ids) === '["cp","c1","c2"]')
    chk('lleva el chip "Provisorio"', /data-cliente="cp"[\s\S]*?<span class="ad-sello ad-sello--provisorio">Provisorio<\/span>/.test(h))
    chk('solo él: los demás no lo llevan', (h.match(/ad-sello--provisorio/g) || []).length === 1)
    chk('con retiros:precios tiene "Completar y confirmar" y "Unir con un cliente existente"',
      /data-provisorio-completar="cp">Completar y confirmar</.test(h) && /data-provisorio-unir="cp">Unir con un cliente existente</.test(h))
    chk('las acciones van DEBAJO de la fila, no adentro del botón', /<\/div><div class="ad-provisorio"><button type="button" class="ad-btn" data-provisorio-completar/.test(h))
    chk('la burbuja de la pestaña queda al día al leer la lista', S.estado.portada?.provisorios === 1)
  }
  {
    const S = nuevo({ tareas: CONFIG })
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('con pedidos:configurar (sin precios) solo "Unir" (la ficha pide precios)', !/data-provisorio-completar/.test(h) && /data-provisorio-unir="cp"/.test(h))
  }
  {
    const S = nuevo({ tareas: SOLO_VER })
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('solo con retiros:ver: el chip sí, las acciones no', /ad-sello--provisorio/.test(h) && !/data-provisorio-completar|data-provisorio-unir/.test(h))
  }
  {
    const S = nuevo()
    S.estado.clientes = copia(CLIENTES)
    chk('un provisorio APAGADO no cuenta como provisorio', S.esProvisorio({ cliente_id: 'cp', apagado: true }) === false)
    chk('contarProvisorios cuenta solo los prendidos', S.contarProvisorios([{ provisorio: true, activo: true }, { provisorio: true, activo: false }, { provisorio: false }]) === 1)
    chk('sin la lista de clientes no se inventa un número', S.contarProvisorios(null) === null)
    chk('se lee la columna provisorio de clientes', /\.select\('id, nombre, razon_social, cuit, domicilio, localidad, email, lista_precio_id, limite_credito, activo, codigo_anterior, apodos, provisorio'\)/.test(src))
  }

  // ── La burbuja y la tarjeta de la portada ─────────────────────────────────
  {
    const S = nuevo({ tareas: PRECIOS })
    await S.contarPortada()
    await esperar()
    chk('la portada cuenta los provisorios de la empresa', S.estado.portada.provisorios === 1)
    const b = S.burbujaPestana('clientes', S.estado.portada)
    chk('la pestaña Clientes lleva burbuja (gris: no es plata urgente)', b?.n === '1' && b.urgente === false)
    chk('y se dibuja en la pestaña', /data-pestana="clientes"[^>]*>Clientes<span class="ad-pestana__burbuja">1<\/span>/.test(html(S, 'ad-pestanas')))
    chk('sin provisorios no hay burbuja', S.burbujaPestana('clientes', { provisorios: 0 }) === null && S.burbujaPestana('clientes', { provisorios: null }) === null)
    const c = S.contenidoSeccion({ id: 'clientes' }, { activos: 3, sobreLimite: 0, deuda: 1700, provisorios: 2 })
    chk('la tarjeta de Clientes dice cuántos provisorios hay por confirmar', c.lineas.some(l => l?.t === '2 clientes provisorios por confirmar' && l.tono === 'mal'))
    const c1 = S.contenidoSeccion({ id: 'clientes' }, { activos: 3, sobreLimite: 0, deuda: 1700, provisorios: 1 })
    chk('en singular con uno', c1.lineas.some(l => l?.t === '1 cliente provisorio por confirmar'))
    const c0 = S.contenidoSeccion({ id: 'clientes' }, { activos: 3, sobreLimite: 0, deuda: 1700, provisorios: 0 })
    chk('sin provisorios la tarjeta no dice nada de ellos', !c0.lineas.some(l => /provisorio/.test(l?.t ?? l ?? '')))
  }

  // ── Completar y confirmar ─────────────────────────────────────────────────
  {
    const S = nuevo({ tareas: PRECIOS })
    S.estado.clientes = copia(CLIENTES)
    await S.abrirCompletar('cp')
    chk('abre la ficha de siempre en modo confirmar', S.estado.vista === 'ad-vista-ficha' && S.estado.ficha?.confirmar === true)
    chk('el botón dice "Guardar y confirmar"', S.__els.get('ad-ficha-guardar').textContent === 'Guardar y confirmar')
    chk('y avisa que es provisorio', S.__els.get('ad-ficha-provisorio').hidden === false && /Cliente provisorio/.test(S.__els.get('ad-ficha-provisorio').textContent))
    await S.guardarFicha()
    chk('sin cambios, confirma igual (sin guardar la ficha)', rpcs(S, 'guardar_ficha_cliente').length === 0 && JSON.stringify(rpcs(S, 'confirmar_cliente')[0]?.[1]) === '{"p_cliente_id":"cp"}')
    chk('y avisa', S.__llamadas.exitos.includes('Cliente confirmado: ya no es provisorio.'))
  }
  {
    const orden = []
    const S = nuevo({ tareas: PRECIOS, rpc: async (n) => { orden.push(n); if (n === 'clientes_con_saldo') return { data: copia(SALDOS), error: null }; return { data: null, error: null } } })
    S.estado.clientes = copia(CLIENTES)
    await S.abrirCompletar('cp')
    S.__els.get('ad-f-razon_social').value = 'PEPITO SRL'
    S.__els.get('ad-f-lista_precio_id').value = 'l1'
    await S.guardarFicha()
    const g = rpcs(S, 'guardar_ficha_cliente')[0]?.[1]
    chk('con cambios, primero guarda SOLO lo que cambió', g?.p_cliente_id === 'cp' && g?.p_datos?.razon_social === 'PEPITO SRL' && g?.p_datos?.lista_precio_id === 'l1' && !('telefono' in (g?.p_datos ?? {})))
    chk('y después confirma', orden.indexOf('guardar_ficha_cliente') >= 0 && orden.indexOf('guardar_ficha_cliente') < orden.indexOf('confirmar_cliente'))
  }
  {
    const MSG = 'No tenés permiso sobre ese cliente.'
    const S = nuevo({ tareas: PRECIOS, rpc: async (n) => n === 'confirmar_cliente' ? { data: null, error: { message: MSG } } : { data: null, error: null } })
    S.estado.clientes = copia(CLIENTES)
    await S.abrirCompletar('cp')
    await S.guardarFicha()
    chk('el error de confirmar va TAL CUAL', S.estado.ficha.error === MSG && S.__els.get('ad-ficha-error').textContent === MSG && S.__els.get('ad-ficha-error').hidden === false)
    S.__els.get('ad-f-razon_social').value = 'PEPITO SRL'
    await S.guardarFicha()
    chk('si la ficha se guardó y confirmar falló, lo dice', S.estado.ficha.error === 'La ficha se guardó, pero no se pudo confirmar el cliente: ' + MSG)
    const antes = rpcs(S, 'guardar_ficha_cliente').length
    await S.guardarFicha()
    chk('y al reintentar no vuelve a mandar lo que ya se guardó', rpcs(S, 'guardar_ficha_cliente').length === antes && rpcs(S, 'confirmar_cliente').length === 3)
  }
  {
    const S = nuevo({ tareas: PRECIOS })
    S.estado.clientes = copia(CLIENTES)
    await S.abrirCompletar('cp')
    S.__els.get('ad-f-nombre').value = ' '
    await S.guardarFicha()
    chk('confirmar con el nombre borrado no manda nada y lo dice', S.estado.ficha.error === 'El nombre no puede quedar vacío.' && rpcs(S, 'guardar_ficha_cliente').length === 0 && rpcs(S, 'confirmar_cliente').length === 0)
  }
  {
    const S = nuevo({ tareas: PRECIOS })
    S.estado.clientes = copia(CLIENTES)
    await S.abrirFicha('c1')
    chk('la ficha común dice "Guardar la ficha" y no avisa nada', S.__els.get('ad-ficha-guardar').textContent === 'Guardar la ficha' && S.__els.get('ad-ficha-provisorio').hidden === true)
    S.__els.get('ad-f-razon_social').value = 'OTRA SRL'
    await S.guardarFicha()
    chk('y guardarla NO confirma', rpcs(S, 'confirmar_cliente').length === 0 && rpcs(S, 'guardar_ficha_cliente').length === 1)
  }
  {
    const S = nuevo({ tareas: CONFIG })
    S.estado.clientes = copia(CLIENTES)
    await S.abrirCompletar('cp')
    chk('sin retiros:precios "Completar" no abre nada', S.estado.ficha === null || S.estado.ficha === undefined)
  }

  // ── Unir: el buscador ─────────────────────────────────────────────────────
  {
    const S = nuevo({ tareas: PRECIOS })
    await S.mostrarClientes()
    S.abrirUnir('cp')
    chk('"Unir" abre el panel con el nombre del provisorio', S.__els.get('ad-panel-unir').hidden === false && /KIOSCO PEPITO/.test(S.__els.get('ad-unir-titulo').textContent))
    chk('sin escribir, pide que se busque', /Escribí para buscar/.test(html(S, 'ad-unir-cuerpo')))
    S.estado.unir.busqueda = 'kiosco'
    S.pintarUnir()
    const h = html(S, 'ad-unir-cuerpo')
    chk('busca en los clientes de la empresa, sin el mismo provisorio', /data-unir-destino="c2"/.test(h) && !/data-unir-destino="cp"/.test(h))
    S.estado.unir.busqueda = 'otro'
    S.pintarUnir()
    chk('no ofrece clientes apagados', !/data-unir-destino="cx"/.test(html(S, 'ad-unir-cuerpo')) && /Ningún cliente de esta empresa coincide/.test(html(S, 'ad-unir-cuerpo')))
    chk('busca también por apodo', S.destinosUnir(S.estado.clientes, 'cp', 'turco').map(c => c.id).join() === 'c1')
    chk('y por CUIT (los dígitos)', S.destinosUnir(S.estado.clientes, 'cp', '30-71234').map(c => c.id).join() === 'c1')
    S.cerrarUnir()
    chk('"Cancelar" cierra el panel', S.estado.unir === null && S.__els.get('ad-panel-unir').hidden === true)
  }
  {
    const S = nuevo({ tareas: SOLO_VER })
    await S.mostrarClientes()
    S.abrirUnir('cp')
    chk('sin permiso de gestionar clientes, "Unir" no abre', S.estado.unir === null)
  }

  // ── Unir: la vista previa ─────────────────────────────────────────────────
  const PREVIA = {
    ordenes_retiro: [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }],
    cobranzas: [{ id: 'k1' }],
    pedidos: [],
    cliente_movimientos: [{ importe: 12000 }, { importe: -2000 }],
  }
  {
    const S = nuevo({ tareas: [...PRECIOS, ['cobranzas:ver_todo', null], ['pedidos:ver', { unidades: ['u-n'] }]], previa: PREVIA })
    await S.mostrarClientes()
    S.abrirUnir('cp')
    await S.elegirDestinoUnir('c1')
    const h = html(S, 'ad-unir-cuerpo')
    chk('dice quién se une con quién', /KIOSCO PEPITO → Distribuidora Anatolia/.test(h))
    // importeHoja() separa "$" del número con un espacio duro.
    chk('cuenta lo que pasa, con lo que se puede leer', /Pasan a Distribuidora Anatolia: 3 órdenes de retiro, 1 cobranza, 0 pedidos y \$\s10\.000,00 de saldo \(2 movimientos de su cuenta\)\./.test(h))
    chk('dice que el provisorio queda apagado y su nombre como apodo', h.includes('KIOSCO PEPITO queda apagado y su nombre queda como apodo de Distribuidora Anatolia.'))
    chk('lee cada cosa por el cliente provisorio', ['ordenes_retiro', 'cobranzas', 'pedidos', 'cliente_movimientos'].every(t => S.__llamadas.consultas.some(([tb, f]) => tb === t && valorDe(f, 'cliente_id') === 'cp')))
    chk('todavía no unió nada', rpcs(S, 'unir_clientes').length === 0)
  }
  {
    const S = nuevo({ tareas: PRECIOS, previa: { ...PREVIA, ordenes_retiro: () => ({ data: null, error: { message: 'x' } }), cliente_movimientos: [] } })
    await S.mostrarClientes()
    S.abrirUnir('cp')
    await S.elegirDestinoUnir('c2')
    const h = html(S, 'ad-unir-cuerpo')
    chk('sin permiso de cobranzas ni de pedidos lo DICE (nunca un 0)', /las cobranzas \(con tu usuario no se pueden contar\)/.test(h) && /los pedidos \(con tu usuario no se pueden contar\)/.test(h) && !/0 cobranzas|0 pedidos/.test(h))
    chk('si las órdenes no se pudieron leer lo dice', /las órdenes de retiro \(no se pudieron leer\)/.test(h) && !/órdenes de retiro,|0 órdenes/.test(h.replace('las órdenes de retiro (no', '')))
    chk('una cuenta sin movimientos dice que está en cero', /su cuenta, que está en cero/.test(h))
    chk('y no consulta lo que no puede leer', !S.__llamadas.consultas.some(([t]) => t === 'cobranzas' || t === 'pedidos'))
  }
  {
    const S = nuevo({ tareas: PRECIOS, previa: PREVIA })
    S.estado.empresas[0].nombre = 'Taller'
    await S.mostrarClientes()
    S.abrirUnir('cp')
    await S.elegirDestinoUnir('c1')
    chk('en el Taller avisa que los proyectos también pasan (no se pueden contar)', /proyectos del Taller, también pasan/.test(html(S, 'ad-unir-cuerpo')))
  }

  // ── Unir: la confirmación propia y unir_clientes ─────────────────────────
  {
    const soltar = []
    const S = nuevo({ tareas: PRECIOS, previa: PREVIA, rpc: async (n) => {
      if (n === 'unir_clientes') { await new Promise(r => soltar.push(r)); return { data: 'c1', error: null } }
      if (n === 'clientes_con_saldo') return { data: copia(SALDOS), error: null }
      return { data: null, error: null }
    } })
    await S.mostrarClientes()
    S.abrirUnir('cp')
    await S.elegirDestinoUnir('c1')
    // Sin await: si llamara a la base, quedaría esperando (y la cuenta lo dice).
    S.unirClientes()
    await esperar()
    chk('sin confirmar, unir no llama a la base', rpcs(S, 'unir_clientes').length === 0)
    chk('el primer botón es "Unir" (todavía no "Sí, unir")', /id="ad-unir-pedir">Unir</.test(html(S, 'ad-unir-cuerpo')) && !/ad-unir-si/.test(html(S, 'ad-unir-cuerpo')))
    S.pedirConfirmarUnir()
    const h = html(S, 'ad-unir-cuerpo')
    chk('después pregunta en el panel, con su propia confirmación', /¿Unir a KIOSCO PEPITO con Distribuidora Anatolia\? No se puede deshacer desde acá\./.test(h) && /id="ad-unir-si">Sí, unir</.test(h) && /id="ad-unir-no">No</.test(h))
    S.noConfirmarUnir()
    chk('"No" vuelve sin unir', S.estado.unir.confirmando === false && rpcs(S, 'unir_clientes').length === 0)
    S.pedirConfirmarUnir()
    const a = S.unirClientes()
    const b = S.unirClientes()
    await esperar()
    chk('mientras une, "Sí, unir" está apagado', /id="ad-unir-si" disabled>Uniendo…/.test(html(S, 'ad-unir-cuerpo')))
    for (const r of soltar) r()
    await Promise.all([a, b])
    chk('un doble toque une UNA sola vez', rpcs(S, 'unir_clientes').length === 1)
    chk('con los parámetros exactos', JSON.stringify(rpcs(S, 'unir_clientes')[0]?.[1]) === '{"p_origen_id":"cp","p_destino_id":"c1"}')
    chk('cierra el panel, avisa y vuelve a leer la lista', S.estado.unir === null && S.__llamadas.exitos.includes('KIOSCO PEPITO quedó unido a Distribuidora Anatolia.') && rpcs(S, 'clientes_con_saldo').length >= 2)
    chk('nunca usa confirm()', !/\bconfirm\(/.test(S.unirClientes.toString() + S.pedirConfirmarUnir.toString() + S.htmlUnir.toString()))
  }
  {
    const MSG = 'Los dos están vinculados a proveedores distintos: desvinculá uno primero.'
    const S = nuevo({ tareas: PRECIOS, previa: PREVIA, rpc: async (n) => {
      if (n === 'unir_clientes') return { data: null, error: { message: MSG } }
      if (n === 'clientes_con_saldo') return { data: copia(SALDOS), error: null }
      return { data: null, error: null }
    } })
    await S.mostrarClientes()
    S.abrirUnir('cp')
    await S.elegirDestinoUnir('c1')
    S.pedirConfirmarUnir()
    await S.unirClientes()
    chk('el error de unir_clientes va TAL CUAL y pegado', S.estado.unir?.error === MSG && html(S, 'ad-unir-cuerpo').includes(`id="ad-unir-error">${MSG}</p>`))
    chk('y se puede reintentar', S.estado.unir.enviando === false && !/id="ad-unir-si" disabled/.test(html(S, 'ad-unir-cuerpo')))
    S.cambiarDestinoUnir()
    chk('"Elegir otro" vuelve al buscador', S.estado.unir.destinoId === null && S.estado.unir.previa === null && /Escribí para buscar|data-unir-destino/.test(html(S, 'ad-unir-cuerpo')))
  }

  // ── Valorizar a un provisorio sin lista ──────────────────────────────────
  const ORDEN = { id: 'o1', numero: 12, codigo: 'N-0012', unidad_negocio_id: 'u-n', fecha: '2026-09-20', estado: 'confirmada', estado_valorizacion: 'pendiente',
    total: 0, moneda: 'ARS', cliente_id: 'cp', cargada_por: 'emp-9', cargada_en: '2026-09-20T15:00:00Z', transporte: null, observaciones: null }
  const ITEMS = [{ id: 'i1', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: null, subtotal: null, lote: null }]
  const CAT = { productos: [{ id: 'p1', nombre: 'Cucurucho grande' }], presentaciones: [{ id: 'pr1', producto_id: 'p1', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100 }], marcas: [], insumos: [] }
  async function conOrden(clienteId, clientes = CLIENTES) {
    const S = nuevo({ tareas: PRECIOS, clientes })
    S.estado.clientes = copia(clientes)
    S.estado.catalogo = CAT
    S.estado.catalogoEmpresa = 'u-n'
    S.__tablas.ordenes_retiro = [{ ...ORDEN, cliente_id: clienteId }]
    S.__tablas.orden_retiro_items = ITEMS
    S.__tablas.v_empleados_publico = []
    await S.abrirOrden('o1')
    await S.abrirValorizar()
    return S
  }
  {
    const S = await conOrden('cp')
    const h = html(S, 'ad-orden-cuerpo')
    chk('provisorio sin lista: avisa "Primero asigná la lista"', /Primero asigná la lista de precios a KIOSCO PEPITO/.test(h))
    chk('no deja los precios vacíos para cargar (no abre el valorizar)', S.estado.orden.valorizar === null && !/data-precio=/.test(h))
    chk('no le pide precios a la base', rpcs(S, 'precio_venta').length === 0)
    chk('el botón Valorizar no queda abajo del aviso', S.__els.get('ad-btn-valorizar').hidden === true)
    chk('ofrece ir a su ficha', /id="ad-falta-lista-ficha">Ir a su ficha</.test(h))
    await S.irAFichaDesdeOrden()
    chk('"Ir a su ficha" abre su ficha para completarla y confirmarla', S.estado.vista === 'ad-vista-ficha' && S.estado.ficha?.id === 'cp' && S.estado.ficha?.confirmar === true)
  }
  {
    const S = await conOrden('cp')
    S.cerrarFaltaLista()
    chk('"Cerrar" saca el aviso y vuelve el botón Valorizar', S.estado.orden.faltaLista === null && S.__els.get('ad-btn-valorizar').hidden === false)
  }
  {
    const conLista = CLIENTES.map(c => c.id === 'cp' ? { ...c, lista_precio_id: 'l1' } : c)
    const S = await conOrden('cp', conLista)
    chk('un provisorio CON lista se valoriza como siempre', !S.estado.orden.faltaLista && S.estado.orden.valorizar !== null && rpcs(S, 'precio_venta').length === 1)
  }
  {
    const S = await conOrden('c2')
    chk('un cliente común sin lista sigue como antes (carga cada precio)', !S.estado.orden.faltaLista && S.estado.orden.valorizar?.sinLista === true)
  }

  // ── "Todas las fábricas": no se cambia nada ──────────────────────────────
  {
    const S = nuevo({ tareas: [['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]] })
    S.estado.clientesTodas = true
    S.estado.fichasTodas = new Map(CLIENTES.map(c => [c.id, c]))
    S.estado.saldos = SALDOS.map(s => ({ ...s, unidad_negocio_id: 'u-n', empresa: 'Cucuruchos Nuss' }))
    const h = S.htmlAccionesProvisorio(S.estado.saldos[2])
    chk('con "Todas las fábricas" el provisorio no se completa ni se une (elegí una fábrica)', /Elegí una fábrica arriba/.test(h) && !/data-provisorio/.test(h))
  }

  // ── XSS: todo lo nuevo escapa ────────────────────────────────────────────
  {
    const MALOS = [
      { id: 'c1', nombre: 'Destino ' + marca('destino'), razon_social: marca('razon'), cuit: '30712345678', localidad: marca('localidad'), apodos: [], activo: true, provisorio: false },
      { id: 'cp', nombre: 'Prov ' + marca('origen'), razon_social: null, cuit: null, localidad: null, apodos: [], activo: true, provisorio: true, lista_precio_id: null },
    ]
    const S = nuevo({ tareas: PRECIOS, clientes: MALOS, previa: PREVIA, rpc: async (n) => {
      if (n === 'unir_clientes') return { data: null, error: { message: 'falla ' + marca('error') } }
      if (n === 'clientes_con_saldo') return { data: [{ cliente_id: 'cp', nombre: 'Prov ' + marca('origen'), saldo: 0, activo: true }, { cliente_id: 'c1', nombre: 'Destino ' + marca('destino'), saldo: 0, activo: true }], error: null }
      return { data: null, error: null }
    } })
    await S.mostrarClientes()
    chequearMarcas(chk, 'la lista con un provisorio', html(S, 'ad-clientes-lista'), ['origen'])
    S.abrirUnir('cp')
    S.estado.unir.busqueda = 'zzz ' + marca('busqueda')
    S.pintarUnir()
    chequearMarcas(chk, 'el buscador de unir sin resultados', html(S, 'ad-unir-cuerpo'), ['busqueda'])
    S.estado.unir.busqueda = 'destino'
    S.pintarUnir()
    chequearMarcas(chk, 'el buscador de unir', html(S, 'ad-unir-cuerpo'), ['destino', 'razon', 'localidad'])
    chk('el título del panel va por textContent', S.__els.get('ad-unir-titulo').textContent.includes('<b data-xss="origen">'))
    await S.elegirDestinoUnir('c1')
    S.pedirConfirmarUnir()
    await S.unirClientes()
    chequearMarcas(chk, 'la vista previa, la confirmación y el error', html(S, 'ad-unir-cuerpo'), ['origen', 'destino', 'error'])
  }
  {
    const MALOS = CLIENTES.map(c => c.id === 'cp' ? { ...c, nombre: 'Prov ' + marca('falta') } : c)
    const S = await conOrden('cp', MALOS)
    chequearMarcas(chk, 'el aviso de la lista', html(S, 'ad-orden-cuerpo'), ['falta'])
  }
}

esperas.push(pruebas())
fin()
