// ADMINISTRACIÓN → LISTAS DE PRECIOS: "Clientes de esta lista" (30/09/2026).
//
// Pedido de Facu: en cada lista, asignar los clientes desde la lista misma.
//  - los clientes ACTIVOS de esa fábrica, un tilde cada uno;
//  - tildar asigna la lista (guardar_ficha_cliente con lista_precio_id) y
//    destildar la saca ("" = sin lista); se manda SOLO esa clave;
//  - arriba, cuántos clientes tiene la lista, y un aviso con los clientes de
//    la fábrica que no tienen NINGUNA lista (no se van a poder valorizar solos);
//  - el error de la base va tal cual, pegado al cliente, y el tilde vuelve;
//  - un doble toque manda una sola vez;
//  - todo nombre va escapado.
// Se EJECUTAN las funciones reales del módulo.
//
//   node pruebas/test-administracion-lista-clientes.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))

const CLIENTES = [
  { id: 'c1', nombre: 'Anatolia', razon_social: 'ANATOLIA SRL', lista_precio_id: 'l1', activo: true },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, lista_precio_id: null, activo: true },
  { id: 'c3', nombre: 'Heladería Sur', razon_social: null, lista_precio_id: 'l2', activo: true },
  { id: 'c4', nombre: 'Kiosco Cerrado', razon_social: null, lista_precio_id: null, activo: false },
  { id: 'c5', nombre: 'Bar del Centro', razon_social: null, lista_precio_id: null, activo: true },
]
const LISTAS = [{ id: 'l1', nombre: 'Mayoristas', moneda: 'ARS', activa: true }, { id: 'l2', nombre: 'Minoristas', moneda: 'ARS', activa: true }]

function nuevo({ rpc = null, clientes = CLIENTES } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.clientes = copia(clientes)
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [], insumos: [] }
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.listas = { unidad: 'u-n', filas: copia(LISTAS) }
  S.__tablas.listas_precios = copia(LISTAS)
  S.__tablas.lista_precios_items = []
  S.__setRpc(rpc ?? (async () => ({ data: null, error: null })))
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const texto = (S, id) => S.__els.get(id)?.textContent ?? ''
const fichas = (S) => S.__llamadas.rpc.filter(r => r[0] === 'guardar_ficha_cliente')
const renglon = (h, id) => {
  const i = h.indexOf(`data-lista-cliente="${id}"`)
  if (i < 0) return ''
  const ini = h.lastIndexOf('<label', i)
  return h.slice(ini, h.indexOf('</label>', i) + 8)
}

async function pruebas() {
  // ── Lo que se ve al abrir una lista ────────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirLista('l1')
    const h = html(S, 'ad-lista-clientes')
    const r = html(S, 'ad-lista-clientes-resumen')
    chk('arriba dice cuántos clientes tiene la lista', /1 cliente tiene esta lista\./.test(r), r)
    chk('el aviso nombra a los activos SIN ninguna lista', /2 clientes de Cucuruchos Nuss no tienen ninguna lista/.test(r) && /Kiosco Pepe/.test(r) && /Bar del Centro/.test(r), r)
    chk('y dice por qué importa (no se valorizan solos)', /no se van a poder valorizar solos/.test(r))
    chk('el aviso no nombra a un apagado ni a uno con otra lista', !/Kiosco Cerrado/.test(r) && !/Heladería Sur/.test(r) && !/Anatolia/.test(r))
    chk('un tilde por cliente ACTIVO de la fábrica', ['c1', 'c2', 'c3', 'c5'].every(id => h.includes(`data-lista-cliente="${id}"`)) && !h.includes('data-lista-cliente="c4"'))
    chk('el de la lista viene tildado', /type="checkbox" checked/.test(renglon(h, 'c1')), renglon(h, 'c1'))
    chk('los demás no', !/checked/.test(renglon(h, 'c2')) && !/checked/.test(renglon(h, 'c3')))
    chk('uno con OTRA lista lo dice (tildarlo lo pasa a esta)', /Hoy en la lista Minoristas: tildarlo lo pasa a esta/.test(renglon(h, 'c3')), renglon(h, 'c3'))
    chk('uno sin lista dice "Sin lista"', /Sin lista/.test(renglon(h, 'c2')))
    chk('en orden alfabético', ['Anatolia', 'Bar del Centro', 'Heladería Sur', 'Kiosco Pepe'].map(n => h.indexOf(n)).every((x, i, a) => x >= 0 && (i === 0 || x > a[i - 1])))
    chk('el resumen va ANTES que la grilla de precios (arriba)', src.indexOf('id="ad-lista-clientes-resumen"') < src.indexOf('id="ad-lista-grilla"') && src.indexOf('id="ad-lista-clientes-resumen"') > 0)
  }
  {
    // Sin ningún cliente sin lista: no hay aviso.
    const S = nuevo({ clientes: CLIENTES.map(c => ({ ...c, lista_precio_id: c.lista_precio_id ?? 'l2' })) })
    await S.abrirLista('l1')
    chk('sin clientes sin lista, no hay aviso', !/no tienen ninguna lista/.test(html(S, 'ad-lista-clientes-resumen')))
  }
  {
    // Ninguno de la lista, y uno solo sin lista (singular).
    const S = nuevo({ clientes: [{ id: 'x', nombre: 'Único', lista_precio_id: null, activo: true }] })
    await S.abrirLista('l1')
    const r = html(S, 'ad-lista-clientes-resumen')
    chk('ninguno: "Ningún cliente tiene esta lista."', /Ningún cliente tiene esta lista\./.test(r), r)
    chk('uno sin lista, en singular', /1 cliente de Cucuruchos Nuss no tiene ninguna lista/.test(r), r)
  }
  {
    // Si los clientes no se pudieron leer, se dice (nunca "0 clientes").
    const S = nuevo()
    S.estado.clientes = null
    S.__tablas.clientes = () => ({ data: null, error: { message: 'x' } })
    await S.abrirLista('l1')
    const r = html(S, 'ad-lista-clientes-resumen')
    chk('sin clientes leídos, se dice y no se inventa un cero', !/Ningún cliente/.test(r) && /No se pudieron leer los clientes de esta fábrica/.test(r), r)
    chk('y no se ofrece ningún tilde', !/data-lista-cliente/.test(html(S, 'ad-lista-clientes')))
  }

  // ── Tildar asigna la lista ─────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirLista('l1')
    await S.cambiarListaCliente('c2', true)
    await esperar()
    const f = fichas(S)
    chk('tildar llama a guardar_ficha_cliente con ESE cliente y SOLO lista_precio_id = la lista', f.length === 1 &&
      JSON.stringify(f[0][1]) === JSON.stringify({ p_cliente_id: 'c2', p_datos: { lista_precio_id: 'l1' } }), JSON.stringify(f))
    chk('el cliente queda con la lista (sin volver a leer)', S.clienteDe('c2').lista_precio_id === 'l1')
    chk('la cuenta sube a 2', /2 clientes tienen esta lista\./.test(html(S, 'ad-lista-clientes-resumen')))
    chk('y sale del aviso de sin lista', !/Kiosco Pepe/.test(html(S, 'ad-lista-clientes-resumen')))
    chk('queda tildado', /checked/.test(renglon(html(S, 'ad-lista-clientes'), 'c2')))
    chk('se avisa en palabras', S.__llamadas.exitos.some(m => /Kiosco Pepe ahora usa la lista Mayoristas/.test(m)), JSON.stringify(S.__llamadas.exitos))
    // Tildar a uno con otra lista lo pasa a esta.
    await S.cambiarListaCliente('c3', true)
    await esperar()
    chk('uno con otra lista pasa a esta', fichas(S)[1][1].p_datos.lista_precio_id === 'l1' && S.clienteDe('c3').lista_precio_id === 'l1')
  }

  // ── Destildar la saca ──────────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.abrirLista('l1')
    await S.cambiarListaCliente('c1', false)
    await esperar()
    const f = fichas(S)
    chk('destildar manda lista_precio_id = "" (sin lista)', f.length === 1 &&
      JSON.stringify(f[0][1]) === JSON.stringify({ p_cliente_id: 'c1', p_datos: { lista_precio_id: '' } }), JSON.stringify(f))
    chk('el cliente queda sin lista', S.clienteDe('c1').lista_precio_id === null)
    chk('la lista queda sin clientes', /Ningún cliente tiene esta lista\./.test(html(S, 'ad-lista-clientes-resumen')))
    chk('y aparece en el aviso de sin lista', /3 clientes de Cucuruchos Nuss no tienen ninguna lista/.test(html(S, 'ad-lista-clientes-resumen')) && /Anatolia/.test(html(S, 'ad-lista-clientes-resumen')))
    chk('se avisa en palabras', S.__llamadas.exitos.some(m => /Anatolia ya no tiene lista de precios/.test(m)))
    // Destildar a uno que tiene OTRA lista no le saca la suya.
    const antes = fichas(S).length
    await S.cambiarListaCliente('c3', false)
    chk('destildar a uno de otra lista no hace nada', fichas(S).length === antes && S.clienteDe('c3').lista_precio_id === 'l2')
    // Tildar a uno que ya la tiene tampoco.
    S.clienteDe('c2').lista_precio_id = 'l1'
    await S.cambiarListaCliente('c2', true)
    chk('tildar a uno que ya la tiene no manda nada', fichas(S).length === antes)
  }

  // ── El error de la base, tal cual, pegado; el tilde vuelve ─────────────────
  {
    const S = nuevo({ rpc: async (n) => n === 'guardar_ficha_cliente' ? { data: null, error: { message: 'La lista de precios no es de esta unidad.' } } : { data: null, error: null } })
    await S.abrirLista('l1')
    await S.cambiarListaCliente('c1', false)
    await esperar()
    const r = renglon(html(S, 'ad-lista-clientes'), 'c1')
    chk('el error de la base va tal cual, pegado al cliente', /La lista de precios no es de esta unidad\./.test(html(S, 'ad-lista-clientes')) &&
      html(S, 'ad-lista-clientes').indexOf('La lista de precios no es de esta unidad.') > html(S, 'ad-lista-clientes').indexOf('data-lista-cliente="c1"'))
    chk('el tilde vuelve a como estaba (sigue tildado)', /checked/.test(r) && S.clienteDe('c1').lista_precio_id === 'l1', r)
    chk('la cuenta no cambia', /1 cliente tiene esta lista\./.test(html(S, 'ad-lista-clientes-resumen')))
  }

  // ── Un doble toque manda una sola vez ──────────────────────────────────────
  {
    // Cada llamada queda esperando hasta que se la suelte (se guardan TODAS:
    // si el guard fallara, la segunda no puede colgar la suite).
    const pendientes = []
    const S = nuevo({ rpc: (n) => n === 'guardar_ficha_cliente' ? new Promise(r => pendientes.push(() => r({ data: null, error: null }))) : Promise.resolve({ data: null, error: null }) })
    await S.abrirLista('l1')
    const p1 = S.cambiarListaCliente('c2', true)
    await esperar()
    chk('mientras guarda, el tilde de ese cliente queda trabado', /disabled/.test(renglon(html(S, 'ad-lista-clientes'), 'c2')))
    const p2 = S.cambiarListaCliente('c5', true)
    await esperar()
    chk('un segundo toque mientras guarda no manda nada', fichas(S).length === 1, JSON.stringify(fichas(S)))
    for (const soltar of pendientes) soltar()
    await Promise.all([p1, p2])
    await esperar()
    chk('al terminar se destraba', !/disabled/.test(renglon(html(S, 'ad-lista-clientes'), 'c2')))
  }

  // ── El clic: el tilde llama con su estado ──────────────────────────────────
  chk('el cambio de un tilde llama a cambiarListaCliente con su id y si quedó tildado',
    /closest\('\[data-lista-cliente\]'\)\n\s+if \(t\) cambiarListaCliente\(t\.dataset\.listaCliente, t\.checked\)/.test(src))

  // ── XSS ────────────────────────────────────────────────────────────────────
  {
    const S = nuevo({ clientes: [
      { id: marca('id1'), nombre: marca('nombre1'), lista_precio_id: 'l1', activo: true },
      { id: 'b', nombre: marca('sinlista'), lista_precio_id: null, activo: true },
      { id: 'c', nombre: 'Otra', lista_precio_id: 'l9', activo: true },
    ] })
    S.estado.listas.filas.push({ id: 'l9', nombre: marca('otralista'), moneda: 'ARS', activa: true })
    S.estado.empresas = S.estado.empresas.map(e => e.id === 'u-n' ? { ...e, nombre: marca('empresa') } : e)
    await S.abrirLista('l1')
    chequearMarcas(chk, 'los tildes', html(S, 'ad-lista-clientes'), ['id1', 'nombre1', 'otralista'])
    chequearMarcas(chk, 'el resumen', html(S, 'ad-lista-clientes-resumen'), ['sinlista', 'empresa'])
    S.estado.lista.errores.set('b', marca('error'))
    S.pintarClientesLista()
    chequearMarcas(chk, 'el error pegado', html(S, 'ad-lista-clientes'), ['error'])
  }
}

pruebas().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
