// Mutaciones de test-materia-prima-precios.js: el precio de compra en el
// Ingreso de materia prima (27/10/2026). De a una. Ver mutar.js.
//
//   node pruebas/mut-materia-prima-precios.js
'use strict'

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

correrMutacionesEnVarios([
  {
    suite: path.join(__dirname, 'test-materia-prima-precios.js'),
    original: path.join(__dirname, '..', 'modulos', 'materia-prima.html'),
    funciones: [],
    manuales: [
      // Del OCR
      { nombre: 'el OCR siempre por unidad', de: "          return { precio: pu, porBulto: Math.abs(pu * bultos - pt) <= Math.abs(pu * total - pt) }", a: '          return { precio: pu, porBulto: false }' },
      { nombre: 'sin total, por unidad', de: "        return { precio: pu, porBulto: true }\n      }\n      if (pt != null && pt >= 0) {", a: "        return { precio: pu, porBulto: false }\n      }\n      if (pt != null && pt >= 0) {" },
      { nombre: 'el bulto de 1 cuenta como bulto', de: ' && contenido > 0 && contenido !== 1', a: ' && contenido > 0' },
      { nombre: 'solo el total no se usa', de: '        if (enBultos) return { precio: pt / bultos, porBulto: true }', a: '' },
      { nombre: 'solo el total sobre la cantidad no se usa', de: '        if (total != null && total > 0) return { precio: pt / total, porBulto: false }', a: '' },
      { nombre: 'cualquier IVA del OCR', de: '      return v != null && v >= 0 && v <= 100 ? v : null', a: '      return v' },
      { nombre: 'el IVA raro no va en Otro', de: 'ivaOtro: ivaOcr != null && !ALICUOTAS_IVA.includes(ivaOcr),', a: 'ivaOtro: false,' },
      { nombre: 'el precio del OCR sin marca', de: 'precioDeOcr: precioOcr.precio != null,', a: 'precioDeOcr: false,' },
      // Cuentas
      { nombre: 'por bulto sin dividir', de: '      return c ? Number(p) / c : null', a: '      return c ? Number(p) : null' },
      { nombre: 'por bulto sin contenido = por unidad', de: '      return c ? Number(p) / c : null', a: '      return c ? Number(p) / c : Number(p)' },
      { nombre: 'en mixto también por bulto', de: "      if (item.lineas || item.interpretacion === 'granel') return null\n      const c = Number(item.contenido)", a: "      const c = Number(item.contenido)" },
      { nombre: 'la factura X lleva IVA', de: "      return tipoDoc !== 'factura_a'", a: "      return tipoDoc === 'remito' || tipoDoc === 'sin_comprobante'" },
      { nombre: 'el IVA se suma mal', de: '      return precio == null ? null : precio * (1 + (Number(iva) || 0) / 100)', a: '      return precio == null ? null : precio + (Number(iva) || 0)' },
      { nombre: 'siempre "el bulto"', de: "      return String(cat?.nombre_bulto ?? '').trim() || 'bulto'", a: "      return 'bulto'" },
      { nombre: 'siempre "el"', de: "      return (/a$/i.test(n.split(/\\s+/)[0]) ? 'la ' : 'el ') + n", a: "      return 'el ' + n" },
      { nombre: 'los precios chicos con 2 decimales', de: 'decimales: Math.abs(v) < 10 ? DECIMALES_PRECIO : 2, minimos: 2', a: 'decimales: 2, minimos: 2' },
      { nombre: 'el final sin la bolsa', de: '      return item.precioPorBulto\n        ? `Precio final con IVA:', a: '      return false\n        ? `Precio final con IVA:' },
      // Lo que frena
      { nombre: 'por bulto sin contenido no frena', de: '      if (item.precioPorBulto && !contenidoParaPrecio(item)) {', a: '      if (false) {' },
      { nombre: 'factura A sin IVA no frena', de: "      if (item.iva == null) return 'Elegí el IVA del precio.'", a: '' },
      { nombre: 'IVA de más de 100 no frena', de: "      if (!(item.iva >= 0 && item.iva <= 100)) return 'El IVA va de 0 a 100 %.'", a: '' },
      { nombre: 'el remito sin IVA frena', de: '      if (ivaVaEnCero(tipoDoc)) return null\n', a: '' },
      { nombre: 'validarItems no lo mira', de: '        if (!item.error) item.error = errorPrecioItem(item, w.encabezado.tipoDoc)\n', a: '' },
      { nombre: 'el aviso amarillo también en remito', de: "      return tipoDoc === 'factura_a' && item.precio == null", a: '      return item.precio == null' },
      // Lo que se guarda
      { nombre: 'no se guarda el precio', de: '        ...precioParaBase(item, estado.wizard.encabezado.tipoDoc),\n', a: '' },
      { nombre: 'se guarda el del papel (por bulto)', de: '      const pu = precioPorUnidadItem(item)\n      if (pu == null) return { precio_unitario: null, alicuota_iva: null }', a: '      const pu = item.precio ?? null\n      if (pu == null) return { precio_unitario: null, alicuota_iva: null }' },
      { nombre: 'sin redondear a 4', de: 'precio_unitario: Math.round(pu * 10000) / 10000,', a: 'precio_unitario: Math.round(pu * 100) / 100,' },
      { nombre: 'sin precio, alícuota 0', de: "      if (pu == null) return { precio_unitario: null, alicuota_iva: null }", a: "      if (pu == null) return { precio_unitario: null, alicuota_iva: 0 }" },
      { nombre: 'el catálogo sin nombre del bulto', de: ", categoria, nombre_bulto')", a: ", categoria')" },
      // La tarjeta
      { nombre: 'la tarjeta sin el precio', de: '            ${htmlPrecioItem(item)}\n', a: '' },
      { nombre: 'sin la opción 10,5', de: 'const ALICUOTAS_IVA = [0, 10.5, 21, 27]', a: 'const ALICUOTAS_IVA = [0, 21, 27]' },
      { nombre: 'el elegido sin marcar', de: "${!item.ivaOtro && item.iva === a ? 'selected' : ''}", a: "${''}" },
      { nombre: 'sin "Otro"', de: "                <option value=\"otro\" ${item.ivaOtro ? 'selected' : ''}>Otro</option>\n", a: '' },
      { nombre: 'el remito pide IVA', de: '      const iva = ivaVaEnCero(tipoDoc)\n        ? `<div class="mp-precio__iva-fijo">', a: '      const iva = false\n        ? `<div class="mp-precio__iva-fijo">' },
      { nombre: 'el bulto sin escapar', de: "aria-pressed=\"${item.precioPorBulto ? 'true' : 'false'}\">${esc(textoPorBulto(item))}</button>", a: "aria-pressed=\"${item.precioPorBulto ? 'true' : 'false'}\">${textoPorBulto(item)}</button>" },
      { nombre: 'a granel también "por bulto"', de: "      const verModo = (item.interpretacion === 'bultos' && !item.lineas) || !!item.precioPorBulto", a: '      const verModo = true' },
      { nombre: 'sin contenido no ofrece "por bulto"', de: "      const verModo = (item.interpretacion === 'bultos' && !item.lineas) || !!item.precioPorBulto", a: '      const verModo = !!contenidoParaPrecio(item) || !!item.precioPorBulto' },
      { nombre: 'la cantidad no refresca el precio', de: '              refrescarPrecioEnVivo(tarjeta, item)\n', a: '' },
      { nombre: 'el rótulo no se refresca', de: '      if (porBulto) porBulto.textContent = textoPorBulto(item)\n', a: '' },
      { nombre: 'el aviso amarillo siempre escondido', de: "data-precio-falta ${faltaPrecioFacturaA(item, tipoDoc) ? '' : 'hidden'}>", a: 'data-precio-falta hidden>' },
      // Los campos
      { nombre: 'tipear no guarda', de: '          item.precio = leerCampoNumero(campo)\n', a: '' },
      { nombre: 'tipear no refresca', de: '          item.precioDeOcr = false\n          refrescar()', a: '          item.precioDeOcr = false' },
      { nombre: 'Otro no re-dibuja', de: "        if (sel.value === 'otro') { item.ivaOtro = true; item.iva = null; renderizarItems(); return }", a: "        if (sel.value === 'otro') { item.ivaOtro = true; item.iva = null; return }" },
      { nombre: 'cablearItems no engancha el precio', de: '        cablearPrecioItem(tarjeta, item)\n', a: '' },
      { nombre: 'los botones no cambian el modo', de: "              item.precioPorBulto = accion === 'precio-por-bulto'\n", a: '' },
    ],
  },
])
