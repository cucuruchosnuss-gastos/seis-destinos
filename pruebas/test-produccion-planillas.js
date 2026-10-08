// Planillas (pedido de Facu del 08/10/2026): en la gestión de Producción, la
// lista de planillas (lo que era "Historial") se llama "Planillas" y ARRANCA
// en las CERRADAS; las abiertas están a un toque, en un segmentado
// Cerradas / Abiertas / Pendientes de completar / Todas que reemplaza al
// <select> de estado.
//
// Se EJECUTA el código real (sandbox-produccion.js) con un Supabase falso:
// qué estado viaja a la consulta, qué botón queda marcado y cómo se entra
// desde el menú, desde "Planillas pendientes" y desde los indicadores.
//
//   node pruebas/test-produccion-planillas.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const TURNOS = [
  { id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', estado: 'cerrado' },
  { id: 't2', lote: 7024, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Tarde', encargado_id: 'e-x', estado: 'abierto' },
]

// Un botón del segmentado, como lo ve el navegador.
function boton(valor) {
  const atributos = {}
  return {
    dataset: { historialEstado: valor }, atributos,
    setAttribute(k, v) { atributos[k] = String(v) },
    getAttribute(k) { return atributos[k] ?? null },
  }
}

function armar() {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn'] }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  Object.assign(S.__tablas, { maquinas: [{ id: 'm1', nombre: 'Máquina 1' }], turnos_produccion: TURNOS, v_empleados_publico: [] })
  const botones = ['cerrado', 'abierto', 'pendiente_completar', ''].map(boton)
  S.__doc.querySelectorAll = sel => (sel === '[data-historial-estado]' ? botones : [])
  S.botones = botones
  S.marcados = () => botones.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.historialEstado)
  S.estadoConsultado = () => {
    const q = S.__llamadas.consultas.filter(([t]) => t === 'turnos_produccion').pop()?.[1] ?? []
    const e = q.find(x => x[0] === 'eq' && x[1] === 'estado')
    return e ? e[2] : null
  }
  return S
}

;(async () => {
  // ── La pantalla dice "Planillas" ─────────────────────────────────────
  chk('el renglón del menú se llama "Planillas"', /id="pr-menu-historial" hidden><span class="pg-menu__txt">Planillas<\/span>/.test(FUENTE))
  chk('el título de la pantalla es "Planillas"', /<h1 class="pr-titulo">Planillas<\/h1>/.test(FUENTE) && !/Historial de producción/.test(FUENTE))
  chk('volver del detalle dice "‹ Planillas"', /id="pr-historial-detalle-volver">‹ Planillas</.test(FUENTE))
  chk('ya no hay <select> de estado', !/<select id="pr-historial-estado"/.test(FUENTE))
  const seg = FUENTE.match(/<div class="pg-seg pr-historial-estados" id="pr-historial-estados"[\s\S]*?<\/div>/)?.[0] ?? ''
  const ops = [...seg.matchAll(/data-historial-estado="([^"]*)" aria-pressed="(true|false)">([^<]+)</g)].map(m => [m[1], m[2], m[3]])
  chk('el segmentado tiene Cerradas, Abiertas, Pendientes de completar y Todas, en ese orden',
    JSON.stringify(ops.map(o => [o[0], o[2]])) === JSON.stringify([['cerrado', 'Cerradas'], ['abierto', 'Abiertas'], ['pendiente_completar', 'Pendientes de completar'], ['', 'Todas']]), JSON.stringify(ops))
  chk('en el HTML viene marcada Cerradas (y solo esa)', ops.filter(o => o[1] === 'true').map(o => o[0]).join() === 'cerrado')
  chk('el segmentado es un grupo con nombre', /role="group" aria-label="Qué planillas mostrar"/.test(seg))
  chk('los botones del segmentado miden 44 px de alto', /\.pr-historial-estados \.pg-seg__op \{ min-height: 44px; \}/.test(FUENTE))

  // ── Arranca en CERRADAS ──────────────────────────────────────────────
  const S = armar()
  await S.mostrarHistorial()
  chk('la primera vez arranca en Cerradas', S.estado.historial.estado === 'cerrado')
  chk('… y la consulta pide solo las cerradas', S.estadoConsultado() === 'cerrado', JSON.stringify(S.__llamadas.consultas))
  chk('… y el segmentado marca Cerradas', JSON.stringify(S.marcados()) === '["cerrado"]', JSON.stringify(S.marcados()))

  // A un toque: las abiertas. Se simula el toque con el mismo código del listener.
  S.estado.historial.estado = 'abierto'
  S.pintarEstadosHistorial()
  chk('tocar Abiertas marca Abiertas y nada más', JSON.stringify(S.marcados()) === '["abierto"]')
  S.__llamadas.consultas.length = 0
  await S.cargarHistorial()
  chk('… y la consulta pide las abiertas', S.estadoConsultado() === 'abierto')
  S.estado.historial.estado = ''
  S.pintarEstadosHistorial()
  S.__llamadas.consultas.length = 0
  await S.cargarHistorial()
  chk('Todas: marcada y la consulta no filtra por estado', JSON.stringify(S.marcados()) === '[""]' && S.estadoConsultado() === null)

  // Volver a entrar desde el menú vuelve a Cerradas, aunque se haya mirado otra cosa.
  S.estado.historial.estado = 'abierto'
  S.estado.historial.maquina = 'm1'
  S.__llamadas.consultas.length = 0
  await S.mostrarHistorial()
  chk('entrar de nuevo desde el menú vuelve a Cerradas', S.estado.historial.estado === 'cerrado' && S.estadoConsultado() === 'cerrado' && JSON.stringify(S.marcados()) === '["cerrado"]')
  chk('… sin perder la máquina elegida', S.estado.historial.maquina === 'm1')

  // "Planillas pendientes" e indicadores mandan su propio estado.
  const P = armar()
  await P.mostrarHistorial({ estado: 'pendiente_completar', desde: P.sumarDias(P.hoyArgentina(), -365), desdePendientes: true })
  chk('desde "Planillas pendientes" abre en Pendientes de completar', P.estado.historial.estado === 'pendiente_completar' && P.estadoConsultado() === 'pendiente_completar')
  chk('… marcada en el segmentado', JSON.stringify(P.marcados()) === '["pendiente_completar"]')
  chk('… y el menú sigue marcando "Planillas pendientes"', P.estado.historial.desdePendientes === true)
  const A = armar()
  await A.mostrarHistorial({ estado: 'abierto', desde: A.sumarDias(A.hoyArgentina(), -365) })
  chk('desde los indicadores (abiertos) abre en Abiertas', A.estado.historial.estado === 'abierto' && JSON.stringify(A.marcados()) === '["abierto"]')

  // El listener del segmentado: cambia el estado, deja de ser "pendientes" y recarga.
  const ls = FUENTE.match(/getElementById\('pr-historial-estados'\)\.addEventListener\('click', ev => \{[\s\S]*?\n      \}\)/)?.[0] ?? ''
  chk('el segmentado tiene su listener de toque', ls.length > 0)
  chk('… pone el estado del botón tocado', /estado\.historial\.estado = b\.dataset\.historialEstado/.test(ls))
  chk('… deja de marcar "Planillas pendientes" en el menú', /estado\.historial\.desdePendientes = false/.test(ls) && /pintarMenuActivo\(\)/.test(ls))
  chk('… repinta el segmentado y recarga', /pintarEstadosHistorial\(\)/.test(ls) && /cargarHistorial\(\)/.test(ls))
  chk('… ignora un toque fuera de un botón', /if \(!b\) return/.test(ls))

  fin()
})()
