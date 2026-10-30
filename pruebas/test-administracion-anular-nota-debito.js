// ADMINISTRACIÓN — QUIÉN PUEDE ANULAR UNA NOTA DE DÉBITO (24/10/2026, rama
// ci-prueba/ajustes-24-10).
//
// La regla es la de anular_nota_debito (pg_get_functiondef, 24/10/2026):
//   - EMITIDA (al cliente): tiene_tarea_alcance('retiros','precios',
//     notas_debito.unidad_negocio_id) o tiene_tarea('cobranzas','procesar');
//   - RECIBIDA (del proveedor): tiene_tarea('cuentas_corrientes','registrar_pago').
// Antes la pantalla ofrecía Anular con retiros:precios de CUALQUIER fábrica.
// Exige:
//  - la fábrica sale de la NOTA (notas_debito.unidad_negocio_id, leída por id;
//    datos_nota_debito no la trae), nunca de la barra de arriba;
//  - retiros:precios en otra fábrica no alcanza; en esa fábrica o en todas, sí;
//  - cobranzas:procesar alcanza siempre (también si la fábrica no se pudo leer);
//  - sin la fábrica (no se pudo leer), retiros:precios solo no alcanza;
//  - la recibida: solo cuentas_corrientes:registrar_pago;
//  - una anulada no se anula; pedirAnular sin permiso no abre el panel.
// Y nada de lo que había se perdió (ids y data-* de administracion.html en
// el commit FIJO d2d1dc1).
//
//   node pruebas/test-administracion-anular-nota-debito.js
'use strict'
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  var CSS = { escape: (s) => String(s) }
  function CustomEvent(tipo, init) { this.type = tipo; this.detail = init ? init.detail : undefined }
  document.dispatchEvent = () => true
`

const EMITIDA = {
  id: 'nd-1', direccion: 'emitida', codigo: 'N-ND-0001', comprobante: null, fecha: '2026-10-20', estado: 'vigente', anulada_motivo: null,
  items: [{ concepto: 'Gastos de cheque rechazado', importe: 1500 }], total: 1500, moneda: 'ARS', observaciones: null, archivo_url: null,
  empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'NUSS SRL', cuit: '30700000001', domicilio: 'Ruta 9', telefono: null, logo_url: null },
  cliente: { id: 'cli-1', nombre: 'Molino', razon_social: 'MOLINO SA', cuit: '30712345678', domicilio: null, localidad: null, condicion_iva: null, email: null },
  proveedor: null, cheque: null, cargada_por: 'Yanina', cargada_en: '2026-10-20T15:00:00Z',
}
const RECIBIDA = { ...EMITIDA, id: 'nd-2', direccion: 'recibida', codigo: null, comprobante: '0001-4567', cliente: null, proveedor: { id: 'p1', razon_social: 'ANATOLIA SRL', cuit: '30711111112', direccion: null } }

// tareas: { 'modulo:tarea': alcance }. notas: [{ id, unidad_negocio_id }] o
// { error } para que la lectura de la fábrica falle.
function nuevo({ tareas = {}, rol = 'usuario', notas = [{ id: 'nd-1', unidad_negocio_id: 'u-n' }, { id: 'nd-2', unidad_negocio_id: 'u-n' }], datos = EMITIDA, empresaId = 'u-n' } = {}) {
  const S = construirAdministracion(ARCHIVO, { preludioExtra: PRELUDIO })
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(Object.entries(tareas))
  S.estado.empresaId = empresaId
  S.__tablas.notas_debito = (filtros) => {
    if (notas && notas.error) return { data: null, error: notas.error }
    const eqs = filtros.filter(f => f[0] === 'eq')
    return { data: (notas ?? []).filter(r => eqs.every(([, a, b]) => r[a] === b)), error: null }
  }
  S.__setRpc(async (n, p) => n === 'datos_nota_debito' ? { data: { ...datos, id: p.p_id }, error: null } : { data: null, error: null })
  return S
}
const ofrece = (S) => S.__els.get('ad-nd-anular').hidden === false

esperas.push((async () => {
  // ── Emitida: la fábrica de la nota ──────────────────────────────────────
  {
    const S = nuevo({ tareas: { 'retiros:precios': { unidades: ['u-d'] }, 'retiros:ver': { todas: true } } })
    await S.abrirNotaDebito('nd-1')
    const q = S.__llamadas.consultas.filter(c => c[0] === 'notas_debito')
    chk('lee la fábrica de la nota en notas_debito por su id', q.length === 1 && q[0][1].some(f => f[0] === 'eq' && f[1] === 'id' && f[2] === 'nd-1') &&
      q[0][1].some(f => f[0] === 'select' && /\bunidad_negocio_id\b/.test(f[1])), JSON.stringify(q))
    chk('… y la guarda con la nota abierta', S.estado.notaDebito.unidadId === 'u-n')
    chk('retiros:precios en OTRA fábrica (Dolce) no alcanza para una nota de Nuss', !ofrece(S))
    S.pedirAnularNotaDebito()
    chk('… y pedir anular no abre el panel', S.estado.notaDebito.anulando === false && S.__els.get('ad-nd-anular-panel').hidden === true)
  }
  {
    const S = nuevo({ tareas: { 'retiros:precios': { unidades: ['u-d'] } }, notas: [{ id: 'nd-1', unidad_negocio_id: 'u-d' }] })
    await S.abrirNotaDebito('nd-1')
    chk('retiros:precios en Dolce y la nota es de Dolce: se ofrece Anular', ofrece(S))
    S.pedirAnularNotaDebito()
    chk('… y se abre el panel del motivo', S.__els.get('ad-nd-anular-panel').hidden === false)
  }
  {
    const S = nuevo({ tareas: { 'retiros:precios': { unidades: ['u-n'] } }, notas: [{ id: 'nd-1', unidad_negocio_id: 'u-d' }], empresaId: 'u-n' })
    await S.abrirNotaDebito('nd-1')
    chk('la barra en Nuss no cuenta: la nota es de Dolce y no se ofrece', !ofrece(S))
  }
  {
    const S = nuevo({ tareas: { 'retiros:precios': { todas: true } }, notas: [{ id: 'nd-1', unidad_negocio_id: 'u-d' }] })
    await S.abrirNotaDebito('nd-1')
    chk('retiros:precios en todas las fábricas: se ofrece', ofrece(S))
  }
  {
    const S = nuevo({ tareas: { 'retiros:precios': null } })
    await S.abrirNotaDebito('nd-1')
    chk('retiros:precios con alcance null: no se ofrece (como tiene_tarea_alcance)', !ofrece(S))
  }
  {
    const S = nuevo({ tareas: { 'cobranzas:procesar': null }, notas: [{ id: 'nd-1', unidad_negocio_id: 'u-d' }] })
    await S.abrirNotaDebito('nd-1')
    chk('cobranzas:procesar alcanza en cualquier fábrica', ofrece(S))
  }
  {
    const S = nuevo({ rol: 'super_admin' })
    await S.abrirNotaDebito('nd-1')
    chk('super_admin: se ofrece', ofrece(S))
  }
  // Sin poder leer la fábrica.
  {
    const S = nuevo({ tareas: { 'retiros:precios': { unidades: ['u-n'] } }, notas: { error: { message: 'permission denied for table notas_debito' } } })
    await S.abrirNotaDebito('nd-1')
    chk('sin la fábrica de la nota: la hoja se ve igual', S.__els.get('ad-nd-hoja').innerHTML.includes('N-ND-0001') && S.estado.notaDebito.unidadId === null)
    chk('… y retiros:precios solo NO alcanza (no se sabe si es de su fábrica)', !ofrece(S))
  }
  {
    const S = nuevo({ tareas: { 'cobranzas:procesar': null }, notas: { error: { message: 'x' } } })
    await S.abrirNotaDebito('nd-1')
    chk('sin la fábrica de la nota, cobranzas:procesar igual alcanza', ofrece(S))
  }
  {
    const S = nuevo({ tareas: { 'retiros:precios': { todas: true } }, notas: [] })
    await S.abrirNotaDebito('nd-1')
    chk('una nota que notas_debito no devuelve: sin fábrica, no se ofrece con retiros:precios', !ofrece(S) && S.estado.notaDebito.unidadId === null)
  }

  // ── Recibida: solo registrar_pago ───────────────────────────────────────
  {
    const S = nuevo({ tareas: { 'cuentas_corrientes:registrar_pago': null }, datos: RECIBIDA })
    await S.abrirNotaDebito('nd-2')
    chk('recibida con cuentas_corrientes:registrar_pago: se ofrece', ofrece(S))
  }
  {
    const S = nuevo({ tareas: { 'retiros:precios': { todas: true }, 'cobranzas:procesar': null }, datos: RECIBIDA })
    await S.abrirNotaDebito('nd-2')
    chk('recibida con retiros:precios y cobranzas:procesar pero sin registrar_pago: no se ofrece', !ofrece(S))
  }

  // ── Anulada ─────────────────────────────────────────────────────────────
  {
    const S = nuevo({ tareas: { 'cobranzas:procesar': null }, datos: { ...EMITIDA, estado: 'anulada' } })
    await S.abrirNotaDebito('nd-1')
    chk('una anulada no ofrece Anular', !ofrece(S))
  }

  // ── La función sola (la llama también pintarNotaDebito sin nota abierta) ─
  {
    const S = nuevo({ tareas: { 'retiros:precios': { unidades: ['u-n'] } } })
    chk('puedeAnularNotaDebito sin nota abierta ni fábrica: no', S.puedeAnularNotaDebito(EMITIDA) === false)
    chk('puedeAnularNotaDebito con la fábrica de la nota pasada: sí', S.puedeAnularNotaDebito(EMITIDA, 'u-n') === true)
    chk('puedeAnularNotaDebito con otra fábrica: no', S.puedeAnularNotaDebito(EMITIDA, 'u-d') === false)
    chk('puedeAnularNotaDebito(null): no', S.puedeAnularNotaDebito(null, 'u-n') === false)
  }

  // ── Una respuesta vieja no pisa la fábrica de la nota nueva ─────────────
  {
    const S = nuevo({ tareas: { 'retiros:precios': { unidades: ['u-n'] } }, notas: [{ id: 'nd-1', unidad_negocio_id: 'u-n' }, { id: 'nd-3', unidad_negocio_id: 'u-d' }] })
    const a = S.abrirNotaDebito('nd-1')
    const b = S.abrirNotaDebito('nd-3')
    await Promise.all([a, b])
    chk('abrir dos seguidas: queda la fábrica de la última (Dolce) y no se ofrece', S.estado.notaDebito.id === 'nd-3' && S.estado.notaDebito.unidadId === 'u-d' && !ofrece(S))
  }
})())

// ── Nada de lo que había se perdió (baseline FIJO d2d1dc1, nunca HEAD) ────
{
  const BASE_COMMIT = 'd2d1dc1'
  let antes = null
  if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
  else {
    try {
      antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { antes = null }
  }
  chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
  if (antes) {
    const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
    const ahora = marcas(src)
    // Lo que se fue A PROPÓSITO después del baseline, con su razón.
    const RETIRADOS = new Map([
      // 30/10/2026 (Entre empresas v2): el filtro por par, el saldo de arriba
      // y sin la cuenta "≈" con una lista.
      ...['id="ad-entre-origen"', 'id="ad-entre-destino"', 'id="ad-entre-valorizar"', 'id="ad-entre-resumen"', 'data-entre-par', 'data-entre-lista']
        .map(m => [m, 'Entre empresas v2 (30/10/2026)']),
      // 28/10/2026: "Dividir para facturar" ya no es una ventana; los puntos
      // N1 / N2 van en la misma pantalla de la orden (#ad-orden-facturar).
      ...['id="ad-btn-dividir"', 'id="ad-dv"', 'id="ad-dv-titulo"', 'id="ad-dv-cerrar"', 'id="ad-dv-pct-a"', 'id="ad-dv-pct-b"', 'id="ad-dv-vendedores"',
        'id="ad-dv-aviso"', 'id="ad-dv-vista"', 'id="ad-dv-error"', 'id="ad-dv-guardar"', 'id="ad-dv-cancelar"', 'id="ad-dv-facturas"', 'data-rotulo',
        'data-parte', 'data-dv-parte', 'data-dv-guardada', 'data-dv-ver-pdf', 'data-dv-factura-error', 'data-dv-factura'].map(m => [m, 'la ventana de la división (28/10/2026)']),
      // 28/10/2026: la comisión común salió del flujo.
      ['id="ad-filtro-comision"', 'la comisión común (28/10/2026)'], ['id="ad-btn-comision"', 'la comisión común (28/10/2026)'],
      // 28/10/2026 (región Cheques): se fue el botón "Cargar el gasto del
      // banco"; el gasto lo crea acreditar_cheques al acreditar.
      ['data-gastos-banco', 'el botón "Cargar el gasto del banco" de la cartera (28/10/2026)'],
    ])
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m) && !RETIRADOS.has(m))
    chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
    chk(`en ${BASE_COMMIT} Anular miraba retiros:precios de cualquier fábrica (lo que este cambio arregla)`, /estado\.misTareas\.has\('retiros:precios'\)/.test(antes))
  }
}

fin()
