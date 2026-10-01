// Caja y las cobranzas (30/09/2026).
//
// asentar_cobranza mete el efectivo en la caja de efectivo de la Empresa de la
// fábrica del cliente y cada transferencia en su cuenta de banco, con
// caja_movimientos.cobranza_id y la descripción "Cobranza de <cliente> del
// dd/mm/aaaa" o "Cobranza de <cliente> · <referencia>". En Caja:
//   - ese movimiento se llama "Cobranza de <cliente>" (también en el Excel);
//   - dice que viene de una cobranza asentada, que no se edita ni se borra
//     desde Caja, y lleva a la cobranza en Administración;
//   - las consultas de la ficha y de "Todos los movimientos" traen cobranza_id;
//   - el "Ingreso externo" avisa que la plata de un cliente va por Cobranzas
//     (y los otros movimientos no lo dicen).
// Se EJECUTAN las funciones reales.
//
//   node pruebas/test-caja-cobranza.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const src = leer(ARCHIVO)
const { chk, fin } = arnes()

const FUNCIONES = ['esc', 'importeHtml', 'formatearImporte', 'clienteDeCobranza', 'etiquetaMovimiento', 'renderizarFilaMovimiento']
const CONSTANTES = ['TIPO_LABEL', 'MEDIO_PAGO_LABEL_CAJA']

const PRELUDIO = `
  ${fuenteNumeros()}
  function formatearFecha(f) { return String(f) }
  function otroMedioPago(m) { return m }
  function htmlUnidadDeFila() { return '' }
  function unidadDeMovimiento() { return null }
  var location = { href: 'caja.html' }
  var estado = { nombresEmpleados: {}, cuentasPorId: { 'cta-ef': { nombre: 'Efectivo Nuss' } } }
`

const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES, retorno: 'estado' })

const MAL = '"><b data-xss="c">'
const base = { id: 'm1', tipo: 'ingreso', monto: 10000, moneda: 'ARS', medio_pago: 'efectivo', cuenta_id: 'cta-ef', fecha: '2026-09-30', gasto_id: null, contraparte_empleado_id: null }

// ── La etiqueta ─────────────────────────────────────────────────────────────
chk('efectivo: "Cobranza de <cliente>"', S.etiquetaMovimiento({ ...base, cobranza_id: 'c1', descripcion: 'Cobranza de Distribuidora Anatolia del 29/09/2026' }) === 'Cobranza de Distribuidora Anatolia')
chk('transferencia con referencia: "Cobranza de <cliente>"', S.etiquetaMovimiento({ ...base, cobranza_id: 'c1', descripcion: 'Cobranza de J&M · 0001-23' }) === 'Cobranza de J&M')
chk('transferencia sin referencia: "Cobranza de <cliente>"', S.etiquetaMovimiento({ ...base, cobranza_id: 'c1', descripcion: 'Cobranza de Kiosco Pepe' }) === 'Cobranza de Kiosco Pepe')
chk('sin descripción reconocible: "Cobranza" a secas', S.etiquetaMovimiento({ ...base, cobranza_id: 'c1', descripcion: 'otra cosa' }) === 'Cobranza' &&
  S.etiquetaMovimiento({ ...base, cobranza_id: 'c1', descripcion: null }) === 'Cobranza')
chk('un ingreso que no es de una cobranza sigue siendo "Ingreso"', S.etiquetaMovimiento({ ...base, cobranza_id: null, descripcion: 'Cobranza de X del 01/01/2026' }) === 'Ingreso')

// ── La fila ─────────────────────────────────────────────────────────────────
const fila = S.renderizarFilaMovimiento({ ...base, cobranza_id: 'c-1', descripcion: 'Cobranza de ' + MAL + ' del 29/09/2026' })
chk('fila: el chip dice la cobranza, escapado', fila.includes('Cobranza de &quot;&gt;&lt;b data-xss=&quot;c&quot;&gt;') && !fila.includes(MAL))
chk('fila: dice que no se edita ni se borra desde Caja', /no se edita ni se borra desde Caja/.test(fila))
chk('fila: lleva a la cobranza en Administración', fila.includes('href="administracion.html?seccion=cobranzas&amp;cobranza=c-1"'))
const filaRara = S.renderizarFilaMovimiento({ ...base, cobranza_id: 'a"b', descripcion: 'x' })
chk('fila: el id va con encodeURIComponent (una comilla no rompe el atributo)', filaRara.includes('cobranza=a%22b"'))
const comun = S.renderizarFilaMovimiento({ ...base, cobranza_id: null, descripcion: 'algo' })
chk('fila: un movimiento común no dice nada de cobranzas', !/cobranza/i.test(comun))

// ── Las consultas y el aviso del ingreso externo ────────────────────────────
chk('la ficha y la de Empresa traen cobranza_id', (src.match(/contraparte_empleado_id, cobranza_id, unidad_negocio_id, empleado_id,\n/g) || []).length === 2)
chk('"Todos los movimientos" trae cobranza_id', /\.select\('id, tipo, monto, moneda, medio_pago, cuenta_id, descripcion, fecha, empleado_id, contraparte_empleado_id, gasto_id, cobranza_id, unidad_negocio_id'\)/.test(src))
// 01/10/2026: el texto pasó a ir en chico debajo del título, como lo pidió Facu.
chk('el aviso del ingreso externo existe, oculto, con el texto pedido',
  /<div id="aviso-ingreso-cliente" class="aviso-ingreso-cliente" hidden>La plata de un cliente se carga en <a href="cobranzas\.html">Cobranzas<\/a><\/div>/.test(src))
chk('el aviso va debajo del título del modal',
  /<h2 id="movimiento-titulo">[^<]*<\/h2>\s*<!--[\s\S]*?-->\s*<div id="aviso-ingreso-cliente"/.test(src))
chk('el aviso se muestra SOLO en el ingreso externo',
  /document\.getElementById\('aviso-ingreso-cliente'\)\.hidden = !\(tipo === 'ingreso' && subtipo === 'externo'\)/.test(src))
chk('Caja no tiene cómo editar ni borrar un movimiento (ninguna escritura a caja_movimientos)',
  !/from\('caja_movimientos'\)\s*\.(update|delete|insert|upsert)\(/.test(src))

fin()
