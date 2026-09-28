// ADMINISTRACIÓN — Seguridad (27/09/2026), solo super_admin.
//
// El registro_seguridad: quién cerró las sesiones de quién, cuándo y por qué.
// Lo escribe la base (cerrar_sesiones) y lo lee solo un super_admin.
//
//   node pruebas/test-administracion-seguridad.js
// Con la zona de la máquina en UTC: una hora sin la zona de Argentina da otra.
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)) }

const FILAS = [
  { id: 's1', empleado_id: 'emp-a', accion: 'cerrar_sesiones', motivo: 'Se fue de la empresa', hecho_por: 'emp-1', hecho_en: '2026-09-27T12:00:00Z' },
  { id: 's2', empleado_id: 'emp-1', accion: 'cerrar_sesiones', motivo: 'Perdí el celular', hecho_por: 'emp-1', hecho_en: '2026-09-26T21:30:00Z' },
]

function nuevo(rol = 'super_admin', filas = FILAS) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.__tablas.registro_seguridad = filas
  S.__tablas.v_empleados_publico = [{ id: 'emp-a', nombre: 'Ana Pérez' }, { id: 'emp-1', nombre: 'Facundo' }]
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  {
    const S = nuevo()
    chk('un super_admin ve la sección Seguridad', S.seccionesVisibles().some(s => s.id === 'seguridad'))
    const U = nuevo('usuario')
    U.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }], ['cobranzas:procesar', null]])
    chk('nadie más la ve, tenga las tareas que tenga', !U.seccionesVisibles().some(s => s.id === 'seguridad'))
    await U.mostrarSeguridad()
    chk('y abrirla sin ser super_admin vuelve a la portada, sin leer nada', U.estado.vista === 'ad-vista-inicio' && !U.__llamadas.consultas.some(c => c[0] === 'registro_seguridad'))
  }
  {
    const S = nuevo()
    await S.mostrarSeguridad()
    await esperar()
    const q = S.__llamadas.consultas.find(c => c[0] === 'registro_seguridad')
    chk('lee registro_seguridad, lo más nuevo primero', !!q && q[1].some(f => f[0] === 'order' && f[1] === 'hecho_en'))
    chk('los nombres salen de v_empleados_publico (nunca de empleados)', S.__llamadas.consultas.some(c => c[0] === 'v_empleados_publico') && !S.__llamadas.consultas.some(c => c[0] === 'empleados'))
    const h = html(S, 'ad-seguridad-lista')
    chk('una tarjeta por registro', (h.match(/data-seguridad=/g) || []).length === 2)
    chk('la acción en palabras', (h.match(/Cerró todas las sesiones/g) || []).length === 2)
    chk('de quién y quién lo hizo', h.includes('De Ana Pérez · lo hizo Facundo'))
    chk('a sí mismo', h.includes('Facundo (a sí mismo)'))
    chk('el motivo', h.includes('Motivo: Se fue de la empresa'))
    chk('la hora en Argentina', /27\/09\/2026,? 09:00/.test(h), (h.match(/\d\d\/\d\d\/\d{4},? \d\d:\d\d/) || [])[0])
    chk('la cuenta', S.__els.get('ad-seguridad-cuenta').textContent === '2 registros')
    chk('es una vista sin empresa (el selector se esconde)', S.VISTAS_GLOBALES.includes('ad-vista-seguridad') && S.__els.get('ad-empresas').hidden === true)
    chk('su subtítulo', S.SUBTITULO_DE_VISTA['ad-vista-seguridad'] === 'Seguridad')
  }
  {
    const S = nuevo('super_admin', [])
    await S.mostrarSeguridad()
    await esperar()
    chk('vacío: lo dice', /Todavía no hay nada en el registro de seguridad/.test(html(S, 'ad-seguridad-lista')))
  }
  {
    const S = nuevo()
    S.__tablas.registro_seguridad = () => ({ data: null, error: { message: 'boom' } })
    await S.mostrarSeguridad()
    await esperar()
    chk('si no se puede leer, lo dice (sin inventar un registro vacío)', /No se pudo leer el registro de seguridad/.test(html(S, 'ad-seguridad-lista')))
  }
  // Todo lo de la base, escapado.
  {
    const S = nuevo('super_admin', [{ id: marca('id'), empleado_id: 'emp-x', accion: marca('accion'), motivo: marca('motivo'), hecho_por: 'emp-y', hecho_en: '2026-09-27T12:00:00Z' }])
    S.__tablas.v_empleados_publico = [{ id: 'emp-x', nombre: marca('nombre') }, { id: 'emp-y', nombre: marca('hecho_por') }]
    await S.mostrarSeguridad()
    await esperar()
    chequearMarcas(chk, 'seguridad', html(S, 'ad-seguridad-lista'), ['id', 'accion', 'motivo', 'nombre', 'hecho_por'])
  }
  // Dos lecturas seguidas: la vieja (más lenta) no pisa la nueva.
  {
    const S = nuevo()
    let n = 0
    const vieja = [{ id: 'viejo', empleado_id: 'emp-a', accion: 'cerrar_sesiones', motivo: 'VIEJA', hecho_por: 'emp-1', hecho_en: '2026-09-01T12:00:00Z' }]
    S.__tablas.registro_seguridad = () => (++n === 1
      ? new Promise(r => setTimeout(() => r({ data: vieja, error: null }), 30))
      : { data: FILAS, error: null })
    const a = S.mostrarSeguridad()
    const b = S.mostrarSeguridad()
    await Promise.all([a, b])
    await esperar()
    const h = html(S, 'ad-seguridad-lista')
    chk('la respuesta vieja no pisa la nueva', !h.includes('VIEJA') && (h.match(/data-seguridad=/g) || []).length === 2)
  }
  // La portada la ofrece y la abre.
  {
    const S = nuevo()
    const h = S.htmlSeccion(S.SECCIONES.find(s => s.id === 'seguridad'), null)
    chk('la portada la ofrece con su explicación', /data-seccion="seguridad"/.test(h) && /Quién cerró las sesiones de quién/.test(h))
    S.abrirSeccion('seguridad')
    await esperar()
    chk('tocarla abre Seguridad', S.estado.vista === 'ad-vista-seguridad')
  }
}

pruebas().then(fin, (err) => { chk('sin excepción', false, String(err && err.stack || err)); fin() })
