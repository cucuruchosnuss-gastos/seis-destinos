// ADMINISTRACIÓN — el diseño "Administración" (29/09/2026, e2e/disenos/administracion).
//
// Lo que se EJECUTA: las pestañas del encabezado (solo las secciones que la
// persona ve, Inicio siempre, la actual marcada, la burbuja bordó si es
// urgente y gris si no, nada con 0 o sin dato), la portada en el orden del
// diseño, cada tarjeta con su número y sus renglones (un dato ausente es "—",
// nunca "$ 0"; cargando son barras; si falla lo dice sin inventar un 0), la
// cartera resumida con la regla del plazo de presentación, y todo texto de la
// base escapado. Y en el fuente: ?seccion=<cualquier sección visible> abre esa
// sección (Clientes desde Cuentas corrientes, Seguridad desde la barra lateral).
//
//   node pruebas/test-administracion-diseno.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)) }
const MAL = '"><img src=x onerror=alert(1)>'

function nuevo({ rol = 'usuario', tareas } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  if (tareas) S.estado.misTareas = new Map(tareas)
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  // ── Las pestañas ──────────────────────────────────────────────────────
  {
    const S = nuevo()
    S.estado.vista = 'ad-vista-inicio'
    S.pintarPestanas()
    const h = html(S, 'ad-pestanas')
    const ids = [...h.matchAll(/data-pestana="([^"]+)"/g)].map(m => m[1])
    chk('Inicio siempre y solo las secciones que ve, en el orden del diseño', ids.join(',') === 'inicio,ordenes,revisar,clientes,listas,importar', ids.join(','))
    chk('la actual va marcada (aria-current)', /data-pestana="inicio" aria-current="page"/.test(h) && (h.match(/aria-current/g) || []).length === 1)
    chk('sin datos no hay ninguna burbuja', !/ad-pestana__burbuja/.test(h))
    S.estado.vista = 'ad-vista-orden'
    S.pintarPestanas()
    chk('una orden abierta marca Órdenes', /data-pestana="ordenes" aria-current="page"/.test(html(S, 'ad-pestanas')))
    S.estado.vista = 'ad-vista-ficha'
    S.pintarPestanas()
    chk('la ficha de un cliente marca Clientes', /data-pestana="clientes" aria-current="page"/.test(html(S, 'ad-pestanas')))
  }
  {
    const S = nuevo({ rol: 'super_admin' })
    S.estado.vista = 'ad-vista-cobranza'
    S.estado.portada = { porAsentar: 5, sinValorizar: 4, porRevisar: 2, cheques: { cantidad: 12 }, errores7: 0 }
    S.pintarPestanas()
    const h = html(S, 'ad-pestanas')
    const ids = [...h.matchAll(/data-pestana="([^"]+)"/g)].map(m => m[1])
    chk('un super_admin ve las diez, en el orden del diseño', ids.join(',') === 'inicio,cobranzas,ordenes,revisar,clientes,listas,importar,cheques,seguridad,errores', ids.join(','))
    chk('una cobranza abierta marca Cobranzas', /data-pestana="cobranzas" aria-current="page"/.test(h))
    chk('cobranzas y órdenes: burbuja bordó (urgente)', /data-pestana="cobranzas"[^>]*>Cobranzas<span class="ad-pestana__burbuja ad-pestana__burbuja--urgente">5</.test(h) &&
      /data-pestana="ordenes"[^>]*>Órdenes<span class="ad-pestana__burbuja ad-pestana__burbuja--urgente">4</.test(h))
    chk('por revisar y cheques: burbuja gris', /data-pestana="revisar"[^>]*>Por revisar<span class="ad-pestana__burbuja">2</.test(h) && /data-pestana="cheques"[^>]*>Cheques<span class="ad-pestana__burbuja">12</.test(h))
    chk('con 0 no hay burbuja', !/data-pestana="errores"[^>]*>Errores<span/.test(h))
    chk('más de 99 dice 99+', S.burbujaPestana('cobranzas', { porAsentar: 150 }).n === '99+')
  }
  {
    const S = nuevo()
    S.estado.misTareas = new Map()
    S.estado.vista = 'ad-vista-inicio'
    S.pintarPestanas()
    chk('sin ninguna sección no hay pestañas', html(S, 'ad-pestanas') === '')
  }
  {
    const S = nuevo({ rol: 'super_admin' })
    S.estado.vista = 'ad-vista-inicio'
    S.__els.get('ad-pestanas') || S.__doc.getElementById('ad-pestanas')
    S.mostrarVista('ad-vista-clientes')
    chk('mostrarVista pinta las pestañas', /data-pestana="clientes" aria-current="page"/.test(html(S, 'ad-pestanas')))
  }
  chk('tocar una pestaña: Inicio vuelve a la portada y las otras abren su sección',
    /closest\('button\[data-pestana\]'\)[\s\S]{0,120}if \(b\.dataset\.pestana === 'inicio'\) mostrarInicio\(\)\s*else abrirSeccion\(b\.dataset\.pestana\)/.test(src))

  // ── La portada ────────────────────────────────────────────────────────
  {
    const S = nuevo({ rol: 'super_admin' })
    const orden = S.enOrdenDePestanas(S.SECCIONES).map(s => s.id).join(',')
    chk('la portada va en el orden del diseño', orden === 'cobranzas,ordenes,revisar,clientes,listas,importar,cheques,seguridad,errores', orden)
  }
  {
    const S = nuevo({ rol: 'super_admin' })
    S.__setRpc(async (n) => {
      if (n === 'cobranzas_por_asentar') return { data: [
        { cobranza_id: 'c1', fecha: '2026-09-27', cliente_escrito: 'Caserato', cargada_por: 'Ramón ' + MAL, total: 486000 },
        { cobranza_id: 'c2', fecha: '2026-09-26', cliente_escrito: 'katy', cargada_por: 'Marcelo', total: 154000 },
      ], error: null }
      if (n === 'retiros_por_revisar') return { data: [{ item_id: 'i1', cliente: 'Los Forte ' + MAL, que: 'Mini', faltante: 14, unidad: 'cajas' }], error: null }
      if (n === 'clientes_con_saldo') return { data: [{ cliente_id: 'k1', saldo: 4120000 }, { cliente_id: 'k2', saldo: -50 }, { cliente_id: 'k3', saldo: null }], error: null }
      return { data: [], error: null }
    })
    S.__tablas.listas_precios = [{ id: 'l1', nombre: 'Heladerías ' + MAL, activa: true, unidad_negocio_id: 'u-n' }]
    S.__tablas.cobranza_cheques = [
      { importe: 180000, tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-15' },
      { importe: 120000, tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null },
    ]
    S.__tablas.registro_seguridad = [{ id: 'r1' }, { id: 'r2' }]
    S.__tablas.errores_app = [{ id: 'e1' }]
    S.__tablas.ordenes_retiro = [{ id: 'o1' }]
    S.estado.empresas[0].nombre = 'Nuss ' + MAL
    await S.mostrarInicio()
    await esperar()
    const h = html(S, 'ad-secciones')
    const tarjeta = id => (h.match(new RegExp(`<button[^>]*data-seccion="${id}"[\\s\\S]*?</button>`)) || [''])[0]
    chk('ningún texto de la base entra crudo', !h.includes('<img src=x'))
    const orden = [...h.matchAll(/data-seccion="([^"]+)"/g)].map(m => m[1]).join(',')
    chk('la portada dibuja las tarjetas en el orden del diseño', orden === 'cobranzas,ordenes,revisar,clientes,listas,importar,cheques,seguridad,errores', orden)
    chk('cobranzas: el número grande en bordó, el total que cargaron y la más vieja', /numero--atencion">2</.test(tarjeta('cobranzas')) &&
      /\$ 640\.000 que cargaron los choferes/.test(tarjeta('cobranzas')) && /La más vieja: 26\/09\/2026 · Marcelo/.test(tarjeta('cobranzas')) && /Ir a asentar ›/.test(tarjeta('cobranzas')))
    chk('revisar: qué se llevó cada uno, escapado', /Los Forte &quot;&gt;&lt;img/.test(tarjeta('revisar')) && /14 cajas de Mini/.test(tarjeta('revisar')))
    chk('clientes: los activos grandes y lo que nos deben (sin contar los saldos a favor)', /ad-seccion__numero">3</.test(tarjeta('clientes')) && /Nos deben \$ 4\.120\.000 en total/.test(tarjeta('clientes')))
    chk('clientes: el nombre de la empresa, escapado', /activos en Nuss &quot;&gt;&lt;img/.test(tarjeta('clientes')))
    chk('listas: cuántas y cuáles, escapadas', /ad-seccion__numero">1</.test(tarjeta('listas')) && /Heladerías &quot;&gt;/.test(tarjeta('listas')))
    chk('cheques: cuántos, cuánto y el plazo promedio ponderado', /ad-seccion__numero">2</.test(tarjeta('cheques')) && /\$ 300\.000 · plazo promedio \d+ días/.test(tarjeta('cheques')))
    chk('seguridad: los cierres de 7 días', /ad-seccion__numero">2</.test(tarjeta('seguridad')) && /cierres de sesiones en 7 días/.test(tarjeta('seguridad')))
    chk('errores: los de 7 días, en bordó, y la marca super_admin', /numero--atencion">1</.test(tarjeta('errores')) && /ad-seccion__chip">super_admin</.test(tarjeta('errores')))
    chk('importar: un guion, no un número', /numero--suave">—</.test(tarjeta('importar')) && /nada pendiente/.test(tarjeta('importar')))
    const s7 = S.__llamadas.consultas.find(c => c[0] === 'registro_seguridad')
    chk('los cierres se cuentan desde hace 7 días', !!s7 && s7[1].some(f => f[0] === 'gte' && f[1] === 'hecho_en'))
    const ch = S.__llamadas.consultas.find(c => c[0] === 'cobranza_cheques')
    chk('la cartera: solo los en cartera', !!ch && ch[1].some(f => f[0] === 'eq' && f[1] === 'estado' && f[2] === 'en_cartera'))
  }
  {
    // Un usuario sin las secciones globales no consulta cheques, seguridad ni errores.
    const S = nuevo()
    await S.mostrarInicio()
    await esperar()
    chk('sin permiso no consulta lo que no puede ver', !S.__llamadas.consultas.some(c => ['cobranza_cheques', 'registro_seguridad', 'errores_app'].includes(c[0])))
  }
  {
    const S = nuevo({ rol: 'super_admin' })
    S.__tablas.cobranza_cheques = () => ({ data: null, error: { message: 'sin red' } })
    S.__tablas.errores_app = () => ({ data: null, error: { message: 'sin red' } })
    await S.mostrarInicio()
    await esperar()
    const h = html(S, 'ad-secciones')
    const t = (h.match(/<button[^>]*data-seccion="cheques"[\s\S]*?<\/button>/) || [''])[0]
    chk('si una tarjeta falla lo dice, con "—" y nunca un 0', /numero">—</.test(t) && /No se pudo contar/.test(t) && /El resto anda bien/.test(t))
    chk('las demás siguen', /data-seccion="seguridad"[\s\S]*?ad-seccion__numero">0</.test(h))
  }
  {
    const S = nuevo({ rol: 'super_admin' })
    const h = S.htmlSeccion(S.SECCIONES.find(s => s.id === 'cheques'), {})
    chk('mientras carga: barras grises y "Contando…"', /ad-seccion__barras/.test(h) && /Contando…/.test(h) && !/ad-seccion__numero/.test(h))
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  {
    const S = nuevo()
    chk('la plata de la portada: sin centavos, con punto de miles', S.plataPortada(1742000.4) === '$ 1.742.000')
    chk('un dato ausente es "—", nunca "$ 0"', S.plataPortada(null) === '—' && S.plataPortada(undefined) === '—' && S.plataPortada('') === '—' && S.plataPortada('x') === '—')
    chk('un cero de verdad es $ 0', S.plataPortada(0) === '$ 0')
    const r = S.resumenCheques([
      { importe: 100, tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-11' },
      { importe: 300, tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null },
      { importe: 100, tipo: 'diferido', fecha_emision: '2026-08-01', fecha_pago: '2026-09-01' },
      // Paga en 4 días: su plazo para depositar vence en 34, no esta semana.
      { importe: 0, tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-03' },
    ], '2026-09-29')
    chk('la cartera: cantidad y total', r.cantidad === 4 && r.total === 500)
    chk('plazo ponderado por importe (días hasta el pago; común y vencido, 0)', r.plazo === Math.round(12 * 100 / 500), String(r.plazo))
    chk('vencen esta semana: 30 días desde el pago o, si es común, desde la emisión, con los vencidos', r.vencen === 2, String(r.vencen))
    chk('sin cheques: plazo null (no un 0 inventado)', S.resumenCheques([], '2026-09-29').plazo === null)
  }

  // ── ?seccion= ─────────────────────────────────────────────────────────
  chk('?seccion=<una sección visible> la abre (Clientes, Seguridad…) y limpia la dirección',
    /else if \(pedida && seccionesVisibles\(\)\.some\(s => s\.id === pedida\)\) \{[\s\S]{0,400}history\.replaceState\(null, '', window\.location\.pathname\)\s*abrirSeccion\(pedida\)/.test(src))
  chk('una sección que no ve cae en la portada', /abrirSeccion\(pedida\)\s*\} else mostrarInicio\(\)/.test(src))
  chk('abriendo derecho una sección, igual se cuentan las burbujas de las pestañas', /\} else mostrarInicio\(\)\s*if \(estado\.vista !== 'ad-vista-inicio'\) contarPortada\(\)/.test(src))
  {
    const S = nuevo({ rol: 'super_admin' })
    S.__setRpc(async (n) => n === 'cobranzas_por_asentar' ? { data: [{ cobranza_id: 'c1', total: 1 }], error: null } : { data: [], error: null })
    S.mostrarVista('ad-vista-seguridad')
    await S.contarPortada()
    await esperar()
    chk('contarPortada no cambia de vista y pinta la burbuja', S.estado.vista === 'ad-vista-seguridad' && /data-pestana="cobranzas"[^>]*>Cobranzas<span class="ad-pestana__burbuja ad-pestana__burbuja--urgente">1</.test(html(S, 'ad-pestanas')))
  }
  chk('en la compu el "‹ Volver" al dashboard se esconde (la barra lateral lo reemplaza)', /@media \(min-width: 1024px\) \{\s*\.ad-header__volver \{ display: none; \}/.test(src))
  chk('los "‹ Portada" / "‹ Órdenes" de cada sección NO se esconden (vuelven a la vista de antes)', !/\.ad-cabecera-vista > \.ad-link:first-child \{ display: none/.test(src))
  chk('sin azules: el gris secundario es el cálido del sistema', /--ad-texto-secundario: var\(--color-texto-2\)/.test(src) && !/#4a5670/i.test(src.split('<!-- ══ CHEQUES: inicio')[0]))
}

pruebas().then(fin, (err) => { chk('sin excepción', false, String(err && err.stack || err)); fin() })
