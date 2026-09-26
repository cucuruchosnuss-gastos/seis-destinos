// Los controles que SALIERON de modulos/produccion.html el 25/09/2026, cuando
// Producción se partió en dos: la PLANTA (produccion.html, la tablet, solo
// cuentas de dispositivo) y la GESTIÓN (produccion-gestion.html, la compu y el
// celular, cuentas personales con produccion:ver o :configurar).
//
// Mismo patrón que controles-movidos.js (Cobranzas → Cheques). Cada entrada es
// una clave del inventario (ver controles-comun.js), YA con los RENOMBRADOS de
// controles-produccion.js aplicados → a dónde fue y por qué. Lo leen los dos
// chequeos:
//   - controles-produccion.js no marca rojo una clave de acá que falte en
//     produccion.html;
//   - controles-produccion-gestion.js exige que cada una exista en
//     produccion-gestion.html al menos las mismas veces que estaba en el
//     baseline.
// Si un control desaparece de los dos archivos, uno de los dos da rojo.
//
// Se mudaron SIN reescribirse: mismos ids, mismos data-*, mismos textos y las
// mismas RPCs. No es una puerta para tapar un rojo: cada entrada dice a dónde
// fue y por qué.

const MUDANZA = 'Producción se partió en planta y gestión (25/09/2026)'
const gestion = (motivo, nueva) => ({ a: 'gestion', nueva, motivo: MUDANZA + ': ' + motivo })

const M_MENU = 'la oficina (menú e inicio con los accesos) no es de la tablet de la planta'
const M_CONFIG = 'la configuración se usa en la compu, con una cuenta personal'
const M_HIST = 'el historial (con las planillas pendientes de completar y las correcciones de sus paradas) y el stock terminado se miran en la compu'

const MOVIDOS = {
  // ── Menú e inicio de la oficina ──
  'control:a#pr-menu-dashboard[href=../dashboard.html]': gestion(M_MENU),
  'control:button#pr-btn-ir-config[type=button]': gestion(M_MENU),
  'control:button#pr-btn-ir-historial[type=button]': gestion(M_MENU),
  'control:button#pr-btn-ir-stock[type=button]': gestion(M_MENU),
  'control:button#pr-btn-menu[type=button]': gestion(M_MENU),
  'control:button#pr-menu-config[data-menu][type=button]': gestion(M_MENU),
  'control:button#pr-menu-historial[data-menu][type=button]': gestion(M_MENU),
  'control:button#pr-menu-stock[data-menu][type=button]': gestion(M_MENU),

  // ── Configuración (y la hoja de PINes) ──
  'control:button#*[data-emp-guardar][type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-abrir-maestro[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-abrir-temporal[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-generar-pines[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-hoja-cerrar[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-hoja-imprimir[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-ing-agregar[data-ing-agregar][type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-maq-agregar[data-maq-agregar][type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-marca-agregar[data-marca-agregar][type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-personal-guardar[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-pin-cancelar[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-pin-guardar[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-prod-agregar[data-prod-agregar][type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-receta-guardar[data-receta-guardar][type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-salir-no[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-salir-si[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-temporal-cancelar[type=button]': gestion(M_CONFIG),
  'control:button#pr-cfg-temporal-dar[type=button]': gestion(M_CONFIG),
  'control:button#pr-config-volver[type=button]': gestion(M_CONFIG),
  'control:button[data-config-tab][type=button]': gestion(M_CONFIG),
  'control:button[data-emp-agregar-caja][type=button]': gestion(M_CONFIG),
  'control:button[data-emp-agregar][type=button]': gestion(M_CONFIG),
  'control:button[data-emp-quitar-caja][type=button]': gestion(M_CONFIG),
  'control:button[data-emp-quitar][type=button]': gestion(M_CONFIG),
  'control:button[data-ing-cerrar][type=button]': gestion(M_CONFIG),
  'control:button[data-ing-guardar-insumos][type=button]': gestion(M_CONFIG),
  'control:button[data-ing-guardar][type=button]': gestion(M_CONFIG),
  'control:button[data-ing-insumos][type=button]': gestion(M_CONFIG),
  'control:button[data-maq-activa][type=button]': gestion(M_CONFIG),
  'control:button[data-maq-bajar][type=button]': gestion(M_CONFIG),
  'control:button[data-maq-guardar][type=button]': gestion(M_CONFIG),
  'control:button[data-maq-subir][type=button]': gestion(M_CONFIG),
  'control:button[data-marca-activa][type=button]': gestion(M_CONFIG),
  'control:button[data-pend-no][type=button]': gestion(M_CONFIG),
  'control:button[data-pend-si][type=button]': gestion(M_CONFIG),
  'control:button[data-pin-asignar][type=button]': gestion(M_CONFIG),
  'control:button[data-pres-agregar][type=button]': gestion(M_CONFIG),
  'control:button[data-pres-guardar][type=button]': gestion(M_CONFIG),
  'control:button[data-prod-guardar][type=button]': gestion(M_CONFIG),
  'control:button[data-productos-revisados][type=button]': gestion(M_CONFIG),
  'control:button[data-temporal-revocar][type=button]': gestion(M_CONFIG),
  'control:input#pr-cfg-pin-valor[type=text]': gestion(M_CONFIG),
  'control:input#pr-cfg-temporal-hasta[type=date]': gestion(M_CONFIG),
  'control:input#pr-config-ing-nuevo[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-insumo-buscar[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-maq-nueva[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-marca-buscar[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-marca-nueva[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-personal-buscar[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-prod-nuevo[type=text]': gestion(M_CONFIG),
  'control:input#pr-config-tipo-nuevo[type=text]': gestion(M_CONFIG),
  'control:input[data-decimales][data-emp-cant][data-numero][type=text]': gestion(M_CONFIG),
  'control:input[data-decimales][data-numero][data-pres-unidades][type=text]': gestion(M_CONFIG),
  'control:input[data-decimales][data-numero][data-receta-kg][type=text]': gestion(M_CONFIG),
  'control:input[data-emp-insumo-nuevo][type=text]': gestion(M_CONFIG),
  'control:input[data-ing-activo][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-ing-descuenta][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-ing-insumo][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-ing-nombre][type=text]': gestion(M_CONFIG),
  'control:input[data-maq-nombre][type=text]': gestion(M_CONFIG),
  'control:input[data-marca-doble][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-pend-nombre][type=text]': gestion(M_CONFIG),
  'control:input[data-persona-puesto][data-puesto][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-personal-todos][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-pres-activa][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-pres-cono][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-pres-empaque][type=text]': gestion(M_CONFIG),
  'control:input[data-pres-media][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-pres-nombre][type=text]': gestion(M_CONFIG),
  'control:input[data-pres-nueva][type=text]': gestion(M_CONFIG),
  'control:input[data-prod-activo][type=checkbox]': gestion(M_CONFIG),
  'control:input[data-prod-nombre][type=text]': gestion(M_CONFIG),
  'control:input[data-prod-tipo][type=text]': gestion(M_CONFIG),
  'control:select#pr-cfg-temporal-persona': gestion(M_CONFIG),
  'control:select#pr-cfg-temporal-puesto': gestion(M_CONFIG),
  'control:select#pr-config-unidad': gestion(M_CONFIG),
  'control:select[data-emp-caja-nueva]': gestion(M_CONFIG),
  'control:select[data-emp-cond]': gestion(M_CONFIG),
  'control:select[data-emp-sug]': gestion(M_CONFIG),
  'control:select[data-receta-maquina]': gestion(M_CONFIG),
  'control:select[data-receta-partida]': gestion(M_CONFIG),
  'control:select[data-receta-pref]': gestion(M_CONFIG),
  'control:select[data-receta-tipo]': gestion(M_CONFIG),
  'control:textarea#pr-config-receta-nota': gestion(M_CONFIG),

  // ── Historial y stock terminado ──
  'control:button#pr-historial-anotar-parada[type=button]': gestion(M_HIST),
  'control:button#pr-historial-detalle-volver[type=button]': gestion(M_HIST),
  'control:button#pr-historial-volver[type=button]': gestion(M_HIST),
  'control:button#pr-stock-volver[type=button]': gestion(M_HIST),
  'control:button[data-historial-turno][type=button]': gestion(M_HIST),
  'control:input#pr-historial-desde[type=date]': gestion(M_HIST),
  'control:input#pr-historial-hasta[type=date]': gestion(M_HIST),
  'control:select#pr-historial-estado': gestion(M_HIST),
  'control:select#pr-historial-maquina': gestion(M_HIST),
  'control:select#pr-historial-unidad': gestion(M_HIST),
  'control:select#pr-stock-unidad': gestion(M_HIST),
}
for (const [k, m] of Object.entries(MOVIDOS)) if (!m.nueva) m.nueva = k

module.exports = { MOVIDOS }
