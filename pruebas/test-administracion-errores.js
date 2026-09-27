// ADMINISTRACIÓN — Errores de la app (27/09/2026), solo super_admin.
//
// Lo que anota js/salud.js en errores_app desde todas las pantallas, filtrable
// por pantalla, dispositivo y tipo.
//
//   node pruebas/test-administracion-errores.js
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

const UA_TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X135 Build/UP1A) AppleWebKit/537.36 Chrome/140 Safari/537.36 · app instalada · 800x1280 · portrait-primary'
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 · navegador · 1440x900 · landscape-primary'
const FILAS = [
  { id: 'e1', empleado_id: 'emp-t', pantalla: 'produccion', mensaje: 'Al volver no se pudo revisar la sesión: Failed to fetch', detalle: 'visible', url: 'https://x/modulos/produccion.html', dispositivo: UA_TABLET, evento: 'reanudar', creado_en: '2026-09-27T12:00:00Z' },
  { id: 'e2', empleado_id: 'emp-1', pantalla: 'administracion', mensaje: 'x is not defined', detalle: 'at f', url: 'https://x/modulos/administracion.html', dispositivo: UA_PC, evento: 'error', creado_en: '2026-09-27T11:00:00Z' },
  { id: 'e3', empleado_id: null, pantalla: 'produccion', mensaje: 'registrar_masa: 42501 permission denied', detalle: null, url: null, dispositivo: UA_TABLET, evento: 'rpc', creado_en: '2026-09-27T10:00:00Z' },
]

function nuevo(rol = 'super_admin') {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.__tablas.errores_app = FILAS
  S.__tablas.v_empleados_publico = [{ id: 'emp-t', nombre: 'Tablet Producción · Cucuruchos Nuss' }, { id: 'emp-1', nombre: 'Facundo' }]
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  {
    const S = nuevo()
    chk('un super_admin ve la sección', S.seccionesVisibles().some(s => s.id === 'errores'))
    const U = nuevo('usuario')
    U.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }], ['cobranzas:procesar', null], ['cobranzas:ver_todo', null]])
    chk('nadie más la ve, tenga las tareas que tenga', !U.seccionesVisibles().some(s => s.id === 'errores'))
    await U.mostrarErrores()
    chk('y abrirla sin ser super_admin vuelve a la portada, sin leer nada', U.estado.vista === 'ad-vista-inicio' && !U.__llamadas.consultas.some(c => c[0] === 'errores_app'))
  }
  {
    const S = nuevo()
    await S.mostrarErrores()
    await esperar()
    const q = S.__llamadas.consultas.find(c => c[0] === 'errores_app')
    chk('lee errores_app, los más nuevos primero', !!q && q[1].some(f => f[0] === 'order' && f[1] === 'creado_en'))
    const h = html(S, 'ad-errores-lista')
    chk('una tarjeta por error', (h.match(/data-error-app=/g) || []).length === 3)
    chk('el tipo en palabras', /Al volver de estar bloqueada/.test(h) && /Falló una consulta/.test(h))
    chk('quién (por v_empleados_publico) y "Sin sesión" si no había', /Tablet Producción · Cucuruchos Nuss/.test(h) && /Sin sesión/.test(h))
    chk('la hora en Argentina', /27\/09\/2026,? 09:00/.test(h), (h.match(/\d\d\/\d\d\/\d{4},? \d\d:\d\d/) || [])[0])
    chk('el dispositivo en corto', /SM-X135 · Android 14 · app instalada/.test(h) && /Windows · navegador/.test(h))
    chk('el detalle, plegado', /<details><summary>Detalle<\/summary>/.test(h))
    chk('la cuenta', S.__els.get('ad-errores-cuenta').textContent === '3 de 3')
    chk('el filtro de pantallas trae las que hay', /<option value="produccion">produccion<\/option>/.test(html(S, 'ad-errores-pantalla')) && /Todas las pantallas/.test(html(S, 'ad-errores-pantalla')))
    chk('el filtro de dispositivos, en corto', /<option value="SM-X135 · Android 14 · app instalada">/.test(html(S, 'ad-errores-dispositivo')))
    chk('el filtro de tipos, en palabras', /<option value="reanudar">Al volver de estar bloqueada<\/option>/.test(html(S, 'ad-errores-evento')))
    S.estado.errores.pantalla = 'produccion'
    S.pintarErrores()
    chk('filtrar por pantalla', (html(S, 'ad-errores-lista').match(/data-error-app=/g) || []).length === 2 && S.__els.get('ad-errores-cuenta').textContent === '2 de 3')
    S.estado.errores.dispositivo = 'Windows · navegador'
    S.pintarErrores()
    chk('y por dispositivo (se combinan)', /No hay errores con esos filtros/.test(html(S, 'ad-errores-lista')))
    S.estado.errores = { ...S.estado.errores, pantalla: '', dispositivo: '', evento: 'rpc' }
    S.pintarErrores()
    chk('y por tipo', (html(S, 'ad-errores-lista').match(/data-error-app=/g) || []).length === 1)
  }
  {
    const S = nuevo()
    S.__tablas.errores_app = () => ({ data: null, error: { message: 'x' } })
    await S.mostrarErrores()
    await esperar()
    chk('si no se puede leer, se dice en bordó', /ad-aviso--grave">No se pudieron leer los errores de la app/.test(html(S, 'ad-errores-lista')))
  }
  {
    const S = nuevo()
    chk('etiqueta: iPhone', S.etiquetaDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) · navegador · 390x844 · portrait-primary') === 'iPhone · navegador')
    chk('etiqueta: sin datos', S.etiquetaDispositivo(null) === 'Sin datos')
    S.estado.nombres = new Map([['emp-x', marca('quien')]])
    const mala = { id: marca('id'), empleado_id: 'emp-x', pantalla: marca('pantalla'), mensaje: marca('mensaje'), detalle: marca('detalle'), url: marca('url'), dispositivo: marca('disp'), evento: marca('evento'), creado_en: '2026-09-27T12:00:00Z' }
    chequearMarcas(chk, 'fila de error', S.htmlFilaError(mala), ['id', 'quien', 'pantalla', 'mensaje', 'detalle', 'url', 'disp', 'evento'])
    S.estado.errores = { filas: [mala], error: null, pantalla: '', dispositivo: '', evento: '' }
    S.pintarErrores()
    chequearMarcas(chk, 'filtros', html(S, 'ad-errores-pantalla') + html(S, 'ad-errores-evento'), ['pantalla', 'evento'])
  }
}

pruebas().then(fin).catch(e => { console.log('EXCEPCIÓN:', e && e.stack || e); console.log('ROJO'); process.exit(1) })
