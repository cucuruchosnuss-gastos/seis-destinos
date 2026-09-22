// Parte 6 del módulo Cheques (22/09/2026): el vencimiento del plazo para
// depositar, que se tiene que ver DE UN VISTAZO, sin leer.
//
// La regla vive en la base como public.cheque_plazo_presentacion(tipo,
// emision, pago) = (case when tipo = 'diferido' then pago else emision end) + 30.
// La pantalla la replica en plazoPresentacion(); acá se comparan las dos con
// los casos medidos contra la base el 22/09/2026. El conector de solo lectura
// no tiene EXECUTE sobre la función (permission denied), así que se ejecutó
// su CUERPO tal cual (leído con pg_get_functiondef ese día) sobre los mismos
// casos: es el mismo cálculo de fechas de Postgres.
//
//   node pruebas/test-cheques-plazo.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cheques.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const regla = (sel) => { const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(CSS); return m ? m[1] : '' }

const S = construirCheques(ARCHIVO)
const hoy = '2026-09-22'
const mas = (d, base = hoy) => { const x = new Date(base + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10) }

// ── La misma regla que la base ───────────────────────────────────────────
// [tipo, emisión, pago, lo que devolvió Postgres]
const DE_LA_BASE = [
  ['diferido', '2026-09-01', '2026-12-31', '2027-01-30'],
  ['comun', '2026-01-31', null, '2026-03-02'],
  ['comun', '2028-02-15', null, '2028-03-16'],
  ['diferido', '2026-09-01', '2027-02-10', '2027-03-12'],
  ['diferido', '2026-08-20', '2026-09-22', '2026-10-22'],
  ['comun', '2026-09-22', null, '2026-10-22'],
  ['diferido', '2026-09-01', null, null],
  ['comun', '2026-09-01', '2026-10-15', '2026-10-01'],
  ['diferido', '2027-12-15', '2028-02-29', '2028-03-30'],
]
for (const [tipo, e, p, esperado] of DE_LA_BASE) {
  const r = S.plazoPresentacion({ tipo, fecha_emision: e, fecha_pago: p })
  chk(`plazo = cheque_plazo_presentacion('${tipo}', ${e}, ${p}) → ${esperado}`, r === esperado, r)
}
chk('el plazo son 30 días', S.DIAS_PLAZO_PRESENTACION === 30)

// ── 7 días sí, 8 no; vencido; común usa la emisión ───────────────────────
{
  const dif = (pago) => ({ estado: 'en_cartera', tipo: 'diferido', fecha_emision: '2026-01-01', fecha_pago: pago })
  // plazo = pago + 30 → para que el plazo quede a N días de hoy, pago = hoy + N - 30
  const aDias = (n) => dif(mas(n - 30))
  chk('a 8 días del plazo NO se marca', S.estadoVencimiento(aDias(8), hoy) === null)
  const siete = S.estadoVencimiento(aDias(7), hoy)
  chk('a 7 días SÍ (por vencer)', siete?.nivel === 'por_vencer' && siete.dias === 7, JSON.stringify(siete))
  chk('el mismo día del plazo sigue por vencer (quedan 0)', S.estadoVencimiento(aDias(0), hoy)?.nivel === 'por_vencer')
  const venc = S.estadoVencimiento(aDias(-1), hoy)
  chk('un día después del plazo: vencido (la marca fuerte)', venc?.nivel === 'vencido', JSON.stringify(venc))
  // Un común: la emisión manda aunque traiga una fecha de pago.
  const comun = { estado: 'en_cartera', tipo: 'comun', fecha_emision: mas(-25), fecha_pago: mas(60) }
  chk('un común usa la EMISIÓN (emitido hace 25 días → vence en 5)', S.estadoVencimiento(comun, hoy)?.dias === 5,
    JSON.stringify(S.estadoVencimiento(comun, hoy)))
  const difLejos = { estado: 'en_cartera', tipo: 'diferido', fecha_emision: mas(-25), fecha_pago: mas(60) }
  chk('el mismo cheque DIFERIDO usa el pago (vence en 90: no se marca)', S.estadoVencimiento(difLejos, hoy) === null)
  chk('uno que ya salió no se marca', S.estadoVencimiento({ ...aDias(3), estado: 'depositado' }, hoy) === null)
  chk('uno anulado no se marca', S.estadoVencimiento({ ...aDias(3), estado: 'anulado' }, hoy) === null)
  chk('un diferido sin fecha de pago no se marca (la base da null)', S.estadoVencimiento(dif(null), hoy) === null)
  chk('el 7 es el mismo de la burbuja (mis_pendientes: <= hoy + 7)', S.DIAS_AVISO_VENCIMIENTO === 7)

  chk('texto: "Vence el 22/10 · quedan 5 días"', S.textoVencimiento({ nivel: 'por_vencer', plazo: '2026-10-22', dias: 5 }) === 'Vence el 22/10 · quedan 5 días')
  chk('texto: singular', S.textoVencimiento({ nivel: 'por_vencer', plazo: '2026-10-22', dias: 1 }) === 'Vence el 22/10 · queda 1 día')
  chk('texto: el día del plazo', S.textoVencimiento({ nivel: 'por_vencer', plazo: '2026-10-22', dias: 0 }) === 'Vence hoy, 22/10')
  chk('texto: "Plazo vencido el 22/10"', S.textoVencimiento({ nivel: 'vencido', plazo: '2026-10-22', dias: -3 }) === 'Plazo vencido el 22/10')
}

// ── La fila y la tarjeta ─────────────────────────────────────────────────
{
  const S2 = construirCheques(ARCHIVO)
  const h = S2.hoyArgentina()
  const m = (d) => mas(d, h)
  const cobs = new Map([['c', { id: 'c', cliente: 'A', estado: 'procesada', fecha: m(-60) }]])
  const base = { cobranza_id: 'c', banco_codigo: '007', importe: 100, estado: 'en_cartera', tipo: 'diferido', fecha_emision: m(-60) }
  const filas = [
    { ...base, id: 'v5', numero: '1', fecha_pago: m(5 - 30) },
    { ...base, id: 'vx', numero: '2', fecha_pago: m(-2 - 30) },
    { ...base, id: 'lejos', numero: '3', fecha_pago: m(20 - 30) },
  ]
  const tabla = S2.htmlTablaCheques(filas, cobs)
  const tr = (id) => { const i = tabla.indexOf(`data-cheque-fila="${id}"`); return tabla.slice(tabla.lastIndexOf('<tr', i), tabla.indexOf('</tr>', i)) }
  chk('tabla: por vencer → la fila entera marcada', /class="chq-tabla__fila--vence"/.test(tr('v5')), tr('v5').slice(0, 80))
  chk('tabla: vencido → la marca fuerte', /class="chq-tabla__fila--vencido"/.test(tr('vx')))
  chk('tabla: lejos del plazo → sin marca', !/--venc/.test(tr('lejos')))
  chk('tabla: la fecha de pago en bordó y negrita (su propia clase)', /<span class="chq-vence__fecha">/.test(tr('v5')))
  const [, mm, dd] = [null, ...m(5).split('-').slice(1)]
  chk('tabla: la etiqueta "Vence el dd/mm · quedan 5 días"', tr('v5').includes(`Vence el ${m(5).slice(8)}/${m(5).slice(5, 7)} · quedan 5 días`), tr('v5'))
  chk('tabla: vencido dice "Plazo vencido el …"', /Plazo vencido el \d\d\/\d\d/.test(tr('vx')))
  const card = S2.htmlTarjetaCheque(filas[0], cobs.get('c'))
  chk('celular: la tarjeta entera marcada', /class="chq-tarjeta chq-tarjeta--vence"/.test(card))
  chk('celular: la etiqueta CORTA en el segundo renglón, la larga en title',
    /chq-tarjeta__l2"><span class="chq-tarjeta__dato chq-vence__etiqueta" title="Vence el \d\d\/\d\d · quedan 5 días">Vence \d\d\/\d\d · 5 días</.test(card), card)
  chk('corta: vencido', S2.textoVencimientoCorto({ nivel: 'vencido', plazo: '2026-10-22', dias: -2 }) === 'Vencido el 22/10')
  chk('corta: hoy', S2.textoVencimientoCorto({ nivel: 'por_vencer', plazo: '2026-10-22', dias: 0 }) === 'Vence hoy')
  chk('corta: un día', S2.textoVencimientoCorto({ nivel: 'por_vencer', plazo: '2026-10-22', dias: 1 }) === 'Vence 22/10 · 1 día')
  chk('css: en la tarjeta la etiqueta nunca se achica', /\.chq-tarjeta__l2 \.chq-vence__etiqueta \{[^}]*flex: 0 0 auto/.test(CSS))
  chk('celular: vencido con la marca fuerte', /chq-tarjeta--vencido/.test(S2.htmlTarjetaCheque(filas[1], cobs.get('c'))))

  // Resumen de arriba: de TODA la cartera, con los vencidos adentro.
  const r = S2.resumenVencimientos([...filas, { ...base, id: 'sal', estado: 'depositado', fecha_pago: m(-31) }], h)
  chk('resumen: cuenta los que vencen esta semana y los vencidos (como la burbuja)', r.cantidad === 2 && r.vencidos === 1, JSON.stringify(r))
  chk('resumen: suma', r.total === 200)
  const r2 = S2.resumenVencimientos([{ ...filas[0], importe: 1.1 }, { ...filas[1], importe: 2.2 }, { ...filas[0], importe: 0.29 }], h)
  chk('resumen: suma en centavos (1,1 + 2,2 + 0,29 = 3,59 exacto)', r2.total === 3.59, r2.total)
  const aviso = S2.htmlAvisoVencimientos({ cantidad: 3, vencidos: 1, total: 4100000 }, false)
  chk('aviso: "3 cheques vencen esta semana (1 ya vencido) · $ 4.100.000,00"',
    aviso.includes('3 cheques vencen esta semana (1 ya vencido) · $ 4.100.000,00'), aviso)
  chk('aviso: es un botón tocable, con aria-pressed', /<button type="button" class="chq-vencen chq-vencen--vencido" data-ver-vencen aria-pressed="false">/.test(aviso))
  chk('aviso: sin ninguno no aparece', S2.htmlAvisoVencimientos({ cantidad: 0, vencidos: 0, total: 0 }, false) === '')
  chk('aviso: si no se pudo calcular, tampoco (nunca un cero)', S2.htmlAvisoVencimientos(null, false) === '')
  chk('aviso: con el filtro puesto y cero, queda para poder sacarlo', /Ver todos/.test(S2.htmlAvisoVencimientos({ cantidad: 0, vencidos: 0, total: 0 }, true)))
  chk('aviso: singular', S2.htmlAvisoVencimientos({ cantidad: 1, vencidos: 0, total: 5 }, false).includes('1 cheque vence esta semana'))

  // Filtrar a esos.
  S2.estado.filas = filas
  S2.estado.cobranzas = cobs
  const antes = S2.__llamadas.cargarCheques
  S2.estado.filtros.estado = 'todos'
  S2.alternarSoloVencen()
  chk('tocar el aviso: filtra a los que vencen y vuelve a consultar la cartera', S2.estado.filtros.soloVencen === true &&
    S2.estado.filtros.estado === 'en_cartera' && S2.__llamadas.cargarCheques === antes + 1)
  chk('se ven solo esos', S2.filasVisibles().map(x => x.id).join() === 'v5,vx')
  S2.renderizarCheques()
  chk('la tabla muestra solo esos', !S2.__doc.getElementById('chq-tabla').innerHTML.includes('data-cheque-fila="lejos"'))
  chk('cuenta como filtro puesto (aparece "Limpiar filtros")', S2.hayFiltrosCheques() === true)
  S2.alternarSoloVencen()
  chk('tocarlo otra vez vuelve a todos', S2.estado.filtros.soloVencen === false && S2.filasVisibles().length === 3)
  S2.estado.filtros.soloVencen = true
  S2.estado.filas = [filas[2]]
  S2.renderizarCheques()
  chk('filtrado y sin ninguno: lo dice', S2.__doc.getElementById('chq-vacio').textContent === 'No hay cheques en cartera que venzan esta semana.')
  S2.limpiarFiltrosCheques()
  chk('limpiar saca también este filtro', S2.estado.filtros.soloVencen === false)
  chk('cambiar el estado del segmentado saca este filtro',
    /estado\.filtros\.estado = b\.dataset\.estadoCheque\s*\n[\s\S]{0,200}estado\.filtros\.soloVencen = false/.test(FUENTE))
}

// ── La carga del resumen trae lo necesario para calcular ─────────────────
{
  const S3 = construirCheques(ARCHIVO)
  const h = S3.hoyArgentina()
  S3.__set([
    { id: 'a', banco_codigo: '007', estado: 'en_cartera', importe: 100, tipo: 'comun', fecha_emision: mas(-28, h), fecha_pago: null },
    { id: 'b', banco_codigo: '007', estado: 'en_cartera', importe: 50, tipo: 'comun', fecha_emision: h, fecha_pago: null },
  ])
  esperas.push(S3.cargarResumenCheques().then(() => {
    chk('carga: calcula los que vencen (1 · $ 100)', S3.estado.vencimientos?.cantidad === 1 && S3.estado.vencimientos.total === 100,
      JSON.stringify(S3.estado.vencimientos))
    const sel = S3.__consultas.find(c => c.tabla === 'cobranza_cheques').llamadas.find(l => l[0] === 'select')[1]
    chk('carga: pide tipo y las dos fechas', /tipo/.test(sel) && /fecha_emision/.test(sel) && /fecha_pago/.test(sel), sel)
    chk('carga: el aviso se dibuja junto al total', /data-ver-vencen/.test(S3.__doc.getElementById('chq-cartera').innerHTML))
  }))
  const S4 = construirCheques(ARCHIVO)
  S4.estado.vencimientos = { cantidad: 9, vencidos: 0, total: 1 }
  S4.__setError(new Error('sin señal'))
  esperas.push(S4.cargarResumenCheques().then(() => {
    chk('carga con error: no se inventa ningún vencimiento', S4.estado.vencimientos === null)
  }))
}

// ── CSS: de un vistazo, y nunca naranja ──────────────────────────────────
{
  chk('css: por vencer, la fila entera en --bordo-suave', /background: var\(--bordo-suave\)/.test(regla('.chq-tabla__fila--vence td')))
  chk('css: vencido, un fondo más intenso (variable, no un hex)', /background: var\(--chq-vencido-fondo\)/.test(regla('.chq-tabla__fila--vencido td')) &&
    /--chq-vencido-fondo: color-mix\(in srgb, var\(--bordo\) \d+%, var\(--bordo-suave\)\)/.test(CSS))
  chk('css: la tarjeta del celular, tintada entera', /var\(--bordo-suave\)/.test(regla('.chq-tarjeta--vence')) && /var\(--chq-vencido-fondo\)/.test(regla('.chq-tarjeta--vencido')))
  chk('css: la fecha de pago en bordó y negrita', /color: var\(--bordo\)/.test(regla('.chq-vence__fecha')) && /font-weight: 700/.test(regla('.chq-vence__fecha')))
  // Sin comentarios: el que explica la regla dice "NUNCA naranja".
  const reglasVence = CSS.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => /venc/.test(l)).join('\n')
  chk('css: nada de naranja en la marca de vencimiento', !/naranja/.test(reglasVence), reglasVence)
  chk('css: ningún color hex suelto en las reglas del vencimiento', !/#[0-9a-fA-F]{3,6}\b/.test(reglasVence))
  chk('css: --bordo-suave existe en main.css', /--bordo-suave:/.test(fs.readFileSync(path.join(RAIZ, 'css/main.css'), 'utf8')))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
