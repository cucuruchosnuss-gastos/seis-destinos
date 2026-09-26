// Mutaciones de test-produccion-sin-empaque.js (cargar sin el empaque, la
// marca del renglón sin caja y la burbuja de conos por revisar). Ver mutar.js.
//
// Sin automáticas: los renders nuevos solo interpolan números y texto
// constante, y los escapes viejos de htmlProducido / htmlSubloteHistorial
// los cubren test-produccion-cierre y test-produccion-historial.
//
//   node pruebas/mut-produccion-sin-empaque.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-sin-empaque.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // ── El catálogo no se cae por el empaque ───────────────────────────
    { nombre: 'si falla el empaque, el catálogo se cae', de: "        console.error('empaque del catálogo:', err)\n", a: "        throw err\n" },
    { nombre: 'la falla no queda marcada', de: "cajaPredeterminadaId: null, empaqueError: true }", a: "cajaPredeterminadaId: null, empaqueError: false }" },
    { nombre: 'con el empaque legible queda marcado como ilegible', de: "cajaPredeterminadaId: unidad?.caja_predeterminada_id ?? null, empaqueError: false }", a: "cajaPredeterminadaId: unidad?.caja_predeterminada_id ?? null, empaqueError: true }" },
    { nombre: 'la falla deja cajas a medias', de: "        emp = { cajas: [], empaque: [], insumos: [],", a: "        emp = { cajas: [{ presentacion_id: 'pr-caja', insumo_id: 'x' }], empaque: [], insumos: []," },
    // ── El flujo y el aviso ────────────────────────────────────────────
    { nombre: 'el paso dice lo de siempre', de: "      if (cat?.empaqueError) return 'Sin caja · no se pudo leer el empaque'\n", a: '' },
    { nombre: 'el paso de la caja no avisa', de: "        return h + htmlAvisoSinEmpaque() + '<button", a: "        return h + '<button" },
    { nombre: 'el paso de la caja dibuja lo de siempre', de: "      if (cat?.empaqueError) {\n        return h + htmlAvisoSinEmpaque()", a: "      if (false) {\n        return h + htmlAvisoSinEmpaque()" },
    { nombre: 'al lado de las cajas no avisa', de: "<span class=\"pr-ag__caja-cambiar\">Ver</span></button>' + htmlAvisoSinEmpaque()", a: "<span class=\"pr-ag__caja-cambiar\">Ver</span></button>'" },
    { nombre: 'al lado de las cajas se dibuja lo de siempre', de: "      if (cat?.empaqueError) {\n        return '<button", a: "      if (false) {\n        return '<button" },
    { nombre: 'el aviso no es bordó', de: "      return '<div class=\"pr-aviso pr-aviso--grave\">No se pudo leer la configuración del empaque", a: "      return '<div class=\"pr-aviso\">No se pudo leer la configuración del empaque" },
    { nombre: 'el aviso no dice cómo se corrige', de: " Corregilo después: avisale a quien lleva el stock para que las descuente a mano.", a: '' },
    { nombre: 'el aviso no dice que no se descuentan las bolsas', de: "así que no se va a descontar la caja ni las bolsas.", a: "así que no se va a descontar la caja." },
    // ── Lo que viaja ───────────────────────────────────────────────────
    { nombre: 'sin empaque viaja el embolsado de la pantalla', de: "p_embolsado: sinEmpaque ? null : embolsadoEfectivo(a, cat),", a: "p_embolsado: embolsadoEfectivo(a, cat)," },
    { nombre: 'sin empaque se va por la rama de siempre', de: "      const sinEmpaque = !!cat?.empaqueError", a: "      const sinEmpaque = false" },
    { nombre: 'sin empaque se frena la carga', de: "      if (!a.cajaElegida) { err.textContent = 'Elegí la caja.'; err.hidden = false; return }", a: "      if (!a.cajaElegida || estado.catalogo?.empaqueError) { err.textContent = 'Elegí la caja.'; err.hidden = false; return }" },
    { nombre: 'sin empaque se pierde el cono', de: "p_marca_id: a.marcaId ?? null, p_cajas: a.cajas,", a: "p_marca_id: null, p_cajas: a.cajas," },
    { nombre: 'la chapa al lado de las cajas dice lo de siempre', de: "<span>Sin caja · no se pudo leer el empaque</span>", a: "<span>Sin caja</span>" },
    { nombre: 'si falla leer el chocolate, la sala no carga la masa', de: "        console.error('ingredientes que definen el chocolate:', err)\n", a: "        throw err\n" },
    { nombre: 'el aviso de stock bloquea', de: "      if (!a.cajaElegida) { err.textContent = 'Elegí la caja.'; err.hidden = false; return }", a: "      if (!a.cajaElegida) { err.textContent = 'Elegí la caja.'; err.hidden = false; return }\n      if ((faltantesEmpaque(a, estado.catalogo) ?? []).length) { err.textContent = 'Falta empaque.'; err.hidden = false; return }" },
    // ── La marca del renglón ───────────────────────────────────────────
    { nombre: 'los anteriores al empaque se marcan', de: "      return !!it && !it.anulado && !it.caja_insumo_id && !!it.embolsado", a: "      return !!it && !it.anulado && !it.caja_insumo_id" },
    { nombre: 'los anulados se marcan', de: "      return !!it && !it.anulado && !it.caja_insumo_id && !!it.embolsado", a: "      return !!it && !it.caja_insumo_id && !!it.embolsado" },
    { nombre: 'los que tienen caja se marcan', de: "      return !!it && !it.anulado && !it.caja_insumo_id && !!it.embolsado", a: "      return !!it && !it.anulado && !!it.embolsado" },
    { nombre: 'con doble bolsa dice también las bolsas', de: "(it.embolsado === 'ninguno' ? ' ni las bolsas' : '')", a: "' ni las bolsas'" },
    { nombre: 'sin bolsa no dice las bolsas', de: "(it.embolsado === 'ninguno' ? ' ni las bolsas' : '')", a: "''" },
    { nombre: 'la planilla no pinta en bordó', de: "+ (sinCaja ? ' pr-producido--sin-caja' : '')", a: '' },
    { nombre: 'la planilla no lo dice', de: "${sinCaja ? `<div class=\"pr-producido__detalle pr-sin-caja\">${esc(textoSinCaja(it))}</div>` : ''}", a: '' },
    { nombre: 'el historial no pinta en bordó', de: "${sinCaja ? ' pr-of-sin-caja' : ''}", a: '' },
    { nombre: 'el historial no lo dice', de: "        (sinCaja ? `<strong class=\"pr-sin-caja\">${esc(textoSinCaja(p))}</strong>` : '') + corr +", a: "        corr +" },
    { nombre: 'sin los nombres de las cajas la planilla se cae', de: "          console.error('nombres de las cajas:', err)\n", a: "          throw err\n" },
    // ── La burbuja ─────────────────────────────────────────────────────
    { nombre: 'la burbuja se pide sin configurar', de: "      if (!tieneTarea('configurar')) {\n        estado.conosPendientes = null", a: "      if (false) {\n        estado.conosPendientes = null" },
    { nombre: 'toma cualquier fila', de: "f?.modulo === 'produccion' && f?.clave === 'conos_por_revisar'", a: "f?.cantidad" },
    { nombre: 'un cero se dibuja', de: "        n = Number.isInteger(c) && c > 0 ? c : null", a: "        n = Number.isInteger(c) ? c : null" },
    { nombre: 'si falla queda el número viejo', de: "        console.error('conos por revisar:', err)\n        n = null", a: "        console.error('conos por revisar:', err)\n        n = estado.conosPendientes" },
    { nombre: 'un error de la base no se toma como falla', de: "        if (error) throw error\n        const fila = (data ?? []).find(f => f?.modulo === 'produccion'", a: "        const fila = (data ?? []).find(f => f?.modulo === 'produccion'" },
    { nombre: 'sin turno: una respuesta vieja pisa', de: "      if (turno !== turnoBurbujaConos) return\n      estado.conosPendientes = n", a: "      estado.conosPendientes = n" },
    // Desde el diseño de la gestión (26/09/2026) el número va al lado de
    // "Marcas / Conos" (#pr-menu-n-conos), por htmlNumeroMenu().
    { nombre: 'sin tope de 99', de: "      el.textContent = ok ? (n > 99 ? '99+' : String(n)) : ''", a: "      el.textContent = ok ? String(n) : ''" },
    { nombre: 'siempre en plural', de: "${n === 1 ? 'cono nuevo por revisar' : 'conos nuevos por revisar'}", a: "conos nuevos por revisar" },
    { nombre: 'el número sin title', de: "      if (ok) { el.setAttribute('title', texto); el.setAttribute('aria-label', texto) }", a: "      if (ok) { el.setAttribute('aria-label', texto) }" },
    { nombre: 'el aria-label viejo queda', de: "      else { el.removeAttribute('title'); el.removeAttribute('aria-label') }", a: "      else { el.removeAttribute('title') }" },
    { nombre: 'un cero o un null se dibujan', de: '      const ok = Number.isInteger(n) && n > 0\n      el.hidden = !ok', a: '      const ok = true\n      el.hidden = !ok' },
    { nombre: 'el número va a otro renglón', de: "      htmlNumeroMenu(document.getElementById('pr-menu-n-conos'), n,", a: "      htmlNumeroMenu(document.getElementById('pr-menu-n-pendientes'), n," },
    { nombre: 'el número se ve sin configurar', de: "      const n = tieneTarea('configurar') ? estado.conosPendientes : null", a: "      const n = estado.conosPendientes" },
    { nombre: 'el renglón de conos no abre Marcas', de: "      if (destino.startsWith('config:')) return mostrarConfig(destino.slice(7))", a: "      if (destino.startsWith('config:')) return mostrarConfig()" },
    { nombre: 'mostrarConfig ignora la pestaña pedida', de: "      const tab = PESTANAS_CONFIG.some(([k]) => k === tabPedida) ? tabPedida : (estado.config?.tab ?? 'maquinas')", a: "      const tab = estado.config?.tab ?? 'maquinas'" },
    { nombre: 'no se pide al entrar', de: "      pintarAccesosOficina()\n      cargarBurbujaConos()\n", a: "      pintarAccesosOficina()\n" },
    { nombre: 'no se pide al volver a la pestaña', de: "        if (document.visibilityState === 'visible') {\n          cargarBurbujaConos()\n", a: "        if (document.visibilityState === 'visible') {\n" },
    { nombre: 'no se pide después de revisar un cono', de: "        if (r.ok) { cargarBurbujaConos(); await cargarPestanaConfig() }", a: "        if (r.ok) await cargarPestanaConfig()" },
  ],
})
