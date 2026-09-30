// ADMINISTRACIÓN → CLIENTES: EL CLIENTE COMPLETO (30/09/2026).
//
// Pedido de Facu: un mismo cliente existe en varias fábricas con cuentas
// separadas (se cruzan por CUIT, o por nombre si no tiene).
//  - En la cuenta de un cliente, arriba: "También es cliente de Dolce Pasta:
//    debe $ Y · Total en el grupo: $ Z", con un toque para ir a la otra cuenta.
//  - En la lista de Clientes con "Todas las fábricas", "Agrupar por cliente":
//    una sola fila por cliente con lo que debe en cada empresa y el total.
// Se EJECUTAN las funciones reales del módulo.
//
//   node pruebas/test-administracion-cliente-grupo.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 25; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))
const plata = (t) => String(t).replace(/ /g, ' ')

// Anatolia: CUIT en las dos (debe 1.500 en Nuss y 800 en Dolce).
// Kiosco Pepe: sin CUIT en las dos, se cruza por el nombre.
// Heladería Sur: CUIT distinto en cada una → NO son el mismo cliente.
// Bar Solo: solo en Nuss.
// "Pastas Uno" sin CUIT en Dolce, y en Nuss con CUIT y el mismo nombre → se suma.
const SALDOS = {
  'u-n': [
    { cliente_id: 'n-ana', nombre: 'Anatolia', cuit: '30-71234567-8', saldo: 1500, activo: true },
    { cliente_id: 'n-pepe', nombre: 'Kiosco Pepe', cuit: null, saldo: 100, activo: true },
    { cliente_id: 'n-hel', nombre: 'Heladería Sur', cuit: '20111111112', saldo: 50, activo: true },
    { cliente_id: 'n-bar', nombre: 'Bar Solo', cuit: null, saldo: null, activo: true },
    { cliente_id: 'n-pas', nombre: 'Pastas Uno', cuit: '30999999991', saldo: 10, activo: true },
  ],
  'u-d': [
    { cliente_id: 'd-ana', nombre: 'ANATOLIA SRL', cuit: '30712345678', saldo: 800, activo: true },
    { cliente_id: 'd-pepe', nombre: 'kiosco  pepe', cuit: '', saldo: -40, activo: true },
    { cliente_id: 'd-hel', nombre: 'Heladería Sur', cuit: '20222222223', saldo: 70, activo: true },
    { cliente_id: 'd-pas', nombre: 'Pastas Uno', cuit: null, saldo: 5, activo: true },
  ],
}
const FICHAS = {
  'u-n': SALDOS['u-n'].map(s => ({ id: s.cliente_id, nombre: s.nombre, cuit: s.cuit, activo: true })),
  'u-d': SALDOS['u-d'].map(s => ({ id: s.cliente_id, nombre: s.nombre, cuit: s.cuit, activo: true })),
}

function nuevo({ saldos = SALDOS, falla = null, tareas = null } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = tareas ?? new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]])
  S.estado.unidadBarra = null
  S.__tablas.clientes = (filtros) => {
    const u = filtros.find(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id')?.[2]
    return { data: copia(FICHAS[u] ?? []), error: null }
  }
  S.__tablas.cliente_movimientos = { data: [], error: null }
  S.__setRpc(async (n, p) => {
    if (n === 'clientes_con_saldo') {
      if (falla === p.p_unidad_negocio_id) return { data: null, error: { message: 'se cayó' } }
      return { data: copia(saldos[p.p_unidad_negocio_id] ?? []), error: null }
    }
    if (n === 'cuenta_cliente') return { data: [{ fecha: '2026-09-01', tipo: 'retiro', detalle: 'x', importe: 1500, saldo: 1500, orden_retiro_id: null }], error: null }
    return { data: null, error: null }
  })
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const con = (filas) => filas.map(f => ({ ...f }))

async function pruebas() {
  // ── El cruce: por CUIT, o por nombre si no tiene ───────────────────────────
  {
    const S = nuevo()
    const todas = [...con(SALDOS['u-n']).map(f => ({ ...f, unidad_negocio_id: 'u-n' })), ...con(SALDOS['u-d']).map(f => ({ ...f, unidad_negocio_id: 'u-d' }))]
    const grupos = S.agruparClientes(todas)
    const de = (id) => grupos.find(g => g.filas.some(f => f.cliente_id === id)).filas.map(f => f.cliente_id).sort().join()
    chk('por CUIT (con o sin guiones), aunque el nombre sea otro', de('n-ana') === 'd-ana,n-ana', de('n-ana'))
    chk('sin CUIT, por el nombre (sin mayúsculas ni espacios de más)', de('n-pepe') === 'd-pepe,n-pepe', de('n-pepe'))
    chk('dos con CUIT distinto NO van juntos aunque se llamen igual', de('n-hel') === 'n-hel' && de('d-hel') === 'd-hel')
    chk('uno sin CUIT se suma al ÚNICO cliente con CUIT de ese nombre', de('d-pas') === 'd-pas,n-pas', de('d-pas'))
    chk('uno solo queda solo', de('n-bar') === 'n-bar')
    chk('un CUIT incompleto no cruza nada', S.cuitDeCliente({ cuit: '30-712' }) === '' && S.cuitDeCliente({ cuit: '30-71234567-8' }) === '30712345678')
    // Sin CUIT y el nombre es de DOS clientes con CUIT distinto: no se adivina.
    const amb = S.agruparClientes([
      { cliente_id: 'a', nombre: 'Heladería Sur', cuit: '20111111112' }, { cliente_id: 'b', nombre: 'Heladería Sur', cuit: '20222222223' },
      { cliente_id: 'c', nombre: 'Heladería Sur', cuit: null }])
    chk('sin CUIT y un nombre de dos clientes distintos: no se suma a ninguno', amb.find(g => g.filas.some(f => f.cliente_id === 'c')).filas.length === 1)
    const vacio = S.agruparClientes([{ cliente_id: 'x', nombre: '', cuit: null }, { cliente_id: 'y', nombre: ' ', cuit: null }])
    chk('dos sin CUIT ni nombre no se juntan', vacio.length === 2)
  }

  // ── El total del grupo ──────────────────────────────────────────────────────
  {
    const S = nuevo()
    chk('el total suma lo que debe en cada empresa', S.totalDelGrupo([{ saldo: 1500 }, { saldo: 800 }]) === 2300)
    chk('un saldo a favor resta', S.totalDelGrupo([{ saldo: 100 }, { saldo: -40 }]) === 60)
    chk('los centavos no se pierden', S.totalDelGrupo([{ saldo: 0.1 }, { saldo: 0.2 }]) === 0.3)
    chk('un saldo desconocido no cuenta como cero, pero no borra los otros', S.totalDelGrupo([{ saldo: null }, { saldo: 5 }]) === 5)
    chk('sin ningún saldo conocido, null ("—", nunca "$ 0")', S.totalDelGrupo([{ saldo: null }, { saldo: '' }]) === null)
    chk('"debe" / "tiene a favor" / "cuenta en cero" / "sin movimientos"',
      /^debe \$\s1\.500,00$/.test(plata(S.textoDebeGrupo(1500))) && /^tiene a favor \$\s40,00$/.test(plata(S.textoDebeGrupo(-40))) &&
      S.textoDebeGrupo(0) === 'cuenta en cero' && S.textoDebeGrupo(null) === 'sin movimientos')
  }

  // ── "Agrupar por cliente" en Todas las fábricas ─────────────────────────────
  {
    const S = nuevo()
    await S.mostrarClientes()
    chk('con UNA empresa elegida no se ofrece "Agrupar por cliente"', S.__els.get('ad-clientes-agrupar-rotulo').hidden === true)
    S.elegirEnSegmento('todas')
    await esperar()
    chk('con "Todas las fábricas" se ofrece', S.__els.get('ad-clientes-agrupar-rotulo').hidden === false)
    chk('sin tildar, una fila por cuenta (como siempre)', !/data-grupo-cliente/.test(html(S, 'ad-clientes-lista')))
    S.estado.agruparClientes = true
    S.pintarClientes()
    const h = html(S, 'ad-clientes-lista')
    const grupos = (h.match(/data-grupo-cliente=/g) ?? []).length
    chk('tildado: una fila por cliente (Anatolia, Pepe, Pastas y las dos Heladerías y Bar = 6)', grupos === 6, String(grupos))
    const ana = h.slice(h.indexOf('data-grupo-cliente="cuit:30712345678"'), h.indexOf('</div></div>', h.indexOf('data-grupo-cliente="cuit:30712345678"')))
    chk('Anatolia dice lo que debe en cada empresa', /data-sello-empresa="u-n"[^]*?debe \$\s1\.500,00/.test(plata(ana)) && /data-sello-empresa="u-d"[^]*?debe \$\s800,00/.test(plata(ana)), ana)
    chk('y el total', /Total \$\s2\.300,00/.test(plata(ana)))
    chk('cada empresa es un botón que abre SU cuenta', /<button type="button" class="ad-grupo-cliente__cuenta" data-cliente="n-ana"/.test(ana) && /data-cliente="d-ana"/.test(ana))
    chk('el nombre distinto de la otra cuenta se ve', /ANATOLIA SRL/.test(ana))
    const orden = ['cuit:30712345678', 'cuit:20222222223', 'nombre:kiosco pepe', 'cuit:20111111112', 'cuit:30999999991', 'nombre:bar solo']
      .map(k => h.indexOf(`data-grupo-cliente="${k}"`))
    chk('el que más debe en total, arriba; sin saldo, al final (2.300, 70, 60, 50, 15, —)', orden.every((x, i) => x >= 0 && (i === 0 || x > orden[i - 1])), orden.join())
    const bar = h.slice(h.indexOf('data-grupo-cliente="nombre:bar solo"'))
    chk('sin ningún saldo, el total dice "—", nunca "$ 0"', /Total —/.test(bar.slice(0, 400)) && !/Total \$\s0/.test(plata(bar.slice(0, 400))), bar.slice(0, 400))
    chk('la cuenta dice clientes, cuentas y fábricas', S.__els.get('ad-clientes-cuenta').textContent === '6 clientes · 9 cuentas · 2 fábricas', S.__els.get('ad-clientes-cuenta').textContent)
    // Tocar una cuenta del grupo la abre por su empresa.
    S.abrirClienteDeLista('d-ana')
    await esperar()
    chk('tocar la de Dolce abre esa cuenta, con la empresa Dolce', S.estado.cliente?.id === 'd-ana' && S.estado.empresaId === 'u-d')
    // Salir de Todas: vuelve la lista de siempre aunque quede tildado.
    S.elegirEnSegmento('u-n')
    await esperar()
    await S.mostrarClientes()
    chk('con una empresa elegida, la lista no se agrupa aunque siga tildado', !/data-grupo-cliente/.test(html(S, 'ad-clientes-lista')) && S.agrupandoClientes() === false)
  }
  chk('el tilde "Agrupar por cliente" repinta la lista', /getElementById\('ad-clientes-agrupar'\)\.addEventListener\('change', \(e\) => \{ estado\.agruparClientes = !!e\.target\.checked; pintarClientes\(\) \}\)/.test(src))

  // ── "También es cliente de…" en la cuenta ──────────────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('n-ana')
    await esperar()
    const h = plata(html(S, 'ad-cliente-cuerpo'))
    chk('arriba: "También es cliente de Dolce Pasta: debe $ 800"', /También es cliente de<\/span><span><button type="button" class="ad-link" data-otra-cuenta="d-ana" data-otra-unidad="u-d">Dolce Pasta<\/button>: debe \$ 800,00<\/span>/.test(h), h.slice(0, 600))
    chk('y el total en el grupo (1.500 de esta + 800)', /· Total en el grupo: \$ 2\.300,00/.test(h))
    chk('clientes_con_saldo se pide a la OTRA empresa (con apagados)', S.__llamadas.rpc.some(r => r[0] === 'clientes_con_saldo' && r[1].p_unidad_negocio_id === 'u-d' && r[1].p_incluir_apagados === true) &&
      !S.__llamadas.rpc.some(r => r[0] === 'clientes_con_saldo' && r[1].p_unidad_negocio_id === 'u-n'))
    // El toque va a la otra cuenta.
    S.abrirOtraCuenta('d-ana', 'u-d')
    await esperar()
    chk('el toque abre la cuenta de Dolce, con la empresa Dolce', S.estado.cliente?.id === 'd-ana' && S.estado.empresaId === 'u-d')
    const h2 = plata(html(S, 'ad-cliente-cuerpo'))
    chk('y desde ahí dice que también es cliente de Nuss', /data-otra-cuenta="n-ana" data-otra-unidad="u-n">Nuss<\/button>: debe \$ 1\.500,00/.test(h2), h2.slice(0, 500))
    chk('el clic sobre la cuenta abre la otra', /const o = e\.target\.closest\('\[data-otra-cuenta\]'\)\n\s+if \(o\) abrirOtraCuenta\(o\.dataset\.otraCuenta, o\.dataset\.otraUnidad\)/.test(src))
  }
  {
    // Sin CUIT, por el nombre; con saldo a favor.
    const S = nuevo()
    await S.abrirCliente('n-pepe')
    await esperar()
    const h = plata(html(S, 'ad-cliente-cuerpo'))
    chk('sin CUIT se cruza por el nombre (tiene a favor en Dolce)', /Dolce Pasta<\/button>: tiene a favor \$ 40,00/.test(h), h.slice(0, 500))
  }
  {
    // Un cliente que no está en otra fábrica: nada.
    const S = nuevo()
    await S.abrirCliente('n-hel')
    await esperar()
    chk('con CUIT distinto en la otra fábrica, no dice nada', !/También es cliente/.test(html(S, 'ad-cliente-cuerpo')))
  }
  {
    // Si la otra fábrica no contesta, se dice (nunca "no es cliente").
    const S = nuevo({ falla: 'u-d' })
    await S.abrirCliente('n-ana')
    await esperar()
    chk('si la otra fábrica no contesta, lo dice en chico', /No se pudo ver si también es cliente de otras fábricas\./.test(html(S, 'ad-cliente-cuerpo')))
  }
  {
    // Sin permiso de ver clientes en la otra fábrica: no se le pregunta.
    // (Con precios en Dolce, Dolce está en Administración, pero sin retiros:ver
    // sus clientes no se leen.)
    const S = nuevo({ tareas: new Map([['retiros:ver', { unidades: ['u-n'] }], ['retiros:precios', { todas: true }]]) })
    await S.abrirCliente('n-ana')
    await esperar()
    chk('sin retiros:ver en la otra fábrica, no se le pregunta nada', !S.__llamadas.rpc.some(r => r[0] === 'clientes_con_saldo') && !/También es cliente/.test(html(S, 'ad-cliente-cuerpo')))
  }
  {
    // Con otra unidad elegida arriba, esa cuenta no se abre desde acá: solo se dice.
    const S = nuevo()
    S.estado.unidadBarra = 'u-n'
    await S.abrirCliente('n-ana')
    await esperar()
    const h = plata(html(S, 'ad-cliente-cuerpo'))
    chk('con Nuss elegida arriba, Dolce se nombra pero no es un botón', /<strong>Dolce Pasta<\/strong>: debe \$ 800,00/.test(h) && !/data-otra-cuenta/.test(h), h.slice(0, 500))
    S.abrirOtraCuenta('d-ana', 'u-d')
    await esperar()
    chk('y abrirOtraCuenta no cambia de empresa', S.estado.empresaId === 'u-n' && S.estado.cliente.id === 'n-ana')
  }
  {
    // Una respuesta vieja no pisa la cuenta nueva.
    // Se guardan TODAS las que esperan: si algo falla, ninguna cuelga la suite.
    const pendientes = []
    const S = nuevo()
    S.__setRpc(async (n, p) => {
      if (n === 'clientes_con_saldo') return new Promise(r => pendientes.push(() => r({ data: copia(SALDOS[p.p_unidad_negocio_id]), error: null })))
      if (n === 'cuenta_cliente') return { data: [], error: null }
      return { data: null, error: null }
    })
    const p1 = S.abrirCliente('n-ana')
    await esperar()
    const p2 = S.abrirCliente('n-bar')
    await esperar()
    pendientes[0]?.()   // llega tarde la de Anatolia
    await esperar()
    chk('la respuesta de la cuenta anterior no pisa la nueva', S.estado.cliente?.id === 'n-bar' && S.estado.cliente.otras === null && !/También es cliente/.test(html(S, 'ad-cliente-cuerpo')))
    for (const f of pendientes) f()
    await Promise.all([p1, p2])
  }

  // ── XSS ────────────────────────────────────────────────────────────────────
  {
    const saldos = copia(SALDOS)
    saldos['u-d'][0].nombre = marca('otro-nombre')
    saldos['u-d'][0].cliente_id = marca('otro-id')
    saldos['u-n'][0].nombre = marca('nombre')
    const S = nuevo({ saldos })
    S.estado.empresas = S.estado.empresas.map(e => e.id === 'u-d' ? { ...e, nombre: marca('empresa'), prefijo: null } : e)
    S.estado.clientesTodas = true
    S.estado.agruparClientes = true
    await S.mostrarClientes()
    chequearMarcas(chk, 'la lista agrupada', html(S, 'ad-clientes-lista'), ['nombre', 'otro-nombre', 'otro-id', 'empresa'])
    FICHAS_XSS: {
      const c = { id: 'n-ana', otras: { filas: [{ cliente_id: marca('id-cuenta'), unidad_negocio_id: 'u-d', empresa: marca('emp-cuenta'), saldo: 1 }], error: null } }
      chequearMarcas(chk, 'el "También es cliente de"', S.htmlOtrasCuentas(c, 1), ['id-cuenta', 'empresa'])
    }
  }
}

pruebas().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
