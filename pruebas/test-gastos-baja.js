// Gastos y las personas DADAS DE BAJA (28/09/2026).
//
// Una persona dada de baja (empleados.activo = false, desde Empleados con
// dar_de_baja_empleado) no se ofrece en el selector de empleado del wizard,
// pero:
//   - su NOMBRE sigue saliendo donde se resuelve por id (quién anuló, de
//     quién es la cuenta, el Excel): las consultas traen a TODOS;
//   - al EDITAR un gasto suyo, el selector la conserva (si no, quedaría en
//     "— Ninguno —" y el guardado le borraría la persona al gasto).
// La Cuenta de Empresa (tipo='empresa', activo=false) tampoco es elegible,
// igual que antes, cuando ni siquiera llegaba a la lista.
//
// Los renders se EJECUTAN (poblarSelectEmpleados con un document falso) y se
// afirma sobre el TEXTO de las dos consultas: el doble no mira los .select().
//
//   node pruebas/test-gastos-baja.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-baja.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const MALO = '"><img src=x onerror=alert(1)>'
const EMPLEADOS = [
  { id: 'e-ana',  nombre: 'Ana',   tipo: 'naaloo', activo: true },
  { id: 'e-adm',  nombre: 'Admin', tipo: 'admin',  activo: true },
  { id: 'e-sin',  nombre: 'Sin columna activo', tipo: 'naaloo' },
  { id: 'e-baja', nombre: 'De Baja ' + MALO, tipo: 'naaloo', activo: false },
  { id: 'e-bajadm', nombre: 'Admin De Baja', tipo: 'admin', activo: false },
  { id: 'e-emp',  nombre: 'Empresa', tipo: 'empresa', activo: false },
]

const UTILS = require('fs').readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
const iFab = UTILS.indexOf('export const FABRICA_SIN_DATOS')
const iFin = UTILS.indexOf('\n}\n', UTILS.indexOf('export function sinPersonasDePrueba'))
if (iFab < 0 || iFin < 0) throw new Error('no se encontraron los filtros de la fábrica en js/utils.js')
const FUENTE_FABRICA = UTILS.slice(iFab, iFin + 3).replace(/^export /gm, '')

const PRELUDIO = FUENTE_FABRICA + `
  function nuevoEl(id) {
    return { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, style: {}, dataset: {}, addEventListener(){} }
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'e-ana', misTareas: new Set(['gastos:ver_exportar']),
    maestros: { empleados: [], unidades: [{ id: 'u1', nombre: 'Cucuruchos Nuss' }] },
    fabrica: FABRICA_SIN_DATOS,
  }
`
const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO,
  funciones: ['esc', 'tieneTarea', 'esCuentaDeTablet', 'personasNoTablet', 'personasElegibles', 'personasParaEditar', 'poblarSelectEmpleados',
    'actualizarGrupoProyecto', 'esUnidadTaller', 'mostrarErrorProyecto'],
  retorno: 'estado, __els',
})
S.estado.maestros.empleados = EMPLEADOS.map(e => ({ ...e }))

// ── personasElegibles ────────────────────────────────────────────────────
const ids = S.personasElegibles().map(e => e.id)
chk('nadie de baja entre las elegibles', !ids.includes('e-baja') && !ids.includes('e-bajadm'), ids.join(','))
chk('Empresa (inactiva) no es elegible', !ids.includes('e-emp'), ids.join(','))
chk('las activas siguen', ids.includes('e-ana') && ids.includes('e-adm'), ids.join(','))
chk('una fila sin la columna activo no se saca', ids.includes('e-sin'), ids.join(','))
chk('la lista maestra queda COMPLETA (nombres por id)', S.estado.maestros.empleados.length === EMPLEADOS.length)
chk('el nombre del dado de baja se resuelve por id',
  S.estado.maestros.empleados.find(e => e.id === 'e-baja')?.nombre.startsWith('De Baja'))

// ── poblarSelectEmpleados (el wizard), ejecutado ─────────────────────────
S.poblarSelectEmpleados('u1')
const html = S.__els.get('campo-empleado').innerHTML
chk('wizard: nadie de baja en el selector', !html.includes('e-baja') && !html.includes('e-bajadm'), html)
chk('wizard: Empresa no aparece', !html.includes('value="e-emp"'), html)
chk('wizard: las activas aparecen', html.includes('value="e-ana"') && html.includes('value="e-adm"'))
chk('wizard: el nombre malicioso no llegó (y no quedó crudo)', !html.includes(MALO))

// ── personasParaEditar (la edición conserva a la persona del gasto) ──────
const editBaja = S.personasParaEditar({ empleado_id: 'e-baja', empleados: { id: 'e-baja' } }).map(e => e.id)
chk('edición: un gasto de alguien de baja conserva a su persona', editBaja.includes('e-baja'), editBaja.join(','))
chk('edición: pero no se ofrecen los OTROS dados de baja', !editBaja.includes('e-bajadm'), editBaja.join(','))
const editSinEmbed = S.personasParaEditar({ empleado_id: 'e-bajadm' }).map(e => e.id)
chk('edición: sin embed, usa empleado_id', editSinEmbed.includes('e-bajadm'))
const editAna = S.personasParaEditar({ empleado_id: 'e-ana', empleados: { id: 'e-ana' } }).map(e => e.id)
chk('edición de un gasto de alguien activo: nadie de baja', !editAna.includes('e-baja') && !editAna.includes('e-bajadm'), editAna.join(','))
chk('edición: no muta la lista maestra', S.estado.maestros.empleados.length === EMPLEADOS.length)

// ── Las consultas (el doble no mira el .select()) ────────────────────────
const consultas = FUENTE.match(/\.from\('v_empleados_publico'\)\s*\.select\('[^']*'\)[^\n]*/g) || []
const deLista = consultas.filter(q => /\.order\('nombre'\)/.test(q))
chk('hay dos consultas de lista de personas', deLista.length === 2, String(deLista.length))
for (const q of deLista) {
  chk(`la consulta trae activo: ${q.slice(0, 90)}`, /select\('[^']*\bactivo\b/.test(q), q)
  chk(`la consulta no filtra activo: ${q.slice(0, 90)}`, !/\.eq\('activo'/.test(q), q)
}
chk('nunca se filtra la baja en SQL con .neq(activo)', !/\.neq\(\s*'activo'/.test(FUENTE))
chk('el selector de la edición escapa el nombre',
  /<select id="edit-empleado">[\s\S]*?personasParaEditar\(g\)\.map\([\s\S]*?\$\{esc\(e\.nombre\)\}/.test(extraerFn(FUENTE, 'mostrarFormularioEdicionGasto')))

fin()
