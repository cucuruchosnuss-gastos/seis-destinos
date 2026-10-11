// EL RESUMEN DE CUENTA (11/10/2026) — decimocuarta excepción consciente a la
// regla de duplicar. "Descargar resumen de cuenta" está en la ficha de cada
// PROVEEDOR (Cuentas corrientes) y en la cuenta de cada CLIENTE
// (Administración → Clientes; la pestaña Clientes de Cuentas corrientes es esa
// misma pantalla embebida). Es la misma hoja para los dos: copiada en dos
// archivos serían dos resúmenes con el Debe y el Haber al revés uno del otro.
//
// QUÉ HAY ACÁ, una sola vez:
//  - las REGLAS: de un movimiento de la base a un renglón con Debe / Haber /
//    Saldo (filaProveedor, filaCliente), las cuentas por empresa y moneda
//    (cuentasProveedor, cuentaCliente), el período (resumirCuenta), la empresa
//    por defecto (eleccionPorDefecto) y los cortes de página del PDF
//    (cortesDePagina);
//  - la HOJA (htmlResumen): A4 en blanco y negro, una sección por empresa;
//  - el PANEL (abrirResumenCuenta): período (js/periodo.js), empresa, la hoja
//    a la vista, "Descargar PDF", "Compartir por WhatsApp" e "Imprimir".
// Cada pantalla le pasa cómo LEER su cuenta (`cargar`) y cómo NOMBRAR cada
// movimiento (`describir`): eso ya lo sabe cada una (las etiquetas de los
// pagos, el código de la orden de retiro).
//
// EL DEBE Y EL HABER, DESDE LOS LIBROS DE LA EMPRESA (no del tercero):
//  - PROVEEDOR: su cuenta es lo que le DEBEMOS. Lo que nos factura (factura,
//    interés, saldo inicial) va al HABER; lo que le pagamos (pago, crédito
//    aplicado) va al DEBE. Saldo = haber − debe: positivo, le debemos;
//    negativo, nos tiene a favor. Es el mismo signo de
//    v_cuenta_corriente_movimientos.monto (+ factura, − pago) y su
//    saldo_acumulado.
//  - CLIENTE: su cuenta es lo que NOS DEBE. Lo que le cargamos (retiro,
//    comisión, saldo inicial, proyecto, ajuste positivo) va al DEBE; lo que nos
//    paga o se le descuenta (cobranza, anulación de retiro, compensación,
//    ajuste negativo) va al HABER. Saldo = debe − haber: positivo, nos debe;
//    negativo, tiene a su favor. Es el mismo signo de
//    cliente_movimientos.importe y del saldo de cuenta_cliente().
// El saldo de cada renglón es el que da la base (el mismo que muestra la
// ficha), no una cuenta propia: así el resumen dice lo mismo que la pantalla.
//
// Un dato AUSENTE es "—", nunca "$ 0,00" (una factura sin importe todavía).
// Un saldo en cero de verdad sí es "0,00".
//
// Su escape es `escRc`.

import { formatearNumeroAr } from './utils.js'
import { crearPeriodo, rangoDePeriodo, hoyIsoAr } from './periodo.js'
import { logoSeguro, LIBRERIAS_PDF, cargarScript } from './retiros-comun.js'

export function escRc(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const limpio = (x) => String(x ?? '').trim()

// Un número de la base (numeric llega como texto) o null si no hay.
export function numeroRc(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

// ── Las reglas ─────────────────────────────────────────────────────────────

// Un movimiento de v_cuenta_corriente_movimientos → un renglón del resumen.
// `describir(m)` → { comprobante, detalle } (lo arma la pantalla).
export function filaProveedor(m, describir) {
  const monto = numeroRc(m?.monto)
  const d = (describir && describir(m)) || {}
  return {
    fecha: m?.fecha ?? null,
    orden: m?.orden_desempate ?? null,
    comprobante: limpio(d.comprobante),
    detalle: limpio(d.detalle),
    // Lo que nos factura, al haber; lo que le pagamos, al debe.
    debe: monto !== null && monto < 0 ? -monto : null,
    haber: monto !== null && monto >= 0 ? monto : null,
    saldo: numeroRc(m?.saldo_acumulado),
    sinImporte: monto === null,
  }
}

// Un renglón de cuenta_cliente() → un renglón del resumen.
export function filaCliente(m, describir) {
  const importe = numeroRc(m?.importe)
  const d = (describir && describir(m)) || {}
  return {
    fecha: m?.fecha ?? null,
    orden: null,
    comprobante: limpio(d.comprobante),
    detalle: limpio(d.detalle),
    // Lo que le cargamos, al debe; lo que nos paga, al haber.
    debe: importe !== null && importe > 0 ? importe : null,
    haber: importe !== null && importe < 0 ? -importe : null,
    saldo: numeroRc(m?.saldo),
    sinImporte: importe === null,
  }
}

function porFecha(a, b) {
  const fa = String(a.fecha ?? ''), fb = String(b.fecha ?? '')
  if (fa !== fb) return fa < fb ? -1 : 1
  // Mismo día: orden_desempate (el mismo orden que el saldo_acumulado de la vista).
  const oa = a.orden ?? '', ob = b.orden ?? ''
  if (oa === ob) return 0
  if (typeof oa === 'number' && typeof ob === 'number') return oa - ob
  return String(oa) < String(ob) ? -1 : 1
}

// Las filas de v_cuenta_corriente_movimientos de UN proveedor → una cuenta por
// empresa y moneda (la vista lleva el saldo así, particionado), de la más
// vieja a la más nueva. `unidadVisible(id)` saca las empresas que no se
// muestran (la fábrica de pruebas).
export function cuentasProveedor(filas, describir, { unidadVisible = null } = {}) {
  const grupos = new Map()
  for (const m of filas ?? []) {
    const unidad = m?.unidad_negocio_id ?? null
    if (unidadVisible && !unidadVisible(unidad)) continue
    const moneda = limpio(m?.moneda) || 'ARS'
    const clave = (unidad ?? '') + '|' + moneda
    if (!grupos.has(clave)) grupos.set(clave, { unidadId: unidad, moneda, filas: [] })
    grupos.get(clave).filas.push(filaProveedor(m, describir))
  }
  const cuentas = [...grupos.values()]
  for (const c of cuentas) c.filas.sort(porFecha)
  // Pesos primero.
  return cuentas.sort((a, b) => (a.moneda === 'ARS' ? 0 : 1) - (b.moneda === 'ARS' ? 0 : 1))
}

// La cuenta de UN cliente (cuenta_cliente ya viene en orden: fecha y carga).
export function cuentaCliente(filas, { unidadId = null, titular = null, describir = null } = {}) {
  return { unidadId, moneda: null, titular, filas: (filas ?? []).map(m => filaCliente(m, describir)) }
}

const esIso = (t) => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t)

// El período de una cuenta: el saldo anterior (el último saldo ANTES de
// "desde"), los movimientos de desde a hasta (los dos bordes adentro) y el
// saldo al final (el último saldo hasta "hasta"). Sin "desde", no hay saldo
// anterior (null). Un renglón sin saldo (la base suma null antes del primer
// importe) conserva el de antes.
export function resumirCuenta(cuenta, desde, hasta) {
  const d = esIso(desde) ? desde : '', h = esIso(hasta) ? hasta : ''
  let saldo = 0
  let anterior = 0
  const movimientos = []
  for (const f of cuenta?.filas ?? []) {
    const fecha = String(f.fecha ?? '')
    if (h && fecha > h) continue
    const s = f.saldo ?? saldo
    if (d && fecha < d) { anterior = s; saldo = s; continue }
    movimientos.push({ ...f, saldo: s })
    saldo = s
  }
  return {
    saldoAnterior: d ? anterior : null,
    movimientos,
    saldoFinal: saldo,
    sinImporte: movimientos.filter(m => m.sinImporte).length,
  }
}

// Las empresas donde tiene cuenta, en el orden de las cuentas (una vez cada una).
export function opcionesEmpresa(cuentas, nombreDe = (id) => id) {
  const vistas = new Set(), opciones = []
  for (const c of cuentas ?? []) {
    const id = c.unidadId ?? ''
    if (vistas.has(id)) continue
    vistas.add(id)
    opciones.push({ id, nombre: id ? (limpio(nombreDe(id)) || 'Empresa') : 'Sin empresa' })
  }
  return opciones
}

export const TODAS_SEPARADAS = 'todas'

// Por defecto: la de la barra de arriba si tiene cuenta ahí; con una sola, esa;
// si no, todas separadas.
export function eleccionPorDefecto(opciones, unidadBarra) {
  if (!opciones?.length) return ''
  if (opciones.length === 1) return opciones[0].id
  if (unidadBarra && opciones.some(o => o.id === unidadBarra)) return unidadBarra
  return TODAS_SEPARADAS
}

export function cuentasDeEleccion(cuentas, eleccion) {
  if (eleccion === TODAS_SEPARADAS) return [...(cuentas ?? [])]
  return (cuentas ?? []).filter(c => (c.unidadId ?? '') === (eleccion ?? ''))
}

// ── Textos ─────────────────────────────────────────────────────────────────

export function fechaRc(iso) {
  return esIso(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—'
}

// "11/10/2026 14:05", la hora de Argentina.
export function fechaHoraAr(ahora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(ahora).map(x => [x.type, x.value]))
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

// Un importe de una celda: punto de miles, 2 decimales. Vacío si no va en esa
// columna; "—" si es un dato ausente.
export function celdaRc(n) {
  return n === null || n === undefined ? '' : formatearNumeroAr(n)
}

function simbolo(moneda) {
  return !moneda || moneda === 'ARS' ? '$' : moneda === 'USD' ? 'US$' : moneda
}

export function plataRc(n, moneda) {
  const t = formatearNumeroAr(n)
  return t === '—' ? '—' : simbolo(moneda) + ' ' + t
}

// Qué quiere decir el saldo, en palabras.
export function textoSaldo(tipo, saldo, nombre, empresa) {
  const n = numeroRc(saldo)
  const quien = limpio(nombre) || (tipo === 'cliente' ? 'El cliente' : 'El proveedor')
  const nos = limpio(empresa) || 'la empresa'
  if (n === null) return ''
  if (Math.abs(n) < 0.005) return 'Cuenta en cero.'
  if (tipo === 'cliente') return n > 0 ? `${quien} le debe a ${nos}.` : `${quien} tiene saldo a su favor.`
  return n > 0 ? `${nos} le debe a ${quien}.` : `${quien} tiene saldo a favor de ${nos}.`
}

function nombreMoneda(moneda) {
  if (!moneda || moneda === 'ARS') return 'pesos'
  if (moneda === 'USD') return 'dólares'
  return moneda
}

export function nombreArchivoResumen(nombre, desde, hasta) {
  const base = limpio(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'cuenta'
  const per = [desde, hasta].filter(esIso).join('-al-')
  return `resumen-de-cuenta-${base}${per ? '-' + per : ''}.pdf`
}

export function textoCompartir(nombre, desde, hasta) {
  return `Resumen de cuenta · ${limpio(nombre) || 'cuenta'} · del ${fechaRc(desde)} al ${fechaRc(hasta)}`
}

// ── La hoja ────────────────────────────────────────────────────────────────

function htmlEmpresa(emp, nombreEmpresa) {
  const logo = logoSeguro(emp?.logo_url)
  const nombre = limpio(emp?.nombre) || limpio(nombreEmpresa) || limpio(emp?.razon_social) || 'Empresa'
  const datos = [
    limpio(emp?.razon_social) && limpio(emp?.razon_social) !== nombre ? limpio(emp.razon_social) : '',
    limpio(emp?.cuit) ? 'CUIT ' + limpio(emp.cuit) : '',
    limpio(emp?.domicilio),
  ].filter(Boolean)
  // logoSeguro() ya dejó solo un nombre de archivo de la raíz del repo (un
  // nivel arriba de modulos/); igual va con encodeURIComponent.
  const img = logo ? `<img class="rc-logo" src="../${encodeURIComponent(logo)}" alt="${escRc(nombre)}">` : ''
  return `<div class="rc-empresa">${img}<div><div class="rc-empresa__nombre">${escRc(nombre)}</div>` +
    datos.map(x => `<div class="rc-empresa__dato">${escRc(x)}</div>`).join('') + '</div></div>'
}

function htmlTabla(r) {
  if (!r.movimientos.length) return '<p class="rc-vacio" data-rc-corte>Sin movimientos en el período.</p>'
  const filas = r.movimientos.map(m => `<tr data-rc-corte>` +
    `<td class="rc-c-fecha">${escRc(fechaRc(m.fecha))}</td>` +
    `<td class="rc-c-comp">${escRc(m.comprobante)}</td>` +
    `<td class="rc-c-det">${escRc(m.detalle)}${m.sinImporte ? `<span class="rc-sin">${m.detalle ? ' · ' : ''}sin importe todavía</span>` : ''}</td>` +
    `<td class="rc-num">${m.sinImporte ? '—' : escRc(celdaRc(m.debe))}</td>` +
    `<td class="rc-num">${m.sinImporte ? '—' : escRc(celdaRc(m.haber))}</td>` +
    `<td class="rc-num">${escRc(formatearNumeroAr(m.saldo))}</td></tr>`).join('')
  return `<table class="rc-tabla"><thead><tr data-rc-corte><th>Fecha</th><th>Comprobante</th><th>Detalle</th>` +
    `<th class="rc-num">Debe</th><th class="rc-num">Haber</th><th class="rc-num">Saldo</th></tr></thead>` +
    `<tbody>${filas}</tbody></table>`
}

// Una sección: una empresa (y una moneda) con su saldo.
export function htmlSeccionResumen({ tipo, titular, empresa, nombreEmpresa, moneda, resumen, desde, hasta, generado }) {
  const r = resumen
  const nombre = limpio(titular?.nombre) || (tipo === 'cliente' ? 'Cliente' : 'Proveedor')
  const cuit = limpio(titular?.cuit)
  const empNombre = limpio(empresa?.nombre) || limpio(nombreEmpresa) || 'la empresa'
  return `<section class="rc-seccion">` +
    `<header class="rc-cabecera" data-rc-corte>${htmlEmpresa(empresa, nombreEmpresa)}` +
      `<div class="rc-titulo"><div class="rc-titulo__texto">RESUMEN DE CUENTA</div>` +
      `<div class="rc-titulo__periodo">Del ${escRc(fechaRc(desde))} al ${escRc(fechaRc(hasta))}</div></div></header>` +
    `<div class="rc-titular" data-rc-corte><span class="rc-titular__rotulo">${tipo === 'cliente' ? 'Cliente' : 'Proveedor'}</span>` +
      `<span class="rc-titular__nombre">${escRc(nombre)}</span>${cuit ? `<span class="rc-titular__cuit">CUIT ${escRc(cuit)}</span>` : ''}` +
      `<span class="rc-titular__moneda">Importes en ${escRc(nombreMoneda(moneda))}</span></div>` +
    (r.saldoAnterior !== null
      ? `<div class="rc-anterior" data-rc-corte><span>Saldo anterior al ${escRc(fechaRc(desde))}</span><strong>${escRc(plataRc(r.saldoAnterior, moneda))}</strong></div>`
      : '') +
    htmlTabla(r) +
    `<div class="rc-final" data-rc-corte><span class="rc-final__rotulo">Saldo al ${escRc(fechaRc(hasta))}</span>` +
      `<span class="rc-final__monto">${escRc(plataRc(r.saldoFinal, moneda))}</span>` +
      `<span class="rc-final__texto">${escRc(textoSaldo(tipo, r.saldoFinal, nombre, empNombre))}</span></div>` +
    (r.sinImporte ? `<p class="rc-aviso" data-rc-corte>${escRc(r.sinImporte === 1 ? 'Hay 1 movimiento sin importe todavía: el saldo no lo incluye.' : `Hay ${r.sinImporte} movimientos sin importe todavía: el saldo no los incluye.`)}</p>` : '') +
    `<p class="rc-pie" data-rc-corte>Generado el ${escRc(generado)}</p>` +
    `</section>`
}

// La hoja entera: una sección por cuenta elegida.
// cuentas: [{ unidadId, moneda, titular?, filas }]; empresas: Map id → fila de unidades_negocio.
export function htmlResumen({ tipo, titular, cuentas, empresas, nombreUnidad, desde, hasta, generado }) {
  const secciones = (cuentas ?? []).map(c => htmlSeccionResumen({
    tipo, titular: c.titular || titular, empresa: empresas?.get?.(c.unidadId) ?? null,
    nombreEmpresa: c.unidadId ? (nombreUnidad ? nombreUnidad(c.unidadId) : '') : 'Sin empresa',
    moneda: c.moneda, resumen: resumirCuenta(c, desde, hasta), desde, hasta, generado,
  }))
  return `<div class="rc-hoja">${secciones.join('') || '<p class="rc-vacio">No hay movimientos para mostrar.</p>'}</div>`
}

// ── Los cortes de página del PDF ───────────────────────────────────────────

// limites: dónde se puede cortar (el fondo de cada renglón), en la misma
// medida que `alto`. Devuelve [[desde, hasta], …]: cada página lo más llena
// posible sin cortar un renglón; un renglón más alto que una página igual va.
export function cortesDePagina(limites, alto, altoPagina) {
  const cortes = []
  const lim = [...new Set((limites ?? []).filter(x => x > 0 && x < alto))].sort((a, b) => a - b)
  let ini = 0
  let vueltas = 0
  while (ini < alto && vueltas++ < 1000) {
    const max = ini + altoPagina
    if (max >= alto) { cortes.push([ini, alto]); break }
    const posibles = lim.filter(x => x > ini && x <= max)
    const fin = posibles.length ? posibles[posibles.length - 1] : max
    cortes.push([ini, fin])
    ini = fin
  }
  return cortes
}

// ── Estilos (la hoja va en blanco y negro, en mm y pt) ─────────────────────

export const ESTILOS_RESUMEN = `
.rc-abrir { display: inline-flex; align-items: center; gap: 0.375rem; min-height: 44px; padding: 0 1rem; border-radius: var(--radio-boton, 12px);
  border: 1px solid var(--color-borde-boton, #9A9287); background: var(--color-fondo, #fff); color: var(--color-texto, #1C1A17);
  font: inherit; font-weight: 600; cursor: pointer; }
.rc-abrir:hover { background: var(--color-acento-suave, #FDEEE4); }
.rc-fondo { position: fixed; inset: 0; z-index: 75; background: rgba(28, 26, 23, 0.45); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.rc-panel { background: var(--color-fondo, #fff); color: var(--color-texto, #1C1A17); border-radius: 16px; width: min(960px, 100%); max-height: calc(100vh - 2rem);
  display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.25); min-width: 0; }
.rc-panel__cab { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 1rem 1.25rem 0.5rem; }
.rc-panel__titulo { margin: 0; font-size: 1.25rem; }
.rc-panel__cerrar { min-width: 44px; min-height: 44px; border: none; background: transparent; font-size: 1.25rem; cursor: pointer; border-radius: 12px; }
.rc-panel__cerrar:hover { background: var(--color-fila-hover, #F6F3EF); }
.rc-opciones { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; padding: 0 1.25rem 0.75rem; }
.rc-opciones__fechas { display: flex; gap: 0.5rem; }
.rc-campo { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: var(--color-texto-2, #6B645A); min-width: 0; max-width: 100%; }
.rc-campo select { min-height: 44px; font: inherit; font-size: 16px; color: var(--color-texto, #1C1A17); border: 1px solid var(--color-borde-boton, #9A9287);
  border-radius: 12px; padding: 0 0.75rem; background: #fff; max-width: 100%; }
.rc-error { margin: 0 1.25rem 0.5rem; color: var(--bordo, #8B1E2D); font-weight: 600; }
.rc-error[hidden] { display: none; }
.rc-vista { flex: 1 1 auto; overflow: auto; background: var(--color-superficie, #F5F3EF); margin: 0 1.25rem; border-radius: 12px; padding: 0.75rem; min-height: 120px; }
.rc-vista .rc-hoja { background: #fff; padding: 8mm; width: 210mm; box-sizing: border-box; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
.rc-cargando { color: var(--color-texto-2, #6B645A); padding: 1rem; }
.rc-acciones { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem 1.25rem 1rem; justify-content: flex-end; }
.rc-acciones button { min-height: 44px; padding: 0 1rem; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer;
  border: 1px solid var(--color-borde-boton, #9A9287); background: #fff; color: var(--color-texto, #1C1A17); }
.rc-acciones button.rc-principal { background: var(--color-acento, #C2410C); border-color: var(--color-acento, #C2410C); color: #fff; }
.rc-acciones button[disabled] { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 640px) {
  .rc-fondo { padding: 0; align-items: stretch; }
  .rc-panel { border-radius: 0; max-height: 100vh; height: 100%; width: 100%; }
  .rc-opciones { padding: 0 1rem 0.75rem; }
  .rc-vista { margin: 0 0.5rem; padding: 0.375rem; }
  .rc-acciones { padding: 0.75rem 1rem 1rem; }
  .rc-acciones button { flex: 1 1 auto; }
}
.rc-hoja { color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.3; }
.rc-seccion + .rc-seccion { margin-top: 10mm; padding-top: 6mm; border-top: 1px dashed #000; }
.rc-cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm; border-bottom: 2px solid #000; padding-bottom: 3mm; }
.rc-empresa { display: flex; gap: 3mm; align-items: flex-start; min-width: 0; }
.rc-logo { width: 16mm; height: 16mm; object-fit: contain; filter: grayscale(1); }
.rc-empresa__nombre { font-size: 12pt; font-weight: 700; }
.rc-empresa__dato { font-size: 8.5pt; }
.rc-titulo { text-align: right; flex-shrink: 0; }
.rc-titulo__texto { font-size: 14pt; font-weight: 800; letter-spacing: 0.04em; }
.rc-titulo__periodo { font-size: 9pt; margin-top: 1mm; }
.rc-titular { display: flex; flex-wrap: wrap; gap: 1mm 4mm; align-items: baseline; padding: 3mm 0; border-bottom: 1px solid #000; }
.rc-titular__rotulo { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; }
.rc-titular__nombre { font-size: 12pt; font-weight: 700; overflow-wrap: anywhere; }
.rc-titular__moneda { margin-left: auto; font-size: 8pt; }
.rc-anterior { display: flex; justify-content: space-between; gap: 4mm; padding: 2.5mm 0; font-size: 10pt; }
.rc-tabla { width: 100%; border-collapse: collapse; table-layout: auto; }
.rc-tabla th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1.5mm 1.5mm; }
.rc-tabla td { padding: 1.3mm 1.5mm; border-bottom: 1px solid #999; vertical-align: top; overflow-wrap: anywhere; }
.rc-tabla tr { break-inside: avoid; }
.rc-tabla thead { display: table-header-group; }
.rc-num { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rc-c-fecha { white-space: nowrap; }
.rc-sin { font-style: italic; }
.rc-vacio { padding: 3mm 0; font-style: italic; }
.rc-final { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2mm 5mm; border-top: 2px solid #000; margin-top: 3mm; padding-top: 3mm; }
.rc-final__rotulo { font-size: 12pt; font-weight: 700; }
.rc-final__monto { font-size: 18pt; font-weight: 800; margin-left: auto; font-variant-numeric: tabular-nums; }
.rc-final__texto { flex-basis: 100%; text-align: right; font-size: 9pt; }
.rc-aviso { font-size: 8.5pt; font-style: italic; margin: 2mm 0 0; }
.rc-pie { font-size: 8pt; margin: 3mm 0 0; }
.rc-impresion { display: none; }
@media print {
  @page { size: A4; margin: 10mm; }
  html.rc-imprimiendo body > * { display: none !important; }
  html.rc-imprimiendo body > #rc-impresion { display: block !important; }
  html.rc-imprimiendo body { background: #fff !important; margin: 0 !important; }
  #rc-impresion .rc-seccion + .rc-seccion { break-before: page; margin-top: 0; padding-top: 0; border-top: none; }
}
`

export function asegurarEstilosResumen(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || doc.getElementById('rc-estilos')) return
  const s = doc.createElement('style')
  s.id = 'rc-estilos'
  s.textContent = ESTILOS_RESUMEN
  doc.head.appendChild(s)
}
asegurarEstilosResumen()

// ── Las empresas (sus datos para la cabecera) ──────────────────────────────

export async function leerEmpresasRc(sb, ids) {
  const lista = [...new Set((ids ?? []).filter(Boolean))]
  const mapa = new Map()
  if (!lista.length || !sb) return mapa
  const { data, error } = await sb.from('unidades_negocio').select('id, nombre, razon_social, cuit, domicilio, telefono, logo_url').in('id', lista)
  if (error) { console.error('No se pudieron leer los datos de las empresas:', error); return mapa }
  for (const u of data ?? []) mapa.set(u.id, u)
  return mapa
}

// ── El PDF ─────────────────────────────────────────────────────────────────

const ANCHO_MM = 194
const ALTO_PAGINA_MM = 281

async function esperarImagenes(raiz) {
  const imgs = [...raiz.querySelectorAll('img')]
  await Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r })))
}

export async function generarPdfResumen(html) {
  for (const url of LIBRERIAS_PDF) await cargarScript(url)
  const cont = document.createElement('div')
  cont.style.cssText = `position:fixed;left:-10000px;top:0;width:${ANCHO_MM}mm;background:#fff`
  cont.innerHTML = html
  document.body.appendChild(cont)
  try {
    await esperarImagenes(cont)
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const secciones = [...cont.querySelectorAll('.rc-seccion')]
    let primera = true
    for (const sec of (secciones.length ? secciones : [cont])) {
      const canvas = await window.html2canvas(sec, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const base = sec.getBoundingClientRect()
      const escala = canvas.height / (base.height || 1)
      const limites = [...sec.querySelectorAll('[data-rc-corte]')].map(el => (el.getBoundingClientRect().bottom - base.top) * escala)
      const pxPorMm = canvas.width / ANCHO_MM
      for (const [y0, y1] of cortesDePagina(limites, canvas.height, ALTO_PAGINA_MM * pxPorMm)) {
        const trozo = document.createElement('canvas')
        trozo.width = canvas.width
        trozo.height = Math.max(1, Math.round(y1 - y0))
        trozo.getContext('2d').drawImage(canvas, 0, Math.round(y0), canvas.width, trozo.height, 0, 0, canvas.width, trozo.height)
        if (!primera) pdf.addPage()
        primera = false
        pdf.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', 8, 8, ANCHO_MM, trozo.height / pxPorMm)
      }
    }
    return pdf.output('blob')
  } finally {
    cont.remove()
  }
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// Compartir: el PDF con navigator.share (WhatsApp entre las opciones); si el
// dispositivo no comparte archivos, se descarga y se abre WhatsApp con el texto.
export async function compartirResumen(blob, nombre, texto) {
  const archivo = typeof File === 'function' ? new File([blob], nombre, { type: 'application/pdf' }) : null
  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: texto, text: texto })
      return 'compartido'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelado'
    }
  }
  descargarBlob(blob, nombre)
  window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener')
  return 'descargado'
}

export function imprimirResumen(html) {
  asegurarEstilosResumen()
  let cont = document.getElementById('rc-impresion')
  if (!cont) {
    cont = document.createElement('div')
    cont.id = 'rc-impresion'
    cont.className = 'rc-impresion'
    document.body.appendChild(cont)
  }
  cont.innerHTML = html
  const raiz = document.documentElement
  raiz.classList.add('rc-imprimiendo')
  const listo = () => { raiz.classList.remove('rc-imprimiendo'); window.removeEventListener('afterprint', listo) }
  window.addEventListener('afterprint', listo)
  return esperarImagenes(cont).then(() => { window.print(); setTimeout(listo, 1500) })
}

// ── El panel ───────────────────────────────────────────────────────────────

let abierto = null

// ctx = {
//   sb, tipo: 'proveedor' | 'cliente', titular: { nombre, cuit },
//   unidadBarra,                 // la empresa de la barra de arriba (o null)
//   nombreUnidad: (id) => texto, // el nombre de una empresa
//   cargar: async () => cuentas | { cuentas, avisos },  // [{ unidadId, moneda, titular?, filas }]
//   abridor,                     // el botón (el foco vuelve ahí)
//   hoy, ahora,                  // para las pruebas
// }
export async function abrirResumenCuenta(ctx) {
  if (abierto) abierto.cerrar()
  asegurarEstilosResumen()
  const hoy = ctx.hoy || hoyIsoAr
  const ahora = ctx.ahora || (() => new Date())
  const rango = rangoDePeriodo('mes_pasado', hoy())
  const est = { cuentas: null, avisos: [], empresas: new Map(), eleccion: '', trabajando: false }

  const fondo = document.createElement('div')
  fondo.className = 'rc-fondo'
  fondo.id = 'rc-fondo'
  fondo.innerHTML =
    `<div class="rc-panel" role="dialog" aria-modal="true" aria-labelledby="rc-titulo">` +
      `<div class="rc-panel__cab"><h2 class="rc-panel__titulo" id="rc-titulo">Resumen de cuenta · ${escRc(ctx.titular?.nombre)}</h2>` +
        `<button type="button" class="rc-panel__cerrar" id="rc-cerrar" aria-label="Cerrar">✕</button></div>` +
      `<div class="rc-opciones">` +
        `<div class="rc-opciones__fechas"><input type="date" id="rc-desde"><input type="date" id="rc-hasta"></div>` +
        `<label class="rc-campo" id="rc-campo-empresa" hidden><span>Empresa</span><select id="rc-empresa"></select></label>` +
      `</div>` +
      `<p class="rc-error" id="rc-error" role="alert" hidden></p>` +
      `<div class="rc-vista" id="rc-vista"><p class="rc-cargando">Cargando la cuenta…</p></div>` +
      `<div class="rc-acciones">` +
        `<button type="button" class="rc-principal" id="rc-pdf" disabled>Descargar PDF</button>` +
        `<button type="button" id="rc-whatsapp" disabled>Compartir por WhatsApp</button>` +
        `<button type="button" id="rc-imprimir" disabled>Imprimir</button>` +
      `</div>` +
    `</div>`
  document.body.appendChild(fondo)

  const $ = (id) => fondo.querySelector('#' + id)
  const campoDesde = $('rc-desde'), campoHasta = $('rc-hasta')
  campoDesde.value = rango?.desde ?? ''
  campoHasta.value = rango?.hasta ?? ''
  crearPeriodo({ desde: campoDesde, hasta: campoHasta, id: 'rc-periodo', hoy, obligatorias: true })

  function error(texto) {
    const e = $('rc-error')
    e.textContent = texto || ''
    e.hidden = !texto
  }

  function htmlActual() {
    return htmlResumen({
      tipo: ctx.tipo, titular: ctx.titular, cuentas: cuentasDeEleccion(est.cuentas, est.eleccion), empresas: est.empresas,
      nombreUnidad: ctx.nombreUnidad, desde: campoDesde.value, hasta: campoHasta.value, generado: fechaHoraAr(ahora()),
    })
  }

  function pintar() {
    if (!est.cuentas) return
    const listo = !!(campoDesde.value && campoHasta.value)
    $('rc-vista').innerHTML = (est.avisos.length ? est.avisos.map(a => `<p class="rc-cargando">${escRc(a)}</p>`).join('') : '') +
      (listo ? htmlActual() : '<p class="rc-cargando">Elegí el período.</p>')
    for (const id of ['rc-pdf', 'rc-whatsapp', 'rc-imprimir']) $(id).disabled = !listo || est.trabajando
    ajustarZoom()
  }

  // La hoja se ve a su tamaño real (A4) y, si no entra (el celular), achicada
  // entera: la vista previa es la misma hoja del PDF, no otra armada para la
  // pantalla.
  function ajustarZoom() {
    const vista = $('rc-vista')
    const hoja = vista.querySelector('.rc-hoja')
    if (!hoja) return
    hoja.style.zoom = ''
    const estilo = getComputedStyle(vista)
    const disponible = vista.clientWidth - parseFloat(estilo.paddingLeft || 0) - parseFloat(estilo.paddingRight || 0)
    const ancho = hoja.offsetWidth
    if (ancho > 0 && disponible > 0 && disponible < ancho) hoja.style.zoom = String(Math.floor((disponible / ancho) * 1000) / 1000)
  }
  window.addEventListener('resize', ajustarZoom)

  function cerrar() {
    if (abierto !== control) return
    abierto = null
    document.removeEventListener('keydown', alTeclado)
    window.removeEventListener('resize', ajustarZoom)
    fondo.remove()
    if (ctx.abridor && ctx.abridor.isConnected) ctx.abridor.focus()
  }
  function alTeclado(e) {
    if (e.key === 'Escape' && !est.trabajando) {
      // El panel del período cierra lo suyo primero (corta el Escape).
      e.preventDefault()
      cerrar()
    }
  }
  const control = { cerrar, fondo }
  abierto = control
  document.addEventListener('keydown', alTeclado)

  $('rc-cerrar').addEventListener('click', cerrar)
  fondo.addEventListener('click', (e) => { if (e.target === fondo && !est.trabajando) cerrar() })
  campoDesde.addEventListener('change', pintar)
  campoHasta.addEventListener('change', pintar)
  $('rc-empresa').addEventListener('change', () => { est.eleccion = $('rc-empresa').value; pintar() })

  async function conTrabajo(fn) {
    if (est.trabajando) return
    est.trabajando = true
    error('')
    pintar()
    try { await fn() } catch (err) {
      console.error('Resumen de cuenta:', err)
      error('No se pudo armar el PDF: ' + (err?.message || 'probá de nuevo.'))
    } finally {
      est.trabajando = false
      pintar()
    }
  }
  const nombreDelArchivo = () => nombreArchivoResumen(ctx.titular?.nombre, campoDesde.value, campoHasta.value)
  $('rc-pdf').addEventListener('click', () => conTrabajo(async () => { descargarBlob(await generarPdfResumen(htmlActual()), nombreDelArchivo()) }))
  $('rc-whatsapp').addEventListener('click', () => conTrabajo(async () => {
    const r = await compartirResumen(await generarPdfResumen(htmlActual()), nombreDelArchivo(), textoCompartir(ctx.titular?.nombre, campoDesde.value, campoHasta.value))
    if (r === 'descargado') error('Se descargó el PDF: adjuntalo en WhatsApp.')
  }))
  $('rc-imprimir').addEventListener('click', () => conTrabajo(() => imprimirResumen(htmlActual())))
  $('rc-cerrar').focus()

  try {
    const r = await ctx.cargar()
    if (abierto !== control) return control
    const cuentas = Array.isArray(r) ? r : (r?.cuentas ?? [])
    est.avisos = Array.isArray(r) ? [] : (r?.avisos ?? [])
    est.empresas = await leerEmpresasRc(ctx.sb, cuentas.map(c => c.unidadId))
    if (abierto !== control) return control
    est.cuentas = cuentas
    const nombreDe = (id) => est.empresas.get(id)?.nombre || (ctx.nombreUnidad ? ctx.nombreUnidad(id) : '')
    const opciones = opcionesEmpresa(cuentas, nombreDe)
    est.eleccion = eleccionPorDefecto(opciones, ctx.unidadBarra)
    const sel = $('rc-empresa')
    sel.innerHTML = opciones.map(o => `<option value="${escRc(o.id)}">${escRc(o.nombre)}</option>`).join('') +
      (opciones.length > 1 ? `<option value="${TODAS_SEPARADAS}">Todas, separadas</option>` : '')
    sel.value = est.eleccion
    $('rc-campo-empresa').hidden = opciones.length < 2
    pintar()
  } catch (err) {
    console.error('Resumen de cuenta: no se pudo leer la cuenta:', err)
    if (abierto !== control) return control
    $('rc-vista').innerHTML = `<p class="rc-cargando">${escRc('No se pudo leer la cuenta: ' + (err?.message || 'probá de nuevo.'))}</p>`
  }
  return control
}
