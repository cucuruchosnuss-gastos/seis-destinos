// Permisos en pantalla de Administración (11/10/2026, informe
// .claude/traspasos/2026-10-10-permisos.md), EJECUTANDO el código real:
//   M2  los clientes provisorios para quien la base deja gestionarlos
//       (_puede_gestionar_cliente: pedidos:configurar o retiros:precios con
//       alcance, o cuentas_corrientes:alta_proveedor) aunque no tenga
//       retiros:ver: la sección Clientes muestra SOLO los provisorios, sin
//       saldos, con Confirmar (confirmar_cliente) y Unir (unir_clientes).
//   B2  los lotes de una orden se piden con stock:ver / Producción EN LA
//       FÁBRICA DE LA ORDEN (la policy de stock_terminado_movimientos es por
//       fábrica); sin eso, dice que no se pueden ver.
//
//   node pruebas/test-permisos-pantallas-administracion.js
//   ARCHIVO_TEST=<copia de modulos/administracion.html> node pruebas/test-permisos-pantallas-administracion.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const copia = (x) => JSON.parse(JSON.stringify(x))

const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: null, cuit: null, localidad: 'Córdoba', apodos: [], activo: true, provisorio: false },
  { id: 'cp', nombre: 'KIOSCO <b>PEPITO</b>', razon_social: null, cuit: null, localidad: 'Villa María', apodos: [], activo: true, provisorio: true },
  { id: 'cx', nombre: 'Otro Viejo', razon_social: null, cuit: null, localidad: null, apodos: [], activo: false, provisorio: true },
]
const BUSCAR = [
  { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', activo: true, provisorio: false, apodos: [] },
  { cliente_id: 'cp', nombre: 'KIOSCO <b>PEPITO</b>', localidad: 'Villa María', activo: true, provisorio: true, apodos: [] },
]

function nuevo(tareas, { rpc = null } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = new Map(tareas)
  S.__tablas.clientes = () => ({ data: copia(CLIENTES), error: null })
  S.__setRpc(rpc ?? (async (n) => {
    if (n === 'clientes_con_saldo') return { data: [], error: null }
    if (n === 'buscar_clientes') return { data: copia(BUSCAR), error: null }
    return { data: null, error: null }
  }))
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(([n]) => n === nombre)
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

const MAURICIO = [['pedidos:ver', { unidades: ['u-n'] }], ['pedidos:cargar', { unidades: ['u-n'] }], ['pedidos:configurar', { unidades: ['u-n'] }]]
const ALTA_PROV = [['cuentas_corrientes:alta_proveedor', null]]
const YANINA = [['cuentas_corrientes:alta_proveedor', null], ['cobranzas:procesar', null]]

async function pruebas() {
  // ── M2: quién ve la sección ───────────────────────────────────────────
  {
    const S = nuevo(MAURICIO)
    chk('M2: con pedidos:configurar (sin retiros:ver) se ve la sección Clientes', S.seccionesVisibles().some(s => s.id === 'clientes'))
    chk('M2: y la empresa entra en Administración', S.empresasDeAdministracion().some(e => e.id === 'u-n'))
  }
  chk('M2: con cuentas_corrientes:alta_proveedor también', nuevo(ALTA_PROV).seccionesVisibles().some(s => s.id === 'clientes'))
  chk('M2: con solo pedidos:cargar, no', !nuevo([['pedidos:cargar', { unidades: ['u-n'] }]]).seccionesVisibles().some(s => s.id === 'clientes'))
  chk('M2: pedidos:configurar en OTRA fábrica no cuenta (es por fábrica)', !nuevo([['pedidos:configurar', { unidades: ['u-d'] }]]).seccionesVisibles('u-n').some(s => s.id === 'clientes'))

  // ── M2: la lista de solo provisorios (lee la tabla clientes) ──────────
  {
    const S = nuevo(MAURICIO)
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('M2: abre la lista (no lo manda a la portada)', S.estado.vista === 'ad-vista-clientes' || S.__els.get('ad-vista-clientes')?.hidden === false, String(S.estado.vista))
    chk('M2: muestra el provisorio prendido', /KIOSCO &lt;b&gt;PEPITO&lt;\/b&gt;/.test(h), h.slice(0, 300))
    chk('M2: el nombre va escapado', !/<b>PEPITO<\/b>/.test(h))
    chk('M2: no muestra los que no son provisorios ni los apagados', !/Distribuidora Anatolia/.test(h) && !/Otro Viejo/.test(h))
    chk('M2: dice que ve solo los provisorios (y por qué no los saldos)', h.includes(S.TEXTO_SOLO_PROVISORIOS))
    chk('M2: no pide clientes_con_saldo como si fuera la lista (no puede leer saldos)', !/\$ 0/.test(h))
    chk('M2: sin retiros:precios, "Confirmar" directo (la ficha pide precios)', /data-provisorio-confirmar="cp"/.test(h) && !/data-provisorio-completar/.test(h))
    chk('M2: y "Unir con un cliente existente"', /data-provisorio-unir="cp"/.test(h))
  }
  // ── M2: confirmar llama a confirmar_cliente ───────────────────────────
  {
    const S = nuevo(MAURICIO)
    await S.mostrarClientes()
    await S.confirmarProvisorio('cp')
    chk('M2: Confirmar llama a confirmar_cliente con el cliente', rpcs(S, 'confirmar_cliente').length === 1 && rpcs(S, 'confirmar_cliente')[0][1].p_cliente_id === 'cp')
  }
  {
    const S = nuevo(MAURICIO, { rpc: async (n) => n === 'confirmar_cliente' ? { data: null, error: { message: 'No tenés permiso sobre ese cliente.' } } : { data: null, error: null } })
    await S.mostrarClientes()
    await S.confirmarProvisorio('cp')
    chk('M2: el error de la base va TAL CUAL, pegado a la fila', /No tenés permiso sobre ese cliente\./.test(html(S, 'ad-clientes-lista')))
  }
  // ── M2: unir para quien gestiona sin precios ──────────────────────────
  {
    const S = nuevo(MAURICIO)
    await S.mostrarClientes()
    S.abrirUnir('cp')
    chk('M2: Unir se abre con pedidos:configurar', !!S.estado.unir && S.estado.unir.origenId === 'cp')
  }
  // ── M2: sin leer la tabla, buscar_clientes (cobranzas:procesar) ───────
  {
    const S = nuevo(YANINA)
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('M2: Yanina (alta_proveedor + cobranzas:procesar) lee los provisorios con buscar_clientes', rpcs(S, 'buscar_clientes').some(([, p]) => p.p_unidad_negocio_id === 'u-n'))
    chk('M2: y los ve', /KIOSCO &lt;b&gt;PEPITO&lt;\/b&gt;/.test(h) && /data-provisorio-confirmar="cp"/.test(h))
    // alta_proveedor sin pedidos:configurar ni retiros:precios: la base le deja unir.
    chk('M2: con alta_proveedor también "Unir"', /data-provisorio-unir="cp"/.test(h))
    S.abrirUnir('cp')
    chk('M2: y Unir se abre', S.estado.unir?.origenId === 'cp')
  }
  // ── M2: sin poder leer nada, lo dice ──────────────────────────────────
  {
    const S = nuevo(ALTA_PROV)
    await S.mostrarClientes()
    const h = html(S, 'ad-clientes-lista')
    chk('M2: con solo alta_proveedor, dice que no puede leer los clientes', h.includes(S.TEXTO_SIN_LEER_CLIENTES))
    chk('M2: y no inventa "no hay provisorios"', !/No hay clientes provisorios/.test(h))
  }
  // ── M2: la tarjeta Clientes de la portada ─────────────────────────────
  {
    const S = nuevo(MAURICIO)
    S.estado.portada = {}
    const p = S.estado.portada
    const r = await S.leerSoloProvisorios('u-n')
    p.soloProvisorios = r
    const c = S.contenidoSeccion({ id: 'clientes' }, p)
    chk('M2: la tarjeta cuenta los provisorios (1), no "activos"', c.numero === 1 && /provisorio/.test(c.unidad), JSON.stringify(c))
  }

  // ── B2: los lotes, por fábrica ────────────────────────────────────────
  {
    const S = nuevo([['retiros:ver', { unidades: ['u-n'] }], ['stock:ver', { unidades: ['u-d'] }]])
    chk('B2: stock:ver en OTRA fábrica no deja ver los lotes de esta', S.puedeVerLotes('u-n') === false)
    chk('B2: en su fábrica sí', S.puedeVerLotes('u-d') === true)
    const S2 = nuevo([['produccion:ver', { unidades: ['u-n'] }]])
    chk('B2: Producción en la fábrica de la orden, sí', S2.puedeVerLotes('u-n') === true && S2.puedeVerLotes('u-d') === false)
    const S3 = nuevo([['stock:ver', null]])
    chk('B2: un alcance null no da ninguna fábrica (como la base)', S3.puedeVerLotes('u-n') === false)
    S3.estado.miRolApp = 'super_admin'
    chk('B2: un super_admin, todas', S3.puedeVerLotes('u-n') === true)
  }
  {
    const S = nuevo([['retiros:ver', { unidades: ['u-n'] }], ['stock:ver', { unidades: ['u-d'] }]])
    S.__tablas.ordenes_retiro = [{ id: 'o1', unidad_negocio_id: 'u-n', estado: 'confirmada' }]
    S.__tablas.orden_retiro_items = []
    S.__tablas.stock_terminado_movimientos = []
    // La empresa elegida arriba es otra: lo que cuenta es la fábrica de la ORDEN.
    S.estado.empresaId = 'u-d'
    const d = await S.leerOrden('o1')
    chk('B2: con stock:ver en otra fábrica, no se consultan los lotes', !S.__llamadas.consultas.some(c => c[0] === 'stock_terminado_movimientos'))
    chk('B2: y quedan como "no se pueden ver" (null), no como lista vacía', d.lotes === null)
  }
}

esperas.push(pruebas().then(esperar))
fin()
