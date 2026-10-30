// Mutaciones de test-administracion-valorizar-legible.js (el nombre del
// renglón con "× N u.", el descuento del cono y la caja con cono con la
// aritmética de numeric, 30/10/2026): mutan modulos/administracion.html, que
// la suite recibe por ARCHIVO_TEST. Ver mutar.js.
//
// Desde el 30/10/2026 (Facu cambió el punto 2) mutan también las condiciones
// especiales del cliente (ficha, valorizar, detalle, hojas y Corregir orden).
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = f3d7152, de donde salió la rama
// ci-prueba/valorizar-legible). Nunca HEAD.
//
//   node pruebas/mut-administracion-valorizar-legible.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-valorizar-legible.js')
const BASE = 'f3d7152'

if (!process.env.MUT_SOLO_ANCLAS) {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-valorizar-legible.html')
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
  funciones: ['htmlNombreRenglon', 'htmlDescuentoGuardado', 'htmlOrigenPrecio', 'htmlNombreHojaPunto', 'htmlDescuentoValorizar', 'htmlCondicionesValorizar',
    'htmlDescuentoHojaPunto', 'htmlFilaEspecial', 'htmlFormEspecial', 'pintarPartesFormEspecial', 'pintarEspecialesFicha'],
  equivalentes: [
    { expr: 'esc(o.ilustracion)', motivo: 'texto armado por textoConitoIlustracion() con un importe formateado (textoPrecioUnitario de un número): sin texto de la base' },
    { expr: 'esc(importeHoja(precioConDescuento(p, k.descuento_pct), moneda))', motivo: 'un importe formateado por el código (importeHoja de un número): sin texto de la base' },
    { expr: "esc('(−' + textoPct(k.descuento_pct) + ' % · antes ' + importeHoja(p, moneda) + ')')", motivo: 'un % y un importe formateados por el código: sin texto de la base' },
  ],
  manuales: [
    // El nombre del renglón
    { nombre: 'sin las unidades de la caja', de: "      const u = textoUnidadesRemito(pr)\n", a: "      const u = ''\n" },
    { nombre: 'las unidades sin negrita', de: "' <strong class=\"ad-renglon__u\">' + esc(u) + '</strong>'", a: "' ' + esc(u)" },
    { nombre: 'vuelve el "· Sin cono" final', de: "      const cono = pr?.con_cono ? p.cono : ''\n", a: '      const cono = p.cono\n' },
    { nombre: 'sin el cono aunque sea con cono', de: "      const cono = pr?.con_cono ? p.cono : ''\n", a: "      const cono = ''\n" },
    { nombre: 'el renglón con el nombre viejo', de: "        descHtml = esc(desc) + htmlNombreRenglon(cat, it)", a: "        descHtml = esc(desc + [p.producto, p.presentacion, p.cono].join(' · '))" },
    // Las condiciones especiales (el punto 2 nuevo, 30/10/2026)
    { nombre: 'la condición sin mirar el cono', de: "        if (marcas.length && !marcas.some(m => (m?.id ?? m) === it.marca_id)) continue\n", a: '' },
    { nombre: 'la condición sin mirar el producto', de: "        if (productos.length && !productos.some(x => (x?.id ?? x) === productoId)) continue\n", a: '' },
    { nombre: 'la condición con la reposición', de: "      if (!it || tipoItem(it) === 'reposicion') return null", a: '      if (!it) return null' },
    { nombre: 'en varias, la primera (no la de mayor %)', de: '        if (!mejor || pct > numeroONulo(mejor.descuento_pct)) mejor = k', a: '        if (!mejor) mejor = k' },
    { nombre: 'un insumo entra por producto', de: '      const productoId = it.insumo_id ? null : (pr?.producto_id ?? null)', a: "      const productoId = it.insumo_id ? 'p-soft' : (pr?.producto_id ?? null)" },
    { nombre: 'el descuento sin redondear a 2', de: '      return plataNumeric(multiplicarNumeric(l, f))', a: '      return Number(lista) * (1 - Number(pct) / 100)' },
    { nombre: 'el subtotal sin el descuento', de: '      const p = precioEfectivoValorizar(d, it)\n', a: '      const p = d?.valorizar?.precios?.[it.id]\n' },
    { nombre: 'el renglón sin el precio con descuento', de: '          `<div data-descuento-precio="${esc(it.id)}">${htmlDescuentoValorizar(d, it)}</div>` +\n', a: '' },
    { nombre: 'el precio con descuento sin el de antes', de: "' % · antes ' + importeHoja(p, moneda) + ')'", a: "' %)'" },
    { nombre: 'tipear no pone al día el descuento', de: '      if (conDesc && it) conDesc.innerHTML = htmlDescuentoValorizar(d, it)\n', a: '' },
    { nombre: 'sin la sección de los tildes', de: "${htmlCondicionesValorizar(d)}${total}", a: '${total}' },
    { nombre: 'los tildes con las inactivas', de: "        return { lista: (Array.isArray(data) ? data : []).filter(k => k?.id && k.activa !== false), error: null }", a: "        return { lista: (Array.isArray(data) ? data : []).filter(k => k?.id), error: null }" },
    { nombre: 'pide también las inactivas para tildar', de: "{ p_cliente_id: clienteId, p_solo_activas: true }", a: "{ p_cliente_id: clienteId, p_solo_activas: false }" },
    { nombre: 'el tilde sin marcar al revalorizar', de: "${v.elegidas?.has(k.id) ? ' checked' : ''}", a: "${''}" },
    { nombre: 'revalorizar no trae los tildes', de: "      v.elegidas = new Set(o.estado_valorizacion === 'valorizada' && Array.isArray(o.condiciones_especiales) ? o.condiciones_especiales : [])", a: '      v.elegidas = new Set()' },
    { nombre: 'revalorizar propone el precio ya descontado', de: '? Number(it.precio_lista ?? it.precio_caja) : null', a: '? Number(it.precio_caja) : null' },
    { nombre: 'tildar no repinta', de: '      if (si) v.elegidas.add(id)\n      else v.elegidas.delete(id)\n      pintarOrden()', a: '      if (si) v.elegidas.add(id)\n      else v.elegidas.delete(id)' },
    { nombre: 'se puede tildar una que no está', de: "      if (!v || v.cargando || !(v.condiciones ?? []).some(k => k.id === id)) return\n      if (si)", a: '      if (!v || v.cargando) return\n      if (si)' },
    { nombre: 'guardar con valorizar_orden_retiro', de: "supabase.rpc('valorizar_con_condiciones', { ...parametrosValorizar(d), p_condiciones: condicionesElegidas(d).map(k => k.id) })", a: "supabase.rpc('valorizar_orden_retiro', parametrosValorizar(d))" },
    { nombre: 'guardar sin las condiciones', de: 'p_condiciones: condicionesElegidas(d).map(k => k.id) })', a: 'p_condiciones: [] })' },
    { nombre: 'guardar manda los precios con descuento', de: '      for (const it of d.items) precios[it.id] = d.valorizar.precios[it.id]\n', a: '      for (const it of d.items) precios[it.id] = precioEfectivoValorizar(d, it)\n' },
    { nombre: 'sin el aviso si no se pueden leer', de: "        (v.errorCondiciones ? `<div class=\"ad-aviso\">${esc(v.errorCondiciones)}</div>` : '') + filas", a: '        filas' },
    // La orden valorizada
    { nombre: 'la orden valorizada sin el descuento', de: "${esc(importeHoja(precio, moneda) + ' x ' + porQue)}${htmlDescuentoGuardado(it, d.condiciones)}", a: "${esc(importeHoja(precio, moneda) + ' x ' + porQue)}" },
    { nombre: 'el descuento guardado sin el nombre', de: "(nombre ? ' · ' + nombre : '')", a: "''" },
    { nombre: 'la orden no lee la condición del renglón', de: 'precio_caja, subtotal, precio_lista, descuento_pct, condicion_id, lote,', a: 'precio_caja, subtotal, precio_lista, descuento_pct, lote,' },
    { nombre: 'la orden no lee los nombres de las condiciones', de: '      const condiciones = await leerCondicionesDeOrden(o, items)\n', a: '      const condiciones = null\n' },
    { nombre: 'la hoja sin el descuento', de: '${esc(plata(r.precio))}${htmlDescuentoHojaPunto(datos, r)}</td>', a: '${esc(plata(r.precio))}</td>' },
    // Corregir orden
    { nombre: 'corregir con el precio descontado', de: 'precio: numeroONull(it?.precio_lista ?? it?.precio),', a: 'precio: numeroONull(it?.precio),' },
    { nombre: 'corregir sin estimar las condiciones', de: '      return k ? precioConDescuento(lista, k.descuento_pct) : lista\n    }\n\n    function precioListaCorregir', a: '      return lista\n    }\n\n    function precioListaCorregir' },
    // La ficha
    { nombre: 'la ficha sin las inactivas', de: "supabase.rpc('condiciones_especiales_cliente', { p_cliente_id: f.id, p_solo_activas: false }).then(", a: "supabase.rpc('condiciones_especiales_cliente', { p_cliente_id: f.id, p_solo_activas: true }).then(" },
    { nombre: 'la ficha sin permiso igual lee', de: "      if (!puedeEspeciales(f)) { pintarEspecialesFicha(); return }\n", a: '' },
    { nombre: 'el buscador de conos desde 1 letra', de: '    const MIN_LETRAS_CONO_ESP = 2', a: '    const MIN_LETRAS_CONO_ESP = 1' },
    { nombre: 'el buscador sin los que empiezan primero', de: "        if (n.startsWith(q) || n.split(/[^a-z0-9ñ]+/).some(x => x && x.startsWith(q))) empiezan.push(m)\n        else if (n.includes(q)) contienen.push(m)", a: '        if (n.includes(q)) contienen.push(m)' },
    { nombre: 'los productos viejos se ofrecen', de: '.filter(x => x.activo !== false || fm.productos.includes(x.id))', a: '.filter(x => true)' },
    { nombre: 'guardar sin validar el nombre', de: "      if (limpio(nombre).length < 2) return 'Poné un nombre", a: "      if (false) return 'Poné un nombre" },
    { nombre: 'guardar sin validar el %', de: '!(Number(pct) > 0 && Number(pct) < 100)', a: '!(Number(pct) >= 0 && Number(pct) <= 100)' },
    { nombre: 'guardar sin los conos', de: '        p_marcas: [...fm.marcas], p_productos: [...fm.productos], p_activa: activa !== false }', a: '        p_marcas: [], p_productos: [...fm.productos], p_activa: activa !== false }' },
    { nombre: 'el interruptor no da vuelta Activa', de: "parametrosEspecial(f.id, fm, k.activa === false)", a: 'parametrosEspecial(f.id, fm, true)' },
    { nombre: 'editar abre vacío', de: "      e.form = { id: k?.id ?? null, nombre: k?.nombre ?? '',", a: "      e.form = { id: k?.id ?? null, nombre: '', " },
    { nombre: 'después de guardar no relee', de: '        e.lista = Array.isArray(data) ? data : []\n        e.form = null\n', a: '        e.form = null\n' },
    { nombre: 'el error de la base se tapa', de: "alFallar(err?.message || 'No se pudo guardar la condición. Probá de nuevo.')", a: "alFallar('No se pudo guardar la condición. Probá de nuevo.')" },
    // El cono de papel ilustración (30/10/2026)
    { nombre: 'Administración no lee papel_ilustracion', de: "from('marcas_personalizadas').select('id, nombre, papel_ilustracion')", a: "from('marcas_personalizadas').select('id, nombre')" },
    { nombre: 'el renglón sin "(ilustración)"', de: "(it.marca_id ? nombreConoPorIdRemito(cat, it.marca_id) : 'Falta el cono')", a: "(it.marca_id ? ((cat?.marcas ?? []).find(m => m.id === it.marca_id)?.nombre ?? '') : 'Falta el cono')" },
    { nombre: 'la hoja de la orden sin "(ilustración)"', de: "(cat?.marcas ?? []).some(m => m.id === it.marca_id) ? nombreConoPorIdRemito(cat, it.marca_id) : null", a: "(cat?.marcas ?? []).some(m => m.id === it.marca_id) ? (cat?.marcas ?? []).find(m => m.id === it.marca_id).nombre : null" },
    { nombre: 'la hoja con un cono que no está', de: "      const conoNombre = pr?.con_cono && it.marca_id && (cat?.marcas ?? []).some(m => m.id === it.marca_id) ? ", a: '      const conoNombre = pr?.con_cono && it.marca_id ? ' },
    { nombre: 'el conito de ilustración para cualquier cono', de: "      if (datos?.papel_conito !== 'ilustracion') return ''\n", a: '' },
    { nombre: 'el conito sin el precio', de: "      return n === null ? '' : 'conito ilustración ' + textoPrecioUnitario(n) + ' por unidad'", a: "      return 'conito ilustración por unidad'" },
    { nombre: 'valorizar sin la línea del conito', de: '            ilustracion: textoConitoIlustracion(r.datos) }', a: "            ilustracion: '' }" },
    { nombre: 'la línea del conito sin mostrarse', de: "        (o.ilustracion ? `<div class=\"ad-renglon__origen ad-renglon__descuento\" data-conito-ilustracion>${esc(o.ilustracion)}</div>` : '')", a: "        ''" },
    // Las hojas N1 / N2
    { nombre: 'la hoja con el nombre de la base', de: '        ? filas.map(r => `<tr><td>${htmlNombreHojaPunto(datos, r)}</td>` +', a: '        ? filas.map(r => `<tr><td>${esc(r.descripcion)}</td>` +' },
    { nombre: 'la hoja de otra orden con el nombre de la abierta', de: "d?.orden?.id && d.orden.id === datos?.orden_id && Array.isArray(d.items)", a: 'Array.isArray(d?.items)' },
    { nombre: 'la devolución sin su palabra en la hoja', de: "r.tipo === 'devolucion' ? 'Devolución: ' :", a: "r.tipo === 'devolucion' ? '' :" },
    // La caja con cono como la base
    { nombre: 'vuelve el redondeo a 4 en el medio', de: '      const unidad = multiplicarNumeric(dividirNumeric(c, us), recargo)', a: '      const unidad = multiplicarNumeric({ v: (dividirNumeric(c, us).v + 500000000000n) / 1000000000000n, s: 4 }, recargo)' },
    { nombre: 'la división con 4 decimales menos', de: '      const escala = Math.min(1000, Math.max(16 - q * 4, a.s, b.s, 0))', a: '      const escala = Math.min(1000, Math.max(12 - q * 4, a.s, b.s, 0))' },
    { nombre: 'la división sin el ajuste del primer grupo', de: '      if (pa.primero < pb.primero) q--\n', a: '' },
    { nombre: 'la división trunca (no redondea)', de: '      return { v: t >= 0n ? (t + 5n) / 10n : (t - 5n) / 10n, s: escala }', a: '      return { v: t / 10n, s: escala }' },
    { nombre: 'el final trunca (no redondea)', de: '      return Number(t >= 0n ? (t + 5n) / 10n : (t - 5n) / 10n) / 100\n', a: '      return Number(t / 10n) / 100\n' },
    { nombre: 'sin el recargo de la lista', de: '      return cuentaNumeric(nuevo, upcSin, pct, conito, upcCon)', a: '      return cuentaNumeric(nuevo, upcSin, 0, conito, upcCon)' },
    { nombre: 'sin el conito', de: '      return plataNumeric(multiplicarNumeric(sumarNumeric(unidad, co), uc))', a: '      return plataNumeric(multiplicarNumeric(unidad, uc))' },
    { nombre: 'la cuenta con los decimales de la compu', de: '      return cuentaNumeric(nuevo, upcSin, pct, conito, upcCon)', a: '      return Math.round((nuevo / upcSin * (1 + pct / 100) + conito) * upcCon * 100) / 100' },
  ],
})
