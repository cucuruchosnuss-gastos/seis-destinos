// Mutaciones de test-administracion-orden-entre-empresas.js (la orden a otra
// empresa del grupo en Administración, 24/10/2026): mutan
// modulos/administracion.html, que la suite recibe por ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = d2d1dc1, el main del que salió
// la rama ci-prueba/orden-entre-empresas). Nunca HEAD.
//
//   node pruebas/mut-administracion-orden-entre-empresas.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-orden-entre-empresas.js')
const BASE = 'd2d1dc1'

{
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-orden-entre-empresas.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

const r = correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlDeudaEntre', 'htmlSelloEntre', 'htmlFichaEntre', 'htmlOrdenEntre'],
  salir: false,
  manuales: [
    // Qué orden es entre empresas y de quién es la deuda
    { nombre: 'leerClientes sin unidad_grupo_id', de: "comision_habitual, apodos, provisorio, unidad_grupo_id')", a: "comision_habitual, apodos, provisorio')" },
    { nombre: 'un unidad_grupo_id vacío cuenta', de: "      const id = c?.unidad_grupo_id\n      return typeof id === 'string' && id ? id : null", a: "      const id = c?.unidad_grupo_id\n      return id ?? null" },
    { nombre: 'nunca es entre empresas', de: '      return !!o && !!empresaGrupoDe(clienteDe(o.cliente_id))', a: '      return false' },
    { nombre: 'la deuda al revés', de: '      return `Queda como deuda de ${recibe} con ${entrega}`', a: '      return `Queda como deuda de ${entrega} con ${recibe}`' },
    { nombre: 'una empresa que no se conoce queda vacía', de: "|| 'la empresa que recibe'", a: "|| ''" },
    { nombre: '"no va a la cuenta corriente" se va', de: "' (Entre empresas): no va a la cuenta corriente.'", a: "' (Entre empresas).'" },
    { nombre: '"Al valorizar, Queda" en mayúscula', de: 'antes + t.charAt(0).toLowerCase() + t.slice(1)', a: 'antes + t' },
    // La lista de órdenes y de clientes
    { nombre: 'la fila de la orden sin el sello', de: '${htmlSelloOrden(o)}${htmlSelloEntre(o)}${selloComision}', a: '${htmlSelloOrden(o)}${selloComision}' },
    { nombre: 'el sello sin el título', de: "title=\"${esc(recibe ? 'Otra empresa del grupo: ' + recibe : 'Otra empresa del grupo')}\"", a: '' },
    { nombre: '"Comisión sin cargar" también entre empresas', de: ' && comisionHabitualDe(cli) !== null && !empresaGrupoDe(cli)', a: ' && comisionHabitualDe(cli) !== null' },
    { nombre: 'la lista de clientes sin "Empresa del grupo"', de: "        `${empresaGrupoDe(fichaCliente(c.cliente_id)) ? '<span class=\"ad-sello ad-sello--entre\" data-sello-entre>Empresa del grupo</span>' : ''}` +\n", a: '' },
    // El detalle
    { nombre: 'el detalle sin el dato "Entre empresas"', de: "        datos.push(htmlDatoAd('Orden interna', `Es ${recibe}, otra empresa del grupo: lo que salió entró a su stock.`))\n", a: '' },
    { nombre: 'el detalle sin el sello', de: '${htmlSelloOrden(o)}${htmlSelloEntre(o)}</div><div class="ad-datos">', a: '${htmlSelloOrden(o)}</div><div class="ad-datos">' },
    { nombre: 'el detalle con la comisión', de: '${htmlDeudaEntre(o)}` : htmlComisionOrden(d)', a: '` : htmlComisionOrden(d)' },
    { nombre: 'el detalle trata la orden como común', de: '          : entre ? `<p class="ad-total">', a: '          : false ? `<p class="ad-total">' },
    { nombre: 'con "Facturas de ARCA"', de: "(d.valorizar || entre ? '' : htmlFacturasOrden(d))", a: "(d.valorizar ? '' : htmlFacturasOrden(d))" },
    { nombre: 'se puede dividir', de: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) && puedeEn('retiros', 'precios', o.unidad_negocio_id)", a: "o.estado_valorizacion === 'valorizada' && puedeEn('retiros', 'precios', o.unidad_negocio_id)" },
    { nombre: 'se puede cargar la comisión', de: "o.estado_valorizacion === 'valorizada' && !ordenEntreEmpresas(o) &&\n", a: "o.estado_valorizacion === 'valorizada' &&\n" },
    // Valorizar
    { nombre: 'la valorización sin el aviso de la deuda', de: "      if (ordenEntreEmpresas(d.orden)) partes.push(htmlDeudaEntre(d.orden, 'Al valorizar, '))\n", a: '' },
    { nombre: 'entre empresas con límite de crédito', de: 'limite: empresaGrupoDe(cli) ? null : (cli?.limite_credito ?? null)', a: 'limite: cli?.limite_credito ?? null' },
    { nombre: 'el éxito sin la deuda', de: " + (entre ? ' ' + textoDeudaEntre(d.orden) + '.' : '')", a: '' },
    { nombre: 'el aviso del límite también entre empresas', de: 'const aviso = !entre && data?.supera_limite', a: 'const aviso = data?.supera_limite' },
    // La ficha
    { nombre: 'la ficha sin el aviso', de: "document.getElementById('ad-ficha-aviso').innerHTML = htmlFichaEntre(c)", a: "document.getElementById('ad-ficha-aviso').innerHTML = ''" },
    { nombre: 'la ficha no lee unidad_grupo_id', de: 'unidad_negocio_id, codigo_anterior, unidad_grupo_id\')', a: 'unidad_negocio_id, codigo_anterior\')' },
    { nombre: 'la ficha con otro texto', de: "'Es la empresa ' + nombre + ' del grupo.", a: "'Del grupo: ' + nombre + '." },
    // Entre empresas: la orden de cada deuda
    { nombre: 'el código de cualquier tipo', de: "      if (f?.tipo !== 'otro') return null\n      const m = RE_CODIGO_ORDEN_ENTRE", a: '      const m = RE_CODIGO_ORDEN_ENTRE' },
    { nombre: '"orden" sin el límite de palabra', de: '/\\borden(?: de retiro)? ([A-Z]{1,3}-(?:I-)?\\d{3,})\\b/i', a: '/orden(?: de retiro)? ([A-Z]{1,3}-(?:I-)?\\d{3,})\\b/i' },
    // La orden interna (27/10/2026)
    { nombre: 'el código de una interna no se reconoce', de: '([A-Z]{1,3}-(?:I-)?\\d{3,})\\b/i', a: '([A-Z]{1,3}-\\d{3,})\\b/i' },
    { nombre: 'la lista vuelve a ordenar por numero', de: ".order('codigo', { ascending: false })", a: ".order('numero', { ascending: false })" },
    { nombre: 'el detalle de la cuenta no saca el código de una interna', de: '|[A-Z]+-(?:I-)?\\d+)/', a: '|[A-Z]+-\\d+)/' },
    { nombre: 'el sello vuelve a decir "Entre empresas"', de: '>Orden interna</span>`\n    }', a: '>Entre empresas</span>`\n    }' },
    { nombre: 'la fila sin la orden', de: '${htmlOrdenEntre(f)}${valorHtmlEntre}', a: '${valorHtmlEntre}' },
    { nombre: 'el link sin permiso', de: "      return !!o?.id && !!o.unidad && puedeEn('retiros', 'ver', o.unidad) && empresasDeAdministracion().some(e => e.id === o.unidad)", a: '      return !!o?.id' },
    { nombre: 'sin leer la tabla', de: "        const { data, error } = await supabase.from('movimientos_entre_unidades').select('id, orden_retiro_id').in('id', deudas.map(f => f.referencia_id))\n        if (error) throw error\n        for (const m of data ?? []) if (m?.id && m.orden_retiro_id) porMov.set(m.id, m.orden_retiro_id)", a: '' },
    { nombre: 'sin buscar por el código', de: "      await Promise.all([leer('id', ids), leer('codigo', codigos)])", a: "      await Promise.all([leer('id', ids)])" },
    { nombre: 'un error de la tabla traba', de: "        console.error('No se pudieron leer las órdenes de las deudas entre empresas:', err)\n      }\n      const ids", a: '        throw err\n      }\n      const ids' },
    { nombre: 'sin el código cuando no se encuentra la orden', de: '        else if (codigo) f.orden = { id: null, codigo, unidad: null }\n', a: '' },
    { nombre: 'el link no cambia de empresa', de: '      if (f.orden.unidad !== estado.empresaId) ponerEmpresa(f.orden.unidad)\n', a: '' },
    { nombre: 'el link abre aunque no esté en la lista', de: '      if (!f || !puedeAbrirOrdenEntre(f.orden)) return\n      if (f.orden.unidad', a: '      if (f && !puedeAbrirOrdenEntre(f.orden)) return\n      if (f?.orden.unidad' },
    { nombre: 'la pantalla no busca las órdenes', de: '      vincularOrdenesEntre(filas).then(() => { if (turno === e.turno && e.filas === filas) pintarEntre() })', a: '' },
  ],
})
console.log(`\nTOTAL: ${r.detectadas}/${r.total} mutaciones detectadas${r.equivalentes ? ` (+${r.equivalentes} equivalentes)` : ''}`)
process.exit(r.detectadas === r.total && !r.fallas ? 0 : 1)
