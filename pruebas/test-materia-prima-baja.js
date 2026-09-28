// Ingreso y las personas DADAS DE BAJA (28/09/2026).
//
// Ingreso no ofrece personas para elegir: solo NOMBRA a quien cargó, editó o
// recibió. Antes el mapa de nombres (asegurarEmpleados) filtraba activo = true,
// así que el nombre de alguien dado de baja desaparecía de los ingresos que
// había cargado. Ahora trae a todos.
//
// Se EJECUTAN asegurarEmpleados, textoCarga, textoRecepcion y textoEdicion con
// un supabase falso que respeta los .eq() —así un .eq('activo', true) vuelto a
// poner deja al dado de baja afuera, como en la base—, y se afirma que el
// render del detalle escapa lo que devuelven (el nombre trae HTML malicioso).
//
//   node pruebas/test-materia-prima-baja.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-materia-prima-baja.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/materia-prima.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const MALO = '"><img src=x onerror=alert(1)>'

const PRELUDIO = `
  var console = { error(){}, log(){}, warn(){} }
  var __consultas = []
  var __filas = []
  var supabase = {
    from(tabla) {
      const reg = { tabla, select: null, filtros: [] }
      __consultas.push(reg)
      const q = {}
      q.select = (s) => { reg.select = s; return q }
      for (const op of ['order', 'in', 'neq', 'maybeSingle']) q[op] = (...a) => { reg.filtros.push([op, ...a]); return q }
      q.eq = (c, v) => { reg.filtros.push(['eq', c, v]); return q }
      q.then = (res, rej) => {
        let data = __filas.map(x => ({ ...x }))
        for (const f of reg.filtros) if (f[0] === 'eq') data = data.filter(x => x[f[1]] === f[2])
        return Promise.resolve({ data, error: null }).then(res, rej)
      }
      return q
    },
  }
  function formatearFechaHora(v) { return 'el-dia' }
  var estado = { empleados: [], empleadosCargados: false }
`
const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO,
  funciones: ['asegurarEmpleados', 'textoCarga', 'textoRecepcion', 'textoEdicion'],
  retorno: 'estado, __consultas, __set(f) { __filas = f }',
})
S.__set([
  { id: 'e-activo', nombre: 'Emanuel', activo: true },
  { id: 'e-baja', nombre: 'Franco ' + MALO, activo: false },
])

async function casos() {
  await S.asegurarEmpleados()
  const c = S.__consultas.find(q => q.tabla === 'v_empleados_publico')
  chk('lee de v_empleados_publico', !!c)
  chk('no filtra activo', !c?.filtros.some(f => f[1] === 'activo'), JSON.stringify(c?.filtros))
  chk('el mapa trae al dado de baja', S.estado.empleados.some(e => e.id === 'e-baja'))
  chk('"Cargado por" nombra al dado de baja', S.textoCarga({ empleado_id: 'e-baja' }).startsWith('Cargado por Franco'))
  chk('"Recibido por" nombra al dado de baja', S.textoRecepcion({ respondido_por: 'e-baja' }).startsWith('Recibido por Franco'))
  chk('"Editado por" nombra al dado de baja', S.textoEdicion({ editado_por: 'e-baja', editado_en: '2026-09-28' }).startsWith('Editado por Franco'))
  chk('un id que no existe no inventa un nombre', S.textoCarga({ empleado_id: 'nadie' }) === '')
  chk('el activo se sigue nombrando', S.textoCarga({ empleado_id: 'e-activo' }) === 'Cargado por Emanuel')

  // El render escapa lo que devuelven (son texto plano con el nombre adentro).
  chk('el detalle escapa "Cargado por"', /\$\{esc\(carga\)\}/.test(FUENTE))
  chk('el detalle escapa "Editado por"', /\$\{esc\(edicion\)\}/.test(FUENTE))
  chk('el detalle escapa "Recibido por"', /esc\(textoRecepcion\(entrega\.base\)\)/.test(FUENTE))
  chk('el comentario ya no afirma que la vista filtra activo', !/la vista filtra activo=true/.test(FUENTE) && !/la vista se filtra por\s*\n?\s*\/\/\s*activo=true/.test(FUENTE))
}

esperas.push(casos())
fin()
