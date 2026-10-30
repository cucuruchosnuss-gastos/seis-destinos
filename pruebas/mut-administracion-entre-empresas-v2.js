// Mutaciones de test-administracion-entre-empresas-v2.js (Entre empresas v2,
// 30/10/2026: el saldo neto por par, la mercadería sin valorizar, los links,
// el ajuste y las listas internas): mutan modulos/administracion.html, que
// la suite recibe por ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = e6e0c74, el main del que salió
// la rama ci-prueba/entre-empresas-v2). Nunca HEAD.
//
//   node pruebas/mut-administracion-entre-empresas-v2.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-entre-empresas-v2.js')
const BASE = 'e6e0c74'

if (!process.env.MUT_SOLO_ANCLAS) {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-entre-empresas-v2.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  region: limitesAdministracion,
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlSaldoEntre', 'htmlSaldosEntre', 'htmlGrupoSinValorizarEntre', 'htmlSinValorizarEntre', 'htmlAjusteEntre',
    'htmlItemInternaEntre', 'htmlInternaEntre', 'htmlInternasEntre'],
  equivalentes: [
    { expr: "esc(puedeEn('retiros', 'precios', o.unidad) ? 'Valorizar la orden' : 'Ver la orden')", motivo: 'uno de dos textos constantes del código, sin caracteres que escapar' },
    { expr: "esc(guardando ? 'Guardando…' : 'Guardar')", motivo: 'uno de dos textos constantes del código, sin caracteres que escapar' },
  ],
  manuales: [
    // El saldo por par
    { nombre: 'los dos lados al revés', de: '      return `${nx} debe ${plataEntre(suma(p.dirs.yx) / 100, m)} · ${ny} debe ${plataEntre(suma(p.dirs.xy) / 100, m)}`', a: '      return `${nx} debe ${plataEntre(suma(p.dirs.xy) / 100, m)} · ${ny} debe ${plataEntre(suma(p.dirs.yx) / 100, m)}`' },
    { nombre: 'los lados mezclan monedas', de: '      const suma = (d) => { let c = 0; for (const porMoneda of d.tipos.values()) c += porMoneda.get(m) ?? 0; return c }', a: '      const suma = (d) => { let c = 0; for (const porMoneda of d.tipos.values()) for (const v of porMoneda.values()) c += v; return c }' },
    { nombre: 'el saldo desde hace un mes', de: '    const DIAS_SALDO_ENTRE = 800', a: '    const DIAS_SALDO_ENTRE = 30' },
    { nombre: 'el saldo con el mes en vez de desde siempre', de: "{ p_desde: desdeSaldosEntre(hasta), p_hasta: hasta }", a: "{ p_desde: hasta.slice(0, 8) + '01', p_hasta: hasta }" },
    { nombre: 'la respuesta vieja del saldo pisa', de: '        if (error) throw error\n        if (turno !== s.turno) return\n        s.filas', a: '        if (error) throw error\n        s.filas' },
    { nombre: 'el error del saldo se tapa', de: "        s.error = err?.message || 'No se pudieron leer los saldos entre empresas.'", a: "        s.error = 'No se pudieron leer los saldos entre empresas.'" },
    { nombre: 'el saldo con la fábrica de pruebas', de: '        s.filas = sinPruebaEntre(normalizarEntre(data ?? []))', a: '        s.filas = normalizarEntre(data ?? [])' },
    { nombre: 'el importe de la tarjeta se corta del "$"', de: "'$1\\u00a0')", a: "'$1 ')" },
    { nombre: 'la tarjeta no avisa lo que no tiene valor', de: '      const nota = s.sinValor\n', a: '      const nota = false\n' },
    { nombre: 'mostrarEntre sin el saldo', de: '      cargarEntre()\n      cargarSaldosEntre()\n      pintarAjusteEntre()\n', a: '      cargarEntre()\n      pintarAjusteEntre()\n' },
    // La tarjeta filtra
    { nombre: 'la tarjeta no filtra', de: "      e.filtros.par = e.filtros.par === clave ? '' : String(clave ?? '')", a: "      e.filtros.par = ''" },
    { nombre: 'tocarla de nuevo no limpia', de: "      e.filtros.par = e.filtros.par === clave ? '' : String(clave ?? '')", a: "      e.filtros.par = String(clave ?? '')" },
    // La mercadería sin valorizar
    { nombre: 'la valorizada aparece sin valorizar', de: "        if (f?.tipo !== 'mercaderia' || f?.con_precio !== false) continue", a: "        if (f?.tipo !== 'mercaderia') continue" },
    { nombre: 'sin valorizar no mira el par', de: '        if (par && claveParEntre(de, a) !== par) continue\n', a: '' },
    { nombre: 'la misma empresa de los dos lados aparece', de: '        if (!de || !a || de === a) continue\n        if (par', a: '        if (!de || !a) continue\n        if (par' },
    { nombre: '"Valorizar la orden" sin el permiso de precios', de: "puedeEn('retiros', 'precios', o.unidad) ? 'Valorizar la orden' : 'Ver la orden'", a: "'Valorizar la orden'" },
    { nombre: 'la mercadería de una orden no se vincula', de: '      const ids = [...new Set([...porMov.values(), ...deMercaderia.map(f => f.referencia_id)])]', a: '      const ids = [...new Set([...porMov.values()])]' },
    { nombre: 'el link no busca en el saldo', de: '      const f = [...(e.filas ?? []), ...(e.saldos?.filas ?? [])].find(x => x?.orden?.id === id)', a: '      const f = [...(e.filas ?? [])].find(x => x?.orden?.id === id)' },
    // La fila
    { nombre: 'quién le debe a quién al revés', de: "      return htmlSelloEmpresa(a, f.a_unidad) + '<span class=\"ad-fila__meta\">le debe a</span>' + htmlSelloEmpresa(de, f.de_unidad)", a: "      return htmlSelloEmpresa(de, f.de_unidad) + '<span class=\"ad-fila__meta\">le debe a</span>' + htmlSelloEmpresa(a, f.a_unidad)" },
    { nombre: 'el gasto sin volver', de: '&amp;volver=${encodeURIComponent(location.href)}', a: '' },
    { nombre: 'la cobranza sin mirar la sección', de: "      else if (rt === 'cobranza' && ve('cobranzas')) a =", a: "      else if (rt === 'cobranza') a =" },
    { nombre: 'el cheque sin mirar la sección', de: "      else if (rt === 'cheque' && ve('cheques')) a =", a: "      else if (rt === 'cheque') a =" },
    { nombre: 'la mercadería de la orden sin el código', de: '        return htmlOrdenEntre({ ...f, orden: f.orden ?? { id: null, codigo: codigoMercaderiaEntre(f), unidad: null } })', a: "        return ''" },
    // El ajuste
    { nombre: 'acreedora y deudora al revés', de: '      return { p_acreedora: a.acreedora, p_deudora: a.deudora, p_importe: a.importe, p_fecha: a.fecha, p_concepto: a.concepto }', a: '      return { p_acreedora: a.deudora, p_deudora: a.acreedora, p_importe: a.importe, p_fecha: a.fecha, p_concepto: a.concepto }' },
    { nombre: 'el ajuste sin la fecha', de: '      return { p_acreedora: a.acreedora, p_deudora: a.deudora, p_importe: a.importe, p_fecha: a.fecha, p_concepto: a.concepto }', a: '      return { p_acreedora: a.acreedora, p_deudora: a.deudora, p_importe: a.importe, p_concepto: a.concepto }' },
    { nombre: 'la misma empresa pasa', de: '      if (!a.deudora || !a.acreedora || a.deudora === a.acreedora)', a: '      if (!a.deudora || !a.acreedora)' },
    { nombre: 'importe cero pasa', de: "      if (a.importe === null || !(a.importe > 0)) return 'Poné el importe.'", a: "      if (a.importe === null) return 'Poné el importe.'" },
    { nombre: 'concepto corto pasa', de: "      if (a.concepto.length < 3) return 'Poné el concepto.'", a: "      if (!a.concepto.length) return 'Poné el concepto.'" },
    { nombre: 'el concepto sin limpiar', de: "        concepto: limpio(v('ad-entre-ajuste-concepto').value),", a: "        concepto: String(v('ad-entre-ajuste-concepto').value),"  },
    { nombre: 'el error del ajuste se tapa', de: "        errorEl.textContent = err?.message || 'No se pudo cargar el ajuste.'", a: "        errorEl.textContent = 'No se pudo cargar el ajuste.'" },
    { nombre: 'el botón queda en "Guardando…"', de: "        boton.disabled = false\n        boton.textContent = 'Guardar'\n", a: '' },
    { nombre: 'después del ajuste no se recarga', de: '      pintarAjusteEntre()\n      cargarSaldosEntre()\n      cargarEntre()\n', a: '      pintarAjusteEntre()\n' },
    { nombre: 'el ajuste sin permiso', de: "    function puedeAjustarEntre() {\n      return tieneTarea('gastos', 'gastos_empresa')", a: '    function puedeAjustarEntre() {\n      return true' },
    // Las listas internas
    { nombre: 'lee todas las listas, no solo las internas', de: ".eq('es_interna', true).eq('activa', true).order('nombre')", a: ".eq('activa', true).order('nombre')" },
    { nombre: 'la lista de la fábrica de pruebas aparece', de: '        i.listas = sinUnidadesDePrueba(data ?? [], estado.fabrica, l => l?.unidad_negocio_id)', a: '        i.listas = data ?? []' },
    { nombre: 'guardar sin el signo', de: "{ p_lista_id: id, p_pct: pct }", a: "{ p_lista_id: id, p_pct: Math.abs(pct) }" },
    { nombre: 'el % sin signo', de: "      const signo = n < 0 ? '−' : n > 0 ? '+' : ''", a: "      const signo = ''" },
    { nombre: 'el campo del % sin el menos', de: "      return (n < 0 ? '-' : '') + formatearNumeroAr(Math.abs(n), { decimales: 3, minimos: 0 })", a: '      return formatearNumeroAr(Math.abs(n), { decimales: 3, minimos: 0 })' },
    { nombre: 'sin precio no va en gris', de: "${sin ? ' ad-entre-interna__item--sin' : ''}", a: '' },
    { nombre: 'sin precio dice un importe', de: "esc(sin ? 'sin precio en ninguna lista' : plataEntre(it.precio_interno, moneda))", a: 'esc(plataEntre(it.precio_interno, moneda))' },
    { nombre: 'sin el precio propio', de: "      const propio = centavosEntre(it?.precio_propio) !== null ? 'Precio propio: ' + plataEntre(it.precio_propio, moneda) : ''", a: "      const propio = ''" },
    { nombre: 'sin la lista más barata', de: "'Más barata: ' + (limpio(mb.lista) || 'una lista') + ' ' + plataEntre(mb.precio_caja, moneda)", a: "'Más barata'" },
    { nombre: 'el permiso de la lista sin retiros:precios', de: "      return tieneTarea('gastos', 'gastos_empresa') || puedeEn('retiros', 'precios', l?.unidad_negocio_id)", a: "      return tieneTarea('gastos', 'gastos_empresa')" },
    { nombre: 'el permiso de la lista sin alcance', de: "      return tieneTarea('gastos', 'gastos_empresa') || puedeEn('retiros', 'precios', l?.unidad_negocio_id)", a: "      return tieneTarea('gastos', 'gastos_empresa') || tieneTarea('retiros', 'precios')" },
    { nombre: 'sin % llama igual', de: '      if (pct === null) {\n', a: '      if (false) {\n' },
    { nombre: 'el error de guardar se tapa', de: "        i.errores.set(id, err?.message || 'No se pudo guardar el porcentaje.')", a: "        i.errores.set(id, 'No se pudo guardar el porcentaje.')" },
    { nombre: 'después de guardar no se releen los precios', de: '      if (ok) leerPreciosInternaEntre(id)\n', a: '' },
    { nombre: 'mostrarEntre sin las listas internas', de: '      pintarAjusteEntre()\n      cargarInternasEntre()\n', a: '      pintarAjusteEntre()\n' },
  ],
})
