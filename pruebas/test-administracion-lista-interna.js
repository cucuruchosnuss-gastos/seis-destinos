// ADMINISTRACIÓN — la LISTA INTERNA de una fábrica (30/09/2026).
//
// listas_precios.es_interna marca UNA lista por fábrica (índice único
// ux_lista_interna_por_unidad). El traspaso entre fábricas (Stock) propone su
// precio con precio_venta() de la interna del origen.
// HUECO DE BASE: ninguna RPC la guarda (guardar_lista_precios no recibe
// es_interna; verificado con pg_get_functiondef el 30/09/2026). La pantalla
// MUESTRA el estado con un tilde trabado desde JS y lo dice.
//
//   node pruebas/test-administracion-lista-interna.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)

const LISTAS = [
  { id: 'l1', nombre: 'Distribuidores', moneda: 'ARS', activa: true, es_interna: false },
  { id: 'li', nombre: 'Entre fábricas', moneda: 'ARS', activa: true, es_interna: true },
]

function preparar(S) {
  S.estado.clientes = []
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [], insumos: [] }
  S.estado.catalogoEmpresa = 'u-n'
  S.__tablas.listas_precios = LISTAS
  S.__tablas.lista_precios_items = []
}

// ── El HTML ────────────────────────────────────────────────────────────────
chk('html: existe el tilde "Lista interna"', /<input type="checkbox" id="ad-lista-interna">/.test(src) && />Lista interna</.test(src))
chk('html: el tilde NO viene trabado como atributo (lo traba el JS)', !/id="ad-lista-interna"[^>]*disabled/.test(src))
chk('html: la nota existe', /id="ad-lista-interna-nota"/.test(src))
chk('la lectura de las listas trae es_interna (el doble ignora el select: se afirma sobre su texto)',
  /from\('listas_precios'\)\.select\('[^']*\bes_interna\b[^']*'\)/.test(src))
chk('ninguna RPC manda es_interna (la base no lo recibe)', !/p_es_interna/.test(src))
chk('PUEDE_MARCAR_INTERNA está en false mientras no haya RPC', /const PUEDE_MARCAR_INTERNA = false\b/.test(src))

// ── La fila de la lista ────────────────────────────────────────────────────
{
  const S = nuevo()
  const h1 = S.htmlFilaLista(LISTAS[1])
  const h0 = S.htmlFilaLista(LISTAS[0])
  chk('la lista interna lleva el sello "Interna"', /ad-sello--interna">Interna</.test(h1))
  chk('una lista que no es interna, no', !/Interna</.test(h0))
  chk('es_interna con un valor raro no cuenta', !/Interna</.test(S.htmlFilaLista({ ...LISTAS[0], es_interna: 'true' })))
}

// ── El tilde en la lista abierta ───────────────────────────────────────────
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('li').then(() => {
    const c = S.__els.get('ad-lista-interna')
    chk('la interna: el tilde está marcado', c.checked === true)
    chk('el tilde queda trabado (no hay cómo guardarlo)', c.disabled === true)
    const n = S.__els.get('ad-lista-interna-nota').textContent
    chk('la nota dice que es la interna de la fábrica y para qué sirve', /Es la lista interna de Cucuruchos Nuss: el traspaso a otra fábrica propone sus precios\./.test(n), n)
    chk('y que todavía no se puede cambiar desde acá', /Todavía no se puede cambiar desde acá: la base no tiene cómo guardarlo\./.test(n), n)
  }))
}
{
  const S = nuevo()
  preparar(S)
  esperas.push(S.abrirLista('l1').then(() => {
    const c = S.__els.get('ad-lista-interna')
    chk('otra lista: el tilde está sin marcar', c.checked === false)
    chk('otra lista: también trabado', c.disabled === true)
    chk('otra lista: la nota dice que no es la interna', /^No es la lista interna de Cucuruchos Nuss\./.test(S.__els.get('ad-lista-interna-nota').textContent))
    chk('tocar el tilde no manda nada a la base', !S.__llamadas.rpc.some(x => x[0] === 'guardar_lista_precios'))
  }))
}

// ── Escapado ───────────────────────────────────────────────────────────────
{
  const S = nuevo()
  S.estado.empresas = [{ id: 'u-n', nombre: marca('empresa') }]
  const n = S.textoListaInterna({ es_interna: true })
  chk('la nota es texto (va por textContent): trae el nombre de la empresa tal cual', n.includes(marca('empresa')))
  chk('la nota se pone con textContent, nunca innerHTML', /getElementById\('ad-lista-interna-nota'\)\.textContent = textoListaInterna\(meta\)/.test(src))
  chequearMarcas(chk, 'fila de la lista interna', S.htmlFilaLista({ id: 'x', nombre: marca('lista'), moneda: 'ARS', activa: true, es_interna: true }), ['lista'])
}

fin()
