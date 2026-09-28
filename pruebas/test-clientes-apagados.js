// CLIENTES APAGADOS (28/09/2026).
//
// En Administración → Clientes, un interruptor por cliente lo APAGA o lo
// PRENDE (como los conos): se guarda al tocarlo con guardar_cliente(p_activo),
// mandando la fila ENTERA (guardar_cliente pisa nombre, apodos, localidad,
// teléfono y observaciones). Los apagados no aparecen para cargar retiros,
// pedidos ni cobranzas, pero siguen en la lista de Administración con
// "Mostrar apagados" y su cuenta corriente. El código anterior del cliente
// (clientes.codigo_anterior) se muestra en la ficha, la cuenta y la fila.
//
//   node pruebas/test-clientes-apagados.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { construirRetiros } = require('./sandbox-retiros')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ADMIN = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const RETIROS = process.env.ARCHIVO_RETIROS || path.join(__dirname, '..', 'modulos/retiros.html')
const PEDIDOS = process.env.ARCHIVO_PEDIDOS || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ADMIN, 'utf8')
console.log(`ARCHIVO ${ADMIN} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

const SALDOS = [
  { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista: 'General', saldo: 1500, retiros_mes: 2, es_tambien_proveedor: false },
]
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', activo: true, codigo_anterior: 101, limite_credito: null },
  { id: 'c9', nombre: 'Kiosco Cerrado', razon_social: null, cuit: null, activo: false, codigo_anterior: 55, limite_credito: null },
]
const FILA_ENTERA = { id: 'c1', unidad_negocio_id: 'u-n', nombre: 'Distribuidora Anatolia', apodos: ['el Turco'], localidad: 'Córdoba', telefono: '351 555', observaciones: 'Paga los viernes', activo: true }

function nuevoAdmin({ guardar = null, movimientos = [{ cliente_id: 'c9', importe: 1000 }, { cliente_id: 'c9', importe: -250.5 }], entera = FILA_ENTERA } = {}) {
  const S = construirAdministracion(ADMIN)
  // COPIAS: el interruptor cambia el 'activo' de la fila que tiene en memoria,
  // y un caso no puede contaminar al siguiente.
  const copia = (x) => JSON.parse(JSON.stringify(x))
  S.__tablas.clientes = (f) => {
    if (f.some(x => x[0] === 'single')) return { data: [copia(entera)], error: null }
    if (f.some(x => x[0] === 'eq' && x[1] === 'activo' && x[2] === false)) return { data: copia(CLIENTES.filter(c => !c.activo)), error: null }
    return { data: copia(CLIENTES), error: null }
  }
  S.__tablas.cliente_movimientos = typeof movimientos === 'function' ? movimientos : movimientos
  S.__setRpc(async (n, p) => {
    if (n === 'clientes_con_saldo') return { data: SALDOS, error: null }
    if (n === 'guardar_cliente') return guardar ? guardar(p) : { data: p.p_id, error: null }
    return { data: null, error: null }
  })
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  // ── El interruptor en cada cliente ─────────────────────────────────────────
  {
    const S = nuevoAdmin()
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('cada cliente tiene su interruptor, prendido', /role="switch" aria-checked="true" data-cliente-activo="c1"/.test(h) && />Prendido</.test(h))
    chk('el interruptor va AL COSTADO del botón de la fila (no adentro)', /<\/button><button type="button" class="ad-interruptor"/.test(h))
    chk('la fila muestra el código anterior', /cód\. 101/.test(h))
    chk('sin "Mostrar apagados", el apagado no se ve', !/Kiosco Cerrado/.test(h))
    const T = nuevoAdmin()
    T.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }]])
    await T.mostrarClientes()
    chk('sin permiso de guardar un cliente, no hay interruptor', !/data-cliente-activo/.test(html(T, 'ad-clientes-lista')))
    T.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ['pedidos:configurar', { unidades: ['u-n'] }]])
    chk('con pedidos:configurar sí (la misma regla que guardar_cliente)', T.puedePrenderApagar() === true)
    // El interruptor está AL COSTADO del botón de la fila, pero el clic se
    // escucha en la lista: tiene que mirarse ANTES que [data-cliente], o
    // tocarlo abriría la cuenta.
    chk('tocar el interruptor lo cambia (y NO abre la cuenta)', /const s = e\.target\.closest\('\[data-cliente-activo\]'\)\n\s+if \(s\) \{ cambiarActivoCliente\(s\.dataset\.clienteActivo\); return \}\n\s+const b = e\.target\.closest\('\[data-cliente\]'\)/.test(src))
  }
  {
    // Apagar: lee la fila ENTERA y la manda tal cual, con p_activo false.
    let p = null
    const S = nuevoAdmin({ guardar: (x) => { p = x; return { data: x.p_id, error: null } } })
    await S.mostrarClientes()
    await S.cambiarActivoCliente('c1')
    await esperar()
    chk('apagar llama a guardar_cliente con p_activo false', p && p.p_id === 'c1' && p.p_activo === false)
    chk('con la fila ENTERA: nombre, apodos, localidad, teléfono y observaciones (no se borra nada)',
      p && p.p_unidad_negocio_id === 'u-n' && p.p_nombre === 'Distribuidora Anatolia' && JSON.stringify(p.p_apodos) === '["el Turco"]' &&
      p.p_localidad === 'Córdoba' && p.p_telefono === '351 555' && p.p_observaciones === 'Paga los viernes')
    const leida = S.__llamadas.consultas.find(c => c[0] === 'clientes' && c[1].some(f => f[0] === 'single'))
    chk('la fila se lee justo antes, con apodos, teléfono y observaciones', leida && /apodos/.test(leida[1].find(f => f[0] === 'select')[1]) &&
      /telefono/.test(leida[1].find(f => f[0] === 'select')[1]) && /observaciones/.test(leida[1].find(f => f[0] === 'select')[1]))
    chk('dice qué pasa al apagar', S.__llamadas.exitos.some(t => /está apagado: ya no aparece para cargar retiros, pedidos ni cobranzas/.test(t)))
    chk('y vuelve a leer la lista', S.__llamadas.rpc.filter(r => r[0] === 'clientes_con_saldo').length === 2)
  }
  {
    // Prender un apagado.
    let p = null
    const S = nuevoAdmin({ guardar: (x) => { p = x; return { data: x.p_id, error: null } }, entera: { ...FILA_ENTERA, id: 'c9', nombre: 'Kiosco Cerrado', activo: false } })
    await S.mostrarClientes()
    S.cambiarMostrarApagados(true)
    await esperar()
    const h = html(S, 'ad-clientes-lista')
    chk('"Mostrar apagados" los suma a la lista, marcados', /Kiosco Cerrado/.test(h) && /ad-fila--apagada/.test(h) && /ad-sello">Apagado</.test(h))
    chk('con su interruptor apagado', /aria-checked="false" data-cliente-activo="c9"/.test(h) && />Apagado<\/button>/.test(h))
    // (el importe lleva un espacio duro después del signo: \s lo toma)
    chk('con su saldo sumado de sus movimientos', /\$\s749,50/.test(h), h.slice(h.indexOf('Kiosco'), h.indexOf('Kiosco') + 120))
    chk('los apagados se leen de la tabla, de esa empresa y apagados', S.__llamadas.consultas.some(c => c[0] === 'clientes' &&
      c[1].some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === false) && c[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-n')))
    chk('un apagado no inventa lista ni retiros del mes', !/Kiosco Cerrado[\s\S]*?Sin lista/.test(h.slice(h.indexOf('Kiosco Cerrado'))) && !/Kiosco Cerrado[\s\S]*?retiros este mes/.test(h.slice(h.indexOf('Kiosco Cerrado'))))
    chk('el apagado muestra su código anterior', /cód\. 55/.test(h))
    chk('el checkbox queda tildado', S.__els.get('ad-clientes-apagados').checked === true)
    chk('la cuenta cuenta prendidos y apagados', S.__els.get('ad-clientes-cuenta').textContent === '2 clientes')
    await S.cambiarActivoCliente('c9')
    await esperar()
    chk('prender llama con p_activo true', p && p.p_id === 'c9' && p.p_activo === true)
    chk('y lo dice', S.__llamadas.exitos.some(t => /está prendido: vuelve a aparecer/.test(t)))
    S.cambiarMostrarApagados(false)
    chk('destildar los saca de la vista', !/data-cliente-activo="c9"/.test(html(S, 'ad-clientes-lista')))
  }
  {
    // El error de la base va pegado a la fila y el interruptor queda como estaba.
    const S = nuevoAdmin({ guardar: () => ({ data: null, error: { code: 'P0001', message: 'No tenés permiso sobre esa unidad.' } }) })
    await S.mostrarClientes()
    await S.cambiarActivoCliente('c1')
    const h = html(S, 'ad-clientes-lista')
    chk('el error de la base va TAL CUAL, pegado a la fila', /ad-error-pegado">No tenés permiso sobre esa unidad\.</.test(h))
    chk('y el interruptor sigue prendido', /aria-checked="true" data-cliente-activo="c1"/.test(h) && !S.__llamadas.exitos.length)
    chk('el interruptor se puede volver a tocar', !/data-cliente-activo="c1"[^>]*disabled/.test(h))
  }
  {
    // Un doble toque manda una sola vez.
    const esperando = []
    let veces = 0
    const S = nuevoAdmin({ guardar: () => { veces++; return new Promise(r => esperando.push(() => r({ data: 'c1', error: null }))) } })
    await S.mostrarClientes()
    const a = S.cambiarActivoCliente('c1')
    await esperar()
    chk('mientras guarda, el interruptor queda trabado', /data-cliente-activo="c1"[^>]*disabled/.test(html(S, 'ad-clientes-lista')))
    const b = S.cambiarActivoCliente('c1')
    await esperar()
    esperando.splice(0).forEach(f => f())
    await a; await b
    chk('un doble toque manda UNA sola vez', veces === 1)
  }
  {
    // El saldo de los apagados: si la suma llega al tope, "—" (nunca de menos).
    const S = nuevoAdmin({ movimientos: Array.from({ length: 1000 }, () => ({ cliente_id: 'c9', importe: 1 })) })
    await S.mostrarClientes()
    S.cambiarMostrarApagados(true)
    await esperar()
    const h = html(S, 'ad-clientes-lista')
    chk('al tope de movimientos el saldo del apagado es "—"', /Kiosco Cerrado[\s\S]*?—/.test(h) && !/\$\s1\.000,00/.test(h))
    chk('y lo dice', /no se pudo sumar: se ve al abrir su cuenta/.test(h))
    const E = nuevoAdmin({ movimientos: () => ({ data: null, error: { message: 'x' } }) })
    await E.mostrarClientes()
    E.cambiarMostrarApagados(true)
    await esperar()
    chk('si los movimientos no se pueden leer, el saldo es "—"', /Kiosco Cerrado[\s\S]*?—/.test(html(E, 'ad-clientes-lista')))
    const F = nuevoAdmin()
    F.__tablas.clientes = (f) => f.some(x => x[0] === 'eq' && x[1] === 'activo' && x[2] === false) ? { data: null, error: { message: 'x' } } : { data: CLIENTES, error: null }
    await F.mostrarClientes()
    F.cambiarMostrarApagados(true)
    await esperar()
    chk('si los apagados no se pueden leer, se dice en bordó (y los prendidos siguen)', /ad-aviso--grave">No se pudieron leer los clientes apagados/.test(html(F, 'ad-clientes-lista')) && /Distribuidora Anatolia/.test(html(F, 'ad-clientes-lista')))
  }
  {
    // La cuenta de un apagado y el código anterior.
    const S = nuevoAdmin()
    S.estado.clientes = CLIENTES
    const h = S.htmlCuenta({ id: 'c9', cuenta: [{ fecha: '2026-09-01', tipo: 'saldo_inicial', importe: 1000, saldo: 1000 }], codigos: new Map() })
    chk('la cuenta de un apagado dice que está apagado', /Cliente apagado: no aparece para cargar retiros, pedidos ni cobranzas\./.test(h))
    chk('y su código en el sistema anterior', /Código en el sistema anterior: 55/.test(h))
    chk('un prendido no dice apagado', !/Cliente apagado/.test(S.htmlCuenta({ id: 'c1', cuenta: [], codigos: new Map() })))
    chk('sin código anterior no dice nada', S.textoCodigoAnterior(null) === '' && S.textoCodigoAnterior(0) === 'Código en el sistema anterior: 0')
    chk('la ficha lee el código anterior', /unidad_negocio_id, codigo_anterior'\)\n        \.eq\('id', clienteId\)\.maybeSingle\(\)/.test(src))
    chk('y lo muestra (sin editarlo)', /id="ad-ficha-codigo-anterior" hidden><\/p>/.test(src) && !/data-ficha="codigo_anterior"/.test(src))
    chk('el buscador encuentra por código anterior', S.clientesFiltrados([{ cliente_id: 'c1', nombre: 'Distribuidora Anatolia', codigo_anterior: 101 }], '101').length === 1 &&
      S.clientesFiltrados([{ cliente_id: 'c1', nombre: 'Distribuidora Anatolia', codigo_anterior: 101 }], '10').length === 0)
  }

  // ── Los apagados NO aparecen para cargar ──────────────────────────────────
  {
    const R = construirRetiros(RETIROS)
    let filtros = null
    R.__tablas.clientes = (f) => { filtros = f; return { data: [], error: null } }
    await R.leerClientes('u-n')
    chk('RETIROS: los clientes de la carga se leen solo activos', filtros && filtros.some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === true))
  }
  {
    const P = construirPedidos(PEDIDOS)
    P.estado.form = { unidadId: 'u-n' }
    P.estado.clientes = [{ id: 'a', nombre: 'Almacén Prendido', apodos: [], activo: true }, { id: 'b', nombre: 'Almacén Apagado', apodos: [], activo: false }]
    const h = P.htmlResultadosClientes('almacén')
    chk('PEDIDOS: el buscador del pedido no ofrece un cliente apagado', /Almacén Prendido/.test(h) && !/Almacén Apagado/.test(h))
  }
  {
    const S = nuevoAdmin()
    let filtros = null
    S.__tablas.clientes = (f) => { filtros = f; return { data: [], error: null } }
    await S.asegurarClientesAsentar()
    chk('COBRANZAS (asentar en Administración): el buscador de clientes lee solo activos', filtros && filtros.some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === true))
  }

  // ── HTML malicioso ────────────────────────────────────────────────────────
  {
    const S = nuevoAdmin()
    S.estado.saldos = [{ cliente_id: marca('id'), nombre: marca('nombre'), razon_social: marca('razon'), lista: marca('lista'), saldo: 1, retiros_mes: 0 }]
    S.estado.mostrarApagados = true
    S.estado.apagados = { filas: [{ cliente_id: marca('id-apagado'), nombre: marca('apagado'), razon_social: null, codigo_anterior: marca('codigo'), saldo: null, apagado: true }], error: null }
    S.estado.interruptor = { id: S.estado.saldos[0].cliente_id, guardando: false, error: marca('error') }
    S.pintarClientes()
    chequearMarcas(chk, 'lista de clientes con apagados', html(S, 'ad-clientes-lista'), ['id', 'nombre', 'razon', 'lista', 'id-apagado', 'apagado', 'codigo', 'error'])
  }
}

pruebas().then(fin, (e) => { chk('las pruebas corren sin excepción', false, String(e && e.stack || e)); fin() })
