// Mutaciones del resumen de cuenta (ver test-resumen-cuenta.js): el archivo
// común (js/resumen-cuenta.js) y lo que cada pantalla le pasa.
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-resumen-cuenta.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: path.join(RAIZ, 'js', 'resumen-cuenta.js'),
    funciones: ['htmlEmpresa', 'htmlTabla', 'htmlSeccionResumen', 'htmlResumen'],
    escape: 'escRc',
    manuales: [
      // El Debe y el Haber.
      { nombre: 'proveedor: el pago va al haber', de: '    debe: monto !== null && monto < 0 ? -monto : null,\n    haber: monto !== null && monto >= 0 ? monto : null,', a: '    haber: monto !== null && monto < 0 ? -monto : null,\n    debe: monto !== null && monto >= 0 ? monto : null,' },
      { nombre: 'proveedor: el pago en negativo', de: 'debe: monto !== null && monto < 0 ? -monto : null,', a: 'debe: monto !== null && monto < 0 ? monto : null,' },
      { nombre: 'proveedor: sin importe no se marca', de: '    sinImporte: monto === null,', a: '    sinImporte: false,' },
      { nombre: 'proveedor: un null va como cero', de: '  const monto = numeroRc(m?.monto)', a: '  const monto = Number(m?.monto)' },
      { nombre: 'cliente: la cobranza va al debe', de: '    debe: importe !== null && importe > 0 ? importe : null,\n    haber: importe !== null && importe < 0 ? -importe : null,', a: '    debe: importe !== null && importe < 0 ? -importe : null,\n    haber: importe !== null && importe > 0 ? importe : null,' },
      { nombre: 'proveedor: el saldo no es el de la vista', de: '    saldo: numeroRc(m?.saldo_acumulado),', a: '    saldo: numeroRc(m?.monto),' },
      { nombre: 'numeroRc: el vacío es cero', de: "  if (v === null || v === undefined || v === '') return null\n  const n = typeof v", a: "  if (v === null || v === undefined || v === '') return 0\n  const n = typeof v" },
      // Las cuentas.
      { nombre: 'no ordena por fecha', de: '  for (const c of cuentas) c.filas.sort(porFecha)', a: '  void porFecha' },
      { nombre: 'el mismo día no mira orden_desempate', de: "  const oa = a.orden ?? '', ob = b.orden ?? ''\n  if (oa === ob) return 0", a: "  const oa = a.orden ?? '', ob = b.orden ?? ''\n  return 0" },
      { nombre: 'no separa por empresa', de: "    const clave = (unidad ?? '') + '|' + moneda", a: "    const clave = moneda" },
      { nombre: 'no separa por moneda', de: "    const clave = (unidad ?? '') + '|' + moneda", a: "    const clave = (unidad ?? '')" },
      { nombre: 'no saca la fábrica que no se ve', de: '    if (unidadVisible && !unidadVisible(unidad)) continue\n', a: '' },
      // El período.
      { nombre: 'el borde de hasta queda afuera', de: '    if (h && fecha > h) continue', a: '    if (h && fecha >= h) continue' },
      { nombre: 'el borde de desde queda afuera', de: '    if (d && fecha < d) { anterior = s; saldo = s; continue }', a: '    if (d && fecha <= d) { anterior = s; saldo = s; continue }' },
      { nombre: 'el anterior es el primero, no el último', de: '    if (d && fecha < d) { anterior = s; saldo = s; continue }', a: '    if (d && fecha < d) { if (!anterior) anterior = s; saldo = s; continue }' },
      { nombre: 'sin desde hay saldo anterior', de: '    saldoAnterior: d ? anterior : null,', a: '    saldoAnterior: anterior,' },
      { nombre: 'un saldo null es cero', de: '    const s = f.saldo ?? saldo', a: '    const s = f.saldo ?? 0' },
      { nombre: 'no cuenta los sin importe', de: '    sinImporte: movimientos.filter(m => m.sinImporte).length,', a: '    sinImporte: 0,' },
      // La empresa.
      { nombre: 'por defecto no mira la barra', de: '  if (unidadBarra && opciones.some(o => o.id === unidadBarra)) return unidadBarra\n', a: '' },
      { nombre: 'la barra gana aunque no tenga cuenta ahí', de: '  if (unidadBarra && opciones.some(o => o.id === unidadBarra)) return unidadBarra', a: '  if (unidadBarra) return unidadBarra' },
      { nombre: 'con una sola, todas', de: '  if (opciones.length === 1) return opciones[0].id\n', a: '' },
      { nombre: 'elegir una empresa no filtra', de: "  return (cuentas ?? []).filter(c => (c.unidadId ?? '') === (eleccion ?? ''))", a: '  return [...(cuentas ?? [])]' },
      { nombre: 'todas separadas deja una', de: '  if (eleccion === TODAS_SEPARADAS) return [...(cuentas ?? [])]', a: '  if (eleccion === TODAS_SEPARADAS) return (cuentas ?? []).slice(0, 1)' },
      // La hoja.
      { nombre: 'no dice el saldo anterior', de: "    (r.saldoAnterior !== null\n", a: "    (false\n" },
      { nombre: 'la descarga sin importe muestra su cero', de: "`<td class=\"rc-num\">${m.sinImporte ? '—' : escRc(celdaRc(m.debe))}</td>`", a: '`<td class="rc-num">${escRc(formatearNumeroAr(m.debe ?? 0))}</td>`' },
      { nombre: 'plataRc: un ausente es $ 0,00', de: "  return t === '—' ? '—' : simbolo(moneda) + ' ' + t", a: "  return simbolo(moneda) + ' ' + (t === '—' ? '0,00' : t)" },
      { nombre: 'celdaRc: lo que no va es "—"', de: "  return n === null || n === undefined ? '' : formatearNumeroAr(n)", a: '  return formatearNumeroAr(n)' },
      { nombre: 'el saldo final sale del anterior', de: '`<span class="rc-final__monto">${escRc(plataRc(r.saldoFinal, moneda))}</span>`', a: '`<span class="rc-final__monto">${escRc(plataRc(r.saldoAnterior, moneda))}</span>`' },
      { nombre: 'el logo sin logoSeguro', de: '  const logo = logoSeguro(emp?.logo_url)', a: '  const logo = emp?.logo_url' },
      { nombre: 'sin el aviso de sin importe', de: '    (r.sinImporte ? `<p class="rc-aviso"', a: '    (false ? `<p class="rc-aviso"' },
      { nombre: 'escRc no escapa comillas', de: ".replace(/\"/g, '&quot;')", a: '' },
      // El escape de cada texto de la base (el escáner de interpolaciones no
      // corre sobre un .js: van a mano).
      { nombre: 'sin escape: el nombre del titular', de: '<span class="rc-titular__nombre">${escRc(nombre)}</span>', a: '<span class="rc-titular__nombre">${nombre}</span>' },
      { nombre: 'sin escape: el CUIT del titular', de: '`<span class="rc-titular__cuit">CUIT ${escRc(cuit)}</span>`', a: '`<span class="rc-titular__cuit">CUIT ${cuit}</span>`' },
      { nombre: 'sin escape: el comprobante', de: '`<td class="rc-c-comp">${escRc(m.comprobante)}</td>`', a: '`<td class="rc-c-comp">${m.comprobante}</td>`' },
      { nombre: 'sin escape: el detalle', de: '`<td class="rc-c-det">${escRc(m.detalle)}', a: '`<td class="rc-c-det">${m.detalle}' },
      { nombre: 'sin escape: el nombre de la empresa', de: '<div class="rc-empresa__nombre">${escRc(nombre)}</div>', a: '<div class="rc-empresa__nombre">${nombre}</div>' },
      { nombre: 'sin escape: los datos de la empresa', de: '`<div class="rc-empresa__dato">${escRc(x)}</div>`', a: '`<div class="rc-empresa__dato">${x}</div>`' },
      { nombre: 'sin escape: la fecha de generado', de: '`<p class="rc-pie" data-rc-corte>Generado el ${escRc(generado)}</p>`', a: '`<p class="rc-pie" data-rc-corte>Generado el ${generado}</p>`' },
      { nombre: 'sin escape: el saldo en palabras', de: '<span class="rc-final__texto">${escRc(textoSaldo(tipo, r.saldoFinal, nombre, empNombre))}</span>', a: '<span class="rc-final__texto">${textoSaldo(tipo, r.saldoFinal, nombre, empNombre)}</span>' },
      { nombre: 'el saldo en palabras al revés', de: "  if (tipo === 'cliente') return n > 0 ? `${quien} le debe a ${nos}.` : `${quien} tiene saldo a su favor.`", a: "  if (tipo === 'cliente') return n < 0 ? `${quien} le debe a ${nos}.` : `${quien} tiene saldo a su favor.`" },
      { nombre: 'la hora en UTC', de: "    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric'", a: "    timeZone: 'UTC', year: 'numeric'" },
      // Los cortes del PDF.
      { nombre: 'corta en la medida de la hoja sin mirar renglones', de: '    const fin = posibles.length ? posibles[posibles.length - 1] : max', a: '    const fin = max' },
      { nombre: 'corta en el primer renglón posible', de: '    const fin = posibles.length ? posibles[posibles.length - 1] : max', a: '    const fin = posibles.length ? posibles[0] : max' },
    ],
  },
  {
    suite: SUITE,
    original: path.join(RAIZ, 'modulos', 'cuentas-corrientes.html'),
    variable: 'ARCHIVO_CC',
    funciones: [],
    manuales: [
      { nombre: 'CC: sin el botón', de: '<button type="button" class="rc-abrir" id="btn-resumen-cuenta-ficha">Descargar resumen de cuenta</button>', a: '' },
      { nombre: 'CC: el botón no abre nada', de: "document.getElementById('btn-resumen-cuenta-ficha').addEventListener('click', (e) => abrirResumenProveedor(e.currentTarget))", a: 'void 0' },
      { nombre: 'CC: el pago sin su etiqueta', de: "      if (m?.tipo === 'pago') return { comprobante: 'Pago', detalle: etiquetas?.get(m.gasto_id) || '' }", a: "      if (m?.tipo === 'pago') return { comprobante: 'Pago', detalle: '' }" },
      { nombre: 'CC: el saldo inicial como factura', de: "        if (esSaldoInicial(m)) return { comprobante: 'Saldo inicial', detalle: observaciones?.get(m.factura_pendiente_id) || '' }\n", a: '' },
      { nombre: 'CC: el crédito sin su factura', de: "detalle: 'A ' + numeroParaMostrar(m.referencia) }", a: "detalle: '' }" },
      { nombre: 'CC: el interés sin su factura', de: "detalle: 'Sobre ' + numeroParaMostrar(m.referencia) }", a: "detalle: '' }" },
      { nombre: 'CC: lee solo una página', de: '          .range(p * 1000, p * 1000 + 999)', a: '          .range(0, 999)' },
      { nombre: 'CC: no saca la fábrica de pruebas', de: '            unidadVisible: id => !id || visibles.has(id),', a: '            unidadVisible: () => true,' },
    ],
  },
  {
    suite: SUITE,
    original: path.join(RAIZ, 'modulos', 'administracion.html'),
    variable: 'ARCHIVO_ADM',
    funciones: [],
    manuales: [
      { nombre: 'Adm: sin el botón', de: '        <button type="button" class="ad-btn ad-btn--suave" id="ad-btn-resumen">Descargar resumen de cuenta</button>\n', a: '' },
      { nombre: 'Adm: el botón no abre nada', de: "document.getElementById('ad-btn-resumen').addEventListener('click', (e) => abrirResumenCliente(e.currentTarget))", a: 'void 0' },
      { nombre: 'Adm: el retiro sin su código', de: "      return { comprobante: codigo ? `${tipo} ${codigo}` : tipo, detalle: detalleMovimiento(m, codigos) }", a: '      return { comprobante: tipo, detalle: detalleMovimiento(m, codigos) }' },
      { nombre: 'Adm: no suma las otras fábricas', de: '          const cuentas = [propia, ...leidas.filter(Boolean)].map(', a: '          const cuentas = [propia].map(' },
      { nombre: 'Adm: el botón se ofrece sin la cuenta', de: "      document.getElementById('ad-btn-resumen').disabled = !c.cuenta\n", a: '' },
    ],
  },
])
