// Mutaciones de test-administracion-diseno.js (29/09/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-diseno.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-diseno.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlLineaSeccion', 'htmlSeccion', 'htmlPestanas'],
  equivalentes: [
    { expr: 'esc(col.t)', motivo: 'color armado por el código (colorDeModulo o un valor fijo de ICONO_SECCION), nunca viene de la base' },
    { expr: 'esc(col.c)', motivo: 'color armado por el código (colorDeModulo o un valor fijo de ICONO_SECCION), nunca viene de la base' },
    { expr: 'esc(s.id)', motivo: 'id constante de SECCIONES' },
    { expr: 'esc(id)', motivo: 'id constante de PESTANAS' },
    { expr: 'esc(nombre)', motivo: 'nombre constante de PESTANAS' },
    { expr: 'esc(b.n)', motivo: 'un número o "99+" armado por burbujaPestana()' },
    { expr: 'esc(c.chip)', motivo: 'texto constante del código ("super_admin")' },
    { expr: 'esc(textoNumeroSeccion(c.numero))', motivo: 'un número, "—" o un texto constante' },
    { expr: 'esc(l.ir)', motivo: 'texto constante del código ("Ir a asentar ›")' },
    { expr: 'esc(l.t)', motivo: 'los renglones con tono los arma contenidoSeccion() con textos constantes, números y plata formateada; los que traen texto de la base van como string (esc(l))' },
    { expr: 'esc(s.titulo)', motivo: 'título constante de SECCIONES' },
  ],
  manuales: [
    { nombre: 'las pestañas no filtran por permiso', de: "PESTANAS.filter(([id]) => id === 'inicio' || ids.has(id))", a: 'PESTANAS.filter(() => true)' },
    { nombre: 'la actual no se marca', de: "\${id === actual ? ' aria-current=\"page\"' : ''}", a: '' },
    { nombre: 'la orden no marca Órdenes', de: "'ad-vista-orden': 'ordenes',", a: "'ad-vista-orden': 'inicio'," },
    { nombre: 'ninguna burbuja es urgente', de: "urgente: id === 'cobranzas' || id === 'ordenes' }", a: 'urgente: false }' },
    { nombre: 'la burbuja aparece con 0', de: "if (v === null || v === undefined || !(Number(v) > 0)) return null", a: 'if (v === null || v === undefined) return null' },
    { nombre: 'sin tope 99+', de: "n: Number(v) > 99 ? '99+' : String(v)", a: 'n: String(v)' },
    { nombre: 'mostrarVista no pinta las pestañas', de: '      pintarEmpresas()\n      pintarPestanas()\n', a: '      pintarEmpresas()\n' },
    { nombre: 'la portada no va en el orden del diseño', de: 'const secciones = enOrdenDePestanas(seccionesVisibles())', a: 'const secciones = seccionesVisibles()' },
    { nombre: 'la plata con un null da $ 0', de: "if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'", a: "if (!Number.isFinite(Number(n))) return '—'" },
    { nombre: 'el plazo no pondera por importe', de: 'if (Number.isFinite(imp) && imp > 0) { pesos += imp; dias += d * imp }', a: 'if (Number.isFinite(imp) && imp > 0) { pesos += 1; dias += d }' },
    { nombre: 'vencen: sin los 30 días', de: 'if (hasta !== null && hasta + 30 <= 7) vencen++', a: 'if (hasta !== null && hasta <= 7) vencen++' },
    { nombre: 'un común vence por el pago', de: "const base = ch?.tipo === 'diferido' ? ch?.fecha_pago : ch?.fecha_emision", a: 'const base = ch?.fecha_pago' },
    { nombre: 'un error de tarjeta no se dice', de: '      if (c.error) {\n        cuerpo =', a: '      if (false) {\n        cuerpo =' },
    { nombre: 'la cartera no se cuenta', de: 'leerChequesPortada().then(r => { p.cheques = r })', a: 'leerChequesPortada().then(r => { p.cheques = null })' },
    { nombre: 'la cartera se consulta sin permiso', de: "      if (SECCIONES.some(s => s.id === 'cheques' && seccionVisible(s))) {\n        leerChequesPortada()", a: "      if (true) {\n        leerChequesPortada()" },
    { nombre: 'los cierres se cuentan de siempre', de: "const { data, error } = await supabase.from(tabla).select('id').gte(columna, desde)", a: "const { data, error } = await supabase.from(tabla).select('id')" },
    { nombre: 'la deuda cuenta los saldos a favor', de: "const deuda = saldos.reduce((a, x) => a + (Number(x?.saldo) > 0 ? Number(x.saldo) : 0), 0)", a: "const deuda = saldos.reduce((a, x) => a + (Number(x?.saldo) || 0), 0)" },
    { nombre: 'los activos no se cuentan', de: 'activos: saldos.length, deuda,', a: 'activos: null, deuda,' },
    { nombre: '?seccion= solo entiende cheques y cobranzas', de: "      } else if (pedida && seccionesVisibles().some(s => s.id === pedida)) {", a: '      } else if (false) {' },
    { nombre: 'abrir derecho una sección no cuenta las burbujas', de: "      if (estado.vista !== 'ad-vista-inicio') contarPortada()", a: '' },
    { nombre: 'Inicio abre una sección', de: "if (b.dataset.pestana === 'inicio') mostrarInicio()", a: "if (false) mostrarInicio()" },
    { nombre: 'el gris vuelve a ser azulado', de: '--ad-texto-secundario: var(--color-texto-2);', a: '--ad-texto-secundario: #4a5670;' },
  ],
})
