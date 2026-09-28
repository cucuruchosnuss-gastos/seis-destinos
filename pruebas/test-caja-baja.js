// Caja y las personas DADAS DE BAJA (28/09/2026).
//
// Una persona dada de baja (empleados.activo = false, desde Empleados con
// dar_de_baja_empleado) no se ofrece como contraparte en ninguna de las tres
// ramas del selector, pero su NOMBRE sigue saliendo en sus movimientos
// viejos: el mapa de nombres por id queda completo. La Cuenta de Empresa
// (tipo='empresa', activo=false a propósito) se sigue ofreciendo.
//
// Esta suite EJECUTA el código real con un doble de supabase que respeta los
// .eq() de la consulta:
//   - cargarSuperAdmins() trae `activo` y no filtra en la consulta;
//   - cargarNombresEmpleados() NO filtra activos (el nombre del dado de baja
//     queda en el mapa, y el de Empresa también);
//   - poblarSelectorContraparte() en sus cuatro ramas, cargadas por las
//     funciones reales y con las listas ya armadas trayendo a alguien de baja.
//
//   node pruebas/test-caja-baja.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-baja.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
const src = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const FUNCIONES = [
  'esc', 'tieneTarea', 'tieneTareaExplicita', 'esCuentaDeTablet',
  'cargarSuperAdmins', 'cargarPersonasConAcceso', 'cargarNombresEmpleados',
  'asegurarEmpresaEnEmpleados', 'poblarSelectorContraparte',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  var __errores = []
  function mostrarError(m) { __errores.push(m) }
  var __els = new Map()
  function nuevoEl(id) { return { id, innerHTML: '', textContent: '', value: '', hidden: false } }
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __consultas = []
  var __filas = []
  function __consulta(tabla) {
    const reg = { tabla, select: null, filtros: [] }
    __consultas.push(reg)
    const q = {}
    q.select = (s) => { reg.select = s; return q }
    for (const k of ['eq', 'neq', 'in', 'is', 'not', 'or', 'order', 'gte', 'lte', 'limit', 'filter'])
      q[k] = (...a) => { reg.filtros.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => {
      let filas = __filas.map(x => ({ ...x }))
      for (const f of reg.filtros) if (f[0] === 'eq') filas = filas.filter(x => x[f[1]] === f[2])
      return Promise.resolve({ data: filas, error: null }).then(res, rej)
    }
    return q
  }
  var supabase = { from: (t) => __consulta(t) }
  var estado = {
    miEmpleado: { id: 'yo', nombre: 'Yo', rol_app: 'usuario' },
    idEmpresa: 'emp', misTareasCaja: new Set(),
    empleados: [], superAdmins: [], nombresEmpleados: {}, unidadesEmpleados: {},
  }
`
const RETORNO = 'estado, __consultas, __errores, __set(f) { __filas = f }, __el(id) { return document.getElementById(id) }'

const MALO = '"><img src=x onerror=alert(1)>'
// Lo que devolvería v_empleados_publico. `baja` y `sabaja` están dados de
// baja; `emp` es la Cuenta de Empresa (inactiva a propósito).
const FILAS = [
  { id: 'yo', nombre: 'Yo', tipo: 'admin', rol_app: 'usuario', activo: true, tiene_acceso: true },
  { id: 'p1', nombre: 'Persona Uno', tipo: 'naaloo', rol_app: 'usuario', activo: true, tiene_acceso: true },
  { id: 'baja', nombre: 'Persona De Baja', tipo: 'naaloo', rol_app: 'usuario', activo: false, tiene_acceso: true },
  { id: 'sa', nombre: 'Súper ' + MALO, tipo: 'admin', rol_app: 'super_admin', activo: true, tiene_acceso: true },
  { id: 'sabaja', nombre: 'Súper De Baja', tipo: 'admin', rol_app: 'super_admin', activo: false, tiene_acceso: true },
  { id: 'emp', nombre: 'Empresa', tipo: 'empresa', rol_app: 'usuario', activo: false, tiene_acceso: false },
]

function nuevoSandbox() {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, retorno: RETORNO })
  S.__set(FILAS)
  return S
}

const opcionesDe = (html) => [...(html || '').matchAll(/<option value="([^"]*)"/g)].map(m => m[1]).filter(Boolean)

async function casos() {
  // ── 1. Los super admins traen `activo`, sin filtrar en la consulta ──────
  {
    const S = nuevoSandbox()
    await S.cargarSuperAdmins()
    const c = S.__consultas.find(q => q.filtros.some(f => f[1] === 'rol_app'))
    chk('el select de super admins trae activo', /(^|,\s*)activo(\s*,|$)/.test(c?.select || ''), c?.select)
    chk('no filtra activo en la consulta', !c?.filtros.some(f => f[1] === 'activo'), JSON.stringify(c?.filtros))
    chk('el super admin de baja llega a la lista (se filtra al ofrecer)',
      S.estado.superAdmins.some(s => s.id === 'sabaja'))
  }

  // ── 2. El mapa de nombres queda COMPLETO ────────────────────────────────
  {
    const S = nuevoSandbox()
    await S.cargarNombresEmpleados()
    const c = S.__consultas.find(q => q.tabla === 'v_empleados_publico' && /unidad_negocio_id/.test(q.select || '') && !q.filtros.some(f => f[1] === 'tiene_acceso'))
    chk('cargarNombresEmpleados lee v_empleados_publico', !!c)
    chk('cargarNombresEmpleados no filtra activo', !c?.filtros.some(f => f[1] === 'activo'), JSON.stringify(c?.filtros))
    chk('el nombre del dado de baja sigue en el mapa', S.estado.nombresEmpleados.baja === 'Persona De Baja')
    chk('el super admin de baja también', S.estado.nombresEmpleados.sabaja === 'Súper De Baja')
    chk('Empresa también', S.estado.nombresEmpleados.emp === 'Empresa')
    chk('la unidad del dado de baja también se conoce', 'baja' in S.estado.unidadesEmpleados)
  }

  // ── 3. El selector de contraparte, en sus cuatro ramas ──────────────────
  const ramas = [
    ['usuario común (solo super admins)', (S) => {}, 'yo'],
    ['super_admin (lista completa)', (S) => { S.estado.miEmpleado.rol_app = 'super_admin' }, 'yo'],
    ['transferir_entre_personas (lista completa)', (S) => { S.estado.misTareasCaja = new Set(['transferir_entre_personas']) }, 'yo'],
    ['desde Empresa (lista completa)', (S) => {}, 'emp'],
  ]
  for (const [nombre, preparar, propio] of ramas) {
    // Cargadas por las funciones reales.
    {
      const S = nuevoSandbox()
      preparar(S)
      await S.cargarSuperAdmins()
      await S.cargarNombresEmpleados()
      await S.poblarSelectorContraparte(propio)
      const html = S.__el('contraparte-select').innerHTML
      const ops = opcionesDe(html)
      chk(`${nombre}: nadie de baja como contraparte`, !ops.includes('baja') && !ops.includes('sabaja'), ops.join())
      chk(`${nombre}: ofrece opciones`, ops.length > 0, ops.join())
      if (propio !== 'emp') chk(`${nombre}: Empresa se sigue ofreciendo`, ops.includes('emp'), ops.join())
      else chk(`${nombre}: Empresa no se ofrece a sí misma`, !ops.includes('emp'), ops.join())
      if (ops.includes('sa')) chk(`${nombre}: el nombre va escapado`, !html.includes(MALO) && html.includes('&lt;img'), html)
    }
    // Con las listas ya armadas trayendo a alguien de baja (la red del selector).
    {
      const S = nuevoSandbox()
      preparar(S)
      S.estado.empleados = FILAS.filter(f => f.id !== 'emp').map(x => ({ ...x })).concat([{ id: 'emp', nombre: 'Empresa' }])
      S.estado.superAdmins = FILAS.filter(f => f.rol_app === 'super_admin').map(x => ({ ...x }))
      S.estado.nombresEmpleados = { emp: 'Empresa' }
      await S.poblarSelectorContraparte(propio)
      const ops = opcionesDe(S.__el('contraparte-select').innerHTML)
      chk(`${nombre}: con la lista ya armada, tampoco hay nadie de baja`, !ops.includes('baja') && !ops.includes('sabaja'), ops.join())
      if (propio !== 'emp') chk(`${nombre}: con la lista ya armada, Empresa sigue`, ops.includes('emp'), ops.join())
      if (nombre.includes('completa')) chk(`${nombre}: la persona activa se ofrece`, ops.includes('p1'), ops.join())
    }
  }

  // ── 4. Una fila sin `activo` (una consulta vieja) no desaparece ─────────
  {
    const S = nuevoSandbox()
    S.estado.miEmpleado.rol_app = 'super_admin'
    S.estado.empleados = [{ id: 'sin', nombre: 'Sin columna' }, { id: 'emp', nombre: 'Empresa' }]
    S.estado.superAdmins = []
    await S.poblarSelectorContraparte('yo')
    const ops = opcionesDe(S.__el('contraparte-select').innerHTML)
    chk('una fila sin la columna activo se sigue ofreciendo', ops.includes('sin'), ops.join())
  }

  // ── 5. El filtro va ANTES de sumar a Empresa ────────────────────────────
  {
    const iFiltro = src.indexOf('candidatos = candidatos.filter(c => c?.activo !== false)')
    const iEmpresa = src.indexOf('candidatos = [...candidatos, { id: estado.idEmpresa')
    chk('existe el filtro de dados de baja en la contraparte', iFiltro > 0)
    chk('existe el agregado de Empresa', iEmpresa > 0)
    chk('el filtro va antes de sumar a Empresa', iFiltro > 0 && iEmpresa > 0 && iFiltro < iEmpresa)
    chk('ninguna consulta de personas filtra activo con neq', !/\.neq\('activo'/.test(src))
  }
}

esperas.push(casos())
fin()
