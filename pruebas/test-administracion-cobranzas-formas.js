// ADMINISTRACIÓN — Cobranzas por asentar con todas las formas de pago
// (30/09/2026).
//
// Una cobranza puede traer efectivo, cheques de papel, E-CHEQUES (sin papel ni
// foto, es_echeck) y TRANSFERENCIAS a una cuenta de banco de la Empresa
// (cobranza_transferencias). Lo que se afirma, EJECUTANDO las funciones reales:
//  - la tarjeta separa cheques de papel y e-cheques, suma la fila de
//    transferencias y el total es el de la base (_total_cobranza ya las suma);
//  - cada forma lleva su etiqueta (efectivo, cheque, e-cheque, transferencia
//    con su ícono) y un e-cheque no ofrece "Ver la foto";
//  - cada transferencia dice en qué cuenta entró, la fecha y la referencia,
//    todo escapado; si no se pudieron leer, se dice (nunca "no tiene");
//  - el panel de asentar dice a dónde va la plata (lo que hace
//    asentar_cobranza: efectivo a la caja de la Empresa de la fábrica del
//    cliente, cada transferencia a su cuenta, los cheques a la cartera);
//  - abierta desde un link, el total de v_cobranzas (que NO suma las
//    transferencias) se completa con ellas; un total ausente sigue "—";
//  - "Cargar una cobranza" y "Sumar e-cheques o transferencias" llevan a
//    Cobranzas, con el volver= a esta sección.
//
//   node pruebas/test-administracion-cobranzas-formas.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const tick = () => new Promise(r => setImmediate(r))
const esperar = async (n = 8) => { for (let i = 0; i < n; i++) await tick() }

function tabla(filas) {
  return (fl) => {
    let r = filas
    for (const f of fl) {
      if (f[0] === 'eq') r = r.filter(x => x[f[1]] === f[2])
      if (f[0] === 'in') r = r.filter(x => f[2].includes(x[f[1]]))
    }
    return { data: r, error: null }
  }
}

const MAL = '"><b data-xss="t">'
const MAL_ESC = '&quot;&gt;&lt;b data-xss=&quot;t&quot;&gt;'
const ID = 'd4444444-4444-4444-8444-444444444444'
const FILA = {
  cobranza_id: ID, fecha: '2026-09-29', cliente_escrito: 'Anatolia', cargada_por: 'Facundo',
  efectivo: 10000, cheques: 2, total: 10000 + 100000 + 50000 + 30000, moneda: 'ARS', observaciones: null, sugeridos: [
    { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', empresa: 'Cucuruchos Nuss' },
  ],
}
const CHEQUES = [
  { id: 'p1', cobranza_id: ID, foto_id: 'f1', es_echeck: false, banco_codigo: '007', numero: '66259862', tipo: 'comun', fecha_emision: '2026-09-20', fecha_pago: null, importe: 100000, estado: 'en_cartera' },
  { id: 'e1', cobranza_id: ID, foto_id: null, es_echeck: true, banco_codigo: '011', numero: '00000042', tipo: 'diferido', fecha_emision: '2026-09-20', fecha_pago: '2026-10-20', importe: 50000, estado: 'en_cartera' },
]
const TRANSF = [
  { id: 't1', cobranza_id: ID, cuenta_id: 'cta-macro', importe: 30000, fecha: '2026-09-29', referencia: MAL },
]
const CUENTAS = [{ id: 'cta-macro', nombre: MAL, unidad_negocio_id: 'u-n' }]

function nuevo({ transf = TRANSF, transfError = false, tareas = ['cobranzas:procesar', 'cobranzas:ver_todo'] } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = new Map(tareas.map(t => [t, null]))
  S.estado.empresas = [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }]
  S.__tablas.cobranza_cheques = tabla(CHEQUES)
  S.__tablas.cobranza_fotos = tabla([{ id: 'f1', cobranza_id: ID, storage_path: 'x/f1.jpg' }])
  S.__tablas.cobranza_transferencias = transfError ? (() => ({ data: null, error: { message: 'permiso' } })) : tabla(transf)
  S.__tablas.cuentas_caja = tabla(CUENTAS)
  S.__tablas.bancos_bcra = [{ codigo: '007', denominacion: 'Galicia' }, { codigo: '011', denominacion: 'Nación' }]
  S.__tablas.clientes = tabla([])
  S.__tablas.v_cobranzas = tabla([{ id: ID, cliente: 'Anatolia', fecha: '2026-09-29', efectivo: 10000, cantidad_cheques: 2, total: 160000, moneda: 'ARS', estado: 'registrada' }])
  S.__tablas.cobranzas = tabla([{ id: ID, cliente_id: null }])
  S.__setRpc(async (n) => {
    if (n === 'cobranzas_por_asentar') return { data: [FILA], error: null }
    return { data: null, error: null }
  })
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  // ══ La lista de cobranzas por asentar ══════════════════════════════════════
  {
    const S = nuevo()
    await S.mostrarCobranzas()
    await esperar()
    const h = html(S, 'ad-cobranzas-lista')
    chk('la tarjeta: fila de cheques de papel (sin los e-cheques)', /Cheques[\s\S]{0,120}?>1</.test(h), h.slice(0, 300))
    chk('la tarjeta: fila de e-cheques con su total', /E-cheques[\s\S]{0,160}?1 · \$\s50\.000,00/.test(h))
    chk('la tarjeta: fila de transferencias con su total', /Transferencias[\s\S]{0,160}?1 · \$\s30\.000,00/.test(h))
    chk('la tarjeta: el total es el de la base (ya suma las transferencias)', /Total[\s\S]{0,120}?\$\s190\.000,00/.test(h))
    chk('las cuatro etiquetas de forma de pago', /forma-pago--efectivo/.test(h) && /forma-pago--cheque/.test(h) && /forma-pago--echeck/.test(h) && /forma-pago--transferencia/.test(h))
    chk('la transferencia con su ícono', /forma-pago--transferencia"><svg/.test(h))
    const fila = (h.match(/<div class="formas-pago"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || ''
    chk('la fila de formas de arriba tiene las cuatro', ['efectivo', 'cheque', 'echeck', 'transferencia'].every(f => fila.includes('forma-pago--' + f)), fila)
    chk('un solo "Ver la foto" (el e-cheque no tiene papel)', (h.match(/data-cob-foto=/g) || []).length === 1)
    chk('la transferencia dice en qué cuenta entró, escapada', h.includes('entró en ' + MAL_ESC) && !h.includes(MAL))
    chk('la referencia escapada', h.includes('Ref. ' + MAL_ESC))
    chk('las transferencias se piden en UNA consulta', S.__llamadas.consultas.filter(c => c[0] === 'cobranza_transferencias').length === 1)
    chk('el select de cheques trae es_echeck', S.__llamadas.consultas.some(c => c[0] === 'cobranza_cheques' && /es_echeck/.test(c[1].find(f => f[0] === 'select')?.[1] ?? '')))
    chk('el link para sumarle e-cheques o transferencias en Cobranzas, con volver=', h.includes(`href="cobranzas.html?cobranza=${encodeURIComponent(ID)}&amp;volver=${encodeURIComponent('administracion.html?seccion=cobranzas')}"`))
    // Asentar: dice a dónde va la plata.
    await S.abrirAsentar(ID)
    S.elegirClienteAsentar('c1')
    const p = html(S, 'ad-cobranzas-lista')
    chk('asentar: dice que el efectivo va a la caja de la Empresa de la fábrica del cliente', /el efectivo entra en la caja de efectivo de la Empresa de la fábrica de ese cliente/.test(p))
    chk('asentar: dice que la transferencia se anota en su cuenta de banco', /la transferencia se anota en su cuenta de banco/.test(p))
    chk('asentar: dice que los cheques quedan en la cartera', /los cheques quedan en la cartera\./.test(p))
  }
  {
    const S = nuevo({ transfError: true })
    await S.mostrarCobranzas()
    await esperar()
    const h = html(S, 'ad-cobranzas-lista')
    chk('si las transferencias no se leyeron, se dice', /No se pudieron leer las transferencias de esta cobranza/.test(h))
    chk('y no aparece una fila de transferencias inventada', !/Transferencias<\/span>/.test(h.replace(/No se pudieron leer las transferencias/g, '')))
  }
  {
    const S = nuevo({ transf: [] })
    await S.mostrarCobranzas()
    await esperar()
    const h = html(S, 'ad-cobranzas-lista')
    chk('sin transferencias: no hay etiqueta de transferencia', !/forma-pago--transferencia/.test(h))
  }

  // ══ Funciones sueltas ═════════════════════════════════════════════════════
  {
    const S = nuevo()
    chk('dónde va la plata: solo efectivo', S.textoDondeVaLaPlata({ efectivo: 5, cheques: 0 }, [], []) === 'Al asentar, el efectivo entra en la caja de efectivo de la Empresa de la fábrica de ese cliente.')
    chk('dónde va la plata: nada que decir', S.textoDondeVaLaPlata({ efectivo: 0, cheques: 0 }, [], []) === '')
    chk('dónde va la plata: varias transferencias', /cada transferencia se anota/.test(S.textoDondeVaLaPlata({ efectivo: 0, cheques: 0 }, [], [{}, {}])))
    chk('sumaImportesCob: un ausente o un texto no suman', S.sumaImportesCob([{ importe: null }, { importe: 'x' }, { importe: 7 }]) === 7)
    chk('etiqueta desconocida: nada', S.htmlFormaPago('otra') === '')
    const ch = S.htmlChequeCob({ es_echeck: true, foto_id: 'f9', banco_codigo: '011', numero: '1', tipo: 'comun', importe: 1 })
    chk('un e-cheque con foto_id igual no ofrece la foto', !/data-cob-foto/.test(ch) && /forma-pago--echeck/.test(ch))
    const sin = S.htmlTransferenciaCob({ cuenta_id: 'x', importe: 5, fecha: null, referencia: '' }, new Map())
    chk('una cuenta sin nombre: "una cuenta de banco"', /entró en una cuenta de banco/.test(sin) && !/Ref\./.test(sin))
    chk('formas de una cobranza sin poder ver sus cheques: la cantidad alcanza', /forma-pago--cheque/.test(S.htmlFormasDeCobranza({ efectivo: 0, cheques: 2 }, [], [])))
  }

  // ══ Abierta desde un link: el total suma las transferencias ═══════════════
  {
    const S = nuevo()
    const r = await S.leerCobranza(ID)
    chk('abierta: el total de v_cobranzas + las transferencias', r?.fila?.total === 190000, r?.fila?.total)
    chk('abierta: trae las transferencias y sus cuentas', r?.transferencias?.length === 1 && r?.cuentasTransf?.get('cta-macro'))
  }
  {
    const S = nuevo()
    S.__tablas.v_cobranzas = tabla([{ id: ID, cliente: 'Anatolia', fecha: '2026-09-29', efectivo: 10000, cantidad_cheques: 2, total: null, moneda: 'ARS', estado: 'registrada' }])
    const r = await S.leerCobranza(ID)
    chk('abierta: un total ausente sigue ausente (nunca la suma de las transferencias sola)', r?.fila?.total === null)
  }

  // ══ El HTML estático ══════════════════════════════════════════════════════
  chk('"Cargar una cobranza" lleva a Cobranzas', /id="ad-cobranzas-cargar" href="cobranzas\.html"/.test(src))
}

pruebas().then(fin).catch(err => { console.log('EXCEPCIÓN:', err && err.stack || err); console.log('ROJO'); process.exit(1) })
