// Los controles que SALIERON de modulos/cobranzas.html el 22/09/2026, cuando
// la cartera de cheques se mudó a su propio módulo (modulos/cheques.html).
//
// Cada entrada es una clave del inventario del baseline (ver
// controles-comun.js) → dónde está ahora y por qué. Lo leen los DOS chequeos:
//   - controles-cobranzas.js no marca rojo una clave de acá que falte en
//     cobranzas.html, pero SÍ exige la nueva si `a` es 'cobranzas';
//   - controles-cheques.js exige que cada clave con `a: 'cheques'` exista en
//     cheques.html al menos las mismas veces que estaba en el baseline.
// Si un control desaparece de los dos archivos, uno de los dos da rojo.
//
// No es una puerta para tapar un rojo: cada entrada dice a dónde fue y por qué.

const MUDANZA = 'La cartera de cheques se mudó a modulos/cheques.html (22/09/2026).'

const cheques = (nueva, motivo = MUDANZA) => ({ a: 'cheques', nueva, motivo })
const cobranzas = (nueva, motivo) => ({ a: 'cobranzas', nueva, motivo })

const MOVIDOS = {
  // ── La vista entera ──
  'id:cob-vista-cheques': cheques('id:chq-vista'),
  'id:cob-cartera': cheques('id:chq-cartera'),
  'id:cob-chips-cheques': cheques('id:chq-chips-estado'),
  'id:cob-aviso-cheque': cheques('id:chq-aviso-numero'),
  'id:cob-cheques-aviso': cheques('id:chq-aviso'),
  'id:cob-tabla-caja': cheques('id:chq-tabla-caja'),
  'id:cob-tabla-cheques': cheques('id:chq-tabla'),
  'id:cob-cheques-vacio': cheques('id:chq-vacio'),

  // ── Filtros ──
  'id:cob-filtro-cheque': cheques('id:chq-filtro-numero'),
  'control:input#cob-filtro-cheque[type=search]': cheques('control:input#chq-filtro-numero[type=search]'),
  'id:cob-campo-banco': cheques('id:chq-campo-banco'),
  'id:cob-filtro-banco': cheques('id:chq-filtro-banco'),
  'control:select#cob-filtro-banco': cheques('control:select#chq-filtro-banco'),
  'id:cob-btn-limpiar-cheques': cheques('id:chq-btn-limpiar'),
  'control:button#cob-btn-limpiar-cheques[type=button]': cheques('control:button#chq-btn-limpiar[type=button]'),
  'data:data-estado-cheque': cheques('data:data-estado-cheque'),
  'control:button[data-estado-cheque][type=button]': cheques('control:button[data-estado-cheque][type=button]'),

  // ── Filas de la tabla ──
  'data:data-cheque-fila': cheques('data:data-cheque-fila'),
  'data:data-cheque-cobranza': cheques('data:data-cheque-cobranza'),
  // "Salió" pasó a llamarse "Dar salida" y se mudó a la columna Salida
  // (Parte 2): el data-* cambió de nombre con él.
  'data:data-salio': cheques('data:data-dar-salida', MUDANZA + ' "Salió" pasó a ser "Dar salida", en la columna Salida.'),
  'control:button[data-salio][type=button]': cheques('control:button[data-dar-salida][type=button]',
    MUDANZA + ' "Salió" pasó a ser "Dar salida", en la columna Salida.'),
  'data:data-volver-cartera': cheques('data:data-volver-cartera'),
  'control:button[data-volver-cartera][type=button]': cheques('control:button[data-volver-cartera][type=button]'),

  // ── Diálogo de salida ──
  'id:cob-modal-salida': cheques('id:chq-modal-salida'),
  'id:cob-salida-cheque': cheques('id:chq-salida-cheques'),
  'data:data-salida-tipo': cheques('data:data-salida-tipo'),
  'control:button[data-salida-tipo][type=button]': cheques('control:button[data-salida-tipo][type=button]'),
  'id:cob-salida-fecha': cheques('id:chq-salida-fecha'),
  'control:input#cob-salida-fecha[type=date]': cheques('control:input#chq-salida-fecha[type=date]'),
  'id:cob-salida-campo-destino': cheques('id:chq-salida-campo-destino'),
  'id:cob-salida-label-destino': cheques('id:chq-salida-label-destino'),
  'id:cob-salida-destino': cheques('id:chq-salida-destino'),
  'control:input#cob-salida-destino[type=text]': cheques('control:input#chq-salida-destino[type=text]'),
  'id:cob-salida-ayuda-destino': cheques('id:chq-salida-ayuda-destino'),
  'id:cob-salida-error': cheques('id:chq-salida-error'),
  'id:cob-salida-cancelar': cheques('id:chq-salida-cancelar'),
  'control:button#cob-salida-cancelar[type=button]': cheques('control:button#chq-salida-cancelar[type=button]'),
  'id:cob-salida-confirmar': cheques('id:chq-salida-confirmar'),
  'control:button#cob-salida-confirmar[type=button]': cheques('control:button#chq-salida-confirmar[type=button]'),

  // ── Las pestañas Cobranzas / Cheques ──
  // Ya no hay dos vistas de lista en un mismo archivo. La pestaña "Cheques"
  // pasó a ser un link en Cobranzas; la pestaña "Cobranzas", un link de
  // vuelta en Cheques.
  'id:cob-pestanas': cobranzas('id:cob-acceso-cheques',
    'Sin pestañas: el contenedor del link "Cartera de cheques →" ocupa su lugar.'),
  'id:cob-pestana-cheques': cobranzas('id:cob-link-cheques',
    'La pestaña "Cheques" pasó a ser el link "Cartera de cheques →", que abre cheques.html.'),
  'control:button#cob-pestana-cheques[type=button]': cobranzas('control:a#cob-link-cheques[href=cheques.html]',
    'La pestaña "Cheques" pasó a ser el link "Cartera de cheques →", que abre cheques.html.'),
  'id:cob-pestana-listado': cheques('id:chq-link-cobranzas',
    'La pestaña "Cobranzas" pasó a ser el link "‹ Cobranzas" de cheques.html.'),
  'control:button#cob-pestana-listado[type=button]': cheques('control:a#chq-link-cobranzas[href=cobranzas.html]',
    'La pestaña "Cobranzas" pasó a ser el link "‹ Cobranzas" de cheques.html.'),
}

module.exports = { MOVIDOS }
