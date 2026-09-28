// Cobranzas y las personas DADAS DE BAJA (28/09/2026).
//
// El filtro "Repartidor" del listado no ofrece a quien está dado de baja
// (empleados.activo = false, desde Empleados con dar_de_baja_empleado). Se
// filtra al PINTAR, no en la consulta, y si justo estaba elegido se conserva:
// sacarlo cambiaría el filtro puesto sin que nadie lo toque.
//
// Se EJECUTAN cargarRepartidores y pintarRepartidores reales con un supabase
// falso; el nombre de un dado de baja trae HTML malicioso (si llegara al
// selector, tiene que ir escapado).
//
//   node pruebas/test-cobranzas-baja.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-cobranzas-baja.js

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

const MALO = '"><img src=x onerror=alert(1)>'

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  function nuevoEl(id) {
    const el = { id, textContent: '', hidden: true, disabled: false, __valor: '', __html: '' }
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
  var __consultas = []
  var __filas = []
  var supabase = {
    from(tabla) {
      const reg = { tabla, select: null, filtros: [] }
      __consultas.push(reg)
      const q = {}
      q.select = (s) => { reg.select = s; return q }
      for (const op of ['order', 'maybeSingle', 'in', 'neq']) q[op] = (...a) => { reg.filtros.push([op, ...a]); return q }
      q.eq = (c, v) => { reg.filtros.push(['eq', c, v]); return q }
      q.then = (res, rej) => {
        let data = __filas.map(x => ({ ...x }))
        for (const f of reg.filtros) if (f[0] === 'eq' && f[1] !== 'tiene_acceso') data = data.filter(x => x[f[1]] === f[2])
        return Promise.resolve({ data, error: null }).then(res, rej)
      }
      return q
    },
  }
  var estado = {
    miEmpleadoId: 'emp-1', miRolApp: 'usuario',
    misTareas: new Set(['cobranzas:cargar', 'cobranzas:ver_todo']),
    unidades: [], repartidores: [], fabrica: FABRICA_SIN_DATOS,
    filtros: { texto: '', desde: '', hasta: '', estado: '', repartidor: '' },
  }
`
const FUNCIONES = ['escCob', 'tieneTarea', 'cargarRepartidores', 'pintarRepartidores']
const CONSTANTES = ['puedeCargar', 'puedeVerTodo', 'puedeProcesar']

const FILAS = [
  { id: 'p-activo', nombre: 'Mariano', unidad_negocio_id: 'u-cn', activo: true },
  { id: 'p-sin', nombre: 'Sin columna', unidad_negocio_id: 'u-cn' },
  { id: 'p-baja', nombre: 'Repartidor De Baja ' + MALO, unidad_negocio_id: 'u-cn', activo: false },
]

function sandbox() {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __consultas, __set(f) { __filas = f }`,
  })
  S.__set(FILAS)
  return S
}
const opcionesDe = (S) => [...S.__els.get('cob-filtro-repartidor').innerHTML.matchAll(/<option value="([^"]*)"/g)].map(m => m[1])

async function pruebas() {
  {
    const S = sandbox()
    await S.cargarRepartidores()
    const c = S.__consultas.find(q => q.tabla === 'v_empleados_publico')
    chk('la consulta trae activo', /(^|,\s*)activo(\s*,|$)/.test(c?.select || ''), c?.select)
    chk('la consulta no filtra activo', !c?.filtros.some(f => f[1] === 'activo'), JSON.stringify(c?.filtros))
    chk('estado.repartidores guarda la lista entera', S.estado.repartidores.length === 3)
    const op = opcionesDe(S)
    chk('el dado de baja no se ofrece', !op.includes('p-baja'), op)
    chk('el activo se ofrece', op.includes('p-activo'), op)
    chk('una fila sin la columna activo se ofrece', op.includes('p-sin'), op)
    chk('"Todos" sigue', op.includes(''), op)
  }
  {
    // Estaba elegido el dado de baja (por ejemplo, desde antes de la baja):
    // al repintar se conserva, escapado.
    const S = sandbox()
    await S.cargarRepartidores()
    S.estado.repartidores = FILAS.map(x => ({ ...x, activo: true }))
    S.pintarRepartidores()
    S.__els.get('cob-filtro-repartidor').value = 'p-baja'
    chk('preparación: quedó elegido', S.__els.get('cob-filtro-repartidor').value === 'p-baja')
    S.estado.repartidores = FILAS.map(x => ({ ...x }))
    S.pintarRepartidores()
    const html = S.__els.get('cob-filtro-repartidor').innerHTML
    chk('el dado de baja ya elegido se conserva', opcionesDe(S).includes('p-baja') && S.__els.get('cob-filtro-repartidor').value === 'p-baja', html)
    chk('su nombre va escapado', !html.includes(MALO) && html.includes('&lt;img'), html)
    // Si se cambia a otro, desaparece.
    S.__els.get('cob-filtro-repartidor').value = 'p-activo'
    S.pintarRepartidores()
    chk('al cambiar de repartidor, el dado de baja ya no se ofrece', !opcionesDe(S).includes('p-baja'), opcionesDe(S))
  }
  chk('ninguna consulta filtra activo con neq', !/\.neq\('activo'/.test(FUENTE))

  console.log(fallas.length ? fallas.map(f => '  ✗ ' + f).join('\n') : '')
  const total = ok + fallas.length
  console.log(`${ok}/${total}  ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

pruebas().catch(e => { console.error(e); process.exit(1) })
