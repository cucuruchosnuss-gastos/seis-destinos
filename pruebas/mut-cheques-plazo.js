// Mutaciones de test-cheques-plazo.js (Parte 6). Ver mutar.js.
//
//   node pruebas/mut-cheques-plazo.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cheques-plazo.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cheques.html'),
  escape: 'esc',
  funciones: ['htmlAvisoVencimientos'],
  equivalentes: [
    { expr: 'esc(texto)', motivo: 'se arma con cantidades y formatearImporte(): solo dígitos, puntos, comas, "$" y palabras fijas' },
  ],
  manuales: [
    { nombre: 'el aviso pasa de 7 a 8 días',
      de: 'const DIAS_AVISO_VENCIMIENTO = 7', a: 'const DIAS_AVISO_VENCIMIENTO = 8' },
    { nombre: 'un común usa la fecha de pago',
      de: "const base = ch.tipo === 'diferido' ? ch.fecha_pago : ch.fecha_emision", a: "const base = ch.fecha_pago ?? ch.fecha_emision" },
    { nombre: 'un diferido sin pago cae a la emisión (la base da null)',
      de: "const base = ch.tipo === 'diferido' ? ch.fecha_pago : ch.fecha_emision", a: "const base = ch.tipo === 'diferido' ? (ch.fecha_pago ?? ch.fecha_emision) : ch.fecha_emision" },
    { nombre: 'el plazo son 31 días',
      de: 'const DIAS_PLAZO_PRESENTACION = 30', a: 'const DIAS_PLAZO_PRESENTACION = 31' },
    { nombre: 'un salido también se marca',
      de: "      if (ch.estado !== 'en_cartera') return null\n      const plazo = plazoPresentacion(ch)", a: "      const plazo = plazoPresentacion(ch)" },
    { nombre: 'el vencido no se distingue del por vencer',
      de: "if (dias < 0) return { nivel: 'vencido', plazo, dias }", a: "if (dias < 0) return { nivel: 'por_vencer', plazo, dias }" },
    { nombre: 'el día del plazo ya cuenta como vencido',
      de: "if (dias < 0) return { nivel: 'vencido', plazo, dias }", a: "if (dias <= 0) return { nivel: 'vencido', plazo, dias }" },
    { nombre: 'la fila no se marca como vencida',
      de: "venc ? (venc.nivel === 'vencido' ? 'chq-tabla__fila--vencido' : 'chq-tabla__fila--vence') : '',", a: "venc ? 'chq-tabla__fila--vence' : ''," },
    { nombre: 'la fila no se marca',
      de: "venc ? (venc.nivel === 'vencido' ? 'chq-tabla__fila--vencido' : 'chq-tabla__fila--vence') : '',", a: "''," },
    { nombre: 'la tarjeta no se marca',
      de: "venc ? (venc.nivel === 'vencido' ? 'chq-tarjeta--vencido' : 'chq-tarjeta--vence') : '',", a: "''," },
    { nombre: 'la fecha de pago sin la marca',
      de: '`<span class="chq-vence__fecha">${esc(pago)}</span>', a: '`<span>${esc(pago)}</span>' },
    { nombre: 'el resumen no cuenta los vencidos',
      de: "        if (v.nivel === 'vencido') vencidos++\n", a: '' },
    { nombre: 'el resumen suma sin centavos',
      de: '        centavos += Math.round(Number(ch.importe) * 100)\n      }\n      return { cantidad, vencidos,', a: '        centavos += Number(ch.importe) * 100\n      }\n      return { cantidad, vencidos,' },
    { nombre: 'el aviso aparece en cero',
      de: "if (!v || (!v.cantidad && !activo)) return ''", a: "if (!v) return ''" },
    { nombre: 'filtrar no pasa a "en cartera"',
      de: "      if (activo) estado.filtros.estado = 'en_cartera'\n", a: '' },
    { nombre: 'el filtro no filtra',
      de: '      if (!estado.filtros.soloVencen) return estado.filas', a: '      return estado.filas' },
    { nombre: 'limpiar deja el filtro de vencimientos',
      de: 'estado.filtros = { ...FILTROS_CHEQUES_DEFECTO, soloVencen: false }', a: 'estado.filtros = { ...FILTROS_CHEQUES_DEFECTO, soloVencen: estado.filtros.soloVencen }' },
    { nombre: 'el error del resumen deja los vencimientos viejos',
      de: '        estado.cartera = null\n        estado.vencimientos = null', a: '        estado.cartera = null' },
    { nombre: 'el vencido usa un hex suelto',
      de: '--chq-vencido-fondo: color-mix(in srgb, var(--bordo) 18%, var(--bordo-suave));', a: '--chq-vencido-fondo: #e8c9d0;' },
    { nombre: 'la marca usa el naranja',
      de: '    .chq-tabla__fila--vence td { background: var(--bordo-suave); }', a: '    .chq-tabla__fila--vence td { background: var(--naranja-suave); }' },
    { nombre: 'la tarjeta usa la etiqueta larga (se corta)',
      de: '">${esc(textoVencimientoCorto(venc))}</span>', a: '">${esc(textoVencimiento(venc))}</span>' },
    { nombre: 'la etiqueta de la tarjeta se achica',
      de: '    .chq-tarjeta__l2 .chq-vence__etiqueta { display: inline; font-size: inherit; flex: 0 0 auto; }', a: '    .chq-tarjeta__l2 .chq-vence__etiqueta { display: inline; font-size: inherit; flex: 0 1 auto; }' },
    { nombre: 'la etiqueta dice "quedan" con un día',
      de: "v.dias === 1 ? 'queda 1 día' : `quedan ${v.dias} días`", a: "`quedan ${v.dias} días`" },
  ],
})
