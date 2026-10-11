// Permisos en pantalla (11/10/2026, informe .claude/traspasos/2026-10-10-permisos.md):
// lo que toca js/modulos.js, js/tablero.js y js/barra-lateral.js, EJECUTADO
// con el sandbox del tablero.
//   M3  la tarjeta y el ítem "Administración" con cobranzas:procesar / ver_todo
//       aunque no tenga el módulo retiros (Yanina asienta cobranzas).
//   M2  también con lo que la base acepta para gestionar clientes
//       (pedidos:configurar, retiros:precios, cuentas_corrientes:alta_proveedor).
//   M8  la tarjeta Stock con stock:ver_costos, y para quien solo tiene eso
//       abre derecho en Costos.
//   M4  Cuentas corrientes sin cuentas_corrientes:ver_todo: "Sin permiso", nunca "no le debemos".
//   B9  Ingreso sin tareas de materia_prima: "Sin permiso", nunca "Hoy no hubo ingresos".
//   M7  "N por controlar" lleva a Administración solo con cobranzas:procesar.
//
//   node pruebas/test-permisos-pantallas-tablero.js
//   ARCHIVO_JS_TABLERO / ARCHIVO_MODULOS / ARCHIVO_JS_BARRA_LATERAL  otra copia
'use strict'

const { arnes } = require('./circuito-comun')
const { construir, sbFalso, ctxFalso } = require('./sandbox-tablero')

const { chk, esperas, fin } = arnes()
const S = construir()
const usuario = (misModulos, tareas = []) => ({ esAdmin: false, esSuperAdmin: false, misModulos, misTareas: new Set(tareas) })
const SUPER = { esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }
const admin = S.MODULOS.find(m => m.clave === 'administracion')
const stock = S.MODULOS.find(m => m.clave === 'stock')

// ── M3: Administración para quien asienta cobranzas ───────────────────────
const yanina = usuario(['gastos', 'caja', 'empleados', 'cuentas-corrientes', 'materia-prima', 'cobranzas'],
  ['cobranzas:cargar', 'cobranzas:procesar', 'cobranzas:ver_todo', 'cobranzas:editar_anular', 'cuentas_corrientes:ver_todo', 'stock:ver_costos', 'stock:cargar_costos'])
chk('M3: Yanina (cobranzas:procesar, sin el módulo retiros) ve la tarjeta Administración', S.moduloVisible(admin, yanina) === true)
chk('M3: y está en sus tarjetas del tablero', S.tarjetasPosibles(yanina).some(t => t.clave === 'administracion'))
chk('M3: y en su barra lateral', S.modulosDeBarra(yanina).some(m => m.clave === 'administracion'))
chk('M3: con solo cobranzas:ver_todo también', S.moduloVisible(admin, usuario(['cobranzas'], ['cobranzas:ver_todo'])) === true)
chk('M3: un chofer (solo cobranzas:cargar) NO la ve', S.moduloVisible(admin, usuario(['cobranzas'], ['cobranzas:cargar'])) === false)
chk('M3: el depósito (retiros:cargar) sigue sin verla', S.moduloVisible(admin, usuario(['retiros'], ['retiros:cargar'])) === false)
chk('M3: retiros:ver sin el módulo retiros sigue sin verla (como antes)', S.moduloVisible(admin, usuario(['pedidos'], ['retiros:ver'])) === false)
chk('M3: con el módulo retiros y retiros:ver, como siempre', S.moduloVisible(admin, usuario(['retiros'], ['retiros:ver'])) === true)

// ── M2: Administración para quien gestiona clientes ───────────────────────
chk('M2: Mauricio (pedidos:configurar) ve Administración para los provisorios', S.moduloVisible(admin, usuario(['pedidos'], ['pedidos:ver', 'pedidos:cargar', 'pedidos:configurar'])) === true)
chk('M2: con cuentas_corrientes:alta_proveedor también', S.moduloVisible(admin, usuario(['cuentas-corrientes'], ['cuentas_corrientes:alta_proveedor'])) === true)
chk('M2: con retiros:precios sin el módulo también', S.moduloVisible(admin, usuario([], ['retiros:precios'])) === true)
chk('M2: con pedidos:cargar solo, no', S.moduloVisible(admin, usuario(['pedidos'], ['pedidos:cargar'])) === false)
// La burbuja de provisorios cae en la tarjeta Administración, que ahora ve.
chk('M2: "clientes provisorios por completar" va a la tarjeta Administración', S.RESOLVER_PENDIENTES['administracion:clientes_provisorios']?.tarjetas.includes('administracion'))

// ── M8: Stock con solo ver_costos ─────────────────────────────────────────
chk('M8: Yanina (stock:ver_costos, sin el módulo stock) ve la tarjeta Stock', S.moduloVisible(stock, yanina) === true)
{
  const t = S.tarjetasPosibles(yanina).find(x => x.clave === 'stock')
  chk('M8: y la tarjeta abre derecho en Costos', t?.url === 'modulos/stock.html?vista=costos', t?.url)
  const b = S.modulosDeBarra(yanina).find(x => x.clave === 'stock')
  chk('M8: el ítem de la barra también abre Costos', b?.url === 'modulos/stock.html?vista=costos', b?.url)
}
{
  const conVer = usuario(['stock'], ['stock:ver', 'stock:ver_costos'])
  chk('M8: con stock:ver la tarjeta abre la pantalla de siempre', S.tarjetasPosibles(conVer).find(x => x.clave === 'stock')?.url === 'modulos/stock.html')
  chk('M8: un super_admin, la de siempre', S.tarjetasPosibles(SUPER).find(x => x.clave === 'stock')?.url === 'modulos/stock.html')
  chk('M8: sin ver_costos ni el módulo, no la ve', S.moduloVisible(stock, usuario(['gastos'], ['stock:cargar_costos'])) === false)
  chk('M8: el catálogo MODULOS no cambia su url (la barra marca la actual por archivo)', stock.url === 'modulos/stock.html')
}

;(async () => {
  // ── M4: Cuentas corrientes ──────────────────────────────────────────────
  {
    const sb = sbFalso({ tablas: { v_saldo_proveedor: [] } })
    const m = await S.cargarCuentasCorrientes(ctxFalso(S, { sb, tareas: new Set(['cuentas_corrientes:registrar_pago']) }))
    chk('M4: sin ver_todo, la tarjeta NO dice "No le debemos a ningún proveedor"', m.estado === 'pronto' && !/No le debemos/.test(JSON.stringify(m)), JSON.stringify(m))
    chk('M4: dice "Sin permiso para ver esto"', /Sin permiso para ver esto/.test(m.prontoMsg ?? ''), m.prontoMsg)
    chk('M4: y no consulta la vista', !sb.llamadas.some(l => l[1] === 'v_saldo_proveedor'))
    chk('M4: sigue mostrando lo pendiente de mis_pendientes', m.pendientes === true)
    const sb2 = sbFalso({ tablas: { v_saldo_proveedor: [] } })
    const ok = await S.cargarCuentasCorrientes(ctxFalso(S, { sb: sb2, tareas: new Set(['cuentas_corrientes:ver_todo']) }))
    chk('M4: con ver_todo y sin deuda, "No le debemos a ningún proveedor" de verdad', ok.estado === 'vacio' && /No le debemos/.test(ok.vacioMsg))
    const sup = await S.cargarCuentasCorrientes(ctxFalso(S, { sb: sb2, esSuperAdmin: true }))
    chk('M4: un super_admin consulta', sup.estado === 'vacio')
  }
  // ── B9: Ingreso ─────────────────────────────────────────────────────────
  {
    const sb = sbFalso({ tablas: { materia_prima_ingresos: [] } })
    const m = await S.cargarIngreso(ctxFalso(S, { sb }))
    chk('B9: sin tareas de materia_prima, NO dice "Hoy no hubo ingresos"', m.estado === 'pronto' && !/no hubo ingresos/i.test(JSON.stringify(m)), JSON.stringify(m))
    chk('B9: dice "Sin permiso para ver esto"', /Sin permiso para ver esto/.test(m.prontoMsg ?? ''))
    chk('B9: y no consulta la tabla', !sb.llamadas.some(l => l[1] === 'materia_prima_ingresos'))
    for (const t of ['materia_prima:cargar', 'materia_prima:ver_todo', 'materia_prima:editar_anular']) {
      const c = await S.cargarIngreso(ctxFalso(S, { sb, tareas: new Set([t]) }))
      chk(`B9: con ${t} consulta y dice "Hoy no hubo ingresos"`, c.estado === 'vacio' && /no hubo ingresos/i.test(c.vacioMsg))
    }
  }
  // ── M7: el link de "por controlar" ──────────────────────────────────────
  {
    const sb = () => sbFalso({ rpc: { resumen_cobranzas: [{ por_controlar: 3, total: 1000, cantidad: 3 }] }, tablas: { v_cobranzas: [] } })
    const chofer = await S.cargarCobranzas(ctxFalso(S, { sb: sb(), tareas: new Set(['cobranzas:cargar']) }))
    const r1 = chofer.resolver.find(r => r.origen === 'cobranzas:por_controlar')
    chk('M7: un chofer ve sus por controlar', !!r1)
    chk('M7: y el link lo lleva a Cobranzas, no a Administración', r1?.url === 'modulos/cobranzas.html', r1?.url)
    const asienta = await S.cargarCobranzas(ctxFalso(S, { sb: sb(), tareas: new Set(['cobranzas:procesar']) }))
    chk('M7: con cobranzas:procesar va a Administración → Cobranzas', asienta.resolver.find(r => r.origen === 'cobranzas:por_controlar')?.url === 'modulos/administracion.html?seccion=cobranzas')
    const sup = await S.cargarCobranzas(ctxFalso(S, { sb: sb(), esSuperAdmin: true }))
    chk('M7: un super_admin también', sup.resolver.find(r => r.origen === 'cobranzas:por_controlar')?.url === 'modulos/administracion.html?seccion=cobranzas')
  }
})().then(() => fin(), e => { chk('sin excepción', false, e.stack); fin() })
void esperas
