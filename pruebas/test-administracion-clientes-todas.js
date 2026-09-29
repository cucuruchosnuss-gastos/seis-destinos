// ADMINISTRACIÓN → CLIENTES: "TODAS LAS FÁBRICAS" (29/09/2026).
//
// Pedido de Facu: poder ver los clientes de cada fábrica juntos, con la
// columna Empresa. Con "Todas" en la barra de arriba, el segmento de empresas
// de la lista de Clientes suma la opción "Todas las fábricas":
//  - clientes_con_saldo() se llama una vez por cada empresa donde la persona
//    ve clientes (retiros:ver), sin la fábrica de pruebas, y se juntan, el que
//    más debe arriba;
//  - cada fila dice su empresa (escapada);
//  - una empresa que falla no tapa a las demás: se dice cuál;
//  - el límite y el código anterior salen de la ficha de SU empresa;
//  - el interruptor sigue la regla de la empresa del cliente;
//  - la cuenta corriente se abre POR SU EMPRESA;
//  - con una unidad elegida en la barra, la opción no existe (manda la barra);
//  - el alta de un cliente necesita UNA empresa: con "Todas las fábricas" no
//    se ofrece;
//  - la opción vive solo en la lista de Clientes.
// Se EJECUTAN las funciones reales del módulo, con HTML malicioso.
//
//   node pruebas/test-administracion-clientes-todas.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ADMIN = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ADMIN, 'utf8')
console.log(`ARCHIVO ${ADMIN} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))

const PRUEBAS = 'u-x'
const SALDOS = {
  'u-n': [
    { cliente_id: 'n1', nombre: 'Anatolia Nuss', razon_social: 'ANATOLIA SRL', cuit: '30712345678', lista: 'General', saldo: 1500, retiros_mes: 2, es_tambien_proveedor: false, activo: true, codigo_anterior: 101 },
    { cliente_id: 'n2', nombre: 'Heladería Sur', razon_social: null, cuit: null, lista: null, saldo: 90, retiros_mes: 0, es_tambien_proveedor: true, activo: true, codigo_anterior: null },
    // Un saldo A FAVOR (negativo): va antes que los que no tienen saldo.
    { cliente_id: 'n3', nombre: 'Crédito Nuss', razon_social: null, cuit: null, lista: null, saldo: -300, retiros_mes: 0, es_tambien_proveedor: false, activo: true, codigo_anterior: null },
  ],
  'u-d': [
    { cliente_id: 'd1', nombre: 'Pastas Dolce Uno', razon_social: null, cuit: null, lista: 'Mayorista', saldo: 5000, retiros_mes: 4, es_tambien_proveedor: false, activo: true, codigo_anterior: 7 },
    { cliente_id: 'd2', nombre: 'Sin saldo Dolce', razon_social: null, cuit: null, lista: null, saldo: null, retiros_mes: 0, es_tambien_proveedor: false, activo: true, codigo_anterior: null },
  ],
  [PRUEBAS]: [
    { cliente_id: 'x1', nombre: 'Cliente Robot', saldo: 1, activo: true },
  ],
}
const APAGADOS = {
  'u-n': [{ cliente_id: 'n9', nombre: 'Kiosco Cerrado Nuss', saldo: 10, retiros_mes: 0, activo: false }],
  'u-d': [{ cliente_id: 'd9', nombre: 'Kiosco Cerrado Dolce', saldo: 20, retiros_mes: 0, activo: false }],
}
const FICHAS = {
  'u-n': [{ id: 'n1', nombre: 'Anatolia Nuss', activo: true, codigo_anterior: 101, limite_credito: 1000 }, { id: 'n2', nombre: 'Heladería Sur', activo: true, limite_credito: null }],
  'u-d': [{ id: 'd1', nombre: 'Pastas Dolce Uno', activo: true, codigo_anterior: 7, limite_credito: 4000 }, { id: 'd2', nombre: 'Sin saldo Dolce', activo: true, limite_credito: null }],
}

// Las dos empresas reales con retiros:ver, y la fábrica de pruebas (que no
// tiene que aparecer para una cuenta real).
function nuevo({ falla = null, tareas = null, saldos = SALDOS } = {}) {
  const S = construirAdministracion(ADMIN)
  S.estado.empresas = [...S.estado.empresas, { id: PRUEBAS, nombre: 'Pruebas (robot)', prefijo: 'X' }]
  S.estado.fabrica = { ok: true, unidades: new Set([PRUEBAS]), personas: new Set(), soyDePrueba: false }
  S.estado.misTareas = tareas ?? new Map([
    ['retiros:ver', { todas: true }], ['retiros:precios', { unidades: ['u-n'] }],
  ])
  S.estado.unidadBarra = null
  S.__tablas.clientes = (filtros) => {
    const u = filtros.find(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id')?.[2]
    return { data: copia(FICHAS[u] ?? []), error: null }
  }
  S.__setRpc(async (n, p) => {
    if (n === 'clientes_con_saldo') {
      const u = p.p_unidad_negocio_id
      if (falla === u) return { data: null, error: { message: 'se cayó ' + u } }
      const base = copia(saldos[u] ?? [])
      return { data: p.p_incluir_apagados ? [...base, ...copia(APAGADOS[u] ?? [])] : base, error: null }
    }
    return { data: null, error: null }
  })
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const llamadasSaldo = (S, apagados = false) => S.__llamadas.rpc.filter(r => r[0] === 'clientes_con_saldo' && !!r[1].p_incluir_apagados === apagados)

async function pruebas() {
  // ── El segmento: "Todas las fábricas" solo en la lista de Clientes ─────────
  {
    const S = nuevo()
    S.estado.vista = 'ad-vista-inicio'
    chk('en la portada, el segmento NO tiene "Todas las fábricas"', !/Todas las fábricas/.test(S.htmlEmpresas()))
    await S.mostrarClientes()
    const h = S.htmlEmpresas()
    chk('en la lista de Clientes, el segmento suma "Todas las fábricas"', /data-empresa="todas" aria-pressed="false">Todas las fábricas</.test(h), h)
    chk('y explica para qué', /o "Todas las fábricas" para verlos juntos/.test(h))
    chk('la fábrica de pruebas no se ofrece', !/Pruebas \(robot\)/.test(h) && !/data-empresa="u-x"/.test(h))
    chk('mostrarVista repinta el segmento (la opción se va al salir de Clientes)', /estado\.vista = id\n\s+pintarEmpresas\(\)/.test(src))
    S.mostrarVista('ad-vista-ordenes')
    chk('al ir a Órdenes, el segmento ya no tiene la opción', !/Todas las fábricas/.test(html(S, 'ad-empresas')))
  }
  {
    // Con una unidad en la barra, manda la barra: no hay opción.
    const S = nuevo()
    S.estado.unidadBarra = 'u-d'
    S.estado.empresaId = 'u-d'
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    chk('con una unidad elegida arriba, no hay "Todas las fábricas"', !/Todas las fábricas/.test(S.htmlEmpresas()))
    chk('y la lista es de esa unidad aunque el modo haya quedado prendido', S.clientesEnTodas() === false && llamadasSaldo(S).length === 1 && llamadasSaldo(S)[0][1].p_unidad_negocio_id === 'u-d')
  }
  {
    // Con una sola empresa con clientes, no hay nada que juntar.
    const S = nuevo({ tareas: new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-d'] }]]) })
    await S.mostrarClientes()
    chk('con clientes en UNA sola empresa, no se ofrece', !/Todas las fábricas/.test(S.htmlEmpresas()))
    S.estado.clientesTodas = true
    chk('y el modo no se prende', S.clientesEnTodas() === false)
  }

  // ── Todas las fábricas: una llamada por empresa, juntas, con la empresa ───
  {
    const S = nuevo()
    await S.mostrarClientes()
    S.__llamadas.rpc.length = 0
    S.elegirEnSegmento('todas')
    await esperar()
    const llamadas = llamadasSaldo(S)
    chk('clientes_con_saldo una vez por empresa real (Nuss y Dolce)', llamadas.length === 2 &&
      llamadas.map(r => r[1].p_unidad_negocio_id).sort().join() === 'u-d,u-n', JSON.stringify(llamadas))
    chk('nunca de la fábrica de pruebas', !S.__llamadas.rpc.some(r => r[1]?.p_unidad_negocio_id === PRUEBAS))
    chk('sin apagados (como la lista de siempre)', llamadas.every(r => r[1].p_incluir_apagados === false))
    const h = html(S, 'ad-clientes-lista')
    chk('se ven los clientes de las dos fábricas', /Anatolia Nuss/.test(h) && /Pastas Dolce Uno/.test(h) && /Heladería Sur/.test(h) && /Sin saldo Dolce/.test(h))
    chk('cada fila dice su empresa', /ad-sello--empresa" title="Empresa">Cucuruchos Nuss</.test(h) && /ad-sello--empresa" title="Empresa">Dolce Pasta</.test(h))
    const orden = ['Pastas Dolce Uno', 'Anatolia Nuss', 'Heladería Sur', 'Crédito Nuss', 'Sin saldo Dolce'].map(n => h.indexOf(n))
    chk('el que más debe arriba; un saldo a favor después; sin saldo, al final', orden.every((x, i) => x >= 0 && (i === 0 || x > orden[i - 1])), orden.join())
    chk('la cuenta dice clientes y fábricas', S.__els.get('ad-clientes-cuenta').textContent === '5 clientes · 2 fábricas', S.__els.get('ad-clientes-cuenta').textContent)
    chk('el segmento marca "Todas las fábricas" y ninguna empresa', /data-empresa="todas" aria-pressed="true"/.test(S.htmlEmpresas()) && !/data-empresa="u-n" aria-pressed="true"/.test(S.htmlEmpresas()))
    chk('la empresa elegida no cambia', S.estado.empresaId === 'u-n')
    // El límite de cada uno sale de la ficha de SU empresa: Dolce Uno (5000 > 4000) pasa su límite.
    const hd = h.slice(h.indexOf('Pastas Dolce Uno'), h.indexOf('Anatolia Nuss'))
    chk('el límite de un cliente de otra empresa sale de SU ficha (pasa su límite)', /Pasa su límite/.test(hd) && /límite/.test(hd), hd)
    chk('el código anterior también', /cód\. 7/.test(hd))
    chk('buscar por el código anterior de otra empresa lo encuentra', S.clientesFiltrados(S.clientesDeLaLista(), '7').map(c => c.cliente_id).join() === 'd1')
    chk('un saldo ausente dice "—", nunca "$ 0"', /Sin saldo Dolce[\s\S]*?—/.test(h) && !/Sin saldo Dolce[^<]*<\/span><span class="ad-fila__importe[^"]*">\$/.test(h))
    // El alta necesita UNA empresa.
    chk('con "Todas las fábricas" no se ofrece el alta', S.__els.get('ad-btn-cliente-nuevo').hidden === true)
    // El interruptor: la regla de la empresa del cliente (precios solo en Nuss).
    chk('el interruptor aparece en los de Nuss (retiros:precios ahí)', /data-cliente-activo="n1"/.test(h))
    chk('y NO en los de Dolce (sin permiso de guardar clientes ahí)', !/data-cliente-activo="d1"/.test(h))

    // Volver a una empresa: el segmento.
    S.__llamadas.rpc.length = 0
    S.elegirEnSegmento('u-n')
    await esperar()
    chk('elegir la misma empresa sale de "Todas las fábricas" y se queda en la lista', S.estado.vista === 'ad-vista-clientes' && S.clientesEnTodas() === false &&
      llamadasSaldo(S).length === 1 && llamadasSaldo(S)[0][1].p_unidad_negocio_id === 'u-n')
    chk('y la lista vuelve a ser de esa empresa, sin la columna', !/ad-sello--empresa/.test(html(S, 'ad-clientes-lista')) && /Anatolia Nuss/.test(html(S, 'ad-clientes-lista')) && !/Pastas Dolce/.test(html(S, 'ad-clientes-lista')))
  }

  // ── Una empresa que falla no tapa a las demás ──────────────────────────────
  {
    const S = nuevo({ falla: 'u-d' })
    await S.mostrarClientes()
    S.elegirEnSegmento('todas')
    await esperar()
    const h = html(S, 'ad-clientes-lista')
    chk('si falla una, se dice cuál', /No se pudieron leer los clientes de Dolce Pasta\. Los de las demás fábricas se ven igual\./.test(h), h.slice(0, 300))
    chk('y los de las otras se ven', /Anatolia Nuss/.test(h) && !/Pastas Dolce/.test(h))
  }
  {
    // Si fallan todas, el error de siempre (nunca una lista vacía que parezca "no hay clientes").
    const S = nuevo()
    S.__setRpc(async (n) => n === 'clientes_con_saldo' ? { data: null, error: { message: 'x' } } : { data: null, error: null })
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('si fallan todas, dice que no se pudieron leer', /No se pudieron leer los clientes/.test(h) && !/Ninguna fábrica tiene clientes/.test(h), h)
  }
  {
    // Ninguna fábrica con clientes.
    const S = nuevo({ saldos: { 'u-n': [], 'u-d': [] } })
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    chk('sin clientes en ninguna, lo dice así', /Ninguna fábrica tiene clientes todavía/.test(html(S, 'ad-clientes-lista')))
  }

  // ── Los apagados, también de todas ─────────────────────────────────────────
  {
    const S = nuevo()
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    S.cambiarMostrarApagados(true)
    await esperar()
    const h = html(S, 'ad-clientes-lista')
    chk('"Mostrar apagados" trae los apagados de cada empresa', /Kiosco Cerrado Nuss/.test(h) && /Kiosco Cerrado Dolce/.test(h))
    chk('con su empresa', /Kiosco Cerrado Dolce[\s\S]*?ad-sello--empresa" title="Empresa">Dolce Pasta/.test(h))
    chk('pedidos con p_incluir_apagados a cada empresa real', llamadasSaldo(S, true).map(r => r[1].p_unidad_negocio_id).sort().join() === 'u-d,u-n')
  }

  // ── Abrir un cliente: por SU empresa ───────────────────────────────────────
  {
    const S = nuevo()
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    S.__tablas.cliente_movimientos = { data: [], error: null }
    S.abrirClienteDeLista('d1')
    await esperar()
    chk('abrir un cliente de Dolce pasa la empresa a Dolce (su cuenta es de esa empresa)', S.estado.empresaId === 'u-d' && S.estado.cliente?.id === 'd1')
    chk('el segmento de la cuenta marca Dolce', /data-empresa="u-d" aria-pressed="true"/.test(S.htmlEmpresas()))
    await S.mostrarClientes()
    chk('"‹ Clientes" vuelve a la lista de todas', S.clientesEnTodas() === true && /Anatolia Nuss/.test(html(S, 'ad-clientes-lista')) && /Pastas Dolce/.test(html(S, 'ad-clientes-lista')))
    chk('el clic de la lista abre por su empresa', /if \(b\) abrirClienteDeLista\(b\.dataset\.cliente\)/.test(src))
    chk('el clic del segmento pasa por elegirEnSegmento (entiende "Todas las fábricas")', /const b = e\.target\.closest\('\[data-empresa\]'\)\n\s+if \(b\) elegirEnSegmento\(b\.dataset\.empresa\)/.test(src))
  }

  // ── Prender / apagar un cliente de otra empresa ────────────────────────────
  {
    let p = null
    const S = nuevo({ tareas: new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]]) })
    S.__setRpc(async (n, x) => {
      if (n === 'cambiar_activo_cliente') { p = x; return { data: null, error: null } }
      if (n === 'clientes_con_saldo') return { data: copia(SALDOS[x.p_unidad_negocio_id] ?? []), error: null }
      return { data: null, error: null }
    })
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    await S.cambiarActivoCliente('d1')
    await esperar()
    chk('apagar un cliente de otra empresa llama a cambiar_activo_cliente con ese cliente', p && p.p_cliente_id === 'd1' && p.p_activo === false)
    chk('y vuelve a leer la lista de todas', S.clientesEnTodas() && /Pastas Dolce/.test(html(S, 'ad-clientes-lista')))
  }
  {
    // Sin permiso en la empresa del cliente, no hace nada aunque se llame.
    let llamo = false
    const S = nuevo()
    S.__setRpc(async (n, x) => {
      if (n === 'cambiar_activo_cliente') { llamo = true; return { data: null, error: null } }
      if (n === 'clientes_con_saldo') return { data: copia(SALDOS[x.p_unidad_negocio_id] ?? []), error: null }
      return { data: null, error: null }
    })
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    await S.cambiarActivoCliente('d1')
    chk('sin permiso en la empresa del cliente, no se guarda', llamo === false)
  }

  // ── XSS: el nombre de la empresa y del cliente van escapados ───────────────
  {
    const S = nuevo()
    S.estado.empresas = S.estado.empresas.map(e => e.id === 'u-d' ? { ...e, nombre: marca('empresa') } : e)
    const saldos = copia(SALDOS)
    saldos['u-d'][0].nombre = marca('cliente')
    saldos['u-d'][0].lista = marca('lista')
    S.__setRpc(async (n, x) => n === 'clientes_con_saldo' ? { data: copia(saldos[x.p_unidad_negocio_id] ?? []), error: null } : { data: null, error: null })
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    chequearMarcas(chk, 'la lista de todas las fábricas', html(S, 'ad-clientes-lista'), ['empresa', 'cliente', 'lista'])
    chequearMarcas(chk, 'el segmento de empresas', S.htmlEmpresas(), ['empresa'])
  }
  {
    const S = nuevo({ falla: 'u-d' })
    S.estado.empresas = S.estado.empresas.map(e => e.id === 'u-d' ? { ...e, nombre: marca('fallo') } : e)
    S.estado.clientesTodas = true
    await S.mostrarClientes()
    chequearMarcas(chk, 'el aviso de la empresa que falló', html(S, 'ad-clientes-lista'), ['fallo'])
  }

  // ── Colores: "También proveedor" es un dato, no va en naranja ──────────────
  {
    const regla = /\.ad-sello--proveedor \{([^}]*)\}/.exec(src)?.[1] ?? ''
    chk('"También proveedor" ya no va en naranja (es un dato)', regla && !/naranja/.test(regla), regla)
    const reglaEmp = /\.ad-sello--empresa \{([^}]*)\}/.exec(src)?.[1] ?? ''
    chk('el sello de la empresa es neutro', reglaEmp && !/naranja|acento|bordo|verde/.test(reglaEmp), reglaEmp)
  }
}

pruebas().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
