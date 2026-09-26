// Las cuentas de las tablets de la fábrica NO son personas en Caja (25/09/2026).
//
// Tienen login (tiene_acceso=true), así que v_empleados_publico las devuelve
// junto con las personas. Caja las filtra en el CLIENTE con esCuentaDeTablet()
// (tipo='sistema', que hoy equivale a empleados.es_dispositivo, columna que la
// vista no expone). Esta suite EJECUTA el código real:
//   - cargarPersonasConAcceso() y cargarSuperAdmins() con una respuesta falsa
//     que trae tablets, personas y una fila con tipo null;
//   - poblarSelectorContraparte() en sus tres ramas (desde Empresa, super_admin
//     o transferir_entre_personas, y usuario común), mirando el <select> que
//     dibuja.
// Y verifica que la consulta traiga `tipo` y que NO filtre con .neq('tipo',…),
// que en SQL descartaría en silencio las filas con tipo null.
//
//   node pruebas/test-caja-tablets.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-caja-tablets.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
// El código REAL de js/utils.js (números y fábrica de pruebas): caja.html
// importa sinPersonasDePrueba desde el 26/09/2026.
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/caja.html')
leer(ARCHIVO) // informa el largo leído (lo usa el runner de mutaciones)
const { chk, esperas, fin } = arnes()

const FUNCIONES = [
  'esc', 'tieneTarea', 'tieneTareaExplicita', 'esCuentaDeTablet',
  'cargarSuperAdmins', 'cargarPersonasConAcceso', 'asegurarEmpresaEnEmpleados',
  'poblarSelectorContraparte',
]

const PRELUDIO = `
  ${fuenteNumeros()}
  var __errores = []
  function mostrarError(m) { __errores.push(m) }
  var __els = new Map()
  function nuevoEl(id) { return { id, innerHTML: '', textContent: '', value: '', hidden: false } }
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __consultas = []
  var __respuestas = {}
  function __consulta(tabla) {
    const reg = { tabla, select: null, filtros: [] }
    __consultas.push(reg)
    const q = {}
    q.select = (s) => { reg.select = s; return q }
    for (const k of ['eq', 'neq', 'in', 'is', 'not', 'or', 'order', 'gte', 'lte', 'limit', 'filter'])
      q[k] = (...a) => { reg.filtros.push([k, ...a]); return q }
    q.maybeSingle = () => q
    q.then = (res, rej) => Promise.resolve({ data: (__respuestas[reg.filtros.some(f => f[0] === 'eq' && f[1] === 'rol_app') ? 'super' : 'personas'] || []).map(x => ({ ...x })), error: null }).then(res, rej)
    return q
  }
  var supabase = { from: (t) => __consulta(t) }
  var estado = {
    miEmpleado: { id: 'yo', nombre: 'Yo', rol_app: 'usuario' },
    idEmpresa: 'emp', misTareasCaja: new Set(),
    empleados: [], superAdmins: [], nombresEmpleados: { emp: 'Empresa' },
  }
`
const RETORNO = 'estado, __consultas, __errores, __set(r) { __respuestas = r }, __el(id) { return document.getElementById(id) }'

// Lo que devolvería v_empleados_publico: dos personas, una fila con tipo NULL
// (tiene que quedarse), y las tres tablets.
const TABLETS = [
  { id: 't1', nombre: 'Tablet Producción · Cucuruchos Nuss', tipo: 'sistema', rol_app: 'usuario' },
  { id: 't2', nombre: 'Tablet Producción · Dolce Pasta', tipo: 'sistema', rol_app: 'usuario' },
  { id: 't3', nombre: 'Tablet Producción · Mengui', tipo: 'sistema', rol_app: 'usuario' },
]
const PERSONAS = [
  { id: 'yo', nombre: 'Yo', tipo: 'admin', rol_app: 'usuario' },
  { id: 'p1', nombre: 'Persona Uno', tipo: 'naaloo', rol_app: 'usuario' },
  { id: 'pnull', nombre: 'Persona Sin Tipo', tipo: null, rol_app: 'usuario' },
  { id: 'sa', nombre: 'Súper', tipo: 'admin', rol_app: 'super_admin' },
  ...TABLETS,
]
// Una tablet con rol super_admin es hipotética (hoy son 'usuario'), pero la
// lista de super admins tiene que filtrarse igual.
const SUPER = [
  { id: 'sa', nombre: 'Súper', tipo: 'admin', rol_app: 'super_admin' },
  { id: 'sanull', nombre: 'Súper Sin Tipo', tipo: null, rol_app: 'super_admin' },
  { id: 't9', nombre: 'Tablet Producción · Prueba', tipo: 'sistema', rol_app: 'super_admin' },
]
const idsTablet = new Set([...TABLETS.map(t => t.id), 't9'])

function nuevoSandbox() {
  const S = construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, retorno: RETORNO })
  S.__set({ personas: PERSONAS, super: SUPER })
  return S
}

const opcionesDe = (html) => [...(html || '').matchAll(/<option value="([^"]*)"/g)].map(m => m[1]).filter(Boolean)

async function casos() {
  // ── 1. El predicado ─────────────────────────────────────────────────────
  {
    const S = nuevoSandbox()
    chk('tipo sistema es tablet', S.esCuentaDeTablet({ tipo: 'sistema' }) === true)
    chk('tipo null NO es tablet', S.esCuentaDeTablet({ tipo: null }) === false)
    chk('sin tipo NO es tablet', S.esCuentaDeTablet({}) === false)
    chk('tipo empresa NO es tablet', S.esCuentaDeTablet({ tipo: 'empresa' }) === false)
    chk('tipo naaloo NO es tablet', S.esCuentaDeTablet({ tipo: 'naaloo' }) === false)
    chk('undefined no tira', S.esCuentaDeTablet(undefined) === false)
  }

  // ── 2. La lista de personas (listado, Directorio, filtros, contraparte) ─
  {
    const S = nuevoSandbox()
    const ok = await S.cargarPersonasConAcceso()
    chk('cargarPersonasConAcceso devuelve true', ok === true)
    const ids = S.estado.empleados.map(e => e.id)
    chk('ninguna tablet queda en estado.empleados', !ids.some(id => idsTablet.has(id)), ids.join())
    chk('la fila con tipo null se QUEDA', ids.includes('pnull'), ids.join())
    chk('las personas se quedan', ['yo', 'p1', 'sa'].every(id => ids.includes(id)), ids.join())
    chk('Empresa se reinserta igual', ids.includes('emp'), ids.join())
    const c = S.__consultas.find(q => q.tabla === 'v_empleados_publico' && /unidad_negocio_id/.test(q.select || ''))
    chk('lee de v_empleados_publico', !!c)
    chk('el select de personas trae tipo', /(^|,\s*)tipo(\s*,|$)/.test(c?.select || ''), c?.select)
    chk('no filtra tipo en la consulta (descartaría los null)', !c?.filtros.some(f => f[1] === 'tipo'), JSON.stringify(c?.filtros))
  }

  // ── 3. La lista de super admins ─────────────────────────────────────────
  {
    const S = nuevoSandbox()
    await S.cargarSuperAdmins()
    const ids = S.estado.superAdmins.map(e => e.id)
    chk('ninguna tablet queda en estado.superAdmins', !ids.includes('t9'), ids.join())
    chk('el super admin con tipo null se QUEDA', ids.includes('sanull'), ids.join())
    chk('el super admin se queda', ids.includes('sa'), ids.join())
    const c = S.__consultas.find(q => q.filtros.some(f => f[1] === 'rol_app'))
    chk('el select de super admins trae tipo', /(^|,\s*)tipo(\s*,|$)/.test(c?.select || ''), c?.select)
    chk('no filtra tipo en la consulta', !c?.filtros.some(f => f[1] === 'tipo'), JSON.stringify(c?.filtros))
  }

  // ── 4. El selector de contraparte, en sus tres ramas ────────────────────
  const ramas = [
    ['usuario común (solo super admins)', (S) => {}, 'yo'],
    ['super_admin (lista completa)', (S) => { S.estado.miEmpleado.rol_app = 'super_admin' }, 'yo'],
    ['transferir_entre_personas (lista completa)', (S) => { S.estado.misTareasCaja = new Set(['transferir_entre_personas']) }, 'yo'],
    ['desde Empresa (lista completa)', (S) => {}, 'emp'],
  ]
  for (const [nombre, preparar, propio] of ramas) {
    // Cargadas por las funciones reales…
    {
      const S = nuevoSandbox()
      preparar(S)
      await S.cargarSuperAdmins()
      await S.poblarSelectorContraparte(propio)
      const ops = opcionesDe(S.__el('contraparte-select').innerHTML)
      chk(`${nombre}: ninguna tablet como contraparte`, !ops.some(id => idsTablet.has(id)), ops.join())
      chk(`${nombre}: ofrece opciones`, ops.length > 0, ops.join())
      if (propio === 'emp' || nombre.includes('completa')) chk(`${nombre}: la fila con tipo null se ofrece`, ops.includes('pnull'), ops.join())
      else chk(`${nombre}: el super admin con tipo null se ofrece`, ops.includes('sanull'), ops.join())
    }
    // …y aunque la lista llegara SIN filtrar (la red del selector).
    {
      const S = nuevoSandbox()
      preparar(S)
      S.estado.empleados = PERSONAS.map(x => ({ ...x })).concat([{ id: 'emp', nombre: 'Empresa' }])
      S.estado.superAdmins = SUPER.map(x => ({ ...x }))
      await S.poblarSelectorContraparte(propio)
      const ops = opcionesDe(S.__el('contraparte-select').innerHTML)
      chk(`${nombre}: con la lista sin filtrar, tampoco hay tablets`, !ops.some(id => idsTablet.has(id)), ops.join())
    }
  }
}

esperas.push(casos())
fin()
