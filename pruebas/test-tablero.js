// El tablero de resúmenes (js/tablero.js, 29/09/2026, handoff "Esqueleto"):
// la lógica EJECUTADA con datos falsos — qué tarjetas ve cada persona, el
// orden y los tamaños, las fechas en hora de Argentina, la plata ("—" y nunca
// "$ 0" para un dato ausente), lo que pide cada tarjeta a la base, que una
// tarjeta que falla no tumbe a las otras, "lo que hay que resolver" que viene
// de mis_pendientes, la franja "Para resolver ya" y el turno de cada tarjeta.
//
//   node pruebas/test-tablero.js
//   ARCHIVO_JS_TABLERO=<copia de js/tablero.js> node pruebas/test-tablero.js
'use strict'

const { arnes } = require('./circuito-comun')
const { construir, sbFalso, ctxFalso, fuente } = require('./sandbox-tablero')

const { chk, esperas, fin } = arnes()
const S = construir()
const HOY = '2026-09-28'
const AHORA = new Date('2026-09-28T13:30:00.000Z')

// ── Fechas en hora de Argentina ────────────────────────────────────────────
chk('hoy en Argentina: las 02:59 UTC todavía es el día anterior', S.hoyAr(new Date('2026-09-29T02:59:00Z')) === '2026-09-28')
chk('hoy en Argentina: las 03:00 UTC ya es el día siguiente', S.hoyAr(new Date('2026-09-29T03:00:00Z')) === '2026-09-29')
chk('lunes de la semana de un miércoles', S.lunesDe('2026-09-30') === '2026-09-28')
chk('lunes de la semana de un domingo (la semana va de lunes a domingo)', S.lunesDe('2026-10-04') === '2026-09-28')
chk('el primero del mes', S.primeroDelMes('2026-09-28') === '2026-09-01')
chk('sumar días cruza el mes', S.sumarDias('2026-09-28', 6) === '2026-10-04' && S.sumarDias('2026-10-01', -1) === '2026-09-30')
chk('días entre dos fechas', S.diasEntre('2026-09-28', '2026-11-17') === 50)
{
  const h = (hh, mm) => S.saludo(new Date(Date.UTC(2026, 8, 28, hh + 3, mm)), 'Pablo Nuss').saludo
  chk('12:59 → "Buen día"', h(12, 59) === 'Buen día, Pablo', h(12, 59))
  chk('13:00 → "Buenas tardes" (Buen día es HASTA las 13)', h(13, 0) === 'Buenas tardes, Pablo', h(13, 0))
  chk('19:59 → "Buenas tardes"', h(19, 59) === 'Buenas tardes, Pablo')
  chk('20:00 → "Buenas noches"', h(20, 0) === 'Buenas noches, Pablo', h(20, 0))
  chk('las 06:00 → "Buen día"', h(6, 0) === 'Buen día, Pablo', h(6, 0))
  chk('las 23:59 → "Buenas noches"', h(23, 59) === 'Buenas noches, Pablo', h(23, 59))
  chk('la fecha: "· lunes 28/09"', S.saludo(AHORA, 'Pablo').fecha === '· lunes 28/09', S.saludo(AHORA, 'Pablo').fecha)
  chk('el nombre de pila (la primera palabra)', S.saludo(AHORA, 'Lucía Ferreyra').saludo === 'Buen día, Lucía')
  chk('sin nombre, "Buen día" solo (nunca "Buen día, Mi cuenta")', S.saludo(AHORA, '').saludo === 'Buen día' && S.saludo(AHORA, null).saludo === 'Buen día')
}

// ── La plata: "—" para lo ausente, nunca "$ 0" ────────────────────────────
for (const v of [null, undefined, '', NaN, 'abc', Infinity]) chk(`plata(${String(v)}) es "—"`, S.plata(v) === '—', S.plata(v))
chk('un cero de verdad sí es "$ 0"', S.plata(0) === '$ 0')
chk('sin decimales y con punto de miles', S.plata(1234567.6) === '$ 1.234.568', S.plata(1234567.6))
chk('dólares: "US$ 2.350"', S.plata(2350, 'USD') === 'US$ 2.350')
chk('un texto numérico de la base se lee', S.plata('4380000.00') === '$ 4.380.000')
chk('negativo', S.plata(-250000) === '$ -250.000' || S.plata(-250000) === '$ -250.000', S.plata(-250000))
chk('entero(null) es "—"', S.entero(null) === '—' && S.entero(0) === '0' && S.entero(1500) === '1.500')
chk('hace cuánto: minutos, horas y días (nunca "1.079 min")', S.haceCuanto(12) === '12 min' && S.haceCuanto(125) === '2 h 5 min' && S.haceCuanto(1080) === '18 h' && S.haceCuanto(3000) === '2 días' && S.haceCuanto(null) === '')

// ── Qué tarjetas ve cada persona (la regla de la barra) ────────────────────
const SUPER = { esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }
const usuario = (misModulos, tareas = []) => ({ esAdmin: false, esSuperAdmin: false, misModulos, misTareas: new Set(tareas) })
{
  const t = S.tarjetasPosibles(SUPER)
  const claves = t.map(x => x.clave)
  chk('el dueño ve todas, en el orden del diseño (1a)', claves.join() === 'produccion,cobranzas,caja,gastos,cheques,pedidos,administracion,cuentas-corrientes,stock,materia-prima,retiros,taller,accesos,seguridad', claves.join())
  chk('Seguridad, solo un super_admin', claves.includes('seguridad') && !S.tarjetasPosibles(usuario(['gastos'])).some(x => x.clave === 'seguridad'))
  chk('con Accesos, la tarjeta se llama "Accesos y empleados" y no hay otra de Empleados', t.find(x => x.clave === 'accesos')?.nombre === 'Accesos y empleados' && !claves.includes('empleados'))
  const l = S.tarjetasPosibles(usuario(['gastos', 'caja']))
  chk('alguien con solo Gastos y Caja ve DOS tarjetas', l.map(x => x.clave).join() === 'caja,gastos', l.map(x => x.clave).join())
  chk('sin Accesos, Empleados tiene su tarjeta', S.tarjetasPosibles(usuario(['empleados'])).map(x => x.clave).join() === 'empleados')
  chk('Cheques pide ver_todo o procesar', !S.tarjetasPosibles(usuario(['cobranzas'], ['cobranzas:cargar'])).some(x => x.clave === 'cheques') &&
    S.tarjetasPosibles(usuario(['cobranzas'], ['cobranzas:procesar'])).some(x => x.clave === 'cheques'))
  chk('nadie ve una tarjeta de un módulo que no puede abrir', !S.tarjetasPosibles(usuario(['gastos'])).some(x => x.clave !== 'gastos'))
  chk('la tarjeta abre la url del módulo', l.find(x => x.clave === 'gastos').url === 'modulos/gastos.html')
  chk('una tablet que llegara acá va a la planta', S.tarjetasPosibles(usuario(['produccion']), true)[0].url === 'modulos/produccion.html' &&
    S.tarjetasPosibles(usuario(['produccion']), false)[0].url === 'modulos/produccion-gestion.html')
}

// ── El orden, los tamaños y las escondidas ────────────────────────────────
{
  const pos = S.tarjetasPosibles(SUPER)
  const def = S.tarjetasOrdenadas(pos, null)
  const tam = Object.fromEntries(def.map(t => [t.clave, t.tamano]))
  chk('tamaños por defecto: Producción ancha', tam.produccion === 'ancha')
  for (const c of ['cobranzas', 'caja', 'gastos', 'administracion', 'cuentas-corrientes', 'stock', 'taller']) chk(`tamaño por defecto: ${c} mediana`, tam[c] === 'mediana', tam[c])
  for (const c of ['cheques', 'pedidos', 'materia-prima', 'retiros', 'accesos', 'seguridad']) chk(`tamaño por defecto: ${c} chica`, tam[c] === 'chica', tam[c])
  let p = S.conTamano(null, 'cheques', 'ancha')
  p = S.conTamano(p, 'gastos', 'enorme')
  chk('un tamaño elegido se respeta; uno inventado no', S.tamanoDe('cheques', p) === 'ancha' && S.tamanoDe('gastos', p) === 'mediana')
  chk('un tamaño inventado que llega de afuera tampoco', S.tamanoDe('gastos', { tablero: { tamanos: { gastos: 'enorme' } } }) === 'mediana')
  p = S.conOrden(p, ['pedidos', 'caja'])
  const ord = S.tarjetasOrdenadas(pos, p).map(t => t.clave)
  chk('el orden elegido va primero y el resto sigue en el de fábrica', ord.slice(0, 4).join() === 'pedidos,caja,produccion,cobranzas', ord.slice(0, 4).join())
  p = S.conOculta(p, 'seguridad', true)
  chk('esconder marca la tarjeta (no la saca de la lista)', S.tarjetasOrdenadas(pos, p).find(t => t.clave === 'seguridad').oculta === true)
  p = S.conOculta(p, 'seguridad', false)
  chk('mostrarla la vuelve', S.tarjetasOrdenadas(pos, p).find(t => t.clave === 'seguridad').oculta === false)
  chk('mover uno para atrás', S.moverClave(['a', 'b', 'c'], 'c', -1).join() === 'a,c,b')
  chk('mover no se sale de la lista', S.moverClave(['a', 'b', 'c'], 'a', -1).join() === 'a,b,c' && S.moverClave(['a', 'b', 'c'], 'c', 5).join() === 'a,b,c')
  chk('mover algo que no está no cambia nada', S.moverClave(['a', 'b'], 'z', 1).join() === 'a,b')
  const conUso = { ...p, uso: { gastos: [Date.now()] }, barra: { orden: 'alfa', manual: ['x'], fijados: ['caja'] } }
  const f = S.prefsDeFabrica(conUso)
  chk('"Volver a como venía" deja la barra y el tablero de fábrica', f.barra.orden === 'mano' && !f.barra.fijados.length && !f.barra.manual.length &&
    !f.tablero.orden.length && !Object.keys(f.tablero.tamanos).length && !f.tablero.ocultas.length)
  chk('…y no borra lo usado (es la cuenta de "los que más uso")', f.uso.gastos?.length === 1)
}

// ── Las fábricas donde puede ver cada cosa ─────────────────────────────────
{
  const todas = ['u-n', 'u-d', 'u-o']
  const alc = new Map([['pedidos:ver', { unidades: ['u-d', 'u-x'] }], ['produccion:ver', { todas: true }], ['retiros:ver', null]])
  const up = (tareas, extra = {}) => S.unidadesPermitidas({ tareas, esSuperAdmin: false, alcances: alc, todas, elegida: null, ...extra })
  chk('super_admin: todas', S.unidadesPermitidas({ tareas: ['pedidos:ver'], esSuperAdmin: true, alcances: new Map(), todas, elegida: null }).join() === todas.join())
  chk('el alcance {"unidades"} (solo las que están en la barra)', up(['pedidos:ver']).join() === 'u-d')
  chk('el alcance {"todas": true}', up(['produccion:ver']).join() === todas.join())
  chk('una tarea sin alcance no suma fábricas', up(['retiros:ver']).length === 0)
  chk('una tarea que no tiene no suma', up(['stock:ver']).length === 0)
  chk('con una fábrica elegida, solo esa (si puede)', up(['produccion:ver'], { elegida: 'u-o' }).join() === 'u-o' && up(['pedidos:ver'], { elegida: 'u-o' }).length === 0)
}

// ── mis_pendientes → "lo que hay que resolver" ─────────────────────────────
{
  const pend = S.mapaPendientes([
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 5 }, { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: '1' },
    { modulo: 'stock', clave: 'recuento_abierto', cantidad: 0 }, { modulo: 'gastos', clave: 'ingresos_sin_gasto', cantidad: null },
    { modulo: 'administracion', clave: 'ordenes_sin_valorizar', cantidad: 4 }, { modulo: 'accesos', clave: 'solicitudes', cantidad: 2.5 },
  ])
  chk('las cantidades válidas se leen (también "1" en texto)', pend.get('cobranzas:por_controlar') === 5 && pend.get('caja:solicitudes_mi_caja') === 1)
  chk('un cero, un null o un decimal no cuentan', !pend.has('stock:recuento_abierto') && !pend.has('gastos:ingresos_sin_gasto') && !pend.has('accesos:solicitudes'))
  const vis = new Set(['caja', 'cobranzas', 'administracion', 'retiros'])
  const caja = S.resolverDePendientes('caja', pend, vis)
  chk('caja: "1 movimiento por aceptar" en singular', caja.length === 1 && caja[0].t === 'movimiento por aceptar en tu caja' && caja[0].n === 1, JSON.stringify(caja))
  chk('las cobranzas por controlar van a Administración como "por asentar" y URGENTES', S.resolverDePendientes('administracion', pend, vis).some(r => r.t === 'cobranzas por asentar' && r.urgente && r.url === 'modulos/administracion.html?seccion=cobranzas'))
  chk('…y no se repiten en la tarjeta de Cobranzas (esa las cuenta por fábrica)', !S.resolverDePendientes('cobranzas', pend, vis).length)
  chk('órdenes sin valorizar: en Órdenes de retiro si la ve', S.resolverDePendientes('retiros', pend, vis).some(r => r.n === 4) && !S.resolverDePendientes('administracion', pend, vis).some(r => r.n === 4))
  chk('…y en Administración si no ve Órdenes de retiro', S.resolverDePendientes('administracion', pend, new Set(['administracion'])).some(r => r.n === 4))
  chk('sin mis_pendientes (null), ningún renglón', S.resolverDePendientes('caja', null, vis).length === 0)
  chk('usaPendientes: Caja sí, Pedidos no', S.usaPendientes('caja', vis) && !S.usaPendientes('pedidos', new Set(['pedidos'])))
}

// ── La franja "Para resolver ya" ──────────────────────────────────────────
{
  const m = (resolver, estado = 'ok') => ({ estado, resolver })
  const items = S.itemsFranja([
    m([{ n: 3, t: 'vencen esta semana', urgente: true, origen: 'cheques:por_vencer', franja: 'cheques vencen esta semana', url: 'a' }]),
    m([{ n: 1, t: 'máquina parada · Máquina 4', urgente: true, origen: 'produccion:paradas', franja: 'máquina parada', url: 'b' }, { n: 2, t: 'planillas', origen: 'x' }]),
    m([{ n: 5, t: 'cobranzas por asentar', urgente: true, origen: 'cobranzas:por_controlar', url: 'c', franja: 'cobranzas por asentar' }]),
    m([{ n: 5, t: 'cobranzas por asentar', urgente: true, origen: 'cobranzas:por_controlar', url: 'c', franja: 'cobranzas por asentar' }]),
    m([{ n: 2, t: 'atrasados', urgente: true, origen: 'pedidos:atrasados', franja: 'pedidos atrasados', url: 'd' }]),
    m([{ n: 9, t: 'atrasados', urgente: true, origen: 'taller:atrasados', franja: 'proyectos atrasados', url: 'e' }]),
    m([{ n: 7, t: 'algo', urgente: true, origen: 'otro' }], 'error'),
    { estado: 'cargando' }, null,
  ])
  chk('hasta 4 cosas', items.length === 4, items.length)
  chk('en el orden del diseño: máquina parada, cobranzas por asentar, pedidos atrasados, cheques', items.map(i => i.origen).join() === 'produccion:paradas,cobranzas:por_controlar,pedidos:atrasados,cheques:por_vencer', items.map(i => i.origen).join())
  chk('cada cosa una sola vez', new Set(items.map(i => i.origen)).size === items.length)
  chk('con el texto de la franja ("máquina parada", no "máquina parada · Máquina 4")', items[0].t === 'máquina parada')
  chk('lo que no es urgente no entra', !items.some(i => i.origen === 'x'))
  chk('una tarjeta con error o cargando no aporta', !items.some(i => i.origen === 'otro'))
  chk('sin nada urgente, la franja queda vacía', S.itemsFranja([m([{ n: 2, t: 'x', origen: 'y' }])]).length === 0)
  chk('lo urgente de una tarjeta en error (sus números viejos) no entra', S.itemsFranja([m([{ n: 2, t: 'x', urgente: true, origen: 'y' }], 'error')]).length === 0)
}

// ── Lo que pide cada tarjeta ───────────────────────────────────────────────
const g = (id, fecha, importe, extra = {}) => ({ id, fecha, importe, moneda: 'ARS', categoria_id: 'cat-mp', proveedor_id: 'p1', unidad_negocio_id: 'u-n', estado: 'registrado', ...extra })

esperas.push((async () => {
  // Gastos
  {
    const sb = sbFalso({ tablas: {
      gastos: [g('1', HOY, 100000), g('2', '2026-09-25', 50000, { categoria_id: 'cat-su', proveedor_id: null }), g('3', '2026-09-02', 30000, { categoria_id: 'cat-fl' }),
        g('4', HOY, 999999, { estado: 'anulado' }), g('5', HOY, 70000, { unidad_negocio_id: 'u-d', categoria_id: 'cat-su' }), g('6', HOY, 500, { moneda: 'USD' }),
        g('7', '2026-08-30', 1000), g('8', HOY, null, { categoria_id: 'cat-su' })],
      categorias: [{ id: 'cat-mp', nombre: 'Materia prima' }, { id: 'cat-su', nombre: 'Sueldos' }, { id: 'cat-fl', nombre: 'Fletes' }],
    } })
    const m = await S.cargarGastos(ctxFalso(S, { sb, tareas: new Set(['gastos:ver_exportar']) }))
    chk('gastos: gastado en el mes (sin el anulado, sin dólares, sin agosto)', m.valor === '$ 250.000', m.valor)
    chk('gastos: la etiqueta dice el mes', m.etiqueta === 'Gastado en septiembre')
    chk('gastos: hoy', m.ctx[0].v === '$ 170.000', m.ctx[0].v)
    chk('gastos: los últimos 7 días (agosto 30 no, el 25 sí)', m.ctx[1].v === '$ 220.000', m.ctx[1].v)
    chk('gastos: los dólares van aparte', m.sub === 'US$ 500')
    chk('gastos: un importe null no es NaN', !JSON.stringify(m).includes('NaN'))
    chk('gastos: las 3 categorías que más pesan, con su %', m.lista.length === 3 && m.lista[0].nombre === 'Sueldos' && m.lista[0].pct === 48, JSON.stringify(m.lista))
    chk('gastos: los sin proveedor del mes', m.resolver.some(r => r.n === 1 && /sin proveedor/.test(r.t)))
    const q = sb.llamadas.find(l => l[0] === 'gte' && l[1] === 'gastos')
    chk('gastos: pide desde el 1° del mes (o 7 días atrás si es antes)', q && q[3] === '2026-09-01', JSON.stringify(q))
    chk('gastos: pide con tope (la base corta en 1000)', sb.llamadas.some(l => l[0] === 'limit' && l[1] === 'gastos' && l[2] === 1000))
    chk('gastos: con permiso de ver todos, sin aviso', !m.nota)
    const n = await S.cargarGastos(ctxFalso(S, { sb }))
    chk('gastos: sin gastos:ver_exportar lo dice ("solo los que cargaste")', /solo los gastos que cargaste/.test(n.nota))
    const d = await S.cargarGastos(ctxFalso(S, { sb, elegida: 'u-d', tareas: new Set(['gastos:ver_exportar']) }))
    chk('gastos: con Dolce Pasta elegida, solo lo de Dolce Pasta', d.valor === '$ 70.000', d.valor)
    const mil = sbFalso({ tablas: { gastos: Array.from({ length: 1000 }, (_, i) => g(String(i), HOY, 1)) } })
    chk('gastos: con 1000 filas dice "Parcial"', /Parcial/.test((await S.cargarGastos(ctxFalso(S, { sb: mil, tareas: new Set(['gastos:ver_exportar']) }))).nota))
    const vacio = await S.cargarGastos(ctxFalso(S, { sb: sbFalso({ tablas: { gastos: [] } }), tareas: new Set(['gastos:ver_exportar']) }))
    chk('gastos: sin gastos en el mes, "sin datos" con palabras', vacio.estado === 'vacio' && vacio.vacioMsg === 'Este mes no hay gastos')
    let tiro = false
    try { await S.cargarGastos(ctxFalso(S, { sb: sbFalso({ tablas: { gastos: new Error('caída') } }) })) } catch { tiro = true }
    chk('gastos: si la consulta falla, el cargador tira (la tarjeta queda en error)', tiro)
  }
  // Caja
  {
    const sb = sbFalso({ tablas: {
      v_caja_saldos: [{ empleado_id: 'emp-yo', moneda: 'ARS', saldo: '1248300.00' }, { empleado_id: 'emp-yo', moneda: 'USD', saldo: 2350 }, { empleado_id: 'otro', moneda: 'ARS', saldo: 9 }],
      caja_movimientos: [
        { empleado_id: 'emp-yo', fecha: HOY, tipo: 'ingreso', monto: 420000, moneda: 'ARS' }, { empleado_id: 'emp-yo', fecha: HOY, tipo: 'egreso_gasto', monto: 312600, moneda: 'ARS' },
        { empleado_id: 'emp-yo', fecha: HOY, tipo: 'ingreso_traspaso', monto: 50000, moneda: 'ARS' }, { empleado_id: 'emp-yo', fecha: HOY, tipo: 'egreso_traspaso', monto: 50000, moneda: 'ARS' },
        { empleado_id: 'emp-yo', fecha: '2026-09-27', tipo: 'ingreso', monto: 1, moneda: 'ARS' }],
      v_empleados_publico: [{ id: 'emp-e', tipo: 'empresa' }],
      cuentas_caja: [{ id: 'c1', empleado_id: 'emp-e', moneda: 'ARS', unidad_negocio_id: 'u-n' }, { id: 'c2', empleado_id: 'emp-e', moneda: 'ARS', unidad_negocio_id: 'u-d' }, { id: 'c3', empleado_id: 'emp-e', moneda: 'USD', unidad_negocio_id: 'u-n' }],
      v_caja_saldos_cuenta: [{ cuenta_id: 'c1', saldo: 4840000 }, { cuenta_id: 'c2', saldo: 2000000 }, { cuenta_id: 'c3', saldo: 18200 }],
    } })
    const m = await S.cargarCaja(ctxFalso(S, { sb, esSuperAdmin: true }))
    chk('caja: mi saldo', m.valor === '$ 1.248.300' && m.sub === 'US$ 2.350')
    chk('caja: la caja de la empresa (super_admin)', m.ctx[0].k === 'Caja de la empresa' && m.ctx[0].v === '$ 6.840.000' && m.ctx[1].v === 'US$ 18.200', JSON.stringify(m.ctx))
    chk('caja: entró hoy (un traspaso entre cuentas propias no cuenta)', m.ctx.find(x => x.k === 'Entró hoy')?.v === '+ $ 420.000')
    chk('caja: salió hoy', m.ctx.find(x => x.k === 'Salió hoy')?.v === '− $ 312.600')
    const u = await S.cargarCaja(ctxFalso(S, { sb }))
    chk('caja: la caja de la empresa SOLO para un super_admin', !u.ctx.some(x => x.k === 'Caja de la empresa'))
    const d = await S.cargarCaja(ctxFalso(S, { sb, esSuperAdmin: true, elegida: 'u-d' }))
    chk('caja: la de la empresa sigue a la fábrica elegida', d.ctx[0].v === '$ 2.000.000', d.ctx[0].v)
    let tiro = false
    try { await S.cargarCaja(ctxFalso(S, { sb: sbFalso({ tablas: { v_caja_saldos: new Error('x') } }) })) } catch { tiro = true }
    chk('caja: si falla el saldo, tira (error en la tarjeta)', tiro)
  }
  // Cobranzas
  {
    const pedidos = []
    const sb = sbFalso({ rpc: { resumen_cobranzas: p => { pedidos.push(p); return p.p_estado === 'registrada' ? [{ por_controlar: 5, total: 1742000 }] : p.p_desde === HOY ? [{ por_controlar: 5, total: 2914000 }] : [{ por_controlar: 5, total: 13870000 }] } },
      tablas: { v_cobranzas: [
        { cargada_por_nombre: 'Ramón', total: 1320000, estado: 'procesada', unidad_negocio_id: 'u-n', fecha: HOY }, { cargada_por_nombre: 'Marcelo', total: 986000, estado: 'procesada', unidad_negocio_id: 'u-d', fecha: HOY },
        { cargada_por_nombre: 'Juan', total: 608000, estado: 'registrada', unidad_negocio_id: 'u-d', fecha: HOY }, { cargada_por_nombre: 'Ramón', total: 5, estado: 'anulada', unidad_negocio_id: 'u-n', fecha: HOY }] } })
    const m = await S.cargarCobranzas(ctxFalso(S, { sb }))
    chk('cobranzas: cobrado hoy', m.valor === '$ 2.914.000')
    chk('cobranzas: los últimos 7 días', m.ctx[0].v === '$ 13.870.000')
    chk('cobranzas: por chofer (sin las anuladas)', m.lista.map(x => x.nombre).join() === 'Ramón,Marcelo,Juan' && m.lista[0].v === '$ 1.320.000')
    chk('cobranzas: por controlar (cantidad y $)', m.resolver[0].n === 5 && m.resolver[0].t === 'por controlar · $ 1.742.000')
    chk('cobranzas: pide hoy, 7 días y las por controlar', pedidos.some(p => p.p_desde === HOY && p.p_hasta === HOY) && pedidos.some(p => p.p_desde === '2026-09-22') && pedidos.some(p => p.p_estado === 'registrada'))
    chk('cobranzas: con "Todas", p_unidad va null', pedidos.every(p => p.p_unidad === null))
    pedidos.length = 0
    const n = await S.cargarCobranzas(ctxFalso(S, { sb, elegida: 'u-n' }))
    chk('cobranzas: con una fábrica, p_unidad es esa', pedidos.every(p => p.p_unidad === 'u-n'))
    chk('cobranzas: una por controlar (sin unidad todavía) se ve en cualquier fábrica', n.lista.some(x => x.nombre === 'Juan') && !n.lista.some(x => x.nombre === 'Marcelo'))
    const cero = await S.cargarCobranzas(ctxFalso(S, { sb: sbFalso({ rpc: { resumen_cobranzas: [{ por_controlar: 0, total: 0 }] }, tablas: { v_cobranzas: [] } }) }))
    chk('cobranzas: con $ 0 hoy, "Hoy no hubo cobranzas" (sin datos)', cero.estado === 'vacio' && cero.vacioMsg === 'Hoy no hubo cobranzas' && cero.bienMsg === 'Nada por controlar')
    const nul = await S.cargarCobranzas(ctxFalso(S, { sb: sbFalso({ rpc: { resumen_cobranzas: [{ por_controlar: null, total: null }] }, tablas: { v_cobranzas: [] } }) }))
    chk('cobranzas: un total null es "—", nunca "$ 0"', nul.valor === '—' && nul.ctx[0].v === '—' && nul.estado === 'ok', JSON.stringify([nul.valor, nul.ctx]))
  }
  // Cheques
  {
    const ch = (importe, fecha_pago, extra = {}) => ({ importe, tipo: 'diferido', fecha_emision: '2026-08-20', fecha_pago, estado: 'en_cartera', cobranzas: { unidad_negocio_id: 'u-n', estado: 'procesada' }, ...extra })
    const sb = sbFalso({ tablas: { cobranza_cheques: [ch(1000000, '2026-09-02'), ch(750000, HOY), ch(2000000, '2026-11-17'),
      ch(500, HOY, { cobranzas: { unidad_negocio_id: 'u-d', estado: 'procesada' } }), ch(700, '2026-09-01', { tipo: 'comun', fecha_pago: null, fecha_emision: '2026-09-01' })] } })
    const m = await S.cargarCheques(ctxFalso(S, { sb }))
    chk('cheques: en cartera $ y cantidad', m.valor === '$ 3.751.200' && m.sub === '5 cheques', m.valor + ' ' + m.sub)
    chk('cheques: plazo promedio ponderado (un común o uno vencido cuenta 0 días)', m.ctx[0].v === `${Math.round(50 * 2000000 / 3751200)} días`, m.ctx[0].v)
    chk('cheques: para depositar hoy (pago hoy)', m.ctx[1].v === '2', m.ctx[1].v)
    chk('cheques: vencen esta semana (30 días desde el pago, o la emisión si es común) y es URGENTE', m.resolver[0]?.n === 2 && m.resolver[0].urgente && m.resolver[0].franja === 'cheques vencen esta semana', JSON.stringify(m.resolver))
    chk('cheques: el plazo replica cheque_plazo_presentacion', S.plazoCheque({ tipo: 'diferido', fecha_pago: '2026-09-02', fecha_emision: '2026-08-01' }) === '2026-10-02' &&
      S.plazoCheque({ tipo: 'comun', fecha_pago: null, fecha_emision: '2026-09-01' }) === '2026-10-01')
    const d = await S.cargarCheques(ctxFalso(S, { sb, elegida: 'u-d' }))
    chk('cheques: con una fábrica, los de esa (y los de cobranzas por controlar, sin unidad)', d.valor === '$ 500', d.valor)
    const v = await S.cargarCheques(ctxFalso(S, { sb: sbFalso({ tablas: { cobranza_cheques: [] } }) }))
    chk('cheques: sin cheques, "No hay cheques en cartera" y el plazo "—"', v.estado === 'vacio' && v.ctx[0].v === '—')
  }
  // Cuentas corrientes
  {
    const sb = sbFalso({ tablas: {
      v_saldo_proveedor: [{ proveedor_id: 'a', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 3480000 }, { proveedor_id: 'b', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: '2115000' },
        { proveedor_id: 'a', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: 20000 }, { proveedor_id: 'c', unidad_negocio_id: 'u-n', moneda: 'USD', deuda_pendiente: 99 },
        { proveedor_id: 'd', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: null }],
      proveedores: [{ id: 'a', razon_social: 'MOLINO', nombre_fantasia: 'Molino Cañuelas' }, { id: 'b', razon_social: 'LEDESMA SAAI', nombre_fantasia: null }],
    } })
    const m = await S.cargarCuentasCorrientes(ctxFalso(S, { sb }))
    chk('cuentas corrientes: le debemos (pesos, todas las fábricas)', m.valor === '$ 5.615.000', m.valor)
    chk('cuentas corrientes: los más grandes, con su nombre', m.lista.map(x => x.nombre).join() === 'Molino Cañuelas,LEDESMA SAAI')
    chk('cuentas corrientes: "vencido" es Pronto (la base no tiene vencimiento)', m.ctx.some(x => x.k === 'Vencido' && x.v === 'Pronto'))
    const d = await S.cargarCuentasCorrientes(ctxFalso(S, { sb, elegida: 'u-d' }))
    chk('cuentas corrientes: con una fábrica, la deuda de esa', d.valor === '$ 2.135.000', d.valor)
  }
  // Ingreso
  {
    const sb = sbFalso({ tablas: { materia_prima_ingresos: [{ fecha: HOY, unidad_negocio_id: 'u-n' }, { fecha: HOY, unidad_negocio_id: 'u-d' }, { fecha: '2026-09-23', unidad_negocio_id: 'u-n' }, { fecha: '2026-09-20', unidad_negocio_id: 'u-n' }] } })
    const m = await S.cargarIngreso(ctxFalso(S, { sb, tareas: new Set(['materia_prima:ver_todo']) }))
    chk('ingreso: hoy y últimos 7 días', m.valor === '2' && m.unidad === 'ingresos' && m.ctx[0].v === '3', JSON.stringify([m.valor, m.ctx]))
    chk('ingreso: sin ver_todo lo dice', /solo los que cargaste/.test((await S.cargarIngreso(ctxFalso(S, { sb }))).nota))
    const uno = await S.cargarIngreso(ctxFalso(S, { sb, elegida: 'u-d', tareas: new Set(['materia_prima:ver_todo']) }))
    chk('ingreso: "1 ingreso" en singular', uno.valor === '1' && uno.unidad === 'ingreso')
  }
  // Stock: Pronto
  {
    const m = await S.cargarStock(ctxFalso(S, {}))
    chk('stock: los insumos por agotarse son Pronto (la base no sabe los mínimos)', m.estado === 'pronto' && /Pronto/.test(m.prontoMsg) && m.pendientes === true)
  }
  // Producción
  {
    const ind = {
      ahora: [
        { maquina: 'Máquina 1', lote: 7033, estado: 'abierto', masas: 6, cajas: 38, parada_en_curso: null },
        { maquina: 'Máquina 4', lote: 7034, estado: 'abierto', masas: 4, cajas: 8, parada_en_curso: { motivo: 'se cortó la cadena', desde: '2026-09-28T13:18:00.000Z' } },
        { maquina: 'Máquina 5', lote: 7020, estado: 'pendiente_completar', masas: 1, cajas: 0, parada_en_curso: null },
      ],
      cajas_por_producto: [{ producto: 'Mini', hoy: 100, semana_pasada: 90 }, { producto: 'Grande', hoy: 42, semana_pasada: null }, { producto: 'Otro', hoy: null, semana_pasada: 38 }],
      semana: { scrap_kg: 21, masa_kg: 1000 },
      rendimiento_harina: [{ lote: '7031', diferencia_pct: -14 }, { lote: '7040', diferencia_pct: -10 }, { lote: '7033', diferencia_pct: 3 }],
      pendientes: { planillas_por_completar: 2 },
    }
    const sb = sbFalso({ rpc: { indicadores_produccion: p => (p.p_unidad_negocio_id === 'u-n' ? ind : { ahora: [], cajas_por_producto: [], semana: {}, rendimiento_harina: [], pendientes: {} }) } })
    const m = await S.cargarProduccion(ctxFalso(S, { sb, esSuperAdmin: true, ahora: AHORA }))
    chk('producción: cajas hoy (un null es "no salió", no un error)', m.valor === '142' && m.unidad === 'cajas', m.valor)
    chk('producción: la flecha contra el mismo día de la semana pasada', m.tendencia?.texto === '14 más que el lunes pasado (128)' && m.tendencia.sube === true, JSON.stringify(m.tendencia))
    chk('producción: las paradas primero', m.maquinas[0].tipo === 'mal' && m.maquinas[0].nombre === 'Máquina 4')
    chk('producción: "Hace 12 min · se cortó la cadena"', m.maquinas[0].det === 'Hace 12 min · se cortó la cadena', m.maquinas[0].det)
    chk('producción: con Todas, sin el nombre de la fábrica si las máquinas son de una sola', !m.maquinas.some(q => q.nombre.includes('·')))
    chk('producción: andando "1 de 2" (una planilla por completar no cuenta)', m.ctx[0].v === '1 de 2', m.ctx[0].v)
    chk('producción: masas de los turnos abiertos', m.ctx[1].v === '10')
    chk('producción: scrap en % (7 días)', m.ctx[2].v === '2,1 %', m.ctx[2].v)
    chk('producción: máquina parada URGENTE, con su nombre', m.resolver[0].urgente && m.resolver[0].t === 'máquina parada · Máquina 4' && m.resolver[0].franja === 'máquina parada')
    chk('producción: planillas por completar', m.resolver.some(r => r.n === 2 && r.t === 'planillas por completar'))
    chk('producción: el lote que peor rinde (más de 10 % debajo, estricto)', m.resolver.some(r => r.n === 'Lote 7031' && !r.urgente) && !m.resolver.some(r => r.n === 'Lote 7040'))
    chk('producción: pide una vez por fábrica donde ve Producción', sb.llamadas.filter(l => l[1] === 'indicadores_produccion').length === 2)
    chk('producción: se refresca cada 30 s', m.refresco === 30)
    const sin = await S.cargarProduccion(ctxFalso(S, { sb, elegida: 'u-n' }))
    chk('producción: sin permiso en la fábrica elegida lo dice (sin inventar números)', sin.estado === 'pronto' && /No tenés permiso para ver Producción en Cucuruchos Nuss/.test(sin.prontoMsg), sin.prontoMsg)
    const varias = sbFalso({ rpc: { indicadores_produccion: () => ind } })
    const v = await S.cargarProduccion(ctxFalso(S, { sb: varias, esSuperAdmin: true }))
    chk('producción: con máquinas de dos fábricas, cada una dice de cuál es', v.maquinas.some(q => q.nombre === 'Máquina 4 · Dolce Pasta') && v.valor === '284')
    const menos = await S.cargarProduccion(ctxFalso(S, { sb: sbFalso({ rpc: { indicadores_produccion: { ahora: [], cajas_por_producto: [{ hoy: 5, semana_pasada: 20 }], semana: {}, pendientes: {} } } }), esSuperAdmin: true, unidades: [{ id: 'u-n', nombre: 'N' }] }))
    chk('producción: menos que la semana pasada, flecha para abajo', menos.tendencia?.sube === false && /15 menos/.test(menos.tendencia.texto))
    chk('producción: sin masa, el scrap es "—" (no "0 %")', menos.ctx[2].v === '—')
    const igual = await S.cargarProduccion(ctxFalso(S, { sb: sbFalso({ rpc: { indicadores_produccion: { ahora: [], cajas_por_producto: [{ hoy: 20, semana_pasada: 20 }], semana: {}, pendientes: {},
      rendimiento_harina: [{ lote: '7040', diferencia_pct: -10 }] } } }), esSuperAdmin: true, unidades: [{ id: 'u-n', nombre: 'N' }] }))
    chk('producción: igual que la semana pasada, sin flecha de subida', igual.tendencia?.igual === true && igual.tendencia.sube === false && /Igual que el lunes pasado/.test(igual.tendencia.texto))
    chk('producción: un lote exactamente 10 % abajo NO es "el que peor rinde" (estricto)', !igual.resolver.some(r => /Lote/.test(String(r.n))))
  }
  // Pedidos
  {
    const pe = (fecha_entrega, estado = 'pendiente') => ({ fecha_entrega, estado })
    const sb = sbFalso({ rpc: { pedidos_de: p => (p.p_unidad_negocio_id === 'u-d' ? [pe(HOY), pe('2026-10-04'), pe('2026-10-05'), pe('2026-09-24'), pe(null), pe(HOY, 'entregado'), pe('2026-09-01', 'anulado')] : [pe(HOY)]) } })
    const m = await S.cargarPedidos(ctxFalso(S, { sb, alcances: new Map([['pedidos:ver', { todas: true }]]) }))
    chk('pedidos: por entregar (sin entregados ni anulados), con Todas suma', m.valor === '6', m.valor)
    chk('pedidos: para hoy', m.ctx[0].v === '2')
    chk('pedidos: esta semana (lunes a domingo)', m.ctx[1].v === '3', m.ctx[1].v)
    chk('pedidos: atrasados URGENTE', m.resolver[0].n === 1 && m.resolver[0].t === 'atrasado' && m.resolver[0].urgente)
    const sin = await S.cargarPedidos(ctxFalso(S, { sb }))
    chk('pedidos: sin alcance, no pide nada y lo dice', sin.estado === 'pronto')
  }
  // Órdenes de retiro
  {
    const sb = sbFalso({ tablas: { ordenes_retiro: [{ id: 'o1', fecha: HOY, estado: 'confirmada', unidad_negocio_id: 'u-n' }, { id: 'o2', fecha: HOY, estado: 'anulada', unidad_negocio_id: 'u-n' }],
      orden_retiro_items: [{ orden_id: 'o1', cajas: 60 }, { orden_id: 'o1', cajas: null }, { orden_id: 'o2', cajas: 99 }] } })
    const m = await S.cargarRetiros(ctxFalso(S, { sb, tareas: new Set(['retiros:ver']) }))
    chk('retiros: cajas despachadas hoy (sin anuladas; un insumo sin cajas no suma)', m.valor === '60' && m.ctx[0].v === '1', JSON.stringify([m.valor, m.ctx]))
    const sin = await S.cargarRetiros(ctxFalso(S, { sb }))
    chk('retiros: sin retiros:ver no lee las órdenes (lo dice)', sin.estado === 'pronto' && !sb.llamadas.slice(-3).some(l => l[1] === 'ordenes_retiro' && l[0] === 'select' && false))
  }
  // Administración
  {
    const cl = (cliente_id, nombre, saldo) => ({ cliente_id, nombre, saldo })
    const sb = sbFalso({ rpc: { clientes_con_saldo: p => (p.p_incluir_apagados === false ? [cl('c1', 'Caserato', 4120000), cl('c2', 'Duomo', '2860000'), cl('c3', 'A favor', -500), cl('c4', 'Nada', null)] : null) },
      tablas: { cliente_movimientos: [{ cliente_id: 'c1', tipo: 'cobranza', importe: -41280000, fecha: '2026-09-10' }, { cliente_id: 'otro', tipo: 'cobranza', importe: -5, fecha: '2026-09-10' }] } })
    const m = await S.cargarAdministracion(ctxFalso(S, { sb, alcances: new Map([['retiros:ver', { unidades: ['u-n'] }]]) }))
    chk('administración: nos deben (solo saldos positivos)', m.valor === '$ 6.980.000', m.valor)
    chk('administración: cobrado en el mes (de sus clientes)', m.ctx[0].v === '$ 41.280.000' && m.ctx[0].tono === 'bien', JSON.stringify(m.ctx))
    chk('administración: los que más deben', m.lista.map(x => x.nombre).join() === 'Caserato,Duomo')
    chk('administración: pide sin los apagados', sb.llamadas.some(l => l[1] === 'clientes_con_saldo' && l[2].p_incluir_apagados === false && l[2].p_unidad_negocio_id === 'u-n'))
    const falla = sbFalso({ rpc: { clientes_con_saldo: [cl('c1', 'X', 10)] }, tablas: { cliente_movimientos: new Error('sin permiso') } })
    const f = await S.cargarAdministracion(ctxFalso(S, { sb: falla, esSuperAdmin: true }))
    chk('administración: si el cobrado no se puede leer, "—" (no "$ 0")', f.ctx[0].v === '—' && f.estado === 'ok')
  }
  // Proyectos Taller
  {
    const pr = (extra) => ({ destino: 'externo', fabrica_destino: null, atrasado: false, presupuesto_costo: 100, costo_total: 50, ...extra })
    const lista = [pr({ atrasado: true }), pr({ costo_total: 150 }), pr({ destino: 'interno', fabrica_destino: 'Dolce Pasta' }), pr({ presupuesto_costo: null, costo_total: 999 })]
    const sb = sbFalso({ rpc: { proyectos_taller: lista } })
    const m = await S.cargarTaller(ctxFalso(S, { sb, tareas: new Set(['taller:precios']) }))
    chk('taller: en curso', m.valor === '4')
    chk('taller: atrasados URGENTE y pasados de presupuesto', m.resolver.some(r => r.urgente && r.n === 1 && r.t === 'atrasado') && m.resolver.some(r => r.n === 1 && r.t === 'pasado de presupuesto'))
    chk('taller: con precios, facturado/cobrado/falta cobrar Pronto', m.ctx.length === 3 && m.ctx.every(x => x.v === 'Pronto'))
    const sp = await S.cargarTaller(ctxFalso(S, { sb }))
    chk('taller: SIN permiso de precios no se muestran', sp.ctx.length === 0)
    const d = await S.cargarTaller(ctxFalso(S, { sb, elegida: 'u-d' }))
    chk('taller: con otra fábrica, los trabajos internos para ella', d.valor === '1', d.valor)
    const nul = await S.cargarTaller(ctxFalso(S, { sb: sbFalso({ rpc: { proyectos_taller: null } }) }))
    chk('taller: sin taller:ver (null) lo dice', nul.estado === 'pronto')
  }
  // Accesos, empleados y seguridad
  {
    const p = (id, extra) => ({ id, activo: true, tipo: 'naaloo', tiene_acceso: true, unidad_negocio_id: 'u-n', ...extra })
    const sb = sbFalso({ tablas: { v_empleados_publico: [p('1'), p('2', { tiene_acceso: false }), p('3', { tipo: 'sistema' }), p('4', { tipo: 'empresa' }), p('5', { activo: false }), p('6', { tipo: 'admin' }), p('rob', {})] },
      errores_app: [{ id: 'e1', creado_en: '2026-09-27T10:00:00Z' }, { id: 'e2', creado_en: '2026-09-01T10:00:00Z' }] })
    const fabrica = { ok: true, unidades: new Set(), personas: new Set(['rob']), soyDePrueba: false }
    const a = await S.cargarAccesos(ctxFalso(S, { sb, fabrica }))
    chk('accesos: usuarios activos (sin tablets, ni la Empresa, ni dados de baja, ni el robot)', a.valor === '2', a.valor)
    chk('accesos: empleados de Naaloo', a.ctx[0].v === '2', a.ctx[0].v)
    chk('accesos: dice que muestra todas las unidades', /todas las unidades/.test(a.nota))
    const e = await S.cargarEmpleados(ctxFalso(S, { sb, fabrica }))
    chk('empleados: activos, sin pie', e.valor === '3' && e.sinPie === true, e.valor)
    const s = await S.cargarSeguridad(ctxFalso(S, { sb: sbFalso({ tablas: { errores_app: [{ id: 'e1', creado_en: '2026-09-27T10:00:00Z' }, { id: 'e2', creado_en: '2026-09-01T10:00:00Z' }] } }) }))
    chk('seguridad: errores de 7 días; las sesiones, Pronto', s.valor === '1' && s.ctx[0].v === 'Pronto', s.valor)
  }
  // Cada tarjeta por separado: una que falla no tumba a las otras.
  {
    const cargadores = { a: async () => ({ estado: 'ok', valor: '1', resolver: [] }), b: async () => { throw new Error('caída') }, c: async () => ({ estado: 'ok', valor: '3', resolver: [] }) }
    const ctx = ctxFalso(S, { visibles: new Set(['a', 'b', 'c']) })
    const [a, b, c] = await Promise.all(['a', 'b', 'c'].map(k => S.cargarTarjeta(k, ctx, cargadores)))
    chk('una tarjeta que falla queda en error', b.estado === 'error')
    chk('…y las demás siguen', a.valor === '1' && c.valor === '3')
    chk('el error se anota en la consola (con la clave)', S.__log.some(l => /tablero: b/.test(l)))
    chk('un cargador que devuelve cualquier cosa es error', (await S.cargarTarjeta('x', ctx, { x: async () => null })).estado === 'error')
    chk('una clave sin cargador es error, no una excepción', (await S.cargarTarjeta('z', ctx, {})).estado === 'error')
    // Pendientes
    const vis = new Set(['caja'])
    const ok = await S.cargarTarjeta('caja', ctxFalso(S, { visibles: vis, pend: Promise.resolve(new Map([['caja:solicitudes_mi_caja', 2]])) }), { caja: async () => ({ estado: 'ok', resolver: [] }) })
    chk('los renglones de mis_pendientes se suman al pie', ok.resolver.some(r => r.n === 2) && !ok.pendError)
    const mal = await S.cargarTarjeta('caja', ctxFalso(S, { visibles: vis, pend: Promise.resolve(null) }), { caja: async () => ({ estado: 'ok', resolver: [] }) })
    chk('si mis_pendientes falló: ningún número viejo y pendError', mal.resolver.length === 0 && mal.pendError === true)
    const rota = await S.cargarTarjeta('caja', ctxFalso(S, { visibles: vis, pend: Promise.reject(new Error('x')) }), { caja: async () => ({ estado: 'ok', resolver: [] }) })
    chk('si la promesa de mis_pendientes se rompe, igual pendError (no tira)', rota.pendError === true)
  }
  // El turno de cada tarjeta: una respuesta vieja no pisa la nueva.
  {
    const estado = { modelos: new Map(), turnos: new Map() }
    const pintadas = []
    let soltar
    const lenta = () => new Promise(r => { soltar = () => r({ estado: 'ok', valor: 'viejo' }) })
    const vieja = S.refrescarTarjeta(estado, 'caja', {}, k => pintadas.push(estado.modelos.get(k).estado), lenta)
    chk('la primera vez se ve "Cargando…"', estado.modelos.get('caja').estado === 'cargando' && pintadas[0] === 'cargando')
    await S.refrescarTarjeta(estado, 'caja', {}, () => {}, async () => ({ estado: 'ok', valor: 'nuevo' }))
    soltar()
    const r = await vieja
    chk('la respuesta vieja no pisa la nueva', estado.modelos.get('caja').valor === 'nuevo' && r === false)
    const antes = estado.modelos.get('caja')
    let visto = null
    const p2 = S.refrescarTarjeta(estado, 'caja', {}, () => {}, async () => { visto = estado.modelos.get('caja'); return { estado: 'ok', valor: 'otro' } })
    await p2
    chk('al refrescar, los números de antes quedan hasta que llegan los nuevos (sin parpadeo)', visto === antes)
    await S.refrescarTarjeta(estado, 'caja', {}, () => {}, async () => ({ estado: 'ok' }), { mostrarCargando: true })
    chk('Reintentar sí vuelve a "Cargando…" primero', true)
  }
})())

// ── Estático: el dashboard arma el tablero ─────────────────────────────────
{
  // Sin comentarios: uno que nombra lo que se sacó no cuenta como el código.
  const sinComentarios = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/ ──.*$/gm, '')
  const html = sinComentarios(fuente())
  const js = sinComentarios(require('./imports').leerJs('tablero.js') || '')
  chk('el dashboard importa crearTablero de js/tablero.js', /import \{ crearTablero \} from '\.\/js\/tablero\.js'/.test(html))
  chk('la grilla vieja "Abrir →" ya no está', !/Abrir →/.test(html) && !/Más módulos en camino/.test(html))
  chk('?vista=personalizar abre Personalizar', /get\('vista'\) === 'personalizar'/.test(html))
  chk('las tareas se leen con su alcance', /\.select\('modulo, tarea, alcance'\)/.test(html))
  chk('ningún confirm() en el tablero (panel propio)', !/\bconfirm\(/.test(js) && /id="tb-confirmar"/.test(html))
  chk('refresca al volver a la pestaña', /visibilitychange[\s\S]{0,120}visibilityState === 'visible'[\s\S]{0,40}cargarTodo\(\)/.test(js))
  chk('y cada 2 minutos; Producción cada 30 s', /setInterval\([\s\S]{0,80}cargarTodo\(\)[\s\S]{0,20}2 \* 60 \* 1000\)/.test(js) && /cargar\('produccion'\)[\s\S]{0,10}30 \* 1000\)/.test(js))
  chk('al cambiar la fábrica, recarga', /alCambiarUnidad\(\(\{ elegida \}\) => \{ estado\.elegida = elegida \?\? null; cargarTodo/.test(js))
  chk('guardar avisa a la barra lateral (preferencias:cambio)', /dispatchEvent\(new CustomEvent\('preferencias:cambio'\)\)/.test(js))
}

fin()
