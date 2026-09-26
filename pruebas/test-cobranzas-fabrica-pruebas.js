// La fábrica de pruebas no ensucia Cobranzas — modulos/cobranzas.html (26/09/2026).
//
// La unidad "Pruebas (robot)" y sus personas existen para Playwright. En
// Cobranzas hay DOS listas que podrían mostrarlas a una cuenta real:
//  - el diálogo de la unidad de negocio (asentar / "Asignar unidad" / "Cambiar"),
//    que arma unidadesParaElegir;
//  - el selector "Repartidor" del listado, que arma pintarRepartidores.
//
// Se EJECUTAN las funciones reales —asegurarFabrica (que llama al
// cargarFabricaDePruebas REAL de js/utils.js), unidadesParaElegir,
// elegirUnidadConDialogo, cargarRepartidores y pintarRepartidores— con un
// supabase falso que contesta como la base. Lo que se afirma:
//  - cuenta real: ni la unidad ni el robot aparecen;
//  - cuenta de prueba (soyDePrueba): aparecen los dos;
//  - la fábrica no se pudo leer (FABRICA_SIN_DATOS): no se saca nada;
//  - "Cambiar" sobre una cobranza que ya tiene la unidad de prueba la conserva;
//  - si solo queda UNA unidad real, se elige sola (como con una sola unidad);
//  - el selector de repartidores se vuelve a pintar cuando la fábrica llega
//    después, conservando lo elegido.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${String(detalle).slice(0, 400)}` : ''))
}

const PRUEBA = 'u-robot'
const ROBOT = 'p-robot'

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  function nuevoEl(id) {
    const el = { id, textContent: '', hidden: true, disabled: false, __valor: '', __html: '' }
    // Como un <select> de verdad: cambiarle las opciones descarta lo elegido.
    Object.defineProperty(el, 'innerHTML', {
      get() { return el.__html },
      set(v) { el.__html = String(v); el.__valor = '' },
    })
    Object.defineProperty(el, 'value', {
      get() { return el.__valor },
      set(v) {
        v = String(v ?? '')
        const hay = [...el.innerHTML.matchAll(/<option value="([^"]*)"/g)].some(m => m[1] === v)
        el.__valor = hay ? v : ''
      },
    })
    return el
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __errores = []
  function mostrarError(m) { __errores.push(m) }
  function pintarBotonUnidad() {}
  async function abrirDialogo() { return null }

  // --- supabase falso, que contesta como la base ------------------------
  var __base = { unidades: [], pruebas: [], personasPrueba: [], repartidores: [], yo: null, fallar: null }
  var supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'uid-1' } } } }) },
    from(tabla) {
      const filtros = []
      const q = {}
      for (const op of ['select', 'order', 'maybeSingle']) q[op] = () => q
      q.eq = (c, v) => { filtros.push(['eq', c, v]); return q }
      q.in = (c, v) => { filtros.push(['in', c, v]); return q }
      q.then = (res, rej) => {
        if (__base.fallar === tabla) return Promise.resolve({ data: null, error: { message: 'sin red' } }).then(res, rej)
        let data
        const hay = (c) => filtros.some(f => f[1] === c)
        if (tabla === 'unidades_negocio') data = hay('es_prueba') ? __base.pruebas.map(id => ({ id })) : __base.unidades
        else if (tabla === 'v_empleados_publico') data = hay('tiene_acceso') ? __base.repartidores : __base.personasPrueba.map(id => ({ id }))
        else if (tabla === 'empleados') data = __base.yo
        else data = []
        return Promise.resolve({ data, error: null }).then(res, rej)
      }
      return q
    },
  }

  var promesaUnidades = null
  var promesaFabrica = null
  var estado = {
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar']),
    unidades: [], repartidores: [], fabrica: FABRICA_SIN_DATOS,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
  }
`

const FUNCIONES = [
  'escCob', 'tieneTarea', 'cargarUnidades', 'asegurarUnidades', 'unidadesParaElegir', 'asegurarFabrica',
  'elegirUnidadConDialogo', 'cargarRepartidores', 'pintarRepartidores',
]
const CONSTANTES = ['puedeCargar', 'puedeVerTodo', 'puedeProcesar']

const UNIDADES = [
  { id: 'u-cn', nombre: 'Cucuruchos Nuss', activo: true },
  { id: 'u-dp', nombre: 'Dolce Pasta', activo: true },
  { id: PRUEBA, nombre: 'Pruebas (robot)', activo: true },
]
const REPARTIDORES = [
  { id: 'p-mariano', nombre: 'Mariano', unidad_negocio_id: 'u-cn' },
  { id: ROBOT, nombre: 'Robot Encargado', unidad_negocio_id: PRUEBA },
  // Sin unidad en la fila: igual tiene que salir por el id.
  { id: 'p-robot-2', nombre: 'Robot Masero', unidad_negocio_id: null },
]

function sandbox({ cuenta = 'real', unidades = UNIDADES, fallar = null } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __base, __errores`,
  })
  Object.assign(S.__base, {
    unidades, pruebas: [PRUEBA], personasPrueba: [ROBOT, 'p-robot-2'],
    repartidores: REPARTIDORES, fallar,
    yo: cuenta === 'prueba'
      ? { unidad_negocio_id: PRUEBA, es_prueba: true }
      : { unidad_negocio_id: 'u-cn', es_prueba: false },
  })
  return S
}

const opcionesDe = (S, id) => [...S.__els.get(id).innerHTML.matchAll(/<option value="([^"]*)">([^<]*)</g)].map(m => m[1])

async function pruebas() {
  // ══ 1. EL DIÁLOGO DE LA UNIDAD ═════════════════════════════════════════════
  {
    const S = sandbox({ cuenta: 'real' })
    await S.elegirUnidadConDialogo({ titulo: 't', texto: 'x', textoSi: 'Asentar', actual: null })
    const op = opcionesDe(S, 'cob-dlg-unidad-select')
    chk('cuenta real: el diálogo NO ofrece la unidad de prueba', !op.includes(PRUEBA), op)
    chk('cuenta real: el diálogo ofrece las reales', op.includes('u-cn') && op.includes('u-dp'), op)
    chk('cuenta real: la fábrica quedó leída en el estado', S.estado.fabrica.ok === true && S.estado.fabrica.soyDePrueba === false)
    // Catálogo completo intacto: el historial nombra cualquier unidad por id.
    chk('el catálogo (estado.unidades) conserva la de prueba para nombrarla', S.estado.unidades.some(u => u.id === PRUEBA))
  }
  {
    const S = sandbox({ cuenta: 'prueba' })
    await S.elegirUnidadConDialogo({ titulo: 't', texto: 'x', textoSi: 'Asentar', actual: null })
    const op = opcionesDe(S, 'cob-dlg-unidad-select')
    chk('cuenta de prueba: el diálogo SÍ ofrece la unidad de prueba', op.includes(PRUEBA), op)
    chk('cuenta de prueba: soyDePrueba', S.estado.fabrica.soyDePrueba === true)
  }
  {
    const S = sandbox({ cuenta: 'real', fallar: 'empleados' })
    await S.elegirUnidadConDialogo({ titulo: 't', texto: 'x', textoSi: 'Asentar', actual: null })
    const op = opcionesDe(S, 'cob-dlg-unidad-select')
    chk('fábrica sin datos: el diálogo no saca nada', op.includes(PRUEBA) && op.length === 4, op)
    chk('fábrica sin datos: estado.fabrica es FABRICA_SIN_DATOS', S.estado.fabrica.ok === false)
  }
  {
    // "Cambiar" sobre una cobranza que ya tiene la unidad de prueba.
    const S = sandbox({ cuenta: 'real' })
    await S.elegirUnidadConDialogo({ titulo: 't', texto: 'x', textoSi: 'Guardar', actual: PRUEBA })
    const op = opcionesDe(S, 'cob-dlg-unidad-select')
    chk('Cambiar: la unidad actual se conserva aunque sea la de prueba', op.includes(PRUEBA), op)
    chk('Cambiar: queda preseleccionada', S.__els.get('cob-dlg-unidad-select').value === PRUEBA)
  }
  {
    // Una sola unidad real + la de prueba: con el filtro queda una y se elige sola.
    const S = sandbox({ cuenta: 'real', unidades: [UNIDADES[0], UNIDADES[2]] })
    await S.elegirUnidadConDialogo({ titulo: 't', texto: 'x', textoSi: 'Asentar', actual: null })
    const op = opcionesDe(S, 'cob-dlg-unidad-select')
    chk('una sola real: sin el "Elegí una unidad…" (se elige sola)', op.length === 1 && op[0] === 'u-cn', op)
    chk('una sola real: queda elegida', S.__els.get('cob-dlg-unidad-select').value === 'u-cn')
  }
  {
    // La función pura, con los tres estados de la fábrica.
    const S = sandbox()
    const real = { ok: true, unidades: new Set([PRUEBA]), personas: new Set([ROBOT]), soyDePrueba: false }
    const ids = (f, actual = null) => S.unidadesParaElegir(UNIDADES, actual, f).map(u => u.id)
    chk('unidadesParaElegir cuenta real: sin la de prueba', !ids(real).includes(PRUEBA))
    chk('unidadesParaElegir cuenta de prueba: con la de prueba', ids({ ...real, soyDePrueba: true }).includes(PRUEBA))
    chk('unidadesParaElegir sin datos: no saca nada', ids(S.estado.fabrica).length === 3)
    chk('unidadesParaElegir sigue sacando las inactivas',
      !S.unidadesParaElegir([...UNIDADES, { id: 'u-x', nombre: 'X', activo: false }], null, real).some(u => u.id === 'u-x'))
  }

  // ══ 2. EL SELECTOR DE REPARTIDORES ═════════════════════════════════════════
  {
    const S = sandbox({ cuenta: 'real' })
    await S.asegurarFabrica()
    await S.cargarRepartidores()
    const op = opcionesDe(S, 'cob-filtro-repartidor')
    chk('cuenta real: el robot NO está entre los repartidores', !op.includes(ROBOT) && !op.includes('p-robot-2'), op)
    chk('cuenta real: están los reales y "Todos"', op.includes('') && op.includes('p-mariano'), op)
    chk('cuenta real: el campo se muestra', S.__els.get('cob-campo-repartidor').hidden === false)
    chk('estado.repartidores guarda la lista entera (se filtra al armar)', S.estado.repartidores.length === 3)
  }
  {
    const S = sandbox({ cuenta: 'prueba' })
    await S.asegurarFabrica()
    await S.cargarRepartidores()
    const op = opcionesDe(S, 'cob-filtro-repartidor')
    chk('cuenta de prueba: el robot SÍ está', op.includes(ROBOT) && op.includes('p-robot-2'), op)
  }
  {
    const S = sandbox({ cuenta: 'real', fallar: 'unidades_negocio' })
    await S.asegurarFabrica()
    await S.cargarRepartidores()
    const op = opcionesDe(S, 'cob-filtro-repartidor')
    chk('fábrica sin datos: no se saca a nadie', op.includes(ROBOT) && op.length === 4, op)
  }
  {
    // La fábrica llega DESPUÉS de los repartidores: se repinta y conserva lo elegido.
    const S = sandbox({ cuenta: 'real' })
    await S.cargarRepartidores()
    chk('antes de la fábrica: no se sabe todavía, no se saca nada', opcionesDe(S, 'cob-filtro-repartidor').includes(ROBOT))
    S.__els.get('cob-filtro-repartidor').value = 'p-mariano'
    await S.asegurarFabrica()
    const op = opcionesDe(S, 'cob-filtro-repartidor')
    chk('al llegar la fábrica se repinta sin el robot', !op.includes(ROBOT), op)
    chk('al repintar se conserva el repartidor elegido', S.__els.get('cob-filtro-repartidor').value === 'p-mariano')
  }
  {
    // Sin ver_todo no hay selector: ni la fábrica lo dibuja.
    const S = sandbox({ cuenta: 'real' })
    S.estado.misTareas = new Set(['cobranzas:cargar'])
    await S.cargarRepartidores()
    await S.asegurarFabrica()
    // Aunque la lista estuviera cargada, pintar no dibuja sin ver_todo.
    S.estado.repartidores = [{ id: 'p-mariano', nombre: 'Mariano' }]
    S.pintarRepartidores()
    chk('sin ver_todo: el selector sigue oculto', (S.__els.get('cob-campo-repartidor')?.hidden ?? true) === true && !S.__els.get('cob-filtro-repartidor')?.innerHTML)
  }

  // ══ 3. EL INIT LA CARGA UNA VEZ, SIN FRENAR ════════════════════════════════
  {
    const ini = FUENTE.indexOf('async function init()')
    const cuerpo = FUENTE.slice(ini, FUENTE.indexOf('\n    init()', ini))
    chk('el init lanza asegurarFabrica()', /\n\s*asegurarFabrica\(\)\n/.test(cuerpo))
    chk('el init no la espera (no frena el arranque)', !/await[^\n]*asegurarFabrica/.test(cuerpo))
    chk('el import trae los helpers de utils.js',
      /import \{[^}]*cargarFabricaDePruebas[^}]*sinUnidadesDePrueba[^}]*sinPersonasDePrueba[^}]*FABRICA_SIN_DATOS[^}]*\} from '\.\.\/js\/utils\.js'/.test(FUENTE))
  }

  console.log(fallas.length ? fallas.map(f => '  ✗ ' + f).join('\n') : '')
  const total = ok + fallas.length
  console.log(`${ok}/${total}  ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

pruebas().catch(e => { console.error(e); process.exit(1) })
