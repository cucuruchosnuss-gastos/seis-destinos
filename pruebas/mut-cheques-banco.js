// Mutaciones de test-cheques-banco.js (depositar y vender al banco,
// 13/10/2026). Ver mutar.js. Cuatro archivos: la región de Cheques de
// administracion.html, js/cobranzas-comun.js, cobranzas.html y gastos.html.
//
//   node pruebas/mut-cheques-banco.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cheques-banco.js')

correrMutacionesEnVarios([
  {
    region: limitesCheques,
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
    escape: 'esc',
    funciones: ['htmlOpcionesCuentas'],
    manuales: [
      { nombre: 'sin el filtro "Vendidos"', de: "      { id: 'vendidos', nombre: 'Vendidos' },\n", a: '' },
      { nombre: 'la tasa redondea para abajo', de: 'descCent = Math.round(brutoCent * v / 100)', a: 'descCent = Math.floor(brutoCent * v / 100)' },
      { nombre: 'la tasa que se muestra sin decimales', de: 'tasa: Math.round(descCent * 10000 / brutoCent) / 100', a: 'tasa: Math.round(descCent * 100 / brutoCent)' },
      { nombre: '"Acreditó" se toma como el descuento', de: "if (desde === 'neto') descCent = brutoCent - Math.round(v * 100)", a: "if (desde === 'neto') descCent = Math.round(v * 100)" },
      { nombre: 'la cuenta por defecto no es la primera', de: '[0]?.cuentas[0]?.id ?? null', a: '[0]?.cuentas[1]?.id ?? null' },
      { nombre: 'avisa "entre empresas" también en el banco de la misma fábrica', de: '        if (!u || u === destino) continue', a: '        if (!u) continue' },
      { nombre: 'depositar sin cuenta sigue', de: "      if (TIPOS_BANCO.includes(tipo) && !cuentaId) e.push('Elegí la cuenta del banco.')\n", a: '' },
      { nombre: 'vender más de lo que valen sigue', de: '        else if (venta.netoCent > brutoCent)', a: '        else if (false)' },
      { nombre: 'un doble toque manda dos veces', de: '      if (s.enviando) return\n', a: '' },
      { nombre: 'lo acreditado viaja en centavos', de: 'p.p_neto = venta.netoCent / 100', a: 'p.p_neto = venta.netoCent' },
      { nombre: 'el detalle viaja sin limpiar', de: 'p.p_detalle = textoOpcional(detalle)', a: 'p.p_detalle = detalle' },
      { nombre: 'vender va por depositar_cheques', de: "const rpc = datos.tipo === 'vendido' ? 'vender_cheques' : 'depositar_cheques'", a: "const rpc = 'depositar_cheques'" },
      { nombre: 'escribir en un campo de la venta pisa ese mismo campo', de: '        if (k === desdeCampo) continue\n', a: '' },
      { nombre: 'se ofrecen cuentas en dólares', de: "todas.filter(c => c.moneda === 'ARS' && c.activa !== false", a: "todas.filter(c => c.activa !== false" },
      { nombre: 'se ofrecen cuentas inactivas', de: "c.moneda === 'ARS' && c.activa !== false && c.medio === 'banco'", a: "c.moneda === 'ARS' && c.medio === 'banco'" },
      { nombre: 'se ofrece la fábrica de pruebas', de: "          estado.fabrica, c => c.unidad_negocio_id)\n        estado.nombresUnidades", a: "          FABRICA_SIN_DATOS, c => c.unidad_negocio_id)\n        estado.nombresUnidades" },
      { nombre: 'se ofrecen cuentas de personas', de: '.filter(c => empresa.has(c.empleado_id))', a: '.filter(c => true)' },
      { nombre: 'si falla, tira', de: "        console.error('No se pudieron leer las cuentas de banco:', err)\n        estado.cuentasBanco = { porId: new Map(), ofrecidas: [] }\n        estado.cuentasBancoError = true",
        a: "        throw err" },
      { nombre: 'el interés de una venta mal calculado', de: 'Math.round(imp * 100) - Math.round(neto * 100)', a: 'Math.round(neto * 100)' },
      { nombre: '"Ver el gasto" sin encodeURIComponent', de: 'gastos.html?gasto=${encodeURIComponent(ch.venta_gasto_id)}', a: 'gastos.html?gasto=${ch.venta_gasto_id}' },
      { nombre: 'un vendido no cuenta como salido', de: '      return ESTADOS_SALIDOS.includes(ch?.estado)', a: "      return ['depositado', 'endosado'].includes(ch?.estado)" },
      { nombre: 'volver a cartera no dice que vuelve el interés', de: "${interes > 0 ? ` y vuelve el interés de ${formatearImporte(interes / 100)}` : ''}", a: '' },
      { nombre: 'la barra solo con "Endosar"', de: "const BOTONES_LOTE = ['chq-sel-depositar', 'chq-sel-vender', 'chq-sel-dar-salida']", a: "const BOTONES_LOTE = ['chq-sel-dar-salida']" },
      { nombre: 'el diálogo del lote no viene con su tipo', de: 'cobranza: minima ? { fecha: minima } : null, tipo }', a: 'cobranza: minima ? { fecha: minima } : null, tipo: null }' },
      { nombre: 'la lista no trae la cuenta ni la venta', de: ', salida_cuenta_id, venta_neto, venta_gasto_id', a: '' },
      { nombre: '"Vender al banco" abre el depósito', de: "abrirModalSalidaLote('vendido')", a: "abrirModalSalidaLote('depositado')" },
      { nombre: 'la venta se ve también al depositar', de: "document.getElementById('chq-venta').hidden = !(banco && s.tipo === 'vendido')", a: "document.getElementById('chq-venta').hidden = !banco" },
      { nombre: 'nunca avisa entre empresas', de: '      aviso.hidden = !entre\n', a: '      aviso.hidden = true\n' },
      { nombre: 'vender no limpia la selección', de: '        if (s.lote) cancelarSeleccion()\n        mostrarExito(textoResultadoBanco', a: '        mostrarExito(textoResultadoBanco' },
      { nombre: 'la cuenta del resumen sin escapar', de: "a ${esc(cuenta?.nombre ?? 'la cuenta elegida')}.</span></div>", a: "a ${cuenta?.nombre ?? 'la cuenta elegida'}.</span></div>" },
      { nombre: 'el texto del resultado ignora lo que devolvió la base', de: "      const n = Number(res?.cheques) || 0\n", a: '      const n = 1\n' },
      { nombre: 'la cuenta del selector no queda elegida', de: "      sel.value = s.cuentaId ?? ''\n      for (const id of", a: "      for (const id of" },
      { nombre: 'la tasa sin tope de 100', de: "{ decimales: 2, max: 100 }", a: '{ decimales: 2 }' },
    ],
  },
  {
    suite: SUITE,
    variable: 'ARCHIVO_COMUN_TEST',
    original: path.join(RAIZ, 'js', 'cobranzas-comun.js'),
    funciones: [],
    manuales: [
      { nombre: 'el común no sabe decir "Vendido el …"', de: "  if (estadoCheque === 'vendido') return `Vendido${cuando}${d ? ` en ${d}` : ''}`\n", a: '' },
    ],
  },
  {
    suite: SUITE,
    variable: 'ARCHIVO_COB_TEST',
    original: path.join(RAIZ, 'modulos', 'cobranzas.html'),
    funciones: [],
    manuales: [
      { nombre: 'cobranzas.html: un vendido no cuenta como salido', de: '      const salido = ESTADOS_SALIDOS.includes(ch.estado)\n', a: "      const salido = ch.estado === 'depositado' || ch.estado === 'endosado'\n" },
      { nombre: 'cobranzas.html: con un vendido deja editar', de: 'd.cheques.some(ch => ESTADOS_SALIDOS.includes(ch.estado))', a: "d.cheques.some(ch => ch.estado === 'depositado')" },
    ],
  },
  {
    suite: SUITE,
    variable: 'ARCHIVO_GASTOS_TEST',
    original: path.join(RAIZ, 'modulos', 'gastos.html'),
    funciones: [],
    manuales: [
      { nombre: 'Gastos: el interés de la venta sin su ícono', de: "'Intereses-Venta de cheques': 'percent',", a: "'Intereses-Venta de cheques': 'tag'," },
      { nombre: 'Gastos: las comisiones sin su ícono', de: "'Comisiones':                 'handshake',", a: '' },
    ],
  },
])
