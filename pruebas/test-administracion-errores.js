// ADMINISTRACIÓN — Errores de la app, EN CASTELLANO (30/09/2026; la sección
// nació el 27/09/2026), solo super_admin.
//
// Pedido de Facu: la sección mostraba 99+ "errores" que no lo son (el tiempo
// real reconectándose, las medidas de pantalla, cortes de internet) y en
// lenguaje técnico. Ahora sale de errores_resumen(p_dias, p_incluir_info):
//  - una tarjeta por TIPO: título, explicación y "qué hacer" en castellano,
//    cuántas veces, la primera y la última, en qué pantallas y a quién;
//  - por gravedad: error (bordó), aviso (amarillo), info (gris); por defecto
//    SIN lo informativo, con un tilde "Mostrar también lo informativo";
//  - "Marcar como arreglado" con nota obligatoria → marcar_errores_arreglados;
//  - el mensaje original solo en "Ver detalle", plegado;
//  - la burbuja y la portada cuentan solo errores y avisos sin arreglar;
//  - solo super_admin.
// Se EJECUTAN las funciones reales del módulo.
//
//   node pruebas/test-administracion-errores.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))

// Lo que devuelve errores_resumen: ya ordenado por gravedad (la base).
const GRUPOS = [
  { clave: 'x is not defined', titulo: 'Error sin explicación todavía', explicacion: 'Todavía no está explicado: pasáselo al chat de arquitectura con el detalle.', que_hacer: null,
    gravedad: 'error', rango: 1, veces: 3, primera: '2026-09-28T12:00:00Z', ultima: '2026-09-30T13:05:00Z', pantallas: ['administracion'], personas: ['Facundo Usabarrena'], ejemplo: 'x is not defined · at f (administracion.html:12)' },
  { clave: 'Tiempo real: CHANNEL_ERROR%', titulo: 'La conexión en vivo no pudo arrancar', explicacion: 'La tablet no pudo conectarse para ver los cambios en vivo.', que_hacer: 'Si pasa seguido, revisá el wifi de la planta.',
    gravedad: 'aviso', rango: 2, veces: 2, primera: '2026-09-29T09:00:00Z', ultima: '2026-09-30T10:00:00Z', pantallas: ['produccion'], personas: ['Tablet Producción · Cucuruchos Nuss'], ejemplo: 'Tiempo real: CHANNEL_ERROR (no se pudo reconectar en 2 minutos)' },
]
const INFO = { clave: '%px × %px%', titulo: 'Medidas de la pantalla', explicacion: 'Se anota una vez por sesión.', que_hacer: null, gravedad: 'info', rango: 3, veces: 40,
  primera: '2026-09-24T09:00:00Z', ultima: '2026-09-30T10:00:00Z', pantallas: ['produccion', 'dashboard', 'gastos', 'caja', 'stock'], personas: [], ejemplo: 'pantalla 1000px × 540px' }

function nuevo({ rol = 'super_admin', grupos = GRUPOS, rpc = null } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.__setRpc(rpc ?? (async (n, p) => {
    if (n === 'errores_resumen') return { data: rol === 'super_admin' ? copia(p.p_incluir_info ? [...grupos, INFO] : grupos) : null, error: null }
    if (n === 'marcar_errores_arreglados') return { data: 3, error: null }
    return { data: null, error: null }
  }))
  return S
}
const html = (S) => S.__els.get('ad-errores-lista')?.innerHTML ?? ''
const llamadas = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)

async function pruebas() {
  // ── Solo super_admin ───────────────────────────────────────────────────────
  {
    const S = nuevo()
    chk('la sección es solo para super_admin', S.seccionesVisibles().some(s => s.id === 'errores'))
    S.estado.miRolApp = 'usuario'
    chk('un usuario común no la ve', !S.seccionesVisibles().some(s => s.id === 'errores'))
    await S.mostrarErrores()
    chk('y si la abre, vuelve a la portada sin preguntar nada', S.estado.vista !== 'ad-vista-errores' && !llamadas(S, 'errores_resumen').length)
  }

  // ── La lista: por tipo, en castellano, sin lo informativo ───────────────────
  {
    const S = nuevo()
    await S.mostrarErrores()
    const r = llamadas(S, 'errores_resumen')
    chk('errores_resumen de 7 días, SIN lo informativo por defecto', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_dias: 7, p_incluir_info: false }), JSON.stringify(r))
    const h = html(S)
    chk('una tarjeta por TIPO (2), no por cada vez', (h.match(/data-error-tipo=/g) ?? []).length === 2)
    chk('el título y la explicación en castellano', /La conexión en vivo no pudo arrancar/.test(h) && /La tablet no pudo conectarse para ver los cambios en vivo\./.test(h))
    chk('"Qué hacer" cuando lo hay', /<strong>Qué hacer:<\/strong> Si pasa seguido, revisá el wifi de la planta\./.test(h))
    chk('cuántas veces, la primera y la última (hora de Argentina)', /3 veces · primera 28\/09\/2026, 09:00 · última 30\/09\/2026, 10:05/.test(h), h.slice(0, 700))
    chk('singular: "2 veces" / "1 vez"', /2 veces/.test(h) && S.htmlTipoError({ ...GRUPOS[0], veces: 1 }).includes('1 vez ·'))
    chk('en qué pantallas y a quién', /En: administracion · A: Facundo Usabarrena/.test(h) && /En: produccion · A: Tablet Producción · Cucuruchos Nuss/.test(h))
    chk('sin personas dice "—"', S.htmlTipoError(INFO).includes('A: —'))
    chk('más de 4 pantallas: "y N más"', S.htmlTipoError(INFO).includes('En: produccion, dashboard, gastos, caja y 1 más'))
    chk('el mensaje original solo en "Ver detalle", plegado', /<details><summary>Ver detalle<\/summary><p class="ad-error-app__detalle">x is not defined · at f/.test(h) &&
      h.indexOf('x is not defined · at f') > h.indexOf('<details>'))
    chk('el error en bordó, el aviso en amarillo', /class="ad-tarjeta ad-error-app ad-error-app--error" data-error-tipo="x is not defined"/.test(h) && /ad-error-app--aviso" data-error-tipo="Tiempo real: CHANNEL_ERROR%"/.test(h))
    chk('los rótulos: Error y Aviso', /ad-error-app__grav">Error</.test(h) && /ad-error-app__grav">Aviso</.test(h))
    chk('el orden de la base se respeta (el error primero)', h.indexOf('ad-error-app--error') < h.indexOf('ad-error-app--aviso'))
    chk('la cuenta: tipos y veces', S.__els.get('ad-errores-cuenta').textContent === '2 tipos · 5 veces en 7 días', S.__els.get('ad-errores-cuenta').textContent)
    chk('no se lee más errores_app directo', !/from\('errores_app'\)/.test(src))
  }
  {
    // "Mostrar también lo informativo".
    const S = nuevo()
    await S.mostrarErrores()
    S.cambiarInfoErrores(true)
    await esperar()
    const r = llamadas(S, 'errores_resumen')
    chk('el tilde vuelve a pedir CON lo informativo', r.length === 2 && r[1][1].p_incluir_info === true)
    chk('lo informativo en gris, al final', /ad-error-app--info" data-error-tipo="%px × %px%"/.test(html(S)) && /ad-error-app__grav">Informativo</.test(html(S)) &&
      html(S).indexOf('ad-error-app--info') > html(S).indexOf('ad-error-app--aviso'))
    chk('el tilde queda marcado', S.__els.get('ad-errores-info').checked === true)
    chk('el cambio del tilde llama a cambiarInfoErrores', /getElementById\('ad-errores-info'\)\.addEventListener\('change', \(e\) => cambiarInfoErrores\(e\.target\.checked\)\)/.test(src))
  }
  {
    // Nada sin arreglar.
    const S = nuevo({ grupos: [] })
    await S.mostrarErrores()
    chk('sin nada, lo dice en palabras', /No hay errores ni avisos sin arreglar en los últimos 7 días\./.test(html(S)) && S.__els.get('ad-errores-cuenta').textContent === '')
  }
  {
    // Falla o null: se dice, nunca "no hay errores".
    const S = nuevo({ rpc: async () => ({ data: null, error: { message: 'x' } }) })
    await S.mostrarErrores()
    chk('si la base falla, lo dice', /No se pudieron leer los errores de la app/.test(html(S)) && !/No hay errores/.test(html(S)))
    const S2 = nuevo({ rpc: async () => ({ data: null, error: null }) })
    await S2.mostrarErrores()
    chk('null (no es super_admin para la base) no se lee como "no hay errores"', /No se pudieron leer los errores de la app/.test(html(S2)))
  }

  // ── Marcar como arreglado ──────────────────────────────────────────────────
  {
    const S = nuevo()
    await S.mostrarErrores()
    chk('cada tarjeta tiene "Marcar como arreglado"', (html(S).match(/data-error-arreglar=/g) ?? []).length === 2)
    S.abrirArreglarError('x is not defined')
    const h = html(S)
    chk('abre la nota en ESA tarjeta (y en ninguna otra)', (h.match(/id="ad-errores-nota"/g) ?? []).length === 1 && h.indexOf('id="ad-errores-nota"') > h.indexOf('data-error-tipo="x is not defined"') && h.indexOf('id="ad-errores-nota"') < h.indexOf('data-error-tipo="Tiempo real'))
    await S.confirmarArreglarError()
    chk('sin nota no se manda nada y se dice', !llamadas(S, 'marcar_errores_arreglados').length && /Escribí qué se hizo\./.test(html(S)))
    S.estado.errores.arreglando.nota = '  arreglado en e5ddb89  '
    S.__llamadas.rpc.length = 0
    await S.confirmarArreglarError()
    await esperar()
    const m = llamadas(S, 'marcar_errores_arreglados')
    chk('marca con la clave y la nota (sin espacios de los bordes)', m.length === 1 && JSON.stringify(m[0][1]) === JSON.stringify({ p_clave: 'x is not defined', p_nota: 'arreglado en e5ddb89' }), JSON.stringify(m))
    chk('avisa cuántos registros y que si vuelve aparece', S.__llamadas.exitos.some(t => /Marcado como arreglado \(3 registros\)\. Si vuelve a pasar, aparece de nuevo\./.test(t)))
    chk('y vuelve a leer la lista', llamadas(S, 'errores_resumen').length === 1 && S.estado.errores.arreglando === null)
    chk('el clic y la nota se escuchan', /if \(\(b = e\.target\.closest\('\[data-error-arreglar\]'\)\)\) abrirArreglarError\(b\.dataset\.errorArreglar\)/.test(src) &&
      /else if \(e\.target\.closest\('#ad-errores-si'\)\) confirmarArreglarError\(\)/.test(src) &&
      /if \(e\.target\.id === 'ad-errores-nota' && estado\.errores\.arreglando\) estado\.errores\.arreglando\.nota = e\.target\.value/.test(src))
  }
  {
    // El error de la base, tal cual; un doble toque manda una vez.
    const pendientes = []
    const S = nuevo({ rpc: async (n, p) => {
      if (n === 'errores_resumen') return { data: copia(GRUPOS), error: null }
      if (n === 'marcar_errores_arreglados') return new Promise(r => pendientes.push(() => r({ data: null, error: { message: 'Contá qué se hizo (por ejemplo: "arreglado en e5ddb89").' } })))
      return { data: null, error: null }
    } })
    await S.mostrarErrores()
    S.abrirArreglarError('x is not defined')
    S.estado.errores.arreglando.nota = 'ok'
    const p1 = S.confirmarArreglarError()
    await esperar()
    chk('mientras guarda, el botón se traba', /id="ad-errores-si" disabled/.test(html(S)))
    const p2 = S.confirmarArreglarError()
    await esperar()
    chk('un doble toque manda una sola vez', llamadas(S, 'marcar_errores_arreglados').length === 1)
    for (const f of pendientes) f()
    await Promise.all([p1, p2])
    chk('el error de la base va tal cual, pegado', /Contá qué se hizo \(por ejemplo: &quot;arreglado en e5ddb89&quot;\)\./.test(html(S)) && /class="ad-error-pegado"/.test(html(S)))
    chk('la nota escrita se conserva', /<textarea[^>]*>ok<\/textarea>/.test(html(S)))
    S.cancelarArreglarError()
    chk('Cancelar cierra la nota', !/id="ad-errores-nota"/.test(html(S)) && S.estado.errores.arreglando === null)
  }

  // ── La burbuja y la portada: solo errores y avisos sin arreglar ─────────────
  {
    const S = nuevo()
    const n = await S.contarErrores()
    const r = llamadas(S, 'errores_resumen')
    chk('cuenta con errores_resumen SIN lo informativo', r.length === 1 && r[0][1].p_incluir_info === false)
    chk('suma las veces de errores y avisos (3 + 2)', n === 5, String(n))
    const S2 = nuevo({ rpc: async () => ({ data: [...copia(GRUPOS), INFO], error: null }) })
    chk('aunque viniera lo informativo, no se cuenta', (await S2.contarErrores()) === 5)
    chk('la portada cuenta con contarErrores (no errores_app)', /contarErrores\(\)\.then\(n => \{ p\.errores7 = n \}\)/.test(src))
    const S3 = nuevo({ rpc: async () => ({ data: null, error: { message: 'x' } }) })
    let tiro = false
    try { await S3.contarErrores() } catch { tiro = true }
    chk('si falla, tira (la portada dice "No se pudo contar", nunca 0)', tiro)
  }

  // ── XSS ────────────────────────────────────────────────────────────────────
  {
    const g = { clave: marca('clave'), titulo: marca('titulo'), explicacion: marca('explicacion'), que_hacer: marca('que'), gravedad: marca('grav'), veces: 1,
      primera: '2026-09-30T10:00:00Z', ultima: '2026-09-30T10:00:00Z', pantallas: [marca('pantalla')], personas: [marca('persona')], ejemplo: marca('ejemplo') }
    const S = nuevo({ grupos: [g] })
    await S.mostrarErrores()
    chequearMarcas(chk, 'la tarjeta de un tipo', html(S), ['clave', 'titulo', 'explicacion', 'que', 'pantalla', 'persona', 'ejemplo'])
    S.abrirArreglarError(g.clave)
    S.estado.errores.arreglando.nota = marca('nota')
    S.estado.errores.arreglando.error = marca('error')
    S.pintarErrores()
    chequearMarcas(chk, 'la nota y el error', html(S), ['nota', 'error'])
    chk('una gravedad desconocida se trata como error (no inventa una clase)', /ad-error-app--error"/.test(html(S)))
  }
}

pruebas().then(() => fin()).catch(e => { chk('las pruebas corren sin excepción', false, e.stack); fin() })
