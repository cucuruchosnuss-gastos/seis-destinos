// Mutaciones de test-stock-numeros.js. Ver mutar.js (los tres guards: suite
// verde sobre el limpio, ancla única, mutación que cambia algo).
//
//   node pruebas/mut-stock-numeros.js
//
// Sin automáticas (funciones: []): estos renders no agregan interpolaciones
// nuevas. Cada una rompe, de a una, una lectura (vuelve a Number / parseFloat),
// una escritura (saca el ponerNumero), un enlace, la regla de decimales o de
// signo, o un formateador. Todas tienen que dar ROJO.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const PF = (x) => `(String(${x} ?? '').trim() === '' ? null : parseFloat(String(${x}).replace(',', '.')))`
const NUM = (x) => `(String(${x} ?? '').trim() === '' ? null : Number(${x}))`

const PARSER = '      return leerNumeroAr(crudo, { decimales: decimalesCantidad(unidad), negativos: permitirNegativos })'
const REC_CONT = "        const n = parsearCantidad(document.getElementById('rec-contenido').value)"
const MOV_CONT = "        const n = parsearCantidad(document.getElementById('mov-contenido').value)"
const ANOTAR = '      item.cantidad_contada = parsearCantidad(crudo, { unidad: item.unidad_medida })'
const TOL = "        tolerancia = leerCampoNumero(document.getElementById('campo-tolerancia'))"
const EXCEL = "      const n = leerNumeroAr(typeof crudo === 'number' ? crudo : texto, { decimales: 2, negativos: true })"
const CANT_MOV = "      const crudo = document.getElementById('mov-cantidad').value\n      const n = parsearCantidad(crudo, {"
const CANT_TI = "      const n = parsearCantidad(document.getElementById('ti-cantidad').value, {\n        unidad: ti.insumo.unidad_medida ?? '',\n      })"

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-numeros.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/stock.html'),
  funciones: [],
  manuales: [
    // ── Lecturas ─────────────────────────────────────────────────────────────
    { nombre: 'parsearCantidad vuelve a parseFloat', de: PARSER, a: `      const n = ${PF('crudo')}\n      return Number.isFinite(n) ? n : null` },
    { nombre: 'parsearCantidad vuelve a Number', de: PARSER, a: `      const n = ${NUM('crudo')}\n      return Number.isFinite(n) ? n : null` },
    { nombre: 'parsearCantidad ignora la unidad (todo con 3 decimales)', de: PARSER, a: '      return leerNumeroAr(crudo, { decimales: 3, negativos: permitirNegativos })' },
    { nombre: 'parsearCantidad ignora permitirNegativos', de: PARSER, a: '      return leerNumeroAr(crudo, { decimales: decimalesCantidad(unidad) })' },
    { nombre: 'el conteo se lee con parseFloat', de: ANOTAR, a: `      item.cantidad_contada = ${PF('crudo')}` },
    { nombre: 'el conteo se lee con Number', de: ANOTAR, a: `      item.cantidad_contada = ${NUM('crudo')}` },
    { nombre: 'el contenido del recuento se lee con parseFloat', de: REC_CONT, a: `        const n = ${PF("document.getElementById('rec-contenido').value")}` },
    { nombre: 'el contenido del recuento se lee con Number', de: REC_CONT, a: `        const n = ${NUM("document.getElementById('rec-contenido').value")}` },
    { nombre: 'el contenido del movimiento se lee con parseFloat', de: MOV_CONT, a: `        const n = ${PF("document.getElementById('mov-contenido').value")}` },
    { nombre: 'el contenido del movimiento se lee con Number', de: MOV_CONT, a: `        const n = ${NUM("document.getElementById('mov-contenido').value")}` },
    { nombre: 'la cantidad del movimiento se lee con parseFloat',
      de: CANT_MOV, a: `      const crudo = document.getElementById('mov-cantidad').value\n      const n = ${PF('crudo')} ?? parsearCantidad(crudo, {` },
    { nombre: 'la cantidad del movimiento se lee con Number',
      de: CANT_MOV, a: `      const crudo = document.getElementById('mov-cantidad').value\n      const n = ${NUM('crudo')} ?? parsearCantidad(crudo, {` },
    { nombre: 'la cantidad de la transferencia se lee con parseFloat', de: CANT_TI, a: `      const n = ${PF("document.getElementById('ti-cantidad').value")}` },
    { nombre: 'la cantidad de la transferencia se lee con Number', de: CANT_TI, a: `      const n = ${NUM("document.getElementById('ti-cantidad').value")}` },
    { nombre: 'la tolerancia se lee con parseFloat', de: TOL, a: `        tolerancia = ${PF('crudo')}` },
    { nombre: 'la tolerancia se lee con Number', de: TOL, a: `        tolerancia = ${NUM('crudo')}` },
    { nombre: 'la tolerancia del Excel vuelve a Number(replace)', de: EXCEL, a: "      const n = Number.isFinite(Number(texto.replace(',', '.'))) ? Number(texto.replace(',', '.')) : null" },
    // ── Escrituras ───────────────────────────────────────────────────────────
    { nombre: 'el conteo guardado se escribe como texto crudo (sin ponerNumero)',
      de: '        ponerCantidadEnCampo(input, item?.cantidad_contada ?? null)',
      a: "        input.value = item?.cantidad_contada == null ? '' : String(item.cantidad_contada).replace('.', ',')" },
    { nombre: 'la tolerancia se precarga cruda con punto (sin ponerNumero)',
      de: "      ponerCantidadEnCampo(document.getElementById('campo-tolerancia'), i?.tolerancia_merma_pct ?? null)",
      a: "      document.getElementById('campo-tolerancia').value = i?.tolerancia_merma_pct ?? ''" },
    { nombre: 'el campo re-creado pierde el número que tenía',
      de: '        ponerCantidadEnCampo(el, previo)\n', a: '' },
    { nombre: 'ponerCantidadEnCampo redondea en silencio lo que no entra',
      de: '      el.value = formatearNumeroAr(n, { decimales: 6, minimos: 0 })\n', a: '' },
    { nombre: 're-renderizar el recuento reescribe lo tipeado ("0,300" → "0,30")',
      de: '          input.value = item.textoCantidad\n', a: '' },
    { nombre: 're-renderizar el recuento no recupera el foco',
      de: '        if (enfocado !== null && input.dataset.cantidad === enfocado) {\n          input.focus()\n',
      a: '        if (false) {\n          input.focus()\n' },
    { nombre: 'recargar los ítems olvida lo tipeado',
      de: '          textoCantidad: prev?.textoCantidad ?? null,', a: '          textoCantidad: null,' },
    { nombre: 'guardar_conteo deja de mandar la observación',
      de: "          observacion: i.observacion ?? '',\n", a: '' },
    // ── Enlaces, decimales y signo ───────────────────────────────────────────
    { nombre: 'el recuento no enlaza sus campos',
      de: '        enlazarCampoNumero(input, { decimales: decimalesCantidad(item?.unidad_medida) })\n', a: '' },
    { nombre: 'el recuento enlaza todo con 3 decimales',
      de: '        enlazarCampoNumero(input, { decimales: decimalesCantidad(item?.unidad_medida) })', a: '        enlazarCampoNumero(input, { decimales: 3 })' },
    { nombre: 'el contenido del recuento no se enlaza',
      de: "    enlazarCampoNumero(document.getElementById('rec-contenido'), { decimales: DECIMALES_CANTIDAD })\n", a: '' },
    { nombre: 'el contenido del movimiento no se enlaza',
      de: "    enlazarCampoNumero(document.getElementById('mov-contenido'), { decimales: DECIMALES_CANTIDAD })\n", a: '' },
    { nombre: 'la tolerancia no se enlaza',
      de: "    enlazarCampoNumero(document.getElementById('campo-tolerancia'), { decimales: 2, max: 100 })\n", a: '' },
    { nombre: 'la tolerancia sin tope de 100',
      de: "    enlazarCampoNumero(document.getElementById('campo-tolerancia'), { decimales: 2, max: 100 })", a: "    enlazarCampoNumero(document.getElementById('campo-tolerancia'), { decimales: 2 })" },
    { nombre: 'las unidades enteras admiten decimales',
      de: '      return esUnidadEntera(unidad) ? 0 : DECIMALES_CANTIDAD', a: '      return DECIMALES_CANTIDAD' },
    { nombre: 'kilos con 2 decimales en vez de 3',
      de: '    const DECIMALES_CANTIDAD = 3\n', a: '    const DECIMALES_CANTIDAD = 2\n' },
    { nombre: 'la baja admite el "-" tipeado',
      de: "        negativos: m?.modo === 'ajuste',", a: '        negativos: true,' },
    { nombre: 'el ajuste no admite el "-" tipeado',
      de: "        negativos: m?.modo === 'ajuste',", a: '        negativos: false,' },
    { nombre: 'elegir insumo en el movimiento no re-prepara el campo',
      de: '      estado.mov.insumo = i\n      prepararCantidadMov()\n', a: '      estado.mov.insumo = i\n' },
    { nombre: 'cambiar de modo no re-prepara el campo',
      de: '      m.signo = 0\n      prepararCantidadMov()\n', a: '      m.signo = 0\n' },
    { nombre: 'elegir insumo en la transferencia no re-prepara el campo',
      de: '      ti.insumo = i\n      prepararCantidadTi()\n', a: '      ti.insumo = i\n' },
    { nombre: 'el campo re-creado pierde su listener',
      de: '      el.addEventListener(\'input\', alEscribir)\n', a: '' },
    { nombre: 'prepararCampoCantidad nunca re-crea el campo',
      de: '      if (!el || _reglaCampoCantidad.get(id) === clave) return el', a: '      if (!el || _reglaCampoCantidad.has(id)) return el' },
    // ── Formateadores ────────────────────────────────────────────────────────
    { nombre: 'formatearCantidadStock vuelve al cero inventado',
      de: "      const num = formatearNumeroAr(n, { decimales: DECIMALES_CANTIDAD, minimos: 0 })\n      if (num === '—') return '—'\n",
      a: "      const num = Number(n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 3 })\n" },
    { nombre: 'formatearCantidadStock con null dice "— kg"',
      de: "      const num = formatearNumeroAr(n, { decimales: DECIMALES_CANTIDAD, minimos: 0 })\n      if (num === '—') return '—'\n",
      a: "      const num = formatearNumeroAr(n, { decimales: DECIMALES_CANTIDAD, minimos: 0 })\n" },
    { nombre: 'formatearCantidadStock rellena con ceros',
      de: "      const num = formatearNumeroAr(n, { decimales: DECIMALES_CANTIDAD, minimos: 0 })\n      if (num === '—') return '—'\n",
      a: "      const num = formatearNumeroAr(n, { decimales: DECIMALES_CANTIDAD })\n      if (num === '—') return '—'\n" },
    { nombre: 'los bultos sin separador de miles',
      de: '${formatearNumeroAr(e.enteros, { decimales: 0 })}', a: '${e.enteros}' },
    { nombre: 'la tolerancia del catálogo se muestra con punto',
      de: "`merma ${formatearNumeroAr(i.tolerancia_merma_pct, { decimales: 2, minimos: 0 })}%`", a: '`merma ${i.tolerancia_merma_pct}%`' },
    { nombre: 'la tolerancia del detalle se muestra con punto',
      de: "`${formatearNumeroAr(i.tolerancia_merma_pct, { decimales: 2, minimos: 0 })}%`", a: '`${i.tolerancia_merma_pct}%`' },
  ],
})
